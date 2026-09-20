import { create } from 'zustand';
import { authApi } from '../services/authApi';
import { disconnectSocket } from '../socket/socketClient';
import { getApiErrorMessage } from '../utils/apiResponse';

const TOKEN_KEY = 'cbrt_token';
const storedToken = localStorage.getItem(TOKEN_KEY);
let bootstrapRequest = null;

const removeStoredSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  disconnectSocket();
};

const DEFAULT_USER = {
  id: 'USR-001',
  fullName: 'Nguyễn Văn Nam',
  email: 'customer@cbrt.com',
  role: 'CUSTOMER',
  clubName: 'CLB Đua Sa Đéc',
  phone: '0908 123 456',
  permissions: ['horse:create_own', 'booking:create', 'compliance:upload', 'pod:sign']
};

export const useAuthStore = create((set, get) => ({
  user: storedToken ? null : DEFAULT_USER,
  token: storedToken,
  isAuthenticated: true,
  sessionStatus: storedToken ? 'idle' : 'authenticated',
  profileError: '',

  setSession: ({ token, user }) => {
    localStorage.setItem(TOKEN_KEY, token);
    set({
      token,
      user,
      isAuthenticated: true,
      sessionStatus: 'authenticated',
      profileError: ''
    });
  },

  setToken: (token) => {
    localStorage.setItem(TOKEN_KEY, token);
    set({ token, isAuthenticated: true, sessionStatus: 'authenticated' });
  },

  setUser: (user) => set({
    user,
    isAuthenticated: Boolean(user),
    sessionStatus: user ? 'authenticated' : get().sessionStatus
  }),

  clearSession: () => {
    removeStoredSession();
    set({
      user: DEFAULT_USER,
      token: null,
      isAuthenticated: true,
      sessionStatus: 'authenticated',
      profileError: ''
    });
  },

  bootstrapSession: async ({ force = false } = {}) => {
    const { token, user, sessionStatus } = get();

    if (!token) {
      set({ sessionStatus: 'authenticated', isAuthenticated: true, profileError: '' });
      return get().user || DEFAULT_USER;
    }

    if (user && !force) {
      set({ sessionStatus: 'authenticated', isAuthenticated: true, profileError: '' });
      return user;
    }

    if (bootstrapRequest) return bootstrapRequest;
    if (sessionStatus === 'authenticated' && !force) return user;

    set({ sessionStatus: 'checking', profileError: '' });

    bootstrapRequest = authApi.getProfile()
      .then((response) => {
        const profile = response?.data?.user || response?.data;
        if (!profile || typeof profile !== 'object') {
          throw new Error('Máy chủ trả về hồ sơ người dùng không hợp lệ.');
        }

        set({
          user: profile,
          isAuthenticated: true,
          sessionStatus: 'authenticated',
          profileError: ''
        });
        return profile;
      })
      .catch((error) => {
        if (error?.response?.status === 401) {
          get().clearSession();
          return DEFAULT_USER;
        }

        set({
          user: DEFAULT_USER,
          isAuthenticated: true,
          sessionStatus: 'authenticated',
          profileError: getApiErrorMessage(error, 'Không thể tải hồ sơ người dùng.')
        });
        return DEFAULT_USER;
      })
      .finally(() => {
        bootstrapRequest = null;
      });

    return bootstrapRequest;
  },

  logout: () => get().clearSession()
}));

if (typeof window !== 'undefined') {
  window.addEventListener('cbrt:session-expired', () => {
    useAuthStore.getState().clearSession();
  });
}
