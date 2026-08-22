import React, { useEffect, useState } from 'react';
import { getIncidents, statusLabel } from '../api.js';

export default function MyReports() {
  const [incidents, setIncidents] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { getIncidents().then((d) => setIncidents(d.incidents)).catch((e) => setError(e.message || 'Could not load reports.')); }, []);
  const filters = ['ALL', 'pending', 'open', 'verified', 'in_progress', 'resolved', 'rejected'];
  const visible = incidents.filter((inc) => filter === 'ALL' || inc.status === filter);
  return <div>
    <div className="page-title">All Reports</div>
    <div className="page-sub">A live public feed of civic issues reported by everyone. Click any card to view the full problem, photo, location and current status.</div>
    <div className="flex gap wrap mb">{filters.map((s) => <button key={s} className={`btn btn-small ${filter === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(s)}>{s === 'ALL' ? 'All reports' : statusLabel(s)}</button>)}</div>
    {error && <div className="notice notice-error mb">{error}</div>}
    {!error && visible.length === 0 && <p className="muted">No reports match this filter yet.</p>}
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>{visible.map((inc) => <button type="button" key={inc.id} onClick={() => setSelected(inc)} className="card" style={{ textAlign: 'left', cursor: 'pointer', padding: 16, border: '1px solid rgba(255,255,255,.12)' }}>
      {inc.preview_image && <img src={inc.preview_image} alt={`Evidence for ${inc.title}`} style={{ width: '100%', height: 170, objectFit: 'cover', borderRadius: 10, marginBottom: 14 }} />}
      {inc.resolution_images?.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(90px,1fr))', gap: 8, marginBottom: 14 }}>
        {inc.resolution_images.map((src, index) => <div key={`${src}-${index}`} style={{ position: 'relative' }}><img src={src} alt="Resolution proof" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 9, border: '1px solid rgba(74,222,128,.25)' }} /><span style={{ position: 'absolute', left: 6, bottom: 6, padding: '3px 6px', borderRadius: 999, fontSize: 9, fontWeight: 800, background: 'rgba(6,18,31,.88)', color: '#86efac' }}>FIX PROOF</span></div>)}
      </div>}
      <div className="flex between items-center mb"><span className="badge">Report #{inc.id.slice(0, 8)}</span><span className="pill" style={{ background: inc.status_color, color: '#06121f' }}>{statusLabel(inc.status)}</span></div>
      <h4 style={{ marginBottom: 8 }}>{inc.title}</h4><p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{inc.description.length > 110 ? `${inc.description.slice(0, 110)}…` : inc.description}</p><div className="muted" style={{ fontSize: 12 }}>📍 {inc.address || `${Number(inc.latitude).toFixed(5)}, ${Number(inc.longitude).toFixed(5)}`}</div><div className="mt" style={{ fontWeight: 700 }}>View full report →</div>
    </button>)}</div>
    {selected && <div role="dialog" aria-modal="true" onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.72)', display: 'grid', placeItems: 'center', padding: 20 }}><div className="card" onClick={(e) => e.stopPropagation()} style={{ width: 'min(760px, 100%)', maxHeight: '90vh', overflow: 'auto' }}>
      <div className="flex between items-center mb"><div><div className="page-title" style={{ fontSize: 28 }}>{selected.title}</div><div className="muted">Report #{selected.id.slice(0, 8)}</div></div><button className="btn btn-secondary btn-small" onClick={() => setSelected(null)}>Close ✕</button></div>
      {selected.preview_image && <img src={selected.preview_image} alt={`Full evidence for ${selected.title}`} style={{ width: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: 12, marginBottom: 18 }} />}
      {selected.resolution_images?.length > 0 && <div className="mt" style={{ marginBottom: 18 }}><h4 style={{ marginBottom: 10 }}>Resolution proof</h4><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>{selected.resolution_images.map((src, index) => <button key={`${src}-${index}`} type="button" onClick={() => window.open(src, '_blank', 'noopener,noreferrer')} style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left' }}><img src={src} alt="Resolution proof" style={{ width: '100%', height: 130, objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(74,222,128,.25)' }} /><span style={{ display: 'block', marginTop: 5, color: '#86efac', fontSize: 11, fontWeight: 700 }}>Fix proof {index + 1} ↗</span></button>)}</div></div>}
      <h4>Problem</h4><p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{selected.description}</p>
      <div className="notice mt">📍 <strong>{selected.address || 'Reported location'}</strong><br/><span className="muted">{selected.latitude}, {selected.longitude}</span><br/><a href={`https://www.google.com/maps/search/?api=1&query=${selected.latitude},${selected.longitude}`} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 8 }}>Open in Google Maps ↗</a></div>
      <div className="incident-meta-grid mt"><div><span>Status</span><b>{statusLabel(selected.status)}</b></div><div><span>Category</span><b>{selected.category}</b></div><div><span>Priority</span><b>{selected.priority_score}/100</b></div></div>
      {selected.resolution_note && <div className="notice notice-green mt"><strong>Resolution note</strong><br/><span className="muted">{selected.resolution_note}</span></div>}
    </div></div>}
  </div>;
}
