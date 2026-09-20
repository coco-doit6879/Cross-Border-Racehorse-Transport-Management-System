const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Offline Sync Engine
 *   description: Mobile SQLite Offline Event Batch Sync APIs
 */

/**
 * @swagger
 * /sync/events:
 *   post:
 *     summary: Batch sync offline mobile events (WAYPOINT_CHECKIN, HEALTH_LOG, SOS_TRIGGER, POD_SIGN)
 *     tags: [Offline Sync Engine]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [events]
 *             properties:
 *               events:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [event_id, event_type, payload]
 *                   properties:
 *                     event_id: { type: string, example: '770e8400-e29b-41d4-a716-446655440002' }
 *                     event_type: { type: string, enum: [WAYPOINT_CHECKIN, HEALTH_LOG, SOS_TRIGGER, POD_SIGN] }
 *                     payload: { type: object }
 *     responses:
 *       200:
 *         description: Batch sync results with atomic per-event status
 */
router.post('/events', protect, checkPermission('sync:offline_events'), syncController.syncOfflineEvents);

module.exports = router;
