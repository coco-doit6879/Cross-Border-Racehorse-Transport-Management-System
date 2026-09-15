// Central API Router index
const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const horseRoutes = require('./horseRoutes');
const orderRoutes = require('./orderRoutes');
const routeRoutes = require('./routeRoutes');
const healthLogRoutes = require('./healthLogRoutes');
const incidentRoutes = require('./incidentRoutes');

router.use('/auth', authRoutes);
router.use('/horses', horseRoutes);
router.use('/orders', orderRoutes);
router.use('/routes', routeRoutes);
router.use('/health-logs', healthLogRoutes);
router.use('/incidents', incidentRoutes);

module.exports = router;
