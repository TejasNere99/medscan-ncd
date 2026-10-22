# MedScan-NCD: Production Deployment & Faculty Demo Hosting Guide

> **Target Audience:** Presenters, DevOps engineers, and students deploying MedScan-NCD for public faculty evaluation and live clinical workflow demonstrations.  
> **Notice:** All demonstration profiles, medical lab reports, and predictions use synthetic data. `SYNTHETIC — FOR DEMONSTRATION ONLY`.

---

## Architecture Overview

MedScan-NCD is architected as three decoupled micro-services and two managed cloud dependencies:

```
┌─────────────────────────────────┐
│       React / Vite Frontend     │  Hosted on: Vercel / Netlify
│   (Single-Page App + Tailwind)  │  SPA rewrite: /* -> /index.html
└────────────────┬────────────────┘
                 │ HTTPS REST API requests (with JWT Authorization)
                 ▼
┌─────────────────────────────────┐
│     Node.js / Express Backend   │  Hosted on: Render Web Service (Node 20)
│   (Authentication, RBAC, OCR)   │  Port: 5000 / Dynamic ($PORT)
└────────┬──────────────┬─────────┘
         │              │
         │ Internal     │ Mongoose (TLS 1.2+)
         │ HTTPS / Key  │
         ▼              ▼
┌─────────────────┐  ┌────────────────────────────────────┐
│ FastAPI ML Svc  │  │   MongoDB Atlas (Managed Database) │
│ (4 ML Models)   │  │ Dedicated: medscan_ncd_faculty_demo│
│ Hosted: Render  │  └────────────────────────────────────┘
└─────────────────┘
         │
         │ Uploaded PDF/PNG reports
         ▼
┌─────────────────────────────────┐
│ Cloudinary (Document Storage)   │  Persistent object storage for medical documents
└─────────────────────────────────┘
```

---

## Hosted Demonstration vs. Real Clinical Production

| Architecture Dimension | Hosted Faculty Demonstration | Real Clinical Production Deployment |
|---|---|---|
| **Demo Access** | One-click convenience buttons for Patient, Doctor, and CHO on `/login` (`VITE_ENABLE_DEMO_ACCOUNTS=true`). | Demo convenience disabled globally (`VITE_ENABLE_DEMO_ACCOUNTS=false`). Strict registration & identity verification only. |
| **Admin Login** | Private credentials delivered securely via Git-ignored `.demo_credentials.local.json`. No public button in the UI. | Enterprise SSO, hardware security keys (FIDO2/WebAuthn), or multi-factor authentication (MFA). |
| **Patient Data** | 100% synthetic laboratory documents and demographic profiles. | Real clinical electronic health records (EHR) subject to HIPAA, GDPR, and regional health data laws. |
| **Document Storage** | Cloudinary free tier for persistent demo documents across container restarts. | Encrypted private object storage (e.g., AWS S3 with KMS encryption) accessible only via short-lived pre-signed URLs. |
| **Database** | MongoDB Atlas M0 (Free Tier) with dedicated database `medscan_ncd_faculty_demo`. | High-availability replica set (M10+) with dedicated VPC peering, encrypted storage at rest, and automated point-in-time backups. |
| **Container Hosting** | Render Free Tier (subject to 15-minute idle spin-down; pre-warmed before presentation). | Autoscaling container clusters (AWS ECS, Google Cloud Run, or Render Paid) with 99.99% SLA and zero cold starts. |

---

## 1. Prerequisites & Required Free Cloud Accounts

Before beginning, prepare free-tier accounts on the following platforms:

1. **MongoDB Atlas** ([mongodb.com/atlas](https://www.mongodb.com/atlas)) — Managed cloud MongoDB database (M0 Free Tier).
2. **Render** ([render.com](https://render.com)) — Free tier supports both Node.js Express backend and Python FastAPI ML service.
3. **Vercel** ([vercel.com](https://vercel.com)) — Free static frontend hosting with global CDN, automatic SSL, and client-side SPA routing.
4. **Cloudinary** ([cloudinary.com](https://cloudinary.com)) — Free tier provides 25GB cloud storage for uploaded medical lab reports so files persist across container restarts.
5. **Google / Gmail Account** — Standard Gmail account with a 16-character **App Password** for live email verification and password-reset messages.

---

## 2. Step 1: Provision the Managed Database (MongoDB Atlas)

### A. Create Cluster & Database
1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/).
2. Click **Create Deployment** → Select **M0 (Free)** → Choose AWS or GCP in your nearest region.
3. Name your cluster (e.g., `medscan-faculty-demo`) and click **Create**.
4. The dedicated database name must be: `medscan_ncd_faculty_demo`.

### B. Configure Least-Privilege Database User
1. Go to **Security** → **Database Access** → Click **Add New Database User**.
2. Authentication Method: **Password**.
3. Username: `medscan_app_user`.
4. Password: Generate a strong 24+ character password (e.g. `openssl rand -base64 24` or PowerShell generator). Save this password.
5. Database User Privileges: Select **Built-in Role** → **Read and write to any database** (or create a custom role restricted specifically to `medscan_ncd_faculty_demo`).

### C. Configure Network Access & Security Trade-Off
1. Go to **Security** → **Network Access** → Click **Add IP Address**.
2. Select **Allow Access from Anywhere** (`0.0.0.0/0`) with description `Render Dynamic Outbound IPs`.
3. **Why is `0.0.0.0/0` required on Render Free Tier?**  
   Free-tier containers on Render and serverless platforms like Vercel do not have static outbound IP addresses; their egress traffic routes through dynamic IP pools across AWS/GCP regions.
4. **How the database is secured despite broad IP access:**
   - **Strong Credentials:** The connection requires SCRAM-SHA-256 authentication with your long, random password.
   - **Encrypted in Transit:** All traffic enforces TLS 1.2+ encryption using the `mongodb+srv://` connection protocol.
   - **Database Isolation:** The application is isolated to `medscan_ncd_faculty_demo`. The seed script has built-in guards that reject any database containing `prod`, `production`, or `live`.

### D. Obtain Connection String
1. Go to **Database** → Click **Connect** → Choose **Drivers** (Node.js).
2. Copy the connection string format:
   ```
   mongodb+srv://medscan_app_user:<password>@cluster0.abcde.mongodb.net/medscan_ncd_faculty_demo?retryWrites=true&w=majority
   ```
3. Replace `<password>` with your database user password and ensure the database name at the end is `medscan_ncd_faculty_demo`.

---

## 3. Step 2: Deploy the Python ML Microservice (FastAPI)

> [!TIP]
> **Optional 1-Click Render Blueprint:** The repository includes a pre-configured [`render.yaml`](file:///render.yaml). In Render, you can click **New +** → **Blueprint**, select your repository, and Render will automatically provision both the Python ML Service and Node.js Express backend with all correct build commands, start commands, root directories, and service links. Alternatively, follow the manual steps below for full granular control.

The FastAPI microservice serves real inference across all four models (**Diabetes**, **Heart Disease**, **Hypertension**, and **Chronic Kidney Disease**).

### A. Deploy to Render (Manual Web Service)
1. Log in to [Render Dashboard](https://dashboard.render.com/) → Click **New +** → **Web Service**.
2. Connect your MedScan-NCD GitHub repository.
3. Configure Service Settings:
   - **Name:** `medscan-ml-service`
   - **Region:** Same region as your Atlas database (e.g., Oregon or Frankfurt).
   - **Branch:** `main` (or your active repository branch).
   - **Root Directory:** `ml_model`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r service/requirements.txt`
   - **Start Command:** `cd service && uvicorn app:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Free`

### B. Environment Variables for ML Service
Under **Environment Variables**, add:
- `ML_INTERNAL_API_KEY`: Generate a secure 32-character key.
  - **PowerShell:** `[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(24))`
  - **Bash:** `openssl rand -base64 32`
  *(Note: Save this key; the Express backend must use the exact same key).*
- `LOG_LEVEL`: `INFO`

### C. Verify ML Deployment
1. Click **Create Web Service**. Wait 2–3 minutes for the build to finish.
2. Note your deployed URL: `https://medscan-ml-service.onrender.com`.
3. Test the health endpoint:
   - **PowerShell:**
     ```powershell
     Invoke-RestMethod -Uri "https://medscan-ml-service.onrender.com/health" | ConvertTo-Json -Depth 4
     ```
   - **Bash:**
     ```bash
     curl -s https://medscan-ml-service.onrender.com/health | jq .
     ```
4. Expected Response:
   ```json
   {
     "status": "healthy",
     "service": "medscan-ncd-ml-service",
     "modelVersion": "1.0.0",
     "artifactLoaded": true,
     "diabetes": { "modelLoaded": true },
     "heartDisease": { "modelLoaded": true },
     "hypertension": { "modelLoaded": true },
     "kidneyDisease": { "modelLoaded": true }
   }
   ```

> [!NOTE]
> **API Route Architecture:** The ML microservice exposes `/predict/diabetes`, `/predict/heart_disease`, `/predict/hypertension`, and `/predict/ckd`. There is no root `/predict` endpoint. Always configure the base service URL (e.g. `https://medscan-ml-service.onrender.com`).

---

## 4. Step 3: Deploy the Node.js / Express Backend

### A. Persistent Document Storage (Cloudinary)
On Render free tier, container filesystems are ephemeral. Any uploaded reports stored in local disk (`/uploads`) are deleted when the container sleeps or redeploys!
To ensure uploaded reports persist across redeployments:
1. Create a free account at [Cloudinary](https://cloudinary.com/).
2. On your Cloudinary Dashboard, copy:
   - **Cloud Name** (e.g. `dxy9abcd`)
   - **API Key** (e.g. `123456789012345`)
   - **API Secret** (e.g. `abcdefghijklmnopqrstuvwx`)

### B. Deploy Backend to Render
1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect your MedScan-NCD repository.
3. Configure Service Settings:
   - **Name:** `medscan-backend-api`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`

### C. Backend Environment Variables
Configure the following in Render **Environment**:

| Variable | Description | Example / Recommended Value |
|---|---|---|
| `NODE_ENV` | Runtime mode | `production` |
| `PORT` | Listening port (Render provides `$PORT`) | `5000` |
| `MONGODB_URI` | Atlas URI pointing to dedicated demo DB | `mongodb+srv://medscan_app_user:<pass>@cluster0.abcde.mongodb.net/medscan_ncd_faculty_demo?retryWrites=true&w=majority` |
| `JWT_ACCESS_SECRET` | 64-character random hex string | Generate via PowerShell or `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | 64-character random hex string | Generate via PowerShell or `openssl rand -hex 32` |
| `JWT_ACCESS_EXPIRE` | Access token lifespan | `1d` |
| `JWT_REFRESH_EXPIRE` | Refresh token lifespan | `7d` |
| `CLIENT_URL` | Frontend domain for CORS | `https://medscan-ncd.vercel.app` (or temporary `http://localhost:5173`) |
| `FRONTEND_URL` | Base URL for email verification links | Same as `CLIENT_URL` |
| `ML_SERVICE_URL` | Base URL to Render ML microservice | `https://medscan-ml-service.onrender.com` |
| `DIABETES_ML_SERVICE_URL` | Base URL to Render ML microservice | `https://medscan-ml-service.onrender.com` |
| `ML_INTERNAL_API_KEY` | Exact key set on the Python service | `<exact-same-key-from-step-2>` |
| `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard | `<your-cloud-name>` |
| `CLOUDINARY_API_KEY` | From Cloudinary dashboard | `<your-api-key>` |
| `CLOUDINARY_API_SECRET` | From Cloudinary dashboard | `<your-api-secret>` |
| `LOCAL_STORAGE_FALLBACK` | Block ephemeral local disk in cloud | `false` |
| `EMAIL_HOST` | SMTP Server | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP Port | `587` |
| `EMAIL_SECURE` | TLS mode for port 587 | `false` |
| `EMAIL_USER` | Your Gmail address | `your-email@gmail.com` |
| `EMAIL_PASS` | 16-character Google App Password | `abcd efgh ijkl mnop` |
| `EMAIL_FROM` | Sender email address | `noreply@medscan.yourdomain.com` |
| `DEMO_USER_PASSWORD` | Password for demo users | `MedScanDemo!2026` |
| `ADMIN_DEMO_PASSWORD` | Custom Admin password (optional) | Leave unset to let seed script generate unique private password |

4. Click **Create Web Service**. Wait for build and deployment.
5. Verify health: visit `https://medscan-backend-api.onrender.com/health`.
   - Response: `{"status":"OK","uptime":...}`

---

## 5. Step 4: Deploy the React / Vite Frontend

### A. Deploy to Vercel
1. Log in to [Vercel](https://vercel.com/).
2. Click **Add New...** → **Project** → Import your MedScan-NCD repository.
3. Configure Project Settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click Edit → Select `frontend`.
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### B. Frontend Environment Variables
Add the following in Vercel **Environment Variables**:
- `VITE_API_URL`: Your deployed backend URL (e.g. `https://medscan-backend-api.onrender.com/api`).
  *(Note: The frontend automatically normalizes the URL so trailing `/api` is handled properly).*
- `VITE_ENABLE_DEMO_ACCOUNTS`: `true`
  *(Note: This displays the demo cards for Patient, Doctor, and CHO on `/login`. Admin shortcut is deliberately omitted from the UI for security).*

4. Click **Deploy**. Vercel will build the SPA and assign a domain (e.g. `https://medscan-ncd.vercel.app`).
5. **Sync CORS on Backend:**
   - Go to your Render Backend Service → **Environment**.
   - Update `CLIENT_URL` and `FRONTEND_URL` with your final Vercel domain (`https://medscan-ncd.vercel.app`).
   - Render automatically restarts the backend with the updated CORS origin.

---

## 6. Step 5: Safely Seed the Hosted Demonstration Dataset

Once backend and ML services are live, seed the dedicated Atlas database with synthetic demo profiles and trigger real ML predictions.

From your local computer terminal, run the seed script targeting your Atlas database:

### Using Windows PowerShell:
```powershell
cd "c:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD\backend"

# Set connection to dedicated Atlas database and confirm safety guard
$env:MONGODB_URI="mongodb+srv://medscan_app_user:<password>@cluster0.abcde.mongodb.net/medscan_ncd_faculty_demo?retryWrites=true&w=majority"
$env:DEMO_SEED_CONFIRM="true"
$env:DEMO_USER_PASSWORD="MedScanDemo!2026"

# Optional: set custom admin password, or leave unset to auto-generate unique password
# $env:ADMIN_DEMO_PASSWORD="MySecureAdminPassword123!"

# Run idempotent faculty demo seed script
npm run seed:faculty-demo
```

### Using Linux / macOS Bash:
```bash
cd backend

export MONGODB_URI="mongodb+srv://medscan_app_user:<password>@cluster0.abcde.mongodb.net/medscan_ncd_faculty_demo?retryWrites=true&w=majority"
export DEMO_SEED_CONFIRM="true"
export DEMO_USER_PASSWORD="MedScanDemo!2026"

npm run seed:faculty-demo
```

### What This Provisions:
1. **Clinical & Administrative Accounts:**
   - **Patient Demo:** `synthetic.patient.a@example.com` (Aarav Sharma — sequential reports, 4 ML outputs, medicines, appointments).
   - **Doctor Demo:** `doctor@example.com` (Dr. Demo Clinician — active patients, pending consultation requests).
   - **CHO Demo:** `cho@example.com` (Demo Community Health Officer — 3 villages, 4-disease overview, follow-ups, referrals).
   - **Admin Demo:** `admin@example.com` (Demo Administrator — global access directory, settings).
2. **Secondary Personas:**
   - **Patient B (`synthetic.patient.b@example.com`):** Elevated cardiometabolic risk across 3 models.
   - **Patient C (`synthetic.patient.c@example.com`):** Renal impairment, CKD positive estimate.
   - **Patient D (`synthetic.patient.d@example.com`):** Pending doctor consultation request.
   - **Patient E (`synthetic.patient.e@example.com`):** Registered community member awaiting screening.
3. **Private Admin Credentials Delivery:**
   - The seed script generates a strong, unshared 27-character password (or uses your `ADMIN_DEMO_PASSWORD`).
   - Plaintext credentials are saved **only** to the Git-ignored `.demo_credentials.local.json` file on your machine.
   - The password is saved in the database as a salted bcrypt hash.
   - It is **never** printed to public logs or committed to Git.

---

## 7. Step 6: How to Retrieve Admin Demo Credentials & Sign In

1. Open `.demo_credentials.local.json` on your local machine:
   - Located at: `.demo_credentials.local.json` in the project root.
2. Inspect the `admin` section:
   ```json
   "admin": {
     "email": "admin@example.com",
     "role": "Admin",
     "password": "AdminDemo!..."
   }
   ```
3. Open your deployed application in your browser: `https://medscan-ncd.vercel.app/login`.
4. In the sign-in form:
   - Enter Email: `admin@example.com`
   - Enter Password: Paste the private password from `.demo_credentials.local.json`.
5. Click **Sign In**. The system validates credentials via bcrypt, issues a signed JWT, and routes directly to `/admin/dashboard`.

---

## 8. Step 7: Live Faculty Demonstration Walkthrough

Follow this scripted walkthrough during your evaluation:

### Act 1: The One-Click Demo Login (`/login`)
1. Open `https://medscan-ncd.vercel.app/login`.
2. Point out the **"Demo Accounts"** panel labeled **`SYNTHETIC — FOR DEMO ONLY`**.
3. Explain that clicking a role shortcut populates verified demonstration credentials into the standard form. It does **not** bypass authentication; the server verifies the password with bcrypt and signs a JWT.
4. Point out that the Admin role has no public shortcut button: administrative credentials must be entered securely and privately.

### Act 2: Patient Aarav Sharma Workspace (`/patient/dashboard`)
1. Click **Use Patient demo** → Click **Sign In**.
2. **Four Disease Risk Assessments:**
   - **Diabetes Risk:** LightGBM classifier with real-time TreeSHAP feature contributions.
   - **Heart Disease Risk:** Framingham 10-year CHD regression model with directional linear factors.
   - **Hypertension Risk:** NHANES current diagnosed/treated model (strictly excludes blood pressure to avoid leakage).
   - **Chronic Kidney Disease (CKD):** Minimal ordered feature pipeline (Age + Serum Creatinine).
3. **Longitudinal Intelligence:**
   - Scroll to **Report History & Longitudinal Intelligence**.
   - Show how baseline vs follow-up lab tests compare over time with direction indicators.

### Act 3: Report Upload, OCR & Manual Correction
1. Click **Upload Report** in the navigation bar.
2. Upload sample report `docs/demo/sample-reports/patient-a-report1-baseline-chemistry.pdf`.
3. Click **Upload & Extract with OCR**.
4. Show the extracted lab values in the **Review & Confirm Extracted Data** screen.
5. Demonstrate Human-in-the-Loop editing:
   - Edit Fasting Glucose from `105` to `108`.
   - Show that audit provenance tracks the value as `manual_correction`.
6. Click **Confirm & Run AI Assessment**.
7. The system updates the profile and recalculates predictions across all four models.

### Act 4: Doctor Clinical Portal (`/doctor/dashboard`)
1. Sign out and click **Use Doctor demo** → **Sign In**.
2. Show assigned patients (Aarav Sharma, Rajesh Patel, Sunita Rao).
3. Review pending requests: accept the pending consultation request from Priya Nair.
4. Open Aarav Sharma's patient profile: view confirmed lab reports, longitudinal biomarkers, and prescribed medications.

### Act 5: Community Health Officer (CHO) Dashboard (`/cho/dashboard`)
1. Sign out and click **Use CHO demo** → **Sign In**.
2. Open **Disease Overview** (`/cho/diseases`):
   - Show the 4 interactive disease distribution donut charts:
     - Diabetes
     - Heart Disease
     - Hypertension
     - Chronic Kidney Disease
3. Open **Follow-ups**: demonstrate scheduling an outreach visit.
4. Open **Referrals**: show hospital referral tracking (Pending → Accepted → Completed).

### Act 6: System Administrator Portal (`/admin/dashboard`)
1. Retrieve Admin password from `.demo_credentials.local.json`.
2. Sign in as `admin@example.com`.
3. Demonstrate administrative governance:
   - User access directory across Patients, Doctors, CHOs, and Admins.
   - Role-based filtering.
   - System settings and telemetry configuration.

---

## 9. Troubleshooting & Maintenance

### Cold-Start Latency on Free Tiers
- **Cause:** Render free tier services spin down after 15 minutes of zero HTTP traffic. The first request after sleep takes 30–60 seconds to wake up.
- **Proactive Mitigation:** 5 minutes before your presentation, open both health endpoints in browser tabs:
  - `https://medscan-backend-api.onrender.com/health`
  - `https://medscan-ml-service.onrender.com/health`
  This wakes up both containers so your live presentation is instant and fluid.

### Resetting Demo Records Between Presentations
To safely restore the demo dataset to initial state without affecting any registered users:
```powershell
# PowerShell
node scripts/seed-faculty-demo.js --reset-demo-only
node scripts/seed-faculty-demo.js
```
```bash
# Bash
node scripts/seed-faculty-demo.js --reset-demo-only
node scripts/seed-faculty-demo.js
```
