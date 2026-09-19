# MEDSCAN-NCD: PHASE 7D — HEART DISEASE MODEL INTEGRATION REPORT
**Scientific Due-Diligence, Full-Stack Architecture, and Integration Verification**

---

## 1. Executive Summary

Phase 7D successfully integrates the Phase 7C Framingham Heart Study 10-Year Coronary Heart Disease (CHD) predictive machine learning model into MedScan-NCD across all four architectural tiers:
1. **Python FastAPI Microservice** (`ml_model/service/app.py`)
2. **Node.js Express Backend** (`backend/src/`)
3. **MongoDB Data Persistence** (`backend/src/models/Prediction.js`, `Patient.js`)
4. **React Modern Frontend** (`frontend/src/`)

All 6 user architectural corrections were strictly implemented:
- **Zero fake/offline fallback probabilities**: If the FastAPI ML service is unreachable or times out, the system returns a controlled `PREDICTION_SERVICE_UNAVAILABLE` status without fabricating probabilities. Confirmed reports remain safely preserved.
- **Smoking status missingness**: Unspecified smoking status is preserved as `{ value: null, source: 'missing', verified: false }` and passed as `null` to the microservice; imputation is handled strictly by the serialized training preprocessor.
- **Explainable AI terminology**: The user-facing UI labels feature attributions as **"Contributing Factors"** (not SHAP) with directional, non-causal phrasing (`"[Feature] contributed toward [higher/lower] model-estimated risk."`).
- **Model artifact immutability**: Zero retraining or weights modification occurred; the Platt-calibrated Logistic Regression pipeline (`heart_disease_model.pkl`, `calibrator.pkl`, `preprocessor.pkl`, development threshold $0.110$) was loaded as serialized.
- **Decoupled report confirmation**: Report confirmation and risk assessment operate independently.
- **Diabetes preservation**: Zero regression or modifications to the existing Diabetes Scenario A pipeline.

---

## 2. Integrated Feature Contract

The integrated 8-feature contract matches the locked Phase 7B/7C specification:

| Feature | Type | Required / Optional | Normalization / Units | Provenance Source |
| :--- | :--- | :--- | :--- | :--- |
| `age` | Integer | **Required** (18–100) | Years | Report patientContext / Profile |
| `sex` | Categorical | **Required** | `0` = Female, `1` = Male | Report patientContext / Profile |
| `totChol` | Continuous | **Required** (50–600) | mg/dL | Confirmed measurements / Profile |
| `sysBP` | Continuous | **Required** (60–260) | mmHg | Confirmed measurements / Profile |
| `diaBP` | Continuous | **Required** (30–150) | mmHg | Confirmed measurements / Profile |
| `BMI` | Continuous | *Optional* (10–80) | kg/m² | Confirmed measurements / Profile (imputed if missing) |
| `glucose` | Continuous | *Optional* (40–500) | mg/dL | Fasting glucose measurement / Profile (imputed if missing) |
| `currentSmoker` | Categorical | *Optional* | `0` = Non-smoker, `1` = Smoker | Confirmed data / Profile (imputed if missing) |

---

## 3. Microservice Lifespan & API Specification

### Endpoint: `GET /health`
Returns microservice health alongside status of loaded model artifacts:
```json
{
  "status": "healthy",
  "service": "medscan-ncd-ml-service",
  "modelVersion": "1.0.0",
  "diabetes": {
    "modelLoaded": true,
    "modelVersion": "1.0.0",
    "threshold": 0.21
  },
  "heartDisease": {
    "modelLoaded": true,
    "preprocessorLoaded": true,
    "calibratorLoaded": true,
    "metadataLoaded": true,
    "featureSchemaLoaded": true,
    "threshold": 0.11,
    "modelVersion": "1.0.0"
  }
}
```

### Endpoint: `POST /predict/heart_disease`
- **Request payload**: `{ "features": { "age": 52, "sex": 1, "totChol": 218, "sysBP": 142, "diaBP": 84, "BMI": 27.4, "glucose": 108, "currentSmoker": 1 } }`
- **Inference logic**:
  1. Validates presence of 5 required features (`age`, `sex`, `totChol`, `sysBP`, `diaBP`).
  2. Imputes missing optional features (`BMI`, `glucose`, `currentSmoker`) using `preprocessor.joblib`.
  3. Obtains calibrated probability via Platt calibrator (`calibrator.joblib`).
  4. Classifies risk against locked development threshold $0.110$:
     - $> 0.110$ $\rightarrow$ `ELEVATED_MODEL_ESTIMATED_RISK`
     - $\le 0.110$ $\rightarrow$ `LOWER_MODEL_ESTIMATED_RISK`
  5. Computes linear factor contributions via model coefficients with non-causal descriptions.
  6. Attaches non-diagnostic clinical disclaimer.

---

## 4. Backend Express & Database Integration

1. **`backend/src/services/heartDiseaseFeatureBuilder.js`**:
   - Enforces human-in-the-loop gate: unconfirmed OCR extraction or pending review data NEVER enters the feature builder.
   - Enforces Minimum Input Policy: requires all 5 mandatory vitals; missing optional parameters remain `null` with provenance `{ source: 'missing', verified: false }`.
2. **`backend/src/services/heartDiseasePredictionService.js`**:
   - Dispatches to FastAPI with 5-second timeout via `AbortController`.
   - Never generates fallback probabilities. If microservice is unreachable, returns `{ status: 'PREDICTION_SERVICE_UNAVAILABLE', canCalculate: false }`.
3. **`backend/src/models/Prediction.js`**:
   - Added `'PREDICTION_SERVICE_UNAVAILABLE'` to status enum.
4. **`backend/src/models/Patient.js`**:
   - Added `isCurrentSmoker: { type: Boolean, default: null }`.
5. **`backend/src/controllers/predictionController.js`**:
   - `predictHeartDisease`: Decoupled prediction execution.
   - `getLatestHeartDiseasePrediction`: Self-healing query with auto-recalculation when profile vitals update.
   - `getHeartDiseasePredictionHistory`: Immutable historical audit trail.
6. **`backend/src/controllers/reportController.js`**:
   - In `confirmReport`, decoupled Heart Disease risk assessment executes alongside Diabetes.
7. **`backend/src/controllers/patientController.js`**:
   - `triggerHeartDiseaseRecalculation` automatically synchronizes risk when patient vitals or demographics are updated.

---

## 5. Frontend UI/UX Integration

1. **`frontend/src/services/predictionService.js`**:
   - Added `predictHeartDisease`, `getLatestHeartDiseasePrediction`, and `getHeartDiseasePredictionHistory`.
2. **`frontend/src/pages/patient/PatientDashboard.jsx`**:
   - Active Heart Disease Risk Assessment Card:
     - Estimated 10-Year CHD Probability.
     - Risk badge (`Elevated model-estimated risk` or `Lower model-estimated risk`).
     - Data completeness indicator (`PARTIAL DATA` or `FULL DATA`).
     - Development decision threshold indicator: `11.0%` with explanatory validation note.
     - **Contributing Factors** section displaying directional impact without causal claims and without SHAP acronyms.
     - Clinical Predictors breakdown with provenance and preprocessor imputation markers.
     - Preventive next steps and non-diagnostic clinical disclaimer.
     - Service unavailable and insufficient data friendly UX states.
   - Demographics Modal:
     - Added fields for Total Cholesterol (mg/dL) and Smoking Status (Non-smoker / Current Smoker).
   - Multi-Disease Roadmap:
     - Moved Heart Disease to active status; roadmap displays Hypertension and Kidney Disease.
3. **`frontend/src/pages/doctor/DoctorPatientDetail.jsx`**:
   - Displays Framingham 10-Year CHD model card in the AI predictions tab with observed clinical predictors and contributing factors.

---

## 6. Verification and Acceptance Testing

### Synthetic Patient Acceptance Test
- **Input profile**: Age 52, Male (`sex: 1`), Total Cholesterol 218 mg/dL, Systolic BP 142 mmHg, Diastolic BP 84 mmHg, BMI 27.4 kg/m², Fasting Glucose 108 mg/dL, Current Smoker `1`.
- **Live Output**:
  - Probability: `25.3%` (`0.2527`)
  - Threshold: `11.0%` (`0.110`)
  - Risk Category: `ELEVATED_MODEL_ESTIMATED_RISK`
  - Contributing Factors: Fasting blood glucose, Smoking status, Total cholesterol, Age, and BMI contributed toward higher model-estimated risk.
  - Disclaimer: Non-diagnostic risk estimation for clinical decision support.

### Test Suite Execution Summary
- **Heart Disease Integration Tests** (`backend/tests/heart_disease_integration.test.js`): **17 / 17 PASSED**.
- **Human-in-the-Loop OCR Manual Correction Tests** (`backend/tests/manual_correction.test.js`): **7 / 7 PASSED**.
- **Complete Blood Count (CBC) Medical Intelligence Tests** (`backend/tests/cbc_extraction.test.js`): **7 / 7 PASSED**.
- **Frontend Production Build** (`npm --prefix frontend run build`): **0 ERRORS, CLEAN BUNDLE**.

---

## 7. Status

**Phase 7D is COMPLETE and VERIFIED LIVE across the entire stack.**
