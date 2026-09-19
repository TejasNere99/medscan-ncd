"""
MedScan-NCD: Phase 7B Forensic Inspection of Framingham Heart Study Dataset
===========================================================================
Programmatically analyzes the raw Framingham Heart Study teaching cohort.
Generates comprehensive quantitative profile for dataset_profile.json.
"""

import os
import json
import hashlib
import numpy as np
import pandas as pd

def sha256_checksum(filename, block_size=65536):
    sha256 = hashlib.sha256()
    with open(filename, 'rb') as f:
        for block in iter(lambda: f.read(block_size), b''):
            sha256.update(block)
    return sha256.hexdigest()

def inspect_dataset():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    raw_path = os.path.join(base_dir, "raw", "framingham.csv")
    output_dir = os.path.abspath(os.path.join(base_dir, "..", "heart_disease"))
    os.makedirs(output_dir, exist_ok=True)
    json_output_path = os.path.join(output_dir, "dataset_profile.json")

    print(f"Loading raw dataset from: {raw_path}")
    df = pd.read_csv(raw_path)
    file_checksum = sha256_checksum(raw_path)
    file_size_bytes = os.path.getsize(raw_path)

    n_rows, n_cols = df.shape
    exact_columns = list(df.columns)

    print(f"Dataset Shape: {n_rows} rows x {n_cols} columns")
    print(f"Columns: {exact_columns}")

    # Duplicates check
    exact_duplicates = int(df.duplicated().sum())

    # Column profile
    col_profiles = {}
    for col in exact_columns:
        s = df[col]
        missing_count = int(s.isna().sum())
        missing_pct = float((missing_count / n_rows) * 100.0)
        n_unique = int(s.nunique(dropna=True))
        dtype_str = str(s.dtype)

        is_numeric = pd.api.types.is_numeric_dtype(s)
        is_binary = (n_unique == 2) and (missing_count < n_rows)
        is_constant = (n_unique <= 1)
        
        col_info = {
            "name": col,
            "dtype": dtype_str,
            "missing_count": missing_count,
            "missing_percentage": round(missing_pct, 3),
            "unique_count": n_unique,
            "is_constant": is_constant,
            "is_binary": is_binary,
        }

        if is_numeric:
            clean_s = s.dropna()
            q1 = float(clean_s.quantile(0.25))
            q3 = float(clean_s.quantile(0.75))
            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            outliers_count = int(((clean_s < lower_bound) | (clean_s > upper_bound)).sum())

            col_info.update({
                "min": float(clean_s.min()),
                "max": float(clean_s.max()),
                "mean": round(float(clean_s.mean()), 3),
                "std": round(float(clean_s.std()), 3),
                "median": float(clean_s.median()),
                "p01": round(float(clean_s.quantile(0.01)), 2),
                "p05": round(float(clean_s.quantile(0.05)), 2),
                "p95": round(float(clean_s.quantile(0.95)), 2),
                "p99": round(float(clean_s.quantile(0.99)), 2),
                "iqr_outliers_count": outliers_count,
                "iqr_outliers_pct": round((outliers_count / len(clean_s)) * 100.0, 2)
            })
            if n_unique <= 10:
                val_counts = s.value_counts(dropna=False).to_dict()
                col_info["value_counts"] = {str(k): int(v) for k, v in val_counts.items()}
        else:
            val_counts = s.value_counts(dropna=False).to_dict()
            col_info["value_counts"] = {str(k): int(v) for k, v in val_counts.items()}

        col_profiles[col] = col_info

    # Target Variable analysis
    target_col = "TenYearCHD"
    target_s = df[target_col].dropna()
    pos_count = int((target_s == 1).sum())
    neg_count = int((target_s == 0).sum())
    total_target = len(target_s)
    prevalence = float(pos_count / total_target)
    imbalance_ratio = round(neg_count / pos_count, 3)

    target_profile = {
        "column": target_col,
        "total_labeled": total_target,
        "positive_count": pos_count,
        "negative_count": neg_count,
        "prevalence_pct": round(prevalence * 100.0, 2),
        "negative_pct": round((1.0 - prevalence) * 100.0, 2),
        "imbalance_ratio": imbalance_ratio,
        "missing_count": int(df[target_col].isna().sum())
    }

    # Clinical validation / impossible values checks
    clinical_checks = {
        "impossible_age_under_18": int((df["age"] < 18).sum()),
        "impossible_age_over_120": int((df["age"] > 120).sum()),
        "impossible_systolic_bp_under_50": int((df["sysBP"] < 50).sum()),
        "impossible_systolic_bp_over_300": int((df["sysBP"] > 300).sum()),
        "impossible_diastolic_bp_under_30": int((df["diaBP"] < 30).sum()),
        "impossible_diastolic_bp_over_200": int((df["diaBP"] > 200).sum()),
        "pulse_pressure_inverted (sys <= dia)": int((df["sysBP"] <= df["diaBP"]).sum()),
        "impossible_bmi_under_10": int((df["BMI"] < 10).sum()),
        "impossible_bmi_over_90": int((df["BMI"] > 90).sum()),
        "impossible_totChol_under_40": int((df["totChol"] < 40).sum()),
        "extreme_totChol_over_600": int((df["totChol"] > 600).sum()),
        "impossible_glucose_under_20": int((df["glucose"] < 20).sum()),
        "extreme_glucose_over_500": int((df["glucose"] > 500).sum()),
        "smoker_with_zero_cigs": int(((df["currentSmoker"] == 1) & (df["cigsPerDay"] == 0)).sum()),
        "non_smoker_with_positive_cigs": int(((df["currentSmoker"] == 0) & (df["cigsPerDay"] > 0)).sum())
    }

    # Correlation with target
    correlations = {}
    for col in exact_columns:
        if col != target_col:
            valid_idx = df[[col, target_col]].dropna().index
            if len(valid_idx) > 0:
                corr_val = float(df.loc[valid_idx, col].corr(df.loc[valid_idx, target_col]))
                correlations[col] = round(corr_val, 4)

    profile = {
        "dataset_name": "Framingham Heart Study 10-Year CHD Teaching Cohort",
        "provenance": {
            "source_type": "NHLBI BioLINCC Teaching Extract",
            "file_name": "framingham.csv",
            "file_size_bytes": file_size_bytes,
            "sha256": file_checksum,
            "format": "CSV",
        },
        "shape": {
            "rows": n_rows,
            "columns": n_cols
        },
        "exact_columns": exact_columns,
        "duplicate_rows": exact_duplicates,
        "target_profile": target_profile,
        "columns_profile": col_profiles,
        "correlations_with_target": correlations,
        "clinical_sanity_checks": clinical_checks
    }

    with open(json_output_path, "w") as f:
        json.dump(profile, f, indent=2)

    print(f"\nForensic inspection complete. Written to: {json_output_path}")
    print(f"Target: {pos_count} Positive ({prevalence*100:.2f}%) vs {neg_count} Negative")
    print("Clinical sanity checks:", clinical_checks)
    return profile

if __name__ == "__main__":
    inspect_dataset()
