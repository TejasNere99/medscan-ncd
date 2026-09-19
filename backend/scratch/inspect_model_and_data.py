import os
import sys
import pickle
import joblib
import pandas as pd
import numpy as np

pkl_path = r"c:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD\ml_model\diabetes_random_forest.pkl"
csv_path = r"c:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD\ml_model\diabetes.csv"

print("=== INSPECTING PKL FILE ===")
print("File exists:", os.path.exists(pkl_path))
print("File size (bytes):", os.path.getsize(pkl_path))

try:
    with open(pkl_path, 'rb') as f:
        model = joblib.load(f)
    print("Successfully loaded with joblib!")
    print("Model type:", type(model))
    print("Model class:", model.__class__.__name__)
    print("Attributes in model:")
    for attr in dir(model):
        if not attr.startswith('__') and not callable(getattr(model, attr)):
            val = getattr(model, attr)
            if attr in ['estimators_', 'feature_importances_', 'classes_', 'n_features_in_', 'feature_names_in_', 'n_outputs_']:
                print(f"  {attr}: {val if attr != 'estimators_' else len(val)}")
            elif attr in ['n_estimators', 'max_depth', 'min_samples_split', 'min_samples_leaf', 'max_features', 'class_weight', 'random_state', 'bootstrap', 'criterion']:
                print(f"  {attr}: {val}")
    
    if hasattr(model, 'feature_importances_'):
        print("Feature importances:", model.feature_importances_)
    if hasattr(model, 'feature_names_in_'):
        print("Feature names in:", model.feature_names_in_)
    if hasattr(model, 'classes_'):
        print("Classes:", model.classes_)
except Exception as e:
    print("Error loading model:", e)

print("\n=== INSPECTING CSV DATASET ===")
if os.path.exists(csv_path):
    df = pd.read_csv(csv_path)
    print("Shape:", df.shape)
    print("Columns:", list(df.columns))
    print("Data types:\n", df.dtypes)
    print("\nMissing values (isna):\n", df.isna().sum())
    print("\nZero values per column:")
    for col in df.columns:
        print(f"  {col}: {(df[col] == 0).sum()} zeros ({((df[col] == 0).mean()*100):.1f}%)")
    print("\nDuplicate rows:", df.duplicated().sum())
    print("\nOutcome distribution:\n", df['Outcome'].value_counts(dropna=False))
    print("\nDescribe summary:\n", df.describe().T[['min', 'mean', '50%', 'max']])

    print("\nInspect Insulin values:")
    print("Insulin mode / top values:")
    print(df['Insulin'].value_counts().head(10))
    print("Outcome 1 insulin top values:")
    print(df[df['Outcome'] == 1]['Insulin'].value_counts().head(5))
    print("Outcome 0 insulin top values:")
    print(df[df['Outcome'] == 0]['Insulin'].value_counts().head(5))
