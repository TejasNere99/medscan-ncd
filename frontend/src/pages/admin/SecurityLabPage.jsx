import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Database,
  Lock,
  Unlock,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Server,
  FileText,
  Activity,
  Key,
  Eye,
  Play,
  ShieldAlert,
  Cpu,
  Info,
  Clock,
  Layers,
  ChevronRight,
  HelpCircle,
  Sparkles,
  Camera,
  Trash2,
  RotateCcw,
  Copy,
  Save,
} from 'lucide-react';
import { securityLabService } from '../../services/securityLabService';

export const SecurityLabPage = () => {
  const [activeTab, setActiveTab] = useState('blackout'); // 'blackout' | 'encryption'
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [labStatus, setLabStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Blackout & Snapshot Simulation State
  const [dataLossModal, setDataLossModal] = useState(false);
  const [lastSyntheticResponse, setLastSyntheticResponse] = useState(null);
  const [guidedStep, setGuidedStep] = useState('A'); // 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  const [selectedSnapshotId, setSelectedSnapshotId] = useState('');
  const [dataLossResult, setDataLossResult] = useState(null);
  const [recoveryResult, setRecoveryResult] = useState(null);

  // Encryption Simulation State
  const [encryptionStage, setEncryptionStage] = useState('A'); // 'A' | 'B' | 'C' | 'D'
  const [breachDumpData, setBreachDumpData] = useState(null);
  const [decryptedResult, setDecryptedResult] = useState(null);
  const [tamperResult, setTamperResult] = useState(null);

  // Faculty Guide Drawer
  const [showFacultyGuide, setShowFacultyGuide] = useState(false);

  // Fetch lab telemetry
  const fetchStatus = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await securityLabService.getStatus();
      setLabStatus(data);

      const snapshots = data?.blackoutSimulation?.snapshots || [];
      if (snapshots.length > 0 && !selectedSnapshotId) {
        setSelectedSnapshotId(snapshots[0].id);
      }
      if (data?.blackoutSimulation?.lastRecovery) {
        setRecoveryResult(data.blackoutSimulation.lastRecovery);
      }
      if (data?.blackoutSimulation?.simulatedStatus === 'UNAVAILABLE') {
        setGuidedStep('C');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to load Security Lab status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const clearNotifications = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  // -------------------------------------------------------------
  // CONCEPT ONE HANDLERS: DATABASE BLACKOUT, SNAPSHOT & RECOVERY
  // -------------------------------------------------------------

  const handleExecuteSyntheticRead = async () => {
    clearNotifications();
    setActionLoading(true);
    try {
      const res = await securityLabService.executeSyntheticOperation('READ');
      setLastSyntheticResponse({
        success: true,
        statusCode: 200,
        operation: 'READ',
        data: res.records || res.record,
        recordCount: res.count ?? (res.records?.length || 1),
        latencyMs: res.latencyMs,
        timestamp: new Date().toLocaleTimeString(),
        message: 'Synthetic query executed successfully.',
      });
      setSuccessMsg(`Simulated DB 200 OK: Read ${res.count || 1} synthetic record(s) in ${res.latencyMs}ms`);
      fetchStatus();
    } catch (err) {
      const status = err.response?.status || 500;
      const msg = err.response?.data?.message || err.message;
      setLastSyntheticResponse({
        success: false,
        statusCode: status,
        operation: 'READ',
        error: msg,
        timestamp: new Date().toLocaleTimeString(),
      });
      setErrorMsg(`Controlled Simulation Rejection (${status}): ${msg}`);
      fetchStatus();
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateSnapshot = async (type = 'MANUAL') => {
    clearNotifications();
    setActionLoading(true);
    try {
      const res = await securityLabService.createSnapshot(type);
      setSelectedSnapshotId(res.snapshot.id);
      setSuccessMsg(
        `Snapshot ${res.snapshot.id} created (${res.snapshot.recordCount} records, SHA-256: ${res.snapshot.integrityHash.substring(0, 8)}...)`
      );
      setGuidedStep('B');
      fetchStatus();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to capture snapshot');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulateDataLoss = async () => {
    clearNotifications();
    setDataLossModal(false);
    setActionLoading(true);
    try {
      const res = await securityLabService.simulateDataLoss(true);
      setDataLossResult(res);
      setGuidedStep('C');
      setSuccessMsg(
        `Simulated Data Loss Complete: All active synthetic records deleted (${res.countBefore} → 0). DB is UNAVAILABLE.`
      );
      fetchStatus();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to simulate data loss');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreFromSnapshot = async (snapshotIdToUse) => {
    clearNotifications();
    const snapId = snapshotIdToUse || selectedSnapshotId;
    if (!snapId) {
      setErrorMsg('Please select a valid snapshot to restore.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await securityLabService.restoreFromSnapshot(snapId);
      setRecoveryResult(res);
      setGuidedStep('E');
      if (res.integrityVerified) {
        setSuccessMsg(
          `Recovery Successful! Restored ${res.restoredCount} records from ${snapId}. Integrity Hash Verified (200 OK).`
        );
      } else {
        setErrorMsg('Restoration completed but integrity hash verification failed!');
      }
      fetchStatus();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Snapshot restoration failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePeriodicSnapshots = async () => {
    clearNotifications();
    setActionLoading(true);
    try {
      const isActive = labStatus?.blackoutSimulation?.periodicSnapshotsActive;
      if (isActive) {
        await securityLabService.stopPeriodicSnapshots();
        setSuccessMsg('Periodic snapshot scheduler stopped.');
      } else {
        await securityLabService.startPeriodicSnapshots(15000);
        setSuccessMsg('Periodic snapshot scheduler started (capturing every 15s in memory).');
      }
      fetchStatus();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to toggle periodic snapshots');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetBlackout = async () => {
    clearNotifications();
    setActionLoading(true);
    try {
      await securityLabService.resetBlackout();
      setGuidedStep('A');
      setLastSyntheticResponse(null);
      setDataLossResult(null);
      setRecoveryResult(null);
      setSuccessMsg('Blackout, Snapshot & Recovery simulation reset to initial healthy baseline.');
      fetchStatus();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to reset simulation');
    } finally {
      setActionLoading(false);
    }
  };

  // -------------------------------------------------------------
  // CONCEPT TWO HANDLERS: DATA BREACH & ENCRYPTION
  // -------------------------------------------------------------

  const handleEncryptRecord = async () => {
    clearNotifications();
    setActionLoading(true);
    try {
      const res = await securityLabService.encryptSyntheticRecord();
      setSuccessMsg(`Synthetic record encrypted with AES-256-GCM in ${res.durationMs}ms`);
      setEncryptionStage('B');
      fetchStatus();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to encrypt synthetic record');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulateBreach = async () => {
    clearNotifications();
    setActionLoading(true);
    try {
      const res = await securityLabService.getBreachDump();
      setBreachDumpData(res);
      setEncryptionStage('C');
      setSuccessMsg('Simulated database dump generated. Notice: sensitive fields are ciphertext only.');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to generate breach dump view');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecryptRecord = async () => {
    clearNotifications();
    setActionLoading(true);
    try {
      const res = await securityLabService.decryptSyntheticRecord();
      setDecryptedResult(res);
      setEncryptionStage('D');
      setSuccessMsg(`Decrypted successfully in ${res.durationMs}ms. Data integrity verified.`);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Decryption failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTamperTest = async () => {
    clearNotifications();
    setActionLoading(true);
    try {
      const res = await securityLabService.testCiphertextTampering();
      setTamperResult(res);
      if (res.tamperingDetected) {
        setSuccessMsg(
          `Tampering Detected! AES-256-GCM rejected corrupted ciphertext in ${res.durationMs}ms without leaking plaintext.`
        );
      } else {
        setErrorMsg('Tampering was not detected (unexpected).');
      }
      fetchStatus();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Tamper test execution failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetEncryption = async () => {
    clearNotifications();
    setActionLoading(true);
    try {
      await securityLabService.resetEncryption();
      setEncryptionStage('A');
      setBreachDumpData(null);
      setDecryptedResult(null);
      setTamperResult(null);
      setSuccessMsg('Encryption simulation reset to initial plaintext state.');
      fetchStatus();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to reset encryption simulation');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper variables
  const blackoutSim = labStatus?.blackoutSimulation;
  const encryptionSim = labStatus?.encryptionSimulation;
  const isSimUnavailable = blackoutSim?.simulatedStatus === 'UNAVAILABLE';
  const liveDbConnected = labStatus?.blackoutSimulation?.liveDatabase?.connected;
  const activeRecords = blackoutSim?.syntheticRecords || [];
  const snapshotsList = blackoutSim?.snapshots || [];

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Executive Top Header */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-800">
                <ShieldCheck size={14} className="text-violet-600" />
                Admin Security Lab
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
                <Cpu size={14} className="text-stone-500" />
                Faculty Demonstration Console
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
              Security & Resilience Demonstration Lab
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              Controlled system-design demonstrations: Database Blackout & Snapshot-Based Recovery + Medical Data Breach & AES-256-GCM.
            </p>
          </div>

          {/* Telemetry Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs">
              <span
                className={`h-2.5 w-2.5 rounded-full ${liveDbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}
              />
              <span className="font-semibold text-stone-700">Live MongoDB:</span>
              <span className={liveDbConnected ? 'text-emerald-700 font-medium' : 'text-red-700 font-medium'}>
                {liveDbConnected ? 'Online (Untouched)' : 'Offline'}
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50/60 px-3 py-2 text-xs">
              <span
                className={`h-2.5 w-2.5 rounded-full ${isSimUnavailable ? 'bg-amber-500' : 'bg-violet-600'}`}
              />
              <span className="font-semibold text-violet-900">Simulation Engine:</span>
              <span className="font-medium text-violet-700">
                {isSimUnavailable ? 'Simulated Blackout (Data Lost)' : 'Healthy (Isolated)'}
              </span>
            </div>

            <button
              onClick={() => setShowFacultyGuide(!showFacultyGuide)}
              className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              <HelpCircle size={15} />
              {showFacultyGuide ? 'Hide Faculty Script' : 'Faculty Presentation Guide'}
            </button>
          </div>
        </div>

        {/* Isolation Guarantee Banner */}
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-stone-200/80 bg-stone-50/80 p-3.5 text-xs text-stone-600">
          <Info size={16} className="mt-0.5 shrink-0 text-violet-600" />
          <p>
            <strong className="font-semibold text-stone-800">Strict Isolation Guarantee:</strong> All actions run in-memory
            against synthetic records (<code className="rounded bg-stone-200 px-1 text-[11px] font-mono">DEMO-PATIENT-001</code> to <code className="rounded bg-stone-200 px-1 text-[11px] font-mono">003</code>).
            The production MongoDB Atlas cluster, real patient records, reports, ML pipelines, and active user sessions remain 100% untouched.
          </p>
        </div>

        {/* Global Alerts */}
        {errorMsg && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="font-bold text-amber-700 hover:text-amber-900">✕</button>
          </div>
        )}
        {successMsg && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="font-bold text-emerald-700 hover:text-emerald-900">✕</button>
          </div>
        )}
      </div>

      {/* Faculty Presentation Script Drawer (Collapsible) */}
      {showFacultyGuide && (
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-violet-50/50 p-6 text-stone-800 shadow-sm transition-all">
          <div className="flex items-center justify-between border-b border-blue-200 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-blue-600" />
              <h2 className="text-base font-bold text-stone-900">Faculty Presentation Quick Script & Defense Guide</h2>
            </div>
            <button
              onClick={() => setShowFacultyGuide(false)}
              className="text-xs font-semibold text-stone-500 hover:text-stone-800"
            >
              Close Guide
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 text-xs leading-relaxed text-stone-700">
            <div className="space-y-3 rounded-xl border border-blue-100 bg-white p-4 shadow-xs">
              <h3 className="font-bold text-blue-900 flex items-center gap-1.5">
                <Database size={15} /> Concept 1: Blackout, Snapshot & Restore Talking Points
              </h3>
              <p>
                <strong>1. Snapshot vs Replication/Failover:</strong> High availability (replica sets) protects against single-node crashes, but if a data corruption event or table drop occurs, replication faithfully replicates the deletion! Point-in-time snapshots are essential for true disaster recovery.
              </p>
              <p>
                <strong>2. The Demonstration Flow:</strong>
                <br />• Step A: Show healthy dataset (3 synthetic records).
                <br />• Step B: Create an immutable point-in-time snapshot with SHA-256 hash.
                <br />• Step C: Simulate blackout & total data loss (records drop from 3 to 0).
                <br />• Step D: Restore the dataset from the selected snapshot.
                <br />• Step E: Verify integrity via SHA-256 hash match (`INTEGRITY VERIFIED`).
                <br />• Step F: Demonstrate repeat recovery from the same snapshot.
              </p>
              <p>
                <strong>3. Real vs Simulated:</strong> The snapshot engine deep-copies isolated in-memory synthetic records. Live MongoDB Atlas remains online throughout.
              </p>
            </div>

            <div className="space-y-3 rounded-xl border border-violet-100 bg-white p-4 shadow-xs">
              <h3 className="font-bold text-violet-900 flex items-center gap-1.5">
                <Lock size={15} /> Concept 2: Medical Data Breach & AES-256-GCM Talking Points
              </h3>
              <p>
                <strong>1. The Problem:</strong> Database-at-rest encryption (TDE) only protects physical disks; if an attacker steals a MongoDB dump or credentials, all data is in plaintext!
              </p>
              <p>
                <strong>2. The Demonstration:</strong> Application-level encryption encrypts sensitive medical fields (<code className="bg-stone-100 px-1">diagnosis</code>, <code className="bg-stone-100 px-1">vitals</code>)
                using AES-256-GCM with a 12-byte random IV and 16-byte GHASH tag before database storage.
              </p>
              <p>
                <strong>3. Cryptographic Guarantee:</strong> In Stage C, the stolen dump yields unreadable ciphertext. In Stage D, we test tampering:
                modifying 1 bit in the ciphertext causes immediate GHASH authentication failure, preventing silent data poisoning.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Concept Tab Selector */}
      <div className="flex border-b border-stone-200">
        <button
          onClick={() => setActiveTab('blackout')}
          className={`flex items-center gap-2.5 border-b-2 px-6 py-3.5 text-sm font-semibold transition ${
            activeTab === 'blackout'
              ? 'border-violet-600 text-violet-800 bg-violet-50/40'
              : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-800'
          }`}
        >
          <Server size={18} className={activeTab === 'blackout' ? 'text-violet-600' : 'text-stone-400'} />
          1. Database Blackout, Snapshot & Recovery Simulation
          {isSimUnavailable && (
            <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              Data Loss Active
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('encryption')}
          className={`flex items-center gap-2.5 border-b-2 px-6 py-3.5 text-sm font-semibold transition ${
            activeTab === 'encryption'
              ? 'border-violet-600 text-violet-800 bg-violet-50/40'
              : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-800'
          }`}
        >
          <ShieldAlert size={18} className={activeTab === 'encryption' ? 'text-violet-600' : 'text-stone-400'} />
          2. Medical Data Breach & Application-Level Encryption
          {encryptionSim?.isEncrypted && (
            <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              AES-256-GCM
            </span>
          )}
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: DATABASE BLACKOUT, SNAPSHOT & RECOVERY SIMULATION */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'blackout' && (
        <div className="space-y-6">
          {/* Section A: Current Simulation Status Summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <span className="text-xs text-stone-400 font-semibold uppercase tracking-wider">Database Status</span>
              <div className="mt-2 flex items-center justify-between">
                <span
                  className={`text-lg font-bold ${
                    isSimUnavailable ? 'text-amber-600' : 'text-emerald-600'
                  }`}
                >
                  {blackoutSim?.simulatedStatus || 'HEALTHY'}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    isSimUnavailable ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {isSimUnavailable ? 'Unavailable' : 'Available'}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-stone-500">In-memory synthetic DB engine</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <span className="text-xs text-stone-400 font-semibold uppercase tracking-wider">Active Synthetic Records</span>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-2xl font-bold text-stone-900">{activeRecords.length}</span>
                <span className="rounded bg-stone-100 px-2 py-0.5 text-xs text-stone-600 font-mono">
                  {activeRecords.length > 0 ? 'Seed Present' : 'WIPED / LOST'}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-stone-500">DEMO-PATIENT records in memory</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <span className="text-xs text-stone-400 font-semibold uppercase tracking-wider">Snapshots Captured</span>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-2xl font-bold text-violet-700">{snapshotsList.length}</span>
                <button
                  onClick={handleTogglePeriodicSnapshots}
                  disabled={actionLoading}
                  className={`rounded-lg px-2 py-0.5 text-[11px] font-bold transition ${
                    blackoutSim?.periodicSnapshotsActive
                      ? 'bg-violet-600 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {blackoutSim?.periodicSnapshotsActive ? 'Periodic: ON (15s)' : 'Periodic: OFF'}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-stone-500">
                Latest: {snapshotsList[0] ? new Date(snapshotsList[0].timestamp).toLocaleTimeString() : 'None'}
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <span className="text-xs text-stone-400 font-semibold uppercase tracking-wider">Latest Recovery Integrity</span>
              <div className="mt-2 flex items-center justify-between">
                <span
                  className={`text-sm font-bold ${
                    recoveryResult?.integrityVerified ? 'text-emerald-700' : 'text-stone-500'
                  }`}
                >
                  {recoveryResult ? recoveryResult.verificationStatus : 'Pending Test'}
                </span>
                {recoveryResult?.integrityVerified && (
                  <CheckCircle2 size={18} className="text-emerald-600" />
                )}
              </div>
              <p className="mt-1 text-[11px] text-stone-500">
                {recoveryResult ? `SHA-256 match in ${recoveryResult.durationMs}ms` : 'Restore to verify'}
              </p>
            </div>
          </div>

          {/* Stepper Header: Guided Workflow (Steps A → F) */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-violet-600">Disaster Recovery Lifecycle</span>
                <h2 className="text-lg font-bold text-stone-900">Point-in-Time Snapshot & Recovery Workflow (Steps A → F)</h2>
              </div>
              <button
                onClick={handleResetBlackout}
                disabled={actionLoading}
                className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 transition"
              >
                <RefreshCw size={13} className={actionLoading ? 'animate-spin' : ''} />
                Reset Simulation
              </button>
            </div>

            {/* Stepper Cards */}
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-6 text-xs">
              {/* Step A */}
              <div
                className={`rounded-xl border p-3 transition ${
                  guidedStep === 'A'
                    ? 'border-violet-400 bg-violet-50/60 ring-2 ring-violet-200'
                    : 'border-stone-200 bg-stone-50/50'
                }`}
              >
                <span className="font-bold text-stone-800">Step A: Normal</span>
                <p className="mt-1 text-[11px] text-stone-500">Query 3 seed records.</p>
                <button
                  onClick={() => {
                    setGuidedStep('A');
                    handleExecuteSyntheticRead();
                  }}
                  disabled={actionLoading || isSimUnavailable}
                  className="mt-3 w-full rounded-lg bg-emerald-600 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                >
                  Test Read (200)
                </button>
              </div>

              {/* Step B */}
              <div
                className={`rounded-xl border p-3 transition ${
                  guidedStep === 'B'
                    ? 'border-violet-400 bg-violet-50/60 ring-2 ring-violet-200'
                    : 'border-stone-200 bg-stone-50/50'
                }`}
              >
                <span className="font-bold text-stone-800">Step B: Snapshot</span>
                <p className="mt-1 text-[11px] text-stone-500">Deep-copy dataset.</p>
                <button
                  onClick={() => handleCreateSnapshot('MANUAL')}
                  disabled={actionLoading || isSimUnavailable || activeRecords.length === 0}
                  className="mt-3 w-full rounded-lg bg-violet-600 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition"
                >
                  Create Snapshot
                </button>
              </div>

              {/* Step C */}
              <div
                className={`rounded-xl border p-3 transition ${
                  guidedStep === 'C'
                    ? 'border-violet-400 bg-violet-50/60 ring-2 ring-violet-200'
                    : 'border-stone-200 bg-stone-50/50'
                }`}
              >
                <span className="font-bold text-stone-800">Step C: Data Loss</span>
                <p className="mt-1 text-[11px] text-stone-500">Simulate wipe (3 → 0).</p>
                <button
                  onClick={() => setDataLossModal(true)}
                  disabled={actionLoading || isSimUnavailable}
                  className="mt-3 w-full rounded-lg bg-rose-600 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition"
                >
                  {isSimUnavailable ? 'Wiped (Loss Active)' : 'Simulate Loss'}
                </button>
              </div>

              {/* Step D */}
              <div
                className={`rounded-xl border p-3 transition ${
                  guidedStep === 'D'
                    ? 'border-violet-400 bg-violet-50/60 ring-2 ring-violet-200'
                    : 'border-stone-200 bg-stone-50/50'
                }`}
              >
                <span className="font-bold text-stone-800">Step D: Fail-Fast</span>
                <p className="mt-1 text-[11px] text-stone-500">Verify 503 rejection.</p>
                <button
                  onClick={() => {
                    setGuidedStep('D');
                    handleExecuteSyntheticRead();
                  }}
                  disabled={actionLoading || !isSimUnavailable}
                  className="mt-3 w-full rounded-lg bg-amber-600 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition"
                >
                  Query Outage (503)
                </button>
              </div>

              {/* Step E */}
              <div
                className={`rounded-xl border p-3 transition ${
                  guidedStep === 'E'
                    ? 'border-violet-400 bg-violet-50/60 ring-2 ring-violet-200'
                    : 'border-stone-200 bg-stone-50/50'
                }`}
              >
                <span className="font-bold text-stone-800">Step E: Restore</span>
                <p className="mt-1 text-[11px] text-stone-500">Restore from snapshot.</p>
                <button
                  onClick={() => handleRestoreFromSnapshot()}
                  disabled={actionLoading || snapshotsList.length === 0}
                  className="mt-3 w-full rounded-lg bg-indigo-600 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  Restore Snapshot
                </button>
              </div>

              {/* Step F */}
              <div
                className={`rounded-xl border p-3 transition ${
                  guidedStep === 'F'
                    ? 'border-violet-400 bg-violet-50/60 ring-2 ring-violet-200'
                    : 'border-stone-200 bg-stone-50/50'
                }`}
              >
                <span className="font-bold text-stone-800">Step F: Re-verify</span>
                <p className="mt-1 text-[11px] text-stone-500">2nd restore verification.</p>
                <button
                  onClick={() => {
                    setGuidedStep('F');
                    handleRestoreFromSnapshot();
                  }}
                  disabled={actionLoading || snapshotsList.length === 0}
                  className="mt-3 w-full rounded-lg bg-emerald-700 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 transition"
                >
                  Repeat Restore
                </button>
              </div>
            </div>
          </div>

          {/* Section B & D: Snapshot History Table & Before/After Comparison */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Snapshot Catalog Table (2 Columns) */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                    <Camera size={16} className="text-violet-600" /> Point-in-Time Snapshot Catalog
                  </h3>
                  <p className="text-xs text-stone-500">
                    Immutable deep-copies stored in the isolated simulation store with cryptographic hashes.
                  </p>
                </div>
                <button
                  onClick={() => handleCreateSnapshot('MANUAL')}
                  disabled={actionLoading || isSimUnavailable || activeRecords.length === 0}
                  className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  <Camera size={14} /> New Snapshot
                </button>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-stone-100 bg-stone-50/70 text-[11px] font-semibold text-stone-500 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Snapshot ID</th>
                      <th className="py-2.5 px-3">Captured</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Records</th>
                      <th className="py-2.5 px-3">SHA-256 Checksum</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-mono">
                    {snapshotsList.length > 0 ? (
                      snapshotsList.map((snap) => (
                        <tr
                          key={snap.id}
                          className={`hover:bg-stone-50/70 transition ${
                            selectedSnapshotId === snap.id ? 'bg-violet-50/50' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-bold text-stone-800">{snap.id}</td>
                          <td className="py-2.5 px-3 text-stone-600 font-sans">
                            {new Date(snap.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="py-2.5 px-3 font-sans">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                snap.type === 'SIMULATED_PERIODIC'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-violet-100 text-violet-800'
                              }`}
                            >
                              {snap.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-stone-800 font-bold font-sans">
                            {snap.recordCount} records
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-stone-500 font-mono" title={snap.integrityHash}>
                            {snap.integrityHash.substring(0, 10)}...
                          </td>
                          <td className="py-2.5 px-3 text-right font-sans">
                            <button
                              onClick={() => {
                                setSelectedSnapshotId(snap.id);
                                handleRestoreFromSnapshot(snap.id);
                              }}
                              disabled={actionLoading}
                              className="rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                            >
                              Restore
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-stone-400 font-sans">
                          No snapshots captured yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section D: Before-and-After Data Recovery Comparison Panel */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <RotateCcw size={16} className="text-violet-600" /> Recovery Comparison Metrics
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Observed measurements from the genuine simulation operations.
              </p>

              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between rounded-lg bg-stone-50 p-2.5">
                  <span className="text-stone-500">Original Record Count</span>
                  <span className="font-bold text-stone-900">
                    {dataLossResult?.countBefore || recoveryResult?.restoredCount || 3}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-rose-50/70 p-2.5">
                  <span className="text-rose-700">Remaining After Loss</span>
                  <span className="font-bold text-rose-800">
                    {isSimUnavailable ? '0 (WIPED)' : '0 (Simulated Wipe)'}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-emerald-50/70 p-2.5">
                  <span className="text-emerald-700">Restored Record Count</span>
                  <span className="font-bold text-emerald-800">
                    {recoveryResult ? recoveryResult.restoredCount : '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-stone-50 p-2.5">
                  <span className="text-stone-500">Missing / Corrupted Records</span>
                  <span className="font-bold text-emerald-600">0</span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-stone-50 p-2.5">
                  <span className="text-stone-500">Restoration Duration</span>
                  <span className="font-bold text-violet-700">
                    {recoveryResult ? `${recoveryResult.durationMs}ms` : '—'}
                  </span>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 mt-3">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>{recoveryResult ? recoveryResult.verificationStatus : 'Awaiting Restore Execution'}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-emerald-800 leading-snug">
                    {recoveryResult?.integrityVerified
                      ? `SHA-256 checksum (${recoveryResult.restoredHash.substring(0, 10)}...) matches snapshot exactly. Full deterministic data recovery confirmed.`
                      : 'Create a snapshot, simulate data loss, and click Restore to verify.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Active Dataset Inspection & Architecture Flow */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Active Synthetic Records In Memory */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    Active Synthetic Dataset In Memory ({activeRecords.length} Records)
                  </h3>
                  <span className="inline-block mt-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                    SYNTHETIC DEMO ONLY
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExecuteSyntheticRead}
                    disabled={actionLoading}
                    className="flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-50"
                  >
                    <Eye size={13} /> Query Dataset
                  </button>
                </div>
              </div>

              {activeRecords.length > 0 ? (
                <div className="mt-4 space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {activeRecords.map((rec) => (
                    <div
                      key={rec.demoPatientId}
                      className="rounded-xl border border-stone-200 bg-stone-50/70 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-800">{rec.demoPatientId} ({rec.name})</span>
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 font-mono">
                          {rec.reportId}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-stone-600 font-mono">
                        <div>BP: {rec.metrics?.bloodPressure}</div>
                        <div>Glucose: {rec.metrics?.fastingGlucose}</div>
                        <div>Cholesterol: {rec.metrics?.cholesterol}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-rose-200 bg-rose-50/50 p-8 text-center text-xs">
                  <AlertTriangle size={24} className="mx-auto text-rose-500 mb-2" />
                  <p className="font-bold text-rose-900">Active Synthetic Database is Empty (0 Records)</p>
                  <p className="mt-1 text-stone-500 text-[11px]">
                    Simulated blackout and data loss has deleted all active synthetic records. Select a snapshot above and click "Restore".
                  </p>
                </div>
              )}
            </div>

            {/* Architecture Explanation & Timeline */}
            <div className="space-y-6">
              {/* Architecture Flow Card */}
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                  <Layers size={16} className="text-violet-600" /> Disaster Recovery Architecture Flow
                </h3>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-2 items-center text-center text-xs">
                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-2">
                    <span className="font-bold text-stone-700 text-[11px]">1. Dataset</span>
                    <p className="text-[10px] text-stone-400">3 seed records</p>
                  </div>
                  <div className="text-violet-600 font-bold hidden md:block">→</div>
                  <div className="rounded-lg border border-violet-200 bg-violet-50 p-2">
                    <span className="font-bold text-violet-800 text-[11px]">2. Snapshot</span>
                    <p className="text-[10px] text-violet-600">Deep-copy + SHA256</p>
                  </div>
                  <div className="text-violet-600 font-bold hidden md:block">→</div>
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-2">
                    <span className="font-bold text-rose-800 text-[11px]">3. Loss</span>
                    <p className="text-[10px] text-rose-600">Active wiped (0)</p>
                  </div>
                </div>
                <div className="mt-2 text-center text-stone-400 text-xs font-bold hidden md:block">↓</div>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 items-center text-center text-xs">
                  <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-2">
                    <span className="font-bold text-indigo-800 text-[11px]">4. Restore</span>
                    <p className="text-[10px] text-indigo-600">Reconstructs DB</p>
                  </div>
                  <div className="text-violet-600 font-bold hidden md:block">→</div>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2">
                    <span className="font-bold text-emerald-800 text-[11px]">5. Verified</span>
                    <p className="text-[10px] text-emerald-600">SHA-256 match</p>
                  </div>
                </div>
              </div>

              {/* Real-time Timeline */}
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                    <Clock size={15} className="text-stone-500" /> Disaster Recovery Timeline
                  </h3>
                  <span className="text-[11px] text-stone-400">Chronological</span>
                </div>

                <div className="mt-3 max-h-56 overflow-y-auto space-y-2 pr-1">
                  {blackoutSim?.recentEvents && blackoutSim.recentEvents.length > 0 ? (
                    blackoutSim.recentEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className={`rounded-lg border p-2 text-xs transition ${
                          evt.statusCode === 200
                            ? 'border-emerald-100 bg-emerald-50/40'
                            : 'border-rose-100 bg-rose-50/40'
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span className={evt.statusCode === 200 ? 'text-emerald-900' : 'text-rose-900'}>
                            {evt.title}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.2 text-[10px] font-mono ${
                              evt.statusCode === 200
                                ? 'bg-emerald-200/60 text-emerald-800'
                                : 'bg-rose-200/60 text-rose-800'
                            }`}
                          >
                            {evt.statusCode}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-stone-600 leading-snug">{evt.message}</p>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-stone-400">
                          <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                          {evt.latencyMs > 0 && <span>{evt.latencyMs}ms</span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="py-4 text-center text-xs text-stone-400">No events logged yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: DATA BREACH & APPLICATION-LEVEL ENCRYPTION */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'encryption' && (
        <div className="space-y-6">
          {/* 4-Stage Stepper Header */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-violet-600">Cryptographic Stages</span>
                <h2 className="text-lg font-bold text-stone-900">Application-Level Encryption Lifecycle (Stages A → D)</h2>
              </div>
              <button
                onClick={handleResetEncryption}
                disabled={actionLoading}
                className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 transition"
              >
                <RefreshCw size={13} className={actionLoading ? 'animate-spin' : ''} />
                Reset Record State
              </button>
            </div>

            {/* Stepper Buttons */}
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <div
                className={`rounded-xl border p-3.5 transition ${
                  encryptionStage === 'A'
                    ? 'border-violet-400 bg-violet-50/60 ring-2 ring-violet-200'
                    : 'border-stone-200 bg-stone-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-700">Stage A: Plaintext</span>
                  <span className="rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-bold text-stone-700">
                    Pre-Encryption
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-stone-500">Synthetic record in readable JSON format.</p>
                <button
                  onClick={() => setEncryptionStage('A')}
                  className="mt-3 w-full rounded-lg bg-stone-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 transition"
                >
                  View Plaintext
                </button>
              </div>

              <div
                className={`rounded-xl border p-3.5 transition ${
                  encryptionStage === 'B'
                    ? 'border-violet-400 bg-violet-50/60 ring-2 ring-violet-200'
                    : 'border-stone-200 bg-stone-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-700">Stage B: AES-256-GCM</span>
                  <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-800">
                    Backend Encrypt
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-stone-500">Encrypt designated medical fields with 256-bit key.</p>
                <button
                  onClick={handleEncryptRecord}
                  disabled={actionLoading}
                  className="mt-3 w-full rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition"
                >
                  Encrypt Synthetic Record
                </button>
              </div>

              <div
                className={`rounded-xl border p-3.5 transition ${
                  encryptionStage === 'C'
                    ? 'border-violet-400 bg-violet-50/60 ring-2 ring-violet-200'
                    : 'border-stone-200 bg-stone-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-700">Stage C: Breach View</span>
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                    Database Dump
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-stone-500">Inspect raw database dump without decryption key.</p>
                <button
                  onClick={handleSimulateBreach}
                  disabled={actionLoading}
                  className="mt-3 w-full rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition"
                >
                  Simulate DB-Only Breach
                </button>
              </div>

              <div
                className={`rounded-xl border p-3.5 transition ${
                  encryptionStage === 'D'
                    ? 'border-violet-400 bg-violet-50/60 ring-2 ring-violet-200'
                    : 'border-stone-200 bg-stone-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-700">Stage D: Decrypt & Verify</span>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    Authorized Key
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-stone-500">Authorized backend decrypts and verifies integrity.</p>
                <button
                  onClick={handleDecryptRecord}
                  disabled={actionLoading}
                  className="mt-3 w-full rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                >
                  Decrypt with Server Key
                </button>
              </div>
            </div>
          </div>

          {/* Architecture Data Flow Diagram */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
              <Layers size={16} className="text-violet-600" /> Cryptographic Architecture & Threat Boundary
            </h3>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-center text-center">
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <span className="font-semibold text-stone-700 text-xs">1. Plaintext Intake</span>
                <p className="text-[10px] text-stone-500 mt-1">Synthetic medical fields</p>
              </div>
              <div className="text-violet-600 font-bold hidden md:block">→</div>
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
                <span className="font-semibold text-violet-900 text-xs">2. AES-256-GCM (Backend)</span>
                <p className="text-[10px] text-violet-600 mt-1">96-bit IV + 128-bit GHASH tag</p>
              </div>
              <div className="text-violet-600 font-bold hidden md:block">→</div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <span className="font-semibold text-amber-900 text-xs">3. Stored Ciphertext</span>
                <p className="text-[10px] text-amber-700 mt-1">Dump yields no plaintext</p>
              </div>
            </div>
          </div>

          {/* Interactive Inspection Workspace */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left Card: Plaintext vs Database Dump */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    {encryptionStage === 'C' ? 'Simulated Stored Database Representation' : 'Baseline Synthetic Record'}
                  </h3>
                  <span className="inline-block mt-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                    SYNTHETIC DATA — NOT A REAL PATIENT RECORD
                  </span>
                </div>
                <span className="text-xs font-mono text-stone-400">
                  {encryptionStage === 'C' ? 'RAW_DUMP.json' : 'PLAINTEXT.json'}
                </span>
              </div>

              <div className="mt-4 rounded-xl border border-stone-200 bg-stone-900 p-4 text-xs font-mono text-stone-100">
                <pre className="overflow-x-auto text-[11px] leading-relaxed text-indigo-300">
                  {encryptionStage === 'C' && breachDumpData
                    ? JSON.stringify(breachDumpData.storedRepresentation, null, 2)
                    : JSON.stringify(encryptionSim?.plaintext || {}, null, 2)}
                </pre>
              </div>

              {encryptionStage === 'C' && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
                  <p className="font-semibold">Simulated Attacker Assessment:</p>
                  <p className="mt-1 text-[11px] text-amber-800">
                    The attacker possesses the database dump, but because the 256-bit encryption key remains strictly on the
                    application server, the patient's diagnosis and vitals cannot be derived.
                  </p>
                </div>
              )}
            </div>

            {/* Right Card: AES-256-GCM Envelope & Tamper Testing */}
            <div className="space-y-6">
              {/* Envelope Inspection */}
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">Stored Envelope & Integrity Tag</h3>
                    <p className="text-xs text-stone-500">Cryptographic metadata generated by Node.js crypto</p>
                  </div>
                  <span className="rounded bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-800">
                    {encryptionSim?.encryptedEnvelope?.algorithm || 'AES-256-GCM'}
                  </span>
                </div>

                {encryptionSim?.encryptedEnvelope ? (
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="rounded-lg bg-stone-50 p-2.5">
                      <span className="text-[11px] text-stone-400 font-mono">Algorithm & Version</span>
                      <p className="font-mono font-semibold text-stone-800">
                        {encryptionSim.encryptedEnvelope.algorithm} ({encryptionSim.encryptedEnvelope.keyVersion})
                      </p>
                    </div>

                    <div className="rounded-lg bg-stone-50 p-2.5">
                      <span className="text-[11px] text-stone-400 font-mono">Initialization Vector (96-bit IV)</span>
                      <p className="font-mono text-stone-700 break-all">{encryptionSim.encryptedEnvelope.iv}</p>
                    </div>

                    <div className="rounded-lg bg-stone-50 p-2.5">
                      <span className="text-[11px] text-stone-400 font-mono">GHASH Authentication Tag (128-bit)</span>
                      <p className="font-mono text-stone-700 break-all">{encryptionSim.encryptedEnvelope.tag}</p>
                    </div>

                    <div className="rounded-lg bg-stone-50 p-2.5">
                      <span className="text-[11px] text-stone-400 font-mono">Ciphertext (Protected Payload)</span>
                      <p className="font-mono text-violet-700 break-all">{encryptionSim.encryptedEnvelope.ciphertext}</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-stone-200 bg-stone-50 p-6 text-center text-xs text-stone-400">
                    Record not encrypted yet. Click "Encrypt Synthetic Record" in Stage B to generate envelope.
                  </div>
                )}
              </div>

              {/* Tampering Resistance Test Console */}
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                      <ShieldAlert size={16} className="text-amber-600" /> Ciphertext Tampering Demonstration
                    </h3>
                    <p className="text-xs text-stone-500">
                      Tests GHASH tag verification: flips a bit in the ciphertext and attempts decryption.
                    </p>
                  </div>
                  <button
                    onClick={handleTamperTest}
                    disabled={actionLoading}
                    className="flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition"
                  >
                    Test Tampering
                  </button>
                </div>

                {tamperResult ? (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-rose-900">
                      <CheckCircle2 size={16} className="text-rose-600" />
                      Tampering Detected Successfully!
                    </div>
                    <p className="text-stone-700 text-[11px] leading-relaxed">
                      <strong>Rejection Cause:</strong> <code className="bg-rose-100 px-1">{tamperResult.failureReason}</code>
                    </p>
                    <p className="text-stone-700 text-[11px] leading-relaxed">
                      <strong>Cryptographic Guarantee:</strong> Plaintext was NEVER returned. The authenticated GHASH tag
                      guarantees that even single-bit modifications abort the decipher operation immediately.
                    </p>
                    <p className="text-stone-500 text-[10px]">
                      Duration: {tamperResult.durationMs}ms • Original valid backup preserved for further testing.
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-stone-500">
                    Click "Test Tampering" to verify that malicious database alterations are detected before decryption.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Threat Model Boundary Explanation */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-stone-900">Healthcare Threat Model & Security Boundaries</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3 text-xs">
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                <span className="font-bold text-stone-900">1. Database-Only Compromise</span>
                <p className="mt-1 text-[11px] text-stone-600 leading-relaxed">
                  Attacker steals MongoDB backup / dump. Protected fields remain AES-256-GCM ciphertext without the backend key.
                </p>
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                <span className="font-bold text-stone-900">2. Application Key Compromise</span>
                <p className="mt-1 text-[11px] text-stone-600 leading-relaxed">
                  If the server environment or master key is breached, attacker can decrypt ciphertext. Requires secret rotation and KMS management.
                </p>
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                <span className="font-bold text-stone-900">3. Trusted Application Compromise</span>
                <p className="mt-1 text-[11px] text-stone-600 leading-relaxed">
                  If an attacker hijacks an authenticated doctor/admin session, encryption does not prevent legitimate access. Strict RBAC is required.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Simulated Blackout & Data Loss */}
      {dataLossModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-rose-100 p-2.5 text-rose-600">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">Confirm Simulated Blackout & Data Loss</h3>
                <p className="text-xs text-stone-500">Security & Resilience Demonstration Lab</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-900 leading-relaxed">
              <strong>Simulation Boundary Notice:</strong>
              <p className="mt-1 text-[11px] text-rose-800">
                This scenario wipes all active in-memory synthetic records (3 → 0) and sets the simulated database to UNAVAILABLE.
                The live MedScan-NCD database, production patient records, and real users will <strong>NOT</strong> be modified or disconnected.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setDataLossModal(false)}
                className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSimulateDataLoss}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition"
              >
                Inject Data Loss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityLabPage;
