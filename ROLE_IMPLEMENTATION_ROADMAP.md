# MedScan-NCD: Technical Implementation Roadmap & RBAC Enforcement Plan
**Document ID:** MEDSCAN-SEC-ROADMAP-004  
**Status:** DEFINITIVE IMPLEMENTATION ROADMAP  
**Date:** September 2026  
**Author:** Senior Medical AI & Systems Security Architect  

---

## 1. The Universal Security Principle

Every HTTP request touching Protected Health Information (PHI), diagnostic lab reports, biomarker extractions, or ML disease risk assessments must satisfy the **6-Layer Invariant Verification Chain**:

```text
               THE 6-LAYER INVARIANT VERIFICATION CHAIN

  [HTTP Request Inbound]
           │
           ▼
  [1. Authentication]       Valid, unexpired JWT signature from req.headers.authorization
           │                (Populates req.user: { _id, role, village, email })
           ▼
  [2. Role Verification]    req.user.role ∈ [Patient, Doctor, Nurse, CHO, Family, Admin]
           │                (Rejects unauthorized roles at the route gateway)
           ▼
  [3. Resource Scope]       Identifies target Patient ID from params, body, or query
           │                (If requester is Patient, enforces req.user._id === patient.user)
           ▼
  [4. Relationship Check]   Queries PatientRelationship collection for (Requester, Patient)
           │                (Or validates CHO catchment: patient.village ∈ cho.catchment)
           ▼
  [5. Status Verification]  Asserts relationship.status === 'ACTIVE'
           │                (Rejects PENDING, REJECTED, REVOKED, EXPIRED with 403 Forbidden)
           ▼
  [6. Operation Authority]  Evaluates operation primitive against Target Permission Matrix
           │                (e.g., asserts Nurse CANNOT execute CONFIRM)
           ▼
  [200 OK Execution]        Executes clinical business logic / ML inference
```

### Concrete Negative Example
- **Scenario:** Doctor A (`id: doc_001`) requests the diagnostic lab report of Patient B (`id: pat_999`) via `GET /api/reports/rep_777`.
- **Evaluation:**
  1. *Authentication:* Valid JWT -> **PASS**
  2. *Role:* `Doctor` -> **PASS**
  3. *Resource Ownership:* `rep_777.patient === pat_999` -> **PASS**
  4. *Relationship Check:* `PatientRelationship.findOne({ patient: pat_999, relatedUser: doc_001 })` -> Record found.
  5. *Status:* Status is `REVOKED` (patient discharged 2 weeks ago) -> **FAIL!**
- **Outcome:** **`403 Forbidden`** `{ success: false, code: "RELATIONSHIP_INACTIVE", message: "Clinical access has been revoked." }`.
- **Invariant:** **Frontend hiding or filtering the patient in UI lists is NOT authorization.** Enforcement is 100% server-side.

---

## 2. Phased Implementation Roadmap Overview

```text
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │ PHASE P0: CRITICAL IMMEDIATE SECURITY VULNERABILITIES (Zero-Breakage Fixes) │
  │ • Quarantine Registration Role Escalation                                   │
  │ • Block Unscoped Global Report Dump (GET /api/reports)                      │
  │ • Eliminate Insecure Demo Family Fallback (GET /api/patients/linked)        │
  │ • Eliminate Insecure Ghost Clinician Patient Pool                           │
  │ • Block Clinicians from Deleting Patient Records                            │
  │ • Plug Empty Authorization Check in OCR Extraction Editing                  │
  └──────────────────────────────────────┬──────────────────────────────────────┘
                                         │
                                         ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │ PHASE P1: RELATIONSHIP SUBSYSTEM ARCHITECTURE                               │
  │ • PatientRelationship Mongoose Model with Compound Indexes                  │
  │ • Doctor-Patient Invitation / PIN / Acceptance State Machine                │
  │ • Family Member Consent Code Generation & Redemption Flow                   │
  │ • CHO Village Catchment Data Model & Migration                              │
  │ • Nurse Shift/Ward Scoping Data Model                                       │
  └──────────────────────────────────────┬──────────────────────────────────────┘
                                         │
                                         ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │ PHASE P1.5: CENTRAL AUTHORIZATION MIDDLEWARE (verifyPatientAccess)          │
  │ • Unified Middleware intercepting all /api/patients, /api/reports, etc.     │
  │ • Parameter normalization (:patientId, :id, req.query, req.body)            │
  │ • Cached relationship lookups for high-throughput sub-millisecond checks    │
  │ • Standardized RFC 7807 Error Envelopes                                     │
  └──────────────────────────────────────┬──────────────────────────────────────┘
                                         │
                                         ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │ PHASE P2: IMMUTABLE AUDIT LOGGING & COMPLIANCE GOVERNANCE                   │
  │ • Tamper-Evident AuditLog Collection                                        │
  │ • Event Interceptors for all READ, EDIT, CONFIRM, and 403 Security Breaches │
  │ • Break-Glass Emergency Administrative Access Protocol                      │
  │ • HIPAA/GDPR Access Transparency Dashboard for Patients                     │
  └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Phase P0: Immediate Security Vulnerabilities (Execution Plan)

*Objective:* Eliminate active critical CVSS 8.5–9.8 vulnerabilities in existing code without introducing schema migrations or breaking frontend flows.

### P0.1: Quarantine Privileged Account Self-Registration
- **Affected File:** `backend/src/controllers/authController.js:29-73`
- **Vulnerability:** Unrestricted self-registration of `Admin`, `Doctor`, and `CHO` accounts (`VULN-01`).
- **Remediation Action:**
  - Whitelist public registration roles strictly to: `['Patient', 'Family']`.
  - Reject requests requesting `Doctor`, `Nurse`, `CHO`, or `Admin` with `400 Bad Request`.
  - Provide a secure administrative seed script for development environments.
  - Maintain existing test user logins (`doctor@medscan.com`, etc.) without interruption.

### P0.2: Block Global Medical Report Data Dump
- **Affected File:** `backend/src/controllers/reportController.js:750-772`
- **Vulnerability:** Unfiltered `Report.find({})` leaks all reports nationwide if `patientId` query is omitted (`VULN-02`).
- **Remediation Action:**
  - If `req.user.role === 'Patient'`, force query filter: `{ patient: patientProfile._id }`.
  - If `req.user.role !== 'Patient'`, require explicit `patientId` query parameter. If omitted, query must reject with `400 Bad Request: "Missing required patientId parameter"`.
  - Validate that the requesting clinician has an active assignment to `patientId`.

### P0.3: Eliminate Insecure Family Demo Fallback
- **Affected File:** `backend/src/controllers/patientController.js:486-492`
- **Vulnerability:** New Family accounts automatically leak 2 random real patients from database (`VULN-06`).
- **Remediation Action:**
  - Completely delete the fallback block:
    ```javascript
    // REMOVE:
    if (patients.length === 0) {
      patients = await Patient.find({}).limit(2)...
    }
    ```
  - Return an empty array `[]` with status `200 OK` if the family member has no approved patient relationships.

### P0.4: Eliminate Ghost Clinician Patient Pool
- **Affected File:** `backend/src/controllers/patientController.js:228-236`
- **Vulnerability:** All patients lacking an explicit `assignedDoctor` pointer are broadcast to all doctors nationwide (`VULN-07`).
- **Remediation Action:**
  - Remove `{ assignedDoctor: { $exists: false } }` fallback.
  - Doctors only receive patients where `assignedDoctor === req.user._id` (migrated to `PatientRelationship` in P1).

### P0.5: Restrict Patient Record Deletion
- **Affected File:** `backend/src/routes/patientRoutes.js:26`, `patientController.js:470-479`
- **Vulnerability:** Doctors can permanently delete any patient account (`VULN-04`).
- **Remediation Action:**
  - Remove `Doctor` from authorized roles in `patientRoutes.js`.
  - Restrict `DELETE /api/patients/:id` strictly to `Patient` (self-account deletion) or `Admin` (account deactivation).

### P0.6: Enforce OCR Extraction Edit Authorization
- **Affected File:** `backend/src/controllers/reportController.js:181-186`
- **Vulnerability:** Empty cross-tenant checking block permits arbitrary biomarker editing (`VULN-05`).
- **Remediation Action:**
  - Implement active relationship validation. If requesting user is a doctor not assigned to the report's patient, immediately return `403 Forbidden`.

### P0.7: Restrict Report Confirmation Authority
- **Affected File:** `backend/src/controllers/reportController.js:373-378`
- **Vulnerability:** Non-patients (Nurse, Family, unassigned Doctor) bypass confirmation check (`VULN-08`).
- **Remediation Action:**
  - Explicitly restrict confirmation to:
    1. The report's Patient owner (`req.user._id === patient.user`).
    2. The actively assigned Doctor.
    3. The catchment CHO (with in-person consent).
  - Explicitly reject `Nurse`, `Family`, and `Admin` with `403 Forbidden: "User role lacks clinical confirmation authority"`.

---

## 4. Phase P1: Relationship Subsystem Architecture (Execution Plan)

*Objective:* Model and instantiate the explicit relationships governing clinical access.

### P1.1: Deploy `PatientRelationship` Schema
- **New File:** `backend/src/models/PatientRelationship.js`
- **Features:**
  - Fields: `patient`, `relatedUser`, `relationshipType`, `status`, `initiatedBy`, `isPrimary`, `permissions`, `invitationCode`, `expiresAt`.
  - Compound index: `{ patient: 1, relatedUser: 1, relationshipType: 1 }` (unique).
  - Index on `status` and `invitationCode` for instant query resolution.

### P1.2: Implement Relationship Management Routes & Controllers
- **New File:** `backend/src/routes/relationshipRoutes.js`
- **New File:** `backend/src/controllers/relationshipController.js`
- **Endpoints:**
  - `POST /api/relationships/request`: Patient requests doctor, or Doctor issues PIN.
  - `POST /api/relationships/accept`: Recipient verifies and activates relationship (`ACTIVE`).
  - `POST /api/relationships/reject`: Declines connection request (`REJECTED`).
  - `POST /api/relationships/revoke`: Patient revokes access or Doctor discharges (`REVOKED`).
  - `GET /api/relationships/my-care-team`: Lists all active clinicians and family for a patient.
  - `GET /api/relationships/my-roster`: Lists all active patients for a clinician.

### P1.3: Family Invitation & Code Redemption
- **Endpoints:**
  - `POST /api/relationships/family/invite`: Patient creates an invite code with designated permissions.
  - `POST /api/relationships/family/redeem`: Family user submits code to link accounts.

### P1.4: CHO Catchment Scoping Configuration
- **Model Update:** `backend/src/models/User.js`
- **Fields:** `catchmentVillages: [{ type: String, trim: true }]`.
- **Validation:** CHO patient queries automatically filter: `{ village: { $in: req.user.catchmentVillages } }`.

---

## 5. Phase P1.5: Central Authorization Middleware (`verifyPatientAccess`)

*Objective:* Replace fragmented, ad-hoc controller checks with a rock-solid, declarative middleware pipeline.

### P1.5.1: Middleware Specification
- **New File:** `backend/src/middleware/accessControl.js`
- **Core Function:** `verifyPatientAccess(requiredOperation, options)`
- **Execution Flow:**
  1. **Parameter Resolution:** Extracts `patientId` dynamically from:
     - `req.params.patientId` OR `req.params.id` (if patient route).
     - `req.query.patientId`.
     - `report.patient` (if querying report by `req.params.id`).
     - `req.body.patientId`.
  2. **Patient Self-Check:**
     - If `req.user.role === 'Patient'`:
       - Confirms `req.user._id.toString() === patient.user.toString()`.
       - If matching: **ALLOW**.
       - If mismatch: **`403 Forbidden`**.
  3. **Clinician Relationship Check:**
     - If `req.user.role === 'Doctor'` or `'Nurse'`:
       - Queries `PatientRelationship.findOne({ patient: patientId, relatedUser: req.user._id, status: 'ACTIVE' })`.
       - Checks expiration: `if (rel.expiresAt && rel.expiresAt < new Date()) -> EXPIRED`.
       - Evaluates role-operation matrix (e.g., blocks Nurse from `CONFIRM`).
  4. **CHO Catchment Check:**
     - If `req.user.role === 'CHO'`:
       - Loads patient profile: `patient = await Patient.findById(patientId)`.
       - Asserts `req.user.catchmentVillages.includes(patient.village)`.
  5. **Family Consent Check:**
     - If `req.user.role === 'Family'`:
       - Queries active family relationship.
       - Strictly enforces `requiredOperation === 'READ'`.
  6. **Admin Isolation:**
     - If `req.user.role === 'Admin'`:
       - Blocks all clinical routes: **`403 Forbidden: "Administrative access to medical records is prohibited"`**.

### P1.5.2: Target Route Attachments
Attach `verifyPatientAccess` across the entire application:
- `patientRoutes.js`: Profile view, vitals update.
- `reportRoutes.js`: Report details, OCR edit, confirmation, download.
- `predictionRoutes.js`: Diabetes and Heart Disease prediction triggers and histories.
- `appointmentRoutes.js`: Consultation management.
- `medicineRoutes.js`: Prescriptions and adherence logs.

---

## 6. Phase P2: Audit Logging & Governance Architecture

*Objective:* Maintain legally compliant, tamper-evident audit trails for every PHI interaction.

### P2.1: `AuditLog` Schema Specification
- **New File:** `backend/src/models/AuditLog.js`
- **Fields:**
  - `timestamp`: ISO-8601 creation date.
  - `actor`: `{ userId, role, email, ipAddress, userAgent }`.
  - `patient`: `ObjectId` reference to Patient.
  - `resource`: `{ type: ['REPORT', 'PATIENT', 'PREDICTION', 'PRESCRIPTION'], id: ObjectId }`.
  - `action`: `['READ', 'CREATE', 'EDIT', 'CONFIRM', 'DELETE', 'TRIGGER', 'EXPORT']`.
  - `outcome`: `['SUCCESS', 'DENIED_403', 'ERROR_500']`.
  - `metadata`: Diff tracking (fields amended, old value, new value).
- **Storage Strategy:** Write-once, append-only collection with automated MongoDB rolling partition or time-series collection.

### P2.2: Break-Glass Administrative Protocol
- If a system emergency requires technical data recovery:
  1. Admin must submit `POST /api/admin/security/break-glass` with a signed justification ticket.
  2. Issues an ephemeral 15-minute emergency token.
  3. Every single read/write during the break-glass session triggers high-priority email alerts and immutable audit logs.

---

## 7. Execution Order & Milestone Verification Gate

```text
               PHASED ROLLOUT EXECUTION TIMELINE

   MILESTONE     PHASE       DELIVERABLES                       VERIFICATION CRITERIA
  ┌─────────────┬───────────┬──────────────────────────────────┬──────────────────────────────┐
  │ Gate 0      │ Phase P0  │ Fix VULN-01 to VULN-08           │ All IDOR tests return 403.   │
  │             │           │ No schema migrations required.   │ Zero regression on existing  │
  │             │           │ Immediate vulnerability closure. │ frontend or ML predictions.  │
  ├─────────────┼───────────┼──────────────────────────────────┼──────────────────────────────┤
  │ Gate 1      │ Phase P1  │ PatientRelationship model,       │ Clinicians can only connect  │
  │             │           │ invitation tokens, catchment     │ via mutual acceptance.       │
  │             │           │ fields, relationship routes.     │ Revocation cuts off access.  │
  ├─────────────┼───────────┼──────────────────────────────────┼──────────────────────────────┤
  │ Gate 2      │ Phase P1.5│ Central verifyPatientAccess      │ Single middleware enforces   │
  │             │           │ attached across all routes.      │ 100% of matrix constraints.  │
  │             │           │ Remove duplicate controller code.│ No bypass pathways possible. │
  ├─────────────┼───────────┼──────────────────────────────────┼──────────────────────────────┤
  │ Gate 3      │ Phase P2  │ AuditLog collection, break-glass │ Every PHI access is tracked. │
  │             │           │ protocol, patient privacy log.   │ Security audit verified.     │
  └─────────────┴───────────┴──────────────────────────────────┴──────────────────────────────┘
```

---

## 8. Summary: Architectural Invariants for Implementation

1. **Never combine operations into generic "WRITE":** Differentiate observation entry, OCR editing, and legal confirmation.
2. **Never rely on frontend UI scoping:** The backend must always enforce relationships and catchments.
3. **Never allow silent overwriting of confirmed records:** Enforce the post-confirmation amendment protocol.
4. **Never grant universal clinician or admin queries:** Clinicians only see assigned patients; Admins never see clinical data.
5. **Preserve audit provenance on revocation:** Former doctors lose active dashboard access, but their historical signatures remain permanently on past prescriptions and confirmed reports.
