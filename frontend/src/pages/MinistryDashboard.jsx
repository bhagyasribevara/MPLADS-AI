import React, { useEffect, useState } from 'react';
import { analyticsAPI, alertsAPI } from '../services/api';
import LeafletMap from '../components/LeafletMap';
import RiskBadge from '../components/RiskBadge';
import AnomalyModal from '../components/AnomalyModal';
import {
  IndianRupee,
  Percent,
  ShieldAlert,
  FolderKanban,
  TrendingUp,
  MapPin,
  Sparkles,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Legend
} from 'recharts';

const formatINR = (amount) => {
  if (!amount) return '₹0';
  const val = parseFloat(amount);
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
};

const MinistryDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [stateRankings, setStateRankings] = useState([]);
  const [districtHotspots, setDistrictHotspots] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, alertsRes] = await Promise.all([
        analyticsAPI.getMetrics(),
        alertsAPI.getAll({ limit: 6, status: 'OPEN' }),
      ]);

      if (analyticsRes.data && analyticsRes.data.metrics) {
        setMetrics(analyticsRes.data.metrics);
        setStateRankings(analyticsRes.data.state_rankings || []);
        setDistrictHotspots(analyticsRes.data.district_hotspots || []);
      }

      if (alertsRes.data && alertsRes.data.alerts) {
        setAlerts(alertsRes.data.alerts);
      }
    } catch (err) {
      console.error('Failed to load ministry dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Format state rankings data for Recharts (in Crores)
  const chartData = stateRankings.map((s) => ({
    state: s.state,
    sanctionedCr: parseFloat((s.sanctioned / 10000000).toFixed(2)),
    disbursedCr: parseFloat((s.disbursed / 10000000).toFixed(2)),
    utilizationRate: parseFloat(s.utilization_rate),
    flagged: parseInt(s.flagged_count, 10),
  }));

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              National Ministry Oversight & Vigilance Portal
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              National View
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time multi-state expenditure monitoring, pgvector collision detection, and automated AI audit alerts.
          </p>
        </div>

        <button
          onClick={loadData}
          className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* 1. Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Allocation */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Sanctioned</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {metrics ? formatINR(metrics.total_sanctioned_inr) : '₹101.57 Cr'}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Disbursed: <span className="font-semibold text-slate-700 dark:text-slate-300">{metrics ? formatINR(metrics.total_disbursed_inr) : '₹64.20 Cr'}</span>
          </p>
        </div>

        {/* Utilization % */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Fund Utilization</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {metrics?.fund_utilization_pct || 63.2}%
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Completed: <span className="font-semibold text-slate-700 dark:text-slate-300">{metrics?.completed_projects || 112}</span> works
          </p>
        </div>

        {/* High-Risk Anomaly Count */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Red Flag Anomalies</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950 text-red-600 flex items-center justify-center animate-pulse">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-600 dark:text-red-400">
            {metrics?.red_flag_count || 78}
          </div>
          <p className="text-[11px] text-red-500 dark:text-red-400 mt-1">
            Flagged Rate: <span className="font-semibold">{metrics?.red_flag_rate_pct || 15.0}%</span> of all works
          </p>
        </div>

        {/* Active Works */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Works</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {metrics?.in_progress_projects || 286}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Total Seeded: <span className="font-semibold text-slate-700 dark:text-slate-300">{metrics?.total_projects || 520}</span> works
          </p>
        </div>

      </div>

      {/* 2. Interactive GIS India Map Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gov-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Interactive GIS Project Distribution & Vigilance Map
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            PostGIS Geometries • Click pin for AI Dossier
          </span>
        </div>

        <LeafletMap
          height="450px"
          onSelectProject={(proj) => setSelectedProjectId(proj.id)}
        />
      </div>

      {/* 3. Cross-State Spending & Utilization Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* State Sanctioned vs Disbursed Bar Chart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                State-wise Allocation vs Expenditure (₹ Crores)
              </h3>
              <p className="text-[11px] text-slate-500">Comparing regional sanction vs actual disbursed funds</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="state" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <RechartsTooltip
                  formatter={(val, name) => [`₹${val} Cr`, name === 'sanctionedCr' ? 'Sanctioned' : 'Disbursed']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '11px', color: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="sanctionedCr" name="Sanctioned (₹ Cr)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="disbursedCr" name="Disbursed (₹ Cr)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* State Utilization Rate % Area Chart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Cross-State Fund Utilization Velocity (%)
              </h3>
              <p className="text-[11px] text-slate-500">Benchmark utilization across monitored states</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="state" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <RechartsTooltip
                  formatter={(val) => [`${val}%`, 'Utilization Rate']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '11px', color: '#fff' }}
                />
                <Area type="monotone" dataKey="utilizationRate" name="Utilization Rate (%)" stroke="#059669" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 4. Priority National Vigilance Alert Feed */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Priority National Vigilance Red Flags
            </h3>
          </div>
          <span className="text-xs font-semibold text-red-600 dark:text-red-400">
            {alerts.length} Open Inquiries
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {alerts.map((alert) => (
            <div
              key={alert.alert_id}
              onClick={() => setSelectedProjectId(alert.project_id)}
              className="p-4 rounded-xl border border-red-100 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/20 hover:bg-red-50/70 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-mono font-bold text-slate-500">
                    {alert.project_code}
                  </span>
                  <RiskBadge anomalyType={alert.anomaly_type} riskScore={alert.confidence_score} isFlagged={true} />
                </div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-2 mb-2">
                  {alert.project_title}
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 font-serif italic mb-3">
                  "{alert.explanation}"
                </p>
              </div>

              <div className="pt-2 border-t border-red-100 dark:border-red-900/30 flex items-center justify-between text-[10px] text-slate-500">
                <span>{alert.district}, {alert.state}</span>
                <span className="font-semibold text-gov-600 dark:text-gov-400 flex items-center gap-0.5">
                  Open Dossier <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Anomaly Audit Dossier Modal */}
      {selectedProjectId && (
        <AnomalyModal
          projectId={selectedProjectId}
          onClose={() => setSelectedProjectId(null)}
          onUpdateStatus={() => loadData()}
        />
      )}

    </div>
  );
};

export default MinistryDashboard;
