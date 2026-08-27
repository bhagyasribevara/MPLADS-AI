import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { projectsAPI } from '../services/api';
import ProjectCard from '../components/ProjectCard';
import RecommendWorkModal from '../components/RecommendWorkModal';
import AnomalyModal from '../components/AnomalyModal';
import {
  IndianRupee,
  PlusCircle,
  CheckCircle,
  Clock,
  Image as ImageIcon,
  Building,
  TrendingUp,
  Award,
  Sparkles
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from 'recharts';

const formatINR = (amount) => {
  if (!amount) return '₹0';
  const val = parseFloat(amount);
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
};

const MPDashboard = () => {
  const { user } = useAuth();
  const constituencyName = user?.constituency_name || 'Dharwad';

  const [projects, setProjects] = useState([]);
  const [recommendOpen, setRecommendOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeTab, setActiveTab] = useState('OVERVIEW'); // 'OVERVIEW', 'WORKS', 'GALLERY'
  const [loading, setLoading] = useState(true);

  const loadMPWorks = async () => {
    setLoading(true);
    try {
      const res = await projectsAPI.getAll({ limit: 40 });
      if (res.data && res.data.projects) {
        setProjects(res.data.projects);
      }
    } catch (err) {
      console.error('Failed to load MP works:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMPWorks();
  }, []);

  // Budget calculations (₹5.00 Cr annual entitlement)
  const annualEntitlement = 50000000.0;
  const totalSanctioned = projects.reduce((sum, p) => sum + parseFloat(p.sanction_amount || 0), 0);
  const totalDisbursed = projects.reduce((sum, p) => sum + parseFloat(p.disbursed_amount || 0), 0);
  const completedWorks = projects.filter((p) => p.status === 'COMPLETED');
  const inProgressWorks = projects.filter((p) => p.status === 'IN_PROGRESS');

  // Category breakdown data for Pie Chart
  const categoryMap = {};
  projects.forEach((p) => {
    const cat = p.work_category?.split(',')[0] || 'Community Infrastructure';
    categoryMap[cat] = (categoryMap[cat] || 0) + parseFloat(p.sanction_amount || 0);
  });
  const pieData = Object.keys(categoryMap).map((k) => ({
    name: k,
    value: parseFloat((categoryMap[k] / 100000).toFixed(1)), // in Lakhs
  }));

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="space-y-6">
      
      {/* Header with MP Details & Quick Action */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-gov-900 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-5 h-5 text-saffron-400" />
              <span className="text-xs uppercase font-bold tracking-wider text-purple-200">
                18th Lok Sabha Parliamentary Constituency
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              {constituencyName} Parliamentary Dashboard
            </h1>
            <p className="text-xs text-purple-100/80 mt-1 max-w-xl">
              Member of Parliament: <span className="font-bold text-white">{user?.full_name || 'Hon. Pralhad Joshi'}</span> • Entitlement tracking and durable community asset creation.
            </p>
          </div>

          <button
            onClick={() => setRecommendOpen(true)}
            className="self-start md:self-auto px-4 py-2.5 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-slate-950 text-xs font-bold shadow-md transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Recommend New Work</span>
          </button>
        </div>
      </div>

      {/* 1. Constituency Budget Health Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Annual Entitlement</span>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {formatINR(annualEntitlement)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">₹5.00 Cr per FY (2 tranches of ₹2.5 Cr)</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Sanctioned Projects</span>
          <div className="text-2xl font-black text-gov-600 dark:text-gov-400">
            {formatINR(totalSanctioned)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Utilization: <span className="font-semibold text-emerald-600">{totalSanctioned > 0 ? Math.round((totalDisbursed / totalSanctioned) * 100) : 0}%</span> of sanctions
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Completed Durable Assets</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {completedWorks.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">100% verified milestones with photographic proof</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Works in Execution</span>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {inProgressWorks.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Monitored with AI timeline delay forecasting</p>
        </div>

      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'OVERVIEW'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Expenditure Allocation Breakdown</span>
        </button>

        <button
          onClick={() => setActiveTab('WORKS')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'WORKS'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>Recommended Works ({projects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('GALLERY')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'GALLERY'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Completed Durable Asset Gallery</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & PIE CHART */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Sectoral Allocation Distribution (₹ Lakhs)
            </h3>
            <p className="text-[11px] text-slate-500">Distribution across drinking water, roads, community halls & sanitation</p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(val) => [`₹${val} L`, 'Sanctioned']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '11px', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              MP Recommendation Lifecycle Status
            </h3>
            <p className="text-[11px] text-slate-500">Breakdown of works by administrative execution phase</p>

            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300">1. Completed & Publicly Dedicated</span>
                  <span className="font-bold text-emerald-600">{completedWorks.length} works</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(completedWorks.length / (projects.length || 1)) * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300">2. Active Civil Construction</span>
                  <span className="font-bold text-gov-600">{inProgressWorks.length} works</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-gov-600 h-full rounded-full" style={{ width: `${(inProgressWorks.length / (projects.length || 1)) * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300">3. Recommended / Pending DC Sanction</span>
                  <span className="font-bold text-amber-600">{projects.filter(p => p.status === 'RECOMMENDED').length} works</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(projects.filter(p => p.status === 'RECOMMENDED').length / (projects.length || 1)) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WORKS CARDS */}
      {activeTab === 'WORKS' && (
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

      {/* TAB 3: DURABLE ASSET GALLERY */}
      {activeTab === 'GALLERY' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {completedWorks.map((p, idx) => (
            <div
              key={p.id}
              onClick={() => setSelectedProject(p)}
              className="group rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="h-44 bg-slate-100 dark:bg-slate-800 relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent z-10" />
                <div className="text-center p-4 text-slate-400 group-hover:scale-105 transition-transform duration-300">
                  <ImageIcon className="w-10 h-10 mx-auto mb-1 text-gov-600 opacity-60" />
                  <span className="text-[11px] font-mono block">Geotagged Inspection Photo</span>
                </div>
                <div className="absolute bottom-3 left-3 right-3 z-20">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-sm inline-block mb-1">
                    Verified Asset
                  </span>
                  <p className="text-xs font-bold text-white line-clamp-1">{p.title}</p>
                </div>
              </div>
              <div className="p-4 flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{formatINR(p.sanction_amount)}</span>
                <span className="text-slate-500">{p.district}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recommend Work Modal */}
      {recommendOpen && (
        <RecommendWorkModal
          onClose={() => setRecommendOpen(false)}
          onSuccess={() => loadMPWorks()}
        />
      )}

      {/* Anomaly / Dossier Modal */}
      {selectedProject && (
        <AnomalyModal
          projectId={selectedProject.id}
          projectData={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}

    </div>
  );
};

export default MPDashboard;
