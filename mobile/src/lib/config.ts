import { Platform } from 'react-native';

function getApiUrl(): string {
  if (Platform.OS === 'web') {
    const host = typeof window !== 'undefined' && window.location?.hostname ? window.location.hostname : 'localhost';
    return `http://${host}:5000/api/v1`;
  }
  return process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:5000/api/v1' : 'http://localhost:5000/api/v1');
}

export const API_URL = getApiUrl();
export const SOCKET_URL = API_URL.replace(/\/api\/v1\/?$/, '');
