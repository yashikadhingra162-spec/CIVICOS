import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function normalizeStatus(status) {
  return String(status || 'REPORTED').toUpperCase().replaceAll(' ', '_');
}

function priorityFor(report) {
  const verification = Number(report.verification_count || 0);
  const downvotes = Number(report.downvote_count || 0);
  const spam = Number(report.spam_score || 0);
  return clamp(Math.round(50 + verification * 5 - downvotes * 10 - spam * 0.25), 5, 100);
}

function markerColor(priority) {
  if (priority >= 80) return '#ef4444';
  if (priority >= 60) return '#f97316';
  if (priority >= 40) return '#eab308';
  return '#22c55e';
}

function normalizeReport(report) {
  const priority_score = priorityFor(report);
  const marker_color = markerColor(priority_score);
  const status = normalizeStatus(report.status);

  return {
    ...report,
    title: report.title || 'Civic issue',
    description: report.description || '',
    status,
    priority_score,
    priority_label: priority_score >= 80 ? 'CRITICAL' : priority_score >= 60 ? 'HIGH' : priority_score >= 40 ? 'MEDIUM' : 'LOW',
    marker_color,
    sidebarColor: marker_color,
    status_color: marker_color,
    preview_image: Array.isArray(report.image_urls) ? report.image_urls[0] : null,
    report_count: Math.max(1, Number(report.verification_count || 0) + 1),
    department: report.category || 'Civic services',
  };
}

function inferCategory(description) {
  const text = description.toLowerCase();
  if (/pothole|road|street|traffic/.test(text)) return 'roads';
  if (/garbage|waste|trash|dump/.test(text)) return 'waste';
  if (/water|drain|sewer|flood|leak/.test(text)) return 'water';
  if (/light|electric|power|wire/.test(text)) return 'utilities';
  if (/tree|park|pollution|environment/.test(text)) return 'environment';
  return 'other';
}

function makeTitle(description) {
  const compact = description.trim().replace(/\s+/g, ' ');
  if (!compact) return 'Civic issue';
  return compact.length > 72 ? `${compact.slice(0, 69).trim()}...` : compact;
}

function getVoterFingerprint() {
  const key = 'civicos-voter-fingerprint';
  let fingerprint = localStorage.getItem(key);
  if (!fingerprint) {
    fingerprint = crypto.randomUUID();
    localStorage.setItem(key, fingerprint);
  }
  return fingerprint;
}

export async function getIncidents(params = '') {
  const search = new URLSearchParams(params.startsWith('?') ? params.slice(1) : params);
  const requestedStatus = search.get('status');

  let query = supabase
    .from('reports')
    .select('*')
    .eq('moderation_status', 'approved')
    .order('created_at', { ascending: false });

  if (requestedStatus) query = query.eq('status', requestedStatus);

  const { data, error } = await query;
  if (error) throw error;
  return { incidents: (data || []).map(normalizeReport) };
}

export async function getIncident(id) {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .eq('moderation_status', 'approved')
    .single();
  if (error) throw error;
  return normalizeReport(data);
}

export async function getStats() {
  const { data, error } = await supabase
    .from('reports')
    .select('status, spam_score, verification_count, downvote_count')
    .eq('moderation_status', 'approved');
  if (error) throw error;

  const reports = data || [];
  return reports.reduce((stats, report) => {
    const priority = priorityFor(report);
    if (priority >= 80) stats.critical += 1;
    else if (priority >= 60) stats.high += 1;
    if (normalizeStatus(report.status) === 'RESOLVED') stats.resolved += 1;
    return stats;
  }, { critical: 0, high: 0, resolved: 0 });
}

export async function getHotspots() {
  const { data, error } = await supabase
    .from('reports')
    .select('latitude, longitude, category')
    .eq('moderation_status', 'approved');
  if (error) throw error;
  return { hotspots: data || [] };
}

export async function createReport(input) {
  const id = crypto.randomUUID();
  const description = input.description.trim();
  const imageUrls = input.image_url ? [input.image_url] : [];
  const report = {
    id,
    title: makeTitle(description),
    description,
    category: inferCategory(description),
    status: 'REPORTED',
    latitude: Number(input.latitude),
    longitude: Number(input.longitude),
    address: input.address || null,
    image_urls: imageUrls,
    spam_score: 0,
    duplicate_score: 0,
    moderation_status: 'pending',
    verification_count: 0,
    downvote_count: 0,
  };

  const { error } = await supabase.from('reports').insert(report);
  if (error) throw error;

  return {
    report_id: id,
    incident_id: id,
    duplicate: { is_duplicate: false, total_reports: 1 },
    priority: { score: priorityFor(report), label: 'PENDING REVIEW' },
    report: normalizeReport(report),
  };
}

export async function voteReport(reportId, voteType = 'upvote') {
  const { data, error } = await supabase
    .from('report_votes')
    .insert({
      report_id: reportId,
      vote_type: voteType,
      voter_fingerprint: getVoterFingerprint(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// The legacy authority workflow remains in the repository, but public CIVICOS
// reporting now talks directly to Supabase and does not require authentication.
export const assignIncident = async () => {
  throw new Error('Authority assignment is not configured for the public Supabase workflow.');
};

export const setStatus = async () => {
  throw new Error('Status changes are handled by the moderation workflow.');
};

export const verifyIncident = async () => {
  throw new Error('Verification is handled by the moderation workflow.');
};

export { supabase };
