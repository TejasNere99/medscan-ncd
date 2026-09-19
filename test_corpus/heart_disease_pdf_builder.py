"""
MedScan-NCD: Heart Disease Synthetic Test Report Corpus Builder
==============================================================
Generates 38 realistic, clinically plausible, fictional diagnostic reports (PDFs)
and corresponding ground-truth JSON files for the Heart Disease (Framingham 10-Year CHD) model.

Categories:
  01_elevated_risk          (4 reports)
  02_lower_risk             (4 reports)
  03_borderline             (4 reports)
  04_missing_required_data  (4 reports)
  05_optional_missing_data  (4 reports)
  06_ocr_challenging        (4 reports)
  07_unit_variations        (3 reports)
  08_manual_correction      (3 reports)
  09_multi_report_longitudinal (7 reports across 3 patients)
  10_realistic_mixed_reports   (4 reports)

Total: 38 PDF Reports + 38 Ground-Truth JSON Files + Master Manifest + Readme

STRICT POLICIES:
- 100% Synthetic: fictional patient names, IDs, dates, and healthcare facilities.
- Watermark Banner on every page:
  "SYNTHETIC TEST DATA — NOT A REAL MEDICAL REPORT — FOR EVALUATION ONLY"
- Zero PII: No real doctor, patient, or hospital names.
- Zero Model Predictions: Ground truth files contain ONLY printed values.
  NO expected probabilities, NO risk categories, NO SHAP attributions.
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas
import reportlab.rl_config
reportlab.rl_config.pageCompression = 0

BASE_DIR = Path(__file__).resolve().parent
CORPUS_DIR = BASE_DIR / "heart_disease"


class SyntheticReportCanvas(canvas.Canvas):
    """Canvas that prints professional top/bottom synthetic disclosure banners."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        # Top watermark banner
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#dc2626"))
        banner_text = "SYNTHETIC TEST DATA — NOT A REAL MEDICAL REPORT — FOR EVALUATION ONLY"
        self.drawCentredString(letter[0] / 2.0, letter[1] - 22, banner_text)

        # Bottom footer
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748b"))
        footer_text = f"MedScan-NCD Heart Disease Test Corpus | Page {self._pageNumber} of {page_count}"
        self.drawString(36, 20, footer_text)
        self.drawRightString(letter[0] - 36, 20, "VERIFIED SYNTHETIC ARTIFACT — STRICTLY CONFIDENTIAL")

        # Decorative footer rule
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(36, 30, letter[0] - 36, 30)
        self.restoreState()


def create_pdf_report(dest_path: Path, meta: dict, sections: list):
    """Generates a professional diagnostic report PDF matching MedScan-NCD specifications."""
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(dest_path),
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=42
    )

    styles = getSampleStyleSheet()

    lab_title_style = ParagraphStyle(
        'LabTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12.5,
        leading=15,
        textColor=colors.HexColor("#1e3a8a")
    )
    lab_sub_style = ParagraphStyle(
        'LabSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#475569")
    )
    section_head_style = ParagraphStyle(
        'SecHead',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12,
        textColor=colors.HexColor("#0f172a")
    )
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#1e293b")
    )
    tbl_hdr_style = ParagraphStyle(
        'TblHdr',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )
    cell_style = ParagraphStyle(
        'TblCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0f172a")
    )
    cell_bold_style = ParagraphStyle(
        'TblCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0f172a")
    )
    flag_high_style = ParagraphStyle(
        'TblCellHigh',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#dc2626")
    )
    flag_low_style = ParagraphStyle(
        'TblCellLow',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#2563eb")
    )

    story = []

    # 1. Laboratory Header
    lab_name = meta.get("labName", "METROPOLITAN CARDIOLOGY & DIAGNOSTIC LABORATORIES")
    lab_addr = meta.get("labAddress", "742 Evergreen Healthcare Blvd, Suite 400 | CAP & CLIA Accredited")
    lab_contact = meta.get("labContact", "Tel: +1 (555) 019-8832 | Web: https://metropolitan-diagnostics.local")

    hdr_data = [
        [
            Paragraph(f"<b>{lab_name}</b>", lab_title_style),
            Paragraph(f"<b>REPORT STATUS:</b> FINAL VERIFIED<br/><b>ACCESSION #:</b> {meta['reportId']}", ParagraphStyle('Acc1', parent=styles['Normal'], fontName='Helvetica', fontSize=7.5, leading=9, alignment=2))
        ],
        [
            Paragraph(f"{lab_addr}<br/>{lab_contact}", lab_sub_style),
            Paragraph(f"<b>REPORT DATE:</b> {meta.get('reportDate', '2026-01-15')}<br/><b>SPECIMEN ID:</b> HD-SPEC-{meta['reportId'][-4:]}", ParagraphStyle('Acc2', parent=styles['Normal'], fontName='Helvetica', fontSize=7.5, leading=9, alignment=2))
        ]
    ]
    hdr_table = Table(hdr_data, colWidths=[360, 180])
    hdr_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(hdr_table)
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1e3a8a"), spaceAfter=6, spaceBefore=2))

    # 2. Patient Demographics Block
    p = meta.get("patient", {})
    age_str = f"{p['age']} Years" if p.get('age') is not None else "UNSPECIFIED"
    sex_str = p.get('sexStr') or "UNSPECIFIED"
    dob_str = p.get('dob') or "N/A"
    doctor_str = meta.get("referringDoctor", "Dr. Alexander Vance, MD (Cardiology)")

    demo_data = [
        [
            Paragraph(f"<b>PATIENT NAME:</b> {p.get('name', 'Synthetic Patient')}", cell_style),
            Paragraph(f"<b>PATIENT ID:</b> {p.get('patientId', 'HD-SYN-000')}", cell_style),
            Paragraph(f"<b>AGE / GENDER:</b> {age_str} / {sex_str}", cell_style)
        ],
        [
            Paragraph(f"<b>DATE OF BIRTH:</b> {dob_str}", cell_style),
            Paragraph(f"<b>ORDERING PHYSICIAN:</b> {doctor_str}", cell_style),
            Paragraph(f"<b>CLINICAL INDICATION:</b> {meta.get('clinicalIndication', 'Routine Cardiometabolic Assessment')}", cell_style)
        ]
    ]
    demo_table = Table(demo_data, colWidths=[180, 180, 180])
    demo_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(demo_table)
    story.append(Spacer(1, 8))

    # 3. Report Title Banner
    title_text = meta.get("title", "CARDIOMETABOLIC RISK ASSESSMENT & CLINICAL LABORATORY REPORT")
    story.append(Paragraph(f"<b>{title_text}</b>", section_head_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceAfter=6, spaceBefore=2))

    # 4. Content Sections
    for sec in sections:
        sec_type = sec.get("type", "lab_table")

        if sec_type == "vitals":
            story.append(Paragraph(f"<b>{sec.get('title', 'Clinical Vitals & Measurements')}</b>", section_head_style))
            story.append(Spacer(1, 2))

            items = sec.get("items", [])
            v_rows = []
            for i in range(0, len(items), 2):
                pair = items[i:i+2]
                r = []
                for it in pair:
                    unit_str = f" {it['unit']}" if it.get('unit') else ""
                    val_str = f"<b>{it['value']}</b>{unit_str}" if it.get('value') is not None else "<font color='#64748b'>Not Recorded</font>"
                    r.extend([
                        Paragraph(it.get("label", ""), cell_bold_style),
                        Paragraph(val_str, cell_style)
                    ])
                if len(pair) == 1:
                    r.extend([Paragraph("", cell_style), Paragraph("", cell_style)])
                v_rows.append(r)

            v_table = Table(v_rows, colWidths=[160, 110, 160, 110])
            v_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#ffffff")),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(v_table)
            story.append(Spacer(1, 6))

        elif sec_type == "lab_table":
            story.append(Paragraph(f"<b>{sec.get('title', 'Laboratory Analysis')}</b>", section_head_style))
            story.append(Spacer(1, 2))

            tbl_data = [
                [
                    Paragraph("Test Parameter / Analyte", tbl_hdr_style),
                    Paragraph("Observed Value", tbl_hdr_style),
                    Paragraph("Unit", tbl_hdr_style),
                    Paragraph("Reference Range", tbl_hdr_style),
                    Paragraph("Flag", tbl_hdr_style),
                    Paragraph("Methodology", tbl_hdr_style)
                ]
            ]

            for row in sec.get("rows", []):
                flag = row.get("flag", "NORMAL")
                flag_style = cell_style
                if flag in ("HIGH", "ELEVATED", "STAGE 1", "STAGE 2"):
                    flag_style = flag_high_style
                elif flag in ("LOW", "DEPRESSED"):
                    flag_style = flag_low_style

                val_style = cell_bold_style if row.get("highlight") else cell_style
                val_disp = str(row.get("value", "")) if row.get("value") is not None else "<font color='#64748b'>Not Ordered</font>"

                tbl_data.append([
                    Paragraph(row.get("name", ""), cell_style),
                    Paragraph(val_disp, val_style),
                    Paragraph(row.get("unit", ""), cell_style),
                    Paragraph(row.get("referenceRange", ""), cell_style),
                    Paragraph(flag, flag_style),
                    Paragraph(row.get("method", "Standard Automated Assay"), cell_style)
                ])

            l_table = Table(tbl_data, colWidths=[160, 75, 55, 95, 45, 110])
            l_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 2.5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
                ('LEFTPADDING', (0, 0), (-1, -1), 5),
                ('RIGHTPADDING', (0, 0), (-1, -1), 5),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ]))
            story.append(l_table)
            story.append(Spacer(1, 6))

        elif sec_type == "text":
            story.append(Paragraph(f"<b>{sec.get('title', 'Clinical Notes')}</b>", section_head_style))
            story.append(Spacer(1, 1))
            story.append(Paragraph(sec.get("content", ""), body_style))
            story.append(Spacer(1, 6))

    # 5. Sign-off Footer Box
    sign_data = [
        [
            Paragraph("<b>Analyst / Technologist:</b><br/>E. Mercer, MT(ASCP), Lead Biochemist", cell_style),
            Paragraph("<b>Consultant Reviewer:</b><br/>Dr. Julian Vance, MD, FACC, Director of Clinical Chemistry", cell_style),
            Paragraph("<b>Electronic Signature:</b><br/>[DIGITALLY VERIFIED RECORD]<br/>Timestamp: " + meta.get('reportDate', '2026-01-15') + " 17:42 UTC", cell_style)
        ]
    ]
    sign_table = Table(sign_data, colWidths=[180, 180, 180])
    sign_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(Spacer(1, 4))
    story.append(sign_table)

    doc.build(story, canvasmaker=SyntheticReportCanvas)


def export_ground_truth(dest_path: Path, patient_id: str, report_date: str, printed_values: dict):
    """Exports ground truth JSON containing ONLY printed report values (ZERO prediction data)."""
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "patient_id": patient_id,
        "report_date": report_date,
        "printed_values": printed_values
    }
    with open(dest_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


print("Corpus builder module initialized successfully.")
