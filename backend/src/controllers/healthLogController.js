const HealthLog = require('../models/HealthLog');
const TransportRoute = require('../models/TransportRoute');
const { logAudit } = require('../utils/auditLogger');

// @desc    Get health logs (Filtered by tripId or horseId)
// @route   GET /api/v1/health-logs
// @access  Private
exports.getHealthLogs = async (req, res, next) => {
  try {
    let query = {};
    if (req.query.tripId) query.tripId = req.query.tripId;
    if (req.query.horseId) query.horseId = req.query.horseId;

    const logs = await HealthLog.find(query)
      .populate('horseId', 'name microchipId feiPassportNumber')
      .populate('recordedBy', 'fullName username role');

    res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create health log (Idempotent per eventId)
// @route   POST /api/v1/health-logs
// @access  Private (welfare:log)
exports.createHealthLog = async (req, res, next) => {
  try {
    const { eventId, tripId, horseId, temperatureCelsius, waterIntakeLiters, foodIntakeStatus, condition, alertType, photoUrl, notes, recordedAt } = req.body;

    if (!eventId || !tripId || !horseId || temperatureCelsius === undefined || waterIntakeLiters === undefined || !foodIntakeStatus || !condition) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: eventId, tripId, horseId, temperatureCelsius, waterIntakeLiters, foodIntakeStatus, condition'
      });
    }

    // 1. Idempotency Check: Verify if this eventId was already processed
    const existingLog = await HealthLog.findOne({ eventId });
    if (existingLog) {
      return res.status(200).json({
        success: true,
        isDuplicate: true,
        message: 'Event already processed (idempotent)',
        data: existingLog
      });
    }

    const route = await TransportRoute.findById(tripId);
    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Transport route not found'
      });
    }

    const log = await HealthLog.create({
      eventId,
      tripId,
      horseId,
      recordedBy: req.user._id,
      temperatureCelsius,
      waterIntakeLiters,
      foodIntakeStatus,
      condition,
      alertType: alertType || 'NONE',
      photoUrl,
      notes,
      recordedAt: recordedAt || new Date()
    });

    await logAudit({
      actorId: req.user._id,
      action: 'HEALTH_LOG_CREATE',
      resource: 'HealthLog',
      resourceId: log._id.toString(),
      result: 'SUCCESS',
      metadata: { eventId, condition, alertType },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      isDuplicate: false,
      data: log
    });
  } catch (error) {
    next(error);
  }
};
