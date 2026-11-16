const PaymentTransaction = require('../models/PaymentTransaction');

const executedRefunds = order => (order.exceptionRequests || []).filter(x => x.kind === 'REFUND' && x.status === 'EXECUTED').reduce((sum, x) => sum + x.amountVnd, 0);
async function capturedVnd(order, session) {
  const query = PaymentTransaction.find({ orderId: order._id, status: 'PAID' });
  if (session) query.session(session);
  const payments = await query;
  return payments.reduce((sum, p) => sum + p.amountVnd, 0) + (order.settlement?.receipts || []).reduce((sum, r) => sum + r.amountVnd, 0);
}

// A stopped order that already took money gets an approved refund item, so the
// manager only has to transfer the money and record its reference.
async function queueRefund(order, actorId, reason, session) {
  if (order.depositStatus === 'PAID') order.depositStatus = 'REFUND_PENDING';
  const open = (order.exceptionRequests || []).filter(x => x.kind === 'REFUND' && ['PENDING', 'APPROVED'].includes(x.status)).reduce((sum, x) => sum + (x.amountVnd || 0), 0);
  const amountVnd = (await capturedVnd(order, session)) - executedRefunds(order) - open;
  if (amountVnd <= 0) return null;
  const now = new Date();
  order.exceptionRequests ||= [];
  order.exceptionRequests.push({ kind: 'REFUND', amountVnd, reason: `Hoàn tiền đã thu do đơn dừng: ${reason}`, evidence: 'Hệ thống tạo khi hủy/từ chối đơn đã thanh toán', status: 'APPROVED', requestedBy: actorId, requestedAt: now, reviewedBy: actorId, reviewedAt: now, decisionReason: reason });
  order.operationsNotices ||= [];
  order.operationsNotices.push({ message: `Cần hoàn ${amountVnd.toLocaleString('vi-VN')} VND cho khách. Quản lý chuyển tiền rồi ghi mã chứng từ ở mục Yêu cầu ngoại lệ.`, actorId });
  return amountVnd;
}

// Called after a refund is executed: mark the order refunded once nothing is left.
async function settleRefundState(order) {
  if (!['CANCELLED', 'REJECTED'].includes(order.status)) return;
  if (executedRefunds(order) < await capturedVnd(order)) return;
  if (order.depositStatus === 'REFUND_PENDING') order.depositStatus = 'REFUNDED';
  if (order.paymentStatus !== 'UNPAID') order.paymentStatus = 'REFUNDED';
}

module.exports = { queueRefund, settleRefundState, capturedVnd };
