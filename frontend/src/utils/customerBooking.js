export const BOOKING_STEPS = ['Chuyến đi', 'Chọn ngựa', 'Dịch vụ & bảo hiểm', 'Xác nhận & gửi'];
export const emptyContact = () => ({ fullName: '', phone: '', area: '', address: '', identityNumber: '' });

export function bookingRoutes(catalog, type, originCountry, destinationCountry, originStopId) {
  const stops = catalog?.stops || [];
  const byId = (id) => stops.find(stop => stop.id === id);
  const rules = (catalog?.rules || []).filter(rule => {
    const origin = byId(rule.originStopId), destination = byId(rule.destinationStopId);
    if (!rule.active || !origin || !destination) return false;
    return type === 'domestic' ? origin.countryCode === 'VN' && destination.countryCode === 'VN' : type === 'international' ? origin.countryCode !== destination.countryCode : false;
  });
  return {
    rules,
    originCountries: (catalog?.countries || []).filter(country => rules.some(rule => byId(rule.originStopId)?.countryCode === country.code)),
    destinationCountries: (catalog?.countries || []).filter(country => rules.some(rule => byId(rule.originStopId)?.countryCode === originCountry && byId(rule.destinationStopId)?.countryCode === country.code)),
    origins: stops.filter(stop => stop.countryCode === originCountry && rules.some(rule => rule.originStopId === stop.id && (!destinationCountry || byId(rule.destinationStopId)?.countryCode === destinationCountry))),
    destinations: stops.filter(stop => stop.countryCode === destinationCountry && rules.some(rule => rule.originStopId === originStopId && rule.destinationStopId === stop.id)),
  };
}

export function horseBookingIssue(horse, originStopId, orders, now = Date.now()) {
  if (!originStopId) return 'Chọn điểm đón trước';
  if (!horse.currentStopId) return 'Chưa khai báo địa điểm hiện tại';
  if (horse.currentStopId !== originStopId) return 'Ngựa đang ở điểm khác với điểm đón';
  if (horse.reviewStatus !== 'APPROVED') return 'Hồ sơ sức khỏe chưa được duyệt';
  if (horse.status === 'IN_TRANSIT') return 'Ngựa đang vận chuyển';
  const busy = orders.some(order => {
    if (!['PENDING_APPROVAL','APPROVED','DOCS_PROCESSING','CLEARED_FOR_TRANSPORT','IN_TRANSIT','DELIVERING'].includes(order.status)) return false;
    if (order.depositRequired && order.depositStatus === 'UNPAID' && order.depositDueAt && new Date(order.depositDueAt).getTime() <= now) return false;
    return (order.horseIds || []).some(id => String(typeof id === 'object' ? id._id || id.id : id) === String(horse.id || horse._id));
  });
  return busy ? 'Ngựa đang có đơn vận chuyển' : '';
}

export function bookingTotal(departure, horseCount, addOns, depositPercent) {
  const base = (departure?.basePriceVnd || 0) * horseCount;
  const services = addOns.reduce((total, item) => total + item.unitPriceVnd * (item.pricingMode === 'PER_HORSE' ? horseCount : 1), 0);
  const total = base + services;
  const deposit = Math.min(total, Math.ceil((total * depositPercent / 100) / 1000) * 1000);
  return { base, services, total, deposit };
}
