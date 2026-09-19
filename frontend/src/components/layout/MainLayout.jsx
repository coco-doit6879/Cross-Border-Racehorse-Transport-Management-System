import React from 'react';
import Header from '../common/Header';

const MainLayout = ({ children }) => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8F9FA' }}>
      <Header />
      <main style={{ flex: 1, padding: '24px 32px', maxWidth: 1440, width: '100%', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
