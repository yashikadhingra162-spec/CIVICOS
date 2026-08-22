import React, { useEffect, useState } from 'react';
import { getIncidents, statusLabel } from '../api.js';
import CivicMap from '../components/CivicMap.jsx';

export default function NearbyIssues() {
  const [incidents, setIncidents] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { load(); }, [status]);

  const load = async () => {
    try {
      setError('');
      const d = await getIncidents(status ? `?status=${status}` : '');
      setIncidents(d.incidents);
    } catch (e) { setError(e.message || 'Could not load reports.'); }
  };

  const statuses = ['', 'pending', 'open', 'verified', 'in_progress', 'resolved'];
  return (
    <div>
      <div className="page-title">Nearby Issues</div>
      <div className="page-sub">Interactive civic map of publicly visible reports.</div>
      <div className="flex gap wrap mb">
        {statuses.map((s) => <button key={s || 'all'} className={`btn btn-small ${status === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatus(s)}>{s ? statusLabel(s) : 'All'}</button>)}
      </div>
      {error && <div className="notice notice-error mb">{error}</div>}
      <CivicMap incidents={incidents} height="520px" />
      {!error && incidents.length === 0 && <p className="muted mt">No reports match this filter yet.</p>}
      <div className="legend">
        <span><span className="dot" style={{ background: '#ef4444' }} /> Critical (80+)</span>
        <span><span className="dot" style={{ background: '#f97316' }} /> High (60-79)</span>
        <span><span className="dot" style={{ background: '#eab308' }} /> Medium (40-59)</span>
        <span><span className="dot" style={{ background: '#22c55e' }} /> Low (&lt;40)</span>
      </div>
    </div>
  );
}
