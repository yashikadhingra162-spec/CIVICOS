import React, { useEffect, useMemo, useState } from 'react';
import { getIncidents, getIncident, getStats, assignIncident, setStatus, verifyIncident, deleteReport } from '../api.js';
import CivicMap from '../components/CivicMap.jsx';
import './admin-dashboard.css';

const pretty = (s) => String(s || '').replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const key = (s) => String(s || '').trim().toUpperCase();

export default function CommandCenter() {
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [afterImage, setAfterImage] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const [d, s] = await Promise.all([getIncidents(), getStats()]);
    setIncidents([...(d.incidents || [])].sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0)));
    setStats(s);
  };
  useEffect(() => { load().catch((e) => setError(e.message || 'Unable to load reports.')); }, []);

  const openIncident = async (inc) => {
    setSelected(inc); setDetail(null); setMessage(''); setError(''); setAfterImage(''); setNote('');
    try { setDetail(await getIncident(inc.id)); } catch (e) { setError(e.message || 'Unable to load report details.'); }
  };
  const refresh = async (id = selected?.id) => {
    if (!id) return;
    const d = await getIncident(id);
    setDetail(d); setSelected(d); await load();
  };
  const action = async (fn, success) => {
    if (!selected || busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await fn(); await refresh(); setMessage(success); }
    catch (e) { setError(e?.message || 'Action failed.'); }
    finally { setBusy(false); }
  };
  const handleVerify = () => action(async () => {
    await verifyIncident(selected.id, { after_image: afterImage || null, note: note.trim() || null });
    setAfterImage(''); setNote('');
  }, 'Resolution verified successfully.');
  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return; }
    if (file.size > 4 * 1024 * 1024) { setError('Proof image must be 4 MB or smaller.'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setAfterImage(String(reader.result || ''));
    reader.readAsDataURL(file);
  };
  const current = key(detail?.status);
  const counts = useMemo(() => ({ total: incidents.length, open: incidents.filter((i) => !['RESOLVED', 'VERIFIED'].includes(key(i.status))).length, resolved: incidents.filter((i) => ['RESOLVED', 'VERIFIED'].includes(key(i.status))).length }), [incidents]);

  return <div>
    <section className="admin-dashboard">
      <div className="admin-dashboard-header"><div><div className="admin-dashboard-eyebrow">CIVICOS // MUNICIPAL INTELLIGENCE</div><h2>Command Centre Dashboard</h2><p>Manage, resolve and verify civic reports.</p></div><div className="admin-live"><i /> LIVE DATA</div></div>
      <div className="admin-metrics">
        <div className="admin-metric"><div className="admin-metric-label">Total Reports</div><div className="admin-metric-value">{counts.total}</div><div className="admin-metric-foot">All active records</div></div>
        <div className="admin-metric"><div className="admin-metric-label">Open Issues</div><div className="admin-metric-value">{counts.open}</div><div className="admin-metric-foot">Awaiting resolution</div></div>
        <div className="admin-metric"><div className="admin-metric-label">Resolved</div><div className="admin-metric-value">{counts.resolved}</div><div className="admin-metric-foot">Resolved or verified</div></div>
        <div className="admin-metric"><div className="admin-metric-label">Critical</div><div className="admin-metric-value">{stats?.critical || 0}</div><div className="admin-metric-foot">Priority reports</div></div>
      </div>
    </section>

    <div className="page-title">Operational Workflow</div><div className="page-sub">Select a report and manage its complete lifecycle.</div>
    {error && <div className="notice notice-error mb">{error}</div>}
    {message && <div className="notice notice-green mb">{message}</div>}
    <div className="grid" style={{ gridTemplateColumns: 'minmax(260px,.8fr) minmax(340px,1.2fr) minmax(300px,1fr)' }}>
      <div><div className="flex between items-center mb"><h4>Priority Queue</h4><span className="muted">{incidents.length} reports</span></div>{incidents.map((inc) => <div key={inc.id} className="incident-row" onClick={() => openIncident(inc)} style={selected?.id === inc.id ? { borderColor: '#38bdf8' } : {}}>{inc.preview_image ? <img src={inc.preview_image} alt="Evidence" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, marginRight: 10 }} /> : <span className="dot" style={{ background: inc.marker_color, marginRight: 10 }} />}<div className="grow"><div style={{ fontWeight: 600 }}>{inc.title}</div><div className="muted" style={{ fontSize: 11 }}>{pretty(inc.category)} · {pretty(inc.status)}</div></div><b style={{ color: inc.marker_color }}>{inc.priority_score}</b></div>)}{!incidents.length && <p className="muted">No reports yet.</p>}</div>
      <div><CivicMap incidents={incidents} onSelect={openIncident} height="520px" /></div>
      <div><h4 className="mb">Incident Detail</h4>{detail ? <div className="card">
        <div className="flex between items-center mb"><span className="badge">INCIDENT #{String(detail.id).slice(0, 8)}</span><span className="pill" style={{ background: detail.status_color, color: '#06121f' }}>{pretty(detail.status)}</span></div>
        {detail.preview_image && <img src={detail.preview_image} alt="Report evidence" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 12, marginBottom: 14 }} />}
        <h4>{detail.title}</h4><p className="muted mb">{detail.description}</p><div className="notice mb">📍 {detail.address || 'Reported location'}</div>
        <div className="action-strip mt">
          {current === 'PRIORITIZED' && <button className="btn btn-primary btn-small" disabled={busy} onClick={() => action(() => assignIncident(selected.id, {}), 'Report assigned.')}>Assign</button>}
          {current === 'ASSIGNED' && <button className="btn btn-primary btn-small" disabled={busy} onClick={() => action(() => setStatus(selected.id, 'IN_PROGRESS'), 'Work started.')}>Start work</button>}
          {current === 'IN_PROGRESS' && <button className="btn btn-primary btn-small" disabled={busy} onClick={() => action(() => setStatus(selected.id, 'RESOLVED'), 'Marked as resolved. You can now verify it.')}>Mark complete</button>}
          {current === 'VERIFIED' && <span className="success-text">✓ Resolution verified by CIVICOS</span>}
        </div>
        {current !== 'VERIFIED' && <div className="mt">
          <div className="field"><label>Completion proof</label><input type="file" accept="image/*" onChange={handleImage} />{afterImage && <div className="muted mt" style={{ fontSize: 11 }}>Proof image ready to upload</div>}</div>
          <div className="field"><label>Resolution note</label><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Road repaired, pothole filled" /></div>
          <button className="btn btn-secondary btn-small" disabled={busy} onClick={handleVerify}>{busy ? 'Verifying…' : 'Verify resolution'}</button>
          <div className="muted mt" style={{ fontSize: 11 }}>Admin verification is available directly from this panel.</div>
        </div>}
        <div className="mt" style={{ borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: 14 }}><button className="btn btn-small" disabled={busy} onClick={() => action(() => deleteReport(selected.id), 'Report deleted.')} style={{ background: '#7f1d1d', color: '#fff', border: '1px solid #ef4444' }}>{busy ? 'Working…' : '🗑 Delete Report'}</button></div>
      </div> : <p className="muted">Select an incident from the queue or map.</p>}</div>
    </div>
  </div>;
}
