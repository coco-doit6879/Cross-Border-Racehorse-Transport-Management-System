const Order = require('../models/Order');
const Route = require('../models/TransportRoute');
module.exports = async (_req, res, next) => {
  try {
    for (const [model, terminal, keys] of [[Order, ['COMPLETED', 'CANCELLED', 'REJECTED'], ['horseIds']], [Route, ['COMPLETED', 'CANCELLED'], ['vehicleId', 'driverId', 'escortId']]]) {
      if (await model.exists({ status: { $nin: terminal }, activeReservation: { $ne: true } })) return res.status(503).json({ message: 'Cần nâng cấp dữ liệu giữ chỗ trước khi nhận đơn/phân công mới. Chạy kiểm tra reservation migration.' });
      const indexes = await model.collection.indexes();
      if (keys.some(key => !indexes.some(index => index.name === `active_${key}_reservation` && index.unique))) return res.status(503).json({ message: 'Chỉ mục chống đặt trùng chưa sẵn sàng. Liên hệ quản trị hệ thống.' });
    }
    next();
  } catch (error) { next(error); }
};
