# MedScan-NCD: Production Readiness Checklist

This document provides a verified, audit-backed checklist to confirm production deployment readiness before hosting the platform for faculty demonstration.

---

## 1. Security & Authentication Audit

| Checkpoint | Status | Implementation Details | Verified In Codebase |
|---|---|---|---|
| **Role-Based Access Control (RBAC)** | ✅ PASS | Enforced on every API route via JWT middleware (`verifyJWT`) and role check (`authorizeRoles`). | `backend/src/middleware/auth.js` |
| **Direct Object Reference (IDOR) Isolation** | ✅ PASS | Patients can only read/edit own reports; Doctors can only view assigned patients; CHOs scoped to catchment village. | `backend/tests/security_rbac_p0.test.js` |
| **Password Hashing** | ✅ PASS | Passwords salted and hashed with bcrypt (cost factor 10) in Mongoose pre-save hook. | `backend/src/models/User.js` |
| **Email Verification** | ✅ PASS | Crypto random hex tokens with 30-minute expiry; unverified accounts blocked from protected APIs (403). | `backend/src/controllers/authController.js` |
| **Password Reset Recovery** | ✅ PASS | Single-use hashed tokens with 15-minute expiry; immediate token invalidation upon consumption. | `backend/src/controllers/authController.js` |
| **Brute-Force & Rate Limiting** | ✅ PASS | Express rate limiter active on `/api/` (1500 req / 15 min) and `/api/auth/` (30 attempts / 15 min). | `backend/src/middleware/rateLimit.js` |
| **Reverse Proxy Support** | ✅ PASS | `app.set('trust proxy', 1)` enabled for accurate client IP identification on Render and Vercel. | `backend/src/server.js` |
| **Security Headers (Helmet)** | ✅ PASS | Helmet enabled with `crossOriginResourcePolicy: false` to allow controlled media asset delivery. | `backend/src/server.js` |
| **Stack Trace & Host Suppression** | ✅ PASS | In production (`NODE_ENV=production`), server error responses omit stack traces, and `/api/health` withholds MongoDB cluster hostname and DB name. | `backend/src/server.js`, `backend/src/middleware/errorHandler.js` |
| **Internal ML Key Authentication** | ✅ PASS | Backend-to-FastAPI inference calls protected via `X-ML-Internal-Token` header; never exposed to frontend. | `backend/src/services/newDiseasePredictionService.js`, `ml_model/service/app.py` |
| **Demo Credential Isolation** | ✅ PASS | Admin plaintext password excluded from frontend UI and committed docs; delivered privately to Git-ignored `.demo_credentials.local.json`. | `.gitignore`, `backend/scripts/seed-faculty-demo.js` |
| **Frontend Auth Integrity** | ✅ PASS | Demo buttons populate input fields without bypassing backend bcrypt validation; no client-side role forgery possible. | `frontend/src/pages/auth/Login.jsx` |

---

## 2. File Upload & OCR Engine Pipeline

| Checkpoint | Status | Implementation Details |
|---|---|---|
| **Supported File Types** | ✅ PASS | Accepts `.pdf`, `.png`, `.jpg`, `.jpeg`. Rejects unsupported types with 400. |
| **Upload Size Limits** | ✅ PASS | Multer limits uploads to 10MB per file; rejects oversized payloads before disk write. |
| **MIME & Content Validation** | ✅ PASS | Strict MIME type validation in Multer file filter; rejects disguised executables. |
| **Persistent Cloud Storage** | ✅ PASS | Cloudinary integration for cloud environments (`LOCAL_STORAGE_FALLBACK=false`); local uploads for development. Survives container restarts. |
| **OCR Text Extraction** | ✅ PASS | Dual engine: `pdf-parse` for digital PDFs; `tesseract.js` for optical scanned images. |
| **Human-in-the-Loop Review** | ✅ PASS | Extracted biomarkers staged in `PENDING_REVIEW` state; allows manual edits before saving. |
| **Provenance Tracking** | ✅ PASS | Every confirmed vital tracks provenance (`source`: `report` vs `manual_correction`). |
| **Zero-Fabrication Policy** | ✅ PASS | Unreported analytes remain `null`; ML models never fabricate missing biomarkers from context. |

---

## 3. Four-Model ML Inference Verification

| Disease Model | Algorithm | Input Schema | Threshold | Factor Explanations | Verified Status |
|---|---|---|---|---|---|
| **Diabetes** | LightGBM Classifier | 8 cardiometabolic features (age, sex, BMI, BP, totChol, HDL, creatinine) | `0.210` | Real-time TreeSHAP contributions | ✅ Verified (`tests/demo_pipeline_e2e.test.js`) |
| **Heart Disease** | Framingham 10-Yr Logistic Regression | 8 predictors (age, sex, totChol, sysBP, diaBP, BMI, glucose, smoker) | `0.110` | Directional linear factor contributions | ✅ Verified (`tests/heart_disease_integration.test.js`) |
| **Hypertension** | NHANES Current Diagnosis Classifier | 7 predictors (strictly excludes direct blood pressure leakage) | `0.330` | Non-causal factor contributions | ✅ Verified (`tests/new_disease_prediction_service.test.js`) |
| **Chronic Kidney Disease (CKD)** | UCI Minimal Panel Classifier | 2 ordered predictors: Age ($18–120$) + Serum Creatinine ($0.1–30.0\text{ mg/dL}$) | `0.967` | Minimal panel directional factors | ✅ Verified (`tests/new_disease_prediction_service.test.js`) |

---

## 4. Frontend & User Interface Verification

| Feature Area | Status | Verification Details |
|---|---|---|
| **Production Build** | ✅ PASS | `vite build` compiles with zero errors; all 2738 modules bundled into `dist/` in ~14s. |
| **SPA Client Routing** | ✅ PASS | Configured with `vercel.json` and `public/_redirects` (`/* /index.html 200`) to prevent 404s on page refresh. |
| **API URL Normalization** | ✅ PASS | `api.js` automatically sanitizes `VITE_API_URL` to ensure `/api` suffix is present without duplicate slashes. |
| **High-Contrast Design** | ✅ PASS | Clean light editorial theme; dark slate/stone ink text (`#1c1917`); no white-on-white text issues. |
| **Role Dashboards** | ✅ PASS | Verified for Patient (`/patient`), Doctor (`/doctor`), CHO (`/cho`), and Admin (`/admin`). |
| **Demo Login Panel** | ✅ PASS | Optional demo accounts panel toggled via `VITE_ENABLE_DEMO_ACCOUNTS=true`. Excludes Admin button. |
| **Longitudinal Comparison** | ✅ PASS | Displays side-by-side baseline vs follow-up lab tests with directional delta indicators. |
| **CHO 4-Disease Overview** | ✅ PASS | Displays 4 interactive donut charts for Diabetes, Heart Disease, Hypertension, and CKD. |

---

## 5. Free-Tier Operational Constraints & Limitations

| Provider / Tier | Limitation | Operational Impact | Mitigation |
|---|---|---|---|
| **Render Web Services (Free)** | Inactivity sleep after 15 minutes of zero HTTP traffic. | First request after sleep takes 30–60 seconds to boot container. | Wake up endpoints (`/health`) 5 minutes prior to live presentation. |
| **Render Memory (Free)** | 512MB RAM cap per service. | Heavy OCR or concurrent ML inference could trigger OOM if unconstrained. | Individual report uploads are bounded to 10MB; ML inference processes 1 request at a time. |
| **MongoDB Atlas (M0 Free)** | 512MB total storage cap; 100 max concurrent connections. | Sufficient for thousands of demo records; connection pooling needed. | Backend Mongoose configured with pooled connections; synthetic reset script provided. Dedicated database `medscan_ncd_faculty_demo`. |
| **Gmail SMTP (Free)** | 500 emails / day sending quota. | Sufficient for demonstration and testing. | Verification tokens set to 30-min expiry with 60-second resend cooldown. |
| **Cloudinary (Free)** | 25GB storage / 25 credits per month. | Exceeds any demonstration requirements. | Automatic file cleanup for deleted reports. |
