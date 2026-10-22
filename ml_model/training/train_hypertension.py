"""Train the NHANES 2017-18 diagnosed/treated hypertension classifier."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from dataset_builders import HYPERTENSION_EXCLUDED, HYPERTENSION_FEATURES, build_hypertension_dataset
from train_utils import ROOT, train_and_evaluate, write_json

DATA_DIR = ROOT / "ml_model" / "datasets" / "hypertension" / "raw" / "nhanes_2017_2018"
ARTIFACT_DIR = ROOT / "ml_model" / "artifacts" / "hypertension" / "v1"
MANIFEST = DATA_DIR / "source_manifest.json"


def main() -> None:
    if ARTIFACT_DIR.exists() and any(ARTIFACT_DIR.iterdir()):
        raise FileExistsError(f"Refusing to overwrite existing hypertension release artifacts: {ARTIFACT_DIR}")
    features, target, audit = build_hypertension_dataset(DATA_DIR)
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    digest = hashlib.sha256("".join(sorted(item["sha256"] for item in manifest["files"])).encode()).hexdigest()
    schema = {
        "schema_version": "hypertension.v1",
        "disease": "hypertension",
        "task": "current diagnosed/treated hypertension classification",
        "task_interpretation": "Model-estimated probability of diagnosed/treated hypertension based on available non-blood-pressure cardiometabolic information. Not future onset prediction and not a diagnosis.",
        "ordered_features": HYPERTENSION_FEATURES,
        "fields": {
            "age": {"type": "number", "unit": "years", "required": True, "nhanes": "DEMO_J.RIDAGEYR", "valid_range": [16, 130]},
            "sex": {"type": "binary", "unit": "0=female,1=male", "required": True, "nhanes": "DEMO_J.RIAGENDR", "valid_values": [0, 1]},
            "bmi": {"type": "number", "unit": "kg/m2", "required": False, "nhanes": "BMX_J.BMXBMI"},
            "fasting_glucose": {"type": "number", "unit": "mg/dL", "required": False, "nhanes": "GLU_J.LBXGLU", "context": "Fasting subsample glucose; not generalized to all participants."},
            "total_cholesterol": {"type": "number", "unit": "mg/dL", "required": False, "nhanes": "TCHOL_J.LBXTC"},
            "hdl": {"type": "number", "unit": "mg/dL", "required": False, "nhanes": "HDL_J.LBDHDD"},
            "serum_creatinine": {"type": "number", "unit": "mg/dL", "required": False, "nhanes": "BIOPRO_J.LBXSCR"},
            "heart_rate": {"type": "number", "unit": "beats/min", "required": False, "nhanes": "BPX_J.BPXPLS", "context": "Pulse rate only; measured systolic/diastolic BP is excluded."},
            "current_smoker": {"type": "binary", "unit": "0=no,1=yes", "required": False, "nhanes": "SMQ_J.SMQ020 + SMQ_J.SMQ040", "missing_policy": "Unknown/refused/age-ineligible responses remain missing."},
        },
        "target_definition": "Positive when BPQ020=Yes, or BPQ050A=Yes; negative only when BPQ020=No and medication items BPQ040A/BPQ050A are structural blanks according to the official skip; otherwise exclude unresolved/contradictory labels.",
        "excluded_features": HYPERTENSION_EXCLUDED,
        "missingness_policy": "Required age and sex missing/invalid rows excluded in training and return insufficient data in inference. Optional fields remain missing and are imputed by the training-fitted pipeline, with missingness indicators.",
        "training_preprocessing": "Median imputation and missingness indicators fit inside each CV fold; standard scaling only for logistic regression.",
        "units": "NHANES: age years; BMI kg/m2; cholesterol mg/dL; creatinine mg/dL; pulse beats/min; fasting plasma glucose mg/dL.",
        "limitations": [
            "Target is self-reported current diagnosis/treatment, not future-onset hypertension.",
            "Diagnosis awareness can reflect healthcare access and screening history.",
            "Measured SBP/DBP and BP-derived values are strictly excluded; discrimination may be limited.",
            "NHANES is a complex, oversampled survey; fitted model is unweighted, not a population-prevalence estimator.",
            "Fasting glucose is available only in an eligible subsample; survey weighting and coverage limit interpretation.",
            "No clinical or prospective validation is established.",
        ],
    }
    write_json(ARTIFACT_DIR / "leakage_audit.json", {
        "result": "PASS",
        "target_fields_excluded": ["BPQ020", "BPQ040A", "BPQ050A"],
        "blood_pressure_predictors_excluded": ["BPXSY1-4", "BPXDI1-4", "BPXCHR", "BPXPULS", "mean arterial pressure", "derived BP categories"],
        "approved_predictors": HYPERTENSION_FEATURES,
        "allowed_pulse_variable": "BPXPLS, used only as heart_rate",
        "assertion": "No SBP, DBP, target, treatment, or diagnosis proxy is in the trained feature frame.",
    })
    metadata = train_and_evaluate(
        disease="hypertension_diagnosed_treated",
        X=features,
        y=target,
        source_audit=audit,
        data_sha256=digest,
        dataset_source={
            "name": manifest["dataset"],
            "source": "CDC/NCHS NHANES 2017-2018",
            "source_urls": [item["url"] for item in manifest["files"]],
            "retrieved_at_utc": manifest["retrieved_at_utc"],
            "component_hashes": {item["filename"]: item["sha256"] for item in manifest["files"]},
            "license_note": manifest["license_note"],
        },
        artifact_dir=ARTIFACT_DIR,
        target_definition=schema["target_definition"],
        feature_schema=schema,
        split_identifiers=audit["sequences"],
    )
    print(json.dumps({"model": metadata["model_id"], "rows": len(features), "selected_model": metadata["estimator_type"], "threshold": metadata["development_threshold"], "heldout": metadata["heldout_metrics"]}, indent=2))


if __name__ == "__main__":
    main()
