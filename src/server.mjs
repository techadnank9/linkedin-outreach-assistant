import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { loadDotEnv } from './lib/load-env.mjs';
import { checkApifyActorHealth, profileTextFromRaw, scrapeLinkedInProfile } from './lib/apify.mjs';
import {
  generateEmailVariants
} from './lib/gemini.mjs';
import {
  getCandidateAddedSkills,
  getManualScrapedProfile,
  getSavedCandidateProfile,
  logOutcome,
  resetSavedCandidateProfile,
  saveCandidateAddedSkills,
  saveManualScrapedProfile,
  saveCandidateProfile,
  saveDraftSession,
  saveTargetProfile
} from './lib/supabase.mjs';
import { toClientCandidateProfile, toClientTargetProfile } from './lib/normalize.mjs';
import { mapManualToCandidateProfile, mapManualToTargetProfile } from './lib/manual-mapper.mjs';

loadDotEnv();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
const REQUESTS_PER_MINUTE = Number(process.env.EXTRACT_IP_MAX_PER_MIN || 20);
const ipWindow = new Map();

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

function serveStatic(req, res) {
  const route = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(PUBLIC_DIR, route);

  if (!filePath.startsWith(PUBLIC_DIR) || !fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath);
  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8'
  };

  res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain; charset=utf-8' });
  fs.createReadStream(filePath).pipe(res);
}

function canProcessByIp(ip) {
  const now = Date.now();
  const entries = (ipWindow.get(ip) || []).filter(ts => now - ts < 60000);
  entries.push(now);
  ipWindow.set(ip, entries);
  return entries.length <= REQUESTS_PER_MINUTE;
}

function cleanNullableString(value) {
  if (value === null || value === undefined) return null;
  const v = String(value).trim();
  return v.length ? v : null;
}

function normalizeCandidateProfileShape(profile) {
  return {
    ...profile,
    name: cleanNullableString(profile?.name),
    headline: cleanNullableString(profile?.headline),
    summary: cleanNullableString(profile?.summary),
    location: cleanNullableString(profile?.location),
    email: cleanNullableString(profile?.email),
    phone: cleanNullableString(profile?.phone),
    highestEducation: cleanNullableString(profile?.highestEducation),
    yearsOfExperience:
      profile?.yearsOfExperience === '' || profile?.yearsOfExperience === undefined
        ? null
        : profile?.yearsOfExperience,
    skillsList: Array.isArray(profile?.skillsList) ? profile.skillsList.filter(Boolean) : [],
    achievements: Array.isArray(profile?.achievements) ? profile.achievements.filter(Boolean) : [],
    skills: Array.isArray(profile?.skills) ? profile.skills.filter(Boolean) : []
  };
}

function normalizeTargetProfileShape(profile) {
  return {
    ...profile,
    name: cleanNullableString(profile?.name),
    role: cleanNullableString(profile?.role),
    company: cleanNullableString(profile?.company),
    focusAreas: Array.isArray(profile?.focusAreas) ? profile.focusAreas.filter(Boolean) : []
  };
}

function isCandidateProfileSparse(profile) {
  return !(
    profile?.name ||
    profile?.headline ||
    profile?.summary ||
    profile?.location ||
    (Array.isArray(profile?.skillsList) && profile.skillsList.length > 0) ||
    (Array.isArray(profile?.achievements) && profile.achievements.length > 0)
  );
}

function isTargetProfileSparse(profile) {
  return !(
    profile?.name ||
    profile?.role ||
    profile?.company ||
    (Array.isArray(profile?.focusAreas) && profile.focusAreas.length > 0)
  );
}

function mergeCandidateAddedSkills(profile, addedSkills) {
  const extra = Array.isArray(addedSkills) ? addedSkills : [];
  if (!extra.length) return profile;
  const skillsList = [...new Set([...(profile.skillsList || []), ...extra])];
  return {
    ...profile,
    skillsList,
    skills: [...new Set([...(profile.skills || []), ...skillsList])]
  };
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/api/profile') {
      const profile = await getSavedCandidateProfile();
      return sendJson(res, 200, { profile: toClientCandidateProfile(profile) });
    }

    if (req.method === 'GET' && req.url === '/api/apify-health') {
      const info = await checkApifyActorHealth();
      return sendJson(res, 200, { ok: true, ...info });
    }

    if (req.method === 'POST' && req.url === '/api/extract') {
      const body = await parseBody(req);
      if (!body.url || !body.profileType) {
        return sendJson(res, 400, { error: 'url and profileType are required' });
      }
      const ip = req.socket?.remoteAddress || 'unknown';
      if (!canProcessByIp(ip)) {
        return sendJson(res, 429, { error: 'Too many extraction requests. Please wait and retry.' });
      }

      let scraped;
      try {
        const manual = await getManualScrapedProfile(body.url);
        if (manual?.payload) {
          scraped = {
            raw: manual.payload,
            rawText: profileTextFromRaw(manual.payload),
            source: 'manual_db'
          };
        } else {
          const apify = await scrapeLinkedInProfile(body.url);
          scraped = {
            raw: apify.raw,
            rawText: apify.rawText || profileTextFromRaw(apify.raw),
            source: 'apify'
          };
        }
      } catch (error) {
        return sendJson(res, 502, {
          error: `Profile extraction failed: ${error.message}`,
          code: 'EXTRACTION_FAILED'
        });
      }
      console.log(`[SCRAPE_SOURCE] ${scraped.source} ${body.url}`);
      console.log('[SCRAPED_PROFILE_JSON]', JSON.stringify(scraped.raw, null, 2));

      if (scraped.source === 'manual_db') {
        if (body.profileType === 'candidate') {
          let mapped = normalizeCandidateProfileShape(
            mapManualToCandidateProfile(scraped.raw, body.url)
          );
          const addedSkills = await getCandidateAddedSkills(body.url);
          mapped = mergeCandidateAddedSkills(mapped, addedSkills);
          if (isCandidateProfileSparse(mapped)) {
            return sendJson(res, 422, {
              error: 'Could not extract enough public profile data from this URL.',
              code: 'PROFILE_TOO_SPARSE',
              source: scraped.source
            });
          }
          const savedCandidate = await saveCandidateProfile(mapped);
          return sendJson(res, 200, {
            profile: toClientCandidateProfile(savedCandidate),
            source: 'manual_db'
          });
        }

        const mapped = normalizeTargetProfileShape(mapManualToTargetProfile(scraped.raw, body.url));
        if (isTargetProfileSparse(mapped)) {
          return sendJson(res, 422, {
            error: 'Could not extract enough public target profile data from this URL.',
            code: 'PROFILE_TOO_SPARSE',
            source: scraped.source
          });
        }
        const savedTarget = await saveTargetProfile(mapped);
        return sendJson(res, 200, {
          profile: toClientTargetProfile(savedTarget),
          source: 'manual_db'
        });
      }

      if (body.profileType === 'candidate') {
        let profile = normalizeCandidateProfileShape(
          mapManualToCandidateProfile(scraped.raw, body.url)
        );
        const addedSkills = await getCandidateAddedSkills(body.url);
        profile = mergeCandidateAddedSkills(profile, addedSkills);
        if (isCandidateProfileSparse(profile)) {
          return sendJson(res, 422, {
            error: 'Could not extract enough public profile data from this URL.',
            code: 'PROFILE_TOO_SPARSE',
            source: scraped.source
          });
        }
        return sendJson(res, 200, { profile, source: scraped.source });
      }

      const profile = normalizeTargetProfileShape(mapManualToTargetProfile(scraped.raw, body.url));
      if (isTargetProfileSparse(profile)) {
        return sendJson(res, 422, {
          error: 'Could not extract enough public target profile data from this URL.',
          code: 'PROFILE_TOO_SPARSE',
          source: scraped.source
        });
      }
      return sendJson(res, 200, { profile, source: scraped.source });
    }

    if (req.method === 'POST' && req.url === '/api/manual-profile/save') {
      const body = await parseBody(req);
      if (!body.linkedinUrl || !body.payload) {
        return sendJson(res, 400, { error: 'linkedinUrl and payload are required' });
      }

      const manual = await saveManualScrapedProfile({
        linkedinUrl: body.linkedinUrl,
        payload: body.payload
      });
      return sendJson(res, 200, { manualProfile: manual });
    }

    if (req.method === 'POST' && req.url === '/api/profile/save') {
      const body = await parseBody(req);
      if (!body.profile) {
        return sendJson(res, 400, { error: 'profile is required' });
      }

      const saved = await saveCandidateProfile(body.profile);
      if (body.profile?.linkedinUrl && Array.isArray(body.addedSkills) && body.addedSkills.length > 0) {
        await saveCandidateAddedSkills(body.profile.linkedinUrl, body.addedSkills);
      }
      return sendJson(res, 200, { profile: toClientCandidateProfile(saved) });
    }

    if (req.method === 'POST' && req.url === '/api/profile/reset') {
      const body = await parseBody(req);
      await resetSavedCandidateProfile(body?.linkedinUrl || null);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && req.url === '/api/generate') {
      const body = await parseBody(req);
      if (!body.candidate || !body.target) {
        return sendJson(res, 400, { error: 'candidate and target are required' });
      }

      const savedTarget = await saveTargetProfile(body.target);
      const variants = await generateEmailVariants({
        candidate: body.candidate,
        target: body.target
      });

      const candidateProfileId = body.candidate.id || null;
      const session = await saveDraftSession({
        candidateProfileId,
        targetProfileId: savedTarget.id,
        variants
      });

      return sendJson(res, 200, {
        variants,
        draftSessionId: session.id,
        targetProfile: toClientTargetProfile(savedTarget)
      });
    }

    if (req.method === 'POST' && req.url === '/api/outcomes') {
      const body = await parseBody(req);
      if (!body.draftSessionId || !body.status) {
        return sendJson(res, 400, { error: 'draftSessionId and status are required' });
      }

      const event = await logOutcome({
        draftSessionId: body.draftSessionId,
        status: body.status,
        notes: body.notes
      });

      return sendJson(res, 200, { outcome: event });
    }

    return serveStatic(req, res);
  } catch (error) {
    return sendJson(res, 500, { error: error.message || 'Internal server error' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
