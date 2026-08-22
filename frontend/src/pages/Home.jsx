import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats } from '../api.js';
import ElectricGaze from '../components/ElectricGaze.jsx';

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
        <h1>Make your city<br /><span>better, together.</span></h1>
        <p>Spot a problem. Report it in seconds. Follow it from verification to resolution.</p>
        <Link to="/report">
          <button className="btn btn-primary" style={{ fontSize: 15, padding: '14px 24px' }}>
            ＋ REPORT A CIVIC ISSUE
          </button>
        </Link>
      </section>

      <section className="gaze-section" aria-label="CIVICOS visual identity">
        <div className="gaze-art">
          <ElectricGaze
            renderMode="dither"
            bgMode="none"
            cellSize={9}
            coverage={100}
            contrast={158}
            density={20}
            tint="#f0c94b"
            tintOpacity={18}
            grayscale={45}
            animStyle="shimmer"
            animSpeed={100}
            animIntensity={60}
            pfx={{
              vignette: { enabled: true, intensity: 55 },
              scanLines: { enabled: true, intensity: 18 },
              bloom: { enabled: true, intensity: 22 },
              filmGrain: { enabled: true, intensity: 10 },
              chromatic: { enabled: false, intensity: 0 },
              glitch: { enabled: false, intensity: 0 },
            }}
          />
          <div className="gaze-overlay">
            <span className="eyebrow">CIVICOS // URBAN VISION</span>
            <h2>See the city<br /><strong>through the noise.</strong></h2>
            <p>Live reports, mapped incidents and civic intelligence — built for the people who notice what others miss.</p>
            <Link to="/report" className="btn btn-primary">＋ REPORT AN ISSUE</Link>
          </div>
        </div>
      </section>

      {stats && (
        <section className="grid grid-3 mb">
          <div className="card stat-card stat-critical">
            <div className="stat-icon">!</div>
            <div><div className="stat-value">{stats.critical}</div><div className="stat-label">Critical issues</div></div>
            <span className="stat-trend">LIVE</span>
          </div>
          <div className="card stat-card stat-high">
            <div className="stat-icon">↑</div>
            <div><div className="stat-value">{stats.high}</div><div className="stat-label">High priority</div></div>
            <span className="stat-trend">ACTIVE</span>
          </div>
          <div className="card stat-card stat-resolved">
            <div className="stat-icon">✓</div>
            <div><div className="stat-value">{stats.resolved}</div><div className="stat-label">Resolved</div></div>
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
