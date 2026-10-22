"""Audited, leakage-resistant dataset construction for the two research models."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

HYPERTENSION_FEATURES = [
    "age", "sex", "bmi", "fasting_glucose", "total_cholesterol", "hdl",
    "serum_creatinine", "heart_rate", "current_smoker",
]
HYPERTENSION_EXCLUDED = [
    "BPQ020", "BPQ040A", "BPQ050A", "BPXSY1", "BPXDI1", "BPXSY2",
    "BPXDI2", "BPXSY3", "BPXDI3", "BPXSY4", "BPXDI4", "BPXPLS is allowed only as heart_rate",
    "all measured systolic/diastolic BP and BP-derived features",
]
CKD_GROUPS = {
    "A_minimal": ["age", "serum_creatinine"],
    "B_core_renal": ["age", "serum_creatinine", "blood_urea"],
    "C_expanded": ["age", "serum_creatinine", "blood_urea", "blood_pressure", "blood_glucose", "hemoglobin"],
}
CKD_FEATURE_MAP = {
    "age": "age",
    "bp": "blood_pressure",
    "bgr": "blood_glucose",
    "bu": "blood_urea",
    "sc": "serum_creatinine",
    "hemo": "hemoglobin",
}
CKD_EXCLUDED = [
    "egfr/derived filtration", "urine albumin/protein/specific gravity/sugar/microscopy",
    "appetite", "pedal edema", "anemia categorical flag", "CAD categorical flag",
    "hypertension categorical flag", "diabetes categorical flag", "all other non-approved fields",
]


def _missing(value: Any) -> bool:
    try:
        return bool(pd.isna(value))
    except (TypeError, ValueError):
        return False


def _code(value: Any) -> int | None:
    if _missing(value):
        return None
    try:
        num = float(value)
    except (TypeError, ValueError):
        return -999
    if not np.isfinite(num) or not num.is_integer():
        return -999
    return int(num)


def construct_hypertension_label(row: Any) -> tuple[int | None, str]:
    """Return (label, reason); None means excluded rather than negative.

    NHANES 2017-18 BPQ020=2 skips BPQ040A/BPQ050A directly to BPQ080.
    That documented structural skip supports a negative label only when the
    skipped medication items are actually blank. Unknown/refused diagnoses
    remain unresolved unless BPQ050A independently records current medication.
    """
    diagnosis = _code(row.get("BPQ020"))
    advised_med = _code(row.get("BPQ040A"))
    current_med = _code(row.get("BPQ050A"))

    if diagnosis == 2:
        if advised_med is not None or current_med is not None:
            return None, "contradictory_values_after_documented_skip"
        return 0, "documented_no_diagnosis_structural_skip"
    if current_med == 1:
        return 1, "current_hypertension_medication"
    if diagnosis == 1:
        return 1, "reported_diagnosis"
    if diagnosis == 7:
        return None, "diagnosis_refused"
    if diagnosis == 9:
        return None, "diagnosis_dont_know"
    if diagnosis is None:
        return None, "diagnosis_missing"
    return None, "invalid_diagnosis_code"


def _read_xpt(directory: Path, filename: str, columns: list[str] | None = None) -> pd.DataFrame:
    path = directory / filename
    if not path.exists():
        raise FileNotFoundError(f"Missing official NHANES component: {path}")
    frame = pd.read_sas(path, format="xport")
    if columns:
        absent = set(columns) - set(frame.columns)
        if absent:
            raise ValueError(f"{filename} is missing expected documented columns: {sorted(absent)}")
        frame = frame[columns].copy()
    if "SEQN" not in frame.columns:
        raise ValueError(f"{filename} does not contain participant key SEQN")
    if frame["SEQN"].duplicated().any():
        duplicates = int(frame["SEQN"].duplicated().sum())
        raise ValueError(f"{filename} contains {duplicates} duplicate SEQN records")
    return frame


def build_hypertension_dataset(directory: str | Path) -> tuple[pd.DataFrame, pd.Series, dict[str, Any]]:
    directory = Path(directory)
    demo = _read_xpt(directory, "DEMO_J.XPT", ["SEQN", "RIAGENDR", "RIDAGEYR", "WTMEC2YR", "SDMVSTRA", "SDMVPSU"])
    bpq = _read_xpt(directory, "BPQ_J.XPT", ["SEQN", "BPQ020", "BPQ040A", "BPQ050A"])
    frame = bpq.merge(demo, on="SEQN", how="inner", validate="one_to_one")
    if len(frame) != len(bpq):
        raise ValueError("BPQ-to-DEMO participant join lost records")
    source_rows = {"BPQ_J": int(len(bpq)), "DEMO_J": int(len(demo)), "BPQ_DEMO_join": int(len(frame))}

    components: list[tuple[str, str, list[str]]] = [
        ("BMX_J.XPT", "BMX_J", ["SEQN", "BMXBMI"]),
        ("GLU_J.XPT", "GLU_J", ["SEQN", "WTSAF2YR", "LBXGLU"]),
        ("TCHOL_J.XPT", "TCHOL_J", ["SEQN", "LBXTC"]),
        ("HDL_J.XPT", "HDL_J", ["SEQN", "LBDHDD"]),
        ("BIOPRO_J.XPT", "BIOPRO_J", ["SEQN", "LBXSCR"]),
        ("BPX_J.XPT", "BPX_J", ["SEQN", "BPXPLS"]),
        ("SMQ_J.XPT", "SMQ_J", ["SEQN", "SMQ020", "SMQ040"]),
    ]
    for filename, label, columns in components:
        part = _read_xpt(directory, filename, columns)
        source_rows[label] = int(len(part))
        frame = frame.merge(part, on="SEQN", how="left", validate="one_to_one")

    target_rows = frame.apply(construct_hypertension_label, axis=1, result_type="expand")
    frame["target"] = target_rows[0]
    frame["target_reason"] = target_rows[1]
    excluded: dict[str, int] = {}
    excluded_rows = frame[frame["target"].isna()]
    for reason, count in excluded_rows["target_reason"].value_counts().items():
        excluded[str(reason)] = int(count)

    labeled = frame[frame["target"].notna()].copy()
    age_valid = labeled["RIDAGEYR"].between(16, 130, inclusive="both")
    sex_valid = labeled["RIAGENDR"].isin([1, 2])
    for reason, mask in (("invalid_or_missing_age", ~age_valid), ("invalid_or_missing_sex", age_valid & ~sex_valid)):
        excluded[reason] = int(mask.sum())
    labeled = labeled[age_valid & sex_valid].copy()

    # NHANES codes: RIAGENDR=1 male, 2 female. BPXPLS is pulse rate only;
    # no measured systolic/diastolic variable is merged into the feature table.
    age = pd.to_numeric(labeled["RIDAGEYR"], errors="coerce")
    sex = labeled["RIAGENDR"].map({1.0: 1.0, 2.0: 0.0})
    smq020 = pd.to_numeric(labeled["SMQ020"], errors="coerce")
    smq040 = pd.to_numeric(labeled["SMQ040"], errors="coerce")
    smoker = pd.Series(np.nan, index=labeled.index, dtype=float)
    smoker.loc[smq020.eq(2)] = 0.0
    smoker.loc[smq020.eq(1) & smq040.eq(3)] = 0.0
    smoker.loc[smq020.eq(1) & smq040.isin([1, 2])] = 1.0

    features = pd.DataFrame({
        "age": age,
        "sex": sex,
        "bmi": pd.to_numeric(labeled["BMXBMI"], errors="coerce"),
        "fasting_glucose": pd.to_numeric(labeled["LBXGLU"], errors="coerce"),
        "total_cholesterol": pd.to_numeric(labeled["LBXTC"], errors="coerce"),
        "hdl": pd.to_numeric(labeled["LBDHDD"], errors="coerce"),
        "serum_creatinine": pd.to_numeric(labeled["LBXSCR"], errors="coerce"),
        "heart_rate": pd.to_numeric(labeled["BPXPLS"], errors="coerce"),
        "current_smoker": smoker,
    }, index=labeled.index)[HYPERTENSION_FEATURES]
    y = labeled["target"].astype(int)

    # The BPX component has been independently inspected but is not merged with
    # predictors except BPXPLS. Any systolic/diastolic/derived BP name is banned.
    prohibited = {"systolic_bp", "diastolic_bp", "mean_arterial_pressure", "bp_category", "BPXSY1", "BPXDI1", "BPXDI2", "BPXSY2"}
    if prohibited.intersection(features.columns):
        raise AssertionError("Hypertension leakage audit failed: BP predictor present")

    audit = {
        "source_row_counts": source_rows,
        "BPQ_participants": int(len(bpq)),
        "BPQ_DEMO_joined_participants": int(len(frame)),
        "label_counts_before_required_feature_filter": {
            "positive": int((frame["target"] == 1).sum()),
            "negative": int((frame["target"] == 0).sum()),
        },
        "excluded_by_reason": excluded,
        "final_rows": int(len(features)),
        "positive": int(y.sum()),
        "negative": int((y == 0).sum()),
        "prevalence": float(y.mean()) if len(y) else None,
        "feature_nonmissing_coverage": {name: float(features[name].notna().mean()) for name in features},
        "feature_rows": features.index.astype(int).tolist(),
        "sequences": labeled["SEQN"].astype(int).tolist(),
        "survey_weights_available": {
            "MEC_exam_weight": "WTMEC2YR",
            "fasting_subsample_weight": "WTSAF2YR",
            "strata": "SDMVSTRA",
            "PSU": "SDMVPSU",
            "weighting_used_for_model_fit": False,
            "reason": "The primary task uses an unweighted development classifier; results are not presented as population prevalence estimates. Fasting glucose is a subsample variable and remains optional; NHANES design weights/variance are required for population inference.",
        },
        "bp_predictor_leakage_audit": "PASS: only pulse rate BPXPLS is selected; systolic/diastolic and target/treatment fields are excluded from model features.",
    }
    return features.reset_index(drop=True), y.reset_index(drop=True), audit


def normalize_ckd_target(value: Any) -> int:
    if _missing(value):
        raise ValueError("CKD target is missing")
    label = str(value).strip().lower().rstrip(".")
    if label == "ckd":
        return 1
    if label == "notckd":
        return 0
    raise ValueError(f"Unrecognized CKD target label: {value!r}")


def build_ckd_dataset(csv_path: str | Path) -> tuple[pd.DataFrame, pd.Series, dict[str, Any]]:
    frame = pd.read_csv(csv_path, skipinitialspace=True)
    frame.columns = [str(c).strip().lower() for c in frame.columns]
    required_columns = {"age", "bp", "bgr", "bu", "sc", "hemo", "class"}
    if not required_columns.issubset(frame.columns):
        raise ValueError(f"UCI CKD file lacks expected fields: {sorted(required_columns - set(frame.columns))}")
    labels, invalid_targets = [], []
    for index, value in frame["class"].items():
        try:
            labels.append(normalize_ckd_target(value))
            invalid_targets.append(False)
        except ValueError:
            labels.append(None)
            invalid_targets.append(True)
    if any(invalid_targets):
        counts = frame.loc[invalid_targets, "class"].astype(str).value_counts(dropna=False).to_dict()
        raise ValueError(f"UCI CKD file contains unknown target values and must be audited before training: {counts}")

    values = {}
    for raw, canonical in CKD_FEATURE_MAP.items():
        # Treat '?' and whitespace as missing; preserve all positive extreme values.
        values[canonical] = pd.to_numeric(frame[raw].astype(str).str.strip().replace({"?": np.nan, "": np.nan, "nan": np.nan, "None": np.nan}), errors="coerce")
    features = pd.DataFrame(values)
    target = pd.Series(labels, name="target", dtype=int)
    source_target_counts = {"ckd_positive": int((target == 1).sum()), "notckd_negative": int((target == 0).sum())}

    invalid: dict[str, int] = {}
    for name in CKD_FEATURE_MAP.values():
        bad = features[name].notna() & ~np.isfinite(features[name])
        invalid[f"{name}_nonfinite"] = int(bad.sum())
        features.loc[bad, name] = np.nan
        if name != "age":
            impossible = features[name].notna() & (features[name] <= 0)
            invalid[f"{name}_nonpositive"] = int(impossible.sum())
            features.loc[impossible, name] = np.nan
    invalid_age = features["age"].notna() & ~features["age"].between(0, 130)
    invalid["age_out_of_range"] = int(invalid_age.sum())
    features.loc[invalid_age, "age"] = np.nan

    required_valid = features["age"].notna() & features["serum_creatinine"].notna()
    excluded_required = int((~required_valid).sum())
    features = features.loc[required_valid].reset_index(drop=True)
    target = target.loc[required_valid].reset_index(drop=True)
    audit = {
        "source_rows": int(len(frame)),
        "source_class_counts_normalized": source_target_counts,
        "final_training_class_counts_after_required_field_filter": {"ckd_positive": int((target == 1).sum()), "notckd_negative": int((target == 0).sum())},
        "excluded_missing_required_age_or_creatinine": excluded_required,
        "final_rows": int(len(features)),
        "positive": int(target.sum()),
        "negative": int((target == 0).sum()),
        "prevalence": float(target.mean()) if len(target) else None,
        "feature_nonmissing_coverage": {name: float(features[name].notna().mean()) for name in features},
        "invalid_values_marked_missing": invalid,
        "duplicate_full_feature_rows": int(features.duplicated().sum()),
        "feature_groups": CKD_GROUPS,
        "approved_features_only": True,
        "excluded_features": CKD_EXCLUDED,
        "target_rule": "Trim whitespace/case; ckd=1, notckd=0; all other values rejected.",
    }
    return features, target, audit
