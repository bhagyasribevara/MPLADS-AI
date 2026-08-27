import React, { useEffect, useState } from 'react';
import { alertsAPI } from '../services/api';
import RiskBadge from '../components/RiskBadge';
import AnomalyModal from '../components/AnomalyModal';
import { ShieldAlert, Sparkles, Filter, RefreshCw, CheckCircle, ArrowRight } from 'lucide-react';

const AlertsCenter = () => {
  const [alerts, setAlerts] = useState([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await alertsAPI.getAll({
        limit: 50,
        status: statusFilter || undefined,
        anomaly_type: typeFilter || undefined,
      });
      if (res.data) {
        setAlerts(res.data.alerts || []);
        setTotal(res.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter, typeFilter]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Statutory Vigilance & Anomaly Command Center
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time multi-dimensional fraud surveillance: Duplicate civil works, ghost allocations, cost inflation, and contractor cartels.
          </p>
        </div>

        <button
          onClick={fetchAlerts}
          className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Filter Chips */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="">All Anomaly Types (78)</option>
            <option value="DUPLICATE_WORK">Duplicate Works (&lt; 200m)</option>
            <option value="GHOST_PROJECT">Ghost Projects (Fund leakage)</option>
            <option value="COST_OVERRUN">Cost Overrun / Padding</option>
            <option value="VENDOR_MONOPOLY">Contractor Monopoly Syndicate</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open (Requires Inspection)</option>
            <option value="INVESTIGATING">Under Investigation</option>
            <option value="RESOLVED">Resolved & Cleared</option>
          </select>
        </div>
      </div>

      {/* Alerts Feed */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500 font-medium">
          Loading statutory vigilance alerts...
        </div>
      ) : alerts.length === 0 ? (
        <div className="py-20 text-center text-xs text-slate-500 font-medium">
          No anomaly records matched the selected filters.
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <div
              key={a.alert_id}
              onClick={() => setSelectedProjectId(a.project_id)}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/40 hover:border-red-300 dark:hover:border-red-800 hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {a.project_code}
                  </span>
                  <RiskBadge anomalyType={a.anomaly_type} riskScore={a.confidence_score} isFlagged={true} />
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    a.alert_status === 'RESOLVED' 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                      : a.alert_status === 'INVESTIGATING'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                  }`}>
                    {a.alert_status}
                  </span>
                </div>

                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                  {a.project_title}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-300 font-serif italic line-clamp-2">
                  "{a.explanation}"
                </p>

                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span>District: <strong className="text-slate-600 dark:text-slate-300">{a.district}, {a.state}</strong></span>
                  <span>•</span>
                  <span>Confidence: <strong className="text-gov-600 dark:text-gov-400">{Math.round(a.confidence_score * 100)}%</strong></span>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-3">
                <button
                  className="px-3.5 py-1.5 rounded-lg bg-gov-50 dark:bg-gov-950/60 hover:bg-gov-100 text-gov-700 dark:text-gov-300 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <span>Open Audit Dossier</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Anomaly Modal */}
      {selectedProjectId && (
        <AnomalyModal
          projectId={selectedProjectId}
          onClose={() => setSelectedProjectId(null)}
          onUpdateStatus={() => fetchAlerts()}
        />
      )}

    </div>
  );
};

export default AlertsCenter;
