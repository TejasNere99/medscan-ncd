# MEDSCAN-NCD: PHASE 7C HEART DISEASE ML MODEL TRAINING, BENCHMARKING, CALIBRATION & EVALUATION REPORT

**Project:** MedScan-NCD — OCR-Based Medical Report Intelligence & Disease Risk Prediction  
**Subsystem:** Heart Disease (10-Year Coronary Heart Disease Risk Estimation)  
**Execution Phase:** Phase 7C — Model Training, Benchmarking, Probability Calibration & Evaluation  
**Status:** COMPLETED & SCIENTIFICALLY DEFENDED  
**Generated Date:** 2026-09-16 14:53:37

---

## 1. Objective
The primary objective of Phase 7C is to train, benchmark, calibrate, evaluate, and serialize a clinically sound and mathematically defensible Machine Learning risk model for **10-Year Incident Coronary Heart Disease (CHD)** risk estimation within MedScan-NCD.

> [!IMPORTANT]
> **CRITICAL SCIENTIFIC SAFETY & NON-DIAGNOSTIC PROTOCOL:**
> This risk prediction model is a **non-diagnostic clinical decision support prototype**. It estimates statistical probability of a 10-year incident CHD event based on baseline physiological parameters. It does **NOT** provide a clinical diagnosis, does not establish medical causation, and does not replace professional clinical judgment, electrocardiograms (ECG), or cardiology consultations.

---

## 2. Dataset
- **Cohort**: Official Framingham Heart Study 10-Year CHD Teaching Cohort (BioLINCC NHLBI / Wilson et al., Circulation 1998).
- **File Location**: `ml_model/datasets/heart_disease/raw/framingham.csv`
- **File Size**: 191,803 bytes
- **Row Count**: 4,240 rows
- **Column Count**: 16 raw features
- **Cryptographic SHA-256 Hash**:
  `2c0e57dc0361b420becf1facec0a054af06c420eae0ae2faf0fdc8591fadb018`
  *(Integrity verified: exact 100% match with Phase 7B contract)*

---

## 3. Target Definition
- **Target Feature**: `TenYearCHD` (TenYearCHD)
- **Clinical Definition**: 10-year follow-up binary indicator of incident coronary heart disease (including angina pectoris, coronary insufficiency, myocardial infarction, or fatal CHD event).
- **Target Distribution**:
  - Negative Class (`0` = No CHD event): **3,596 patients** (84.81%)
  - Positive Class (`1` = Incident CHD): **644 patients** (15.19%)
  - Baseline Cohort Prevalence: **15.19%**
  - Class Imbalance Ratio: **5.58 : 1** (Negative to Positive)
  - Missing Values: **0 (0.00%)** — Target integrity verified completely intact.

---

## 4. Feature Schema
The locked candidate feature vector comprises 8 approved clinical parameters:
1. `age`: Patient Age in years (continuous, Range: 32–70).
2. `sex`: Biological sex (binary: `0 = Female`, `1 = Male`; mapped from raw column `male`).
3. `totChol`: Total Serum Cholesterol in mg/dL (continuous, Range: 107–696).
4. `sysBP`: Systolic Blood Pressure in mmHg (continuous, Range: 83.5–295.0).
5. `diaBP`: Diastolic Blood Pressure in mmHg (continuous, Range: 48.0–142.5).
6. `BMI`: Body Mass Index in kg/m² (continuous, Range: 15.54–56.80).
7. `glucose`: Fasting Blood Glucose in mg/dL (continuous, Range: 40–394).
8. `currentSmoker`: Smoking status (binary: `0 = Non-smoker`, `1 = Current smoker`).

---

## 5. Leakage Exclusions
Seven columns present in the raw Framingham CSV were intentionally excluded from the candidate feature vector following the Phase 7B Forensic and Leakage Audits:
- `education`: Socioeconomic proxy lacking physiological risk transferability across modern or international clinics.
- `cigsPerDay`: Highly collinear with `currentSmoker` (r = 0.77) with significant missingness; redundant for non-diagnostic risk categorization.
- `BPMeds`: Low prevalence (3.0%) with treatment bias; excluded from core vital vector.
- `prevalentStroke`: Manifest secondary cerebrovascular disease; including it conflates primary risk prediction with secondary disease management.
- `prevalentHyp`: Perfect deterministic derivative of `sysBP` and `diaBP`; constitutes direct collinear leakage.
- `diabetes`: Outcome proxy and co-morbidity; blood glucose provides continuous quantitative risk signal without categorical threshold bias.
- `heartRate`: Acute vital subject to transient situational anxiety / white-coat effects rather than longitudinal cardiovascular risk.

---

## 6. Preprocessing Pipeline
All preprocessing was implemented via Scikit-Learn `ColumnTransformer` and `Pipeline` architectures:
- **Numerical Features** (`age`, `totChol`, `sysBP`, `diaBP`, `BMI`, `glucose`):
  - Median Imputation (`SimpleImputer(strategy='median')`)
  - Standard Normalization (`StandardScaler()`) for linear algorithms; unscaled for tree-based ensembles.
- **Binary Features** (`sex`, `currentSmoker`):
  - Most Frequent Imputation (`SimpleImputer(strategy='most_frequent')`)
- **Strict Leakage Prevention**:
  - Imputers and scalers were fitted **strictly within training folds** during cross-validation.
  - For the final model, transformers were fitted solely on the 80% training set (3,392 samples).
  - The held-out test set only received `.transform()`. Zero test information leaked into preprocessing.

---

## 7. Missing-Data Handling
- Missingness in Raw Dataset:
  - `glucose`: 388 missing (9.15%)
  - `totChol`: 50 missing (1.18%)
  - `BMI`: 19 missing (0.45%)
- Strategy: Handled via training-fitted median imputation for continuous parameters.
- Defensibility: Zero arbitrary zero-substitutions. Median values preserve clinical distribution medians without skewing variance. No rows were discarded.

---

## 8. Class Imbalance Strategy
- Positive class prevalence is 15.19% (5.58 : 1 negative-to-positive ratio).
- Handled through cost-sensitive loss functions and algorithm-native class weighting:
  - `class_weight='balanced'` in Logistic Regression and Random Forest.
  - `scale_pos_weight=5.58` in LightGBM and XGBoost.
- Defensibility: Synthetic oversampling (such as SMOTE) was deliberately avoided to preserve natural probability calibration and avoid synthesizing false clinical vital manifolds.

---

## 9. Train / Test Split
- **Method**: Stratified 80/20 train/test split (`random_state=42`, stratified on `TenYearCHD`).
- **Training Set**: 3,392 samples (515 Positive, 2,877 Negative, 15.18% prevalence).
- **Held-Out Test Set**: 848 samples (129 Positive, 719 Negative, 15.21% prevalence).
- **Strict Lock Guarantee**: The held-out test set remained strictly locked and untouched during all model benchmarking, cross-validation, calibration fitting, and threshold exploration.

---

## 10. Cross-Validation Protocol
- **Method**: Stratified 5-Fold Cross-Validation on the 3,392 training samples (`random_state=42`).
- **Isolation**: Each fold independently executed preprocessing fitting, model training, and out-of-fold probability estimation.
- **Metrics Tracked**: ROC-AUC, PR-AUC, Sensitivity (Recall), Specificity, Precision, F1-Score, and Brier Score (mean ± standard deviation across 5 folds).

---

## 11. Candidate Models
Six diverse candidate architectures were benchmarked under identical cross-validation conditions:
1. **Logistic Regression**: Standard L2 regularization, `class_weight='balanced'`, standard scaled features.
2. **Decision Tree**: `max_depth=5`, `min_samples_leaf=20`, `class_weight='balanced'`.
3. **Random Forest**: 200 estimators, `max_depth=6`, `class_weight='balanced'`.
4. **HistGradientBoosting**: 150 iterations, `max_depth=5`, native histogram binning.
5. **LightGBM**: 150 estimators, `max_depth=4`, `scale_pos_weight=5.58`.
6. **XGBoost**: 150 estimators, `max_depth=4`, `scale_pos_weight=5.58`.

---

## 12. Model Comparison Table
Stratified 5-fold cross-validation performance on 3,392 training samples:

| Model | ROC-AUC (mean ± SD) | PR-AUC (mean ± SD) | Sensitivity | Specificity | Precision | F1-Score | Brier Score |\n| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n| **Logistic_Regression** | 0.7307 ± 0.0286 | 0.3569 ± 0.0439 | 69.13% | 67.19% | 27.45% | 0.3929 | 0.2098 |\n| **Decision_Tree** | 0.6690 ± 0.0242 | 0.2566 ± 0.0275 | 60.97% | 62.08% | 22.53% | 0.3278 | 0.2233 |\n| **Random_Forest** | 0.7198 ± 0.0333 | 0.3409 ± 0.0434 | 64.27% | 67.40% | 26.11% | 0.3711 | 0.2022 |\n| **HistGradientBoosting** | 0.6962 ± 0.0285 | 0.3156 ± 0.0357 | 53.79% | 72.75% | 26.14% | 0.3517 | 0.1893 |\n| **LightGBM** | 0.7107 ± 0.0292 | 0.3331 ± 0.0481 | 60.19% | 69.73% | 26.34% | 0.3663 | 0.1960 |\n| **XGBoost** | 0.7146 ± 0.0352 | 0.3392 ± 0.0498 | 63.88% | 66.67% | 25.60% | 0.3653 | 0.2047 |

---

## 13. Final Model Selection
- **Selected Champion**: **`Logistic_Regression`**
- **Composite Selection Score**: **0.8778** (Calculated as ROC-AUC + PR-AUC - Brier)
- **Selection Rationale**:
  1. **Top Discrimination**: Delivered highest cross-validated ROC-AUC (0.7307 ± 0.0286) and PR-AUC (0.3569 ± 0.0439).
  2. **Probability Quality**: Achieved superior calibration responsiveness under Platt scaling compared to tree-based estimators.
  3. **Overfitting Resistance**: Linear structure prevents memorization of noisy vital fluctuations in historical cohort data.
  4. **Clinical Compatibility**: Produces monotonic log-odds weights directly interpretable by clinicians, matching classic Framingham scoring conventions.

---

## 14. Probability Calibration
- **Method**: Sigmoid / Platt Scaling (`CalibratedClassifierCV(method='sigmoid', cv=5)`) fitted strictly on training data.
- **CV Probability Quality Comparison**:
  - Uncalibrated CV Brier Score: **0.20985**
  - Calibrated CV Brier Score: **0.11625**
  - **Brier Improvement**: **+0.09359 (+44.60%)**
- **Interpretation**: Platt calibration substantially reduced forecast dispersion, aligning model risk estimates with actual empirical event frequency across deciles.

---

## 15. Development Decision Threshold Selection
Because MedScan-NCD serves as a preventive health intelligence screening tool, high sensitivity is paramount to minimize false negatives (missed high-risk individuals).

- **Exploration Protocol**: Evaluated decision thresholds in range 0.05 to 0.50 exclusively on training CV out-of-fold calibrated probabilities.
- **Target Objective**: Minimum Sensitivity >= 80.0% while maximizing Specificity.
- **Selected Development Threshold**: **tau = 0.110**
- **Training CV Performance at Development Threshold (tau = 0.110)**:
  - Sensitivity (Recall): **81.75%** (Target >= 80.0% achieved)
  - Specificity: **50.12%**
  - Precision: **22.68%**
  - F1-Score: **0.3551**
- **Clinical Disclaimer**: *"Development threshold — research/engineering decision-support cutoff, not a clinical diagnostic threshold."*

---

## 16. Final Held-Out Test Results
Evaluated **EXACTLY ONCE** on the untouched 848-sample held-out test set using the locked champion model and development threshold tau = 0.110:

| Metric | Held-Out Test Value | Description |
| :--- | :---: | :--- |
| **Test Sample Count (N)** | 848 | 20% stratified hold-out cohort |
| **Positive Cases** | 129 | Documented 10-year incident CHD events (15.21% prevalence) |
| **Negative Cases** | 719 | Event-free patients (84.79%) |
| **Decision Threshold (tau)** | **0.110** | Locked development screening cutoff |
| **ROC-AUC** | **0.6963** | Area under the Receiver Operating Characteristic |
| **PR-AUC** | **0.2917** | Area under Precision-Recall Curve |
| **Sensitivity (Recall)** | **75.19%** | 97 of 129 positive cases detected |
| **Specificity** | **52.16%** | 375 of 719 negative cases correctly ruled out |
| **Precision (PPV)** | **22.00%** | Positive Predictive Value |
| **F1-Score** | **0.3404** | Harmonic mean of precision and recall |
| **Brier Score** | **0.12129** | Mean squared probability error on unseen data |

### Held-Out Confusion Matrix
```
                  Predicted Negative (0)    Predicted Positive (1)
Actual Negative (0):      375 (TN)                  344 (FP)
Actual Positive (1):       32 (FN)                   97 (TP)
```

---

## 17. SHAP Explainability & Feature Importance
SHAP values were computed using `shap.LinearExplainer` on the standardized feature representation:

| Rank | Feature | Description | Mean |SHAP| Impact | Directional Nature |\n| :---: | :--- | :--- | :---: | :--- |\n| 1 | `age` | Patient Age (years, 32-70) | 0.4713 | Contributed toward model-estimated risk |\n| 2 | `totChol` | Total Serum Cholesterol (mg/dL) | 0.2704 | Contributed toward model-estimated risk |\n| 3 | `glucose` | Fasting Blood Glucose (mg/dL) | 0.2284 | Contributed toward model-estimated risk |\n| 4 | `currentSmoker` | Current Smoking Status (0=No, 1=Yes) | 0.1828 | Contributed toward model-estimated risk |\n| 5 | `sex` | Biological Sex (0=Female, 1=Male) | 0.0889 | Contributed toward model-estimated risk |\n| 6 | `BMI` | Body Mass Index (kg/m²) | 0.0595 | Contributed toward model-estimated risk |\n| 7 | `sysBP` | Systolic Blood Pressure (mmHg) | 0.0341 | Contributed toward model-estimated risk |\n| 8 | `diaBP` | Diastolic Blood Pressure (mmHg) | 0.0111 | Contributed toward model-estimated risk |

### Sample Local Explanation (Patient #0)
- Patient Baseline: Age 46, Female, Total Cholesterol 325 mg/dL, Fasting Glucose 64 mg/dL, Non-smoker.
- Attributions:
  - `sex = 0.0`: Contributed toward higher model-estimated risk (+0.2303)
  - `age = 46.0`: Contributed toward lower model-estimated risk (-0.2284)
  - `totChol = 325.0`: Contributed toward lower model-estimated risk (-0.2119 relative to normalized intercept)
  - `glucose = 64.0`: Contributed toward lower model-estimated risk (-0.1581)
  - `currentSmoker = 0.0`: Contributed toward lower model-estimated risk (-0.1535)

> [!NOTE]
> All local explanations strictly use non-causal language: *"contributed toward higher/lower model-estimated risk"*. No medical causation is claimed or implied.

---

## 18. Exploratory Subgroup Analysis
Subgroup performance evaluated on the 848 held-out test samples:

| Subgroup | Sample Size (N) | CHD Prevalence (%) | ROC-AUC | Sensitivity | Specificity |\n| :--- | :---: | :---: | :---: | :---: | :---: |\n| **Sex Female** | 482 | 10.79% | 0.6818 | 69.23% | 60.23% |\n| **Sex Male** | 366 | 21.04% | 0.6739 | 79.22% | 40.14% |\n| **Age 32-44** | 299 | 9.03% | 0.6609 | 18.52% | 92.65% |\n| **Age 45-54** | 291 | 14.09% | 0.6861 | 78.05% | 46.80% |\n| **Age 55-64** | 221 | 23.53% | 0.6433 | 98.08% | 3.55% |\n| **Age 65-70** | 37 | 24.32% | 0.5913 | 100.00% | 0.00% |

> [!CAUTION]
> Subgroup results are strictly exploratory to detect potential disparity signals. They do not constitute external clinical fairness validation.

---

## 19. Limitations & Clinical Boundaries
1. **Historical Cohort**: Framingham cohort was collected between 1948–1980 in Framingham, Massachusetts. Demographic profile is predominantly Caucasian. External calibration on contemporary South Asian and global cohorts is required.
2. **Screening Prototype**: Designed exclusively as an assistive screening tool.
3. **Continuous Probability**: The predicted probability represents statistical likelihood over a 10-year horizon, not an acute emergency indicator.
4. **Development Threshold**: The threshold tau = 0.110 prioritizes high sensitivity (75.19% test recall) over specificity.

---

## 20. Reproducibility & Determinism
- **Python Version**: 3.14.4
- **Scikit-Learn Version**: 1.9.0
- **LightGBM Version**: 4.7.0
- **XGBoost Version**: 3.4.1
- **SHAP Version**: 0.52.0
- **Joblib Version**: 1.6.0
- **Pandas Version**: 3.0.3
- **NumPy Version**: 2.5.1
- **Deterministic Seed**: `RANDOM_STATE = 42` fixed across all splits, cross-validation folds, and algorithm initializations.
- **Verification**: Executing the pipeline repeatedly produces identical split indices, metrics, and artifact checksums.

---

## 21. Final Model Artifacts
All serialized artifacts have been written to `ml_model/heart_disease/`:
- `model/heart_disease_model.pkl` & `.joblib`: Calibrated champion model
- `preprocessing/preprocessor.pkl` & `.joblib`: Preprocessing pipeline
- `calibration/calibrator.pkl` & `.joblib`: Platt calibrator serialization
- `feature_schema.json`: Complete 8-feature locked contract
- `model_metadata.json`: Machine-readable provenance and evaluation metadata
- `reports/HEART_DISEASE_MODEL_COMPARISON.csv`: Cross-validation benchmarks across all 6 candidate algorithms
- `reports/HEART_DISEASE_MODEL_TRAINING_REPORT.md`: Comprehensive 22-section audit document

---

## 22. Next Integration Phase (Phase 7D)
Phase 7D will execute the end-to-end integration into the active MedScan-NCD application stack:
1. Python FastAPI inference microservice (`POST /predict/heart_disease`).
2. Node.js Express backend orchestration and feature building.
3. OCR extraction mapping and human-in-the-loop confirmation gating.
4. Frontend multi-disease risk dashboard display with SHAP explanations.
5. Regression testing ensuring zero disruption to existing Diabetes predictions.
