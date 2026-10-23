import { create } from 'zustand';
import { authApi } from '../services/authApi';
import { disconnectSocket } from '../socket/socketClient';
import { getApiErrorMessage } from '../utils/apiResponse';
import { getAccessToken, removeAccessToken, setAccessToken, getStoredUser, setStoredUser } from '../utils/authSession';
import { USER_ROLES } from '../utils/constants';

const storedToken = getAccessToken();
const storedUser = getStoredUser();
let bootstrapRequest = null;

const removeStoredSession = () => {
  removeAccessToken();
  disconnectSocket();
};

export const useAuthStore = create((set, get) => ({
  user: storedUser,
  token: storedToken,
  isAuthenticated: Boolean(storedToken),
  sessionStatus: storedToken ? 'authenticated' : 'unauthenticated',
  profileError: '',

  setSession: ({ token, user }) => {
    setAccessToken(token);
    setStoredUser(user);
    set({
      token,
      user,
      isAuthenticated: true,
      sessionStatus: 'authenticated',
      profileError: ''
    });
  },

  setToken: (token) => {
    setAccessToken(token);
    set({ token, isAuthenticated: true, sessionStatus: 'authenticated' });
  },

  setUser: (user) => {
    setStoredUser(user);
    set({
      user,
      isAuthenticated: Boolean(user && get().token),
      sessionStatus: user && get().token ? 'authenticated' : get().sessionStatus
    });
  },

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
      set({ user: null, sessionStatus: 'unauthenticated', isAuthenticated: false, profileError: '' });
      return null;
    }

    if (token.startsWith('demo-token-')) {
      let demoUser = user || getStoredUser();
      if (!demoUser) {
        if (token.includes('manager')) {
          demoUser = { id: 'usr-manager', fullName: 'MG-01 Quản lý Logistics', email: 'manager01@gmail.com', role: USER_ROLES.LOGISTICS_MANAGER };
        } else if (token.includes('specialist')) {
          demoUser = { id: 'usr-specialist', fullName: 'SP-01 Chuyên viên Kiểm dịch', email: 'specialist01@gmail.com', role: USER_ROLES.TRANSPORT_SPECIALIST };
        } else if (token.includes('coordinator')) {
          demoUser = { id: 'usr-coordinator', fullName: 'CO-01 Điều phối viên Đội xe', email: 'coordinator01@gmail.com', role: USER_ROLES.FLEET_COORDINATOR };
        } else {
          demoUser = { id: 'usr-customer', fullName: 'Tran Le Anh Quan', email: 'anhquan@gmail.com', role: USER_ROLES.CUSTOMER };
        }
      }
      setStoredUser(demoUser);
      set({ user: demoUser, isAuthenticated: true, sessionStatus: 'authenticated', profileError: '' });
      return demoUser;
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
