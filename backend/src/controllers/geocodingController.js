const geocodingService = require('../services/geocodingService');

// @desc    Geocode address search
// @route   GET /api/v1/geocoding/search
// @access  Private (Authenticated users)
exports.searchAddress = async (req, res, next) => {
  try {
    const { q, country } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid search query string (minimum 2 characters)'
      });
    }

    const results = await geocodingService.searchAddress(q, country);

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Calculate estimated geographic distance between two coordinates
// @route   GET /api/v1/geocoding/distance
// @access  Private
exports.getDistance = async (req, res, next) => {
  try {
    const { origLng, origLat, destLng, destLat } = req.query;

    const oLng = parseFloat(origLng);
    const oLat = parseFloat(origLat);
    const dLng = parseFloat(destLng);
    const dLat = parseFloat(destLat);

    if (isNaN(oLng) || isNaN(oLat) || isNaN(dLng) || isNaN(dLat)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid origin and destination coordinates (origLng, origLat, destLng, destLat)'
      });
    }

    const distanceKm = geocodingService.calculateDistanceKm([oLng, oLat], [dLng, dLat]);

    res.json({
      success: true,
      data: {
        estimatedDistanceKm: distanceKm,
        type: 'Geographic Haversine Distance'
      }
    });
  } catch (error) {
    next(error);
  }
};
