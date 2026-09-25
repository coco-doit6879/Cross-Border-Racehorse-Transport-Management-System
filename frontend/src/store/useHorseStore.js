import { create } from 'zustand';
import { horseApi } from '../services/horseApi';

const mapHorseData = (h) => ({
  ...h,
  id: h._id || h.id,
  feiPassportNo: h.feiPassportNumber || '',
  age: h.dateOfBirth ? `${new Date().getFullYear() - new Date(h.dateOfBirth).getFullYear()} năm` : 'Chưa khai báo',
  weight: h.weightKg,
  ownerName: h.ownerId?.fullName || '',
  reviewStatus: h.reviewStatus || 'PENDING_REVIEW',
  medicalHistory: h.medicalHistoryNotes || ''
});
const errorMessage = (err) => err?.response?.data?.message || err.message || 'Không thể lưu hồ sơ ngựa.';

export const useHorseStore = create((set, get) => ({
  horses: [], loading: false, error: null,
  fetchHorses: async () => {
    set({ loading: true, error: null });
    try {
      const response = await horseApi.getHorses();
      const horses = response.data.data.map(mapHorseData);
      set({ horses, loading: false });
      return horses;
    } catch (err) { set({ error: errorMessage(err), loading: false, horses: [] }); throw err; }
  },
  getHorseById: (id) => get().horses.find((h) => h.id === id),
  fetchHorse: async (id) => {
    const response = await horseApi.getHorseById(id);
    const horse = mapHorseData(response.data.data);
    set((state) => ({ horses: [...state.horses.filter((h) => h.id !== id), horse] }));
    return horse;
  },
  addHorse: async (payload) => {
    const response = await horseApi.createHorse(payload);
    const horse = mapHorseData(response.data.data);
    set((state) => ({ horses: [horse, ...state.horses] }));
    return horse;
  },
  updateHorse: async (id, payload) => {
    const response = await horseApi.updateHorse(id, payload);
    const horse = mapHorseData(response.data.data);
    set((state) => ({ horses: state.horses.map((h) => h.id === id ? horse : h) }));
    return horse;
  },
  reviewHorse: async (id, payload) => {
    const response = await horseApi.reviewHorse(id, payload);
    const horse = mapHorseData(response.data.data);
    set((state) => ({ horses: state.horses.map((h) => h.id === id ? horse : h) }));
    return horse;
  }
}));
