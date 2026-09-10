export function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'className') node.className = value;
    else if (key === 'style' && typeof value === 'object') {
      for (const [property, setting] of Object.entries(value)) {
        if (property.startsWith('--')) node.style.setProperty(property, setting);
        else node.style[property] = setting;
      }
    }
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (/^on[A-Z]/.test(key)) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'textContent') node.textContent = value;
    else if (['value', 'checked', 'disabled', 'selected', 'hidden', 'required', 'readOnly', 'tabIndex'].includes(key)) node[key] = value;
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child !== null && child !== undefined && child !== false) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
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

export const DEFAULTS = Object.freeze({ count: 5, seconds: 10, difficulty: 'normal', reverse: false });
export function normalizeSettings(raw = {}) {
  return {
    count: raw.count == null ? 5 : clamp(raw.count, 3, 8, 5),
    seconds: raw.seconds == null ? 10 : clamp(raw.seconds, 3, 30, 10),
    difficulty: ['easy', 'normal', 'hard'].includes(raw.difficulty) ? raw.difficulty : 'normal',
    reverse: raw.reverse === true || raw.reverse === '1',
  };
}
export function settingsQuery(settings) {
  const s = normalizeSettings(settings);
  return new URLSearchParams({ count: String(s.count), seconds: String(s.seconds), difficulty: s.difficulty, reverse: s.reverse ? '1' : '0' }).toString();
}
export function parseRoute(hash, validIds) {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const parts = path.split('/');
  if (parts[0] === 'eredmenyek') return { page: 'history' };
  if (parts[0] === 'jatek' && validIds.includes(parts[1])) return { page: 'game', id: parts[1], settings: normalizeSettings(Object.fromEntries(new URLSearchParams(query))) };
  return { page: 'home' };
}
export function normalizeResult(result) {
  const total = clamp(result?.total, 1, 1000, 1);
  const correct = clamp(result?.correct, 0, total, 0);
  return { correct, total, percent: Math.round(correct / total * 100), summary: String(result?.summary || ''), details: Array.isArray(result?.details) ? result.details.slice(0, 30).map(d => ({ label: String(d.label || ''), expected: String(d.expected ?? ''), actual: String(d.actual ?? ''), correct: !!d.correct })) : [] };
}
const HISTORY_KEY = 'memoria-muhely:history:v1';
export function readHistory(storage, validIds) {
  try {
    const data = JSON.parse(storage.getItem(HISTORY_KEY) || '[]');
    if (!Array.isArray(data)) return [];
    return data.filter(r => r && validIds.includes(r.gameId) && Number.isFinite(Date.parse(r.at)) && Number.isInteger(r.correct) && Number.isInteger(r.total) && r.total > 0 && r.total <= 1000 && r.correct >= 0 && r.correct <= r.total)
      .slice(-200).map(r => ({ ...normalizeResult(r), gameId: r.gameId, at: r.at, settings: normalizeSettings(r.settings), duration: clamp(r.duration, 0, 86400, 0) }));
  } catch { return []; }
}
export function saveHistory(storage, history) { storage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-200))); }
export function clearHistory(storage) { storage.removeItem(HISTORY_KEY); }
export function historyStats(history) {
  const correct = history.reduce((n, r) => n + r.correct, 0);
  const total = history.reduce((n, r) => n + r.total, 0);
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
