import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { consumeCommunityLimit } from './communityLimits.js';

const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
};

beforeEach(() => values.clear());

test('allows five combined posts and blocks the sixth within thirty seconds', () => {
  for (let attempt = 0; attempt < 5; attempt += 1) consumeCommunityLimit('family-1', 'post', attempt * 1000);
  assert.throws(() => consumeCommunityLimit('family-1', 'post', 5000), /Limit reached/);
});

test('expires posts after thirty seconds and keeps report limits separate', () => {
  for (let attempt = 0; attempt < 5; attempt += 1) consumeCommunityLimit('family-1', 'post', attempt * 1000);
  consumeCommunityLimit('family-1', 'post', 34000);
  consumeCommunityLimit('family-1', 'report', 5000);
  consumeCommunityLimit('family-1', 'report', 6000);
  assert.throws(() => consumeCommunityLimit('family-1', 'report', 7000), /up to 2 reports every 10 seconds/);
  consumeCommunityLimit('family-1', 'report', 16000);
});
