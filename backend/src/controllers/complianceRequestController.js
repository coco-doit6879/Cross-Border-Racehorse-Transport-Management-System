const Doc = require('../models/ComplianceDoc');
const Order = require('../models/Order');
const File = require('../models/HorseFile');
const editable = ['APPROVED', 'DOCS_PROCESSING', 'CLEARED_FOR_TRANSPORT'];
const reviewer = user => user.role === 'TRANSPORT_SPECIALIST' && user.effectivePermissions?.includes('compliance:review');
const fail = (res, code, message) => res.status(code).json({ success: false, message });
const owns = (order, user) => String(order.customerId) === String(user._id);

exports.checklist = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return fail(res, 404, 'Không tìm thấy đơn.');
    if (!owns(order, req.user) && !reviewer(req.user)) return fail(res, 403, 'Bạn không có quyền xem giấy tờ của đơn này.');
    const docs = await Doc.find({ orderId: order._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: docs });
  } catch (err) { next(err); }
};

exports.request = async (req, res, next) => {
  try {
    if (!reviewer(req.user)) return fail(res, 403, 'Chỉ Chuyên viên Thủ tục & Kiểm dịch được yêu cầu bổ sung.');
    const { orderId, horseId, documentType, requestReason } = req.body;
    if (!String(documentType || '').trim() || !String(requestReason || '').trim() || documentType.length > 150 || requestReason.length > 2000) return fail(res, 400, 'Nhập loại giấy tờ và nội dung yêu cầu (tối đa 2000 ký tự).');
    const order = await Order.findById(orderId);
    if (!order) return fail(res, 404, 'Không tìm thấy đơn.');
    if (!editable.includes(order.status)) return fail(res, 409, 'Chỉ bổ sung giấy tờ sau khi đơn được duyệt và trước khi vận chuyển.');
    if (horseId && !order.horseIds.some(id => String(id) === String(horseId))) return fail(res, 400, 'Ngựa không thuộc đơn này.');
    // Revoke clearance before creating a new outstanding requirement.
    await Order.updateOne({ _id: orderId, status: { $in: editable } }, { $set: { status: 'DOCS_PROCESSING' } });
    const doc = await Doc.create({ orderId, horseId: horseId || undefined, documentType: documentType.trim(), countryCode: order.destination.countryCode, requestReason: requestReason.trim(), requestedBy: req.user._id, requestedAt: new Date(), status: 'PENDING_UPLOAD', history: [{ action: 'REQUESTED', actorId: req.user._id, notes: requestReason.trim() }] });
    res.status(201).json({ success: true, data: doc });
  } catch (err) { next(err); }
};

exports.upload = async (req, res, next) => {
  try {
    const doc = await Doc.findById(req.body.documentId);
    if (!doc) return fail(res, 404, 'Không tìm thấy yêu cầu giấy tờ.');
    const order = await Order.findById(doc.orderId);
    if (!order || !owns(order, req.user)) return fail(res, 403, 'Bạn chỉ được nộp giấy tờ cho đơn của mình.');
    if (!editable.includes(order.status)) return fail(res, 409, 'Đơn không còn nhận bổ sung giấy tờ.');
    const match = /^\/horses\/files\/([a-f0-9]{24})$/i.exec(req.body.fileUrl || '');
    const file = match && await File.findById(match[1]);
    if (!file || String(file.ownerId) !== String(req.user._id)) return fail(res, 400, 'Vui lòng tải tệp của bạn lên hệ thống.');
    const expiry = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
    if (expiry && (!Number.isFinite(expiry.getTime()) || expiry < new Date(order.requestedDepartureDate))) return fail(res, 400, 'Giấy tờ phải còn hiệu lực đến ngày khởi hành.');
    const updated = await Doc.findOneAndUpdate({ _id: doc._id, status: { $in: ['PENDING_UPLOAD', 'REJECTED'] } }, { $set: { fileUrl: req.body.fileUrl, expiresAt: expiry, status: 'PENDING_REVIEW', rejectionReason: '', verifiedBy: null }, $push: { history: { action: 'SUBMITTED', actorId: req.user._id, fileUrl: req.body.fileUrl, at: new Date() } } }, { new: true });
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
    await Order.updateOne({ _id: doc.orderId, status: { $in: editable } }, { $set: { status: outstanding ? 'DOCS_PROCESSING' : 'CLEARED_FOR_TRANSPORT' } });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};
