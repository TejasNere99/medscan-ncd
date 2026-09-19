import os
import urllib.request
import pandas as pd

raw_dir = r"c:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD\ml_model\datasets\diabetes\raw\nhanes_2017_2018"
os.makedirs(raw_dir, exist_ok=True)

files_to_download = [
    "DEMO_J.XPT",
    "BMX_J.XPT",
    "BPX_J.XPT",
    "GLU_J.XPT",
    "GHB_J.XPT",
    "DIQ_J.XPT",
    "BIOPRO_J.XPT",
    "TCHOL_J.XPT",
    "HDL_J.XPT",
    "TRIGLY_J.XPT"
]

base_url = "https://wwwn.cdc.gov/Nchs/Nhanes/2017-2018/"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

print("=== STARTING NHANES 2017-2018 DATA ACQUISITION ===")

results = {}

for filename in files_to_download:
    url = base_url + filename
    dest_path = os.path.join(raw_dir, filename)
    
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 1000:
        print(f"[EXISTS] {filename} ({os.path.getsize(dest_path)} bytes)")
    else:
        print(f"[DOWNLOADING] {url} -> {dest_path}...")
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=60) as response, open(dest_path, "wb") as out_file:
                data = response.read()
                out_file.write(data)
            print(f"  Downloaded {len(data)} bytes.")
        except Exception as e:
            print(f"  ERROR downloading {filename}: {e}")
            continue

    # Inspect file
    try:
        df = pd.read_sas(dest_path, format="xport")
        results[filename] = {
            "rows": len(df),
            "cols": len(df.columns),
            "columns": list(df.columns),
            "size_bytes": os.path.getsize(dest_path)
        }
        print(f"  [OK] Read {filename}: {len(df)} rows, {len(df.columns)} columns")
    except Exception as e:
        print(f"  ERROR reading {filename} with pd.read_sas: {e}")

print("\n=== SUMMARY OF DOWNLOADED ARTIFACTS ===")
for fn, meta in results.items():
    print(f"{fn:15} | Rows: {meta['rows']:6} | Cols: {meta['cols']:3} | Size: {meta['size_bytes']:9} bytes")
