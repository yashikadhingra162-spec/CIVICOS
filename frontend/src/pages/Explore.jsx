import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Explore.css';

export default function Explore() {
  const navigate = useNavigate();
  return (
    <section className="explore-page">
      <div className="explore-grid" />
      <div className="explore-copy">
        <div className="explore-kicker"><span /> CIVICOS NETWORK</div>
        <h1>See Your City.<br /><em>Change It Together.</em></h1>
        <p>A living civic network for people who notice what others miss. Report problems, follow progress and help build a better city.</p>
        <div className="explore-meta"><span>● Interactive civic experience</span><span>● Explore the network</span></div>
        <div className="explore-actions">
          <button className="btn btn-primary" onClick={() => navigate('/report')}>Report an Issue <span>→</span></button>
          <button className="btn btn-secondary" onClick={() => navigate('/nearby')}>Nearby Issues <span>→</span></button>
        </div>
      </div>
      <div className="earth-stage" aria-hidden="true"><div className="earth-orbit orbit-one" /><div className="earth-orbit orbit-two" /><div className="earth" /><div className="earth-tag">CIVICOS</div><div className="earth-nodes"><i /><i /><i /></div></div>
      <div className="explore-scroll-hint">CIVIC NETWORK <span>↓</span></div>
    </section>
  );
}
