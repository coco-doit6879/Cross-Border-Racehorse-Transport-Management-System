import apiClient from './apiClient';

export const analyticsApi = {
  getKPI: () => apiClient.get('/analytics/kpi'),
  getB2BReconciliation: (params) => apiClient.get('/analytics/b2b-reconciliation', { params }),
  getRevenue: (params) => apiClient.get('/analytics/revenue', { params }),
};
