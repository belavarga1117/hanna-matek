import test from "node:test";
import assert from "node:assert/strict";
import {
  allowedHannaContentLevels,
  bindHannaRecallSupport,
  buildHannaRandomTrials,
  createHannaLearnedSnapshot,
  createPalaceReadinessTrials,
  describeHannaSettings,
  evaluatePalaceReadiness,
  generateHannaSession,
  hannaTrainingScope,
  hannaActivityCapabilities,
  evaluateHannaTrainingGate,
  nextHannaReview,
  normalizeHannaResource,
  normalizeHannaSettings,
  scoreHannaAttempt,
} from "../dist/hanna/engine-v2.js";
import {
  HANNA_ACTIVITIES,
  HANNA_ASSOCIATION_SCENES,
  HANNA_CONCEPTS,
  HANNA_FACES,
  HANNA_KEYWORDS,
  HANNA_OBJECTS,
  HANNA_PEGS,
  HANNA_ROUTE,
  HANNA_TEXTS,
  HU_MAJOR_DIGITS,
  HU_MAJOR_WORDS,
} from "../dist/hanna/content-v2.js";

const SEED = 20260911;
const clone = (value) => JSON.parse(JSON.stringify(value));
function majorCode(word) {
  const pairs = [
      ["dzs", "6"],
      ["cs", "6"],
      ["zs", "6"],
      ["sz", "0"],
      ["ny", "2"],
    ],
    singles = {
      z: "0",
      t: "1",
      d: "1",
      n: "2",
      m: "3",
      r: "4",
      l: "5",
      s: "6",
      k: "7",
      g: "7",
      f: "8",
      v: "8",
      p: "9",
      b: "9",
    },
    normalized = word.toLocaleLowerCase("hu").normalize("NFC"),
    digits = [];
  let previousEnd = -2;
  for (let index = 0; index < normalized.length;) {
    const pair = pairs.find(([letters]) =>
        normalized.startsWith(letters, index),
      ),
      token = pair?.[0] ?? normalized[index],
      digit = pair?.[1] ?? singles[token];
    if (digit !== undefined) {
      const doubled = index === previousEnd && digits.at(-1) === digit;
      if (!doubled) digits.push(digit);
      previousEnd = index + token.length;
    } else previousEnd = -2;
    index += token.length;
  }
  return digits.join("");
}
const reviewSnapshot = () => [
  {
    id: "review-card-1",
    sourceActivity: "chain",
    sourceItemId: "chain-alma",
    prompt: "Mi követte a kulcsot?",
    expected: "alma",
    accepted: ["az alma"],
    contradictions: ["nem alma"],
    hints: ["Saját lánc.", "A kulcs kinyitotta.", "A betűvel kezdődik."],
    content: [
      {
        id: "chain-alma",
        kind: "picture",
        label: "alma",
        position: 2,
        visual: { type: "object", key: "alma" },
      },
    ],
    assessment: "exact",
    learnedAt: "2026-09-10T08:00:00.000Z",
    lastReviewedAt: null,
    intervalMs: 600_000,
  },
];
const palaceSnapshot = (count = 5) => ({
  id: `palace-${count}`,
  kind: "palace",
  title: `${count} helyes palota`,
  revision: 1,
  ready: true,
  data: {
    locations: Array.from({ length: count }, (_, index) => ({
      id: `palace-${count}-location-${index + 1}`,
      name: `Palotahely ${index + 1}`,
      description: "",
    })),
  },
});

function completeAnswer(
  plan,
  { responses, encoding, training, rtMs = 700, hintLevel = 0 } = {},
) {
  return {
    version: 2,
    startedAt: "2026-09-11T10:00:00.000Z",
    completedAt: "2026-09-11T10:01:00.000Z",
    events: [],
    encoding:
      encoding ??
      (plan.activity === "association"
        ? plan.encodingSteps[0].rounds.map((round) => ({
            stepId: plan.encodingSteps[0].id,
            roundId: round.id,
            choiceId: round.preferredChoiceId,
            rtMs,
          }))
        : []),
    training:
      training ??
      (plan.training?.trials ?? []).map((trial) => ({
        trialId: trial.id,
        value: trial.expected,
        rtMs,
      })),
    responses:
      responses ??
      plan.recallTrials.map((trial) => ({
        trialId: trial.id,
        value: clone(trial.expected),
        rtMs,
        hintLevel,
      })),
    encodingDurationMs: 12_000,
    delayDurationMs: 10_000,
  };
}

function chainSnapshot() {
  const plan = generateHannaSession({ activity: "chain", itemCount: 8 }, SEED);
  const encoding = [
    {
      stepId: plan.encodingSteps[0].id,
      itemId: plan.encodingSteps[0].itemIds[0],
      association: "Az első tárgy ráugrik a másodikra.",
      checks: ["mozgás"],
      hintLevel: 0,
      rtMs: 1200,
    },
  ];
  return createHannaLearnedSnapshot(plan, completeAnswer(plan, { encoding }));
}

function settingsFor(activity) {
  if (activity === "review")
    return { activity, reviewSnapshot: reviewSnapshot() };
  if (activity === "random")
    return {
      activity,
      sourceResultId: "own-result-1",
      learnedSnapshot: chainSnapshot(),
    };
  if (activity === "palace") {
    const resource = palaceSnapshot();
    return {
      activity,
      resourceIds: [resource.id],
      resourceSnapshot: [resource],
    };
  }
  return { activity };
}

test("a V2 katalógus mind a 15 családot és elegendő szerkesztett tartalmat ad", () => {
  assert.deepEqual(
    HANNA_ACTIVITIES.map(({ id }) => id),
    [
      "baseline",
      "chain",
      "association",
      "loci",
      "palace",
      "peg",
      "faces",
      "keyword",
      "major",
      "numbers",
      "random",
      "text",
      "concept",
      "review",
      "boss",
    ],
  );
  assert.equal(HANNA_FACES.length, 24);
  assert.ok(HANNA_CONCEPTS.length >= 24);
  assert.equal(
    new Set(HANNA_FACES.map(({ portraitId }) => portraitId)).size,
    24,
  );
  assert.equal(new Set(HANNA_FACES.map(({ fact }) => fact)).size, 24);
  assert.deepEqual(
    HANNA_FACES.map(({ trait }) => trait),
    [
      "vállig érő fekete hullámos haj",
      "hullámos őszülő haj és bajusz",
      "magasra feltűzött sűrű göndör haj és karika fülbevaló",
      "rövid vörös göndör haj és szeplők",
      "hosszú sötét haj ősz tincsekkel",
      "kerek fekete szemüveg és rövid sötét haj",
      "kopasz fej és rövid fekete szakáll",
      "rövid ősz bobfrizura",
      "sötét göndör haj és enyhe borosta",
      "egyenes fekete haj frufruval",
      "kerek szemüveg és ősz bajusz",
      "hosszú barna göndör haj",
      "feltűzött vörös göndör haj",
      "rövid őszülő haj és vékony bajusz",
      "lila fejkendő",
      "vállig érő barna hullámos haj és szakáll",
      "rövid ősz göndör haj",
      "rövid szőke haj és kerek szemüveg",
      "hosszú sötét hullámos haj",
      "rövid sötét haj és dús szakáll",
      "rövid szőke bobfrizura",
      "őszülő haj és rövid szakáll",
      "feltűzött hosszú fonott tincsek",
      "hosszú egyenes ősz haj",
    ],
  );
  assert.equal(
    HANNA_FACES.find(({ label }) => label === "Nóra").keyword,
    "nóta",
  );
  assert.ok(
    HANNA_FACES.every(
      ({ story, keyword, trait }) =>
        story.includes(keyword) &&
        story.includes(trait) &&
        !story.includes("látványosan kölcsönhat"),
    ),
  );
  assert.ok(HANNA_KEYWORDS.length >= 20);
  assert.deepEqual(
    new Set(HANNA_KEYWORDS.map(({ level }) => level)),
    new Set(["noun", "verb", "adjective", "abstract"]),
  );
  assert.ok(HANNA_CONCEPTS.length >= 20);
  assert.equal(HANNA_PEGS.length, 100);
  assert.equal(HANNA_ROUTE.length, 30);
  assert.deepEqual(
    HANNA_ROUTE.map(({ id }) => id),
    [
      "entrance-door",
      "coat-rack",
      "shoe-rack",
      "entry-mirror",
      "key-bowl",
      "sofa",
      "coffee-table",
      "floor-lamp",
      "living-window",
      "bookcase",
      "fridge",
      "sink",
      "countertop",
      "oven",
      "dining-table",
      "bed",
      "nightstand",
      "wardrobe",
      "dresser",
      "bedroom-window",
      "bathroom-door",
      "washbasin",
      "mirror-cabinet",
      "shower",
      "towel-rack",
      "study-door",
      "desk",
      "monitor",
      "printer",
      "swivel-chair",
    ],
  );
  assert.deepEqual(
    HANNA_ROUTE.map(({ roomId }) => roomId),
    [
      ...Array(5).fill("entry"),
      ...Array(5).fill("living-room"),
      ...Array(5).fill("kitchen"),
      ...Array(5).fill("bedroom"),
      ...Array(5).fill("bathroom"),
      ...Array(5).fill("study"),
    ],
  );
  assert.deepEqual(
    HANNA_ROUTE.map(({ roomPosition }) => roomPosition),
    [...Array(6)].flatMap(() =>
      Array.from({ length: 5 }, (_, index) => index + 1),
    ),
  );
  assert.deepEqual(
    HANNA_ROUTE.map(({ routePosition }) => routePosition),
    Array.from({ length: 30 }, (_, index) => index + 1),
  );
  assert.equal(HU_MAJOR_DIGITS.length, 10);
  assert.equal(HU_MAJOR_WORDS.length, 100);
  assert.ok(
    HU_MAJOR_DIGITS.every(({ digit, example }) => majorCode(example) === digit),
  );
  assert.ok(
    HU_MAJOR_WORDS.every(({ code, label }) => majorCode(label) === code),
  );
  assert.equal(majorCode("maffia"), "38");
  assert.equal(majorCode("Ancsa"), "26");
  assert.deepEqual(
    Object.fromEntries(
      HU_MAJOR_WORDS.filter(({ code }) =>
        ["09", "28", "40", "63", "87"].includes(code),
      ).map(({ code, label }) => [code, label]),
    ),
    { "09": "zab", 28: "név", 40: "réz", 63: "som", 87: "fóka" },
  );
  assert.equal(HANNA_ASSOCIATION_SCENES.length, 4);
  assert.equal(
    HANNA_ASSOCIATION_SCENES.find(({ id }) => id === "interaction").action,
    "collides-and-shatters",
  );
  assert.ok(
    HANNA_OBJECTS.every(({ visual }) => visual.type === "object" && visual.key),
  );
});

test("a settings minden tényleges V2 dimenziót normalizál, a difficulty hat és az értelmetlen érték hibás", () => {
  const value = normalizeHannaSettings({
    activity: "chain",
    difficulty: "expert",
    itemCount: 30,
    delayMs: 10_000,
    similarity: "similar",
    interferenceLevel: 2,
    contentLevel: "definition",
    reverse: true,
  });
  assert.equal(value.hannaVersion, 2);
  assert.equal(value.delayMs, 300_000);
  assert.equal(value.itemCount, 30);
  assert.match(describeHannaSettings(value), /300 mp/);
  assert.match(describeHannaSettings(value), /rendezett → szabad → random/);
  assert.match(describeHannaSettings(value), /Szakértő/);
  assert.doesNotMatch(describeHannaSettings(value), /\bexpert\b/);
  assert.match(
    describeHannaSettings({ activity: "association", itemCount: 6 }),
    /12 képes készlet.*Kezdő/,
  );
  assert.throws(
    () => normalizeHannaSettings({ activity: "chain", recallMode: "random" }),
    /nem támogatott|többfázisú/,
  );
  assert.deepEqual(allowedHannaContentLevels("keyword"), [
    "noun",
    "verb",
    "adjective",
    "abstract",
    "mixed",
    "material",
  ]);
  assert.throws(
    () => normalizeHannaSettings({ activity: "numbers", itemCount: 12 }),
    /8, 16, 20, 30/,
  );
  assert.throws(
    () =>
      normalizeHannaSettings({ activity: "faces", contentLevel: "abstract" }),
    /nem használható/,
  );
  assert.throws(
    () => normalizeHannaSettings({ activity: "chain", sourceResultId: "" }),
    /sourceResultId/,
  );
  assert.equal(
    normalizeHannaSettings({ activity: "random", sourceResultId: "x" })
      .sourceResultId,
    "x",
  );
  assert.throws(
    () => generateHannaSession({ activity: "random", sourceResultId: "x" }, 1),
    /learnedSnapshot/,
  );
  assert.doesNotThrow(() => normalizeHannaSettings({ activity: "review" }));
  assert.throws(
    () => generateHannaSession({ activity: "review" }, 1),
    /reviewSnapshot/,
  );
  assert.throws(
    () => normalizeHannaSettings({ activity: "chain", resourceIds: [""] }),
    /resourceIds/,
  );
});

test("az aktivitás-capability elrejti a fix fázissort és az inert nem-default választó hibás", () => {
  assert.deepEqual(hannaActivityCapabilities("chain").recallModes, []);
  assert.deepEqual(hannaActivityCapabilities("chain").fixedRecallPhases, [
    "ordered",
    "free",
    "random",
  ]);
  assert.deepEqual(hannaActivityCapabilities("faces").recallModes, [
    "free",
    "choice",
  ]);
  assert.ok(
    !hannaActivityCapabilities("random").activeSettings.includes("itemCount"),
  );
  assert.throws(
    () => normalizeHannaSettings({ activity: "faces", associationMs: 60_000 }),
    /associationMs/,
  );
  assert.throws(
    () => normalizeHannaSettings({ activity: "chain", trainingSize: 100 }),
    /trainingSize/,
  );
  assert.throws(
    () => normalizeHannaSettings({ activity: "faces", similarity: "similar" }),
    /similarity/,
  );
  assert.throws(
    () => normalizeHannaSettings({ activity: "major", customContent: "x" }),
    /customContent/,
  );
  assert.equal(
    normalizeHannaSettings({
      activity: "association",
      associationMs: "60000",
    }).associationMs,
    60_000,
  );
  assert.equal(
    normalizeHannaSettings({ activity: "peg", trainingSize: "20" })
      .trainingSize,
    20,
  );
  const pegForward = generateHannaSession(
      { activity: "peg", itemCount: 10, reverse: false },
      19,
    ),
    pegReverse = generateHannaSession(
      { activity: "peg", itemCount: 10, reverse: true },
      19,
    );
  assert.equal(
    pegForward.flow.find(({ phase }) => phase === "recall").id,
    "peg-forward-block",
  );
  assert.equal(
    pegReverse.flow.find(({ phase }) => phase === "recall").id,
    "peg-reverse-block",
  );
  const chainForward = generateHannaSession(
      { activity: "chain", itemCount: 5 },
      20,
    ),
    chainReverse = generateHannaSession(
      { activity: "chain", itemCount: 5, reverse: true },
      20,
    );
  assert.deepEqual(
    chainReverse.recallTrials[0].expected,
    [...chainForward.recallTrials[0].expected].reverse(),
  );
  assert.match(chainReverse.recallTrials[0].prompt, /visszafelé/);
});

test("a kanonikus settings URL string roundtrip mind a 15 családnál normalizálható", () => {
  for (const { id } of HANNA_ACTIVITIES) {
    const normalized = normalizeHannaSettings(settingsFor(id)),
      scalarEntries = Object.entries(normalized).filter(
        ([key, value]) =>
          ![
            "resourceSnapshot",
            "reviewSnapshot",
            "learnedSnapshot",
            "trainingMastery",
          ].includes(key) &&
          (typeof value !== "object" || Array.isArray(value)),
      ),
      params = new URLSearchParams(
        scalarEntries.map(([key, value]) => [
          key,
          Array.isArray(value) ? value.join(",") : String(value),
        ]),
      ),
      roundTrip = normalizeHannaSettings(Object.fromEntries(params));
    assert.equal(roundTrip.activity, id);
    assert.equal(roundTrip.hannaVersion, 2);
    assert.equal(roundTrip.itemCount, normalized.itemCount);
    assert.equal(roundTrip.associationMs, normalized.associationMs);
    assert.equal(roundTrip.trainingSize, normalized.trainingSize);
  }
});

test("a resourceIds-only draft szerkeszthető, de hidratált snapshot nélkül nem indítható", () => {
  for (const raw of [
    { activity: "palace", itemCount: 7, resourceIds: ["palota-1"] },
    { activity: "loci", itemCount: 7, resourceIds: ["palota-1"] },
    { activity: "peg", itemCount: 15, resourceIds: ["peg-1"] },
    {
      activity: "chain",
      contentLevel: "material",
      resourceIds: ["anyag-1"],
    },
    {
      activity: "numbers",
      itemCount: 8,
      resourceIds: ["major-1"],
    },
  ]) {
    assert.doesNotThrow(() => normalizeHannaSettings(raw));
    assert.throws(() => generateHannaSession(raw, 5), /resourceSnapshot/);
  }
  assert.throws(
    () => normalizeHannaSettings({ activity: "loci", itemCount: 7 }),
    /támogatott értékei/,
  );
  assert.throws(
    () => generateHannaSession({ activity: "palace", itemCount: 7 }, 5),
    /palace resource/,
  );
  const unready = { ...palaceSnapshot(7), ready: false };
  assert.doesNotThrow(() =>
    normalizeHannaSettings({
      activity: "palace",
      resourceIds: [unready.id],
      resourceSnapshot: [unready],
    }),
  );
  assert.throws(
    () =>
      generateHannaSession(
        {
          activity: "palace",
          resourceIds: [unready.id],
          resourceSnapshot: [unready],
        },
        5,
      ),
    /90%-os útvonalteszt/,
  );
});

test("az encoding, similarity és interference választó ténylegesen módosítja a tervet", () => {
  const similar = generateHannaSession(
      {
        activity: "chain",
        itemCount: 8,
        similarity: "similar",
        interferenceLevel: 2,
        encodingMs: 5000,
      },
      18,
    ),
    varied = generateHannaSession(
      {
        activity: "chain",
        itemCount: 8,
        similarity: "varied",
        interferenceLevel: 0,
        encodingMs: 0,
      },
      18,
    );
  assert.equal(
    new Set(similar.content.map(({ category }) => category)).size,
    1,
  );
  assert.notDeepEqual(
    similar.content.map(({ id }) => id),
    varied.content.map(({ id }) => id),
  );
  assert.ok(
    similar.encodingSteps.every(({ durationMs }) => durationMs === 5000),
  );
  assert.ok(
    varied.encodingSteps.every(({ durationMs }) => durationMs === undefined),
  );
  assert.match(
    similar.flow.find(({ phase }) => phase === "distractor").description,
    /páros számokat.*zavaró jelekkel/,
  );
  assert.match(
    varied.flow.find(({ phase }) => phase === "distractor").description,
    /páros számokat.*ne ismételd/,
  );
  assert.deepEqual(
    similar.flow.find(({ phase }) => phase === "distractor").task,
    { kind: "even-number-tap", rounds: 14, interferenceLevel: 2 },
  );
  assert.deepEqual(
    varied.flow.find(({ phase }) => phase === "distractor").task,
    { kind: "even-number-tap", rounds: 6, interferenceLevel: 0 },
  );
});

test("minden család determinisztikus, teljes flow-val és szerverpontozható nyers válasszal működik", () => {
  for (const { id } of HANNA_ACTIVITIES) {
    const settings = settingsFor(id),
      first = generateHannaSession(settings, SEED),
      second = generateHannaSession(settings, SEED);
    assert.deepEqual(first, second, id);
    assert.equal(first.version, 2, id);
    assert.equal(first.protocolId, `hanna-${id}-v2`, id);
    const flowed = first.flow.flatMap((block) => block.trialIds ?? []);
    assert.deepEqual(
      new Set(flowed),
      new Set(first.recallTrials.map(({ id: trialId }) => trialId)),
      id,
    );
    assert.equal(flowed.length, first.recallTrials.length, id);
    const result = scoreHannaAttempt(settings, SEED, completeAnswer(first), {
      serverDurationMs: 60_000,
      serverRetentionMs: 10_000,
    });
    assert.equal(result.correct, result.total, id);
    assert.equal(result.percent, 100, id);
    assert.equal(result.metrics.schemaVersion, 2, id);
    assert.equal(result.stars, null, id);
    assert.doesNotMatch(result.summary, /IQ|agy.*ok|klinikai/i, id);
  }
});

test("az ismert seed tényleges, kézzel ellenőrizhető sorozatokat ad", () => {
  assert.deepEqual(
    generateHannaSession({ activity: "chain", itemCount: 5 }, SEED).content.map(
      ({ label }) => label,
    ),
    ["kirakó", "nyúl", "taxi", "zsiráf", "tigris"],
  );
  assert.deepEqual(
    generateHannaSession({ activity: "faces", itemCount: 3 }, SEED).content.map(
      ({ label }) => label,
    ),
    ["Gábor", "Dóra", "Réka"],
  );
  assert.equal(
    generateHannaSession({ activity: "numbers", itemCount: 8 }, SEED)
      .recallTrials[0].expected,
    "45517755",
  );
});

test("üres, hibás és kihagyott válasz eredmény, a dupla vagy idegen azonosító viszont elutasított", () => {
  const settings = { activity: "chain", itemCount: 8 },
    plan = generateHannaSession(settings, 11);
  const omitted = completeAnswer(plan, { responses: [] }),
    omittedScore = scoreHannaAttempt(settings, 11, omitted, {
      serverDurationMs: 60_000,
    });
  assert.equal(omittedScore.correct, 0);
  assert.ok(omittedScore.details.some(({ actual }) => actual === "—"));
  const empty = completeAnswer(plan, {
      responses: [
        {
          trialId: plan.recallTrials[0].id,
          value: [],
          rtMs: 500,
          hintLevel: 0,
        },
      ],
    }),
    emptyScore = scoreHannaAttempt(settings, 11, empty, {
      serverDurationMs: 60_000,
    });
  assert.equal(emptyScore.correct, 0);
  const duplicate = completeAnswer(plan);
  duplicate.responses.push(clone(duplicate.responses[0]));
  assert.throws(
    () =>
      scoreHannaAttempt(settings, 11, duplicate, { serverDurationMs: 60_000 }),
    /responses legfeljebb|pontosan egyszer/,
  );
  const foreign = completeAnswer(plan);
  foreign.responses[0].trialId = "foreign";
  assert.throws(
    () =>
      scoreHannaAttempt(settings, 11, foreign, { serverDurationMs: 60_000 }),
    /idegen trialId/,
  );
  const wrong = completeAnswer(plan, {
    responses: [
      {
        trialId: plan.recallTrials.at(-1).id,
        value: "biztosan rossz",
        rtMs: 500,
        hintLevel: 0,
      },
    ],
  });
  assert.equal(
    scoreHannaAttempt(settings, 11, wrong, { serverDurationMs: 60_000 })
      .correct,
    0,
  );
});

test("a lánc ugyanazon elemazonosítókon fut rendezett, szabad és random blokkban", () => {
  for (const itemCount of [5, 30, 40]) {
    const plan = generateHannaSession({ activity: "chain", itemCount }, 77);
    const ordered = plan.recallTrials.find(({ id }) => id === "chain-ordered"),
      free = plan.recallTrials.find(({ id }) => id === "chain-free-list"),
      random = plan.recallTrials.filter(
        ({ blockId }) => blockId === "chain-random",
      );
    assert.deepEqual(
      ordered.itemIds,
      plan.content.map(({ id }) => id),
    );
    assert.equal(ordered.kind, "ordered");
    assert.equal(ordered.entry, "sort");
    assert.equal(ordered.choices.length, itemCount);
    assert.deepEqual(free.itemIds, ordered.itemIds);
    assert.equal(free.kind, "free-list");
    assert.equal(free.choices, undefined);
    assert.ok(
      random.every((trial) =>
        trial.itemIds.every((id) => ordered.itemIds.includes(id)),
      ),
    );
    assert.ok(
      random
        .filter(({ expected }) => Array.isArray(expected))
        .every(
          ({ kind, choices, accessMode }) =>
            kind === "free-list" &&
            choices === undefined &&
            accessMode === "independent",
        ),
    );
    assert.equal(plan.encodingSteps.length, itemCount - 1);
    assert.ok(
      plan.encodingSteps.every(
        (step) => step.checks.length === 4 && step.visual.type === "scene",
      ),
    );
    assert.equal(plan.reviewItems.length, 1);
    assert.equal(plan.reviewItems[0].id, "review-chain-ordered");
    assert.equal(plan.reviewItems[0].content.length, itemCount);
    assert.deepEqual(
      new Set(plan.reviewItems[0].encodingStepIds),
      new Set(plan.encodingSteps.map(({ id }) => id)),
    );
  }
});

test("a lánc, a Kulcsszóhíd és a számszavak tanítópéldái konkrét, nyelvtanilag biztonságos interakciók", () => {
  for (const level of ["concrete", "mixed", "abstract", "definition"]) {
    const plan = generateHannaSession(
      { activity: "chain", itemCount: 8, contentLevel: level },
      904,
    );
    for (const step of plan.encodingSteps) {
      const [leftId, rightId] = step.itemIds,
        left = plan.content.find(({ id }) => id === leftId),
        right = plan.content.find(({ id }) => id === rightId),
        leftImage = left.keyword ?? left.meaning ?? left.label,
        rightImage = right.keyword ?? right.meaning ?? right.label;
      assert.ok(step.example.includes(`„${leftImage}”`));
      assert.ok(step.example.includes(`„${rightImage}”`));
      assert.match(
        step.example,
        /nekicsapódik|felemelik|körbeszáguldja|ráolvad|átfúrja/,
      );
      assert.doesNotMatch(step.example, /közvetlenül átalakítja|alakjának/);
    }
  }

  for (const level of ["noun", "verb", "adjective", "abstract"]) {
    const plan = generateHannaSession(
      { activity: "keyword", contentLevel: level, itemCount: 20 },
      905,
    );
    for (const step of plan.encodingSteps) {
      const item = plan.content.find(({ id }) => step.itemIds.includes(id));
      assert.ok(step.example.includes(`„${item.keyword}”`));
      assert.ok(step.example.includes(`„${item.meaning}”`));
      assert.match(
        step.example,
        /körbetekeri|rácsap|nekiszáguld|ráfolyik|átfúrja|magához rántja|meglöki|összegyúrja/,
      );
      assert.doesNotMatch(step.example, /közvetlenül.*megváltoztatja/);
    }
  }

  for (let seed = 0; seed < 100; seed += 1) {
    const plan = generateHannaSession(
      { activity: "numbers", itemCount: 30 },
      seed,
    );
    for (const [index, step] of plan.encodingSteps.entries()) {
      const current = plan.content[index];
      assert.ok(step.example.includes(`„${current.meaning}”`));
      if (index) {
        assert.ok(
          step.example.includes(`„${plan.content[index - 1].meaning}”`),
        );
        assert.match(
          step.example,
          /nekicsapódik|felemelik|körbeszáguldja|ráolvad|átfúrja/,
        );
      }
      assert.doesNotMatch(
        step.example,
        /közvetlenül átalakítja|\bA maffia\b|\ba Ancsa\b/,
      );
    }
  }
});

test("a Képkapcsoló valós többpáros 30/60 mp körben összeveti az interakciót a gyenge kapcsolatokkal", () => {
  for (const associationMs of [30_000, 60_000]) {
    const plan = generateHannaSession(
        { activity: "association", itemCount: 6, associationMs },
        21,
    ),
    step = plan.encodingSteps[0];
    assert.equal(step.durationMs, associationMs);
    assert.equal(step.rounds.length, associationMs / 1000);
    assert.equal(plan.content.length, plan.settings.itemCount * 2);
    assert.equal(plan.recallTrials.length, step.rounds.length);
    assert.ok(
      plan.recallTrials.every(
        (trial, index) =>
          trial.activationRoundId === step.rounds[index].id,
      ),
    );
    const partnerByLeft = new Map();
    for (const round of step.rounds) {
      const [leftId, rightId] = round.itemIds;
      assert.equal(partnerByLeft.get(leftId) ?? rightId, rightId);
      partnerByLeft.set(leftId, rightId);
    }
    assert.equal(partnerByLeft.size, plan.settings.itemCount);
    assert.ok(
      step.rounds.every((round) => {
        const recommended = round.choices.filter(
          (choice) => choice.recommended,
        );
        return (
          round.choices.length === 4 &&
          recommended.length === 1 &&
          recommended[0].id === round.preferredChoiceId &&
          recommended[0].relationship === "interaction" &&
          new Set(
            round.choices
              .filter((choice) => !choice.recommended)
              .map((choice) => choice.relationship),
          ).size === 3 &&
          round.choices.every(
            (choice) =>
              choice.visual.type === "scene" &&
              choice.visual.parts.length === 2 &&
              choice.explanation,
          ) &&
          !round.example.includes("megváltoztatja a")
        );
      }),
    );
    const answer = completeAnswer(plan, {
      encoding: [
        {
          stepId: step.id,
          roundId: step.rounds[0].id,
          choiceId: step.rounds[0].choices[0].id,
          association: "Saját ötlet",
          hintLevel: 0,
        },
      ],
      responses: [
        {
          trialId: plan.recallTrials[0].id,
          value: plan.recallTrials[0].expected,
          rtMs: 700,
          hintLevel: 0,
        },
      ],
    });
    const result = scoreHannaAttempt(
      { activity: "association", itemCount: 6, associationMs },
      21,
      answer,
      { serverDurationMs: 60_000 },
    );
    assert.ok(
      result.metrics.qualityFlags.includes(
        "association-creativity-not-objectively-scored",
      ),
    );
    assert.equal(result.percent, 100);
    assert.deepEqual(result.metrics.subscales.association, {
      processedPairs: 1,
      uniqueConnections: 1,
      repeatedExposures: 0,
      recalledPairs: 1,
      correct: 1,
      total: 1,
    });
    assert.deepEqual(result.metrics.dimensions.encodingSpeed, {
      value: 5,
      unit: "items/min",
      evidence: "practice",
    });
    const bound = bindHannaRecallSupport(plan, [
      {
        stepId: step.id,
        roundId: step.rounds[0].id,
        association: "első saját csilingelő jelenet",
      },
      {
        stepId: step.id,
        roundId: step.rounds[1].id,
        association: "második saját sistergő jelenet",
      },
    ]);
    assert.match(bound.recallTrials[0].hints[1], /első saját/);
    assert.doesNotMatch(bound.recallTrials[0].hints[1], /második saját/);
    assert.match(bound.recallTrials[1].hints[1], /második saját/);
    const illustrated = bindHannaRecallSupport(plan, [
      {
        stepId: step.id,
        roundId: step.rounds[0].id,
        choiceId: step.rounds[0].preferredChoiceId,
      },
    ]).recallTrials[0];
    assert.match(illustrated.hints[1], /\[…\]/);
    assert.ok(!illustrated.hints[1].includes(illustrated.expected));

    const threeRounds = scoreHannaAttempt(
      { activity: "association", itemCount: 6, associationMs },
      21,
      completeAnswer(plan, {
        encoding: step.rounds.slice(0, 3).map((round) => ({
          stepId: step.id,
          roundId: round.id,
          choiceId: round.preferredChoiceId,
          rtMs: 400,
        })),
        responses: plan.recallTrials.slice(0, 2).map((trial) => ({
          trialId: trial.id,
          value: trial.expected,
          rtMs: 700,
          hintLevel: 0,
        })),
      }),
      { serverDurationMs: 60_000 },
    );
    assert.equal(threeRounds.correct, 2);
    assert.equal(threeRounds.total, 3);
    assert.equal(threeRounds.metrics.subscales.association.processedPairs, 3);
    assert.equal(threeRounds.metrics.subscales.association.recalledPairs, 2);

    const empty = scoreHannaAttempt(
      { activity: "association", itemCount: 6, associationMs },
      21,
      completeAnswer(plan, { encoding: [], responses: [] }),
      { serverDurationMs: 60_000 },
    );
    assert.equal(empty.percent, null);
    assert.equal(empty.total, 0);
    assert.equal(empty.metrics.completion.status, "encoding-incomplete");
    assert.throws(
      () =>
        scoreHannaAttempt(
          { activity: "association", itemCount: 6, associationMs },
          21,
          completeAnswer(plan, {
            encoding: [],
            responses: [
              {
                trialId: plan.recallTrials[0].id,
                value: plan.recallTrials[0].expected,
                rtMs: 700,
                hintLevel: 0,
              },
            ],
          }),
          { serverDurationMs: 60_000 },
        ),
      /aktiválatlan képpár/,
    );
  }
});

test("a Képkapcsoló minden tartalomszinten ugyanazt a világos interakciós orákulumot használja", () => {
  const material = {
    id: "association-material",
    kind: "material",
    title: "Saját képpárok",
    revision: 1,
    ready: true,
    data: {
      items: Array.from({ length: 6 }, (_, index) => ({
        id: `sajat-${index + 1}`,
        label: `saját elem ${index + 1}`,
      })),
    },
  };
  for (const contentLevel of ["concrete", "mixed", "abstract", "material"]) {
    const settings = {
        activity: "association",
        itemCount: 3,
        contentLevel,
        ...(contentLevel === "material"
          ? {
              resourceIds: [material.id],
              resourceSnapshot: [material],
            }
          : {}),
      },
      plan = generateHannaSession(settings, 615),
      round = plan.encodingSteps[0].rounds[0],
      [leftId, rightId] = round.itemIds,
      left = plan.content.find(({ id }) => id === leftId),
      right = plan.content.find(({ id }) => id === rightId),
      preferred = round.choices.find(
        ({ id }) => id === round.preferredChoiceId,
      );
    assert.equal(preferred.relationship, "interaction");
    assert.equal(preferred.visual.variant, "strong");
    assert.equal(preferred.visual.action, "collides-and-shatters");
    assert.match(preferred.label, new RegExp(left.label));
    assert.match(preferred.label, new RegExp(right.label));
    assert.match(preferred.explanation, new RegExp(left.label));
    assert.match(preferred.explanation, new RegExp(right.label));
    assert.match(preferred.explanation, /nekicsapódik.*kibillen.*darabokra/);
    assert.match(round.example, new RegExp(left.label));
    assert.match(round.example, new RegExp(right.label));
    assert.deepEqual(
      new Set(
        round.choices
          .filter(({ id }) => id !== round.preferredChoiceId)
          .map(({ relationship }) => relationship),
      ),
      new Set(["adjacency", "isolated", "other-context"]),
    );
  }
  assert.equal(
    generateHannaSession(
      { activity: "association", itemCount: 12, contentLevel: "abstract" },
      616,
    ).encodingSteps[0].rounds.length,
    30,
  );
});

test("a loci és saját palota valódi hely-ID-ket, három bejárást és minden irányt ad", () => {
  const palace = {
    id: "otthon-1",
    kind: "palace",
    title: "Otthonom",
    revision: 3,
    ready: true,
    data: {
      locations: Array.from({ length: 5 }, (_, index) => ({
        id: `hely-${index + 1}`,
        name: `Hely ${index + 1}`,
        description: `Leírás ${index + 1}`,
      })),
    },
  };
  for (const activity of ["loci", "palace"]) {
    const plan = generateHannaSession(
      { activity, itemCount: 5, resourceSnapshot: [palace] },
      13,
    );
    assert.deepEqual(
      plan.encodingSteps[0].rounds.map(({ id }) => id),
      [
        `${activity}-tour-forward`,
        `${activity}-tour-reverse`,
        `${activity}-tour-random`,
      ],
    );
    assert.ok(plan.content.every((item) => item.locationId && item.anchorId));
    for (const step of plan.encodingSteps.slice(1)) {
      const item = plan.content.find(({ id }) => step.itemIds.includes(id));
      assert.ok(step.prompt.includes(`„${item.label}”`));
      assert.ok(step.prompt.includes(`„${item.location}”`));
      assert.ok(step.example.includes(`„${item.label}”`));
      assert.ok(step.example.includes(`„${item.location}”`));
      assert.match(step.example, /rugó.*körbetekeri.*meglengeti/);
      assert.doesNotMatch(step.example, /megváltoztatja a helyet/);
    }
    assert.ok(
      plan.training.trials.some(({ relation }) => relation === "before"),
    );
    assert.ok(
      plan.training.trials.some(({ relation }) => relation === "after"),
    );
    assert.ok(plan.recallTrials.some(({ id }) => id === `${activity}-forward`));
    assert.ok(plan.recallTrials.some(({ id }) => id === `${activity}-reverse`));
    assert.ok(
      plan.recallTrials.some(({ blockId }) => blockId === `${activity}-random`),
    );
  }
  const fullRoute = generateHannaSession(
    { activity: "loci", itemCount: 30 },
    13,
  );
  assert.equal(fullRoute.encodingSteps[0].rooms.length, 6);
  assert.ok(
    fullRoute.encodingSteps[0].rooms.every(
      ({ itemIds }) => itemIds.length === 5,
    ),
  );
  assert.equal(
    hannaTrainingScope({ activity: "loci" }),
    "route:builtin-six-rooms-v3:n30",
  );
});

test("a palota readiness minden helyre position/before/after trialt és 90%-os eredményt használ", () => {
  const resource = {
    id: "palota-1",
    kind: "palace",
    revision: 7,
    data: {
      locations: Array.from({ length: 5 }, (_, index) => ({
        id: `loc-${index}`,
        name: `Hely ${index + 1}`,
        description: "",
      })),
    },
  };
  const plan = createPalaceReadinessTrials(resource);
  assert.equal(plan.trials.length, 13);
  assert.equal(
    plan.trials.filter(({ relation }) => relation === "position").length,
    5,
  );
  assert.ok(plan.trials.every(({ anchorId }) => anchorId.includes(":r7:")));
  const correct = {
    version: 2,
    revision: 7,
    answers: plan.trials.map((trial) => ({
      trialId: trial.id,
      value: trial.expected,
    })),
  };
  assert.equal(evaluatePalaceReadiness(resource, correct).ready, true);
  correct.answers[0].value = "hibás";
  correct.answers[1].value = "hibás";
  assert.equal(evaluatePalaceReadiness(resource, correct).ready, false);
  assert.throws(
    () => evaluatePalaceReadiness(resource, { ...correct, revision: 6 }),
    /verziója/,
  );
});

test("a tetszőleges méretű saját palota és peg teljes listája indul, a peg napi batch külön marad", () => {
  const palace = {
      id: "palota-7",
      kind: "palace",
      title: "Hét hely",
      revision: 2,
      ready: true,
      data: {
        locations: Array.from({ length: 7 }, (_, index) => ({
          id: `hely-${index + 1}`,
          name: `Hely ${index + 1}`,
          description: "",
        })),
      },
    },
    peg = {
      id: "peg-15",
      kind: "peg",
      title: "Tizenöt horog",
      revision: 4,
      ready: true,
      data: {
        entries: Array.from({ length: 15 }, (_, index) => ({
          number: index + 1,
          label: `Saját horog ${index + 1}`,
        })),
      },
    },
    palaceSettings = {
      activity: "palace",
      itemCount: 5,
      resourceIds: [palace.id],
      resourceSnapshot: [palace],
    },
    palacePlan = generateHannaSession(palaceSettings, 17),
    pegSettings = {
      activity: "peg",
      itemCount: 10,
      trainingSize: 10,
      resourceIds: [peg.id],
      resourceSnapshot: [peg],
    },
    firstPegPlan = generateHannaSession(pegSettings, 17);
  assert.equal(palacePlan.settings.itemCount, 5);
  assert.equal(palacePlan.content.length, 5);
  assert.equal(palacePlan.training.coverage.requiredIds.length, 5);
  assert.equal(firstPegPlan.settings.itemCount, 15);
  assert.equal(firstPegPlan.training.coverage.requiredIds.length, 15);
  assert.equal(firstPegPlan.training.coverage.testedIds.length, 10);
  assert.equal(firstPegPlan.content.length, 10);

  const mastery = {
      scopeKey: firstPegPlan.training.scopeKey,
      items: firstPegPlan.training.coverage.testedIds.map((itemId) => ({
        itemId,
        directions: ["forward", "reverse"],
        bestRtMs: 900,
        mastered: true,
      })),
    },
    secondPegPlan = generateHannaSession(
      { ...pegSettings, trainingMastery: mastery },
      17,
    );
  assert.equal(secondPegPlan.training.coverage.requiredIds.length, 15);
  assert.equal(secondPegPlan.training.coverage.masteredIds.length, 10);
  assert.equal(secondPegPlan.training.coverage.testedIds.length, 5);
  assert.ok(
    secondPegPlan.training.coverage.testedIds.every(
      (id) => !firstPegPlan.training.coverage.testedIds.includes(id),
    ),
  );
  const perfect = scoreHannaAttempt(
    pegSettings,
    17,
    completeAnswer(firstPegPlan),
    { serverDurationMs: 60_000, hannaPlanSnapshot: firstPegPlan },
  );
  assert.equal(perfect.metrics.adaptation.nextSettings.itemCount, 15);
  assert.doesNotThrow(() =>
    normalizeHannaSettings({
      ...pegSettings,
      ...perfect.metrics.adaptation.nextSettings,
    }),
  );
});

test("a peg-100 tízes batchben teljesíthető és több körből, két irányból épít lefedettséget", () => {
  const scope = hannaTrainingScope({
      activity: "peg",
      itemCount: 100,
      trainingSize: 10,
    }),
    first = generateHannaSession(
      { activity: "peg", itemCount: 100, trainingSize: 10 },
      3,
    );
  assert.equal(first.training.scopeKey, scope);
  assert.equal(first.training.coverage.requiredIds.length, 100);
  assert.equal(first.training.coverage.testedIds.length, 10);
  assert.equal(first.training.trials.length, 20);
  assert.equal(first.content.length, 10);
  assert.equal(
    scoreHannaAttempt(
      { activity: "peg", itemCount: 100, trainingSize: 10 },
      3,
      completeAnswer(first),
      { serverDurationMs: 60_000 },
    ).percent,
    100,
  );
  const mastery = {
    scopeKey: scope,
    items: first.training.coverage.testedIds.map((itemId) => ({
      itemId,
      directions: ["forward", "reverse"],
      bestRtMs: 800,
      mastered: true,
    })),
  };
  const second = generateHannaSession(
    {
      activity: "peg",
      itemCount: 100,
      trainingSize: 10,
      trainingMastery: mastery,
    },
    3,
  );
  assert.equal(second.training.coverage.masteredIds.length, 10);
  assert.equal(second.training.coverage.testedIds.length, 10);
  assert.ok(
    second.training.coverage.testedIds.every(
      (id) => !first.training.coverage.testedIds.includes(id),
    ),
  );
  const secondSnapshot = createHannaLearnedSnapshot(
      second,
      completeAnswer(second, {
        encoding: [
          {
            stepId: second.encodingSteps[0].id,
            itemId: second.encodingSteps[0].itemIds[0],
            association: "A tárgy nekicsapódik a saját horgának.",
          },
        ],
      }),
    ),
    secondRandom = buildHannaRandomTrials(secondSnapshot, 7);
  for (const trial of secondRandom.filter(({ anchorId }) => anchorId)) {
    const cueItem = secondSnapshot.content.find(
      ({ position }) => position === trial.position,
    );
    assert.equal(trial.anchorId, cueItem.anchorId);
    assert.equal(
      trial.cue.anchor,
      secondSnapshot.anchors.find(({ id }) => id === cueItem.anchorId).label,
    );
  }
  const falseMastery = {
    scopeKey: scope,
    items: [
      {
        itemId: first.training.items[0].id,
        directions: ["forward"],
        bestRtMs: 500,
        mastered: true,
      },
      {
        itemId: first.training.items[1].id,
        directions: ["forward", "reverse"],
        bestRtMs: 2500,
        mastered: true,
      },
    ],
  };
  const guarded = generateHannaSession(
    {
      activity: "peg",
      itemCount: 100,
      trainingSize: 10,
      trainingMastery: falseMastery,
    },
    3,
  );
  assert.equal(guarded.training.coverage.masteredIds.length, 0);
  const allMastered = {
    scopeKey: scope,
    items: first.training.items.map(({ id }) => ({
      itemId: id,
      directions: ["forward", "reverse"],
      bestRtMs: 700,
      mastered: true,
    })),
  };
  assert.equal(
    generateHannaSession(
      {
        activity: "peg",
        itemCount: 100,
        trainingSize: 10,
        trainingMastery: allMastered,
      },
      3,
    ).training.coverage.masteredIds.length,
    100,
  );
});

test("a training scope a teljes lista identitása, nem a batch, és revisionváltáskor változik", () => {
  assert.equal(
    hannaTrainingScope({ activity: "peg", trainingSize: 10 }),
    hannaTrainingScope({ activity: "peg", trainingSize: 100 }),
  );
  const peg = (revision) => ({
    id: "sajat-peg",
    kind: "peg",
    title: "Saját",
    revision,
    ready: true,
    data: {
      entries: Array.from({ length: 20 }, (_, index) => ({
        number: index + 1,
        label: `Horog ${index + 1}`,
      })),
    },
  });
  const first = hannaTrainingScope({
      activity: "peg",
      resourceSnapshot: [peg(1)],
    }),
    second = hannaTrainingScope({
      activity: "peg",
      resourceSnapshot: [peg(2)],
    });
  assert.notEqual(first, second);
  assert.throws(
    () =>
      normalizeHannaSettings({
        activity: "peg",
        itemCount: 20,
        resourceSnapshot: [peg(2)],
        trainingMastery: { scopeKey: first, items: [] },
      }),
    /scopeKey/,
  );
});

test("24 portré közül 20 használható név- és fact-felidézésre, új seed új kötést ad", () => {
  const first = generateHannaSession({ activity: "faces", itemCount: 20 }, 1),
    second = generateHannaSession({ activity: "faces", itemCount: 20 }, 2);
  assert.equal(first.content.length, 20);
  assert.equal(
    first.recallTrials.filter(({ questionType }) => questionType === "name")
      .length,
    20,
  );
  assert.equal(
    first.recallTrials.filter(({ questionType }) => questionType === "fact")
      .length,
    20,
  );
  assert.ok(
    first.recallTrials.every(
      (trial) =>
        trial.visual.type === "portrait" &&
        !trial.prompt.includes(
          first.content.find(({ id }) => id === trial.itemIds[0]).label,
        ),
    ),
  );
  assert.notDeepEqual(
    first.content.map(({ portraitId }) => portraitId),
    second.content.map(({ portraitId }) => portraitId),
  );
  const fullFirst = generateHannaSession(
      { activity: "faces", itemCount: 24 },
      1,
    ),
    fullSecond = generateHannaSession({ activity: "faces", itemCount: 24 }, 2),
    firstBinding = new Map(
      fullFirst.content.map(({ portraitId, label }) => [portraitId, label]),
    );
  assert.ok(
    fullSecond.content.filter(
      ({ portraitId, label }) => firstBinding.get(portraitId) !== label,
    ).length >= 20,
  );
});

test("a Kulcsszóhíd négy szerkesztett szintje eltérő és mindkét irányt felidézteti", () => {
  for (const level of ["noun", "verb", "adjective", "abstract"]) {
    const plan = generateHannaSession(
      { activity: "keyword", contentLevel: level, itemCount: 20 },
      5,
    );
    assert.ok(plan.content.every(({ category }) => category === level));
    assert.equal(
      plan.recallTrials.filter(({ blockId }) => blockId === "keyword-forward")
        .length,
      20,
    );
    assert.equal(
      plan.recallTrials.filter(({ blockId }) => blockId === "keyword-reverse")
        .length,
      20,
    );
    assert.ok(
      plan.encodingSteps.every(({ prompt }) =>
        /nem tökéletes fonetikai/.test(prompt),
      ),
    );
  }
});

test("az arc-, kulcsszó- és Major-mód ténylegesen megváltoztatja a válaszformát és a fázissorrendet", () => {
  const faceFree = generateHannaSession(
      { activity: "faces", itemCount: 5, recallMode: "free" },
      71,
    ),
    faceChoice = generateHannaSession(
      { activity: "faces", itemCount: 5, recallMode: "choice" },
      71,
    );
  assert.ok(faceFree.recallTrials.every(({ kind }) => kind === "free"));
  assert.ok(
    faceChoice.recallTrials.every(
      ({ kind, choices, expected }) =>
        kind === "choice" &&
        choices.length === 4 &&
        choices.some(({ value }) => value === expected),
    ),
  );

  const keywordForward = generateHannaSession(
      { activity: "keyword", itemCount: 3, recallMode: "free" },
      72,
    ),
    keywordReverse = generateHannaSession(
      { activity: "keyword", itemCount: 3, recallMode: "reverse" },
      72,
    );
  assert.equal(
    keywordForward.flow.find(({ phase }) => phase === "recall").id,
    "keyword-forward-block",
  );
  assert.equal(
    keywordReverse.flow.find(({ phase }) => phase === "recall").id,
    "keyword-reverse-block",
  );
  assert.match(keywordReverse.recallTrials[0].prompt, /idegen szót/);

  const majorRandom = generateHannaSession(
      { activity: "major", recallMode: "random" },
      73,
    ),
    majorReverse = generateHannaSession(
      { activity: "major", recallMode: "reverse" },
      73,
    );
  assert.equal(
    majorRandom.flow.filter(({ phase }) => phase === "recall").length,
    1,
  );
  assert.ok(
    majorRandom.recallTrials.some(
      ({ blockId }, index, rows) =>
        index > 0 && blockId !== rows[index - 1].blockId,
    ),
  );
  assert.equal(majorReverse.recallTrials[0].blockId, "major-reverse");
  assert.equal(
    majorReverse.flow.find(({ phase }) => phase === "recall").id,
    "major-reverse-block",
  );
});

test("az 1–9 elemű saját Major-szótár minden megadott szót betanít a hangkapu után", () => {
  const resource = {
      id: "major-sajat-3",
      kind: "major",
      title: "Saját Major szavak",
      revision: 4,
      ready: true,
      data: {
        entries: [
          { code: "01", label: "szit" },
          { code: "23", label: "néma" },
          { code: "45", label: "róla" },
        ],
      },
    },
    settings = {
      activity: "major",
      resourceIds: [resource.id],
      resourceSnapshot: [resource],
    },
    plan = generateHannaSession(settings, 74);
  assert.equal(plan.content.length, 3);
  assert.deepEqual(
    new Set(plan.content.map(({ meaning }) => meaning)),
    new Set(["szit", "néma", "róla"]),
  );
  assert.equal(
    plan.encodingSteps.filter(({ kind }) => kind === "major-word").length,
    3,
  );
  assert.ok(
    plan.encodingSteps
      .filter(({ kind }) => kind === "major-word")
      .every(({ example }) => /Saját képszó: ellenőrizd/.test(example)),
  );
  assert.equal(plan.encodingSteps[0].kind, "major-code");
  assert.equal(
    hannaTrainingScope(settings),
    "major:resource:major-sajat-3:r4:n3",
  );
});

test("a Major-rendszer teljes kétirányú kaput, következetes magyar kódot és képi szót ad", () => {
  const plan = generateHannaSession({ activity: "major" }, 31);
  assert.equal(plan.training.trials.length, 20);
  assert.deepEqual(plan.training.threshold, {
    accuracy: 0.95,
    medianRtMs: 1500,
  });
  assert.ok(
    plan.training.trials.every((trial) =>
      trial.choices.some(({ value }) => value === trial.expected),
    ),
  );
  assert.ok(
    plan.encodingSteps
      .filter(({ kind }) => kind === "major-word")
      .every(({ example }) => /Ellenőrzött képszó/.test(example)),
  );
  assert.match(
    plan.encodingSteps[0].prompt,
    /0 sz\/z.*6 s\/zs\/cs\/dzs.*9 p\/b/,
  );
  assert.equal(
    plan.recallTrials.filter(({ blockId }) => blockId === "major-forward")
      .length,
    10,
  );
  assert.equal(
    plan.recallTrials.filter(({ blockId }) => blockId === "major-reverse")
      .length,
    10,
  );
});

test("a Számszörny 8, 16, 20 és 30 számjegyet részpontoz és nem fogad idegen karaktert", () => {
  for (const itemCount of [8, 16, 20, 30]) {
    const settings = { activity: "numbers", itemCount },
      plan = generateHannaSession(settings, 17),
      expected = plan.recallTrials[0].expected;
    assert.equal(expected.length, itemCount);
    const short = completeAnswer(plan, {
      responses: [
        {
          trialId: "numbers-delayed",
          value: expected.slice(0, -1),
          rtMs: 700,
          hintLevel: 0,
        },
      ],
    });
    const result = scoreHannaAttempt(settings, 17, short, {
      serverDurationMs: 60_000,
    });
    assert.equal(result.correct, itemCount - 1);
    assert.equal(result.total, itemCount);
    const invalid = completeAnswer(plan, {
      responses: [
        {
          trialId: "numbers-delayed",
          value: `${expected.slice(0, -1)}x`,
          rtMs: 700,
          hintLevel: 0,
        },
      ],
    });
    assert.throws(
      () =>
        scoreHannaAttempt(settings, 17, invalid, { serverDurationMs: 60_000 }),
      /számjegy/,
    );
  }

  const builtIn = generateHannaSession(
      { activity: "numbers", itemCount: 8 },
      170,
    ),
    replacedCode = builtIn.content[0].code,
    partialMajor = {
      id: "partial-number-images",
      kind: "major",
      title: "Egy saját számkép",
      revision: 1,
      ready: true,
      data: { entries: [{ code: replacedCode, label: "saját sárkánykép" }] },
    },
    withPartial = generateHannaSession(
      {
        activity: "numbers",
        itemCount: 8,
        resourceIds: [partialMajor.id],
        resourceSnapshot: [partialMajor],
      },
      170,
    );
  assert.equal(
    withPartial.content.find(({ code }) => code === replacedCode).meaning,
    "saját sárkánykép",
  );
  assert.ok(
    withPartial.content
      .filter(({ code }) => code !== replacedCode)
      .every(({ code, meaning }) => meaning !== code),
  );
});

test("a Random Recall kizárólag ugyanazt a learnedSnapshot listát és határon belüli kérdéseket használja", () => {
  const snapshot = chainSnapshot(),
    trials = buildHannaRandomTrials(snapshot, 41, {
      prefix: "own-random",
      choice: false,
    }),
    ids = new Set(snapshot.content.map(({ id }) => id));
  assert.ok(trials.every((trial) => trial.itemIds.every((id) => ids.has(id))));
  assert.ok(
    trials
      .filter(({ questionType }) => questionType === "before")
      .every(({ position }) => position > 1),
  );
  assert.ok(
    trials
      .filter(({ questionType }) => questionType === "after")
      .every(({ position }) => position < snapshot.content.length),
  );
  const plan = generateHannaSession(
    {
      activity: "random",
      sourceResultId: "own-result",
      learnedSnapshot: snapshot,
    },
    41,
  );
  assert.deepEqual(plan.content, snapshot.content);
  assert.deepEqual(plan.learnedSnapshot.encoding, snapshot.encoding);
  assert.equal(plan.settings.itemCount, snapshot.content.length);
  assert.ok(
    plan.recallTrials
      .filter(({ questionType }) => questionType === "nth")
      .every((trial) => {
        const target = plan.content.find(({ id }) => trial.itemIds.includes(id));
        return (
          trial.cue?.visual?.key !== target.visual?.key &&
          trial.cue?.visual?.label !== trial.expected
        );
      }),
  );
  const draftFromUrl = normalizeHannaSettings({
      activity: "random",
      itemCount: "100",
      sourceResultId: "own-result",
    }),
    hydrated = normalizeHannaSettings({
      ...draftFromUrl,
      learnedSnapshot: snapshot,
    });
  assert.equal(draftFromUrl.itemCount, 100);
  assert.equal(hydrated.itemCount, snapshot.content.length);
  assert.equal(
    generateHannaSession(
      { ...draftFromUrl, learnedSnapshot: snapshot },
      41,
    ).settings.itemCount,
    snapshot.content.length,
  );
  assert.throws(
    () =>
      buildHannaRandomTrials(
        { ...snapshot, content: [{ ...snapshot.content[0], id: "" }] },
        1,
      ),
    /id/,
  );
});

test("a Random Recall a nem preset méretű teljes forrást is kanonikusan megőrzi", () => {
  const sourcePlan = generateHannaSession(
      { activity: "chain", itemCount: 15 },
      415,
    ),
    sourceAnswer = completeAnswer(sourcePlan, {
      encoding: [
        {
          stepId: sourcePlan.encodingSteps[0].id,
          itemId: sourcePlan.encodingSteps[0].itemIds[0],
          association: "Az első kép nekicsapódik a másodiknak.",
        },
      ],
    }),
    snapshot = createHannaLearnedSnapshot(sourcePlan, sourceAnswer),
    settings = normalizeHannaSettings({
      activity: "random",
      itemCount: "100",
      sourceResultId: "chain-15-result",
      learnedSnapshot: snapshot,
    }),
    plan = generateHannaSession(settings, 416);
  assert.equal(snapshot.content.length, 15);
  assert.equal(settings.itemCount, 15);
  assert.equal(plan.settings.itemCount, 15);
  assert.deepEqual(plan.content, snapshot.content);
  assert.doesNotThrow(() => normalizeHannaSettings(plan.settings));
});

test("a Random Recall minden körben ad n-edik, előtte, utána, két pozíció és kategória magot", () => {
  const snapshot = clone(chainSnapshot());
  snapshot.content.forEach((item, index) => {
    item.category = index < 4 ? "első csoport" : "második csoport";
    item.position = index + 1;
  });
  for (const seed of [0, 1, 41, 0xffffffff]) {
    const trials = buildHannaRandomTrials(snapshot, seed, {
        prefix: `random-core-${seed}`,
      }),
      types = new Set(trials.map(({ questionType }) => questionType)),
      before = trials.find(
        ({ questionType, position }) =>
          questionType === "before" && position === 2,
      ),
      after = trials.find(
        ({ questionType, position }) =>
          questionType === "after" && position === snapshot.content.length - 1,
      ),
      positions = trials.find(
        ({ questionType }) => questionType === "positions",
      ),
      category = trials.find(({ questionType }) => questionType === "category");
    assert.deepEqual(
      types,
      new Set(["nth", "before", "after", "positions", "category"]),
    );
    assert.equal(before.expected, snapshot.content[0].label);
    assert.equal(after.expected, snapshot.content.at(-1).label);
    assert.deepEqual(positions.positions, [3, 7]);
    assert.deepEqual(positions.expected, [
      snapshot.content[2].label,
      snapshot.content[6].label,
    ]);
    assert.equal(positions.assessment, "ordered");
    assert.equal(positions.kind, "free-list");
    assert.equal(positions.accessMode, "independent");
    assert.equal(positions.choices, undefined);
    assert.equal(category.assessment, "set");
    assert.equal(category.kind, "free-list");
    assert.equal(category.accessMode, "independent");
    assert.equal(category.choices, undefined);
  }
  const shortUnique = clone(snapshot);
  shortUnique.content = shortUnique.content.slice(0, 3).map((item, index) => ({
    ...item,
    category: `egyedi-${index}`,
    position: index + 1,
  }));
  const shortTrials = buildHannaRandomTrials(shortUnique, 7);
  assert.deepEqual(
    new Set(shortTrials.map(({ questionType }) => questionType)),
    new Set(["nth", "before", "after", "positions", "category"]),
  );
  assert.deepEqual(
    shortTrials.find(({ questionType }) => questionType === "positions")
      .positions,
    [1, 3],
  );

  const choiceSettings = {
      activity: "random",
      recallMode: "choice",
      sourceResultId: "choice-source",
      learnedSnapshot: snapshot,
    },
    choicePlan = generateHannaSession(choiceSettings, 42);
  assert.ok(
    choicePlan.recallTrials.every(
      ({ kind, choices, accessMode }) =>
        ["choice", "multi"].includes(kind) &&
        choices.length >= 4 &&
        accessMode === "choice",
    ),
  );
  const choiceScore = scoreHannaAttempt(
    choiceSettings,
    42,
    completeAnswer(choicePlan),
    { serverDurationMs: 60_000, hannaPlanSnapshot: choicePlan },
  );
  assert.equal(choiceScore.metrics.independentCorrect, 0);
  assert.equal(choiceScore.metrics.independentEligibleTotal, 0);
  assert.equal(choiceScore.metrics.assistedCorrect, choiceScore.total);
  assert.equal(choiceScore.metrics.dimensions.strategyIndependence, null);
});

test("az absztrakt lánc képjelből indul, a definíciós jelentést is tanít, a mixed mindig kétféle", () => {
  for (const seed of [0, 1, 2, 99]) {
    const abstract = generateHannaSession(
        { activity: "chain", itemCount: 5, contentLevel: "abstract" },
        seed,
      ),
      definition = generateHannaSession(
        { activity: "chain", itemCount: 5, contentLevel: "definition" },
        seed,
      ),
      mixedChain = generateHannaSession(
        { activity: "chain", itemCount: 5, contentLevel: "mixed" },
        seed,
      ),
      mixedAssociation = generateHannaSession(
        { activity: "association", itemCount: 4, contentLevel: "mixed" },
        seed,
      );
    assert.ok(abstract.content.every((item) => item.meaning === undefined));
    assert.ok(definition.content.every((item) => item.meaning));
    assert.ok(
      definition.encodingSteps.every(({ prompt }) => /definíció/.test(prompt)),
    );
    assert.deepEqual(
      new Set(mixedChain.content.map(({ kind }) => kind)),
      new Set(["picture", "concept"]),
    );
    assert.deepEqual(
      new Set(mixedAssociation.content.map(({ kind }) => kind)),
      new Set(["picture", "concept"]),
    );
  }
});

test("a szövegrubrika elfogad parafrázist, elutasít tagadást és bizonytalanságot", () => {
  const settings = { activity: "text", recallMode: "meaning" },
    plan = generateHannaSession(settings, 0),
    [first, second] = plan.recallTrials;
  const good =
    "A Nap hője indítja a párolgást. A vízpára felhővé sűrűsödik. A csapadék visszahullik.";
  const bad =
    "A Nap nem melegíti a vizet. Talán a vízpára felhővé sűrűsödik. Szeretem az esőt.";
  const result = scoreHannaAttempt(
    settings,
    0,
    completeAnswer(plan, {
      responses: [
        { trialId: first.id, value: good, rtMs: 800, hintLevel: 0 },
        { trialId: second.id, value: bad, rtMs: 800, hintLevel: 0 },
      ],
    }),
    { serverDurationMs: 60_000 },
  );
  assert.equal(result.metrics.subscales.textImmediate.correct, 3);
  assert.equal(result.metrics.subscales.textDelayed.correct, 0);
  assert.ok(
    result.details.some(({ feedback }) => /ellentmondó/.test(feedback ?? "")),
  );
  assert.ok(result.details.some(({ needsReview }) => needsReview));
  const falsePositive = "Szeretem a napot, a felhőt és az esőt.";
  const weak = scoreHannaAttempt(
    settings,
    0,
    completeAnswer(plan, {
      responses: [
        { trialId: first.id, value: falsePositive, rtMs: 800, hintLevel: 0 },
      ],
    }),
    { serverDurationMs: 60_000 },
  );
  assert.equal(weak.correct, 0);
  const explicitlyUncertain = scoreHannaAttempt(
    settings,
    0,
    completeAnswer(plan, {
      responses: [
        {
          trialId: first.id,
          value: good,
          rtMs: 800,
          hintLevel: 0,
          needsReview: true,
        },
      ],
    }),
    { serverDurationMs: 60_000 },
  );
  assert.equal(explicitlyUncertain.correct, 0);
  assert.ok(
    explicitlyUncertain.details
      .slice(0, 3)
      .every(({ needsReview }) => needsReview),
  );
});

test("a verbatim szóillesztés egy kihagyott szót nem kaszkádol végig", () => {
  const settings = { activity: "text", recallMode: "verbatim" },
    plan = generateHannaSession(settings, 0),
    trial = plan.recallTrials[0],
    words = trial.expected.split(" "),
    missing = [...words.slice(0, 2), ...words.slice(3)].join(" ");
  const result = scoreHannaAttempt(
    settings,
    0,
    completeAnswer(plan, {
      responses: [
        { trialId: trial.id, value: missing, rtMs: 700, hintLevel: 0 },
        {
          trialId: plan.recallTrials[1].id,
          value: plan.recallTrials[1].expected,
          rtMs: 700,
          hintLevel: 0,
        },
      ],
    }),
    { serverDurationMs: 60_000 },
  );
  assert.equal(
    result.total,
    2 *
      words
        .join(" ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .split(" ").length,
  );
  assert.equal(result.correct, result.total - 1);
  assert.equal(
    result.details.filter(({ feedback }) => feedback === "Kimaradt szó.")
      .length,
    1,
  );
});

test("a Fogalomból kép külön 2 mp képzeleti és korlátlan saját-szimbólum fázist ad", () => {
  const plan = generateHannaSession(
    { activity: "concept", difficulty: "hard", itemCount: 5 },
    9,
  );
  assert.equal(
    plan.encodingSteps.filter(({ kind }) => kind === "concept-imagine").length,
    5,
  );
  assert.ok(
    plan.encodingSteps
      .filter(({ kind }) => kind === "concept-imagine")
      .every(({ durationMs }) => durationMs === 2000),
  );
  assert.ok(
    plan.encodingSteps
      .filter(({ kind }) => kind === "concept-symbol")
      .every((step) => step.durationMs === undefined),
  );
  assert.ok(plan.recallTrials.some(({ id }) => id === "concept-chain"));
});

test("a Boss Fight részenként valódi, eltérő stratégiai kapaszkodót ad és a nyers választ validálja", () => {
  const plan = generateHannaSession({ activity: "boss" }, 14);
  assert.equal(plan.encodingSteps.length, 4);
  assert.ok(
    plan.encodingSteps.every(
      ({ strategyOptions }) =>
        strategyOptions.map(({ id }) => id).join(",") === "chain,loci,peg",
    ),
  );
  assert.ok(
    plan.encodingSteps.every(
      ({ strategyOptions }) =>
        new Set(strategyOptions.map(({ anchors }) => anchors.join("|"))).size >=
        2,
    ),
  );
  const invalid = completeAnswer(plan, {
    encoding: [
      {
        stepId: plan.encodingSteps[0].id,
        strategy: "telepátia",
        association: "",
        hintLevel: 0,
      },
    ],
  });
  assert.throws(
    () =>
      scoreHannaAttempt({ activity: "boss" }, 14, invalid, {
        serverDurationMs: 60_000,
      }),
    /stratégia/,
  );
  const valid = completeAnswer(plan, {
    encoding: plan.encodingSteps.map((step, index) => ({
      stepId: step.id,
      strategy: step.strategyOptions[index % 3].id,
      association: `Kapcsolat ${index}`,
      hintLevel: 0,
    })),
  });
  assert.equal(
    scoreHannaAttempt({ activity: "boss" }, 14, valid, {
      serverDurationMs: 60_000,
    }).percent,
    100,
  );
});

test("a választott Boss-stratégia tiszta kötésben ténylegesen más recall-támaszt ad", () => {
  const plan = generateHannaSession({ activity: "boss" }, 140),
    step = plan.encodingSteps.find(({ id }) => id === "boss-list-encoding"),
    expected = plan.recallTrials.find(({ id }) => id === "boss-list").expected,
    chain = bindHannaRecallSupport(plan, [
      {
        stepId: step.id,
        strategy: "chain",
        association: `A ${expected[0]} ráugrik erre: ${expected[1]}, majd hangosan csilingelnek.`,
      },
    ]),
    loci = bindHannaRecallSupport(plan, [
      { stepId: step.id, strategy: "loci", association: "" },
    ]),
    chainTrial = chain.recallTrials.find(({ id }) => id === "boss-list"),
    lociTrial = loci.recallTrials.find(({ id }) => id === "boss-list");
  assert.equal(plan.supportBindings, undefined);
  assert.notEqual(chainTrial.cue.anchor, lociTrial.cue.anchor);
  assert.equal(chainTrial.cue.strategy, "chain");
  assert.equal(lociTrial.cue.strategy, "loci");
  assert.match(chainTrial.hints[1], /\[…\]/);
  for (const expected of chainTrial.expected)
    assert.equal(
      chainTrial.hints[1]
        .toLocaleLowerCase("hu-HU")
        .includes(expected.toLocaleLowerCase("hu-HU")),
      false,
    );
  assert.equal(chain.supportBindings[0].associationRecorded, true);
  assert.ok(Object.isFrozen(chain));
  const acceptedPlan = clone(plan);
  acceptedPlan.recallTrials.find(({ id }) => id === "boss-list").accepted = [
    "elfogadott alak",
  ];
  const acceptedMasked = bindHannaRecallSupport(acceptedPlan, [
    {
      stepId: step.id,
      strategy: "chain",
      association: "Az elfogadott alak fényes dobozzá változik.",
    },
  ]);
  assert.doesNotMatch(
    acceptedMasked.recallTrials.find(({ id }) => id === "boss-list").hints[1],
    /elfogadott alak/i,
  );
  assert.throws(
    () =>
      bindHannaRecallSupport(plan, [
        { stepId: step.id, strategy: "ismeretlen" },
      ]),
    /stratégia/,
  );
  assert.throws(
    () => bindHannaRecallSupport(plan, [{ stepId: "idegen-step" }]),
    /idegen stepId/,
  );
});

test("az új hely-, peg- és Major-ismeret vezetett tanulást, rejtett tesztet és kötelező kaput kap", () => {
  for (const activity of ["loci", "peg", "major"]) {
    const settings = settingsFor(activity),
      plan = generateHannaSession(settings, 141),
      trainingFlows = plan.flow.filter(({ phase }) => phase === "training");
    assert.deepEqual(
      plan.training.phases.map(({ kind }) => kind),
      ["guided-study", "hidden-test"],
      activity,
    );
    assert.equal(plan.training.phases[0].referenceVisible, true, activity);
    assert.equal(plan.training.phases[1].referenceVisible, false, activity);
    assert.deepEqual(plan.training.completionPolicy, {
      requiresPass: true,
      canSkip: false,
      retry: "reshuffle-choices",
    });
    assert.ok(
      trainingFlows.every(
        ({ trainingPhaseIds }) =>
          Array.isArray(trainingPhaseIds) && trainingPhaseIds.length > 0,
      ),
      activity,
    );
    const firstEncodingIndex = plan.flow.findIndex(
        ({ phase }) => phase === "encoding",
      ),
      lastTrainingIndex = Math.max(
        ...trainingFlows.map((block) => plan.flow.indexOf(block)),
      );
    assert.ok(lastTrainingIndex < firstEncodingIndex, activity);

    const incomplete = scoreHannaAttempt(
      settings,
      141,
      completeAnswer(plan, { training: [] }),
      { serverDurationMs: 60_000 },
    );
    assert.equal(incomplete.percent, null, activity);
    assert.deepEqual(incomplete.metrics.completion, {
      status: "training-incomplete",
      trainingRequired: true,
      trainingAnswered: 0,
      trainingPassed: false,
    });
    assert.equal(incomplete.metrics.subscales.training.passed, false, activity);
    assert.ok(
      Object.values(incomplete.metrics.dimensions).every(
        (dimension) => dimension === null,
      ),
      activity,
    );

    const complete = scoreHannaAttempt(settings, 141, completeAnswer(plan), {
      serverDurationMs: 60_000,
    });
    assert.equal(complete.percent, 100, activity);
    assert.equal(complete.metrics.completion.status, "complete", activity);
  }
});

test("a learned snapshot csak valós encodinggal és nem üres felidézéssel készül", () => {
  const plan = generateHannaSession({ activity: "chain", itemCount: 5 }, 142),
    encoding = [{ stepId: plan.encodingSteps[0].id, association: "" }],
    answer = completeAnswer(plan, { encoding });
  assert.doesNotThrow(() => createHannaLearnedSnapshot(plan, answer));
  assert.throws(
    () => createHannaLearnedSnapshot(plan, completeAnswer(plan)),
    /encoding rekord/,
  );
  assert.throws(
    () =>
      createHannaLearnedSnapshot(
        plan,
        completeAnswer(plan, { encoding, responses: [] }),
      ),
    /nem üres felidézés/,
  );
  assert.throws(
    () => createHannaLearnedSnapshot(plan, answer, { completed: false }),
    /befejezetlen/,
  );
  const snapshot = clone(createHannaLearnedSnapshot(plan, answer));
  assert.throws(
    () =>
      normalizeHannaSettings({
        activity: "random",
        learnedSnapshot: { ...snapshot, encoding: [] },
      }),
    /encoding 1–200/,
  );
  assert.throws(
    () =>
      normalizeHannaSettings({
        activity: "random",
        learnedSnapshot: {
          ...snapshot,
          encoding: [
            { ...snapshot.encoding[0], itemId: "idegen-content-item" },
          ],
        },
      }),
    /itemId nincs a contentben/,
  );
  assert.throws(
    () =>
      normalizeHannaSettings({
        activity: "random",
        learnedSnapshot: { ...snapshot, anchors: [] },
      }),
    /anchors 1–100/,
  );
});

test("a flow csak saját gateId-t fogad, a reviewIds minden eleméhez snapshot kell", () => {
  const settings = { activity: "chain", itemCount: 5 },
    plan = generateHannaSession(settings, 143),
    unknownGate = completeAnswer(plan);
  unknownGate.events = [
    {
      eventId: "event-1",
      type: "gate-ready",
      atMs: 100,
      gateId: "idegen-gate",
    },
  ];
  assert.throws(
    () =>
      scoreHannaAttempt(settings, 143, unknownGate, {
        serverDurationMs: 60_000,
      }),
    /idegen gateId/,
  );
  const missingGate = completeAnswer(plan);
  missingGate.events = [{ eventId: "event-2", type: "gate-ready", atMs: 100 }];
  assert.throws(
    () =>
      scoreHannaAttempt(settings, 143, missingGate, {
        serverDurationMs: 60_000,
      }),
    /gateId szükséges/,
  );
  assert.throws(
    () =>
      generateHannaSession(
        {
          activity: "review",
          reviewIds: ["review-card-1", "nincs-snapshot"],
          reviewSnapshot: reviewSnapshot(),
        },
        143,
      ),
    /minden reviewId/,
  );
});

test("az adaptáció több dimenziót módosít, a profilmetrikák egységei nem keverednek", () => {
  const settings = {
      activity: "chain",
      difficulty: "normal",
      itemCount: 8,
      adaptive: true,
    },
    plan = generateHannaSession(settings, 8),
    perfect = scoreHannaAttempt(settings, 8, completeAnswer(plan), {
      serverDurationMs: 60_000,
    });
  assert.equal(perfect.metrics.adaptation.nextItemCount, 10);
  assert.equal(perfect.metrics.adaptation.nextSettings.contentLevel, "mixed");
  assert.equal(perfect.metrics.adaptation.nextSettings.similarity, "similar");
  assert.equal(perfect.metrics.dimensions.encodingSpeed.unit, "items/min");
  assert.equal(perfect.metrics.dimensions.sequenceMemory.unit, "ratio");
  assert.equal(perfect.metrics.dimensions.randomAccess.unit, "ms");
  const empty = scoreHannaAttempt(
    settings,
    8,
    completeAnswer(plan, { responses: [] }),
    { serverDurationMs: 60_000 },
  );
  assert.equal(empty.metrics.adaptation.nextItemCount, 5);
  assert.equal(empty.metrics.dimensions.longTermRetention, null);
});

test("minden család perfect és omitted adaptációja visszanormalizálható, inert dimenziót nem emel", () => {
  for (const { id } of HANNA_ACTIVITIES) {
    const settings = settingsFor(id),
      plan = generateHannaSession(settings, 404),
      perfect = scoreHannaAttempt(settings, 404, completeAnswer(plan), {
        serverDurationMs: 60_000,
      }),
      omitted = scoreHannaAttempt(
        settings,
        404,
        completeAnswer(plan, { responses: [] }),
        { serverDurationMs: 60_000 },
      );
    assert.doesNotThrow(() =>
      normalizeHannaSettings({
        ...settings,
        ...perfect.metrics.adaptation.nextSettings,
      }),
    );
    assert.doesNotThrow(() =>
      normalizeHannaSettings({
        ...settings,
        ...omitted.metrics.adaptation.nextSettings,
      }),
    );
    if (["random", "review"].includes(id)) {
      const normalized = normalizeHannaSettings(settings);
      assert.equal(
        perfect.metrics.adaptation.nextSettings.delayMs,
        normalized.delayMs,
      );
      assert.equal(
        perfect.metrics.adaptation.nextSettings.similarity,
        normalized.similarity,
      );
      assert.equal(
        perfect.metrics.adaptation.nextSettings.interferenceLevel,
        normalized.interferenceLevel,
      );
    }
  }
});

test("a public tervből a privát accepted/contradictions eltűnik, scoring contextből még pontozható", () => {
  const resource = {
    id: "anyag-1",
    kind: "material",
    title: "Anyag",
    revision: 1,
    ready: true,
    data: {
      text: "A macska alszik. A kutya fut. A madár repül.",
      rubric: [
        {
          id: "cat",
          label: "Macska",
          accepted: ["a cica pihen"],
          contradictions: ["a macska nem pihen"],
        },
      ],
    },
  };
  const settings = {
      activity: "text",
      contentLevel: "material",
      resourceSnapshot: [resource],
    },
    publicResource = {
      ...resource,
      data: { ...resource.data, rubric: [{ id: "cat", label: "Macska" }] },
    },
    publicSettings = {
      activity: "text",
      contentLevel: "material",
      resourceSnapshot: [publicResource],
    },
    plan = generateHannaSession(settings, 3);
  assert.deepEqual(plan.settings.resourceSnapshot[0].data.rubric, [
    { id: "cat", label: "Macska" },
  ]);
  assert.deepEqual(plan.recallTrials[0].rubric, [
    { id: "cat", label: "Macska" },
  ]);
  const answer = completeAnswer(plan, {
    responses: plan.recallTrials.map((trial) => ({
      trialId: trial.id,
      value: "A cica pihen.",
      rtMs: 500,
      hintLevel: 0,
    })),
  });
  const result = scoreHannaAttempt(publicSettings, 3, answer, {
    serverDurationMs: 60_000,
    privateSettings: { hannaResourceSnapshot: [resource] },
    hannaPlanSnapshot: plan,
  });
  assert.equal(result.correct, 2);
  assert.equal(result.total, 2);
});

test("az általános rubrikaőr elutasítja az egyező tagadást, de nem büntet puszta 'nem' jelenlétet", () => {
  const score = (accepted, value) => {
    const resource = {
        id: "negation-material",
        kind: "material",
        title: "Tagadáspróba",
        revision: 1,
        ready: true,
        data: {
          text: "A macska alszik a párnán. A kutya fut az udvaron. A madár repül a fa fölött.",
          rubric: [{ id: "cat", label: "Macska", accepted }],
        },
      },
      settings = {
        activity: "text",
        contentLevel: "material",
        resourceIds: [resource.id],
        resourceSnapshot: [resource],
      },
      plan = generateHannaSession(settings, 91),
      answer = completeAnswer(plan, {
        responses: plan.recallTrials.map((trial) => ({
          trialId: trial.id,
          value,
          rtMs: 600,
          hintLevel: 0,
        })),
      });
    return scoreHannaAttempt(settings, 91, answer, {
      serverDurationMs: 60_000,
      privateSettings: { hannaResourceSnapshot: [resource] },
      hannaPlanSnapshot: plan,
    });
  };
  const contradicted = score(["a macska alszik"], "A macska nem alszik."),
    positive = score(["a macska alszik"], "A macska alszik békésen."),
    acceptedNegation = score(["a macska nem alszik"], "A macska nem alszik."),
    unrelatedNegation = score(["a macska alszik"], "A kutya nem fut."),
    rejectedAfterward = score(
      ["a macska alszik"],
      "A macska alszik. Ez hamis.",
    ),
    doubtedAfterward = score(
      ["a macska alszik"],
      "A macska alszik, de kétlem.",
    );
  assert.equal(contradicted.correct, 0);
  assert.ok(
    contradicted.metrics.blockResults.every(
      ({ contradictions }) => contradictions === 1,
    ),
  );
  assert.ok(
    contradicted.details.every(({ feedback }) =>
      /tagadja az elfogadott/.test(feedback ?? ""),
    ),
  );
  assert.equal(positive.correct, 2);
  assert.equal(acceptedNegation.correct, 2);
  assert.equal(unrelatedNegation.correct, 0);
  assert.ok(
    unrelatedNegation.metrics.blockResults.every(
      ({ contradictions }) => contradictions === 0,
    ),
  );
  assert.equal(rejectedAfterward.correct, 0);
  assert.equal(doubtedAfterward.correct, 0);
  assert.ok(
    [rejectedAfterward, doubtedAfterward].every((result) =>
      result.details.every(({ needsReview }) => needsReview === true),
    ),
  );
  assert.ok(
    doubtedAfterward.details.every(({ feedback }) =>
      /ellenőrzést kér/.test(feedback ?? ""),
    ),
  );
});

test("minden család generált review eleme normalizálható és megőrzi a pontozási típust", () => {
  for (const { id: sourceActivity } of HANNA_ACTIVITIES) {
    if (sourceActivity === "review") continue;
    const sourcePlan = generateHannaSession(settingsFor(sourceActivity), 733),
      snapshot = sourcePlan.reviewItems.map((item) => ({
        ...clone(item),
        learnedAt: "2026-09-11T08:00:00.000Z",
        lastReviewedAt: null,
        intervalMs: 600_000,
      })),
      reviewSettings = { activity: "review", reviewSnapshot: snapshot },
      normalized = normalizeHannaSettings(reviewSettings),
      reviewPlan = generateHannaSession(reviewSettings, 734);
    assert.equal(normalized.itemCount, snapshot.length, sourceActivity);
    assert.equal(
      reviewPlan.recallTrials.length,
      snapshot.length,
      sourceActivity,
    );
    assert.deepEqual(
      reviewPlan.recallTrials.map(({ assessment }) => assessment),
      snapshot.map(({ assessment }) => assessment),
      sourceActivity,
    );
    const correct = scoreHannaAttempt(
        reviewSettings,
        734,
        completeAnswer(reviewPlan),
        {
          serverDurationMs: 60_000,
          serverRetentionMs: 600_000,
          privateSettings: { hannaReviewSnapshot: snapshot },
          hannaPlanSnapshot: reviewPlan,
        },
      ),
      wrong = scoreHannaAttempt(
        reviewSettings,
        734,
        completeAnswer(reviewPlan, {
          responses: reviewPlan.recallTrials.map((trial) => ({
            trialId: trial.id,
            value:
              trial.assessment === "digits"
                ? String(trial.expected)
                    .split("")
                    .map((digit) => String((Number(digit) + 1) % 10))
                    .join("")
                : Array.isArray(trial.expected)
                  ? ["hibás"]
                  : "hibás",
            rtMs: 900,
            hintLevel: 0,
          })),
        }),
        {
          serverDurationMs: 60_000,
          serverRetentionMs: 600_000,
          privateSettings: { hannaReviewSnapshot: snapshot },
          hannaPlanSnapshot: reviewPlan,
        },
      ),
      omitted = scoreHannaAttempt(
        reviewSettings,
        734,
        completeAnswer(reviewPlan, { responses: [] }),
        {
          serverDurationMs: 60_000,
          serverRetentionMs: 600_000,
          privateSettings: { hannaReviewSnapshot: snapshot },
          hannaPlanSnapshot: reviewPlan,
        },
      );
    assert.equal(correct.correct, correct.total, sourceActivity);
    assert.equal(wrong.correct, 0, sourceActivity);
    assert.equal(omitted.correct, 0, sourceActivity);
  }
});

test("a review megtartja a saját encoding-hivatkozást, a maszkolt hintet és elrejti a nyers történetet", () => {
  const source = generateHannaSession({ activity: "chain", itemCount: 5 }, 801),
    card = clone(
      source.reviewItems.find(({ encodingStepIds }) => encodingStepIds.length),
    ),
    stepId = card.encodingStepIds[0],
    itemId = card.content[0].id;
  Object.assign(card, {
    learnedAt: "2026-09-11T08:00:00.000Z",
    lastReviewedAt: null,
    intervalMs: 600_000,
    hints: [
      "Saját lánc első képe.",
      "A szerver által maszkolt saját jelenet.",
      "Vizuális kezdőpont.",
    ],
    encoding: [
      {
        stepId,
        itemId,
        association: "Privát teljes saját történet.",
        checks: ["mozgás", "kölcsönhatás"],
      },
    ],
  });
  const settings = { activity: "review", reviewSnapshot: [card] },
    normalized = normalizeHannaSettings(settings),
    plan = generateHannaSession(settings, 802),
    trial = plan.recallTrials[0];
  assert.equal(
    normalized.reviewSnapshot[0].encoding[0].association,
    "Privát teljes saját történet.",
  );
  assert.equal(trial.cue.associationStepId, stepId);
  assert.equal(trial.hints[1], "A szerver által maszkolt saját jelenet.");
  assert.equal(
    plan.settings.reviewSnapshot[0].encoding[0].association,
    undefined,
  );
  assert.equal(plan.settings.reviewSnapshot[0].encoding[0].checks, undefined);

  const badStep = clone(card);
  badStep.encoding[0].stepId = "idegen-step";
  assert.throws(
    () =>
      normalizeHannaSettings({ activity: "review", reviewSnapshot: [badStep] }),
    /encoding stepId/,
  );
  const badItem = clone(card);
  badItem.encoding[0].itemId = "idegen-item";
  assert.throws(
    () =>
      normalizeHannaSettings({ activity: "review", reviewSnapshot: [badItem] }),
    /encoding itemId/,
  );
});

test("a review 24 óra előtt delayed, 24 órától long-term, az aktuális eltelt idő mindig megmarad", () => {
  const settings = { activity: "review", reviewSnapshot: reviewSnapshot() },
    plan = generateHannaSession(settings, 803),
    answer = completeAnswer(plan),
    scoreAt = (serverRetentionMs) =>
      scoreHannaAttempt(settings, 803, answer, {
        serverDurationMs: 60_000,
        serverRetentionMs,
        privateSettings: { hannaReviewSnapshot: reviewSnapshot() },
        hannaPlanSnapshot: plan,
      });
  const short = scoreAt(25 * 60_000),
    day = scoreAt(86_400_000),
    zero = scoreAt(0),
    future = scoreAt(-1000);
  assert.equal(short.metrics.retentionActualMs, 25 * 60_000);
  assert.equal(short.metrics.dimensions.delayedRecall.value, 1);
  assert.equal(short.metrics.dimensions.longTermRetention, null);
  assert.equal(day.metrics.dimensions.delayedRecall, null);
  assert.deepEqual(day.metrics.dimensions.longTermRetention, {
    value: 1,
    unit: "ratio",
    retentionMs: 86_400_000,
  });
  assert.equal(zero.metrics.dimensions.delayedRecall, null);
  assert.equal(zero.metrics.dimensions.longTermRetention, null);
  assert.equal(future.metrics.retentionActualMs, -1000);
  assert.equal(future.metrics.dimensions.delayedRecall, null);
  assert.equal(future.metrics.dimensions.longTermRetention, null);
  assert.ok(future.metrics.qualityFlags.includes("retention-clock-invalid"));
});

test("a review létra hibás, lassú, gyors és megoldásmutatott válaszra külön reagál", () => {
  assert.equal(
    nextHannaReview({
      correct: false,
      rtMs: null,
      hintLevel: 0,
      previousIntervalMs: 600_000,
    }),
    600_000,
  );
  assert.equal(
    nextHannaReview({
      correct: true,
      rtMs: 6000,
      hintLevel: 0,
      previousIntervalMs: 600_000,
    }),
    3_600_000,
  );
  assert.equal(
    nextHannaReview({
      correct: true,
      rtMs: 900,
      hintLevel: 0,
      previousIntervalMs: 600_000,
    }),
    86_400_000,
  );
  assert.equal(
    nextHannaReview({
      correct: true,
      rtMs: 900,
      hintLevel: 4,
      previousIntervalMs: 86_400_000,
    }),
    600_000,
  );
});

test("az erőforrásnormalizálás az undefined/falsy hivatkozásokat és hibás listákat elutasítja", () => {
  assert.throws(
    () =>
      normalizeHannaResource("palace", {
        locations: Array.from({ length: 5 }, (_, index) => ({
          id: index === 0 ? "" : `x${index}`,
          name: `Hely ${index}`,
          description: "",
        })),
      }),
    /id/,
  );
  assert.throws(
    () =>
      normalizeHannaResource("peg", {
        entries: Array.from({ length: 5 }, (_, index) => ({
          number: index,
          label: `Horog ${index}`,
        })),
      }),
    /1 és 100|egymást követő/,
  );
  assert.throws(
    () =>
      normalizeHannaResource("major", {
        entries: [{ code: "0", label: "szó" }],
      }),
    /két különböző számjegy/,
  );
});

test("a review kártyák trial-szinten egyediek, a lánc és loci tanult egysége mégsem többszöröződik", () => {
  const faces = generateHannaSession(
      { activity: "faces", itemCount: 20, difficulty: "normal" },
      901,
    ),
    keyword = generateHannaSession(
      { activity: "keyword", itemCount: 8 },
      901,
    ),
    major = generateHannaSession({ activity: "major" }, 901),
    chain = generateHannaSession({ activity: "chain", itemCount: 5 }, 901),
    loci = generateHannaSession({ activity: "loci", itemCount: 5 }, 901);
  for (const plan of [faces, keyword, major, chain, loci]) {
    assert.equal(
      new Set(plan.reviewItems.map(({ id }) => id)).size,
      plan.reviewItems.length,
    );
    assert.equal(
      new Set(plan.reviewItems.map(({ sourceItemId }) => sourceItemId)).size,
      plan.reviewItems.length,
    );
  }
  assert.equal(faces.reviewItems.length, 40);
  assert.equal(keyword.reviewItems.length, 16);
  assert.equal(major.reviewItems.length, 20);
  assert.equal(chain.reviewItems.length, 1);
  assert.equal(loci.reviewItems.length, 1);
});

test("a képkapcsoló stabil párokat ismétel és külön méri a köröket az egyedi kapcsolatoktól", () => {
  const plan = generateHannaSession(
      { activity: "association", itemCount: 3, associationMs: 30_000 },
      902,
    ),
    step = plan.encodingSteps[0],
    pairs = new Map();
  assert.equal(step.rounds.length, 30);
  assert.equal(plan.content.length, 6);
  for (const round of step.rounds) {
    const [left, right] = round.itemIds;
    assert.equal(pairs.get(left) ?? right, right);
    pairs.set(left, right);
  }
  assert.equal(pairs.size, 3);
  assert.equal(plan.reviewItems.length, 30);
  assert.deepEqual(
    plan.reviewItems.map(({ activationRoundId }) => activationRoundId),
    step.rounds.map(({ id }) => id),
  );
  const firstTwoActivated = new Set(step.rounds.slice(0, 2).map(({ id }) => id));
  assert.equal(
    plan.reviewItems.filter(({ activationRoundId }) =>
      firstTwoActivated.has(activationRoundId),
    ).length,
    2,
  );
  assert.equal(
    new Set(plan.reviewItems.map(({ connectionId }) => connectionId)).size,
    3,
  );
  assert.equal(step.rounds[3].repeatExposure, true);
  assert.equal(plan.recallTrials[3].repeatExposure, true);
  const activeRounds = step.rounds.slice(0, 5),
    activeIds = new Set(activeRounds.map(({ id }) => id)),
    answer = completeAnswer(plan, {
      encoding: activeRounds.map((round) => ({
        stepId: step.id,
        roundId: round.id,
        choiceId: round.preferredChoiceId,
        rtMs: 300,
      })),
      responses: plan.recallTrials
        .filter(({ activationRoundId }) => activeIds.has(activationRoundId))
        .map((trial) => ({
          trialId: trial.id,
          value: trial.expected,
          rtMs: 400,
          hintLevel: 0,
        })),
    }),
    result = scoreHannaAttempt(plan.settings, 902, answer, {
      serverDurationMs: 60_000,
      hannaPlanSnapshot: plan,
    });
  assert.deepEqual(result.metrics.subscales.association, {
    processedPairs: 5,
    uniqueConnections: 3,
    repeatedExposures: 2,
    recalledPairs: 5,
    correct: 5,
    total: 5,
  });
});

test("az ismételt próbán belüli expozíció látható provenance, a gépelt válasz továbbra önálló", () => {
  const chain = generateHannaSession({ activity: "chain", itemCount: 5 }, 903);
  assert.equal(chain.recallTrials[0].repeatExposure, undefined);
  assert.equal(chain.recallTrials[1].repeatExposure, true);
  assert.equal(chain.recallTrials[1].accessMode, "independent");
  assert.ok(chain.recallTrials.slice(2).every(({ repeatExposure }) => repeatExposure));
  const result = scoreHannaAttempt(
    chain.settings,
    903,
    completeAnswer(chain),
    { serverDurationMs: 60_000, hannaPlanSnapshot: chain },
  );
  assert.ok(result.metrics.qualityFlags.includes("within-session-repeat-exposure"));
  assert.ok(result.metrics.subscales.repeatExposure.trialIds.length > 1);

  for (const activity of ["keyword", "major"]) {
    const plan = generateHannaSession({ activity }, 903),
      byItem = new Map();
    for (const trial of plan.recallTrials) {
      const list = byItem.get(trial.itemIds[0]) ?? [];
      list.push(trial.repeatExposure === true);
      byItem.set(trial.itemIds[0], list);
    }
    assert.ok(
      [...byItem.values()].every(
        (flags) => flags.length === 2 && flags.filter(Boolean).length === 1,
      ),
    );
  }
});

test("a rubrika bizonytalansága és tagadása csak a hozzá tartozó mondatot vagy tagmondatot érinti", () => {
  const resource = {
      id: "scoped-rubric",
      kind: "material",
      title: "Három állítás",
      revision: 1,
      ready: true,
      data: {
        text: "A Nap felmelegíti a vizet. A víz felhővé alakul. A felhőből eső hullik.",
        rubric: [
          { id: "sun", label: "A Nap szerepe", accepted: ["a nap felmelegíti a vizet"] },
          { id: "cloud", label: "A felhő kialakulása", accepted: ["a víz felhővé alakul"] },
          { id: "rain", label: "A csapadék", accepted: ["a felhőből eső hullik"] },
        ],
      },
    },
    settings = {
      activity: "text",
      contentLevel: "material",
      resourceIds: [resource.id],
      resourceSnapshot: [resource],
    },
    plan = generateHannaSession(settings, 904),
    score = (value) => scoreHannaAttempt(
      settings,
      904,
      completeAnswer(plan, {
        responses: plan.recallTrials.map((trial) => ({
          trialId: trial.id,
          value,
          rtMs: 500,
          hintLevel: 0,
        })),
      }),
      {
        serverDurationMs: 60_000,
        hannaPlanSnapshot: plan,
        privateSettings: { hannaResourceSnapshot: [resource] },
      },
    );
  const unrelated = score(
      "A Nap felmelegíti a vizet. A víz felhővé alakul. A harmadikra talán nem emlékszem.",
    ),
    rejected = score(
      "A Nap felmelegíti a vizet, de kétlem. A víz felhővé alakul.",
    );
  assert.equal(unrelated.correct, 4);
  assert.equal(unrelated.total, 6);
  assert.equal(
    unrelated.details.filter(({ needsReview }) => needsReview).length,
    0,
  );
  assert.equal(rejected.correct, 2);
  assert.ok(
    rejected.details
      .filter(({ label }) => label === "A Nap szerepe")
      .every(({ needsReview }) => needsReview),
  );
});

test("a rubrikacímke nem szivárogtathat teljes választ, accepted nélkül pedig tanári ellenőrzés kell", () => {
  assert.throws(
    () => normalizeHannaResource("material", {
      text: "A Nap melegít.",
      rubric: [
        {
          id: "sun",
          label: "A Nap felmelegíti a vizet",
          accepted: ["a nap felmelegíti a vizet"],
        },
      ],
    }),
    /nem tartalmazhatja a teljes választ/,
  );
  const resource = {
      id: "teacher-review",
      kind: "material",
      title: "Tanári ellenőrzés",
      revision: 1,
      ready: true,
      data: {
        text: "A Nap melegít.",
        rubric: [{ id: "sun", label: "A Nap szerepe" }],
      },
    },
    settings = {
      activity: "text",
      contentLevel: "material",
      resourceSnapshot: [resource],
    },
    plan = generateHannaSession(settings, 905),
    result = scoreHannaAttempt(
      settings,
      905,
      completeAnswer(plan, {
        responses: plan.recallTrials.map((trial) => ({
          trialId: trial.id,
          value: "A Nap melegít.",
          rtMs: 500,
          hintLevel: 0,
        })),
      }),
      { serverDurationMs: 60_000, hannaPlanSnapshot: plan },
    );
  assert.equal(result.correct, 0);
  assert.ok(result.details.every(({ needsReview }) => needsReview));
});

test("a saját palota horgai aktivitástól függetlenek, a rövid kör teljes-listás prefixet és ötös szakaszokat tart", () => {
  const resource = palaceSnapshot(30),
    common = {
      itemCount: 10,
      resourceIds: [resource.id],
      resourceSnapshot: [resource],
    },
    loci = generateHannaSession({ ...common, activity: "loci" }, 906),
    palace = generateHannaSession({ ...common, activity: "palace" }, 906),
    readiness = createPalaceReadinessTrials(resource);
  assert.equal(loci.content.length, 10);
  assert.equal(palace.content.length, 10);
  assert.deepEqual(
    loci.content.map(({ anchorId }) => anchorId),
    palace.content.map(({ anchorId }) => anchorId),
  );
  assert.deepEqual(
    palace.content.map(({ anchorId }) => anchorId),
    readiness.items.slice(0, 10).map(({ id }) => id),
  );
  assert.deepEqual(
    palace.encodingSteps[0].rooms.map(({ itemIds }) => itemIds.length),
    [5, 5],
  );
});

test("a második peg batch random kérdései az eredeti 11–20 horogszámokat őrzik", () => {
  const settings = { activity: "peg", itemCount: 20, trainingSize: 10 },
    first = generateHannaSession(settings, 907),
    mastery = {
      scopeKey: first.training.scopeKey,
      items: first.training.coverage.testedIds.map((itemId) => ({
        itemId,
        directions: ["forward", "reverse"],
        bestRtMs: 900,
        mastered: true,
      })),
    },
    second = generateHannaSession({ ...settings, trainingMastery: mastery }, 907);
  assert.deepEqual(second.content.map(({ peg }) => peg), [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  const snapshot = createHannaLearnedSnapshot(
      second,
      completeAnswer(second, {
        encoding: [{
          stepId: second.encodingSteps[0].id,
          itemId: second.encodingSteps[0].itemIds[0],
          association: "konkrét kapcsolat",
          checks: [],
          hintLevel: 0,
          rtMs: 500,
        }],
      }),
    ),
    trials = buildHannaRandomTrials(snapshot, 907);
  for (const trial of trials) {
    if (trial.position !== undefined)
      assert.ok(trial.position >= 11 && trial.position <= 20);
    if (trial.positions)
      assert.ok(trial.positions.every((position) => position >= 11 && position <= 20));
  }
  assert.ok(trials.some(({ prompt }) => /11|12|13|14|15|16|17|18|19|20/.test(prompt)));
});

test("a peg felidézési blokkok a tárgyakat nevezik, a szám-horog training külön marad", () => {
  const plan = generateHannaSession({ activity: "peg", itemCount: 10 }, 911),
    result = scoreHannaAttempt(
      plan.settings,
      911,
      completeAnswer(plan),
      { serverDurationMs: 60_000, hannaPlanSnapshot: plan },
    ),
    labels = Object.fromEntries(
      result.metrics.blockResults.map(({ id, label }) => [id, label]),
    );
  assert.equal(labels["peg-forward"], "Tárgyak előre");
  assert.equal(labels["peg-reverse"], "Tárgyak visszafelé");
  assert.equal(labels["peg-random"], "Tárgyak horogszám alapján");
  assert.equal(result.metrics.subscales.training.kind, "peg");
});

test("a részleges saját Major-szótár elemszáma a tervben, összegzésben és összehasonlításban is valós", () => {
  const resource = {
      id: "major-three",
      kind: "major",
      title: "Három szó",
      revision: 2,
      ready: true,
      data: { entries: [
        { code: "10", label: "tűz" },
        { code: "21", label: "nád" },
        { code: "34", label: "mér" },
      ] },
    },
    settings = {
      activity: "major",
      resourceIds: [resource.id],
      resourceSnapshot: [resource],
    },
    plan = generateHannaSession(settings, 908),
    result = scoreHannaAttempt(
      plan.settings,
      908,
      completeAnswer(plan),
      { serverDurationMs: 60_000, hannaPlanSnapshot: plan },
    );
  assert.equal(plan.settings.itemCount, 3);
  assert.equal(plan.content.length, 3);
  assert.equal(plan.recallTrials.length, 6);
  assert.match(describeHannaSettings(plan.settings), /3 elem/);
  assert.match(result.metrics.comparabilityKey, /:3:/);
});

test("a random és review nem hirdet vagy fogad inert zavaró módot", () => {
  for (const activity of ["random", "review"]) {
    assert.ok(!hannaActivityCapabilities(activity).activeSettings.includes("interferenceLevel"));
    assert.throws(
      () => normalizeHannaSettings({ ...settingsFor(activity), interferenceLevel: 1 }),
      /interferenceLevel/,
    );
  }
  const random = normalizeHannaSettings({
    ...settingsFor("random"),
    difficulty: "hard",
    similarity: "varied",
    interferenceLevel: 0,
  });
  assert.equal(random.similarity, "varied");
  assert.equal(random.interferenceLevel, 0);
  assert.deepEqual(HANNA_ACTIVITIES.find(({ id }) => id === "chain").recallModes, ["ordered"]);
  assert.deepEqual(HANNA_ACTIVITIES.find(({ id }) => id === "concept").recallModes, ["meaning"]);
});

test("az üres review expected minden alakban elutasított", () => {
  for (const expected of ["", []]) {
    const snapshot = reviewSnapshot();
    snapshot[0].expected = expected;
    assert.throws(
      () => normalizeHannaSettings({ activity: "review", reviewSnapshot: snapshot }),
      /expected/,
    );
  }
});

test("a kliensidő pontosságot nem töröl, de gyors adatot nem használ mérésnek vagy masterynek", () => {
  const baseline = generateHannaSession({ activity: "baseline" }, 909),
    result = scoreHannaAttempt(
      baseline.settings,
      909,
      completeAnswer(baseline, { rtMs: 50 }),
      { serverDurationMs: 60_000, hannaPlanSnapshot: baseline },
    );
  assert.equal(result.percent, 100);
  assert.equal(result.metrics.medianCorrectRtMs, null);
  assert.ok(result.metrics.qualityFlags.includes("client-timing"));
  assert.ok(result.metrics.qualityFlags.includes("implausibly-fast"));
  assert.deepEqual(result.metrics.timingEvidence, {
    source: "browser-monotonic-clock",
    serverVerified: false,
  });

  const major = generateHannaSession({ activity: "major" }, 909),
    trainingResult = scoreHannaAttempt(
      major.settings,
      909,
      completeAnswer(major, { rtMs: 50 }),
      { serverDurationMs: 60_000, hannaPlanSnapshot: major },
    );
  assert.equal(trainingResult.metrics.subscales.training.passed, false);
  assert.equal(trainingResult.metrics.completion.status, "training-incomplete");
  assert.equal(trainingResult.percent, null);
});

test("a V2 nyers események megtartják és tervhez validálják a step, round, trial és gate hivatkozást", () => {
  const plan = generateHannaSession(
      { activity: "association", itemCount: 3 },
      910,
    ),
    step = plan.encodingSteps[0],
    round = step.rounds[0],
    trial = plan.recallTrials[0],
    gateId = plan.flow.find(({ gateId: id }) => id).gateId,
    answer = completeAnswer(plan);
  answer.events = [
    { eventId: "e-start", type: "start", atMs: 0 },
    { eventId: "e-commit", type: "encoding-commit", atMs: 100, stepId: step.id },
    { eventId: "e-choice", type: "association-choice", atMs: 200, stepId: step.id, roundId: round.id },
    { eventId: "e-time", type: "association-time", atMs: 300, stepId: step.id },
    { eventId: "e-recall", type: "recall-response", atMs: 400, trialId: trial.id },
    { eventId: "e-hint", type: "hint", atMs: 450, trialId: trial.id },
    { eventId: "e-location", type: "location-select", atMs: 500, stepId: step.id },
    { eventId: "e-gate", type: "gate-prepare", atMs: 600, gateId },
    { eventId: "e-complete", type: "complete", atMs: 700 },
  ];
  const result = scoreHannaAttempt(plan.settings, 910, answer, {
    serverDurationMs: 60_000,
    hannaPlanSnapshot: plan,
  });
  assert.equal(result.percent, 100);
  for (const mutation of [
    { eventId: "bad-step", type: "encoding-commit", atMs: 1, stepId: "foreign" },
    { eventId: "bad-round", type: "association-choice", atMs: 1, stepId: step.id, roundId: "foreign" },
    { eventId: "bad-trial", type: "recall-response", atMs: 1, trialId: "foreign" },
    { eventId: "unscoped-hint", type: "hint", atMs: 1 },
    { eventId: "unscoped-answer", type: "show-answer", atMs: 1 },
    { eventId: "bad-gate", type: "gate-prepare", atMs: 1, gateId: "foreign" },
  ]) {
    assert.throws(
      () => scoreHannaAttempt(
        plan.settings,
        910,
        { ...answer, events: [mutation] },
        { serverDurationMs: 60_000, hannaPlanSnapshot: plan },
      ),
      /idegen|szükséges/,
    );
  }
});

test("a review draft alapértelmezett kerete öt, a hidratált kör a tényleges esedékes darabszámra zár", () => {
  assert.equal(normalizeHannaSettings({ activity: "review" }).itemCount, 5);
  const snapshot = Array.from({ length: 3 }, (_, index) => ({
    ...reviewSnapshot()[0],
    id: `review-card-${index + 1}`,
    sourceItemId: `source-${index + 1}`,
  }));
  assert.equal(
    normalizeHannaSettings({ activity: "review", reviewSnapshot: snapshot }).itemCount,
    3,
  );
});

test("a helyes review 80 ms alatti kliensidővel is menthető és csak egy intervallumot lép", () => {
  const settings = { activity: "review", reviewSnapshot: reviewSnapshot() },
    plan = generateHannaSession(settings, 912),
    answer = completeAnswer(plan, { rtMs: 50 }),
    result = scoreHannaAttempt(settings, 912, answer, {
      serverDurationMs: 60_000,
      hannaPlanSnapshot: plan,
    });
  assert.equal(result.percent, 100);
  assert.ok(result.metrics.qualityFlags.includes("implausibly-fast"));
  assert.equal(result.metrics.reviewOutcomes[0].rtMs, null);
  assert.equal(result.metrics.reviewOutcomes[0].nextIntervalMs, 3_600_000);
  assert.equal(
    nextHannaReview({
      correct: true,
      rtMs: null,
      hintLevel: 0,
      previousIntervalMs: 600_000,
    }),
    3_600_000,
  );
});

test("a score és a checkpoint számára közös training gate csak legalább 100 ms-os helyes választ tekint evidenciának", () => {
  const major = generateHannaSession({ activity: "major" }, 913),
    answers = major.training.trials.map((trial) => ({
      trialId: trial.id,
      value: trial.expected,
      rtMs: 900,
    }));
  answers[0] = { ...answers[0], value: "", rtMs: 90 };
  const oneFastWrong = evaluateHannaTrainingGate(major.training, answers);
  assert.equal(oneFastWrong.rawCorrect, 19);
  assert.equal(oneFastWrong.correct, 19);
  assert.equal(oneFastWrong.accuracy, 0.95);
  assert.equal(oneFastWrong.passed, true);

  answers[0] = {
    ...answers[0],
    value: major.training.trials[0].expected,
    rtMs: 90,
  };
  const oneFastCorrect = evaluateHannaTrainingGate(major.training, answers);
  assert.equal(oneFastCorrect.rawCorrect, 20);
  assert.equal(oneFastCorrect.correct, 19);
  assert.equal(oneFastCorrect.evidence[0].answerCorrect, true);
  assert.equal(oneFastCorrect.evidence[0].timingEligible, false);

  const peg = generateHannaSession({ activity: "peg", itemCount: 10 }, 913),
    pegAnswers = peg.training.trials.map((trial, index) => ({
      trialId: trial.id,
      value: trial.expected,
      rtMs: index === 0 ? 90 : 900,
    }));
  assert.equal(evaluateHannaTrainingGate(peg.training, pegAnswers).passed, false);
  const scored = scoreHannaAttempt(
    peg.settings,
    913,
    completeAnswer(peg, { training: pegAnswers }),
    { serverDurationMs: 60_000, hannaPlanSnapshot: peg },
  );
  assert.deepEqual(
    scored.metrics.subscales.training,
    evaluateHannaTrainingGate(peg.training, pegAnswers),
  );
});

test("a kötőszó utáni helyes állító tagmondatot nem fordítja meg az előző tagadás", () => {
  const resource = {
      id: "comma-rubric",
      kind: "material",
      title: "Tagmondat",
      revision: 1,
      ready: true,
      data: {
        text: "A csapadék visszahullik. A víz újra körbejár. A Nap melegít.",
        rubric: [
          {
            id: "return",
            label: "A csapadék útja",
            accepted: ["a csapadék visszahullik"],
          },
        ],
      },
    },
    settings = {
      activity: "text",
      contentLevel: "material",
      resourceSnapshot: [resource],
    },
    plan = generateHannaSession(settings, 914),
    score = (value) => scoreHannaAttempt(
      settings,
      914,
      completeAnswer(plan, {
        responses: plan.recallTrials.map((trial) => ({
          trialId: trial.id,
          value,
          rtMs: 500,
          hintLevel: 0,
        })),
      }),
      {
        serverDurationMs: 60_000,
        hannaPlanSnapshot: plan,
        privateSettings: { hannaResourceSnapshot: [resource] },
      },
    );
  for (const value of [
    "A csapadék nem tűnik el, visszahullik.",
    "A csapadék nem tűnik el, hanem visszahullik.",
    "A csapadék nem tűnik el és visszahullik.",
    "A csapadék nem tűnik el majd visszahullik.",
    "A csapadék nem tűnik el de visszahullik.",
    "A csapadék nem tűnik el azonban visszahullik.",
    "A csapadék nem tűnik el viszont visszahullik.",
  ]) {
    const result = score(value);
    assert.equal(result.correct, 2);
    assert.ok(
      result.metrics.blockResults.every(
        ({ contradictions }) => contradictions === 0,
      ),
    );
  }
});

test("a megcáfolt tiltott állítás nem contradiction, a tényleges tiltott állítás igen", () => {
  const settings = { activity: "text", recallMode: "meaning" },
    plan = generateHannaSession(settings, 0),
    score = (value) =>
      scoreHannaAttempt(
        settings,
        0,
        completeAnswer(plan, {
          responses: plan.recallTrials.map((trial) => ({
            trialId: trial.id,
            value,
            rtMs: 800,
            hintLevel: 0,
          })),
        }),
        { serverDurationMs: 60_000, hannaPlanSnapshot: plan },
      ),
    corrected = score(
      "A Nap nem lehűti, hanem felmelegíti a vizet. Lehűlés után felhő lesz. A csapadék nem tűnik el és visszahullik.",
    ),
    threeClause = score(
      "A Nap felmelegíti a vizet. Lehűlés után felhő lesz. A csapadék nem vész el, hanem visszajut a talajra és a folyókba.",
    ),
    modifiedSubject = score(
      "A Nap felmelegíti a vizet. Lehűlés után felhő lesz. A lehulló csapadék nem tűnik el, visszahullik a talajra.",
    ),
    frontedContrast = score(
      "Nem a Nap hűti le a vizet, hanem felmelegíti. Lehűlés után felhő lesz. A csapadék nem vész el, hanem visszajut a talajra és a folyókba.",
    ),
    wrong = score(
      "A Nap lehűti a vizet. Lehűlés után felhő lesz. A csapadék nem tűnik el és visszahullik.",
    ),
    inverseWrong = score(
      "A Nap nem felmelegíti a vizet, hanem lehűti. Lehűlés után felhő lesz. A csapadék visszajut a talajra és a folyókba.",
    );

  assert.equal(corrected.metrics.subscales.textImmediate.correct, 3);
  assert.equal(corrected.metrics.subscales.textDelayed.correct, 3);
  assert.ok(
    corrected.metrics.blockResults.every(
      ({ contradictions }) => contradictions === 0,
    ),
  );
  for (const result of [threeClause, modifiedSubject, frontedContrast]) {
    assert.equal(result.metrics.subscales.textImmediate.correct, 3);
    assert.equal(result.metrics.subscales.textDelayed.correct, 3);
    assert.ok(
      result.metrics.blockResults.every(
        ({ contradictions }) => contradictions === 0,
      ),
    );
  }
  assert.equal(wrong.metrics.subscales.textImmediate.correct, 2);
  assert.equal(wrong.metrics.subscales.textDelayed.correct, 2);
  assert.ok(
    wrong.metrics.blockResults.every(
      ({ contradictions }) => contradictions === 1,
    ),
  );
  assert.ok(
    wrong.details
      .filter(({ label }) => label === "A Nap szerepe")
      .every(({ feedback }) => /szerkesztett ellentmondó/.test(feedback ?? "")),
  );
  assert.equal(inverseWrong.metrics.subscales.textImmediate.correct, 2);
  assert.equal(inverseWrong.metrics.subscales.textDelayed.correct, 2);
  assert.ok(
    inverseWrong.metrics.blockResults.every(
      ({ contradictions }) => contradictions === 1,
    ),
  );
});

test("a hanem előtti elutasított alternatíva nem mérgezi a pozitív állítást", () => {
  const settings = { activity: "text", recallMode: "meaning" },
    plan = generateHannaSession(settings, 1),
    value =
      "Nem a tánc hossza, hanem az iránya mutatja a virágok irányát. A tánc hossza jelzi a távolságot. A méhek a táncból találják meg a nektárt.",
    result = scoreHannaAttempt(
      settings,
      1,
      completeAnswer(plan, {
        responses: plan.recallTrials.map((trial) => ({
          trialId: trial.id,
          value,
          rtMs: 800,
          hintLevel: 0,
        })),
      }),
      { serverDurationMs: 60_000, hannaPlanSnapshot: plan },
    );
  assert.equal(plan.sourceTextId, "mehek-tanca");
  assert.equal(result.metrics.subscales.textImmediate.correct, 3);
  assert.equal(result.metrics.subscales.textDelayed.correct, 3);
  assert.ok(
    result.metrics.blockResults.every(
      ({ contradictions }) => contradictions === 0,
    ),
  );
});

test("az explicit contradiction minden kritikus tartalmi tokent megkövetel", () => {
  const settings = { activity: "text", recallMode: "meaning" },
    plan = generateHannaSession(settings, 2),
    score = (value) =>
      scoreHannaAttempt(
        settings,
        2,
        completeAnswer(plan, {
          responses: plan.recallTrials.map((trial) => ({
            trialId: trial.id,
            value,
            rtMs: 800,
            hintLevel: 0,
          })),
        }),
        { serverDurationMs: 60_000, hannaPlanSnapshot: plan },
      ),
    correct = score(
      "A mag vizet vesz fel és megindul a csírázás. Nem a hajtás, hanem a gyökér bújik elő először és lefelé nő. A levelek tápanyagot készítenek.",
    ),
    wrong = score(
      "A mag vizet vesz fel és megindul a csírázás. Először a virág bújik elő. A levelek tápanyagot készítenek.",
    );

  assert.equal(plan.sourceTextId, "csirazas");
  assert.equal(correct.metrics.subscales.textImmediate.correct, 3);
  assert.equal(correct.metrics.subscales.textDelayed.correct, 3);
  assert.ok(
    correct.metrics.blockResults.every(
      ({ contradictions }) => contradictions === 0,
    ),
  );
  assert.equal(wrong.metrics.subscales.textImmediate.correct, 2);
  assert.equal(wrong.metrics.subscales.textDelayed.correct, 2);
  assert.ok(
    wrong.metrics.blockResults.every(
      ({ contradictions }) => contradictions === 1,
    ),
  );
});

test("a rubrikacímke átrendezve sem fedheti a pontozó 75 százalékos tokenmintát", () => {
  assert.throws(
    () => normalizeHannaResource("material", {
      text: "A Nap felmelegíti a vizet.",
      rubric: [
        {
          id: "sun-reordered",
          label: "Felmelegíti a vizet a Nap",
          accepted: ["a nap felmelegíti a vizet"],
        },
      ],
    }),
    /nem tartalmazhatja a teljes választ/,
  );
});

test("a review intervallum az eseményből számolt effektív legnagyobb hintet használja", () => {
  const settings = { activity: "review", reviewSnapshot: reviewSnapshot() },
    plan = generateHannaSession(settings, 915),
    answer = completeAnswer(plan, { rtMs: 900 });
  answer.events = [
    {
      eventId: "show-scoped",
      type: "show-answer",
      atMs: 100,
      trialId: plan.recallTrials[0].id,
    },
  ];
  const result = scoreHannaAttempt(settings, 915, answer, {
    serverDurationMs: 60_000,
    hannaPlanSnapshot: plan,
  });
  assert.equal(result.metrics.reviewOutcomes[0].hintLevel, 4);
  assert.equal(result.metrics.reviewOutcomes[0].nextIntervalMs, 600_000);
  assert.ok(result.metrics.qualityFlags.includes("solution-viewed"));
});

test("az association és concept nem hirdet vagy fogad hatástalan encodingMs választót", () => {
  for (const activity of ["association", "concept"]) {
    assert.ok(
      !hannaActivityCapabilities(activity).activeSettings.includes("encodingMs"),
    );
    assert.throws(
      () => normalizeHannaSettings({ activity, encodingMs: 5_000 }),
      /encodingMs/,
    );
    assert.equal(normalizeHannaSettings({ activity }).encodingMs, 0);
  }
});

test("az association minden round review-jelöltje hordoz connection provenance-ot az aktivált-first deduphoz", () => {
  const plan = generateHannaSession(
      { activity: "association", itemCount: 3, associationMs: 30_000 },
      916,
    ),
    rounds = plan.encodingSteps[0].rounds;
  assert.equal(plan.reviewItems.length, rounds.length);
  assert.ok(
    plan.reviewItems.every(
      (item, index) =>
        item.activationRoundId === rounds[index].id &&
        item.connectionId === rounds[index].connectionId &&
        item.repeatIndex === rounds[index].repeatIndex &&
        item.repeatExposure === rounds[index].repeatExposure,
    ),
  );
  const activated = new Set([rounds[3].id, rounds[4].id, rounds[5].id]),
    selected = plan.reviewItems
      .filter(({ activationRoundId }) => activated.has(activationRoundId))
      .filter(
        (item, index, list) =>
          list.findIndex(
            ({ connectionId }) => connectionId === item.connectionId,
          ) === index,
      );
  assert.deepEqual(
    selected.map(({ activationRoundId }) => activationRoundId),
    [rounds[3].id, rounds[4].id, rounds[5].id],
  );
});

test("az irreális encoding duration sebességértéke null és külön minőségjelzést kap", () => {
  for (const activity of ["baseline", "numbers"]) {
    const plan = generateHannaSession({ activity }, 917),
      answer = completeAnswer(plan);
    answer.encodingDurationMs = 1;
    const result = scoreHannaAttempt(plan.settings, 917, answer, {
      serverDurationMs: 60_000,
      hannaPlanSnapshot: plan,
    });
    assert.equal(result.metrics.dimensions.encodingSpeed.value, null);
    assert.ok(
      result.metrics.qualityFlags.includes("implausible-encoding-duration"),
    );
    if (activity === "numbers")
      assert.equal(result.metrics.subscales.number.digitsPerMinute, null);
  }
});

test("a peg beállításösszegzés külön mutatja a memóriahorog-csoportot és a teljes listát", () => {
  assert.match(
    describeHannaSettings({ activity: "peg", itemCount: 100, trainingSize: 10 }),
    /10\/100 memóriahorog/,
  );

  const firstPlan = generateHannaSession(
      { activity: "peg", itemCount: 100, trainingSize: 10 },
      918,
    ),
    trainingMastery = {
      scopeKey: firstPlan.training.scopeKey,
      items: firstPlan.training.items.slice(0, 95).map(({ id }) => ({
        itemId: id,
        directions: ["forward", "reverse"],
        bestRtMs: 900,
        mastered: true,
      })),
    },
    finalSettings = {
      activity: "peg",
      itemCount: 100,
      trainingSize: 10,
      trainingMastery,
    },
    finalPlan = generateHannaSession(finalSettings, 918);
  assert.equal(finalPlan.training.coverage.testedIds.length, 5);
  assert.equal(finalPlan.content.length, 5);
  assert.match(describeHannaSettings(finalSettings), /5\/100 memóriahorog/);
});

test("a route-tour és major-code referencia nem kap per-item encoding időkorlátot", () => {
  const loci = generateHannaSession(
      { activity: "loci", itemCount: 5, encodingMs: 5_000 },
      919,
    ),
    major = generateHannaSession(
      { activity: "major", encodingMs: 5_000 },
      919,
    ),
    majorWords = major.encodingSteps.filter(
      ({ kind }) => kind === "major-word",
    );
  assert.equal(
    loci.encodingSteps.find(({ kind }) => kind === "route-tour").durationMs,
    undefined,
  );
  assert.ok(
    loci.encodingSteps
      .filter(({ kind }) => kind === "loci-place")
      .every(({ durationMs }) => durationMs === 5_000),
  );
  assert.equal(
    major.encodingSteps.find(({ kind }) => kind === "major-code").durationMs,
    undefined,
  );
  assert.ok(majorWords.length > 0);
  assert.ok(majorWords.every(({ durationMs }) => durationMs === 5_000));
});
test("minden beépített szöveg saját teljes szövege felidézésként elfogadható", () => {
  const seen = new Set();
  for (let seed = 0; seed < 40; seed += 1) {
    const settings = { activity: "text", recallMode: "meaning" },
      plan = generateHannaSession(settings, seed);
    if (seen.has(plan.sourceTextId)) continue;
    seen.add(plan.sourceTextId);
    const source = HANNA_TEXTS.find(({ id }) => id === plan.sourceTextId),
      values = [
        source.text,
        ...(source.id === "mehek-tanca"
          ? [
              "A virágok irányát a Naphoz képest a tánc iránya mutatja. A távolságról a mozgás hossza ad információt. A többi méh a tánc alapján találhatja meg a nektárforrást.",
            ]
          : []),
      ];
    for (const value of values) {
      const answer = completeAnswer(plan, {
          responses: plan.recallTrials.map((trial) => ({
            trialId: trial.id,
            value,
            rtMs: 800,
            hintLevel: 0,
          })),
        }),
        result = scoreHannaAttempt(settings, seed, answer, {
          serverDurationMs: 60_000,
          hannaPlanSnapshot: plan,
        });
      assert.equal(
        result.metrics.subscales.textImmediate.correct,
        source.rubric.length,
        source.id,
      );
      assert.equal(
        result.metrics.subscales.textDelayed.correct,
        source.rubric.length,
        source.id,
      );
    }
  }
  assert.equal(seen.size, HANNA_TEXTS.length);
});

test("a kevert felismerés nem teszi assisted címkéjűvé a segítség nélküli önálló felidézést", () => {
  const plan = generateHannaSession(
      { activity: "chain", itemCount: 5 },
      920,
    ),
    answer = completeAnswer(plan),
    score = (rawAnswer) =>
      scoreHannaAttempt(plan.settings, 920, rawAnswer, {
        serverDurationMs: 60_000,
        hannaPlanSnapshot: plan,
      }),
    unassisted = score(answer);
  assert.ok(unassisted.metrics.assistedCorrect > 0);
  assert.deepEqual(unassisted.metrics.dimensions.strategyIndependence, {
    value: 1,
    unit: "ratio",
    evidence: "independent",
  });

  const independentTrial = plan.recallTrials.find(
      ({ accessMode }) => accessMode !== "choice",
    ),
    assistedAnswer = clone(answer),
    assistedResponse = assistedAnswer.responses.find(
      ({ trialId }) => trialId === independentTrial.id,
    );
  assistedResponse.hintLevel = 1;
  assert.equal(
    score(assistedAnswer).metrics.dimensions.strategyIndependence.evidence,
    "assisted",
  );
});

test("a choice-only adaptáció pontosság alapján változik önállósági állítás nélkül", () => {
  const settings = {
      activity: "association",
      itemCount: 6,
      recallMode: "choice",
      adaptive: true,
    },
    plan = generateHannaSession(settings, 921),
    score = (answer) =>
      scoreHannaAttempt(settings, 921, answer, {
        serverDurationMs: 60_000,
        hannaPlanSnapshot: plan,
      }),
    perfect = score(completeAnswer(plan)),
    wrongAnswer = completeAnswer(plan);
  wrongAnswer.responses = wrongAnswer.responses.map((response) => ({
    ...response,
    value: "",
  }));
  const wrong = score(wrongAnswer);

  assert.equal(perfect.percent, 100);
  assert.equal(perfect.metrics.independentEligibleTotal, 0);
  assert.equal(perfect.metrics.dimensions.strategyIndependence, null);
  assert.equal(
    perfect.metrics.adaptation.reason,
    "Következő beállítás: pontos választásos felismerés.",
  );
  assert.ok(perfect.metrics.adaptation.nextItemCount > settings.itemCount);

  assert.equal(wrong.percent, 0);
  assert.ok(wrong.metrics.adaptation.nextItemCount < settings.itemCount);
  assert.equal(
    wrong.metrics.adaptation.reason,
    "Következő beállítás: sok hibás vagy kihagyott egység.",
  );
});
