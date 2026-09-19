# MedScan-NCD: Current vs. Target Role Access Gap Analysis
**Document ID:** MEDSCAN-SEC-GAP-001  
**Status:** COMPREHENSIVE GAP SPECIFICATION & REMEDIATION ROADMAP  
**Date:** September 2026  

---

## 1. Comparative Analysis Overview

The following analysis contrasts the **Current Prototype Implementation** with the **Target Production Architecture** across eight critical dimensions of authorization and multi-tenancy.

---

## 2. Detailed Domain Gap Analysis

### Domain 1: User Account Creation & Role Provisioning

| Dimension | Current Behavior | Target Behavior | Security Gap & Vulnerability | Required Future Implementation |
| :--- | :--- | :--- | :--- | :--- |
| **Self-Registration** | Public dropdown on `/register` allows any user to create an account as `Doctor`, `Admin`, `CHO`, `Nurse`, `Family`, or `Patient`. | **Only Patients** can self-register publicly. | **Critical Privilege Escalation:** Any external actor can grant themselves full administrative or clinical privileges without verification. | 1. Restrict public `register` API to `role: 'Patient'`.<br>2. Quarantine all other roles to verified onboarding flows. |
| **Doctor Provisioning** | Self-selected at registration; immediate active status. | Admin or Clinical Board creates account; requires medical license verification (`NMC/State Medical Council`). | Unverified individuals can pose as licensed physicians and access patient health records. | 1. Implement `DoctorVerification` schema.<br>2. Require license number, hospital affiliation, and Admin approval before account activation. |
| **CHO Provisioning** | Self-selected at registration. | Health Center Administrator or Ministry Admin provisions CHO accounts and binds them to specific village codes. | Anyone can claim to be a Community Health Officer and view rural population health records. | 1. Controlled provisioning endpoint (`POST /api/admin/cho-provision`).<br>2. Mandatory assignment of `village` and `catchmentArea`. |
| **Nurse Provisioning** | Self-selected at registration. | Hospital/Facility Admin provisions Nurse accounts and binds them to a clinical department or supervising physician. | Unverified accounts can impersonate nurses and update patient medications and vitals. | 1. Administrative provisioning with supervisor ID.<br>2. Mandatory facility binding. |
| **Family Provisioning** | Self-selected at registration. | Created **only via direct Patient Invitation** (email/SMS invite token). | Unrelated users can create Family accounts and be fed leaked patient records via demo fallbacks. | 1. Disable public registration for Family.<br>2. Implement `POST /api/patients/me/invite-family` with one-time verification tokens. |
| **Admin Provisioning** | Self-selected at registration. | CLI seed script or existing Super-Admin invitation only; zero public API access. | Severe compromise of platform integrity; rogue admins can drop databases or delete patients. | 1. Strip `Admin` from registration enum validation.<br>2. Enforce MFA (Multi-Factor Authentication) on administrative accounts. |

---

### Domain 2: Doctor ↔ Patient Access & Tenancy

| Dimension | Current Behavior | Target Behavior | Security Gap & Vulnerability | Required Future Implementation |
| :--- | :--- | :--- | :--- | :--- |
| **Patient Directory** | `GET /api/patients` uses `{ $or: [{ assignedDoctor: req.user._id }, { assignedDoctor: { $exists: false } }] }`. | `GET /api/patients` returns **strictly patients with an `ACTIVE` relationship record**. | **Global Directory Leakage:** Every unassigned patient in the platform is visible to every doctor. | 1. Eliminate `{ assignedDoctor: { $exists: false } }` fallback.<br>2. Query against `DoctorPatientRelationship` collection. |
| **Individual Patient Record** | `GET /api/patients/:id` has no ownership or assignment check. | Checks for active, approved doctor-patient relationship before returning data. | **Horizontal IDOR:** Doctor A can view Doctor B's patients by iterating sequential ObjectIds. | 1. Implement `verifyDoctorPatientRelationship` middleware.<br>2. Return `403 Forbidden` if relationship is inactive or non-existent. |
| **Report Access** | `GET /api/reports` returns **all reports in database** if `patientId` is omitted. | Returns reports **only for patients assigned to the requesting doctor**. | **Mass Data Exfiltration Risk:** One API request dumps all patient diagnostic history nationwide. | 1. Require `patientId` on all clinician report queries.<br>2. Verify clinician assignment before querying `Report` collection. |
| **Clinical Record Deletion** | Any doctor can call `DELETE /api/patients/:id` to permanently erase any patient and their User login. | Only System Admins (via legal compliance request) can delete accounts; clinicians can only archive. | **Malicious/Accidental Data Destruction:** A rogue doctor account can delete all platform users. | 1. Remove `'Doctor'` from `authorizeRoles` on `DELETE /api/patients/:id`.<br>2. Implement soft-delete and archival mechanisms. |

---

### Domain 3: Community Health Officer (CHO) Tenancy

| Dimension | Current Behavior | Target Behavior | Security Gap & Vulnerability | Required Future Implementation |
| :--- | :--- | :--- | :--- | :--- |
| **Geographic Scoping** | CHO can pass `?village=All` or omit `village` parameter to see **all patients nationwide**. | Server enforces `filter.village = req.user.assignedVillage`. Client cannot override. | **Territorial Breach:** A rural health worker in Village A can view patients in Village B or urban centers. | 1. Attach `assignedVillage` to CHO profile.<br>2. Enforce server-side geographic boundary filter on all CHO queries. |
| **Individual Patient File** | CHO can open any patient's `/doctor/patient/:id` URL and view full history and reports. | CHO can view individual files **only for patients residing in their assigned village**. | **Horizontal Privilege Escalation:** Cross-region snooping on private medical profiles. | 1. Validate `patient.village === req.user.assignedVillage` on `GET /api/patients/:id`.<br>2. Restrict non-local file inspection. |
| **Population Analytics** | Returns mock aggregate stats with no geographic boundary checks. | Returns authenticated aggregates scoped strictly to CHO's catchment area. | Inaccurate or misattributed regional health indicators. | 1. Dynamic aggregation pipeline grouping strictly by `req.user.assignedVillage`. |

---

### Domain 4: Nurse ↔ Patient Tenancy

| Dimension | Current Behavior | Target Behavior | Security Gap & Vulnerability | Required Future Implementation |
| :--- | :--- | :--- | :--- | :--- |
| **Patient Roster** | Sees all unassigned patients via `{ assignedNurse: { $exists: false } }`. | Sees **only patients actively assigned to their shift/ward by supervising physician**. | Unassigned patient visibility; lack of accountability for clinical actions. | 1. Implement `NurseAssignment` linking Nurse, Patient, and Supervising Doctor.<br>2. Restrict patient listing to active assignments. |
| **Vitals Modification** | Can execute `PUT /api/patients/:id` and overwrite all clinical fields. | Can log vitals (`BP`, `Glucose`, `HeartRate`) as new timestamped observation logs; cannot edit demographics. | Overwrite of historical baselines without clinical audit trail. | 1. Dedicated vitals entry endpoint (`POST /api/patients/:id/vitals-log`).<br>2. Make patient baseline demographics read-only to nurses. |

---

### Domain 5: Family Member ↔ Patient Tenancy

| Dimension | Current Behavior | Target Behavior | Security Gap & Vulnerability | Required Future Implementation |
| :--- | :--- | :--- | :--- | :--- |
| **Relationship Grant** | If family account is unlinked, backend **returns the first 2 patients in database** (`patientController.js:488`). | If unlinked, returns empty array `[]` with prompt to request patient invitation. | **Catastrophic Privacy Violation:** Strangers' medical profiles are delivered to unlinked family accounts. | 1. Delete `Patient.find({}).limit(2)` fallback immediately.<br>2. Return clean empty array for unlinked accounts. |
| **Write Permissions** | Can call `PATCH /api/reports/:id/extracted-data` and `PUT /api/reports/:id/confirm`. | **Strictly Read-Only.** Family members cannot edit or confirm lab reports. | Family members could alter laboratory numbers or confirm incorrect clinical data. | 1. Add `authorizeRoles('Patient', 'Doctor', 'CHO')` to report confirmation and correction routes.<br>2. Block `'Family'` role with `403 Forbidden`. |

---

### Domain 6: System Administrator Separation of Powers

| Dimension | Current Behavior | Target Behavior | Security Gap & Vulnerability | Required Future Implementation |
| :--- | :--- | :--- | :--- | :--- |
| **Access to Medical Data** | Admin can view raw lab reports, OCR extractions, and AI prediction vectors. | Admin is blocked from reading personal health data, reports, and predictions. | **Violation of Medical Confidentiality:** Non-clinical personnel can view sensitive HIV, lipid, or glucose results. | 1. Exclude `'Admin'` from `reportRoutes.js` and `predictionRoutes.js`.<br>2. Restrict Admin to user account management and system settings. |
| **Account Creation Route** | Admin Dashboard UI calls `POST /api/users`, which is unhandled (404). | Implement secure, validated `POST /api/admin/users` with audit logging. | Broken administrative functionality. | 1. Implement `createUser` controller in `userController.js`.<br>2. Register `POST /api/users` in `userRoutes.js` with admin authorization. |

---

### Domain 7: Direct Object Reference (IDOR) & Server-Side Security

| Dimension | Current Behavior | Target Behavior | Security Gap & Vulnerability | Required Future Implementation |
| :--- | :--- | :--- | :--- | :--- |
| **`GET /api/patients/:id`** | Open to all authenticated roles with zero tenancy verification. | Bounded by relationship check: `isOwner(Patient)` OR `isAssignedDoctor` OR `isAssignedNurse` OR `isLocalCHO` OR `isConsentedFamily`. | Any authenticated user can scrape the entire patient database by ID. | 1. Centralized `patientAuthorizationMiddleware.js`. |
| **`GET /api/reports/:id`** | Checks ownership only if `req.user.role === 'Patient'`. Non-patients bypass check. | Checks report ownership or active clinician relationship regardless of role. | Any Doctor, Nurse, or CHO can view any report by guessing report ID. | 1. Enforce tenancy verification in `getReportById`. |
| **`GET /api/predictions/...`** | Accepts arbitrary `?patientId=` from any non-patient. | Validates that requesting user has active clinical relationship with `patientId`. | Any healthcare account can inspect prediction histories for any patient. | 1. Enforce relationship check in `predictionController.js`. |
| **`PUT /api/appointments/:id`** | Accepts arbitrary status updates from any authenticated user. | Validates that requester is the patient or assigned doctor for that specific appointment. | Any user can cancel or reschedule appointments between other doctors and patients. | 1. Ownership check in `updateAppointmentStatus`. |

---

### Domain 8: Audit Logging & Provenance

| Dimension | Current Behavior | Target Behavior | Security Gap & Vulnerability | Required Future Implementation |
| :--- | :--- | :--- | :--- | :--- |
| **Access Audit Trail** | Only login events and report confirmations are logged to console. | Every access to a medical report, prediction, or profile is recorded in immutable `AuditLog` collection. | Non-repudiation failure; impossible to trace who accessed a leaked medical file. | 1. Dedicated `AuditLog` MongoDB schema.<br>2. Automated audit logging middleware on sensitive clinical routes. |
