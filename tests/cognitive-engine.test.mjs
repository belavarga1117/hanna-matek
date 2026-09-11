import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
  COGNITIVE_GAME_IDS,
  COGNITIVE_PROTOCOLS,
  DIGIT_AUDIO_MANIFEST_VERSION,
  DIGIT_AUDIO_TOKENS,
  cognitiveComparabilityIdentity,
  generateCognitiveAssessment,
  isCognitiveGame,
  normalizeCognitiveSettings,
  scoreCognitiveAttempt,
  stableStringify,
  validateCognitiveDelayedCheckpoint,
} from '../dist/cognitive/engine.js';

const SEED = 0x51a7c0de;

function uuid(index) {
  return `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
}

function responseEvent(item, value, index, offset = 10) {
  return {eventId: uuid(index), type: 'response', trialIndex: item.trialIndex, atMs: item.onsetMs + offset, value};
}

function raw(events = [], overrides = {}) {
  return {
    version: 1,
    startedAt: '2026-09-11T08:00:00.000Z',
    completedAt: '2026-09-11T08:20:00.000Z',
    events: [...events].sort((left, right) => left.atMs - right.atMs),
    device: {pointer: 'coarse', viewportBucket: 'small'},
    ...overrides,
  };
}

function activeSettings(overrides = {}) {
  return {
    questions: [
      {questionId: 'q1', question: 'Mi Magyarország fővárosa?', learningExplanation: 'Budapest Magyarország fővárosa.'},
      {questionId: 'q2', question: 'Mennyi hét szorozva nyolccal?', learningExplanation: '7 × 8 = 56.'},
    ],
    ...overrides,
  };
}

function activePrivate() {
  return {acceptedAnswers: [
    {questionId: 'q1', answers: ['Budapest']},
    {questionId: 'q2', answers: ['56', 'ötvenhat']},
  ]};
}

function perfectEvents(gameId, settings = {}) {
  const plan = generateCognitiveAssessment(gameId, settings, SEED);
  const events = [];
  const studyAssociations = plan.trials.find((item) => item.kind === 'association-study')?.stimulus.associations ?? [];
  const placeByItem = new Map(studyAssociations.map((item) => [item.itemId, item.cell]));
  const studied = new Set(plan.trials.find((item) => item.kind === 'recognition-study')?.stimulus.items ?? []);
  const complexLocations = new Map();
  for (const item of plan.trials.filter((trial) => trial.kind === 'memory-item')) {
    const key = `${item.stimulus.setSize}/${item.stimulus.series}`;
    if (!complexLocations.has(key)) complexLocations.set(key, []);
    complexLocations.get(key).push(item.stimulus.location);
  }
  for (const item of plan.trials) {
    let value;
    if (gameId === 'spatial-span') value = item.stimulus.direction === 'forward' ? item.stimulus.sequence : [...item.stimulus.sequence].reverse();
    else if (gameId === 'digit-span') {
      const sequence = item.stimulus.audioTokens.map((token) => Number(token.slice(6)));
      value = item.stimulus.direction === 'forward' ? sequence : sequence.reverse();
    } else if (gameId === 'picture-place' && item.kind === 'place-recall') value = placeByItem.get(item.stimulus.itemId);
    else if (gameId === 'complex-span' && item.kind === 'symmetry-decision') value = item.stimulus.shapeId.endsWith('-s');
    else if (gameId === 'complex-span' && item.kind === 'sequence-recall') value = complexLocations.get(`${item.stimulus.setSize}/${item.stimulus.series}`);
    else if (gameId === 'recognition' && item.kind === 'recognition-test') value = studied.has(item.stimulus.itemId) ? 'old' : 'new';
    else if (gameId === 'attention-nogo' && item.stimulus.stimulusClass === 'go') value = true;
    else if (gameId === 'active-recall') value = item.stimulus.questionId === 'q1' ? 'Budapest' : '56';
    else continue;
    events.push(responseEvent(item, value, events.length));
  }
  return {plan, events};
}

test('a hét új család stabil exporttal, rögzített protokollal és szigorú normalizálással érhető el', () => {
  assert.deepEqual(COGNITIVE_GAME_IDS, ['spatial-span', 'digit-span', 'picture-place', 'complex-span', 'recognition', 'attention-nogo', 'active-recall']);
  for (const gameId of COGNITIVE_GAME_IDS) {
    assert.equal(isCognitiveGame(gameId), true);
    const input = gameId === 'active-recall' ? activeSettings() : {};
    const settings = normalizeCognitiveSettings(gameId, input);
    assert.equal(settings.contractVersion, 1);
    assert.equal(settings.protocolId, COGNITIVE_PROTOCOLS[gameId]);
    assert.equal(settings.protocolVersion, 1);
    assert.equal(settings.mode, 'assessment');
  }
  assert.equal(isCognitiveGame('nback'), false);
  assert.throws(() => normalizeCognitiveSettings('spatial-span', {unknown: true}), /ismeretlen mezőt/);
  assert.throws(() => normalizeCognitiveSettings('digit-span', {audioSetVersion: 'másik'}), /audioSetVersion/);
  assert.throws(() => normalizeCognitiveSettings('attention-nogo', {trialCount: 13, goRatio: 0.75}), /egész/);
  assert.throws(() => normalizeCognitiveSettings('active-recall', {...activeSettings(), acceptedAnswers: []}), /ismeretlen mezőt/);
});

test('azonos játék, normalizált settings és uint32 seed bájtszinten azonos nyilvános tervet ad', () => {
  for (const gameId of COGNITIVE_GAME_IDS) {
    const settings = normalizeCognitiveSettings(gameId, gameId === 'active-recall' ? activeSettings() : {});
    const first = generateCognitiveAssessment(gameId, settings, SEED);
    const second = generateCognitiveAssessment(gameId, settings, SEED);
    assert.equal(JSON.stringify(first), JSON.stringify(second), gameId);
    assert.ok(first.trials.every((item, index) => item.trialId === `trial-${String(index).padStart(4, '0')}` && item.trialIndex === index));
    assert.ok(first.trials.every((item) => Number.isFinite(item.onsetMs) && item.onsetMs >= 0 && item.phase && item.kind && item.stimulus));
  }
  assert.throws(() => generateCognitiveAssessment('spatial-span', {}, -1), /seed/);
  assert.throws(() => generateCognitiveAssessment('spatial-span', {}, 2 ** 32), /seed/);
});

test('a számsor nyilvános terve csak a 0–9 hangtokeneket és az elvárt manifestverziót kéri', () => {
  assert.equal(DIGIT_AUDIO_MANIFEST_VERSION, 'hu-digits-v1');
  assert.deepEqual(DIGIT_AUDIO_TOKENS.map((item) => item.digit), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const plan = generateCognitiveAssessment('digit-span', {}, SEED);
  assert.ok(plan.trials.every((item) => item.stimulus.audioSetVersion === DIGIT_AUDIO_MANIFEST_VERSION));
  assert.ok(plan.trials.flatMap((item) => item.stimulus.audioTokens).every((token) => /^digit-[0-9]$/.test(token)));
});

test('az aktív felidézés nyilvános terve sem közvetlenül, sem rejtett saját tulajdonságban nem szivárogtatja a privát választ', () => {
  const settings = normalizeCognitiveSettings('active-recall', activeSettings());
  const plan = generateCognitiveAssessment('active-recall', settings, SEED);
  assert.equal(JSON.stringify(plan).includes('Budapest'), true, 'a kérdés magyarázata jogszerűen tartalmazhat tanulási szöveget');
  assert.equal(JSON.stringify(plan).includes('ötvenhat'), false);
  assert.ok(plan.trials.every((item) => !Object.getOwnPropertyNames(item).includes('_response')));
  assert.ok(plan.trials.every((item) => !Object.hasOwn(item, 'response')));
  assert.throws(() => scoreCognitiveAttempt('active-recall', settings, SEED, raw()), /privateSettings/);
});

test('a térbeli és hallott terjedelem előre/vissza külön skálán, két sorozat/hossz szabállyal pontozódik', () => {
  for (const gameId of ['spatial-span', 'digit-span']) {
    const settings = {minLength: 2, maxLength: 4};
    const {events} = perfectEvents(gameId, settings);
    const result = scoreCognitiveAttempt(gameId, settings, SEED, raw(events));
    assert.equal(result.percent, 100);
    assert.equal(result.correct, 12);
    assert.equal(result.total, 12);
    assert.equal(result.metrics.subscales.forward.spanScore, 4);
    assert.equal(result.metrics.subscales.backward.spanScore, 4);
    assert.equal(result.metrics.primaryMetric.name, 'forwardSpanScore');
    assert.equal(result.stars, null);
    assert.equal(result.starBasis, 'cognitive-no-stars');
  }
});

test('két hiba után a későbbi hossz nem kerül a terjedelem nevezőjébe, az üres próbák hibák', () => {
  const settings = {minLength: 2, maxLength: 5};
  const plan = generateCognitiveAssessment('spatial-span', settings, SEED);
  const events = plan.trials.map((item, index) => responseEvent(item, [], index));
  const result = scoreCognitiveAttempt('spatial-span', settings, SEED, raw(events));
  assert.equal(result.correct, 0);
  assert.equal(result.total, 4);
  assert.equal(result.metrics.subscales.forward.stoppedAtLength, 2);
  assert.equal(result.metrics.subscales.backward.stoppedAtLength, 2);
  assert.equal(result.metrics.subscales.forward.spanScore, 0);
});

test('a kép–hely terv két tanulási kört, azonnali és legalább 60 másodperces késleltetett felidézést tartalmaz', () => {
  const settings = {itemCount: 4, gridSize: 6};
  const {plan, events} = perfectEvents('picture-place', settings);
  assert.deepEqual([...new Set(plan.trials.map((item) => item.phase))], ['learning-1', 'learning-2', 'immediate', 'delayed']);
  const immediateEnd = Math.max(...plan.trials.filter((item) => item.phase === 'immediate').map((item) => item.onsetMs));
  const delayedStart = Math.min(...plan.trials.filter((item) => item.phase === 'delayed').map((item) => item.onsetMs));
  assert.ok(delayedStart - immediateEnd >= 60000);
  const result = scoreCognitiveAttempt('picture-place', settings, SEED, raw(events), {serverDurationMs: 60000});
  assert.equal(result.percent, 100);
  assert.deepEqual(result.metrics.subscales.learningRounds.map((item) => item.correct), [4, 4]);
  assert.equal(result.metrics.subscales.immediate.correct, 4);
  assert.equal(result.metrics.subscales.delayed.correct, 4);
  assert.equal(result.metrics.subscales.actualDelayedRecallMs, 60000);
  assert.equal(result.metrics.comparable, true);
});

test('a kép–hely szerveres checkpoint csak a teljes azonnali felidézés után érvényes',()=>{
  const settings={itemCount:4,gridSize:6};const {plan,events}=perfectEvents('picture-place',settings);
  const immediate=events.filter(event=>plan.trials[event.trialIndex].phase!=='delayed');
  assert.throws(()=>validateCognitiveDelayedCheckpoint('picture-place',settings,SEED,raw([])),/még nem teljesek/);
  const checkpoint=validateCognitiveDelayedCheckpoint('picture-place',settings,SEED,raw(immediate));
  assert.equal(checkpoint.minimumServerElapsedMs,24000);assert.match(checkpoint.checkpointIdentity,/response/);
  assert.throws(()=>validateCognitiveDelayedCheckpoint('spatial-span',{},SEED,raw([])),/csak kép–hely/);
});

test('a kép–hely késleltetése szerveridő nélkül vagy túl korán minőségi jelzést kap', () => {
  const settings = {itemCount: 4, gridSize: 6};
  const {events} = perfectEvents('picture-place', settings);
  const unverified = scoreCognitiveAttempt('picture-place', settings, SEED, raw(events));
  assert.ok(unverified.metrics.qualityFlags.includes('delayedTimingUnverified'));
  assert.equal(unverified.metrics.comparable, false);
  const early = scoreCognitiveAttempt('picture-place', settings, SEED, raw(events), {serverDurationMs: 59999});
  assert.ok(early.metrics.qualityFlags.includes('delayedRecallTooEarly'));
});

test('a komplex terjedelem külön számolja a felidézést és a köztes döntést, a kihagyás nem javítja a memóriaeredményt', () => {
  const settings = {setSizes: [3], sequencesPerSize: 2};
  const {events} = perfectEvents('complex-span', settings);
  const perfect = scoreCognitiveAttempt('complex-span', settings, SEED, raw(events));
  assert.equal(perfect.percent, 100);
  assert.equal(perfect.metrics.subscales.recallAccuracy, 100);
  assert.equal(perfect.metrics.subscales.processingAccuracy, 100);
  assert.equal(perfect.metrics.subscales.processingCompliance, 1);
  const recallOnly = events.filter((event) => generateCognitiveAssessment('complex-span', settings, SEED).trials[event.trialIndex].kind === 'sequence-recall');
  const invalid = scoreCognitiveAttempt('complex-span', settings, SEED, raw(recallOnly));
  assert.equal(invalid.metrics.subscales.recallAccuracy, 100);
  assert.equal(invalid.percent, 50);
  assert.ok(invalid.metrics.qualityFlags.includes('invalidProcessingCompliance'));
  assert.equal(invalid.metrics.comparable, false);
});

test('a felismerés mindenre régi válaszát a téves felismerések 50%-ra húzzák, a csend nem kap pontot', () => {
  const settings = {studyCount: 4, testCount: 8};
  const plan = generateCognitiveAssessment('recognition', settings, SEED);
  const tests = plan.trials.filter((item) => item.kind === 'recognition-test');
  const clickEverything = tests.map((item, index) => responseEvent(item, 'old', index));
  const result = scoreCognitiveAttempt('recognition', settings, SEED, raw(clickEverything));
  assert.equal(result.percent, 50);
  assert.equal(result.metrics.counts.hits, 4);
  assert.equal(result.metrics.counts.falseRecognitions, 4);
  const silent = scoreCognitiveAttempt('recognition', settings, SEED, raw());
  assert.equal(silent.percent, 0);
  assert.equal(silent.metrics.counts.omissions, 8);
  assert.equal(silent.metrics.counts.misses, 4);
  assert.ok(silent.metrics.qualityFlags.includes('insufficientRecognitionResponses'));
});

test('a no-go mindenre kattintás kiegyensúlyozottan 50%, a helyes visszatartás és reakcióidő külön látszik', () => {
  const settings = {trialCount: 12, goRatio: 0.75};
  const plan = generateCognitiveAssessment('attention-nogo', settings, SEED);
  const allClicks = plan.trials.map((item, index) => responseEvent(item, true, index, 100));
  const bad = scoreCognitiveAttempt('attention-nogo', settings, SEED, raw(allClicks));
  assert.equal(bad.percent, 50);
  assert.equal(bad.metrics.counts.goHits, 9);
  assert.equal(bad.metrics.counts.nogoFalseAlarms, 3);
  const {events} = perfectEvents('attention-nogo', settings);
  const good = scoreCognitiveAttempt('attention-nogo', settings, SEED, raw(events));
  assert.equal(good.percent, 100);
  assert.equal(good.metrics.counts.nogoCorrectWithholds, 3);
  assert.equal(good.metrics.timing.medianCorrectRtMs, 10);
});

test('az aktív felidézés csak scorer-contextben kapott privát kulccsal, normalizált első válaszból pontoz', () => {
  const settings = activeSettings();
  const {plan} = perfectEvents('active-recall', settings);
  const events = [
    responseEvent(plan.trials[0], '  BUDAPEST  ', 0),
    responseEvent(plan.trials[1], 'ÖTVENHAT', 1),
  ];
  const result = scoreCognitiveAttempt('active-recall', settings, SEED, raw(events), {privateSettings: activePrivate(), submittedAt: '2026-09-11T08:20:00.000Z'});
  assert.equal(result.percent, 100);
  assert.ok(result.details.every((item) => item.expected === 'Tanári válaszkulcs'));
  assert.equal(JSON.stringify(result).includes('ötvenhat'), false, 'a privát elfogadott változat nem kerül az eredménybe');
  assert.equal(result.metrics.subscales.timing.answeredAt, '2026-09-11T08:20:00.000Z');
});

test('az aktív felidézés felülvizsgálati körében a tényleges időpontok megmaradnak és a korai válasz nem összehasonlítható', () => {
  const settings = activeSettings({reviewRound: 'review', scheduledAt: '2026-09-12T08:00:00Z', availableAt: '2026-09-12T09:00:00Z'});
  const {events} = perfectEvents('active-recall', settings);
  const result = scoreCognitiveAttempt('active-recall', settings, SEED, raw(events, {completedAt: '2026-09-12T08:30:00Z'}), {privateSettings: activePrivate(), attemptCreatedAt: '2026-09-12T08:00:00Z', submittedAt: '2026-09-12T08:30:00Z'});
  assert.ok(result.metrics.qualityFlags.includes('reviewAnsweredEarly'));
  assert.equal(result.metrics.comparable, false);
  assert.equal(result.metrics.subscales.timing.availableAt, '2026-09-12T09:00:00.000Z');
});

test('a nyers eseményellenőrzés idegen mezőt, típust, indexet, időt, ID-ismétlést és ellentmondó választ elutasít', () => {
  const plan = generateCognitiveAssessment('spatial-span', {minLength: 2, maxLength: 2}, SEED);
  const item = plan.trials[0];
  const correct = item.stimulus.sequence;
  assert.throws(() => scoreCognitiveAttempt('spatial-span', {minLength: 2, maxLength: 2}, SEED, {...raw(), score: 999}), /ismeretlen mezőt/);
  assert.throws(() => scoreCognitiveAttempt('spatial-span', {minLength: 2, maxLength: 2}, SEED, raw([{eventId: uuid(0), type: 'hack', atMs: 0, value: true}])), /type/);
  assert.throws(() => scoreCognitiveAttempt('spatial-span', {minLength: 2, maxLength: 2}, SEED, raw([{eventId: uuid(0), type: 'response', trialIndex: 99, atMs: 0, value: []}])), /trialIndex/);
  assert.throws(() => scoreCognitiveAttempt('spatial-span', {minLength: 2, maxLength: 2}, SEED, raw([{eventId: uuid(0), type: 'response', trialIndex: 0, atMs: -1, value: correct}])), /atMs/);
  assert.throws(() => scoreCognitiveAttempt('spatial-span', {minLength: 2, maxLength: 2}, SEED, raw([{eventId: uuid(0), type: 'response', trialIndex: 0, atMs: item.onsetMs}])), /kötelező mezője/);
  const repeatedId = [responseEvent(item, correct, 0), responseEvent(item, correct, 0, 20)];
  assert.throws(() => scoreCognitiveAttempt('spatial-span', {minLength: 2, maxLength: 2}, SEED, raw(repeatedId)), /eventId/);
  const contradiction = [responseEvent(item, correct, 0), responseEvent(item, [...correct].reverse(), 1, 20)];
  assert.throws(() => scoreCognitiveAttempt('spatial-span', {minLength: 2, maxLength: 2}, SEED, raw(contradiction)), /ellentmondó/);
});

test('azonos ismételt válasz nem ad pluszpontot, az időablak mindkét széle érvényes, azon túl hibás', () => {
  const settings = {minLength: 2, maxLength: 2};
  const plan = generateCognitiveAssessment('spatial-span', settings, SEED);
  const item = plan.trials[0];
  const expected = item.stimulus.sequence;
  const duplicates = [responseEvent(item, expected, 0, 0), responseEvent(item, expected, 1, item.stimulus.responseWindowMs)];
  const result = scoreCognitiveAttempt('spatial-span', settings, SEED, raw(duplicates));
  assert.equal(result.correct, 1);
  assert.throws(() => scoreCognitiveAttempt('spatial-span', settings, SEED, raw([responseEvent(item, expected, 0, item.stimulus.responseWindowMs + 1)])), /időablakán kívül/);
});

test('megszakítás, szünet, hanghiba, helyreállítás és nagy időzítési eltérés minőségi zászlót ad', () => {
  const plan = generateCognitiveAssessment('digit-span', {minLength: 2, maxLength: 2}, SEED);
  const item = plan.trials[0];
  const events = [
    {eventId: uuid(0), type: 'visibility', atMs: 0, value: 'hidden'},
    {eventId: uuid(1), type: 'pause', atMs: 1, value: 'background'},
    {eventId: uuid(2), type: 'resume', atMs: 2, value: 'background'},
    {eventId: uuid(3), type: 'recovery', atMs: 3, value: 'reload'},
    {eventId: uuid(4), type: 'timing', trialIndex: item.trialIndex, atMs: 4, value: 1001},
    {eventId: uuid(5), type: 'audio', trialIndex: item.trialIndex, atMs: item.onsetMs, value: 'error'},
  ];
  const result = scoreCognitiveAttempt('digit-span', {minLength: 2, maxLength: 2}, SEED, raw(events));
  assert.deepEqual(result.metrics.qualityFlags, ['audioFailure', 'paused', 'recovered', 'timingDeviation', 'visibilityInterrupted']);
  assert.equal(result.metrics.comparable, false);
});

test('a comparability identity nem függ seedtől vagy dátumtól, de tartalmazza a modalitást és kanonikus SHA-256 kulcsot ad', () => {
  const settings = normalizeCognitiveSettings('spatial-span', {inputModality: 'touch'});
  const identity = cognitiveComparabilityIdentity('spatial-span', settings);
  assert.equal(identity.inputModality, 'touch');
  assert.equal(Object.hasOwn(identity, 'seed'), false);
  const {events} = perfectEvents('spatial-span');
  const result = scoreCognitiveAttempt('spatial-span', settings, SEED, raw(events));
  const expectedHash = createHash('sha256').update(stableStringify(identity)).digest('hex');
  assert.equal(result.metrics.comparabilityKey, expectedHash);
  const mouse = scoreCognitiveAttempt('spatial-span', {...settings, inputModality: 'mouse'}, SEED, raw(events));
  assert.notEqual(mouse.metrics.comparabilityKey, result.metrics.comparabilityKey);
  const practice = scoreCognitiveAttempt('spatial-span', {...settings, mode: 'practice'}, SEED, raw(events));
  assert.equal(practice.metrics.comparable, false);
});

test('túl sok esemény, hibás device és nem véges kontextusidő nem jut el a pontozásig', () => {
  const tooMany = Array.from({length: 4097}, (_, index) => ({eventId: uuid(index), type: 'visibility', atMs: index, value: 'visible'}));
  assert.throws(() => scoreCognitiveAttempt('spatial-span', {}, SEED, raw(tooMany)), /4096/);
  assert.throws(() => scoreCognitiveAttempt('spatial-span', {}, SEED, raw([], {device: {pointer: 'finger', viewportBucket: 'small'}})), /device.pointer/);
  assert.throws(() => scoreCognitiveAttempt('picture-place', {itemCount: 4}, SEED, raw(), {serverDurationMs: Number.NaN}), /serverDurationMs/);
});
