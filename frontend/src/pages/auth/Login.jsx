import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, UserCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

export const Login = () => {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      addToast('Please provide both email and password.', 'warning');
      return;
    }

    setLoading(true);

    try {
      const response = await login(email, password);

      console.log('LOGIN RESPONSE:', response);

      // Support both possible API response structures
      const user =
        response?.data?.user ||
        response?.user;

      if (!user) {
        throw new Error('User information not received from server.');
      }

      addToast(`Welcome back, ${user.name}!`, 'success');

      const userRole = user.role;

      if (!userRole) {
        throw new Error('User role not received from server.');
      }

      // Navigate to role-specific dashboard
      navigate(`/${userRole.toLowerCase()}/dashboard`);

    } catch (err) {
      console.error('LOGIN ERROR:', err);

      addToast(
        err?.message || 'Login failed. Invalid email or password.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div className="space-y-6">

      <div>
        <h2 className="text-xl font-extrabold text-white">
          Sign In to Workspace
        </h2>

        <p className="text-xs text-slate-400 mt-1">
          Access your personalized role dashboard, IoT logs, and AI predictions.
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">

        {/* Email */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">
            Email Address
          </label>

          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="patient@example.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex justify-between items-center mb-1.5">

            <label className="block text-xs font-bold text-slate-300">
              Password
            </label>

            <Link
              to="/forgot-password"
              className="text-xs text-brand-400 hover:underline"
            >
              Forgot password?
            </Link>

          </div>

          <div className="relative">

            <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />

            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none transition-colors"
            />

          </div>
        </div>

        {/* Login Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-cyan-500 hover:from-brand-600 hover:to-cyan-600 shadow-lg shadow-brand-500/25 flex items-center justify-center space-x-2 transition-all mt-2"
        >
          <span>
            {loading ? 'Authenticating...' : 'Sign In'}
          </span>

          <ArrowRight className="w-4 h-4" />
        </button>

      </form>

      {/* Quick Demo Accounts */}
      <div className="pt-4 border-t border-slate-800">

        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center space-x-1.5">

          <UserCheck className="w-3.5 h-3.5 text-brand-400" />

          <span>Quick Demo Login Buttons</span>

        </p>

        <div className="grid grid-cols-2 gap-2 text-[11px]">

          {/* Patient */}
          <button
            type="button"
            onClick={() => handleQuickLogin('patient@example.com')}
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-brand-500 text-left text-slate-300 transition-colors"
          >
            <span className="font-bold text-cyan-400 block">
              Patient
            </span>

            <span className="text-[10px] text-slate-500">
              patient@example.com
            </span>
          </button>

          {/* Doctor */}
          <button
            type="button"
            onClick={() => handleQuickLogin('doctor@example.com')}
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-500 text-left text-slate-300 transition-colors"
          >
            <span className="font-bold text-emerald-400 block">
              Doctor
            </span>

            <span className="text-[10px] text-slate-500">
              doctor@example.com
            </span>
          </button>

          {/* Family */}
          <button
            type="button"
            onClick={() => handleQuickLogin('family@example.com')}
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-purple-500 text-left text-slate-300 transition-colors"
          >
            <span className="font-bold text-purple-400 block">
              Family
            </span>

            <span className="text-[10px] text-slate-500">
              family@example.com
            </span>
          </button>

          {/* Nurse */}
          <button
            type="button"
            onClick={() => handleQuickLogin('nurse@example.com')}
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-pink-500 text-left text-slate-300 transition-colors"
          >
            <span className="font-bold text-pink-400 block">
              Nurse
            </span>

            <span className="text-[10px] text-slate-500">
              nurse@example.com
            </span>
          </button>

          {/* CHO */}
          <button
            type="button"
            onClick={() => handleQuickLogin('cho@example.com')}
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500 text-left text-slate-300 transition-colors"
          >
            <span className="font-bold text-amber-400 block">
              CHO
            </span>

            <span className="text-[10px] text-slate-500">
              cho@example.com
            </span>
          </button>

          {/* Admin */}
          <button
            type="button"
            onClick={() => handleQuickLogin('admin@example.com')}
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-rose-500 text-left text-slate-300 transition-colors"
          >
            <span className="font-bold text-rose-400 block">
              Admin
            </span>

            <span className="text-[10px] text-slate-500">
              admin@example.com
            </span>
          </button>

        </div>
      </div>

      {/* Register */}
      <div className="text-center pt-2">

        <p className="text-xs text-slate-400">

          Don't have an account?{' '}

          <Link
            to="/register"
            className="text-brand-400 font-semibold hover:underline"
          >
            Register here
          </Link>

        </p>

      </div>

    </div>
  );
};