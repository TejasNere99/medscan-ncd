# MEDSCAN-NCD: FACULTY DEMO-DAY EXECUTION GUIDE
**Live Demonstration and Evaluation Runbook**  
**Document Revision:** 1.0 — Faculty Demonstration Package  
**Synthetic Disclaimer:** `SYNTHETIC — FOR DEMONSTRATION ONLY`

---

## 1. Executive Demonstration Summary

MedScan-NCD is an AI-assisted clinical decision support pipeline designed to extract, normalize, confirm, and evaluate cardiometabolic and chronic disease risk profiles from medical laboratory reports.

### The Real End-to-End Pipeline
```
[ Synthetic Laboratory Report (PDF/PNG) ]
                   │
                   ▼
       [ Secure Multer Upload ]
                   │
                   ▼
     [ Text Extraction / Tesseract OCR ]
                   │
                   ▼
  [ Regex & Heuristic Medical Parser ]
                   │
                   ▼
     [ Clinical Unit Normalizer ]
                   │
                   ▼
 [ Human-in-the-Loop Patient Review & Edit ]
                   │
                   ▼
    [ Report Confirmation & Immutability ]
                   │
                   ▼
    [ Persisted Patient Health Profile ]
                   │
                   ▼
  [ Real FastAPI Multi-Model Inference ]
 ┌─────────┬───────────────┬──────────────┬────────────┐
 ▼         ▼               ▼              ▼
Diabetes  Heart Disease   Hypertension   Chronic Kidney Disease (CKD)
 (XGB)     (LogReg)          (GBM)         (LogReg: Age + Creatinine)
                   │
                   ▼
 [ Risk Classification & Calibrated Probability ]
                   │
                   ▼
[ Longitudinal Report Delta Comparison & Doctor/CHO Review ]
```

---

## 2. Environment Setup & Services

The platform operates across three interconnected runtime services and a MongoDB database.

### 2.1 Required Service Ports & Dependencies

| Service | Technology | Port | Directory | Startup Command |
|---|---|---|---|---|
| **Database** | MongoDB | `27017` | Local or Docker | `mongod` or Docker container |
| **ML Microservice** | FastAPI (Python 3.10+) | `8000` | `ml_model/service` | `python -m uvicorn app:app --host 0.0.0.0 --port 8000` |
| **Backend API** | Node.js / Express | `5000` | `backend/` | `npm run dev` |
| **Frontend Web** | React / Vite | `5173` | `frontend/` | `npm run dev` |

### 2.2 Environment Configurations

Ensure the following configuration values are present:

#### `backend/.env`
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/medscan_ncd
JWT_SECRET=demo_super_secret_jwt_key_2026_for_eval
EMAIL_VERIFICATION_REQUIRED=false

# ML Microservice Integration
DIABETES_ML_SERVICE_URL=http://127.0.0.1:8000
HEART_DISEASE_ML_SERVICE_URL=http://127.0.0.1:8000
ML_SERVICE_URL=http://127.0.0.1:8000
ML_INTERNAL_API_KEY=test-internal-key-12345

# Local Upload Fallback (Cloudinary optional for local demo)
UPLOAD_DIR=uploads
```

#### `frontend/.env`
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 3. Fast-Track Demo Initialization (Seed Script)

A safe, idempotent seeding script is provided. It registers all test personas, populates their baseline records, and runs the real ML models so the dashboard is immediately ready for display, while keeping the raw PDF files ready for live upload.

Run the following command from the `backend/` directory:
```bash
npm run seed:faculty-demo
```

### Pre-Seeded Demonstration Accounts
All accounts share the secure demonstration password: `MedScanDemo!2026`

| Persona | Email | Purpose / Role |
|---|---|---|
| **Patient A** | `synthetic.patient.a@example.com` | Baseline normal profile, follow-up comparison |
| **Patient B** | `synthetic.patient.b@example.com` | Elevated fasting glucose, cardiometabolic risk |
| **Patient C** | `synthetic.patient.c@example.com` | Severe renal impairment (CKD model demonstration) |
| **Doctor** | `doctor@example.com` | Clinical review, referral workflows, patient access |
| **CHO** | `cho@example.com` | Community Health Officer follow-up & triage |
| **Admin** | `admin@example.com` | System audits & configuration oversight |

---

## 4. Live Demonstration Scenarios

### SCENARIO 1: Lower-Risk Profile & Pipeline Verification (Patient A)

**Objective:** Walk through the authentic live upload, digital PDF text extraction, human-in-the-loop review, report confirmation, and four-model inference with negative/lower-risk predictions.

1. **Login:**
   - URL: `http://localhost:5173/login`
   - Credentials: `synthetic.patient.a@example.com` / `MedScanDemo!2026`
2. **Navigate to Upload:**
   - Click **"Upload Lab Report"** in the navigation bar.
3. **Select Fixture:**
   - Browse to: `ml_model/demo_fixtures/patient_a_lower_risk/report_1_baseline.pdf`
   - Click **"Upload & Analyze"**.
4. **Inspect OCR & Extraction Screen:**
   - The document parser rapidly extracts:
     - Fasting Blood Glucose: `88 mg/dL`
     - HbA1c: `5.2 %`
     - Total Cholesterol: `165 mg/dL`
     - HDL Cholesterol: `58 mg/dL`
     - Serum Creatinine: `0.8 mg/dL`
     - Blood Urea: `25 mg/dL`
     - Blood Pressure: `116 / 76 mmHg`
     - Heart Rate: `72 bpm`
     - Hemoglobin: `14.0 g/dL`
5. **Human-in-the-Loop Confirmation:**
   - Review each field's confidence status (`HIGH`, `VALIDATED`).
   - Click **"Confirm & Save to Health Profile"**.
6. **Evaluate Dashboard Cards:**
   - The four disease risk cards update via real inference:
     - **Diabetes Risk:** `LOWER_MODEL_ESTIMATED_RISK` (~1.4% probability, threshold 0.210)
     - **Heart Disease Risk:** `LOWER_MODEL_ESTIMATED_RISK` (~2.3% probability, threshold 0.110)
     - **Hypertension Risk:** `NEGATIVE_CLASSIFICATION_ESTIMATE` (~6.5% probability, threshold 0.331)
     - **Chronic Kidney Disease:** `NEGATIVE_CLASSIFICATION_ESTIMATE` (~23.6% probability, threshold 0.967)
7. **Clinical Responsible Phrasing:**
   - Point out the user-facing clinical disclaimer: *"This risk assessment is generated by machine learning models for clinical decision support and screening assistance only. It does not constitute a definitive medical diagnosis."*

---

### SCENARIO 2: Elevated Cardiometabolic Profile & Tesseract OCR (Patient B)

**Objective:** Demonstrate elevated laboratory values, optical character recognition on an image file (`.png`), explainable linear factor contributions, and model risk categorization.

1. **Login:**
   - Credentials: `synthetic.patient.b@example.com` / `MedScanDemo!2026`
2. **Upload High-Resolution Image Report:**
   - Navigate to Upload.
   - Select image fixture: `ml_model/demo_fixtures/patient_b_elevated_glucose/report_elevated_glucose.png`
   - Observe Tesseract OCR extracting values from the optical image scan.
3. **Values Extracted:**
   - Fasting Glucose: `145 mg/dL` (Elevated)
   - HbA1c: `7.2 %` (Diabetic range)
   - Total Cholesterol: `240 mg/dL` (Borderline high)
   - HDL Cholesterol: `36 mg/dL` (Low HDL risk factor)
   - Serum Creatinine: `1.1 mg/dL` (Normal)
   - Blood Pressure: `138 / 86 mmHg` (Pre-hypertension)
   - Smoking Status: `Yes` (Current smoker = 1)
4. **Confirm Report:**
   - Click **"Confirm & Save to Health Profile"**.
5. **Inspect Live Model Responses:**
   - **Diabetes:** `ELEVATED_MODEL_ESTIMATED_RISK` (~29.7% probability vs 0.210 threshold)
   - **Heart Disease:** `ELEVATED_MODEL_ESTIMATED_RISK` (~33.5% probability vs 0.110 threshold)
   - **Hypertension:** `POSITIVE_CLASSIFICATION_ESTIMATE` (~57.0% probability vs 0.331 threshold)
   - **Chronic Kidney Disease:** `NEGATIVE_CLASSIFICATION_ESTIMATE` (~29.3% probability vs 0.967 threshold)
6. **Explainability & Contributing Factors:**
   - Expand the Heart Disease card to view linear factor contributions.
   - Point out non-causal attribution phrasing: *"Age and Total Cholesterol contributed positively toward the estimate."*

---

### SCENARIO 3: Renal Impairment & Strict Minimal Feature Schema (Patient C)

**Objective:** Demonstrate Chronic Kidney Disease (CKD) inference, show how the system strictly adheres to the validated minimal feature schema (`Age` + `Serum Creatinine`), and demonstrate that unmodeled analytes (e.g. `Blood Urea`) are safely stored in the health record without contaminating the model input vector.

1. **Login:**
   - Credentials: `synthetic.patient.c@example.com` / `MedScanDemo!2026`
2. **Upload Renal Lab Report:**
   - Select fixture: `ml_model/demo_fixtures/patient_c_renal/report_renal.pdf`
3. **Values Extracted:**
   - Age: `62`
   - Serum Creatinine: `2.4 mg/dL` (Significantly elevated)
   - Blood Urea: `65 mg/dL` (Significantly elevated)
   - Blood Glucose: `112 mg/dL`
   - Hemoglobin: `10.2 g/dL`
4. **Confirm Report:**
   - Click **"Confirm & Save to Health Profile"**.
5. **Review Model Outputs:**
   - **Chronic Kidney Disease:** `POSITIVE_CLASSIFICATION_ESTIMATE` (Probability = 1.0000 / 100%, threshold 0.967)
6. **Key Technical Highlight for Evaluators:**
   - Show that while `Blood Urea (65 mg/dL)` was accurately parsed, normalized, and displayed in the patient's general health record, **the CKD ML pipeline only fed `[Age: 62, Serum Creatinine: 2.4]`** into the serialized model preprocessor.
   - Explain why: The production-held CKD model artifact (`ml_model/artifacts/kidney_disease/v1/model.joblib`) was trained and validated on a 2-feature minimal input group (achieving 0.9130 ROC-AUC). Silent feature injection is strictly prevented by schema validation.

---

### SCENARIO 4: Longitudinal Report Delta Comparison

**Objective:** Demonstrate comparative intelligence between sequential patient reports, showing numerical deltas, direction of change, and clinical reference ranges.

1. **Context:** Patient A has two sequential reports (`report_1_baseline.pdf` from 2026-01-15 and `report_2_followup.pdf` from 2026-07-20).
2. **Login:**
   - Credentials: `synthetic.patient.a@example.com` / `MedScanDemo!2026`
3. **Upload Follow-up Report:**
   - Upload `ml_model/demo_fixtures/patient_a_lower_risk/report_2_followup.pdf` and confirm it.
4. **Open Report Comparison:**
   - Navigate to **"Reports"** → Click **"Compare Reports"**.
   - Select Baseline (Report 1) and Follow-up (Report 2).
5. **Inspect Dynamic Deltas:**
   - Total Cholesterol: `165 mg/dL` ➔ `178 mg/dL` (`+13 mg/dL`, Direction: Increase)
   - Fasting Glucose: `88 mg/dL` ➔ `94 mg/dL` (`+6 mg/dL`, Direction: Increase)
   - HbA1c: `5.2 %` ➔ `5.4 %` (`+0.2 %`, Direction: Increase)
   - Serum Creatinine: `0.8 mg/dL` ➔ `0.9 mg/dL` (`+0.1 mg/dL`, Direction: Stable/Normal)
   - Blood Pressure: `116/76 mmHg` ➔ `120/78 mmHg` (`+4/+2 mmHg`)
6. **Verification Point:**
   - Deltas are calculated dynamically from verified database records, not hard-coded UI fixtures.

---

### SCENARIO 5: Edge Cases, Error Handling & Security

**Objective:** Demonstrate graceful degradation, input sanitization, human-in-the-loop manual corrections, and missing-feature policies.

#### 5.1 Human-in-the-Loop Value Correction (Audit Provenance)
- Upload `ml_model/demo_fixtures/edge_cases/case_c_correctable_extraction.pdf`.
- Notice the OCR misread or altered field (e.g. Total Cholesterol read as `888 mg/dL`).
- The patient clicks **"Edit"**, corrects the value to `192 mg/dL`, and confirms.
- Verification: The stored measurement marks `source: "manual_correction"` and logs `originalExtractedValue: 888`, providing full regulatory audit traceability.

#### 5.2 Missing Optional Features (Partial Data Completeness)
- Upload `ml_model/demo_fixtures/edge_cases/case_d_missing_optional.pdf`.
- Report contains Core Vitals (Age, Sex, BP, TotChol) but omits optional `BMI`.
- Outcome: Prediction succeeds! The Heart Disease model preprocessor imputes missing optional BMI using demographic median imputation, while flagging `dataCompleteness: "PARTIAL"`.

#### 5.3 Missing Required Feature (`INSUFFICIENT_DATA` Policy)
- Upload `ml_model/demo_fixtures/edge_cases/case_e_missing_required.pdf`.
- Report contains Glucose and HbA1c, but completely lacks Blood Pressure and Total Cholesterol.
- Outcome: The system **never fabricates probabilities**.
- Result: Returns status `INSUFFICIENT_DATA` with a clear message: *"Missing required vitals (Total Cholesterol, Systolic BP). Please upload a lipid panel to calculate cardiovascular risk."*

#### 5.4 Unsupported / Non-Medical File Rejection
- Upload `ml_model/demo_fixtures/edge_cases/case_f_unsupported_document.pdf` (a synthetic office equipment invoice).
- Outcome: Medical parser classifies document as `UNRECOGNIZED_DOCUMENT_TYPE`.
- Zero vitals are extracted or contaminated into the health record. The UI presents an actionable error: *"No clinical laboratory measurements found. Please upload a valid laboratory report."*

---

## 5. Demonstration Troubleshooting Matrix

| Problem | Root Cause | Solution |
|---|---|---|
| **FastAPI connection refused (`ECONNREFUSED 127.0.0.1:8000`)** | ML microservice not running | Run `python -m uvicorn app:app --host 0.0.0.0 --port 8000` in `ml_model/service/` |
| **Prediction returns 401 Unauthorized** | `ML_INTERNAL_API_KEY` mismatch between Node and FastAPI | Check `backend/.env` has `ML_INTERNAL_API_KEY=test-internal-key-12345` |
| **MongoDB connection fails** | MongoDB daemon is stopped | Start MongoDB: `net start MongoDB` or run local docker container on `27017` |
| **"Too many requests from this IP address"** | General rate limiter triggered during rapid testing | The rate limit has been relaxed in development; if encountered, restart backend server |
| **Tesseract OCR not extracting from image** | Tesseract executable not in PATH | Install Tesseract OCR or set `TESSERACT_PATH` in environment |
| **Disease cards show `INSUFFICIENT_DATA`** | Uploaded report has not been confirmed | Navigate to the report review screen and click **"Confirm & Save to Health Profile"** |
| **Cloudinary upload error** | Cloudinary credentials missing in offline mode | The backend automatically falls back to local file storage in `backend/uploads/` |

---

## 6. How to Reset Demo State

To clean up all synthetic demo users and reports without affecting any other database data:
```bash
cd backend
node scripts/seed-faculty-demo.js --reset-demo-only
```
To cleanly re-seed fresh records:
```bash
npm run seed:faculty-demo
```
