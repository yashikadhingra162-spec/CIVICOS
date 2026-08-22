import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { adminLogout } from '../api.js';

export default function AdminPortal() {
  const navigate = useNavigate();
  const logout = async () => { await adminLogout(); navigate('/', { replace: true }); };
  return <div><div className="card mb" style={{ padding: '14px 18px' }}><div className="flex between items-center" style={{ gap: 16, flexWrap: 'wrap' }}><div><div className="badge">ADMIN PORTAL</div><div className="muted" style={{ fontSize: 12, marginTop: 5 }}>Restricted CIVICOS operations</div></div><div className="flex items-center" style={{ gap: 8, flexWrap: 'wrap' }}><NavLink to="command-center" className={({ isActive }) => `btn btn-small ${isActive ? 'btn-primary' : 'btn-secondary'}`}>Command Center</NavLink><NavLink to="environmental" className={({ isActive }) => `btn btn-small ${isActive ? 'btn-primary' : 'btn-secondary'}`}>Environmental Map</NavLink><button type="button" className="btn btn-small btn-secondary" onClick={logout}>Lock Portal</button></div></div></div><Outlet /></div>;
}
