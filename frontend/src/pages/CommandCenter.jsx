import React, { useEffect, useMemo, useState } from 'react';
import { getIncidents, getIncident, getStats, assignIncident, setStatus, verifyIncident, deleteReport } from '../api.js';
import CivicMap from '../components/CivicMap.jsx';
import './admin-dashboard.css';

const STATUS_FLOW = ['REPORTED', 'AI_VERIFIED', 'PRIORITIZED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED'];
const pretty = (s) => String(s || '').replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const statusKey = (status) => String(status || '').trim().toUpperCase();
const CATEGORY_COLORS = ['#5f9dff', '#49d3a5', '#f5a524', '#a78bfa', '#f87171', '#38bdf8'];

function DashboardTrend({ incidents }) {
  const points = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString(undefined, { month: 'short' }), total: 0 });
    }
    incidents.forEach((incident) => {
      const d = new Date(incident.created_at);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const month = months.find((m) => m.key === key);
      if (month) month.total += 1;
    });
    return months;
  }, [incidents]);

  const max = Math.max(...points.map((p) => p.total), 1);
  const coords = points.map((p, i) => ({ x: 8 + i * (84 / Math.max(points.length - 1, 1)), y: 82 - (p.total / max) * 60 }));
  const line = coords.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `8,82 ${line} 92,82`;

  return <svg className="admin-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Reports submitted over the last six months">
    <defs><linearGradient id="civicosChartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#67a2ff" stopOpacity=".3" /><stop offset="100%" stopColor="#67a2ff" stopOpacity="0" /></linearGradient></defs>
    {[22, 42, 62, 82].map((y) => <line key={y} className="admin-chart-grid" x1="8" x2="92" y1={y} y2={y} />)}
    <polygon className="admin-chart-area" points={area} />
    <polyline className="admin-chart-line" points={line} />
    {coords.map((p, i) => <g key={points[i].key}><circle className="admin-chart-dot" cx={p.x} cy={p.y} r="1.5" /><text className="admin-chart-label" x={p.x} y="94" textAnchor="middle">{points[i].label}</text></g>)}
  </svg>;
}

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
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => { load(); }, []);
  const load = async () => {
    const [d, s] = await Promise.all([getIncidents(), getStats()]);
    setIncidents([...d.incidents].sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0)));
    setStats(s);
  };
  const openIncident = async (inc) => {
    setSelected(inc); setVerifyResult(null); setAfterImage(''); setNote(''); setShowPriorityWhy(false); setDeleteError('');
    const d = await getIncident(inc.id); setDetail(d);
  };
  const refreshSelected = async () => { const d = await getIncident(selected.id); setDetail(d); setSelected(d); await load(); };
  const doAssign = async () => { setBusy(true); try { await assignIncident(selected.id, {}); await refreshSelected(); } finally { setBusy(false); } };
  const doStatus = async (status) => { setBusy(true); try { await setStatus(selected.id, status); await refreshSelected(); } finally { setBusy(false); } };
  const doVerify = async () => { setBusy(true); try { const res = await verifyIncident(selected.id, { after_image: afterImage, note }); setVerifyResult(res); await refreshSelected(); } finally { setBusy(false); } };
  const doDelete = async () => {
    if (!detail || busy) return;
    const confirmed = window.confirm(`Delete this report permanently?\n\n${detail.title}\n\nThis cannot be undone.`);
    if (!confirmed) return;
    setBusy(true); setDeleteError('');
    try { await deleteReport(detail.id); setDetail(null); setSelected(null); setVerifyResult(null); await load(); }
    catch (error) { setDeleteError(error?.message || 'Unable to delete this report.'); }
    finally { setBusy(false); }
  };
  const handleImage = (e) => { const file = e.target.files[0]; if (!file || file.size > 4 * 1024 * 1024) return; const reader = new FileReader(); reader.onloadend = () => setAfterImage(reader.result); reader.readAsDataURL(file); };

  const dashboard = useMemo(() => {
    const total = incidents.length;
    const resolved = incidents.filter((i) => ['RESOLVED', 'VERIFIED'].includes(statusKey(i.status))).length;
    const open = Math.max(0, total - resolved);
    const rate = total ? Math.round((resolved / total) * 100) : 0;
    const categoryMap = incidents.reduce((map, incident) => {
      const name = pretty(incident.category || 'other');
      map[name] = (map[name] || 0) + 1;
      return map;
    }, {});
    const categories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count], index) => ({ name, count, color: CATEGORY_COLORS[index] }));
    const totalCategories = categories.reduce((sum, item) => sum + item.count, 0) || 1;
    let cursor = 0;
    const stops = categories.map((item) => {
      const start = (cursor / totalCategories) * 100;
      cursor += item.count;
      const end = (cursor / totalCategories) * 100;
      return `${item.color} ${start}% ${end}%`;
    }).join(', ') || '#263040 0 100%';
    const recent = [...incidents].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 6);
    return { total, open, resolved, rate, categories, stops, recent };
  }, [incidents]);

  const currentIdx = detail ? Math.max(0, STATUS_FLOW.indexOf(statusKey(detail.status))) : -1;

  return <div>
    <section className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div><div className="admin-dashboard-eyebrow">CIVICOS // MUNICIPAL INTELLIGENCE</div><h2>Command Centre Dashboard</h2><p>Live operational view of civic issues reported through CIVICOS.</p></div>
        <div className="admin-live"><i /> LIVE DATA</div>
      </div>

      <div className="admin-metrics">
        <div className="admin-metric"><div className="admin-metric-label">Total Reports</div><div className="admin-metric-value">{dashboard.total}</div><div className="admin-metric-foot">Approved public reports</div><div className="admin-metric-icon">▤</div></div>
        <div className="admin-metric"><div className="admin-metric-label">Open Issues</div><div className="admin-metric-value">{dashboard.open}</div><div className="admin-metric-foot">Still awaiting resolution</div><div className="admin-metric-icon">◉</div></div>
        <div className="admin-metric"><div className="admin-metric-label">Resolved</div><div className="admin-metric-value">{dashboard.resolved}</div><div className="admin-metric-foot">Resolved or verified reports</div><div className="admin-metric-icon">✓</div></div>
        <div className="admin-metric"><div className="admin-metric-label">Resolution Rate</div><div className="admin-metric-value">{dashboard.rate}%</div><div className="admin-metric-foot">Current report resolution snapshot</div><div className="admin-metric-icon">↗</div></div>
      </div>

      <div className="admin-analytics">
        <div className="admin-panel"><div className="admin-panel-head"><div><div className="admin-panel-title">Reporting Activity</div><div className="admin-panel-sub">Reports submitted during the last six months</div></div><span className="badge">LIVE SNAPSHOT</span></div><DashboardTrend incidents={incidents} /></div>
        <div className="admin-panel"><div className="admin-panel-head"><div><div className="admin-panel-title">Issue Breakdown</div><div className="admin-panel-sub">Most reported civic categories</div></div></div><div className="admin-breakdown"><div className="admin-donut" style={{ background: `conic-gradient(${dashboard.stops})` }}><div className="admin-donut-center"><b>{dashboard.total}</b><span>REPORTS</span></div></div><div className="admin-breakdown-list">{dashboard.categories.length ? dashboard.categories.map((item) => <div className="admin-breakdown-row" key={item.name}><div className="admin-breakdown-name"><i className="admin-breakdown-dot" style={{ background: item.color }} />{item.name}</div><span className="admin-breakdown-count">{item.count}</span></div>) : <span className="muted">No category data yet.</span>}</div></div></div>
      </div>

      <div className="admin-recent"><div className="admin-panel-head"><div><div className="admin-panel-title">Recent Reports</div><div className="admin-panel-sub">Latest activity entering the municipal workflow</div></div><span className="muted" style={{ fontSize: 11 }}>{dashboard.total} total</span></div><div className="admin-recent-list">{dashboard.recent.map((incident) => <div key={incident.id} className="admin-recent-item" onClick={() => openIncident(incident)}><div className="admin-recent-top"><span className="admin-status">{pretty(incident.status)}</span><b style={{ color: incident.marker_color }}>{incident.priority_score}</b></div><div className="admin-recent-title">{incident.title}</div><div className="admin-recent-meta">{pretty(incident.category)} · {incident.address || 'Location available'}</div></div>)}{!dashboard.recent.length && <p className="muted">No reports have been submitted yet.</p>}</div></div>
    </section>

    <div className="page-title">Operational Workflow</div><div className="page-sub">From priority to assignment, field action and proof — one operational workflow.</div>
    {stats && <div className="grid grid-4 mb"><div className="card stat-card"><div><div className="stat-value" style={{ color: '#ef4444' }}>{stats.critical}</div><div className="stat-label">Critical</div></div></div><div className="card stat-card"><div><div className="stat-value" style={{ color: '#f97316' }}>{stats.high}</div><div className="stat-label">High Priority</div></div></div><div className="card stat-card"><div><div className="stat-value" style={{ color: '#38bdf8' }}>{stats.medium}</div><div className="stat-label">Medium Priority</div></div></div><div className="card stat-card"><div><div className="stat-value" style={{ color: '#22c55e' }}>{stats.resolved}</div><div className="stat-label">Resolved</div></div></div></div>}
    <div className="grid" style={{ gridTemplateColumns: 'minmax(260px,.8fr) minmax(340px,1.2fr) minmax(300px,1fr)' }}>
      <div><div className="flex between items-center mb"><h4>Priority Queue</h4><span className="muted" style={{ fontSize: 11 }}>{incidents.length} incidents</span></div>{incidents.map((inc) => <div key={inc.id} className="incident-row" onClick={() => openIncident(inc)} style={{ ...(selected?.id === inc.id ? { borderColor: '#38bdf8', boxShadow: '0 0 0 1px rgba(56,189,248,.12)' } : {}), alignItems: 'center' }}>{inc.preview_image ? <img src={inc.preview_image} alt="Report evidence" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, marginRight: 10 }} /> : <span className="dot" style={{ background: inc.marker_color, marginRight: 10 }} />}<div className="grow"><div style={{ fontWeight: 600 }}>#{String(inc.id).slice(0, 8)} · {inc.title}</div><div className="muted" style={{ fontSize: 11 }}>{inc.category} · {pretty(inc.status)}</div></div><b style={{ color: inc.marker_color }}>{inc.priority_score}</b></div>)}{incidents.length === 0 && <p className="muted">No incidents have been reported yet.</p>}</div>
      <div><CivicMap incidents={incidents} onSelect={openIncident} height="520px" /><div className="legend"><span><span className="dot" style={{ background: '#ef4444' }} /> Critical</span><span><span className="dot" style={{ background: '#f97316' }} /> High</span><span><span className="dot" style={{ background: '#eab308' }} /> Medium</span><span><span className="dot" style={{ background: '#22c55e' }} /> Low / Resolved</span></div></div>
      <div><h4 className="mb">Incident Detail</h4>{detail ? <div className="card"><div className="flex between items-center mb"><span className="badge">INCIDENT #{String(detail.id).slice(0, 8)}</span><span className="pill" style={{ background: detail.status_color, color: '#06121f' }}>{pretty(detail.status)}</span></div>{detail.preview_image && <img src={detail.preview_image} alt={`Evidence for ${detail.title}`} style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 12, marginBottom: 14, cursor: 'pointer' }} onClick={() => window.open(detail.preview_image, '_blank', 'noopener,noreferrer')} title="Click to open full image" />}<h4 style={{ marginBottom: 8 }}>{detail.title}</h4><p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{detail.description}</p><div className="notice mb">📍 <strong>{detail.address || 'Reported location'}</strong></div><div className="incident-meta-grid mb"><div><span>Category</span><b>{pretty(detail.category)}</b></div><div><span>Department</span><b>{detail.department || 'Routing'}</b></div><div><span>Reports</span><b>{detail.report_count || 1}</b></div></div><div className="mb"><div className="flex between muted mb"><span>Priority Score</span><b>{detail.priority_score}/100</b></div><div className="bar"><div className="bar-fill" style={{ width: `${detail.priority_score}%`, background: detail.marker_color }} /></div><button className="text-button" onClick={() => setShowPriorityWhy(!showPriorityWhy)}>{showPriorityWhy ? 'Hide' : 'Why'} this priority?</button>{showPriorityWhy && <div className="reason-box"><div>Safety / severity <b>{detail.severity}</b></div><div>Citizen reports <b>{detail.report_count || 1}</b></div><div>Geographic context <b>Included</b></div><div>Analysis confidence <b>{Math.round((detail.ai_confidence || 0) * 100)}%</b></div></div>}</div><div className="workflow-card"><div className="workflow-line compact">{STATUS_FLOW.map((s, i) => <div className={`workflow-item ${i < currentIdx ? 'done' : i === currentIdx ? 'active' : ''}`} key={s}><span className="workflow-dot">{i < currentIdx ? '✓' : i + 1}</span><span>{pretty(s)}</span></div>)}</div></div><div className="mt action-strip">{statusKey(detail.status) === 'PRIORITIZED' && <button className="btn btn-primary btn-small" disabled={busy} onClick={doAssign}>Assign to {detail.department || 'department'}</button>}{statusKey(detail.status) === 'ASSIGNED' && <button className="btn btn-primary btn-small" disabled={busy} onClick={() => doStatus('IN_PROGRESS')}>Start work</button>}{statusKey(detail.status) === 'IN_PROGRESS' && <button className="btn btn-primary btn-small" disabled={busy} onClick={() => doStatus('RESOLVED')}>Mark work complete</button>}{statusKey(detail.status) === 'RESOLVED' && <span className="muted" style={{ fontSize: 12 }}>Add completion proof below to verify the fix.</span>}{statusKey(detail.status) === 'VERIFIED' && <span className="success-text">Resolution verified by CIVICOS</span>}</div>{statusKey(detail.status) !== 'VERIFIED' && <div className="mt"><div className="field"><label>Completion proof</label><input type="file" accept="image/*" onChange={handleImage} />{afterImage && <div className="muted mt" style={{ fontSize: 11 }}>Proof image attached</div>}</div><div className="field"><label>Resolution note</label><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Road repaired, pothole filled" /></div><button className="btn btn-secondary btn-small" disabled={busy || statusKey(detail.status) !== 'RESOLVED'} onClick={doVerify}>Verify resolution</button></div>}<div className="mt" style={{ borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: 14 }}><div className="muted" style={{ fontSize: 11, marginBottom: 8 }}>Danger zone</div><button className="btn btn-small" disabled={busy} onClick={doDelete} style={{ background: '#7f1d1d', color: '#fff', border: '1px solid #ef4444' }}>{busy ? 'Deleting…' : '🗑 Delete Report'}</button>{deleteError && <div className="notice mt" style={{ color: '#fecaca' }}>{deleteError}</div>}</div>{verifyResult && <div className={`notice ${verifyResult.confidence >= 0.7 ? 'notice-green' : 'notice-purple'} mt`}><strong>{verifyResult.confidence >= 0.7 ? 'Likely resolved' : verifyResult.confidence >= 0.45 ? 'Partial resolution' : 'Incomplete'}</strong><div className="muted mt">Confidence: <b>{Math.round(verifyResult.confidence * 100)}%</b> · {verifyResult.verdict}</div></div>}</div> : <p className="muted">Select an incident from the queue, map or dashboard.</p>}</div>
    </div>
  </div>;
}
