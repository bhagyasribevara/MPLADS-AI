import React, { useEffect, useState } from 'react';
import { projectsAPI } from '../services/api';
import ProjectCard from '../components/ProjectCard';
import AnomalyModal from '../components/AnomalyModal';
import { Search, Filter, RefreshCw, FolderKanban, ShieldAlert } from 'lucide-react';

const ProjectsExplorer = () => {
  const [projects, setProjects] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [isFlagged, setIsFlagged] = useState('');
  const [page, setPage] = useState(1);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 24,
        search: search || undefined,
        status: status || undefined,
        is_flagged: isFlagged !== '' ? isFlagged : undefined,
      };
      const res = await projectsAPI.getAll(params);
      if (res.data) {
        setProjects(res.data.projects || []);
        setTotal(res.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [page, status, isFlagged]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProjects();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-gov-600" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Civil Works & Asset Explorer
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete database of {total} sanctioned works across Parliamentary Constituencies.
          </p>
        </div>

        <button
          onClick={fetchProjects}
          className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Filter Controls */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, project code, contractor, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-gov-500"
          />
        </form>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="">All Statuses</option>
            <option value="RECOMMENDED">Recommended</option>
            <option value="SANCTIONED">Sanctioned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="STALLED">Stalled</option>
          </select>

          <select
            value={isFlagged}
            onChange={(e) => { setIsFlagged(e.target.value); setPage(1); }}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="">All Risk Levels</option>
            <option value="true">Red-Flagged Only</option>
            <option value="false">Healthy Only</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500 font-medium">
          Loading civil works records...
        </div>
      ) : projects.length === 0 ? (
        <div className="py-20 text-center text-xs text-slate-500 font-medium">
          No works matched the selected criteria.
        </div>
      ) : (
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

      {/* Pagination */}
      <div className="flex items-center justify-between py-4 border-t border-slate-200 dark:border-slate-800 text-xs">
        <span className="text-slate-500">
          Showing page {page} of {Math.ceil(total / 24) || 1} ({total} total works)
        </span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            disabled={page >= Math.ceil(total / 24)}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {/* Dossier Modal */}
      {selectedProject && (
        <AnomalyModal
          projectId={selectedProject.id}
          projectData={selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdateStatus={() => fetchProjects()}
        />
      )}

    </div>
  );
};

export default ProjectsExplorer;
