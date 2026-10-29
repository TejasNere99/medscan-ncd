import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler as asyncWrapper } from '../utils/asyncWrapper.js';
import { blackoutSimulationService } from '../services/blackoutSimulationService.js';
import { securityLabEncryptionService } from '../services/securityLabEncryptionService.js';

/**
 * Controller for Admin-Only Security & Resilience Demonstration Lab.
 * Enforces admin authorization, sanitizes inputs, and interfaces exclusively
 * with isolated in-memory simulation services.
 */

// 1. Overall Security Lab Status
export const getSecurityLabStatus = asyncWrapper(async (req, res) => {
  const blackoutStatus = blackoutSimulationService.getStatus();
  const encryptionStatus = securityLabEncryptionService.getRecordState();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        blackoutSimulation: blackoutStatus,
        encryptionSimulation: encryptionStatus,
        adminUser: {
          id: req.user._id,
          email: req.user.email,
          role: req.user.role,
        },
        safetyDeclaration: {
          isolatedState: true,
          liveDatabaseUntouched: true,
          syntheticDataOnly: true,
        },
      },
      'Security Lab status retrieved successfully'
    )
  );
});

// 2. Blackout: Trigger Blackout
export const triggerBlackout = asyncWrapper(async (req, res) => {
  const { confirmed } = req.body;
  if (!confirmed) {
    throw new ApiError(
      400,
      'Simulation confirmation required. You must explicitly acknowledge that this failure injection is confined to the simulation environment.'
    );
  }

  const result = blackoutSimulationService.triggerBlackout(req.user.email);
  return res
    .status(200)
    .json(new ApiResponse(200, result, 'Simulated database blackout successfully triggered.'));
});

// 3. Blackout: Restore Database Availability
export const restoreBlackout = asyncWrapper(async (req, res) => {
  const result = blackoutSimulationService.restore(req.user.email);
  return res
    .status(200)
    .json(new ApiResponse(200, result, 'Simulated database availability restored.'));
});

// 4. Blackout: Execute Synthetic Database Operation
export const executeSyntheticOperation = asyncWrapper(async (req, res) => {
  const { operation = 'READ', payload = null } = req.body;

  if (operation !== 'READ' && operation !== 'WRITE') {
    throw new ApiError(400, "Invalid synthetic operation. Allowed operations are 'READ' and 'WRITE'.");
  }

  // Any non-synthetic database target is rejected
  if (req.body.collection || req.body.databaseName || req.body.filePath) {
    throw new ApiError(400, 'Security Violation: Arbitrary resource identifiers are prohibited.');
  }

  const result = blackoutSimulationService.executeSyntheticOperation({ operation, payload });
  return res.status(200).json(new ApiResponse(200, result, `Synthetic ${operation} executed.`));
});

// 5. Blackout: Get Timeline Events
export const getBlackoutTimeline = asyncWrapper(async (req, res) => {
  const status = blackoutSimulationService.getStatus();
  return res.status(200).json(new ApiResponse(200, status.recentEvents, 'Timeline events retrieved.'));
});

// 6. Blackout: Reset Simulation
export const resetBlackout = asyncWrapper(async (req, res) => {
  const result = blackoutSimulationService.reset();
  return res.status(200).json(new ApiResponse(200, result, 'Blackout simulation reset to baseline.'));
});

// --- NEW SNAPSHOT & RESTORE ENDPOINTS ---

// 7. Snapshot: Create Snapshot
export const createSnapshot = asyncWrapper(async (req, res) => {
  const { type = 'MANUAL' } = req.body;
  const result = blackoutSimulationService.createSnapshot({ type });
  return res.status(200).json(new ApiResponse(200, result, 'Point-in-time snapshot captured.'));
});

// 8. Snapshot: List Snapshots
export const getSnapshots = asyncWrapper(async (req, res) => {
  const status = blackoutSimulationService.getStatus();
  return res.status(200).json(new ApiResponse(200, status.snapshots, 'Snapshots retrieved.'));
});

// 9. Blackout: Simulate Blackout & Data Loss
export const simulateDataLoss = asyncWrapper(async (req, res) => {
  const { confirmed } = req.body;
  const result = blackoutSimulationService.simulateDataLoss(req.user.email, confirmed);
  return res
    .status(200)
    .json(new ApiResponse(200, result, 'Simulated blackout and data loss injected.'));
});

// 10. Snapshot: Restore from Snapshot
export const restoreFromSnapshot = asyncWrapper(async (req, res) => {
  const { snapshotId } = req.body;
  if (!snapshotId) {
    throw new ApiError(400, 'Snapshot ID is required for restoration.');
  }

  // Prevent injection attempts
  if (typeof snapshotId !== 'string' || snapshotId.length > 100 || !snapshotId.startsWith('SNAP-')) {
    throw new ApiError(400, 'Invalid snapshot ID format.');
  }

  const result = blackoutSimulationService.restoreFromSnapshot(snapshotId, req.user.email);
  return res
    .status(200)
    .json(new ApiResponse(200, result, 'Synthetic dataset restored from snapshot.'));
});

// 11. Snapshot: Start Periodic Scheduler
export const startPeriodicSnapshots = asyncWrapper(async (req, res) => {
  const { intervalMs = 15000 } = req.body;
  const result = blackoutSimulationService.startPeriodicSnapshots(intervalMs);
  return res.status(200).json(new ApiResponse(200, result, 'Periodic snapshot scheduler started.'));
});

// 12. Snapshot: Stop Periodic Scheduler
export const stopPeriodicSnapshots = asyncWrapper(async (req, res) => {
  const result = blackoutSimulationService.stopPeriodicSnapshots();
  return res.status(200).json(new ApiResponse(200, result, 'Periodic snapshot scheduler stopped.'));
});

// --- CONCEPT TWO: ENCRYPTION ENDPOINTS ---

// 13. Encryption: Get Record State
export const getEncryptionRecord = asyncWrapper(async (req, res) => {
  const state = securityLabEncryptionService.getRecordState();
  return res.status(200).json(new ApiResponse(200, state, 'Synthetic record state retrieved.'));
});

// 14. Encryption: Encrypt Synthetic Record
export const encryptSyntheticRecord = asyncWrapper(async (req, res) => {
  const result = securityLabEncryptionService.encryptSyntheticRecord();
  return res.status(200).json(new ApiResponse(200, result, 'Synthetic record encrypted with AES-256-GCM.'));
});

// 15. Encryption: Simulated Breach Dump
export const getBreachDump = asyncWrapper(async (req, res) => {
  const result = securityLabEncryptionService.getBreachDumpView();
  return res.status(200).json(new ApiResponse(200, result, 'Simulated database breach view generated.'));
});

// 16. Encryption: Decrypt with Authorized Key
export const decryptSyntheticRecord = asyncWrapper(async (req, res) => {
  const result = securityLabEncryptionService.decryptSyntheticRecord();
  return res.status(200).json(new ApiResponse(200, result, 'Synthetic record successfully decrypted.'));
});

// 17. Encryption: Test Ciphertext Tampering
export const testCiphertextTampering = asyncWrapper(async (req, res) => {
  const result = securityLabEncryptionService.testCiphertextTampering();
  return res.status(200).json(new ApiResponse(200, result, 'Ciphertext tampering test completed.'));
});

// 18. Encryption: Reset Encryption Simulation
export const resetEncryption = asyncWrapper(async (req, res) => {
  const result = securityLabEncryptionService.reset();
  return res.status(200).json(new ApiResponse(200, result, 'Encryption simulation reset to baseline.'));
});
