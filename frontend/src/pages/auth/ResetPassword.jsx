import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { authService } from '../../services/authService';
import { useToast } from '../../hooks/useToast';

export const ResetPassword = () => {
  const { token: routeToken } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const token = routeToken || searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      addToast('Password reset token is missing from the link.', 'error');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      addToast('Password must be at least 8 characters long.', 'warning');
      return;
    }

    if (newPassword !== confirmPassword) {
      addToast('Passwords do not match. Please re-enter.', 'warning');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      await authService.resetPassword({
        token,
        newPassword,
        confirmPassword,
      });

      setResetSuccess(true);
      addToast('Password updated successfully! Please sign in with your new password.', 'success');
    } catch (err) {
      const msg = err?.message || 'Password reset failed. The link may have expired or already been used.';
      setErrorMessage(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Missing Token State
  if (!token) {
    return (
      <div className="space-y-6 text-center py-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
          <AlertCircle className="h-9 w-9" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-white">Reset Token Missing</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-sm mx-auto">
            Please click the password reset link sent to your email address or request a new one below.
          </p>
        </div>
        <div>
          <Link
            to="/forgot-password"
            className="inline-block py-2.5 px-6 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 transition-colors"
          >
            Request New Reset Link
          </Link>
        </div>
      </div>
    );
  }

  // Success State
  if (resetSuccess) {
    return (
      <div className="space-y-6 text-center py-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-white">Password Updated!</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-sm mx-auto">
            Your password has been changed securely. You can now sign in to your MedScan-NCD workspace with your new credentials.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-cyan-500 hover:from-brand-600 hover:to-cyan-600 shadow-lg shadow-brand-500/25 flex items-center justify-center space-x-2 transition-all"
          >
            <span>Proceed to Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Active Reset Form
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-white">Choose New Password</h2>
        <p className="text-xs text-slate-400 mt-1">
          Set a secure, strong password of at least 8 characters.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs leading-relaxed space-y-1">
          <p className="font-bold">Reset Link Invalid or Expired</p>
          <p>{errorMessage}</p>
          <Link to="/forgot-password" className="text-brand-300 underline font-semibold block pt-1">
            Request a fresh password reset link →
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1">New Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1">Confirm New Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-cyan-500 hover:from-brand-600 hover:to-cyan-600 shadow-lg shadow-brand-500/25 flex items-center justify-center space-x-2 transition-all mt-4 disabled:opacity-60"
        >
          <span>{loading ? 'Updating Password...' : 'Save New Password'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="text-center pt-2">
        <Link to="/login" className="text-xs text-slate-400 hover:text-white underline">
          Cancel and return to sign in
        </Link>
      </div>
    </div>
  );
};
