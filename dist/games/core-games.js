import { h, shuffle, sample } from '../core.js';

const EMOJI_OBJECTS = Object.freeze([
  { emoji: '🍎', label: 'alma' },
  { emoji: '🚗', label: 'autó' },
  { emoji: '⭐', label: 'csillag' },
  { emoji: '🐱', label: 'cica' },
  { emoji: '🌸', label: 'virág' },
  { emoji: '🎈', label: 'lufi' },
  { emoji: '🔑', label: 'kulcs' },
  { emoji: '🍀', label: 'lóhere' },
  { emoji: '🦋', label: 'pillangó' },
  { emoji: '🌙', label: 'hold' },
  { emoji: '🎩', label: 'kalap' },
  { emoji: '🐢', label: 'teknős' },
  { emoji: '🍓', label: 'eper' },
  { emoji: '⚽', label: 'labda' },
  { emoji: '🚀', label: 'rakéta' },
  { emoji: '🌻', label: 'napraforgó' },
]);

function clampCount(value, maximum = 8) {
  const number = Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : 3;
  return Math.max(3, Math.min(maximum, number));
}

function once(callback) {
  let called = false;
  return (...args) => {
    if (called) return;
    called = true;
    callback(...args);
  };
}

function sequenceTarget(sequence, reverse) {
  return reverse ? [...sequence].reverse() : [...sequence];
}

function resultSummary(correct, total) {
  if (correct === total) return 'Hibátlan megoldás!';
  if (correct >= Math.ceil(total / 2)) return 'Szép munka, már majdnem megvan!';
  return 'Jó próbálkozás, gyakorolj még egy kört!';
}

function positionDetails(expected, actual, formatter = String) {
  return expected.map((value, index) => ({
    label: `${index + 1}. hely`,
    expected: formatter(value),
    actual: actual[index] === undefined ? '—' : formatter(actual[index]),
    correct: actual[index] === value,
  }));
}

export function generateDigitsRound(settings, rng = Math.random) {
  const count = clampCount(settings?.count);
  const digits = Array.from({ length: count }, () => Math.floor(rng() * 10));
  return { digits, expected: sequenceTarget(digits, Boolean(settings?.reverse)) };
}

export function scoreDigits(expected, answer) {
  const actual = String(answer).split('').map(Number);
  const correct = expected.reduce((score, digit, index) => score + (actual[index] === digit ? 1 : 0), 0);
  return {
    correct,
    total: expected.length,
    summary: resultSummary(correct, expected.length),
    details: positionDetails(expected, actual),
  };
}

export function generateGridRound(settings, rng = Math.random) {
  const size = settings?.difficulty === 'easy' ? 4 : 5;
  const count = clampCount(settings?.count, size * size);
  const cells = sample(Array.from({ length: size * size }, (_, index) => index), count, rng);
  return { size, cells };
}

export function scoreGrid(expected, selected) {
  const wanted = new Set(expected);
  const uniqueSelected = [...new Set(selected)];
  const correct = uniqueSelected.reduce((score, cell) => score + (wanted.has(cell) ? 1 : 0), 0);
  return {
    correct,
    total: expected.length,
    summary: resultSummary(correct, expected.length),
    details: expected.map((cell) => ({
      label: `Mező ${cell + 1}`,
      expected: 'kijelölve',
      actual: uniqueSelected.includes(cell) ? 'kijelölve' : 'kimaradt',
      correct: uniqueSelected.includes(cell),
    })),
  };
}

export function generatePathRound(settings, rng = Math.random) {
  const count = clampCount(settings?.count, 8);
  const path = sample(Array.from({ length: 16 }, (_, index) => index), count, rng);
  return { path, expected: sequenceTarget(path, Boolean(settings?.reverse)) };
}

export function scorePath(expected, selected) {
  const actual = [...selected];
  const correct = expected.reduce((score, cell, index) => score + (actual[index] === cell ? 1 : 0), 0);
  return {
    correct,
    total: expected.length,
    summary: resultSummary(correct, expected.length),
    details: positionDetails(expected, actual, (cell) => `mező ${cell + 1}`),
  };
}

export function generateMissingRound(settings, rng = Math.random) {
  const count = clampCount(settings?.count, 8);
  const objects = sample(EMOJI_OBJECTS, count, rng);
  const missingIndex = Math.floor(rng() * objects.length);
  const missing = objects[missingIndex];
  const remaining = objects.filter((_, index) => index !== missingIndex);
  const shownLabels = new Set(remaining.map((object) => object.label));
  const distractors = sample(
    EMOJI_OBJECTS.filter((object) => object.label !== missing.label && !shownLabels.has(object.label)),
    3,
    rng,
  );
  const choices = shuffle([missing, ...distractors], rng);
  return { objects, missing, remaining, choices };
}

export function scoreMissing(missing, choice) {
  const correct = choice?.label === missing.label ? 1 : 0;
  return {
    correct,
    total: 1,
    summary: correct ? `Igen, ez tűnt el: ${missing.label}!` : `Ez tűnt el: ${missing.label}.`,
    details: [{
      label: 'Hiányzó tárgy',
      expected: `${missing.emoji} ${missing.label}`,
      actual: choice ? `${choice.emoji} ${choice.label}` : '—',
      correct: Boolean(correct),
    }],
  };
}

function mountDigits(ctx) {
  const make = ctx.h || h;
  const round = generateDigitsRound(ctx.settings, ctx.rand);
  const finish = once(ctx.done);
  const stack = make('div', { className: 'game-stack' });
  const display = make('div', {
    className: 'digit-display',
    'aria-label': 'Megjegyzendő számsor',
  }, round.digits.join(' '));

  ctx.root.replaceChildren(stack);
  stack.append(display);
  ctx.phase('Számsor', 'Jegyezd meg a számjegyeket!');

  ctx.memorize(() => {
    display.textContent = '• '.repeat(round.digits.length).trim();
    display.setAttribute('aria-label', 'A számsor elrejtve');
    const direction = ctx.settings.reverse ? 'fordított sorrendben' : 'eredeti sorrendben';
    ctx.phase('Te jössz!', `Írd be a számokat ${direction}.`);

    const note = make('p', { className: 'game-note', 'aria-live': 'polite' }, `Pontosan ${round.expected.length} számjegyet adj meg.`);
    const input = make('input', {
      className: 'sequence-input',
      type: 'text',
      inputMode: 'numeric',
      autocomplete: 'off',
      maxlength: round.expected.length,
      'aria-label': 'A felidézett számsor',
    });
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, round.expected.length);
      note.textContent = `${input.value.length} / ${round.expected.length} számjegy`;
    });
    const check = make('button', { className: 'primary-button', type: 'button' }, 'Ellenőrzés');
    const submit = () => {
      if (input.value.length !== round.expected.length) {
        note.textContent = `Még ${round.expected.length - input.value.length} számjegy hiányzik.`;
        input.focus();
        return;
      }
      input.disabled = true;
      check.disabled = true;
      finish(scoreDigits(round.expected, input.value));
    };
    check.addEventListener('click', submit);
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      submit();
    });
    stack.append(input, note, check);
    input.focus();
  });
}

function createGrid(make, size, className = 'memory-grid') {
  return make('div', {
    className,
    style: { gridTemplateColumns: `repeat(${size}, minmax(44px, 1fr))` },
  });
}

function mountGrid(ctx) {
  const make = ctx.h || h;
  const round = generateGridRound(ctx.settings, ctx.rand);
  const finish = once(ctx.done);
  const stack = make('div', { className: 'game-stack' });
  const grid = createGrid(make, round.size);

  for (let index = 0; index < round.size * round.size; index += 1) {
    grid.append(make('button', {
      className: `memory-tile${round.cells.includes(index) ? ' is-lit' : ''}`,
      type: 'button',
      disabled: true,
      'aria-label': round.cells.includes(index) ? `Világító mező ${index + 1}` : `Mező ${index + 1}`,
    }));
  }
  ctx.root.replaceChildren(stack);
  stack.append(grid);
  ctx.phase('Memóriarács', `Jegyezd meg a ${round.cells.length} világító mezőt!`);

  ctx.memorize(() => {
    ctx.phase('Te jössz!', `Jelölj ki pontosan ${round.cells.length} mezőt.`);
    grid.replaceChildren();
    const selected = new Set();
    const note = make('p', { className: 'game-note', 'aria-live': 'polite' }, `0 / ${round.cells.length} kijelölve`);
    const buttons = [];
    for (let index = 0; index < round.size * round.size; index += 1) {
      const button = make('button', {
        className: 'memory-tile',
        type: 'button',
        'aria-label': `Mező ${index + 1}`,
        'aria-pressed': 'false',
      });
      button.addEventListener('click', () => {
        if (selected.has(index)) {
          selected.delete(index);
          button.classList.remove('is-selected');
          button.setAttribute('aria-pressed', 'false');
        } else if (selected.size < round.cells.length) {
          selected.add(index);
          button.classList.add('is-selected');
          button.setAttribute('aria-pressed', 'true');
        } else {
          note.textContent = `Már kijelöltél ${round.cells.length} mezőt. Egyet vegyél ki a cseréhez.`;
          return;
        }
        note.textContent = `${selected.size} / ${round.cells.length} kijelölve`;
      });
      buttons.push(button);
      grid.append(button);
    }
    const check = make('button', { className: 'primary-button', type: 'button' }, 'Ellenőrzés');
    check.addEventListener('click', () => {
      if (selected.size !== round.cells.length) {
        note.textContent = `Még ${round.cells.length - selected.size} mezőt jelölj ki.`;
        return;
      }
      buttons.forEach((button) => { button.disabled = true; });
      check.disabled = true;
      finish(scoreGrid(round.cells, [...selected]));
    });
    stack.append(note, check);
  });
}

function mountPath(ctx) {
  const make = ctx.h || h;
  const round = generatePathRound(ctx.settings, ctx.rand);
  const finish = once(ctx.done);
  const stack = make('div', { className: 'game-stack' });
  const grid = createGrid(make, 4);
  const pathOrder = new Map(round.path.map((cell, index) => [cell, index + 1]));

  for (let index = 0; index < 16; index += 1) {
    const order = pathOrder.get(index);
    grid.append(make('button', {
      className: `memory-tile${order ? ' is-lit' : ''}`,
      type: 'button',
      disabled: true,
      'aria-label': order ? `${order}. lépés` : `Mező ${index + 1}`,
    }, order ? make('span', { className: 'tile-number' }, String(order)) : ''));
  }
  ctx.root.replaceChildren(stack);
  stack.append(grid);
  ctx.phase('Fényösvény', 'Jegyezd meg a mezők sorrendjét!');

  ctx.memorize(() => {
    const instruction = ctx.settings.reverse ? 'Koppints az útvonalra visszafelé.' : 'Koppints az útvonalra sorrendben.';
    ctx.phase('Te jössz!', instruction);
    grid.replaceChildren();
    const selected = [];
    const buttons = [];
    const note = make('p', { className: 'game-note', 'aria-live': 'polite' }, `0 / ${round.expected.length} lépés`);

    function renderSelection() {
      buttons.forEach((button, cell) => {
        const order = selected.indexOf(cell);
        button.replaceChildren();
        button.classList.toggle('is-selected', order >= 0);
        button.disabled = order >= 0;
        button.setAttribute('aria-label', order >= 0 ? `Mező ${cell + 1}, ${order + 1}. választás` : `Mező ${cell + 1}`);
        if (order >= 0) button.append(make('span', { className: 'tile-number' }, String(order + 1)));
      });
      note.textContent = `${selected.length} / ${round.expected.length} lépés`;
    }

    for (let index = 0; index < 16; index += 1) {
      const button = make('button', {
        className: 'memory-tile',
        type: 'button',
        'aria-label': `Mező ${index + 1}`,
      });
      button.addEventListener('click', () => {
        if (selected.length >= round.expected.length) return;
        selected.push(index);
        renderSelection();
      });
      buttons.push(button);
      grid.append(button);
    }

    const controls = make('div', { className: 'answer-row' });
    const undo = make('button', { className: 'secondary-button', type: 'button' }, 'Visszavonás');
    undo.addEventListener('click', () => {
      selected.pop();
      renderSelection();
    });
    const clear = make('button', { className: 'secondary-button', type: 'button' }, 'Törlés');
    clear.addEventListener('click', () => {
      selected.length = 0;
      renderSelection();
    });
    const check = make('button', { className: 'primary-button', type: 'button' }, 'Ellenőrzés');
    check.addEventListener('click', () => {
      if (selected.length !== round.expected.length) {
        note.textContent = `Még ${round.expected.length - selected.length} lépés hiányzik.`;
        return;
      }
      buttons.forEach((button) => { button.disabled = true; });
      undo.disabled = true;
      clear.disabled = true;
      check.disabled = true;
      finish(scorePath(round.expected, selected));
    });
    controls.append(undo, clear, check);
    stack.append(note, controls);
  });
}

function objectTile(make, object, button = false) {
  return make(button ? 'button' : 'div', {
    className: 'object-tile',
    ...(button ? { type: 'button' } : {}),
  },
  make('span', { className: 'object-emoji', 'aria-hidden': 'true' }, object.emoji),
  make('span', {}, object.label));
}

function mountMissing(ctx) {
  const make = ctx.h || h;
  const round = generateMissingRound(ctx.settings, ctx.rand);
  const finish = once(ctx.done);
  const stack = make('div', { className: 'game-stack' });
  const objects = make('div', {
    className: 'memory-grid',
    style: { gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))' },
  });
  round.objects.forEach((object) => objects.append(objectTile(make, object)));
  ctx.root.replaceChildren(stack);
  stack.append(objects);
  ctx.phase('Mi tűnt el?', 'Jegyezd meg a tárgyakat!');

  ctx.memorize(() => {
    ctx.phase('Mi tűnt el?', 'Válaszd ki a hiányzó tárgyat!');
    objects.replaceChildren();
    round.remaining.forEach((object) => objects.append(objectTile(make, object)));
    const note = make('p', { className: 'game-note', 'aria-live': 'polite' }, 'Nézd meg a négy lehetőséget.');
    const choices = make('div', {
      className: 'choice-grid',
      style: { gridTemplateColumns: 'repeat(2, minmax(120px, 1fr))' },
    });
    const buttons = round.choices.map((choice) => {
      const button = objectTile(make, choice, true);
      button.setAttribute('aria-label', `${choice.label} választása`);
      button.addEventListener('click', () => {
        buttons.forEach((item) => { item.disabled = true; });
        finish(scoreMissing(round.missing, choice));
      });
      choices.append(button);
      return button;
    });
    stack.append(note, choices);
  });
}

export const coreGames = Object.freeze({
  digits: { mount: mountDigits },
  grid: { mount: mountGrid },
  path: { mount: mountPath },
  missing: { mount: mountMissing },
});
