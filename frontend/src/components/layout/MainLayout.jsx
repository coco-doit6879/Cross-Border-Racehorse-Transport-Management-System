import React from 'react';
import { useLocation } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import CustomerNavigation from '../common/CustomerNavigation';
import '../operations/refined-ui.css';
import '../../pages/Backoffice/backoffice.css';
import '../../pages/Orders/customer-orders.css';
import '../../pages/Orders/customer-booking.css';
import '../../pages/Dashboard/customer-home.css';
import { useAuthStore } from '../../store/useAuthStore';
import { heritageTheme } from '../../styles/heritageTheme';
export default function MainLayout({
  children
}) {
  const location = useLocation(),
    user = useAuthStore(s => s.user),
    customer = user?.role === 'CUSTOMER';
  return <ConfigProvider theme={heritageTheme}><div className={`refined-app heritage-app ${customer ? 'customer-orders-layout customer-booking-layout heritage-customer' : 'backoffice-layout'} ${user?.role === 'TRANSPORT_SPECIALIST' ? 'specialist-layout' : ''} ${/^\/orders\/[^/]+$/.test(location.pathname) ? 'order-page-layout' : ''}`}>
 <a className="h-skip" href="#workspace">Đến nội dung công việc</a>{customer ? <CustomerNavigation /> : <Sidebar />}<div className="heritage-body"><Header /><main id="workspace" tabIndex={-1} className={customer ? 'customer-workspace' : 'app-content'}>{children}</main><footer className="workspace-footer"><span>CBRT / Equine transport</span><span>Chăm sóc · Phối hợp · Hành trình</span></footer></div></div></ConfigProvider>;
}
