import { createWorker } from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { parseMedicalDocument } from './medicalReportParser.js';
import { validateBiomarkerRange } from './medicalValidation.js';

const require = createRequire(import.meta.url);

export const validateBiomarker = (name, value, unit) => {
  return validateBiomarkerRange(name, value, unit);
};

/**
 * Extracts supported medical parameters from raw OCR text with unit preservation.
 * NEVER fabricates missing values — missing values remain null.
 */
export const extractMedicalParameters = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    return { extractedData: {}, structuredData: {} };
  }

  const extractedData = {};
  const structuredData = {};

  // 1. Fasting Sugar / Glucose
  const glucosePatterns = [
    /(?:fasting\s*(?:blood)?\s*(?:sugar|glucose)|fbs|glucose[,\s\-]+fasting|blood\s*sugar\s*\(?f\)?)\s*[:\-\s]\s*(\d{2,3}(?:\.\d+)?)\s*(mg\/dl|mmol\/l)?/i,
    /(?:glucose|blood\s*sugar)\s*[:\-\s]\s*(\d{2,3}(?:\.\d+)?)\s*(mg\/dl|mmol\/l)?/i,
  ];

  for (const pattern of glucosePatterns) {
    const match = rawText.match(pattern);
    if (match) {
      const val = parseFloat(match[1]);
      const detectedUnit = match[2]?.toLowerCase() === 'mmol/l' ? 'mmol/L' : 'mg/dL';
      const validation = validateBiomarker('fastingSugar', val, detectedUnit);
      extractedData.fastingSugar = {
        value: val,
        unit: detectedUnit,
        status: validation.status,
        warning: validation.status === 'WARNING' ? validation.message : null,
      };
      structuredData.fastingSugar = val;
      break;
    }
  }

  // 2. Blood Pressure (e.g. 120/80 or BP: 130 / 85 mmHg or Systolic: 120, Diastolic: 80)
  const bpRatioPatterns = [
    /(?:bp|blood\s*pressure|b\.p\.)\s*[:\-\s]*(\d{2,3})\s*[\/\\]\s*(\d{2,3})\s*(mm\s*hg|mmhg)?/i,
    /(?:^|\s)(\d{2,3})\s*[\/\\]\s*(\d{2,3})\s*(?:mm\s*hg|mmhg)(?:\s|$)/i,
  ];

  let bpFound = false;
  for (const pattern of bpRatioPatterns) {
    const match = rawText.match(pattern);
    if (match) {
      const sys = parseInt(match[1], 10);
      const dia = parseInt(match[2], 10);
      const sysVal = validateBiomarker('systolicBP', sys, 'mmHg');
      const diaVal = validateBiomarker('diastolicBP', dia, 'mmHg');

      extractedData.systolicBP = {
        value: sys,
        unit: 'mmHg',
        status: sysVal.status,
        warning: sysVal.status === 'WARNING' ? sysVal.message : null,
      };
      extractedData.diastolicBP = {
        value: dia,
        unit: 'mmHg',
        status: diaVal.status,
        warning: diaVal.status === 'WARNING' ? diaVal.message : null,
      };
      structuredData.systolicBP = sys;
      structuredData.diastolicBP = dia;
      bpFound = true;
      break;
    }
  }

  if (!bpFound) {
    const sysMatch = rawText.match(/(?:systolic(?:\s*bp)?|sbp)\s*[:\-\s]*(\d{2,3})/i);
    const diaMatch = rawText.match(/(?:diastolic(?:\s*bp)?|dbp)\s*[:\-\s]*(\d{2,3})/i);
    if (sysMatch) {
      const sys = parseInt(sysMatch[1], 10);
      const val = validateBiomarker('systolicBP', sys, 'mmHg');
      extractedData.systolicBP = { value: sys, unit: 'mmHg', status: val.status, warning: val.status === 'WARNING' ? val.message : null };
      structuredData.systolicBP = sys;
    }
    if (diaMatch) {
      const dia = parseInt(diaMatch[1], 10);
      const val = validateBiomarker('diastolicBP', dia, 'mmHg');
      extractedData.diastolicBP = { value: dia, unit: 'mmHg', status: val.status, warning: val.status === 'WARNING' ? val.message : null };
      structuredData.diastolicBP = dia;
    }
  }

  // 3. Total Cholesterol
  const cholMatch = rawText.match(/(?:total\s*cholesterol|serum\s*cholesterol|cholesterol[,\s\-]+total|cholesterol)\s*[:\-\s]*(\d{2,3}(?:\.\d+)?)\s*(mg\/dl)?/i);
  if (cholMatch) {
    const val = parseFloat(cholMatch[1]);
    const validation = validateBiomarker('totalCholesterol', val, 'mg/dL');
    extractedData.totalCholesterol = {
      value: val,
      unit: 'mg/dL',
      status: validation.status,
      warning: validation.status === 'WARNING' ? validation.message : null,
    };
    structuredData.totalCholesterol = val;
  }

  // 4. Serum Creatinine
  const creatMatch = rawText.match(/(?:serum\s*creatinine|s\.\s*creatinine|creatinine)\s*[:\-\s]*(\d{1,2}(?:\.\d+)?)\s*(mg\/dl)?/i);
  if (creatMatch) {
    const val = parseFloat(creatMatch[1]);
    const validation = validateBiomarker('serumCreatinine', val, 'mg/dL');
    extractedData.serumCreatinine = {
      value: val,
      unit: 'mg/dL',
      status: validation.status,
      warning: validation.status === 'WARNING' ? validation.message : null,
    };
    structuredData.serumCreatinine = val;
  }

  // 5. Hemoglobin
  const hbMatch = rawText.match(/(?:hemoglobin|haemoglobin|hb|hgb)\s*[:\-\s]*(\d{1,2}(?:\.\d+)?)\s*(g\/dl|gm\/dl)?/i);
  if (hbMatch) {
    const val = parseFloat(hbMatch[1]);
    const validation = validateBiomarker('hemoglobin', val, 'g/dL');
    extractedData.hemoglobin = {
      value: val,
      unit: 'g/dL',
      status: validation.status,
      warning: validation.status === 'WARNING' ? validation.message : null,
    };
    structuredData.hemoglobin = val;
  }

  // 6. Body Mass Index (BMI)
  const bmiMatch = rawText.match(/(?:body\s*mass\s*index|bmi)\s*[:\-\s]*(\d{1,2}(?:\.\d+)?)\s*(kg\/m2|kg\/m²)?/i);
  if (bmiMatch) {
    const val = parseFloat(bmiMatch[1]);
    const validation = validateBiomarker('bmi', val, 'kg/m²');
    extractedData.bmi = {
      value: val,
      unit: 'kg/m²',
      status: validation.status,
      warning: validation.status === 'WARNING' ? validation.message : null,
    };
    structuredData.bmi = val;
  }

  return { extractedData, structuredData };
};

/**
 * End-to-end OCR processing function.
 * Supports image files (Tesseract) and PDF files (PDF parser).
 * Returns original rawOcrText, confidence score, and unit-aware extractedData.
 */
export const processReportOCR = async (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error('Valid file path is required for OCR processing.');
  }

  const ext = path.extname(filePath).toLowerCase();

  // PDF Document Handling
  if (ext === '.pdf') {
    try {
      const buffer = fs.readFileSync(filePath);
      const { PDFParse } = require('pdf-parse');
      const parser = new PDFParse({ data: buffer });
      await parser.load();
      const parseResult = await parser.getText();
      const rawText = (typeof parseResult === 'string' ? parseResult : (parseResult?.text || '')).trim();
      await parser.destroy().catch(() => {});

      if (rawText.length > 20) {
        const parsedDoc = parseMedicalDocument(rawText, { confidence: 95, fileType: 'pdf' });
        return {
          rawText,
          confidence: parsedDoc.overallConfidence || 95,
          extractedData: parsedDoc,
          structuredData: parsedDoc.structuredData || parsedDoc.canonicalVitals,
          fileType: 'pdf',
          source: 'pdf-text-engine',
        };
      }
      // If digital text extraction is empty (scanned image inside PDF), note limitation honestly
      return {
        rawText: 'Scanned PDF document detected without embedded text layer. Please upload as high-resolution PNG or JPG for optical scanning.',
        confidence: 20,
        extractedData: {},
        structuredData: {},
        fileType: 'pdf',
        source: 'pdf-empty-stream',
        warning: 'Scanned PDF contains image-only data without digital text.',
      };
    } catch (pdfErr) {
      console.error('[OCR Service] PDF parsing error:', pdfErr.message);
      throw new Error(`PDF extraction failed: ${pdfErr.message}`);
    }
  }

  // Image Document Handling (Tesseract.js)
  let worker = null;
  try {
    worker = await createWorker('eng');
    const ret = await worker.recognize(filePath);
    const rawText = (ret.data.text || '').trim();
    const confidence = Math.round(ret.data.confidence || 0);

    const parsedDoc = parseMedicalDocument(rawText, { confidence, fileType: ext.replace('.', '') });

    await worker.terminate();

    return {
      rawText,
      confidence: parsedDoc.overallConfidence || confidence,
      extractedData: parsedDoc,
      structuredData: parsedDoc.structuredData || parsedDoc.canonicalVitals,
      fileType: ext.replace('.', ''),
      source: 'tesseract-engine',
    };
  } catch (error) {
    console.error('[OCR Service] Tesseract extraction error:', error.message);
    if (worker) {
      await worker.terminate().catch(() => {});
    }
    throw new Error(`OCR extraction failed: ${error.message}`);
  }
};
