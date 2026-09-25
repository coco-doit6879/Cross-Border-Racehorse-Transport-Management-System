const { test } = require('node:test');
const assert = require('node:assert/strict');
const Vehicle = require('../src/models/Vehicle');
const Order = require('../src/models/Order');
const TransportRoute = require('../src/models/TransportRoute');
const AuditLog = require('../src/models/AuditLog');
const vehicleController = require('../src/controllers/vehicleController');
const routeController = require('../src/controllers/routeController');
const { ROLE_PERMISSIONS } = require('../src/utils/constants');

const coordinatorId = '111111111111111111111111';
function req(body = {}) { return { body, params: { id: '222222222222222222222222' }, user: { _id: coordinatorId, role: 'FLEET_COORDINATOR', effectivePermissions: ROLE_PERMISSIONS.FLEET_COORDINATOR }, ip: '127.0.0.1', get: () => 'test' }; }
async function call(handler, request) { const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; await handler(request, response, (error) => { throw error; }); return response; }
function queryResult(value) { return { populate() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } }; }

test('role permissions keep health review and fleet dispatch separated', () => {
  assert.ok(ROLE_PERMISSIONS.TRANSPORT_SPECIALIST.includes('horse:review_health'));
  assert.ok(ROLE_PERMISSIONS.TRANSPORT_SPECIALIST.includes('compliance:review'));
  assert.ok(!ROLE_PERMISSIONS.TRANSPORT_SPECIALIST.includes('route:dispatch'));
  assert.ok(ROLE_PERMISSIONS.FLEET_COORDINATOR.includes('route:dispatch'));
  assert.ok(ROLE_PERMISSIONS.FLEET_COORDINATOR.includes('schedule:manage'));
});

test('vehicle schema requires valid capacity, registration and inspection dates', async () => {
  const invalid = new Vehicle({ plateNumber: '51A-1', name: 'Horsebox', capacityHorses: 0, countryCode: 'VN' });
  const error = invalid.validateSync();
  assert.ok(error.errors.capacityHorses);
  assert.ok(error.errors.registrationExpiresAt);
  assert.ok(error.errors.inspectionExpiresAt);
});

test('vehicle creation normalizes plate and fleet metadata', async (t) => {
  let saved;
  t.mock.method(Vehicle, 'create', async (data) => { saved = data; return { ...data, _id: '333333333333333333333333' }; });
  t.mock.method(AuditLog, 'create', async () => ({}));
  const response = await call(vehicleController.createVehicle, req({ plateNumber: ' 51c-987.65 ', name: 'Horsebox', capacityHorses: 2, countryCode: 'vn', registrationExpiresAt: '2028-01-01', inspectionExpiresAt: '2027-01-01', status: 'ACTIVE' }));
  assert.equal(response.statusCode, 201);
  assert.equal(saved.plateNumber, '51C-987.65');
  assert.equal(saved.countryCode, 'VN');
});

test('dispatch requires a managed vehicle and active trip assignment cannot be changed', async (t) => {
  assert.equal((await call(routeController.dispatchRoute, req({ orderId: '444444444444444444444444', driverId: '5', escortId: '6' }))).statusCode, 400);
  t.mock.method(TransportRoute, 'findById', () => queryResult({ _id: '222222222222222222222222', status: 'IN_TRANSIT', orderId: {} }));
  const response = await call(routeController.updateAssignment, req({ vehicleId: '3', driverId: '5', escortId: '6', reason: 'test' }));
  assert.equal(response.statusCode, 409);
});

test('fleet cannot dispatch an unpaid order', async (t) => {
  t.mock.method(Order, 'findById', async () => ({ _id: '444444444444444444444444', status: 'APPROVED', paymentStatus: 'PARTIALLY_PAID' }));
  const response = await call(routeController.dispatchRoute, req({ orderId: '444444444444444444444444', vehicleId: '3', driverId: '5', escortId: '6' }));
  assert.equal(response.statusCode, 409);
  assert.equal(response.body.errorCode, 'PAYMENT_REQUIRED');
});

test('an assigned trip cannot start if payment is no longer complete', async (t) => {
  const route = { _id: '222222222222222222222222', status: 'SCHEDULED', orderId: '444444444444444444444444', async save() {} };
  t.mock.method(TransportRoute, 'findById', async () => route);
  t.mock.method(Order, 'findById', async () => ({ paymentStatus: 'PARTIALLY_PAID' }));
  const request = req({ status: 'IN_TRANSIT' });
  request.user.effectivePermissions = [...request.user.effectivePermissions, 'trip:start'];
  const response = await call(routeController.updateTripStatus, request);
  assert.equal(response.statusCode, 409);
  assert.equal(response.body.errorCode, 'PAYMENT_REQUIRED');
});
