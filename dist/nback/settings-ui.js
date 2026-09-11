import { MODE_DEFINITIONS, normalizeConfig } from './engine.js';

const DEFAULT_VALUE = Object.freeze({
  nbackVersion: 1,
  mode: 2,
  n: 1,
  trialCount: 20,
  intervalMs: 3000,
  selfPaced: false,
  adaptive: false,
  variable: false,
  crab: false,
  multiStim: 1,
  identity: 'color',
  interference: 0.125,
  scoreProfile: 'workshop',
  operations: ['+', '-', '*', '/'],
  numberMax: 9,
  allowNegative: false,
  allowFractions: false,
  lowScoreCount: 0,
});

function loadCssOnce() {
  if (typeof document === 'undefined' || document.querySelector?.('link[data-nback-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./nback.css', import.meta.url).href;
  link.dataset.nbackCss = 'true';
  document.head?.append(link);
}

function bool(value) { return value === true || value === 'true' || value === '1' || value === 1; }
function modeById(id) { return MODE_DEFINITIONS.find((item) => item.id === Number(id)); }
function hasChannel(mode, id) { return !!mode?.channels?.includes(id); }
function isCombination(mode) { return mode?.channels?.some((id) => ['visvis', 'visaudio', 'audiovis'].includes(id)); }
function isArithmetic(mode) { return hasChannel(mode, 'arithmetic'); }
function hasPosition(mode) { return hasChannel(mode, 'position1'); }
function hasBothIdentities(mode) { return hasChannel(mode, 'color') && hasChannel(mode, 'image'); }
function canMulti(mode) { return hasPosition(mode) && !isArithmetic(mode) && !isCombination(mode) && !hasBothIdentities(mode); }

function familyLabel(family) {
  const labels = {
    basic: 'Alapfeladatok', classic: 'Alapfeladatok', standard:'Alapfeladatok',single:'Egycsatornás játékok','dual-audio':'Két hangcsatorna',combination: 'Kombinációk',
    arithmetic: 'Számolás', visual: 'Vizuális párok', audio: 'Két hangcsatorna',
    multichannel: 'Többcsatornás feladatok', standard: 'Összetett feladatok',
    single: 'Egycsatornás feladatok', 'dual-audio': 'Két hangcsatornás feladatok',
  };
  return labels[String(family || '').toLowerCase()] || String(family || 'További módok');
}

function createField(h, label, control, help = '') {
  return h('label', { className: 'nback-field' },
    h('span', { className: 'nback-field-label' }, label), control,
    help ? h('small', { className: 'nback-help' }, help) : null);
}

function createCheck(h, label, key, checked = false) {
  const input = h('input', { type: 'checkbox', checked, dataset: { setting: key } });
  const reason = h('small', { className: 'nback-disabled-reason', hidden: true });
  return { input, reason, element: h('div', { className: 'nback-check-wrap' }, h('label', { className: 'nback-check' }, input, h('span', {}, label)), reason) };
}

function rawFallback(raw = {}) {
  return {
    ...DEFAULT_VALUE,
    ...raw,
    mode: Number(raw.mode ?? DEFAULT_VALUE.mode),
    n: Number(raw.n ?? DEFAULT_VALUE.n),
    trialCount: Number(raw.trialCount ?? DEFAULT_VALUE.trialCount),
    intervalMs: Number(raw.intervalMs ?? DEFAULT_VALUE.intervalMs),
    multiStim: Number(raw.multiStim ?? DEFAULT_VALUE.multiStim),
    interference: Number(raw.interference ?? DEFAULT_VALUE.interference),
    numberMax: Number(raw.numberMax ?? DEFAULT_VALUE.numberMax),
    operations: Array.isArray(raw.operations) ? [...raw.operations] : [...DEFAULT_VALUE.operations],
    selfPaced: bool(raw.selfPaced), adaptive: bool(raw.adaptive), variable: bool(raw.variable), crab: bool(raw.crab),
    allowNegative: bool(raw.allowNegative), allowFractions: bool(raw.allowFractions),
    scoreProfile: raw.scoreProfile === 'jaeggi' ? 'jaeggi' : 'workshop',
  };
}

export function describeNbackSettings(settings = {}) {
  let config;
  try { config = normalizeConfig(settings); } catch { config = rawFallback(settings); }
  const mode = modeById(config.mode);
  const flags = [];
  if (config.variable) flags.push('változó N');
  if (config.crab) flags.push('rák-léptetés');
  if (config.multiStim > 1) flags.push(`${config.multiStim} egyidejű tárgy`);
  if (config.adaptive) flags.push('alkalmazkodó');
  if (config.scoreProfile === 'jaeggi') flags.push('Jaeggi');
  return `${mode?.title || `${config.mode}. mód`} · ${config.n}-back · ${config.trialCount} értékelt lépés · ${config.selfPaced ? 'saját tempó' : `${config.intervalMs / 1000} mp`}${flags.length ? ` · ${flags.join(', ')}` : ''}`;
}

export function createNbackSettings({ h, value, onChange = () => {}, compact = false }) {
  loadCssOnce();
  let current = rawFallback(value);
  const modeSelect = h('select', { dataset: { setting: 'mode' }, 'aria-label': 'Feladattípus' });
  const groups = new Map();
  for (const mode of MODE_DEFINITIONS) {
    const name = familyLabel(mode.family);
    if (!groups.has(name)) { const group = h('optgroup', { label: name }); groups.set(name, group); modeSelect.append(group); }
    groups.get(name).append(h('option', { value: String(mode.id) }, mode.title));
  }

  const nInput = h('input', { type: 'number', min: '1', max: '20', step: '1', dataset: { setting: 'n' } });
  const trialInput = h('input', { type: 'number', min: '4', max: '200', step: '1', dataset: { setting: 'trialCount' } });
  const intervalInput = h('input', { type: 'number', min: '400', max: '10000', step: '100', dataset: { setting: 'intervalMs' } });
  const speedHelp = h('small', { className: 'nback-help' }, 'A teljes, természetes hangjel miatt a hangos és számolós feladatok lépésideje legalább 1200 ms.');
  const adaptive = createCheck(h, 'Alkalmazkodó nehézség (kikapcsolva: kézi N)', 'adaptive');
  const variable = createCheck(h, 'Változó N a körön belül', 'variable');
  const crab = createCheck(h, 'Rák-léptetés', 'crab');
  const selfPaced = createCheck(h, 'Saját tempó', 'selfPaced');
  const jaeggi = createCheck(h, 'Jaeggi-féle rögzített Dual', 'jaeggi');
  const multiSelect = h('select', { dataset: { setting: 'multiStim' } },
    ...[1, 2, 3, 4].map((count) => h('option', { value: String(count) }, count === 1 ? 'Egy tárgy' : `${count} tárgy egyszerre`)));
  const multiReason = h('small', { className: 'nback-disabled-reason', hidden: true });
  const identitySelect = h('select', { dataset: { setting: 'identity' } },
    h('option', { value: 'color' }, 'Szín azonosítja'), h('option', { value: 'image' }, 'Alakzat azonosítja'));
  const interferenceInput = h('input', { type: 'range', min: '0', max: '1', step: '0.125', dataset: { setting: 'interference' } });
  const interferenceValue = h('output', { className: 'nback-output' });

  const operations = ['+', '-', '*', '/'].map((op) => ({
    op, input: h('input', { type: 'checkbox', value: op, dataset: { operation: op } }),
  }));
  const operationsError = h('small', { className: 'nback-disabled-reason', hidden: true }, 'Legalább egy műveletet válassz.');
  const numberMax = h('input', { type: 'number', min: '1', max: '100', step: '1', dataset: { setting: 'numberMax' } });
  const negative = createCheck(h, 'Negatív számok is megjelenhetnek', 'allowNegative');
  const fractions = createCheck(h, 'Törtek és tizedesek', 'allowFractions');
  const arithmeticPanel = h('fieldset', { className: 'nback-settings-group' }, h('legend', {}, 'Számolás'),
    h('div', { className: 'nback-operation-list' }, ...operations.map(({ op, input }) => h('label', { className: 'nback-check nback-operation' }, input, h('span', {}, op)))),
    operationsError,
    createField(h, 'Legnagyobb szám', numberMax, '1 és 100 között.'), negative.element, fractions.element,
    h('p', { className: 'nback-help' }, 'A kijelzett N szerinti korábbi szám legyen a művelet első tagja. Kivonásnál a válasz negatív is lehet. Az osztó soha nem nulla; a törtek kikapcsolásával az osztás eredménye egész. Tört és pontos tizedes válasz egyaránt megadható.'));

  const rules = h('div', { className: 'nback-rules', 'aria-live': 'polite' });
  const validation = h('p', { className: 'nback-validation', role: 'alert', hidden: true });
  const easyButton = h('button', { type: 'button', className: 'secondary-button' }, 'Könnyű kezdés');
  const referenceButton = h('button', { type: 'button', className: 'secondary-button' }, 'Referencia-hossz');

  const element = h('section', { className: `nback-settings${compact ? ' nback-settings-compact' : ''}` },
    h('div', { className: 'nback-preset-row' }, easyButton, referenceButton),
    createField(h, 'Feladattípus', modeSelect),
    h('div', { className: 'nback-settings-columns' }, createField(h, 'N szint', nInput, '1–20'), createField(h, 'Értékelt lépések', trialInput, 'Egy kör ennyi értékelt és N bemelegítő lépésből áll.')),
    createField(h, 'Lépésidő (ms)', intervalInput), speedHelp,
    h('fieldset', { className: 'nback-settings-group' }, h('legend', {}, 'Tempó és értékelés'), adaptive.element, selfPaced.element, jaeggi.element),
    h('fieldset', { className: 'nback-settings-group' }, h('legend', {}, 'Haladó szabályok'), variable.element, crab.element,
      createField(h, 'Egyidejű tárgyak', multiSelect), multiReason,
      createField(h, 'Tárgyak megkülönböztetése', identitySelect),
      createField(h, 'Zavaró közeli egyezések', h('div', { className: 'nback-range-row' }, interferenceInput, interferenceValue), 'Nagyobb értéknél több majdnem jó egyezés jelenik meg.')),
    arithmeticPanel, rules, validation);

  const controls = { mode: modeSelect, n: nInput, trialCount: trialInput, intervalMs: intervalInput, multiStim: multiSelect, identity: identitySelect, interference: interferenceInput, numberMax };
  const checks = { adaptive, variable, crab, selfPaced, allowNegative: negative, allowFractions: fractions };

  function readRaw() {
    return {
      nbackVersion: 1,
      mode: Number(modeSelect.value), n: Number(nInput.value), trialCount: Number(trialInput.value), intervalMs: Number(intervalInput.value),
      selfPaced: selfPaced.input.checked, adaptive: adaptive.input.checked, variable: variable.input.checked, crab: crab.input.checked,
      multiStim: Number(multiSelect.value), identity: identitySelect.value, interference: Number(interferenceInput.value),
      scoreProfile: jaeggi.input.checked ? 'jaeggi' : 'workshop', operations: operations.filter(({ input }) => input.checked).map(({ op }) => op),
      numberMax: Number(numberMax.value), allowNegative: negative.input.checked, allowFractions: fractions.input.checked, lowScoreCount: 0,
    };
  }

  function setDisabled(check, disabled, reason) {
    check.input.disabled = disabled && !check.input.checked;
    check.reason.hidden = !disabled;
    check.reason.textContent = disabled ? reason : '';
  }

  function ruleText(config) {
    const mode = modeById(config.mode);
    const parts = [mode?.description || 'A mostani jelet hasonlítsd össze a korábbival.'];
    if (config.variable) parts.push('A kijelzett N megmutatja, milyen messzire kell visszanézni.');
    if (config.crab) parts.push('Az előző N elemű blokkot fordított sorrendben hasonlítod az újhoz.');
    if (config.multiStim > 1) parts.push(`Mind a ${config.multiStim} számozott tárgyat külön kövesd.`);
    if (config.selfPaced) parts.push('A jel a továbblépésig látszik; te léptetsz tovább.');
    if (config.interference > 0) parts.push('Lehetnek szándékosan megtévesztő, közeli ismétlések.');
    if (config.scoreProfile === 'jaeggi') parts.push('A Jaeggi-változat rögzített Dual sorozatot és csatornánkénti értékelést használ.');
    return parts.join(' ');
  }

  function refresh({ notify = true } = {}) {
    const raw = readRaw(), mode = modeById(raw.mode), multiAllowed = canMulti(mode);
    const variableCrabReason = 'A változó N és a rák-léptetés együtt nem támogatott.';
    setDisabled(variable, raw.crab||jaeggi.input.checked, jaeggi.input.checked?'Jaeggi módban a visszalépés rögzített.':variableCrabReason);
    setDisabled(crab, raw.variable||jaeggi.input.checked, jaeggi.input.checked?'Jaeggi módban nincs Crab-sorrend.':variableCrabReason);
    setDisabled(selfPaced,jaeggi.input.checked,'Jaeggi módban a lépések időzítése rögzített.');
    const jaeggiBlocked = raw.mode !== 2 || raw.trialCount !== 20 || raw.variable || raw.crab || raw.multiStim !== 1 || raw.selfPaced;
    setDisabled(jaeggi, jaeggiBlocked, 'A Jaeggi-változat csak 20 értékelt körös, rögzített és normál tempójú Dual módban használható.');
    multiSelect.querySelectorAll?.('option').forEach((option) => { option.disabled = Number(option.value) > 1 && (!multiAllowed||jaeggi.input.checked) && Number(option.value) !== raw.multiStim; });
    modeSelect.querySelectorAll?.('option').forEach(option=>{const candidate=modeById(option.value);option.disabled=Number(option.value)!==raw.mode&&((raw.multiStim>1&&!canMulti(candidate))||(jaeggi.input.checked&&Number(option.value)!==2));});
    trialInput.disabled=jaeggi.input.checked;
    referenceButton.disabled=jaeggi.input.checked;
    intervalInput.disabled=raw.selfPaced;
    const audible=hasChannel(mode,'audio')||hasChannel(mode,'audio2')||isArithmetic(mode);
    intervalInput.min=audible?'1200':'400';
    if(audible&&!raw.selfPaced&&raw.intervalMs<1200){raw.intervalMs=1200;intervalInput.value='1200';}
    interferenceInput.disabled=jaeggi.input.checked||(!hasPosition(mode)&&!hasChannel(mode,'audio')&&!hasChannel(mode,'color')&&!hasChannel(mode,'image')&&!isCombination(mode));
    multiReason.hidden = multiAllowed;
    multiReason.textContent = multiAllowed ? '' : 'Több egyidejű tárgy csak megfelelő pozíciós módban választható; számolással, kombinációval vagy szín+alak móddal nem.';
    identitySelect.disabled = raw.multiStim === 1;
    arithmeticPanel.hidden = !isArithmetic(mode);
    operationsError.hidden = raw.operations.length > 0;
    interferenceValue.textContent = `${(raw.interference * 100).toLocaleString('hu-HU')}%`;
    speedHelp.hidden = !audible;
    rules.replaceChildren(h('strong', {}, 'Röviden: '), document.createTextNode(ruleText(raw)));
    try { normalizeConfig(raw); validation.hidden = true; validation.textContent = ''; }
    catch (error) { validation.hidden = false; validation.textContent = error?.message || 'Ezt a beállításkombinációt nem lehet elindítani.'; }
    current = raw;
    if (notify) onChange(raw);
  }

  function setValue(next = {}) {
    current = rawFallback(next);
    for (const [key, control] of Object.entries(controls)) control.value = String(current[key]);
    for (const [key, check] of Object.entries(checks)) check.input.checked = !!current[key];
    jaeggi.input.checked = current.scoreProfile === 'jaeggi';
    for (const { op, input } of operations) input.checked = current.operations.includes(op);
    refresh({ notify: false });
  }

  function getValue() { return normalizeConfig(readRaw()); }

  element.addEventListener('change', () => refresh());
  element.addEventListener('input', (event) => {
    if (event.target === interferenceInput || event.target === intervalInput) refresh();
  });
  easyButton.addEventListener('click', () => { setValue(DEFAULT_VALUE); onChange(readRaw()); });
  referenceButton.addEventListener('click', () => {
    const next = readRaw(), count = 20 + next.n * next.n - next.n;
    if (count > 200) {
      validation.hidden = false;
      validation.textContent = `Ehhez az N szinthez a referencia-hossz ${count} kör lenne, de legfeljebb 200 választható.`;
      return;
    }
    trialInput.value = String(count); refresh();
  });
  setValue(current);
  return { element, getValue, setValue };
}
