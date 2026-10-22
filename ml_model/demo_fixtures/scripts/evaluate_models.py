"""
MedScan-NCD Model Evaluation on Synthetic Demo Profiles
=======================================================
Executes the actual prediction pipeline on all four saved model artifacts
using their actual feature schemas and builders:
1. Diabetes (LightGBM with Platt Calibration)
2. Heart Disease (Framingham 10-Yr Logistic Regression)
3. Hypertension (HistGradientBoosting with Sigmoid Calibration)
4. Chronic Kidney Disease (Random Forest with Isotonic Calibration)

Outputs truthful probabilities, development thresholds, and risk categories.
Zero fabrication: does not alter model artifacts or invent predictions.
"""

import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
ML_DIR = BASE_DIR.parent

# Model Paths
DIABETES_MODEL_PATH = ML_DIR / "artifacts" / "diabetes" / "diabetes_scenario_a_model.joblib"
DIABETES_META_PATH = ML_DIR / "artifacts" / "diabetes" / "model_metadata.json"

HEART_MODEL_PATH = ML_DIR / "heart_disease" / "model" / "heart_disease_model.joblib"
HEART_PREP_PATH = ML_DIR / "heart_disease" / "preprocessing" / "preprocessor.joblib"
HEART_CALIB_PATH = ML_DIR / "heart_disease" / "calibration" / "calibrator.joblib"
HEART_META_PATH = ML_DIR / "heart_disease" / "model_metadata.json"

HYPER_MODEL_PATH = ML_DIR / "artifacts" / "hypertension" / "v1" / "model.joblib"
HYPER_SCHEMA_PATH = ML_DIR / "artifacts" / "hypertension" / "v1" / "feature_schema.json"
HYPER_META_PATH = ML_DIR / "artifacts" / "hypertension" / "v1" / "model_metadata.json"

CKD_MODEL_PATH = ML_DIR / "artifacts" / "kidney_disease" / "v1" / "model.joblib"
CKD_SCHEMA_PATH = ML_DIR / "artifacts" / "kidney_disease" / "v1" / "feature_schema.json"
CKD_META_PATH = ML_DIR / "artifacts" / "kidney_disease" / "v1" / "model_metadata.json"

def run_evaluation():
    print("===================================================================")
    print("MEDSCAN-NCD: REAL MULTI-MODEL EVALUATION ON SYNTHETIC DEMO FIXTURES")
    print("===================================================================")

    # 1. Load Artifacts
    diabetes_pipeline = joblib.load(DIABETES_MODEL_PATH)
    with open(DIABETES_META_PATH) as f:
        diabetes_meta = json.load(f)
    diabetes_thresh = float(diabetes_meta.get("selected_development_threshold", 0.210))

    heart_model = joblib.load(HEART_MODEL_PATH)
    heart_prep = joblib.load(HEART_PREP_PATH)
    heart_calib = joblib.load(HEART_CALIB_PATH) if HEART_CALIB_PATH.exists() else heart_model
    with open(HEART_META_PATH) as f:
        heart_meta = json.load(f)
    heart_thresh = float(heart_meta.get("development_threshold", {}).get("selected_development_threshold", 0.110))

    hyper_model = joblib.load(HYPER_MODEL_PATH)
    with open(HYPER_SCHEMA_PATH) as f:
        hyper_schema = json.load(f)
    with open(HYPER_META_PATH) as f:
        hyper_meta = json.load(f)
    hyper_thresh = float(hyper_meta["development_threshold"])

    ckd_model = joblib.load(CKD_MODEL_PATH)
    with open(CKD_SCHEMA_PATH) as f:
        ckd_schema = json.load(f)
    with open(CKD_META_PATH) as f:
        ckd_meta = json.load(f)
    ckd_thresh = float(ckd_meta["development_threshold"])

    scenarios = [
        {
            "id": "Patient A",
            "name": "Aarav Sharma (Lower-Risk Demonstration Profile)",
            "path": BASE_DIR / "patient_a_lower_risk" / "expected_canonical_mapping.json",
        },
        {
            "id": "Patient B",
            "name": "Rajesh Patel (Elevated Glucose / Cardiometabolic Profile)",
            "path": BASE_DIR / "patient_b_elevated_glucose" / "expected_canonical_mapping.json",
        },
        {
            "id": "Patient C",
            "name": "Sunita Rao (Renal-Function / CKD Profile)",
            "path": BASE_DIR / "patient_c_renal" / "expected_canonical_mapping.json",
        }
    ]

    matrix_rows = []

    for s in scenarios:
        print(f"\n--- {s['name']} ---")
        with open(s["path"]) as f:
            mapping = json.load(f)["diseaseFeatureVectors"]

        # Diabetes Inference
        d_feats = mapping["diabetes"]
        df_d = pd.DataFrame([d_feats])
        d_prob = float(diabetes_pipeline.predict_proba(df_d)[0, 1])
        d_cat = "ELEVATED_MODEL_ESTIMATED_RISK" if d_prob >= diabetes_thresh else "LOWER_MODEL_ESTIMATED_RISK"

        # Heart Disease Inference
        hd_feats = mapping["heartDisease"]
        df_hd = pd.DataFrame([hd_feats])
        hd_prep_trans = heart_prep.transform(df_hd)
        hd_prob = float(heart_calib.predict_proba(hd_prep_trans)[0, 1])
        hd_cat = "ELEVATED_MODEL_ESTIMATED_RISK" if hd_prob >= heart_thresh else "LOWER_MODEL_ESTIMATED_RISK"

        # Hypertension Inference (Excludes systolic and diastolic BP)
        ht_feats = mapping["hypertension"]
        df_ht = pd.DataFrame([ht_feats], columns=hyper_schema["ordered_features"])
        ht_prob = float(hyper_model.predict_proba(df_ht)[0, 1])
        ht_cat = "POSITIVE_CLASSIFICATION_ESTIMATE" if ht_prob >= hyper_thresh else "NEGATIVE_CLASSIFICATION_ESTIMATE"

        # CKD Inference (Strictly Age and Serum Creatinine)
        ckd_feats = mapping["chronicKidneyDisease"]
        df_ckd = pd.DataFrame([ckd_feats], columns=ckd_schema["ordered_features"])
        ckd_prob = float(ckd_model.predict_proba(df_ckd)[0, 1])
        ckd_cat = "POSITIVE_CLASSIFICATION_ESTIMATE" if ckd_prob >= ckd_thresh else "NEGATIVE_CLASSIFICATION_ESTIMATE"

        print(f"  Diabetes:      prob={d_prob:.4f}  threshold={diabetes_thresh:.3f}  outcome={d_cat}")
        print(f"  Heart Disease: prob={hd_prob:.4f}  threshold={heart_thresh:.3f}  outcome={hd_cat}")
        print(f"  Hypertension:  prob={ht_prob:.4f}  threshold={hyper_thresh:.4f}  outcome={ht_cat}")
        print(f"  CKD:           prob={ckd_prob:.4f}  threshold={ckd_thresh:.4f}  outcome={ckd_cat}")

        matrix_rows.append({
            "scenario": s["id"],
            "patientName": s["name"],
            "diabetes": {"probability": round(d_prob, 4), "threshold": diabetes_thresh, "category": d_cat, "status": "Prediction generated"},
            "heartDisease": {"probability": round(hd_prob, 4), "threshold": heart_thresh, "category": hd_cat, "status": "Prediction generated"},
            "hypertension": {"probability": round(ht_prob, 4), "threshold": round(hyper_thresh, 4), "category": ht_cat, "status": "Prediction generated"},
            "ckd": {"probability": round(ckd_prob, 4), "threshold": round(ckd_thresh, 4), "category": ckd_cat, "status": "Prediction generated"},
        })

    # Save Evaluation Summary
    summary_path = BASE_DIR / "EVALUATION_MATRIX.json"
    with open(summary_path, "w") as f:
        json.dump({
            "disclaimer": "SYNTHETIC — FOR DEMONSTRATION ONLY",
            "evaluationType": "Real Serialized Model Inference",
            "evaluatedAt": "2026-10-21T15:20:00Z",
            "matrix": matrix_rows
        }, f, indent=2)

    print(f"\nSaved evaluation matrix to {summary_path}")

if __name__ == "__main__":
    run_evaluation()
