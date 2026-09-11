import test from 'node:test';
import assert from 'node:assert/strict';
import {createDigitAudio} from '../dist/cognitive/audio.js';

class FakeAudio {
  static clips = [];
  constructor(src) { this.src = src; this.listeners = new Map(); this.playCount = 0; FakeAudio.clips.push(this); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); }
  load() { this.loaded = true; }
  pause() { this.paused = true; }
  play() { this.playCount += 1; queueMicrotask(() => this.listeners.get('ended')?.()); return Promise.resolve(); }
}

test('digit span uses the complete versioned local recording set in sequence', async () => {
  FakeAudio.clips = [];
  const audio = await createDigitAudio({AudioCtor: FakeAudio, baseUrl: '/cognitive/audio'});
  assert.equal(audio.manifestVersion, 'hu-digits-v1');
  assert.deepEqual(FakeAudio.clips.map(clip => clip.src), Array.from({length: 10}, (_, digit) => `/cognitive/audio/digit-${digit}.wav`));
  assert.ok(FakeAudio.clips.every(clip => clip.loaded));
  await audio.playDigits([2, 7], {gapMs: 0});
  assert.equal(FakeAudio.clips[2].playCount, 1);
  assert.equal(FakeAudio.clips[7].playCount, 1);
  assert.equal(FakeAudio.clips.reduce((sum, clip) => sum + clip.playCount, 0), 2);
  audio.dispose();
});

test('digit span rejects non-digit tokens before playing them', async () => {
  FakeAudio.clips = [];
  const audio = await createDigitAudio({AudioCtor: FakeAudio});
  await assert.rejects(audio.playDigits([10], {gapMs: 0}), /0–9/);
  assert.equal(FakeAudio.clips.reduce((sum, clip) => sum + clip.playCount, 0), 0);
  audio.dispose();
});
