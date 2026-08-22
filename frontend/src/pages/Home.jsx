import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats } from '../api.js';
import ElectricGaze from '../components/ElectricGaze.jsx';

const actions = [
  { icon: '⌖', title: 'Nearby Issues', text: 'Explore civic problems around you on the live map.', to: '/nearby', button: 'Explore map' },
  { icon: '▤', title: 'All Reports', text: 'Browse issues reported by people across the civic network.', to: '/my-reports', button: 'View reports' },
  { icon: '＋', title: 'Report an Issue', text: 'See something that needs attention? Put it on the map in seconds.', to: '/report', button: 'Create report' },
];

export default function Home() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="home-page landing-page">
      <section className="landing-hero">
        <div className="landing-glow landing-glow-one" />
        <div className="landing-glow landing-glow-two" />
        <div className="landing-hero-inner">
          <div className="badge landing-badge">
            <span className="badge-pulse" /> CIVIC NETWORK ACTIVE
          </div>
          <h1>Make your city<br />
            <span>better, together.</span>
          </h1>
          <p className="landing-copy">
            Spot a problem. Report it in seconds. Follow civic issues from discovery to resolution.
          </p>
          <div className="landing-actions">
            <Link to="/report" className="btn btn-primary landing-primary">＋ REPORT A CIVIC ISSUE</Link>
            <Link to="/nearby" className="btn btn-secondary landing-secondary">⌖ EXPLORE NEARBY ISSUES</Link>
          </div>
        </div>

        {stats && (
          <div className="landing-stats" aria-label="Live civic statistics">
            <div className="landing-stat"><strong>{stats.critical}</strong><span>Critical issues</span></div>
            <div className="landing-stat"><strong>{stats.high}</strong><span>High priority</span></div>
            <div className="landing-stat"><strong>{stats.resolved}</strong><span>Resolved</span></div>
          </div>
        )}
      </section>

      <section className="gaze-section landing-gaze" aria-label="CIVICOS visual identity">
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

      <section className="landing-tools">
        <div className="section-heading landing-section-heading">
          <div>
            <span className="eyebrow">CIVIC TOOLS</span>
            <h2>Everything you need to act</h2>
          </div>
          <p className="muted">Simple tools for reporting, exploring and following what matters around you.</p>
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
      </section>
    </div>
  );
}
