import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('cbrt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = error?.config?.url || '';

    // The confirmed backend contract has no refresh-token endpoint. A 401 from
    // an authenticated request therefore ends the local session. A 403 never
    // changes authentication state.
    if (status === 401 && !requestUrl.endsWith('/auth/login')) {
      localStorage.removeItem('cbrt_token');
      window.dispatchEvent(new Event('cbrt:session-expired'));
    }

    return Promise.reject(error);
  }
);

export default apiClient;
