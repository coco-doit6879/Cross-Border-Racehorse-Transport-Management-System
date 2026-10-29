import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import { Search, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { USER_ROLES, USER_ROLE_LABELS } from '../../utils/constants';
export default function BackofficeHeader() {
  const logout = useAuthStore(s => s.logout),
    user = useAuthStore(s => s.user),
    location = useLocation(),
    navigate = useNavigate(),
    [query, setQuery] = useState('');
  useEffect(() => setQuery(new URLSearchParams(location.search).get('q') || ''), [location.pathname, location.search]);
  const manager = user?.role === USER_ROLES.LOGISTICS_MANAGER,
    specialist = user?.role === USER_ROLES.TRANSPORT_SPECIALIST,
    compliance = location.pathname.startsWith('/specialist/compliance');
  const searchPath = manager ? '/manager/intake' : specialist ? compliance ? '/specialist/compliance' : '/specialist/horses' : '/fleet/trips';
  const searchLabel = specialist ? 'Tìm hồ sơ, mã chip hoặc đơn' : 'Tìm mã đơn, khách hàng';
  return <header className="bo-header"><div className="bo-context"><span>CBRT / Điều hành</span><strong>{USER_ROLE_LABELS[user?.role]}</strong></div><form onSubmit={e => {
      e.preventDefault();
      navigate(`${searchPath}?q=${encodeURIComponent(query)}`);
    }}><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} aria-label={searchLabel} placeholder={searchLabel} /><button type="submit" aria-label="Tìm kiếm">↵</button></form><NotificationBell /><span className="bo-header-user">{user?.fullName}</span><button className="mobile-signout" aria-label="Đăng xuất" onClick={() => {
      logout();
      navigate('/login');
    }}><LogOut size={17} /></button></header>;
}
