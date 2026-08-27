import React from 'react';
import { MapPin, IndianRupee, Activity, Calendar, ArrowRight, ShieldAlert } from 'lucide-react';
import RiskBadge from './RiskBadge';

const formatINR = (amount) => {
  if (!amount) return '₹0';
  const val = parseFloat(amount);
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
};

const ProjectCard = ({ project, onViewDossier }) => {
  const isHighRisk = project.is_flagged || project.risk_score >= 0.70;
  const progressPct = project.physical_progress_pct || 0;

  return (
    <div
      className={`relative bg-white dark:bg-slate-900 rounded-xl border transition-all duration-200 hover:shadow-md ${
        isHighRisk
          ? 'border-red-200 dark:border-red-900/60 shadow-sm shadow-red-100 dark:shadow-none'
          : 'border-slate-200 dark:border-slate-800'
      } p-5 flex flex-col justify-between`}
    >
      <div>
        {/* Top Badges & Status */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {project.project_code}
          </span>
          <RiskBadge
            riskScore={project.risk_score}
            isFlagged={project.is_flagged}
          />
        </div>

        {/* Title */}
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base leading-snug line-clamp-2 mb-2">
          {project.title}
        </h3>

        {/* Category & Location */}
        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 mb-4">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-700 dark:text-slate-300">Category:</span>
            <span className="truncate">{project.work_category}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{project.district}, {project.state}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-slate-700 dark:text-slate-300">Physical Progress</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{progressPct}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPct >= 100
                  ? 'bg-emerald-500'
                  : isHighRisk && progressPct < 25
                  ? 'bg-red-500'
                  : 'bg-gov-600'
              }`}
              style={{ width: `${Math.min(100, Math.max(3, progressPct))}%` }}
            />
          </div>
        </div>

        {/* Financial Numbers */}
        <div className="grid grid-cols-2 gap-3 py-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Sanctioned</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              {formatINR(project.sanction_amount)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Disbursed</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              {formatINR(project.disbursed_amount)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Action */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-2">
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            project.status === 'COMPLETED'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : project.status === 'IN_PROGRESS'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
          }`}
        >
          {project.status.replace('_', ' ')}
        </span>

        <button
          onClick={() => onViewDossier && onViewDossier(project)}
          className="inline-flex items-center text-xs font-semibold text-gov-600 dark:text-gov-400 hover:text-gov-700 dark:hover:text-gov-300 group"
        >
          <span>View Dossier</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
};

export default ProjectCard;
