const https = require('https');
const { calculateHaversineDistanceKm } = require('./routeDeviationService');

/**
 * Base Geocoding Provider Class
 */
class GeocodingProvider {
  async search(query, countryCode) {
    throw new Error('search() method must be implemented by provider');
  }
}

/**
 * OpenStreetMap Nominatim Geocoding Provider Implementation
 */
class NominatimGeocodingProvider extends GeocodingProvider {
  constructor(apiKey = null) {
    super();
    this.apiKey = apiKey;
  }

  async search(query, countryCode = null) {
    return new Promise((resolve, reject) => {
      let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=8`;
      if (countryCode) {
        url += `&countrycodes=${encodeURIComponent(countryCode.toLowerCase())}`;
      }

      const options = {
        headers: {
          'User-Agent': 'CBRT-Racehorse-Transport-System/1.0 (contact@cbrt.example.com)'
        }
      };

      https.get(url, options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              return resolve([]);
            }
            const json = JSON.parse(data);
            if (!Array.isArray(json)) return resolve([]);

            const results = json.map((item) => {
              const lng = parseFloat(item.lon);
              const lat = parseFloat(item.lat);
              const country = (item.address && item.address.country_code)
                ? item.address.country_code.toUpperCase()
                : (countryCode ? countryCode.toUpperCase() : 'VN');

              return {
                formattedAddress: item.display_name,
                countryCode: country,
                coordinates: [lng, lat] // Strictly GeoJSON [longitude, latitude]
              };
            }).filter(item => 
              !isNaN(item.coordinates[0]) && 
              !isNaN(item.coordinates[1]) &&
              item.coordinates[0] >= -180 && item.coordinates[0] <= 180 &&
              item.coordinates[1] >= -90 && item.coordinates[1] <= 90
            );

            resolve(results);
          } catch (err) {
            resolve([]);
          }
        });
      }).on('error', (err) => {
        resolve([]);
      });
    });
  }
}

/**
 * GeocodingService Abstraction Manager
 */
class GeocodingService {
  constructor() {
    const providerType = process.env.GEOCODING_PROVIDER || 'nominatim';
    const apiKey = process.env.GEOCODING_API_KEY || null;

    if (providerType === 'nominatim') {
      this.provider = new NominatimGeocodingProvider(apiKey);
    } else {
      this.provider = new NominatimGeocodingProvider(apiKey);
    }
  }

  async searchAddress(query, countryCode = null) {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return [];
    }
    return await this.provider.search(query.trim(), countryCode);
  }

  calculateDistanceKm(originCoords, destinationCoords) {
    if (!Array.isArray(originCoords) || originCoords.length !== 2 ||
        !Array.isArray(destinationCoords) || destinationCoords.length !== 2) {
      return 0;
    }
    const [lon1, lat1] = originCoords;
    const [lon2, lat2] = destinationCoords;
    const dist = calculateHaversineDistanceKm(lat1, lon1, lat2, lon2);
    return Math.round(dist * 10) / 10;
  }

  calculateEstimatedTransportTime(originCoords, destinationCoords, departureDate = new Date(), originCountry = 'VN', destinationCountry = 'KH') {
    const start = departureDate ? new Date(departureDate) : new Date();

    let distanceKm = this.calculateDistanceKm(originCoords, destinationCoords);
    if (!distanceKm || distanceKm <= 0) {
      distanceKm = 240;
    }

    const driveHours = distanceKm / 60;
    const restStopsCount = Math.floor(distanceKm / 200);
    const restHours = restStopsCount * 0.5;

    const isCrossBorder = (originCountry || 'VN').toUpperCase() !== (destinationCountry || 'KH').toUpperCase();
    const customsHours = isCrossBorder ? 2.0 : 0.0;

    const totalHours = Math.max(2.0, Math.round((driveHours + restHours + customsHours) * 10) / 10);
    const estimatedArrival = new Date(start.getTime() + Math.round(totalHours * 3600 * 1000));

    const hoursPart = Math.floor(totalHours);
    const minsPart = Math.round((totalHours - hoursPart) * 60);
    const durationFormatted = minsPart > 0 ? `${hoursPart} giờ ${minsPart} phút` : `${hoursPart} giờ`;

    return {
      distanceKm,
      durationHours: totalHours,
      durationFormatted,
      driveHours: Math.round(driveHours * 10) / 10,
      restStopsCount,
      customsHours,
      estimatedArrival
    };
  }
}

module.exports = new GeocodingService();
