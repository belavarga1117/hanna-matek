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

test('station name generator preserves the existing count and theme API', () => {
  assert.equal(generateStations(1, seeded(2)).length, 3);
  assert.equal(generateStations(99, seeded(3), 'streets').length, 6);
  const streets = generateStations(6, seeded(4), 'streets');
  assert.equal(new Set(streets).size, streets.length);
  assert.ok(streets.every((name) => /(utca|köz|sétány|körút|sor|tér)$/.test(name)));
});

test('station scoring rewards exact positions and supports partial answers', () => {
  const expected = ['A', 'B', 'C', 'D'];
  assert.deepEqual(scoreStationOrder(expected, expected), { correct: 4, total: 4 });
  assert.deepEqual(scoreStationOrder(expected, ['A', 'C']), { correct: 1, total: 4 });
  assert.deepEqual(scoreStationOrder(expected, ['D', 'C', 'B', 'A']), { correct: 0, total: 4 });
});

test('face generator always returns five distinct portraits with fixed names', () => {
  const names = new Map([[0,'Anna'],[1,'Bence'],[2,'Csenge'],[3,'Dávid'],[4,'Félix'],[5,'Emma'],[6,'Hunor'],[7,'Gréta'],[8,'Júlia'],[9,'Kristóf'],[10,'Lili'],[11,'Márk']]);
  for (const requested of [1, 3, 6, 99]) {
    const faces = generateFaces(requested, seeded(100 + requested));
    assert.equal(faces.length, 5);
    assert.equal(new Set(faces.map((face) => face.id)).size, 5);
    assert.equal(new Set(faces.map((face) => face.job)).size, 5);
    assert.equal(new Set(faces.map((face) => face.room)).size, 5);
    assert.ok(faces.every((face) => face.name === names.get(face.id)));
    assert.ok(faces.every((face) => /^\d{2}$/.test(face.room)));
  }
});

test('face scoring counts the requested fields and supports retry-sized rounds', () => {
  const faces = generateFaces(5, seeded(6));
  const answers = new Map(faces.map((face) => [face.id, { name: face.name, job: face.job, room: face.room }]));
  assert.deepEqual(scoreFaceAnswers(faces, answers, 1), { correct: 5, total: 5 });
  assert.deepEqual(scoreFaceAnswers(faces, answers, 2), { correct: 10, total: 10 });
  assert.deepEqual(scoreFaceAnswers(faces, answers, 3), { correct: 15, total: 15 });
  answers.get(faces[0].id).job = 'másik szakterület';
  assert.deepEqual(scoreFaceAnswers(faces, answers, 2), { correct: 9, total: 10 });
});

test('face recall changes order without changing generated data', () => {
  const faces = generateFaces(5, seeded(7));
  const recalled = shuffleFacesForRecall(faces, () => 0.999999);
  assert.notDeepEqual(recalled.map((face) => face.id), faces.map((face) => face.id));
  assert.deepEqual(
    [...recalled].sort((a,b) => a.id-b.id),
    [...faces].sort((a,b) => a.id-b.id),
  );
});

test('price scoring keeps L1 price-only and L2 price-plus-discount units', () => {
  const items = generatePrices(3, 'normal', seeded(20), 1);
  const answers = Object.fromEntries(items.map((item) => [item.id, { price: item.price, discount: item.discount }]));
  assert.deepEqual(scorePriceAnswers(items, answers, 1), { correct: 3, total: 3 });
  assert.deepEqual(scorePriceAnswers(items, answers, 2), { correct: 6, total: 6 });
  answers[items[0].id].discount += 1;
  assert.deepEqual(scorePriceAnswers(items, answers, 1), { correct: 3, total: 3 });
  assert.deepEqual(scorePriceAnswers(items, answers, 2), { correct: 5, total: 6 });
});

test('shopping scoring accepts L1 in any order and requires L2 positions', () => {
  const round = generateShopping(9, seeded(40), { level: 2, difficulty: 'hard' });
  const exact = round.targets.map((item) => item.id);
  const reversed = [...exact].reverse();
  assert.deepEqual(scoreShopping(round.targets, reversed, 1), { correct: 9, total: 9 });
  assert.deepEqual(scoreShopping(round.targets, exact, 2), { correct: 9, total: 9 });
  assert.ok(scoreShopping(round.targets, reversed, 2).correct < 9);
});
