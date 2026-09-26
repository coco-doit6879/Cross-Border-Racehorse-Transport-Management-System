const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Emergency SOS & Incidents
 *   description: Emergency SOS Alerts & Incident Management APIs
 */

/**
 * @swagger
 * /incidents:
 *   get:
 *     summary: Get all emergency incidents (Filterable by tripId or status)
 *     tags: [Emergency SOS & Incidents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of incidents retrieved successfully
 */
router.route('/')
  .get(protect, checkPermission('sos:manage'), incidentController.getIncidents);

/**
 * @swagger
 * /incidents/sos:
 *   post:
 *     summary: Trigger emergency SOS alert (Driver / Escort - Idempotent per eventId)
 *     tags: [Emergency SOS & Incidents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [eventId, tripId, coordinates, description]
 *             properties:
 *               eventId: { type: string, example: '660e8400-e29b-41d4-a716-446655440001' }
 *               tripId: { type: string }
 *               coordinates: { type: array, items: { type: number }, example: [106.7008, 10.7768] }
 *               description: { type: string, example: 'Vehicle engine breakdown on highway' }
 *     responses:
 *       201:
 *         description: SOS triggered and trip status set to INCIDENT_HANDLING
 */
router.post('/sos', protect, checkPermission('sos:trigger'), incidentController.triggerSOS);

/**
 * @swagger
 * /incidents/{id}/status:
 *   patch:
 *     summary: Update incident status (Acknowledge, Resolve, Close - Manager/Coordinator)
 *     tags: [Emergency SOS & Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [ACKNOWLEDGED, IN_PROGRESS, RESOLVED, CLOSED] }
 *               resolutionNotes: { type: string }
 *               emergencyCostAmount: { type: number, example: 500 }
 *     responses:
 *       200:
 *         description: Incident status updated
 */
router.patch('/:id/status', protect, checkPermission('sos:manage'), incidentController.updateIncidentStatus);

module.exports = router;
