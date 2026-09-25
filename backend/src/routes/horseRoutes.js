const express = require('express');
const router = express.Router();
const controller = require('../controllers/horseController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Horses
 *   description: Horse identity evidence and health review
 * /horses:
 *   get:
 *     summary: List owned horses or all horses for authorized reviewers/managers
 *     tags: [Horses]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Horse profiles }
 *   post:
 *     summary: Submit complete horse profile for health review
 *     tags: [Horses]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Horse'
 *     responses:
 *       201: { description: Created with PENDING_REVIEW status }
 * /horses/{id}:
 *   parameters:
 *     - { in: path, name: id, required: true, schema: { type: string } }
 *   get:
 *     summary: Read horse profile and review history
 *     tags: [Horses]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Horse profile }
 *   put:
 *     summary: Owner updates profile and resubmits for health review
 *     tags: [Horses]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Horse'
 *     responses:
 *       200: { description: Updated with PENDING_REVIEW status }
 * /horses/{id}/review:
 *   post:
 *     summary: Transport Specialist approves or rejects a horse health profile
 *     tags: [Horses]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [decision, notes, profileVersion]
 *             properties:
 *               decision: { type: string, enum: [APPROVED, REJECTED] }
 *               notes: { type: string }
 *               profileVersion: { type: integer }
 *     responses:
 *       200: { description: Review recorded }
 *       409: { description: Profile changed or already reviewed }
 */

router.use(protect);
const allow = (...permissions) => (req, res, next) => {
  if (permissions.some((p) => req.user.effectivePermissions?.includes(p))) return next();
  return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập hồ sơ ngựa.' });
};
const read = allow('horse:create_own', 'horse:manage_all', 'horse:review_health');
const edit = allow('horse:create_own', 'horse:manage_all');
router.post('/files', edit, express.raw({ type: ['image/jpeg', 'image/png', 'application/pdf'], limit: '5mb' }), controller.uploadFile);
router.get('/files/:fileId', read, controller.getFile);
router.get('/', read, controller.getHorses);
router.post('/', edit, controller.createHorse);
router.get('/:id', read, controller.getHorseById);
router.put('/:id', edit, controller.updateHorse);
router.post('/:id/review', checkPermission('horse:review_health'), controller.reviewHorse);

router.use((error, req, res, next) => {
  if (error.type === 'entity.too.large') return res.status(413).json({ success: false, message: 'Tệp vượt quá giới hạn 5 MB.' });
  if (error.code === 11000) return res.status(409).json({ success: false, message: 'Mã vi chip hoặc số hộ chiếu đã được đăng ký.' });
  if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ success: false, message: 'Thông tin hồ sơ không hợp lệ.' });
  next(error);
});

module.exports = router;
