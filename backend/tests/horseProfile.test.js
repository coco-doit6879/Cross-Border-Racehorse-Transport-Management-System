const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const Horse = require('../src/models/Horse');
const HorseFile = require('../src/models/HorseFile');
const AuditLog = require('../src/models/AuditLog');
const User = require('../src/models/User');
const controller = require('../src/controllers/horseController');
const orders = require('../src/controllers/orderController');
const transportScheduleService = require('../src/services/transportScheduleService');
const { ROLE_PERMISSIONS } = require('../src/utils/constants');
const { validateProfile } = require('../src/utils/horseProfile');
const express = require('express');
const jwt = require('jsonwebtoken');

const owner = '111111111111111111111111';
const reviewer = '222222222222222222222222';
const horseId = '333333333333333333333333';
const refs = [1, 2, 3, 4].map((n) => `/horses/files/${String(n).padStart(24, '0')}`);
const profile = () => ({ name: 'Test Horse', microchipId: '104123456789012', feiPassportNumber: 'TEST-FEI', breed: 'Thoroughbred', dateOfBirth: '2020-01-01', gender: 'GELDING', weightKg: 520, color: 'Bay', currentStopId: 'VN-HCM', photos: refs.slice(0, 2), passportScanUrl: refs[2], vaccinationRecordUrl: refs[3], lastVaccinationDate: new Date().toISOString().slice(0, 10) });
let horse;
const request = (body = {}, id = owner, permissions = ['horse:create_own']) => ({ body, params: { id: horseId }, user: { _id: id, effectivePermissions: permissions }, get: () => 'test', ip: '127.0.0.1' });
async function call(fn, req) {
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; return this; } };
  await fn(req, res, (error) => { throw error; });
  return res;
}
beforeEach((t) => {
  horse = { ...profile(), _id: horseId, ownerId: owner, reviewStatus: 'PENDING_REVIEW', __v: 0, toObject() { return { ...this }; } };
  t.mock.method(Horse, 'findById', async () => horse);
  t.mock.method(transportScheduleService, 'resolveDeparture', async () => ({ departureId: 'fixed-test', scheduleRevision: 0, originStopId: 'VN-HCM', destinationStopId: 'VN-HAN', origin: { address: 'A', countryCode: 'VN', coordinates: [105, 21] }, destination: { address: 'B', countryCode: 'VN', coordinates: [106, 20] }, requestedDepartureDate: '2027-01-01T01:00:00Z', basePriceVnd: 18000000 }));
  t.mock.method(HorseFile, 'findById', async () => ({ ownerId: owner, mimeType: 'image/png' }));
  t.mock.method(AuditLog, 'create', async () => ({}));
});
afterEach(() => {});

test('reject missing evidence, invalid weight/date, and duplicate identity photo', () => {
  assert.equal(validateProfile(profile()), null);
  for (const change of [{ color: '' }, { currentStopId: '' }, { currentStopId: 'TH-CUSTOM' }, { photos: [] }, { photos: [refs[0], refs[0]] }, { weightKg: -1 }, { dateOfBirth: '2100-01-01' }, { lastVaccinationDate: 'invalid' }, { lastVaccinationDate: '1900-01-01' }]) assert.ok(validateProfile({ ...profile(), ...change }));
});
test('creation ignores forged approval, reviewer, ownership and history', async (t) => {
  let saved;
  t.mock.method(Horse, 'create', async (data) => { saved = data; return { ...data, _id: horseId }; });
  const res = await call(controller.createHorse, request({ ...profile(), ownerId: reviewer, reviewStatus: 'APPROVED', reviewedBy: reviewer, reviewHistory: [{ decision: 'APPROVED' }] }));
  assert.equal(res.statusCode, 201); assert.equal(saved.ownerId, owner); assert.equal(saved.reviewStatus, 'PENDING_REVIEW'); assert.equal(saved.reviewedBy, undefined); assert.equal(saved.reviewHistory, undefined);
});
test('creation rejects arbitrary URLs and files owned by another user', async (t) => {
  assert.equal((await call(controller.createHorse, request({ ...profile(), passportScanUrl: 'https://example.com/fake.pdf' }))).statusCode, 400);
  t.mock.method(HorseFile, 'findById', async () => ({ ownerId: reviewer, mimeType: 'image/png' }));
  assert.equal((await call(controller.createHorse, request(profile()))).statusCode, 400);
});
test('only health reviewer role permission grants health decisions', async () => {
  assert.ok(ROLE_PERMISSIONS.TRANSPORT_SPECIALIST.includes('horse:review_health'));
  assert.ok(!ROLE_PERMISSIONS.CUSTOMER.includes('horse:review_health'));
  assert.ok(!ROLE_PERMISSIONS.LOGISTICS_MANAGER.includes('horse:review_health'));
  assert.equal((await call(controller.reviewHorse, request({ decision: 'APPROVED', notes: 'ok', profileVersion: 0 }))).statusCode, 403);
});
test('reviewer cannot approve their own horse', async () => {
  assert.equal((await call(controller.reviewHorse, request({ decision: 'APPROVED', notes: 'ok', profileVersion: 0 }, owner, ['horse:review_health']))).statusCode, 403);
});
test('approval records reviewer, timestamp, decision, history and checks version atomically', async (t) => {
  let query, update;
  t.mock.method(Horse, 'findOneAndUpdate', async (q, u) => { query = q; update = u; return { ...horse, ...u.$set }; });
  const res = await call(controller.reviewHorse, request({ decision: 'APPROVED', notes: 'Healthy and identified', profileVersion: 0 }, reviewer, ['horse:review_health']));
  assert.equal(res.statusCode, 200); assert.equal(query.__v, 0); assert.equal(query.reviewStatus, 'PENDING_REVIEW'); assert.equal(update.$set.reviewedBy, reviewer); assert.ok(update.$set.reviewedAt instanceof Date); assert.equal(update.$push.reviewHistory.decision, 'APPROVED'); assert.equal(update.$inc.__v, 1);
});
test('reject stale review, already reviewed profile and missing rejection reason', async () => {
  const req = request({ decision: 'REJECTED', notes: '', profileVersion: 0 }, reviewer, ['horse:review_health']);
  assert.equal((await call(controller.reviewHorse, req)).statusCode, 400);
  req.body.notes = 'Need vaccination record'; req.body.profileVersion = 1;
  assert.equal((await call(controller.reviewHorse, req)).statusCode, 409);
  req.body.profileVersion = 0; horse.reviewStatus = 'APPROVED';
  assert.equal((await call(controller.reviewHorse, req)).statusCode, 409);
});
test('expired vaccination prevents approval but allows rejection', async (t) => {
  horse.lastVaccinationDate = '2020-01-01';
  t.mock.method(Horse, 'findOneAndUpdate', async (q, u) => ({ ...horse, ...u.$set }));
  const req = request({ decision: 'APPROVED', notes: 'Needs new vaccination', profileVersion: 0 }, reviewer, ['horse:review_health']);
  assert.equal((await call(controller.reviewHorse, req)).statusCode, 400);
  req.body.decision = 'REJECTED';
  assert.equal((await call(controller.reviewHorse, req)).body.data.reviewStatus, 'REJECTED');
});
test('editing approval resets review, preserves history and strips protected fields', async (t) => {
  horse.reviewStatus = 'APPROVED';
  let update;
  t.mock.method(Horse, 'findOneAndUpdate', async (q, u) => { update = u; return { ...horse, ...u.$set }; });
  const res = await call(controller.updateHorse, request({ color: 'Grey', ownerId: reviewer, reviewStatus: 'APPROVED', reviewHistory: [] }));
  assert.equal(res.body.data.reviewStatus, 'PENDING_REVIEW'); assert.equal(update.$set.ownerId, undefined); assert.equal(update.$set.reviewHistory, undefined); assert.equal(update.$unset.reviewedBy, 1);
});
test('another user including a specialist cannot change owner profile', async () => {
  assert.equal((await call(controller.updateHorse, request({ color: 'Grey' }, reviewer, ['horse:manage_all']))).statusCode, 403);
});
test('concurrent edit cannot receive approval for outdated evidence', async (t) => {
  t.mock.method(Horse, 'findOneAndUpdate', async () => null);
  assert.equal((await call(controller.reviewHorse, request({ decision: 'APPROVED', notes: 'ok', profileVersion: 0 }, reviewer, ['horse:review_health']))).statusCode, 409);
});
test('booking blocks pending, rejected and legacy horses without approval', async (t) => {
  t.mock.method(Horse, 'find', async () => [horse]);
  const req = request({ horseIds: [horseId], departureId: 'fixed-test', scheduleRevision: 0 });
  for (const status of ['PENDING_REVIEW', 'REJECTED', undefined]) {
    horse.reviewStatus = status;
    const res = await call(orders.createOrder, req);
    assert.equal(res.statusCode, 400); assert.match(res.body.message, /duyệt sức khỏe/);
  }
});
test('upload endpoint authenticates, stores binary, validates MIME signatures and 5 MB limit', async (t) => {
  t.mock.method(User, 'findById', () => ({ select: async () => ({ _id: owner, isActive: true, role: 'CUSTOMER', permissions: [] }) }));
  let saved;
  t.mock.method(HorseFile, 'create', async (data) => { saved = data; return { ...data, _id: '000000000000000000000001' }; });
  const app = express(); app.use(express.json()); app.use('/horses', require('../src/routes/horseRoutes'));
  const server = app.listen(0, '127.0.0.1'); await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/horses/files`;
  const headers = { Authorization: `Bearer ${jwt.sign({ id: owner }, process.env.JWT_SECRET || 'cbrt_super_secret_jwt_key_2026')}`, 'Content-Type': 'application/pdf', 'X-File-Name': encodeURIComponent('Hộ chiếu.pdf') };
  assert.equal((await fetch(url, { method: 'POST', body: '%PDF-1.4 test' })).status, 401);
  assert.equal((await fetch(url, { method: 'POST', headers, body: '%PDF-1.4 test' })).status, 201);
  assert.equal(saved.name, 'Hộ chiếu.pdf'); assert.equal(saved.data.toString(), '%PDF-1.4 test');
  assert.equal((await fetch(url, { method: 'POST', headers, body: '<html>fake</html>' })).status, 400);
  assert.equal((await fetch(url, { method: 'POST', headers, body: Buffer.alloc(5 * 1024 * 1024 + 1) })).status, 413);
});

test('approved owned horse can create a booking', async (t) => {
  const Order = require('../src/models/Order');
  horse.reviewStatus = 'APPROVED';
  t.mock.method(Horse, 'find', async () => [horse]);
  t.mock.method(Order, 'countDocuments', async () => 0);
  t.mock.method(Order, 'findOne', async () => null);
  t.mock.method(Order, 'create', async (data) => ({ ...data, _id: '444444444444444444444444' }));
  const req = request({ horseIds: [horseId], departureId: 'fixed-test', scheduleRevision: 0 });
  const res = await call(orders.createOrder, req);
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body.data.horseIds, [horseId]);
});

