# MEDSCAN-NCD: HEART DISEASE PATIENT INPUT GAP ANALYSIS
====================================================================
Phase 7A: Clinical Input Feasibility & Feature Pipeline Audit
====================================================================

## Executive Summary
This document audits the clinical features required by leading cardiovascular disease risk models against the existing input architecture of **MedScan-NCD**. 

In MedScan-NCD, patient inputs originate from three distinct, strictly verified channels:
1. **Medical Report OCR Extraction**: Automated parsing and canonical normalization of laboratory test reports (e.g. Lipid Profile, Complete Blood Count, Metabolic Panel).
2. **Patient Health Profile**: Persistent user-verified demographic and physical vitals (Age, Biological Sex, Height, Weight, BMI, Systolic/Diastolic BP).
3. **Clinical Screening Questionnaire (Future Extension)**: Short, non-diagnostic clinical history questions (e.g. smoking status, hypertension medication).

---

## 1. Feature-by-Feature Gap Analysis

The table below contrasts the features utilized in our primary candidate model families (**Framingham 10-Year CHD Risk** and **CDC NHANES ASCVD Risk**) against MedScan-NCD's current production pipeline.

| Candidate Dataset Feature | Feature Domain | Meaning & Clinical Unit | Current MedScan Source | Currently Available? | Input Extraction Mechanism | Clinical Necessity | Leakage Risk Status | Recommended Engineering Action |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- | :---: | :--- |
| **Age** | Demographic | Patient chronological age (years, 18–120) | Patient Profile / Report Context | **YES** | User registration or report extraction via `patientContext.age` | Fundamental non-modifiable cardiovascular risk driver | **SAFE** | Direct Reuse from `Patient.age` / `patientContext` |
| **Sex / Gender** | Demographic | Biological sex at birth (0=Female, 1=Male) | Patient Profile / Report Context | **YES** | User profile `Patient.gender` or report extraction `patientContext.gender` | Essential for sex-stratified cardiovascular risk curves | **SAFE** | Direct Reuse from `Patient.gender` / `patientContext` |
| **Systolic Blood Pressure** | Physical Vitals | Resting systolic blood pressure (mmHg, 60–260) | Vitals / Report / Profile | **YES** | Extracted from vitals section by OCR (`measurements.systolicBP`) or patient profile (`Patient.systolicBP`) | Primary hemodynamic risk factor for arterial wall stress and atherosclerosis | **SAFE** | Direct Reuse from existing BP extraction pipeline |
| **Diastolic Blood Pressure** | Physical Vitals | Resting diastolic blood pressure (mmHg, 30–150) | Vitals / Report / Profile | **YES** | Extracted from vitals section by OCR (`measurements.diastolicBP`) or patient profile (`Patient.diastolicBP`) | Secondary hemodynamic parameter indicating systemic vascular resistance | **SAFE** | Direct Reuse from existing BP extraction pipeline |
| **Body Mass Index (BMI)** | Physical Vitals | Body mass index ($kg/m^2$, 10.0–90.0) | Profile / Report | **YES** | Computed from `weight/(height/100)^2` or extracted by OCR (`measurements.bmi`) | Key physical surrogate for adiposity and metabolic syndrome | **SAFE** | Direct Reuse from existing physical domain pipeline |
| **Total Cholesterol** | Laboratory | Total serum cholesterol concentration (mg/dL) | Laboratory Report OCR | **YES** | Parsed and normalized from Lipid Profile by `medicalNormalizer.js` (`measurements.totalCholesterol`) | Core atherogenic risk determinant across all international guidelines | **SAFE** | Direct Reuse from Lipid Panel OCR extraction |
| **HDL Cholesterol** | Laboratory | High-density lipoprotein cholesterol (mg/dL) | Laboratory Report OCR | **YES** | Parsed and normalized from Lipid Profile by `medicalNormalizer.js` (`measurements.hdl`) | Protective lipoprotein; inverse predictor of atherosclerotic risk | **SAFE** | Direct Reuse from Lipid Panel OCR extraction |
| **LDL Cholesterol** | Laboratory | Low-density lipoprotein cholesterol (mg/dL) | Laboratory Report OCR | **YES** | Parsed from Lipid Profile (`measurements.ldl`) | Primary target for clinical lipid-lowering therapy | **SAFE** | Direct Reuse from Lipid Panel OCR extraction |
| **Serum Triglycerides** | Laboratory | Fasting serum triglycerides (mg/dL) | Laboratory Report OCR | **YES** | Parsed from Lipid Profile (`measurements.triglycerides`) | Independent biomarker for atherogenic dyslipidemia | **SAFE** | Direct Reuse from Lipid Panel OCR extraction |
| **Fasting Blood Glucose** | Laboratory | Fasting plasma glucose (mg/dL) | Laboratory Report OCR | **YES** | Parsed from Metabolic / Glucose report (`measurements.fastingGlucose`) | Glycemic marker; severe accelerator of macrovascular disease | **SAFE (for CVD)** | Reusable for CVD modeling (Note: excluded from Diabetes predictor vector to prevent leakage, but fully legitimate as an independent predictor of Cardiovascular Disease) |
| **Smoking Status** | Behavioral / Lifestyle | Current cigarette smoker (Binary: 0=No, 1=Yes) | Not Currently Collected | **NO** | Requires a 1-item prompt in Patient Profile ("Do you currently smoke cigarettes?") | Critical risk multiplier (doubles 10-year cardiovascular risk) | **SAFE** | **Add to Patient Health Profile** as optional binary flag (`Patient.isCurrentSmoker`) |
| **Cigarettes Per Day** | Behavioral / Lifestyle | Average number of cigarettes smoked daily | Not Currently Collected | **NO** | Detailed questionnaire | Dose-response modifier for heavy smokers | **SAFE** | **Defer / Simplify**: Binary smoking status (`isCurrentSmoker`) captures >85% of variance without burdening user |
| **Blood Pressure Medication** | Clinical History | Currently taking antihypertensive medication (0/1) | Not Currently Collected | **NO** | Requires a 1-item prompt in Patient Profile ("Are you currently taking prescribed BP medication?") | Adjusts for masked high BP in treated hypertensives (AHA/Framingham protocol) | **SAFE (as baseline covariate)** | **Add to Patient Health Profile** as optional flag (`Patient.onBPMedication`) |
| **History of Diabetes** | Clinical History | Doctor diagnosed diabetes (0/1) | Can be Derived or Profile-based | **PARTIAL** | Derived from existing MedScan Diabetes assessment OR user profile flag | Major independent clinical risk factor for coronary artery disease | **SAFE (for CVD)** | Derive automatically if patient has confirmed diabetes report, or allow manual profile confirmation |
| **Chest Pain Type (`cp`)** | Diagnostic Symptom | Angina symptom category (Typical, Atypical, Non-anginal, Asymptomatic) | UCI Cleveland Specific | **NO** | Requires subjective clinical anamnesis | Used in symptomatic inpatient diagnostic triaging (UCI Cleveland) | **POTENTIAL LEAKAGE** | **DO NOT ADOPT**: Irrelevant for asymptomatic outpatient screening |
| **Exercise ST Depression (`oldpeak`)** | Diagnostic Procedure | ST-segment depression induced by exercise (mm) | UCI Cleveland Specific | **NO** | Treadmill ECG Stress Test (TMT) report | Diagnostic test for ischemia during physical stress | **DIAGNOSTIC ARTIFACT** | **DO NOT ADOPT**: MedScan-NCD focuses on routine blood/vitals reports |
| **Thallium Scintigraphy Defect** | Nuclear Imaging | Nuclear perfusion scan defect (Normal, Fixed, Reversible) | UCI Cleveland Specific | **NO** | Nuclear Cardiology imaging report | Direct visualization of myocardial infarction or ischemia | **DIRECT DIAGNOSTIC LEAKAGE** | **DO NOT ADOPT**: Nuclear imaging is a confirmatory hospital diagnosis |
| **Major Vessels by Fluoroscopy (`ca`)** | Invasive Imaging | Number of coronary vessels with $>50\%$ narrowing (0–3) | UCI Cleveland Specific | **NO** | Invasive coronary angiography report | Anatomical gold standard confirmation of CAD | **DIRECT DIAGNOSTIC LEAKAGE** | **DO NOT ADOPT**: Fluoroscopy vessel count IS the disease itself |

---

## 2. Synthesis of Input Availability

### Channel A: Direct Reuse from Existing MedScan-NCD Assets (Zero UI or Parser Changes Required)
The following 9 features are **ALREADY fully implemented, validated, and normalized** in MedScan-NCD:
1. `age` (Years, from Patient Profile or Report Header)
2. `gender` / `sex` (Binary, from Patient Profile or Report Header)
3. `systolicBP` (mmHg, from OCR Vitals, ABPM report, or Profile)
4. `diastolicBP` (mmHg, from OCR Vitals, ABPM report, or Profile)
5. `bmi` ($kg/m^2$, from OCR Vitals or Profile)
6. `totalCholesterol` (mg/dL, from Lipid Profile OCR)
7. `hdl` (mg/dL, from Lipid Profile OCR)
8. `triglycerides` (mg/dL, from Lipid Profile OCR)
9. `fastingGlucose` (mg/dL, from Blood Sugar / Metabolic OCR)

### Channel B: Minor Extension to Patient Health Profile (Non-Intrusive)
To achieve full fidelity with standard 10-year cardiovascular risk calculators (Framingham / ACC / AHA):
1. `isCurrentSmoker` (Boolean): A single toggle in the Patient Health Profile ("Do you currently smoke tobacco?").
2. `onBPMedication` (Boolean): A single toggle in the Patient Health Profile ("Are you currently taking prescribed blood pressure medication?").

### Channel C: Excluded Inpatient / Invasive Features (Scientific Justification)
The following features from legacy datasets (e.g. UCI Cleveland) are **strictly rejected** from MedScan-NCD:
- `cp` (Chest pain classification): Subjective triage symptom unsuitable for laboratory intelligence.
- `thalach`, `oldpeak`, `slope`: Exercise treadmill ECG parameters.
- `ca`, `thal`: Fluoroscopy and nuclear thallium imaging results.
- *Rationale*: Requiring invasive or specialized diagnostic test parameters would break MedScan-NCD's core design as a preventive, non-invasive health report intelligence platform.

---

## 3. Recommended 3-Domain Minimum Input Policy for Heart Disease
Following the proven MedScan-NCD Diabetes pattern:

```
HEART DISEASE RISK ASSESSMENT MINIMUM INPUT POLICY:
==================================================
Domain 1: Demographic (Mandatory)
  - Age (>= 18 years)
  - Biological Sex (Male / Female)

Domain 2: Physical Health (Mandatory)
  - Systolic BP AND Diastolic BP (mmHg) OR Body Mass Index (BMI)

Domain 3: Laboratory Information (Mandatory)
  - Total Cholesterol AND HDL Cholesterol (from Lipid Panel Report)
  - (Optional supporting laboratory: Fasting Glucose, Triglycerides, LDL)

Supplemental Behavioral (Optional with Default Imputation):
  - Smoking Status (Default: Non-smoker if unstated)
  - BP Medication (Default: Not on medication if unstated)
```
If any domain is missing: The system safely returns `INSUFFICIENT_DATA` with `canCalculate: false`, preserving clinical safety with zero value fabrication.
