// HealthLog Routes skeleton
const express = require('express');
const router = express.Router();
const healthLogController = require('../controllers/healthLogController');

router.get('/', healthLogController.getHealthLogs);
router.post('/', healthLogController.createHealthLog);

module.exports = router;
