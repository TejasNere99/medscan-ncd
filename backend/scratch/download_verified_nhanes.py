import os
import urllib.request
import pandas as pd

raw_dir = r"c:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD\ml_model\datasets\diabetes\raw\nhanes_2017_2018"
os.makedirs(raw_dir, exist_ok=True)

files_to_download = [
    "DEMO_J",     # Demographics
    "BMX_J",      # Body Measures
    "BPX_J",      # Blood Pressure
    "GLU_J",      # Fasting Glucose
    "GHB_J",      # Glycohemoglobin (HbA1c)
    "DIQ_J",      # Diabetes Questionnaire
    "BIOPRO_J",   # Standard Biochemistry Profile (Creatinine, etc.)
    "TCHOL_J",    # Total Cholesterol
    "HDL_J",      # HDL Cholesterol
    "TRIGLY_J"    # Triglycerides & LDL
]

base_url = "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

results = {}

print("=== DOWNLOADING OFFICIAL CDC NHANES 2017-2018 DATAFILES ===")

for file_stem in files_to_download:
    filename = f"{file_stem}.XPT"
    dest_path = os.path.join(raw_dir, filename)
    
    # Try with .xpt lowercase on CDC server
    url = f"{base_url}{file_stem}.xpt"
    print(f"\n[FETCHING] {url} ...")
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=60) as resp:
            content_type = resp.headers.get("Content-Type", "")
            data = resp.read()
            print(f"  HTTP {resp.status} | Content-Type: {content_type} | Length: {len(data)} bytes")
            
            # Check if it's HTML (error page) or actual binary
            if data.startswith(b"<!DOCTYPE") or b"<html" in data[:100]:
                print(f"  [WARNING] Received HTML instead of SAS XPORT for {url}")
                # Try uppercase .XPT
                url_upper = f"{base_url}{file_stem}.XPT"
                print(f"  Trying uppercase: {url_upper}...")
                req2 = urllib.request.Request(url_upper, headers=headers)
                with urllib.request.urlopen(req2, timeout=60) as resp2:
                    data = resp2.read()
                    print(f"  Uppercase HTTP {resp2.status} | Length: {len(data)} bytes")
            
            with open(dest_path, "wb") as f:
                f.write(data)
                
    except Exception as e:
        print(f"  Error downloading {file_stem}: {e}")
        continue
        
    # Test reading with pd.read_sas
    try:
        df = pd.read_sas(dest_path, format="xport")
        results[file_stem] = {
            "rows": len(df),
            "cols": len(df.columns),
            "columns": list(df.columns),
            "size_bytes": os.path.getsize(dest_path)
        }
        print(f"  [SUCCESS] {file_stem}: {len(df)} rows, {len(df.columns)} columns (size: {os.path.getsize(dest_path)} bytes)")
    except Exception as e:
        print(f"  [ERROR] Reading {file_stem}: {e}")

print("\n=== SUMMARY OF ALL DOWNLOADED NHANES ARTIFACTS ===")
for stem, meta in results.items():
    print(f"{stem:12} | Rows: {meta['rows']:6} | Cols: {meta['cols']:3} | Size: {meta['size_bytes']:9} bytes")
