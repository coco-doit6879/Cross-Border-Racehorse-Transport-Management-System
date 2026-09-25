const crypto = require('crypto');

const REQUIRED_ENV = ['VNPAY_TMN_CODE', 'VNPAY_HASH_SECRET'];

function assertConfigured() {
  const missing = REQUIRED_ENV.filter((key) => !String(process.env[key] || '').trim());
  if (missing.length) {
    const error = new Error(`Thiếu cấu hình VNPAY: ${missing.join(', ')}`);
    error.status = 503;
    throw error;
  }
}

function formatVnpDate(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}${parts.second}`;
}

function encode(value) {
  return encodeURIComponent(String(value)).replace(/%20/g, '+');
}

function serialize(params) {
  return Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .sort()
    .map((key) => `${encode(key)}=${encode(params[key])}`)
    .join('&');
}

function sign(params) {
  assertConfigured();
  return crypto.createHmac('sha512', process.env.VNPAY_HASH_SECRET).update(serialize(params), 'utf8').digest('hex');
}

function withoutSignature(query) {
  return Object.fromEntries(Object.entries(query).filter(([key]) => !['vnp_SecureHash', 'vnp_SecureHashType'].includes(key)));
}

function verify(query) {
  const received = String(query.vnp_SecureHash || '').toLowerCase();
  if (!/^[a-f0-9]{128}$/.test(received)) return false;
  const expected = sign(withoutSignature(query)).toLowerCase();
  return crypto.timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(expected, 'hex'));
}

function createPaymentUrl({ txnRef, amountVnd, orderInfo, returnUrl, clientIp, createdAt = new Date() }) {
  assertConfigured();
  const expiresAt = new Date(createdAt.getTime() + 15 * 60 * 1000);
  const params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: process.env.VNPAY_TMN_CODE,
    vnp_Amount: Math.round(amountVnd * 100),
    vnp_CreateDate: formatVnpDate(createdAt),
    vnp_CurrCode: 'VND',
    vnp_IpAddr: clientIp || '127.0.0.1',
    vnp_Locale: 'vn',
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: 'other',
    vnp_ReturnUrl: returnUrl,
    vnp_TxnRef: txnRef,
    vnp_ExpireDate: formatVnpDate(expiresAt)
  };
  const secureHash = sign(params);
  const baseUrl = process.env.VNPAY_PAYMENT_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  return { paymentUrl: `${baseUrl}?${serialize(params)}&vnp_SecureHash=${secureHash}`, expiresAt };
}

module.exports = { createPaymentUrl, formatVnpDate, serialize, sign, verify, withoutSignature };
