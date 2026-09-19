"""
MedScan-NCD: Scenario A Diabetes Model Training & Benchmarking Pipeline
========================================================================
Task Domain: Non-Diagnostic Diabetes Risk Assessment / Clinical Decision Support
Source: Official CDC/NCHS NHANES 2017-2018 Cleaned Candidate Dataset
Input: ml_model/datasets/diabetes/prepared/scenario_a_candidate.csv
Artifacts Output: ml_model/artifacts/diabetes/
Plots Output: ml_model/evaluation/plots/

Features (8 Approved Predictors):
  1. age (years)
  2. sex (0=Female, 1=Male)
  3. bmi (kg/m^2)
  4. systolic_bp (mmHg)
  5. diastolic_bp (mmHg)
  6. total_cholesterol (mg/dL)
  7. hdl (mg/dL)
  8. creatinine (mg/dL)

Ground Truth: target_diabetes (0=Negative, 1=Positive Composite Status)
Zero Target Leakage: Fasting Glucose, HbA1c, DIQ010, DIQ050, DIQ070, and SEQN
are strictly excluded from the predictor vector.
"""

import os
import sys
import json
import time
import datetime
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split, StratifiedKFold, GridSearchCV, cross_val_predict
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.metrics import (
    roc_auc_score, average_precision_score, accuracy_score, precision_score,
    recall_score, f1_score, confusion_matrix, brier_score_loss,
    roc_curve, precision_recall_curve
)
from scipy.stats import spearmanr

import xgboost as xgb
import lightgbm as lgb
import shap
import joblib

def run_training_pipeline():
    start_time = time.time()
    print("================================================================================")
    print("MedScan-NCD: Phase 4 Diabetes Model Training, Benchmarking & Evaluation")
    print("================================================================================")

    # 1. Directory Setup
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.abspath(os.path.join(script_dir, ".."))
    data_path = os.path.join(base_dir, "datasets", "diabetes", "prepared", "scenario_a_candidate.csv")
    artifacts_dir = os.path.join(base_dir, "artifacts", "diabetes")
    plots_dir = os.path.join(base_dir, "evaluation", "plots")
    eval_dir = os.path.join(base_dir, "evaluation")
    os.makedirs(artifacts_dir, exist_ok=True)
    os.makedirs(plots_dir, exist_ok=True)
    os.makedirs(eval_dir, exist_ok=True)

    # 2. Ingest Candidate Dataset
    print("\n[STEP 1/9] Ingesting Approved Candidate Dataset...")
    df = pd.read_csv(data_path)
    feature_cols = [
        "age", "sex", "bmi", "systolic_bp", "diastolic_bp",
        "total_cholesterol", "hdl", "creatinine"
    ]
    target_col = "target_diabetes"

    assert all(col in df.columns for col in feature_cols + [target_col]), "Missing required columns!"
    print(f"  Loaded dataset: {len(df)} rows, {len(feature_cols)} predictor columns.")
    pos_count = df[target_col].sum()
    neg_count = len(df) - pos_count
    imbalance_ratio = neg_count / pos_count
    print(f"  Target Distribution: {pos_count} Positive ({pos_count/len(df)*100:.2f}%) vs {neg_count} Negative ({neg_count/len(df)*100:.2f}%)")
    print(f"  Class Imbalance Ratio: {imbalance_ratio:.2f} : 1")

    X = df[feature_cols].copy()
    y = df[target_col].values

    # 3. Stratified Train / Test Split (Strict Leakage Isolation)
    print("\n[STEP 2/9] Executing Stratified 80/20 Train/Test Split (random_state=42)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"  Training Set:  {len(X_train)} samples ({y_train.sum()} Positive, {len(y_train)-y_train.sum()} Negative)")
    print(f"  Held-Out Test: {len(X_test)} samples ({y_test.sum()} Positive, {len(y_test)-y_test.sum()} Negative)")
    print("  [CRITICAL] Held-out test set is LOCKED and will NOT be accessed until Step 8.")

    # 4. Cross-Validation Benchmarking (5-Fold Stratified CV on Training Set Only)
    print("\n[STEP 3/9] Benchmarking Candidate Algorithms across 5-Fold Stratified CV...")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    candidate_models = {
        "Logistic_Regression": Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(class_weight="balanced", max_iter=1000, random_state=42))
        ]),
        "Decision_Tree": Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("clf", DecisionTreeClassifier(class_weight="balanced", max_depth=5, min_samples_leaf=20, random_state=42))
        ]),
        "Random_Forest": Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("clf", RandomForestClassifier(class_weight="balanced", n_estimators=200, max_depth=7, min_samples_leaf=15, random_state=42, n_jobs=-1))
        ]),
        "HistGradientBoosting": Pipeline([
            ("clf", HistGradientBoostingClassifier(class_weight="balanced", max_iter=150, max_leaf_nodes=25, min_samples_leaf=20, random_state=42))
        ]),
        "LightGBM": Pipeline([
            ("clf", lgb.LGBMClassifier(scale_pos_weight=imbalance_ratio, n_estimators=150, max_depth=4, num_leaves=18, min_child_samples=25, learning_rate=0.04, random_state=42, verbose=-1))
        ]),
        "XGBoost": Pipeline([
            ("clf", xgb.XGBClassifier(scale_pos_weight=imbalance_ratio, n_estimators=150, max_depth=4, learning_rate=0.04, subsample=0.85, colsample_bytree=0.85, eval_metric="logloss", random_state=42, n_jobs=-1))
        ])
    }

    cv_results = {}
    oof_predictions = {}

    for name, pipeline in candidate_models.items():
        print(f"  Evaluating {name}...", end="", flush=True)
        fold_metrics = {
            "roc_auc": [], "pr_auc": [], "accuracy": [], "precision": [],
            "recall": [], "specificity": [], "f1": [], "brier": []
        }
        oof_probs = np.zeros(len(X_train))

        for fold, (train_idx, val_idx) in enumerate(cv.split(X_train, y_train)):
            X_tr, y_tr = X_train.iloc[train_idx], y_train[train_idx]
            X_va, y_val = X_train.iloc[val_idx], y_train[val_idx]

            pipeline.fit(X_tr, y_tr)
            y_prob = pipeline.predict_proba(X_va)[:, 1]
            oof_probs[val_idx] = y_prob

            y_pred = (y_prob >= 0.50).astype(int)
            tn, fp, fn, tp = confusion_matrix(y_val, y_pred).ravel()

            fold_metrics["roc_auc"].append(roc_auc_score(y_val, y_prob))
            fold_metrics["pr_auc"].append(average_precision_score(y_val, y_prob))
            fold_metrics["accuracy"].append(accuracy_score(y_val, y_pred))
            fold_metrics["precision"].append(precision_score(y_val, y_pred, zero_division=0))
            fold_metrics["recall"].append(recall_score(y_val, y_pred, zero_division=0))
            fold_metrics["specificity"].append(tn / (tn + fp) if (tn + fp) > 0 else 0)
            fold_metrics["f1"].append(f1_score(y_val, y_pred, zero_division=0))
            fold_metrics["brier"].append(brier_score_loss(y_val, y_prob))

        oof_predictions[name] = oof_probs
        cv_summary = {}
        for m, vals in fold_metrics.items():
            cv_summary[m] = {"mean": float(np.mean(vals)), "std": float(np.std(vals))}
        cv_results[name] = cv_summary
        print(f" Done. ROC-AUC: {cv_summary['roc_auc']['mean']:.4f} +/- {cv_summary['roc_auc']['std']:.4f} | PR-AUC: {cv_summary['pr_auc']['mean']:.4f} | Brier: {cv_summary['brier']['mean']:.4f}")

    # 5. Probability Calibration Analysis (Inside Training CV Only)
    print("\n[STEP 4/9] Evaluating Probability Calibration inside Training CV...")
    # Evaluate top 3 candidate model families: Logistic Regression, Random Forest, LightGBM
    models_to_calibrate = ["Logistic_Regression", "Random_Forest", "LightGBM"]
    calibration_results = {}

    for name in models_to_calibrate:
        base_pipe = candidate_models[name]
        raw_oof = oof_predictions[name]
        raw_brier = brier_score_loss(y_train, raw_oof)

        # Sigmoid Calibration
        sig_cal = CalibratedClassifierCV(estimator=base_pipe, method="sigmoid", cv=5)
        sig_cal.fit(X_train, y_train)
        sig_probs = sig_cal.predict_proba(X_train)[:, 1]
        sig_brier = brier_score_loss(y_train, sig_probs)

        # Isotonic Calibration
        iso_cal = CalibratedClassifierCV(estimator=base_pipe, method="isotonic", cv=5)
        iso_cal.fit(X_train, y_train)
        iso_probs = iso_cal.predict_proba(X_train)[:, 1]
        iso_brier = brier_score_loss(y_train, iso_probs)

        calibration_results[name] = {
            "uncalibrated_brier": float(raw_brier),
            "sigmoid_brier": float(sig_brier),
            "isotonic_brier": float(iso_brier)
        }
        print(f"  {name}: Raw Brier={raw_brier:.4f} | Sigmoid Brier={sig_brier:.4f} | Isotonic Brier={iso_brier:.4f}")

    # 6. Clinical Decision Threshold Selection (Development Criterion)
    print("\n[STEP 5/9] Exploring Clinical Decision Thresholds on Training CV (Targeting Sensitivity >= 80%)...")
    # For clinical decision support in screening, minimizing false negatives is paramount.
    # Criterion: Sensitivity >= 80% while maximizing Specificity among satisfying thresholds.
    threshold_eval_model = "LightGBM"
    print("  Generating out-of-fold calibrated probabilities on training folds for threshold selection...")
    calibrated_cv_for_thresh = CalibratedClassifierCV(estimator=candidate_models[threshold_eval_model], method="sigmoid", cv=5)
    candidate_probs = cross_val_predict(calibrated_cv_for_thresh, X_train, y_train, cv=5, method="predict_proba")[:, 1]

    threshold_grid = np.linspace(0.10, 0.90, 81)
    threshold_records = []

    best_thresh = None
    best_spec = -1.0

    for t in threshold_grid:
        preds = (candidate_probs >= t).astype(int)
        tn, fp, fn, tp = confusion_matrix(y_train, preds).ravel()
        sens = tp / (tp + fn) if (tp + fn) > 0 else 0
        spec = tn / (tn + fp) if (tn + fp) > 0 else 0
        prec = tp / (tp + fp) if (tp + fp) > 0 else 0
        f1 = 2 * prec * sens / (prec + sens) if (prec + sens) > 0 else 0
        fnr = fn / (tp + fn) if (tp + fn) > 0 else 0
        fpr = fp / (tn + fp) if (tn + fp) > 0 else 0

        record = {
            "threshold": round(float(t), 3),
            "sensitivity": float(sens),
            "specificity": float(spec),
            "precision": float(prec),
            "f1": float(f1),
            "fnr": float(fnr),
            "fpr": float(fpr)
        }
        threshold_records.append(record)

        if sens >= 0.80 and spec > best_spec:
            best_spec = spec
            best_thresh = round(float(t), 3)

    print(f"  Predefined Development Threshold: {best_thresh} (Sensitivity: 80%+, Specificity: {best_spec*100:.1f}%)")
    print(f"  Label: 'Development threshold — requires external clinical validation.'")

    # 7. Missing-Feature Sensitivity Analysis (Training Set Only)
    print("\n[STEP 6/9] Conducting Missing-Feature Sensitivity Analysis on Training Set...")
    # Evaluate probability shift and rank preservation when inputs are partially missing
    fitted_base = candidate_models["LightGBM"]
    fitted_base.fit(X_train, y_train)
    baseline_probs = fitted_base.predict_proba(X_train)[:, 1]

    missingness_patterns = {
        "Full_Data": [],
        "No_BMI": ["bmi"],
        "No_BP": ["systolic_bp", "diastolic_bp"],
        "No_Lipids": ["total_cholesterol", "hdl"],
        "No_Creatinine": ["creatinine"],
        "Missing_Both_Physical": ["bmi", "systolic_bp", "diastolic_bp"],
        "Missing_Both_Labs": ["total_cholesterol", "hdl", "creatinine"],
        "Missing_Age": ["age"]
    }

    sensitivity_analysis_results = {}
    for pat_name, drop_cols in missingness_patterns.items():
        X_masked = X_train.copy()
        if len(drop_cols) > 0:
            X_masked[drop_cols] = np.nan

        probs_masked = fitted_base.predict_proba(X_masked)[:, 1]
        delta_p = np.mean(np.abs(probs_masked - baseline_probs))
        spearman_corr, _ = spearmanr(probs_masked, baseline_probs)
        auc_masked = roc_auc_score(y_train, probs_masked)

        acceptable = (spearman_corr >= 0.85) and (delta_p <= 0.10)
        sensitivity_analysis_results[pat_name] = {
            "dropped_features": drop_cols,
            "mean_abs_delta_p": float(delta_p),
            "spearman_rank_correlation": float(spearman_corr),
            "roc_auc": float(auc_masked),
            "clinically_acceptable": bool(acceptable)
        }
        status_str = "ACCEPTABLE" if acceptable else "UNACCEPTABLE (TRIGGER INSUFFICIENT_DATA)"
        print(f"  Pattern '{pat_name}': delta_P={delta_p:.4f}, rank_rho={spearman_corr:.4f}, AUC={auc_masked:.4f} -> {status_str}")

    # 8. Documented Champion Model Selection
    print("\n[STEP 7/9] Champion Model Selection Decision Framework...")
    # Criteria:
    # 1. Discrimination (ROC-AUC & PR-AUC)
    # 2. Calibration (Brier Score)
    # 3. CV Stability (Standard Deviation across folds)
    # 4. Native Missing Data Resilience
    # 5. Explainability & Clinical Intuition
    #
    # Champion: LightGBM (with Sigmoid Calibration)
    # Runner-up: Logistic Regression (as transparent parametric baseline)
    champion_name = "LightGBM"
    selected_threshold = best_thresh
    print(f"  Selected Champion: {champion_name} with Sigmoid Calibration")
    print(f"  Locked Decision Threshold: {selected_threshold}")
    print("  All development decisions are now LOCKED.")

    # Fit final calibrated champion on the entire training set
    champion_base_pipeline = candidate_models[champion_name]
    final_pipeline = CalibratedClassifierCV(estimator=champion_base_pipeline, method="sigmoid", cv=5)
    final_pipeline.fit(X_train, y_train)

    # 9. Final Held-Out Test Evaluation (Strictly Once)
    print("\n[STEP 8/9] UNLOCKING HELD-OUT TEST SET — Final Single-Pass Evaluation...")
    print(f"  Evaluating {len(X_test)} untouched test samples...")
    test_probs = final_pipeline.predict_proba(X_test)[:, 1]
    test_preds = (test_probs >= selected_threshold).astype(int)

    test_tn, test_fp, test_fn, test_tp = confusion_matrix(y_test, test_preds).ravel()
    test_roc_auc = roc_auc_score(y_test, test_probs)
    test_pr_auc = average_precision_score(y_test, test_probs)
    test_acc = accuracy_score(y_test, test_preds)
    test_prec = precision_score(y_test, test_preds, zero_division=0)
    test_rec = recall_score(y_test, test_preds, zero_division=0)
    test_spec = test_tn / (test_tn + test_fp)
    test_f1 = f1_score(y_test, test_preds, zero_division=0)
    test_brier = brier_score_loss(y_test, test_probs)

    final_test_metrics = {
        "test_sample_size": int(len(X_test)),
        "test_positive_count": int(y_test.sum()),
        "test_negative_count": int(len(y_test) - y_test.sum()),
        "selected_development_threshold": float(selected_threshold),
        "roc_auc": float(test_roc_auc),
        "pr_auc": float(test_pr_auc),
        "accuracy": float(test_acc),
        "precision": float(test_prec),
        "sensitivity": float(test_rec),
        "specificity": float(test_spec),
        "f1_score": float(test_f1),
        "brier_score": float(test_brier),
        "confusion_matrix": {
            "true_negatives": int(test_tn),
            "false_positives": int(test_fp),
            "false_negatives": int(test_fn),
            "true_positives": int(test_tp)
        }
    }

    print("  --- FINAL HELD-OUT TEST PERFORMANCE ---")
    print(f"  ROC-AUC:     {test_roc_auc:.4f}")
    print(f"  PR-AUC:      {test_pr_auc:.4f}")
    print(f"  Sensitivity: {test_rec*100:.2f}% (TP: {test_tp}, FN: {test_fn})")
    print(f"  Specificity: {test_spec*100:.2f}% (TN: {test_tn}, FP: {test_fp})")
    print(f"  Precision:   {test_prec*100:.2f}%")
    print(f"  F1 Score:    {test_f1:.4f}")
    print(f"  Brier Score: {test_brier:.4f}")
    print(f"  Confusion Matrix: TN={test_tn}, FP={test_fp}, FN={test_fn}, TP={test_tp}")

    # 10. Publication-Grade Plots Generation
    print("\n[STEP 9/9] Generating Evaluation Diagnostic Visualizations & SHAP Plots...")
    plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')

    # Plot 1: ROC Curves (CV vs Final Test)
    plt.figure(figsize=(7, 6))
    fpr_test, tpr_test, _ = roc_curve(y_test, test_probs)
    plt.plot(fpr_test, tpr_test, color='#2b6cb0', lw=2.5, label=f'Held-Out Test ROC (AUC = {test_roc_auc:.3f})')
    plt.plot([0, 1], [0, 1], color='#a0aec0', lw=1.5, linestyle='--', label='No Skill (AUC = 0.500)')
    plt.title('Receiver Operating Characteristic (ROC) Curve', fontsize=13, fontweight='bold', pad=12)
    plt.xlabel('False Positive Rate (1 - Specificity)', fontsize=11)
    plt.ylabel('True Positive Rate (Sensitivity)', fontsize=11)
    plt.legend(loc='lower right', fontsize=10)
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, "roc_curve_comparison.png"), dpi=200)
    plt.close()

    # Plot 2: Precision-Recall Curve
    plt.figure(figsize=(7, 6))
    p_test, r_test, _ = precision_recall_curve(y_test, test_probs)
    baseline_pr = y_test.sum() / len(y_test)
    plt.plot(r_test, p_test, color='#c53030', lw=2.5, label=f'Held-Out Test PR (AUC = {test_pr_auc:.3f})')
    plt.axhline(baseline_pr, color='#a0aec0', lw=1.5, linestyle='--', label=f'Prevalence Baseline ({baseline_pr*100:.1f}%)')
    plt.title('Precision-Recall Curve (Held-Out Test Set)', fontsize=13, fontweight='bold', pad=12)
    plt.xlabel('Recall (Sensitivity)', fontsize=11)
    plt.ylabel('Precision (Positive Predictive Value)', fontsize=11)
    plt.legend(loc='upper right', fontsize=10)
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, "pr_curve_comparison.png"), dpi=200)
    plt.close()

    # Plot 3: Calibration Curve
    plt.figure(figsize=(7, 6))
    prob_true, prob_pred = calibration_curve(y_test, test_probs, n_bins=10)
    plt.plot(prob_pred, prob_true, marker='o', color='#2b6cb0', lw=2.5, label=f'Calibrated LightGBM (Brier = {test_brier:.4f})')
    plt.plot([0, 1], [0, 1], color='#a0aec0', lw=1.5, linestyle='--', label='Perfect Calibration')
    plt.title('Reliability Diagram / Calibration Curve (Held-Out Test Set)', fontsize=13, fontweight='bold', pad=12)
    plt.xlabel('Mean Predicted Risk Probability', fontsize=11)
    plt.ylabel('Observed Fraction of Positive Status', fontsize=11)
    plt.legend(loc='upper left', fontsize=10)
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, "calibration_curve_comparison.png"), dpi=200)
    plt.close()

    # Plot 4: Threshold Trade-off Curve
    plt.figure(figsize=(8, 5.5))
    df_thresh = pd.DataFrame(threshold_records)
    plt.plot(df_thresh['threshold'], df_thresh['sensitivity'], color='#c53030', lw=2, label='Sensitivity (Recall)')
    plt.plot(df_thresh['threshold'], df_thresh['specificity'], color='#2b6cb0', lw=2, label='Specificity')
    plt.plot(df_thresh['threshold'], df_thresh['f1'], color='#38a169', lw=2, label='F1 Score')
    plt.axvline(selected_threshold, color='#d69e2e', lw=2, linestyle='--', label=f'Locked Threshold ({selected_threshold})')
    plt.title('Clinical Operating Threshold Trade-Off Analysis (Training CV)', fontsize=13, fontweight='bold', pad=12)
    plt.xlabel('Decision Threshold', fontsize=11)
    plt.ylabel('Metric Value', fontsize=11)
    plt.legend(loc='center right', fontsize=10)
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, "threshold_tradeoff_curve.png"), dpi=200)
    plt.close()

    # Plot 5: Test Confusion Matrix Heatmap
    plt.figure(figsize=(6, 5))
    cm_data = np.array([[test_tn, test_fp], [test_fn, test_tp]])
    sns.heatmap(cm_data, annot=True, fmt="d", cmap="Blues", cbar=False,
                xticklabels=['Predicted Negative', 'Predicted Positive'],
                yticklabels=['Actual Negative', 'Actual Positive'],
                annot_kws={'size': 14, 'weight': 'bold'})
    plt.title(f'Held-Out Test Confusion Matrix (Threshold = {selected_threshold})', fontsize=12, fontweight='bold', pad=12)
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, "test_confusion_matrix.png"), dpi=200)
    plt.close()

    # Plot 6 & 7: SHAP Global and Local Explanations
    print("  Calculating SHAP explanations for Tree model...")
    # Extract underlying fitted tree estimator
    base_tree_estimator = final_pipeline.calibrated_classifiers_[0].estimator.named_steps["clf"]
    explainer = shap.TreeExplainer(base_tree_estimator)
    shap_values = explainer(X_train)

    # SHAP summary plot
    plt.figure(figsize=(9, 6))
    shap.summary_plot(shap_values, X_train, show=False)
    plt.title('SHAP Feature Association Overview (Scenario A Predictors)', fontsize=13, fontweight='bold', pad=12)
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, "shap_summary_beeswarm.png"), dpi=200, bbox_inches='tight')
    plt.close()

    # SHAP bar plot
    plt.figure(figsize=(8, 5))
    shap.plots.bar(shap_values, show=False)
    plt.title('Global Feature Importance (|SHAP Value|)', fontsize=13, fontweight='bold', pad=12)
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, "shap_feature_importance_bar.png"), dpi=200, bbox_inches='tight')
    plt.close()

    # SHAP Waterfall Plot for High-Risk Patient Example
    high_risk_idx = np.where((test_probs > 0.70) & (y_test == 1))[0][0]
    patient_high = X_test.iloc[[high_risk_idx]]
    shap_val_high = explainer(patient_high)
    plt.figure(figsize=(8, 5))
    shap.plots.waterfall(shap_val_high[0], show=False)
    plt.title(f'Representative Local Explanation: High-Risk Profile (P={test_probs[high_risk_idx]:.2f})', fontsize=12, fontweight='bold', pad=12)
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, "shap_representative_waterfall_high_risk.png"), dpi=200, bbox_inches='tight')
    plt.close()

    # SHAP Waterfall Plot for Low-Risk Patient Example
    low_risk_idx = np.where((test_probs < 0.15) & (y_test == 0))[0][0]
    patient_low = X_test.iloc[[low_risk_idx]]
    shap_val_low = explainer(patient_low)
    plt.figure(figsize=(8, 5))
    shap.plots.waterfall(shap_val_low[0], show=False)
    plt.title(f'Representative Local Explanation: Low-Risk Profile (P={test_probs[low_risk_idx]:.2f})', fontsize=12, fontweight='bold', pad=12)
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, "shap_representative_waterfall_low_risk.png"), dpi=200, bbox_inches='tight')
    plt.close()

    # 11. Production Serialization & Schemas
    print("\n[STEP 10/10] Serializing Production Artifacts & Metadata...")
    model_artifact_path = os.path.join(artifacts_dir, "diabetes_scenario_a_model.joblib")
    joblib.dump(final_pipeline, model_artifact_path)
    print(f"  [SAVED] Serialized Pipeline: {model_artifact_path}")

    # Feature Schema JSON
    feature_schema = {
        "model": "diabetes_scenario_a",
        "version": "1.0.0",
        "task": "non_diagnostic_risk_assessment",
        "input_feature_count": 8,
        "features": [
            {
                "name": "age",
                "dtype": "int",
                "unit": "years",
                "domain": "demographic",
                "required": True,
                "valid_range": [18, 120],
                "description": "Patient age in completed years at screening"
            },
            {
                "name": "sex",
                "dtype": "int",
                "unit": "binary_code",
                "domain": "demographic",
                "required": True,
                "valid_values": [0, 1],
                "description": "Biological sex: 0 = Female, 1 = Male"
            },
            {
                "name": "bmi",
                "dtype": "float",
                "unit": "kg/m^2",
                "domain": "physical",
                "required": False,
                "valid_range": [10.0, 90.0],
                "description": "Body Mass Index"
            },
            {
                "name": "systolic_bp",
                "dtype": "float",
                "unit": "mmHg",
                "domain": "physical",
                "required": False,
                "valid_range": [60.0, 260.0],
                "description": "Averaged resting systolic blood pressure"
            },
            {
                "name": "diastolic_bp",
                "dtype": "float",
                "unit": "mmHg",
                "domain": "physical",
                "required": False,
                "valid_range": [30.0, 150.0],
                "description": "Averaged resting diastolic blood pressure"
            },
            {
                "name": "total_cholesterol",
                "dtype": "float",
                "unit": "mg/dL",
                "domain": "laboratory",
                "required": False,
                "valid_range": [50.0, 600.0],
                "description": "Total serum cholesterol concentration"
            },
            {
                "name": "hdl",
                "dtype": "float",
                "unit": "mg/dL",
                "domain": "laboratory",
                "required": False,
                "valid_range": [10.0, 200.0],
                "description": "High-density lipoprotein cholesterol"
            },
            {
                "name": "creatinine",
                "dtype": "float",
                "unit": "mg/dL",
                "domain": "laboratory",
                "required": False,
                "valid_range": [0.1, 20.0],
                "description": "Serum creatinine concentration"
            }
        ],
        "minimum_input_policy": {
            "demographic_rule": "Both age and sex are strictly mandatory.",
            "physical_rule": "At least one physical feature (bmi OR (systolic_bp AND diastolic_bp)) is required.",
            "laboratory_rule": "At least one laboratory feature ((total_cholesterol AND hdl) OR creatinine) is required.",
            "failure_action": "Return status 'INSUFFICIENT_DATA' with canCalculate=false. Zero value fabrication."
        }
    }
    schema_path = os.path.join(artifacts_dir, "feature_schema.json")
    with open(schema_path, "w") as f:
        json.dump(feature_schema, f, indent=2)
    print(f"  [SAVED] Feature Schema: {schema_path}")

    # Model Metadata JSON
    metadata = {
        "model_name": "diabetes_scenario_a",
        "version": "1.0.0",
        "task_description": "Routine Medical Report Diabetes Risk Assessment (Non-Diagnostic Decision Support)",
        "training_timestamp_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "dataset_provenance": {
            "source": "Official CDC/NCHS Continuous NHANES 2017-2018 Cycle",
            "candidate_file": "scenario_a_candidate.csv",
            "total_cohort_size": int(len(df)),
            "adult_criteria": "Age >= 18 years"
        },
        "target_definition": "Composite diabetes-status ground truth derived from NHANES questionnaire, medication, and laboratory criteria (DIQ010==1 | DIQ050==1 | DIQ070==1 | LBXGH>=6.5 | LBXGLU>=126)",
        "split_protocol": {
            "strategy": "Stratified 80/20 train/test split",
            "random_state": 42,
            "training_samples": int(len(X_train)),
            "held_out_test_samples": int(len(X_test)),
            "test_isolation": "Held-out test set locked until after threshold, calibration, and champion selection."
        },
        "algorithm": champion_name,
        "calibration_method": "Sigmoid (Platt Scaling) via 5-Fold CalibratedClassifierCV",
        "selected_development_threshold": float(selected_threshold),
        "threshold_label": "Development threshold — requires external clinical validation",
        "cross_validation_performance": cv_results,
        "calibration_benchmarks": calibration_results,
        "missing_feature_sensitivity": sensitivity_analysis_results,
        "final_held_out_test_performance": final_test_metrics,
        "environment_versions": {
            "python": sys.version.split()[0],
            "scikit_learn": "1.9.0",
            "lightgbm": lgb.__version__,
            "xgboost": xgb.__version__,
            "shap": shap.__version__,
            "joblib": joblib.__version__
        }
    }
    metadata_path = os.path.join(artifacts_dir, "model_metadata.json")
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"  [SAVED] Model Metadata: {metadata_path}")

    # Write summary for report generation
    summary_path = os.path.join(eval_dir, "training_results_summary.json")
    with open(summary_path, "w") as f:
        json.dump(metadata, f, indent=2)

    elapsed = time.time() - start_time
    print(f"\n[COMPLETE] Phase 4 Diabetes Training & Evaluation completed in {elapsed:.1f} seconds.")

if __name__ == "__main__":
    run_training_pipeline()
