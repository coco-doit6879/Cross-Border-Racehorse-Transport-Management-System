import apiClient from './apiClient';

export const horseApi = {
  getHorses: () => apiClient.get('/horses'),
  getHorseById: (id) => apiClient.get(`/horses/${id}`),
  createHorse: (data) => apiClient.post('/horses', data),
  updateHorse: (id, data) => apiClient.put(`/horses/${id}`, data),
  reviewHorse: (id, data) => apiClient.post(`/horses/${id}/review`, data),
  uploadFile: (file) => apiClient.post('/horses/files', file, {
    headers: { 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name) }
  }),
  getFile: (url) => apiClient.get(url, { responseType: 'blob' })
};
