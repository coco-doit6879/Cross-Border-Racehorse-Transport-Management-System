import React from 'react';
import { AlertTriangle, CalendarClock, DollarSign, Gauge, Home, Map, PackageCheck, PackageSearch, Route, Truck, UserRound, UsersRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { USER_ROLES } from '../../utils/constants';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import { isManagerDemoEnabled } from '../../config/managerDemo';
import { canAccessPage } from '../../utils/pageAccess';

const Sidebar = () => {
  const user = useAuthStore((state) => state.user);
  const OPERATIONAL_ROLES = [USER_ROLES.LOGISTICS_MANAGER, USER_ROLES.FLEET_COORDINATOR, USER_ROLES.ROUTE_COORDINATOR, USER_ROLES.TRANSPORT_SPECIALIST];
  const isManager = isManagerDemoEnabled || OPERATIONAL_ROLES.includes(user?.role);

  const baseItems = [
    { to: '/dashboard', label: 'Bảng điều khiển', icon: Gauge, visible: true },
    { to: '/orders', label: 'Đơn vận chuyển', icon: PackageSearch, visible: true },
    { to: '/horses', label: 'Hồ sơ ngựa', icon: PackageSearch, visible: user?.role === USER_ROLES.CUSTOMER },
    { to: '/routes/tracking', label: 'Theo dõi tuyến', icon: Map, visible: true },
    { to: '/incidents/sos', label: 'Cảnh báo SOS', icon: AlertTriangle, visible: hasPermission(user, PERMISSIONS.SOS_MANAGE) },
    { to: '/', label: 'Trang chủ giới thiệu', icon: Home, visible: true }
  ].filter((item) => item.visible);

  const logisticsItems = [
    { to: '/orders', label: 'Đơn hàng & quyết toán', icon: PackageSearch },
    { to: '/manager', label: 'Tổng quan', icon: Gauge },
    { to: '/manager/revenue', label: 'Doanh thu & Tài chính', icon: DollarSign },
    { to: '/manager/drivers', label: 'Tài xế', icon: UserRound },
    { to: '/manager/escorts', label: 'Phụ xe', icon: UsersRound },
    { to: '/manager/trips', label: 'Chuyến vận chuyển', icon: Route }
  ];
  logisticsItems.push({ to: '/horses', label: 'Hồ sơ ngựa', icon: PackageSearch });
  const specialistItems = [
    { to: '/manager', label: 'Bàn làm việc', icon: Gauge },
    { to: '/specialist/horses', label: 'Kiểm duyệt sức khỏe', icon: PackageSearch },
    { to: '/specialist/compliance', label: 'Giấy tờ kiểm dịch', icon: PackageCheck },
    { to: '/orders', label: 'Đơn vận chuyển', icon: Route }
  ];
  const fleetItems = [
    { to: '/orders', label: 'Đơn hàng & nhập hỗ trợ', icon: PackageSearch },
    { to: '/manager', label: 'Trung tâm điều phối', icon: Gauge },
    { to: '/manager/schedules', label: 'Lịch & giá cố định', icon: CalendarClock },
    { to: '/fleet/trips', label: 'Phân công chuyến', icon: Route },
    { to: '/fleet/vehicles', label: 'Đội xe', icon: Truck },
    { to: '/fleet/staff', label: 'Nhân sự vận hành', icon: UsersRound },
    { to: '/routes/tracking', label: 'Bản đồ GPS', icon: Map }
  ];
  const roleManagerItems = user?.role === USER_ROLES.TRANSPORT_SPECIALIST ? specialistItems : [USER_ROLES.FLEET_COORDINATOR, USER_ROLES.ROUTE_COORDINATOR].includes(user?.role) ? fleetItems : logisticsItems;
  const managerItems = hasPermission(user, PERMISSIONS.SOS_MANAGE)
    ? [...roleManagerItems, { to: '/incidents/sos', label: 'Cảnh báo SOS', icon: AlertTriangle }]
    : roleManagerItems;

  const isOperationsWorkspace = [USER_ROLES.TRANSPORT_SPECIALIST, USER_ROLES.FLEET_COORDINATOR, USER_ROLES.ROUTE_COORDINATOR].includes(user?.role);
  const workspaceLabel = user?.role === USER_ROLES.TRANSPORT_SPECIALIST ? 'Thủ tục & kiểm dịch' : isOperationsWorkspace ? 'Điều phối vận tải' : 'Quản lý logistics';

  return (
    <aside className="app-sidebar">
      <div className="app-sidebar__brand">CBRT</div>
      <nav aria-label="Điều hướng chính">
        {isManager ? <p className="app-sidebar__label">{workspaceLabel}</p> : null}
        {(isManager ? managerItems : baseItems).filter(item => canAccessPage(user, item.to)).map(({ to, label, icon: Icon }) => (
          <NavLink className={({ isActive }) => `app-sidebar__link ${isActive ? 'is-active' : ''}`} to={to} key={to} end={to === '/' || to === '/manager'}>
            {!isOperationsWorkspace && <Icon size={18} />}<span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
