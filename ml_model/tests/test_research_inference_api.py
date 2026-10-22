"""Protected API smoke checks against the actual trained model artifacts."""

from __future__ import annotations

import os
import unittest

from fastapi.testclient import TestClient

from ml_model.service import app as service


class ResearchInferenceApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ["ML_INTERNAL_API_KEY"] = "unit-test-internal-model-key"
        service.load_research_artifacts()
        cls.client_context = TestClient(service.app)
        cls.client = cls.client_context.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.client_context.__exit__(None, None, None)
        os.environ.pop("ML_INTERNAL_API_KEY", None)

    def test_inference_requires_internal_token(self):
        response = self.client.post("/predict/ckd", json={"features": {"age": 55, "serum_creatinine": 1.8}})
        self.assertEqual(response.status_code, 401)

    def test_wrong_internal_token_is_rejected_without_echoing_it(self):
        wrong_token = "not-the-configured-test-token"
        response = self.client.post(
            "/predict/ckd",
            headers={"X-ML-Internal-Token": wrong_token},
            json={"features": {"age": 55, "serum_creatinine": 1.8}},
        )
        self.assertEqual(response.status_code, 401)
        self.assertNotIn(wrong_token, response.text)

    def test_missing_key_configuration_is_a_clear_service_error(self):
        configured = os.environ.pop("ML_INTERNAL_API_KEY")
        try:
            response = self.client.post(
                "/predict/ckd",
                headers={"X-ML-Internal-Token": configured},
                json={"features": {"age": 55, "serum_creatinine": 1.8}},
            )
        finally:
            os.environ["ML_INTERNAL_API_KEY"] = configured
        self.assertEqual(response.status_code, 503)
        self.assertIn("not configured", response.json()["detail"])
        self.assertNotIn(configured, response.text)

    def test_ckd_valid_prediction_uses_real_calibrated_artifact(self):
        response = self.client.post(
            "/predict/ckd",
            headers={"X-ML-Internal-Token": os.environ["ML_INTERNAL_API_KEY"]},
            json={"features": {"age": 55, "serum_creatinine": 1.8}},
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertTrue(body["canCalculate"])
        self.assertGreaterEqual(body["probability"], 0)
        self.assertLessEqual(body["probability"], 1)
        self.assertEqual(body["featureSchemaVersion"], "ckd.a_minimal.v1")
        self.assertEqual(body["explanationStatus"], "unavailable")
        self.assertEqual(body["topContributingFactors"], [])

    def test_hypertension_prediction_returns_partial_data_without_fabricated_factors(self):
        response = self.client.post(
            "/predict/hypertension",
            headers={"X-ML-Internal-Token": os.environ["ML_INTERNAL_API_KEY"]},
            json={"features": {"age": 52, "sex": 1}},
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertTrue(body["canCalculate"])
        self.assertEqual(body["dataCompleteness"], "PARTIAL")
        self.assertIsNone(body["features"].get("systolic_bp"))
        self.assertEqual(body["explanationStatus"], "unavailable")
        self.assertEqual(body["topContributingFactors"], [])

    def test_ckd_missing_required_value_returns_no_probability(self):
        response = self.client.post(
            "/predict/ckd",
            headers={"X-ML-Internal-Token": os.environ["ML_INTERNAL_API_KEY"]},
            json={"features": {"age": 55, "serum_creatinine": None}},
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertFalse(body["canCalculate"])
        self.assertEqual(body["status"], "INSUFFICIENT_DATA")
        self.assertIsNone(body["probability"])

    def test_unexpected_feature_fails_closed(self):
        response = self.client.post(
            "/predict/ckd",
            headers={"X-ML-Internal-Token": os.environ["ML_INTERNAL_API_KEY"]},
            json={"features": {"age": 55, "serum_creatinine": 1.8, "egfr": 42}},
        )
        self.assertEqual(response.status_code, 422)

    def test_invalid_feature_value_is_rejected(self):
        response = self.client.post(
            "/predict/hypertension",
            headers={"X-ML-Internal-Token": os.environ["ML_INTERNAL_API_KEY"]},
            json={"features": {"age": 200, "sex": 1}},
        )
        self.assertEqual(response.status_code, 422)

    def test_unavailable_model_returns_503_without_probability(self):
        original = service.CKD_MODEL
        service.CKD_MODEL = None
        try:
            response = self.client.post(
                "/predict/ckd",
                headers={"X-ML-Internal-Token": os.environ["ML_INTERNAL_API_KEY"]},
                json={"features": {"age": 55, "serum_creatinine": 1.8}},
            )
        finally:
            service.CKD_MODEL = original
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("probability", response.json())

    def test_inference_exception_returns_sanitized_500(self):
        class BrokenModel:
            def predict_proba(self, _frame):
                raise RuntimeError("synthetic estimator failure")

        original = service.CKD_MODEL
        service.CKD_MODEL = BrokenModel()
        try:
            response = self.client.post(
                "/predict/ckd",
                headers={"X-ML-Internal-Token": os.environ["ML_INTERNAL_API_KEY"]},
                json={"features": {"age": 55, "serum_creatinine": 1.8}},
            )
        finally:
            service.CKD_MODEL = original
        self.assertEqual(response.status_code, 500)
        self.assertNotIn("synthetic estimator failure", response.text)
        self.assertNotIn(os.environ["ML_INTERNAL_API_KEY"], response.text)

    def test_hypertension_rejects_blood_pressure_predictor(self):
        response = self.client.post(
            "/predict/hypertension",
            headers={"X-ML-Internal-Token": os.environ["ML_INTERNAL_API_KEY"]},
            json={"features": {"systolic_bp": 150}},
        )
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
