import React, { useState } from 'react';
import { createReport } from '../api.js';

async function resolveAddress(latitude, longitude) {
  const googleKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleKey}`);
    if (res.ok) { const data = await res.json(); if (data.status === 'OK' && data.results?.[0]) return data.results[0].formatted_address; }
  }
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`, { headers: { Accept: 'application/json' } });
    if (res.ok) { const data = await res.json(); return data.display_name || ''; }
  } catch { /* keep coordinate fallback */ }
  return '';
}

export default function ReportIssue() {
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [lat, setLat] = useState(28.6139);
  const [lon, setLon] = useState(77.2090);
  const [address, setAddress] = useState('');
  const [locating, setLocating] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const detectLocation = () => {
    if (!navigator.geolocation) return setError('Location is not supported by this browser.');
    setLocating(true); setError(''); setAddress('Detecting your location…');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const latitude = Number(pos.coords.latitude.toFixed(6)); const longitude = Number(pos.coords.longitude.toFixed(6));
      setLat(latitude); setLon(longitude);
      const name = await resolveAddress(latitude, longitude);
      setAddress(name || `Location detected near ${latitude}, ${longitude}`); setLocating(false);
    }, () => { setLocating(false); setAddress(''); setError('Location permission was unavailable. You can enter coordinates manually.'); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  };

  const handleImage = (e) => { const file = e.target.files?.[0]; if (!file) return; if (!file.type.startsWith('image/')) return setError('Please choose an image file.'); if (file.size > 1.5 * 1024 * 1024) return setError('Please choose an image smaller than 1.5 MB for now.'); const reader = new FileReader(); reader.onloadend = () => setImage(String(reader.result || '')); reader.onerror = () => setError('Could not read that image.'); reader.readAsDataURL(file); setError(''); };
  const submit = async () => { if (!description.trim()) return setError('Please describe the problem.'); const latitude = Number(lat), longitude = Number(lon); if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return setError('Please provide a valid location.'); setLoading(true); setError(''); try { setResult(await createReport({ description: description.trim(), latitude, longitude, address, image_url: image })); } catch (e) { setError(e.message || 'Failed to submit report. Please try again.'); } finally { setLoading(false); } };
  const reset = () => { setResult(null); setDescription(''); setImage(''); setAddress(''); setError(''); };
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;

  return <div style={{ maxWidth: 720 }}>
    <div className="page-title">Report an Issue 📢</div><div className="page-sub">No account required. Your identity is not collected by CIVICOS.</div>
    {result ? <div className="card"><div className="success-header"><div><span className="eyebrow">REPORT RECEIVED</span><h2 style={{ fontFamily: 'Space Grotesk', marginTop: 4 }}>Your report is live in CIVICOS.</h2></div><span className="success-icon">✓</span></div><div className="incident-id-card"><div><div className="muted" style={{ fontSize: 11 }}>REPORT</div><strong>#{result.report_id.slice(0, 8)}</strong></div><div className="muted" style={{ textAlign: 'right', fontSize: 12 }}>Submitted anonymously</div></div><div className="notice notice-green mb"><strong>📍 Visible on the CIVICOS maps</strong><p className="muted mt" style={{ fontSize: 13 }}>Your report was saved successfully and can be opened in All Reports.</p></div><button className="btn btn-primary" onClick={reset}>＋ Report another issue</button></div> : <div className="card">
      <div className="field"><label>📸 Photo (optional)</label><input type="file" accept="image/*" onChange={handleImage} />{image && <><div className="muted mt">Photo attached ✓</div><img src={image} alt="Selected report evidence" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 10, marginTop: 10 }} /></>}</div>
      <div className="field"><label>Describe the problem</label><textarea rows={4} placeholder="e.g. Large pothole outside college gate, dangerous for students" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      <div className="field"><label>📍 Location</label><div className="flex gap"><input type="number" step="0.000001" value={lat} onChange={(e) => setLat(e.target.value)} aria-label="Latitude" /><input type="number" step="0.000001" value={lon} onChange={(e) => setLon(e.target.value)} aria-label="Longitude" /></div><button className="btn btn-secondary btn-small mt" onClick={detectLocation} disabled={locating}>{locating ? '📍 Detecting…' : '📍 Detect my location'}</button>{address && <div className="notice mt" style={{ marginTop: 10 }}>📌 <strong>Detected place:</strong> {address}<br/><a href={mapsUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 6 }}>Open this location in Google Maps ↗</a></div>}</div>
      {error && <div className="notice notice-error mb">{error}</div>}<button className="btn btn-primary" onClick={submit} disabled={loading}>{loading ? 'Submitting…' : 'Submit Report'}</button><p className="muted mt" style={{ fontSize: 13 }}>CIVICOS remembers reports submitted from this browser in All Reports.</p>
    </div>}
  </div>;
}
