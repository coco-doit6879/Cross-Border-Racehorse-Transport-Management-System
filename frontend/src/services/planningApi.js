import api from './apiClient';
export const planningApi = {
  load: () => api.get('/planning'),
  update: (order,action,extra={}) => api.patch(`/planning/${order._id||order.id}`,{version:order.operationsVersion||0,action,...extra}),
  road: points => api.post('/planning/road',{points}),
};
