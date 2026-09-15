import React from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';

const MainLayout = ({ children }) => {
  return (
    <div className="main-layout">
      <Header />
      <div className="layout-body">
        <Sidebar />
        <main className="content">{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;
