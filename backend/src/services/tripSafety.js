const Incident = require('../models/Incident');
const activeIncident = tripId => Incident.exists({ tripId, status: { $in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] } });
const validCoordinates = value => Array.isArray(value) && value.length === 2 && value.every(Number.isFinite) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
function distanceKm(a, b) {
  const rad = x => x * Math.PI / 180;
  const h = Math.sin(rad(b[1] - a[1]) / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(rad(b[0] - a[0]) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
function locationProblem(location, destination, now = Date.now()) {
  if (!validCoordinates(location?.coordinates) || !validCoordinates(destination)) return 'Chưa có tọa độ giao nhận hợp lệ.';
  const age = now - new Date(location.updatedAt).getTime();
  if (!Number.isFinite(age) || age < -30000 || age > 120000) return 'Cần cập nhật GPS trong vòng 2 phút trước khi giao nhận.';
  if (distanceKm(location.coordinates, destination) > 0.5) return 'Xe chưa ở trong phạm vi 500 m của điểm giao đã thỏa thuận.';
  return null;
}
module.exports = { activeIncident, validCoordinates, distanceKm, locationProblem };
