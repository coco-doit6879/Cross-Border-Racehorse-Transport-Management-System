const Incident = require('../models/Incident');
const activeIncident = tripId => Incident.exists({ tripId, status: { $in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] } });
const validCoordinates = value => Array.isArray(value) && value.length === 2 && value.every(Number.isFinite) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
function distanceKm(a, b) {
  const rad = x => x * Math.PI / 180;
  const h = Math.sin(rad(b[1] - a[1]) / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(rad(b[0] - a[0]) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
module.exports = { activeIncident, validCoordinates, distanceKm };
