import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { ConfigProvider } from 'antd';
import '../operations/refined-ui.css';
import '../../pages/Backoffice/backoffice.css';
import '../../pages/Orders/customer-orders.css';
import '../../pages/Orders/customer-booking.css';
import '../../pages/Dashboard/customer-home.css';

import { useAuthStore } from '../../store/useAuthStore';
import { USER_ROLES } from '../../utils/constants';

const MainLayout = ({ children }) => {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const OPERATIONAL_ROLES = [USER_ROLES.LOGISTICS_MANAGER, USER_ROLES.FLEET_COORDINATOR, USER_ROLES.ROUTE_COORDINATOR, USER_ROLES.TRANSPORT_SPECIALIST];
  const isManagerRoute = location.pathname.startsWith('/manager') || OPERATIONAL_ROLES.includes(user?.role);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#ea580c',
          colorLink: '#ea580c',
          colorLinkHover: '#c2410c',
          colorText: '#0f172a',
          colorTextSecondary: '#64748b',
          colorBorder: '#e2e8f0',
          controlHeight: 40,
          borderRadius: 8,
          fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif'
        },
        components: {
          Card: { headerFontSize: 15 },
          Button: { primaryShadow: '0 2px 6px rgba(234, 88, 12, 0.25)' }
        }
      }}
    >
      <div
        className={`refined-app ${isManagerRoute ? 'backoffice-layout' : ''} ${user?.role === USER_ROLES.TRANSPORT_SPECIALIST ? 'specialist-layout' : ''} ${/^\/orders\/[^/]+$/.test(location.pathname) ? 'order-page-layout' : ''} ${user?.role === USER_ROLES.CUSTOMER ? 'customer-orders-layout' : ''} ${user?.role === USER_ROLES.CUSTOMER ? 'customer-booking-layout' : ''}`}
        style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}
      >
        <Header />
        {isManagerRoute ? (
          <div className="layout-body">
            <Sidebar />
            <main className="app-content">{children}</main>
          </div>
        ) : (
          <main className="customer-workspace">
            {children}
          </main>
        )}
      </div>
    </ConfigProvider>
  );
};

export default MainLayout;
