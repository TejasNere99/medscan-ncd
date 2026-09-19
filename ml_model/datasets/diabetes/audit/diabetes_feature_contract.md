# MedScan-NCD — Scientific Feature & Target Contract: Diabetes Risk Model (Scenario A)

**Document ID:** `MEDSCAN-CONTRACT-DIAB-SCENARIO-A-V1.0`  
**Target Disease:** Type 2 Diabetes Mellitus  
**Project Objective:** Preventive Risk Assessment & Clinical Decision Support (Non-Diagnostic)  
**Data Cohort:** CDC/NCHS Continuous NHANES 2017–2018 Adult Cohort ($\text{Age} \ge 18$, $N = 5,856$)  
**Architecture:** OCR $\rightarrow$ Medical Intelligence $\rightarrow$ Structured Medical JSON $\rightarrow$ Human Review $\rightarrow$ Feature Builder $\rightarrow$ Risk Model  
**Audit Reference:** [`ml_model/datasets/diabetes/audit/nhanes_diabetes_audit.md`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/ml_model/datasets/diabetes/audit/nhanes_diabetes_audit.md)  
**Status:** Feature Contract Formalized — **No ML training, zero data modification.**

---

## 1. System Scope & Dual-Scenario Architecture

To prevent target leakage, physiological circularity, and clinical task mismatch, MedScan-NCD separates diabetes assessment into two distinct scientific scenarios:

```
                          Medical Report Ingestion (OCR)
                                       │
                                       ▼
                         Structured Medical JSON
                                       │
                ┌──────────────────────┴──────────────────────┐
                │                                             │
      [No Fasting Glucose/HbA1c]                      [Fasting Glucose / HbA1c
      (CBC, ABPM, Lipid, Renal)                        Explicitly Present]
                │                                             │
                ▼                                             ▼
        【 SCENARIO A 】                               【 SCENARIO B 】
   Primary Routine Risk Assessment               Glycemic Staging & Confirmation
 (Cardiometabolic & Anthropometric)              (Biomarker Cutoff Calibration)
  Target: Undiagnosed / Future Risk             Target: Glycemic Dysregulation Stage
```

- **Scenario A (This Contract):** Routine/partial medical report Diabetes Risk Assessment. Predicts whether a patient without a blood sugar test has underlying, undiagnosed, or high metabolic risk of diabetes based on routine vitals, anthropometrics, lipids, and renal markers.
- **Scenario B (Separate Module):** Glycemic Staging & Clinical Rule Confirmation when Fasting Glucose or HbA1c is explicitly tested.

---

## 2. Scenario A — Formal Feature Contract

Every predictor feature for Scenario A is formally defined below:

### 1. Chronological Age
- **Canonical MedScan Field:** `patientContext.age`
- **NHANES Variable:** `RIDAGEYR` (Demographics component `DEMO_J`)
- **Clinical Meaning:** Primary demographic determinant of pancreatic beta-cell senescence and insulin resistance.
- **Unit:** Years
- **Data Type:** Integer (`int64`)
- **Expected Physiological Range:** $[18, 100]$ (NHANES top-coded at 80; clinical bounds 18–100)
- **Source Report Type:** Patient Report Header, Registration Profile, or Lab Metadata
- **OCR Availability:** **DIRECTLY AVAILABLE** (Extracted via regex/header parser)
- **User Confirmation Required:** Yes (confirm demographic during review)
- **Derivable:** No (must be provided in report header or user profile)
- **Missing-Value Behaviour:** Mandatory baseline feature. If missing from report, populated from persistent patient profile. If absent from both, inference cannot proceed.
- **Required for Inference:** **YES**
- **Safety Notes:** Never impute or default age. A 22-year-old and an 72-year-old with identical blood pressure have radically different absolute diabetes risks.

### 2. Biological Sex
- **Canonical MedScan Field:** `patientContext.sex`
- **NHANES Variable:** `RIAGENDR` (Demographics component `DEMO_J`: 1 = Male, 2 = Female)
- **Clinical Meaning:** Sexual dimorphism in visceral adiposity distribution, hormonal regulation, and cardiometabolic risk trajectories.
- **Unit:** Categorical (`'Male'`, `'Female'`) $\rightarrow$ Model Input: Binary (`0` = Female, `1` = Male)
- **Data Type:** String in JSON $\rightarrow$ Integer (`0` or `1`) in feature vector
- **Expected Range:** `{0, 1}`
- **Source Report Type:** Patient Report Header or Profile
- **OCR Availability:** **DIRECTLY AVAILABLE**
- **User Confirmation Required:** Yes
- **Derivable:** No
- **Missing-Value Behaviour:** Mandatory baseline feature. If missing from report, retrieve from patient profile.
- **Required for Inference:** **YES**
- **Safety Notes:** Must not default to arbitrary sex.

### 3. Body Mass Index (BMI)
- **Canonical MedScan Field:** `measurements.bmi`
- **NHANES Variable:** `BMXBMI` (Body Measures component `BMX_J`)
- **Clinical Meaning:** Primary clinical index of general adiposity and key driver of peripheral insulin resistance.
- **Unit:** $\text{kg}/\text{m}^2$
- **Data Type:** Float (`float64`)
- **Expected Physiological Range:** $[10.0, 70.0]\text{ kg/m}^2$ (NHANES observed adult range: 12.3 to 86.2)
- **Source Report Type:** Physical Examination Report, General Lab Report, or Patient Profile Vitals
- **OCR Availability:** **DIRECTLY AVAILABLE** or **DERIVABLE**
- **User Confirmation Required:** Yes
- **Derivable:** Yes. Derivable from `measurements.weight` (kg) and `measurements.height` (m) using $\text{BMI} = \text{weight} / \text{height}^2$.
- **Missing-Value Behaviour:** Highly recommended. If missing, model handles via tree surrogate split or iterative imputer. If height and weight exist, derive automatically.
- **Required for Inference:** **RECOMMENDED** (Inference can proceed if either BMI or Blood Pressure is present; if both are absent, reject).
- **Safety Notes:** Values $<12$ or $>70$ trigger out-of-range clinical verification flags in UI.

### 4. Systolic Blood Pressure
- **Canonical MedScan Field:** `measurements.systolicBP`
- **NHANES Variable:** `SYS_BP_AVG` (Averaged auscultatory systolic BP from `BPX_J`)
- **Clinical Meaning:** Measure of vascular resistance and arterial stiffness. Strongly co-aggregates with hyperinsulinemia and metabolic syndrome.
- **Unit:** $\text{mmHg}$
- **Data Type:** Float (`float64`)
- **Expected Physiological Range:** $[70, 240]\text{ mmHg}$ (NHANES observed adult range: 72 to 238)
- **Source Report Type:** Ambulatory Blood Pressure Monitoring (ABPM), Vitals Record, Clinical Examination
- **OCR Availability:** **DIRECTLY AVAILABLE**
- **User Confirmation Required:** Yes
- **Derivable:** For ABPM reports, derived as 24-hour mean systolic BP (`abpmData.overall.meanSystolic`) or standard clinic systolic BP.
- **Missing-Value Behaviour:** If report is an ABPM or vitals record, this is populated. If absent (e.g. standalone lipid panel), handled via missing tabular indicator.
- **Required for Inference:** **RECOMMENDED**
- **Safety Notes:** Values $>180\text{ mmHg}$ trigger hypertensive urgency warning.

### 5. Diastolic Blood Pressure
- **Canonical MedScan Field:** `measurements.diastolicBP`
- **NHANES Variable:** `DIA_BP_AVG` (Averaged auscultatory diastolic BP from `BPX_J`)
- **Clinical Meaning:** Measure of resting peripheral vascular tone.
- **Unit:** $\text{mmHg}$
- **Data Type:** Float (`float64`)
- **Expected Physiological Range:** $[40, 140]\text{ mmHg}$ (NHANES observed adult range: 40 to 136)
- **Source Report Type:** ABPM, Vitals Record, Clinical Examination
- **OCR Availability:** **DIRECTLY AVAILABLE**
- **User Confirmation Required:** Yes
- **Derivable:** For ABPM reports, derived as 24-hour mean diastolic BP (`abpmData.overall.meanDiastolic`).
- **Missing-Value Behaviour:** Tracked alongside systolic BP.
- **Required for Inference:** **RECOMMENDED**
- **Safety Notes:** Extreme values ($<40$ or $>120$) trigger clinician verification warning.

### 6. Total Serum Cholesterol
- **Canonical MedScan Field:** `measurements.totalCholesterol`
- **NHANES Variable:** `LBXTC` (Laboratory component `TCHOL_J`)
- **Clinical Meaning:** Circulating total sterol biomarker; marker of dyslipidemia and atherosclerotic cardiovascular risk.
- **Unit:** $\text{mg/dL}$
- **Data Type:** Float (`float64`)
- **Expected Physiological Range:** $[70, 500]\text{ mg/dL}$ (NHANES observed adult range: 76 to 446)
- **Source Report Type:** Lipid Profile / Lipid Panel, Comprehensive Health Checkup
- **OCR Availability:** **DIRECTLY AVAILABLE**
- **User Confirmation Required:** Yes
- **Derivable:** No
- **Missing-Value Behaviour:** If report is a lipid panel, this is populated. If patient uploaded an ABPM, this is missing and handled via imputation/native tree missing support.
- **Required for Inference:** **SOMETIMES AVAILABLE**
- **Safety Notes:** Must safely convert $\text{mmol/L} \rightarrow \text{mg/dL}$ ($\times 38.67$) if unit is detected as mmol/L.

### 7. High-Density Lipoprotein (HDL) Cholesterol
- **Canonical MedScan Field:** `measurements.hdl`
- **NHANES Variable:** `LBDHDD` (Laboratory component `HDL_J`)
- **Clinical Meaning:** "Good" cholesterol. Inversely associated with insulin resistance. Low HDL ($\text{men} < 40\text{ mg/dL}$, $\text{women} < 50\text{ mg/dL}$) is a cardinal component of metabolic syndrome.
- **Unit:** $\text{mg/dL}$
- **Data Type:** Float (`float64`)
- **Expected Physiological Range:** $[10, 150]\text{ mg/dL}$ (NHANES observed adult range: 10 to 189)
- **Source Report Type:** Lipid Profile / Lipid Panel
- **OCR Availability:** **DIRECTLY AVAILABLE**
- **User Confirmation Required:** Yes
- **Derivable:** No
- **Missing-Value Behaviour:** Tracked alongside Total Cholesterol.
- **Required for Inference:** **SOMETIMES AVAILABLE**
- **Safety Notes:** Convert $\text{mmol/L} \rightarrow \text{mg/dL}$ ($\times 38.67$) if required.

### 8. Serum Creatinine
- **Canonical MedScan Field:** `measurements.creatinine`
- **NHANES Variable:** `LBXSCR` (Biochemistry component `BIOPRO_J`)
- **Clinical Meaning:** End-product of muscle metabolism excreted by kidneys. Marker of glomerular filtration and early diabetic microvascular renal damage.
- **Unit:** $\text{mg/dL}$
- **Data Type:** Float (`float64`)
- **Expected Physiological Range:** $[0.2, 15.0]\text{ mg/dL}$ (NHANES observed adult range: 0.25 to 12.74)
- **Source Report Type:** Renal Function Test (RFT / KFT), Comprehensive Metabolic Panel (CMP)
- **OCR Availability:** **DIRECTLY AVAILABLE**
- **User Confirmation Required:** Yes
- **Derivable:** No
- **Missing-Value Behaviour:** Populated from renal panels. Handled as missing if report is an ABPM or isolated lipid panel.
- **Required for Inference:** **SOMETIMES AVAILABLE**
- **Safety Notes:** Convert $\mu\text{mol/L} \rightarrow \text{mg/dL}$ ($\div 88.4$) if required.

---

## 3. Target Contract Specification

### Target Definition: `TARGET_COMPOSITE_DIABETES`

$$\text{TARGET\_COMPOSITE\_DIABETES} = \begin{cases} 1, & \text{if } (\text{DIQ010} == 1) \lor (\text{DIQ050} == 1) \lor (\text{DIQ070} == 1) \lor (\text{LBXGH} \ge 6.5\%) \lor (\text{LBXGLU} \ge 126\text{ mg/dL}) \\ 0, & \text{otherwise} \end{cases}$$

### Component Verification & Clinical Integrity:

1. **Doctor Diagnosis (`DIQ010 == 1`):** Captures 878 diagnosed adults ($14.99\%$). Represents established clinical diagnosis.
2. **Insulin Therapy (`DIQ050 == 1`):** Captures 245 adults on active insulin.
3. **Oral Hypoglycemic Agents (`DIQ070 == 1`):** Captures 715 adults taking diabetes pills (Metformin, Sulfonylureas, SGLT2i, etc.).
   - *Forensic finding:* 73 adults taking diabetes medications answered "No" or "Borderline" to `DIQ010`. Including `DIQ070` prevents misclassifying actively treated patients.
4. **Laboratory Undiagnosed Criteria (`LBXGH >= 6.5%` or `LBXGLU >= 126 mg/dL`):**
   - *Forensic finding:* 228 adults who never received a doctor diagnosis and are not taking medications have active, severe laboratory hyperglycemia ($\text{HbA1c} \ge 6.5\%$ or $\text{FPG} \ge 126\text{ mg/dL}$).
   - Including lab criteria ensures that undiagnosed individuals are correctly labeled as cases, training the model to recognize early/occult metabolic risk.

### Target Semantics Verification:
- **What does the target represent?** It represents **Current Physiological / Clinical Diabetes Status** (the presence of diagnosed, medically managed, or clinically active undiagnosed diabetes).
- **Does it match our project goal?** **YES.** In Scenario A, the model predicts the continuous probability ($0.00$ to $1.00$) that an individual has underlying diabetes from their routine cardiometabolic profile.
- **Clinical Staging Output:** The continuous risk probability $\hat{p}$ maps into clinical action bands:
  - $\hat{p} < 0.20 \rightarrow$ **Low Risk**
  - $0.20 \le \hat{p} < 0.45 \rightarrow$ **Moderate Risk** (Recommend lifestyle intervention & annual glycemic screening)
  - $\hat{p} \ge 0.45 \rightarrow$ **High Risk** (Recommend clinical confirmation via dedicated Fasting Plasma Glucose / HbA1c lab test)
- **Zero Diagnostic Replacement:** The system states: *"Elevated risk identified from blood pressure, BMI, and lipid profile. Clinical confirmation via Fasting Blood Sugar or HbA1c test is recommended."*

---

## 4. Formal Leakage Analysis for Scenario A

| Candidate Predictor | Target Component Overlap | Proxy Leakage Potential | Post-Diagnosis Treatment Bias | Leakage Verdict | Rationale |
|---|---|---|---|---|---|
| **Age** (`RIDAGEYR`) | None | None | None | **PASS** | Exogenous demographic variable. Zero causal feedback from diabetes status. |
| **Sex** (`RIAGENDR`) | None | None | None | **PASS** | Exogenous biological variable. Zero causal feedback. |
| **BMI** (`BMXBMI`) | None | None | Weight loss after diagnosis | **PASS** | Independent physiological risk factor. Some diagnosed diabetics lose weight after diagnosis, which slightly weakens correlation (conservative bias, not leakage). |
| **Systolic BP** (`SYS_BP_AVG`) | None | None | Antihypertensive therapy | **PASS** | Co-morbid physiological marker. Antihypertensive treatment lowers BP, causing slight conservative attenuation. Zero circularity. |
| **Diastolic BP** (`DIA_BP_AVG`) | None | None | Antihypertensive therapy | **PASS** | Same as Systolic BP. Zero circularity. |
| **Total Cholesterol** (`LBXTC`) | None | None | Statin co-prescription | **PASS WITH WARNING** | Diabetic patients are frequently co-prescribed statins, driving cholesterol lower (observed $r = -0.090$). This is clinical confounding by indication, not target leakage. Model learns multivariate lipid pattern in combination with HDL. |
| **HDL Cholesterol** (`LBDHDD`) | None | None | None | **PASS** | Endogenous metabolic marker. Strongly depressed in insulin-resistant states ($r = -0.163$). |
| **Serum Creatinine** (`LBXSCR`) | None | None | None | **PASS** | Renal function marker reflecting early microvascular nephropathy ($r = +0.098$). |
| **Fasting Glucose** (`LBXGLU`) | **DIRECT CIRCULARITY** | Target defined by $\ge 126$ | Massive | **FAIL (EXCLUDED FROM SCENARIO A)** | **Strictly excluded from Scenario A.** Including Fasting Glucose would create direct target-definition leakage. |
| **HbA1c** (`LBXGH`) | **DIRECT CIRCULARITY** | Target defined by $\ge 6.5$ | Massive | **FAIL (EXCLUDED FROM SCENARIO A)** | **Strictly excluded from Scenario A.** Including HbA1c would create direct target-definition leakage. |

**Leakage Conclusion for Scenario A:** With `LBXGLU` and `LBXGH` strictly excluded, **all 8 predictors in Scenario A have zero target-definition circularity**.

---

## 5. Missing Data Strategy

### Forensic Profiling in Adult Training Cohort ($N = 5,856$):
- Complete Cases (all 8 Scenario A features present): **4,842 / 5,856 (82.68%)**.
- Missingness per feature:
  - Age: $0.00\%$
  - Sex: $0.00\%$
  - BMI: $7.21\%$ ($422$ missing)
  - Systolic BP: $10.40\%$ ($609$ missing)
  - Diastolic BP: $10.40\%$ ($609$ missing)
  - Total Cholesterol: $11.61\%$ ($680$ missing)
  - HDL: $11.61\%$ ($680$ missing)
  - Serum Creatinine: $11.99\%$ ($702$ missing)
- Missingness Mechanisms:
  - 326 participants ($5.57\%$) completed only the in-home interview and did not attend the Mobile Examination Center (MEC). Their missingness is Unit Non-Response.
  - Among exam attendees ($N = 5,530$), feature completeness exceeds **$95\%$**.

### Recommended Strategy (Specification Only):
1. **Training Strategy:**
   - Filter training data to examined adults ($N = 5,530$) with valid target ground truth.
   - Utilize native missing-value splitting algorithms (e.g. **LightGBM / XGBoost**), which learn optimal default split directions for missing clinical values without injecting synthetic artifacts.
   - Alternatively, evaluate a calibrated regularized Logistic Regression benchmark using an `sklearn.pipeline.Pipeline` with `SimpleImputer(strategy='median')` fitted **strictly on training folds** inside cross-validation.
2. **Inference Strategy:**
   - Never fabricate or guess missing values.
   - Enforce the MedScan Minimum Inference Rule.

---

## 6. MedScan Inference Rules & Safety Guardrails

When a patient uploads a medical report to MedScan-NCD, the Feature Builder applies the following deterministic rules:

### Mandatory Minimum Feature Requirement:
To execute a valid Diabetes Risk Assessment under Scenario A, the incoming Structured Medical JSON must provide:
1. **Patient Age** (`patientContext.age`)
2. **Patient Sex** (`patientContext.sex`)
3. **At least ONE physical vital:** Either `measurements.bmi` OR (`measurements.systolicBP` AND `measurements.diastolicBP`)
4. **At least ONE laboratory biomarker:** Either `measurements.totalCholesterol` OR `measurements.creatinine`

### Insufficient Data Handling:
If the uploaded document is completely missing requisite biomarkers (for example, a patient uploads a standalone Chest X-Ray or an isolated urine culture), the system **MUST NOT** substitute arbitrary defaults (e.g. defaulting glucose to 100 or BP to 120/80).

The service layer immediately returns:
```json
{
  "disease": "Diabetes",
  "status": "INSUFFICIENT_DATA",
  "canCalculate": false,
  "message": "Insufficient clinical parameters to perform Diabetes Risk Assessment.",
  "availableFields": ["age", "sex"],
  "missingRequiredFields": ["bmi", "systolicBP", "diastolicBP", "totalCholesterol"],
  "clinicalGuidance": "A routine blood pressure reading, BMI, or lipid profile is required to assess metabolic risk."
}
```

---

## 7. Feature Availability Matrix

| Feature | NHANES Variable | MedScan Canonical Field | Primary OCR Source Report | Required for Inference? | Availability Status | Extraction / Clinical Notes |
|---|---|---|---|---|---|---|
| **Age** | `RIDAGEYR` | `patientContext.age` | Report Header / Patient Profile | **YES** | DIRECTLY AVAILABLE | Bounded integer; confirm with profile |
| **Sex** | `RIAGENDR` | `patientContext.sex` | Report Header / Patient Profile | **YES** | DIRECTLY AVAILABLE | Binary encoded (0=F, 1=M) |
| **BMI** | `BMXBMI` | `measurements.bmi` | Vitals / Physical Exam / General Lab | **RECOMMENDED** | DIRECTLY AVAILABLE / DERIVABLE | Derivable from Weight/Height if missing |
| **Systolic BP** | `SYS_BP_AVG` | `measurements.systolicBP` | ABPM / Vitals / General Health | **RECOMMENDED** | DIRECTLY AVAILABLE | Averaged resting or 24-hr ABPM mean |
| **Diastolic BP** | `DIA_BP_AVG` | `measurements.diastolicBP` | ABPM / Vitals / General Health | **RECOMMENDED** | DIRECTLY AVAILABLE | Averaged resting or 24-hr ABPM mean |
| **Total Cholesterol**| `LBXTC` | `measurements.totalCholesterol`| Lipid Profile / Lipid Panel | **SOMETIMES** | DIRECTLY AVAILABLE | Safe mmol/L conversion ($\times 38.67$) |
| **HDL Cholesterol** | `LBDHDD` | `measurements.hdl` | Lipid Profile / Lipid Panel | **SOMETIMES** | DIRECTLY AVAILABLE | Cardinal marker of metabolic syndrome |
| **Serum Creatinine** | `LBXSCR` | `measurements.creatinine` | Renal Function Panel (KFT / RFT) | **SOMETIMES** | DIRECTLY AVAILABLE | Microvascular marker; $\mu\text{mol/L}$ convert |

---

## 8. Final Decision & Readiness Verdict

### 1. Final Scenario A Feature Set:
$$\mathbf{X}_{\text{Scenario A}} = \left[ \text{Age}, \text{Sex}, \text{BMI}, \text{SystolicBP}, \text{DiastolicBP}, \text{TotalCholesterol}, \text{HDL}, \text{Creatinine} \right]$$

### 2. Final Target Definition:
$$\text{TARGET\_COMPOSITE\_DIABETES} = (\text{DIQ010} == 1) \lor (\text{DIQ050} == 1) \lor (\text{DIQ070} == 1) \lor (\text{LBXGH} \ge 6.5\%) \lor (\text{LBXGLU} \ge 126\text{ mg/dL})$$
- *Prevalence in Adult Cohort:* **$20.13\%$** ($1,179 / 5,856$).
- *Clinical Integrity:* Successfully unites diagnosed, medicated, and active undiagnosed cases while preserving zero target leakage for Scenario A.

### 3. Features Excluded from Scenario A:
- `LBXGLU` (Fasting Glucose)
- `LBXGH` (HbA1c)
- `BMXWAIST` (Waist Circumference — highly collinear with BMI and rarely present in routine blood test PDFs)
- `LBDLDL` & `LBXTR` (LDL and Triglycerides — restricted to morning fasting subsample, high missingness; Total Cholesterol and HDL provide sufficient lipid signal with lower missingness)

### 4. Reasons for Exclusion:
- `LBXGLU` and `LBXGH` were excluded to eliminate circular target-definition leakage.
- `LBDLDL` and `LBXTR` were excluded to prevent $\sim 57\%$ missingness in the primary model.

### 5. Leakage Assessment:
**PASS (Zero Target Leakage).** All 8 features in Scenario A represent independent anthropometric, cardiovascular, lipid, and renal measurements with zero circularity.

### 6. Missing-Data Strategy:
Use tree algorithms with native missing value support (LightGBM/XGBoost) or an isolated `Pipeline` with median imputation fit strictly on training folds. Enforce deterministic insufficient-data guardrails during production inference.

### 7. MedScan Inference Requirements:
Demographics (Age, Sex) + At least one physical vital (BMI or BP) + At least one laboratory marker (Lipid or Creatinine). Zero default fabrication.

### 8. Open Scientific Questions for Future Scenarios:
- Scenario B (Glycemic Staging Module): When a Fasting Blood Glucose report is uploaded, how should continuous glucose be calibrated with Scenario A risk to produce a unified patient report summary? (To be addressed in Phase 3.2).

---

## FINAL STATUS

# **READY FOR DATA PREPARATION**

*(Feature contract formally ratified. No models trained. No data modified. Awaiting authorization to begin Phase 3.2: Data Preparation & Cleaning Pipeline.)*
