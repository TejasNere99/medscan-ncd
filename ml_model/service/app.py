"""
MedScan-NCD: Scenario A Diabetes ML Inference Microservice (FastAPI)
=====================================================================
Production microservice exposing /predict/diabetes and /health.
Enforces:
  1. Strict input validation
  2. Domain-grounded minimum-input policy
  3. Explicit data completeness flagging ("FULL" vs "PARTIAL")
  4. Real-time TreeSHAP directional feature contributions
  5. Locked decision threshold: 0.210
  6. Non-diagnostic risk terminology
"""

import os
import json
import logging
from pathlib import Path
from typing import Optional, Union, List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import numpy as np
import pandas as pd
import joblib
import shap

# Configure Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("DiabetesMLService")

# Locate artifacts using Pathlib relative to service directory
SERVICE_DIR = Path(__file__).resolve().parent
ARTIFACTS_DIR = (SERVICE_DIR.parent / "artifacts" / "diabetes").resolve()
MODEL_PATH = ARTIFACTS_DIR / "diabetes_scenario_a_model.joblib"
SCHEMA_PATH = ARTIFACTS_DIR / "feature_schema.json"
METADATA_PATH = ARTIFACTS_DIR / "model_metadata.json"

# Heart Disease Artifact Paths
HEART_DIR = (SERVICE_DIR.parent / "heart_disease").resolve()
HEART_MODEL_PATH = (HEART_DIR / "model" / "heart_disease_model.joblib").resolve()
HEART_PREP_PATH = (HEART_DIR / "preprocessing" / "preprocessor.joblib").resolve()
HEART_CALIB_PATH = (HEART_DIR / "calibration" / "calibrator.joblib").resolve()
HEART_SCHEMA_PATH = (HEART_DIR / "feature_schema.json").resolve()
HEART_METADATA_PATH = (HEART_DIR / "model_metadata.json").resolve()

# In-memory artifact singletons - Diabetes
MODEL_PIPELINE = None
FEATURE_SCHEMA = None
MODEL_METADATA = None
TREE_EXPLAINER = None

LOCKED_THRESHOLD = 0.210
MODEL_VERSION = "1.0.0"
FEATURE_ORDER = [
    "age", "sex", "bmi", "systolic_bp", "diastolic_bp",
    "total_cholesterol", "hdl", "creatinine"
]

CLINICAL_DISCLAIMER = (
    "Model-estimated risk for clinical decision support. "
    "This tool provides non-diagnostic risk estimation derived from routine "
    "cardiometabolic parameters and does not substitute for clinical evaluation "
    "or diagnostic laboratory testing (such as Glycohemoglobin/HbA1c or Fasting Plasma Glucose)."
)

# In-memory artifact singletons - Heart Disease
HEART_MODEL = None
HEART_PREPROCESSOR = None
HEART_CALIBRATOR = None
HEART_FEATURE_SCHEMA = None
HEART_METADATA = None
HEART_EXPLAINER = None

HEART_LOCKED_THRESHOLD = 0.110
HEART_MODEL_VERSION = "1.0.0"
HEART_FEATURE_ORDER = [
    "age", "sex", "totChol", "sysBP", "diaBP", "BMI", "glucose", "currentSmoker"
]

HEART_CLINICAL_DISCLAIMER = (
    "Model-estimated 10-year coronary heart disease (CHD) risk for clinical decision support. "
    "This tool provides non-diagnostic risk estimation derived from routine cardiometabolic parameters "
    "and does not replace comprehensive clinical examination, electrocardiograms (ECG), or formal cardiology referral."
)

def load_artifacts():
    global MODEL_PIPELINE, FEATURE_SCHEMA, MODEL_METADATA, TREE_EXPLAINER, LOCKED_THRESHOLD, MODEL_VERSION
    global HEART_MODEL, HEART_PREPROCESSOR, HEART_CALIBRATOR, HEART_FEATURE_SCHEMA, HEART_METADATA, HEART_EXPLAINER, HEART_LOCKED_THRESHOLD, HEART_MODEL_VERSION
    logger.info("Initializing Diabetes ML Artifacts...")
    
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Missing model artifact: {MODEL_PATH}")
    if not SCHEMA_PATH.exists():
        raise FileNotFoundError(f"Missing feature schema: {SCHEMA_PATH}")
    if not METADATA_PATH.exists():
        raise FileNotFoundError(f"Missing model metadata: {METADATA_PATH}")
        
    MODEL_PIPELINE = joblib.load(str(MODEL_PATH))
    logger.info(f"Loaded serialized pipeline from {MODEL_PATH}")

    with open(SCHEMA_PATH, "r") as f:
        FEATURE_SCHEMA = json.load(f)
    with open(METADATA_PATH, "r") as f:
        MODEL_METADATA = json.load(f)

    LOCKED_THRESHOLD = float(MODEL_METADATA.get("selected_development_threshold", 0.210))
    MODEL_VERSION = str(MODEL_METADATA.get("version", "1.0.0"))

    # Initialize SHAP TreeExplainer on base estimator
    try:
        base_estimator = MODEL_PIPELINE.calibrated_classifiers_[0].estimator.named_steps["clf"]
        TREE_EXPLAINER = shap.TreeExplainer(base_estimator)
        logger.info("Initialized TreeSHAP Explainer on base LightGBM estimator.")
    except Exception as e:
        logger.warning(f"Could not initialize TreeExplainer: {e}. Fallback to rule-based drivers.")
        TREE_EXPLAINER = None

    # Load Heart Disease ML Artifacts
    logger.info("Initializing Heart Disease ML Artifacts...")
    try:
        if HEART_MODEL_PATH.exists() and HEART_PREP_PATH.exists() and HEART_METADATA_PATH.exists():
            HEART_MODEL = joblib.load(str(HEART_MODEL_PATH))
            HEART_PREPROCESSOR = joblib.load(str(HEART_PREP_PATH))
            if HEART_CALIB_PATH.exists():
                HEART_CALIBRATOR = joblib.load(str(HEART_CALIB_PATH))
            else:
                HEART_CALIBRATOR = HEART_MODEL
                
            with open(HEART_SCHEMA_PATH, "r", encoding="utf-8") as f:
                HEART_FEATURE_SCHEMA = json.load(f)
            with open(HEART_METADATA_PATH, "r", encoding="utf-8") as f:
                HEART_METADATA = json.load(f)
                
            HEART_LOCKED_THRESHOLD = float(
                HEART_METADATA.get("development_threshold", {}).get("selected_development_threshold", 0.110)
            )
            HEART_MODEL_VERSION = str(HEART_METADATA.get("version", "1.0.0"))
            
            try:
                base_estimator = HEART_MODEL.calibrated_classifiers_[0].estimator
                HEART_EXPLAINER = shap.LinearExplainer(base_estimator, np.zeros((1, len(HEART_FEATURE_ORDER))))
                logger.info("Initialized LinearExplainer on Heart Disease Logistic Regression base estimator.")
            except Exception as e:
                logger.warning(f"Could not initialize LinearExplainer for Heart Disease: {e}")
                HEART_EXPLAINER = None
            logger.info("Loaded Heart Disease ML artifacts successfully.")
        else:
            logger.warning("Heart Disease ML artifacts not fully found on disk.")
    except Exception as e:
        logger.error(f"Failed to load Heart Disease ML artifacts: {e}", exc_info=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    load_artifacts()
    yield
    logger.info("Shutting down MedScan-NCD ML Service.")

app = FastAPI(
    title="MedScan-NCD Multi-Disease ML Service",
    version="1.0.0",
    description="Non-Diagnostic Clinical Decision Support Microservice for Multi-Disease Risk Assessment",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DiabetesPredictionRequest(BaseModel):
    age: Optional[float] = Field(None, description="Patient age in years (>= 18)")
    sex: Optional[Union[int, str]] = Field(None, description="Biological sex (0=Female, 1=Male or 'female'/'male')")
    bmi: Optional[float] = Field(None, description="Body Mass Index (kg/m^2)")
    systolic_bp: Optional[float] = Field(None, description="Resting systolic blood pressure (mmHg)")
    diastolic_bp: Optional[float] = Field(None, description="Resting diastolic blood pressure (mmHg)")
    total_cholesterol: Optional[float] = Field(None, description="Total serum cholesterol (mg/dL)")
    hdl: Optional[float] = Field(None, description="High-density lipoprotein cholesterol (mg/dL)")
    creatinine: Optional[float] = Field(None, description="Serum creatinine (mg/dL)")

class FeatureContribution(BaseModel):
    feature: str
    value: Optional[float]
    impact: str  # "increases_estimated_risk" | "decreases_estimated_risk"
    description: str

class DiabetesPredictionResponse(BaseModel):
    success: bool
    disease: str = "diabetes"
    scenario: str = "A"
    modelVersion: str
    status: str  # "SUCCESS" | "INSUFFICIENT_DATA"
    canCalculate: bool
    dataCompleteness: Optional[str] = None  # "FULL" | "PARTIAL" | "INSUFFICIENT"
    probability: Optional[float] = None
    threshold: float
    riskCategory: Optional[str] = None  # "ELEVATED_MODEL_ESTIMATED_RISK" | "LOWER_MODEL_ESTIMATED_RISK"
    missingDomain: Optional[str] = None
    message: Optional[str] = None
    featureAvailability: Dict[str, Any]
    topContributingFactors: List[FeatureContribution] = []
    clinicalDisclaimer: str

# Heart Disease Schemas
class HeartDiseaseFeaturePayload(BaseModel):
    age: Optional[float] = Field(None, description="Patient age in years (18-100)")
    sex: Optional[Union[int, str]] = Field(None, description="Biological sex (0=Female, 1=Male or 'female'/'male')")
    totChol: Optional[float] = Field(None, description="Total serum cholesterol (mg/dL)")
    sysBP: Optional[float] = Field(None, description="Systolic blood pressure (mmHg)")
    diaBP: Optional[float] = Field(None, description="Diastolic blood pressure (mmHg)")
    BMI: Optional[float] = Field(None, description="Body Mass Index (kg/m^2)")
    glucose: Optional[float] = Field(None, description="Fasting blood glucose (mg/dL)")
    currentSmoker: Optional[Union[int, bool, str]] = Field(None, description="Smoking status (0=No, 1=Yes)")

class HeartDiseasePredictionRequest(BaseModel):
    features: Optional[HeartDiseaseFeaturePayload] = None
    age: Optional[float] = None
    sex: Optional[Union[int, str]] = None
    totChol: Optional[float] = None
    sysBP: Optional[float] = None
    diaBP: Optional[float] = None
    BMI: Optional[float] = None
    glucose: Optional[float] = None
    currentSmoker: Optional[Union[int, bool, str]] = None

class HeartDiseaseFactorContribution(BaseModel):
    feature: str
    value: Optional[float]
    impact: str  # "increases_estimated_risk" | "decreases_estimated_risk"
    contribution: float
    description: str

class HeartDiseasePredictionResponse(BaseModel):
    success: bool
    disease: str = "heart_disease"
    modelVersion: str
    status: str  # "SUCCESS" | "INSUFFICIENT_DATA"
    canCalculate: bool
    dataCompleteness: Optional[str] = None  # "FULL" | "PARTIAL" | "INSUFFICIENT"
    probability: Optional[float] = None
    developmentThreshold: float
    riskCategory: Optional[str] = None  # "ELEVATED_MODEL_ESTIMATED_RISK" | "LOWER_MODEL_ESTIMATED_RISK"
    missingFeatures: List[str] = []
    message: Optional[str] = None
    features: Dict[str, Any] = {}
    topContributingFactors: List[HeartDiseaseFactorContribution] = []
    clinicalDisclaimer: str

@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    """Verify service status, model artifacts, schemas, and metadata."""
    artifact_exists = MODEL_PATH.exists()
    schema_exists = SCHEMA_PATH.exists()
    metadata_exists = METADATA_PATH.exists()
    artifact_loaded = (MODEL_PIPELINE is not None)
    schema_loaded = (FEATURE_SCHEMA is not None)
    metadata_loaded = (MODEL_METADATA is not None)
    threshold_verified = (LOCKED_THRESHOLD == 0.210)
    all_ok = (
        artifact_exists
        and schema_exists
        and metadata_exists
        and artifact_loaded
        and schema_loaded
        and metadata_loaded
        and threshold_verified
    )
    
    heart_model_loaded = (HEART_MODEL is not None)
    heart_prep_loaded = (HEART_PREPROCESSOR is not None)
    heart_calib_loaded = (HEART_CALIBRATOR is not None)
    heart_schema_loaded = (HEART_FEATURE_SCHEMA is not None)
    heart_meta_loaded = (HEART_METADATA is not None)
    
    heart_healthy = (
        heart_model_loaded
        and heart_prep_loaded
        and heart_calib_loaded
        and heart_schema_loaded
        and heart_meta_loaded
    )
    
    return {
        "status": "healthy" if (all_ok and heart_healthy) else ("degraded" if all_ok else "unhealthy"),
        "service": "medscan-ncd-ml-service",
        "modelVersion": MODEL_VERSION,
        "artifactLoaded": artifact_loaded,
        "artifactStatus": {
            "modelArtifactExists": artifact_exists,
            "modelArtifactLoaded": artifact_loaded,
            "featureSchemaExists": schema_exists,
            "featureSchemaLoaded": schema_loaded,
            "metadataExists": metadata_exists,
            "metadataLoaded": metadata_loaded,
            "thresholdVerified": threshold_verified,
        },
        "algorithm": "LightGBM with 5-Fold Sigmoid (Platt) Calibration",
        "threshold": LOCKED_THRESHOLD,
        "minimumInputPolicyEnforced": True,
        "diabetes": {
            "modelLoaded": artifact_loaded,
            "modelVersion": MODEL_VERSION,
            "threshold": LOCKED_THRESHOLD
        },
        "heartDisease": {
            "modelLoaded": heart_model_loaded,
            "preprocessorLoaded": heart_prep_loaded,
            "calibratorLoaded": heart_calib_loaded,
            "metadataLoaded": heart_meta_loaded,
            "featureSchemaLoaded": heart_schema_loaded,
            "threshold": HEART_LOCKED_THRESHOLD,
            "modelVersion": HEART_MODEL_VERSION
        }
    }

@app.post("/predict/diabetes", response_model=DiabetesPredictionResponse)
def predict_diabetes(payload: DiabetesPredictionRequest):
    """
    Run calibrated model-estimated diabetes risk inference.
    Enforces the minimum-input domain policy:
      - Demographic: age (>= 18) AND sex
      - Physical: bmi OR (systolic_bp AND diastolic_bp)
      - Laboratory: (total_cholesterol AND hdl) OR creatinine
    """
    if MODEL_PIPELINE is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model artifact is not loaded."
        )

    # 1. Normalize and Validate Demographic Domain
    age_raw = payload.age
    sex_raw = payload.sex

    has_valid_age = (
        age_raw is not None 
        and not np.isnan(age_raw) 
        and 18.0 <= float(age_raw) <= 120.0
    )

    norm_sex = None
    if isinstance(sex_raw, str):
        s_clean = sex_raw.strip().lower()
        if s_clean in ["1", "m", "male"]:
            norm_sex = 1
        elif s_clean in ["0", "f", "female"]:
            norm_sex = 0
    elif isinstance(sex_raw, (int, float)) and sex_raw in [0, 1]:
        norm_sex = int(sex_raw)

    has_valid_sex = (norm_sex is not None)

    if not (has_valid_age and has_valid_sex):
        return DiabetesPredictionResponse(
            success=True,
            canCalculate=False,
            status="INSUFFICIENT_DATA",
            dataCompleteness="INSUFFICIENT",
            modelVersion=MODEL_VERSION,
            threshold=LOCKED_THRESHOLD,
            missingDomain="demographic",
            message="Adult age (>= 18 years) and biological sex (Male/Female) are mandatory for Scenario A diabetes risk assessment.",
            featureAvailability={
                "hasAge": bool(has_valid_age),
                "hasSex": bool(has_valid_sex),
                "hasPhysical": False,
                "hasLaboratory": False,
                "availableFeatures": [f for f, ok in [("age", has_valid_age), ("sex", has_valid_sex)] if ok],
                "missingFeatures": [f for f, ok in [("age", has_valid_age), ("sex", has_valid_sex)] if not ok]
            },
            clinicalDisclaimer=CLINICAL_DISCLAIMER
        )

    # 2. Validate Physical Domain
    bmi_raw = payload.bmi
    sys_raw = payload.systolic_bp
    dia_raw = payload.diastolic_bp

    has_bmi = (
        bmi_raw is not None 
        and not np.isnan(bmi_raw) 
        and 10.0 <= float(bmi_raw) <= 90.0
    )
    has_bp = (
        sys_raw is not None and dia_raw is not None 
        and not np.isnan(sys_raw) and not np.isnan(dia_raw) 
        and 60.0 <= float(sys_raw) <= 260.0 
        and 30.0 <= float(dia_raw) <= 150.0
    )

    if not (has_bmi or has_bp):
        available_feats = ["age", "sex"]
        missing_feats = ["bmi", "systolic_bp", "diastolic_bp", "total_cholesterol", "hdl", "creatinine"]
        return DiabetesPredictionResponse(
            success=True,
            canCalculate=False,
            status="INSUFFICIENT_DATA",
            dataCompleteness="INSUFFICIENT",
            modelVersion=MODEL_VERSION,
            threshold=LOCKED_THRESHOLD,
            missingDomain="physical",
            message="Clinical input requires at least one physical measurement: BMI or Blood Pressure (Systolic and Diastolic).",
            featureAvailability={
                "hasAge": True,
                "hasSex": True,
                "hasPhysical": False,
                "hasLaboratory": False,
                "availableFeatures": available_feats,
                "missingFeatures": missing_feats
            },
            clinicalDisclaimer=CLINICAL_DISCLAIMER
        )

    # 3. Validate Laboratory Domain
    tc_raw = payload.total_cholesterol
    hdl_raw = payload.hdl
    cr_raw = payload.creatinine

    has_lipids = (
        tc_raw is not None and hdl_raw is not None 
        and not np.isnan(tc_raw) and not np.isnan(hdl_raw) 
        and 50.0 <= float(tc_raw) <= 600.0 
        and 10.0 <= float(hdl_raw) <= 200.0
    )
    has_creatinine = (
        cr_raw is not None 
        and not np.isnan(cr_raw) 
        and 0.1 <= float(cr_raw) <= 20.0
    )

    if not (has_lipids or has_creatinine):
        available_feats = ["age", "sex"]
        if has_bmi: available_feats.append("bmi")
        if has_bp: available_feats.extend(["systolic_bp", "diastolic_bp"])
        missing_feats = [f for f in FEATURE_ORDER if f not in available_feats]
        return DiabetesPredictionResponse(
            success=True,
            canCalculate=False,
            status="INSUFFICIENT_DATA",
            dataCompleteness="INSUFFICIENT",
            modelVersion=MODEL_VERSION,
            threshold=LOCKED_THRESHOLD,
            missingDomain="laboratory",
            message="Clinical input requires at least one routine laboratory parameter: Lipid Panel (Total Cholesterol & HDL) or Serum Creatinine.",
            featureAvailability={
                "hasAge": True,
                "hasSex": True,
                "hasPhysical": True,
                "hasLaboratory": False,
                "availableFeatures": available_feats,
                "missingFeatures": missing_feats
            },
            clinicalDisclaimer=CLINICAL_DISCLAIMER
        )

    # 4. Construct Exact Feature Row
    feature_row = {
        "age": float(age_raw),
        "sex": int(norm_sex),
        "bmi": float(bmi_raw) if has_bmi else np.nan,
        "systolic_bp": float(sys_raw) if has_bp else np.nan,
        "diastolic_bp": float(dia_raw) if has_bp else np.nan,
        "total_cholesterol": float(tc_raw) if has_lipids else np.nan,
        "hdl": float(hdl_raw) if has_lipids else np.nan,
        "creatinine": float(cr_raw) if has_creatinine else np.nan
    }

    available_features = [k for k, v in feature_row.items() if not np.isnan(v)]
    missing_features = [k for k, v in feature_row.items() if np.isnan(v)]
    data_completeness = "FULL" if len(missing_features) == 0 else "PARTIAL"

    df_row = pd.DataFrame([feature_row], columns=FEATURE_ORDER)

    # 5. Model Inference (Calibrated Pipeline)
    try:
        calibrated_prob = float(MODEL_PIPELINE.predict_proba(df_row)[0, 1])
        prob_rounded = round(calibrated_prob, 4)
    except Exception as e:
        logger.error(f"Inference execution failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error during model inference execution."
        )

    # 6. Risk Stratification based on Locked Development Threshold
    risk_category = (
        "ELEVATED_MODEL_ESTIMATED_RISK" 
        if calibrated_prob >= LOCKED_THRESHOLD 
        else "LOWER_MODEL_ESTIMATED_RISK"
    )

    # 7. Directional Feature Contributions (TreeSHAP or Fallback)
    contributions: List[FeatureContribution] = []
    if TREE_EXPLAINER is not None:
        try:
            # TreeExplainer runs natively on LightGBM with or without NaNs
            shap_vals = TREE_EXPLAINER(df_row)
            row_shap = shap_vals.values[0]
            
            # Pair each available feature with its directional impact
            paired = []
            for idx, col in enumerate(FEATURE_ORDER):
                val = feature_row[col]
                s_val = row_shap[idx]
                if not np.isnan(val) and abs(s_val) > 0.001:
                    impact = "higher estimated risk" if s_val > 0 else "lower estimated risk"
                    feat_title = col.replace('_', ' ').title()
                    desc = f"{feat_title} contributed toward {impact}."
                    paired.append((abs(s_val), FeatureContribution(
                        feature=col,
                        value=round(val, 2),
                        impact=impact,
                        description=desc
                    )))
            
            # Sort by absolute SHAP magnitude descending
            paired.sort(key=lambda x: x[0], reverse=True)
            contributions = [p[1] for p in paired[:4]]
        except Exception as e:
            logger.warning(f"SHAP explanation failed: {e}. Utilizing clinical baseline drivers.")
            contributions = []

    # Rule-based fallback if SHAP explanation was unavailable
    if len(contributions) == 0:
        if feature_row["age"] >= 45:
            contributions.append(FeatureContribution(
                feature="age", value=feature_row["age"],
                impact="higher estimated risk",
                description="Age contributed toward higher estimated risk."
            ))
        if has_bmi and feature_row["bmi"] >= 25.0:
            contributions.append(FeatureContribution(
                feature="bmi", value=round(feature_row["bmi"], 1),
                impact="higher estimated risk",
                description="BMI contributed toward higher estimated risk."
            ))
        if has_bp and feature_row["systolic_bp"] >= 130.0:
            contributions.append(FeatureContribution(
                feature="systolic_bp", value=round(feature_row["systolic_bp"], 0),
                impact="higher estimated risk",
                description="Systolic blood pressure contributed toward higher estimated risk."
            ))
        if has_lipids and feature_row["hdl"] < 40.0:
            contributions.append(FeatureContribution(
                feature="hdl", value=round(feature_row["hdl"], 0),
                impact="higher estimated risk",
                description="HDL contributed toward higher estimated risk."
            ))

    message = "Prediction generated from full feature profile." if data_completeness == "FULL" \
        else "Prediction generated from available report data."

    return DiabetesPredictionResponse(
        success=True,
        disease="diabetes",
        scenario="A",
        modelVersion=MODEL_VERSION,
        status="SUCCESS",
        canCalculate=True,
        dataCompleteness=data_completeness,
        probability=prob_rounded,
        threshold=LOCKED_THRESHOLD,
        riskCategory=risk_category,
        message=message,
        featureAvailability={
            "hasAge": True,
            "hasSex": True,
            "hasPhysical": bool(has_bmi or has_bp),
            "hasLaboratory": bool(has_lipids or has_creatinine),
            "availableFeatures": available_features,
            "missingFeatures": missing_features,
            "dataCompleteness": data_completeness
        },
        topContributingFactors=contributions,
        clinicalDisclaimer=CLINICAL_DISCLAIMER
    )

@app.post("/predict/heart_disease", response_model=HeartDiseasePredictionResponse)
def predict_heart_disease(payload: HeartDiseasePredictionRequest):
    """
    Run calibrated model-estimated 10-year incident coronary heart disease (CHD) risk inference.
    Enforces minimum input requirements:
      - Mandatory: age (18-100), sex (0/1), totChol (50-600), sysBP (60-260), diaBP (30-150)
      - Optional: BMI, glucose, currentSmoker
    """
    if HEART_MODEL is None or HEART_PREPROCESSOR is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Heart disease model or preprocessor artifact is not loaded."
        )

    # Extract features from either payload.features or root payload
    f_obj = payload.features or payload

    age_raw = getattr(f_obj, "age", None)
    sex_raw = getattr(f_obj, "sex", None)
    tc_raw = getattr(f_obj, "totChol", None)
    sys_raw = getattr(f_obj, "sysBP", None)
    dia_raw = getattr(f_obj, "diaBP", None)
    bmi_raw = getattr(f_obj, "BMI", None)
    gluc_raw = getattr(f_obj, "glucose", None)
    smoker_raw = getattr(f_obj, "currentSmoker", None)

    # Validate Mandatory Demographics
    has_valid_age = False
    try:
        if age_raw is not None and not np.isnan(float(age_raw)):
            has_valid_age = (18.0 <= float(age_raw) <= 100.0)
    except (ValueError, TypeError):
        has_valid_age = False

    norm_sex = None
    if isinstance(sex_raw, str):
        s_clean = sex_raw.strip().lower()
        if s_clean in ["1", "m", "male"]:
            norm_sex = 1
        elif s_clean in ["0", "f", "female"]:
            norm_sex = 0
    elif isinstance(sex_raw, (int, float, bool)):
        try:
            val_int = int(sex_raw)
            if val_int in [0, 1]:
                norm_sex = val_int
        except (ValueError, TypeError):
            norm_sex = None

    has_valid_sex = (norm_sex is not None)

    # Validate Mandatory Physical & Laboratory Vitals
    has_valid_sys = False
    try:
        if sys_raw is not None and not np.isnan(float(sys_raw)):
            has_valid_sys = (60.0 <= float(sys_raw) <= 260.0)
    except (ValueError, TypeError):
        has_valid_sys = False

    has_valid_dia = False
    try:
        if dia_raw is not None and not np.isnan(float(dia_raw)):
            has_valid_dia = (30.0 <= float(dia_raw) <= 150.0)
    except (ValueError, TypeError):
        has_valid_dia = False

    has_valid_tc = False
    try:
        if tc_raw is not None and not np.isnan(float(tc_raw)):
            has_valid_tc = (50.0 <= float(tc_raw) <= 600.0)
    except (ValueError, TypeError):
        has_valid_tc = False

    missing_required = []
    if not has_valid_age: missing_required.append("age")
    if not has_valid_sex: missing_required.append("sex")
    if not has_valid_tc: missing_required.append("totChol")
    if not has_valid_sys: missing_required.append("sysBP")
    if not has_valid_dia: missing_required.append("diaBP")

    if missing_required:
        return HeartDiseasePredictionResponse(
            success=True,
            disease="heart_disease",
            modelVersion=HEART_MODEL_VERSION,
            status="INSUFFICIENT_DATA",
            canCalculate=False,
            dataCompleteness="INSUFFICIENT",
            developmentThreshold=HEART_LOCKED_THRESHOLD,
            missingFeatures=missing_required,
            message=f"Mandatory clinical features missing or invalid: {', '.join(missing_required)}. Required: age (18-100), sex (0/1), totChol (50-600 mg/dL), sysBP (60-260 mmHg), diaBP (30-150 mmHg).",
            features={
                "age": float(age_raw) if has_valid_age else None,
                "sex": int(norm_sex) if has_valid_sex else None,
                "totChol": float(tc_raw) if has_valid_tc else None,
                "sysBP": float(sys_raw) if has_valid_sys else None,
                "diaBP": float(dia_raw) if has_valid_dia else None,
                "BMI": float(bmi_raw) if bmi_raw is not None and not np.isnan(float(bmi_raw)) else None,
                "glucose": float(gluc_raw) if gluc_raw is not None and not np.isnan(float(gluc_raw)) else None,
                "currentSmoker": int(smoker_raw) if smoker_raw is not None and not np.isnan(float(smoker_raw)) else None,
            },
            clinicalDisclaimer=HEART_CLINICAL_DISCLAIMER
        )

    # Validate Optional Features (Leave as np.nan if unstated or invalid, per Correction #2)
    has_bmi = False
    try:
        if bmi_raw is not None and not np.isnan(float(bmi_raw)):
            has_bmi = (10.0 <= float(bmi_raw) <= 90.0)
    except (ValueError, TypeError):
        has_bmi = False

    has_glucose = False
    try:
        if gluc_raw is not None and not np.isnan(float(gluc_raw)):
            has_glucose = (40.0 <= float(gluc_raw) <= 500.0)
    except (ValueError, TypeError):
        has_glucose = False

    norm_smoker = None
    if isinstance(smoker_raw, str):
        sm_clean = smoker_raw.strip().lower()
        if sm_clean in ["1", "true", "yes", "smoker", "current"]:
            norm_smoker = 1
        elif sm_clean in ["0", "false", "no", "non-smoker"]:
            norm_smoker = 0
    elif isinstance(smoker_raw, (int, float, bool)):
        try:
            if not np.isnan(float(smoker_raw)):
                norm_smoker = int(bool(smoker_raw))
        except (ValueError, TypeError):
            norm_smoker = None

    has_smoker = (norm_smoker is not None)

    # 4. Construct Exact Feature Row matching schema order
    feature_row = {
        "age": float(age_raw),
        "sex": int(norm_sex),
        "totChol": float(tc_raw),
        "sysBP": float(sys_raw),
        "diaBP": float(dia_raw),
        "BMI": float(bmi_raw) if has_bmi else np.nan,
        "glucose": float(gluc_raw) if has_glucose else np.nan,
        "currentSmoker": int(norm_smoker) if has_smoker else np.nan
    }

    df_row = pd.DataFrame([feature_row], columns=HEART_FEATURE_ORDER)

    # Determine data completeness
    missing_features = [k for k, v in feature_row.items() if np.isnan(v)]
    data_completeness = "FULL" if len(missing_features) == 0 else "PARTIAL"

    # 5. Preprocessing & Model Inference (Calibrated Pipeline)
    try:
        X_trans = HEART_PREPROCESSOR.transform(df_row)
        calibrated_prob = float(HEART_MODEL.predict_proba(X_trans)[0, 1])
        prob_rounded = round(calibrated_prob, 4)
    except Exception as e:
        logger.error(f"Heart Disease inference execution failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error during Heart Disease model inference execution."
        )

    # 6. Risk Stratification based on Locked Development Threshold (0.110)
    risk_category = (
        "ELEVATED_MODEL_ESTIMATED_RISK"
        if calibrated_prob >= HEART_LOCKED_THRESHOLD
        else "LOWER_MODEL_ESTIMATED_RISK"
    )

    # 7. Linear SHAP Directional Factor Contributions (Correction #3: "Contributing Factors")
    contributions: List[HeartDiseaseFactorContribution] = []
    if HEART_EXPLAINER is not None:
        try:
            shap_vals = HEART_EXPLAINER.shap_values(X_trans)[0]
            feature_labels = {
                "age": "Age",
                "sex": "Biological sex",
                "totChol": "Total cholesterol",
                "sysBP": "Systolic blood pressure",
                "diaBP": "Diastolic blood pressure",
                "BMI": "Body mass index",
                "glucose": "Fasting blood glucose",
                "currentSmoker": "Smoking status"
            }
            
            # Sort by absolute SHAP impact
            paired = []
            for idx, col in enumerate(HEART_FEATURE_ORDER):
                val = feature_row[col]
                s_val = float(shap_vals[idx])
                paired.append((col, val, s_val))
            
            paired.sort(key=lambda x: abs(x[2]), reverse=True)
            
            for col, val, s_val in paired:
                readable = feature_labels.get(col, col)
                impact_type = "increases_estimated_risk" if s_val > 0 else "decreases_estimated_risk"
                direction_phrase = "higher model-estimated risk" if s_val > 0 else "lower model-estimated risk"
                
                # Format non-causal explanation per Correction #3
                val_disp = round(float(val), 1) if val is not None and not np.isnan(val) else None
                desc = f"{readable} contributed toward {direction_phrase}."
                
                contributions.append(HeartDiseaseFactorContribution(
                    feature=col,
                    value=val_disp,
                    impact=impact_type,
                    contribution=round(s_val, 4),
                    description=desc
                ))
        except Exception as e:
            logger.warning(f"Could not compute SHAP values for Heart Disease: {e}")
            contributions = []

    message = (
        "10-Year CHD risk estimation generated from full feature profile."
        if data_completeness == "FULL"
        else "10-Year CHD risk estimation generated with preprocessor-imputed optional features."
    )

    clean_features = {k: (round(v, 2) if not np.isnan(v) else None) for k, v in feature_row.items()}

    return HeartDiseasePredictionResponse(
        success=True,
        disease="heart_disease",
        modelVersion=HEART_MODEL_VERSION,
        status="SUCCESS",
        canCalculate=True,
        dataCompleteness=data_completeness,
        probability=prob_rounded,
        developmentThreshold=HEART_LOCKED_THRESHOLD,
        riskCategory=risk_category,
        message=message,
        missingFeatures=missing_features,
        features=clean_features,
        topContributingFactors=contributions,
        clinicalDisclaimer=HEART_CLINICAL_DISCLAIMER
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    logger.info(f"Starting Multi-Disease ML Service on 0.0.0.0:{port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
