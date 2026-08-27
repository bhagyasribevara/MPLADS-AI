import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

export const SEEDED_PERSONAS = {
  MINISTRY: {
    key: 'MINISTRY',
    name: 'Shri Rajesh Kumar, IAS',
    title: 'Union Ministry Administrator',
    email: 'admin.ministry@mplads.gov.in',
    role: 'MINISTRY',
    badge: 'National Ministry',
    color: 'bg-blue-600',
    description: 'National budget allocation, policy oversight, and cross-state vigilance.',
  },
  COLLECTOR: {
    key: 'COLLECTOR',
    name: 'Divya Prabhu G.R.J., IAS',
    title: 'District Collector & Magistrate',
    email: 'collector.dharwad@mplads.gov.in',
    role: 'DISTRICT_COLLECTOR',
    district: 'Dharwad',
    state: 'Karnataka',
    badge: 'District Collector',
    color: 'bg-emerald-600',
    description: 'Project administrative approval, milestone verification, and fraud resolution.',
  },
  MP: {
    key: 'MP',
    name: 'Pralhad Joshi',
    title: 'Member of Parliament (Lok Sabha)',
    email: 'mp.dharwad@sansad.nic.in',
    role: 'MP',
    constituency: 'Dharwad',
    state: 'Karnataka',
    badge: 'Member of Parliament',
    color: 'bg-purple-600',
    description: 'Constituency project recommendations, budget tracking, and asset delivery.',
  },
  AGENCY: {
    key: 'AGENCY',
    name: 'Executive Engineer, PWD',
    title: 'Implementing Public Works Agency',
    email: 'agency.pwd@mplads.gov.in',
    role: 'AGENCY',
    district: 'Dharwad',
    state: 'Karnataka',
    badge: 'Executing Agency',
    color: 'bg-amber-600',
    description: 'Physical works execution, contractor management, and milestone proof uploads.',
  },
  CITIZEN: {
    key: 'CITIZEN',
    name: 'Ramesh Kulkarni',
    title: 'Social Auditor & Citizen',
    email: 'citizen.auditor@mplads.gov.in',
    role: 'CITIZEN',
    badge: 'Public Citizen Auditor',
    color: 'bg-teal-600',
    description: 'Public transparency, project verification, and community grievance reporting.',
  },
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('mplads_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('mplads_token'));
  const [loading, setLoading] = useState(false);

  // Initialize: verify token if present
  useEffect(() => {
    if (token && !user) {
      authAPI
        .getMe()
        .then((res) => {
          if (res.data.success) {
            setUser(res.data.user);
            localStorage.setItem('mplads_user', JSON.stringify(res.data.user));
          }
        })
        .catch(() => logout());
    }
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await authAPI.login(email, password);
      if (res.data.success) {
        const { token: jwtToken, user: userData } = res.data;
        setToken(jwtToken);
        setUser(userData);
        localStorage.setItem('mplads_token', jwtToken);
        localStorage.setItem('mplads_user', JSON.stringify(userData));
        return { success: true, user: userData };
      }
      return { success: false, error: res.data.error || 'Login failed' };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Login failed',
      };
    } finally {
      setLoading(false);
    }
  };

  const switchPersona = async (personaKey) => {
    const persona = SEEDED_PERSONAS[personaKey];
    if (!persona) return;
    return await login(persona.email, 'MPLADS@Secure2025!');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('mplads_token');
    localStorage.removeItem('mplads_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        switchPersona,
        isAuthenticated: !!token && !!user,
        role: user?.role || 'CITIZEN',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
