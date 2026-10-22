# MedScan-NCD local demo guide

This demo uses fictional records in a dedicated MongoDB database named `medscan_ncd_demo_local` on `127.0.0.1`. It does not use the configured remote database. Do not use real patient information in the demo.

## Start the demo

Start the local MongoDB service and the ML service first. In one PowerShell window, from the project root:

```powershell
Set-Location .\ml_model\service
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --log-level warning
```

In a second PowerShell window, seed the dedicated demo database:

```powershell
Set-Location "C:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD"
$env:MONGODB_URI = 'mongodb://127.0.0.1:27017/medscan_ncd_demo_local'
npm run seed:demo
Remove-Item Env:MONGODB_URI
```

The seed command is idempotent and only updates its named synthetic demo accounts and fixtures. It refuses remote MongoDB hosts, credential-bearing URIs, or any database name other than `medscan_ncd_demo_local`. It creates a fictional patient, eight additional synthetic community patient profiles, a linked demo doctor, an active doctor-patient relationship, sample medicines/adherence, appointments, notifications, clearly labeled synthetic report records in several review states, follow-ups and referrals in varied states, and model estimates if the local ML service is available. It does not clear collections. Re-run the same seed command to restore its named demo records; it does not erase other records.

Run the backend in a separate window with explicit local-only settings:

```powershell
Set-Location "C:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD"
$env:PORT = '5000'
$env:NODE_ENV = 'development'
$env:MONGODB_URI = 'mongodb://127.0.0.1:27017/medscan_ncd_demo_local'
$env:JWT_ACCESS_SECRET = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
$env:JWT_REFRESH_SECRET = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
$env:CLIENT_URL = 'http://localhost:5173'
$env:DIABETES_ML_SERVICE_URL = 'http://127.0.0.1:8000'
$env:ML_SERVICE_URL = 'http://localhost:8000/predict'
$env:LOCAL_STORAGE_FALLBACK = 'true'
$env:BACKEND_URL = 'http://127.0.0.1:5000'
$env:CLOUDINARY_CLOUD_NAME = ''
$env:CLOUDINARY_API_KEY = ''
$env:CLOUDINARY_API_SECRET = ''
npm run dev --prefix backend
```

Run the frontend in another window:

```powershell
Set-Location "C:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD"
npm run dev --prefix frontend -- --host 127.0.0.1 --port 5173
```

Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/). On the sign-in page, select **Use Patient demo**, **Use Doctor demo**, **Use CHO demo**, or **Use Admin demo**, then click **Sign In**. The quick-fill controls only exist in Vite development mode; production builds do not expose them.

## Demo logins

All four demo accounts use the shared local-demo password `MedScanDemo!2026`.

| Role | Email | What to explore |
| --- | --- | --- |
| Patient | `patient@example.com` | Synthetic health profile, report review, model-estimated risks, medicines, adherence, appointment, and notification. |
| Doctor | `doctor@example.com` | Assigned demo patient, patient detail, reports, and clinician workspace. |
| CHO | `cho@example.com` | Daily action queue, community registry, population charts, supported disease-risk summaries, patient workspaces, follow-ups, and referrals across Demo Community Central, North, South, and East. |
| Admin | `admin@example.com` | User directory, account provisioning, and settings screen. |

These are local demonstration credentials, not production accounts. The demo database is intentionally separate from `medscan_ncd_local_dev` and any configured remote database.

## Account and registration process

- **Patient:** may self-register at `/register`. Public registration accepts Patient only.
- **Doctor:** cannot self-register. An existing Admin creates a Doctor account from the Admin user-management screen and shares the temporary sign-in details with that clinician. The new Doctor receives a default Doctor profile; a patient must request a relationship and the Doctor must accept it before the Doctor can access that patient's records. The demo seed establishes one synthetic active relationship for presentation.
- **CHO:** cannot self-register. An existing Admin provisions the CHO account and assigns its community/village. The CHO signs in with the provisioned credentials and sees records in its permitted community scope.
- **Admin:** cannot self-register. Initial Admin access must be provisioned by the deployment/database operator or through a trusted local demo seed. An Admin can create canonical Patient, Doctor, CHO, and Admin accounts from the app.
- **Nurse and Family:** retired roles. They cannot register or sign in as supported roles; Family invitation routes are retired.

Production staff onboarding is not a self-service application flow: identity/licence review, approval workflow, temporary-password delivery, and enforced first-login password reset are not implemented as a complete process. Configure a trusted Admin provisioning procedure before real use.

## Current implementation status

“Implemented” below means the local UI/API behavior exists and the listed backend integration has automated coverage; it does not mean the models or workflows have clinical or production certification.

### Implemented and locally verified

- Four canonical roles, login/current-user, token checks, Patient self-registration, protected role routes, profile retrieval/update, and role-based authorization.
- Admin user listing, canonical-role account creation, Patient denial for Admin-only provisioning, and account deletion.
- Doctor-patient request/accept/revoke relationship flow and assigned-versus-unrelated patient access controls.
- Synthetic multipart report upload, local OCR/extraction retrieval, human review/edit, confirmation, and immutable raw extraction history.
- Diabetes and heart-disease model inference through the local FastAPI service using model artifacts. Responses are non-diagnostic risk estimates and require sufficient confirmed data.
- Appointment list/create/update, notifications list/read/read-all, CHO village-scoped patient directory/profile access, database-backed CHO population and disease analytics, report status visibility, and audited follow-up/referral creation and status transitions.
- Cinematic landing experience with local video/poster, pinned scroll sequence, final CTA, and the next content section.

### Partial, dependent, or not yet production verified

- Authenticated browser walkthroughs for each role, hosted OCR/ML provider integration, complete browser request-failure diagnostics, and reduced-motion/browser compatibility checks have not been completed. Automated API workflows cover the synthetic local path.
- CHO account catchment is the account's village plus its explicitly assigned `communityVillages`; records with a different or missing catchment are denied. Eligible-population coverage cannot be calculated because verified community eligibility denominators are not stored. The displayed report coverage uses registered patients with confirmed reports as its explicit denominator.
- CHOs can read reports in their catchment but cannot edit OCR values or confirm reports; the existing report-review permissions reserve that action for the patient or an authorized doctor. The CHO patient workspace reports status and source document without implying a review occurred.
- CHO follow-ups and referrals support persisted status history. They do not change diagnoses, prescribe care, send messages, contact facilities, or confirm an external referral outcome automatically.
- CHO analytics include only actual diabetes and heart-disease model assessments. Hypertension and CKD are not included in the CHO disease overview. Empty data states indicate missing records; no fallback values are substituted.
- Diabetes and heart outputs have local synthetic integration evidence, but clinical validation, prospective evaluation, and regulatory/clinical approval are outside this project verification.
- Password reset/email delivery needs a configured and verified mail provider. Cloudinary is not configured in the local demo; uploads use local disk fallback. Physical ESP32/IOT hardware and delivery reliability have not been tested; the HTTP telemetry endpoint has a synthetic test.
- Appointment reminders, SMS/email delivery, and external calendar integrations are not verified. Admin settings and full report/appointment screens have less automated UI coverage than the API paths.
- Dependency audit findings remain: 2 moderate production React Router findings and development/build dependency findings. See `FRONTEND_INTEGRATION_AUDIT.md` for counts and migration plan.

## Important

Do not run the legacy `npm run seed` command for this demo; it clears collections and does not have the local-only guard used by `seed:demo`. Use only the documented `seed:demo` command and keep the backend environment pointed at the dedicated local demo database.
