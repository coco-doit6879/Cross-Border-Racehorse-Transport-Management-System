import { create } from 'zustand';

const INITIAL_HORSES = [
  {
    id: 'H-001',
    name: 'Thunder Bolt',
    microchipId: '104123456789012',
    feiPassportNo: 'FEI-2026-0871',
    breed: 'Thoroughbred',
    age: '5 năm',
    weight: 470,
    gender: 'STALLION', // Ngựa đực
    color: 'Nâu đậm (Dark Bay)',
    ownerName: 'CLB Đua Sa Đéc',
    status: 'IN_TRANSIT', // Đang vận chuyển
    activeTripCode: 'TR-2026-0142',
    medicalHistory: 'Đã tiêm phòng đầy đủ năm 2025. Thể lực tốt, nhạy cảm với tiếng ồn lớn.',
    welfare: {
      temperature: 37.8,
      waterLiters: 4,
      stressLevel: 'Bình tĩnh',
      lastUpdate: '10:20',
      escortName: 'Nguyễn Văn An'
    },
    documents: [
      {
        id: 'DOC-01',
        type: 'FEI_PASSPORT',
        title: 'Hộ chiếu FEI',
        fileName: 'FEI_ThunderBolt.pdf',
        fileSize: '2.4 MB',
        status: 'APPROVED',
        verifiedAt: '15/09/2026',
        documentCode: 'FEI-DOC-9812'
      },
      {
        id: 'DOC-02',
        type: 'VACCINATION',
        title: 'Chứng nhận tiêm phòng',
        fileName: 'Vaccine_2026.jpg',
        fileSize: '1.2 MB',
        status: 'PENDING_REVIEW',
        verifiedAt: null,
        documentCode: 'VAC-2026-VN-SG'
      },
      {
        id: 'DOC-03',
        type: 'HEALTH_CERT',
        title: 'Giấy khám sức khỏe',
        fileName: null,
        fileSize: null,
        status: 'REJECTED', // Cần bổ sung
        verifiedAt: null,
        documentCode: '',
        rejectionReason: 'Trang có chữ ký bác sĩ không đọc rõ. Vui lòng tải lại bản rõ nét và đầy đủ trang.'
      }
    ]
  },
  {
    id: 'H-002',
    name: 'Silver Wind',
    microchipId: '104123456789023',
    feiPassportNo: 'FEI-2026-0872',
    breed: 'Thoroughbred',
    age: '4 năm',
    weight: 450,
    gender: 'MARE', // Ngựa cái
    color: 'Xám bạch kim (Silver Grey)',
    ownerName: 'CLB Đua Sa Đéc',
    status: 'IN_TRANSIT',
    activeTripCode: 'TR-2026-0142',
    medicalHistory: 'Tiền sử mất nước nhẹ khi di chuyển dài. Cần bổ sung nước đều đặn mỗi 2 tiếng.',
    welfare: {
      temperature: 37.6,
      waterLiters: 4,
      stressLevel: 'Bình tĩnh',
      lastUpdate: '10:20',
      escortName: 'Nguyễn Văn An'
    },
    documents: [
      {
        id: 'DOC-04',
        type: 'FEI_PASSPORT',
        title: 'Hộ chiếu FEI',
        fileName: 'FEI_SilverWind.pdf',
        fileSize: '2.1 MB',
        status: 'APPROVED',
        verifiedAt: '14/09/2026',
        documentCode: 'FEI-DOC-9815'
      },
      {
        id: 'DOC-05',
        type: 'VACCINATION',
        title: 'Chứng nhận tiêm phòng',
        fileName: 'Vaccine_SilverWind.jpg',
        fileSize: '1.4 MB',
        status: 'APPROVED',
        verifiedAt: '15/09/2026',
        documentCode: 'VAC-2026-VN-SG-02'
      },
      {
        id: 'DOC-06',
        type: 'HEALTH_CERT',
        title: 'Giấy khám sức khỏe',
        fileName: 'Kham_SucKhoe_SW.pdf',
        fileSize: '3.0 MB',
        status: 'APPROVED',
        verifiedAt: '16/09/2026',
        documentCode: 'HLTH-9941'
      }
    ]
  },
  {
    id: 'H-003',
    name: 'Golden Flame',
    microchipId: '104123456789045',
    feiPassportNo: 'FEI-2026-0910',
    breed: 'Arabian',
    age: '6 năm',
    weight: 430,
    gender: 'GELDING', // Ngựa thiến
    color: 'Hạt dẻ (Chestnut)',
    ownerName: 'CLB Đua Sa Đéc',
    status: 'ACTIVE', // Sẵn sàng
    activeTripCode: null,
    medicalHistory: 'Sức khỏe loại A, không ghi nhận bệnh lý đặc biệt.',
    welfare: null,
    documents: [
      {
        id: 'DOC-07',
        type: 'FEI_PASSPORT',
        title: 'Hộ chiếu FEI',
        fileName: 'FEI_GoldenFlame.pdf',
        fileSize: '2.8 MB',
        status: 'APPROVED',
        verifiedAt: '10/09/2026',
        documentCode: 'FEI-DOC-9100'
      }
    ]
  }
];

const loadSavedHorses = () => {
  try {
    const data = localStorage.getItem('cbrt_horses_data');
    if (data) return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load horses from localStorage', err);
  }
  return INITIAL_HORSES;
};

export const useHorseStore = create((set, get) => ({
  horses: loadSavedHorses(),

  // Save helper
  _persist: (horses) => {
    localStorage.setItem('cbrt_horses_data', JSON.stringify(horses));
    set({ horses });
  },

  getHorseById: (id) => {
    return get().horses.find((h) => h.id === id || h._id === id);
  },

  addHorse: (horseData) => {
    const newId = `H-${Date.now().toString().slice(-4)}`;
    const newHorse = {
      id: newId,
      status: 'ACTIVE',
      ownerName: 'CLB Đua Sa Đéc',
      documents: [
        {
          id: `DOC-${Date.now()}-1`,
          type: 'FEI_PASSPORT',
          title: 'Hộ chiếu FEI',
          fileName: horseData.feiPassportNo ? `FEI_${horseData.name.replace(/\s+/g, '')}.pdf` : null,
          fileSize: horseData.feiPassportNo ? '2.1 MB' : null,
          status: horseData.feiPassportNo ? 'APPROVED' : 'REJECTED',
          documentCode: horseData.feiPassportNo || ''
        },
        {
          id: `DOC-${Date.now()}-2`,
          type: 'VACCINATION',
          title: 'Chứng nhận tiêm phòng',
          fileName: null,
          fileSize: null,
          status: 'REJECTED',
          documentCode: ''
        },
        {
          id: `DOC-${Date.now()}-3`,
          type: 'HEALTH_CERT',
          title: 'Giấy khám sức khỏe',
          fileName: null,
          fileSize: null,
          status: 'REJECTED',
          documentCode: ''
        }
      ],
      ...horseData
    };
    const updated = [newHorse, ...get().horses];
    get()._persist(updated);
    return newHorse;
  },

  updateHorse: (id, updatedData) => {
    const updated = get().horses.map((h) => {
      if (h.id === id || h._id === id) {
        return { ...h, ...updatedData };
      }
      return h;
    });
    get()._persist(updated);
  },

  deleteHorse: (id) => {
    const updated = get().horses.filter((h) => h.id !== id && h._id !== id);
    get()._persist(updated);
  },

  uploadDocument: (horseId, docType, fileInfo) => {
    const updated = get().horses.map((h) => {
      if (h.id === horseId || h._id === horseId) {
        const docs = h.documents.map((d) => {
          if (d.type === docType) {
            return {
              ...d,
              fileName: fileInfo.fileName,
              fileSize: fileInfo.fileSize || '1.5 MB',
              status: 'PENDING_REVIEW', // Chờ kiểm duyệt sau khi upload
              rejectionReason: null
            };
          }
          return d;
        });
        return { ...h, documents: docs };
      }
      return h;
    });
    get()._persist(updated);
  },

  verifyDocument: (horseId, docId, isApproved, rejectionReason = '') => {
    const updated = get().horses.map((h) => {
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
    });
    get()._persist(updated);
  }
}));
