const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Order = require('../models/Order');
const Route = require('../models/TransportRoute');
let io;
exports.setIO = value => { io = value; };

// Persist before broadcasting; retries of the same business event do not duplicate inbox items.
async function deliver(recipients, eventKey, content) {
  for (const user of recipients) {
    const recipientId = user._id;
    const result = await Notification.updateOne({ recipientId, eventKey }, { $setOnInsert: { ...content(user), recipientId, eventKey } }, { upsert: true });
    if (result.upsertedCount) io?.to(`user_${recipientId}`).emit('notification:new');
  }
}
exports.deliver = deliver;

exports.horseEvent = async (horse, decision = 'PENDING_REVIEW') => {
  if (mongoose.connection.readyState !== 1) return;
  try {
    const pending = decision === 'PENDING_REVIEW';
    const recipients = await User.find({ isActive: true, ...(pending ? { role: 'TRANSPORT_SPECIALIST' } : { _id: horse.ownerId }) }).select('_id role').lean();
    await deliver(recipients, `HORSE:${horse._id}:${horse.__v || 0}:${decision}`, () => ({
      title: `${pending ? 'Hồ sơ ngựa chờ kiểm tra' : decision === 'APPROVED' ? 'Hồ sơ ngựa đã được duyệt' : 'Hồ sơ ngựa cần bổ sung'} · ${horse.name}`,
      message: pending ? 'Chuyên viên kiểm tra hồ sơ sức khỏe và ghi nhận kết quả.' : horse.reviewNotes || 'Mở hồ sơ để xem kết quả kiểm tra.',
      webPath: pending ? `/specialist/horses?q=${encodeURIComponent(horse.microchipId)}` : `/horses/${horse._id}`
    }));
  } catch (error) { console.error('Horse notification failed:', error.message); }
};

exports.acknowledgeSOS = async incidentId => {
  if (mongoose.connection.readyState !== 1) return;
  try {
    const filter = { eventKey: `SOS:${incidentId}`, urgent: true };
    const recipients = await Notification.find(filter).select('recipientId').lean();
    await Notification.updateMany(filter, { $set: { urgent: false, message: 'Sự cố đã có người tiếp nhận. Mở xử lý SOS để xem tiến độ.' } });
    for (const n of recipients) io?.to(`user_${n.recipientId}`).emit('notification:new');
  } catch (error) { console.error('SOS notification update failed:', error.message); }
};

exports.orderEvent = async (kind, orderId, key, extra = {}) => {
  // Unit tests without a database must not queue network work. Production is connected before requests are served.
  if (mongoose.connection.readyState !== 1) return;
  try {
    const order = await Order.findById(orderId).lean();
    if (!order) return;
    const route = await Route.findOne({ orderId }).lean();
    const events = {
      EXCEPTION_REQUESTED: ['Yêu cầu ngoại lệ cần duyệt', 'Có yêu cầu hoàn tiền, bồi thường hoặc đổi điểm giao. Quản lý cần kiểm tra.', ['LOGISTICS_MANAGER']],
      EXCEPTION_REVIEWED: ['Đã có kết quả duyệt ngoại lệ', extra.reason || 'Mở đơn để xem quyết định của quản lý.', [], true],
      CREATED: ['Đơn vận chuyển mới', 'Có đơn mới cần tiếp nhận và duyệt.', ['LOGISTICS_MANAGER']],
      DEPOSIT_PAID: ['Đã nhận tiền cọc', 'Đơn đã thanh toán cọc, quản lý kiểm tra và duyệt.', ['LOGISTICS_MANAGER']],
      APPROVED: ['Đơn đã được duyệt', 'Khách hàng thanh toán phần còn lại; chuyên viên kiểm tra hồ sơ khởi hành.', ['TRANSPORT_SPECIALIST'], true],
      REJECTED: ['Đơn chưa được chấp thuận', extra.reason || 'Mở đơn để xem lý do và hướng xử lý.', [], true],
      CANCELLED: ['Đơn đã hủy', 'Mở đơn để xem tình trạng và xử lý thanh toán nếu có.', ['LOGISTICS_MANAGER'], true],
      PAID: ['Đơn đã thanh toán đủ', 'Điều phối lập phương án xe và lộ trình.', ['FLEET_COORDINATOR', 'ROUTE_COORDINATOR'], true],
      PLAN_CONFIRMED: ['Phương án xe đã xác nhận', 'Quản lý cần phân công tài xế và phụ xe.', ['LOGISTICS_MANAGER']],
      PLAN_DECLINED: ['Phương án cần xem lại', extra.reason || 'Điều phối đề nghị quản lý xem lại phương án.', ['LOGISTICS_MANAGER']],
      ASSIGNED: ['Bạn được phân công chuyến', 'Mở vận đơn để kiểm tra nhiệm vụ và chuẩn bị khởi hành.', [], false, true],
      DOC_REQUESTED: ['Có yêu cầu bổ sung hồ sơ', extra.reason || 'Mở hồ sơ để xem giấy tờ cần bổ sung.', extra.category === 'HORSE' ? [] : ['TRANSPORT_SPECIALIST'], extra.category === 'HORSE'],
      DOC_SUBMITTED: ['Hồ sơ đã được bổ sung', 'Chuyên viên kiểm tra tệp và ghi nhận kết quả thẩm định.', ['TRANSPORT_SPECIALIST']],
      DOC_REJECTED: ['Hồ sơ cần nộp lại', extra.reason || 'Mở hồ sơ để xem lý do cần bổ sung lại.', extra.category === 'HORSE' ? [] : ['TRANSPORT_SPECIALIST'], extra.category === 'HORSE'],
      DOC_APPROVED: ['Giấy tờ đã được duyệt', 'Chuyên viên tiếp tục kiểm tra và xác nhận hồ sơ khởi hành khi đã đủ.', ['TRANSPORT_SPECIALIST'], extra.category === 'HORSE'],
      DEPARTURE_READY: ['Hồ sơ đã đủ để khởi hành', 'Chuyên viên đã xác nhận hồ sơ. Tài xế hoàn tất kiểm tra xe, ngựa và km đầu trước khi bắt đầu.', ['FLEET_COORDINATOR', 'ROUTE_COORDINATOR'], true, true],
      CUSTOMS_PLAN_UPDATED: ['Điều phối đã bổ sung kế hoạch cửa khẩu', 'Cửa khẩu và quốc gia nhập cảnh đã được cập nhật. Kiểm tra lộ trình mới trước khi ghi nhận thông quan.', ['TRANSPORT_SPECIALIST'], false, true],
      CUSTOMS_ARRIVED: ['Tài xế đã đến cửa khẩu', extra.reason, ['TRANSPORT_SPECIALIST']],
      CUSTOMS_UPDATED: ['Đã cập nhật kết quả thông quan', 'Kiểm tra kết quả thông quan trên chuyến trước khi tiếp tục hành trình.', [], false, true],
      CUSTOMS_REQUIRED: ['Chuyến quốc tế đã khởi hành — Theo dõi thông quan', 'Chuyên viên theo dõi chuyến và ghi nhận kết quả thông quan tại cửa khẩu trước khi tài xế đến điểm giao. Mở Chứng từ vận chuyển → Thông quan & kiểm dịch cửa khẩu.', ['TRANSPORT_SPECIALIST']],
      IN_TRANSIT: ['Chuyến đã khởi hành', 'Tài xế đã bắt đầu chuyến vận chuyển.', [], true],
      DELIVERING: ['Chuyến đang bàn giao', 'Tài xế đang bàn giao ngựa và sẽ xác nhận giao xong trên hệ thống.', [], true],
      POD_SIGNED: ['Khách hàng đã ký nhận', 'Tài xế kiểm tra km cuối và xác nhận hoàn thành chuyến.', [], false, true],
      COMPLETED: ['Chuyến đã hoàn thành', 'Tài xế đã xác nhận giao xong. Mở đơn để xem thông tin chuyến.', ['LOGISTICS_MANAGER'], true],
      SOS: ['SOS — Cần tiếp nhận ngay', extra.reason || 'Có sự cố khẩn cấp. Mở xử lý SOS và xác nhận tiếp nhận.', ['LOGISTICS_MANAGER', 'FLEET_COORDINATOR', 'ROUTE_COORDINATOR']],
      SOS_RESOLVED: ['Sự cố đã được xử lý', 'Kiểm tra trạng thái chuyến và hướng dẫn điều phối trước khi tiếp tục.', [], false, true]
    };
    const event = events[kind];
    if (!event) return;
    const [title, message, roles, customer, crew] = event;
    const ids = [customer && order.customerId, crew && route?.driverId, crew && route?.escortId].filter(Boolean);
    const recipients = await User.find({ isActive: true, $or: [{ role: { $in: roles } }, { _id: { $in: ids } }] }).select('_id role').lean();
    await deliver(recipients, `${kind}:${key}`, user => {
      const specialist = user.role === 'TRANSPORT_SPECIALIST';
      const field = ['DRIVER', 'ESCORT'].includes(user.role);
      const document = kind.startsWith('DOC_');
      let webPath = `/orders/${order._id}${document ? '?tab=documents' : ''}`;
      if (kind === 'SOS') webPath = '/incidents/sos';
      else if (specialist) webPath = `/specialist/compliance?orderId=${order._id}`;
      else if (user.role === 'LOGISTICS_MANAGER' && ['CREATED', 'DEPOSIT_PAID', 'PLAN_CONFIRMED', 'PLAN_DECLINED'].includes(kind)) webPath = `/manager/${kind === 'PLAN_CONFIRMED' ? 'approvals' : 'intake'}?orderId=${order._id}`;
      else if (['FLEET_COORDINATOR', 'ROUTE_COORDINATOR'].includes(user.role)) webPath = `/fleet/trips/${order._id}`;
      return { title: `${title} · ${order.bookingCode}`, message, webPath, mobilePath: field && route ? `/trips/${route._id}` : undefined, urgent: kind === 'SOS' };
    });
  } catch (error) {
    // A notification failure must not turn an already committed business operation into a failed payment or duplicate request.
    console.error('Notification delivery failed:', kind, error.message);
  }
};
