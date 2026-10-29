const approved = order => ['APPROVED', 'DOCS_PROCESSING', 'CLEARED_FOR_TRANSPORT'].includes(order.status);
function approvalProblem(order) {
  if (order.status !== 'PENDING_APPROVAL') return 'Đơn không còn chờ duyệt.';
  if (order.depositStatus !== 'PAID') return 'Khách hàng cần thanh toán tiền cọc trước khi quản lý duyệt đơn.';
  if (['PENDING', 'CHANGES_REQUESTED'].includes(order.customerConfirmation)) return 'Khách hàng cần xác nhận thông tin đơn.';
  if (!order.horseIds?.length || order.horseIds.some(h => h.reviewStatus !== 'APPROVED')) return 'Hồ sơ ngựa cần được kiểm dịch viên duyệt trước.';
  return null;
}
function planningProblem(order) {
  if (!approved(order)) return 'Quản lý cần duyệt đơn vận chuyển trước.';
  if (order.paymentStatus !== 'PAID') return 'Khách hàng cần thanh toán đủ trước khi điều phối xe và lộ trình.';
  if (order.preparation?.confirmedAt) return 'Xe và lộ trình đã xác nhận; chỉ xác nhận một lần.';
  return null;
}
function crewProblem(order) {
  if (!approved(order) || order.paymentStatus !== 'PAID') return 'Đơn phải được duyệt và thanh toán đủ trước khi phân công kíp xe.';
  if (!order.preparation?.confirmedAt) return 'Điều phối cần xác nhận xe và lộ trình trước.';
  if (order.preparation?.assignedAt) return 'Đơn đã được phân công tài xế và phụ xe.';
  return null;
}
function waypointsFor(order) {
  const plan = order.preparation.plan;
  const stops = plan.restStops || [];
  let cursor = new Date(order.requestedDepartureDate).getTime();
  const points = [{ name: order.origin.address, type: 'PICKUP', coordinates: order.origin.coordinates }, ...stops.map(s => ({ ...s, type: s.type === 'BORDER_CUSTOMS' ? 'BORDER_CUSTOMS' : 'REST_STOP' })), { name: order.destination.address, type: 'DELIVERY', coordinates: order.destination.coordinates }];
  return points.map((p, i) => {
    if (i) cursor += (plan.road?.legs?.[i - 1]?.driveHours || 0) * 3600000 + (i > 1 ? stops[i - 2].minutes * 60000 : 0);
    return { sequence: i + 1, name: p.name, type: p.type, countryCode: p.countryCode, location: { type: 'Point', coordinates: p.coordinates }, estimatedArrival: new Date(cursor), status: 'PENDING' };
  });
}
module.exports = { approved, approvalProblem, planningProblem, crewProblem, waypointsFor };
