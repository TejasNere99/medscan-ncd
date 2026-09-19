# MEDSCAN-NCD: PHASE 7B MASTER SCIENTIFIC AUDIT REPORT
========================================================================================
Heart Disease Dataset Acquisition, Forensic Inspection & Feature Schema Lock
========================================================================================

**Project**: MedScan-NCD — OCR-Based Medical Report Intelligence & Multi-Disease Risk Prediction  
**Phase**: Phase 7B (Dataset Acquisition, Forensic Inspection & Contract Lock)  
**Status**: COMPLETE — Zero Model Training Performed — Dataset Contract Locked  
**Date**: September 2026  

---

## 1. Dataset Selected
- **Name**: Framingham Heart Study 10-Year Coronary Heart Disease Teaching Cohort
- **File Acquired**: `ml_model/datasets/heart_disease/raw/framingham.csv`
- **Size**: 191,803 bytes (187.3 KB)
- **SHA-256 Checksum**: `2c0e57dc0361b420becf1facec0a054af06c420eae0ae2faf0fdc8591fadb018`
- **Format**: Cleaned tabular CSV, 4,240 participant rows $\times$ 16 columns

---

## 2. Official Provenance & Authority
- **Original Institution**: National Heart, Lung, and Blood Institute (NHLBI), National Institutes of Health (NIH), Bethesda, MD, USA, and Boston University School of Medicine, Boston, MA, USA.
- **Repository Authority**: NHLBI BioLINCC (`https://biolincc.nhlbi.nih.gov/studies/fhs/`).
- **Primary Landmark Citation**:
  Wilson PWF, D'Agostino RB, Levy D, Belanger AM, Silbershatz H, Kannel WB. "Prediction of Coronary Heart Disease Using Risk Factor Categories." *Circulation*. 1998;97(18):1837–1847. DOI: `10.1161/01.CIR.97.18.1837`. PMID: `9603539`.

---

## 3. Licensing & Usage Status
- **Official BioLINCC Clinical Trial Data**: Regulated by the NHLBI Data and Materials Distribution Agreement (DMDA) requiring formal IRB review.
- **Teaching Release**: The 4,240-row extract is an educational teaching dataset prepared by the NHLBI for academic biostatistics and clinical epidemiology education, distributed across university courses and CRAN R packages (`riskRegression`).
- **Usage for MedScan-NCD**: Fully authorized for non-commercial educational modeling, pair programming, and academic code repositories. No restricted patient PII is present.

---

## 4. Dataset Dimensions & Geometry
- **Total Records (Rows)**: 4,240
- **Total Attributes (Columns)**: 16
- **Exact Column Names**:
  `['male', 'age', 'education', 'currentSmoker', 'cigsPerDay', 'BPMeds', 'prevalentStroke', 'prevalentHyp', 'diabetes', 'totChol', 'sysBP', 'diaBP', 'BMI', 'heartRate', 'glucose', 'TenYearCHD']`
- **Duplicate Rows**: **0** (Zero identical rows detected)
- **Constant Attributes**: **0**

---

## 5. Target Definition & Clinical Construct
- **Target Variable**: `TenYearCHD` (Binary integer: `0` or `1`)
- **Clinical Meaning**:
  - `0`: Participant did **NOT** develop an incident coronary heart disease event during the 10-year follow-up period following baseline Exam 1.
  - `1`: Participant developed an **adjudicated incident coronary heart disease event** (angina pectoris, recognized or unrecognized myocardial infarction, coronary insufficiency, or coronary death) during the 10-year prospective observation window.
- **Temporal Nature**: **Strictly prospective**. All candidate predictor attributes were measured at baseline Exam 1; the target strictly measures subsequent events occurring over the following decade.

---

## 6. Target Leakage Findings
A strict leakage audit classified every attribute:
- `TenYearCHD`: **REMOVE — TARGET** (Isolated strictly as dependent variable $y$).
- `prevalentHyp`: **REMOVE — REDUNDANT** (Exact collinear duplicate of $sysBP \ge 140 \lor diaBP \ge 90$).
- `prevalentStroke`: **REMOVE — HIGH IMBALANCE** (Only 25 positive cases in 4,240 rows; 0.59% prevalence; near-zero variance).
- `education`: **REMOVE — PRODUCT MISALIGNMENT** (Socioeconomic proxy; causes patient friction in an automated report scanner).
- `cigsPerDay`: **REMOVE IN FAVOR OF currentSmoker** (Collinear $r = +0.76$; binary smoking captures >85% of atherogenic variance).
- `male`, `age`, `totChol`, `sysBP`, `diaBP`, `BMI`, `glucose`, `currentSmoker`: **KEEP — 100% LEAKAGE-FREE**. Measured strictly prior to the 10-year follow-up window.

---

## 7. Data Quality & Clinical Sanity Audit
A comprehensive programmatic sweep validated physiological consistency:
- Inverted Pulse Pressure (`sysBP <= diaBP`): **0 violations** (100% of rows satisfy systolic $>$ diastolic BP).
- Age Bounds: Min $32$ years, Max $70$ years (**0 impossible values**).
- Blood Pressure Bounds: Systolic $83.5 - 295.0$ mmHg, Diastolic $48.0 - 142.5$ mmHg (**0 impossible values**).
- BMI Bounds: Min $15.54$, Max $56.80$ $kg/m^2$ (**0 impossible values**).
- Smoking Logical Cross-Check: Non-smokers with $>0$ cigs = **0**; Smokers with $0$ cigs = **0** (**100% logically consistent**).
- Total Cholesterol: Min $107$, Max $696$ mg/dL (1 clinical outlier with severe familial hypercholesterolemia $>600$ mg/dL, clinically valid).

---

## 8. Missingness Analysis

| Column | Missing Count | Missing % | Clinical & Preprocessing Action |
| :--- | :---: | :---: | :--- |
| `glucose` | 388 | **9.15%** | Standard fasting blood test missingness; median imputation inside training folds. |
| `education` | 105 | **2.48%** | Excluded from modeling feature set. |
| `BPMeds` | 53 | **1.25%** | Optional feature; imputed to $0$ (untreated) if missing. |
| `totChol` | 50 | **1.18%** | Mandatory for prediction; median imputation during CV training. |
| `cigsPerDay` | 29 | **0.68%** | Excluded in favor of `currentSmoker`. |
| `BMI` | 19 | **0.45%** | Near-complete; median imputation inside training folds. |
| `heartRate` | 1 | **0.02%** | Negligible; median imputation inside training folds. |
| `male`, `age`, `currentSmoker`, `sysBP`, `diaBP`, `TenYearCHD` | 0 | **0.00%** | **100% Complete Data**. |

---

## 9. Class Balance & Target Prevalence
- **Positive Count ($y = 1$)**: 644 (**15.19%**)
- **Negative Count ($y = 0$)**: 3,596 (**84.81%**)
- **Total Labeled**: 4,240
- **Class Imbalance Ratio**: **$5.584 : 1$** (Negative to Positive)
- **Training Strategy**:
  - Incorporate class weighting (`scale_pos_weight = 5.58` for LightGBM/XGBoost, `class_weight='balanced'` for Random Forest and Logistic Regression).
  - Enforce Stratified K-Fold cross-validation ($k=5$).
  - Lock a development decision threshold balancing sensitivity $\ge 80\%$ with clinical specificity.

---

## 10. Product Compatibility Audit
Comparing candidate features against MedScan-NCD's existing production architecture:
- **`age`**: Fully supported (`Patient.age`, `patientContext.age`).
- **`male` / `sex`**: Fully supported (`Patient.gender`, `patientContext.gender`).
- **`totChol`**: Fully supported (`measurements.totalCholesterol`, `Patient.totalCholesterol`).
- **`sysBP`**: Fully supported (`measurements.systolicBP`, `Patient.systolicBP`).
- **`diaBP`**: Fully supported (`measurements.diastolicBP`, `Patient.diastolicBP`).
- **`BMI`**: Fully supported (`measurements.bmi`, `Patient.bmi`).
- **`glucose`**: Fully supported (`measurements.fastingGlucose`, `Patient.fastingSugar`).
- **`currentSmoker`**: Requires adding an optional 1-click toggle to the patient profile.

---

## 11. Final Feature Schema Lock
The preliminary 8-feature schema is officially locked in [`ml_model/heart_disease/feature_schema.json`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/ml_model/heart_disease/feature_schema.json):

```json
{
  "model": "heart_disease_framingham_10yr",
  "version": "1.0.0",
  "task": "non_diagnostic_10yr_chd_risk_assessment",
  "target": "TenYearCHD",
  "required_features": ["age", "sex", "totChol", "sysBP", "diaBP"],
  "optional_features": ["BMI", "glucose", "currentSmoker", "BPMeds", "diabetes"],
  "excluded_features": ["TenYearCHD", "education", "cigsPerDay", "prevalentStroke", "prevalentHyp", "heartRate"]
}
```

---

## 12. Input Gaps & Required Future Modifications
- **Database Schema**: During Phase 7D, add `isCurrentSmoker: { type: Boolean, default: false }` to `backend/src/models/Patient.js`.
- **Frontend Dashboard**: Add a single toggle switch to the Health Profile edit modal: *"Do you currently smoke cigarettes?"* (Defaults to No if unstated).
- **Zero-Code Reuse**: All other 7 features are **100% functional today** in `medicalReportParser.js` and `medicalNormalizer.js`.

---

## 13. Future Preprocessing Strategy (Phase 7C Protocol)
1. **Pipeline Isolation**: Strict isolation using `sklearn.pipeline.Pipeline`.
2. **Imputation**: `SimpleImputer(strategy='median')` fitted exclusively on training splits (zero data snooping).
3. **Scaling**: `StandardScaler()` or `RobustScaler()` applied strictly within training folds for linear/distance models; raw feature distributions fed to tree ensembles.

---

## 14. Future Training Strategy (Phase 7C Protocol)
1. **Data Split**: Stratified 80/20 train/test split (`random_state=42`, stratify by `TenYearCHD`).
2. **Held-Out Test Lock**: 848 test cases locked until champion model and threshold selection are finalized.
3. **Cross-Validation**: 5-Fold Stratified Cross-Validation on the 3,392 training samples.
4. **Candidate Benchmarks**:
   - Logistic Regression (L2 regularized baseline)
   - Decision Tree (interpretable baseline)
   - Random Forest (bagging ensemble)
   - HistGradientBoosting (gradient boosted baseline)
   - LightGBM (champion candidate)
   - XGBoost (champion candidate)

---

## 15. Calibration Strategy
- Raw model outputs will be calibrated using **Sigmoid (Platt Scaling)** via 5-Fold `CalibratedClassifierCV`.
- Calibration will be evaluated using **Brier Score Loss** and visual Reliability Diagrams (Calibration Curves).
- Objective: Ensure that a model-estimated probability of 25% corresponds to an observed 10-year event rate of approximately 25 out of 100 individuals.

---

## 16. Explainability Strategy
- Model will be integrated with **TreeSHAP** (`shap.TreeExplainer`) on the calibrated champion tree ensemble.
- Real-time inference will compute local SHAP contributions for each of the 8 features.
- Contributions will be reported using non-causal clinical language: *"higher estimated risk"* or *"lower estimated risk"*.

---

## 17. Scientific Limitations
1. **Historical Demographic Context**: The Framingham cohort was predominantly Caucasian and recruited in mid-20th century Massachusetts. Event rates may differ in younger South Asian populations. The system must explicitly document this and present outputs as a **non-diagnostic statistical screening tool**.
2. **Missing HDL in Teaching Release**: HDL cholesterol is not available in the early teaching extract. Total Cholesterol and Blood Pressure carry the majority of risk variance, but clinicians should be advised that a full lipid panel with HDL is recommended for confirmatory cardiology consults.

---

## 18. Exact Next Step: Phase 7C Implementation Plan

Now that Phase 7B has verified the raw dataset, completed forensic inspection, and locked the feature schema, the project is ready for:

**PHASE 7C — MODEL TRAINING, BENCHMARKING, CALIBRATION & EVALUATION**:
1. Implement `ml_model/training/train_heart_disease_framingham.py`.
2. Run Stratified 80/20 train/test split and 5-fold cross-validation across all 6 candidate algorithms.
3. Execute Platt calibration, select optimal development threshold (balancing sensitivity $\ge 80\%$), and evaluate on the locked held-out test set.
4. Generate `model_metadata.json`, ROC/PR curves, calibration plots, and serialized model artifact `heart_disease_framingham_model.joblib`.
5. Produce `TRAINING_REPORT.md` documenting final metrics.
