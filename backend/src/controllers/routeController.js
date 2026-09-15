const TransportRoute = require('../models/TransportRoute');

// @desc    Get all transport routes
// @route   GET /api/routes
// @access  Private
exports.getRoutes = async (req, res, next) => {
  try {
    const routes = await TransportRoute.find()
      .populate({
        path: 'orderId',
        populate: { path: 'customerId', select: 'fullName email phone' }
      })
      .populate('driverId', 'fullName phone email');

    res.json({ success: true, count: routes.length, data: routes });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single route by ID
// @route   GET /api/routes/:id
// @access  Private
exports.getRouteById = async (req, res, next) => {
  try {
    const route = await TransportRoute.findById(req.params.id)
      .populate('orderId')
      .populate('driverId', 'fullName phone email');

    if (!route) {
      return res.status(404).json({ message: 'Transport route not found' });
    }
    res.json({ success: true, data: route });
  } catch (error) {
    next(error);
  }
};

// @desc    Create / Dispatch transport route
// @route   POST /api/routes
// @access  Private (ROUTE_COORDINATOR, LOGISTICS_MANAGER)
exports.createRoute = async (req, res, next) => {
  try {
    const { orderId, vehicleId, driverId, waypoints } = req.body;

    const route = await TransportRoute.create({
      orderId,
      vehicleId,
      driverId,
      waypoints: waypoints || [],
      currentLocation: {
        type: 'Point',
        coordinates: [103.9915, 1.3644] // Default Singapore Changi starting coordinates
      }
    });

    res.status(201).json({ success: true, data: route });
  } catch (error) {
    next(error);
  }
};

// @desc    Update route GPS coordinates
// @route   PATCH /api/routes/:id/location
// @access  Private (DRIVER_ESCORT, ROUTE_COORDINATOR)
exports.updateRouteLocation = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;

    let route = await TransportRoute.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ message: 'Transport route not found' });
    }

    route.currentLocation = {
      type: 'Point',
      coordinates: [longitude, latitude]
    };

    await route.save();

    res.json({
      success: true,
      message: 'GPS coordinates updated successfully',
      currentLocation: route.currentLocation
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Driver one-tap check-in at waypoint
// @route   POST /api/routes/:id/waypoints/:waypointId/checkin
// @access  Private (DRIVER_ESCORT, ROUTE_COORDINATOR)
exports.checkinWaypoint = async (req, res, next) => {
  try {
    const { id, waypointId } = req.params;
    const { status } = req.body; // ARRIVED or DEPARTED

    let route = await TransportRoute.findById(id);
    if (!route) {
      return res.status(404).json({ message: 'Transport route not found' });
    }

    const waypoint = route.waypoints.id(waypointId);
    if (!waypoint) {
      return res.status(404).json({ message: 'Waypoint not found' });
    }

    waypoint.status = status || 'ARRIVED';
    await route.save();

    res.json({ success: true, message: `Waypoint check-in updated to ${waypoint.status}`, data: route });
  } catch (error) {
    next(error);
  }
};
