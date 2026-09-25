const TransportSchedule = require('../models/TransportSchedule');
const { STOPS, DEFAULT_RULES, TIME_SLOTS, BOOKING_WINDOW_DAYS, MIN_NOTICE_HOURS } = require('../config/transportCatalog');

const stopById = (id) => STOPS.find((stop) => stop.id === id);
const scheduleError = (message, status = 400) => Object.assign(new Error(message), { status });
const localDate = (now, stop) => new Intl.DateTimeFormat('en-CA', { timeZone: stop.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

async function getConfiguration() {
  const saved = await TransportSchedule.findById('fixed-network').lean();
  if (!saved) return { revision: 0, rules: DEFAULT_RULES };
  return {
    ...saved,
    rules: saved.rules.map((rule) => ({
      ...rule,
      basePriceVnd: rule.basePriceVnd ?? DEFAULT_RULES.find((item) => item.originStopId === rule.originStopId && item.destinationStopId === rule.destinationStopId)?.basePriceVnd
    }))
  };
}

function validateRules(rules) {
  if (!Array.isArray(rules) || rules.length > STOPS.length * (STOPS.length - 1)) throw scheduleError('Danh sách tuyến không hợp lệ.');
  const seen = new Set();
  return rules.map((rule) => {
    if (!rule || !stopById(rule.originStopId) || !stopById(rule.destinationStopId) || rule.originStopId === rule.destinationStopId) throw scheduleError('Chọn hai điểm cố định khác nhau cho mỗi tuyến.');
    const key = `${rule.originStopId}:${rule.destinationStopId}`;
    if (seen.has(key)) throw scheduleError('Mỗi chiều tuyến chỉ được cấu hình một lần.');
    seen.add(key);
    if (!Array.isArray(rule.weekdays) || !rule.weekdays.length || rule.weekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6) || new Set(rule.weekdays).size !== rule.weekdays.length) throw scheduleError('Chọn các ngày trong tuần hợp lệ.');
    if (!Array.isArray(rule.times) || !rule.times.length || rule.times.some((time) => !TIME_SLOTS.includes(time)) || new Set(rule.times).size !== rule.times.length) throw scheduleError('Chỉ được chọn khung giờ 08:00 hoặc 14:00.');
    if (!Number.isSafeInteger(rule.basePriceVnd) || rule.basePriceVnd <= 0) throw scheduleError('Giá tuyến phải là số nguyên dương theo VND.');
    if (typeof rule.active !== 'boolean') throw scheduleError('Trạng thái tuyến không hợp lệ.');
    return { originStopId: rule.originStopId, destinationStopId: rule.destinationStopId, weekdays: [...rule.weekdays].sort(), times: [...rule.times].sort(), basePriceVnd: rule.basePriceVnd, active: rule.active };
  });
}

function generateDepartures(configuration, now = new Date()) {
  const departures = [];
  const earliest = now.getTime() + MIN_NOTICE_HOURS * 3600000;
  for (const rule of configuration.rules) {
    if (!rule.active) continue;
    const origin = stopById(rule.originStopId);
    const destination = stopById(rule.destinationStopId);
    if (!origin || !destination) continue;
    const start = new Date(`${localDate(now, origin)}T00:00:00Z`);
    for (let day = 0; day < BOOKING_WINDOW_DAYS; day++) {
      const date = new Date(start.getTime() + day * 86400000);
      if (!rule.weekdays.includes(date.getUTCDay())) continue;
      const departureLocalDate = date.toISOString().slice(0, 10);
      for (const departureLocalTime of rule.times) {
        const departureAt = new Date(`${departureLocalDate}T${departureLocalTime}:00${origin.utcOffset}`);
        if (departureAt.getTime() < earliest) continue;
        departures.push({
          id: `${origin.id}_${destination.id}_${departureLocalDate}_${departureLocalTime.replace(':', '')}`,
          originStopId: origin.id, destinationStopId: destination.id,
          departureAt: departureAt.toISOString(), departureLocalDate, departureLocalTime,
          timeZone: origin.timeZone, utcOffset: origin.utcOffset,
          basePriceVnd: rule.basePriceVnd
        });
      }
    }
  }
  return departures.sort((a, b) => a.departureAt.localeCompare(b.departureAt) || a.id.localeCompare(b.id));
}

async function resolveDeparture(departureId, revision, now = new Date()) {
  if (typeof departureId !== 'string' || !Number.isInteger(revision)) throw scheduleError('Vui lòng chọn một chuyến từ lịch vận chuyển cố định.');
  const configuration = await getConfiguration();
  if (configuration.revision !== revision) throw scheduleError('Lịch vận chuyển vừa thay đổi. Vui lòng tải lại và chọn chuyến.', 409);
  const departure = generateDepartures(configuration, now).find((item) => item.id === departureId);
  if (!departure) throw scheduleError('Chuyến không mở đặt, đã đóng nhận đơn hoặc không thuộc lịch cố định.', 409);
  const location = (stop) => ({ address: `${stop.name}, ${stop.countryCode}`, countryCode: stop.countryCode, coordinates: [...stop.coordinates] });
  return {
    departureId: departure.id,
    scheduleRevision: revision,
    originStopId: departure.originStopId,
    destinationStopId: departure.destinationStopId,
    origin: location(stopById(departure.originStopId)),
    destination: location(stopById(departure.destinationStopId)),
    requestedDepartureDate: departure.departureAt,
    departureLocalDate: departure.departureLocalDate,
    departureLocalTime: departure.departureLocalTime,
    departureTimezone: departure.timeZone,
    basePriceVnd: departure.basePriceVnd
  };
}

module.exports = { getConfiguration, validateRules, generateDepartures, resolveDeparture };
