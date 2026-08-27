import React from 'react';
import { AlertTriangle, CheckCircle, ShieldAlert, AlertCircle, Sparkles, Building } from 'lucide-react';

const RiskBadge = ({ riskScore, anomalyType, isFlagged, size = 'sm' }) => {
  let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
  let icon = <CheckCircle className="w-3.5 h-3.5 mr-1" />;
  let label = 'Low Risk (Healthy)';

  if (isFlagged || riskScore >= 0.70 || anomalyType) {
    if (anomalyType === 'GHOST_PROJECT') {
      badgeClass = 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800 animate-pulse';
      icon = <ShieldAlert className="w-3.5 h-3.5 mr-1" />;
      label = 'Ghost Work Flag';
    } else if (anomalyType === 'DUPLICATE_WORK') {
      badgeClass = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800';
      icon = <AlertTriangle className="w-3.5 h-3.5 mr-1" />;
      label = 'Duplicate Work Flag';
    } else if (anomalyType === 'COST_OVERRUN') {
      badgeClass = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
      icon = <AlertCircle className="w-3.5 h-3.5 mr-1" />;
      label = 'Cost Inflation Flag';
    } else if (anomalyType === 'VENDOR_MONOPOLY') {
      badgeClass = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800';
      icon = <Building className="w-3.5 h-3.5 mr-1" />;
      label = 'Vendor Monopoly Flag';
    } else if (riskScore >= 0.70) {
      badgeClass = 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800';
      icon = <ShieldAlert className="w-3.5 h-3.5 mr-1" />;
      label = `Critical Risk (${Math.round(riskScore * 100)}%)`;
    } else if (riskScore >= 0.35) {
      badgeClass = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
      icon = <AlertCircle className="w-3.5 h-3.5 mr-1" />;
      label = `Moderate Risk (${Math.round(riskScore * 100)}%)`;
    }
  } else if (riskScore >= 0.35) {
    badgeClass = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
    icon = <AlertCircle className="w-3.5 h-3.5 mr-1" />;
    label = 'Moderate Risk';
  }

  const sizeClasses = size === 'lg' 
    ? 'px-3 py-1.5 text-xs font-semibold' 
    : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span className={`inline-flex items-center rounded-full border ${badgeClass} ${sizeClasses}`}>
      {icon}
      <span>{label}</span>
    </span>
  );
};

export default RiskBadge;
