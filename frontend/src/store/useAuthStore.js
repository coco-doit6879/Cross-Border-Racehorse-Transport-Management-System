import { create } from 'zustand';

const DEFAULT_USER = {
  id: 'USR-001',
  fullName: 'Nguyễn Văn Nam',
  email: 'customer@cbrt.com',
  role: 'CUSTOMER', // Mặc định là Customer
  clubName: 'CLB Đua Sa Đéc',
  phone: '0908 123 456',
  permissions: ['horse:create_own', 'booking:create', 'compliance:upload', 'pod:sign']
};

export const useAuthStore = create((set, get) => ({
  user: DEFAULT_USER,
  token: localStorage.getItem('cbrt_token') || 'demo_mock_jwt_token_2026',
  isAuthenticated: true,

  setUser: (user) => set({ user }),

  setToken: (token) => {
    localStorage.setItem('cbrt_token', token);
    set({ token, isAuthenticated: true });
  },

  switchRole: (newRole) => {
    if (newRole === 'LOGISTICS_MANAGER') {
      set({
        user: {
          id: 'USR-MGR-01',
          fullName: 'Trần Đình Trọng',
          email: 'manager@cbrt.com',
          role: 'LOGISTICS_MANAGER',
          clubName: 'CBRT Operations HQ',
          phone: '0912 345 678',
          permissions: ['user:manage', 'horse:manage_all', 'booking:approve', 'sos:manage', 'audit:view', 'analytics:view']
        }
      });
    } else {
      set({
        user: DEFAULT_USER
      });
    }
  },

  logout: () => {
    localStorage.removeItem('cbrt_token');
    set({ user: null, token: null, isAuthenticated: false });
  }
}));
