const { test } = require('node:test');
const assert = require('node:assert/strict');

const TransportRoute = require('../src/models/TransportRoute');
const Incident = require('../src/models/Incident');
const routeController = require('../src/controllers/routeController');
const incidentController = require('../src/controllers/incidentController');

const driverId = '111111111111111111111111';
const otherDriverId = '222222222222222222222222';
const routeId = '333333333333333333333333';

function request(overrides = {}) {
  return {
    params: { id: routeId }, body: {}, ip: '127.0.0.1', get: () => 'test',
    user: { _id: driverId, role: 'DRIVER', effectivePermissions: ['trip:start', 'trip:operate', 'waypoint:checkin', 'sos:trigger'] },
    ...overrides,
  };
}

async function call(handler, req) {
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await handler(req, res, (error) => { throw error; });
  return res;
}

function queryResult(value) {
  return { populate() { return this; }, select() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } };
}

test('driver route list is always scoped to the authenticated driver', async (t) => {
  let receivedQuery;
  t.mock.method(TransportRoute, 'find', (query) => { receivedQuery = query; return queryResult([]); });
  const response = await call(routeController.getRoutes, request());
  assert.equal(response.statusCode, 200);
  assert.deepEqual(receivedQuery, { driverId });
});

test('driver cannot read or operate a trip assigned to another driver', async (t) => {
  const foreignRoute = { _id: routeId, driverId: otherDriverId, escortId: null, orderId: { customerId: '444444444444444444444444' }, status: 'SCHEDULED', waypoints: [] };
  t.mock.method(TransportRoute, 'findById', () => queryResult(foreignRoute));

  assert.equal((await call(routeController.getRouteById, request())).statusCode, 403);
  assert.equal((await call(routeController.updateTripStatus, request({ body: { status: 'IN_TRANSIT' } }))).statusCode, 403);
  assert.equal((await call(routeController.waypointCheckin, request({ body: { sequence: 1 } }))).statusCode, 403);
});

test('driver cannot send SOS for a trip assigned to another driver', async (t) => {
  t.mock.method(Incident, 'findOne', async () => null);
  t.mock.method(Incident, 'create', async () => { throw new Error('incident must not be created'); });
  t.mock.method(TransportRoute, 'findById', async () => ({ _id: routeId, driverId: otherDriverId, escortId: null }));
  const response = await call(incidentController.triggerSOS, request({ body: { eventId: 'sos-test', tripId: routeId, coordinates: [106.7, 10.8], description: 'Xe gặp sự cố' } }));
  assert.equal(response.statusCode, 403);
});
