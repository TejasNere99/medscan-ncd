"""Shared leakage-aware tabular training/evaluation routines."""

from __future__ import annotations

import copy
import json
import platform
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import sklearn
from scipy.special import expit, logit
from sklearn.base import clone
from sklearn.calibration import CalibratedClassifierCV
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, average_precision_score, brier_score_loss, confusion_matrix,
    f1_score, precision_score, roc_auc_score, recall_score,
)
from sklearn.model_selection import GridSearchCV, StratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

SEED = 42
OUTER_FOLDS = 5
ROOT = Path(__file__).resolve().parents[2]


def json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(k): json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_safe(v) for v in value]
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return None if not np.isfinite(value) else float(value)
    if isinstance(value, np.ndarray):
        return json_safe(value.tolist())
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, (pd.Timestamp,)):
        return value.isoformat()
    return value


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(json_safe(value), indent=2, allow_nan=False) + "\n", encoding="utf-8")


def _pipeline(estimator: Any, scale: bool = False) -> Pipeline:
    steps: list[tuple[str, Any]] = [
        ("imputer", SimpleImputer(strategy="median", add_indicator=True, keep_empty_features=True)),
    ]
    if scale:
        steps.append(("scaler", StandardScaler()))
    steps.append(("classifier", estimator))
    return Pipeline(steps)


def candidate_grids() -> dict[str, tuple[Pipeline, dict[str, list[Any]]]]:
    candidates = {
        "logistic_regression": (
            _pipeline(LogisticRegression(class_weight="balanced", solver="liblinear", max_iter=2000, random_state=SEED), True),
            {"classifier__C": [0.1, 1.0, 10.0]},
        ),
        "random_forest": (
            _pipeline(RandomForestClassifier(n_estimators=250, class_weight="balanced_subsample", random_state=SEED, n_jobs=1)),
            {"classifier__max_depth": [3, None], "classifier__min_samples_leaf": [2, 5]},
        ),
        "hist_gradient_boosting": (
            _pipeline(HistGradientBoostingClassifier(random_state=SEED, early_stopping=False)),
            {"classifier__learning_rate": [0.03, 0.1], "classifier__max_leaf_nodes": [7, 15], "classifier__l2_regularization": [0.0, 1.0]},
        ),
        "decision_tree": (
            _pipeline(DecisionTreeClassifier(class_weight="balanced", random_state=SEED)),
            {"classifier__max_depth": [2, 3, 4], "classifier__min_samples_leaf": [5, 10]},
        ),
    }
    try:
        from lightgbm import LGBMClassifier
        candidates["lightgbm"] = (
            _pipeline(LGBMClassifier(class_weight="balanced", verbosity=-1, random_state=SEED, n_jobs=1)),
            {"classifier__n_estimators": [100, 250], "classifier__num_leaves": [7, 15], "classifier__max_depth": [3, -1]},
        )
    except ImportError:
        pass
    return candidates


def _safe_scores(y: np.ndarray, probabilities: np.ndarray) -> dict[str, float]:
    if len(np.unique(y)) < 2:
        return {"roc_auc": float("nan"), "pr_auc": float("nan"), "brier": float("nan")}
    return {
        "roc_auc": float(roc_auc_score(y, probabilities)),
        "pr_auc": float(average_precision_score(y, probabilities)),
        "brier": float(brier_score_loss(y, probabilities)),
    }


def compare_candidates(X: pd.DataFrame, y: pd.Series, out_dir: Path) -> tuple[str, Any, pd.DataFrame]:
    counts = y.value_counts()
    n_splits = min(5, int(counts.min()))
    if n_splits < 2:
        raise ValueError("Not enough examples in the minority class for stratified validation")
    cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=SEED)
    rows = []
    best_name, best_score, best_search = None, -np.inf, None
    for name, (pipeline, grid) in candidate_grids().items():
        search = GridSearchCV(
            pipeline, grid, scoring={"roc_auc": "roc_auc", "pr_auc": "average_precision", "brier": "neg_brier_score"},
            refit="roc_auc", cv=cv, n_jobs=-1, return_train_score=True, error_score="raise",
        )
        started = time.perf_counter()
        search.fit(X, y)
        elapsed = time.perf_counter() - started
        for i, params in enumerate(search.cv_results_["params"]):
            rows.append({
                "model": name,
                "rank_roc_auc": int(search.cv_results_["rank_test_roc_auc"][i]),
                "mean_cv_roc_auc": float(search.cv_results_["mean_test_roc_auc"][i]),
                "std_cv_roc_auc": float(search.cv_results_["std_test_roc_auc"][i]),
                "mean_cv_pr_auc": float(search.cv_results_["mean_test_pr_auc"][i]),
                "mean_cv_brier": float(-search.cv_results_["mean_test_brier"][i]),
                "mean_train_roc_auc": float(search.cv_results_["mean_train_roc_auc"][i]),
                "parameters": json.dumps(params, default=str, sort_keys=True),
                "search_elapsed_seconds": elapsed,
            })
        if float(search.best_score_) > best_score:
            best_name, best_score, best_search = name, float(search.best_score_), search

    result = pd.DataFrame(rows).sort_values(["rank_roc_auc", "mean_cv_pr_auc"], ascending=[True, False])
    out_dir.mkdir(parents=True, exist_ok=True)
    result.to_csv(out_dir / "model_comparison.csv", index=False)
    return str(best_name), best_search.best_estimator_, result


def nested_calibration_oof(
    name: str, estimator: Any, X: pd.DataFrame, y: pd.Series, out_dir: Path,
) -> tuple[str, float, float, np.ndarray, dict[str, Any]]:
    """Out-of-fold development probabilities for calibration choice/threshold.

    Each outer validation fold is excluded from estimator and calibrator fitting.
    Hyperparameters were selected by development-only CV; this conditional OOF
    step estimates threshold/calibration behavior without using the held-out test.
    """
    min_class = int(y.value_counts().min())
    outer_count = min(5, min_class)
    if outer_count < 2:
        raise ValueError("Insufficient class counts for calibration cross-fitting")
    outer = StratifiedKFold(n_splits=outer_count, shuffle=True, random_state=SEED + 17)
    raw = np.full(len(y), np.nan)
    calibrated = {"sigmoid": np.full(len(y), np.nan), "isotonic": np.full(len(y), np.nan)}
    for train_idx, valid_idx in outer.split(X, y):
        X_train, X_valid = X.iloc[train_idx], X.iloc[valid_idx]
        y_train = y.iloc[train_idx]
        fold_model = clone(estimator).fit(X_train, y_train)
        raw[valid_idx] = fold_model.predict_proba(X_valid)[:, 1]
        for method in calibrated:
            cv_inner = min(5, int(y_train.value_counts().min()))
            if cv_inner < 2:
                raise ValueError("Insufficient inner-fold class count for calibrator")
            calibrator = CalibratedClassifierCV(
                estimator=clone(estimator), method=method,
                cv=StratifiedKFold(n_splits=cv_inner, shuffle=True, random_state=SEED + 29),
                ensemble=True,
            )
            calibrator.fit(X_train, y_train)
            calibrated[method][valid_idx] = calibrator.predict_proba(X_valid)[:, 1]

    scores = {"uncalibrated": _safe_scores(y.to_numpy(), raw)}
    scores.update({method: _safe_scores(y.to_numpy(), probs) for method, probs in calibrated.items()})
    selected = min(("sigmoid", "isotonic"), key=lambda method: (scores[method]["brier"], method))
    if not np.isfinite(scores[selected]["brier"]):
        raise ValueError("Calibration validation did not produce finite Brier scores")
    write_json(out_dir / "calibration_development_cv.json", {
        "method_selection": "Lowest Brier score on cross-fitted development predictions; sigmoid/isotonic are compared. No held-out test observations used.",
        "selected_method": selected,
        "cross_fitted_scores": scores,
        "folds": outer_count,
        "selected_model_family": name,
        "note": "Calibration/threshold CV is conditional on model family selected by the full development CV comparison; model-selection uncertainty can make these estimates optimistic. Held-out test remains untouched.",
    })
    return selected, float(scores[selected]["brier"]), float(scores["uncalibrated"]["brier"]), raw, calibrated


def select_threshold(y: pd.Series | np.ndarray, probabilities: np.ndarray, target_sensitivity: float = 0.80) -> tuple[float, dict[str, Any]]:
    y_array = np.asarray(y, dtype=int)
    unique = np.unique(np.asarray(probabilities, dtype=float))
    if len(unique) == 0 or not np.isfinite(unique).all():
        raise ValueError("Cannot select a threshold from empty or invalid probabilities")
    candidates = np.r_[0.0, unique, np.nextafter(float(unique.max()), np.inf)]
    feasible = []
    for threshold in candidates:
        predicted = probabilities >= float(threshold)
        tp = int(np.sum((y_array == 1) & predicted))
        fn = int(np.sum((y_array == 1) & ~predicted))
        tn = int(np.sum((y_array == 0) & ~predicted))
        fp = int(np.sum((y_array == 0) & predicted))
        sensitivity = tp / (tp + fn) if tp + fn else 0.0
        specificity = tn / (tn + fp) if tn + fp else 0.0
        precision = tp / (tp + fp) if tp + fp else 0.0
        if sensitivity >= target_sensitivity:
            feasible.append((float(threshold), sensitivity, specificity, precision))
    if not feasible:
        raise ValueError(f"No development threshold reached sensitivity target {target_sensitivity:.2f}")
    threshold, _, _, _ = max(feasible, key=lambda item: (item[2], item[3], item[0]))
    metrics = compute_metrics(y_array, probabilities, threshold, confidence_intervals=False)
    return threshold, {
        "threshold": threshold,
        "criterion": f"Maximum specificity among cross-fitted development thresholds with sensitivity >= {target_sensitivity:.2f}",
        "target_sensitivity_engineering_target": target_sensitivity,
        "development_crossfit_metrics": metrics,
        "threshold_is_not_a_clinical_guideline": True,
    }


def _ece(y: np.ndarray, probabilities: np.ndarray, bins: int = 10) -> float:
    edges = np.linspace(0, 1, bins + 1)
    total = len(y)
    result = 0.0
    for index in range(bins):
        mask = (probabilities >= edges[index]) & (probabilities < edges[index + 1] if index < bins - 1 else probabilities <= edges[index + 1])
        if mask.any():
            result += mask.sum() / total * abs(float(y[mask].mean()) - float(probabilities[mask].mean()))
    return float(result)


def compute_metrics(y: Any, probabilities: Any, threshold: float, confidence_intervals: bool = True) -> dict[str, Any]:
    y = np.asarray(y, dtype=int)
    probabilities = np.asarray(probabilities, dtype=float)
    predicted = probabilities >= float(threshold)
    tn, fp, fn, tp = confusion_matrix(y, predicted, labels=[0, 1]).ravel().tolist()
    result: dict[str, Any] = {
        "n": int(len(y)),
        "positive_count": int(y.sum()),
        "negative_count": int((y == 0).sum()),
        "prediction_coverage": 1.0,
        "roc_auc": float(roc_auc_score(y, probabilities)) if len(np.unique(y)) == 2 else None,
        "pr_auc": float(average_precision_score(y, probabilities)) if len(np.unique(y)) == 2 else None,
        "sensitivity": float(tp / (tp + fn)) if tp + fn else None,
        "specificity": float(tn / (tn + fp)) if tn + fp else None,
        "precision": float(precision_score(y, predicted, zero_division=0)),
        "f1": float(f1_score(y, predicted, zero_division=0)),
        "accuracy": float(accuracy_score(y, predicted)),
        "brier_score": float(brier_score_loss(y, probabilities)),
        "ece_10_bins": _ece(y, probabilities),
        "threshold": float(threshold),
        "confusion_matrix": {"true_negative": int(tn), "false_positive": int(fp), "false_negative": int(fn), "true_positive": int(tp)},
    }
    if confidence_intervals and len(y) >= 20:
        rng = np.random.default_rng(SEED + 101)
        boot = {key: [] for key in ("roc_auc", "pr_auc", "sensitivity", "specificity", "precision", "f1", "accuracy", "brier_score")}
        class_indices = {label: np.flatnonzero(y == label) for label in [0, 1]}
        if all(len(v) for v in class_indices.values()):
            for _ in range(1000):
                idx = np.concatenate([rng.choice(indices, size=len(indices), replace=True) for indices in class_indices.values()])
                sample = compute_metrics(y[idx], probabilities[idx], threshold, confidence_intervals=False)
                for key in boot:
                    if sample[key] is not None:
                        boot[key].append(sample[key])
            result["bootstrap_95pct_ci"] = {
                key: [float(np.percentile(values, 2.5)), float(np.percentile(values, 97.5))] if values else None
                for key, values in boot.items()
            }
            result["bootstrap_method"] = "1,000 class-stratified percentile bootstrap resamples of held-out records"
    return result


def calibration_table(y: Any, probabilities: Any, bins: int = 10) -> list[dict[str, Any]]:
    y = np.asarray(y, dtype=int)
    probabilities = np.asarray(probabilities, dtype=float)
    edges = np.linspace(0, 1, bins + 1)
    rows = []
    for i in range(bins):
        mask = (probabilities >= edges[i]) & (probabilities < edges[i + 1] if i < bins - 1 else probabilities <= edges[i + 1])
        if mask.any():
            rows.append({
                "bin_lower": float(edges[i]), "bin_upper": float(edges[i + 1]),
                "n": int(mask.sum()), "mean_predicted_probability": float(probabilities[mask].mean()),
                "observed_positive_fraction": float(y[mask].mean()),
            })
    return rows


def train_and_evaluate(
    disease: str,
    X: pd.DataFrame,
    y: pd.Series,
    source_audit: dict[str, Any],
    data_sha256: str,
    dataset_source: dict[str, Any],
    artifact_dir: Path,
    target_definition: str,
    feature_schema: dict[str, Any],
    split_identifiers: list[Any] | None = None,
) -> dict[str, Any]:
    if X.columns.duplicated().any() or list(X.columns) != feature_schema["ordered_features"]:
        raise ValueError("Input feature order differs from the approved model feature schema")
    if y.nunique() != 2:
        raise ValueError("Training requires both target classes")
    if X.isin([np.inf, -np.inf]).any().any():
        raise ValueError("Non-finite feature values detected")
    if len(X) != len(y):
        raise ValueError("Features and target row counts differ")

    artifact_dir.mkdir(parents=True, exist_ok=True)
    ids = np.asarray(split_identifiers if split_identifiers is not None else list(range(len(y))))
    if len(ids) != len(y):
        raise ValueError("Split identifiers do not match data rows")
    indices = np.arange(len(y))
    dev_idx, test_idx = train_test_split(indices, test_size=0.20, random_state=SEED, stratify=y)
    X_dev, y_dev = X.iloc[dev_idx].reset_index(drop=True), y.iloc[dev_idx].reset_index(drop=True)
    X_test, y_test = X.iloc[test_idx].reset_index(drop=True), y.iloc[test_idx].reset_index(drop=True)

    write_json(artifact_dir / "dataset_profile.json", {
        "dataset_source": dataset_source,
        "source_sha256": data_sha256,
        "source_audit": source_audit,
        "final_rows": int(len(X)), "positive": int(y.sum()), "negative": int((y == 0).sum()),
        "prevalence": float(y.mean()),
        "missing_values_by_feature": {name: int(X[name].isna().sum()) for name in X.columns},
        "feature_coverage": {name: float(X[name].notna().mean()) for name in X.columns},
    })

    candidate_dir = artifact_dir / "reports"
    selected_name, best_pipeline, comparison = compare_candidates(X_dev, y_dev, candidate_dir)
    selected_cv_row = comparison[comparison.model == selected_name].sort_values("rank_roc_auc").iloc[0]
    calibration_method, calibrated_dev_brier, raw_dev_brier, raw_oof, calibrated_oof = nested_calibration_oof(
        selected_name, best_pipeline, X_dev, y_dev, candidate_dir,
    )
    if calibration_method not in calibrated_oof:
        raise AssertionError("Selected calibration method missing from cross-fit output")
    threshold, threshold_report = select_threshold(y_dev, calibrated_oof[calibration_method], 0.80)
    write_json(candidate_dir / "threshold_selection.json", threshold_report)

    # Fit the selected candidate only on development data. CalibratedClassifierCV
    # creates an ensemble of fold-specific model/calibrator pairs; no test labels
    # or values are seen during preprocessing, calibration, or threshold choice.
    final_model = CalibratedClassifierCV(
        estimator=clone(best_pipeline), method=calibration_method,
        cv=StratifiedKFold(n_splits=min(5, int(y_dev.value_counts().min())), shuffle=True, random_state=SEED + 71),
        ensemble=True,
    )
    final_model.fit(X_dev, y_dev)
    probabilities = final_model.predict_proba(X_test)[:, 1]
    if not np.isfinite(probabilities).all() or ((probabilities < 0) | (probabilities > 1)).any():
        raise AssertionError("Held-out prediction probabilities are invalid")
    test_metrics = compute_metrics(y_test, probabilities, threshold)
    dev_cv_metrics = _safe_scores(y_dev.to_numpy(), calibrated_oof[calibration_method])
    write_json(artifact_dir / "heldout_metrics.json", {
        "split": "untouched, stratified 20% holdout (random_state=42)",
        "metrics": test_metrics,
        "probability_calibration_bins": calibration_table(y_test, probabilities),
        "selected_model": selected_name,
        "calibration_method": calibration_method,
        "threshold_selected_without_test_data": threshold,
    })
    write_json(candidate_dir / "cross_validation_metrics.json", {
        "development_only": True,
        "folds": min(5, int(y_dev.value_counts().min())),
        "selected_model": selected_name,
        "selected_hyperparameters": best_pipeline.get_params().get("classifier", None).get_params() if hasattr(best_pipeline.get_params().get("classifier", None), "get_params") else {},
        "selected_candidate_cv_row": selected_cv_row.to_dict(),
        "selected_calibration_method": calibration_method,
        "cross_fitted_calibration_scores": dev_cv_metrics,
        "raw_oof_brier": raw_dev_brier,
        "calibrated_oof_brier": calibrated_dev_brier,
        "split_counts": {
            "development": {"n": int(len(dev_idx)), "positive": int(y_dev.sum()), "negative": int((y_dev == 0).sum())},
            "heldout": {"n": int(len(test_idx)), "positive": int(y_test.sum()), "negative": int((y_test == 0).sum())},
        },
        "split_identifier_hashes": {
            "development": __import__("hashlib").sha256("\n".join(map(str, ids[dev_idx])).encode()).hexdigest(),
            "heldout": __import__("hashlib").sha256("\n".join(map(str, ids[test_idx])).encode()).hexdigest(),
        },
    })
    (candidate_dir / "calibration_report.json").write_text(
        json.dumps(json_safe({
            "selected_method": calibration_method,
            "selected_development_cv_brier": calibrated_dev_brier,
            "uncalibrated_development_cv_brier": raw_dev_brier,
            "heldout_brier": test_metrics["brier_score"],
            "heldout_calibration_bins": calibration_table(y_test, probabilities),
            "limitations": "Calibration estimates are uncertain for small samples; calibration is statistical and not clinical validation.",
        }), indent=2, allow_nan=False) + "\n", encoding="utf-8")

    model_path = artifact_dir / "model.joblib"
    joblib.dump(final_model, model_path)
    X_dev.sample(n=min(10, len(X_dev)), random_state=SEED).to_csv(
        artifact_dir / "explainability_background.csv", index=False, na_rep="",
    )
    write_json(artifact_dir / "feature_schema.json", feature_schema)
    metadata = {
        "model_id": disease,
        "version": "1.0.0-research",
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
        "dataset": dataset_source,
        "dataset_sha256": data_sha256,
        "target_definition": target_definition,
        "task_interpretation": feature_schema["task_interpretation"],
        "feature_schema_version": feature_schema["schema_version"],
        "ordered_features": list(X.columns),
        "estimator_type": selected_name,
        "selected_hyperparameters": json_safe(best_pipeline.get_params().get("classifier", None).get_params()) if hasattr(best_pipeline.get_params().get("classifier", None), "get_params") else {},
        "calibration_method": calibration_method,
        "calibration_ensemble": True,
        "development_threshold": threshold,
        "threshold_selection_report": "reports/threshold_selection.json",
        "development_metrics": dev_cv_metrics,
        "heldout_metrics": test_metrics,
        "sample_counts": {"source_or_eligible": int(source_audit.get("final_rows", len(X))), "trained": int(len(X)), "development": int(len(dev_idx)), "heldout": int(len(test_idx)), "positive": int(y.sum()), "negative": int((y == 0).sum())},
        "random_seed": SEED,
        "software": {"python": platform.python_version(), "numpy": np.__version__, "pandas": pd.__version__, "scikit_learn": sklearn.__version__},
        "known_limitations": feature_schema["limitations"],
        "not_clinically_validated": True,
    }
    write_json(artifact_dir / "model_metadata.json", metadata)
    write_json(artifact_dir / "threshold_selection_report.json", threshold_report)
    write_json(artifact_dir / "inference_smoke_test.json", {
        "model_loaded": True,
        "feature_count": len(feature_schema["ordered_features"]),
        "feature_order_matches": list(final_model.feature_names_in_) == list(feature_schema["ordered_features"]),
        "test_probability_finite_and_in_range": bool(np.isfinite(probabilities).all() and ((probabilities >= 0) & (probabilities <= 1)).all()),
        "threshold": threshold,
        "calibration_method": calibration_method,
        "explainability": "feature-level global report generated from selected estimator; local explanation added by inference service where supported",
    })

    # Developer-facing global feature weights from calibrated component estimators.
    importance_rows = []
    for calibrated_classifier in getattr(final_model, "calibrated_classifiers_", []):
        fitted = calibrated_classifier.estimator
        imputer = fitted.named_steps["imputer"]
        estimator = fitted.named_steps["classifier"]
        names = list(X.columns) + [f"missing_{X.columns[int(index)]}" for index in imputer.indicator_.features_] if imputer.add_indicator else list(X.columns)
        importance = getattr(estimator, "feature_importances_", None)
        coef = getattr(estimator, "coef_", None)
        if importance is not None:
            values = np.asarray(importance).ravel()
        elif coef is not None:
            values = np.abs(np.asarray(coef)).ravel()
        else:
            values = np.zeros(len(names))
        if len(values) == len(names):
            importance_rows.append(values)
    if importance_rows:
        means = np.mean(importance_rows, axis=0)
        explain = sorted([{"feature": name, "mean_absolute_model_weight": float(value)} for name, value in zip(names, means)], key=lambda row: row["mean_absolute_model_weight"], reverse=True)
    else:
        explain = []
    write_json(candidate_dir / "explainability_report.json", {
        "method": "mean absolute logistic-regression coefficient or tree feature importance across calibrated estimator folds",
        "global_feature_importance": explain,
        "interpretation": "Global model associations only; not causal and not a patient-specific effect. Inference service returns local explanations when supported.",
    })
    report = [
        f"# {disease} Model Training Report", "",
        f"- Task: {target_definition}",
        f"- Dataset SHA-256: `{data_sha256}`",
        f"- Rows: {len(X)} (positive {int(y.sum())}, negative {int((y == 0).sum())})",
        f"- Development model: {selected_name}",
        f"- Calibration: {calibration_method}; threshold {threshold:.6f}",
        f"- Held-out ROC-AUC: {test_metrics['roc_auc']:.4f}; PR-AUC: {test_metrics['pr_auc']:.4f}; Brier: {test_metrics['brier_score']:.4f}",
        "- Interpretation: non-diagnostic classification of the dataset label; no clinical validation is established.",
        "", "See `model_comparison.csv`, `cross_validation_metrics.json`, `heldout_metrics.json`, `calibration_report.json`, and `threshold_selection.json` for full evidence.",
    ]
    (candidate_dir / "TRAINING_REPORT.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    return metadata
