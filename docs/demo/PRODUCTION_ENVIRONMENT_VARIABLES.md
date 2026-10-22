# MedScan-NCD: Production Environment Variables Reference

This master reference catalogs every environment variable used across the MedScan-NCD platform for both local development and hosted cloud deployments.

> **Security Mandate:** Never commit real secrets, API keys, or production passwords to version control. All committed `.env.example` files in the repository contain only sanitized placeholders.

---

## 1. Master Environment Variables Matrix

| Variable Name | Service | Purpose / Configuration | Secret? | Required Scope | Where to Obtain or Generate |
|---|---|---|---|---|---|
| `NODE_ENV` | Backend | Sets runtime mode (`production` vs `development`). | No | Hosted Demo, Prod | Set to `production` in hosting dashboard. |
| `PORT` | Backend, ML | HTTP listening port. | No | Both | Defaults to `5000` (Node) / `8000` (Python); Render supplies `$PORT` dynamically. |
| `MONGODB_URI` | Backend | Dedicated database connection string. | **YES** | Both | MongoDB Atlas cluster dashboard (**Connect** → **Drivers**). Must point to `medscan_ncd_faculty_demo`. |
| `JWT_ACCESS_SECRET` | Backend | Signs short-lived user authentication tokens. | **YES** | Both | Generate via PowerShell or `openssl rand -hex 32`. |
| `JWT_REFRESH_SECRET` | Backend | Signs session refresh tokens. | **YES** | Both | Generate via PowerShell or `openssl rand -hex 32`. |
| `JWT_ACCESS_EXPIRE` | Backend | Lifetime of access tokens. | No | Both | Default: `1d` |
| `JWT_REFRESH_EXPIRE` | Backend | Lifetime of refresh tokens. | No | Both | Default: `7d` |
| `CLIENT_URL` | Backend | Allowed CORS origin for frontend requests. | No | Hosted Demo, Prod | Your deployed frontend URL (e.g. `https://medscan-ncd.vercel.app`). |
| `FRONTEND_URL` | Backend | Base URL embedded in verification/reset email links. | No | Both | Same as `CLIENT_URL` (e.g. `https://medscan-ncd.vercel.app`). |
| `ALLOWED_ORIGINS` | Backend | Optional comma-separated secondary CORS origins. | No | Hosted Demo, Prod | E.g. `https://medscan-ncd.vercel.app,https://yourdomain.com` |
| `CLOUDINARY_CLOUD_NAME` | Backend | Cloudinary cloud account name for medical report storage. | No | Hosted Demo, Prod | Cloudinary Dashboard (**Account Details**). |
| `CLOUDINARY_API_KEY` | Backend | Cloudinary API Key. | **YES** | Hosted Demo, Prod | Cloudinary Dashboard (**API Keys**). |
| `CLOUDINARY_API_SECRET` | Backend | Cloudinary API Secret. | **YES** | Hosted Demo, Prod | Cloudinary Dashboard (**API Keys**). |
| `LOCAL_STORAGE_FALLBACK` | Backend | Falls back to local disk if Cloudinary is unconfigured. | No | Both | Set to `false` in cloud hosting (Render ephemeral disk loses files); `true` for local development. |
| `ML_SERVICE_URL` | Backend | Base URL to Python FastAPI service. | No | Both | `https://<your-ml-service>.onrender.com` (Hosted) or `http://localhost:8000` (Local). |
| `DIABETES_ML_SERVICE_URL`| Backend | Base URL to Python FastAPI service. | No | Both | `https://<your-ml-service>.onrender.com` (Hosted) or `http://localhost:8000` (Local). |
| `ML_INTERNAL_API_KEY` | Backend, ML | Cryptographic key securing backend-to-FastAPI inference calls. | **YES** | Both | Generate via PowerShell or `openssl rand -base64 32`. Must match exactly in both services. |
| `EMAIL_HOST` | Backend | SMTP server hostname. | No | Both | Default: `smtp.gmail.com` |
| `EMAIL_PORT` | Backend | SMTP server port. | No | Both | Default: `587` |
| `EMAIL_SECURE` | Backend | Enforces SSL/TLS on connect (STARTTLS uses false on port 587).| No | Both | Default: `false` |
| `EMAIL_USER` | Backend | Sender email address for notification delivery. | No | Both | Your Gmail account (e.g. `your-email@gmail.com`). |
| `EMAIL_PASS` | Backend | Authentication credential for SMTP. | **YES** | Both | Google Account → Security → **App Passwords** (16 characters). |
| `EMAIL_FROM` | Backend | "From" address visible in recipient email clients. | No | Both | E.g. `noreply@medscan.yourdomain.com` |
| `EMAIL_FROM_NAME` | Backend | Display name visible in recipient inbox. | No | Both | Default: `MedScan-NCD Platform` |
| `EMAIL_VERIFICATION_EXPIRY_MINUTES` | Backend | Activation token expiry window. | No | Both | Default: `30` |
| `PASSWORD_RESET_EXPIRY_MINUTES` | Backend | Password recovery token expiry window. | No | Both | Default: `15` |
| `RATE_LIMIT_MAX` | Backend | Maximum API requests per 15 minutes per IP. | No | Hosted Demo, Prod | Default: `1500` |
| `AUTH_RATE_LIMIT_MAX` | Backend | Maximum authentication attempts per 15 minutes per IP. | No | Hosted Demo, Prod | Default: `30` |
| `DEMO_USER_PASSWORD` | Backend (Seed) | Password for seeded demonstration accounts. | **YES** | Demo Only | Default: `MedScanDemo!2026` |
| `ADMIN_DEMO_PASSWORD` | Backend (Seed) | Private custom password for Admin demo account. | **YES** | Demo Only | Configure privately or let script deliver to `.demo_credentials.local.json`. |
| `DEMO_SEED_CONFIRM` | Backend (Seed) | Safety guard required to seed non-loopback databases. | No | Hosted Demo | Must be set to `true` when seeding MongoDB Atlas. |
| `VITE_API_URL` | Frontend | Base URL to Express API. | No | Both | `https://<your-backend>.onrender.com/api` (Hosted) or `http://localhost:5000/api` (Local). Normalizes automatically. |
| `VITE_ENABLE_DEMO_ACCOUNTS` | Frontend | Toggles demo accounts selection panel on `/login`. | No | Both | `true` for faculty presentation; `false` for clinical production. |

---

## 2. Secret Generation Reference

Run either of these commands to generate cryptographically random keys for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `ML_INTERNAL_API_KEY`:

### Windows PowerShell:
```powershell
# 64-character Hex string (for JWT_ACCESS_SECRET and JWT_REFRESH_SECRET):
[Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLower()

# 32-character Base64 string (for ML_INTERNAL_API_KEY):
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(24))
```

### Linux / macOS Bash:
```bash
# 64-character Hex string:
openssl rand -hex 32

# 32-character Base64 string:
openssl rand -base64 32
```

---

## 3. Client Bundle Security Invariant

The React/Vite frontend bundle includes only variables prefixed with `VITE_`.
- `VITE_API_URL` contains only the public backend API endpoint.
- `VITE_ENABLE_DEMO_ACCOUNTS` contains only a boolean string (`true` or `false`).
- **No secrets, database URIs, JWT secrets, or administrative credentials ever enter the client bundle.**
