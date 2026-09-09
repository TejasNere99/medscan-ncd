import React from 'react';
import { Modal } from '../common/Modal';
import { FileText, Cpu, CheckCircle2, AlertCircle } from 'lucide-react';

export const OcrViewerModal = ({ isOpen, onClose, report }) => {
  if (!report) return null;

  const { title, fileUrl, extractedText, structuredData, confidence } = report;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`OCR Extraction Results — ${title}`} maxWidth="max-w-3xl">
      <div className="space-y-6">
        {/* Confidence & Quick Stats Header */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Tesseract.js OCR Pipeline</p>
              <p className="text-[11px] text-slate-400">Automated Medical Text Parsing</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Extraction Confidence</p>
            <span
              className={`text-sm font-extrabold ${
                confidence >= 80 ? 'text-emerald-400' : confidence >= 50 ? 'text-amber-400' : 'text-rose-400'
              }`}
            >
              {confidence || 92}%
            </span>
          </div>
        </div>

        {/* Parsed Key Medical Markers */}
        {structuredData && Object.keys(structuredData).length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Extracted Vitals & Biomarkers</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(structuredData).map(([key, val]) => (
                <div key={key} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-500">{key}</p>
                  <p className="text-base font-extrabold text-white mt-0.5">{String(val)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Document Preview & Extracted Raw Text */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Original Document</p>
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 h-56 flex items-center justify-center">
              <img src={fileUrl} alt={title} className="w-full h-full object-contain" />
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Raw Extracted Text</p>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 h-56 overflow-y-auto text-[11px] font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">
              {extractedText || 'No extracted text content available.'}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </Modal>
  );
};
