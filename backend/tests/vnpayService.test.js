const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const service = require('../src/services/vnpayService');

const original = {};
before(() => {
  for (const key of ['VNPAY_TMN_CODE', 'VNPAY_HASH_SECRET', 'VNPAY_PAYMENT_URL']) original[key] = process.env[key];
  process.env.VNPAY_TMN_CODE = 'TESTCODE';
  process.env.VNPAY_HASH_SECRET = 'test-secret-that-is-never-committed';
  process.env.VNPAY_PAYMENT_URL = 'https://sandbox.example/pay';
});
after(() => {
  for (const [key, value] of Object.entries(original)) value === undefined ? delete process.env[key] : process.env[key] = value;
});

test('VNPAY signature is deterministic and rejects changed payment data', () => {
  const params = { vnp_Amount: '12500000', vnp_TxnRef: '123456', vnp_OrderInfo: 'Thanh toan don hang' };
  const secureHash = service.sign(params);
  assert.equal(secureHash.length, 128);
  assert.equal(service.verify({ ...params, vnp_SecureHash: secureHash }), true);
  assert.equal(service.verify({ ...params, vnp_Amount: '12500001', vnp_SecureHash: secureHash }), false);
});

test('payment URL contains VNPAY 2.1 fields, amount in minor units and no secret', () => {
  const createdAt = new Date('2026-09-26T01:00:00.000Z');
  const { paymentUrl, expiresAt } = service.createPaymentUrl({
    txnRef: '987654', amountVnd: 125000, orderInfo: 'Thanh toan TR-2026-0001',
    returnUrl: 'http://localhost:5000/api/payments/vnpay/return', clientIp: '127.0.0.1', createdAt
  });
  const url = new URL(paymentUrl);
  assert.equal(url.origin + url.pathname, 'https://sandbox.example/pay');
  assert.equal(url.searchParams.get('vnp_Version'), '2.1.0');
  assert.equal(url.searchParams.get('vnp_Amount'), '12500000');
  assert.equal(url.searchParams.get('vnp_TxnRef'), '987654');
  assert.equal(url.searchParams.get('vnp_CreateDate'), '20260926080000');
  assert.equal(url.searchParams.get('vnp_ExpireDate'), '20260926081500');
  assert.ok(url.searchParams.get('vnp_SecureHash'));
  assert.ok(!paymentUrl.includes(process.env.VNPAY_HASH_SECRET));
  assert.equal(expiresAt.toISOString(), '2026-09-26T01:15:00.000Z');
});
