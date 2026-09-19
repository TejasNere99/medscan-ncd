import React, { useState, useEffect } from 'react';
import { X, Stethoscope, QrCode, Search, Copy, Check, Clock, ShieldCheck, UserCheck, ArrowRight } from 'lucide-react';
import { relationshipService } from '../../services/relationshipService';
import { useToast } from '../../hooks/useToast';

export const DoctorConnectModal = ({ isOpen, onClose, onRelationshipChanged }) => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'code'
  
  // Tab 1: Browse state
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [searchDoctor, setSearchDoctor] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [isPrimary, setIsPrimary] = useState(false);
  const [relationshipLabel, setRelationshipLabel] = useState('Consulting Physician');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Tab 2: Code state
  const [codeData, setCodeData] = useState(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === 'browse') {
      fetchDoctors();
    }
  }, [isOpen, activeTab]);

  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const res = await relationshipService.getAvailableDoctors();
      const docList = res?.data?.doctors || res?.doctors || [];
      setDoctors(docList);
    } catch (err) {
      addToast('Failed to load verified doctors list.', 'error');
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleSendRequest = async () => {
    if (!selectedDoctorId) {
      addToast('Please select a doctor to connect with.', 'warning');
      return;
    }

    setSubmittingRequest(true);
    try {
      await relationshipService.requestDoctor({
        doctorId: selectedDoctorId,
        isPrimary,
        relationshipLabel,
      });
      addToast('Connection request sent to doctor successfully!', 'success');
      if (onRelationshipChanged) onRelationshipChanged();
      onClose();
    } catch (err) {
      addToast(err?.message || 'Failed to send connection request.', 'error');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleGenerateCode = async () => {
    setGeneratingCode(true);
    try {
      const res = await relationshipService.generateDoctorCode();
      const payload = res?.data || res;
      setCodeData(payload);
      addToast('New consultation code generated!', 'success');
    } catch (err) {
      addToast(err?.message || 'Failed to generate consultation code.', 'error');
    } finally {
      setGeneratingCode(false);
    }
  };

  const copyCode = () => {
    if (codeData?.code) {
      navigator.clipboard.writeText(codeData.code);
      setCopied(true);
      addToast('Code copied to clipboard.', 'info');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (!isOpen) return null;

  const filteredDoctors = doctors.filter((doc) =>
    (doc.name || '').toLowerCase().includes(searchDoctor.toLowerCase()) ||
    (doc.specialization || '').toLowerCase().includes(searchDoctor.toLowerCase()) ||
    (doc.hospital || '').toLowerCase().includes(searchDoctor.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="glass-card w-full max-w-xl rounded-3xl border border-slate-800 p-6 space-y-5 relative shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Connect with Healthcare Provider</h3>
              <p className="text-xs text-slate-400">Authorize a verified physician to review your medical profile</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex p-1 bg-slate-900/80 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('browse')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'browse'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Select Verified Doctor</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'code'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>In-Clinic Consultation Code</span>
          </button>
        </div>

        {/* Tab 1: Browse Verified Doctors */}
        {activeTab === 'browse' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search by doctor name, specialization, hospital..."
                value={searchDoctor}
                onChange={(e) => setSearchDoctor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {loadingDoctors ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading verified doctors...</div>
              ) : filteredDoctors.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No verified doctors found.</div>
              ) : (
                filteredDoctors.map((doc) => (
                  <div
                    key={doc.doctorId}
                    onClick={() => setSelectedDoctorId(doc.doctorId)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                      selectedDoctorId === doc.doctorId
                        ? 'bg-brand-500/10 border-brand-500/60 shadow-md shadow-brand-500/10'
                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-white text-xs border border-slate-700">
                        {doc.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs font-bold text-white">Dr. {doc.name}</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 font-semibold border border-brand-500/20">
                            Verified
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{doc.specialization} • {doc.hospital}</p>
                        <p className="text-[10px] text-slate-500">{doc.experienceYears} years experience</p>
                      </div>
                    </div>

                    <div className="w-5 h-5 rounded-full border flex items-center justify-center text-white text-xs">
                      {selectedDoctorId === doc.doctorId ? (
                        <div className="w-3 h-3 bg-brand-500 rounded-full" />
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedDoctorId && (
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">Designate as Primary Attending Doctor</label>
                  <input
                    type="checkbox"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 bg-slate-950 border-slate-700"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-[11px] font-semibold text-slate-400 shrink-0">Relationship Label:</label>
                  <input
                    type="text"
                    value={relationshipLabel}
                    onChange={(e) => setRelationshipLabel(e.target.value)}
                    placeholder="e.g. Cardiologist"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                  />
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end space-x-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedDoctorId || submittingRequest}
                onClick={handleSendRequest}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 transition-all flex items-center space-x-1.5 shadow-lg shadow-brand-500/20"
              >
                {submittingRequest ? 'Sending Request...' : 'Send Connection Request'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Consultation Code Generation */}
        {activeTab === 'code' && (
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 text-slate-300 text-xs flex items-start space-x-2.5">
              <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">Physician Discovery Security</span>
                To protect your privacy, clinicians can only link with your account if you provide this single-use consultation code during your clinical check-in.
              </div>
            </div>

            {codeData ? (
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-brand-500/40 text-center space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Active Consultation Code
                </span>
                <div className="text-3xl font-black tracking-widest text-brand-400 font-mono py-2 bg-slate-950/70 rounded-xl border border-slate-800 max-w-xs mx-auto">
                  {codeData.code}
                </div>

                <div className="flex items-center justify-center space-x-4 text-xs text-slate-400">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Valid for {codeData.validityMinutes || 15} minutes</span>
                  </div>
                  <button
                    onClick={copyCode}
                    className="flex items-center space-x-1 text-brand-400 hover:text-brand-300 font-bold"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 pt-1">
                  Once your doctor enters this code in their clinical dashboard, you will be prompted to confirm access.
                </p>
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <QrCode className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click below to generate a temporary 6-character code to share with your doctor during visit.
                </p>
                <button
                  type="button"
                  disabled={generatingCode}
                  onClick={handleGenerateCode}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-cyan-500 hover:from-brand-500 hover:to-cyan-400 shadow-lg shadow-brand-500/20 transition-all inline-flex items-center space-x-2"
                >
                  <QrCode className="w-4 h-4" />
                  <span>{generatingCode ? 'Generating Code...' : 'Generate 6-Digit Code'}</span>
                </button>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
