# hypertension_diagnosed_treated Model Training Report

- Task: Positive when BPQ020=Yes, or BPQ050A=Yes; negative only when BPQ020=No and medication items BPQ040A/BPQ050A are structural blanks according to the official skip; otherwise exclude unresolved/contradictory labels.
- Dataset SHA-256: `e8edc7bfb41de1e84337c2ecb8b56a2f445c6c60c400a47966d9351e763d8c8d`
- Rows: 6151 (positive 2137, negative 4014)
- Development model: hist_gradient_boosting
- Calibration: sigmoid; threshold 0.330679
- Held-out ROC-AUC: 0.8233; PR-AUC: 0.6864; Brier: 0.1614
- Interpretation: non-diagnostic classification of the dataset label; no clinical validation is established.

See `model_comparison.csv`, `cross_validation_metrics.json`, `heldout_metrics.json`, `calibration_report.json`, and `threshold_selection.json` for full evidence.
