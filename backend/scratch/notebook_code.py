
# ============================================================
# CELL 0 (code)
# ============================================================
import os

os.makedirs("datasets", exist_ok=True)
os.makedirs("models", exist_ok=True)

print("Folders created successfully")

# --- OUTPUTS ---
# [text]: Folders created successfully
# 

# ============================================================
# CELL 1 (code)
# ============================================================
import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier

from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)

import joblib


# ============================================================
# CELL 2 (code)
# ============================================================
df = pd.read_csv("/content/diabetes.csv")

df.head()

# --- OUTPUTS ---
# [data]:    Pregnancies  Glucose  BloodPressure  SkinThickness  Insulin   BMI  \
# 0            6      148           72.0             35    169.5  33.6   
# 1            1       85           66.0             29    102.5  26.6   
# 2            8      183           64.0             32    169.5  23.3   
# 3            1       89           66.0             23     94.0  28.1   
# 4            0      137           40.0             35    168.0  43.1   
# 
#    DiabetesPedigreeFunction  Age  Outcome  
# 0                     0.627   50        1  
# 1                     0.351   31        0  
# 2                     0.672   32        1  
# 3                     0.167   21        0  
# 4                     2.288   33        1  

# ============================================================
# CELL 3 (code)
# ============================================================
print("Rows and Columns:", df.shape)

print()

df.info()


# --- OUTPUTS ---
# [text]: Rows and Columns: (768, 9)
# 
# <class 'pandas.core.frame.DataFrame'>
# RangeIndex: 768 entries, 0 to 767
# Data columns (total 9 columns):
#  #   Column                    Non-Null Count  Dtype  
# ---  ------                    --------------  -----  
#  0   Pregnancies               768 non-null    int64  
#  1   Glucose                   768 non-null    int64  
#  2   BloodPressure             768 non-null    float64
#  3   SkinThickness             768 non-null    int64  
#  4   Insulin                   768 non-null    float64
#  5   BMI                       768 non-null    float64
#  6   DiabetesPedigreeFunction  768 non-null    float64
#  7   Age                       768 non-null    int64  
#  8   Outcome                   768 non-null    int64  
# dtypes: float64(4), int64(5)
# memory usage: 54.1 KB
# 

# ============================================================
# CELL 4 (code)
# ============================================================
df.isnull().sum()

# --- OUTPUTS ---
# [data]: Pregnancies                 0
# Glucose                     0
# BloodPressure               0
# SkinThickness               0
# Insulin                     0
# BMI                         0
# DiabetesPedigreeFunction    0
# Age                         0
# Outcome                     0
# dtype: int64

# ============================================================
# CELL 5 (code)
# ============================================================
(df == 0).sum()

# --- OUTPUTS ---
# [data]: Pregnancies                 111
# Glucose                       0
# BloodPressure                 0
# SkinThickness                 0
# Insulin                       0
# BMI                           0
# DiabetesPedigreeFunction      0
# Age                           0
# Outcome                     500
# dtype: int64

# ============================================================
# CELL 6 (code)
# ============================================================
print("Dataset Shape:")
print(df.shape)

print("\nOutcome Distribution:")
print(df["Outcome"].value_counts())

print("\nData Types:")
print(df.dtypes)

print("\nMinimum Values:")
print(df.min())

print("\nMaximum Values:")
print(df.max())

# --- OUTPUTS ---
# [text]: Dataset Shape:
# (768, 9)
# 
# Outcome Distribution:
# Outcome
# 0    500
# 1    268
# Name: count, dtype: int64
# 
# Data Types:
# Pregnancies                   int64
# Glucose                       int64
# BloodPressure               float64
# SkinThickness                 int64
# Insulin                     float64
# BMI                         float64
# DiabetesPedigreeFunction    float64
# Age                           int64
# Outcome                       int64
# dtype: object
# 
# Minimum Values:
# Pregnancies                  0.000
# Glucose                     44.000
# BloodPressure               24.000
# SkinThickness                7.000
# Insulin                     14.000
# BMI                         18.200
# DiabetesPedigreeFunction     0.078
# Age                         21.000
# Outcome                      0.000
# dtype: float64
# 
# Maximum Values:
# Pregnancies                  17.00
# Glucose                     199.00
# BloodPressure               122.00
# SkinThickness                99.00
# Insulin                     846.00
# BMI                          67.10
# DiabetesPedigreeFunction      2.42
# Age                          81.00
# Outcome                       1.00
# dtype: float64
# 

# ============================================================
# CELL 7 (code)
# ============================================================
print("Duplicate rows:", df.duplicated().sum())

print("\nZero values in each column:")
print((df == 0).sum())

print("\nMedian values:")
print(df.median())

# --- OUTPUTS ---
# [text]: Duplicate rows: 0
# 
# Zero values in each column:
# Pregnancies                 111
# Glucose                       0
# BloodPressure                 0
# SkinThickness                 0
# Insulin                       0
# BMI                           0
# DiabetesPedigreeFunction      0
# Age                           0
# Outcome                     500
# dtype: int64
# 
# Median values:
# Pregnancies                   3.0000
# Glucose                     117.0000
# BloodPressure                72.0000
# SkinThickness                28.0000
# Insulin                     102.5000
# BMI                          32.0500
# DiabetesPedigreeFunction      0.3725
# Age                          29.0000
# Outcome                       0.0000
# dtype: float64
# 

# ============================================================
# CELL 8 (code)
# ============================================================
!pip install -q openml # previous dataset was preprocessed which might have caused us problem


# --- OUTPUTS ---
# [text]:   Preparing metadata (setup.py) ... [?25l[?25hdone
# [2K   [90m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━[0m [32m160.4/160.4 kB[0m [31m5.9 MB/s[0m eta [36m0:00:00[0m
# [2K   [90m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━[0m [32m93.8/93.8 kB[0m [31m7.2 MB/s[0m eta [36m0:00:00[0m
# [2K   [90m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━[0m [32m2.3/2.3 MB[0m [31m47.7 MB/s[0m eta [36m0:00:00[0m
# [?25h  Building wheel for liac-arff (setup.py) ... [?25l[?25hdone
# 

# ============================================================
# CELL 9 (code)
# ============================================================
!pip install -q openml

# ============================================================
# CELL 10 (code)
# ============================================================
import openml

dataset = openml.datasets.get_dataset(
    37,
    download_data=True
)

X, y, categorical_indicator, attribute_names = dataset.get_data(
    target=dataset.default_target_attribute
)

df_raw = X.copy()
df_raw["Outcome"] = y

print("Shape:", df_raw.shape)
print("\nColumns:")
print(df_raw.columns.tolist())

display(df_raw.head())

# --- OUTPUTS ---
# [text]: Shape: (768, 9)
# 
# Columns:
# ['preg', 'plas', 'pres', 'skin', 'insu', 'mass', 'pedi', 'age', 'Outcome']
# 
# [data]:    preg   plas  pres  skin   insu  mass   pedi   age          Outcome
# 0   6.0  148.0  72.0  35.0    0.0  33.6  0.627  50.0  tested_positive
# 1   1.0   85.0  66.0  29.0    0.0  26.6  0.351  31.0  tested_negative
# 2   8.0  183.0  64.0   0.0    0.0  23.3  0.672  32.0  tested_positive
# 3   1.0   89.0  66.0  23.0   94.0  28.1  0.167  21.0  tested_negative
# 4   0.0  137.0  40.0  35.0  168.0  43.1  2.288  33.0  tested_positive

# ============================================================
# CELL 11 (code)
# ============================================================
df_raw = df_raw.rename(columns={
    "preg": "Pregnancies",
    "plas": "Glucose",
    "pres": "BloodPressure",
    "skin": "SkinThickness",
    "insu": "Insulin",
    "mass": "BMI",
    "pedi": "DiabetesPedigreeFunction",
    "age": "Age"
})

print(df_raw.columns.tolist())

# --- OUTPUTS ---
# [text]: ['Pregnancies', 'Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI', 'DiabetesPedigreeFunction', 'Age', 'Outcome']
# 

# ============================================================
# CELL 12 (code)
# ============================================================
df_raw["Outcome"] = df_raw["Outcome"].map({
    "tested_negative": 0,
    "tested_positive": 1
})

print(df_raw["Outcome"].value_counts())


# --- OUTPUTS ---
# [text]: Outcome
# 0    500
# 1    268
# Name: count, dtype: int64
# 

# ============================================================
# CELL 13 (code)
# ============================================================
print("Missing values in each column:")
print(df_raw.isnull().sum())

# --- OUTPUTS ---
# [text]: Missing values in each column:
# Pregnancies                 0
# Glucose                     0
# BloodPressure               0
# SkinThickness               0
# Insulin                     0
# BMI                         0
# DiabetesPedigreeFunction    0
# Age                         0
# Outcome                     0
# dtype: int64
# 

# ============================================================
# CELL 14 (code)
# ============================================================
print("Zero values in each column:")
print((df_raw == 0).sum())

# --- OUTPUTS ---
# [text]: Zero values in each column:
# Pregnancies                 111
# Glucose                       5
# BloodPressure                35
# SkinThickness               227
# Insulin                     374
# BMI                          11
# DiabetesPedigreeFunction      0
# Age                           0
# Outcome                     500
# dtype: int64
# 

# ============================================================
# CELL 15 (code)
# ============================================================
print("Number of duplicate rows:", df_raw.duplicated().sum())

# --- OUTPUTS ---
# [text]: Number of duplicate rows: 0
# 

# ============================================================
# CELL 16 (code)
# ============================================================
import matplotlib.pyplot as plt

df_raw["Outcome"].value_counts().plot(kind="bar")

plt.title("Diabetes Outcome Distribution")
plt.xlabel("Outcome")
plt.ylabel("Number of Patients")
plt.xticks([0, 1], ["No Diabetes", "Diabetes"], rotation=0)
plt.show()

# --- OUTPUTS ---
# [data]: <Figure size 640x480 with 1 Axes>

# ============================================================
# CELL 17 (code)
# ============================================================
cols = ['Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI']

df[cols] = df[cols].replace(0, np.nan)

print(df.isnull().sum())

# --- OUTPUTS ---
# [text]: Pregnancies                 0
# Glucose                     0
# BloodPressure               0
# SkinThickness               0
# Insulin                     0
# BMI                         0
# DiabetesPedigreeFunction    0
# Age                         0
# Outcome                     0
# dtype: int64
# 

# ============================================================
# CELL 18 (code)
# ============================================================
for col in cols:
    df[col] = df[col].fillna(df[col].median())

print(df.isnull().sum())

# --- OUTPUTS ---
# [text]: Pregnancies                 0
# Glucose                     0
# BloodPressure               0
# SkinThickness               0
# Insulin                     0
# BMI                         0
# DiabetesPedigreeFunction    0
# Age                         0
# Outcome                     0
# dtype: int64
# 

# ============================================================
# CELL 19 (code)
# ============================================================
print("Duplicate rows:", df.duplicated().sum())
print("\nMissing values:")
print(df.isnull().sum())

# --- OUTPUTS ---
# [text]: Duplicate rows: 0
# 
# Missing values:
# Pregnancies                 0
# Glucose                     0
# BloodPressure               0
# SkinThickness               0
# Insulin                     0
# BMI                         0
# DiabetesPedigreeFunction    0
# Age                         0
# Outcome                     0
# dtype: int64
# 

# ============================================================
# CELL 20 (code)
# ============================================================
df.describe()


# --- OUTPUTS ---
# [data]:        Pregnancies     Glucose  BloodPressure  SkinThickness     Insulin  \
# count   768.000000  768.000000     768.000000     768.000000  768.000000   
# mean      3.845052  121.677083      72.389323      29.089844  141.753906   
# std       3.369578   30.464161      12.106039       8.890820   89.100847   
# min       0.000000   44.000000      24.000000       7.000000   14.000000   
# 25%       1.000000   99.750000      64.000000      25.000000  102.500000   
# 50%       3.000000  117.000000      72.000000      28.000000  102.500000   
# 75%       6.000000  140.250000      80.000000      32.000000  169.500000   
# max      17.000000  199.000000     122.000000      99.000000  846.000000   
# 
#               BMI  DiabetesPedigreeFunction         Age     Outcome  
# count  768.000000                768.000000  768.000000  768.000000  
# mean    32.434635                  0.471876   33.240885    0.348958  
# std      6.880498                  0.331329   11.760232    0.476951  
# min     18.200000                  0.078000   21.000000    0.000000  
# 25%     27.500000                  0.243750   24.000000    0.000000  
# 50%     32.050000                  0.372500   29.000000    0.000000  
# 75%     36.600000                  0.626250   41.000000    1.000000  
# max     67.100000                  2.420000   81.000000    1.000000  

# ============================================================
# CELL 21 (code)
# ============================================================
print(df['Outcome'].value_counts())
print(df['Outcome'].value_counts(normalize=True) * 100)

# --- OUTPUTS ---
# [text]: Outcome
# 0    500
# 1    268
# Name: count, dtype: int64
# Outcome
# 0    65.104167
# 1    34.895833
# Name: proportion, dtype: float64
# 

# ============================================================
# CELL 22 (code)
# ============================================================
import matplotlib.pyplot as plt

df['Outcome'].value_counts().plot(kind='bar')

plt.xlabel('Outcome')
plt.ylabel('Number of Patients')
plt.title('Diabetes Outcome Distribution')
plt.xticks([0, 1], ['No Diabetes', 'Diabetes'], rotation=0)

plt.show()

# --- OUTPUTS ---
# [data]: <Figure size 640x480 with 1 Axes>

# ============================================================
# CELL 23 (code)
# ============================================================
import seaborn as sns
import matplotlib.pyplot as plt

plt.figure(figsize=(10, 7))

sns.heatmap(df.corr(), annot=True, cmap='coolwarm', fmt='.2f')

plt.title('Correlation Heatmap')
plt.show()

# --- OUTPUTS ---
# [data]: <Figure size 1000x700 with 2 Axes>

# ============================================================
# CELL 24 (code)
# ============================================================
df.describe()

# --- OUTPUTS ---
# [data]:        Pregnancies     Glucose  BloodPressure  SkinThickness     Insulin  \
# count   768.000000  768.000000     768.000000     768.000000  768.000000   
# mean      3.845052  121.677083      72.389323      29.089844  141.753906   
# std       3.369578   30.464161      12.106039       8.890820   89.100847   
# min       0.000000   44.000000      24.000000       7.000000   14.000000   
# 25%       1.000000   99.750000      64.000000      25.000000  102.500000   
# 50%       3.000000  117.000000      72.000000      28.000000  102.500000   
# 75%       6.000000  140.250000      80.000000      32.000000  169.500000   
# max      17.000000  199.000000     122.000000      99.000000  846.000000   
# 
#               BMI  DiabetesPedigreeFunction         Age     Outcome  
# count  768.000000                768.000000  768.000000  768.000000  
# mean    32.434635                  0.471876   33.240885    0.348958  
# std      6.880498                  0.331329   11.760232    0.476951  
# min     18.200000                  0.078000   21.000000    0.000000  
# 25%     27.500000                  0.243750   24.000000    0.000000  
# 50%     32.050000                  0.372500   29.000000    0.000000  
# 75%     36.600000                  0.626250   41.000000    1.000000  
# max     67.100000                  2.420000   81.000000    1.000000  

# ============================================================
# CELL 25 (code)
# ============================================================
import seaborn as sns
import matplotlib.pyplot as plt

plt.figure(figsize=(10, 7))

sns.heatmap(
    df.corr(),
    annot=True,
    cmap='coolwarm',
    fmt='.2f'
)

plt.title('Correlation Heatmap')
plt.show()

# --- OUTPUTS ---
# [data]: <Figure size 1000x700 with 2 Axes>

# ============================================================
# CELL 26 (code)
# ============================================================
import matplotlib.pyplot as plt

plt.figure(figsize=(12, 6))

df.boxplot()

plt.title('Boxplot of All Features')
plt.xticks(rotation=45)
plt.show()

# --- OUTPUTS ---
# [data]: <Figure size 1200x600 with 1 Axes>

# ============================================================
# CELL 27 (code)
# ============================================================
plt.figure(figsize=(8, 5))

plt.boxplot(df['Insulin'])

plt.title('Boxplot of Insulin')
plt.ylabel('Insulin')

plt.show()

# --- OUTPUTS ---
# [data]: <Figure size 800x500 with 1 Axes>

# ============================================================
# CELL 28 (code)
# ============================================================
plt.figure(figsize=(8, 5))

plt.boxplot(df['Glucose'])

plt.title('Boxplot of Glucose')
plt.ylabel('Glucose')

plt.show()

# --- OUTPUTS ---
# [data]: <Figure size 800x500 with 1 Axes>

# ============================================================
# CELL 29 (code)
# ============================================================
plt.figure(figsize=(8, 5))

plt.boxplot(df['BMI'])

plt.title('Boxplot of BMI')
plt.ylabel('BMI')

plt.show()

# --- OUTPUTS ---
# [data]: <Figure size 800x500 with 1 Axes>

# ============================================================
# CELL 30 (code)
# ============================================================
cols = ['Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI']

(df[cols] == 0).sum()

# --- OUTPUTS ---
# [data]: Glucose          0
# BloodPressure    0
# SkinThickness    0
# Insulin          0
# BMI              0
# dtype: int64

# ============================================================
# CELL 31 (code)
# ============================================================
import matplotlib.pyplot as plt

plt.figure(figsize=(8, 5))

plt.boxplot(df['Insulin'])

plt.title('Boxplot of Insulin')
plt.ylabel('Insulin')

plt.show()

# --- OUTPUTS ---
# [data]: <Figure size 800x500 with 1 Axes>

# ============================================================
# CELL 32 (code)
# ============================================================
plt.figure(figsize=(8, 5))

plt.boxplot(df['Glucose'])

plt.title('Boxplot of Glucose')
plt.ylabel('Glucose')

plt.show()

# --- OUTPUTS ---
# [data]: <Figure size 800x500 with 1 Axes>

# ============================================================
# CELL 33 (code)
# ============================================================
import matplotlib.pyplot as plt

features = [
    'Pregnancies',
    'BloodPressure',
    'SkinThickness',
    'BMI',
    'DiabetesPedigreeFunction',
    'Age'
]

plt.figure(figsize=(12, 6))

df[features].boxplot()

plt.title('Boxplot of Remaining Features')
plt.xticks(rotation=45)
plt.ylabel('Value')
plt.show()

# --- OUTPUTS ---
# [data]: <Figure size 1200x600 with 1 Axes>

# ============================================================
# CELL 34 (code)
# ============================================================
Q1 = df.quantile(0.25)
Q3 = df.quantile(0.75)

IQR = Q3 - Q1

lower_bound = Q1 - 1.5 * IQR
upper_bound = Q3 + 1.5 * IQR

outliers = ((df < lower_bound) | (df > upper_bound)).sum()

print(outliers)

# --- OUTPUTS ---
# [text]: Pregnancies                  4
# Glucose                      0
# BloodPressure               14
# SkinThickness               87
# Insulin                     51
# BMI                          8
# DiabetesPedigreeFunction    29
# Age                          9
# Outcome                      0
# dtype: int64
# 

# ============================================================
# CELL 35 (code)
# ============================================================
zero_cols = ['Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI']

print((df[zero_cols] == 0).sum())

# --- OUTPUTS ---
# [text]: Glucose          0
# BloodPressure    0
# SkinThickness    0
# Insulin          0
# BMI              0
# dtype: int64
# 

# ============================================================
# CELL 36 (code)
# ============================================================
X = df.drop('Outcome', axis=1)
y = df['Outcome']

print("X shape:", X.shape)
print("y shape:", y.shape)

# --- OUTPUTS ---
# [text]: X shape: (768, 8)
# y shape: (768,)
# 

# ============================================================
# CELL 37 (code)
# ============================================================
from sklearn.model_selection import train_test_split

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

print("X_train shape:", X_train.shape)
print("X_test shape:", X_test.shape)
print("y_train shape:", y_train.shape)
print("y_test shape:", y_test.shape)

# --- OUTPUTS ---
# [text]: X_train shape: (614, 8)
# X_test shape: (154, 8)
# y_train shape: (614,)
# y_test shape: (154,)
# 

# ============================================================
# CELL 38 (code)
# ============================================================
from sklearn.preprocessing import StandardScaler

scaler = StandardScaler()

X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

print("X_train_scaled shape:", X_train_scaled.shape)
print("X_test_scaled shape:", X_test_scaled.shape)

# --- OUTPUTS ---
# [text]: X_train_scaled shape: (614, 8)
# X_test_scaled shape: (154, 8)
# 

# ============================================================
# CELL 39 (code)
# ============================================================
from sklearn.linear_model import LogisticRegression

model = LogisticRegression(random_state=42)

model.fit(X_train_scaled, y_train)

print("Model training completed!")

# --- OUTPUTS ---
# [text]: Model training completed!
# 

# ============================================================
# CELL 40 (markdown)
# ============================================================


# ============================================================
# CELL 41 (code)
# ============================================================
y_pred = model.predict(X_test_scaled)

print("Predictions:", y_pred[:10])

# --- OUTPUTS ---
# [text]: Predictions: [0 0 0 0 0 0 1 1 0 1]
# 

# ============================================================
# CELL 42 (code)
# ============================================================
from sklearn.metrics import accuracy_score

accuracy = accuracy_score(y_test, y_pred)

print("Model Accuracy:", accuracy)
print("Model Accuracy (%):", accuracy * 100)

# --- OUTPUTS ---
# [text]: Model Accuracy: 0.7077922077922078
# Model Accuracy (%): 70.77922077922078
# 

# ============================================================
# CELL 43 (code)
# ============================================================
from sklearn.metrics import confusion_matrix
import seaborn as sns
import matplotlib.pyplot as plt

cm = confusion_matrix(y_test, y_pred)

print("Confusion Matrix:")
print(cm)

plt.figure(figsize=(6, 4))
sns.heatmap(
    cm,
    annot=True,
    fmt='d',
    cmap='Blues',
    xticklabels=['No Diabetes (0)', 'Diabetes (1)'],
    yticklabels=['No Diabetes (0)', 'Diabetes (1)']
)

plt.xlabel('Predicted')
plt.ylabel('Actual')
plt.title('Confusion Matrix')
plt.show()

# --- OUTPUTS ---
# [text]: Confusion Matrix:
# [[79 21]
#  [24 30]]
# 
# [data]: <Figure size 600x400 with 2 Axes>

# ============================================================
# CELL 44 (code)
# ============================================================
from sklearn.metrics import classification_report

print(classification_report(y_test, y_pred))

# --- OUTPUTS ---
# [text]:               precision    recall  f1-score   support
# 
#            0       0.77      0.79      0.78       100
#            1       0.59      0.56      0.57        54
# 
#     accuracy                           0.71       154
#    macro avg       0.68      0.67      0.67       154
# weighted avg       0.70      0.71      0.71       154
# 
# 

# ============================================================
# CELL 45 (code)
# ============================================================
from sklearn.metrics import roc_auc_score

y_prob = model.predict_proba(X_test_scaled)[:, 1]

auc = roc_auc_score(y_test, y_prob)

print("ROC-AUC Score:", auc)

# --- OUTPUTS ---
# [text]: ROC-AUC Score: 0.8262962962962963
# 

# ============================================================
# CELL 46 (code)
# ============================================================
from sklearn.ensemble import RandomForestClassifier

rf_model = RandomForestClassifier(
    n_estimators=100,
    random_state=42
)

rf_model.fit(X_train, y_train)

y_pred_rf = rf_model.predict(X_test)

print("Random Forest training and prediction completed!")

# --- OUTPUTS ---
# [text]: Random Forest training and prediction completed!
# 

# ============================================================
# CELL 47 (code)
# ============================================================
from sklearn.metrics import accuracy_score

accuracy_rf = accuracy_score(y_test, y_pred_rf)

print("Random Forest Accuracy:", accuracy_rf)
print("Random Forest Accuracy (%):", accuracy_rf * 100)

# --- OUTPUTS ---
# [text]: Random Forest Accuracy: 0.8636363636363636
# Random Forest Accuracy (%): 86.36363636363636
# 

# ============================================================
# CELL 48 (code)
# ============================================================
from sklearn.metrics import confusion_matrix
import seaborn as sns
import matplotlib.pyplot as plt

cm_rf = confusion_matrix(y_test, y_pred_rf)

print("Random Forest Confusion Matrix:")
print(cm_rf)

plt.figure(figsize=(6, 4))
sns.heatmap(
    cm_rf,
    annot=True,
    fmt='d',
    cmap='Blues',
    xticklabels=['No Diabetes (0)', 'Diabetes (1)'],
    yticklabels=['No Diabetes (0)', 'Diabetes (1)']
)

plt.xlabel('Predicted')
plt.ylabel('Actual')
plt.title('Random Forest Confusion Matrix')
plt.show()

# --- OUTPUTS ---
# [text]: Random Forest Confusion Matrix:
# [[90 10]
#  [11 43]]
# 
# [data]: <Figure size 600x400 with 2 Axes>

# ============================================================
# CELL 49 (code)
# ============================================================
from sklearn.metrics import classification_report

print(classification_report(y_test, y_pred_rf))

# --- OUTPUTS ---
# [text]:               precision    recall  f1-score   support
# 
#            0       0.89      0.90      0.90       100
#            1       0.81      0.80      0.80        54
# 
#     accuracy                           0.86       154
#    macro avg       0.85      0.85      0.85       154
# weighted avg       0.86      0.86      0.86       154
# 
# 

# ============================================================
# CELL 50 (code)
# ============================================================
from sklearn.metrics import roc_auc_score

y_prob_rf = rf_model.predict_proba(X_test)[:, 1]

auc_rf = roc_auc_score(y_test, y_prob_rf)

print("Random Forest ROC-AUC:", auc_rf)

# --- OUTPUTS ---
# [text]: Random Forest ROC-AUC: 0.9436111111111111
# 

# ============================================================
# CELL 51 (code)
# ============================================================
import pandas as pd
import matplotlib.pyplot as plt

feature_importance = pd.DataFrame({
    'Feature': X.columns,
    'Importance': rf_model.feature_importances_
})

feature_importance = feature_importance.sort_values(
    by='Importance',
    ascending=False
)

print(feature_importance)

# --- OUTPUTS ---
# [text]:                     Feature  Importance
# 4                   Insulin    0.358367
# 1                   Glucose    0.173985
# 3             SkinThickness    0.138629
# 5                       BMI    0.090195
# 7                       Age    0.072941
# 6  DiabetesPedigreeFunction    0.071559
# 2             BloodPressure    0.048064
# 0               Pregnancies    0.046260
# 

# ============================================================
# CELL 52 (code)
# ============================================================
plt.figure(figsize=(8, 5))

plt.barh(
    feature_importance['Feature'],
    feature_importance['Importance']
)

plt.xlabel('Importance')
plt.ylabel('Feature')
plt.title('Random Forest Feature Importance')

plt.gca().invert_yaxis()
plt.show()

# --- OUTPUTS ---
# [data]: <Figure size 800x500 with 1 Axes>

# ============================================================
# CELL 53 (code)
# ============================================================
model_comparison = pd.DataFrame({
    'Model': ['Logistic Regression', 'Random Forest'],
    'Accuracy': [0.7078, 0.8636],
    'ROC-AUC': [0.8263, 0.9436]
})

model_comparison

# --- OUTPUTS ---
# [data]:                  Model  Accuracy  ROC-AUC
# 0  Logistic Regression    0.7078   0.8263
# 1        Random Forest    0.8636   0.9436

# ============================================================
# CELL 54 (code)
# ============================================================
from sklearn.model_selection import cross_val_score

rf_cv_scores = cross_val_score(
    rf_model,
    X_train_scaled,
    y_train,
    cv=5,
    scoring='accuracy'
)

print("Cross-validation scores:", rf_cv_scores)
print("Mean CV Accuracy:", rf_cv_scores.mean())

# --- OUTPUTS ---
# [text]: Cross-validation scores: [0.86178862 0.8699187  0.88617886 0.89430894 0.86885246]
# Mean CV Accuracy: 0.8762095161935226
# 

# ============================================================
# CELL 55 (code)
# ============================================================
from sklearn.model_selection import GridSearchCV
from sklearn.ensemble import RandomForestClassifier

rf = RandomForestClassifier(
    random_state=42
)

param_grid = {
    'n_estimators': [100, 200, 300],
    'max_depth': [None, 5, 10, 15],
    'min_samples_split': [2, 5, 10],
    'min_samples_leaf': [1, 2, 4]
}

grid_search = GridSearchCV(
    estimator=rf,
    param_grid=param_grid,
    cv=5,
    scoring='accuracy',
    n_jobs=-1
)

grid_search.fit(X_train_scaled, y_train)

print("Best Parameters:")
print(grid_search.best_params_)

print("Best CV Accuracy:")
print(grid_search.best_score_)

# --- OUTPUTS ---
# [text]: Best Parameters:
# {'max_depth': 5, 'min_samples_leaf': 2, 'min_samples_split': 2, 'n_estimators': 200}
# Best CV Accuracy:
# 0.8843262694922032
# 

# ============================================================
# CELL 56 (code)
# ============================================================
from sklearn.model_selection import GridSearchCV
from sklearn.ensemble import RandomForestClassifier

rf = RandomForestClassifier(
    random_state=42
)

param_grid = {
    'n_estimators': [100, 200, 300],
    'max_depth': [None, 5, 10, 15],
    'min_samples_split': [2, 5, 10],
    'min_samples_leaf': [1, 2, 4]
}

grid_search = GridSearchCV(
    estimator=rf,
    param_grid=param_grid,
    cv=5,
    scoring='accuracy',
    n_jobs=-1
)

grid_search.fit(X_train_scaled, y_train)

print("Best Parameters:")
print(grid_search.best_params_)

print("Best CV Accuracy:")
print(grid_search.best_score_)

# --- OUTPUTS ---
# [text]: Best Parameters:
# {'max_depth': 5, 'min_samples_leaf': 2, 'min_samples_split': 2, 'n_estimators': 200}
# Best CV Accuracy:
# 0.8843262694922032
# 

# ============================================================
# CELL 57 (code)
# ============================================================
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score
)

best_rf = grid_search.best_estimator_

# Prediction
y_pred = best_rf.predict(X_test)

# Probability for ROC-AUC
y_prob = best_rf.predict_proba(X_test)[:, 1]

# Metrics
accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred)
recall = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)
roc_auc = roc_auc_score(y_test, y_prob)

print("Final Tuned Random Forest Results")
print("----------------------------------")
print("Accuracy :", accuracy)
print("Precision:", precision)
print("Recall   :", recall)
print("F1 Score :", f1)
print("ROC-AUC  :", roc_auc)

# --- OUTPUTS ---
# [text]: Final Tuned Random Forest Results
# ----------------------------------
# Accuracy : 0.35064935064935066
# Precision: 0.35064935064935066
# Recall   : 1.0
# F1 Score : 0.5192307692307693
# ROC-AUC  : 0.5192592592592592
# 
# [text]: /usr/local/lib/python3.13/dist-packages/sklearn/utils/validation.py:2732: UserWarning: X has feature names, but RandomForestClassifier was fitted without feature names
#   warnings.warn(
# /usr/local/lib/python3.13/dist-packages/sklearn/utils/validation.py:2732: UserWarning: X has feature names, but RandomForestClassifier was fitted without feature names
#   warnings.warn(
# 

# ============================================================
# CELL 58 (code)
# ============================================================
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay
import matplotlib.pyplot as plt

cm = confusion_matrix(y_test, y_pred)

print("Confusion Matrix:")
print(cm)

disp = ConfusionMatrixDisplay(
    confusion_matrix=cm
)

disp.plot()
plt.title("Random Forest Confusion Matrix")
plt.show()

# --- OUTPUTS ---
# [text]: Confusion Matrix:
# [[  0 100]
#  [  0  54]]
# 
# [data]: <Figure size 640x480 with 2 Axes>

# ============================================================
# CELL 59 (code)
# ============================================================
X_test_scaled = scaler.transform(X_test)

y_pred = best_rf.predict(X_test_scaled)
y_prob = best_rf.predict_proba(X_test_scaled)[:, 1]

# ============================================================
# CELL 60 (code)
# ============================================================
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score
)

print("Final Tuned Random Forest Results")
print("----------------------------------")

print("Accuracy :", accuracy_score(y_test, y_pred))
print("Precision:", precision_score(y_test, y_pred))
print("Recall   :", recall_score(y_test, y_pred))
print("F1 Score :", f1_score(y_test, y_pred))
print("ROC-AUC  :", roc_auc_score(y_test, y_prob))

# --- OUTPUTS ---
# [text]: Final Tuned Random Forest Results
# ----------------------------------
# Accuracy : 0.8636363636363636
# Precision: 0.8113207547169812
# Recall   : 0.7962962962962963
# F1 Score : 0.8037383177570093
# ROC-AUC  : 0.9437037037037037
# 

# ============================================================
# CELL 61 (code)
# ============================================================
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay
import matplotlib.pyplot as plt

# Predictions
y_pred = best_rf.predict(X_test)

# Confusion Matrix
cm = confusion_matrix(y_test, y_pred)

print("Confusion Matrix:")
print(cm)

# Plot
disp = ConfusionMatrixDisplay(
    confusion_matrix=cm,
    display_labels=["No Diabetes", "Diabetes"]
)

disp.plot()
plt.title("Random Forest - Confusion Matrix")
plt.show()

# --- OUTPUTS ---
# [text]: /usr/local/lib/python3.13/dist-packages/sklearn/utils/validation.py:2732: UserWarning: X has feature names, but RandomForestClassifier was fitted without feature names
#   warnings.warn(
# 
# [text]: Confusion Matrix:
# [[  0 100]
#  [  0  54]]
# 
# [data]: <Figure size 640x480 with 2 Axes>

# ============================================================
# CELL 62 (code)
# ============================================================
print("X_train shape:", X_train.shape)
print("X_test shape :", X_test.shape)

print("\ny_test distribution:")
print(y_test.value_counts())

print("\ny_pred distribution:")
print(pd.Series(y_pred).value_counts())

print("\nFirst 20 predictions:")
print(y_pred[:20])

# --- OUTPUTS ---
# [text]: X_train shape: (614, 8)
# X_test shape : (154, 8)
# 
# y_test distribution:
# Outcome
# 0    100
# 1     54
# Name: count, dtype: int64
# 
# y_pred distribution:
# 1    154
# Name: count, dtype: int64
# 
# First 20 predictions:
# [1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1]
# 

# ============================================================
# CELL 63 (code)
# ============================================================
print("Model classes:")
print(best_rf.classes_)

print("\nModel parameters:")
print(best_rf.get_params())

# --- OUTPUTS ---
# [text]: Model classes:
# [0 1]
# 
# Model parameters:
# {'bootstrap': True, 'ccp_alpha': 0.0, 'class_weight': None, 'criterion': 'gini', 'max_depth': 5, 'max_features': 'sqrt', 'max_leaf_nodes': None, 'max_samples': None, 'min_impurity_decrease': 0.0, 'min_samples_leaf': 2, 'min_samples_split': 2, 'min_weight_fraction_leaf': 0.0, 'monotonic_cst': None, 'n_estimators': 200, 'n_jobs': None, 'oob_score': False, 'random_state': 42, 'verbose': 0, 'warm_start': False}
# 

# ============================================================
# CELL 64 (code)
# ============================================================
print("X_train type:", type(X_train))
print("X_test type :", type(X_test))

print("\nX_train columns:")
print(X_train.columns if hasattr(X_train, "columns") else "NO COLUMNS")

print("\nX_test columns:")
print(X_test.columns if hasattr(X_test, "columns") else "NO COLUMNS")

# --- OUTPUTS ---
# [text]: X_train type: <class 'pandas.core.frame.DataFrame'>
# X_test type : <class 'pandas.core.frame.DataFrame'>
# 
# X_train columns:
# Index(['Pregnancies', 'Glucose', 'BloodPressure', 'SkinThickness', 'Insulin',
#        'BMI', 'DiabetesPedigreeFunction', 'Age'],
#       dtype='object')
# 
# X_test columns:
# Index(['Pregnancies', 'Glucose', 'BloodPressure', 'SkinThickness', 'Insulin',
#        'BMI', 'DiabetesPedigreeFunction', 'Age'],
#       dtype='object')
# 

# ============================================================
# CELL 65 (code)
# ============================================================
print("Training accuracy:")
print(best_rf.score(X_train, y_train))

print("\nTesting accuracy:")
print(best_rf.score(X_test, y_test))

print("\nTraining predictions:")
train_pred = best_rf.predict(X_train)
print(pd.Series(train_pred).value_counts())

print("\nTesting predictions:")
test_pred = best_rf.predict(X_test)
print(pd.Series(test_pred).value_counts())

# --- OUTPUTS ---
# [text]: Training accuracy:
# 0.3485342019543974
# 
# Testing accuracy:
# 0.35064935064935066
# 
# Training predictions:
# 1    614
# Name: count, dtype: int64
# 
# Testing predictions:
# 
# [text]: /usr/local/lib/python3.13/dist-packages/sklearn/utils/validation.py:2732: UserWarning: X has feature names, but RandomForestClassifier was fitted without feature names
#   warnings.warn(
# /usr/local/lib/python3.13/dist-packages/sklearn/utils/validation.py:2732: UserWarning: X has feature names, but RandomForestClassifier was fitted without feature names
#   warnings.warn(
# /usr/local/lib/python3.13/dist-packages/sklearn/utils/validation.py:2732: UserWarning: X has feature names, but RandomForestClassifier was fitted without feature names
#   warnings.warn(
# /usr/local/lib/python3.13/dist-packages/sklearn/utils/validation.py:2732: UserWarning: X has feature names, but RandomForestClassifier was fitted without feature names
#   warnings.warn(
# 
# [text]: 1    154
# Name: count, dtype: int64
# 

# ============================================================
# CELL 66 (code)
# ============================================================
print("First 10 X_train:")
print(X_train.head(10))

print("\nFirst 10 y_train:")
print(y_train.head(10))

print("\nFirst 10 X_test:")
print(X_test.head(10))

print("\nFirst 10 y_test:")
print(y_test.head(10))

# --- OUTPUTS ---
# [text]: First 10 X_train:
#      Pregnancies  Glucose  BloodPressure  SkinThickness  Insulin   BMI  \
# 353            1       90           62.0             12     43.0  27.2   
# 711            5      126           78.0             27     22.0  29.6   
# 373            2      105           58.0             40     94.0  34.9   
# 46             1      146           56.0             27    102.5  29.7   
# 682            0       95           64.0             39    105.0  44.6   
# 360            5      189           64.0             33    325.0  31.2   
# 414            0      138           60.0             35    167.0  34.6   
# 339            7      178           84.0             32    169.5  39.9   
# 694            2       90           60.0             27    102.5  23.5   
# 33             6       92           92.0             27    102.5  19.9   
# 
#      DiabetesPedigreeFunction  Age  
# 353                     0.580   24  
# 711                     0.439   40  
# 373                     0.225   25  
# 46                      0.564   29  
# 682                     0.366   22  
# 360                     0.583   29  
# 414                     0.534   21  
# 339                     0.331   41  
# 694                     0.191   25  
# 33                      0.188   28  
# 
# First 10 y_train:
# 353    0
# 711    0
# 373    0
# 46     0
# 682    0
# 360    1
# 414    1
# 339    1
# 694    0
# 33     0
# Name: Outcome, dtype: int64
# 
# First 10 X_test:
#      Pregnancies  Glucose  BloodPressure  SkinThickness  Insulin   BMI  \
# 44             7      159           64.0             27    102.5  27.4   
# 672           10       68          106.0             23     49.0  35.5   
# 700            2      122           76.0             27    200.0  35.9   
# 630            7      114           64.0             32    169.5  27.4   
# 81             2       74           70.0             27    102.5  30.1   
# 389            3      100           68.0             23     81.0  31.6   
# 387            8      105          100.0             36    169.5  43.3   
# 408            8      197           74.0             32    169.5  25.9   
# 163            2      100           64.0             23    102.5  29.7   
# 335            0      165           76.0             43    255.0  47.9   
# 
#      DiabetesPedigreeFunction  Age  
# 44                      0.294   40  
# 672                     0.285   47  
# 700                     0.483   26  
# 630                     0.732   34  
# 81                      0.102   22  
# 389                     0.949   28  
# 387                     0.239   45  
# 408                     1.191   39  
# 163                     0.368   21  
# 335                     0.259   26  
# 
# First 10 y_test:
# 44     0
# 672    0
# 700    0
# 630    1
# 81     0
# 389    0
# 387    1
# 408    1
# 163    0
# 335    0
# Name: Outcome, dtype: int64
# 

# ============================================================
# CELL 67 (code)
# ============================================================
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report
)

# ============================================
# FINAL TUNED RANDOM FOREST
# ============================================

final_rf = RandomForestClassifier(
    n_estimators=200,
    max_depth=5,
    min_samples_leaf=2,
    max_features="sqrt",
    random_state=42,
    n_jobs=-1
)

# Train using DataFrame directly
final_rf.fit(X_train, y_train)

# Predictions
y_pred = final_rf.predict(X_test)

# Probabilities for ROC-AUC
y_prob = final_rf.predict_proba(X_test)[:, 1]

# ============================================
# EVALUATION
# ============================================

accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred)
recall = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)
roc_auc = roc_auc_score(y_test, y_prob)

print("Final Tuned Random Forest Results")
print("----------------------------------")
print(f"Accuracy : {accuracy:.4f}")
print(f"Precision: {precision:.4f}")
print(f"Recall   : {recall:.4f}")
print(f"F1 Score : {f1:.4f}")
print(f"ROC-AUC  : {roc_auc:.4f}")

# ============================================
# CONFUSION MATRIX
# ============================================

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))

# ============================================
# CLASSIFICATION REPORT
# ============================================

print("\nClassification Report:")
print(
    classification_report(
        y_test,
        y_pred,
        target_names=["No Diabetes", "Diabetes"]
    )
)

# ============================================
# PREDICTION DISTRIBUTION
# ============================================

print("\nPrediction Distribution:")
print(pd.Series(y_pred).value_counts())

# --- OUTPUTS ---
# [text]: Final Tuned Random Forest Results
# ----------------------------------
# Accuracy : 0.8636
# Precision: 0.8113
# Recall   : 0.7963
# F1 Score : 0.8037
# ROC-AUC  : 0.9439
# 
# Confusion Matrix:
# [[90 10]
#  [11 43]]
# 
# Classification Report:
#               precision    recall  f1-score   support
# 
#  No Diabetes       0.89      0.90      0.90       100
#     Diabetes       0.81      0.80      0.80        54
# 
#     accuracy                           0.86       154
#    macro avg       0.85      0.85      0.85       154
# weighted avg       0.86      0.86      0.86       154
# 
# 
# Prediction Distribution:
# 0    101
# 1     53
# Name: count, dtype: int64
# 

# ============================================================
# CELL 68 (code)
# ============================================================
import matplotlib.pyplot as plt
from sklearn.metrics import ConfusionMatrixDisplay

ConfusionMatrixDisplay.from_predictions(
    y_test,
    y_pred,
    display_labels=["No Diabetes", "Diabetes"]
)

plt.title("Random Forest - Confusion Matrix")
plt.show()

# --- OUTPUTS ---
# [data]: <Figure size 640x480 with 2 Axes>

# ============================================================
# CELL 69 (code)
# ============================================================
from sklearn.metrics import roc_curve, roc_auc_score
import matplotlib.pyplot as plt

fpr, tpr, thresholds = roc_curve(y_test, y_prob)
auc = roc_auc_score(y_test, y_prob)

plt.figure(figsize=(7, 5))

plt.plot(
    fpr,
    tpr,
    label=f"Random Forest (AUC = {auc:.4f})"
)

plt.plot(
    [0, 1],
    [0, 1],
    linestyle="--"
)

plt.xlabel("False Positive Rate")
plt.ylabel("True Positive Rate")
plt.title("Random Forest - ROC Curve")
plt.legend()
plt.show()

# --- OUTPUTS ---
# [data]: <Figure size 700x500 with 1 Axes>

# ============================================================
# CELL 70 (code)
# ============================================================
import pandas as pd
import matplotlib.pyplot as plt

importance = pd.Series(
    final_rf.feature_importances_,
    index=X_train.columns
).sort_values(ascending=False)

print("Feature Importance:")
print(importance)

# --- OUTPUTS ---
# [text]: Feature Importance:
# Insulin                     0.406243
# Glucose                     0.196842
# SkinThickness               0.155641
# Age                         0.069817
# BMI                         0.066832
# DiabetesPedigreeFunction    0.039175
# Pregnancies                 0.036990
# BloodPressure               0.028460
# dtype: float64
# 

# ============================================================
# CELL 71 (code)
# ============================================================
plt.figure(figsize=(8, 5))

importance.sort_values().plot(kind="barh")

plt.title("Random Forest - Feature Importance")
plt.xlabel("Importance")
plt.ylabel("Features")

plt.show()

# --- OUTPUTS ---
# [data]: <Figure size 800x500 with 1 Axes>

# ============================================================
# CELL 72 (code)
# ============================================================
from sklearn.model_selection import cross_val_score, StratifiedKFold
import numpy as np

# 5-Fold Stratified Cross Validation
cv = StratifiedKFold(
    n_splits=5,
    shuffle=True,
    random_state=42
)

cv_scores = cross_val_score(
    final_rf,
    X_train,
    y_train,
    cv=cv,
    scoring="accuracy"
)

print("5-Fold Cross-Validation Results")
print("--------------------------------")
print("Fold Scores:", cv_scores)
print(f"Mean Accuracy: {cv_scores.mean():.4f}")
print(f"Std Deviation: {cv_scores.std():.4f}")

# --- OUTPUTS ---
# [text]: 5-Fold Cross-Validation Results
# --------------------------------
# Fold Scores: [0.84552846 0.88617886 0.87804878 0.88617886 0.87704918]
# Mean Accuracy: 0.8746
# Std Deviation: 0.0150
# 

# ============================================================
# CELL 73 (code)
# ============================================================
!pip install shap -q


# ============================================================
# CELL 74 (code)
# ============================================================
import shap

explainer = shap.TreeExplainer(final_rf)

shap_values = explainer.shap_values(X_test)

print("SHAP values calculated successfully!")
print(type(shap_values))

# --- OUTPUTS ---
# [text]: SHAP values calculated successfully!
# <class 'numpy.ndarray'>
# 

# ============================================================
# CELL 75 (code)
# ============================================================
import shap
import matplotlib.pyplot as plt

shap.summary_plot(
    shap_values,
    X_test,
    feature_names=X_test.columns
)

# --- OUTPUTS ---
# [data]: <Figure size 1150x660 with 2 Axes>

# ============================================================
# CELL 76 (code)
# ============================================================
import numpy as np
import shap
import matplotlib.pyplot as plt

print("SHAP shape:", shap_values.shape)

# --- OUTPUTS ---
# [text]: SHAP shape: (154, 8, 2)
# 

# ============================================================
# CELL 77 (code)
# ============================================================
# Select SHAP values for Diabetes class (class = 1)
shap_values_diabetes = shap_values[:, :, 1]

print("Selected SHAP shape:", shap_values_diabetes.shape)

# --- OUTPUTS ---
# [text]: Selected SHAP shape: (154, 8)
# 

# ============================================================
# CELL 78 (code)
# ============================================================
shap.summary_plot(
    shap_values_diabetes,
    X_test,
    feature_names=X_test.columns
)

# --- OUTPUTS ---
# [data]: <Figure size 800x470 with 2 Axes>

# ============================================================
# CELL 79 (code)
# ============================================================
import joblib

# Save final trained model
joblib.dump(final_rf, "diabetes_random_forest.pkl")

print("Final Random Forest model saved successfully!")

# --- OUTPUTS ---
# [text]: Final Random Forest model saved successfully!
# 

# ============================================================
# CELL 80 (code)
# ============================================================
import os

print("File exists:", os.path.exists("diabetes_random_forest.pkl"))

# --- OUTPUTS ---
# [text]: File exists: True
# 

# ============================================================
# CELL 81 (code)
# ============================================================
import joblib
import pandas as pd

# Load saved model
model = joblib.load("diabetes_random_forest.pkl")


def predict_diabetes(
    pregnancies,
    glucose,
    blood_pressure,
    skin_thickness,
    insulin,
    bmi,
    diabetes_pedigree,
    age
):
    # Create input DataFrame
    input_data = pd.DataFrame([{
        "Pregnancies": pregnancies,
        "Glucose": glucose,
        "BloodPressure": blood_pressure,
        "SkinThickness": skin_thickness,
        "Insulin": insulin,
        "BMI": bmi,
        "DiabetesPedigreeFunction": diabetes_pedigree,
        "Age": age
    }])

    # Prediction
    prediction = model.predict(input_data)[0]

    # Probability
    probability = model.predict_proba(input_data)[0][1]

    if prediction == 1:
        result = "Diabetes"
    else:
        result = "No Diabetes"

    return result, probability

# ============================================================
# CELL 82 (code)
# ============================================================
result, probability = predict_diabetes(
    pregnancies=2,
    glucose=150,
    blood_pressure=70,
    skin_thickness=30,
    insulin=100,
    bmi=33.6,
    diabetes_pedigree=0.6,
    age=35
)

print("Prediction:", result)
print(f"Diabetes Probability: {probability:.2%}")

# --- OUTPUTS ---
# [text]: Prediction: No Diabetes
# Diabetes Probability: 25.26%
# 

# ============================================================
# CELL 83 (code)
# ============================================================
!mkdir -p ml_model
!cp diabetes.csv ml_model/
!cp diabetes_random_forest.pkl ml_model/

# ============================================================
# CELL 84 (code)
# ============================================================
%%writefile ml_model/requirements.txt
pandas
numpy
scikit-learn
matplotlib
seaborn
shap
joblib

# --- OUTPUTS ---
# [text]: Writing ml_model/requirements.txt
# 
