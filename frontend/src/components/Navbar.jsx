import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, SEEDED_PERSONAS } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Sun, Moon, ShieldCheck, ChevronDown, UserCheck, 
  LogOut, Bell, Search, Layers, User, Sparkles
} from 'lucide-react';

const Navbar = ({ onSearch }) => {
  const { user, role, logout, switchPersona } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [personaOpen, setPersonaOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchVal);
    } else {
      navigate(`/projects?search=${encodeURIComponent(searchVal)}`);
    }
  };

  const handlePersonaSelect = async (key) => {
    setPersonaOpen(false);
    await switchPersona(key);
    // Route to appropriate view
    if (key === 'MINISTRY') navigate('/ministry');
    else if (key === 'COLLECTOR') navigate('/collector');
    else if (key === 'MP') navigate('/mp');
    else if (key === 'CITIZEN') navigate('/citizen');
    else navigate('/projects');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand & Emblem */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-gov-900 dark:bg-gov-600 flex items-center justify-center text-white shadow-sm ring-2 ring-saffron-500/50">
              <ShieldCheck className="w-6 h-6 text-saffron-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                  MPLADS<span className="text-gov-600 dark:text-gov-400">.AI</span>
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-saffron-100 text-saffron-800 dark:bg-saffron-950/60 dark:text-saffron-300">
                  Vigilance
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Govt. of India • MoSPI
              </p>
            </div>
          </Link>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md hidden md:block">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search works, constituency, or project code..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border-0 rounded-lg focus:ring-2 focus:ring-gov-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all"
            />
          </form>
        </div>

        {/* Right Controls: Persona Switcher, Dark Mode, Profile */}
        <div className="flex items-center gap-2.5">
          
          {/* Quick Persona Switcher (For Evaluation & Demo) */}
          <div className="relative">
            <button
              onClick={() => setPersonaOpen(!personaOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
              title="Quickly switch roles for platform evaluation"
            >
              <Sparkles className="w-3.5 h-3.5 text-saffron-500 animate-pulse" />
              <span className="hidden sm:inline">Role:</span>
              <span className="font-semibold text-gov-600 dark:text-gov-400">
                {user?.role?.replace('_', ' ') || 'Demo Persona'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {personaOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-700/80 mb-1">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Evaluation Persona Switcher
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Switch context instantaneously across government tiers:
                  </p>
                </div>
                {Object.values(SEEDED_PERSONAS).map((p) => (
                  <button
                    key={p.key}
                    onClick={() => handlePersonaSelect(p.key)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-start gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors ${
                      user?.email === p.email ? 'bg-gov-50/70 dark:bg-gov-950/40 font-semibold' : ''
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full mt-1.5 ${p.color} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {p.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {p.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {p.title}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* User Account / Profile */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gov-600 text-white flex items-center justify-center text-xs font-bold ring-1 ring-gov-500">
                  {user.full_name?.charAt(0) || 'U'}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate max-w-[120px]">
                    {user.full_name}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    {user.district || user.state || 'National'}
                  </p>
                </div>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700/80">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{user.full_name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gov-100 text-gov-800 dark:bg-gov-950 dark:text-gov-300">
                      {user.role}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                      navigate('/login');
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gov-600 hover:bg-gov-700 text-white shadow-sm transition-colors"
            >
              Sign In
            </Link>
          )}

        </div>

      </div>
    </header>
  );
};

export default Navbar;
