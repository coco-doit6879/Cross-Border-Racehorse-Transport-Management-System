const DigitalPOD = require('../models/DigitalPOD');
const TransportRoute = require('../models/TransportRoute');
const Order = require('../models/Order');
const { logAudit } = require('../utils/auditLogger');
const { moveOrderHorsesToDestination } = require('../services/horseLocationService');
const { deliveryProblem } = require('../services/operationsWorkflow');
const { canRead } = require('../services/operationsWorkflow');
const { validCoordinates, distanceKm } = require('../services/tripSafety');

const ALLOWED_SIGNER_ROLES = ['CUSTOMER', 'AUTHORIZED_RECIPIENT', 'STABLE_MANAGER', 'VETERINARIAN'];

// A persisted POD is the durable receipt. Retrying converges the remaining
// projections after a database failure without creating another signature.
async function finishDelivery(route, order) {
  if (!['DELIVERING', 'COMPLETED'].includes(route.status)) {
    const error = new Error('Chuyến đang bị giữ xử lý; cần giải quyết trước khi hoàn tất biên bản đã ký.');
    error.statusCode = 409; throw error;
  }
  await moveOrderHorsesToDestination(order);
  if (order.status !== 'COMPLETED') { order.status = 'COMPLETED'; await order.save(); }
  if (route.status !== 'COMPLETED') { route.status = 'COMPLETED'; await route.save(); }
}

// @desc    Sign Proof of Delivery (POD) & Complete Transport
// @route   POST /api/v1/pod/sign
// @access  Private (pod:sign)
exports.signPOD = async (req, res, next) => {
  try {
    const { tripId, orderId, signerName, signerPhone, signerRole, signatureImageUrl, locationSigned, coordinates, horseConditionsOnArrival } = req.body;
    const coords = coordinates || (locationSigned && locationSigned.coordinates);

    if (!tripId || !orderId || !signerName || !signerPhone || !signerRole || !signatureImageUrl || !coords || coords.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required POD fields: tripId, orderId, signerName, signerPhone, signerRole, signatureImageUrl, coordinates [lng, lat]'
      });
    }

    // Validate Signer Role against allowed Master Spec roles
    if (!ALLOWED_SIGNER_ROLES.includes(signerRole)) {
      await logAudit({
        actorId: req.user._id,
        action: 'POD_SIGN',
        resource: 'DigitalPOD',
        resourceId: 'N/A',
        result: 'FAILURE',
        errorMessage: `Invalid signerRole '${signerRole}'`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_SIGNER_ROLE',
        message: `Invalid signerRole '${signerRole}'. Allowed roles: ${ALLOWED_SIGNER_ROLES.join(', ')}`
      });
    }

    const route = await TransportRoute.findById(tripId);
    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Transport route not found'
      });
    }

    const deliveryOrder = await Order.findById(orderId);
    if (!deliveryOrder || String(route.orderId) !== String(orderId) || String(deliveryOrder.customerId) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'Chỉ khách hàng của vận đơn được xác nhận giao nhận.' });
    const existingPOD = await DigitalPOD.findOne({ tripId });
    if (existingPOD) {
      await finishDelivery(route, deliveryOrder);
      return res.json({ success: true, isDuplicate: true, data: existingPOD });
    }
    if (!validCoordinates(coords) || !validCoordinates(deliveryOrder.destination?.coordinates) || distanceKm(coords, deliveryOrder.destination.coordinates) > 0.5) return res.status(409).json({ success: false, message: 'Người nhận cần xác nhận tại điểm giao.' });
    if (!Array.isArray(horseConditionsOnArrival) || horseConditionsOnArrival.length !== deliveryOrder.horseIds.length || new Set(horseConditionsOnArrival.map(h => String(h.horseId))).size !== deliveryOrder.horseIds.length || !deliveryOrder.horseIds.every(h => horseConditionsOnArrival.some(c => String(c.horseId) === String(h)))) return res.status(400).json({ success: false, message: 'Cần xác nhận tình trạng của từng ngựa trong đơn.' });
    if (horseConditionsOnArrival.some(h => !['EXCELLENT', 'GOOD', 'MINOR_STRESS'].includes(h.conditionStatus))) return res.status(409).json({ success: false, message: 'Ngựa bị thương hoặc tình trạng chưa hợp lệ: báo sự cố và xử lý trước khi ký nhận.' });
    if (typeof signatureImageUrl !== 'string' || signatureImageUrl.length > 300000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(signatureImageUrl)) return res.status(400).json({ success: false, message: 'Chữ ký phải là ảnh PNG hợp lệ, tối đa 300 KB dạng dữ liệu.' });
    const problem = await deliveryProblem(route, deliveryOrder);
    if (problem) return res.status(409).json({ success: false, message: problem });

    const pod = await DigitalPOD.create({
      tripId,
      orderId,
      signerName,
      signerPhone,
      signerRole,
      signatureImageUrl,
      locationSigned: {
        type: 'Point',
        coordinates: coords
      },
      horseConditionsOnArrival: horseConditionsOnArrival || [],
      signedAt: new Date()
    });

    await finishDelivery(route, deliveryOrder);

    await logAudit({
      actorId: req.user._id,
      action: 'POD_SIGN',
      resource: 'DigitalPOD',
      resourceId: pod._id.toString(),
      result: 'SUCCESS',
      metadata: { tripId, orderId, signerName, signerRole },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      message: 'Proof of Delivery (POD) signed and trip completed successfully',
      data: pod
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get POD by tripId
// @route   GET /api/v1/pod/:tripId
// @access  Private
exports.getPODByTripId = async (req, res, next) => {
  try {
    const pod = await DigitalPOD.findOne({ tripId: req.params.tripId })
      .populate('tripId')
      .populate('orderId');

    if (!pod) {
      return res.status(404).json({
        success: false,
        message: 'Proof of Delivery (POD) not found for this trip'
      });
    }

    if (!pod.orderId || !canRead(pod.orderId, pod.tripId, req.user)) return res.status(403).json({ success: false, message: 'Bạn không có quyền xem biên bản giao nhận này.' });

    res.json({
      success: true,
      data: pod
    });
  } catch (error) {
    next(error);
  }
};
