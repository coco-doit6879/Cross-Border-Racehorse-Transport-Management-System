const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');
const { protect, authorize } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Incidents
 *   description: Emergency SOS Push Alerts & Incident Resolution APIs
 */

/**
 * @swagger
 * /incidents:
 *   get:
 *     summary: Get all emergency incidents list
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of incidents
 */
router.get('/', protect, incidentController.getIncidents);

/**
 * @swagger
 * /incidents/sos:
 *   post:
 *     summary: Trigger One-Tap Emergency SOS Alert
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, latitude, longitude]
 *             properties:
 *               orderId:
 *                 type: string
 *               latitude:
 *                 type: number
 *                 example: 1.3644
 *               longitude:
 *                 type: number
 *                 example: 103.9915
 *               description:
 *                 type: string
 *                 example: Vehicle tire puncture near border customs
 *     responses:
 *       201:
 *         description: Emergency SOS triggered with high priority alert
 */
router.post('/sos', protect, authorize('DRIVER_ESCORT', 'ROUTE_COORDINATOR'), incidentController.triggerSOS);

/**
 * @swagger
 * /incidents/{id}/resolve:
 *   patch:
 *     summary: Resolve an emergency incident
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Incident marked as RESOLVED
 */
router.patch('/:id/resolve', protect, authorize('ROUTE_COORDINATOR', 'LOGISTICS_MANAGER'), incidentController.resolveIncident);

module.exports = router;
