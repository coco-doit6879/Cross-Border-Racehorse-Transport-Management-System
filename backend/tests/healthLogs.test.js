const { test } = require('node:test');
const assert = require('node:assert/strict');
const HealthLog = require('../src/models/HealthLog');
const HealthPhoto = require('../src/models/HealthPhoto');
const Route = require('../src/models/TransportRoute');
const Order = require('../src/models/Order');
const notifications = require('../src/services/notifications');
const { recordHealthLog, parsePhoto } = require('../src/services/healthLogs');

const oid = n => n.toString(16).padStart(24, '0');
const jpeg = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]).toString('base64')}`;
const base = { eventId: 'health-1', tripId: oid(1), horseId: oid(2), temperatureCelsius: 38.1, waterIntakeLiters: 12, foodIntakeStatus: 'NORMAL', condition: 'STABLE' };

test('parsePhoto accepts real images and rejects disguised or oversized data', () => {
  assert.equal(parsePhoto(jpeg).mimeType, 'image/jpeg');
  assert.throws(() => parsePhoto('data:image/png;base64,' + Buffer.from('not a png').toString('base64')), /không đúng định dạng/);
  assert.throws(() => parsePhoto('https://example.com/a.jpg'), /JPG, PNG hoặc WebP/);
  const big = Buffer.alloc(1.6 * 1024 * 1024); big[0] = 0xff; big[1] = 0xd8; big[2] = 0xff;
  assert.throws(() => parsePhoto(`data:image/jpeg;base64,${big.toString('base64')}`), /1,5 MB/);
});

test('recordHealthLog stores the photo once, pushes realtime and notifies the customer', async t => {
  const logs = [], photos = [], emitted = [], notified = [];
  const route = { _id: oid(1), orderId: oid(9), driverId: oid(5), escortId: oid(6), status: 'IN_TRANSIT' };
  t.mock.method(Route, 'findById', () => ({ select: async () => route, then: (ok) => ok(route) }));
  t.mock.method(Order, 'findById', async () => ({ horseIds: [oid(2)] }));
  t.mock.method(HealthLog, 'findOne', async ({ eventId }) => logs.find(l => l.eventId === eventId) || null);
  t.mock.method(HealthLog, 'create', async value => { const log = { ...value, _id: oid(50 + logs.length) }; logs.push(log); return log; });
  t.mock.method(HealthLog, 'findById', () => ({ populate: () => ({ lean: async () => ({ horseId: { name: 'Thiên Mã' } }) }) }));
  t.mock.method(HealthPhoto, 'create', async value => { const photo = { ...value, _id: oid(70) }; photos.push(photo); return photo; });
  t.mock.method(notifications, 'orderEvent', async (...args) => { notified.push(args); });
  const req = { user: { _id: oid(6), role: 'ESCORT' }, app: { get: () => ({ to: room => ({ emit: (event, body) => emitted.push({ room, event, body }) }) }) } };

  const first = await recordHealthLog(req, { ...base, photoData: jpeg, notes: 'Vết xước nhẹ' });
  assert.equal(first.isDuplicate, false);
  assert.equal(photos.length, 1);
  assert.equal(String(logs[0].photoId), oid(70));
  assert.deepEqual(emitted[0], { room: `trip_${oid(1)}`, event: 'health:log_created', body: { tripId: oid(1), logId: oid(50) } });
  assert.equal(notified[0][0], 'HEALTH_LOG');
  assert.match(notified[0][3].reason, /Thiên Mã: 38.1 °C.*có ảnh/);

  const retry = await recordHealthLog(req, { ...base, photoData: jpeg });
  assert.equal(retry.isDuplicate, true);
  assert.equal(photos.length, 1, 'a retried offline event must not store a second photo');
  assert.equal(notified.length, 1);
});

test('recordHealthLog rejects unassigned users and impossible readings', async t => {
  const route = { _id: oid(1), orderId: oid(9), driverId: oid(5), escortId: oid(6), status: 'IN_TRANSIT' };
  t.mock.method(Route, 'findById', async () => route);
  t.mock.method(Order, 'findById', async () => ({ horseIds: [oid(2)] }));
  await assert.rejects(recordHealthLog({ user: { _id: oid(99) } }, base), err => err.statusCode === 403);
  await assert.rejects(recordHealthLog({ user: { _id: oid(6) } }, { ...base, temperatureCelsius: 60 }), /30–45/);
  await assert.rejects(recordHealthLog({ user: { _id: oid(6) } }, { ...base, condition: 'FEVER' }), /Thể trạng/);
});
