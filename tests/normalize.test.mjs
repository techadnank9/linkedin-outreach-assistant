import test from 'node:test';
import assert from 'node:assert/strict';
import { toClientCandidateProfile, toClientTargetProfile } from '../src/lib/normalize.mjs';

test('toClientCandidateProfile maps supabase row to client shape', () => {
  const mapped = toClientCandidateProfile({
    id: '1',
    linkedin_url: 'https://www.linkedin.com/in/jane',
    name: 'Jane',
    headline: 'Engineer',
    summary: 'summary',
    achievements: ['a'],
    skills: ['s']
  });

  assert.equal(mapped.linkedinUrl, 'https://www.linkedin.com/in/jane');
  assert.deepEqual(mapped.achievements, ['a']);
});

test('toClientTargetProfile maps supabase row to client shape', () => {
  const mapped = toClientTargetProfile({
    id: '2',
    linkedin_url: 'https://www.linkedin.com/in/founder',
    name: 'Founder',
    role: 'Founder',
    company: 'Acme',
    focus_areas: ['hiring']
  });

  assert.equal(mapped.linkedinUrl, 'https://www.linkedin.com/in/founder');
  assert.deepEqual(mapped.focusAreas, ['hiring']);
});
