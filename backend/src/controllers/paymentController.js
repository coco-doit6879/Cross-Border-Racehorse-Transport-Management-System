const crypto = require('crypto');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const PaymentTransaction = require('../models/PaymentTransaction');
const vnpayService = require('../services/vnpayService');
const { logAudit } = require('../utils/auditLogger');

const payableStatuses = ['APPROVED', 'DOCS_PROCESSING', 'CLEARED_FOR_TRANSPORT'];
const responseMessages = {
  '00': 'Giao dịch thành công',
  '07': 'Giao dịch bị nghi ngờ',
  '09': 'Thẻ hoặc tài khoản chưa đăng ký Internet Banking',
  '10': 'Xác thực thông tin thẻ hoặc tài khoản không đúng quá số lần',
  '11': 'Đã hết hạn thanh toán',
  '12': 'Thẻ hoặc tài khoản bị khóa',
  '24': 'Khách hàng hủy giao dịch',
  '51': 'Tài khoản không đủ số dư',
  '65': 'Vượt hạn mức giao dịch',
  '75': 'Ngân hàng đang bảo trì',
  '79': 'Nhập sai mật khẩu thanh toán quá số lần'
};

const returnUrl = () => process.env.VNPAY_RETURN_URL || `${String(process.env.PUBLIC_BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '')}/api/payments/vnpay/return`;
const frontendUrl = () => String(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const clientIp = (req) => {
  const value = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1').split(',')[0].trim().replace(/^::ffff:/, '');
  return value === '::1' ? '127.0.0.1' : value;
};

exports.createVnpayPayment = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn vận chuyển.' });
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn vận chuyển.' });
    if (String(order.customerId) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'Bạn chỉ có thể thanh toán đơn của mình.' });
    if (order.paymentStatus === 'PAID') return res.status(409).json({ success: false, message: 'Đơn đã được thanh toán.' });
    if (!payableStatuses.includes(order.status)) return res.status(400).json({ success: false, message: 'Chỉ thanh toán sau khi đơn được duyệt và trước khi khởi hành.' });
    const amountVnd = Number(order.pricing?.totalAmountVnd);
    if (!Number.isSafeInteger(amountVnd) || amountVnd <= 0) return res.status(400).json({ success: false, message: 'Đơn chưa có tổng tiền hợp lệ.' });

    const txnRef = `${Date.now()}${crypto.randomInt(100000, 999999)}`;
    const { paymentUrl, expiresAt } = vnpayService.createPaymentUrl({
      txnRef,
      amountVnd,
      orderInfo: `Thanh toan don van chuyen ${order.bookingCode}`,
      returnUrl: returnUrl(),
      clientIp: clientIp(req)
    });
    await PaymentTransaction.create({ orderId: order._id, customerId: req.user._id, txnRef, amountVnd, expiresAt });
    await logAudit({
      actorId: req.user._id, action: 'VNPAY_PAYMENT_CREATED', resource: 'PaymentTransaction', resourceId: txnRef,
      result: 'SUCCESS', metadata: { orderId: order._id.toString(), amountVnd }, ipAddress: req.ip, userAgent: req.get('User-Agent')
    });
    res.status(201).json({ success: true, data: { txnRef, paymentUrl, expiresAt } });
  } catch (error) { next(error); }
};

async function applyIpn(query) {
  if (!vnpayService.verify(query)) return { code: '97', message: 'Invalid signature' };
  const transaction = await PaymentTransaction.findOne({ txnRef: query.vnp_TxnRef });
  if (!transaction) return { code: '01', message: 'Order not found' };
  if (Number(query.vnp_Amount) !== transaction.amountVnd * 100) return { code: '04', message: 'Invalid amount' };
  if (transaction.status !== 'PENDING') return { code: '02', message: 'Order already confirmed' };

  const success = query.vnp_ResponseCode === '00' && query.vnp_TransactionStatus === '00';
  transaction.status = success ? 'PAID' : query.vnp_ResponseCode === '24' ? 'CANCELLED' : query.vnp_ResponseCode === '11' ? 'EXPIRED' : 'FAILED';
  transaction.responseCode = query.vnp_ResponseCode;
  transaction.transactionNo = query.vnp_TransactionNo;
  transaction.bankCode = query.vnp_BankCode;
  transaction.cardType = query.vnp_CardType;
  transaction.payDate = query.vnp_PayDate;
  transaction.failureMessage = success ? undefined : (responseMessages[query.vnp_ResponseCode] || 'Giao dịch không thành công');
  transaction.callbackPayload = Object.fromEntries(Object.entries(query).filter(([key]) => key !== 'vnp_SecureHash'));
  await transaction.save();

  if (success) {
    await Order.updateOne(
      { _id: transaction.orderId, paymentStatus: { $ne: 'PAID' } },
      { $set: { paymentStatus: 'PAID', paymentMethod: 'VNPAY', paymentReference: query.vnp_TransactionNo || transaction.txnRef, paidAt: new Date() } }
    );
  }
  return { code: '00', message: 'Confirm Success', transaction };
}

exports.vnpayIpn = async (req, res) => {
  try {
    const result = await applyIpn(req.query);
    res.json({ RspCode: result.code, Message: result.message });
  } catch (error) {
    res.json({ RspCode: '99', Message: 'Unknown error' });
  }
};

exports.vnpayReturn = async (req, res) => {
  let verified = false;
  try { verified = vnpayService.verify(req.query); } catch (_) { verified = false; }
  const params = new URLSearchParams({
    txnRef: req.query.vnp_TxnRef || '',
    result: verified && req.query.vnp_ResponseCode === '00' ? 'processing' : 'failed',
    responseCode: verified ? (req.query.vnp_ResponseCode || '') : '97'
  });
  res.redirect(`${frontendUrl()}/payments/vnpay/result?${params.toString()}`);
};

exports.getPayment = async (req, res, next) => {
  try {
    let transaction = await PaymentTransaction.findOne({ txnRef: req.params.txnRef });
    if (!transaction) return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch.' });
    if (req.user.role === 'CUSTOMER' && String(transaction.customerId) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'Bạn không được xem giao dịch này.' });
    if (transaction.status === 'PENDING' && transaction.expiresAt <= new Date()) {
      transaction.status = 'EXPIRED';
      transaction.failureMessage = 'Phiên thanh toán đã hết hạn.';
      await transaction.save();
    }
    res.json({ success: true, data: transaction });
  } catch (error) { next(error); }
};

exports._applyIpn = applyIpn;
