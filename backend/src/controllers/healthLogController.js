const HealthLog = require('../models/HealthLog');
const HealthPhoto = require('../models/HealthPhoto');
const TransportRoute = require('../models/TransportRoute');
const { logAudit } = require('../utils/auditLogger');
const { accessibleOrders } = require('../services/resourceAccess');
const { recordHealthLog } = require('../services/healthLogs');

// Trip ids the user may read; null means unrestricted staff access.
async function readableTrips(user) {
  const orderIds = await accessibleOrders(user);
  if (orderIds === null) return null;
  return (await TransportRoute.find({ orderId: { $in: orderIds } }).select('_id')).map(r => String(r._id));
}

// @desc    Get health logs (Filtered by tripId or horseId), newest first
// @route   GET /api/v1/health-logs
// @access  Private
exports.getHealthLogs = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.tripId) query.tripId = req.query.tripId;
    if (req.query.horseId) query.horseId = req.query.horseId;
    const trips = await readableTrips(req.user);
    if (trips !== null) query.$and = [{ tripId: { $in: trips } }];

    const logs = await HealthLog.find(query)
      .sort({ recordedAt: -1 })
      .populate('horseId', 'name microchipId feiPassportNumber')
      .populate('recordedBy', 'fullName username role')
      .lean();

    res.json({
      success: true,
      count: logs.length,
      data: logs.map(log => ({ ...log, hasPhoto: Boolean(log.photoId), photoPath: log.photoId ? `/health-logs/${log._id}/photo` : null }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Stream the photo attached to a health log
// @route   GET /api/v1/health-logs/:id/photo
// @access  Private (same visibility as the log)
exports.getHealthLogPhoto = async (req, res, next) => {
  try {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(404).json({ success: false, message: 'Không tìm thấy ảnh.' });
    const log = await HealthLog.findById(req.params.id).select('tripId photoId').lean();
    if (!log?.photoId) return res.status(404).json({ success: false, message: 'Không tìm thấy ảnh.' });
    const trips = await readableTrips(req.user);
    if (trips !== null && !trips.includes(String(log.tripId))) return res.status(403).json({ success: false, message: 'Bạn không có quyền xem ảnh này.' });
    const photo = await HealthPhoto.findById(log.photoId).select('+data');
    if (!photo) return res.status(404).json({ success: false, message: 'Không tìm thấy ảnh.' });
    res.set({ 'Content-Type': photo.mimeType, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, max-age=86400' });
    res.send(photo.data);
  } catch (error) {
    next(error);
  }
};

// @desc    Create health log (Idempotent per eventId), optional photo as data URL in `photoData`
// @route   POST /api/v1/health-logs
// @access  Private (welfare:log)
exports.createHealthLog = async (req, res, next) => {
  try {
    const { log, isDuplicate } = await recordHealthLog(req, req.body || {});
    if (!isDuplicate) {
      await logAudit({
        actorId: req.user._id,
        action: 'HEALTH_LOG_CREATE',
        resource: 'HealthLog',
        resourceId: log._id.toString(),
        result: 'SUCCESS',
        metadata: { eventId: log.eventId, condition: log.condition, alertType: log.alertType, hasPhoto: Boolean(log.photoId) },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    }
    const data = log.toObject ? log.toObject() : log;
    res.status(isDuplicate ? 200 : 201).json({ success: true, isDuplicate, data: { ...data, hasPhoto: Boolean(data.photoId) } });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    next(error);
  }
};
