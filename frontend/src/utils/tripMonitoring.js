export const idOf = value => String(value?._id || value?.id || value || '');
export const activeTrip = route => ['IN_TRANSIT', 'INCIDENT_HANDLING', 'DELIVERING'].includes(route.status);
export function tripAlerts(route, order, now = Date.now()) {
  if (['COMPLETED', 'CANCELLED'].includes(route.status)) return [];
  const alerts = [];
  if (route.status === 'INCIDENT_HANDLING' || route.rescuePending) alerts.push('Đang xử lý sự cố');
  const departure = Date.parse(order.requestedDepartureDate);
  if (route.status === 'SCHEDULED' && !route.acceptedAt && Number.isFinite(departure) && departure <= now + 2 * 3600000) alerts.push(departure < now ? 'Quá giờ, tài xế chưa nhận' : 'Sắp khởi hành, tài xế chưa nhận');
  if (!route.driverId || !route.escortId) alerts.push('Thiếu nhân sự');
  return alerts;
}
export function filterTrips(rows, filter, search, now = Date.now()) {
  const normalize = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
  return rows.filter(({route, order, alerts}) => {
    const matches = filter === 'ALL' || (filter === 'ACTIVE' && activeTrip(route)) || (filter === 'UPCOMING' && route.status === 'SCHEDULED') || (filter === 'ATTENTION' && alerts.length > 0) || (filter === 'COMPLETED' && route.status === 'COMPLETED') || (filter === 'TODAY' && order.requestedDepartureDate && new Date(order.requestedDepartureDate).toLocaleDateString('en-CA',{timeZone:order.departureTimezone || 'Asia/Ho_Chi_Minh'}) === new Date(now).toLocaleDateString('en-CA',{timeZone:order.departureTimezone || 'Asia/Ho_Chi_Minh'}));
    return matches && normalize([order.bookingCode, order.customerId?.fullName, order.origin?.address, order.destination?.address, route.vehiclePlateNumber, route.driverId?.fullName, route.escortId?.fullName, ...(order.horseIds || []).map(h=>h.name)].join(' ')).includes(normalize(search));
  });
}

export function lastCheckin(route) { return [...(route.waypoints || [])].filter(w=>w.status==='ARRIVED' && w.actualArrival).sort((a,b)=>Date.parse(b.actualArrival)-Date.parse(a.actualArrival))[0]; }
