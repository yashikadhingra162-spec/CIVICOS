import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { adminLogin } from '../api.js';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const destination = location.state?.from || '/admin/command-center';

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await adminLogin(password); navigate(destination, { replace: true }); }
    catch (err) { setError(err.message || 'Unable to sign in'); }
    finally { setBusy(false); }
  };

  return <div className="admin-login"><div className="card" style={{ width: 'min(420px, 100%)', padding: 28 }}><div className="badge mb">RESTRICTED AREA</div><h2 style={{ marginBottom: 8 }}>CIVICOS Admin Portal</h2><p className="muted mb">Enter the administrator password to access operational tools.</p><form onSubmit={submit}><div className="field"><label>Password</label><input autoFocus type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Administrator password" autoComplete="current-password" required /></div>{error && <div className="notice mb" style={{ borderColor: '#ef4444' }}>{error}</div>}<button className="btn btn-primary" disabled={busy} type="submit">{busy ? 'Checking…' : 'Unlock Admin Portal'}</button></form></div></div>;
}
