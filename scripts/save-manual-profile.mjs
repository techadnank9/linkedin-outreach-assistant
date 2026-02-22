import fs from 'node:fs';
import path from 'node:path';
import { loadDotEnv } from '../src/lib/load-env.mjs';
import { saveManualScrapedProfile } from '../src/lib/supabase.mjs';

loadDotEnv();

const inputPath = process.argv[2] || 'data/manual-profile.json';
const absolutePath = path.resolve(process.cwd(), inputPath);

if (!fs.existsSync(absolutePath)) {
  console.error(`Input file not found: ${absolutePath}`);
  process.exit(1);
}

const raw = fs.readFileSync(absolutePath, 'utf8');
const parsed = JSON.parse(raw);
const profile = Array.isArray(parsed) ? parsed[0] : parsed;

if (!profile || typeof profile !== 'object') {
  console.error('Invalid JSON payload. Provide an object or array with one object.');
  process.exit(1);
}

const linkedinUrl = profile.linkedinUrl || profile.linkedinPublicUrl;
if (!linkedinUrl) {
  console.error('Missing linkedinUrl in payload.');
  process.exit(1);
}

const saved = await saveManualScrapedProfile({
  linkedinUrl,
  payload: profile
});

console.log('Saved manual profile row:');
console.log(JSON.stringify({
  id: saved?.id,
  linkedin_url: saved?.linkedin_url,
  created_at: saved?.created_at,
  updated_at: saved?.updated_at
}, null, 2));
