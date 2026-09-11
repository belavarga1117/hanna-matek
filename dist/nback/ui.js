import { channelsForConfig, generateSession, normalizeConfig, isChannelMatch, evaluateArithmetic, scoreSession } from './engine.js';
import { createAudioBank } from './audio.js';

const FLASH_MS = 500;
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const SHAPES = ['◆', '●', '▲', '■', '★', '⬟', '✚', '⬢'];
const COLORS = ['#3568d4', '#27a9b8', '#4d9b50', '#626774', '#a54cad', '#d34f4f', '#b8becb', '#e5b92f'];
const POSITION_TO_CELL = Object.freeze({ 1: 1, 2: 2, 3: 3, 4: 6, 5: 9, 6: 8, 7: 7, 8: 4 });
const KEY_FALLBACK = Object.freeze({
  position1: 'a', position2: 's', position3: 'd', position4: 'f',
  vis1: 'g', vis2: 'h', vis3: 'j', vis4: 'k', color: 'f', image: 'j',
  visvis: 's', visaudio: 'd', audiovis: 'j', audio: 'l', audio2: ';',
});

function loadCssOnce() {
  if (typeof document === 'undefined' || document.querySelector?.('link[data-nback-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./nback.css', import.meta.url).href;
  link.dataset.nbackCss = 'true';
  document.head?.append(link);
}

function now() { return globalThis.performance?.now?.() ?? Date.now(); }
function scheduleFrame(callback) { return globalThis.requestAnimationFrame ? requestAnimationFrame(callback) : setTimeout(() => callback(now()), 16); }
function cancelFrame(id) { return globalThis.cancelAnimationFrame ? cancelAnimationFrame(id) : clearTimeout(id); }
function isTextEntry(target) { return !!target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(String(target.tagName).toUpperCase()) || target.isContentEditable); }
function normalizedKey(key) { return String(key || '').toLowerCase() === 'semicolon' ? ';' : String(key || '').toLowerCase(); }
function keyLabel(key) { return key === ';' ? ';' : String(key || '').toUpperCase(); }
function audioChannel(id) { return id === 'audio' || id === 'audio2'; }
function combinationChannel(id) { return ['visvis', 'visaudio', 'audiovis'].includes(id); }

function channelLabel(channel, config = {}) {
  const labels = {
    visvis: 'Betű = korábbi betű',
    visaudio: 'Betű = korábbi hang',
    audiovis: 'Hang = korábbi betű',
    audio: config.mode>=100?'Kimondott betű egyezik':'Hang egyezik', audio2: 'Zongorahang egyezik', color:'Szín egyezik', image:'Kép egyezik',
    arithmetic: 'Számolás',
  };
  if (/^position[1-4]$/.test(channel.id)) return config.multiStim>1?`${channel.id.at(-1)}. tárgy: hely egyezik`:'Hely egyezik';
  if (/^vis[1-4]$/.test(channel.id)) return `${channel.id.at(-1)}. tárgy: jel egyezik`;
  return labels[channel.id] || channel.label || channel.id;
}

function arithmeticValueValid(value) {
  const text = String(value || '').trim();
  if (text.length > 32) return false;
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\d+\/\d+)$/.test(text)) return false;
  if (text.includes('/') && Number(text.split('/')[1]) === 0) return false;
  return true;
}

function rulesFor(config, channels) {
  const names = channels.filter((channel) => channel.id !== 'arithmetic').map(channel=>channelLabel(channel,config));
  const parts = [];
  if (channels.some(({id})=>id==='audio2')) parts.push('Kétféle hang szól egyszerre: egy kimondott betű és egy zongorahang. Külön figyeld, hogy ugyanaz a betű, illetve ugyanaz a hangmagasság ismétlődik-e. Fejhallgatóban a betű balról, a zongora jobbról szól.');
  if (names.length) parts.push(`Jelöld külön, ha egyezik: ${names.join('; ')}.`);
  if (channels.some((channel) => channel.id === 'arithmetic')) parts.push('A korábbi számmal kezdd a műveletet, a mostani szám legyen a második. A beírt érvényes válasz a lépés végén automatikusan rögzül; a gombbal korábban is rögzítheted. Kivonásnál negatív eredmény is lehet; az üres válasz kihagyás.');
  if (config.crab) parts.push(`Crab: az előző ${config.n} elemű blokkot fordított sorrendben idézd fel. A mostani távolságot mindig kiírjuk.`);
  else parts.push(config.variable ? 'Mindig a kijelzett N szerinti korábbi elemmel hasonlíts.' : `Mindig az ${config.n} lépéssel korábbi elemmel hasonlíts.`);
  if (config.multiStim > 1) parts.push(`A ${config.multiStim} számozott tárgy önálló: mindegyik helyét és jelét a saját korábbi állapotához mérd.`);
  if (config.selfPaced) parts.push('A jel a továbblépésig látszik. Jelöld az egyezéseket, majd nyomd meg a Tovább gombot.');
  else parts.push(`A jel ${Math.min(config.intervalMs,500+100*(config.multiStim-1))} ms-ig látszik, majd a lépés végéig válaszolhatsz.`);
  return parts;
}

function visualNeeds(channels) {
  return channels.some(({ id }) => id.startsWith('position') || id.startsWith('vis') || ['color', 'image', 'arithmetic'].includes(id));
}

function tokenFor(h, object, config, channelIds, multi = false) {
  const objectFeature = [...channelIds].some(id=>/^vis[1-4]$/.test(id));
  const imageVisible = multi ? config.identity==='image'||objectFeature : channelIds.has('image');
  const colorVisible = multi ? config.identity==='color'||objectFeature : channelIds.has('color');
  const imageId = Number(object.image || object.id || 1);
  const colorId = Number(object.color || object.id || 1);
  const style = {};
  if (colorVisible) style.backgroundColor = COLORS[(colorId - 1) % COLORS.length];
  const className = `nback-object${colorVisible ? ' nback-object-color' : ''}${imageVisible ? ' nback-object-image' : ''}`;
  return h('span', { className, style, 'aria-label': multi ? `${object.id}. tárgy` : 'Vizuális jel' },
    imageVisible ? h('span', { className: 'nback-shape', 'aria-hidden': 'true' }, SHAPES[(imageId - 1) % SHAPES.length]) : null,
    multi ? h('span', { className: 'nback-object-id' }, String(object.id)) : null);
}

function renderStimulus(h, trial, config, channels) {
  const ids = new Set(channels.map(({ id }) => id));
  const children = [];
  const positionChannels = channels.filter(({ id }) => id.startsWith('position'));
  if (positionChannels.length) {
    const cells = Array.from({ length: 9 }, (_, index) => h('div', { className: `nback-grid-cell${index === 4 ? ' nback-grid-center' : ''}` }));
    const objects = config.multiStim > 1
      ? (trial.stimuli.objects || []).slice(0, config.multiStim)
      : [{ id: 1, position: trial.stimuli.positions?.[0] || trial.stimuli.objects?.[0]?.position || 0, color: trial.stimuli.color, image: trial.stimuli.image }];
    for (const object of objects) {
      const cell = POSITION_TO_CELL[Number(object.position)];
      if (!cell) continue;
      const token = tokenFor(h, object, config, ids, config.multiStim > 1);
      if (config.multiStim === 1 && ids.has('arithmetic')) token.append(h('span', { className: 'nback-token-symbol' }, String(trial.stimuli.number)));
      else if (config.multiStim === 1 && [...ids].some(combinationChannel)) token.append(h('span', { className: 'nback-token-symbol' }, LETTERS[(Number(trial.stimuli.visual) - 1) % LETTERS.length]));
      cells[cell - 1].append(token);
    }
    if (ids.has('arithmetic')) {
      const glyphs = { '+': '+', '-': '−', '*': '×', '/': '÷' };
      cells[4].append(h('span', { className: 'nback-grid-operation' }, `${trial.shownBack||config.n}-nel korábbi ${glyphs[trial.operation] || trial.operation || '?'} mostani`));
    }
    children.push(h('div', { className: 'nback-grid', role: 'img', 'aria-label': 'Háromszor hármas pozíciórács' }, ...cells));
  } else if (ids.has('arithmetic')) {
    const glyphs = { '+': '+', '-': '−', '*': '×', '/': '÷' };
    children.push(h('div', { className: 'nback-arithmetic-stimulus' },
      h('span', { className: 'nback-arithmetic-rule' }, `${trial.shownBack||config.n} lépéssel korábbi ${glyphs[trial.operation] || trial.operation || '?'} mostani`),
      h('strong', {}, String(trial.stimuli.number))));
  } else if ([...ids].some(combinationChannel)) {
    children.push(h('div', { className: 'nback-letter', style:ids.has('color')?{backgroundColor:COLORS[trial.stimuli.color-1],color:'#fff',textShadow:'0 1px 3px #000a'}:{}, 'aria-label': `Betű: ${LETTERS[(Number(trial.stimuli.visual) - 1) % LETTERS.length]}` }, LETTERS[(Number(trial.stimuli.visual) - 1) % LETTERS.length]));
  } else if (ids.has('color') || ids.has('image')) {
    children.push(h('div', { className: 'nback-center-stimulus' }, tokenFor(h, { id: 1, color: trial.stimuli.color, image: trial.stimuli.image }, config, ids)));
  }
  if (!visualNeeds(channels) && channels.some(({ id }) => audioChannel(id))) {
    children.push(h('div', { className: 'nback-audio-pulse', 'aria-label': 'Hangjel lejátszása' }, h('span', { 'aria-hidden': 'true' }, '◖ )))')));

  }
  return h('div', { className: 'nback-stimulus' }, ...children);
}

function responseKeyMap(channels) {
  const used = new Set(), map = new Map();
  const spare = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', 'q', 'w', 'e', 'r', 't', 'y'];
  for (const channel of channels) {
    if (channel.id === 'arithmetic') continue;
    let key = normalizedKey(channel.key || KEY_FALLBACK[channel.id]);
    if (!key || used.has(key)) key = spare.find((candidate) => !used.has(candidate));
    if (!key) continue;
    used.add(key); map.set(key, channel.id);
  }
  return map;
}

export const nbackGames = { nback: { mount(ctx) {
  loadCssOnce();
  const { h, root } = ctx;
  let disposed = false, finished = false, starting = false, frame = null, audioBank = null, audioError = null;
  let audioGeneration = 0, state = 'intro', session = null, config = null, channels = [], keyMap = new Map();
  let trialIndex = -1, trialOnset = 0, elapsedBeforeRun = 0, runStarted = now(), practice = false;
  let arithmeticDraft=null;
  let events = [], eventIndex = new Map(), answered = new Set(), stimulusNode = null, feedbackNode = null;
  let progressFill = null, progressText = null, advanceButton = null, pauseOverlay = null, arithmeticInput = null;

  try { config = normalizeConfig(ctx.settings || {}); }
  catch (error) {
    ctx.phase?.('Nem indítható', 'Ellenőrizd az N-back beállításait.');
    root.replaceChildren(h('div', { className: 'nback-error' }, h('h3', {}, 'Ezt a beállítást nem lehet elindítani'), h('p', {}, error?.message || 'Érvénytelen beállítás.')));
    return () => { disposed = true; root.replaceChildren(); };
  }

  channels = channelsForConfig(config);
  keyMap = responseKeyMap(channels);
  const mainConfig=config;
  const flashMs=()=>Math.min(config.intervalMs,FLASH_MS+100*(config.multiStim-1));
  const readyMs=()=>{const trial=session?.trials?.[trialIndex];return Math.max(flashMs(),trial?audioBank?.durationMs?.(trial.stimuli,config,trial.operation,!!trial.warmup)||0:0);};
  const needsSound=channels.some(({id})=>['audio','audio2','arithmetic'].includes(id));

  function clock() { return elapsedBeforeRun + (state === 'running' ? now() - runStarted : 0); }
  function stopFrame() { if (frame != null) { cancelFrame(frame); frame = null; } }
  function startFrame() { stopFrame(); if (!disposed && state === 'running') frame = scheduleFrame(tick); }
  function hideStimulus() { if (stimulusNode) stimulusNode.hidden = true; }

  function prepareAudio() {
    const generation = ++audioGeneration;
    audioError = null;
    Promise.resolve().then(() => needsSound?createAudioBank():{async unlock(){},play(){},stop(){},dispose(){}}).then((bank) => {
      if (disposed || generation !== audioGeneration) { bank?.dispose?.(); return; }
      audioBank?.dispose?.(); audioBank = bank; renderIntro();
    }).catch((error) => {
      if (disposed || generation !== audioGeneration) return;
      audioError = error || new Error('A hangok betöltése sikertelen.'); renderIntro();
    });
  }

  function phaseForTrial() {
    const trial = session.trials[trialIndex];
    if (practice) return ['Rövid próba', `${trialIndex + 1}/${session.trials.length}. lépés · ${config.n}-back · nem kerül mentésre`];
    if (trial.warmup) return ['Bemelegítés', `${trialIndex + 1}/${config.n} · még nincs pontozás`];
    const scored = trialIndex - config.n + 1;
    return [`${config.n}-back`, `${scored}/${config.trialCount}. értékelt lépés`];
  }

  function renderIntro(message = '') {
    if (disposed || state === 'running' || state === 'paused') return;
    config=mainConfig;
    state = 'intro'; stopFrame(); audioBank?.stop?.();
    ctx.phase?.('N-back műhely', 'Gyakorolj röviden, majd indítsd el az értékelt kört.');
    const keyItems = channels.filter(({ id }) => id !== 'arithmetic').map((channel) => {
      const entry = [...keyMap.entries()].find(([, id]) => id === channel.id);
      return h('li', {}, h('kbd', {}, keyLabel(entry?.[0] || '')), h('span', {}, channelLabel(channel,config)));
    });
    if (channels.some(({ id }) => id === 'arithmetic')) keyItems.push(h('li', {}, h('kbd', {}, 'ENTER'), h('span', {}, 'Számolási válasz rögzítése')));
    const status = audioError
      ? h('div', { className: 'nback-audio-error', role: 'alert' }, h('p', {}, 'A hangok nem töltődtek be. Ellenőrizd a kapcsolatot, majd próbáld újra.'), h('button', { type: 'button', className: 'secondary-button', onClick: prepareAudio }, 'Hangok újratöltése'))
      : h('p', { className: 'nback-loading', 'aria-live': 'polite' }, !needsSound?'Ez a feladat csak vizuális jeleket használ.':audioBank ? 'A hangok készen állnak.' : 'Hangok előkészítése…');
    const soundTest=needsSound?h('button',{type:'button',className:'text-link',disabled:!audioBank||!!audioError,onClick:async()=>{
      try{await audioBank.unlock();if(disposed||state!=='intro')return;audioBank.play({audio:1,audio2:5},config,'+',false);status.textContent=channels.some(c=>c.id==='arithmetic')?'Hangpróba: „plusz”.':channels.some(c=>c.id==='audio2')?'Hangpróba: A betű és zongorahang egyszerre.':'Hangpróba: A betű.';}
      catch(error){if(!disposed){audioError=error;renderIntro();}}
    }},'Hangpróba'):null;
    const practiceButton = h('button', { type: 'button', className: 'secondary-button', disabled: !audioBank || !!audioError, onClick: () => begin(true) }, 'Rövid próba');
    const startButton = h('button', { type: 'button', className: 'primary-button', disabled: !audioBank || !!audioError, onClick: () => begin(false) }, 'Értékelt kör indítása');
    root.replaceChildren(h('section', { className: 'nback-intro' },
      h('div', { className: 'nback-intro-top' }, h('span', { className: 'nback-level-badge' }, `${config.n}-BACK`), h('h3', {}, 'A mostani jelet figyeld, a korábbira emlékezz.')),
      h('ol', { className: 'nback-rule-list' }, ...rulesFor(config, channels).map((rule) => h('li', {}, rule))),
      h('div', { className: 'nback-key-card' }, h('strong', {}, 'Egyezésjelző gombok'), h('p',{className:'nback-touch-hint'},'Koppints arra, ami egyezik. Egyszerre több gombot is megnyomhatsz.'),h('ul', {}, ...keyItems)),
      message ? h('p', { className: 'nback-practice-done', role: 'status' }, message) : null,
      status,
      soundTest,
      h('p', { className: 'nback-gesture-note' }, needsSound?'Az indítógomb engedélyezi a hangot. Fejhallgató ajánlott.':'A rövid próba megmutatja a válaszgombok használatát.'),
      h('div', { className: 'nback-actions' }, practiceButton, startButton)));
  }

  async function begin(isPractice) {
    if (disposed || starting || !audioBank || audioError) return;
    starting = true;
    try {
      await audioBank.unlock();
      if (disposed) return;
      config=isPractice?normalizeConfig({...mainConfig,n:mainConfig.crab?Math.min(mainConfig.n,3):Math.min(mainConfig.n,2),trialCount:4,selfPaced:true,adaptive:false,lowScoreCount:0,scoreProfile:'workshop'}):mainConfig;
      const generated = generateSession({ seed: isPractice ? ((Number(ctx.seed) >>> 0) ^ 0x9e3779b9) >>> 0 : Number(ctx.seed) >>> 0, config });
      if (disposed) return;
      practice = isPractice;
      session = generated;
      events = []; eventIndex = new Map(); trialIndex = 0; finished = false;
      elapsedBeforeRun = 0; runStarted = now(); state = 'running'; trialOnset = 0;
      showTrial(); startFrame();
    } catch (error) {
      if (!disposed) { audioError = error || new Error('A hang nem indítható.'); state = 'intro'; renderIntro(); }
    } finally { starting = false; }
  }

  function responseAt() { return Math.max(0, Math.round(clock() - trialOnset)); }
  function canRespond() {
    if (disposed || state !== 'running' || !session || finished) return false;
    if (!config.selfPaced && responseAt() >= config.intervalMs) return false;
    return true;
  }

  function markChannel(id) {
    if (!canRespond() || answered.has(id)) return;
    answered.add(id);
    if (!session.trials[trialIndex].warmup) {
      const event = { trialIndex, channel: id, atMs: responseAt(), value: true };
      eventIndex.set(`${trialIndex}:${id}`, events.length); events.push(event);
    }
    const button = root.querySelector?.(`[data-channel="${id}"]`);
    if (button) { button.disabled = true; button.classList?.add('is-recorded'); }
    feedbackNode.textContent = `${channelLabel(channels.find((channel) => channel.id === id) || { id },config)}: jelölve.`;
  }

  function submitArithmetic() {
    if (!canRespond() || !arithmeticInput) return;
    const value = arithmeticInput.value.trim().replace(',','.');
    if (!arithmeticValueValid(value)) {
      feedbackNode.textContent = 'Írj be előjeles egész, tizedes vagy tört értéket (például -2, 0.5 vagy 1/2).';
      arithmeticInput.setAttribute('aria-invalid', 'true'); return;
    }
    commitArithmetic(value,responseAt());
  }

  function commitArithmetic(value,atMs){
    arithmeticInput.setAttribute('aria-invalid', 'false');
    if (!session.trials[trialIndex].warmup) {
      const key = `${trialIndex}:arithmetic`, event = { trialIndex, channel: 'arithmetic', atMs, value };
      if (eventIndex.has(key)) events[eventIndex.get(key)] = event;
      else { eventIndex.set(key, events.length); events.push(event); }
    }
    answered.add('arithmetic');
    feedbackNode.textContent = 'A válasz rögzítve. A lépés végéig még módosíthatod.';
  }

  function showTrial() {
    if (disposed || !session?.trials?.[trialIndex]) return;
    const trial = session.trials[trialIndex]; answered = new Set(); arithmeticDraft=null;
    const [title, subtitle] = phaseForTrial(); ctx.phase?.(title, subtitle);
    stimulusNode = renderStimulus(h, trial, config, channels);
    feedbackNode = h('p', { className: 'nback-response-feedback', 'aria-live': 'polite' }, trial.warmup && !practice ? 'Bemelegítő kör – a jelöléseid nem számítanak bele.' : '');
    progressFill = h('div', { className: 'nback-progress-fill' });
    progressText = h('span', { className: 'nback-progress-text' }, config.selfPaced ? 'Figyeld a jelet…' : `${(config.intervalMs / 1000).toFixed(1)} mp`);
    const buttons = channels.filter(({ id }) => id !== 'arithmetic').map((channel) => {
      const entry = [...keyMap.entries()].find(([, id]) => id === channel.id), key = entry?.[0] || '';
      return h('button', { type: 'button', className: 'nback-response-button', dataset: { channel: channel.id }, onClick: () => markChannel(channel.id) },
        h('span', {}, channelLabel(channel,config)), h('kbd', {}, keyLabel(key)));
    });
    const arithmetic = channels.some(({ id }) => id === 'arithmetic');
    arithmeticInput = arithmetic ? h('input', { type: 'text', inputmode: 'decimal', maxlength:'32', autocomplete: 'off', spellcheck: 'false', className: 'nback-arithmetic-input', placeholder: 'például -2 vagy 1/2', 'aria-label': 'Számolási válasz' }) : null;
    const captureDraft=()=>{if(canRespond())arithmeticDraft={value:arithmeticInput.value.trim().replace(',','.'),atMs:responseAt()};};
    arithmeticInput?.addEventListener('input',captureDraft);
    const arithmeticRow = arithmetic ? h('div', { className: 'nback-arithmetic-answer' }, arithmeticInput,
      h('div',{className:'nback-number-tools'},h('button',{type:'button',className:'secondary-button','aria-label':'Előjel váltása',onClick:()=>{arithmeticInput.value=arithmeticInput.value.startsWith('-')?arithmeticInput.value.slice(1):'-'+arithmeticInput.value;captureDraft();arithmeticInput.focus();}},'±'),
      h('button',{type:'button',className:'secondary-button','aria-label':'Törtvonal beírása',onClick:()=>{if(!arithmeticInput.value.includes('/')&&!/[.,]/.test(arithmeticInput.value))arithmeticInput.value+='/';captureDraft();arithmeticInput.focus();}},'/')),
      h('button', { type: 'button', className: 'secondary-button', onClick: submitArithmetic }, 'Válasz rögzítése')) : null;
    advanceButton = config.selfPaced ? h('button', { type: 'button', className: 'nback-advance-button', disabled: true, onClick: advanceTrial }, 'Tovább') : null;
    const pauseButton = h('button', { type: 'button', className: 'nback-pause-button', onClick: () => pause('Megállítottad a gyakorlatot.') }, 'Szünet');
    pauseOverlay = h('div', { className: 'nback-pause-overlay', hidden: true }, h('div', {}, h('span', { 'aria-hidden': 'true' }, 'Ⅱ'), h('h3', {}, 'Szünet'), h('p', {}, 'A jel el van rejtve, az óra áll.'), h('button', { type: 'button', className: 'primary-button', onClick: resume }, 'Folytatás')));
    root.replaceChildren(h('section', { className: `nback-play${channels.length>=6?' nback-many':''}` },
      h('div', { className: 'nback-session-line' },
        h('span', { className: 'nback-trial-kind' }, practice ? 'PRÓBA' : trial.warmup ? 'BEMELEGÍTÉS' : 'ÉRTÉKELT'),
        h('span', { className: 'nback-shown-back' }, `${trial.shownBack || config.n}-back`), pauseButton),
      h('div', { className: 'nback-progress', 'aria-hidden': 'true' }, progressFill), progressText,
      stimulusNode,
      h('div', { className: 'nback-response-grid' }, ...buttons), arithmeticRow, feedbackNode,
      practice ? h('p',{className:'nback-practice-hint'},trial.warmup?'Először csak jegyezd meg a jelet. A Tovább gombbal lépj a következőhöz.':practiceHint(trial)):null,
      advanceButton ? h('div', { className: 'nback-advance-row' }, advanceButton) : null,
      pauseOverlay));
    if(trialIndex===0)root.closest?.('.play-panel')?.scrollIntoView?.({block:'start',behavior:'instant'});
    try { audioBank.play(trial.stimuli, config, trial.operation, !!trial.warmup); }
    catch (error) { pause(error?.message || 'A hang leállt. A folytatáshoz koppints a gombra.'); }
  }

  function practiceHint(trial){
    const matches=channels.filter(c=>c.id!=='arithmetic'&&isChannelMatch(session,trial.index,c.id)).map(channel=>channelLabel(channel,config));
    let text=matches.length?`Próbáld ki ezeket a gombokat: ${matches.join('; ')}.`:'Most nincs egyezés a jelölős csatornákon. Ilyenkor ezeken ne jelölj.';
    if(channels.some(c=>c.id==='arithmetic'))text+=` Számolás: ${evaluateArithmetic(session.trials[trial.targetIndex].stimuli.number,trial.operation,trial.stimuli.number).text}. Írd be, majd rögzítsd.`;
    return text;
  }

  function finishSession() {
    if (disposed || finished) return;
    finished = true; stopFrame(); audioBank?.stop?.(); state = 'finished'; hideStimulus();
    if (practice) { const result=scoreSession(session,{version:1,events});renderIntro(`A próba véget ért: ${result.metrics.totals.hits} találat, ${result.metrics.totals.falseAlarms} hibás jelölés, ${result.metrics.totals.misses} kihagyás. Ezt nem mentettük. Most az eredeti beállításokkal indulhatsz.`); return; }
    ctx.phase?.('Kész', 'Az értékelt kör befejeződött.');
    const answer = { version: 1, events: events.map((event) => ({ ...event })) };
    ctx.done(null, answer);
  }

  function advanceTrial() {
    if (disposed || state !== 'running' || !session || finished) return;
    const trialElapsed = clock() - trialOnset;
    if (config.selfPaced && trialElapsed < readyMs()) return;
    if(arithmeticDraft&&arithmeticDraft.value===arithmeticInput?.value.trim().replace(',','.')&&arithmeticValueValid(arithmeticDraft.value))commitArithmetic(arithmeticDraft.value,arithmeticDraft.atMs);
    audioBank?.stop?.();
    if (trialIndex + 1 >= session.trials.length) { finishSession(); return; }
    trialIndex += 1; trialOnset = clock(); showTrial();
  }

  function tick() {
    frame = null;
    if (disposed || state !== 'running' || !session) return;
    const trialElapsed = clock() - trialOnset;
    if (!config.selfPaced && trialElapsed >= flashMs()) hideStimulus();
    if (advanceButton) advanceButton.disabled = trialElapsed < readyMs();
    const remaining = config.selfPaced ? Math.max(0, readyMs() - trialElapsed) : Math.max(0, config.intervalMs - trialElapsed);
    if (progressFill) progressFill.style.width = `${Math.max(0, Math.min(100, remaining / (config.selfPaced ? readyMs() : config.intervalMs) * 100))}%`;
    if (progressText) progressText.textContent = config.selfPaced
      ? (trialElapsed < readyMs() ? 'Figyeld a jelet…' : 'Válaszolj, majd lépj tovább.')
      : `${Math.max(0, remaining / 1000).toFixed(1)} mp`;
    if (!config.selfPaced && trialElapsed >= config.intervalMs) advanceTrial();
    if (!disposed && state === 'running') frame = scheduleFrame(tick);
  }

  function pause(reason = 'A gyakorlat szünetel.') {
    if (disposed || state !== 'running') return;
    elapsedBeforeRun = clock(); state = 'paused'; stopFrame(); hideStimulus(); audioBank?.stop?.();
    if (pauseOverlay) { pauseOverlay.hidden = false; const p = pauseOverlay.querySelector?.('p'); if (p) p.textContent = reason; }
    ctx.phase?.('Szünet', reason);
  }

  async function resume() {
    if (disposed || state !== 'paused') return;
    try { await audioBank?.unlock?.(); }
    catch (error) {
      const text = pauseOverlay?.querySelector?.('p');
      if (text) text.textContent = error?.message || 'A hang nem indult újra. Koppints még egyszer a folytatásra.';
      return;
    }
    if (disposed || state !== 'paused') return;
    state = 'running'; runStarted = now();
    if (pauseOverlay) pauseOverlay.hidden = true;
    const elapsed=clock()-trialOnset;
    if(stimulusNode)stimulusNode.hidden=!(config.selfPaced||elapsed<flashMs());
    const trial=session?.trials?.[trialIndex];
    if(trial){
      try { audioBank?.play?.(trial.stimuli,config,trial.operation,!!trial.warmup,elapsed); }
      catch(error){state='paused';if(pauseOverlay)pauseOverlay.hidden=false;return;}
    }
    const [title, subtitle] = phaseForTrial(); ctx.phase?.(title, subtitle);
    startFrame();
  }

  function onKeyDown(event) {
    if (disposed || state === 'paused' || state !== 'running' || event.repeat) return;
    const key = normalizedKey(event.key);
    if (isTextEntry(event.target)) {
      if (arithmeticInput && event.target === arithmeticInput && key === 'enter') { event.preventDefault?.(); submitArithmetic(); }
      else if (config.selfPaced && arithmeticInput && event.target === arithmeticInput && key === ' ') { event.preventDefault?.(); advanceTrial(); }
      else if (arithmeticInput && event.target === arithmeticInput && keyMap.has(key)) { event.preventDefault?.(); markChannel(keyMap.get(key)); }
      return;
    }
    if (keyMap.has(key)) { event.preventDefault?.(); markChannel(keyMap.get(key)); return; }
    if (config.selfPaced && ((!arithmeticInput && key === 'enter') || (arithmeticInput && key === ' '))) { event.preventDefault?.(); advanceTrial(); }
  }
  function onVisibility() { if (document.hidden) pause('Az ablak elrejtése miatt automatikusan megállt.'); }
  function onBlur() { pause('Az ablakváltás miatt automatikusan megállt.'); }

  document.addEventListener?.('visibilitychange', onVisibility);
  globalThis.window?.addEventListener?.('blur', onBlur);
  globalThis.window?.addEventListener?.('keydown', onKeyDown);
  prepareAudio(); renderIntro();

  return function cleanup() {
    if (disposed) return;
    disposed = true; audioGeneration += 1; state = 'disposed'; stopFrame();
    document.removeEventListener?.('visibilitychange', onVisibility);
    globalThis.window?.removeEventListener?.('blur', onBlur);
    globalThis.window?.removeEventListener?.('keydown', onKeyDown);
    try { audioBank?.stop?.(); audioBank?.dispose?.(); } catch {}
    audioBank = null; root.replaceChildren();
  };
} } };

export { arithmeticValueValid, responseKeyMap };
