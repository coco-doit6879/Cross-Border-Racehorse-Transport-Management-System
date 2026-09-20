import { create } from 'zustand';
import { horseApi } from '../services/horseApi';

const mapHorseData = (h) => ({
  id: h._id || h.id,
  _id: h._id || h.id,
  name: h.name,
  microchipId: h.microchipId,
  feiPassportNo: h.feiPassportNumber || h.feiPassportNo || '',
  breed: h.breed || 'Thoroughbred',
  age: h.age ? (typeof h.age === 'number' ? `${h.age} năm` : h.age) : (h.dateOfBirth ? `${new Date().getFullYear() - new Date(h.dateOfBirth).getFullYear()} năm` : '4 năm'),
  weight: h.weightKg || h.weight || 450,
  gender: h.gender || 'STALLION',
  color: h.color || 'Nâu đậm',
  ownerName: h.ownerId?.fullName || (typeof h.ownerId === 'string' ? h.ownerId : null) || h.ownerName || 'Khách hàng sở hữu',
  status: h.status || 'ACTIVE',
  activeTripCode: h.activeTripCode || null,
  medicalHistory: h.medicalHistoryNotes || h.medicalHistory || '',
  welfare: h.welfare || null,
  documents: h.documents && h.documents.length > 0 ? h.documents : [
    {
      id: `DOC-${h._id || '1'}-FEI`,
      type: 'FEI_PASSPORT',
      title: 'Hộ chiếu FEI',
      fileName: h.feiPassportNumber ? `FEI_${(h.name || 'Horse').replace(/\s+/g, '')}.pdf` : null,
      fileSize: h.feiPassportNumber ? '2.1 MB' : null,
      status: h.feiPassportNumber ? 'APPROVED' : 'REJECTED',
      verifiedAt: h.feiPassportNumber ? '15/09/2026' : null,
      documentCode: h.feiPassportNumber || ''
    },
    {
      id: `DOC-${h._id || '1'}-VAC`,
      type: 'VACCINATION',
      title: 'Chứng nhận tiêm phòng',
      fileName: 'Vaccine_2026.jpg',
      fileSize: '1.2 MB',
      status: 'APPROVED',
      verifiedAt: '15/09/2026',
      documentCode: 'VAC-2026-VN-SG'
    },
    {
      id: `DOC-${h._id || '1'}-HLTH`,
      type: 'HEALTH_CERT',
      title: 'Giấy khám sức khỏe',
      fileName: 'Kham_SucKhoe.pdf',
      fileSize: '3.0 MB',
      status: 'APPROVED',
      verifiedAt: '16/09/2026',
      documentCode: 'HLTH-9941'
    }
  ]
});

export const useHorseStore = create((set, get) => ({
  horses: [],
  loading: false,
  error: null,

  fetchHorses: async () => {
    set({ loading: true, error: null });
    try {
      const response = await horseApi.getHorses();
      const rawHorses = response?.data?.data || response?.data || [];
      const mapped = rawHorses.map(mapHorseData);
      set({ horses: mapped, loading: false });
      return mapped;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Không thể tải danh sách ngựa';
      set({ error: msg, loading: false, horses: [] });
      throw err;
    }
  },

  getHorseById: (id) => {
    return get().horses.find((h) => h.id === id || h._id === id);
  },

  addHorse: async (horseData) => {
    set({ loading: true, error: null });
    try {
      const payload = {
        name: horseData.name,
        microchipId: horseData.microchipId,
        feiPassportNumber: horseData.feiPassportNo || `FEI-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        breed: horseData.breed || 'Thoroughbred',
        dateOfBirth: horseData.dateOfBirth || '2022-01-01',
        gender: horseData.gender || 'STALLION',
        weightKg: Number(horseData.weight) || 450,
        passportScanUrl: 'https://cbrt.com/docs/passport.pdf',
        medicalHistoryNotes: horseData.medicalHistory || ''
      };

      const response = await horseApi.createHorse(payload);
      const newHorseDoc = response?.data?.data || response?.data;
      const mapped = mapHorseData(newHorseDoc);

      set((state) => ({
        horses: [mapped, ...state.horses],
        loading: false
      }));

      return mapped;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Không thể đăng ký hồ sơ ngựa';
      set({ error: msg, loading: false });
      throw err;
    }
  },

  updateHorse: async (id, updatedData) => {
    set({ loading: true, error: null });
    try {
      const response = await horseApi.updateHorse(id, updatedData);
      const updatedDoc = response?.data?.data || response?.data;
      const mapped = mapHorseData(updatedDoc);
      set((state) => ({
        horses: state.horses.map((h) => (h.id === id || h._id === id ? mapped : h)),
        loading: false
      }));
      return mapped;
    } catch (err) {
      // Local optimistic update fallback if backend put fails
      const updated = get().horses.map((h) => {
        if (h.id === id || h._id === id) {
          return { ...h, ...updatedData };
        }
        return h;
      });
      set({ horses: updated, loading: false });
    }
  },

  deleteHorse: (id) => {
    set((state) => ({
      horses: state.horses.filter((h) => h.id !== id && h._id !== id)
    }));
  },

  uploadDocument: (horseId, docType, fileInfo) => {
    set((state) => ({
      horses: state.horses.map((h) => {
        if (h.id === horseId || h._id === horseId) {
          const docs = h.documents.map((d) => {
            if (d.type === docType) {
              return {
                ...d,
                fileName: fileInfo.fileName,
                fileSize: fileInfo.fileSize || '1.5 MB',
                status: 'PENDING_REVIEW',
                rejectionReason: null
              };
            }
            return d;
          });
          return { ...h, documents: docs };
        }
        return h;
      })
    }));
  },

  verifyDocument: (horseId, docId, isApproved, rejectionReason = '') => {
    set((state) => ({
      horses: state.horses.map((h) => {
        if (h.id === horseId || h._id === horseId) {
          const docs = h.documents.map((d) => {
            if (d.id === docId) {
              return {
                ...d,
                status: isApproved ? 'APPROVED' : 'REJECTED',
                rejectionReason: isApproved ? null : rejectionReason,
                verifiedAt: isApproved ? new Date().toLocaleDateString('vi-VN') : null
              };
            }
            return d;
          });
          return { ...h, documents: docs };
        }
        return h;
      })
    }));
  }
}));
