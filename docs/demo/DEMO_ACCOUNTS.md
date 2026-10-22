# MedScan-NCD: Demonstration Accounts & Role Credentials

> **Notice:** All accounts listed below are populated with synthetic demonstration data strictly for software testing and faculty presentation.  
> **`SYNTHETIC — FOR DEMONSTRATION ONLY`**

---

## 1. Primary Role Demonstration Accounts

Every role natively supported by MedScan-NCD has a dedicated demonstration account pre-configured with realistic clinical profiles, relational linkages, and persisted test fixtures.

**Demonstration Credentials Policy:**
- **Clinical & Patient Demo Accounts (Patient, Doctor, CHO):** Standard demonstration password `MedScanDemo!2026` (or configured via `DEMO_USER_PASSWORD`).
- **System Administrator (Admin):** To preserve administrative security, the Admin account password is never committed in plaintext to the public repository. It is generated/configured upon seeding and delivered privately to the Git-ignored local file `.demo_credentials.local.json` on your host. You can also customize it using the environment variable `ADMIN_DEMO_PASSWORD`.

| Role | Display Name | Demo Email | Catchment / Village | Seeded Features & Focus |
|---|---|---|---|---|
| **Patient** | Aarav Sharma | `synthetic.patient.a@example.com`<br>*(Alias: `patient@example.com`)* | Demo Community Central | Lower-risk profile, sequential reports (baseline & follow-up), pending review report, active prescriptions, appointments. |
| **Doctor** | Dr. Demo Clinician | `doctor@example.com` | District Demonstration Hospital | Authorized patient list (Patients A, B, C), pending consultation request from Patient D, appointment review, prescriptions. |
| **CHO** | Demo Community Health Officer | `cho@example.com` | Demo Community Central *(Coverage: Central, South, East)* | Population analytics across 3 villages, 3 scheduled follow-ups (overdue, due soon, completed), 3 referrals (pending, accepted, completed). |
| **Admin** | Demo Administrator | `admin@example.com` | Central Administration | Global user access directory (Patients, Clinicians, CHOs, Admins), role filter, add/delete accounts, platform settings. *(Password delivered privately in `.demo_credentials.local.json`)* |

---

## 2. Additional Synthetic Patient Personas

In addition to the primary Patient demo account, three secondary synthetic patient personas are seeded to demonstrate distinct clinical profiles, edge cases, and community workflows:

| Persona Name | Email | Clinical Scenario | Demonstration Value |
|---|---|---|---|
| **Rajesh Patel** | `synthetic.patient.b@example.com` | Elevated fasting glucose ($145\text{ mg/dL}$), BMI $31.0$, Active Smoker | Cardiometabolic elevated risk across Diabetes, Heart Disease, and Hypertension; active Metformin and Atorvastatin prescriptions; past consultation. |
| **Sunita Rao** | `synthetic.patient.c@example.com` | Severe renal impairment: Serum Creatinine $2.4\text{ mg/dL}$, Blood Urea $65\text{ mg/dL}$ | Demonstrates the minimal 2-feature Chronic Kidney Disease (CKD) model ($100\%$ positive classification); pending hospital referral; overdue CHO follow-up. |
| **Priya Nair** | `synthetic.patient.d@example.com` | Borderline pre-hypertension, awaiting doctor acceptance | Has a **PENDING** consultation request to Dr. Demo Clinician; demonstrates the doctor's "Accept / Decline" connection workflow in clinic. |
| **Karan Verma** | `synthetic.patient.e@example.com` | Newly registered community beneficiary | Registered in Demo Community South without any uploaded reports; demonstrates CHO data-quality metrics for un-screened population cohorts. |

---

## 3. How to Log In via the Web Interface

### Option A: Convenient One-Click Demo Selection (Recommended for Presentation)
1. Open the application login screen: `http://localhost:5173/login`.
2. Locate the **"Demo Accounts"** panel above the sign-in form.
3. Click any of the four demo role cards:
   - **Use Patient demo**
   - **Use Doctor demo**
   - **Use CHO demo**
   - **Use Admin demo**
4. The form will automatically populate the email and password for that role.
5. Click **"Sign In"**.
6. The application authenticates via the backend API (`/api/auth/login`) and automatically navigates to that role's dedicated workspace:
   - Patient: `/patient/dashboard`
   - Doctor: `/doctor/dashboard`
   - CHO: `/cho/dashboard`
   - Admin: `/admin/dashboard`

### Option B: Manual Credential Entry
You can also manually type any demo email and the password `MedScanDemo!2026` into the standard login inputs.

---

## 4. Production Security & Safeguards

1. **No Authentication Backdoors:** The demo buttons do not bypass JWT authentication, email verification checks, or password hashing. They fill the standard login form and execute a genuine `POST /api/auth/login` request.
2. **Backend Role Enforcement:** User roles are stored in MongoDB and verified on every API request via JWT claims. Selecting a role on the client cannot elevate privileges or grant access to another role's dashboard.
3. **Environment Isolation:** Demo account convenience controls are active in local development (`import.meta.env.DEV`) and when explicitly configured (`VITE_ENABLE_DEMO_ACCOUNTS=true`). Production deployments without this flag render only standard sign-in inputs.
