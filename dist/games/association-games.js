import { h, shuffle, sample } from '../core.js';

const STATION_NAMES = [
  'Boróka tér',
  'Csillagliget',
  'Diófa kapu',
  'Ezüstpatak',
  'Fecskevár',
  'Gesztenye sor',
  'Hajnalkert',
  'Ibolya híd',
  'Kavics-part',
  'Lombos-rét',
  'Meseerdő',
  'Napraforgó út',
  'Pillangóliget',
  'Szivárvány-hegy',
];

const FACE_CATALOG = [
  { id: 0, name: 'Anna' },
  { id: 1, name: 'Bence' },
  { id: 2, name: 'Csenge' },
  { id: 3, name: 'Dávid' },
  { id: 4, name: 'Emma' },
  { id: 5, name: 'Félix' },
  { id: 6, name: 'Gréta' },
  { id: 7, name: 'Hunor' },
  { id: 8, name: 'Júlia' },
  { id: 9, name: 'Kristóf' },
  { id: 10, name: 'Lili' },
  { id: 11, name: 'Márk' },
];

const GROCERY_ITEMS = [
  { id: 'alma', emoji: '🍎', name: 'alma' },
  { id: 'banan', emoji: '🍌', name: 'banán' },
  { id: 'kenyer', emoji: '🍞', name: 'kenyér' },
  { id: 'tej', emoji: '🥛', name: 'tej' },
  { id: 'sajt', emoji: '🧀', name: 'sajt' },
  { id: 'tojas', emoji: '🥚', name: 'tojás' },
  { id: 'paradicsom', emoji: '🍅', name: 'paradicsom' },
  { id: 'repa', emoji: '🥕', name: 'sárgarépa' },
  { id: 'szolo', emoji: '🍇', name: 'szőlő' },
  { id: 'eper', emoji: '🍓', name: 'eper' },
  { id: 'joghurt', emoji: '🥣', name: 'joghurt' },
  { id: 'rizs', emoji: '🍚', name: 'rizs' },
  { id: 'citrom', emoji: '🍋', name: 'citrom' },
  { id: 'brokkoli', emoji: '🥦', name: 'brokkoli' },
  { id: 'hal', emoji: '🐟', name: 'hal' },
  { id: 'mez', emoji: '🍯', name: 'méz' },
];

const PRICE_RULES = {
  easy: { min: 100, max: 900, step: 100 },
  normal: { min: 100, max: 1990, step: 10 },
  hard: { min: 50, max: 2995, step: 5 },
};

function boundedCount(value, max = 8) {
  return Math.max(3, Math.min(max, Math.trunc(Number(value) || 3)));
}

function makePricePool({ min, max, step }) {
  const values = [];
  for (let value = min; value <= max; value += step) values.push(value);
  return values;
}

export function generateStations(count, rng = Math.random) {
  return sample(STATION_NAMES, boundedCount(count), rng);
}

export function scoreStationOrder(expected, actual) {
  const total = expected.length;
  const correct = expected.reduce((sum, name, index) => sum + (actual[index] === name ? 1 : 0), 0);
  return { correct, total };
}

export function generateFaces(count, rng = Math.random) {
  return sample(FACE_CATALOG, boundedCount(count, 6), rng).map((face) => ({ ...face }));
}

export function scoreFaceAnswers(faces, answers) {
  const read = answers instanceof Map
    ? (id) => answers.get(id)
    : (id) => answers[id];
  const correct = faces.reduce((sum, face) => sum + (read(face.id) === face.name ? 1 : 0), 0);
  return { correct, total: faces.length };
}

export function generatePrices(count, difficulty = 'normal', rng = Math.random) {
  const safeCount = boundedCount(count);
  const rules = PRICE_RULES[difficulty] || PRICE_RULES.normal;
  const items = sample(GROCERY_ITEMS, safeCount, rng);
  const prices = sample(makePricePool(rules), safeCount, rng);
  return items.map((item, index) => ({ ...item, price: prices[index] }));
}

export function scorePriceAnswers(items, answers) {
  const read = answers instanceof Map
    ? (id) => answers.get(id)
    : (id) => answers[id];
  const correct = items.reduce((sum, item) => sum + (Number(read(item.id)) === item.price ? 1 : 0), 0);
  return { correct, total: items.length };
}

export function generateShopping(count, rng = Math.random) {
  const safeCount = boundedCount(count);
  const options = sample(GROCERY_ITEMS, safeCount + 3, rng).map((item) => ({ ...item }));
  const targetIds = new Set(sample(options, safeCount, rng).map((item) => item.id));
  return {
    targets: options.filter((item) => targetIds.has(item.id)),
    options: shuffle(options, rng),
  };
}

export function scoreShopping(targets, selectedIds) {
  const selected = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
  const correct = targets.reduce((sum, item) => sum + (selected.has(item.id) ? 1 : 0), 0);
  return { correct, total: targets.length };
}

function clear(root) {
  root.replaceChildren();
}

function actionRow(...buttons) {
  return h('div', { className: 'answer-row' }, ...buttons);
}

function primary(label, onClick, disabled = false) {
  return h('button', {
    type: 'button',
    className: 'primary-button',
    onClick,
    disabled,
  }, label);
}

function secondary(label, onClick, disabled = false) {
  return h('button', {
    type: 'button',
    className: 'secondary-button',
    onClick,
    disabled,
  }, label);
}

function itemTile(item, suffix = '') {
  return h('div', { className: 'memory-tile object-tile' },
    h('span', { className: 'object-emoji', 'aria-hidden': 'true' }, item.emoji),
    h('strong', {}, item.name),
    suffix ? h('span', {}, suffix) : null,
  );
}

function portrait(face, index, showName = false) {
  return h('div', { className: 'memory-tile association-card' },
    h('div', {
      className: 'portrait',
      role: 'img',
      'aria-label': `${index + 1}. személy portréja`,
      style: {
        width: '96px',
        height: '96px',
        backgroundImage: "url('./assets/portraits.png')",
        backgroundSize: '400% 300%',
        backgroundPosition: `${(face.id % 4) * 100 / 3}% ${Math.floor(face.id / 4) * 50}%`,
      },
    }),
    showName ? h('span', { className: 'name-chip' }, face.name) : null,
  );
}

function stationDetails(expected, actual) {
  return expected.map((name, index) => ({
    label: `${index + 1}. megálló`,
    expected: name,
    actual: actual[index] || '—',
    correct: actual[index] === name,
  }));
}

function mountStations(ctx) {
  const sequence = generateStations(ctx.settings.count, ctx.rand);
  const expected = ctx.settings.reverse ? [...sequence].reverse() : sequence;
  let finished = false;

  ctx.phase('Állomások', ctx.settings.reverse
    ? 'Jegyezd meg az útvonalat! Utána visszafelé kell felidézned.'
    : 'Jegyezd meg az állomások sorrendjét!');
  clear(ctx.root);
  ctx.root.append(h('div', { className: 'game-stack' },
    h('div', { className: 'memory-grid', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' } },
      ...sequence.map((name, index) => h('div', { className: 'memory-tile association-card' },
        h('strong', {}, `${index + 1}.`),
        h('span', {}, name),
      )),
    ),
    h('p', { className: 'game-note' }, 'Figyeld meg az egész útvonalat.'),
  ));

  ctx.memorize(() => {
    ctx.phase('Állomások felidézése', ctx.settings.reverse
      ? 'Kattints az állomásokra az útvonal fordított sorrendjében!'
      : 'Kattints az állomásokra az eredeti sorrendben!');
    const chosen = [];
    const choices = shuffle(sequence, ctx.rand);
    const stack = h('div', { className: 'game-stack' });
    const chosenGrid = h('div', { className: 'memory-grid', 'aria-live': 'polite' });
    const choiceGrid = h('div', { className: 'choice-grid' });
    const note = h('p', { className: 'game-note' }, 'Kattints az állomásokra a helyes sorrendben.');

    function redraw() {
      chosenGrid.replaceChildren(...chosen.map((name, index) => h('div', { className: 'memory-tile association-card is-selected' },
        h('strong', {}, `${index + 1}.`), h('span', {}, name),
      )));
      choiceGrid.replaceChildren(...choices.map((name) => {
        const used = chosen.includes(name);
        return h('button', {
          type: 'button',
          className: `memory-tile${used ? ' is-selected' : ''}`,
          disabled: used,
          'aria-pressed': used ? 'true' : 'false',
          onClick: () => {
            if (!used) chosen.push(name);
            redraw();
          },
        }, name);
      }));
      undo.disabled = chosen.length === 0;
      reset.disabled = chosen.length === 0;
      check.disabled = chosen.length !== sequence.length;
      note.textContent = chosen.length === sequence.length
        ? 'Kész a sorrend. Ellenőrizheted.'
        : `${chosen.length}/${sequence.length} állomás kiválasztva.`;
    }

    const undo = secondary('Visszavonás', () => { chosen.pop(); redraw(); }, true);
    const reset = secondary('Újrakezdem', () => { chosen.length = 0; redraw(); }, true);
    const check = primary('Ellenőrzés', () => {
      if (finished || chosen.length !== sequence.length) return;
      finished = true;
      const result = scoreStationOrder(expected, chosen);
      ctx.done({
        ...result,
        summary: `${result.correct} állomás került a pontos helyére ${result.total}-ból.`,
        details: stationDetails(expected, chosen),
      });
    }, true);

    stack.append(
      h('p', { className: 'game-note' }, ctx.settings.reverse ? 'Rakd ki az útvonalat visszafelé!' : 'Rakd ki az eredeti útvonalat!'),
      chosenGrid,
      choiceGrid,
      note,
      actionRow(undo, reset, check),
    );
    clear(ctx.root);
    ctx.root.append(stack);
    redraw();
  });
}

function mountFaces(ctx) {
  const faces = generateFaces(ctx.settings.count, ctx.rand);
  let finished = false;
  ctx.phase('Arcok és nevek', 'Jegyezd meg, melyik archoz melyik név tartozik!');
  clear(ctx.root);
  ctx.root.append(h('div', { className: 'game-stack' },
    h('div', { className: 'memory-grid', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' } },
      ...faces.map((face, index) => portrait(face, index, true)),
    ),
  ));

  ctx.memorize(() => {
    ctx.phase('Arcok és nevek felidézése', 'Válaszd ki minden portréhoz a hozzá tartozó nevet!');
    const answers = new Map();
    const selects = [];
    const options = shuffle(faces.map((face) => face.name), ctx.rand);
    const note = h('p', { className: 'game-note', 'aria-live': 'polite' }, 'Minden archoz válassz egy nevet.');
    const rows = faces.map((face, index) => {
      const select = h('select', {
        'aria-label': `Név a(z) ${index + 1}. személyhez`,
      },
        h('option', { value: '' }, 'Válassz nevet…'),
        ...options.map((name) => h('option', { value: name }, name)),
      );
      select.addEventListener('change', () => {
        answers.set(face.id, select.value);
        check.disabled = selects.some((field) => !field.value);
        note.textContent = check.disabled ? 'Minden archoz válassz egy nevet.' : 'Minden válasz megvan. Ellenőrizheted.';
      });
      selects.push(select);
      return h('div', { className: 'match-row' }, portrait(face, index), select);
    });
    const check = primary('Ellenőrzés', () => {
      if (finished || selects.some((field) => !field.value)) return;
      finished = true;
      const result = scoreFaceAnswers(faces, answers);
      ctx.done({
        ...result,
        summary: `${result.correct} nevet párosítottál helyesen ${result.total}-ból.`,
        details: faces.map((face, index) => ({
          label: `${index + 1}. személy`,
          expected: face.name,
          actual: answers.get(face.id) || '—',
          correct: answers.get(face.id) === face.name,
        })),
      });
    }, true);

    clear(ctx.root);
    ctx.root.append(h('div', { className: 'game-stack' },
      h('div', { className: 'association-grid' }, ...rows),
      note,
      actionRow(check),
    ));
  });
}

function mountPrices(ctx) {
  const items = generatePrices(ctx.settings.count, ctx.settings.difficulty, ctx.rand);
  let finished = false;
  ctx.phase('Mi mennyibe került?', 'Jegyezd meg a termékek árát!');
  clear(ctx.root);
  ctx.root.append(h('div', { className: 'game-stack' },
    h('div', { className: 'memory-grid', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' } },
      ...items.map((item) => itemTile(item, `${item.price} Ft`)),
    ),
  ));

  ctx.memorize(() => {
    ctx.phase('Árak felidézése', 'Írd be minden termék korábban látott árát!');
    const answers = new Map();
    const inputs = [];
    const note = h('p', { className: 'game-note', 'aria-live': 'polite' }, 'Írd be minden termék árát forintban.');
    const rows = items.map((item) => {
      const input = h('input', {
        className: 'price-input',
        type: 'number',
        min: '0',
        step: '1',
        inputMode: 'numeric',
        'aria-label': `${item.name} ára forintban`,
      });
      input.addEventListener('input', () => {
        answers.set(item.id, input.value);
        check.disabled = inputs.some((field) => field.value === '');
        note.textContent = check.disabled ? 'Írd be minden termék árát forintban.' : 'Minden ár megvan. Ellenőrizheted.';
      });
      inputs.push(input);
      return h('label', { className: 'match-row' },
        h('span', { className: 'object-tile' },
          h('span', { className: 'object-emoji', 'aria-hidden': 'true' }, item.emoji),
          h('strong', {}, item.name),
        ),
        input,
        h('span', {}, 'Ft'),
      );
    });
    const check = primary('Ellenőrzés', () => {
      if (finished || inputs.some((field) => field.value === '')) return;
      finished = true;
      const result = scorePriceAnswers(items, answers);
      ctx.done({
        ...result,
        summary: `${result.correct} árat jegyeztél meg pontosan ${result.total}-ból.`,
        details: items.map((item) => ({
          label: item.name,
          expected: `${item.price} Ft`,
          actual: `${answers.get(item.id)} Ft`,
          correct: Number(answers.get(item.id)) === item.price,
        })),
      });
    }, true);
    clear(ctx.root);
    ctx.root.append(h('div', { className: 'game-stack' },
      h('div', { className: 'association-grid' }, ...rows),
      note,
      actionRow(check),
    ));
  });
}

function mountShopping(ctx) {
  const round = generateShopping(ctx.settings.count, ctx.rand);
  const targetIds = new Set(round.targets.map((item) => item.id));
  const selected = new Set();
  let finished = false;
  ctx.phase('Bevásárlólista', 'Jegyezd meg, mi van a listán!');
  clear(ctx.root);
  ctx.root.append(h('div', { className: 'game-stack' },
    h('div', { className: 'memory-grid', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' } },
      ...round.targets.map((item) => itemTile(item)),
    ),
  ));

  ctx.memorize(() => {
    ctx.phase('Bevásárlólista felidézése', 'Válaszd ki pontosan azokat a termékeket, amelyek a listán voltak!');
    const choiceGrid = h('div', { className: 'choice-grid' });
    const note = h('p', { className: 'game-note', 'aria-live': 'polite' });
    const buttons = [];

    function redraw() {
      buttons.forEach(({ item, button }) => {
        const active = selected.has(item.id);
        button.classList.toggle('is-selected', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      check.disabled = selected.size !== round.targets.length;
      note.textContent = selected.size === round.targets.length
        ? 'Pontosan ennyi termék volt a listán. Ellenőrizheted.'
        : `${selected.size}/${round.targets.length} termék kiválasztva.`;
    }

    round.options.forEach((item) => {
      const button = h('button', {
        type: 'button',
        className: 'memory-tile object-tile',
        'aria-pressed': 'false',
        onClick: () => {
          if (selected.has(item.id)) selected.delete(item.id);
          else if (selected.size < round.targets.length) selected.add(item.id);
          redraw();
        },
      },
        h('span', { className: 'object-emoji', 'aria-hidden': 'true' }, item.emoji),
        h('strong', {}, item.name),
      );
      buttons.push({ item, button });
      choiceGrid.append(button);
    });

    const check = primary('Ellenőrzés', () => {
      if (finished || selected.size !== round.targets.length) return;
      finished = true;
      const result = scoreShopping(round.targets, selected);
      ctx.done({
        ...result,
        summary: `${result.correct} keresett terméket találtál meg ${result.total}-ból.`,
        details: round.options.map((item) => ({
          label: item.name,
          expected: targetIds.has(item.id) ? 'A listán volt' : 'Nem volt a listán',
          actual: selected.has(item.id) ? 'Kiválasztottad' : 'Nem választottad',
          correct: targetIds.has(item.id) === selected.has(item.id),
        })),
      });
    }, true);

    clear(ctx.root);
    ctx.root.append(h('div', { className: 'game-stack' },
      h('p', { className: 'game-note' }, 'Válaszd ki az összes terméket, amit láttál!'),
      choiceGrid,
      note,
      actionRow(check),
    ));
    redraw();
  });
}

export const associationGames = {
  stations: { mount: mountStations },
  faces: { mount: mountFaces },
  prices: { mount: mountPrices },
  shopping: { mount: mountShopping },
};
