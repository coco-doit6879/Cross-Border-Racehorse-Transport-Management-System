const { test } = require('node:test');
const assert = require('node:assert/strict');
const service = require('../src/services/transportScheduleService');
const { STOPS, DEFAULT_RULES, TIME_SLOTS, MIN_NOTICE_HOURS } = require('../src/config/transportCatalog');
const { ROLE_PERMISSIONS } = require('../src/utils/constants');
const TransportSchedule = require('../src/models/TransportSchedule');
const Order = require('../src/models/Order');
const Horse = require('../src/models/Horse');
const User = require('../src/models/User');
const AuditLog = require('../src/models/AuditLog');
const orders = require('../src/controllers/orderController');
const controller = require('../src/controllers/transportScheduleController');
const horseLocationService = require('../src/services/horseLocationService');
const orderPricingService = require('../src/services/orderPricingService');
const express = require('express');
const jwt = require('jsonwebtoken');
const now = new Date('2026-09-20T00:00:00Z');
const config = { revision: 0, rules: DEFAULT_RULES };
const actor = '111111111111111111111111';
const horseId = '333333333333333333333333';
const req = (body) => ({ body, user: { _id: actor }, ip: '127.0.0.1', get: () => 'test' });
async function call(fn, request) {
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await fn(request, res, (err) => { throw err; });
  return res;
}
const mockConfiguration = (t, value = config) => t.mock.method(TransportSchedule, 'findById', () => ({ lean: async () => value }));

test('initial network has 1–3 fixed stops per country and valid unique routes', () => {
  for (const country of ['VN', 'TH', 'KH', 'SG']) {
    const count = STOPS.filter((stop) => stop.countryCode === country).length;
    assert.ok(count >= 1 && count <= 3);
  }
  assert.equal(service.validateRules(DEFAULT_RULES).length, DEFAULT_RULES.length);
});
test('only fleet coordinator role owns fixed schedule management', () => {
  assert.ok(ROLE_PERMISSIONS.FLEET_COORDINATOR.includes('schedule:manage'));
  assert.ok(!ROLE_PERMISSIONS.LOGISTICS_MANAGER.includes('schedule:manage'));
  assert.ok(!ROLE_PERMISSIONS.TRANSPORT_SPECIALIST.includes('schedule:manage'));
});
test('reject arbitrary stops, same-stop trips, duplicated routes and unlisted hours', () => {
  const valid = DEFAULT_RULES[0];
  for (const changed of [{ originStopId: 'CUSTOM-ADDRESS' }, { destinationStopId: valid.originStopId }, { times: ['09:30'] }, { weekdays: [] }, { weekdays: [7] }, { weekdays: [1, 1] }, { active: 'true' }]) assert.throws(() => service.validateRules([{ ...valid, ...changed }]));
  assert.throws(() => service.validateRules([valid, valid]));
});
test('only configured weekdays and hours appear, with 24-hour cutoff and bounded horizon', () => {
  const departures = service.generateDepartures(config, now);
  assert.ok(departures.length > 0);
  for (const departure of departures) {
    const rule = DEFAULT_RULES.find((r) => r.originStopId === departure.originStopId && r.destinationStopId === departure.destinationStopId);
    assert.ok(rule.weekdays.includes(new Date(`${departure.departureLocalDate}T00:00:00Z`).getUTCDay()));
    assert.ok(TIME_SLOTS.includes(departure.departureLocalTime));
    assert.ok(new Date(departure.departureAt) >= new Date(now.getTime() + MIN_NOTICE_HOURS * 3600000));
    assert.ok(new Date(departure.departureAt) < new Date(now.getTime() + 28 * 86400000));
  }
  assert.equal(new Set(departures.map((d) => d.id)).size, departures.length);
});
test('Singapore and Vietnam departure times use local UTC offsets independent of server timezone', () => {
  const configuration = { rules: [
    { originStopId: 'SG-SIN', destinationStopId: 'VN-HCM', weekdays: [1], times: ['08:00'], active: true },
    { originStopId: 'VN-HCM', destinationStopId: 'SG-SIN', weekdays: [1], times: ['08:00'], active: true }
  ] };
  const departures = service.generateDepartures(configuration, now);
  assert.equal(departures.find((d) => d.originStopId === 'SG-SIN').departureAt, '2026-09-21T00:00:00.000Z');
  assert.equal(departures.find((d) => d.originStopId === 'VN-HCM').departureAt, '2026-09-21T01:00:00.000Z');
});
test('disabled routes and completely closed network produce no bookable trips', () => {
  assert.deepEqual(service.generateDepartures({ rules: DEFAULT_RULES.map((rule) => ({ ...rule, active: false })) }, now), []);
  assert.deepEqual(service.generateDepartures({ rules: [] }, now), []);
});
test('resolveDeparture rejects free-form dates, obsolete revision, unknown and expired trip IDs', async (t) => {
  mockConfiguration(t);
  const valid = service.generateDepartures(config, now)[0];
  const result = await service.resolveDeparture(valid.id, 0, now);
  assert.equal(result.requestedDepartureDate, valid.departureAt);
  assert.equal(result.originStopId, valid.originStopId);
  assert.ok(result.origin.coordinates.length === 2);
  for (const args of [[undefined, 0], [valid.id, undefined], [valid.id, 9], ['custom-date-2030', 0]]) await assert.rejects(() => service.resolveDeparture(...args, now));
  await assert.rejects(() => service.resolveDeparture(valid.id, 0, new Date(valid.departureAt)));
});
test('booking rejects caller-supplied location/date overrides even alongside a valid trip selection', async () => {
  for (const field of ['origin', 'destination', 'requestedDepartureDate', 'departureDate', 'departureTime']) {
    const response = await call(orders.createOrder, req({ horseIds: [horseId], departureId: 'test', scheduleRevision: 0, [field]: 'arbitrary' }));
    assert.equal(response.statusCode, 400);
    assert.match(response.body.message, /tự nhập/);
  }
});
test('booking persists canonical stops and full timestamp from published schedule', async (t) => {
  mockConfiguration(t);
  const departure = service.generateDepartures(config)[0];
  t.mock.method(Horse, 'find', async () => [{ _id: horseId, reviewStatus: 'APPROVED', currentStopId: departure.originStopId }]);
  t.mock.method(Order, 'countDocuments', async () => 0);
  t.mock.method(Order, 'findOne', async () => null);
  t.mock.method(Order, 'create', async (data) => ({ ...data, _id: '444444444444444444444444' }));
  t.mock.method(AuditLog, 'create', async () => ({}));
  const response = await call(orders.createOrder, req({ horseIds: [horseId], departureId: departure.id, scheduleRevision: 0 }));
  assert.equal(response.statusCode, 201);
  const saved = response.body.data;
  assert.equal(saved.requestedDepartureDate, departure.departureAt);
  assert.equal(saved.departureLocalTime, departure.departureLocalTime);
  assert.equal(saved.departureTimezone, departure.timeZone);
  assert.deepEqual(saved.origin.coordinates, STOPS.find((s) => s.id === departure.originStopId).coordinates);
  assert.equal(saved.pricing.routeBaseUnitPriceVnd, departure.basePriceVnd);
  assert.equal(saved.pricing.totalAmountVnd, departure.basePriceVnd);
  assert.equal(saved.paymentStatus, 'UNPAID');
});

test('server calculates route and optional service prices without trusting client totals', () => {
  const pricing = orderPricingService.calculatePricing({ basePriceVnd: 9000000, horseCount: 2, addOnIds: ['ENHANCED_INSURANCE', 'DEDICATED_ATTENDANT'] });
  assert.equal(pricing.baseAmountVnd, 18000000);
  assert.equal(pricing.addOnsAmountVnd, 7000000);
  assert.equal(pricing.totalAmountVnd, 25000000);
  assert.equal(pricing.addOns[0].quantity, 2);
  assert.equal(pricing.addOns[1].quantity, 1);
  assert.throws(() => orderPricingService.calculatePricing({ basePriceVnd: 9000000, horseCount: 1, addOnIds: ['UNKNOWN'] }), /không còn được cung cấp/);
  assert.throws(() => orderPricingService.calculatePricing({ basePriceVnd: 9000000, horseCount: 1, addOnIds: ['PREMIUM_STALL', 'PREMIUM_STALL'] }), /không hợp lệ/);
});

test('booking rejects horses whose current fixed stop differs from pickup stop', async (t) => {
  mockConfiguration(t);
  const departure = service.generateDepartures(config)[0];
  t.mock.method(Horse, 'find', async () => [{ _id: horseId, reviewStatus: 'APPROVED', currentStopId: departure.destinationStopId }]);
  const response = await call(orders.createOrder, req({ horseIds: [horseId], departureId: departure.id, scheduleRevision: 0 }));
  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /phải đang ở điểm đón/);
});

test('trip completion moves every order horse to the fixed destination stop', async (t) => {
  let query, update;
  t.mock.method(Horse, 'updateMany', async (q, u) => { query = q; update = u; });
  await horseLocationService.moveOrderHorsesToDestination({ horseIds: [horseId, '444444444444444444444444'], destinationStopId: 'TH-BKK' });
  assert.deepEqual(query._id.$in, [horseId, '444444444444444444444444']);
  assert.equal(update.$set.currentStopId, 'TH-BKK');
});
test('management update uses version check, stores normalized rules and preserves existing orders', async (t) => {
  mockConfiguration(t);
  let query, update;
  t.mock.method(TransportSchedule, 'findOneAndUpdate', async (q, u) => { query = q; update = u; return { revision: 1, rules: u.$set.rules }; });
  t.mock.method(AuditLog, 'create', async () => ({}));
  const response = await call(controller.updateSchedule, req({ revision: 0, rules: [{ ...DEFAULT_RULES[0], weekdays: [5, 1, 3], times: ['14:00', '08:00'] }] }));
  assert.equal(response.statusCode, 200); assert.equal(query.revision, 0); assert.equal(update.$inc.revision, 1);
  assert.deepEqual(response.body.data.rules[0].weekdays, [1, 3, 5]);
  assert.equal((await call(controller.updateSchedule, req({ revision: 4, rules: DEFAULT_RULES }))).statusCode, 409);
});
test('concurrent manager updates return a conflict rather than overwrite', async (t) => {
  mockConfiguration(t, { ...config, revision: 1 });
  t.mock.method(TransportSchedule, 'findOneAndUpdate', async () => null);
  assert.equal((await call(controller.updateSchedule, req({ revision: 1, rules: DEFAULT_RULES }))).statusCode, 409);
});
test('customer can read fixed schedules but cannot change them; unauthenticated access is rejected', async (t) => {
  mockConfiguration(t);
  t.mock.method(User, 'findById', () => ({ select: async () => ({ _id: actor, role: 'CUSTOMER', isActive: true }) }));
  t.mock.method(AuditLog, 'create', async () => ({}));
  const app = express(); app.use(express.json()); app.use('/schedules', require('../src/routes/transportScheduleRoutes'));
  const server = app.listen(0, '127.0.0.1'); await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/schedules`;
  const headers = { Authorization: `Bearer ${jwt.sign({ id: actor }, process.env.JWT_SECRET || 'cbrt_super_secret_jwt_key_2026')}`, 'Content-Type': 'application/json' };
  assert.equal((await fetch(url)).status, 401);
  const read = await fetch(url, { headers });
  assert.equal(read.status, 200); assert.equal((await read.json()).data.stops.length, 8);
  assert.equal((await fetch(url, { method: 'PUT', headers, body: JSON.stringify(config) })).status, 403);
});
