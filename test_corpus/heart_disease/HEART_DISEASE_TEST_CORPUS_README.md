# MedScan-NCD: Heart Disease Synthetic Test Report Corpus
**Official Testing Corpus for Framingham 10-Year CHD Machine Learning Model**

---

## 1. Corpus Purpose
This synthetic medical report corpus is designed for end-to-end manual verification of the MedScan-NCD Heart Disease intelligence pipeline:
```
PDF Upload → OCR → Field Extraction → Normalization → Human Review & Correction → User Confirmation → Feature Vector Builder → Python FastAPI Microservice → Calibrated Probability → Contributing Factors → Patient Health Profile Persistence
```

**STRICT INTEGRITY POLICY**:
- **100% Synthetic Data**: All patient names, facility names, dates, and accession codes are fictitious.
- **Top Watermark Banner**: Every document is clearly branded:
  `"SYNTHETIC TEST DATA — NOT A REAL MEDICAL REPORT — FOR EVALUATION ONLY"`
- **Zero Prediction Fabrication**: Ground truth files contain **ONLY** printed values. The application itself must compute probabilities and classifications.

---

## 2. Model Feature Schema

The integrated Framingham 10-Year CHD model requires 5 mandatory clinical parameters and supports 3 optional parameters:

| Feature | Role | Valid Range | Standard Unit |
| :--- | :--- | :--- | :--- |
| `age` | **Mandatory** | 18–100 | Years |
| `sex` | **Mandatory** | 0 or 1 | Male / Female |
| `totChol` | **Mandatory** | 50–600 | mg/dL (or mmol/L convertible) |
| `sysBP` | **Mandatory** | 60–260 | mmHg |
| `diaBP` | **Mandatory** | 30–150 | mmHg |
| `BMI` | *Optional* | 10–80 | kg/m² |
| `glucose` | *Optional* | 40–500 | mg/dL (or mmol/L convertible) |
| `currentSmoker` | *Optional* | 0 or 1 | Non-smoker / Smoker |

---

## 3. Corpus Category Breakdown (41 Reports Total)

| Category | Reports | Description & Objective |
| :--- | :---: | :--- |
| `01_elevated_risk` | 4 | Profiles featuring combinations of older age (55–70), Stage 1/2 systolic hypertension, higher cholesterol (245–270 mg/dL), active smoking, and elevated BMI. |
| `02_lower_risk` | 4 | Generally healthier profiles (ages 29–42, optimal BP 112–120/70–76, normal cholesterol 165–180 mg/dL, non-smokers). |
| `03_borderline` | 4 | Profiles situated around intermediate boundary thresholds (ages 45–55, BP 128–138/82–88, cholesterol 198–218 mg/dL) testing model probability resolution. |
| `04_missing_required_data` | 4 | Intentionally omits one mandatory feature per report (`age`, `sex`, `totChol`, or `BP`) to verify application transition to `INSUFFICIENT_DATA`. |
| `05_optional_missing_data` | 4 | Retains all 5 required features while omitting optional parameters (`BMI`, `glucose`, `currentSmoker`) to verify preprocessor imputation. |
| `06_ocr_challenging` | 4 | Visually complex layouts: compact spacing, fused unit strings (`142mmHg`, `27.4kg/m²`), alternative nomenclature (`Total CholesteroI`), and dotted leader lines. |
| `07_unit_variations` | 3 | Alternative SI units: Total Cholesterol in `mmol/L` (e.g. 5.7, 6.2 mmol/L) and Glucose in `mmol/L` (e.g. 5.8, 6.1 mmol/L) testing unit normalization. |
| `08_manual_correction` | 3 | Designed specifically for human-in-the-loop editing in the confirmation modal (adjacent bracketed ranges, combined NIBP strings, and standard overrides). |
| `09_multi_report_longitudinal` | 7 | 3 patients followed across multiple calendar visits in 2026 (Progression over 3 visits, Lifestyle improvement over 2 visits, and Stable monitoring over 2 visits). |
| `10_realistic_mixed_reports` | 4 | Multi-domain clinical panels (Complete Blood Count, Urinalysis, 12-lead ECG impression, Lipid Profile, Vitals, and extreme outlier boundary check). |

---

## 4. Master Manifest & Ground Truth Files

- **Master Manifest**: [`MASTER_HEART_DISEASE_TEST_MANIFEST.json`](./MASTER_HEART_DISEASE_TEST_MANIFEST.json)
- Every PDF report is paired with an identical-stem `.json` ground truth file:
  - Example: `HD_ELEV_001.pdf` -> `HD_ELEV_001.json`
- Ground truth files strictly record printed values and contain **ZERO** model predictions.

---

## 5. Automated Quality Control Verification
- **Total PDFs Generated**: 41
- **Total Ground-Truth Files**: 41
- **Unique Synthetic Patients**: 37
- **Zero Real-Patient PII Verified**: YES
- **Zero Model Predictions in Ground Truth**: YES
- **Synthetic Watermark on All Documents**: YES
- **Internal Consistency (`sysBP > diaBP`, `18 <= age <= 100`)**: YES
