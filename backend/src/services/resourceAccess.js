const Order = require('../models/Order');
const Route = require('../models/TransportRoute');
const staff = user => (user.effectivePermissions || []).some(p => ['booking:approve', 'horse:review_health'].includes(p));
async function accessibleOrders(user) {
  if (staff(user)) return null;
  if (user.role === 'CUSTOMER') return (await Order.find({ customerId: user._id }).select('_id')).map(o => o._id);
  return (await Route.find({ $or: [{ driverId: user._id }, { escortId: user._id }] }).select('orderId')).map(r => r.orderId);
}
async function validateHealthAssignment(user, tripId, horseId) {
  const route = await Route.findById(tripId);
  if (!route || ![String(route.driverId), String(route.escortId)].includes(String(user._id))) throw Object.assign(new Error('Bạn không được phân công chuyến này.'), { statusCode: 403 });
  const order = await Order.findById(route.orderId);
  if (!order?.horseIds.some(h => String(h) === String(horseId))) throw Object.assign(new Error('Ngựa không thuộc chuyến.'), { statusCode: 400 });
  if (!['IN_TRANSIT', 'INCIDENT_HANDLING', 'DELIVERING'].includes(route.status)) throw Object.assign(new Error('Chuyến không còn nhận nhật ký sức khỏe.'), { statusCode: 409 });
}
module.exports = { accessibleOrders, validateHealthAssignment };
