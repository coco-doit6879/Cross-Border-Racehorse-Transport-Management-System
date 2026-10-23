import React from 'react';
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import Login from '../pages/Auth/Login';
import Register from '../pages/Auth/Register';
import Overview from '../pages/Dashboard/Overview';
import OrderList from '../pages/Orders/OrderList';
import CreateOrder from '../pages/Orders/CreateOrder';
import OrderDetail from '../pages/Orders/OrderDetail';
import VnpayResult from '../pages/Payments/VnpayResult';
import HorseList from '../pages/Horses/HorseList';
import PassportDetail from '../pages/Horses/PassportDetail';
import RouteMap from '../pages/Routes/RouteMap';
import SOSAlerts from '../pages/Incidents/SOSAlerts';
import ManagerDashboard from '../pages/Manager/ManagerWorkflow';
import PersonnelPage from '../pages/Manager/PersonnelPage';
import TripsPage from '../pages/Manager/TripsPage';
import TripDetailPage from '../pages/Manager/TripDetailPage';
import TransportSchedulesPage from '../pages/Manager/TransportSchedulesPage';
import RevenueDashboard from '../pages/Manager/RevenueDashboard';
import OperationsDashboard from '../pages/Operations/OperationsDashboard';
import ComplianceQueue from '../pages/Operations/ComplianceQueue';
import HorseVerificationPage from '../pages/Operations/HorseVerificationPage';
import VehiclePage from '../pages/Operations/VehiclePage';
import FleetStaffPage from '../pages/Operations/FleetStaffPage';
import FleetTripsPage from '../pages/Operations/FleetTripsPage';
import ProtectedRoute from './ProtectedRoute';
import { useAuthStore } from '../store/useAuthStore';
import { USER_ROLES } from '../utils/constants';
import { PERMISSIONS } from '../utils/permissions';
import { ManagerDataProvider } from '../context/ManagerDataContext';

import LandingPage from '../pages/Landing/LandingPage';

const ProtectedLayout = () => <MainLayout><Outlet /></MainLayout>;
const ManagerDataBoundary = () => {
  const role = useAuthStore(state => state.user?.role);
  return role === USER_ROLES.LOGISTICS_MANAGER ? <ManagerDataProvider><Outlet /></ManagerDataProvider> : <Outlet />;
};

const ManagerIndex = () => {
  const role = useAuthStore((state) => state.user?.role);
  return [USER_ROLES.TRANSPORT_SPECIALIST, USER_ROLES.FLEET_COORDINATOR, USER_ROLES.ROUTE_COORDINATOR].includes(role) ? <OperationsDashboard /> : <ManagerDashboard />;
};

const managerRoutes = (
  <>
    <Route index element={<ManagerIndex />} />
    <Route element={<ProtectedRoute allowedRoles={[USER_ROLES.LOGISTICS_MANAGER]} />}>
      <Route path="drivers" element={<PersonnelPage role="driver" />} />
      <Route path="escorts" element={<PersonnelPage role="escort" />} />
      <Route path="trips" element={<TripsPage />} />
      <Route path="trips/:id" element={<TripDetailPage />} />
      <Route path="revenue" element={<RevenueDashboard />} />
    </Route>
  </>
);

const OPERATIONAL_ROLES = [
  USER_ROLES.LOGISTICS_MANAGER,
  USER_ROLES.FLEET_COORDINATOR,
  USER_ROLES.ROUTE_COORDINATOR,
  USER_ROLES.TRANSPORT_SPECIALIST
];

const HomeRoute = () => {
  const role = useAuthStore((state) => state.user?.role);
  if (OPERATIONAL_ROLES.includes(role)) return <Navigate to="/manager" replace />;
  return <Overview />;
};

const ForbiddenPage = () => (
  <section className="operations-page">
    <div className="page-feedback page-feedback--error" role="alert">
      <p className="page-feedback__title">403 — Không có quyền truy cập</p>
      <p>Tài khoản của bạn không được phép mở trang này.</p>
      <Link className="button button--secondary" to="/">Về trang chính</Link>
    </div>
  </section>
);

const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />


      <Route element={<ProtectedRoute />}>
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<HomeRoute />} />
          <Route path="/overview" element={<HomeRoute />} />
          <Route path="/orders" element={<OrderList />} />
          <Route path="/orders/create" element={<CreateOrder />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/payments/vnpay/result" element={<VnpayResult />} />
          <Route path="/horses" element={<HorseList />} />
          <Route path="/horses/:id" element={<PassportDetail />} />
          <Route path="/routes/tracking" element={<RouteMap />} />
          <Route element={<ProtectedRoute allowedRoles={[USER_ROLES.TRANSPORT_SPECIALIST, USER_ROLES.LOGISTICS_MANAGER]} />}>
            <Route path="/specialist/horses" element={<HorseVerificationPage />} />
            <Route path="/specialist/verification" element={<HorseVerificationPage />} />
            <Route path="/backoffice/specialist/verification" element={<HorseVerificationPage />} />
            <Route path="/specialist/compliance" element={<ComplianceQueue />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={[USER_ROLES.FLEET_COORDINATOR, USER_ROLES.ROUTE_COORDINATOR, USER_ROLES.LOGISTICS_MANAGER]} />}>
            <Route path="/fleet/trips" element={<FleetTripsPage />} />
            <Route path="/fleet/vehicles" element={<VehiclePage />} />
            <Route path="/fleet/staff" element={<FleetStaffPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={[USER_ROLES.FLEET_COORDINATOR]} />}>
            <Route path="/manager/schedules" element={<TransportSchedulesPage />} />
          </Route>

          <Route element={<ProtectedRoute requiredPermission={PERMISSIONS.SOS_MANAGE} />}>
            <Route path="/incidents/sos" element={<SOSAlerts />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={[USER_ROLES.LOGISTICS_MANAGER]} />}>
            <Route path="/revenue" element={<RevenueDashboard />} />
          </Route>

          {(
            <Route element={<ProtectedRoute allowedRoles={OPERATIONAL_ROLES} />}>
              <Route path="/manager" element={<ManagerDataBoundary />}>{managerRoutes}</Route>
            </Route>
          )}

          <Route path="/forbidden" element={<ForbiddenPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  </BrowserRouter>
);

export default AppRoutes;
