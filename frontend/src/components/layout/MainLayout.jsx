import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';

const MainLayout = ({ children }) => {
  const location = useLocation();
  const isManagerRoute = location.pathname.startsWith('/manager');

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
