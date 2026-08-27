import React, { useState } from 'react';
import { milestonesAPI } from '../services/api';
import { X, CheckCircle, XCircle, FileText, Check } from 'lucide-react';

const MilestoneModal = ({ milestone, onClose, onSuccess }) => {
  const [decision, setDecision] = useState('APPROVE');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!milestone) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const isApproved = decision === 'APPROVE';
      await milestonesAPI.verify(milestone.id, {
        verified: isApproved,
        inspection_notes: notes || (isApproved ? 'Approved by District Collector.' : 'Rejected upon physical inspection.'),
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit verification.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-gov-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Verify Milestone Claim
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
            <p className="font-bold text-slate-900 dark:text-slate-100">{milestone.stage_name}</p>
            <p className="text-slate-500">Project: {milestone.project_code || milestone.project_title}</p>
            <p className="text-slate-500">Claimed Progress: <span className="font-semibold text-slate-900 dark:text-slate-200">{milestone.claimed_pct}%</span></p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Collector Decision
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDecision('APPROVE')}
                className={`py-2 px-3 rounded-lg font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                  decision === 'APPROVE'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>Approve & Release</span>
              </button>
              <button
                type="button"
                onClick={() => setDecision('REJECT')}
                className={`py-2 px-3 rounded-lg font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                  decision === 'REJECT'
                    ? 'bg-red-50 border-red-500 text-red-700 dark:bg-red-950 dark:text-red-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Claim</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Field Inspection Remarks
            </label>
            <textarea
              rows={3}
              required
              placeholder="Record physical verification date, geotagged photo observations, and quality report..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-gov-500"
            />
          </div>

          {error && <p className="text-red-600 text-xs font-semibold">{error}</p>}

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
              disabled={submitting}
              className="px-4 py-1.5 rounded-lg bg-gov-600 hover:bg-gov-700 text-white font-semibold shadow-sm transition-colors"
            >
              {submitting ? 'Recording...' : 'Submit Verification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MilestoneModal;
