import {renderHannaProgress} from './progress.js';
function replaceContent(node,...children){node.replaceChildren(...children.flat(Infinity).filter(child=>child!==null&&child!==undefined&&child!==false));}
import { HANNA_ACTIVITIES } from './content.js';
import { normalizeHannaSettings } from './engine.js';
import { createHannaSettings, renderHannaResult } from './ui.js';

const ACTIVITY_BY_ID = new Map(HANNA_ACTIVITIES.map((activity) => [activity.id, activity]));
const KIND_LABEL = Object.freeze({ palace: 'Memóriapalota', peg: 'Peg-lista', major: '00–99 szótár', material: 'Tananyag' });
const KIND_ICON = Object.freeze({ palace: '⌂', peg: '⚓', major: '09', material: '✎' });
const KIND_ACTIVITY = Object.freeze({ palace: 'palace', peg: 'peg', major: 'major', material: 'chain' });
const SUBTABS = Object.freeze([
  ['discover', 'Felfedezés'], ['daily', 'Napi tréning'], ['tools', 'Saját eszközeim'], ['progress', 'Fejlődésem'],
]);

function loadCssOnce() {
  if (typeof document === 'undefined' || document.querySelector?.('link[data-hanna-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet'; link.href = new URL('./hanna.css', import.meta.url).href; link.dataset.hannaCss = 'true';
  document.head?.append(link);
}
function text(value) { return String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' '); }
function copy(value) { return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)); }
function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
function formatDuration(ms) {
  const seconds = Math.max(0, Math.round(Number(ms || 0) / 1000));
  if (seconds < 60) return `${seconds} mp`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} p ${seconds % 60} mp`;
}
function field(h, label, control, help = '') {
  return h('label', { className: 'hanna-field' }, h('span', { className: 'hanna-field-label' }, label), control, help ? h('small', { className: 'hanna-field-help' }, help) : null);
}
function statusCard(h, mode, title, message, retry = null) {
  return h('section', { className: `hanna-workspace-status is-${mode}`, role: mode === 'error' ? 'alert' : 'status' },
    h('span', { 'aria-hidden': 'true' }, mode === 'loading' ? '◌' : mode === 'error' ? '!' : '◇'),
    h('h2', {}, title), h('p', {}, message), retry ? h('button', { type: 'button', className: 'primary-button', onClick: retry }, 'Újrapróbálom') : null,
  );
}
function apiCall(school, path, options = {}) {
  if (!school?.user || typeof school.api !== 'function') return Promise.reject(new Error('A Hanna Módszer saját nézeteihez bejelentkezés szükséges.'));
  return school.api(path, options);
}

function cleanPalace(data = {}) {
  return { locations: (Array.isArray(data.locations) ? data.locations : []).slice(0, 30).map((location, index) => ({
    id: text(location.id) || `hely-${index + 1}`,
    name: text(location.name), description: text(location.description).slice(0, 500),
    ...(location.photo ? { photo: String(location.photo) } : {}),
  })) };
}
function cleanPeg(data = {}) {
  return { entries: (Array.isArray(data.entries) ? data.entries : []).slice(0, 100).map((entry) => ({ number: Number(entry.number), label: text(entry.label) })) };
}
function cleanMajor(data = {}) {
  return { entries: (Array.isArray(data.entries) ? data.entries : []).slice(0, 100).map((entry) => ({ code: String(entry.code).padStart(2, '0'), label: text(entry.label) })).filter((entry) => entry.label) };
}
function cleanMaterial(data = {}) {
  return {
    items: (Array.isArray(data.items) ? data.items : []).slice(0, 100).map((item, index) => ({
      id: text(item.id) || `tetel-${index + 1}`, label: text(item.label),
      ...(text(item.meaning) ? { meaning: text(item.meaning) } : {}),
      ...(text(item.keyword) ? { keyword: text(item.keyword) } : {}),
      ...(text(item.category) ? { category: text(item.category) } : {}),
    })).filter((item) => item.label),
    ...(String(data.text || '').trim() ? { text: String(data.text).slice(0, 10000) } : {}),
    ...(Array.isArray(data.rubric) && data.rubric.length ? { rubric: data.rubric.slice(0, 100).map((entry, index) => ({
      id: text(entry.id) || `kulcs-${index + 1}`, label: text(entry.label),
      accepted: (Array.isArray(entry.accepted) ? entry.accepted : String(entry.accepted || '').split(',')).map(text).filter(Boolean).slice(0, 20),
    })).filter((entry) => entry.label) } : {}),
  };
}

function resourceData(kind, data) {
  if (kind === 'palace') return cleanPalace(data);
  if (kind === 'peg') return cleanPeg(data);
  if (kind === 'major') return cleanMajor(data);
  return cleanMaterial(data);
}

function palaceEditor(h, state, notify, isActive = () => true) {
  state.data = cleanPalace(state.data);
  if (!state.data.locations.length) state.data.locations = Array.from({ length: 5 }, (_, index) => ({ id: `hely-${index + 1}`, name: '', description: '' }));
  const list = h('ol', { className: 'hanna-location-editor' });
  const error = h('p', { className: 'hanna-validation', role: 'alert' });

  function updateIds() {
    state.data.locations.forEach((location, index) => { if (!location.id) location.id = `hely-${index + 1}`; });
  }
  function render() {
    list.replaceChildren(...state.data.locations.map((location, index) => {
      const name = h('input', { type: 'text', maxlength: 100, value: location.name, 'aria-label': `${index+1}. hely neve`, placeholder: `Például: ${index === 0 ? 'bejárati kilincs' : index === 1 ? 'ablakpárkány' : 'következő stabil hely'}`, onInput: (event) => { location.name = event.target.value; notify(); } });
      const description = h('textarea', { rows: 2, 'aria-label': `${index+1}. hely leírása`, maxlength: 500, value: location.description || '', placeholder: 'Mitől könnyű felismerni ezt a helyet?', onInput: (event) => { location.description = event.target.value; notify(); } });
      const photo = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', 'aria-label': `${index + 1}. hely opcionális fotója` });
      photo.addEventListener('change', () => {
        const file = photo.files?.[0];
        if (!file) return;
        if (file.size > 200_000 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { error.textContent = 'Egy fotó legfeljebb 200 KB-os JPG, PNG vagy WebP lehet.'; photo.value = ''; return; }
        const currentBytes = location.photo ? Math.floor(String(location.photo).split(',').at(-1).length * 3 / 4) : 0;
        const totalBytes = state.data.locations.reduce((sum, entry) => sum + (entry.photo ? Math.floor(String(entry.photo).split(',').at(-1).length * 3 / 4) : 0), 0);
        if (totalBytes - currentBytes + file.size > 650_000) { error.textContent = 'A palota fotói együtt legfeljebb 650 KB méretűek lehetnek.'; photo.value = ''; return; }
        const reader = new FileReader();
        reader.onload = () => { if (!isActive()) return; location.photo = String(reader.result); error.textContent = ''; notify(); render(); };
        reader.onerror = () => { if (isActive()) error.textContent = 'A fotó most nem olvasható.'; };
        reader.readAsDataURL(file);
      });
      return h('li', { className: 'hanna-location-row' },
        h('div', { className: 'hanna-location-index' }, String(index + 1)),
        h('div', { className: 'hanna-location-fields' }, name, description,
          h('div', { className: 'hanna-photo-row' }, location.photo ? h('img', { src: location.photo, alt: '' }) : null, photo,
            location.photo ? h('button', { type: 'button', className: 'hanna-link-button', onClick: () => { delete location.photo; notify(); render(); } }, 'Fotó törlése') : null)),
        h('div', { className: 'hanna-order-controls', 'aria-label': `${index + 1}. hely mozgatása` },
          h('button', { type: 'button', disabled: index === 0, 'aria-label': 'Feljebb', onClick: () => { [state.data.locations[index - 1], state.data.locations[index]] = [location, state.data.locations[index - 1]]; notify(); render(); } }, '↑'),
          h('button', { type: 'button', disabled: index === state.data.locations.length - 1, 'aria-label': 'Lejjebb', onClick: () => { [state.data.locations[index + 1], state.data.locations[index]] = [location, state.data.locations[index + 1]]; notify(); render(); } }, '↓'),
          h('button', { type: 'button', disabled: state.data.locations.length <= 5, 'aria-label': 'Hely törlése', onClick: () => { state.data.locations.splice(index, 1); updateIds(); notify(); render(); } }, '×')),
      );
    }));
  }
  render();
  return h('div', { className: 'hanna-editor-body' },
    h('div', { className: 'hanna-editor-explainer' }, h('strong', {}, '5–30 stabil állomás'), h('p', {}, 'Rendezd abba a sorrendbe, ahogy valóban bejárnád a szobát. Mentés után az útvonaltesztet újra teljesíteni kell.')),
    list, error,
    h('button', { type: 'button', className: 'secondary-button', disabled: state.data.locations.length >= 30, onClick: () => { state.data.locations.push({ id: `hely-${Date.now().toString(36)}`, name: '', description: '' }); notify(); render(); } }, '+ Új állomás'),
  );
}

function pegEditor(h, state, notify) {
  state.data = cleanPeg(state.data);
  if (state.data.entries.length < 5) state.data.entries = Array.from({ length: 10 }, (_, index) => ({ number: index + 1, label: '' }));
  const grid = h('div', { className: 'hanna-dictionary-grid is-peg' });
  function render() {
    grid.replaceChildren(...state.data.entries.map((entry) => h('label', {}, h('span', {}, String(entry.number)), h('input', {
      type: 'text', maxlength: 100, value: entry.label, placeholder: 'képi horog',
      onInput: (event) => { entry.label = event.target.value; notify(); },
    }))));
  }
  function resize(size) {
    const old = new Map(state.data.entries.map((entry) => [entry.number, entry.label]));
    state.data.entries = Array.from({ length: size }, (_, index) => ({ number: index + 1, label: old.get(index + 1) || '' })); notify(); render();
  }
  render();
  return h('div', { className: 'hanna-editor-body' },
    h('div', { className: 'hanna-editor-explainer' }, h('strong', {}, 'Fix szám–kép horgok'), h('p', {}, 'Minden sorszámhoz egyetlen gyorsan elképzelhető képet adj. A játék oda-vissza gyakoroltatja őket.')),
    h('div', { className: 'hanna-size-presets' }, ...[10, 20, 100].map((size) => h('button', { type: 'button', className: state.data.entries.length === size ? 'is-active' : '', onClick: () => resize(size) }, `${size} elem`))),
    grid,
  );
}

function majorEditor(h, state, notify) {
  state.data = cleanMajor(state.data);
  const saved = new Map(state.data.entries.map((entry) => [entry.code, entry.label]));
  const entries = Array.from({ length: 100 }, (_, index) => ({ code: String(index).padStart(2, '0'), label: saved.get(String(index).padStart(2, '0')) || '' }));
  state.data.entries = entries;
  const filter = h('input', { type: 'search', placeholder: 'Kód vagy szó keresése…', 'aria-label': 'Keresés a 00–99 szótárban' });
  const grid = h('div', { className: 'hanna-dictionary-grid is-major' });
  function render(query = '') {
    const needle = text(query).toLocaleLowerCase('hu');
    grid.replaceChildren(...entries.filter((entry) => !needle || entry.code.includes(needle) || entry.label.toLocaleLowerCase('hu').includes(needle)).map((entry) => h('label', {},
      h('span', {}, entry.code), h('input', { type: 'text', maxlength: 100, value: entry.label, placeholder: 'kép-szó', onInput: (event) => { entry.label = event.target.value; notify(); } }))));
  }
  filter.addEventListener('input', () => render(filter.value)); render();
  return h('div', { className: 'hanna-editor-body' },
    h('div', { className: 'hanna-editor-explainer' }, h('strong', {}, 'Szerkeszthető 00–99 képszótár'), h('p', {}, 'Részlegesen is menthető. A Számszörny csak a valóban kitöltött kódokat használja.')),
    filter, h('p', { className: 'hanna-major-count' }, 'A mentés az üres sorokat kihagyja.'), grid,
  );
}

function materialEditor(h, state, notify) {
  state.data = cleanMaterial(state.data);
  const items = state.data.items;
  const rubric = state.data.rubric || (state.data.rubric = []);
  const itemList = h('div', { className: 'hanna-material-list' });
  const rubricList = h('div', { className: 'hanna-rubric-editor' });
  function render() {
    itemList.replaceChildren(...items.map((item, index) => h('article', {},
      h('span', {}, String(index + 1)),
      h('input', { type: 'text', maxlength: 300, value: item.label, placeholder: 'Tétel vagy fogalom', onInput: (event) => { item.label = event.target.value; notify(); } }),
      h('input', { type: 'text', maxlength: 500, value: item.meaning || '', placeholder: 'Jelentés / magyarázat', onInput: (event) => { item.meaning = event.target.value; notify(); } }),
      h('input', { type: 'text', maxlength: 200, value: item.keyword || '', placeholder: 'Kulcsszó (opcionális)', onInput: (event) => { item.keyword = event.target.value; notify(); } }),
      h('input', { type: 'text', maxlength: 100, value: item.category || '', placeholder: 'Kategória', onInput: (event) => { item.category = event.target.value; notify(); } }),
      h('button', { type: 'button', 'aria-label': `${index + 1}. tétel törlése`, onClick: () => { items.splice(index, 1); notify(); render(); } }, '×'))));
    rubricList.replaceChildren(...rubric.map((entry, index) => h('article', {},
      h('input', { type: 'text', maxlength: 200, value: entry.label, 'aria-label':`${index+1}. kulcsgondolat`, placeholder: 'Kulcsgondolat', onInput: (event) => { entry.label = event.target.value; notify(); } }),
      h('input', { type: 'text', maxlength: 1000, value: (entry.accepted || []).join(', '), 'aria-label':`${index+1}. kulcsgondolat elfogadott alakjai`, placeholder: 'Elfogadott alakok, vesszővel', onInput: (event) => { entry.accepted = event.target.value.split(',').map(text).filter(Boolean); notify(); } }),
      h('button', { type: 'button', 'aria-label': `${index + 1}. kulcspont törlése`, onClick: () => { rubric.splice(index, 1); notify(); render(); } }, '×'))));
  }
  render();
  return h('div', { className: 'hanna-editor-body' },
    h('div', { className: 'hanna-editor-explainer' }, h('strong', {}, 'Saját tananyag'), h('p', {}, 'Fogalmakat, kulcsszavakat vagy rövid szöveget adhatsz. A rubrika előre rögzíti, mi számít elfogadott kulcsgondolatnak.')),
    field(h, 'Forrásszöveg (opcionális)', h('textarea', { rows: 7, maxlength: 10000, value: state.data.text || '', onInput: (event) => { state.data.text = event.target.value; notify(); } }), 'Legfeljebb 10 000 karakter.'),
    h('div', { className: 'hanna-editor-section-title' }, h('h3', {}, `Tételek (${items.length}/100)`), h('button', { type: 'button', className: 'secondary-button', disabled: items.length >= 100, onClick: () => { items.push({ id: `tetel-${Date.now().toString(36)}`, label: '' }); notify(); render(); } }, '+ Tétel')),
    itemList,
    h('div', { className: 'hanna-editor-section-title' }, h('h3', {}, 'Elfogadott kulcsgondolatok'), h('button', { type: 'button', className: 'secondary-button', disabled: rubric.length >= 100, onClick: () => { rubric.push({ id: `kulcs-${Date.now().toString(36)}`, label: '', accepted: [] }); notify(); render(); } }, '+ Kulcspont')),
    rubricList,
  );
}

function resourceEditor(h, resource, handlers) {
  const original = resource || null;
  let resourceId = original?.id || null;
  const state = {
    kind: original?.kind || 'palace', title: original?.title || '', revision: original?.revision,
    data: copy(original?.data || {}), dirty: false,
  };
  const element = h('section', { className: 'hanna-resource-editor' });
  const title = h('input', { type: 'text', maxlength: 120, value: state.title, placeholder: 'Eszköz neve' });
  const kind = h('select', { value: state.kind, disabled: !!original }, ...Object.entries(KIND_LABEL).map(([id, label]) => h('option', { value: id }, label)));
  const body = h('div');
  const status = h('p', { className: 'hanna-editor-status', role: 'status' });
  let saving = false;
  let active = true;
  function notify() { state.dirty = true; status.textContent = 'Nem mentett módosítások.'; }
  function renderBody() {
    state.kind = kind.value;
    body.replaceChildren(state.kind === 'palace' ? palaceEditor(h, state, notify, () => active) : state.kind === 'peg' ? pegEditor(h, state, notify) : state.kind === 'major' ? majorEditor(h, state, notify) : materialEditor(h, state, notify));
  }
  title.addEventListener('input', () => { state.title = title.value; notify(); });
  kind.addEventListener('change', () => { state.data = {}; notify(); renderBody(); });
  const save = h('button', { type: 'button', className: 'primary-button', onClick: async () => {
    if (saving) return;
    state.title = text(title.value);
    if (!state.title) { status.textContent = 'Adj nevet az eszköznek.'; status.className = 'hanna-editor-status is-error'; return; }
    const data = resourceData(state.kind, state.data);
    if (state.kind === 'palace' && (data.locations.length < 5 || data.locations.some((location) => !location.name))) { status.textContent = 'A palotához legalább 5 elnevezett hely kell.'; status.className = 'hanna-editor-status is-error'; return; }
    if (state.kind === 'peg' && (data.entries.length < 5 || data.entries.some((entry, index) => entry.number !== index + 1 || !entry.label))) { status.textContent = 'A peg-lista 5–100 egymást követő, kitöltött horgot kér.'; status.className = 'hanna-editor-status is-error'; return; }
    if (state.kind === 'major' && !data.entries.length) { status.textContent = 'A szótár mentéséhez legalább egy kódot tölts ki.'; status.className = 'hanna-editor-status is-error'; return; }
    if (state.kind === 'material' && !data.items.length && !data.text) { status.textContent = 'Adj legalább egy tételt vagy forrásszöveget.'; status.className = 'hanna-editor-status is-error'; return; }
    if (new TextEncoder().encode(JSON.stringify({ kind: state.kind, title: state.title, data })).length > 1_000_000) { status.textContent = 'A teljes mentési kérés legfeljebb 1 MB lehet. Törölj vagy kicsinyíts fotót.'; status.className = 'hanna-editor-status is-error'; return; }
    saving = true; save.disabled = true; status.className = 'hanna-editor-status'; status.textContent = 'Mentés…';
    try {
      const saved = await handlers.save({ kind: state.kind, title: state.title, data, revision: state.revision }, resourceId);
      if (!active) return;
      resourceId = saved.id; state.revision = saved.revision; state.dirty = false;save.textContent='Módosítások mentése';kind.disabled=true;const heading=element.querySelector?.('h2');if(heading)heading.textContent=saved.title; status.textContent = '✓ Mentve. A szerver új pillanatképet adott.';
    } catch (error) { if (active && error?.name !== 'AbortError') { status.className = 'hanna-editor-status is-error'; status.textContent = error?.message || 'A mentés nem sikerült. Próbáld újra.'; } }
    finally { saving = false; if (active) save.disabled = false; }
  } }, original ? 'Módosítások mentése' : 'Eszköz létrehozása');
  renderBody();
  replaceContent(element, 
    h('header', {}, h('button', { type: 'button', className: 'hanna-link-button', onClick: () => { active = false; handlers.close(); } }, '← Eszközlista'), h('span', { className: 'hanna-kicker' }, original ? 'SZERKESZTÉS' : 'ÚJ SAJÁT ESZKÖZ'), h('h2', {}, original?.title || 'Új eszköz')),
    h('div', { className: 'hanna-resource-meta' }, field(h, 'Típus', kind), field(h, 'Név', title)), body, status,
    h('div', { className: 'hanna-editor-actions' }, save, original ? h('button', { type: 'button', className: 'hanna-danger-button', onClick: () => handlers.remove(original) }, 'Eszköz archiválása') : null),
  );
  return { element, state, dispose() { active = false; } };
}

function routeReadiness(h, resource, handlers) {
  const locations = resource.data?.locations || [];
  const element = h('section', { className: 'hanna-readiness' });
  const answers = locations.map((_, index) => ({ index, value: '' }));
  let revealed = false;
  function render() {
    replaceContent(element, 
      h('header', {}, h('button', { type: 'button', className: 'hanna-link-button', onClick: handlers.close }, '← Vissza'), h('span', { className: 'hanna-kicker' }, 'ÚTVONALTESZT'), h('h2', {}, resource.title),
        h('p', {}, 'A sorrend most rejtve marad. Idézd fel a helyeket index szerint; 90%-tól lesz kész a palota.')),
      revealed ? h('ol', { className: 'hanna-route-study' }, ...locations.map((location, index) => h('li', {}, h('span', {}, String(index + 1)), h('div', {}, h('strong', {}, location.name), location.description ? h('p', {}, location.description) : null)))) : null,
      !revealed ? h('div', { className: 'hanna-readiness-form' }, ...answers.map((answer, index) => field(h, `${index + 1}. állomás`, h('input', { type: 'text', maxlength: 100, value: answer.value, onInput: (event) => { answer.value = event.target.value; } })))) : null,
      h('p', { className: 'hanna-editor-status', role: 'status', dataset: { readinessStatus: 'true' } }),
      h('div', { className: 'hanna-editor-actions' },
        !revealed ? h('button', { type: 'button', className: 'primary-button', onClick: async (event) => {
          const button = event.currentTarget; button.disabled = true;
          const status = element.querySelector?.('[data-readiness-status="true"]'); status.textContent = 'Ellenőrzés…';
          try {
            const response = await handlers.submit({ revision: resource.revision, answers: answers.filter((answer) => text(answer.value)).map((answer) => ({ index: answer.index, value: text(answer.value) })) });
            const score = response?.percent ?? response?.score?.percent ?? (response?.resource?.ready ? 100 : null);
            status.textContent = response?.resource?.ready || response?.ready ? `✓ ${score ?? 90}% – a palota készen áll, játékban választható.` : `${score ?? 0}% – még nem érte el a 90%-ot. Tanuld át és próbáld újra.`;
            if (response?.resource) handlers.updated(response.resource);
          } catch (error) { if (error?.name !== 'AbortError') status.textContent = error?.message || 'Az útvonalteszt ellenőrzése nem sikerült.'; }
          finally { button.disabled = false; }
        } }, 'Rejtett útvonal ellenőrzése') : null,
        h('button', { type: 'button', className: 'secondary-button', onClick: () => { revealed = !revealed; render(); } }, revealed ? 'Teszt kitöltése' : 'Útvonal tanulása')),
    );
  }
  render(); return element;
}

export function createHannaWorkspace({ h, school, onStart = () => {} } = {}) {
  if (typeof h !== 'function') throw new TypeError('A Hanna-munkatérhez szükséges a h elemkészítő.');
  loadCssOnce();
  const element = h('div', { className: 'hanna-workspace' });
  let disposed = false;
  let generation = 0;
  let resources = [];
  let mode = 'list';
  let selected = null;
  let viewDispose = null;
  const userId = school?.user?.id;

  function current(token) { return !disposed && token === generation && school?.user?.id === userId; }
  async function load() {
    const token = ++generation;
    replaceContent(element, statusCard(h, 'loading', 'Saját eszközök', 'A verziózott erőforrások betöltése…'));
    try {
      const data = await apiCall(school, '/api/hanna/resources', { method: 'GET' });
      if (!current(token)) return;
      resources = Array.isArray(data?.resources) ? data.resources : []; mode = 'list'; renderList();
    } catch (error) {
      if (!current(token) || error?.name === 'AbortError') return;
      replaceContent(element, statusCard(h, 'error', 'Az eszközök nem töltődtek be', error?.message || 'Ez hálózati hiba, nem üres eszközlista.', load));
    }
  }
  function exactPreviewSettings(resource) {
    let raw = { activity: KIND_ACTIVITY[resource.kind], resourceIds: [resource.id] };
    if (resource.kind === 'palace') raw.itemCount = Math.min(30, Math.max(5, resource.data?.locations?.length || 5));
    if (resource.kind === 'peg') raw.itemCount = Math.min(30, Math.max(5, resource.data?.entries?.length || 5));
    if (resource.kind === 'material' && resource.data?.text) raw = { ...raw, activity: 'text', itemCount: 1, contentLevel: 'material', recallMode: resource.data?.rubric?.length ? 'meaning' : 'verbatim' };
    else if (resource.kind === 'material') raw = { ...raw, activity: 'concept', itemCount: Math.min(6, resource.data?.items?.length || 3), contentLevel: 'material' };
    const base = normalizeHannaSettings(raw);
    return school?.user?.role === 'teacher' ? { ...base, resourceIds: [resource.id], resourceSnapshot: [resource] } : { ...base, resourceIds: [resource.id] };
  }
  function canPreview(resource) {
    if (resource.kind === 'palace') return resource.ready && (resource.data?.locations?.length || 0) >= 5;
    if (resource.kind === 'peg') return (resource.data?.entries?.length || 0) >= 5;
    if (resource.kind === 'major') return (resource.data?.entries?.length || 0) >= 1;
    return !!resource.data?.text || (resource.data?.items?.length || 0) >= 3;
  }
  function renderList() {
    if (disposed) return;
    viewDispose?.(); viewDispose = null;
    generation++; mode = 'list'; selected = null;
    replaceContent(element, 
      h('div', { className: 'hanna-section-heading' }, h('div', {}, h('span', { className: 'hanna-kicker' }, 'SAJÁT ERŐFORRÁSOK'), h('h2', {}, 'A saját módszertárad'), h('p', {}, 'Szerkeszd bátran: a korábban tanult anyag és eredményed megmarad.')),
        h('button', { type: 'button', className: 'primary-button', onClick: () => openEditor(null) }, '+ Új eszköz')),
      resources.length ? h('div', { className: 'hanna-resource-grid' }, ...resources.map((resource) => h('article', { className: 'hanna-resource-card' },
        h('div', { className: 'hanna-resource-icon', 'aria-hidden': 'true' }, KIND_ICON[resource.kind] || '◇'),
        h('div', { className: 'hanna-resource-copy' }, h('span', { className: 'hanna-kicker' }, `${KIND_LABEL[resource.kind] || resource.kind} · R${resource.revision}`), h('h3', {}, resource.title),
          h('p', {}, resource.kind === 'palace' ? `${resource.data?.locations?.length || 0} állomás · ${resource.ready ? 'útvonal kész' : 'útvonalteszt kell'}` : resource.kind === 'major' ? `${resource.data?.entries?.length || 0}/100 kitöltött kód` : resource.kind === 'peg' ? `${resource.data?.entries?.length || 0} horog` : resource.data?.text?`Szöveg · ${resource.data?.rubric?.length||0} kulcspont`:`${resource.data?.items?.length || 0} tétel`),
          h('small', {}, `Módosítva: ${formatDate(resource.updatedAt)}`)),
        h('div', { className: 'hanna-resource-actions' },
          h('button', { type: 'button', className: 'secondary-button', disabled: !canPreview(resource), onClick: () => onStart(exactPreviewSettings(resource)) }, resource.kind === 'palace' && !resource.ready ? 'Teszt után használható' : !canPreview(resource) ? 'Adj legalább 3 tételt' : school?.user?.role === 'teacher' ? 'Saját előnézet' : 'Használom játékban'),
          resource.kind === 'palace' ? h('button', { type: 'button', className: 'hanna-link-button', onClick: () => openReadiness(resource) }, resource.ready ? 'Útvonal újratesztelése' : 'Útvonalteszt') : null,
          h('button', { type: 'button', className: 'hanna-link-button', onClick: () => openEditor(resource) }, 'Szerkesztés')),
      ))) : statusCard(h, 'empty', 'Még nincs saját eszközöd', 'Készíts palotát, peg-listát, 00–99 szótárt vagy saját tananyagot.'),
      h('aside', { className: 'hanna-privacy-note' }, h('strong', {}, 'Privát marad'), h('p', {}, 'A saját eszközeidet másik tanuló nem olvashatja. Kiosztáskor külön pillanatkép készül.')),
    );
  }
  function openEditor(resource) {
    viewDispose?.(); viewDispose = null;
    generation++; mode = 'edit'; selected = resource;
    const editor = resourceEditor(h, resource, {
      close: renderList,
      save: async (payload, id) => {
        const token = generation;
        const path = id ? `/api/hanna/resources/${encodeURIComponent(id)}` : '/api/hanna/resources';
        const body = id ? { title: payload.title, data: payload.data, revision: payload.revision } : { kind: payload.kind, title: payload.title, data: payload.data };
        const response = await apiCall(school, path, { method: id ? 'PATCH' : 'POST', body });
        if (!current(token)) throw Object.assign(new Error('A szerkesztő közben bezárult.'), { name: 'AbortError' });
        const saved = response.resource;
        const index = resources.findIndex((entry) => entry.id === saved.id);
        if (index >= 0) resources[index] = saved; else resources.unshift(saved);
        selected = saved; return saved;
      },
      remove: async (entry) => {
        if (globalThis.confirm && !globalThis.confirm(`Archiválod ezt: ${entry.title}? A régi körök pillanatképei megmaradnak.`)) return;
        const token = generation;
        try {
          await apiCall(school, `/api/hanna/resources/${encodeURIComponent(entry.id)}`, { method: 'DELETE' });
          if (!current(token)) return;
          resources = resources.filter((item) => item.id !== entry.id); renderList();
        } catch (error) {
          const status = element.querySelector?.('.hanna-editor-status'); if (status) { status.className = 'hanna-editor-status is-error'; status.textContent = error?.message || 'Az archiválás nem sikerült.'; }
        }
      },
    });
    viewDispose = editor.dispose;
    replaceContent(element, editor.element);
  }
  function openReadiness(resource) {
    viewDispose?.(); viewDispose = null;
    generation++; mode = 'readiness'; selected = resource;
    replaceContent(element, routeReadiness(h, resource, {
      close: renderList,
      submit: async (body) => {
        const token = generation;
        const response = await apiCall(school, `/api/hanna/resources/${encodeURIComponent(resource.id)}/readiness`, { method: 'POST', body });
        if (!current(token)) throw Object.assign(new Error('Az útvonalteszt közben bezárult.'), { name: 'AbortError' });
        return response;
      },
      updated: (updated) => { const index = resources.findIndex((entry) => entry.id === updated.id); if (index >= 0) resources[index] = updated; selected = updated; },
    }));
  }
  load();
  return { element, refresh: load, dispose() { disposed = true; generation++; viewDispose?.(); viewDispose = null; }, get resources() { return resources; } };
}

function discoveryView(h, school, onStart) {
  const element = h('section', { className: 'hanna-discovery' });
  let selected = HANNA_ACTIVITIES[0].id;
  let editor = null;
  function render() {
    const activity = ACTIVITY_BY_ID.get(selected);
    editor?.dispose?.();
    editor = selected === 'review' ? null : createHannaSettings({ h, school, compact: true, value: { activity: selected }, onChange() {} });
    replaceContent(element, 
      h('div', { className: 'hanna-discovery-hero' }, h('div', {}, h('span', { className: 'hanna-kicker' }, '15 KÜLÖNBÖZŐ TANULÁSI HELYZET'), h('h1', {}, 'Találd meg a technikát, ami ma segít'),
        h('p', {}, 'Mindegyik modul saját tanítással indul. Egy rövid kör nem képességvizsga: azt mutatja meg, hogyan működött most a választott stratégia.')),
        h('div', { className: 'hanna-daily-orbit', 'aria-hidden': 'true' }, h('span', {}, '10'), h('small', {}, '–15 perc'), h('i', {}))),
      h('div', { className: 'hanna-activity-browser' },
        h('div', { className: 'hanna-activity-list', role: 'group', 'aria-label': 'Hanna tevékenységek' }, ...HANNA_ACTIVITIES.map((entry, index) => h('button', {
          type: 'button', className: selected === entry.id ? 'hanna-activity-tab is-active' : 'hanna-activity-tab', onClick: () => { selected = entry.id; render(); }, 'aria-pressed': String(selected === entry.id),
        }, h('span', {}, String(index + 1).padStart(2, '0')), h('i', { 'aria-hidden': 'true' }, entry.icon || '✦'), h('strong', {}, entry.title), h('small', {}, entry.technique)))),
        h('article', { className: 'hanna-activity-detail' },
          h('div', { className: `hanna-activity-art is-${activity.id}`, 'aria-hidden': 'true' }, h('span', {}, activity.icon || '✦'), h('i', {}), h('b', {}, '↝')),
          h('span', { className: 'hanna-kicker' }, activity.technique), h('h2', {}, activity.title), h('p', { className: 'hanna-lead' }, activity.description),
          h('div', { className: 'hanna-mini-lesson' }, h('strong', {}, 'A saját tanító szakasz lényege'), h('p', {}, activity.instruction)),
          editor?.element || h('div', { className: 'hanna-editor-explainer' }, h('strong', {}, 'Csak valóban esedékes tartalommal indul'), h('p', {}, 'A Napi tréning fül a szerver szerint esedékes pillanatképeket mutatja. Itt nem készül friss helyettesítő lista.')),
          h('button', { type: 'button', className: 'primary-button hanna-wide-button', onClick: () => onStart(editor ? editor.getValue() : { hannaVersion: 1, activity: 'review' }) }, selected === 'review' ? 'Esedékes ismétlés ellenőrzése' : school?.user?.role === 'teacher' ? 'Saját próbakör megnyitása' : 'Ezt próbálom ki')),
      ),
    );
  }
  render(); return { element, dispose() { editor?.dispose?.(); } };
}

function dailyView(h, dashboard, onStart) {
  const due = Array.isArray(dashboard.due) ? dashboard.due : [];
  const plan = Array.isArray(dashboard.dailyPlan) ? dashboard.dailyPlan : [];
  return h('section', { className: 'hanna-daily-view' },
    h('div', { className: 'hanna-section-heading' }, h('div', {}, h('span', { className: 'hanna-kicker' }, 'NAPI 10–15 PERC'), h('h2', {}, 'Mai emlékezeti útvonal'),
      h('p', {}, 'Rövid bemelegítés, egy fő technika, random visszakérdezés és csak a valóban esedékes ismétlések.'))),
    h('div', { className: 'hanna-daily-layout' },
      h('ol', { className: 'hanna-daily-plan' }, ...plan.map((item, index) => {
        const activity = ACTIVITY_BY_ID.get(item.activity);
        return h('li', {}, h('span', {}, String(index + 1)), h('div', {}, h('strong', {}, item.label || activity?.title || item.activity), h('p', {}, activity?.technique || 'Hanna Módszer')),
          h('small', {}, item.completed?'✓ Ma kész':item.available===false?'Később esedékes':`${item.minutes || 2} perc`), h('button', { type: 'button', className: 'secondary-button', disabled:item.available===false, onClick: () => onStart(item.activity === 'review' ? { hannaVersion: 1, activity: 'review' } : normalizeHannaSettings({ activity: item.activity })) }, item.completed?'Újra gyakorlom':item.available===false?'Még nincs esedékes':'Indítás'));
      })),
      h('aside', { className: 'hanna-due-card' }, h('span', { className: 'hanna-kicker' }, 'KÉSŐBBI VISSZAHÍVÁS'), h('h3', {}, due.length ? `${due.length} esedékes emlék` : 'Most nincs esedékes emlék'),
        due.length ? h('ul', {}, ...due.slice(0, 5).map((entry) => h('li', {}, h('strong', {}, entry.label), h('small', {}, `${ACTIVITY_BY_ID.get(entry.sourceActivity)?.title || entry.sourceActivity} · ${formatDate(entry.dueAt)}`)))) : h('p', {}, dashboard.nextDueAt ? `A következő valódi ismétlés: ${formatDate(dashboard.nextDueAt)}.` : 'Az első befejezett tanulókör után, a tényleges intervallum leteltével jelenik meg itt ismétlés.'),
        due.length ? h('button', { type: 'button', className: 'primary-button', onClick: () => onStart({ hannaVersion: 1, activity: 'review', itemCount:Math.min(10,due.length), reviewIds: due.slice(0,10).map((entry) => entry.id) }) }, 'Esedékesek felidézése') : null),
    ));
}

function progressView(h, dashboard, teacher = false, selectedStudent = null) {
  const results = Array.isArray(dashboard.results) ? dashboard.results : [];
  const milestones = Array.isArray(dashboard.milestones) ? dashboard.milestones : [];
  return h('section', { className: 'hanna-progress-view' },
    h('div', { className: 'hanna-section-heading' }, h('div', {}, h('span', { className: 'hanna-kicker' }, teacher ? 'TANULÓI FEJLŐDÉS' : 'SAJÁT FEJLŐDÉS'),
      h('h2', {}, teacher ? selectedStudent ? `${selectedStudent.displayName || selectedStudent.name} eredményei` : 'Válassz tanulót' : 'A saját gyakorlásod nyomai'),
      h('p', {}, teacher ? 'Csak a saját tanulók megfigyelt Hanna-eredményei jelennek meg. Privát erőforrásaik nem.' : 'Nézd meg, hogyan változtak a saját eredményeid azonos feladatokban.'))),
    !teacher || selectedStudent ? h('div', { className: 'hanna-progress-summary' },
      h('article', {}, h('span', {}, 'Befejezett körök'), h('strong', {}, String(results.length))),
      h('article', {}, h('span', {}, 'Esedékes felidézés'), h('strong', {}, String(dashboard.dueCount ?? dashboard.due?.length ?? 0))),
      h('article', {}, h('span', {}, 'Mérföldkövek'), h('strong', {}, String(milestones.length)))) : null,
    (!teacher||selectedStudent)&&results.length?renderHannaProgress(h,results,{teacher}):null,
    milestones.length ? h('div', { className: 'hanna-milestones' }, ...milestones.map((entry) => h('article', {}, h('span', { 'aria-hidden': 'true' }, '◆'), h('div', {}, h('strong', {}, entry.label), h('small', {}, formatDate(entry.at)))))) : null,
    teacher && !selectedStudent ? statusCard(h, 'empty', 'Nincs kiválasztott tanuló', 'A fenti választóban jelölj ki egy hozzád tartozó tanulót. Tanári saját próbakör nem jelenik meg tanulói eredményként.')
      : results.length ? h('div', { className: 'hanna-result-list' }, ...results.map((entry) => {
        const result = entry.result || entry;
        const activity = ACTIVITY_BY_ID.get(result.metrics?.activity || entry.settings?.activity);
        return h('details', { className: 'hanna-result-row' }, h('summary', {}, h('span', { className: 'hanna-result-icon' }, activity?.icon || '✦'),
          h('div', {}, h('strong', {}, activity?.title || 'Hanna-kör'), h('small', {}, `${formatDate(entry.at || entry.completedAt)} · ${result.metrics?.technique || activity?.technique || ''}`)),
          h('b', {}, result.percent == null ? '—' : `${result.percent}%`)), renderHannaResult(h, result));
      })) : statusCard(h, 'empty', 'Még nincs Hanna-eredmény', teacher ? 'Ennél a tanulónál még nincs befejezett, mentett Hanna-kör.' : 'Az első mentett kör után itt jelenik meg a tételes, gyakorlati visszajelzés.'),
  );
}

export function createHannaHub({ h, school, onStart = () => {}, initialView='discover' } = {}) {
  if (typeof h !== 'function') throw new TypeError('A Hanna-hubhoz szükséges a h elemkészítő.');
  loadCssOnce();
  const element = h('section', { className: 'hanna-hub' });
  let disposed = false;
  let generation = 0;
  let active = ['discover','daily','tools','progress'].includes(initialView)?initialView:'discover';
  let dashboard = null;
  let dashboardState = 'idle';
  let dashboardError = '';
  let child = null;
  let students = [];
  let studentsState = 'idle';
  let selectedStudentId = '';
  const userId = school?.user?.id;
  const teacher = school?.user?.role === 'teacher';

  function isCurrent(token) { return !disposed && token === generation && school?.user?.id === userId; }
  function safeStart(settings) {
    if (disposed) return;
    try {
      if (settings.activity === 'review') onStart(settings);
      else {
        const normalized = normalizeHannaSettings(settings);
        onStart(settings.resourceSnapshot ? { ...normalized, resourceSnapshot: settings.resourceSnapshot } : normalized);
      }
    }
    catch (error) { dashboardError = error?.message || 'A kör nem indítható.'; render(); }
  }
  async function loadDashboard(studentId = '') {
    if (!school?.user) { dashboardState = 'error'; dashboardError = 'A saját dashboardhoz előbb be kell jelentkezni.'; render(); return; }
    const token = ++generation; dashboardState = 'loading'; dashboardError = ''; render();
    try {
      const path = studentId ? `/api/hanna/dashboard?studentId=${encodeURIComponent(studentId)}` : '/api/hanna/dashboard';
      const data = await apiCall(school, path, { method: 'GET' });
      if (!isCurrent(token)) return;
      dashboard = data; dashboardState = 'ready'; render();
    } catch (error) {
      if (!isCurrent(token) || error?.name === 'AbortError') return;
      dashboardState = 'error'; dashboardError = error?.message || 'A dashboard nem tölthető be.'; render();
    }
  }
  async function loadStudents() {
    if (!teacher || studentsState === 'loading') return;
    studentsState = 'loading'; render();
    try {
      const data = await apiCall(school, '/api/teacher/students', { method: 'GET' });
      if (disposed) return;
      students = Array.isArray(data?.students) ? data.students : []; studentsState = 'ready'; render();
    } catch (error) {
      if (disposed || error?.name === 'AbortError') return;
      studentsState = 'error'; dashboardError = error?.message || 'A tanulólista nem tölthető be.'; render();
    }
  }
  function switchTab(id) {
    if (active === id) return;
    child?.dispose?.(); child = null; active = id;
    if (id === 'daily' && dashboardState === 'idle') loadDashboard();
    else if (id === 'progress') {
      if (teacher && studentsState === 'idle') loadStudents();
      if (!teacher && dashboardState === 'idle') loadDashboard();
      else render();
    } else render();
  }
  function nav() {
    return h('nav', { className: 'hanna-subnav', 'aria-label': 'Hanna Módszer nézetei' }, ...SUBTABS.map(([id, label]) => h('button', {
      type: 'button', className: active === id ? 'is-active' : '', 'aria-current': active === id ? 'page' : null, onClick: () => switchTab(id),
    }, id === 'progress' && teacher ? 'Tanulói fejlődés' : label)));
  }
  function teacherSelector() {
    if (!teacher || active !== 'progress') return null;
    if (studentsState === 'loading') return h('p', { className: 'hanna-inline-status', role: 'status' }, 'Saját tanulók betöltése…');
    if (studentsState === 'error') return h('div', { className: 'hanna-inline-error', role: 'alert' }, h('span', {}, dashboardError), h('button', { type: 'button', className: 'hanna-link-button', onClick: loadStudents }, 'Tanulólista újrapróbálása'));
    return field(h, 'Saját tanuló', h('select', { value: selectedStudentId, onChange: (event) => { selectedStudentId = event.target.value; if (selectedStudentId) loadDashboard(selectedStudentId); else { dashboard = null; dashboardState = 'idle'; render(); } } },
      h('option', { value: '' }, students.length ? 'Válassz tanulót…' : 'Nincs hozzád tartozó tanuló'),
      ...students.map((student) => h('option', { value: student.id }, student.displayName || student.name || student.username || student.id))));
  }
  function body() {
    child?.dispose?.(); child = null;
    if (active === 'discover') { child = discoveryView(h, school, safeStart); return child.element; }
    if (active === 'tools') { child = createHannaWorkspace({ h, school, onStart: safeStart }); return child.element; }
    if (dashboardState === 'loading') return statusCard(h, 'loading', active === 'daily' ? 'A mai terv készül' : 'Eredmények betöltése', 'A szerveres állapot lekérése…');
    if (dashboardState === 'error') return statusCard(h, 'error', 'Az adatok nem töltődtek be', `${dashboardError} Ez nem üres eredményállapot.`, () => loadDashboard(selectedStudentId));
    if (active === 'daily') return dashboard ? dailyView(h, dashboard, safeStart) : statusCard(h, 'empty', 'A mai terv még nem érhető el', 'Frissítsd a szerveres napi tervet.', () => loadDashboard());
    const selected = students.find((student) => String(student.id) === String(selectedStudentId));
    return progressView(h, dashboard || { results: [], milestones: [] }, teacher, selected || null);
  }
  function render() {
    if (disposed) return;
    replaceContent(element, 
      h('header', { className: 'hanna-hub-header' }, h('a', { href: '#/hanna-modszer', className: 'hanna-wordmark' }, h('span', {}, 'H'), h('div', {}, h('strong', {}, 'Hanna Módszer'), h('small', {}, 'emlékezz a saját képeiddel'))),
        h('div', { className: 'hanna-hub-promise' }, h('span', { 'aria-hidden': 'true' }, '◷'), h('p', {}, h('strong', {}, 'Napi 10–15 perc'), ' · tanítás, gyakorlás, valódi ismétlés'))),
      nav(), teacherSelector(),
      dashboardError && dashboardState !== 'error' && studentsState !== 'error' ? h('p', { className: 'hanna-inline-error', role: 'alert' }, dashboardError) : null,
      h('div', { className: 'hanna-hub-content' }, body()),
    );
  }
  render();
  if(active==='daily')loadDashboard();
  return { element, dispose() { disposed = true; generation++; child?.dispose?.(); child = null; } };
}
