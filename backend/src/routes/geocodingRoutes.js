const express = require('express');
const router = express.Router();
const geocodingController = require('../controllers/geocodingController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/search', protect, geocodingController.searchAddress);
router.get('/distance', protect, geocodingController.getDistance);

module.exports = router;
