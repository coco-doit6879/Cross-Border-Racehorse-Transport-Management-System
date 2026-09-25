const { test } = require('node:test');
const assert = require('node:assert/strict');
const Order = require('../src/models/Order');
const PaymentTransaction = require('../src/models/PaymentTransaction');
const controller = require('../src/controllers/paymentController');
const vnpayService = require('../src/services/vnpayService');

process.env.VNPAY_TMN_CODE = 'TESTCODE';
process.env.VNPAY_HASH_SECRET = 'payment-controller-test-secret';

const signedQuery = (overrides = {}) => {
  const query = {
    vnp_Amount: '900000000',
    vnp_BankCode: 'NCB',
    vnp_CardType: 'ATM',
    vnp_PayDate: '20260926090000',
    vnp_ResponseCode: '00',
    vnp_TransactionNo: '14999999',
    vnp_TransactionStatus: '00',
    vnp_TxnRef: '1790000000000123456',
    ...overrides
  };
  return { ...query, vnp_SecureHash: vnpayService.sign(query) };
};

const pendingTransaction = () => ({
  orderId: '444444444444444444444444',
  customerId: '111111111111111111111111',
  txnRef: '1790000000000123456',
  amountVnd: 9000000,
  status: 'PENDING',
  async save() {}
});

test('valid successful VNPAY IPN marks transaction and matching order paid', async (t) => {
  const transaction = pendingTransaction();
  let orderUpdate;
  t.mock.method(PaymentTransaction, 'findOne', async () => transaction);
  t.mock.method(Order, 'updateOne', async (query, update) => { orderUpdate = { query, update }; });
  const result = await controller._applyIpn(signedQuery());
  assert.equal(result.code, '00');
  assert.equal(transaction.status, 'PAID');
  assert.equal(transaction.transactionNo, '14999999');
  assert.equal(orderUpdate.update.$set.paymentStatus, 'PAID');
  assert.equal(orderUpdate.update.$set.paymentMethod, 'VNPAY');
});

test('VNPAY IPN rejects an invalid signature before looking up a transaction', async (t) => {
  let lookedUp = false;
  t.mock.method(PaymentTransaction, 'findOne', async () => { lookedUp = true; });
  const result = await controller._applyIpn({ ...signedQuery(), vnp_SecureHash: '0'.repeat(128) });
  assert.equal(result.code, '97');
  assert.equal(lookedUp, false);
});

test('VNPAY IPN rejects an amount that differs from the locked order snapshot', async (t) => {
  t.mock.method(PaymentTransaction, 'findOne', async () => pendingTransaction());
  const result = await controller._applyIpn(signedQuery({ vnp_Amount: '800000000' }));
  assert.equal(result.code, '04');
});

test('duplicate VNPAY IPN is idempotent and does not update the order twice', async (t) => {
  const transaction = { ...pendingTransaction(), status: 'PAID' };
  let updated = false;
  t.mock.method(PaymentTransaction, 'findOne', async () => transaction);
  t.mock.method(Order, 'updateOne', async () => { updated = true; });
  const result = await controller._applyIpn(signedQuery());
  assert.equal(result.code, '02');
  assert.equal(updated, false);
});
