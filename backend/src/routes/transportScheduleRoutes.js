const express = require('express');
const { protect, checkPermission } = require('../middlewares/authMiddleware');
const controller = require('../controllers/transportScheduleController');
const router = express.Router();

/**
 * @swagger
 * /transport-schedules:
 *   get:
 *     summary: Get fixed stops, weekly rules and open departures for the next 28 days
 *     tags: [Booking Orders]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Catalog with schedule revision, local times and UTC departure timestamps }
 *   put:
 *     summary: Manager publishes weekly departure rules (schedule:manage)
 *     tags: [Booking Orders]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [revision, rules]
 *             properties:
 *               revision: { type: integer }
 *               rules:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [originStopId, destinationStopId, weekdays, times, active]
 *                   properties:
 *                     originStopId: { type: string }
 *                     destinationStopId: { type: string }
 *                     weekdays: { type: array, items: { type: integer, minimum: 0, maximum: 6 } }
 *                     times: { type: array, items: { type: string, enum: ['08:00', '14:00'] } }
 *                     active: { type: boolean }
 *     responses:
 *       200: { description: Published schedule and new revision }
 *       400: { description: Invalid rule or non-fixed location/time }
 *       403: { description: Missing schedule management permission }
 *       409: { description: Another manager changed the schedule }
 */

router.get('/', protect, controller.getCatalog);
router.put('/', protect, checkPermission('schedule:manage'), controller.updateSchedule);

module.exports = router;
