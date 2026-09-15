import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('cbrt_token') || null,
  isAuthenticated: !!localStorage.getItem('cbrt_token'),
  setUser: (user) => set({ user }),
  setToken: (token) => {
    localStorage.setItem('cbrt_token', token);
    set({ token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('cbrt_token');
    set({ user: null, token: null, isAuthenticated: false });
  }
}));
