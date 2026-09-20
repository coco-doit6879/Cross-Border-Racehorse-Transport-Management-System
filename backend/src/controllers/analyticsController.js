const Order = require('../models/Order');
const TransportRoute = require('../models/TransportRoute');
const Incident = require('../models/Incident');
const { calculateHaversineDistanceKm } = require('../services/routeDeviationService');
const { logAudit } = require('../utils/auditLogger');

/**
 * Calculates total route distance in kilometers from an array of waypoints
 */
const calculateRouteTotalKm = (waypoints) => {
  if (!waypoints || waypoints.length < 2) return 0;
  let totalKm = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i].location?.coordinates;
    const p2 = waypoints[i + 1].location?.coordinates;
    if (p1 && p2 && p1.length === 2 && p2.length === 2) {
      // GeoJSON: [longitude, latitude]
      totalKm += calculateHaversineDistanceKm(p1[1], p1[0], p2[1], p2[0]);
    }
  }
  return Number(totalKm.toFixed(2));
};


// @desc    Get system KPI analytics & operational report totals (Includes OTD % and Total Km)
// @route   GET /api/v1/analytics/kpi
// @access  Private (analytics:view)
exports.getKPIAnalytics = async (req, res, next) => {
  try {
    const totalOrders = await Order.countDocuments();
    const completedOrders = await Order.countDocuments({ status: 'COMPLETED' });
    const inTransitOrders = await Order.countDocuments({ status: 'IN_TRANSIT' });
    const pendingOrders = await Order.countDocuments({ status: 'PENDING_APPROVAL' });

    const totalTrips = await TransportRoute.countDocuments();
    const allRoutes = await TransportRoute.find({}, 'waypoints');
    
    // Calculate total Km across all dispatched routes
    let totalKmTraveled = 0;
    allRoutes.forEach(route => {
      totalKmTraveled += calculateRouteTotalKm(route.waypoints);
    });

    const totalIncidents = await Incident.countDocuments();
    const openIncidents = await Incident.countDocuments({ status: { $in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] } });

    // Calculate On-time Delivery Rate (OTD %)
    const otdPercentage = totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : 100.0;

    // Calculate Emergency Incident Costs
    const emergencyCostAggregation = await Incident.aggregate([
      { $group: { _id: null, totalEmergencyCosts: { $sum: "$emergencyCostAmount" } } }
    ]);

    const totalEmergencyCosts = emergencyCostAggregation.length > 0 ? emergencyCostAggregation[0].totalEmergencyCosts : 0;

    res.json({
      success: true,
      data: {
        orders: {
          total: totalOrders,
          completed: completedOrders,
          inTransit: inTransitOrders,
          pendingApproval: pendingOrders,
          onTimeDeliveryPercentage: Number(otdPercentage)
        },
        trips: {
          total: totalTrips,
          active: await TransportRoute.countDocuments({ status: 'IN_TRANSIT' }),
          totalDistanceKm: Number(totalKmTraveled.toFixed(2))
        },
        incidents: {
          total: totalIncidents,
          open: openIncidents,
          resolved: await Incident.countDocuments({ status: 'RESOLVED' })
        },
        financials: {
          totalEmergencyCosts
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export B2B Billing Reconciliation Report Data
// @route   GET /api/v1/analytics/b2b-reconciliation
// @access  Private (analytics:view)
exports.getB2BBillingReconciliation = async (req, res, next) => {
  try {
    const { startDate, endDate, customerId, status } = req.query;
    let query = {};

    if (customerId) query.customerId = customerId;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(query)
      .populate('customerId', 'fullName email phone username')
      .populate('horseIds', 'name microchipId feiPassportNumber')
      .sort({ createdAt: -1 });

    const reconciliationItems = [];
    let grandTotalKm = 0;
    let grandTotalEmergencyCosts = 0;

    for (const order of orders) {
      const route = await TransportRoute.findOne({ orderId: order._id });
      const incidents = route ? await Incident.find({ tripId: route._id }) : [];
      
      const routeKm = route ? calculateRouteTotalKm(route.waypoints) : 0;
      const emergencyCosts = incidents.reduce((sum, inc) => sum + (inc.emergencyCostAmount || 0), 0);

      grandTotalKm += routeKm;
      grandTotalEmergencyCosts += emergencyCosts;

      reconciliationItems.push({
        bookingCode: order.bookingCode,
        orderId: order._id,
        customer: order.customerId ? {
          id: order.customerId._id,
          fullName: order.customerId.fullName,
          email: order.customerId.email,
          phone: order.customerId.phone
        } : null,
        route: {
          originAddress: order.origin.address,
          originCountry: order.origin.countryCode,
          destinationAddress: order.destination.address,
          destinationCountry: order.destination.countryCode
        },
        orderStatus: order.status,
        tripStatus: route ? route.status : 'NOT_DISPATCHED',
        vehiclePlateNumber: route ? route.vehiclePlateNumber : null,
        horsesCount: order.horseIds.length,
        totalDistanceKm: routeKm,
        incidentsCount: incidents.length,
        emergencyCostsAmount: emergencyCosts,
        requestedDepartureDate: order.requestedDepartureDate,
        createdAt: order.createdAt,
        completedAt: order.status === 'COMPLETED' ? order.updatedAt : null
      });
    }

    await logAudit({
      actorId: req.user._id,
      action: 'B2B_RECONCILIATION_VIEW',
      resource: 'Analytics',
      resourceId: 'B2B_REPORT',
      result: 'SUCCESS',
      metadata: { totalItems: reconciliationItems.length, grandTotalKm },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      summary: {
        totalBookings: reconciliationItems.length,
        grandTotalDistanceKm: Number(grandTotalKm.toFixed(2)),
        grandTotalEmergencyCosts: grandTotalEmergencyCosts
      },
      data: reconciliationItems
    });
  } catch (error) {
    next(error);
  }
};

