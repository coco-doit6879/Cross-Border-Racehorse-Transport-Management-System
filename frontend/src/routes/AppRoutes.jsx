import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import MainLayout from '../components/layout/MainLayout';

import Overview from '../pages/Dashboard/Overview';
import OrderList from '../pages/Orders/OrderList';
import CreateOrder from '../pages/Orders/CreateOrder';
import OrderDetail from '../pages/Orders/OrderDetail';
import HorseList from '../pages/Horses/HorseList';
import PassportDetail from '../pages/Horses/PassportDetail';
import RouteMap from '../pages/Routes/RouteMap';
import SOSAlerts from '../pages/Incidents/SOSAlerts';

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main Portal Routes */}
        <Route path="/" element={<MainLayout><Overview /></MainLayout>} />
        <Route path="/orders" element={<MainLayout><OrderList /></MainLayout>} />
        <Route path="/orders/create" element={<MainLayout><CreateOrder /></MainLayout>} />
        <Route path="/orders/:id" element={<MainLayout><OrderDetail /></MainLayout>} />
        <Route path="/horses" element={<MainLayout><HorseList /></MainLayout>} />
        <Route path="/horses/:id" element={<MainLayout><PassportDetail /></MainLayout>} />
        <Route path="/routes/tracking" element={<MainLayout><RouteMap /></MainLayout>} />
        <Route path="/incidents/sos" element={<MainLayout><SOSAlerts /></MainLayout>} />

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
