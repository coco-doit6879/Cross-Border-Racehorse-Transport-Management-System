// Horse Routes skeleton
const express = require('express');
const router = express.Router();
const horseController = require('../controllers/horseController');

router.get('/', horseController.getHorses);
router.get('/:id', horseController.getHorseById);
router.post('/', horseController.createHorse);

module.exports = router;
