const HealthLog = require('../models/HealthLog');
const HealthPhoto = require('../models/HealthPhoto');
const TransportRoute = require('../models/TransportRoute');
const { validateHealthAssignment } = require('./resourceAccess');
const notifications = require('./notifications');

const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;
const CONDITIONS = ['STABLE', 'STRESSED', 'UNSTABLE'];
const ALERTS = ['NONE', 'FEVER', 'INJURED', 'DEHYDRATION'];
const SIGNATURES = {
  'image/jpeg': b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': b => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  'image/webp': b => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP'
};
const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

// Accepts a `data:image/...;base64,...` string from the mobile camera and returns verified bytes.
function parsePhoto(dataUrl) {
  const match = typeof dataUrl === 'string' && /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+=*)$/.exec(dataUrl);
  if (!match) throw fail('Ảnh phải là JPG, PNG hoặc WebP hợp lệ.');
  const data = Buffer.from(match[2], 'base64');
  if (!data.length || data.length > MAX_PHOTO_BYTES) throw fail('Ảnh tối đa 1,5 MB. Vui lòng chụp lại.');
  if (!SIGNATURES[match[1]](data)) throw fail('Nội dung ảnh không đúng định dạng.');
  return { mimeType: match[1], data };
}

function validateReadings(p) {
  const required = ['eventId', 'tripId', 'horseId', 'temperatureCelsius', 'waterIntakeLiters', 'foodIntakeStatus', 'condition'];
  const missing = required.filter(key => p[key] === undefined || p[key] === null || p[key] === '');
  if (missing.length) throw fail(`Thiếu thông tin bắt buộc: ${missing.join(', ')}`);
  const temperature = Number(p.temperatureCelsius), water = Number(p.waterIntakeLiters);
  if (!Number.isFinite(temperature) || temperature < 30 || temperature > 45) throw fail('Thân nhiệt phải trong khoảng 30–45 °C.');
  if (!Number.isFinite(water) || water < 0 || water > 100) throw fail('Lượng nước uống phải trong khoảng 0–100 lít.');
  if (!CONDITIONS.includes(p.condition)) throw fail('Thể trạng không hợp lệ.');
  if (p.alertType && !ALERTS.includes(p.alertType)) throw fail('Loại cảnh báo không hợp lệ.');
  return { temperature, water };
}

/**
 * Records one health log for both the live API and offline sync.
 * Idempotent per eventId: a retried event never stores a second photo or notification.
 */
async function recordHealthLog(req, payload) {
  const { temperature, water } = validateReadings(payload);
  await validateHealthAssignment(req.user, payload.tripId, payload.horseId);
  const existing = await HealthLog.findOne({ eventId: payload.eventId });
  if (existing) {
    if (String(existing.tripId) !== String(payload.tripId) || String(existing.recordedBy) !== String(req.user._id)) throw fail('Sự kiện không thuộc nhật ký của bạn.', 403);
    await require('./healthEscalation')(existing, req);
    return { log: existing, isDuplicate: true };
  }
  const photo = payload.photoData ? parsePhoto(payload.photoData) : null;
  const route = await TransportRoute.findById(payload.tripId).select('orderId');
  if (!route) throw fail('Không tìm thấy chuyến.', 404);

  const stored = photo && await HealthPhoto.create({ tripId: payload.tripId, uploadedBy: req.user._id, mimeType: photo.mimeType, data: photo.data, size: photo.data.length });
  let log;
  try {
    log = await HealthLog.create({
      eventId: payload.eventId,
      tripId: payload.tripId,
      horseId: payload.horseId,
      recordedBy: req.user._id,
      temperatureCelsius: temperature,
      waterIntakeLiters: water,
      foodIntakeStatus: String(payload.foodIntakeStatus).trim().slice(0, 60),
      condition: payload.condition,
      alertType: payload.alertType || 'NONE',
      photoId: stored?._id,
      notes: payload.notes ? String(payload.notes).trim().slice(0, 500) : undefined,
      recordedAt: payload.recordedAt ? new Date(payload.recordedAt) : new Date()
    });
  } catch (error) {
    if (stored) await HealthPhoto.deleteOne({ _id: stored._id });
    throw error;
  }

  await require('./healthEscalation')(log, req);
  req.app?.get?.('io')?.to(`trip_${payload.tripId}`).emit('health:log_created', { tripId: String(payload.tripId), logId: String(log._id) });
  const populated = await HealthLog.findById(log._id).populate('horseId', 'name').lean();
  const alert = log.alertType !== 'NONE' ? ` · Cảnh báo ${log.alertType}` : '';
  await notifications.orderEvent('HEALTH_LOG', route.orderId, String(log._id), {
    reason: `${populated?.horseId?.name || 'Ngựa'}: ${temperature} °C, uống ${water} lít, ${({ STABLE: 'ổn định', STRESSED: 'căng thẳng', UNSTABLE: 'không ổn định' })[log.condition]}${alert}${stored ? ' · có ảnh' : ''}.`
  });
  return { log, isDuplicate: false };
}

module.exports = { recordHealthLog, parsePhoto, MAX_PHOTO_BYTES };
