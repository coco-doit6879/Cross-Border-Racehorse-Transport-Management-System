import apiClient from './apiClient';

export const orderApi = {
  // The locked API exposes a complete, unpaginated collection and does not
  // define search/filter query parameters. Filtering and paging therefore
  // remain client-side until the backend contract is expanded.
  getOrders: () => apiClient.get('/orders'),
  getOrderById: (id) => apiClient.get(`/orders/${id}`),
  createOrder: (data) => apiClient.post('/orders', data),
  updateStatus: (id, status) => apiClient.patch(`/orders/${id}/status`, { status })
};
