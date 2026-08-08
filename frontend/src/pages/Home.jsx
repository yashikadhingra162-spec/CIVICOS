import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats } from '../api.js';

export default function Home() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div>
      <div className="hero">
        <h1>CIVICOS <span style={{ color: '#38bdf8' }}>🏙️</span></h1>
        <p>Help rebuild your city — report an issue, we'll track it to a verified fix.</p>
        <Link to="/report">
          <button className="btn btn-primary" style={{ fontSize: 18, padding: '16px 34px' }}>
            📢 REPORT ISSUE
          </button>
        </Link>
      </div>

      {stats && (
        <div className="grid grid-3 mb">
          <div className="card">
            <div className="stat-value" style={{ color: '#ef4444' }}>{stats.critical}</div>
            <div className="stat-label">🔴 Critical issues</div>
          </div>
          <div className="card">
            <div className="stat-value" style={{ color: '#f97316' }}>{stats.high}</div>
            <div className="stat-label">🟠 High priority</div>
          </div>
          <div className="card">
            <div className="stat-value" style={{ color: '#22c55e' }}>{stats.resolved}</div>
            <div className="stat-label">✅ Resolved</div>
          </div>
        </div>
      )}

      <div className="grid grid-3">
        <div className="card">
          <div style={{ fontSize: 34 }}>📍</div>
          <h3 style={{ margin: '10px 0 6px' }}>Nearby Issues</h3>
          <p className="muted">See civic problems around your area on the map.</p>
          <Link to="/nearby"><button className="btn btn-secondary btn-small mt">View map</button></Link>
        </div>
        <div className="card">
          <div style={{ fontSize: 34 }}>🔧</div>
          <h3 style={{ margin: '10px 0 6px' }}>Command Center</h3>
          <p className="muted">Admin dashboard with priority engine, map & assignment.</p>
          <Link to="/command-center"><button className="btn btn-secondary btn-small mt">Open center</button></Link>
        </div>
        <div className="card">
          <div style={{ fontSize: 34 }}>🌱</div>
          <h3 style={{ margin: '10px 0 6px' }}>Environmental Map</h3>
          <p className="muted">Hotspot detection for waste, water & green spaces.</p>
          <Link to="/environmental"><button className="btn btn-secondary btn-small mt">View map</button></Link>
        </div>
      </div>
    </div>
  );
}
