const { STOPS } = require('../config/transportCatalog');
const { calculateHaversineDistanceKm } = require('./geoDistance');

const DEFAULT_BASE_FEE_VND = 2000000;
const DEFAULT_RATE_VND_PER_KM = 12000;
const ROAD_FACTOR = 1.25;

function routeFare(originStopId, destinationStopId, baseFeeVnd = DEFAULT_BASE_FEE_VND, rateVndPerKm = DEFAULT_RATE_VND_PER_KM) {
  const origin = STOPS.find(stop => stop.id === originStopId);
  const destination = STOPS.find(stop => stop.id === destinationStopId);
  if (!origin || !destination || origin.id === destination.id) throw new Error('Tuyến không hợp lệ.');
  const [lon1, lat1] = origin.coordinates;
  const [lon2, lat2] = destination.coordinates;
  const estimatedRoadKm = Math.ceil(calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) * ROAD_FACTOR);
  return { estimatedRoadKm, baseFeeVnd, rateVndPerKm, basePriceVnd: Math.ceil((baseFeeVnd + estimatedRoadKm * rateVndPerKm) / 1000) * 1000 };
}

module.exports = { routeFare, DEFAULT_BASE_FEE_VND, DEFAULT_RATE_VND_PER_KM };
