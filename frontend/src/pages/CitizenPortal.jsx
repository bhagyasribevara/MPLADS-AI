import React, { useEffect, useState } from 'react';
import { projectsAPI } from '../services/api';
import ProjectCard from '../components/ProjectCard';
import LeafletMap from '../components/LeafletMap';
import GrievanceModal from '../components/GrievanceModal';
import AnomalyModal from '../components/AnomalyModal';
import {
  Search,
  FileQuestion,
  MapPin,
  CheckCircle,
  Eye,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Filter
} from 'lucide-react';

const CitizenPortal = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [grievanceOpen, setGrievanceOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    projectsAPI
      .getAll({ limit: 50 })
      .then((res) => {
        if (res.data && res.data.projects) {
          setProjects(res.data.projects);
          setFilteredProjects(res.data.projects);
        }
      })
      .catch((err) => console.error('Failed to load citizen projects:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e) => {
    const q = e.target.value.toLowerCase();
    setSearchQuery(q);
    filterData(q, selectedCategory);
  };

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    filterData(searchQuery, cat);
  };

  const filterData = (query, cat) => {
    let list = [...projects];

    if (query) {
      list = list.filter(
        (p) =>
          p.title?.toLowerCase().includes(query) ||
          p.district?.toLowerCase().includes(query) ||
          p.state?.toLowerCase().includes(query) ||
          p.project_code?.toLowerCase().includes(query) ||
          p.work_category?.toLowerCase().includes(query)
      );
    }

    if (cat !== 'ALL') {
      list = list.filter((p) => p.work_category?.toLowerCase().includes(cat.toLowerCase()));
    }

    setFilteredProjects(list);
  };

  return (
    <div className="space-y-6">
      
      {/* Citizen Hero Header */}
      <div className="p-8 rounded-2xl bg-gradient-to-r from-teal-900 via-cyan-900 to-gov-900 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-bold text-teal-200">
            <Eye className="w-3.5 h-3.5" />
            <span>Public Civic Transparency & Social Audit Portal</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Track Every Rupee of Public Fund in Your Neighborhood
          </h1>
          <p className="text-xs sm:text-sm text-teal-100/80 leading-relaxed">
            Transparent public access to 520+ geo-located MPLADS assets. Search works in your ward, examine photographic milestones, and report ghost works directly to District Vigilance.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => setGrievanceOpen(true)}
              className="px-4 py-2 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-slate-950 text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <FileQuestion className="w-4 h-4" />
              <span>Report Stalled / Ghost Work</span>
            </button>
          </div>
        </div>
      </div>

      {/* Public Search & Filter Bar */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by constituency, district (e.g. Dharwad), pincode, road, school, or work type..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full pl-11 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 transition-all shadow-inner"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Filter Work:
          </span>
          {[
            { id: 'ALL', label: 'All Works' },
            { id: 'water', label: 'Drinking Water & RO' },
            { id: 'road', label: 'Roads & Drainage' },
            { id: 'community', label: 'Community Halls' },
            { id: 'solar', label: 'Solar & High Mast' },
            { id: 'sanitation', label: 'Sanitation' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-3 py-1 rounded-lg shrink-0 font-semibold transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Neighborhood GIS Map */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-teal-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Explore Civil Works on GIS Map
            </h2>
          </div>
          <span className="text-xs text-slate-500">Showing {filteredProjects.length} geo-tagged projects</span>
        </div>

        <LeafletMap
          projects={filteredProjects}
          height="400px"
          onSelectProject={(p) => setSelectedProject(p)}
        />
      </div>

      {/* Public Project Cards Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
          Public Civil Assets Ledger
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onViewDossier={(proj) => setSelectedProject(proj)}
            />
          ))}
        </div>
      </div>

      {/* Grievance Modal */}
      {grievanceOpen && (
        <GrievanceModal
          onClose={() => setGrievanceOpen(false)}
          onSuccess={() => {}}
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

export default CitizenPortal;
