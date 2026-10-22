"""Train the UCI CKD model and mandatory matched-participant feature ablation."""

from __future__ import annotations

import csv
import json
import shutil
from pathlib import Path

import pandas as pd

from dataset_builders import CKD_EXCLUDED, CKD_GROUPS, build_ckd_dataset
from train_utils import ROOT, train_and_evaluate, write_json

CSV_PATH = ROOT / "ml_model" / "datasets" / "ckd" / "raw" / "uci_chronic_kidney_disease.csv"
MANIFEST_PATH = ROOT / "ml_model" / "datasets" / "ckd" / "raw" / "source_manifest.json"
ARTIFACT_ROOT = ROOT / "ml_model" / "artifacts" / "kidney_disease"

FIELD_INFO = {
    "age": {"type": "number", "unit": "years", "required": True, "uci_field": "age", "valid_range": [0, 130]},
    "serum_creatinine": {"type": "number", "unit": "mg/dL", "required": True, "uci_field": "sc", "valid_range": ">0; retain clinically extreme positive values"},
    "blood_urea": {"type": "number", "unit": "mg/dL", "required": False, "uci_field": "bu", "source_definition": "Blood urea (not BUN)", "valid_range": ">0; retain clinically extreme positive values"},
    "blood_pressure": {"type": "number", "unit": "mm/Hg", "required": False, "uci_field": "bp", "production_mapping": "UCI documentation does not specify systolic versus diastolic; no mapping from patient systolic/diastolic values is enabled."},
    "blood_glucose": {"type": "number", "unit": "mg/dL", "required": False, "uci_field": "bgr", "context": "Random blood glucose, not assumed fasting."},
    "hemoglobin": {"type": "number", "unit": "gms (UCI documentation; denominator unspecified)", "required": False, "uci_field": "hemo", "production_mapping": "UCI unit documentation is insufficient to safely equate with canonical g/dL; group C cannot be enabled for clinical production until verified."},
}


def main() -> None:
    final_dir = ARTIFACT_ROOT / "v1"
    if final_dir.exists():
        raise FileExistsError(f"Refusing to overwrite existing CKD release artifacts: {final_dir}")
    existing_runs = [path for path in (ARTIFACT_ROOT / "ablation").iterdir() if path.is_dir() and any(path.iterdir())] if (ARTIFACT_ROOT / "ablation").exists() else []
    if existing_runs:
        raise FileExistsError(f"Refusing to overwrite existing CKD ablation runs: {existing_runs}")
    base_features, target, audit = build_ckd_dataset(CSV_PATH)
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    group_metadata: dict[str, dict] = {}
    group_profiles = []

    for group_name, columns in CKD_GROUPS.items():
        run_dir = ARTIFACT_ROOT / "ablation" / group_name
        schema = {
            "schema_version": f"ckd.{group_name.lower()}.v1",
            "disease": "chronic_kidney_disease",
            "task": "CKD status classification",
            "task_interpretation": "Model-estimated probability of the original UCI dataset CKD status from approved clinical/laboratory features. Not future-onset prediction and not a diagnosis.",
            "ordered_features": columns,
            "required_features": ["age", "serum_creatinine"],
            "fields": {name: FIELD_INFO[name] for name in columns},
            "target_definition": "Trim whitespace/case from UCI class; ckd=1, notckd=0; unknown target labels rejected.",
            "excluded_features": CKD_EXCLUDED,
            "missingness_policy": "Age and serum creatinine are required. Optional selected model fields may be absent; training-fitted median imputation and indicators handle their absence. No inference-time feature schema fallback.",
            "training_preprocessing": "Numeric median imputation and missingness indicators fitted inside each CV fold; no clipping/winsorization or global imputation.",
            "limitations": [
                "UCI CKD data has 400 records from a single hospital and short collection period; only records with age and creatinine remain for training.",
                "Small sample size makes discrimination and especially calibration/threshold estimates uncertain.",
                "Dataset label classification is not a future onset prediction, diagnosis, or clinical validation.",
                "Population, clinical origin, feature missingness, and measurement processes limit generalization.",
                "UCI documents blood pressure as mm/Hg but does not specify systolic/diastolic semantics; production mapping is disabled.",
                "UCI documents hemoglobin units as gms without denominator; production mapping to g/dL is disabled pending source verification.",
            ],
        }
        metadata = train_and_evaluate(
            disease="chronic_kidney_disease",
            X=base_features[columns].copy(),
            y=target,
            source_audit=audit,
            data_sha256=manifest["sha256"],
            dataset_source={
                "name": manifest["dataset"],
                "uci_id": 336,
                "doi": manifest["doi"],
                "repository_url": manifest["repository_url"],
                "data_url": manifest["data_url"],
                "retrieved_at_utc": manifest["retrieved_at_utc"],
                "license": manifest["license"],
            },
            artifact_dir=run_dir,
            target_definition=schema["target_definition"],
            feature_schema=schema,
            split_identifiers=list(range(len(target))),
        )
        group_metadata[group_name] = metadata
        threshold_report = json.loads((run_dir / "threshold_selection_report.json").read_text(encoding="utf-8"))
        group_profiles.append({
            "feature_group": group_name,
            "features": ",".join(columns),
            "feature_count": len(columns),
            "development_roc_auc": metadata["development_metrics"]["roc_auc"],
            "development_pr_auc": metadata["development_metrics"]["pr_auc"],
            "development_brier": metadata["development_metrics"]["brier"],
            "development_threshold": metadata["development_threshold"],
            "development_sensitivity": threshold_report["development_crossfit_metrics"]["sensitivity"],
            "development_specificity": threshold_report["development_crossfit_metrics"]["specificity"],
            "test_roc_auc_descriptive_only": metadata["heldout_metrics"]["roc_auc"],
            "test_pr_auc_descriptive_only": metadata["heldout_metrics"]["pr_auc"],
            "test_brier_descriptive_only": metadata["heldout_metrics"]["brier_score"],
            "test_sensitivity_descriptive_only": metadata["heldout_metrics"]["sensitivity"],
            "test_specificity_descriptive_only": metadata["heldout_metrics"]["specificity"],
            "test_coverage": metadata["heldout_metrics"]["prediction_coverage"],
            "selection_scope": "Development cross-fitted metrics only; held-out metrics are reported after selection and are descriptive, never used to select the group.",
        })

    table = pd.DataFrame(group_profiles).sort_values("feature_count")
    ablation_path = ARTIFACT_ROOT / "ablation" / "feature_ablation_comparison.csv"
    ablation_path.parent.mkdir(parents=True, exist_ok=True)
    table.to_csv(ablation_path, index=False)

    # Deployment eligibility excludes C because its UCI BP/hemoglobin field
    # semantics cannot currently be mapped safely to the canonical app fields.
    eligible = [row for row in group_profiles if row["feature_group"] in {"A_minimal", "B_core_renal"}]
    best_auc = max(row["development_roc_auc"] for row in eligible)
    comparable = [
        row for row in eligible
        if best_auc - row["development_roc_auc"] <= 0.02
        and row["development_brier"] <= min(item["development_brier"] for item in eligible) + 0.02
        and row["development_sensitivity"] >= 0.80
    ]
    if comparable:
        selected = min(comparable, key=lambda row: (row["feature_count"], row["development_brier"], -row["development_specificity"]))
        selection_reason = "Selected the smallest production-mappable feature set within 0.02 development ROC-AUC and Brier of the eligible best, with development cross-fit sensitivity >= 0.80. Held-out metrics were not used."
    else:
        selected = max(eligible, key=lambda row: (row["development_roc_auc"], -row["development_brier"], row["development_sensitivity"]))
        selection_reason = "No eligible feature set met the predeclared comparable-performance rule; selected on development-only ROC-AUC/Brier/sensitivity. Held-out metrics were not used."

    selected_run = ARTIFACT_ROOT / "ablation" / selected["feature_group"]
    shutil.copytree(selected_run, final_dir)
    final_metadata_path = final_dir / "model_metadata.json"
    final_metadata = json.loads(final_metadata_path.read_text(encoding="utf-8"))
    final_metadata["selected_feature_group"] = selected["feature_group"]
    final_metadata["feature_ablation_selection_reason"] = selection_reason
    final_metadata["ablation_report"] = "../ablation/feature_ablation_comparison.csv"
    final_metadata["heldout_ablation_metrics_used_for_selection"] = False
    write_json(final_metadata_path, final_metadata)
    backend_schema_path = ROOT / "backend" / "src" / "config" / "researchModelSchemas.json"
    backend_schema_path.parent.mkdir(parents=True, exist_ok=True)
    backend_schemas = {
        "chronic_kidney_disease": {
            "model_version": final_metadata["version"],
            "schema_version": final_metadata["feature_schema_version"],
            "ordered_features": final_metadata["ordered_features"],
        }
    }
    hypertension_schema_path = ROOT / "ml_model" / "artifacts" / "hypertension" / "v1" / "feature_schema.json"
    if hypertension_schema_path.exists():
        hypertension_metadata_path = hypertension_schema_path.parent / "model_metadata.json"
        hypertension_schema = json.loads(hypertension_schema_path.read_text(encoding="utf-8"))
        hypertension_metadata = json.loads(hypertension_metadata_path.read_text(encoding="utf-8"))
        backend_schemas["hypertension"] = {
            "model_version": hypertension_metadata["version"],
            "schema_version": hypertension_schema["schema_version"],
            "ordered_features": hypertension_schema["ordered_features"],
        }
    write_json(backend_schema_path, backend_schemas)
    (ARTIFACT_ROOT / "ablation" / "FEATURE_ABLATION_REPORT.md").write_text(
        "# CKD Feature Ablation\n\n"
        "A, B, and C were trained on the same records, random-state-42 development/test partition, candidate protocol, calibration protocol, and threshold rule. The three held-out columns are reported as descriptive audit results only. The selected production group uses development evidence only.\n\n"
        f"Selected group: **{selected['feature_group']}**. {selection_reason}\n\n"
        "Group C remains research-only because the authoritative UCI field descriptions do not establish a safe mapping for its blood-pressure semantics or hemoglobin unit to the application's canonical data fields.\n\n"
        "The UCI CKD sample is small and single-source; no clinical validation is established.\n",
        encoding="utf-8",
    )
    print(json.dumps({"rows": len(base_features), "source_classes_normalized": audit["source_class_counts_normalized"], "selected_group": selected["feature_group"], "selection_reason": selection_reason, "ablation_csv": str(ablation_path), "final_model": str(final_dir)}, indent=2))


if __name__ == "__main__":
    main()
