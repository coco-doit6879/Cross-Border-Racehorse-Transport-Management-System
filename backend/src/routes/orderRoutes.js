const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Booking Orders
 *   description: Transport Booking & Order Approval Workflow APIs
 */

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get all transport booking orders
 *     tags: [Booking Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of transport orders retrieved successfully
 *   post:
 *     summary: Create a new transport booking request (Customer)
 *     tags: [Booking Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [horseIds, origin, destination, requestedDepartureDate]
 *             properties:
 *               horseIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               origin:
 *                 type: object
 *                 properties:
 *                   address: { type: string }
 *                   countryCode: { type: string }
 *                   coordinates: { type: array, items: { type: number }, example: [106.7008, 10.7768] }
 *               destination:
 *                 type: object
 *                 properties:
 *                   address: { type: string }
 *                   countryCode: { type: string }
 *                   coordinates: { type: array, items: { type: number }, example: [103.7712, 1.4243] }
 *               requestedDepartureDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Transport order created in PENDING_APPROVAL status
 */
router.route('/')
  .get(protect, orderController.getOrders)
  .post(protect, checkPermission('booking:create'), orderController.createOrder);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get transport order details by ID
 *     tags: [Booking Orders]
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
 *         description: Order details retrieved successfully
 */
router.route('/:id')
  .get(protect, orderController.getOrderById);

/**
 * @swagger
 * /orders/{id}/status:
 *   patch:
 *     summary: Approve or reject transport order (Manager approval)
 *     tags: [Booking Orders]
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
 *               status:
 *                 type: string
 *                 enum: [APPROVED, REJECTED]
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order status updated successfully
 */
router.patch('/:id/status', protect, checkPermission('booking:approve'), orderController.updateOrderStatus);

module.exports = router;
