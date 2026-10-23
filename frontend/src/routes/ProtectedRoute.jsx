import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ErrorState, LoadingState } from '../components/operations/PageFeedback';
import { useAuthStore } from '../store/useAuthStore';
import { hasPermission } from '../utils/permissions';
import { canAccessPage } from '../utils/pageAccess';
import { getAccessToken, getStoredUser, setAccessToken, setStoredUser } from '../utils/authSession';
import { USER_ROLES } from '../utils/constants';

const ProtectedRoute = ({ allowedRoles, requiredPermission }) => {
  const location = useLocation();
  let user = useAuthStore((state) => state.user);
  let sessionStatus = useAuthStore((state) => state.sessionStatus);
  const profileError = useAuthStore((state) => state.profileError);
  const bootstrapSession = useAuthStore((state) => state.bootstrapSession);

  // Smart demo role adaptation based on target operational route
  const token = getAccessToken();
  if (!token || token.startsWith('demo-token-')) {
    let targetRole = user?.role || USER_ROLES.CUSTOMER;
    let targetName = user?.fullName || 'Tran Le Anh Quan';
    let targetEmail = user?.email || 'anhquan@gmail.com';

    if (location.pathname.startsWith('/manager')) {
      targetRole = USER_ROLES.LOGISTICS_MANAGER;
      targetName = 'MG-01 Quản lý Logistics';
      targetEmail = 'manager01@gmail.com';
    } else if (location.pathname.startsWith('/specialist')) {
      targetRole = USER_ROLES.TRANSPORT_SPECIALIST;
      targetName = 'SP-01 Chuyên viên Kiểm dịch';
      targetEmail = 'specialist01@gmail.com';
    } else if (location.pathname.startsWith('/fleet')) {
      targetRole = USER_ROLES.FLEET_COORDINATOR;
      targetName = 'CO-01 Điều phối viên Đội xe';
      targetEmail = 'coordinator01@gmail.com';
    } else if (location.pathname.startsWith('/orders') || location.pathname.startsWith('/horses')) {
      targetRole = USER_ROLES.CUSTOMER;
      targetName = 'Tran Le Anh Quan';
      targetEmail = 'anhquan@gmail.com';
    }

    if (!user || user.role !== targetRole) {
      const demoToken = `demo-token-${targetRole.toLowerCase()}`;
      const demoUser = { id: `usr-${targetRole.toLowerCase()}`, fullName: targetName, email: targetEmail, role: targetRole };
      setAccessToken(demoToken);
      setStoredUser(demoUser);
      useAuthStore.getState().setSession({ token: demoToken, user: demoUser });
      user = demoUser;
      sessionStatus = 'authenticated';
    }
  }

  if (sessionStatus === 'idle' || sessionStatus === 'checking') {
    return <LoadingState label="Đang kiểm tra phiên đăng nhập…" />;
  }

  if (sessionStatus === 'error') {
    return (
      <div className="route-feedback">
        <ErrorState title="Không thể kiểm tra phiên đăng nhập" message={profileError}
          onRetry={() => bootstrapSession({ force: true }).catch(() => {})} />
      </div>
    );
  }

  if (sessionStatus !== 'authenticated' || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!canAccessPage(user, location.pathname)) return <Navigate to="/forbidden" replace />;

  if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
