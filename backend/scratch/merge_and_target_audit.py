import os
import pandas as pd
import numpy as np

raw_dir = r"c:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD\ml_model\datasets\diabetes\raw\nhanes_2017_2018"

demo = pd.read_sas(os.path.join(raw_dir, "DEMO_J.XPT"), format="xport")[["SEQN", "RIDAGEYR", "RIAGENDR", "RIDRETH3"]]
bmx = pd.read_sas(os.path.join(raw_dir, "BMX_J.XPT"), format="xport")[["SEQN", "BMXWT", "BMXHT", "BMXBMI", "BMXWAIST"]]
bpx = pd.read_sas(os.path.join(raw_dir, "BPX_J.XPT"), format="xport")[["SEQN", "BPXSY1", "BPXDI1", "BPXSY2", "BPXDI2", "BPXSY3", "BPXDI3"]]
glu = pd.read_sas(os.path.join(raw_dir, "GLU_J.XPT"), format="xport")[["SEQN", "LBXGLU", "LBDGLUSI", "WTSAF2YR"]]
ghb = pd.read_sas(os.path.join(raw_dir, "GHB_J.XPT"), format="xport")[["SEQN", "LBXGH"]]
diq = pd.read_sas(os.path.join(raw_dir, "DIQ_J.XPT"), format="xport")[["SEQN", "DIQ010", "DIQ050", "DIQ070", "DIQ160"]]
biopro = pd.read_sas(os.path.join(raw_dir, "BIOPRO_J.XPT"), format="xport")[["SEQN", "LBXSCR", "LBXSUA", "LBXSBU"]]
tchol = pd.read_sas(os.path.join(raw_dir, "TCHOL_J.XPT"), format="xport")[["SEQN", "LBXTC"]]
hdl = pd.read_sas(os.path.join(raw_dir, "HDL_J.XPT"), format="xport")[["SEQN", "LBDHDD"]]
trigly = pd.read_sas(os.path.join(raw_dir, "TRIGLY_J.XPT"), format="xport")[["SEQN", "LBXTR", "LBDLDL"]]

# Compute average systolic and diastolic blood pressure
# Clinically, average of reading 2 and 3 if both available, or average of all valid non-zero readings
def calc_bp(row):
    sys_vals = [s for s in [row["BPXSY1"], row["BPXSY2"], row["BPXSY3"]] if pd.notnull(s) and s > 0]
    dia_vals = [d for d in [row["BPXDI1"], row["BPXDI2"], row["BPXDI3"]] if pd.notnull(d) and d >= 0]
    # If readings 2 and 3 exist, average them (standard NHANES recommendation)
    if pd.notnull(row["BPXSY2"]) and pd.notnull(row["BPXSY3"]) and row["BPXSY2"] > 0 and row["BPXSY3"] > 0:
        avg_sys = (row["BPXSY2"] + row["BPXSY3"]) / 2.0
    elif len(sys_vals) > 0:
        avg_sys = np.mean(sys_vals)
    else:
        avg_sys = np.nan
        
    if pd.notnull(row["BPXDI2"]) and pd.notnull(row["BPXDI3"]) and row["BPXDI2"] >= 0 and row["BPXDI3"] >= 0:
        avg_dia = (row["BPXDI2"] + row["BPXDI3"]) / 2.0
    elif len(dia_vals) > 0:
        avg_dia = np.mean(dia_vals)
    else:
        avg_dia = np.nan
    return pd.Series([avg_sys, avg_dia], index=["SYS_BP_AVG", "DIA_BP_AVG"])

bp_avg = bpx.apply(calc_bp, axis=1)
bpx["SYS_BP_AVG"] = bp_avg["SYS_BP_AVG"]
bpx["DIA_BP_AVG"] = bp_avg["DIA_BP_AVG"]

print("=== MERGE AUDIT STEP BY STEP ===")
merged = demo.copy()
print(f"Base DEMO_J: {len(merged)} rows")

for name, d, cols_to_merge in [
    ("BMX_J", bmx, ["SEQN", "BMXWT", "BMXHT", "BMXBMI", "BMXWAIST"]),
    ("BPX_J", bpx, ["SEQN", "SYS_BP_AVG", "DIA_BP_AVG"]),
    ("DIQ_J", diq, ["SEQN", "DIQ010", "DIQ050", "DIQ070", "DIQ160"]),
    ("GHB_J", ghb, ["SEQN", "LBXGH"]),
    ("GLU_J", glu, ["SEQN", "LBXGLU", "LBDGLUSI", "WTSAF2YR"]),
    ("BIOPRO_J", biopro, ["SEQN", "LBXSCR", "LBXSUA", "LBXSBU"]),
    ("TCHOL_J", tchol, ["SEQN", "LBXTC"]),
    ("HDL_J", hdl, ["SEQN", "LBDHDD"]),
    ("TRIGLY_J", trigly, ["SEQN", "LBXTR", "LBDLDL"]),
]:
    before = len(merged)
    merged = pd.merge(merged, d[cols_to_merge], on="SEQN", how="left")
    after = len(merged)
    matched = merged[cols_to_merge[1]].notnull().sum()
    print(f"Merged with {name:10}: Total Rows: {after} (1-to-1 confirmed: {before==after}) | Non-null '{cols_to_merge[1]}': {matched}")

print("\n=== POPULATION RESTRICTIONS ANALYSIS ===")
print("Total participants in NHANES 2017-2018:", len(merged))
print("Adults (Age >= 18):", (merged["RIDAGEYR"] >= 18).sum())
print("Adults (Age >= 20):", (merged["RIDAGEYR"] >= 20).sum())

adults = merged[merged["RIDAGEYR"] >= 18].copy()

print("\n=== ADULT SUBSET (AGE >= 18, N =", len(adults), ") ===")
print("DIQ010 distribution in adults:")
print(adults["DIQ010"].value_counts(dropna=False))

print("\nCross-tab of DIQ010 vs HbA1c (LBXGH >= 6.5%):")
adults["HbA1c_elevated"] = adults["LBXGH"] >= 6.5
print(pd.crosstab(adults["DIQ010"], adults["HbA1c_elevated"], margins=True, dropna=False))

print("\nCross-tab of DIQ010 vs Fasting Glucose (LBXGLU >= 126 mg/dL):")
adults["Glucose_elevated"] = adults["LBXGLU"] >= 126
print(pd.crosstab(adults["DIQ010"], adults["Glucose_elevated"], margins=True, dropna=False))

print("\nMedication in adults:")
print("Taking insulin (DIQ050 == 1):", (adults["DIQ050"] == 1).sum())
print("Taking diabetic pills (DIQ070 == 1):", (adults["DIQ070"] == 1).sum())

print("\n--- UNDIAGNOSED DIABETES ANALYSIS ---")
# Participants who said NO to diabetes (DIQ010 == 2) but have HbA1c >= 6.5% or Fasting Glucose >= 126
undiag_ghb = ((adults["DIQ010"] == 2) & (adults["LBXGH"] >= 6.5)).sum()
undiag_glu = ((adults["DIQ010"] == 2) & (adults["LBXGLU"] >= 126)).sum()
print("Said NO to diabetes, but HbA1c >= 6.5% (Undiagnosed Diabetes):", undiag_ghb)
print("Said NO to diabetes, but Fasting Glucose >= 126 (Undiagnosed Diabetes):", undiag_glu)

print("\n--- PREDIABETES ANALYSIS ---")
prediab_diq = (adults["DIQ010"] == 3).sum() + (adults["DIQ160"] == 1).sum()
prediab_ghb = ((adults["DIQ010"] != 1) & (adults["LBXGH"] >= 5.7) & (adults["LBXGH"] < 6.5)).sum()
prediab_glu = ((adults["DIQ010"] != 1) & (adults["LBXGLU"] >= 100) & (adults["LBXGLU"] < 126)).sum()
print("Reported prediabetes/borderline:", prediab_diq)
print("Normal/Unreported, but HbA1c 5.7-6.4% (Lab-defined prediabetes):", prediab_ghb)
print("Normal/Unreported, but Fasting Glucose 100-125 (Lab-defined prediabetes):", prediab_glu)
