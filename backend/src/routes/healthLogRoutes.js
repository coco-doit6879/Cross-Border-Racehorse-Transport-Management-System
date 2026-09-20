const express = require('express');
const router = express.Router();
const healthLogController = require('../controllers/healthLogController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Equine Health & Welfare Logs
 *   description: Welfare Monitoring & Health Check-in Logs APIs
 */

/**
 * @swagger
 * /health-logs:
 *   get:
 *     summary: Get equine health logs (Filterable by tripId or horseId)
 *     tags: [Equine Health & Welfare Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of health logs retrieved
 *   post:
 *     summary: Record equine health log (Escort - Idempotent per eventId)
 *     tags: [Equine Health & Welfare Logs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [eventId, tripId, horseId, temperatureCelsius, waterIntakeLiters, foodIntakeStatus, condition]
 *             properties:
 *               eventId: { type: string, example: '550e8400-e29b-41d4-a716-446655440000' }
 *               tripId: { type: string }
 *               horseId: { type: string }
 *               temperatureCelsius: { type: number, example: 38.2 }
 *               waterIntakeLiters: { type: number, example: 10 }
 *               foodIntakeStatus: { type: string, example: 'NORMAL' }
 *               condition: { type: string, enum: [STABLE, STRESSED, UNSTABLE], example: 'STABLE' }
 *               alertType: { type: string, enum: [NONE, FEVER, INJURED, DEHYDRATION], example: 'NONE' }
 *               photoUrl: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Health log recorded successfully
 */
router.route('/')
  .get(protect, healthLogController.getHealthLogs)
  .post(protect, checkPermission('welfare:log'), healthLogController.createHealthLog);

module.exports = router;
