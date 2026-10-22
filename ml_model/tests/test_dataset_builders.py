from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import pandas as pd

from ml_model.training.dataset_builders import (
    CKD_EXCLUDED,
    HYPERTENSION_FEATURES,
    _read_xpt,
    build_ckd_dataset,
    build_hypertension_dataset,
    construct_hypertension_label,
    normalize_ckd_target,
)


class HypertensionTargetTests(unittest.TestCase):
    def test_positive_diagnosis(self):
        self.assertEqual(construct_hypertension_label({"BPQ020": 1, "BPQ040A": None, "BPQ050A": None}), (1, "reported_diagnosis"))

    def test_positive_current_medicine(self):
        self.assertEqual(construct_hypertension_label({"BPQ020": 9, "BPQ040A": None, "BPQ050A": 1}), (1, "current_hypertension_medication"))

    def test_documented_negative_structural_skip(self):
        self.assertEqual(construct_hypertension_label({"BPQ020": 2, "BPQ040A": None, "BPQ050A": None}), (0, "documented_no_diagnosis_structural_skip"))

    def test_refused_diagnosis_is_not_negative(self):
        self.assertIsNone(construct_hypertension_label({"BPQ020": 7, "BPQ040A": None, "BPQ050A": None})[0])

    def test_unresolved_and_missing_diagnosis_are_not_negative(self):
        for value in (9, None):
            self.assertIsNone(construct_hypertension_label({"BPQ020": value, "BPQ040A": None, "BPQ050A": None})[0])

    def test_contradictory_medication_after_skip_is_excluded(self):
        label, reason = construct_hypertension_label({"BPQ020": 2, "BPQ040A": None, "BPQ050A": 1})
        self.assertIsNone(label)
        self.assertEqual(reason, "contradictory_values_after_documented_skip")

    def test_bp_measurements_never_enter_features(self):
        root = Path(__file__).resolve().parents[1] / "datasets" / "hypertension" / "raw" / "nhanes_2017_2018"
        features, target, audit = build_hypertension_dataset(root)
        self.assertEqual(list(features.columns), HYPERTENSION_FEATURES)
        self.assertTrue({"systolic_bp", "diastolic_bp", "BPXSY1", "BPXDI1"}.isdisjoint(features.columns))
        self.assertEqual(len(features), len(target))
        self.assertIn("PASS", audit["bp_predictor_leakage_audit"])

    def test_duplicate_participant_ids_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "DEMO_J.XPT"
            path.touch()
            fake = pd.DataFrame({"SEQN": [1.0, 1.0], "x": [1, 2]})
            with patch("ml_model.training.dataset_builders.pd.read_sas", return_value=fake):
                with self.assertRaisesRegex(ValueError, "duplicate SEQN"):
                    _read_xpt(Path(directory), "DEMO_J.XPT")


class CKDTargetAndSchemaTests(unittest.TestCase):
    def test_target_mapping_trims_dataset_whitespace(self):
        self.assertEqual(normalize_ckd_target(" ckd\t"), 1)
        self.assertEqual(normalize_ckd_target("notckd "), 0)

    def test_unknown_target_rejected(self):
        with self.assertRaisesRegex(ValueError, "Unrecognized"):
            normalize_ckd_target("maybe")

    def test_dataset_counts_and_approved_feature_columns(self):
        csv_path = Path(__file__).resolve().parents[1] / "datasets" / "ckd" / "raw" / "uci_chronic_kidney_disease.csv"
        X, y, audit = build_ckd_dataset(csv_path)
        self.assertEqual(audit["source_rows"], 400)
        self.assertEqual(audit["source_class_counts_normalized"], {"ckd_positive": 250, "notckd_negative": 150})
        self.assertEqual(len(X), len(y))
        self.assertEqual(set(X.columns), {"age", "blood_pressure", "blood_glucose", "blood_urea", "serum_creatinine", "hemoglobin"})
        for excluded in CKD_EXCLUDED:
            self.assertNotIn(excluded, X.columns)
        self.assertEqual(audit["excluded_missing_required_age_or_creatinine"], 26)


if __name__ == "__main__":
    unittest.main()
