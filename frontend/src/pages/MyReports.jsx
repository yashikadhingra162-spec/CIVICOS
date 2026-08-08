import React, { useEffect, useState } from 'react';
import { getIncidents } from '../api.js';

export default function MyReports() {
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    getIncidents().then((d) => setIncidents(d.incidents)).catch(() => {});
  }, []);

  return (
    <div>
      <div className="page-title">Nearby Issues 📍</div>
      <div className="page-sub">All civic incidents reported by citizens, with live status.</div>

      {incidents.length === 0 && <p className="muted">No incidents yet.</p>}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {incidents.map((inc) => (
          <div className="card" key={inc.id}>
            <div className="flex between items-center mb">
              <span className="badge">#{inc.id}</span>
              <span className="pill" style={{ background: inc.status_color, color: '#06121f' }}>
                {inc.status}
              </span>
            </div>
            <h4 style={{ marginBottom: 8 }}>{inc.title}</h4>
            <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{inc.description}</p>
            <div className="flex between muted mb">
              <span>Priority: <b style={{ color: '#38bdf8' }}>{inc.priority_score}/100</b></span>
              <span>{inc.department}</span>
            </div>
            <div className="bar">
              <div
                className="bar-fill"
                style={{ width: `${inc.priority_score}%`, background: inc.marker_color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
