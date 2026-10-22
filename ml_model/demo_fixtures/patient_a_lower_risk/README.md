# Patient A — Lower-Risk Demonstration Profile

**SYNTHETIC — FOR DEMONSTRATION ONLY**

## Scenario Overview
Patient A (`Aarav Sharma`, Age 28, Male, Non-smoker) demonstrates a healthy baseline metabolic and cardiovascular profile.
This scenario includes two sequential reports (Baseline: Jan 15, 2026; Follow-up: Jun 20, 2026) to demonstrate:
1. Clean digital PDF upload and OCR extraction.
2. Human-in-the-loop review and confirmation into the patient health profile.
3. Multi-model inference across all 4 disease engines.
4. Report comparison and longitudinal delta tracking on the Patient Dashboard.

## Files
- `report_1_baseline.pdf`: Baseline laboratory report.
- `report_2_followup.pdf`: 6-month follow-up laboratory report.
- `patient_profile.json`: Fictional patient demographics and baseline information.
- `report_metadata.json`: Chronological report metadata.
- `expected_extraction_1.json`: Expected OCR parser outputs for Report 1.
- `expected_extraction_2.json`: Expected OCR parser outputs for Report 2.
- `expected_canonical_mapping.json`: Canonical feature vectors for all four models.
- `comparison_expectations.json`: Expected longitudinal differences between Report 1 and Report 2.
