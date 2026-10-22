# MedScan frontend integration audit

Date: 2026-10-15

## Outcome

The production application remains `MedScan_NCD/frontend`. The main project already contains the redesigned clinical pages and the cinematic MedScan hero integration. The separate `MedScan_frontend/MedScan-Hero` folder is a standalone hero prototype with an experience placeholder, not a complete replacement application. Its production entry point does not render the separate Three.js scene components. Replacing the main app with that prototype would remove authentication, product routes, and API-connected pages, so the existing integrated app was retained.

No backend source or database configuration was changed during this audit. Before work began, `git status` showed many modified and untracked files across the backend, frontend, uploads, and project documentation. Those user changes were preserved. No Git checkpoint was made because the working tree was already dirty.

## Integration inventory

| Area | Existing main project | Separate MedScan-Hero project | Integration decision |
| --- | --- | --- | --- |
| Frontend entry | `frontend/src/main.jsx` → `App.jsx` → `routes/AppRoutes.jsx` | `src/main.jsx` → `App.jsx` → `PinnedHero` + placeholder | Keep main entry and route tree active. |
| Package/runtime | React 18, React Router 6, Vite 5, Tailwind 3, GSAP 3, Lucide, Recharts | React 19, Vite 8, GSAP 3, Three 0.186, R3F/Drei 9/10 | Do not merge manifests; prototype's scene stack is not used by its current entry point and is unnecessary for the current video hero. |
| Public routes | `/`, `/login`, `/register`, `/forgot-password`, `/reset-password/:token` | No product/auth routes | Main routes preserved. |
| Patient routes | Dashboard aliases for dashboard, medicines, reports, predictions, appointments | None | Existing dashboard and services preserved. |
| Staff routes | Doctor dashboard/patients/prescriptions/reports/appointments and patient detail; CHO dashboard/population/diseases; Admin dashboard/users/settings | None | Existing role guards preserved. Nurse/Family dashboards are absent from the active route tree. |
| Auth/session | `AuthContext`, JWT bearer header in `services/api.js`, `/api/auth/*` endpoints, `ProtectedRoute` and `RoleRoute` | None | Existing session and role handling retained. |
| API services | Axios services for auth, patients, reports, predictions, appointments, analytics, notifications, medicines, users, settings, relationships | None | Existing service modules retained; no mock service replacement. |
| Backend | Express server in `backend/src/server.js`; Mongo/Mongoose; auth, patient, report, prediction, appointment and other routes | None | Backend structure and integrations preserved. |
| Hero runtime | `frontend/src/components/hero/PinnedHero.jsx`, scoped CSS, timeline, footage metadata, scroll and video scrubber hooks | Matching cinematic implementation and a separate Three.js prototype | Main app mounts the pinned hero on `/`; no external prototype dependency at runtime. |
| Hero assets | `frontend/public/assets/videos/derived/medscan-story-master.mp4` and `medscan-film-poster.webp` | Same master and poster plus source clips, segments, character and animation assets | Production build contains the master video and poster. Source materials remain in the external prototype folder for editing only. |
| Environment | Frontend `VITE_API_URL` optional, default `http://localhost:5000/api`; backend `.env.example` documents Mongo, JWT, storage, mail, client URL and ML service variables | No backend configuration | Values were not copied or disclosed. |

## Existing API contract observations

- Express mounts `/api/auth`, `/api/patients`, `/api/reports`, `/api/predictions`, `/api/appointments`, `/api/analytics`, `/api/notifications`, `/api/medicines`, `/api/settings`, `/api/relationships` and `/api/invitations`.
- Report services use multipart `POST /api/reports/upload`, `PATCH /:id/extracted-data`, `PUT /:id/confirm`, `GET /`, `GET /:id`, and `DELETE /:id`.
- Prediction services use diabetes and heart-disease endpoints under `/api/predictions`; the UI code reads live responses through those services. No disease result was generated during this frontend audit.
- Auth APIs include register, login, logout, current-user, forgot-password, and reset-password. Public registration is limited to Patient by the current backend controller; canonical login roles are Patient, Doctor, CHO, and Admin.
- The client has a Vite `/api` proxy to port 5000. No OCR, report upload, profile update, or prediction API request was exercised because backend tests connected to the configured MongoDB and failed; backend flows remain unverified here.

## Changes made for verification

The frontend already had a Vitest `jsdom` environment configured, but the package did not declare the environment or the libraries imported by its existing tests. Added `jsdom`, `@testing-library/react`, and `@testing-library/jest-dom` as frontend dev dependencies, added `frontend/src/testSetup.js`, and pointed the Vite test config at that setup. These are test-only dependencies and do not change the production React or Vite versions.

## Verification results

- **PASS** — `npm run build --prefix frontend` completed. The Vite output includes the hero code and copies the public master video and poster.
- **PASS** — `npm test --prefix frontend`: 2 test files, 2 tests passed.
- **PASS** — Browser smoke check on `/`: landing content rendered, cinematic video element loaded the local master (duration 12.958 seconds; ready state 4), and story beats were present.
- **PASS** — Browser smoke checks for `/login`, `/register`, `/forgot-password`; these screens rendered without submitting forms. `/patient/dashboard` while logged out redirected to `/login`.
- **FAIL** — `npm test --prefix backend`: 7 suites ran; 5 passed and 2 failed; 59 tests failed and 47 passed. Failures include test fixtures expecting removed Nurse/Family role values, HTTP status mismatches, and relationship migration assertions. The suite connected to the MongoDB configured in the existing backend `.env`; test cases may have written or cleaned test records in that configured database. The exact data impact was not established. Do not rerun against that connection until it is confirmed to be an isolated test database.
- **PARTIAL** — Production bundle produced successfully, with the largest route chunks lazy-loaded. Browser checks did not cover all breakpoints, role-authenticated dashboards, browser console/network logs, upload/processing/confirmation, appointments, or model inference.
- **PARTIAL** — npm reported 16 dependency audit findings after test packages were installed (6 moderate, 8 high, 2 critical). This audit did not classify which findings were pre-existing or resolve them.

## Commands

From the `MedScan_NCD` directory:

```powershell
npm run dev
npm run dev --prefix frontend
npm run dev --prefix backend
npm run build --prefix frontend
npm test --prefix frontend
npm test --prefix backend
```

`npm run dev` starts both frontend and backend. The backend requires its configured MongoDB and any external services used by the requested workflow. The frontend can run separately with `npm run dev --prefix frontend`; `VITE_API_URL` is optional and defaults to `http://localhost:5000/api`.

Backend environment variable names are listed in `backend/.env.example`. They include `PORT`, `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, token expiry values, Cloudinary settings, `CLIENT_URL`, email settings, `ML_SERVICE_URL`, `DIABETES_ML_SERVICE_URL`, and `LOCAL_STORAGE_FALLBACK`. Provide real values through a private local `.env`; do not commit secrets.

## Remaining work / limits

- Confirm the configured MongoDB is isolated, inspect its test records, and repair or retire stale backend tests before rerunning them.
- Run protected role workflows and OCR/report/prediction integration using a dedicated test database and available ML/OCR services.
- Perform responsive and reduced-motion checks at the target device sizes, plus console/network inspection in a supported browser session.
- Source video clips, 3D character and animation assets, and the FFmpeg rebuild script are still stored in the separate `MedScan_frontend/MedScan-Hero` working folder. They are not required for the current runtime, which uses the self-contained master film and poster inside the main project. If reproducible hero editing must also live inside `MedScan_NCD`, copy/document that editorial source material separately after deciding which originals to retain.

## Diagnostics follow-up — 2026-10-15

The historical backend failure and audit totals above were investigated and superseded by the isolated verification in [BACKEND_DIAGNOSTICS_REPORT.md](BACKEND_DIAGNOSTICS_REPORT.md). Current backend status: 7 suites / 89 tests pass using a generated loopback-only database. Current frontend status: 2 tests pass and production build passes. The remote database impact remains unknown; rotate the exposed credential and have the database operator audit logs/backups before any recovery action. The frontend bundle still has 2 moderate production React Router findings and 13 development dependency findings; details and compatibility limits are in the report.

## Final integration hardening addendum — 2026-10-17

This addendum supersedes prior test counts and the earlier partial workflow table where they differ. No remote MongoDB connection was made. No real patient records or credentials were used.

### Verification results

- **PASS — Database isolation.** `backend/scripts/run-tests.js` creates a uniquely named `medscan_ncd_test_<random id>` database and sets the MongoDB URI to loopback. The shared guard rejects non-loopback hosts and names without the test prefix. It was exercised with a remote-host URI and rejected before connecting. Cleanup only drops the generated test database. The full run removed its temporary database successfully. Importing the Express app does not connect; the server connects only when executed as the server.
- **PASS — Backend regression.** `npm test --prefix backend`: 8 suites, 95 tests passed. The P0 setup now allows 30 seconds for local DB/model initialization and does not run cleanup unless isolation completed. Deprecated Nurse/Family role fixtures remain excluded/rejected; retired Family invitation actions return unavailable; P1 doctor relationship flows pass; Admin provisioning validates canonical roles and required fields, denies Patient provisioning, and does not return password hashes. Existing authorization checks passed their regression suite.
- **PASS — Frontend regression.** `npm test --prefix frontend`: 2 tests passed. `npm run build --prefix frontend`: production build passed and emitted the hero bundle and public assets.
- **PASS — Browser public/protected smoke.** On the local Vite development server, `/`, `/login`, `/register`, and `/forgot-password` rendered. Logged-out visits to `/patient/dashboard`, `/doctor/dashboard`, `/cho/dashboard`, and `/admin/dashboard` redirected to `/login`. No form was submitted and no real credentials were entered. This verifies logged-out routing, not authenticated role dashboards.
- **PASS — Client logging hardening.** Removed the login page's raw successful-auth response log (which contained access/refresh tokens) and raw Axios error-object logging in auth, patient dashboard, and report workflows (which could include request headers). Errors remain visible to users through the existing toast messages.
- **PASS — Hero and responsive checks.** The master video and poster resolved in the browser (12.958 second video; loaded video reached readyState 4 during the run). Scrolling advanced the pinned story to the final beat/video end (~12.94 seconds), and the following experience section entered view after the pin. At CSS viewport widths 390, 768, and 1440 pixels, document width did not exceed viewport width. The hero CTA and next section were present. Browser console showed React Router v7 future-flag warnings and no error-level console entries. Network requests were not independently inspected in the browser; local video asset loading is evidenced by the video element.
- **PASS — Local synthetic authenticated API workflows.** Added `backend/tests/authenticated_workflows.test.js`; all 6 cases passed in the full suite. It covers login/current user, invalid and expired tokens, patient profile read/update, doctor assigned/unassigned access, synthetic multipart PDF upload and extraction review/confirmation, diabetes and heart inference, appointment list/create/update, notification list/read/read-all, Admin user list/create/delete, non-Admin denial, and response password-hash non-disclosure. Synthetic OCR/report handling and inference ran against local services and a fresh isolated DB. The local FastAPI model service loaded its diabetes and heart model artifacts and returned inference responses. No third-party OCR/ML provider or production service was contacted.
- **PARTIAL — CHO outreach.** Static route/controller inspection and API tests establish CHO community directory/profile access. No browser-authenticated CHO outreach session was run.
- **PARTIAL — Authenticated UI.** No browser login or protected role dashboard journey was run because the verification browser was not connected to the synthetic test database/API session. API tests verify the corresponding backend flows, and the browser verifies logged-out redirects.
- **PARTIAL — Browser network and motion preferences.** No complete request-failure inventory or reduced-motion emulation was available in this run. Console warnings are limited to React Router future flags; no console errors were observed.

### Workflow verification matrix

| Workflow | Static inspection | Automated API | Browser | External service |
| --- | --- | --- | --- | --- |
| Login/current user; invalid/expired tokens | **PASS** | **PASS** | Login page only; no real/synthetic browser login | Not required |
| Protected routes and role redirects | **PASS** | **PASS** auth/role enforcement | **PASS** logged-out role routes redirect to login; authenticated redirect not tested | Not required |
| Patient profile retrieval/update | **PASS** | **PASS** | **PARTIAL** no authenticated UI session | Not required |
| Multipart report upload, extraction, review, confirmation | **PASS** | **PASS** synthetic PDF workflow | **PARTIAL** no browser upload | **PARTIAL** local extraction path only; no hosted OCR provider |
| Diabetes and heart estimates | **PASS** | **PASS** | **PARTIAL** no browser prediction request | **PASS** local FastAPI with model artifacts; no hosted ML provider |
| Appointments | **PASS** | **PASS** list/create/update | **PARTIAL** no authenticated UI session | Not required |
| Notifications | **PASS** | **PASS** list/read/read-all | **PARTIAL** no authenticated UI session | Not required |
| Doctor assigned/unrelated patient access | **PASS** | **PASS** allowed/denied scopes | **PARTIAL** no authenticated UI session | Not required |
| CHO directory/outreach | **PASS** directory routes inspected | **PASS** directory/profile scope | **PARTIAL** no authenticated UI session | Not required |
| Admin list/create/delete | **PASS** | **PASS** with Patient denial and password non-disclosure | **PARTIAL** no authenticated UI session | Not required |

### Current dependency audit and compatibility plan

Fresh `npm audit` reports **14 findings: 6 moderate, 6 high, 2 critical**. `npm audit --omit=dev` reports **2 moderate, 0 high, 0 critical**. The non-forced `npm audit fix` was attempted, but a fresh audit confirmed that findings remain. No major upgrade was forced.

- **Production/direct path:** `react-router-dom` is a direct production dependency and brings affected `react-router` versions transitively. The current 6.x range is affected by the open-redirect advisory (backslash handling in `Link`/`useNavigate`) and a React Router SSR hydration advisory. SSR is not used by this client-rendered application, but that does not remove the open-redirect concern. The audit proposes React Router 7.18.4 as a major upgrade. Review external/dynamic navigation targets and add redirect regression cases, upgrade React Router in a dedicated branch, then run route/auth browser checks and the frontend tests/build.
- Static navigation review found internal fixed paths, canonical-role dashboard paths, and patient-detail paths containing database IDs. No user-controlled external return/redirect URL was found. This reduces the current dynamic target surface, but does not resolve the vulnerable React Router version; keep the upgrade and redirect regression work outstanding.
- **Development/build direct paths:** Vite 5, Vitest 1, and Tailwind 3 are direct dev dependencies in the affected dependency trees. Findings include vulnerable transitive `esbuild`/Vite and `vite-node`, critical `tinypool`/Vitest, and Tailwind dependency chains involving `braces`, `chokidar`, `micromatch`, and PostCSS selector parsing. These are dev/build-time findings, not shipped production runtime dependencies. The audit's offered fixes require Vite 8, Vitest 4, and Tailwind 4 major migrations. Upgrade independently in a compatibility branch: migrate Vite config/plugin and runtime constraints first; then Vitest/test environment; then Tailwind/PostCSS config and CSS directives/utilities. Run the frontend suite and build after each migration and browser route/hero checks at the end.
- Audit sources: local npm audit advisory database as reported on 2026-10-17. The fresh audit commands are `npm audit` and `npm audit --omit=dev` from `frontend/`.

### Remaining operator actions and readiness

- **BLOCKED — Credential and historical data incident.** The earlier test run used the configured remote `medscan` connection and may have executed broad Doctor/relationship/invitation deletes. Exact impact remains unknown. An exposed MongoDB credential was reported in an earlier tool output. An authorized database operator must rotate that credential, inspect provider audit logs and backups for the historical test window, preserve current state, and determine any required recovery point. These actions are not verified complete. Do not connect to or restore the remote database as part of routine testing.
- **PARTIAL — Release readiness.** Local build, backend API integration, synthetic upload/extraction and model inference pass. Authenticated browser role workflows, full browser network diagnostics, reduced-motion behavior, hosted OCR/ML verification, and major dependency migrations remain outstanding.

### Safe local commands

Run from the project root in PowerShell. The backend test runner overrides any `.env` Mongo URI with a fresh loopback-only test database; it also requires a local MongoDB service and the local model service on port 8000 for inference tests:

```powershell
Set-Location .\ml_model\service
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --log-level warning
```

In another PowerShell window, open the same project root and run:

```powershell
Set-Location "C:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD"
npm test --prefix backend
npm test --prefix frontend
npm run build --prefix frontend
```

For manual local application development, set `MONGODB_URI` explicitly to a separate local database (for example `mongodb://127.0.0.1:27017/medscan_ncd_local_dev`) before starting the backend. Do not run the app with the old configured remote URI while investigating the incident. Keep local storage fallback enabled and Cloudinary variables empty for synthetic uploads.

## Local role demo follow-up — 2026-10-18

- Added `DEMO_GUIDE.md`, a development-only four-role quick-fill panel, and `npm run seed:demo`.
- The dedicated seed script refuses any URI other than unauthenticated loopback `medscan_ncd_demo_local`; an intentionally remote host was rejected before connection. It does not delete collections and does not log the URI or demo password.
- Seeded synthetic Patient, Doctor, CHO, and Admin accounts plus a fictional linked patient, report PDF, appointment, notification, medicines/adherence, and local model estimates. All four logins and role-specific API access were verified against `medscan_ncd_demo_local`. The synthetic PDF is served locally with HTTP 200.
- The Patient demo was signed in through the browser. The dashboard displayed the fictional profile/report and local diabetes/heart model estimates. Production build and two frontend tests passed; a search confirmed the demo password literal is absent from production assets. Quick-fill controls render only in development.
- Doctor and CHO accounts remain Admin-provisioned in real deployments; only Patient self-registration is open. Details and the current feature-status inventory are in `DEMO_GUIDE.md`.

