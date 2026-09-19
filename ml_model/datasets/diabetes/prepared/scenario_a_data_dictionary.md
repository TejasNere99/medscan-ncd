# MedScan-NCD — Data Dictionary: Scenario A Candidate Dataset

**File Path:** [`ml_model/datasets/diabetes/prepared/scenario_a_candidate.csv`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/ml_model/datasets/diabetes/prepared/scenario_a_candidate.csv)  
**Target Scenario:** Scenario A — Routine/Partial Medical Report Diabetes Risk Assessment  
**Total Observations:** 5,856 participants (Adults $\ge 18$ years from NHANES 2017–2018)  
**Total Columns:** 10 (1 Identifier + 8 Predictors + 1 Target)  
**Data Source:** Official CDC/NCHS Continuous NHANES 2017–2018 Cycle

---

## Variable Reference Table

| Column Name | NHANES Variable | Component File | Description & Meaning | Unit | Data Type | Valid Physiological Range | MedScan Structured JSON Mapping |
|---|---|---|---|---|---|---|---|
| `SEQN` | `SEQN` | `DEMO_J` | Participant identification sequence number (unique primary key) | None (ID) | `int64` | $[93703, 102956]$ | `patientId` / metadata |
| `age` | `RIDAGEYR` | `DEMO_J` | Age in years at screening examination | Years | `int64` | $[18, 100]$ (top-coded at 80 in NHANES) | `patientContext.age` |
| `sex` | `RIAGENDR` | `DEMO_J` | Biological sex at screening | Binary (`0` = Female, `1` = Male) | `int64` | $\{0, 1\}$ | `patientContext.sex` |
| `bmi` | `BMXBMI` | `BMX_J` | Body Mass Index ($\text{weight in kg} / [\text{height in m}]^2$) | $\text{kg}/\text{m}^2$ | `float64` | $[10.0, 70.0]$ (Observed: 14.2 to 86.2) | `measurements.bmi` |
| `systolic_bp` | `BPXSY2`, `BPXSY3` | `BPX_J` | Averaged resting systolic auscultatory blood pressure | mmHg | `float64` | $[70, 240]$ (Observed: 72.0 to 238.0) | `measurements.systolicBP` |
| `diastolic_bp` | `BPXDI2`, `BPXDI3` | `BPX_J` | Averaged resting diastolic auscultatory blood pressure | mmHg | `float64` | $[40, 140]$ (Observed: 31.0 to 135.0) | `measurements.diastolicBP` |
| `total_cholesterol` | `LBXTC` | `TCHOL_J` | Total serum cholesterol (enzymatic method) | mg/dL | `float64` | $[70, 500]$ (Observed: 76.0 to 446.0) | `measurements.totalCholesterol` |
| `hdl` | `LBDHDD` | `HDL_J` | High-density lipoprotein (HDL) cholesterol | mg/dL | `float64` | $[10, 150]$ (Observed: 10.0 to 189.0) | `measurements.hdl` |
| `creatinine` | `LBXSCR` | `BIOPRO_J` | Serum creatinine (enzymatic kinetic assay) | mg/dL | `float64` | $[0.2, 15.0]$ (Observed: 0.25 to 12.74) | `measurements.creatinine` |
| `target_diabetes` | Composite | `DIQ_J`, `GHB_J`, `GLU_J` | Standard CDC/ADA composite diabetes ground truth | Binary (`0` = No, `1` = Yes) | `int64` | $\{0, 1\}$ | Assessment Ground Truth |

---

## Detailed Variable Specifications

### 1. `SEQN` (Participant Sequence Number)
- **Original NHANES Source:** `DEMO_J.SEQN`
- **Transformation:** Preserved strictly as an integer primary key.
- **Missing-Value Treatment:** None (100% complete across all NHANES participants).
- **Integrity Check:** Verified strictly unique (zero duplicates across all 5,856 rows).

### 2. `age` (Age in Years)
- **Original NHANES Source:** `DEMO_J.RIDAGEYR`
- **Transformation:** Filtered to $\ge 18$ years. Cast to integer.
- **Missing-Value Treatment:** None (100% complete).
- **MedScan Mapping:** Populated directly from `patientContext.age` or patient profile.

### 3. `sex` (Biological Sex)
- **Original NHANES Source:** `DEMO_J.RIAGENDR` (1.0 = Male, 2.0 = Female)
- **Transformation:** Mapped to binary integer: `1.0 -> 1` (Male), `2.0 -> 0` (Female).
- **Missing-Value Treatment:** None (100% complete).
- **MedScan Mapping:** Populated from `patientContext.sex` ('Male' $\rightarrow$ 1, 'Female' $\rightarrow$ 0).

### 4. `bmi` (Body Mass Index)
- **Original NHANES Source:** `BMX_J.BMXBMI`
- **Transformation:** Rounded to 2 decimal places.
- **Missing-Value Treatment:** Preserved as `NaN` in candidate CSV (422 missing, 7.21%). Never defaulted.
- **MedScan Mapping:** Populated from `measurements.bmi` or derived from `measurements.weight` and `measurements.height`.

### 5. `systolic_bp` (Systolic Blood Pressure)
- **Original NHANES Source:** `BPX_J.BPXSY1`, `BPXSY2`, `BPXSY3`
- **Transformation:** In accordance with AHA/CDC guidelines, calculated as the average of readings 2 and 3 (`(BPXSY2 + BPXSY3)/2.0`) if both $\ge 60\text{ mmHg}$; otherwise single valid reading or reading 1. Rounded to 1 decimal place.
- **Missing-Value Treatment:** Preserved as `NaN` in candidate CSV (609 missing, 10.40%).
- **MedScan Mapping:** Populated from ABPM report 24-hr mean (`abpmData.overall.meanSystolic`) or clinic vitals (`measurements.systolicBP`).

### 6. `diastolic_bp` (Diastolic Blood Pressure)
- **Original NHANES Source:** `BPX_J.BPXDI1`, `BPXDI2`, `BPXDI3`
- **Transformation:** Cleaned floating-point representation of near-zeros from SAS export. Averaged auscultatory readings $\ge 30\text{ mmHg}$. Rounded to 1 decimal place.
- **Missing-Value Treatment:** Preserved as `NaN` in candidate CSV (609 missing, 10.40%).
- **MedScan Mapping:** Populated from ABPM report 24-hr mean (`abpmData.overall.meanDiastolic`) or clinic vitals (`measurements.diastolicBP`).

### 7. `total_cholesterol` (Total Cholesterol)
- **Original NHANES Source:** `TCHOL_J.LBXTC`
- **Transformation:** Standardized to mg/dL. Rounded to 1 decimal place.
- **Missing-Value Treatment:** Preserved as `NaN` in candidate CSV (680 missing, 11.61%).
- **MedScan Mapping:** Populated from lipid panel (`measurements.totalCholesterol`). If OCR reads mmol/L, converted safely via factor $\times 38.67$.

### 8. `hdl` (HDL-Cholesterol)
- **Original NHANES Source:** `HDL_J.LBDHDD`
- **Transformation:** Standardized to mg/dL. Rounded to 1 decimal place.
- **Missing-Value Treatment:** Preserved as `NaN` in candidate CSV (680 missing, 11.61%).
- **MedScan Mapping:** Populated from lipid panel (`measurements.hdl`).

### 9. `creatinine` (Serum Creatinine)
- **Original NHANES Source:** `BIOPRO_J.LBXSCR`
- **Transformation:** Standardized to mg/dL. Rounded to 2 decimal places.
- **Missing-Value Treatment:** Preserved as `NaN` in candidate CSV (702 missing, 11.99%).
- **MedScan Mapping:** Populated from renal profile / KFT (`measurements.creatinine`). If OCR reads $\mu\text{mol/L}$, converted safely via factor $\div 88.4$.

### 10. `target_diabetes` (Target Ground Truth)
- **Original NHANES Source:** `DIQ_J.DIQ010`, `DIQ050`, `DIQ070`, `GHB_J.LBXGH`, `GLU_J.LBXGLU`
- **Transformation:** Binary composite indicator:
  $$\text{target\_diabetes} = (\text{DIQ010} == 1) \lor (\text{DIQ050} == 1) \lor (\text{DIQ070} == 1) \lor (\text{LBXGH} \ge 6.5) \lor (\text{LBXGLU} \ge 126)$$
- **Prevalence:** 1,179 Positive (**20.13%**) vs. 4,677 Negative (**79.87%**).
- **Leakage Elimination:** Neither Fasting Glucose (`LBXGLU`) nor HbA1c (`LBXGH`) is present in the predictor columns.
