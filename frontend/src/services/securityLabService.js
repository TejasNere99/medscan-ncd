import api from './api';

/**
 * Frontend Service for Admin Security & Resilience Demonstration Lab.
 * Interfaces with /api/admin/security-lab/* endpoints.
 */

export const securityLabService = {
  // Global status
  getStatus: async () => {
    const response = await api.get('/admin/security-lab/status');
    return response.data?.data || response.data;
  },

  // 1. Blackout, Snapshot & Recovery Simulation API
  triggerBlackout: async (confirmed = true) => {
    const response = await api.post('/admin/security-lab/blackout/trigger', { confirmed });
    return response.data?.data || response.data;
  },

  restoreBlackout: async () => {
    const response = await api.post('/admin/security-lab/blackout/restore');
    return response.data?.data || response.data;
  },

  executeSyntheticOperation: async (operation = 'READ', payload = null) => {
    const response = await api.post('/admin/security-lab/blackout/synthetic-operation', {
      operation,
      payload,
    });
    return response.data?.data || response.data;
  },

  getBlackoutTimeline: async () => {
    const response = await api.get('/admin/security-lab/blackout/timeline');
    return response.data?.data || response.data;
  },

  resetBlackout: async () => {
    const response = await api.post('/admin/security-lab/blackout/reset');
    return response.data?.data || response.data;
  },

  // Snapshot Lifecycle API
  createSnapshot: async (type = 'MANUAL') => {
    const response = await api.post('/admin/security-lab/blackout/snapshot', { type });
    return response.data?.data || response.data;
  },

  getSnapshots: async () => {
    const response = await api.get('/admin/security-lab/blackout/snapshots');
    return response.data?.data || response.data;
  },

  simulateDataLoss: async (confirmed = true) => {
    const response = await api.post('/admin/security-lab/blackout/simulate-data-loss', { confirmed });
    return response.data?.data || response.data;
  },

  restoreFromSnapshot: async (snapshotId) => {
    const response = await api.post('/admin/security-lab/blackout/restore-snapshot', { snapshotId });
    return response.data?.data || response.data;
  },

  startPeriodicSnapshots: async (intervalMs = 15000) => {
    const response = await api.post('/admin/security-lab/blackout/periodic-snapshots/start', { intervalMs });
    return response.data?.data || response.data;
  },

  stopPeriodicSnapshots: async () => {
    const response = await api.post('/admin/security-lab/blackout/periodic-snapshots/stop');
    return response.data?.data || response.data;
  },

  // 2. Application-Level Encryption Simulation API
  getEncryptionRecord: async () => {
    const response = await api.get('/admin/security-lab/encryption/record');
    return response.data?.data || response.data;
  },

  encryptSyntheticRecord: async () => {
    const response = await api.post('/admin/security-lab/encryption/encrypt');
    return response.data?.data || response.data;
  },

  getBreachDump: async () => {
    const response = await api.get('/admin/security-lab/encryption/breach-dump');
    return response.data?.data || response.data;
  },

  decryptSyntheticRecord: async () => {
    const response = await api.post('/admin/security-lab/encryption/decrypt');
    return response.data?.data || response.data;
  },

  testCiphertextTampering: async () => {
    const response = await api.post('/admin/security-lab/encryption/tamper-test');
    return response.data?.data || response.data;
  },

  resetEncryption: async () => {
    const response = await api.post('/admin/security-lab/encryption/reset');
    return response.data?.data || response.data;
  },
};
