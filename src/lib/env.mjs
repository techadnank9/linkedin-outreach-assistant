const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GEMINI_API_KEY',
  'APIFY_API_TOKEN',
  'APIFY_LINKEDIN_ACTOR_ID'
];

export function requireEnv() {
  const missing = required.filter(name => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }

  return {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    apifyApiToken: process.env.APIFY_API_TOKEN,
    apifyLinkedinActorId: process.env.APIFY_LINKEDIN_ACTOR_ID
  };
}
