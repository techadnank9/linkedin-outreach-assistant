import test from 'node:test';
import assert from 'node:assert/strict';
import { requireEnv } from '../src/lib/env.mjs';

test('requireEnv throws when required variables are missing', () => {
  const keys = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GEMINI_API_KEY',
    'APIFY_API_TOKEN',
    'APIFY_LINKEDIN_ACTOR_ID'
  ];
  const previous = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  for (const key of keys) {
    delete process.env[key];
  }

  assert.throws(() => requireEnv(), /Missing required env vars/);

  for (const key of keys) {
    if (previous[key] !== undefined) {
      process.env[key] = previous[key];
    }
  }
});
