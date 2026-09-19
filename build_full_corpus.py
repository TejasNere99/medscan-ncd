"""
MedScan-NCD Comprehensive Synthetic Test Corpus Builder
======================================================
Builds 37 fully detailed synthetic medical report files (PDFs + Ground Truths)
spanning all 10 clinical and technical test categories.
"""

import os
import json
from pathlib import Path
from test_corpus_generator import (
    build_pdf_report, export_ground_truth_text, CORPUS_DIR, FEATURE_KEYS
)

def get_report_catalog():
    """Returns the complete specification for all 37 synthetic reports."""
    catalog = []

    # =========================================================================
    # CATEGORY 01: DIABETES ELEVATED RISK (5 reports)
    # =========================================================================
    catalog.append({
        "folder": "01_diabetes_elevated_risk",
        "reportId": "SYN-D001-R01",
        "patient": {
            "patientId": "SYN-D001",
            "name": "Test Patient D001",
            "age": 62,
            "sex": 1,
            "sexStr": "Male",
            "dob": "1963-05-12"
        },
        "reportDate": "2025-06-15",
        "reportType": "metabolic_panel",
        "clinicalScenario": "elevated_diabetes_risk",
        "clinicalIndication": "Annual cardiometabolic risk screening — family history of premature CVD and type 2 diabetes",
        "referringDoctor": "Dr. Marcus Thorne, MD (Internal Medicine)",
        "expectedExtraction": {
            "age": 62, "sex": 1, "bmi": 32.4, "systolicBP": 146.0, "diastolicBP": 92.0,
            "totalCholesterol": 242.0, "hdl": 36.0, "creatinine": 1.15,
            "fastingGlucose": 154.0, "hba1c": 7.6, "triglycerides": 235.0
        },
        "modelRelevantFeatures": {
            "age": 62, "sex": 1, "bmi": 32.4, "systolic_bp": 146.0, "diastolic_bp": 92.0,
            "total_cholesterol": 242.0, "hdl": 36.0, "creatinine": 1.15
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": None,
        "sections": [
            {
                "type": "vitals",
                "title": "Clinical Examination & Resting Vital Signs",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "146/92", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "32.4", "unit": "kg/m²"},
                    {"label": "Pulse Rate", "value": "78", "unit": "BPM"},
                    {"label": "Height", "value": "175", "unit": "cm"},
                    {"label": "Weight", "value": "99.2", "unit": "kg"},
                    {"label": "Respiratory Rate", "value": "16", "unit": "breaths/min"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Comprehensive Lipid Panel & Renal Function Tests",
                "rows": [
                    {"name": "Total Cholesterol", "value": 242.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "HIGH", "highlight": True, "method": "CHOD-PAP Enzymatic"},
                    {"name": "HDL Cholesterol", "value": 36.0, "unit": "mg/dL", "referenceRange": "> 40.0 (Male)", "flag": "LOW", "highlight": True, "method": "Direct Immuno-inhibition"},
                    {"name": "Triglycerides", "value": 235.0, "unit": "mg/dL", "referenceRange": "< 150.0", "flag": "HIGH", "method": "GPO-PAP Enzymatic"},
                    {"name": "LDL Cholesterol (Calculated)", "value": 159.0, "unit": "mg/dL", "referenceRange": "< 100.0", "flag": "HIGH", "method": "Friedewald Equation"},
                    {"name": "Serum Creatinine", "value": 1.15, "unit": "mg/dL", "referenceRange": "0.70 - 1.20", "flag": "NORMAL", "highlight": True, "method": "Kinetic Alkaline Picrate (Jaffe)"},
                    {"name": "Blood Urea Nitrogen (BUN)", "value": 19.0, "unit": "mg/dL", "referenceRange": "7.0 - 20.0", "flag": "NORMAL", "method": "GLDH Kinetic Assay"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Glycemic Markers (Clinical Context Only — Non-Predictor)",
                "rows": [
                    {"name": "Fasting Blood Glucose", "value": 154.0, "unit": "mg/dL", "referenceRange": "70.0 - 99.0", "flag": "HIGH", "method": "Hexokinase Enzymatic"},
                    {"name": "Glycated Hemoglobin (HbA1c)", "value": 7.6, "unit": "%", "referenceRange": "4.0 - 5.6", "flag": "HIGH", "method": "HPLC High Performance Liquid"}
                ]
            },
            {
                "type": "text",
                "title": "Pathologist Clinical Remarks",
                "content": "Patient presents with atherogenic dyslipidemia (elevated total cholesterol, elevated triglycerides, depressed HDL) accompanied by Class I obesity and Stage 2 hypertension. Fasting glucose and HbA1c are elevated. Clinical evaluation and cardiometabolic monitoring are recommended."
            }
        ]
    })

    catalog.append({
        "folder": "01_diabetes_elevated_risk",
        "reportId": "SYN-D002-R01",
        "patient": {
            "patientId": "SYN-D002",
            "name": "Test Patient D002",
            "age": 54,
            "sex": 0,
            "sexStr": "Female",
            "dob": "1971-09-20"
        },
        "reportDate": "2025-07-10",
        "reportType": "general_lab_report",
        "clinicalScenario": "elevated_diabetes_risk",
        "clinicalIndication": "Hypertension follow-up and metabolic assessment in post-menopausal patient",
        "referringDoctor": "Dr. Brenda Vance, MD (Cardiology)",
        "expectedExtraction": {
            "age": 54, "sex": 0, "bmi": 29.8, "systolicBP": 152.0, "diastolicBP": 94.0,
            "totalCholesterol": 228.0, "hdl": 41.0, "creatinine": 0.95,
            "fastingGlucose": 138.0, "hba1c": 6.8
        },
        "modelRelevantFeatures": {
            "age": 54, "sex": 0, "bmi": 29.8, "systolic_bp": 152.0, "diastolic_bp": 94.0,
            "total_cholesterol": 228.0, "hdl": 41.0, "creatinine": 0.95
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": None,
        "sections": [
            {
                "type": "vitals",
                "title": "Clinic Vital Signs",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "152/94", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "29.8", "unit": "kg/m²"},
                    {"label": "Heart Rate", "value": "82", "unit": "BPM"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Lipid Profile & Serum Chemistries",
                "rows": [
                    {"name": "Total Cholesterol", "value": 228.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "HIGH", "highlight": True, "method": "CHOD-PAP"},
                    {"name": "HDL Cholesterol", "value": 41.0, "unit": "mg/dL", "referenceRange": "> 50.0 (Female)", "flag": "LOW", "highlight": True, "method": "Direct Immunoassay"},
                    {"name": "Serum Creatinine", "value": 0.95, "unit": "mg/dL", "referenceRange": "0.50 - 1.10", "flag": "NORMAL", "highlight": True, "method": "Jaffe Picrate"},
                    {"name": "Fasting Blood Sugar", "value": 138.0, "unit": "mg/dL", "referenceRange": "70.0 - 99.0", "flag": "HIGH", "method": "Hexokinase"},
                    {"name": "HbA1c", "value": 6.8, "unit": "%", "referenceRange": "4.0 - 5.6", "flag": "HIGH", "method": "HPLC"}
                ]
            }
        ]
    })

    catalog.append({
        "folder": "01_diabetes_elevated_risk",
        "reportId": "SYN-D003-R01",
        "patient": {
            "patientId": "SYN-D003",
            "name": "Test Patient D003",
            "age": 43,
            "sex": 1,
            "sexStr": "Male",
            "dob": "1982-02-14"
        },
        "reportDate": "2025-08-04",
        "reportType": "metabolic_panel",
        "clinicalScenario": "elevated_diabetes_risk",
        "clinicalIndication": "Executive wellness evaluation — Class II obesity with metabolic syndrome features",
        "referringDoctor": "Dr. Julian Ross, MD",
        "expectedExtraction": {
            "age": 43, "sex": 1, "bmi": 37.6, "systolicBP": 142.0, "diastolicBP": 88.0,
            "totalCholesterol": 258.0, "hdl": 32.0, "creatinine": 1.28,
            "fastingGlucose": 162.0, "hba1c": 8.1
        },
        "modelRelevantFeatures": {
            "age": 43, "sex": 1, "bmi": 37.6, "systolic_bp": 142.0, "diastolic_bp": 88.0,
            "total_cholesterol": 258.0, "hdl": 32.0, "creatinine": 1.28
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": None,
        "sections": [
            {
                "type": "vitals",
                "title": "Vital Signs & Anthropometry",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "142/88", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "37.6", "unit": "kg/m²"},
                    {"label": "Pulse Rate", "value": "84", "unit": "BPM"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Cardiometabolic Laboratory Panel",
                "rows": [
                    {"name": "Total Cholesterol", "value": 258.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "HIGH", "highlight": True, "method": "Enzymatic"},
                    {"name": "HDL Cholesterol", "value": 32.0, "unit": "mg/dL", "referenceRange": "> 40.0", "flag": "LOW", "highlight": True, "method": "Direct Assayed"},
                    {"name": "Serum Creatinine", "value": 1.28, "unit": "mg/dL", "referenceRange": "0.70 - 1.20", "flag": "HIGH", "highlight": True, "method": "Jaffe"},
                    {"name": "Fasting Blood Glucose", "value": 162.0, "unit": "mg/dL", "referenceRange": "70.0 - 99.0", "flag": "HIGH", "method": "Hexokinase"},
                    {"name": "HbA1c", "value": 8.1, "unit": "%", "referenceRange": "4.0 - 5.6", "flag": "HIGH", "method": "HPLC"}
                ]
            }
        ]
    })

    catalog.append({
        "folder": "01_diabetes_elevated_risk",
        "reportId": "SYN-D004-R01",
        "patient": {
            "patientId": "SYN-D004",
            "name": "Test Patient D004",
            "age": 71,
            "sex": 0,
            "sexStr": "Female",
            "dob": "1954-11-04"
        },
        "reportDate": "2025-08-22",
        "reportType": "renal_function",
        "clinicalScenario": "elevated_diabetes_risk",
        "clinicalIndication": "Senior preventive health review — isolated systolic hypertension",
        "referringDoctor": "Dr. Eleanor Wright, MD (Geriatrics)",
        "expectedExtraction": {
            "age": 71, "sex": 0, "bmi": 30.5, "systolicBP": 158.0, "diastolicBP": 86.0,
            "totalCholesterol": 215.0, "hdl": 42.0, "creatinine": 1.34,
            "fastingGlucose": 144.0, "hba1c": 7.2
        },
        "modelRelevantFeatures": {
            "age": 71, "sex": 0, "bmi": 30.5, "systolic_bp": 158.0, "diastolic_bp": 86.0,
            "total_cholesterol": 215.0, "hdl": 42.0, "creatinine": 1.34
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": None,
        "sections": [
            {
                "type": "vitals",
                "title": "Geriatric Vital Signs",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "158/86", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "30.5", "unit": "kg/m²"},
                    {"label": "Pulse Rate", "value": "72", "unit": "BPM"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Renal & Lipid Function Tests",
                "rows": [
                    {"name": "Total Cholesterol", "value": 215.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "HIGH", "highlight": True, "method": "Enzymatic"},
                    {"name": "HDL Cholesterol", "value": 42.0, "unit": "mg/dL", "referenceRange": "> 50.0", "flag": "LOW", "highlight": True, "method": "Direct"},
                    {"name": "Serum Creatinine", "value": 1.34, "unit": "mg/dL", "referenceRange": "0.50 - 1.10", "flag": "HIGH", "highlight": True, "method": "Jaffe"},
                    {"name": "Fasting Blood Glucose", "value": 144.0, "unit": "mg/dL", "referenceRange": "70.0 - 99.0", "flag": "HIGH", "method": "Hexokinase"},
                    {"name": "HbA1c", "value": 7.2, "unit": "%", "referenceRange": "4.0 - 5.6", "flag": "HIGH", "method": "HPLC"}
                ]
            }
        ]
    })

    catalog.append({
        "folder": "01_diabetes_elevated_risk",
        "reportId": "SYN-D005-R01",
        "patient": {
            "patientId": "SYN-D005",
            "name": "Test Patient D005",
            "age": 49,
            "sex": 1,
            "sexStr": "Male",
            "dob": "1976-07-28"
        },
        "reportDate": "2025-09-05",
        "reportType": "general_lab_report",
        "clinicalScenario": "elevated_diabetes_risk",
        "clinicalIndication": "Routine health checkup — moderate multi-factor cardiometabolic risk",
        "referringDoctor": "Dr. Alan Price, MD",
        "expectedExtraction": {
            "age": 49, "sex": 1, "bmi": 28.6, "systolicBP": 136.0, "diastolicBP": 86.0,
            "totalCholesterol": 218.0, "hdl": 40.0, "creatinine": 1.08,
            "fastingGlucose": 124.0, "hba1c": 6.4
        },
        "modelRelevantFeatures": {
            "age": 49, "sex": 1, "bmi": 28.6, "systolic_bp": 136.0, "diastolic_bp": 86.0,
            "total_cholesterol": 218.0, "hdl": 40.0, "creatinine": 1.08
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": None,
        "sections": [
            {
                "type": "vitals",
                "title": "Resting Vitals",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "136/86", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "28.6", "unit": "kg/m²"},
                    {"label": "Pulse Rate", "value": "76", "unit": "BPM"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Laboratory Investigations",
                "rows": [
                    {"name": "Total Cholesterol", "value": 218.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "HIGH", "highlight": True, "method": "Enzymatic"},
                    {"name": "HDL Cholesterol", "value": 40.0, "unit": "mg/dL", "referenceRange": "> 40.0", "flag": "NORMAL", "highlight": True, "method": "Direct"},
                    {"name": "Serum Creatinine", "value": 1.08, "unit": "mg/dL", "referenceRange": "0.70 - 1.20", "flag": "NORMAL", "highlight": True, "method": "Jaffe"},
                    {"name": "Fasting Blood Sugar", "value": 124.0, "unit": "mg/dL", "referenceRange": "70.0 - 99.0", "flag": "HIGH", "method": "Hexokinase"},
                    {"name": "HbA1c", "value": 6.4, "unit": "%", "referenceRange": "4.0 - 5.6", "flag": "HIGH", "method": "HPLC"}
                ]
            }
        ]
    })

    # =========================================================================
    # CATEGORY 02: LOWER RISK / HEALTHY (5 reports)
    # =========================================================================
    catalog.append({
        "folder": "02_lower_risk_healthy",
        "reportId": "SYN-H001-R01",
        "patient": {
            "patientId": "SYN-H001",
            "name": "Test Patient H001",
            "age": 24,
            "sex": 0,
            "sexStr": "Female",
            "dob": "2001-03-18"
        },
        "reportDate": "2025-05-14",
        "reportType": "general_lab_report",
        "clinicalScenario": "lower_risk_healthy",
        "clinicalIndication": "Pre-employment medical clearance — completely asymptomatic",
        "referringDoctor": "Dr. Karen Evans, MD (Occupational Medicine)",
        "expectedExtraction": {
            "age": 24, "sex": 0, "bmi": 21.2, "systolicBP": 112.0, "diastolicBP": 72.0,
            "totalCholesterol": 162.0, "hdl": 64.0, "creatinine": 0.76,
            "fastingGlucose": 84.0, "hba1c": 5.1
        },
        "modelRelevantFeatures": {
            "age": 24, "sex": 0, "bmi": 21.2, "systolic_bp": 112.0, "diastolic_bp": 72.0,
            "total_cholesterol": 162.0, "hdl": 64.0, "creatinine": 0.76
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": None,
        "sections": [
            {
                "type": "vitals",
                "title": "Baseline Physical & Vitals Examination",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "112/72", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "21.2", "unit": "kg/m²"},
                    {"label": "Heart Rate", "value": "68", "unit": "BPM"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Routine Screening Chemistries & Lipids",
                "rows": [
                    {"name": "Total Cholesterol", "value": 162.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "NORMAL", "highlight": True, "method": "CHOD-PAP"},
                    {"name": "HDL Cholesterol", "value": 64.0, "unit": "mg/dL", "referenceRange": "> 50.0", "flag": "NORMAL", "highlight": True, "method": "Direct Immuno"},
                    {"name": "Serum Creatinine", "value": 0.76, "unit": "mg/dL", "referenceRange": "0.50 - 1.10", "flag": "NORMAL", "highlight": True, "method": "Jaffe"},
                    {"name": "Fasting Blood Glucose", "value": 84.0, "unit": "mg/dL", "referenceRange": "70.0 - 99.0", "flag": "NORMAL", "method": "Hexokinase"},
                    {"name": "HbA1c", "value": 5.1, "unit": "%", "referenceRange": "4.0 - 5.6", "flag": "NORMAL", "method": "HPLC"}
                ]
            }
        ]
    })

    catalog.append({
        "folder": "02_lower_risk_healthy",
        "reportId": "SYN-H002-R01",
        "patient": {
            "patientId": "SYN-H002",
            "name": "Test Patient H002",
            "age": 31,
            "sex": 1,
            "sexStr": "Male",
            "dob": "1994-08-11"
        },
        "reportDate": "2025-06-02",
        "reportType": "general_lab_report",
        "clinicalScenario": "lower_risk_healthy",
        "clinicalIndication": "Annual athletic fitness & wellness screening",
        "referringDoctor": "Dr. Ryan Cooper, MD (Sports Medicine)",
        "expectedExtraction": {
            "age": 31, "sex": 1, "bmi": 22.8, "systolicBP": 118.0, "diastolicBP": 76.0,
            "totalCholesterol": 174.0, "hdl": 56.0, "creatinine": 0.92,
            "fastingGlucose": 89.0, "hba1c": 5.2
        },
        "modelRelevantFeatures": {
            "age": 31, "sex": 1, "bmi": 22.8, "systolic_bp": 118.0, "diastolic_bp": 76.0,
            "total_cholesterol": 174.0, "hdl": 56.0, "creatinine": 0.92
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": None,
        "sections": [
            {
                "type": "vitals",
                "title": "Clinical Examination & Vitals",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "118/76", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "22.8", "unit": "kg/m²"},
                    {"label": "Heart Rate", "value": "64", "unit": "BPM"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Lipid Profile & Renal Screen",
                "rows": [
                    {"name": "Total Cholesterol", "value": 174.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "NORMAL", "highlight": True, "method": "Enzymatic"},
                    {"name": "HDL Cholesterol", "value": 56.0, "unit": "mg/dL", "referenceRange": "> 40.0", "flag": "NORMAL", "highlight": True, "method": "Direct Assayed"},
                    {"name": "Serum Creatinine", "value": 0.92, "unit": "mg/dL", "referenceRange": "0.70 - 1.20", "flag": "NORMAL", "highlight": True, "method": "Jaffe"},
                    {"name": "Fasting Blood Sugar", "value": 89.0, "unit": "mg/dL", "referenceRange": "70.0 - 99.0", "flag": "NORMAL", "method": "Hexokinase"},
                    {"name": "HbA1c", "value": 5.2, "unit": "%", "referenceRange": "4.0 - 5.6", "flag": "NORMAL", "method": "HPLC"}
                ]
            }
        ]
    })

    catalog.append({
        "folder": "02_lower_risk_healthy",
        "reportId": "SYN-H003-R01",
        "patient": {
            "patientId": "SYN-H003",
            "name": "Test Patient H003",
            "age": 66,
            "sex": 0,
            "sexStr": "Female",
            "dob": "1959-04-03"
        },
        "reportDate": "2025-06-25",
        "reportType": "general_lab_report",
        "clinicalScenario": "lower_risk_healthy",
        "clinicalIndication": "Senior wellness examination — highly active lifestyle, normal metabolic parameters",
        "referringDoctor": "Dr. Eleanor Wright, MD",
        "expectedExtraction": {
            "age": 66, "sex": 0, "bmi": 23.4, "systolicBP": 122.0, "diastolicBP": 78.0,
            "totalCholesterol": 186.0, "hdl": 68.0, "creatinine": 0.84,
            "fastingGlucose": 91.0, "hba1c": 5.4
        },
        "modelRelevantFeatures": {
            "age": 66, "sex": 0, "bmi": 23.4, "systolic_bp": 122.0, "diastolic_bp": 78.0,
            "total_cholesterol": 186.0, "hdl": 68.0, "creatinine": 0.84
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": None,
        "sections": [
            {
                "type": "vitals",
                "title": "Senior Vitals",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "122/78", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "23.4", "unit": "kg/m²"},
                    {"label": "Pulse Rate", "value": "70", "unit": "BPM"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Metabolic Screening Panel",
                "rows": [
                    {"name": "Total Cholesterol", "value": 186.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "NORMAL", "highlight": True, "method": "Enzymatic"},
                    {"name": "HDL Cholesterol", "value": 68.0, "unit": "mg/dL", "referenceRange": "> 50.0", "flag": "NORMAL", "highlight": True, "method": "Direct"},
                    {"name": "Serum Creatinine", "value": 0.84, "unit": "mg/dL", "referenceRange": "0.50 - 1.10", "flag": "NORMAL", "highlight": True, "method": "Jaffe"},
                    {"name": "Fasting Blood Glucose", "value": 91.0, "unit": "mg/dL", "referenceRange": "70.0 - 99.0", "flag": "NORMAL", "method": "Hexokinase"},
                    {"name": "HbA1c", "value": 5.4, "unit": "%", "referenceRange": "4.0 - 5.6", "flag": "NORMAL", "method": "HPLC"}
                ]
            }
        ]
    })

    catalog.append({
        "folder": "02_lower_risk_healthy",
        "reportId": "SYN-H004-R01",
        "patient": {
            "patientId": "SYN-H004",
            "name": "Test Patient H004",
            "age": 38,
            "sex": 1,
            "sexStr": "Male",
            "dob": "1987-10-15"
        },
        "reportDate": "2025-07-18",
        "reportType": "general_lab_report",
        "clinicalScenario": "lower_risk_healthy",
        "clinicalIndication": "Executive physical examination — borderline desirable cholesterol but robustly healthy overall",
        "referringDoctor": "Dr. Julian Ross, MD",
        "expectedExtraction": {
            "age": 38, "sex": 1, "bmi": 24.6, "systolicBP": 124.0, "diastolicBP": 80.0,
            "totalCholesterol": 198.0, "hdl": 51.0, "creatinine": 0.98,
            "fastingGlucose": 94.0, "hba1c": 5.3
        },
        "modelRelevantFeatures": {
            "age": 38, "sex": 1, "bmi": 24.6, "systolic_bp": 124.0, "diastolic_bp": 80.0,
            "total_cholesterol": 198.0, "hdl": 51.0, "creatinine": 0.98
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": None,
        "sections": [
            {
                "type": "vitals",
                "title": "Clinic Examination",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "124/80", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "24.6", "unit": "kg/m²"},
                    {"label": "Pulse Rate", "value": "72", "unit": "BPM"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Lipids & Basic Chemistries",
                "rows": [
                    {"name": "Total Cholesterol", "value": 198.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "NORMAL", "highlight": True, "method": "Enzymatic"},
                    {"name": "HDL Cholesterol", "value": 51.0, "unit": "mg/dL", "referenceRange": "> 40.0", "flag": "NORMAL", "highlight": True, "method": "Direct"},
                    {"name": "Serum Creatinine", "value": 0.98, "unit": "mg/dL", "referenceRange": "0.70 - 1.20", "flag": "NORMAL", "highlight": True, "method": "Jaffe"},
                    {"name": "Fasting Blood Sugar", "value": 94.0, "unit": "mg/dL", "referenceRange": "70.0 - 99.0", "flag": "NORMAL", "method": "Hexokinase"},
                    {"name": "HbA1c", "value": 5.3, "unit": "%", "referenceRange": "4.0 - 5.6", "flag": "NORMAL", "method": "HPLC"}
                ]
            }
        ]
    })

    catalog.append({
        "folder": "02_lower_risk_healthy",
        "reportId": "SYN-H005-R01",
        "patient": {
            "patientId": "SYN-H005",
            "name": "Test Patient H005",
            "age": 45,
            "sex": 0,
            "sexStr": "Female",
            "dob": "1980-06-25"
        },
        "reportDate": "2025-08-11",
        "reportType": "general_lab_report",
        "clinicalScenario": "lower_risk_healthy",
        "clinicalIndication": "Routine preventative checkup — normal cardiometabolic baseline",
        "referringDoctor": "Dr. Karen Evans, MD",
        "expectedExtraction": {
            "age": 45, "sex": 0, "bmi": 22.0, "systolicBP": 115.0, "diastolicBP": 74.0,
            "totalCholesterol": 170.0, "hdl": 62.0, "creatinine": 0.80,
            "fastingGlucose": 87.0, "hba1c": 5.1
        },
        "modelRelevantFeatures": {
            "age": 45, "sex": 0, "bmi": 22.0, "systolic_bp": 115.0, "diastolic_bp": 74.0,
            "total_cholesterol": 170.0, "hdl": 62.0, "creatinine": 0.80
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": None,
        "sections": [
            {
                "type": "vitals",
                "title": "Vital Signs Summary",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "115/74", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "22.0", "unit": "kg/m²"},
                    {"label": "Heart Rate", "value": "66", "unit": "BPM"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Routine Chemistries",
                "rows": [
                    {"name": "Total Cholesterol", "value": 170.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "NORMAL", "highlight": True, "method": "Enzymatic"},
                    {"name": "HDL Cholesterol", "value": 62.0, "unit": "mg/dL", "referenceRange": "> 50.0", "flag": "NORMAL", "highlight": True, "method": "Direct"},
                    {"name": "Serum Creatinine", "value": 0.80, "unit": "mg/dL", "referenceRange": "0.50 - 1.10", "flag": "NORMAL", "highlight": True, "method": "Jaffe"},
                    {"name": "Fasting Blood Glucose", "value": 87.0, "unit": "mg/dL", "referenceRange": "70.0 - 99.0", "flag": "NORMAL", "method": "Hexokinase"},
                    {"name": "HbA1c", "value": 5.1, "unit": "%", "referenceRange": "4.0 - 5.6", "flag": "NORMAL", "method": "HPLC"}
                ]
            }
        ]
    })

    # =========================================================================
    # CATEGORY 03: BORDERLINE CASES (4 reports)
    # =========================================================================
    catalog.append({
        "folder": "03_borderline_cases",
        "reportId": "SYN-B001-R01",
        "patient": {
            "patientId": "SYN-B001",
            "name": "Test Patient B001",
            "age": 51,
            "sex": 1,
            "sexStr": "Male",
            "dob": "1974-01-19"
        },
        "reportDate": "2025-06-18",
        "reportType": "general_lab_report",
        "clinicalScenario": "borderline",
        "clinicalIndication": "Borderline risk assessment — mildly elevated BMI and prehypertension",
        "referringDoctor": "Dr. Marcus Thorne, MD",
        "expectedExtraction": {
            "age": 51, "sex": 1, "bmi": 27.2, "systolicBP": 128.0, "diastolicBP": 82.0,
            "totalCholesterol": 208.0, "hdl": 46.0, "creatinine": 1.02,
            "fastingGlucose": 106.0, "hba1c": 5.8
        },
        "modelRelevantFeatures": {
            "age": 51, "sex": 1, "bmi": 27.2, "systolic_bp": 128.0, "diastolic_bp": 82.0,
            "total_cholesterol": 208.0, "hdl": 46.0, "creatinine": 1.02
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": None,
        "sections": [
            {
                "type": "vitals",
                "title": "Vital Signs",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "128/82", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "27.2", "unit": "kg/m²"},
                    {"label": "Heart Rate", "value": "74", "unit": "BPM"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Cardiometabolic Markers",
                "rows": [
                    {"name": "Total Cholesterol", "value": 208.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "HIGH", "highlight": True, "method": "Enzymatic"},
                    {"name": "HDL Cholesterol", "value": 46.0, "unit": "mg/dL", "referenceRange": "> 40.0", "flag": "NORMAL", "highlight": True, "method": "Direct"},
                    {"name": "Serum Creatinine", "value": 1.02, "unit": "mg/dL", "referenceRange": "0.70 - 1.20", "flag": "NORMAL", "highlight": True, "method": "Jaffe"},
                    {"name": "Fasting Blood Sugar", "value": 106.0, "unit": "mg/dL", "referenceRange": "70.0 - 99.0", "flag": "HIGH", "method": "Hexokinase"},
                    {"name": "HbA1c", "value": 5.8, "unit": "%", "referenceRange": "4.0 - 5.6", "flag": "HIGH", "method": "HPLC"}
                ]
            }
        ]
    })

    catalog.append({
        "folder": "03_borderline_cases",
        "reportId": "SYN-B002-R01",
        "patient": {
            "patientId": "SYN-B002",
            "name": "Test Patient B002",
            "age": 46,
            "sex": 0,
            "sexStr": "Female",
            "dob": "1979-05-30"
        },
        "reportDate": "2025-07-22",
        "reportType": "general_lab_report",
        "clinicalScenario": "borderline",
        "clinicalIndication": "Metabolic review — pre-diabetic glycemic range and mild overweight",
        "referringDoctor": "Dr. Brenda Vance, MD",
        "expectedExtraction": {
            "age": 46, "sex": 0, "bmi": 28.1, "systolicBP": 132.0, "diastolicBP": 84.0,
            "totalCholesterol": 202.0, "hdl": 48.0, "creatinine": 0.88,
            "fastingGlucose": 102.0, "hba1c": 5.7
        },
        "modelRelevantFeatures": {
            "age": 46, "sex": 0, "bmi": 28.1, "systolic_bp": 132.0, "diastolic_bp": 84.0,
            "total_cholesterol": 202.0, "hdl": 48.0, "creatinine": 0.88
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": None,
        "sections": [
            {
                "type": "vitals",
                "title": "Clinic Vitals",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "132/84", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "28.1", "unit": "kg/m²"},
                    {"label": "Pulse Rate", "value": "75", "unit": "BPM"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Laboratory Findings",
                "rows": [
                    {"name": "Total Cholesterol", "value": 202.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "HIGH", "highlight": True, "method": "Enzymatic"},
                    {"name": "HDL Cholesterol", "value": 48.0, "unit": "mg/dL", "referenceRange": "> 50.0", "flag": "LOW", "highlight": True, "method": "Direct"},
                    {"name": "Serum Creatinine", "value": 0.88, "unit": "mg/dL", "referenceRange": "0.50 - 1.10", "flag": "NORMAL", "highlight": True, "method": "Jaffe"},
                    {"name": "Fasting Blood Glucose", "value": 102.0, "unit": "mg/dL", "referenceRange": "70.0 - 99.0", "flag": "HIGH", "method": "Hexokinase"},
                    {"name": "HbA1c", "value": 5.7, "unit": "%", "referenceRange": "4.0 - 5.6", "flag": "HIGH", "method": "HPLC"}
                ]
            }
        ]
    })

    catalog.append({
        "folder": "03_borderline_cases",
        "reportId": "SYN-B003-R01",
        "patient": {
            "patientId": "SYN-B003",
            "name": "Test Patient B003",
            "age": 58,
            "sex": 1,
            "sexStr": "Male",
            "dob": "1967-09-08"
        },
        "reportDate": "2025-08-14",
        "reportType": "general_lab_report",
        "clinicalScenario": "borderline",
        "clinicalIndication": "Borderline cardiometabolic risk monitoring",
        "referringDoctor": "Dr. Alan Price, MD",
        "expectedExtraction": {
            "age": 58, "sex": 1, "bmi": 25.8, "systolicBP": 134.0, "diastolicBP": 86.0,
            "totalCholesterol": 212.0, "hdl": 44.0, "creatinine": 1.06,
            "fastingGlucose": 110.0, "hba1c": 5.9
        },
        "modelRelevantFeatures": {
            "age": 58, "sex": 1, "bmi": 25.8, "systolic_bp": 134.0, "diastolic_bp": 86.0,
            "total_cholesterol": 212.0, "hdl": 44.0, "creatinine": 1.06
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": None,
        "sections": [
            {
                "type": "vitals",
                "title": "Vital Signs",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "134/86", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "25.8", "unit": "kg/m²"},
                    {"label": "Pulse Rate", "value": "78", "unit": "BPM"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Laboratory Tests",
                "rows": [
                    {"name": "Total Cholesterol", "value": 212.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "HIGH", "highlight": True, "method": "Enzymatic"},
                    {"name": "HDL Cholesterol", "value": 44.0, "unit": "mg/dL", "referenceRange": "> 40.0", "flag": "NORMAL", "highlight": True, "method": "Direct"},
                    {"name": "Serum Creatinine", "value": 1.06, "unit": "mg/dL", "referenceRange": "0.70 - 1.20", "flag": "NORMAL", "highlight": True, "method": "Jaffe"},
                    {"name": "Fasting Blood Sugar", "value": 110.0, "unit": "mg/dL", "referenceRange": "70.0 - 99.0", "flag": "HIGH", "method": "Hexokinase"},
                    {"name": "HbA1c", "value": 5.9, "unit": "%", "referenceRange": "4.0 - 5.6", "flag": "HIGH", "method": "HPLC"}
                ]
            }
        ]
    })

    catalog.append({
        "folder": "03_borderline_cases",
        "reportId": "SYN-B004-R01",
        "patient": {
            "patientId": "SYN-B004",
            "name": "Test Patient B004",
            "age": 39,
            "sex": 0,
            "sexStr": "Female",
            "dob": "1986-12-14"
        },
        "reportDate": "2025-09-01",
        "reportType": "general_lab_report",
        "clinicalScenario": "borderline",
        "clinicalIndication": "Metabolic boundary evaluation — borderline BMI and pre-diabetic fasting glucose",
        "referringDoctor": "Dr. Karen Evans, MD",
        "expectedExtraction": {
            "age": 39, "sex": 0, "bmi": 29.4, "systolicBP": 126.0, "diastolicBP": 82.0,
            "totalCholesterol": 194.0, "hdl": 45.0, "creatinine": 0.82,
            "fastingGlucose": 104.0, "hba1c": 5.7
        },
        "modelRelevantFeatures": {
            "age": 39, "sex": 0, "bmi": 29.4, "systolic_bp": 126.0, "diastolic_bp": 82.0,
            "total_cholesterol": 194.0, "hdl": 45.0, "creatinine": 0.82
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": None,
        "sections": [
            {
                "type": "vitals",
                "title": "Clinic Examination",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "126/82", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "29.4", "unit": "kg/m²"},
                    {"label": "Heart Rate", "value": "72", "unit": "BPM"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Serum Profile",
                "rows": [
                    {"name": "Total Cholesterol", "value": 194.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "NORMAL", "highlight": True, "method": "Enzymatic"},
                    {"name": "HDL Cholesterol", "value": 45.0, "unit": "mg/dL", "referenceRange": "> 50.0", "flag": "LOW", "highlight": True, "method": "Direct"},
                    {"name": "Serum Creatinine", "value": 0.82, "unit": "mg/dL", "referenceRange": "0.50 - 1.10", "flag": "NORMAL", "highlight": True, "method": "Jaffe"},
                    {"name": "Fasting Blood Glucose", "value": 104.0, "unit": "mg/dL", "referenceRange": "70.0 - 99.0", "flag": "HIGH", "method": "Hexokinase"},
                    {"name": "HbA1c", "value": 5.7, "unit": "%", "referenceRange": "4.0 - 5.6", "flag": "HIGH", "method": "HPLC"}
                ]
            }
        ]
    })

    # =========================================================================
    # CATEGORY 04: MISSING DATA CASES (4 reports)
    # =========================================================================
    catalog.append({
        "folder": "04_missing_data",
        "reportId": "SYN-M001-R01",
        "patient": {
            "patientId": "SYN-MIS1",
            "name": "Test Patient MIS1",
            "age": 42,
            "sex": 1,
            "sexStr": "Male",
            "dob": "1983-04-10"
        },
        "reportDate": "2025-05-20",
        "reportType": "complete_blood_count",
        "clinicalScenario": "insufficient_data_cbc_only",
        "clinicalIndication": "Evaluation of fatigue — complete blood count only",
        "referringDoctor": "Dr. Marcus Thorne, MD",
        "expectedExtraction": {
            "age": 42, "sex": 1, "hemoglobin": 14.8, "rbcCount": 4.9, "wbcCount": 6800.0,
            "plateletCount": 240000.0, "pcv": 44.0, "mcv": 88.0, "mch": 29.5, "mchc": 33.5, "rdw": 12.8
        },
        "modelRelevantFeatures": {
            "age": 42, "sex": 1, "bmi": None, "systolic_bp": None, "diastolic_bp": None,
            "total_cholesterol": None, "hdl": None, "creatinine": None
        },
        "missingFields": ["bmi", "systolic_bp", "diastolic_bp", "total_cholesterol", "hdl", "creatinine"],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": None,
        "sections": [
            {
                "type": "lab_table",
                "title": "Complete Blood Count (CBC / Hemogram)",
                "rows": [
                    {"name": "Hemoglobin (Hb)", "value": 14.8, "unit": "g/dL", "referenceRange": "13.0 - 17.0", "flag": "NORMAL", "highlight": True, "method": "SLS-Hemoglobin"},
                    {"name": "Total RBC count", "value": 4.9, "unit": "mill/cumm", "referenceRange": "4.5 - 5.5", "flag": "NORMAL", "method": "Impedance"},
                    {"name": "Total WBC count", "value": 6800.0, "unit": "cumm", "referenceRange": "4000 - 11000", "flag": "NORMAL", "method": "Flow Cytometry"},
                    {"name": "Platelet Count", "value": 240000.0, "unit": "cumm", "referenceRange": "150000 - 450000", "flag": "NORMAL", "method": "Impedance"},
                    {"name": "Packed Cell Volume (PCV)", "value": 44.0, "unit": "%", "referenceRange": "40.0 - 50.0", "flag": "NORMAL", "method": "Calculated"},
                    {"name": "Mean Corpuscular Volume (MCV)", "value": 88.0, "unit": "fL", "referenceRange": "80.0 - 100.0", "flag": "NORMAL", "method": "Measured"},
                    {"name": "MCH", "value": 29.5, "unit": "pg", "referenceRange": "27.0 - 32.0", "flag": "NORMAL", "method": "Calculated"},
                    {"name": "MCHC", "value": 33.5, "unit": "g/dL", "referenceRange": "32.0 - 36.0", "flag": "NORMAL", "method": "Calculated"},
                    {"name": "RDW", "value": 12.8, "unit": "%", "referenceRange": "11.5 - 14.5", "flag": "NORMAL", "method": "Calculated"}
                ]
            },
            {
                "type": "text",
                "title": "Laboratory Remarks",
                "content": "Normal Complete Blood Count. No hematological abnormalities detected. Note: This report contains hematology parameters exclusively; routine physical vitals and metabolic chemistries are not included."
            }
        ]
    })

    catalog.append({
        "folder": "04_missing_data",
        "reportId": "SYN-M002-R01",
        "patient": {
            "patientId": "SYN-MIS2",
            "name": "Test Patient MIS2",
            "age": 50,
            "sex": 0,
            "sexStr": "Female",
            "dob": "1975-02-18"
        },
        "reportDate": "2025-06-12",
        "reportType": "renal_function",
        "clinicalScenario": "insufficient_data_missing_physical",
        "clinicalIndication": "Renal function screening — laboratory only, no physical examination documented",
        "referringDoctor": "Dr. Eleanor Wright, MD",
        "expectedExtraction": {
            "age": 50, "sex": 0, "creatinine": 0.88, "hemoglobin": 12.5
        },
        "modelRelevantFeatures": {
            "age": 50, "sex": 0, "bmi": None, "systolic_bp": None, "diastolic_bp": None,
            "total_cholesterol": None, "hdl": None, "creatinine": 0.88
        },
        "missingFields": ["bmi", "systolic_bp", "diastolic_bp", "total_cholesterol", "hdl"],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": None,
        "sections": [
            {
                "type": "lab_table",
                "title": "Renal Profile & Hemoglobin",
                "rows": [
                    {"name": "Serum Creatinine", "value": 0.88, "unit": "mg/dL", "referenceRange": "0.50 - 1.10", "flag": "NORMAL", "highlight": True, "method": "Jaffe Picrate"},
                    {"name": "Blood Urea Nitrogen (BUN)", "value": 14.0, "unit": "mg/dL", "referenceRange": "7.0 - 20.0", "flag": "NORMAL", "method": "GLDH Kinetic"},
                    {"name": "Hemoglobin (Hb)", "value": 12.5, "unit": "g/dL", "referenceRange": "12.0 - 15.0", "flag": "NORMAL", "method": "SLS"}
                ]
            },
            {
                "type": "text",
                "title": "Laboratory Notes",
                "content": "Kidney function within normal limits. Note: Patient vitals (Blood Pressure, BMI) and lipid panel were not ordered on this accession."
            }
        ]
    })

    catalog.append({
        "folder": "04_missing_data",
        "reportId": "SYN-M003-R01",
        "patient": {
            "patientId": "SYN-MIS3",
            "name": "Test Patient MIS3",
            "age": 36,
            "sex": 1,
            "sexStr": "Male",
            "dob": "1989-11-29"
        },
        "reportDate": "2025-07-08",
        "reportType": "lipid_profile",
        "clinicalScenario": "insufficient_data_lipid_only",
        "clinicalIndication": "Direct-to-consumer screening — lipid profile only",
        "referringDoctor": "Dr. Alan Price, MD",
        "expectedExtraction": {
            "age": 36, "sex": 1, "totalCholesterol": 215.0, "hdl": 42.0
        },
        "modelRelevantFeatures": {
            "age": 36, "sex": 1, "bmi": None, "systolic_bp": None, "diastolic_bp": None,
            "total_cholesterol": 215.0, "hdl": 42.0, "creatinine": None
        },
        "missingFields": ["bmi", "systolic_bp", "diastolic_bp", "creatinine"],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": None,
        "sections": [
            {
                "type": "lab_table",
                "title": "Lipid Profile Panel",
                "rows": [
                    {"name": "Total Cholesterol", "value": 215.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "HIGH", "highlight": True, "method": "CHOD-PAP"},
                    {"name": "HDL Cholesterol", "value": 42.0, "unit": "mg/dL", "referenceRange": "> 40.0", "flag": "NORMAL", "highlight": True, "method": "Direct"},
                    {"name": "Triglycerides", "value": 190.0, "unit": "mg/dL", "referenceRange": "< 150.0", "flag": "HIGH", "method": "GPO-PAP"},
                    {"name": "LDL Cholesterol", "value": 135.0, "unit": "mg/dL", "referenceRange": "< 100.0", "flag": "HIGH", "method": "Friedewald"}
                ]
            }
        ]
    })

    catalog.append({
        "folder": "04_missing_data",
        "reportId": "SYN-M004-R01",
        "patient": {
            "patientId": "SYN-MIS4",
            "name": "Test Patient MIS4",
            "age": 55,
            "sex": 0,
            "sexStr": "Female",
            "dob": "1970-03-12"
        },
        "reportDate": "2025-08-19",
        "reportType": "general_lab_report",
        "clinicalScenario": "partial_data_calculable",
        "clinicalIndication": "Nutritional and lipid consultation — BMI measured, no BP recorded, no creatinine",
        "referringDoctor": "Dr. Brenda Vance, MD",
        "expectedExtraction": {
            "age": 55, "sex": 0, "bmi": 31.0, "totalCholesterol": 220.0, "hdl": 38.0
        },
        "modelRelevantFeatures": {
            "age": 55, "sex": 0, "bmi": 31.0, "systolic_bp": None, "diastolic_bp": None,
            "total_cholesterol": 220.0, "hdl": 38.0, "creatinine": None
        },
        "missingFields": ["systolic_bp", "diastolic_bp", "creatinine"],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": None,
        "sections": [
            {
                "type": "vitals",
                "title": "Anthropometric Measurements",
                "items": [
                    {"label": "Body Mass Index (BMI)", "value": "31.0", "unit": "kg/m²"},
                    {"label": "Height", "value": "162", "unit": "cm"},
                    {"label": "Weight", "value": "81.4", "unit": "kg"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Lipid Chemistries",
                "rows": [
                    {"name": "Total Cholesterol", "value": 220.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "HIGH", "highlight": True, "method": "Enzymatic"},
                    {"name": "HDL Cholesterol", "value": 38.0, "unit": "mg/dL", "referenceRange": "> 50.0", "flag": "LOW", "highlight": True, "method": "Direct"}
                ]
            },
            {
                "type": "text",
                "title": "Clinical Context",
                "content": "Patient completed nutritional assessment. Blood pressure was deferred for clinic visit. Satisfies Demographic, Physical (BMI), and Laboratory (TC/HDL) minimum domains."
            }
        ]
    })

    # =========================================================================
    # CATEGORY 05: MULTI-REPORT PATIENT HISTORIES (10 reports across 4 patients)
    # =========================================================================
    # Patient SYN-L001 (Progressive Risk Trajectory)
    catalog.append({
        "folder": "05_multi_report_patients",
        "reportId": "SYN-L001-R01",
        "patient": {
            "patientId": "SYN-L001",
            "name": "Test Patient L001",
            "age": 48,
            "sex": 1,
            "sexStr": "Male",
            "dob": "1977-03-10"
        },
        "reportDate": "2025-02-10",
        "reportType": "general_lab_report",
        "clinicalScenario": "multi_report_baseline",
        "clinicalIndication": "Longitudinal follow-up: Baseline annual health checkup",
        "referringDoctor": "Dr. Marcus Thorne, MD",
        "expectedExtraction": {
            "age": 48, "sex": 1, "bmi": 25.2, "systolicBP": 124.0, "diastolicBP": 80.0,
            "totalCholesterol": 192.0, "hdl": 50.0, "creatinine": 0.95
        },
        "modelRelevantFeatures": {
            "age": 48, "sex": 1, "bmi": 25.2, "systolic_bp": 124.0, "diastolic_bp": 80.0,
            "total_cholesterol": 192.0, "hdl": 50.0, "creatinine": 0.95
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": "SYN-L001",
        "sections": [
            {
                "type": "vitals",
                "title": "Baseline Clinic Vitals (Visit 1)",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "124/80", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "25.2", "unit": "kg/m²"},
                    {"label": "Heart Rate", "value": "72", "unit": "BPM"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Chemistries & Lipids",
                "rows": [
                    {"name": "Total Cholesterol", "value": 192.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "NORMAL", "highlight": True, "method": "Enzymatic"},
                    {"name": "HDL Cholesterol", "value": 50.0, "unit": "mg/dL", "referenceRange": "> 40.0", "flag": "NORMAL", "highlight": True, "method": "Direct"},
                    {"name": "Serum Creatinine", "value": 0.95, "unit": "mg/dL", "referenceRange": "0.70 - 1.20", "flag": "NORMAL", "highlight": True, "method": "Jaffe"}
                ]
            }
        ]
    })

    catalog.append({
        "folder": "05_multi_report_patients",
        "reportId": "SYN-L001-R02",
        "patient": {
            "patientId": "SYN-L001",
            "name": "Test Patient L001",
            "age": 48,
            "sex": 1,
            "sexStr": "Male",
            "dob": "1977-03-10"
        },
        "reportDate": "2025-08-15",
        "reportType": "general_lab_report",
        "clinicalScenario": "multi_report_midterm",
        "clinicalIndication": "Longitudinal follow-up: 6-month mid-year review (noted weight gain and BP rise)",
        "referringDoctor": "Dr. Marcus Thorne, MD",
        "expectedExtraction": {
            "age": 48, "sex": 1, "bmi": 26.5, "systolicBP": 132.0, "diastolicBP": 84.0,
            "totalCholesterol": 208.0, "hdl": 46.0, "creatinine": 0.98
        },
        "modelRelevantFeatures": {
            "age": 48, "sex": 1, "bmi": 26.5, "systolic_bp": 132.0, "diastolic_bp": 84.0,
            "total_cholesterol": 208.0, "hdl": 46.0, "creatinine": 0.98
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": "SYN-L001",
        "sections": [
            {
                "type": "vitals",
                "title": "Midterm Clinic Vitals (Visit 2)",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "132/84", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "26.5", "unit": "kg/m²"},
                    {"label": "Heart Rate", "value": "76", "unit": "BPM"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Chemistries & Lipids",
                "rows": [
                    {"name": "Total Cholesterol", "value": 208.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "HIGH", "highlight": True, "method": "Enzymatic"},
                    {"name": "HDL Cholesterol", "value": 46.0, "unit": "mg/dL", "referenceRange": "> 40.0", "flag": "NORMAL", "highlight": True, "method": "Direct"},
                    {"name": "Serum Creatinine", "value": 0.98, "unit": "mg/dL", "referenceRange": "0.70 - 1.20", "flag": "NORMAL", "highlight": True, "method": "Jaffe"}
                ]
            }
        ]
    })

    catalog.append({
        "folder": "05_multi_report_patients",
        "reportId": "SYN-L001-R03",
        "patient": {
            "patientId": "SYN-L001",
            "name": "Test Patient L001",
            "age": 49,
            "sex": 1,
            "sexStr": "Male",
            "dob": "1977-03-10"
        },
        "reportDate": "2026-02-20",
        "reportType": "general_lab_report",
        "clinicalScenario": "multi_report_progression",
        "clinicalIndication": "Longitudinal follow-up: 12-month annual review (progressive cardiometabolic elevation)",
        "referringDoctor": "Dr. Marcus Thorne, MD",
        "expectedExtraction": {
            "age": 49, "sex": 1, "bmi": 28.2, "systolicBP": 140.0, "diastolicBP": 88.0,
            "totalCholesterol": 226.0, "hdl": 41.0, "creatinine": 1.05
        },
        "modelRelevantFeatures": {
            "age": 49, "sex": 1, "bmi": 28.2, "systolic_bp": 140.0, "diastolic_bp": 88.0,
            "total_cholesterol": 226.0, "hdl": 41.0, "creatinine": 1.05
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": "SYN-L001",
        "sections": [
            {
                "type": "vitals",
                "title": "Annual Review Vitals (Visit 3)",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "140/88", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "28.2", "unit": "kg/m²"},
                    {"label": "Heart Rate", "value": "80", "unit": "BPM"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Chemistries & Lipids",
                "rows": [
                    {"name": "Total Cholesterol", "value": 226.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "HIGH", "highlight": True, "method": "Enzymatic"},
                    {"name": "HDL Cholesterol", "value": 41.0, "unit": "mg/dL", "referenceRange": "> 40.0", "flag": "NORMAL", "highlight": True, "method": "Direct"},
                    {"name": "Serum Creatinine", "value": 1.05, "unit": "mg/dL", "referenceRange": "0.70 - 1.20", "flag": "NORMAL", "highlight": True, "method": "Jaffe"}
                ]
            }
        ]
    })

    # Patient SYN-L002 (Lifestyle Improvement Trajectory)
    catalog.append({
        "folder": "05_multi_report_patients",
        "reportId": "SYN-L002-R01",
        "patient": {
            "patientId": "SYN-L002",
            "name": "Test Patient L002",
            "age": 56,
            "sex": 0,
            "sexStr": "Female",
            "dob": "1969-10-15"
        },
        "reportDate": "2025-01-20",
        "reportType": "general_lab_report",
        "clinicalScenario": "multi_report_intervention_baseline",
        "clinicalIndication": "Initial metabolic evaluation prior to diet and exercise intervention",
        "referringDoctor": "Dr. Brenda Vance, MD",
        "expectedExtraction": {
            "age": 56, "sex": 0, "bmi": 32.0, "systolicBP": 148.0, "diastolicBP": 92.0,
            "totalCholesterol": 245.0, "hdl": 38.0, "creatinine": 1.10
        },
        "modelRelevantFeatures": {
            "age": 56, "sex": 0, "bmi": 32.0, "systolic_bp": 148.0, "diastolic_bp": 92.0,
            "total_cholesterol": 245.0, "hdl": 38.0, "creatinine": 1.10
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": "SYN-L002",
        "sections": [
            {
                "type": "vitals",
                "title": "Baseline Examination (Pre-Intervention)",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "148/92", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "32.0", "unit": "kg/m²"},
                    {"label": "Heart Rate", "value": "82", "unit": "BPM"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Lipid & Renal Profile",
                "rows": [
                    {"name": "Total Cholesterol", "value": 245.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "HIGH", "highlight": True, "method": "Enzymatic"},
                    {"name": "HDL Cholesterol", "value": 38.0, "unit": "mg/dL", "referenceRange": "> 50.0", "flag": "LOW", "highlight": True, "method": "Direct"},
                    {"name": "Serum Creatinine", "value": 1.10, "unit": "mg/dL", "referenceRange": "0.50 - 1.10", "flag": "NORMAL", "highlight": True, "method": "Jaffe"}
                ]
            }
        ]
    })

    catalog.append({
        "folder": "05_multi_report_patients",
        "reportId": "SYN-L002-R02",
        "patient": {
            "patientId": "SYN-L002",
            "name": "Test Patient L002",
            "age": 56,
            "sex": 0,
            "sexStr": "Female",
            "dob": "1969-10-15"
        },
        "reportDate": "2025-07-25",
        "reportType": "general_lab_report",
        "clinicalScenario": "multi_report_intervention_progress",
        "clinicalIndication": "6-month post-lifestyle modification follow-up (demonstrating early response)",
        "referringDoctor": "Dr. Brenda Vance, MD",
        "expectedExtraction": {
            "age": 56, "sex": 0, "bmi": 29.8, "systolicBP": 136.0, "diastolicBP": 86.0,
            "totalCholesterol": 218.0, "hdl": 44.0, "creatinine": 1.02
        },
        "modelRelevantFeatures": {
            "age": 56, "sex": 0, "bmi": 29.8, "systolic_bp": 136.0, "diastolic_bp": 86.0,
            "total_cholesterol": 218.0, "hdl": 44.0, "creatinine": 1.02
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": "SYN-L002",
        "sections": [
            {
                "type": "vitals",
                "title": "6-Month Evaluation Vitals",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "136/86", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "29.8", "unit": "kg/m²"},
                    {"label": "Heart Rate", "value": "74", "unit": "BPM"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Lipid & Renal Profile",
                "rows": [
                    {"name": "Total Cholesterol", "value": 218.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "HIGH", "highlight": True, "method": "Enzymatic"},
                    {"name": "HDL Cholesterol", "value": 44.0, "unit": "mg/dL", "referenceRange": "> 50.0", "flag": "LOW", "highlight": True, "method": "Direct"},
                    {"name": "Serum Creatinine", "value": 1.02, "unit": "mg/dL", "referenceRange": "0.50 - 1.10", "flag": "NORMAL", "highlight": True, "method": "Jaffe"}
                ]
            }
        ]
    })

    catalog.append({
        "folder": "05_multi_report_patients",
        "reportId": "SYN-L002-R03",
        "patient": {
            "patientId": "SYN-L002",
            "name": "Test Patient L002",
            "age": 57,
            "sex": 0,
            "sexStr": "Female",
            "dob": "1969-10-15"
        },
        "reportDate": "2026-01-30",
        "reportType": "general_lab_report",
        "clinicalScenario": "multi_report_intervention_success",
        "clinicalIndication": "12-month post-intervention follow-up (significant risk reduction)",
        "referringDoctor": "Dr. Brenda Vance, MD",
        "expectedExtraction": {
            "age": 57, "sex": 0, "bmi": 27.9, "systolicBP": 128.0, "diastolicBP": 82.0,
            "totalCholesterol": 198.0, "hdl": 49.0, "creatinine": 0.96
        },
        "modelRelevantFeatures": {
            "age": 57, "sex": 0, "bmi": 27.9, "systolic_bp": 128.0, "diastolic_bp": 82.0,
            "total_cholesterol": 198.0, "hdl": 49.0, "creatinine": 0.96
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": "SYN-L002",
        "sections": [
            {
                "type": "vitals",
                "title": "12-Month Evaluation Vitals",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "128/82", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "27.9", "unit": "kg/m²"},
                    {"label": "Heart Rate", "value": "70", "unit": "BPM"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Lipid & Renal Profile",
                "rows": [
                    {"name": "Total Cholesterol", "value": 198.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "NORMAL", "highlight": True, "method": "Enzymatic"},
                    {"name": "HDL Cholesterol", "value": 49.0, "unit": "mg/dL", "referenceRange": "> 50.0", "flag": "NORMAL", "highlight": True, "method": "Direct"},
                    {"name": "Serum Creatinine", "value": 0.96, "unit": "mg/dL", "referenceRange": "0.50 - 1.10", "flag": "NORMAL", "highlight": True, "method": "Jaffe"}
                ]
            }
        ]
    })

    # Patient SYN-L003 (Complementary Reports on Close Dates)
    catalog.append({
        "folder": "05_multi_report_patients",
        "reportId": "SYN-L003-R01",
        "patient": {
            "patientId": "SYN-L003",
            "name": "Test Patient L003",
            "age": 63,
            "sex": 1,
            "sexStr": "Male",
            "dob": "1962-12-05"
        },
        "reportDate": "2025-04-12",
        "reportType": "general_lab_report",
        "clinicalScenario": "multi_report_split_vitals",
        "clinicalIndication": "Visit Part 1: Clinical consultation, vitals, and CBC",
        "referringDoctor": "Dr. Alan Price, MD",
        "expectedExtraction": {
            "age": 63, "sex": 1, "bmi": 27.5, "systolicBP": 138.0, "diastolicBP": 88.0,
            "hemoglobin": 15.1
        },
        "modelRelevantFeatures": {
            "age": 63, "sex": 1, "bmi": 27.5, "systolic_bp": 138.0, "diastolic_bp": 88.0,
            "total_cholesterol": None, "hdl": None, "creatinine": None
        },
        "missingFields": ["total_cholesterol", "hdl", "creatinine"],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": "SYN-L003",
        "sections": [
            {
                "type": "vitals",
                "title": "Clinical Examination & Vitals",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "138/88", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "27.5", "unit": "kg/m²"},
                    {"label": "Heart Rate", "value": "76", "unit": "BPM"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Complete Blood Count",
                "rows": [
                    {"name": "Hemoglobin (Hb)", "value": 15.1, "unit": "g/dL", "referenceRange": "13.0 - 17.0", "flag": "NORMAL", "highlight": True, "method": "SLS"}
                ]
            }
        ]
    })

    catalog.append({
        "folder": "05_multi_report_patients",
        "reportId": "SYN-L003-R02",
        "patient": {
            "patientId": "SYN-L003",
            "name": "Test Patient L003",
            "age": 63,
            "sex": 1,
            "sexStr": "Male",
            "dob": "1962-12-05"
        },
        "reportDate": "2025-04-14",
        "reportType": "lipid_profile",
        "clinicalScenario": "multi_report_split_labs",
        "clinicalIndication": "Visit Part 2: Fasting laboratory blood draw (lipid & renal profile)",
        "referringDoctor": "Dr. Alan Price, MD",
        "expectedExtraction": {
            "age": 63, "sex": 1, "totalCholesterol": 224.0, "hdl": 43.0, "creatinine": 1.12
        },
        "modelRelevantFeatures": {
            "age": 63, "sex": 1, "bmi": None, "systolic_bp": None, "diastolic_bp": None,
            "total_cholesterol": 224.0, "hdl": 43.0, "creatinine": 1.12
        },
        "missingFields": ["bmi", "systolic_bp", "diastolic_bp"],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": "SYN-L003",
        "sections": [
            {
                "type": "lab_table",
                "title": "Lipid & Renal Profile Panel",
                "rows": [
                    {"name": "Total Cholesterol", "value": 224.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "HIGH", "highlight": True, "method": "Enzymatic"},
                    {"name": "HDL Cholesterol", "value": 43.0, "unit": "mg/dL", "referenceRange": "> 40.0", "flag": "NORMAL", "highlight": True, "method": "Direct"},
                    {"name": "Serum Creatinine", "value": 1.12, "unit": "mg/dL", "referenceRange": "0.70 - 1.20", "flag": "NORMAL", "highlight": True, "method": "Jaffe"}
                ]
            }
        ]
    })

    # Patient SYN-L004 (Stable Healthy Postpartum Trajectory)
    catalog.append({
        "folder": "05_multi_report_patients",
        "reportId": "SYN-L004-R01",
        "patient": {
            "patientId": "SYN-L004",
            "name": "Test Patient L004",
            "age": 34,
            "sex": 0,
            "sexStr": "Female",
            "dob": "1991-08-22"
        },
        "reportDate": "2025-03-10",
        "reportType": "general_lab_report",
        "clinicalScenario": "multi_report_stable_1",
        "clinicalIndication": "Postpartum 6-month wellness review",
        "referringDoctor": "Dr. Karen Evans, MD",
        "expectedExtraction": {
            "age": 34, "sex": 0, "bmi": 26.4, "systolicBP": 120.0, "diastolicBP": 78.0,
            "totalCholesterol": 184.0, "hdl": 54.0, "creatinine": 0.78
        },
        "modelRelevantFeatures": {
            "age": 34, "sex": 0, "bmi": 26.4, "systolic_bp": 120.0, "diastolic_bp": 78.0,
            "total_cholesterol": 184.0, "hdl": 54.0, "creatinine": 0.78
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": "SYN-L004",
        "sections": [
            {
                "type": "vitals",
                "title": "Postpartum Clinic Vitals",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "120/78", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "26.4", "unit": "kg/m²"},
                    {"label": "Heart Rate", "value": "72", "unit": "BPM"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Routine Chemistries",
                "rows": [
                    {"name": "Total Cholesterol", "value": 184.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "NORMAL", "highlight": True, "method": "Enzymatic"},
                    {"name": "HDL Cholesterol", "value": 54.0, "unit": "mg/dL", "referenceRange": "> 50.0", "flag": "NORMAL", "highlight": True, "method": "Direct"},
                    {"name": "Serum Creatinine", "value": 0.78, "unit": "mg/dL", "referenceRange": "0.50 - 1.10", "flag": "NORMAL", "highlight": True, "method": "Jaffe"}
                ]
            }
        ]
    })

    catalog.append({
        "folder": "05_multi_report_patients",
        "reportId": "SYN-L004-R02",
        "patient": {
            "patientId": "SYN-L004",
            "name": "Test Patient L004",
            "age": 35,
            "sex": 0,
            "sexStr": "Female",
            "dob": "1991-08-22"
        },
        "reportDate": "2026-03-15",
        "reportType": "general_lab_report",
        "clinicalScenario": "multi_report_stable_2",
        "clinicalIndication": "Annual preventative follow-up (weight normalized to baseline)",
        "referringDoctor": "Dr. Karen Evans, MD",
        "expectedExtraction": {
            "age": 35, "sex": 0, "bmi": 24.5, "systolicBP": 116.0, "diastolicBP": 74.0,
            "totalCholesterol": 176.0, "hdl": 58.0, "creatinine": 0.75
        },
        "modelRelevantFeatures": {
            "age": 35, "sex": 0, "bmi": 24.5, "systolic_bp": 116.0, "diastolic_bp": 74.0,
            "total_cholesterol": 176.0, "hdl": 58.0, "creatinine": 0.75
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": "SYN-L004",
        "sections": [
            {
                "type": "vitals",
                "title": "Annual Clinic Vitals",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "116/74", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "24.5", "unit": "kg/m²"},
                    {"label": "Heart Rate", "value": "68", "unit": "BPM"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Routine Chemistries",
                "rows": [
                    {"name": "Total Cholesterol", "value": 176.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "NORMAL", "highlight": True, "method": "Enzymatic"},
                    {"name": "HDL Cholesterol", "value": 58.0, "unit": "mg/dL", "referenceRange": "> 50.0", "flag": "NORMAL", "highlight": True, "method": "Direct"},
                    {"name": "Serum Creatinine", "value": 0.75, "unit": "mg/dL", "referenceRange": "0.50 - 1.10", "flag": "NORMAL", "highlight": True, "method": "Jaffe"}
                ]
            }
        ]
    })

    # =========================================================================
    # CATEGORY 06: OCR CHALLENGE REPORTS (3 reports)
    # =========================================================================
    catalog.append({
        "folder": "06_ocr_challenging",
        "reportId": "SYN-OCR1-R01",
        "patient": {
            "patientId": "SYN-OCR1",
            "name": "Test Patient OCR1",
            "age": 52,
            "sex": 1,
            "sexStr": "Male",
            "dob": "1973-04-12"
        },
        "reportDate": "2025-06-18",
        "reportType": "general_lab_report",
        "clinicalScenario": "ocr_dense_abbreviations",
        "clinicalIndication": "Dense multi-column report with clinical abbreviations (SBP, DBP, Chol, Creat)",
        "referringDoctor": "Dr. Marcus Thorne, MD",
        "expectedExtraction": {
            "age": 52, "sex": 1, "bmi": 30.8, "systolicBP": 144.0, "diastolicBP": 88.0,
            "totalCholesterol": 232.0, "hdl": 39.0, "creatinine": 1.18
        },
        "modelRelevantFeatures": {
            "age": 52, "sex": 1, "bmi": 30.8, "systolic_bp": 144.0, "diastolic_bp": 88.0,
            "total_cholesterol": 232.0, "hdl": 39.0, "creatinine": 1.18
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "HIGH_DENSE_ABBREVIATIONS",
        "multiReportGroup": None,
        "sections": [
            {
                "type": "vitals",
                "title": "Vitals & Anthropometry (Abbreviated Form)",
                "items": [
                    {"label": "Systolic BP (SBP)", "value": "144", "unit": "mmHg"},
                    {"label": "Diastolic BP (DBP)", "value": "88", "unit": "mmHg"},
                    {"label": "BMI", "value": "30.8", "unit": "kg/m2"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Compact Diagnostic Grid",
                "rows": [
                    {"name": "Cholesterol (Total)", "value": 232.0, "unit": "mg/dL", "referenceRange": "125 - 200", "flag": "HIGH", "highlight": True, "method": "Enz"},
                    {"name": "HDL-Cholesterol", "value": 39.0, "unit": "mg/dL", "referenceRange": "> 40", "flag": "LOW", "highlight": True, "method": "Dir"},
                    {"name": "Serum Creatinine (Creat.)", "value": 1.18, "unit": "mg/dL", "referenceRange": "0.7 - 1.2", "flag": "NORMAL", "highlight": True, "method": "Jaf"}
                ]
            }
        ]
    })

    catalog.append({
        "folder": "06_ocr_challenging",
        "reportId": "SYN-OCR2-R01",
        "patient": {
            "patientId": "SYN-OCR2",
            "name": "Test Patient OCR2",
            "age": 47,
            "sex": 0,
            "sexStr": "Female",
            "dob": "1978-01-25"
        },
        "reportDate": "2025-07-14",
        "reportType": "general_lab_report",
        "clinicalScenario": "ocr_wrapped_labels_commas",
        "clinicalIndication": "Multi-section report with wrapped parameter labels and commas",
        "referringDoctor": "Dr. Brenda Vance, MD",
        "expectedExtraction": {
            "age": 47, "sex": 0, "bmi": 28.4, "systolicBP": 138.0, "diastolicBP": 86.0,
            "totalCholesterol": 214.0, "hdl": 43.0, "creatinine": 1.04
        },
        "modelRelevantFeatures": {
            "age": 47, "sex": 0, "bmi": 28.4, "systolic_bp": 138.0, "diastolic_bp": 86.0,
            "total_cholesterol": 214.0, "hdl": 43.0, "creatinine": 1.04
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "HIGH_WRAPPED_TABLES",
        "multiReportGroup": None,
        "sections": [
            {
                "type": "vitals",
                "title": "Physical Assessment",
                "items": [
                    {"label": "Blood Pressure", "value": "138/86", "unit": "mmHg"},
                    {"label": "Body Mass Index", "value": "28.4", "unit": "kg/m2"},
                    {"label": "Heart Rate", "value": "78", "unit": "BPM"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Comprehensive Biochemistry Panel",
                "rows": [
                    {"name": "Cholesterol, Total", "value": 214.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "HIGH", "highlight": True, "method": "Automated Spectrophotometry"},
                    {"name": "HDL Cholesterol", "value": 43.0, "unit": "mg/dL", "referenceRange": "> 50.0", "flag": "LOW", "highlight": True, "method": "Selective Detergent Acceleration"},
                    {"name": "Serum Creatinine", "value": 1.04, "unit": "mg/dL", "referenceRange": "0.50 - 1.10", "flag": "NORMAL", "highlight": True, "method": "Modified Kinetic Jaffe Reaction"}
                ]
            }
        ]
    })

    catalog.append({
        "folder": "06_ocr_challenging",
        "reportId": "SYN-OCR3-R01",
        "patient": {
            "patientId": "SYN-OCR3",
            "name": "Test Patient OCR3",
            "age": 50,
            "sex": 1,
            "sexStr": "Male",
            "dob": "1975-06-30"
        },
        "reportDate": "2025-08-01",
        "reportType": "general_lab_report",
        "clinicalScenario": "ocr_digit_confusion_normalizer",
        "clinicalIndication": "OCR digit substitution test — tests letter O / numeral 0 normalizer handling",
        "referringDoctor": "Dr. Alan Price, MD",
        "expectedExtraction": {
            "age": 50, "sex": 1, "bmi": 29.5, "systolicBP": 130.0, "diastolicBP": 85.0,
            "totalCholesterol": 205.0, "hdl": 42.0, "creatinine": 1.02
        },
        "modelRelevantFeatures": {
            "age": 50, "sex": 1, "bmi": 29.5, "systolic_bp": 130.0, "diastolic_bp": 85.0,
            "total_cholesterol": 205.0, "hdl": 42.0, "creatinine": 1.02
        },
        "missingFields": [],
        "expectedNormalization": [
            {"parameter": "totalCholesterol", "rawText": "2O5", "normalizedValue": 205.0, "rule": "OCR digit substitution (letter O -> 0)"},
            {"parameter": "systolicBP", "rawText": "13O", "normalizedValue": 130.0, "rule": "OCR digit substitution (letter O -> 0)"}
        ],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "HIGH_OCR_TYPOS",
        "multiReportGroup": None,
        "sections": [
            {
                "type": "vitals",
                "title": "Vital Signs Note",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "130/85", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "29.5", "unit": "kg/m²"},
                    {"label": "Heart Rate", "value": "74", "unit": "BPM"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Blood Chemistries",
                "rows": [
                    {"name": "Total Cholesterol", "value": 205.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "HIGH", "highlight": True, "method": "Enzymatic"},
                    {"name": "HDL Cholesterol", "value": 42.0, "unit": "mg/dL", "referenceRange": "> 40.0", "flag": "NORMAL", "highlight": True, "method": "Direct"},
                    {"name": "Serum Creatinine", "value": 1.02, "unit": "mg/dL", "referenceRange": "0.70 - 1.20", "flag": "NORMAL", "highlight": True, "method": "Jaffe"}
                ]
            }
        ]
    })

    # =========================================================================
    # CATEGORY 07: UNIT VARIATION CASES (2 reports)
    # =========================================================================
    catalog.append({
        "folder": "07_unit_variations",
        "reportId": "SYN-UNT1-R01",
        "patient": {
            "patientId": "SYN-UNT1",
            "name": "Test Patient UNT1",
            "age": 46,
            "sex": 1,
            "sexStr": "Male",
            "dob": "1979-02-14"
        },
        "reportDate": "2025-06-30",
        "reportType": "general_lab_report",
        "clinicalScenario": "si_unit_conversions",
        "clinicalIndication": "International hospital laboratory report utilizing SI Metric units (mmol/L, µmol/L)",
        "referringDoctor": "Dr. Marcus Thorne, MD",
        "expectedExtraction": {
            "age": 46, "sex": 1, "bmi": 27.5, "systolicBP": 130.0, "diastolicBP": 84.0,
            "totalCholesterol": 216.6, "hdl": 42.5, "creatinine": 1.07,
            "fastingGlucose": 111.7
        },
        "modelRelevantFeatures": {
            "age": 46, "sex": 1, "bmi": 27.5, "systolic_bp": 130.0, "diastolic_bp": 84.0,
            "total_cholesterol": 216.6, "hdl": 42.5, "creatinine": 1.07
        },
        "missingFields": [],
        "expectedNormalization": [
            {"parameter": "totalCholesterol", "originalValue": 5.6, "originalUnit": "mmol/L", "normalizedValue": 216.6, "normalizedUnit": "mg/dL", "factor": 38.67},
            {"parameter": "hdl", "originalValue": 1.1, "originalUnit": "mmol/L", "normalizedValue": 42.5, "normalizedUnit": "mg/dL", "factor": 38.67},
            {"parameter": "creatinine", "originalValue": 95.0, "originalUnit": "µmol/L", "normalizedValue": 1.07, "normalizedUnit": "mg/dL", "factor": "1/88.4"},
            {"parameter": "fastingGlucose", "originalValue": 6.2, "originalUnit": "mmol/L", "normalizedValue": 111.7, "normalizedUnit": "mg/dL", "factor": 18.0182}
        ],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": None,
        "sections": [
            {
                "type": "vitals",
                "title": "Clinic Physical Vitals",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "130/84", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "27.5", "unit": "kg/m²"},
                    {"label": "Heart Rate", "value": "72", "unit": "BPM"}
                ]
            },
            {
                "type": "lab_table",
                "title": "International SI Unit Biochemistry Panel",
                "rows": [
                    {"name": "Total Cholesterol", "value": "5.6", "unit": "mmol/L", "referenceRange": "3.2 - 5.2", "flag": "HIGH", "highlight": True, "method": "CHOD-PAP Enzymatic"},
                    {"name": "HDL Cholesterol", "value": "1.1", "unit": "mmol/L", "referenceRange": "> 1.0", "flag": "NORMAL", "highlight": True, "method": "Direct Immuno"},
                    {"name": "Serum Creatinine", "value": "95.0", "unit": "µmol/L", "referenceRange": "62.0 - 106.0", "flag": "NORMAL", "highlight": True, "method": "Kinetic Jaffe"},
                    {"name": "Fasting Blood Glucose", "value": "6.2", "unit": "mmol/L", "referenceRange": "3.9 - 5.5", "flag": "HIGH", "method": "Hexokinase"}
                ]
            }
        ]
    })

    catalog.append({
        "folder": "07_unit_variations",
        "reportId": "SYN-UNT2-R01",
        "patient": {
            "patientId": "SYN-UNT2",
            "name": "Test Patient UNT2",
            "age": 53,
            "sex": 0,
            "sexStr": "Female",
            "dob": "1972-10-08"
        },
        "reportDate": "2025-07-28",
        "reportType": "general_lab_report",
        "clinicalScenario": "alternate_unit_spellings",
        "clinicalIndication": "Laboratory panel utilizing alternate standard unit notations (umol/L, mg%, mm-Hg)",
        "referringDoctor": "Dr. Brenda Vance, MD",
        "expectedExtraction": {
            "age": 53, "sex": 0, "bmi": 28.8, "systolicBP": 142.0, "diastolicBP": 88.0,
            "totalCholesterol": 225.0, "hdl": 44.0, "creatinine": 1.24
        },
        "modelRelevantFeatures": {
            "age": 53, "sex": 0, "bmi": 28.8, "systolic_bp": 142.0, "diastolic_bp": 88.0,
            "total_cholesterol": 225.0, "hdl": 44.0, "creatinine": 1.24
        },
        "missingFields": [],
        "expectedNormalization": [
            {"parameter": "totalCholesterol", "originalValue": 225.0, "originalUnit": "mg%", "normalizedValue": 225.0, "normalizedUnit": "mg/dL", "rule": "Archaic clinical mg% to mg/dL identity"},
            {"parameter": "creatinine", "originalValue": 110.0, "originalUnit": "umol/L", "normalizedValue": 1.24, "normalizedUnit": "mg/dL", "factor": "1/88.4"}
        ],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": None,
        "sections": [
            {
                "type": "vitals",
                "title": "Resting Vitals",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "142 / 88", "unit": "mm-Hg"},
                    {"label": "Body Mass Index (BMI)", "value": "28.8", "unit": "kg/m2"},
                    {"label": "Pulse Rate", "value": "78", "unit": "beats/min"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Metabolic Chemistries",
                "rows": [
                    {"name": "Total Cholesterol", "value": "225.0", "unit": "mg%", "referenceRange": "130 - 200", "flag": "HIGH", "highlight": True, "method": "Enzymatic"},
                    {"name": "HDL Cholesterol", "value": "44.0", "unit": "mg/dL", "referenceRange": "> 50", "flag": "LOW", "highlight": True, "method": "Direct"},
                    {"name": "Serum Creatinine", "value": "110.0", "unit": "umol/L", "referenceRange": "44 - 97", "flag": "HIGH", "highlight": True, "method": "Jaffe"}
                ]
            }
        ]
    })

    # =========================================================================
    # CATEGORY 08: CONFLICTING DATA CASE (1 report)
    # =========================================================================
    catalog.append({
        "folder": "08_conflicting_data",
        "reportId": "SYN-CNF1-R01",
        "patient": {
            "patientId": "SYN-CNF1",
            "name": "Test Patient CNF1",
            "age": 55,
            "sex": 1,
            "sexStr": "Male",
            "dob": "1970-05-18"
        },
        "reportDate": "2025-08-10",
        "reportType": "general_lab_report",
        "clinicalScenario": "conflicting_multisection_vitals",
        "clinicalIndication": "Triage triage blood pressure vs attending physician exam conflict",
        "referringDoctor": "Dr. Marcus Thorne, MD",
        "expectedExtraction": {
            "age": 55, "sex": 1, "bmi": 29.5, "totalCholesterol": 224.0, "hdl": 40.0, "creatinine": 1.10
        },
        "modelRelevantFeatures": {
            "age": 55, "sex": 1, "bmi": 29.5, "systolic_bp": 124.0, "diastolic_bp": 80.0,
            "total_cholesterol": 224.0, "hdl": 40.0, "creatinine": 1.10
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "WARNING",
        "expectedConflict": True,
        "conflictDetails": {
            "field": "bloodPressure",
            "candidateValues": ["124/80", "148/92"],
            "distinctSystolic": [124, 148],
            "distinctDiastolic": [80, 92],
            "sections": ["Triage Intake Vital Signs", "Attending Physician Re-examination"]
        },
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": None,
        "sections": [
            {
                "type": "vitals",
                "title": "Section A: Triage Nurse Intake Vital Signs (08:15 AM)",
                "items": [
                    {"label": "Blood Pressure", "value": "124/80", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "29.5", "unit": "kg/m²"},
                    {"label": "Heart Rate", "value": "72", "unit": "BPM"}
                ]
            },
            {
                "type": "vitals",
                "title": "Section B: Attending Physician Re-examination Vitals (09:45 AM)",
                "items": [
                    {"label": "Blood Pressure", "value": "148/92", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "29.5", "unit": "kg/m²"},
                    {"label": "Heart Rate", "value": "82", "unit": "BPM"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Section C: Clinical Laboratory Investigations",
                "rows": [
                    {"name": "Total Cholesterol", "value": 224.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "HIGH", "highlight": True, "method": "Enzymatic"},
                    {"name": "HDL Cholesterol", "value": 40.0, "unit": "mg/dL", "referenceRange": "> 40.0", "flag": "NORMAL", "highlight": True, "method": "Direct"},
                    {"name": "Serum Creatinine", "value": 1.10, "unit": "mg/dL", "referenceRange": "0.70 - 1.20", "flag": "NORMAL", "highlight": True, "method": "Jaffe"}
                ]
            },
            {
                "type": "text",
                "title": "Conflict Audit Notice",
                "content": "Clinical Discrepancy Note: Initial triage reading showed normotensive BP (124/80 mmHg), while subsequent physician evaluation recorded Stage 2 hypertension (148/92 mmHg). Automated extraction triggers WARNING status for manual clinician reconciliation."
            }
        ]
    })

    # =========================================================================
    # CATEGORY 09: OUTLIER CASE (1 report)
    # =========================================================================
    catalog.append({
        "folder": "09_outlier_cases",
        "reportId": "SYN-OUT1-R01",
        "patient": {
            "patientId": "SYN-OUT1",
            "name": "Test Patient OUT1",
            "age": 58,
            "sex": 1,
            "sexStr": "Male",
            "dob": "1967-08-20"
        },
        "reportDate": "2025-08-25",
        "reportType": "general_lab_report",
        "clinicalScenario": "outlier_extreme_physiological",
        "clinicalIndication": "Emergency department inpatient admission — hypertensive emergency, severe renal failure, severe dyslipidemia",
        "referringDoctor": "Dr. Marcus Thorne, MD (Critical Care)",
        "expectedExtraction": {
            "age": 58, "sex": 1, "bmi": 52.4, "systolicBP": 215.0, "diastolicBP": 125.0,
            "totalCholesterol": 410.0, "hdl": 22.0, "creatinine": 4.80,
            "fastingGlucose": 340.0, "hba1c": 12.8
        },
        "modelRelevantFeatures": {
            "age": 58, "sex": 1, "bmi": 52.4, "systolic_bp": 215.0, "diastolic_bp": 125.0,
            "total_cholesterol": 410.0, "hdl": 22.0, "creatinine": 4.80
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "WARNING",
        "expectedConflict": False,
        "validationWarnings": [
            "BMI > 50 kg/m²: Extreme Class III morbid obesity warning",
            "Resting BP > 200 mmHg systolic: Hypertensive urgency range warning",
            "Total Cholesterol > 400 mg/dL: Severe hypercholesterolemia warning",
            "Creatinine > 4.0 mg/dL: Severe acute or end-stage kidney dysfunction"
        ],
        "ocrDifficulty": "STANDARD",
        "multiReportGroup": None,
        "sections": [
            {
                "type": "vitals",
                "title": "Emergency Department Critical Vitals",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "215/125", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "52.4", "unit": "kg/m²"},
                    {"label": "Heart Rate", "value": "104", "unit": "BPM"},
                    {"label": "Height", "value": "172", "unit": "cm"},
                    {"label": "Weight", "value": "155.0", "unit": "kg"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Stat Emergency Chemistries & Lipids",
                "rows": [
                    {"name": "Total Cholesterol", "value": 410.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "CRITICAL HIGH", "highlight": True, "method": "Enzymatic"},
                    {"name": "HDL Cholesterol", "value": 22.0, "unit": "mg/dL", "referenceRange": "> 40.0", "flag": "CRITICAL LOW", "highlight": True, "method": "Direct"},
                    {"name": "Serum Creatinine", "value": 4.80, "unit": "mg/dL", "referenceRange": "0.70 - 1.20", "flag": "CRITICAL HIGH", "highlight": True, "method": "Kinetic Jaffe"},
                    {"name": "Fasting Blood Glucose", "value": 340.0, "unit": "mg/dL", "referenceRange": "70.0 - 99.0", "flag": "CRITICAL HIGH", "method": "Hexokinase"},
                    {"name": "HbA1c", "value": 12.8, "unit": "%", "referenceRange": "4.0 - 5.6", "flag": "CRITICAL HIGH", "method": "HPLC"}
                ]
            },
            {
                "type": "text",
                "title": "Critical Value Alert & Medical Attestation",
                "content": "CRITICAL ACTION VALUE: Panic values telephoned to and acknowledged by Dr. M. Thorne at 10:15 AM. Laboratory values verified via secondary dilution assay. Tests system range-checking and outlier boundary safety without crash."
            }
        ]
    })

    # =========================================================================
    # CATEGORY 10: MIXED REALISTIC REPORTS (2 reports)
    # =========================================================================
    catalog.append({
        "folder": "10_mixed_realistic_reports",
        "reportId": "SYN-MIX1-R01",
        "patient": {
            "patientId": "SYN-MIX1",
            "name": "Test Patient MIX1",
            "age": 53,
            "sex": 0,
            "sexStr": "Female",
            "dob": "1972-03-24"
        },
        "reportDate": "2025-07-05",
        "reportType": "general_lab_report",
        "clinicalScenario": "multipage_health_checkup",
        "clinicalIndication": "Multi-page comprehensive executive health audit — 2-page document",
        "referringDoctor": "Dr. Karen Evans, MD",
        "expectedExtraction": {
            "age": 53, "sex": 0, "bmi": 26.8, "systolicBP": 134.0, "diastolicBP": 86.0,
            "totalCholesterol": 210.0, "hdl": 48.0, "creatinine": 0.92,
            "hemoglobin": 13.4, "wbcCount": 6200.0, "plateletCount": 265000.0
        },
        "modelRelevantFeatures": {
            "age": 53, "sex": 0, "bmi": 26.8, "systolic_bp": 134.0, "diastolic_bp": 86.0,
            "total_cholesterol": 210.0, "hdl": 48.0, "creatinine": 0.92
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "MULTI_PAGE_DOCUMENT",
        "multiReportGroup": None,
        "sections": [
            {
                "type": "vitals",
                "title": "Page 1: Physical Examination & Vitals",
                "items": [
                    {"label": "Resting Blood Pressure", "value": "134/86", "unit": "mmHg"},
                    {"label": "Body Mass Index (BMI)", "value": "26.8", "unit": "kg/m²"},
                    {"label": "Heart Rate", "value": "74", "unit": "BPM"},
                    {"label": "Height", "value": "165", "unit": "cm"},
                    {"label": "Weight", "value": "73.0", "unit": "kg"},
                    {"label": "Temperature", "value": "98.4", "unit": "°F"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Page 1: Complete Blood Count (CBC)",
                "rows": [
                    {"name": "Hemoglobin (Hb)", "value": 13.4, "unit": "g/dL", "referenceRange": "12.0 - 15.5", "flag": "NORMAL", "highlight": True, "method": "SLS"},
                    {"name": "Total WBC count", "value": 6200.0, "unit": "cumm", "referenceRange": "4000 - 11000", "flag": "NORMAL", "method": "Flow Cytometry"},
                    {"name": "Platelet Count", "value": 265000.0, "unit": "cumm", "referenceRange": "150000 - 450000", "flag": "NORMAL", "method": "Impedance"}
                ]
            },
            {
                "type": "pagebreak"
            },
            {
                "type": "lab_table",
                "title": "Page 2: Comprehensive Lipid Profile & Renal Function",
                "rows": [
                    {"name": "Total Cholesterol", "value": 210.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "HIGH", "highlight": True, "method": "CHOD-PAP"},
                    {"name": "HDL Cholesterol", "value": 48.0, "unit": "mg/dL", "referenceRange": "> 50.0", "flag": "LOW", "highlight": True, "method": "Direct"},
                    {"name": "Triglycerides", "value": 165.0, "unit": "mg/dL", "referenceRange": "< 150.0", "flag": "HIGH", "method": "GPO-PAP"},
                    {"name": "LDL Cholesterol", "value": 129.0, "unit": "mg/dL", "referenceRange": "< 100.0", "flag": "HIGH", "method": "Calculated"},
                    {"name": "Serum Creatinine", "value": 0.92, "unit": "mg/dL", "referenceRange": "0.50 - 1.10", "flag": "NORMAL", "highlight": True, "method": "Jaffe"},
                    {"name": "Blood Urea Nitrogen (BUN)", "value": 15.0, "unit": "mg/dL", "referenceRange": "7.0 - 20.0", "flag": "NORMAL", "method": "Kinetic"}
                ]
            },
            {
                "type": "text",
                "title": "Page 2: Clinical Impression & Summary",
                "content": "Overall metabolic evaluation demonstrates mild dyslipidemia with marginal overweight and Stage 1 systolic BP elevation. Renal parameters and complete blood count are unremarkable. Recommended for dietary modification and 6-month cardiovascular risk reassessment."
            }
        ]
    })

    catalog.append({
        "folder": "10_mixed_realistic_reports",
        "reportId": "SYN-MIX2-R01",
        "patient": {
            "patientId": "SYN-MIX2",
            "name": "Test Patient MIX2",
            "age": 51,
            "sex": 1,
            "sexStr": "Male",
            "dob": "1974-09-16"
        },
        "reportDate": "2025-07-20",
        "reportType": "ambulatory_blood_pressure_monitoring",
        "clinicalScenario": "abpm_with_concurrent_labs",
        "clinicalIndication": "24-hour Ambulatory Blood Pressure Monitoring (ABPM) with routine outpatient metabolic chemistries",
        "referringDoctor": "Dr. Brenda Vance, MD (Cardiology)",
        "expectedExtraction": {
            "age": 51, "sex": 1, "bmi": 30.2, "systolicBP": 139.0, "diastolicBP": 87.0,
            "totalCholesterol": 228.0, "hdl": 39.0, "creatinine": 1.10
        },
        "modelRelevantFeatures": {
            "age": 51, "sex": 1, "bmi": 30.2, "systolic_bp": 139.0, "diastolic_bp": 87.0,
            "total_cholesterol": 228.0, "hdl": 39.0, "creatinine": 1.10
        },
        "missingFields": [],
        "expectedNormalization": [],
        "expectedValidation": "VALID",
        "expectedConflict": False,
        "ocrDifficulty": "ABPM_STATISTICAL_TABLES",
        "multiReportGroup": None,
        "sections": [
            {
                "type": "vitals",
                "title": "Anthropometric Data",
                "items": [
                    {"label": "Body Mass Index (BMI)", "value": "30.2", "unit": "kg/m²"},
                    {"label": "Height", "value": "178", "unit": "cm"},
                    {"label": "Weight", "value": "95.6", "unit": "kg"}
                ]
            },
            {
                "type": "lab_table",
                "title": "24-Hour Ambulatory Blood Pressure Statistics (Sentinel ABP)",
                "rows": [
                    {"name": "Overall 24-Hour Mean BP", "value": "139/87", "unit": "mmHg", "referenceRange": "< 130/80", "flag": "HIGH", "highlight": True, "method": "Oscillometric Mean"},
                    {"name": "Awake (Daytime) Mean BP", "value": "144/91", "unit": "mmHg", "referenceRange": "< 135/85", "flag": "HIGH", "method": "Awake Interval Mean"},
                    {"name": "Asleep (Nighttime) Mean BP", "value": "128/78", "unit": "mmHg", "referenceRange": "< 120/70", "flag": "HIGH", "method": "Sleep Interval Mean"},
                    {"name": "Nocturnal Dipping Percentage", "value": "11.1", "unit": "%", "referenceRange": "10.0 - 20.0", "flag": "NORMAL", "method": "Dipping Analysis (Dipper)"}
                ]
            },
            {
                "type": "lab_table",
                "title": "Concurrent Routine Serum Chemistries",
                "rows": [
                    {"name": "Total Cholesterol", "value": 228.0, "unit": "mg/dL", "referenceRange": "125.0 - 200.0", "flag": "HIGH", "highlight": True, "method": "Enzymatic"},
                    {"name": "HDL Cholesterol", "value": 39.0, "unit": "mg/dL", "referenceRange": "> 40.0", "flag": "LOW", "highlight": True, "method": "Direct"},
                    {"name": "Serum Creatinine", "value": 1.10, "unit": "mg/dL", "referenceRange": "0.70 - 1.20", "flag": "NORMAL", "highlight": True, "method": "Jaffe"}
                ]
            }
        ]
    })

    return catalog


def build_and_verify_all():
    catalog = get_report_catalog()
    print(f"Loaded {len(catalog)} synthetic report definitions.")

    manifest = []
    expected_extractions = {}

    for idx, report in enumerate(catalog, start=1):
        rel_folder = report["folder"]
        report_id = report["reportId"]
        pdf_path = CORPUS_DIR / rel_folder / f"{report_id}.pdf"
        txt_path = CORPUS_DIR / rel_folder / f"{report_id}_ground_truth.txt"

        print(f"[{idx}/{len(catalog)}] Generating {report_id} -> {pdf_path.relative_to(CORPUS_DIR.parent)}...")

        # 1. Build PDF document
        build_pdf_report(pdf_path, report, report["sections"])

        # 2. Export OCR ground truth text representation
        export_ground_truth_text(txt_path, report, report["sections"])

        # 3. Add to manifest entry
        manifest_entry = {
            "reportId": report_id,
            "patientId": report["patient"]["patientId"],
            "category": rel_folder,
            "relativePdfPath": f"test_corpus/{rel_folder}/{report_id}.pdf",
            "relativeTextPath": f"test_corpus/{rel_folder}/{report_id}_ground_truth.txt",
            "reportType": report["reportType"],
            "clinicalScenario": report["clinicalScenario"],
            "synthetic": True,
            "patientContext": {
                "age": report["patient"]["age"],
                "sex": report["patient"]["sex"],
                "genderStr": report["patient"]["sexStr"],
                "dob": report["patient"]["dob"]
            },
            "availableFeatures": [k for k, v in report["modelRelevantFeatures"].items() if v is not None],
            "missingFeatures": report.get("missingFields", []),
            "modelRelevantFeatures": report["modelRelevantFeatures"],
            "expectedNormalization": report.get("expectedNormalization", []),
            "expectedValidation": report.get("expectedValidation", "VALID"),
            "expectedConflict": report.get("expectedConflict", False),
            "ocrDifficulty": report.get("ocrDifficulty", "STANDARD"),
            "multiReportGroup": report.get("multiReportGroup", None),
            "actualModelOutput": None
        }
        manifest.append(manifest_entry)

        # 4. Add to expected extractions
        expected_extractions[report_id] = {
            "reportId": report_id,
            "patientId": report["patient"]["patientId"],
            "reportType": report["reportType"],
            "clinicalScenario": report["clinicalScenario"],
            "expectedExtraction": report["expectedExtraction"],
            "modelRelevantFeatures": report["modelRelevantFeatures"],
            "missingFields": report.get("missingFields", []),
            "normalization": report.get("expectedNormalization", []),
            "expectedValidation": report.get("expectedValidation", "VALID"),
            "expectedConflict": report.get("expectedConflict", False),
            "conflictDetails": report.get("conflictDetails", None),
            "actualModelOutput": None
        }

    # Write MASTER_TEST_MANIFEST.json
    manifest_path = CORPUS_DIR / "MASTER_TEST_MANIFEST.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"\nWrote master manifest: {manifest_path} ({len(manifest)} reports)")

    # Write EXPECTED_EXTRACTIONS.json
    extractions_path = CORPUS_DIR / "EXPECTED_EXTRACTIONS.json"
    with open(extractions_path, "w", encoding="utf-8") as f:
        json.dump(expected_extractions, f, indent=2)
    print(f"Wrote expected extractions: {extractions_path}")

    return catalog, manifest


if __name__ == "__main__":
    catalog, manifest = build_and_verify_all()
    print("Test corpus generation successfully completed!")
