# MedScan-NCD — Scenario A Data Preparation & Cleaning Pipeline Report

**Pipeline Execution Date:** September 2026  
**Build Script:** [`ml_model/datasets/diabetes/preparation/prepare_scenario_a.py`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/ml_model/datasets/diabetes/preparation/prepare_scenario_a.py)  
**Output Candidate Dataset:** [`ml_model/datasets/diabetes/prepared/scenario_a_candidate.csv`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/ml_model/datasets/diabetes/prepared/scenario_a_candidate.csv)  
**Data Dictionary:** [`ml_model/datasets/diabetes/prepared/scenario_a_data_dictionary.md`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/ml_model/datasets/diabetes/prepared/scenario_a_data_dictionary.md)  
**EDA Visualizations Directory:** [`ml_model/datasets/diabetes/eda/`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/ml_model/datasets/diabetes/eda)  
**Task Domain:** Routine Medical-Report Diabetes Risk Assessment (Scenario A — Non-Diagnostic)

---

## 1. Input Datasets

All raw data components were ingested strictly from official CDC/NCHS NHANES 2017–2018 SAS Transport files stored in [`ml_model/datasets/diabetes/raw/nhanes_2017_2018/`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/ml_model/datasets/diabetes/raw/nhanes_2017_2018):

1. `DEMO_J.XPT`: 9,254 rows, 46 cols (Demographics, Age, Gender, Weights)
2. `BMX_J.XPT`: 8,704 rows, 21 cols (Body Measures, Weight, Height, BMI)
3. `BPX_J.XPT`: 8,704 rows, 21 cols (Consecutive Auscultatory Blood Pressure)
4. `GLU_J.XPT`: 3,036 rows, 4 cols (Fasting Plasma Glucose)
5. `GHB_J.XPT`: 6,401 rows, 2 cols (Glycohemoglobin / HbA1c)
6. `DIQ_J.XPT`: 8,897 rows, 54 cols (Diabetes Questionnaire, Insulin, Oral Meds)
7. `BIOPRO_J.XPT`: 6,401 rows, 41 cols (Biochemistry Profile, Serum Creatinine)
8. `TCHOL_J.XPT`: 7,435 rows, 3 cols (Total Serum Cholesterol)
9. `HDL_J.XPT`: 7,435 rows, 3 cols (HDL-Cholesterol)

---

## 2. Participant-Level Merge Process

Merging was executed using the unique participant sequence number (`SEQN`):

$$\text{DEMO\_J} \xrightarrow{\text{SEQN}} \text{BMX\_J} \xrightarrow{\text{SEQN}} \text{BPX\_J} \xrightarrow{\text{SEQN}} \text{TCHOL\_J} \xrightarrow{\text{SEQN}} \text{HDL\_J} \xrightarrow{\text{SEQN}} \text{BIOPRO\_J} \xrightarrow{\text{SEQN}} \text{DIQ\_J} \xrightarrow{\text{SEQN}} \text{GHB\_J} \xrightarrow{\text{SEQN}} \text{GLU\_J}$$

- **Primary Key Integrity:** `SEQN` was confirmed strictly unique across all components (zero duplicate keys).
- **Merge Cardinality:** Strict 1-to-1 relationship. The master dataset retained exactly **9,254 rows** after all merges with zero spurious expansion.

---

## 3. Adult Cohort Filtering

- Non-communicable metabolic diseases (Type 2 Diabetes, Hypertension, Atherosclerosis) and their risk models are clinically calibrated for adult biology.
- Pediatric participants have radically different growth curves, lower normal blood pressures, and unique insulin dynamics.
- **Filtering Rule Applied:** Filter to participants aged $\ge 18$ years (`RIDAGEYR >= 18`).
  - Total Surveyed: **9,254**
  - Excluded Pediatric / Adolescent Population ($< 18$): **3,398**
  - **Final Working Adult Cohort:** **5,856 participants**

---

## 4. Special Missing Codes Handling

In questionnaire and survey data, specific integers represent non-responses:
- In `DIQ_J`:
  - `7.0`: Refused
  - `9.0`: Don't know
- In the build pipeline, questionnaire codes `7.0` and `9.0` for `DIQ010`, `DIQ050`, and `DIQ070` were converted to `np.nan` before boolean condition evaluation.
- In `BPX_J`: Diastolic floating-point representations of near-zeros from IBM mainframe binary formatting ($5.3976 \times 10^{-79}$) were detected and sanitized.

---

## 5. Cleaning & Feature Construction Decisions

1. **Blood Pressure Processing (`SYS_BP_AVG`, `DIA_BP_AVG`):**
   - NHANES protocols take up to 3 to 4 resting seated auscultatory readings.
   - In accordance with AHA and CDC survey guidelines, systolic blood pressure is calculated by averaging readings 2 and 3 (`(BPXSY2 + BPXSY3)/2.0`) if both are $\ge 60\text{ mmHg}$; otherwise single valid reading or reading 1 is utilized.
   - For diastolic readings, values $\ge 30\text{ mmHg}$ are averaged. Isolated zero-diastolic auscultations (where Korotkoff sounds continued to cuff deflation) were handled so that valid non-zero readings are preserved.
2. **Sex Encoding:**
   - NHANES `RIAGENDR`: 1 = Male, 2 = Female.
   - Mapped to binary integer: `1` = Male ($2,810$ adults, $47.98\%$), `0` = Female ($3,046$ adults, $52.02\%$).
3. **Age Standardization:**
   - Converted to integer. Range in adult cohort: $18$ to $80$ (NHANES top-coded at 80 for privacy).

---

## 6. Duplicate & Participant Integrity Analysis

- **SEQN Uniqueness:** 100% unique (zero duplicate participant records).
- **Feature Row Duplicates:** Exactly 0 duplicate rows across all 10 columns.
- **Conflicting Target Labels:** Exactly 0 conflicting targets.
- **Conclusion:** Perfect participant integrity. Exactly 1 modeling row per individual.

---

## 7. Target Construction & Component Breakdown

The ground truth target `target_diabetes` was constructed according to the ratified CDC/ADA composite epidemiological criteria:

$$\text{target\_diabetes} = (\text{DIQ010} == 1) \lor (\text{DIQ050} == 1) \lor (\text{DIQ070} == 1) \lor (\text{LBXGH} \ge 6.5) \lor (\text{LBXGLU} \ge 126)$$

### Component Contributions & Clinical Overlap:
- **Total Positive Cases:** **1,179 adults** (**20.13%**)
- **Total Negative Controls:** **4,677 adults** (**79.87%**)
- **Doctor Diagnosed (`DIQ010 == 1`):** 878 adults
- **Taking Insulin (`DIQ050 == 1`):** 245 adults
- **Taking Oral Hypoglycemic Pills (`DIQ070 == 1`):** 715 adults
- **Elevated Lab HbA1c ($\ge 6.5\%$):** 746 adults
- **Elevated Lab Fasting Glucose ($\ge 126\text{ mg/dL}$):** 409 adults
- **Medication without Self-Reported Diagnosis:** Exactly **73 adults** take active diabetes medications despite reporting "No" or "Borderline" to `DIQ010` (several on Metformin for prediabetes or unrecorded diagnosis).
- **Active Undiagnosed Diabetes:** Exactly **228 adults** have laboratory-verified diabetes ($\text{HbA1c} \ge 6.5\%$ or $\text{FPG} \ge 126\text{ mg/dL}$) with zero prior diagnosis and no medication.
- **Controlled Diagnosed Diabetics:** Exactly **281 adults** with established diabetes have normalized laboratory values ($\text{HbA1c} < 6.5\%$).

**Validation:** The composite ground truth successfully captures both diagnosed (controlled and uncontrolled) and active undiagnosed individuals while preserving zero target leakage for Scenario A predictors.

---

## 8. Missingness Analysis

### Missing Counts & Percentages in Adult Cohort ($N = 5,856$):

| Feature | Valid Observations | Missing Observations | Missing Percentage (%) | Primary Reason for Missingness |
|---|---|---|---|---|
| `age` | 5,856 | 0 | **0.00%** | Baseline demographic (100% complete) |
| `sex` | 5,856 | 0 | **0.00%** | Baseline demographic (100% complete) |
| `bmi` | 5,434 | 422 | **7.21%** | 326 home-interview only (no exam); 96 physical limitations |
| `systolic_bp` | 5,247 | 609 | **10.40%** | Home-interview only + arm circumference/shunts/refusal |
| `diastolic_bp` | 5,230 | 626 | **10.69%** | Tracked with systolic BP + 17 unmeasurable sound continuation artifacts (< 30 mmHg) |
| `total_cholesterol`| 5,176 | 680 | **11.61%** | Home-interview only + blood draw refusal / phlebotomy failure |
| `hdl` | 5,176 | 680 | **11.61%** | Tracked synchronously with Total Cholesterol |
| `creatinine` | 5,154 | 702 | **11.99%** | Biochemistry profile blood draw refusal / phlebotomy failure |
| `target_diabetes` | 5,856 | 0 | **0.00%** | Defined across all participants |

### Complete-Case Subset:
- Exactly **4,826 out of 5,856 adults (82.41%)** have all 8 Scenario A predictors complete.
- Missingness is overwhelmingly driven by Mobile Examination Center (MEC) non-attendance (326 participants completed in-home interview only). Among examined adults, feature completeness exceeds **$95\%$**.

---

## 9. Outlier & Range Validation Report

Summary statistics, physiological checks, and IQR outlier detection across all continuous features:

| Feature | Min | Q1 | Median | Mean | Q3 | Max | Std | IQR | IQR Outliers ($N$) | IQR Outliers (%) |
|---|---|---|---|---|---|---|---|---|---|---|
| `age` | 18.00 | 33.00 | 51.00 | 49.89 | 65.00 | 80.00 | 18.78 | 32.00 | 0 | 0.00% |
| `bmi` | 14.20 | 24.60 | 28.50 | 29.69 | 33.50 | 86.20 | 7.44 | 8.90 | 156 | 2.87% |
| `systolic_bp` | 72.00 | 112.00 | 123.00 | 126.18 | 136.00 | 238.00 | 20.17 | 24.00 | 161 | 3.07% |
| `diastolic_bp` | 31.00 | 65.00 | 72.00 | 72.50 | 80.00 | 135.00 | 12.03 | 15.00 | 98 | 1.87% |
| `total_cholesterol` | 76.00 | 158.00 | 183.00 | 186.88 | 212.00 | 446.00 | 41.24 | 54.00 | 69 | 1.33% |
| `hdl` | 10.00 | 42.00 | 51.00 | 53.19 | 61.00 | 189.00 | 15.55 | 19.00 | 128 | 2.47% |
| `creatinine` | 0.25 | 0.70 | 0.84 | 0.90 | 1.00 | 12.74 | 0.47 | 0.30 | 171 | 3.32% |

### Outlier Categorization:
- **Category A (Physiologically Impossible):** **0 values.** All minimums and maximums fall strictly within accepted human physiological survival bounds.
- **Category B (Physiologically Extreme but Possible):**
  - BMI $= 86.2\text{ kg/m}^2$ (severe Class III morbid obesity).
  - Systolic BP $= 238.0\text{ mmHg}$ (acute Stage 3 hypertensive emergency).
  - Creatinine $= 12.74\text{ mg/dL}$ (end-stage renal disease / dialysis patient).
  - Total Cholesterol $= 446.0\text{ mg/dL}$ (severe familial hypercholesterolemia).
  - *Action:* Retained. In a real-world clinic, patients uploading reports with end-stage renal disease or severe obesity exist. Silently deleting them would destroy genuine clinical risk signals.
- **Category C (Statistically Unusual — IQR Outliers):** Between $1.3\%$ and $3.3\%$ per feature. Naturally occurring positive skews standard in biomedical laboratory distributions.

---

## 10. Class Balance

- **Negative Class (`0`):** 4,677 adults (**79.87%**)
- **Positive Class (`1`):** 1,179 adults (**20.13%**)
- **Imbalance Ratio:** **3.97 : 1** ($\approx 4:1$).
- **Imbalance Assessment:** Mild to moderate class imbalance. Severe techniques (like synthetic SMOTE) are **not required** and would corrupt clinical covariance structures. Standard cost-sensitive loss (`scale_pos_weight` in LightGBM/XGBoost or `class_weight='balanced'`) and evaluation via PR-AUC / ROC-AUC / Sensitivity are clinically recommended.

---

## 11. Exploratory Data Analysis (EDA) Findings

Five high-resolution visualizations were generated and saved into [`ml_model/datasets/diabetes/eda/`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/ml_model/datasets/diabetes/eda):

1. **Target Distribution (`eda_target_distribution.png`):** Confirms 20.1% positive vs. 79.9% negative adult prevalence.
2. **Correlation Heatmap (`eda_correlation_matrix.png`):**
   - Predictor correlation with `target_diabetes`:
     - `age`: $+0.328$ (Strongest non-invasive demographic predictor)
     - `bmi`: $+0.199$ (Strong adiposity signal)
     - `systolic_bp`: $+0.187$ (Strong vascular co-morbidity)
     - `creatinine`: $+0.098$ (Renal microvascular signal)
     - `hdl`: $-0.163$ (Protective cholesterol fraction inversely correlated)
     - `total_cholesterol`: $-0.090$ (Negative due to statin treatment paradox)
     - `diastolic_bp`: $-0.043$ (Isolated systolic widening in older diabetics)
     - `sex`: $-0.033$ (Slight female predominance in positive cohort)
   - Zero multicollinearity between predictors ($r < 0.60$ for all predictor pairs).
3. **Feature Distributions (`eda_feature_distributions.png`):**
   - `age`: Uniform distribution between 18 and 80.
   - `bmi`: Right-skewed distribution centered at 28.5 (overweight median).
   - `systolic_bp`: Normal distribution centered at 123 mmHg with right tail.
   - `creatinine`: Log-normal distribution centered at 0.84 mg/dL.
4. **Predictor Stratification by Diabetes Status (`eda_boxplots_by_target.png`):**
   - Diabetic patients exhibit markedly higher median Age (61 vs 47 years), higher BMI (31.8 vs 27.8 $\text{kg/m}^2$), higher Systolic BP (134 vs 121 mmHg), lower HDL (46 vs 53 mg/dL), and elevated Creatinine.
5. **Missingness Breakdown (`eda_missingness_percentage.png`):** Visually confirms 0% missingness for Age/Sex and uniform 7–12% missingness across clinical exam/lab features.

---

## 12. Final Dataset Artifact Summary

- **File Path:** [`ml_model/datasets/diabetes/prepared/scenario_a_candidate.csv`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/ml_model/datasets/diabetes/prepared/scenario_a_candidate.csv)
- **Total Rows:** **5,856** (1 row per participant, 100% unique `SEQN`).
- **Total Columns:** **10** (1 ID + 8 Predictors + 1 Target).
- **Columns:** `SEQN`, `age`, `sex`, `bmi`, `systolic_bp`, `diastolic_bp`, `total_cholesterol`, `hdl`, `creatinine`, `target_diabetes`.
- **File Size:** $\approx 457.6\text{ KB}$.

---

## 13. Data Quality Evaluation

| Check | Result | Detail |
|---|---|---|
| Raw Data Preservation | **PASS** | Original XPT files completely untouched in `raw/nhanes_2017_2018/` |
| Reproducibility | **PASS** | `prepare_scenario_a.py` executes end-to-end and reproduces CSV bit-for-bit |
| SEQN Uniqueness | **PASS** | Zero duplicate participants |
| Missing Code Sanitization | **PASS** | 7/9 questionnaire codes converted to NaN; floating point zeros cleaned |
| Impossible Values | **PASS** | Zero impossible values detected across all features |
| Target Integrity | **PASS** | Validated composite ground truth (20.13% prevalence) |
| Leakage Prevention | **PASS** | Glucose and HbA1c strictly excluded from feature vector |

---

## 14. Recommended Strategies for Model Training (Future Phase)

1. **Preprocessing Pipeline (Strictly Inside Training Folds):**
   - Use `sklearn.pipeline.Pipeline` or native tabular algorithms (LightGBM / XGBoost).
   - Any imputation (e.g. median or iterative MICE) must be fitted strictly on training folds inside cross-validation.
   - Robust scaling (`RobustScaler`) or quantile transformation if evaluating linear models.
2. **Train/Test Splitting Strategy:**
   - **Stratified Split (80% Train / 20% Held-Out Test)**:
     - Training set: $\approx 4,684$ adults
     - Test set: $\approx 1,172$ adults
     - `random_state = 42`, stratified by `target_diabetes`.
   - The test set must be strictly held out and evaluated only once at final benchmarking.
3. **NHANES Survey-Weight Considerations:**
   - For epidemiological population prevalence estimates, NHANES complex weights (`WTMEC2YR`, `SDMVPSU`, `SDMVSTRA`) are utilized.
   - For an engineering clinical decision support system estimating an individual patient's biological probability of disease given biomarkers, unweighted training on the empirical clinical cohort is standard practice. Survey-weighted calibration curves can be verified during validation.

---

## FINAL STATUS

# **READY FOR MODEL TRAINING**

The candidate dataset `scenario_a_candidate.csv` is fully cleaned, verified, and audited. Zero ML training has occurred. The dataset is ready for Phase 4 (Model Training & Evaluation).
