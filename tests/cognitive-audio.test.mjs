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
  assert.equal(audio.manifestVersion, 'hu-digits-v2');
  assert.deepEqual(FakeAudio.clips.map(clip => clip.src), Array.from({length: 10}, (_, digit) => `/cognitive/audio/elevenlabs-v2/digit-${digit}.wav`));
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


test('old assigned rounds retain their original audio bank', async () => {
  FakeAudio.clips = [];
  const audio = await createDigitAudio({AudioCtor: FakeAudio, audioSetVersion: 'hu-digits-v1'});
  assert.equal(audio.manifestVersion, 'hu-digits-v1');
  assert.ok(FakeAudio.clips.every(clip => !clip.src.includes('elevenlabs-v2')));
  await audio.test();
  audio.dispose();
});

test('stopping during the silence prevents the next digit from starting', async () => {
  FakeAudio.clips = [];
  const audio = await createDigitAudio({AudioCtor: FakeAudio});
  const playing = audio.playDigits([1, 2], {gapMs: 30});
  const rejected = assert.rejects(playing, /megszakadt/);
  await new Promise(resolve => setTimeout(resolve, 5));
  audio.stop();
  await rejected;
  assert.equal(FakeAudio.clips[1].playCount, 1);
  assert.equal(FakeAudio.clips[2].playCount, 0);
  audio.dispose();
});


test('stopping an actively playing digit rejects cleanly and releases the clip', async () => {
  class HeldAudio extends FakeAudio { play() { this.playCount += 1; return Promise.resolve(); } }
  FakeAudio.clips = [];
  const audio = await createDigitAudio({AudioCtor: HeldAudio});
  const playing = audio.playDigits([3, 4], {gapMs: 0});
  const rejected = assert.rejects(playing, /megszakadt/);
  assert.doesNotThrow(() => audio.stop());
  await rejected;
  assert.equal(FakeAudio.clips[3].paused, true);
  assert.equal(FakeAudio.clips[4].playCount, 0);
  audio.dispose();
});
