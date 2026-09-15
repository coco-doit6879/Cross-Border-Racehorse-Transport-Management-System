const express = require('express');
const router = express.Router();
const healthLogController = require('../controllers/healthLogController');
const { protect, authorize } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: HealthLogs
 *   description: Horse Welfare Logging APIs (Temperature, Water, Stress Level)
 */

/**
 * @swagger
 * /health-logs:
 *   get:
 *     summary: Get equine health logs timeline
 *     tags: [HealthLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: orderId
 *         schema:
 *           type: string
 *       - in: query
 *         name: horseId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of health logs
 *   post:
 *     summary: Log equine health stats during transit
 *     tags: [HealthLogs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HealthLog'
 *     responses:
 *       201:
 *         description: Health log entry created
 */
router.route('/')
  .get(protect, healthLogController.getHealthLogs)
  .post(protect, authorize('DRIVER_ESCORT', 'TRANSPORT_SPECIALIST', 'ROUTE_COORDINATOR'), healthLogController.createHealthLog);

module.exports = router;
