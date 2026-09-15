// Incident Routes skeleton
const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');

router.get('/', incidentController.getIncidents);
router.post('/sos', incidentController.triggerSOS);

module.exports = router;
