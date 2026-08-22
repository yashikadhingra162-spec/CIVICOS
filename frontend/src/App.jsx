import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import ReportIssue from './pages/ReportIssue.jsx';
import NearbyIssues from './pages/NearbyIssues.jsx';
import MyReports from './pages/MyReports.jsx';
import CommandCenter from './pages/CommandCenter.jsx';
import EnvironmentalMap from './pages/EnvironmentalMap.jsx';

const NAV = [
  { to: '/', label: 'Home', icon: '⌂' },
  { to: '/report', label: 'Report Issue', icon: '＋' },
  { to: '/nearby', label: 'Nearby Issues', icon: '⌖' },
  { to: '/my-reports', label: 'All Reports', icon: '▤' },
  { to: '/command-center', label: 'Command Center', icon: '◈' },
  { to: '/environmental', label: 'Environmental Map', icon: '✦' },
];

export default function App() {
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark">C</span><span>CIVICOS</span></div><div className="nav-section-label">NAVIGATION</div>{NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><span>{n.icon}</span><span className="nav-label">{n.label}</span></NavLink>)}<div className="sidebar-status"><span className="status-online-dot" /><div><strong>System online</strong><small>Civic network active</small></div></div></aside><main className="main"><Routes><Route path="/" element={<Home />} /><Route path="/report" element={<ReportIssue />} /><Route path="/nearby" element={<NearbyIssues />} /><Route path="/my-reports" element={<MyReports />} /><Route path="/command-center" element={<CommandCenter />} /><Route path="/environmental" element={<EnvironmentalMap />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></main></div>;
}
