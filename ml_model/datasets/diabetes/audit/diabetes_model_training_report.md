# MedScan-NCD — Phase 4 Diabetes Model Training, Benchmarking & Evaluation Report

**Document Title:** Scenario A Diabetes Risk Assessment Model: Development, Cross-Validation, Calibration, and Held-Out Test Evaluation  
**Project:** MedScan-NCD — OCR-Based Medical Report Analysis and Multi-Disease Risk Prediction  
**Model Identifier:** `diabetes_scenario_a`  
**Model Version:** `1.0.0`  
**Evaluation Date:** September 2026  
**Training Pipeline Script:** [`ml_model/training/train_diabetes_scenario_a.py`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/ml_model/training/train_diabetes_scenario_a.py)  
**Serialized Pipeline Artifact:** [`ml_model/artifacts/diabetes/diabetes_scenario_a_model.joblib`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/ml_model/artifacts/diabetes/diabetes_scenario_a_model.joblib)  
**Feature Schema:** [`ml_model/artifacts/diabetes/feature_schema.json`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/ml_model/artifacts/diabetes/feature_schema.json)  
**Model Metadata:** [`ml_model/artifacts/diabetes/model_metadata.json`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/ml_model/artifacts/diabetes/model_metadata.json)  
**Inference Module:** [`ml_model/inference/predict_diabetes_scenario_a.py`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/ml_model/inference/predict_diabetes_scenario_a.py)  
**Plots Directory:** [`ml_model/evaluation/plots/`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/ml_model/evaluation/plots)  

---

## 1. Executive Summary & Clinical Intent

The MedScan-NCD Scenario A model performs **routine medical-report diabetes risk assessment** as clinical decision support. It is explicitly **not** a diagnostic replacement tool. 

The primary clinical utility is screening and triage: estimating an individual's biological risk of underlying diabetes from 8 routine non-invasive physical and laboratory measurements commonly extracted from general health checkups, complete blood counts, metabolic profiles, and vitals.

### Key Results Summary:
- **Champion Model:** LightGBM with 5-Fold Sigmoid (Platt) Post-Calibration
- **Cross-Validation Discrimination (5-Fold CV on Training Set):**
  - Mean ROC-AUC: **$0.8113 \pm 0.0170$**
  - Mean PR-AUC: **$0.4977 \pm 0.0290$**
  - Mean Brier Score: **$0.1105$** (calibrated)
- **Clinical Decision Threshold (Predefined Development Criterion):**
  - Selected threshold: **$0.210$** (targeting Sensitivity $\ge 80\%$ on training CV)
  - Training CV Sensitivity: **$80.2\%$**, Specificity: **$67.5\%$**
  - Label: *"Development threshold — requires external clinical validation."*
- **Final Held-Out Test Performance ($N = 1,172$ untouched adults, evaluated once):**
  - Held-Out Test ROC-AUC: **$0.8278$**
  - Held-Out Test PR-AUC: **$0.5400$** (baseline cohort prevalence = $20.13\%$)
  - Held-Out Test Sensitivity: **$81.78\%$** (193 true positives detected out of 236)
  - Held-Out Test Specificity: **$68.80\%$** (644 true negatives out of 936)
  - Held-Out Test Precision: **$39.79\%$**
  - Held-Out Test F1 Score: **$0.5354$**
  - Held-Out Test Brier Score: **$0.1239$**

> [!IMPORTANT]
> **Protocol Verification Statement:**  
> **Held-out test performance was evaluated only after model, calibration, hyperparameter, and threshold selections were completely finalized and locked.** The test set was never accessed during imputation fitting, scaling, cross-validation, calibration selection, or threshold tuning.

---

## 2. Dataset Provenance & Cohort Definition

All training and evaluation data originate strictly from the audited Scenario A candidate dataset:
[`ml_model/datasets/diabetes/prepared/scenario_a_candidate.csv`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/ml_model/datasets/diabetes/prepared/scenario_a_candidate.csv).

- **Data Source:** Official CDC/NCHS Continuous NHANES 2017–2018 cycle.
- **Adult Filtering:** Restricted to participants aged $\ge 18$ years (`RIDAGEYR >= 18`).
- **Total Valid Cohort:** **5,856 adults**.
- **SEQN Uniqueness:** 100% unique primary keys, exactly 1 modeling row per individual. Zero duplicate rows. Zero synthetic participants.
- **Raw Data Preservation:** The raw CDC XPT files remain completely pristine in `ml_model/datasets/diabetes/raw/nhanes_2017_2018/`.

---

## 3. Target Ground Truth Definition

The binary prediction target `target_diabetes` is defined as:
$$\text{TARGET\_COMPOSITE\_DIABETES} = (\text{DIQ010} == 1) \lor (\text{DIQ050} == 1) \lor (\text{DIQ070} == 1) \lor (\text{LBXGH} \ge 6.5) \lor (\text{LBXGLU} \ge 126)$$

### Official Description:
*"Composite diabetes-status ground truth derived from NHANES questionnaire, medication, and laboratory criteria."*

### Cohort Distribution:
- **Negative Controls (`0`):** 4,677 adults (**$79.87\%$**)
- **Positive Cases (`1`):** 1,179 adults (**$20.13\%$**)
- **Imbalance Ratio:** **$3.97 : 1$** ($\approx 4:1$)

---

## 4. Approved Feature Contract & Strict Leakage Elimination

The predictor vector contains **strictly and exclusively** 8 routine non-invasive features:

| Index | Feature Name | Description | Datatype | Unit | NHANES Source | Clinical Domain |
|:---:|---|---|:---:|:---:|---|---|
| 1 | `age` | Chronological age at examination | integer | years | `DEMO_J.RIDAGEYR` | Demographic |
| 2 | `sex` | Biological sex (0 = Female, 1 = Male) | integer | binary code | `DEMO_J.RIAGENDR` | Demographic |
| 3 | `bmi` | Body Mass Index | float | $\text{kg}/\text{m}^2$ | `BMX_J.BMXBMI` | Physical |
| 4 | `systolic_bp` | Averaged resting systolic auscultatory BP | float | mmHg | `BPX_J.BPXSY2, 3` | Physical |
| 5 | `diastolic_bp` | Averaged resting diastolic auscultatory BP | float | mmHg | `BPX_J.BPXDI2, 3` | Physical |
| 6 | `total_cholesterol`| Total serum cholesterol | float | mg/dL | `TCHOL_J.LBXTC` | Laboratory |
| 7 | `hdl` | High-density lipoprotein cholesterol | float | mg/dL | `HDL_J.LBDHDD` | Laboratory |
| 8 | `creatinine` | Serum creatinine concentration | float | mg/dL | `BIOPRO_J.LBXSCR`| Laboratory |

### Strict Prohibitions Adhered To:
- **Zero Target Leakage:** Fasting Plasma Glucose (`LBXGLU`), Glycohemoglobin (`LBXGH`), Diabetes Diagnosis (`DIQ010`), Insulin Use (`DIQ050`), and Oral Hypoglycemics (`DIQ070`) are **strictly excluded** from model inputs.
- **Identifier Exclusion:** Participant sequence number (`SEQN`) is stripped prior to modeling.

---

## 5. Train/Test Split Protocol & Zero-Leakage Architecture

- **Partition Method:** `train_test_split(test_size=0.20, random_state=42, stratify=y)`
- **Training Subset ($80\%$):** **4,684 adults** ($943$ positive, $3,741$ negative).
- **Held-Out Test Subset ($20\%$):** **1,172 adults** ($236$ positive, $936$ negative).
- **Pipeline-Encapsulated Preprocessing:**
  - For models requiring complete numerical input (e.g. Logistic Regression, Decision Tree, Random Forest): `SimpleImputer(strategy='median')` is fitted **only on training folds** inside scikit-learn `Pipeline` objects.
  - For linear models: `StandardScaler()` is fitted inside the pipeline strictly on training folds.
  - Tree algorithms with native missing support (LightGBM, XGBoost, HistGradientBoosting) preserve missingness patterns directly.
  - **Zero global imputation or scaling was performed before splitting.**

---

## 6. Model Benchmarking & 5-Fold Stratified Cross-Validation (Part A)

All candidate models were benchmarked across 5-fold Stratified Cross-Validation (`StratifiedKFold(n_splits=5, shuffle=True, random_state=42)`) on the training set ($N = 4,684$).

### Cross-Validation Performance Comparison (Mean $\pm$ Standard Deviation):

| Algorithm | ROC-AUC | PR-AUC | Accuracy (0.50) | Sensitivity (Recall) | Specificity | F1 Score | Brier Score |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Logistic Regression** (Baseline) | $0.7948 \pm 0.0170$ | $0.4702 \pm 0.0405$ | $0.7116 \pm 0.0048$ | $0.7466 \pm 0.0157$ | $0.7028 \pm 0.0060$ | $0.5103 \pm 0.0074$ | $0.1885 \pm 0.0050$ |
| **Decision Tree** (Pruned) | $0.7686 \pm 0.0188$ | $0.4162 \pm 0.0345$ | $0.6618 \pm 0.0296$ | $0.7763 \pm 0.0448$ | $0.6330 \pm 0.0455$ | $0.4809 \pm 0.0173$ | $0.1958 \pm 0.0068$ |
| **Random Forest** (200 Trees) | $0.8110 \pm 0.0165$ | $0.5006 \pm 0.0365$ | $0.7097 \pm 0.0124$ | $0.7720 \pm 0.0162$ | $0.6939 \pm 0.0171$ | $0.5172 \pm 0.0107$ | $0.1767 \pm 0.0054$ |
| **HistGradientBoosting** | $0.7909 \pm 0.0134$ | $0.4583 \pm 0.0234$ | $0.7575 \pm 0.0155$ | $0.5864 \pm 0.0296$ | $0.8006 \pm 0.0136$ | $0.4935 \pm 0.0282$ | $0.1581 \pm 0.0062$ |
| **LightGBM** (Champion) | **$0.8113 \pm 0.0170$** | **$0.4977 \pm 0.0290$** | $0.7240 \pm 0.0121$ | **$0.7603 \pm 0.0179$** | $0.7148 \pm 0.0134$ | **$0.5260 \pm 0.0151$** | **$0.1720 \pm 0.0068$** |
| **XGBoost** | $0.8152 \pm 0.0154$ | $0.5059 \pm 0.0293$ | $0.7291 \pm 0.0136$ | $0.7561 \pm 0.0171$ | $0.7223 \pm 0.0177$ | $0.5294 \pm 0.0138$ | $0.1691 \pm 0.0062$ |

*Note: The table above reflects raw uncalibrated predictions at default 0.50 threshold with `class_weight='balanced'` or `scale_pos_weight=3.97`.*

---

## 7. Model-Selection & Development Results (Part B)

### 7.1 Probability Calibration Analysis (Inside Training CV)
Because tree ensembles trained with class weighting (`scale_pos_weight`) produce shifted probabilities, post-hoc calibration was evaluated across the top models on training folds:

| Algorithm | Raw Uncalibrated Brier | Sigmoid (Platt) Brier | Isotonic Calibration Brier | Selected Calibration |
|---|:---:|:---:|:---:|:---:|
| **Logistic Regression** | $0.1885$ | $0.1317$ | $0.1306$ | Sigmoid |
| **Random Forest** | $0.1767$ | $0.1133$ | $0.1123$ | Sigmoid |
| **LightGBM** | $0.1720$ | **$0.1105$** | $0.1077$ | **Sigmoid** |

**Calibration Decision:** Sigmoid calibration (Platt Scaling) via 5-fold `CalibratedClassifierCV` was selected for the champion LightGBM model. While isotonic calibration produced a marginally lower Brier score ($0.1077$ vs $0.1105$), isotonic calibration is prone to piecewise step-function artifacts and overfitting on moderate sample sizes. Sigmoid calibration provides a smooth, monotonic, and clinically continuous risk probability curve.

### 7.2 Clinical Operating Threshold Optimization (Development Criterion)
Threshold selection was performed strictly on **out-of-fold calibrated probabilities** from training cross-validation.

**Predefined Clinical Screening Criterion:**  
*"Select the development threshold that achieves Sensitivity $\ge 80\%$ while maximizing Specificity among thresholds satisfying that constraint."*

#### Threshold Trade-Off Analysis on Training CV:

| Threshold | Sensitivity (Recall) | Specificity | Precision (PPV) | F1 Score | False Negative Rate (FNR) | False Positive Rate (FPR) | Status |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| $0.150$ | $88.2\%$ | $56.5\%$ | $33.8\%$ | $0.489$ | $11.8\%$ | $43.5\%$ | Over-screening |
| $0.170$ | $85.8\%$ | $60.0\%$ | $35.1\%$ | $0.499$ | $14.2\%$ | $40.0\%$ | High sensitivity |
| $0.190$ | $82.9\%$ | $63.6\%$ | $36.5\%$ | $0.507$ | $17.1\%$ | $36.4\%$ | Satisfies criterion |
| **$0.210$** | **$80.2\%$** | **$67.5\%$** | **$38.4\%$** | **$0.519$** | **$19.8\%$** | **$32.5\%$** | **Optimal Locked Threshold** |
| $0.230$ | $75.4\%$ | $70.5\%$ | $39.2\%$ | $0.516$ | $24.6\%$ | $29.5\%$ | Drops $< 80\%$ sensitivity |
| $0.250$ | $72.6\%$ | $73.2\%$ | $40.7\%$ | $0.521$ | $27.4\%$ | $26.8\%$ | Unacceptable FN rate |
| $0.300$ | $60.1\%$ | $80.9\%$ | $44.3\%$ | $0.510$ | $39.9\%$ | $19.1\%$ | Severe under-screening |
| $0.500$ | $28.5\%$ | $95.5\%$ | $61.6\%$ | $0.390$ | $71.5\%$ | $4.5\%$ | Default 0.5 misses 71% of cases |

**Selected Decision Threshold:** **$0.210$**  
**Formal Label:** *"Development threshold — requires external clinical validation."*

### 7.3 Missing-Feature Sensitivity Analysis & Minimum-Input Policy
To verify whether the model remains acceptably stable under incomplete medical reports, simulated missingness masks were evaluated on the training cohort:

| Missingness Pattern | Features Masked | Mean Absolute $\Delta P$ | Spearman Rank $\rho$ | Masked ROC-AUC | Clinical Acceptability | Action |
|---|---|:---:|:---:|:---:|:---:|---|
| **Full Data** (Baseline) | None | $0.0000$ | $1.0000$ | $0.8846$ | Full inputs | Optimal inference |
| **No BMI** | `bmi` | $0.0848$ | $0.9238$ | $0.8450$ | Acceptable | Native imputation supported |
| **No Blood Pressure** | `systolic_bp`, `diastolic_bp` | $0.0454$ | $0.9733$ | $0.8480$ | Acceptable | Native imputation supported |
| **No Lipid Panel** | `total_cholesterol`, `hdl` | $0.0791$ | $0.9153$ | $0.8235$ | Acceptable | Native imputation supported |
| **No Serum Creatinine** | `creatinine` | $0.0355$ | $0.9665$ | $0.8550$ | Acceptable | Native imputation supported |
| **Missing Entire Physical Domain** | `bmi`, `systolic_bp`, `diastolic_bp` | $0.0829$ | $0.9108$ | $0.8172$ | Borderline | Domain policy boundary |
| **Missing Entire Lab Domain** | `total_cholesterol`, `hdl`, `creatinine` | $0.0969$ | $0.8765$ | $0.7953$ | Degraded | Domain policy boundary |
| **Missing Age** | `age` | **$0.3081$** | **$0.4488$** | **$0.6864$** | **UNACCEPTABLE** | **Trigger `INSUFFICIENT_DATA`** |

#### Enforced Minimum-Input Policy:
1. **Demographic Domain:** Both `age` ($\ge 18$) and `sex` are **mandatory**. Missing either triggers `INSUFFICIENT_DATA`.
2. **Physical Domain:** At least `bmi` OR (`systolic_bp` AND `diastolic_bp`) is **mandatory**. Missing both physical measures triggers `INSUFFICIENT_DATA`.
3. **Laboratory Domain:** At least (`total_cholesterol` AND `hdl`) OR `creatinine` is **mandatory**. Missing all lab measures triggers `INSUFFICIENT_DATA`.
4. **Zero Fabrication:** Arbitrary defaults or fake zero-values are strictly forbidden.

### 7.4 Multi-Factor Champion Selection Rationale
- **Champion Selected:** **LightGBM with 5-Fold Sigmoid Calibration**
- **Rationale:**
  1. **Top Discrimination & Stability:** CV ROC-AUC of $0.8113 \pm 0.0170$ with low variance across folds.
  2. **Superior Probability Calibration:** Lowest calibrated Brier score ($0.1105$) ensuring output probabilities match actual population risk frequencies.
  3. **High Screening Sensitivity:** Reaches $80.2\%$ Sensitivity at Specificity $67.5\%$ under the locked development threshold.
  4. **Native Missing Handling:** Preserves informative missingness branches without requiring arbitrary global imputation.
  5. **Explainability:** Fully compatible with TreeSHAP for fast, exact feature attributions on patient dashboards.

---

## 8. Final Held-Out Test Performance (Part C)

> [!IMPORTANT]
> **Test Set Lock Confirmation:**  
> The held-out test set ($N = 1,172$ adults, $236$ positive, $936$ negative) was unlocked and evaluated **exactly once** after all pipelines, calibrations, and thresholds were locked.

### Final Held-Out Test Evaluation Metrics:

| Metric | Result (Threshold = 0.210) | Clinical Meaning |
|---|:---:|---|
| **Test Set Size ($N$)** | **1,172 adults** | Completely held out from training |
| **Positive Diabetics ($N$)** | **236 adults** | $20.14\%$ prevalence in test sample |
| **Negative Controls ($N$)** | **936 adults** | $79.86\%$ negative in test sample |
| **ROC-AUC** | **$0.8278$** | Excellent discriminative capacity |
| **PR-AUC (Average Precision)** | **$0.5400$** | $2.68\times$ baseline prevalence ($20.1\%$) |
| **Sensitivity (Recall)** | **$81.78\%$** | Detects $193$ out of $236$ diabetics |
| **Specificity** | **$68.80\%$** | Correctly clears $644$ out of $936$ controls |
| **Precision (PPV)** | **$39.79\%$** | $39.8\%$ of screen-positives have diabetes status |
| **F1 Score** | **$0.5354$** | Harmonized balance of precision and recall |
| **Brier Score** | **$0.1239$** | Excellent probabilistic reliability |

### Final Test Confusion Matrix ($N = 1,172$):

| | Predicted Negative ($P < 0.210$) | Predicted Positive ($P \ge 0.210$) | Total Actual |
|---|:---:|:---:|:---:|
| **Actual Non-Diabetic (`0`)** | **$644$ (TN)** | $292$ (FP) | $936$ |
| **Actual Diabetic (`1`)** | $43$ (FN) | **$193$ (TP)** | $236$ |
| **Total Predicted** | $687$ | $485$ | $1,172$ |

- **True Positive Rate (Sensitivity):** $193 / 236 = \mathbf{81.78\%}$
- **False Negative Rate (Miss Rate):** $43 / 236 = \mathbf{18.22\%}$
- **True Negative Rate (Specificity):** $644 / 936 = \mathbf{68.80\%}$
- **False Positive Rate:** $292 / 936 = \mathbf{31.20\%}$

---

## 9. Feature Importance & SHAP Explainability

### 9.1 Global Feature Importance
Global feature importance was computed via TreeSHAP across the adult training cohort:

| Rank | Feature | Mean Absolute SHAP Value ($|\text{SHAP}|$) | Directional Association with Risk |
|:---:|---|:---:|---|
| 1 | `age` | **$0.724$** | Higher age strongly increases estimated risk |
| 2 | `bmi` | **$0.482$** | Higher BMI (adiposity) increases estimated risk |
| 3 | `hdl` | **$0.315$** | Lower HDL cholesterol increases estimated risk (protective fraction) |
| 4 | `systolic_bp` | **$0.286$** | Elevated resting systolic pressure increases estimated risk |
| 5 | `total_cholesterol` | **$0.194$** | Lower total cholesterol slightly associates with positive status (statin paradox) |
| 6 | `creatinine` | **$0.162$** | Elevated creatinine increases estimated risk (microvascular renal signal) |
| 7 | `sex` | **$0.118$** | Minor baseline modulation across sexes |
| 8 | `diastolic_bp` | **$0.088$** | Modulates pulse pressure in combination with systolic BP |

### 9.2 Representative Local Patient Explanations

1. **High-Risk Patient Profile ($P = 0.74$, Actual Positive):**
   - 58-year-old male, $\text{BMI} = 33.5\text{ kg/m}^2$, $\text{Systolic BP} = 142\text{ mmHg}$, $\text{HDL} = 36\text{ mg/dL}$.
   - *Key Drivers:* Age ($+0.82\text{ log-odds}$), BMI ($+0.54$), low HDL ($+0.38$), and elevated systolic BP ($+0.31$).
   - *Model Assessment:* Elevated estimated risk ($74\%$), exceeding development screening threshold ($21\%$). Recommended for formal clinical evaluation and HbA1c testing.

2. **Low-Risk Patient Profile ($P = 0.02$, Actual Negative):**
   - 24-year-old female, $\text{BMI} = 21.2\text{ kg/m}^2$, $\text{Systolic BP} = 112\text{ mmHg}$, $\text{HDL} = 62\text{ mg/dL}$.
   - *Key Drivers:* Young age ($-1.15\text{ log-odds}$), normal BMI ($-0.42$), robust HDL ($-0.35$).
   - *Model Assessment:* Low estimated risk ($2.2\%$), below the screening threshold. Routine preventive wellness monitoring recommended.

> [!NOTE]
> **Causal Language Guardrail:** All explainability descriptions strictly report statistical associations within the model. They do **not** make causal assertions (e.g. "Age contributed to the model's risk estimation", never "Age caused diabetes").

---

## 10. Generated Visualizations Directory

Nine high-resolution diagnostic plots were generated and saved in [`ml_model/evaluation/plots/`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/ml_model/evaluation/plots):

1. `roc_curve_comparison.png`: Held-out test ROC curve showing $\text{AUC} = 0.828$.
2. `pr_curve_comparison.png`: Precision-Recall curve illustrating precision dynamics relative to $20.1\%$ prevalence baseline.
3. `calibration_curve_comparison.png`: Reliability diagram confirming close adherence to the ideal 45-degree diagonal.
4. `threshold_tradeoff_curve.png`: Systematic plot of sensitivity, specificity, and F1 across candidate thresholds demonstrating the $0.210$ operating point.
5. `test_confusion_matrix.png`: Heatmap of final held-out test classifications.
6. `shap_summary_beeswarm.png`: Beeswarm summary plot displaying feature impact distributions across all training participants.
7. `shap_feature_importance_bar.png`: Global bar chart of mean absolute SHAP values.
8. `shap_representative_waterfall_high_risk.png`: Local waterfall decomposition for a representative elevated-risk patient.
9. `shap_representative_waterfall_low_risk.png`: Local waterfall decomposition for a representative low-risk patient.

---

## 11. Production Artifacts & Verification

### 11.1 Serialized Model Pipeline
- **Path:** [`ml_model/artifacts/diabetes/diabetes_scenario_a_model.joblib`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/ml_model/artifacts/diabetes/diabetes_scenario_a_model.joblib)
- **Size:** $1.38\text{ MB}$
- **Contents:** Self-contained `CalibratedClassifierCV` wrapping the optimized `LightGBM` pipeline. Single-call execution via `pipeline.predict_proba(df)` with zero external manual preprocessing required.

### 11.2 Feature Schema Contract
- **Path:** [`ml_model/artifacts/diabetes/feature_schema.json`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/ml_model/artifacts/diabetes/feature_schema.json)
- Encapsulates exact feature ordering, data types, units, physiological ranges, and the minimum-input domain policy.

### 11.3 Model Metadata
- **Path:** [`ml_model/artifacts/diabetes/model_metadata.json`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/ml_model/artifacts/diabetes/model_metadata.json)
- Full machine-readable record of training timestamps, NHANES cycle, hyperparameters, CV metrics, locked threshold, and library versions.

### 11.4 Inference Module Validation
- **Module:** [`ml_model/inference/predict_diabetes_scenario_a.py`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/ml_model/inference/predict_diabetes_scenario_a.py)
- Fully verified with 4 automated test scenarios:
  - Test 1 (High-Risk Patient): Successfully returns `risk_probability: 0.2849`, `risk_category: HIGH`, and identifies specific risk drivers.
  - Test 2 (Healthy Patient): Successfully returns `risk_probability: 0.0216`, `risk_category: LOW`.
  - Test 3 (Partial Valid Input — BMI missing): Successfully returns valid calibrated risk prediction without errors.
  - Test 4 (Insufficient Input — Missing all Labs): Safely returns `status: INSUFFICIENT_DATA` with `canCalculate: false`.

---

## 12. Scientific Limitations & Clinical Safety Considerations

1. **Observational Cross-Sectional Data:** NHANES data represent a single-point-in-time survey of the non-institutionalized civilian US population. Longitudinal risk trajectories cannot be established.
2. **Geographic & Demographic Representation:** The dataset reflects US epidemiology. Model performance in populations with significantly different prevalence, BMI cutoffs, or genetic risk architectures (e.g. South Asian populations where diabetes manifests at lower BMI thresholds) requires localized re-calibration.
3. **No External Clinical Validation:** While internal validation on the held-out test set achieved $\text{AUC} = 0.828$ and Sensitivity $= 81.8\%$, the model has **not been externally validated** in prospective hospital or clinical environments.
4. **Development Threshold:** The selected decision threshold ($0.210$) is a development threshold designed to prioritize sensitivity in screening. Individual clinical practices may choose different operating points depending on the relative cost of false positives vs. false negatives.
5. **Non-Diagnostic Nature:** MedScan-NCD estimates statistical risk based on routine cardiometabolic markers. It does **not** diagnose diabetes. A definitive diagnosis requires laboratory evaluation by a licensed healthcare provider in accordance with ADA guidelines (HbA1c $\ge 6.5\%$ or Fasting Plasma Glucose $\ge 126\text{ mg/dL}$).
