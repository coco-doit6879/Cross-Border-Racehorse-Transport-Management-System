const { test } = require('node:test');
const assert = require('node:assert/strict');
const Order = require('../src/models/Order');
const Doc = require('../src/models/ComplianceDoc');
const c = require('../src/controllers/complianceRequestController');
const call = async (fn, req) => { const res = { code: 200, status(v) { this.code = v; return this; }, json(v) { this.body = v; return this; } }; await fn(req, res, e => { throw e; }); return res; };
const user = { _id: 'owner', role: 'CUSTOMER' };
const specialist = { _id: 'staff', role: 'TRANSPORT_SPECIALIST', effectivePermissions: ['compliance:review'] };
test('customer cannot read another owner checklist', async t => {
  t.mock.method(Order, 'findById', async () => ({ customerId: 'other' }));
  assert.equal((await call(c.checklist, { params: { orderId: 'o' }, user })).code, 403);
});
test('customer cannot issue supplementary document requests', async () => {
  assert.equal((await call(c.request, { body: {}, user })).code, 403);
});
test('specialist request revokes clearance and records reason', async t => {
  t.mock.method(Order, 'findById', async () => ({ status: 'CLEARED_FOR_TRANSPORT', horseIds: [], destination: { countryCode: 'TH' } }));
  let updated, created;
  t.mock.method(Order, 'updateOne', async (q, v) => { updated = v; });
  t.mock.method(Doc, 'create', async v => { created = v; return v; });
  const r = await call(c.request, { user: specialist, body: { orderId: 'o', documentType: 'Permit', requestReason: 'Missing import permit' } });
  assert.equal(r.code, 201); assert.equal(updated.$set.status, 'DOCS_PROCESSING'); assert.equal(created.status, 'PENDING_UPLOAD'); assert.equal(created.history[0].action, 'REQUESTED');
});
test('customer cannot submit files for someone else order', async t => {
  t.mock.method(Doc, 'findById', async () => ({ orderId: 'o' }));
  t.mock.method(Order, 'findById', async () => ({ customerId: 'other' }));
  assert.equal((await call(c.upload, { body: { documentId: 'd' }, user })).code, 403);
});
test('review requires a reason for resubmission', async () => {
  assert.equal((await call(c.review, { user: specialist, body: { status: 'REJECTED' } })).code, 400);
});
test('customer resubmission enters review and preserves an audit entry', async t => {
  const File = require('../src/models/HorseFile');
  t.mock.method(Doc, 'findById', async () => ({ _id: 'd', orderId: 'o' }));
  t.mock.method(Order, 'findById', async () => ({ customerId: 'owner', status: 'DOCS_PROCESSING', requestedDepartureDate: '2030-01-01' }));
  t.mock.method(File, 'findById', async () => ({ ownerId: 'owner' }));
  let update;
  t.mock.method(Doc, 'findOneAndUpdate', async (q, v) => { assert.deepEqual(q.status.$in, ['PENDING_UPLOAD', 'REJECTED']); update = v; return v.$set; });
  const r = await call(c.upload, { user, body: { documentId: 'd', fileUrl: '/horses/files/111111111111111111111111' } });
  assert.equal(r.code, 200); assert.equal(update.$set.status, 'PENDING_REVIEW'); assert.equal(update.$push.history.action, 'SUBMITTED');
});
test('approving one document cannot clear an order with outstanding requirements', async t => {
  t.mock.method(Doc, 'findById', async () => ({ _id: 'd', orderId: 'o', fileUrl: '/horses/files/111111111111111111111111' }));
  t.mock.method(Order, 'findById', async () => ({ status: 'DOCS_PROCESSING' }));
  t.mock.method(Doc, 'findOneAndUpdate', async () => ({ status: 'APPROVED' }));
  t.mock.method(Doc, 'exists', async () => ({ _id: 'other' }));
  let status;
  t.mock.method(Order, 'updateOne', async (q, v) => { status = v.$set.status; });
  assert.equal((await call(c.review, { user: specialist, params: { id: 'd' }, body: { status: 'APPROVED' } })).code, 200);
  assert.equal(status, 'DOCS_PROCESSING');
});
