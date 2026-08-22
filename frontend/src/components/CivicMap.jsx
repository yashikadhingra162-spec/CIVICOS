import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, CircleMarker, Circle } from 'react-leaflet';
import L from 'leaflet';

const COLORS = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
};

function makeIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div class="marker-pin" style="background:${color}"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export default function CivicMap({
  incidents = [],
  center = [28.6139, 77.2090],
  zoom = 12,
  height = '480px',
  onSelect,
  hotspots = [],
  showHotspots = false,
}) {
  return (
    <div className="map-wrap" style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {showHotspots &&
          hotspots.map((h, i) => (
            <Circle
              key={`h-${i}`}
              center={[h.latitude, h.longitude]}
              radius={180}
              pathOptions={{ color: '#a855f7', fillColor: '#a855f7', fillOpacity: 0.15 }}
            >
              <Popup>
                <strong>Hotspot</strong>
                <br />
                {h.report_count} reports · {h.category}
              </Popup>
            </Circle>
          ))}
        {incidents.map((inc) => (
          <Marker
            key={inc.id}
            position={[inc.latitude, inc.longitude]}
            icon={makeIcon(COLORS[inc.sidebarColor || inc.marker_color] || COLORS.orange)}
            eventHandlers={{ click: () => onSelect && onSelect(inc) }}
          >
            <Tooltip direction="top" offset={[0, -12]} opacity={1} className="incident-preview-tooltip">
              <div style={{ width: 220 }}>
                {inc.preview_image ? (
                  <img
                    src={inc.preview_image}
                    alt={`Evidence for incident ${inc.id}`}
                    style={{
                      width: '100%',
                      height: 130,
                      objectFit: 'cover',
                      borderRadius: 8,
                      display: 'block',
                      marginBottom: 8,
                    }}
                  />
                ) : (
                  <div style={{
                    height: 80,
                    borderRadius: 8,
                    display: 'grid',
                    placeItems: 'center',
                    background: '#eef2f7',
                    color: '#64748b',
                    fontSize: 12,
                    marginBottom: 8,
                  }}>
                    No photo attached
                  </div>
                )}
                <strong style={{ display: 'block', fontSize: 13 }}>#{inc.id} · {inc.title}</strong>
                <span style={{ fontSize: 12, color: '#64748b' }}>Priority {inc.priority_score}/100 · {inc.status}</span>
              </div>
            </Tooltip>
            <Popup>
              <strong>#{inc.id} · {inc.title}</strong>
              <br />
              Priority: <b>{inc.priority_score}/100</b> ({inc.priority_label})
              <br />
              Reports: {inc.report_count} · {inc.department}
              <br />
              Status: <b>{inc.status}</b>
            </Popup>
          </Marker>
        ))}
        {incidents
          .filter((i) => i.status === 'VERIFIED')
          .map((inc) => (
            <CircleMarker
              key={`v-${inc.id}`}
              center={[inc.latitude, inc.longitude]}
              radius={8}
              pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.4 }}
            />
          ))}
      </MapContainer>
    </div>
  );
}
