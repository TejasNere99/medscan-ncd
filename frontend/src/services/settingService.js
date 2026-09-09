import api from './api';

export const settingService = {
  getSettings: async () => {
    return await api.get('/settings');
  },

  updateSettings: async (settingsData) => {
    return await api.put('/settings', settingsData);
  },
};
