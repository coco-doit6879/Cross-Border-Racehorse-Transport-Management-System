import { create } from 'zustand';
import { orderApi } from '../services/orderApi';
import { horseApi } from '../services/horseApi';
import { calculateTransportSchedule } from '../utils/transportCalculator';
import { wdpDemoService } from '../services/wdpDemoService';
import { getAccessToken } from '../utils/authSession';

const mapOrderData = (o) => {
  const originAddr = typeof o.origin === 'object' ? o.origin?.address || '' : o.origin || '';
  const destAddr = typeof o.destination === 'object' ? o.destination?.address || '' : o.destination || '';
  const originShort = originAddr.split(',')[0] || originAddr;
  const destShort = destAddr.split(',')[0] || destAddr;

  const schedule = calculateTransportSchedule(o.requestedDepartureDate || o.createdAt, o.origin, o.destination);

  const resolvedDriverName = o.driverName || o.assignedDriver?.fullName || 'Chưa phân công';
  const resolvedVehiclePlate = o.vehiclePlate || o.assignedVehicle?.plateNumber || null;

  let horseNames = [];
  if (Array.isArray(o.horseIds) && o.horseIds.length > 0) {
    horseNames = o.horseIds.map((h) => (typeof h === 'object' ? h.name : h));
  } else if (Array.isArray(o.horses) && o.horses.length > 0) {
    horseNames = o.horses;
  }

  const startFormatted = o.departureDate || new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeZone: o.departureTimezone || 'Asia/Ho_Chi_Minh' }).format(new Date(schedule.startAt));
  const endFormatted = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(schedule.endAt));

  // Ensure valid GeoJSON coordinates for Map rendering [lng, lat]
  const originCoords = typeof o.origin === 'object' && Array.isArray(o.origin.coordinates) && o.origin.coordinates.length === 2
    ? o.origin.coordinates
    : (o.originLocation?.coordinates || [106.700806, 10.776889]);
  const destCoords = typeof o.destination === 'object' && Array.isArray(o.destination.coordinates) && o.destination.coordinates.length === 2
    ? o.destination.coordinates
    : (o.destinationLocation?.coordinates || [106.9534, 10.7816]);

  return {
    ...o,
    id: o._id || o.id,
    _id: o._id || o.id,
    orderCode: o.bookingCode || o.orderCode || (o._id ? `TR-2026-${String(o._id).slice(-4)}` : 'TR-2026-0001'),
    bookingCode: o.bookingCode || o.orderCode,
    customerName: o.customerId?.fullName || o.customerName || 'Khách hàng',
    origin: originAddr || 'Chưa xác định',
    destination: destAddr || 'Chưa xác định',
    originLocation: { formattedAddress: originAddr || 'Điểm đón', countryCode: o.origin?.countryCode || 'VN', coordinates: originCoords },
    destinationLocation: { formattedAddress: destAddr || 'Điểm giao', countryCode: o.destination?.countryCode || 'KH', coordinates: destCoords },
    routeLabel: o.routeLabel || (originAddr && destAddr ? `${originShort} → ${destShort}` : 'Chưa thiết lập tuyến đường'),
    departureDate: startFormatted,
    departureTime: o.departureTime || o.departureLocalTime || new Date(schedule.startAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: o.departureTimezone || 'Asia/Ho_Chi_Minh' }),
    departureTimezone: o.departureTimezone || 'Asia/Ho_Chi_Minh',
    departureId: o.departureId || null,
    estimatedArrivalDate: schedule.endAt,
    eta: `${endFormatted} (${schedule.durationFormatted})`,
    estimatedDistanceKm: schedule.distanceKm,
    durationFormatted: schedule.durationFormatted,
    gpsTimeAgo: o.gpsTimeAgo || 'Mới cập nhật',
    horses: horseNames,
    horseIds: o.horseIds || [],
    status: o.status || 'PENDING_APPROVAL',
    driverName: resolvedDriverName,
    vehiclePlate: resolvedVehiclePlate,
    pricing: o.pricing || null,
    paymentStatus: o.paymentStatus || 'UNPAID',
    paymentMethod: o.paymentMethod || null,
    paymentReference: o.paymentReference || null,
    paidAt: o.paidAt || null,
    depositRequired: Boolean(o.depositRequired),
    depositPercent: o.depositPercent || 30,
    depositAmountVnd: o.depositAmountVnd || 0,
    depositStatus: o.depositStatus || 'NOT_REQUIRED',
    depositDueAt: o.depositDueAt || null,
    depositReference: o.depositReference || null,
    depositedAt: o.depositedAt || null,
    specialRequirements: o.specialRequirements || '',
    milestones: o.milestones || [],
    flowStep: o.flowStep || 1,
    flowStepLabel: o.flowStepLabel || 'Bước 1/8: Gửi đơn'
  };
};

export const useOrderStore = create((set, get) => ({
  orders: wdpDemoService.getOrders().map(mapOrderData),
  loading: false,
  error: null,

  fetchOrders: async () => {
    set({ loading: true, error: null });
    const token = getAccessToken();
    if (!token || token.startsWith('demo-token-')) {
      const demoOrders = wdpDemoService.getOrders().map(mapOrderData);
      set({ orders: demoOrders, loading: false });
      return demoOrders;
    }

    try {
      const response = await orderApi.getOrders();
      const rawOrders = response?.data?.data || response?.data || [];
      const mapped = rawOrders.length > 0 ? rawOrders.map(mapOrderData) : wdpDemoService.getOrders().map(mapOrderData);
      set({ orders: mapped, loading: false });
      return mapped;
    } catch {
      const fallback = wdpDemoService.getOrders().map(mapOrderData);
      set({ orders: fallback, loading: false, error: null });
      return fallback;
    }
  },

  fetchOrderById: async (orderId) => {
    set({ loading: true, error: null });
    const token = getAccessToken();
    if (!token || token.startsWith('demo-token-')) {
      const fallbackDoc = wdpDemoService.getOrderById(orderId);
      if (fallbackDoc) {
        const mapped = mapOrderData(fallbackDoc);
        set((state) => ({
          orders: state.orders.map((o) => (String(o.id) === String(mapped.id) || o.orderCode === mapped.orderCode ? mapped : o)),
          loading: false,
          error: null
        }));
        return mapped;
      }
    }

    try {
      const response = await orderApi.getOrderById(orderId);
      const orderDoc = response?.data?.data || response?.data;
      const mapped = mapOrderData(orderDoc);

      set((state) => {
        const exists = state.orders.some((order) => String(order.id || order._id) === String(mapped.id));
        return {
          orders: exists
            ? state.orders.map((order) => (String(order.id || order._id) === String(mapped.id) ? mapped : order))
            : [mapped, ...state.orders],
          loading: false
        };
      });

      return mapped;
    } catch {
      const fallbackDoc = wdpDemoService.getOrderById(orderId);
      if (fallbackDoc) {
        const mapped = mapOrderData(fallbackDoc);
        set((state) => ({
          orders: state.orders.map((o) => (String(o.id) === String(mapped.id) || o.orderCode === mapped.orderCode ? mapped : o)),
          loading: false,
          error: null
        }));
        return mapped;
      }
      set({ loading: false });
      return null;
    }
  },

  createOrder: async (orderData) => {
    set({ loading: true, error: null });
    try {
      const payload = {
        horseIds: orderData.horseIds || [],
        departureId: orderData.departureId,
        scheduleRevision: orderData.scheduleRevision,
        addOnIds: orderData.addOnIds || [],
        specialRequirements: orderData.specialRequirements || ''
      };
      if (orderData.customerId) payload.customerId = orderData.customerId;
      const response = await orderApi.createOrder(payload);
      const newOrderDoc = response?.data?.data || response?.data;
      const mapped = mapOrderData(newOrderDoc);

      set((state) => ({
        orders: [mapped, ...state.orders],
        loading: false
      }));

      return mapped;
    } catch {
      // Fallback create BK-005 demo order
      const newOrderDoc = wdpDemoService.createOrderBK005(orderData);
      const mapped = mapOrderData(newOrderDoc);
      set((state) => ({
        orders: [mapped, ...state.orders.filter(o => o.orderCode !== 'BK-005')],
        loading: false
      }));
      return mapped;
    }
  },

  approveOrder: async (orderId, reviewNotes = '') => {
    set({ loading: true, error: null });
    try {
      const targetId = get().orders.find((o) => o.id === orderId || o.orderCode === orderId || o._id === orderId)?._id || orderId;
      const response = await orderApi.updateStatus(targetId, 'APPROVED');
      const updatedDoc = response?.data?.data || response?.data;
      const mapped = mapOrderData(updatedDoc);
      set((state) => ({
        orders: state.orders.map((o) => (o.id === targetId || o._id === targetId ? mapped : o)),
        loading: false
      }));
      return mapped;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Không thể phê duyệt đơn';
      set({ error: msg, loading: false });
      throw err;
    }
  },

  rejectOrder: async (orderId, reason = '') => {
    set({ loading: true, error: null });
    try {
      const targetId = get().orders.find((o) => o.id === orderId || o.orderCode === orderId || o._id === orderId)?._id || orderId;
      const response = await orderApi.updateStatus(targetId, 'REJECTED', reason);
      const updatedDoc = response?.data?.data || response?.data;
      const mapped = mapOrderData(updatedDoc);
      set((state) => ({
        orders: state.orders.map((o) => (o.id === targetId || o._id === targetId ? mapped : o)),
        loading: false
      }));
      return mapped;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Không thể từ chối đơn';
      set({ error: msg, loading: false });
      throw err;
    }
  },

  cancelOrder: async (orderId, reason = 'Khách hàng hủy đơn') => {
    set({ loading: true, error: null });
    try {
      const targetId = get().orders.find((o) => o.id === orderId || o.orderCode === orderId || o._id === orderId)?._id || orderId;
      const response = await orderApi.cancelOrder(targetId, reason);
      const updatedDoc = response?.data?.data || response?.data;
      const mapped = mapOrderData(updatedDoc);
      set((state) => ({
        orders: state.orders.map((o) => (o.id === targetId || o._id === targetId ? mapped : o)),
        loading: false
      }));
      return mapped;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Không thể hủy đơn vận chuyển';
      set({ error: msg, loading: false });
      throw err;
    }
  },

  createVnpayPayment: async (orderId) => {
    set({ loading: true, error: null });
    try {
      const response = await orderApi.createVnpayPayment(orderId);
      const payment = response?.data?.data || response?.data;
      set({ loading: false });
      return payment;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Không thể khởi tạo thanh toán VNPAY';
      set({ error: msg, loading: false });
      throw err;
    }
  }
}));
