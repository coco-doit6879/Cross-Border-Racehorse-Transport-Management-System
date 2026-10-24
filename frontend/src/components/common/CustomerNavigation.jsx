import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowUpRight, LayoutDashboard, FolderHeart, Route, History, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import BrandLogo from './BrandLogo';

export default function CustomerNavigation() {
  const location = useLocation();
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();
  const history = location.pathname === '/orders' && new URLSearchParams(location.search).get('status') === 'completed';
  const items = [
    ['/dashboard', 'Tổng quan', LayoutDashboard, ['/', '/dashboard', '/overview'].includes(location.pathname)],
    ['/horses', 'Hồ sơ ngựa', FolderHeart, location.pathname.startsWith('/horses')],
    ['/orders', 'Chuyến vận chuyển', Route, location.pathname.startsWith('/orders') && location.pathname !== '/orders/create' && !history],
    ['/orders?status=completed', 'Lịch sử chuyến', History, history]
  ];
  return <aside className="customer-rail">
    <Link to="/dashboard" aria-label="CBRT — Trang chủ"><BrandLogo /></Link>
    <span className="rail-caption">Không gian khách hàng</span>
    <nav aria-label="Điều hướng khách hàng">
      {items.map(([to, label, Icon, active]) => <Link key={to} to={to} aria-current={active ? 'page' : undefined} className={`rail-link ${active ? 'is-active' : ''}`}><Icon size={18} />{label}</Link>)}
    </nav>
    <Link className="rail-book" to="/orders/create">Đặt chuyến mới<ArrowUpRight size={18} /></Link>
    <div className="rail-account">
      <span>{user?.fullName || 'Khách hàng'}</span><small>{user?.email}</small>
      <button onClick={() => { logout(); navigate('/login'); }}><LogOut size={15} />Đăng xuất</button>
    </div>
  </aside>;
}
