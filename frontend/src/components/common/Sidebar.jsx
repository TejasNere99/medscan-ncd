import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Pill,
  FileText,
  Brain,
  Calendar,
  Users,
  Building2,
  Activity,
  UserCheck,
  ShieldCheck,
  Bell,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const Sidebar = ({ mobileOpen, onCloseMobile }) => {
  const { role } = useAuth();

  const menuConfig = {
    Patient: [
      { label: 'Overview', path: '/patient/dashboard', icon: LayoutDashboard },
      { label: 'My Medicines', path: '/patient/medicines', icon: Pill },
      { label: 'Medical Reports', path: '/patient/reports', icon: FileText },
      { label: 'AI Risk Assessment', path: '/patient/predictions', icon: Brain },
      { label: 'Appointments', path: '/patient/appointments', icon: Calendar },
    ],
    Doctor: [
      { label: 'Overview', path: '/doctor/dashboard', icon: LayoutDashboard },
      { label: 'Patient Directory', path: '/doctor/patients', icon: Users },
      { label: 'Prescriptions', path: '/doctor/prescriptions', icon: Pill },
      { label: 'Reports & OCR', path: '/doctor/reports', icon: FileText },
      { label: 'Appointments', path: '/doctor/appointments', icon: Calendar },
    ],
    Family: [
      { label: 'Overview', path: '/family/dashboard', icon: LayoutDashboard },
      { label: 'Linked Patient', path: '/family/patient', icon: UserCheck },
      { label: 'Adherence Logs', path: '/family/logs', icon: Activity },
    ],
    Nurse: [
      { label: 'Overview', path: '/nurse/dashboard', icon: LayoutDashboard },
      { label: 'Assigned Patients', path: '/nurse/patients', icon: Users },
      { label: 'Daily Monitoring', path: '/nurse/monitoring', icon: Activity },
    ],
    CHO: [
      { label: 'Overview', path: '/cho/dashboard', icon: LayoutDashboard },
      { label: 'Population Health', path: '/cho/population', icon: Building2 },
      { label: 'Disease Prevalence', path: '/cho/diseases', icon: Activity },
    ],
    Admin: [
      { label: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'User Management', path: '/admin/users', icon: Users },
      { label: 'System Settings', path: '/admin/settings', icon: Settings },
    ],
  };

  const navItems = menuConfig[role] || menuConfig.Patient;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-[65px] bottom-0 left-0 z-40 w-64 glass-panel border-r border-slate-800/80 p-4 transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full justify-between">
          <div className="space-y-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-3">
                {role} Workspace Navigation
              </p>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onCloseMobile}
                      className={({ isActive }) =>
                        `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30 shadow-lg shadow-brand-500/10'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Footer Info Box */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>IoT Telemetry Online</span>
            </div>
            <p className="text-[11px] text-slate-500">ESP32 Sync Engine v1.2.4</p>
          </div>
        </div>
      </aside>
    </>
  );
};
