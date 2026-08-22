import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Explore() {
  const navigate = useNavigate();

  return (
    <section className="explore-page">
      <div className="explore-grid" />
      <div className="explore-copy">
        <div className="explore-kicker"><span /> CIVICOS NETWORK</div>
        <h1>See Your City.<br /><em>Change It Together.</em></h1>
        <p>
          A living civic network for people who notice what others miss.
          Report problems, follow progress and help build a better city.
        </p>
        <div className="explore-meta">
          <span>● Interactive civic experience</span>
          <span>● Scroll to explore</span>
        </div>
        <div className="explore-actions">
          <button className="btn btn-primary" onClick={() => navigate('/report')}>Report an Issue <span>→</span></button>
          <button className="btn btn-secondary" onClick={() => document.getElementById('explore-next')?.scrollIntoView({ behavior: 'smooth' })}>Explore the Network <span>↓</span></button>
        </div>
      </div>

      <div className="earth-stage" aria-hidden="true">
        <div className="earth-orbit orbit-one" />
        <div className="earth-orbit orbit-two" />
        <div className="earth" />
        <div className="earth-tag">CIVICOS</div>
        <div className="earth-nodes"><i /><i /><i /></div>
      </div>

      <div className="explore-scroll-hint">DISCOVER <span>↓</span></div>

      <div id="explore-next" className="explore-next">
        <div><span className="eyebrow">ONE CITY · MANY EYES</span><h2>Every report becomes part of the bigger picture.</h2></div>
        <p>Explore nearby issues, environmental conditions and the civic activity shaping your community in real time.</p>
      </div>
    </section>
  );
}
