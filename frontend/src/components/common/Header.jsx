import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Dropdown } from 'antd';
import { User, ChevronDown, LogOut, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { USER_ROLES, USER_ROLE_LABELS } from '../../utils/constants';
import { isManagerDemoEnabled } from '../../config/managerDemo';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const sessionStatus = useAuthStore((state) => state.sessionStatus);
  const profileError = useAuthStore((state) => state.profileError);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleMenuClick = ({ key }) => {
    if (key === 'logout') {
      handleLogout();
    } else if (key === 'manager-portal') {
      navigate('/manager');
    }
  };

  const OPERATIONAL_ROLES = [USER_ROLES.LOGISTICS_MANAGER, USER_ROLES.FLEET_COORDINATOR, USER_ROLES.ROUTE_COORDINATOR, USER_ROLES.TRANSPORT_SPECIALIST];
  const isManagerRoute = location.pathname.startsWith('/manager') || OPERATIONAL_ROLES.includes(user?.role);

  if (isManagerRoute) {
    const statusLabel = sessionStatus === 'checking' || sessionStatus === 'idle'
      ? 'Đang tải hồ sơ…'
      : sessionStatus === 'error'
        ? (profileError || 'Không thể tải hồ sơ')
        : USER_ROLE_LABELS[user?.role] || 'Quản lý logistics';

    return (
      <header className="app-header">
        <div>
          <strong>Vận chuyển ngựa đua xuyên biên giới</strong>
          <span>Cổng điều hành</span>
        </div>
        <div className="app-header__user">
          <div>
            <span>{isManagerDemoEnabled ? 'Chế độ phát triển' : (user?.fullName || (sessionStatus === 'error' ? 'Hồ sơ chưa khả dụng' : 'Đang xác định người dùng'))}</span>
            <small>{isManagerDemoEnabled ? 'Quản lý logistics' : statusLabel}</small>
          </div>
          {isManagerDemoEnabled ? <span className="demo-badge">Dữ liệu mẫu</span> : null}
          <button type="button" onClick={handleLogout} style={{ padding: '6px 12px', cursor: 'pointer' }}>
            Đăng xuất
          </button>
        </div>
      </header>
    );
  }

  const navItems = [
    { label: 'Tổng quan', path: '/' },
    { label: 'Vận chuyển', path: '/orders' },
    { label: 'Ngựa đua', path: '/horses' },
    { label: 'Cảnh báo SOS', path: '/incidents/sos' }
  ];

  const userMenuItems = [
    {
      key: 'user-info',
      label: (
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontWeight: 600 }}>{user?.fullName || 'Người dùng'}</div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>{user?.email || 'N/A'}</div>
        </div>
      ),
      disabled: true
    },
    { type: 'divider' },
    {
      key: 'role',
      icon: <User size={14} />,
      label: USER_ROLE_LABELS[user?.role] || user?.role || 'Khách hàng'
    },
    ...(user?.role === USER_ROLES.LOGISTICS_MANAGER ? [
      {
        key: 'manager-portal',
        icon: <ShieldAlert size={14} />,
        label: 'Cổng điều hành Manager'
      }
    ] : []),
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogOut size={14} />,
      label: 'Đăng xuất',
      danger: true
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Dropdown menu={{ items: userMenuItems, onClick: handleMenuClick }} trigger={['click']} placement="bottomRight">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              padding: '6px 12px',
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
                {user?.fullName || 'Tài khoản'}
              </div>
              <div style={{ fontSize: 11, color: '#0F3E2E', fontWeight: 500 }}>
                {USER_ROLE_LABELS[user?.role] || user?.role || 'Khách hàng'}
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
