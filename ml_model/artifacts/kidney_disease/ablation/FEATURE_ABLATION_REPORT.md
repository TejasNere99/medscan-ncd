# CKD Feature Ablation

A, B, and C were trained on the same records, random-state-42 development/test partition, candidate protocol, calibration protocol, and threshold rule. The three held-out columns are reported as descriptive audit results only. The selected production group uses development evidence only.

Selected group: **A_minimal**. Selected the smallest production-mappable feature set within 0.02 development ROC-AUC and Brier of the eligible best, with development cross-fit sensitivity >= 0.80. Held-out metrics were not used.

Group C remains research-only because the authoritative UCI field descriptions do not establish a safe mapping for its blood-pressure semantics or hemoglobin unit to the application's canonical data fields.

The UCI CKD sample is small and single-source; no clinical validation is established.
