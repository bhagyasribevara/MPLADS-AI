import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, SEEDED_PERSONAS } from '../context/AuthContext';
import { ShieldCheck, Sparkles, ArrowRight, Lock, Mail, CheckCircle2 } from 'lucide-react';

const LoginPage = () => {
  const { login, switchPersona } = useAuth();
  const [email, setEmail] = useState('admin.ministry@mplads.gov.in');
  const [password, setPassword] = useState('MPLADS@Secure2025!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleStandardLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      redirectByRole(res.user.role);
    } else {
      setError(res.error);
    }
  };

  const handleQuickPersona = async (key) => {
    setLoading(true);
    setError(null);
    const persona = SEEDED_PERSONAS[key];
    const res = await switchPersona(key);
    setLoading(false);

    if (res?.success) {
      redirectByRole(persona.role);
    } else {
      setError(res?.error || 'Login failed');
    }
  };

  const redirectByRole = (role) => {
    if (role === 'MINISTRY') navigate('/ministry');
    else if (role === 'DISTRICT_COLLECTOR') navigate('/collector');
    else if (role === 'MP') navigate('/mp');
    else if (role === 'CITIZEN') navigate('/citizen');
    else navigate('/projects');
  };

  return (
    <div className="min-h-[90vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        
        {/* Emblem & Branding */}
        <div className="w-14 h-14 rounded-2xl bg-gov-900 dark:bg-gov-600 flex items-center justify-center text-white mx-auto shadow-lg ring-4 ring-saffron-500/30 mb-4">
          <ShieldCheck className="w-8 h-8 text-saffron-400" />
        </div>

        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          MPLADS AI Vigilance Portal
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Ministry of Statistics and Programme Implementation (MoSPI) • Govt. of India
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-xl rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
          
          {/* Quick 1-Click Role Login Bar (Judge / Evaluation Feature) */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Sparkles className="w-4 h-4 text-saffron-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                1-Click Quick Evaluation Access
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              Click any official persona below to instantaneously authenticate into their specialized dashboard:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.values(SEEDED_PERSONAS).map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handleQuickPersona(p.key)}
                  className="text-left p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gov-500 dark:hover:border-gov-400 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-gov-600 dark:group-hover:text-gov-400">
                      {p.name}
                    </span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {p.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {p.title}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
            <span className="bg-white dark:bg-slate-900 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Or Sign In with Credentials
            </span>
          </div>

          {/* Standard Credentials Form */}
          <form onSubmit={handleStandardLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Official Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-gov-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-gov-500"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-xs font-semibold">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-gov-600 hover:bg-gov-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5"
            >
              <span>{loading ? 'Authenticating with Supabase...' : 'Secure Officer Login'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
