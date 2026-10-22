# MedScan-NCD: Role-Wise Demonstration Feature Matrix

> **Verification Standard:** All features listed below have been verified using automated integration suites, live serialized ML inference endpoints, and seeded demonstration records.  
> **`SYNTHETIC — FOR DEMONSTRATION ONLY`**

---

## 1. Feature Availability by Role

| Feature Category | Specific Capability | Patient | Doctor | CHO | Admin | Verification Status |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **Authentication** | Sign in with demo credentials or convenience selector | ✅ | ✅ | ✅ | ✅ | **VERIFIED** |
| | Self-service registration & email activation link | ✅ | ❌ | ❌ | ❌ | **VERIFIED** |
| | Password recovery workflow | ✅ | ✅ | ✅ | ✅ | **VERIFIED** |
| **Laboratory Reports** | Upload digital PDF lab report | ✅ | ✅ | ❌ | ❌ | **VERIFIED** |
| | Upload optical image lab report (PNG / JPEG via OCR) | ✅ | ✅ | ❌ | ❌ | **VERIFIED** |
| | Non-medical document rejection (`case_f`) | ✅ | ✅ | ❌ | ❌ | **VERIFIED** |
| | Human-in-the-Loop OCR correction with audit trail | ✅ | ✅ | ❌ | ❌ | **VERIFIED** |
| | Explicit report confirmation & profile persistence | ✅ | ✅ | ❌ | ❌ | **VERIFIED** |
| | Longitudinal report comparison & numerical deltas | ✅ | ✅ | ❌ | ❌ | **VERIFIED** |
| **AI Risk Prediction** | Diabetes risk estimation (LightGBM + TreeSHAP) | ✅ | ✅ | ✅* | ❌ | **VERIFIED** |
| | Heart disease 10-year risk (LogReg + Linear Factors)| ✅ | ✅ | ✅* | ❌ | **VERIFIED** |
| | Hypertension risk estimation (HistGradientBoosting) | ✅ | ✅ | ❌ | ❌ | **VERIFIED** |
| | Chronic Kidney Disease risk (Random Forest minimal) | ✅ | ✅ | ❌ | ❌ | **VERIFIED** |
| | Partial data completeness handling (`PARTIAL`) | ✅ | ✅ | ❌ | ❌ | **VERIFIED** |
| | Missing required feature rejection (`INSUFFICIENT_DATA`)| ✅ | ✅ | ❌ | ❌ | **VERIFIED** |
| **Clinical Workflows** | View authorized patient directory | ❌ | ✅ | ❌ | ❌ | **VERIFIED** |
| | Search and filter patients by name or clinical vitals | ❌ | ✅ | ❌ | ❌ | **VERIFIED** |
| | Enter temporary patient in-clinic consultation code | ❌ | ✅ | ❌ | ❌ | **VERIFIED** |
| | Accept / decline pending patient consultation requests| ❌ | ✅ | ❌ | ❌ | **VERIFIED** |
| | Prescribe medicine with dosage and timing | ❌ | ✅ | ❌ | ❌ | **VERIFIED** |
| | View and manage scheduled clinic appointments | ✅ | ✅ | ❌ | ❌ | **VERIFIED** |
| **Community Care** | View catchment community registry by village | ❌ | ❌ | ✅ | ❌ | **VERIFIED** |
| | Population screening coverage & monthly charts | ❌ | ❌ | ✅ | ❌ | **VERIFIED** |
| | Schedule and update patient follow-up visits | ❌ | ❌ | ✅ | ❌ | **VERIFIED** |
| | View overdue and upcoming follow-ups | ❌ | ❌ | ✅ | ❌ | **VERIFIED** |
| | Record and track external healthcare facility referrals| ❌ | ❌ | ✅ | ❌ | **VERIFIED** |
| | Monitor un-screened population data-quality metric | ❌ | ❌ | ✅ | ❌ | **VERIFIED** |
| **System Administration**| View all system users across all roles | ❌ | ❌ | ❌ | ✅ | **VERIFIED** |
| | Filter users by role and search by name/email | ❌ | ❌ | ❌ | ✅ | **VERIFIED** |
| | Create new user account with assigned role | ❌ | ❌ | ❌ | ✅ | **VERIFIED** |
| | Delete user account from database | ❌ | ❌ | ❌ | ✅ | **VERIFIED** |
| | Update global platform settings & MongoDB sync | ❌ | ❌ | ❌ | ✅ | **VERIFIED** |

*\*Note: CHO dashboard displays aggregated population risk distributions and clinical summaries for patients within their catchment area.*

---

## 2. Cross-Role Authorization Safeguards

| Attempted Unauthorized Action | Role Attempting | Server Response | Enforcement Mechanism |
|---|---|:---:|---|
| Access `/doctor/dashboard` or `/admin/dashboard` | Patient | **403 Forbidden / Redirect** | Frontend `RoleRoute.jsx` + Backend `authorize()` |
| View Patient C records without relationship | Unrelated Doctor | **403 Forbidden** | Backend `isDoctorAuthorizedForPatient()` middleware |
| Upload medical report for arbitrary patient | CHO | **403 Forbidden** | Backend `reportController.uploadReport` role restriction |
| Accept doctor-patient relationship | Patient | **403 Forbidden** | Backend `relationshipController.acceptRelationship` (Clinician-only) |
| Create User with role `Doctor` via public registration | Public User | **Strictly Patient** | Backend `authController.register` hard-coded to `role: 'Patient'` |
| Bypass email verification in production | Unverified User | **403 EMAIL_NOT_VERIFIED** | Backend `authController.login` checks `isEmailVerified: true` |
