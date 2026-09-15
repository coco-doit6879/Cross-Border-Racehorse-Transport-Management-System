const Incident = require('../models/Incident');
const Order = require('../models/Order');

// @desc    Get all incident alerts
// @route   GET /api/incidents
// @access  Private
exports.getIncidents = async (req, res, next) => {
  try {
    const incidents = await Incident.find()
      .populate('orderId')
      .populate('driverId', 'fullName phone email');

    res.json({ success: true, count: incidents.length, data: incidents });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger Emergency SOS Alert
// @route   POST /api/incidents/sos
// @access  Private (DRIVER_ESCORT, ROUTE_COORDINATOR)
exports.triggerSOS = async (req, res, next) => {
  try {
    const { orderId, latitude, longitude, severity, description } = req.body;

    const incident = await Incident.create({
      orderId,
      driverId: req.user.id,
      location: {
        type: 'Point',
        coordinates: [longitude || 103.9915, latitude || 1.3644]
      },
      severity: severity || 'CRITICAL_SOS',
      status: 'OPEN',
      description: description || 'Emergency SOS button triggered by driver'
    });

    // Automatically update order status to INCIDENT_HANDLING if orderId present
    if (orderId) {
      await Order.findByIdAndUpdate(orderId, { status: 'INCIDENT_HANDLING' });
    }

    res.status(201).json({
      success: true,
      message: 'CRITICAL SOS ALERT TRIGGERED SUCCESSFULLY',
      data: incident
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve or update incident status
// @route   PATCH /api/incidents/:id/resolve
// @access  Private (ROUTE_COORDINATOR, LOGISTICS_MANAGER)
exports.resolveIncident = async (req, res, next) => {
  try {
    let incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    incident.status = req.body.status || 'RESOLVED';
    await incident.save();

    res.json({ success: true, message: `Incident status updated to ${incident.status}`, data: incident });
  } catch (error) {
    next(error);
  }
};
