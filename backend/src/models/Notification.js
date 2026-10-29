const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventKey: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  webPath: { type: String, required: true },
  mobilePath: String,
  urgent: { type: Boolean, default: false },
  readAt: { type: Date, default: null }
}, { timestamps: true });
schema.index({ recipientId: 1, eventKey: 1 }, { unique: true });
schema.index({ recipientId: 1, _id: -1 });
schema.index({ recipientId: 1, readAt: 1 });
module.exports = mongoose.model('Notification', schema);
