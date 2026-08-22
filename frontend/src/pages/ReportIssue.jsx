import React, { useState } from 'react';
import { createReport } from '../api.js';

const FLOW = ['REPORTED', 'AI_VERIFIED', 'PRIORITIZED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED'];
const pretty = (s) => s.replaceAll('_', ' ');

export default function ReportIssue() {
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [lat, setLat] = useState(28.6139);
  const [lon, setLon] = useState(77.2090);
  const [name, setName] = useState('');
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
    setLoading(true);
    setError('');
    try {
      const res = await createReport({
        description: description.trim(),
        latitude: lat,
        longitude: lon,
        image_url: image,
        user_name: name.trim() || 'Citizen',
      });
      setResult(res);
    } catch (e) {
      setError('Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setDescription('');
    setImage('');
    setName('');
    setError('');
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="page-title">Report an Issue 📢</div>
      <div className="page-sub">One report can help create or strengthen a real civic incident.</div>

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
              <div className="muted" style={{ fontSize: 11 }}>INCIDENT</div>
              <strong>#{result.duplicate?.merged_into_incident || result.incident_id}</strong>
            </div>
            <div className="muted" style={{ textAlign: 'right', fontSize: 12 }}>
              {result.duplicate?.is_duplicate ? 'Existing incident updated' : 'New incident created'}
            </div>
          </div>

          {result.ai && (
            <div className="card mb" style={{ background: 'rgba(14,165,233,.05)' }}>
              <div className="flex between items-center mb">
                <strong>🤖 Initial analysis</strong>
                <span className="badge">{Math.round(result.ai.confidence * 100)}% confidence</span>
              </div>
              <div className="flex gap wrap">
                <span className="pill">{pretty(result.ai.category)}</span>
                <span className="pill">Severity: {result.ai.severity}</span>
              </div>
            </div>
          )}

          {result.duplicate?.is_duplicate ? (
            <div className="notice notice-purple mb">
              <strong>🔁 Similar incident found</strong>
              <p className="muted mt" style={{ fontSize: 13 }}>
                Your report was added to incident <b>#{result.duplicate.merged_into_incident}</b>.
                This keeps multiple citizen reports from becoming duplicate work items.
                Total reports: <b>{result.duplicate.total_reports}</b>.
              </p>
            </div>
          ) : (
            <div className="notice notice-green mb">
              <strong>🆕 New incident created</strong>
              <p className="muted mt" style={{ fontSize: 13 }}>
                Priority: <b>{result.priority?.score}/100</b> · {result.priority?.label || 'Processing complete'}.
              </p>
            </div>
          )}

          <div className="workflow-card">
            <div className="flex between items-center mb">
              <div>
                <strong>What happens next?</strong>
                <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>CIVICOS moves the incident through an accountable workflow.</div>
              </div>
              <span className="badge">LIVE WORKFLOW</span>
            </div>
            <div className="workflow-line">
              {FLOW.map((step, i) => (
                <div className={`workflow-item ${i <= 2 ? 'done' : ''}`} key={step}>
                  <span className="workflow-dot">{i <= 2 ? '✓' : i + 1}</span>
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
              <input type="number" step="0.000001" value={lat} onChange={(e) => setLat(parseFloat(e.target.value))} aria-label="Latitude" />
              <input type="number" step="0.000001" value={lon} onChange={(e) => setLon(parseFloat(e.target.value))} aria-label="Longitude" />
            </div>
            <button className="btn btn-secondary btn-small mt" onClick={detectLocation}>📍 Detect my location</button>
          </div>

          <div className="field">
            <label>Your name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Citizen" />
          </div>

          {error && <div className="notice notice-error mb">{error}</div>}

          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? 'Analyzing & submitting…' : 'Submit Report'}
          </button>

          <p className="muted mt" style={{ fontSize: 13 }}>
            Your report is analyzed for category, severity, duplicate incidents and civic priority.
          </p>
        </div>
      )}
    </div>
  );
}
