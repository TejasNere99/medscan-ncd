import React, { useEffect, useState } from 'react';
import { useSearchParams, useParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, Mail, RotateCcw } from 'lucide-react';
import { authService } from '../../services/authService';
import { useToast } from '../../hooks/useToast';

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const { token: routeToken } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const token = routeToken || searchParams.get('token');

  const [status, setStatus] = useState(token ? 'verifying' : 'no_token');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  useEffect(() => {
    if (!token) {
      setStatus('no_token');
      return;
    }

    let isMounted = true;

    const performVerification = async () => {
      setStatus('verifying');
      try {
        await authService.verifyEmail(token);
        if (isMounted) {
          setStatus('success');
          addToast('Email verified successfully! You may now sign in.', 'success');
        }
      } catch (err) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage(err?.message || 'The verification link is invalid or has expired.');
        }
      }
    };

    performVerification();

    return () => {
      isMounted = false;
    };
  }, [token, addToast]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail) {
      addToast('Please enter your email address.', 'warning');
      return;
    }

    setResending(true);
    try {
      await authService.resendVerification(resendEmail);
      setCooldown(60);
      addToast('If an unverified account matches that email, a fresh verification link was sent.', 'success');
    } catch (err) {
      addToast(err?.message || 'Failed to resend verification email.', 'error');
    } finally {
      setResending(false);
    }
  };

  // State 1: Verifying
  if (status === 'verifying') {
    return (
      <div className="space-y-6 text-center py-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-white">Verifying Email Address</h2>
          <p className="text-xs text-slate-400 mt-2">
            Please wait while we validate your cryptographic verification token...
          </p>
        </div>
      </div>
    );
  }

  // State 2: Success
  if (status === 'success') {
    return (
      <div className="space-y-6 text-center py-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <CheckCircle2 className="h-9 w-9" />
        </div>

        <div>
          <h2 className="text-xl font-extrabold text-white">Email Verified Successfully!</h2>
          <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
            Your MedScan-NCD account is now fully active. You can now sign in to securely upload reports, review clinical data, and evaluate multi-disease risk predictions.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-cyan-500 hover:from-brand-600 hover:to-cyan-600 shadow-lg shadow-brand-500/25 flex items-center justify-center space-x-2 transition-all"
          >
            <span>Sign In to Your Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // State 3 & 4: Error or No Token
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-4">
          <AlertCircle className="h-9 w-9" />
        </div>

        <h2 className="text-xl font-extrabold text-white">
          {status === 'no_token' ? 'Verification Link Required' : 'Verification Link Expired or Invalid'}
        </h2>

        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          {errorMessage || 'Verification links expire after 30 minutes and can only be used once. Please request a new verification link below.'}
        </p>
      </div>

      <form onSubmit={handleResend} className="space-y-3.5 pt-2">
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1">
            Registered Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={resending || cooldown > 0}
          className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-200 border border-slate-700 bg-slate-900/80 hover:bg-slate-800 hover:border-brand-500 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
          <span>
            {cooldown > 0
              ? `Resend available in ${cooldown}s`
              : resending
              ? 'Sending link...'
              : 'Resend Verification Email'}
          </span>
        </button>
      </form>

      <div className="text-center pt-2 border-t border-slate-800">
        <Link to="/login" className="text-xs text-brand-400 hover:underline font-semibold">
          Return to Sign In
        </Link>
      </div>
    </div>
  );
};
