const CONTRACT_VERSION = 1;
const PROTOCOL_VERSION = 1;
const MAX_EVENTS = 4096;

export const COGNITIVE_GAME_IDS = Object.freeze([
  'spatial-span',
  'digit-span',
  'picture-place',
  'complex-span',
  'recognition',
  'attention-nogo',
  'active-recall',
]);

export const COGNITIVE_PROTOCOLS = Object.freeze({
  'spatial-span': 'hanna-spatial-span-v1',
  'digit-span': 'hanna-digit-span-v1',
  'picture-place': 'hanna-picture-place-v1',
  'complex-span': 'hanna-complex-span-v1',
  recognition: 'hanna-recognition-v1',
  'attention-nogo': 'hanna-attention-nogo-v1',
  'active-recall': 'hanna-active-recall-v1',
});

export const DIGIT_AUDIO_MANIFEST_VERSION = 'hu-digits-v1';
export const DIGIT_AUDIO_TOKENS = Object.freeze(Array.from({length: 10}, (_, digit) => Object.freeze({
  id: `digit-${digit}`,
  digit,
  text: String(digit),
  manifestVersion: DIGIT_AUDIO_MANIFEST_VERSION,
})));

const COMMON_KEYS = ['contractVersion', 'protocolId', 'protocolVersion', 'mode', 'inputModality', 'language'];
const FAMILY_KEYS = Object.freeze({
  'spatial-span': ['minLength', 'maxLength', 'sequencesPerLength', 'gridSize', 'stimulusMs', 'interstimulusMs', 'responseWindowMs', 'stimulusSetVersion'],
  'digit-span': ['minLength', 'maxLength', 'sequencesPerLength', 'digitMs', 'interdigitMs', 'responseWindowMs', 'audioSetVersion'],
  'picture-place': ['itemCount', 'gridSize', 'learningRounds', 'studyMs', 'responseWindowMs', 'delayedMinimumMs', 'stimulusSetVersion'],
  'complex-span': ['setSizes', 'sequencesPerSize', 'gridSize', 'memoryItemMs', 'processingWindowMs', 'responseWindowMs', 'stimulusSetVersion'],
  recognition: ['studyCount', 'testCount', 'oldRatio', 'studyMs', 'responseWindowMs', 'stimulusSetVersion'],
  'attention-nogo': ['trialCount', 'goRatio', 'stimulusMs', 'intertrialMs', 'responseWindowMs', 'stimulusSetVersion'],
  'active-recall': ['questions', 'reviewRound', 'reviewDelayMinutes', 'scheduledAt', 'availableAt', 'stimulusSetVersion'],
});

const DEFAULTS = Object.freeze({
  'spatial-span': {minLength: 2, maxLength: 7, sequencesPerLength: 2, gridSize: 9, stimulusMs: 700, interstimulusMs: 250, responseWindowMs: 15000, stimulusSetVersion: 'spatial-grid-v1'},
  'digit-span': {minLength: 2, maxLength: 8, sequencesPerLength: 2, digitMs: 650, interdigitMs: 350, responseWindowMs: 15000, audioSetVersion: DIGIT_AUDIO_MANIFEST_VERSION},
  'picture-place': {itemCount: 8, gridSize: 12, learningRounds: 2, studyMs: 12000, responseWindowMs: 10000, delayedMinimumMs: 60000, stimulusSetVersion: 'picture-place-items-v1'},
  'complex-span': {setSizes: [3, 4, 5], sequencesPerSize: 2, gridSize: 9, memoryItemMs: 800, processingWindowMs: 5000, responseWindowMs: 15000, stimulusSetVersion: 'complex-span-shapes-v1'},
  recognition: {studyCount: 8, testCount: 16, oldRatio: 0.5, studyMs: 10000, responseWindowMs: 4000, stimulusSetVersion: 'recognition-pictures-v1'},
  'attention-nogo': {trialCount: 40, goRatio: 0.75, stimulusMs: 500, intertrialMs: 1000, responseWindowMs: 900, stimulusSetVersion: 'attention-symbols-v1'},
  'active-recall': {questions: [], reviewRound: 'initial', reviewDelayMinutes: 1440, scheduledAt: null, availableAt: null, stimulusSetVersion: 'teacher-content-v1'},
});

const PICTURE_IDS = Object.freeze(['alma', 'bicikli', 'ceruza', 'dob', 'ecset', 'fa', 'gomba', 'hajo', 'inga', 'kancso', 'labda', 'maci', 'nap', 'ora', 'pohar', 'robot']);
const RECOGNITION_IDS = Object.freeze(Array.from({length: 32}, (_, index) => `picture-${String(index + 1).padStart(2, '0')}`));
const ATTENTION_SYMBOLS = Object.freeze(['kor', 'haromszog', 'negyzet', 'csillag']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invalid(message) {
  throw new TypeError(`Hibás kognitív adat: ${message}`);
}

function exactObject(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(`${label} objektum legyen`);
  const actual = Object.keys(value).sort();
  const allowed = [...keys].sort();
  if (actual.some((key) => !allowed.includes(key))) invalid(`${label} ismeretlen mezőt tartalmaz`);
  return value;
}

function integer(value, label, min, max) {
  const parsed = typeof value === 'string' && /^-?\d+$/.test(value) ? Number(value) : value;
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) invalid(`${label} ${min} és ${max} közötti egész legyen`);
  return parsed;
}

function finiteNumber(value, label, min, max) {
  const parsed = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) invalid(`${label} ${min} és ${max} közötti szám legyen`);
  return parsed;
}

function enumValue(value, allowed, label) {
  if (!allowed.includes(value)) invalid(`${label} értéke nem támogatott`);
  return value;
}

function stringValue(value, label, {min = 1, max = 200} = {}) {
  if (typeof value !== 'string') invalid(`${label} szöveg legyen`);
  const result = value.trim();
  if (result.length < min || result.length > max) invalid(`${label} hossza ${min}–${max} karakter legyen`);
  return result;
}

function nullableIso(value, label) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) invalid(`${label} érvényes ISO-időpont legyen`);
  return new Date(value).toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function isCognitiveGame(gameId) {
  return COGNITIVE_GAME_IDS.includes(gameId);
}

function commonSettings(gameId, raw) {
  if (!isCognitiveGame(gameId)) throw new RangeError(`Ismeretlen kognitív játék: ${String(gameId)}`);
  exactObject(raw, [...COMMON_KEYS, ...FAMILY_KEYS[gameId]], 'settings');
  const contractVersion = raw.contractVersion === undefined ? CONTRACT_VERSION : integer(raw.contractVersion, 'contractVersion', 1, 1);
  const protocolId = raw.protocolId === undefined ? COGNITIVE_PROTOCOLS[gameId] : stringValue(raw.protocolId, 'protocolId');
  if (protocolId !== COGNITIVE_PROTOCOLS[gameId]) invalid('a protocolId nem egyezik a játék rögzített protokolljával');
  const protocolVersion = raw.protocolVersion === undefined ? PROTOCOL_VERSION : integer(raw.protocolVersion, 'protocolVersion', 1, 1);
  const mode = enumValue(raw.mode ?? 'assessment', ['practice', 'assessment'], 'mode');
  const inputModality = enumValue(raw.inputModality ?? 'touch', ['touch', 'mouse', 'keyboard', 'mixed'], 'inputModality');
  const language = stringValue(raw.language ?? 'hu-HU', 'language', {min: 2, max: 20});
  return {contractVersion, protocolId, protocolVersion, mode, inputModality, language};
}

function normalizeQuestions(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) invalid('questions 1–50 elemű lista legyen');
  const ids = new Set();
  return value.map((entry, index) => {
    exactObject(entry, ['questionId', 'question', 'learningExplanation'], `questions[${index}]`);
    const questionId = stringValue(entry.questionId, `questions[${index}].questionId`, {max: 80});
    if (ids.has(questionId)) invalid('a questionId értékek legyenek egyediek');
    ids.add(questionId);
    const question = stringValue(entry.question, `questions[${index}].question`, {max: 500});
    const learningExplanation = entry.learningExplanation === undefined ? '' : stringValue(entry.learningExplanation, `questions[${index}].learningExplanation`, {min: 0, max: 2000});
    return {questionId, question, learningExplanation};
  });
}

export function normalizeCognitiveSettings(gameId, raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) invalid('settings objektum legyen');
  const common = commonSettings(gameId, raw);
  const defaults = DEFAULTS[gameId];
  if (gameId === 'spatial-span') {
    const minLength = integer(raw.minLength ?? defaults.minLength, 'minLength', 2, 7);
    const maxLength = integer(raw.maxLength ?? defaults.maxLength, 'maxLength', minLength, 9);
    return {...common, minLength, maxLength, sequencesPerLength: integer(raw.sequencesPerLength ?? defaults.sequencesPerLength, 'sequencesPerLength', 2, 2), gridSize: integer(raw.gridSize ?? defaults.gridSize, 'gridSize', maxLength, 16), stimulusMs: integer(raw.stimulusMs ?? defaults.stimulusMs, 'stimulusMs', 300, 3000), interstimulusMs: integer(raw.interstimulusMs ?? defaults.interstimulusMs, 'interstimulusMs', 100, 2000), responseWindowMs: integer(raw.responseWindowMs ?? defaults.responseWindowMs, 'responseWindowMs', 3000, 60000), stimulusSetVersion: stringValue(raw.stimulusSetVersion ?? defaults.stimulusSetVersion, 'stimulusSetVersion', {max: 80})};
  }
  if (gameId === 'digit-span') {
    const minLength = integer(raw.minLength ?? defaults.minLength, 'minLength', 2, 7);
    const maxLength = integer(raw.maxLength ?? defaults.maxLength, 'maxLength', minLength, 12);
    const audioSetVersion = stringValue(raw.audioSetVersion ?? defaults.audioSetVersion, 'audioSetVersion', {max: 80});
    if (audioSetVersion !== DIGIT_AUDIO_MANIFEST_VERSION) invalid(`audioSetVersion értéke ${DIGIT_AUDIO_MANIFEST_VERSION} legyen`);
    return {...common, minLength, maxLength, sequencesPerLength: integer(raw.sequencesPerLength ?? defaults.sequencesPerLength, 'sequencesPerLength', 2, 2), digitMs: integer(raw.digitMs ?? defaults.digitMs, 'digitMs', 300, 3000), interdigitMs: integer(raw.interdigitMs ?? defaults.interdigitMs, 'interdigitMs', 100, 2000), responseWindowMs: integer(raw.responseWindowMs ?? defaults.responseWindowMs, 'responseWindowMs', 3000, 60000), audioSetVersion};
  }
  if (gameId === 'picture-place') {
    const itemCount = integer(raw.itemCount ?? defaults.itemCount, 'itemCount', 4, PICTURE_IDS.length);
    return {...common, itemCount, gridSize: integer(raw.gridSize ?? defaults.gridSize, 'gridSize', itemCount, 24), learningRounds: integer(raw.learningRounds ?? defaults.learningRounds, 'learningRounds', 2, 2), studyMs: integer(raw.studyMs ?? defaults.studyMs, 'studyMs', 3000, 60000), responseWindowMs: integer(raw.responseWindowMs ?? defaults.responseWindowMs, 'responseWindowMs', 2000, 60000), delayedMinimumMs: integer(raw.delayedMinimumMs ?? defaults.delayedMinimumMs, 'delayedMinimumMs', 60000, 86400000), stimulusSetVersion: stringValue(raw.stimulusSetVersion ?? defaults.stimulusSetVersion, 'stimulusSetVersion', {max: 80})};
  }
  if (gameId === 'complex-span') {
    const rawSizes = raw.setSizes ?? defaults.setSizes;
    if (!Array.isArray(rawSizes) || rawSizes.length < 1 || rawSizes.length > 5) invalid('setSizes 1–5 elemű lista legyen');
    const setSizes = rawSizes.map((value, index) => integer(value, `setSizes[${index}]`, 2, 8));
    if (new Set(setSizes).size !== setSizes.length || setSizes.some((value, index) => index && value <= setSizes[index - 1])) invalid('setSizes szigorúan növekvő, egyedi lista legyen');
    return {...common, setSizes, sequencesPerSize: integer(raw.sequencesPerSize ?? defaults.sequencesPerSize, 'sequencesPerSize', 1, 3), gridSize: integer(raw.gridSize ?? defaults.gridSize, 'gridSize', Math.max(...setSizes), 16), memoryItemMs: integer(raw.memoryItemMs ?? defaults.memoryItemMs, 'memoryItemMs', 300, 3000), processingWindowMs: integer(raw.processingWindowMs ?? defaults.processingWindowMs, 'processingWindowMs', 1000, 15000), responseWindowMs: integer(raw.responseWindowMs ?? defaults.responseWindowMs, 'responseWindowMs', 3000, 60000), stimulusSetVersion: stringValue(raw.stimulusSetVersion ?? defaults.stimulusSetVersion, 'stimulusSetVersion', {max: 80})};
  }
  if (gameId === 'recognition') {
    const studyCount = integer(raw.studyCount ?? defaults.studyCount, 'studyCount', 4, 16);
    const testCount = integer(raw.testCount ?? defaults.testCount, 'testCount', studyCount * 2, Math.min(RECOGNITION_IDS.length, studyCount * 3));
    const oldRatio = finiteNumber(raw.oldRatio ?? defaults.oldRatio, 'oldRatio', 0.25, 0.75);
    const oldCount = testCount * oldRatio;
    if (!Number.isInteger(oldCount) || oldCount < 1 || oldCount > studyCount || testCount - oldCount > RECOGNITION_IDS.length - studyCount) invalid('oldRatio és testCount nem ad kiegyensúlyozható egész régi/új elemszámot');
    return {...common, studyCount, testCount, oldRatio, studyMs: integer(raw.studyMs ?? defaults.studyMs, 'studyMs', 3000, 60000), responseWindowMs: integer(raw.responseWindowMs ?? defaults.responseWindowMs, 'responseWindowMs', 1000, 15000), stimulusSetVersion: stringValue(raw.stimulusSetVersion ?? defaults.stimulusSetVersion, 'stimulusSetVersion', {max: 80})};
  }
  if (gameId === 'attention-nogo') {
    const trialCount = integer(raw.trialCount ?? defaults.trialCount, 'trialCount', 12, 200);
    const goRatio = finiteNumber(raw.goRatio ?? defaults.goRatio, 'goRatio', 0.5, 0.9);
    if (!Number.isInteger(trialCount * goRatio) || trialCount * goRatio < 1 || trialCount * (1 - goRatio) < 2) invalid('goRatio a trialCount mellett egész, legalább két no-go próbát adjon');
    const intertrialMs = integer(raw.intertrialMs ?? defaults.intertrialMs, 'intertrialMs', 500, 5000);
    const responseWindowMs = integer(raw.responseWindowMs ?? defaults.responseWindowMs, 'responseWindowMs', 200, intertrialMs);
    return {...common, trialCount, goRatio, stimulusMs: integer(raw.stimulusMs ?? defaults.stimulusMs, 'stimulusMs', 100, responseWindowMs), intertrialMs, responseWindowMs, stimulusSetVersion: stringValue(raw.stimulusSetVersion ?? defaults.stimulusSetVersion, 'stimulusSetVersion', {max: 80})};
  }
  const questions = normalizeQuestions(raw.questions ?? defaults.questions);
  const reviewRound = enumValue(raw.reviewRound ?? defaults.reviewRound, ['initial', 'review'], 'reviewRound');
  const reviewDelayMinutes = integer(raw.reviewDelayMinutes ?? defaults.reviewDelayMinutes, 'reviewDelayMinutes', 1, 525600);
  const scheduledAt = nullableIso(raw.scheduledAt ?? defaults.scheduledAt, 'scheduledAt');
  const availableAt = nullableIso(raw.availableAt ?? defaults.availableAt, 'availableAt');
  if (reviewRound === 'review' && !availableAt) invalid('review körhöz availableAt szükséges');
  return {...common, questions, reviewRound, reviewDelayMinutes, scheduledAt, availableAt, stimulusSetVersion: stringValue(raw.stimulusSetVersion ?? defaults.stimulusSetVersion, 'stimulusSetVersion', {max: 80})};
}

function normalizeActiveRecallPrivateSettings(publicSettings, raw) {
  const settings = normalizeCognitiveSettings('active-recall', publicSettings);
  exactObject(raw, ['acceptedAnswers'], 'privateSettings');
  if (!Array.isArray(raw.acceptedAnswers) || raw.acceptedAnswers.length !== settings.questions.length) invalid('acceptedAnswers minden kérdéshez pontosan egy bejegyzést tartalmazzon');
  const expectedIds = new Set(settings.questions.map((item) => item.questionId));
  const seen = new Set();
  const acceptedAnswers = raw.acceptedAnswers.map((entry, index) => {
    exactObject(entry, ['questionId', 'answers'], `acceptedAnswers[${index}]`);
    const questionId = stringValue(entry.questionId, `acceptedAnswers[${index}].questionId`, {max: 80});
    if (!expectedIds.has(questionId) || seen.has(questionId)) invalid('acceptedAnswers questionId idegen vagy ismétlődik');
    seen.add(questionId);
    if (!Array.isArray(entry.answers) || entry.answers.length < 1 || entry.answers.length > 20) invalid('answers 1–20 elemű lista legyen');
    const answers = [...new Set(entry.answers.map((answer, answerIndex) => normalizeRecallText(stringValue(answer, `acceptedAnswers[${index}].answers[${answerIndex}]`, {max: 500}))))];
    return {questionId, answers};
  });
  return {acceptedAnswers};
}

function seededRandom(seed) {
  let state = integer(seed, 'seed', 0, 0xffffffff) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(values, rng) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function trial(trials, phase, kind, onsetMs, stimulus, response = null) {
  const trialIndex = trials.length;
  const item = {trialId: `trial-${String(trialIndex).padStart(4, '0')}`, trialIndex, phase, kind, onsetMs, stimulus};
  Object.defineProperty(item, '_response', {value: response, enumerable: false});
  trials.push(item);
  return item;
}

function spanPlan(gameId, settings, rng) {
  const trials = [];
  let onsetMs = 0;
  for (const direction of ['forward', 'backward']) {
    for (let length = settings.minLength; length <= settings.maxLength; length += 1) {
      for (let series = 0; series < settings.sequencesPerLength; series += 1) {
        let sequence;
        if (gameId === 'spatial-span') {
          sequence = shuffle(Array.from({length: settings.gridSize}, (_, index) => index), rng).slice(0, length);
        } else {
          sequence = [];
          while (sequence.length < length) {
            let value = Math.floor(rng() * 10);
            if (sequence.length && value === sequence.at(-1)) value = (value + 1 + Math.floor(rng() * 9)) % 10;
            sequence.push(value);
          }
        }
        const presented = [...sequence];
        const expected = direction === 'forward' ? [...sequence] : [...sequence].reverse();
        const presentationMs = length * ((gameId === 'spatial-span' ? settings.stimulusMs : settings.digitMs) + (gameId === 'spatial-span' ? settings.interstimulusMs : settings.interdigitMs));
        onsetMs += presentationMs;
        const stimulus = gameId === 'spatial-span'
          ? {direction, length, series, sequence: presented, gridSize: settings.gridSize, responseWindowMs: settings.responseWindowMs}
          : {direction, length, series, audioTokens: presented.map((digit) => `digit-${digit}`), audioSetVersion: settings.audioSetVersion, responseWindowMs: settings.responseWindowMs};
        trial(trials, direction, 'sequence-recall', onsetMs, stimulus, {type: gameId === 'spatial-span' ? 'spatial-sequence' : 'digit-sequence', expected, length, direction, series, responseWindowMs: settings.responseWindowMs});
        onsetMs += settings.responseWindowMs + 500;
      }
    }
  }
  return trials;
}

function picturePlacePlan(settings, rng) {
  const trials = [];
  const items = shuffle(PICTURE_IDS, rng).slice(0, settings.itemCount);
  const cells = shuffle(Array.from({length: settings.gridSize}, (_, index) => index), rng).slice(0, settings.itemCount);
  const mapping = items.map((itemId, index) => ({itemId, cell: cells[index]}));
  let onsetMs = 0;
  const addRecall = (phase) => {
    for (const pair of shuffle(mapping, rng)) {
      trial(trials, phase, 'place-recall', onsetMs, {itemId: pair.itemId, choices: Array.from({length: settings.gridSize}, (_, index) => index), responseWindowMs: settings.responseWindowMs}, {type: 'place', expected: pair.cell, phase, itemId: pair.itemId, responseWindowMs: settings.responseWindowMs});
      onsetMs += settings.responseWindowMs + 250;
    }
  };
  for (let round = 1; round <= settings.learningRounds; round += 1) {
    trial(trials, `learning-${round}`, 'association-study', onsetMs, {round, associations: clone(mapping), studyMs: settings.studyMs});
    onsetMs += settings.studyMs;
    addRecall(`learning-${round}`);
  }
  addRecall('immediate');
  onsetMs += settings.delayedMinimumMs;
  addRecall('delayed');
  return trials;
}

function complexSpanPlan(settings, rng) {
  const trials = [];
  let onsetMs = 0;
  for (const setSize of settings.setSizes) {
    for (let series = 0; series < settings.sequencesPerSize; series += 1) {
      const locations = shuffle(Array.from({length: settings.gridSize}, (_, index) => index), rng).slice(0, setSize);
      for (let itemIndex = 0; itemIndex < setSize; itemIndex += 1) {
        trial(trials, 'encode', 'memory-item', onsetMs, {setSize, series, itemIndex, location: locations[itemIndex], displayMs: settings.memoryItemMs});
        onsetMs += settings.memoryItemMs;
        const symmetric = rng() < 0.5;
        const shapeId = `shape-${Math.floor(rng() * 16) + 1}-${symmetric ? 's' : 'a'}`;
        trial(trials, 'processing', 'symmetry-decision', onsetMs, {setSize, series, itemIndex, shapeId, responseWindowMs: settings.processingWindowMs}, {type: 'boolean', expected: symmetric, setSize, series, responseWindowMs: settings.processingWindowMs});
        onsetMs += settings.processingWindowMs + 200;
      }
      trial(trials, 'recall', 'sequence-recall', onsetMs, {setSize, series, gridSize: settings.gridSize, responseWindowMs: settings.responseWindowMs}, {type: 'spatial-sequence', expected: locations, setSize, series, responseWindowMs: settings.responseWindowMs});
      onsetMs += settings.responseWindowMs + 500;
    }
  }
  return trials;
}

function recognitionPlan(settings, rng) {
  const trials = [];
  const studied = shuffle(RECOGNITION_IDS, rng).slice(0, settings.studyCount);
  trial(trials, 'study', 'recognition-study', 0, {items: studied, studyMs: settings.studyMs});
  const oldCount = settings.testCount * settings.oldRatio;
  const oldItems = shuffle(studied, rng).slice(0, oldCount).map((itemId) => ({itemId, status: 'old'}));
  const newItems = shuffle(RECOGNITION_IDS.filter((id) => !studied.includes(id)), rng).slice(0, settings.testCount - oldCount).map((itemId) => ({itemId, status: 'new'}));
  const tests = shuffle([...oldItems, ...newItems], rng);
  let onsetMs = settings.studyMs;
  for (const item of tests) {
    trial(trials, 'test', 'recognition-test', onsetMs, {itemId: item.itemId, choices: ['old', 'new'], responseWindowMs: settings.responseWindowMs}, {type: 'recognition', expected: item.status, status: item.status, responseWindowMs: settings.responseWindowMs});
    onsetMs += settings.responseWindowMs + 250;
  }
  return trials;
}

function attentionPlan(settings, rng) {
  const trials = [];
  const goCount = settings.trialCount * settings.goRatio;
  const classes = shuffle([...Array(goCount).fill('go'), ...Array(settings.trialCount - goCount).fill('nogo')], rng);
  classes.forEach((stimulusClass, index) => {
    const symbol = stimulusClass === 'nogo' ? 'csillag' : ATTENTION_SYMBOLS[Math.floor(rng() * (ATTENTION_SYMBOLS.length - 1))];
    trial(trials, 'attention', 'go-nogo', index * settings.intertrialMs, {symbol, stimulusClass, responseWindowMs: settings.responseWindowMs}, {type: 'tap', expected: stimulusClass === 'go', stimulusClass, responseWindowMs: settings.responseWindowMs});
  });
  return trials;
}

function activeRecallPlan(settings) {
  const trials = [];
  settings.questions.forEach((question, index) => {
    trial(trials, settings.reviewRound, 'active-recall-question', index * 30000, {...question, reviewRound: settings.reviewRound, responseWindowMs: 30000}, {type: 'text', questionId: question.questionId, responseWindowMs: 30000});
  });
  return trials;
}

export function generateCognitiveAssessment(gameId, rawSettings, seed) {
  const settings = normalizeCognitiveSettings(gameId, rawSettings);
  const normalizedSeed = integer(seed, 'seed', 0, 0xffffffff) >>> 0;
  const rng = seededRandom(normalizedSeed);
  let trials;
  if (gameId === 'spatial-span' || gameId === 'digit-span') trials = spanPlan(gameId, settings, rng);
  else if (gameId === 'picture-place') trials = picturePlacePlan(settings, rng);
  else if (gameId === 'complex-span') trials = complexSpanPlan(settings, rng);
  else if (gameId === 'recognition') trials = recognitionPlan(settings, rng);
  else if (gameId === 'attention-nogo') trials = attentionPlan(settings, rng);
  else trials = activeRecallPlan(settings);
  return {version: 1, gameId, seed: normalizedSeed, settings, trials: trials.map((item) => ({...item}))};
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  return value;
}

export function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

export function cognitiveComparabilityIdentity(gameId, rawSettings) {
  const settings = normalizeCognitiveSettings(gameId, rawSettings);
  const excluded = new Set(['contractVersion', 'protocolId', 'protocolVersion', 'mode', 'inputModality', 'language', 'questions', 'scheduledAt', 'availableAt']);
  const protocolSettings = Object.fromEntries(Object.entries(settings).filter(([key]) => !excluded.has(key)));
  if (gameId === 'active-recall') protocolSettings.questionIds = settings.questions.map((item) => item.questionId);
  return stableValue({
    familyId: gameId,
    protocolId: settings.protocolId,
    protocolVersion: settings.protocolVersion,
    mode: settings.mode,
    settings: protocolSettings,
    inputModality: settings.inputModality,
    audioSetVersion: settings.audioSetVersion ?? null,
    stimulusSetVersion: settings.stimulusSetVersion ?? null,
    language: settings.language,
  });
}

// Small synchronous SHA-256 implementation keeps browser and Node output identical.
function sha256(text) {
  const rightRotate = (value, amount) => (value >>> amount) | (value << (32 - amount));
  const bytes = new TextEncoder().encode(text);
  const bitLength = bytes.length * 8;
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const data = new Uint8Array(paddedLength);
  data.set(bytes);
  data[bytes.length] = 0x80;
  const view = new DataView(data.buffer);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  const primes = [];
  for (let candidate = 2; primes.length < 64; candidate += 1) if (primes.every((prime) => candidate % prime)) primes.push(candidate);
  const initial = primes.slice(0, 8).map((prime) => (Math.sqrt(prime) % 1 * 0x100000000) >>> 0);
  const constants = primes.map((prime) => (Math.cbrt(prime) % 1 * 0x100000000) >>> 0);
  const hash = [...initial];
  for (let offset = 0; offset < data.length; offset += 64) {
    const words = Array(64);
    for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4, false);
    for (let index = 16; index < 64; index += 1) {
      const a = words[index - 15], b = words[index - 2];
      const s0 = rightRotate(a, 7) ^ rightRotate(a, 18) ^ (a >>> 3);
      const s1 = rightRotate(b, 17) ^ rightRotate(b, 19) ^ (b >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + constants[index] + words[index]) >>> 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    [a, b, c, d, e, f, g, h].forEach((value, index) => { hash[index] = (hash[index] + value) >>> 0; });
  }
  return hash.map((value) => value.toString(16).padStart(8, '0')).join('');
}

function responseDefinition(gameId, settings, descriptor) {
  if (!descriptor) return null;
  return {...descriptor, gameId, settings};
}

function internalPlan(gameId, settings, seed) {
  const publicPlan = generateCognitiveAssessment(gameId, settings, seed);
  const normalized = publicPlan.settings;
  const rng = seededRandom(publicPlan.seed);
  let internalTrials;
  if (gameId === 'spatial-span' || gameId === 'digit-span') internalTrials = spanPlan(gameId, normalized, rng);
  else if (gameId === 'picture-place') internalTrials = picturePlacePlan(normalized, rng);
  else if (gameId === 'complex-span') internalTrials = complexSpanPlan(normalized, rng);
  else if (gameId === 'recognition') internalTrials = recognitionPlan(normalized, rng);
  else if (gameId === 'attention-nogo') internalTrials = attentionPlan(normalized, rng);
  else internalTrials = activeRecallPlan(normalized);
  return {...publicPlan, trials: internalTrials.map((item) => ({...item, response: responseDefinition(gameId, normalized, item._response)}))};
}

function parseRawAnswer(plan, answer) {
  exactObject(answer, ['version', 'startedAt', 'completedAt', 'events', 'device'], 'answer');
  if (integer(answer.version, 'answer.version', 1, 1) !== 1) invalid('answer.version értéke 1 legyen');
  const startedAt = nullableIso(answer.startedAt, 'startedAt');
  const completedAt = nullableIso(answer.completedAt, 'completedAt');
  if (!startedAt || !completedAt || Date.parse(completedAt) < Date.parse(startedAt)) invalid('startedAt és completedAt időrendje hibás');
  if (!Array.isArray(answer.events) || answer.events.length > MAX_EVENTS) invalid(`events legfeljebb ${MAX_EVENTS} elemű lista legyen`);
  if (answer.device !== undefined) {
    exactObject(answer.device, ['pointer', 'viewportBucket'], 'device');
    enumValue(answer.device.pointer, ['coarse', 'fine', 'none'], 'device.pointer');
    enumValue(answer.device.viewportBucket, ['small', 'medium', 'large'], 'device.viewportBucket');
  }
  const seenIds = new Set();
  const responses = new Map();
  const quality = new Set();
  let previousAtMs = -1;
  for (let index = 0; index < answer.events.length; index += 1) {
    const event = answer.events[index];
    exactObject(event, ['eventId', 'type', 'trialIndex', 'atMs', 'value'], `events[${index}]`);
    if (!Object.hasOwn(event, 'eventId') || !Object.hasOwn(event, 'type') || !Object.hasOwn(event, 'atMs') || !Object.hasOwn(event, 'value')) invalid(`events[${index}] kötelező mezője hiányzik`);
    if (!UUID_RE.test(event.eventId)) invalid(`events[${index}].eventId UUID legyen`);
    if (seenIds.has(event.eventId)) invalid('eventId egy beküldésen belül nem ismétlődhet');
    seenIds.add(event.eventId);
    const atMs = finiteNumber(event.atMs, `events[${index}].atMs`, 0, 172800000);
    if (atMs < previousAtMs) invalid('events időrendje nem csökkenhet');
    previousAtMs = atMs;
    const type = enumValue(event.type, ['response', 'visibility', 'pause', 'resume', 'audio', 'recovery', 'timing'], `events[${index}].type`);
    if (type === 'visibility') {
      if (event.trialIndex !== undefined) invalid('visibility eseményhez nincs trialIndex');
      enumValue(event.value, ['hidden', 'visible'], 'visibility.value');
      if (event.value === 'hidden') quality.add('visibilityInterrupted');
      continue;
    }
    if (type === 'pause' || type === 'resume') {
      if (event.trialIndex !== undefined) invalid(`${type} eseményhez nincs trialIndex`);
      enumValue(event.value, ['background', 'manual'], `${type}.value`);
      if (type === 'pause') quality.add('paused');
      continue;
    }
    if (type === 'recovery') {
      if (event.trialIndex !== undefined || event.value !== 'reload') invalid('recovery esemény értéke reload legyen, trialIndex nélkül');
      quality.add('recovered');
      continue;
    }
    const trialIndex = integer(event.trialIndex, `events[${index}].trialIndex`, 0, plan.trials.length - 1);
    const trialItem = plan.trials[trialIndex];
    if (type === 'timing') {
      const deviation = finiteNumber(event.value, 'timing.value', -60000, 60000);
      if (Math.abs(deviation) > 1000) quality.add('timingDeviation');
      continue;
    }
    if (type === 'audio') {
      if (plan.gameId !== 'digit-span' || trialItem.kind !== 'sequence-recall') invalid('audio esemény csak számsor-próbához küldhető');
      enumValue(event.value, ['played', 'error'], 'audio.value');
      if (event.value === 'error') quality.add('audioFailure');
      continue;
    }
    if (!trialItem.response) invalid('ehhez a próbához nem tartozik válasz');
    if (!Object.hasOwn(event, 'trialIndex')) invalid('response eseményhez trialIndex szükséges');
    const earliest = trialItem.onsetMs;
    const latest = earliest + trialItem.response.responseWindowMs;
    if (atMs < earliest || atMs > latest) invalid('a válasz a próba időablakán kívül esik');
    validateResponseValue(trialItem.response, event.value);
    if (responses.has(trialIndex)) {
      if (stableStringify(responses.get(trialIndex).value) !== stableStringify(event.value)) invalid('ellentmondó ismételt válasz ugyanarra a próbára');
      continue;
    }
    responses.set(trialIndex, {value: clone(event.value), atMs});
  }
  return {startedAt, completedAt, responses, qualityFlags: [...quality].sort(), device: answer.device ? clone(answer.device) : null};
}

export function validateCognitiveDelayedCheckpoint(gameId, rawSettings, seed, answer) {
  if (gameId !== 'picture-place') invalid('késleltetési checkpoint csak kép–hely feladathoz tartozhat');
  const plan = internalPlan(gameId, normalizeCognitiveSettings(gameId, rawSettings), seed);
  const parsed = parseRawAnswer(plan, answer);
  const required = plan.trials.filter((item) => item.response && item.phase !== 'delayed');
  if (required.some((item) => !parsed.responses.has(item.trialIndex))) invalid('a tanulási és azonnali felidézési válaszok még nem teljesek');
  const minimumServerElapsedMs = plan.trials.filter((item) => item.kind === 'association-study').reduce((sum, item) => sum + item.stimulus.studyMs, 0);
  const checkpointEvents = answer.events.map(({eventId: _eventId, ...event}) => event);
  return {minimumServerElapsedMs, checkpointIdentity: stableStringify({events: checkpointEvents, device: answer.device ?? null})};
}

function emptyValue(value) {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
}

function validateResponseValue(definition, value) {
  if (emptyValue(value)) return;
  if (definition.type === 'spatial-sequence' || definition.type === 'digit-sequence') {
    if (!Array.isArray(value) || value.length !== definition.expected.length) invalid('a sorrendválasz hossza hibás');
    value.forEach((item, index) => integer(item, `response[${index}]`, 0, definition.type === 'digit-sequence' ? 9 : definition.settings.gridSize - 1));
    if (definition.type === 'spatial-sequence' && new Set(value).size !== value.length) invalid('a térbeli sorrend nem tartalmazhat ismételt mezőt');
  } else if (definition.type === 'place') {
    integer(value, 'helyválasz', 0, definition.settings.gridSize - 1);
  } else if (definition.type === 'boolean') {
    if (typeof value !== 'boolean') invalid('a szimmetriaválasz logikai érték legyen');
  } else if (definition.type === 'recognition') {
    enumValue(value, ['old', 'new'], 'felismerési válasz');
  } else if (definition.type === 'tap') {
    if (value !== true) invalid('a jelzés értéke true legyen');
  } else if (definition.type === 'text') {
    if (typeof value !== 'string' || value.length > 500) invalid('az aktív felidézés válasza legfeljebb 500 karakteres szöveg legyen');
  }
}

function responseFor(parsed, trialItem) {
  return parsed.responses.get(trialItem.trialIndex)?.value;
}

function arraysEqual(left, right) {
  return Array.isArray(left) && left.length === right.length && left.every((value, index) => value === right[index]);
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function durationFromContext(context) {
  if (context.serverDurationMs !== undefined && context.serverDurationMs !== null) return finiteNumber(context.serverDurationMs, 'context.serverDurationMs', 0, 172800000);
  if (context.attemptCreatedAt && context.submittedAt) {
    const start = Date.parse(context.attemptCreatedAt), end = Date.parse(context.submittedAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) invalid('context szerver-időpontjai hibásak');
    return end - start;
  }
  return null;
}

function delayedDurationFromContext(context) {
  if (context.delayCheckpointAt && context.submittedAt) {
    const start = Date.parse(context.delayCheckpointAt), end = Date.parse(context.submittedAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) invalid('context késleltetési időpontjai hibásak');
    return end - start;
  }
  return durationFromContext(context);
}

function metricsEnvelope(gameId, settings, parsed, context, primaryMetric, subscales, counts, extraFlags = [], comparableOverride = true, timing = {}) {
  const qualityFlags = [...new Set([...parsed.qualityFlags, ...extraFlags])].sort();
  const comparable = settings.mode === 'practice' ? false : comparableOverride && qualityFlags.length === 0;
  const identity = cognitiveComparabilityIdentity(gameId, settings);
  return {
    schemaVersion: 1,
    familyId: gameId,
    protocolId: settings.protocolId,
    protocolVersion: settings.protocolVersion,
    mode: settings.mode,
    primaryMetric,
    subscales,
    counts,
    timing: {medianCorrectRtMs: timing.medianCorrectRtMs ?? null, serverDurationMs: durationFromContext(context)},
    qualityFlags,
    comparable,
    comparabilityKey: sha256(stableStringify(identity)),
  };
}

function resultShape(correct, total, percent, summary, details, metrics) {
  return {correct, total: Math.max(1, total), percent: Math.max(0, Math.min(100, Math.round(percent))), summary, details, stars: null, starBasis: 'cognitive-no-stars', metrics};
}

function scoreSpan(gameId, plan, parsed, context) {
  const directions = {};
  let totalCorrect = 0, total = 0;
  const details = [];
  for (const direction of ['forward', 'backward']) {
    const trials = plan.trials.filter((item) => item.response?.direction === direction);
    const byLength = new Map();
    for (const item of trials) {
      const length = item.response.length;
      if (!byLength.has(length)) byLength.set(length, []);
      byLength.get(length).push(item);
    }
    let correctSeries = 0, correctItems = 0, assessedItems = 0, maxSpan = 0, stoppedAtLength = null;
    const hitsByLength = {};
    for (const [length, items] of byLength) {
      let lengthHits = 0;
      for (const item of items) {
        const actual = responseFor(parsed, item);
        const ok = !emptyValue(actual) && arraysEqual(actual, item.response.expected);
        const elementCorrect = Array.isArray(actual) ? item.response.expected.filter((value, index) => actual[index] === value).length : 0;
        total += 1;
        totalCorrect += ok ? 1 : 0;
        correctSeries += ok ? 1 : 0;
        correctItems += elementCorrect;
        assessedItems += item.response.expected.length;
        lengthHits += ok ? 1 : 0;
        if (ok) maxSpan = Math.max(maxSpan, length);
        details.push({trialId: item.trialId, phase: direction, label: `${direction === 'forward' ? 'Előre' : 'Vissza'} ${length} elem, ${item.response.series + 1}. sor`, expected: clone(item.response.expected), actual: emptyValue(actual) ? null : clone(actual), correct: ok, elementCorrect});
      }
      hitsByLength[length] = lengthHits;
      if (lengthHits === 0) { stoppedAtLength = length; break; }
    }
    const spanScore = correctSeries === 0 ? 0 : plan.settings.minLength - 1 + correctSeries / plan.settings.sequencesPerLength;
    directions[direction] = {maxSpan, spanScore: Number(spanScore.toFixed(2)), correctSeries, correctItems, assessedItems, hitsByLength, stoppedAtLength};
  }
  const primaryMetric = {name: 'forwardSpanScore', value: directions.forward.spanScore, unit: 'items'};
  const metrics = metricsEnvelope(gameId, plan.settings, parsed, context, primaryMetric, directions, {correctSeries: totalCorrect, assessedSeries: total, correctItems: directions.forward.correctItems + directions.backward.correctItems, assessedItems: directions.forward.assessedItems + directions.backward.assessedItems});
  return resultShape(totalCorrect, total, total ? totalCorrect / total * 100 : 0, `Előre ${directions.forward.spanScore}, vissza ${directions.backward.spanScore} terjedelempont.`, details, metrics);
}

function scorePicturePlace(plan, parsed, context) {
  const phases = {};
  let correct = 0, total = 0, wrongLocations = 0;
  const details = [];
  for (const item of plan.trials.filter((trialItem) => trialItem.response)) {
    const actual = responseFor(parsed, item);
    const ok = !emptyValue(actual) && actual === item.response.expected;
    const phase = item.response.phase;
    phases[phase] ??= {correct: 0, total: 0, wrongLocations: 0};
    phases[phase].total += 1;
    phases[phase].correct += ok ? 1 : 0;
    phases[phase].wrongLocations += !emptyValue(actual) && !ok ? 1 : 0;
    correct += ok ? 1 : 0; total += 1; wrongLocations += !emptyValue(actual) && !ok ? 1 : 0;
    details.push({trialId: item.trialId, phase, label: item.response.itemId, expected: item.response.expected, actual: emptyValue(actual) ? null : actual, correct: ok});
  }
  const delay = delayedDurationFromContext(context);
  const flags = [];
  if (plan.settings.mode === 'assessment' && delay === null) flags.push('delayedTimingUnverified');
  if (delay !== null && delay < plan.settings.delayedMinimumMs) flags.push('delayedRecallTooEarly');
  const delayed = phases.delayed ?? {correct: 0, total: plan.settings.itemCount, wrongLocations: 0};
  const subscales = {learningRounds: Array.from({length: plan.settings.learningRounds}, (_, index) => phases[`learning-${index + 1}`]), immediate: phases.immediate, delayed, actualDelayedRecallMs: delay};
  const metrics = metricsEnvelope('picture-place', plan.settings, parsed, context, {name: 'delayedRecallCorrect', value: delayed.correct, unit: 'items'}, subscales, {correct, total, wrongLocations}, flags);
  return resultShape(correct, total, correct / total * 100, `Késleltetve ${delayed.correct}/${delayed.total} kép helye helyes.`, details, metrics);
}

function scoreComplex(plan, parsed, context) {
  const processing = plan.trials.filter((item) => item.response?.type === 'boolean');
  const recalls = plan.trials.filter((item) => item.response?.type === 'spatial-sequence');
  let processingAnswered = 0, processingCorrect = 0, recallElementsCorrect = 0, recallElementsTotal = 0, exactRecalls = 0;
  const details = [];
  for (const item of processing) {
    const actual = responseFor(parsed, item);
    const answered = !emptyValue(actual);
    const ok = answered && actual === item.response.expected;
    processingAnswered += answered ? 1 : 0; processingCorrect += ok ? 1 : 0;
    details.push({trialId: item.trialId, phase: 'processing', label: `Szimmetria ${item.response.setSize}/${item.response.series + 1}`, expected: item.response.expected, actual: answered ? actual : null, correct: ok});
  }
  for (const item of recalls) {
    const actual = responseFor(parsed, item);
    const values = Array.isArray(actual) ? actual : [];
    const elementCorrect = item.response.expected.filter((value, index) => values[index] === value).length;
    const exact = arraysEqual(values, item.response.expected);
    recallElementsCorrect += elementCorrect; recallElementsTotal += item.response.expected.length; exactRecalls += exact ? 1 : 0;
    details.push({trialId: item.trialId, phase: 'recall', label: `Felidézés ${item.response.setSize}/${item.response.series + 1}`, expected: clone(item.response.expected), actual: emptyValue(actual) ? null : clone(actual), correct: exact, elementCorrect});
  }
  const compliance = processing.length ? processingAnswered / processing.length : 0;
  const flags = compliance < 0.75 ? ['invalidProcessingCompliance'] : [];
  const memoryAccuracy = recallElementsTotal ? recallElementsCorrect / recallElementsTotal * 100 : 0;
  const processingAccuracy = processing.length ? processingCorrect / processing.length * 100 : 0;
  const total = recallElementsTotal + processing.length;
  const correct = recallElementsCorrect + processingCorrect;
  const metrics = metricsEnvelope('complex-span', plan.settings, parsed, context, {name: 'recallAccuracy', value: Math.round(memoryAccuracy), unit: 'percent'}, {recallAccuracy: Math.round(memoryAccuracy), exactRecalls, processingAccuracy: Math.round(processingAccuracy), processingCompliance: Number(compliance.toFixed(3))}, {recallElementsCorrect, recallElementsTotal, processingCorrect, processingTotal: processing.length, processingAnswered}, flags, compliance >= 0.75);
  return resultShape(correct, total, correct / total * 100, `Felidézés ${Math.round(memoryAccuracy)}%, köztes döntés ${Math.round(processingAccuracy)}%.`, details, metrics);
}

function scoreRecognition(plan, parsed, context) {
  let hits = 0, misses = 0, falseRecognitions = 0, correctRejections = 0, omissions = 0, oldTotal = 0, newTotal = 0, oldAnswered = 0, newAnswered = 0;
  const details = [];
  for (const item of plan.trials.filter((trialItem) => trialItem.response?.type === 'recognition')) {
    const actual = responseFor(parsed, item);
    const omitted = emptyValue(actual);
    const status = item.response.status;
    if (status === 'old') {
      oldTotal += 1; oldAnswered += omitted ? 0 : 1;
      if (actual === 'old') hits += 1;
      else { misses += 1; if (omitted) omissions += 1; }
    } else {
      newTotal += 1; newAnswered += omitted ? 0 : 1;
      if (actual === 'new') correctRejections += 1;
      else if (omitted) omissions += 1;
      else falseRecognitions += 1;
    }
    details.push({trialId: item.trialId, phase: 'test', label: item.stimulus.itemId, expected: status, actual: omitted ? null : actual, correct: actual === status});
  }
  const balancedAccuracy = ((hits / oldTotal) + (correctRejections / newTotal)) / 2 * 100;
  const flags = oldAnswered === 0 || newAnswered === 0 ? ['insufficientRecognitionResponses'] : [];
  const metrics = metricsEnvelope('recognition', plan.settings, parsed, context, {name: 'balancedAccuracy', value: Math.round(balancedAccuracy), unit: 'percent'}, {oldAccuracy: Math.round(hits / oldTotal * 100), newAccuracy: Math.round(correctRejections / newTotal * 100)}, {hits, misses, falseRecognitions, correctRejections, omissions, oldTotal, newTotal}, flags, !flags.length);
  return resultShape(hits + correctRejections, oldTotal + newTotal, balancedAccuracy, `Találat ${hits}/${oldTotal}, téves felismerés ${falseRecognitions}/${newTotal}.`, details, metrics);
}

function scoreAttention(plan, parsed, context) {
  let goHits = 0, goMisses = 0, nogoFalseAlarms = 0, nogoCorrectWithholds = 0, goTotal = 0, nogoTotal = 0;
  const correctRts = [], details = [];
  for (const item of plan.trials) {
    const response = parsed.responses.get(item.trialIndex);
    const tapped = response?.value === true;
    const isGo = item.response.stimulusClass === 'go';
    if (isGo) {
      goTotal += 1;
      if (tapped) { goHits += 1; correctRts.push(response.atMs - item.onsetMs); } else goMisses += 1;
    } else {
      nogoTotal += 1;
      if (tapped) nogoFalseAlarms += 1; else nogoCorrectWithholds += 1;
    }
    details.push({trialId: item.trialId, phase: 'attention', label: item.stimulus.symbol, expected: isGo ? 'tap' : 'withhold', actual: tapped ? 'tap' : null, correct: isGo ? tapped : !tapped});
  }
  const balancedAccuracy = ((goHits / goTotal) + (nogoCorrectWithholds / nogoTotal)) / 2 * 100;
  const metrics = metricsEnvelope('attention-nogo', plan.settings, parsed, context, {name: 'balancedAccuracy', value: Math.round(balancedAccuracy), unit: 'percent'}, {goAccuracy: Math.round(goHits / goTotal * 100), inhibitionAccuracy: Math.round(nogoCorrectWithholds / nogoTotal * 100)}, {goHits, goMisses, nogoFalseAlarms, nogoCorrectWithholds, goTotal, nogoTotal}, [], true, {medianCorrectRtMs: median(correctRts)});
  return resultShape(goHits + nogoCorrectWithholds, goTotal + nogoTotal, balancedAccuracy, `Go találat ${goHits}/${goTotal}, no-go téves jelzés ${nogoFalseAlarms}/${nogoTotal}.`, details, metrics);
}

function normalizeRecallText(value) {
  return value.normalize('NFKC').toLocaleLowerCase('hu-HU').trim().replace(/\s+/g, ' ');
}

function scoreActiveRecall(plan, parsed, context) {
  if (!context.privateSettings) invalid('active-recall pontozásához privateSettings szükséges');
  const privateSettings = normalizeActiveRecallPrivateSettings(plan.settings, context.privateSettings);
  const acceptedById = new Map(privateSettings.acceptedAnswers.map((item) => [item.questionId, new Set(item.answers)]));
  let correct = 0;
  const details = [];
  for (const item of plan.trials) {
    const actual = responseFor(parsed, item);
    const normalized = typeof actual === 'string' ? normalizeRecallText(actual) : '';
    const accepted = normalized !== '' && acceptedById.get(item.response.questionId).has(normalized);
    correct += accepted ? 1 : 0;
    details.push({trialId: item.trialId, phase: plan.settings.reviewRound, questionId: item.response.questionId, label: item.stimulus.question, expected: 'Tanári válaszkulcs', actual: emptyValue(actual) ? null : actual.trim(), correct: accepted, accepted, reviewRound: plan.settings.reviewRound});
  }
  const answeredAt = context.submittedAt ? nullableIso(context.submittedAt, 'context.submittedAt') : parsed.completedAt;
  const timing = {scheduledAt: plan.settings.scheduledAt, availableAt: plan.settings.availableAt, answeredAt};
  const flags = [];
  if (plan.settings.reviewRound === 'review' && Date.parse(answeredAt) < Date.parse(plan.settings.availableAt)) flags.push('reviewAnsweredEarly');
  const metrics = metricsEnvelope('active-recall', plan.settings, parsed, context, {name: 'acceptedRecallCount', value: correct, unit: 'questions'}, {reviewRound: plan.settings.reviewRound, timing}, {accepted: correct, rejected: plan.trials.length - correct, total: plan.trials.length}, flags);
  return resultShape(correct, plan.trials.length, correct / plan.trials.length * 100, `${correct}/${plan.trials.length} felidézett válasz elfogadva.`, details, metrics);
}

export function scoreCognitiveAttempt(gameId, rawSettings, seed, answer, context = {}) {
  exactObject(context, ['privateSettings', 'serverDurationMs', 'attemptCreatedAt', 'submittedAt', 'delayCheckpointAt'], 'context');
  const plan = internalPlan(gameId, rawSettings, seed);
  const parsed = parseRawAnswer(plan, answer);
  if (gameId === 'spatial-span' || gameId === 'digit-span') return scoreSpan(gameId, plan, parsed, context);
  if (gameId === 'picture-place') return scorePicturePlace(plan, parsed, context);
  if (gameId === 'complex-span') return scoreComplex(plan, parsed, context);
  if (gameId === 'recognition') return scoreRecognition(plan, parsed, context);
  if (gameId === 'attention-nogo') return scoreAttention(plan, parsed, context);
  return scoreActiveRecall(plan, parsed, context);
}
