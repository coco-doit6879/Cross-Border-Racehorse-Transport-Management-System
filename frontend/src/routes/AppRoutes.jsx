import React from 'react';
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import Login from '../pages/Auth/Login';
import Register from '../pages/Auth/Register';
import Overview from '../pages/Dashboard/Overview';
import OrderList from '../pages/Orders/OrderList';
import CreateOrder from '../pages/Orders/CreateOrder';
import OrderDetail from '../pages/Orders/OrderDetail';
import HorseList from '../pages/Horses/HorseList';
import PassportDetail from '../pages/Horses/PassportDetail';
import RouteMap from '../pages/Routes/RouteMap';
import SOSAlerts from '../pages/Incidents/SOSAlerts';
import ManagerDashboard from '../pages/Manager/ManagerDashboard';
import PersonnelPage from '../pages/Manager/PersonnelPage';
import TripsPage from '../pages/Manager/TripsPage';
import TripDetailPage from '../pages/Manager/TripDetailPage';
import TransportSchedulesPage from '../pages/Manager/TransportSchedulesPage';
import OperationsDashboard from '../pages/Operations/OperationsDashboard';
import ComplianceQueue from '../pages/Operations/ComplianceQueue';
import VehiclePage from '../pages/Operations/VehiclePage';
import FleetStaffPage from '../pages/Operations/FleetStaffPage';
import FleetTripsPage from '../pages/Operations/FleetTripsPage';
import ProtectedRoute from './ProtectedRoute';
import { useAuthStore } from '../store/useAuthStore';
import { USER_ROLES } from '../utils/constants';
import { PERMISSIONS } from '../utils/permissions';
import { isManagerDemoEnabled } from '../config/managerDemo';
import { ManagerDataProvider } from '../context/ManagerDataContext';

const ProtectedLayout = () => <MainLayout><Outlet /></MainLayout>;
const ManagerDataBoundary = () => <ManagerDataProvider><Outlet /></ManagerDataProvider>;
const ManagerDemoLayout = () => <ManagerDataProvider><MainLayout><Outlet /></MainLayout></ManagerDataProvider>;

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
  if (isManagerDemoEnabled || OPERATIONAL_ROLES.includes(role)) return <Navigate to="/manager" replace />;
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
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {isManagerDemoEnabled ? <Route path="/manager" element={<ManagerDemoLayout />}>{managerRoutes}</Route> : null}
      {isManagerDemoEnabled ? <Route path="/" element={<Navigate to="/manager" replace />} /> : null}

      <Route element={<ProtectedRoute />}>
        <Route element={<ProtectedLayout />}>
          {!isManagerDemoEnabled ? <Route path="/" element={<HomeRoute />} /> : null}
          <Route path="/orders" element={<OrderList />} />
          <Route path="/orders/create" element={<CreateOrder />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/horses" element={<HorseList />} />
          <Route path="/horses/:id" element={<PassportDetail />} />
          <Route path="/routes/tracking" element={<RouteMap />} />
          <Route element={<ProtectedRoute allowedRoles={[USER_ROLES.TRANSPORT_SPECIALIST]} />}>
            <Route path="/specialist/horses" element={<HorseList />} />
            <Route path="/specialist/compliance" element={<ComplianceQueue />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={[USER_ROLES.FLEET_COORDINATOR, USER_ROLES.ROUTE_COORDINATOR]} />}>
            <Route path="/fleet/trips" element={<FleetTripsPage />} />
            <Route path="/fleet/vehicles" element={<VehiclePage />} />
            <Route path="/fleet/staff" element={<FleetStaffPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={[USER_ROLES.FLEET_COORDINATOR, USER_ROLES.ROUTE_COORDINATOR]} />}>
            <Route path="/manager/schedules" element={<TransportSchedulesPage />} />
          </Route>

          <Route element={<ProtectedRoute requiredPermission={PERMISSIONS.SOS_MANAGE} />}>
            <Route path="/incidents/sos" element={<SOSAlerts />} />
          </Route>

          {!isManagerDemoEnabled ? (
            <Route element={<ProtectedRoute allowedRoles={OPERATIONAL_ROLES} />}>
              <Route path="/manager" element={<ManagerDataBoundary />}>{managerRoutes}</Route>
            </Route>
          ) : null}

          <Route path="/forbidden" element={<ForbiddenPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  </BrowserRouter>
);

export default AppRoutes;
