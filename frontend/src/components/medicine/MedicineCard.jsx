import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Clock, Pill, RotateCcw } from 'lucide-react';
import { medicineService } from '../../services/medicineService';
import { useToast } from '../../hooks/useToast';

export const MedicineCard = ({ medicine, onStatusChanged }) => {
  const { addToast } = useToast();
  const [currentStatus, setCurrentStatus] = useState(medicine.status || 'Pending');
  const [loading, setLoading] = useState(false);
  const [previousStatus, setPreviousStatus] = useState(null);

  const handleUpdateStatus = async (newStatus) => {
    setPreviousStatus(currentStatus);
    setCurrentStatus(newStatus); // Optimistic UI update
    setLoading(true);

    try {
      await medicineService.updateStatus(medicine._id, newStatus, '', medicine.logId);
      addToast(`Dose marked as ${newStatus}!`, newStatus === 'Taken' ? 'success' : 'warning');
      if (onStatusChanged) onStatusChanged(medicine._id, newStatus);
    } catch (error) {
      setCurrentStatus(previousStatus || 'Pending'); // Rollback on failure
      addToast('Failed to update dose status.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    Taken: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    Missed: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    Active: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all shadow-xl relative overflow-hidden"
    >
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white tracking-tight">{medicine.name}</h4>
              <p className="text-xs text-slate-400 font-medium">{medicine.dosage}</p>
            </div>
          </div>
          <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase ${statusColors[currentStatus] || statusColors.Active}`}>
            {currentStatus}
          </span>
        </div>

        <p className="text-xs text-slate-300 mb-4 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
          {medicine.instructions || 'Take with water after food.'}
        </p>

        {/* Timings */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {(medicine.timing || ['morning', 'night']).map((t) => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 capitalize font-medium flex items-center space-x-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{t}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Interactive Action Buttons (Optimistic Update) */}
      <div className="flex items-center space-x-2 pt-2 border-t border-slate-800/80">
        <button
          disabled={loading || currentStatus === 'Taken'}
          onClick={() => handleUpdateStatus('Taken')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
            currentStatus === 'Taken'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 opacity-75'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
          }`}
        >
          <Check className="w-4 h-4" />
          <span>Taken</span>
        </button>

        <button
          disabled={loading || currentStatus === 'Missed'}
          onClick={() => handleUpdateStatus('Missed')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
            currentStatus === 'Missed'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 opacity-75'
              : 'bg-slate-800 hover:bg-rose-600/20 text-rose-400 hover:text-rose-300 border border-slate-700'
          }`}
        >
          <X className="w-4 h-4" />
          <span>Missed</span>
        </button>

        {previousStatus && (
          <button
            onClick={() => handleUpdateStatus(previousStatus)}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            title="Undo last action"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
};
