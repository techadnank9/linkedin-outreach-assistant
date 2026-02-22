import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLinkedInUrl } from '../src/lib/linkedin-url.mjs';

test('normalizeLinkedInUrl normalizes protocol/host and strips trailing slash', () => {
  assert.equal(
    normalizeLinkedInUrl('http://www.linkedin.com/in/techadnank9/'),
    'https://www.linkedin.com/in/techadnank9'
  );
});

test('normalizeLinkedInUrl preserves path and query when valid', () => {
  assert.equal(
    normalizeLinkedInUrl('https://linkedin.com/in/techadnank9?trk=abc'),
    'https://linkedin.com/in/techadnank9?trk=abc'
  );
});
