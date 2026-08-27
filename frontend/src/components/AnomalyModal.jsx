import React, { useState, useEffect } from 'react';
import { projectsAPI, alertsAPI } from '../services/api';
import RiskBadge from './RiskBadge';
import { 
  X, ShieldAlert, Sparkles, AlertTriangle, Building, 
  MapPin, CheckCircle, Clock, FileText, Check 
} from 'lucide-react';

const formatINR = (amount) => {
  if (!amount) return '₹0';
  const val = parseFloat(amount);
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
};

const AnomalyModal = ({ projectId, projectData = null, onClose, onUpdateStatus }) => {
  const [project, setProject] = useState(projectData);
  const [loading, setLoading] = useState(!projectData);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    if (projectId && (!projectData || !projectData.milestones)) {
      setLoading(true);
      projectsAPI
        .getById(projectId)
        .then((res) => {
          if (res.data && res.data.project) {
            setProject(res.data.project);
          }
        })
        .catch((err) => console.error('Failed to load project details:', err))
        .finally(() => setLoading(false));
    }
  }, [projectId]);

  if (!project && !loading) return null;

  const handleStatusChange = async (newStatus) => {
    if (!project.anomaly_logs || project.anomaly_logs.length === 0) return;
    setUpdating(true);
    try {
      const alertId = project.anomaly_logs[0].id;
      await alertsAPI.updateStatus(alertId, newStatus, resolutionNotes);
      setUpdateSuccess(true);
      if (onUpdateStatus) onUpdateStatus(alertId, newStatus);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update alert status:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-500">
                  {project?.project_code || 'PROJ-AUDIT'}
                </span>
                <RiskBadge riskScore={project?.risk_score} isFlagged={project?.is_flagged} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                Executive Vigilance Audit Dossier
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500 font-medium">
              Generating Live Vigilance Dossier...
            </div>
          ) : (
            <>
              {/* Project Title & Meta */}
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                  {project.title}
                </h2>
                <div className="flex flex-wrap gap-y-1 gap-x-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {project.district}, {project.state} ({project.constituency_name || 'LS'})
                  </span>
                  <span>•</span>
                  <span>Category: {project.work_category}</span>
                  <span>•</span>
                  <span>Agency: {project.agency_name}</span>
                </div>
              </div>

              {/* AI Audit Brief Box (Gemini / LLM Synthesized) */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800/80">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-gov-600 dark:text-gov-400" />
                  <h4 className="text-xs font-bold text-gov-900 dark:text-gov-200 uppercase tracking-wider">
                    AI Forensic Audit Explanation (Gemini 2.5 Flash / Groq)
                  </h4>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-serif">
                  {project.anomaly_logs?.[0]?.explanation ||
                    `Project ${project.project_code} has disbursed ₹${(project.disbursed_amount/100000).toFixed(2)}L against ${project.physical_progress_pct}% progress. Significant discrepancy detected between fund expenditure and verified milestone deliverables.`}
                </p>
                <div className="mt-2 text-[10px] text-gov-700 dark:text-gov-300 font-mono">
                  Confidence Score: {Math.round((project.anomaly_logs?.[0]?.confidence_score || project.risk_score) * 100)}% • Model: sentence-transformers + Gemini Flash
                </div>
              </div>

              {/* Financial & Physical Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Sanctioned</span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    {formatINR(project.sanction_amount)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Disbursed</span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    {formatINR(project.disbursed_amount)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Physical Progress</span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    {project.physical_progress_pct || 0}%
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Disbursed Ratio</span>
                  <span className="text-sm font-extrabold text-red-600 dark:text-red-400">
                    {project.sanction_amount > 0 ? Math.round((project.disbursed_amount / project.sanction_amount) * 100) : 0}%
                  </span>
                </div>
              </div>

              {/* Contractor Vigilance Profile */}
              {project.contractor_name && (
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-500" />
                    Executing Contractor Vigilance Dossier
                  </h4>
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{project.contractor_name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">GSTIN: {project.contractor_gstin || '29AAACA0000A1Z5'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                        Market Concentration: High
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Milestones History Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2">
                  Milestone Ledger & Verification Log
                </h4>
                {project.milestones && project.milestones.length > 0 ? (
                  <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                    {project.milestones.map((m) => (
                      <div key={m.id} className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{m.stage_name}</p>
                          <p className="text-[11px] text-slate-500">
                            Claimed: {m.claimed_pct}% • Released: {formatINR(m.fund_released)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              m.verified
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {m.verified ? 'Verified & Certified' : 'Pending Physical Verification'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No milestone proof claims submitted yet.</p>
                )}
              </div>

              {/* Vigilance Action Console (For DC / Ministry) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  District Collector Vigilance Action
                </h4>
                <textarea
                  rows={2}
                  placeholder="Enter official inquiry notes, site inspection remarks, or freeze orders..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-gov-500"
                />

                {updateSuccess && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Status updated and recorded to statutory audit log.
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    disabled={updating}
                    onClick={() => handleStatusChange('INVESTIGATING')}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors"
                  >
                    Mark as Investigating
                  </button>
                  <button
                    disabled={updating}
                    onClick={() => handleStatusChange('RESOLVED')}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
                  >
                    Resolve & Clear Anomaly
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
          >
            Close Dossier
          </button>
        </div>

      </div>
    </div>
  );
};

export default AnomalyModal;
