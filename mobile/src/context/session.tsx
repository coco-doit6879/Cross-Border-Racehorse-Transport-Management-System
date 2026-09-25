import * as SecureStore from 'expo-secure-store';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { API_URL } from '@/lib/config';
import type { User } from '@/types/domain';

type ApiOptions = RequestInit & { skipRefresh?: boolean };
type SessionValue = {
  user: User | null; loading: boolean; accessToken: string | null;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  apiFetch: <T>(path: string, options?: ApiOptions) => Promise<T>;
};

const ACCESS_KEY = 'cbrt.accessToken';
const REFRESH_KEY = 'cbrt.refreshToken';
const USER_KEY = 'cbrt.user';
const SessionContext = createContext<SessionValue | null>(null);

async function storageGet(key: string) {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) || null;
  return SecureStore.getItemAsync(key);
}
async function storageSet(key: string, value: string | null) {
  if (Platform.OS === 'web') {
    if (value === null) globalThis.localStorage?.removeItem(key); else globalThis.localStorage?.setItem(key, value);
    return;
  }
  if (value === null) await SecureStore.deleteItemAsync(key); else await SecureStore.setItemAsync(key, value);
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([storageGet(ACCESS_KEY), storageGet(USER_KEY)])
      .then(([token, savedUser]) => {
        setAccessToken(token);
        if (savedUser) setUser(JSON.parse(savedUser));
      })
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback(async (nextUser: User | null, access: string | null, refresh?: string | null) => {
    setUser(nextUser); setAccessToken(access);
    await Promise.all([
      storageSet(ACCESS_KEY, access),
      storageSet(USER_KEY, nextUser ? JSON.stringify(nextUser) : null),
      refresh === undefined ? Promise.resolve() : storageSet(REFRESH_KEY, refresh),
    ]);
  }, []);

  const signOut = useCallback(() => persist(null, null, null), [persist]);

  const refreshAccessToken = useCallback(async () => {
    const refreshToken = await storageGet(REFRESH_KEY);
    if (!refreshToken) throw new Error('Phiên đăng nhập đã hết hạn.');
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }),
    });
    const body = await response.json();
    if (!response.ok || !body.accessToken) { await signOut(); throw new Error(body.message || 'Phiên đăng nhập đã hết hạn.'); }
    setAccessToken(body.accessToken);
    await storageSet(ACCESS_KEY, body.accessToken);
    return body.accessToken as string;
  }, [signOut]);

  const apiFetch = useCallback(async <T,>(path: string, options: ApiOptions = {}): Promise<T> => {
    const run = async (token: string | null) => fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    });
    let response = await run(accessToken);
    if (response.status === 401 && !options.skipRefresh) response = await run(await refreshAccessToken());
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || `Yêu cầu thất bại (${response.status}).`);
    return body as T;
  }, [accessToken, refreshAccessToken]);

  const signIn = useCallback(async (identifier: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: identifier.trim(), email: identifier.trim(), password, deviceName: `${Platform.OS} driver app` }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || 'Tên đăng nhập hoặc mật khẩu không đúng.');
    if (body.user?.role !== 'DRIVER') throw new Error('Ứng dụng này chỉ dành cho tài xế.');
    await persist(body.user, body.accessToken, body.refreshToken);
  }, [persist]);

  const value = useMemo(() => ({ user, loading, accessToken, signIn, signOut, apiFetch }), [user, loading, accessToken, signIn, signOut, apiFetch]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
