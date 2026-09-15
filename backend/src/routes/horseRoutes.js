const express = require('express');
const router = express.Router();
const horseController = require('../controllers/horseController');
const { protect, authorize } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Horses
 *   description: Horse Digital Passport & Identification APIs
 */

/**
 * @swagger
 * /horses:
 *   get:
 *     summary: Get list of horses
 *     tags: [Horses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of horses
 *   post:
 *     summary: Register a new racehorse profile
 *     tags: [Horses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Horse'
 *     responses:
 *       201:
 *         description: Horse registered successfully
 */
router.route('/')
  .get(protect, horseController.getHorses)
  .post(protect, authorize('CUSTOMER', 'LOGISTICS_MANAGER', 'TRANSPORT_SPECIALIST'), horseController.createHorse);

/**
 * @swagger
 * /horses/{id}:
 *   get:
 *     summary: Get single horse details by ID
 *     tags: [Horses]
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
 *         description: Horse details
 *   put:
 *     summary: Update horse profile details
 *     tags: [Horses]
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
 *         description: Horse updated
 */
router.route('/:id')
  .get(protect, horseController.getHorseById)
  .put(protect, authorize('CUSTOMER', 'LOGISTICS_MANAGER', 'TRANSPORT_SPECIALIST'), horseController.updateHorse);

module.exports = router;
