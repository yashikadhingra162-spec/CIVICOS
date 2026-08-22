import React, { useEffect, useState } from 'react';
import { getIncidents, statusLabel } from '../api.js';
import './reports.css';

const filters = ['ALL', 'pending', 'resolved'];

function shortText(value, max) {
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max).trim()}…` : value;
}

export default function MyReports() {
  const [incidents, setIncidents] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getIncidents()
      .then((d) => setIncidents(d.incidents || []))
      .catch((e) => setError(e.message || 'Could not load reports.'));
  }, []);

  const visible = incidents.filter((inc) => filter === 'ALL' || inc.status === filter);

  return <section className="reports-page">
    <header className="reports-hero">
      <div>
        <span className="reports-eyebrow">CIVICOS • COMMUNITY FEED</span>
        <h1>All Reports</h1>
        <p>A live view of civic issues reported by the community. Open any report to see evidence, location and resolution progress.</p>
      </div>
      <div className="reports-count"><b>{visible.length}</b><span>{filter === 'ALL' ? 'reports visible' : `${statusLabel(filter)} reports`}</span></div>
    </header>

    <div className="report-filters" role="tablist" aria-label="Report filters">
      {filters.map((s) => <button key={s} className={filter === s ? 'active' : ''} onClick={() => setFilter(s)}>
        {s === 'ALL' ? 'All reports' : statusLabel(s)}
      </button>)}
    </div>

    {error && <div className="notice notice-error">{error}</div>}
    {!error && visible.length === 0 && <div className="reports-empty"><span>⌁</span><h3>No reports here yet</h3><p>Try another filter or check back shortly.</p></div>}

    <div className="reports-grid">
      {visible.map((inc) => <article key={inc.id} className="report-card" onClick={() => setSelected(inc)}>
        <div className="report-media">
          {inc.preview_image ? <img src={inc.preview_image} alt={`Evidence for ${inc.title}`} loading="lazy" /> : <div className="report-media-placeholder">NO IMAGE</div>}
          <div className="report-media-shade" />
          <span className="report-status" style={{ '--status': inc.status_color || '#fbbf24' }}>{statusLabel(inc.status)}</span>
          <span className="report-id">#{inc.id.slice(0, 8)}</span>
        </div>

        <div className="report-content">
          <div className="report-category">{inc.category || 'Civic issue'}</div>
          <h2 title={inc.title}>{shortText(inc.title || 'Untitled report', 72)}</h2>
          <p className="report-description">{shortText(inc.description || 'No description provided.', 150)}</p>
          <div className="report-location">📍 <span>{shortText(inc.address || `${Number(inc.latitude).toFixed(5)}, ${Number(inc.longitude).toFixed(5)}`, 78)}</span></div>
          <footer><span>View full report</span><b>→</b></footer>
        </div>
      </article>)}
    </div>

    {selected && <div className="report-modal-backdrop" role="presentation" onClick={() => setSelected(null)}>
      <article className="report-modal" role="dialog" aria-modal="true" aria-label="Full report" onClick={(e) => e.stopPropagation()}>
        <button className="report-close" onClick={() => setSelected(null)} aria-label="Close report">✕</button>
        <div className="report-modal-heading"><span className="report-category">{selected.category || 'Civic issue'}</span><h2>{selected.title}</h2><span className="report-modal-id">Report #{selected.id.slice(0, 8)}</span></div>
        {selected.preview_image && <img className="report-modal-image" src={selected.preview_image} alt={`Full evidence for ${selected.title}`} />}
        <div className="report-modal-body">
          <div className="report-modal-status"><span>Status</span><b style={{ color: selected.status_color || '#fbbf24' }}>{statusLabel(selected.status)}</b></div>
          <h3>Problem</h3><p>{selected.description}</p>
          <div className="report-map-card"><div>📍 <b>{selected.address || 'Reported location'}</b></div><small>{selected.latitude}, {selected.longitude}</small><a href={`https://www.google.com/maps/search/?api=1&query=${selected.latitude},${selected.longitude}`} target="_blank" rel="noreferrer">Open in Google Maps ↗</a></div>
          <div className="report-meta"><div><span>Category</span><b>{selected.category || '—'}</b></div><div><span>Priority</span><b>{selected.priority_score ?? '—'}/100</b></div></div>
          {selected.resolution_images?.length > 0 && <div className="resolution-section"><h3>Resolution proof</h3><div>{selected.resolution_images.map((src, index) => <a key={`${src}-${index}`} href={src} target="_blank" rel="noreferrer"><img src={src} alt={`Resolution proof ${index + 1}`} /></a>)}</div>{selected.resolution_note && <p className="resolution-note">{selected.resolution_note}</p>}</div>}
        </div>
      </article>
    </div>}
  </section>;
}
