"""Save a small development-only background sample for local model explanations."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
from sklearn.model_selection import train_test_split

from dataset_builders import build_ckd_dataset, build_hypertension_dataset
from train_utils import ROOT, SEED


def main() -> None:
    releases = {
        "hypertension": (ROOT / "ml_model" / "artifacts" / "hypertension" / "v1", ROOT / "ml_model" / "datasets" / "hypertension" / "raw" / "nhanes_2017_2018"),
        "chronic_kidney_disease": (ROOT / "ml_model" / "artifacts" / "kidney_disease" / "v1", ROOT / "ml_model" / "datasets" / "ckd" / "raw" / "uci_chronic_kidney_disease.csv"),
    }
    for disease, (artifact_dir, data_source) in releases.items():
        destination = artifact_dir / "explainability_background.csv"
        if destination.exists():
            continue
        schema = json.loads((artifact_dir / "feature_schema.json").read_text(encoding="utf-8"))
        if disease == "hypertension":
            features, target, _ = build_hypertension_dataset(data_source)
        else:
            features, target, _ = build_ckd_dataset(data_source)
            features = features[schema["ordered_features"]]
        X_dev, _, _, _ = train_test_split(
            features, target, test_size=0.2, random_state=SEED, stratify=target,
        )
        X_dev.sample(n=min(10, len(X_dev)), random_state=SEED).to_csv(destination, index=False, na_rep="")
        print(f"Wrote development-only {disease} explanation background: {destination}")


if __name__ == "__main__":
    main()
