import os
import pandas as pd
import numpy as np

raw_dir = r"c:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD\ml_model\datasets\diabetes\raw\nhanes_2017_2018"
bpx = pd.read_sas(os.path.join(raw_dir, "BPX_J.XPT"), format="xport")
demo = pd.read_sas(os.path.join(raw_dir, "DEMO_J.XPT"), format="xport")[["SEQN", "RIDAGEYR"]]

m = bpx.merge(demo, on="SEQN", how="left")
adult_bpx = m[m["RIDAGEYR"] >= 18]

print("Adults with BPXDI1 < 10:", (adult_bpx["BPXDI1"] < 10).sum())
print("Adults with BPXDI2 < 10:", (adult_bpx["BPXDI2"] < 10).sum())
print("Adults with BPXDI3 < 10:", (adult_bpx["BPXDI3"] < 10).sum())

# Sample of adults with BPXDI < 10
print("\nSample rows:")
print(adult_bpx[adult_bpx["BPXDI2"] < 10][["RIDAGEYR", "BPXSY1", "BPXDI1", "BPXSY2", "BPXDI2", "BPXSY3", "BPXDI3"]].head(10))
