import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import Home from './pages/Home.jsx';
import ReportIssue from './pages/ReportIssue.jsx';
import NearbyIssues from './pages/NearbyIssues.jsx';
import MyReports from './pages/MyReports.jsx';
import CommandCenter from './pages/CommandCenter.jsx';
import EnvironmentalMap from './pages/EnvironmentalMap.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminPortal from './pages/AdminPortal.jsx';
import { adminSession } from './api.js';

const NAV = [
  { to: '/', label: 'Home', icon: '⌂' },
  { to: '/report', label: 'Report Issue', icon: '＋' },
  { to: '/nearby', label: 'Nearby Issues', icon: '⌖' },
  { to: '/my-reports', label: 'All Reports', icon: '▤' },
];

function ProtectedAdmin() {
  const [state, setState] = useState('checking');
  const location = useLocation();

  useEffect(() => {
    let alive = true;
    adminSession()
      .then((data) => { if (alive) setState(data.authenticated ? 'ok' : 'no'); })
      .catch(() => { if (alive) setState('no'); });
    return () => { alive = false; };
  }, [location.pathname]);

  if (state === 'checking') return <div className="card muted">Checking administrator access…</div>;
  if (state !== 'ok') return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="app-shell">
      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setSidebarOpen((open) => !open)}
        aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={sidebarOpen}
      >
        <span /><span /><span />
      </button>

      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'is-visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`} aria-label="Primary navigation">
        <div className="sidebar-header">
          <div className="brand"><span className="brand-mark">C</span><span>CIVICOS</span></div>
          <button type="button" className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation">×</button>
        </div>
        <div className="nav-section-label">NAVIGATION</div>
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span>{n.icon}</span><span className="nav-label">{n.label}</span>
          </NavLink>
        ))}
        <div className="sidebar-bottom">
          <div className="sidebar-status">
            <span className="status-online-dot" />
            <div><strong>System online</strong><small>Civic network active</small></div>
          </div>
        </div>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/report" element={<ReportIssue />} />
          <Route path="/nearby" element={<NearbyIssues />} />
          <Route path="/my-reports" element={<MyReports />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<ProtectedAdmin />}>
            <Route element={<AdminPortal />}>
              <Route index element={<Navigate to="command-center" replace />} />
              <Route path="command-center" element={<CommandCenter />} />
              <Route path="environmental" element={<EnvironmentalMap />} />
            </Route>
          </Route>
          <Route path="/command-center" element={<Navigate to="/admin/command-center" replace />} />
          <Route path="/environmental" element={<Navigate to="/admin/environmental" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
