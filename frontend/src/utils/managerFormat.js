export const TRIP_STATUS_LABELS = {
  PENDING_APPROVAL: 'Chờ phê duyệt',
  APPROVED: 'Đã phê duyệt',
  PLANNED: 'Sắp thực hiện',
  SCHEDULED: 'Đã xếp lịch',
  CLEARED_FOR_TRANSPORT: 'Đã thông quan',
  IN_TRANSIT: 'Đang vận chuyển',
  DELIVERING: 'Đang giao',
  COMPLETED: 'Hoàn thành',
  REJECTED: 'Bị từ chối',
  CANCELLED: 'Đã hủy'
};

export const PERSON_STATUS_LABELS = { ACTIVE: 'Đang hoạt động', INACTIVE: 'Ngừng hoạt động' };

export const formatDateTime = (value) => value
  ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  : '—';

export const formatDate = (value) => value
  ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' }).format(new Date(value))
  : '—';

export const getAssignmentState = (trip) => {
  if (trip.driverId && trip.escortId) return 'FULL';
  if (trip.driverId || trip.escortId) return 'PARTIAL';
  return 'EMPTY';
};

export const ASSIGNMENT_LABELS = { FULL: 'Đủ nhân sự', PARTIAL: 'Thiếu nhân sự', EMPTY: 'Chưa phân công' };

export const isTripEditable = (trip) => {
  if (!trip) return false;
  return trip.paymentStatus === 'PAID' && !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(trip.status);
};



// VNPAY returns local Vietnam time as YYYYMMDDHHmmss; API dates use ISO.
export function formatPaymentDate(value) {
  if (!value) return '—';
  const text=String(value);
  const iso=/^\d{14}$/.test(text)?`${text.slice(0,4)}-${text.slice(4,6)}-${text.slice(6,8)}T${text.slice(8,10)}:${text.slice(10,12)}:${text.slice(12,14)}+07:00`:text;
  const date=new Date(iso);
  return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(date);
}
