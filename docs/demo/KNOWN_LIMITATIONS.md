# MedScan-NCD: Known Limitations & Clinical Scope Boundaries

> **Disclosure:** To maintain academic and technical integrity, this document details incomplete features, engineering boundaries, and model limitations that must not be misrepresented during faculty evaluation.  
> **`SYNTHETIC — FOR DEMONSTRATION ONLY`**

---

## 1. Machine Learning & Clinical Boundaries

### 1.1 Non-Diagnostic Decision Support
* **Limitation:** Model outputs represent statistical risk probabilities derived from cohort datasets (NHANES, Framingham, UCI).
* **Clinical Boundary:** They do **not** constitute an autonomous clinical diagnosis, diagnostic confirmation, or prescription treatment plan. They are designed strictly as decision-support screening aids for primary healthcare and triage workflows.

### 1.2 Hypertension Model Non-BP Constraint
* **Limitation:** The Hypertension model strictly omits measured systolic and diastolic blood pressure from its input features to prevent circular reasoning.
* **Clinical Boundary:** The model estimates the probability of diagnosed or treated hypertension from non-blood-pressure cardiometabolic indicators. It does not predict future-onset hypertension in normotensive individuals.

### 1.3 Chronic Kidney Disease Minimal Feature Schema
* **Limitation:** The production CKD model is trained and validated on a minimal 2-feature vector: `age` and `serum_creatinine`.
* **Clinical Boundary:** Although `blood_urea` is parsed, normalized, and displayed in the patient's general health record, it is deliberately excluded from the CKD model vector to adhere strictly to the validated production schema. Evaluators should be informed that blood urea is stored for longitudinal tracking, not fed into this specific model.

### 1.4 Linear Attribution Phrasing
* **Limitation:** Factor contributions displayed in the UI use linear approximations and TreeSHAP directional attributions.
* **Clinical Boundary:** Phrasing is deliberately non-causal (*"contributed toward higher model-estimated risk"*). It must not be interpreted as a physiological root cause for a specific individual's health state.

---

## 2. Platform & Engineering Boundaries

### 2.1 Clinical Staff Self-Registration
* **Boundary:** Doctor, CHO, and Admin accounts cannot self-register through the public `/register` form.
* **Rationale:** By design, clinical and administrative roles require institutional authorization. In production, they are enrolled through administrative management; in the demonstration environment, they are provisioned via `npm run seed:faculty-demo`.

### 2.2 OCR Engine Dependencies
* **Boundary:** Digital PDF documents (`.pdf`) are parsed directly using native text stream extractors (`pdf-parse`) and do not require external binaries.
* **Limitation:** Image-based reports (`.png`, `.jpeg`) rely on Tesseract OCR. If Tesseract is not installed in the operating system environment, optical image uploads will return an OCR error, whereas digital PDFs continue to function.

### 2.3 Cloud Storage Fallback
* **Boundary:** When Cloudinary environment variables (`CLOUDINARY_API_KEY`) are not provided, the backend automatically activates a controlled local file storage fallback in `backend/uploads/`.
* **Behavior:** Reports upload and process locally without requiring an internet connection or external cloud API credentials.

### 2.4 Retired Features
* **Boundary:** The legacy Family Member and Nurse roles have been retired in favor of the unified four-role clinical architecture (Patient, Doctor, CHO, Admin).
* **Behavior:** Deprecated routes (e.g. `/api/invitations/family`) return HTTP `410 Gone`, and legacy tokens are explicitly rejected.
