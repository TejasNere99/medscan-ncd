import api from './api';

export const appointmentService = {
  getAppointments: async (patientId) => {
    return await api.get('/appointments', { params: { patientId } });
  },

  createAppointment: async (data) => {
    return await api.post('/appointments', data);
  },

  updateStatus: async (id, status, notes) => {
    return await api.put(`/appointments/${id}`, { status, notes });
  },
};
