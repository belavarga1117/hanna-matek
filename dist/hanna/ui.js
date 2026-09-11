function replaceContent(node,...children){node.replaceChildren(...children.flat(Infinity).filter(child=>child!==null&&child!==undefined&&child!==false));}
import { HANNA_ACTIVITIES } from './content.js';
import {formatHannaRetention} from './progress.js';
import {
  describeHannaSettings as describeFromEngine,
  generateHannaSession,
  normalizeHannaSettings,
  allowedHannaContentLevels,
} from './engine.js';

const ACTIVITY_BY_ID = new Map(HANNA_ACTIVITIES.map((activity) => [activity.id, activity]));
const RESOURCE_FOR_ACTIVITY = Object.freeze({
  loci: 'palace', palace: 'palace', peg: 'peg', major: 'major', numbers: 'major',
  chain: 'material', association: 'material', keyword: 'material',
  text: 'material', concept: 'material',
});
const RESOURCE_LABELS = Object.freeze({ palace: 'memóriapalota', peg: 'peg-lista', major: '00–99 szótár', material: 'tananyag' });
const RECALL_LABELS = Object.freeze({
  choice: 'Választás', ordered: 'Sorrend', free: 'Szabad felidézés', random: 'Véletlen kérdés',
  reverse: 'Visszafelé', verbatim: 'Szó szerint', meaning: 'Kulcsgondolatok',
});

function loadCssOnce() {
  if (typeof document === 'undefined' || document.querySelector?.('link[data-hanna-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./hanna.css', import.meta.url).href;
  link.dataset.hannaCss = 'true';
  document.head?.append(link);
}

export function shuffleHannaChoices(items,seed){const out=[...items];let state=(seed>>>0)||0x6d2b79f5;for(let i=out.length-1;i>0;i--){state=(Math.imul(state,1664525)+1013904223)>>>0;const j=Math.floor((state/4294967296)*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function clockNow() { return globalThis.performance?.now?.() ?? Date.now(); }
function wallNow() { return Date.now(); }
function clamp(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number))) : fallback;
}
function bool(value) { return value === true || value === 1 || value === '1' || value === 'true'; }
function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}
function eventId(index) { return `hanna-${wallNow().toString(36)}-${index.toString(36)}`; }
function normalizeText(value) {
  return String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
}
function formatSeconds(ms) {
  const seconds = Math.max(0, Math.ceil(Number(ms || 0) / 1000));
  return seconds >= 60 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : `${seconds} mp`;
}
function formatResponseTime(ms) {
  const value = Math.max(0, Number(ms || 0));
  if (value < 10000) return `${(value / 1000).toFixed(2).replace('.', ',')} mp`;
  return formatSeconds(value);
}
function buttonByText(root, label) {
  return [...(root.querySelectorAll?.('button') || [])].find((button) => button.textContent === label) || null;
}
function safeImageSource(value) {
  const source = String(value || '');
  if (/^(?:\.\.?\/|\/assets\/|data:image\/(?:png|jpeg|webp);base64,)/i.test(source)) return source;
  return '';
}
function itemVisual(h, item, className = '') {
  const image = String(item?.image || '');
  if (Number.isInteger(item?.portraitIndex)) {
    const index = ((item.portraitIndex % 12) + 12) % 12;
    return h('span', {
      className: `hanna-portrait ${className}`,
      role: 'img',
      'aria-label': item.label || 'Arckép',
      style: { '--portrait-x': `${(index % 4) * 33.333}%`, '--portrait-y': `${Math.floor(index / 4) * 50}%` },
    });
  }
  const source = safeImageSource(image);
  if (source) return h('img', { className: `hanna-item-image ${className}`, src: source, alt: '' });
  if (image) return h('span', { className: `hanna-item-emoji ${className}`, 'aria-hidden': 'true' }, image);
  return h('span', { className: `hanna-item-monogram ${className}`, 'aria-hidden': 'true' }, normalizeText(item?.label).slice(0, 1).toLocaleUpperCase('hu') || '•');
}

function field(h, label, control, help = '') {
  return h('label', { className: 'hanna-field' },
    h('span', { className: 'hanna-field-label' }, label), control,
    help ? h('small', { className: 'hanna-field-help' }, help) : null,
  );
}

export function describeHannaSettings(settings = {}) {
  try { return describeFromEngine(settings); }
  catch { return 'Hanna Módszer · a beállítás ellenőrzést igényel'; }
}

export function createHannaSettings({ h, value = {}, onChange = () => {}, school = null, compact = false } = {}) {
  if (typeof h !== 'function') throw new TypeError('A Hanna-beállításokhoz szükséges a h elemkészítő.');
  loadCssOnce();
  let current = normalizeHannaSettings(value);
  let generation = 0;
  let resources = [];
  let resourceState = school?.user ? 'loading' : 'guest';
  let resourceError = '';
  const element = h('section', { className: `hanna-settings${compact ? ' is-compact' : ''}` });

  function emit(next) {
    try {
      const selected=resources.filter(resource=>(next.resourceIds||[]).includes(resource.id));
      const validated=normalizeHannaSettings({...next,...(selected.length?{resourceSnapshot:selected}:{})});
      if((selected.length||validated.contentLevel==='material')&&validated.activity!=='review')generateHannaSession(validated,0);
      const {resourceSnapshot:unusedSnapshot,...publicSettings}=validated; current=publicSettings;
      onChange({ ...current, resourceIds: [...(current.resourceIds || [])] });
      render();
    } catch (error) {
      render();
      const alert = element.querySelector?.('[data-hanna-validation="true"]');
      if (alert) alert.textContent = error?.message || 'Ez a beállítás nem használható.';
    }
  }

  async function loadResources() {
    if (!school?.user || typeof school.api !== 'function') return;
    const ownGeneration = ++generation;
    const userId = school.user.id;
    resourceState = 'loading'; resourceError = ''; render();
    try {
      const data = await school.api('/api/hanna/resources', { method: 'GET' });
      if (ownGeneration !== generation || school.user?.id !== userId) return;
      resources = Array.isArray(data?.resources) ? data.resources : [];
      resourceState = 'ready'; render();
    } catch (error) {
      if (ownGeneration !== generation || school.user?.id !== userId || error?.name === 'AbortError') return;
      resourceState = 'error'; resourceError = error?.message || 'Az eszközök betöltése nem sikerült.'; render();
    }
  }

  function scalarInput(key, type, min, max, step = 1) {
    return h('input', {
      type, min, max, step, value: current[key], dataset: { setting: key },
      onChange: (event) => emit({ ...current, [key]: Number(event.target.value) }),
    });
  }

  function itemCountControl(activity) {
    if (activity.id === 'numbers') return h('select', {
      value: current.itemCount, dataset: { setting: 'itemCount' },
      onChange: (event) => emit({ ...current, itemCount: Number(event.target.value) }),
    }, ...[16, 20, 30].map((count) => h('option', { value: count }, `${count} számjegy`)));
    const ranges = {
      baseline: [3, 10], chain: [5, 40], association: [3, 15], loci: [5, 30], palace: [5, 30], peg: [5, 100],
      faces: [3, 12], keyword: [3, 8], major: [10, 10], random: [5, 30], text: [1, 1], concept: [3, 6], boss: [4, 12], review: [1, 50],
    };
    const [min, max] = ranges[activity.id] || [1, 30];
    return h('input', {
      type: 'number', min, max, value: current.itemCount, disabled: min === max, dataset: { setting: 'itemCount' },
      onChange: (event) => emit({ ...current, itemCount: Number(event.target.value) }),
    });
  }

  function renderResourcePicker(activity) {
    const kind = RESOURCE_FOR_ACTIVITY[activity.id];
    if (!kind) return null;
    if (resourceState === 'loading') return h('div', { className: 'hanna-inline-status', role: 'status' }, 'Saját eszközök betöltése…');
    if (resourceState === 'error') return h('div', { className: 'hanna-inline-error', role: 'alert' },
      h('span', {}, resourceError), h('button', { type: 'button', className: 'hanna-link-button', onClick: loadResources }, 'Újrapróbálom'));
    if (resourceState === 'guest') return h('p', { className: 'hanna-field-help' }, `Belépés után saját ${RESOURCE_LABELS[kind]} is választható.`);
    const options = resources.filter((resource) => resource.kind === kind);
    const selected = current.resourceIds?.[0] || '';
    const supportsCurrentRound = (resource) => {
      if (resource.kind === 'palace') return resource.ready && (resource.data?.locations?.length || 0) >= current.itemCount;
      if (resource.kind === 'peg') return (resource.data?.entries?.length || 0) >= current.itemCount;
      if (resource.kind === 'major') return activity.id === 'numbers' ? (resource.data?.entries?.length || 0) >= Math.ceil(current.itemCount / 2) : true;
      if (activity.id === 'text') return !!resource.data?.text && (current.recallMode !== 'meaning' || !!resource.data?.rubric?.length);
      if (activity.id === 'association') return (resource.data?.items?.length || 0) >= current.itemCount * 2;
      if (['keyword', 'concept'].includes(activity.id)) return (resource.data?.items?.length || 0) >= current.itemCount && resource.data.items.every(item => item.meaning && item.keyword && normalizeText(item.meaning).toLocaleLowerCase('hu') !== normalizeText(item.label).toLocaleLowerCase('hu'));
      if (activity.id === 'chain') return (resource.data?.items?.length || 0) >= current.itemCount;
      return false;
    };
    return field(h, `Saját ${RESOURCE_LABELS[kind]}`, h('select', {
      value: selected, dataset: { setting: 'resourceIds' },
      onChange: (event) => {
        const resource = options.find((entry) => entry.id === event.target.value);
        const maximum = resource?.kind === 'peg' ? resource.data?.entries?.length : null;
        emit({ ...current, resourceIds: event.target.value ? [event.target.value] : [], ...(maximum ? { itemCount: Math.min(current.itemCount, maximum) } : {}), ...(resource?.kind === 'material' ? { contentLevel: 'material' } : !event.target.value ? {contentLevel:'concrete'} : {}) });
      },
    }, h('option', { value: '' }, 'Beépített gyakorlóanyag'), ...options.map((resource) => h('option', {
      value: resource.id, disabled: !supportsCurrentRound(resource),
    }, `${resource.title}${resource.kind === 'palace' && !resource.ready ? ' · útvonalteszt szükséges' : !supportsCurrentRound(resource) ? ' · ehhez a körhöz hiányos' : ''}`))),
    options.length ? 'A kiválasztott eszköz pillanatképe kerül a körbe.' : `Még nincs saját ${RESOURCE_LABELS[kind]}. A Saját eszközeim fülön készíthetsz.`);
  }

  function render() {
    const activity = ACTIVITY_BY_ID.get(current.activity) || HANNA_ACTIVITIES[0];
    const recallModes = activity.recallModes || [activity.defaultRecallMode || 'free'];
    const contentLevels = allowedHannaContentLevels(activity.id).filter(level=>level !== 'material' || current.contentLevel === 'material');
    const activitySelect = h('select', {
      value: current.activity, dataset: { setting: 'activity' },
      onChange: (event) => emit({
        hannaVersion: 1, activity: event.target.value, difficulty: current.difficulty,
        encodingMs: current.encodingMs, delayMs: current.delayMs, adaptive: current.adaptive,
      }),
    }, ...HANNA_ACTIVITIES.map((entry) => h('option', { value: entry.id }, entry.title)));
    const recallSelect = h('select', {
      value: current.recallMode, dataset: { setting: 'recallMode' },
      onChange: (event) => emit({ ...current, recallMode: event.target.value }),
    }, ...recallModes.map((mode) => h('option', { value: mode }, RECALL_LABELS[mode] || mode)));

    replaceContent(element,
      h('div', { className: 'hanna-settings-heading' },
        h('span', { className: 'hanna-kicker' }, compact ? 'HANNA FELADAT' : 'KÖR BEÁLLÍTÁSA'),
        h('strong', {}, activity.title),
        compact ? null : h('p', {}, activity.description),
      ),
      h('div', { className: 'hanna-settings-grid' },
        field(h, 'Tevékenység', activitySelect),
        field(h, 'Elemek száma', itemCountControl(activity), 'Csak a technikához érvényes tartomány választható.'),
        field(h, 'Tanulási idő', h('select', {
          value: current.encodingMs, dataset: { setting: 'encodingMs' },
          onChange: (event) => emit({ ...current, encodingMs: Number(event.target.value) }),
        }, h('option', { value: 0 }, 'Saját tempó'), h('option', { value: 30000 }, '30 másodperc'), h('option', { value: 60000 }, '1 perc'), h('option', { value: 120000 }, '2 perc'))),
        field(h, 'Köztes idő (másodperc)', h('input',{type:'number',min:10,max:60,step:1,value:current.delayMs/1000,onChange:event=>emit({...current,delayMs:Number(event.target.value)*1000})}), 'Ennyi ideig tart a köztes feladat a felidézés előtt.'),
        field(h, 'Felidézés', recallSelect),
        contentLevels.length > 1 ? field(h, 'Tartalmi szint', h('select', {
          value: current.contentLevel, dataset: { setting: 'contentLevel' },
          onChange: (event) => emit({ ...current, contentLevel: event.target.value }),
        }, ...contentLevels.map(level=>h('option',{value:level},({concrete:'Beépített alapanyag',mixed:'Vegyes',abstract:'Absztrakt',material:'Saját tananyag'})[level])))) : null,
      ),
      h('div', { className: 'hanna-setting-toggles' },
        recallModes.includes('reverse') ? h('label', { className: 'hanna-check' }, h('input', {
          type: 'checkbox', checked: bool(current.reverse), dataset: { setting: 'reverse' },
          onChange: (event) => emit({ ...current, reverse: event.target.checked }),
        }), h('span', {}, 'Visszafelé is kérdezzen')) : null,
        h('label', { className: 'hanna-check' }, h('input', {
          type: 'checkbox', checked: bool(current.adaptive), dataset: { setting: 'adaptive' },
          onChange: (event) => emit({ ...current, adaptive: event.target.checked }),
        }), h('span', {}, 'Következő kör igazítása az eredményhez')),
      ),
      renderResourcePicker(activity),
      h('p', { className: 'hanna-validation', role: 'alert', dataset: { hannaValidation: 'true' } }),
      h('p', { className: 'hanna-settings-summary' }, describeHannaSettings(current)),
    );
  }

  render();
  if (school?.user) loadResources();
  return {
    element,
    getValue: () => {
      const result = { ...current, resourceIds: [...(current.resourceIds || [])] };
      if (school?.user?.role === 'teacher' && result.resourceIds.length) {
        const selected = resources.find((resource) => resource.id === result.resourceIds[0]);
        if (selected) result.resourceSnapshot = [selected];
      }
      return result;
    },
    setValue(raw) { generation++; current = normalizeHannaSettings(raw || {}); render(); },
    dispose() { generation++; },
  };
}

function resultValue(value) {
  if (Array.isArray(value)) return value.join(' → ');
  return normalizeText(value) || '—';
}
function practicalFeedback(detail) {
  if (detail?.feedback) return detail.feedback;
  if (detail?.correct) return '';
  return 'Ez a válasz ebben a körben eltért a céltól. Nézd át ezt az egy kapcsolatot, majd próbáld meg ismét segítség nélkül felidézni.';
}

export function renderHannaResult(h, result = {}) {
  const metrics = result.metrics || {};
  const details = Array.isArray(result.details) ? result.details : [];
  const percent = Number.isFinite(Number(result.percent)) ? Number(result.percent) : null;
  const stats = [
    ['Pontosság', percent == null ? '—' : `${percent}%`],
    ['Önálló helyes', metrics.independentCorrect ?? '—'],
    ['Segítséggel helyes', metrics.assistedCorrect ?? '—'],
    ['Helyes válasz mediánja', metrics.medianCorrectRtMs == null ? '—' : formatResponseTime(metrics.medianCorrectRtMs)],
    ['Tanulási idő', metrics.encodingDurationMs == null ? '—' : formatSeconds(metrics.encodingDurationMs)],
    ['Megtartási idő', metrics.retentionMs == null ? '—' : formatHannaRetention(metrics.retentionMs)],
  ];
  for(const [key,label] of [['textImmediate','Első felidézés'],['textDelayed','Javítás utáni felidézés']]){const score=metrics.subscales?.[key];if(score)stats.push([label,`${score.correct}/${score.total} · ${Math.round(score.accuracy*100)}%`]);}
  return h('section', { className: 'hanna-result' },
    h('div', { className: 'hanna-result-lead' },
      h('span', { className: 'hanna-kicker' }, metrics.technique || 'HANNA MÓDSZER'),
      h('div', { className: 'hanna-result-score', style: { '--hanna-score': `${Math.max(0, Math.min(100, percent || 0))}%` } },
        h('strong', {}, percent == null ? '—' : percent), percent == null ? null : h('span', {}, '%')),
      h('h2', {}, result.summary || 'A kör elkészült.'),
      h('p', {}, 'A visszajelzés a most megfigyelt válaszokra vonatkozik, nem minősít képességet.'),
    ),
    h('dl', { className: 'hanna-result-stats' }, ...stats.flatMap(([label, value]) => [h('div', {}, h('dt', {}, label), h('dd', {}, String(value)))])),
    metrics.orderAccuracy == null ? null : h('p', { className: 'hanna-order-note' }, `Sorrendpontosság: ${Math.round(metrics.orderAccuracy * 100)}%`),
    details.length ? h('details', { className: 'hanna-result-details' },
      h('summary', {}, `Megfigyelt válaszok (${details.length})`),
      h('ol', {}, ...details.map((detail) => h('li', { className: detail.correct ? 'is-correct' : 'is-missed' },
        h('div', {}, h('strong', {}, detail.label || 'Feladat'), h('span', {}, detail.correct ? 'helyes' : 'javítható')),
        h('p', {}, `Válaszod: ${resultValue(detail.actual)} · Cél: ${resultValue(detail.expected)}`),
        practicalFeedback(detail) ? h('p', { className: 'hanna-practical-feedback' }, practicalFeedback(detail)) : null,
      )))) : h('p', { className: 'hanna-empty-inline' }, 'Ehhez a körhöz nincs tételes válaszrészlet.'),
    metrics.adaptation?.reason ? h('aside', { className: 'hanna-next-step' },
      h('strong', {}, 'Következő lépés'), h('p', {}, metrics.adaptation.reason),
    ) : null,
  );
}

function roomPoint(index, count) {
  const path = [
    [92, 310], [150, 236], [230, 180], [335, 142], [456, 132], [578, 146], [682, 190], [756, 258],
    [705, 335], [606, 364], [505, 350], [406, 330], [300, 342], [206, 374], [120, 360],
    [184, 294], [276, 252], [382, 228], [486, 234], [592, 268], [650, 316], [554, 307],
    [458, 285], [355, 286], [270, 306], [348, 376], [456, 390], [566, 396], [678, 392], [772, 365],
  ];
  if (count <= 15) {
    const stride = Math.max(1, Math.floor(path.length / count));
    return path[Math.min(path.length - 1, index * stride)];
  }
  return path[index % path.length];
}

function renderRoom(h, items, activeId = null, onSelect = null) {
  const shown = items.slice(0, 30);
  const points = shown.map((_, index) => roomPoint(index, shown.length));
  const pathData = points.map(([x, y], index) => `${index ? 'L' : 'M'} ${x} ${y}`).join(' ');
  return h('div', { className: 'hanna-room-wrap' },
    h('svg', { className: 'hanna-room', viewBox: '0 0 860 460', role: 'img', 'aria-label': 'Bejárható memóriaszoba állomásokkal' },
      h('defs', {},
        h('linearGradient', { id: 'hanna-wall', x1: '0', y1: '0', x2: '1', y2: '1' },
          h('stop', { offset: '0%', 'stop-color': '#fffaf0' }), h('stop', { offset: '100%', 'stop-color': '#eee7fa' })),
        h('linearGradient', { id: 'hanna-floor', x1: '0', y1: '0', x2: '0', y2: '1' },
          h('stop', { offset: '0%', 'stop-color': '#e5d9c9' }), h('stop', { offset: '100%', 'stop-color': '#cbb9a4' })),
      ),
      h('path', { d: 'M24 28 H836 V296 L742 438 H116 L24 296 Z', fill: 'url(#hanna-wall)', stroke: '#4b315f', 'stroke-width': '4' }),
      h('path', { d: 'M24 296 H836 L742 438 H116 Z', fill: 'url(#hanna-floor)', stroke: '#8c745c', 'stroke-width': '3' }),
      h('path', { d: 'M70 70 H292 V248 H70 Z', fill: '#bfe2ea', stroke: '#5c7890', 'stroke-width': '7' }),
      h('path', { d: 'M181 70 V248 M70 159 H292', stroke: '#fdfaf4', 'stroke-width': '7' }),
      h('path', { d: 'M652 78 H788 V280 H652 Z', fill: '#6f4d7f', stroke: '#4b315f', 'stroke-width': '7' }),
      h('circle', { cx: '760', cy: '180', r: '8', fill: '#dfff67' }),
      h('path', { d: 'M328 104 Q430 28 532 104 V210 H328 Z', fill: '#fffdf8', stroke: '#806692', 'stroke-width': '5' }),
      h('path', { d: 'M112 324 Q176 274 240 324 V392 H112 Z M556 330 H714 V395 H556 Z', fill: '#cbb4d8', stroke: '#654b76', 'stroke-width': '5' }),
      h('path', { d: pathData, fill: 'none', stroke: '#8cab32', 'stroke-width': '9', 'stroke-linecap': 'round', 'stroke-dasharray': '2 18', opacity: '.8' }),
      ...shown.map((item, index) => {
        const [x, y] = points[index];
        const active = item.id === activeId;
        return h('g', { className: active ? 'hanna-room-stop is-active' : 'hanna-room-stop', transform: `translate(${x} ${y})` },
          h('circle', { r: active ? '28' : '22', fill: active ? '#4d2c61' : '#fffdf8', stroke: active ? '#dfff67' : '#745888', 'stroke-width': active ? '6' : '4' }),
          h('text', { x: '0', y: '6', 'text-anchor': 'middle', fill: active ? '#fff' : '#4d2c61', 'font-size': '16', 'font-weight': '800' }, String(index + 1)),
        );
      }),
    ),
    h('ol', { className: 'hanna-room-legend', 'aria-label': 'Útvonal állomásai' }, ...shown.map((item, index) => h('li', {},
      h('button', {
        type: 'button', className: item.id === activeId ? 'is-active' : '', onClick: () => onSelect?.(item.id),
        'aria-current': item.id === activeId ? 'step' : null,
      }, h('span', {}, String(index + 1)), item.image ? itemVisual(h, item, 'hanna-room-photo') : null, h('b', {}, item.label)),
    ))),
  );
}

function createAnswerSnapshot({ startedAt, events, encoding, responses, training, encodingDurationMs, delayDurationMs, strategy }) {
  return {
    version: 1,
    startedAt,
    completedAt: new Date().toISOString(),
    events: events.map((event) => ({ ...event })),
    encoding: encoding.map((entry) => ({ ...entry, checks: [...(entry.checks || [])] })),
    responses: responses.map((response) => ({ ...response, value: Array.isArray(response.value) ? [...response.value] : response.value })),
    ...(strategy ? { strategy } : {}),
    ...(training.length ? { training: training.map(({ trialId, value, rtMs }) => ({ trialId, value, rtMs })) } : {}),
    encodingDurationMs: Math.max(0, Math.round(encodingDurationMs)),
    delayDurationMs: Math.max(0, Math.round(delayDurationMs)),
  };
}

export const hannaGames = {
  'hanna-method': {
    mount(ctx) {
      loadCssOnce();
      const { h, root } = ctx;
      let settings;
      try { settings = normalizeHannaSettings(ctx.settings || {}); }
      catch (error) {
        ctx.phase?.('Nem indítható', 'Ellenőrizd a Hanna-beállításokat.');
        root.replaceChildren(h('section', { className: 'hanna-game-error', role: 'alert' }, h('h3', {}, 'A kör nem indítható'), h('p', {}, error?.message || 'Érvénytelen beállítás.')));
        return () => root.replaceChildren();
      }

      let plan;
      try { plan = generateHannaSession(settings, Number(ctx.seed) >>> 0, settings.resourceSnapshot || []); }
      catch (error) {
        ctx.phase?.('Nem indítható', 'A tartalom előkészítése sikertelen.');
        root.replaceChildren(h('section', { className: 'hanna-game-error', role: 'alert' },
          h('h3', {}, settings.activity === 'review' ? 'Nincs elindítható ismétlés' : 'A kör tartalma nem készíthető el'),
          h('p', {}, error?.message || 'Ellenőrizd a saját eszközt és próbáld újra.'),
          h('p', { className: 'hanna-field-help' }, 'A beállítások képernyőjén válassz használható erőforrást, majd indíts új kört.')));
        let gone = false;
        return () => { if (gone) return; gone = true; root.replaceChildren(); };
      }

      const activity = ACTIVITY_BY_ID.get(plan.activity || settings.activity) || ACTIVITY_BY_ID.get(settings.activity) || HANNA_ACTIVITIES[0];
      const contentById = new Map((plan.content || []).map((item) => [item.id, item]));
      let disposed = false;
      let generation = 0;
      let finished = false;
      let phase = 'intro';
      let beforePause = null;
      let timer = null;
      let eventCounter = 0;
      let events = [];
      let encoding = [];
      let responses = [];
      let trainingAnswers = [];
      let trainingIndex = 0;
      let encodingIndex = 0;
      let recallIndex = 0;
      let recallQueue = [];
      let currentTrainingOnset = 0;
      let currentTrialOnset = 0;
      let runStarted = 0;
      let currentHintLevel = 0;
      let encodingStarted = 0;
      let startedAt = new Date().toISOString();
      let pauseStarted = 0;
      let encodingDurationMs = 0;
      let warmupActiveMs = 0;
      let warmupTickAt = 0;
      let delayActiveMs = 0;
      let delayTickAt = 0;
      let availableAt = null;
      let preparePending = false;
      let prepareFailure = null;
      let strategy = '';
      let strategySelections = {};
      const encodingHints = new Map();
      let distractor = null;
      let distractorCount = 0;

      function addEvent(type, value = undefined, trialId = undefined) {
        const event = { eventId: eventId(++eventCounter), type, atMs: Math.max(0, Math.round(clockNow() - runStarted)) };
        if (trialId) event.trialId = trialId;
        if (value !== undefined) event.value = value;
        events.push(event);
      }
      function cancelTimer() { if (timer != null) { clearTimeout(timer); timer = null; } }
      function schedule(fn, ms) {
        cancelTimer();
        const ownGeneration = generation;
        timer = setTimeout(() => { timer = null; if (!disposed && ownGeneration === generation && phase !== 'paused') fn(); }, ms);
      }
      function focusFirst() {
        const target = root.querySelector?.('input:not([disabled]), textarea:not([disabled]), button:not([disabled])');
        try { target?.focus?.({ preventScroll: true }); } catch { target?.focus?.(); }
      }
      function setPhase(title, detail) { if (!disposed) ctx.phase?.(title, detail); }
      let lastVisualStep=null;
      function shell(title, subtitle, body, actions = [], options = {}) {
        if (disposed) return;
        const progress = options.progress == null ? null : Math.max(0, Math.min(1, options.progress));
        root.replaceChildren(h('section', { className: `hanna-play hanna-phase-${phase}`, dataset: { phase } },
          h('div', { className: 'hanna-game-toolbar' },
            h('span', { className: 'hanna-game-technique' }, activity.icon || '✦', ' ', activity.technique),
            h('div', { className: 'hanna-game-controls' },
              !['intro', 'done', 'error'].includes(phase) ? h('button', { type: 'button', className: 'hanna-tool-button', onClick: () => pause('kézi szünet') }, 'Szünet') : null,
              !['intro', 'done'].includes(phase) ? h('button', { type: 'button', className: 'hanna-link-button', onClick: restart }, 'Újrakezdés') : null,
            ),
          ),
          progress == null ? null : h('div', { className: 'hanna-play-progress', 'aria-label': `${Math.round(progress * 100)} százalék` }, h('span', { style: { width: `${progress * 100}%` } })),
          h('header', { className: 'hanna-phase-heading' }, h('span', { className: 'hanna-kicker' }, title), h('h2', {}, subtitle)),
          h('div', { className: 'hanna-stage' }, body),
          actions.length ? h('div', { className: 'hanna-game-actions' }, ...actions) : null,
        ));
        const visualStep=`${phase}:${trainingIndex}:${encodingIndex}:${recallIndex}`;
        if(lastVisualStep!==visualStep){root.scrollIntoView?.({block:'start',behavior:'instant'});lastVisualStep=visualStep;}
        focusFirst();
      }

      function resetData() {
        generation++;
        cancelTimer();
        finished = false; beforePause = null; phase = 'intro';
        events = []; encoding = []; responses = []; trainingAnswers = [];
        trainingIndex = 0; encodingIndex = 0; recallIndex = 0; recallQueue = []; currentTrainingOnset = 0;
        currentHintLevel = 0; runStarted = clockNow(); encodingStarted = runStarted; startedAt = new Date().toISOString(); pauseStarted = 0; encodingDurationMs = 0;
        delayActiveMs = 0; warmupActiveMs = 0; warmupTickAt = 0; availableAt = null; preparePending = false; prepareFailure = null; distractorCount = 0;
        strategy = ''; strategySelections = {}; encodingHints.clear();
      }

      function restart() {
        if (disposed || finished) return;
        const previousPhase=phase;
        resetData();
        addEvent('restart', previousPhase);
        renderIntro('Az előző, be nem fejezett próbát eldobtuk.');
      }

      function pause(reason) {
        if (disposed || finished || ['intro', 'paused', 'error'].includes(phase)) return;
        if (phase === 'distractor') {
          delayActiveMs += Math.max(0, clockNow() - delayTickAt);
          delayTickAt = clockNow();
        }
        if (phase === 'encoding' && plan.encodingSteps?.[encodingIndex]?.id === 'association-warmup' && warmupTickAt) {
          warmupActiveMs += Math.max(0, clockNow() - warmupTickAt); warmupTickAt = clockNow();
        }
        beforePause = phase; pauseStarted = clockNow(); phase = 'paused'; cancelTimer(); addEvent('pause', reason);
        setPhase('Szünet', 'A feladat és a helyi időmérés áll.');
        root.querySelector?.('.hanna-play')?.setAttribute('inert','');
        root.append(h('div', { className: 'hanna-pause-overlay', role: 'dialog', 'aria-modal': 'true' },
          h('div', {}, h('span', { className: 'hanna-pause-mark', 'aria-hidden': 'true' }, 'Ⅱ'), h('h2', {}, 'Tarts egy valódi szünetet'),
            h('p', {}, 'A visszatérés nem pörgeti át az elmaradt lépéseket.'),
            h('button', { type: 'button', className: 'primary-button', onClick: resume }, 'Folytatás'))));
        root.querySelector?.('.hanna-pause-overlay button')?.focus?.();
      }

      function resume() {
        if (disposed || phase !== 'paused') return;
        root.querySelector?.('.hanna-play')?.removeAttribute?.('inert');
        const target = beforePause || 'intro'; beforePause = null; phase = target;
        const pausedFor = Math.max(0, clockNow() - pauseStarted);
        runStarted += pausedFor;
        encodingStarted += pausedFor;
        if (target === 'training') currentTrainingOnset += pausedFor;
        if (target === 'recall') currentTrialOnset += pausedFor;
        pauseStarted = 0;
        addEvent('resume', target);
        if (target === 'distractor') {
          delayTickAt = clockNow();
          if (prepareFailure) showPrepareError(prepareFailure); else renderDistractor();
        }
        else if (target === 'training') {
          root.querySelector?.('.hanna-pause-overlay')?.remove?.();
          const trial = plan.training?.trials?.[trainingIndex];
          setPhase('Betanítás', trial ? `${trainingIndex + 1}/${plan.training.trials.length} · útvonal vagy horgok` : 'A betanítás eredménye');
        }
        else if (target === 'encoding') {
          root.querySelector?.('.hanna-pause-overlay')?.remove?.();
          const step = plan.encodingSteps?.[encodingIndex];
          setPhase('Kódolás', step ? `${encodingIndex + 1}/${plan.encodingSteps.length} · ${step.title}` : 'Kódolás kész');
          if (step?.id === 'association-warmup' && warmupActiveMs < 30000) {
            warmupTickAt = clockNow(); schedule(tickAssociationWarmup, 250);
          } else if (settings.encodingMs > 0 && step) {
            const remaining = Math.max(0, settings.encodingMs - (clockNow() - encodingStarted));
            schedule(() => { storeEncoding(step); finishEncoding(); }, remaining);
          }
        }
        else if (target === 'recall') {
          root.querySelector?.('.hanna-pause-overlay')?.remove?.();
          const trial = recallQueue[recallIndex];
          setPhase(trial?.phase === 'immediate' ? 'Azonnali felidézés' : 'Felidézés', `${recallIndex + 1}/${recallQueue.length}`);
        }
        else if(target==='training-study'||target==='text-correction'){root.querySelector?.('.hanna-pause-overlay')?.remove?.();}
        else renderIntro();
      }

      function renderIntro(message = '') {
        phase = 'intro'; cancelTimer();
        setPhase('Hanna Módszer', `${activity.title} · saját tempójú tanulás`);
        const training = plan.training;
        shell('TECHNIKAINDÍTÓ', activity.title,
          h('div', { className: 'hanna-intro-layout' },
            h('div', { className: 'hanna-intro-copy' },
              h('span', { className: 'hanna-technique-pill' }, activity.icon || '✦', ' ', activity.technique),
              h('p', { className: 'hanna-intro-description' }, activity.description),
              h('div', { className: 'hanna-teaching-card' }, h('strong', {}, 'Mit próbálunk ki?'), h('p', {}, activity.instruction)),
              h('ol', { className: 'hanna-flow-list' },
                training ? h('li', {}, h('span', {}, '1'), h('div', {}, h('strong', {}, 'Betanítás'), h('p', {}, 'A technika alapja előbb biztos legyen. Ez még nem mentett eredmény.'))) : null,
                h('li', {}, h('span', {}, training ? '2' : '1'), h('div', {}, h('strong', {}, activity.id==='review'?'Korábbi tanulás':'Kódolás'), h('p', {}, activity.id==='review'?'A korábban eltárolt anyagot kérdezzük vissza. Most nem mutatjuk meg újra.':'Saját kapcsolatot készítesz; a segítség csak támpont.'))),
                h('li', {}, h('span', {}, training ? '3' : '2'), h('div', {}, h('strong', {}, 'Köztes feladat'), h('p', {}, 'A teljes késleltetés alatt páros számfeladat tartja külön a figyelmet.'))),
                h('li', {}, h('span', {}, training ? '4' : '3'), h('div', {}, h('strong', {}, 'Felidézés'), h('p', {}, 'Pontosság, idő és segítség külön marad.'))),
              ),
              message ? h('p', { className: 'hanna-status-note', role: 'status' }, message) : null,
            ),
            ['loci', 'palace'].includes(activity.id)
              ? renderRoom(h, (plan.training?.items || plan.content || []).map((item, index) => ({ ...item, label: item.label || item.location || `${index + 1}. állomás` })))
              : h('div', { className: `hanna-intro-art hanna-art-${activity.id}`, 'aria-hidden': 'true' },
                  h('span', {}, activity.icon || '✦'), h('span', {}, '↝'), h('span', {}, (plan.content?.[0]?.image || '◈'))),
          ),
          [h('button', { type: 'button', className: 'primary-button hanna-wide-button', onClick: begin }, training ? 'Betanítás indítása' : 'Tanulás indítása')]);
      }

      function begin() {
        if (disposed || phase !== 'intro') return;
        const restarts=events.filter(event=>event.type==='restart');resetData();events=restarts; runStarted = clockNow(); encodingStarted = runStarted; startedAt = new Date().toISOString();
        addEvent('phase', plan.training ? 'training' : 'encoding');
        if (plan.training?.trials?.length) { phase = 'training-study'; renderTrainingStudy(); }
        else { phase = 'encoding'; renderEncoding(); }
      }

      function renderTrainingStudy() {
        const training=plan.training;
        setPhase('Alapozás','Először tanuld meg a támpontokat.');
        shell('MEGTANULOM AZ ALAPOKAT',training.kind==='route'?'Ismerd meg az útvonalat':training.kind==='peg'?'Tanuld meg a szám–kép horgokat':'Tanuld meg a magyar hangkódot',
          h('div',{},h('p',{},'Nézd végig nyugodtan. A következő képernyőn ez a lista eltűnik.'),
            training.kind==='route'?renderRoom(h,training.items):null,
            h('ol',{className:'hanna-training-reference'},training.items.map((item,index)=>h('li',{},h('strong',{},`${item.number??index+1}. ${item.label}`),item.description?h('span',{},item.description):null)))),
          [h('button',{type:'button',className:'primary-button',onClick:()=>{phase='training';trainingAnswers=[];trainingIndex=0;renderTraining();}},'Betanító próba indítása')]);
      }

      function trainingThresholdMet() {
        const threshold = plan.training?.threshold || { accuracy: 0 };
        const trials = plan.training?.trials || [];
        const correct = trainingAnswers.filter((answer) => answer.correct).length;
        const accuracy = trials.length ? correct / trials.length : 1;
        const correctTimes = trainingAnswers.filter((answer) => answer.correct).map((answer) => answer.rtMs);
        const rt = median(correctTimes);
        return { accuracy, rt, pass: accuracy >= Number(threshold.accuracy || 0) && (threshold.medianRtMs == null || (rt != null && rt < threshold.medianRtMs)) };
      }

      function renderTraining() {
        if (disposed || phase !== 'training') return;
        const training = plan.training;
        const trials = training?.trials || [];
        if (trainingIndex >= trials.length) {
          const outcome = trainingThresholdMet();
          const targetAccuracy = Math.round(Number(training.threshold?.accuracy || 0) * 100);
          const targetSpeed = training.threshold?.medianRtMs;
          shell('BETANÍTÁS KÉSZ', outcome.pass ? 'Biztos alap – jöhet a kódolás' : 'Még egy rövid kör kell',
            h('div', { className: outcome.pass ? 'hanna-training-result is-ready' : 'hanna-training-result' },
              h('div', {}, h('strong', {}, `${Math.round(outcome.accuracy * 100)}%`), h('span', {}, `cél: ${targetAccuracy}%`)),
              targetSpeed == null ? null : h('div', {}, h('strong', {}, outcome.rt == null ? '—' : `${(outcome.rt / 1000).toFixed(2)} mp`), h('span', {}, `cél: ${(targetSpeed / 1000).toFixed(1)} mp alatt`)),
              h('p', {}, outcome.pass ? 'A betanítás nem került eredményként mentésre.' : 'Gyakorold újra ugyanazokat a stabil horgokat; a kódolás csak a küszöb után nyílik meg.'),
            ),
            [h('button', { type: 'button', className: 'primary-button', onClick: () => {
              if (outcome.pass) { phase = 'encoding'; encodingStarted = clockNow(); addEvent('phase', 'encoding'); renderEncoding(); }
              else { trainingAnswers = []; trainingIndex = 0; phase='training-study'; renderTrainingStudy(); }
            } }, outcome.pass ? 'Tovább a kódoláshoz' : 'Betanítás újra')]);
          return;
        }
        const trial = trials[trainingIndex];
        currentTrainingOnset = clockNow();
        const choices = Array.isArray(trial.choices) ? trial.choices : [];
        const body = h('div', { className: 'hanna-training-card' },
          null,
          h('p', { className: 'hanna-training-prompt' }, trial.prompt),
          h('div', { className: 'hanna-choice-grid' }, ...choices.map((choice) => h('button', {
            type: 'button', className: 'hanna-choice', onClick: () => {
              if (phase !== 'training') return;
              if (trainingAnswers.some((answer) => answer.trialId === trial.id)) return;
              const value = String(choice.value);
              trainingAnswers.push({ trialId: trial.id, value, rtMs: Math.max(0, Math.round(clockNow() - currentTrainingOnset)), correct: value === String(trial.expected) });
              trainingIndex++;
              if(value!==String(trial.expected)) {
                const right=choices.find(choice=>String(choice.value)===String(trial.expected));
                shell('JAVÍTÓ VISSZAJELZÉS','Rögzítsd a helyes kapcsolatot',h('div',{className:'hanna-training-result'},h('p',{},trial.prompt),h('strong',{},right?.label||String(trial.expected)),h('p',{},'Nézd meg a helyes párt. A következő próbában ismét felidézheted.')),[h('button',{type:'button',className:'primary-button',onClick:renderTraining},'Értem, tovább')]);
              } else renderTraining();
            },
          }, choice.image ? itemVisual(h, choice) : null, h('strong', {}, choice.label)))),
        );
        setPhase('Betanítás', `${trainingIndex + 1}/${trials.length} · ${training.kind === 'major' ? 'szám–hang' : training.kind === 'peg' ? 'szám–kép' : 'útvonal'}`);
        shell('NEM PONTOZOTT ALAPOZÁS', trial.prompt, body, [], { progress: trainingIndex / Math.max(1, trials.length) });
      }

      function encodingCard(step, item, index) {
        const previous=encoding.find(entry=>entry.itemId===(step.itemIds?.[0]||step.id));
        const association = h('textarea', { value:previous?.association||'', maxlength: 500, rows: 3, placeholder: 'Írd le röviden a saját képedet vagy kapcsolatodat…', dataset: { association: step.id } });
        const checks = (step.checks || []).map((check) => h('label', { className: 'hanna-check hanna-technique-check' }, h('input', { type: 'checkbox', value: check, checked:previous?.checks?.includes(check)||false }), h('span', {}, check)));
        const linkedItems = (step.itemIds || []).map((id) => contentById.get(id)).filter(Boolean);
        const core = step.kind === 'route'
          ? h('div',{},renderRoom(h, (plan.training?.items || linkedItems).map((entry, position) => ({ ...entry, label: entry.label || entry.location || `${position + 1}. állomás` })), step.itemIds?.[0] || null),step.location?h('div',{className:'hanna-encoding-visual'},linkedItems.map(entry=>h('article',{className:'hanna-memory-item'},itemVisual(h,entry),h('strong',{},entry.label)))):null)
          : h('div', { className: `hanna-encoding-visual is-${step.kind}` }, ...linkedItems.map((entry, itemIndex) => h('article', { className: 'hanna-memory-item' },
              itemVisual(h, entry), h('strong', {}, entry.label),
              entry.meaning ? h('p', {}, entry.meaning) : null,
              entry.keyword ? h('span', {}, `${entry.kind==='concept'?'Vizuális ötlet':'Hangzáskulcs'}: ${entry.keyword}`) : null,
              entry.peg != null ? h('span', {}, `#${entry.peg}`) : null,
              entry.code ? h('span', {}, entry.code) : null,
              itemIndex < linkedItems.length - 1 ? h('i', { 'aria-hidden': 'true' }, '↝') : null,
            )));
        const strategyPicker = activity.id === 'boss' ? field(h, 'Ehhez a részhez választott technika', h('select', {
          value: strategySelections[step.id] || '', dataset: { strategy: step.id },
          onChange: (event) => {
            strategySelections[step.id] = event.target.value;
            strategy = Object.entries(strategySelections).map(([id, value]) => `${id}:${value}`).join('; ');
          },
        }, h('option', { value: '' }, 'Válassz tudatosan…'),
        h('option', { value: 'láncsztori' }, 'Láncsztori'), h('option', { value: 'memóriaútvonal' }, 'Memóriaútvonal'),
        h('option', { value: 'peg-horgok' }, 'Peg-horgok'), h('option', { value: 'major-kód' }, 'Major-kód'), h('option', { value: 'kulcsszóhíd' }, 'Kulcsszóhíd'))) : null;
        return h('div', { className: 'hanna-encoding-card' },
          h('div', { className: 'hanna-step-number' }, String(index + 1)),
          h('h3', {}, step.title), h('p', { className: 'hanna-step-prompt' }, step.prompt), core,
          step.location ? h('p', { className: 'hanna-location-ribbon' }, `Hely: ${step.location}`) : null,
          step.example ? h('details', { className: 'hanna-example', onToggle: (event) => {
            if (event.target.open) encodingHints.set(step.id, Math.max(1, encodingHints.get(step.id) || 0));
          } }, h('summary', {}, 'Kidolgozott segítség'), h('p', {}, step.example)) : null,
          strategyPicker,
          h('div', { className: 'hanna-own-link' }, h('label', {}, h('strong', {}, 'Saját kapcsolatod'), association), checks.length ? h('div', { className: 'hanna-check-list' }, ...checks) : null),
          h('p', { className: 'hanna-validation', role: 'alert', dataset: { encodingValidation: 'true' } }),
        );
      }

      function storeEncoding(step) {
        if (!step.itemIds?.length) return;
        const area = root.querySelector?.(`[data-association="${step.id}"]`);
        const checkInputs = root.querySelectorAll?.('.hanna-technique-check input') || [];
        const previous = encoding.findIndex((entry) => entry.itemId === (step.itemIds?.[0] || step.id));
        const entry = {
          itemId: step.itemIds?.[0] || step.id,
          checks: [...checkInputs].filter((input) => input.checked).map((input) => String(input.value)).slice(0, 12),
          hintLevel: encodingHints.get(step.id) || 0,
        };
        const association = normalizeText(area?.value).slice(0, 500);
        if (association) entry.association = association;
        if (previous >= 0) encoding[previous] = entry; else encoding.push(entry);
      }

      function renderEncoding() {
        if (disposed || phase !== 'encoding') return;
        cancelTimer();
        const steps = plan.encodingSteps || [];
        if (!steps.length || encodingIndex >= steps.length) { finishEncoding(); return; }
        const step = steps[encodingIndex];
        setPhase('Kódolás', `${encodingIndex + 1}/${steps.length} · ${step.title}`);
        const warmup = step.id === 'association-warmup';
        if (warmup && !warmupTickAt) warmupTickAt = clockNow();
        const nextButton = h('button', { type: 'button', className: 'primary-button', disabled: warmup && warmupActiveMs < 30000, onClick: (event) => {
          if(phase!=='encoding')return;
          if (activity.id === 'boss' && !strategySelections[step.id]) {
            const validation = root.querySelector?.('[data-encoding-validation="true"]');
            if (validation) validation.textContent = 'A vegyes kihívás minden részéhez válassz technikát.';
            return;
          }
          event.currentTarget.disabled = true; storeEncoding(step); encodingIndex++; renderEncoding();
        } }, encodingIndex === steps.length - 1 ? 'Kódolás kész' : 'Következő kapcsolat');
        const card = encodingCard(step, contentById.get(step.itemIds?.[0]), encodingIndex);
        if (warmup) card.append(h('p', { className: 'hanna-warmup-timer', role: 'timer', dataset: { warmupTimer: 'true' } }, `Ötletbemelegítés: ${formatSeconds(Math.max(0, 30000 - warmupActiveMs))}`));
        shell('SAJÁT KAPCSOLAT ÉPÍTÉSE', step.title, card,
          [encodingIndex ? h('button', { type: 'button', className: 'secondary-button', onClick: (event) => { if(phase!=='encoding')return; event.currentTarget.disabled = true; storeEncoding(step); encodingIndex--; renderEncoding(); } }, 'Előző') : null,
            nextButton],
          { progress: encodingIndex / Math.max(1, steps.length) });
        if (warmup && warmupActiveMs < 30000) schedule(tickAssociationWarmup, 250);
        else if (settings.encodingMs > 0) {
          const remaining = Math.max(0, settings.encodingMs - (clockNow() - encodingStarted));
          if (remaining === 0) schedule(() => { storeEncoding(step); finishEncoding(); }, 0);
          else schedule(() => { storeEncoding(step); finishEncoding(); }, remaining);
        }
      }

      function tickAssociationWarmup() {
        const step = plan.encodingSteps?.[encodingIndex];
        if (disposed || phase !== 'encoding' || step?.id !== 'association-warmup') return;
        warmupActiveMs += Math.max(0, clockNow() - warmupTickAt); warmupTickAt = clockNow();
        const left = Math.max(0, 30000 - warmupActiveMs);
        const label = root.querySelector?.('[data-warmup-timer="true"]');
        if (label) label.textContent = left ? `Ötletbemelegítés: ${formatSeconds(left)}` : 'A 30 másodperces bemelegítés kész.';
        const next = buttonByText(root, 'Következő kapcsolat');
        if (next) next.disabled = left > 0;
        if (left > 0) schedule(tickAssociationWarmup, 250);
      }

      function finishEncoding() {
        cancelTimer();
        encodingDurationMs = Math.max(0, clockNow() - encodingStarted);
        const immediate = (plan.recallTrials || []).filter((trial) => trial.phase === 'immediate');
        const later = (plan.recallTrials || []).filter((trial) => trial.phase !== 'immediate');
        if (immediate.length) {
          recallQueue = immediate; recallIndex = 0; phase = 'recall'; addEvent('phase', 'immediate');
          renderRecall(() => settings.activity==='text'?renderTextCorrection(later):startDistractor(later));
        } else startDistractor(later.length ? later : (plan.recallTrials || []));
      }

      function renderTextCorrection(later) {
        phase='text-correction';addEvent('phase','text-correction');
        setPhase('Visszanézés','Erősítsd meg a kimaradt részeket.');
        const original=plan.encodingSteps.find(step=>step.kind==='text')?.prompt||'';
        const first=responses.find(response=>plan.recallTrials.find(trial=>trial.id===response.trialId)?.phase==='immediate');
        shell('AZ ELSŐ FELIDÉZÉS UTÁN','Olvasd össze, és próbáld újra',h('div',{className:'hanna-text-comparison'},
          h('article',{},h('h3',{},'Ezt idézted fel'),h('p',{},first?.value||'Ezt a választ kihagytad.')),
          h('article',{},h('h3',{},'A tanult szöveg'),h('p',{},original)),
          h('p',{},'Keresd meg a kimaradt gondolatokat. A köztes feladat után újra önállóan idézed fel a szöveget.')),
          [h('button',{type:'button',className:'primary-button',onClick:()=>startDistractor(later)},'Átnéztem, jöhet a köztes feladat')]);
      }

      function answerForPreparation() {
        return createAnswerSnapshot({ startedAt, events, encoding, responses, training: trainingAnswers, encodingDurationMs, delayDurationMs: delayActiveMs, strategy });
      }

      function newDistractor() {
        const base = ((Number(ctx.seed) >>> 0) + distractorCount * 17 + 11) % 70 + 12;
        const other = (distractorCount * 9 + 7) % 38 + 3;
        const operation = distractorCount % 2 ? '−' : '+';
        const left=operation==='−'?Math.max(base,other):base,right=operation==='−'?Math.min(base,other):other;
        return {left,right,operation,expected:operation==='+'?left+right:left-right};
      }

      function startDistractor(nextTrials) {
        recallQueue = nextTrials || [];
        recallIndex = 0; phase = 'distractor'; delayActiveMs = 0; delayTickAt = clockNow(); availableAt = null; prepareFailure = null; distractor = newDistractor();
        addEvent('phase', 'distractor');
        prepareRecall();
        renderDistractor();
      }

      async function prepareRecall() {
        if (disposed || phase !== 'distractor' || preparePending) return;
        preparePending = true;
        const ownGeneration = generation;
        try {
          const response = typeof ctx.prepareHannaRecall === 'function' ? await ctx.prepareHannaRecall(answerForPreparation()) : null;
          if (disposed || generation !== ownGeneration) return;
          if (phase !== 'distractor' && !(phase === 'paused' && beforePause === 'distractor')) return;
          availableAt = typeof response === 'string' ? response : response?.availableAt || null;
          preparePending = false;
          if (phase === 'distractor') renderDistractor();
        } catch (error) {
          if (disposed || generation !== ownGeneration) return;
          preparePending = false; prepareFailure = error || new Error('A szerver nem nyitotta meg a felidézést.');
          if (phase === 'distractor') showPrepareError(prepareFailure);
        }
      }

      function showPrepareError(error) {
        phase = 'error'; cancelTimer();
        setPhase('Kapcsolati hiba', 'A szerver nem nyitotta meg a felidézést.');
        shell('NEM VESZETT EL A KÓDOLÁS', 'A késleltetés indítása nem sikerült',
          h('div', { className: 'hanna-game-error', role: 'alert' }, h('p', {}, error?.message || 'Ellenőrizd a kapcsolatot, majd próbáld újra.')),
          [h('button', { type: 'button', className: 'primary-button', onClick: () => { prepareFailure = null; phase = 'distractor'; delayTickAt = clockNow(); prepareRecall(); renderDistractor(); } }, 'Kapcsolódás újrapróbálása'),
            h('button', { type: 'button', className: 'secondary-button', onClick: restart }, 'Kör újrakezdése')]);
      }

      function submitDistractor(input, feedback) {
        const value = Number(normalizeText(input.value).replace(',', '.'));
        if (!Number.isFinite(value)) { feedback.textContent = 'Írj be egy számot.'; return; }
        feedback.textContent = value === distractor.expected ? 'Rendben. Jön a következő számpár.' : `Most ${distractor.expected} lett volna. Jön a következő számpár.`;
        distractorCount++; distractor = newDistractor(); input.value = '';
        const equation = root.querySelector?.('[data-distractor-equation="true"]');
        if (equation) equation.textContent = `${distractor.left} ${distractor.operation} ${distractor.right} =`;
        input.focus?.({ preventScroll: true });
      }

      function renderDistractor() {
        if (disposed || phase !== 'distractor') return;
        delayActiveMs += Math.max(0, clockNow() - delayTickAt); delayTickAt = clockNow();
        const localLeft = Math.max(0, Number(settings.delayMs || 10000) - delayActiveMs);
        const serverLeft = availableAt ? Math.max(0, Date.parse(availableAt) - wallNow()) : (preparePending ? Infinity : 0);
        const left = Math.max(localLeft, serverLeft);
        if (left <= 0 && !preparePending) {
          delayActiveMs = Math.max(delayActiveMs, Number(settings.delayMs || 0));
          phase = 'recall'; addEvent('phase', 'recall'); renderRecall(); return;
        }
        setPhase('Köztes feladat', `A felidézés ${Number.isFinite(left) ? formatSeconds(left) : 'a szerver válasza után'} nyílik meg.`);
        const input = h('input', { type: 'text', inputmode: 'numeric', autocomplete: 'off', maxlength: 8, 'aria-label': 'A számfeladat eredménye' });
        const feedback = h('p', { className: 'hanna-distractor-feedback', role: 'status' });
        const submit = () => submitDistractor(input, feedback);
        input.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); submit(); } });
        shell('TELJES KÉSLELTETÉS', 'Páros számfeladat', h('div', { className: 'hanna-distractor' },
          h('p', {}, 'Oldd meg a párokat. A tanult elemeket most ne ismételd fejben és ne jegyezd fel.'),
          h('div', { className: 'hanna-equation' }, h('strong', { dataset: { distractorEquation: 'true' } }, `${distractor.left} ${distractor.operation} ${distractor.right} =`), input,
            h('button', { type: 'button', className: 'secondary-button', onClick: submit }, 'Ellenőrzés')),
          feedback,
          h('div', { className: 'hanna-delay-status', role: 'timer' },
            h('span', { style: { width: `${Math.max(0, Math.min(100, (delayActiveMs / Math.max(1, settings.delayMs)) * 100))}%` } }),
            h('strong', {}, preparePending ? 'Szerveres kapu előkészítése…' : `${formatSeconds(left)} aktív idő van hátra`)),
        ));
        schedule(renderDistractor, 250);
      }

      function hintPanel(trial, rerender, skip) {
        const hints = Array.isArray(trial.hints) ? trial.hints.slice(0, 3) : [];
        return h('div', { className: 'hanna-hints' },
          hints.map((hint, index) => h('button', {
            type: 'button', className: index < currentHintLevel ? 'hanna-hint is-open' : 'hanna-hint', disabled: index > currentHintLevel,
            onClick: () => { if(phase!=='recall')return; if (index === currentHintLevel) { currentHintLevel = Math.min(3, currentHintLevel + 1); addEvent('hint', currentHintLevel, trial.id); rerender(); } },
          }, index < currentHintLevel ? hint : `${index + 1}. támpont`)),
          h('button', { type: 'button', className: 'hanna-show-answer', disabled: currentHintLevel === 4, onClick: () => { if(phase!=='recall')return; currentHintLevel = 4; addEvent('show-answer', true, trial.id); rerender(); } }, 'Megoldás mutatása'),
          h('button', { type: 'button', className: 'hanna-skip-answer', onClick: skip }, 'Kihagyom'),
          currentHintLevel === 4 ? h('p', { className: 'hanna-answer-reveal' }, `Megoldás: ${resultValue(trial.expected)}`) : null,
        );
      }

      function trialInput(trial, submit) {
        if (trial.kind === 'choice') return h('div', { className: 'hanna-choice-grid' }, ...(trial.choices || []).map((choice) => h('button', {
          type: 'button', className: 'hanna-choice', onClick: () => submit(String(choice.value)),
        }, itemVisual(h, choice), h('strong', {}, choice.label))));
        if (trial.kind === 'multi') {
          const choices = (trial.choices || []).map((choice) => {
            const input = h('input', { type: 'checkbox', value: choice.value });
            return h('label', { className: 'hanna-multi-choice' }, input, itemVisual(h, choice), h('span', {}, choice.label));
          });
          const validation = h('p', { className: 'hanna-validation', role: 'alert' });
          return h('div', {}, h('p', { className: 'hanna-selection-count' }, `Pontosan ${trial.expected.length} elemet válassz.`), h('div', { className: 'hanna-choice-grid' }, ...choices), validation,
            h('button', { type: 'button', className: 'primary-button', onClick: () => {
              const values = choices.map((label) => label.querySelector?.('input')).filter((input) => input?.checked).map((input) => String(input.value));
              if (values.length !== trial.expected.length) { validation.textContent = `A rögzítéshez ${trial.expected.length} választás kell.`; return; }
              submit(values);
            } }, 'Válasz rögzítése'));
        }
        if (trial.kind === 'ordered' && trial.entry==='typed') {
          const inputs=trial.expected.map((_,index)=>h('input',{type:'text',maxlength:120,autocomplete:'off','aria-label':`${index+1}. felidézett elem`,placeholder:'…'}));
          return h('div',{},h('p',{},'Írd be a megjegyzett elemeket sorrendben. Ami nem jut eszedbe, maradhat üres.'),h('div',{className:'hanna-baseline-inputs'},inputs.map((input,index)=>h('label',{},h('span',{},`${index+1}.`),input))),h('button',{type:'button',className:'primary-button',onClick:()=>submit(inputs.map(input=>normalizeText(input.value)))},'Felidézés rögzítése'));
        }
        if (trial.kind === 'ordered') {
          const originalPool = trial.choices?.length ? trial.choices : (trial.expected || []).map((value) => ({ value, label: value }));
          const pool=shuffleHannaChoices(originalPool,(Number(ctx.seed)>>>0)^Number(trial.index||0));
          const selected = [];
          let dragged = null;
          const board = h('div', { className: 'hanna-order-board' });
          const move = (choice, destination, before = null) => {
            if (phase !== 'recall' || disposed || !choice) return;
            const source = pool.includes(choice) ? pool : selected.includes(choice) ? selected : null;
            if (!source || before === choice) return;
            source.splice(source.indexOf(choice), 1);
            const position = before ? destination.indexOf(before) : destination.length;
            destination.splice(position < 0 ? destination.length : position, 0, choice);
            dragged = null; redraw();
          };
          const dropProps = (destination, before = null) => ({
            onDragOver: event => { if (dragged && phase === 'recall') event.preventDefault(); },
            onDrop: event => { event.preventDefault(); event.stopPropagation?.(); move(dragged, destination, before); },
          });
          const dragProps = choice => ({
            draggable: true,
            onDragStart: event => { if (phase !== 'recall') { event.preventDefault(); return; } dragged = choice; event.dataTransfer?.setData('text/plain', String(choice.label)); },
            onDragEnd: () => { dragged = null; },
          });
          const redraw = () => {
            board.replaceChildren(
              h('p', {}, 'Húzd a kártyákat a sorrendbe, vagy koppints rájuk egymás után. A kijelölt kártyára kattintva visszateheted.'),
              h('div', { className: 'hanna-order-selected', ...dropProps(selected), 'aria-label':'A felidézett sorrend' }, selected.length ? selected.map((choice, index) => h('button', { type: 'button', ...dragProps(choice), ...dropProps(selected, choice), onClick: () => move(choice, pool) }, h('span', {}, String(index + 1)), choice.label)) : h('p', {}, 'Ide kerül a sorrended. A felkínált elemek sorrendjét gyakoroljuk.')),
              h('div', { className: 'hanna-order-pool', ...dropProps(pool), 'aria-label':'Felkínált elemek' }, ...pool.map(choice => h('button', { type: 'button', ...dragProps(choice), onClick: () => move(choice, selected) }, choice.label))),
              h('button', { type: 'button', className: 'primary-button', disabled: selected.length !== trial.expected.length, onClick: () => submit(selected.map((choice) => String(choice.value))) }, 'Sorrend rögzítése'),
            );
          };
          redraw(); return board;
        }
        const digitRecall=trial.label==='digits'||activity.id==='numbers';
        const area = digitRecall ? h('input',{type:'text',inputmode:'numeric',maxlength:String(trial.expected).length,autocomplete:'off',placeholder:'Írd be a felidézett számjegyeket…'}) : trial.kind === 'text'
          ? h('textarea', { rows: 5, maxlength: 4000, placeholder: trial.label || 'Írd le, amit felidézel…' })
          : h('input', { type: 'text', maxlength: 1000, autocomplete: 'off', placeholder: 'Írd be a válaszod…' });
        const validation = h('p', { className: 'hanna-validation', role: 'alert' });
        const record = () => {
          const value = digitRecall ? String(area.value).replace(/[^0-9]/g,'') : normalizeText(area.value);
          if (!value) { validation.textContent = 'Írj választ. Ha nem jut eszedbe, a megoldást külön gombbal nézheted meg.'; return; }
          submit(value);
        };
        area.addEventListener('keydown', (event) => { if (event.key === 'Enter' && trial.kind !== 'text') { event.preventDefault(); record(); } });
        return h('div', { className: 'hanna-free-answer' }, area, h('div', {}, validation, h('button', { type: 'button', className: 'primary-button', onClick: record }, 'Válasz rögzítése')));
      }

      function renderRecall(afterQueue = null) {
        if (disposed || phase !== 'recall') return;
        if (recallIndex >= recallQueue.length) {
          if (afterQueue) { afterQueue(); return; }
          complete(); return;
        }
        const trial = recallQueue[recallIndex];
        currentTrialOnset = clockNow(); currentHintLevel = 0;
        const submit = (value) => {
          if (disposed || phase !== 'recall' || responses.some((response) => response.trialId === trial.id)) return;
          responses.push({ trialId: trial.id, value, rtMs: Math.max(0, Math.round(clockNow() - currentTrialOnset)), hintLevel: currentHintLevel });
          recallIndex++; renderRecall(afterQueue);
        };
        const skip = () => {
          if (disposed || phase !== 'recall' || responses.some((response) => response.trialId === trial.id)) return;
          recallIndex++; renderRecall(afterQueue);
        };
        const answerInput=trialInput(trial,submit);
        const draw = () => {
          const reviewOrigin=(settings.reviewSnapshot||[]).find(item=>`review-${item.id}`===trial.id);
          const reviewContext=reviewOrigin?h('p',{className:'hanna-review-context'},`${ACTIVITY_BY_ID.get(reviewOrigin.sourceActivity)?.title||'Korábbi kör'} · Tanultad: ${new Date(reviewOrigin.learnedAt).toLocaleString('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}`):null;
          const reference = trial.image || Number.isInteger(trial.portraitIndex) ? itemVisual(h, trial, 'is-prompt') : null;
          setPhase(trial.phase === 'immediate' ? 'Azonnali felidézés' : trial.phase === 'delayed' ? 'Késleltetett felidézés' : 'Felidézés', `${recallIndex + 1}/${recallQueue.length}`);
          shell(trial.phase === 'immediate' ? 'AZONNALI PRÓBA' : 'ÖNÁLLÓ VISSZAHÍVÁS', trial.prompt,
            h('div', { className: 'hanna-recall-card' }, reviewContext,reference, trial.rubric?.length ? h('p', { className: 'hanna-rubric-note' }, 'A tanult szöveg kulcsgondolatait idézd fel a saját szavaiddal.') : null,
              answerInput, hintPanel(trial, draw, skip)),
            [], { progress: recallIndex / Math.max(1, recallQueue.length) });
        };
        draw();
      }

      function complete() {
        if (disposed || finished) return;
        finished = true; phase = 'done'; cancelTimer(); addEvent('phase', 'done');
        const answer = createAnswerSnapshot({
          startedAt,
          events, encoding, responses, training: trainingAnswers,
          encodingDurationMs, delayDurationMs: delayActiveMs, strategy,
        });
        setPhase('Kész', 'Az eredményedet összesítjük.');
        shell('KÖR TELJESÍTVE', 'A válaszaid rögzítésre készen állnak', h('div', { className: 'hanna-complete-card' },
          h('span', { 'aria-hidden': 'true' }, '✓'), h('p', {}, 'A pontosságot a szerver számolja ki. A saját történeted kreativitására nem adunk kitalált pontszámot.'),
        ));
        ctx.done(null, answer);
      }

      function onVisibility() {
        if (document.hidden) { addEvent('visibility', 'hidden'); pause('háttérbe került az oldal'); }
        else if (phase === 'paused') addEvent('visibility', 'visible');
      }
      function onBlur() { if (!disposed && !['intro', 'paused', 'done', 'error'].includes(phase)) pause('az ablak elvesztette a fókuszt'); }
      document.addEventListener?.('visibilitychange', onVisibility);
      globalThis.window?.addEventListener?.('blur', onBlur);
      renderIntro();

      return () => {
        if (disposed) return;
        disposed = true; generation++; cancelTimer();
        document.removeEventListener?.('visibilitychange', onVisibility);
        globalThis.window?.removeEventListener?.('blur', onBlur);
        root.replaceChildren();
      };
    },
  },
};
