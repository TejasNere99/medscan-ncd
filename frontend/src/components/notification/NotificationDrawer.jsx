import React from 'react';
import { motion } from 'framer-motion';
import { CheckCheck, Pill, AlertTriangle, Activity, Calendar, ShieldAlert, X } from 'lucide-react';
import { notificationService } from '../../services/notificationService';

export const NotificationDrawer = ({ notifications = [], onClose, onRefresh }) => {
  const handleMarkRead = async (id) => {
    await notificationService.markAsRead(id);
    onRefresh();
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead();
    onRefresh();
  };

  const getIcon = (type) => {
    switch (type) {
      case 'MissedMedicineAlert':
        return <Pill className="w-4 h-4 text-rose-400" />;
      case 'HighRiskAlert':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'EmergencyAlert':
        return <ShieldAlert className="w-4 h-4 text-rose-500 animate-bounce" />;
      case 'AppointmentReminder':
        return <Calendar className="w-4 h-4 text-cyan-400" />;
      default:
        return <Activity className="w-4 h-4 text-brand-400" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      className="absolute right-0 mt-3 w-80 sm:w-96 glass-card rounded-2xl border border-slate-800 shadow-2xl z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center space-x-2">
          <h4 className="text-sm font-bold text-white">Notification Center</h4>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
            {notifications.length}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-brand-400 hover:underline flex items-center space-x-1"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/50">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">No notifications yet.</div>
        ) : (
          notifications.map((item) => (
            <div
              key={item._id}
              onClick={() => !item.isRead && handleMarkRead(item._id)}
              className={`p-4 transition-colors cursor-pointer hover:bg-slate-800/40 flex items-start space-x-3 ${
                !item.isRead ? 'bg-brand-500/5' : 'opacity-75'
              }`}
            >
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                {getIcon(item.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-semibold ${!item.isRead ? 'text-white' : 'text-slate-300'}`}>
                    {item.title}
                  </p>
                  <span className="text-[10px] text-slate-500">
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{item.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};
