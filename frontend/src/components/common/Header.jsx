import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { USER_ROLE_LABELS } from '../../utils/constants';
import { isManagerDemoEnabled } from '../../config/managerDemo';

const Header = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const sessionStatus = useAuthStore((state) => state.sessionStatus);
  const profileError = useAuthStore((state) => state.profileError);
  const logout = useAuthStore((state) => state.logout);
  const statusLabel = sessionStatus === 'checking' || sessionStatus === 'idle'
    ? 'Đang tải hồ sơ…'
    : sessionStatus === 'error'
      ? (profileError || 'Không thể tải hồ sơ')
      : USER_ROLE_LABELS[user?.role] || 'Chưa xác định vai trò';

  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

  return (
    <header className="app-header">
      <div><strong>Vận chuyển ngựa đua xuyên biên giới</strong><span>Cổng điều hành</span></div>
      <div className="app-header__user">
        <div>
          <span>{isManagerDemoEnabled ? 'Chế độ phát triển' : (user?.fullName || (sessionStatus === 'error' ? 'Hồ sơ chưa khả dụng' : 'Đang xác định người dùng'))}</span>
          <small>{isManagerDemoEnabled ? 'Quản lý logistics' : statusLabel}</small>
        </div>
        {isManagerDemoEnabled ? <span className="demo-badge">Dữ liệu mẫu</span> : null}
        {!isManagerDemoEnabled && user ? <button type="button" onClick={handleLogout}>Đăng xuất</button> : null}
      </div>
    </header>
  );
};

export default Header;
