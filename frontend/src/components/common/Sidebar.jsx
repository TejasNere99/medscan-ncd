import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Pill, FileText, Brain, Calendar, Users, Building2, Activity, Settings, X, ClipboardList, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const menuConfig = {
  Patient: [
    { label: 'Overview', path: '/patient/dashboard', icon: LayoutDashboard },
    { label: 'My Medicines', path: '/patient/medicines', icon: Pill },
    { label: 'Medical Reports', path: '/patient/reports', icon: FileText },
    { label: 'Risk insights', path: '/patient/predictions', icon: Brain },
    { label: 'Appointments', path: '/patient/appointments', icon: Calendar },
  ],
  Doctor: [
    { label: 'Overview', path: '/doctor/dashboard', icon: LayoutDashboard },
    { label: 'Patient Directory', path: '/doctor/patients', icon: Users },
    { label: 'Prescriptions', path: '/doctor/prescriptions', icon: Pill },
    { label: 'Reports & OCR', path: '/doctor/reports', icon: FileText },
    { label: 'Appointments', path: '/doctor/appointments', icon: Calendar },
  ],
  CHO: [
    { label: 'Overview', path: '/cho/dashboard', icon: LayoutDashboard },
    { label: 'Population Health', path: '/cho/population', icon: Building2 },
    { label: 'Disease Overview', path: '/cho/diseases', icon: Activity },
    { label: 'Follow-ups', path: '/cho/follow-ups', icon: ClipboardCheck },
    { label: 'Referrals', path: '/cho/referrals', icon: ClipboardList },
  ],
  Admin: [
    { label: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'User Management', path: '/admin/users', icon: Users },
    { label: 'System Settings', path: '/admin/settings', icon: Settings },
  ],
};

export const Sidebar = ({ mobileOpen, onCloseMobile }) => {
  const { role } = useAuth();
  const navItems = menuConfig[role] || [];
  return (
    <>
      {mobileOpen && <button aria-label="Close navigation" onClick={onCloseMobile} className="fixed inset-0 z-40 bg-stone-900/30 lg:hidden" />}
      <aside className={`fixed inset-y-[68px] left-0 z-40 w-[250px] border-r border-stone-200 bg-white p-4 transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`} aria-label={`${role || 'User'} navigation`}>
        <div className="mb-6 flex items-center justify-between px-3 pt-2 lg:hidden">
          <span className="text-xs font-semibold uppercase tracking-[.16em] text-stone-500">Navigation</span>
          <button aria-label="Close navigation" onClick={onCloseMobile} className="rounded-md p-2 text-stone-500 hover:bg-stone-100"><X size={18} /></button>
        </div>
        <p className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-[.14em] text-stone-400">{role || 'Workspace'}</p>
        <nav className="space-y-1">
          {navItems.map(({ label, path, icon: Icon }) => <NavLink key={path} to={path} onClick={onCloseMobile} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${isActive ? 'bg-violet-50 text-violet-800' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}>
            <Icon size={17} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span>
          </NavLink>)}
        </nav>
        <div className="absolute bottom-5 left-4 right-4 border-t border-stone-100 px-3 pt-4">
          <p className="text-xs font-medium text-stone-600">Your health, made clearer.</p>
          <p className="mt-1 text-[11px] text-stone-400">Secure health information</p>
        </div>
      </aside>
    </>
  );
};
