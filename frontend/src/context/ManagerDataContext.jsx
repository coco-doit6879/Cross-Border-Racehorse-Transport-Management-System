import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import apiClient from '../services/apiClient';
import userApi from '../services/userApi';
import { routeApi } from '../services/routeApi';
import { orderApi } from '../services/orderApi';

const ManagerDataContext = createContext(null);

export const ManagerDataProvider = ({ children }) => {
  const [data, setData] = useState({ drivers: [], escorts: [], trips: [], orders: [], analytics: null, auditLogs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);

  const fetchAllManagerData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, routesRes, ordersRes, kpiRes, auditRes] = await Promise.allSettled([
        userApi.getUsers(),
        routeApi.getRoutes(),
        orderApi.getOrders(),
        apiClient.get('/analytics/kpi'),
        apiClient.get('/audit-logs')
      ]);

      const users = usersRes.status === 'fulfilled' ? (usersRes.value?.data?.data || usersRes.value?.data || []) : [];
      const routes = routesRes.status === 'fulfilled' ? (routesRes.value?.data?.data || routesRes.value?.data || []) : [];
      const orders = ordersRes.status === 'fulfilled' ? (ordersRes.value?.data?.data || ordersRes.value?.data || []) : [];
      const kpi = kpiRes.status === 'fulfilled' ? (kpiRes.value?.data?.data || kpiRes.value?.data || null) : null;
      const auditLogs = auditRes.status === 'fulfilled' ? (auditRes.value?.data?.data || auditRes.value?.data || []) : [];

      const failures = [usersRes, routesRes, ordersRes, kpiRes, auditRes].filter(r => r.status === 'rejected');
      if (failures.length) throw failures[0].reason;
      const person = u => ({ ...u, id: String(u._id), code: u.username || u._id, status: u.isActive ? 'ACTIVE' : 'INACTIVE' });
      const drivers = users.filter(u => u.role === 'DRIVER').map(person);
      const escorts = users.filter(u => u.role === 'ESCORT').map(person);
      const trips = routes.map(r => {
        const order = orders.find(o => String(o._id) === String(r.orderId?._id || r.orderId)) || r.orderId || {};
        return { ...r, id: String(r._id), orderId: String(order._id || r.orderId), code: order.bookingCode || r._id,
          orderCode: order.bookingCode, customer: order.customerId?.fullName || 'Chưa cập nhật',
          origin: order.origin?.address || 'Chưa cập nhật', destination: order.destination?.address || 'Chưa cập nhật',
          startAt: order.requestedDepartureDate, endAt: r.waypoints?.at(-1)?.estimatedArrival,
          horseCount: order.horseIds?.length || 0, vehiclePlate: r.vehiclePlateNumber,
          driverId: String(r.driverId?._id || r.driverId || ''), escortId: String(r.escortId?._id || r.escortId || ''),
          horses: (order.horseIds || []).map(h => ({ id: h._id || h, name: h.name || 'Chưa cập nhật', passport: h.feiPassportNumber || '' })) };
      });
      setData({ drivers, escorts, trips, orders, analytics: kpi, auditLogs });
      setLoading(false);
    } catch (err) {
      console.error('Failed to load manager data from backend:', err);
      setError(err?.response?.data?.message || err.message || 'Không thể kết nối đến máy chủ backend.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllManagerData();
  }, [fetchAllManagerData]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const execute = useCallback(async (action, successMessage) => {
    try {
      const result = await action();
      setNotice({ tone: 'success', message: successMessage });
      await fetchAllManagerData();
      return result;
    } catch (actionError) {
      setNotice({ tone: 'error', message: actionError.message || 'Không thể hoàn tất thao tác.' });
      throw actionError;
    }
  }, [fetchAllManagerData]);

  const value = useMemo(
    () => ({ data, loading, error, notice, setNotice, execute, refreshData: fetchAllManagerData }),
    [data, loading, error, notice, execute, fetchAllManagerData]
  );

  return <ManagerDataContext.Provider value={value}>{children}</ManagerDataContext.Provider>;
};

export const useManagerData = () => {
  const context = useContext(ManagerDataContext);
  if (!context) throw new Error('useManagerData phải được dùng trong ManagerDataProvider.');
  return context;
};
