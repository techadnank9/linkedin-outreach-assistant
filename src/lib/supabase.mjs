import { requireEnv } from './env.mjs';
import { normalizeLinkedInUrl } from './linkedin-url.mjs';

function headers() {
  const env = requireEnv();
  return {
    apikey: env.supabaseServiceRoleKey,
    Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
    'Content-Type': 'application/json'
  };
}

function baseUrl() {
  const env = requireEnv();
  return `${env.supabaseUrl}/rest/v1`;
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...options,
    headers: {
      ...headers(),
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || data?.error || `Supabase request failed: ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export async function getSavedCandidateProfile() {
  const rows = await supabaseRequest('/candidate_profiles?select=*&order=updated_at.desc&limit=1');
  return rows?.[0] || null;
}

export async function saveCandidateProfile(profile) {
  const payload = {
    linkedin_url: profile.linkedinUrl || null,
    name: profile.name || null,
    headline: profile.headline || null,
    summary: profile.summary || null,
    achievements: profile.achievements || [],
    skills: profile.skills || []
  };

  const rows = await supabaseRequest('/candidate_profiles', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(payload)
  });

  return rows[0];
}

export async function saveTargetProfile(profile) {
  const payload = {
    linkedin_url: profile.linkedinUrl || null,
    name: profile.name || null,
    role: profile.role || null,
    company: profile.company || null,
    focus_areas: profile.focusAreas || []
  };

  const rows = await supabaseRequest('/target_profiles', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(payload)
  });

  return rows[0];
}

export async function saveDraftSession({ candidateProfileId, targetProfileId, variants }) {
  const sessionRows = await supabaseRequest('/draft_sessions', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      candidate_profile_id: candidateProfileId,
      target_profile_id: targetProfileId
    })
  });

  const session = sessionRows[0];
  const variantRows = variants.map(v => ({
    draft_session_id: session.id,
    tone: v.tone,
    subject: v.subject,
    body: v.body
  }));

  await supabaseRequest('/email_variants', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(variantRows)
  });

  return session;
}

export async function logOutcome({ draftSessionId, status, notes }) {
  const rows = await supabaseRequest('/outcome_events', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      draft_session_id: draftSessionId,
      status,
      notes: notes || null
    })
  });

  return rows[0];
}

export async function getManualScrapedProfile(linkedinUrl) {
  const normalizedUrl = normalizeLinkedInUrl(linkedinUrl);
  const rows = await supabaseRequest(
    `/manual_scraped_profiles?select=*&linkedin_url=eq.${encodeURIComponent(normalizedUrl)}&limit=1`
  );
  return rows?.[0] || null;
}

export async function saveManualScrapedProfile({ linkedinUrl, payload }) {
  const normalizedUrl = normalizeLinkedInUrl(linkedinUrl);
  const rows = await supabaseRequest('/manual_scraped_profiles', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify({
      linkedin_url: normalizedUrl,
      payload
    })
  });
  return rows?.[0] || null;
}
