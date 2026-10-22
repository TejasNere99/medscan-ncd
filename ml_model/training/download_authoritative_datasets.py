#!/usr/bin/env python3
"""Download pinned public data sources used by MedScan-NCD research models.

Existing files are never overwritten. Each saved source receives a SHA-256
entry in a provenance manifest next to the raw data.
"""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
DATASETS = ROOT / "ml_model" / "datasets"
UA = "MedScan-NCD-research/1.0 (public research data acquisition)"

NHANES_FILES = {
    "DEMO_J.XPT": "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/DEMO_J.XPT",
    "BPQ_J.XPT": "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/BPQ_J.XPT",
    "BPX_J.XPT": "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/BPX_J.XPT",
    "BMX_J.XPT": "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/BMX_J.XPT",
    "TCHOL_J.XPT": "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/TCHOL_J.XPT",
    "HDL_J.XPT": "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/HDL_J.XPT",
    "BIOPRO_J.XPT": "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/BIOPRO_J.XPT",
    "SMQ_J.XPT": "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/SMQ_J.XPT",
    "GLU_J.XPT": "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/GLU_J.XPT",
}
UCI_METADATA_URL = "https://archive.ics.uci.edu/api/dataset?id=336"
UCI_REPOSITORY_URL = "https://archive.ics.uci.edu/dataset/336/chronic+kidney+disease"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def fetch(url: str, destination: Path) -> tuple[bool, str]:
    """Save a URL only if absent; fail closed on suspicious content or errors."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        return False, sha256(destination)
    request = Request(url, headers={"User-Agent": UA})
    try:
        with urlopen(request, timeout=90) as response:
            body = response.read()
            content_type = response.headers.get("Content-Type", "")
            if response.status != 200 or not body:
                raise RuntimeError(f"Download returned HTTP {response.status} or an empty body: {url}")
            if b"text/html" in content_type.lower().encode() and not url.endswith(".csv"):
                raise RuntimeError(f"Expected a data file but received HTML: {url}")
    except (URLError, TimeoutError) as exc:
        raise RuntimeError(f"Download failed for {url}: {exc}") from exc
    # Exclusive creation avoids replacing a file if another process raced us.
    with destination.open("xb") as stream:
        stream.write(body)
    return True, hashlib.sha256(body).hexdigest()


def main() -> int:
    now = datetime.now(timezone.utc).isoformat()
    nhanes_dir = DATASETS / "hypertension" / "raw" / "nhanes_2017_2018"
    nhanes_manifest = {
        "dataset": "NHANES 2017-2018",
        "source": "CDC/NCHS public-use files",
        "license_note": "U.S. federal government public-use data; retain CDC/NCHS attribution and follow NHANES analytic guidance.",
        "retrieved_at_utc": now,
        "files": [],
    }
    for name, url in NHANES_FILES.items():
        path = nhanes_dir / name
        created, digest = fetch(url, path)
        nhanes_manifest["files"].append({
            "filename": name,
            "url": url,
            "bytes": path.stat().st_size,
            "sha256": digest,
            "downloaded_now": created,
        })

    nhanes_manifest_path = nhanes_dir / "source_manifest.json"
    if not nhanes_manifest_path.exists():
        nhanes_manifest_path.write_text(json.dumps(nhanes_manifest, indent=2) + "\n", encoding="utf-8")
    else:
        prior = json.loads(nhanes_manifest_path.read_text(encoding="utf-8"))
        prior_by_name = {entry["filename"]: entry for entry in prior.get("files", [])}
        for entry in nhanes_manifest["files"]:
            old = prior_by_name.get(entry["filename"])
            if old and old.get("sha256") != entry["sha256"]:
                raise RuntimeError(f"Cached NHANES file hash differs from prior manifest: {entry['filename']}")

    # Resolve the data URL from UCI's official dataset API rather than a mirror.
    import urllib.request
    request = Request(UCI_METADATA_URL, headers={"User-Agent": UA})
    with urllib.request.urlopen(request, timeout=45) as response:
        metadata_response = json.loads(response.read().decode("utf-8"))
    if metadata_response.get("status") != 200 or metadata_response.get("data", {}).get("uci_id") != 336:
        raise RuntimeError("UCI API did not return the expected dataset ID 336.")
    uci = metadata_response["data"]
    uci_url = uci.get("data_url")
    if not uci_url or not uci_url.startswith("https://archive.ics.uci.edu/"):
        raise RuntimeError("UCI metadata returned an unexpected data URL; refusing a substitute source.")
    ckd_dir = DATASETS / "ckd" / "raw"
    ckd_path = ckd_dir / "uci_chronic_kidney_disease.csv"
    created, digest = fetch(uci_url, ckd_path)
    frame = pd.read_csv(ckd_path, skipinitialspace=True)
    if len(frame) != int(uci.get("num_instances", -1)):
        raise RuntimeError(f"UCI row count mismatch: received {len(frame)}, metadata says {uci.get('num_instances')}")
    if "class" not in frame.columns or len(frame.columns) < 2:
        raise RuntimeError("UCI CSV did not contain the expected CKD target column.")

    ckd_manifest = {
        "dataset": uci.get("name"),
        "uci_id": 336,
        "doi": uci.get("dataset_doi"),
        "repository_url": UCI_REPOSITORY_URL,
        "data_url": uci_url,
        "license": "CC BY 4.0 (as stated by UCI)",
        "retrieved_at_utc": now,
        "filename": ckd_path.name,
        "bytes": ckd_path.stat().st_size,
        "sha256": digest,
        "downloaded_now": created,
        "rows": int(len(frame)),
        "target_counts_raw": {str(k): int(v) for k, v in frame["class"].value_counts(dropna=False).items()},
    }
    manifest_path = ckd_dir / "source_manifest.json"
    if not manifest_path.exists():
        manifest_path.write_text(json.dumps(ckd_manifest, indent=2) + "\n", encoding="utf-8")
    else:
        prior = json.loads(manifest_path.read_text(encoding="utf-8"))
        if prior.get("sha256") != digest:
            raise RuntimeError("Cached CKD file hash differs from its prior UCI provenance manifest.")

    print(f"NHANES files ready: {len(nhanes_manifest['files'])}; manifest: {nhanes_manifest_path}")
    print(f"UCI CKD ready: rows={len(frame)}, classes={ckd_manifest['target_counts_raw']}; manifest: {manifest_path}")
    print("No existing data files were overwritten.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Dataset acquisition failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
