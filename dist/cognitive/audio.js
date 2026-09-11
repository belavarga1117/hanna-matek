const DIGIT_WORDS = ['nulla','egy','kettő','három','négy','öt','hat','hét','nyolc','kilenc'];

function waitForVoices(synth, timeoutMs = 1500) {
  const existing = synth.getVoices?.() || [];
  if (existing.length) return Promise.resolve(existing);
  return new Promise(resolve => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      synth.removeEventListener?.('voiceschanged', finish);
      resolve(synth.getVoices?.() || []);
    };
    synth.addEventListener?.('voiceschanged', finish, {once:true});
    setTimeout(finish, timeoutMs);
  });
}

export async function createDigitAudio({speechSynthesis = globalThis.speechSynthesis, Utterance = globalThis.SpeechSynthesisUtterance} = {}) {
  if (!speechSynthesis || !Utterance) throw new Error('Ez a böngésző nem tudja lejátszani a magyar számsort.');
  const voices = await waitForVoices(speechSynthesis);
  const voice = voices.find(item => /^hu(?:-|_)/i.test(item.lang || '')) || voices.find(item => /^hu/i.test(item.lang || '')) || null;
  let disposed = false;

  function speak(text, {rate = .78, volume = 1} = {}) {
    return new Promise((resolve, reject) => {
      if (disposed) { reject(new Error('A hangkör már lezárult.')); return; }
      const utterance = new Utterance(text);
      utterance.lang = 'hu-HU';
      utterance.rate = rate;
      utterance.pitch = 1;
      utterance.volume = volume;
      if (voice) utterance.voice = voice;
      utterance.onend = () => resolve();
      utterance.onerror = () => reject(new Error('A számsor hangja most nem játszható le.'));
      speechSynthesis.speak(utterance);
    });
  }

  return {
    manifestVersion: 'hu-digits-v1',
    voiceLabel: voice?.name || 'A böngésző magyar hangja',
    async test() { speechSynthesis.cancel(); await speak('kettő, hét', {rate:.72}); },
    async playDigits(digits) {
      speechSynthesis.cancel();
      await speak(digits.map(digit => DIGIT_WORDS[Number(digit)]).join(', '));
    },
    stop() { speechSynthesis.cancel(); },
    dispose() { disposed = true; speechSynthesis.cancel(); },
  };
}
