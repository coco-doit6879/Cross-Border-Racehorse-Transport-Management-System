import apiClient from './apiClient';

export const transportScheduleApi = {
  getCatalog: () => apiClient.get('/transport-schedules'),
  updateSchedule: (data) => apiClient.put('/transport-schedules', data)
};
