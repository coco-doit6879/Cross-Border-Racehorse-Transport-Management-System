// Mock & Reactive Demo Data Service according to WDP.odt specification
// Supports 4 operational roles: Customer (AQ), Logistics Manager (MG-01),
// Quarantine Specialist (SP-01), Fleet Coordinator (CO-01).

const STORAGE_KEY = 'cbrt_wdp_demo_state_v1';

export const INITIAL_HORSES = [
  {
    id: 'horse-mambo',
    _id: 'horse-mambo',
    name: 'Mambo',
    breed: 'Thuần chủng (Thoroughbred)',
    sex: 'Ngựa đực',
    age: '5 tuổi',
    weight: 480,
    color: 'Nâu đậm (Bay)',
    microchipId: '985141001234567',
    feiPassportNo: 'VN-028374',
    currentStopId: 'stop-sgn',
    currentLocationName: 'Trang trại Thủ Đức, TP.HCM',
    ownerName: 'Trần Lê Anh Quân',
    reviewStatus: 'APPROVED',
    status: 'ACTIVE',
    passportScanUrl: '/docs/mambo_fei_passport.pdf',
    vaccinationRecordUrl: '/docs/mambo_vaccine.pdf',
    cogginsTestUrl: '/docs/mambo_coggins.pdf',
    documentsCount: '3/3'
  },
  {
    id: 'horse-hacma',
    _id: 'horse-hacma',
    name: 'Hắc Mã',
    breed: 'Thuần chủng (Thoroughbred)',
    sex: 'Ngựa đực',
    age: '4 tuổi',
    weight: 510,
    color: 'Đen tuyền (Black)',
    microchipId: '985141009876543',
    feiPassportNo: 'VN-028377',
    currentStopId: 'stop-sgn',
    currentLocationName: 'Trang trại Thủ Đức, TP.HCM',
    ownerName: 'Trần Lê Anh Quân',
    reviewStatus: 'APPROVED',
    status: 'ACTIVE',
    passportScanUrl: '/docs/hacma_fei_passport.pdf',
    vaccinationRecordUrl: '/docs/hacma_vaccine.pdf',
    cogginsTestUrl: '/docs/hacma_coggins.pdf',
    documentsCount: '3/3'
  },
  {
    id: 'horse-stormrunner',
    _id: 'horse-stormrunner',
    name: 'Storm Runner',
    breed: 'Thuần chủng (Thoroughbred)',
    sex: 'Ngựa đực',
    age: '6 tuổi',
    weight: 500,
    color: 'Hạt dẻ (Chestnut)',
    microchipId: '985141005544332',
    feiPassportNo: 'VN-982367',
    currentStopId: 'stop-sgn',
    currentLocationName: 'Trang trại Thủ Đức, TP.HCM',
    ownerName: 'Trần Lê Anh Quân',
    reviewStatus: 'APPROVED',
    status: 'ACTIVE',
    passportScanUrl: '/docs/stormrunner_fei_passport.pdf',
    vaccinationRecordUrl: '/docs/stormrunner_vaccine.pdf',
    cogginsTestUrl: '/docs/stormrunner_coggins.pdf',
    documentsCount: '3/3'
  }
];

export const INITIAL_ORDERS = [
  {
    id: 'bk-001',
    _id: 'bk-001',
    orderCode: 'BK-001',
    bookingCode: 'BK-001',
    customerName: 'Royal Stable',
    origin: 'Trường đua Phú Thọ, TP.HCM',
    destination: 'Phnom Penh Racecourse, Campuchia',
    originLocation: { formattedAddress: 'Trường đua Phú Thọ, TP.HCM', countryCode: 'VN', coordinates: [106.6575, 10.7681] },
    destinationLocation: { formattedAddress: 'Phnom Penh, Campuchia', countryCode: 'KH', coordinates: [104.9282, 11.5564] },
    routeLabel: 'TP.HCM → Phnom Penh (Quốc tế)',
    departureDate: '28/10/2026',
    departureTime: '05:00',
    horses: ['Kim Long', 'Sao Mai'],
    horseIds: ['horse-104', 'horse-106'],
    status: 'PRICE_REVIEW', // Chờ duyệt giá
    driverName: 'TX-02 Trần Quốc Bảo',
    vehiclePlate: '51D-909.09',
    pricing: {
      totalAmountVnd: 52000000,
      baseAmountVnd: 45000000,
      vatAmountVnd: 4500000,
      insuranceAmountVnd: 2500000
    },
    paymentStatus: 'UNPAID',
    depositRequired: true,
    depositPercent: 30,
    depositAmountVnd: 15600000,
    depositStatus: 'UNPAID',
    flowStep: 3,
    flowStepLabel: 'Bước 3/8: Bố trí xe & lộ trình'
  },
  {
    id: 'bk-002',
    _id: 'bk-002',
    orderCode: 'BK-002',
    bookingCode: 'BK-002',
    customerName: 'CLB Đua ngựa Sài Gòn',
    origin: 'Trang trại Tân Bình, TP.HCM',
    destination: 'Trường đua Quốc tế Đại Nam, Bình Dương',
    originLocation: { formattedAddress: 'Trang trại Tân Bình, TP.HCM', countryCode: 'VN', coordinates: [106.6528, 10.7989] },
    destinationLocation: { formattedAddress: 'Đại Nam, Bình Dương', countryCode: 'VN', coordinates: [106.6272, 11.0347] },
    routeLabel: 'TP.HCM → Bình Dương (Trong nước)',
    departureDate: '26/10/2026',
    departureTime: '07:30',
    horses: ['Thiên Mã'],
    horseIds: ['horse-101'],
    status: 'PENDING_APPROVAL', // Chờ tiếp nhận
    driverName: 'Chưa phân công',
    vehiclePlate: null,
    pricing: {
      totalAmountVnd: 18500000,
      baseAmountVnd: 16000000,
      vatAmountVnd: 1600000,
      insuranceAmountVnd: 900000
    },
    paymentStatus: 'UNPAID',
    depositRequired: true,
    depositPercent: 30,
    depositAmountVnd: 5550000,
    depositStatus: 'UNPAID',
    flowStep: 1,
    flowStepLabel: 'Bước 1/8: Gửi đơn'
  },
  {
    id: 'bk-004',
    _id: 'bk-004',
    orderCode: 'BK-004',
    bookingCode: 'BK-004',
    customerName: 'Mekong Equestrian',
    origin: 'Trại ngựa Tây Ninh',
    destination: 'Trung tâm Huấn luyện Củ Chi, TP.HCM',
    originLocation: { formattedAddress: 'Trại ngựa Tây Ninh', countryCode: 'VN', coordinates: [106.1083, 11.3108] },
    destinationLocation: { formattedAddress: 'Củ Chi, TP.HCM', countryCode: 'VN', coordinates: [106.4952, 11.0064] },
    routeLabel: 'Tây Ninh → Củ Chi (Trong nước)',
    departureDate: '27/10/2026',
    departureTime: '08:00',
    horses: ['Xích Thố'],
    horseIds: ['horse-107'],
    status: 'PENDING_APPROVAL', // Chờ tiếp nhận
    driverName: 'Chưa phân công',
    vehiclePlate: null,
    pricing: {
      totalAmountVnd: 15200000,
      baseAmountVnd: 13500000,
      vatAmountVnd: 1350000,
      insuranceAmountVnd: 350000
    },
    paymentStatus: 'UNPAID',
    depositRequired: true,
    depositPercent: 30,
    depositAmountVnd: 4560000,
    depositStatus: 'UNPAID',
    flowStep: 1,
    flowStepLabel: 'Bước 1/8: Gửi đơn'
  },
  {
    id: 'bk-005',
    _id: 'bk-005',
    orderCode: 'BK-005',
    bookingCode: 'BK-005',
    customerName: 'Trần Lê Anh Quân',
    customerPhone: '0901234567',
    customerEmail: 'anhquan@gmail.com',
    origin: 'Trang trại Thủ Đức, TP.HCM',
    destination: 'Trại ngựa Long Thành, Đồng Nai',
    originLocation: { formattedAddress: 'Trang trại Thủ Đức, TP.HCM', countryCode: 'VN', coordinates: [106.7725, 10.8496] },
    destinationLocation: { formattedAddress: 'Trại ngựa Long Thành, Đồng Nai', countryCode: 'VN', coordinates: [106.9534, 10.7816] },
    routeLabel: 'TP.HCM → Đồng Nai (Trong nước)',
    departureDate: '24/10/2026',
    departureTime: '06:00',
    horses: ['Storm Runner'],
    horseIds: ['horse-stormrunner'],
    status: 'PENDING_APPROVAL', // Starts at PENDING_APPROVAL
    isJustCreated: true, // Highlights with orange/green border on customer order page
    driverId: 'drv-001',
    driverName: 'TX-01 Nguyễn Minh Hoàng (0901234567)',
    escortId: 'esc-001',
    escortName: 'NV-01 Đỗ Thu Hà (0981112233)',
    vehiclePlate: '51C-123.45',
    vehicleName: 'Xe chuyên dụng 4 khoang đệm khí nén',
    restStopName: 'Trạm dừng chân Xuân Lộc (Km 65)',
    pricing: {
      routeBaseUnitPriceVnd: 20000000,
      horseCount: 1,
      baseAmountVnd: 20000000,
      addOns: [
        { id: 'addon-vip', name: 'Khoang VIP mở rộng & chống sốc', quantity: 1, amountVnd: 3000000 },
        { id: 'addon-feed', name: 'Cỏ khô Timothy & nước điện giải', quantity: 1, amountVnd: 1500000 },
        { id: 'addon-vat', name: 'Thuế GTGT & phí cầu đường cao tốc', quantity: 1, amountVnd: 1576000 }
      ],
      totalAmountVnd: 26076000
    },
    paymentStatus: 'UNPAID',
    depositRequired: true,
    depositPercent: 30,
    depositAmountVnd: 7823000,
    remainingAmountVnd: 18253000,
    depositStatus: 'UNPAID',
    depositDueAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    flowStep: 1,
    flowStepLabel: 'Bước 1/8: Gửi đơn',
    specialRequirements: 'Cần duy trì nhiệt độ khoang 22-24°C, bổ sung nước điện giải mỗi 2 giờ.'
  }
];

export const VEHICLES_LIST = [
  {
    id: 'veh-51d-90909',
    plateNumber: '51D-909.09',
    name: 'Xe chuyên dụng EquiLiner 6 chỗ',
    capacityHorses: 6,
    status: 'ON_ROUTE',
    statusLabel: 'Đang trên tuyến',
    disabled: true,
    reason: 'Đang thực hiện chuyến BK-001 (TP.HCM → Campuchia)'
  },
  {
    id: 'veh-51c-98765',
    plateNumber: '51C-98765',
    name: 'Xe thùng chuyên dụng HorseBox 2 chỗ',
    capacityHorses: 2,
    status: 'MAINTENANCE',
    statusLabel: 'Bảo dưỡng định kỳ',
    disabled: true,
    reason: 'Đang bảo dưỡng hệ thống giảm xóc khí nén'
  },
  {
    id: 'veh-51c-12345',
    plateNumber: '51C-123.45',
    name: 'Xe chuyên dụng TransEquine 4 khoang VIP',
    capacityHorses: 4,
    status: 'AVAILABLE',
    statusLabel: 'Sẵn sàng điều phối',
    disabled: false,
    reason: null
  }
];

export const DRIVERS_LIST = [
  { id: 'drv-001', code: 'TX-01', fullName: 'Nguyễn Minh Hoàng', phone: '0901234567', rating: '5.0 ★', tripsCompleted: 142, status: 'AVAILABLE', note: 'Thành thạo tuyến cao tốc Long Thành - Dầu Giây' },
  { id: 'drv-002', code: 'TX-02', fullName: 'Trần Quốc Bảo', phone: '0912345678', rating: '4.9 ★', tripsCompleted: 98, status: 'ASSIGNED', note: 'Đã phân công BK-001' },
  { id: 'drv-003', code: 'TX-03', fullName: 'Lê Anh Tuấn', phone: '0933456789', rating: '4.8 ★', tripsCompleted: 76, status: 'AVAILABLE', note: 'Chuyên ca đêm và tuyến ngắn' }
];

export const ESCORTS_LIST = [
  { id: 'esc-001', code: 'NV-01', fullName: 'Đỗ Thu Hà', phone: '0981112233', rating: '5.0 ★', cert: 'Bác sĩ thú y sơ cấp', status: 'AVAILABLE', note: 'Chuyên gia xoa dịu ngựa đua trước khi xuất phát' },
  { id: 'esc-002', code: 'NV-02', fullName: 'Ngô Hải Yến', phone: '0982223344', rating: '4.9 ★', cert: 'Điều dưỡng động vật', status: 'AVAILABLE', note: '5 năm kinh nghiệm hộ tống trường đua' },
  { id: 'esc-003', code: 'NV-03', fullName: 'Bùi Văn Khang', phone: '0983334455', rating: '4.8 ★', cert: 'Kỹ thuật viên thú y', status: 'AVAILABLE', note: 'Ưu tiên tuyến cự ly dài' }
];

export const REST_STOPS_LIST = [
  { id: 'stop-01', name: 'Trạm dừng chân Xuân Lộc (Km 65)', km: 65, facility: 'Khu chuồng ngựa có mái che, nguồn nước sạch, cỏ tươi, bác sĩ thú y trực 24/7' },
  { id: 'stop-02', name: 'Trạm dừng chân Long Thành (Km 28)', km: 28, facility: 'Bãi đỗ xe chuyên dụng, cấp nước giải khát & quạt thông gió công nghiệp' },
  { id: 'stop-03', name: 'Trạm kiểm dịch Thú y Dầu Giây (Km 52)', km: 52, facility: 'Trạm đối chiếu giấy tờ kiểm dịch và kiểm tra thân nhiệt gia súc' }
];

// Helper to load state
function getStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse wdp demo state', e);
  }
  return {
    horses: INITIAL_HORSES,
    orders: INITIAL_ORDERS,
    vehicles: VEHICLES_LIST,
    drivers: DRIVERS_LIST,
    escorts: ESCORTS_LIST,
    restStops: REST_STOPS_LIST,
    activeRole: 'CUSTOMER'
  };
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('cbrt:state-updated', { detail: state }));
  } catch (e) {
    console.error('Failed to save wdp demo state', e);
  }
}

export const wdpDemoService = {
  getState() {
    return getStoredState();
  },

  resetDemo() {
    localStorage.removeItem(STORAGE_KEY);
    const initial = getStoredState();
    saveState(initial);
    return initial;
  },

  getHorses() {
    return getStoredState().horses;
  },

  addHorse(horseData) {
    const state = getStoredState();
    const newHorse = {
      id: `horse-${Date.now()}`,
      _id: `horse-${Date.now()}`,
      name: horseData.name || 'Ngựa đua mới',
      breed: horseData.breed || 'Thuần chủng (Thoroughbred)',
      sex: horseData.sex || 'Ngựa đực',
      age: horseData.age ? `${horseData.age} tuổi` : '4 tuổi',
      weight: Number(horseData.weight) || 490,
      color: horseData.color || 'Hạt dẻ (Chestnut)',
      microchipId: horseData.microchipId || `98514100${Math.floor(1000000 + Math.random() * 9000000)}`,
      feiPassportNo: horseData.feiPassportNo || `VN-${Math.floor(100000 + Math.random() * 900000)}`,
      currentStopId: 'stop-sgn',
      currentLocationName: 'Trang trại Thủ Đức, TP.HCM',
      ownerName: 'Trần Lê Anh Quân',
      reviewStatus: 'APPROVED',
      status: 'ACTIVE',
      passportScanUrl: '/docs/new_passport.pdf',
      vaccinationRecordUrl: '/docs/new_vaccine.pdf',
      cogginsTestUrl: '/docs/new_coggins.pdf',
      documentsCount: '3/3',
      ...horseData
    };
    state.horses.unshift(newHorse);
    saveState(state);
    return newHorse;
  },

  getOrders() {
    return getStoredState().orders;
  },

  getOrderById(id) {
    const state = getStoredState();
    return state.orders.find(o => String(o.id) === String(id) || String(o._id) === String(id) || o.orderCode === id);
  },

  // Flow step 1: Customer creates BK-005
  createOrderBK005(orderPayload) {
    const state = getStoredState();
    const orderIndex = state.orders.findIndex(o => o.orderCode === 'BK-005');
    const existing = orderIndex >= 0 ? state.orders[orderIndex] : INITIAL_ORDERS.find(o => o.orderCode === 'BK-005');
    
    const updated = {
      ...existing,
      ...orderPayload,
      orderCode: 'BK-005',
      bookingCode: 'BK-005',
      status: 'PENDING_APPROVAL',
      flowStep: 1,
      flowStepLabel: 'Bước 1/8: Gửi đơn',
      isJustCreated: true,
      createdAt: new Date().toISOString()
    };

    if (orderIndex >= 0) {
      state.orders[orderIndex] = updated;
    } else {
      state.orders.unshift(updated);
    }
    saveState(state);
    return updated;
  },

  // Flow step 2: Manager receives order and activates Specialist verification
  managerReceiveBK005() {
    const state = getStoredState();
    const order = state.orders.find(o => o.orderCode === 'BK-005');
    if (order) {
      order.status = 'DOCS_PROCESSING';
      order.flowStep = 2;
      order.flowStepLabel = 'Bước 2/8: Thẩm định hồ sơ';
      order.isJustCreated = false;
      saveState(state);
    }
    return order;
  },

  // Flow step 3: Specialist verifies Storm Runner documents
  specialistVerifyBK005() {
    const state = getStoredState();
    const order = state.orders.find(o => o.orderCode === 'BK-005');
    if (order) {
      order.status = 'DOCS_VERIFIED';
      order.flowStep = 3;
      order.flowStepLabel = 'Bước 3/8: Bố trí xe & lộ trình';
      order.specialistVerified = true;
      order.specialistVerifiedAt = new Date().toISOString();
      saveState(state);
    }
    return order;
  },

  // Flow step 4: Coordinator chooses vehicle 51C-123.45 and rest stops
  coordinatorAssignBK005(assignmentData = {}) {
    const state = getStoredState();
    const order = state.orders.find(o => o.orderCode === 'BK-005');
    if (order) {
      order.status = 'PRICE_REVIEW'; // Ready for manager quotation approval
      order.flowStep = 4;
      order.flowStepLabel = 'Bước 4/8: Đặt cọc (30%)';
      order.vehiclePlate = assignmentData.vehiclePlate || '51C-123.45';
      order.vehicleName = assignmentData.vehicleName || 'Xe chuyên dụng TransEquine 4 khoang VIP';
      order.restStopName = assignmentData.restStopName || 'Trạm dừng chân Xuân Lộc (Km 65)';
      order.routeConfirmed = true;
      saveState(state);
    }
    return order;
  },

  // Flow step 5: Manager approves quotation (26,076,000 đ, deposit 7,823,000 đ) & assigns driver/escort
  managerApproveQuotationBK005(personnel = {}) {
    const state = getStoredState();
    const order = state.orders.find(o => o.orderCode === 'BK-005');
    if (order) {
      order.status = 'PENDING_DEPOSIT'; // Chờ khách hàng đặt cọc 30%
      order.flowStep = 4;
      order.flowStepLabel = 'Bước 4/8: Đặt cọc (30%)';
      order.driverName = personnel.driverName || 'TX-01 Nguyễn Minh Hoàng (0901234567)';
      order.escortName = personnel.escortName || 'NV-01 Đỗ Thu Hà (0981112233)';
      order.depositRequired = true;
      order.depositStatus = 'UNPAID';
      order.depositDueAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      saveState(state);
    }
    return order;
  },

  // Flow step 6: Customer pays 30% deposit via VNPAY (7,823,000 đ)
  customerPayDepositBK005(paymentRef = 'VNPAY-BK005-2026') {
    const state = getStoredState();
    const order = state.orders.find(o => o.orderCode === 'BK-005');
    if (order) {
      order.status = 'APPROVED'; // Đã duyệt và đặt cọc thành công
      order.depositStatus = 'PAID';
      order.paymentStatus = 'PARTIALLY_PAID'; // Đã cọc 30%
      order.paymentReference = paymentRef;
      order.depositedAt = new Date().toISOString();
      order.flowStep = 5;
      order.flowStepLabel = 'Bước 5/8: Chuẩn bị xe';
      saveState(state);
    }
    return order;
  }
};
