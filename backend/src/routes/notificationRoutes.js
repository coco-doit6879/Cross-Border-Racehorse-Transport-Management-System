const router = require('express').Router();
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { protect } = require('../middlewares/authMiddleware');
router.use(protect);
router.get('/', async (req, res, next) => {
  try {
    if (req.query.before && !mongoose.isValidObjectId(req.query.before)) return res.status(400).json({ message: 'Mốc thông báo không hợp lệ.' });
    const filter = { recipientId: req.user._id };
    const [data, unreadCount] = await Promise.all([
      Notification.find({ ...filter, ...(req.query.before ? { _id: { $lt: req.query.before } } : {}) }).sort({ _id: -1 }).limit(31).lean(),
      Notification.countDocuments({ ...filter, readAt: null })
    ]);
    const hasMore = data.length > 30;
    res.json({ success: true, data: data.slice(0, 30), unreadCount, hasMore });
  } catch (e) { next(e); }
});
router.patch('/read-all', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.body.through)) return res.status(400).json({ message: 'Cần mốc thông báo đang hiển thị.' });
    await Notification.updateMany({ recipientId: req.user._id, readAt: null, _id: { $lte: req.body.through } }, { $set: { readAt: new Date() } });
    res.json({ success: true });
  } catch (e) { next(e); }
});
router.patch('/:id/read', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Thông báo không hợp lệ.' });
    const item = await Notification.findOneAndUpdate({ _id: req.params.id, recipientId: req.user._id }, { $set: { readAt: new Date() } }, { new: true });
    if (!item) return res.status(404).json({ message: 'Không tìm thấy thông báo.' });
    res.json({ success: true, data: item });
  } catch (e) { next(e); }
});
module.exports = router;
