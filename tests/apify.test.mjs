import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeActorIdentifier } from '../src/lib/apify.mjs';

test('normalizeActorIdentifier keeps owner/actor unchanged', () => {
  assert.equal(
    normalizeActorIdentifier('dev_fusion/Linkedin-Profile-Scraper'),
    'dev_fusion/Linkedin-Profile-Scraper'
  );
});

test('normalizeActorIdentifier converts owner~actor to owner/actor', () => {
  assert.equal(
    normalizeActorIdentifier('dev_fusion~Linkedin-Profile-Scraper'),
    'dev_fusion/Linkedin-Profile-Scraper'
  );
});

test('normalizeActorIdentifier keeps raw actor ID unchanged', () => {
  assert.equal(
    normalizeActorIdentifier('2SyF0bVxmgGr8IVCZ'),
    '2SyF0bVxmgGr8IVCZ'
  );
});
