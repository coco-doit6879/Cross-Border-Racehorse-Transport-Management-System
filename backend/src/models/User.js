// Mongoose User Schema Skeleton
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String },
  email: { type: String, unique: true },
  password: { type: String },
  role: {
    type: String,
    enum: ['LOGISTICS_MANAGER', 'TRANSPORT_SPECIALIST', 'ROUTE_COORDINATOR', 'DRIVER_ESCORT', 'CUSTOMER'],
    default: 'CUSTOMER'
  },
  phone: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
