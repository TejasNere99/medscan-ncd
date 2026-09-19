# MedScan-NCD — Synthetic Test Corpus Testing Guide

**Document Version:** 1.0.0  
**Target Audience:** QA Engineers, Clinical ML Engineers, Backend Developers, Medical Reviewers  
**Corpus Root:** `test_corpus/`

---

## 1. Corpus Architecture & Folder Structure

The test corpus consists of 37 fully formatted diagnostic laboratory reports (PDFs) and matching ground-truth files organized into 10 scenario folders:

```
test_corpus/
├── 01_diabetes_elevated_risk/        (5 reports: SYN-D001 to SYN-D005)
├── 02_lower_risk_healthy/            (5 reports: SYN-H001 to SYN-H005)
├── 03_borderline_cases/              (4 reports: SYN-B001 to SYN-B004)
├── 04_missing_data/                  (4 reports: SYN-M001 to SYN-M004)
├── 05_multi_report_patients/         (10 reports across 4 longitudinal patients: SYN-L001 to SYN-L004)
├── 06_ocr_challenging/               (3 reports: SYN-OCR1 to SYN-OCR3)
├── 07_unit_variations/               (2 reports: SYN-UNT1, SYN-UNT2)
├── 08_conflicting_data/              (1 report: SYN-CNF1)
├── 09_outlier_cases/                 (1 report: SYN-OUT1)
├── 10_mixed_realistic_reports/       (2 reports: SYN-MIX1 multi-page, SYN-MIX2 ABPM)
│
├── MASTER_TEST_MANIFEST.json         (Master index of all 37 reports with metadata)
├── EXPECTED_EXTRACTIONS.json         (Field-level ground truth numeric values, units, and ranges)
├── DATA_DICTIONARY.md                (Complete biomarker mapping and conversion specifications)
├── TESTING_GUIDE.md                  (This execution and benchmarking manual)
└── TEST_CORPUS_GENERATION_REPORT.md  (Audit certification report)
```

Each scenario contains:
- `<reportId>.pdf`: Printable, vector-rendered diagnostic laboratory document.
- `<reportId>_ground_truth.txt`: Raw text ground-truth representation for direct OCR text diffing.

---

## 2. Evaluation Dimensions & Verification Procedures

Testing the MedScan-NCD system against this corpus involves 6 distinct sequential test stages:

```
PDF Document
     │
     ▼
[Stage 1: Document OCR & Ingestion] ──────► Measures: Character Error Rate (CER), Word Error Rate (WER)
     │
     ▼
[Stage 2: Report Classification]    ──────► Measures: Categorization Accuracy (ABPM, CBC, Lipids, KFT, CMP)
     │
     ▼
[Stage 3: Information Extraction]   ──────► Measures: Exact Field Match, Numeric Recall, Unit Extraction
     │
     ▼
[Stage 4: Unit Normalization]       ──────► Measures: SI Unit Conversion Accuracy (mmol/L -> mg/dL)
     │
     ▼
[Stage 5: Clinical Validation Gate] ──────► Measures: Physiological Range Warning & Intra-Report Conflict Flags
     │
     ▼
[Stage 6: ML Prediction Pipeline]   ──────► Measures: Minimum-Input Domain Gate & Model Score Sensitivity
```

---

## 3. Test Categories & Benchmark Expectations

### Category 01: Elevated Diabetes Risk (`01_diabetes_elevated_risk`)
- **Objective:** Verify end-to-end extraction and model inference for patients exhibiting classic cardiometabolic risk patterns (obesity, hypertension, dyslipidemia).
- **Expected Outcome:**
  - Full feature vector extracted ($8/8$ features).
  - Minimum input domains satisfied: Demographic (`PASS`), Physical (`PASS`), Laboratory (`PASS`).
  - Model status: `SUCCESS`, `dataCompleteness: "FULL"`.
  - Estimated probability: $\ge 0.210$ (Development Threshold).
  - Category: `ELEVATED_MODEL_ESTIMATED_RISK`.

### Category 02: Lower Risk / Healthy (`02_lower_risk_healthy`)
- **Objective:** Verify that normal physiological markers produce lower estimated risk without false positive alerts.
- **Expected Outcome:**
  - Full feature vector extracted ($8/8$ features).
  - Minimum input domains satisfied.
  - Model status: `SUCCESS`, `dataCompleteness: "FULL"`.
  - Estimated probability: $< 0.210$.
  - Category: `LOWER_MODEL_ESTIMATED_RISK`.

### Category 03: Borderline Cases (`03_borderline_cases`)
- **Objective:** Test model behavior and feature contributions near the decision boundary ($\approx 0.18$ to $0.24$).
- **Expected Outcome:**
  - Stable numeric output without numerical instability or clipping artifacts.
  - Directional TreeSHAP contributions highlight which specific borderline parameters elevate or mitigate risk.

### Category 04: Missing Data & Domain Enforcement (`04_missing_data`)
- **Objective:** Validate the strict 3-domain minimum policy:
  1. `SYN-M001-R01` (CBC Only): Must fail Physical & Laboratory domains $\rightarrow$ `INSUFFICIENT_DATA`.
  2. `SYN-M002-R01` (CBC + Creatinine): Must fail Physical domain $\rightarrow$ `INSUFFICIENT_DATA`.
  3. `SYN-M003-R01` (Lipids Only): Must fail Physical domain $\rightarrow$ `INSUFFICIENT_DATA` (unless patient profile supplies BMI/BP).
  4. `SYN-M004-R01` (BMI + Lipids, No BP, No Creatinine): Satisfies all 3 domains $\rightarrow$ `SUCCESS`, `dataCompleteness: "PARTIAL"`.
- **Expected Outcome:**
  - Zero fabrication: Missing features MUST remain `null` or `NaN`.
  - Zero crashes or default imputation with $0$ or $-1$.

### Category 05: Multi-Report Patient Histories (`05_multi_report_patients`)
- **Objective:** Evaluate patient longitudinal tracking across multiple dates.
  - `SYN-L001`: 3 sequential visits demonstrating risk progression over 12 months.
  - `SYN-L002`: 3 sequential visits demonstrating risk reduction following lifestyle intervention.
  - `SYN-L003`: 2 complementary reports 48 hours apart (vitals + CBC on day 1, lipids + renal on day 3).
  - `SYN-L004`: 2 annual postpartum checkups demonstrating long-term health maintenance.
- **Expected Outcome:**
  - Chronological ordering preserved in patient record.
  - Merging logic correctly attributes data to confirmed accession dates.

### Category 06: OCR Robustness (`06_ocr_challenging`)
- **Objective:** Test parser resilience against:
  - Dense abbreviations: `SBP`, `DBP`, `Chol (Total)`, `Creat.`
  - Wrapped labels with punctuation: `Cholesterol, Total`, `Automated Spectrophotometry`.
  - Character confusion: letter `O` substituted for digit `0` (`2O5` $\rightarrow$ `205`).
- **Expected Outcome:**
  - Correct parsing through `normalizeOcrNumericString`.
  - Confidence penalty recorded for typo corrections.

### Category 07: Unit Variations & Conversions (`07_unit_variations`)
- **Objective:** Test mathematical correctness of unit normalization:
  - Total Cholesterol: $5.6\text{ mmol/L} \times 38.67 = 216.6\text{ mg/dL}$.
  - HDL: $1.1\text{ mmol/L} \times 38.67 = 42.5\text{ mg/dL}$.
  - Creatinine: $95.0\ \mu\text{mol/L} \div 88.4 = 1.07\text{ mg/dL}$.
  - Fasting Glucose: $6.2\text{ mmol/L} \times 18.0182 = 111.7\text{ mg/dL}$.
  - Alternate notation: $\text{mg}\% \rightarrow \text{mg/dL}$ identity ($225\text{ mg}\% = 225\text{ mg/dL}$).
- **Expected Outcome:**
  - `conversionApplied: true` flagged on extracted parameter.
  - Audit trail preserves original value, original unit, and normalized value.

### Category 08: Conflicting Data (`08_conflicting_data`)
- **Objective:** Verify conflict detection when distinct values appear in separate report sections.
  - Triage BP ($124/80\text{ mmHg}$) vs Exam BP ($148/92\text{ mmHg}$).
- **Expected Outcome:**
  - `validationStatus: "WARNING"`.
  - Warning message specifies candidate values without silently overwriting one with the other.

### Category 09: Outlier Safety (`09_outlier_cases`)
- **Objective:** Verify handling of extreme physiological readings ($\text{BMI } 52.4$, $\text{BP } 215/125$, $\text{Creatinine } 4.80$).
- **Expected Outcome:**
  - Values must NOT be discarded or replaced with $0$.
  - Generates clinical validation warning flags (`severity: "warning"`).

### Category 10: Multi-Page & ABPM Mixed Documents (`10_mixed_realistic_reports`)
- **Objective:** Verify 2-page document processing (`SYN-MIX1`) and complex multi-period statistical extraction (`SYN-MIX2`).
- **Expected Outcome:**
  - Page 1 and Page 2 extracted and concatenated seamlessly.
  - ABPM 24-hr mean correctly mapped into physical vitals.

---

## 4. Ground Truth JSON Schema

Every entry in `EXPECTED_EXTRACTIONS.json` follows this structured contract:

```json
{
  "SYN-D001-R01": {
    "reportId": "SYN-D001-R01",
    "patientId": "SYN-D001",
    "reportType": "metabolic_panel",
    "clinicalScenario": "elevated_diabetes_risk",
    "expectedExtraction": {
      "age": 62,
      "sex": 1,
      "bmi": 32.4,
      "systolicBP": 146.0,
      "diastolicBP": 92.0,
      "totalCholesterol": 242.0,
      "hdl": 36.0,
      "creatinine": 1.15
    },
    "modelRelevantFeatures": {
      "age": 62,
      "sex": 1,
      "bmi": 32.4,
      "systolic_bp": 146.0,
      "diastolic_bp": 92.0,
      "total_cholesterol": 242.0,
      "hdl": 36.0,
      "creatinine": 1.15
    },
    "missingFields": [],
    "normalization": [],
    "expectedValidation": "VALID",
    "expectedConflict": false,
    "actualModelOutput": null
  }
}
```

---

## 5. Automated Evaluation Protocol

When testing MedScan-NCD against this corpus:
1. Run automated parser against each PDF:
   ```javascript
   const { processReportOCR } = await import('./services/ocrService.js');
   const result = await processReportOCR('test_corpus/.../<reportId>.pdf');
   ```
2. Compare `result.extractedData` against `EXPECTED_EXTRACTIONS.json[reportId].expectedExtraction`.
3. Verify that `actualModelOutput` is populated only after calling `/predict/diabetes` on the FastAPI ML service.
