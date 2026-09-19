import api from './api';

export const predictionService = {
  // Scenario A Diabetes ML Endpoints
  predictDiabetes: async (data) => {
    return await api.post('/predictions/diabetes', data);
  },

  getLatestDiabetesPrediction: async (patientId) => {
    return await api.get('/predictions/diabetes/latest', { params: { patientId } });
  },

  getDiabetesPredictionHistory: async (patientId) => {
    return await api.get('/predictions/diabetes/history', { params: { patientId } });
  },

  // Framingham 10-Year CHD Heart Disease ML Endpoints
  predictHeartDisease: async (data) => {
    return await api.post('/predictions/heart-disease', data);
  },

  getLatestHeartDiseasePrediction: async (patientId) => {
    return await api.get('/predictions/heart-disease/latest', { params: { patientId } });
  },

  getHeartDiseasePredictionHistory: async (patientId) => {
    return await api.get('/predictions/heart-disease/history', { params: { patientId } });
  },

  getPredictionHistory: async (patientId) => {
    return await api.get('/predictions/diabetes/history', { params: { patientId } });
  },
};

