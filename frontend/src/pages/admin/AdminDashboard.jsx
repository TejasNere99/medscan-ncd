import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Users, ShieldCheck, Settings, Trash2, Cpu, Search, Plus, Save, Filter, CheckCircle2 } from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { Modal } from '../../components/common/Modal';
import { userService } from '../../services/userService';
import { settingService } from '../../services/settingService';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../hooks/useToast';

export const AdminDashboard = () => {
  const { addToast } = useToast();
  const location = useLocation();

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const debouncedSearch = useDebounce(search, 300);

  // Settings State
  const [settings, setSettings] = useState({
    systemName: 'Smart Medicine Reminder & AI Disease Prediction System',
    iotSyncIntervalSeconds: 15,
    emailNotificationsEnabled: true,
    ocrAutoTrigger: true,
    aiModelVersion: 'v1.2.4-rule-weighted',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Add User Modal
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: 'Password123!',
    role: 'Patient',
    village: 'Green Valley',
  });

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await userService.getUsers();
      const userList = res.data || res;
      setUsers(Array.isArray(userList) ? userList : []);
    } catch (e) {
      addToast('Failed to load user accounts.', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await settingService.getSettings();
      const data = res.data || res;
      if (data) setSettings(data);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchSettings();
  }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/users')) {
      document.getElementById('admin-user-management')?.scrollIntoView({ behavior: 'smooth' });
    } else if (path.includes('/settings')) {
      document.getElementById('admin-settings-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.pathname]);

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user account?')) return;
    try {
      await userService.deleteUser(id);
      addToast('User account deleted successfully.', 'success');
      fetchUsers();
    } catch (e) {
      addToast('Failed to delete user account.', 'error');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) {
      addToast('Name and email are required.', 'warning');
      return;
    }

    try {
      await userService.createUser(newUser);
      addToast(`User ${newUser.name} created!`, 'success');
      setAddUserModalOpen(false);
      setNewUser({ name: '', email: '', password: 'Password123!', role: 'Patient', village: 'Green Valley' });
      fetchUsers();
    } catch (e) {
      addToast(e.message || 'Failed to create user.', 'error');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await settingService.updateSettings(settings);
      addToast('System settings updated and synchronized with MongoDB!', 'success');
    } catch (e) {
      addToast('Failed to update system settings.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) || u.email?.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total System Users" value={users.length || 6} icon={Users} color="rose" />
        <StatCard title="Active User Roles" value="6 Roles" icon={ShieldCheck} color="cyan" description="RBAC Enforced" />
        <StatCard title="IoT Devices Sync" value={`${settings.iotSyncIntervalSeconds}s`} icon={Cpu} color="emerald" description="ESP32 Telemetry interval" />
        <StatCard title="AI Engine Version" value={settings.aiModelVersion || 'v1.2.4'} icon={Settings} color="purple" description="Rule-Weighted Engine" />
      </div>

      {/* User Directory */}
      <div id="admin-user-management" className="glass-card rounded-3xl border border-slate-800 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-white">Global User & Access Management</h3>
            <p className="text-xs text-slate-400">View, filter, create, and manage system accounts</p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setAddUserModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20 flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add New User</span>
            </button>

            {/* Role Filter */}
            <div className="flex items-center space-x-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none"
              >
                <option value="All" className="bg-slate-900">All Roles</option>
                <option value="Patient" className="bg-slate-900">Patient</option>
                <option value="Doctor" className="bg-slate-900">Doctor</option>
                <option value="Family" className="bg-slate-900">Family</option>
                <option value="Nurse" className="bg-slate-900">Nurse</option>
                <option value="CHO" className="bg-slate-900">CHO</option>
                <option value="Admin" className="bg-slate-900">Admin</option>
              </select>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user name or email..."
                className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none w-52"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase">
                <th className="py-3 px-4">User Name</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Village</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loadingUsers ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">Loading user accounts...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500">No matching user accounts found.</td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-white flex items-center space-x-3">
                      <img src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256'} alt={u.name} className="w-7 h-7 rounded-lg object-cover" />
                      <span>{u.name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded border border-slate-700 bg-slate-900 font-bold text-cyan-400">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{u.village}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteUser(u._id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Settings Form */}
      <div id="admin-settings-section" className="glass-card rounded-3xl border border-slate-800 p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
              <Settings className="w-5 h-5 text-brand-400" />
              <span>System Configuration & Platform Settings</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Configure live telemetry sync intervals, AI model versioning, and automated triggers</p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
            MongoDB Synced
          </span>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-300 mb-1.5">System Title / Platform Name</label>
              <input
                type="text"
                value={settings.systemName}
                onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1.5">IoT Telemetry Sync Interval (Seconds)</label>
              <input
                type="number"
                min={5}
                max={300}
                value={settings.iotSyncIntervalSeconds}
                onChange={(e) => setSettings({ ...settings, iotSyncIntervalSeconds: parseInt(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-300 mb-1.5">AI Risk Model Version</label>
              <input
                type="text"
                value={settings.aiModelVersion}
                onChange={(e) => setSettings({ ...settings, aiModelVersion: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-6 pt-5">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.emailNotificationsEnabled}
                  onChange={(e) => setSettings({ ...settings, emailNotificationsEnabled: e.target.checked })}
                  className="rounded border-slate-800 bg-slate-950 text-brand-500 focus:ring-brand-500"
                />
                <span className="font-bold text-slate-300">Enable Email Notifications</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.ocrAutoTrigger}
                  onChange={(e) => setSettings({ ...settings, ocrAutoTrigger: e.target.checked })}
                  className="rounded border-slate-800 bg-slate-950 text-brand-500 focus:ring-brand-500"
                />
                <span className="font-bold text-slate-300">Auto Trigger OCR on Report Upload</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20 flex items-center space-x-2 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{savingSettings ? 'Saving Settings...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Add User Modal */}
      <Modal isOpen={addUserModalOpen} onClose={() => setAddUserModalOpen(false)} title="Create New System User Account">
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Alex Vance"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="alex@example.com"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Role</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:border-brand-500 focus:outline-none"
              >
                <option value="Patient">Patient</option>
                <option value="Doctor">Doctor</option>
                <option value="Family">Family</option>
                <option value="Nurse">Nurse</option>
                <option value="CHO">CHO</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Village</label>
              <input
                type="text"
                value={newUser.village}
                onChange={(e) => setNewUser({ ...newUser, village: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setAddUserModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
              Create Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
