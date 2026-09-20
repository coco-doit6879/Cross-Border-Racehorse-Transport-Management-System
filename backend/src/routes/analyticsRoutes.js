const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Analytics & B2B Reconciliation
 *   description: Operational KPI & B2B Billing Reconciliation Reports APIs
 */

/**
 * @swagger
 * /analytics/kpi:
 *   get:
 *     summary: Get system operational KPI analytics (OTD %, Total Km, SOS & Financials)
 *     tags: [Analytics & B2B Reconciliation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System operational KPI metrics
 */
router.get('/kpi', protect, checkPermission('analytics:view'), analyticsController.getKPIAnalytics);

/**
 * @swagger
 * /analytics/b2b-reconciliation:
 *   get:
 *     summary: Export B2B billing reconciliation report summary & per-booking items
 *     tags: [Analytics & B2B Reconciliation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: customerId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: B2B billing reconciliation report dataset
 */
router.get('/b2b-reconciliation', protect, checkPermission('analytics:view'), analyticsController.getB2BBillingReconciliation);

module.exports = router;
