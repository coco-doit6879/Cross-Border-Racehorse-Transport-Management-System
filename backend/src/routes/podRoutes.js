const express = require('express');
const router = express.Router();
const podController = require('../controllers/podController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Digital Proof of Delivery (POD)
 *   description: Touch Signature & Handover Acceptance APIs
 */

/**
 * @swagger
 * /pod/sign:
 *   post:
 *     summary: Sign Proof of Delivery & complete trip transport
 *     tags: [Digital Proof of Delivery (POD)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tripId, orderId, signerName, signerPhone, signerRole, signatureImageUrl, coordinates]
 *             properties:
 *               tripId: { type: string }
 *               orderId: { type: string }
 *               signerName: { type: string, example: 'John Recipient' }
 *               signerPhone: { type: string, example: '+84900000000' }
 *               signerRole: { type: string, enum: [CUSTOMER, AUTHORIZED_RECIPIENT, STABLE_MANAGER, VETERINARIAN], example: 'AUTHORIZED_RECIPIENT' }
 *               signatureImageUrl: { type: string, example: 'https://cbrt.com/signatures/sig_001.png' }
 *               coordinates: { type: array, items: { type: number }, example: [103.7712, 1.4243] }
 *     responses:
 *       201:
 *         description: POD signed and trip completed successfully
 */
router.post('/sign', protect, checkPermission('pod:sign'), podController.signPOD);

/**
 * @swagger
 * /pod/{tripId}:
 *   get:
 *     summary: Get Proof of Delivery details by tripId
 *     tags: [Digital Proof of Delivery (POD)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: POD details
 */
router.get('/:tripId', protect, podController.getPODByTripId);

module.exports = router;
