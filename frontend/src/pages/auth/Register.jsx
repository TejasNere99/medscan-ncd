import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Building, ArrowRight, CheckCircle2, Clock, RotateCcw, Zap } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { authService } from '../../services/authService';

export const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    village: '',
  });
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [activating, setActivating] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [pendingVerificationToken, setPendingVerificationToken] = useState('');
  const [emailDelivered, setEmailDelivered] = useState(true);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password) {
      addToast('Please fill out all required fields.', 'warning');
      return;
    }

    if (formData.password.length < 8) {
      addToast('Password must be at least 8 characters long.', 'warning');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      addToast('Passwords do not match. Please re-enter.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        village: formData.village || undefined,
        role: 'Patient',
      });

      const isAuto = res?.data?.autoVerified || res?.data?.user?.isEmailVerified;
      if (isAuto) {
        addToast('Account created and activated! You can now sign in.', 'success');
        navigate('/login');
        return;
      }

      const delivered = res?.data?.emailDelivered ?? true;
      const fallbackToken = res?.data?.verificationToken || res?.verificationToken;
      if (fallbackToken) {
        setPendingVerificationToken(fallbackToken);
      }

      setEmailDelivered(delivered);
      setPendingVerificationEmail(formData.email.trim());
      setCooldown(60);

      addToast(
        delivered
          ? 'Account created! Please check your email to verify your address.'
          : 'Account created. Outbound SMTP restricted on free cloud tier — use 1-Click Activation below.',
        delivered ? 'success' : 'info'
      );
    } catch (err) {
      addToast(err?.message || 'Registration failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInstantActivate = async () => {
    if (!pendingVerificationToken) return;

    setActivating(true);
    try {
      await authService.verifyEmail(pendingVerificationToken);
      addToast('Account activated successfully! You can now sign in.', 'success');
      navigate('/login');
    } catch (err) {
      addToast(err?.message || 'Failed to activate account.', 'error');
    } finally {
      setActivating(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !pendingVerificationEmail) return;

    setResending(true);
    try {
      await authService.resendVerification(pendingVerificationEmail);
      setCooldown(60);
      setEmailDelivered(true);
      addToast('A fresh verification link has been sent to your email.', 'success');
    } catch (err) {
      addToast(err?.message || 'Failed to resend verification email.', 'error');
    } finally {
      setResending(false);
    }
  };

  // -------------------------------------------------------------
  // View 1: Verification Pending Confirmation Screen
  // -------------------------------------------------------------
  if (pendingVerificationEmail) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
          <Mail className="h-8 w-8" />
        </div>

        <div>
          <h2 className="text-xl font-extrabold text-white">Check Your Inbox</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-sm mx-auto">
            We sent an email verification link to{' '}
            <span className="font-semibold text-brand-300 break-all">{pendingVerificationEmail}</span>.
            Please open the link to activate your Patient workspace.
          </p>
        </div>

        {!emailDelivered && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-left text-xs text-amber-300 space-y-3">
            <div>
              <strong className="block text-amber-200 mb-1">Notice: Outbound Email Blocked by Free Cloud Host</strong>
              <p className="text-[11px] leading-relaxed text-amber-300/90">
                Render free-tier instances block outbound SMTP ports (25/465/587). For faculty evaluation and demonstration, click below to activate your account instantly:
              </p>
            </div>
            {pendingVerificationToken && (
              <button
                type="button"
                disabled={activating}
                onClick={handleInstantActivate}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold flex items-center justify-center space-x-2 shadow-lg transition-all text-xs disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{activating ? 'Activating Account...' : 'Activate Account Instantly (1-Click Verification)'}</span>
              </button>
            )}
          </div>
        )}

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400 text-left space-y-2">
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <span>The link is single-use and will expire in <strong>30 minutes</strong>.</span>
          </div>
          <div className="flex items-start space-x-2">
            <Clock className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
            <span>Check your spam or junk folder if you don't see it within a minute.</span>
          </div>
        </div>


        <div className="space-y-3 pt-2">
          <button
            type="button"
            disabled={cooldown > 0 || resending}
            onClick={handleResend}
            className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-200 border border-slate-700 bg-slate-900/80 hover:bg-slate-800 hover:border-brand-500 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
            <span>
              {cooldown > 0
                ? `Resend available in ${cooldown}s`
                : resending
                ? 'Sending fresh link...'
                : 'Resend verification email'}
            </span>
          </button>

          <div className="flex items-center justify-center space-x-4 text-xs text-slate-400 pt-2">
            <button
              type="button"
              onClick={() => {
                setPendingVerificationEmail('');
                setFormData((prev) => ({ ...prev, email: '', password: '', confirmPassword: '' }));
              }}
              className="text-slate-400 hover:text-white underline"
            >
              Register a different email
            </button>
            <span>•</span>
            <Link to="/login" className="text-brand-400 font-semibold hover:underline">
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // View 2: Registration Form
  // -------------------------------------------------------------
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-white">Create Patient Account</h2>
        <p className="text-xs text-slate-400 mt-1">
          Register to securely analyze lab reports, monitor risk factors, and track personalized medical insights.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1">Full Name</label>
          <div className="relative">
            <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              required
              placeholder="e.g. John Doe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                minLength={8}
                placeholder="Min. 8 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Confirm Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                minLength={8}
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1">Village / Catchment Area</label>
          <div className="relative">
            <Building className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={formData.village}
              onChange={(e) => setFormData({ ...formData, village: e.target.value })}
              placeholder="e.g. Green Valley (optional)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-cyan-500 hover:from-brand-600 hover:to-cyan-600 shadow-lg shadow-brand-500/25 flex items-center justify-center space-x-2 transition-all mt-4 disabled:opacity-60"
        >
          <span>{loading ? 'Creating Account & Sending Link...' : 'Register & Verify Email'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-300">Clinicians & Staff:</span> Doctor, CHO, and Admin accounts cannot self-register; they are provisioned through administrative enrollment.
        </p>
      </div>

      <div className="text-center pt-2">
        <p className="text-xs text-slate-400">
          Already registered?{' '}
          <Link to="/login" className="text-brand-400 font-semibold hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
};
