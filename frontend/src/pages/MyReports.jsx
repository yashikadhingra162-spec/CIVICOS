import React, { useEffect, useState } from 'react';
import { getMyReports, statusLabel } from '../api.js';

export default function MyReports() {
  const [incidents, setIncidents] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [error, setError] = useState('');

  useEffect(() => {
    getMyReports().then((d) => setIncidents(d.incidents)).catch((e) => setError(e.message || 'Could not load your reports.'));
  }, []);

  const filters = ['ALL', 'pending', 'open', 'verified', 'in_progress', 'resolved', 'rejected'];
  const visible = incidents.filter((inc) => filter === 'ALL' || inc.status === filter);

  return (
    <div>
      <div className="page-title">My Reports</div>
      <div className="page-sub">Reports submitted from this browser are saved here, including their photos and current status.</div>
      <div className="flex gap wrap mb">
        {filters.map((s) => <button key={s} className={`btn btn-small ${filter === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(s)}>{s === 'ALL' ? 'All reports' : statusLabel(s)}</button>)}
      </div>
      {error && <div className="notice notice-error mb">{error}</div>}
      {!error && visible.length === 0 && <p className="muted">No reports from this browser match this filter yet.</p>}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {visible.map((inc) => (
          <div className="card" key={inc.id}>
            {inc.preview_image && <img src={inc.preview_image} alt={`Submitted evidence for ${inc.title}`} style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 10, marginBottom: 14 }} />}
            <div className="flex between items-center mb">
              <span className="badge">Report #{inc.id.slice(0, 8)}</span>
              <span className="pill" style={{ background: inc.status_color, color: '#06121f' }}>{statusLabel(inc.status)}</span>
            </div>
            <h4 style={{ marginBottom: 8 }}>{inc.title}</h4>
            <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>{inc.description}</p>
            <div className="incident-meta-grid mb">
              <div><span>Priority</span><b>{inc.priority_score}/100</b></div>
              <div><span>Category</span><b>{inc.category}</b></div>
              <div><span>Visibility</span><b>{statusLabel(inc.moderation_status)}</b></div>
            </div>
            <div className="bar"><div className="bar-fill" style={{ width: `${inc.priority_score}%`, background: inc.marker_color }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
