# MedScan-NCD hypertension and CKD model report

**Release scope:** versioned research models `1.0.0-research`, integrated into the application APIs. The classifiers estimate dataset-label status; neither predicts future disease onset, makes a diagnosis, nor has clinical validation.

## Repository and integration

The existing Python FastAPI service, Express prediction routes, authenticated patient/report models, and confirmed-report flow were retained. New isolated model artifacts and endpoints were added for hypertension and CKD. Diabetes and heart disease model artifacts and API behavior were not retrained or replaced.

Blood urea is parsed as total urea and kept distinct from BUN. Total urea in mmol/L is converted to mg/dL with conversion provenance; confirmed reports update the patient profile. The production CKD feature builder consumes only the selected schema, **A: age and serum creatinine**. Blood urea was evaluated in group B and is stored for future versioned use, but the small-set selection rule chose the simpler A model. The UCI BP and hemoglobin fields from group C are not mapped to application values because their semantics/units are insufficiently specified.

The Express routes are authenticated and build inputs server-side from confirmed reports and verified profile snapshots. Patient scoping remains enforced. The FastAPI research-model routes require `X-ML-Internal-Token`; configure the same high-entropy `ML_INTERNAL_API_KEY` in FastAPI and Express. If the service is missing, invalid, or times out, the backend stores an unavailable status with `null` probability. The model/schema handoff is in `backend/src/config/researchModelSchemas.json`.

Routes:

- `POST /api/predictions/hypertension`, `GET /api/predictions/hypertension/latest`, `GET /api/predictions/hypertension/history`
- `POST /api/predictions/ckd`, `GET /api/predictions/ckd/latest`, `GET /api/predictions/ckd/history`
- Internal service routes: `POST /predict/hypertension`, `POST /predict/ckd`

The frontend prediction service now exposes methods for the new APIs. No dashboard layout was changed and no new visible disease card was added; rendering a new card requires a small UI integration that displays the task interpretation, threshold category, partial-data state, and unavailable status without implying diagnosis or future risk.

## Dataset provenance and target construction

### Hypertension

- Official source: [CDC/NCHS NHANES 2017–2018](https://wwwn.cdc.gov/nchs/nhanes/). Component codebooks: [BPQ_J](https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/BPQ_J.htm), [DEMO_J](https://wwwn.cdc.gov/nchs/data/nhanes/public/2017/datafiles/DEMO_J.htm), [BIOPRO_J](https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/BIOPRO_J.htm), [SMQ_J](https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/SMQ_J.htm).
- Components downloaded directly from CDC and recorded with URL, byte size, retrieval time, and SHA-256 in `ml_model/datasets/hypertension/raw/nhanes_2017_2018/source_manifest.json` (retrieved 2026-10-18 UTC):

| Component | Bytes | SHA-256 |
|---|---:|---|
| DEMO_J.XPT | 3,412,720 | `c0b46e0345ea19404928656277c8b0d10b0cca348a9b2fe4fc3c67e8b7ee73ec` |
| BPQ_J.XPT | 544,560 | `63cfe1c331a1e7d3534328ac86312a21ffee3e01aa189bc1f74d06855239e5aa` |
| BPX_J.XPT | 1,466,000 | `f98f1d9a4c18173e715c749b4294f6f1525140d5ad5751316bb17cc038fb3423` |
| BMX_J.XPT | 1,466,000 | `8d675e42d8826ac98714b2c3dd4c5138a5e353fb4424f7eff5e6db4a01ce838a` |
| TCHOL_J.XPT | 179,680 | `0291a6a4f6d82dac8392c8c992b519946824dfeda01647935520cf506ed9f4ab` |
| HDL_J.XPT | 179,680 | `9f4eb41b89f0c9f3d6262f873e671eeb2f2eb40581a8426b2a3c8fd4fc19439e` |
| BIOPRO_J.XPT | 2,106,080 | `5bcd5722c1892883b96a9d7fed0befadabacae313f800fadc0133cd5dd00c4c6` |
| SMQ_J.XPT | 2,305,600 | `73c3708e540cbf520a566508aa629c3e4ba53cad77dae9388ca36384646455f4` |
| GLU_J.XPT | 98,480 | `5b38897d0d7bfbc69dd9ca74ffdaf2f6a9bed5a91d4a7bf46e07f1332cc3379e` |

- BPQ_J had 6,161 participants; DEMO_J had 9,254; the verified one-to-one BPQ/DEMO join retained all 6,161. Target resolution produced 2,137 positives and 4,014 negatives; 10 “don’t know” labels were excluded. Required age/sex filtering removed zero additional participants, leaving 6,151 (34.74% positive).
- Positive means valid BPQ020 Yes or current prescribed hypertension medication (BPQ050A Yes). Negative means BPQ020 No with BPQ040A/BPQ050A blank under the documented skip. Refused, unresolved, contradictory, or invalid target responses are excluded.
- Features: age, sex, BMI, fasting glucose, total cholesterol, HDL, serum creatinine, pulse rate (BPXPLS only), and current smoker. SBP, DBP, BP-derived values, and diagnosis/treatment questionnaire fields are excluded. Fasting glucose is from the fasting subsample and has 43.16% feature coverage. Training is unweighted and is not a population prevalence estimate; use NHANES design weights/variance methods for population inference.
- Data are U.S. federal public-use CDC/NCHS data; the acquisition manifest retains attribution/source information.

### CKD

- Official source: [UCI Chronic Kidney Disease dataset](https://archive.ics.uci.edu/dataset/336/chronic+kidney+disease), DOI `10.24432/C5G020`, official UCI API download. UCI lists CC BY 4.0.
- `uci_chronic_kidney_disease.csv`, 45,092 bytes, retrieved 2026-10-18 UTC, SHA-256 `0eeea8d17f5ad8792d854999d6ddf1602ec4e116616f6ccdfdaef0ba8109e694`. Full provenance: `ml_model/datasets/ckd/raw/source_manifest.json`.
- Source: 400 rows; raw target spellings were `ckd` 248, `ckd\t` 2, `notckd` 150. After trimming, class counts are 250 positive and 150 negative. 26 rows lacked required age or serum creatinine; eligible/trained count is 374 (230 positive, 144 negative).
- Target is the normalized original dataset class. Required fields are age and serum creatinine. Unknown labels fail closed. Missing optional fields are imputed inside each training fold; extreme positive clinical values are retained; non-finite/impossible values are marked missing according to the documented rules.

## Training protocol and results

Random seed 42; stratified 80/20 untouched held-out split; development-only five-fold candidate grid search on ROC-AUC; preprocessing resides within CV pipelines. Balanced class weights are used for logistic regression, random forest, decision tree, and LightGBM where supported; HistGradientBoosting does not expose the same class-weight option. The selected calibration method is chosen by cross-fitted development Brier score (sigmoid vs isotonic). Threshold maximizes specificity among cross-fitted development thresholds with sensitivity at least 0.80. No held-out labels are used for candidate, calibration, threshold, or feature-group selection. Confidence intervals are 1,000 class-stratified bootstrap resamples of held-out records.

Selected candidates: **HistGradientBoosting** for hypertension (development CV ROC-AUC 0.8088 ± 0.0093; PR-AUC 0.6672; Brier 0.1676; sigmoid calibration) and **Random Forest** for CKD A (development CV ROC-AUC 0.9661 ± 0.0223; PR-AUC 0.9823; Brier 0.0671; isotonic calibration). Full candidate grids and parameter comparisons are in each model’s `reports/model_comparison.csv` and `reports/cross_validation_metrics.json`.

| Held-out metric | Hypertension | CKD (selected A) |
|---|---:|---:|
| Records / positive / negative | 1,231 / 428 / 803 | 75 / 46 / 29 |
| ROC-AUC (95% bootstrap CI) | 0.8233 (0.7999–0.8475) | 0.9130 (0.8432–0.9670) |
| PR-AUC (95% CI) | 0.6864 (0.6457–0.7334) | 0.9524 (0.9155–0.9805) |
| Sensitivity (95% CI) | 0.7944 (0.7570–0.8341) | 0.7174 (0.5870–0.8478) |
| Specificity (95% CI) | 0.7086 (0.6749–0.7397) | 1.0000 (1.0000–1.0000) |
| Precision (95% CI) | 0.5923 (0.5637–0.6210) | 1.0000 (1.0000–1.0000) |
| F1 (95% CI) | 0.6786 (0.6510–0.7078) | 0.8354 (0.7397–0.9176) |
| Accuracy (95% CI) | 0.7384 (0.7124–0.7628) | 0.8267 (0.7467–0.9067) |
| Brier (95% CI) | 0.1614 (0.1515–0.1710) | 0.1144 (0.0689–0.1684) |
| ECE, 10 bins | 0.0235 | 0.0675 |
| Development threshold / calibration | 0.330679 / sigmoid | 0.967232 / isotonic |
| Confusion matrix (TN, FP, FN, TP) | 569, 234, 88, 340 | 29, 0, 13, 33 |

The threshold values are model operating points selected for engineering evaluation, not clinical guidelines. CKD’s high threshold and small test set produce a wide sensitivity interval; the held-out sensitivity did not reach the development target. Treat both model scores and categories as research estimates.

## CKD matched-participant ablation

All groups use the same 374 eligible records, random-state-42 split, candidate/calibration/threshold protocol. Held-out values are descriptive only and did not select the production group.

| Group | Features | Dev ROC-AUC / PR-AUC / Brier | Dev sensitivity / specificity | Test ROC-AUC / PR-AUC / Brier | Test sensitivity / specificity |
|---|---|---|---|---|---|
| A | age, serum creatinine | 0.9546 / 0.9773 / 0.0697 | 0.8043 / 1.0000 | 0.9130 / 0.9524 / 0.1144 | 0.7174 / 1.0000 |
| B | A + blood urea | 0.9648 / 0.9805 / 0.0735 | 0.8261 / 0.9913 | 0.9408 / 0.9660 / 0.0928 | 0.7391 / 1.0000 |
| C | B + BP, random glucose, hemoglobin | 0.9906 / 0.9948 / 0.0307 | 0.8315 / 1.0000 | 0.9978 / 0.9986 / 0.0210 | 0.9130 / 1.0000 |

A was chosen because it is the smallest safe production-compatible feature group within 0.02 of the eligible best on development ROC-AUC and Brier, while meeting the development sensitivity criterion. Group C’s unusually strong results on 75 held-out records are not evidence of generalization; its BP value lacks systolic/diastolic semantics and UCI’s hemoglobin unit lacks a denominator, so C is not production-mappable.

## Blood urea, explainability, and artifacts

- `bloodUrea` and distinct `bloodUreaNitrogen` canonical fields; recognized mg/dL and mmol/L; total-urea conversion factor 6.006 mg/dL per mmol/L; negative values rejected and extreme positive values retained with a warning.
- Review/correction UI requires an explicit blood-urea unit. Confirmed corrected values preserve source/unit/conversion provenance and update the patient snapshot. Unconfirmed OCR values never enter the feature builder.
- Local request-time explanations are disabled for both new models. Exact permutation SHAP exceeded the backend’s 15-second request timeout on this CPU for the nine-feature hypertension model and also exceeded it for CKD after enabling the background sample. Both APIs return `explanationStatus: unavailable` with no fabricated local factors. Developer-facing global feature-weight reports and development-only background samples are saved; a faster local method remains future work.
- Main artifacts: `ml_model/artifacts/hypertension/v1/` and `ml_model/artifacts/kidney_disease/v1/`. Each includes `model.joblib`, `feature_schema.json`, `model_metadata.json`, `heldout_metrics.json`, `threshold_selection_report.json`, explainability background, and calibration/training reports. CKD ablation artifacts and comparison are in `ml_model/artifacts/kidney_disease/ablation/`.
- Training scripts/docs/tests: `ml_model/training/`, `ml_model/tests/`, and `ml_model/training/README.md`. `ml_model/training/requirements.txt` records the environment.

## Verification evidence

- Dataset acquisition rerun: all 9 official NHANES files and official UCI data verified against stored SHA-256 manifests; no raw files overwritten.
- Dataset/label/leakage tests: `python -m unittest ml_model.tests.test_dataset_builders -v` — 11 passed.
- Model artifacts: `python ml_model/training/verify_models.py` — both calibrated artifacts loaded, schemas matched, probabilities finite/in range, repeated inference deterministic.
- FastAPI: `python -m unittest ml_model.tests.test_research_inference_api -v` — 6 passed (valid CKD and partial hypertension inference, missing-required handling with no probability, internal-token enforcement, unexpected-feature rejection, and hypertension BP-feature rejection). Full discovery run: `python -m unittest discover -s ml_model/tests -v` — 17 passed.
- FastAPI `GET /health` returned `healthy` with Diabetes, Heart Disease, hypertension, and CKD artifacts loaded in the local E2E service.
- Backend: `npm test` — 10 suites passed, 107 tests passed; one opt-in live-service E2E test skipped in the default run. A separate live FastAPI/Express/MongoDB isolated-database run with `RUN_RESEARCH_MODEL_E2E=true` passed 7/7 authenticated workflow tests, including report upload/review/confirmation and real hypertension and CKD inference. The test database was removed by the test runner; no remote database was contacted.
- Diabetes and heart disease regression: passed in backend and live authenticated integration runs.
- Blood-urea report persistence: passed through OCR extraction, manual correction from 8.5 mmol/L, explicit confirmation, conversion to 51.05 mg/dL, verified provenance, and patient-profile snapshot assertion in the authenticated workflow.
- Frontend: `npm run build` — Vite production build passed after adding service methods; no layout redesign.
- Python syntax: all 16 ML Python files parsed successfully.

Reproduce using commands in `ml_model/training/README.md` from a clean checkout/artifact directory; training scripts protect existing releases from overwrite. Training was run once per final model; reproducibility evidence includes recorded split-ID hashes and deterministic repeated inference, but a second full retraining comparison was not run.

## Final quality-gate status

| Gate | Status | Evidence / limitation |
|---|---|---|
| Hypertension dataset validation | PASS | CDC components, labels, joins, counts, hashes audited |
| Hypertension training | PASS | Development CV and untouched holdout reports saved |
| Hypertension calibration | PASS | Sigmoid selected by development cross-fit Brier; holdout calibration reported |
| Hypertension production inference | PASS (software) | Protected route and real authenticated E2E; research-only, not clinically validated |
| CKD dataset validation | PASS | Official UCI data, labels, license, hashes, required-field exclusions audited |
| CKD training | PASS | Selected model/schema/artifacts load and smoke-test |
| CKD feature ablation | PASS | A/B/C matched split; group selected on development only |
| CKD calibration | PASS (research) | Isotonic selected; held-out calibration uncertainty remains high |
| Local contributing-factor explanations | PARTIAL | Global feature-weight reports exist; per-patient explanations are disabled due measured request-timeout risk |
| Blood urea production support | PASS | Parse, units, BUN separation, confirmation, profile persistence; not used in selected A model |
| CKD production inference | PASS (software) | Protected route and real authenticated E2E; not clinical validation |
| Diabetes regression | PASS | Existing regression tests and real E2E passed |
| Heart disease regression | PASS | Existing regression tests and real E2E passed |
| Report pipeline regression | PASS | OCR, correction, confirmation, blood-urea persistence tested |
| Authorization regression | PASS | Full RBAC/IDOR suite passed; patient access remains scoped |
| Frontend build | PASS | Vite production build passed |
| End-to-end verification | PASS (local synthetic workflow) | Isolated local MongoDB, real local FastAPI artifacts; not production deployment |

## Remaining limitations

No external or clinical validation, prospective outcome evaluation, regulatory review, or production deployment was performed. NHANES training was not survey-weighted and fasting glucose is a subsample feature; generalization and population inference are limited. CKD has only 374 complete required-feature records from a single hospital, and its held-out sensitivity was 0.717 with a wide interval. The backend has API methods, but the frontend does not yet display the new disease cards. The local model service must be started with a configured shared internal key before live app use; the temporary E2E server was stopped after verification.
