const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, authorize } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Transport Request & Order Lifecycle APIs
 */

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get transport order requests list
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of orders
 *   post:
 *     summary: Create a new transport order request
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [origin, destination, horses]
 *             properties:
 *               origin:
 *                 type: string
 *                 example: Kenting Racecourse, SG
 *               destination:
 *                 type: string
 *                 example: Chiba Equestrian Club, JP
 *               horses:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["66e5f1b2c3d4e5f6a7b8c9d1"]
 *     responses:
 *       201:
 *         description: Order created with auto TR-YYYY-XXXX code
 */
router.route('/')
  .get(protect, orderController.getOrders)
  .post(protect, authorize('CUSTOMER', 'LOGISTICS_MANAGER'), orderController.createOrder);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get single order details
 *     tags: [Orders]
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
 *         description: Order detail data
 */
router.route('/:id')
  .get(protect, orderController.getOrderById);

/**
 * @swagger
 * /orders/{id}/status:
 *   patch:
 *     summary: Update order status transition
 *     tags: [Orders]
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
 *                 enum: [PENDING_APPROVAL, APPROVED, REJECTED, DOCS_PROCESSING, CLEARED_FOR_TRANSPORT, IN_TRANSIT, INCIDENT_HANDLING, DELIVERING, COMPLETED]
 *                 example: APPROVED
 *     responses:
 *       200:
 *         description: Order status updated
 */
router.patch('/:id/status', protect, authorize('LOGISTICS_MANAGER', 'TRANSPORT_SPECIALIST', 'ROUTE_COORDINATOR'), orderController.updateOrderStatus);

/**
 * @swagger
 * /orders/{id}/pod:
 *   post:
 *     summary: Digital Proof of Delivery (POD) signature confirmation
 *     tags: [Orders]
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
 *         description: Order marked COMPLETED with POD signature
 */
router.post('/:id/pod', protect, authorize('DRIVER_ESCORT', 'CUSTOMER', 'LOGISTICS_MANAGER'), orderController.signPOD);

module.exports = router;
