import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import apiClient from '../services/apiClient';
import userApi from '../services/userApi';
import { routeApi } from '../services/routeApi';
import { orderApi } from '../services/orderApi';
import { managerDemoService } from '../services/managerDemoService';
import { calculateTransportSchedule } from '../utils/transportCalculator';

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

      let drivers = users
        .filter((u) => u.role === 'DRIVER_ESCORT' || u.role === 'DRIVER')
        .map((u, index) => ({
          id: String(u._id || u.id),
          _id: String(u._id || u.id),
          code: u.username || `TX00${index + 1}`,
          fullName: u.fullName,
          phone: u.phone || '0901234567',
          email: u.email,
          licenseClass: 'FC',
          licenseNumber: '790123456789',
          licenseExpiry: '2028-12-31',
          status: 'ACTIVE',
          notes: 'Tài xế vận chuyển chính thức'
        }));

      let escorts = users
        .filter((u) => u.role === 'DRIVER_ESCORT' || u.role === 'ESCORT')
        .map((u, index) => ({
          id: String(u._id || u.id),
          _id: String(u._id || u.id),
          code: u.username || `PX00${index + 1}`,
          fullName: u.fullName,
          phone: u.phone || '0981112233',
          email: u.email,
          experience: '5 năm chăm sóc ngựa đua',
          status: 'ACTIVE',
          notes: 'Phụ xe theo dõi sức khỏe'
        }));

      const demoData = managerDemoService.getData();

      const mergedDriversMap = new Map();
      drivers.forEach((d) => mergedDriversMap.set(d.id, d));
      (demoData.drivers || []).forEach((d) => {
        if (!mergedDriversMap.has(String(d.id)) && !mergedDriversMap.has(d.code)) {
          mergedDriversMap.set(String(d.id), d);
        }
      });
      drivers = Array.from(mergedDriversMap.values());

      const mergedEscortsMap = new Map();
      escorts.forEach((e) => mergedEscortsMap.set(e.id, e));
      (demoData.escorts || []).forEach((e) => {
        if (!mergedEscortsMap.has(String(e.id)) && !mergedEscortsMap.has(e.code)) {
          mergedEscortsMap.set(String(e.id), e);
        }
      });
      escorts = Array.from(mergedEscortsMap.values());

      // Map routes to trips
      const trips = routes.map((r, index) => {
        const orderObj = typeof r.orderId === 'object' ? r.orderId : {};
        const orderIdStr = typeof r.orderId === 'object' ? String(r.orderId._id || r.orderId.id) : (r.orderId ? String(r.orderId) : null);
        const originAddr = typeof orderObj.origin === 'object' ? orderObj.origin?.address || '' : orderObj.origin || '';
        const destAddr = typeof orderObj.destination === 'object' ? orderObj.destination?.address || '' : orderObj.destination || '';

        const requestedStart = orderObj.requestedDepartureDate || r.createdAt || new Date();
        const schedule = calculateTransportSchedule(requestedStart, orderObj.origin, orderObj.destination);

        return {
          id: String(r._id || r.id),
          _id: String(r._id || r.id),
          orderId: orderIdStr || String(r._id || r.id),
          code: `TRIP-${String(r._id || '').slice(-4).toUpperCase()}`,
          orderCode: orderObj.bookingCode || orderObj.orderCode || `TR-2026-0${100 + index}`,
          customer: orderObj.customerId?.fullName || 'Khách hàng',
          origin: originAddr || 'TP. Hồ Chí Minh',
          destination: destAddr || 'Phnom Penh',
          startAt: schedule.startAt,
          endAt: schedule.endAt,
          estimatedDistanceKm: schedule.distanceKm,
          estimatedDurationFormatted: schedule.durationFormatted,
          status: r.status || 'SCHEDULED',
          horseCount: Array.isArray(orderObj.horseIds) ? orderObj.horseIds.length : 1,
          vehiclePlate: r.vehiclePlateNumber || r.vehiclePlate || 'Chưa phân công',
          driverId: r.driverId?._id ? String(r.driverId._id) : (r.driverId ? String(r.driverId) : null),
          escortId: r.escortId?._id ? String(r.escortId._id) : (r.escortId ? String(r.escortId) : null),
          horses: (orderObj.horseIds || []).map((h) =>
            typeof h === 'object'
              ? { id: String(h._id || h.id), name: h.name, passport: h.feiPassportNumber || 'FEI-2026-0871' }
              : { id: String(h), name: 'Ngựa đua', passport: 'FEI-2026-0871' }
          ),
          assignmentHistory: [],
          specialRequirements: orderObj.specialRequirements || ''
        };
      });

      // Include all backend orders in trips list so managers can manage/approve any order
      orders.forEach((o, index) => {
        const matchingTrip = trips.find(
          (t) =>
            String(t.id) === String(o._id || o.id) ||
            t.orderCode === (o.bookingCode || o.orderCode) ||
            t.orderId === String(o._id || o.id)
        );

        if (!matchingTrip) {
          const originAddr = typeof o.origin === 'object' ? o.origin?.address || '' : o.origin || '';
          const destAddr = typeof o.destination === 'object' ? o.destination?.address || '' : o.destination || '';

          const requestedStart = o.requestedDepartureDate || o.createdAt || new Date();
          const schedule = calculateTransportSchedule(requestedStart, o.origin, o.destination);

          trips.push({
            id: String(o._id || o.id),
            _id: String(o._id || o.id),
            orderId: String(o._id || o.id),
            code: `TRIP-${String(o._id || '').slice(-4).toUpperCase()}`,
            orderCode: o.bookingCode || o.orderCode || `TR-2026-0${140 + index}`,
            customer: o.customerId?.fullName || o.customerName || 'Khách hàng',
            origin: originAddr || 'Chưa xác định',
            destination: destAddr || 'Chưa xác định',
            startAt: schedule.startAt,
            endAt: schedule.endAt,
            estimatedDistanceKm: schedule.distanceKm,
            estimatedDurationFormatted: schedule.durationFormatted,
            status: o.status || 'PENDING_APPROVAL',
            horseCount: Array.isArray(o.horseIds) ? o.horseIds.length : 1,
            vehiclePlate: o.vehiclePlate || 'Chưa phân công',
            driverId: o.driverId?._id ? String(o.driverId._id) : (o.driverId ? String(o.driverId) : null),
            escortId: o.escortId?._id ? String(o.escortId._id) : (o.escortId ? String(o.escortId) : null),
            horses: Array.isArray(o.horseIds) && o.horseIds.length > 0
              ? o.horseIds.map((h) =>
                  typeof h === 'object'
                    ? { id: String(h._id || h.id), name: h.name, passport: h.feiPassportNumber || 'FEI-2026' }
                    : { id: String(h), name: 'Ngựa đua', passport: 'FEI-2026' }
                )
              : [{ id: 'H1', name: 'Ngựa đua', passport: 'FEI-2026' }],
            assignmentHistory: [],
            specialRequirements: o.specialRequirements || ''
          });
        }
      });

      // Merge saved assignments & order statuses from backend & demo service
      const demoTripMap = new Map((demoData.trips || []).map((t) => [String(t.id), t]));
      const demoCodeMap = new Map((demoData.trips || []).map((t) => [t.code, t]));
      const demoOrderCodeMap = new Map((demoData.trips || []).map((t) => [t.orderCode, t]));

      const mergedTrips = trips.map((t) => {
        const local = demoTripMap.get(String(t.id)) || demoCodeMap.get(t.code) || demoOrderCodeMap.get(t.orderCode);
        const matchingOrder = orders.find(
          (o) =>
            String(o._id || o.id) === String(t.id || t._id) ||
            o.bookingCode === t.orderCode ||
            o.orderCode === t.orderCode ||
            String(o._id || o.id) === String(t.orderId)
        );

        // Calculate reactive status with prioritization for explicit approval / rejection updates
        let activeStatus = t.status || 'PENDING_APPROVAL';
        const candidates = [matchingOrder?.status, local?.status, t.status].filter(Boolean);
        if (candidates.includes('APPROVED')) {
          activeStatus = 'APPROVED';
        } else if (candidates.includes('REJECTED')) {
          activeStatus = 'REJECTED';
        } else if (matchingOrder?.status) {
          activeStatus = matchingOrder.status;
        } else if (local?.status) {
          activeStatus = local.status;
        }

        if (local) {
          return {
            ...t,
            status: activeStatus,
            driverId: local.driverId || t.driverId,
            escortId: local.escortId || t.escortId,
            assignmentNote: local.assignmentNote || t.assignmentNote,
            assignmentHistory: local.assignmentHistory?.length ? local.assignmentHistory : t.assignmentHistory
          };
        }
        return {
          ...t,
          status: activeStatus
        };
      });

      setData({
        drivers,
        escorts,
        trips: mergedTrips,
        orders,
        analytics: kpi,
        auditLogs
      });
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
