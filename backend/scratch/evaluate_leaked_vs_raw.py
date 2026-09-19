import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import accuracy_score, recall_score, precision_score, f1_score, roc_auc_score, confusion_matrix, brier_score_loss
from sklearn.datasets import fetch_openml

pkl_path = r"c:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD\ml_model\diabetes_random_forest.pkl"
csv_path = r"c:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD\ml_model\diabetes.csv"

model = joblib.load(pkl_path)
df_leaked = pd.read_csv(csv_path)

X_leaked = df_leaked.drop(columns=['Outcome'])
y_leaked = df_leaked['Outcome']

X_train, X_test, y_train, y_test = train_test_split(X_leaked, y_leaked, test_size=0.2, random_state=42, stratify=y_leaked)

print("=== TRAIN PERFORMANCE ON LEAKED DATA ===")
y_pred_train = model.predict(X_train)
y_prob_train = model.predict_proba(X_train)[:, 1]
print(f"Train Accuracy: {accuracy_score(y_train, y_pred_train):.4f}")
print(f"Train Recall: {recall_score(y_train, y_pred_train):.4f}")
print(f"Train Precision: {precision_score(y_train, y_pred_train):.4f}")
print(f"Train F1: {f1_score(y_train, y_pred_train):.4f}")
print(f"Train ROC-AUC: {roc_auc_score(y_train, y_prob_train):.4f}")

print("\n=== TEST PERFORMANCE ON LEAKED DATA ===")
y_pred_test = model.predict(X_test)
y_prob_test = model.predict_proba(X_test)[:, 1]
print(f"Test Accuracy: {accuracy_score(y_test, y_pred_test):.4f}")
print(f"Test Recall: {recall_score(y_test, y_pred_test):.4f}")
print(f"Test Precision: {precision_score(y_test, y_pred_test):.4f}")
print(f"Test F1: {f1_score(y_test, y_pred_test):.4f}")
print(f"Test ROC-AUC: {roc_auc_score(y_test, y_prob_test):.4f}")
print(f"Test Brier Score: {brier_score_loss(y_test, y_prob_test):.4f}")
print("Test Confusion Matrix:\n", confusion_matrix(y_test, y_pred_test))

print("\n=== 5-FOLD STRATIFIED CV ON LEAKED DATA ===")
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_acc = cross_val_score(model, X_leaked, y_leaked, cv=cv, scoring='accuracy')
cv_roc = cross_val_score(model, X_leaked, y_leaked, cv=cv, scoring='roc_auc')
cv_rec = cross_val_score(model, X_leaked, y_leaked, cv=cv, scoring='recall')
print(f"CV Accuracy: {cv_acc.mean():.4f} (+/- {cv_acc.std():.4f})")
print(f"CV ROC-AUC: {cv_roc.mean():.4f} (+/- {cv_roc.std():.4f})")
print(f"CV Recall: {cv_rec.mean():.4f} (+/- {cv_rec.std():.4f})")

print("\n=== FETCHING RAW OPENML PIMA DATASET (dataset_id=37) ===")
try:
    pima_raw = fetch_openml(data_id=37, as_frame=True, parser='auto')
    df_raw = pima_raw.frame
    print("Raw OpenML Pima Shape:", df_raw.shape)
    print("Columns:", list(df_raw.columns))
    # Rename class column to Outcome and map to 0/1
    target_col = [c for c in df_raw.columns if c.lower() in ['class', 'outcome']][0]
    df_raw['Outcome'] = df_raw[target_col].map({'tested_negative': 0, 'tested_positive': 1, 0: 0, 1: 1, '0': 0, '1': 1})
    
    # Check features alignment
    expected_features = list(model.feature_names_in_)
    print("Expected features:", expected_features)
    
    # In raw Pima, columns might be named 'preg', 'plas', 'pres', 'skin', 'insu', 'mass', 'pedi', 'age'
    col_mapping = {
        'preg': 'Pregnancies', 'plas': 'Glucose', 'pres': 'BloodPressure',
        'skin': 'SkinThickness', 'insu': 'Insulin', 'mass': 'BMI',
        'pedi': 'DiabetesPedigreeFunction', 'age': 'Age'
    }
    df_raw_renamed = df_raw.rename(columns=col_mapping)
    print("Renamed columns:", list(df_raw_renamed.columns))
    
    X_raw = df_raw_renamed[expected_features].copy()
    y_raw = df_raw_renamed['Outcome']
    
    print("\nZeros in raw Pima (which are clinically missing):")
    for f in ['Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI']:
        print(f"  {f}: {(X_raw[f] == 0).sum()} zeros ({((X_raw[f] == 0).mean()*100):.1f}%)")
        
    # Evaluate the existing model directly on RAW Pima (where missing values are 0, as in real lab tests where insulin is not measured or 0):
    y_pred_raw = model.predict(X_raw)
    y_prob_raw = model.predict_proba(X_raw)[:, 1]
    print(f"\nExisting Model on Raw Pima (with 0s untreated):")
    print(f"Accuracy: {accuracy_score(y_raw, y_pred_raw):.4f}")
    print(f"Recall: {recall_score(y_raw, y_pred_raw):.4f}")
    print(f"ROC-AUC: {roc_auc_score(y_raw, y_prob_raw):.4f}")
    print("Confusion Matrix:\n", confusion_matrix(y_raw, y_pred_raw))
    
    # What if raw Pima is imputed with overall median (without target leakage)?
    X_raw_imputed = X_raw.copy()
    for col in ['Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI']:
        median_val = X_raw_imputed[X_raw_imputed[col] > 0][col].median()
        X_raw_imputed.loc[X_raw_imputed[col] == 0, col] = median_val
        
    y_pred_raw_imp = model.predict(X_raw_imputed)
    y_prob_raw_imp = model.predict_proba(X_raw_imputed)[:, 1]
    print(f"\nExisting Model on Raw Pima (with dataset-wide median imputation, NO TARGET LEAKAGE):")
    print(f"Accuracy: {accuracy_score(y_raw, y_pred_raw_imp):.4f}")
    print(f"Recall: {recall_score(y_raw, y_pred_raw_imp):.4f}")
    print(f"ROC-AUC: {roc_auc_score(y_raw, y_prob_raw_imp):.4f}")
    print("Confusion Matrix:\n", confusion_matrix(y_raw, y_pred_raw_imp))

except Exception as e:
    print("Error with OpenML raw test:", e)
