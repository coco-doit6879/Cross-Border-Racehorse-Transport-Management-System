import { create } from 'zustand';
import { orderApi } from '../services/orderApi';
import { horseApi } from '../services/horseApi';

const mapOrderData = (o) => {
  const originAddr = typeof o.origin === 'object' ? o.origin?.address || '' : o.origin || '';
  const destAddr = typeof o.destination === 'object' ? o.destination?.address || '' : o.destination || '';
  const originShort = originAddr.split(',')[0] || originAddr;
  const destShort = destAddr.split(',')[0] || destAddr;

  let horseNames = [];
  if (Array.isArray(o.horseIds) && o.horseIds.length > 0) {
    horseNames = o.horseIds.map((h) => (typeof h === 'object' ? h.name : h));
  } else if (Array.isArray(o.horses) && o.horses.length > 0) {
    horseNames = o.horses;
  }

  return {
    id: o._id || o.id,
    _id: o._id || o.id,
    orderCode: o.bookingCode || o.orderCode || (o._id ? `TR-2026-${String(o._id).slice(-4)}` : 'TR-2026-0001'),
    bookingCode: o.bookingCode || o.orderCode,
    customerName: o.customerId?.fullName || o.customerName || 'Khách hàng',
    origin: originAddr || 'Chưa xác định',
    destination: destAddr || 'Chưa xác định',
    routeLabel: originAddr && destAddr ? `${originShort} → ${destShort}` : 'Chưa thiết lập tuyến đường',
    departureDate: o.requestedDepartureDate
      ? new Date(o.requestedDepartureDate).toLocaleDateString('vi-VN')
      : o.departureDate || 'Chưa xếp lịch',
    departureTime: o.departureTime || '07:00',
    eta: o.eta || 'Dự kiến trong ngày',
    gpsTimeAgo: o.gpsTimeAgo || 'Mới cập nhật',
    horses: horseNames,
    horseIds: o.horseIds || [],
    status: o.status || 'PENDING_APPROVAL',
    driverName: o.driverName || o.assignedDriver?.fullName || 'Chưa phân công',
    vehiclePlate: o.vehiclePlate || o.assignedVehicle?.plateNumber || 'Chưa phân công',
    specialRequirements: o.specialRequirements || '',
    milestones: o.milestones || []
  };
};

export const useOrderStore = create((set, get) => ({
  orders: [],
  loading: false,
  error: null,

  fetchOrders: async () => {
    set({ loading: true, error: null });
    try {
      const response = await orderApi.getOrders();
      const rawOrders = response?.data?.data || response?.data || [];
      const mapped = rawOrders.map(mapOrderData);
      set({ orders: mapped, loading: false });
      return mapped;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Không thể tải danh sách đơn vận chuyển';
      set({ error: msg, loading: false, orders: [] });
      throw err;
    }
  },

  createOrder: async (orderData) => {
    set({ loading: true, error: null });
    try {
      let horseIds = orderData.horseIds;
      if (!horseIds || horseIds.length === 0) {
        const horsesRes = await horseApi.getHorses();
        const availableHorses = horsesRes?.data?.data || [];
        if (availableHorses.length > 0) {
          horseIds = availableHorses.map((h) => h._id);
        }
      }

      const COUNTRY_COORDINATES = {
        VN: [106.7008, 10.7768],
        KH: [104.9212, 11.5564],
        SG: [103.8198, 1.3521],
        TH: [100.5018, 13.7563],
        MY: [101.6869, 3.1390]
      };

      const originObj = typeof orderData.origin === 'object'
        ? orderData.origin
        : { address: orderData.origin || 'Điểm đón', countryCode: 'VN' };

      const destObj = typeof orderData.destination === 'object'
        ? orderData.destination
        : { address: orderData.destination || 'Điểm giao', countryCode: 'KH' };

      const originCountry = (originObj.countryCode || 'VN').toUpperCase();
      const destCountry = (destObj.countryCode || 'KH').toUpperCase();

      const originCoords = (Array.isArray(originObj.coordinates) && originObj.coordinates.length === 2)
        ? originObj.coordinates
        : (COUNTRY_COORDINATES[originCountry] || [106.7008, 10.7768]);

      const destCoords = (Array.isArray(destObj.coordinates) && destObj.coordinates.length === 2)
        ? destObj.coordinates
        : (COUNTRY_COORDINATES[destCountry] || [104.9212, 11.5564]);

      const payload = {
        horseIds: horseIds && horseIds.length > 0 ? horseIds : [],
        origin: {
          address: originObj.address || 'Điểm đón',
          countryCode: originCountry,
          coordinates: originCoords
        },
        destination: {
          address: destObj.address || 'Điểm giao',
          countryCode: destCountry,
          coordinates: destCoords
        },
        requestedDepartureDate: orderData.requestedDepartureDate || new Date().toISOString(),
        specialRequirements: orderData.specialRequirements || ''
      };

      const response = await orderApi.createOrder(payload);
      const newOrderDoc = response?.data?.data || response?.data;
      const mapped = mapOrderData(newOrderDoc);

      set((state) => ({
        orders: [mapped, ...state.orders],
        loading: false
      }));

      return mapped;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Không thể tạo đơn vận chuyển';
      set({ error: msg, loading: false });
      throw err;
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
  }
}));
