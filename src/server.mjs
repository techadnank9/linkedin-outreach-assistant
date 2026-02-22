import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { loadDotEnv } from './lib/load-env.mjs';
import { checkApifyActorHealth, profileTextFromRaw, scrapeLinkedInProfile } from './lib/apify.mjs';
import {
  extractCandidateProfile,
  extractTargetProfile,
  generateEmailVariants
} from './lib/gemini.mjs';
import {
  getManualScrapedProfile,
  getSavedCandidateProfile,
  logOutcome,
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

      let scraped;
      const manual = await getManualScrapedProfile(body.url);
      if (manual?.payload) {
        scraped = {
          raw: manual.payload,
          rawText: profileTextFromRaw(manual.payload)
        };
        console.log('[MANUAL_PROFILE_JSON]', JSON.stringify(scraped.raw, null, 2));
        if (body.profileType === 'candidate') {
          const savedCandidate = await saveCandidateProfile(
            mapManualToCandidateProfile(manual.payload, body.url)
          );
          return sendJson(res, 200, {
            profile: toClientCandidateProfile(savedCandidate),
            source: 'manual_db'
          });
        }

        const savedTarget = await saveTargetProfile(
          mapManualToTargetProfile(manual.payload, body.url)
        );
        return sendJson(res, 200, {
          profile: toClientTargetProfile(savedTarget),
          source: 'manual_db'
        });
      } else {
        scraped = await scrapeLinkedInProfile(body.url);
        console.log('[SCRAPED_PROFILE_JSON]', JSON.stringify(scraped.raw, null, 2));
      }

      if (body.profileType === 'candidate') {
        const profile = await extractCandidateProfile({
          linkedinUrl: body.url,
          rawText: scraped.rawText
        });
        return sendJson(res, 200, { profile });
      }

      const profile = await extractTargetProfile({
        linkedinUrl: body.url,
        rawText: scraped.rawText
      });
      return sendJson(res, 200, { profile });
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
      return sendJson(res, 200, { profile: toClientCandidateProfile(saved) });
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
