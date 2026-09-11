import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODE_DEFINITIONS,
  adaptLevel,
  channelsForConfig,
  evaluateArithmetic,
  generateSession,
  isChannelMatch,
  normalizeConfig,
  resolveTargetIndex,
  scoreSession,
} from '../dist/nback/engine.js';

function cfg(overrides = {}) {
  return normalizeConfig({trialCount: 4, ...overrides});
}

function answer(events = []) {
  return {version: 1, events};
}

function event(trialIndex, channel, value = true, atMs = 100) {
  return {trialIndex, channel, atMs, value};
}

function object(session, trialIndex, id = 1) {
  return session.trials[trialIndex].stimuli.objects.find((item) => item.id === id);
}

function setPositions(session, values, objectId = 1) {
  values.forEach((value, index) => {
    object(session, index, objectId).position = value;
    session.trials[index].stimuli.positions = session.trials[index].stimuli.objects.map((item) => item.position);
  });
}

test('a 28 forrásmód az eredeti numerikus azonosítóval és stabil csatornákkal érhető el', () => {
  assert.equal(MODE_DEFINITIONS.length, 28);
  assert.equal(new Set(MODE_DEFINITIONS.map((item) => item.id)).size, 28);
  assert.deepEqual(channelsForConfig(cfg({mode: 4})).map((item) => item.id), ['visvis', 'visaudio', 'audiovis', 'audio']);
  assert.deepEqual(channelsForConfig(cfg({mode: 3, multiStim: 3})).map((item) => item.id), ['position1', 'position2', 'position3', 'vis1', 'vis2', 'vis3', 'audio']);
  assert.deepEqual(channelsForConfig(cfg({mode: 101, multiStim: 4})).map((item) => item.id), ['position1', 'position2', 'position3', 'position4', 'audio', 'audio2']);
});

test('a query-string beállítások normalizálódnak, az érvénytelen forráskombinációk hibát adnak', () => {
  const normalized = normalizeConfig({n: '3', trialCount: '20', intervalMs: '2500', adaptive: 'true', interference: '0.25', operations: '+,-', lowScoreCount: '2'});
  assert.equal(normalized.n, 3);
  assert.equal(normalized.adaptive, true);
  assert.deepEqual(normalized.operations, ['+', '-']);
  assert.throws(() => cfg({variable: true, crab: true}), /Variable és Crab/);
  assert.throws(() => cfg({mode: 7, multiStim: 2}), /Multi-stim/);
  assert.throws(() => cfg({mode: 25, multiStim: 2}), /Multi-stim/);
  assert.throws(() => cfg({mode: 4, multiStim: 2}), /Multi-stim/);
  assert.throws(() => normalizeConfig({adaptive: false, lowScoreCount: 1}), /kézi módban/);
  assert.throws(() => normalizeConfig({scoreProfile: 'jaeggi', mode: 3, trialCount: 20}), /Dual/);
  assert.throws(() => normalizeConfig({scoreProfile: 'jaeggi', mode: 2, trialCount: 19}), /20 pontozott/);
  assert.throws(() => normalizeConfig({scoreProfile: 'jaeggi', mode: 2, trialCount: 20, selfPaced: true}), /Self-paced/);
});

test('azonos seed és config bájtszinten azonos, n+trialCount hosszú sessiont ad', () => {
  const config = cfg({mode: 28, n: 3, trialCount: 12});
  const first = generateSession({seed: 0x1234abcd, config});
  const second = generateSession({seed: 0x1234abcd, config});
  assert.deepEqual(first, second);
  assert.equal(first.trials.length, 15);
  assert.ok(first.trials.slice(0, 3).every((trial) => trial.warmup && trial.targetIndex === null && trial.shownBack === null));
  assert.ok(first.trials.slice(3).every((trial) => !trial.warmup && trial.targetIndex === trial.index - 3));
});

test('minden alapmód, Crab mód és engedett Multi-stim változat generálható és pontozható', () => {
  for (const definition of MODE_DEFINITIONS) {
    const config = cfg({mode: definition.id});
    const session = generateSession({seed: definition.id, config});
    assert.doesNotThrow(() => scoreSession(session, answer()));
    const crab = cfg({mode: definition.id, crab: true, n: 3});
    assert.doesNotThrow(() => scoreSession(generateSession({seed: definition.id + 1000, config: crab}), answer()));
  }
  for (const mode of [2, 3, 10, 20, 21, 26, 101, 104, 105]) {
    for (const multiStim of [2, 3, 4]) {
      for (const identity of ['color', 'image']) {
        const config = cfg({mode, multiStim, identity, crab: true, n: 3});
        const session = generateSession({seed: mode * 100 + multiStim, config});
        assert.equal(session.trials[0].stimuli.objects.length, multiStim);
        assert.ok(session.trials.every((trial) => new Set(trial.stimuli.positions).size === multiStim));
        assert.doesNotThrow(() => scoreSession(session, answer()));
      }
    }
  }
});

test('a normál kézi target-sorozat külön számolja a hit, téves jelzés, kihagyás és helyes elutasítás eredményeit', () => {
  const config = cfg({mode: 10, n: 1});
  const session = generateSession({seed: 1, config});
  setPositions(session, [1, 1, 2, 2, 3]);

  const perfect = scoreSession(session, answer([event(1, 'position1'), event(3, 'position1')]));
  assert.equal(perfect.percent, 100);
  assert.deepEqual(perfect.metrics.totals, {hits: 2, falseAlarms: 0, misses: 0, correctRejections: 2});
  assert.equal(perfect.correct, 2);
  assert.equal(perfect.total, 2);

  const wrong = scoreSession(session, answer([event(2, 'position1')]));
  assert.equal(wrong.percent, 0);
  assert.deepEqual(wrong.metrics.totals, {hits: 0, falseAlarms: 1, misses: 2, correctRejections: 1});

  const silent = scoreSession(session, answer());
  assert.equal(silent.percent, 0);
  assert.equal(silent.metrics.totals.misses, 2);
  assert.equal(silent.metrics.totals.correctRejections, 2);

  const clicksEverything = scoreSession(session, answer([1, 2, 3, 4].map((trial) => event(trial, 'position1'))));
  assert.equal(clicksEverything.percent, 50);
  assert.equal(clicksEverything.metrics.totals.hits, 2);
  assert.equal(clicksEverything.metrics.totals.falseAlarms, 2);
});

test('a kombinációs keresztirányok egymástól függetlenek és nem felcserélhetők', () => {
  const config = cfg({mode: 4, n: 1});
  const session = generateSession({seed: 2, config});
  session.trials[0].stimuli.visual = 1;
  session.trials[0].stimuli.audio = 2;
  session.trials[1].stimuli.visual = 2;
  session.trials[1].stimuli.audio = 1;
  for (let index = 2; index < session.trials.length; index += 1) {
    session.trials[index].stimuli.visual = 3 + index;
    session.trials[index].stimuli.audio = 8 - index;
  }
  assert.equal(isChannelMatch(session, 1, 'visaudio'), true);
  assert.equal(isChannelMatch(session, 1, 'audiovis'), true);
  assert.equal(isChannelMatch(session, 1, 'visvis'), false);
  assert.equal(isChannelMatch(session, 1, 'audio'), false);

  const rightDirections = scoreSession(session, answer([event(1, 'visaudio'), event(1, 'audiovis')]));
  const swappedDirections = scoreSession(session, answer([event(1, 'visvis'), event(1, 'audio')]));
  assert.equal(rightDirections.metrics.channels.find((item) => item.id === 'visaudio').hits, 1);
  assert.equal(rightDirections.metrics.channels.find((item) => item.id === 'audiovis').hits, 1);
  assert.ok(swappedDirections.metrics.channels.find((item) => item.id === 'visaudio').misses >= 1);
  assert.ok(swappedDirections.metrics.channels.find((item) => item.id === 'audiovis').misses >= 1);
});

test('Multi-stimben a tárgyak helycseréje nem tárgyazonos pozíció-match', () => {
  const config = cfg({mode: 2, n: 1, multiStim: 2, interference: 0});
  const session = generateSession({seed: 3, config});
  object(session, 0, 1).position = 1;
  object(session, 0, 2).position = 2;
  object(session, 1, 1).position = 2;
  object(session, 1, 2).position = 1;
  for (const trial of session.trials.slice(2)) {
    object(session, trial.index, 1).position = 3 + trial.index;
    object(session, trial.index, 2).position = 8 - trial.index;
  }
  for (const trial of session.trials) trial.stimuli.positions = trial.stimuli.objects.map((item) => item.position);
  assert.equal(isChannelMatch(session, 1, 'position1'), false);
  assert.equal(isChannelMatch(session, 1, 'position2'), false);
  const result = scoreSession(session, answer([event(1, 'position1'), event(1, 'position2')]));
  assert.equal(result.metrics.totals.falseAlarms, 2);
});

test('Variable módban minden pontozott próba a saját shownBack értékét használja', () => {
  const config = cfg({mode: 10, n: 4, trialCount: 20, variable: true, interference: 0});
  const session = generateSession({seed: 77, config});
  const shown = session.trials.slice(4).map((trial) => trial.shownBack);
  assert.ok(new Set(shown).size >= 3, `kevés különböző Variable index: ${shown}`);
  assert.ok(shown.every((back) => back >= 1 && back <= 4));
  for (const trial of session.trials.slice(4)) {
    assert.equal(trial.targetIndex, resolveTargetIndex(trial.index, config, trial.shownBack));
    object(session, trial.index).position = object(session, trial.targetIndex).position;
    trial.stimuli.positions = [object(session, trial.index).position];
  }
  const events = session.trials.slice(4).map((trial) => event(trial.index, 'position1'));
  assert.equal(scoreSession(session, answer(events)).percent, 100);
});

test('Crab 3-back első pontozott blokkja és széle 1,3,5,1 távolságot használ', () => {
  const config = cfg({mode: 10, n: 3, crab: true});
  const session = generateSession({seed: 4, config});
  assert.deepEqual(session.trials.slice(3).map((trial) => trial.shownBack), [1, 3, 5, 1]);
  assert.deepEqual(session.trials.slice(3).map((trial) => trial.targetIndex), [2, 1, 0, 5]);
  assert.equal(resolveTargetIndex(3, config), 2);
  assert.equal(resolveTargetIndex(5, config), 0);
  for (const trial of session.trials.slice(3)) {
    object(session, trial.index).position = object(session, trial.targetIndex).position;
    trial.stimuli.positions = [object(session, trial.index).position];
  }
  assert.equal(scoreSession(session, answer(session.trials.slice(3).map((trial) => event(trial.index, 'position1')))).percent, 100);
});

test('a forrásarányú generator tényleges match-eket és valódi céltól eltérő near-miss interference-et is létrehoz', () => {
  const config = cfg({mode: 10, n: 4, trialCount: 196, interference: 1});
  const session = generateSession({seed: 0xfeedbeef, config});
  let matches = 0;
  let nearMisses = 0;
  for (const trial of session.trials.slice(config.n)) {
    const current = object(session, trial.index).position;
    const target = object(session, trial.targetIndex).position;
    if (current === target) matches += 1;
    const candidateLags = [trial.shownBack - 1, trial.shownBack + 1, trial.shownBack + config.n];
    if (trial.shownBack < 3) candidateLags.shift();
    if (current !== target && candidateLags.some((lag) => trial.index - lag >= 0 && object(session, trial.index - lag).position === current)) nearMisses += 1;
  }
  assert.ok(matches >= 10, `túl kevés garantált vagy természetes match: ${matches}`);
  assert.ok(nearMisses >= 80, `túl kevés interference near-miss: ${nearMisses}`);
});

test('Jaeggi 20 pontozott próbán 6+6 match-et, 2 közöset és csendben 70%-ot ad', () => {
  const config = normalizeConfig({scoreProfile: 'jaeggi', mode: 2, n: 3, trialCount: 20, adaptive: true});
  const session = generateSession({seed: 5, config});
  const positions = session.trials.slice(3).filter((trial) => isChannelMatch(session, trial.index, 'position1')).map((trial) => trial.index);
  const audio = session.trials.slice(3).filter((trial) => isChannelMatch(session, trial.index, 'audio')).map((trial) => trial.index);
  assert.equal(positions.length, 6);
  assert.equal(audio.length, 6);
  assert.equal(positions.filter((index) => audio.includes(index)).length, 2);
  const result = scoreSession(session, answer());
  assert.equal(result.percent, 70);
  assert.equal(result.correct, 28);
  assert.equal(result.total, 40);
});

test('duplikált match nem ad pluszpontot, aritmetikánál az utolsó érték számít, az időablak szigorú', () => {
  const positionConfig = cfg({mode: 10, n: 1, intervalMs: 1000});
  const positionSession = generateSession({seed: 6, config: positionConfig});
  setPositions(positionSession, [1, 1, 2, 3, 4]);
  const duplicate = scoreSession(positionSession, answer([event(1, 'position1'), event(1, 'position1', true, 500)]));
  assert.equal(duplicate.metrics.totals.hits, 1);
  assert.equal(duplicate.correct, 1);
  assert.throws(() => scoreSession(positionSession, answer([event(1, 'position1', true, 1001)])), /próbaablakon/);
  assert.throws(() => scoreSession(positionSession, answer([event(1, 'position1', false)])), /csak true/);

  const arithmeticConfig = cfg({mode: 7, n: 1, allowFractions: true});
  const arithmeticSession = generateSession({seed: 7, config: arithmeticConfig});
  arithmeticSession.trials[0].stimuli.number = 1;
  arithmeticSession.trials[1].stimuli.number = 2;
  arithmeticSession.trials[1].operation = '/';
  const lastWins = scoreSession(arithmeticSession, answer([
    event(1, 'arithmetic', '2/3'),
    event(1, 'arithmetic', '0.5', 200),
  ]));
  assert.equal(lastWins.metrics.channels[0].hits, 1);
});

test('az aritmetika negatív és nem termináló törtet is egzaktan kezel, osztó nulla nem csúszhat át', () => {
  assert.deepEqual(evaluateArithmetic(-1, '/', 2), {numerator: -1, denominator: 2, text: '-1/2'});
  assert.deepEqual(evaluateArithmetic(1, '/', 3), {numerator: 1, denominator: 3, text: '1/3'});
  assert.deepEqual(evaluateArithmetic(-3, '-', -5), {numerator: 2, denominator: 1, text: '2'});
  assert.throws(() => evaluateArithmetic(1, '/', 0), /Nullával/);

  const config = cfg({mode: 7, n: 1, allowNegative: true, allowFractions: true});
  const session = generateSession({seed: 8, config});
  session.trials[0].stimuli.number = -1;
  session.trials[1].stimuli.number = 2;
  session.trials[1].operation = '/';
  session.trials[2].stimuli.number = 3;
  session.trials[2].operation = '/';
  session.trials[3].stimuli.number = -5;
  session.trials[3].operation = '-';
  session.trials[4].stimuli.number = 4;
  session.trials[4].operation = '+';
  const events = [
    event(1, 'arithmetic', '-0.5'),
    event(2, 'arithmetic', '2/3'),
    event(3, 'arithmetic', '8'),
    event(4, 'arithmetic', '-1'),
  ];
  assert.equal(scoreSession(session, answer(events)).percent, 100);
  session.trials[2].stimuli.number = 0;
  assert.throws(() => scoreSession(session, answer(events)), /nulla az osztó/);
});

test('a válasz nélküli nulla eredmény miss marad, és a generált osztás soha nem nullával történik', () => {
  const config = cfg({mode: 7, n: 1, operations: ['*']});
  const session = generateSession({seed: 9, config});
  session.trials[0].stimuli.number = 0;
  session.trials[1].stimuli.number = 5;
  session.trials[1].operation = '*';
  const result = scoreSession(session, answer());
  assert.equal(result.metrics.channels[0].hits, 0);
  assert.ok(result.metrics.channels[0].misses >= 1);

  for (const allowFractions of [false, true]) {
    const divisionConfig = cfg({mode: 7, n: 3, trialCount: 80, operations: ['/'], allowNegative: true, allowFractions});
    const generated = generateSession({seed: allowFractions ? 10 : 11, config: divisionConfig});
    assert.ok(generated.trials.slice(3).every((trial) => trial.stimuli.number !== 0));
    if (!allowFractions) {
      for (const trial of generated.trials.slice(3)) assert.equal(Math.abs(generated.trials[trial.targetIndex].stimuli.number % trial.stimuli.number), 0);
    } else {
      const accepted = new Set(['0', '1/10', '1/5', '3/10', '2/5', '1/2', '3/5', '7/10', '4/5', '9/10', '1/8', '1/4', '3/8', '5/8', '3/4', '7/8', '3/20', '7/20', '9/20', '11/20', '13/20', '17/20', '19/20']);
      let fractional = 0;
      for (const trial of generated.trials.slice(3)) {
        const numerator = Math.abs(generated.trials[trial.targetIndex].stimuli.number);
        const denominator = Math.abs(trial.stimuli.number);
        const remainder = numerator % denominator;
        const text = evaluateArithmetic(remainder, '/', denominator).text;
        assert.ok(accepted.has(text), `nem whitelistelt tört rész: ${text}`);
        fractional += remainder !== 0 ? 1 : 0;
      }
      assert.ok(fractional > 0, 'a mintasorozatnak whitelistelt tört osztást is kell tartalmaznia');
    }
  }
});

test('a túl hosszú aritmetikai nyers érték még BigInt-konverzió előtt elutasított', () => {
  const config = cfg({mode: 7, n: 1, operations: ['/'], allowFractions: true});
  const session = generateSession({seed: 12, config});
  assert.throws(() => scoreSession(session, answer([event(1, 'arithmetic', '1'.repeat(33))])), /legfeljebb 32 karakter/);
});

test('a három Workshop low strike köztes eredmények mellett is megmarad, majd csökkenti N-t', () => {
  assert.deepEqual(adaptLevel({n: 4, percent: 49, lowScoreCount: 0}), {fromN: 4, nextN: 4, lowScoreCount: 1, action: 'stay'});
  assert.deepEqual(adaptLevel({n: 4, percent: 65, lowScoreCount: 1}), {fromN: 4, nextN: 4, lowScoreCount: 1, action: 'stay'});
  assert.deepEqual(adaptLevel({n: 4, percent: 10, lowScoreCount: 1}), {fromN: 4, nextN: 4, lowScoreCount: 2, action: 'stay'});
  assert.deepEqual(adaptLevel({n: 4, percent: 49, lowScoreCount: 2}), {fromN: 4, nextN: 3, lowScoreCount: 0, action: 'down'});
  assert.deepEqual(adaptLevel({n: 4, percent: 80, lowScoreCount: 2}), {fromN: 4, nextN: 5, lowScoreCount: 0, action: 'up'});
  assert.deepEqual(adaptLevel({n: 1, percent: 0, lowScoreCount: 2}), {fromN: 1, nextN: 1, lowScoreCount: 0, action: 'stay'});
  assert.deepEqual(adaptLevel({n: 3, percent: 74, scoreProfile: 'jaeggi'}), {fromN: 3, nextN: 2, lowScoreCount: 0, action: 'down'});
  assert.deepEqual(adaptLevel({n: 3, percent: 100, adaptive: false, lowScoreCount: 2}), {fromN: 3, nextN: 3, lowScoreCount: 0, action: 'manual'});
});
