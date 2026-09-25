import React from 'react';
import { AlertTriangle, Gauge, Home, Map, PackageSearch, Route, UserRound, UsersRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { USER_ROLES } from '../../utils/constants';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import { isManagerDemoEnabled } from '../../config/managerDemo';

const Sidebar = () => {
  const user = useAuthStore((state) => state.user);
  const OPERATIONAL_ROLES = [USER_ROLES.LOGISTICS_MANAGER, USER_ROLES.FLEET_COORDINATOR, USER_ROLES.ROUTE_COORDINATOR, USER_ROLES.TRANSPORT_SPECIALIST];
  const isManager = isManagerDemoEnabled || OPERATIONAL_ROLES.includes(user?.role);

  const baseItems = [
    { to: '/', label: 'Trang chủ', icon: Home, visible: true },
    { to: '/orders', label: 'Đơn vận chuyển', icon: PackageSearch, visible: true },
    { to: '/horses', label: 'Hồ sơ ngựa', icon: PackageSearch, visible: user?.role === USER_ROLES.CUSTOMER },
    { to: '/routes/tracking', label: 'Theo dõi tuyến', icon: Map, visible: true },
    { to: '/incidents/sos', label: 'Cảnh báo SOS', icon: AlertTriangle, visible: hasPermission(user, PERMISSIONS.SOS_MANAGE) }
  ].filter((item) => item.visible);

  const managerItems = [
    { to: '/manager', label: 'Tổng quan', icon: Gauge },
    { to: '/manager/drivers', label: 'Tài xế', icon: UserRound },
    { to: '/manager/escorts', label: 'Phụ xe', icon: UsersRound },
    { to: '/manager/trips', label: 'Chuyến vận chuyển', icon: Route }
  ];
  if ([USER_ROLES.TRANSPORT_SPECIALIST, USER_ROLES.LOGISTICS_MANAGER].includes(user?.role)) {
    managerItems.push({ to: '/horses', label: user?.role === USER_ROLES.TRANSPORT_SPECIALIST ? 'Kiểm duyệt sức khỏe ngựa' : 'Hồ sơ ngựa', icon: PackageSearch });
  }
  if ([USER_ROLES.LOGISTICS_MANAGER, USER_ROLES.FLEET_COORDINATOR].includes(user?.role)) {
    managerItems.push({ to: '/manager/schedules', label: 'Lịch vận chuyển cố định', icon: Route });
  }

  return (
    <aside className="app-sidebar">
      <div className="app-sidebar__brand">CBRT</div>
      <nav aria-label="Điều hướng chính">
        {isManager ? <p className="app-sidebar__label">Quản lý logistics</p> : null}
        {(isManager ? managerItems : baseItems).map(({ to, label, icon: Icon }) => (
          <NavLink className={({ isActive }) => `app-sidebar__link ${isActive ? 'is-active' : ''}`} to={to} key={to} end={to === '/' || to === '/manager'}>
            <Icon size={18} /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
