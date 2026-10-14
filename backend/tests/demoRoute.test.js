const { test } = require('node:test');
const assert = require('node:assert/strict');
const Route = require('../src/models/TransportRoute');
const Incident = require('../src/models/Incident');
const { simulate } = require('../src/controllers/demoRouteController');
const driver = '111111111111111111111111';
function fixture() {
  return new Route({ driverId: driver, status: 'IN_TRANSIT', waypoints: [
    { sequence: 1, name: 'A', type: 'PICKUP', location: { coordinates: [106, 10] }, estimatedArrival: new Date() },
    { sequence: 2, name: 'B', type: 'DELIVERY', location: { coordinates: [105, 11] }, estimatedArrival: new Date(Date.now() + 86400000) }
  ] });
}
async function call(t, route, action, actor = driver) {
  t.mock.method(Route, 'findById', () => ({ populate: async () => route }));
  t.mock.method(Incident, 'exists', async () => false);
  route.save = async () => route;
  let status = 200, body;
  await simulate({ params: { id: String(route._id) }, user: { role: 'DRIVER', _id: actor }, body: { action } }, {
    status(code) { status = code; return this; }, json(value) { body = value; }
  }, error => { throw error; });
  return { status, body };
}
test('enabling demo adds two illustrative stops and does not duplicate them', async t => {
  const route = fixture();
  assert.equal((await call(t, route, 'ENABLE')).status, 200);
  assert.equal(route.waypoints.length, 4);
  assert.equal(route.waypoints[1].type, 'REST_STOP');
  await call(t, route, 'ENABLE');
  assert.equal(route.waypoints.length, 4);
});
test('demo movement stops at the next waypoint and requires finishing rest', async t => {
  const route = fixture();
  await call(t, route, 'ENABLE');
  await call(t, route, 'ARRIVE');
  assert.deepEqual([...route.currentLocation.coordinates], [106, 10]);
  route.waypoints[0].status = 'ARRIVED';
  route.waypoints[1].status = 'ARRIVED';
  assert.equal((await call(t, route, 'ARRIVE')).status, 409);
  assert.equal((await call(t, route, 'CONTINUE')).status, 200);
  assert.ok(route.waypoints[1].demoDepartedAt);
});
test('another driver cannot enable simulation', async t => {
  assert.equal((await call(t, fixture(), 'ENABLE', '222222222222222222222222')).status, 403);
});
test('production rejects demo', async t => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try { assert.equal((await call(t, fixture(), 'ENABLE')).status, 403); }
  finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
});
