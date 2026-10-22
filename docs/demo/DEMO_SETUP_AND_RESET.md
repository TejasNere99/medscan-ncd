# MedScan-NCD: Setup, Seeding, Safe Reset & Troubleshooting Runbook

> **Scope Notice:** This technical runbook provides reproducible instructions for spinning up MedScan-NCD in a local development/demo environment, executing idempotent seeding, safely resetting test data, and diagnosing common environment issues.  
> **`SYNTHETIC — FOR DEMONSTRATION ONLY`**

---

## 1. System Requirements & Port Allocation

| Component | Technology | Default Port | Environment Key | Directory |
|---|---|:---:|---|---|
| **Database** | MongoDB 6.0+ | `27017` | `MONGODB_URI` | System daemon or Docker |
| **ML Inference Service** | FastAPI (Python 3.10+) | `8000` | `PORT` / `ML_SERVICE_URL` | `ml_model/service` |
| **Backend Application API** | Node.js / Express | `5000` | `PORT` | `backend/` |
| **Frontend Web Workspace** | React / Vite | `5173` | `VITE_API_URL` | `frontend/` |

---

## 2. Environment Configuration

### Backend `.env` (`backend/.env`)
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/medscan_ncd
JWT_SECRET=demo_super_secret_jwt_key_2026_for_eval
EMAIL_VERIFICATION_REQUIRED=false

# Machine Learning Microservice Integration
DIABETES_ML_SERVICE_URL=http://127.0.0.1:8000
HEART_DISEASE_ML_SERVICE_URL=http://127.0.0.1:8000
ML_SERVICE_URL=http://127.0.0.1:8000
ML_INTERNAL_API_KEY=test-internal-key-12345

# Local Upload Fallback
UPLOAD_DIR=uploads
```

### Frontend `.env` (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000/api
VITE_ENABLE_DEMO_ACCOUNTS=true
```

---

## 3. Step-by-Step Local Startup

### Step 1: Ensure MongoDB is Active
Verify MongoDB is running locally on port 27017:
```bash
# Windows service check:
sc query MongoDB
# Or via mongosh:
mongosh --eval "db.runCommand({ ping: 1 })"
```

### Step 2: Start the FastAPI Machine Learning Microservice
```bash
cd ml_model/service
python -m uvicorn app:app --host 0.0.0.0 --port 8000
```
*Health Check:* Open `http://localhost:8000/health`. Expected output:
```json
{
  "status": "ok",
  "models_loaded": {
    "diabetes": true,
    "heart_disease": true,
    "hypertension": true,
    "ckd": true
  }
}
```

### Step 3: Start the Express Backend API
In a new terminal:
```bash
cd backend
npm run dev
```
*Health Check:* Open `http://localhost:5000/api/health`. Expected output:
```json
{ "success": true, "status": "healthy" }
```

### Step 4: Start the React Frontend Application
In a third terminal:
```bash
cd frontend
npm run dev
```
*Access:* Navigate to `http://localhost:5173`.

---

## 4. Seeding & Safe Reset Operations

### 4.1 Running the Faculty Demonstration Seed Script
To seed all demonstration accounts, patient profiles, confirmed reports, pending review scenarios, appointments, prescriptions, and real model predictions:
```bash
cd backend
npm run seed:faculty-demo
```

#### Safety Guard Invariant:
The script verifies that `MONGODB_URI` points to a local loopback interface (`127.0.0.1`, `localhost`, or `[::1]`). It will refuse to run on any non-local or remote database unless the environment variable `DEMO_SEED_CONFIRM=true` is explicitly provided.

#### Idempotency:
Running `npm run seed:faculty-demo` multiple times will update existing records in place without duplicating user accounts, reports, or patients.

### 4.2 Safe Demo Reset (Without Affecting Real Users)
If you wish to cleanly purge only the synthetic demonstration data:
```bash
cd backend
node scripts/seed-faculty-demo.js --reset-demo-only
```
This safely removes:
- Users matching demo email patterns (`synthetic.*`, `patient@example.com`, `doctor@example.com`, `cho@example.com`, `admin@example.com`).
- Associated patients, doctor profiles, reports, predictions, relationships, appointments, prescriptions, adherence logs, follow-ups, and referrals.
- Real user accounts and non-demo collections are preserved completely untouched.

---

## 5. Comprehensive Troubleshooting Guide

### 1. Backend Error: `ECONNREFUSED 127.0.0.1:8000`
* **Root Cause:** The FastAPI ML microservice is not running or crashed.
* **Fix:** Open Terminal 1, navigate to `ml_model/service`, and run `python -m uvicorn app:app --host 0.0.0.0 --port 8000`.

### 2. Microservice Error: `401 Unauthorized: Invalid internal API token`
* **Root Cause:** The `ML_INTERNAL_API_KEY` in `backend/.env` does not match the token expected by FastAPI.
* **Fix:** Verify `backend/.env` has `ML_INTERNAL_API_KEY=test-internal-key-12345`. In `ml_model/service/app.py`, the default development fallback is `test-internal-key-12345`.

### 3. Login Error: `Too many requests from this IP address`
* **Root Cause:** General rate limiting triggered by rapid automated testing.
* **Fix:** The rate limiter in `backend/src/middleware/rateLimit.js` has been relaxed for local development. Restart the backend process: `Ctrl+C` then `npm run dev`.

### 4. Tesseract OCR Fails on Image File
* **Root Cause:** Tesseract executable is not installed on the system or not found in the system `PATH`.
* **Fix:** Digital PDF text extraction (`report_1_baseline.pdf`, `report_elevated_glucose.pdf`) uses `pdf-parse` and functions independently of Tesseract. For `.png` optical OCR, install Tesseract OCR or set `TESSERACT_PATH` in `backend/.env`.

### 5. Prediction Card Shows `INSUFFICIENT_DATA`
* **Root Cause:** Expected behavior when a newly uploaded report has not been confirmed, or when an edge case lacks mandatory clinical features (e.g. Blood Pressure or Total Cholesterol).
* **Fix:** If demonstrating report processing, complete the Human-in-the-Loop review and click **"Confirm & Save to Health Profile"** to trigger model recalculation.
