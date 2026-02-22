import { ApifyClient } from 'apify-client';
import { requireEnv } from './env.mjs';

export function normalizeActorIdentifier(actorId) {
  const trimmed = (actorId || '').trim();
  if (!trimmed) {
    throw new Error('APIFY_LINKEDIN_ACTOR_ID is empty');
  }
  // SDK supports actor ID and owner/actor slug.
  // Accept owner~actor and convert to owner/actor.
  return trimmed.includes('~') ? trimmed.replace('~', '/') : trimmed;
}

function pickProfileText(item) {
  if (!item || typeof item !== 'object') return '';

  const fields = [
    item.fullName,
    item.headline,
    item.about,
    Array.isArray(item.experience) ? item.experience.map(e => `${e.title || ''} ${e.companyName || ''} ${e.description || ''}`).join('\n') : '',
    Array.isArray(item.educations) ? item.educations.map(e => `${e.schoolName || ''} ${e.degreeName || ''}`).join('\n') : '',
    Array.isArray(item.skills) ? item.skills.join(', ') : ''
  ];

  return fields.filter(Boolean).join('\n');
}

export function profileTextFromRaw(item) {
  return pickProfileText(item);
}

export async function scrapeLinkedInProfile(url) {
  const env = requireEnv();
  const actorIdentifier = normalizeActorIdentifier(env.apifyLinkedinActorId);
  const client = new ApifyClient({ token: env.apifyApiToken });
  const run = await client.actor(actorIdentifier).call({
    profileUrls: [url],
    maxProfiles: 1
  });

  if (!run?.defaultDatasetId) {
    throw new Error('Apify run did not return defaultDatasetId');
  }

  const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 1 });
  const item = Array.isArray(items) ? items[0] : null;

  if (!item) {
    throw new Error('No LinkedIn profile data returned by Apify');
  }

  return {
    raw: item,
    rawText: pickProfileText(item)
  };
}

export async function checkApifyActorHealth() {
  const env = requireEnv();
  const actorIdentifier = normalizeActorIdentifier(env.apifyLinkedinActorId);
  const client = new ApifyClient({ token: env.apifyApiToken });
  const data = await client.actor(actorIdentifier).get();
  if (!data) throw new Error('Apify actor check failed: actor not found or inaccessible');

  return {
    actorId: actorIdentifier,
    actorName: data?.name || null,
    actorTitle: data?.title || null
  };
}
