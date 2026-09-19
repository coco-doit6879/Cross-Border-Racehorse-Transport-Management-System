import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ErrorState, LoadingState } from '../components/operations/PageFeedback';
import { useAuthStore } from '../store/useAuthStore';
import { hasPermission } from '../utils/permissions';

const ProtectedRoute = ({ allowedRoles, requiredPermission }) => {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const sessionStatus = useAuthStore((state) => state.sessionStatus);
  const profileError = useAuthStore((state) => state.profileError);
  const bootstrapSession = useAuthStore((state) => state.bootstrapSession);

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

  if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
