import apiClient from './apiClient';

export const routeApi = {
  getRoutes: () => apiClient.get('/routes'),
  getRoute: (id) => apiClient.get(`/routes/${id}`),
  dispatch: (data) => apiClient.post('/routes/dispatch', data),
  updateAssignment: (id, data) => apiClient.patch(`/routes/${id}/assignment`, data)
};
