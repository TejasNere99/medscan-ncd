# MedScan-NCD: Professional Faculty Demonstration Package

> **Notice:** All clinical records, laboratory reports, patient identities, and telemetry data within this demonstration package are completely fictional and generated strictly for evaluation:  
> **`SYNTHETIC — FOR DEMONSTRATION ONLY`**

---

## 1. Directory Overview & Navigation

This directory (`docs/demo/`) contains the complete documentation, technical runbooks, dataset catalogs, and sample laboratory reports required to conduct a live, end-to-end evaluation of **MedScan-NCD** across all four supported application roles:

| Document | Purpose / Contents |
|---|---|
| [DEMO_DAY_GUIDE.md](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/docs/demo/DEMO_DAY_GUIDE.md) | **Step-by-step presentation runbook**: Exact sequence starting with Patient, Doctor, CHO, and Admin workflows, including live upload, OCR, confirmation, and comparison. |
| [DEMO_ACCOUNTS.md](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/docs/demo/DEMO_ACCOUNTS.md) | **Account credentials & role access**: List of all seeded demo accounts, passwords, role assignments, and login instructions. |
| [DEMO_DATA_CATALOG.md](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/docs/demo/DEMO_DATA_CATALOG.md) | **Synthetic personas & clinical data**: Full breakdown of patients, test values, report dates, appointments, prescriptions, follow-ups, and referrals. |
| [DEMO_FEATURE_MATRIX.md](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/docs/demo/DEMO_FEATURE_MATRIX.md) | **Role-by-role feature verification checklist**: Verified functionality by role and authorization boundary. |
| [DEMO_SETUP_AND_RESET.md](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/docs/demo/DEMO_SETUP_AND_RESET.md) | **Environment setup, seeding & safe reset**: Local startup instructions, idempotency guards, and safe reset command. |
| [MODEL_AND_SYNTHETIC_DATA_NOTES.md](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/docs/demo/MODEL_AND_SYNTHETIC_DATA_NOTES.md) | **Audited model provenance & feature schemas**: Verified algorithm families, feature inputs, decision thresholds, and non-diagnostic clinical boundaries. |
| [DEMO_PACKAGE_AUDIT.md](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/docs/demo/DEMO_PACKAGE_AUDIT.md) | **QA verification & test results**: Complete test logs across E2E pipeline, backend integration, ML microservice, and frontend build. |
| [KNOWN_LIMITATIONS.md](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/docs/demo/KNOWN_LIMITATIONS.md) | **Transparent scope boundaries**: Incomplete features, edge cases, and architectural constraints that must not be represented as working. |
| [sample-reports/](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/docs/demo/sample-reports/) | **Organized demo report files**: Printable PDFs and high-resolution optical image scans for live upload demonstration. |

---

## 2. Quick Demonstration Startup

To prepare the platform for evaluation, open three terminal windows and start the local services:

### Terminal 1: Machine Learning Microservice (FastAPI — Port 8000)
```bash
cd ml_model/service
python -m uvicorn app:app --host 0.0.0.0 --port 8000
```

### Terminal 2: Backend Application API (Node.js/Express — Port 5000)
```bash
cd backend
npm run dev
```

### Terminal 3: Frontend Web Workspace (React/Vite — Port 5173)
```bash
cd frontend
npm run dev
```

### Seed or Reset Demo Dataset (Safe & Idempotent)
From the `backend/` directory:
```bash
# Seed all 4 canonical roles + community cohorts + real ML inferences
npm run seed:faculty-demo

# To safely remove only synthetic demo records at any time:
node scripts/seed-faculty-demo.js --reset-demo-only
```

---

## 3. Supported Roles & Demo Accounts

All demo accounts use the standard demonstration password: **`MedScanDemo!2026`**

| Role | Demo Email | Persona / Focus Area |
|---|---|---|
| **Patient Demo** | `synthetic.patient.a@example.com` *(or `patient@example.com`)* | Aarav Sharma — Lower-risk profile, sequential reports (baseline & follow-up), pending review report, active prescriptions, appointments. |
| **Doctor Demo** | `doctor@example.com` | Dr. Demo Clinician — Authorized patient directory, pending consultation requests, upcoming appointments, and prescriptions. |
| **CHO Demo** | `cho@example.com` | Demo Community Health Officer — Catchment coverage across 3 villages, population screening analytics, scheduled follow-ups, and facility referrals. |
| **Admin Demo** | `admin@example.com` | Demo Administrator — Global user management directory, role filtering, platform settings, and MongoDB synchronization. |

---

## 4. Live Demonstration Pipeline

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
(LightGBM) (LogReg L2)     (HistGBM)      (Random Forest)
                   │
                   ▼
 [ Risk Classification & Calibrated Probability ]
                   │
                   ▼
[ Longitudinal Report Delta Comparison & Doctor/CHO Review ]
```
