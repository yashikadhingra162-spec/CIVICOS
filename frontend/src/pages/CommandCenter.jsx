import React, { useEffect, useState } from 'react';
import { getIncidents, getIncident, getStats, assignIncident, setStatus, verifyIncident } from '../api.js';
import CivicMap from '../components/CivicMap.jsx';

const STATUS_FLOW = ['REPORTED', 'AI_VERIFIED', 'PRIORITIZED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED'];

export default function CommandCenter() {
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [afterImage, setAfterImage] = useState('');
  const [note, setNote] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const [d, s] = await Promise.all([getIncidents(), getStats()]);
    setIncidents(d.incidents);
    setStats(s);
  };

  const openIncident = async (inc) => {
    setSelected(inc);
    setVerifyResult(null);
    setAfterImage('');
    setNote('');
    const d = await getIncident(inc.id);
    setDetail(d);
  };

  const doAssign = async () => {
    await assignIncident(selected.id, {});
    const d = await getIncident(selected.id);
    setDetail(d);
    setSelected(d);
    load();
  };

  const doStatus = async (status) => {
    await setStatus(selected.id, status);
    const d = await getIncident(selected.id);
    setDetail(d);
    setSelected(d);
    load();
  };

  const doVerify = async () => {
    const res = await verifyIncident(selected.id, { after_image: afterImage, note });
    setVerifyResult(res);
    const d = await getIncident(selected.id);
    setDetail(d);
    setSelected(d);
    load();
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setAfterImage(reader.result);
    reader.readAsDataURL(file);
  };

  const currentIdx = detail ? STATUS_FLOW.indexOf(detail.status) : -1;

  return (
    <div>
      <div className="page-title">CIVICOS Command Center 🛰️</div>
      <div className="page-sub">City map + mission control — priority engine, assignment & resolution verification.</div>

      {stats && (
        <div className="grid grid-4 mb">
          <div className="card"><div className="stat-value" style={{ color: '#ef4444' }}>{stats.critical}</div><div className="stat-label">🔴 Critical</div></div>
          <div className="card"><div className="stat-value" style={{ color: '#f97316' }}>{stats.high}</div><div className="stat-label">🟠 High</div></div>
          <div className="card"><div className="stat-value" style={{ color: '#38bdf8' }}>{stats.medium}</div><div className="stat-label">🟡 Medium</div></div>
          <div className="card"><div className="stat-value" style={{ color: '#22c55e' }}>{stats.resolved}</div><div className="stat-label">✅ Resolved</div></div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: '1fr 1.4fr 1fr' }}>
        <div>
          <h4 className="mb">Issue Queue</h4>
          {incidents.map((inc) => (
            <div
              key={inc.id}
              className="incident-row"
              onClick={() => openIncident(inc)}
              style={selected && selected.id === inc.id ? { borderColor: '#38bdf8' } : {}}
            >
              <span className={`dot ${inc.priority_label === 'CRITICAL' ? '' : ''}`} style={{ background: inc.marker_color }} />
              <div className="grow" style={{ marginLeft: 12 }}>
                <div style={{ fontWeight: 600 }}>#{inc.id} · {inc.title}</div>
                <div className="muted" style={{ fontSize: 12 }}>{inc.category} · {inc.status}</div>
              </div>
              <b style={{ color: inc.marker_color }}>{inc.priority_score}</b>
            </div>
          ))}
          {incidents.length === 0 && <p className="muted">No incidents.</p>}
        </div>

        <div>
          <CivicMap incidents={incidents} onSelect={openIncident} height="520px" />
          <div className="legend">
            <span><span className="dot" style={{ background: '#ef4444' }} /> Critical</span>
            <span><span className="dot" style={{ background: '#f97316' }} /> High</span>
            <span><span className="dot" style={{ background: '#eab308' }} /> Medium</span>
            <span><span className="dot" style={{ background: '#22c55e' }} /> Low/Resolved</span>
          </div>
        </div>

        <div>
          <h4 className="mb">Incident Detail</h4>
          {detail ? (
            <div className="card">
              <div className="flex between items-center mb">
                <span className="badge">#{detail.id}</span>
                <span className="pill" style={{ background: detail.status_color, color: '#06121f' }}>{detail.status}</span>
              </div>
              <h4 style={{ marginBottom: 8 }}>{detail.title}</h4>
              <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{detail.description}</p>

              <div className="mb">
                <div className="flex between muted mb"><span>Priority Score</span><b>{detail.priority_score}/100</b></div>
                <div className="bar">
                  <div className="bar-fill" style={{ width: `${detail.priority_score}%`, background: detail.marker_color }} />
                </div>
              </div>

              <div className="muted mb" style={{ fontSize: 13 }}>
                <div>🏷️ Category: <b>{detail.category}</b></div>
                <div>🏢 Department: <b>{detail.department}</b></div>
                <div>👥 Reports: <b>{detail.report_count}</b></div>
                <div>🤖 AI Confidence: <b>{Math.round((detail.ai_confidence || 0) * 100)}%</b></div>
              </div>

              <div className="status-flow">
                {STATUS_FLOW.map((s, i) => (
                  <span key={s} className={`status-step ${i === currentIdx ? 'active' : i < currentIdx ? 'done' : ''}`}>
                    {s}
                  </span>
                ))}
              </div>

              <div className="mt" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {detail.status === 'ASSIGNED' && (
                  <button className="btn btn-secondary btn-small" onClick={() => doStatus('IN_PROGRESS')}>▶ Start</button>
                )}
                {detail.status === 'IN_PROGRESS' && (
                  <button className="btn btn-secondary btn-small" onClick={() => doStatus('RESOLVED')}>🏁 Mark Resolved</button>
                )}
                {detail.status === 'PRIORITIZED' && (
                  <button className="btn btn-primary btn-small" onClick={doAssign}>📤 Assign ({detail.department})</button>
                )}
              </div>

              <div className="mt">
                <div className="field">
                  <label>📸 After image (PROVE THE FIX)</label>
                  <input type="file" accept="image/*" onChange={handleImage} />
                </div>
                <div className="field">
                  <label>Resolution note</label>
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Road repaired, pothole filled" />
                </div>
                <button className="btn btn-primary btn-small" onClick={doVerify}>🧪 Verify Resolution</button>
              </div>

              {verifyResult && (
                <div className="card mt" style={{ background: verifyResult.confidence >= 0.7 ? '#052e16' : '#3b0764', borderColor: verifyResult.confidence >= 0.7 ? '#22c55e' : '#a855f7' }}>
                  <strong>{verifyResult.confidence >= 0.7 ? '✅ Likely Resolved' : verifyResult.confidence >= 0.45 ? '⚠️ Partial Resolution' : '❌ Incomplete'}</strong>
                  <div className="muted mt">Confidence: <b>{Math.round(verifyResult.confidence * 100)}%</b> · {verifyResult.verdict}</div>
                </div>
              )}
            </div>
          ) : (
            <p className="muted">Select an incident to manage it.</p>
          )}
        </div>
      </div>
    </div>
  );
}
