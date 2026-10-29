# MedScan-NCD Security & Resilience Demonstration Lab: Automated Test Report

## 1. Test Suite Execution Summary

- **Test Suite**: `backend/tests/security_lab.test.js`
- **Runner**: Jest v29.7.0 (`node --experimental-vm-modules scripts/run-tests.js`)
- **Execution Date**: October 2026
- **Test Results**: **22 Passed, 0 Failed, 22 Total (100% Pass Rate)**
- **Database Context**: Isolated Loopback Test Database (`medscan_ncd_test_*`)

---

## 2. Detailed Test Case Results

### Concept 1: Database Blackout, Snapshot & Recovery Simulation

| # | Test Description | Input / Trigger | Expected Output | Actual Result | Status |
| :-: | :--- | :--- | :--- | :--- | :-: |
| 1 | Initial Synthetic Dataset Initialization | `POST /blackout/synthetic-operation` `{ operation: 'READ' }` | HTTP 200, 3 records (`DEMO-PATIENT-001` to `003`), `SYNTHETIC_DEMO_ONLY` | HTTP 200, 3 records returned | **PASS** |
| 2 | Snapshot Creation & Hashing | `POST /blackout/snapshot` `{ type: 'MANUAL' }` | HTTP 200, `SNAP-...` ID, 64-char SHA-256 hash, 3 records | HTTP 200, Valid snapshot | **PASS** |
| 3 | Snapshot Immutability | Create snapshot → mutate active dataset via write → inspect snapshot | Snapshot integrity hash and record count remain identical to creation | Hash unchanged; immutability verified | **PASS** |
| 4 | Simulated Blackout & Data Loss | `POST /blackout/simulate-data-loss` `{ confirmed: true }` | HTTP 200, `countBefore: 3`, `countAfter: 0`, `simulatedStatus: 'UNAVAILABLE'` | HTTP 200, Active dataset wiped | **PASS** |
| 5 | Fail-Fast During Outage | `POST /blackout/synthetic-operation` while UNAVAILABLE | HTTP 503, Sanitized Error, No dirty writes | HTTP 503 Service Unavailable | **PASS** |
| 6 | Restore & Integrity Verification | `POST /blackout/restore-snapshot` with valid snapshot ID | HTTP 200, `integrityVerified: true`, `restoredCount: 3`, `simulatedStatus: 'HEALTHY'` | HTTP 200, `INTEGRITY_VERIFIED` | **PASS** |
| 7 | Safe Failure on Invalid Snapshot | `POST /blackout/restore-snapshot` with `SNAP-NON-EXISTENT` | HTTP 404 Not Found, Sanitized message | HTTP 404 safely returned | **PASS** |
| 8 | Repeat Recovery Demonstration | Wipe & restore twice using exact same snapshot ID | Both restorations succeed identically; snapshot reusable | HTTP 200, both passes verified | **PASS** |
| 9 | Periodic Scheduler Lifecycle | `POST /blackout/periodic-snapshots/start` then `stop` | HTTP 200, `active: true` then `active: false` | Clean start & stop | **PASS** |
| 10 | Idempotent Reset | `POST /blackout/reset` after simulated outage & wipe | HTTP 200, State reset to `HEALTHY`, 3 seed records restored | HTTP 200, Baseline restored | **PASS** |
| 11 | Concurrency & Race Conditions | 3 concurrent synthetic operations | All 3 succeed independently with HTTP 200, Count = 3 | All 200 OK | **PASS** |

### Concept 2: Medical Data Breach & AES-256-GCM Encryption

| # | Test Description | Input / Trigger | Expected Output | Actual Result | Status |
| :-: | :--- | :--- | :--- | :--- | :-: |
| 12 | Plaintext Synthetic View (Stage A) | `GET /encryption/record` | HTTP 200, `Aarav Demo`, `datasetType: 'SYNTHETIC_DEMO_ONLY'` | HTTP 200, Valid Plaintext | **PASS** |
| 13 | AES-256-GCM Encryption (Stage B) | `POST /encryption/encrypt` | HTTP 200, 24-char IV (12B), 32-char Tag (16B), Ciphertext generated, **Key Omitted** | HTTP 200, Key NOT in response | **PASS** |
| 14 | Simulated Breach Dump (Stage C) | `GET /encryption/breach-dump` | Stored doc has ONLY ciphertext + IDs; `name`, `diagnosis`, `vitals` are absent | HTTP 200, Zero plaintext leak | **PASS** |
| 15 | Authorized Decryption (Stage D) | `POST /encryption/decrypt` with server demo key | HTTP 200, `PASSED_INTEGRITY_VERIFIED`, Designated fields match original | HTTP 200, All fields matched | **PASS** |
| 16 | Ciphertext Tampering Resistance | `POST /encryption/tamper-test` (corrupted bit) | `tamperingDetected: true`, `plaintextExposed: false`, Original backup preserved | HTTP 200, GHASH mismatch detected | **PASS** |

### Concept 3: Role-Based Access Control (RBAC) & Security Boundaries

| # | Test Description | Role / Credential | Expected Status | Actual Status | Result |
| :-: | :--- | :--- | :--- | :--- | :-: |
| 17 | Admin Access Privilege | Authenticated `Admin` | HTTP 200 OK | HTTP 200 OK | **PASS** |
| 18 | Patient Role Quarantine | Authenticated `Patient` | HTTP 403 Forbidden | HTTP 403 Forbidden | **PASS** |
| 19 | Doctor Role Quarantine (Snapshot API) | Authenticated `Doctor` | HTTP 403 Forbidden | HTTP 403 Forbidden | **PASS** |
| 20 | CHO Role Quarantine (Restore API) | Authenticated `CHO` | HTTP 403 Forbidden | HTTP 403 Forbidden | **PASS** |
| 21 | Unauthenticated Rejection | No Authorization Header | HTTP 401 Unauthorized | HTTP 401 Unauthorized | **PASS** |
| 22 | Parameter Injection Prevention | Body: `{ collection: 'production_patients' }` | HTTP 400 Bad Request | HTTP 400 Bad Request | **PASS** |

---

## 3. Frontend Production Build Verification

- **Command**: `cd frontend; npm run build`
- **Output**:
  ```
  vite v5.4.21 building for production...
  transforming...
  ✓ 2740 modules transformed.
  rendering chunks...
  dist/assets/SecurityLabPage-BKdKjWP8.js    52.03 kB │ gzip: 10.48 kB
  dist/assets/index-BykiaxTx.js            408.01 kB │ gzip: 128.56 kB
  ✓ built in 59.49s
  ```
- **Verification**: Zero TypeScript/JSX syntax errors, code-split chunk generated for `SecurityLabPage`.

---

## 4. Verification of Isolation

1. **Database Adapter Integrity**: The live Mongoose connection (`mongoose.connection`) was monitored during all test runs; `readyState` remained `1` (connected).
2. **Data Immutability**: Active dataset mutation tests confirmed that stored snapshots are independent deep copies.
3. **Synthetic Labeling**: 100% of demonstration payloads are stamped with `datasetType: "SYNTHETIC_DEMO_ONLY"` and IDs prefixed with `DEMO-`.
4. **Parameter Whitelisting**: Any request containing arbitrary MongoDB collection names, database names, or disk paths is rejected immediately with `HTTP 400 Bad Request`.
