import os
import pandas as pd
import numpy as np

raw_dir = r"c:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD\ml_model\datasets\diabetes\raw\nhanes_2017_2018"
bpx = pd.read_sas(os.path.join(raw_dir, "BPX_J.XPT"), format="xport")
demo = pd.read_sas(os.path.join(raw_dir, "DEMO_J.XPT"), format="xport")[["SEQN", "RIDAGEYR"]]
m = bpx.merge(demo, on="SEQN", how="left")
adult_bpx = m[m["RIDAGEYR"] >= 18]

# Replace floating point near-zeros with 0
for col in ["BPXDI1", "BPXDI2", "BPXDI3"]:
    adult_bpx[col] = adult_bpx[col].apply(lambda x: 0.0 if x < 1e-10 else x)

print("Adults with all 3 readings < 30 mmHg:")
all_below_30 = ((adult_bpx["BPXDI1"] < 30) & (adult_bpx["BPXDI2"] < 30) & (adult_bpx["BPXDI3"] < 30)).sum()
print("All 3 < 30:", all_below_30)

print("\nAdults where at least one is < 30:")
any_below_30 = ((adult_bpx["BPXDI1"] < 30) | (adult_bpx["BPXDI2"] < 30) | (adult_bpx["BPXDI3"] < 30)).sum()
print("Any < 30:", any_below_30)

# Check distribution of valid readings >= 30
valid_dias = adult_bpx[(adult_bpx["BPXDI1"] >= 30) | (adult_bpx["BPXDI2"] >= 30) | (adult_bpx["BPXDI3"] >= 30)]
print("Adults with at least one reading >= 30:", len(valid_dias))
