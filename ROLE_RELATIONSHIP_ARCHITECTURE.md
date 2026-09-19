# MedScan-NCD: Role Relationship Architecture
**Document ID:** MEDSCAN-SEC-ARCH-001  
**Status:** TARGET ARCHITECTURAL BLUEPRINT  
**Date:** September 2026  

---

## 1. Architectural Philosophy: The Non-Monolithic Patient Graph

The core principle governing MedScan-NCD access control is:

> **"A clinician or health officer never accesses 'all patients'. Every healthcare worker accesses only those patients with whom they have an active, verified, and auditable clinical relationship."**

### Master Architectural Hierarchy Diagram

```text
                               ┌─────────────────────────┐
                               │       SYSTEM ADMIN      │
                               │   (Platform Operations, │
                               │  Identity & Audit Only) │
                               └────────────┬────────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
                    ▼                       ▼                       ▼
         ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
         │       DOCTOR        │ │         CHO         │ │        NURSE        │
         │ (Lead Practitioner)│ │(Community Health Off)│ │ (Assigned Care Team)│
         └──────────┬──────────┘ └──────────┬──────────┘ └──────────┬──────────┘
                    │                       │                       │
           Clinical │              Assigned │              Facility │
       Relationship │             Catchment │            Assignment │
         (Accepted) │                (Area) │            (Assigned) │
                    │                       │                       │
                    └───────────────────► ┌─┴─┐ ◄───────────────────┘
                                          │ P │
                                          │ A │
                                          │ T │
                                          │ I │
                                          │ E │
                                          │ N │
                                          │ T │
                                          └─┬─┘
                                            │
                        ┌───────────────────┴───────────────────┐
                        │                                       │
                        ▼                                       ▼
             ┌─────────────────────┐                 ┌─────────────────────┐
             │    FAMILY MEMBER    │                 │   CLINICAL VAULT    │
             │ (Explicit Consented │                 │ (Reports, Biomarkers│
             │   Caregiver View)   │                 │     & Vitals)       │
             └─────────────────────┘                 └──────────┬──────────┘
                                                                │
                                                    ┌───────────┴───────────┐
                                                    ▼                       ▼
                                         ┌─────────────────────┐ ┌─────────────────────┐
                                         │   DIABETES MODEL    │ │ HEART DISEASE MODEL │
                                         │ (Scenario A Engine) │ │(Framingham 10-Yr CHD│
                                         └─────────────────────┘ └─────────────────────┘
```

---

## 2. Doctor ↔ Patient Relationship Lifecycle

A doctor does not possess universal visibility. Relationships are modeled as a dedicated entity (`DoctorPatientRelationship`) with an explicit state machine.

### State Transition Diagram

```text
  [Patient Initiates / Doctor Invites]
                   │
                   ▼
              ┌─────────┐
              │ PENDING │
              └────┬────┘
                   │
         ┌─────────┴─────────┐
         │ (Mutual Consent)  │ (Refusal)
         ▼                   ▼
   ┌──────────┐        ┌──────────┐
   │  ACTIVE  │        │ REJECTED │ ──► [No Access Granted]
   └─────┬────┘        └──────────┘
         │
         │ (Patient Revokes / Doctor Discharges)
         ▼
   ┌───────────┐
   │  REVOKED  │ ──► [Access Cut Off; Historical Audit Preserved]
   └───────────┘
```

### Detailed Lifecycle Stages

1. **Initiation (Two Supported Modes):**
   - **Mode A (Patient-Initiated):** Patient searches verified doctors by name or license in their region and submits a `ConnectionRequest`.
   - **Mode B (Clinical Onboarding / Appointment):** Doctor invites patient via verified email/phone code or in-person consultation referral.
   - **Initial State:** `PENDING`. No clinical data, reports, or prediction histories are revealed to the doctor during `PENDING`.
2. **Approval & Activation:**
   - For Mode A, the Doctor reviews and accepts the request.
   - For Mode B, the Patient enters confirmation code in their dashboard or clicks "Approve Doctor".
   - **Active State:** `ACTIVE`.
   - **Visibility Granted:** Full READ/WRITE for diagnostic reports, biomarker extractions, prescriptions, and ML predictions.
3. **Rejection:**
   - Either party may reject a pending request.
   - State transitions to `REJECTED`. The request is archived in audit logs; no record access is ever granted.
4. **Revocation & Discharge:**
   - **Patient Disconnect:** A patient can click "Revoke Doctor Access" at any time from their Settings.
   - **Doctor Discharge:** A clinician can mark the treatment episode "Discharged".
   - **Post-Revocation Policy:**
     - **Immediate Cutoff:** Doctor can no longer access the patient profile or receive future reports (`403 Forbidden`).
     - **Audit Preservation:** Any prescriptions previously signed or reports confirmed by that doctor retain their clinical digital signature and immutable timestamp for medical-legal compliance.

---

## 3. Nurse ↔ Patient Relationship Architecture

Nurses provide direct bedside vitals verification, medication administration, and monitoring. Their access is derived from **facility or physician supervision**.

### Relationship Model
```text
  Doctor / Clinical Facility
             │
             ├─► Assigns Nurse A to Patient Roster
             │
             ▼
      Nurse A ──► [Scoped Access: Assigned Patients Only]
```

### Governance Rules
1. **Assignment Authority:** Nurses are assigned to a patient by:
   - The patient's primary `ACTIVE` Doctor, OR
   - The Health Facility Administrator where the patient is admitted.
2. **Access Scope:**
   - **READ:** Demographics, vitals, active prescriptions, medicine logs, confirmed diagnostic reports.
   - **WRITE:** Vitals logging (`systolicBP`, `diastolicBP`, `heartRate`, `fastingSugar`), medication intake verification, pending OCR values.
   - **NO ACCESS:** Modifying physician prescriptions, discharging patients, or accessing patients outside their active ward/assignment.

---

## 4. Community Health Officer (CHO) Architecture

Community Health Officers serve rural and semi-urban populations. Their access must balance **individual patient follow-up** with **epidemiological population surveillance**.

### Two-Tier CHO Access Model

```text
                           COMMUNITY HEALTH OFFICER
                                      │
                   ┌──────────────────┴──────────────────┐
                   ▼                                     ▼
        TIER 1: INDIVIDUAL ACCESS             TIER 2: POPULATION ANALYTICS
        (Assigned Village Only)                  (De-Identified Aggregates)
                   │                                     │
         ┌─────────┴─────────┐                           ▼
         │ Patient in Village│                 Village-level summaries:
         │   (e.g. Kopargaon)│                 • Prevalence %
         └───────────────────┘                 • High-Risk Counts
                                               • Mean Adherence Rate
```

### Governance Rules
1. **Geographic Scoping (Catchment Area):**
   - Every CHO is assigned one or more specific villages (`assignedVillages: ['Green Valley', 'Riverdale']`).
   - A CHO querying a patient whose `village` does not match their assigned catchment receives `403 Forbidden`.
2. **Field Care Capabilities:**
   - **Can:** Upload paper diagnostic reports on behalf of rural patients with limited smartphone literacy.
   - **Can:** Verify and correct OCR readings from district lab printouts.
   - **Can:** Review AI diabetes and heart disease risk assessments to facilitate specialist referrals.
   - **Cannot:** Access patients in neighboring health administrative districts.
3. **Population Analytics:**
   - Can view aggregate prevalence breakdowns (Diabetes %, Hypertension %, Heart Disease %) for their catchment area.
   - Under no circumstances does epidemiological reporting leak individual patient identifiable records.

---

## 5. Family Member ↔ Patient Relationship Architecture

Family caregiver access is strictly **consent-driven, scoped, and read-only**.

### Relationship Lifecycle

```text
  Patient Generates Invite Code
              │
              ▼
  Family Member Enters Code & Registers
              │
              ▼
    Relationship: ACTIVE
    (Mask: READ-ONLY, Scoped)
              │
  Patient Clicks "Revoke"
              │
              ▼
    Relationship: REVOKED (Immediate 403)
```

### Governance Rules
1. **Consent-Grounded Invitation:**
   - Family accounts cannot discover or query patients unilaterally.
   - The patient explicitly triggers an invitation from their dashboard, specifying the family member's email or phone number.
2. **Read-Only Scoping:**
   - Family members can view:
     - Adherence logs and scheduled medicine reminders.
     - Confirmed vital sign summaries.
     - Emergency doctor contact numbers.
   - Family members **CANNOT**:
     - Edit biomarker values.
     - Confirm lab reports.
     - Change physician prescriptions.
     - View unconfirmed or pending OCR drafts.
3. **Revocation:**
   - Patient retains sovereign revocation authority.
   - Revocation terminates session access immediately.

---

## 6. System Administrator: Separation of Operational vs. Clinical Access

MedScan-NCD enforces strict separation of administrative privileges from medical records.

### Separation of Duties Principle

```text
  SYSTEM ADMINISTRATOR
     ├── [PERMITTED] User lifecycle (Provision, Suspend, Verify Credentials)
     ├── [PERMITTED] Role management & facility configurations
     ├── [PERMITTED] Microservice endpoint monitoring & audit logs
     ├── [PERMITTED] Database health & backup maintenance
     │
     ├── [STRICTLY FORBIDDEN] Viewing raw medical lab reports (PDF/JPG)
     ├── [STRICTLY FORBIDDEN] Reading patient OCR texts or biomarkers
     ├── [STRICTLY FORBIDDEN] Viewing individual AI disease probabilities
     └── [STRICTLY FORBIDDEN] Modifying clinical vitals or prescriptions
```

### Justification
Hospital and platform IT administrators do not possess clinical licensure or patient therapeutic privilege. Providing administrators with direct access to raw medical reports violates medical confidentiality frameworks (HIPAA Security Rule, GDPR Article 9).
