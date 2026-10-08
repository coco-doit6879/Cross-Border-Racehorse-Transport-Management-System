import apiClient from './apiClient';

export const incidentApi = {
  getIncidents: () => apiClient.get('/incidents'),
  updateStatus: (id, data) => apiClient.patch(`/incidents/${id}/status`, data)
};
