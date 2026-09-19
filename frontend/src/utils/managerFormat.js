export const TRIP_STATUS_LABELS = {
  PLANNED: 'Sắp thực hiện',
  IN_TRANSIT: 'Đang vận chuyển',
  COMPLETED: 'Hoàn thành',
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

export const isTripEditable = (trip) => trip.status === 'PLANNED' && new Date(trip.startAt) > new Date();

