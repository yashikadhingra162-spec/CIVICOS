import React, { useEffect, useState } from 'react';
import { getIncidents } from '../api.js';
import CivicMap from '../components/CivicMap.jsx';

export default function NearbyIssues() {
  const [incidents, setIncidents] = useState([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    load();
  }, [status]);

  const load = async () => {
    const q = status ? `?status=${status}` : '';
    const d = await getIncidents(q);
    setIncidents(d.incidents);
  };

  return (
    <div>
      <div className="page-title">Nearby Issues 📍</div>
      <div className="page-sub">Interactive civic map of reported issues.</div>

      <div className="flex between items-center mb">
        <div className="flex gap wrap">
          {['', 'PRIORITIZED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED'].map((s) => (
            <button
              key={s || 'all'}
              className={`btn btn-small ${status === s ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatus(s)}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      <CivicMap incidents={incidents} height="520px" />

      <div className="legend">
        <span><span className="dot" style={{ background: '#ef4444' }} /> Critical (80+)</span>
        <span><span className="dot" style={{ background: '#f97316' }} /> High (60-79)</span>
        <span><span className="dot" style={{ background: '#eab308' }} /> Medium (40-59)</span>
<span><span className="dot" style={{ background: '#22c55e' }} /> Low ({'<'}40)</span>
      </div>
    </div>
  );
}
