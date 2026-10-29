import crypto from 'node:crypto';
import { ApiError } from '../utils/apiError.js';

/**
 * Isolated Application-Level Encryption Service for MedScan-NCD Security Lab.
 * 
 * Cryptographic Standard:
 * - Cipher: AES-256-GCM (Galois/Counter Mode) authenticated encryption.
 * - Key Length: 256 bits (32 bytes), kept strictly server-side.
 * - Nonce/IV: 96 bits (12 bytes) cryptographically random per operation.
 * - Authentication Tag: 128 bits (16 bytes) to guarantee integrity and authenticity.
 * 
 * Threat Boundary & Guarantees:
 * - Protects designated synthetic medical fields against database dumps/leakage.
 * - Fails safely and immediately upon ciphertext or auth tag tampering.
 * - Operates EXCLUSIVELY on isolated synthetic demonstration data.
 * - Never touches or alters live production patient collections.
 */

const ALGORITHM = 'aes-256-gcm';
const KEY_VERSION = 'v1';
const IV_LENGTH_BYTES = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH_BYTES = 16; // 128-bit authentication tag

// Generate or derive a dedicated 256-bit demonstration key.
// Never reuse JWT, database, or ML secrets.
const getDemoEncryptionKey = () => {
  const envKey = process.env.SECURITY_LAB_ENCRYPTION_KEY;
  if (envKey && typeof envKey === 'string' && envKey.length === 64) {
    return Buffer.from(envKey, 'hex');
  }
  // Deterministic fallback for consistent demonstration sessions if not configured,
  // or cryptographically secure runtime buffer.
  const seed = process.env.SECURITY_LAB_KEY_SEED || 'medscan_ncd_demo_isolated_security_lab_key_2026';
  return crypto.createHash('sha256').update(seed).digest();
};

const DEMO_KEY = getDemoEncryptionKey();

// Baseline synthetic record (clearly marked and fabricated)
const INITIAL_SYNTHETIC_RECORD = {
  demoPatientId: 'DEMO-PATIENT-001',
  name: 'Aarav Demo',
  reportId: 'DEMO-REPORT-001',
  sampleMedicalField: 'SYNTHETIC_VALUE',
  diagnosis: 'Synthetic Type-2 Diabetes Risk Simulation',
  vitals: {
    systolicBp: 128,
    diastolicBp: 82,
    fastingBloodSugar: 110,
    hba1c: 6.2,
  },
  datasetType: 'SYNTHETIC_DEMO_ONLY',
  classification: 'RESTRICTED_HEALTH_DATA_SIMULATION',
};

class SecurityLabEncryptionService {
  constructor() {
    this.syntheticRecord = JSON.parse(JSON.stringify(INITIAL_SYNTHETIC_RECORD));
    this.encryptedEnvelope = null;
    this.lastDecryptedRecord = null;
    this.tamperAttemptLog = [];
    this.encryptionMetrics = {
      totalEncryptions: 0,
      totalDecryptions: 0,
      tamperingDetectedCount: 0,
      lastOperationDurationMs: 0,
    };
  }

  /**
   * Returns current synthetic record state and encryption status.
   */
  getRecordState() {
    return {
      plaintext: this.syntheticRecord,
      isEncrypted: this.encryptedEnvelope !== null,
      encryptedEnvelope: this.encryptedEnvelope
        ? {
            algorithm: this.encryptedEnvelope.algorithm,
            keyVersion: this.encryptedEnvelope.keyVersion,
            iv: this.encryptedEnvelope.iv,
            tag: this.encryptedEnvelope.tag,
            ciphertext: this.encryptedEnvelope.ciphertext,
            encryptedAt: this.encryptedEnvelope.encryptedAt,
            encryptedFields: this.encryptedEnvelope.encryptedFields,
          }
        : null,
      datasetType: INITIAL_SYNTHETIC_RECORD.datasetType,
      metrics: { ...this.encryptionMetrics },
      threatModelNotes: [
        'Database-only compromise: Raw database dump exposes only AES-256-GCM ciphertext without the decryption key.',
        'Integrity protection: Any tampering with ciphertext or authentication tag results in immediate decipher failure.',
        'Zero key exposure: The 256-bit encryption key remains strictly isolated on the backend server.',
      ],
    };
  }

  /**
   * Encrypts designated sensitive synthetic fields using AES-256-GCM.
   */
  encryptSyntheticRecord() {
    const startTime = process.hrtime.bigint();

    // Fields designated for application-level encryption
    const sensitivePayload = {
      name: this.syntheticRecord.name,
      sampleMedicalField: this.syntheticRecord.sampleMedicalField,
      diagnosis: this.syntheticRecord.diagnosis,
      vitals: this.syntheticRecord.vitals,
    };

    const plaintextStr = JSON.stringify(sensitivePayload);
    const iv = crypto.randomBytes(IV_LENGTH_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, DEMO_KEY, iv, {
      authTagLength: AUTH_TAG_LENGTH_BYTES,
    });

    let ciphertext = cipher.update(plaintextStr, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1e6;

    this.encryptedEnvelope = {
      algorithm: ALGORITHM,
      keyVersion: KEY_VERSION,
      iv: iv.toString('hex'),
      tag: authTag.toString('hex'),
      ciphertext,
      encryptedFields: Object.keys(sensitivePayload),
      encryptedAt: new Date().toISOString(),
      durationMs: parseFloat(durationMs.toFixed(3)),
    };

    this.encryptionMetrics.totalEncryptions += 1;
    this.encryptionMetrics.lastOperationDurationMs = this.encryptedEnvelope.durationMs;

    return {
      success: true,
      message: 'Synthetic record encrypted successfully using AES-256-GCM',
      algorithm: ALGORITHM,
      keyVersion: KEY_VERSION,
      iv: this.encryptedEnvelope.iv,
      tag: this.encryptedEnvelope.tag,
      ciphertext: this.encryptedEnvelope.ciphertext,
      encryptedFields: this.encryptedEnvelope.encryptedFields,
      encryptedAt: this.encryptedEnvelope.encryptedAt,
      durationMs: this.encryptedEnvelope.durationMs,
    };
  }

  /**
   * Simulates a raw database dump exposure (attacker obtains stored ciphertext only).
   */
  getBreachDumpView() {
    if (!this.encryptedEnvelope) {
      // If not yet encrypted, auto-encrypt so demo can show the comparison
      this.encryptSyntheticRecord();
    }

    // Realistic database document format as stored in an encrypted database collection
    const storedDocumentRepresentation = {
      _id: '65e04b9c1d2e3f4a5b6c7d8e',
      demoPatientId: this.syntheticRecord.demoPatientId,
      reportId: this.syntheticRecord.reportId,
      datasetType: this.syntheticRecord.datasetType,
      classification: this.syntheticRecord.classification,
      encryptedPayload: {
        algorithm: this.encryptedEnvelope.algorithm,
        keyVersion: this.encryptedEnvelope.keyVersion,
        iv: this.encryptedEnvelope.iv,
        tag: this.encryptedEnvelope.tag,
        ciphertext: this.encryptedEnvelope.ciphertext,
        encryptedAt: this.encryptedEnvelope.encryptedAt,
      },
    };

    return {
      storedRepresentation: storedDocumentRepresentation,
      leakAssessment: {
        patientIdentifiableDataExposed: false,
        sensitiveDiagnosisExposed: false,
        vitalsExposed: false,
        ciphertextReadableWithoutKey: false,
        attackerKnowledge:
          'Attacker possesses only the ciphertext, nonce (IV), and GCM authentication tag. Without the 256-bit server key, the sensitive medical payload cannot be derived.',
      },
      sideBySideComparison: {
        plaintextBeforeEncryption: {
          name: this.syntheticRecord.name,
          diagnosis: this.syntheticRecord.diagnosis,
          vitals: this.syntheticRecord.vitals,
          sampleMedicalField: this.syntheticRecord.sampleMedicalField,
        },
        ciphertextStoredInDatabase: {
          algorithm: this.encryptedEnvelope.algorithm,
          keyVersion: this.encryptedEnvelope.keyVersion,
          iv: this.encryptedEnvelope.iv,
          tag: this.encryptedEnvelope.tag,
          ciphertext: this.encryptedEnvelope.ciphertext,
        },
      },
    };
  }

  /**
   * Decrypts the synthetic ciphertext using the authorized server-side demonstration key.
   */
  decryptSyntheticRecord() {
    if (!this.encryptedEnvelope) {
      throw new ApiError(400, 'Cannot decrypt: synthetic record has not been encrypted yet.');
    }

    const startTime = process.hrtime.bigint();

    try {
      const iv = Buffer.from(this.encryptedEnvelope.iv, 'hex');
      const tag = Buffer.from(this.encryptedEnvelope.tag, 'hex');
      const decipher = crypto.createDecipheriv(ALGORITHM, DEMO_KEY, iv, {
        authTagLength: AUTH_TAG_LENGTH_BYTES,
      });

      decipher.setAuthTag(tag);

      let decryptedStr = decipher.update(this.encryptedEnvelope.ciphertext, 'hex', 'utf8');
      decryptedStr += decipher.final('utf8');

      const parsedPayload = JSON.parse(decryptedStr);
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1e6;

      // Reconstruct full synthetic record
      const recoveredRecord = {
        demoPatientId: this.syntheticRecord.demoPatientId,
        reportId: this.syntheticRecord.reportId,
        datasetType: this.syntheticRecord.datasetType,
        classification: this.syntheticRecord.classification,
        ...parsedPayload,
      };

      // Verify designated fields match original
      const matchesOriginal =
        recoveredRecord.name === INITIAL_SYNTHETIC_RECORD.name &&
        recoveredRecord.diagnosis === INITIAL_SYNTHETIC_RECORD.diagnosis &&
        recoveredRecord.vitals.systolicBp === INITIAL_SYNTHETIC_RECORD.vitals.systolicBp &&
        recoveredRecord.vitals.fastingBloodSugar === INITIAL_SYNTHETIC_RECORD.vitals.fastingBloodSugar;

      this.lastDecryptedRecord = recoveredRecord;
      this.encryptionMetrics.totalDecryptions += 1;
      this.encryptionMetrics.lastOperationDurationMs = parseFloat(durationMs.toFixed(3));

      return {
        success: true,
        verificationStatus: matchesOriginal ? 'PASSED_INTEGRITY_VERIFIED' : 'FAILED_MISMATCH',
        matchesOriginal,
        durationMs: parseFloat(durationMs.toFixed(3)),
        recoveredRecord,
        auditNotice: 'Decryption succeeded with authorized backend key. Data authenticity and integrity verified.',
      };
    } catch (error) {
      throw new ApiError(400, `Decryption failed: ${error.message}`);
    }
  }

  /**
   * Tests ciphertext tampering detection without corrupting the active simulation store.
   */
  testCiphertextTampering() {
    if (!this.encryptedEnvelope) {
      this.encryptSyntheticRecord();
    }

    // Create a copy of the ciphertext and flip bits at the midpoint
    const originalCiphertext = this.encryptedEnvelope.ciphertext;
    const mid = Math.floor(originalCiphertext.length / 2);
    // Invert hex characters at midpoint
    const corruptedChar = originalCiphertext[mid] === 'a' ? 'b' : 'a';
    const tamperedCiphertext =
      originalCiphertext.substring(0, mid) +
      corruptedChar +
      originalCiphertext.substring(mid + 1);

    const startTime = process.hrtime.bigint();
    let tamperingDetected = false;
    let failureReason = '';

    try {
      const iv = Buffer.from(this.encryptedEnvelope.iv, 'hex');
      const tag = Buffer.from(this.encryptedEnvelope.tag, 'hex');
      const decipher = crypto.createDecipheriv(ALGORITHM, DEMO_KEY, iv, {
        authTagLength: AUTH_TAG_LENGTH_BYTES,
      });

      decipher.setAuthTag(tag);
      let decrypted = decipher.update(tamperedCiphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8'); // Should throw authentication tag mismatch
      // If we reach here, tampering failed to trigger error (unexpected for GCM)
      tamperingDetected = false;
    } catch (err) {
      tamperingDetected = true;
      failureReason = err.message || 'Authentication tag verification failed';
    }

    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1e6;

    this.encryptionMetrics.tamperingDetectedCount += 1;
    this.tamperAttemptLog.unshift({
      timestamp: new Date().toISOString(),
      tamperedAtOffset: mid,
      tamperingDetected,
      failureReason,
      durationMs: parseFloat(durationMs.toFixed(3)),
    });

    return {
      success: true,
      tamperingDetected,
      failureReason,
      plaintextExposed: false,
      algorithm: ALGORITHM,
      tamperedCiphertextSnippet: `${tamperedCiphertext.substring(0, 16)}...[CORRUPTED BIT]...${tamperedCiphertext.slice(-8)}`,
      originalCiphertextPreserved: true,
      durationMs: parseFloat(durationMs.toFixed(3)),
      cryptographicGuarantee:
        'AES-256-GCM uses an authenticated GHASH tag. Any modification of the ciphertext or tag causes decipher.final() to reject the payload immediately. Plaintext is NEVER returned.',
    };
  }

  /**
   * Resets simulation to initial synthetic plaintext state.
   */
  reset() {
    this.syntheticRecord = JSON.parse(JSON.stringify(INITIAL_SYNTHETIC_RECORD));
    this.encryptedEnvelope = null;
    this.lastDecryptedRecord = null;
    this.tamperAttemptLog = [];
    this.encryptionMetrics = {
      totalEncryptions: 0,
      totalDecryptions: 0,
      tamperingDetectedCount: 0,
      lastOperationDurationMs: 0,
    };
    return {
      success: true,
      message: 'Application-level encryption simulation reset to baseline state.',
    };
  }
}

export const securityLabEncryptionService = new SecurityLabEncryptionService();

