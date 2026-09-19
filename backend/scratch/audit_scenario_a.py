import os
import pandas as pd
import numpy as np

raw_dir = r"c:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD\ml_model\datasets\diabetes\raw\nhanes_2017_2018"

demo = pd.read_sas(os.path.join(raw_dir, "DEMO_J.XPT"), format="xport")[["SEQN", "RIDAGEYR", "RIAGENDR", "RIDRETH3"]]
bmx = pd.read_sas(os.path.join(raw_dir, "BMX_J.XPT"), format="xport")[["SEQN", "BMXWT", "BMXHT", "BMXBMI", "BMXWAIST"]]
bpx = pd.read_sas(os.path.join(raw_dir, "BPX_J.XPT"), format="xport")[["SEQN", "BPXSY1", "BPXDI1", "BPXSY2", "BPXDI2", "BPXSY3", "BPXDI3"]]
glu = pd.read_sas(os.path.join(raw_dir, "GLU_J.XPT"), format="xport")[["SEQN", "LBXGLU", "LBDGLUSI"]]
ghb = pd.read_sas(os.path.join(raw_dir, "GHB_J.XPT"), format="xport")[["SEQN", "LBXGH"]]
diq = pd.read_sas(os.path.join(raw_dir, "DIQ_J.XPT"), format="xport")[["SEQN", "DIQ010", "DIQ050", "DIQ070", "DIQ160"]]
biopro = pd.read_sas(os.path.join(raw_dir, "BIOPRO_J.XPT"), format="xport")[["SEQN", "LBXSCR"]]
tchol = pd.read_sas(os.path.join(raw_dir, "TCHOL_J.XPT"), format="xport")[["SEQN", "LBXTC"]]
hdl = pd.read_sas(os.path.join(raw_dir, "HDL_J.XPT"), format="xport")[["SEQN", "LBDHDD"]]

# Blood pressure average calculation
def calc_bp(row):
    sys_vals = [s for s in [row["BPXSY1"], row["BPXSY2"], row["BPXSY3"]] if pd.notnull(s) and s > 0]
    dia_vals = [d for d in [row["BPXDI1"], row["BPXDI2"], row["BPXDI3"]] if pd.notnull(d) and d >= 0]
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

# Merge
df = demo.merge(bmx, on="SEQN", how="left") \
         .merge(bpx[["SEQN", "SYS_BP_AVG", "DIA_BP_AVG"]], on="SEQN", how="left") \
         .merge(diq, on="SEQN", how="left") \
         .merge(ghb, on="SEQN", how="left") \
         .merge(glu, on="SEQN", how="left") \
         .merge(biopro, on="SEQN", how="left") \
         .merge(tchol, on="SEQN", how="left") \
         .merge(hdl, on="SEQN", how="left")

adults = df[df["RIDAGEYR"] >= 18].copy()

# Target definition
adults["TARGET_COMPOSITE_DIABETES"] = (
    (adults["DIQ010"] == 1) | 
    (adults["DIQ050"] == 1) | 
    (adults["DIQ070"] == 1) | 
    (adults["LBXGH"] >= 6.5) | 
    (adults["LBXGLU"] >= 126)
).astype(int)

# Check individual components overlap
print("=== OVERLAP OF TARGET COMPONENTS IN ADULTS (N = 5856) ===")
print("Total DIQ010 == 1 (Doctor diagnosed):", (adults["DIQ010"] == 1).sum())
print("Total DIQ050 == 1 (Taking insulin):", (adults["DIQ050"] == 1).sum())
print("Total DIQ070 == 1 (Taking pills):", (adults["DIQ070"] == 1).sum())
print("Total LBXGH >= 6.5 (Lab HbA1c elevated):", (adults["LBXGH"] >= 6.5).sum())
print("Total LBXGLU >= 126 (Lab Fasting Glucose elevated):", (adults["LBXGLU"] >= 126).sum())

# Overlap of DIQ050/DIQ070 with DIQ010
meds_without_diag = ((adults["DIQ010"] != 1) & ((adults["DIQ050"] == 1) | (adults["DIQ070"] == 1))).sum()
print(f"Taking diabetes meds but DIQ010 != 1: {meds_without_diag}")
if meds_without_diag > 0:
    print(adults[((adults["DIQ010"] != 1) & ((adults["DIQ050"] == 1) | (adults["DIQ070"] == 1)))][["DIQ010", "DIQ050", "DIQ070", "DIQ160", "LBXGH"]])

# Undiagnosed: No self-report diagnosis or meds, but lab elevated
undiag = (
    (adults["DIQ010"] != 1) & 
    (adults["DIQ050"] != 1) & 
    (adults["DIQ070"] != 1) & 
    ((adults["LBXGH"] >= 6.5) | (adults["LBXGLU"] >= 126))
).sum()
print(f"Undiagnosed lab-positive diabetes (DIQ != 1 and no meds, but HbA1c>=6.5 or Glu>=126): {undiag}")

# Controlled diagnosed: DIQ010 == 1, but HbA1c < 6.5 and Glu < 126
controlled = (
    (adults["DIQ010"] == 1) & 
    ((adults["LBXGH"] < 6.5) | adults["LBXGH"].isnull()) & 
    ((adults["LBXGLU"] < 126) | adults["LBXGLU"].isnull())
).sum()
print(f"Diagnosed diabetic but labs normal or controlled/unmeasured: {controlled}")

print("\n=== SCENARIO A FEATURE COMPLETENESS & PATTERNS ===")
scenario_a_cols = ["RIDAGEYR", "RIAGENDR", "BMXBMI", "SYS_BP_AVG", "DIA_BP_AVG", "LBXTC", "LBDHDD", "LBXSCR"]

# Check complete cases for Scenario A
complete_scenario_a = adults[scenario_a_cols].dropna()
print(f"Adults with all 8 Scenario A features present: {len(complete_scenario_a)} / {len(adults)} ({len(complete_scenario_a)/len(adults)*100:.2f}%)")

# Missing counts per feature in adults
print("\nMissing values per Scenario A feature in adults (N=5856):")
for col in scenario_a_cols:
    n_miss = adults[col].isnull().sum()
    pct = n_miss / len(adults) * 100
    print(f"  {col:12}: {n_miss:4} missing ({pct:5.2f}%)")

# Check distribution of number of missing features per participant
n_missing_per_row = adults[scenario_a_cols].isnull().sum(axis=1)
print("\nDistribution of missing Scenario A features per participant:")
print(n_missing_per_row.value_counts().sort_index())

print("\n=== CORRELATIONS OF SCENARIO A FEATURES WITH TARGET AND BIOMARKERS ===")
all_corr_cols = scenario_a_cols + ["TARGET_COMPOSITE_DIABETES", "LBXGH", "LBXGLU"]
corr_matrix = adults[all_corr_cols].corr()
print("Correlation with TARGET_COMPOSITE_DIABETES:")
print(corr_matrix["TARGET_COMPOSITE_DIABETES"].sort_values(ascending=False))

print("\nCorrelation with LBXGH (HbA1c):")
print(corr_matrix["LBXGH"].sort_values(ascending=False))

print("\nCorrelation with LBXGLU (Fasting Glucose):")
print(corr_matrix["LBXGLU"].sort_values(ascending=False))
