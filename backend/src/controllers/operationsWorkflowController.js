const Order = require('../models/Order');
const Route = require('../models/TransportRoute');
const Horse = require('../models/Horse');
const User = require('../models/User');
const { logAudit } = require('../utils/auditLogger');
const { id, has, staff, assigned, canRead, financials, stageReady } = require('../services/operationsWorkflow');
const { locationProblem, activeIncident, validCoordinates, distanceKm } = require('../services/tripSafety');
const { STOPS } = require('../config/transportCatalog');
const fail = (res, status, message) => res.status(status).json({ success: false, message });
const text = value => typeof value === 'string' ? value.trim().slice(0, 2000) : '';

exports.customers = async (req, res, next) => {
  try {
    if (!staff(req.user)) return fail(res, 403, 'Không có quyền nhập hỗ trợ.');
    const customers = await User.find({ role: 'CUSTOMER', isActive: true }).select('fullName email phone');
    const horses = await Horse.find({}).select('name ownerId currentStopId reviewStatus');
    res.json({ success: true, data: { customers, horses } });
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('horseIds', 'name microchipId');
    if (!order) return fail(res, 404, 'Không tìm thấy đơn.');
    const route = await Route.findOne({ orderId: order._id });
    if (!canRead(order, route, req.user)) return fail(res, 403, 'Không có quyền xem vận đơn.');
    res.json({ success: true, data: { order, route, financials: financials(order), destinationOptions: STOPS.filter(s => s.countryCode === order.destination.countryCode) } });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return fail(res, 404, 'Không tìm thấy đơn.');
    const route = await Route.findOne({ orderId: order._id });
    if (!canRead(order, route, req.user)) return fail(res, 403, 'Không có quyền xử lý đơn.');
    const { action, version } = req.body;
    const exceptionAction = ['REQUEST_EXCEPTION', 'REVIEW_EXCEPTION', 'EXECUTE_EXCEPTION'].includes(action);
    if (!exceptionAction && (order.settlement?.closedAt || ['CANCELLED', 'REJECTED'].includes(order.status))) return fail(res, 409, 'Đơn đã đóng hoặc hủy.');
    const staffOnly = ['SURCHARGE', 'REVIEW_SURCHARGE', 'RECEIPT', 'CLOSE', 'RESUBMIT'];
    if (staffOnly.includes(action) && !staff(req.user)) return fail(res, 403, 'Chỉ nhân viên vận hành được thực hiện.');
    let target = order;
    let model = Order;
    if (['PLAN_PATH', 'ACCEPT', 'ACCEPT_RESCUE', 'LOAD', 'UNLOAD', 'ODOMETER', 'VERIFY_DISTANCE', 'CLEARANCE'].includes(action)) {
      if (!route) return fail(res, 409, 'Chưa tạo vận đơn.');
      target = route; model = Route;
      if (!staff(req.user) && !assigned(route, req.user)) return fail(res, 403, 'Không được phân công chuyến này.');
    }
    if (!Number.isInteger(version) || version !== (target.operationsVersion || 0)) return fail(res, 409, 'Dữ liệu đã thay đổi. Hãy tải lại trước khi cập nhật.');
    const now = new Date();
    switch (action) {
      case 'REQUEST_EXCEPTION': {
        const { kind, amountVnd } = req.body;
        if (!['REFUND', 'COMPENSATION', 'DESTINATION_CHANGE'].includes(kind) || !text(req.body.reason) || !text(req.body.evidence)) return fail(res, 400, 'Cần loại yêu cầu, lý do và chứng từ/bằng chứng.');
        if (kind === 'DESTINATION_CHANGE') {
          const stop = STOPS.find(s => s.id === req.body.proposedStopId && s.countryCode === order.destination.countryCode);
          if (!route || ['COMPLETED', 'CANCELLED'].includes(route.status) || !stop || stop.id === order.destinationStopId) return fail(res, 409, 'Chọn điểm giao khác trong cùng quốc gia; đổi quốc gia cần lập lại hồ sơ vận chuyển.');
        } else if (!Number.isSafeInteger(amountVnd) || amountVnd <= 0) return fail(res, 400, 'Số tiền đề nghị phải là số nguyên dương.');
        order.exceptionRequests ||= [];
        if (order.exceptionRequests.some(x => x.kind === kind && x.status === 'PENDING')) return fail(res, 409, 'Đã có yêu cầu cùng loại đang chờ quản lý duyệt.');
        const stop = STOPS.find(s => s.id === req.body.proposedStopId);
        order.exceptionRequests.push({ kind, amountVnd: kind === 'DESTINATION_CHANGE' ? undefined : amountVnd, reason: text(req.body.reason), evidence: text(req.body.evidence), proposedDestination: kind === 'DESTINATION_CHANGE' ? stop.name : undefined, proposedStopId: kind === 'DESTINATION_CHANGE' ? stop.id : undefined, requestedBy: req.user._id });
        break;
      }
      case 'REVIEW_EXCEPTION': {
        if (!has(req.user, 'user:manage')) return fail(res, 403, 'Chỉ quản lý được duyệt từng trường hợp.');
        const item = order.exceptionRequests?.id(req.body.itemId);
        if (!item || item.status !== 'PENDING' || !['APPROVED', 'REJECTED'].includes(req.body.status)) return fail(res, 409, 'Yêu cầu không còn chờ duyệt.');
        if (!text(req.body.reason)) return fail(res, 400, 'Cần lý do quyết định của quản lý.');
        item.status = req.body.status; item.decisionReason = text(req.body.reason); item.reviewedAt = now; item.reviewedBy = req.user._id;
        // Approval never asserts that money was transferred or changes the
        // contractual delivery point without a separately verified execution.
        break;
      }
      case 'EXECUTE_EXCEPTION': {
        if (!has(req.user, 'user:manage')) return fail(res, 403, 'Chỉ quản lý xác nhận chứng từ chi tiền.');
        const item = order.exceptionRequests?.id(req.body.itemId);
        if (!item || item.kind === 'DESTINATION_CHANGE') return fail(res, 400, 'Yêu cầu chi tiền không hợp lệ.');
        if (item.status === 'EXECUTED') return res.json({ success: true, isDuplicate: true });
        if (item.status !== 'APPROVED') return fail(res, 409, 'Yêu cầu chưa được duyệt.');
        const reference = text(req.body.reference);
        if (!reference || req.body.confirmTransferred !== true) return fail(res, 400, 'Cần mã chứng từ và xác nhận đã chuyển tiền thực tế.');
        if (order.exceptionRequests.some(x => x.executionReference === reference)) return fail(res, 409, 'Chứng từ này đã được ghi nhận.');
        if (item.kind === 'REFUND') {
          const payments = await require('../models/PaymentTransaction').find({ orderId: order._id, status: 'PAID' });
          const captured = payments.reduce((sum, p) => sum + p.amountVnd, 0) + (order.settlement?.receipts || []).reduce((sum, p) => sum + p.amountVnd, 0);
          const refunded = order.exceptionRequests.filter(x => x.kind === 'REFUND' && x.status === 'EXECUTED').reduce((sum, x) => sum + x.amountVnd, 0);
          if (item.amountVnd > captured - refunded) return fail(res, 409, 'Số hoàn vượt tiền thực thu còn có thể hoàn. Cần đối soát giao dịch trước.');
        }
        item.status = 'EXECUTED'; item.executionReference = reference; item.executedAt = now; item.executedBy = req.user._id;
        break;
      }
      case 'CONFIRM':
      case 'REQUEST_CHANGES':
        if (id(order.customerId) !== id(req.user._id) || order.status !== 'PENDING_APPROVAL' || !['PENDING', 'CHANGES_REQUESTED'].includes(order.customerConfirmation)) return fail(res, 409, 'Chỉ khách hàng của đơn được xác nhận bản nháp đang chờ.');
        if (action === 'REQUEST_CHANGES' && !text(req.body.notes)) return fail(res, 400, 'Nhập nội dung cần sửa.');
        order.customerConfirmation = action === 'CONFIRM' ? 'CONFIRMED' : 'CHANGES_REQUESTED';
        order.confirmationNotes = text(req.body.notes); order.confirmedAt = action === 'CONFIRM' ? now : undefined;
        break;
      case 'RESUBMIT':
        if (order.status !== 'PENDING_APPROVAL' || order.customerConfirmation !== 'CHANGES_REQUESTED') return fail(res, 409, 'Khách chưa yêu cầu sửa.');
        order.specialRequirements = text(req.body.notes); order.customerConfirmation = 'PENDING';
        break;
      case 'SURCHARGE':
        if (!['APPROVED', 'DOCS_PROCESSING', 'CLEARED_FOR_TRANSPORT', 'IN_TRANSIT', 'DELIVERING', 'COMPLETED'].includes(order.status)) return fail(res, 409, 'Đơn chưa được tiếp nhận.');
        if (!text(req.body.description) || !Number.isSafeInteger(req.body.amountVnd) || req.body.amountVnd <= 0) return fail(res, 400, 'Nhập mô tả và số tiền nguyên dương.');
        order.settlement.surcharges.push({ description: text(req.body.description), amountVnd: req.body.amountVnd, createdBy: req.user._id, status: 'PENDING' });
        break;
      case 'REVIEW_SURCHARGE': {
        if (!has(req.user, 'user:manage')) return fail(res, 403, 'Quản lý logistics duyệt phụ thu.');
        const item = order.settlement.surcharges.id(req.body.itemId);
        if (!item || item.status !== 'PENDING' || !['APPROVED', 'REJECTED'].includes(req.body.status)) return fail(res, 409, 'Khoản phụ thu không còn chờ duyệt.');
        item.status = req.body.status; item.reviewedBy = req.user._id;
        break;
      }
      case 'RECEIPT': {
        if (!has(req.user, 'user:manage')) return fail(res, 403, 'Quản lý logistics xác nhận thu tiền.');
        const balance = financials(order);
        if (!text(req.body.reference) || !['CASH', 'BANK_TRANSFER'].includes(req.body.method) || !Number.isSafeInteger(req.body.amountVnd) || req.body.amountVnd <= 0 || req.body.amountVnd > balance.extra - balance.extrasPaid) return fail(res, 400, 'Nhập mã chứng từ, phương thức và số tiền không vượt phụ thu còn nợ.');
        if (order.settlement.receipts.some(r => r.reference === text(req.body.reference))) return fail(res, 409, 'Mã chứng từ đã ghi nhận.');
        order.settlement.receipts.push({ reference: text(req.body.reference), amountVnd: req.body.amountVnd, method: req.body.method, recordedBy: req.user._id });
        break;
      }
      case 'CLOSE':
        if (!has(req.user, 'user:manage')) return fail(res, 403, 'Quản lý logistics đóng quyết toán.');
        if (order.exceptionRequests?.some(x => !['REJECTED', 'EXECUTED'].includes(x.status))) return fail(res, 409, 'Còn yêu cầu ngoại lệ cần xử lý/đối soát trước khi đóng quyết toán.');
        if (order.status !== 'COMPLETED' || financials(order).outstanding > 0 || order.settlement.surcharges.some(s => s.status === 'PENDING') || !route?.distanceVerifiedAt) return fail(res, 409, 'Cần giao xong, duyệt hết phụ thu, thu đủ tiền và xác nhận km thực tế.');
        order.settlement.closedAt = now; order.settlement.closedBy = req.user._id;
        break;
      case 'PLAN_PATH': {
        if (!has(req.user, 'route:dispatch') || !['SCHEDULED', 'INCIDENT_HANDLING'].includes(route.status)) return fail(res, 403, 'Điều phối cập nhật đường đi khi chưa chạy hoặc đang dừng xử lý.');
        const path = req.body.path;
        if (!Array.isArray(path) || path.length < 2 || path.length > 5000 || path.some(p => !validCoordinates(p)) || distanceKm(path[0], order.origin.coordinates) > 0.5 || distanceKm(path[path.length - 1], order.destination.coordinates) > 0.5) return fail(res, 400, 'Đường đi cần 2–5000 tọa độ [kinh độ, vĩ độ], bắt đầu/kết thúc đúng điểm đón/giao trong 500 m.');
        route.plannedPath = path;
        break;
      }
      case 'ACCEPT_RESCUE':
        if (id(route.driverId) !== id(req.user._id) || route.status !== 'INCIDENT_HANDLING' || !route.rescuePending) return fail(res, 403, 'Chỉ tài xế mới được tiếp nhận xe cứu hộ.');
        if (!Number.isFinite(req.body.value) || req.body.value < 0 || req.body.confirmAllHorses !== true) return fail(res, 400, 'Cần km đầu xe mới và xác nhận đã đối chiếu đủ ngựa.');
        route.odometerStart = req.body.value; route.acceptedAt = now; route.acceptedBy = req.user._id; route.rescuePending = false;
        route.rescueHistory[route.rescueHistory.length - 1].acceptedAt = now;
        break;
      case 'ACCEPT':
        if (id(route.driverId) !== id(req.user._id) || route.status !== 'SCHEDULED') return fail(res, 403, 'Chỉ tài xế được phân công nhận vận đơn trước khởi hành.');
        route.acceptedAt = now; route.acceptedBy = req.user._id;
        break;
      case 'ODOMETER': {
        if (!assigned(route, req.user)) return fail(res, 403, 'Tổ vận chuyển ghi chỉ số km.');
        const value = req.body.value;
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return fail(res, 400, 'Chỉ số km phải là số không âm.');
        if (req.body.kind === 'START' && route.status === 'SCHEDULED') route.odometerStart = value;
        else if (req.body.kind === 'END' && ['DELIVERING', 'COMPLETED'].includes(route.status) && route.odometerStart != null && value >= route.odometerStart) route.odometerEnd = value;
        else return fail(res, 409, 'Chỉ số hoặc giai đoạn ghi km không hợp lệ.');
        route.distanceVerifiedAt = undefined; route.distanceVerifiedBy = undefined;
        break;
      }
      case 'VERIFY_DISTANCE':
        if (!has(req.user, 'route:dispatch') || route.odometerEnd == null || route.odometerStart == null || route.odometerEnd < route.odometerStart) return fail(res, 409, 'Điều phối xác nhận khi đã có chỉ số km đầu và cuối hợp lệ.');
        route.distanceVerifiedAt = now; route.distanceVerifiedBy = req.user._id;
        break;
      case 'LOAD':
      case 'UNLOAD': {
        if (!assigned(route, req.user)) return fail(res, 403, 'Tổ vận chuyển xác nhận nhận/giao ngựa.');
        if (!order.horseIds.some(h => id(h) === req.body.horseId)) return fail(res, 400, 'Ngựa không thuộc vận đơn.');
        let item = route.horseMovements.find(h => id(h.horseId) === req.body.horseId);
        if (action === 'LOAD') {
          if (route.status !== 'SCHEDULED' || !route.acceptedAt || item?.loadedAt) return fail(res, 409, 'Nhận vận đơn trước khi xác nhận ngựa lên xe.');
          route.horseMovements.push({ horseId: req.body.horseId, loadedAt: now, recordedBy: req.user._id });
        } else {
          if (route.status !== 'DELIVERING' || !item?.loadedAt || item.unloadedAt) return fail(res, 409, 'Chỉ giao ngựa đã lên xe tại giai đoạn bàn giao.');
          const gpsProblem = locationProblem(route.currentLocation, order.destination?.coordinates);
          if (gpsProblem) return fail(res, 409, gpsProblem);
          if (await activeIncident(route._id)) return fail(res, 409, 'Cần giải quyết sự cố trước khi xác nhận giao ngựa.');
          if (!(await stageReady(order._id, 'DELIVERY'))) return fail(res, 409, 'Hồ sơ giao nhận chưa hoàn tất.');
          item.unloadedAt = now; item.recordedBy = req.user._id;
        }
        break;
      }
      case 'CLEARANCE': {
        if (!has(req.user, 'compliance:review') || !['SCHEDULED', 'IN_TRANSIT', 'INCIDENT_HANDLING', 'DELIVERING'].includes(route.status)) return fail(res, 403, 'Chuyên viên cập nhật thông quan khi chuyến đang xử lý.');
        const { horseId, countryCode, status } = req.body;
        if (!order.horseIds.some(h => id(h) === horseId) || !/^[A-Z]{2}$/.test(countryCode || '') || !text(req.body.checkpoint) || !['PENDING', 'CLEARED', 'HELD'].includes(status) || (status === 'CLEARED' && !text(req.body.referenceNumber))) return fail(res, 400, 'Nhập ngựa, mã quốc gia, cửa khẩu, trạng thái và số chứng từ khi đã thông quan.');
        const entry = { horseId, countryCode, checkpoint: text(req.body.checkpoint), status, referenceNumber: text(req.body.referenceNumber), notes: text(req.body.notes), updatedBy: req.user._id, updatedAt: now };
        // Append revisions so previous clearance decisions remain visible.
        route.clearances.push(entry);
        break;
      }
      default: return fail(res, 400, 'Thao tác không hợp lệ.');
    }
    if (exceptionAction) order.operationsNotices.push({ message: action === 'REQUEST_EXCEPTION' ? 'Đã gửi yêu cầu ngoại lệ tới quản lý.' : action === 'REVIEW_EXCEPTION' ? `Quản lý đã ${req.body.status === 'APPROVED' ? 'duyệt' : 'từ chối'} yêu cầu: ${text(req.body.reason)}` : `Đã ghi nhận chứng từ chi tiền: ${text(req.body.reference)}`, actorId: req.user._id });
    const data = {};
    for (const path of target.directModifiedPaths()) data[path] = target.get(path);
    const unset = Object.fromEntries(Object.entries(data).filter(([, value]) => value === undefined).map(([key]) => [key, 1]));
    const set = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
    const updated = await model.findOneAndUpdate({ _id: target._id, status: target.status, $or: [{ operationsVersion: version }, ...(version === 0 ? [{ operationsVersion: { $exists: false } }] : [])] }, { $set: { ...set, operationsVersion: version + 1 }, ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { new: true, runValidators: true });
    if (!updated) return fail(res, 409, 'Có cập nhật đồng thời. Vui lòng tải lại.');
    await logAudit({ actorId: req.user._id, action: `OPERATIONS_${action}`, resource: model.modelName, resourceId: id(target._id), result: 'SUCCESS', metadata: { orderId: id(order._id), version: version + 1 }, ipAddress: req.ip, userAgent: req.get('User-Agent') });
    res.json({ success: true });
  } catch (err) { next(err); }
};
