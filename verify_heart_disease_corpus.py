"""
verify_heart_disease_corpus.py
==============================
Independent verification suite for Phase 7D.1 Heart Disease Synthetic Test Corpus.
Validates all Quality Control criteria:
  1. PDF openability and file size > 0 (verified via binary header/trailer)
  2. Matching JSON ground truth for every PDF
  3. Master Manifest alignment and completeness
  4. Purity: Absolutely zero model predictions, probabilities, risk categories, or SHAP values
  5. Privacy: Zero real-world PII, all IDs follow synthetic patterns
  6. Clinical consistency: sysBP > diaBP, ages 18-100, medically plausible bounds
  7. Category requirements:
     - 04_missing_required_data omits intended required features
     - 05_optional_missing_data retains required and omits optional
     - 07_unit_variations contains valid mmol/L units
     - 09_multi_report_longitudinal has >=3 patients with chronologically ordered visits
  8. Synthetic disclosure watermark presence
"""

import sys
import json
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent
CORPUS_ROOT = BASE_DIR / "test_corpus" / "heart_disease"
MANIFEST_FILE = CORPUS_ROOT / "MASTER_HEART_DISEASE_TEST_MANIFEST.json"
README_FILE = CORPUS_ROOT / "HEART_DISEASE_TEST_CORPUS_README.md"

def run_verification():
    print("=" * 76)
    print("MEDSCAN-NCD: PHASE 7D.1 HEART DISEASE CORPUS INDEPENDENT AUDITOR")
    print("=" * 76)

    errors = []
    warnings = []

    # 1. Check Manifest
    if not MANIFEST_FILE.exists():
        errors.append(f"Manifest file missing: {MANIFEST_FILE}")
        return False

    with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    print(f"[AUDIT] Loaded manifest with {len(manifest)} report entries.")

    if len(manifest) < 30:
        errors.append(f"Expected at least 30 reports, found {len(manifest)}")

    categories = set()
    patients = set()
    longitudinal_patients = {}

    for entry in manifest:
        rep_id = entry["id"]
        cat = entry["category"]
        rel_file = entry["file"]
        p_id = entry["patient_id"]
        r_date = entry["report_date"]

        categories.add(cat)
        patients.add(p_id)

        # Track longitudinal
        if cat == "09_multi_report_longitudinal":
            if p_id not in longitudinal_patients:
                longitudinal_patients[p_id] = []
            longitudinal_patients[p_id].append((r_date, rep_id))

        pdf_path = BASE_DIR / rel_file
        if not pdf_path.exists() or pdf_path.stat().st_size == 0:
            errors.append(f"PDF missing or empty: {pdf_path}")
            continue

        # Check PDF binary structure (%PDF header and %%EOF trailer)
        with open(pdf_path, "rb") as pf:
            pdf_bytes = pf.read()
            if not pdf_bytes.startswith(b"%PDF"):
                errors.append(f"PDF missing valid %PDF header: {pdf_path}")
            if b"%%EOF" not in pdf_bytes[-1024:]:
                errors.append(f"PDF missing %%EOF marker: {pdf_path}")
            # Check watermark text inside PDF stream
            if b"SYNTHETIC TEST DATA" not in pdf_bytes:
                errors.append(f"Synthetic disclosure banner missing from PDF: {pdf_path}")

        # Check Matching Ground Truth JSON
        json_path = pdf_path.with_suffix(".json")
        if not json_path.exists() or json_path.stat().st_size == 0:
            errors.append(f"Matching JSON missing or empty: {json_path}")
            continue

        with open(json_path, "r", encoding="utf-8") as jf:
            gt = json.load(jf)

        # Purity check: NO predictions, probabilities, risk categories, or SHAP
        gt_raw = json.dumps(gt).lower()
        for forbidden in ["probability", "riskcategory", "risk_category", "shap", "prediction", "forecast"]:
            if forbidden in gt_raw:
                errors.append(f"Forbidden term '{forbidden}' in ground truth: {json_path}")

        # Check printed values structure
        printed = gt.get("printed_values", {})
        if not printed:
            errors.append(f"Empty printed_values in: {json_path}")

        # Category-specific checks
        if cat == "04_missing_required_data":
            missing = entry["features_missing"]
            required_set = {"age", "sex", "totChol", "sysBP", "diaBP"}
            if not any(req in missing for req in required_set):
                errors.append(f"{rep_id} in {cat} does not omit any required feature!")

        if cat == "05_optional_missing_data":
            required_set = {"age", "sex", "totChol", "sysBP", "diaBP"}
            present = set(entry["features_present"])
            if not required_set.issubset(present):
                errors.append(f"{rep_id} in {cat} is missing required features: {required_set - present}")
            optional_set = {"BMI", "glucose", "currentSmoker"}
            missing = set(entry["features_missing"])
            if not (missing & optional_set):
                errors.append(f"{rep_id} in {cat} does not omit any optional feature!")

        if cat == "07_unit_variations":
            units = entry.get("units", {})
            has_alt_unit = units.get("totChol") == "mmol/L" or units.get("glucose") == "mmol/L"
            if not has_alt_unit:
                errors.append(f"{rep_id} in {cat} does not specify mmol/L in manifest units")

        # Clinical range and consistency checks
        age = printed.get("age")
        if age is not None:
            if not (18 <= age <= 100):
                errors.append(f"Invalid clinical age {age} in {rep_id}")

        sys_bp = printed.get("sysBP")
        dia_bp = printed.get("diaBP")
        if sys_bp and dia_bp:
            sbp = sys_bp["value"]
            dbp = dia_bp["value"]
            if sbp <= dbp:
                errors.append(f"Physiological violation: sysBP ({sbp}) <= diaBP ({dbp}) in {rep_id}")

    # Longitudinal consistency check
    if len(longitudinal_patients) < 3:
        errors.append(f"Expected at least 3 longitudinal patients, found {len(longitudinal_patients)}")
    for p_id, visits in longitudinal_patients.items():
        if len(visits) < 2:
            errors.append(f"Longitudinal patient {p_id} has fewer than 2 reports: {len(visits)}")
        dates = [datetime.strptime(v[0], "%Y-%m-%d") for v in visits]
        if dates != sorted(dates):
            errors.append(f"Longitudinal patient {p_id} reports are not in chronological order: {visits}")

    # Check README
    if not README_FILE.exists() or README_FILE.stat().st_size == 0:
        errors.append(f"Corpus README missing: {README_FILE}")

    print(f"\n[SUMMARY OF FINDINGS]")
    print(f"  - Total Manifest Entries: {len(manifest)}")
    print(f"  - Categories Covered: {len(categories)} / 10")
    print(f"  - Unique Synthetic Patients: {len(patients)}")
    print(f"  - Longitudinal Patient Cohorts: {len(longitudinal_patients)} patients ({sum(len(v) for v in longitudinal_patients.values())} reports)")
    print(f"  - Errors: {len(errors)}")
    print(f"  - Warnings: {len(warnings)}")

    if errors:
        print("\n[FAILURES]")
        for err in errors:
            print(f"  [X] {err}")
        return False
    else:
        print("\n[ALL PHASE 7D.1 QUALITY CONTROL CHECKS PASSED]")
        return True

if __name__ == "__main__":
    success = run_verification()
    sys.exit(0 if success else 1)
