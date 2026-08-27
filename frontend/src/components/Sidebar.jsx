import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  MapPin,
  ShieldAlert,
  FolderKanban,
  CheckSquare,
  PlusCircle,
  Image,
  Eye,
  FileQuestion,
  HelpCircle,
  BarChart3
} from 'lucide-react';

const Sidebar = () => {
  const { user, role } = useAuth();

  // Define navigation groups tailored by role
  let navItems = [];

  if (role === 'MINISTRY') {
    navItems = [
      { to: '/ministry', label: 'National Dashboard', icon: LayoutDashboard },
      { to: '/projects', label: 'All Projects Ledger', icon: FolderKanban },
      { to: '/alerts', label: 'Vigilance Red Flags', icon: ShieldAlert, badge: '78' },
      { to: '/map', label: 'National GIS Map', icon: MapPin },
    ];
  } else if (role === 'DISTRICT_COLLECTOR') {
    navItems = [
      { to: '/collector', label: 'District DM/DC View', icon: Building2 },
      { to: '/collector/milestones', label: 'Milestone Queue', icon: CheckSquare, badge: 'Pending' },
      { to: '/projects', label: 'District Works', icon: FolderKanban },
      { to: '/alerts', label: 'District Anomalies', icon: ShieldAlert, badge: 'Vigilance' },
      { to: '/map', label: 'District GIS Map', icon: MapPin },
    ];
  } else if (role === 'MP') {
    navItems = [
      { to: '/mp', label: 'Constituency Dashboard', icon: LayoutDashboard },
      { to: '/projects', label: 'Constituency Works', icon: FolderKanban },
      { to: '/mp/recommend', label: 'Recommend Work', icon: PlusCircle },
      { to: '/mp/gallery', label: 'Asset Photo Gallery', icon: Image },
      { to: '/map', label: 'Constituency Map', icon: MapPin },
    ];
  } else if (role === 'AGENCY') {
    navItems = [
      { to: '/collector', label: 'Agency Works Queue', icon: Building2 },
      { to: '/projects', label: 'Assigned Projects', icon: FolderKanban },
      { to: '/collector/milestones', label: 'Upload Progress', icon: CheckSquare },
      { to: '/map', label: 'Execution Sites', icon: MapPin },
    ];
  } else {
    // Citizen / Public Auditor
    navItems = [
      { to: '/citizen', label: 'Citizen Transparency', icon: Eye },
      { to: '/projects', label: 'Public Projects', icon: FolderKanban },
      { to: '/map', label: 'Neighborhood Map', icon: MapPin },
      { to: '/citizen/grievance', label: 'Report Grievance', icon: FileQuestion },
      { to: '/alerts', label: 'Public Audit Ledger', icon: ShieldAlert },
    ];
  }

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 transition-colors">
      <div className="p-4">
        
        {/* Role Jurisdiction Header */}
        <div className="mb-6 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
            Active Jurisdiction
          </p>
          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
            {user?.constituency_name ? `${user.constituency_name} (LS)` : user?.district ? `${user.district} District` : user?.state || 'National Oversight'}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              Live Verified Ledger
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-gov-600 text-white shadow-sm font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-saffron-100 text-saffron-800 dark:bg-saffron-950 dark:text-saffron-300"
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <div className="p-3 rounded-lg bg-gov-50 dark:bg-gov-950/40 border border-gov-100 dark:border-gov-900/60">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-3.5 h-3.5 text-gov-600 dark:text-gov-400" />
            <span className="text-[11px] font-semibold text-gov-900 dark:text-gov-200">
              MPLADS Guidelines 2023
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
            Mandatory GIS geotagging, e-Sakshi portal integration & automated CVO audit screening.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
