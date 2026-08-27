import React, { useState } from 'react';
import { X, FileQuestion, Camera, Check, AlertCircle } from 'lucide-react';

const GrievanceModal = ({ onClose, onSuccess }) => {
  const [projectCode, setProjectCode] = useState('');
  const [issueType, setIssueType] = useState('GHOST_WORK');
  const [description, setDescription] = useState('');
  const [pincode, setPincode] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      if (onSuccess) onSuccess();
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2">
            <FileQuestion className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Citizen Social Audit Grievance
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Grievance Registered Successfully
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your report has been assigned Docket <span className="font-mono font-bold text-gov-600">#GRV-{Math.floor(100000 + Math.random() * 900000)}</span> and routed to the District Collector Vigilance Cell for field inspection.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Project Code or Location Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. WS/MP29/2024-2025/001001 or Ward 4 Primary School Road"
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-gov-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Violation Category
                </label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-slate-100"
                >
                  <option value="GHOST_WORK">Ghost Work (Funds taken, no site exists)</option>
                  <option value="POOR_QUALITY">Substandard / Broken Construction</option>
                  <option value="STALLED_WORK">Stalled / Abandoned Project</option>
                  <option value="DUPLICATE">Double Invoicing of Road/Drain</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pincode / Ward
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 580001"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Field Evidence Description
              </label>
              <textarea
                rows={3}
                required
                placeholder="Describe what you observed on site. State dates, milestones claimed vs actual condition..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-gov-500"
              />
            </div>

            <div className="p-3 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center text-slate-500">
              <Camera className="w-5 h-5 mx-auto mb-1 text-slate-400" />
              <span className="text-[11px]">Attach geotagged site photo proof (Optional)</span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm transition-colors"
              >
                Submit Citizen Grievance
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default GrievanceModal;
