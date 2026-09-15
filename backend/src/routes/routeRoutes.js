const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');
const { protect, authorize } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Routes
 *   description: Route Dispatch, Waypoints & GPS Realtime Location Tracking APIs
 */

/**
 * @swagger
 * /routes:
 *   get:
 *     summary: Get all active transport routes
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of routes
 *   post:
 *     summary: Create & dispatch a route for an order
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransportRoute'
 *     responses:
 *       201:
 *         description: Route created and dispatched
 */
router.route('/')
  .get(protect, routeController.getRoutes)
  .post(protect, authorize('ROUTE_COORDINATOR', 'LOGISTICS_MANAGER'), routeController.createRoute);

/**
 * @swagger
 * /routes/{id}:
 *   get:
 *     summary: Get single route details
 *     tags: [Routes]
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
 * /routes/{id}/location:
 *   patch:
 *     summary: Update vehicle GPS latitude and longitude
 *     tags: [Routes]
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
 *             required: [latitude, longitude]
 *             properties:
 *               latitude:
 *                 type: number
 *                 example: 1.3644
 *               longitude:
 *                 type: number
 *                 example: 103.9915
 *     responses:
 *       200:
 *         description: GPS coordinates updated
 */
router.patch('/:id/location', protect, authorize('DRIVER_ESCORT', 'ROUTE_COORDINATOR'), routeController.updateRouteLocation);

/**
 * @swagger
 * /routes/{id}/waypoints/{waypointId}/checkin:
 *   post:
 *     summary: Driver check-in at waypoint (ARRIVED / DEPARTED)
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: waypointId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Waypoint check-in updated
 */
router.post('/:id/waypoints/:waypointId/checkin', protect, authorize('DRIVER_ESCORT', 'ROUTE_COORDINATOR'), routeController.checkinWaypoint);

module.exports = router;
