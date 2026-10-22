import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { authService } from '../../services/authService';
import { useToast } from '../../hooks/useToast';

export const ForgotPassword = () => {
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      addToast('Please enter your email address.', 'warning');
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setSubmitted(true);
      addToast('If registered, password reset instructions have been sent.', 'success');
    } catch (err) {
      addToast(err?.message || 'Failed to request password reset.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/login" className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to sign in</span>
        </Link>
        <h2 className="text-xl font-extrabold text-white">Reset Account Password</h2>
        <p className="text-xs text-slate-400 mt-1">
          Enter your registered email address and we'll dispatch a secure, single-use password reset link.
        </p>
      </div>

      {submitted ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs leading-relaxed space-y-2">
            <div className="flex items-center space-x-2 font-bold text-white">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Password Reset Request Received</span>
            </div>
            <p>
              If an account matches <strong className="text-emerald-200">{email}</strong>, you will receive an email shortly with instructions.
            </p>
            <p className="text-[11px] text-slate-400">
              The reset link will be valid for <strong>15 minutes</strong>. Remember to check your spam/junk folder.
            </p>
          </div>

          <div className="pt-2 flex flex-col space-y-2">
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setEmail('');
              }}
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-300 border border-slate-700 bg-slate-900/60 hover:bg-slate-800"
            >
              Send to another email
            </button>
            <Link
              to="/login"
              className="text-center text-xs text-brand-400 hover:underline pt-2 font-semibold"
            >
              Return to Sign In
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Registered Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="patient@example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-cyan-500 hover:from-brand-600 hover:to-cyan-600 shadow-lg shadow-brand-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? 'Dispatching Reset Link...' : 'Send Reset Link'}</span>
          </button>
        </form>
      )}
    </div>
  );
};
