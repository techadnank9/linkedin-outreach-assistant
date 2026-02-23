import test from 'node:test';
import assert from 'node:assert/strict';
import { resetSavedCandidateProfile } from '../src/lib/supabase.mjs';

test('resetSavedCandidateProfile clears all candidate profiles for single-user app behavior', async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  process.env.GEMINI_API_KEY = 'gemini-key';
  process.env.APIFY_API_TOKEN = 'apify-token';
  process.env.APIFY_LINKEDIN_ACTOR_ID = 'actor-id';

  let calledUrl = '';
  let calledMethod = '';
  const originalFetch = global.fetch;
  global.fetch = async (url, options = {}) => {
    calledUrl = String(url);
    calledMethod = options.method || 'GET';
    return {
      ok: true,
      text: async () => ''
    };
  };

  try {
    await resetSavedCandidateProfile('https://www.linkedin.com/in/someone');
  } finally {
    global.fetch = originalFetch;
  }

  assert.equal(calledMethod, 'DELETE');
  assert.match(calledUrl, /\/candidate_profiles\?id=not\.is\.null$/);
});
