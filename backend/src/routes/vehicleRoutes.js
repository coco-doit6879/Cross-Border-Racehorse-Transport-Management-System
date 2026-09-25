const express = require('express');
const controller = require('../controllers/vehicleController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');
const router = express.Router();

router.route('/').get(protect, checkPermission('route:dispatch'), controller.getVehicles).post(protect, checkPermission('route:dispatch'), controller.createVehicle);
router.put('/:id', protect, checkPermission('route:dispatch'), controller.updateVehicle);

module.exports = router;
