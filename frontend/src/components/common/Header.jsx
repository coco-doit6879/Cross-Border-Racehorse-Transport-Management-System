import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Dropdown, Space } from 'antd';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const navItems = [
    { label: 'Tổng quan', path: '/' },
    { label: 'Vận chuyển', path: '/orders' },
    { label: 'Ngựa đua', path: '/horses' },
    { label: 'Thông báo', path: '/incidents/sos' }
  ];

  const userMenuItems = [
    {
      key: 'role-tag',
      label: (
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontWeight: 600 }}>{user?.fullName}</div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>{user?.email}</div>
        </div>
      ),
      disabled: true
    },
    { type: 'divider' },
    {
      key: 'profile',
      icon: <User size={14} />,
      label: 'Hồ sơ tài khoản'
    },
    {
      key: 'logout',
      icon: <LogOut size={14} />,
      danger: true,
      label: 'Đăng xuất',
      onClick: () => {
        logout();
        navigate('/login');
      }
    }
  ];

  return (
    <header
      style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        padding: '0 28px',
        justifyContent: 'space-between'
      }}
    >
      {/* Brand Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
            color: '#0F3E2E'
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              backgroundColor: '#0F3E2E',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: 0.5
            }}
          >
            C
          </div>
          <div>
            <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: 0.5, color: '#0F3E2E' }}>
              CBRT
            </span>
            <span style={{ color: '#6B7280', margin: '0 6px', fontWeight: 300 }}>/</span>
            <span style={{ fontWeight: 600, fontSize: 13, letterSpacing: 1.2, color: '#4B5563' }}>
              EQUINE TRANSPORT
            </span>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {navItems.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#0F3E2E' : '#4B5563',
                  backgroundColor: isActive ? '#EBF5F0' : 'transparent',
                  transition: 'all 0.2s'
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* User Dropdown */}
        <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #E5E7EB',
              backgroundColor: '#FAFAFA'
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                backgroundColor: '#0F3E2E',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 600
              }}
            >
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                {user?.fullName}
              </div>
              <div style={{ fontSize: 11, color: '#0F3E2E', fontWeight: 500 }}>
                {user?.role === 'CUSTOMER' ? 'Customer' : 'Logistics Manager'}
              </div>
            </div>
            <ChevronDown size={14} color="#6B7280" />
          </div>
        </Dropdown>
      </div>
    </header>
  );
};

export default Header;
