import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/roleCheck.js';
import {
  getSecurityLabStatus,
  triggerBlackout,
  restoreBlackout,
  executeSyntheticOperation,
  getBlackoutTimeline,
  resetBlackout,
  createSnapshot,
  getSnapshots,
  simulateDataLoss,
  restoreFromSnapshot,
  startPeriodicSnapshots,
  stopPeriodicSnapshots,
  getEncryptionRecord,
  encryptSyntheticRecord,
  getBreachDump,
  decryptSyntheticRecord,
  testCiphertextTampering,
  resetEncryption,
} from '../controllers/securityLabController.js';

const router = Router();

// Strict RBAC: All endpoints require verified JWT and the 'Admin' role.
// Any request from Patient, Doctor, or CHO role will receive 403 Forbidden.
// Unauthenticated requests receive 401 Unauthorized.
router.use(verifyJWT, authorizeRoles('Admin'));

// Status & Dashboard Overview
router.get('/status', getSecurityLabStatus);

// 1. Concept One: Database Blackout, Snapshot & Recovery Simulation
router.post('/blackout/trigger', triggerBlackout);
router.post('/blackout/restore', restoreBlackout);
router.post('/blackout/synthetic-operation', executeSyntheticOperation);
router.get('/blackout/timeline', getBlackoutTimeline);
router.post('/blackout/reset', resetBlackout);

// Snapshot & Data Loss Lifecycle
router.post('/blackout/snapshot', createSnapshot);
router.get('/blackout/snapshots', getSnapshots);
router.post('/blackout/simulate-data-loss', simulateDataLoss);
router.post('/blackout/restore-snapshot', restoreFromSnapshot);
router.post('/blackout/periodic-snapshots/start', startPeriodicSnapshots);
router.post('/blackout/periodic-snapshots/stop', stopPeriodicSnapshots);

// 2. Concept Two: Medical Data Breach & Application-Level Encryption
router.get('/encryption/record', getEncryptionRecord);
router.post('/encryption/encrypt', encryptSyntheticRecord);
router.get('/encryption/breach-dump', getBreachDump);
router.post('/encryption/decrypt', decryptSyntheticRecord);
router.post('/encryption/tamper-test', testCiphertextTampering);
router.post('/encryption/reset', resetEncryption);

export default router;
