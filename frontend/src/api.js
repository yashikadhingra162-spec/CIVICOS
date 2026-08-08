const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  return res.json();
}

export const getStats = () => request('/dashboard/stats');
export const getHotspots = () => request('/dashboard/hotspots');
export const getIncidents = (params = '') => request(`/incidents${params}`);
export const getIncident = (id) => request(`/incidents/${id}`);
export const createReport = (data) =>
  request('/reports', {
    method: 'POST',
    body: JSON.stringify(data),
  });
export const assignIncident = (id, data) =>
  request(`/incidents/${id}/assign`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
export const setStatus = (id, status) =>
  request(`/incidents/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
export const verifyIncident = (id, data) =>
  request(`/incidents/${id}/verify`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
