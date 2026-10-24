export const CUSTOMER_ORDER_FILTERS = [
  ['all', 'Tất cả'], ['waiting', 'Chờ xác nhận'], ['additional', 'Cần bổ sung'],
  ['payment', 'Chờ thanh toán'], ['preparing', 'Chuẩn bị'], ['transit', 'Đang vận chuyển'],
  ['settlement', 'Đang bàn giao'], ['completed', 'Hoàn thành'], ['cancelled', 'Đã hủy / từ chối'],
];

export const ORDER_STEPS = ['Gửi đơn', 'Đặt cọc 30%', 'Duyệt đơn', 'Thanh toán đủ', 'Xe & lộ trình', 'Phân công kíp xe', 'Vận chuyển', 'Hoàn thành'];

export function customerOrderState(order) {
  const status = order.status;
  if (status === 'CANCELLED' || status === 'REJECTED') {
    return { group: 'cancelled', label: status === 'REJECTED' ? 'Đã từ chối' : 'Đã hủy', tone: 'muted', step: 0, message: order.cancellationReason || order.rejectionReason || 'Đơn đã dừng xử lý. Bạn có thể xem lại thông tin trong chi tiết đơn.' };
  }
  if (status === 'COMPLETED') return { group:'completed',label:'Hoàn thành',tone:'green',step:8,message:'Tài xế đã giao ngựa và hoàn thành chuyến đi.' };
  if (status === 'IN_TRANSIT' || status === 'INCIDENT_HANDLING') return { group: 'transit', label: status === 'INCIDENT_HANDLING' ? 'Đang xử lý sự cố' : 'Đang vận chuyển', tone: status === 'INCIDENT_HANDLING' ? 'amber' : 'green', step: 7, message: status === 'INCIDENT_HANDLING' ? 'Nhà xe đang xử lý sự cố. Xem thông tin và cập nhật trong chi tiết đơn.' : 'Ngựa đang trên hành trình. Bạn có thể theo dõi lộ trình và cập nhật sức khỏe trong chi tiết đơn.' };
  if (status === 'DELIVERING') return { group: 'settlement', label: 'Đang bàn giao', tone: 'blue', step: 7, message: 'Nhà xe đang bàn giao ngựa tại điểm đến. Kiểm tra thông tin giao nhận và quyết toán trong chi tiết đơn.' };
  if (order.customerConfirmation === 'CHANGES_REQUESTED') return { group: 'additional', label: 'Cần bổ sung', tone: 'amber', step: 2, message: order.confirmationNotes || 'Thông tin đơn cần được cập nhật. Mở chi tiết để xem yêu cầu bổ sung.' };
  const needsDeposit = status === 'PENDING_APPROVAL' && order.depositRequired && order.depositStatus === 'UNPAID';
  const needsBalance = ['APPROVED', 'DOCS_PROCESSING', 'CLEARED_FOR_TRANSPORT'].includes(status) && order.pricing?.totalAmountVnd > 0 && ['UNPAID', 'PARTIALLY_PAID'].includes(order.paymentStatus);
  if (needsDeposit || needsBalance) return { group: 'payment', label: needsDeposit ? 'Chờ đặt cọc' : 'Chờ thanh toán', tone: 'amber', step: needsDeposit ? 2 : 4, needsDeposit, canPay: needsDeposit ? order.depositAmountVnd > 0 && order.pricing?.totalAmountVnd > 0 : true, message: needsDeposit ? 'Thanh toán tiền đặt cọc để đơn được gửi duyệt.' : 'Hoàn tất thanh toán phần còn lại để chuẩn bị cho chuyến vận chuyển.' };
  if (status === 'PENDING_APPROVAL') return { group: 'waiting', label: 'Đã gửi, chờ tiếp nhận', tone: 'blue', step: order.depositStatus === 'PAID' ? 3 : 1, message: order.depositStatus === 'PAID' ? 'Đã nhận tiền đặt cọc. Đơn đang chờ quản lý duyệt. Sau khi được duyệt, bạn thanh toán phần tiền còn lại.' : 'Thanh toán tiền cọc 30% để gửi đơn cho quản lý duyệt.' };
  if (['APPROVED','DOCS_PROCESSING','CLEARED_FOR_TRANSPORT'].includes(status)) return {group:'preparing',label:order.preparation?.assignedAt?'Đã phân công kíp xe':order.preparation?.confirmedAt?'Chờ phân công tài xế':'Chờ điều phối xe và lộ trình',tone:'orange',step:order.preparation?.confirmedAt?6:5,message:order.preparation?.assignedAt?'Tài xế đã nhận được vận đơn và lộ trình. Theo dõi các mốc xác nhận ở Trang chủ.':order.preparation?.confirmedAt?'Điều phối đã xác nhận phương án. Quản lý sẽ phân công tài xế và phụ xe.':'Đơn đã được duyệt và thanh toán đủ. Điều phối đang chọn xe và lập lộ trình.'};
  return { group: 'other', label: status || 'Chưa cập nhật', tone: 'muted', step: 0, message: 'Xem chi tiết đơn để biết thông tin cập nhật từ nhà xe.' };
}

export function departureDay(order) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(order.departureLocalDate || '')) return order.departureLocalDate;
  const date = new Date(order.requestedDepartureDate);
  if (!order.requestedDepartureDate || Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: order.departureTimezone || 'Asia/Ho_Chi_Minh' }).format(date);
}

const normalized = (text) => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
export function matchesCustomerOrder(order, { query = '', status = 'all', from = '', to = '' } = {}) {
  if (status !== 'all' && customerOrderState(order).group !== status) return false;
  const haystack = [order.orderCode, order.bookingCode, order.origin, order.destination, order.routeLabel, ...(order.horses || []).map(horse => typeof horse === 'string' ? horse : horse.name)].join(' ');
  if (query.trim() && !normalized(haystack).includes(normalized(query))) return false;
  const day = departureDay(order);
  return !((from && (!day || day < from)) || (to && (!day || day > to)));
}

export function depositTimeLeft(order, now) {
  const due = new Date(order.depositDueAt).getTime();
  if (!order.depositDueAt || !Number.isFinite(due)) return '';
  const remaining = due - now;
  if (remaining <= 0) return 'Đã hết thời hạn đặt cọc. Mở chi tiết để kiểm tra trạng thái mới nhất.';
  const minutes = Math.ceil(remaining / 60000);
  const hours = Math.floor(minutes / 60);
  return `Đặt cọc ${order.depositPercent ? `${order.depositPercent}%` : ''} trong ${hours ? `${hours} giờ ` : ''}${minutes % 60} phút.`;
}
