const { test } = require('node:test');
const assert = require('node:assert/strict');
const Order = require('../src/models/Order');
const controller = require('../src/controllers/orderController');
const depositService = require('../src/services/orderDepositService');

const actor = '111111111111111111111111';
const orderId = '444444444444444444444444';
const request = (body) => ({ body, params: { id: orderId }, user: { _id: actor }, ip: '127.0.0.1', get: () => 'test' });
async function call(handler, req) {
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await handler(req, res, (error) => { throw error; });
  return res;
}

test('deposit policy charges 20 percent rounded up to the nearest 1,000 VND', () => {
  const original = process.env.ORDER_DEPOSIT_PERCENT;
  process.env.ORDER_DEPOSIT_PERCENT = '20';
  assert.equal(depositService.calculateDeposit(9000000), 1800000);
  assert.equal(depositService.calculateDeposit(9000001), 1801000);
  original === undefined ? delete process.env.ORDER_DEPOSIT_PERCENT : process.env.ORDER_DEPOSIT_PERCENT = original;
});

test('manager cannot approve a new booking before its deposit is paid', async (t) => {
  const order = { _id: orderId, status: 'PENDING_APPROVAL', depositRequired: true, depositStatus: 'UNPAID' };
  t.mock.method(Order, 'findById', async () => order);
  const response = await call(controller.updateOrderStatus, request({ status: 'APPROVED' }));
  assert.equal(response.statusCode, 409);
  assert.equal(response.body.errorCode, 'DEPOSIT_REQUIRED');
});
