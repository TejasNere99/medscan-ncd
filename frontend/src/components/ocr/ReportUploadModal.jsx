import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Upload, FileText, CheckCircle2 } from 'lucide-react';
import { reportService } from '../../services/reportService';
import { useToast } from '../../hooks/useToast';

export const ReportUploadModal = ({ isOpen, onClose, patientId, onReportUploaded }) => {
  const { addToast } = useToast();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [reportType, setReportType] = useState('Blood Test');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      if (!title) setTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      addToast('Please select a file to upload.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('report', file);
      formData.append('title', title);
      formData.append('reportType', reportType);
      if (patientId) formData.append('patientId', patientId);

      const res = await reportService.uploadReport(formData);
      addToast('Lab report uploaded & OCR text extracted!', 'success');
      if (onReportUploaded) onReportUploaded(res.data);
      onClose();
    } catch (err) {
      addToast(err.message || 'Report upload failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Lab Report & Trigger OCR">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">Report Title</label>
          <input
            type="text"
            required
            placeholder="e.g. Metabolic Panel Report"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">Report Category</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
          >
            <option value="Blood Test">Blood Test</option>
            <option value="Urine Test">Urine Test</option>
            <option value="Radiology">Radiology / X-Ray</option>
            <option value="Prescription">Prescription</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">Select Image / PDF Document</label>
          <div className="border-2 border-dashed border-slate-800 hover:border-brand-500/50 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-950/60 relative">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {file ? (
              <div className="flex flex-col items-center text-emerald-400">
                <CheckCircle2 className="w-8 h-8 mb-2" />
                <span className="text-xs font-bold text-white">{file.name}</span>
                <span className="text-[10px] text-slate-400 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
            ) : (
              <div className="flex flex-col items-center text-slate-400">
                <Upload className="w-8 h-8 mb-2 text-brand-400" />
                <span className="text-xs font-semibold text-slate-200">Click to browse or drag file here</span>
                <span className="text-[10px] text-slate-500 mt-1">Supports PNG, JPG, WEBP, and PDF up to 10MB</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20 flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>{loading ? 'Processing Tesseract OCR...' : 'Upload & Process OCR'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
