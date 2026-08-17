import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats } from '../api.js';

const actions = [
  { icon: '⌖', title: 'Nearby Issues', text: 'Explore civic problems around you on the live map.', to: '/nearby', button: 'Explore map' },
  { icon: '◈', title: 'Command Center', text: 'Monitor priorities, incidents and operational activity.', to: '/command-center', button: 'Open center' },
  { icon: '✦', title: 'Environmental Map', text: 'Discover hotspots across waste, water and green spaces.', to: '/environmental', button: 'View hotspots' },
];

export default function Home() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="home-page">
      <section className="hero">
        <div className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 18 }}>
          <span>●</span> CIVIC NETWORK ACTIVE
        </div>
        <h1>Make your city<br /><span style={{ color: '#38bdf8' }}>better, together.</span></h1>
        <p>Spot a problem. Report it in seconds. Follow it from verification to resolution.</p>
        <Link to="/report">
          <button className="btn btn-primary" style={{ fontSize: 15, padding: '14px 24px' }}>
            ＋ REPORT A CIVIC ISSUE
          </button>
        </Link>
      </section>

      {stats && (
        <section className="grid grid-3 mb">
          <div className="card stat-card stat-critical">
            <div className="stat-icon">!</div>
            <div><div className="stat-value" style={{ color: '#fb7185' }}>{stats.critical}</div><div className="stat-label">Critical issues</div></div>
            <span className="stat-trend">LIVE</span>
          </div>
          <div className="card stat-card stat-high">
            <div className="stat-icon">↑</div>
            <div><div className="stat-value" style={{ color: '#fb923c' }}>{stats.high}</div><div className="stat-label">High priority</div></div>
            <span className="stat-trend">ACTIVE</span>
          </div>
          <div className="card stat-card stat-resolved">
            <div className="stat-icon">✓</div>
            <div><div className="stat-value" style={{ color: '#4ade80' }}>{stats.resolved}</div><div className="stat-label">Resolved</div></div>
            <span className="stat-trend">DONE</span>
          </div>
        </section>
      )}

      <div className="section-heading">
        <div>
          <span className="eyebrow">CIVIC TOOLS</span>
          <h2>Stay connected to your city</h2>
        </div>
        <Link to="/report" className="muted quick-link">Report something →</Link>
      </div>

      <div className="grid grid-3">
        {actions.map((action) => (
          <div className="card action-card" key={action.to}>
            <div className="action-icon">{action.icon}</div>
            <h3>{action.title}</h3>
            <p className="muted">{action.text}</p>
            <Link to={action.to}><button className="btn btn-secondary btn-small mt">{action.button} →</button></Link>
          </div>
        ))}
      </div>
    </div>
  );
}
