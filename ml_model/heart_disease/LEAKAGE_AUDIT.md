# FRAMINGHAM HEART STUDY: TARGET & PREDICTOR LEAKAGE AUDIT
====================================================================
MedScan-NCD Phase 7B: Rigorous Clinical & Temporal Leakage Analysis
====================================================================

**Objective**: Determine for every attribute in the Framingham Heart Study dataset whether it contains target leakage, post-event confounding, or product incompatibility, and classify its status for future model training.

---

## 1. Target Variable Adjudication: `TenYearCHD`

- **Classification**: **REMOVE — TARGET**
- **Exact Operational Definition**:
  - `0`: Participant did NOT develop an incident coronary heart disease event over the 10-year follow-up period following baseline Exam 1.
  - `1`: Participant experienced a verified incident coronary heart disease event (angina pectoris, recognized or unrecognized myocardial infarction, coronary insufficiency, or coronary death) during the 10-year prospective window.
- **Temporal Verification**:
  - Is the target prospective? **YES**.
  - Does it represent baseline prevalence? **NO**.
  - All predictor measurements in the dataset were recorded at baseline Exam 1. The outcome represents prospective event occurrence over the subsequent decade.
  - *Rule*: Excluded entirely from feature matrices $X$; designated strictly as ground truth label vector $y$.

---

## 2. Comprehensive Attribute-by-Attribute Leakage Audit

| Column Name | Data Type | Clinical Construct | Collection Timing | Leakage Classification | Rationale & Product Handling |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **`TenYearCHD`** | `int64` | 10-Year Incident CHD Event | 10-Year Follow-up | **REMOVE — TARGET** | Ground truth dependent variable $y$. Strictly isolated from predictor matrix. |
| **`male`** | `int64` | Biological Sex (0=F, 1=M) | Baseline Exam 1 | **KEEP** | **SAFE**. Standard biological demographic; zero future or post-event leakage. Direct MedScan match. |
| **`age`** | `int64` | Chronological Age (years) | Baseline Exam 1 | **KEEP** | **SAFE**. Fundamental non-modifiable risk covariate. Measured at baseline. Direct MedScan match. |
| **`totChol`** | `float64` | Total Cholesterol (mg/dL) | Baseline Exam 1 | **KEEP** | **SAFE**. Objective serum biochemical concentration measured prior to event window. Core OCR feature. |
| **`sysBP`** | `float64` | Systolic Blood Pressure (mmHg) | Baseline Exam 1 | **KEEP** | **SAFE**. Objective resting hemodynamic reading measured at Exam 1. Core Vitals/OCR feature. |
| **`diaBP`** | `float64` | Diastolic Blood Pressure (mmHg) | Baseline Exam 1 | **KEEP** | **SAFE**. Objective resting hemodynamic reading measured at Exam 1. Core Vitals/OCR feature. |
| **`BMI`** | `float64` | Body Mass Index ($kg/m^2$) | Baseline Exam 1 | **KEEP** | **SAFE**. Objective physical anthropometry calculated at Exam 1. Core Vitals/Profile feature. |
| **`glucose`** | `float64` | Fasting Glucose (mg/dL) | Baseline Exam 1 | **KEEP** | **SAFE**. Biochemical measurement of blood glucose at Exam 1. (Note: Excluded from Diabetes model to prevent self-fulfilling prediction, but 100% legitimate for Heart Disease prediction). |
| **`currentSmoker`** | `int64` | Current Cigarette Smoker (0/1) | Baseline Exam 1 | **KEEP** | **SAFE**. Baseline lifestyle factor. Major independent etiology for atherogenesis. Patient profile toggle. |
| **`cigsPerDay`** | `float64` | Cigarettes Smoked Per Day | Baseline Exam 1 | **OPTIONAL / REMOVE** | **UNSUITABLE FOR MINIMAL INPUT**. Collinear with `currentSmoker` (Pearson $r = +0.76$). Adds cognitive burden to users without adding substantial orthogonal signal beyond binary smoking status. |
| **`BPMeds`** | `float64` | Blood Pressure Medication (0/1) | Baseline Exam 1 | **OPTIONAL** | **SAFE (as baseline history)**. Records whether patient was taking antihypertensive medication *at the time of Exam 1*. Not post-event. Useful covariate to correct for treated BP, but optional in product schema. |
| **`prevalentHyp`** | `int64` | Baseline Hypertension Diagnosis | Baseline Exam 1 | **REMOVE — REDUNDANT** | **COLLINEAR REDUNDANCY**. Defined directly from `sysBP >= 140` or `diaBP >= 90` or `BPMeds == 1`. Including it alongside continuous `sysBP` and `diaBP` introduces artificial redundancy. |
| **`diabetes`** | `int64` | Baseline Diabetes Diagnosis | Baseline Exam 1 | **OPTIONAL / DERIVED** | **SAFE (as baseline history)**. Defined by baseline doctor diagnosis or `glucose >= 126`. Can be derived automatically from MedScan-NCD's existing Diabetes module or left optional. |
| **`prevalentStroke`** | `int64` | History of Prior Stroke (0/1) | Baseline Exam 1 | **REMOVE — HIGH IMBALANCE** | **UNSUITABLE FOR PRIMARY SCREENING**. Only 25 positive cases in 4,240 rows (0.59% prevalence). Near-zero variance; causes tree splits on idiosyncratic cases. |
| **`heartRate`** | `float64` | Resting Heart Rate (bpm) | Baseline Exam 1 | **OPTIONAL** | **SAFE**. Measured at baseline. Negligible correlation with 10-year CHD ($r = +0.0229$). Can be kept as optional or omitted to streamline required inputs. |
| **`education`** | `float64` | Completed Education Level (1–4) | Baseline Exam 1 | **REMOVE — PRODUCT MISALIGNMENT** | **UNSUITABLE FOR CLINICAL AI**. Socioeconomic proxy with 105 missing values (2.5%). Asking users for education level to calculate cardiovascular risk introduces socio-demographic bias and patient friction. |

---

## 3. Candidate Feature Tiers for MedScan-NCD

### Tier 1: Core Primary Feature Vector (8 Approved Predictors)
These 8 predictors are free of leakage, clinically grounded, and directly extractable from MedScan-NCD's existing OCR report parser and patient profile:
1. `age` (Years, Demographic)
2. `male` (Binary Sex, Demographic)
3. `totChol` (Total Cholesterol mg/dL, Lipid Report OCR)
4. `sysBP` (Systolic BP mmHg, Vitals OCR / Profile)
5. `diaBP` (Diastolic BP mmHg, Vitals OCR / Profile)
6. `BMI` (Body Mass Index $kg/m^2$, Vitals OCR / Profile)
7. `glucose` (Fasting Glucose mg/dL, Metabolic Report OCR)
8. `currentSmoker` (Binary 0/1, Patient Profile Toggle)

### Tier 2: Excluded Attributes (Rationale Documented)
- `TenYearCHD`: Excluded from $X$ (Designated as target $y$).
- `education`: Excluded (Socioeconomic bias; inappropriate for clinical medical report platform).
- `prevalentStroke`: Excluded (Extreme sparsity: 25 positive cases, 99.41% zeros).
- `prevalentHyp`: Excluded (Exact algebraic duplicate of systolic/diastolic blood pressure cutoffs).
- `cigsPerDay`: Excluded in favor of `currentSmoker` to prevent user questionnaire fatigue.
- `BPMeds`: Maintained as optional adjustment parameter, not mandatory for baseline risk calculation.

---

## 4. Verification of Temporal Ordering
To prevent **lookahead bias** (temporal leakage), we verified:
1. Were all 8 core predictors recorded strictly at Exam 1? **YES**.
2. Does the target `TenYearCHD` encompass events that occurred *prior* to Exam 1? **NO**.
3. Are there any post-event treatments, surgical revascularization notes, or post-MI enzymes in the predictor set? **NO**.

The feature vector strictly models the **pre-event physiological state** to estimate the **10-year probability of incident disease**.
