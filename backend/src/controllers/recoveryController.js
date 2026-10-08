const mongoose = require('mongoose');
const Order = require('../models/Order');
const Route = require('../models/TransportRoute');
const POD = require('../models/DigitalPOD');
const Incident = require('../models/Incident');
const { STOPS } = require('../config/transportCatalog');
const { has, id } = require('../services/operationsWorkflow');
const fail = (message, statusCode = 409) => { throw Object.assign(new Error(message), { statusCode }); };

// Multi-document recovery operations are deliberately fail-closed on standalone
// MongoDB. A replica set (including a single-node local replica set) is required.
exports.execute = async (req, res, next) => {
  if (!has(req.user, 'user:manage')) return res.status(403).json({ success: false, message: 'Chỉ quản lý được thực hiện nghiệp vụ phục hồi.' });
  let session;
  try {
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      const order = await Order.findById(req.params.id).session(session);
      if (!order) fail('Không tìm thấy đơn.', 404);
      const route = await Route.findOne({ orderId: order._id }).session(session);
      if (!route) fail('Chưa có chuyến được phân công.');
      if (!Number.isInteger(req.body.version) || req.body.version !== (order.operationsVersion || 0)) fail('Dữ liệu đã thay đổi. Hãy tải lại.');
      if (await POD.exists({ tripId: route._id }).session(session)) fail('Đã có biên bản ký nhận; không thể thay đổi hành trình.');
      const reason = String(req.body.reason || '').trim().slice(0, 2000);
      if (!reason) fail('Cần ghi lý do và chứng từ xử lý.', 400);
      let notice;
      if (req.body.action === 'CANCEL_ASSIGNED') {
        if (route.status !== 'SCHEDULED' || ['COMPLETED', 'CANCELLED'].includes(order.status)) fail('Chỉ hủy chuyến chưa khởi hành. Chuyến đang chạy cần xử lý bàn giao/cứu hộ.');
        if (route.horseMovements.some(m => m.loadedAt)) fail('Đã có ngựa lên xe; phải thực hiện bàn giao an toàn, không được hủy trực tiếp.');
        if (await Incident.exists({ tripId: route._id, status: { $in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] } }).session(session)) fail('Còn sự cố chưa giải quyết.');
        route.status = 'CANCELLED'; order.status = 'CANCELLED'; order.cancellationReason = reason;
        notice = `Quản lý đã hủy chuyến chưa khởi hành: ${reason}. Tiền đã thu cần yêu cầu hoàn tiền riêng.`;
      } else if (req.body.action === 'APPLY_DESTINATION') {
        const item = order.exceptionRequests.id(req.body.itemId);
        if (!item || item.kind !== 'DESTINATION_CHANGE' || item.status !== 'APPROVED') fail('Yêu cầu đổi điểm chưa được duyệt hoặc đã thực hiện.');
        if (!['SCHEDULED', 'INCIDENT_HANDLING'].includes(route.status) || route.horseMovements.some(m => m.unloadedAt)) fail('Chuyến phải chưa chạy hoặc đang dừng xử lý sự cố, chưa giao ngựa.');
        const stop = STOPS.find(s => s.id === item.proposedStopId && s.countryCode === order.destination.countryCode);
        if (!stop || stop.id === order.destinationStopId) fail('Điểm đề xuất không còn hợp lệ; gửi lại yêu cầu.');
        item.originalDestination = { ...order.toObject().destination, stopId: order.destinationStopId };
        order.destination = { address: `${stop.name}, ${stop.countryCode}`, countryCode: stop.countryCode, coordinates: [...stop.coordinates] };
        order.destinationStopId = stop.id;
        for (const waypoint of route.waypoints.filter(w => w.type === 'DELIVERY')) { waypoint.name = order.destination.address; waypoint.location.coordinates = [...stop.coordinates]; waypoint.status = 'PENDING'; waypoint.actualArrival = undefined; }
        route.plannedPath = undefined; route.currentLocation = null; route.odometerEnd = undefined; route.distanceVerifiedAt = undefined;
        item.status = 'EXECUTED'; item.executionReference = reason; item.executedAt = new Date(); item.executedBy = req.user._id;
        // Revoke delivery documentation so a specialist must explicitly review
        // the new place. Keep the incident paused until its own resolution.
        await require('../models/ComplianceDoc').updateMany({ orderId: order._id, stage: 'DELIVERY', status: 'APPROVED' }, { $set: { status: 'PENDING_REVIEW' } }, { session });
        notice = `Điểm giao đã đổi sang ${order.destination.address}. Lý do thực hiện: ${reason}. Cần kiểm tra lại hồ sơ giao nhận.`;
      } else if (req.body.action === 'RESCUE_TRANSFER') {
        if (route.status !== 'INCIDENT_HANDLING' || route.rescuePending || route.horseMovements.some(m => m.unloadedAt)) fail('Chỉ chuyển toàn bộ ngựa khi chuyến đang xử lý sự cố, chưa giao ngựa và không có bàn giao đang chờ.');
        if (!Array.isArray(req.body.horseIds) || req.body.horseIds.length !== order.horseIds.length || !order.horseIds.every(h => req.body.horseIds.includes(id(h))) || new Set(req.body.horseIds).size !== order.horseIds.length) fail('Cần đối chiếu đủ từng ngựa trước khi chuyển xe.', 400);
        const evidence = String(req.body.evidence || '').trim().slice(0, 2000);
        if (!evidence) fail('Cần mã biên bản bàn giao và người chứng kiến.', 400);
        if (route.odometerStart == null || !Number.isFinite(req.body.previousOdometerEnd) || req.body.previousOdometerEnd < route.odometerStart) fail('Cần km cuối xe cũ không nhỏ hơn km đầu.', 400);
        if (id(route.vehicleId) === req.body.vehicleId && id(route.driverId) === req.body.driverId && id(route.escortId) === req.body.escortId) fail('Phân công mới phải khác phân công hiện tại.');
        const assignment = await require('./routeController').validateAssignment({ order, vehicleId: req.body.vehicleId, driverId: req.body.driverId, escortId: req.body.escortId, excludeRouteId: route._id });
        if (assignment.error) fail(assignment.error);
        route.rescueHistory.push({ by: req.user._id, reason, evidence, previousVehicleId: route.vehicleId, previousDriverId: route.driverId, vehicleId: req.body.vehicleId, driverId: req.body.driverId, horseIds: [...order.horseIds] });
        route.assignmentHistory.push({ changedBy: req.user._id, reason, previousVehicleId: route.vehicleId, previousDriverId: route.driverId, previousEscortId: route.escortId, vehicleId: req.body.vehicleId, driverId: req.body.driverId, escortId: req.body.escortId });
        route.vehicleId = req.body.vehicleId; route.vehiclePlateNumber = assignment.vehicle.plateNumber; route.driverId = req.body.driverId; route.escortId = req.body.escortId;
        route.rescuePending = true; route.acceptedAt = undefined; route.acceptedBy = undefined; route.currentLocation = null;
        route.previousVehicleDistanceKm = (route.previousVehicleDistanceKm || 0) + req.body.previousOdometerEnd - route.odometerStart;
        // Odometer readings belong to the previous vehicle. Keep them in the
        // recorded evidence and require replacement vehicle readings explicitly.
        route.rescueHistory[route.rescueHistory.length - 1].evidence += ` | km trước chuyển: ${route.odometerStart ?? '?'} → ${req.body.previousOdometerEnd ?? '?'}`;
        route.odometerStart = undefined; route.odometerEnd = undefined; route.distanceVerifiedAt = undefined;
        notice = `Quản lý đã ghi nhận chuyển ngựa sang xe ${route.vehiclePlateNumber}: ${reason}. Chờ tài xế mới tiếp nhận và điều phối giải quyết sự cố.`;
      } else fail('Thao tác phục hồi không hợp lệ.', 400);
      order.operationsNotices.push({ message: notice, actorId: req.user._id });
      order.operationsVersion = (order.operationsVersion || 0) + 1;
      route.operationsVersion = (route.operationsVersion || 0) + 1;
      await route.save({ session }); await order.save({ session });
    });
    res.json({ success: true });
  } catch (error) {
    if (error.code === 20 || /Transaction numbers are only allowed|does not support retryable writes/i.test(error.message)) {
      error.statusCode = 503; error.message = 'Nghiệp vụ này cần MongoDB replica set để cập nhật an toàn. Chưa thay đổi dữ liệu; hãy cấu hình database trước.';
    }
    next(error);
  } finally { if (session) await session.endSession(); }
};
