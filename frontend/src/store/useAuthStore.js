import { create } from 'zustand';

const DEFAULT_USER = {
  id: 'USR-001',
  fullName: 'Nguyễn Văn Nam',
  email: 'customer@cbrt.com',
  role: 'CUSTOMER',
  clubName: 'CLB Đua Sa Đéc',
  phone: '0908 123 456',
  permissions: ['horse:create_own', 'booking:create', 'compliance:upload', 'pod:sign']
};

export const useAuthStore = create((set) => ({
  user: DEFAULT_USER,
  isAuthenticated: true,
  setUser: (user) => set({ user })
}));
