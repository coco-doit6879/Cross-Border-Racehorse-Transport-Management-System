const TransportRoute = require('../models/TransportRoute');
const { logAudit } = require('../utils/auditLogger');

// Fixed Master Specification Thresholds
const ROUTE_DEVIATION_THRESHOLD_KM = 2.0;
const ABNORMAL_STOP_THRESHOLD_MINUTES = 30.0;

/**
 * Calculates geographic distance between two coordinates in kilometers using Haversine formula
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} Distance in kilometers
 */
function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates the minimum distance from current position to any waypoint in the transport route
 * @param {number} lat - Current latitude
 * @param {number} lng - Current longitude
 * @param {Array} waypoints - Route waypoints array
 * @returns {number} Minimum distance in kilometers
 */
function calculateMinDistanceToRouteKm(lat, lng, waypoints) {
  if (!waypoints || waypoints.length === 0) return 0;

  let minDistance = Infinity;

  for (const wp of waypoints) {
    if (wp.location && wp.location.coordinates && wp.location.coordinates.length === 2) {
      const wpLng = wp.location.coordinates[0];
      const wpLat = wp.location.coordinates[1];
      const dist = calculateHaversineDistanceKm(lat, lng, wpLat, wpLng);
      if (dist < minDistance) {
        minDistance = dist;
      }
    }
  }

  return minDistance === Infinity ? 0 : minDistance;
}

/**
 * Evaluates route deviation and unscheduled long stop conditions for a GPS update
 * @param {Object} params
 * @param {Object} params.route - TransportRoute Mongoose document
 * @param {number} params.latitude - Current latitude
 * @param {number} params.longitude - Current longitude
 * @param {Date} params.timestamp - GPS timestamp
 * @param {Object} params.io - Socket.io server instance
 * @param {Object} [params.actor] - User identity
 */
async function processRouteDeviation({ route, latitude, longitude, timestamp, io, actor }) {
  if (!route || !route.waypoints) return { deviationDetected: false, stopDetected: false };

  const currentTs = timestamp ? new Date(timestamp) : new Date();
  let routeModified = false;
  let deviationAlert = null;
  let stopAlert = null;

  // ----------------------------------------------------
  // 1. ROUTE DEVIATION DETECTION (> 2 KM)
  // ----------------------------------------------------
  const minDistanceKm = calculateMinDistanceToRouteKm(latitude, longitude, route.waypoints);

  if (minDistanceKm > ROUTE_DEVIATION_THRESHOLD_KM) {
    const existingDeviations = route.routeDeviations || [];
    // Deduplication check: Check if an OPEN ROUTE_DEVIATION already exists created within last 15 mins
    const fifteenMinsAgo = new Date(currentTs.getTime() - 15 * 60 * 1000);
    const hasRecentOpenDev = existingDeviations.some(
      d => d.type === 'ROUTE_DEVIATION' && d.status === 'OPEN' && d.detectedAt > fifteenMinsAgo
    );

    if (!hasRecentOpenDev) {
      const roundedDistance = Math.round(minDistanceKm * 100) / 100;
      const newDev = {
        detectedAt: currentTs,
        location: [longitude, latitude],
        deviationDistanceKm: roundedDistance,
        type: 'ROUTE_DEVIATION',
        status: 'OPEN'
      };

      route.routeDeviations.push(newDev);
      routeModified = true;

      deviationAlert = {
        tripId: route._id.toString(),
        type: 'ROUTE_DEVIATION',
        deviationDistanceKm: roundedDistance,
        location: { latitude, longitude },
        detectedAt: currentTs.toISOString()
      };

      await logAudit({
        actorId: actor ? actor._id : null,
        action: 'ROUTE_DEVIATION_DETECTED',
        resource: 'TransportRoute',
        resourceId: route._id.toString(),
        result: 'SUCCESS',
        metadata: { deviationDistanceKm: roundedDistance, latitude, longitude }
      });
    }
  }

  // ----------------------------------------------------
  // 2. ABNORMAL STOP DETECTION (> 30 MINUTES)
  // ----------------------------------------------------
  if (route.currentLocation && route.currentLocation.coordinates && route.currentLocation.updatedAt) {
    const prevLng = route.currentLocation.coordinates[0];
    const prevLat = route.currentLocation.coordinates[1];
    const prevTime = new Date(route.currentLocation.updatedAt);

    const distFromPrevKm = calculateHaversineDistanceKm(latitude, longitude, prevLat, prevLng);
    const durationMs = currentTs.getTime() - prevTime.getTime();
    const durationMinutes = durationMs / (1000 * 60);

    // Vehicle is stationary if movement < 0.05 km (50 meters)
    if (distFromPrevKm < 0.05 && durationMinutes >= ABNORMAL_STOP_THRESHOLD_MINUTES) {
      const existingDeviations = route.routeDeviations || [];
      const thirtyMinsAgo = new Date(currentTs.getTime() - 30 * 60 * 1000);
      const hasRecentOpenStop = existingDeviations.some(
        d => d.type === 'UNSCHEDULED_LONG_STOP' && d.status === 'OPEN' && d.detectedAt > thirtyMinsAgo
      );

      if (!hasRecentOpenStop) {
        const newStop = {
          detectedAt: currentTs,
          location: [longitude, latitude],
          deviationDistanceKm: 0,
          type: 'UNSCHEDULED_LONG_STOP',
          status: 'OPEN'
        };

        route.routeDeviations.push(newStop);
        routeModified = true;

        stopAlert = {
          tripId: route._id.toString(),
          type: 'UNSCHEDULED_LONG_STOP',
          stationaryMinutes: Math.round(durationMinutes),
          location: { latitude, longitude },
          detectedAt: currentTs.toISOString()
        };

        await logAudit({
          actorId: actor ? actor._id : null,
          action: 'UNSCHEDULED_LONG_STOP_DETECTED',
          resource: 'TransportRoute',
          resourceId: route._id.toString(),
          result: 'SUCCESS',
          metadata: { stationaryMinutes: Math.round(durationMinutes), latitude, longitude }
        });
      }
    }
  }

  if (routeModified) {
    await route.save();
  }

  // Emit Socket.io events if alerts occurred
  if (io) {
    const roomName = `trip_${route._id.toString()}`;
    if (deviationAlert) {
      io.to(roomName).emit('route:deviation_detected', deviationAlert);
    }
    if (stopAlert) {
      io.to(roomName).emit('route:deviation_detected', stopAlert);
    }
  }

  return {
    deviationDetected: !!deviationAlert,
    stopDetected: !!stopAlert,
    deviationAlert,
    stopAlert
  };
}

module.exports = {
  ROUTE_DEVIATION_THRESHOLD_KM,
  ABNORMAL_STOP_THRESHOLD_MINUTES,
  calculateHaversineDistanceKm,
  calculateMinDistanceToRouteKm,
  processRouteDeviation
};
