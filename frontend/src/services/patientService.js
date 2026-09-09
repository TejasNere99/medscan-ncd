import api from './api';

export const patientService = {
  getMyProfile: async () => {
    return await api.get('/patients/me');
  },

  getPatients: async (params = {}) => {
    return await api.get('/patients', { params });
  },

  getPatientById: async (id) => {
    return await api.get(`/patients/${id}`);
  },

  createPatient: async (data) => {
    return await api.post('/patients', data);
  },

  updatePatient: async (id, data) => {
    return await api.put(`/patients/${id}`, data);
  },

  deletePatient: async (id) => {
    return await api.delete(`/patients/${id}`);
  },

  getLinkedFamilyPatients: async () => {
    return await api.get('/patients/linked');
  },
};
