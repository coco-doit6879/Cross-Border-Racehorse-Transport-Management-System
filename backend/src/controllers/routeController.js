const TransportRoute = require('../models/TransportRoute');
const Order = require('../models/Order');
const { logAudit } = require('../utils/auditLogger');
const { moveOrderHorsesToDestination } = require('../services/horseLocationService');

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
    const routes = await TransportRoute.find()
      .populate('orderId')
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
      .populate('driverId', 'fullName phone email username')
      .populate('escortId', 'fullName phone email username');

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Transport route not found'
      });
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
    const { orderId, vehiclePlateNumber, driverId, escortId, waypoints } = req.body;

    if (!orderId || !vehiclePlateNumber || !driverId || !escortId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide orderId, vehiclePlateNumber, driverId, and escortId'
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
      vehiclePlateNumber,
      driverId,
      escortId,
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
