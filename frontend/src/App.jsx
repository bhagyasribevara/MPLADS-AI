import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LeafletMap from './components/LeafletMap';

// Pages
import LoginPage from './pages/LoginPage';
import MinistryDashboard from './pages/MinistryDashboard';
import CollectorDashboard from './pages/CollectorDashboard';
import MPDashboard from './pages/MPDashboard';
import CitizenPortal from './pages/CitizenPortal';
import ProjectsExplorer from './pages/ProjectsExplorer';
import AlertsCenter from './pages/AlertsCenter';

// Protected Layout wrapper
const AppLayout = ({ children }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar onSearch={(query) => navigate(`/projects?search=${encodeURIComponent(query)}`)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

// Full Map View
const FullMapView = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          National Geospatial Project Surveillance Map
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Interactive visualization of 520+ geotagged civil works across India. Red markers highlight fraud anomalies.
        </p>
      </div>
    </div>
    <LeafletMap height="calc(100vh - 200px)" />
  </div>
);

// Route Director based on logged-in role
const HomeRedirect = () => {
  const { role, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role === 'MINISTRY') return <Navigate to="/ministry" replace />;
  if (role === 'DISTRICT_COLLECTOR') return <Navigate to="/collector" replace />;
  if (role === 'MP') return <Navigate to="/mp" replace />;
  return <Navigate to="/citizen" replace />;
};

function App() {
  return (
    <Routes>
      {/* Public Login Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Root redirect */}
      <Route path="/" element={<HomeRedirect />} />

      {/* Role-Based Dashboard Routes inside Main Layout */}
      <Route
        path="/ministry"
        element={
          <AppLayout>
            <MinistryDashboard />
          </AppLayout>
        }
      />
      <Route
        path="/collector/*"
        element={
          <AppLayout>
            <CollectorDashboard />
          </AppLayout>
        }
      />
      <Route
        path="/mp/*"
        element={
          <AppLayout>
            <MPDashboard />
          </AppLayout>
        }
      />
      <Route
        path="/citizen/*"
        element={
          <AppLayout>
            <CitizenPortal />
          </AppLayout>
        }
      />
      <Route
        path="/projects"
        element={
          <AppLayout>
            <ProjectsExplorer />
          </AppLayout>
        }
      />
      <Route
        path="/alerts"
        element={
          <AppLayout>
            <AlertsCenter />
          </AppLayout>
        }
      />
      <Route
        path="/map"
        element={
          <AppLayout>
            <FullMapView />
          </AppLayout>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
