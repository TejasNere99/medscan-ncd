# MedScan-NCD Completion and Verification Report

**Review date:** 2026-10-18  
**Scope:** Repository state and local services available in this workspace. This report records verified behavior and explicitly leaves unverified product areas as partial or blocked.

## Executive summary

The most visible integration gap is fixed: the Patient dashboard and Doctor patient-detail page now load saved Hypertension/CKD predictions from the authenticated Express API and offer a real “Generate estimate” action. The browser never calls FastAPI directly. Results are only shown when returned by the trained model; missing data and service errors do not produce a probability. Empty explanations are labeled unavailable.

I verified a complete local synthetic-patient request through **Express → internal-token-authenticated FastAPI on port 8001 → saved model → persisted prediction → Express response** for both diseases. Both current FastAPI listeners (8000 and 8001) report the new model routes and loaded artifacts; Express is configured to use 8001. No model was retrained or overwritten. The two new model artifact hashes still match the previously reported hashes.

This does **not** establish production readiness for the whole product. External Cloudinary/SMTP delivery and several broader product areas were not configured or end-to-end verified. Neither new model is clinically validated, and per-patient SHAP explanations remain unavailable.

## Original state and root cause

The Patient dashboard’s “Multi-Disease Intelligence Roadmap” was literal JSX with hard-coded lock icons, “Under Development,” and “Coming Soon.” It did not read any prediction API. The Doctor patient-detail page contained the same stale placeholder. A healthy model service therefore could not change those labels.

## Changes made in this completion pass

- Replaced the Patient dashboard roadmap strip with Hypertension and CKD estimate cards in `frontend/src/pages/patient/PatientDashboard.jsx`.
- Added authenticated latest-result loading, per-card loading states, real Express prediction requests, retry, insufficient-confirmed-data guidance, and model/service error display.
- Cards display model version, returned probability/category, task interpretation, and supported factors only when present. They distinguish an unavailable explanation from a failed inference and retain the non-diagnostic/research disclaimer.
- Replaced the Doctor patient-detail roadmap placeholders with corresponding saved-result and generate/refresh cards in `frontend/src/pages/doctor/DoctorPatientDetail.jsx`. Doctor requests include the route patient ID; backend access checks remain authoritative.
- Added focused patient-card tests in `frontend/src/__tests__/PatientResearchPredictions.test.jsx`.
- No database schema, model artifact, model-training, or secret changes were made in this pass. Existing local demo records and prediction history were not cleared.

### File and data changes

- **Created:** `frontend/src/__tests__/PatientResearchPredictions.test.jsx`; `MEDSCAN_NCD_FINAL_COMPLETION_REPORT.md`.
- **Modified:** `frontend/src/pages/patient/PatientDashboard.jsx`; `frontend/src/pages/doctor/DoctorPatientDetail.jsx`.
- **Removed:** None.
- **Database/schema/migration:** None. The only new persisted rows are the two synthetic demo-patient predictions created by the live local integration check.
- **Model artifacts:** None modified; no training or overwrite command was run.

## Model artifacts and service configuration

The following SHA-256 checks were run against the actual artifacts:

| Model | Artifact | SHA-256 | Result |
|---|---|---|---|
| Hypertension | `ml_model/artifacts/hypertension/v1/model.joblib` | `4c81f819b59d77bb264f0a1dfe144172eefd28e0a248fa1f3ef017f10240b221` | Match |
| CKD | `ml_model/artifacts/kidney_disease/v1/model.joblib` | `5269cea58772a41d1ccd97a09dbcf815c64c88aedb4d6d570f5f086b3bcf7119` | Match |

No training command was run. Previously reported held-out metrics were not recalculated for this task and should not be treated as newly verified here.

At verification time, `/health` on ports 8000 and 8001 reported both research models loaded at `1.0.0-research`, with their feature schemas and thresholds loaded. A tokenless POST to each `/predict/hypertension` route returned 401, confirming the protected route is registered on both listeners. Both listeners were left running; no unrelated process was terminated. The Express `.env` precedence resolves `DIABETES_ML_SERVICE_URL` first, followed by `ML_SERVICE_URL`; the active backend health check and real inference requests confirmed Express used the current model service on `127.0.0.1:8001`.

The live `/health` metadata reported development thresholds of approximately `0.3306788` for Hypertension and `0.9672324` for the selected CKD model. These are saved model policies, not clinical cutoffs.

The shared internal variable is `ML_INTERNAL_API_KEY`; Express sends it in `X-ML-Internal-Token`. `backend/.env.example` and `ml_model/service/.env.example` document the variable, and the FastAPI example documents that Uvicorn reads it from the process environment. The examples contain no actual key. `backend/.env` is Git-ignored. The frontend source has no `ML_INTERNAL_API_KEY` reference. Missing/wrong token and missing server configuration checks exist in the tests. No secret value is included in this report or test output.

If a local key must be created, this PowerShell snippet generates a 48-byte random URL-safe value and writes it to the ignored backend `.env` without echoing it. Both backend and model startup commands below read that same entry:

```powershell
$key = python -c "import secrets; print(secrets.token_urlsafe(48))"
$envFile = 'C:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD\backend\.env'
$content = [System.IO.File]::ReadAllText($envFile)
if ($content -match '(?m)^ML_INTERNAL_API_KEY=') {
  $content = [regex]::Replace($content, '(?m)^ML_INTERNAL_API_KEY=.*$', "ML_INTERNAL_API_KEY=$key")
} else {
  $content += "`nML_INTERNAL_API_KEY=$key`n"
}
[System.IO.File]::WriteAllText($envFile, $content)
Remove-Variable key
```

## End-to-end evidence

### Live local synthetic demo-patient run

Using the seeded local demo patient and saved demo health information, I:

1. Logged in through `POST http://localhost:5000/api/auth/login`.
2. Requested `POST /api/predictions/hypertension` and `POST /api/predictions/ckd` with the patient’s authenticated context and no client feature vector.
3. Received HTTP 200 for both, with `SUCCESS`, `canCalculate: true`, model version `1.0.0-research`, finite probability, threshold-based category, and `explanationStatus: unavailable`.
4. Retrieved each latest prediction through the authenticated latest-result API and confirmed both records were associated with the logged-in patient.

Those requests used synthetic demo data only. Returned estimates were written to the local demo database as prediction history; no real patient record was used.

### Automated checks

- `npm test` (root): backend **11 suites passed; 112 tests passed, 1 opt-in research-model E2E test skipped**. The skipped test was then run separately with `RUN_RESEARCH_MODEL_E2E=true` against FastAPI on 8001: **1 suite, 7 tests passed**, including real report-to-Hypertension/CKD inference, category/threshold consistency, patient/report association, no-key/wrong-token, unauthorized/spoofed patient, feature rejection, and unavailable-service behavior.
- `python -m pytest ml_model/tests -q`: **22 passed**, with 3 upstream SHAP deprecation warnings.
- `npm run build` in `frontend`: **passed** after the dashboard changes.
- `npx vitest run src/__tests__/PatientResearchPredictions.test.jsx`: **2 passed** after correcting a test assertion that initially matched two truthful task-description messages.
- `npm test` in `frontend`, including the new card tests: **3 test files passed; 4 tests passed**. React Router emitted non-failing future-flag warnings.
- `git diff --check`: no whitespace errors; Git printed existing LF/CRLF working-copy notices.

## Feature matrix

| Feature | UI | API | Database | End-to-end test | Status |
|---|---|---|---|---|---|
| Patient Hypertension estimate | Real result, empty, loading, insufficient-data, error and explanation-unavailable states | Authenticated Express route; internal FastAPI token; saved model | Prediction includes patient, disease, model/schema version, probability/category and report/provenance fields | Real synthetic demo flow and opt-in API test passed | PASS (local demo) |
| Patient CKD estimate | Same states and retry action | Authenticated Express route; internal FastAPI token; saved model | Same persisted fields; selected two-feature model | Real synthetic demo flow and opt-in API test passed | PASS (local demo) |
| Doctor Hypertension/CKD estimate | Patient-scoped cards and actions on Doctor patient detail | Same routes; backend patient-access check retained | Existing prediction history used | API authorization tests pass; UI production build passes | PARTIAL — no browser E2E of Doctor card in this run |
| Diabetes model | Existing Patient/Doctor risk UI | Existing prediction routes and ML service | Existing predictions | Existing model integration and authenticated workflow tests passed | PASS (covered integration paths) |
| Heart Disease model | Existing Patient/Doctor risk UI | Existing prediction routes and ML service | Existing predictions | Existing integration tests and authenticated workflow tests passed | PASS (covered integration paths) |
| Hypertension/CKD explanations | UI accurately says individual factors unavailable when none exist | Inference returns `explanationStatus: unavailable` | No fabricated factor records | Python and Express tests passed | PARTIAL — request-time SHAP remains unavailable |
| Report upload → OCR → correction → confirmation | Existing review UI | Authenticated upload/review/confirm endpoints | Confirmed report and health snapshot | Synthetic PDF workflow passed in isolated MongoDB tests | PASS for tested local-fallback path |
| Cloudinary report storage | Existing upload UI | Configurable storage client | Remote provider not verified | No live Cloudinary credential/service test | BLOCKED — external Cloudinary configuration not verified; local demo fallback is active |
| Patient/Doctor access boundaries | Role dashboards and scoped detail views | RBAC and relationship checks | Existing relationships/ownership | P0/P1 security suites passed; patient spoof test passed | PASS for covered authorization paths |
| CHO catchment access | CHO dashboard exists | Scoped patient endpoints | Community/village scope | P0 tests cover scoped reads | PARTIAL — full CHO referral/follow-up UI workflow not end-to-end verified |
| Admin user management | Admin UI exists | Provisioning endpoints | User/profile records | Synthetic create/list/delete and non-admin denial passed | PASS for tested user-management path |
| Appointments and notifications | Existing UI | List/create/update/read APIs | Persisted appointment/notification records | Synthetic API workflow passed | PASS for tested API paths |
| Email delivery | Existing email-related flows | Development email simulation exists | No delivery provider verified | No SMTP delivery test | BLOCKED — real email provider configuration/delivery not verified |
| AI Copilot / what-if simulation | No verified implemented workflow found in current frontend/backend source search | No verified route found | N/A | Not run | NOT IMPLEMENTED / NOT VERIFIED |
| Timeline, report comparison, approved Health Score | No verified complete end-to-end contracts found during this pass | Not verified | Not verified | Not run | PARTIAL — not established by current evidence; no score or synthetic history was added |
| Production readiness | Production build passes | Local services healthy | Local demo MongoDB verified | Local synthetic flows only | BLOCKED — deployment configuration, external storage/email, broad browser E2E, and clinical validation remain outstanding |

## Run the local demo

Local MongoDB must be available. The demo seed command targets only `medscan_ncd_demo_local`:

```powershell
Set-Location 'C:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD\backend'
$env:MONGODB_URI = 'mongodb://127.0.0.1:27017/medscan_ncd_demo_local'
npm run seed:demo
```

Start the model service in a separate PowerShell window from the repository root. This reads the key from the ignored backend `.env` without printing it:

```powershell
Set-Location 'C:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD'
$keyLine = Get-Content '.\backend\.env' | Where-Object { $_ -match '^ML_INTERNAL_API_KEY=' } | Select-Object -Last 1
if (-not $keyLine) { throw 'Configure ML_INTERNAL_API_KEY in backend\.env first.' }
$env:ML_INTERNAL_API_KEY = $keyLine.Substring('ML_INTERNAL_API_KEY='.Length)
python -m uvicorn ml_model.service.app:app --host 127.0.0.1 --port 8001
```

Start Express in another window using the same key and the demo database:

```powershell
Set-Location 'C:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD\backend'
$keyLine = Get-Content '.env' | Where-Object { $_ -match '^ML_INTERNAL_API_KEY=' } | Select-Object -Last 1
if (-not $keyLine) { throw 'Configure ML_INTERNAL_API_KEY in backend\.env first.' }
$env:ML_INTERNAL_API_KEY = $keyLine.Substring('ML_INTERNAL_API_KEY='.Length)
$env:MONGODB_URI = 'mongodb://127.0.0.1:27017/medscan_ncd_demo_local'
$env:DIABETES_ML_SERVICE_URL = 'http://127.0.0.1:8001'
npm run dev
```

Start Vite in a third window:

```powershell
Set-Location 'C:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD\frontend'
npm run dev -- --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173/` and sign in using a local demo account from `DEMO_GUIDE.md`. In the Patient dashboard, use **Generate estimate** on the Hypertension and CKD cards. A demo user needs eligible profile/confirmed values; otherwise the cards show the backend’s missing-data explanation.

## Remaining limitations and release assessment

- Per-patient SHAP was disabled after exceeding the inference timeout. The service and UI report explanations as unavailable; no fallback factors are fabricated.
- The selected Hypertension target is current diagnosed/treated label classification, not future-onset prediction. CKD uses age and serum creatinine only. Neither model is clinically validated.
- Cloudinary and real SMTP delivery were not validated. The test logs confirm local storage fallback is used in the test environment; development email simulation must not be interpreted as delivery.
- A comprehensive manual browser journey across all four roles, all visible controls, upload providers, appointment/notification flows, and deployment settings was not completed. The current result is **locally integrated and test-supported for the specific paths above, but not a production release sign-off**.
- Existing user working-tree changes and untracked artifacts predated this pass. They were preserved; no reset/clean operation was run.
