# MedScan-NCD: Final Target Permission Matrix (26-Operation Standard)
**Document ID:** MEDSCAN-SEC-MAT-002  
**Status:** DEFINITIVE PERMISSION MATRIX SPECIFICATION  
**Date:** September 2026  

---

## 1. Matrix Key & Notation

Every cell explicitly defines two mandatory attributes:
1. **Tenancy Scope:**
   - **`OWN`:** Requester is the resource owner (Patient).
   - **`ASSIGNED`:** Active clinical relationship verified in `PatientRelationship` collection.
   - **`CATCHMENT`:** Patient resides within CHO's assigned village boundaries (`patient.village === cho.assignedVillage`).
   - **`CONSENTED`:** Explicit, active caregiver grant from patient.
   - **`SYSTEM`:** Operational platform management boundary.
   - **`NO ACCESS`:** Request is blocked server-side with `403 Forbidden`.
2. **Operation Primitive:**
   - **`READ`:** View or retrieve record.
   - **`CREATE`:** Author new entity.
   - **`EDIT`:** Modify uncommitted draft, observation, or active entity.
   - **`CONFIRM`:** Commit legal clinical data to patient profile.
   - **`DELETE`:** Purge or deactivate entity.
   - **`TRIGGER`:** Feed data to ML inference microservice.
   - **`EXPORT`:** Download file artifact.

---

## 2. Definitive 26-Operation Access Matrix

| # | Operation / Medical Resource | Patient | Doctor | Nurse | CHO | Family | Admin |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **01** | **VIEW PROFILE** | `OWN: READ` | `ASSIGNED: READ` | `ASSIGNED: READ` | `CATCHMENT: READ` | `CONSENTED: READ` | `NO ACCESS` *(1)* |
| **02** | **EDIT PROFILE** | `OWN: EDIT` *(2)* | `NO ACCESS` *(3)* | `NO ACCESS` | `NO ACCESS` | `NO ACCESS` | `NO ACCESS` |
| **03** | **UPLOAD REPORT** | `OWN: CREATE` | `ASSIGNED: CREATE` | `ASSIGNED: CREATE` | `CATCHMENT: CREATE` | `NO ACCESS` | `NO ACCESS` |
| **04** | **VIEW RAW OCR** | `OWN: READ` | `ASSIGNED: READ` | `ASSIGNED: READ` | `CATCHMENT: READ` | `NO ACCESS` *(4)* | `NO ACCESS` |
| **05** | **VIEW EXTRACTED DATA** | `OWN: READ` | `ASSIGNED: READ` | `ASSIGNED: READ` | `CATCHMENT: READ` | `NO ACCESS` *(4)* | `NO ACCESS` |
| **06** | **EDIT EXTRACTED DATA** | `OWN: EDIT` *(5)* | `ASSIGNED: EDIT` *(5)* | `ASSIGNED: EDIT` *(5)* | `CATCHMENT: EDIT` *(5)* | `NO ACCESS` | `NO ACCESS` |
| **07** | **CREATE CORRECTION** | `OWN: CREATE` *(6)* | `ASSIGNED: CREATE` *(6)* | `ASSIGNED: CREATE` *(6)* | `CATCHMENT: CREATE` *(6)* | `NO ACCESS` | `NO ACCESS` |
| **08** | **CONFIRM REPORT** | `OWN: CONFIRM` | `ASSIGNED: CONFIRM` | `NO ACCESS` *(7)* | `CATCHMENT: CONFIRM`*(8)*| `NO ACCESS` | `NO ACCESS` |
| **09** | **EDIT CONFIRMED DATA** | `NO ACCESS` *(9)* | `NO ACCESS` *(9)* | `NO ACCESS` *(9)* | `NO ACCESS` *(9)* | `NO ACCESS` | `NO ACCESS` |
| **10** | **DELETE REPORT** | `OWN: DELETE` *(10)*| `ASSIGNED: DELETE`*(11)*| `NO ACCESS` | `NO ACCESS` | `NO ACCESS` | `NO ACCESS` |
| **11** | **VIEW DIABETES PREDICTION** | `OWN: READ` | `ASSIGNED: READ` | `ASSIGNED: READ` | `CATCHMENT: READ` | `CONSENTED: READ` | `NO ACCESS` |
| **12** | **TRIGGER DIABETES PREDICTION**| `OWN: TRIGGER`*(12)* | `ASSIGNED: TRIGGER` | `NO ACCESS` *(13)*| `CATCHMENT: TRIGGER`*(14)*| `NO ACCESS` | `NO ACCESS` |
| **13** | **VIEW HEART DISEASE PREDICTION**| `OWN: READ` | `ASSIGNED: READ` | `ASSIGNED: READ` | `CATCHMENT: READ` | `CONSENTED: READ` | `NO ACCESS` |
| **14** | **TRIGGER HEART DISEASE PREDICTION**|`OWN: TRIGGER`*(12)*| `ASSIGNED: TRIGGER` | `NO ACCESS` *(13)*| `CATCHMENT: TRIGGER`*(14)*| `NO ACCESS` | `NO ACCESS` |
| **15** | **VIEW PREDICTION HISTORY** | `OWN: READ` | `ASSIGNED: READ` | `ASSIGNED: READ` | `CATCHMENT: READ` | `CONSENTED: READ` | `NO ACCESS` |
| **16** | **CREATE CLINICAL NOTE** | `NO ACCESS` | `ASSIGNED: CREATE` | `ASSIGNED: CREATE`*(15)*| `CATCHMENT: CREATE`*(16)| `NO ACCESS` | `NO ACCESS` |
| **17** | **EDIT CLINICAL NOTE** | `NO ACCESS` | `ASSIGNED: EDIT` *(17)*| `ASSIGNED: EDIT` *(17)*| `CATCHMENT: EDIT` *(17)| `NO ACCESS` | `NO ACCESS` |
| **18** | **VIEW PRESCRIPTION** | `OWN: READ` | `ASSIGNED: READ` | `ASSIGNED: READ` | `CATCHMENT: READ` | `CONSENTED: READ` | `NO ACCESS` |
| **19** | **CREATE PRESCRIPTION** | `NO ACCESS` | `ASSIGNED: CREATE` | `NO ACCESS` *(18)* | `NO ACCESS` *(18)* | `NO ACCESS` | `NO ACCESS` |
| **20** | **EDIT PRESCRIPTION** | `NO ACCESS` | `ASSIGNED: EDIT` *(19)* | `NO ACCESS` *(18)* | `NO ACCESS` *(18)* | `NO ACCESS` | `NO ACCESS` |
| **21** | **VIEW APPOINTMENT** | `OWN: READ` | `ASSIGNED: READ` | `ASSIGNED: READ` | `CATCHMENT: READ` | `CONSENTED: READ` | `NO ACCESS` |
| **22** | **CREATE APPOINTMENT** | `OWN: CREATE` | `ASSIGNED: CREATE` | `ASSIGNED: CREATE` | `CATCHMENT: CREATE` | `NO ACCESS` | `NO ACCESS` |
| **23** | **MANAGE RELATIONSHIP** | `OWN: CREATE/DELETE`| `ASSIGNED: EDIT` *(20)*| `NO ACCESS` | `NO ACCESS` | `NO ACCESS` | `SYSTEM: EDIT` *(21)*|
| **24** | **VIEW EMERGENCY INFORMATION** | `OWN: READ/EDIT` | `ASSIGNED: READ` | `ASSIGNED: READ` | `CATCHMENT: READ` | `CONSENTED: READ` | `NO ACCESS` |
| **25** | **VIEW POPULATION ANALYTICS** | `NO ACCESS` | `NO ACCESS` | `NO ACCESS` | `CATCHMENT: READ`*(22)| `NO ACCESS` | `SYSTEM: READ` *(23)*|
| **26** | **MANAGE USERS** | `NO ACCESS` | `NO ACCESS` | `NO ACCESS` | `NO ACCESS` | `NO ACCESS` | `SYSTEM: CREATE/EDIT/DELETE`*(24)|

---

## 3. Normative Footnotes & Policy Constraints

1. ***(1) Admin Profile Visibility:*** System Admins can inspect identity and account status (Name, Email, Role, Created Date, Active/Suspended), but **cannot access clinical vitals, medical history, or emergency medical contacts**.
2. ***(2) Patient Profile Editing:*** Patient can edit contact details, address, self-reported lifestyle (smoking status), and biometrics. Legal identity changes (e.g. date of birth, biological sex) require administrative re-verification after registration.
3. ***(3) Doctor Profile Editing:*** Doctors can enter and update clinical vitals (`systolicBP`, `diastolicBP`, `fastingSugar`, `totalCholesterol`, `bmi`), but **cannot alter the patient's legal identity or registered phone/email**.
4. ***(4) Family & Raw OCR/Draft Masking:*** Family members are strictly prohibited from viewing unconfirmed drafts, raw OCR strings, or reviewer correction logs to prevent premature interpretation or anxiety before clinician sign-off.
5. ***(5) Editing Extracted Data:*** Modifies the transient working copy (`extractedData`) during `PENDING_REVIEW`. Does **not** mutate `rawOcrText` or `initialExtraction`.
6. ***(6) Creating Corrections:*** Appends an immutable record to `report.corrections` tracing original value, reviewer ID, new value, and timestamp.
7. ***(7) Nurse Confirmation Boundary:*** Nurses possess vital sign observation entry rights, but **cannot formally confirm diagnostic lab reports**. Formal diagnostic confirmation requires the Attending Doctor or Patient.
8. ***(8) CHO Confirmation Authority:*** CHO can confirm a report on behalf of a rural patient only during an in-person health post visit, with the patient physically present.
9. ***(9) Immutability of Confirmed Data:*** Once a report transitions to `CONFIRMED`, `confirmedData` is **frozen**. No role can directly overwrite it. Corrections require the formal **Clinical Amendment Protocol** (superseding addendum).
10. ***(10) Patient Report Deletion:*** Patient has sovereign authority to delete own uploaded reports. Deleting a report automatically deletes linked prediction records generated from it.
11. ***(11) Doctor Report Deletion:*** Clinician can delete unconfirmed draft reports they uploaded in error. **Clinicians cannot delete patient-uploaded or confirmed diagnostic reports** (they can mark them `CLINICALLY_ARCHIVED`).
12. ***(12) Patient Prediction Triggering:*** Patient can trigger recalculation only on their own confirmed reports or updated personal vitals.
13. ***(13) Nurse Prediction Triggering:*** Direct model inference triggering is restricted to physicians and field health officers. Predictions run automatically upon report confirmation.
14. ***(14) CHO Prediction Triggering:*** Permitted as part of the primary care NCD screening and specialist referral workflow.
15. ***(15) Nurse Clinical Notes:*** Categorized as Nursing Observation / Care Notes. Distinct from Physician Diagnostic Consultations.
16. ***(16) CHO Clinical Notes:*** Categorized as Community Referral / Field Intake Notes.
17. ***(17) Editing Clinical Notes:*** Notes can only be edited by their original author within a 24-hour window from creation. Thereafter, an addendum must be appended.
18. ***(18) Prescription Authority:*** Strictly restricted to licensed Doctors (`role === 'Doctor'`). Nurses, CHOs, and Family members have zero prescription creation rights.
19. ***(19) Prescription Modification:*** Attending doctors can adjust dosage, update instructions, or mark a prescription `DISCONTINUED`.
20. ***(20) Doctor Relationship Acceptance:*** Doctor can accept or decline a patient's connection request, or mark a patient `DISCHARGED`.
21. ***(21) Admin Relationship Intervention:*** System Admin can reassign care teams upon doctor departure or organizational reassignment.
22. ***(22) CHO Population Analytics:*** Strictly scoped to de-identified aggregates for villages within the CHO's assigned catchment area.
23. ***(23) Admin Operational Analytics:*** System-level telemetry (active user counts, API latency, failed background jobs). Zero access to disease prevalence or patient health statistics.
24. ***(24) User Management:*** Admins can create staff accounts, lock/unlock users, and reset credentials. Admins **cannot** alter medical records during user maintenance.
