import os
import urllib.request
from bs4 import BeautifulSoup

doc_dir = r"c:\Users\PC\OneDrive\Desktop\College work\Mini Project\MedScan_NCD\ml_model\datasets\diabetes\raw\nhanes_2017_2018\docs"
os.makedirs(doc_dir, exist_ok=True)

files = [
    "DEMO_J", "BMX_J", "BPX_J", "GLU_J", "GHB_J",
    "DIQ_J", "BIOPRO_J", "TCHOL_J", "HDL_J", "TRIGLY_J"
]

base_url = "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

print("=== DOWNLOADING NHANES 2017-2018 CODEBOOKS & DOCUMENTATION ===")

for file_stem in files:
    url = f"{base_url}{file_stem}.htm"
    dest = os.path.join(doc_dir, f"{file_stem}.htm")
    print(f"Downloading {url} ...")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=60) as resp, open(dest, "wb") as f:
            f.write(resp.read())
        print(f"  [OK] Saved {file_stem}.htm ({os.path.getsize(dest)} bytes)")
    except Exception as e:
        print(f"  [ERROR] {file_stem}: {e}")
