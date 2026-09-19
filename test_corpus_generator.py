"""
MedScan-NCD Synthetic Medical Report Corpus Generator
=====================================================
Generates 37 realistic, clinically plausible, fictional diagnostic reports (PDFs)
and comprehensive ground-truth files for the MedScan-NCD intelligence pipeline.

STRICT POLICY:
- 100% Synthetic: fictional patient names, IDs, dates, and laboratory facilities.
- Watermark / Disclaimer on every document:
  "SYNTHETIC TEST DOCUMENT — NOT A REAL MEDICAL RECORD"
- Feature vector strictly follows MedScan-NCD 8-parameter specification:
  ['age', 'sex', 'bmi', 'systolic_bp', 'diastolic_bp', 'total_cholesterol', 'hdl', 'creatinine']
- Glucose / HbA1c are strictly isolated from model inputs (prevent target leakage).
- Scenario labels record clinical ground truth ("elevated_diabetes_risk", "lower_risk_healthy",
  "borderline", "insufficient_data", etc.); actualModelOutput is left null for independent evaluation.
"""

import os
import sys
import json
import math
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

BASE_DIR = Path(__file__).resolve().parent
CORPUS_DIR = BASE_DIR / "test_corpus"

FEATURE_KEYS = [
    "age", "sex", "bmi", "systolic_bp", "diastolic_bp",
    "total_cholesterol", "hdl", "creatinine"
]

class NumberedCanvas(canvas.Canvas):
    """Canvas that tracks total pages and prints running header/footer."""
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
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#b91c1c"))
        # Top banner
        banner_text = "SYNTHETIC TEST DOCUMENT — NOT A REAL MEDICAL RECORD — FOR EVALUATION ONLY"
        self.drawCentredString(letter[0] / 2.0, letter[1] - 22, banner_text)

        # Bottom footer
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748b"))
        footer_text = f"MedScan-NCD Quality Assurance Test Corpus | Page {self._pageNumber} of {page_count}"
        self.drawString(36, 20, footer_text)
        self.drawRightString(letter[0] - 36, 20, "VERIFIED SYNTHETIC ARTIFACT — STRICTLY CONFIDENTIAL")

        # Decorative bottom rule
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(36, 30, letter[0] - 36, 30)
        self.restoreState()


def build_pdf_report(dest_path: Path, meta: dict, sections_data: list):
    """Generates a professional diagnostic laboratory report in PDF format."""
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
    primary_color = colors.HexColor("#0f172a")
    accent_color = colors.HexColor("#1e3a8a")
    border_color = colors.HexColor("#cbd5e1")
    light_bg = colors.HexColor("#f8fafc")

    # Custom styles
    lab_title_style = ParagraphStyle(
        'LabTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
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
    lab_name = meta.get("labName", "MEDTEST DIAGNOSTIC & CLINICAL RESEARCH LABORATORIES")
    lab_addr = meta.get("labAddress", "404 Synthetic Health Parkway, Diagnostic Plaza, Suite 300 | ISO 15189:2022 Accredited")
    lab_phone = meta.get("labContact", "Tel: +1 (555) 019-2834 | Web: https://synthetic-lab.medscan.local | NABL/CAP Certified")

    hdr_data = [
        [
            Paragraph(f"<b>{lab_name}</b>", lab_title_style),
            Paragraph(f"<b>REPORT STATUS:</b> FINAL VERIFIED<br/><b>ACCESSION #:</b> {meta['reportId']}", ParagraphStyle('Acc', parent=styles['Normal'], fontName='Helvetica', fontSize=7.5, leading=9, alignment=2))
        ],
        [
            Paragraph(f"{lab_addr}<br/>{lab_phone}", lab_sub_style),
            Paragraph(f"<b>REPORT DATE:</b> {meta.get('reportDate', '2025-06-15')}<br/><b>SPECIMEN ID:</b> SYN-SPEC-{meta['reportId'][-4:]}", ParagraphStyle('Acc2', parent=styles['Normal'], fontName='Helvetica', fontSize=7.5, leading=9, alignment=2))
        ]
    ]
    hdr_table = Table(hdr_data, colWidths=[360, 180])
    hdr_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(hdr_table)
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1e3a8a"), spaceAfter=6, spaceBefore=2))

    # 2. Patient Information Box
    pat = meta["patient"]
    age_gender_str = f"Age: {pat['age']} Years / Gender: {pat['sexStr']}"
    dob_str = f"DOB: {pat.get('dob', 'N/A')}"
    pat_id_str = f"Patient ID: {pat['patientId']}"
    pat_name_str = f"Patient Name: {pat['name']}"

    ref_by_str = f"Referring Clinician: {meta.get('referringDoctor', 'Dr. E. Harrison, MD')}"
    sample_str = f"Sample Type: {meta.get('sampleType', 'Serum / Whole Blood (EDTA)')}"
    collected_str = f"Collected: {meta.get('collectionDate', '2025-06-15 08:30 AM')}"
    received_str = f"Received: {meta.get('receivedDate', '2025-06-15 09:45 AM')}"

    pat_data = [
        [
            Paragraph(f"<b>{pat_name_str}</b>", body_style),
            Paragraph(f"<b>{pat_id_str}</b>", body_style),
            Paragraph(f"<b>{ref_by_str}</b>", body_style)
        ],
        [
            Paragraph(f"<b>{age_gender_str}</b>", body_style),
            Paragraph(f"{dob_str}", body_style),
            Paragraph(f"{sample_str}", body_style)
        ],
        [
            Paragraph(f"<b>Clinical Notes:</b> {meta.get('clinicalIndication', 'Routine Cardiometabolic Health Assessment')}", body_style),
            Paragraph(f"{collected_str}", body_style),
            Paragraph(f"{received_str}", body_style)
        ]
    ]
    pat_table = Table(pat_data, colWidths=[190, 160, 190])
    pat_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), light_bg),
        ('BOX', (0, 0), (-1, -1), 0.5, border_color),
        ('INNERGRID', (0, 0), (-1, -1), 0.25, border_color),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(pat_table)
    story.append(Spacer(1, 8))

    # 3. Render Sections (Vitals, Lab Tables, Comments, Multi-page)
    for sec_idx, sec in enumerate(sections_data):
        if sec.get("type") == "pagebreak":
            story.append(PageBreak())
            continue

        sec_title = sec.get("title")
        if sec_title:
            story.append(Paragraph(f"<b>{sec_title.upper()}</b>", section_head_style))
            story.append(HRFlowable(width="100%", thickness=0.5, color=border_color, spaceAfter=4, spaceBefore=2))

        # Vitals block (rendered as clean formatted table)
        if sec.get("type") == "vitals":
            vitals_items = sec.get("items", [])
            v_rows = []
            row = []
            for item in vitals_items:
                label = item.get("label")
                val = item.get("value")
                unit = item.get("unit", "")
                row.append(Paragraph(f"<b>{label}:</b> {val} {unit}".strip(), body_style))
                if len(row) == 3:
                    v_rows.append(row)
                    row = []
            if row:
                while len(row) < 3:
                    row.append(Paragraph("", body_style))
                v_rows.append(row)

            v_table = Table(v_rows, colWidths=[180, 180, 180])
            v_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(v_table)
            story.append(Spacer(1, 6))

        # Lab investigation table
        elif sec.get("type") == "lab_table":
            headers = ["Investigation / Parameter", "Observed Result", "Unit", "Biological Ref. Interval", "Flag", "Method"]
            t_rows = [[Paragraph(f"<b>{h}</b>", tbl_hdr_style) for h in headers]]

            for item in sec.get("rows", []):
                p_name = item.get("name", "")
                val_str = str(item.get("value", ""))
                unit_str = item.get("unit", "")
                ref_str = item.get("referenceRange", "")
                flag_str = item.get("flag", "NORMAL")
                method_str = item.get("method", "Standard Assay")

                p_style = cell_bold_style if item.get("highlight") else cell_style
                if flag_str in ("HIGH", "CRITICAL HIGH", "ABNORMAL"):
                    f_style = flag_high_style
                elif flag_str in ("LOW", "CRITICAL LOW"):
                    f_style = flag_low_style
                else:
                    f_style = cell_style

                t_rows.append([
                    Paragraph(p_name, p_style),
                    Paragraph(f"<b>{val_str}</b>", p_style),
                    Paragraph(unit_str, cell_style),
                    Paragraph(ref_str, cell_style),
                    Paragraph(flag_str, f_style),
                    Paragraph(method_str, cell_style)
                ])

            col_widths = [160, 75, 60, 110, 55, 80]
            lab_table = Table(t_rows, colWidths=col_widths, repeatRows=1)
            lab_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor("#e2e8f0")),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('LEFTPADDING', (0, 0), (-1, -1), 5),
                ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(lab_table)
            story.append(Spacer(1, 6))

        # Descriptive text / comments
        elif sec.get("type") == "text":
            content = sec.get("content", "")
            story.append(Paragraph(content, body_style))
            story.append(Spacer(1, 6))

    # 4. Signatures / Accreditation footer
    story.append(Spacer(1, 8))
    sig_data = [
        [
            Paragraph("<b>Medical Laboratory Technologist</b><br/>Verified & Authenticated by automated analyzer", lab_sub_style),
            Paragraph("<b>Dr. Arthur Vance, MD (Pathology)</b><br/>Consultant Pathologist, Reg. No. SYN-88341", lab_sub_style),
            Paragraph("<b>Dr. Sarah K. Mehta, MD, FACP</b><br/>Director of Clinical Laboratories", lab_sub_style)
        ]
    ]
    sig_table = Table(sig_data, colWidths=[180, 180, 180])
    sig_table.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, -1), 0.5, border_color),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(KeepTogether(sig_table))

    doc.build(story, canvasmaker=NumberedCanvas)


def export_ground_truth_text(dest_path: Path, meta: dict, sections: list):
    """Exports clean OCR ground truth text representation matching the PDF."""
    lines = []
    lines.append("=" * 72)
    lines.append(f"{meta.get('labName', 'MEDTEST DIAGNOSTIC LABORATORIES')}")
    lines.append("SYNTHETIC TEST DOCUMENT — NOT A REAL MEDICAL RECORD — FOR TESTING ONLY")
    lines.append("=" * 72)
    lines.append(f"Report ID: {meta['reportId']}")
    lines.append(f"Report Date: {meta.get('reportDate', '2025-06-15')}")
    lines.append(f"Patient Name: {meta['patient']['name']}")
    lines.append(f"Patient ID: {meta['patient']['patientId']}")
    lines.append(f"Age: {meta['patient']['age']} Years")
    lines.append(f"Gender: {meta['patient']['sexStr']}")
    lines.append(f"DOB: {meta['patient'].get('dob', 'N/A')}")
    lines.append(f"Referring Clinician: {meta.get('referringDoctor', 'Dr. E. Harrison, MD')}")
    lines.append("-" * 72)

    for sec in sections:
        if sec.get("type") == "pagebreak":
            lines.append("\n--- PAGE BREAK ---\n")
            continue
        title = sec.get("title", "")
        if title:
            lines.append(f"\n[{title.upper()}]")
        if sec.get("type") == "vitals":
            for item in sec.get("items", []):
                lines.append(f"{item['label']}: {item['value']} {item.get('unit', '')}".strip())
        elif sec.get("type") == "lab_table":
            lines.append(f"{'Investigation':<30} | {'Result':<10} | {'Unit':<10} | {'Ref Interval':<20} | Flag")
            lines.append("-" * 72)
            for row in sec.get("rows", []):
                lines.append(f"{row['name']:<30} | {str(row['value']):<10} | {row.get('unit', ''):<10} | {row.get('referenceRange', ''):<20} | {row.get('flag', 'NORMAL')}")
        elif sec.get("type") == "text":
            lines.append(sec.get("content", ""))

    lines.append("\n" + "=" * 72)
    lines.append("END OF SYNTHETIC REPORT — NOT A REAL MEDICAL RECORD")
    lines.append("=" * 72)

    dest_path.write_text("\n".join(lines), encoding="utf-8")
