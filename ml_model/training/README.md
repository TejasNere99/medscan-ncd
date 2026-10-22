# Hypertension and CKD model workflow

These are research classification models, not clinical decision tools. The hypertension target is current self-reported diagnosed/treated status in NHANES 2017–2018; CKD is the original UCI dataset label. Neither task predicts future onset, establishes a diagnosis, nor has clinical validation.

## Reproduce the data and models

Run from the repository root with Python 3.14.4 and the pinned environment in `ml_model/training/requirements.txt`:

```powershell
python -m pip install -r ml_model/training/requirements.txt
python ml_model/training/download_authoritative_datasets.py
python -m unittest ml_model.tests.test_dataset_builders -v
python ml_model/training/train_hypertension.py
python ml_model/training/train_kidney_disease.py
python ml_model/training/materialize_explainability_background.py
python ml_model/training/verify_models.py
```

The downloader only creates absent source files; it verifies cached hashes against the manifests and refuses an unexpected UCI dataset URL or row count. Raw files are ignored by Git. Keep the adjacent `source_manifest.json` files with the local datasets. NHANES files are public-use CDC/NCHS data; NHANES sampling weights/design must be used for population-representative inference. Current model training is an unweighted development analysis and must not be described as nationally representative. The UCI CKD dataset is identified by DOI `10.24432/C5G020` and its repository lists CC BY 4.0; retain attribution when redistributing derived materials.

Training scripts refuse to overwrite an existing versioned release or ablation artifacts. Run the listed training commands in a clean checkout/artifact directory; create a new versioned output path before conducting a later retraining run.

`train_kidney_disease.py` compares groups A, B, and C over the same participant split. Candidate/CV comparisons, calibration choice, threshold selection, and feature-group selection use development data only. Held-out results are written after selection and are descriptive. Group C is not mapped into the application because UCI does not specify the BP reading's systolic/diastolic semantics or the hemoglobin denominator. The model release selects the smallest eligible production-mappable group meeting its development-only comparability and sensitivity rule.

## Artifacts and service

Versioned artifacts are under `ml_model/artifacts/{hypertension,kidney_disease}/v1/`. Each release includes the fitted calibrated estimator, ordered feature schema, metadata, held-out metrics, calibration and threshold reports, smoke-test evidence, and development-only explainability background. Ablation outputs are under `ml_model/artifacts/kidney_disease/ablation/`.

Run the service from the repository root after training. The intended current
Hypertension + CKD service port is 8001 because the existing listener on 8000
does not have these routes:

```powershell
$env:ML_INTERNAL_API_KEY = '<a locally generated high-entropy secret>'
python -m uvicorn ml_model.service.app:app --host 127.0.0.1 --port 8001
```

Configure the same `ML_INTERNAL_API_KEY` for the Express backend. FastAPI reads
it directly from the process environment; it does not load a `.env` file. The
file `ml_model/service/.env.example` documents its variable names but is not
automatically loaded. Express loads `backend/.env` with dotenv, without
overriding variables already present in the process environment. Its service
URL precedence is `DIABETES_ML_SERVICE_URL` > `ML_SERVICE_URL` > the built-in
`http://127.0.0.1:8000` default. The new prediction routes require the shared
secret; never put it in browser code. Health is available at `GET /health`.
The protected routes are `POST /predict/hypertension` and `POST /predict/ckd`.
Run `python ml_model/training/verify_models.py` to check artifact loading,
schema ordering, calibration, probability bounds, and deterministic smoke
inference.

## Target and feature rules

Hypertension positives are a valid affirmative response to `BPQ020` or current prescribed antihypertensive medication. A valid `BPQ020=No` with medication fields skipped per the questionnaire is negative. Refused, don't-know, unresolved, and contradictory responses are excluded. Measured systolic/diastolic pressure and direct diagnosis/treatment fields never enter the feature frame. Optional fasting glucose comes only from the NHANES fasting subsample; the training analysis is not survey weighted.

CKD source labels are whitespace-trimmed and normalized (`ckd`=positive, `notckd`=negative); unknown labels fail closed. Age and serum creatinine are required. Missing optional values are imputed within each training fold; no test-set values fit preprocessing. Clinically possible high positive measurements are retained, while invalid/non-finite values are rejected or treated as missing according to the dataset builder. Total blood urea is kept distinct from BUN; mmol/L total urea is converted to mg/dL with the recorded conversion trace. The application currently selects the minimal A schema, so urea is parsed and retained in confirmed medical records but is not an input to the selected A model. It can become a model input only in a separately versioned release selected and verified through the ablation process.

## Limitations

NHANES self-report depends on healthcare access and awareness; excluding blood pressure changes the task. Fasting lab availability is limited and the current training run is unweighted. UCI CKD contains 400 single-hospital records; only rows with required age and creatinine are usable, leaving 374. Held-out and calibration estimates are uncertain at this sample size. These models require external and clinical validation before clinical use.
