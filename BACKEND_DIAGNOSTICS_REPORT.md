# MedScan-NCD Post-Integration Diagnostics

Date: 2026-10-15

## Final integration hardening follow-up — 2026-10-17

This follow-up supersedes the earlier 7-suite / 89-test count and prior partial workflow coverage below.

- **PASS — Isolation rechecked.** The runner generates a unique `medscan_ncd_test_<random id>` database on `127.0.0.1`, sets `NODE_ENV=test`, and drops only that generated database. The shared connection guard rejects non-loopback hosts or databases without the test prefix. A remote-host URI was rejected before connection. The app import path does not connect to MongoDB; only starting the server does. No remote database was inspected or modified during this follow-up.
- **PASS — Full backend suite.** `npm test --prefix backend` passed 8 suites / 95 tests, including the six new authenticated synthetic workflow tests. The runner reported that it removed its temporary database. The P0 `beforeAll` timeout was increased to 30 seconds to accommodate safe local model/DB setup; cleanup is gated on successful isolation.
- **PASS — Synthetic API workflow.** Local isolated tests covered login/current-user, invalid/expired JWTs, patient profile read/update, assigned and unrelated doctor scope, synthetic PDF multipart upload/extraction/review/confirmation, diabetes and heart inference, appointment list/create/update, notification list/read/read-all, Admin list/create/delete, Patient denial of Admin provisioning, and password-hash non-disclosure.
- **PASS — Local model dependency.** The local FastAPI service was started on loopback for verification. Health check confirmed the diabetes and heart artifacts were loaded, and the workflow suite received inference responses. The process was stopped after testing. This does not verify a hosted/production ML endpoint.
- **PASS — Existing fixes.** P0/P1 security suites passed, including canonical-role constraints, retired Family invitation operations, relationship lifecycle, patient/report/prediction scoping, and data integrity checks. Admin provisioning regression cases passed.
- **PARTIAL — CHO.** Static route/controller review and automated API checks cover community directory/profile access. No authenticated CHO browser outreach workflow was run.
- **PARTIAL — Browser integration.** Public landing/login/register/password-recovery pages render; logged-out patient/doctor/CHO/admin protected paths redirect to login. Authenticated browser workflows were not run. The synthetic workflows were exercised through Supertest/API only.
- **BLOCKED — Historical remote DB impact and credential.** An earlier unguarded test run used the configured remote database and executed collection-wide deletes on Doctor, PatientRelationship, and Invitation. The exact impact remains unknown. A credential was exposed in prior tool output and must be treated as compromised. An authorized operator must rotate it, inspect provider audit logs/backups, preserve current state, and determine whether recovery is required. None of these remote actions were attempted or verified here. Do not connect to or restore remote `medscan` as part of routine verification.

Current frontend verification and dependency audit details are in `FRONTEND_INTEGRATION_AUDIT.md` under “Final integration hardening addendum — 2026-10-17”.

## Results

- **PASS** — The previous backend run reported in `FRONTEND_INTEGRATION_AUDIT.md` was reproduced from the repository's original P0/P1 tests using the new loopback-only runner: those two suites produced 59 failures and 12 passes. All generated test data was in a uniquely named local database, which the runner dropped afterward.
- **PASS** — After applying the test-scope corrections and Admin provisioning fix below, `npm test` completed with 7 suites and 89 tests passing. The runner confirmed the temporary local database was removed.
- **PASS** — Frontend tests: 2 files, 2 tests. Production build completed.
- **PARTIAL** — The browser's earlier landing/auth smoke checks and hero video load are recorded in `FRONTEND_INTEGRATION_AUDIT.md`; scroll behavior, authenticated dashboards, console/network logs, and upload-to-prediction journeys were not repeated in this diagnostics pass.

## Database safety

- **FAIL — Prior database isolation.** `backend/.env` points to a remote MongoDB database named `medscan`; it did not define `NODE_ENV`. The original backend test command loaded that configuration. The original P1 suite runs `Doctor.deleteMany({})`, `PatientRelationship.deleteMany({})`, and `Invitation.deleteMany({})` both before and after its tests. Those collection-wide deletes could have removed real records. P0 also deletes records matching test village, email, report-title, and prediction markers. The exact impact is unknown.
- **BLOCKED — Remote impact audit.** No remote database inspection or restoration was attempted. The earlier malformed URI diagnostic echoed the database credential into tool output; treat it as exposed and rotate it. Have the database operator preserve the current state, inspect provider audit logs/backups, and determine whether recovery is needed before restoring anything.
- **PASS — Test isolation now enforced.** `backend/scripts/run-tests.js` sets `NODE_ENV=test`, overrides the configured URI with a random `127.0.0.1` database named `medscan_ncd_test_<id>`, runs Jest serially, and drops only that generated database. `backend/tests/helpers/isolatedDatabase.js` rejects any non-loopback host or database name without the test prefix. P0/P1 suites connect through that guard before importing the Express app; cleanup is skipped if the guard fails. Do not invoke those suites outside the package test runner unless the same guard is preserved.

## Original failure diagnosis

The original P0/P1 files were restored from `HEAD` into temporary test files and run against the current backend code through the isolated runner. This safely reproduced the 59 failing assertions.

| Category | Finding | Classification |
| --- | --- | --- |
| Deprecated role expectations | Original P0 setup creates a `Nurse` user, but the current `User` schema only permits Patient, Doctor, CHO, and Admin. Its `beforeAll` throws a Mongoose enum `ValidationError`; dependent cases cascade as failures. Family/Nurse assertions also assume unsupported role behavior. | **Stale test fixtures** against the four-role scope, not evidence of a current RBAC regression. Tests now assert unsupported roles are rejected and exercise CHO access instead. |
| Family invitations | Original P1 expected create/validate/redeem to succeed and grant Family access. The current invitation routes explicitly return HTTP 410, matching retirement of the Family role. | **Stale contract tests.** Tests now assert 410 for all three retired operations. No Family access was restored. |
| Doctor relationship lifecycle | The original P1 doctor request, acceptance, scope checks, code claim, primary-doctor switching, and revoke scenarios pass when run against isolated data. | **PASS; no relationship defect reproduced.** |
| Relationship migration | The old idempotence assertion expected a `migratedFamily` result. Current migration only reports/synchronizes doctor relationships; the old field is absent. Doctor synchronization and repeat-run idempotence pass. | **Stale migration assertion.** Updated to assert the retired field is absent while retaining doctor migration checks. |
| Database setup | Original suites imported `server.js` before verifying their database and relied on `.env`; the P1 cleanup was collection-wide. | **Test harness defect / data safety defect.** Fixed by guarded connection and local-only runner. `server.js` now connects to Mongo only when the backend server is started, not when its Express app is imported by tests. |
| Genuine API contract defect | Admin UI invokes `POST /api/users` to create an account, but backend user routes only implemented list/delete/profile update. The create call could never succeed. The modal also did not collect a password. | **Application defect.** Added an Admin-only create route, canonical role validation, an 8-character minimum password, Patient/Doctor profile creation, and a required password field in the Admin modal. Regression tests cover successful Patient provisioning and denial to a Patient caller. |

The original whole-backend baseline recorded in the earlier audit was 5 suites passing and 2 failing (59 failed, 47 passed). The original P0/P1 failure causes reproduced above account for those 59 failures; the other five suites continued to pass in the baseline report. The verified current run is 7/7 suites and 89/89 tests passing.

## Files changed for this diagnostics pass

- `backend/scripts/run-tests.js`, `backend/tests/helpers/isolatedDatabase.js`, `backend/package.json` — isolated test database runner and safe package test command.
- `backend/tests/security_rbac_p0.test.js`, `backend/tests/security_rbac_p1.test.js` — enforce isolation before app import, keep fixtures within canonical roles, and align tests with retired Family invitation routes/current migration output.
- `backend/src/server.js` — delay DB connection until actual server startup so importing the Express app does not run database startup/migrations.
- `backend/src/controllers/userController.js`, `backend/src/routes/userRoutes.js` — implement Admin-only account provisioning.
- `frontend/src/pages/admin/AdminDashboard.jsx` — collect/require the password used by the provisioning API.
- `frontend/package.json`, `frontend/package-lock.json` — compatible dependency updates described below.

## Frontend/backend contracts

The frontend Axios client attaches the stored bearer token, unwraps the outer Axios response, and rejects with the API error body. Backend responses use `{ success, data, message }`.

| Workflow | Frontend call and request | Backend route and auth | Verification |
| --- | --- | --- | --- |
| Login/current user | `POST /auth/login` `{email,password}`; `GET /auth/me` | Public login; `/me` requires valid JWT | **PARTIAL.** Backend auth integration tests verify successful login and invalid-password 401. Current-user success was not separately exercised in this pass. |
| Patient health profile | `GET /patients/me`; `PATCH /patients/me/demographics` with changed demographic fields | Patient-only routes require JWT | **PARTIAL.** P0 verifies own profile access, cross-patient denial, CHO directory/profile reads, and role scoping. No frontend session-to-profile browser journey was run. |
| Report upload/extraction | Multipart `POST /reports/upload`; `GET /reports` or `GET /reports/:id`; `PATCH /reports/:id/extracted-data` `{corrections}`; `PUT /reports/:id/confirm` `{confirmedData}` | All require JWT; authorization is enforced in controllers | **PARTIAL.** Isolated P0 tests verify extraction edits, confirmation, ownership denials, and immutable OCR/source data. No valid multipart upload/OCR engine round-trip was exercised. |
| Diabetes risk | `POST /predictions/diabetes` with prediction input; latest/history GETs accept `patientId` query | JWT required; feature building uses confirmed report data | **PARTIAL.** P0 verifies cross-patient and unassigned-doctor denials. A successful authenticated diabetes request was not exercised here. |
| Heart disease risk | `POST /predictions/heart-disease`; latest/history GETs accept `patientId` | JWT required | **PARTIAL.** Backend synthetic integration suite verifies feature policy, FastAPI health/inference response, validation and disclaimer behavior; no frontend authenticated request was made. |
| Appointments | `GET /appointments?patientId=…`; `POST /appointments` with patient/doctor/date/time/reason; `PUT /appointments/:id` `{status,notes}` | JWT required | **PARTIAL.** Routes and payloads match statically; appointment create/update/list were not exercised. |
| Notifications | `GET /notifications`; `PUT /notifications/:id/read`; `PUT /notifications/read-all` | JWT required | **PARTIAL.** Route mapping and auth middleware inspected; no notification workflow test was run. |
| Doctor patient access | Patient requests/doctor accepts through `/relationships`; doctor then calls patient/report reads | JWT; relationship-scoped controller checks | **PASS.** P1 exercises request, acceptance, access to permitted patient/report, denial to unrelated doctor, switching primary doctor and revoke. |
| CHO outreach | `GET /patients?village=…`; profile reads | JWT and CHO role | **PASS (API authorization only).** P0 verifies community directory and patient profile responses; no CHO browser session was run. |
| Admin user management | `GET /users`, `POST /users` `{name,email,password,role,village,phone}`, `DELETE /users/:id` | JWT and Admin role | **PARTIAL.** New POST is exercised with Admin success, linked Patient profile, password non-disclosure, and Patient denial. Listing/deletion were not separately exercised. |
| Invalid/expired token | Bearer token on protected API calls | `verifyJWT` returns auth errors; Axios clears saved session on 401 | **PARTIAL.** Protected route denials are exercised; an explicit expired-token test was not run. |

No real patient data or remote DB was used in the verification above. The test corpus uses synthetic fixtures.

## Dependency audit

- **PASS — Safe compatible fix.** The frontend audit initially reported 16 vulnerabilities: 2 critical, 8 high, and 6 moderate. Updated compatible dependencies with `npm update axios react-router-dom`; the resolved Axios version is 1.20.0 and the audit count is now 15: 2 critical, 7 high, 6 moderate. Production-only audit now has 2 moderate and no high/critical findings.
- **PARTIAL — Remaining production findings.** Both are React Router 6 advisories, affecting `react-router-dom` directly and its `react-router` dependency. Audit remediation offers React Router 7.18.4, a major upgrade. The app is client-rendered, but the open-redirect advisory still needs a compatibility/security review before upgrading; no major migration was forced.
- **PARTIAL — Development tool findings.** Remaining critical findings involve Vitest and transitive `tinypool`; high findings include Vite/Tailwind and transitive build tooling; moderate findings include `esbuild`, PostCSS packages, and `vite-node`. Audit fixes offered for Vitest 4.1.11, Vite 8.3.4, and Tailwind 4.3.3 are major upgrades. They were left unchanged pending a compatibility plan. These dependencies are development/build-time, not shipped as production runtime packages.

## Remaining actions and limits

- **BLOCKED — Operator action:** rotate the exposed MongoDB credential, review database provider audit logs and backups for the test window, and determine whether the unfiltered P1 collection deletes affected real Doctor/relationship/invitation data. Do not restore until the current state is preserved and the intended recovery point is known.
- **PARTIAL — End-to-end verification:** run authenticated browser flows for login/current user, report upload/OCR/confirmation, both predictions, appointments, notifications, and Admin list/delete against an isolated staging database with OCR/ML services available.
- **PARTIAL — Dependency remediation:** schedule compatibility work for React Router 7 and the Vite/Vitest/Tailwind major upgrades, then rerun the full UI checks.
- **PASS — Hero preservation:** no cinematic hero source, footage, or scroll behavior was changed in this diagnostics pass. Build and browser hero evidence remain as recorded in `FRONTEND_INTEGRATION_AUDIT.md`.
