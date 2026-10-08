const Incident = require('../models/Incident');
const TransportRoute = require('../models/TransportRoute');
const { logAudit } = require('../utils/auditLogger');
const { activeIncident, validCoordinates } = require('../services/tripSafety');

const ALLOWED_INCIDENT_TRANSITIONS = {
  'OPEN': ['ACKNOWLEDGED'],
  'ACKNOWLEDGED': ['IN_PROGRESS', 'RESOLVED'],
  'IN_PROGRESS': ['RESOLVED'],
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
    const operationalAlerts = await require('../models/OperationalAlert').find({ active: true }).sort({ firstDetectedAt: 1 }).limit(100);

    res.json({
      success: true,
      count: incidents.length,
      data: incidents
      , operationalAlerts
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

    if (!eventId || !tripId || !description || typeof description !== 'string' || description.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Cần mã sự kiện, chuyến và mô tả sự cố ít nhất 5 ký tự; GPS có thể bổ sung sau.'
      });
    }

    // 1. Idempotency Check
    const existingIncident = await Incident.findOne({ eventId });
    if (existingIncident) {
      if (String(existingIncident.reportedBy) !== String(req.user._id) || String(existingIncident.tripId) !== String(tripId)) return res.status(403).json({ success: false, message: 'Sự kiện không thuộc chuyến của bạn.' });
      if (['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(existingIncident.status)) {
        const retryRoute = await TransportRoute.findById(tripId);
        if (retryRoute && ['SCHEDULED', 'IN_TRANSIT', 'DELIVERING'].includes(retryRoute.status)) {
          retryRoute.preIncidentStatus = retryRoute.status; retryRoute.status = 'INCIDENT_HANDLING';
          await retryRoute.save();
        }
      }
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
    const isAssigned = String(route.driverId || '') === String(req.user._id) || String(route.escortId || '') === String(req.user._id);
    if (!isAssigned) {
      return res.status(403).json({ success: false, message: 'Bạn không được phân công vào chuyến vận chuyển này.' });
    }
    if (!['SCHEDULED', 'IN_TRANSIT', 'INCIDENT_HANDLING', 'DELIVERING'].includes(route.status)) return res.status(409).json({ success: false, message: 'Chuyến đã kết thúc, không thể mở lại bằng SOS.' });
    if (coords !== undefined && !validCoordinates(coords)) return res.status(400).json({ success: false, message: 'Tọa độ SOS không hợp lệ.' });

    const incident = await Incident.create({
      eventId,
      tripId,
      reportedBy: req.user._id,
      location: coords ? {
        type: 'Point',
        coordinates: coords // [lng, lat]
      } : undefined,
      locationUnavailable: !coords,
      description,
      status: 'OPEN'
    });

    // Update TransportRoute status to INCIDENT_HANDLING
    if (route.status !== 'INCIDENT_HANDLING') route.preIncidentStatus = route.status;
    route.status = 'INCIDENT_HANDLING';
    // SOS may arrive from an old offline queue. Never mark its position as a
    // fresh live GPS fix used for delivery authorization.
    await route.save();
    const io = req.app?.get('io');
    if (io) for (const socket of io.sockets.sockets.values()) {
      if (socket.user?.effectivePermissions?.includes('sos:manage')) socket.emit('sos:alert_broadcast', { incidentId: String(incident._id), tripId: String(route._id), description: incident.description, reportedAt: incident.createdAt });
    }

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
    if (['RESOLVED', 'CLOSED'].includes(status) && !String(resolutionNotes || '').trim()) return res.status(400).json({ success: false, message: 'Cần ghi rõ kết quả xử lý trước khi đóng sự cố.' });
    if (emergencyCostAmount !== undefined && (!Number.isFinite(emergencyCostAmount) || emergencyCostAmount < 0)) return res.status(400).json({ success: false, message: 'Chi phí khẩn cấp không hợp lệ.' });

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
    if (['RESOLVED', 'CLOSED'].includes(status)) {
      const assignedRoute = await TransportRoute.findById(incident.tripId);
      if (assignedRoute?.rescuePending) return res.status(409).json({ success: false, message: 'Tài xế xe thay thế chưa xác nhận tiếp nhận đủ ngựa và km đầu xe mới.' });
    }
    incident.handledBy = req.user._id;
    if (resolutionNotes) incident.resolutionNotes = resolutionNotes;
    if (emergencyCostAmount !== undefined) incident.emergencyCostAmount = emergencyCostAmount;

    await incident.save();

    // If incident resolved, resume transport route to IN_TRANSIT if still in INCIDENT_HANDLING
    if (['RESOLVED', 'CLOSED'].includes(status)) {
      const route = await TransportRoute.findById(incident.tripId);
      if (route && route.status === 'INCIDENT_HANDLING' && !(await activeIncident(route._id))) {
        route.status = route.preIncidentStatus || 'IN_TRANSIT';
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
