const TransportRoute = require('../models/TransportRoute');
const Order = require('../models/Order');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const { logAudit } = require('../utils/auditLogger');
const { moveOrderHorsesToDestination } = require('../services/horseLocationService');

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
  const conflict = conflicts.find((route) => {
    const otherStart = new Date(route.orderId?.requestedDepartureDate || route.createdAt).getTime();
    return start < otherStart + 36 * 60 * 60 * 1000 && end > otherStart;
  });
  if (conflict) return { error: `Xe hoặc nhân sự bị trùng lịch với đơn ${conflict.orderId?.bookingCode || conflict._id}.` };
  return { vehicle, driver, escort };
};

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
exports.dispatchRoute = async (req, res, next) => {
  try {
    const { orderId, vehicleId, driverId, escortId, waypoints, assignmentNote } = req.body;

    if (!orderId || !vehicleId || !driverId || !escortId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn đơn, phương tiện, tài xế và phụ xe.'
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (!['APPROVED', 'CLEARED_FOR_TRANSPORT', 'DOCS_PROCESSING'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_ORDER_STATUS',
        message: `Cannot dispatch route for order in status '${order.status}'`
      });
    }

    const existingRoute = await TransportRoute.findOne({ orderId });
    if (existingRoute) {
      return res.status(400).json({
        success: false,
        message: 'A transport route has already been dispatched for this order'
      });
    }

    const assignment = await validateAssignment({ order, vehicleId, driverId, escortId });
    if (assignment.error) return res.status(409).json({ success: false, message: assignment.error });

    // Default waypoints from order origin & destination if not provided
    const defaultWaypoints = waypoints && waypoints.length > 0 ? waypoints : [
      {
        sequence: 1,
        name: order.origin.address,
        type: 'PICKUP',
        location: { coordinates: order.origin.coordinates },
        estimatedArrival: order.requestedDepartureDate,
        status: 'PENDING'
      },
      {
        sequence: 2,
        name: order.destination.address,
        type: 'DELIVERY',
        location: { coordinates: order.destination.coordinates },
        estimatedArrival: new Date(new Date(order.requestedDepartureDate).getTime() + 24 * 60 * 60 * 1000),
        status: 'PENDING'
      }
    ];

    // Initial currentLocation MUST be null (prevents Null Island [0,0])
    const route = await TransportRoute.create({
      orderId,
      vehicleId: assignment.vehicle._id,
      vehiclePlateNumber: assignment.vehicle.plateNumber,
      driverId,
      escortId,
      assignmentNote,
      assignmentHistory: [{ changedBy: req.user._id, reason: 'Phân công ban đầu', vehicleId, driverId, escortId }],
      waypoints: defaultWaypoints,
      currentLocation: null,
      status: 'SCHEDULED'
    });

    await logAudit({
      actorId: req.user._id,
      action: 'ROUTE_DISPATCH',
      resource: 'TransportRoute',
      resourceId: route._id.toString(),
      result: 'SUCCESS',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: route
    });
  } catch (error) {
    next(error);
  }
};

// @desc Update vehicle/driver/escort assignment for an existing scheduled route
exports.updateAssignment = async (req, res, next) => {
  try {
    const { vehicleId, driverId, escortId, reason, assignmentNote } = req.body;
    if (!vehicleId || !driverId || !escortId) return res.status(400).json({ success: false, message: 'Vui lòng chọn đủ xe, tài xế và phụ xe.' });
    const route = await TransportRoute.findById(req.params.id).populate('orderId');
    if (!route) return res.status(404).json({ success: false, message: 'Không tìm thấy chuyến vận chuyển.' });
    if (route.status !== 'SCHEDULED') return res.status(409).json({ success: false, message: 'Chỉ được đổi phân công khi chuyến chưa khởi hành.' });
    const changed = String(route.vehicleId || '') !== String(vehicleId) || String(route.driverId) !== String(driverId) || String(route.escortId) !== String(escortId);
    if (changed && !String(reason || '').trim()) return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do thay đổi phân công.' });
    const assignment = await validateAssignment({ order: route.orderId, vehicleId, driverId, escortId, excludeRouteId: route._id });
    if (assignment.error) return res.status(409).json({ success: false, message: assignment.error });
    route.assignmentHistory.push({ changedBy: req.user._id, reason: String(reason || '').trim(), previousVehicleId: route.vehicleId, previousDriverId: route.driverId, previousEscortId: route.escortId, vehicleId, driverId, escortId });
    route.vehicleId = vehicleId;
    route.vehiclePlateNumber = assignment.vehicle.plateNumber;
    route.driverId = driverId;
    route.escortId = escortId;
    route.assignmentNote = String(assignmentNote || '').trim();
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

    const currentStatus = route.status;
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
    }

    route.status = status;
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

    waypoint.status = status || 'ARRIVED';
    waypoint.actualArrival = new Date();
    await route.save();

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
