import { create } from 'zustand';

const INITIAL_ORDERS = [
  {
    id: 'ORD-0142',
    orderCode: 'TR-2026-0142',
    customerName: 'CLB Đua Sa Đéc',
    origin: 'CLB Thảo Điền, TP. Hồ Chí Minh',
    destination: 'CLB Polo, Phnom Penh',
    routeLabel: 'TP. Hồ Chí Minh → Phnom Penh',
    departureDate: '17/09/2026',
    departureTime: '07:00',
    eta: '16:30 hôm nay',
    gpsTimeAgo: '15 giây trước',
    horses: ['Thunder Bolt', 'Silver Wind'],
    status: 'IN_TRANSIT', // Đang vận chuyển
    driverName: 'Nguyễn Văn An',
    vehiclePlate: 'VN-TRUCK-001',
    specialRequirements: 'Xe kính khoang yên tĩnh, nghỉ định kỳ mỗi 2 giờ.',
    milestones: [
      { name: 'Đã xuất phát', status: 'COMPLETED', time: '08:15' },
      { name: 'Trạm nghỉ Củ Chi', status: 'COMPLETED', time: '09:30' },
      { name: 'Cửa khẩu Mộc Bài', status: 'IN_PROGRESS', time: '11:00' },
      { name: 'Bàn giao Phnom Penh', status: 'PENDING', time: '16:30' }
    ]
  },
  {
    id: 'ORD-0158',
    orderCode: 'TR-2026-0158',
    customerName: 'CLB Đua Sa Đéc',
    origin: 'CLB Green Stables, Hà Nội',
    destination: 'Singapore Turf Club, Kranji',
    routeLabel: 'Hà Nội → Singapore',
    departureDate: '17/09/2026',
    departureTime: '07:00',
    eta: '19/09/2026',
    horses: ['Thunder Bolt', 'Silver Wind'],
    status: 'PENDING_APPROVAL', // Chờ phê duyệt (Màn hình Manager 04)
    specialRequirements: 'Khoang yên tĩnh, nghỉ định kỳ mỗi 3 giờ.',
    reviewNotes: '',
    milestones: []
  },
  {
    id: 'ORD-0159',
    orderCode: 'TR-2026-0159',
    customerName: 'CLB Ngựa Hoàng Gia',
    origin: 'TP. Hồ Chí Minh',
    destination: 'Phnom Penh',
    routeLabel: 'TP. HCM → Phnom Penh',
    departureDate: '18/09/2026',
    departureTime: '08:00',
    horses: ['Hồng Mã', 'Bạch Mã', 'Hắc Long'],
    status: 'PENDING_APPROVAL',
    specialRequirements: 'Kiểm tra thân nhiệt định kỳ mỗi 3 tiếng.',
    reviewNotes: '',
    milestones: []
  },
  {
    id: 'ORD-0160',
    orderCode: 'TR-2026-0160',
    customerName: 'CLB Đà Nẵng Equestria',
    origin: 'Đà Nẵng',
    destination: 'Bangkok',
    routeLabel: 'Đà Nẵng → Bangkok',
    departureDate: '19/09/2026',
    departureTime: '06:30',
    horses: ['Phong Vân'],
    status: 'PENDING_APPROVAL',
    specialRequirements: 'Có bác sĩ thú y đi kèm toàn chặng.',
    reviewNotes: '',
    milestones: []
  }
];

const loadOrders = () => {
  try {
    const data = localStorage.getItem('cbrt_orders_data');
    if (data) return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load orders', err);
  }
  return INITIAL_ORDERS;
};

export const useOrderStore = create((set, get) => ({
  orders: loadOrders(),

  _persist: (orders) => {
    localStorage.setItem('cbrt_orders_data', JSON.stringify(orders));
    set({ orders });
  },

  createOrder: (orderData) => {
    const newCode = `TR-2026-0${Math.floor(161 + Math.random() * 800)}`;
    const newOrder = {
      id: `ORD-${Date.now().toString().slice(-4)}`,
      orderCode: newCode,
      customerName: 'CLB Đua Sa Đéc',
      status: 'PENDING_APPROVAL',
      milestones: [],
      ...orderData
    };
    const updated = [newOrder, ...get().orders];
    get()._persist(updated);
    return newOrder;
  },

  approveOrder: (orderId, reviewNotes = '') => {
    const updated = get().orders.map((o) => {
      if (o.id === orderId || o.orderCode === orderId) {
        return {
          ...o,
          status: 'APPROVED',
          reviewNotes
        };
      }
      return o;
    });
    get()._persist(updated);
  },

  rejectOrder: (orderId, reason = '') => {
    const updated = get().orders.map((o) => {
      if (o.id === orderId || o.orderCode === orderId) {
        return {
          ...o,
          status: 'REJECTED',
          reviewNotes: reason
        };
      }
      return o;
    });
    get()._persist(updated);
  }
}));
