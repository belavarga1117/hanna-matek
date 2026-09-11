const UINT32_MAX = 0xffffffff;
const VALUE_MIN = 1;
const VALUE_MAX = 8;
const GUARANTEED_MATCH_CHANCE = 0.125;
const MAX_SELF_PACED_RESPONSE_MS = 24 * 60 * 60 * 1000;
const MAX_ARITHMETIC_INPUT_LENGTH = 32;
const ACCEPTABLE_DIVISION_FRACTIONS = new Set([
  '1/10', '1/5', '3/10', '2/5', '1/2', '3/5', '7/10', '4/5', '9/10',
  '1/8', '1/4', '3/8', '5/8', '3/4', '7/8', '3/20', '7/20', '9/20',
  '11/20', '13/20', '17/20', '19/20',
]);

const mode = (id, title, channels, family, description) => Object.freeze({
  id,
  title,
  channels: Object.freeze(channels),
  family,
  description,
});

export const MODE_DEFINITIONS = Object.freeze([
  mode(2, 'Duál', ['position1', 'audio'], 'standard', 'Pozíció és hang.'),
  mode(3, 'Tripla', ['position1', 'color', 'audio'], 'standard', 'Pozíció, szín és hang.'),
  mode(4, 'Duál kombináció', ['visvis', 'visaudio', 'audiovis', 'audio'], 'combination', 'Vizuális és hanginger ön- és keresztirányú összevetése.'),
  mode(5, 'Tripla kombináció', ['position1', 'visvis', 'visaudio', 'audiovis', 'audio'], 'combination', 'Kombinációs feladat pozícióval.'),
  mode(6, 'Négyes kombináció', ['position1', 'visvis', 'visaudio', 'color', 'audiovis', 'audio'], 'combination', 'Kombinációs feladat pozícióval és színnel.'),
  mode(7, 'Aritmetika', ['arithmetic'], 'arithmetic', 'Az n-back szám és az aktuális szám műveleti eredménye.'),
  mode(8, 'Duál aritmetika', ['position1', 'arithmetic'], 'arithmetic', 'Pozíció és aritmetika.'),
  mode(9, 'Tripla aritmetika', ['position1', 'arithmetic', 'color'], 'arithmetic', 'Pozíció, aritmetika és szín.'),
  mode(10, 'Pozíció', ['position1'], 'single', 'Egy pozíciócsatorna.'),
  mode(11, 'Hang', ['audio'], 'single', 'Egy hangcsatorna.'),
  mode(12, 'Színes tripla kombináció', ['visvis', 'visaudio', 'color', 'audiovis', 'audio'], 'combination', 'Kombinációs feladat színnel.'),
  mode(20, 'Pozíció és szín', ['position1', 'color'], 'standard', 'Pozíció- és színcsatorna.'),
  mode(21, 'Pozíció és kép', ['position1', 'image'], 'standard', 'Pozíció- és képcsatorna.'),
  mode(22, 'Szín és hang', ['color', 'audio'], 'standard', 'Szín- és hangcsatorna.'),
  mode(23, 'Kép és hang', ['image', 'audio'], 'standard', 'Kép- és hangcsatorna.'),
  mode(24, 'Szín és kép', ['color', 'image'], 'standard', 'Szín- és képcsatorna.'),
  mode(25, 'Pozíció, szín és kép', ['position1', 'color', 'image'], 'standard', 'Három vizuális csatorna.'),
  mode(26, 'Pozíció, kép és hang', ['position1', 'image', 'audio'], 'standard', 'Pozíció, kép és hang.'),
  mode(27, 'Szín, kép és hang', ['color', 'image', 'audio'], 'standard', 'Szín, kép és hang.'),
  mode(28, 'Négyes', ['position1', 'color', 'image', 'audio'], 'standard', 'Pozíció, szín, kép és hang.'),
  mode(100, 'Két hang', ['audio', 'audio2'], 'dual-audio', 'Két külön hangcsatorna.'),
  mode(101, 'Pozíció és két hang', ['position1', 'audio', 'audio2'], 'dual-audio', 'Pozíció és két külön hangcsatorna.'),
  mode(102, 'Szín és két hang', ['color', 'audio', 'audio2'], 'dual-audio', 'Szín és két külön hangcsatorna.'),
  mode(103, 'Kép és két hang', ['image', 'audio', 'audio2'], 'dual-audio', 'Kép és két külön hangcsatorna.'),
  mode(104, 'Pozíció, szín és két hang', ['position1', 'color', 'audio', 'audio2'], 'dual-audio', 'Pozíció, szín és két külön hangcsatorna.'),
  mode(105, 'Pozíció, kép és két hang', ['position1', 'image', 'audio', 'audio2'], 'dual-audio', 'Pozíció, kép és két külön hangcsatorna.'),
  mode(106, 'Szín, kép és két hang', ['color', 'image', 'audio', 'audio2'], 'dual-audio', 'Szín, kép és két külön hangcsatorna.'),
  mode(107, 'Ötös', ['position1', 'color', 'image', 'audio', 'audio2'], 'dual-audio', 'Pozíció, szín, kép és két külön hangcsatorna.'),
]);

const MODE_BY_ID = new Map(MODE_DEFINITIONS.map((definition) => [definition.id, definition]));
const MULTI_BASE_MODES = new Set([2, 3, 10, 20, 21, 26, 101, 104, 105]);
const OPERATION_NAMES = Object.freeze({'+': 'összeadás', '-': 'kivonás', '*': 'szorzás', '/': 'osztás'});
const KNOWN_CONFIG_KEYS = new Set([
  'nbackVersion', 'mode', 'n', 'trialCount', 'intervalMs', 'selfPaced', 'adaptive',
  'variable', 'crab', 'multiStim', 'identity', 'interference', 'scoreProfile',
  'operations', 'numberMax', 'allowNegative', 'allowFractions', 'lowScoreCount',
]);

const DEFAULT_CONFIG = Object.freeze({
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
  operations: Object.freeze(['+', '-', '*', '/']),
  numberMax: 9,
  allowNegative: false,
  allowFractions: false,
  lowScoreCount: 0,
});

const CHANNEL_META = Object.freeze({
  position1: {label: 'Pozíció 1', key: 'A'},
  position2: {label: 'Pozíció 2', key: 'S'},
  position3: {label: 'Pozíció 3', key: 'D'},
  position4: {label: 'Pozíció 4', key: 'F'},
  color: {label: 'Szín', key: 'F'},
  image: {label: 'Kép', key: 'J'},
  audio: {label: 'Kimondott betű', key: 'L'},
  audio2: {label: 'Zongorahang', key: ';'},
  visvis: {label: 'Jel → korábbi jel', key: 'S'},
  visaudio: {label: 'Jel → korábbi hang', key: 'D'},
  audiovis: {label: 'Hang → korábbi jel', key: 'J'},
  arithmetic: {label: 'Aritmetika', key: 'Enter'},
  vis1: {label: 'Tárgyjel 1', key: 'G'},
  vis2: {label: 'Tárgyjel 2', key: 'H'},
  vis3: {label: 'Tárgyjel 3', key: 'J'},
  vis4: {label: 'Tárgyjel 4', key: 'K'},
});

function configError(message) {
  throw new Error(`Hibás N-back beállítás: ${message}`);
}

function answerError(message) {
  throw new Error(`Hibás N-back válasz: ${message}`);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value, expected, fail, label) {
  if (!isPlainObject(value)) fail(`${label} objektum legyen.`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail(`${label} mezői pontosan ezek legyenek: ${wanted.join(', ')}.`);
  }
}

function integerSetting(value, key, min, max) {
  const parsed = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    configError(`a(z) ${key} ${min} és ${max} közötti egész szám legyen.`);
  }
  return parsed;
}

function numberSetting(value, key, min, max) {
  const parsed = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    configError(`a(z) ${key} ${min} és ${max} közötti szám legyen.`);
  }
  return parsed;
}

function booleanSetting(value, key) {
  if (value === true || value === false) return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  configError(`a(z) ${key} csak igaz vagy hamis lehet.`);
}

function operationsSetting(value) {
  let operations = value;
  if (typeof operations === 'string') {
    const trimmed = operations.trim();
    if (trimmed.startsWith('[')) {
      try { operations = JSON.parse(trimmed); } catch { configError('az operations lista nem érvényes JSON.'); }
    } else {
      operations = trimmed.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  if (!Array.isArray(operations) || operations.length === 0) configError('legalább egy aritmetikai művelet szükséges.');
  if (operations.some((item) => !Object.hasOwn(OPERATION_NAMES, item))) configError('az operations csak +, -, * és / jeleket tartalmazhat.');
  if (new Set(operations).size !== operations.length) configError('az operations nem tartalmazhat ismétlést.');
  return [...operations];
}

export function normalizeConfig(raw = {}) {
  if (!isPlainObject(raw)) configError('a beállítások objektumként adhatók meg.');
  for (const key of Object.keys(raw)) if (!KNOWN_CONFIG_KEYS.has(key)) configError(`ismeretlen mező: ${key}.`);
  const supplied = (key) => raw[key] === undefined || raw[key] === null || raw[key] === '' ? DEFAULT_CONFIG[key] : raw[key];
  const config = {
    nbackVersion: integerSetting(supplied('nbackVersion'), 'nbackVersion', 1, 1),
    mode: integerSetting(supplied('mode'), 'mode', 2, 107),
    n: integerSetting(supplied('n'), 'n', 1, 20),
    trialCount: integerSetting(supplied('trialCount'), 'trialCount', 4, 200),
    intervalMs: integerSetting(supplied('intervalMs'), 'intervalMs', 400, 10000),
    selfPaced: booleanSetting(supplied('selfPaced'), 'selfPaced'),
    adaptive: booleanSetting(supplied('adaptive'), 'adaptive'),
    variable: booleanSetting(supplied('variable'), 'variable'),
    crab: booleanSetting(supplied('crab'), 'crab'),
    multiStim: integerSetting(supplied('multiStim'), 'multiStim', 1, 4),
    identity: String(supplied('identity')),
    interference: numberSetting(supplied('interference'), 'interference', 0, 1),
    scoreProfile: String(supplied('scoreProfile')),
    operations: operationsSetting(supplied('operations')),
    numberMax: integerSetting(supplied('numberMax'), 'numberMax', 1, 100),
    allowNegative: booleanSetting(supplied('allowNegative'), 'allowNegative'),
    allowFractions: booleanSetting(supplied('allowFractions'), 'allowFractions'),
    lowScoreCount: integerSetting(supplied('lowScoreCount'), 'lowScoreCount', 0, 2),
  };
  if (!MODE_BY_ID.has(config.mode)) configError(`ismeretlen forrásmód: ${config.mode}.`);
  if (!config.selfPaced && config.intervalMs < 1200 && MODE_BY_ID.get(config.mode).channels.some(id=>['audio','audio2','arithmetic'].includes(id))) configError('a teljes hangjelhez legalább 1200 ms lépésidő szükséges.');
  if (!['color', 'image'].includes(config.identity)) configError('az identity csak color vagy image lehet.');
  if (!['workshop', 'jaeggi'].includes(config.scoreProfile)) configError('a scoreProfile csak workshop vagy jaeggi lehet.');
  if (config.variable && config.crab) configError('a Variable és Crab mód együtt nem támogatott a Brain Workshop 5.0 hibás indexelése miatt.');
  if (config.multiStim > 1 && !MULTI_BASE_MODES.has(config.mode)) {
    configError('a Multi-stim csak aritmetika, Combination és egyidejű Color+Image nélküli pozíciómóddal használható.');
  }
  if (!config.adaptive && config.lowScoreCount !== 0) configError('kézi módban a lowScoreCount csak 0 lehet.');
  if (config.scoreProfile === 'jaeggi') {
    if (config.mode !== 2) configError('a Jaeggi profil csak a 2-es Dual móddal használható.');
    if (config.trialCount !== 20) configError('a Jaeggi profil pontosan 20 pontozott próbát használ.');
    if (config.variable || config.crab || config.multiStim !== 1 || config.selfPaced) {
      configError('a Jaeggi profil nem kombinálható Variable, Crab, Multi-stim vagy Self-paced móddal.');
    }
  }
  return config;
}

export const validateConfig = normalizeConfig;

export function channelsForConfig(rawConfig) {
  const config = normalizeConfig(rawConfig);
  let ids = [...MODE_BY_ID.get(config.mode).channels];
  if (config.multiStim > 1) {
    const positions = Array.from({length: config.multiStim}, (_, index) => `position${index + 1}`);
    const hasObjectFeature = ids.includes('color') || ids.includes('image');
    ids = ids.filter((id) => id !== 'position1' && id !== 'color' && id !== 'image');
    ids = [...positions, ...(hasObjectFeature ? Array.from({length: config.multiStim}, (_, index) => `vis${index + 1}`) : []), ...ids];
  }
  return ids.map((id) => Object.freeze({id, ...CHANNEL_META[id]}));
}

export function createSeededRandom(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > UINT32_MAX) throw new Error('A N-back seed 0 és 4294967295 közötti egész szám legyen.');
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function randomInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

function shuffled(values, rng) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function randomExcept(rng, excluded) {
  const value = randomInt(rng, VALUE_MIN, VALUE_MAX - 1);
  return value >= excluded ? value + 1 : value;
}

function randomSigned(rng, max, allowNegative) {
  return randomInt(rng, allowNegative ? -max : 0, max);
}

function shownBackForTrial(trialIndex, config, rng) {
  if (trialIndex < config.n) return null;
  if (config.crab) return 1 + 2 * (trialIndex % config.n);
  if (config.variable) {
    const betaAlpha = config.n / 2;
    const sample = Math.pow(Math.max(rng(), Number.EPSILON), 1 / betaAlpha);
    return Math.min(config.n, Math.floor(sample * config.n) + 1);
  }
  return config.n;
}

export function resolveTargetIndex(trialIndex, rawConfig, variableBack = null) {
  const config = normalizeConfig(rawConfig);
  if (!Number.isInteger(trialIndex) || trialIndex < 0 || trialIndex >= config.n + config.trialCount) {
    throw new Error('A trialIndex kívül esik az N-back sessionön.');
  }
  if (trialIndex < config.n) return null;
  let shownBack = config.n;
  if (config.crab) shownBack = 1 + 2 * (trialIndex % config.n);
  if (config.variable) {
    if (!Number.isInteger(variableBack) || variableBack < 1 || variableBack > config.n) {
      throw new Error('Variable módban az aktuális 1…N shownBack érték szükséges.');
    }
    shownBack = variableBack;
  }
  const targetIndex = trialIndex - shownBack;
  if (targetIndex < 0) throw new Error('A megadott összehasonlítási távolsághoz nincs korábbi próba.');
  return targetIndex;
}

function makeBaseStimuli(config, channelIds, rng) {
  const hasPosition = channelIds.some((id) => id.startsWith('position'));
  const count = hasPosition ? config.multiStim : 1;
  const positions = hasPosition ? shuffled(Array.from({length: 8}, (_, index) => index + 1), rng).slice(0, count) : [0];
  const objects = Array.from({length: count}, (_, index) => ({
    id: index + 1,
    position: positions[index],
    color: config.multiStim > 1 && config.identity === 'color' ? index + 1 : randomInt(rng, VALUE_MIN, VALUE_MAX),
    image: config.multiStim > 1 && config.identity === 'image' ? index + 1 : randomInt(rng, VALUE_MIN, VALUE_MAX),
  }));
  return {
    positions: [...positions],
    objects,
    color: channelIds.includes('color') ? randomInt(rng, VALUE_MIN, VALUE_MAX) : 0,
    image: channelIds.includes('image') ? randomInt(rng, VALUE_MIN, VALUE_MAX) : 0,
    visual: channelIds.some((id) => ['visvis', 'visaudio', 'audiovis'].includes(id)) ? randomInt(rng, VALUE_MIN, VALUE_MAX) : 0,
    audio: channelIds.includes('audio') || channelIds.includes('visaudio') ? randomInt(rng, VALUE_MIN, VALUE_MAX) : 0,
    audio2: channelIds.includes('audio2') ? randomInt(rng, VALUE_MIN, VALUE_MAX) : 0,
    number: channelIds.includes('arithmetic') ? randomSigned(rng, config.numberMax, config.allowNegative) : 0,
  };
}

function objectForChannel(stimuli, channel) {
  const id = Number(channel.at(-1));
  return stimuli.objects.find((object) => object.id === id);
}

function currentValue(trial, channel, config) {
  if (channel.startsWith('position')) return objectForChannel(trial.stimuli, channel)?.position;
  if (channel.startsWith('vis') && /^vis[1-4]$/.test(channel)) {
    const object = objectForChannel(trial.stimuli, channel);
    return config.identity === 'color' ? object?.image : object?.color;
  }
  if (channel === 'visvis' || channel === 'visaudio') return trial.stimuli.visual;
  if (channel === 'audiovis') return trial.stimuli.audio;
  return trial.stimuli[channel];
}

function targetValue(trial, channel, config) {
  if (channel.startsWith('position')) return objectForChannel(trial.stimuli, channel)?.position;
  if (channel.startsWith('vis') && /^vis[1-4]$/.test(channel)) {
    const object = objectForChannel(trial.stimuli, channel);
    return config.identity === 'color' ? object?.image : object?.color;
  }
  if (channel === 'visvis' || channel === 'audiovis') return trial.stimuli.visual;
  if (channel === 'visaudio') return trial.stimuli.audio;
  return trial.stimuli[channel];
}

function setCurrentValue(trial, channel, value, config) {
  if (channel.startsWith('position')) {
    const object = objectForChannel(trial.stimuli, channel);
    const collision = trial.stimuli.objects.find((candidate) => candidate.id !== object.id && candidate.position === value);
    if (collision) collision.position = object.position;
    object.position = value;
    trial.stimuli.positions = trial.stimuli.objects.map((candidate) => candidate.position);
    return;
  }
  if (channel.startsWith('vis') && /^vis[1-4]$/.test(channel)) {
    const object = objectForChannel(trial.stimuli, channel);
    object[config.identity === 'color' ? 'image' : 'color'] = value;
    return;
  }
  if (channel === 'visvis' || channel === 'visaudio') trial.stimuli.visual = value;
  else if (channel === 'audiovis') trial.stimuli.audio = value;
  else trial.stimuli[channel] = value;
}

function generateArithmeticNumber(config, operation, targetTrial, rng) {
  if (operation !== '/' || !targetTrial) return randomSigned(rng, config.numberMax, config.allowNegative);
  const numerator = targetTrial.stimuli.number;
  const candidates = [];
  for (let value = config.allowNegative ? -config.numberMax : 1; value <= config.numberMax; value += 1) {
    if (value === 0) continue;
    const remainder = Math.abs(numerator) % Math.abs(value);
    if (remainder === 0) {
      candidates.push(value);
      continue;
    }
    if (config.allowFractions) {
      const fraction = rational(BigInt(remainder), BigInt(Math.abs(value)));
      if (ACCEPTABLE_DIVISION_FRACTIONS.has(rationalText(fraction))) candidates.push(value);
    }
  }
  return candidates[randomInt(rng, 0, candidates.length - 1)];
}

function applyReferenceMatching(trials, trial, channelIds, config, rng) {
  if (trial.warmup) return;
  for (const channel of channelIds) {
    if (channel === 'arithmetic') continue;
    const forcedRoll = rng();
    let sourceIndex = null;
    if (forcedRoll < GUARANTEED_MATCH_CHANCE) {
      sourceIndex = trial.targetIndex;
    } else {
      let interferenceRoll = rng();
      if (config.multiStim > 1) interferenceRoll *= 1.5;
      if (interferenceRoll < config.interference && config.n > 1) {
        const lags = [trial.shownBack - 1, trial.shownBack + 1, trial.shownBack + config.n];
        if (trial.shownBack < 3) lags.shift();
        for (const lag of shuffled(lags, rng)) {
          const candidateIndex = trial.index - lag;
          if (candidateIndex >= 0 && targetValue(trials[candidateIndex], channel, config) !== targetValue(trials[trial.targetIndex], channel, config)) {
            sourceIndex = candidateIndex;
          }
        }
      }
    }
    if (sourceIndex !== null) setCurrentValue(trial, channel, targetValue(trials[sourceIndex], channel, config), config);
  }
  if (config.multiStim > 1 && rng() < config.interference / 3) {
    const hasVisualObjects = channelIds.some((channel) => /^vis[1-4]$/.test(channel));
    const rotateVisual = hasVisualObjects && rng() < 0.5;
    const offset = randomInt(rng, 1, config.multiStim - 1);
    const sourceObjects = trials[trial.targetIndex].stimuli.objects;
    for (let index = 0; index < config.multiStim; index += 1) {
      const source = sourceObjects[(index + offset) % config.multiStim];
      const destination = trial.stimuli.objects[index];
      if (rotateVisual) destination[config.identity === 'color' ? 'image' : 'color'] = source[config.identity === 'color' ? 'image' : 'color'];
      else destination.position = source.position;
    }
    trial.stimuli.positions = trial.stimuli.objects.map((object) => object.position);
  }
}

function applyJaeggiSequence(trials, config, rng) {
  const scored = trials.filter((trial) => !trial.warmup).map((trial) => trial.index);
  const positionMatches = new Set(shuffled(scored, rng).slice(0, 6));
  const shared = shuffled([...positionMatches], rng).slice(0, 2);
  const audioOnlyPool = scored.filter((index) => !positionMatches.has(index));
  const audioMatches = new Set([...shared, ...shuffled(audioOnlyPool, rng).slice(0, 4)]);
  for (const [channel, matches] of [['position1', positionMatches], ['audio', audioMatches]]) {
    for (const trial of trials) {
      if (trial.warmup) continue;
      const target = trials[trial.targetIndex];
      const expected = targetValue(target, channel, config);
      const value = matches.has(trial.index) ? expected : randomExcept(rng, expected);
      setCurrentValue(trial, channel, value, config);
    }
  }
}

export function generateSession({seed, config: rawConfig}) {
  const config = normalizeConfig(rawConfig);
  const rng = createSeededRandom(seed);
  const channels = channelsForConfig(config);
  const channelIds = channels.map((channel) => channel.id);
  const trials = [];
  const total = config.n + config.trialCount;
  for (let index = 0; index < total; index += 1) {
    const shownBack = shownBackForTrial(index, config, rng);
    const targetIndex = shownBack === null ? null : index - shownBack;
    const stimuli = makeBaseStimuli(config, channelIds, rng);
    const operation = channelIds.includes('arithmetic') ? config.operations[randomInt(rng, 0, config.operations.length - 1)] : null;
    if (operation) stimuli.number = generateArithmeticNumber(config, operation, targetIndex === null ? null : trials[targetIndex], rng);
    const trial = {index, shownBack, targetIndex, warmup: index < config.n, stimuli, operation};
    trials.push(trial);
    if (config.scoreProfile !== 'jaeggi') applyReferenceMatching(trials, trial, channelIds, config, rng);
  }
  if (config.scoreProfile === 'jaeggi') {
    applyJaeggiSequence(trials, config, rng);
  }
  return {version: 1, seed, config, channels, trials};
}

function gcd(left, right) {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b) [a, b] = [b, a % b];
  return a || 1n;
}

function rational(numerator, denominator = 1n) {
  if (denominator === 0n) throw new Error('Nullával nem lehet osztani.');
  const sign = denominator < 0n ? -1n : 1n;
  const divisor = gcd(numerator, denominator);
  const n = numerator / divisor * sign;
  const d = denominator / divisor * sign;
  return {numerator: n, denominator: d};
}

function parseRational(value) {
  if (typeof value === 'string' && value.length > MAX_ARITHMETIC_INPUT_LENGTH) answerError(`az aritmetikai value legfeljebb ${MAX_ARITHMETIC_INPUT_LENGTH} karakter lehet.`);
  if (typeof value !== 'string' || !/^[+-]?(?:\d+(?:\.\d+)?|\d+\/\d+)$/.test(value)) answerError('az aritmetikai value előjeles tizedes vagy tört szöveg legyen.');
  if (value.includes('/')) {
    const [left, right] = value.split('/');
    if (BigInt(right) === 0n) answerError('az aritmetikai tört nevezője nem lehet nulla.');
    return rational(BigInt(left), BigInt(right));
  }
  const negative = value.startsWith('-');
  const unsigned = value.replace(/^[+-]/, '');
  const [whole, decimals = ''] = unsigned.split('.');
  const denominator = 10n ** BigInt(decimals.length);
  const numerator = BigInt(`${whole}${decimals}`) * (negative ? -1n : 1n);
  return rational(numerator, denominator);
}

function rationalText(value) {
  return value.denominator === 1n ? String(value.numerator) : `${value.numerator}/${value.denominator}`;
}

export function evaluateArithmetic(left, operation, right) {
  if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right)) throw new Error('Az aritmetikai operandusok biztonságos egész számok legyenek.');
  if (!Object.hasOwn(OPERATION_NAMES, operation)) throw new Error('Ismeretlen aritmetikai művelet.');
  let value;
  if (operation === '+') value = rational(BigInt(left + right));
  if (operation === '-') value = rational(BigInt(left - right));
  if (operation === '*') value = rational(BigInt(left) * BigInt(right));
  if (operation === '/') value = rational(BigInt(left), BigInt(right));
  return Object.freeze({numerator: Number(value.numerator), denominator: Number(value.denominator), text: rationalText(value)});
}

function sameRational(expected, actual) {
  return BigInt(expected.numerator) * actual.denominator === actual.numerator * BigInt(expected.denominator);
}

function validateSession(session) {
  if (!isPlainObject(session) || session.version !== 1) throw new Error('Érvénytelen N-back sessionverzió.');
  const config = normalizeConfig(session.config);
  createSeededRandom(session.seed);
  if (!Array.isArray(session.trials) || session.trials.length !== config.n + config.trialCount) throw new Error('Az N-back próbasor hossza nem egyezik a beállítással.');
  const channelIds = channelsForConfig(config).map((channel) => channel.id);
  for (let index = 0; index < session.trials.length; index += 1) {
    const trial = session.trials[index];
    if (!isPlainObject(trial) || trial.index !== index) throw new Error(`Érvénytelen N-back próbaindex: ${index}.`);
    const warmup = index < config.n;
    if (trial.warmup !== warmup) throw new Error(`A(z) ${index}. próba warmup jelölése hibás.`);
    if (warmup) {
      if (trial.targetIndex !== null || trial.shownBack !== null) throw new Error(`A(z) ${index}. warmup próbának nem lehet célindexe.`);
    } else {
      const expectedTarget = resolveTargetIndex(index, config, config.variable ? trial.shownBack : null);
      const expectedBack = index - expectedTarget;
      if (trial.targetIndex !== expectedTarget || trial.shownBack !== expectedBack) throw new Error(`A(z) ${index}. próba targetIndex/shownBack értéke hibás.`);
    }
    if (!isPlainObject(trial.stimuli) || !Array.isArray(trial.stimuli.objects) || !Array.isArray(trial.stimuli.positions)) throw new Error(`A(z) ${index}. próba ingerei hiányosak.`);
    const expectedObjects = channelIds.some((id) => id.startsWith('position')) ? config.multiStim : 1;
    if (trial.stimuli.objects.length !== expectedObjects) throw new Error(`A(z) ${index}. próba tárgyszáma hibás.`);
    const ids = trial.stimuli.objects.map((object) => object.id);
    if (ids.some((id, objectIndex) => id !== objectIndex + 1)) throw new Error(`A(z) ${index}. próba tárgyazonosítója hibás.`);
    for (const object of trial.stimuli.objects) {
      if (!Number.isInteger(object.position) || object.position < 0 || object.position > 8 || !Number.isInteger(object.color) || object.color < 1 || object.color > 8 || !Number.isInteger(object.image) || object.image < 1 || object.image > 8) throw new Error(`A(z) ${index}. próba tárgyingere hibás.`);
    }
    if (new Set(trial.stimuli.objects.map((object) => object.position)).size !== trial.stimuli.objects.length) throw new Error(`A(z) ${index}. próbában két tárgy azonos helyen van.`);
    if (trial.stimuli.positions.length !== trial.stimuli.objects.length || trial.stimuli.positions.some((position, positionIndex) => position !== trial.stimuli.objects[positionIndex].position)) throw new Error(`A(z) ${index}. próba positions mezője nem követi a tárgyakat.`);
    for (const key of ['color', 'image', 'visual', 'audio', 'audio2', 'number']) if (!Number.isSafeInteger(trial.stimuli[key])) throw new Error(`A(z) ${index}. próba ${key} ingere hibás.`);
    if (channelIds.includes('arithmetic')) {
      if (!Object.hasOwn(OPERATION_NAMES, trial.operation)) throw new Error(`A(z) ${index}. próba művelete hibás.`);
      if (!warmup && trial.operation === '/' && trial.stimuli.number === 0) throw new Error(`A(z) ${index}. próbában nulla az osztó.`);
    } else if (trial.operation !== null) throw new Error(`A(z) ${index}. nem aritmetikai próbának nem lehet művelete.`);
  }
  return {config, channelIds};
}

export function isChannelMatch(session, trialIndex, channel) {
  const {config, channelIds} = validateSession(session);
  if (!channelIds.includes(channel) || channel === 'arithmetic') throw new Error('Ehhez a csatornához nincs bináris match-cél.');
  const trial = session.trials[trialIndex];
  if (!trial || trial.warmup) return false;
  const target = session.trials[trial.targetIndex];
  return currentValue(trial, channel, config) === targetValue(target, channel, config);
}

function normalizeAnswer(session, answer, config, channelIds) {
  exactKeys(answer, ['version', 'events'], answerError, 'a válasz');
  if (answer.version !== 1) answerError('a version csak 1 lehet.');
  if (!Array.isArray(answer.events)) answerError('az events tömb legyen.');
  const maximum = Math.min(5000, session.trials.length * Math.max(channelIds.length, 1) * 8);
  if (answer.events.length > maximum) answerError(`az events legfeljebb ${maximum} elemet tartalmazhat.`);
  const byTrialAndChannel = new Map();
  for (let eventIndex = 0; eventIndex < answer.events.length; eventIndex += 1) {
    const event = answer.events[eventIndex];
    exactKeys(event, ['trialIndex', 'channel', 'atMs', 'value'], answerError, `events[${eventIndex}]`);
    if (!Number.isInteger(event.trialIndex) || event.trialIndex < 0 || event.trialIndex >= session.trials.length) answerError(`events[${eventIndex}].trialIndex kívül esik a sessionön.`);
    if (!channelIds.includes(event.channel)) answerError(`events[${eventIndex}].channel nem aktív csatorna.`);
    const limit = config.selfPaced ? MAX_SELF_PACED_RESPONSE_MS : config.intervalMs;
    if (!Number.isFinite(event.atMs) || event.atMs < 0 || event.atMs > limit) answerError(`events[${eventIndex}].atMs kívül esik az érvényes próbaablakon.`);
    const key = `${event.trialIndex}|${event.channel}`;
    if (event.channel === 'arithmetic') {
      const parsed = parseRational(event.value);
      byTrialAndChannel.set(key, {event, parsed});
    } else {
      if (event.value !== true) answerError(`events[${eventIndex}].value match-csatornán csak true lehet.`);
      if (!byTrialAndChannel.has(key)) byTrialAndChannel.set(key, {event});
    }
  }
  return byTrialAndChannel;
}

function emptyCounts(channel) {
  return {id: channel.id, label: channel.label, hits: 0, falseAlarms: 0, misses: 0, correctRejections: 0, percent: 0};
}

function classifyMatch(expected, responded) {
  if (expected && responded) return 'hit';
  if (!expected && responded) return 'falseAlarm';
  if (expected) return 'miss';
  return 'correctRejection';
}

function addClassification(counts, classification) {
  if (classification === 'hit') counts.hits += 1;
  if (classification === 'falseAlarm') counts.falseAlarms += 1;
  if (classification === 'miss') counts.misses += 1;
  if (classification === 'correctRejection') counts.correctRejections += 1;
}

function channelPercent(counts, profile) {
  if (profile === 'jaeggi') {
    const total = counts.hits + counts.falseAlarms + counts.misses + counts.correctRejections;
    return total ? Math.floor(100 * (counts.hits + counts.correctRejections) / total) : 0;
  }
  const total = counts.hits + counts.falseAlarms + counts.misses;
  return total ? Math.floor(100 * counts.hits / total) : 0;
}

export function adaptLevel({n, percent, adaptive = true, scoreProfile = 'workshop', lowScoreCount = 0}) {
  if (!Number.isInteger(n) || n < 1 || n > 20) throw new Error('Az adaptáció N-szintje 1 és 20 közötti egész szám legyen.');
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw new Error('Az adaptáció százaléka 0 és 100 közötti szám legyen.');
  if (!Number.isInteger(lowScoreCount) || lowScoreCount < 0 || lowScoreCount > 2) throw new Error('A lowScoreCount 0 és 2 közötti egész szám legyen.');
  if (!['workshop', 'jaeggi'].includes(scoreProfile)) throw new Error('Ismeretlen adaptációs pontozási profil.');
  if (!adaptive) return {fromN: n, nextN: n, lowScoreCount: 0, action: 'manual'};
  const advance = scoreProfile === 'jaeggi' ? 90 : 80;
  const fallback = scoreProfile === 'jaeggi' ? 75 : 50;
  if (percent >= advance) return {fromN: n, nextN: Math.min(20, n + 1), lowScoreCount: 0, action: n < 20 ? 'up' : 'stay'};
  if (percent < fallback && n > 1) {
    if (scoreProfile === 'jaeggi' || lowScoreCount === 2) return {fromN: n, nextN: n - 1, lowScoreCount: 0, action: 'down'};
    return {fromN: n, nextN: n, lowScoreCount: lowScoreCount + 1, action: 'stay'};
  }
  return {fromN: n, nextN: n, lowScoreCount: n === 1 && percent < fallback ? 0 : lowScoreCount, action: 'stay'};
}

export function scoreSession(session, answer, options = {}) {
  const {config, channelIds} = validateSession(session);
  if (!isPlainObject(options)) throw new Error('Az N-back pontozási options objektum legyen.');
  for (const key of Object.keys(options)) if (key !== 'lowScoreCount') throw new Error(`Ismeretlen N-back pontozási opció: ${key}.`);
  const priorLowScoreCount = options.lowScoreCount === undefined ? config.lowScoreCount : options.lowScoreCount;
  if (!Number.isInteger(priorLowScoreCount) || priorLowScoreCount < 0 || priorLowScoreCount > 2) throw new Error('A megbízható lowScoreCount 0 és 2 közötti egész szám legyen.');
  const responses = normalizeAnswer(session, answer, config, channelIds);
  const channels = channelsForConfig(config);
  const metricsById = new Map(channels.map((channel) => [channel.id, emptyCounts(channel)]));
  const details = [];
  for (const trial of session.trials) {
    if (trial.warmup) continue;
    const target = session.trials[trial.targetIndex];
    for (const channel of channelIds) {
      const response = responses.get(`${trial.index}|${channel}`);
      let classification;
      let expected;
      let actual;
      if (channel === 'arithmetic') {
        expected = evaluateArithmetic(target.stimuli.number, trial.operation, trial.stimuli.number);
        actual = response?.event.value ?? null;
        if (!response) classification = 'miss';
        else classification = sameRational(expected, response.parsed) ? 'hit' : 'falseAlarm';
      } else {
        expected = currentValue(trial, channel, config) === targetValue(target, channel, config);
        actual = Boolean(response);
        classification = classifyMatch(expected, actual);
      }
      addClassification(metricsById.get(channel), classification);
      details.push({
        trialIndex: trial.index,
        targetIndex: trial.targetIndex,
        channel,
        expected: channel === 'arithmetic' ? expected.text : expected,
        actual,
        correct: classification === 'hit' || classification === 'correctRejection',
        classification,
      });
    }
  }
  const channelMetrics = channels.map((channel) => {
    const counts = metricsById.get(channel.id);
    counts.percent = channelPercent(counts, config.scoreProfile);
    return counts;
  });
  const totals = channelMetrics.reduce((sum, current) => ({
    hits: sum.hits + current.hits,
    falseAlarms: sum.falseAlarms + current.falseAlarms,
    misses: sum.misses + current.misses,
    correctRejections: sum.correctRejections + current.correctRejections,
  }), {hits: 0, falseAlarms: 0, misses: 0, correctRejections: 0});
  const workshopTotal = totals.hits + totals.falseAlarms + totals.misses;
  const allTotal = workshopTotal + totals.correctRejections;
  const percent = config.scoreProfile === 'jaeggi'
    ? Math.min(...channelMetrics.map((channel) => channel.percent))
    : workshopTotal ? Math.floor(100 * totals.hits / workshopTotal) : 0;
  const correct = config.scoreProfile === 'jaeggi' ? totals.hits + totals.correctRejections : totals.hits;
  const total = Math.max(1, config.scoreProfile === 'jaeggi' ? allTotal : workshopTotal);
  const adaptation = adaptLevel({n: config.n, percent, adaptive: config.adaptive, scoreProfile: config.scoreProfile, lowScoreCount: priorLowScoreCount});
  return {
    correct,
    total,
    percent,
    summary: `${percent}% — ${totals.hits} találat, ${totals.falseAlarms} téves jelzés, ${totals.misses} kihagyás.`,
    details,
    stars: null,
    starBasis: 'brainworkshop-no-stars',
    metrics: {
      version: 1,
      mode: config.mode,
      n: config.n,
      scoreProfile: config.scoreProfile,
      trialCount: config.trialCount,
      channels: channelMetrics,
      totals,
      adaptation,
    },
  };
}
