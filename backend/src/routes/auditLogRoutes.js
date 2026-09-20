const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Audit Logs
 *   description: System Audit Log & Trail Query APIs
 */

/**
 * @swagger
 * /audit-logs:
 *   get:
 *     summary: Query & filter system audit logs (Logistics Manager - audit:view)
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: actorId
 *         schema: { type: string }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: result
 *         schema: { type: string, enum: [SUCCESS, FAILURE, DENIED] }
 *       - in: query
 *         name: resource
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Paginated audit log records
 */
router.get('/', protect, checkPermission('audit:view'), auditLogController.getAuditLogs);

module.exports = router;
