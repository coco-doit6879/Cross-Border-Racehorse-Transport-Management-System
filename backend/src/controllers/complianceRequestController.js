const Doc = require('../models/ComplianceDoc');
const Order = require('../models/Order');
const File = require('../models/HorseFile');
const Route = require('../models/TransportRoute');
const { canRead, staff } = require('../services/operationsWorkflow');
const editable = ['APPROVED', 'DOCS_PROCESSING', 'CLEARED_FOR_TRANSPORT', 'IN_TRANSIT', 'DELIVERING'];
const reviewer = user => user.role === 'TRANSPORT_SPECIALIST' && user.effectivePermissions?.includes('compliance:review');
const fail = (res, code, message) => res.status(code).json({ success: false, message });
const owns = (order, user) => String(order.customerId) === String(user._id);

exports.checklist = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return fail(res, 404, 'Không tìm thấy đơn.');
    const route = await Route.findOne({ orderId: order._id });
    if (!canRead(order, route, req.user)) return fail(res, 403, 'Bạn không có quyền xem giấy tờ của đơn này.');
    const docs = await Doc.find({ orderId: order._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: docs });
  } catch (err) { next(err); }
};

exports.request = async (req, res, next) => {
  try {
    if (!reviewer(req.user)) return fail(res, 403, 'Chỉ Chuyên viên Thủ tục & Kiểm dịch được yêu cầu bổ sung.');
    const { orderId, horseId, documentType, requestReason, category = 'LEGAL', stage = 'DEPARTURE', checkpoint = '', countryCode } = req.body;
    if (!['LEGAL', 'HORSE'].includes(category) || !['DEPARTURE', 'BORDER', 'DELIVERY'].includes(stage) || (stage === 'BORDER' && !String(checkpoint).trim()) || (countryCode && !/^[A-Z]{2}$/.test(countryCode))) return fail(res, 400, 'Nhóm hồ sơ, quốc gia hoặc giai đoạn/cửa khẩu không hợp lệ.');
    if (!String(documentType || '').trim() || !String(requestReason || '').trim() || documentType.length > 150 || requestReason.length > 2000) return fail(res, 400, 'Nhập loại giấy tờ và nội dung yêu cầu (tối đa 2000 ký tự).');
    const order = await Order.findById(orderId);
    if (!order) return fail(res, 404, 'Không tìm thấy đơn.');
    if (!editable.includes(order.status)) return fail(res, 409, 'Chỉ bổ sung giấy tờ sau khi đơn được duyệt và trước khi vận chuyển.');
    if (horseId && !order.horseIds.some(id => String(id) === String(horseId))) return fail(res, 400, 'Ngựa không thuộc đơn này.');
    // Revoke clearance before creating a new outstanding requirement.
    await Order.updateOne({ _id: orderId, status: { $in: ['APPROVED', 'CLEARED_FOR_TRANSPORT'] } }, { $set: { status: 'DOCS_PROCESSING' } });
    const doc = await Doc.create({ orderId, horseId: horseId || undefined, documentType: documentType.trim(), category, stage, checkpoint: String(checkpoint).trim(), countryCode: countryCode || order.destination.countryCode, requestReason: requestReason.trim(), requestedBy: req.user._id, requestedAt: new Date(), status: 'PENDING_UPLOAD', history: [{ action: 'REQUESTED', actorId: req.user._id, notes: requestReason.trim() }] });
    res.status(201).json({ success: true, data: doc });
  } catch (err) { next(err); }
};

exports.upload = async (req, res, next) => {
  try {
    const doc = await Doc.findById(req.body.documentId);
    if (!doc) return fail(res, 404, 'Không tìm thấy yêu cầu giấy tờ.');
    const order = await Order.findById(doc.orderId);
    if (!order || (doc.category === 'HORSE' ? !owns(order, req.user) && !reviewer(req.user) : !reviewer(req.user))) return fail(res, 403, 'Giấy tờ pháp lý do chuyên viên vận hành cập nhật.');
    if (!editable.includes(order.status)) return fail(res, 409, 'Đơn không còn nhận bổ sung giấy tờ.');
    const match = /^\/horses\/files\/([a-f0-9]{24})$/i.exec(req.body.fileUrl || '');
    const file = match && await File.findById(match[1]);
    if (!file || String(file.ownerId) !== String(req.user._id)) return fail(res, 400, 'Vui lòng tải tệp của bạn lên hệ thống.');
    const expiry = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
    if (expiry && (!Number.isFinite(expiry.getTime()) || expiry < new Date(order.requestedDepartureDate))) return fail(res, 400, 'Giấy tờ phải còn hiệu lực đến ngày khởi hành.');
    const updated = await Doc.findOneAndUpdate({ _id: doc._id, status: { $in: ['PENDING_UPLOAD', 'REJECTED'] } }, { $set: { fileUrl: req.body.fileUrl, referenceNumber: String(req.body.referenceNumber || '').slice(0, 200), expiresAt: expiry, status: 'PENDING_REVIEW', rejectionReason: '', verifiedBy: null }, $push: { history: { action: 'SUBMITTED', actorId: req.user._id, fileUrl: req.body.fileUrl, at: new Date() } } }, { new: true });
    if (!updated) return fail(res, 409, 'Giấy tờ đã được gửi thẩm định. Hãy tải lại trang.');
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

exports.review = async (req, res, next) => {
  try {
    if (!reviewer(req.user)) return fail(res, 403, 'Không có quyền thẩm định.');
    const { status, rejectionReason } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status) || (status === 'REJECTED' && !String(rejectionReason || '').trim())) return fail(res, 400, 'Cần quyết định và lý do yêu cầu bổ sung lại.');
    const doc = await Doc.findById(req.params.id);
    if (!doc) return fail(res, 404, 'Không tìm thấy giấy tờ.');
    const order = await Order.findById(doc.orderId);
    if (!order || !editable.includes(order.status)) return fail(res, 409, 'Đơn không còn ở giai đoạn thẩm định.');
    if (status === 'APPROVED' && (!doc.fileUrl || (doc.expiresAt && doc.expiresAt < new Date(order.requestedDepartureDate)))) return fail(res, 400, 'Tệp thiếu hoặc hết hiệu lực trước ngày khởi hành.');
    const updated = await Doc.findOneAndUpdate({ _id: doc._id, status: 'PENDING_REVIEW' }, { $set: { status, rejectionReason: rejectionReason || '', verifiedBy: req.user._id }, $push: { history: { action: status, notes: rejectionReason || '', actorId: req.user._id, at: new Date() } } }, { new: true });
    if (!updated) return fail(res, 409, 'Giấy tờ đã thay đổi. Vui lòng tải lại.');
    const outstanding = await Doc.exists({ orderId: doc.orderId, status: { $ne: 'APPROVED' } });
    await Order.updateOne({ _id: doc.orderId, status: { $in: ['APPROVED', 'DOCS_PROCESSING', 'CLEARED_FOR_TRANSPORT'] } }, { $set: { status: outstanding ? 'DOCS_PROCESSING' : 'CLEARED_FOR_TRANSPORT' } });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

exports.file = async (req, res, next) => {
  try {
    const doc = await Doc.findById(req.params.id);
    if (!doc) return fail(res, 404, 'Không tìm thấy giấy tờ.');
    const order = await Order.findById(doc.orderId);
    const route = await Route.findOne({ orderId: doc.orderId });
    if (!order || !canRead(order, route, req.user) || (!staff(req.user) && !owns(order, req.user) && doc.status !== 'APPROVED')) return fail(res, 403, 'Không có quyền xem giấy tờ chuyến này.');
    const match = /^\/horses\/files\/([a-f0-9]{24})$/i.exec(doc.fileUrl || '');
    const file = match && await File.findById(match[1]).select('+data');
    if (!file) return fail(res, 404, 'Chưa có tệp hợp lệ.');
    res.set({ 'Content-Type': file.mimeType, 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    res.send(file.data);
  } catch (err) { next(err); }
};
