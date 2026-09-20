const Incident = require('../models/Incident');
const TransportRoute = require('../models/TransportRoute');
const { logAudit } = require('../utils/auditLogger');

const ALLOWED_INCIDENT_TRANSITIONS = {
  'OPEN': ['ACKNOWLEDGED', 'RESOLVED', 'CLOSED'],
  'ACKNOWLEDGED': ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  'IN_PROGRESS': ['RESOLVED', 'CLOSED'],
  'RESOLVED': ['CLOSED'],
  'CLOSED': []
};

// @desc    Get all incidents (Filtered by tripId or status)
// @route   GET /api/v1/incidents
// @access  Private
exports.getIncidents = async (req, res, next) => {
  try {
    let query = {};
    if (req.query.tripId) query.tripId = req.query.tripId;
    if (req.query.status) query.status = req.query.status;

    const incidents = await Incident.find(query)
      .populate('tripId')
      .populate('reportedBy', 'fullName phone email username')
      .populate('handledBy', 'fullName phone email username');

    res.json({
      success: true,
      count: incidents.length,
      data: incidents
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger emergency SOS incident (Idempotent per eventId)
// @route   POST /api/v1/incidents/sos
// @access  Private (sos:trigger)
exports.triggerSOS = async (req, res, next) => {
  try {
    const { eventId, tripId, location, coordinates, description } = req.body;
    const coords = coordinates || (location && location.coordinates);

    if (!eventId || !tripId || !coords || coords.length !== 2 || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required SOS fields: eventId, tripId, coordinates [lng, lat], and description'
      });
    }

    // 1. Idempotency Check
    const existingIncident = await Incident.findOne({ eventId });
    if (existingIncident) {
      return res.status(200).json({
        success: true,
        isDuplicate: true,
        message: 'Event already processed (idempotent)',
        data: existingIncident
      });
    }

    const route = await TransportRoute.findById(tripId);
    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Transport route not found'
      });
    }

    const incident = await Incident.create({
      eventId,
      tripId,
      reportedBy: req.user._id,
      location: {
        type: 'Point',
        coordinates: coords // [lng, lat]
      },
      description,
      status: 'OPEN'
    });

    // Update TransportRoute status to INCIDENT_HANDLING
    route.status = 'INCIDENT_HANDLING';
    route.currentLocation = {
      type: 'Point',
      coordinates: coords,
      updatedAt: new Date()
    };
    await route.save();

    await logAudit({
      actorId: req.user._id,
      action: 'SOS_TRIGGERED',
      resource: 'Incident',
      resourceId: incident._id.toString(),
      result: 'SUCCESS',
      metadata: { eventId, tripId, coordinates: coords },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      isDuplicate: false,
      message: 'Emergency SOS incident triggered successfully',
      data: incident
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update SOS incident status (Acknowledge, Resolve, Close)
// @route   PATCH /api/v1/incidents/:id/status
// @access  Private (sos:manage)
exports.updateIncidentStatus = async (req, res, next) => {
  try {
    const { status, resolutionNotes, emergencyCostAmount } = req.body;

    let incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    const currentStatus = incident.status;
    const allowedNext = ALLOWED_INCIDENT_TRANSITIONS[currentStatus] || [];

    if (!allowedNext.includes(status)) {
      await logAudit({
        actorId: req.user._id,
        action: 'INCIDENT_STATUS_UPDATE',
        resource: 'Incident',
        resourceId: incident._id.toString(),
        result: 'FAILURE',
        errorMessage: `Invalid incident state transition from ${currentStatus} to ${status}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_STATE_TRANSITION',
        message: `Invalid state transition: Cannot change incident status from '${currentStatus}' to '${status}'`
      });
    }

    incident.status = status;
    incident.handledBy = req.user._id;
    if (resolutionNotes) incident.resolutionNotes = resolutionNotes;
    if (emergencyCostAmount !== undefined) incident.emergencyCostAmount = emergencyCostAmount;

    await incident.save();

    // If incident resolved, resume transport route to IN_TRANSIT if still in INCIDENT_HANDLING
    if (['RESOLVED', 'CLOSED'].includes(status)) {
      const route = await TransportRoute.findById(incident.tripId);
      if (route && route.status === 'INCIDENT_HANDLING') {
        route.status = 'IN_TRANSIT';
        await route.save();
      }
    }

    await logAudit({
      actorId: req.user._id,
      action: `INCIDENT_${status}`,
      resource: 'Incident',
      resourceId: incident._id.toString(),
      result: 'SUCCESS',
      metadata: { previousStatus: currentStatus, newStatus: status, resolutionNotes },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: `Incident status updated to ${status}`,
      data: incident
    });
  } catch (error) {
    next(error);
  }
};
