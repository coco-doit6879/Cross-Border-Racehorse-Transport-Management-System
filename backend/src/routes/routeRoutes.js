// Transport Route Routes skeleton
const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');

router.get('/', routeController.getRoutes);
router.patch('/:id/location', routeController.updateRouteLocation);

module.exports = router;
