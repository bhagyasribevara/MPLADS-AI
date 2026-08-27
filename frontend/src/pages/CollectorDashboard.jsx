import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { projectsAPI, alertsAPI, milestonesAPI } from '../services/api';
import ProjectCard from '../components/ProjectCard';
import RiskBadge from '../components/RiskBadge';
import AnomalyModal from '../components/AnomalyModal';
import MilestoneModal from '../components/MilestoneModal';
import {
  Building2,
  CheckSquare,
  ShieldAlert,
  FolderKanban,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Filter
} from 'lucide-react';

const formatINR = (amount) => {
  if (!amount) return '₹0';
  const val = parseFloat(amount);
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
};

const CollectorDashboard = () => {
  const { user } = useAuth();
  const districtName = user?.district || 'Dharwad';

  const [projects, setProjects] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [pendingMilestones, setPendingMilestones] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [verifyingMilestone, setVerifyingMilestone] = useState(null);
  const [activeTab, setActiveTab] = useState('QUEUE'); // 'QUEUE' or 'ANOMALIES' or 'PROJECTS'
  const [loading, setLoading] = useState(true);

  const loadDistrictData = async () => {
    setLoading(true);
    try {
      const [projRes, alertsRes] = await Promise.all([
        projectsAPI.getAll({ district: districtName, limit: 30 }),
        alertsAPI.getAll({ district: districtName, limit: 20 }),
      ]);

      if (projRes.data && projRes.data.projects) {
        setProjects(projRes.data.projects);

        // Generate synthetic pending milestone queue from unverified works for demo
        const unverified = projRes.data.projects
          .filter((p) => p.status === 'IN_PROGRESS' || p.status === 'RECOMMENDED')
          .slice(0, 5)
          .map((p, idx) => ({
            id: `mile-${idx}-${p.id}`,
            project_id: p.id,
            project_code: p.project_code,
            project_title: p.title,
            stage_name: idx === 0 ? 'Stage 2: Foundation & Plinth Quality Certification' : 'Stage 1: DPR & Boundary Clearance',
            claimed_pct: (idx + 1) * 20,
            fund_released: p.sanction_amount * 0.20,
            inspection_notes: 'Physical works verified on site. Concrete compressive strength test reports attached.',
            verified: false,
          }));
        setPendingMilestones(unverified);
      }

      if (alertsRes.data && alertsRes.data.alerts) {
        setAlerts(alertsRes.data.alerts);
      }
    } catch (err) {
      console.error('Failed to load collector dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDistrictData();
  }, [districtName]);

  const flaggedProjectsCount = projects.filter((p) => p.is_flagged).length;

  return (
    <div className="space-y-6">
      
      {/* District Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-900 to-teal-900 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-emerald-400" />
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-300">
                Office of the District Magistrate & Collector
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              {districtName} District Authority Vigilance Console
            </h1>
            <p className="text-xs text-emerald-100/80 mt-1 max-w-2xl">
              Statutory Administrative Sanction & Fund Release Gateway under MPLADS Guidelines 2023. Real-time photographic proof verification & AI fraud detection.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur border border-white/15 text-center">
              <span className="text-[10px] uppercase tracking-wider block text-emerald-200">District Works</span>
              <span className="text-lg font-black">{projects.length}</span>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-red-500/20 backdrop-blur border border-red-400/30 text-center">
              <span className="text-[10px] uppercase tracking-wider block text-red-200">Red Flags</span>
              <span className="text-lg font-black text-red-300">{flaggedProjectsCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('QUEUE')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'QUEUE'
              ? 'border-gov-600 text-gov-600 dark:text-gov-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Milestone Verification Queue</span>
          <span className="px-1.5 py-0.2 rounded-full bg-gov-100 dark:bg-gov-950 text-gov-800 dark:text-gov-300 font-bold">
            {pendingMilestones.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ANOMALIES')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'ANOMALIES'
              ? 'border-red-600 text-red-600 dark:text-red-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>District Anomaly Panel</span>
          <span className="px-1.5 py-0.2 rounded-full bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 font-bold">
            {alerts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('PROJECTS')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'PROJECTS'
              ? 'border-gov-600 text-gov-600 dark:text-gov-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          <span>All District Works ({projects.length})</span>
        </button>
      </div>

      {/* TAB 1: MILESTONE VERIFICATION QUEUE */}
      {activeTab === 'QUEUE' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Pending physical verification claims uploaded by implementing agencies (PWD / KRIDL):</span>
            <span className="font-semibold text-gov-600">Requires DC Digital Signature</span>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            {pendingMilestones.map((m) => (
              <div key={m.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {m.project_code}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {m.stage_name}
                    </span>
                  </div>
                  <h4 className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 font-medium">
                    {m.project_title}
                  </h4>
                  <p className="text-[11px] text-slate-500 italic">
                    "{m.inspection_notes}"
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right text-xs">
                    <span className="text-slate-400 block text-[10px]">Claimed Progress</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{m.claimed_pct}%</span>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-slate-400 block text-[10px]">Tranche Release</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatINR(m.fund_released)}</span>
                  </div>
                  <button
                    onClick={() => setVerifyingMilestone(m)}
                    className="px-3.5 py-1.5 rounded-lg bg-gov-600 hover:bg-gov-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verify & Release</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: ANOMALY ALERT PANEL */}
      {activeTab === 'ANOMALIES' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((alert) => (
              <div
                key={alert.alert_id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 shadow-sm space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      {alert.project_code}
                    </span>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-1 mt-0.5">
                      {alert.project_title}
                    </h4>
                  </div>
                  <RiskBadge anomalyType={alert.anomaly_type} riskScore={alert.confidence_score} isFlagged={true} />
                </div>

                {/* Gemini AI Summary */}
                <div className="p-3 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-red-900 dark:text-red-300 text-[11px] mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-red-600" />
                    <span>Gemini 2.5 Flash Forensic Audit Brief:</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-serif text-[11px]">
                    "{alert.explanation}"
                  </p>
                </div>

                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-slate-500 text-[10px]">
                    Status: <span className="font-bold text-amber-600">{alert.alert_status}</span>
                  </span>
                  <button
                    onClick={() => setSelectedProject({ id: alert.project_id })}
                    className="text-gov-600 hover:text-gov-700 font-bold text-xs flex items-center gap-1"
                  >
                    <span>Inspect Full Dossier</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ALL DISTRICT WORKS */}
      {activeTab === 'PROJECTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onViewDossier={(proj) => setSelectedProject(proj)}
            />
          ))}
        </div>
      )}

      {/* Anomaly Modal */}
      {selectedProject && (
        <AnomalyModal
          projectId={selectedProject.id}
          projectData={selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdateStatus={() => loadDistrictData()}
        />
      )}

      {/* Milestone Verification Modal */}
      {verifyingMilestone && (
        <MilestoneModal
          milestone={verifyingMilestone}
          onClose={() => setVerifyingMilestone(null)}
          onSuccess={() => {
            setPendingMilestones(pendingMilestones.filter((m) => m.id !== verifyingMilestone.id));
          }}
        />
      )}

    </div>
  );
};

export default CollectorDashboard;
