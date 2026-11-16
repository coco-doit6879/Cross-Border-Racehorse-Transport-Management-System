const { test } = require('node:test');
const assert = require('node:assert/strict');
const Route = require('../src/models/TransportRoute');
const Order = require('../src/models/Order');
const Audit = require('../src/models/AuditLog');
const PaymentTransaction = require('../src/models/PaymentTransaction');
const sync = require('../src/controllers/syncController');
const { queueRefund, settleRefundState } = require('../src/services/refundQueue');
const oid = n => String(n).padStart(24, '0');

const driver = { _id: oid(2), role: 'DRIVER', effectivePermissions: ['waypoint:checkin', 'sync:offline_events'] };
const runSync = async events => {
  const res = { code: 200, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } };
  await sync.syncOfflineEvents({ body: { events }, user: driver, ip: '', get: () => '', app: { get: () => null } }, res, e => { throw e; });
  return res.body.data?.results || res.body.results || res.body;
};

test('offline check-in follows live rules: no skipping, order enforced, server time', async t => {
  const start = new Date(Date.now() - 6 * 3600000);
  const route = new Route({ _id: oid(1), orderId: oid(3), driverId: oid(2), escortId: oid(6), vehiclePlateNumber: 'QA', status: 'IN_TRANSIT', tripStartedAt: start, waypoints: [
    { sequence: 1, name: 'Đón', type: 'PICKUP', location: { coordinates: [106.7, 10.7] }, estimatedArrival: start },
    { sequence: 2, name: 'Nghỉ', type: 'REST_STOP', location: { coordinates: [106.9, 10.9] }, estimatedArrival: new Date(start.getTime() + 3600000) },
    { sequence: 3, name: 'Giao', type: 'DELIVERY', location: { coordinates: [107, 11] }, estimatedArrival: new Date(start.getTime() + 7200000) }
  ] });
  route.save = async () => {};
  t.mock.method(Route, 'findById', async () => route);
  t.mock.method(Audit, 'create', async () => ({}));
  const flatten = r => (Array.isArray(r) ? r : r.results || r.data || []);

  let results = flatten(await runSync([{ event_id: 'e1', event_type: 'WAYPOINT_CHECKIN', payload: { tripId: oid(1), sequence: 2 } }]));
  assert.equal(results[0].status, 'FAILURE');
  assert.equal(route.waypoints[1].status, 'PENDING');

  results = flatten(await runSync([{ event_id: 'e2', event_type: 'WAYPOINT_CHECKIN', payload: { tripId: oid(1), sequence: 1, status: 'SKIPPED' } }]));
  assert.equal(results[0].status, 'FAILURE');

  const forged = '2020-01-01T00:00:00Z';
  results = flatten(await runSync([{ event_id: 'e3', event_type: 'WAYPOINT_CHECKIN', payload: { tripId: oid(1), sequence: 1, recordedAt: forged } }]));
  assert.equal(results[0].status, 'SUCCESS');
  assert.ok(new Date(route.waypoints[0].actualArrival) > new Date(forged));
});

test('cancelling a paid order queues an approved refund and settles after execution', async t => {
  t.mock.method(PaymentTransaction, 'find', () => ({ session() { return this; }, then: (ok) => ok([{ amountVnd: 3000000 }, { amountVnd: 7000000 }]) }));
  const order = new Order({ status: 'CANCELLED', depositStatus: 'PAID', paymentStatus: 'PAID' });
  const amount = await queueRefund(order, oid(9), 'Khách hủy');
  assert.equal(amount, 10000000);
  assert.equal(order.depositStatus, 'REFUND_PENDING');
  assert.equal(order.exceptionRequests[0].status, 'APPROVED');
  assert.equal(await queueRefund(order, oid(9), 'Bấm lại'), null, 'no duplicate refund');

  order.exceptionRequests[0].status = 'EXECUTED';
  await settleRefundState(order);
  assert.equal(order.depositStatus, 'REFUNDED');
  assert.equal(order.paymentStatus, 'REFUNDED');
});

test('unpaid order gets no refund item', async t => {
  t.mock.method(PaymentTransaction, 'find', () => ({ session() { return this; }, then: (ok) => ok([]) }));
  const order = new Order({ status: 'REJECTED', depositStatus: 'UNPAID', paymentStatus: 'UNPAID' });
  assert.equal(await queueRefund(order, oid(9), 'Từ chối'), null);
  assert.equal(order.exceptionRequests.length, 0);
});
