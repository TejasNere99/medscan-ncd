import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle, RotateCcw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { authService } from '../../services/authService';

const showDemoAccounts = import.meta.env.VITE_ENABLE_DEMO_ACCOUNTS !== undefined
  ? import.meta.env.VITE_ENABLE_DEMO_ACCOUNTS === 'true'
  : import.meta.env.DEV;

const demoAccounts = showDemoAccounts
  ? [
      { role: 'Patient', email: 'synthetic.patient.a@example.com', password: 'MedScanDemo!2026', label: 'Patient Demo', subtitle: 'Aarav Sharma · Reports & 4 ML Models' },
      { role: 'Doctor', email: 'doctor@example.com', password: 'MedScanDemo!2026', label: 'Doctor Demo', subtitle: 'Dr. Clinician · Patients & Requests' },
      { role: 'CHO', email: 'cho@example.com', password: 'MedScanDemo!2026', label: 'CHO Demo', subtitle: 'Community Officer · Triage & Referrals' },
    ]
  : [];

export const Login = () => {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [unverifiedState, setUnverifiedState] = useState(null);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setUnverifiedState(null);

    if (!email || !password) {
      addToast('Please provide both email and password.', 'warning');
      return;
    }

    setLoading(true);

    try {
      const response = await login(email, password);

      const user = response?.data?.user || response?.user;

      if (!user) {
        throw new Error('User information not received from server.');
      }

      addToast(`Welcome back, ${user.name}!`, 'success');

      const userRole = user.role;
      if (!userRole) {
        throw new Error('User role not received from server.');
      }

      navigate(`/${userRole.toLowerCase()}/dashboard`);
    } catch (err) {
      const errorCode = err?.response?.data?.data?.code || err?.code;
      const isUnverified = errorCode === 'EMAIL_NOT_VERIFIED' || err?.message?.toLowerCase().includes('verify your email');

      if (isUnverified) {
        setUnverifiedState(email);
        addToast('Email verification required before signing in.', 'warning');
      } else {
        addToast(
          err?.message || 'Login failed. Invalid email or password credentials.',
          'error'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendFromLogin = async () => {
    const targetEmail = unverifiedState || email;
    if (!targetEmail) return;

    setResending(true);
    try {
      await authService.resendVerification(targetEmail);
      setCooldown(60);
      addToast('A fresh verification link has been sent to your email.', 'success');
    } catch (err) {
      addToast(err?.message || 'Failed to resend verification email.', 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-stone-900">
          Sign In to Workspace
        </h2>
        <p className="text-xs text-stone-600 mt-1">
          Access your personalized role dashboard, medical reports, and AI risk predictions.
        </p>
      </div>

      {unverifiedState && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 space-y-3">
          <div className="flex items-center space-x-2 font-bold text-amber-900">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" />
            <span>Email Verification Required</span>
          </div>
          <p className="leading-relaxed text-stone-700">
            Your account email (<span className="font-semibold text-stone-900">{unverifiedState}</span>) has not been verified yet. Check your inbox for the activation link, or request a new one below.
          </p>
          <button
            type="button"
            disabled={resending || cooldown > 0}
            onClick={handleResendFromLogin}
            className="py-1.5 px-3 rounded-lg border border-amber-400 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold inline-flex items-center space-x-1.5 transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
            <span>
              {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Dispatching...' : 'Resend Verification Email'}
            </span>
          </button>
        </div>
      )}

      {demoAccounts.length > 0 && (
        <section aria-label="Demo access" className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-stone-900 tracking-wide">Demo Accounts</p>
            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
              SYNTHETIC — FOR DEMO ONLY
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-stone-600">
            Select a role to populate verified demonstration credentials and explore role-specific clinical dashboards.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            {demoAccounts.map((account) => (
              <button
                key={account.role}
                type="button"
                aria-label={`Use ${account.role} demo`}
                disabled={loading}
                onClick={() => {
                  setUnverifiedState(null);
                  setEmail(account.email);
                  setPassword(account.password);
                }}
                className="text-left rounded-lg border border-stone-200 bg-white p-2.5 transition-all hover:border-violet-400 hover:bg-stone-50 group disabled:opacity-50 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900">
                    Use {account.role} demo
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 border border-violet-200">
                    {account.role}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-stone-600 line-clamp-1 font-medium">
                  {account.subtitle}
                </p>
              </button>
            ))}
          </div>
          <div className="flex items-start space-x-1.5 pt-2 border-t border-stone-200 text-[10px] text-stone-600">
            <span className="font-bold text-stone-800 shrink-0">Admin Access:</span>
            <span>
              Privileged system administration credentials are protected and stored privately in Git-ignored <code className="text-violet-800 font-bold font-mono">.demo_credentials.local.json</code>. Enter Admin credentials directly in the sign-in form below.
            </span>
          </div>
        </section>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (unverifiedState) setUnverifiedState(null);
              }}
              placeholder="patient@example.com"
              className="w-full bg-white border border-stone-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-violet-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-bold text-stone-700">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs text-violet-700 font-semibold hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white border border-stone-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:border-violet-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-cyan-500 hover:from-brand-600 hover:to-cyan-600 shadow-lg shadow-brand-500/25 flex items-center justify-center space-x-2 transition-all mt-2 disabled:opacity-60"
        >
          <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Footer */}
      <div className="text-center pt-2">
        <p className="text-xs text-stone-600">
          Need a Patient account?{' '}
          <Link to="/register" className="text-violet-700 font-semibold hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};
