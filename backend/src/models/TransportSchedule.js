const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  originStopId: { type: String, required: true },
  destinationStopId: { type: String, required: true },
  weekdays: [{ type: Number, min: 0, max: 6 }],
  times: [String],
  basePriceVnd: { type: Number, min: 0 },
  active: { type: Boolean, default: true }
}, { _id: false });

module.exports = mongoose.model('TransportSchedule', new mongoose.Schema({
  _id: { type: String, default: 'fixed-network' },
  revision: { type: Number, required: true },
  rules: [ruleSchema],
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true }));
