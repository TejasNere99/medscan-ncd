# Edge-Case Demonstration Fixtures

**SYNTHETIC — FOR DEMONSTRATION ONLY**

## Test Cases
- **Case C (`case_c_correctable_extraction.pdf`)**: Tests human-in-the-loop manual correction. Shows that unconfirmed edits preserve original OCR values and record `manual_correction` provenance.
- **Case D (`case_d_missing_optional.pdf`)**: Tests missing optional parameters (BMI and HDL missing). Shows that models handle `PARTIAL` data completeness safely.
- **Case E (`case_e_missing_required.pdf`)**: Tests missing mandatory parameters. Shows that the Minimum Input Policy halts calculation with `INSUFFICIENT_DATA` rather than hallucinating predictions.
- **Case F (`case_f_unsupported_document.pdf`)**: Administrative roster document containing no clinical parameters. Verifies zero false positive biomarker extraction.
