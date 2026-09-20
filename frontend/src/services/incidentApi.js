import apiClient from './apiClient';

export const incidentApi = {
  getIncidents: () => apiClient.get('/incidents')
};
