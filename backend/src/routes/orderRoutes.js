const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');
const paymentController = require('../controllers/paymentController');

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
 *             required: [horseIds, departureId, scheduleRevision]
 *             properties:
 *               horseIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               departureId:
 *                 type: string
 *                 description: Exact departure ID returned by GET /transport-schedules
 *               scheduleRevision:
 *                 type: integer
 *                 description: Revision returned by the schedule catalog
 *               specialRequirements:
 *                 type: string
 *               addOnIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [ENHANCED_INSURANCE, DEDICATED_ATTENDANT, PREMIUM_STALL]
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
router.patch('/:id/cancel', protect, orderController.cancelOrder);

/**
 * @swagger
 * /orders/{id}/payments/vnpay:
 *   post:
 *     summary: Create a VNPAY payment URL for an approved order
 *     tags: [Booking Orders]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201: { description: VNPAY payment URL created }
 *       400: { description: Order is not payable }
 */
router.post('/:id/payments/vnpay', protect, checkPermission('booking:create'), paymentController.createVnpayPayment);

module.exports = router;
