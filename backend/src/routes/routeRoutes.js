const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Transport Routes & Dispatch
 *   description: Route Planning, Vehicle Dispatch & Trip Lifecycle APIs
 */

/**
 * @swagger
 * /routes:
 *   get:
 *     summary: Get all transport routes
 *     tags: [Transport Routes & Dispatch]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of transport routes retrieved successfully
 */
router.route('/')
  .get(protect, routeController.getRoutes);

/**
 * @swagger
 * /routes/dispatch:
 *   post:
 *     summary: Dispatch route and assign vehicle, driver & escort (Coordinator)
 *     tags: [Transport Routes & Dispatch]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, vehiclePlateNumber, driverId, escortId]
 *             properties:
 *               orderId: { type: string }
 *               vehiclePlateNumber: { type: string, example: '51C-987.65' }
 *               driverId: { type: string }
 *               escortId: { type: string }
 *     responses:
 *       201:
 *         description: Route dispatched in SCHEDULED status
 */
router.post('/dispatch', protect, checkPermission('route:dispatch'), routeController.dispatchRoute);

/**
 * @swagger
 * /routes/{id}:
 *   get:
 *     summary: Get single route details by ID
 *     tags: [Transport Routes & Dispatch]
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
 *         description: Route details
 */
router.get('/:id', protect, routeController.getRouteById);

/**
 * @swagger
 * /routes/{id}/status:
 *   patch:
 *     summary: Update trip status lifecycle (IN_TRANSIT, DELIVERING, COMPLETED, CANCELLED)
 *     tags: [Transport Routes & Dispatch]
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
 *               status: { type: string, enum: [IN_TRANSIT, DELIVERING, COMPLETED, CANCELLED] }
 *     responses:
 *       200:
 *         description: Trip status updated successfully
 */
router.patch('/:id/status', protect, routeController.updateTripStatus);

/**
 * @swagger
 * /routes/{id}/waypoint-checkin:
 *   patch:
 *     summary: Check-in at waypoint checkpoint (Driver / Escort one-tap check-in)
 *     tags: [Transport Routes & Dispatch]
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
 *             properties:
 *               sequence: { type: number, example: 1 }
 *               status: { type: string, enum: [ARRIVED, SKIPPED], example: 'ARRIVED' }
 *     responses:
 *       200:
 *         description: Waypoint check-in recorded successfully
 */
router.patch('/:id/waypoint-checkin', protect, checkPermission('waypoint:checkin'), routeController.waypointCheckin);

module.exports = router;
