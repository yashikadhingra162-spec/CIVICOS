import React, { useEffect, useState } from 'react';
import { getIncidents } from '../api.js';

const FLOW = ['REPORTED', 'AI_VERIFIED', 'PRIORITIZED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED'];
const pretty = (s) => s.replaceAll('_', ' ');

export default function MyReports() {
  const [incidents, setIncidents] = useState([]);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    getIncidents().then((d) => setIncidents(d.incidents)).catch(() => {});
  }, []);

  const visible = incidents.filter((inc) => filter === 'ALL' || inc.status === filter);

  return (
    <div>
      <div className="page-title">My Reports</div>
      <div className="page-sub">Track civic incidents from submission to verified resolution.</div>

      <div className="flex gap wrap mb">
        {['ALL', 'PRIORITIZED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED'].map((s) => (
          <button key={s} className={`btn btn-small ${filter === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(s)}>
            {s === 'ALL' ? 'All reports' : pretty(s)}
          </button>
        ))}
      </div>

      {visible.length === 0 && <p className="muted">No incidents match this filter.</p>}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {visible.map((inc) => {
          const current = Math.max(0, FLOW.indexOf(inc.status));
          return (
            <div className="card" key={inc.id}>
              <div className="flex between items-center mb">
                <span className="badge">Incident #{inc.id}</span>
                <span className="pill" style={{ background: inc.status_color, color: '#06121f' }}>{pretty(inc.status)}</span>
              </div>
              <h4 style={{ marginBottom: 8 }}>{inc.title}</h4>
              <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>{inc.description}</p>

              <div className="incident-meta-grid mb">
                <div><span>Priority</span><b>{inc.priority_score}/100</b></div>
                <div><span>Reports</span><b>{inc.report_count || 1}</b></div>
                <div><span>Department</span><b>{inc.department || 'Routing'}</b></div>
              </div>

              <div className="bar mb"><div className="bar-fill" style={{ width: `${inc.priority_score}%`, background: inc.marker_color }} /></div>

              <div className="mini-flow">
                {FLOW.map((step, i) => (
                  <span key={step} className={i < current ? 'done' : i === current ? 'active' : ''} title={pretty(step)}>
                    {i < current ? '✓' : i + 1}
                  </span>
                ))}
              </div>
              <div className="flex between muted" style={{ fontSize: 10, marginTop: 6 }}>
                <span>Reported</span><span>Verified</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
