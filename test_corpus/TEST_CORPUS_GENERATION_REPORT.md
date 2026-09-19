# MedScan-NCD — Synthetic Medical Report Test Corpus Generation Report

**Date of Execution:** 2026-09-14  
**Audit Status:** COMPLETE & VERIFIED  
**Engineering Role:** Senior Clinical Data Engineer, Medical Document Intelligence Engineer, OCR Test & QA Engineer  
**Quality Control Audit Result:** PASS (14/14 automated checks verified)  
**Corpus Root Directory:** [`test_corpus/`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/test_corpus)

---

## Executive Summary

A comprehensive, clinically grounded, 100% synthetic medical-report test corpus of **37 distinct laboratory documents** has been engineered and validated for the MedScan-NCD document intelligence and cardiometabolic risk prediction platform.

Every document is formatted as a printable vector PDF resembling contemporary accredited clinical diagnostic reports (ISO 15189 / CAP compliant layouts) and is paired with an exact ground-truth plain-text extraction file. The corpus contains zero real-person Protected Health Information (PHI/PII), features explicit synthetic disclaimers on every document, and strictly isolates diagnostic target variables (Glucose, HbA1c) from the 8-feature Scenario A model input vector.

---

## 1. Corpus Metrics & Category Breakdown Table

| Category | Folder Name | Report Count | Patient Count | Primary Test Focus |
|---|---|---:|---:|---|
| **Elevated-Risk Scenarios** | `01_diabetes_elevated_risk` | 5 | 5 | Cardiometabolic clustering, dyslipidemia, HTN, Class I-II obesity |
| **Healthy / Lower-Risk** | `02_lower_risk_healthy` | 5 | 5 | Normotensive, athletic, senior wellness, optimal lipid profiles |
| **Borderline Scenarios** | `03_borderline_cases` | 4 | 4 | Decision boundary evaluation ($\approx 0.18 - 0.24$ probability range) |
| **Missing-Data Scenarios** | `04_missing_data` | 4 | 4 | Domain policy enforcement (CBC only, KFT only, Lipids only, Partial) |
| **Multi-Report Histories** | `05_multi_report_patients` | 10 | 4 | Longitudinal progression, lifestyle response, split visits, stability |
| **OCR Robustness** | `06_ocr_challenging` | 3 | 3 | Dense grids, clinical abbreviations, digit confusion (`2O5` $\rightarrow$ `205`) |
| **Unit Variations** | `07_unit_variations` | 2 | 2 | SI Metric conversions ($\text{mmol/L}, \mu\text{mol/L}$) and alternate notation ($\text{mg}\%$) |
| **Conflicting Data** | `08_conflicting_data` | 1 | 1 | Intra-document triage vs exam conflict detection & warning flags |
| **Outlier Safety** | `09_outlier_cases` | 1 | 1 | Extreme physiological values ($\text{BMI } 52.4, \text{BP } 215/125, \text{Cr } 4.80$) without crash |
| **Mixed Realistic Reports** | `10_mixed_realistic_reports` | 2 | 2 | Multi-page PDF ($2$ pages) & 24-hr ABPM statistical table mapping |
| **TOTAL** | | **37** | **31** | **Exceeds target of 30+ reports** |

---

## 2. Document & Report Types Represented

The corpus implements a realistic cross-section of outpatient, clinic, and inpatient diagnostic laboratory documents:

1. **Complete Blood Count (CBC / Hemogram):** SLS-Hemoglobin, RBC, WBC, Platelets, MCV, MCH, MCHC, PCV, RDW.
2. **Lipid Profile Panel:** Total Cholesterol, HDL-C, Triglycerides, LDL-C, VLDL.
3. **Comprehensive Metabolic Panel (CMP):** Glucose, BUN, Creatinine, Electrolytes, Total Protein, Albumin.
4. **Renal Function Tests (KFT / RFT):** Serum Creatinine, Blood Urea Nitrogen, BUN/Creatinine ratio.
5. **Glycemic Assessment Panels:** Fasting Blood Glucose, Glycated Hemoglobin (HbA1c via HPLC).
6. **Ambulatory Blood Pressure Monitoring (ABPM):** 24-hour mean, daytime wake mean, nighttime sleep mean, nocturnal dipping percentage.
7. **Clinic Outpatient Consultation Vitals:** Auscultatory blood pressure (systolic/diastolic), body mass index (BMI), resting heart rate, anthropometry.
8. **Multi-Page Executive Health Checkups:** 2-page multi-system laboratory evaluation.

---

## 3. Patient Cohort & Demographics

The 37 reports represent **31 unique synthetic patient profiles** spanning diverse age and clinical demographics:
- **Age Distribution:** 24 to 71 years (Mean: $48.6$ years).
- **Biological Sex:** 16 Male ($51.6\%$), 15 Female ($48.4\%$).
- **BMI Range:** $21.2\text{ kg/m}^2$ (lean athletic) to $52.4\text{ kg/m}^2$ (extreme Class III morbid obesity).
- **Systolic BP Range:** $112\text{ mmHg}$ (optimal) to $215\text{ mmHg}$ (hypertensive emergency).
- **Diastolic BP Range:** $72\text{ mmHg}$ to $125\text{ mmHg}$.
- **Total Cholesterol Range:** $162\text{ mg/dL}$ (optimal) to $410\text{ mg/dL}$ (severe familial hypercholesterolemia).
- **HDL Cholesterol Range:** $22\text{ mg/dL}$ (severely depressed) to $68\text{ mg/dL}$ (protective/optimal).
- **Serum Creatinine Range:** $0.75\text{ mg/dL}$ (normal) to $4.80\text{ mg/dL}$ (severe kidney dysfunction).

---

## 4. Model-Relevant Feature Coverage (Scenario A Predictors)

Every report is indexed against the exact 8-element predictor vector required by MedScan-NCD's LightGBM pipeline:
`['age', 'sex', 'bmi', 'systolic_bp', 'diastolic_bp', 'total_cholesterol', 'hdl', 'creatinine']`

- **Full Coverage ($8/8$ Predictors Present):** 29 reports.
- **Partial Coverage ($4$ to $5$ Predictors Present):** 5 reports.
- **Minimal / Insufficient Coverage ($2$ to $3$ Predictors Present):** 3 reports.
- **Zero Fabrication Guarantee:** Missing fields remain explicitly `null` (Python `None`), preserving native missingness branching without synthetic numeric imputation.

---

## 5. Domain Policy & Missing-Data Coverage

The 4 dedicated missing-data cases (`04_missing_data`) systematically evaluate the platform's 3-domain minimum policy:
1. **`SYN-M001-R01` (CBC Only):** Lacks Physical domain (No BMI/BP) and Laboratory domain (No Lipids/Creatinine). Enforces `INSUFFICIENT_DATA` response and blocks risk estimation.
2. **`SYN-M002-R01` (CBC + Creatinine):** Satisfies Demographic and Laboratory domains, but lacks Physical domain. Enforces `INSUFFICIENT_DATA` (Missing Domain: `physical`).
3. **`SYN-M003-R01` (Lipids Only):** Lacks Physical domain. Validates that standalone laboratory tests cannot trigger ungrounded risk predictions without vital signs.
4. **`SYN-M004-R01` (BMI + Lipids, No BP, No Creatinine):** Satisfies all 3 domains (Demographic + Physical BMI + Laboratory Lipids). Confirms that partial feature sets with valid domain representation execute successfully with `dataCompleteness: "PARTIAL"`.

---

## 6. OCR Challenge & Robustness Coverage

The 3 dedicated OCR robustness cases (`06_ocr_challenging`) evaluate parser resilience:
- **`SYN-OCR1-R01`:** Dense grid formatting with compact clinical abbreviations (`SBP`, `DBP`, `Chol (Total)`, `Creat.`, `BMI`). Verifies alias resolution in `medicalNormalizer.js`.
- **`SYN-OCR2-R01`:** Wrapped table cells and punctuation (`Cholesterol, Total`, `Automated Spectrophotometry`). Verifies line-matching and regex boundary resilience.
- **`SYN-OCR3-R01`:** Digit substitution errors (`2O5` $\rightarrow$ `205`, `13O/85` $\rightarrow$ `130/85`). Verifies that `normalizeOcrNumericString` flags typo correction and applies confidence penalties.

---

## 7. Unit Normalization & Mathematical Conversion Coverage

The 2 dedicated unit variation cases (`07_unit_variations`) evaluate safe clinical conversions:
- **`SYN-UNT1-R01` (International SI Units):**
  - Total Cholesterol: $5.6\text{ mmol/L} \times 38.67 = 216.6\text{ mg/dL}$ (Verified).
  - HDL: $1.1\text{ mmol/L} \times 38.67 = 42.5\text{ mg/dL}$ (Verified).
  - Creatinine: $95.0\ \mu\text{mol/L} \div 88.4 = 1.07\text{ mg/dL}$ (Verified).
  - Fasting Glucose: $6.2\text{ mmol/L} \times 18.0182 = 111.7\text{ mg/dL}$ (Verified).
- **`SYN-UNT2-R01` (Alternate Unit Notations):**
  - Creatinine: $110.0\text{ umol/L} \div 88.4 = 1.24\text{ mg/dL}$ (ASCII `u` handling).
  - Total Cholesterol: $225.0\text{ mg}\% = 225.0\text{ mg/dL}$ (Archaic clinical identity).
  - Blood Pressure: `142 / 88 mm-Hg` (Hyphenated unit handling).

---

## 8. Conflict Detection & Outlier Safety Coverage

- **`SYN-CNF1-R01` (Conflicting Data):**
  Contains two conflicting blood pressure readings within the same document:
  - Triage Vitals: `124/80 mmHg`.
  - Attending Physician Exam: `148/92 mmHg`.
  - Also: Fasting Glucose preliminary `98 mg/dL` vs verified `138 mg/dL`.
  - Validates that `detectConflicts` returns `VALIDATION_STATUS.WARNING`, populates candidate distinct values, and prevents silent overwriting.
- **`SYN-OUT1-R01` (Outlier Safety):**
  Contains extreme but medically documented values: $\text{BMI } 52.4\text{ kg/m}^2$, $\text{BP } 215/125\text{ mmHg}$, $\text{TC } 410\text{ mg/dL}$, $\text{Creatinine } 4.80\text{ mg/dL}$.
  - Validates that `validateBiomarkerRange` triggers range warnings without discarding data or crashing the backend.

---

## 9. Multi-Report Longitudinal Patient Tracking

The 10 reports in `05_multi_report_patients` evaluate patient history tracking across 4 patients:
1. **`SYN-L001` (3 Reports over 12 Months):** Demonstrates progressive cardiometabolic risk elevation ($\text{BMI } 25.2 \rightarrow 26.5 \rightarrow 28.2$; $\text{BP } 124/80 \rightarrow 132/84 \rightarrow 140/88$; $\text{TC } 192 \rightarrow 208 \rightarrow 226$).
2. **`SYN-L002` (3 Reports over 12 Months):** Demonstrates risk reduction following diet and lifestyle modification ($\text{BMI } 32.0 \rightarrow 29.8 \rightarrow 27.9$; $\text{BP } 148/92 \rightarrow 136/86 \rightarrow 128/82$; $\text{TC } 245 \rightarrow 218 \rightarrow 198$).
3. **`SYN-L003` (2 Reports across 48 Hours):** Demonstrates split outpatient visits (Day 1 clinic vitals + CBC; Day 3 fasting lipids + renal panel). Tests merging of complementary accession reports.
4. **`SYN-L004` (2 Annual Reports):** Demonstrates stable postpartum normalization ($\text{BMI } 26.4 \rightarrow 24.5$; $\text{BP } 120/78 \rightarrow 116/74$).

---

## 10. Master Manifest & Ground Truth Artifacts Created

The corpus includes two standardized machine-readable JSON indexes and two markdown reference manuals:
1. [`test_corpus/MASTER_TEST_MANIFEST.json`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/test_corpus/MASTER_TEST_MANIFEST.json): Master inventory of all 37 reports with file paths, patient context, expected validation, normalization metadata, and prediction isolation (`actualModelOutput: null`).
2. [`test_corpus/EXPECTED_EXTRACTIONS.json`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/test_corpus/EXPECTED_EXTRACTIONS.json): Field-level ground-truth dictionary for automated unit test assertions.
3. [`test_corpus/DATA_DICTIONARY.md`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/test_corpus/DATA_DICTIONARY.md): Complete biomarker mapping, clinical units, regex aliases, and target leakage policy.
4. [`test_corpus/TESTING_GUIDE.md`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/test_corpus/TESTING_GUIDE.md): Operational guide for automated and manual evaluation.

---

## 11. Quality Control Self-Audit Certification (14/14 Checks)

An automated verification script ([`verify_test_corpus.py`](file:///c:/Users/PC/OneDrive/Desktop/College%20work/Mini%20Project/MedScan_NCD/verify_test_corpus.py)) was executed across all 37 reports:

```
========================================================================
MEDSCAN-NCD: 14-POINT TEST CORPUS QUALITY CONTROL SELF-AUDIT
========================================================================
[PASS] Check 01: Values are medically plausible
[PASS] Check 02: Units are correct and clinical standard
[PASS] Check 03: Reference ranges are internally consistent
[PASS] Check 04: Zero real-person PII present
[PASS] Check 05: Patient age and DOB agree across records
[PASS] Check 06: Report dates and timestamps are consistent
[PASS] Check 07: Multi-report timelines are chronological
[PASS] Check 08: No impossible biological combinations (SBP > DBP, TC > HDL)
[PASS] Check 09: Zero missing values replaced with fake numbers (null strictly preserved)
[PASS] Check 10: Model feature order matches ['age', 'sex', 'bmi', 'systolic_bp', 'diastolic_bp', 'total_cholesterol', 'hdl', 'creatinine']
[PASS] Check 11: Ground truth exactly matches generated document text
[PASS] Check 12: Clinical scenario does not equal forced model prediction (actualModelOutput is null)
[PASS] Check 13: Fictional lab branding with zero real hospital identity copied
[PASS] Check 14: Every file opens successfully without corruption
------------------------------------------------------------------------
OVERALL QUALITY CONTROL AUDIT: PASS (14/14 Checks Verified)
========================================================================
```

---

## 12. Current Limitations & Scope Boundaries

1. **Document Fidelity:** All 37 documents are vector-rendered digital PDFs. They contain crisp, selectable text streams that test document parsing, table structure extraction, and section understanding. Physical optical distortions (e.g., crumpled paper, low-resolution camera glare, skew) are evaluated via simulated string corruptions in `06_ocr_challenging`, but camera-phone photos can be added in future QA phases.
2. **Model Evaluation Decoupling:** In strict accordance with prompt instructions, **no reports have been processed through the active web application, database, or prediction service yet**. Model evaluation will be performed as a discrete, objective verification phase.
3. **Application Code Immutability:** Zero production code, frontend components, backend routes, database schemas, or ML model weights were altered during the creation of this test corpus.
