import React, { useState } from 'react';
import { createReport } from '../api.js';

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
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(parseFloat(pos.coords.latitude.toFixed(6)));
          setLon(parseFloat(pos.coords.longitude.toFixed(6)));
        },
        () => alert('Location not available, using default.')
      );
    }
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result);
    reader.readAsDataURL(file);
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
        description,
        latitude: lat,
        longitude: lon,
        image_url: image,
        user_name: name || 'Citizen',
      });
      setResult(res);
    } catch (e) {
      setError('Failed to submit report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="page-title">Report an Issue 📢</div>
      <div className="page-sub">Take a photo, describe the problem, and let AI classify & prioritize it.</div>

      {result ? (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>✅ Report Submitted</h3>
          {result.ai && (
            <div className="mb">
              <span className="badge">{result.ai.category}</span>{' '}
              <span className="badge">Severity: {result.ai.severity}</span>{' '}
              <span className="badge">Confidence: {Math.round(result.ai.confidence * 100)}%</span>
            </div>
          )}

          {result.duplicate && result.duplicate.is_duplicate ? (
            <div className="card mb" style={{ background: '#3b0764', borderColor: '#a855f7' }}>
              <strong>🔁 Duplicate Detected — {Math.round(result.duplicate.probability * 100)}% probability</strong>
              <p className="muted mt">
                Your report was merged into <b>Incident #{result.duplicate.merged_into_incident}</b>.
                Total citizen reports: <b>{result.duplicate.total_reports}</b>
              </p>
            </div>
          ) : (
            <div className="card mb" style={{ background: '#052e16', borderColor: '#22c55e' }}>
              <strong>🆕 New Incident Created</strong>
              <p className="muted mt">
                Incident <b>#{result.incident_id}</b> · Priority{' '}
                <b>{result.priority?.score}/100</b> ({result.priority?.label})
              </p>
            </div>
          )}

          <button className="btn btn-secondary" onClick={() => { setResult(null); setDescription(''); setImage(''); }}>
            Report another issue
          </button>
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
            <textarea
              rows={4}
              placeholder="e.g. Large pothole outside college gate, dangerous for students"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="field">
            <label>📍 Location</label>
            <div className="flex gap">
              <input type="number" step="0.000001" value={lat} onChange={(e) => setLat(parseFloat(e.target.value))} />
              <input type="number" step="0.000001" value={lon} onChange={(e) => setLon(parseFloat(e.target.value))} />
            </div>
            <button className="btn btn-secondary btn-small mt" onClick={detectLocation}>
              📍 Detect my location
            </button>
          </div>

          <div className="field">
            <label>Your name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Citizen" />
          </div>

          {error && <div className="muted" style={{ color: '#ef4444', marginBottom: 12 }}>{error}</div>}

          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? 'Analyzing...' : 'Submit Report'}
          </button>

          <p className="muted mt" style={{ fontSize: 13 }}>
            AI will classify the category, estimate severity, detect duplicates & compute a CIVIC priority score.
          </p>
        </div>
      )}
    </div>
  );
}
