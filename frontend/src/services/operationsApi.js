import apiClient from './apiClient';

export const operationsApi = {
  getComplianceDocuments: (params) => apiClient.get('/compliance', { params }),
  reviewComplianceDocument: (id, data) => apiClient.patch(`/compliance/${id}/verify`, data),
  getOperationalStaff: () => apiClient.get('/users/operational'),
  getVehicles: () => apiClient.get('/vehicles'),
  createVehicle: (data) => apiClient.post('/vehicles', data),
  updateVehicle: (id, data) => apiClient.put(`/vehicles/${id}`, data),
};
