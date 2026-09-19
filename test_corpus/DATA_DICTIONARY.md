# MedScan-NCD — Synthetic Test Corpus Data Dictionary

**Document Version:** 1.0.0  
**Status:** Active Quality Assurance Reference  
**Scope:** Medical report biomarkers, clinical vitals, demographic attributes, and model predictor mappings.

---

## 1. Overview & Architectural Principles

The MedScan-NCD synthetic test corpus establishes a standardized benchmark for evaluating:
1. **Document Understanding & Classification:** Distinguishing ABPM, CBC, Lipid Profiles, Renal Function Panels, and General Chemistries.
2. **Entity Extraction Fidelity:** Extracting numeric results, units, biological reference intervals, and flags.
3. **Clinical Unit Normalization:** Converting international SI units (e.g., $\text{mmol/L}$, $\mu\text{mol/L}$) to standard US units ($\text{mg/dL}$).
4. **Physiological Range & Conflict Validation:** Validating biological plausibility (VALID, WARNING, INVALID) and detecting intra-document conflicting measurements.
5. **Human-in-the-Loop Confirmation:** Requiring explicit human review of extracted values before downstream analytics.
6. **Scenario A Diabetes Model Predictor Mapping:** Isolating the 8 non-leaking cardiometabolic predictors without fabricating missing data.

---

## 2. Master Biomarker & Parameter Dictionary

| Parameter Name | Canonical Field Key | Domain | Standard Clinical Unit | Accepted Aliases & OCR Variations | Recognized Source Report Types | Normalization & Conversion Rule | Used in Diabetes ML Model? | Allowed in ML Predictor Vector? |
|---|---|---|---|---|---|---|---|---|
| **Age** | `patientContext.age` | Demographic | Years | `Age`, `Patient Age`, `Age / Gender`, `Age:` | All report types | Extracted as integer years $[18, 120]$. | **YES (Predictor 1)** | **YES** |
| **Biological Sex** | `patientContext.sex` | Demographic | Binary Code | `Sex`, `Gender`, `M`, `F`, `Male`, `Female` | All report types | Normalized to binary integer: `Male/M -> 1`, `Female/F -> 0`. | **YES (Predictor 2)** | **YES** |
| **Body Mass Index (BMI)** | `measurements.bmi` | Physical | $\text{kg}/\text{m}^2$ | `BMI`, `Body Mass Index`, `B.M.I.` | Clinic Vitals, Anthropometry, Health Screening | Valid range $[10.0, 90.0]$. Normalized to $\text{kg}/\text{m}^2$. | **YES (Predictor 3)** | **YES** |
| **Systolic Blood Pressure** | `measurements.systolicBP` | Physical | $\text{mmHg}$ | `Systolic BP`, `SBP`, `BP (Systolic)`, `120/80` (numerator) | Clinic Vitals, ABPM (Overall 24-hr Mean), Physical Exam | Valid range $[60.0, 260.0]\text{ mmHg}$. Unit normalized to $\text{mmHg}$. | **YES (Predictor 4)** | **YES** |
| **Diastolic Blood Pressure** | `measurements.diastolicBP` | Physical | $\text{mmHg}$ | `Diastolic BP`, `DBP`, `BP (Diastolic)`, `120/80` (denominator) | Clinic Vitals, ABPM (Overall 24-hr Mean), Physical Exam | Valid range $[30.0, 150.0]\text{ mmHg}$. Unit normalized to $\text{mmHg}$. | **YES (Predictor 5)** | **YES** |
| **Total Cholesterol** | `measurements.totalCholesterol` | Laboratory | $\text{mg/dL}$ | `Total Cholesterol`, `Serum Cholesterol`, `Cholesterol, Total`, `Chol (Total)`, `Cholesterol` | Lipid Profile, Comprehensive Metabolic, General Lab | $\text{mmol/L} \times 38.67 \rightarrow \text{mg/dL}$. $\text{mg}\% \rightarrow \text{mg/dL}$. Valid range $[50.0, 600.0]\text{ mg/dL}$. | **YES (Predictor 6)** | **YES** |
| **High-Density Lipoprotein (HDL)** | `measurements.hdl` | Laboratory | $\text{mg/dL}$ | `HDL Cholesterol`, `HDL-C`, `HDL`, `High Density Lipoprotein` | Lipid Profile, Comprehensive Metabolic | $\text{mmol/L} \times 38.67 \rightarrow \text{mg/dL}$. Valid range $[10.0, 200.0]\text{ mg/dL}$. | **YES (Predictor 7)** | **YES** |
| **Serum Creatinine** | `measurements.creatinine` | Laboratory | $\text{mg/dL}$ | `Serum Creatinine`, `S. Creatinine`, `Creatinine`, `Creat.` | Renal Profile / KFT, Basic Metabolic, General Lab | $\mu\text{mol/L} \div 88.4 \rightarrow \text{mg/dL}$. $\text{umol/L} \div 88.4 \rightarrow \text{mg/dL}$. Valid range $[0.10, 20.0]\text{ mg/dL}$. | **YES (Predictor 8)** | **YES** |
| **Fasting Blood Glucose** | `measurements.fastingGlucose` | Laboratory | $\text{mg/dL}$ | `Fasting Blood Glucose`, `FBS`, `Fasting Sugar`, `Glucose, Fasting` | Metabolic Panel, Diabetes Screening, General Lab | $\text{mmol/L} \times 18.0182 \rightarrow \text{mg/dL}$. Valid range $[40.0, 400.0]\text{ mg/dL}$. | **NO (Clinical Context)** | **NO (Target Leakage Elimination)** |
| **Glycated Hemoglobin (HbA1c)** | `measurements.hba1c` | Laboratory | $\%$ | `HbA1c`, `Glycated Hemoglobin`, `Hemoglobin A1c` | Diabetes Panel, Glycemic Profile | Standard $\%$. Valid range $[3.5, 18.0]\%$. | **NO (Clinical Context)** | **NO (Target Leakage Elimination)** |
| **Triglycerides** | `measurements.triglycerides` | Laboratory | $\text{mg/dL}$ | `Triglycerides`, `TG`, `Serum Triglycerides` | Lipid Profile | Standard $\text{mg/dL}$. Reference $< 150.0\text{ mg/dL}$. | NO (Future Model) | NO |
| **Low-Density Lipoprotein (LDL)** | `measurements.ldl` | Laboratory | $\text{mg/dL}$ | `LDL Cholesterol`, `LDL-C`, `LDL` | Lipid Profile | Standard $\text{mg/dL}$. Reference $< 100.0\text{ mg/dL}$. | NO (Future Model) | NO |
| **Blood Urea Nitrogen (BUN)** | `measurements.bun` | Laboratory | $\text{mg/dL}$ | `Blood Urea Nitrogen`, `BUN`, `Urea` | Renal Profile / KFT, Metabolic Panel | Standard $\text{mg/dL}$. Reference $7.0 - 20.0\text{ mg/dL}$. | NO (Future Model) | NO |
| **Hemoglobin (Hb)** | `measurements.hemoglobin` | Laboratory | $\text{g/dL}$ | `Hemoglobin`, `Haemoglobin`, `Hb`, `Hgb` | Complete Blood Count (CBC), Anemia Profile | Standard $\text{g/dL}$. Valid range $[4.0, 22.0]\text{ g/dL}$. | NO (Future Model) | NO |
| **Total WBC Count** | `measurements.wbcCount` | Laboratory | $/{\mu\text{L}}$ ($\text{cumm}$) | `Total WBC count`, `WBC`, `Leukocyte Count`, `TLC` | Complete Blood Count (CBC) | Standard $\text{cells}/\text{cumm}$. Valid range $[1500, 50000]$. | NO | NO |
| **Total RBC Count** | `measurements.rbcCount` | Laboratory | $\text{mill/cumm}$ | `Total RBC count`, `RBC Count`, `Red Blood Cell Count` | Complete Blood Count (CBC) | Standard $\text{mill}/\text{cumm}$. Valid range $[2.0, 9.0]$. | NO | NO |
| **Platelet Count** | `measurements.plateletCount` | Laboratory | $/{\mu\text{L}}$ ($\text{cumm}$) | `Platelet Count`, `Total Platelet Count`, `Platelets` | Complete Blood Count (CBC) | Standard $\text{cells}/\text{cumm}$. Valid range $[20000, 1000000]$. | NO | NO |
| **Packed Cell Volume (PCV)** | `measurements.pcv` | Laboratory | $\%$ | `Packed Cell Volume`, `PCV`, `Hematocrit`, `HCT` | Complete Blood Count (CBC) | Standard $\%$. Reference $37 - 52\%$. | NO | NO |
| **Mean Corpuscular Volume (MCV)**| `measurements.mcv` | Laboratory | $\text{fL}$ | `MCV`, `Mean Corpuscular Volume` | Complete Blood Count (CBC) | Standard $\text{fL}$. Valid range $[50, 140]\text{ fL}$. | NO | NO |
| **Mean Corpuscular Hemoglobin (MCH)**| `measurements.mch` | Laboratory | $\text{pg}$ | `MCH`, `Mean Corpuscular Hemoglobin` | Complete Blood Count (CBC) | Standard $\text{pg}$. Valid range $[15, 50]\text{ pg}$. | NO | NO |
| **MCHC** | `measurements.mchc` | Laboratory | $\text{g/dL}$ | `MCHC`, `Mean Corpuscular Hb Concentration` | Complete Blood Count (CBC) | Standard $\text{g/dL}$. Valid range $[20, 45]\text{ g/dL}$. | NO | NO |
| **Red Cell Distribution Width (RDW)**| `measurements.rdw` | Laboratory | $\%$ | `RDW`, `Red Cell Distribution Width` | Complete Blood Count (CBC) | Standard $\%$. Reference $11.5 - 14.5\%$. | NO | NO |
| **24-Hour Mean Systolic (ABPM)**| `abpmData.overall.meanSystolic`| Physical | $\text{mmHg}$ | `Overall 24-Hour Mean BP`, `24-Hr Average SBP` | ABPM Report | Averaged over 24-hour ambulatory monitoring period. | Mapped to `systolic_bp` if clinic BP absent | **YES** |
| **24-Hour Mean Diastolic (ABPM)**| `abpmData.overall.meanDiastolic`| Physical | $\text{mmHg}$ | `Overall 24-Hour Mean BP`, `24-Hr Average DBP` | ABPM Report | Averaged over 24-hour ambulatory monitoring period. | Mapped to `diastolic_bp` if clinic BP absent | **YES** |
| **Nocturnal Dipping %** | `abpmData.hypertensionIndicators.dipping` | Physical | $\%$ | `Nocturnal Dipping Percentage`, `Dipping %` | ABPM Report | Calculated as $((\text{Wake BP} - \text{Sleep BP}) / \text{Wake BP}) \times 100$. | NO (Hypertension Module) | NO |

---

## 3. Strict Domain Policies for Scenario A Diabetes Model

The MedScan-NCD diabetes model requires data across three specific clinical domains:
1. **Demographic Domain (Mandatory):**
   - Must contain both `age` ($\ge 18$ years) and biological `sex` (`0` = Female, `1` = Male).
2. **Physical Domain (At least 1 parameter mandatory):**
   - Must contain either `bmi` OR (`systolic_bp` AND `diastolic_bp`).
3. **Laboratory Domain (At least 1 parameter mandatory):**
   - Must contain either (`total_cholesterol` AND `hdl`) OR `creatinine`.

### Data Completeness Classification:
- **`FULL`:** All 8 predictors (`age`, `sex`, `bmi`, `systolic_bp`, `diastolic_bp`, `total_cholesterol`, `hdl`, `creatinine`) are available.
- **`PARTIAL`:** The minimum 3 domains are satisfied, but 1 or more optional parameters remain null. The model applies LightGBM native NaN branching with zero synthetic imputation.
- **`INSUFFICIENT`:** Any of the 3 required domains is completely missing (e.g., CBC only, or lipids without physical vitals). In this case, the system returns `INSUFFICIENT_DATA` and blocks risk score generation.

---

## 4. Target Leakage Quarantine Policy

Glycated Hemoglobin (`HbA1c`) and Fasting Blood Glucose (`FBS`) are diagnostic criteria used in the CDC NHANES ground-truth definition:
$$\text{Diabetes} = (\text{DIQ010} == 1) \lor (\text{DIQ050} == 1) \lor (\text{DIQ070} == 1) \lor (\text{HbA1c} \ge 6.5\%) \lor (\text{Fasting Glucose} \ge 126\text{ mg/dL})$$

To ensure scientific validity and avoid trivial target leakage:
- `fastingGlucose` and `hba1c` **MAY** be extracted and displayed in the patient's medical report view as clinical context.
- `fastingGlucose` and `hba1c` **MUST NEVER** be passed into the Scenario A 8-feature ML vector.
