import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Dropdown, Badge, Input } from 'antd';
import { User, ChevronDown, LogOut, Bell, Search, Globe, Shield } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { USER_ROLES, USER_ROLE_LABELS } from '../../utils/constants';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [lang, setLang] = useState('VI');

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const OPERATIONAL_ROLES = [
    USER_ROLES.LOGISTICS_MANAGER,
    USER_ROLES.FLEET_COORDINATOR,
    USER_ROLES.ROUTE_COORDINATOR,
    USER_ROLES.TRANSPORT_SPECIALIST
  ];
  const isBackoffice = location.pathname.startsWith('/manager') || OPERATIONAL_ROLES.includes(user?.role);

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[parts.length - 2][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Backoffice Topbar (Manager, Specialist, Coordinator)
  if (isBackoffice) {
    const rolePrefix =
      user?.role === USER_ROLES.LOGISTICS_MANAGER
        ? 'MG-01'
        : user?.role === USER_ROLES.TRANSPORT_SPECIALIST
        ? 'SP-01'
        : 'CO-01';

    const getPageTitle = () => {
      if (location.pathname.includes('/specialist/compliance')) return 'Duyệt hồ sơ ngựa';
      if (location.pathname.includes('/fleet/trips')) return 'Xe và lộ trình';
      if (location.pathname.includes('/manager/approvals')) return 'Duyệt báo giá & phân công';
      if (location.pathname.startsWith('/manager')) return 'Điều hành vận chuyển';
      return 'Trung tâm điều phối';
    };

    return (
      <header
        style={{
          height: 64,
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              background: '#fff7ed',
              border: '1px solid #fed7aa',
              borderRadius: 8
            }}
          >
            <Shield size={16} color="#ea580c" />
            <span style={{ fontWeight: 700, fontSize: 13, color: '#9a3412' }}>
              [{rolePrefix}] {user?.email || 'Chưa cập nhật email'}
            </span>
          </div>
          <span style={{ color: '#cbd5e1' }}>/</span>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{getPageTitle()}</span>
        </div>

        <div style={{ flex: '0 1 360px' }}>
          <Input
            prefix={<Search size={15} color="#94a3b8" />}
            placeholder="Tìm đơn hàng, khách hàng, biển số..."
            style={{ borderRadius: 8, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
            allowClear
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Badge count={0} size="small" offset={[-2, 2]}>
            <button
              type="button"
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: '#64748b'
              }}
            >
              <Bell size={18} />
            </button>
          </Badge>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 13
              }}
            >
              {getInitials(user?.fullName || rolePrefix)}
            </div>
            <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                {user?.fullName || USER_ROLE_LABELS[user?.role] || 'Điều hành viên'}
              </div>
              <div style={{ fontSize: 11, color: '#ea580c', fontWeight: 600 }}>
                {USER_ROLE_LABELS[user?.role] || 'Quản lý'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#64748b',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <LogOut size={14} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </header>
    );
  }

  // Customer Navbar matching WDP.odt
  const navItems = [
    { label: 'Trang chủ', path: '/dashboard' },
    { label: 'Hồ sơ ngựa', path: '/horses' },
    { label: 'Đặt chuyến mới', path: '/orders/create' },
    { label: 'Đơn của tôi', path: '/orders' },
    { label: 'Lịch sử đơn', path: '/orders?status=completed' }
  ];

  const userMenuItems = [
    {
      key: 'user-info',
      label: (
        <div style={{ padding: '6px 4px' }}>
          <div style={{ fontWeight: 700, color: '#0f172a' }}>{user?.fullName || 'Tài khoản'}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{user?.email || 'Chưa cập nhật email'}</div>
        </div>
      ),
      disabled: true
    },
    { type: 'divider' },
    {
      key: 'profile',
      icon: <User size={14} />,
      label: 'Tài khoản của tôi'
    },
    {
      key: 'logout',
      icon: <LogOut size={14} color="#dc2626" />,
      label: <span style={{ color: '#dc2626', fontWeight: 600 }}>Đăng xuất</span>,
      onClick: handleLogout
    }
  ];

  return (
    <header className="customer-header">
      <div className="customer-header-main" style={{ display: 'flex', alignItems: 'center' }}>
        <Link className="interaction-brand" to="/orders">
          <div>🏇</div>
          <div>
            <span>Vận chuyển Ngựa</span>
            <span>DỊCH VỤ CHUYÊN NGHIỆP</span>
          </div>
        </Link>

        <nav aria-label="Điều hướng chính" style={{ display: 'flex', alignItems: 'center' }}>
          {navItems.map((item) => {
            const isActive =
              item.path === '/orders'
                ? location.pathname === '/orders' && !location.search.includes('status=completed')
                : item.path === '/orders?status=completed'
                ? location.pathname === '/orders' && location.search.includes('status=completed')
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className="interaction-nav-link"
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="customer-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Language selector pill VI | EN */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid #e2e8f0',
            borderRadius: 20,
            padding: '2px',
            background: '#f8fafc',
            fontSize: 11,
            fontWeight: 700
          }}
        >
          <button
            type="button"
            onClick={() => setLang('VI')}
            style={{
              border: 'none',
              background: lang === 'VI' ? '#ea580c' : 'transparent',
              color: lang === 'VI' ? '#ffffff' : '#64748b',
              padding: '3px 9px',
              borderRadius: 16,
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            VI
          </button>
          <button
            type="button"
            onClick={() => setLang('EN')}
            style={{
              border: 'none',
              background: lang === 'EN' ? '#ea580c' : 'transparent',
              color: lang === 'EN' ? '#ffffff' : '#64748b',
              padding: '3px 9px',
              borderRadius: 16,
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            EN
          </button>
        </div>

        {/* Notification Bell */}
        <Badge count={0} size="small" offset={[-2, 2]}>
          <button
            type="button"
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              padding: 4
            }}
          >
            <Bell size={18} />
          </button>
        </Badge>

        {/* User Account Dropdown */}
        <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
          <button type="button" className="interaction-account" aria-label="Tài khoản của tôi">
            <div>{getInitials(user?.fullName)}</div>
            <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {user?.fullName || 'Tài khoản'}
              </div>
              <div style={{ fontSize: 11 }}>Khách hàng</div>
            </div>
            <ChevronDown size={14} color="#94a3b8" />
          </button>
        </Dropdown>

        {/* Quick Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          title="Đăng xuất khỏi hệ thống"
          className="customer-header-logout"
          style={{
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            color: '#64748b',
            padding: '6px 12px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 5
          }}
        >
          <LogOut size={13} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
