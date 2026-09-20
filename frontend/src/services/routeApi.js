import apiClient from './apiClient';

export const routeApi = {
  getRoutes: () => apiClient.get('/routes')
};
