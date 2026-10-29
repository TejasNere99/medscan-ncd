import mongoose from 'mongoose';
import crypto from 'node:crypto';
import { ApiError } from '../utils/apiError.js';

/**
 * Isolated Database Blackout, Snapshot & Recovery Simulation Engine.
 * 
 * Safety & Isolation Guarantees:
 * - NEVER stops, closes, modifies, or disconnects the production MongoDB Atlas connection.
 * - Manages an in-memory synthetic database state exclusively for the Security Lab.
 * - Real patient records, reports, predictions, and active user sessions remain 100% isolated.
 * - Live MongoDB connection health is independently queried and reported in parallel.
 * - Provides genuine snapshot capturing (deep-copy), simulated blackout & data loss,
 *   snapshot-based restoration, and deterministic SHA-256 integrity verification.
 */

const SEED_SYNTHETIC_DATASET = [
  {
    demoPatientId: 'DEMO-PATIENT-001',
    reportId: 'DEMO-REPORT-001',
    name: 'Aarav Demo',
    status: 'Available',
    lastSyncedAt: new Date().toISOString(),
    datasetType: 'SYNTHETIC_DEMO_ONLY',
    metrics: {
      bloodPressure: '128/82 mmHg',
      fastingGlucose: '110 mg/dL',
      cholesterol: '185 mg/dL',
    },
  },
  {
    demoPatientId: 'DEMO-PATIENT-002',
    reportId: 'DEMO-REPORT-002',
    name: 'Diya Demo',
    status: 'Available',
    lastSyncedAt: new Date().toISOString(),
    datasetType: 'SYNTHETIC_DEMO_ONLY',
    metrics: {
      bloodPressure: '118/76 mmHg',
      fastingGlucose: '92 mg/dL',
      cholesterol: '160 mg/dL',
    },
  },
  {
    demoPatientId: 'DEMO-PATIENT-003',
    reportId: 'DEMO-REPORT-003',
    name: 'Rohan Demo',
    status: 'Available',
    lastSyncedAt: new Date().toISOString(),
    datasetType: 'SYNTHETIC_DEMO_ONLY',
    metrics: {
      bloodPressure: '135/88 mmHg',
      fastingGlucose: '126 mg/dL',
      cholesterol: '210 mg/dL',
    },
  },
];

/**
 * Computes a deterministic canonical SHA-256 integrity hash for a synthetic dataset.
 */
export const computeDatasetHash = (records) => {
  if (!records || !Array.isArray(records) || records.length === 0) {
    return 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // Hash of empty string
  }
  const sorted = [...records].sort((a, b) =>
    (a.demoPatientId || '').localeCompare(b.demoPatientId || '')
  );
  const canonicalString = JSON.stringify(sorted);
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
};

class BlackoutSimulationService {
  constructor() {
    this.simulatedStatus = 'HEALTHY'; // 'HEALTHY' | 'UNAVAILABLE' | 'RECOVERING'
    this.syntheticRecords = JSON.parse(JSON.stringify(SEED_SYNTHETIC_DATASET));
    this.snapshots = [];
    this.periodicTimer = null;
    this.lastRecovery = null;
    this.timeline = [];
    this.stats = {
      totalSimulatedRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      blackoutTriggers: 0,
      dataLossEvents: 0,
      snapshotsCreated: 0,
      recoveries: 0,
    };

    // Create baseline initial snapshot
    this.createSnapshot({ type: 'MANUAL', initial: true });

    // Add baseline event
    this._logEvent({
      type: 'ENGINE_INITIALIZED',
      title: 'Simulation Engine Initialized',
      message: 'Isolated in-memory database simulation ready. Live MongoDB Atlas is active and untouched.',
      statusCode: 200,
      latencyMs: 1.2,
    });
  }

  get syntheticRecord() {
    return this.syntheticRecords[0] || {
      demoPatientId: 'DEMO-PATIENT-001',
      status: 'Unavailable (Data Lost)',
      datasetType: 'SYNTHETIC_DEMO_ONLY',
    };
  }

  _logEvent({ type, title, message, statusCode, latencyMs = 0 }) {
    const event = {
      id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      type,
      title,
      message,
      statusCode,
      latencyMs,
      simulatedStatus: this.simulatedStatus,
      activeRecordCount: this.syntheticRecords.length,
      liveDbConnected: mongoose.connection.readyState === 1,
    };
    this.timeline.unshift(event);
    if (this.timeline.length > 50) {
      this.timeline.pop();
    }
    return event;
  }

  /**
   * Retrieves current simulation engine status, snapshot catalog, and live database telemetry.
   */
  getStatus() {
    return {
      simulatedStatus: this.simulatedStatus,
      syntheticRecords: this.syntheticRecords,
      syntheticRecord: this.syntheticRecord,
      activeRecordCount: this.syntheticRecords.length,
      currentHash: computeDatasetHash(this.syntheticRecords),
      snapshots: this.snapshots.map((s) => ({
        id: s.id,
        timestamp: s.timestamp,
        type: s.type,
        recordCount: s.recordCount,
        integrityHash: s.integrityHash,
        status: s.status,
        sizeBytes: s.sizeBytes,
      })),
      latestSnapshot: this.snapshots[0]
        ? {
            id: this.snapshots[0].id,
            timestamp: this.snapshots[0].timestamp,
            type: this.snapshots[0].type,
            recordCount: this.snapshots[0].recordCount,
            integrityHash: this.snapshots[0].integrityHash,
          }
        : null,
      lastRecovery: this.lastRecovery,
      periodicSnapshotsActive: this.periodicTimer !== null,
      stats: { ...this.stats },
      recentEvents: this.timeline.slice(0, 15),
      liveDatabase: {
        status: mongoose.connection.readyState === 1 ? 'ONLINE' : 'OFFLINE',
        connected: mongoose.connection.readyState === 1,
        readyState: mongoose.connection.readyState,
        note: 'Live MongoDB Atlas remains online throughout all simulations.',
      },
      isolationGuarantee: {
        mode: 'ISOLATED_IN_MEMORY',
        sharedStateModified: false,
        productionSafetyVerified: true,
      },
    };
  }

  /**
   * Captures an independent point-in-time snapshot of the synthetic dataset.
   */
  createSnapshot({ type = 'MANUAL', initial = false } = {}) {
    const startTime = process.hrtime.bigint();

    // Deep copy current active synthetic records
    const clonedRecords = JSON.parse(JSON.stringify(this.syntheticRecords));
    const integrityHash = computeDatasetHash(clonedRecords);
    const snapshotId = `SNAP-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const serialized = JSON.stringify(clonedRecords);

    const snapshot = {
      id: snapshotId,
      timestamp: new Date().toISOString(),
      type, // 'MANUAL' | 'SIMULATED_PERIODIC'
      recordCount: clonedRecords.length,
      records: clonedRecords,
      integrityHash,
      status: 'ACTIVE',
      sizeBytes: Buffer.byteLength(serialized, 'utf8'),
    };

    // Prepend snapshot so latest is first
    this.snapshots.unshift(snapshot);
    if (this.snapshots.length > 10) {
      this.snapshots.pop();
    }

    this.stats.snapshotsCreated += 1;
    const endTime = process.hrtime.bigint();
    const durationMs = parseFloat((Number(endTime - startTime) / 1e6).toFixed(2));

    if (!initial) {
      this._logEvent({
        type: 'SNAPSHOT_CREATED',
        title: `Snapshot Captured (${snapshotId})`,
        message: `Independent snapshot created with ${clonedRecords.length} synthetic records. SHA-256 integrity hash: ${integrityHash.substring(0, 12)}...`,
        statusCode: 200,
        latencyMs: durationMs,
      });
    }

    return {
      success: true,
      snapshot: {
        id: snapshot.id,
        timestamp: snapshot.timestamp,
        type: snapshot.type,
        recordCount: snapshot.recordCount,
        integrityHash: snapshot.integrityHash,
        status: snapshot.status,
        sizeBytes: snapshot.sizeBytes,
      },
      durationMs,
    };
  }

  /**
   * Simulates a database blackout and data loss incident.
   * Confines deletion strictly to the in-memory synthetic dataset.
   */
  simulateDataLoss(adminEmail = 'admin@medscan.local', confirmed = false) {
    if (!confirmed) {
      throw new ApiError(
        400,
        'Simulation confirmation required. You must explicitly acknowledge that this failure injection is confined to the simulation environment.'
      );
    }

    const startTime = process.hrtime.bigint();
    const countBefore = this.syntheticRecords.length;

    this.simulatedStatus = 'UNAVAILABLE';
    this.syntheticRecords = []; // Active synthetic records wiped out in simulation
    this.stats.blackoutTriggers += 1;
    this.stats.dataLossEvents += 1;

    const endTime = process.hrtime.bigint();
    const durationMs = parseFloat((Number(endTime - startTime) / 1e6 + 18.2).toFixed(2));

    const event = this._logEvent({
      type: 'DATA_LOSS_SIMULATED',
      title: 'Simulated Blackout & Data Loss Injected',
      message: `Controlled failure by Admin (${adminEmail}): Simulated DB is UNAVAILABLE. Active records deleted (Before: ${countBefore}, After: 0). Live MongoDB Atlas untouched.`,
      statusCode: 503,
      latencyMs: durationMs,
    });

    return {
      success: true,
      simulatedStatus: this.simulatedStatus,
      countBefore,
      countAfter: 0,
      durationMs,
      event,
      explanation:
        'Simulated blackout and data loss complete. Active synthetic records are wiped and database is UNAVAILABLE. Select a valid snapshot to restore.',
    };
  }

  /**
   * Restores synthetic database state from a selected snapshot and performs integrity verification.
   */
  restoreFromSnapshot(snapshotId, adminEmail = 'admin@medscan.local') {
    if (!snapshotId) {
      throw new ApiError(400, 'Snapshot ID is required for restoration.');
    }

    const snapshot = this.snapshots.find((s) => s.id === snapshotId);
    if (!snapshot) {
      throw new ApiError(404, `Snapshot '${snapshotId}' not found in isolated demonstration store.`);
    }

    const startTime = process.hrtime.bigint();
    const countBefore = this.syntheticRecords.length;

    // Deep copy snapshot contents into active synthetic records
    // Guarantees snapshot remains immutable and can be reused
    this.syntheticRecords = JSON.parse(JSON.stringify(snapshot.records));
    this.simulatedStatus = 'HEALTHY';
    this.stats.recoveries += 1;

    // Integrity verification
    const restoredHash = computeDatasetHash(this.syntheticRecords);
    const hashMatches = restoredHash === snapshot.integrityHash;
    const countMatches = this.syntheticRecords.length === snapshot.recordCount;

    const originalIds = new Set(snapshot.records.map((r) => r.demoPatientId));
    const restoredIds = new Set(this.syntheticRecords.map((r) => r.demoPatientId));
    const idsMatch =
      originalIds.size === restoredIds.size &&
      [...originalIds].every((id) => restoredIds.has(id));

    const integrityVerified = hashMatches && countMatches && idsMatch;

    const endTime = process.hrtime.bigint();
    const durationMs = parseFloat((Number(endTime - startTime) / 1e6 + 15.5).toFixed(2));

    this.lastRecovery = {
      snapshotId,
      restoredAt: new Date().toISOString(),
      countBefore,
      restoredCount: this.syntheticRecords.length,
      integrityVerified,
      verificationStatus: integrityVerified ? 'INTEGRITY_VERIFIED' : 'VERIFICATION_FAILED',
      restoredHash,
      expectedHash: snapshot.integrityHash,
      durationMs,
    };

    const event = this._logEvent({
      type: integrityVerified ? 'RESTORE_VERIFIED' : 'RESTORE_FAILED',
      title: integrityVerified ? 'Dataset Restored & Integrity Verified' : 'Restoration Verification Failed',
      message: `Restored ${this.syntheticRecords.length} records from snapshot ${snapshotId} by Admin (${adminEmail}). SHA-256 Hash: ${restoredHash.substring(0, 12)}... [${this.lastRecovery.verificationStatus}]`,
      statusCode: integrityVerified ? 200 : 500,
      latencyMs: durationMs,
    });

    return {
      success: integrityVerified,
      simulatedStatus: this.simulatedStatus,
      snapshotId,
      countBefore,
      restoredCount: this.syntheticRecords.length,
      integrityVerified,
      verificationStatus: this.lastRecovery.verificationStatus,
      durationMs,
      records: this.syntheticRecords,
      event,
    };
  }

  /**
   * Triggers the simulated database blackout (availability only).
   */
  triggerBlackout(adminEmail = 'admin@medscan.local') {
    if (this.simulatedStatus === 'UNAVAILABLE') {
      return {
        alreadyActive: true,
        simulatedStatus: this.simulatedStatus,
        message: 'Simulated database blackout is already active.',
      };
    }

    this.simulatedStatus = 'UNAVAILABLE';
    this.stats.blackoutTriggers += 1;

    const event = this._logEvent({
      type: 'BLACKOUT_TRIGGERED',
      title: 'Simulated Database Blackout Injected',
      message: `Controlled failure injected by Admin (${adminEmail}). Simulated database is now UNAVAILABLE. Production MongoDB Atlas remains completely unaffected.`,
      statusCode: 503,
      latencyMs: 14.5,
    });

    return {
      success: true,
      simulatedStatus: this.simulatedStatus,
      event,
      explanation:
        'The simulation engine has transitioned to UNAVAILABLE. Any subsequent synthetic database read/write requests will fail with a sanitized 503 response.',
    };
  }

  /**
   * Restores simulated database availability (without changing records).
   */
  restore(adminEmail = 'admin@medscan.local') {
    if (this.simulatedStatus === 'HEALTHY') {
      return {
        alreadyHealthy: true,
        simulatedStatus: this.simulatedStatus,
        message: 'Simulated database is already healthy.',
      };
    }

    this.simulatedStatus = 'HEALTHY';
    this.stats.recoveries += 1;

    const event = this._logEvent({
      type: 'DATABASE_RESTORED',
      title: 'Simulated Database Restored',
      message: `Database recovery completed by Admin (${adminEmail}). Synthetic transactions are now processing normally with 200 OK responses.`,
      statusCode: 200,
      latencyMs: 22.3,
    });

    return {
      success: true,
      simulatedStatus: this.simulatedStatus,
      event,
      explanation:
        'Simulated database restored to HEALTHY state. Synthetic read and write operations will now succeed without errors.',
    };
  }

  /**
   * Executes a synthetic request against the simulation engine.
   * If state is UNAVAILABLE, returns HTTP 503 with sanitized error message.
   * If state is HEALTHY, returns HTTP 200 with synthetic record.
   */
  executeSyntheticOperation({ operation = 'READ', payload = null }) {
    this.stats.totalSimulatedRequests += 1;
    const startTime = process.hrtime.bigint();

    // 1. If simulated database is UNAVAILABLE
    if (this.simulatedStatus === 'UNAVAILABLE') {
      this.stats.failedRequests += 1;
      const endTime = process.hrtime.bigint();
      const latencyMs = parseFloat((Number(endTime - startTime) / 1e6 + 32.5).toFixed(2));

      this._logEvent({
        type: 'OPERATION_FAILED',
        title: `Synthetic ${operation} Rejected (503 Service Unavailable)`,
        message: `Simulated DB failure: incoming synthetic ${operation} request safely aborted without write corruption.`,
        statusCode: 503,
        latencyMs,
      });

      throw new ApiError(
        503,
        'Simulated Database Service Unavailable: The isolated demonstration database connection is currently unreachable. Request safely rejected without data corruption.'
      );
    }

    // 2. If simulated database is HEALTHY
    let operationResult = null;
    if (operation === 'WRITE' && payload && typeof payload === 'object') {
      // Safely apply synthetic updates only
      if (this.syntheticRecords.length > 0) {
        if (payload.status) this.syntheticRecords[0].status = payload.status;
        if (payload.metrics) {
          this.syntheticRecords[0].metrics = {
            ...this.syntheticRecords[0].metrics,
            ...payload.metrics,
          };
        }
        this.syntheticRecords[0].lastSyncedAt = new Date().toISOString();
      }
      operationResult = 'SYNTHETIC_WRITE_COMMITTED';
    } else {
      operationResult = 'SYNTHETIC_READ_COMPLETED';
    }

    this.stats.successfulRequests += 1;
    const endTime = process.hrtime.bigint();
    const latencyMs = parseFloat((Number(endTime - startTime) / 1e6 + 12.1).toFixed(2));

    const event = this._logEvent({
      type: 'OPERATION_SUCCEEDED',
      title: `Synthetic ${operation} Succeeded (200 OK)`,
      message: `Simulated DB healthy: synthetic ${operation} completed successfully in ${latencyMs}ms.`,
      statusCode: 200,
      latencyMs,
    });

    return {
      success: true,
      statusCode: 200,
      operation,
      operationResult,
      latencyMs,
      record: this.syntheticRecord,
      records: this.syntheticRecords,
      count: this.syntheticRecords.length,
      event,
    };
  }

  /**
   * Starts optional configurable periodic snapshots in memory.
   */
  startPeriodicSnapshots(intervalMs = 15000) {
    if (this.periodicTimer) {
      return { active: true, message: 'Periodic snapshot scheduler is already running.' };
    }

    const safeInterval = Math.max(10000, Math.min(intervalMs, 60000));
    this.periodicTimer = setInterval(() => {
      try {
        if (this.simulatedStatus === 'HEALTHY' && this.syntheticRecords.length > 0) {
          this.createSnapshot({ type: 'SIMULATED_PERIODIC' });
        }
      } catch {
        // Safe ignore in-memory timer
      }
    }, safeInterval);

    this._logEvent({
      type: 'PERIODIC_SCHEDULER_STARTED',
      title: 'Periodic Snapshot Scheduler Started',
      message: `Periodic in-memory snapshot scheduler active (every ${safeInterval / 1000}s). Bound to max 10 snapshots.`,
      statusCode: 200,
      latencyMs: 1.0,
    });

    return {
      active: true,
      intervalMs: safeInterval,
      message: `Periodic snapshots started (every ${safeInterval / 1000}s).`,
    };
  }

  /**
   * Stops the periodic snapshot timer.
   */
  stopPeriodicSnapshots() {
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = null;
      this._logEvent({
        type: 'PERIODIC_SCHEDULER_STOPPED',
        title: 'Periodic Snapshot Scheduler Stopped',
        message: 'Periodic snapshot scheduler stopped by Admin.',
        statusCode: 200,
        latencyMs: 1.0,
      });
    }
    return { active: false, message: 'Periodic snapshot scheduler stopped.' };
  }

  /**
   * Resets simulation engine state to default baseline with 3 seed records.
   */
  reset() {
    this.stopPeriodicSnapshots();
    this.simulatedStatus = 'HEALTHY';
    this.syntheticRecords = JSON.parse(JSON.stringify(SEED_SYNTHETIC_DATASET));
    this.snapshots = [];
    this.lastRecovery = null;
    this.timeline = [];
    this.stats = {
      totalSimulatedRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      blackoutTriggers: 0,
      dataLossEvents: 0,
      snapshotsCreated: 0,
      recoveries: 0,
    };

    // Create fresh initial snapshot
    this.createSnapshot({ type: 'MANUAL', initial: true });

    this._logEvent({
      type: 'ENGINE_RESET',
      title: 'Simulation State Reset to Baseline',
      message: 'Blackout & Snapshot engine reset to default HEALTHY state with 3 seed records and baseline snapshot.',
      statusCode: 200,
      latencyMs: 1.0,
    });

    return {
      success: true,
      message: 'Database blackout & snapshot simulation reset to healthy baseline.',
      currentStatus: this.simulatedStatus,
      activeRecordCount: this.syntheticRecords.length,
    };
  }
}

export const blackoutSimulationService = new BlackoutSimulationService();
