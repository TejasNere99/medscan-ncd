import os
import pandas as pd
import numpy as np

raw_dir = r"c:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD\ml_model\datasets\diabetes\raw\nhanes_2017_2018"
bpx = pd.read_sas(os.path.join(raw_dir, "BPX_J.XPT"), format="xport")

for col in ["BPXDI1", "BPXDI2", "BPXDI3"]:
    tiny = bpx[bpx[col] < 10][col]
    print(f"\n{col} values < 10:")
    print(tiny.value_counts())
