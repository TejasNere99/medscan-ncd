# MedScan-NCD: Synthetic Demonstration Data Catalog

> **Notice:** All data within this catalog is synthetically constructed for software verification and faculty evaluation:  
> **`SYNTHETIC — FOR DEMONSTRATION ONLY`**

---

## 1. Catalog Overview

The MedScan-NCD demonstration dataset consists of **five synthetic patient profiles** and **three clinical/administrative roles**, linked through authentic database relationships, verified report extractions, and live machine learning model predictions.

---

## 2. Patient Profiles & Health Snapshots

### 2.1 Patient A — Lower-Risk Demonstration Profile (Aarav Sharma)
* **Demo Email:** `synthetic.patient.a@example.com` *(or `patient@example.com`)*
* **Demographics:** Age 28, Male, BMI $22.1\text{ kg/m}^2$, Village: *Demo Community Central*
* **Assigned Doctor:** Dr. Demo Clinician (`doctor@example.com`) — Relationship: `ACTIVE` (Primary)
* **Vitals & Laboratory Snapshot:**
  - Blood Pressure: $114 / 74\text{ mmHg}$
  - Fasting Blood Sugar: $90\text{ mg/dL}$
  - HbA1c: $5.2\%$
  - Total Cholesterol: $160\text{ mg/dL}$
  - HDL Cholesterol: $60\text{ mg/dL}$
  - Serum Creatinine: $0.82\text{ mg/dL}$
  - Blood Urea: $22\text{ mg/dL}$
  - Hemoglobin: $14.4\text{ g/dL}$
  - Smoking Status: Non-smoker (`0`)
* **Reports on File:**
  1. `Comprehensive Laboratory Examination Report (Baseline)` — Date: 2026-01-15, Status: `CONFIRMED`
  2. `Comprehensive Laboratory Examination Report (Follow-up)` — Date: 2026-06-20, Status: `CONFIRMED`
  3. `Ambulatory Health Screening Panel (Awaiting Review)` — Date: 2026-10-18, Status: `PENDING_REVIEW` *(Unlocks live patient review & edit demonstration)*
* **Model-Estimated Risk Outputs (Actual Saved Models):**
  - **Diabetes:** $1.39\%$ probability (Threshold: $0.2100$) $\rightarrow$ `LOWER_MODEL_ESTIMATED_RISK`
  - **Heart Disease:** $2.25\%$ probability (Threshold: $0.1100$) $\rightarrow$ `LOWER_MODEL_ESTIMATED_RISK`
  - **Hypertension:** $6.46\%$ probability (Threshold: $0.3307$) $\rightarrow$ `NEGATIVE_CLASSIFICATION_ESTIMATE`
  - **Chronic Kidney Disease (CKD):** $23.64\%$ probability (Threshold: $0.9672$) $\rightarrow$ `NEGATIVE_CLASSIFICATION_ESTIMATE`
* **Prescriptions & Adherence:**
  - `Multivitamin & Zinc Chelate` (1 Tablet, Once daily, morning)
  - 3 recorded doses in `MedicineLog` ($100\%$ adherence rate)
* **Scheduled Appointments:**
  - Annual Preventative Health & Lab Review with Dr. Demo Clinician (Upcoming in 3 days, 10:30 AM)
* **Notifications:**
  - Dose reminder, pending report review prompt, and appointment alert.

---

### 2.2 Patient B — Elevated Glucose / Cardiometabolic Profile (Rajesh Patel)
* **Demo Email:** `synthetic.patient.b@example.com`
* **Demographics:** Age 54, Male, BMI $31.0\text{ kg/m}^2$, Village: *Demo Community South*
* **Assigned Doctor:** Dr. Demo Clinician (`doctor@example.com`) — Relationship: `ACTIVE`
* **Vitals & Laboratory Snapshot:**
  - Blood Pressure: $138 / 86\text{ mmHg}$ (Pre-hypertension)
  - Fasting Blood Sugar: $145\text{ mg/dL}$ (Elevated / Diabetic range)
  - HbA1c: $7.2\%$ (Diabetic range)
  - Total Cholesterol: $240\text{ mg/dL}$ (Elevated)
  - HDL Cholesterol: $36\text{ mg/dL}$ (Low HDL risk factor)
  - Serum Creatinine: $1.10\text{ mg/dL}$
  - Blood Urea: $32\text{ mg/dL}$
  - Hemoglobin: $13.2\text{ g/dL}$
  - Smoking Status: Active Smoker (`1`)
* **Reports on File:**
  - `Comprehensive Metabolic & Lipid Panel` — Date: 2026-10-10, Status: `CONFIRMED`
  - Available as both digital PDF (`report_elevated_glucose.pdf`) and high-resolution optical image scan (`report_elevated_glucose.png`).
* **Model-Estimated Risk Outputs (Actual Saved Models):**
  - **Diabetes:** $29.68\%$ probability (Threshold: $0.2100$) $\rightarrow$ `ELEVATED_MODEL_ESTIMATED_RISK`
  - **Heart Disease:** $33.53\%$ probability (Threshold: $0.1100$) $\rightarrow$ `ELEVATED_MODEL_ESTIMATED_RISK`
  - **Hypertension:** $56.99\%$ probability (Threshold: $0.3307$) $\rightarrow$ `POSITIVE_CLASSIFICATION_ESTIMATE`
  - **Chronic Kidney Disease (CKD):** $29.31\%$ probability (Threshold: $0.9672$) $\rightarrow$ `NEGATIVE_CLASSIFICATION_ESTIMATE`
* **Prescriptions:**
  - `Metformin HCl` ($500\text{ mg}$, Twice daily, with meals)
  - `Atorvastatin Calcium` ($10\text{ mg}$, Once daily, night)
* **Appointments:**
  - Past consultation with Dr. Demo Clinician (Completed 14 days ago)
* **Community Care:**
  - Follow-up with CHO scheduled in 4 days: *"Post-consultation lifestyle and fasting glucose follow-up"*.

---

### 2.3 Patient C — Renal Function / CKD Profile (Sunita Rao)
* **Demo Email:** `synthetic.patient.c@example.com`
* **Demographics:** Age 62, Female, BMI $26.5\text{ kg/m}^2$, Village: *Demo Community East*
* **Assigned Doctor:** Dr. Demo Clinician (`doctor@example.com`) — Relationship: `ACTIVE`
* **Vitals & Laboratory Snapshot:**
  - Blood Pressure: $148 / 92\text{ mmHg}$ (Stage 2 Hypertension)
  - Fasting Blood Sugar: $112\text{ mg/dL}$
  - Total Cholesterol: $195\text{ mg/dL}$
  - HDL Cholesterol: $42\text{ mg/dL}$
  - Serum Creatinine: $2.40\text{ mg/dL}$ (Significantly elevated)
  - Blood Urea: $65\text{ mg/dL}$ (Significantly elevated)
  - Hemoglobin: $10.2\text{ g/dL}$
* **Reports on File:**
  - `Renal Function & Metabolic Panel` — Date: 2026-09-14, Status: `CONFIRMED`
* **Model-Estimated Risk Outputs (Actual Saved Models):**
  - **Chronic Kidney Disease (CKD):** $100.0\%$ probability (Threshold: $0.9672$) $\rightarrow$ `POSITIVE_CLASSIFICATION_ESTIMATE`  
    *(Evaluated strictly on minimal schema: Age $62$ + Serum Creatinine $2.4\text{ mg/dL}$)*
  - **Hypertension:** $89.97\%$ probability (Threshold: $0.3307$) $\rightarrow$ `POSITIVE_CLASSIFICATION_ESTIMATE`
  - **Diabetes:** $40.32\%$ probability (Threshold: $0.2100$) $\rightarrow$ `ELEVATED_MODEL_ESTIMATED_RISK`
  - **Heart Disease:** $24.05\%$ probability (Threshold: $0.1100$) $\rightarrow$ `ELEVATED_MODEL_ESTIMATED_RISK`
* **Community Care Records:**
  - **Referral (Status: PENDING):** Destination: *District Demonstration Hospital - Nephrology Unit*, Reason: *Severe renal impairment (Creatinine 2.4 mg/dL)*.
  - **Follow-up (Status: SCHEDULED - OVERDUE):** Due 3 days ago. Assesses compliance with nephrology referral.

---

### 2.4 Patient D — Clinical Consultation Request Scenario (Priya Nair)
* **Demo Email:** `synthetic.patient.d@example.com`
* **Demographics:** Age 41, Female, BMI $24.8\text{ kg/m}^2$, Village: *Demo Community Central*
* **Doctor Linkage:** Relationship status: **`PENDING`** with Dr. Demo Clinician.
* **Demonstration Purpose:**
  - Directly populates the **"Pending Consultation Requests"** banner on the Doctor Dashboard (`doctor@example.com`), allowing a live demonstration of accepting/declining patient authorization.
* **Community Care:**
  - Referral status: `ACCEPTED` to *Community Cardiology Clinic*.
  - Follow-up status: `COMPLETED` (*"Vitals stable at 122/78 mmHg"*).

---

### 2.5 Patient E — Unscreened Catchment Beneficiary (Karan Verma)
* **Demo Email:** `synthetic.patient.e@example.com`
* **Demographics:** Age 35, Male, BMI $25.2\text{ kg/m}^2$, Village: *Demo Community South*
* **Demonstration Purpose:**
  - Newly registered community member without any uploaded or confirmed reports.
  - Demonstrates the CHO dashboard's **Data Quality** metrics (*"Registered patients with no confirmed report on file"*).

---

## 3. Relational Summary Matrix

| Patient Entity | Assigned Clinician | Relationship Status | Catchment Village | Confirmed Reports | Pending Reports | Scheduled Care |
|---|---|---|---|---|---|---|
| **Aarav Sharma (A)** | Dr. Demo Clinician | `ACTIVE` (Primary) | Demo Community Central | 2 (Baseline & Follow-up)| 1 (Oct 18 Panel) | Upcoming Appointment |
| **Rajesh Patel (B)** | Dr. Demo Clinician | `ACTIVE` (Primary) | Demo Community South | 1 (Metabolic & Lipid) | 0 | CHO Follow-up (4d) |
| **Sunita Rao (C)** | Dr. Demo Clinician | `ACTIVE` (Primary) | Demo Community East | 1 (Renal Panel) | 0 | Overdue Follow-up + Pending Referral |
| **Priya Nair (D)** | Dr. Demo Clinician | `PENDING` (Request) | Demo Community Central | 0 | 0 | Accepted Referral + Completed Follow-up |
| **Karan Verma (E)** | None | Unassigned | Demo Community South | 0 | 0 | None (Unscreened) |
