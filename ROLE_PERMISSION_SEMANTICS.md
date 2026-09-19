# MedScan-NCD: Role Permission Semantics & Data Governance
**Document ID:** MEDSCAN-SEC-SEM-001  
**Status:** DEFINITIVE PERMISSION SEMANTICS SPECIFICATION  
**Date:** September 2026  
**Author:** Senior Medical AI & Systems Security Architect  

---

## 1. Deconstruction of Medical Operations: Replacing Generic "WRITE"

In clinical informatics and non-communicable disease (NCD) surveillance, combining operations into a generic `"WRITE"` permission creates critical data-integrity and legal liabilities. MedScan-NCD strictly classifies all operations into eight unambiguous, atomic semantic primitives:

```text
                                MEDICAL OPERATION PRIMITIVES
 ┌─────────────────┬─────────────────────────────────────────────────────────────────────────────┐
 │ Primitive       │ Clinical Informatics Semantic Definition                                    │
 ├─────────────────┼─────────────────────────────────────────────────────────────────────────────┤
 │ 1. READ         │ Retrieve and view authorized clinical or demographic records.               │
 │ 2. CREATE       │ Author a new entity (e.g. upload report, write clinical note, prescribe).   │
 │ 3. EDIT         │ Modify an unconfirmed draft, pending extraction, or active note.            │
 │ 4. CONFIRM      │ Execute irreversible formal validation committing clinical data to profile. │
 │ 5. DELETE       │ Purge or permanently soft-delete an authorized entity.                      │
 │ 6. TRIGGER PRED │ Feed confirmed biomarkers into ML microservice (FastAPI) to run inference.  │
 │ 7. VIEW PRED    │ Inspect calibrated probabilities, risk categories, and contributing factors.│
 │ 8. EXPORT       │ Download raw PDF/JPG documents or export structured longitudinal reports.   │
 └─────────────────┴─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Report Lifecycle State Machine & Transition Authority

MedScan-NCD implements a 6-state finite state machine for medical reports:

```text
                           ┌────────────────────────────┐
                           │      [1] UPLOADED          │
                           └─────────────┬──────────────┘
                                         │ (Async OCR Pipeline Triggered)
                                         ▼
                           ┌────────────────────────────┐
             ┌────────────►│      [2] PROCESSING        │◄────────────┐
             │             └──────┬──────────────┬──────┘             │
             │                    │              │                    │
  (Re-Run OCR│        (OCR Success│              │(Parse Failure /    │(File Corrupt)
   Requested)│          Confidence│              │ Low Confidence)    │
             │             >= 40%)│              │                    │
             │                    ▼              ▼                    │
             │       ┌──────────────────┐  ┌──────────────────┐       │
             │       │[3] PENDING_REVIEW│  │  [5] OCR_FAILED  │───────┘
             │       └────────┬─────────┘  └──────────────────┘
             │                │
             │ (Human Review, │ (Explicit
             │  Biomarker Edit│  Confirmation)
             │  & Correction) │
             │                ▼
             │       ┌──────────────────┐  ┌──────────────────┐
             └───────┤  [4] CONFIRMED   │  │[6] UPLOAD_FAILED │
                     └──────────────────┘  └──────────────────┘
```

### State Transition Authority Matrix

| Transition | From State | To State | Authorized Roles | Trigger & Validation Rule |
| :--- | :--- | :--- | :--- | :--- |
| **`T-01: Ingest`** | *None* | `UPLOADED` | `Patient` *(Own)*,<br>`Doctor` *(Assigned)*,<br>`CHO` *(Catchment)*,<br>`Nurse` *(Assigned)* | File uploaded via multipart form. Size <= 10MB; MIME in [PDF, JPG, PNG, WEBP]. |
| **`T-02: Scan`** | `UPLOADED` | `PROCESSING` | `SYSTEM` *(Worker)* | Tesseract OCR engine spawned. Storage provider upload initiated. |
| **`T-03: Parse OK`** | `PROCESSING` | `PENDING_REVIEW` | `SYSTEM` *(Worker)* | OCR completed with confidence >= 40%; biomarkers detected. |
| **`T-04: Parse Err`**| `PROCESSING` | `OCR_FAILED` | `SYSTEM` *(Worker)* | Unreadable document, blank page, or unrecoverable text degradation. |
| **`T-05: Network Err`**| `UPLOADED` | `UPLOAD_FAILED` | `SYSTEM` *(Worker)* | Cloudinary / local storage write failure. Non-retryable error. |
| **`T-06: Human Edit`**| `PENDING_REVIEW` | `PENDING_REVIEW` | `Patient` *(Own)*,<br>`Doctor` *(Assigned)*,<br>`CHO` *(Catchment)*,<br>`Nurse` *(Assigned)* | Reviewer modifies extracted biomarker value. Logged in `report.corrections`. |
| **`T-07: Commit`** | `PENDING_REVIEW` | `CONFIRMED` | `Patient` *(Own)*,<br>`Doctor` *(Assigned)*,<br>`CHO` *(Catchment)* | Irreversible confirmation. Updates Patient health profile; triggers ML inference. |
| **`T-08: Re-Scan`** | `OCR_FAILED` | `PROCESSING` | `Patient` *(Own)*,<br>`Doctor` *(Assigned)*,<br>`CHO` *(Catchment)* | Re-attempts OCR with image pre-processing adjustments. |
| **`T-09: Purge`** | *Any Unconfirmed*| *Deleted* | `Patient` *(Own)*,<br>`Doctor` *(Assigned)* | Report document and temporary files purged from storage. |

### Lifecycle Rights Breakdown
- **Who can upload a report?** Patient (self), Doctor (assigned patient), CHO (catchment patient), Nurse (assigned patient).
- **Who can edit extracted values?** Reviewer with active clinical assignment or patient ownership during `PENDING_REVIEW`.
- **Who can correct OCR?** Patient, Assigned Doctor, Assigned Nurse, Catchment CHO.
- **Who can confirm a report?** **Patient** (self), **Assigned Doctor**, **Catchment CHO** (on behalf of rural patient). **Nurses and Family are strictly denied confirmation authority.**
- **Who can reopen a confirmed report?** **NO ROLE CAN REOPEN.** Once confirmed, data becomes an immutable legal record. Modifications must follow the **Clinical Amendment Protocol** (Section 3).
- **Who can delete a report?** Patient can delete own reports. Assigned Doctor can delete unconfirmed draft uploads. Confirmed diagnostic reports cannot be deleted by clinicians; only archived or purged upon explicit patient written request.
- **Who can download original report?** Patient (self), Assigned Doctor, Assigned Nurse, Catchment CHO, Consented Family.

---

## 3. Human-in-the-Loop 5-Layer Data Governance

MedScan-NCD strictly separates the OCR extraction layers to maintain auditability and model provenance:

```text
 Layer 1: rawOcrText            [IMMUTABLE]   Pristine, unedited OCR engine text buffer.
 Layer 2: initialExtraction     [IMMUTABLE]   Structured extraction immediately after parser/normalizer.
 Layer 3: extractedData         [TRANSIENT]   Pending working model during human review.
 Layer 4: corrections           [VERSIONED]   Audit trail of human reviewer edits (field, old, new, by).
 Layer 5: confirmedData         [COMMITTED]   Legally validated parameters committed to Patient profile.
```

### Layer Mutability Policy

| Layer | Mutability Policy | Authorized Modifiers | Integrity Enforcement |
| :--- | :--- | :--- | :--- |
| **`rawOcrText`** | **STRICTLY IMMUTABLE** | `SYSTEM` *(Initial Write Only)* | Read-only Mongoose property. Prevents tampering with original forensic evidence. |
| **`initialExtraction`** | **STRICTLY IMMUTABLE** | `SYSTEM` *(Initial Write Only)* | Frozen copy of machine output. Used to benchmark parser accuracy and verify human edits. |
| **`extractedData`** | **EDITABLE IN REVIEW** | `Patient`, `Doctor`, `CHO`, `Nurse` | Working copy updated as reviewer enters corrections prior to confirmation. |
| **`corrections`** | **APPEND-ONLY LOG** | `Patient`, `Doctor`, `CHO`, `Nurse` | Records: `{ field, originalValue, correctedValue, unit, source, correctedBy, timestamp }`. |
| **`confirmedData`** | **COMMITTED / FROZEN** | `Patient`, `Doctor`, `CHO` | Committed only upon state transition to `CONFIRMED`. Never directly mutated thereafter. |

### Post-Confirmation Amendment Protocol
If a lab report is confirmed with an erroneous value (e.g., Fasting Glucose entered as 280 instead of 128):
1. **No Silent Overwrites:** The confirmed record is **never** silently edited in-place.
2. **Clinical Addendum Document:** An authorized clinician or patient must submit a `POST /api/reports/:id/amendment` payload specifying:
   - Target field to amend.
   - New verified clinical value.
   - Clinical justification / lab verification code.
3. **Audit Trail:** The amendment is recorded as a superseding event (`AMENDMENT_LOGGED`).
4. **Model Recalculation:** Decoupled ML prediction services are re-triggered with the amended vector, archiving the previous prediction as `SUPERSEDED`.

---

## 4. Role-by-Role Permission Semantics

### 4.1 Patient (Data Subject & Primary Beneficiary)
- **Profile:** READ and EDIT own profile (Name, Phone, Village, Avatar, Blood Group, Height, Weight). Demographics (Age, Biological Sex) are self-reported and editable, triggering automated recalculation.
- **Reports:** CREATE (Upload), READ (Own), EDIT (Pending OCR), CONFIRM (Own), EXPORT/DOWNLOAD (Own), DELETE (Own).
- **Predictions:** VIEW PREDICTION (Own Diabetes & Heart Disease models), TRIGGER PREDICTION (Own confirmed reports only).
- **Prescriptions & Meds:** READ-ONLY (Cannot prescribe medicines or alter dosages).
- **Appointments:** CREATE (Book consultation), READ (Own appointments), EDIT (Reschedule own), DELETE (Cancel own).
- **Relationships:** CREATE (Invite Doctor / Family), DELETE (Revoke Doctor / Family).
- **Restrictions:** Patient CANNOT view other patients, CANNOT edit clinician notes, CANNOT confirm reports belonging to others.

### 4.2 Doctor (Attending Clinician & Medical Authority)
- **Scope:** Strictly bounded to patients with an `ACTIVE` relationship in `PatientRelationship`.
- **Profile & Demographics:** READ-ONLY for baseline patient identity (Name, DOB, Sex). Cannot arbitrarily alter legal identity.
- **Vitals & Observations:** CREATE and EDIT clinical vitals (`systolicBP`, `diastolicBP`, `heartRate`, `fastingSugar`, `totalCholesterol`).
- **Reports:** READ (Assigned), CREATE/UPLOAD (For assigned patient), EDIT (Pending OCR), CONFIRM (For assigned patient), EXPORT/DOWNLOAD (Assigned). NO DELETE of patient's historical reports (Archive only).
- **Predictions:** VIEW PREDICTION (Full history, calibrated probability, contributing factors), TRIGGER PREDICTION (Manual or post-confirmation).
- **Prescriptions:** CREATE, READ, EDIT, DELETE (Deactivate/Discontinue medication).
- **Clinical Notes:** CREATE, READ, EDIT (Own notes).
- **Appointments:** CREATE, READ, EDIT (Accept, Reschedule, Complete), DELETE (Cancel).
- **Restrictions:** Doctor CANNOT access unassigned patients, CANNOT delete patient accounts, CANNOT access administrative settings.

### 4.3 Nurse (Inpatient / Clinic Care Team Member)
- **Scope:** Bounded to patients actively assigned to their shift or facility ward.
- **Profile & Demographics:** READ-ONLY.
- **Vitals & Observations:** CREATE (Log daily vitals observation: BP, Sugar, Heart Rate). NO direct EDIT of past confirmed vitals (Appends new observation log).
- **Reports:** READ (Assigned patient), CREATE/UPLOAD (Collect lab sample printout and upload), EDIT (Pending OCR corrections under doctor supervision).
- **Report Confirmation:** **NO ACCESS.** Nurses cannot formally confirm diagnostic reports; this authority rests with Attending Doctor or Patient.
- **Predictions:** VIEW PREDICTION (View risk flags to alert doctor). NO direct TRIGGER PREDICTION (Predictions trigger upon doctor confirmation).
- **Prescriptions:** READ-ONLY (Administer doses and record adherence logs). **NO ACCESS to create or edit prescriptions.**
- **Appointments:** READ-ONLY.

### 4.4 Community Health Officer (CHO - Rural / Field Healthcare Officer)
- **Scope:** Bounded to patients residing within the CHO's assigned village catchment area (`patient.village === cho.assignedVillage`).
- **Profile & Demographics:** READ-ONLY for patients in assigned village.
- **Field Reporting:** CREATE/UPLOAD lab reports on behalf of rural patients, EDIT pending OCR text from rural health center printouts, CONFIRM reports with in-person patient consent.
- **Predictions:** VIEW PREDICTION (Screening), TRIGGER PREDICTION (To assess need for specialist referral).
- **Prescriptions:** READ-ONLY. Cannot author prescription medications.
- **Referrals & Appointments:** CREATE Specialist Referral request to nearby secondary/tertiary hospital.
- **Population Analytics:** READ-ONLY epidemiological aggregates (De-identified prevalence %, high-risk counts, compliance trends) for assigned catchment area.
- **Restrictions:** CHO CANNOT access patients outside assigned village, CANNOT prescribe specialized drugs, CANNOT delete patient accounts.

### 4.5 Family Member (Caregiver & Treatment Supporter)
- **Scope:** Strictly consented by patient. Strictly **READ-ONLY**.
- **Demographics:** READ-ONLY (Basic emergency profile: Name, Blood Group, Age, Emergency Phone).
- **Confirmed Vitals:** READ-ONLY summary.
- **Reports:** READ-ONLY (Consented lab reports). EXPORT/DOWNLOAD allowed for printing.
- **Predictions:** READ-ONLY (Risk rating and lifestyle recommendations).
- **Adherence & Meds:** READ-ONLY (Dose schedule, morning/evening timings, adherence score).
- **Emergency Action:** CREATE Emergency Alert notification to attending doctor.
- **Strictly Prohibited:** Family CANNOT view raw OCR, CANNOT view initial machine extraction drafts, CANNOT view reviewer correction metadata, CANNOT edit or confirm reports, CANNOT alter prescriptions.

### 4.6 System Administrator (Infrastructure & Security Custodian)
- **Scope:** Platform-level operations. Strictly **NON-CLINICAL**.
- **User Management:** CREATE (Staff accounts), EDIT (Account status, lock/unlock), DELETE (Deactivate user accounts).
- **Settings & Config:** EDIT (IoT telemetry interval, email SMTP gateways, microservice URLs).
- **Security & Auditing:** READ (AuditLog collection, failed auth attempts, rate-limit triggers).
- **Medical Records Wall:** **NO ACCESS.** Admin tokens cannot view raw diagnostic reports, OCR texts, patient biomarkers, or AI disease probabilities.
- **Break-Glass Emergency Protocol:** If required for technical debugging (e.g., corrupt document repair), access requires explicit time-bound authorization with mandatory cryptographic audit logging.
