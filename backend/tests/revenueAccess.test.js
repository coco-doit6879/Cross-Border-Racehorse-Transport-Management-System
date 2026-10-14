const { test } = require('node:test');
const assert = require('node:assert/strict');
const router = require('../src/routes/analyticsRoutes');
const AuditLog = require('../src/models/AuditLog');
const revenue = router.stack.find(layer => layer.route?.path === '/revenue').route;
const guard = revenue.stack[1].handle;
for (const role of ['FLEET_COORDINATOR', 'ROUTE_COORDINATOR', 'TRANSPORT_SPECIALIST', 'CUSTOMER', 'DRIVER', 'ESCORT']) {
  test(`${role} cannot access revenue even with analytics permission`, async t => {
    t.mock.method(AuditLog, 'create', async () => ({}));
    const req = { user: { role, effectivePermissions: ['analytics:view'] }, baseUrl: '/analytics', path: '/revenue', headers: {}, get: () => 'test', params: {}, ip: '127.0.0.1' };
    const res = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    let next = false;
    await guard(req, res, () => { next = true; });
    assert.equal(next, false); assert.equal(res.statusCode, 403);
  });
}
test('logistics manager can access revenue', async () => {
  let next = false;
  await guard({ user: { role: 'LOGISTICS_MANAGER', effectivePermissions: [] } }, {}, () => { next = true; });
  assert.equal(next, true);
});
