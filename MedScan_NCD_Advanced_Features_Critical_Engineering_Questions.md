# MedScan-NCD — Advanced Features & Critical Engineering Questions

## Purpose
This document covers the advanced product features, production-readiness work, and high-level viva questions to prepare **after the main product functionality and UI/UX transformation**.

Always distinguish:
- **Implemented:** built, tested, demonstrable.
- **Planned:** architecture decided, not yet implemented.
- **Future/Production:** realistic larger-scale strategy, not claimed as implemented.

---

# PART A — ADVANCED PRODUCT FEATURES

## 1. AI Context Engineering
Current issue: the system mainly exposes model-estimated risk/probability and scientific terminology.

Goal:
**Confirmed Data + Model Output + Contributing Factors + Report Context + Trends → AI Context Builder → LLM → Patient-friendly English/Marathi explanation**

The AI should explain:
- What the report indicates
- Why the model estimated this risk
- Which observed factors contributed
- What the risk means in simple language
- Reasonable preventive/lifestyle actions
- When to discuss the result with a doctor
- Missing/uncertain information

Safety:
- No diagnosis
- No invented patient values
- No overriding the disease model
- Preserve uncertainty
- Explicitly say risk is model-estimated
- Doctor decision-support framing

## 2. Voice Health Explanation
After AI explanation:
- English TTS
- Marathi TTS
- Play/pause/stop
- Mobile-friendly controls

Pipeline:
**Model Output → AI Explanation → Text → TTS → Voice**

Voice is a presentation layer, not the medical reasoning engine.

## 3. Report Comparison
Compare reports over time:
- Previous value
- Current value
- Absolute change
- Direction
- Date
- Provenance

Do not automatically label changes medically good/bad without suitable clinical context.

## 4. Health Timeline
Longitudinal timeline:
**Report upload → OCR → confirmation → prediction → appointment → follow-up report → new prediction**

## 5. What-If Health Simulation
Example:
BMI 29 → hypothetical BMI 25 → re-run model → show estimated change.

Clearly label:
**Simulation / estimated change, not a medical guarantee.**

## 6. Health Score
Optional advanced feature based on documented methodology, potentially using:
- confirmed health parameters
- disease-risk outputs
- BMI
- lifestyle
- longitudinal trends
- data completeness

Never create an arbitrary score without documented formula, weights, normalization and limitations.

## 7. AI Health Copilot
Conversational layer for questions such as:
- “Why is my diabetes risk elevated?”
- “What changed in my last two reports?”
- “Explain this report in Marathi.”
- “Which values should I discuss with my doctor?”

Architecture:
**Question → Intent/Context → Verified Data + Model Results → Context Builder → LLM → Guardrails → Answer**

## 8. Emergency Assistance — Optional/Future
Potential:
- emergency assistance
- location sharing
- nearby hospitals
- ambulance availability
- ICU availability

Real-time ambulance/ICU information requires real APIs or hospital integrations. Never fabricate availability.

---

# PART B — CRITICAL ENGINEERING / VIVA QUESTIONS

## 1. How Will You Scale the System?
Production architecture:
**Client → CDN/Frontend → Load Balancer → Multiple Backend Instances → Queue/Workers → OCR/ML Services → MongoDB + Object Storage**

Use:
- horizontal backend scaling
- separately scalable ML service
- asynchronous OCR/ML workers
- database indexes/query optimization
- object storage for reports
- caching where appropriate

Do not claim this is already deployed unless it actually is.

## 2. How Is MedScan-NCD Different From Existing Systems?
Compare documented capabilities rather than unsupported claims.

Core workflow:
**Medical Report → OCR → Structured Health Data → Disease-specific calibrated risk estimation → Explainability → Longitudinal tracking → Patient-friendly AI explanation → Doctor decision support**

Compare dimensions such as:
- report digitization
- OCR
- structured extraction
- multi-disease prediction
- calibration
- explainability
- longitudinal history
- report comparison
- AI explanation
- doctor decision support

Clearly separate what existing systems provide, what MedScan-NCD implements, and what is future.

## 3. What If the Database Fails?
**Failure detected → controlled error handling → prevent incomplete/destructive writes → recovery/retry where safe → restore from backup/snapshot if needed → integrity verification → resume**

Never silently discard writes.

## 4. Database Backup / Snapshot Strategy
Production concept:
**Production DB → Automated Backup/Snapshot → Secure Retention**

Recovery:
**Failure → choose valid recovery point → restore → integrity verification → resume**

Also consider:
- backup frequency
- retention
- independent/off-site backup
- encryption
- access control
- restore testing
- point-in-time recovery where supported

## 5. RPO and RTO
**RPO:** maximum acceptable recent data loss.

**RTO:** maximum targeted service recovery time.

Only state exact project values if backed by actual infrastructure or an explicit production plan.

## 6. How Will You Prevent Data Loss?
- automated backups
- snapshots
- point-in-time recovery where supported
- retention
- restore testing
- validation before destructive operations
- transactions for critical multi-step operations
- audit logs
- least-privilege database access
- monitoring/alerts

## 7. How Will You Handle Database Blackout?
Temporary outage:
- detect failure
- controlled error
- safe retry
- avoid duplicate writes

Persistent failure:
- recovery/failover procedure
- restore if required
- integrity check

Catastrophic loss:
- restore valid snapshot/backup
- verify records
- reconcile critical data
- resume service

## 8. What If OCR Gives the Wrong Value?
**OCR → Extraction → Normalization → Validation → Human Review → Correction → Confirmation → Prediction**

Critical rule:
**Unconfirmed OCR data must not become trusted prediction input.**

`rawOcrText` remains immutable.

## 9. What If AI Hallucinates?
**Verified Data + ML Output + Approved Context → Context Builder → LLM → Guardrails/Validation → Explanation**

The LLM should explain known system data rather than independently invent medical facts.

## 10. How Is Patient Data Secured?
Discuss:
- authentication
- RBAC/ABAC
- relationship/scope checks
- password hashing
- HTTPS
- environment secrets
- database access control
- object-storage security
- input/file validation
- rate limiting
- security headers
- audit logs
- least privilege

## 11. How Do You Prevent Unauthorized Patient Access?
Doctor:
**Active assigned relationship → allow; otherwise deny**

CHO:
**Assigned catchment → allow; outside catchment → deny**

Admin:
**Platform management only; no automatic clinical access**

## 12. How Do You Prevent ML Data Leakage?
- target leakage audit
- feature compatibility analysis
- preprocessing inside CV folds
- train/test separation
- no test-set threshold tuning
- no test-set model selection
- independent held-out evaluation

## 13. How Do You Handle Class Imbalance?
Use/document:
- stratified split
- stratified CV
- class weighting where appropriate
- PR-AUC
- sensitivity/specificity
- precision
- F1
- ROC-AUC

Accuracy alone is insufficient for an imbalanced medical classifier.

## 14. Why Calibration?
Raw classifier probabilities are not automatically reliable probability estimates. Calibration helps align predicted probabilities more closely with observed frequencies on comparable data.

## 15. Why Threshold Selection?
Probability and category are different.

Example:
**23.1% ≥ 21% → Elevated model-estimated risk**

The engineering threshold is not automatically a clinical diagnostic cutoff.

## 16. Why Different Models for Different Diseases?
Diseases have different:
- targets
- relevant features
- datasets
- class balance
- feature distributions
- clinical context

Shared infrastructure can remain:
**OCR → normalization → validation → feature builder → ML API → calibration → XAI → storage**

## 17. Why Not Random Forest?
“Random Forest was evaluated as a benchmark. The final model was selected from the evaluated results and project requirements rather than algorithm popularity.”

Diabetes: LightGBM selected from evaluated results.

Heart Disease: Logistic Regression selected from evaluated results.

## 18. How Do You Know the System Is Working?
Monitor:
- application logs
- API errors
- latency
- OCR failures
- ML inference failures
- database failures
- health checks
- availability
- alerts

## 19. What If the ML Service Goes Down?
- detect failure
- mark prediction unavailable/failed
- show controlled message
- retry/reprocess safely
- never return a fake risk score

## 20. What If Cloudinary/Object Storage Is Down?
- fail upload safely
- do not save false URL
- mark upload failure
- offer retry
- never fabricate storage references

## 21. What If Two Users Update the Same Record?
For critical workflows:
- transactions
- optimistic concurrency/version checks where needed
- server-side authorization
- immutable/auditable history for sensitive changes

## 22. How Will You Handle Large OCR/ML Workloads?
Production:
**API → Queue → Background Worker → OCR → Extraction → ML → Storage → Notification**

This prevents long-running work from blocking normal API requests.

## 23. How Will You Reduce Database Load?
- correct indexes
- projections
- pagination
- avoid repeated queries
- caching where appropriate
- optimized aggregations
- connection pooling
- retention/archive strategy where appropriate

## 24. How Will You Version ML Models?
Store metadata:
- model name/version
- dataset/version
- feature schema
- preprocessing
- calibration
- threshold
- metrics
- training date
- artifact checksum where appropriate

Predictions should be traceable to the model version that generated them.

## 25. How Will You Handle Model Drift?
Monitor:
- input feature distributions
- missingness
- prediction distributions
- calibration/performance when labels become available

If drift appears:
**review → revalidate → recalibrate/retrain if justified → version → validate → controlled deployment**

Do not silently replace a model.

## 26. How Will You Add New Diseases Later?
Disease-specific modules:
- feature schema
- preprocessing
- model
- calibration
- threshold
- metadata
- XAI
- API

Shared:
- authentication
- OCR
- report processing
- normalization
- patient profile
- storage
- explanation layer

## 27. Critical Viva Answer Structure
For any high-level question:

1. **Current implementation** — what actually works?
2. **Technical mechanism** — how?
3. **Failure/edge case** — what if it breaks?
4. **Production strategy** — how would it scale/harden?
5. **Limitation** — what is not implemented or clinically validated?

This prevents overclaiming.

---

# PART C — FINAL ADVANCED PHASE ORDER

After UI/UX:

1. Scalability architecture
2. Existing-system comparison
3. Database failure handling
4. Backup + snapshots
5. RPO/RTO
6. Disaster recovery
7. Security hardening
8. OCR reliability
9. AI hallucination controls
10. ML robustness
11. Model/version management
12. Observability
13. Cloud/object-storage failure handling
14. Cost/scaling analysis
15. Final architecture review
16. Viva question bank
17. Final documentation

---

# FINAL PRINCIPLE

The strongest viva position is not:

> “Everything is already implemented.”

It is:

> “This is what we implemented, this is how it works, this is how we tested it, these are its limitations, and this is how we would scale and harden it for production.”

That distinction keeps the technical explanation credible.
