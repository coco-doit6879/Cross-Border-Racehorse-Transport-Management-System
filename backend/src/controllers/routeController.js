const TransportRoute = require('../models/TransportRoute');
const Order = require('../models/Order');
const ComplianceDoc = require('../models/ComplianceDoc');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const { logAudit } = require('../utils/auditLogger');
const { moveOrderHorsesToDestination } = require('../services/horseLocationService');
const { stageReady, clearanceReady, deliveryProblem } = require('../services/operationsWorkflow');

const idOf = (value) => String(value?._id || value || '');
const isAssignedStaff = (route, user) => idOf(route.driverId) === idOf(user._id) || idOf(route.escortId) === idOf(user._id);
const canViewRoute = (route, user) => {
  const permissions = user.effectivePermissions || [];
  return isAssignedStaff(route, user) || idOf(route.orderId?.customerId) === idOf(user._id) || permissions.some((permission) => ['route:dispatch', 'booking:approve', 'analytics:view'].includes(permission));
};
const canOperateRoute = (route, user) => isAssignedStaff(route, user) || (user.effectivePermissions || []).includes('route:dispatch');

const ACTIVE_ROUTE_STATUSES = ['SCHEDULED', 'IN_TRANSIT', 'INCIDENT_HANDLING', 'DELIVERING'];
const validateAssignment = async ({ order, vehicleId, driverId, escortId, excludeRouteId }) => {
  const [vehicle, driver, escort] = await Promise.all([Vehicle.findById(vehicleId), User.findById(driverId), User.findById(escortId)]);
  if (!vehicle || vehicle.status !== 'ACTIVE') return { error: 'Phương tiện không tồn tại hoặc không hoạt động.' };
  if (new Date(vehicle.registrationExpiresAt) < new Date() || new Date(vehicle.inspectionExpiresAt) < new Date()) return { error: 'Giấy đăng ký hoặc đăng kiểm của xe đã hết hạn.' };
  if (!driver || driver.role !== 'DRIVER' || !driver.isActive) return { error: 'Tài xế không tồn tại hoặc không hoạt động.' };
  if (!escort || escort.role !== 'ESCORT' || !escort.isActive) return { error: 'Phụ xe không tồn tại hoặc không hoạt động.' };
  if (String(driver._id) === String(escort._id)) return { error: 'Tài xế và phụ xe phải là hai người khác nhau.' };
  if ((order.horseIds || []).length > vehicle.capacityHorses) return { error: `Xe chỉ chở tối đa ${vehicle.capacityHorses} ngựa.` };
  const start = new Date(order.requestedDepartureDate).getTime();
  const end = start + 36 * 60 * 60 * 1000;
  const conflicts = await TransportRoute.find({
    ...(excludeRouteId ? { _id: { $ne: excludeRouteId } } : {}), status: { $in: ACTIVE_ROUTE_STATUSES },
    $or: [{ vehicleId: vehicle._id }, { driverId: driver._id }, { escortId: escort._id }]
  }).populate('orderId', 'requestedDepartureDate bookingCode');
  const conflict = conflicts[0];
  if (conflict) return { error: `Xe hoặc nhân sự bị trùng lịch với đơn ${conflict.orderId?.bookingCode || conflict._id}.` };
  return { vehicle, driver, escort };
};
exports.validateAssignment = validateAssignment;

// Allowed Trip State Machine Transitions Map
const ALLOWED_TRIP_TRANSITIONS = {
  'SCHEDULED': ['IN_TRANSIT', 'CANCELLED'],
  'IN_TRANSIT': ['INCIDENT_HANDLING', 'DELIVERING', 'CANCELLED'],
  'INCIDENT_HANDLING': ['IN_TRANSIT', 'CANCELLED'],
  'DELIVERING': ['COMPLETED', 'CANCELLED'],
  'COMPLETED': [],
  'CANCELLED': []
};

// @desc    Get all transport routes
// @route   GET /api/v1/routes
// @access  Private
exports.getRoutes = async (req, res, next) => {
  try {
    const query = {};
    const permissions = req.user.effectivePermissions || [];
    if (req.user.role === 'DRIVER') query.driverId = req.user._id;
    else if (req.user.role === 'ESCORT') query.escortId = req.user._id;
    else if (req.user.role === 'CUSTOMER') {
      const ownedOrders = await Order.find({ customerId: req.user._id }).select('_id');
      query.orderId = { $in: ownedOrders.map((order) => order._id) };
    } else if (!permissions.some((permission) => ['route:dispatch', 'booking:approve', 'analytics:view'].includes(permission))) {
      query._id = null;
    }

    const routes = await TransportRoute.find(query)
      .populate('orderId')
      .populate('vehicleId')
      .populate('driverId', 'fullName phone email username')
      .populate('escortId', 'fullName phone email username');

    res.json({
      success: true,
      count: routes.length,
      data: routes
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single route by ID
// @route   GET /api/v1/routes/:id
// @access  Private
exports.getRouteById = async (req, res, next) => {
  try {
    const route = await TransportRoute.findById(req.params.id)
      .populate('orderId')
      .populate('vehicleId')
      .populate('driverId', 'fullName phone email username')
      .populate('escortId', 'fullName phone email username');

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Transport route not found'
      });
    }
    if (!canViewRoute(route, req.user)) {
      return res.status(403).json({ success: false, message: 'Bạn không được phân công vào chuyến vận chuyển này.' });
    }
    res.json({
      success: true,
      data: route
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Dispatch route & assign vehicle/driver/escort (Coordinator)
// @route   POST /api/v1/routes/dispatch
// @access  Private (route:dispatch)
exports.dispatchRoute = async (req,res) => res.status(409).json({message:'Phân công kíp xe tại màn hình Duyệt giá sau khi khách thanh toán đủ và điều phối xác nhận xe, lộ trình.'});

exports.updateAssignment = async (req, res, next) => {
  try {
    if(req.user.role!=='LOGISTICS_MANAGER')return res.status(403).json({message:'Chỉ quản lý được thay đổi tài xế, phụ xe.'});
    const { vehicleId, driverId, escortId, reason, assignmentNote } = req.body;
    if (!vehicleId || !driverId || !escortId) return res.status(400).json({ success: false, message: 'Vui lòng chọn đủ xe, tài xế và phụ xe.' });
    const route = await TransportRoute.findById(req.params.id).populate('orderId');
    if (!route) return res.status(404).json({ success: false, message: 'Không tìm thấy chuyến vận chuyển.' });
    if (route.status !== 'SCHEDULED') return res.status(409).json({ success: false, message: 'Chỉ được đổi phân công khi chuyến chưa khởi hành.' });
    const changed = String(route.vehicleId || '') !== String(vehicleId) || String(route.driverId) !== String(driverId) || String(route.escortId) !== String(escortId);
    if (changed && !String(reason || '').trim()) return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do thay đổi phân công.' });
    if(idOf(vehicleId)!==idOf(route.vehicleId))return res.status(409).json({message:'Xe và lộ trình đã được điều phối xác nhận, không đổi xe tại bước phân công nhân sự.'});
    const assignment = await validateAssignment({ order: route.orderId, vehicleId, driverId, escortId, excludeRouteId: route._id });
    if (assignment.error) return res.status(409).json({ success: false, message: assignment.error });
    route.assignmentHistory.push({ changedBy: req.user._id, reason: String(reason || '').trim(), previousVehicleId: route.vehicleId, previousDriverId: route.driverId, previousEscortId: route.escortId, vehicleId, driverId, escortId });
    route.vehicleId = vehicleId;
    route.vehiclePlateNumber = assignment.vehicle.plateNumber;
    route.driverId = driverId;
    route.escortId = escortId;
    route.assignmentNote = String(assignmentNote || '').trim();
    if (changed) {
      if (route.horseMovements?.some(m => m.loadedAt)) return res.status(409).json({ success: false, message: 'Ngựa đã lên xe, không được đổi phân công.' });
      route.acceptedAt = undefined; route.acceptedBy = undefined;
      route.odometerStart = undefined;
      route.operationsVersion = (route.operationsVersion || 0) + 1;
    }
    await route.save();
    await logAudit({ actorId: req.user._id, action: 'ROUTE_ASSIGNMENT_UPDATE', resource: 'TransportRoute', resourceId: String(route._id), result: 'SUCCESS', metadata: { reason }, ipAddress: req.ip, userAgent: req.get('User-Agent') });
    const populated = await TransportRoute.findById(route._id).populate('orderId').populate('vehicleId').populate('driverId', 'fullName phone email username').populate('escortId', 'fullName phone email username').populate('assignmentHistory.changedBy', 'fullName');
    res.json({ success: true, data: populated });
  } catch (error) { next(error); }
};

// @desc    Update trip status lifecycle (Start, Deliver, Complete, Cancel)
// @route   PATCH /api/v1/routes/:id/status
// @access  Private (trip:start / trip:operate)
exports.updateTripStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (status === 'INCIDENT_HANDLING') return res.status(409).json({ success: false, message: 'Hãy báo SOS để có hồ sơ sự cố và người tiếp nhận.' });

    if (status === 'CANCELLED') return res.status(409).json({ success: false, message: 'Cần xử lý hủy đơn qua điều phối, không hủy trực tiếp chuyến đang giữ ngựa.' });
    let route = await TransportRoute.findById(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Transport route not found'
      });
    }

    if (!canOperateRoute(route, req.user)) {
      return res.status(403).json({ success: false, message: 'Bạn không được phân công vào chuyến vận chuyển này.' });
    }

    if (req.user.role !== 'DRIVER' || idOf(route.driverId)!==idOf(req.user._id)) return res.status(403).json({message:'Chỉ tài xế được phân công mới được bắt đầu, bàn giao hoặc hoàn thành chuyến.'});
    if(['DELIVERING','COMPLETED'].includes(status)&&route.waypoints.some(w=>w.status!=='ARRIVED'))return res.status(409).json({message:'Tài xế cần xác nhận đến tất cả điểm dừng và điểm đích trước.'});
    const currentStatus = route.status;
    if (currentStatus === 'INCIDENT_HANDLING') return res.status(409).json({ success: false, message: 'Chỉ tiếp tục chuyến sau khi điều phối xử lý hết sự cố.' });
    const allowedNextStatuses = ALLOWED_TRIP_TRANSITIONS[currentStatus] || [];

    if (!allowedNextStatuses.includes(status)) {
      await logAudit({
        actorId: req.user._id,
        action: 'TRIP_STATUS_UPDATE',
        resource: 'TransportRoute',
        resourceId: route._id.toString(),
        result: 'FAILURE',
        errorMessage: `Invalid trip state transition from ${currentStatus} to ${status}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_STATE_TRANSITION',
        message: `Invalid state transition: Cannot change trip status from '${currentStatus}' to '${status}'`
      });
    }

    const permissions = req.user.effectivePermissions || [];

    // trip:start permission check for SCHEDULED -> IN_TRANSIT
    if (currentStatus === 'SCHEDULED' && status === 'IN_TRANSIT') {
      if (!permissions.includes('trip:start')) {
        await logAudit({
          actorId: req.user._id,
          action: 'TRIP_START',
          resource: 'TransportRoute',
          resourceId: route._id.toString(),
          result: 'DENIED',
          errorMessage: 'Missing trip:start permission',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.status(403).json({
          success: false,
          message: "Forbidden: Missing required permission 'trip:start'"
        });
      }
      const order = await Order.findById(route.orderId);
      if (!route.acceptedAt || String(route.acceptedBy) !== String(route.driverId) || route.odometerStart == null || !order?.horseIds.every(h => route.horseMovements?.some(m => String(m.horseId) === String(h) && m.loadedAt))) return res.status(409).json({ success: false, message: 'Tài xế cần nhận vận đơn, ghi km đầu và xác nhận từng ngựa lên xe.' });
      if (!order || order.paymentStatus !== 'PAID') {
        return res.status(409).json({
          success: false,
          errorCode: 'PAYMENT_REQUIRED',
          message: 'Không thể bắt đầu vận chuyển khi đơn chưa được thanh toán đủ.'
        });
      }
      const assignment = await validateAssignment({ order, vehicleId: route.vehicleId, driverId: route.driverId, escortId: route.escortId, excludeRouteId: route._id });
      if (assignment.error) return res.status(409).json({ success: false, message: assignment.error });
      const horses = await require('../models/Horse').find({ _id: { $in: order.horseIds } });
      const cutoff = new Date(); cutoff.setUTCMonth(cutoff.getUTCMonth() - 6);
      if (horses.length !== order.horseIds.length || horses.some(h => h.reviewStatus !== 'APPROVED' || !h.lastVaccinationDate || new Date(h.lastVaccinationDate) < cutoff || h.currentStopId !== order.originStopId)) return res.status(409).json({ success: false, message: 'Cần kiểm tra lại sức khỏe, tiêm phòng và vị trí từng ngựa trước khởi hành.' });
    }

    if (status === 'IN_TRANSIT' && !(await stageReady(route.orderId, 'DEPARTURE'))) {
      return res.status(409).json({ success: false, message: 'Chờ chuyên viên xác nhận hồ sơ đủ điều kiện khởi hành. Nếu có yêu cầu bổ sung, khách hàng hoặc chuyên viên cần nộp và duyệt giấy tờ trước.' });
    }
    if (status === 'COMPLETED') {
      const problem = await deliveryProblem(route, await Order.findById(route.orderId));
      if (problem) return res.status(409).json({ success: false, message: problem });
    }
    if (await require('../services/tripSafety').activeIncident(route._id)) return res.status(409).json({ success: false, message: 'Còn sự cố chưa giải quyết, không thể tiếp tục chuyến.' });
    route.status = status;
    route.operationsVersion = (route.operationsVersion || 0) + 1;
    await route.save();

    // Sync corresponding Order status
    const order = await Order.findById(route.orderId);
    if (order) {
      if (['IN_TRANSIT', 'DELIVERING', 'COMPLETED', 'CANCELLED'].includes(status)) {
        order.status = status;
        await order.save();
        if (status === 'COMPLETED') await moveOrderHorsesToDestination(order);
      }
    }

    await logAudit({
      actorId: req.user._id,
      action: `TRIP_${status}`,
      resource: 'TransportRoute',
      resourceId: route._id.toString(),
      result: 'SUCCESS',
      metadata: { previousStatus: currentStatus, newStatus: status },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await require('../services/notifications').orderEvent(status, route.orderId, `${route._id}:${status}`);
    if (status === 'IN_TRANSIT' && order?.origin.countryCode !== order?.destination.countryCode) await require('../services/notifications').orderEvent('CUSTOMS_REQUIRED', route.orderId, route._id);
    req.app?.get?.('io')?.to(`trip_${route._id}`).emit('trip:status_updated',{tripId:String(route._id),status});
    res.json({
      success: true,
      message: `Trip status updated to ${status}`,
      data: route
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Driver/Escort one-tap check-in at waypoint
// @route   PATCH /api/v1/routes/:id/waypoint-checkin
// @access  Private (waypoint:checkin)
exports.waypointCheckin = async (req, res, next) => {
  try {
    const { sequence, waypointId, status } = req.body;
    let route = await TransportRoute.findById(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Transport route not found'
      });
    }

    if (!canOperateRoute(route, req.user)) {
      return res.status(403).json({ success: false, message: 'Bạn không được phân công vào chuyến vận chuyển này.' });
    }

    let waypoint;
    if (waypointId) {
      waypoint = route.waypoints.id(waypointId);
    } else if (sequence !== undefined) {
      waypoint = route.waypoints.find(w => w.sequence === Number(sequence));
    } else {
      waypoint = route.waypoints.find(w => w.status === 'PENDING');
    }

    if (!waypoint) {
      return res.status(404).json({
        success: false,
        message: 'Waypoint not found or sequence invalid'
      });
    }

    if (!['IN_TRANSIT', 'DELIVERING'].includes(route.status)) return res.status(409).json({ success: false, message: 'Chuyến chưa chạy, đã kết thúc hoặc đang xử lý sự cố.' });
    if (status && !['ARRIVED', 'SKIPPED'].includes(status)) return res.status(400).json({ success: false, message: 'Trạng thái điểm dừng không hợp lệ.' });
    if (waypoint.status !== 'PENDING') return res.json({ success: true, isDuplicate: true, data: route });
    const nextPending=[...route.waypoints].sort((a,b)=>a.sequence-b.sequence).find(w=>w.status==='PENDING');
    if(status==='SKIPPED'||String(nextPending?._id)!==String(waypoint._id))return res.status(409).json({message:'Xác nhận đúng thứ tự các điểm dừng, không được bỏ qua điểm.'});
    const previousBorders = route.waypoints.filter(w => w.type === 'BORDER_CUSTOMS' && w.sequence < waypoint.sequence);
    if (previousBorders.length) {
      const order = await Order.findById(route.orderId);
      for (const border of previousBorders) if (!clearanceReady(route, order, border.name) || !(await stageReady(order._id, 'BORDER', border.name))) return res.status(409).json({ success: false, message: 'Đang chờ chuyên viên hoàn tất thông quan tại ' + border.name + '. Chưa thể xác nhận tới điểm tiếp theo.' });
    }
    if (waypoint.type === 'DELIVERY') {
      const order = await Order.findById(route.orderId);
      if (!clearanceReady(route, order) || !(await stageReady(order._id, 'BORDER'))) return res.status(409).json({ success: false, message: 'Chưa thể xác nhận tới điểm giao: chuyên viên cần hoàn tất thông quan và hồ sơ cửa khẩu trong Chứng từ vận chuyển trước.' });
    }
    waypoint.status = status || 'ARRIVED';
    waypoint.actualArrival = new Date();
    await route.save();
    if (waypoint.type === 'BORDER_CUSTOMS') await require('../services/notifications').orderEvent('CUSTOMS_ARRIVED', route.orderId, waypoint._id, { reason: 'Tài xế đã đến ' + waypoint.name + '. Chuyên viên kiểm tra và ghi nhận kết quả thông quan.' });

    const io = req.app?.get?.('io');
    if (io && waypoint.location?.coordinates && waypoint.status === 'ARRIVED') {
      const roomName = `trip_${route._id.toString()}`;
      io.to(roomName).emit('trip:waypoint_updated', {tripId:route._id.toString(),waypointId:String(waypoint._id),status:waypoint.status});
    }

    await logAudit({
      actorId: req.user._id,
      action: 'WAYPOINT_CHECKIN',
      resource: 'TransportRoute',
      resourceId: route._id.toString(),
      result: 'SUCCESS',
      metadata: { waypointName: waypoint.name, sequence: waypoint.sequence, status: waypoint.status },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: `Waypoint '${waypoint.name}' check-in updated to ${waypoint.status}`,
      data: route
    });
  } catch (error) {
    next(error);
  }
};
