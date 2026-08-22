import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createReport } from '../api.js';

const CATEGORIES = [['roads','🛣️ Roads & potholes'],['waste','🗑️ Waste & garbage'],['water','💧 Water & drainage'],['utilities','⚡ Electricity & utilities'],['environment','🌱 Environment'],['traffic','🚦 Traffic & safety'],['other','🏙️ Other civic issue']];

// Lightweight inline SVG so the report pin does not depend on a PNG asset or Leaflet's default marker images.
const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48"><path d="M18 1C8.6 1 1 8.5 1 17.9 1 30.8 18 47 18 47s17-16.2 17-29.1C35 8.5 27.4 1 18 1Z" fill="#ef4444" stroke="#fff" stroke-width="2"/><circle cx="18" cy="18" r="6.5" fill="#fff"/><circle cx="18" cy="18" r="3" fill="#ef4444"/></svg>`;
const reportPinIcon = L.icon({
  iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(PIN_SVG)}`,
  iconSize: [36, 48],
  iconAnchor: [18, 47],
  popupAnchor: [0, -42],
  shadowUrl: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="44" height="14"><ellipse cx="22" cy="7" rx="13" ry="4" fill="rgba(0,0,0,.22)"/></svg>'),
  shadowSize: [44, 14],
  shadowAnchor: [22, 10],
});

async function resolveAddress(latitude, longitude) {
  const googleKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // A Google request can fail in the browser because of CORS or key restrictions.
  // Never let that prevent the OpenStreetMap reverse-geocoding fallback from running.
  if (googleKey) {
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(`${latitude},${longitude}`)}&key=${encodeURIComponent(googleKey)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && data.results?.[0]?.formatted_address) return data.results[0].formatted_address;
      }
    } catch {}
  }

  try {
    const params = new URLSearchParams({ format: 'jsonv2', lat: String(latitude), lon: String(longitude), zoom: '18', addressdetails: '1' });
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, { headers: { Accept: 'application/json', 'Accept-Language': 'en' } });
    if (res.ok) {
      const data = await res.json();
      if (data.display_name) return data.display_name;
      const a = data.address || {};
      return [a.road, a.neighbourhood || a.suburb || a.village || a.town || a.city, a.state, a.country].filter(Boolean).join(', ');
    }
  } catch {}

  return '';
}

async function searchLocation(query) {
  const googleKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${encodeURIComponent(googleKey)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && data.results?.[0]) {
          const r = data.results[0];
          return { latitude: r.geometry.location.lat, longitude: r.geometry.location.lng, address: r.formatted_address };
        }
      }
    } catch {}
  }
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`, { headers: { Accept: 'application/json', 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error('Location search failed.');
  const data = await res.json();
  if (!data?.[0]) throw new Error('No location found. Try a more specific search.');
  return { latitude: Number(data[0].lat), longitude: Number(data[0].lon), address: data[0].display_name };
}

function Recenter({ position }) {
  const map = useMap();
  React.useEffect(() => { map.setView(position, Math.max(map.getZoom(), 14)); }, [map, position]);
  return null;
}

function LocationPin({ position, onChange }) {
  useMapEvents({ click(e) { onChange(e.latlng.lat, e.latlng.lng); } });
  return <Marker position={position} icon={reportPinIcon} draggable eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); onChange(p.lat, p.lng); } }} />;
}

export default function ReportIssue() {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [image, setImage] = useState('');
  const [lat, setLat] = useState(28.6139);
  const [lon, setLon] = useState(77.2090);
  const [address, setAddress] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setLocation = async (latitude, longitude, knownAddress = '') => {
    const nextLat = Number(Number(latitude).toFixed(6));
    const nextLon = Number(Number(longitude).toFixed(6));
    setLat(nextLat);
    setLon(nextLon);
    setError('');

    if (knownAddress) {
      setAddress(knownAddress);
      return;
    }

    setAddress('Looking up this location…');
    const name = await resolveAddress(nextLat, nextLon);
    setAddress(name || `Pinned location: ${nextLat}, ${nextLon}`);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return setError('Location is not supported by this browser.');
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await setLocation(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError('Location permission was unavailable. Search or pin the map instead.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  };

  const doSearch = async () => {
    if (!locationQuery.trim()) return;
    setSearching(true);
    setError('');
    try {
      const found = await searchLocation(locationQuery.trim());
      await setLocation(found.latitude, found.longitude, found.address);
    } catch (e) {
      setError(e.message || 'Could not find that location.');
    } finally {
      setSearching(false);
    }
  };

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Please choose an image file.');
    if (file.size > 1.5 * 1024 * 1024) return setError('Please choose an image smaller than 1.5 MB for now.');
    const reader = new FileReader();
    reader.onloadend = () => setImage(String(reader.result || ''));
    reader.onerror = () => setError('Could not read that image.');
    reader.readAsDataURL(file);
    setError('');
  };

  const submit = async () => {
    if (!description.trim()) return setError('Please describe the problem.');
    const latitude = Number(lat), longitude = Number(lon);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return setError('Please provide a valid location.');
    setLoading(true);
    setError('');
    try {
      setResult(await createReport({ description: description.trim(), category, latitude, longitude, address, image_url: image }));
    } catch (e) {
      setError(e.message || 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setDescription('');
    setImage('');
    setAddress('');
    setLocationQuery('');
    setCategory('other');
    setError('');
  };

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  const position = [Number(lat), Number(lon)];

  return <div style={{ maxWidth: 760 }}>
    <div className="page-title">Report an Issue 📢</div>
    <div className="page-sub">Report something where you are, or search and pinpoint an issue anywhere on the map.</div>
    {result ? <div className="card">
      <div className="success-header"><div><span className="eyebrow">REPORT RECEIVED</span><h2 style={{ fontFamily: 'Space Grotesk', marginTop: 4 }}>Your report is live in CIVICOS.</h2></div><span className="success-icon">✓</span></div>
      <div className="incident-id-card"><div><div className="muted" style={{ fontSize: 11 }}>REPORT</div><strong>#{result.report_id.slice(0, 8)}</strong></div><div className="muted" style={{ textAlign: 'right', fontSize: 12 }}>Submitted anonymously</div></div>
      <div className="notice notice-green mb"><strong>📍 Visible in All Reports and on CIVICOS maps</strong></div>
      <button className="btn btn-primary" onClick={reset}>＋ Report another issue</button>
    </div> : <div className="card">
      <div className="field"><label>🏷️ Tag this issue</label><select value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="field"><label>📸 Photo (optional)</label><input type="file" accept="image/*" onChange={handleImage} />{image && <><div className="muted mt">Photo attached ✓</div><img src={image} alt="Selected report evidence" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 10, marginTop: 10 }} /></>}</div>
      <div className="field"><label>Describe the problem</label><textarea rows={4} placeholder="e.g. Large pothole outside college gate, dangerous for students" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      <div className="field"><label>📍 Choose issue location</label><div className="flex gap"><input value={locationQuery} onChange={(e) => setLocationQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } }} placeholder="Search a city, landmark, street or address" /><button className="btn btn-secondary btn-small" type="button" onClick={doSearch} disabled={searching}>{searching ? 'Searching…' : 'Search'}</button></div><button className="btn btn-secondary btn-small mt" onClick={detectLocation} disabled={locating}>{locating ? '📍 Detecting…' : '📍 Detect my location'}</button></div>
      <div className="field"><label>Drop or drag the pin</label><div className="map-wrap" style={{ height: 340 }}><MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}><Recenter position={position} /><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><LocationPin position={position} onChange={setLocation} /></MapContainer></div><div className="flex gap mt"><input type="number" step="0.000001" value={lat} onChange={(e) => setLat(e.target.value)} aria-label="Latitude" /><input type="number" step="0.000001" value={lon} onChange={(e) => setLon(e.target.value)} aria-label="Longitude" /></div>{address && <div className="notice mt">📌 <strong>Selected place:</strong> {address}<br/><a href={mapsUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 6 }}>Open in Google Maps ↗</a></div>}</div>
      {error && <div className="notice notice-error mb">{error}</div>}
      <button className="btn btn-primary" onClick={submit} disabled={loading}>{loading ? 'Submitting…' : 'Submit Report'}</button>
      <p className="muted mt" style={{ fontSize: 13 }}>CIVICOS does not require a login. Reports are public and your identity is not collected.</p>
    </div>}
  </div>;
}
