# MedScan-NCD: Role Access Matrices (Current vs. Target)
**Document ID:** MEDSCAN-SEC-MAT-001  
**Status:** FORENSIC ACCESS MATRIX & TARGET LEAST-PRIVILEGE SPECIFICATION  
**Date:** September 2026  

---

## 1. Current Access Matrix (Actual Implemented Behavior)

Every cell below represents the **actual technical enforcement** currently in place in the backend codebase, verified through route guards and controller code.

| Role | Own Profile | Own Reports | Own Predictions | Other Patients | Other Reports | Other Predictions | Appointments | Patient Demographics | Medical Data Editing | OCR Correction | Report Confirmation | AI Predictions | User Management |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Patient** | **ALLOW**<br>*(1)* | **ALLOW**<br>*(2)* | **ALLOW**<br>*(3)* | **ALLOW**<br>*(4)* | **DENY**<br>*(5)* | **DENY**<br>*(6)* | **ALLOW**<br>*(7)* | **ALLOW**<br>*(8)* | **ALLOW (Own)**<br>*(9)* | **ALLOW (Own)**<br>*(10)* | **ALLOW (Own)**<br>*(11)* | **ALLOW (Own)**<br>*(12)* | **DENY**<br>*(13)* |
| **Doctor** | **ALLOW**<br>*(14)* | **N/A**<br>*(15)* | **N/A**<br>*(15)* | **ALLOW (All)**<br>*(16)* | **ALLOW (All)**<br>*(17)* | **ALLOW (All)**<br>*(18)* | **ALLOW**<br>*(19)* | **ALLOW (All)**<br>*(20)* | **ALLOW (All)**<br>*(21)* | **ALLOW (All)**<br>*(22)* | **ALLOW (All)**<br>*(23)* | **ALLOW (All)**<br>*(24)* | **DENY**<br>*(25)* |
| **CHO** | **ALLOW**<br>*(14)* | **N/A**<br>*(15)* | **N/A**<br>*(15)* | **ALLOW (All)**<br>*(26)* | **ALLOW (All)**<br>*(17)* | **ALLOW (All)**<br>*(18)* | **DENY**<br>*(27)* | **ALLOW (All)**<br>*(20)* | **ALLOW (All)**<br>*(21)* | **ALLOW (All)**<br>*(22)* | **ALLOW (All)**<br>*(23)* | **ALLOW (All)**<br>*(24)* | **DENY**<br>*(25)* |
| **Nurse** | **ALLOW**<br>*(14)* | **N/A**<br>*(15)* | **N/A**<br>*(15)* | **ALLOW (All)**<br>*(28)* | **ALLOW (All)**<br>*(17)* | **ALLOW (All)**<br>*(18)* | **DENY**<br>*(27)* | **ALLOW (All)**<br>*(20)* | **ALLOW (All)**<br>*(21)* | **ALLOW (All)**<br>*(22)* | **ALLOW (All)**<br>*(23)* | **ALLOW (All)**<br>*(24)* | **DENY**<br>*(25)* |
| **Family** | **ALLOW**<br>*(14)* | **N/A**<br>*(15)* | **N/A**<br>*(15)* | **ALLOW (All)**<br>*(29)* | **ALLOW (All)**<br>*(17)* | **ALLOW (All)**<br>*(18)* | **DENY**<br>*(27)* | **ALLOW (All)**<br>*(20)* | **DENY**<br>*(30)* | **ALLOW (All)**<br>*(31)* | **ALLOW (All)**<br>*(32)* | **ALLOW (All)**<br>*(24)* | **DENY**<br>*(25)* |
| **Admin** | **ALLOW**<br>*(14)* | **N/A**<br>*(15)* | **N/A**<br>*(15)* | **ALLOW (All)**<br>*(33)* | **ALLOW (All)**<br>*(17)* | **ALLOW (All)**<br>*(18)* | **DENY**<br>*(27)* | **ALLOW (All)**<br>*(20)* | **ALLOW (All)**<br>*(21)* | **ALLOW (All)**<br>*(22)* | **ALLOW (All)**<br>*(23)* | **ALLOW (All)**<br>*(24)* | **PARTIAL**<br>*(34)* |

---

### Citations & Exact Code Locations (Current Matrix)

1. `patientController.js:192-221`: `router.get('/me', authorizeRoles('Patient'), getMyPatientProfile)` verifies token ownership.
2. `reportController.js:753-761`: `getReports` sets `filter.patient = patientRecord._id` when `req.user.role === 'Patient'`.
3. `predictionController.js:213-216`: Forces `patientId = p._id` for `role === 'Patient'`.
4. `patientController.js:269-282` & `patientRoutes.js:23`: `router.get('/:id', authorizeRoles(..., 'Patient'))` contains **zero IDOR guard**; Patient A can view Patient B.
5. `reportController.js:785-789`: `getReportById` checks `String(report.patient._id) !== String(patientRecord._id)`.
6. `predictionController.js:145-148`: `getLatestDiabetesPrediction` checks `String(latest.patient) !== String(patientRecord._id)`.
7. `appointmentRoutes.js:9-10`: `getAppointments` and `createAppointment` scoped to patient.
8. `patientController.js:319-390`: `updateMyDemographics` allows patient to update age, sex, vitals.
9. `patientController.js:396-445`: `updatePatient` restricts Patient to their own record.
10. `reportController.js:173-177`: `updateExtractedData` verifies `report.patient === patientRecord._id`.
11. `reportController.js:373-377`: `confirmReport` verifies `report.patient === patientRecord._id`.
12. `predictionController.js:24-26, 247-249`: Scopes feature extraction to own patient record.
13. `userRoutes.js:11-12`: `authorizeRoles('Admin')` blocks non-admins from user management.
14. `userRoutes.js:10`: `PUT /profile` allows any authenticated user to update their name, avatar, phone.
15. Non-patient roles do not possess patient health profiles or personal medical reports.
16. `patientController.js:228-229`: `filter.$or = [{ assignedDoctor: req.user._id }, { assignedDoctor: { $exists: false } }]` exposes all unassigned patients. Furthermore, `patientController.js:271` allows viewing any patient by ID.
17. `reportController.js:750-772`: If non-patient does not supply `patientId`, `filter = {}`, returning **all reports in database**. If `patientId` is supplied, no clinician assignment check is executed.
18. `predictionController.js:211-233`: Non-patient can supply arbitrary `?patientId=` to fetch full predictions.
19. `appointmentController.js:17`: `if (req.user.role === 'Doctor') filter.doctor = req.user._id`.
20. `patientController.js:271-282`: Returns populated demographics for any patient ID.
21. `patientController.js:447-468`: Any Doctor, Nurse, CHO, or Admin can execute `PUT /api/patients/:id` with arbitrary clinical payload.
22. `reportController.js:181-186`: Empty code block allows any Doctor, Nurse, CHO, Family, or Admin to edit pending extraction values.
23. `reportController.js:373-378`: Ownership check runs only if `req.user.role === 'Patient'`. Non-patients bypass check.
24. `predictionController.js:18-67, 241-295`: Any non-patient can trigger ML inference on any patient ID.
25. `userRoutes.js:11-12`: Blocked by `authorizeRoles('Admin')`.
26. `patientController.js:232-233`: CHO filter only applies `if (village)`. If omitted or 'All', returns all patients nationwide.
27. `appointmentRoutes.js`: No routes configured for CHO, Nurse, Family, or Admin in appointment controller.
28. `patientController.js:230-231`: Exposes all unassigned patients to Nurses via `$exists: false`.
29. `patientController.js:486-492`: Automatically leaks the first 2 patients in database if unlinked.
30. `patientRoutes.js:25`: `authorizeRoles` on `PUT /api/patients/:id` excludes `'Family'`.
31. `reportRoutes.js:18`: `PATCH /api/reports/:id/extracted-data` has no role restriction; Family member can edit values.
32. `reportRoutes.js:19`: `PUT /api/reports/:id/confirm` has no role restriction; Family member can confirm reports.
33. `patientRoutes.js:22`: `authorizeRoles` on `GET /api/patients` includes `'Admin'`.
34. `userRoutes.js:11-12`: Admin can list and delete users, but `createUser` route is missing (returns 404).

---

## 2. Target Medical Data Access Matrix (Least Privilege Specification)

In accordance with Section 16 of the audit mandate, the table below defines the **Target Authorization Policy**.

### Matrix Legend
- **READ:** Allowed to view with authorized, active relationship.
- **WRITE:** Allowed to create, edit, or delete with authorized relationship.
- **READ-ONLY:** View allowed; modifications strictly denied.
- **NO ACCESS:** Blocked at server level (`403 Forbidden`).
- **CONDITIONAL:** Permitted only when explicit patient consent, assignment, or geographic criteria are met.

| Medical Data Entity | Patient | Doctor | Nurse | CHO | Family | Admin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Profile & Demographics** | READ / WRITE *(Own)* | READ-ONLY *(Assigned)* | READ-ONLY *(Assigned)* | READ-ONLY *(Assigned Area)* | READ-ONLY *(Consented)* | NO ACCESS *(System Metadata Only)* |
| **Raw OCR Text** | READ-ONLY *(Own)* | READ-ONLY *(Assigned)* | READ-ONLY *(Assigned)* | READ-ONLY *(Assigned Area)* | NO ACCESS | NO ACCESS |
| **Machine Extracted Data** | READ-ONLY *(Own)* | READ-ONLY *(Assigned)* | READ-ONLY *(Assigned)* | READ-ONLY *(Assigned Area)* | NO ACCESS | NO ACCESS |
| **Human Corrected Data** | READ / WRITE *(Own)* | READ / WRITE *(Assigned)* | READ / WRITE *(Assigned)* | READ / WRITE *(Assigned Area)* | NO ACCESS | NO ACCESS |
| **Confirmed Clinical Vitals**| READ-ONLY *(Own)* | READ / WRITE *(Assigned)* | READ / WRITE *(Assigned)* | READ / WRITE *(Assigned Area)* | READ-ONLY *(Consented)* | NO ACCESS |
| **Diagnostic Lab Reports** | READ / WRITE *(Own)* | READ / WRITE *(Assigned)* | READ / WRITE *(Assigned)* | READ / WRITE *(Assigned Area)* | READ-ONLY *(Consented)* | NO ACCESS |
| **Diabetes Prediction** | READ-ONLY *(Own)* | READ / WRITE *(Assigned)* | READ-ONLY *(Assigned)* | READ-ONLY *(Assigned Area)* | READ-ONLY *(Consented)* | NO ACCESS |
| **Heart Disease Prediction**| READ-ONLY *(Own)* | READ / WRITE *(Assigned)* | READ-ONLY *(Assigned)* | READ-ONLY *(Assigned Area)* | READ-ONLY *(Consented)* | NO ACCESS |
| **Prediction History** | READ-ONLY *(Own)* | READ-ONLY *(Assigned)* | READ-ONLY *(Assigned)* | READ-ONLY *(Assigned Area)* | READ-ONLY *(Consented)* | NO ACCESS |
| **Longitudinal Timeline** | READ-ONLY *(Own)* | READ-ONLY *(Assigned)* | READ-ONLY *(Assigned)* | READ-ONLY *(Assigned Area)* | READ-ONLY *(Consented)* | NO ACCESS |
| **Prescriptions & Meds** | READ-ONLY *(Own)* | READ / WRITE *(Assigned)* | READ-ONLY *(Assigned)* | READ-ONLY *(Assigned Area)* | READ-ONLY *(Consented)* | NO ACCESS |
| **Adherence Telemetry (IoT)**| READ-ONLY *(Own)* | READ-ONLY *(Assigned)* | READ-ONLY *(Assigned)* | READ-ONLY *(Assigned Area)* | READ-ONLY *(Consented)* | NO ACCESS |
| **Appointments** | READ / WRITE *(Own)* | READ / WRITE *(Assigned)* | READ-ONLY *(Assigned)* | CONDITIONAL *(Facility)* | READ-ONLY *(Consented)* | NO ACCESS |
| **Clinical Notes** | READ-ONLY *(Own)* | READ / WRITE *(Assigned)* | READ / WRITE *(Assigned)* | READ-ONLY *(Assigned Area)* | NO ACCESS | NO ACCESS |
| **Emergency Contact Info** | READ / WRITE *(Own)* | READ-ONLY *(Assigned)* | READ-ONLY *(Assigned)* | READ-ONLY *(Assigned Area)* | READ-ONLY *(Consented)* | NO ACCESS |
| **Population Analytics** | NO ACCESS | NO ACCESS | NO ACCESS | READ-ONLY *(Aggregated Only)* | NO ACCESS | READ-ONLY *(Operational Logs)* |
| **User Account Management** | NO ACCESS | NO ACCESS | NO ACCESS | NO ACCESS | NO ACCESS | READ / WRITE *(Non-Clinical)* |

---

## 3. Scope Hierarchy Definitions

1. **`OWN` Scope (Patient):**
   - Applies strictly where `Resource.patient.user === req.user._id`.
   - Bounded to the individual's self-generated health records.
2. **`ASSIGNED` Scope (Doctor, Nurse):**
   - Requires active entry in `PatientRelationship` collection:
     `{ patient: patientId, practitioner: req.user._id, status: 'ACTIVE' }`.
   - Access terminates immediately upon status change to `REVOKED` or `DISCHARGED`.
3. **`CONSENTED` Scope (Family):**
   - Requires verified patient grant with explicit permission mask:
     `{ patient: patientId, member: req.user._id, status: 'ACTIVE', permissions: ['REPORTS_VIEW', 'MEDICINES_VIEW'] }`.
   - Under no circumstances does a family member have write access to clinical vitals or predictions.
4. **`ASSIGNED AREA` Scope (CHO):**
   - Bounded to `Patient.village === req.user.assignedVillage`.
   - Requests outside the assigned geographical boundaries are rejected with `403 Forbidden`.
   - Individual record access requires community health worker assignment.
5. **`SYSTEM` Scope (Admin):**
   - Purely operational and administrative.
   - Manages identity, provider credentials, audit logs, and infrastructure.
   - **Zero read or write capability for raw clinical documents, OCR images, or patient predictions.**
