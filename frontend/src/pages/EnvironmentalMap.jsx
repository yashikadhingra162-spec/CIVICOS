import React, { useEffect, useState } from 'react';
import { getIncidents, getHotspots } from '../api.js';
import CivicMap from '../components/CivicMap.jsx';

const ENV_CATS = ['waste', 'water', 'environment'];
const pretty = (value) => String(value).replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function EnvironmentalMap() {
  const [incidents, setIncidents] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setError('');
      const [d, h] = await Promise.all([getIncidents(), getHotspots()]);
      setIncidents(d.incidents); setHotspots(h.hotspots);
    } catch (e) { setError(e.message || 'Could not load environmental reports.'); }
  };

  const envIncidents = incidents.filter((i) => ENV_CATS.includes(i.category) && (!category || i.category === category));
  const envHotspots = hotspots.filter((h) => ENV_CATS.includes(h.category) && (!category || h.category === category));

  return (
    <div>
      <div className="page-title">Environmental Intelligence</div>
      <div className="page-sub">Waste, water and environmental issues detected from citizen reports.</div>
      <div className="flex gap wrap mb">
        {['', ...ENV_CATS].map((c) => <button key={c || 'all'} className={`btn btn-small ${category === c ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCategory(c)}>{c ? pretty(c) : 'All environmental'}</button>)}
      </div>
      {error && <div className="notice notice-error mb">{error}</div>}
      <CivicMap incidents={envIncidents} hotspots={envHotspots} showHotspots height="520px" />
      {!error && envIncidents.length === 0 && <p className="muted mt">No environmental reports match this filter yet.</p>}
      <div className="grid mt" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {envHotspots.map((h, i) => <div className="card" key={i}><div className="hotspot-label">Hotspot</div><h4 style={{ margin: '8px 0' }}>{pretty(h.category)} hotspot</h4><p className="muted"><b>{h.report_count}</b> report{h.report_count === 1 ? '' : 's'}</p><div className="muted" style={{ fontSize: 12 }}>{h.latitude.toFixed(4)}, {h.longitude.toFixed(4)}</div></div>)}
      </div>
    </div>
  );
}
