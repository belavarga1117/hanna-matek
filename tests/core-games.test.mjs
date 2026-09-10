import test from 'node:test';
import assert from 'node:assert/strict';

import {
  coreGames,
  generateDigitsRound,
  generateGridRound,
  generateMissingRound,
  generatePathRound,
  pathFlashAt,
  scoreDigits,
  scoreGrid,
  scoreMissing,
  scorePath,
} from '../dist/games/core-games.js';

function rngFrom(values) {
  let index = 0;
  return () => values[index++ % values.length];
}

test('mind a négy alapjáték mountolható', () => {
  assert.deepEqual(Object.keys(coreGames), ['digits', 'grid', 'path', 'missing']);
  Object.values(coreGames).forEach((game) => assert.equal(typeof game.mount, 'function'));
});

test('a számsor nullát és ismétlést is létrehoz, fordított módban megfordítja a célt', () => {
  const round = generateDigitsRound({ count: 5, reverse: true }, rngFrom([0.01, 0.19, 0.19, 0.51, 0.99]));
  assert.deepEqual(round.digits, [0, 1, 1, 5, 9]);
  assert.deepEqual(round.expected, [9, 5, 1, 1, 0]);
  assert.deepEqual(scoreDigits(round.expected, '95110'), {
    correct: 5,
    total: 5,
    summary: 'Hibátlan megoldás!',
    details: [
      { label: '1. hely', expected: '9', actual: '9', correct: true },
      { label: '2. hely', expected: '5', actual: '5', correct: true },
      { label: '3. hely', expected: '1', actual: '1', correct: true },
      { label: '4. hely', expected: '1', actual: '1', correct: true },
      { label: '5. hely', expected: '0', actual: '0', correct: true },
    ],
  });
  assert.equal(scoreDigits(round.expected, '95120').correct, 4);
});

test('a memóriarács mérete nehézségfüggő, mezői különbözők és sorrendtől függetlenül pontoz', () => {
  const easy = generateGridRound({ count: 6, difficulty: 'easy' }, rngFrom([0.9, 0.1, 0.7, 0.2, 0.6]));
  const hard = generateGridRound({ count: 8, difficulty: 'hard' }, rngFrom([0.3, 0.8, 0.2, 0.6]));
  assert.equal(easy.size, 4);
  assert.equal(hard.size, 5);
  assert.equal(easy.cells.length, 6);
  assert.equal(new Set(easy.cells).size, 6);
  assert.ok(easy.cells.every((cell) => cell >= 0 && cell < 16));
  assert.ok(hard.cells.every((cell) => cell >= 0 && cell < 25));
  assert.equal(scoreGrid(easy.cells, [...easy.cells].reverse()).correct, 6);
  assert.equal(scoreGrid(easy.cells, [easy.cells[0], easy.cells[1], 99]).correct, 2);
});

test('a fényösvény különböző mezőket generál és a pozíció szerinti részpontot számolja', () => {
  const round = generatePathRound({ count: 4, reverse: true }, rngFrom([0.05, 0.5, 0.95, 0.2]));
  assert.equal(round.path.length, 4);
  assert.equal(new Set(round.path).size, 4);
  assert.deepEqual(round.expected, [...round.path].reverse());
  assert.equal(scorePath(round.expected, round.expected).correct, 4);
  const oneWrong = [...round.expected];
  [oneWrong[0], oneWrong[1]] = [oneWrong[1], oneWrong[0]];
  assert.equal(scorePath(round.expected, oneWrong).correct, 2);
});

test('a fényösvény egyesével villant, rövid üres szünettel a lépések között', () => {
  const path = [2, 8, 5];
  assert.equal(pathFlashAt(path, 0), 2);
  assert.equal(pathFlashAt(path, 0.65 / 3), 2);
  assert.equal(pathFlashAt(path, 0.7 / 3), null);
  assert.equal(pathFlashAt(path, 1 / 3), 8);
  assert.equal(pathFlashAt(path, (1 + 0.65) / 3), 8);
  assert.equal(pathFlashAt(path, (1 + 0.7) / 3), null);
  assert.equal(pathFlashAt(path, 2 / 3), 5);
  assert.equal(pathFlashAt(path, (2 + 0.7) / 3), null);
});

test('a fényösvény végén minden fény kialszik, a szélső értékek biztonságosak', () => {
  const path = [4, 10, 1, 14];
  assert.equal(pathFlashAt(path, 1), null);
  assert.equal(pathFlashAt(path, 2), null);
  assert.equal(pathFlashAt([], 0.5), null);
  assert.equal(pathFlashAt(null, 0.5), null);
  assert.equal(pathFlashAt(path, -0.5), 4);
  for (let step = 0; step <= 100; step += 1) {
    const active = pathFlashAt(path, step / 100);
    assert.ok(active === null || path.includes(active));
  }
});

test('a hiányzó tárgy köre különböző tárgyakat és négy egyedi választ ad', () => {
  const round = generateMissingRound({ count: 6 }, rngFrom([0.15, 0.8, 0.3, 0.65, 0.4, 0.9, 0.25]));
  assert.equal(round.objects.length, 6);
  assert.equal(new Set(round.objects.map((item) => item.label)).size, 6);
  assert.equal(round.remaining.length, 5);
  assert.ok(!round.remaining.some((item) => item.label === round.missing.label));
  assert.equal(round.choices.length, 4);
  assert.equal(new Set(round.choices.map((item) => item.label)).size, 4);
  assert.ok(round.choices.some((item) => item.label === round.missing.label));
  assert.equal(scoreMissing(round.missing, round.missing).correct, 1);
  assert.equal(scoreMissing(round.missing, round.choices.find((item) => item.label !== round.missing.label)).correct, 0);
});
