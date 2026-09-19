import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, recall_score, precision_score, f1_score, roc_auc_score, confusion_matrix

csv_path = r"c:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD\ml_model\diabetes.csv"
pkl_path = r"c:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD\ml_model\diabetes_random_forest.pkl"

df = pd.read_csv(csv_path)

print("=== CHECKING CLASS-CONDITIONAL VALUES IN OTHER COLUMNS ===")
for col in ['Glucose', 'BloodPressure', 'SkinThickness', 'BMI']:
    print(f"\n--- {col} ---")
    val_counts = df[col].value_counts().head(5)
    print("Top 5 overall:\n", val_counts)
    print("Top 3 for Outcome=0:\n", df[df['Outcome']==0][col].value_counts().head(3))
    print("Top 3 for Outcome=1:\n", df[df['Outcome']==1][col].value_counts().head(3))

print("\n=== REPRODUCING NOTEBOOK PIPELINE ===")
# In the notebook:
# Cell 11: X = df.drop(columns='Outcome', axis=1), y = df['Outcome']
# Cell 14: X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
# Wait, did Cell 14 use stratify? Let's check notebook cells.

X = df.drop(columns=['Outcome'])
y = df['Outcome']

# Let's test with stratify and without stratify
for strat in [None, y]:
    strat_name = "stratify=y" if strat is not None else "stratify=None"
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=strat)
    
    # Model from Cell 67:
    # final_rf = RandomForestClassifier(n_estimators=200, max_depth=5, min_samples_split=2, min_samples_leaf=2, max_features='sqrt', random_state=42)
    rf_reproduced = RandomForestClassifier(
        n_estimators=200,
        max_depth=5,
        min_samples_split=2,
        min_samples_leaf=2,
        max_features='sqrt',
        random_state=42
    )
    rf_reproduced.fit(X_train, y_train)
    y_pred = rf_reproduced.predict(X_test)
    y_prob = rf_reproduced.predict_proba(X_test)[:, 1]
    
    acc = accuracy_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    roc = roc_auc_score(y_test, y_prob)
    cm = confusion_matrix(y_test, y_pred)
    
    print(f"\n--- Split with {strat_name} ---")
    print(f"Accuracy: {acc:.4f}, Recall: {rec:.4f}, Precision: {prec:.4f}, F1: {f1:.4f}, ROC-AUC: {roc:.4f}")
    print("Confusion Matrix:\n", cm)
    print("Feature Importances:\n", rf_reproduced.feature_importances_)

print("\n=== COMPARING WITH EXISTING PKL MODEL ===")
existing_model = joblib.load(pkl_path)
print("Existing model params:", existing_model.get_params())
print("Existing model feature importances:\n", existing_model.feature_importances_)

# Evaluate existing model on test set from stratify=y
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
y_pred_exist = existing_model.predict(X_test)
y_prob_exist = existing_model.predict_proba(X_test)[:, 1]
acc_e = accuracy_score(y_test, y_pred_exist)
rec_e = recall_score(y_test, y_pred_exist)
roc_e = roc_auc_score(y_test, y_prob_exist)
cm_e = confusion_matrix(y_test, y_pred_exist)
print(f"\nExisting model on stratify=y X_test:")
print(f"Accuracy: {acc_e:.4f}, Recall: {rec_e:.4f}, ROC-AUC: {roc_e:.4f}")
print("Confusion matrix:\n", cm_e)
