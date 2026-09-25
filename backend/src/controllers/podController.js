const DigitalPOD = require('../models/DigitalPOD');
const TransportRoute = require('../models/TransportRoute');
const Order = require('../models/Order');
const { logAudit } = require('../utils/auditLogger');
const { moveOrderHorsesToDestination } = require('../services/horseLocationService');

const ALLOWED_SIGNER_ROLES = ['CUSTOMER', 'AUTHORIZED_RECIPIENT', 'STABLE_MANAGER', 'VETERINARIAN'];

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

    const existingPOD = await DigitalPOD.findOne({ tripId });
    if (existingPOD) {
      return res.status(400).json({
        success: false,
        message: 'Proof of Delivery (POD) has already been signed for this trip'
      });
    }

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

    // Complete TransportRoute and Order Lifecycle
    route.status = 'COMPLETED';
    await route.save();

    const order = await Order.findById(orderId);
    if (order) {
      order.status = 'COMPLETED';
      await order.save();
      await moveOrderHorsesToDestination(order);
    }

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

    res.json({
      success: true,
      data: pod
    });
  } catch (error) {
    next(error);
  }
};
