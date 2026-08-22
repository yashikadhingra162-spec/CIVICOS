import React, { useState } from 'react';
import { createReport } from '../api.js';

const FLOW = ['REPORTED', 'PENDING_REVIEW', 'APPROVED', 'PRIORITIZED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED'];
const pretty = (s) => s.replaceAll('_', ' ');

export default function ReportIssue() {
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [lat, setLat] = useState(28.6139);
  const [lon, setLon] = useState(77.2090);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError('Location is not supported by this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(parseFloat(pos.coords.latitude.toFixed(6)));
        setLon(parseFloat(pos.coords.longitude.toFixed(6)));
        setError('');
      },
      () => setError('Location permission was unavailable. You can enter coordinates manually.')
    );
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError('Please choose an image smaller than 4 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result);
    reader.readAsDataURL(file);
    setError('');
  };

  const submit = async () => {
    if (!description.trim()) {
      setError('Please describe the problem.');
      return;
    }
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) {
      setError('Please provide a valid location.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await createReport({
        description: description.trim(),
        latitude: Number(lat),
        longitude: Number(lon),
        image_url: image,
      });
      setResult(res);
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
    setError('');
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="page-title">Report an Issue 📢</div>
      <div className="page-sub">No account required. Your identity is not collected by CIVICOS.</div>

      {result ? (
        <div className="card">
          <div className="success-header">
            <div>
              <span className="eyebrow">REPORT RECEIVED</span>
              <h2 style={{ fontFamily: 'Space Grotesk', marginTop: 4 }}>Your report is in the system.</h2>
            </div>
            <span className="success-icon">✓</span>
          </div>

          <div className="incident-id-card">
            <div>
              <div className="muted" style={{ fontSize: 11 }}>REPORT</div>
              <strong>#{result.report_id.slice(0, 8)}</strong>
            </div>
            <div className="muted" style={{ textAlign: 'right', fontSize: 12 }}>
              Submitted anonymously
            </div>
          </div>

          <div className="notice notice-purple mb">
            <strong>🛡️ Pending community safety review</strong>
            <p className="muted mt" style={{ fontSize: 13 }}>
              CIVICOS keeps submissions open and anonymous. Reports stay out of the public map until moderation and spam checks approve them.
            </p>
          </div>

          <div className="workflow-card">
            <div className="flex between items-center mb">
              <div>
                <strong>What happens next?</strong>
                <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>The report enters review before becoming publicly visible.</div>
              </div>
              <span className="badge">ANONYMOUS REPORTING</span>
            </div>
            <div className="workflow-line">
              {FLOW.map((step, i) => (
                <div className={`workflow-item ${i === 0 ? 'done' : i === 1 ? 'active' : ''}`} key={step}>
                  <span className="workflow-dot">{i === 0 ? '✓' : i + 1}</span>
                  <span>{pretty(step)}</span>
                </div>
              ))}
            </div>
          </div>

          <button className="btn btn-primary" onClick={reset}>＋ Report another issue</button>
        </div>
      ) : (
        <div className="card">
          <div className="field">
            <label>📸 Photo (optional)</label>
            <input type="file" accept="image/*" onChange={handleImage} />
            {image && <div className="muted mt">Photo attached ✓</div>}
          </div>

          <div className="field">
            <label>Describe the problem</label>
            <textarea rows={4} placeholder="e.g. Large pothole outside college gate, dangerous for students" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="field">
            <label>📍 Location</label>
            <div className="flex gap">
              <input type="number" step="0.000001" value={lat} onChange={(e) => setLat(e.target.value)} aria-label="Latitude" />
              <input type="number" step="0.000001" value={lon} onChange={(e) => setLon(e.target.value)} aria-label="Longitude" />
            </div>
            <button className="btn btn-secondary btn-small mt" onClick={detectLocation}>📍 Detect my location</button>
          </div>

          {error && <div className="notice notice-error mb">{error}</div>}

          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? 'Submitting…' : 'Submit Report'}
          </button>

          <p className="muted mt" style={{ fontSize: 13 }}>
            CIVICOS does not require a login. Public visibility is controlled by the moderation status in the database.
          </p>
        </div>
      )}
    </div>
  );
}
