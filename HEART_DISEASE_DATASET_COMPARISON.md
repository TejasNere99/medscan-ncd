# MEDSCAN-NCD: HEART DISEASE DATASET COMPARISON MATRIX
====================================================================
Phase 7A: Systematic Scientific Due Diligence & Feasibility Audit
====================================================================

## Overview
This matrix summarizes the comparative evaluation of six prominent publicly accessible cardiovascular disease datasets against the architectural, clinical, and data-integrity requirements of **MedScan-NCD**.

Evaluation Criteria:
- **Source Quality**: Peer-reviewed publication, institutional repository, verified origin.
- **Sample Size**: Sufficient statistical power for tree ensembles (LightGBM, XGBoost, Random Forest) and calibration.
- **Target Meaning**: Explicit, clinically grounded definition (prospective event, clinical diagnosis, or angiographic stenosis).
- **Leakage Risk**: Absence of post-diagnostic artifacts, medications, or circular variables.
- **License**: Legally unambiguous for educational and open research display.
- **OCR Compatibility**: Ability of MedScan-NCD OCR engine and patient profile to extract required features.
- **Overall Suitability**: Qualitative synthesis (HIGH, MEDIUM, LOW, DISQUALIFIED).

---

## Comparative Matrix

| Dataset | Primary Source | Sample Size ($N$) | Number of Features | Target Definition | Target Clinical Meaning | Missingness | Leakage Risk | License Status | OCR / Profile Compatibility | Overall Suitability |
| :--- | :--- | :---: | :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **1. Framingham Heart Study (BioLINCC Teaching Cohort)** | NHLBI & Boston University / BioLINCC | 4,238 | 15 predictors | `TenYearCHD` (0/1) | 10-year incident coronary heart disease event (MI, angina, coronary death) | Low (~12% on glucose) | LOW (baseline covariates prior to 10-yr follow-up) | Open / CC0 (Educational mirror); DMDA for full raw BioLINCC | HIGH (Lipids, BP, BMI, Glucose, Age, Sex) | **HIGH (Primary Candidate for Prospective Risk)** |
| **2. CDC / NCHS Continuous NHANES (Cardiovascular Cohort)** | U.S. Centers for Disease Control and Prevention | 5,856 (single cycle) to 30,000+ (multi-cycle) | 10–18 continuous predictors | `target_cvd` (0/1) | Doctor-diagnosed Coronary Heart Disease, Angina, or Myocardial Infarction (`MCQ160c-e`) | Low to Medium (managed via MEC weights & imputation) | LOW (isolated questionnaire target, strictly excluded from features) | Public Domain (U.S. Government Work, 17 U.S.C. § 105) | HIGH (Continuous Lipids, BP, BMI, Creatinine, Age, Sex) | **HIGH (Primary Benchmark / Cross-Sectional Parity)** |
| **3. UCI Heart Disease (Cleveland Clinic Foundation et al.)** | Cleveland Clinic / Hungarian Inst. / Long Beach VA / Zurich | 303 (Cleveland) to 920 (Combined) | 13 predictors | `num` (0–4; binarized at $\ge 1$) | Angiographic coronary artery stenosis $\ge 50\%$ in catheterization lab | Very Low (Cleveland <1%) | MEDIUM (collected during diagnostic catheterization) | CC BY 4.0 (Open academic citation) | LOW (Requires exercise treadmill ECG & fluoroscopy nuclear imaging) | **LOW (Incompatible Clinical Setting)** |
| **4. Kaggle Cardiovascular Disease (Svetlana Ulianova)** | Kaggle User Upload (Unverified Russian examination data) | 70,000 | 11 predictors | `cardio` (0/1) | Unspecified cardiovascular disease presence | None (synthetically scrubbed) | HIGH (Unverified target provenance & unknown clinical definition) | Unclear (Kaggle community license; origin unverified) | LOW (Cholesterol and Glucose are 1/2/3 ordinal bins; impossible BP values) | **DISQUALIFIED (Scientific & Quality Failure)** |
| **5. CDC BRFSS Heart Disease Health Indicators** | CDC NCCDPHP / Mirrored by Kamil Pytlak | 319,795 (2020) to 445,132 (2022) | 18–21 survey items | `HeartDiseaseorAttack` / `_MICHD` (0/1) | Self-reported telephone response: "Ever told had heart attack or angina/CHD?" | Negligible (survey imputations) | LOW (Self-reported cross-sectional history) | Public Domain (U.S. CDC Survey Data) | VERY LOW (Zero continuous lab values, zero numeric blood pressure) | **LOW / UNFEASIBLE (Survey Questionnaire Only)** |
| **6. Z-Alizadeh Sani CAD Dataset** | Tehran Heart Center / Sharif University / UCI | 303 | 54 predictors | `Cath` ("CAD" / "Normal") | Angiographic coronary artery diameter narrowing $\ge 50\%$ | Zero (complete cases) | MEDIUM (Invasive inpatient catheterization context) | CC BY 4.0 | LOW (Requires echocardiography ejection fraction & wall motion score) | **MEDIUM-LOW (Specialized Secondary Reference)** |

---

## Detailed Evaluation of Qualitative Suitability Labels

### 1. Framingham Heart Study Teaching Cohort: HIGH
- **Evidence**:
  - Predicts **incident 10-year coronary heart disease**, matching the clinical decision support framework established by the American College of Cardiology (ACC) and American Heart Association (AHA).
  - Predictor vector consists entirely of routine outpatient cardiometabolic markers: Total Cholesterol (mg/dL), Systolic BP (mmHg), Diastolic BP (mmHg), BMI (kg/m²), Fasting Glucose (mg/dL), Age (years), Sex (binary), and Smoking status.
  - Zero requirement for specialized stress tests or invasive nuclear cardiology.
  - Readily handles standard tabular algorithms (Logistic Regression, Random Forest, LightGBM, XGBoost) and Platt calibration.

### 2. CDC / NCHS Continuous NHANES Cardiovascular Cohort: HIGH
- **Evidence**:
  - Implements identical engineering standards to MedScan-NCD's existing Phase 4/5 Diabetes model (direct SAS XPT pipeline from official CDC portals).
  - Contains rigorous laboratory lipid panels (Total Cholesterol, HDL, LDL, Triglycerides) and Mobile Examination Center (MEC) averaged blood pressures.
  - Sample size can be scaled from 5,856 adults (single 2017–2018 cycle) up to 25,000+ adults across multi-cycle continuous surveys.
  - U.S. Federal Government Public Domain: completely unencumbered by proprietary licensing, login walls, or third-party distribution ambiguities.

### 3. UCI Cleveland Heart Disease Dataset: LOW
- **Evidence**:
  - Extreme clinical referral bias: 100% of participants were symptomatic hospital inpatients referred for invasive coronary angiography.
  - 6 of the 13 predictors (`thalach`, `exang`, `oldpeak`, `slope`, `ca`, `thal`) represent exercise treadmill tests and nuclear thallium scintigraphy.
  - MedScan-NCD's routine OCR engine operates on outpatient blood reports and basic health profiles; it cannot fabricate exercise ST-segment slopes or fluoroscopy vessel counts.
  - Cleveland sample size ($N=303$) is insufficient for reliable high-dimensional tree calibration without severe variance.

### 4. Kaggle 70,000 Cardiovascular Disease Dataset: DISQUALIFIED
- **Evidence**:
  - **Fatal Lack of Provenance**: No published peer-reviewed paper, no institutional clinical trial registry, no documented ethics review.
  - **Coarse Ordinal Laboratory Bins**: Cholesterol and Glucose are recorded as integer codes `1` (normal), `2` (above normal), and `3` (well above normal). MedScan-NCD OCR extracts continuous numbers (e.g. `210 mg/dL`). Mapping continuous metrics into undocumented arbitrary bins corrupts clinical calibration.
  - **Severe Data Corruption**: Systolic blood pressure includes negative values ($-150$ mmHg) and extreme outliers ($>16,000$ mmHg); diastolic blood pressure ranges up to $11,000$ mmHg.

### 5. CDC BRFSS Heart Disease Health Indicators: LOW / UNFEASIBLE
- **Evidence**:
  - Pure telephone survey consisting of self-reported lifestyle questions (e.g., general health perception, physical activity days, difficulty walking).
  - Lacks all objective laboratory concentrations (zero cholesterol, zero HDL, zero triglycerides, zero glucose, zero creatinine).
  - Lacks numeric blood pressure (only records whether a doctor ever mentioned high blood pressure).
  - Completely incompatible with an OCR-based laboratory report intelligence platform.

### 6. Z-Alizadeh Sani CAD Dataset: MEDIUM-LOW
- **Evidence**:
  - High diagnostic quality with angiographic ground truth and 54 well-annotated parameters.
  - However, $N=303$ with 71.3% disease prevalence reflects an intensive tertiary cardiac center population.
  - Demands detailed echocardiography measurements (ejection fraction, regional wall motion abnormalities) and physical exam maneuvers (heart murmurs, lung rales) that routine blood reports do not provide.
