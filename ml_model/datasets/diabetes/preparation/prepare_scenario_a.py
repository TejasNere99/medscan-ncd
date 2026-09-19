"""
MedScan-NCD: Scenario A Data Preparation & Cleaning Pipeline
============================================================
Source: Official CDC/NCHS NHANES 2017-2018 Cycle
Target Task: Routine Medical-Report Diabetes Risk Assessment (Non-Diagnostic)
Output: ml_model/datasets/diabetes/prepared/scenario_a_candidate.csv

Predictors (8):
  1. age (years, 18-80+)
  2. sex (0=Female, 1=Male)
  3. bmi (kg/m^2)
  4. systolic_bp (mmHg, averaged resting)
  5. diastolic_bp (mmHg, averaged resting)
  6. total_cholesterol (mg/dL)
  7. hdl (mg/dL)
  8. creatinine (mg/dL)

Target:
  target_diabetes (0=Non-diabetic, 1=Diabetic/High Risk)
  Constructed via standard CDC/ADA composite:
  DIQ010 == 1 (Doctor diagnosed)
  OR DIQ050 == 1 (Insulin use)
  OR DIQ070 == 1 (Oral hypoglycemic pills)
  OR LBXGH >= 6.5 (Lab HbA1c >= 6.5%)
  OR LBXGLU >= 126 (Lab Fasting Glucose >= 126 mg/dL)

Zero Target Leakage: Fasting Glucose (LBXGLU) and HbA1c (LBXGH) are strictly
excluded from the model predictor columns.
"""

import os
import sys
import pandas as pd
import numpy as np

def run_pipeline():
    # Relative path navigation from script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.abspath(os.path.join(script_dir, ".."))
    raw_dir = os.path.join(base_dir, "raw", "nhanes_2017_2018")
    prepared_dir = os.path.join(base_dir, "prepared")
    os.makedirs(prepared_dir, exist_ok=True)

    print("=== [STEP 1/6] Loading Raw Official NHANES 2017-2018 XPT Files ===")
    demo = pd.read_sas(os.path.join(raw_dir, "DEMO_J.XPT"), format="xport")
    bmx = pd.read_sas(os.path.join(raw_dir, "BMX_J.XPT"), format="xport")
    bpx = pd.read_sas(os.path.join(raw_dir, "BPX_J.XPT"), format="xport")
    glu = pd.read_sas(os.path.join(raw_dir, "GLU_J.XPT"), format="xport")
    ghb = pd.read_sas(os.path.join(raw_dir, "GHB_J.XPT"), format="xport")
    diq = pd.read_sas(os.path.join(raw_dir, "DIQ_J.XPT"), format="xport")
    biopro = pd.read_sas(os.path.join(raw_dir, "BIOPRO_J.XPT"), format="xport")
    tchol = pd.read_sas(os.path.join(raw_dir, "TCHOL_J.XPT"), format="xport")
    hdl = pd.read_sas(os.path.join(raw_dir, "HDL_J.XPT"), format="xport")
    print("  Successfully loaded all 9 XPT components.")

    print("\n=== [STEP 2/6] Blood Pressure Processing & Special Zero Handling ===")
    # Clean floating-point representation of near-zeros from SAS export
    for col in ["BPXDI1", "BPXDI2", "BPXDI3"]:
        bpx[col] = bpx[col].apply(lambda x: 0.0 if pd.notnull(x) and x < 1e-10 else x)

    def compute_clean_bp(row):
        # Systolic: average readings 2 and 3 if both >= 60 mmHg; else use whichever is valid
        sys_cands = [s for s in [row["BPXSY2"], row["BPXSY3"]] if pd.notnull(s) and s >= 60]
        if len(sys_cands) == 2:
            final_sys = np.mean(sys_cands)
        elif len(sys_cands) == 1:
            final_sys = sys_cands[0]
        elif pd.notnull(row["BPXSY1"]) and row["BPXSY1"] >= 60:
            final_sys = row["BPXSY1"]
        else:
            final_sys = np.nan

        # Diastolic: prefer readings >= 30 mmHg (auscultatory sound phases)
        dia_cands = [d for d in [row["BPXDI2"], row["BPXDI3"]] if pd.notnull(d) and d >= 30]
        if len(dia_cands) == 2:
            final_dia = np.mean(dia_cands)
        elif len(dia_cands) == 1:
            final_dia = dia_cands[0]
        elif pd.notnull(row["BPXDI1"]) and row["BPXDI1"] >= 30:
            final_dia = row["BPXDI1"]
        else:
            # If all readings are < 30 mmHg (auscultatory sound continuation artifact / unmeasurable Phase 5), convert to NaN
            final_dia = np.nan

        return pd.Series([final_sys, final_dia], index=["SYS_BP_AVG", "DIA_BP_AVG"])

    bp_clean = bpx.apply(compute_clean_bp, axis=1)
    bpx["SYS_BP_AVG"] = bp_clean["SYS_BP_AVG"]
    bpx["DIA_BP_AVG"] = bp_clean["DIA_BP_AVG"]
    print("  Averaged resting blood pressure computed according to AHA/CDC protocol.")

    print("\n=== [STEP 3/6] Participant-Level Merging (Anchored on DEMO_J SEQN) ===")
    merged = demo[["SEQN", "RIDAGEYR", "RIAGENDR"]].copy()
    merged = merged.merge(bmx[["SEQN", "BMXBMI"]], on="SEQN", how="left")
    merged = merged.merge(bpx[["SEQN", "SYS_BP_AVG", "DIA_BP_AVG"]], on="SEQN", how="left")
    merged = merged.merge(tchol[["SEQN", "LBXTC"]], on="SEQN", how="left")
    merged = merged.merge(hdl[["SEQN", "LBDHDD"]], on="SEQN", how="left")
    merged = merged.merge(biopro[["SEQN", "LBXSCR"]], on="SEQN", how="left")
    merged = merged.merge(diq[["SEQN", "DIQ010", "DIQ050", "DIQ070"]], on="SEQN", how="left")
    merged = merged.merge(ghb[["SEQN", "LBXGH"]], on="SEQN", how="left")
    merged = merged.merge(glu[["SEQN", "LBXGLU"]], on="SEQN", how="left")
    print(f"  Total merged participants: {len(merged)} (SEQN unique: {merged['SEQN'].nunique()})")

    print("\n=== [STEP 4/6] Filtering to Adult Cohort (Age >= 18) ===")
    adults = merged[merged["RIDAGEYR"] >= 18].copy()
    print(f"  Adult cohort size: {len(adults)} participants (excluded {len(merged) - len(adults)} children/adolescents).")

    print("\n=== [STEP 5/6] Questionnaire Special Code Cleaning & Target Construction ===")
    # Convert questionnaire special missing values (7=Refused, 9=Don't Know) to NaN
    adults["DIQ010_clean"] = adults["DIQ010"].replace({7.0: np.nan, 9.0: np.nan})
    adults["DIQ050_clean"] = adults["DIQ050"].replace({7.0: np.nan, 9.0: np.nan})
    adults["DIQ070_clean"] = adults["DIQ070"].replace({7.0: np.nan, 9.0: np.nan})

    # Construct TARGET_COMPOSITE_DIABETES
    adults["target_diabetes"] = (
        (adults["DIQ010_clean"] == 1) |
        (adults["DIQ050_clean"] == 1) |
        (adults["DIQ070_clean"] == 1) |
        (adults["LBXGH"] >= 6.5) |
        (adults["LBXGLU"] >= 126)
    ).astype(int)

    pos_count = adults["target_diabetes"].sum()
    neg_count = len(adults) - pos_count
    print(f"  Target prevalence: {pos_count} Positive ({pos_count/len(adults)*100:.2f}%) vs {neg_count} Negative ({neg_count/len(adults)*100:.2f}%)")

    print("\n=== [STEP 6/6] Feature Normalization & Candidate Dataset Export ===")
    # Sex: 1=Male -> 1, 2=Female -> 0
    adults["sex"] = adults["RIAGENDR"].map({1.0: 1, 2.0: 0}).astype(int)
    adults["SEQN"] = adults["SEQN"].astype(int)
    adults["age"] = adults["RIDAGEYR"].astype(int)
    adults["bmi"] = adults["BMXBMI"].round(2)
    adults["systolic_bp"] = adults["SYS_BP_AVG"].round(1)
    adults["diastolic_bp"] = adults["DIA_BP_AVG"].round(1)
    adults["total_cholesterol"] = adults["LBXTC"].round(1)
    adults["hdl"] = adults["LBDHDD"].round(1)
    adults["creatinine"] = adults["LBXSCR"].round(2)

    final_columns = [
        "SEQN", "age", "sex", "bmi",
        "systolic_bp", "diastolic_bp",
        "total_cholesterol", "hdl", "creatinine",
        "target_diabetes"
    ]
    candidate_df = adults[final_columns].copy()

    output_path = os.path.join(prepared_dir, "scenario_a_candidate.csv")
    candidate_df.to_csv(output_path, index=False)
    print(f"  [SUCCESS] Written: {output_path}")
    print(f"  Dimensions: {candidate_df.shape[0]} rows x {candidate_df.shape[1]} columns")

if __name__ == "__main__":
    run_pipeline()
