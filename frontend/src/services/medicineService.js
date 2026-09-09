import api from './api';

export const medicineService = {
  getMedicines: async (patientId) => {
    return await api.get('/medicines', { params: { patientId } });
  },

  getMedicineLogs: async (patientId, status) => {
    return await api.get('/medicines/logs', { params: { patientId, status } });
  },

  addMedicine: async (data) => {
    return await api.post('/medicines', data);
  },

  updateStatus: async (medicineId, status, notes, logId) => {
    return await api.post(`/medicines/${medicineId}/status`, { status, notes, logId });
  },

  deleteMedicine: async (id) => {
    return await api.delete(`/medicines/${id}`);
  },
};
