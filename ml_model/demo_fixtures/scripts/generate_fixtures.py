"""
MedScan-NCD Synthetic Medical Demo Fixtures Generator
=====================================================
Generates:
1. Three synthetic patient scenarios (Patient A, Patient B, Patient C)
2. Professional PDF medical reports with ReportLab
3. High-resolution PNG image version for OCR testing
4. Edge-case test fixtures (Cases C, D, E, F)
5. Structured JSON fixtures (patient profile, report metadata, expected extraction, canonical mapping)
6. SHA-256 file manifest
Strict Safety:
All data is fictional and labeled "SYNTHETIC — FOR DEMONSTRATION ONLY".
"""

import os
import json
import hashlib
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = Path(__file__).resolve().parent.parent
PATIENT_A_DIR = BASE_DIR / "patient_a_lower_risk"
PATIENT_B_DIR = BASE_DIR / "patient_b_elevated_glucose"
PATIENT_C_DIR = BASE_DIR / "patient_c_renal"
EDGE_CASES_DIR = BASE_DIR / "edge_cases"

for d in [PATIENT_A_DIR, PATIENT_B_DIR, PATIENT_C_DIR, EDGE_CASES_DIR]:
    d.mkdir(parents=True, exist_ok=True)

styles = getSampleStyleSheet()

def build_pdf_report(filename, title, patient_name, patient_id, age, gender, date, status, items, notes=None):
    doc = SimpleDocTemplate(str(filename), pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    elements = []

    # 1. Prominent Synthetic Banner
    banner_style = ParagraphStyle(
        'BannerStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#DC2626'),
        alignment=1,
        spaceAfter=4
    )
    elements.append(Paragraph("SYNTHETIC — FOR DEMONSTRATION ONLY", banner_style))
    elements.append(Paragraph(
        "Fictional medical record generated strictly for software testing and faculty demonstration of MedScan-NCD. Not for clinical diagnosis.",
        ParagraphStyle('SubBanner', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=8, leading=11, textColor=colors.HexColor('#4B5563'), alignment=1, spaceAfter=14)
    ))

    # 2. Report Title
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=colors.HexColor('#1E3A8A'),
        alignment=0,
        spaceAfter=8
    )
    elements.append(Paragraph(title, title_style))

    # 3. Patient Context Box
    demographics = [
        [Paragraph(f"<b>Patient Name:</b> {patient_name}", styles['Normal']), Paragraph(f"<b>Patient ID:</b> {patient_id}", styles['Normal'])],
        [Paragraph(f"<b>Age:</b> {age} Years", styles['Normal']), Paragraph(f"<b>Gender:</b> {gender}", styles['Normal'])],
        [Paragraph(f"<b>Report Date:</b> {date}", styles['Normal']), Paragraph(f"<b>Status:</b> {status}", styles['Normal'])],
    ]
    demo_table = Table(demographics, colWidths=[270, 270])
    demo_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F9FAFB')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#D1D5DB')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(demo_table)
    elements.append(Spacer(1, 14))

    # 4. Biomarkers Table
    table_data = [
        [Paragraph("<b>Investigation / Parameter</b>", styles['Normal']), Paragraph("<b>Observed Result</b>", styles['Normal']), Paragraph("<b>Standard Unit</b>", styles['Normal']), Paragraph("<b>Illustrative Reference Range</b>", styles['Normal'])],
    ]
    for param, res, unit, ref in items:
        table_data.append([
            Paragraph(param, styles['Normal']),
            Paragraph(str(res), styles['Normal']),
            Paragraph(unit, styles['Normal']),
            Paragraph(ref, styles['Normal'])
        ])

    res_table = Table(table_data, colWidths=[180, 110, 100, 150])
    res_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#E5E7EB')),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#D1D5DB')),
        ('TOPPADDING', (0,1), (-1,-1), 4),
        ('BOTTOMPADDING', (0,1), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(res_table)
    elements.append(Spacer(1, 14))

    # 5. Notes & Disclaimer
    elements.append(Paragraph("<b>Demonstration Notes & Disclaimers:</b>", ParagraphStyle('NoteHeader', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, textColor=colors.HexColor('#374151'))))
    disclaimer_text = (
        "1. All measurements are synthetic and created for algorithmic testing of MedScan-NCD.<br/>"
        "2. Reference ranges are illustrative and provided for software demonstration only.<br/>"
        "3. Processed strictly locally without transmission of clinical data to unauthorized endpoints."
    )
    if notes:
        disclaimer_text += f"<br/>4. <b>Scenario Note:</b> {notes}"
    elements.append(Paragraph(disclaimer_text, ParagraphStyle('NoteBody', parent=styles['Normal'], fontName='Helvetica', fontSize=8, leading=11, textColor=colors.HexColor('#6B7280'), spaceAfter=8)))

    doc.build(elements)
    print(f"Generated PDF: {filename}")


def build_image_report(filename, title, patient_name, patient_id, age, gender, date, items):
    img = Image.new("RGB", (1200, 1600), color="white")
    draw = ImageDraw.Draw(img)

    try:
        title_font = ImageFont.truetype("arial.ttf", 34)
        bold_font = ImageFont.truetype("arial.ttf", 22)
        regular_font = ImageFont.truetype("arial.ttf", 20)
        disclaimer_font = ImageFont.truetype("arial.ttf", 18)
    except Exception:
        title_font = ImageFont.load_default()
        bold_font = ImageFont.load_default()
        regular_font = ImageFont.load_default()
        disclaimer_font = ImageFont.load_default()

    # Red disclaimer banner
    draw.rectangle([(50, 40), (1150, 110)], fill="#FEE2E2", outline="#DC2626", width=2)
    draw.text((600, 60), "SYNTHETIC — FOR DEMONSTRATION ONLY", fill="#DC2626", font=bold_font, anchor="mm")
    draw.text((600, 90), "Fictional data generated for testing. Not a genuine clinical record.", fill="#4B5563", font=disclaimer_font, anchor="mm")

    # Header
    draw.text((60, 140), title.upper(), fill="#1E3A8A", font=title_font)
    draw.line([(60, 190), (1140, 190)], fill="#9CA3AF", width=2)

    # Patient Details Box
    draw.rectangle([(60, 210), (1140, 310)], fill="#F9FAFB", outline="#D1D5DB", width=1)
    draw.text((80, 230), f"Patient Name: {patient_name}", fill="#111827", font=bold_font)
    draw.text((650, 230), f"Patient ID: {patient_id}", fill="#111827", font=bold_font)
    draw.text((80, 270), f"Age: {age} Years", fill="#111827", font=bold_font)
    draw.text((400, 270), f"Sex: {gender}", fill="#111827", font=bold_font)
    draw.text((650, 270), f"Date: {date}", fill="#111827", font=bold_font)

    # Table Header
    y = 360
    draw.rectangle([(60, y), (1140, y + 45)], fill="#E5E7EB")
    draw.text((80, y + 12), "Investigation / Parameter", fill="#111827", font=bold_font)
    draw.text((550, y + 12), "Observed Result", fill="#111827", font=bold_font)
    draw.text((800, y + 12), "Standard Unit", fill="#111827", font=bold_font)
    draw.text((980, y + 12), "Ref. Range", fill="#111827", font=bold_font)
    draw.line([(60, y + 45), (1140, y + 45)], fill="#9CA3AF", width=1)

    curr_y = y + 50
    for param, res, unit, ref in items:
        draw.text((80, curr_y + 12), param, fill="#1F2937", font=regular_font)
        draw.text((550, curr_y + 12), str(res), fill="#111827", font=bold_font)
        draw.text((800, curr_y + 12), unit, fill="#4B5563", font=regular_font)
        draw.text((980, curr_y + 12), ref, fill="#6B7280", font=regular_font)
        curr_y += 50
        draw.line([(60, curr_y), (1140, curr_y)], fill="#E5E7EB", width=1)

    # Footer note
    draw.text((60, curr_y + 40), "SYNTHETIC DEMONSTRATION RECORD — NOT FOR CLINICAL USE", fill="#DC2626", font=bold_font)
    draw.text((60, curr_y + 75), "Generated specifically for MedScan-NCD faculty evaluation and automated OCR pipeline testing.", fill="#4B5563", font=regular_font)

    img.save(filename, quality=95)
    print(f"Generated PNG: {filename}")


def generate_all():
    # =========================================================================
    # PATIENT A — Lower-Risk Demonstration Profile
    # =========================================================================
    p_a_items_1 = [
        ("Fasting Blood Sugar", "88", "mg/dL", "70.0 - 99.0"),
        ("Blood Pressure", "116/76", "mmHg", "< 120 / < 80"),
        ("Total Cholesterol", "165", "mg/dL", "< 200.0"),
        ("HDL Cholesterol", "58", "mg/dL", "> 40.0"),
        ("Serum Creatinine", "0.80", "mg/dL", "0.60 - 1.20"),
        ("Blood Urea", "24", "mg/dL", "15.0 - 45.0"),
        ("Hemoglobin", "14.2", "g/dL", "13.0 - 17.0"),
        ("Body Mass Index", "22.4", "kg/m2", "18.5 - 24.9"),
        ("Heart Rate", "72", "BPM", "60 - 100"),
    ]
    build_pdf_report(
        PATIENT_A_DIR / "report_1_baseline.pdf",
        "Comprehensive Laboratory Examination Report (Baseline)",
        "Aarav Sharma", "SYN-PAT-001", 28, "Male", "15-Jan-2026", "Completed",
        p_a_items_1,
        "Baseline evaluation report for lower-risk demonstration and longitudinal trend origin."
    )

    p_a_items_2 = [
        ("Fasting Blood Sugar", "90", "mg/dL", "70.0 - 99.0"),
        ("Blood Pressure", "114/74", "mmHg", "< 120 / < 80"),
        ("Total Cholesterol", "160", "mg/dL", "< 200.0"),
        ("HDL Cholesterol", "60", "mg/dL", "> 40.0"),
        ("Serum Creatinine", "0.82", "mg/dL", "0.60 - 1.20"),
        ("Blood Urea", "22", "mg/dL", "15.0 - 45.0"),
        ("Hemoglobin", "14.4", "g/dL", "13.0 - 17.0"),
        ("Body Mass Index", "22.1", "kg/m2", "18.5 - 24.9"),
        ("Heart Rate", "70", "BPM", "60 - 100"),
    ]
    build_pdf_report(
        PATIENT_A_DIR / "report_2_followup.pdf",
        "Comprehensive Laboratory Examination Report (Follow-up)",
        "Aarav Sharma", "SYN-PAT-001", 28, "Male", "20-Jun-2026", "Completed",
        p_a_items_2,
        "Sequential 6-month follow-up evaluation. Unlocks automated report comparison and delta tracking."
    )

    # Patient A Profile JSON
    with open(PATIENT_A_DIR / "patient_profile.json", "w") as f:
        json.dump({
            "disclaimer": "SYNTHETIC — FOR DEMONSTRATION ONLY",
            "patientId": "SYN-PAT-001",
            "name": "Aarav Sharma",
            "email": "synthetic.patient.a@example.com",
            "role": "Patient",
            "age": 28,
            "gender": "Male",
            "sexEncoded": 1,
            "isCurrentSmoker": False,
            "village": "Demo Community Central",
            "assignedDoctor": "Dr. Demo Clinician",
            "medicalHistory": ["Synthetic baseline profile for software demonstration."],
            "scenario": "Patient A — Lower-Risk Demonstration Profile",
            "expectedOutcomes": {
                "diabetes": "LOWER_MODEL_ESTIMATED_RISK",
                "heartDisease": "LOWER_MODEL_ESTIMATED_RISK",
                "hypertension": "NEGATIVE_CLASSIFICATION_ESTIMATE",
                "ckd": "NEGATIVE_CLASSIFICATION_ESTIMATE"
            }
        }, f, indent=2)

    # Patient A Report Metadata
    with open(PATIENT_A_DIR / "report_metadata.json", "w") as f:
        json.dump({
            "disclaimer": "SYNTHETIC — FOR DEMONSTRATION ONLY",
            "scenario": "Patient A Lower-Risk Sequential Reports",
            "reports": [
                {
                    "reportId": "SYN-REP-A-001",
                    "filename": "report_1_baseline.pdf",
                    "title": "Comprehensive Laboratory Examination Report (Baseline)",
                    "uploadDate": "2026-01-15T09:00:00.000Z",
                    "reportType": "General Laboratory Report",
                    "documentType": "general_lab_report",
                    "status": "CONFIRMED"
                },
                {
                    "reportId": "SYN-REP-A-002",
                    "filename": "report_2_followup.pdf",
                    "title": "Comprehensive Laboratory Examination Report (Follow-up)",
                    "uploadDate": "2026-06-20T10:30:00.000Z",
                    "reportType": "General Laboratory Report",
                    "documentType": "general_lab_report",
                    "status": "CONFIRMED"
                }
            ]
        }, f, indent=2)

    # Expected Extraction Report 1
    with open(PATIENT_A_DIR / "expected_extraction_1.json", "w") as f:
        json.dump({
            "disclaimer": "SYNTHETIC — FOR DEMONSTRATION ONLY",
            "patientContext": {"age": 28, "ageUnit": "years", "sex": "male"},
            "canonicalVitals": {
                "fastingSugar": 88,
                "systolicBP": 116,
                "diastolicBP": 76,
                "totalCholesterol": 165,
                "serumCreatinine": 0.8,
                "bloodUrea": 24,
                "hemoglobin": 14.2,
                "bmi": 22.4,
                "heartRate": 72
            },
            "overallConfidence": 0.99
        }, f, indent=2)

    # Expected Extraction Report 2
    with open(PATIENT_A_DIR / "expected_extraction_2.json", "w") as f:
        json.dump({
            "disclaimer": "SYNTHETIC — FOR DEMONSTRATION ONLY",
            "patientContext": {"age": 28, "ageUnit": "years", "sex": "male"},
            "canonicalVitals": {
                "fastingSugar": 90,
                "systolicBP": 114,
                "diastolicBP": 74,
                "totalCholesterol": 160,
                "serumCreatinine": 0.82,
                "bloodUrea": 22,
                "hemoglobin": 14.4,
                "bmi": 22.1,
                "heartRate": 70
            },
            "overallConfidence": 0.99
        }, f, indent=2)

    # Expected Canonical Feature Mapping
    with open(PATIENT_A_DIR / "expected_canonical_mapping.json", "w") as f:
        json.dump({
            "disclaimer": "SYNTHETIC — FOR DEMONSTRATION ONLY",
            "diseaseFeatureVectors": {
                "diabetes": {
                    "age": 28.0, "sex": 1, "bmi": 22.4, "systolic_bp": 116.0, "diastolic_bp": 76.0,
                    "total_cholesterol": 165.0, "hdl": 58.0, "creatinine": 0.8
                },
                "heartDisease": {
                    "age": 28.0, "sex": 1, "totChol": 165.0, "sysBP": 116.0, "diaBP": 76.0,
                    "BMI": 22.4, "glucose": 88.0, "currentSmoker": 0
                },
                "hypertension": {
                    "age": 28.0, "sex": 1, "bmi": 22.4, "fasting_glucose": 88.0,
                    "total_cholesterol": 165.0, "hdl": 58.0, "serum_creatinine": 0.8,
                    "heart_rate": 72.0, "current_smoker": 0
                },
                "chronicKidneyDisease": {
                    "age": 28.0, "serum_creatinine": 0.8
                }
            }
        }, f, indent=2)

    # Comparison Expectations
    with open(PATIENT_A_DIR / "comparison_expectations.json", "w") as f:
        json.dump({
            "disclaimer": "SYNTHETIC — FOR DEMONSTRATION ONLY",
            "baselineDate": "2026-01-15T09:00:00.000Z",
            "followupDate": "2026-06-20T10:30:00.000Z",
            "deltas": {
                "fastingSugar": {"baseline": 88, "followup": 90, "delta": "+2 mg/dL"},
                "systolicBP": {"baseline": 116, "followup": 114, "delta": "-2 mmHg"},
                "diastolicBP": {"baseline": 76, "followup": 74, "delta": "-2 mmHg"},
                "totalCholesterol": {"baseline": 165, "followup": 160, "delta": "-5 mg/dL"},
                "hdl": {"baseline": 58, "followup": 60, "delta": "+2 mg/dL"},
                "serumCreatinine": {"baseline": 0.80, "followup": 0.82, "delta": "+0.02 mg/dL"},
                "bloodUrea": {"baseline": 24, "followup": 22, "delta": "-2 mg/dL"},
                "bmi": {"baseline": 22.4, "followup": 22.1, "delta": "-0.3 kg/m2"}
            },
            "clinicalNote": "Observed deltas are synthetic demonstration values illustrating chronological tracking. Not clinical evidence of treatment efficacy."
        }, f, indent=2)

    # README
    with open(PATIENT_A_DIR / "README.md", "w") as f:
        f.write("""# Patient A — Lower-Risk Demonstration Profile

**SYNTHETIC — FOR DEMONSTRATION ONLY**

## Scenario Overview
Patient A (`Aarav Sharma`, Age 28, Male, Non-smoker) demonstrates a healthy baseline metabolic and cardiovascular profile.
This scenario includes two sequential reports (Baseline: Jan 15, 2026; Follow-up: Jun 20, 2026) to demonstrate:
1. Clean digital PDF upload and OCR extraction.
2. Human-in-the-loop review and confirmation into the patient health profile.
3. Multi-model inference across all 4 disease engines.
4. Report comparison and longitudinal delta tracking on the Patient Dashboard.

## Files
- `report_1_baseline.pdf`: Baseline laboratory report.
- `report_2_followup.pdf`: 6-month follow-up laboratory report.
- `patient_profile.json`: Fictional patient demographics and baseline information.
- `report_metadata.json`: Chronological report metadata.
- `expected_extraction_1.json`: Expected OCR parser outputs for Report 1.
- `expected_extraction_2.json`: Expected OCR parser outputs for Report 2.
- `expected_canonical_mapping.json`: Canonical feature vectors for all four models.
- `comparison_expectations.json`: Expected longitudinal differences between Report 1 and Report 2.
""")

    # =========================================================================
    # PATIENT B — Elevated Glucose / Cardiometabolic Profile
    # =========================================================================
    p_b_items = [
        ("Fasting Blood Sugar", "145", "mg/dL", "70.0 - 99.0"),
        ("Blood Pressure", "138/86", "mmHg", "< 120 / < 80"),
        ("Total Cholesterol", "240", "mg/dL", "< 200.0"),
        ("HDL Cholesterol", "36", "mg/dL", "> 40.0"),
        ("Serum Creatinine", "1.10", "mg/dL", "0.60 - 1.20"),
        ("Blood Urea", "32", "mg/dL", "15.0 - 45.0"),
        ("Hemoglobin", "13.2", "g/dL", "13.0 - 17.0"),
        ("Body Mass Index", "31.0", "kg/m2", "18.5 - 24.9"),
        ("Heart Rate", "82", "BPM", "60 - 100"),
    ]
    build_pdf_report(
        PATIENT_B_DIR / "report_elevated_glucose.pdf",
        "Comprehensive Metabolic & Lipid Panel",
        "Rajesh Patel", "SYN-PAT-002", 54, "Male", "10-Oct-2026", "Completed",
        p_b_items,
        "Elevated fasting glucose (145 mg/dL), BMI (31.0 kg/m2), total cholesterol (240 mg/dL), and smoking history."
    )
    build_image_report(
        PATIENT_B_DIR / "report_elevated_glucose.png",
        "Comprehensive Metabolic & Lipid Panel",
        "Rajesh Patel", "SYN-PAT-002", 54, "Male", "10-Oct-2026",
        p_b_items
    )

    with open(PATIENT_B_DIR / "patient_profile.json", "w") as f:
        json.dump({
            "disclaimer": "SYNTHETIC — FOR DEMONSTRATION ONLY",
            "patientId": "SYN-PAT-002",
            "name": "Rajesh Patel",
            "email": "synthetic.patient.b@example.com",
            "role": "Patient",
            "age": 54,
            "gender": "Male",
            "sexEncoded": 1,
            "isCurrentSmoker": True,
            "village": "Demo Community South",
            "assignedDoctor": "Dr. Demo Clinician",
            "medicalHistory": ["Synthetic cardiometabolic profile for software demonstration."],
            "scenario": "Patient B — Elevated Glucose / Cardiometabolic Profile",
            "expectedOutcomes": {
                "diabetes": "ELEVATED_MODEL_ESTIMATED_RISK",
                "heartDisease": "ELEVATED_MODEL_ESTIMATED_RISK",
                "hypertension": "POSITIVE_CLASSIFICATION_ESTIMATE",
                "ckd": "NEGATIVE_CLASSIFICATION_ESTIMATE"
            }
        }, f, indent=2)

    with open(PATIENT_B_DIR / "report_metadata.json", "w") as f:
        json.dump({
            "disclaimer": "SYNTHETIC — FOR DEMONSTRATION ONLY",
            "scenario": "Patient B Elevated Cardiometabolic Report",
            "reportId": "SYN-REP-B-001",
            "pdfFilename": "report_elevated_glucose.pdf",
            "imageFilename": "report_elevated_glucose.png",
            "title": "Comprehensive Metabolic & Lipid Panel",
            "uploadDate": "2026-10-10T11:15:00.000Z",
            "reportType": "General Laboratory Report",
            "documentType": "general_lab_report",
            "status": "CONFIRMED"
        }, f, indent=2)

    with open(PATIENT_B_DIR / "expected_extraction.json", "w") as f:
        json.dump({
            "disclaimer": "SYNTHETIC — FOR DEMONSTRATION ONLY",
            "patientContext": {"age": 54, "ageUnit": "years", "sex": "male"},
            "canonicalVitals": {
                "fastingSugar": 145,
                "systolicBP": 138,
                "diastolicBP": 86,
                "totalCholesterol": 240,
                "serumCreatinine": 1.1,
                "bloodUrea": 32,
                "hemoglobin": 13.2,
                "bmi": 31.0,
                "heartRate": 82
            },
            "overallConfidence": 0.99
        }, f, indent=2)

    with open(PATIENT_B_DIR / "expected_canonical_mapping.json", "w") as f:
        json.dump({
            "disclaimer": "SYNTHETIC — FOR DEMONSTRATION ONLY",
            "diseaseFeatureVectors": {
                "diabetes": {
                    "age": 54.0, "sex": 1, "bmi": 31.0, "systolic_bp": 138.0, "diastolic_bp": 86.0,
                    "total_cholesterol": 240.0, "hdl": 36.0, "creatinine": 1.10
                },
                "heartDisease": {
                    "age": 54.0, "sex": 1, "totChol": 240.0, "sysBP": 138.0, "diaBP": 86.0,
                    "BMI": 31.0, "glucose": 145.0, "currentSmoker": 1
                },
                "hypertension": {
                    "age": 54.0, "sex": 1, "bmi": 31.0, "fasting_glucose": 145.0,
                    "total_cholesterol": 240.0, "hdl": 36.0, "serum_creatinine": 1.10,
                    "heart_rate": 82.0, "current_smoker": 1
                },
                "chronicKidneyDisease": {
                    "age": 54.0, "serum_creatinine": 1.10
                }
            }
        }, f, indent=2)

    with open(PATIENT_B_DIR / "README.md", "w") as f:
        f.write("""# Patient B — Elevated Glucose / Cardiometabolic Profile

**SYNTHETIC — FOR DEMONSTRATION ONLY**

## Scenario Overview
Patient B (`Rajesh Patel`, Age 54, Male, Current Smoker) demonstrates elevated cardiometabolic laboratory measurements:
- Fasting Glucose: 145 mg/dL
- Total Cholesterol: 240 mg/dL (HDL: 36 mg/dL)
- Blood Pressure: 138/86 mmHg
- BMI: 31.0 kg/m²
- Serum Creatinine: 1.10 mg/dL (Normal renal function)

## Key Learning Points for Evaluators
1. Dual file format testing: Available as both selectable digital PDF (`report_elevated_glucose.pdf`) and optical PNG (`report_elevated_glucose.png`).
2. Differential disease risk: Triggers elevated risk estimates for Diabetes (0.2968 vs threshold 0.210), Heart Disease (0.3353 vs threshold 0.110), and Hypertension (0.5699 vs threshold 0.3307), but negative classification estimate for CKD (0.2931 vs threshold 0.9672) because renal function is preserved.
3. Model-estimated explanation: Returns top contributing factors without causal diagnostic claims.
""")

    # =========================================================================
    # PATIENT C — Renal-Function / CKD Profile
    # =========================================================================
    p_c_items = [
        ("Serum Creatinine", "2.40", "mg/dL", "0.60 - 1.20"),
        ("Blood Urea", "65", "mg/dL", "15.0 - 45.0"),
        ("Fasting Blood Sugar", "112", "mg/dL", "70.0 - 99.0"),
        ("Total Cholesterol", "195", "mg/dL", "< 200.0"),
        ("HDL Cholesterol", "42", "mg/dL", "> 40.0"),
        ("Blood Pressure", "148/92", "mmHg", "< 120 / < 80"),
        ("Hemoglobin", "10.2", "g/dL", "12.0 - 15.5"),
        ("Body Mass Index", "26.5", "kg/m2", "18.5 - 24.9"),
        ("Heart Rate", "76", "BPM", "60 - 100"),
    ]
    build_pdf_report(
        PATIENT_C_DIR / "report_renal.pdf",
        "Renal Function & Metabolic Panel",
        "Sunita Rao", "SYN-PAT-003", 62, "Female", "14-Sep-2026", "Completed",
        p_c_items,
        "Significantly elevated serum creatinine (2.40 mg/dL) and blood urea (65 mg/dL) for CKD evaluation."
    )

    with open(PATIENT_C_DIR / "patient_profile.json", "w") as f:
        json.dump({
            "disclaimer": "SYNTHETIC — FOR DEMONSTRATION ONLY",
            "patientId": "SYN-PAT-003",
            "name": "Sunita Rao",
            "email": "synthetic.patient.c@example.com",
            "role": "Patient",
            "age": 62,
            "gender": "Female",
            "sexEncoded": 0,
            "isCurrentSmoker": False,
            "village": "Demo Community East",
            "assignedDoctor": "Dr. Demo Clinician",
            "medicalHistory": ["Synthetic renal evaluation profile for software demonstration."],
            "scenario": "Patient C — Renal-Function / CKD Profile",
            "expectedOutcomes": {
                "diabetes": "ELEVATED_MODEL_ESTIMATED_RISK",
                "heartDisease": "ELEVATED_MODEL_ESTIMATED_RISK",
                "hypertension": "POSITIVE_CLASSIFICATION_ESTIMATE",
                "ckd": "POSITIVE_CLASSIFICATION_ESTIMATE"
            }
        }, f, indent=2)

    with open(PATIENT_C_DIR / "report_metadata.json", "w") as f:
        json.dump({
            "disclaimer": "SYNTHETIC — FOR DEMONSTRATION ONLY",
            "scenario": "Patient C Renal Function Report",
            "reportId": "SYN-REP-C-001",
            "pdfFilename": "report_renal.pdf",
            "title": "Renal Function & Metabolic Panel",
            "uploadDate": "2026-09-14T08:45:00.000Z",
            "reportType": "General Laboratory Report",
            "documentType": "general_lab_report",
            "status": "CONFIRMED"
        }, f, indent=2)

    with open(PATIENT_C_DIR / "expected_extraction.json", "w") as f:
        json.dump({
            "disclaimer": "SYNTHETIC — FOR DEMONSTRATION ONLY",
            "patientContext": {"age": 62, "ageUnit": "years", "sex": "female"},
            "canonicalVitals": {
                "serumCreatinine": 2.4,
                "bloodUrea": 65,
                "fastingSugar": 112,
                "totalCholesterol": 195,
                "systolicBP": 148,
                "diastolicBP": 92,
                "hemoglobin": 10.2,
                "bmi": 26.5,
                "heartRate": 76
            },
            "overallConfidence": 0.99
        }, f, indent=2)

    with open(PATIENT_C_DIR / "expected_canonical_mapping.json", "w") as f:
        json.dump({
            "disclaimer": "SYNTHETIC — FOR DEMONSTRATION ONLY",
            "diseaseFeatureVectors": {
                "chronicKidneyDisease": {
                    "age": 62.0, "serum_creatinine": 2.40
                },
                "diabetes": {
                    "age": 62.0, "sex": 0, "bmi": 26.5, "systolic_bp": 148.0, "diastolic_bp": 92.0,
                    "total_cholesterol": 195.0, "hdl": 42.0, "creatinine": 2.40
                },
                "heartDisease": {
                    "age": 62.0, "sex": 0, "totChol": 195.0, "sysBP": 148.0, "diaBP": 92.0,
                    "BMI": 26.5, "glucose": 112.0, "currentSmoker": 0
                },
                "hypertension": {
                    "age": 62.0, "sex": 0, "bmi": 26.5, "fasting_glucose": 112.0,
                    "total_cholesterol": 195.0, "hdl": 42.0, "serum_creatinine": 2.40,
                    "heart_rate": 76.0, "current_smoker": 0
                }
            },
            "ckdSchemaEnforcement": {
                "utilizedFeatures": ["age", "serum_creatinine"],
                "excludedFromModel": ["blood_urea", "blood_pressure", "hemoglobin", "blood_glucose"],
                "rationale": "CKD v1 production model schema is locked to approved features (Age, Serum Creatinine). Blood urea is safely stored in patient profile but never passed to model."
            }
        }, f, indent=2)

    with open(PATIENT_C_DIR / "README.md", "w") as f:
        f.write("""# Patient C — Renal-Function / CKD Demonstration Profile

**SYNTHETIC — FOR DEMONSTRATION ONLY**

## Scenario Overview
Patient C (`Sunita Rao`, Age 62, Female) demonstrates significant renal biomarker elevation:
- Serum Creatinine: 2.40 mg/dL (markedly elevated)
- Blood Urea: 65 mg/dL (elevated)
- Blood Pressure: 148/92 mmHg

## Model Schema Adherence
- **CKD Model Input**: Strictly consumes `{ "age": 62.0, "serum_creatinine": 2.40 }`.
- **Excluded Features**: Blood urea (65 mg/dL), blood pressure, and hemoglobin are extracted into the patient profile, but are strictly excluded from the minimal CKD production model feature vector.
- **Model Output**: Calibrated Random Forest model evaluates to 1.0000 probability (`POSITIVE_CLASSIFICATION_ESTIMATE`), exceeding the 0.9672 development threshold.
""")

    # =========================================================================
    # EDGE CASES
    # =========================================================================
    # Case C: Correctable Extraction
    p_edge_c = [
        ("Fasting Blood Sugar", "108", "mg/dL", "70.0 - 99.0"),
        ("Blood Pressure", "120/80", "mmHg", "< 120 / < 80"),
        ("Total Cholesterol", "185", "mg/dL", "< 200.0"),
        ("Serum Creatinine", "0.90", "mg/dL", "0.60 - 1.20"),
    ]
    build_pdf_report(
        EDGE_CASES_DIR / "case_c_correctable_extraction.pdf",
        "Laboratory Test Report (HITL Review Candidate)",
        "Pooja Verma", "SYN-PAT-004", 38, "Female", "05-Aug-2026", "Pending Verification",
        p_edge_c,
        "Designed for testing human-in-the-loop manual correction. User can edit Fasting Blood Sugar to 112 mg/dL before confirmation to verify correction provenance."
    )
    with open(EDGE_CASES_DIR / "expected_extraction_c.json", "w") as f:
        json.dump({
            "disclaimer": "SYNTHETIC — FOR DEMONSTRATION ONLY",
            "purpose": "Case C: HITL Manual Correction Test",
            "initialExtraction": {"fastingSugar": 108, "systolicBP": 120, "diastolicBP": 80, "totalCholesterol": 185, "serumCreatinine": 0.9},
            "demonstrationEdit": {"field": "fastingSugar", "editedValue": 112, "expectedProvenanceSource": "manual_correction"},
            "invariants": "rawOcrText and initialExtraction remain unchanged; verified flag set to true on confirmation."
        }, f, indent=2)

    # Case D: Missing Optional Feature
    p_edge_d = [
        ("Fasting Blood Sugar", "122", "mg/dL", "70.0 - 99.0"),
        ("Blood Pressure", "132/84", "mmHg", "< 120 / < 80"),
        ("Total Cholesterol", "210", "mg/dL", "< 200.0"),
        ("Serum Creatinine", "1.00", "mg/dL", "0.60 - 1.20"),
        ("Blood Urea", "28", "mg/dL", "15.0 - 45.0"),
    ]
    build_pdf_report(
        EDGE_CASES_DIR / "case_d_missing_optional.pdf",
        "Laboratory Test Report (Partial Panel)",
        "Vikram Singh", "SYN-PAT-005", 46, "Male", "12-Jul-2026", "Completed",
        p_edge_d,
        "Omitted BMI and HDL cholesterol. Validates that models operate with dataCompleteness = 'PARTIAL' without inventing missing values."
    )
    with open(EDGE_CASES_DIR / "expected_extraction_d.json", "w") as f:
        json.dump({
            "disclaimer": "SYNTHETIC — FOR DEMONSTRATION ONLY",
            "purpose": "Case D: Missing Optional Feature Test",
            "missingFeatures": ["bmi", "hdl"],
            "expectedDataCompleteness": "PARTIAL",
            "zeroFabricationGuarantee": "Missing features remain null; median imputation handled by model preprocessor without fabrication in API."
        }, f, indent=2)

    # Case E: Missing Required Feature
    p_edge_e = [
        ("Fasting Blood Sugar", "115", "mg/dL", "70.0 - 99.0"),
        ("Body Mass Index", "25.2", "kg/m2", "18.5 - 24.9"),
    ]
    build_pdf_report(
        EDGE_CASES_DIR / "case_e_missing_required.pdf",
        "Limited Screening Report",
        "Meera Joshi", "SYN-PAT-006", 50, "Female", "02-May-2026", "Completed",
        p_edge_e,
        "Lacks Total Cholesterol, Blood Pressure, and Creatinine. Fails Minimum Input Policy for Heart Disease and CKD."
    )
    with open(EDGE_CASES_DIR / "expected_extraction_e.json", "w") as f:
        json.dump({
            "disclaimer": "SYNTHETIC — FOR DEMONSTRATION ONLY",
            "purpose": "Case E: Missing Required Feature Test",
            "presentFeatures": ["fastingSugar", "bmi"],
            "missingRequired": {
                "heartDisease": ["totChol", "sysBP", "diaBP"],
                "chronicKidneyDisease": ["serum_creatinine"]
            },
            "expectedModelStatus": "INSUFFICIENT_DATA",
            "expectedCanCalculate": False,
            "zeroFabricationGuarantee": "No fake probabilities or default guesses are generated."
        }, f, indent=2)

    # Case F: Unsupported / Administrative Document
    doc_f = SimpleDocTemplate(str(EDGE_CASES_DIR / "case_f_unsupported_document.pdf"), pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    elems_f = [
        Paragraph("SYNTHETIC — FOR DEMONSTRATION ONLY", ParagraphStyle('Banner', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=12, textColor=colors.HexColor('#DC2626'), alignment=1, spaceAfter=8)),
        Paragraph("Community Health Center Facility Inventory & Staff Schedule", ParagraphStyle('Title', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=16, textColor=colors.HexColor('#1E3A8A'), spaceAfter=12)),
        Paragraph("<b>Document Type:</b> Administrative Facility Roster<br/><b>Date:</b> 01-Jan-2026<br/><b>Location:</b> Sector 4 Health Post", styles['Normal']),
        Spacer(1, 14),
        Paragraph("<b>Shift Assignments:</b><br/>- Morning Shift: Nurse Staff A (08:00 - 14:00)<br/>- Evening Shift: CHO Staff B (14:00 - 20:00)<br/>- Emergency On-call: Dr. Staff C", styles['Normal']),
        Spacer(1, 14),
        Paragraph("<b>Inventory Equipment Status:</b><br/>- Digital Thermometers: 4 Units (Operational)<br/>- Weighing Scale: 2 Units (Calibrated)<br/>- Pulse Oximeter: 3 Units (Operational)", styles['Normal']),
        Spacer(1, 14),
        Paragraph("<i>Notice: This document contains zero clinical laboratory analytes or biomarker results. The MedScan-NCD parser must classify this document as non-extractable or non-lab without fabricating medical values.</i>", ParagraphStyle('Notice', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=9, textColor=colors.HexColor('#4B5563')))
    ]
    doc_f.build(elems_f)
    print(f"Generated PDF: {EDGE_CASES_DIR / 'case_f_unsupported_document.pdf'}")

    with open(EDGE_CASES_DIR / "expected_extraction_f.json", "w") as f:
        json.dump({
            "disclaimer": "SYNTHETIC — FOR DEMONSTRATION ONLY",
            "purpose": "Case F: Non-Clinical Document Ingestion Test",
            "documentClassification": "unknown",
            "extractedBiomarkersCount": 0,
            "expectedOutcome": "No biomarkers extracted, zero fabrication, user prompted to upload supported clinical lab document."
        }, f, indent=2)

    with open(EDGE_CASES_DIR / "README.md", "w") as f:
        f.write("""# Edge-Case Demonstration Fixtures

**SYNTHETIC — FOR DEMONSTRATION ONLY**

## Test Cases
- **Case C (`case_c_correctable_extraction.pdf`)**: Tests human-in-the-loop manual correction. Shows that unconfirmed edits preserve original OCR values and record `manual_correction` provenance.
- **Case D (`case_d_missing_optional.pdf`)**: Tests missing optional parameters (BMI and HDL missing). Shows that models handle `PARTIAL` data completeness safely.
- **Case E (`case_e_missing_required.pdf`)**: Tests missing mandatory parameters. Shows that the Minimum Input Policy halts calculation with `INSUFFICIENT_DATA` rather than hallucinating predictions.
- **Case F (`case_f_unsupported_document.pdf`)**: Administrative roster document containing no clinical parameters. Verifies zero false positive biomarker extraction.
""")

    # =========================================================================
    # Compute SHA-256 Manifest
    # =========================================================================
    manifest = {}
    for path in sorted(BASE_DIR.rglob("*")):
        if path.is_file() and path.suffix in [".pdf", ".png", ".json", ".md"]:
            rel = str(path.relative_to(BASE_DIR)).replace("\\", "/")
            hasher = hashlib.sha256()
            with open(path, "rb") as f:
                hasher.update(f.read())
            manifest[rel] = hasher.hexdigest()

    with open(BASE_DIR / "FIXTURE_MANIFEST.json", "w") as f:
        json.dump({
            "disclaimer": "SYNTHETIC — FOR DEMONSTRATION ONLY",
            "generatedAtUtc": "2026-10-21T15:20:00Z",
            "manifest": manifest
        }, f, indent=2)
    print(f"Generated manifest with {len(manifest)} files.")

if __name__ == "__main__":
    generate_all()
