import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { consumeCommunityLimit } from './communityLimits.js';

const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
};

beforeEach(() => values.clear());

test('allows five combined posts and blocks the sixth within ten minutes', () => {
  for (let attempt = 0; attempt < 5; attempt += 1) consumeCommunityLimit('family-1', 'post', attempt * 1000);
  assert.throws(() => consumeCommunityLimit('family-1', 'post', 5000), /Limit reached/);
});

test('expires attempts after ten minutes and separates reports from posts', () => {
  for (let attempt = 0; attempt < 5; attempt += 1) consumeCommunityLimit('family-1', 'post', attempt * 1000);
  consumeCommunityLimit('family-1', 'post', 10 * 60 * 1000);
  consumeCommunityLimit('family-1', 'report', 5000);
});
