import { Platform } from 'react-native';

function getApiUrl(): string {
  if (Platform.OS === 'web') {
    const host = typeof window !== 'undefined' && window.location?.hostname ? window.location.hostname : 'localhost';
    return `http://${host}:5000/api/v1`;
  }
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    if (Platform.OS === 'android' && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
      return envUrl.replace(/localhost|127\.0\.0\.1/, '10.0.2.2');
    }
    return envUrl;
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:5000/api/v1' : 'http://localhost:5000/api/v1';
}

export const API_URL = getApiUrl();
export const SOCKET_URL = API_URL.replace(/\/api\/v1\/?$/, '');
