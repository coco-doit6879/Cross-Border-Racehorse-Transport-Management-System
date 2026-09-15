const HealthLog = require('../models/HealthLog');

// @desc    Get all health logs
// @route   GET /api/health-logs
// @access  Private
exports.getHealthLogs = async (req, res, next) => {
  try {
    let query = {};
    if (req.query.orderId) query.orderId = req.query.orderId;
    if (req.query.horseId) query.horseId = req.query.horseId;

    const logs = await HealthLog.find(query)
      .populate('horseId', 'name microchipId feiPassportNo')
      .populate('escortId', 'fullName phone email');

    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    next(error);
  }
};

// @desc    Create health log entry
// @route   POST /api/health-logs
// @access  Private (DRIVER_ESCORT, TRANSPORT_SPECIALIST, ROUTE_COORDINATOR)
exports.createHealthLog = async (req, res, next) => {
  try {
    const { orderId, horseId, temperature, waterIntakeLiters, stressLevel, imageUrl, notes } = req.body;

    const healthLog = await HealthLog.create({
      orderId,
      horseId,
      escortId: req.user.id,
      temperature,
      waterIntakeLiters,
      stressLevel: stressLevel || 'STABLE',
      imageUrl,
      notes
    });

    res.status(201).json({ success: true, data: healthLog });
  } catch (error) {
    next(error);
  }
};
