import React, { useState } from 'react';
import { projectsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { X, Sparkles, CheckCircle, ShieldAlert, PlusCircle } from 'lucide-react';

const WORK_CATEGORIES = [
  'Drinking water facilities, borewells and RO plants',
  'Construction of roads, link roads, pathways',
  'Construction of culverts and bridges',
  'Construction of buildings for community cultural activities',
  'Installation of solar street lights & high-mast systems',
  'Sanitation facilities, public toilets and drainage networks',
];

const RecommendWorkModal = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    work_category: WORK_CATEGORIES[0],
    sanction_amount: '1500000',
    latitude: '15.3647',
    longitude: '75.1240',
    state: user?.state || 'Karnataka',
    district: user?.district || 'Dharwad',
    agency_name: 'Public Works Department (PWD)',
  });

  const [screeningResult, setScreeningResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        sanction_amount: parseFloat(formData.sanction_amount),
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        constituency_id: user?.constituency_id || 'c144e5d8-323f-42e1-a083-d510258169fe',
      };

      const res = await projectsAPI.create(payload);
      if (res.data.success) {
        setScreeningResult(res.data);
        if (onSuccess) onSuccess(res.data.project);
        setTimeout(() => {
          onClose();
        }, 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit recommendation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in">
        
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Recommend New MPLADS Work
              </h3>
              <p className="text-[10px] text-slate-500">MP Constituency Recommendation with AI Pre-Screening</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {screeningResult ? (
          <div className="p-6 space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
              <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Work Recommendation Registered
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Project Code: <span className="font-mono font-bold text-gov-700 dark:text-gov-300">{screeningResult.project?.project_code}</span>
              </p>
            </div>

            {/* AI Screening Summary */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <Sparkles className="w-4 h-4 text-gov-600" />
                <span>AI Automated Pre-Screening Verdict</span>
              </div>
              <div className="space-y-1 text-slate-600 dark:text-slate-400">
                <p>
                  • Duplicate Check: {screeningResult.ml_screening?.duplicate_analysis?.is_duplicate 
                    ? <span className="font-bold text-red-600">COLLISION DETECTED (Overlap Risk)</span> 
                    : <span className="font-bold text-emerald-600">Unique Asset (0 Collisions)</span>}
                </p>
                <p>
                  • Cost Anomaly: {screeningResult.ml_screening?.anomaly_analysis?.is_anomalous 
                    ? <span className="font-bold text-amber-600">Budget Outlier Flagged</span> 
                    : <span className="font-bold text-emerald-600">Within Empirical SoR Benchmark</span>}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Civil Work Title / Description
              </label>
              <textarea
                rows={2}
                required
                placeholder="e.g. Construction of CC Road and covered drainage from Bus Stand to Community Center, Ward 5"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-gov-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Work Classification Category
              </label>
              <select
                value={formData.work_category}
                onChange={(e) => setFormData({ ...formData, work_category: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-slate-100"
              >
                {WORK_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Sanction Allocation (₹ INR)
                </label>
                <input
                  type="number"
                  step="50000"
                  required
                  value={formData.sanction_amount}
                  onChange={(e) => setFormData({ ...formData, sanction_amount: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Executing Public Agency
                </label>
                <input
                  type="text"
                  required
                  value={formData.agency_name}
                  onChange={(e) => setFormData({ ...formData, agency_name: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Site Latitude
                </label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Site Longitude
                </label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {error && <p className="text-red-600 text-xs font-semibold">{error}</p>}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
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
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{submitting ? 'Screening with AI...' : 'Submit with AI Screening'}</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

export default RecommendWorkModal;
