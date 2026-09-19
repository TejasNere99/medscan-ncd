# FRAMINGHAM HEART STUDY: RAW DATASET FORENSIC AUDIT REPORT
====================================================================
MedScan-NCD Phase 7B: Comprehensive Quantitative & Clinical Integrity Report
====================================================================

**Target Cohort**: Framingham Heart Study 10-Year CHD Teaching Extract  
**File Inspected**: `ml_model/datasets/heart_disease/raw/framingham.csv`  
**SHA-256 Fingerprint**: `2c0e57dc0361b420becf1facec0a054af06c420eae0ae2faf0fdc8591fadb018`  
**Execution Timestamp**: September 2026  

---

## 1. High-Level Dataset Geometry
- **Total Records (Rows)**: 4,240
- **Total Features (Columns)**: 16 (15 candidate predictors + 1 binary target)
- **Exact Column Names**:
  `['male', 'age', 'education', 'currentSmoker', 'cigsPerDay', 'BPMeds', 'prevalentStroke', 'prevalentHyp', 'diabetes', 'totChol', 'sysBP', 'diaBP', 'BMI', 'heartRate', 'glucose', 'TenYearCHD']`
- **Duplicate Rows**: **0** (Zero identical rows detected across all 16 attributes)
- **Constant Columns**: **0** (Zero columns with only 1 unique value)
- **Near-Constant Columns**:
  - `prevalentStroke`: 4,215 zeros vs 25 ones (99.41% zeros)
  - `BPMeds`: 4,063 zeros vs 124 ones (97.04% zeros among non-missing)
  - `diabetes`: 4,131 zeros vs 109 ones (97.43% zeros)

---

## 2. Complete Column-by-Column Inventory

| Column Name | Storage Type | Domain Classification | Unique Values | Missing Count | Missing % | Min | Median | Mean $\pm$ Std | Max | IQR Outliers Count (%) |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`male`** | `int64` | Demographic | 2 (0, 1) | 0 | **0.00%** | 0.0 | 0.0 | $0.429 \pm 0.495$ | 1.0 | 0 (0.00%) |
| **`age`** | `int64` | Demographic | 39 | 0 | **0.00%** | 32.0 | 49.0 | $49.580 \pm 8.573$ | 70.0 | 0 (0.00%) |
| **`education`** | `float64` | Socioeconomic | 4 (1, 2, 3, 4) | 105 | **2.48%** | 1.0 | 2.0 | $1.979 \pm 1.020$ | 4.0 | 0 (0.00%) |
| **`currentSmoker`** | `int64` | Behavioral | 2 (0, 1) | 0 | **0.00%** | 0.0 | 0.0 | $0.494 \pm 0.500$ | 1.0 | 0 (0.00%) |
| **`cigsPerDay`** | `float64` | Behavioral | 33 | 29 | **0.68%** | 0.0 | 0.0 | $9.006 \pm 11.922$ | 70.0 | 12 (0.28%) |
| **`BPMeds`** | `float64` | Clinical Medication | 2 (0, 1) | 53 | **1.25%** | 0.0 | 0.0 | $0.030 \pm 0.170$ | 1.0 | 124 (2.96%) |
| **`prevalentStroke`** | `int64` | Clinical History | 2 (0, 1) | 0 | **0.00%** | 0.0 | 0.0 | $0.006 \pm 0.077$ | 1.0 | 25 (0.59%) |
| **`prevalentHyp`** | `int64` | Clinical History | 2 (0, 1) | 0 | **0.00%** | 0.0 | 0.0 | $0.311 \pm 0.463$ | 1.0 | 0 (0.00%) |
| **`diabetes`** | `int64` | Clinical History | 2 (0, 1) | 0 | **0.00%** | 0.0 | 0.0 | $0.026 \pm 0.158$ | 1.0 | 109 (2.57%) |
| **`totChol`** | `float64` | Laboratory (Lipids) | 248 | 50 | **1.18%** | 107.0 | 234.0 | $236.700 \pm 44.591$ | 696.0 | 56 (1.34%) |
| **`sysBP`** | `float64` | Physical Vitals | 234 | 0 | **0.00%** | 83.5 | 128.0 | $132.355 \pm 22.033$ | 295.0 | 126 (2.97%) |
| **`diaBP`** | `float64` | Physical Vitals | 146 | 0 | **0.00%** | 48.0 | 82.0 | $82.898 \pm 11.910$ | 142.5 | 77 (1.82%) |
| **`BMI`** | `float64` | Physical Vitals | 1364 | 19 | **0.45%** | 15.54 | 25.40 | $25.801 \pm 4.080$ | 56.80 | 97 (2.30%) |
| **`heartRate`** | `float64` | Physical Vitals | 73 | 1 | **0.02%** | 44.0 | 75.0 | $75.879 \pm 12.025$ | 143.0 | 76 (1.79%) |
| **`glucose`** | `float64` | Laboratory (Metabolic)| 143 | 388 | **9.15%** | 40.0 | 78.0 | $81.964 \pm 23.954$ | 394.0 | 188 (4.88%) |
| **`TenYearCHD`** | `int64` | **TARGET** | 2 (0, 1) | 0 | **0.00%** | 0.0 | 0.0 | $0.152 \pm 0.359$ | 1.0 | 644 (15.19%) |

---

## 3. Target Distribution & Prevalence
- **Target Name**: `TenYearCHD`
- **Total Labeled Cases**: 4,240 (100% complete ground truth; 0 missing values)
- **Positive Count ($y = 1$)**: 644 patients (**15.19%**)
- **Negative Count ($y = 0$)**: 3,596 patients (**84.81%**)
- **Class Imbalance Ratio**: **$5.584 : 1$** (Negative to Positive)
- **Implications for Machine Learning**:
  - Moderate clinical class imbalance. Standard unweighted cross-entropy will tend to favor specificity over sensitivity.
  - `scale_pos_weight = 5.58` for LightGBM/XGBoost or `class_weight='balanced'` for Logistic Regression / Random Forest is recommended during training.
  - Probability calibration (Platt Sigmoid scaling) and post-hoc clinical threshold tuning are essential to achieve target sensitivity $\ge 80\%$.

---

## 4. Clinical Sanity Checks & Boundary Audit

A programmatic sweep of physiological and clinical boundaries was executed across all 4,240 records:

| Clinical Boundary Test | Criteria | Violations Count | Assessment |
| :--- | :--- | :---: | :--- |
| **Age Under 18** | `age < 18` | **0** | Pass: Adult cohort exclusively. |
| **Age Over 120** | `age > 120` | **0** | Pass: Maximum age is 70 years. |
| **Systolic BP $< 50$ mmHg** | `sysBP < 50` | **0** | Pass: Minimum systolic BP is 83.5 mmHg. |
| **Systolic BP $> 300$ mmHg** | `sysBP > 300` | **0** | Pass: Maximum systolic BP is 295.0 mmHg. |
| **Diastolic BP $< 30$ mmHg** | `diaBP < 30` | **0** | Pass: Minimum diastolic BP is 48.0 mmHg. |
| **Diastolic BP $> 200$ mmHg** | `diaBP > 200` | **0** | Pass: Maximum diastolic BP is 142.5 mmHg. |
| **Pulse Pressure Inversion** | `sysBP <= diaBP` | **0** | **Pass: 100% of rows satisfy systolic > diastolic.** |
| **BMI $< 10.0$ $kg/m^2$** | `BMI < 10.0` | **0** | Pass: Minimum BMI is 15.54 $kg/m^2$. |
| **BMI $> 90.0$ $kg/m^2$** | `BMI > 90.0` | **0** | Pass: Maximum BMI is 56.80 $kg/m^2$. |
| **Total Cholesterol $< 40$ mg/dL** | `totChol < 40` | **0** | Pass: Minimum cholesterol is 107.0 mg/dL. |
| **Total Cholesterol $> 600$ mg/dL** | `totChol > 600` | **1** | Valid Clinical Outlier: 1 patient has `totChol = 696` mg/dL (severe familial hypercholesterolemia). |
| **Fasting Glucose $< 20$ mg/dL** | `glucose < 20` | **0** | Pass: Minimum glucose is 40.0 mg/dL. |
| **Fasting Glucose $> 500$ mg/dL** | `glucose > 500` | **0** | Pass: Maximum glucose is 394.0 mg/dL. |
| **Smoker Reporting 0 Cigs** | `currentSmoker == 1 & cigsPerDay == 0` | **0** | **Pass: 100% logical consistency.** |
| **Non-Smoker Reporting $>0$ Cigs** | `currentSmoker == 0 & cigsPerDay > 0` | **0** | **Pass: 100% logical consistency.** |

---

## 5. Statistical Distribution & Target Correlation

Linear Pearson correlation with `TenYearCHD` across valid observations:
1. `age`: **$+0.2254$** (Strongest single continuous predictor)
2. `sysBP`: **$+0.2164$** (Strong hemodynamic risk driver)
3. `prevalentHyp`: **$+0.1775$** (Hypertension diagnosis)
4. `diaBP`: **$+0.1451$** (Diastolic hypertension)
5. `glucose`: **$+0.1256$** (Elevated blood glucose)
6. `diabetes`: **$+0.0973$** (Baseline diabetes)
7. `male`: **$+0.0884$** (Male sex associated with earlier CAD onset)
8. `BPMeds`: **$+0.0875$** (Indicator of severe treated hypertension)
9. `totChol`: **$+0.0824$** (Atherogenic lipid marker)
10. `BMI`: **$+0.0753$** (Adiposity / metabolic syndrome marker)
11. `prevalentStroke`: **$+0.0618$** (Prior cerebrovascular disease)
12. `cigsPerDay`: **$+0.0578$** (Dose-response smoking marker)
13. `heartRate`: **$+0.0229$** (Resting tachycardia)
14. `currentSmoker`: **$+0.0194$** (Binary smoking status)
15. `education`: **$-0.0542$** (Inverse socioeconomic gradient)

All correlation directions strictly align with established cardiovascular pathophysiology.
