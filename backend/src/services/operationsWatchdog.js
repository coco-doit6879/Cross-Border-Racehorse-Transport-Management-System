const Route = require('../models/TransportRoute');
const Incident = require('../models/Incident');
const Alert = require('../models/OperationalAlert');
async function scan(now = new Date()) {
  const stale = new Date(now.getTime() - 120000);
  const routes = await Route.find({ status: { $in: ['IN_TRANSIT', 'INCIDENT_HANDLING', 'DELIVERING'] }, $or: [{ 'currentLocation.updatedAt': { $lt: stale } }, { 'currentLocation.updatedAt': { $exists: false }, updatedAt: { $lt: stale } }] }).select('_id');
  const incidents = await Incident.find({ status: 'OPEN', createdAt: { $lt: new Date(now.getTime() - 300000) } }).select('_id tripId');
  const alerts = [
    ...routes.map(r => ({ key: `GPS:${r._id}`, kind: 'GPS_STALE', tripId: r._id, message: 'GPS quá 2 phút chưa cập nhật. Liên hệ tài xế kiểm tra an toàn; không suy ra xe đã đến nơi.' })),
    ...incidents.map(i => ({ key: `SOS:${i._id}`, kind: 'SOS_UNACKNOWLEDGED', tripId: i.tripId, message: 'SOS quá 5 phút chưa ai tiếp nhận. Quản lý trực cần liên hệ ngay.' }))
  ];
  for (const alert of alerts) await Alert.updateOne({ key: alert.key }, { $set: { ...alert, active: true, lastDetectedAt: now }, $unset: { resolvedAt: 1 }, $setOnInsert: { firstDetectedAt: now } }, { upsert: true });
  await Alert.updateMany({ active: true, key: { $nin: alerts.map(a => a.key) } }, { $set: { active: false, resolvedAt: now } });
  return alerts.length;
}
function start() {
  let running = false;
  const timer = setInterval(async () => {
    if (running || require('mongoose').connection.readyState !== 1) return;
    running = true;
    try { await scan(); } catch (error) { console.error('Operations watchdog failed:', error.message); }
    finally { running = false; }
  }, 60000);
  timer.unref(); return () => clearInterval(timer);
}
module.exports = { scan, start };
