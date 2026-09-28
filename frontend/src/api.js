const API_BASE = 'http://127.0.0.1:8000';

const REPORTS_KEY = 'civicos-my-report-ids';
const CLUSTER_RADIUS_METERS = 100;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const normStatus = s =>
  String(s || 'pending').trim().toLowerCase();

export const statusLabel = s =>
  normStatus(s)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

const priorityFor = r =>
  clamp(
    Math.round(
      50 +
      Number(r.verification_count || 0) * 5 -
      Number(r.downvote_count || 0) * 10 -
      Number(r.spam_score || 0) * 0.25
    ),
    5,
    100
  );

const markerColor = p =>
  p >= 80
    ? '#ef4444'
    : p >= 60
      ? '#f97316'
      : p >= 40
        ? '#eab308'
        : '#22c55e';

const categoryOf = r =>
  String(r.category || 'other').trim().toLowerCase();

function distanceMeters(a, b) {
  const lat1 = Number(a.latitude) * Math.PI / 180;
  const lat2 = Number(b.latitude) * Math.PI / 180;

  const dLat = lat2 - lat1;
  const dLon =
    (Number(b.longitude) - Number(a.longitude)) * Math.PI / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLon / 2) ** 2;

  return (
    6371000 *
    2 *
    Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  );
}

function normalizeReport(r) {
  const priority_score = priorityFor(r);
  const marker_color = markerColor(priority_score);

  const original = Array.isArray(r.image_urls)
    ? r.image_urls.filter(Boolean)
    : [];

  const resolution = Array.isArray(r.resolution_image_urls)
    ? r.resolution_image_urls.filter(Boolean)
    : [];

  return {
    ...r,
    title: r.title || 'Civic issue',
    description: r.description || '',
    status: normStatus(r.status),
    moderation_status: normStatus(r.moderation_status),

    priority_score,

    priority_label:
      priority_score >= 80
        ? 'CRITICAL'
        : priority_score >= 60
          ? 'HIGH'
          : priority_score >= 40
            ? 'MEDIUM'
            : 'LOW',

    marker_color,
    sidebarColor: marker_color,
    status_color: marker_color,

    preview_image: original[0] || null,
    resolution_images: resolution,
    all_images: [...original, ...resolution],

    report_count: 1,
    department: r.category || 'Civic services',

    clustered: false,
    member_reports: [r]
  };
}

export function clusterReports(
  rows,
  radius = CLUSTER_RADIUS_METERS
) {
  const items = rows.map(normalizeReport);

  const parent = items.map((_, i) => i);

  const find = i =>
    parent[i] === i
      ? i
      : (parent[i] = find(parent[i]));

  const join = (a, b) => {
    a = find(a);
    b = find(b);

    if (a !== b) parent[b] = a;
  };

  for (let i = 0; i < items.length; i++) {
    if (
      !Number.isFinite(+items[i].latitude) ||
      !Number.isFinite(+items[i].longitude)
    ) {
      continue;
    }

    for (let j = i + 1; j < items.length; j++) {
      if (
        categoryOf(items[i]) !== categoryOf(items[j]) ||
        !Number.isFinite(+items[j].latitude) ||
        !Number.isFinite(+items[j].longitude)
      ) {
        continue;
      }

      if (
        distanceMeters(items[i], items[j]) <= radius
      ) {
        join(i, j);
      }
    }
  }

  const groups = new Map();

  items.forEach((x, i) => {
    const root = find(i);

    if (!groups.has(root)) {
      groups.set(root, []);
    }

    groups.get(root).push(x);
  });

  return [...groups.values()].map(members => {
    const ordered = [...members].sort(
      (a, b) =>
        new Date(b.created_at || 0) -
        new Date(a.created_at || 0)
    );

    const rep = ordered[0];

    if (members.length === 1) {
      return rep;
    }

    const latitude =
      members.reduce(
        (s, x) => s + Number(x.latitude),
        0
      ) / members.length;

    const longitude =
      members.reduce(
        (s, x) => s + Number(x.longitude),
        0
      ) / members.length;

    const priority_score = clamp(
      Math.max(
        ...members.map(x => x.priority_score)
      ) +
        (members.length - 1) * 12,
      5,
      100
    );

    const marker_color =
      markerColor(priority_score);

    const status =
      members.map(x => x.status).find(
        s =>
          ![
            'resolved',
            'verified',
            'rejected'
          ].includes(s)
      ) || rep.status;

    return {
      ...rep,

      latitude,
      longitude,
      status,

      priority_score,

      priority_label:
        priority_score >= 80
          ? 'CRITICAL'
          : priority_score >= 60
            ? 'HIGH'
            : priority_score >= 40
              ? 'MEDIUM'
              : 'LOW',

      marker_color,
      sidebarColor: marker_color,
      status_color: marker_color,

      report_count: members.length,
      clustered: true,

      member_reports: ordered,

      member_report_ids:
        ordered.map(x => x.id),

      cluster_title:
        `${members.length} nearby reports`,

      title:
        `${rep.title} (${members.length} nearby reports)`
    };
  });
}

async function apiFetch(path, options = {}) {
  const response = await fetch(
    `${API_BASE}${path}`,
    {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    }
  );

  const text = await response.text();

  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { detail: text };
  }

  if (!response.ok) {
    throw new Error(
      data.detail ||
      data.message ||
      `API request failed: ${response.status}`
    );
  }

  return data;
}

function inferCategory(description) {
  const t = description.toLowerCase();

  if (/pothole|road|street/.test(t))
    return 'roads';

  if (/garbage|waste|trash|dump/.test(t))
    return 'waste';

  if (/water|drain|sewer|flood|leak/.test(t))
    return 'water';

  if (/light|electric|power|wire/.test(t))
    return 'utilities';

  if (/tree|park|pollution|environment/.test(t))
    return 'environment';

  if (/traffic|signal|crossing|accident/.test(t))
    return 'traffic';

  return 'other';
}

const makeTitle = description => {
  const x = description
    .trim()
    .replace(/\s+/g, ' ');

  if (!x) return 'Civic issue';

  return x.length > 72
    ? `${x.slice(0, 69).trim()}...`
    : x;
};

const ids = () => {
  try {
    return JSON.parse(
      localStorage.getItem(REPORTS_KEY) || '[]'
    );
  } catch {
    return [];
  }
};

const remember = id =>
  localStorage.setItem(
    REPORTS_KEY,
    JSON.stringify(
      [...new Set([id, ...ids()])].slice(0, 100)
    )
  );

const forget = id =>
  localStorage.setItem(
    REPORTS_KEY,
    JSON.stringify(
      ids().filter(x => x !== id)
    )
  );

export async function getIncidents(params = '') {
  const data = await apiFetch(
    `/incidents${params || ''}`
  );

  return {
    incidents: clusterReports(
      data.incidents || []
    )
  };
}

export async function getRawIncidents(
  params = ''
) {
  const data = await apiFetch(
    `/incidents${params || ''}`
  );

  return {
    incidents: (data.incidents || [])
      .map(normalizeReport)
  };
}

export async function getMyReports() {
  const list = ids();

  if (!list.length) {
    return { incidents: [] };
  }

  const data = await apiFetch('/incidents');

  const reports = (data.incidents || [])
    .filter(r => list.includes(r.id));

  return {
    incidents: clusterReports(reports)
  };
}

export async function getIncident(id) {
  const data = await apiFetch(
    `/incidents/${encodeURIComponent(id)}`
  );

  return normalizeReport(
    data.incident || data
  );
}

export async function getStats() {
  const data = await apiFetch(
    '/dashboard/stats'
  );

  return data;
}

export async function getHotspots() {
  const data = await apiFetch(
    '/dashboard/hotspots'
  );

  return data;
}

export async function createReport(input) {
  const description =
    String(input.description || '').trim();

  const payload = {
    description,

    latitude: Number(input.latitude),

    longitude: Number(input.longitude),

    user_name:
      input.user_name ||
      input.userName ||
      'Citizen',

    website:
      input.website || ''
  };

  const data = await apiFetch(
    '/reports',
    {
      method: 'POST',
      body: JSON.stringify(payload)
    }
  );

  const report =
    data.report ||
    data.incident ||
    data;

  const id =
    data.report_id ||
    data.incident_id ||
    report.id;

  if (id) {
    remember(id);
  }

  return {
    ...data,

    report_id: id,
    incident_id: id,

    report: normalizeReport({
      ...report,

      title:
        report.title ||
        makeTitle(description),

      category:
        report.category ||
        input.category ||
        inferCategory(description),

      latitude: Number(input.latitude),

      longitude: Number(input.longitude)
    })
  };
}

export async function deleteReport(id) {
  // The local FastAPI backend does not currently expose
  // a DELETE endpoint. Remove it from "My Reports" locally.
  forget(id);
  return true;
}

export async function voteReport(id, type = 'verify') {
  // The local FastAPI backend has no voting endpoint.
  // Keep this function so existing frontend imports don't break.
  console.warn(
    '[CIVICOS] Voting is not available in local backend.'
  );

  return {
    report_id: id,
    vote_type: type
  };
}

export async function notifyAuthority(report) {
  try {
    return await apiFetch(
      '/notifications/report',
      {
        method: 'POST',
        body: JSON.stringify({
          report_id: report.id,
          title: report.title,
          description: report.description,
          category: report.category,
          severity:
            report.priority_label || 'LOW',
          status: report.status,
          address: report.address || '',
          latitude: report.latitude,
          longitude: report.longitude,
          image_url:
            Array.isArray(report.image_urls)
              ? report.image_urls[0] || ''
              : '',
          created_at:
            report.created_at ||
            new Date().toISOString()
        })
      }
    );
  } catch (error) {
    console.warn(
      '[CIVICOS] Notification failed:',
      error
    );

    return {
      sent: false,
      error: true
    };
  }
}

async function adminRequest(
  path,
  options = {}
) {
  return apiFetch(
    `/admin/${path}`,
    {
      credentials: 'include',
      ...options
    }
  );
}

export const adminLogin = password =>
  adminRequest('login', {
    method: 'POST',
    body: JSON.stringify({ password })
  });

export const adminSession = () =>
  adminRequest('session', {
    method: 'GET'
  });

export const adminLogout = () =>
  adminRequest('logout', {
    method: 'POST'
  });

export const assignIncident = (
  id,
  payload = {}
) =>
  adminRequest(
    `reports/${encodeURIComponent(id)}/assign`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }
  );

export const setStatus = (
  id,
  status
) =>
  adminRequest(
    `reports/${encodeURIComponent(id)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }
  );

export const verifyIncident = (
  id,
  payload = {}
) =>
  adminRequest(
    `reports/${encodeURIComponent(id)}/verify`,
    {
      method: 'POST',
      body: JSON.stringify(payload)
    }
  );