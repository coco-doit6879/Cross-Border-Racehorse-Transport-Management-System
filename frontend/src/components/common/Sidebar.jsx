import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Gauge, Inbox, Users, Map, Route, ShieldCheck, Truck, FileCheck, AlertTriangle, DollarSign, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { USER_ROLE_LABELS } from '../../utils/constants';
import BrandLogo from './BrandLogo';
import { canAccessPage } from '../../utils/pageAccess';
const managerItems = [['/manager', 'Tổng quan', Gauge], ['/manager/intake', 'Tiếp nhận đơn', Inbox], ['/manager/approvals', 'Phân công kíp xe', Users], ['/manager/trips', 'Chuyến vận chuyển', Route], ['/manager/drivers', 'Tài xế', Users], ['/manager/escorts', 'Nhân viên hộ tống', Users], ['/incidents/sos', 'Sự cố & ngoại lệ', AlertTriangle], ['/manager/revenue', 'Doanh thu', DollarSign]];
const fleetItems = [['/fleet/trips', 'Xe & lộ trình', Route], ['/fleet/monitor', 'Giám sát hành trình', Map], ['/incidents/sos', 'Sự cố & ngoại lệ', AlertTriangle], ['/fleet/vehicles', 'Phương tiện', Truck], ['/fleet/staff', 'Tài xế & hộ tống', Users], ['/manager/schedules', 'Lịch & giá cước', FileCheck]];
const specialistItems = [['/specialist/horses', 'Hồ sơ sức khỏe', ShieldCheck], ['/specialist/compliance', 'Chứng từ vận chuyển', FileCheck]];
export default function Sidebar() {
  const user = useAuthStore(s => s.user),
    logout = useAuthStore(s => s.logout),
    navigate = useNavigate();
  const items = user?.role === 'LOGISTICS_MANAGER' ? managerItems : ['FLEET_COORDINATOR', 'ROUTE_COORDINATOR'].includes(user?.role) ? fleetItems : specialistItems;
  return <aside className="app-sidebar"><NavLink className="sidebar-brand" to={items[0][0]} aria-label="CBRT — Không gian điều hành"><BrandLogo /></NavLink><div className="app-sidebar__brand">Không gian điều hành</div><nav aria-label="Điều hướng chính">{items.filter(([to]) => canAccessPage(user, to)).map(([to, label, Icon]) => <NavLink end={to === '/manager' || to === '/fleet/trips'} key={to} to={to} className={({
        isActive
      }) => `app-sidebar__link ${isActive ? 'is-active' : ''}`}><Icon size={18} /><span>{label}</span></NavLink>)}</nav><div className="sidebar-person"><span>{user?.fullName || 'Nhân sự'}</span><small>{USER_ROLE_LABELS[user?.role]}</small><button onClick={() => {
        logout();
        navigate('/login');
      }}><LogOut size={15} />Đăng xuất</button></div></aside>;
}
