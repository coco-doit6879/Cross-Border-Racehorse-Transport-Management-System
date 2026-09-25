const crypto = require('crypto');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const PaymentTransaction = require('../models/PaymentTransaction');
const vnpayService = require('../services/vnpayService');
const { logAudit } = require('../utils/auditLogger');

const balancePayableStatuses = ['APPROVED', 'DOCS_PROCESSING', 'CLEARED_FOR_TRANSPORT'];
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
    const isDeposit = order.depositRequired && order.depositStatus !== 'PAID';
    if (isDeposit && order.status !== 'PENDING_APPROVAL') return res.status(400).json({ success: false, message: 'Đơn không còn ở giai đoạn đặt cọc.' });
    if (isDeposit && order.depositDueAt && order.depositDueAt <= new Date()) return res.status(410).json({ success: false, errorCode: 'DEPOSIT_EXPIRED', message: 'Thời hạn đặt cọc đã hết. Vui lòng hủy đơn và tạo lại.' });
    if (!isDeposit && !balancePayableStatuses.includes(order.status)) return res.status(400).json({ success: false, message: 'Phần còn lại chỉ được thanh toán sau khi đơn được duyệt và trước khi khởi hành.' });

    const totalAmountVnd = Number(order.pricing?.totalAmountVnd);
    const paidDepositVnd = order.depositStatus === 'PAID' ? Number(order.depositAmountVnd || 0) : 0;
    const amountVnd = isDeposit ? Number(order.depositAmountVnd) : totalAmountVnd - paidDepositVnd;
    if (!Number.isSafeInteger(amountVnd) || amountVnd <= 0) return res.status(400).json({ success: false, message: 'Đơn chưa có tổng tiền hợp lệ.' });

    const purpose = isDeposit ? 'DEPOSIT' : 'BALANCE';
    const existingPending = await PaymentTransaction.findOne({ orderId: order._id, purpose, status: 'PENDING', expiresAt: { $gt: new Date() } });
    if (existingPending?.paymentUrl) return res.json({ success: true, message: 'Tiếp tục phiên thanh toán đang còn hiệu lực.', data: { txnRef: existingPending.txnRef, purpose, amountVnd: existingPending.amountVnd, paymentUrl: existingPending.paymentUrl, expiresAt: existingPending.expiresAt, resumed: true } });
    if (existingPending) return res.status(409).json({ success: false, errorCode: 'PAYMENT_IN_PROGRESS', message: 'Đơn đang có một phiên thanh toán còn hiệu lực. Vui lòng thử lại sau khi phiên đó hết hạn.' });

    const txnRef = `${Date.now()}${crypto.randomInt(100000, 999999)}`;
    const { paymentUrl, expiresAt } = vnpayService.createPaymentUrl({
      txnRef,
      amountVnd,
      orderInfo: `${isDeposit ? 'Dat coc' : 'Thanh toan con lai'} don van chuyen ${order.bookingCode}`,
      returnUrl: returnUrl(),
      clientIp: clientIp(req),
      expiresAt: isDeposit ? order.depositDueAt : undefined
    });
    await PaymentTransaction.create({ orderId: order._id, customerId: req.user._id, purpose, txnRef, amountVnd, paymentUrl, expiresAt });
    await logAudit({
      actorId: req.user._id, action: 'VNPAY_PAYMENT_CREATED', resource: 'PaymentTransaction', resourceId: txnRef,
      result: 'SUCCESS', metadata: { orderId: order._id.toString(), purpose, amountVnd }, ipAddress: req.ip, userAgent: req.get('User-Agent')
    });
    res.status(201).json({ success: true, data: { txnRef, purpose, amountVnd, paymentUrl, expiresAt } });
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
    const reference = query.vnp_TransactionNo || transaction.txnRef;
    if (transaction.purpose === 'DEPOSIT') {
      const order = await Order.findOneAndUpdate(
        { _id: transaction.orderId, depositStatus: { $ne: 'PAID' } },
        { $set: { depositStatus: 'PAID', depositReference: reference, depositedAt: new Date(), paymentStatus: 'PARTIALLY_PAID', paymentMethod: 'VNPAY' } },
        { new: true }
      );
      if (order && Number(order.depositAmountVnd) >= Number(order.pricing?.totalAmountVnd)) {
        order.paymentStatus = 'PAID'; order.paymentReference = reference; order.paidAt = new Date(); await order.save();
      }
    } else {
      await Order.updateOne(
        { _id: transaction.orderId, paymentStatus: { $ne: 'PAID' } },
        { $set: { paymentStatus: 'PAID', paymentMethod: 'VNPAY', paymentReference: reference, paidAt: new Date() } }
      );
    }
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
