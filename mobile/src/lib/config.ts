import { Platform } from 'react-native';

const fallbackHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
export const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${fallbackHost}:5000/api/v1`;
export const SOCKET_URL = API_URL.replace(/\/api\/v1\/?$/, '');
