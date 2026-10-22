# MedScan-NCD: Audited Model Provenance & Synthetic Data Notes

> **Clinical Notice:** Risk calculations represent statistical model estimates for clinical decision support and screening triage. They are non-diagnostic and do not substitute for formal medical evaluation:  
> **`SYNTHETIC — FOR DEMONSTRATION ONLY`**

---

## 1. Audited Machine Learning Model Summary

All model architectures, datasets, evaluation metrics, and feature schemas below were inspected and verified against the actual serialized `.joblib` binary artifacts and accompanying JSON metadata files in the repository.

| Metric / Dimension | Diabetes Mellitus (T2D) | Heart Disease (10-Yr CHD) | Hypertension | Chronic Kidney Disease (CKD) |
|---|---|---|---|---|
| **Serialized Artifact** | `ml_model/artifacts/diabetes/diabetes_scenario_a_model.joblib` | `ml_model/heart_disease/model/heart_disease_model.joblib` | `ml_model/artifacts/hypertension/v1/model.joblib` | `ml_model/artifacts/kidney_disease/v1/model.joblib` |
| **Model Metadata File** | `ml_model/artifacts/diabetes/model_metadata.json` | `ml_model/heart_disease/model_metadata.json` | `ml_model/artifacts/hypertension/v1/model_metadata.json` | `ml_model/artifacts/kidney_disease/v1/model_metadata.json` |
| **Verified Algorithm** | **LightGBM** | **Logistic Regression** (L2) | **HistGradientBoosting** (`hist_gradient_boosting`) | **Random Forest** (`RandomForestClassifier`) |
| **Calibration Method** | Sigmoid (Platt Scaling, 5-fold CV) | Sigmoid (Platt Scaling, 5-fold CV) | Sigmoid (Platt Scaling, ensemble) | Isotonic Calibration (ensemble) |
| **Training Cohort** | CDC/NCHS NHANES 2017-2018 ($N=5,856$) | Framingham Heart Study Teaching Cohort ($N=4,240$) | CDC/NCHS NHANES 2017-2018 ($N=6,151$) | UCI Chronic Kidney Disease Dataset ($N=374$) |
| **Held-Out Test Sample** | $N=1,172$ ($236$ positive, $936$ negative) | $N=848$ ($129$ positive, $719$ negative) | $N=1,231$ ($428$ positive, $803$ negative) | $N=75$ ($46$ positive, $29$ negative) |
| **Held-Out ROC-AUC** | **0.8278** | **0.6963** *(CV mean: 0.7307)* | **0.8233** | **0.9130** |
| **Operating Decision Threshold**| **0.2100** | **0.1100** | **0.3307** | **0.9672** |
| **Held-Out Sensitivity / Recall**| 81.78% | 75.19% | 79.44% | 71.74% |
| **Held-Out Specificity** | 68.80% | 52.16% | 70.86% | 100.0% |
| **Held-Out Brier Score** | 0.1239 | 0.1213 | 0.1614 | 0.1144 |
| **Inference Endpoint** | `POST /predict/diabetes` | `POST /predict/heart-disease` | `POST /predict/hypertension` | `POST /predict/ckd` |
| **Explainability Method** | TreeSHAP Directional Contributions | LinearExplainer Feature Weights | Linear attribution approximation | Feature ranking metadata |

---

## 2. Invariant Architectural & Clinical Rules

### 2.1 Hypertension Non-Contamination Invariant
* **Rule:** The Hypertension model **strictly excludes systolic and diastolic blood pressure** from input features.
* **Clinical Rationale:** Including measured blood pressure in a model predicting hypertension introduces severe target leakage and circular reasoning (blood pressure is the diagnostic criterion for hypertension). The model instead estimates the probability of diagnosed/treated hypertension from non-BP cardiometabolic markers: age, biological sex, BMI, fasting glucose, total cholesterol, HDL, creatinine, heart rate, and smoking status.

### 2.2 Chronic Kidney Disease Minimal Production Schema
* **Rule:** The CKD inference engine consumes **only `age` and `serum_creatinine`** (Feature Group A_minimal).
* **Clinical Rationale:** Selected via empirical feature ablation to maximize cross-cohort generalizability while preventing over-fitting on small sample sizes. Although `blood_urea` is parsed, normalized, and persisted in the patient's longitudinal record, it is strictly omitted from the CKD model feature vector.

### 2.3 Fail-Safe Missing Input Policy (`INSUFFICIENT_DATA`)
* If any mandatory feature is missing (e.g. Total Cholesterol or Blood Pressure for Heart Disease), the platform **never invents default probabilities or guesses risk**.
* It returns status `INSUFFICIENT_DATA` with an explicit list of missing clinical vitals, advising the patient to upload the necessary laboratory panel.

---

## 3. Real Inference Matrix for Demonstration Patients

All prediction probabilities below were produced by the live FastAPI microservice running the actual serialized `.joblib` models against the seeded patient profiles:

| Patient Scenario | Disease | Model Family | Calculated Probability | Operating Threshold | Output Category | Status |
|---|---|---|---|---|---|---|
| **Patient A** (Aarav Sharma) | Diabetes | LightGBM | **0.0139** (1.39%) | 0.2100 | `LOWER_MODEL_ESTIMATED_RISK` | Success |
| **Patient A** (Aarav Sharma) | Heart Disease | Logistic Regression | **0.0225** (2.25%) | 0.1100 | `LOWER_MODEL_ESTIMATED_RISK` | Success |
| **Patient A** (Aarav Sharma) | Hypertension | HistGradientBoosting | **0.0646** (6.46%) | 0.3307 | `NEGATIVE_CLASSIFICATION_ESTIMATE` | Success |
| **Patient A** (Aarav Sharma) | CKD | Random Forest | **0.2364** (23.64%) | 0.9672 | `NEGATIVE_CLASSIFICATION_ESTIMATE` | Success |
| **Patient B** (Rajesh Patel) | Diabetes | LightGBM | **0.2968** (29.68%) | 0.2100 | `ELEVATED_MODEL_ESTIMATED_RISK` | Success |
| **Patient B** (Rajesh Patel) | Heart Disease | Logistic Regression | **0.3353** (33.53%) | 0.1100 | `ELEVATED_MODEL_ESTIMATED_RISK` | Success |
| **Patient B** (Rajesh Patel) | Hypertension | HistGradientBoosting | **0.5699** (56.99%) | 0.3307 | `POSITIVE_CLASSIFICATION_ESTIMATE` | Success |
| **Patient B** (Rajesh Patel) | CKD | Random Forest | **0.2931** (29.31%) | 0.9672 | `NEGATIVE_CLASSIFICATION_ESTIMATE` | Success |
| **Patient C** (Sunita Rao) | Diabetes | LightGBM | **0.4032** (40.32%) | 0.2100 | `ELEVATED_MODEL_ESTIMATED_RISK` | Success |
| **Patient C** (Sunita Rao) | Heart Disease | Logistic Regression | **0.2405** (24.05%) | 0.1100 | `ELEVATED_MODEL_ESTIMATED_RISK` | Success |
| **Patient C** (Sunita Rao) | Hypertension | HistGradientBoosting | **0.8997** (89.97%) | 0.3307 | `POSITIVE_CLASSIFICATION_ESTIMATE` | Success |
| **Patient C** (Sunita Rao) | CKD | Random Forest | **1.0000** (100.0%) | 0.9672 | `POSITIVE_CLASSIFICATION_ESTIMATE` | Success |

---

## 4. Synthetic Data Limitations & Disclaimers

1. **Demonstration Boundary:** All patient names, identification numbers, and laboratory values were generated synthetically. They do not represent real persons, clinical cases, or authentic laboratory reports.
2. **Clinical Decision Support Boundary:** Machine learning model outputs represent statistical estimates for screening decision support and triage assistance. They do not constitute an autonomous medical diagnosis or clinical treatment plan.
3. **No Retraining Modification:** Models were preserved exactly as trained. No weights, hyperparameters, or decision thresholds were adjusted to produce artificial demo outcomes.
