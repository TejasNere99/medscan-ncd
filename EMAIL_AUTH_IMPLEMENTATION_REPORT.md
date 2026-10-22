# MedScan-NCD Email Verification & Password Recovery Implementation Report

**Document ID:** MEDSCAN-SEC-AUTH-002  
**Status:** IMPLEMENTED & VERIFIED  
**Date:** October 2026  
**Audience:** Security Architects, Full-Stack Engineers, System Administrators

---

## 1. Executive Summary

A complete, production-grade email verification and password recovery system has been integrated into **MedScan-NCD**. Previously, public self-registration allowed accounts to immediately receive JWT tokens and access health dashboards without proving ownership of the registered email.

With this implementation:
1. **Mandatory Email Verification:** Newly registered password-based accounts are created in an unverified state (`isEmailVerified: false`). No login session or JWT tokens are issued upon registration.
2. **Cryptographic Single-Use Tokens:** Verification and password reset tokens use `crypto.randomBytes(32)` (256-bit entropy). Only SHA-256 hashes are stored in MongoDB with strict expiration windows (30 minutes for email verification, 15 minutes for password recovery).
3. **Backend Middleware Enforcement:** `verifyJWT` strictly halts any unverified account (`403 Forbidden`) with an explicit error requiring verification, preventing any bypass via forged or stale tokens.
4. **Resend Cooldown & Anti-Enumeration:** Endpoints protect against email spam and account enumeration using generic responses and a 60-second cooldown timer.
5. **Centralized Email Service:** Built on **Nodemailer** with support for Gmail SMTP (App Passwords) and custom SMTP providers, featuring responsive HTML email templates with plain-text alternatives, operational error sanitization, and test simulation.

---

## 2. Files Added and Modified

### Backend Files Added
- [`backend/src/services/emailService.js`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/backend/src/services/emailService.js): Centralized email dispatch service with SMTP transporter, timeout guards, operational logging sanitization, and test assertion capture.
- [`backend/src/templates/emailTemplates.js`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/backend/src/templates/emailTemplates.js): Responsive, medical-themed HTML email layouts for Verification, Password Reset, and Welcome notifications with plain-text fallbacks.
- [`backend/tests/email_auth_lifecycle.test.js`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/backend/tests/email_auth_lifecycle.test.js): Comprehensive 17-test integration suite covering unverified account creation, token hashing, single-use invalidation, cooldowns, reset cycles, and protected route access control.

### Backend Files Modified
- [`backend/src/models/User.js`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/backend/src/models/User.js): Added `isEmailVerified`, `emailVerificationToken` (select: false), `emailVerificationExpire` (select: false), and token exclusion in `toJSON()`. Added synchronization hook between `isEmailVerified` and `isVerified`.
- [`backend/src/controllers/authController.js`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/backend/src/controllers/authController.js): Implemented `register` (unverified state + email dispatch), `verifyEmail`, `resendVerification`, `forgotPassword`, `resetPassword`, and updated `login` to reject unverified users with code `EMAIL_NOT_VERIFIED`.
- [`backend/src/routes/authRoutes.js`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/backend/src/routes/authRoutes.js): Added `/verify-email`, `/verify-email/:token`, `/resend-verification`, `/forgot-password`, `/reset-password`, and `/reset-password/:token` routes with rate limiting.
- [`backend/src/middleware/auth.js`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/backend/src/middleware/auth.js): Added unverified user block in `verifyJWT`.
- [`backend/src/controllers/userController.js`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/backend/src/controllers/userController.js): Configured Admin account provisioning to set `isEmailVerified: true` for staff.
- [`backend/src/config/email.js`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/backend/src/config/email.js): Forwarded legacy email wrapper to the centralized email service.
- [`backend/.env.example`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/backend/.env.example) & [`.env`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/backend/.env): Added email configuration placeholders and expiry settings.
- [`backend/tests/auth.test.js`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/backend/tests/auth.test.js): Updated to assert unverified state upon registration and login blockage until verified.
- [`backend/scripts/seed-demo.js`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/backend/scripts/seed-demo.js) & [`backend/src/seed/seed.js`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/backend/src/seed/seed.js): Ensured demo seed accounts remain verified.

### Frontend Files Added & Modified
- [`frontend/src/pages/auth/VerifyEmail.jsx`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/frontend/src/pages/auth/VerifyEmail.jsx): New verification screen with verifying loader, success state with sign-in CTA, and expired/invalid error handling with in-place resend form.
- [`frontend/src/pages/auth/Register.jsx`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/frontend/src/pages/auth/Register.jsx): Added password confirmation field, 8-character minimum enforcement, and instant transition to "Check Your Inbox" view with 60-second resend cooldown timer.
- [`frontend/src/pages/auth/ForgotPassword.jsx`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/frontend/src/pages/auth/ForgotPassword.jsx): Enhanced with security messaging, 15-minute expiration guidance, and anti-enumeration feedback.
- [`frontend/src/pages/auth/ResetPassword.jsx`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/frontend/src/pages/auth/ResetPassword.jsx): Supports both `?token=` and `/:token`, validates password matching and length, atomic token consumption, and redirect to sign-in.
- [`frontend/src/pages/auth/Login.jsx`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/frontend/src/pages/auth/Login.jsx): Added unverified account banner with direct "Resend Verification Email" action and working "Forgot password?" link.
- [`frontend/src/services/authService.js`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/frontend/src/services/authService.js): Added `verifyEmail`, `resendVerification`, `forgotPassword`, and `resetPassword` methods.
- [`frontend/src/context/AuthContext.jsx`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/frontend/src/context/AuthContext.jsx): Stopped storing sessions for unverified registrations; enforced verified status check in `fetchCurrentUser`.
- [`frontend/src/routes/AppRoutes.jsx`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/frontend/src/routes/AppRoutes.jsx): Added `/verify-email`, `/verify-email/:token`, and `/reset-password` routes.
- [`frontend/src/routes/ProtectedRoute.jsx`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/frontend/src/routes/ProtectedRoute.jsx): Enforced unverified user redirection to `/login`.
- [`frontend/src/__tests__/EmailAuth.test.jsx`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/frontend/src/__tests__/EmailAuth.test.jsx): 7 Vitest frontend unit tests covering Register, VerifyEmail, ForgotPassword, ResetPassword, and Login verification banner.

---

## 3. Final API Contract Specification

| Method | Endpoint | Description | Request Body / Params | Status & Response Summary |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | Register an unverified Patient account and dispatch token | `{ name, email, password, village? }` | `201 Created`: `{ user: { email, isEmailVerified: false }, emailDelivered: true }` |
| `POST` | `/api/auth/verify-email` | Validate verification token & activate account | `{ token }` (or query/param) | `200 OK`: `{ isEmailVerified: true }` / `400 Bad Request` if expired or used |
| `POST` | `/api/auth/resend-verification` | Invalidate previous token and dispatch fresh email | `{ email }` | `200 OK`: Generic anti-enumeration response / `429 Too Many Requests` if within 60s cooldown |
| `POST` | `/api/auth/login` | Authenticate eligible, verified accounts only | `{ email, password }` | `200 OK`: `{ user, accessToken, refreshToken }` / `403 Forbidden`: `EMAIL_NOT_VERIFIED` / `401 Unauthorized` |
| `POST` | `/api/auth/forgot-password` | Request password reset email | `{ email }` | `200 OK`: Generic response / `429 Too Many Requests` if within 60s cooldown |
| `POST` | `/api/auth/reset-password` | Validate reset token & set new password | `{ token, newPassword, confirmPassword? }` | `200 OK`: Password updated / `400 Bad Request` if invalid or already consumed |
| `POST` | `/api/auth/logout` | Invalidate session | None (Bearer Token) | `200 OK` |
| `GET` | `/api/auth/me` | Retrieve profile of authenticated, verified user | None (Bearer Token) | `200 OK`: `{ user, patient }` / `403 Forbidden` if unverified |

---

## 4. MongoDB Schema & Security Invariants

### User Schema Extensions
```javascript
{
  isEmailVerified: {
    type: Boolean,
    default: false,
    index: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: {
    type: String,
    select: false, // Never returned in default Mongoose queries
  },
  emailVerificationExpire: {
    type: Date,
    select: false,
  },
  resetPasswordToken: {
    type: String,
    select: false,
  },
  resetPasswordExpire: {
    type: Date,
    select: false,
  }
}
```

### Cryptographic Invariants
1. **Raw Tokens in Flight Only:** Raw tokens (`crypto.randomBytes(32).toString('hex')`) are transmitted solely inside the email URL link (`/verify-email?token=...` or `/reset-password?token=...`).
2. **Database Hash Storage:** MongoDB only ever stores `crypto.createHash('sha256').update(token).digest('hex')`. A database leak or compromise cannot expose usable verification or reset tokens.
3. **Atomic Consumption:** When a token is redeemed, the token hash and expiration fields are atomically set to `undefined` in the same operation as setting `isEmailVerified: true` or updating `passwordHash`.
4. **Strict Expirations:** Email verification tokens expire in 30 minutes; password reset tokens expire in 15 minutes.
5. **No Password/Token Leakage:** `toJSON()` on the User model strips `passwordHash`, `emailVerificationToken`, `emailVerificationExpire`, `resetPasswordToken`, and `resetPasswordExpire` from any JSON serialization.

---

## 5. Automated Test Results

### Backend Test Suite
Executed via isolated MongoDB test database runner:
```powershell
npm test
```
**Results:**
```text
PASS tests/authenticated_workflows.test.js
PASS tests/new_disease_prediction_service.test.js
PASS tests/security_rbac_p1.test.js
PASS tests/community_care.test.js
PASS tests/medicine.test.js
PASS tests/email_auth_lifecycle.test.js (17 tests)
PASS tests/auth.test.js (5 tests)
PASS tests/heart_disease_integration.test.js
PASS tests/cbc_extraction.test.js
PASS tests/blood_urea_extraction.test.js
PASS tests/new_disease_feature_builder.test.js
PASS tests/manual_correction.test.js
PASS tests/security_rbac_p0.test.js

Test Suites: 13 passed, 13 total
Tests:       1 skipped, 135 passed, 136 total
Snapshots:   0 total
Time:        70.656 s
```

### Frontend Test Suite
Executed via Vitest:
```powershell
npx vitest run src/__tests__/EmailAuth.test.jsx
```
**Results:**
```text
✓ src/__tests__/EmailAuth.test.jsx (7 tests)
  ✓ Register Component > renders all registration fields including password confirmation
  ✓ Register Component > validates password match and shows check inbox screen on successful registration
  ✓ VerifyEmail Component > shows success screen when token verification succeeds
  ✓ VerifyEmail Component > shows error screen and resend action when token is invalid or expired
  ✓ ForgotPassword Component > submits email and displays confirmation notice without revealing account existence
  ✓ ResetPassword Component > validates matching passwords and calls resetPassword service
  ✓ Login Component Verification Banner > displays email verification warning banner when login encounters EMAIL_NOT_VERIFIED

Test Files: 1 passed (1)
Tests:      7 passed (7)
```

### Production Build Verification
Executed via Vite:
```powershell
npm run build
```
**Result:** 2,737 modules transformed into clean production bundles in `frontend/dist/` with zero bundling or syntax errors.

---

## 6. Email Setup & Operational Guide

### 6.1 Configuring Gmail SMTP with App Passwords

Google accounts require a **Gmail App Password** rather than your primary password:

1. Sign in to your Google Account at [https://myaccount.google.com/](https://myaccount.google.com/).
2. Navigate to **Security** → **How you sign in to Google**.
3. Ensure **2-Step Verification** is turned **ON**.
4. Search for **App passwords** (or visit [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)).
5. Enter an app name (e.g. `MedScan-NCD`) and click **Create**.
6. Google displays a 16-character code (e.g., `abcd efgh ijkl mnop`).
7. Copy this password and paste it into `backend/.env` without spaces:
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your_sender_address@gmail.com
   EMAIL_PASS=abcdefghijklmnop
   EMAIL_FROM=your_sender_address@gmail.com
   EMAIL_FROM_NAME="MedScan-NCD Healthcare Platform"
   FRONTEND_URL=http://localhost:5173
   EMAIL_VERIFICATION_EXPIRY_MINUTES=30
   PASSWORD_RESET_EXPIRY_MINUTES=15
   ```

### 6.2 Simulation & Development Fallback
If `EMAIL_USER` or `EMAIL_PASS` contain default placeholder values or are omitted:
- The system automatically engages **Email Simulation Mode**.
- Emails are safely captured in memory and logged to the server console as:
  ```text
  [EmailService:Simulated] Email to: user@example.com | Subject: "Verify your email address — MedScan-NCD"
  ```
- No real SMTP connection is attempted, preventing errors during local development without credentials.
- In automated test runs (`NODE_ENV=test`), sent emails are retained in memory for test assertions and zero network requests are made.

### 6.3 Common Troubleshooting Steps
- **`EAUTH` / Authentication Failed:** Verify 2-Step Verification is active and you are using a 16-character App Password, not your standard Gmail account password.
- **Connection Timeout on Port 465 / 587:** Some local ISPs or corporate firewalls block port 587. Set `EMAIL_PORT=465` and `EMAIL_SECURE=true`, or check network firewall egress rules.
- **Link Points to Wrong Host in Production:** Ensure `FRONTEND_URL` in `backend/.env` matches your deployed domain (e.g. `https://medscan-ncd.yourdomain.com`).
