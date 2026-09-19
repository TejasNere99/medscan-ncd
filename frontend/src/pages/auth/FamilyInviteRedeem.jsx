import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Users, Mail, Lock, User, Phone, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { relationshipService } from '../../services/relationshipService';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

export const FamilyInviteRedeem = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    password: '',
    phone: '',
  });

  useEffect(() => {
    const validateToken = async () => {
      try {
        setLoading(true);
        const res = await relationshipService.validateFamilyInvite(token);
        const inviteData = res?.data?.invitation || res?.invitation;
        setInvitation(inviteData);
        setErrorStatus(null);
      } catch (err) {
        setErrorStatus({
          reason: err?.reason || 'INVALID',
          message: err?.message || 'The invitation link is invalid, expired, or has already been redeemed.',
        });
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      validateToken();
    } else {
      setErrorStatus({
        reason: 'NO_TOKEN',
        message: 'No invitation token was provided.',
      });
      setLoading(false);
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.password) {
      addToast('Please enter your full name and choose a secure password.', 'warning');
      return;
    }

    if (formData.password.length < 6) {
      addToast('Password must be at least 6 characters long.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await relationshipService.redeemFamilyInvite(token, {
        name: formData.name.trim(),
        password: formData.password,
        phone: formData.phone.trim(),
      });

      const responseData = res?.data || res;
      const { user, accessToken } = responseData;

      if (accessToken) {
        localStorage.setItem('accessToken', accessToken);
      }
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }

      addToast('Family account created and linked successfully!', 'success');

      if (refreshProfile) {
        await refreshProfile();
      }

      navigate('/family/dashboard');
    } catch (err) {
      addToast(err?.message || 'Failed to redeem invitation. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-10 space-y-4">
        <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-300">Verifying secure invitation token...</p>
      </div>
    );
  }

  if (errorStatus) {
    return (
      <div className="text-center py-6 space-y-5">
        <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-white">Invitation Unavailable</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
            {errorStatus.message}
          </p>
        </div>

        <div className="pt-2">
          <Link
            to="/login"
            className="inline-flex items-center space-x-2 text-xs font-bold text-brand-400 hover:text-brand-300 transition-colors"
          >
            <span>Return to Login</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold mb-3">
          <Users className="w-3.5 h-3.5" />
          <span>Family Caregiver Invitation</span>
        </div>

        <h2 className="text-xl font-black text-white">Accept Family Invitation</h2>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          <strong className="text-white">{invitation?.inviterName || 'Your family member'}</strong> has invited you to
          connect as their <span className="text-brand-400 font-semibold">{invitation?.relationshipLabel || 'Family Member'}</span>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Recipient Email (Locked) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">Invited Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="email"
              disabled
              value={invitation?.recipientEmail || ''}
              className="w-full bg-slate-900/60 border border-slate-800/80 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-400 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-[11px] font-bold text-slate-300 mb-1">Your Full Name</label>
          <div className="relative">
            <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              required
              placeholder="e.g. Sarah Doe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-[11px] font-bold text-slate-300 mb-1">Create Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="password"
              required
              minLength={6}
              placeholder="At least 6 characters"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-[11px] font-bold text-slate-300 mb-1">Phone Number (Optional)</label>
          <div className="relative">
            <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="tel"
              placeholder="+1 555-0199"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Security / Role Notice */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start space-x-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
          <span>
            Family caregiver accounts receive secure read-only access to vitals and diagnostic summaries. You cannot
            modify clinical diagnoses or delete reports.
          </span>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-500 hover:from-brand-500 hover:to-cyan-400 text-white text-xs font-bold transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Activating Account...</span>
            </>
          ) : (
            <>
              <span>Accept & Create Caregiver Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      <div className="text-center pt-1 border-t border-slate-800/80">
        <p className="text-[11px] text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-bold transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};
