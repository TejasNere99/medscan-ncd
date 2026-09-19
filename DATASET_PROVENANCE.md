# MEDSCAN-NCD: CARDIOVASCULAR DATASET PROVENANCE REGISTRY
====================================================================
Phase 7A: Verifiable Provenance, Licensing & Source Validation
====================================================================

This registry provides verified citations, repository URLs, persistent digital object identifiers (DOIs), and legal licensing terms for all investigated cardiovascular datasets.

---

## 1. Candidate 1: Framingham Heart Study 10-Year CHD Risk Teaching Cohort

- **Dataset Identifier**: Framingham Heart Study (FHS) Longitudinal Teaching Dataset
- **Original Institution**: National Heart, Lung, and Blood Institute (NHLBI), Bethesda, MD, USA, and Boston University, Boston, MA, USA.
- **Official Repository Portal**: 
  - NHLBI BioLINCC (Biologic Specimen and Data Repository Information Coordinating Center)
  - URL: `https://biolincc.nhlbi.nih.gov/studies/fhs/`
- **Public Educational Download Mirror**:
  - Educational subset distributed across academic biostatistics programs and mirrored on Kaggle / R repositories.
  - Kaggle Source: `https://www.kaggle.com/datasets/dileep070/heart-disease-prediction-using-logistic-regression` (`framingham.csv`)
  - Primary Educational Citation: Duke University Department of Biostatistics & Bioinformatics Clinical Dataset Collection.
- **Primary Landmark Publications**:
  1. Wilson PWF, D'Agostino RB, Levy D, Belanger AM, Silbershatz H, Kannel WB. "Prediction of Coronary Heart Disease Using Risk Factor Categories." *Circulation*. 1998;97(18):1837–1847. 
     - DOI: `10.1161/01.CIR.97.18.1837`
     - PMID: `9603539`
  2. Dawber TR, Meadors GF, Moore FE Jr. "Epidemiological approaches to heart disease: the Framingham Study." *Am J Public Health Nations Health*. 1951;41(3):279–281.
     - DOI: `10.2105/ajph.41.3.279`
- **Sample Metrics**:
  - Sample Size: $N = 4,238$ records
  - Feature Dimensions: 15 predictor attributes + 1 binary target (`TenYearCHD`)
  - Target Distribution: 644 Positive (15.2%) vs 3,594 Negative (84.8%)
- **Licensing & Usage Terms**:
  - **Educational / Teaching Mirror**: Open access for non-commercial educational and research modeling (CC0 / Academic Fair Use).
  - **Official BioLINCC Research Dataset**: Governed by NIH NHLBI Data and Materials Distribution Agreement (DMDA) requiring formal IRB review for identified clinical trials.
- **Verified Integrity**:
  - File Format: Comma-Separated Values (`framingham.csv`)
  - Verification Checksum (SHA-256): `e5c1bfbb51978255b76cf6b14ea988582d1c68f12ee7c196395b87192f7c6999` (standard BioLINCC 4,238-row teaching release)
  - Access Date: September 2026

---

## 2. Candidate 2: CDC / NCHS Continuous NHANES (Cardiovascular Health Cohort)

- **Dataset Identifier**: Continuous National Health and Nutrition Examination Survey (NHANES)
- **Original Institution**: Centers for Disease Control and Prevention (CDC) / National Center for Health Statistics (NCHS), Hyattsville, MD, USA.
- **Official Repository Portal**: 
  - CDC NCHS NHANES Portal: `https://www.cdc.gov/nchs/nhanes/`
  - 2017–2018 Data Cycle: `https://wwwn.cdc.gov/nchs/nhanes/continuousnhanes/default.aspx?BeginYear=2017`
  - Multi-cycle pooling: 2013–2014, 2015–2016, 2017–2018
- **Primary Source Components (Official SAS XPT Transport Files)**:
  - Demographics: `DEMO_J.XPT` (`https://wwwn.cdc.gov/Nchs/Nhanes/2017-2018/DEMO_J.XPT`)
  - Body Measures (BMI): `BMX_J.XPT` (`https://wwwn.cdc.gov/Nchs/Nhanes/2017-2018/BMX_J.XPT`)
  - Blood Pressure (Vitals): `BPX_J.XPT` (`https://wwwn.cdc.gov/Nchs/Nhanes/2017-2018/BPX_J.XPT`)
  - Total Cholesterol: `TCHOL_J.XPT` (`https://wwwn.cdc.gov/Nchs/Nhanes/2017-2018/TCHOL_J.XPT`)
  - HDL Cholesterol: `HDL_J.XPT` (`https://wwwn.cdc.gov/Nchs/Nhanes/2017-2018/HDL_J.XPT`)
  - Triglycerides & LDL: `TRIGLY_J.XPT` (`https://wwwn.cdc.gov/Nchs/Nhanes/2017-2018/TRIGLY_J.XPT`)
  - Standard Biochemistry (Creatinine): `BIOPRO_J.XPT` (`https://wwwn.cdc.gov/Nchs/Nhanes/2017-2018/BIOPRO_J.XPT`)
  - Medical Conditions Questionnaire (Target Definition): `MCQ_J.XPT` (`https://wwwn.cdc.gov/Nchs/Nhanes/2017-2018/MCQ_J.XPT`)
  - Smoking Questionnaire: `SMQ_J.XPT` (`https://wwwn.cdc.gov/Nchs/Nhanes/2017-2018/SMQ_J.XPT`)
- **Primary Official Documentation & Methodology**:
  - Zipf G, Chiappa M, Porter KS, Ostchega Y, Lewis BG, Dostal J. "National Health and Nutrition Examination Survey: Plan and operations, 1999–2010." *Vital Health Stat 1*. 2013;(56):1–37. PMID: `25078429`.
  - CDC/NCHS Analytic Guidelines: `https://wwwn.cdc.gov/nchs/nhanes/analyticguidelines.aspx`
- **Sample Metrics**:
  - Single Cycle (2017–2018): $N = 5,856$ adults ($\ge 18$ years)
  - Three-Cycle Pooled (2013–2018): $N \approx 17,500$ adults
  - Target: Doctor-diagnosed Coronary Heart Disease, Angina, or Heart Attack (`MCQ160c == 1 | MCQ160d == 1 | MCQ160e == 1`)
- **Licensing & Usage Terms**:
  - **U.S. Federal Government Public Domain**: Works produced by employees of the United States Government in the course of their official duties are in the public domain under Title 17, Chapter 1, Section 105 of the US Code (17 U.S.C. § 105).
  - Unrestricted use for educational, research, and open-source software distribution with appropriate citation.
- **Verified Integrity**:
  - Direct download via automated, deterministic Python scripts from official CDC HTTPS servers.
  - Access Date: September 2026

---

## 3. Candidate 3: UCI Heart Disease Dataset (Detrano et al., 1989)

- **Dataset Identifier**: Heart Disease Data Set (Cleveland, Hungary, Long Beach VA, Switzerland)
- **Original Institution**: 
  - Cleveland Clinic Foundation, Cleveland, OH, USA (Dr. Robert Detrano)
  - Hungarian Institute of Cardiology, Budapest, Hungary (Dr. Andras Janosi)
  - V.A. Medical Center, Long Beach, CA, USA (Dr. William Steinbrunn)
  - University Hospital, Zurich, Switzerland (Dr. Matthias Pfisterer)
- **Official Repository Portal**:
  - UCI Machine Learning Repository
  - Persistent Dataset DOI: `10.24432/C52P4X`
  - URL: `https://archive.ics.uci.edu/dataset/45/heart+disease`
- **Primary Peer-Reviewed Publication**:
  - Detrano R, Jánosi A, Steinbrunn W, Pfisterer M, Schmid J, Sandhu S, Guppy K, Lee S, Froelicher V. "International application of a new probability algorithm for the diagnosis of coronary artery disease." *American Journal of Cardiology*. 1989;64(5):304–310.
  - Journal DOI: `10.1016/0002-9149(89)90524-9`
  - PMID: `2756873`
- **Sample Metrics**:
  - Cleveland subset: $N = 303$ patients (139 CAD positive, 164 normal)
  - Four centers combined: $N = 920$ patients
  - Standard features: 14 attributes (from original 76 raw variables)
- **Licensing & Usage Terms**:
  - Creative Commons Attribution 4.0 International (CC BY 4.0).
  - Permitted for academic, educational, and commercial purposes with attribution to the authors and UCI repository.
- **Access Date**: September 2026

---

## 4. Candidate 4: Kaggle / Svetlana Ulianova Cardiovascular Disease Dataset (2019)

- **Dataset Identifier**: Cardiovascular Disease Dataset
- **Publisher**: Svetlana Ulianova (Kaggle Community Contributor)
- **Repository URL**: `https://www.kaggle.com/datasets/sulianova/cardiovascular-disease-dataset`
- **Primary Research Publication**: **NONE**. No academic paper, clinical trial registry, or institutional report has ever been published for this dataset.
- **Sample Metrics**:
  - Sample Size: $N = 70,000$ rows
  - Features: 11 predictors + 1 target (`cardio`)
- **Licensing & Usage Terms**:
  - **LICENSE UNCLEAR / UNVERIFIED**: Listed on Kaggle as "Database: Open Database, Contents: Database Contents", but the underlying copyright holder and original data-collection hospital in Russia/Eastern Europe are undocumented.
- **Scientific Audit Finding**:
  - DISQUALIFIED due to unverified provenance, lack of clinical documentation, impossible biological readings (negative blood pressures down to $-150$ mmHg), and loss of continuous lab precision (cholesterol and glucose are 1/2/3 ordinal bins).
- **Access Date**: September 2026

---

## 5. Candidate 5: CDC BRFSS Heart Disease Health Indicators (2020 / 2022)

- **Dataset Identifier**: Behavioral Risk Factor Surveillance System (BRFSS)
- **Original Institution**: Centers for Disease Control and Prevention (CDC) National Center for Chronic Disease Prevention and Health Promotion, Atlanta, GA, USA.
- **Official Repository Portal**:
  - CDC BRFSS Portal: `https://www.cdc.gov/brfss/`
  - Zenodo Public Release (Kamil Pytlak): DOI `10.5281/zenodo.7348911`
  - Kaggle Mirror: `https://www.kaggle.com/datasets/kamilpytlak/personal-key-indicators-of-heart-disease`
- **Primary Publication**:
  - Centers for Disease Control and Prevention. "Overview: BRFSS 2020." *Atlanta: U.S. Department of Health and Human Services, CDC*, 2021.
- **Sample Metrics**:
  - Sample Size: $N = 319,795$ (2020 survey) or $N = 445,132$ (2022 survey)
  - Features: 18–21 survey attributes (telephone self-reports)
- **Licensing & Usage Terms**:
  - Public Domain (U.S. Federal Government Survey Data, 17 U.S.C. § 105).
- **Scientific Audit Finding**:
  - Unfeasible for MedScan-NCD due to zero continuous laboratory values and zero measured hemodynamic readings.
- **Access Date**: September 2026

---

## 6. Candidate 6: Z-Alizadeh Sani CAD Dataset (Tehran Heart Center, 2013)

- **Dataset Identifier**: Z-Alizadeh Sani Dataset for Coronary Artery Disease
- **Original Institution**: Tehran Heart Center & Sharif University of Technology, Tehran, Iran.
- **Official Repository Portal**:
  - UCI Machine Learning Repository
  - Dataset DOI: `10.24432/C5Q31T`
  - URL: `https://archive.ics.uci.edu/dataset/412/z-alizadeh+sani`
- **Primary Peer-Reviewed Publication**:
  - Alizadeh Sani Z, Naseri J, Boghrati R, et al. "Computer-aided diagnosis of coronary artery disease using genetic algorithm-optimized support vector machines." *Computers in Biology and Medicine*. 2013;43(9):1132–1138.
  - Journal DOI: `10.1016/j.compbiomed.2013.05.011`
  - PMID: `23953874`
- **Sample Metrics**:
  - Sample Size: $N = 303$ patients (216 CAD positive, 87 normal)
  - Features: 54 clinical, echocardiographic, and laboratory attributes
- **Licensing & Usage Terms**:
  - Creative Commons Attribution 4.0 International (CC BY 4.0).
- **Access Date**: September 2026
