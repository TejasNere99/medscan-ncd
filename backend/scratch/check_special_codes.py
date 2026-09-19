import os
import pandas as pd
import numpy as np

raw_dir = r"c:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD\ml_model\datasets\diabetes\raw\nhanes_2017_2018"

demo = pd.read_sas(os.path.join(raw_dir, "DEMO_J.XPT"), format="xport")
bmx = pd.read_sas(os.path.join(raw_dir, "BMX_J.XPT"), format="xport")
bpx = pd.read_sas(os.path.join(raw_dir, "BPX_J.XPT"), format="xport")
glu = pd.read_sas(os.path.join(raw_dir, "GLU_J.XPT"), format="xport")
ghb = pd.read_sas(os.path.join(raw_dir, "GHB_J.XPT"), format="xport")
diq = pd.read_sas(os.path.join(raw_dir, "DIQ_J.XPT"), format="xport")
biopro = pd.read_sas(os.path.join(raw_dir, "BIOPRO_J.XPT"), format="xport")
tchol = pd.read_sas(os.path.join(raw_dir, "TCHOL_J.XPT"), format="xport")
hdl = pd.read_sas(os.path.join(raw_dir, "HDL_J.XPT"), format="xport")

print("=== CHECKING DIQ SPECIAL CODES ===")
print("DIQ010 values:\n", diq["DIQ010"].value_counts(dropna=False))
print("DIQ050 values:\n", diq["DIQ050"].value_counts(dropna=False))
print("DIQ070 values:\n", diq["DIQ070"].value_counts(dropna=False))
print("DIQ160 values:\n", diq["DIQ160"].value_counts(dropna=False))

print("\n=== CHECKING LAB / EXAM VALUE RANGES & ZEROS ===")
print("BMXBMI min/max/zeros:", bmx["BMXBMI"].min(), bmx["BMXBMI"].max(), (bmx["BMXBMI"] == 0).sum())
print("BPXSY1 min/max/zeros:", bpx["BPXSY1"].min(), bpx["BPXSY1"].max(), (bpx["BPXSY1"] == 0).sum())
print("BPXDI1 min/max/zeros:", bpx["BPXDI1"].min(), bpx["BPXDI1"].max(), (bpx["BPXDI1"] == 0).sum())
print("BPXDI2 min/max/zeros:", bpx["BPXDI2"].min(), bpx["BPXDI2"].max(), (bpx["BPXDI2"] == 0).sum())
print("BPXDI3 min/max/zeros:", bpx["BPXDI3"].min(), bpx["BPXDI3"].max(), (bpx["BPXDI3"] == 0).sum())
print("LBXTC min/max/zeros:", tchol["LBXTC"].min(), tchol["LBXTC"].max(), (tchol["LBXTC"] == 0).sum())
print("LBDHDD min/max/zeros:", hdl["LBDHDD"].min(), hdl["LBDHDD"].max(), (hdl["LBDHDD"] == 0).sum())
print("LBXSCR min/max/zeros:", biopro["LBXSCR"].min(), biopro["LBXSCR"].max(), (biopro["LBXSCR"] == 0).sum())
print("LBXGLU min/max/zeros:", glu["LBXGLU"].min(), glu["LBXGLU"].max(), (glu["LBXGLU"] == 0).sum())
print("LBXGH min/max/zeros:", ghb["LBXGH"].min(), ghb["LBXGH"].max(), (ghb["LBXGH"] == 0).sum())

# In BPX, are there 0 diastolic values?
# Notice: In auscultatory BP measurement, diastolic reading can be recorded as 0 if Korotkoff sounds continue to 0 mmHg!
# In NHANES documentation, BPXDI is diastolic blood pressure. If Korotkoff sound continued to 0, 0 is recorded.
print("\nBPXDI values <= 0:")
for col in ["BPXDI1", "BPXDI2", "BPXDI3"]:
    zeros = (bpx[col] == 0).sum()
    print(f"{col} == 0: {zeros} times")
    # Also check if there are negative or special codes in BPX
    print(f"{col} < 0: {(bpx[col] < 0).sum()}")
