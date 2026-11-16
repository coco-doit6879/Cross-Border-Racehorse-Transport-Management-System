const { calculateHaversineDistanceKm } = require('./geoDistance');

function nextArrivalGate(route, waypoint, now = new Date()) {
  if (!route.tripStartedAt || waypoint.type === 'PICKUP') return null;
  const previous = [...route.waypoints].filter(item => item.sequence < waypoint.sequence).sort((a, b) => b.sequence - a.sequence)[0];
  const started = previous ? previous.actualArrival : route.tripStartedAt;
  if (!started) return null;
  const from = previous?.location?.coordinates;
  const to = waypoint.location?.coordinates;
  const straightKm = from?.length === 2 && to?.length === 2
    ? calculateHaversineDistanceKm(from[1], from[0], to[1], to[0]) : 0;
  const distanceMinutes = Math.ceil(straightKm / 120 * 60);
  const plannedMinutes = previous?.estimatedArrival && waypoint.estimatedArrival
    ? Math.max(0, Math.floor((new Date(waypoint.estimatedArrival) - new Date(previous.estimatedArrival)) / 60000 * 0.5)) : 0;
  const minimumMinutes = Math.max(distanceMinutes, plannedMinutes);
  const earliestAt = new Date(new Date(started).getTime() + minimumMinutes * 60000);
  return now < earliestAt ? { earliestAt, minimumMinutes } : null;
}

module.exports = { nextArrivalGate };
