# MedScan-NCD: Final Role Relationship & Account Lifecycle Specification
**Document ID:** MEDSCAN-SEC-REL-003  
**Status:** DEFINITIVE RELATIONSHIP SPECIFICATION  
**Date:** September 2026  
**Author:** Senior Medical AI & Systems Security Architect  

---

## 1. Executive Summary & Core Security Principle

MedScan-NCD enforces a strict **Zero-Trust Clinical Scoping Architecture**. No healthcare worker (Doctor, Nurse, CHO) or caregiver (Family) receives platform-wide or unverified access to patient medical records. Access to any protected health information (PHI), diagnostic lab report, biomarker extraction, or ML risk prediction is dynamically evaluated against an unambiguous authorization tuple:

$$\text{Authorization} = \text{Authn} \land \text{Role} \land \text{Relationship}(\text{Requester}, \text{Patient}) \land \text{Status} = \text{ACTIVE} \land \text{Scope}$$

If any predicate in this chain fails, the request is rejected with HTTP `403 Forbidden`. Hiding clinical data in the frontend UI is explicitly rejected as an authorization mechanism.

---

## 2. Doctor ↔ Patient Relationship Lifecycle

```text
               DOCTOR ↔ PATIENT RELATIONSHIP STATE MACHINE

              [Mode A: Patient Requests]      [Mode B: Doctor Invites]
                         │                                │
                         ▼                                ▼
                    ┌──────────────────────────────────────────┐
                    │                 PENDING                  │
                    │   (Token/Request Issued; Zero Access)    │
                    └─────────────────────┬────────────────────┘
                                          │
                        ┌─────────────────┴─────────────────┐
                        │                                   │
              (Mutual Confirmation)                 (Decline / Cancel)
                        │                                   │
                        ▼                                   ▼
          ┌───────────────────────────┐       ┌───────────────────────────┐
          │          ACTIVE           │       │         REJECTED          │
          │   (Full Clinical Scoped   │       │(Permanently Inactive;     │
          │     Access to Patient)    │       │ No Medical Access Ever)   │
          └─────────────┬─────────────┘       └───────────────────────────┘
                        │
                        │ (Patient Revokes / Doctor Discharges)
                        ▼
          ┌───────────────────────────┐
          │          REVOKED          │
          │(Immediate Access Cutoff;  │
          │ Legal Audit Trail Frozen) │
          └───────────────────────────┘
```

### 2.1 State Transition Governance

| State Transition | Triggering Party | Action & Mechanism | Medical Data Access During State |
| :--- | :--- | :--- | :--- |
| **`INITIAL -> PENDING`** | **Patient** *(Mode A)* OR **Doctor** *(Mode B)* | **Mode A:** Patient submits Doctor ID/Registration No.<br>**Mode B:** Doctor issues time-bound 6-digit consultation PIN/QR code. | **ZERO ACCESS.** Doctor cannot view patient history, past reports, vitals, or AI predictions. |
| **`PENDING -> ACTIVE`** | **Doctor** *(Mode A)* OR **Patient** *(Mode B)* | **Mode A:** Doctor reviews patient request card and clicks "Accept Patient".<br>**Mode B:** Patient enters the doctor's 6-digit PIN in dashboard and clicks "Authorize Doctor". | **FULL CLINICAL ACCESS.** Doctor is granted scoped read/write privileges for this specific patient. |
| **`PENDING -> REJECTED`**| **Doctor** *(Mode A)* OR **Patient** *(Mode B)* | Recipient declines the request or the 48-hour activation window expires. | **ZERO ACCESS.** Record is archived with timestamp and reason for rejection. |
| **`ACTIVE -> REVOKED`** | **Patient** OR **Doctor** | **Patient:** Clicks "Revoke Doctor Access" under My Care Team.<br>**Doctor:** Clicks "Discharge / Complete Episode of Care". | **IMMEDIATE ACCESS TERMINATION.** All subsequent queries return `403 Forbidden`. |

### 2.2 Critical Doctor ↔ Patient Policy Decisions

1. **Who initiates the relationship?**
   - Both pathways are formally supported:
     - **Patient-Initiated (Consultation Request):** Patient searches for an affiliated doctor in the directory and sends an electronic care request.
     - **Doctor-Initiated (Clinical Intake):** At a physical clinic or telemedicine desk, the doctor generates an ephemeral 6-digit authorization PIN / QR code that the patient verifies on their device.
2. **Who approves?**
   - The non-initiating party must explicitly confirm. A doctor cannot unilaterally attach a patient without patient consent, and a patient cannot force their record onto a doctor's active patient roster without doctor acceptance.
3. **When does clinical access begin?**
   - Access begins **only and exactly when the relationship status transitions to `ACTIVE`**. The backend middleware validates `status === 'ACTIVE'` before any patient route executes.
4. **What happens when revoked?**
   - The relationship status is marked `REVOKED`, and `revokedAt` is timestamped. The doctor's active patient roster immediately drops the patient. Any attempt by the doctor to query the patient's ID or reports returns `403 Forbidden`.
5. **Can the Doctor access historical reports after revocation?**
   - **NO LIVE DASHBOARD ACCESS.** The doctor cannot browse or query the patient's historical records via the application.
   - **Legal Archival Invariant:** Any prescription, clinical note, or report confirmation digitally signed by the doctor while `ACTIVE` remains permanently stamped with that doctor's ID and timestamp in the historical database for medical-legal provenance.
6. **Can the Doctor access newly uploaded reports after revocation?**
   - **ABSOLUTELY NO.** All future lab reports, vitals entries, and AI risk predictions uploaded or generated after the revocation timestamp are completely inaccessible to the former doctor.
7. **Can a Patient have multiple doctors?**
   - **YES.** Patients with complex multimorbidity (e.g., Type 2 Diabetes managed by an Endocrinologist, and Coronary Heart Disease managed by a Cardiologist) may have concurrent `ACTIVE` relationships with multiple licensed physicians.
8. **Can a Doctor have multiple patients?**
   - **YES.** A practicing physician manages an active panel roster of many patients. Each patient relationship is individually instantiated in the `PatientRelationship` collection.
9. **Can a Patient have a Primary Doctor?**
   - **YES.** The relationship model supports an `isPrimary: Boolean` flag. A patient can designate one attending doctor as their Primary Care Physician (PCP). The PCP receives primary notification pings for high-risk ML predictions and emergency alerts.

---

## 3. Nurse ↔ Patient Relationship Architecture

Nurses provide essential inpatient and outpatient care, bedside vitals collection, and medication administration. However, nurses operate under supervisory delegation.

```text
               NURSE ASSIGNMENT HIERARCHY

               ┌───────────────────────────────┐
               │    Attending Doctor OR        │
               │ Facility Ward Administrator   │
               └───────────────┬───────────────┘
                               │
                               │ Issues Shift / Ward Assignment
                               ▼
               ┌───────────────────────────────┐
               │         NURSE ROSTER          │
               │  (Assigned to Patient/Ward)   │
               │  Status: ACTIVE (Time-Bound)  │
               └───────────────┬───────────────┘
                               │
             ┌─────────────────┴─────────────────┐
             ▼                                   ▼
    [PERMITTED ACTIONS]                 [RESTRICTED ACTIONS]
    • READ Patient Vitals & Meds        • NO Modifying Prescriptions
    • CREATE Vitals Observation Log     • NO Formal Report Confirmation
    • CREATE Report Upload Draft        • NO Unassigned Patient Access
    • VIEW Predictive Risk Alerts       • NO Record Deletion
```

### 3.1 Nurse Governance & Assignment Rules

1. **Who assigns the Nurse?**
   - **Attending Doctor:** Can assign a specific nurse to their active patient.
   - **Facility Administrator:** Can assign a nurse to an entire clinical ward, service department, or daily patient roster.
2. **Can one Nurse have multiple patients?**
   - **YES.** A nurse typically manages a shift roster of 10–30 patients across a hospital ward or clinic department.
3. **Can one Patient have multiple nurses?**
   - **YES.** Patients in hospital wards or outpatient clinics are cared for across day, evening, and night shifts by different nurses.
4. **Can Nurse assignment exist without a Doctor assignment?**
   - **Inpatient / Specialist Care:** Generally secondary to an attending physician.
   - **Primary Health Post / Community Triage:** An outpatient clinic nurse can be assigned to a patient under a Facility Administrator mandate for initial triage and vitals recording before doctor consultation.
5. **What happens when Nurse assignment expires?**
   - Nurse assignments contain an `expiresAt` timestamp (e.g., end of 12-hour shift or discharge). Once expired, relationship status transitions to `EXPIRED`, immediately revoking access to the patient chart.

---

## 4. Community Health Officer (CHO) ↔ Catchment Relationship

The CHO role is tailored for public health surveillance, rural outreach, and frontline NCD screening in designated geographic administrative divisions.

```text
               CHO GEOGRAPHIC CATCHMENT ARCHITECTURE

               ┌───────────────────────────────┐
               │    Health Administration      │
               │     (District Health Dept)    │
               └───────────────┬───────────────┘
                               │
                               │ Provisions CHO Account & Assigns
                               ▼
               ┌───────────────────────────────┐
               │   COMMUNITY HEALTH OFFICER    │
               │  Catchment: ['Kopargaon',     │
               │             'Shingnapur']     │
               └───────────────┬───────────────┘
                               │
             ┌─────────────────┴─────────────────┐
             ▼                                   ▼
    [PATIENT IN CATCHMENT]              [PATIENT OUTSIDE CATCHMENT]
    patient.village ∈ cho.catchment      patient.village ∉ cho.catchment
             │                                   │
             ▼                                   ▼
    • READ Demographics & Reports       • 403 Forbidden
    • CREATE Lab Upload on Behalf       • ZERO ACCESS
    • CONFIRM Report (In-Person Consent)• Strict Geographic Boundary
    • TRIGGER AI Risk Assessment        • No National Data Leaks
    • CREATE Specialist Referral
```

### 4.1 CHO Governance Rules

1. **Catchment Scoping:**
   - Every CHO account is provisioned with an array of authorized villages/wards (`catchmentVillages: ['Village A', 'Village B']`).
   - Authorization rule: `cho.catchmentVillages.includes(patient.village)`.
2. **Can one CHO cover multiple villages?**
   - **YES.** In rural public health infrastructure, a single Sub-Centre or Health and Wellness Centre (HWC) CHO frequently oversees a cluster of 3 to 5 contiguous rural villages.
3. **Can multiple CHOs cover the same village?**
   - **YES.** In densely populated villages or sub-districts, multiple CHOs or auxiliary health workers may share jurisdiction over the same catchment area.
4. **What happens when a patient moves village?**
   - If a patient updates their residential village in their profile (e.g., from `Village A` to `Village C`), the CHO of `Village A` immediately loses individual record access.
   - The CHO of `Village C` gains individual access upon the patient's presentation at the new local Health and Wellness Centre.
5. **Can a CHO have temporary assignment?**
   - **YES.** Health administrations can issue temporary coverage assignments (e.g., covering for a colleague on medical leave) by appending the temporary village to `cho.catchmentVillages` with an expiration timestamp.
6. **Who changes CHO assignment?**
   - Scoping and catchment reassignments can **only be performed by authorized Health Administrators or System Admins**. CHOs cannot expand their own geographic jurisdiction.

---

## 5. Family Member ↔ Patient Relationship Architecture

Family caregiver access is strictly **consent-governed, non-clinical, and read-only**. It exists to empower family members to support treatment adherence and monitor emergency vitals for elderly or dependent patients.

```text
               FAMILY MEMBER INVITATION & ACCESS FLOW

                     [PATIENT DASHBOARD]
                              │
                              ├─► Generates Family Invite
                              │   (Email / Phone + Secure 6-Digit Code)
                              ▼
                     [FAMILY RECIPIENT]
                              │
                              ├─► Registers or Logs In
                              ├─► Enters Invitation Token
                              ▼
                     [RELATIONSHIP: ACTIVE]
                              │
             ┌────────────────┴────────────────┐
             ▼                                 ▼
    [FAMILY PERMITTED VIEW]           [FAMILY STRICTLY FORBIDDEN]
    • Confirmed Vitals Summary        • NO Raw OCR Text
    • Medication Schedule & Adherence • NO Initial Machine Extractions
    • Consented Lab Report PDFs       • NO Reviewer Corrections Log
    • AI Risk Levels (High/Moderate)  • NO Report Editing or Confirmation
    • Emergency Doctor Contacts       • NO Prescription Modifications
```

### 5.1 Family Governance Rules

1. **Who initiates the relationship?**
   - **The Patient.** Family members cannot discover or search for patients. A patient explicitly issues an invitation from their settings.
2. **Can a patient have multiple family members?**
   - **YES.** A patient can authorize multiple caregivers (e.g., spouse, adult child, sibling). Each has an independent grant in `PatientRelationship`.
3. **Can a family member be linked to multiple patients?**
   - **YES.** A caregiver managing care for two elderly parents can link their single family account to both parent profiles, switching between them via an authorized profile selector.
4. **What happens when a patient revokes access?**
   - The patient can click "Revoke Caregiver" at any moment. The relationship transitions immediately to `REVOKED`. The family member's session immediately loses access (`403 Forbidden` on next API poll).
5. **Can a family account accept multiple invitations?**
   - **YES.** Multiple independent patients can consent to share their profiles with the same trusted family member email address.
6. **Historical vs. Future visibility on revocation:**
   - Unlike medical doctors who retain signed audit trails, **Family access is completely terminated**. Revoked family members cannot view historical reports or future uploads.

---

## 6. Account Provisioning & Registration Architecture

To prevent privilege escalation, MedScan-NCD replaces open self-registration with a **Role-Segregated Provisioning Pipeline**:

```text
               ACCOUNT PROVISIONING CHANNELS

   ROLE        PROVISIONING METHOD                    VERIFICATION REQUIREMENT
  ┌───────────┬──────────────────────────────────────┬────────────────────────────────────────┐
  │ Patient   │ Open Public Self-Registration        │ Mobile OTP / Email Verification        │
  │ Family    │ Patient-Consented Invitation Token   │ Token Match with Patient Record        │
  │ Doctor    │ Admin Provisioning / License Verification│ Medical Registration Council ID + Admin│
  │ Nurse     │ Facility / Admin Provisioning        │ Hospital Employee ID + Ward Scoping    │
  │ CHO       │ Health Administration Provisioning   │ District Health ID + Village Catchment │
  │ Admin     │ Root / Controlled CLI Provisioning   │ Hardware MFA + Master Secret Key       │
  └───────────┴──────────────────────────────────────┴────────────────────────────────────────┘
```

### 6.1 Audit of Existing Authentication Implementation

- **Current Implementation State:**
  - In `backend/src/controllers/authController.js:29-73`, the endpoint `POST /api/auth/register` extracts `role` directly from `req.body`:
    ```javascript
    const { name, email, password, role, ... } = req.body;
    ```
  - Any client can register as `role: 'Doctor'`, `role: 'CHO'`, or `role: 'Admin'` with no verification.
- **Target Secure Provisioning Flow (Zero Authentication Breakage):**
  1. **Public Registration (`POST /api/auth/register`):**
     - Allowed roles are strictly clamped to: `['Patient', 'Family']`.
     - If `role === 'Family'`, a valid `inviteToken` is required.
     - If a client requests `role: 'Doctor'`, `'Nurse'`, `'CHO'`, or `'Admin'`, the backend returns `400 Bad Request: "Privileged accounts must be provisioned by a facility administrator."`
  2. **Privileged Staff Provisioning (`POST /api/admin/users/provision`):**
     - Accessible only by authenticated `Admin` tokens.
     - Validates staff credentials:
       - Doctor: `medicalLicenseNumber`, `specialization`, `clinicAddress`.
       - Nurse: `employeeId`, `facilityId`, `assignedWard`.
       - CHO: `districtHealthCode`, `catchmentVillages`.
  3. **Backward Compatibility Guarantee:**
     - The database user schema and JWT signing structure remain 100% identical.
     - Existing seeded test accounts (`doctor@medscan.com`, `patient@medscan.com`, `cho@medscan.com`) continue to authenticate without error.

---

## 7. Relationship Schema Specification (`PatientRelationship`)

To unify all five relationship topologies into a single, high-performance, indexable collection, MedScan-NCD standardizes on the `PatientRelationship` schema:

```javascript
// Proposed Target Model: backend/src/models/PatientRelationship.js
const patientRelationshipSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  relationshipType: {
    type: String,
    enum: ['DOCTOR', 'NURSE', 'CHO', 'FAMILY'],
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACTIVE', 'REJECTED', 'REVOKED', 'EXPIRED'],
    default: 'PENDING',
    required: true,
    index: true
  },
  initiatedBy: {
    type: String,
    enum: ['PATIENT', 'CLINICIAN', 'FACILITY', 'ADMIN'],
    required: true
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  permissions: {
    canViewReports: { type: Boolean, default: true },
    canViewVitals: { type: Boolean, default: true },
    canViewPredictions: { type: Boolean, default: true },
    canViewPrescriptions: { type: Boolean, default: false }
  },
  invitationCode: {
    type: String,
    index: true
  },
  activatedAt: { type: Date },
  revokedAt: { type: Date },
  expiresAt: { type: Date }
}, { timestamps: true });

// Compound Unique Index: One relationship state per user-patient pair
patientRelationshipSchema.index({ patient: 1, relatedUser: 1, relationshipType: 1 }, { unique: true });
```

---

## 8. Summary Checklist of Explicit Decisions

| Item | Architectural Policy Decision |
| :--- | :--- |
| **Doctor Initiation** | Supported via Patient Request or Doctor Consultation PIN. Requires mutual consent to activate. |
| **Doctor Revocation** | Immediate cutoff from patient chart. Signed prescriptions and confirmed lab reports retain historical digital signature. |
| **Multi-Doctor Care** | Supported. Multiple doctors can hold `ACTIVE` status concurrently. One doctor may be designated `Primary`. |
| **Nurse Assignment** | Assigned by Attending Doctor or Facility Administrator. Shift/ward bound. Zero diagnostic confirmation rights. |
| **CHO Scoping** | Strict catchment matching (`patient.village ∈ cho.catchmentVillages`). Individual access permitted only within catchment. |
| **Family Scoping** | Strictly patient-consented. Strictly Read-Only. Never sees raw OCR, machine drafts, or correction metadata. |
| **Account Creation** | Public self-registration restricted to `Patient` and consented `Family`. Staff accounts provisioned via verified admin workflows. |
| **Admin Boundary** | Admins manage platform health and user accounts. Zero access to raw clinical documents or AI predictions. |
