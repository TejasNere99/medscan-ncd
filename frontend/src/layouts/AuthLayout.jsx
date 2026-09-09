import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-[#0b1329] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 blur-[120px] pointer-events-none rounded-full" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-3 group">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-400 text-white shadow-xl shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <Activity className="w-8 h-8" />
            </div>
            <div className="text-left">
              <span className="text-xl font-extrabold text-white tracking-tight block leading-none">
                Smart<span className="text-brand-400">Health</span>
              </span>
              <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">AI & IoT Platform</span>
            </div>
          </Link>
        </div>

        <div className="glass-card p-8 rounded-3xl border border-slate-800 shadow-2xl">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
