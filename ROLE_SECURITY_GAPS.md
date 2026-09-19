# MedScan-NCD: Security Vulnerability Catalogue & IDOR Audit
**Document ID:** MEDSCAN-SEC-VULN-001  
**Status:** FORENSIC VULNERABILITY CATALOGUE  
**Date:** September 2026  

---

## 1. IDOR Forensic Test Matrix

The matrix below evaluates cross-tenant request scenarios against the **Current Implementation** vs. **Target Policy**.

| Scenario | Requester Role & Identity | Target Resource & Owner | Endpoint Tested | Current Backend Response | Current Vulnerability Classification | Target Required Response | Target Remediation Rule |
| :--- | :--- | :--- | :--- | :---: | :--- | :---: | :--- |
| **TC-01** | **Patient A** | **Patient B** Profile | `GET /api/patients/:patientB_id` | **`200 OK`** | **CRITICAL IDOR:** Cross-patient demographic and vitals leakage. | **`403 Forbidden`** | Rejects requests where `patient.user !== req.user._id`. |
| **TC-02** | **Patient A** | **Patient B** Reports | `GET /api/reports?patientId=:patientB_id` | **`200 OK` (Filtered to A)** | **PASS:** Backend overrides `patientId` with Patient A's own ID. | **`200 OK` (Filtered to A)** | Maintained. |
| **TC-03** | **Patient A** | **Patient B** Report Detail | `GET /api/reports/:reportB_id` | **`403 Forbidden`** | **PASS:** Ownership validated at `reportController.js:787`. | **`403 Forbidden`** | Maintained. |
| **TC-04** | **Doctor A** | **Patient B** (Unassigned) Profile | `GET /api/patients/:patientB_id` | **`200 OK`** | **HIGH IDOR:** Doctor accesses unassigned patient's private medical profile. | **`403 Forbidden`** | Requires active `DoctorPatientRelationship`. |
| **TC-05** | **Doctor A** | **Patient B** (Unassigned) Reports | `GET /api/reports?patientId=:patientB_id` | **`200 OK`** | **CRITICAL IDOR:** Doctor inspects full diagnostic lab history of unassigned patient. | **`403 Forbidden`** | Requires active clinician assignment. |
| **TC-06** | **Doctor A** | **All Patients** Lab Reports | `GET /api/reports` (no query params) | **`200 OK` (Global Dump)** | **CRITICAL DATA EXPOSURE:** Returns every medical report in the platform. | **`400 Bad Request` / `403`** | Mandatory patient scoping required. |
| **TC-07** | **Doctor A** | **Patient B** Record Deletion | `DELETE /api/patients/:patientB_id` | **`200 OK` (Deleted!)** | **CRITICAL PRIVILEGE ABUSE:** Any doctor can permanently erase any patient. | **`403 Forbidden`** | Clinicians cannot delete patient records. |
| **TC-08** | **Nurse A** | **Patient B** (Unassigned) Profile | `GET /api/patients/:patientB_id` | **`200 OK`** | **HIGH IDOR:** Unassigned nurse inspects patient chart. | **`403 Forbidden`** | Requires active ward/shift assignment. |
| **TC-09** | **Nurse A** | **Patient B** Clinical Update | `PUT /api/patients/:patientB_id` | **`200 OK`** | **HIGH INTEGRITY VIOLATION:** Nurse overwrites patient demographics and vitals. | **`403 Forbidden`** | Vitals entry only via timestamped logs. |
| **TC-10** | **Family A** | **Patient B** (Unrelated) Profile | `GET /api/patients/:patientB_id` | **`200 OK`** | **CRITICAL IDOR:** Family member inspects stranger's medical record. | **`403 Forbidden`** | Requires active family consent grant. |
| **TC-11** | **Family A** | **Demo Fallback** Leakage | `GET /api/patients/linked` | **`200 OK` (Leaks 2 Patients)**| **CRITICAL PRIVILEGE ABUSE:** Leaks first 2 patients in database. | **`200 OK` (Empty `[]`)** | Returns empty array if no links exist. |
| **TC-12** | **CHO A (Village A)**| **Patient B (Village B)** Profile | `GET /api/patients/:patientB_id` | **`200 OK`** | **HIGH IDOR:** CHO snoops on patients outside assigned catchment. | **`403 Forbidden`** | Enforces `patient.village === req.user.village`. |
| **TC-13** | **CHO A (Village A)**| **Nationwide** Patient List | `GET /api/patients?village=All` | **`200 OK` (All Villages)** | **HIGH DATA EXPOSURE:** CHO bypasses local boundary. | **`403 Forbidden`** | Server clamps query to assigned village. |
| **TC-14** | **Admin** | **Patient B** Diagnostic Reports | `GET /api/reports/:reportB_id` | **`200 OK`** | **HIGH MEDICAL PRIVACY BREACH:** System admin views private clinical documents. | **`403 Forbidden`** | Admin restricted to system ops only. |

---

## 2. Vulnerability Catalogue

### VULN-01: Unrestricted Privileged Self-Registration
- **Severity:** `CRITICAL (CVSS 9.8)`
- **Affected Route:** `POST /api/auth/register` (`authController.js:29-73`)
- **Root Cause:** The `register` controller accepts the `role` parameter directly from `req.body` without checking authorization.
- **Impact:** Any attacker can register an `Admin` or `Doctor` account, immediately granting full access to clinical data, system settings, and user deletion.

### VULN-02: Global Medical Report Disclosure
- **Severity:** `CRITICAL (CVSS 9.1)`
- **Affected Route:** `GET /api/reports` (`reportController.js:750-772`)
- **Root Cause:** If `req.user.role !== 'Patient'` and `patientId` is omitted, the query filter defaults to `{}`:
  ```javascript
  const filter = {};
  if (patientId) filter.patient = patientId;
  const reports = await Report.find(filter)...
  ```
- **Impact:** Any non-patient account (Doctor, Nurse, CHO, Family, Admin) receives **all diagnostic laboratory reports across all patients nationwide in a single response**.

### VULN-03: Horizontal IDOR on Patient Profiles
- **Severity:** `HIGH (CVSS 8.5)`
- **Affected Route:** `GET /api/patients/:id` (`patientController.js:269-282`)
- **Root Cause:** `patientRoutes.js` authorizes all roles (`Doctor`, `Nurse`, `CHO`, `Family`, `Admin`, `Patient`), but `getPatientById` does not verify relationship, assignment, or ownership.
- **Impact:** Any authenticated user can scrape full medical histories, contact numbers, and vitals by requesting patient IDs.

### VULN-04: Arbitrary Patient Deletion by Clinicians
- **Severity:** `HIGH (CVSS 8.2)`
- **Affected Route:** `DELETE /api/patients/:id` (`patientRoutes.js:26`, `patientController.js:470-479`)
- **Root Cause:** Route authorizes `Doctor` and `Admin`. `deletePatient` deletes both the `Patient` and associated `User` documents with no assignment check.
- **Impact:** A rogue or compromised doctor account can permanently delete any patient and their authentication credentials.

### VULN-05: Empty Authorization Block in OCR Extraction Editing
- **Severity:** `HIGH (CVSS 7.8)`
- **Affected Route:** `PATCH /api/reports/:id/extracted-data` (`reportController.js:181-186`)
- **Root Cause:** The clinician cross-tenant check is completely empty:
  ```javascript
  if (req.user.role === 'Doctor') {
    const patientRecord = await Patient.findById(report.patient);
    if (patientRecord?.assignedDoctor && String(patientRecord.assignedDoctor) !== String(req.user._id)) {
      // Clinician cross-tenant isolation
    }
  }
  ```
- **Impact:** Any doctor or non-patient can edit pending OCR biomarker readings on any report in the platform without being rejected.

### VULN-06: Automatic Privacy Leakage in Family Fallback
- **Severity:** `CRITICAL (CVSS 8.6)`
- **Affected Route:** `GET /api/patients/linked` (`patientController.js:486-492`)
- **Root Cause:**
  ```javascript
  if (patients.length === 0) {
    // Demo fallback for family view
    patients = await Patient.find({}).limit(2)...
  }
  ```
- **Impact:** Every newly registered Family user who has not been invited by any patient is automatically shown 2 real, random patient records from the database.

### VULN-07: Ghost Clinician Fallback Bypassing Multi-Tenancy
- **Severity:** `HIGH (CVSS 7.5)`
- **Affected Route:** `GET /api/patients` (`patientController.js:228-236`)
- **Root Cause:** The query specifies `{ assignedDoctor: { $exists: false } }`.
- **Impact:** All patients who do not have an explicitly set `assignedDoctor` pointer are visible to every single doctor on the platform.

### VULN-08: Unrestricted Report Confirmation by Non-Patients
- **Severity:** `HIGH (CVSS 7.5)`
- **Affected Route:** `PUT /api/reports/:id/confirm` (`reportController.js:373-378`)
- **Root Cause:** The ownership check is scoped with `if (req.user.role === 'Patient')`. All other roles bypass the check.
- **Impact:** Any user with role `Doctor`, `Nurse`, `CHO`, or `Family` can confirm reports and trigger ML prediction recalculations on arbitrary patients.

### VULN-09: Unrestricted Prediction Ingestion & Query
- **Severity:** `MEDIUM (CVSS 6.5)`
- **Affected Route:** `POST /api/predictions/diabetes`, `POST /api/predictions/heart-disease` (`predictionController.js:18-67, 241-295`)
- **Root Cause:** Accepts arbitrary `patientId` from non-patients without verifying clinical assignment.
- **Impact:** Non-assigned users can poll prediction history and trigger ML evaluations on arbitrary patients.

### VULN-10: Broken Admin User Creation Route
- **Severity:** `LOW (CVSS 3.5)`
- **Affected Route:** `POST /api/users` (`AdminDashboard.jsx:97`)
- **Root Cause:** Frontend calls `userService.createUser` (`POST /api/users`), but `userRoutes.js` does not declare a `POST /` route.
- **Impact:** Administrative user creation modal fails with HTTP 404.
