import { createManagerDemoData } from '../data/managerDemoData.js';

const STORAGE_KEY = 'cbrt.manager.demo.v1';
const ACTIVE_TRIP_STATUSES = ['PLANNED', 'IN_TRANSIT'];
const listeners = new Set();

const clone = (value) => JSON.parse(JSON.stringify(value));
const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const load = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored?.version === 1 && Array.isArray(stored.drivers) && Array.isArray(stored.escorts) && Array.isArray(stored.trips)) {
      return stored;
    }
  } catch {
    // Invalid demo data is replaced by a clean, versioned seed below.
  }
  const seeded = createManagerDemoData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
};

let data = null;

const ensureData = () => {
  if (!data) data = load();
  return data;
};

const commit = (nextData) => {
  data = nextData;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  listeners.forEach((listener) => listener(clone(data)));
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const normalized = (value) => String(value || '').trim();

const validatePersonnel = (role, values, currentId) => {
  const collection = role === 'driver' ? data.drivers : data.escorts;
  const label = role === 'driver' ? 'tài xế' : 'phụ xe';
  const code = normalized(values.code).toUpperCase();
  const phone = normalized(values.phone).replace(/\s/g, '');
  const email = normalized(values.email);

  assert(code, `Vui lòng nhập mã ${label}.`);
  assert(normalized(values.fullName), 'Vui lòng nhập họ tên.');
  assert(phone, 'Vui lòng nhập số điện thoại.');
  assert(/^[+\d][\d.-]{7,16}$/.test(phone), 'Số điện thoại không đúng định dạng.');
  assert(!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Email không đúng định dạng.');
  assert(!collection.some((person) => person.id !== currentId && person.code.toUpperCase() === code), `Mã ${label} đã tồn tại.`);

  if (role === 'driver') {
    assert(normalized(values.licenseNumber), 'Vui lòng nhập số giấy phép lái xe.');
    assert(normalized(values.licenseClass), 'Vui lòng nhập hạng giấy phép.');
    assert(values.licenseExpiry && !Number.isNaN(Date.parse(values.licenseExpiry)), 'Vui lòng chọn ngày hết hạn hợp lệ.');
  }

  return { ...values, code, phone, email, fullName: normalized(values.fullName), status: values.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE' };
};

const personHasActiveTrip = (role, personId) => data.trips.some((trip) =>
  ACTIVE_TRIP_STATUSES.includes(trip.status) && trip[role === 'driver' ? 'driverId' : 'escortId'] === personId
);

const personIsReferenced = (personId) => data.trips.some((trip) =>
  trip.driverId === personId || trip.escortId === personId ||
  trip.assignmentHistory.some((entry) => entry.oldPersonId === personId || entry.newPersonId === personId)
);

const intervalsOverlap = (startA, endA, startB, endB) =>
  new Date(startA).getTime() < new Date(endB).getTime() && new Date(endA).getTime() > new Date(startB).getTime();

const findConflict = (personId, tripId, startAt, endAt) => data.trips.find((trip) =>
  trip.id !== tripId && ACTIVE_TRIP_STATUSES.includes(trip.status) &&
  (trip.driverId === personId || trip.escortId === personId) &&
  intervalsOverlap(startAt, endAt, trip.startAt, trip.endAt)
);

export const managerDemoService = {
  getData: () => clone(ensureData()),

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  reset() {
    commit(createManagerDemoData());
  },

  savePersonnel(role, values) {
    ensureData();
    assert(['driver', 'escort'].includes(role), 'Vai trò nhân sự không hợp lệ.');
    const key = role === 'driver' ? 'drivers' : 'escorts';
    const collection = data[key];
    const existing = values.id ? collection.find((person) => person.id === values.id) : null;
    assert(!values.id || existing, 'Không tìm thấy hồ sơ cần cập nhật.');
    const nextPerson = validatePersonnel(role, values, existing?.id);

    if (existing && existing.status === 'ACTIVE' && nextPerson.status === 'INACTIVE') {
      assert(!personHasActiveTrip(role, existing.id), 'Nhân sự còn chuyến sắp chạy hoặc đang chạy. Hãy xử lý phân công trước khi ngừng hoạt động.');
    }

    const saved = existing
      ? { ...existing, ...nextPerson, id: existing.id }
      : { ...nextPerson, id: createId(role === 'driver' ? 'drv' : 'esc') };
    const nextCollection = existing
      ? collection.map((person) => person.id === existing.id ? saved : person)
      : [saved, ...collection];
    commit({ ...data, [key]: nextCollection });
    return clone(saved);
  },

  deletePersonnel(role, id) {
    ensureData();
    const key = role === 'driver' ? 'drivers' : 'escorts';
    const person = data[key].find((item) => item.id === id);
    assert(person, 'Không tìm thấy hồ sơ cần xóa.');
    assert(!personHasActiveTrip(role, id), 'Nhân sự còn chuyến sắp chạy hoặc đang chạy. Hãy xử lý phân công trước.');
    assert(!personIsReferenced(id), 'Nhân sự đã được tham chiếu trong lịch sử chuyến. Hãy chuyển sang trạng thái ngừng hoạt động để giữ lịch sử.');
    commit({ ...data, [key]: data[key].filter((item) => item.id !== id) });
  },

  saveAssignment(tripId, values) {
    ensureData();
    const trip = data.trips.find((item) => item.id === tripId);
    assert(trip, 'Không tìm thấy chuyến vận chuyển.');
    assert(trip.status === 'PLANNED' && new Date(trip.startAt) > new Date(), 'Chỉ được thay đổi phân công trước khi chuyến khởi hành.');
    assert(values.driverId && values.escortId, 'Vui lòng chọn đủ tài xế và phụ xe.');
    assert(values.driverId !== values.escortId, 'Không thể chọn cùng một người cho hai vai trò.');

    const driver = data.drivers.find((person) => person.id === values.driverId);
    const escort = data.escorts.find((person) => person.id === values.escortId);
    assert(driver?.status === 'ACTIVE', 'Tài xế không tồn tại hoặc đã ngừng hoạt động.');
    assert(escort?.status === 'ACTIVE', 'Phụ xe không tồn tại hoặc đã ngừng hoạt động.');

    const driverConflict = findConflict(driver.id, trip.id, trip.startAt, trip.endAt);
    const escortConflict = findConflict(escort.id, trip.id, trip.startAt, trip.endAt);
    assert(!driverConflict, `${driver.fullName} bị trùng lịch với chuyến ${driverConflict?.code}.`);
    assert(!escortConflict, `${escort.fullName} bị trùng lịch với chuyến ${escortConflict?.code}.`);

    const driverChanged = Boolean(trip.driverId && trip.driverId !== values.driverId);
    const escortChanged = Boolean(trip.escortId && trip.escortId !== values.escortId);
    if (driverChanged || escortChanged) assert(normalized(values.reason), 'Vui lòng nhập lý do thay đổi nhân sự.');

    const changedAt = new Date().toISOString();
    const history = [...trip.assignmentHistory];
    if (trip.driverId !== values.driverId) history.unshift({ id: createId('hist'), changedAt, role: 'DRIVER', oldPersonId: trip.driverId, newPersonId: values.driverId, reason: normalized(values.reason) || 'Phân công ban đầu' });
    if (trip.escortId !== values.escortId) history.unshift({ id: createId('hist'), changedAt, role: 'ESCORT', oldPersonId: trip.escortId, newPersonId: values.escortId, reason: normalized(values.reason) || 'Phân công ban đầu' });

    const updated = { ...trip, driverId: values.driverId, escortId: values.escortId, assignmentNote: normalized(values.note), assignmentHistory: history };
    commit({ ...data, trips: data.trips.map((item) => item.id === trip.id ? updated : item) });
    return clone(updated);
  }
};

export { STORAGE_KEY as MANAGER_DEMO_STORAGE_KEY };
