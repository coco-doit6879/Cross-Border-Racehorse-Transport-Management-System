import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';

import { useAuthStore } from '../../store/useAuthStore';
import { USER_ROLES } from '../../utils/constants';

const MainLayout = ({ children }) => {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const OPERATIONAL_ROLES = [USER_ROLES.LOGISTICS_MANAGER, USER_ROLES.FLEET_COORDINATOR, USER_ROLES.ROUTE_COORDINATOR, USER_ROLES.TRANSPORT_SPECIALIST];
  const isManagerRoute = location.pathname.startsWith('/manager') || OPERATIONAL_ROLES.includes(user?.role);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8F9FA' }}>
      <Header />
      {isManagerRoute ? (
        <div className="layout-body">
          <Sidebar />
          <main className="app-content">{children}</main>
        </div>
      ) : (
        <main style={{ flex: 1, padding: '24px 32px', maxWidth: 1440, width: '100%', margin: '0 auto' }}>
          {children}
        </main>
      )}
    </div>
  );
};

export default MainLayout;
