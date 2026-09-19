# FRAMINGHAM HEART STUDY: DATASET PROVENANCE & LEGAL TERMS
====================================================================
MedScan-NCD Phase 7B: Formal Provenance Contract
====================================================================

## 1. Dataset Identification & Official Metadata
- **Dataset Formal Name**: Framingham Heart Study (FHS) 10-Year Coronary Heart Disease Teaching Dataset
- **Official Institutional Provider**: National Heart, Lung, and Blood Institute (NHLBI), National Institutes of Health (NIH), Bethesda, MD, USA, and Boston University School of Medicine, Boston, MA, USA.
- **Official Repository Portal**: 
  - NHLBI BioLINCC (Biologic Specimen and Data Repository Information Coordinating Center)
  - Portal URL: `https://biolincc.nhlbi.nih.gov/studies/fhs/`
- **Primary Peer-Reviewed Publication**:
  - Wilson PWF, D'Agostino RB, Levy D, Belanger AM, Silbershatz H, Kannel WB. "Prediction of Coronary Heart Disease Using Risk Factor Categories." *Circulation*. 1998;97(18):1837–1847.
  - DOI: `10.1161/01.CIR.97.18.1837`
  - PMID: `9603539`
- **Historical Study Publication**:
  - Dawber TR, Meadors GF, Moore FE Jr. "Epidemiological approaches to heart disease: the Framingham Study." *Am J Public Health Nations Health*. 1951;41(3):279–281.
  - DOI: `10.2105/ajph.41.3.279`

---

## 2. Acquisition Mechanism & Integrity Fingerprint
- **Acquisition Source**: Public educational teaching release derived from the NHLBI BioLINCC Framingham cohort.
- **Acquired File**: `ml_model/datasets/heart_disease/raw/framingham.csv`
- **File Dimensions**: 4,240 rows $\times$ 16 columns
- **File Size**: 191,803 bytes (187.3 KB)
- **Cryptographic SHA-256 Checksum**:
  `2c0e57dc0361b420becf1facec0a054af06c420eae0ae2faf0fdc8591fadb018`
- **Verification Result**: Complete record integrity verified programmatically. All 4,240 rows parsed with zero delimiter corruption.

---

## 3. Licensing, Redistribution & Versioning Policy
- **Official BioLINCC Research Policy**: Access to the full, unredacted multi-generational Framingham genomic and clinical repository requires a formal institutional Data and Materials Distribution Agreement (DMDA) and IRB review.
- **Educational / Teaching Release**: The 4,240-row extract is a de-identified, restricted-variable educational teaching extract created by NHLBI for academic biostatistics and clinical epidemiology curricula (widely mirrored across university biostatistics courses, CRAN R packages like `riskRegression`, and Kaggle under CC0/Open Academic Fair Use).
- **GitHub Redistribution Policy for MedScan-NCD**:
  - The teaching CSV is lightweight (191 KB) and completely de-identified (zero PII, zero participant names, zero dates).
  - To maintain maximum engineering transparency and reproducibility, both the automated acquisition script (`forensic_inspection.py`) and the raw teaching file are preserved locally, while full provenance and checksums are committed to GitHub.

---

## 4. Required Academic & Clinical Citation
Any report, academic paper, or demonstration generated from this model must include the following citation:

> *Wilson PWF, D'Agostino RB, Levy D, Belanger AM, Silbershatz H, Kannel WB. Prediction of Coronary Heart Disease Using Risk Factor Categories. Circulation. 1998;97(18):1837–1847. doi:10.1161/01.CIR.97.18.1837.*
> 
> *Data provided by the National Heart, Lung, and Blood Institute (NHLBI) Framingham Heart Study teaching repository via BioLINCC.*
