import os
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

script_dir = os.path.dirname(os.path.abspath(__file__))
base_dir = os.path.abspath(os.path.join(script_dir, ".."))
candidate_path = os.path.join(base_dir, "prepared", "scenario_a_candidate.csv")
eda_dir = os.path.join(base_dir, "eda")
os.makedirs(eda_dir, exist_ok=True)

df = pd.read_csv(candidate_path)
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')

# 1. Target Distribution
plt.figure(figsize=(7, 5))
counts = df['target_diabetes'].value_counts().sort_index()
colors = ['#2b6cb0', '#c53030']
bars = plt.bar(['Negative (0)', 'Positive (1)'], counts, color=colors, width=0.5, edgecolor='black', linewidth=1.2)
plt.title('Target Distribution: Composite Diabetes Ground Truth (Adults N=5,856)', fontsize=13, fontweight='bold', pad=12)
plt.ylabel('Participant Count', fontsize=11)
plt.xlabel('Diabetes Status', fontsize=11)
for bar in bars:
    yval = bar.get_height()
    pct = yval / len(df) * 100
    plt.text(bar.get_x() + bar.get_width()/2.0, yval + 60, f'{yval:,}\n({pct:.1f}%)', ha='center', va='bottom', fontsize=10, fontweight='bold')
plt.ylim(0, max(counts) * 1.18)
plt.tight_layout()
plt.savefig(os.path.join(eda_dir, "eda_target_distribution.png"), dpi=200)
plt.close()
print("  Generated eda_target_distribution.png")

# 2. Correlation Matrix
plt.figure(figsize=(9, 7))
features = ['age', 'sex', 'bmi', 'systolic_bp', 'diastolic_bp', 'total_cholesterol', 'hdl', 'creatinine', 'target_diabetes']
corr = df[features].corr()
mask = np.triu(np.ones_like(corr, dtype=bool), k=1)
sns.heatmap(corr, annot=True, fmt=".2f", cmap="coolwarm", vmin=-0.4, vmax=0.4, linewidths=0.5, cbar_kws={'label': 'Pearson Correlation'})
plt.title('Correlation Matrix: Scenario A Features vs Target Diabetes', fontsize=13, fontweight='bold', pad=12)
plt.tight_layout()
plt.savefig(os.path.join(eda_dir, "eda_correlation_matrix.png"), dpi=200)
plt.close()
print("  Generated eda_correlation_matrix.png")

# 3. Feature Distributions
fig, axes = plt.subplots(2, 4, figsize=(16, 8))
axes = axes.flatten()
continuous_cols = ['age', 'sex', 'bmi', 'systolic_bp', 'diastolic_bp', 'total_cholesterol', 'hdl', 'creatinine']
for i, col in enumerate(continuous_cols):
    ax = axes[i]
    data = df[col].dropna()
    if col == 'sex':
        counts = data.value_counts().sort_index()
        ax.bar(['Female (0)', 'Male (1)'], counts, color=['#805ad5', '#3182ce'], width=0.5, edgecolor='black')
        ax.set_title(f'{col} (Binary)', fontsize=11, fontweight='bold')
    else:
        sns.histplot(data, kde=True, ax=ax, color='#2b6cb0', edgecolor='white', linewidth=0.5)
        med = data.median()
        ax.axvline(med, color='#c53030', linestyle='--', linewidth=1.5, label=f'Median: {med:.1f}')
        ax.set_title(col, fontsize=11, fontweight='bold')
        ax.legend(fontsize=9)
fig.suptitle('Feature Distributions across Adult NHANES 2017-2018 Cohort (N=5,856)', fontsize=14, fontweight='bold', y=1.02)
plt.tight_layout()
plt.savefig(os.path.join(eda_dir, "eda_feature_distributions.png"), dpi=200, bbox_inches='tight')
plt.close()
print("  Generated eda_feature_distributions.png")

# 4. Boxplots by Target
fig, axes = plt.subplots(2, 4, figsize=(16, 8))
axes = axes.flatten()
for i, col in enumerate(continuous_cols):
    ax = axes[i]
    if col == 'sex':
        pct_df = df.groupby(['target_diabetes', 'sex']).size().unstack(fill_value=0)
        pct_df = pct_df.div(pct_df.sum(axis=1), axis=0) * 100
        pct_df.plot(kind='bar', stacked=True, ax=ax, color=['#805ad5', '#3182ce'], edgecolor='black')
        ax.set_title(f'{col} Composition (%)', fontsize=11, fontweight='bold')
        ax.set_xticklabels(['Non-Diabetic (0)', 'Diabetic (1)'], rotation=0)
        ax.legend(['Female', 'Male'], fontsize=8)
    else:
        sns.boxplot(x='target_diabetes', y=col, data=df, ax=ax, palette=['#63b3ed', '#fc8181'])
        ax.set_title(col, fontsize=11, fontweight='bold')
        ax.set_xticklabels(['Non-Diabetic (0)', 'Diabetic (1)'])
fig.suptitle('Scenario A Predictor Stratification by Diabetes Status', fontsize=14, fontweight='bold', y=1.02)
plt.tight_layout()
plt.savefig(os.path.join(eda_dir, "eda_boxplots_by_target.png"), dpi=200, bbox_inches='tight')
plt.close()
print("  Generated eda_boxplots_by_target.png")

# 5. Missingness Percentage
plt.figure(figsize=(10, 5))
miss_pct = (df[continuous_cols].isna().mean() * 100).sort_values(ascending=False)
bars = plt.barh(miss_pct.index, miss_pct.values, color='#4a5568', edgecolor='black')
plt.xlabel('Missing Percentage (%)', fontsize=11)
plt.title('Missingness Percentage across Scenario A Predictors (N=5,856)', fontsize=13, fontweight='bold', pad=12)
for bar in bars:
    w = bar.get_width()
    plt.text(w + 0.3, bar.get_y() + bar.get_height()/2.0, f'{w:.2f}%', va='center', fontsize=10, fontweight='bold')
plt.xlim(0, max(miss_pct.values) * 1.25)
plt.tight_layout()
plt.savefig(os.path.join(eda_dir, "eda_missingness_percentage.png"), dpi=200)
plt.close()
print("  Generated eda_missingness_percentage.png")
