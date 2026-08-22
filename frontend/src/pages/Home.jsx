import React from 'react';
import { Link } from 'react-router-dom';
import './home.css';

const actions = [
  {
    icon: '＋',
    title: 'Report an Issue',
    text: 'Create a public civic report with a photo, category and the exact location of the problem.',
    to: '/report',
    label: 'Create report',
  },
  {
    icon: '⌖',
    title: 'Nearby Issues',
    text: 'Explore issues around your current area and see what is already happening on the civic map.',
    to: '/nearby',
    label: 'Explore nearby',
  },
  {
    icon: '▤',
    title: 'All Reports',
    text: 'Browse the public feed, inspect report details and follow the current status of reported issues.',
    to: '/my-reports',
    label: 'View reports',
  },
];

export default function Home() {
  return (
    <div className="home-page home-refined">
      <section className="civ-hero">
        <div className="civ-hero-content">
          <div className="civ-eyebrow"><span className="civ-eyebrow-dot" /> CIVICOS // URBAN VISION</div>
          <h1>See the city<br /><span className="accent">through the noise.</span></h1>
          <p className="civ-hero-copy">
            Live civic reports, mapped incidents and clear local context — built for the people who notice what others miss.
          </p>
          <div className="civ-hero-actions">
            <Link to="/report" className="btn btn-primary">＋ REPORT AN ISSUE</Link>
            <Link to="/nearby" className="btn btn-secondary">⌖ EXPLORE NEARBY ISSUES</Link>
          </div>
        </div>
      </section>

      <section className="civ-section" aria-labelledby="civic-tools-heading">
        <div className="civ-section-head">
          <div>
            <span className="civ-section-kicker">CIVIC TOOLS</span>
            <h2 id="civic-tools-heading">Everything you need to act.</h2>
          </div>
          <p>Simple tools for reporting, exploring and following the civic issues that matter around you.</p>
        </div>

        <div className="civ-tools">
          {actions.map((action) => (
            <Link className="civ-tool" to={action.to} key={action.to}>
              <span className="civ-tool-icon" aria-hidden="true">{action.icon}</span>
              <h3>{action.title}</h3>
              <p>{action.text}</p>
              <span className="civ-tool-link">{action.label} <span aria-hidden="true">→</span></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="civ-status-strip" aria-label="CIVICOS network status">
        <div className="civ-status-inner">
          <span className="civ-status-light" />
          <span><strong>System online.</strong> CIVICOS is ready for reporting, exploring and tracking public civic issues.</span>
        </div>
      </section>
    </div>
  );
}
