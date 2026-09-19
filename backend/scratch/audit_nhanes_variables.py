import os
import pandas as pd
import numpy as np

raw_dir = r"c:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD\ml_model\datasets\diabetes\raw\nhanes_2017_2018"

files = {
    "DEMO_J": "DEMO_J.XPT",
    "BMX_J": "BMX_J.XPT",
    "BPX_J": "BPX_J.XPT",
    "GLU_J": "GLU_J.XPT",
    "GHB_J": "GHB_J.XPT",
    "DIQ_J": "DIQ_J.XPT",
    "BIOPRO_J": "BIOPRO_J.XPT",
    "TCHOL_J": "TCHOL_J.XPT",
    "HDL_J": "HDL_J.XPT",
    "TRIGLY_J": "TRIGLY_J.XPT"
}

dfs = {}
print("=== LOADING ALL NHANES 2017-2018 FILES ===")
for name, fname in files.items():
    fpath = os.path.join(raw_dir, fname)
    df = pd.read_sas(fpath, format="xport")
    dfs[name] = df
    print(f"{name:10}: {len(df):5} rows, {len(df.columns):3} cols | Unique SEQN: {df['SEQN'].nunique()} (Duplicates: {df['SEQN'].duplicated().sum()})")

print("\n=== PHASE 4: TARGET VARIABLE INVESTIGATION IN DIQ_J ===")
diq = dfs["DIQ_J"]

print("\n--- DIQ010 (Doctor told you have diabetes) ---")
print(diq["DIQ010"].value_counts(dropna=False))
# 1 = Yes, 2 = No, 3 = Borderline, 7 = Refused, 9 = Don't Know

print("\n--- DIQ050 (Taking insulin now) ---")
print(diq["DIQ050"].value_counts(dropna=False))

print("\n--- DIQ070 (Take diabetic pills to lower blood sugar) ---")
print(diq["DIQ070"].value_counts(dropna=False))

print("\n--- DIQ160 (Ever told you have prediabetes) ---")
print(diq["DIQ160"].value_counts(dropna=False))

print("\n=== PHASE 2 & 3: CANDIDATE VARIABLE DISTRIBUTIONS ===")

print("\n--- DEMO_J: RIDAGEYR (Age) ---")
print(dfs["DEMO_J"]["RIDAGEYR"].describe())

print("\n--- DEMO_J: RIAGENDR (Gender: 1=Male, 2=Female) ---")
print(dfs["DEMO_J"]["RIAGENDR"].value_counts(dropna=False))

print("\n--- BMX_J: BMXBMI (BMI) ---")
print(dfs["BMX_J"]["BMXBMI"].describe())
print("Missing BMI:", dfs["BMX_J"]["BMXBMI"].isnull().sum())

print("\n--- BMX_J: BMXWAIST (Waist Circumference) ---")
print(dfs["BMX_J"]["BMXWAIST"].describe())
print("Missing Waist:", dfs["BMX_J"]["BMXWAIST"].isnull().sum())

print("\n--- BPX_J: Blood Pressure Readings ---")
bp = dfs["BPX_J"]
print("BPXSY1 describe:\n", bp["BPXSY1"].describe())
print("BPXDI1 describe:\n", bp["BPXDI1"].describe())
print("BPXSY2 describe:\n", bp["BPXSY2"].describe())
print("BPXDI2 describe:\n", bp["BPXDI2"].describe())
print("BPXSY3 describe:\n", bp["BPXSY3"].describe())
print("BPXDI3 describe:\n", bp["BPXDI3"].describe())

print("\n--- GLU_J: LBXGLU (Fasting Glucose mg/dL) ---")
print(dfs["GLU_J"]["LBXGLU"].describe())
print("Missing Fasting Glucose in GLU_J:", dfs["GLU_J"]["LBXGLU"].isnull().sum())

print("\n--- GHB_J: LBXGH (HbA1c %) ---")
print(dfs["GHB_J"]["LBXGH"].describe())
print("Missing HbA1c in GHB_J:", dfs["GHB_J"]["LBXGH"].isnull().sum())

print("\n--- BIOPRO_J: LBXSCR (Serum Creatinine mg/dL) ---")
print(dfs["BIOPRO_J"]["LBXSCR"].describe())

print("\n--- TCHOL_J: LBXTC (Total Cholesterol mg/dL) ---")
print(dfs["TCHOL_J"]["LBXTC"].describe())

print("\n--- HDL_J: LBDHDD (HDL Cholesterol mg/dL) ---")
print(dfs["HDL_J"]["LBDHDD"].describe())

print("\n--- TRIGLY_J: LBDLDL (LDL Cholesterol mg/dL) ---")
print(dfs["TRIGLY_J"]["LBDLDL"].describe())
