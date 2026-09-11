import {DIGIT_AUDIO_MANIFEST_VERSION, DIGIT_AUDIO_LEGACY_VERSION} from './engine.js';

function audioError() {
  return new Error('A rögzített magyar számsor hangja most nem játszható le.');
}

function createClip(AudioCtor, url) {
  const clip = new AudioCtor(url);
  clip.preload = 'auto';
  clip.load?.();
  return clip;
}

function playClip(clip, active) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error = null) => {
      if (settled) return;
      settled = true;
      clip.removeEventListener?.('ended', ended);
      clip.removeEventListener?.('error', failed);
      active.delete(stop);
      error ? reject(error) : resolve();
    };
    const ended = () => finish();
    const failed = () => finish(audioError());
    const stop = () => {
      clip.pause?.();
      finish(new Error('A hangkör megszakadt.'));
    };
    active.add(stop);
    clip.addEventListener?.('ended', ended, {once: true});
    clip.addEventListener?.('error', failed, {once: true});
    try {
      clip.currentTime = 0;
      const started = clip.play?.();
      if (started && typeof started.catch === 'function') started.catch(failed);
    } catch {
      failed();
    }
  });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function createDigitAudio({AudioCtor = globalThis.Audio, baseUrl = './cognitive/audio', audioSetVersion = DIGIT_AUDIO_MANIFEST_VERSION} = {}) {
  if (typeof AudioCtor !== 'function') throw audioError();
  if (![DIGIT_AUDIO_MANIFEST_VERSION, DIGIT_AUDIO_LEGACY_VERSION].includes(audioSetVersion)) throw audioError();
  const assetPath = audioSetVersion === DIGIT_AUDIO_LEGACY_VERSION ? baseUrl : `${baseUrl}/elevenlabs-v2`;
  const clips = Array.from({length: 10}, (_, digit) => createClip(AudioCtor, `${assetPath}/digit-${digit}.wav`));
  const active = new Set();
  let disposed = false;
  let playbackId = 0;

  async function playDigits(digits, {gapMs = 350} = {}) {
    if (disposed) throw new Error('A hangkör már lezárult.');
    stop();
    const id = playbackId;
    for (let index = 0; index < digits.length; index += 1) {
      if (disposed || id !== playbackId) throw new Error('A hangkör megszakadt.');
      const digit = Number(digits[index]);
      if (!Number.isInteger(digit) || digit < 0 || digit > 9) throw new TypeError('A számsor csak 0–9 közötti számjegyeket tartalmazhat.');
      await playClip(clips[digit], active);
      if (index < digits.length - 1 && gapMs > 0) await wait(gapMs);
    }
  }

  const stop = () => {
    playbackId += 1;
    for (const cancel of [...active]) cancel();
    for (const clip of clips) {
      clip.pause?.();
      try { clip.currentTime = 0; } catch {}
    }
  };

  return {
    manifestVersion: audioSetVersion,
    voiceLabel: audioSetVersion === DIGIT_AUDIO_LEGACY_VERSION ? 'Rögzített magyar hang · Tünde 1' : 'Rögzített magyar hang · ElevenLabs David',
    async test() { stop(); await playDigits([2, 7], {gapMs: 250}); },
    playDigits,
    stop,
    dispose() { disposed = true; stop(); },
  };
}
