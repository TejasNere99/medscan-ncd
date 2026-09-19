import os
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

raw_dir = r"c:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD\ml_model\datasets\diabetes\raw\nhanes_2017_2018"
prepared_dir = r"c:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD\ml_model\datasets\diabetes\prepared"
prep_script_dir = r"c:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD\ml_model\datasets\diabetes\preparation"
eda_dir = r"c:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD\ml_model\datasets\diabetes\eda"
audit_dir = r"c:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD\ml_model\datasets\diabetes\audit"

os.makedirs(prepared_dir, exist_ok=True)
os.makedirs(prep_script_dir, exist_ok=True)
os.makedirs(eda_dir, exist_ok=True)
os.makedirs(audit_dir, exist_ok=True)

# 1. Load raw files
demo = pd.read_sas(os.path.join(raw_dir, "DEMO_J.XPT"), format="xport")
bmx = pd.read_sas(os.path.join(raw_dir, "BMX_J.XPT"), format="xport")
bpx = pd.read_sas(os.path.join(raw_dir, "BPX_J.XPT"), format="xport")
glu = pd.read_sas(os.path.join(raw_dir, "GLU_J.XPT"), format="xport")
ghb = pd.read_sas(os.path.join(raw_dir, "GHB_J.XPT"), format="xport")
diq = pd.read_sas(os.path.join(raw_dir, "DIQ_J.XPT"), format="xport")
biopro = pd.read_sas(os.path.join(raw_dir, "BIOPRO_J.XPT"), format="xport")
tchol = pd.read_sas(os.path.join(raw_dir, "TCHOL_J.XPT"), format="xport")
hdl = pd.read_sas(os.path.join(raw_dir, "HDL_J.XPT"), format="xport")

# 2. Extract and sanitize Blood Pressure
# Clean near-zero floats from SAS representation
for col in ["BPXDI1", "BPXDI2", "BPXDI3"]:
    bpx[col] = bpx[col].apply(lambda x: 0.0 if pd.notnull(x) and x < 1e-10 else x)

def compute_clean_bp(row):
    # Systolic
    sys_cands = [s for s in [row["BPXSY2"], row["BPXSY3"]] if pd.notnull(s) and s >= 60]
    if len(sys_cands) == 2:
        final_sys = np.mean(sys_cands)
    elif len(sys_cands) == 1:
        final_sys = sys_cands[0]
    elif pd.notnull(row["BPXSY1"]) and row["BPXSY1"] >= 60:
        final_sys = row["BPXSY1"]
    else:
        final_sys = np.nan

    # Diastolic: prefer readings >= 30 mmHg (auscultatory sounds)
    dia_cands = [d for d in [row["BPXDI2"], row["BPXDI3"]] if pd.notnull(d) and d >= 30]
    if len(dia_cands) == 2:
        final_dia = np.mean(dia_cands)
    elif len(dia_cands) == 1:
        final_dia = dia_cands[0]
    elif pd.notnull(row["BPXDI1"]) and row["BPXDI1"] >= 30:
        final_dia = row["BPXDI1"]
    else:
        # If all readings are < 30, check if any non-null exists
        all_dias = [d for d in [row["BPXDI1"], row["BPXDI2"], row["BPXDI3"]] if pd.notnull(d)]
        if len(all_dias) > 0:
            final_dia = np.mean(all_dias) # recorded as extreme / low
        else:
            final_dia = np.nan

    return pd.Series([final_sys, final_dia], index=["SYS_BP_AVG", "DIA_BP_AVG"])

bp_clean = bpx.apply(compute_clean_bp, axis=1)
bpx["SYS_BP_AVG"] = bp_clean["SYS_BP_AVG"]
bpx["DIA_BP_AVG"] = bp_clean["DIA_BP_AVG"]

# 3. Merging participants on SEQN
merged = demo[["SEQN", "RIDAGEYR", "RIAGENDR"]].copy()
merged = merged.merge(bmx[["SEQN", "BMXBMI"]], on="SEQN", how="left")
merged = merged.merge(bpx[["SEQN", "SYS_BP_AVG", "DIA_BP_AVG"]], on="SEQN", how="left")
merged = merged.merge(tchol[["SEQN", "LBXTC"]], on="SEQN", how="left")
merged = merged.merge(hdl[["SEQN", "LBDHDD"]], on="SEQN", how="left")
merged = merged.merge(biopro[["SEQN", "LBXSCR"]], on="SEQN", how="left")
merged = merged.merge(diq[["SEQN", "DIQ010", "DIQ050", "DIQ070"]], on="SEQN", how="left")
merged = merged.merge(ghb[["SEQN", "LBXGH"]], on="SEQN", how="left")
merged = merged.merge(glu[["SEQN", "LBXGLU"]], on="SEQN", how="left")

# 4. Filter to Adult Cohort (Age >= 18)
adults = merged[merged["RIDAGEYR"] >= 18].copy()

# 5. Handle Special Codes in DIQ Questionnaire
# DIQ010: 7=Refused, 9=Don't know -> NaN
# DIQ050: 7=Refused, 9=Don't know -> NaN
# DIQ070: 7=Refused, 9=Don't know -> NaN
adults["DIQ010_clean"] = adults["DIQ010"].replace({7.0: np.nan, 9.0: np.nan})
adults["DIQ050_clean"] = adults["DIQ050"].replace({7.0: np.nan, 9.0: np.nan})
adults["DIQ070_clean"] = adults["DIQ070"].replace({7.0: np.nan, 9.0: np.nan})

# 6. Target Construction: TARGET_COMPOSITE_DIABETES
# DIQ010 == 1 OR DIQ050 == 1 OR DIQ070 == 1 OR LBXGH >= 6.5 OR LBXGLU >= 126
adults["target_diabetes"] = (
    (adults["DIQ010_clean"] == 1) |
    (adults["DIQ050_clean"] == 1) |
    (adults["DIQ070_clean"] == 1) |
    (adults["LBXGH"] >= 6.5) |
    (adults["LBXGLU"] >= 126)
).astype(int)

# 7. Map Sex: 1=Male -> 1, 2=Female -> 0 (Binary encoding)
# In RIAGENDR: 1 is Male, 2 is Female
adults["sex"] = adults["RIAGENDR"].map({1.0: 1, 2.0: 0}).astype(int)

# 8. Standardize column names for candidate dataset
# age, sex, bmi, systolic_bp, diastolic_bp, total_cholesterol, hdl, creatinine, target_diabetes
adults["SEQN"] = adults["SEQN"].astype(int)
adults["age"] = adults["RIDAGEYR"].astype(int)
adults["bmi"] = adults["BMXBMI"].round(2)
adults["systolic_bp"] = adults["SYS_BP_AVG"].round(1)
adults["diastolic_bp"] = adults["DIA_BP_AVG"].round(1)
adults["total_cholesterol"] = adults["LBXTC"].round(1)
adults["hdl"] = adults["LBDHDD"].round(1)
adults["creatinine"] = adults["LBXSCR"].round(2)

final_cols = [
    "SEQN", "age", "sex", "bmi",
    "systolic_bp", "diastolic_bp",
    "total_cholesterol", "hdl", "creatinine",
    "target_diabetes"
]

candidate_df = adults[final_cols].copy()

# Save prepared candidate dataset
candidate_path = os.path.join(prepared_dir, "scenario_a_candidate.csv")
candidate_df.to_csv(candidate_path, index=False)
print(f"[OK] Saved prepared candidate dataset: {candidate_path} ({len(candidate_df)} rows, {len(candidate_df.columns)} columns)")

# 9. Perform detailed statistical and outlier analysis
features = ["age", "bmi", "systolic_bp", "diastolic_bp", "total_cholesterol", "hdl", "creatinine"]

stats = []
for f in features:
    s = candidate_df[f].dropna()
    q1 = s.quantile(0.25)
    q3 = s.quantile(0.75)
    iqr = q3 - q1
    lower_iqr = q1 - 1.5 * iqr
    upper_iqr = q3 + 1.5 * iqr
    outliers_iqr = ((s < lower_iqr) | (s > upper_iqr)).sum()
    
    stats.append({
        "Feature": f,
        "Valid Count": len(s),
        "Missing": candidate_df[f].isnull().sum(),
        "Missing %": f"{candidate_df[f].isnull().mean()*100:.2f}%",
        "Min": s.min(),
        "Q1": round(q1, 2),
        "Median": round(s.median(), 2),
        "Mean": round(s.mean(), 2),
        "Q3": round(q3, 2),
        "Max": s.max(),
        "Std": round(s.std(), 2),
        "IQR": round(iqr, 2),
        "IQR Outliers": outliers_iqr,
        "IQR Outliers %": f"{outliers_iqr / len(s) * 100:.2f}%"
    })

stats_df = pd.DataFrame(stats)
print("\n=== FEATURE STATISTICS & IQR OUTLIERS ===")
print(stats_df.to_string(index=False))

# 10. Generate EDA Visualizations
print("\n=== GENERATING EDA PLOTS ===")

# Plot 1: Target distribution
plt.figure(figsize=(6, 4))
target_counts = candidate_df["target_diabetes"].value_counts()
sns.barplot(x=["Non-Diabetic (0)", "Diabetic / High Risk (1)"], y=target_counts.values, palette=["#2b6cb0", "#c53030"])
plt.title("Scenario A: Target Distribution (N = 5,856 Adults)")
plt.ylabel("Participant Count")
for i, v in enumerate(target_counts.values):
    plt.text(i, v + 50, f"{v} ({v/len(candidate_df)*100:.1f}%)", ha="center", fontweight="bold")
plt.tight_layout()
plt.savefig(os.path.join(eda_dir, "eda_target_distribution.png"), dpi=150)
plt.close()

# Plot 2: Correlation Heatmap
plt.figure(figsize=(9, 7))
corr = candidate_df.drop(columns=["SEQN"]).corr()
sns.heatmap(corr, annot=True, cmap="coolwarm", fmt=".2f", linewidths=0.5, cbar_kws={'label': 'Pearson Correlation'})
plt.title("Scenario A: Correlation Heatmap (Predictors & Target)")
plt.tight_layout()
plt.savefig(os.path.join(eda_dir, "eda_correlation_matrix.png"), dpi=150)
plt.close()

# Plot 3: Feature Distributions
fig, axes = plt.subplots(3, 3, figsize=(14, 10))
axes = axes.flatten()
for idx, f in enumerate(features):
    sns.histplot(candidate_df[f].dropna(), kde=True, ax=axes[idx], color="#2b6cb0", bins=30)
    axes[idx].set_title(f"Distribution: {f}")
    axes[idx].set_ylabel("Count")

# Sex distribution
sns.countplot(x=candidate_df["sex"].map({1: "Male", 0: "Female"}), ax=axes[7], palette=["#3182ce", "#e53e3e"])
axes[7].set_title("Distribution: sex")
axes[7].set_ylabel("Count")

axes[8].axis('off')
plt.suptitle("Scenario A: Predictor Feature Distributions", fontsize=14, fontweight="bold")
plt.tight_layout()
plt.savefig(os.path.join(eda_dir, "eda_feature_distributions.png"), dpi=150)
plt.close()

# Plot 4: Boxplots by Target Status
fig, axes = plt.subplots(2, 4, figsize=(16, 8))
axes = axes.flatten()
for idx, f in enumerate(features):
    sns.boxplot(x=candidate_df["target_diabetes"].map({0: "Non-Diabetic", 1: "Diabetic"}), 
                y=candidate_df[f], ax=axes[idx], palette=["#2b6cb0", "#c53030"])
    axes[idx].set_title(f"{f} by Diabetes Status")
    axes[idx].set_xlabel("")

# Sex by target
ct = pd.crosstab(candidate_df["sex"].map({1: "Male", 0: "Female"}), 
                 candidate_df["target_diabetes"].map({0: "Non-Diabetic", 1: "Diabetic"}), normalize="index") * 100
ct.plot(kind="bar", stacked=True, ax=axes[7], color=["#2b6cb0", "#c53030"])
axes[7].set_title("Sex Proportions by Diabetes Status")
axes[7].set_ylabel("Percentage (%)")
axes[7].set_xlabel("")
plt.setp(axes[7].get_xticklabels(), rotation=0)

plt.suptitle("Scenario A: Predictors Stratified by Diabetes Status", fontsize=14, fontweight="bold")
plt.tight_layout()
plt.savefig(os.path.join(eda_dir, "eda_boxplots_by_target.png"), dpi=150)
plt.close()

# Plot 5: Missingness Visualization
plt.figure(figsize=(10, 5))
miss = candidate_df.drop(columns=["SEQN"]).isnull().sum() / len(candidate_df) * 100
sns.barplot(x=miss.index, y=miss.values, palette="Blues_r")
plt.title("Scenario A: Missingness Percentage per Feature (N = 5,856)")
plt.ylabel("Missing (%)")
plt.xticks(rotation=30, ha="right")
for i, v in enumerate(miss.values):
    plt.text(i, v + 0.3, f"{v:.1f}%", ha="center", fontsize=9)
plt.tight_layout()
plt.savefig(os.path.join(eda_dir, "eda_missingness_percentage.png"), dpi=150)
plt.close()

print("[OK] All 5 EDA figures saved successfully to:", eda_dir)
