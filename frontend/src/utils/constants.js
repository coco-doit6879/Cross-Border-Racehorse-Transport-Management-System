// Frontend Shared Constants
export const APP_NAME = 'Cross-Border Racehorse Transport System';

export const USER_ROLES = {
  LOGISTICS_MANAGER: 'LOGISTICS_MANAGER',
  TRANSPORT_SPECIALIST: 'TRANSPORT_SPECIALIST',
  FLEET_COORDINATOR: 'FLEET_COORDINATOR',
  ROUTE_COORDINATOR: 'ROUTE_COORDINATOR',
  DRIVER: 'DRIVER',
  ESCORT: 'ESCORT',
  DRIVER_ESCORT: 'DRIVER_ESCORT',
  CUSTOMER: 'CUSTOMER'
};

export const ORDER_STATUS_LABELS = {
  PENDING_APPROVAL: 'Chờ phê duyệt',
  APPROVED: 'Đã phê duyệt',
  REJECTED: 'Đã từ chối',
  DOCS_PROCESSING: 'Đang xử lý hồ sơ',
  CLEARED_FOR_TRANSPORT: 'Đủ điều kiện vận chuyển',
  IN_TRANSIT: 'Đang vận chuyển',
  INCIDENT_HANDLING: 'Đang xử lý sự cố',
  DELIVERING: 'Đang bàn giao',
  COMPLETED: 'Hoàn tất'
};

export const USER_ROLE_LABELS = {
  LOGISTICS_MANAGER: 'Quản lý logistics',
  TRANSPORT_SPECIALIST: 'Chuyên viên thủ tục & kiểm dịch',
  FLEET_COORDINATOR: 'Điều phối viên đội xe & lộ trình',
  ROUTE_COORDINATOR: 'Điều phối viên đội xe & lộ trình',
  DRIVER: 'Tài xế chuyên dụng',
  ESCORT: 'Chuyên viên chăm sóc',
  DRIVER_ESCORT: 'Tài xế / Hộ tống',
  CUSTOMER: 'Khách hàng'
};
