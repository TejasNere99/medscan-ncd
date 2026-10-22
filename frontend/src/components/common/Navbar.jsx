import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Menu, Activity, ChevronDown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { NotificationBell } from '../notification/NotificationBell';

export const Navbar = ({ onToggleMobileSidebar }) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const handleLogout = async () => { await logout(); navigate('/login'); };
  const initials = (user?.name || 'M').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return (
    <header className="sticky top-0 z-50 h-[68px] w-full border-b border-stone-200 bg-white/95 px-4 backdrop-blur-sm lg:px-7">
      <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between">
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Open navigation" onClick={onToggleMobileSidebar} className="rounded-md p-2 text-stone-600 hover:bg-stone-100 lg:hidden"><Menu size={19} /></button>
          <Link to="/" aria-label="MedScan home" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><Activity size={19} strokeWidth={1.8} /></span>
            <span><span className="block text-[15px] font-semibold leading-tight tracking-tight text-stone-900">MedScan</span><span className="block text-[10px] leading-tight text-stone-500">Health, made clearer</span></span>
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? <>
            <NotificationBell />
            <div className="relative">
              <button type="button" aria-haspopup="menu" aria-expanded={showUserMenu} onClick={() => setShowUserMenu((prev) => !prev)} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-stone-50 focus-visible:outline-violet-500">
                <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-800">{initials}</span>
                <span className="hidden text-left sm:block"><span className="block max-w-[140px] truncate text-xs font-semibold text-stone-800">{user.name}</span><span className="block text-[10px] text-stone-500">{role}</span></span>
                <ChevronDown size={14} className="hidden text-stone-400 sm:block" />
              </button>
              {showUserMenu && <div role="menu" className="absolute right-0 mt-2 w-56 rounded-lg border border-stone-200 bg-white p-1 shadow-lg">
                <div className="border-b border-stone-100 px-3 py-2"><p className="truncate text-xs font-semibold text-stone-800">{user.name}</p><p className="truncate text-[11px] text-stone-500">{user.email}</p></div>
                <Link role="menuitem" to={`/${role?.toLowerCase()}/dashboard`} onClick={() => setShowUserMenu(false)} className="block rounded-md px-3 py-2 text-xs text-stone-700 hover:bg-stone-50">My workspace</Link>
                <button role="menuitem" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50"><LogOut size={14} /> Sign out</button>
              </div>}
            </div>
          </> : <div className="flex items-center gap-2"><Link to="/login" className="rounded-md px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100">Sign in</Link><Link to="/register" className="rounded-md bg-violet-700 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-800">Create account</Link></div>}
        </div>
      </div>
    </header>
  );
};
