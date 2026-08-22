import React, { useEffect, useState } from 'react';
import { getIncidents, getHotspots } from '../api.js';
import CivicMap from '../components/CivicMap.jsx';

const ENV_CATS = ['GARBAGE', 'ILLEGAL_DUMPING', 'WATER_POLLUTION', 'DRAINAGE', 'GREEN_SPACE'];

export default function EnvironmentalMap() {
  const [incidents, setIncidents] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [category, setCategory] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const [d, h] = await Promise.all([getIncidents(), getHotspots()]);
    setIncidents(d.incidents);
    setHotspots(h.hotspots);
  };

  const envIncidents = incidents.filter((i) =>
    ENV_CATS.includes(i.category) && (!category || i.category === category)
  );

  return (
    <div>
      <div className="page-title">Environmental Intelligence</div>
      <div className="page-sub">Waste, water & green-space hotspots detected from citizen reports.</div>

      <div className="flex gap wrap mb">
        {['', ...ENV_CATS].map((c) => (
          <button
            key={c || 'all'}
            className={`btn btn-small ${category === c ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setCategory(c)}
          >
            {c ? c.replace(/_/g, ' ').toLowerCase() : 'All environmental'}
          </button>
        ))}
      </div>

      <CivicMap
        incidents={envIncidents}
        hotspots={hotspots}
        showHotspots
        height="520px"
      />

      <div className="grid mt" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {hotspots.map((h, i) => (
          <div className="card" key={i}>
            <div className="hotspot-label">Hotspot</div>
            <h4 style={{ margin: '8px 0' }}>{h.category.replace(/_/g, ' ').toLowerCase()} hotspot</h4>
            <p className="muted">
              <b>{h.report_count}</b> reports · <b>{h.locations}</b> locations
            </p>
            <div className="muted" style={{ fontSize: 12 }}>
              {h.latitude.toFixed(4)}, {h.longitude.toFixed(4)}
            </div>
          </div>
        ))}
        {hotspots.length === 0 && <p className="muted">No hotspots detected yet.</p>}
      </div>
    </div>
  );
}
