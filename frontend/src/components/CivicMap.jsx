import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, CircleMarker, Circle } from 'react-leaflet';
import L from 'leaflet';

function makeIcon(color) {
  return L.divIcon({ className: '', html: `<div class="marker-pin" style="background:${color}"></div>`, iconSize: [22, 22], iconAnchor: [11, 11] });
}

export default function CivicMap({ incidents = [], center = [28.6139, 77.2090], zoom = 12, height = '480px', onSelect, hotspots = [], showHotspots = false }) {
  const validIncidents = incidents.filter((inc) => Number.isFinite(Number(inc.latitude)) && Number.isFinite(Number(inc.longitude)));
  const validHotspots = hotspots.filter((h) => Number.isFinite(Number(h.latitude)) && Number.isFinite(Number(h.longitude)));
  return (
    <div className="map-wrap" style={{ height }}>
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {showHotspots && validHotspots.map((h, i) => <Circle key={`h-${i}`} center={[Number(h.latitude), Number(h.longitude)]} radius={180} pathOptions={{ color: '#a855f7', fillColor: '#a855f7', fillOpacity: 0.15 }}><Popup><strong>Hotspot</strong><br />{h.report_count} reports · {h.category}</Popup></Circle>)}
        {validIncidents.map((inc) => (
          <Marker key={inc.id} position={[Number(inc.latitude), Number(inc.longitude)]} icon={makeIcon(inc.marker_color || inc.sidebarColor || '#f97316')} eventHandlers={{ click: () => onSelect && onSelect(inc) }}>
            <Tooltip direction="top" offset={[0, -12]} opacity={1} className="incident-preview-tooltip">
              <div style={{ width: 220 }}>
                {inc.preview_image ? <img src={inc.preview_image} alt={`Evidence for incident ${inc.id}`} style={{ width: '100%', height: 130, objectFit: 'cover', borderRadius: 8, display: 'block', marginBottom: 8 }} /> : <div style={{ height: 80, borderRadius: 8, display: 'grid', placeItems: 'center', background: '#eef2f7', color: '#64748b', fontSize: 12, marginBottom: 8 }}>No photo attached</div>}
                <strong style={{ display: 'block', fontSize: 13 }}>#{String(inc.id).slice(0, 8)} · {inc.title}</strong>
                <span style={{ fontSize: 12, color: '#64748b' }}>Priority {inc.priority_score}/100 · {inc.status}</span>
              </div>
            </Tooltip>
            <Popup><strong>#{String(inc.id).slice(0, 8)} · {inc.title}</strong><br />Priority: <b>{inc.priority_score}/100</b> ({inc.priority_label})<br />Reports: {inc.report_count} · {inc.department}<br />Status: <b>{inc.status}</b></Popup>
          </Marker>
        ))}
        {validIncidents.filter((i) => i.status === 'verified').map((inc) => <CircleMarker key={`v-${inc.id}`} center={[Number(inc.latitude), Number(inc.longitude)]} radius={8} pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.4 }} />)}
      </MapContainer>
    </div>
  );
}
