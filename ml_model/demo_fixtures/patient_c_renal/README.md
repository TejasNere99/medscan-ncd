# Patient C — Renal-Function / CKD Demonstration Profile

**SYNTHETIC — FOR DEMONSTRATION ONLY**

## Scenario Overview
Patient C (`Sunita Rao`, Age 62, Female) demonstrates significant renal biomarker elevation:
- Serum Creatinine: 2.40 mg/dL (markedly elevated)
- Blood Urea: 65 mg/dL (elevated)
- Blood Pressure: 148/92 mmHg

## Model Schema Adherence
- **CKD Model Input**: Strictly consumes `{ "age": 62.0, "serum_creatinine": 2.40 }`.
- **Excluded Features**: Blood urea (65 mg/dL), blood pressure, and hemoglobin are extracted into the patient profile, but are strictly excluded from the minimal CKD production model feature vector.
- **Model Output**: Calibrated Random Forest model evaluates to 1.0000 probability (`POSITIVE_CLASSIFICATION_ESTIMATE`), exceeding the 0.9672 development threshold.
