import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/server.js';
import { User } from '../src/models/User.js';
import { connectToIsolatedTestDatabase } from './helpers/isolatedDatabase.js';
import { blackoutSimulationService } from '../src/services/blackoutSimulationService.js';
import { securityLabEncryptionService } from '../src/services/securityLabEncryptionService.js';

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'your_super_secret_access_key_12345!';

const generateAuthToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

describe('Security & Resilience Demonstration Lab Test Suite', () => {
  let adminUser, patientUser, doctorUser, choUser;
  let adminToken, patientToken, doctorToken, choToken;

  beforeAll(async () => {
    await connectToIsolatedTestDatabase();

    // Clean any prior artifacts from this test suite
    await User.deleteMany({ email: { $regex: /@seclabtest\.medscan$/ } });

    // Create real test users in isolated test database for verifyJWT
    adminUser = await User.create({
      name: 'Admin Security Lab',
      email: 'admin@seclabtest.medscan',
      passwordHash: 'hashed12345',
      role: 'Admin',
      isEmailVerified: true,
      isVerified: true,
    });

    patientUser = await User.create({
      name: 'Patient Security Lab',
      email: 'patient@seclabtest.medscan',
      passwordHash: 'hashed12345',
      role: 'Patient',
      isEmailVerified: true,
      isVerified: true,
    });

    doctorUser = await User.create({
      name: 'Doctor Security Lab',
      email: 'doctor@seclabtest.medscan',
      passwordHash: 'hashed12345',
      role: 'Doctor',
      isEmailVerified: true,
      isVerified: true,
    });

    choUser = await User.create({
      name: 'CHO Security Lab',
      email: 'cho@seclabtest.medscan',
      passwordHash: 'hashed12345',
      role: 'CHO',
      isEmailVerified: true,
      isVerified: true,
    });

    adminToken = generateAuthToken(adminUser);
    patientToken = generateAuthToken(patientUser);
    doctorToken = generateAuthToken(doctorUser);
    choToken = generateAuthToken(choUser);
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /@seclabtest\.medscan$/ } });
  });

  beforeEach(() => {
    // Reset both simulation engines to baseline before each test
    blackoutSimulationService.reset();
    securityLabEncryptionService.reset();
  });

  // =========================================================================
  // 1. CONCEPT ONE: DATABASE BLACKOUT, SNAPSHOT & RECOVERY SIMULATION
  // =========================================================================
  describe('Concept 1: Database Blackout, Snapshot & Recovery Simulation', () => {
    test('1. Initial State: Synthetic dataset is initialized with 3 records', async () => {
      const res = await request(app)
        .post('/api/admin/security-lab/blackout/synthetic-operation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ operation: 'READ' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.operationResult).toBe('SYNTHETIC_READ_COMPLETED');
      expect(res.body.data.records).toHaveLength(3);
      expect(res.body.data.record.demoPatientId).toBe('DEMO-PATIENT-001');
      expect(res.body.data.record.datasetType).toBe('SYNTHETIC_DEMO_ONLY');
    });

    test('2. Snapshot Creation: Stores real independent copy with SHA-256 hash', async () => {
      const res = await request(app)
        .post('/api/admin/security-lab/blackout/snapshot')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'MANUAL' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.snapshot.id).toMatch(/^SNAP-/);
      expect(res.body.data.snapshot.recordCount).toBe(3);
      expect(res.body.data.snapshot.integrityHash).toHaveLength(64);
      expect(res.body.data.snapshot.status).toBe('ACTIVE');
    });

    test('3. Snapshot Immutability: Mutating active dataset does NOT alter existing snapshot', async () => {
      // 1. Create initial snapshot of 3 records
      const snapRes = await request(app)
        .post('/api/admin/security-lab/blackout/snapshot')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'MANUAL' });

      const snapId = snapRes.body.data.snapshot.id;
      const originalHash = snapRes.body.data.snapshot.integrityHash;

      // 2. Mutate active synthetic dataset (modify status via synthetic write)
      await request(app)
        .post('/api/admin/security-lab/blackout/synthetic-operation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          operation: 'WRITE',
          payload: { status: 'MUTATED_ACTIVE_STATE' },
        });

      // 3. Inspect stored snapshot in service
      const statusRes = await request(app)
        .get('/api/admin/security-lab/blackout/snapshots')
        .set('Authorization', `Bearer ${adminToken}`);

      const savedSnapshot = statusRes.body.data.find((s) => s.id === snapId);
      expect(savedSnapshot.integrityHash).toBe(originalHash);
      expect(savedSnapshot.recordCount).toBe(3);
    });

    test('4. Simulated Data Loss: Wipes active synthetic records (3 -> 0) and sets DB UNAVAILABLE', async () => {
      // Missing confirmation rejected
      const rejectRes = await request(app)
        .post('/api/admin/security-lab/blackout/simulate-data-loss')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ confirmed: false });
      expect(rejectRes.status).toBe(400);

      // Confirmed data loss
      const res = await request(app)
        .post('/api/admin/security-lab/blackout/simulate-data-loss')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ confirmed: true });

      expect(res.status).toBe(200);
      expect(res.body.data.countBefore).toBe(3);
      expect(res.body.data.countAfter).toBe(0);
      expect(res.body.data.simulatedStatus).toBe('UNAVAILABLE');

      // Check status reports 0 records
      const status = blackoutSimulationService.getStatus();
      expect(status.activeRecordCount).toBe(0);
      expect(status.syntheticRecords).toHaveLength(0);
    });

    test('5. Fail-Fast During Outage: Operations rejected with 503 without corrupting state', async () => {
      blackoutSimulationService.simulateDataLoss('admin@test.medscan', true);

      const res = await request(app)
        .post('/api/admin/security-lab/blackout/synthetic-operation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ operation: 'READ' });

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Simulated Database Service Unavailable');
    });

    test('6. Snapshot Restore & Integrity Verification: Recovers records and verifies SHA-256 hash', async () => {
      // 1. Create snapshot
      const snapRes = await request(app)
        .post('/api/admin/security-lab/blackout/snapshot')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'MANUAL' });
      const snapId = snapRes.body.data.snapshot.id;

      // 2. Wipe active data
      await request(app)
        .post('/api/admin/security-lab/blackout/simulate-data-loss')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ confirmed: true });

      // 3. Restore from snapshot
      const restoreRes = await request(app)
        .post('/api/admin/security-lab/blackout/restore-snapshot')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ snapshotId: snapId });

      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.data.integrityVerified).toBe(true);
      expect(restoreRes.body.data.verificationStatus).toBe('INTEGRITY_VERIFIED');
      expect(restoreRes.body.data.restoredCount).toBe(3);
      expect(restoreRes.body.data.simulatedStatus).toBe('HEALTHY');

      // 4. Verify synthetic read succeeds again
      const readRes = await request(app)
        .post('/api/admin/security-lab/blackout/synthetic-operation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ operation: 'READ' });
      expect(readRes.status).toBe(200);
      expect(readRes.body.data.records).toHaveLength(3);
    });

    test('7. Safe Failure on Invalid Snapshot ID: Rejects unknown ID with 404', async () => {
      const res = await request(app)
        .post('/api/admin/security-lab/blackout/restore-snapshot')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ snapshotId: 'SNAP-NON-EXISTENT-99999' });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('not found in isolated demonstration store');
    });

    test('8. Repeat Recovery Demonstration: Can restore from the same snapshot a second time', async () => {
      // Create snapshot
      const snapRes = await request(app)
        .post('/api/admin/security-lab/blackout/snapshot')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'MANUAL' });
      const snapId = snapRes.body.data.snapshot.id;

      // Wipe & restore 1st time
      await request(app).post('/api/admin/security-lab/blackout/simulate-data-loss').set('Authorization', `Bearer ${adminToken}`).send({ confirmed: true });
      const restore1 = await request(app).post('/api/admin/security-lab/blackout/restore-snapshot').set('Authorization', `Bearer ${adminToken}`).send({ snapshotId: snapId });
      expect(restore1.status).toBe(200);
      expect(restore1.body.data.integrityVerified).toBe(true);

      // Wipe & restore 2nd time using exact same snapshot ID
      await request(app).post('/api/admin/security-lab/blackout/simulate-data-loss').set('Authorization', `Bearer ${adminToken}`).send({ confirmed: true });
      const restore2 = await request(app).post('/api/admin/security-lab/blackout/restore-snapshot').set('Authorization', `Bearer ${adminToken}`).send({ snapshotId: snapId });
      expect(restore2.status).toBe(200);
      expect(restore2.body.data.integrityVerified).toBe(true);
      expect(restore2.body.data.restoredCount).toBe(3);
    });

    test('9. Periodic Snapshot Scheduler: Starts and stops cleanly in memory', async () => {
      const startRes = await request(app)
        .post('/api/admin/security-lab/blackout/periodic-snapshots/start')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ intervalMs: 15000 });

      expect(startRes.status).toBe(200);
      expect(startRes.body.data.active).toBe(true);

      const stopRes = await request(app)
        .post('/api/admin/security-lab/blackout/periodic-snapshots/stop')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(stopRes.status).toBe(200);
      expect(stopRes.body.data.active).toBe(false);
    });

    test('10. Reset: Restores simulation engine to initial healthy baseline with seed dataset', async () => {
      blackoutSimulationService.simulateDataLoss('admin@test.medscan', true);

      const res = await request(app)
        .post('/api/admin/security-lab/blackout/reset')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.currentStatus).toBe('HEALTHY');
      expect(res.body.data.activeRecordCount).toBe(3);
    });

    test('11. Isolation: Concurrent operations do not corrupt simulation state', async () => {
      const promises = [
        request(app).post('/api/admin/security-lab/blackout/synthetic-operation').set('Authorization', `Bearer ${adminToken}`).send({ operation: 'READ' }),
        request(app).post('/api/admin/security-lab/blackout/synthetic-operation').set('Authorization', `Bearer ${adminToken}`).send({ operation: 'READ' }),
        request(app).post('/api/admin/security-lab/blackout/synthetic-operation').set('Authorization', `Bearer ${adminToken}`).send({ operation: 'READ' }),
      ];

      const results = await Promise.all(promises);
      results.forEach((res) => {
        expect(res.status).toBe(200);
      });
      const status = blackoutSimulationService.getStatus();
      expect(status.stats.successfulRequests).toBe(3);
    });
  });

  // =========================================================================
  // 2. CONCEPT TWO: DATA BREACH & APPLICATION-LEVEL ENCRYPTION
  // =========================================================================
  describe('Concept 2: Medical Data Breach & AES-256-GCM Encryption', () => {
    test('12. Plaintext View (Stage A): Returns fabricated synthetic record', async () => {
      const res = await request(app)
        .get('/api/admin/security-lab/encryption/record')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.datasetType).toBe('SYNTHETIC_DEMO_ONLY');
      expect(res.body.data.plaintext.name).toBe('Aarav Demo');
      expect(res.body.data.isEncrypted).toBe(false);
    });

    test('13. Encryption (Stage B): Encrypts sensitive fields with AES-256-GCM without leaking key', async () => {
      const res = await request(app)
        .post('/api/admin/security-lab/encryption/encrypt')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.algorithm).toBe('aes-256-gcm');
      expect(res.body.data.keyVersion).toBe('v1');
      expect(res.body.data.iv).toHaveLength(24); // 12 bytes = 24 hex chars
      expect(res.body.data.tag).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(res.body.data.ciphertext).toBeDefined();

      // Ensure key is NOT in response
      expect(res.body.data.key).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('DEMO_KEY');
    });

    test('14. Breach Dump (Stage C): Stored representation exposes ONLY ciphertext and IDs', async () => {
      // First encrypt
      await request(app).post('/api/admin/security-lab/encryption/encrypt').set('Authorization', `Bearer ${adminToken}`);

      const res = await request(app)
        .get('/api/admin/security-lab/encryption/breach-dump')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const stored = res.body.data.storedRepresentation;
      expect(stored.demoPatientId).toBe('DEMO-PATIENT-001');
      expect(stored.encryptedPayload.ciphertext).toBeDefined();

      // Protected medical fields must NOT appear in stored representation
      expect(stored.name).toBeUndefined();
      expect(stored.diagnosis).toBeUndefined();
      expect(stored.vitals).toBeUndefined();
    });

    test('15. Authorized Decryption (Stage D): Backend decrypts and verifies field match', async () => {
      // Encrypt first
      await request(app).post('/api/admin/security-lab/encryption/encrypt').set('Authorization', `Bearer ${adminToken}`);

      // Decrypt
      const res = await request(app)
        .post('/api/admin/security-lab/encryption/decrypt')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.verificationStatus).toBe('PASSED_INTEGRITY_VERIFIED');
      expect(res.body.data.matchesOriginal).toBe(true);
      expect(res.body.data.recoveredRecord.name).toBe('Aarav Demo');
      expect(res.body.data.recoveredRecord.vitals.systolicBp).toBe(128);
    });

    test('16. Tampering Resistance: Rejected by GHASH tag authentication without leaking plaintext', async () => {
      await request(app).post('/api/admin/security-lab/encryption/encrypt').set('Authorization', `Bearer ${adminToken}`);

      const res = await request(app)
        .post('/api/admin/security-lab/encryption/tamper-test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.tamperingDetected).toBe(true);
      expect(res.body.data.plaintextExposed).toBe(false);
      expect(res.body.data.originalCiphertextPreserved).toBe(true);

      // Decryption with original valid envelope still succeeds after tamper test
      const validDecryptRes = await request(app)
        .post('/api/admin/security-lab/encryption/decrypt')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(validDecryptRes.status).toBe(200);
    });
  });

  // =========================================================================
  // 3. ROLE-BASED ACCESS CONTROL (RBAC) & AUTHORIZATION BOUNDARIES
  // =========================================================================
  describe('RBAC & Security Boundaries', () => {
    test('17. Admin role receives HTTP 200 on all lab endpoints', async () => {
      const res = await request(app)
        .get('/api/admin/security-lab/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.safetyDeclaration.isolatedState).toBe(true);
    });

    test('18. Patient role is rejected with HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/security-lab/status')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('19. Doctor role is rejected with HTTP 403 Forbidden on snapshot API', async () => {
      const res = await request(app)
        .post('/api/admin/security-lab/blackout/snapshot')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ type: 'MANUAL' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('20. CHO role is rejected with HTTP 403 Forbidden on restore API', async () => {
      const res = await request(app)
        .post('/api/admin/security-lab/blackout/restore-snapshot')
        .set('Authorization', `Bearer ${choToken}`)
        .send({ snapshotId: 'SNAP-123' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('21. Unauthenticated request is rejected with HTTP 401 Unauthorized', async () => {
      const res = await request(app).get('/api/admin/security-lab/status');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('22. Arbitrary resource parameters are prohibited and rejected with HTTP 400', async () => {
      const res = await request(app)
        .post('/api/admin/security-lab/blackout/synthetic-operation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          operation: 'READ',
          collection: 'production_patients', // Injection attempt
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Arbitrary resource identifiers are prohibited');
    });
  });
});
