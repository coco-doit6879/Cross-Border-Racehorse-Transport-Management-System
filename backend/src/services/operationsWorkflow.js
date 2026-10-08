const Doc = require('../models/ComplianceDoc');
const { activeIncident, locationProblem } = require('./tripSafety');
const id = value => String(value?._id || value || '');
const has = (user, permission) => (user.effectivePermissions || []).includes(permission);
const staff = user => has(user, 'booking:approve');
const assigned = (route, user) => route && [id(route.driverId), id(route.escortId)].includes(id(user._id));
const canRead = (order, route, user) => id(order.customerId) === id(user._id) || staff(user) || assigned(route, user);

// Existing payments continue to cover the booked fare. Receipts here cover only
// approved post-booking extras, avoiding double counting provider payments.
function financials(order) {
  const base = Number(order.pricing?.totalAmountVnd || 0);
  const extra = (order.settlement?.surcharges || []).filter(x => x.status === 'APPROVED').reduce((s, x) => s + x.amountVnd, 0);
  const basePaid = order.paymentStatus === 'PAID' ? base : ['PAID', 'REFUND_PENDING', 'REFUNDED'].includes(order.depositStatus) ? Number(order.depositAmountVnd || 0) : 0;
  const extrasPaid = (order.settlement?.receipts || []).reduce((s, x) => s + x.amountVnd, 0);
  const executed = (order.exceptionRequests || []).filter(x => x.status === 'EXECUTED');
  const refunded = executed.filter(x => x.kind === 'REFUND').reduce((sum, x) => sum + x.amountVnd, 0);
  const compensated = executed.filter(x => x.kind === 'COMPENSATION').reduce((sum, x) => sum + x.amountVnd, 0);
  return { base, extra, basePaid, extrasPaid, total: base + extra, paid: basePaid + extrasPaid, refunded, compensated, netReceived: basePaid + extrasPaid - refunded - compensated, outstanding: Math.max(0, base + extra - basePaid - extrasPaid) };
}
async function stageReady(orderId, stage, checkpoint) {
  const docs = await Doc.find({ orderId });
  const relevant = docs.filter(d => (d.stage || 'DEPARTURE') === stage && (!checkpoint || !d.checkpoint || d.checkpoint === checkpoint));
  return relevant.length > 0 && relevant
    .every(d => d.status === 'APPROVED' && (!d.expiresAt || new Date(d.expiresAt) >= new Date()));
}
function clearanceReady(route, order, checkpoint) {
  if (order.origin.countryCode === order.destination.countryCode && !checkpoint) return true;
  const latest = new Map();
  for (const c of route.clearances || []) latest.set(`${id(c.horseId)}:${c.countryCode}:${c.checkpoint}`, c);
  const items = [...latest.values()];
  return order.horseIds.every(h => {
    const relevant = items.filter(c => id(c.horseId) === id(h) && (checkpoint ? c.checkpoint === checkpoint : c.countryCode === order.destination.countryCode));
    return relevant.length > 0 && relevant.every(c => c.status === 'CLEARED');
  });
}
async function deliveryProblem(route, order) {
  if (!route || !order) return 'Không tìm thấy chuyến hoặc đơn vận chuyển.';
  if (route.status !== 'DELIVERING') return 'Chuyến chưa ở giai đoạn bàn giao.';
  const positionError = locationProblem(route.currentLocation, order.destination?.coordinates);
  if (positionError) return positionError;
  if (await activeIncident(route._id)) return 'Cần xử lý toàn bộ sự cố trước khi giao nhận.';
  if (route.odometerStart == null || route.odometerEnd == null || route.odometerEnd < route.odometerStart) return 'Cần ghi km đầu và cuối chuyến.';
  if (!order.horseIds.every(h => route.horseMovements?.some(m => id(m.horseId) === id(h) && m.unloadedAt))) return 'Cần xác nhận giao từng con ngựa.';
  if (!clearanceReady(route, order) || !(await stageReady(order._id, 'DELIVERY'))) return 'Chưa hoàn tất hồ sơ thông quan/giao nhận.';
  return null;
}
module.exports = { id, has, staff, assigned, canRead, financials, stageReady, clearanceReady, deliveryProblem };
