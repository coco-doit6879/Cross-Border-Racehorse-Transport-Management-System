const express = require('express');
const router = express.Router();
const complianceController = require('../controllers/complianceController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');

router.get('/', protect, checkPermission('compliance:review'), complianceController.getComplianceDocuments);

/**
 * @swagger
 * tags:
 *   name: Compliance & Customs
 *   description: Equine Quarantine & Customs Permits Checklist APIs
 */

/**
 * @swagger
 * /compliance/checklist/{orderId}:
 *   get:
 *     summary: Get compliance document checklist for a transport order
 *     tags: [Compliance & Customs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Compliance checklist & clearance status
 */
router.get('/checklist/:orderId', protect, checkPermission('compliance:upload'), complianceController.getComplianceChecklist);

/**
 * @swagger
 * /compliance/upload:
 *   post:
 *     summary: Upload scanned compliance certificate or customs permit
 *     tags: [Compliance & Customs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, documentType, countryCode, fileUrl]
 *             properties:
 *               orderId: { type: string }
 *               horseId: { type: string }
 *               documentType: { type: string, example: 'COGGINS_TEST' }
 *               countryCode: { type: string, example: 'VN' }
 *               fileUrl: { type: string, example: 'https://cbrt.com/docs/coggins_cert.pdf' }
 *     responses:
 *       200:
 *         description: Compliance document uploaded to PENDING_REVIEW status
 */
router.post('/upload', protect, checkPermission('compliance:upload'), complianceController.uploadComplianceDoc);

/**
 * @swagger
 * /compliance/{id}/verify:
 *   patch:
 *     summary: Review and approve/reject compliance document (Specialist review)
 *     tags: [Compliance & Customs]
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
 *               status: { type: string, enum: [APPROVED, REJECTED] }
 *               rejectionReason: { type: string }
 *     responses:
 *       200:
 *         description: Document status updated
 */
router.patch('/:id/verify', protect, checkPermission('compliance:review'), complianceController.reviewComplianceDoc);

module.exports = router;
