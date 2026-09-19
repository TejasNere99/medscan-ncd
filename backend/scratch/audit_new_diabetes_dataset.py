import pandas as pd
import numpy as np

csv_path = r"c:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD\ml_model\datasets\diabetes\diabetes_data_upload.csv"

df = pd.read_csv(csv_path)

print("=== DATASET SHAPE ===")
print("Rows:", df.shape[0])
print("Columns:", df.shape[1])

print("\n=== COLUMN NAMES & DTYPES ===")
for col in df.columns:
    print(f"'{col}': {df[col].dtype}")

print("\n=== MISSING VALUES ===")
print(df.isnull().sum())

print("\n=== DUPLICATE ROWS ===")
print("Number of duplicate rows:", df.duplicated().sum())
print("Unique rows:", len(df.drop_duplicates()))

print("\n=== TARGET DISTRIBUTION ('class') ===")
print(df['class'].value_counts())
print(df['class'].value_counts(normalize=True) * 100)

print("\n=== CATEGORICAL FEATURES UNIQUE VALUES ===")
for col in df.columns:
    if col != 'Age':
        print(f"{col}: {df[col].unique().tolist()}")

print("\n=== AGE SUMMARY STATISTICS ===")
print(df['Age'].describe())
print("Age min:", df['Age'].min(), "Age max:", df['Age'].max())
print("Suspicious age values (<1 or >120):", ((df['Age'] < 1) | (df['Age'] > 120)).sum())

print("\n=== CROSS TABS / TARGET CORRELATION WITH SYMPTOMS ===")
# Map yes/no to 1/0, male/female to 1/0, positive/negative to 1/0 for correlation check
df_encoded = df.copy()
for col in df_encoded.columns:
    if col == 'Gender':
        df_encoded[col] = df_encoded[col].map({'Male': 1, 'Female': 0})
    elif col == 'class':
        df_encoded[col] = df_encoded[col].map({'Positive': 1, 'Negative': 0})
    elif col != 'Age':
        df_encoded[col] = df_encoded[col].map({'Yes': 1, 'No': 0})

print("Correlations with target 'class':")
corr = df_encoded.corr()['class'].sort_values(ascending=False)
print(corr)

print("\n=== EXAMINE DUPLICATES ===")
# If duplicate rows exist, do they have conflicting class labels?
duplicates = df[df.duplicated(keep=False)]
print("Number of rows involved in duplicates:", len(duplicates))
feature_cols = [c for c in df.columns if c != 'class']
conflicting_dups = df.groupby(feature_cols)['class'].nunique()
print("Feature identical sets with conflicting target class:", (conflicting_dups > 1).sum())

print("\n=== CROSS TAB OF GENDER VS CLASS ===")
print(pd.crosstab(df['Gender'], df['class'], margins=True))

print("\n=== CROSS TAB OF POLYURIA VS CLASS ===")
print(pd.crosstab(df['Polyuria'], df['class'], margins=True))

print("\n=== CROSS TAB OF POLYDIPSIA VS CLASS ===")
print(pd.crosstab(df['Polydipsia'], df['class'], margins=True))
