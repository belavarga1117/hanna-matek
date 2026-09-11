import {normalizeConfig as normalizeNbackConfig} from './nback/engine.js';

export function h(tag, props = {}, ...children) {
  const svgTags = new Set(['svg','g','path','circle','ellipse','rect','line','polyline','polygon','defs','linearGradient','radialGradient','stop','text','tspan','clipPath','mask','title']);
  const node = svgTags.has(tag) && document.createElementNS ? document.createElementNS('http://www.w3.org/2000/svg',tag) : document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'className') { if(node.namespaceURI==='http://www.w3.org/2000/svg')node.setAttribute('class',value);else node.className = value; }
    else if (key === 'style' && typeof value === 'object') {
      for (const [property, setting] of Object.entries(value)) {
        if (property.startsWith('--')) node.style.setProperty(property, setting);
        else node.style[property] = setting;
      }
    }
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (/^on[A-Z]/.test(key)) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'draggable') node.setAttribute(key, String(value));
    else if (key === 'textContent') node.textContent = value;
    else if (['value', 'checked', 'disabled', 'selected', 'hidden', 'required', 'readOnly', 'tabIndex'].includes(key)) node[key] = value;
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child !== null && child !== undefined && child !== false) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  // Native selects can only select a value after their options exist.
  if (tag.toLowerCase() === 'select' && props?.value !== undefined) node.value = props.value;
  return node;
}

export function shuffle(array, rng = Math.random) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function sample(array, count = 1, rng = Math.random) { return shuffle(array, rng).slice(0, Math.max(0, count)); }
export function clamp(value, min, max, fallback) { const n = Number(value); return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback; }

export const DEFAULTS = Object.freeze({
  count: 5,
  seconds: 10,
  difficulty: 'normal',
  reverse: false,
  level: 1,
  rounds: 3,
  theme: 'stations',
  symbolSet: 'objects',
});
export function normalizeSettings(raw = {}) {
  return {
    count: raw.count == null ? 5 : clamp(raw.count, 3, 9, 5),
    seconds: raw.seconds == null ? 10 : clamp(raw.seconds, 3, 180, 10),
    difficulty: ['easy', 'normal', 'hard'].includes(raw.difficulty) ? raw.difficulty : 'normal',
    reverse: raw.reverse === true || raw.reverse === '1',
    level: raw.level == null ? 1 : clamp(raw.level, 1, 3, 1),
    rounds: raw.rounds == null ? 3 : clamp(raw.rounds, 1, 5, 3),
    theme: ['stations', 'streets'].includes(raw.theme) ? raw.theme : 'stations',
    symbolSet: ['objects', 'abstract'].includes(raw.symbolSet) ? raw.symbolSet : 'objects',
  };
}
export function settingsQuery(settings) {
  if (settings?.nbackVersion === 1 || settings?.mode !== undefined && settings?.n !== undefined) {
    const s = normalizeNbackConfig(settings);
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(s)) {
      if (key === 'operations') params.set(key, value.join(','));
      else if (typeof value === 'boolean') params.set(key, value ? '1' : '0');
      else params.set(key, String(value));
    }
    return params.toString();
  }
  const s = normalizeSettings(settings);
  return new URLSearchParams({
    count: String(s.count),
    seconds: String(s.seconds),
    difficulty: s.difficulty,
    reverse: s.reverse ? '1' : '0',
    level: String(s.level),
    rounds: String(s.rounds),
    theme: s.theme,
    symbolSet: s.symbolSet,
  }).toString();
}
export function parseRoute(hash, validIds) {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const parts = path.split('/');
  if (parts[0] === 'eredmenyek') return { page: 'history' };
  if (parts[0] === 'jatek' && validIds.includes(parts[1])) {
    const raw = Object.fromEntries(new URLSearchParams(query));
    if (parts[1] === 'nback') {
      if (typeof raw.operations === 'string') raw.operations = raw.operations.split(',').filter(Boolean);
      try { return {page:'game',id:'nback',settings:normalizeNbackConfig(raw)}; }
      catch { return {page:'game',id:'nback',settings:raw}; }
    }
    return { page: 'game', id: parts[1], settings: normalizeSettings(raw) };
  }
  return { page: 'home' };
}
function normalizeNbackMetrics(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1 || !Array.isArray(value.channels) || value.channels.length > 16) return null;
  const whole = (input, min, max) => Number.isInteger(input) && input >= min && input <= max ? input : null;
  const percent = input => whole(input, 0, 100);
  const channels = value.channels.map(channel => {
    if (!channel || typeof channel !== 'object' || typeof channel.id !== 'string' || channel.id.length > 40 || typeof channel.label !== 'string' || channel.label.length > 100) return null;
    const hits=whole(channel.hits,0,1000),falseAlarms=whole(channel.falseAlarms,0,1000),misses=whole(channel.misses,0,1000),correctRejections=whole(channel.correctRejections,0,1000),score=percent(channel.percent);
    return [hits,falseAlarms,misses,correctRejections,score].includes(null)?null:{id:channel.id,label:channel.label,hits,falseAlarms,misses,correctRejections,percent:score};
  });
  if (channels.includes(null)) return null;
  const totals=value.totals,adaptation=value.adaptation;
  if (!totals || !adaptation || typeof totals!=='object' || typeof adaptation!=='object') return null;
  const cleanTotals={hits:whole(totals.hits,0,10000),falseAlarms:whole(totals.falseAlarms,0,10000),misses:whole(totals.misses,0,10000),correctRejections:whole(totals.correctRejections,0,10000)};
  if(Object.values(cleanTotals).includes(null))return null;
  const cleanAdaptation={fromN:whole(adaptation.fromN,1,20),nextN:whole(adaptation.nextN,1,20),lowScoreCount:whole(adaptation.lowScoreCount,0,2),action:String(adaptation.action||'')};
  if(Object.values(cleanAdaptation).includes(null)||!['up','down','stay','manual'].includes(cleanAdaptation.action))return null;
  const allowedModes=new Set([2,3,4,5,6,7,8,9,10,11,12,20,21,22,23,24,25,26,27,28,100,101,102,103,104,105,106,107]);
  const mode=whole(value.mode,2,107),n=whole(value.n,1,20),trialCount=whole(value.trialCount,4,200);
  if([mode,n,trialCount].includes(null)||!allowedModes.has(mode)||!['workshop','jaeggi'].includes(value.scoreProfile))return null;
  return {version:1,mode,n,scoreProfile:value.scoreProfile,trialCount,channels,totals:cleanTotals,adaptation:cleanAdaptation};
}
export function normalizeResult(result) {
  const metrics=normalizeNbackMetrics(result?.metrics);
  const isNback=result?.gameId==='nback'||result?.starBasis==='brainworkshop-no-stars'||metrics!==null;
  const total = clamp(result?.total, 1, isNback?2000:1000, 1);
  const correct = clamp(result?.correct, 0, total, 0);
  const authoritativePercent=isNback&&Number.isInteger(result?.percent)&&result.percent>=0&&result.percent<=100?result.percent:Math.round(correct / total * 100);
  return { correct, total, stars:isNback?null:Number.isInteger(result?.stars)&&result.stars>=0&&result.stars<=3?result.stars:null, starBasis:isNback?'brainworkshop-no-stars':String(result?.starBasis||'reference-unmeasured'), rulesVersion:result?.rulesVersion===1?1:2, percent:authoritativePercent, summary: String(result?.summary || ''), details: Array.isArray(result?.details) ? result.details.slice(0, 30).map(d => ({ label: String(d.label || ''), expected: String(d.expected ?? ''), actual: String(d.actual ?? ''), correct: !!d.correct })) : [], metrics };
}
const HISTORY_KEY = 'memoria-muhely:history:v1';
export function readHistory(storage, validIds) {
  try {
    const data = JSON.parse(storage.getItem(HISTORY_KEY) || '[]');
    if (!Array.isArray(data)) return [];
    const valid=[];
    for(const r of data){
      const maxTotal=r?.gameId==='nback'?2000:1000;
      if(!r||!validIds.includes(r.gameId)||!Number.isFinite(Date.parse(r.at))||!Number.isInteger(r.correct)||!Number.isInteger(r.total)||r.total<1||r.total>maxTotal||r.correct<0||r.correct>r.total)continue;
      try {
        valid.push({ ...normalizeResult(r), gameId: r.gameId, at: r.at, settings: r.gameId==='nback'?normalizeNbackConfig(r.settings):normalizeSettings(r.settings), duration: clamp(r.duration, 0, 86400, 0) });
      } catch {}
    }
    return valid.slice(-200);
  } catch { return []; }
}
export function saveHistory(storage, history) { storage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-200))); }
export function clearHistory(storage) { storage.removeItem(HISTORY_KEY); }
export function historyStats(history) {
  const comparable=history.filter(r=>r.gameId!=='nback');
  const correct = comparable.reduce((n, r) => n + r.correct, 0);
  const total = comparable.reduce((n, r) => n + r.total, 0);
  return { rounds: history.length, games: new Set(history.map(r => r.gameId)).size, percent: total ? Math.round(correct / total * 100) : null };
}

export function createCountdown(seconds, { now = () => performance.now(), onTick, onDone, schedule = setInterval, unschedule = clearInterval }) {
  let left = seconds * 1000, started = now(), paused = false, stopped = false, timer;
  function remaining() { return Math.max(0, paused ? left : left - (now() - started)); }
  function finish() { if (stopped) return; stopped = true; unschedule(timer); onTick?.(0); onDone(); }
  function tick() { if (stopped || paused) return; const ms = remaining(); onTick?.(ms / 1000); if (ms <= 0) finish(); }
  timer = schedule(tick, 100); tick();
  return { finish, pause() { if (!stopped && !paused) { left = remaining(); paused = true; } }, resume() { if (!stopped && paused) { started = now(); paused = false; tick(); } }, cancel() { stopped = true; unschedule(timer); }, get remaining() { return remaining() / 1000; } };
}
