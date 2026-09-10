import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPassword, normalizeUsername, stableStringify, verifyPassword } from '../server/security.js';

test('scrypt password hashes are salted and verifiable', async () => {
  const first = await hashPassword('hosszu-jelszo-123');
  const second = await hashPassword('hosszu-jelszo-123');
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('hosszu-jelszo-123', first), true);
  assert.equal(await verifyPassword('rossz-jelszo-123', first), false);
  assert.equal(await verifyPassword('hosszu-jelszo-123', 'broken'), false);
});

test('usernames are canonicalized and email-shaped usernames are rejected', () => {
  assert.deepEqual(normalizeUsername('  Hanna_01  '), { username: 'Hanna_01', key: 'hanna_01' });
  assert.throws(() => normalizeUsername('hanna@example.com'), /nem lehet email/);
  assert.throws(() => normalizeUsername('x'), /3–32/);
});

test('stableStringify ignores object key order but preserves array order', () => {
  assert.equal(stableStringify({ b: 2, a: { y: 1, x: 0 } }), stableStringify({ a: { x: 0, y: 1 }, b: 2 }));
  assert.notEqual(stableStringify([1, 2]), stableStringify([2, 1]));
});
