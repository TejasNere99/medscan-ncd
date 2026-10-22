# MedScan-NCD: Role-by-Role Faculty Demonstration Guide

**Live Faculty Evaluation Runbook & Presentation Guide**  
**Document Revision:** 2.0 — Comprehensive Role-Wise Demonstration Package  
**Synthetic Disclaimer:** `SYNTHETIC — FOR DEMONSTRATION ONLY`

---

## 1. Executive Demonstration Overview

MedScan-NCD is an AI-assisted clinical decision support platform designed to extract, normalize, audit, and evaluate chronic cardiometabolic disease risk from routine laboratory medical reports across four integrated roles:
1. **Patient Workspace**: Report upload, OCR extraction, human-in-the-loop correction, confirmation, four-model risk assessment, and longitudinal report delta comparison.
2. **Doctor Workspace**: Clinical directory, in-clinic patient code claiming, pending consultation request authorization, prescription management, and appointment review.
3. **CHO (Community Health Officer) Workspace**: Population catchment health analytics, triage, overdue follow-ups, and facility referral tracking.
4. **Admin Workspace**: Global user directory, role filtering, account creation/deletion, and platform system configuration.

---

## 2. Prerequisites & Environment Setup

The system operates across three core microservices and a local MongoDB database:

```
[ Frontend: React / Vite ]  (Port 5173)
            │
            ▼ (REST API / JWT)
[ Backend: Node.js / Express ] (Port 5000)
       │                 │
       ▼ (MongoDB)       ▼ (Internal Auth Token)
[ MongoDB Engine ]  [ FastAPI ML Microservice ] (Port 8000)
  (Port 27017)        (4 Serialized ML Models)
```

### 2.1 Starting Services

Open three separate terminal windows:

#### Terminal 1 — Machine Learning Microservice (FastAPI)
```bash
cd ml_model/service
python -m uvicorn app:app --host 0.0.0.0 --port 8000
```
*Verify ready:* Open `http://localhost:8000/health` $\rightarrow$ Reports `{ "status": "ok", "models_loaded": { "diabetes": true, "heart_disease": true, "hypertension": true, "ckd": true } }`.

#### Terminal 2 — Backend API (Node.js / Express)
```bash
cd backend
npm run dev
```
*Verify ready:* Open `http://localhost:5000/api/health` $\rightarrow$ Reports `{ "success": true, "status": "healthy" }`.

#### Terminal 3 — Frontend Web Application (React / Vite)
```bash
cd frontend
npm run dev
```
*Verify ready:* Open `http://localhost:5173` $\rightarrow$ Web login screen loads.

---

## 3. Demo Data Seeding & Safe Reset

### 3.1 Initial Seeding Command
From the `backend/` directory, run:
```bash
npm run seed:faculty-demo
```
This single, idempotent command:
- Registers and verifies all demonstration accounts with password `MedScanDemo!2026`.
- Persists baseline and follow-up lab panels for Patient A.
- Stages a pending report review scenario for Patient A.
- Persists cardiometabolic panel for Patient B and renal panel for Patient C.
- Links doctor-patient relationships and pending consultation requests for the Doctor.
- Seeds village catchment patients, follow-ups (overdue, upcoming, completed), and referrals for the CHO.
- Executes real ML inference across all 4 models so dashboards are ready immediately.

### 3.2 Safe Reset Command
If you want to clear all synthetic records and return to a clean state without affecting real users:
```bash
cd backend
node scripts/seed-faculty-demo.js --reset-demo-only
```

---

## 4. Suggested Presentation Flow (Role by Role)

```
[ Step 1: Patient Workflow ] ➔ [ Step 2: Doctor Workflow ] ➔ [ Step 3: CHO Workflow ] ➔ [ Step 4: Admin Workflow ]
```

---

### STEP 1: PATIENT WORKFLOW (Aarav Sharma — `synthetic.patient.a@example.com`)

**Objective:** Demonstrate report upload, OCR extraction, human-in-the-loop review/correction, confirmation, real four-model risk estimation, and longitudinal report comparison.

1. **Sign In:**
   - Navigate to `http://localhost:5173/login`.
   - In the **Demo Accounts** box, click **"Use Patient demo"**.
   - Click **"Sign In"** $\rightarrow$ Lands on `/patient/dashboard`.
2. **Review Health Overview & Four Uniform Disease Cards:**
   - Point out that all four disease cards (Diabetes, Heart Disease, Hypertension, Chronic Kidney Disease) share a consistent design system.
   - Show that Patient A has lower-risk estimates derived from the confirmed baseline report:
     - Diabetes: `LOWER_MODEL_ESTIMATED_RISK` (~$1.4\%$)
     - Heart Disease: `LOWER_MODEL_ESTIMATED_RISK` (~$2.3\%$)
     - Hypertension: `NEGATIVE_CLASSIFICATION_ESTIMATE` (~$6.5\%$)
     - Chronic Kidney Disease: `NEGATIVE_CLASSIFICATION_ESTIMATE` (~$23.6\%$)
3. **Demonstrate Human-in-the-Loop Review Scenario:**
   - Notice the pending report alert: *"Ambulatory Health Screening Panel (Awaiting Review)"*.
   - Click to open the review screen.
   - Show how the parser accurately extracted Fasting Glucose ($89\text{ mg/dL}$), BP ($118/76\text{ mmHg}$), Total Cholesterol ($162\text{ mg/dL}$), and Creatinine ($0.81\text{ mg/dL}$).
   - **Show Manual Correction:** Click **"Edit"** on Total Cholesterol, adjust value from $162$ to $165\text{ mg/dL}$, and save.
   - Point out that the system preserves the original extracted value ($162$) in the audit trail (`manual_correction` provenance) for medical safety.
   - Click **"Confirm & Save to Health Profile"**.
4. **Demonstrate Longitudinal Report Delta Comparison:**
   - In the navigation, go to **"Reports"** $\rightarrow$ Click **"Compare Reports"**.
   - Select **Report 1 (Baseline: Jan 15, 2026)** and **Report 2 (Follow-up: Jun 20, 2026)**.
   - Show the dynamic deltas calculated from verified database records:
     - Total Cholesterol: $165 \rightarrow 160\text{ mg/dL}$ ($-5\text{ mg/dL}$, Direction: Decrease)
     - Fasting Sugar: $88 \rightarrow 90\text{ mg/dL}$ ($+2\text{ mg/dL}$, Direction: Stable)
     - Blood Pressure: $116/76 \rightarrow 114/74\text{ mmHg}$ ($-2/-2\text{ mmHg}$)
5. **Show Live Upload with Sample File:**
   - Click **"Upload Lab Report"**.
   - Drag and drop `docs/demo/sample-reports/report_elevated_glucose.pdf`.
   - Watch the OCR parser extract values in real time.

---

### STEP 2: DOCTOR WORKFLOW (Dr. Demo Clinician — `doctor@example.com`)

**Objective:** Demonstrate authorized patient access, in-clinic consultation code verification, pending request acceptance, and clinical prescribing.

1. **Sign In:**
   - Log out, or return to `http://localhost:5173/login`.
   - Click **"Use Doctor demo"** $\rightarrow$ Click **"Sign In"** $\rightarrow$ Lands on `/doctor/dashboard`.
2. **Review Pending Consultation Requests:**
   - At the top of the dashboard, highlight the **Pending Consultation Requests** banner.
   - Notice patient **Priya Nair** (`synthetic.patient.d@example.com`) requesting connection.
   - Click **"Accept"** $\rightarrow$ Priya Nair is immediately added to the doctor's authorized clinical directory with an active, auditable relationship.
3. **Demonstrate In-Clinic Consultation Code Claiming:**
   - Click **"Enter Patient Code"** in the top action bar.
   - Explain: When a patient arrives at a physical clinic, they can generate a 6-digit temporary check-in code on their phone.
   - The doctor enters this code to securely connect without exposing passwords or manual record lookups.
4. **Search and Filter Authorized Patients:**
   - Search for *"Rajesh Patel"* in the patient directory search input.
   - Show that Patient B's elevated vitals are highlighted with warning badges (Blood Sugar: $145\text{ mg/dL}$ in rose; BP: $138/86\text{ mmHg}$ in amber).
   - Click the eye icon to view Patient B's full clinical record, reports, and real prediction breakdown.
5. **Demonstrate Prescription Writing:**
   - Click **"New Prescription"**.
   - Select patient **Aarav Sharma**, enter medication: *"Omega-3 Fatty Acids"*, dosage *"1000 mg"*, frequency *"Once daily"*, timing *"Morning"*.
   - Click **"Prescribe"** $\rightarrow$ Instantly synchronizes with the patient's mobile dashboard and medicine reminder schedule.
6. **Review Appointments:**
   - Scroll down to the **Appointments** section.
   - View scheduled upcoming consultation with Aarav Sharma and completed appointment with Rajesh Patel.
   - Demonstrate the **"Complete"** or **"Cancel"** actions.

---

### STEP 3: CHO WORKFLOW (Demo Community Health Officer — `cho@example.com`)

**Objective:** Demonstrate community catchment triage, population screening coverage, overdue follow-up management, and facility referral tracking.

1. **Sign In:**
   - Return to `http://localhost:5173/login`.
   - Click **"Use CHO demo"** $\rightarrow$ Click **"Sign In"** $\rightarrow$ Lands on `/cho/dashboard`.
2. **Review Catchment Overview:**
   - Explain the CHO scope: Coverage extends across three assigned villages (*Demo Community Central, South, and East*).
   - Point out the metrics:
     - **Registered patients:** Total catchment population on file ($5$ seeded patients).
     - **Confirmed report coverage:** Percentage with confirmed laboratory data.
     - **Reports needing review:** Tracks pending reports across the community.
     - **Overdue follow-ups:** Actionable community outreach queue.
3. **Follow-Up Management:**
   - Navigate to **"Care coordination"** $\rightarrow$ **"Follow-up management"** (`/cho/follow-ups`).
   - Notice the overdue follow-up for **Sunita Rao** (*"Renal function re-evaluation"*, due 3 days ago, highlighted in red).
   - Show the upcoming follow-up for **Rajesh Patel** (due in 4 days).
   - Demonstrate actions: Click **"Reschedule"** or **"Mark complete"**.
   - Click **"Schedule follow-up"** to schedule a new visit for any community beneficiary.
4. **Referral Tracking:**
   - Navigate to **"Referral tracking"** (`/cho/referrals`).
   - Show the **PENDING** referral for Sunita Rao to *District Demonstration Hospital - Nephrology Unit*.
   - Show the **ACCEPTED** referral for Priya Nair to *Community Cardiology Clinic*.
   - Demonstrate updating referral status: Click **"Mark accepted"** or **"Mark completed"**.
5. **Population Health & Disease Analytics:**
   - Navigate to **"Population health"** (`/cho/population`) and **"Disease overview"** (`/cho/diseases`).
   - Show the village coverage bar charts, age distribution, and confirmed reports over time.
   - Show the disease risk pie charts summarizing model outputs for Diabetes and Heart Disease across the community.

---

### STEP 4: ADMIN WORKFLOW (Demo Administrator — `admin@example.com`)

**Objective:** Demonstrate global user directory management, role filtering, account creation/deletion, and platform system configuration.

1. **Sign In:**
   - Return to `http://localhost:5173/login`.
   - Click **"Use Admin demo"** $\rightarrow$ Click **"Sign In"** $\rightarrow$ Lands on `/admin/dashboard`.
2. **Global User Management:**
   - Point out the user table populated with actual MongoDB user documents across all 4 roles.
   - Use the **Role Filter** dropdown:
     - Select **"Doctor"** $\rightarrow$ Shows Dr. Demo Clinician.
     - Select **"CHO"** $\rightarrow$ Shows Demo CHO.
     - Select **"Patient"** $\rightarrow$ Shows Aarav Sharma, Rajesh Patel, Sunita Rao, Priya Nair, and Karan Verma.
3. **Platform Configuration & System Settings:**
   - Scroll to **System Configuration & Platform Settings**.
   - Show that platform settings are synchronized directly with MongoDB (`Setting` model):
     - System Title / Platform Name: *"MedScan-NCD Faculty Demonstration"*
     - AI Risk Model Version: *"v1.0-production"*
     - Toggles: *Enable Email Notifications*, *Auto Trigger OCR on Report Upload*.
   - Edit the platform title and click **"Save Configuration"** $\rightarrow$ Toast confirms MongoDB persistence.

---

## 5. Troubleshooting & Error Recovery

| Symptom | Cause | Resolution |
|---|---|---|
| **Login fails: "Invalid email or password"** | Demo accounts have not been seeded | Run `npm run seed:faculty-demo` in the `backend/` directory. |
| **FastAPI connection refused (`ECONNREFUSED 127.0.0.1:8000`)** | ML microservice is not running | Run `python -m uvicorn app:app --host 0.0.0.0 --port 8000` in `ml_model/service/`. |
| **Prediction returns 401 Unauthorized** | `ML_INTERNAL_API_KEY` mismatch between Node and FastAPI | Ensure `backend/.env` has `ML_INTERNAL_API_KEY=test-internal-key-12345`. |
| **MongoDB connection error** | MongoDB daemon is stopped | Start MongoDB locally or start local container on port `27017`. |
| **Disease card shows `INSUFFICIENT_DATA`** | Uploaded report has not been confirmed | Review the extracted values and click **"Confirm & Save to Health Profile"**. |
