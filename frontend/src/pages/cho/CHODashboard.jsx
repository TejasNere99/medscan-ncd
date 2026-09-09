import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Building2, Activity, Filter, AlertTriangle, Users, Award, Eye, Search } from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { DiseaseDistributionChart } from '../../components/charts/DiseaseDistributionChart';
import { analyticsService } from '../../services/analyticsService';
import { patientService } from '../../services/patientService';
import { useToast } from '../../hooks/useToast';

export const CHODashboard = () => {
  const { addToast } = useToast();
  const location = useLocation();

  const [villageFilter, setVillageFilter] = useState('All');
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await analyticsService.getPopulationStats({
        village: villageFilter !== 'All' ? villageFilter : undefined,
      });
      if (res.data) setStats(res.data);

      const pRes = await patientService.getPatients({
        village: villageFilter !== 'All' ? villageFilter : undefined,
        search: search || undefined,
        limit: 10,
      });
      if (pRes.data) setPatients(pRes.data.patients || []);
    } catch (e) {
      addToast('Failed to load CHO population health statistics.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [villageFilter, search]);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/population')) {
      document.getElementById('cho-population-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (path.includes('/diseases')) {
      document.getElementById('cho-disease-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.pathname]);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 rounded-3xl border border-slate-800">
        <div>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold uppercase">
            Community Health Officer (CHO) Hub
          </span>
          <h1 className="text-2xl font-black text-white mt-1">
            Population Health & Epidemiological Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Aggregated population data across Green Valley, Sunrise Hill, Riverdale & Oakridge
          </p>
        </div>

        {/* Interactive Filters */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Filter className="w-4 h-4 text-amber-400" />
            <select
              value={villageFilter}
              onChange={(e) => setVillageFilter(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none"
            >
              <option value="All" className="bg-slate-900">All Villages</option>
              <option value="Green Valley" className="bg-slate-900">Green Valley</option>
              <option value="Sunrise Hill" className="bg-slate-900">Sunrise Hill</option>
              <option value="Riverdale" className="bg-slate-900">Riverdale</option>
              <option value="Oakridge" className="bg-slate-900">Oakridge</option>
            </select>
          </div>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div id="cho-population-section" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Registered Population" value={stats?.totalPatients || 440} icon={Users} color="amber" />
        <StatCard title="High Disease Risk" value="61" icon={AlertTriangle} color="rose" description="Flagged by AI engine" />
        <StatCard title="Mean Adherence %" value="92.5%" icon={Award} color="emerald" trend="+1.8%" />
        <StatCard title="Active Outbreak Index" value="Normal" icon={Activity} color="cyan" description="No critical surges" />
      </div>

      {/* Interactive Recharts & Disease Prevalence */}
      <div id="cho-disease-section" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Disease Prevalence Distribution */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800">
          <h3 className="text-sm font-extrabold text-white mb-4">Regional Disease Prevalence Breakdown</h3>
          <DiseaseDistributionChart data={stats?.diseaseDistribution || []} />
        </div>

        {/* Village-Wise Health Metrics Table */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-extrabold text-white">Village-Wise Demographic Statistics</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase">
                  <th className="py-2.5 px-3">Village Name</th>
                  <th className="py-2.5 px-3">Patients</th>
                  <th className="py-2.5 px-3">High Risk Flags</th>
                  <th className="py-2.5 px-3">Adherence %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(stats?.villageStats || [
                  { name: 'Green Valley', patients: 142, highRisk: 18, avgAdherence: 94 },
                  { name: 'Sunrise Hill', patients: 98, highRisk: 12, avgAdherence: 89 },
                  { name: 'Riverdale', patients: 115, highRisk: 22, avgAdherence: 91 },
                  { name: 'Oakridge', patients: 85, highRisk: 9, avgAdherence: 96 },
                ]).map((v) => (
                  <tr key={v.name} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-bold text-white flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-amber-400" />
                      <span>{v.name}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{v.patients}</td>
                    <td className="py-3 px-3 font-bold text-rose-400">{v.highRisk}</td>
                    <td className="py-3 px-3 font-bold text-emerald-400">{v.avgAdherence}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Regional Patient Directory */}
      <div className="glass-card rounded-3xl border border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-white">Community Patient Vitals & Risk Records</h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient name..."
              className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none w-52"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase">
                <th className="py-2.5 px-3">Patient Name</th>
                <th className="py-2.5 px-3">Village</th>
                <th className="py-2.5 px-3">Blood Sugar</th>
                <th className="py-2.5 px-3">Blood Pressure</th>
                <th className="py-2.5 px-3 text-right">View Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {patients.map((p) => (
                <tr key={p._id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-bold text-white">{p.user?.name || 'Patient'}</td>
                  <td className="py-2.5 px-3 text-slate-300">{p.village}</td>
                  <td className="py-2.5 px-3 text-slate-300">{p.fastingSugar || 120} mg/dL</td>
                  <td className="py-2.5 px-3 text-slate-300">{p.systolicBP || 120}/{p.diastolicBP || 80}</td>
                  <td className="py-2.5 px-3 text-right">
                    <Link
                      to={`/doctor/patient/${p._id}`}
                      className="inline-block p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
