# MedScan-NCD: Phase P0 Security Implementation Report
**Document ID:** MEDSCAN-SEC-P0-REPORT-001  
**Status:** COMPLETED & VERIFIED  
**Phase:** Phase P0 — Critical RBAC / IDOR Security Hardening  
**Date:** September 2026  
**Author:** Senior Medical AI & Systems Security Architect  

---

## 1. Executive Summary

Phase P0 Critical RBAC & IDOR Security Hardening has been successfully implemented and verified for **MedScan-NCD**. All identified critical- and high-severity authorization vulnerabilities (CVSS 7.5–9.8) across user registration, cross-tenant patient access, global clinical report disclosure, OCR extraction editing, report confirmation, disease prediction triggers, and account deletion have been completely closed.

**Security Architecture Mandate:** The backend now strictly **fails closed**. If an authenticated requester cannot be proven to hold an active ownership, clinical assignment, or caregiver link under trusted server data, the request is rejected with HTTP `403 Forbidden` (or HTTP `400 Bad Request` for missing required scoping parameters). No fake fallbacks, demo accounts, unassigned pools, or client-supplied IDs are trusted.

All **44 dedicated automated security tests** pass with 100% success. All existing regression test suites (authentication, IoT telemetry, manual OCR correction, CBC intelligence extraction, and Heart Disease Phase 7D integration) pass with zero regressions. The frontend production build (`vite build`) completes cleanly with zero errors. The Python FastAPI ML microservices for Diabetes and Heart Disease remain 100% operational with identical mathematical thresholds, features, and weights.

---

## 2. Vulnerabilities Remediated

| Vulnerability ID | Description | CVSSv3 Score | Severity | Remediated In Phase P0 |
| :--- | :--- | :---: | :---: | :---: |
| **VULN-01** | Privileged Self-Registration via `POST /api/auth/register` | 9.8 | **CRITICAL** | **CLOSED** |
| **VULN-02** | Global Medical Report Disclosure via `GET /api/reports` | 9.1 | **CRITICAL** | **CLOSED** |
| **VULN-03** | Horizontal IDOR on Patient Profiles via `GET /api/patients/:id` | 8.5 | **HIGH** | **CLOSED** |
| **VULN-04** | Arbitrary Patient Account Deletion via `DELETE /api/patients/:id` | 8.2 | **HIGH** | **CLOSED** |
| **VULN-05** | Empty Authorization Block in OCR Editing `PATCH /api/reports/:id/extracted-data` | 7.8 | **HIGH** | **CLOSED** |
| **VULN-06** | Automatic Data Leakage in Family Fallback `GET /api/patients/linked` | 8.6 | **CRITICAL** | **CLOSED** |
| **VULN-07** | Ghost Clinician Fallback Bypassing Multi-Tenancy (`$exists: false`) | 7.5 | **HIGH** | **CLOSED** |
| **VULN-08** | Unrestricted Diagnostic Report Confirmation via `PUT /api/reports/:id/confirm` | 7.5 | **HIGH** | **CLOSED** |
| **VULN-09** | Prediction Query & Trigger IDOR via `POST/GET /api/predictions/*` | 8.1 | **HIGH** | **CLOSED** |

---

## 3. Previous Insecure Behavior vs. Target P0 Security Controls

### 3.1 VULN-01: Privileged Self-Registration
- **Previous Behavior:** The `register` controller accepted `role` directly from `req.body` and created `Doctor`, `Nurse`, `CHO`, or `Admin` accounts without administrative verification.
- **Security Impact:** Any attacker could create an Admin or Doctor account, instantly gaining read/write access to patient medical records and administrative platform controls.
- **New P0 Authorization Behavior:** `POST /api/auth/register` explicitly inspects `role`. If `role && role !== 'Patient'`, the request is immediately rejected with HTTP `403 Forbidden` and the message: `"Public registration is restricted to Patient accounts. Privileged staff and caregiver accounts must be provisioned through authorized workflows."`

### 3.2 VULN-02: Global Medical Report Disclosure
- **Previous Behavior:** If a non-patient user called `GET /api/reports` without a `patientId` query parameter, the backend query defaulted to `Report.find({})`, returning every medical lab report in the database across all patients nationwide.
- **Security Impact:** Catastrophic Protected Health Information (PHI) data leakage.
- **New P0 Authorization Behavior:** 
  - `Patient`: Scoped strictly to own patient record. If an arbitrary `patientId` is passed in query, it is verified against `p._id`; if mismatched, rejected with `403 Forbidden`.
  - Non-Patient (`Doctor`, `Nurse`, `Family`): `patientId` parameter is strictly required. If missing, returns `400 Bad Request: "patientId parameter is required"`.
  - Non-Patient with `patientId`: Server verifies active assignment (`assignedDoctor === req.user._id`, `assignedNurse === req.user._id`, or `linkedFamilyMembers.includes(req.user._id)`). If not assigned, rejected with `403 Forbidden`.
  - `Admin`: Blocked with `403 Forbidden: "Administrative access to clinical reports is prohibited."`
  - `Report.find({})` with an empty filter can **never execute**.

### 3.3 VULN-03: Horizontal IDOR on Patient Profiles
- **Previous Behavior:** `GET /api/patients/:id` fetched the patient document by URL parameter and returned it immediately with zero checks on the requester's identity or relationship.
- **Security Impact:** Any authenticated user (including strangers) could scrape any patient's vitals, medical history, phone number, and address.
- **New P0 Authorization Behavior:** Server-side identity and assignment check:
  - `Patient`: Allowed only if `patient.user === req.user._id`.
  - `Doctor`: Allowed only if `patient.assignedDoctor === req.user._id`.
  - `Nurse`: Allowed only if `patient.assignedNurse === req.user._id`.
  - `Family`: Allowed only if `patient.linkedFamilyMembers.includes(req.user._id)`.
  - `Admin`: Rejected with `403 Forbidden: "Administrative accounts cannot access clinical patient profiles."`
  - Unassigned clinicians or unrelated users receive `403 Forbidden`.

### 3.4 VULN-04: Arbitrary Patient Account Deletion
- **Previous Behavior:** `patientRoutes.js` authorized `'Doctor'` on `DELETE /api/patients/:id`. Any doctor could delete any patient and their linked `User` credentials.
- **Security Impact:** Malicious or compromised doctor accounts could permanently delete patient health records.
- **New P0 Authorization Behavior:** 
  - `patientRoutes.js`: Removed `Doctor` from authorized roles; now allows `['Patient', 'Admin']`.
  - `patientController.js`: Explicitly rejects `Doctor`, `Nurse`, `CHO`, and `Family` with `403 Forbidden`. A `Patient` can only delete their own profile (`patient.user === req.user._id`). Admins can perform administrative deactivations.

### 3.5 VULN-05: Empty Authorization Check in OCR Extraction Editing
- **Previous Behavior:** `PATCH /api/reports/:id/extracted-data` contained an empty `if (req.user.role === 'Doctor')` block with no error thrown, allowing clinicians or arbitrary roles to mutate pending lab values of unassigned patients.
- **Security Impact:** Unauthorized modification of biomarker values before confirmation.
- **New P0 Authorization Behavior:** 
  - `Patient`: Allowed only on own reports in `PENDING_REVIEW` status.
  - `Doctor`: Allowed only on assigned patients in `PENDING_REVIEW` status.
  - `Nurse`, `Family`, `Admin`, and untrusted `CHO`: Rejected with `403 Forbidden: "Your role is not authorized to edit report OCR extractions."`

### 3.6 VULN-06: Automatic Data Leakage in Family Fallback
- **Previous Behavior:** In `getLinkedFamilyPatients`, if `patients.length === 0`, it executed `Patient.find({}).limit(2)`, automatically returning 2 random real patients to any newly registered family member.
- **Security Impact:** Immediate privacy violation upon account creation.
- **New P0 Authorization Behavior:** The `find({}).limit(2)` fallback was completely excised. If no linked patients exist, the endpoint returns an empty array `[]` with status `200 OK`.

### 3.7 VULN-07: Ghost Clinician Fallback (`$exists: false`)
- **Previous Behavior:** In `getPatients`, Doctors and Nurses queried `{ $or: [{ assignedDoctor: req.user._id }, { assignedDoctor: { $exists: false } }] }`.
- **Security Impact:** All patients without an assigned doctor were broadcast to every clinician on the platform.
- **New P0 Authorization Behavior:** All `{ $exists: false }` queries removed. Doctors only receive patients where `assignedDoctor === req.user._id`. Nurses only receive patients where `assignedNurse === req.user._id`. Unassigned patients are invisible.

### 3.8 VULN-08: Unrestricted Report Confirmation
- **Previous Behavior:** In `confirmReport`, the authorization check was wrapped in `if (req.user.role === 'Patient')`. All non-patients bypassed the check and could confirm reports.
- **Security Impact:** Unassigned clinicians, nurses, family members, or admins could commit clinical lab records and trigger disease prediction recalculations.
- **New P0 Authorization Behavior:** 
  - `Patient`: Allowed only on own reports.
  - `Doctor`: Allowed only on assigned patients.
  - `Nurse`, `Family`, `Admin`: Explicitly rejected with `403 Forbidden: "User role lacks clinical confirmation authority."`

### 3.9 VULN-09: Prediction Access & Triggering IDOR
- **Previous Behavior:** Prediction trigger (`/api/predictions/diabetes`, `/api/predictions/heart-disease`) and reading endpoints allowed passing arbitrary `patientId` without verifying clinical assignment or family consent.
- **Security Impact:** Unauthorized model triggering and private disease risk exposure.
- **New P0 Authorization Behavior:**
  - Implemented `verifyPatientAccessForPrediction(req, patientId, isTrigger)`.
  - Manual Trigger: Allowed only for Patient (own profile) and Doctor (assigned patient). Nurse, Family, and Admin are rejected with `403 Forbidden`.
  - Read History / Latest: Allowed for Patient (own profile), Doctor (assigned), Nurse (assigned), and Family (linked). Admin is rejected with `403 Forbidden`.
  - Client-supplied `patientId` mismatching authenticated Patient token is rejected with `403 Forbidden`.

---

## 4. Exact Files Modified

1. [`backend/src/controllers/authController.js`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/backend/src/controllers/authController.js)
   - Lines 36–43: Added role check rejecting non-Patient roles with HTTP 403.
2. [`backend/src/routes/patientRoutes.js`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/backend/src/routes/patientRoutes.js)
   - Line 26: Modified `authorizeRoles` on `DELETE /:id` from `['Doctor', 'Admin']` to `['Patient', 'Admin']`.
3. [`backend/src/controllers/patientController.js`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/backend/src/controllers/patientController.js)
   - Lines 228–238: Replaced insecure `$or: [{ $exists: false }]` queries with strict assignment scoping.
   - Lines 280–305: Implemented server-side ownership/assignment authorization on `getPatientById`.
   - Lines 445–465: Enforced assignment authorization on `updatePatient`.
   - Lines 472–480: Enforced authorization on `deletePatient` (blocking clinicians/family).
   - Lines 482–495: Completely deleted the `Patient.find({}).limit(2)` family demo fallback.
4. [`backend/src/controllers/reportController.js`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/backend/src/controllers/reportController.js)
   - Lines 21–55: Enforced strict assignment/ownership checks on `uploadReport`.
   - Lines 171–186: Implemented clinician assignment and patient ownership checks on `updateExtractedData`.
   - Lines 369–385: Enforced report confirmation authority (Patient owner and assigned Doctor only).
   - Lines 785–835: Enforced patient scoping on `getReports`; eliminated global `{}` queries; rejected Admin with 403.
   - Lines 837–880: Enforced authorization on `getReportById`.
   - Lines 882–930: Restricted `deleteReport` to Patient owner and unconfirmed drafts uploaded by assigned Doctor.
5. [`backend/src/controllers/predictionController.js`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/backend/src/controllers/predictionController.js)
   - Lines 14–60: Added `verifyPatientAccessForPrediction` helper function.
   - Lines 65–115: Enforced triggering authorization on `predictDiabetes`.
   - Lines 220–235: Enforced query authorization on `getLatestDiabetesPrediction`.
   - Lines 275–290: Enforced query authorization on `getDiabetesPredictionHistory`.
   - Lines 305–355: Enforced triggering authorization on `predictHeartDisease`.
   - Lines 470–485: Enforced query authorization on `getLatestHeartDiseasePrediction`.
   - Lines 525–540: Enforced query authorization on `getHeartDiseasePredictionHistory`.

---

## 5. Security Test Suite Execution (`security_rbac_p0.test.js`)

A dedicated security integration test suite was authored in [`backend/tests/security_rbac_p0.test.js`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/backend/tests/security_rbac_p0.test.js).

**Command Executed:**
```powershell
node -r dotenv/config --experimental-vm-modules node_modules/jest/bin/jest.js tests/security_rbac_p0.test.js --runInBand --forceExit
```

**Results:**
```text
PASS tests/security_rbac_p0.test.js (19.145 s)
  Phase P0: Critical RBAC & IDOR Security Test Suite
    1. Public Registration Role Quarantine
      √ 1. Patient registration succeeds (506 ms)
      √ 2. Doctor registration rejected with 403 (16 ms)
      √ 3. Nurse registration rejected with 403 (8 ms)
      √ 4. CHO registration rejected with 403 (6 ms)
      √ 5. Admin registration rejected with 403 (7 ms)
      √ 6. Family registration rejected with 403 (8 ms)
    2. Patient Profile IDOR Controls
      √ 7. Patient A -> own profile succeeds (200) (336 ms)
      √ 8. Patient A -> Patient B profile is blocked (403) (175 ms)
      √ 9. Admin -> patient profile is blocked (403) (160 ms)
      √ 10. Unassigned Doctor -> patient is blocked (403) (472 ms)
      √ 11. Unassigned Nurse -> patient is blocked (403) (148 ms)
    3. Report Disclosure & Scoping
      √ 12. Global GET /api/reports without patientId rejected for Doctor (400) (51 ms)
      √ 13. Patient A -> Patient B reports query is blocked or isolated (403) (525 ms)
      √ 14. Unassigned Doctor -> report access blocked (403) (221 ms)
      √ 15. Admin -> clinical report blocked (403) (200 ms)
      √ 16. Family with no link returns empty array [] on GET /api/patients/linked (359 ms)
    4. Ghost Clinician Patient Pool
      √ 17. Doctor does not receive unassigned patients in GET /api/patients (172 ms)
      √ 18. Nurse does not receive unassigned patients in GET /api/patients (451 ms)
      √ 19. Family does not receive arbitrary patients in GET /api/patients or /api/patients/linked (204 ms)
    5. OCR Extraction Edit Authorization
      √ 20. Patient edits own pending OCR extraction is allowed (226 ms)
      √ 21. Patient A edits Patient B extraction is blocked (403) (168 ms)
      √ 22. Unassigned Doctor edits report is blocked (403) (149 ms)
      √ 23. Nurse edits OCR extraction is blocked (403) (147 ms)
      √ 24. Family edits OCR extraction is blocked (403) (141 ms)
      √ 25. Admin edits OCR extraction is blocked (403) (138 ms)
    6. Report Confirmation Authorization
      √ 26. Patient confirms own report is allowed (200) (414 ms)
      √ 27. Patient B confirms Patient A report is blocked (403) (298 ms)
      √ 28. Unassigned Doctor confirms report is blocked (403) (388 ms)
      √ 29. Nurse confirms report is blocked (403) (201 ms)
      √ 30. Family confirms report is blocked (403) (496 ms)
      √ 31. Admin confirms report is blocked (403) (265 ms)
    7. Prediction Authorization & IDOR
      √ 32. Patient A triggers prediction for Patient B is blocked (403) (121 ms)
      √ 33. Patient A reads Patient B prediction is blocked (403) (102 ms)
      √ 34. Unassigned Doctor triggers prediction for Patient A is blocked (403) (105 ms)
      √ 35. Nurse triggers prediction is blocked (403) (75 ms)
      √ 36. Admin reads prediction history is blocked (403) (170 ms)
    8. Patient Account Deletion Protection
      √ 37. Doctor deletes patient is blocked (403) (97 ms)
      √ 38. Nurse deletes patient is blocked (403) (56 ms)
      √ 39. CHO deletes patient is blocked (403) (63 ms)
      √ 40. Family deletes patient is blocked (403) (60 ms)
      √ 41. Patient deletes own account is allowed (760 ms)
    9. Data Integrity & HITL Invariants
      √ 42. rawOcrText remains immutable after edit (439 ms)
      √ 43. initialExtraction remains immutable after edit (62 ms)
      √ 44. Unconfirmed OCR edits do not alter Patient profile vitals snapshot (54 ms)

Test Suites: 1 passed, 1 total
Tests:       44 passed, 44 total
Snapshots:   0 total
Time:        19.145 s
```

---

## 6. Regression Verification Results

All existing application test suites were executed to verify zero regression across existing medical and infrastructure functionality:

1. **Authentication Suite (`tests/auth.test.js`):**
   - Result: `PASS (3 passed, 3 total, 12.121 s)`
   - Verified: Patient registration succeeds, valid credentials log in, invalid passwords rejected.
2. **IoT Telemetry Suite (`tests/medicine.test.js`):**
   - Result: `PASS (1 passed, 1 total, 6.395 s)`
   - Verified: ESP32 telemetry ingested and recorded.
3. **HITL Manual OCR Correction Suite (`tests/manual_correction.test.js`):**
   - Result: `PASS (7 passed, 7 total, 0.836 s)`
   - Verified: Unconfirmed edits never enter ML feature builder; confirmed edits update patient snapshot; biological range validation passes.
4. **Heart Disease Integration Suite (`tests/heart_disease_integration.test.js`):**
   - Result: `PASS (17 passed, 17 total, 2.231 s)`
   - Verified: 10-Year CHD Framingham model, Platt calibration, Minimum Input Policy, smoking provenance, and non-diagnostic explanations intact.
5. **CBC Medical Intelligence Parser Suite (`tests/cbc_extraction.test.js`):**
   - Result: `PASS (7 passed, 7 total, 1.232 s)`
   - Verified: CBC document classification, vitals isolation, and confidence scoring preserved.
6. **Frontend Production Build (`npm run build`):**
   - Result: `PASS (built in 1m 13s, exit code 0)`
   - Verified: Vite bundler transforms 2,718 modules and emits valid production assets with zero syntax errors.
7. **FastAPI ML Microservice Health & Inference:**
   - Health Check: `http://localhost:8000/health` -> `200 OK` (Both Diabetes LightGBM and Heart Disease Logistic Regression models, calibrators, and schemas loaded).
   - Diabetes Inference Smoke Test: `POST http://localhost:8000/predict/diabetes` -> `200 OK`.
   - Heart Disease Inference Smoke Test: `POST http://localhost:8000/predict/heart_disease` -> `200 OK` (Probability: 0.2527, calibrated, non-diagnostic factor contributions).

---

## 7. Codebase Integrity Audit

A comprehensive codebase search was executed across `backend/src/`:
- Search for `{ $exists: false }`: **0 results found**.
- Search for `limit(2)`: **0 results found**.
- Search for `Report.find({})` without scoping: **0 results found**.
- Search for role-only authorization bypassing patient ownership: **0 active bypasses found**.

---

## 8. WHAT P0 DOES NOT SOLVE

Phase P0 provides immediate, critical, fail-closed security hardening against active IDOR and privilege escalation vectors. However, **P0 does NOT constitute a complete, production-grade relationship-based access control system**.

Specifically, Phase P0 does **NOT** implement:
1. **Formal Doctor ↔ Patient Relationship Lifecycle:** There is no `PatientRelationship` collection yet. Doctor assignment is currently bound directly via the single `patient.assignedDoctor` pointer. The multi-doctor model, consultation PIN/QR codes, and request/accept state machine (`PENDING -> ACTIVE -> REVOKED`) will be built in **Phase P1**.
2. **Nurse Shift / Ward Assignment Model:** Nurse assignment is currently bound directly via `patient.assignedNurse`. Time-bound shift rosters, ward scoping, and automatic expiration (`expiresAt`) will be built in **Phase P1**.
3. **Family Caregiver Invitation System:** Public family registration is blocked in P0. Secure, patient-initiated caregiver invitations with cryptographic redemption tokens will be built in **Phase P1**.
4. **CHO Geographic Catchment Architecture:** Because the existing `req.user.village` field is user-editable, CHO clinical access is intentionally **failed closed** in P0. An administratively provisioned `catchmentVillages` architecture will be built in **Phase P1**.
5. **Centralized Authorization Middleware (`verifyPatientAccess`):** P0 implements strict, fail-closed checks at the controller level. Standardized, declarative middleware intercepting all routes uniformly will be deployed in **Phase P1.5**.
6. **Immutable AuditLog:** There is no dedicated `AuditLog` collection or HIPAA-grade access transparency log yet. This will be built in **Phase P2**.
7. **Administrative Break-Glass Protocol:** System Admins are blocked from all clinical records in P0. An audited, time-bound break-glass mechanism for emergency technical data recovery will be deployed in **Phase P2**.
