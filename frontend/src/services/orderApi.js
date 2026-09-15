import apiClient from './apiClient';

export const orderApi = {
  getOrders: (params) => apiClient.get('/orders', { params }),
  getOrderById: (id) => apiClient.get(`/orders/${id}`),
  createOrder: (data) => apiClient.post('/orders', data),
  updateStatus: (id, status) => apiClient.patch(`/orders/${id}/status`, { status })
};
