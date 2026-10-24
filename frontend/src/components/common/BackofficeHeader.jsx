import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, LogOut, Search } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { USER_ROLES } from '../../utils/constants';

export default function BackofficeHeader() {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  useEffect(() => { setQuery(new URLSearchParams(location.search).get('q') || ''); }, [location.pathname, location.search]);
  const manager = user?.role === USER_ROLES.LOGISTICS_MANAGER;
  const specialist = user?.role === USER_ROLES.TRANSPORT_SPECIALIST;
  const compliance = location.pathname.startsWith('/specialist/compliance');
  const home = manager ? '/manager' : specialist ? '/specialist/horses' : '/fleet/trips';
  const searchPath = manager ? '/manager/intake' : specialist ? (compliance ? '/specialist/compliance' : '/specialist/horses') : '/fleet/trips';
  const identity = manager ? { badge: 'M', code: 'MG-01' } : specialist ? { badge: 'S', code: 'SP-01' } : { badge: 'C', code: 'CO-01' };
  const searchLabel = specialist ? (compliance ? 'Tìm đơn vận chuyển, khách hàng' : 'Tìm tên ngựa, microchip, chủ sở hữu') : 'Tìm đơn hàng, khách hàng';
  const title = specialist ? (compliance ? 'Giấy tờ kiểm dịch' : 'Duyệt hồ sơ ngựa')
    : location.pathname.includes('intake') ? 'Tiếp nhận'
    : location.pathname.includes('approvals') ? 'Duyệt giá'
    : location.pathname.includes('monitor') ? 'Giám sát'
    : location.pathname.includes('vehicles') ? 'Đội xe'
    : location.pathname.includes('incidents') ? 'Sự cố'
    : location.pathname.includes('revenue') ? 'Doanh thu'
    : location.pathname === '/manager' ? 'Tổng quan' : manager ? 'Chuyến đi' : 'Xe và lộ trình';

  return <header className="bo-header">
    <Link className="bo-brand" to={home}><img src="/images/landing/logo.png" alt="" />Vận chuyển Ngựa</Link>
    <div className="bo-identity"><span>{identity.badge}</span><div><strong>{identity.code}</strong><small>{user?.email}</small></div></div>
    <ChevronRight size={15} />
    <span className="bo-page-label">{title}</span>
    <form onSubmit={e => { e.preventDefault(); navigate(`${searchPath}?q=${encodeURIComponent(query)}`); }}>
      <Search size={16} /><input aria-label={searchLabel} placeholder={`${searchLabel}…`} value={query} onChange={e => setQuery(e.target.value)} />
    </form>
    {!specialist && <button aria-label="Xem sự cố và cảnh báo" onClick={() => navigate('/incidents/sos')}><Bell size={17} /></button>}
    <button aria-label="Đăng xuất" onClick={() => { logout(); navigate('/login'); }}><LogOut size={16} /></button>
  </header>;
}
