// Central API Router index
const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const horseRoutes = require('./horseRoutes');
const orderRoutes = require('./orderRoutes');
const complianceRoutes = require('./complianceRoutes');
const routeRoutes = require('./routeRoutes');
const healthLogRoutes = require('./healthLogRoutes');
const incidentRoutes = require('./incidentRoutes');
const podRoutes = require('./podRoutes');
const syncRoutes = require('./syncRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const auditLogRoutes = require('./auditLogRoutes');
const geocodingRoutes = require('./geocodingRoutes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/horses', horseRoutes);
router.use('/orders', orderRoutes);
router.use('/compliance', complianceRoutes);
router.use('/routes', routeRoutes);
router.use('/health-logs', healthLogRoutes);
router.use('/incidents', incidentRoutes);
router.use('/pod', podRoutes);
router.use('/sync', syncRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/geocoding', geocodingRoutes);
router.use('/transport-schedules', require('./transportScheduleRoutes'));

module.exports = router;


