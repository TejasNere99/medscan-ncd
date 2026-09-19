"""
MedScan-NCD: Scenario A Diabetes Risk Assessment Inference Module
==================================================================
Task: Routine Medical-Report Diabetes Risk Assessment (Clinical Decision Support)
Model Artifact: ml_model/artifacts/diabetes/diabetes_scenario_a_model.joblib
Feature Schema: ml_model/artifacts/diabetes/feature_schema.json

Enforces the Minimum-Input Domain Policy:
  1. Demographic Domain: Both age and sex are strictly mandatory.
  2. Physical Domain: At least BMI OR (Systolic BP AND Diastolic BP) is required.
  3. Laboratory Domain: At least (Total Cholesterol AND HDL) OR Creatinine is required.

TERMINOLOGY NOTICE:
Outputs represent "model-estimated diabetes risk" for screening/decision support.
This module NEVER makes diagnostic assertions ("patient has diabetes").
"""

import os
import json
import joblib
import numpy as np
import pandas as pd

# Load model and schemas
MODULE_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACTS_DIR = os.path.join(MODULE_DIR, "..", "artifacts", "diabetes")
MODEL_PATH = os.path.join(ARTIFACTS_DIR, "diabetes_scenario_a_model.joblib")
SCHEMA_PATH = os.path.join(ARTIFACTS_DIR, "feature_schema.json")
METADATA_PATH = os.path.join(ARTIFACTS_DIR, "model_metadata.json")

_pipeline = None
_schema = None
_metadata = None

def _get_pipeline():
    global _pipeline, _schema, _metadata
    if _pipeline is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model artifact not found at: {MODEL_PATH}")
        _pipeline = joblib.load(MODEL_PATH)
        with open(SCHEMA_PATH, "r") as f:
            _schema = json.load(f)
        with open(METADATA_PATH, "r") as f:
            _metadata = json.load(f)
    return _pipeline, _schema, _metadata

def assess_diabetes_risk(payload: dict) -> dict:
    """
    Assess model-estimated diabetes risk from structured health data.
    
    Parameters:
        payload (dict): Clinical input dictionary containing:
            - age (int, years, required)
            - sex (int/str: 1/0 or 'male'/'female', required)
            - bmi (float, kg/m^2, optional)
            - systolic_bp (float, mmHg, optional)
            - diastolic_bp (float, mmHg, optional)
            - total_cholesterol (float, mg/dL, optional)
            - hdl (float, mg/dL, optional)
            - creatinine (float, mg/dL, optional)
            
    Returns:
        dict: Standardized structured risk assessment response.
    """
    pipeline, schema, metadata = _get_pipeline()
    model_version = metadata.get("version", "1.0.0")
    threshold = metadata.get("selected_development_threshold", 0.21)

    disclaimer = (
        "Model-estimated risk for clinical decision support. "
        "This tool provides non-diagnostic risk estimation derived from routine "
        "cardiometabolic parameters and does not substitute for clinical evaluation "
        "or diagnostic glycohemoglobin (HbA1c) / fasting glucose testing."
    )

    # 1. Demographic Domain Validation
    age = payload.get("age")
    sex = payload.get("sex")

    if age is None or (isinstance(age, (int, float)) and (np.isnan(age) or age < 18 or age > 125)):
        return {
            "disease": "Diabetes",
            "scenario": "A",
            "status": "INSUFFICIENT_DATA",
            "canCalculate": False,
            "missing_domain": "demographic",
            "message": "Adult age (>= 18 years) is mandatory for Scenario A diabetes risk assessment.",
            "clinical_disclaimer": disclaimer
        }

    # Normalize Sex to binary integer (0=Female, 1=Male)
    if isinstance(sex, str):
        s_clean = sex.strip().lower()
        if s_clean in ["m", "male", "1"]:
            norm_sex = 1
        elif s_clean in ["f", "female", "0"]:
            norm_sex = 0
        else:
            norm_sex = None
    elif isinstance(sex, (int, float)) and sex in [0, 1]:
        norm_sex = int(sex)
    else:
        norm_sex = None

    if norm_sex is None:
        return {
            "disease": "Diabetes",
            "scenario": "A",
            "status": "INSUFFICIENT_DATA",
            "canCalculate": False,
            "missing_domain": "demographic",
            "message": "Biological sex (Male/Female) is mandatory.",
            "clinical_disclaimer": disclaimer
        }

    # 2. Extract and Validate Physical Domain
    bmi = payload.get("bmi")
    sys_bp = payload.get("systolic_bp")
    dia_bp = payload.get("diastolic_bp")

    has_bmi = (bmi is not None) and (not np.isnan(bmi)) and (10.0 <= float(bmi) <= 90.0)
    has_bp = (sys_bp is not None and dia_bp is not None) and \
             (not np.isnan(sys_bp) and not np.isnan(dia_bp)) and \
             (60.0 <= float(sys_bp) <= 260.0) and (30.0 <= float(dia_bp) <= 150.0)

    if not (has_bmi or has_bp):
        return {
            "disease": "Diabetes",
            "scenario": "A",
            "status": "INSUFFICIENT_DATA",
            "canCalculate": False,
            "missing_domain": "physical",
            "message": "Clinical input requires at least one valid physical measurement: BMI or Blood Pressure (Systolic & Diastolic).",
            "clinical_disclaimer": disclaimer
        }

    # 3. Extract and Validate Laboratory Domain
    tc = payload.get("total_cholesterol")
    hdl = payload.get("hdl")
    cr = payload.get("creatinine")

    has_lipids = (tc is not None and hdl is not None) and \
                 (not np.isnan(tc) and not np.isnan(hdl)) and \
                 (50.0 <= float(tc) <= 600.0) and (10.0 <= float(hdl) <= 200.0)
    has_cr = (cr is not None) and (not np.isnan(cr)) and (0.1 <= float(cr) <= 20.0)

    if not (has_lipids or has_cr):
        return {
            "disease": "Diabetes",
            "scenario": "A",
            "status": "INSUFFICIENT_DATA",
            "canCalculate": False,
            "missing_domain": "laboratory",
            "message": "Clinical input requires at least one routine laboratory parameter: Lipid Panel (Total Cholesterol & HDL) or Serum Creatinine.",
            "clinical_disclaimer": disclaimer
        }

    # 4. Construct Feature Row in Exact Order
    row = {
        "age": float(age),
        "sex": int(norm_sex),
        "bmi": float(bmi) if has_bmi else np.nan,
        "systolic_bp": float(sys_bp) if has_bp else np.nan,
        "diastolic_bp": float(dia_bp) if has_bp else np.nan,
        "total_cholesterol": float(tc) if has_lipids else np.nan,
        "hdl": float(hdl) if has_lipids else np.nan,
        "creatinine": float(cr) if has_cr else np.nan
    }

    feature_order = [
        "age", "sex", "bmi", "systolic_bp", "diastolic_bp",
        "total_cholesterol", "hdl", "creatinine"
    ]
    df_row = pd.DataFrame([row], columns=feature_order)

    # 5. Model Inference (Self-Contained Calibrated Pipeline)
    risk_prob = float(pipeline.predict_proba(df_row)[0, 1])
    risk_prob_rounded = round(risk_prob, 4)

    # Risk Stratification based on development threshold
    # Moderate threshold set at ~12% (pre-screening trigger), High threshold at locked 0.210
    if risk_prob >= threshold:
        risk_category = "HIGH"
        summary_text = f"Elevated estimated risk ({risk_prob*100:.1f}%) exceeds the development screening threshold ({threshold*100:.1f}%)."
    elif risk_prob >= 0.12:
        risk_category = "MODERATE"
        summary_text = f"Moderate estimated risk ({risk_prob*100:.1f}%), within the intermediate monitoring band."
    else:
        risk_category = "LOW"
        summary_text = f"Low estimated risk ({risk_prob*100:.1f}%), below the screening threshold."

    # Identify Key Contributing Biomarkers
    drivers = []
    if float(age) >= 45:
        drivers.append(f"Age {int(age)} years (age >= 45 increases baseline cardiometabolic risk)")
    if has_bmi and float(bmi) >= 25.0:
        cat = "Overweight" if float(bmi) < 30.0 else "Obese"
        drivers.append(f"BMI {bmi:.1f} kg/m^2 ({cat} range)")
    if has_bp and float(sys_bp) >= 130.0:
        drivers.append(f"Resting Systolic BP {sys_bp:.0f} mmHg (elevated vascular pressure)")
    if has_lipids and float(hdl) < 40.0:
        drivers.append(f"Low HDL Cholesterol {hdl:.0f} mg/dL (suboptimal protective fraction)")
    if has_cr and float(cr) >= 1.2:
        drivers.append(f"Serum Creatinine {cr:.2f} mg/dL (mild renal filtration decrease)")

    return {
        "disease": "Diabetes",
        "scenario": "A",
        "status": "SUCCESS",
        "canCalculate": True,
        "risk_probability": risk_prob_rounded,
        "risk_category": risk_category,
        "development_threshold": float(threshold),
        "threshold_note": "Development threshold — requires external clinical validation",
        "risk_summary": summary_text,
        "top_contributing_factors": drivers,
        "inputs_evaluated": {k: (round(v, 2) if isinstance(v, float) and not np.isnan(v) else v) for k, v in row.items()},
        "model_version": model_version,
        "clinical_disclaimer": disclaimer
    }

if __name__ == "__main__":
    # Test cases:
    print("--- TEST CASE 1: High-Risk Patient ---")
    p1 = {
        "age": 58, "sex": "Male", "bmi": 33.5,
        "systolic_bp": 142.0, "diastolic_bp": 88.0,
        "total_cholesterol": 215.0, "hdl": 36.0, "creatinine": 1.1
    }
    r1 = assess_diabetes_risk(p1)
    print(json.dumps(r1, indent=2))

    print("\n--- TEST CASE 2: Healthy Young Patient ---")
    p2 = {
        "age": 24, "sex": "Female", "bmi": 21.2,
        "systolic_bp": 112.0, "diastolic_bp": 72.0,
        "total_cholesterol": 165.0, "hdl": 62.0, "creatinine": 0.7
    }
    r2 = assess_diabetes_risk(p2)
    print(json.dumps(r2, indent=2))

    print("\n--- TEST CASE 3: Valid Partial Input (BMI missing, but BP & Labs present) ---")
    p3 = {
        "age": 52, "sex": "Female",
        "systolic_bp": 138.0, "diastolic_bp": 84.0,
        "total_cholesterol": 210.0, "hdl": 42.0
    }
    r3 = assess_diabetes_risk(p3)
    print(json.dumps(r3, indent=2))

    print("\n--- TEST CASE 4: Insufficient Input (Missing all Labs) ---")
    p4 = {
        "age": 52, "sex": "Female", "bmi": 30.1,
        "systolic_bp": 138.0, "diastolic_bp": 84.0
    }
    r4 = assess_diabetes_risk(p4)
    print(json.dumps(r4, indent=2))
