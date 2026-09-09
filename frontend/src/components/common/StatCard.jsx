import React from 'react';
import { motion } from 'framer-motion';

export const StatCard = ({ title, value, icon: Icon, color = 'cyan', trend, trendType = 'up', description }) => {
  const colorMap = {
    cyan: 'from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/30',
    emerald: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30',
    rose: 'from-rose-500/20 to-red-500/10 text-rose-400 border-rose-500/30',
    amber: 'from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/30',
    purple: 'from-purple-500/20 to-indigo-500/10 text-purple-400 border-purple-500/30',
    pink: 'from-pink-500/20 to-rose-500/10 text-pink-400 border-pink-500/30',
  };

  const badgeColor = {
    up: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    down: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`glass-card p-6 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
        colorMap[color] || colorMap.cyan
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{title}</p>
          <div className="flex items-baseline space-x-2">
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="text-3xl font-extrabold text-white tracking-tight"
            >
              {value}
            </motion.span>
            {trend && (
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badgeColor[trendType]}`}>
                {trend}
              </span>
            )}
          </div>
          {description && <p className="text-xs text-slate-400 mt-2 font-normal">{description}</p>}
        </div>
        {Icon && (
          <div className={`p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-inner group-hover:scale-110 transition-transform`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>

      {/* Decorative subtle background ambient glow */}
      <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-current opacity-10 blur-2xl pointer-events-none rounded-full" />
    </motion.div>
  );
};
