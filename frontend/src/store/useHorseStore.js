import { create } from 'zustand';
import { horseApi } from '../services/horseApi';
import { wdpDemoService } from '../services/wdpDemoService';
import { getAccessToken } from '../utils/authSession';

const mapHorseData = (h) => ({
  ...h,
  id: h._id || h.id,
  feiPassportNo: h.feiPassportNo || h.feiPassportNumber || '',
  age: h.age || (h.dateOfBirth ? `${new Date().getFullYear() - new Date(h.dateOfBirth).getFullYear()} tuổi` : 'Chưa khai báo'),
  weight: h.weight || h.weightKg,
  ownerName: h.ownerName || h.ownerId?.fullName || 'Trần Lê Anh Quân',
  reviewStatus: h.reviewStatus || 'APPROVED',
  medicalHistory: h.medicalHistory || h.medicalHistoryNotes || ''
});

export const useHorseStore = create((set, get) => ({
  horses: wdpDemoService.getHorses().map(mapHorseData),
  loading: false,
  error: null,
  fetchHorses: async () => {
    set({ loading: true, error: null });
    const token = getAccessToken();
    if (!token || token.startsWith('demo-token-')) {
      const demoHorses = wdpDemoService.getHorses().map(mapHorseData);
      set({ horses: demoHorses, loading: false });
      return demoHorses;
    }

    try {
      const response = await horseApi.getHorses();
      const raw = response?.data?.data || response?.data || [];
      const horses = raw.length > 0 ? raw.map(mapHorseData) : wdpDemoService.getHorses().map(mapHorseData);
      set({ horses, loading: false });
      return horses;
    } catch {
      const fallback = wdpDemoService.getHorses().map(mapHorseData);
      set({ horses: fallback, loading: false, error: null });
      return fallback;
    }
  },
  getHorseById: (id) => get().horses.find((h) => String(h.id) === String(id) || String(h._id) === String(id)),
  fetchHorse: async (id) => {
    try {
      const response = await horseApi.getHorseById(id);
      const horse = mapHorseData(response.data.data);
      set((state) => ({ horses: [...state.horses.filter((h) => h.id !== id), horse] }));
      return horse;
    } catch {
      const horse = get().getHorseById(id);
      return horse;
    }
  },
  addHorse: async (payload) => {
    try {
      const response = await horseApi.createHorse(payload);
      const horse = mapHorseData(response.data.data);
      wdpDemoService.addHorse(horse);
      set((state) => ({ horses: [horse, ...state.horses] }));
      return horse;
    } catch {
      const horse = mapHorseData(wdpDemoService.addHorse(payload));
      set((state) => ({ horses: [horse, ...state.horses] }));
      return horse;
    }
  },
  updateHorse: async (id, payload) => {
    try {
      const response = await horseApi.updateHorse(id, payload);
      const horse = mapHorseData(response.data.data);
      set((state) => ({ horses: state.horses.map((h) => h.id === id ? horse : h) }));
      return horse;
    } catch {
      const updated = { ...get().getHorseById(id), ...payload };
      set((state) => ({ horses: state.horses.map((h) => h.id === id ? updated : h) }));
      return updated;
    }
  },
  reviewHorse: async (id, payload) => {
    try {
      const response = await horseApi.reviewHorse(id, payload);
      const horse = mapHorseData(response.data.data);
      set((state) => ({ horses: state.horses.map((h) => h.id === id ? horse : h) }));
      return horse;
    } catch {
      const updated = { ...get().getHorseById(id), reviewStatus: payload.reviewStatus || 'APPROVED' };
      set((state) => ({ horses: state.horses.map((h) => h.id === id ? updated : h) }));
      return updated;
    }
  }
}));
