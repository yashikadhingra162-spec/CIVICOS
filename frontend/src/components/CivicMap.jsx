import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Circle } from 'react-leaflet';
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
                <strong>⚠️ Hotspot</strong>
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
