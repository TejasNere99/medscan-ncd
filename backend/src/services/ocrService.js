import { createWorker } from 'tesseract.js';

export const processReportOCR = async (filePathOrBuffer) => {
  let worker = null;
  try {
    worker = await createWorker('eng');
    const ret = await worker.recognize(filePathOrBuffer);
    const rawText = ret.data.text || '';
    const confidence = Math.round(ret.data.confidence || 0);

    // Extract structured key health metrics using regex
    const structuredData = {};

    // Fasting Glucose / Blood Sugar
    const sugarMatch = rawText.match(/(?:glucose|blood\s*sugar|fasting\s*sugar)[:\s]*(\d+(?:\.\d+)?)/i);
    if (sugarMatch) {
      structuredData.fastingSugar = parseFloat(sugarMatch[1]);
    }

    // Blood Pressure (e.g. 135/85 or BP: 140 / 90)
    const bpMatch = rawText.match(/(?:bp|blood\s*pressure)[:\s]*(\d{2,3})\s*[\/]\s*(\d{2,3})/i);
    if (bpMatch) {
      structuredData.systolicBP = parseInt(bpMatch[1], 10);
      structuredData.diastolicBP = parseInt(bpMatch[2], 10);
    }

    // Cholesterol
    const cholMatch = rawText.match(/(?:cholesterol|total\s*cholesterol)[:\s]*(\d+(?:\.\d+)?)/i);
    if (cholMatch) {
      structuredData.cholesterol = parseFloat(cholMatch[1]);
    }

    // Hemoglobin
    const hbMatch = rawText.match(/(?:hemoglobin|hb)[:\s]*(\d+(?:\.\d+)?)/i);
    if (hbMatch) {
      structuredData.hemoglobin = parseFloat(hbMatch[1]);
    }

    // Creatinine / Kidney metric
    const creatMatch = rawText.match(/(?:creatinine)[:\s]*(\d+(?:\.\d+)?)/i);
    if (creatMatch) {
      structuredData.creatinine = parseFloat(creatMatch[1]);
    }

    await worker.terminate();

    return {
      rawText: rawText.trim(),
      confidence,
      structuredData,
      isLowConfidence: confidence < 50,
    };
  } catch (error) {
    console.error('[OCR Service] Extraction error:', error);
    if (worker) {
      await worker.terminate().catch(() => {});
    }
    return {
      rawText: 'OCR extraction encountered an error or unreadable document.',
      confidence: 0,
      structuredData: {},
      isLowConfidence: true,
    };
  }
};
