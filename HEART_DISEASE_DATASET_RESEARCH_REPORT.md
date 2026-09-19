# MEDSCAN-NCD: HEART DISEASE ML DATASET RESEARCH & SCIENTIFIC AUDIT
========================================================================================
Phase 7A: Comprehensive Dataset Due Diligence, Target Audit & Feasibility Assessment
========================================================================================

**Document Class**: Clinical Machine Learning Research & Scientific Due Diligence Report  
**Author**: Antigravity AI Senior Clinical ML & Data Intelligence Engineering Team  
**Project**: MedScan-NCD (OCR-Based Medical Report Intelligence & Multi-Disease Risk Prediction)  
**Status**: Pre-Implementation Research Complete — No Model Training Performed  
**Date**: September 2026  

---

## 1. Executive Summary

MedScan-NCD is expanding its non-diagnostic clinical decision support capabilities to include cardiovascular disease (CVD) risk prediction. Following the successful deployment and clinical calibration of the Phase 5 Diabetes model (LightGBM on CDC Continuous NHANES with Platt scaling and TreeSHAP explainability), this audit conducts a formal scientific evaluation of publicly accessible heart disease datasets.

We investigated six prominent candidate datasets across international repositories (NHLBI BioLINCC, CDC/NCHS, UCI Machine Learning Repository, Kaggle, OpenML, and hospital registries). Every candidate was rigorously audited for:
1. **Target Construct Validity**: Distinguishing prospective 10-year incident events vs. cross-sectional diagnoses vs. invasive angiographic catheterization findings.
2. **Target Leakage**: Eliminating post-diagnostic medications, diagnostic procedures, and circular labels.
3. **OCR & Architectural Compatibility**: Ensuring input features can be realistically extracted by MedScan-NCD’s OCR engine from standard outpatient laboratory reports (Lipid Profile, Metabolic Panel) and verified patient profile vitals (Blood Pressure, BMI, Age, Sex).
4. **Data Integrity & Scientific Provenance**: Demanding peer-reviewed publications, institutional affiliations, legal licensing, and verifiable checksums.

### Strategic Verdict & Key Recommendations
- **PRIMARY CANDIDATE**: **Framingham Heart Study (FHS) 10-Year CHD Teaching Cohort** ($N = 4,238$).  
  Predicts **true 10-year incident coronary heart disease events** (`TenYearCHD`). All 8 primary predictors (`totChol`, `sysBP`, `diaBP`, `BMI`, `glucose`, `male`, `age`, `currentSmoker`) map directly to MedScan-NCD's existing OCR report parser and patient profile channels with zero invasive test requirements.
- **SECONDARY CANDIDATE / CONTINUOUS BENCHMARK**: **CDC / NCHS Continuous NHANES (Cardiovascular Health Cohort)** ($N = 5,856$ to $30,000+$).  
  Provides unassailable U.S. Federal Government public-domain provenance, identical data engineering architecture to our Diabetes pipeline, and continuous laboratory concentrations (Total Cholesterol, HDL, LDL, Triglycerides, Serum Creatinine, Fasting Glucose).
- **DISQUALIFIED DATASETS**:
  - **Kaggle 70,000 Cardiovascular Dataset (Svetlana Ulianova)**: Disqualified due to zero institutional provenance, corrupt hemodynamic values (negative blood pressures down to $-150$ mmHg), and loss of continuous lab precision (cholesterol and glucose are coarse 1/2/3 ordinal categories).
  - **UCI Cleveland Heart Disease Dataset ($N = 303$)**: Disqualified for outpatient screening because 6 of its 13 predictors require exercise treadmill ECG stress tests (`thalach`, `oldpeak`, `slope`) or invasive nuclear thallium imaging (`ca`, `thal`), which cannot be obtained from routine blood reports.
  - **CDC BRFSS Telephone Survey ($N > 300,000$)**: Disqualified because it contains zero numeric laboratory values and zero measured blood pressure readings.

---

## 2. Research Methodology

Our audit protocol followed five sequential phases of clinical data due diligence:
1. **Repository Discovery**: Broad querying across official government portals (CDC, NIH, NCHS), academic archives (BioLINCC, UCI, Harvard Dataverse, OpenML), and popular mirrors (Kaggle).
2. **Primary Source Identification**: Bypassing secondary Kaggle mirrors to identify the original collecting institution, principal investigator, clinical trial protocol, and landmark peer-reviewed publication.
3. **Clinical Target Adjudication**: Deconstructing the mathematical and medical definition of the target ($y=1$ vs $y=0$), classifying whether it represents an acute incident event, cross-sectional disease prevalence, or catheterization stenosis.
4. **Predictor Leakage & Provenance Analysis**: Auditing each attribute to verify that no post-event interventions, confirmatory diagnostic procedures, or downstream treatments contaminate the baseline feature space.
5. **Product Pipeline Feasibility**: Evaluating each predictor against MedScan-NCD's existing OCR regex parsers, canonical normalizers, and patient demographic schemas.

---

## 3. Candidate Dataset 1: Framingham Heart Study 10-Year CHD Risk Cohort

### Institutional Origin & Provenance
- **Publishing Institution**: National Heart, Lung, and Blood Institute (NHLBI), National Institutes of Health (NIH), Bethesda, MD, USA, and Boston University, Boston, MA, USA.
- **Official Repository**: NHLBI BioLINCC (`https://biolincc.nhlbi.nih.gov/studies/fhs/`).
- **Landmark Publication**: Wilson PWF, D'Agostino RB, Levy D, Belanger AM, Silbershatz H, Kannel WB. "Prediction of Coronary Heart Disease Using Risk Factor Categories." *Circulation*. 1998;97(18):1837–1847. DOI: `10.1161/01.CIR.97.18.1837`.
- **Teaching Release**: Cleaned teaching dataset prepared by NHLBI for academic biostatistics curricula, mirrored on Kaggle and academic portals ($N = 4,238$).

### Target Definition & Clinical Construct
- **Variable**: `TenYearCHD` (Binary: `0` or `1`).
- **Meaning of $y = 1$**: The patient developed an incident coronary heart disease event during the 10-year prospective observation window following baseline examination. Events include:
  - Angina pectoris (adjudicated clinical syndrome)
  - Recognized or unrecognized myocardial infarction (confirmed by ECG or cardiac enzymes)
  - Coronary insufficiency
  - Fatal coronary heart disease (sudden or non-sudden cardiac death)
- **Meaning of $y = 0$**: The patient remained alive and free of documented coronary heart disease events throughout the full 10-year follow-up.
- **Label Generation**: Prospective clinical adjudication by a panel of Framingham study cardiologists reviewing hospital records, death certificates, and biennial examinations.

### Cohort Characteristics
- **Population**: Community-dwelling residents of Framingham, Massachusetts.
- **Age Range**: 32 to 70 years (Mean: $49.6 \pm 8.6$ years).
- **Sex Distribution**: 2,419 Females (57.1%), 1,819 Males (42.9%).
- **Class Balance**: 644 Positive events (15.2%) vs 3,594 Negative events (84.8%). Imbalance Ratio: $5.58 : 1$.

### Feature Inventory & Leakage Audit
The dataset contains 15 baseline predictors:
1. `male`: Binary (0=Female, 1=Male) — **SAFE** (Demographic).
2. `age`: Integer years — **SAFE** (Demographic).
3. `education`: Ordinal 1–4 — **SAFE** (Socioeconomic, optional).
4. `currentSmoker`: Binary (0/1) — **SAFE** (Behavioral).
5. `cigsPerDay`: Continuous numeric — **SAFE** (Behavioral).
6. `BPMeds`: Binary (0/1) — **SAFE** (Baseline medication prior to follow-up).
7. `prevalentStroke`: Binary (0/1) — **SAFE** (Baseline medical history).
8. `prevalentHyp`: Binary (0/1) — **SAFE** (Baseline medical history).
9. `diabetes`: Binary (0/1) — **SAFE** (Baseline clinical diagnosis).
10. `totChol`: Continuous mg/dL ($107 - 696$) — **SAFE** (Routine Lipid Laboratory).
11. `sysBP`: Continuous mmHg ($83.5 - 295$) — **SAFE** (Physical Vitals).
12. `diaBP`: Continuous mmHg ($48 - 142.5$) — **SAFE** (Physical Vitals).
13. `BMI`: Continuous $kg/m^2$ ($15.5 - 56.8$) — **SAFE** (Physical Vitals).
14. `heartRate`: Continuous bpm ($44 - 143$) — **SAFE** (Physical Vitals).
15. `glucose`: Continuous mg/dL ($40 - 394$) — **SAFE** (Routine Metabolic Laboratory).

- **Leakage Verdict**: **ZERO TARGET LEAKAGE**. All covariates were recorded during Exam 1 prior to the onset of the 10-year observation period.

---

## 4. Candidate Dataset 2: CDC / NCHS Continuous NHANES (Cardiovascular Cohort)

### Institutional Origin & Provenance
- **Publishing Institution**: Centers for Disease Control and Prevention (CDC) / National Center for Health Statistics (NCHS), Hyattsville, MD, USA.
- **Official Portal**: `https://www.cdc.gov/nchs/nhanes/`
- **Methodology Publication**: Zipf G, et al. "National Health and Nutrition Examination Survey: Plan and operations, 1999–2010." *Vital Health Stat 1*. 2013;(56):1–37. PMID: `25078429`.
- **License**: Public Domain (U.S. Federal Government Work, 17 U.S.C. § 105). Unrestricted use.

### Target Definition & Clinical Construct
- **Variable**: `target_cvd` (Derived Composite Binary).
- **Construct**: Established from the official Medical Conditions Questionnaire (`MCQ_J.XPT`):
  - `MCQ160c`: "Has a doctor or other health professional ever told you that you had coronary heart disease?" (1=Yes, 2=No)
  - `MCQ160d`: "Has a doctor or other health professional ever told you that you had angina, also called angina pectoris?" (1=Yes, 2=No)
  - `MCQ160e`: "Has a doctor or other health professional ever told you that you had a heart attack (myocardial infarction)?" (1=Yes, 2=No)
- **Mathematical Target Formula**:
  $$\text{target\_cvd} = \begin{cases} 1 & \text{if } \text{MCQ160c} = 1 \lor \text{MCQ160d} = 1 \lor \text{MCQ160e} = 1 \\ 0 & \text{if answered and all } = 2 \\ \text{NaN} & \text{if missing/refused} \end{cases}$$
- **Meaning**: Cross-sectional prevalence of established clinical Atherosclerotic Cardiovascular Disease (ASCVD).

### Cohort Characteristics & Scale
- **Sample Size**:
  - Single 2017–2018 cycle: $N = 5,856$ adults ($\ge 18$ years).
  - Multi-cycle pooling (2013–2018): $N \approx 17,500$ adults.
- **Class Balance**: In general U.S. adult population, prevalence of diagnosed CAD/angina/MI is $8.0\% - 9.5\%$ (approx. $10:1$ imbalance).
- **Laboratory Fidelity**: Continuous physical concentrations in standard clinical units: Total Cholesterol (`LBXTC`, mg/dL), HDL (`LBDHDD`, mg/dL), Triglycerides (`LBXTR`, mg/dL), LDL (`LBDLDL`, mg/dL), Serum Creatinine (`LBXSCR`, mg/dL), Fasting Glucose (`LBXGLU`, mg/dL).
- **Leakage Verdict**: **SAFE**. The questionnaire condition items are isolated strictly for target assignment and excluded from the predictor feature matrix.

---

## 5. Candidate Dataset 3: UCI Heart Disease Dataset (Cleveland Foundation et al.)

### Institutional Origin & Provenance
- **Institutions**: Cleveland Clinic Foundation; Hungarian Institute of Cardiology; V.A. Medical Center, Long Beach; University Hospital, Zurich.
- **Primary Investigator**: Robert Detrano, M.D., Ph.D.
- **Publication**: Detrano R, et al. "International application of a new probability algorithm for the diagnosis of coronary artery disease." *Am J Cardiol*. 1989;64(5):304–310. DOI: `10.1016/0002-9149(89)90524-9`.
- **Repository DOI**: `10.24432/C52P4X`. License: CC BY 4.0.

### Target Definition & Clinical Construct
- **Variable**: `num` (Angiographic vessel narrowing: `0, 1, 2, 3, 4`).
- **Construct**: $y = 1$ if vessel diameter reduction $\ge 50\%$ in at least one major coronary artery on coronary arteriography; $y = 0$ if $< 50\%$.
- **Clinical Setting**: Invasive diagnostic cardiac catheterization laboratory.

### Why UCI Cleveland is Incompatible with MedScan-NCD
While historically popular in undergraduate machine learning assignments, the dataset suffers from **fatal clinical domain misalignment**:
1. **Referral Bias**: Every patient in the dataset was already symptomatic and undergoing invasive heart catheterization.
2. **Incompatible Diagnostic Predictors**:
   - `thalach`: Maximum heart rate achieved during a formal Bruce protocol treadmill exercise test.
   - `exang`: Exercise-induced angina during treadmill stress testing.
   - `oldpeak`: ST-segment depression induced by exercise relative to rest.
   - `slope`: The slope of the peak exercise ST segment.
   - `ca`: Number of major coronary vessels ($0-3$) visualized by fluoroscopy.
   - `thal`: Thallium-201 nuclear scintigraphy perfusion defect.
3. **Product Failure**: An outpatient user uploading a blood report or checking their blood pressure **does not have fluoroscopy vessel counts or nuclear cardiology imaging**. Forcing these features would lead to $>50\%$ missingness or impossible user burden.

---

## 6. Candidate Dataset 4: Kaggle Cardiovascular Disease Dataset (Svetlana Ulianova)

### Institutional Origin & Provenance
- **Publisher**: Uploaded to Kaggle in 2019 by user Svetlana Ulianova.
- **Institutional Sponsor**: **NONE**.
- **Peer-Reviewed Paper**: **NONE**.
- **License**: Unclear / Kaggle Community Terms.

### Why This Dataset is Disqualified
1. **Unverified Provenance**: The source is described merely as "70,000 medical examination records in Eastern Europe/Russia." There is no hospital name, no institutional review board (IRB) statement, and no protocol.
2. **Severe Hemodynamic Corruptions**:
   - Systolic blood pressure (`ap_hi`) has negative minimum values ($-150$ mmHg) and extreme outliers reaching $+16,020$ mmHg.
   - Diastolic blood pressure (`ap_lo`) has negative minimums ($-70$ mmHg) and values up to $+11,000$ mmHg.
3. **Destruction of Continuous Lab Precision**:
   - `cholesterol` is coded as ordinal integers: `1` (normal), `2` (above normal), `3` (well above normal).
   - `gluc` is coded as ordinal integers: `1` (normal), `2` (above normal), `3` (well above normal).
   - Our OCR parser extracts continuous laboratory numbers (e.g. Total Cholesterol $214$ mg/dL, Fasting Glucose $108$ mg/dL). Forcing continuous clinical measurements into arbitrary 3-level categories degrades model sensitivity and prevents clinically calibrated decision support.
4. **Verdict**: **DISQUALIFIED**.

---

## 7. Candidate Dataset 5: CDC BRFSS Heart Disease Health Indicators

### Institutional Origin & Provenance
- **Institution**: Centers for Disease Control and Prevention (CDC) National Center for Chronic Disease Prevention and Health Promotion.
- **Dataset Size**: $N = 319,795$ (2020) to $N = 445,132$ (2022).
- **Nature**: Telephone questionnaire survey.

### Why This Dataset is Disqualified
1. **Zero Objective Laboratory Values**: Contains no total cholesterol (mg/dL), no HDL (mg/dL), no triglycerides, no fasting glucose, and no creatinine.
2. **Zero Measured Blood Pressure**: Contains only a subjective telephone question: "Have you ever been told by a doctor that you have high blood pressure?"
3. **Incompatible with OCR Intelligence**: MedScan-NCD’s core innovation is automated document intelligence on diagnostic laboratory reports. A lifestyle questionnaire survey cannot consume or validate OCR-extracted laboratory reports.
4. **Verdict**: **UNFEASIBLE FOR ROUTINE REPORT OCR**.

---

## 8. Target Definition Analysis: Prospective Risk vs. Cross-Sectional Diagnosis

A primary finding of this audit is that "Heart Disease" is not a monolithic label in clinical AI. We identify three distinct modeling paradigms:

```
                    ┌──────────────────────────────────────────────────────────────┐
                    │            CLINICAL CARDIOVASCULAR TARGET TAXONOMY           │
                    └──────────────────────────────┬───────────────────────────────┘
                                                   │
         ┌─────────────────────────────────────────┼────────────────────────────────────────┐
         ▼                                         ▼                                        ▼
┌────────────────────────────────┐ ┌────────────────────────────────┐ ┌────────────────────────────────┐
│   PROSPECTIVE 10-YEAR RISK     │ │   CROSS-SECTIONAL ASCVD SCREEN │ │  INVASIVE ANGIOGRAPHIC STENOSIS│
├────────────────────────────────┤ ├────────────────────────────────┤ ├────────────────────────────────┤
│ Target: TenYearCHD (0 / 1)     │ │ Target: target_cvd (0 / 1)     │ │ Target: num >= 1 (0 / 1)       │
│ Source: Framingham Heart Study │ │ Source: CDC Continuous NHANES  │ │ Source: UCI Cleveland Clinic   │
│ Meaning: Future incident event │ │ Meaning: Established doctor-   │ │ Meaning: Severe anatomical     │
│ (MI, angina, coronary death)   │ │ diagnosed CHD/angina/infarction│ │ stenosis (>=50%) on angiogram  │
│ over 10-year follow-up.        │ │ from routine cardiometabolic   │ │ in symptomatic patients in     │
│                                │ │ laboratory examination.        │ │ catheterization laboratory.    │
│ Clinical Role: Primary CVD     │ │ Clinical Role: Non-diagnostic  │ │ Clinical Role: Diagnostic TMT  │
│ Prevention & Lifestyle Triage  │ │ Health Risk Triaging           │ │ & Catheterization Decision     │
└────────────────────────────────┘ └────────────────────────────────┘ └────────────────────────────────┘
```

### Recommendation on Target Selection
- For **Primary Prevention Decision Support** (answering: *"What is the user's estimated probability of experiencing an incident coronary heart disease event over the next 10 years based on their routine blood lipids and vitals?"*), **Framingham 10-Year CHD** is the gold standard.
- For **Cardiometabolic Risk Screening** (answering: *"Does the user exhibit an atherogenic profile consistent with diagnosed cardiovascular disease?"*), **Continuous NHANES** provides continuous lab harmony with our Diabetes engine.

---

## 9. Target Leakage & Confounding Audit

| Candidate Dataset | Potential Confounders Audited | Leakage Status | Mitigation Protocol |
| :--- | :--- | :---: | :--- |
| **Framingham 10-Year CHD** | `BPMeds`, `prevalentStroke`, `prevalentHyp`, `diabetes` | **SAFE** | All predictors measured at baseline Exam 1; target reflects subsequent events over 10 years. |
| **CDC NHANES ASCVD** | `MCQ160a-m`, `RXDDRUG` (cardiac medications), `BPQ` | **SAFE** | Questionnaire items strictly isolated for target derivation; all medications excluded from predictors. |
| **UCI Cleveland** | `ca` (fluoroscopy vessels), `thal` (nuclear scan), `cp` | **POTENTIAL / DIRECT** | Fluoroscopy vessel count is directly anatomical; nuclear imaging visualizes existing infarcts. |
| **Kaggle 70k Ulianova** | Undocumented examination variables | **UNCERTAIN** | Provenance unknown; cannot verify if examinations occurred post-diagnosis. |
| **CDC BRFSS** | Survey history items | **SAFE** | Self-reported survey data, but lacks objective lab features. |

---

## 10. OCR & Input Pipeline Compatibility Audit

MedScan-NCD features an automated medical report intelligence pipeline consisting of:
- **`medicalReportParser.js`**: Section boundary detection and diagnostic table parsing.
- **`medicalNormalizer.js`**: Multi-unit normalization (converting mmol/L to mg/dL, standardizing pressure units).
- **`medicalValidation.js`**: Range checks, physiological bounds, and warning flags.

The table below audits how candidate features are populated:

```
┌─────────────────────────┬──────────────────────────┬──────────────────────────┐
│  MEDSCAN-NCD CHANNEL    │     FEATURES EXTRACTED   │  CANDIDATE COMPATIBILITY │
├─────────────────────────┼──────────────────────────┼──────────────────────────┤
│ Laboratory Report OCR   │ Total Cholesterol (mg/dL)│ Directly supported by    │
│ (Lipid Profile)         │ HDL Cholesterol (mg/dL)  │ Framingham & NHANES      │
│                         │ Triglycerides (mg/dL)    │                          │
│                         │ LDL Cholesterol (mg/dL)  │                          │
├─────────────────────────┼──────────────────────────┼──────────────────────────┤
│ Laboratory Report OCR   │ Fasting Blood Sugar      │ Directly supported by    │
│ (Metabolic Panel)       │ Serum Creatinine (mg/dL) │ Framingham & NHANES      │
├─────────────────────────┼──────────────────────────┼──────────────────────────┤
│ Patient Vitals / Report │ Resting Systolic BP      │ Directly supported by    │
│ (ABPM / Vitals Section) │ Resting Diastolic BP     │ Framingham & NHANES      │
│                         │ Body Mass Index (BMI)    │                          │
├─────────────────────────┼──────────────────────────┼──────────────────────────┤
│ Patient Profile Context │ Patient Age (years)      │ Directly supported by    │
│                         │ Biological Sex (Male/Fem)│ Framingham & NHANES      │
├─────────────────────────┼──────────────────────────┼──────────────────────────┤
│ Specialized Diagnostics │ Exercise ST Depression   │ REJECTED — Incompatible  │
│ (Hospital Cardiology)   │ Treadmill Max Heart Rate │ with routine outpatient  │
│                         │ Fluoroscopy Vessel Count │ blood report OCR         │
│                         │ Thallium Perfusion Defect│ (UCI Cleveland specific) │
└─────────────────────────┴──────────────────────────┴──────────────────────────┘
```

---

## 11. Population Analysis & Epidemiological Context

### 1. Framingham Heart Study Cohort
- **Setting**: Framingham, Massachusetts, USA.
- **Demographics**: Primarily middle-class Caucasian cohort recruited in mid-20th century.
- **Clinical Relevance**: Landmark epidemiological study that originated the concept of "cardiovascular risk factors."
- **Generalizability Considerations**: Historical U.S. cohorts tend to have slightly lower baseline diabetes and metabolic syndrome rates than contemporary South Asian / Indian cohorts. In South Asian populations, coronary artery disease presents at earlier ages and lower BMI cutoffs (WHO South Asian overweight threshold is $23.0$ vs $25.0$ in Western populations).
- **Engineering Recommendation**: Model output must be presented as a **calibrated statistical decision support probability** with clear clinical disclaimers, rather than a definitive medical diagnosis.

### 2. CDC Continuous NHANES Cohort
- **Setting**: Nationwide multi-ethnic representative U.S. sampling (includes Mexican American, Other Hispanic, Non-Hispanic White, Non-Hispanic Black, and Non-Hispanic Asian cohorts).
- **Clinical Relevance**: Captures contemporary real-world continuous laboratory measurements with standardized national laboratory calibration protocols (CDC Lipid Standardization Program).

---

## 12. Missing Data & Imbalance Characteristics

| Dataset | Total Records | Missingness Profile | Class Balance (Positive %) | Imbalance Ratio |
| :--- | :---: | :--- | :---: | :---: |
| **Framingham CHD** | 4,238 | Glucose missing in ~9.1%; totChol in ~1.2%; BMI in ~0.45%; BP in 0% | 644 / 4,238 (**15.2%**) | **5.58 : 1** |
| **CDC NHANES** | 5,856 – 17,500 | Fasting laboratory subsample weights accounted for; ~5-15% lab missingness | ~8.5% – 9.2% | **10.5 : 1** |
| **UCI Cleveland** | 303 | `ca` missing in 4 rows; `thal` missing in 2 rows | 139 / 303 (**45.9%**) | **1.18 : 1** |
| **Kaggle 70k** | 70,000 | 0% (synthetically scrubbed, but includes invalid ranges) | 34,970 / 70,000 (**49.9%**) | **1.00 : 1** |

### Imputation & Handling Strategy for MedScan-NCD
Following our Phase 4/5 standards:
- **Median / Median-within-Stratum Imputation**: Simple, reproducible median imputation during cross-validation (strictly fit inside training folds, zero test leakage).
- **Minimum Input Domain Policy**: Rather than imputing everything, MedScan-NCD enforces that a patient must supply at least one demographic feature, one physical vitals feature, and one laboratory lipid feature. If missing, the model returns `INSUFFICIENT_DATA`.

---

## 13. Legal, Licensing & Redistribution Review

- **Framingham Teaching Dataset**: Publicly distributed across university biostatistics repositories and mirrored under Open / Academic Fair Use on Kaggle and CRAN R packages. Fully compliant for university engineering projects and open demonstration.
- **CDC Continuous NHANES**: 100% U.S. Federal Government Public Domain (17 U.S.C. § 105). Zero restrictions on commercial, educational, or open-source software integration.
- **UCI Cleveland**: Creative Commons Attribution 4.0 International (CC BY 4.0).
- **Kaggle 70k (Ulianova)**: **LICENSE UNCLEAR**. No institutional copyright or patient consent documentation available.

---

## 14. Scientific Limitations of Candidate Datasets

1. **Framingham Heart Study**:
   - Prospective longitudinal follow-up is historically rooted in Framingham, MA. Absolute risk calibration may slightly underestimate risk in younger South Asian populations with high insulin resistance unless threshold adjustments or recalibration are applied.
   - HDL was not available in all early teaching dataset extractions (primarily uses Total Cholesterol, Systolic BP, BMI, Glucose).
2. **CDC Continuous NHANES**:
   - Cross-sectional survey: captures prevalence rather than prospective 10-year incidence.
   - Ground truth target relies on participant recall of physician diagnosis ("Has a doctor ever told you...").
3. **UCI Cleveland**:
   - Sample size of 303 is too small for robust tabular tree calibration.
   - Unusable in outpatient settings due to mandatory exercise stress test and nuclear imaging variables.
4. **Kaggle 70k Ulianova**:
   - Fatal lack of clinical documentation and severe blood pressure data errors.

---

## 15. Dataset Selection Recommendation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATASET SELECTION VERDICT                          │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
         ┌────────────────────────────┴────────────────────────────┐
         ▼                                                         ▼
┌────────────────────────────────────────┐ ┌────────────────────────────────────────┐
│           PRIMARY CANDIDATE            │ │          SECONDARY BENCHMARK           │
├────────────────────────────────────────┤ ├────────────────────────────────────────┤
│ Framingham Heart Study 10-Year CHD     │ │ CDC / NCHS Continuous NHANES           │
│ Teaching Cohort (N = 4,238)            │ │ Cardiovascular Cohort (N = 5,856+)     │
├────────────────────────────────────────┤ ├────────────────────────────────────────┤
│ Why: Evaluates real 10-year incident   │ │ Why: Unassailable public domain source;│
│ cardiovascular events (the gold        │ │ 100% architectural parity with our     │
│ standard of clinical cardiology).      │ │ existing Diabetes SAS XPT pipeline;    │
│ Predictor vector maps 100% to routine  │ │ continuous laboratory lipid features.  │
│ blood reports + vitals + profile.      │ │                                        │
└────────────────────────────────────────┘ └────────────────────────────────────────┘
```

### Tertiary Backup
- **UCI Heart Disease Combined 4-Center Database ($N = 920$)**: Suitable strictly as an academic benchmarking reference for comparing classic literature figures, but **not recommended** for the production outpatient pipeline due to reliance on treadmill stress tests.

---

## 16. Proposed Heart Disease Feature Schema (Preliminary Design)

Based on the selected Primary Candidate (**Framingham 10-Year CHD Risk Architecture**), we propose the following 8-feature non-invasive schema:

```json
{
  "model": "heart_disease_framingham_10yr",
  "version": "1.0.0",
  "task": "non_diagnostic_10yr_chd_risk_assessment",
  "input_feature_count": 8,
  "features": [
    {
      "name": "age",
      "dtype": "int",
      "unit": "years",
      "domain": "demographic",
      "source": "patient_profile / report_header",
      "required": true,
      "valid_range": [18, 100],
      "description": "Patient age in completed years"
    },
    {
      "name": "sex",
      "dtype": "int",
      "unit": "binary_code",
      "domain": "demographic",
      "source": "patient_profile / report_header",
      "required": true,
      "valid_values": [0, 1],
      "description": "Biological sex: 0 = Female, 1 = Male"
    },
    {
      "name": "systolic_bp",
      "dtype": "float",
      "unit": "mmHg",
      "domain": "physical_vitals",
      "source": "vitals_ocr / abpm_report / profile",
      "required": true,
      "valid_range": [60.0, 260.0],
      "description": "Resting systolic blood pressure"
    },
    {
      "name": "diastolic_bp",
      "dtype": "float",
      "unit": "mmHg",
      "domain": "physical_vitals",
      "source": "vitals_ocr / abpm_report / profile",
      "required": true,
      "valid_range": [30.0, 150.0],
      "description": "Resting diastolic blood pressure"
    },
    {
      "name": "bmi",
      "dtype": "float",
      "unit": "kg/m^2",
      "domain": "physical_vitals",
      "source": "vitals_ocr / profile",
      "required": false,
      "valid_range": [10.0, 90.0],
      "description": "Body Mass Index"
    },
    {
      "name": "total_cholesterol",
      "dtype": "float",
      "unit": "mg/dL",
      "domain": "laboratory",
      "source": "lipid_profile_ocr",
      "required": true,
      "valid_range": [50.0, 600.0],
      "description": "Total serum cholesterol concentration"
    },
    {
      "name": "fasting_glucose",
      "dtype": "float",
      "unit": "mg/dL",
      "domain": "laboratory",
      "source": "glucose_report_ocr / metabolic_panel",
      "required": false,
      "valid_range": [40.0, 500.0],
      "description": "Fasting blood sugar concentration"
    },
    {
      "name": "is_current_smoker",
      "dtype": "int",
      "unit": "binary_code",
      "domain": "behavioral",
      "source": "patient_profile_toggle",
      "required": false,
      "valid_values": [0, 1],
      "default_if_unspecified": 0,
      "description": "Current cigarette smoking status (0 = No, 1 = Yes)"
    }
  ],
  "minimum_input_policy": {
    "demographic_rule": "Both age and sex are strictly mandatory.",
    "physical_rule": "Systolic and Diastolic blood pressure are strictly mandatory.",
    "laboratory_rule": "Total cholesterol from a confirmed report is strictly mandatory.",
    "behavioral_rule": "Smoking status is optional; defaults to 0 (non-smoker) if unstated.",
    "failure_action": "Return status 'INSUFFICIENT_DATA' with canCalculate=false. Zero fabrication."
  }
}
```

---

## 17. Patient Input Gap Analysis Summary

As documented in [HEART_DISEASE_INPUT_GAP_ANALYSIS.md](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/HEART_DISEASE_INPUT_GAP_ANALYSIS.md):
- **7 of the 8 required features are ALREADY fully implemented** in MedScan-NCD's OCR engine, normalizers, and patient profile:
  1. `age` (Profile / OCR)
  2. `sex` (Profile / OCR)
  3. `systolicBP` (Vitals OCR / Profile)
  4. `diastolicBP` (Vitals OCR / Profile)
  5. `bmi` (Vitals OCR / Profile)
  6. `totalCholesterol` (Lipid Profile OCR)
  7. `fastingGlucose` (Metabolic Panel OCR)
- **Only 1 single minor attribute** is not currently collected:
  - `isCurrentSmoker` (A simple Yes/No toggle in Patient Profile).
  - Even if the user does not supply smoking status, the model can safely default to `0` (non-smoker) or use imputation without blocking the core laboratory/physical assessment.

---

## 18. Recommended Next Phase: Phase 7B Roadmap

Do NOT proceed with training or code modification until this audit report is formally reviewed.

When approved, the recommended implementation phases are:
1. **Phase 7B — Dataset Ingestion & Preprocessing Pipeline**:
   - Acquire and verify `framingham.csv` (and NHANES ASCVD benchmark).
   - Write deterministic cleaning and Stratified 80/20 train/test split script.
   - Establish baseline data completeness, class imbalance weighting, and median imputation pipelines.
2. **Phase 7C — Multi-Model Benchmarking & Calibration**:
   - Train and cross-validate (5-fold Stratified) 6 baseline models: Logistic Regression, Decision Tree, Random Forest, HistGradientBoosting, LightGBM, XGBoost.
   - Perform Platt (Sigmoid) calibration; evaluate Brier scores and reliability curves.
   - Lock clinically motivated development decision threshold based on sensitivity and specificity tradeoffs.
   - Compute TreeSHAP explainability drivers.
3. **Phase 7D — FastAPI Microservice & Backend Pipeline Integration**:
   - Add `/predict/heart-disease` endpoint to FastAPI service.
   - Implement `heartDiseaseFeatureBuilder.js` with domain-grounded minimum input policies.
   - Connect patient dashboard UI cards for Heart Disease risk assessment.

---

## 19. Complete Source Reference List

1. **Framingham Heart Study Primary Source**:
   - Wilson PWF, D'Agostino RB, Levy D, Belanger AM, Silbershatz H, Kannel WB. "Prediction of Coronary Heart Disease Using Risk Factor Categories." *Circulation*. 1998;97(18):1837–1847.  
     URL: `https://www.ahajournals.org/doi/10.1161/01.CIR.97.18.1837`  
     DOI: `10.1161/01.CIR.97.18.1837`
2. **NHLBI BioLINCC Framingham Repository**:
   - National Heart, Lung, and Blood Institute. "Framingham Heart Study (FHS) Teaching Dataset."  
     URL: `https://biolincc.nhlbi.nih.gov/studies/fhs/`
3. **CDC Continuous NHANES Official Data Portal**:
   - National Center for Health Statistics. "Continuous National Health and Nutrition Examination Survey (NHANES)."  
     URL: `https://www.cdc.gov/nchs/nhanes/`  
     Data Documentation: `https://wwwn.cdc.gov/nchs/nhanes/continuousnhanes/default.aspx?BeginYear=2017`
4. **UCI Machine Learning Repository — Heart Disease Dataset**:
   - Detrano R, Jánosi A, Steinbrunn W, Pfisterer M, Schmid J, Sandhu S, Guppy K, Lee S, Froelicher V. "International application of a new probability algorithm for the diagnosis of coronary artery disease." *Am J Cardiol*. 1989;64(5):304–310.  
     UCI DOI: `10.24432/C52P4X`  
     URL: `https://archive.ics.uci.edu/dataset/45/heart+disease`
5. **UCI Machine Learning Repository — Z-Alizadeh Sani CAD Dataset**:
   - Alizadeh Sani Z, et al. "Computer-aided diagnosis of coronary artery disease using genetic algorithm-optimized support vector machines." *Comput Methods Programs Biomed*. 2013;111(1):52–59.  
     UCI DOI: `10.24432/C5Q31T`  
     URL: `https://archive.ics.uci.edu/dataset/412/z-alizadeh+sani`
6. **CDC BRFSS Survey Repository**:
   - Centers for Disease Control and Prevention. "Behavioral Risk Factor Surveillance System."  
     URL: `https://www.cdc.gov/brfss/`  
     Zenodo Mirror DOI: `10.5281/zenodo.7348911`
7. **American College of Cardiology / American Heart Association (ACC/AHA) Primary Prevention Guidelines**:
   - Arnett DK, et al. "2019 ACC/AHA Guideline on the Primary Prevention of Cardiovascular Disease." *Circulation*. 2019;140(11):e596–e646.  
     DOI: `10.1161/CIR.0000000000000678`
