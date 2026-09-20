import apiClient from './apiClient';

export const horseApi = {
  getHorses: () => apiClient.get('/horses'),
  getHorseById: (id) => apiClient.get(`/horses/${id}`),
  createHorse: (data) => apiClient.post('/horses', data),
  updateHorse: (id, data) => apiClient.put(`/horses/${id}`, data)
};

