# MedScan-NCD: Role & Access Control Forensic Audit
**Document ID:** MEDSCAN-SEC-AUD-001  
**Status:** COMPLETE FORENSIC AUDIT  
**Date:** September 2026  
**Auditor:** Senior Medical AI & Security Architect  

---

## 1. Executive Summary

MedScan-NCD currently supports two active machine learning diagnostic intelligence models:
1. **Type-2 Diabetes Risk Assessment** (Scenario A: Fasting Glucose, HbA1c, Lipids, Vitals)
2. **Framingham 10-Year Coronary Heart Disease (CHD) Risk Model** (Age, Sex, Systolic/Diastolic BP, Total Cholesterol, BMI, Glucose, Smoker)

The system defines six user roles in `backend/src/models/User.js`:
- `Patient`
- `Doctor`
- `CHO` (Community Health Officer)
- `Nurse`
- `Family`
- `Admin`

### Critical Forensic Finding
The application currently operates under a **permissive prototype access model**:
1. **Unrestricted Privileged Self-Registration:** Any untrusted external user can self-register as an `Admin`, `Doctor`, `CHO`, or `Nurse` through the public registration endpoint (`POST /api/auth/register`) and frontend dropdown.
2. **Global Medical Report Disclosure (IDOR):** Any non-patient user (including an arbitrary Doctor, CHO, Nurse, or Family member) calling `GET /api/reports` without a `patientId` parameter receives **every lab report across the entire database**.
3. **Unassigned Patient Record Exposure:** In `patientController.js`, queries for Doctors, Nurses, and Family members explicitly include `{ $or: [{ assignedDoctor: req.user._id }, { assignedDoctor: { $exists: false } }] }`. Because clinical relationships are rarely initialized, **every clinician and family account sees all unassigned patients**.
4. **No Relationship Verification on Patient Detail (IDOR):** `GET /api/patients/:id` enforces **zero relationship or assignment checks**. Any authenticated user (including Patient A querying Patient B) can fetch full demographic, contact, vitals, and diagnostic histories.
5. **No-Op Clinician Cross-Tenant Check:** In `reportController.js` (lines 181–186), a doctor check exists but consists of an **empty block** (`// Clinician cross-tenant isolation`), allowing any doctor to edit OCR extractions for any patient's reports.
6. **Data Leakage in Family Fallback:** In `patientController.js` (lines 486–492), if a Family account has no linked patients, the backend automatically returns the first 2 patients in the database as a "demo fallback".

---

## 2. Forensic Inspection of Current RBAC Implementation

### 2.1 Backend Authentication & Token Schema
- **Token Generation:** `backend/src/controllers/authController.js` (lines 11–27)
  - Access Token Payload: `{ _id: user._id, email: user.email, role: user.role }`
  - Signed with `process.env.JWT_ACCESS_SECRET`.
  - Token Duration: Access token `1d`, Refresh token `7d`.
- **Token Verification Middleware:** `backend/src/middleware/auth.js` (lines 6–32)
  - Decodes token, fetches user from database via `User.findById(decodedToken._id)`.
  - Attaches full Mongoose user document to `req.user`.
- **Role Verification Middleware:** `backend/src/middleware/roleCheck.js` (lines 3–20)
  - Function `authorizeRoles(...allowedRoles)` compares `req.user.role` against arguments.
  - Returns `403 Forbidden` if role is not in `allowedRoles`.

### 2.2 Data Models & Relationship Schemas
- **`User.js` (`backend/src/models/User.js`):**
  - Defines `role`: `enum: ['Patient', 'Doctor', 'Family', 'Nurse', 'CHO', 'Admin']`, default `'Patient'`.
  - Defines `village`: `default: 'Green Valley'`.
  - Defines `isVerified`: `default: true` (auto-verified upon registration).
- **`Patient.js` (`backend/src/models/Patient.js`):**
  - Contains relationship pointer fields:
    - `assignedDoctor`: `ObjectId -> User` (single clinician pointer)
    - `assignedNurse`: `ObjectId -> User` (single nurse pointer)
    - `linkedFamilyMembers`: `[ObjectId -> User]` (array of family user pointers)
    - `village`: `String`, default `'Green Valley'`
  - **Forensic Observation:** No connection status (e.g. `PENDING`, `ACTIVE`, `REVOKED`) exists. Relationships are unversioned single pointers without timestamps or patient consent records.
- **`Doctor.js` (`backend/src/models/Doctor.js`):**
  - Links to User via `user: ObjectId`.
  - Contains metadata (`specialization`, `licenseNumber`, `hospital`, `experienceYears`).
  - **Forensic Observation:** Contains no patient roster array, facility association, or department assignment.
- **Nurse, Family, CHO, Admin Models:**
  - **DO NOT EXIST.** Nurses, Family members, CHOs, and Admins have only a basic `User` record with no specialized profile, assigned area, or supervisory linkage.

---

## 3. Role-by-Role Forensic Questionnaire

Below is the definitive verification of capabilities across all six roles, tracing each permission to exact backend enforcement.

### 3.1 Patient

| Capability | Current State | Code Location & Mechanism |
| :--- | :---: | :--- |
| **Can self-register?** | **YES** | `authController.js:29-73` — Public `POST /api/auth/register`. |
| **Can admin create account?** | **FAIL** | Admin UI calls `POST /api/users`, but route does not exist in `userRoutes.js` (404). |
| **Can another role create account?** | **YES** | `patientController.js:284-317` — `POST /api/patients` by Doctor/CHO/Admin. |
| **Can login?** | **YES** | `authController.js:75-115` — `POST /api/auth/login`. |
| **Can view own profile?** | **YES** | `patientController.js:192-221` — `GET /api/patients/me`. |
| **Can edit own profile?** | **YES** | `patientController.js:319-390` — `PATCH /api/patients/me/demographics`. |
| **Can view other patients?** | **YES (API IDOR)** | `patientController.js:269-282` — `GET /api/patients/:id` allows role `'Patient'` to fetch any patient record by ID. |
| **Can view own reports?** | **YES** | `reportController.js:750-772` — `GET /api/reports` filters by `p._id` when `role === 'Patient'`. |
| **Can view other reports?** | **DENIED (Direct)** | `reportController.js:785-789` — `GET /api/reports/:id` verifies `report.patient === patient._id`. |
| **Can upload reports?** | **YES** | `reportController.js:14-104` — `POST /api/reports/upload` forces `targetPatientId = patientRecord._id`. |
| **Can confirm reports?** | **YES** | `reportController.js:363-748` — `PUT /api/reports/:id/confirm` checks ownership. |
| **Can edit OCR-extracted values?** | **YES** | `reportController.js:106-356` — `PATCH /api/reports/:id/extracted-data` checks ownership. |
| **Can view predictions?** | **YES** | `predictionController.js:142-233, 352-464` — Accessible via `/latest` and `/history`. |
| **Can trigger predictions?** | **YES** | `predictionController.js:18-140, 241-350` — `POST /api/predictions/diabetes` and `/heart-disease`. |
| **Can delete data?** | **YES (Own Reports)** | `reportController.js:795-828` — `DELETE /api/reports/:id` allows deleting own reports and predictions. |
| **Can create appointments?** | **YES** | `appointmentController.js:30-54` — `POST /api/appointments`. |
| **Can view appointments?** | **YES** | `appointmentController.js:7-28` — `GET /api/appointments` scoped to `patientId`. |
| **Can communicate with other roles?** | **NO** | No chat/messaging system implemented; notifications are system-generated. |

---

### 3.2 Doctor

| Capability | Current State | Code Location & Mechanism |
| :--- | :---: | :--- |
| **Can self-register?** | **YES** | `authController.js:30-60` — `POST /api/auth/register` accepts `role: 'Doctor'`. |
| **Can admin create account?** | **FAIL** | Route `POST /api/users` missing in backend. |
| **Can view own profile?** | **YES** | `authController.js:186-213` — `GET /api/auth/me`. |
| **Can edit own profile?** | **YES** | `userController.js:6-20` — `PUT /api/users/profile`. |
| **Can view patients?** | **ALL UNASSIGNED** | `patientController.js:228-229` — `filter.$or = [{ assignedDoctor: req.user._id }, { assignedDoctor: { $exists: false } }]`. |
| **Can view any patient profile?** | **YES (IDOR)** | `patientController.js:269-282` — `GET /api/patients/:id` allows Doctor to view any patient. |
| **Can view reports?** | **GLOBAL LEAK** | `reportController.js:750-772` — `GET /api/reports` without `patientId` returns **all reports in DB**. |
| **Can upload reports for patient?** | **YES** | `reportController.js:30-34` — Accepts any `patientId` in body without assignment check. |
| **Can edit OCR-extracted values?** | **YES (UNRESTRICTED)**| `reportController.js:181-186` — Doctor assignment check is an empty no-op code block. |
| **Can confirm reports?** | **YES (UNRESTRICTED)**| `reportController.js:373-378` — Ownership check runs only if `role === 'Patient'`. |
| **Can view predictions?** | **YES (ANY PATIENT)**| `predictionController.js:211-220` — Accepts any `?patientId=` query parameter. |
| **Can trigger predictions?** | **YES (ANY PATIENT)**| `predictionController.js:27-29` — Accepts any `patientId` in body. |
| **Can modify patient clinical data?** | **YES (ANY PATIENT)**| `patientController.js:447-468` — `PUT /api/patients/:id` allows any Doctor to edit any patient record. |
| **Can delete patient?** | **YES (ANY PATIENT)**| `patientController.js:470-479` — `DELETE /api/patients/:id` permits any Doctor to delete any patient and user! |
| **Can create appointments?** | **YES** | `appointmentController.js:30-54` — `POST /api/appointments`. |
| **Can view appointments?** | **YES** | `appointmentController.js:17` — Filtered by `doctor: req.user._id`. |

---

### 3.3 Community Health Officer (CHO)

| Capability | Current State | Code Location & Mechanism |
| :--- | :---: | :--- |
| **Can self-register?** | **YES** | `authController.js:30-60` — `POST /api/auth/register` accepts `role: 'CHO'`. |
| **Can view own profile?** | **YES** | `GET /api/auth/me`. |
| **Can edit own profile?** | **YES** | `PUT /api/users/profile`. |
| **Can view patients?** | **ENTIRE POPULATION** | `patientController.js:232-233` — If village is omitted or 'All', returns all patients across all regions. |
| **Can view any patient profile?** | **YES (IDOR)** | `patientController.js:269-282` — `GET /api/patients/:id` allows CHO to open any patient. |
| **Can view reports?** | **GLOBAL LEAK** | `reportController.js:750-772` — Can fetch all reports in database or any patient's reports. |
| **Can upload reports for patient?** | **YES** | `reportController.js:30-34` — Allowed with arbitrary `patientId`. |
| **Can edit OCR-extracted values?** | **YES** | `reportController.js:172-178` — Patient check bypassed; no CHO area restriction. |
| **Can confirm reports?** | **YES** | `reportController.js:373-378` — Patient check bypassed. |
| **Can view predictions?** | **YES** | `predictionController.js:211-220` — Can query predictions for any patient. |
| **Can trigger predictions?** | **YES** | `predictionController.js:27-29` — Can trigger predictions for any patient. |
| **Can view population analytics?** | **YES** | `analyticsController.js:52-120` — `GET /api/analytics/population`. |
| **Can modify patient clinical data?** | **YES** | `patientController.js:447-468` — `PUT /api/patients/:id` has no area restriction. |
| **Can delete patient?** | **DENIED** | `patientRoutes.js:26` — Restricted to `'Doctor'` and `'Admin'`. |

---

### 3.4 Nurse

| Capability | Current State | Code Location & Mechanism |
| :--- | :---: | :--- |
| **Can self-register?** | **YES** | `authController.js:30-60` — `POST /api/auth/register` accepts `role: 'Nurse'`. |
| **Can view patients?** | **ALL UNASSIGNED** | `patientController.js:230-231` — `filter.$or = [{ assignedNurse: req.user._id }, { assignedNurse: { $exists: false } }]`. |
| **Can view any patient profile?** | **YES (IDOR)** | `patientController.js:269-282` — `GET /api/patients/:id` allows Nurse to view any patient. |
| **Can view reports?** | **GLOBAL LEAK** | `reportController.js:750-772` — `GET /api/reports` returns all reports across database. |
| **Can upload reports?** | **YES** | `reportController.js:30-34` — Accepts any `patientId`. |
| **Can edit OCR-extracted values?** | **YES** | `reportController.js:172-178` — No nurse assignment enforcement. |
| **Can confirm reports?** | **YES** | `reportController.js:373-378` — No nurse assignment enforcement. |
| **Can view predictions?** | **YES** | `predictionController.js:211-220` — Can query predictions for any patient. |
| **Can trigger predictions?** | **YES** | `predictionController.js:27-29` — Can trigger ML predictions for any patient. |
| **Can modify patient clinical data?** | **YES** | `patientController.js:447-468` — `PUT /api/patients/:id` allows editing all clinical parameters. |
| **Can delete patient?** | **DENIED** | `patientRoutes.js:26` — RoleCheck rejects Nurse with 403. |

---

### 3.5 Family

| Capability | Current State | Code Location & Mechanism |
| :--- | :---: | :--- |
| **Can self-register?** | **YES** | `authController.js:30-60` — `POST /api/auth/register` accepts `role: 'Family'`. |
| **Can view patients?** | **DATA LEAK FALLBACK**| `patientController.js:486-492` — If unlinked, returns first 2 patients in database. |
| **Can view any patient profile?** | **YES (IDOR)** | `patientController.js:269-282` — `GET /api/patients/:id` permits Family to inspect any patient. |
| **Can view reports?** | **GLOBAL LEAK** | `reportController.js:750-772` — `GET /api/reports` without `patientId` returns all reports. |
| **Can upload reports?** | **YES** | `reportController.js:30-34` — Can upload report for any patient by supplying `patientId`. |
| **Can edit OCR-extracted values?** | **YES** | `reportController.js:172-178` — Patient ownership check bypassed. |
| **Can confirm reports?** | **YES** | `reportController.js:373-378` — Patient ownership check bypassed. |
| **Can view predictions?** | **YES** | `predictionController.js:211-220` — Can query predictions for any patient. |
| **Can trigger predictions?** | **YES** | `predictionController.js:27-29` — Can trigger predictions for any patient. |
| **Can modify patient clinical data?** | **DENIED (Route)** | `patientRoutes.js:25` — `authorizeRoles('Doctor', 'Nurse', 'CHO', 'Admin', 'Patient')`. |
| **Can delete data?** | **DENIED** | Denied by route middleware. |

---

### 3.6 Admin

| Capability | Current State | Code Location & Mechanism |
| :--- | :---: | :--- |
| **Can self-register?** | **YES (CRITICAL)** | `authController.js:30-60` — Unrestricted self-registration with `role: 'Admin'`. |
| **Can manage users?** | **PARTIAL** | `userRoutes.js:11-12` — Can view and delete users, but `createUser` endpoint is missing. |
| **Can view all patients?** | **YES** | `patientRoutes.js:22` — `authorizeRoles` includes Admin. |
| **Can view all clinical reports?** | **YES** | `reportController.js:750-772` — Can view all reports without restriction. |
| **Can view all AI predictions?** | **YES** | `predictionController.js:211-220` — Can view any patient's predictions. |
| **Can modify patient records?** | **YES** | `patientController.js:447-468` — Full write access to patient vitals. |
| **Can delete patient records?** | **YES** | `patientController.js:470-479` — Can delete patient and user. |
| **Clinical/System Separation:** | **NONE** | Admin has direct, un-audited access to sensitive medical data, OCR, and ML predictions. |

---

## 4. Key Architectural Flaws Identified

1. **Self-Registration Privilege Escalation:** Any individual can become an Administrator, Doctor, or CHO instantly via `POST /api/auth/register`.
2. **Horizontal IDOR Across All Entities:**
   - Patient Profile: `GET /api/patients/:id`
   - Clinical Reports: `GET /api/reports/:id` and `GET /api/reports?patientId=...`
   - Predictions: `GET /api/predictions/diabetes/history?patientId=...` and `GET /api/predictions/heart-disease/history?patientId=...`
3. **Ghost Clinician Filter:** The fallback clause `{ assignedDoctor: { $exists: false } }` defeats multi-tenancy, exposing all unassigned patients to any clinician.
4. **Empty Implementation Blocks:** Security checks that were outlined in comments (e.g. `reportController.js:184`) were never implemented.
5. **No Consent or Verification State Machine:** There is no mechanism for a patient to approve or reject a doctor, invite a family member, or revoke access.
