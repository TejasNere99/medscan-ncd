import React, { useState } from 'react';
import { X, Users, Mail, Link as LinkIcon, Copy, Check, ShieldCheck, ArrowRight } from 'lucide-react';
import { relationshipService } from '../../services/relationshipService';
import { useToast } from '../../hooks/useToast';

export const FamilyInviteModal = ({ isOpen, onClose, onInviteCreated }) => {
  const { addToast } = useToast();
  const [recipientEmail, setRecipientEmail] = useState('');
  const [relationshipLabel, setRelationshipLabel] = useState('Family Member');
  const [submitting, setSubmitting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recipientEmail) {
      addToast('Please provide the recipient email address.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await relationshipService.createFamilyInvite({
        recipientEmail: recipientEmail.trim(),
        relationshipLabel: relationshipLabel.trim(),
      });
      const data = res?.data || res;
      setInviteResult(data);
      addToast('Family invitation created successfully!', 'success');
      if (onInviteCreated) onInviteCreated();
    } catch (err) {
      addToast(err?.message || 'Failed to create family invitation.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (inviteResult?.inviteUrl) {
      navigator.clipboard.writeText(inviteResult.inviteUrl);
      setCopied(true);
      addToast('Invitation link copied to clipboard.', 'info');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleResetAndClose = () => {
    setRecipientEmail('');
    setRelationshipLabel('Family Member');
    setInviteResult(null);
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="glass-card w-full max-w-lg rounded-3xl border border-slate-800 p-6 space-y-5 relative shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Invite Family Caregiver</h3>
              <p className="text-xs text-slate-400">Grant read-only access to a trusted family member</p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {inviteResult ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
              <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Invitation Link Generated!</h4>
              <p className="text-xs text-slate-300">
                Share this secure redemption link with <strong className="text-white">{inviteResult.invitation?.recipientEmail}</strong>.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400">Invitation URL</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={inviteResult.inviteUrl}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-brand-300 select-all font-mono"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 transition-colors flex items-center space-x-1.5 shrink-0 shadow-md shadow-brand-500/20"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start space-x-2.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                This link will remain active for 7 days. Your family member can redeem it to establish an account with access to your vitals and summaries.
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Recipient Email Address *</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="e.g. family.member@gmail.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Relationship Label</label>
              <select
                value={relationshipLabel}
                onChange={(e) => setRelationshipLabel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
              >
                <option value="Spouse">Spouse / Partner</option>
                <option value="Child">Son / Daughter</option>
                <option value="Parent">Father / Mother</option>
                <option value="Sibling">Brother / Sister</option>
                <option value="Caregiver">Primary Caregiver</option>
                <option value="Family Member">Other Family Member</option>
              </select>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start space-x-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
              <span>
                Family accounts receive strictly read-only access. They cannot edit reports, run diagnostic algorithms, or delete records.
              </span>
            </div>

            <div className="pt-2 flex justify-end space-x-2.5">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20"
              >
                {submitting ? 'Generating...' : 'Create Family Invitation'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
