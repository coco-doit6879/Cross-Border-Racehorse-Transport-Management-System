const { test } = require('node:test');
const assert = require('node:assert/strict');
const { locationProblem } = require('../src/services/tripSafety');
const Doc = require('../src/models/ComplianceDoc');
const { stageReady } = require('../src/services/operationsWorkflow');
const { distanceToPathKm } = require('../src/services/routeDeviationService');
const call = async (fn, req) => {
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await fn({ get: () => '', ...req }, res, error => { throw error; }); return res;
};

test('delivery rejects absent, old, future and distant GPS', () => {
  const now = Date.now();
  const location = { coordinates: [106, 10], updatedAt: new Date(now) };
  assert.equal(locationProblem(location, [106, 10], now), null);
  assert.ok(locationProblem(null, [106, 10], now));
  assert.ok(locationProblem({ ...location, updatedAt: new Date(now - 180000) }, [106, 10], now));
  assert.ok(locationProblem({ ...location, updatedAt: new Date(now + 60000) }, [106, 10], now));
  assert.ok(locationProblem(location, [107, 10], now));
});
test('empty mandatory stage cannot be cleared', async t => {
  t.mock.method(Doc, 'find', async () => []);
  assert.equal(await stageReady('order', 'DEPARTURE'), false);
});
test('vehicle on the planned segment is not away from its route', () => {
  assert.equal(distanceToPathKm(0, 0.5, [[0, 0], [1, 0]]), 0);
  assert.ok(distanceToPathKm(1, 0.5, [[0, 0], [1, 0]]) > 100);
});
test('paid callback retries order update after a partial database failure', async t => {
  const Payment = require('../src/models/PaymentTransaction');
  const Order = require('../src/models/Order');
  const provider = require('../src/services/vnpayService');
  const controller = require('../src/controllers/paymentController');
  const transaction = { status: 'PENDING', amountVnd: 100, purpose: 'BALANCE', orderId: 'o', txnRef: 't', async save() {} };
  let calls = 0;
  t.mock.method(provider, 'verify', () => true);
  t.mock.method(Payment, 'findOne', async () => transaction);
  t.mock.method(Order, 'updateOne', async () => { if (++calls === 1) throw new Error('DB unavailable'); });
  t.mock.method(Order, 'findById', async () => ({ status: 'APPROVED', paymentReference: 't' }));
  const query = { vnp_Amount: '10000', vnp_ResponseCode: '00', vnp_TransactionStatus: '00' };
  await assert.rejects(controller._applyIpn(query), /DB unavailable/);
  assert.equal(transaction.appliedAt, undefined);
  assert.equal((await controller._applyIpn(query)).code, '00');
  assert.equal(calls, 2);
  assert.ok(transaction.appliedAt);
});

test('non-manager cannot approve a refund and manager must supply a reason', async t => {
  const Order = require('../src/models/Order');
  const Route = require('../src/models/TransportRoute');
  const workflow = require('../src/controllers/operationsWorkflowController');
  const request = { status: 'PENDING' };
  t.mock.method(Order, 'findById', async () => ({ _id: 'o', customerId: 'owner', status: 'CANCELLED', operationsVersion: 0, exceptionRequests: { id: () => request } }));
  t.mock.method(Route, 'findOne', async () => null);
  const base = { params: { id: 'o' }, body: { action: 'REVIEW_EXCEPTION', version: 0, itemId: 'r', status: 'APPROVED' } };
  assert.equal((await call(workflow.update, { ...base, user: { _id: 'owner', effectivePermissions: [] } })).code, 403);
  assert.equal((await call(workflow.update, { ...base, user: { _id: 'manager', effectivePermissions: ['booking:approve', 'user:manage'] } })).code, 400);
  assert.equal(request.status, 'PENDING');
});

test('direct route completion is rejected without changing any record', async () => {
  const controller = require('../src/controllers/routeController');
  const result = await call(controller.updateTripStatus, { body: { status: 'COMPLETED' }, params: { id: 'r' }, user: { _id: 'driver' } });
  assert.equal(result.code, 409);
});

test('resolving one incident keeps the trip paused while another is active', async t => {
  const Incident = require('../src/models/Incident');
  const Route = require('../src/models/TransportRoute');
  const Audit = require('../src/models/AuditLog');
  const controller = require('../src/controllers/incidentController');
  const incident = { _id: 'i', tripId: 'r', status: 'IN_PROGRESS', async save() {} };
  const route = { _id: 'r', status: 'INCIDENT_HANDLING', preIncidentStatus: 'DELIVERING', async save() { throw new Error('must remain paused'); } };
  t.mock.method(Incident, 'findById', async () => incident);
  t.mock.method(Incident, 'exists', async () => ({ _id: 'second' }));
  t.mock.method(Route, 'findById', async () => route);
  t.mock.method(Audit, 'create', async () => ({}));
  assert.equal((await call(controller.updateIncidentStatus, { params: { id: 'i' }, user: { _id: 'staff' }, body: { status: 'RESOLVED', resolutionNotes: 'Đã xử lý sự cố thứ nhất' } })).code, 200);
  assert.equal(route.status, 'INCIDENT_HANDLING');
});

test('signed POD retry repairs a partial completion without creating another receipt', async t => {
  const Order = require('../src/models/Order');
  const Route = require('../src/models/TransportRoute');
  const POD = require('../src/models/DigitalPOD');
  const Horse = require('../src/models/Horse');
  const controller = require('../src/controllers/podController');
  let saves = 0;
  const route = { _id: 'r', orderId: 'o', status: 'DELIVERING', async save() { saves++; } };
  const order = { _id: 'o', customerId: 'owner', status: 'DELIVERING', horseIds: ['h'], destinationStopId: 'stop', async save() { saves++; } };
  t.mock.method(Route, 'findById', async () => route);
  t.mock.method(Order, 'findById', async () => order);
  t.mock.method(POD, 'findOne', async () => ({ _id: 'existing' }));
  t.mock.method(POD, 'create', async () => { throw new Error('must not create twice'); });
  t.mock.method(Horse, 'updateMany', async () => ({}));
  const result = await call(controller.signPOD, { user: { _id: 'owner' }, body: { tripId: 'r', orderId: 'o', signerName: 'Owner', signerPhone: '0123456789', signerRole: 'CUSTOMER', signatureImageUrl: 'existing', coordinates: [106, 10] } });
  assert.equal(result.code, 200); assert.equal(result.body.isDuplicate, true);
  assert.equal(saves, 2); assert.equal(order.status, 'COMPLETED'); assert.equal(route.status, 'COMPLETED');
});
