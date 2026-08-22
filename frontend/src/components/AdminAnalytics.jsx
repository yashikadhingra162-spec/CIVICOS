import React, { useMemo } from 'react';

const COLORS = ['#5f9dff', '#49d3a5', '#f5a524', '#a78bfa', '#f87171', '#38bdf8'];
const pretty = (s) => String(s || 'Other').replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function Trend({ incidents }) {
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
      const bucket = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (bucket) bucket.total += 1;
    });
    return months;
  }, [incidents]);

  const max = Math.max(...points.map((p) => p.total), 1);
  const coords = points.map((p, i) => ({ x: 8 + i * (84 / Math.max(points.length - 1, 1)), y: 82 - (p.total / max) * 60 }));
  const line = coords.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `8,82 ${line} 92,82`;

  return <svg className="admin-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Reports submitted over the last six months">
    <defs><linearGradient id="civicosChartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#67a2ff" stopOpacity=".34" /><stop offset="100%" stopColor="#67a2ff" stopOpacity="0" /></linearGradient></defs>
    {[22, 42, 62, 82].map((y) => <line key={y} className="admin-chart-grid" x1="8" x2="92" y1={y} y2={y} />)}
    <polygon className="admin-chart-area" points={area} />
    <polyline className="admin-chart-line" points={line} />
    {coords.map((p, i) => <g key={points[i].key}><circle className="admin-chart-dot" cx={p.x} cy={p.y} r="1.55" /><text className="admin-chart-label" x={p.x} y="94" textAnchor="middle">{points[i].label}</text></g>)}
  </svg>;
}

export default function AdminAnalytics({ incidents, onSelect }) {
  const data = useMemo(() => {
    const categoryMap = incidents.reduce((map, incident) => {
      const name = pretty(incident.category);
      map[name] = (map[name] || 0) + 1;
      return map;
    }, {});
    const categories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count], index) => ({ name, count, color: COLORS[index] }));
    const total = categories.reduce((sum, item) => sum + item.count, 0) || 1;
    let cursor = 0;
    const stops = categories.map((item) => {
      const start = (cursor / total) * 100;
      cursor += item.count;
      const end = (cursor / total) * 100;
      return `${item.color} ${start}% ${end}%`;
    }).join(', ') || '#263040 0 100%';
    const recent = [...incidents].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 6);
    return { categories, stops, recent };
  }, [incidents]);

  return <>
    <div className="admin-analytics">
      <div className="admin-panel"><div className="admin-panel-head"><div><div className="admin-panel-title">Reporting Activity</div><div className="admin-panel-sub">Reports submitted during the last six months</div></div><span className="badge">LIVE SNAPSHOT</span></div><Trend incidents={incidents} /></div>
      <div className="admin-panel"><div className="admin-panel-head"><div><div className="admin-panel-title">Issue Breakdown</div><div className="admin-panel-sub">Most reported civic categories</div></div></div><div className="admin-breakdown"><div className="admin-donut" style={{ background: `conic-gradient(${data.stops})` }}><div className="admin-donut-center"><b>{incidents.length}</b><span>REPORTS</span></div></div><div className="admin-breakdown-list">{data.categories.length ? data.categories.map((item) => <div className="admin-breakdown-row" key={item.name}><div className="admin-breakdown-name"><i className="admin-breakdown-dot" style={{ background: item.color }} />{item.name}</div><span className="admin-breakdown-count">{item.count}</span></div>) : <span className="muted">No category data yet.</span>}</div></div></div>
    </div>
    <div className="admin-recent"><div className="admin-panel-head"><div><div className="admin-panel-title">Recent Reports</div><div className="admin-panel-sub">Latest activity entering the municipal workflow</div></div><span className="muted" style={{ fontSize: 11 }}>{incidents.length} total</span></div><div className="admin-recent-list">{data.recent.map((incident) => <div key={incident.id} className="admin-recent-item" onClick={() => onSelect?.(incident)}><div className="admin-recent-top"><span className="admin-status">{pretty(incident.status)}</span><b style={{ color: incident.marker_color }}>{incident.priority_score}</b></div><div className="admin-recent-title">{incident.title}</div><div className="admin-recent-meta">{pretty(incident.category)} · {incident.address || 'Location available'}</div></div>)}{!data.recent.length && <p className="muted">No reports have been submitted yet.</p>}</div></div>
  </>;
}
