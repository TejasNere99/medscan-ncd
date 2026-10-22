# MEDSCAN-NCD: SYNTHETIC MEDICAL REPORT GENERATION, FOUR-MODEL TESTING & VERIFICATION REPORT

**Document Type:** Formal Technical Verification & Quality Assurance Report  
**Date:** October 21, 2026  
**Audience:** Faculty Evaluators, Engineering Team, Quality Assurance Reviewers  
**Synthetic Disclaimer:** `SYNTHETIC — FOR DEMONSTRATION ONLY`

---

## 1. Executive Summary

This report documents the verification, synthetic dataset generation, pipeline integration, and automated testing of the **MedScan-NCD** platform across all four target chronic diseases:
1. **Diabetes Mellitus Type 2** (Serialized XGBoost classifier)
2. **Heart Disease / 10-Year Coronary Heart Disease** (Serialized Regularized Logistic Regression)
3. **Hypertension** (Serialized Gradient Boosting Classifier)
4. **Chronic Kidney Disease (CKD)** (Serialized Logistic Regression — Minimal 2-Feature Production Model)

All testing was executed against the **actual saved model artifacts** using the **real prediction microservice**, real database records, and real OCR/parsing pipelines. No model was retrained, modified, or bypassed. No output probabilities or prediction percentages were fabricated or hard-coded.

---

## 2. Model Artifacts & Architecture Verification

All four model artifact directories were inspected and verified prior to fixture creation:

| Target Disease | Artifact Path | Model Family | Serialized Artifact Type | Held-Out ROC-AUC | Features Count |
|---|---|---|---|---|---|
| **Diabetes** | `ml_model/artifacts/diabetes/v1/model.joblib` | XGBoost Classifier | `joblib` binary + schema JSON | 0.8410 | 8 |
| **Heart Disease** | `ml_model/artifacts/heart_disease/v1/model.joblib` | Logistic Regression (L2) | `joblib` binary + metadata JSON | 0.7380 | 8 (5 required, 3 optional) |
| **Hypertension** | `ml_model/artifacts/hypertension/v1/model.joblib` | Gradient Boosting Classifier | `joblib` binary + schema JSON | 0.8233 | 5 (demographics, habits, BMI, glucose) |
| **CKD** | `ml_model/artifacts/kidney_disease/v1/model.joblib` | Logistic Regression (L2) | `joblib` binary + metadata JSON | 0.9130 | 2 (`age`, `serum_creatinine`) |

### Invariant Architectural Constraints Verified:
1. **Hypertension Non-Contamination:** As verified in `ml_model/artifacts/hypertension/v1/feature_schema.json` and `backend/src/services/newDiseaseFeatureBuilder.js`, the Hypertension model **strictly excludes systolic and diastolic blood pressure** from input features to avoid label leakage and circular prediction.
2. **CKD Minimal Feature Schema:** As verified in `ml_model/artifacts/kidney_disease/v1/feature_schema.json`, the production CKD model uses **only `age` and `serum_creatinine`**. While `blood_urea` is parsed, normalized, and stored in the patient's longitudinal health record, it is strictly excluded from the CKD feature builder.

---

## 3. Comprehensive Feature Compatibility Matrix

| Disease | Canonical Feature | Required? | Type | Accepted Units | Parser Aliases | Unit Conversion | Missing Behavior | Provenance Required? | Verified? |
|---|---|---|---|---|---|---|---|---|---|
| **Diabetes** | `glucose` | Yes | Float | mg/dL, mmol/L | Fasting Glucose, Blood Sugar, FBG, FBS | mmol/L × 18.0182 | Rejects (`INSUFFICIENT_DATA`) | Yes (Confirmed) | Yes |
| **Diabetes** | `bmi` | Yes | Float | kg/m² | BMI, Body Mass Index | Calculated if Ht/Wt present | Rejects (`INSUFFICIENT_DATA`) | Yes (Confirmed) | Yes |
| **Diabetes** | `age` | Yes | Integer | years | Age, Patient Age | None | Rejects (`INSUFFICIENT_DATA`) | Yes (Confirmed) | Yes |
| **Diabetes** | `hba1c` | Optional | Float | %, mmol/mol | HbA1c, Glycated Hemoglobin | IFCC to NGSP formula | Imputed / Ignored by sub-model | Yes (Confirmed) | Yes |
| **Heart Disease** | `age` | Yes | Integer | years | Age, Patient Age | None | Rejects (`INSUFFICIENT_DATA`) | Yes (Profile/Report) | Yes |
| **Heart Disease** | `male` | Yes | Integer (0/1)| gender | Sex, Gender | Male=1, Female=0 | Rejects (`INSUFFICIENT_DATA`) | Yes (Demographic) | Yes |
| **Heart Disease** | `totChol` | Yes | Float | mg/dL, mmol/L | Total Cholesterol, Chol, S. Cholesterol | mmol/L × 38.67 | Rejects (`INSUFFICIENT_DATA`) | Yes (Confirmed) | Yes |
| **Heart Disease** | `sysBP` | Yes | Float | mmHg | Systolic BP, SBP, BP (Systolic) | None | Rejects (`INSUFFICIENT_DATA`) | Yes (Confirmed) | Yes |
| **Heart Disease** | `diaBP` | Yes | Float | mmHg | Diastolic BP, DBP, BP (Diastolic) | None | Rejects (`INSUFFICIENT_DATA`) | Yes (Confirmed) | Yes |
| **Heart Disease** | `currentSmoker` | Optional | Integer (0/1)| boolean/string | Smoker, Smoking Status | Yes/1, No/0 | Median Imputed (`PARTIAL` flag)| Yes (Survey/Profile)| Yes |
| **Heart Disease** | `bmi` | Optional | Float | kg/m² | BMI, Body Mass Index | None | Median Imputed (`PARTIAL` flag)| Yes (Confirmed) | Yes |
| **Heart Disease** | `glucose` | Optional | Float | mg/dL, mmol/L | Blood Glucose, Sugar, FBG | mmol/L × 18.0182 | Median Imputed (`PARTIAL` flag)| Yes (Confirmed) | Yes |
| **Hypertension** | `age` | Yes | Integer | years | Age, Patient Age | None | Rejects (`INSUFFICIENT_DATA`) | Yes (Profile/Report) | Yes |
| **Hypertension** | `sex` | Yes | Categorical | male/female | Sex, Biological Sex | 'M' / 'F' | Rejects (`INSUFFICIENT_DATA`) | Yes (Demographic) | Yes |
| **Hypertension** | `bmi` | Yes | Float | kg/m² | BMI, Body Mass Index | None | Rejects (`INSUFFICIENT_DATA`) | Yes (Confirmed) | Yes |
| **Hypertension** | `fasting_blood_sugar`| Yes | Float | mg/dL, mmol/L | Fasting Glucose, FBG, Sugar | mmol/L × 18.0182 | Rejects (`INSUFFICIENT_DATA`) | Yes (Confirmed) | Yes |
| **Hypertension** | `current_smoker`| Yes | Integer (0/1)| boolean/string | Smoking Status, Smoker | Yes=1, No=0 | Rejects (`INSUFFICIENT_DATA`) | Yes (Profile/Report) | Yes |
| **CKD** | `age` | Yes | Integer | years | Age, Patient Age | None | Rejects (`INSUFFICIENT_DATA`) | Yes (Profile/Report) | Yes |
| **CKD** | `serum_creatinine`| Yes | Float | mg/dL, µmol/L | Serum Creatinine, Creatinine, S. Creat | µmol/L ÷ 88.4 | Rejects (`INSUFFICIENT_DATA`) | Yes (Confirmed) | Yes |
| *Health Profile Only* | `blood_urea` | Record | Float | mg/dL, mmol/L | Blood Urea, Serum Urea, Total Urea | mmol/L × 6.006 (distinct from BUN) | Stored in DB, omitted from CKD ML | Yes (Confirmed) | Yes |

---

## 4. Dataset-Independent Synthetic Inputs

All test fixtures were generated synthetically and independently of any clinical dataset.

| Parameter | Patient A (Lower-Risk) Baseline | Patient A Follow-up | Patient B (Elevated Glucose) | Patient C (Renal/CKD) | Case C (Correctable) | Case D (Missing Optional) | Case E (Missing Required) |
|---|---|---|---|---|---|---|---|
| **Age** | 28 | 28 | 54 | 62 | 45 | 50 | 38 |
| **Sex** | Male | Male | Male | Female | Male | Male | Female |
| **BMI** | 22.4 kg/m² | 22.7 kg/m² | 31.0 kg/m² | 26.5 kg/m² | 25.1 kg/m² | Missing | 23.0 kg/m² |
| **Fasting Glucose** | 88 mg/dL | 94 mg/dL | 145 mg/dL | 112 mg/dL | 98 mg/dL | 100 mg/dL | 90 mg/dL |
| **HbA1c** | 5.2 % | 5.4 % | 7.2 % | — | 5.5 % | — | 5.1 % |
| **Total Cholesterol**| 165 mg/dL | 178 mg/dL | 240 mg/dL | — | 888 ➔ 192 mg/dL | 210 mg/dL | Missing |
| **HDL Cholesterol** | 58 mg/dL | 56 mg/dL | 36 mg/dL | — | 48 mg/dL | — | — |
| **Serum Creatinine** | 0.8 mg/dL | 0.9 mg/dL | 1.1 mg/dL | 2.4 mg/dL | 0.9 mg/dL | — | — |
| **Blood Urea** | 25 mg/dL | 28 mg/dL | — | 65 mg/dL | — | — | — |
| **Blood Pressure** | 116/76 mmHg | 120/78 mmHg | 138/86 mmHg | 148/92 mmHg | 122/80 mmHg | 130/85 mmHg | Missing |
| **Smoking Status** | No (0) | No (0) | Yes (1) | No (0) | No (0) | Yes (1) | No (0) |

---

## 5. Actual Multi-Model Evaluation Matrix

The following results were obtained by evaluating the actual production models against the confirmed synthetic patient profiles:

| Synthetic Scenario | Disease Model | Model Family | Calculated Probability | Operating Decision Threshold | Output Classification / Category | Pipeline Status |
|---|---|---|---|---|---|---|
| **Patient A** | Diabetes | XGBoost | `0.0139` (1.39%) | `0.2100` | `LOWER_MODEL_ESTIMATED_RISK` | Prediction generated |
| **Patient A** | Heart Disease | Logistic Regression | `0.0225` (2.25%) | `0.1100` | `LOWER_MODEL_ESTIMATED_RISK` | Prediction generated |
| **Patient A** | Hypertension | Gradient Boosting | `0.0646` (6.46%) | `0.3307` | `NEGATIVE_CLASSIFICATION_ESTIMATE` | Prediction generated |
| **Patient A** | Chronic Kidney Disease | Logistic Regression | `0.2364` (23.64%) | `0.9672` | `NEGATIVE_CLASSIFICATION_ESTIMATE` | Prediction generated |
| **Patient B** | Diabetes | XGBoost | `0.2968` (29.68%) | `0.2100` | `ELEVATED_MODEL_ESTIMATED_RISK` | Prediction generated |
| **Patient B** | Heart Disease | Logistic Regression | `0.3353` (33.53%) | `0.1100` | `ELEVATED_MODEL_ESTIMATED_RISK` | Prediction generated |
| **Patient B** | Hypertension | Gradient Boosting | `0.5699` (56.99%) | `0.3307` | `POSITIVE_CLASSIFICATION_ESTIMATE` | Prediction generated |
| **Patient B** | Chronic Kidney Disease | Logistic Regression | `0.2931` (29.31%) | `0.9672` | `NEGATIVE_CLASSIFICATION_ESTIMATE` | Prediction generated |
| **Patient C** | Diabetes | XGBoost | `0.4032` (40.32%) | `0.2100` | `ELEVATED_MODEL_ESTIMATED_RISK` | Prediction generated |
| **Patient C** | Heart Disease | Logistic Regression | `0.2405` (24.05%) | `0.1100` | `ELEVATED_MODEL_ESTIMATED_RISK` | Prediction generated |
| **Patient C** | Hypertension | Gradient Boosting | `0.8997` (89.97%) | `0.3307` | `POSITIVE_CLASSIFICATION_ESTIMATE` | Prediction generated |
| **Patient C** | Chronic Kidney Disease | Logistic Regression | `1.0000` (100.00%) | `0.9672` | `POSITIVE_CLASSIFICATION_ESTIMATE` | Prediction generated |
| **Case D (Optional Missing)**| Heart Disease | Logistic Regression | Validated Output | `0.1100` | Prediction generated (Median Imputed)| `dataCompleteness: PARTIAL` |
| **Case E (Required Missing)**| Heart Disease | Logistic Regression | None | `0.1100` | Rejects (`INSUFFICIENT_DATA`) | Insufficient data |
| **Case E (Required Missing)**| Hypertension | Gradient Boosting | None | `0.3307` | Rejects (`INSUFFICIENT_DATA`) | Insufficient data |
| **Case F (Unsupported Doc)** | All Models | — | None | — | `UNRECOGNIZED_DOCUMENT_TYPE` | Rejection (0 vitals extracted) |

---

## 6. Automated Test Suite Execution Results

Automated regression and integration suites were executed across the entire stack.

### 6.1 Backend API & End-to-End Suite (`backend/`)
- **Command:** `npm test`
- **Result:** **14 passed, 14 total test suites (153 passed, 1 skipped, 0 failed)**
- **Execution Time:** 66.83 seconds
- **Key Suites Passed:**
  - `tests/demo_pipeline_e2e.test.js` (**18 / 18 passed**)
    - PDF format readability & parser compatibility
    - OCR extraction of canonical fields from digital PDF
    - High-resolution optical character recognition on image (`.png`) via Tesseract
    - Rejection of invalid non-medical document (`case_f_unsupported_document.pdf`)
    - Multer multi-part upload endpoint validation
    - Unconfirmed extraction isolation (unconfirmed data strictly excluded from ML input)
    - Human-in-the-Loop edit audit trail (`manual_correction` provenance tracking)
    - Full report confirmation lifecycle
    - Live multi-model inference across all 4 disease endpoints
    - Partial data completeness handling with missing optional features
    - Strict rejection on missing required features (`INSUFFICIENT_DATA`)
    - Longitudinal report delta comparison logic
    - Role-based access control (Doctor authorized access vs Unrelated Doctor 403 Forbidden)
  - `tests/security_rbac_p1.test.js` (**16 passed**)
  - `tests/auth.test.js` (**5 passed**)
  - `tests/heart_disease_integration.test.js` (**17 passed**)
  - `tests/cbc_extraction.test.js` (**7 passed**)
  - `tests/manual_correction.test.js` (**7 passed**)
  - `tests/blood_urea_extraction.test.js` (**8 passed**)
  - `tests/new_disease_feature_builder.test.js` (**4 passed**)
  - `tests/medicine.test.js` (**1 passed**)

### 6.2 Machine Learning Microservice Test Suite (`ml_model/`)
- **Command:** `python -m unittest discover -s ml_model/tests`
- **Result:** **22 passed, 22 total (0 failures, 0 errors)**
- **Key Modules Tested:**
  - `test_service.py`: FastAPI endpoints, error codes, internal token security
  - `test_hypertension.py`: Gradient Boosting preprocessor, BP feature exclusion invariant
  - `test_kidney_disease.py`: Minimal 2-feature schema validation, calibrated probabilities

### 6.3 Frontend Vitest Suite (`frontend/`)
- **Command:** `npm run test`
- **Result:** **11 passed, 11 total (0 failed)**
- **Key Modules Tested:**
  - `PatientDashboard.test.jsx`: Verified all four disease cards render identical, uniform styling with individual "Upload Lab Report" actions.

### 6.4 Frontend Production Bundle Compilation (`frontend/`)
- **Command:** `npm run build`
- **Result:** **Success (0 errors, built in 7.91 seconds)**

---

## 7. File Manifest & SHA-256 Checksums

All 33 test fixtures, reports, and JSON schemas generated in `ml_model/demo_fixtures/` are tracked with cryptographically verifiable SHA-256 hashes:

| Relative Path | SHA-256 Checksum |
|---|---|
| `patient_a_lower_risk/report_1_baseline.pdf` | `8940ed9e09492d7206f8af0f998d68d879d5d5d5b2e048cfefa0435f8ef7e965` |
| `patient_a_lower_risk/report_2_followup.pdf` | `461b63e1e4998192d43cbc18b491fc576e882e49cd7fd6c00ae911ce822435fd` |
| `patient_a_lower_risk/patient_profile.json` | `695c26f7285107a84003595b2191cffa0213da01015d16881b5a15cb7e6ba008` |
| `patient_a_lower_risk/report_metadata.json` | `15c73107ae188395587535040c01f55c6260f868ebb18ac8d5a4b760cd9ef034` |
| `patient_a_lower_risk/expected_extraction_1.json` | `cc418e7bda6d65ebcdbd89def11fd612254c121c19fc72a210312ace1b0a14cd` |
| `patient_a_lower_risk/expected_extraction_2.json` | `e56b9e851125b3dfe18702cd54d69113cb6e849fb8c92c1d9e9434d1621bda7e` |
| `patient_a_lower_risk/expected_canonical_mapping.json` | `693255056ba6b122a4aa94538b25e684552523d1659c136816c55ff43ccb62de` |
| `patient_a_lower_risk/comparison_expectations.json` | `30d243da5d6498f9bfbf93610e4fc3fe4300b10984063ba64f7c5749c2b116ff` |
| `patient_b_elevated_glucose/report_elevated_glucose.pdf` | `68dfa1406c4859197515df2b53d4e25bad0afb693b4eeed229e6264f2889d4b9` |
| `patient_b_elevated_glucose/report_elevated_glucose.png` | `92f769187fa4a6366e853ecbce2aa4ddf7e641ae440e8f6dbb7f0fc206f00bb7` |
| `patient_b_elevated_glucose/patient_profile.json` | `26bd3bdc2d2b3fb05768a174f6c24cba913c2db446bade8ce18ba8358d70395c` |
| `patient_b_elevated_glucose/report_metadata.json` | `606a08f5991e1b0a471d5fc8024d5f15577a47818b1f60cdceb3956ac1ba5291` |
| `patient_b_elevated_glucose/expected_extraction.json` | `dec6d8756977621687ea61a01c5d4160f4ca3cac07fafddec3537780571b9d4f` |
| `patient_b_elevated_glucose/expected_canonical_mapping.json` | `042ea8c2a237e980ed26f86760ebd1f29d6e2b2987f172d3546356d4126c3700` |
| `patient_c_renal/report_renal.pdf` | `884881ce865673e7e320d62fa97248f1ea3e7ff021626d92c3a15bd7dd7fbdaf` |
| `patient_c_renal/patient_profile.json` | `58978b9b56780b5f51b9600672ad9b485421af3d5804bc78fb2c415563eec331` |
| `patient_c_renal/report_metadata.json` | `87823ff8c222a1632f45a0dfdf08b75bfcd49aa66848a3e49b8d8a1eb168ded7` |
| `patient_c_renal/expected_extraction.json` | `30e81075f5736c0b516417aaa59223ad3f0d19147c709c4496873db5fbbd127e` |
| `patient_c_renal/expected_canonical_mapping.json` | `204dc9b79468e75e3b7e75c92f78f46f64309b6751917998ff7e4d80f9d4495b` |
| `edge_cases/case_c_correctable_extraction.pdf` | `71a7afdbf6340c5bb1555d9b52271e78b113ada34ce62f95aa04cc2386628800` |
| `edge_cases/case_d_missing_optional.pdf` | `210fe1c43fc91482f1cab49b3eb8462fb55fd865d9bd560e0a7cd33e111c2898` |
| `edge_cases/case_e_missing_required.pdf` | `be239e041aecd91db7913e8de8d080661ea4411c20158580beebc221bf887a79` |
| `edge_cases/case_f_unsupported_document.pdf` | `5584444bb22471198e8cf060005fcff2932d1692dac4f060b27cb006df1a2ebd` |
| `edge_cases/expected_extraction_c.json` | `708fbc95fab892175893b1d2f9cb4e2677eca2b3890c627c118310952ae4309c` |
| `edge_cases/expected_extraction_d.json` | `344c48df8a565fd9c4e82a7abddb24cb8d0f6bcfb3cb31f504f1d764be23652b` |
| `edge_cases/expected_extraction_e.json` | `cf6eb16dc24e4fd62bad18c7393f0ceff08fe1f430260ffa039c2faffc482d5b` |
| `edge_cases/expected_extraction_f.json` | `b49856727144c3a9c6cabbf8bbf1470ccd06194239f055a83e602fd74ac44643` |
| `EVALUATION_MATRIX.json` | `fd4478b7dc0c8b13f1d600e7e49ca530ad4db5d2159efeaf39ab2e49cb2838b4` |
| `FIXTURE_MANIFEST.json` | `41cbd2449d80e0825e33981ef206e3daa9961d1717a5b677832d637f1704b61a` |

---

## 8. Clinical Safety & Responsible AI Disclaimers

1. **Synthetic Data Policy:** Every single test fixture and report file produced is entirely fictional and explicitly displays `"SYNTHETIC — FOR DEMONSTRATION ONLY"`. No actual patient records, hospital logos, or medical credentials were used.
2. **Clinical Decision Support Boundary:** Machine learning model outputs represent statistical estimates calibrated on historical cohort datasets. They are intended strictly for clinical screening assistance and triage workflows, not autonomous medical diagnosis.
3. **Fail-Safe Integrity:** When vital input features are missing, the system strictly halts inference and presents `INSUFFICIENT_DATA`. Under no circumstances are missing clinical features fabricated or assigned default risk probabilities.
