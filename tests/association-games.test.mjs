import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generateStations,
  scoreStationOrder,
  generateFaces,
  shuffleFacesForRecall,
  scoreFaceAnswers,
  generatePrices,
  scorePriceAnswers,
  generateShopping,
  scoreShopping,
  associationGames,
} from '../dist/games/association-games.js';

function seeded(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

test('exports all four playable association games', () => {
  assert.deepEqual(Object.keys(associationGames), ['stations', 'faces', 'prices', 'shopping']);
  for (const game of Object.values(associationGames)) assert.equal(typeof game.mount, 'function');
});

test('station generator respects bounds and returns unique fictional names', () => {
  assert.equal(generateStations(1, seeded(2)).length, 3);
  assert.equal(generateStations(99, seeded(3)).length, 8);
  const stations = generateStations(7, seeded(4));
  assert.equal(new Set(stations).size, stations.length);
});

test('station scoring rewards exact positions and supports partial answers', () => {
  const expected = ['A', 'B', 'C', 'D'];
  assert.deepEqual(scoreStationOrder(expected, expected), { correct: 4, total: 4 });
  assert.deepEqual(scoreStationOrder(expected, ['A', 'C']), { correct: 1, total: 4 });
  assert.deepEqual(scoreStationOrder(expected, ['D', 'C', 'B', 'A']), { correct: 0, total: 4 });
});

test('face generator caps rounds at six and keeps portraits and names distinct', () => {
  const faces = generateFaces(8, seeded(5));
  assert.equal(faces.length, 6);
  assert.equal(new Set(faces.map((face) => face.id)).size, 6);
  assert.equal(new Set(faces.map((face) => face.name)).size, 6);
});

test('face scoring handles exact and partial name recall', () => {
  const faces = generateFaces(4, seeded(6));
  const exact = new Map(faces.map((face) => [face.id, face.name]));
  assert.deepEqual(scoreFaceAnswers(faces, exact), { correct: 4, total: 4 });
  exact.set(faces[1].id, 'más név');
  exact.delete(faces[3].id);
  assert.deepEqual(scoreFaceAnswers(faces, exact), { correct: 2, total: 4 });
});

test('face recall is a changed permutation even when shuffle returns the study order', () => {
  const faces = generateFaces(5, seeded(7));
  const recalled = shuffleFacesForRecall(faces, () => 0.999999);
  assert.deepEqual(
    new Set(recalled.map((face) => face.id)),
    new Set(faces.map((face) => face.id)),
  );
  assert.notDeepEqual(recalled.map((face) => face.id), faces.map((face) => face.id));
  for (const face of recalled) {
    assert.equal(face.name, faces.find((studied) => studied.id === face.id).name);
  }

  const shuffledAnswers = new Map(recalled.map((face) => [face.id, face.name]));
  assert.deepEqual(scoreFaceAnswers(recalled, shuffledAnswers), { correct: 5, total: 5 });
});

test('price generator uses unique items and valid increments for each difficulty', () => {
  const rules = {
    easy: { min: 100, max: 900, step: 100 },
    normal: { min: 100, max: 1990, step: 10 },
    hard: { min: 50, max: 2995, step: 5 },
  };
  Object.entries(rules).forEach(([difficulty, rule], index) => {
    const items = generatePrices(8, difficulty, seeded(10 + index));
    assert.equal(items.length, 8);
    assert.equal(new Set(items.map((item) => item.id)).size, 8);
    assert.equal(new Set(items.map((item) => item.price)).size, 8);
    for (const item of items) {
      assert.ok(item.price >= rule.min && item.price <= rule.max);
      assert.equal((item.price - rule.min) % rule.step, 0);
    }
  });
});

test('price scoring compares numeric values and reports partial recall', () => {
  const items = generatePrices(3, 'normal', seeded(20));
  const answers = Object.fromEntries(items.map((item) => [item.id, String(item.price)]));
  assert.deepEqual(scorePriceAnswers(items, answers), { correct: 3, total: 3 });
  answers[items[0].id] = String(items[0].price + 10);
  delete answers[items[2].id];
  assert.deepEqual(scorePriceAnswers(items, answers), { correct: 1, total: 3 });
});

test('shopping generator creates unique targets plus exactly three distractors', () => {
  const round = generateShopping(6, seeded(30));
  assert.equal(round.targets.length, 6);
  assert.equal(round.options.length, 9);
  assert.equal(new Set(round.targets.map((item) => item.id)).size, 6);
  assert.equal(new Set(round.options.map((item) => item.id)).size, 9);
  const options = new Set(round.options.map((item) => item.id));
  for (const target of round.targets) assert.ok(options.has(target.id));
});

test('shopping scoring counts exact and partial target selections', () => {
  const round = generateShopping(5, seeded(40));
  const exact = new Set(round.targets.map((item) => item.id));
  assert.deepEqual(scoreShopping(round.targets, exact), { correct: 5, total: 5 });
  const partial = new Set([...exact].slice(0, 2));
  partial.add(round.options.find((item) => !exact.has(item.id)).id);
  assert.deepEqual(scoreShopping(round.targets, partial), { correct: 2, total: 5 });
});
