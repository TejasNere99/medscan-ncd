"""Offline integrity and deterministic smoke checks for versioned research models."""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS = {
    "hypertension": ROOT / "ml_model" / "artifacts" / "hypertension" / "v1",
    "chronic_kidney_disease": ROOT / "ml_model" / "artifacts" / "kidney_disease" / "v1",
}


def verify(name: str, directory: Path) -> dict:
    required_files = ("model.joblib", "feature_schema.json", "model_metadata.json", "heldout_metrics.json", "threshold_selection_report.json")
    missing = [filename for filename in required_files if not (directory / filename).is_file()]
    if missing:
        raise FileNotFoundError(f"{name} missing artifacts: {missing}")
    schema = json.loads((directory / "feature_schema.json").read_text(encoding="utf-8"))
    metadata = json.loads((directory / "model_metadata.json").read_text(encoding="utf-8"))
    model = joblib.load(directory / "model.joblib")
    features = schema["ordered_features"]
    if metadata["ordered_features"] != features:
        raise AssertionError(f"{name} model metadata feature order differs from its schema")
    if metadata["model_id"] != ("hypertension_diagnosed_treated" if name == "hypertension" else "chronic_kidney_disease"):
        raise AssertionError(f"{name} disease identifier mismatch")
    if metadata.get("calibration_ensemble") is not True or not getattr(model, "calibrated_classifiers_", None):
        raise AssertionError(f"{name} calibrated estimator is not present")
    if list(model.feature_names_in_) != features:
        raise AssertionError(f"{name} fitted estimator order differs from schema")
    row = {}
    for feature in features:
        if feature == "age":
            row[feature] = 45.0
        elif feature == "sex":
            row[feature] = 1.0
        elif feature == "serum_creatinine":
            row[feature] = 1.2
        elif feature == "current_smoker":
            row[feature] = 0.0
        else:
            row[feature] = np.nan
    frame = pd.DataFrame([row], columns=features)
    first = float(model.predict_proba(frame)[0, 1])
    second = float(model.predict_proba(frame)[0, 1])
    if not np.isfinite(first) or not 0 <= first <= 1 or first != second:
        raise AssertionError(f"{name} inference is invalid or nondeterministic")
    threshold = float(metadata["development_threshold"])
    if not 0 <= threshold <= 1:
        raise AssertionError(f"{name} threshold outside [0, 1]")
    return {
        "disease": name,
        "model_id": metadata["model_id"],
        "feature_schema_version": schema["schema_version"],
        "ordered_features": features,
        "calibrated": True,
        "threshold": threshold,
        "smoke_probability": first,
        "deterministic": True,
        "not_clinically_validated": metadata["not_clinically_validated"],
    }


def main() -> None:
    results = [verify(name, path) for name, path in ARTIFACTS.items()]
    print(json.dumps({"status": "PASS", "models": results}, indent=2))


if __name__ == "__main__":
    main()
