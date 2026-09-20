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

export const useAuthStore = create((set, get) => ({
  user: null,
  token: storedToken,
  isAuthenticated: false,
  sessionStatus: storedToken ? 'idle' : 'unauthenticated',
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

  setUser: (user) => set({
    user,
    isAuthenticated: Boolean(user && get().token),
    sessionStatus: user && get().token ? 'authenticated' : get().sessionStatus
  }),

  clearSession: () => {
    removeStoredSession();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      sessionStatus: 'unauthenticated',
      profileError: ''
    });
  },

  bootstrapSession: async ({ force = false } = {}) => {
    const { token, user, sessionStatus } = get();

    if (!token) {
      set({ sessionStatus: 'unauthenticated', isAuthenticated: false, profileError: '' });
      return null;
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
        const profile = response?.data?.user;
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
          return null;
        }

        set({
          user: null,
          isAuthenticated: false,
          sessionStatus: 'error',
          profileError: getApiErrorMessage(error, 'Không thể tải hồ sơ người dùng.')
        });
        throw error;
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
