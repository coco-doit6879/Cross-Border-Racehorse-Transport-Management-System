/**
 * Transport Calculator - Calculates travel duration, estimated arrival, rest stops, and distance
 * based on GeoJSON coordinates, speed parameters, and border cross rules.
 */

/**
 * Calculate Haversine distance in kilometers between two GeoJSON points [lng, lat]
 */
export const calculateDistanceKm = (originCoords, destCoords) => {
  if (!Array.isArray(originCoords) || originCoords.length !== 2 ||
      !Array.isArray(destCoords) || destCoords.length !== 2) {
    return 240; // Baseline fallback distance (e.g. HCM to Phnom Penh)
  }

  const [lon1, lat1] = originCoords;
  const [lon2, lat2] = destCoords;

  if (lon1 === 0 && lat1 === 0 && lon2 === 0 && lat2 === 0) return 240;

  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;

  return Math.max(15, Math.round(dist * 10) / 10);
};

/**
 * Calculate complete transport schedule: start time, duration, rest stops, customs, and end time.
 */
export const calculateTransportSchedule = (startDateInput, originObj, destObj) => {
  const startAt = startDateInput ? new Date(startDateInput) : new Date();

  const originCoords = typeof originObj === 'object' ? originObj?.coordinates : null;
  const destCoords = typeof destObj === 'object' ? destObj?.coordinates : null;

  const originCountry = (typeof originObj === 'object' ? originObj?.countryCode : 'VN') || 'VN';
  const destCountry = (typeof destObj === 'object' ? destObj?.countryCode : 'KH') || 'KH';

  const distanceKm = calculateDistanceKm(originCoords, destCoords);

  // Average heavy horse transport truck speed on highways: 60 km/h
  const driveHours = distanceKm / 60;

  // Mandatory equine welfare rest & hydration stop: 30 minutes (0.5h) per 200 km
  const restStopsCount = Math.floor(distanceKm / 200);
  const restHours = restStopsCount * 0.5;

  // Border customs clearance & health inspection buffer: 2.0 hours for international routes
  const isCrossBorder = originCountry.toUpperCase() !== destCountry.toUpperCase();
  const customsHours = isCrossBorder ? 2.0 : 0.0;

  // Total transport hours (minimum 2 hours for loading & unloading)
  const totalHours = Math.max(2.0, Math.round((driveHours + restHours + customsHours) * 10) / 10);
  const endAt = new Date(startAt.getTime() + Math.round(totalHours * 3600 * 1000));

  const hoursPart = Math.floor(totalHours);
  const minsPart = Math.round((totalHours - hoursPart) * 60);
  const durationFormatted = minsPart > 0 ? `${hoursPart} giờ ${minsPart} phút` : `${hoursPart} giờ`;

  return {
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    distanceKm,
    durationHours: totalHours,
    durationFormatted,
    driveHours: Math.round(driveHours * 10) / 10,
    restStopsCount,
    customsHours,
    isCrossBorder
  };
};
