import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, LogOut } from 'lucide-react';
import BackofficeHeader from './BackofficeHeader';
import { useAuthStore } from '../../store/useAuthStore';
export default function Header() {
  const user = useAuthStore(s => s.user),
    logout = useAuthStore(s => s.logout),
    navigate = useNavigate(),
    location = useLocation();
  if (user?.role !== 'CUSTOMER') return <BackofficeHeader />;
  const title = location.pathname.startsWith('/horses') ? 'Hồ sơ ngựa' : location.pathname === '/orders/create' ? 'Đặt chuyến mới' : location.pathname.startsWith('/orders') ? 'Chuyến vận chuyển' : 'Tổng quan';
  return <header className="heritage-customer-header"><div><span>Không gian khách hàng</span><strong>{title}</strong></div><div className="customer-header-right"><span>{user?.fullName}</span><Link to="/orders/create">Đặt chuyến<ArrowUpRight size={16} /></Link><button className="mobile-signout" aria-label="Đăng xuất" onClick={() => {
        logout();
        navigate('/login');
      }}><LogOut size={17} /></button></div></header>;
}
