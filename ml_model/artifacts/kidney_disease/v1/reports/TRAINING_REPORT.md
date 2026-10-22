# chronic_kidney_disease Model Training Report

- Task: Trim whitespace/case from UCI class; ckd=1, notckd=0; unknown target labels rejected.
- Dataset SHA-256: `0eeea8d17f5ad8792d854999d6ddf1602ec4e116616f6ccdfdaef0ba8109e694`
- Rows: 374 (positive 230, negative 144)
- Development model: random_forest
- Calibration: isotonic; threshold 0.967232
- Held-out ROC-AUC: 0.9130; PR-AUC: 0.9524; Brier: 0.1144
- Interpretation: non-diagnostic classification of the dataset label; no clinical validation is established.

See `model_comparison.csv`, `cross_validation_metrics.json`, `heldout_metrics.json`, `calibration_report.json`, and `threshold_selection.json` for full evidence.
