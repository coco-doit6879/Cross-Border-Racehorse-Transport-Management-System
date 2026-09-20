const express = require('express');
const router = express.Router();
const horseController = require('../controllers/horseController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Horses
 *   description: Racehorse Profile & Passport Management APIs
 */

/**
 * @swagger
 * /horses:
 *   get:
 *     summary: Get list of racehorses (Filterable by owner)
 *     tags: [Horses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of racehorse profiles retrieved successfully
 *   post:
 *     summary: Create new racehorse profile (Microchip ISO 11784/11785)
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
 *         description: Racehorse profile created successfully
 */
router.route('/')
  .get(protect, checkPermission('horse:create_own'), horseController.getHorses)
  .post(protect, checkPermission('horse:create_own'), horseController.createHorse);

/**
 * @swagger
 * /horses/{id}:
 *   get:
 *     summary: Get single racehorse details by ID
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
 *         description: Racehorse details
 *   put:
 *     summary: Update racehorse profile
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
 *         description: Racehorse profile updated successfully
 */
router.route('/:id')
  .get(protect, checkPermission('horse:create_own'), horseController.getHorseById)
  .put(protect, checkPermission('horse:create_own'), horseController.updateHorse);

module.exports = router;
