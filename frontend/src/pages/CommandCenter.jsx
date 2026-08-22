import React, { useEffect, useState } from 'react';
import { getIncidents, getIncident, getStats, assignIncident, setStatus, verifyIncident } from '../api.js';
import CivicMap from '../components/CivicMap.jsx';

const STATUS_FLOW = ['REPORTED', 'AI_VERIFIED', 'PRIORITIZED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED'];
const pretty = (s) => s.replaceAll('_', ' ');

export default function CommandCenter() {
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [afterImage, setAfterImage] = useState('');
  const [note, setNote] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [showPriorityWhy, setShowPriorityWhy] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [d, s] = await Promise.all([getIncidents(), getStats()]);
    setIncidents([...d.incidents].sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0)));
    setStats(s);
  };

  const openIncident = async (inc) => {
    setSelected(inc); setVerifyResult(null); setAfterImage(''); setNote(''); setShowPriorityWhy(false);
    const d = await getIncident(inc.id); setDetail(d);
  };

  const refreshSelected = async () => {
    const d = await getIncident(selected.id); setDetail(d); setSelected(d); await load();
  };

  const doAssign = async () => { setBusy(true); try { await assignIncident(selected.id, {}); await refreshSelected(); } finally { setBusy(false); } };
  const doStatus = async (status) => { setBusy(true); try { await setStatus(selected.id, status); await refreshSelected(); } finally { setBusy(false); } };
  const doVerify = async () => {
    setBusy(true);
    try { const res = await verifyIncident(selected.id, { after_image: afterImage, note }); setVerifyResult(res); await refreshSelected(); }
    finally { setBusy(false); }
  };

  const handleImage = (e) => {
    const file = e.target.files[0]; if (!file || file.size > 4 * 1024 * 1024) return;
    const reader = new FileReader(); reader.onloadend = () => setAfterImage(reader.result); reader.readAsDataURL(file);
  };

  const currentIdx = detail ? Math.max(0, STATUS_FLOW.indexOf(detail.status)) : -1;

  return (
    <div>
      <div className="page-title">CIVICOS Command Center</div>
      <div className="page-sub">From priority to assignment, field action and proof — one operational workflow.</div>

      {stats && <div className="grid grid-4 mb">
        <div className="card stat-card"><div><div className="stat-value" style={{ color: '#ef4444' }}>{stats.critical}</div><div className="stat-label">Critical</div></div></div>
        <div className="card stat-card"><div><div className="stat-value" style={{ color: '#f97316' }}>{stats.high}</div><div className="stat-label">High Priority</div></div></div>
        <div className="card stat-card"><div><div className="stat-value" style={{ color: '#38bdf8' }}>{stats.medium}</div><div className="stat-label">Medium Priority</div></div></div>
        <div className="card stat-card"><div><div className="stat-value" style={{ color: '#22c55e' }}>{stats.resolved}</div><div className="stat-label">Resolved</div></div></div>
      </div>}

      <div className="grid" style={{ gridTemplateColumns: 'minmax(260px,.8fr) minmax(340px,1.2fr) minmax(300px,1fr)' }}>
        <div>
          <div className="flex between items-center mb"><h4>Priority Queue</h4><span className="muted" style={{ fontSize: 11 }}>{incidents.length} incidents</span></div>
          {incidents.map((inc) => <div key={inc.id} className="incident-row" onClick={() => openIncident(inc)} style={selected?.id === inc.id ? { borderColor: '#38bdf8', boxShadow: '0 0 0 1px rgba(56,189,248,.12)' } : {}}><span className="dot" style={{ background: inc.marker_color }} /><div className="grow" style={{ marginLeft: 12 }}><div style={{ fontWeight: 600 }}>#{inc.id} · {inc.title}</div><div className="muted" style={{ fontSize: 11 }}>{inc.category} · {pretty(inc.status)}</div></div><b style={{ color: inc.marker_color }}>{inc.priority_score}</b></div>)}
          {incidents.length === 0 && <p className="muted">No incidents have been reported yet.</p>}
        </div>
        <div><CivicMap incidents={incidents} onSelect={openIncident} height="520px" /><div className="legend"><span><span className="dot" style={{ background: '#ef4444' }} /> Critical</span><span><span className="dot" style={{ background: '#f97316' }} /> High</span><span><span className="dot" style={{ background: '#eab308' }} /> Medium</span><span><span className="dot" style={{ background: '#22c55e' }} /> Low / Resolved</span></div></div>
        <div>
          <h4 className="mb">Incident Detail</h4>
          {detail ? <div className="card">
            <div className="flex between items-center mb"><span className="badge">INCIDENT #{detail.id}</span><span className="pill" style={{ background: detail.status_color, color: '#06121f' }}>{pretty(detail.status)}</span></div>
            <h4 style={{ marginBottom: 8 }}>{detail.title}</h4><p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{detail.description}</p>
            <div className="incident-meta-grid mb"><div><span>Category</span><b>{pretty(detail.category)}</b></div><div><span>Department</span><b>{detail.department || 'Routing'}</b></div><div><span>Reports</span><b>{detail.report_count || 1}</b></div></div>
            <div className="mb"><div className="flex between muted mb"><span>Priority Score</span><b>{detail.priority_score}/100</b></div><div className="bar"><div className="bar-fill" style={{ width: `${detail.priority_score}%`, background: detail.marker_color }} /></div><button className="text-button" onClick={() => setShowPriorityWhy(!showPriorityWhy)}>{showPriorityWhy ? 'Hide' : 'Why'} this priority?</button>{showPriorityWhy && <div className="reason-box"><div>Safety / severity <b>{detail.severity}</b></div><div>Citizen reports <b>{detail.report_count || 1}</b></div><div>Geographic context <b>Included</b></div><div>Analysis confidence <b>{Math.round((detail.ai_confidence || 0) * 100)}%</b></div></div>}</div>
            <div className="workflow-card"><div className="workflow-line compact">{STATUS_FLOW.map((s, i) => <div className={`workflow-item ${i < currentIdx ? 'done' : i === currentIdx ? 'active' : ''}`} key={s}><span className="workflow-dot">{i < currentIdx ? '✓' : i + 1}</span><span>{pretty(s)}</span></div>)}</div></div>
            <div className="mt action-strip">{detail.status === 'PRIORITIZED' && <button className="btn btn-primary btn-small" disabled={busy} onClick={doAssign}>Assign to {detail.department || 'department'}</button>}{detail.status === 'ASSIGNED' && <button className="btn btn-primary btn-small" disabled={busy} onClick={() => doStatus('IN_PROGRESS')}>Start work</button>}{detail.status === 'IN_PROGRESS' && <button className="btn btn-primary btn-small" disabled={busy} onClick={() => doStatus('RESOLVED')}>Mark work complete</button>}{detail.status === 'RESOLVED' && <span className="muted" style={{ fontSize: 12 }}>Add completion proof below to verify the fix.</span>}{detail.status === 'VERIFIED' && <span className="success-text">Resolution verified by CIVICOS</span>}</div>
            {detail.status !== 'VERIFIED' && <div className="mt"><div className="field"><label>Completion proof</label><input type="file" accept="image/*" onChange={handleImage} />{afterImage && <div className="muted mt" style={{ fontSize: 11 }}>Proof image attached</div>}</div><div className="field"><label>Resolution note</label><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Road repaired, pothole filled" /></div><button className="btn btn-secondary btn-small" disabled={busy || detail.status !== 'RESOLVED'} onClick={doVerify}>Verify resolution</button></div>}
            {verifyResult && <div className={`notice ${verifyResult.confidence >= 0.7 ? 'notice-green' : 'notice-purple'} mt`}><strong>{verifyResult.confidence >= 0.7 ? 'Likely resolved' : verifyResult.confidence >= 0.45 ? 'Partial resolution' : 'Incomplete'}</strong><div className="muted mt">Confidence: <b>{Math.round(verifyResult.confidence * 100)}%</b> · {verifyResult.verdict}</div></div>}
          </div> : <p className="muted">Select an incident from the queue or map.</p>}
        </div>
      </div>
    </div>
  );
}
