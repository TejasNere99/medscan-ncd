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

# Calculate BP averages
def calc_bp(row):
    sys_vals = [s for s in [row["BPXSY1"], row["BPXSY2"], row["BPXSY3"]] if pd.notnull(s) and s > 0]
    dia_vals = [d for d in [row["BPXDI1"], row["BPXDI2"], row["BPXDI3"]] if pd.notnull(d) and d >= 0]
    avg_sys = (row["BPXSY2"] + row["BPXSY3"])/2.0 if (pd.notnull(row["BPXSY2"]) and pd.notnull(row["BPXSY3"]) and row["BPXSY2"]>0 and row["BPXSY3"]>0) else (np.mean(sys_vals) if len(sys_vals)>0 else np.nan)
    avg_dia = (row["BPXDI2"] + row["BPXDI3"])/2.0 if (pd.notnull(row["BPXDI2"]) and pd.notnull(row["BPXDI3"]) and row["BPXDI2"]>=0 and row["BPXDI3"]>=0) else (np.mean(dia_vals) if len(dia_vals)>0 else np.nan)
    return pd.Series([avg_sys, avg_dia], index=["SYS_BP_AVG", "DIA_BP_AVG"])

bp_avg = bpx.apply(calc_bp, axis=1)
bpx["SYS_BP_AVG"] = bp_avg["SYS_BP_AVG"]
bpx["DIA_BP_AVG"] = bp_avg["DIA_BP_AVG"]

# Master merge
df = demo.merge(bmx, on="SEQN", how="left") \
         .merge(bpx[["SEQN", "SYS_BP_AVG", "DIA_BP_AVG"]], on="SEQN", how="left") \
         .merge(diq, on="SEQN", how="left") \
         .merge(ghb, on="SEQN", how="left") \
         .merge(glu, on="SEQN", how="left") \
         .merge(biopro, on="SEQN", how="left") \
         .merge(tchol, on="SEQN", how="left") \
         .merge(hdl, on="SEQN", how="left") \
         .merge(trigly, on="SEQN", how="left")

adults = df[df["RIDAGEYR"] >= 18].copy()
print(f"Total Adults (Age >= 18): {len(adults)}")

# Define Targets
# T1: Self-reported doctor diagnosed diabetes
adults["TARGET_DIAG"] = (adults["DIQ010"] == 1).astype(int)

# T2: Self-reported OR taking diabetes medications
adults["TARGET_DIAG_OR_MEDS"] = ((adults["DIQ010"] == 1) | (adults["DIQ050"] == 1) | (adults["DIQ070"] == 1)).astype(int)

# T3: Standard CDC/ADA Composite Diabetes: Diagnosed, on meds, or lab-positive (HbA1c >= 6.5% or Fasting Glucose >= 126)
adults["TARGET_COMPOSITE_DIABETES"] = (
    (adults["DIQ010"] == 1) | 
    (adults["DIQ050"] == 1) | 
    (adults["DIQ070"] == 1) | 
    (adults["LBXGH"] >= 6.5) | 
    (adults["LBXGLU"] >= 126)
).astype(int)

# T4: 3-Class Glycemic Status (0: Normal, 1: Prediabetes, 2: Diabetes)
def classify_glycemia(row):
    # Diabetes
    if (row["DIQ010"] == 1) or (row["DIQ050"] == 1) or (row["DIQ070"] == 1) or (row["LBXGH"] >= 6.5) or (row["LBXGLU"] >= 126):
        return 2 # Diabetes
    # Prediabetes
    if (row["DIQ010"] == 3) or (row["DIQ160"] == 1) or (5.7 <= row["LBXGH"] < 6.5) or (100 <= row["LBXGLU"] < 126):
        return 1 # Prediabetes / At Risk
    # Check if we have at least one valid measurement
    if pd.notnull(row["LBXGH"]) or pd.notnull(row["LBXGLU"]) or (row["DIQ010"] == 2):
        return 0 # Normal
    return np.nan

adults["TARGET_GLYCEMIC_STAGE"] = adults.apply(classify_glycemia, axis=1)

print("\n=== TARGET DISTRIBUTIONS IN ADULTS (N = 5856) ===")
print("TARGET_DIAG (DIQ010 == 1):")
print(adults["TARGET_DIAG"].value_counts(normalize=True) * 100)
print(adults["TARGET_DIAG"].value_counts())

print("\nTARGET_DIAG_OR_MEDS:")
print(adults["TARGET_DIAG_OR_MEDS"].value_counts(normalize=True) * 100)
print(adults["TARGET_DIAG_OR_MEDS"].value_counts())

print("\nTARGET_COMPOSITE_DIABETES (CDC/ADA Standard):")
print(adults["TARGET_COMPOSITE_DIABETES"].value_counts(normalize=True) * 100)
print(adults["TARGET_COMPOSITE_DIABETES"].value_counts())

print("\nTARGET_GLYCEMIC_STAGE (0=Normal, 1=Prediabetes, 2=Diabetes):")
print(adults["TARGET_GLYCEMIC_STAGE"].value_counts(dropna=False))
print(adults["TARGET_GLYCEMIC_STAGE"].value_counts(normalize=True) * 100)

print("\n=== FEATURE COMPLETENESS IN ADULTS ===")
candidate_features = [
    "RIDAGEYR", "RIAGENDR", "BMXBMI", "BMXWAIST",
    "SYS_BP_AVG", "DIA_BP_AVG", "LBXTC", "LBDHDD",
    "LBXSCR", "LBXGH", "LBXGLU", "LBDLDL", "LBXTR"
]
for f in candidate_features:
    valid = adults[f].notnull().sum()
    pct = valid / len(adults) * 100
    print(f"{f:12}: {valid:5} valid ({pct:5.1f}%) | Missing: {len(adults)-valid}")

print("\n=== CORRELATION OF CANDIDATE FEATURES WITH TARGET_COMPOSITE_DIABETES ===")
numeric_df = adults[candidate_features + ["TARGET_COMPOSITE_DIABETES"]].copy()
corr = numeric_df.corr()["TARGET_COMPOSITE_DIABETES"].sort_values(ascending=False)
print(corr)

print("\n=== CORRELATION WITH TARGET_DIAG_OR_MEDS ===")
corr_diag = adults[candidate_features + ["TARGET_DIAG_OR_MEDS"]].corr()["TARGET_DIAG_OR_MEDS"].sort_values(ascending=False)
print(corr_diag)
