const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User Management & Administration APIs
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (filterable by role & search)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter users by role (e.g., DRIVER_ESCORT, CUSTOMER)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or phone
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *   post:
 *     summary: Create a new user account (Manager creation)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, email]
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [LOGISTICS_MANAGER, TRANSPORT_SPECIALIST, ROUTE_COORDINATOR, DRIVER_ESCORT, CUSTOMER]
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 */
router.route('/')
  .get(protect, checkPermission('user:manage'), userController.getUsers)
  .post(protect, checkPermission('user:manage'), userController.createUser);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get single user details by ID
 *     tags: [Users]
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
 *         description: User details
 *       404:
 *         description: User not found
 *   put:
 *     summary: Update user details
 *     tags: [Users]
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
 *         description: User updated successfully
 *   delete:
 *     summary: Delete user account
 *     tags: [Users]
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
 *         description: User deleted successfully
 */
router.route('/:id')
  .get(protect, checkPermission('user:manage'), userController.getUserById)
  .put(protect, checkPermission('user:manage'), userController.updateUser)
  .delete(protect, checkPermission('user:manage'), userController.deleteUser);

module.exports = router;
