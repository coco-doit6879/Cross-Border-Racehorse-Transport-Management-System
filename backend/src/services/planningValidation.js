const id = value => String(value?._id || value || '');
const active = ['SCHEDULED','IN_TRANSIT','INCIDENT_HANDLING','DELIVERING'];
function resourceIssue(resource, kind, order, orders = [], routes = [], now = Date.now()) {
  if (!resource) return 'Không tìm thấy tài nguyên';
  const date = Math.max(now, new Date(order.requestedDepartureDate).getTime() || now);
  if (kind === 'vehicle') {
    if (resource.status !== 'ACTIVE') return resource.status === 'MAINTENANCE' ? 'Xe đang bảo dưỡng' : 'Xe chưa sẵn sàng';
    if (!resource.registrationExpiresAt || new Date(resource.registrationExpiresAt).getTime() < date) return 'Thiếu hoặc hết hạn giấy đăng ký';
    if (!resource.inspectionExpiresAt || new Date(resource.inspectionExpiresAt).getTime() < date) return 'Thiếu hoặc hết hạn đăng kiểm';
  } else if (!resource.isActive || resource.role !== (kind === 'driver' ? 'DRIVER' : 'ESCORT')) return 'Nhân sự không hoạt động hoặc sai vai trò';
  if (kind !== 'vehicle' && ['RETURNING','ON_DUTY'].includes(resource.operationalStatus)) return resource.operationalStatus === 'RETURNING' ? 'Đang trở về trụ sở' : 'Đang làm nhiệm vụ';
  const field = `${kind}Id`;
  if (routes.some(route => active.includes(route.status) && id(route.orderId) !== id(order) && id(route[field]) === id(resource))) return 'Đang được phân công chuyến khác';
  for (const other of orders) {
    if (id(other) === id(order) || ['CANCELLED','REJECTED','COMPLETED'].includes(other.status) || !other.preparation?.confirmedAt) continue;
    if (Math.abs(new Date(other.requestedDepartureDate) - new Date(order.requestedDepartureDate)) > 72*3600000) continue;
    if ((other.preparation.plan?.vehicles || []).some(slot => id(slot[field]) === id(resource))) return `Trùng phương án ${other.bookingCode}`;
  }
  return '';
}
function validateSlots(order, slots, vehicles, orders, routes) {
  if (!Array.isArray(slots) || !slots.length || slots.length > 20) throw new Error('Chọn ít nhất một xe.');
  const expected = (order.horseIds || []).map(id), horses = [], vehicleIds = [];
  for (const slot of slots) {
    if (!slot || !Array.isArray(slot.horseIds) || !slot.horseIds.length) throw new Error('Mỗi xe cần được xếp ít nhất một ngựa.');
    const vehicle = vehicles.find(item => id(item) === id(slot.vehicleId));
    const issue = resourceIssue(vehicle,'vehicle',order,orders,routes);
    if (issue) throw new Error(issue);
    if (vehicleIds.includes(id(vehicle))) throw new Error('Không thể chọn một xe hai lần.');
    if (slot.horseIds.length > vehicle.capacityHorses) throw new Error('Số ngựa vượt tải trọng khoang xe.');
    vehicleIds.push(id(vehicle));horses.push(...slot.horseIds.map(id));
  }
  if (horses.length !== expected.length || new Set(horses).size !== expected.length || horses.some(h => !expected.includes(h))) throw new Error('Cần xếp đủ mỗi ngựa đúng một lần.');
  return slots.map(slot => ({vehicleId:id(slot.vehicleId),horseIds:slot.horseIds.map(id)}));
}
module.exports = {id,resourceIssue,validateSlots};
