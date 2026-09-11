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
} from "./content-v2.js";

const UINT32_MAX = 0xffffffff;
const MAX_PAYLOAD_BYTES = 1_000_000;
const MAX_TEXT = 10_000;
const MAX_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_PLAUSIBLE_RT_MS = 80;
const INTERVALS = Object.freeze([
  600_000, 3_600_000, 86_400_000, 259_200_000, 604_800_000, 1_209_600_000,
  2_592_000_000,
]);
const ACTIVITIES = Object.freeze(HANNA_ACTIVITIES.map(({ id }) => id));
const ACTIVITY_BY_ID = Object.freeze(
  Object.fromEntries(HANNA_ACTIVITIES.map((entry) => [entry.id, entry])),
);
const DIFFICULTIES = Object.freeze([
  "beginner",
  "easy",
  "normal",
  "hard",
  "expert",
]);
const EVENT_TYPES = Object.freeze([
  "start",
  "complete",
  "pause",
  "resume",
  "visibility",
  "restart",
  "hint",
  "show-answer",
  "phase",
  "encoding-commit",
  "association-choice",
  "association-time",
  "recall-response",
  "location-select",
  "gate-prepare",
  "gate-ready",
]);
const CONTENT_LEVELS = Object.freeze([
  "concrete",
  "mixed",
  "abstract",
  "definition",
  "material",
  "noun",
  "verb",
  "adjective",
]);
const LEVELS_BY_ACTIVITY = Object.freeze({
  baseline: ["concrete"],
  chain: ["concrete", "mixed", "abstract", "definition", "material"],
  association: ["concrete", "mixed", "abstract", "material"],
  loci: ["concrete"],
  palace: ["concrete"],
  peg: ["concrete"],
  faces: ["concrete"],
  keyword: ["noun", "verb", "adjective", "abstract", "mixed", "material"],
  major: ["concrete"],
  numbers: ["concrete"],
  random: ["concrete"],
  text: ["concrete", "material"],
  concept: ["abstract", "definition", "material"],
  review: ["concrete"],
  boss: ["mixed"],
});
const COUNT_RULES = Object.freeze({
  baseline: { min: 3, max: 10, steps: [3, 5, 7, 10] },
  chain: { min: 5, max: 40, steps: [5, 8, 10, 15, 20, 30, 40] },
  association: { min: 3, max: 12, steps: [3, 4, 6, 8, 10, 12] },
  loci: { min: 5, max: 30, steps: [5, 8, 10, 15, 20, 30] },
  palace: { min: 5, max: 30, steps: [5, 8, 10, 15, 20, 30] },
  peg: { min: 10, max: 100, steps: [10, 20, 100] },
  faces: { min: 3, max: 24, steps: [3, 5, 8, 12, 16, 20, 24] },
  keyword: { min: 3, max: 20, steps: [3, 5, 8, 12, 16, 20] },
  major: { min: 10, max: 10, steps: [10] },
  numbers: { min: 8, max: 30, steps: [8, 16, 20, 30] },
  random: { min: 3, max: 100, steps: [3, 5, 8, 10, 20, 30, 100] },
  text: { min: 1, max: 1, steps: [1] },
  concept: { min: 3, max: 20, steps: [3, 5, 8, 12, 16, 20] },
  review: { min: 1, max: 50, steps: [1, 5, 10, 20, 50] },
  boss: { min: 4, max: 4, steps: [4] },
});
const DEFAULT_INDEX = Object.freeze({
  beginner: 0,
  easy: 1,
  normal: 2,
  hard: 3,
  expert: 4,
});
const STOPWORDS = new Set([
  "a",
  "az",
  "egy",
  "es",
  "vagy",
  "hogy",
  "majd",
  "is",
  "aki",
  "ami",
  "ezt",
  "azt",
  "fel",
  "le",
  "be",
  "ki",
  "el",
  "meg",
  "sajat",
  "szerint",
]);

function invalid(message) {
  throw new TypeError(`Hibás Hanna V2-adat: ${message}`);
}
function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}
function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}
function allowedObject(value, keys, label) {
  if (!isObject(value)) invalid(`${label} objektum legyen`);
  const allowed = new Set(keys);
  if (Object.keys(value).some((key) => !allowed.has(key)))
    invalid(`${label} ismeretlen mezőt tartalmaz`);
  return value;
}
function integer(value, label, min, max) {
  const parsed =
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max)
    invalid(`${label} ${min} és ${max} közötti egész legyen`);
  return parsed;
}
function numberValue(value, label, min, max) {
  const parsed =
    typeof value === "string" && value.trim() ? Number(value) : value;
  if (!Number.isFinite(parsed) || parsed < min || parsed > max)
    invalid(`${label} ${min} és ${max} közötti szám legyen`);
  return parsed;
}
function textValue(value, label, { min = 1, max = 500 } = {}) {
  if (typeof value !== "string") invalid(`${label} szöveg legyen`);
  const result = value.trim();
  if (result.length < min || result.length > max)
    invalid(`${label} hossza ${min}–${max} karakter legyen`);
  return result;
}
function optionalId(value, label) {
  return value === undefined
    ? undefined
    : textValue(value, label, { min: 1, max: 160 });
}
function booleanValue(value, fallback, label) {
  if (value === undefined || value === null || value === "") return fallback;
  if (value === true || value === false) return value;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  invalid(`${label} logikai érték legyen`);
}
function enumValue(value, allowed, label) {
  if (!allowed.includes(value)) invalid(`${label} nem támogatott`);
  return value;
}
function uniqueStrings(value, label, { max = 100 } = {}) {
  const source =
    typeof value === "string"
      ? value
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
      : value;
  if (!Array.isArray(source) || source.length > max)
    invalid(`${label} legfeljebb ${max} elemű lista legyen`);
  const result = source.map((entry, index) =>
    textValue(entry, `${label}[${index}]`, { max: 160 }),
  );
  if (new Set(result).size !== result.length)
    invalid(`${label} ne tartalmazzon ismétlést`);
  return result;
}
function isoValue(value, label) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)))
    invalid(`${label} érvényes ISO-időpont legyen`);
  return new Date(value).toISOString();
}
function normalizedText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("hu-HU")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
function tokens(value) {
  return normalizedText(value)
    .split(" ")
    .filter((token) => token && !STOPWORDS.has(token));
}
function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b),
    middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}
function plausibleEncodingDuration(durationMs, itemCount) {
  return (
    durationMs > 0 &&
    itemCount > 0 &&
    durationMs >= itemCount * MIN_PLAUSIBLE_RT_MS
  );
}
function seededRandom(seed) {
  let state = integer(seed, "seed", 0, UINT32_MAX) >>> 0;
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
function sample(values, count, rng) {
  if (count > values.length)
    invalid("nincs elég különböző tartalmi elem ehhez a körhöz");
  return shuffle(values, rng).slice(0, count);
}
function sampleForSettings(values, count, settings, rng) {
  if (settings.similarity !== "similar") return sample(values, count, rng);
  const groups = new Map();
  for (const item of values) {
    const key =
        item.category ?? item.level ?? (item.meaning ? "concept" : "item"),
      group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  const eligible = [...groups.values()].filter(
    (group) => group.length >= count,
  );
  return sample(
    eligible.length ? eligible[Math.floor(rng() * eligible.length)] : values,
    count,
    rng,
  );
}
function nearestStep(steps, value) {
  return steps.reduce(
    (best, current) =>
      Math.abs(current - value) < Math.abs(best - value) ? current : best,
    steps[0],
  );
}
function difficultyDefault(activity, difficulty) {
  const steps = COUNT_RULES[activity].steps;
  if (activity === "review" && difficulty === "beginner") return 5;
  return steps[Math.min(steps.length - 1, DEFAULT_INDEX[difficulty])];
}
function visual(type, key, extra = {}) {
  return { type, key, ...extra };
}
function hints(anchor, association, visualHint) {
  return [
    anchor || "Idézd fel a saját helyet vagy horgot.",
    association || "Idézd fel a saját kapcsolatodat.",
    visualHint || "Használd a vizuális kapaszkodót.",
  ];
}
function stripPrivateRubric(rubric) {
  return rubric?.map(({ id, label }) => ({ id, label }));
}
function publicResource(resource) {
  const result = clone(resource);
  if (result?.kind === "material" && result.data?.rubric)
    result.data.rubric = stripPrivateRubric(result.data.rubric);
  return result;
}
function publicSettings(settings) {
  const result = clone(settings);
  result.resourceSnapshot = result.resourceSnapshot.map(publicResource);
  if (result.reviewSnapshot)
    result.reviewSnapshot = result.reviewSnapshot.map((entry) => {
      const copy = clone(entry);
      delete copy.accepted;
      delete copy.contradictions;
      if (copy.rubric) copy.rubric = stripPrivateRubric(copy.rubric);
      if (copy.encoding)
        copy.encoding = copy.encoding.map(
          ({ association, checks, ...metadata }) => metadata,
        );
      return copy;
    });
  return result;
}

function normalizeVisual(value, label) {
  if (value === undefined) return undefined;
  allowedObject(
    value,
    [
      "type",
      "key",
      "label",
      "variant",
      "parts",
      "action",
      "zone",
      "position",
      "number",
      "symbol",
      "roomId",
      "roomPosition",
      "routePosition",
    ],
    label,
  );
  const result = {
    type: enumValue(
      value.type,
      ["object", "concept", "portrait", "location", "scene", "number"],
      `${label}.type`,
    ),
    key: textValue(value.key, `${label}.key`, { max: 160 }),
  };
  for (const key of ["label", "variant", "action", "symbol", "roomId"])
    if (value[key] !== undefined)
      result[key] = textValue(value[key], `${label}.${key}`, { max: 300 });
  for (const key of [
    "zone",
    "position",
    "number",
    "roomPosition",
    "routePosition",
  ])
    if (value[key] !== undefined)
      result[key] = integer(value[key], `${label}.${key}`, 0, 1000);
  if (value.parts !== undefined) {
    if (!Array.isArray(value.parts) || value.parts.length > 10)
      invalid(`${label}.parts legfeljebb 10 elemű lista legyen`);
    result.parts = value.parts.map((part, index) => {
      allowedObject(part, ["role", "key", "label"], `${label}.parts[${index}]`);
      return {
        role: textValue(part.role, `${label}.parts[${index}].role`, {
          max: 40,
        }),
        key: textValue(part.key, `${label}.parts[${index}].key`, { max: 160 }),
        ...(part.label !== undefined
          ? {
              label: textValue(part.label, `${label}.parts[${index}].label`, {
                max: 200,
              }),
            }
          : {}),
      };
    });
  }
  return result;
}
function normalizeRubric(value, label, { allowEmpty = false } = {}) {
  if (
    !Array.isArray(value) ||
    (allowEmpty ? value.length < 0 : value.length < 1) ||
    value.length > 100
  )
    invalid(`${label} ${allowEmpty ? "0" : "1"}–100 elemű lista legyen`);
  const ids = new Set();
  return value.map((entry, index) => {
    allowedObject(
      entry,
      ["id", "label", "accepted", "contradictions"],
      `${label}[${index}]`,
    );
    const id = textValue(entry.id, `${label}[${index}].id`, { max: 100 });
    if (ids.has(id)) invalid(`${label} azonosítói legyenek egyediek`);
    ids.add(id);
    const accepted =
        entry.accepted === undefined
          ? []
          : uniqueStrings(entry.accepted, `${label}[${index}].accepted`, {
              max: 30,
            }),
      contradictions =
        entry.contradictions === undefined
          ? []
          : uniqueStrings(
              entry.contradictions,
              `${label}[${index}].contradictions`,
              { max: 30 },
            );
    const rubricLabel = textValue(
      entry.label,
      `${label}[${index}].label`,
      { max: 300 },
    );
    if (accepted.some((phrase) => phraseMatch(rubricLabel, phrase)))
      invalid(`${label}[${index}].label nem tartalmazhatja a teljes választ`);
    return {
      id,
      label: rubricLabel,
      ...(accepted.length ? { accepted } : {}),
      ...(contradictions.length ? { contradictions } : {}),
    };
  });
}
function normalizeContentItem(entry, index, label = "content") {
  allowedObject(
    entry,
    [
      "id",
      "kind",
      "label",
      "meaning",
      "keyword",
      "fact",
      "category",
      "code",
      "peg",
      "position",
      "location",
      "locationId",
      "anchorId",
      "portraitId",
      "trait",
      "story",
      "visual",
    ],
    `${label}[${index}]`,
  );
  const result = {
    id: textValue(entry.id, `${label}[${index}].id`, { max: 160 }),
    kind: enumValue(
      entry.kind,
      ["word", "picture", "digit", "face", "concept", "keyword", "text"],
      `${label}[${index}].kind`,
    ),
    label: textValue(entry.label, `${label}[${index}].label`, { max: 500 }),
  };
  for (const key of [
    "meaning",
    "keyword",
    "fact",
    "category",
    "code",
    "location",
    "locationId",
    "anchorId",
    "portraitId",
    "trait",
    "story",
  ])
    if (entry[key] !== undefined)
      result[key] = textValue(entry[key], `${label}[${index}].${key}`, {
        max: key === "meaning" || key === "story" ? 1200 : 500,
      });
  if (entry.peg !== undefined)
    result.peg = integer(entry.peg, `${label}[${index}].peg`, 1, 100);
  if (entry.position !== undefined)
    result.position = integer(
      entry.position,
      `${label}[${index}].position`,
      1,
      100,
    );
  if (entry.visual !== undefined)
    result.visual = normalizeVisual(entry.visual, `${label}[${index}].visual`);
  return result;
}

export function normalizeHannaResource(kind, data) {
  enumValue(kind, ["palace", "peg", "major", "material"], "kind");
  if (kind === "palace") {
    allowedObject(data, ["locations"], "palace.data");
    if (
      !Array.isArray(data.locations) ||
      data.locations.length < 5 ||
      data.locations.length > 30
    )
      invalid("palace.locations 5–30 elemű lista legyen");
    const ids = new Set();
    let photoBytes = 0;
    const locations = data.locations.map((entry, index) => {
      allowedObject(
        entry,
        ["id", "name", "description", "photo"],
        "locations elem",
      );
      const id = textValue(entry.id, `locations[${index}].id`, { max: 100 });
      if (ids.has(id)) invalid("a helyazonosítók legyenek egyediek");
      ids.add(id);
      let photo;
      if (entry.photo !== undefined) {
        photo = textValue(entry.photo, `locations[${index}].photo`, {
          max: 280_000,
        });
        const match = photo.match(
          /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/,
        );
        if (!match) invalid("a photo csak JPG, PNG vagy WebP data URL lehet");
        const bytes =
          Math.floor((match[2].length * 3) / 4) -
          (match[2].endsWith("==") ? 2 : match[2].endsWith("=") ? 1 : 0);
        if (bytes > 200_000) invalid("egy palotafotó legfeljebb 200 KB lehet");
        photoBytes += bytes;
      }
      return {
        id,
        name: textValue(entry.name, `locations[${index}].name`, { max: 120 }),
        description: textValue(
          entry.description ?? "",
          `locations[${index}].description`,
          { min: 0, max: 500 },
        ),
        ...(photo ? { photo } : {}),
      };
    });
    if (photoBytes > 1_000_000)
      invalid("a palotafotók összesen legfeljebb 1 MB méretűek lehetnek");
    return deepFreeze({ locations });
  }
  if (kind === "peg") {
    allowedObject(data, ["entries"], "peg.data");
    if (
      !Array.isArray(data.entries) ||
      data.entries.length < 5 ||
      data.entries.length > 100
    )
      invalid("peg.entries 5–100 elemű lista legyen");
    const entries = data.entries.map((entry, index) => {
      allowedObject(entry, ["number", "label"], "peg entry");
      const number = integer(entry.number, `entries[${index}].number`, 1, 100);
      if (number !== index + 1)
        invalid(
          "a peg-lista 1-től induló, egymást követő sorszámokat használjon",
        );
      return {
        number,
        label: textValue(entry.label, `entries[${index}].label`, { max: 120 }),
      };
    });
    if (
      new Set(entries.map(({ label }) => normalizedText(label))).size !==
      entries.length
    )
      invalid("a peg-címkék legyenek egyediek");
    return deepFreeze({ entries });
  }
  if (kind === "major") {
    allowedObject(data, ["entries"], "major.data");
    if (
      !Array.isArray(data.entries) ||
      data.entries.length < 1 ||
      data.entries.length > 100
    )
      invalid("major.entries 1–100 elemű lista legyen");
    const codes = new Set();
    const entries = data.entries.map((entry, index) => {
      allowedObject(entry, ["code", "label"], "major entry");
      const code = textValue(entry.code, `entries[${index}].code`, { max: 2 });
      if (!/^\d{2}$/.test(code) || codes.has(code))
        invalid("a Major-kód két különböző számjegy legyen");
      codes.add(code);
      return {
        code,
        label: textValue(entry.label, `entries[${index}].label`, { max: 120 }),
      };
    });
    return deepFreeze({ entries });
  }
  allowedObject(data, ["items", "text", "rubric"], "material.data");
  const items =
    data.items === undefined
      ? []
      : (() => {
          if (!Array.isArray(data.items) || data.items.length > 100)
            invalid("material.items legfeljebb 100 elemű lista legyen");
          const ids = new Set();
          return data.items.map((entry, index) => {
            allowedObject(
              entry,
              ["id", "label", "meaning", "keyword", "category"],
              "material item",
            );
            const id = textValue(entry.id, `items[${index}].id`, { max: 100 });
            if (ids.has(id)) invalid("a material itemId-k legyenek egyediek");
            ids.add(id);
            return {
              id,
              label: textValue(entry.label, `items[${index}].label`, {
                max: 500,
              }),
              ...(entry.meaning !== undefined
                ? {
                    meaning: textValue(
                      entry.meaning,
                      `items[${index}].meaning`,
                      { max: 1200 },
                    ),
                  }
                : {}),
              ...(entry.keyword !== undefined
                ? {
                    keyword: textValue(
                      entry.keyword,
                      `items[${index}].keyword`,
                      { max: 500 },
                    ),
                  }
                : {}),
              ...(entry.category !== undefined
                ? {
                    category: textValue(
                      entry.category,
                      `items[${index}].category`,
                      { max: 100 },
                    ),
                  }
                : {}),
            };
          });
        })();
  const text =
    data.text === undefined
      ? undefined
      : textValue(data.text, "material.text", { max: MAX_TEXT });
  const rubric =
    data.rubric === undefined
      ? undefined
      : normalizeRubric(data.rubric, "material.rubric");
  if (!items.length && !text)
    invalid("a material erőforráshoz items vagy text szükséges");
  return deepFreeze({
    items,
    ...(text ? { text } : {}),
    ...(rubric ? { rubric } : {}),
  });
}

function normalizeResourceSnapshot(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 20)
    invalid("resourceSnapshot legfeljebb 20 elemű lista legyen");
  const ids = new Set();
  return value.map((entry, index) => {
    allowedObject(
      entry,
      [
        "id",
        "kind",
        "title",
        "revision",
        "data",
        "ready",
        "createdAt",
        "updatedAt",
      ],
      "resourceSnapshot elem",
    );
    const id = textValue(entry.id, `resourceSnapshot[${index}].id`, {
      max: 120,
    });
    if (ids.has(id)) invalid("a resourceSnapshot azonosítói legyenek egyediek");
    ids.add(id);
    const kind = enumValue(
      entry.kind,
      ["palace", "peg", "major", "material"],
      `resourceSnapshot[${index}].kind`,
    );
    return {
      id,
      kind,
      title: textValue(entry.title ?? id, `resourceSnapshot[${index}].title`, {
        max: 200,
      }),
      revision: integer(
        entry.revision ?? 1,
        `resourceSnapshot[${index}].revision`,
        1,
        1_000_000,
      ),
      data: clone(normalizeHannaResource(kind, entry.data)),
      ready: entry.ready === true,
      ...(entry.createdAt
        ? { createdAt: isoValue(entry.createdAt, "createdAt") }
        : {}),
      ...(entry.updatedAt
        ? { updatedAt: isoValue(entry.updatedAt, "updatedAt") }
        : {}),
    };
  });
}
function normalizeReviewSnapshot(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 50)
    invalid("reviewSnapshot legfeljebb 50 elemű lista legyen");
  const ids = new Set();
  return value.map((entry, index) => {
    allowedObject(
      entry,
      [
        "id",
        "sourceActivity",
        "sourceItemId",
        "prompt",
        "expected",
        "accepted",
        "contradictions",
        "hints",
        "content",
        "encodingStepIds",
        "activationRoundId",
        "connectionId",
        "repeatIndex",
        "repeatExposure",
        "encoding",
        "rubric",
        "assessment",
        "learnedAt",
        "lastReviewedAt",
        "intervalMs",
      ],
      "reviewSnapshot elem",
    );
    const id = textValue(entry.id, `reviewSnapshot[${index}].id`, { max: 160 });
    if (ids.has(id)) invalid("reviewSnapshot id nem ismétlődhet");
    ids.add(id);
    const expected = Array.isArray(entry.expected)
      ? (() => {
          if (!entry.expected.length)
            invalid("review expected lista nem lehet üres");
          return entry.expected.map((item, itemIndex) =>
            textValue(item, `expected[${itemIndex}]`, { min: 1, max: 500 }),
          );
        })()
      : textValue(entry.expected, "expected", { min: 1, max: MAX_TEXT });
    const content =
      entry.content === undefined
        ? []
        : (() => {
            if (!Array.isArray(entry.content) || entry.content.length > 100)
              invalid("review content legfeljebb 100 elemű lista legyen");
            return entry.content.map((item, itemIndex) =>
              normalizeContentItem(item, itemIndex, "review content"),
            );
          })();
    if (!Array.isArray(entry.hints) || entry.hints.length !== 3)
      invalid("minden review elemhez pontosan három segítség kell");
    if (
      !Array.isArray(entry.encoding ?? []) ||
      (entry.encoding ?? []).length > 200
    )
      invalid("review encoding legfeljebb 200 elemű lista legyen");
    const encodingStepIds = uniqueStrings(
        entry.encodingStepIds ?? [],
        `reviewSnapshot[${index}].encodingStepIds`,
        { max: 200 },
      ),
      contentIds = new Set(content.map(({ id: contentId }) => contentId)),
      encodingSeen = new Set(),
      encoding = (entry.encoding ?? []).map((row, encodingIndex) => {
        allowedObject(
          row,
          [
            "stepId",
            "itemId",
            "association",
            "checks",
            "strategy",
            "choiceId",
            "roundId",
          ],
          "review encoding",
        );
        const stepId = textValue(
            row.stepId,
            `review encoding[${encodingIndex}].stepId`,
            { max: 160 },
          ),
          itemId =
            row.itemId === undefined
              ? undefined
              : textValue(
                  row.itemId,
                  `review encoding[${encodingIndex}].itemId`,
                  { max: 160 },
                ),
          key = `${stepId}|${itemId ?? ""}|${row.roundId ?? ""}`;
        if (!encodingStepIds.includes(stepId))
          invalid("review encoding stepId nincs az encodingStepIds listában");
        if (itemId && !contentIds.has(itemId))
          invalid("review encoding itemId nincs a review contentben");
        if (encodingSeen.has(key))
          invalid("review encoding hivatkozás nem ismétlődhet");
        encodingSeen.add(key);
        const checks = row.checks ?? [];
        if (!Array.isArray(checks) || checks.length > 20)
          invalid("review encoding checks legfeljebb 20 elemű lista legyen");
        return {
          stepId,
          ...(itemId ? { itemId } : {}),
          association:
            row.association === undefined
              ? ""
              : textValue(row.association, "review encoding association", {
                  min: 0,
                  max: 2000,
                }),
          checks: checks.map((check, checkIndex) =>
            textValue(check, `review encoding checks[${checkIndex}]`, {
              max: 100,
            }),
          ),
          ...(row.strategy !== undefined
            ? {
                strategy: textValue(row.strategy, "review encoding strategy", {
                  max: 100,
                }),
              }
            : {}),
          ...(row.choiceId !== undefined
            ? {
                choiceId: textValue(row.choiceId, "review encoding choiceId", {
                  max: 160,
                }),
              }
            : {}),
          ...(row.roundId !== undefined
            ? {
                roundId: textValue(row.roundId, "review encoding roundId", {
                  max: 160,
                }),
              }
            : {}),
        };
      });
    return {
      id,
      sourceActivity: enumValue(
        entry.sourceActivity,
        ACTIVITIES.filter((activity) => activity !== "review"),
        "review sourceActivity",
      ),
      sourceItemId: textValue(entry.sourceItemId ?? id, "review sourceItemId", {
        max: 160,
      }),
      prompt: textValue(entry.prompt, "review prompt", { max: 1200 }),
      expected,
      ...(entry.accepted
        ? {
            accepted: uniqueStrings(entry.accepted, "review accepted", {
              max: 30,
            }),
          }
        : {}),
      ...(entry.contradictions
        ? {
            contradictions: uniqueStrings(
              entry.contradictions,
              "review contradictions",
              { max: 30 },
            ),
          }
        : {}),
      hints: entry.hints.map((hint, hintIndex) =>
        textValue(hint, `hints[${hintIndex}]`, { max: 500 }),
      ),
      content,
      encodingStepIds,
      ...(entry.activationRoundId !== undefined
        ? {
            activationRoundId: textValue(
              entry.activationRoundId,
              "review activationRoundId",
              { max: 160 },
            ),
          }
        : {}),
      ...(entry.connectionId !== undefined
        ? {
            connectionId: textValue(
              entry.connectionId,
              "review connectionId",
              { max: 160 },
            ),
          }
        : {}),
      ...(entry.repeatIndex !== undefined
        ? {
            repeatIndex: integer(
              entry.repeatIndex,
              "review repeatIndex",
              1,
              1000,
            ),
          }
        : {}),
      ...(entry.repeatExposure !== undefined
        ? {
            repeatExposure: booleanValue(
              entry.repeatExposure,
              false,
              "review repeatExposure",
            ),
          }
        : {}),
      encoding,
      ...(entry.rubric
        ? { rubric: normalizeRubric(entry.rubric, "review rubric") }
        : {}),
      assessment:
        entry.assessment === undefined
          ? "rubric"
          : enumValue(
              entry.assessment,
              ["rubric", "verbatim", "exact", "ordered", "set", "digits"],
              "review assessment",
            ),
      learnedAt: isoValue(entry.learnedAt, "review learnedAt"),
      lastReviewedAt: entry.lastReviewedAt
        ? isoValue(entry.lastReviewedAt, "review lastReviewedAt")
        : null,
      intervalMs: integer(
        entry.intervalMs,
        "review intervalMs",
        600_000,
        31_536_000_000,
      ),
    };
  });
}
function normalizeLearnedSnapshot(value) {
  if (value === undefined || value === null) return null;
  allowedObject(
    value,
    [
      "version",
      "sourceActivity",
      "content",
      "encoding",
      "anchors",
      "sourceLabel",
      "learnedAt",
    ],
    "learnedSnapshot",
  );
  if (integer(value.version, "learnedSnapshot.version", 2, 2) !== 2)
    invalid("learnedSnapshot.version csak 2 lehet");
  const content = (() => {
    if (
      !Array.isArray(value.content) ||
      value.content.length < 1 ||
      value.content.length > 100
    )
      invalid("learnedSnapshot.content 1–100 elemű lista legyen");
    const rows = value.content.map((item, index) =>
      normalizeContentItem(item, index, "learnedSnapshot.content"),
    );
    if (new Set(rows.map(({ id }) => id)).size !== rows.length)
      invalid("learnedSnapshot.content id-k legyenek egyediek");
    return rows;
  })();
  if (
    !Array.isArray(value.encoding) ||
    value.encoding.length < 1 ||
    value.encoding.length > 200
  )
    invalid("learnedSnapshot.encoding 1–200 elemű lista legyen");
  const contentIds = new Set(content.map(({ id }) => id)),
    encodingKeys = new Set(),
    encoding = value.encoding.map((entry, index) => {
      allowedObject(
        entry,
        [
          "stepId",
          "itemId",
          "association",
          "checks",
          "hintLevel",
          "strategy",
          "choiceId",
          "roundId",
          "rtMs",
        ],
        "learnedSnapshot.encoding elem",
      );
      let checks;
      if (entry.checks !== undefined) {
        if (!Array.isArray(entry.checks) || entry.checks.length > 20)
          invalid(
            "learnedSnapshot encoding.checks legfeljebb 20 elemű lista legyen",
          );
        checks = entry.checks.map((check, checkIndex) =>
          textValue(check, `encoding[${index}].checks[${checkIndex}]`, {
            max: 100,
          }),
        );
      }
      const stepId = textValue(entry.stepId, `encoding[${index}].stepId`, {
          max: 160,
        }),
        itemId =
          entry.itemId === undefined
            ? undefined
            : textValue(entry.itemId, `encoding[${index}].itemId`, {
                max: 160,
              }),
        roundId =
          entry.roundId === undefined
            ? undefined
            : textValue(entry.roundId, `encoding[${index}].roundId`, {
                max: 160,
              }),
        key = `${stepId}|${itemId ?? ""}|${roundId ?? ""}`;
      if (itemId && !contentIds.has(itemId))
        invalid("learnedSnapshot encoding.itemId nincs a contentben");
      if (encodingKeys.has(key))
        invalid("learnedSnapshot encoding hivatkozás nem ismétlődhet");
      encodingKeys.add(key);
      return {
        stepId,
        ...(itemId ? { itemId } : {}),
        ...(entry.association !== undefined
          ? {
              association: textValue(
                entry.association,
                `encoding[${index}].association`,
                { min: 0, max: 2000 },
              ),
            }
          : {}),
        ...(checks ? { checks } : {}),
        ...(entry.hintLevel !== undefined
          ? {
              hintLevel: integer(
                entry.hintLevel,
                `encoding[${index}].hintLevel`,
                0,
                4,
              ),
            }
          : {}),
        ...(entry.strategy !== undefined
          ? {
              strategy: textValue(
                entry.strategy,
                `encoding[${index}].strategy`,
                {
                  max: 100,
                },
              ),
            }
          : {}),
        ...(entry.choiceId !== undefined
          ? {
              choiceId: textValue(
                entry.choiceId,
                `encoding[${index}].choiceId`,
                {
                  max: 160,
                },
              ),
            }
          : {}),
        ...(roundId ? { roundId } : {}),
        ...(entry.rtMs !== undefined
          ? {
              rtMs: numberValue(
                entry.rtMs,
                `encoding[${index}].rtMs`,
                0,
                MAX_DURATION_MS,
              ),
            }
          : {}),
      };
    });
  if (
    !Array.isArray(value.anchors) ||
    value.anchors.length < 1 ||
    value.anchors.length > 100
  )
    invalid("learnedSnapshot.anchors 1–100 elemű lista legyen");
  const anchorIds = new Set(),
    anchorPositions = new Set(),
    anchors = value.anchors.map((entry, index) => {
      allowedObject(
        entry,
        ["id", "label", "visual", "position", "kind"],
        "learnedSnapshot anchor",
      );
      const id = textValue(entry.id, `anchors[${index}].id`, { max: 160 }),
        position =
          entry.position === undefined
            ? undefined
            : integer(entry.position, `anchors[${index}].position`, 1, 100);
      if (anchorIds.has(id))
        invalid("learnedSnapshot anchor id nem ismétlődhet");
      anchorIds.add(id);
      if (position !== undefined && anchorPositions.has(position))
        invalid("learnedSnapshot anchor position nem ismétlődhet");
      if (position !== undefined) anchorPositions.add(position);
      return {
        id,
        label: textValue(entry.label, `anchors[${index}].label`, { max: 300 }),
        ...(entry.visual
          ? {
              visual: normalizeVisual(entry.visual, `anchors[${index}].visual`),
            }
          : {}),
        ...(position !== undefined ? { position } : {}),
        ...(entry.kind !== undefined
          ? {
              kind: textValue(entry.kind, `anchors[${index}].kind`, {
                max: 60,
              }),
            }
          : {}),
      };
    });
  for (const item of content)
    if (item.anchorId && !anchorIds.has(item.anchorId))
      invalid("learnedSnapshot content.anchorId nincs az anchors listában");
  return {
    version: 2,
    sourceActivity: enumValue(
      value.sourceActivity,
      ["chain", "loci", "palace", "peg"],
      "learnedSnapshot.sourceActivity",
    ),
    content,
    encoding,
    anchors,
    sourceLabel: textValue(value.sourceLabel, "learnedSnapshot.sourceLabel", {
      max: 300,
    }),
    ...(value.learnedAt
      ? { learnedAt: isoValue(value.learnedAt, "learnedSnapshot.learnedAt") }
      : {}),
  };
}
function normalizeTrainingMastery(value) {
  if (value === undefined || value === null) return null;
  allowedObject(value, ["scopeKey", "items"], "trainingMastery");
  const scopeKey = textValue(value.scopeKey, "trainingMastery.scopeKey", {
    max: 300,
  });
  if (!Array.isArray(value.items) || value.items.length > 100)
    invalid("trainingMastery.items legfeljebb 100 elemű lista legyen");
  const ids = new Set(),
    items = value.items.map((entry, index) => {
      allowedObject(
        entry,
        ["itemId", "directions", "bestRtMs", "mastered"],
        "trainingMastery item",
      );
      const itemId = textValue(
        entry.itemId,
        `trainingMastery.items[${index}].itemId`,
        { max: 160 },
      );
      if (ids.has(itemId)) invalid("trainingMastery itemId nem ismétlődhet");
      ids.add(itemId);
      return {
        itemId,
        directions: uniqueStrings(
          entry.directions ?? [],
          `trainingMastery.items[${index}].directions`,
          { max: 10 },
        ),
        bestRtMs:
          entry.bestRtMs === null || entry.bestRtMs === undefined
            ? null
            : numberValue(entry.bestRtMs, "bestRtMs", 0, MAX_DURATION_MS),
        mastered: entry.mastered === true,
      };
    });
  return { scopeKey, items };
}

function trainingScopeFor(activity, resourceSnapshot) {
  if (activity === "major") {
    const resource = resourceSnapshot.find(({ kind }) => kind === "major");
    return resource
      ? `major:resource:${resource.id}:r${resource.revision}:n${resource.data.entries.length}`
      : "major:hu-v2";
  }
  if (activity === "peg") {
    const resource = resourceSnapshot.find(({ kind }) => kind === "peg");
    return resource
      ? `peg:resource:${resource.id}:r${resource.revision}:n${resource.data.entries.length}`
      : `peg:builtin-v2:n${HANNA_PEGS.length}`;
  }
  if (["loci", "palace"].includes(activity)) {
    const resource = resourceSnapshot.find(({ kind }) => kind === "palace");
    return resource
      ? `route:resource:${resource.id}:r${resource.revision}:n${resource.data.locations.length}`
      : "route:builtin-six-rooms-v3:n30";
  }
  return null;
}

export function hannaTrainingScope(rawSettings = {}) {
  const activity = rawSettings.activity ?? "baseline";
  if (!ACTIVITIES.includes(activity)) invalid("activity nem támogatott");
  const resources = normalizeResourceSnapshot(rawSettings.resourceSnapshot);
  return trainingScopeFor(activity, resources);
}

export function allowedHannaContentLevels(activity) {
  return deepFreeze([
    ...LEVELS_BY_ACTIVITY[enumValue(activity, ACTIVITIES, "activity")],
  ]);
}

const ACTIVITY_CAPABILITIES = Object.freeze({
  baseline: {
    activeSettings: [
      "difficulty",
      "itemCount",
      "encodingMs",
      "delayMs",
      "adaptive",
      "interferenceLevel",
    ],
    recallModes: [],
    fixedRecallPhases: [
      "word-immediate",
      "picture-immediate",
      "digit-immediate",
      "word-delayed",
      "picture-delayed",
      "digit-delayed",
    ],
  },
  chain: {
    activeSettings: [
      "difficulty",
      "itemCount",
      "encodingMs",
      "delayMs",
      "adaptive",
      "contentLevel",
      "similarity",
      "interferenceLevel",
      "reverse",
      "resourceIds",
    ],
    recallModes: [],
    fixedRecallPhases: ["ordered", "free", "random"],
  },
  association: {
    activeSettings: [
      "difficulty",
      "itemCount",
      "delayMs",
      "adaptive",
      "contentLevel",
      "recallMode",
      "associationMs",
      "similarity",
      "interferenceLevel",
      "resourceIds",
    ],
    recallModes: ["free", "choice"],
    fixedRecallPhases: ["encode-pairs", "recall-pairs"],
  },
  loci: {
    activeSettings: [
      "difficulty",
      "itemCount",
      "encodingMs",
      "delayMs",
      "adaptive",
      "interferenceLevel",
      "reverse",
      "resourceIds",
    ],
    recallModes: [],
    fixedRecallPhases: ["forward", "reverse", "random"],
  },
  palace: {
    activeSettings: [
      "difficulty",
      "itemCount",
      "encodingMs",
      "delayMs",
      "adaptive",
      "interferenceLevel",
      "reverse",
      "resourceIds",
    ],
    recallModes: [],
    fixedRecallPhases: ["forward", "reverse", "random"],
  },
  peg: {
    activeSettings: [
      "difficulty",
      "itemCount",
      "encodingMs",
      "delayMs",
      "adaptive",
      "interferenceLevel",
      "reverse",
      "trainingSize",
      "resourceIds",
    ],
    recallModes: [],
    fixedRecallPhases: ["forward", "reverse", "random"],
  },
  faces: {
    activeSettings: [
      "difficulty",
      "itemCount",
      "encodingMs",
      "delayMs",
      "adaptive",
      "recallMode",
      "interferenceLevel",
    ],
    recallModes: ["free", "choice"],
    fixedRecallPhases: ["name", "fact"],
  },
  keyword: {
    activeSettings: [
      "difficulty",
      "itemCount",
      "encodingMs",
      "delayMs",
      "adaptive",
      "contentLevel",
      "recallMode",
      "interferenceLevel",
      "resourceIds",
    ],
    recallModes: ["free", "reverse"],
    fixedRecallPhases: ["forward", "reverse"],
  },
  major: {
    activeSettings: [
      "difficulty",
      "encodingMs",
      "delayMs",
      "adaptive",
      "recallMode",
      "interferenceLevel",
      "resourceIds",
    ],
    recallModes: ["random", "reverse"],
    fixedRecallPhases: ["number-to-word", "word-to-number"],
  },
  numbers: {
    activeSettings: [
      "difficulty",
      "itemCount",
      "encodingMs",
      "delayMs",
      "adaptive",
      "interferenceLevel",
      "resourceIds",
    ],
    recallModes: [],
    fixedRecallPhases: ["delayed-digits"],
  },
  random: {
    activeSettings: [
      "difficulty",
      "adaptive",
      "recallMode",
      "sourceResultId",
    ],
    recallModes: ["random", "choice"],
    fixedRecallPhases: ["nth", "before", "after", "positions", "category"],
  },
  text: {
    activeSettings: [
      "difficulty",
      "encodingMs",
      "delayMs",
      "adaptive",
      "contentLevel",
      "recallMode",
      "interferenceLevel",
      "resourceIds",
    ],
    recallModes: ["meaning", "verbatim"],
    fixedRecallPhases: ["immediate", "restudy", "delayed"],
  },
  concept: {
    activeSettings: [
      "difficulty",
      "itemCount",
      "delayMs",
      "adaptive",
      "contentLevel",
      "interferenceLevel",
      "resourceIds",
    ],
    recallModes: [],
    fixedRecallPhases: ["imagine", "own-symbol", "meaning"],
  },
  review: {
    activeSettings: ["difficulty", "itemCount", "adaptive", "reviewIds"],
    recallModes: [],
    fixedRecallPhases: ["due-recall"],
  },
  boss: {
    activeSettings: [
      "difficulty",
      "encodingMs",
      "delayMs",
      "adaptive",
      "interferenceLevel",
      "resourceIds",
    ],
    recallModes: [],
    fixedRecallPhases: ["list", "face", "number", "concept"],
  },
});

export function hannaActivityCapabilities(activity) {
  const id = enumValue(activity, ACTIVITIES, "activity");
  return deepFreeze(clone(ACTIVITY_CAPABILITIES[id]));
}

export function normalizeHannaSettings(raw = {}) {
  let bytes;
  try {
    bytes = new TextEncoder().encode(JSON.stringify(raw)).length;
  } catch {
    invalid("settings nem szerializálható");
  }
  if (bytes > MAX_PAYLOAD_BYTES)
    invalid("settings payload legfeljebb 1 MB lehet");
  allowedObject(
    raw,
    [
      "hannaVersion",
      "activity",
      "difficulty",
      "itemCount",
      "encodingMs",
      "delayMs",
      "recallMode",
      "reverse",
      "adaptive",
      "contentLevel",
      "resourceIds",
      "customContent",
      "resourceSnapshot",
      "reviewIds",
      "reviewSnapshot",
      "associationMs",
      "trainingSize",
      "similarity",
      "interferenceLevel",
      "sourceResultId",
      "learnedSnapshot",
      "trainingMastery",
    ],
    "settings",
  );
  const hannaVersion = integer(raw.hannaVersion ?? 2, "hannaVersion", 2, 2),
    activity = enumValue(raw.activity ?? "baseline", ACTIVITIES, "activity"),
    difficulty = enumValue(
      raw.difficulty ?? "beginner",
      DIFFICULTIES,
      "difficulty",
    ),
    rule = COUNT_RULES[activity];
  const hasResourceReference =
      (Array.isArray(raw.resourceIds) && raw.resourceIds.length > 0) ||
      (Array.isArray(raw.resourceSnapshot) &&
        raw.resourceSnapshot.some(
          (resource) =>
            (["peg", "major"].includes(activity) &&
              resource?.kind === activity) ||
            (["loci", "palace"].includes(activity) &&
              resource?.kind === "palace"),
        )),
    customSizedActivity =
      activity === "palace" ||
      (["loci", "peg"].includes(activity) && hasResourceReference) ||
      (activity === "major" && hasResourceReference) ||
      (activity === "review" &&
        Array.isArray(raw.reviewSnapshot) &&
        raw.reviewSnapshot.length > 0) ||
      (activity === "random" &&
        Array.isArray(raw.learnedSnapshot?.content) &&
        raw.learnedSnapshot.content.length > 0),
    itemCountMin =
      activity === "peg" && customSizedActivity
        ? 5
        : activity === "major" && customSizedActivity
          ? 1
          : rule.min;
  let itemCount =
    raw.itemCount === undefined
      ? difficultyDefault(activity, difficulty)
      : integer(raw.itemCount, "itemCount", itemCountMin, rule.max);
  if (!customSizedActivity && !rule.steps.includes(itemCount))
    invalid(
      `${activity} itemCount támogatott értékei: ${rule.steps.join(", ")}`,
    );
  const encodingMs = integer(raw.encodingMs ?? 0, "encodingMs", 0, 300_000);
  if (encodingMs > 0 && encodingMs < 1000)
    invalid("encodingMs 0 vagy legalább 1000 legyen");
  let delayMs = integer(
    raw.delayMs ??
      (difficulty === "expert"
        ? 300_000
        : difficulty === "hard"
          ? 60_000
          : 10_000),
    "delayMs",
    10_000,
    300_000,
  );
  if (difficulty === "expert" && delayMs < 300_000) delayMs = 300_000;
  const supported = ACTIVITY_BY_ID[activity].recallModes,
    recallMode = enumValue(
      raw.recallMode ?? ACTIVITY_BY_ID[activity].defaultRecallMode,
      supported,
      "recallMode",
    ),
    reverse = booleanValue(raw.reverse, false, "reverse");
  if (reverse && !["chain", "loci", "palace", "peg"].includes(activity))
    invalid("reverse ennél a tevékenységnél nem használható");
  const adaptive = booleanValue(raw.adaptive, true, "adaptive"),
    defaultLevel =
      activity === "keyword"
        ? "noun"
        : activity === "concept"
          ? "abstract"
          : activity === "boss"
            ? "mixed"
            : "concrete",
    contentLevel = enumValue(
      raw.contentLevel ?? defaultLevel,
      CONTENT_LEVELS,
      "contentLevel",
    );
  if (!LEVELS_BY_ACTIVITY[activity].includes(contentLevel))
    invalid(
      `${contentLevel} tartalmi szint ennél a tevékenységnél nem használható`,
    );
  const resourceIds =
      raw.resourceIds === undefined
        ? []
        : uniqueStrings(raw.resourceIds, "resourceIds", { max: 20 }),
    reviewIds =
      raw.reviewIds === undefined
        ? []
        : uniqueStrings(raw.reviewIds, "reviewIds", { max: 50 }),
    customContent =
      raw.customContent === undefined
        ? ""
        : textValue(raw.customContent, "customContent", {
            min: 0,
            max: MAX_TEXT,
          }),
    resourceSnapshot = normalizeResourceSnapshot(raw.resourceSnapshot),
    reviewSnapshot = normalizeReviewSnapshot(raw.reviewSnapshot),
    associationMs = enumValue(
      integer(raw.associationMs ?? 30_000, "associationMs", 30_000, 60_000),
      [30_000, 60_000],
      "associationMs",
    ),
    trainingSize = enumValue(
      integer(raw.trainingSize ?? 10, "trainingSize", 10, 100),
      [10, 20, 100],
      "trainingSize",
    ),
    similarity = enumValue(
      raw.similarity ??
        (["chain", "association"].includes(activity) &&
        (difficulty === "hard" || difficulty === "expert")
          ? "similar"
          : "varied"),
      ["varied", "similar"],
      "similarity",
    ),
    interferenceLevel = integer(
      raw.interferenceLevel ??
        (["random", "review"].includes(activity)
          ? 0
          : difficulty === "expert"
            ? 2
            : difficulty === "hard"
              ? 1
              : 0),
      "interferenceLevel",
      0,
      2,
    ),
    sourceResultId = optionalId(raw.sourceResultId, "sourceResultId"),
    learnedSnapshot = normalizeLearnedSnapshot(raw.learnedSnapshot),
    trainingMastery = normalizeTrainingMastery(raw.trainingMastery);
  if (activity === "random" && learnedSnapshot)
    itemCount = learnedSnapshot.content.length;
  const defaultDelay =
      difficulty === "expert"
        ? 300_000
        : difficulty === "hard"
          ? 60_000
          : 10_000,
    defaultSimilarity =
      ["chain", "association"].includes(activity) &&
      (difficulty === "hard" || difficulty === "expert")
        ? "similar"
        : "varied";
  if (activity !== "association" && associationMs !== 30_000)
    invalid("associationMs csak Képkapcsolónál használható");
  if (activity !== "peg" && trainingSize !== 10)
    invalid("trainingSize csak Peg Masternél használható");
  if (
    !["chain", "association"].includes(activity) &&
    similarity !== defaultSimilarity
  )
    invalid("similarity ennél a tevékenységnél nem használható");
  if (["random", "review"].includes(activity) && encodingMs !== 0)
    invalid("encodingMs ennél a tevékenységnél nem használható");
  if (["association", "concept"].includes(activity) && encodingMs !== 0)
    invalid("encodingMs ennél a tevékenységnél nem használható");
  if (["random", "review"].includes(activity) && delayMs !== defaultDelay)
    invalid("delayMs ennél a tevékenységnél nem használható");
  if (["random", "review"].includes(activity) && interferenceLevel !== 0)
    invalid("interferenceLevel ennél a tevékenységnél nem használható");
  if (customContent)
    invalid("customContent V2-ben nem aktív; használj saját erőforrást");
  if (
    ["chain", "loci", "palace", "peg"].includes(activity) &&
    recallMode !== ACTIVITY_BY_ID[activity].defaultRecallMode
  )
    invalid("a teljes többfázisú körben recallMode nem választható");
  if (activity === "concept" && recallMode !== "meaning")
    invalid("a fogalomkör jelentésfelidézést használ");
  if (activity !== "random" && (learnedSnapshot || sourceResultId))
    invalid(
      "learnedSnapshot és sourceResultId csak Random Recallhoz használható",
    );
  if (activity !== "review" && reviewSnapshot.length)
    invalid("reviewSnapshot csak review körhöz adható");
  if (activity === "review" && reviewSnapshot.length)
    itemCount = reviewSnapshot.length;
  const palace = resourceSnapshot.find(({ kind }) => kind === "palace");
  if (["loci", "palace"].includes(activity) && palace) {
    itemCount = Math.min(itemCount, palace.data.locations.length);
  }
  const peg = resourceSnapshot.find(({ kind }) => kind === "peg");
  if (activity === "peg" && peg) itemCount = peg.data.entries.length;
  const major = resourceSnapshot.find(({ kind }) => kind === "major");
  if (activity === "major" && major)
    itemCount = Math.min(10, major.data.entries.length);
  if (activity === "faces" && itemCount > HANNA_FACES.length)
    invalid("nincs elég külön portré");
  if (
    activity === "keyword" &&
    contentLevel !== "material" &&
    itemCount >
      HANNA_KEYWORDS.filter(
        (item) => contentLevel === "mixed" || item.level === contentLevel,
      ).length
  )
    invalid("nincs elég szerkesztett kulcsszó ezen a szinten");
  const expectedTrainingScope = trainingScopeFor(activity, resourceSnapshot);
  if (trainingMastery && trainingMastery.scopeKey !== expectedTrainingScope)
    invalid(
      "trainingMastery.scopeKey nem egyezik a kiválasztott teljes listával és verzióval",
    );
  return deepFreeze({
    hannaVersion,
    activity,
    difficulty,
    itemCount,
    encodingMs,
    delayMs,
    recallMode,
    reverse,
    adaptive,
    contentLevel,
    resourceIds,
    customContent,
    resourceSnapshot,
    reviewIds,
    reviewSnapshot,
    associationMs,
    trainingSize,
    similarity,
    interferenceLevel,
    ...(sourceResultId ? { sourceResultId } : {}),
    ...(learnedSnapshot ? { learnedSnapshot } : {}),
    ...(trainingMastery ? { trainingMastery } : {}),
  });
}

export function describeHannaSettings(raw) {
  const settings = normalizeHannaSettings(raw),
    activity = ACTIVITY_BY_ID[settings.activity],
    difficulty = {
      beginner: "Kezdő",
      easy: "Könnyű",
      normal: "Normál",
      hard: "Nehéz",
      expert: "Szakértő",
    }[settings.difficulty],
    selectableMode = {
      choice: "választás",
      ordered: "sorrend",
      free: "szabad",
      random: "véletlen",
      reverse: "visszafelé",
      verbatim: "szó szerint",
      meaning: "jelentés",
    }[settings.recallMode],
    fixedMode = {
      baseline: "azonnali → késleltetett",
      chain: "rendezett → szabad → random",
      loci: "előre → vissza → random",
      palace: "előre → vissza → random",
      peg: "előre → vissza → random",
      concept: "képzelet → saját kép → jelentés",
      review: "esedékes felidézés",
      boss: "lista → arc → szám → fogalom",
      numbers: "késleltetett számfelidézés",
    }[settings.activity],
    mode = fixedMode ?? selectableMode,
    amount =
      settings.activity === "association"
        ? `${settings.itemCount * 2} képes készlet`
        : settings.activity === "peg"
          ? `${pegTrainingCoverage(settings, pegAnchors(settings)).testedIds.length}/${settings.itemCount} memóriahorog`
          : `${settings.itemCount} elem`;
  return `${activity.title} · ${amount} · ${mode} · ${difficulty} · ${Math.round(settings.delayMs / 1000)} mp megtartás`;
}
function selectedResource(settings, kind) {
  return settings.resourceSnapshot.find((entry) => entry.kind === kind);
}
function materialItems(settings) {
  return selectedResource(settings, "material")?.data.items ?? [];
}
function itemFromObject(item, prefix) {
  return {
    id: `${prefix}-${item.id}`,
    kind: "picture",
    label: item.label,
    category: item.category,
    visual: clone(item.visual),
  };
}
function makeTrial(id, index, prompt, kind, itemIds, expected, extra = {}) {
  const accessMode =
    extra.accessMode ??
    (kind === "choice" || kind === "ordered" || extra.choices?.length
      ? "choice"
      : "independent");
  return {
    id,
    index,
    prompt,
    kind,
    itemIds: [...itemIds],
    expected: clone(expected),
    hints: hints(...(extra.hints ?? [])),
    phase: extra.phase ?? "recall",
    blockId: extra.blockId ?? "recall",
    entry: extra.entry ?? "typed",
    assessment: extra.assessment ?? "exact",
    accessMode,
    ...(extra.questionType ? { questionType: extra.questionType } : {}),
    ...(extra.activationRoundId
      ? { activationRoundId: extra.activationRoundId }
      : {}),
    ...(extra.connectionId ? { connectionId: extra.connectionId } : {}),
    ...(extra.repeatIndex !== undefined
      ? { repeatIndex: extra.repeatIndex }
      : {}),
    ...(extra.repeatExposure !== undefined
      ? { repeatExposure: Boolean(extra.repeatExposure) }
      : {}),
    ...(extra.position !== undefined ? { position: extra.position } : {}),
    ...(extra.positions ? { positions: [...extra.positions] } : {}),
    ...(extra.anchorId ? { anchorId: extra.anchorId } : {}),
    ...(extra.visual ? { visual: clone(extra.visual) } : {}),
    ...(extra.cue ? { cue: clone(extra.cue) } : {}),
    ...(extra.choices ? { choices: clone(extra.choices) } : {}),
    ...(extra.rubric ? { rubric: clone(extra.rubric) } : {}),
    ...(extra.label ? { label: extra.label } : {}),
  };
}
function choices(items, expected, rng) {
  return shuffle(
    [
      items.find((item) => item.label === expected),
      ...sample(
        items.filter((item) => item.label !== expected),
        Math.min(3, items.length - 1),
        rng,
      ),
    ],
    rng,
  )
    .filter(Boolean)
    .map((item) => ({
      value: item.label,
      label: item.label,
      visual: clone(item.visual),
    }));
}
function flowBlock(id, phase, title, extra = {}) {
  return { id, phase, title, ...extra };
}
function reviewCards(sourceActivity, content, encodingSteps, trials) {
  const primaryTrial = {
      baseline: (trial) => trial.phase === "delayed",
      chain: (trial) => trial.id === "chain-ordered",
      loci: (trial) => trial.id === "loci-forward",
      palace: (trial) => trial.id === "palace-forward",
      peg: (trial) => trial.id === "peg-forward-list",
      text: (trial) => trial.blockId === "text-delayed",
    }[sourceActivity],
    reviewTrials = primaryTrial ? trials.filter(primaryTrial) : trials,
    cards = [];
  for (const trial of reviewTrials) {
    const trialContent = trial.itemIds
        .map((itemId) => content.find((entry) => entry.id === itemId))
        .filter(Boolean)
        .map(clone),
      encodingStepIds = encodingSteps
        .filter((step) =>
          step.itemIds.some((itemId) => trial.itemIds.includes(itemId)),
        )
        .map(({ id }) => id);
    cards.push({
      id: `review-${trial.id}`,
      sourceActivity,
      sourceItemId: trial.id,
      prompt: trial.prompt,
      expected: clone(trial.expected),
      hints: [...trial.hints],
      content: trialContent,
      encodingStepIds,
      ...(trial.activationRoundId
        ? { activationRoundId: trial.activationRoundId }
        : {}),
      ...(trial.connectionId ? { connectionId: trial.connectionId } : {}),
      ...(trial.repeatIndex !== undefined
        ? { repeatIndex: trial.repeatIndex }
        : {}),
      ...(trial.repeatExposure !== undefined
        ? { repeatExposure: trial.repeatExposure }
        : {}),
      ...(trial.rubric ? { rubric: stripPrivateRubric(trial.rubric) } : {}),
      assessment: trial.assessment,
    });
  }
  const seen = new Set();
  return cards.filter((card) => {
    const key = `${card.sourceItemId}|${normalizedText(card.prompt)}|${normalizedText(card.expected)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function trainingContract(training) {
  if (!training) return null;
  const studyId = `${training.kind}-study`,
    testId = `${training.kind}-test`;
  return {
    ...clone(training),
    phases: [
      {
        id: studyId,
        kind: "guided-study",
        itemIds: training.items.map(({ id }) => id),
        referenceVisible: true,
      },
      {
        id: testId,
        kind: "hidden-test",
        trialIds: training.trials.map(({ id }) => id),
        referenceVisible: false,
        feedback: "after-each",
      },
    ],
    completionPolicy: {
      requiresPass: true,
      canSkip: false,
      retry: "reshuffle-choices",
    },
  };
}

function basePlan(
  settings,
  seed,
  content,
  encodingSteps,
  recallTrials,
  flow,
  extras = {},
) {
  const stepIds = new Set(encodingSteps.map(({ id }) => id)),
    trialIds = new Set(recallTrials.map(({ id }) => id));
  if (
    stepIds.size !== encodingSteps.length ||
    trialIds.size !== recallTrials.length
  )
    invalid("a terv lépés- és trialazonosítói legyenek egyediek");
  const referenced = [];
  for (const block of flow) {
    for (const id of block.stepIds ?? [])
      if (!stepIds.has(id)) invalid(`flow idegen stepId: ${id}`);
    for (const id of block.trialIds ?? []) {
      if (!trialIds.has(id)) invalid(`flow idegen trialId: ${id}`);
      referenced.push(id);
    }
  }
  if (
    referenced.length !== recallTrials.length ||
    new Set(referenced).size !== referenced.length
  )
    invalid("minden recall trial pontosan egyszer szerepeljen a flow-ban");
  const timedEncodingSteps = encodingSteps.map((step) =>
      settings.encodingMs > 0 &&
      step.durationMs === undefined &&
      !["concept-symbol", "route-tour", "major-code"].includes(step.kind)
        ? { ...step, durationMs: settings.encodingMs }
        : step,
    ),
    distractorDescriptions = [
      "Válaszd ki a páros számokat; közben ne ismételd a tanult listát.",
      "Válaszd ki a páros számokat a hosszabb sorban; közben ne ismételd a tanult listát.",
      "Válaszd ki a páros számokat a zavaró jelekkel együtt; közben ne ismételd a tanult listát.",
    ],
    contractedTraining = trainingContract(extras.training),
    enrichedFlow = flow.map((block) =>
      block.phase === "distractor"
        ? {
            ...block,
            description:
              block.description ??
              distractorDescriptions[settings.interferenceLevel],
            task: {
              kind: "even-number-tap",
              rounds: [6, 10, 14][settings.interferenceLevel],
              interferenceLevel: settings.interferenceLevel,
            },
          }
        : block.phase === "training" && contractedTraining
          ? {
              ...block,
              trainingPhaseIds:
                block.trainingPhaseIds ??
                contractedTraining.phases.map(({ id }) => id),
            }
          : block,
    );
  const result = {
    version: 2,
    activity: settings.activity,
    seed,
    settings: publicSettings(settings),
    content: clone(content),
    encodingSteps: clone(timedEncodingSteps),
    recallTrials: clone(recallTrials),
    flow: clone(enrichedFlow),
    instructions: {
      title: ACTIVITY_BY_ID[settings.activity].title,
      text: ACTIVITY_BY_ID[settings.activity].instruction,
    },
    training: contractedTraining,
    reviewItems:
      extras.reviewItems ??
      reviewCards(settings.activity, content, encodingSteps, recallTrials),
    resourceSnapshot: settings.resourceSnapshot.map(publicResource),
    protocolId: `hanna-${settings.activity}-v2`,
    ...(extras.sourceActivity ? { sourceActivity: extras.sourceActivity } : {}),
    ...(extras.sourceTextId ? { sourceTextId: extras.sourceTextId } : {}),
    ...(extras.learnedSnapshot
      ? { learnedSnapshot: clone(extras.learnedSnapshot) }
      : {}),
  };
  return deepFreeze(result);
}

function baselinePlan(settings, seed, rng) {
  const words = sample(HANNA_OBJECTS, settings.itemCount, rng),
    pictures = sample(
      HANNA_OBJECTS.filter((item) => !words.includes(item)),
      settings.itemCount,
      rng,
    ),
    digits = Array.from({ length: settings.itemCount }, () =>
      String(Math.floor(rng() * 10)),
    );
  const content = [
    ...words.map((item, index) => ({
      id: `baseline-word-${index}`,
      kind: "word",
      label: item.label,
      visual: undefined,
      position: index + 1,
    })),
    ...pictures.map((item, index) => ({
      ...itemFromObject(item, `baseline-picture-${index}`),
      id: `baseline-picture-${index}`,
      position: index + 1,
    })),
    ...digits.map((label, index) => ({
      id: `baseline-digit-${index}`,
      kind: "digit",
      label,
      position: index + 1,
      visual: visual("number", label),
    })),
  ];
  const groups = [
    ["word", "Szavak", content.slice(0, settings.itemCount)],
    [
      "picture",
      "Képek",
      content.slice(settings.itemCount, settings.itemCount * 2),
    ],
    ["digit", "Számok", content.slice(settings.itemCount * 2)],
  ];
  const encodingSteps = groups.map(([id, title, items]) => ({
    id: `baseline-study-${id}`,
    kind: "item",
    itemIds: items.map(({ id: itemId }) => itemId),
    title,
    prompt:
      "Jegyezd meg sorrendben, majd a következő képernyőn szóbank nélkül írd le.",
    visual: visual("scene", `baseline-${id}`),
  }));
  const immediate = groups.map(([id, title, items], index) =>
    makeTrial(
      `baseline-${id}-immediate`,
      index,
      `${title}: idézd fel sorrendben.`,
      "free-list",
      items.map(({ id: itemId }) => itemId),
      items.map(({ label }) => label),
      {
        phase: "immediate",
        blockId: `${id}-immediate`,
        questionType: "positions",
        assessment: "ordered",
      },
    ),
  );
  const delayed = groups.map(([id, title, items], index) =>
    makeTrial(
      `baseline-${id}-delayed`,
      index + 3,
      `${title}: idézd fel újra sorrendben.`,
      "free-list",
      items.map(({ id: itemId }) => itemId),
      items.map(({ label }) => label),
      {
        phase: "delayed",
        blockId: `${id}-delayed`,
        questionType: "positions",
        assessment: "ordered",
      },
    ),
  );
  const recallTrials = [...immediate, ...delayed];
  const flow = [
    flowBlock("baseline-instruction", "instruction", "Startteszt"),
    ...groups.flatMap(([id, title], index) => [
      flowBlock(`baseline-encode-${id}`, "encoding", `${title} tanulása`, {
        stepIds: [encodingSteps[index].id],
      }),
      flowBlock(`baseline-recall-${id}`, "recall", `${title} azonnal`, {
        trialIds: [immediate[index].id],
      }),
    ]),
    flowBlock("baseline-delay", "distractor", "Köztes feladat", {
      durationMs: settings.delayMs,
      gateId: "baseline-delay-gate",
    }),
    ...delayed.map((trial, index) =>
      flowBlock(`baseline-delayed-${index}`, "recall", trial.prompt, {
        trialIds: [trial.id],
      }),
    ),
    flowBlock("baseline-feedback", "feedback", "Részletes eredmény", {
      feedbackFor: recallTrials.map(({ id }) => id),
    }),
  ];
  return basePlan(settings, seed, content, encodingSteps, recallTrials, flow);
}
function chainSource(settings) {
  const custom = materialItems(settings);
  if (settings.contentLevel === "material") {
    if (custom.length < settings.itemCount)
      invalid("a saját tananyag nem tartalmaz elég elemet");
    return custom.map((item) => ({
      id: item.id,
      label: item.label,
      category: item.category ?? "tananyag",
      meaning: item.meaning,
      visual: visual("concept", `material-${item.id}`, { label: item.label }),
    }));
  }
  if (
    settings.contentLevel === "abstract" ||
    settings.contentLevel === "definition"
  )
    return settings.contentLevel === "definition"
      ? HANNA_CONCEPTS
      : HANNA_CONCEPTS.map(({ meaning, ...item }) => ({
          ...item,
          kind: "concept",
        }));
  if (settings.contentLevel === "mixed")
    return [
      ...HANNA_OBJECTS,
      ...HANNA_CONCEPTS.map((item) => ({ ...item, category: "fogalom" })),
    ];
  return HANNA_OBJECTS;
}

function mixedSample(first, second, count, rng) {
  if (count < 2) return sample([...first, ...second], count, rng);
  const required = [sample(first, 1, rng)[0], sample(second, 1, rng)[0]],
    requiredIds = new Set(required.map(({ id }) => id)),
    remaining = [...first, ...second].filter(({ id }) => !requiredIds.has(id));
  return shuffle([...required, ...sample(remaining, count - 2, rng)], rng);
}

function chainExample(left, right, index) {
  const a = left.keyword ?? left.meaning ?? left.label,
    b = right.keyword ?? right.meaning ?? right.label;
  return [
    `A „${a}” kép ágyúgolyóként nekicsapódik a „${b}” képnek; a második kép csilingelve kettényílik.`,
    `A „${a}” képből óriási karok nőnek ki, felemelik a „${b}” képet, és fejjel lefelé egy festékes vödörbe ejtik.`,
    `A „${a}” kép görkorcsolyán körbeszáguldja a „${b}” képet, majd egy hatalmas masnival szorosan magához köti.`,
    `A forró, fahéjillatú „${a}” kép sisteregve ráolvad a jéghideg „${b}” képre; a két kép találkozása hangosan pattog.`,
    `A „${a}” kép rugóként kilő, átfúrja a „${b}” kép közepét, majd együtt forgó szerkezetté kapcsolódnak össze.`,
  ][index % 5];
}
function chainPlan(settings, seed, rng) {
  const chosen =
      settings.contentLevel === "mixed"
        ? mixedSample(
            HANNA_OBJECTS,
            HANNA_CONCEPTS.map((item) => ({
              ...item,
              category: "fogalom",
            })),
            settings.itemCount,
            rng,
          )
        : sampleForSettings(
            chainSource(settings),
            settings.itemCount,
            settings,
            rng,
          ),
    content = chosen.map((item, index) => ({
      id: `chain-${item.id}`,
      kind: item.kind ?? (item.meaning ? "concept" : "picture"),
      label: item.label,
      category: item.category ?? "fogalom",
      position: index + 1,
      ...(item.meaning ? { meaning: item.meaning } : {}),
      ...(item.keyword ? { keyword: item.keyword } : {}),
      visual: clone(item.visual),
    }));
  const encodingSteps = content.slice(0, -1).map((item, index) => ({
    id: `chain-pair-${index + 1}`,
    kind: "chain-pair",
    itemIds: [item.id, content[index + 1].id],
    title: `${index + 1}. kapcsolat`,
    prompt:
      settings.contentLevel === "definition"
        ? `Kapcsold össze a fogalmat és a definícióját a következővel: ${item.label} (${item.meaning}) → ${content[index + 1].label} (${content[index + 1].meaning}).`
        : `Kapcsold össze: ${item.label} → ${content[index + 1].label}.`,
    example: chainExample(item, content[index + 1], index),
    checks: [
      "mozgás",
      "túlzás vagy abszurditás",
      "érzékszervi részlet",
      "közvetlen kölcsönhatás",
    ],
    visual: visual("scene", `chain-${index + 1}`, {
      parts: [
        { role: "actor", key: item.visual?.key ?? item.id, label: item.label },
        {
          role: "target",
          key: content[index + 1].visual?.key ?? content[index + 1].id,
          label: content[index + 1].label,
        },
      ],
      action: ["collide", "transform", "loop", "melt", "merge"][index % 5],
    }),
  }));
  const ids = content.map(({ id }) => id),
    labels = content.map(({ label }) => label),
    orderedIds = settings.reverse ? [...ids].reverse() : ids,
    orderedLabels = settings.reverse ? [...labels].reverse() : labels,
    ordered = makeTrial(
      "chain-ordered",
      0,
      settings.reverse
        ? "Rendezd a teljes láncot visszafelé."
        : "Rendezd a teljes láncot eredeti sorrendbe.",
      "ordered",
      orderedIds,
      orderedLabels,
      {
        blockId: "chain-ordered",
        questionType: "positions",
        assessment: "ordered",
        entry: "sort",
        choices: content.map((item) => ({
          value: item.label,
          label: item.label,
          visual: clone(item.visual),
        })),
      },
    ),
    free = makeTrial(
      "chain-free-list",
      1,
      "Írd le az összes elemet bármilyen sorrendben.",
      "free-list",
      ids,
      labels,
      {
        blockId: "chain-free",
        questionType: "positions",
        assessment: "set",
        entry: "typed",
        repeatExposure: true,
      },
    ),
    random = buildRandomTrialsFromContent(content, seed, {
      prefix: "chain-random",
      choice: settings.recallMode === "choice",
      limit: Math.min(6, content.length),
      anchors: [],
    });
  for (const trial of random) trial.repeatExposure = true;
  const recallTrials = [ordered, free, ...random];
  const flow = [
    flowBlock("chain-instruction", "instruction", "Építs egyetlen láncot"),
    flowBlock("chain-encoding", "encoding", "Páronkénti történet", {
      stepIds: encodingSteps.map(({ id }) => id),
    }),
    flowBlock("chain-delay", "distractor", "Megtartási szünet", {
      durationMs: settings.delayMs,
      gateId: "chain-delay-gate",
    }),
    flowBlock("chain-ordered-block", "recall", "1. Rendezett felidézés", {
      trialIds: [ordered.id],
    }),
    flowBlock("chain-free-block", "recall", "2. Szabad felidézés", {
      trialIds: [free.id],
    }),
    flowBlock("chain-random-block", "recall", "3. Véletlen hozzáférés", {
      trialIds: random.map(({ id }) => id),
    }),
    flowBlock("chain-feedback", "feedback", "Szomszédpár-hibák", {
      feedbackFor: recallTrials.map(({ id }) => id),
    }),
  ];
  return basePlan(settings, seed, content, encodingSteps, recallTrials, flow);
}

function associationTeachingScenes(left, right) {
  const actor = `„${left.label}”`,
    target = `„${right.label}”`;
  return {
    interaction: `${actor} képe nekicsapódik ${target} képének; ${target} képe kibillen és azonosítható darabokra válik.`,
    adjacency: `${actor} és ${target} mozdulatlanul egymás mellett áll.`,
    isolated: `${actor} a kép bal szélén, ${target} a jobb szélén látszik, két külön keretben.`,
    "other-context": `${actor} egy konyhai jelenetben szerepel, ${target} pedig egy külön kerti jelenetben; nem találkoznak.`,
  };
}

function associationPlan(settings, seed, rng) {
  const source =
    settings.contentLevel === "material"
      ? materialItems(settings).map((item) => ({
          id: item.id,
          label: item.label,
          visual: visual("concept", `material-${item.id}`),
        }))
      : settings.contentLevel === "abstract"
        ? HANNA_CONCEPTS
        : settings.contentLevel === "mixed"
          ? [...HANNA_OBJECTS, ...HANNA_CONCEPTS]
          : HANNA_OBJECTS;
  if (source.length < settings.itemCount * 2)
    invalid("nincs elég elem a képpárokhoz");

  const pool =
      settings.contentLevel === "mixed"
        ? mixedSample(
            HANNA_OBJECTS,
            HANNA_CONCEPTS,
            settings.itemCount * 2,
            rng,
          )
        : sampleForSettings(source, settings.itemCount * 2, settings, rng),
    stablePairs = Array.from({ length: settings.itemCount }, (_, index) => {
      const leftSource = pool[index],
        rightSource = pool[index + settings.itemCount],
        connectionId = `association-connection-${index + 1}`,
        left = {
          id: `${connectionId}-left-${leftSource.id}`,
          kind: leftSource.meaning ? "concept" : "picture",
          label: leftSource.label,
          visual: clone(leftSource.visual),
        },
        right = {
          id: `${connectionId}-right-${rightSource.id}`,
          kind: rightSource.meaning ? "concept" : "picture",
          label: rightSource.label,
          visual: clone(rightSource.visual),
        };
      return { connectionId, left, right };
    }),
    content = stablePairs.flatMap(({ left, right }) => [left, right]),
    roundCount = settings.associationMs / 1000,
    rounds = Array.from({ length: roundCount }, (_, index) => {
      const pair = stablePairs[index % stablePairs.length],
        repeatIndex = Math.floor(index / stablePairs.length) + 1,
        roundId = `association-round-${index + 1}`,
        teaching = associationTeachingScenes(pair.left, pair.right),
        sceneChoices = HANNA_ASSOCIATION_SCENES.map((scene) => {
          const example = teaching[scene.id];
          return {
            id: `${roundId}-${scene.id}`,
            label:
              scene.id === "interaction"
                ? `Ütközés: „${pair.left.label}” → „${pair.right.label}”`
                : scene.label,
            visual: visual("scene", `${roundId}-${scene.id}`, {
              parts: [
                {
                  role: "actor",
                  key: pair.left.visual?.key ?? pair.left.id,
                  label: pair.left.label,
                },
                {
                  role: "target",
                  key: pair.right.visual?.key ?? pair.right.id,
                  label: pair.right.label,
                },
              ],
              action: scene.action,
              variant: scene.strength,
            }),
            explanation:
              scene.id === "interaction"
                ? example
                : `${example} ${scene.explanation}`,
            relationship: scene.id,
            recommended: scene.strength === "strong",
          };
        });
      return {
        id: roundId,
        connectionId: pair.connectionId,
        repeatIndex,
        repeatExposure: repeatIndex > 1,
        itemIds: [pair.left.id, pair.right.id],
        choices: sceneChoices,
        preferredChoiceId: `${roundId}-interaction`,
        example: teaching.interaction,
      };
    }),
    encodingSteps = [
      {
        id: "association-sprint",
        kind: "association-sprint",
        itemIds: content.map(({ id }) => id),
        title: `${settings.associationMs / 1000} másodperces képkapcsoló`,
        prompt:
          "Minden párnál írj saját ötletet vagy válassz illusztrált mintát. A stabil párok ismétlődhetnek; a kész kör után azonnal lépj tovább.",
        durationMs: settings.associationMs,
        uniqueConnectionCount: stablePairs.length,
        rounds,
      },
    ],
    rightChoiceItems = stablePairs.map(({ right }) => right),
    recallTrials = rounds.map((round, index) => {
      const [leftId, rightId] = round.itemIds,
        left = content.find(({ id }) => id === leftId),
        right = content.find(({ id }) => id === rightId),
        repeated = round.repeatExposure;
      return makeTrial(
        `association-recall-${index + 1}`,
        index,
        repeated
          ? `A sprint ${round.repeatIndex}. találkozásakor ismét ez jelent meg: ${left.label}. Mi volt a stabil párja?`
          : `Mi kapcsolódott ehhez: ${left.label}?`,
        settings.recallMode === "choice" ? "choice" : "free",
        [leftId, rightId],
        right.label,
        {
          blockId: "association-recall",
          questionType: "after",
          activationRoundId: round.id,
          connectionId: round.connectionId,
          repeatIndex: round.repeatIndex,
          repeatExposure: repeated,
          choices:
            settings.recallMode === "choice"
              ? choices(rightChoiceItems, right.label, rng)
              : undefined,
          cue: {
            associationStepId: "association-sprint",
            visual: clone(left.visual),
          },
        },
      );
    });
  const flow = [
    flowBlock("association-instruction", "instruction", "Képek kölcsönhatása"),
    flowBlock("association-sprint-block", "encoding", "Aktív gyors kör", {
      stepIds: ["association-sprint"],
      durationMs: settings.associationMs,
    }),
    flowBlock("association-delay", "distractor", "Megtartási szünet", {
      durationMs: settings.delayMs,
      gateId: "association-delay-gate",
    }),
    flowBlock("association-recall-block", "recall", "A párok felidézése", {
      trialIds: recallTrials.map(({ id }) => id),
    }),
    flowBlock("association-feedback", "feedback", "Ötlet és emlékezés külön", {
      feedbackFor: recallTrials.map(({ id }) => id),
    }),
  ];
  return basePlan(settings, seed, content, encodingSteps, recallTrials, flow);
}

function routeLocations(settings) {
  const resource = selectedResource(settings, "palace");
  return (
    resource
      ? resource.data.locations.map((entry, index) => ({
          id: entry.id,
          label: entry.name,
          description: entry.description,
          position: index + 1,
          anchorId: `resource:${resource.id}:r${resource.revision}:location:${entry.id}`,
          roomId: `custom-section-${Math.floor(index / 5) + 1}`,
          roomLabel: `${Math.floor(index / 5) * 5 + 1}–${Math.min(
            resource.data.locations.length,
            Math.floor(index / 5) * 5 + 5,
          )}. hely`,
          visual: visual("location", entry.id, { label: entry.name }),
        }))
      : HANNA_ROUTE
  ).slice(0, settings.itemCount);
}
function routeTraining(kind, locations, rng, mastery, scopeKey) {
  const items = locations.map((location, index) => ({
      id: location.anchorId ?? `${kind}:${location.id}`,
      anchorId: location.anchorId ?? `${kind}:${location.id}`,
      label: location.label,
      number: index + 1,
      description: location.description,
      visual: clone(location.visual),
    })),
    trials = [];
  const choiceSet = (target) =>
    shuffle(
      [
        target,
        ...sample(
          items.filter(({ id }) => id !== target.id),
          Math.min(3, items.length - 1),
          rng,
        ),
      ],
      rng,
    ).map(({ label }) => ({ value: label, label }));
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    trials.push({
      id: `${kind}-position-${index + 1}`,
      itemId: item.id,
      direction: "position",
      relation: "position",
      anchorId: item.anchorId,
      prompt: `Mi a(z) ${index + 1}. hely?`,
      expected: item.label,
      choices: choiceSet(item),
    });
    if (index > 0)
      trials.push({
        id: `${kind}-before-${index + 1}`,
        itemId: item.id,
        direction: "before",
        relation: "before",
        anchorId: item.anchorId,
        prompt: `Mi áll ${item.label} előtt a tanulási sorrendben?`,
        expected: items[index - 1].label,
        choices: choiceSet(items[index - 1]),
      });
    if (index < items.length - 1)
      trials.push({
        id: `${kind}-after-${index + 1}`,
        itemId: item.id,
        direction: "after",
        relation: "after",
        anchorId: item.anchorId,
        prompt: `Mi jön ${item.label} után a tanulási sorrendben?`,
        expected: items[index + 1].label,
        choices: choiceSet(items[index + 1]),
      });
  }
  const masteredIds = (mastery?.items ?? [])
    .filter(({ mastered }) => mastered)
    .map(({ itemId }) => itemId)
    .filter((id) => items.some((item) => item.id === id));
  return {
    kind: "route",
    scopeKey,
    items,
    trials,
    threshold: { accuracy: 0.9 },
    coverage: {
      requiredIds: items.map(({ id }) => id),
      masteredIds,
      testedIds: [...new Set(trials.map(({ itemId }) => itemId))],
    },
  };
}

function routeRoomGroups(locations, kind) {
  const groups = [];
  for (const location of locations) {
    const id = location.roomId ?? `${kind}-route`,
      previous = groups.at(-1);
    if (!previous || previous.id !== id)
      groups.push({
        id,
        label:
          location.roomLabel ??
          (kind === "palace" ? "Saját palota" : "Saját útvonal"),
        itemIds: [],
        transition:
          groups.length === 0 || id === "entry" ? "start" : "entry-hub",
      });
    groups.at(-1).itemIds.push(location.id);
  }
  return groups;
}

function routePlan(settings, seed, rng, kind) {
  const locations = routeLocations(settings),
    objects = sample(
      HANNA_OBJECTS.filter(
        (item) =>
          !locations.some(
            (location) =>
              normalizedText(location.label) === normalizedText(item.label),
          ),
      ),
      locations.length,
      rng,
    ),
    content = objects.map((item, index) => ({
      ...itemFromObject(item, `${kind}-object`),
      location: locations[index].label,
      locationId: locations[index].id,
      anchorId: locations[index].anchorId ?? `${kind}:${locations[index].id}`,
      position: index + 1,
    })),
    routeStep = {
      id: `${kind}-route`,
      kind: "route-tour",
      itemIds: [],
      title: "Vezetett bejárás",
      prompt:
        "Járd be a szobákat a tanulási sorrendben. " +
        "Szobaváltáskor térj vissza az előszobai elágazáshoz; " +
        "a sorrend nem közvetlen fizikai átjárást jelent. " +
        "Ezután járd be visszafelé és véletlen helygombokkal is.",
      rooms: routeRoomGroups(locations, kind),
      rounds: [
        {
          id: `${kind}-tour-forward`,
          itemIds: locations.map(({ id }) => id),
          choices: [],
          preferredChoiceId: null,
          example: "Előre",
        },
        {
          id: `${kind}-tour-reverse`,
          itemIds: [...locations].reverse().map(({ id }) => id),
          choices: [],
          preferredChoiceId: null,
          example: "Visszafelé",
        },
        {
          id: `${kind}-tour-random`,
          itemIds: shuffle(locations, rng).map(({ id }) => id),
          choices: [],
          preferredChoiceId: null,
          example: "Véletlen",
        },
      ],
    },
    encodingSteps = [
      routeStep,
      ...content.map((item, index) => ({
        id: `${kind}-place-${index + 1}`,
        kind: "loci-place",
        itemIds: [item.id],
        title: `${index + 1}. ${item.location}`,
        prompt: `Kapcsold a „${item.label}” tárgy képét a „${item.location}” helyhez.`,
        locationId: item.locationId,
        anchorId: item.anchorId,
        anchor: locations[index].label,
        visual: clone(locations[index].visual),
        example: `A „${item.label}” képből óriási rugó pattan ki, körbetekeri a „${item.location}” helyet jelölő tárgyat, és háromszor meglengeti.`,
        checks: [
          "hely felismerhető",
          "közvetlen kölcsönhatás",
          "mozgás vagy érzékszerv",
        ],
      })),
    ],
    ids = content.map(({ id }) => id),
    labels = content.map(({ label }) => label),
    forward = makeTrial(
      `${kind}-forward`,
      0,
      "Járd be előre, és írd le a tárgyakat.",
      "free-list",
      ids,
      labels,
      {
        blockId: `${kind}-forward`,
        assessment: "ordered",
        questionType: "positions",
      },
    ),
    reverse = makeTrial(
      `${kind}-reverse`,
      1,
      "Járd be visszafelé, és írd le a tárgyakat.",
      "free-list",
      [...ids].reverse(),
      [...labels].reverse(),
      {
        blockId: `${kind}-reverse`,
        assessment: "ordered",
        questionType: "positions",
      },
    ),
    random = shuffle(content, rng)
      .slice(0, Math.min(8, content.length))
      .map((item, index) =>
        makeTrial(
          `${kind}-random-${item.position}`,
          index + 2,
          `Mi került ide: ${item.location}?`,
          "free",
          [item.id],
          item.label,
          {
            blockId: `${kind}-random`,
            questionType: "nth",
            position: item.position,
            anchorId: item.anchorId,
            visual: clone(locations[item.position - 1].visual),
            cue: {
              anchor: item.location,
              associationStepId: `${kind}-place-${item.position}`,
              visual: clone(locations[item.position - 1].visual),
            },
          },
        ),
      ),
    recallTrials = [forward, reverse, ...random],
    training = routeTraining(
      kind,
      locations,
      rng,
      settings.trainingMastery,
      trainingScopeFor(kind, settings.resourceSnapshot),
    ),
    flow = [
      flowBlock(`${kind}-instruction`, "instruction", "Stabil útvonal"),
      flowBlock(`${kind}-tour`, "training", "Vezetett tanuló bejárás", {
        stepIds: [routeStep.id],
        trainingPhaseIds: ["route-study"],
      }),
      flowBlock(
        `${kind}-training`,
        "training",
        "Rejtett hely- és szomszédteszt",
        {
          trialIds: [],
          trainingPhaseIds: ["route-test"],
        },
      ),
      flowBlock(`${kind}-placement`, "encoding", "Tárgyak elhelyezése", {
        stepIds: encodingSteps.slice(1).map(({ id }) => id),
      }),
      flowBlock(`${kind}-delay`, "distractor", "Megtartási szünet", {
        durationMs: settings.delayMs,
        gateId: `${kind}-delay-gate`,
      }),
      ...(settings.reverse
        ? [
            flowBlock(`${kind}-reverse-block`, "recall", "Visszafelé", {
              trialIds: [reverse.id],
            }),
            flowBlock(`${kind}-forward-block`, "recall", "Előre", {
              trialIds: [forward.id],
            }),
          ]
        : [
            flowBlock(`${kind}-forward-block`, "recall", "Előre", {
              trialIds: [forward.id],
            }),
            flowBlock(`${kind}-reverse-block`, "recall", "Visszafelé", {
              trialIds: [reverse.id],
            }),
          ]),
      flowBlock(`${kind}-random-block`, "recall", "Állomásonként", {
        trialIds: random.map(({ id }) => id),
      }),
      flowBlock(`${kind}-feedback`, "feedback", "Útvonal-visszajelzés", {
        feedbackFor: recallTrials.map(({ id }) => id),
      }),
    ];
  return basePlan(settings, seed, content, encodingSteps, recallTrials, flow, {
    training,
  });
}
function lociPlan(settings, seed, rng) {
  return routePlan(settings, seed, rng, "loci");
}
function palacePlan(settings, seed, rng) {
  return routePlan(settings, seed, rng, "palace");
}

function pegAnchors(settings) {
  const resource = selectedResource(settings, "peg");
  return (
    resource
      ? resource.data.entries.map((entry) => ({
          number: entry.number,
          label: entry.label,
          anchorId: `resource:${resource.id}:r${resource.revision}:peg:${entry.number}`,
          visual: visual("object", `custom-peg-${entry.number}`, {
            label: entry.label,
            number: entry.number,
          }),
        }))
      : HANNA_PEGS
  ).slice(0, settings.itemCount);
}
function pegMasteryComplete(item) {
  return (
    item?.mastered === true &&
    item.directions.includes("forward") &&
    item.directions.includes("reverse") &&
    item.bestRtMs !== null &&
    item.bestRtMs < 2000
  );
}
function pegTrainingCoverage(settings, anchors) {
  const masteryById = new Map(
      (settings.trainingMastery?.items ?? []).map((item) => [item.itemId, item]),
    ),
    requiredIds = anchors.map(({ anchorId }) => anchorId),
    masteredIds = requiredIds.filter((id) =>
      pegMasteryComplete(masteryById.get(id)),
    ),
    unmastered = anchors.filter(
      ({ anchorId }) => !pegMasteryComplete(masteryById.get(anchorId)),
    ),
    batch = (unmastered.length ? unmastered : anchors).slice(
      0,
      Math.min(settings.trainingSize, anchors.length),
    );
  return {
    requiredIds,
    masteredIds,
    testedIds: batch.map(({ anchorId }) => anchorId),
    batch,
  };
}
function pegTraining(settings, anchors, rng) {
  const { requiredIds, masteredIds, testedIds, batch } =
    pegTrainingCoverage(settings, anchors);
  const trials = [];
  for (const anchor of batch) {
    const distractors = sample(
      anchors.filter((item) => item.number !== anchor.number),
      Math.min(3, anchors.length - 1),
      rng,
    );
    trials.push({
      id: `peg-forward-${anchor.number}`,
      itemId: anchor.anchorId,
      direction: "forward",
      relation: "forward",
      anchorId: anchor.anchorId,
      prompt: `Mi a ${anchor.number}. horog?`,
      expected: anchor.label,
      choices: shuffle([anchor, ...distractors], rng).map(({ label }) => ({
        value: label,
        label,
      })),
    });
    trials.push({
      id: `peg-reverse-${anchor.number}`,
      itemId: anchor.anchorId,
      direction: "reverse",
      relation: "reverse",
      anchorId: anchor.anchorId,
      prompt: `Melyik számhoz tartozik ez a horog: ${anchor.label}?`,
      expected: String(anchor.number),
      choices: shuffle([anchor, ...distractors], rng).map(({ number }) => ({
        value: String(number),
        label: String(number),
      })),
    });
  }
  return {
    kind: "peg",
    scopeKey: trainingScopeFor("peg", settings.resourceSnapshot),
    items: anchors.map((anchor) => ({
      id: anchor.anchorId,
      anchorId: anchor.anchorId,
      label: anchor.label,
      number: anchor.number,
      visual: clone(anchor.visual),
    })),
    trials,
    threshold: { accuracy: 1, medianRtMs: 2000 },
    coverage: {
      requiredIds,
      masteredIds,
      testedIds,
    },
  };
}
function pegPlan(settings, seed, rng) {
  const anchors = pegAnchors(settings),
    training = pegTraining(settings, anchors, rng),
    activeIds = new Set(training.coverage.testedIds),
    activeAnchors = anchors.filter(({ anchorId }) => activeIds.has(anchorId));
  const objects = sample(
    HANNA_OBJECTS.filter(
      (item) =>
        !activeAnchors.some(
          (anchor) =>
            normalizedText(anchor.label) === normalizedText(item.label),
        ),
    ),
    activeAnchors.length,
    rng,
  );
  const content = objects.map((item, index) => ({
    ...itemFromObject(item, "peg-object"),
    id: `peg-object-${activeAnchors[index].number}-${item.id}`,
    peg: activeAnchors[index].number,
    anchorId: activeAnchors[index].anchorId,
    position: activeAnchors[index].number,
  }));
  const encodingSteps = content.map((item, index) => ({
    id: `peg-link-${item.peg}`,
    kind: "peg-link",
    itemIds: [item.id],
    title: `${item.peg}. horog: ${activeAnchors[index].label}`,
    prompt: `A ${item.label} közvetlenül lépjen kölcsönhatásba ezzel: ${activeAnchors[index].label}.`,
    anchorId: item.anchorId,
    anchor: activeAnchors[index].label,
    visual: clone(activeAnchors[index].visual),
    example: `A ${item.label} ráugrik a ${activeAnchors[index].label} képére és látványosan átalakítja.`,
  }));
  const ids = content.map(({ id }) => id),
    labels = content.map(({ label }) => label),
    ordered = makeTrial(
      "peg-forward-list",
      0,
      "Írd le a most gyakorolt tárgyakat a horgok növekvő sorrendjében.",
      "free-list",
      ids,
      labels,
      {
        blockId: "peg-forward",
        assessment: "ordered",
        questionType: "positions",
      },
    ),
    reverse = makeTrial(
      "peg-reverse-list",
      1,
      "Írd le a most gyakorolt tárgyakat a horgok csökkenő sorrendjében.",
      "free-list",
      [...ids].reverse(),
      [...labels].reverse(),
      {
        blockId: "peg-reverse",
        assessment: "ordered",
        questionType: "positions",
      },
    ),
    random = shuffle(content, rng)
      .slice(0, Math.min(10, content.length))
      .map((item, index) =>
        makeTrial(
          `peg-random-${item.peg}`,
          index + 2,
          `Mi került a(z) ${item.peg}. horogra?`,
          "free",
          [item.id],
          item.label,
          {
            blockId: "peg-random",
            questionType: "nth",
            position: item.peg,
            anchorId: item.anchorId,
            cue: {
              anchor: String(item.peg),
              associationStepId: `peg-link-${item.peg}`,
              visual: visual("number", String(item.peg), { number: item.peg }),
            },
          },
        ),
      ),
    recallTrials = [ordered, reverse, ...random];
  const flow = [
    flowBlock("peg-instruction", "instruction", "Horogautomatizálás"),
    flowBlock("peg-training", "training", "Szám és horog két irányban", {
      trialIds: [],
    }),
    flowBlock(
      "peg-encoding",
      "encoding",
      "A tárgyak összekapcsolása a memóriahorgokkal",
      { stepIds: encodingSteps.map(({ id }) => id) },
    ),
    flowBlock("peg-delay", "distractor", "Megtartási szünet", {
      durationMs: settings.delayMs,
      gateId: "peg-delay-gate",
    }),
    ...(settings.reverse
      ? [
          flowBlock("peg-reverse-block", "recall", "Vissza", {
            trialIds: [reverse.id],
          }),
          flowBlock("peg-forward-block", "recall", "Előre", {
            trialIds: [ordered.id],
          }),
        ]
      : [
          flowBlock("peg-forward-block", "recall", "Előre", {
            trialIds: [ordered.id],
          }),
          flowBlock("peg-reverse-block", "recall", "Vissza", {
            trialIds: [reverse.id],
          }),
        ]),
    flowBlock("peg-random-block", "recall", "Csak a szám a kérdés", {
      trialIds: random.map(({ id }) => id),
    }),
    flowBlock("peg-feedback", "feedback", "Batch és teljes lefedettség külön", {
      feedbackFor: recallTrials.map(({ id }) => id),
    }),
  ];
  return basePlan(settings, seed, content, encodingSteps, recallTrials, flow, {
    training,
  });
}

function facesPlan(settings, seed, rng) {
  const portraits = sample(HANNA_FACES, settings.itemCount, rng),
    identities = sample(HANNA_FACES, settings.itemCount, rng),
    content = portraits.map((portrait, index) => {
      const identity = identities[index];
      return {
        id: `faces-${portrait.portraitId}-${identity.id}`,
        kind: "face",
        label: identity.label,
        portraitId: portrait.portraitId,
        keyword: identity.keyword,
        trait: portrait.trait,
        fact: identity.fact,
        story: `A ${identity.keyword} rugóként a portréhoz pattan, fényes vonallal körberajzolja ezt a jegyet: ${portrait.trait}, majd hangosan háromszor megkocogtatja.`,
        visual: clone(portrait.visual),
      };
    }),
    encodingSteps = content.map((face, index) => ({
      id: `face-intro-${index + 1}`,
      kind: "face-intro",
      itemIds: [face.id],
      title: `${index + 1}. portré`,
      prompt: `${face.label} → ${face.keyword} → ${face.trait}`,
      example: face.story,
      visual: clone(face.visual),
      checks: ["névhangzás", "semleges arcvonás", "saját történet"],
    })),
    nameTrials = content.map((face, index) =>
      makeTrial(
        `faces-name-${face.portraitId}`,
        index,
        "Mi a képen látható személy neve?",
        settings.recallMode === "choice" ? "choice" : "free",
        [face.id],
        face.label,
        {
          blockId: "faces-name",
          questionType: "name",
          visual: clone(face.visual),
          cue: {
            associationStepId: `face-intro-${index + 1}`,
            visual: clone(face.visual),
          },
          choices:
            settings.recallMode === "choice"
              ? shuffle(
                  [
                    face,
                    ...sample(
                      content.filter(({ id }) => id !== face.id),
                      Math.min(3, content.length - 1),
                      rng,
                    ),
                  ],
                  rng,
                ).map(({ label }) => ({ value: label, label }))
              : undefined,
        },
      ),
    ),
    factTrials = content.map((face, index) =>
      makeTrial(
        `faces-fact-${face.portraitId}`,
        index + content.length,
        "Melyik személyes tényt tanultad ehhez a portréhoz?",
        settings.recallMode === "choice" ? "choice" : "free",
        [face.id],
        face.fact,
        {
          blockId: "faces-fact",
          questionType: "fact",
          visual: clone(face.visual),
          cue: {
            associationStepId: `face-intro-${index + 1}`,
            visual: clone(face.visual),
          },
          choices:
            settings.recallMode === "choice"
              ? shuffle(
                  [
                    face,
                    ...sample(
                      content.filter(({ id }) => id !== face.id),
                      Math.min(3, content.length - 1),
                      rng,
                    ),
                  ],
                  rng,
                ).map(({ fact }) => ({ value: fact, label: fact }))
              : undefined,
        },
      ),
    ),
    recallTrials = [...nameTrials, ...factTrials],
    flow = [
      flowBlock("faces-instruction", "instruction", "Arc, név és tény"),
      flowBlock("faces-encoding", "encoding", "Portrék tanulása", {
        stepIds: encodingSteps.map(({ id }) => id),
      }),
      flowBlock("faces-delay", "distractor", "Megtartási szünet", {
        durationMs: settings.delayMs,
        gateId: "faces-delay-gate",
      }),
      flowBlock("faces-name-block", "recall", "Nevek", {
        trialIds: nameTrials.map(({ id }) => id),
      }),
      flowBlock("faces-fact-block", "recall", "Személyes tények", {
        trialIds: factTrials.map(({ id }) => id),
      }),
      flowBlock("faces-feedback", "feedback", "Név és tény külön", {
        feedbackFor: recallTrials.map(({ id }) => id),
      }),
    ];
  return basePlan(settings, seed, content, encodingSteps, recallTrials, flow);
}
function keywordPlan(settings, seed, rng) {
  let source;
  if (settings.contentLevel === "material") {
    source = materialItems(settings);
    if (source.some((item) => !item.meaning || !item.keyword))
      invalid("saját Kulcsszóhídhoz szó, jelentés és képi hangzáskulcs kell");
  } else
    source = HANNA_KEYWORDS.filter(
      (item) =>
        settings.contentLevel === "mixed" ||
        item.level === settings.contentLevel,
    );
  const chosen = sample(source, settings.itemCount, rng),
    content = chosen.map((item) => ({
      id: `keyword-${item.id}`,
      kind: "keyword",
      label: item.label,
      meaning: item.meaning,
      keyword: item.keyword,
      category: item.level ?? item.category ?? "material",
      story:
        item.story ??
        `A „${item.keyword}” hangzáskulcs nekicsapódik a „${item.meaning}” jelentését mutató képnek; a kép csilingelve körbefordul.`,
      visual: clone(
        item.visual ?? visual("scene", `keyword-material-${item.id}`),
      ),
    })),
    encodingSteps = content.map((item, index) => ({
      id: `keyword-bridge-${index + 1}`,
      kind: "keyword-bridge",
      itemIds: [item.id],
      title: `${item.label} → ${item.keyword} → ${item.meaning}`,
      prompt:
        "Figyeld meg: a hangzáskulcs csak közelítő segítség, nem tökéletes fonetikai egyezés.",
      example: item.story,
      visual: clone(item.visual),
      checks: ["hangzáskulcs", "jelentés", "kölcsönhatás"],
    })),
    forward = content.map((item, index) =>
      makeTrial(
        `keyword-forward-${index + 1}`,
        index,
        `Mit jelent: ${item.label}?`,
        "free",
        [item.id],
        item.meaning,
        {
          blockId: "keyword-forward",
          questionType: "fact",
          repeatExposure: settings.recallMode === "reverse",
        },
      ),
    ),
    reverse = content.map((item, index) =>
      makeTrial(
        `keyword-reverse-${index + 1}`,
        index + content.length,
        `Melyik idegen szót tanultad ehhez: ${item.meaning}?`,
        "free",
        [item.id],
        item.label,
        {
          blockId: "keyword-reverse",
          questionType: "name",
          repeatExposure: settings.recallMode !== "reverse",
        },
      ),
    ),
    recallTrials =
      settings.recallMode === "reverse"
        ? [...reverse, ...forward]
        : [...forward, ...reverse],
    flow = [
      flowBlock("keyword-instruction", "instruction", "Kulcsszóhíd"),
      flowBlock("keyword-encoding", "encoding", "Hidak építése", {
        stepIds: encodingSteps.map(({ id }) => id),
      }),
      flowBlock("keyword-delay", "distractor", "Megtartási szünet", {
        durationMs: settings.delayMs,
        gateId: "keyword-delay-gate",
      }),
      ...(settings.recallMode === "reverse"
        ? [
            flowBlock(
              "keyword-reverse-block",
              "recall",
              "Jelentésből idegen szó",
              {
                trialIds: reverse.map(({ id }) => id),
              },
            ),
            flowBlock(
              "keyword-forward-block",
              "recall",
              "Idegen szóból jelentés",
              {
                trialIds: forward.map(({ id }) => id),
              },
            ),
          ]
        : [
            flowBlock(
              "keyword-forward-block",
              "recall",
              "Idegen szóból jelentés",
              {
                trialIds: forward.map(({ id }) => id),
              },
            ),
            flowBlock(
              "keyword-reverse-block",
              "recall",
              "Jelentésből idegen szó",
              {
                trialIds: reverse.map(({ id }) => id),
              },
            ),
          ]),
      flowBlock("keyword-feedback", "feedback", "Kétirányú eredmény", {
        feedbackFor: recallTrials.map(({ id }) => id),
      }),
    ];
  return basePlan(settings, seed, content, encodingSteps, recallTrials, flow);
}

function majorTraining(settings, rng) {
  const items = HU_MAJOR_DIGITS.map((item) => ({
      id: `major-digit-${item.digit}`,
      label: item.digit,
      number: Number(item.digit),
      description: item.explanation,
      visual: visual("number", item.digit, { number: Number(item.digit) }),
    })),
    trials = [];
  for (const item of HU_MAJOR_DIGITS) {
    const options = shuffle(
      [
        item,
        ...sample(
          HU_MAJOR_DIGITS.filter(({ digit }) => digit !== item.digit),
          3,
          rng,
        ),
      ],
      rng,
    );
    trials.push({
      id: `major-number-sound-${item.digit}`,
      itemId: `major-digit-${item.digit}`,
      direction: "forward",
      relation: "forward",
      prompt: `Melyik hangcsoport tartozik ehhez: ${item.digit}?`,
      expected: item.sounds.join("/"),
      choices: options.map((row) => ({
        value: row.sounds.join("/"),
        label: row.sounds.join("/"),
      })),
    });
    trials.push({
      id: `major-sound-number-${item.digit}`,
      itemId: `major-digit-${item.digit}`,
      direction: "reverse",
      relation: "reverse",
      prompt: `Melyik számjegyet jelöli: ${item.sounds.join("/")}?`,
      expected: item.digit,
      choices: options.map((row) => ({ value: row.digit, label: row.digit })),
    });
  }
  return {
    kind: "major",
    scopeKey: trainingScopeFor("major", settings.resourceSnapshot),
    items,
    trials,
    threshold: { accuracy: 0.95, medianRtMs: 1500 },
    coverage: {
      requiredIds: items.map(({ id }) => id),
      masteredIds: (settings.trainingMastery?.items ?? [])
        .filter(({ mastered }) => mastered)
        .map(({ itemId }) => itemId),
      testedIds: items.map(({ id }) => id),
    },
  };
}
function majorPlan(settings, seed, rng) {
  const customMajor = selectedResource(settings, "major"),
    wordBank = customMajor?.data.entries ?? HU_MAJOR_WORDS,
    selected = sample(wordBank, settings.itemCount, rng),
    content = selected.map((item, index) => ({
      id: `major-${item.code}`,
      kind: "digit",
      label: item.code,
      code: item.code,
      meaning: item.label,
      position: index + 1,
      visual: visual("number", item.code, { label: item.label }),
    })),
    encodingSteps = [
      {
        id: "major-code-intro",
        kind: "major-code",
        itemIds: HU_MAJOR_DIGITS.map(({ digit }) => `major-digit-${digit}`),
        title: "Magyar hangkód",
        prompt:
          "0 sz/z · 1 t/d · 2 n/ny · 3 m · 4 r · 5 l · 6 s/zs/cs/dzs · 7 k/g · 8 f/v · 9 p/b. A magánhangzó, h és j kötőhang.",
        rounds: HU_MAJOR_DIGITS.map((item) => ({
          id: `major-rule-${item.digit}`,
          itemIds: [`major-digit-${item.digit}`],
          choices: [],
          preferredChoiceId: null,
          example: `${item.digit}: ${item.explanation}; példa: ${item.example}`,
        })),
      },
      ...content.map((item, index) => ({
        id: `major-word-${item.code}`,
        kind: "major-word",
        itemIds: [item.id],
        title: `${item.code} → ${item.meaning}`,
        prompt: "Hangokból szó, szóból konkrét kép.",
        visual: visual("scene", `major-word-${item.code}`, {
          parts: [
            { role: "number", key: item.code },
            { role: "image", key: item.meaning },
          ],
          action: "transform",
        }),
        example: customMajor
          ? "Saját képszó: ellenőrizd, hogy a kimondott mássalhangzóhangok valóban a megadott kétjegyű kódot adják."
          : `Ellenőrzött képszó: „${item.meaning}”. A magánhangzók, valamint a h és j hang nem kapnak számértéket.`,
      })),
    ],
    forward = content.map((item, index) =>
      makeTrial(
        `major-forward-${item.code}`,
        index,
        `Melyik képszót használod ehhez: ${item.code}?`,
        "free",
        [item.id],
        item.meaning,
        { blockId: "major-forward" },
      ),
    ),
    reverse = content.map((item, index) =>
      makeTrial(
        `major-reverse-${item.code}`,
        index + content.length,
        `Melyik kétjegyű kód tartozik ehhez: ${item.meaning}?`,
        "free",
        [item.id],
        item.code,
        { blockId: "major-reverse" },
      ),
    ),
    recallTrials = (() => {
      const ordered =
          settings.recallMode === "reverse"
            ? [...reverse, ...forward]
            : shuffle([...forward, ...reverse], rng),
        seenItems = new Set();
      return ordered.map((trial) => {
        const itemId = trial.itemIds[0],
          repeatExposure = seenItems.has(itemId);
        seenItems.add(itemId);
        return { ...trial, repeatExposure };
      });
    })(),
    training = majorTraining(settings, rng),
    flow = [
      flowBlock("major-instruction", "instruction", "Magyar Major-rendszer"),
      flowBlock("major-training", "training", "Szám és hang két irányban", {
        trialIds: [],
      }),
      flowBlock("major-encoding", "encoding", "Kód, szó és kép", {
        stepIds: encodingSteps.map(({ id }) => id),
      }),
      flowBlock("major-delay", "distractor", "Megtartási szünet", {
        durationMs: settings.delayMs,
        gateId: "major-delay-gate",
      }),
      ...(settings.recallMode === "reverse"
        ? [
            flowBlock("major-reverse-block", "recall", "Képből szám", {
              trialIds: reverse.map(({ id }) => id),
            }),
            flowBlock("major-forward-block", "recall", "Számból kép", {
              trialIds: forward.map(({ id }) => id),
            }),
          ]
        : [
            flowBlock("major-random-block", "recall", "Két irány keverve", {
              trialIds: recallTrials.map(({ id }) => id),
            }),
          ]),
      flowBlock("major-feedback", "feedback", "Teljes kapu", {
        feedbackFor: recallTrials.map(({ id }) => id),
      }),
    ];
  return basePlan(settings, seed, content, encodingSteps, recallTrials, flow, {
    training,
  });
}
function numberWords(settings) {
  const custom = selectedResource(settings, "major");
  return new Map(
    [...HU_MAJOR_WORDS, ...(custom?.data.entries ?? [])].map((entry) => [
      entry.code,
      entry.label,
    ]),
  );
}
function numbersPlan(settings, seed, rng) {
  const digits = Array.from({ length: settings.itemCount }, () =>
      String(Math.floor(rng() * 10)),
    ).join(""),
    pairs = digits.match(/.{1,2}/g),
    dictionary = numberWords(settings);
  if (pairs.some((code) => !dictionary.has(code)))
    invalid("a kiválasztott számkódhoz nincs képszó");
  const content = pairs.map((code, index) => ({
      id: `number-pair-${index + 1}`,
      kind: "digit",
      label: code,
      code,
      meaning: dictionary.get(code),
      position: index + 1,
      visual: visual("number", code, { label: dictionary.get(code) }),
    })),
    encodingSteps = content.map((item, index) => ({
      id: `number-image-${index + 1}`,
      kind: "number-image",
      itemIds: [item.id],
      title: `${item.code} → ${item.meaning}`,
      prompt: "Lásd konkrét képként, majd fűzd az előző képhez.",
      visual: clone(item.visual),
      example: index
        ? chainExample(content[index - 1], item, index - 1)
        : `Képzeld el a „${item.meaning}” képet óriási, mozgó kezdőképként.`,
    })),
    trial = makeTrial(
      "numbers-delayed",
      0,
      `Írd vissza mind a ${settings.itemCount} számjegyet.`,
      "text",
      content.map(({ id }) => id),
      digits,
      {
        phase: "delayed",
        blockId: "numbers-delayed",
        assessment: "digits",
        label: "digits",
      },
    ),
    flow = [
      flowBlock("numbers-instruction", "instruction", "Számszörny"),
      flowBlock("numbers-encoding", "encoding", "Kétjegyű képlánc", {
        stepIds: encodingSteps.map(({ id }) => id),
      }),
      flowBlock("numbers-delay", "distractor", "Késleltetés", {
        durationMs: settings.delayMs,
        gateId: "numbers-delay-gate",
      }),
      flowBlock("numbers-recall", "recall", "Számjegyek visszaírása", {
        trialIds: [trial.id],
      }),
      flowBlock("numbers-feedback", "feedback", "Számjegypontosság", {
        feedbackFor: [trial.id],
      }),
    ];
  return basePlan(settings, seed, content, encodingSteps, [trial], flow);
}

function buildRandomTrialsFromContent(
  content,
  seed,
  { prefix = "random", choice = false, limit = 8, anchors = [] } = {},
) {
  const rng = seededRandom(seed),
    byCategory = new Map();
  content.forEach((item, index) => {
    const category = item.category ?? item.kind ?? "item";
    const list = byCategory.get(category) ?? [];
    list.push(item);
    byCategory.set(category, list);
    item.position = item.position ?? index + 1;
  });
  const scalarCandidate = (questionType, cueIndex, expectedIndex, prompt) => ({
      questionType,
      position: content[cueIndex].position,
      prompt,
      expected: content[expectedIndex].label,
      item: content[expectedIndex],
      cueItem: content[cueIndex],
    }),
    candidates = [];
  for (let index = 0; index < content.length; index += 1) {
    candidates.push(
      scalarCandidate(
        "nth",
        index,
        index,
        `Mi volt a(z) ${content[index].position}. elem?`,
      ),
    );
    if (index > 0)
      candidates.push(
        scalarCandidate(
          "before",
          index,
          index - 1,
          `Mi volt közvetlenül ${content[index].label} előtt?`,
        ),
      );
    if (index < content.length - 1)
      candidates.push(
        scalarCandidate(
          "after",
          index,
          index + 1,
          `Mi volt közvetlenül ${content[index].label} után?`,
        ),
      );
  }
  for (const [category, items] of byCategory)
    candidates.push({
      questionType: "category",
      prompt: `Mely elemek tartoztak ebbe a kategóriába: ${category}?`,
      expected: items.map(({ label }) => label),
      items,
    });
  const nthIndex = Math.min(3, content.length) - 1,
    pairIndexes =
      content.length >= 7
        ? [2, 6]
        : content.length >= 2
          ? [0, content.length - 1]
          : [0],
    pairItems = pairIndexes.map((index) => content[index]),
    pairPositions = pairItems.map(({ position }) => position),
    category =
      [...byCategory.entries()].find(([, items]) => items.length > 1) ??
      [...byCategory.entries()][0],
    mandatory = [
      scalarCandidate(
        "nth",
        nthIndex,
        nthIndex,
        `Mi volt a(z) ${content[nthIndex].position}. elem?`,
      ),
      ...(content.length > 1
        ? [
            scalarCandidate(
              "before",
              1,
              0,
              `Mi volt közvetlenül ${content[1].label} előtt?`,
            ),
            scalarCandidate(
              "after",
              content.length - 2,
              content.length - 1,
              `Mi volt közvetlenül ${content.at(-2).label} után?`,
            ),
          ]
        : []),
      {
        questionType: "positions",
        positions: pairPositions,
        prompt: `Mi volt a(z) ${pairPositions.join(". és ")}. helyen?`,
        expected: pairItems.map(({ label }) => label),
        items: pairItems,
      },
      ...(category
        ? [
            {
              questionType: "category",
              prompt: `Mely elemek tartoztak ebbe a kategóriába: ${category[0]}?`,
              expected: category[1].map(({ label }) => label),
              items: category[1],
            },
          ]
        : []),
    ],
    candidateKey = (row) =>
      `${row.questionType}|${row.position ?? ""}|${row.positions?.join(",") ?? ""}|${normalizedText(row.prompt)}`,
    used = new Set(mandatory.map(candidateKey)),
    remaining = candidates.filter((row) => !used.has(candidateKey(row))),
    selected = [
      ...mandatory,
      ...sample(
        remaining,
        Math.max(0, Math.min(limit, candidates.length) - mandatory.length),
        rng,
      ),
    ];
  const trials = [];
  for (let index = 0; index < selected.length; index += 1) {
    const row = selected[index],
      expected = clone(row.expected),
      itemIds = (row.items ?? [row.item]).map(({ id }) => id),
      anchorReferenceId = row.cueItem?.anchorId ?? row.item?.anchorId,
      anchor =
        anchors.find((entry) => entry.id === anchorReferenceId) ??
        anchors.find((entry) => entry.position === row.position);
    trials.push(
      makeTrial(
        `${prefix}-${index + 1}`,
        index,
        row.prompt,
        Array.isArray(expected)
          ? choice
            ? "multi"
            : "free-list"
          : choice
            ? "choice"
            : "free",
        itemIds,
        expected,
        {
          blockId: prefix,
          questionType: row.questionType,
          position: row.position,
          positions: row.positions,
          anchorId: anchor?.id,
          cue: {
            ...(anchor
              ? { anchor: anchor.label, visual: clone(anchor.visual) }
              : {}),
            ...(row.cueItem && row.questionType !== "nth"
              ? { visual: clone(row.cueItem.visual) }
              : {}),
          },
          choices:
            choice && !Array.isArray(expected)
              ? choices(content, expected, rng)
              : choice && Array.isArray(expected)
                ? content.map((item) => ({
                    value: item.label,
                    label: item.label,
                    visual: clone(item.visual),
                  }))
                : undefined,
          accessMode: choice ? "choice" : "independent",
          assessment: Array.isArray(expected)
            ? row.questionType === "positions"
              ? "ordered"
              : "set"
            : "exact",
        },
      ),
    );
  }
  return trials;
}
export function buildHannaRandomTrials(
  snapshot,
  seed,
  { prefix = "random", choice = false } = {},
) {
  const normalized = normalizeLearnedSnapshot(snapshot);
  if (!normalized) invalid("learnedSnapshot szükséges");
  const safePrefix = textValue(prefix, "prefix", { max: 80 });
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(safePrefix))
    invalid("prefix csak stabil betű-, szám- és kötőjel-azonosító lehet");
  return deepFreeze(
    buildRandomTrialsFromContent(clone(normalized.content), seed, {
      prefix: safePrefix,
      choice: Boolean(choice),
      limit: Math.min(10, normalized.content.length + 3),
      anchors: normalized.anchors,
    }),
  );
}
function randomPlan(settings, seed) {
  const snapshot = settings.learnedSnapshot;
  if (!snapshot)
    invalid(
      "Random Recall csak saját, szerverről feloldott learnedSnapshot forrásból indítható",
    );
  const content = clone(snapshot.content),
    recallTrials = clone(
      buildHannaRandomTrials(snapshot, seed, {
        prefix: "random",
        choice: settings.recallMode === "choice",
      }),
    ),
    flow = [
      flowBlock(
        "random-instruction",
        "instruction",
        `Forrás: ${snapshot.sourceLabel}`,
      ),
      flowBlock("random-recall-block", "recall", "Véletlen hozzáférés", {
        trialIds: recallTrials.map(({ id }) => id),
      }),
      flowBlock("random-feedback", "feedback", "Forrásazonos eredmény", {
        feedbackFor: recallTrials.map(({ id }) => id),
      }),
    ];
  return basePlan(settings, seed, content, [], recallTrials, flow, {
    sourceActivity: snapshot.sourceActivity,
    learnedSnapshot: snapshot,
  });
}

function textSource(settings, seed) {
  const material = selectedResource(settings, "material");
  if (material?.data.text) {
    if (!material.data.rubric?.length)
      invalid("saját szöveghez előre szerkesztett rubrika kell");
    return {
      id: `material-${material.id}`,
      title: material.title,
      text: material.data.text,
      rubric: material.data.rubric,
    };
  }
  return HANNA_TEXTS[seed % HANNA_TEXTS.length];
}
function textPlan(settings, seed) {
  const source = textSource(settings, seed),
    content = [
      {
        id: `text-${source.id}`,
        kind: "text",
        label: source.title,
        meaning: source.text,
        visual: visual("concept", `text-${source.id}`, { label: source.title }),
      },
    ],
    encodingSteps = [
      {
        id: "text-study-1",
        kind: "text-study",
        itemIds: [content[0].id],
        title: source.title,
        prompt: source.text,
        checks: ["3–5 mondat", "kulcsgondolatok"],
      },
      {
        id: "text-restudy",
        kind: "text-restudy",
        itemIds: [content[0].id],
        title: "Célzott újratanulás",
        prompt: source.text,
        checks: source.rubric.map(({ label }) => label),
      },
    ],
    assessment = settings.recallMode === "verbatim" ? "verbatim" : "rubric",
    publicRubric = stripPrivateRubric(source.rubric),
    first = makeTrial(
      "text-recall-1",
      0,
      "Írd le, mire emlékszel a szövegből.",
      "text",
      [content[0].id],
      source.text,
      {
        phase: "immediate",
        blockId: "text-immediate",
        assessment,
        rubric: assessment === "rubric" ? publicRubric : undefined,
      },
    ),
    second = makeTrial(
      "text-recall-2",
      1,
      "Az újratanulás után idézd fel újra.",
      "text",
      [content[0].id],
      source.text,
      {
        phase: "delayed",
        blockId: "text-delayed",
        assessment,
        rubric: assessment === "rubric" ? publicRubric : undefined,
      },
    ),
    flow = [
      flowBlock(
        "text-instruction",
        "instruction",
        "Aktív felidézés két körben",
      ),
      flowBlock("text-study", "encoding", "Első tanulás", {
        stepIds: ["text-study-1"],
      }),
      flowBlock("text-recall-first", "recall", "Első felidézés", {
        trialIds: [first.id],
      }),
      flowBlock(
        "text-restudy-block",
        "encoding",
        "Hiányzó gondolatok és újratanulás",
        { stepIds: ["text-restudy"] },
      ),
      flowBlock("text-delay", "distractor", "Rövid megtartás", {
        durationMs: settings.delayMs,
        gateId: "text-delay-gate",
      }),
      flowBlock("text-recall-second", "recall", "Második felidézés", {
        trialIds: [second.id],
      }),
      flowBlock("text-feedback", "feedback", "Külön első és második eredmény", {
        feedbackFor: [first.id, second.id],
      }),
    ];
  return basePlan(
    settings,
    seed,
    content,
    encodingSteps,
    [first, second],
    flow,
    { sourceTextId: source.id },
  );
}
function conceptPlan(settings, seed, rng) {
  let source;
  if (settings.contentLevel === "material") {
    source = materialItems(settings);
    if (source.some((item) => !item.meaning || !item.keyword))
      invalid("saját fogalomhoz fogalom, definíció és vizuális szimbólum kell");
  } else source = HANNA_CONCEPTS;
  const chosen = sample(source, settings.itemCount, rng),
    content = chosen.map((item) => ({
      id: `concept-${item.id}`,
      kind: "concept",
      label: item.label,
      meaning: item.meaning,
      keyword: item.keyword,
      visual: clone(item.visual ?? visual("concept", `material-${item.id}`)),
      position: chosen.indexOf(item) + 1,
    })),
    encodingSteps = content.flatMap((item, index) => [
      {
        id: `concept-imagine-${index + 1}`,
        kind: "concept-imagine",
        itemIds: [item.id],
        title: item.label,
        prompt: "Két másodpercig csak képzeld el. Még ne gépelj.",
        durationMs: 2000,
        visual: clone(item.visual),
      },
      {
        id: `concept-symbol-${index + 1}`,
        kind: "concept-symbol",
        itemIds: [item.id],
        title: "Saját kép és definíció",
        prompt:
          "Most korlátlanul írd le a saját képedet, majd kapcsold a definícióhoz.",
        example: item.keyword,
        visual: clone(item.visual),
      },
    ]),
    meaningTrials = content.map((item, index) =>
      makeTrial(
        `concept-meaning-${index + 1}`,
        index,
        `Mit jelent ez a fogalom: ${item.label}?`,
        "text",
        [item.id],
        item.meaning,
        {
          blockId: "concept-meaning",
          assessment: "rubric",
          rubric: [{ id: `meaning-${item.id}`, label: "A definíció lényege" }],
        },
      ),
    ),
    chainTrial =
      settings.difficulty === "hard" || settings.difficulty === "expert"
        ? makeTrial(
            "concept-chain",
            meaningTrials.length,
            "Írd le a fogalmakat a tanult fogalomlánc sorrendjében.",
            "free-list",
            content.map(({ id }) => id),
            content.map(({ label }) => label),
            {
              blockId: "concept-chain",
              assessment: "ordered",
              questionType: "positions",
            },
          )
        : null,
    recallTrials = chainTrial ? [...meaningTrials, chainTrial] : meaningTrials,
    flow = [
      flowBlock("concept-instruction", "instruction", "Fogalomból kép"),
      ...content.flatMap((_, index) => [
        flowBlock(
          `concept-imagine-block-${index + 1}`,
          "encoding",
          "2 mp mentális kép",
          { stepIds: [`concept-imagine-${index + 1}`], durationMs: 2000 },
        ),
        flowBlock(
          `concept-symbol-block-${index + 1}`,
          "encoding",
          "Saját szimbólum",
          { stepIds: [`concept-symbol-${index + 1}`] },
        ),
      ]),
      flowBlock("concept-delay", "distractor", "Megtartási szünet", {
        durationMs: settings.delayMs,
        gateId: "concept-delay-gate",
      }),
      flowBlock("concept-meaning-block", "recall", "Jelentések", {
        trialIds: meaningTrials.map(({ id }) => id),
      }),
      ...(chainTrial
        ? [
            flowBlock("concept-chain-block", "recall", "Fogalomlánc", {
              trialIds: [chainTrial.id],
            }),
          ]
        : []),
      flowBlock("concept-feedback", "feedback", "Jelentés és bizonytalanság", {
        feedbackFor: recallTrials.map(({ id }) => id),
      }),
    ];
  return basePlan(settings, seed, content, encodingSteps, recallTrials, flow);
}
function reviewPlan(settings, seed) {
  if (!settings.reviewSnapshot.length)
    invalid(
      "review kör csak esedékes, szerverről feloldott reviewSnapshotból indítható",
    );
  const rows = settings.reviewSnapshot.slice(0, settings.itemCount),
    content = rows.flatMap((row) =>
      row.content.map((item) => ({
        ...clone(item),
        id: `${row.id}:${item.id}`,
      })),
    ),
    recallTrials = rows.map((row, index) => {
      const encoding = row.encoding.find(
          ({ association }) => association.trim().length > 0,
        ),
        firstContent = row.content[0],
        itemIds = row.content.map((item) => `${row.id}:${item.id}`);
      return makeTrial(
        `review-${row.id}`,
        index,
        row.prompt,
        ["verbatim", "digits"].includes(row.assessment)
          ? "text"
          : Array.isArray(row.expected)
            ? "free-list"
            : "free",
        itemIds,
        row.expected,
        {
          phase: "delayed",
          blockId: "review",
          assessment: row.assessment,
          hints: row.hints,
          cue: {
            ...(encoding ? { associationStepId: encoding.stepId } : {}),
            ...(encoding?.strategy ? { strategy: encoding.strategy } : {}),
            ...(firstContent?.anchorId
              ? { anchor: firstContent.anchorId }
              : {}),
            ...(firstContent?.visual
              ? { visual: clone(firstContent.visual) }
              : {}),
          },
          rubric: row.rubric ? stripPrivateRubric(row.rubric) : undefined,
        },
      );
    }),
    flow = [
      flowBlock("review-instruction", "instruction", "Esedékes régi anyag"),
      flowBlock("review-recall-block", "recall", "Aktív felidézés", {
        trialIds: recallTrials.map(({ id }) => id),
      }),
      flowBlock("review-feedback", "feedback", "Következő ismétlés", {
        feedbackFor: recallTrials.map(({ id }) => id),
      }),
    ];
  return basePlan(settings, seed, content, [], recallTrials, flow, {
    sourceActivity: rows[0].sourceActivity,
    reviewItems: [],
  });
}
function bossPlan(settings, seed, rng) {
  const palace = selectedResource(settings, "palace"),
    peg = selectedResource(settings, "peg"),
    list = sample(HANNA_OBJECTS, 5, rng),
    face = sample(HANNA_FACES, 1, rng)[0],
    concept = sample(HANNA_CONCEPTS, 1, rng)[0],
    digits = Array.from({ length: 8 }, () =>
      String(Math.floor(rng() * 10)),
    ).join(""),
    content = [
      ...list.map((item, index) => ({
        ...itemFromObject(item, "boss-list"),
        id: `boss-list-${index + 1}-${item.id}`,
        position: index + 1,
      })),
      {
        id: `boss-${face.id}`,
        kind: "face",
        label: face.label,
        portraitId: face.portraitId,
        fact: face.fact,
        visual: clone(face.visual),
      },
      {
        id: "boss-number",
        kind: "digit",
        label: digits,
        visual: visual("number", digits),
      },
      {
        id: `boss-${concept.id}`,
        kind: "concept",
        label: concept.label,
        meaning: concept.meaning,
        visual: clone(concept.visual),
      },
    ],
    strategyOptions = (section) => {
      const places = (palace?.data.locations ?? HANNA_ROUTE).slice(0, 5).map(row => row.name ?? row.label);
      const pegs = (peg?.data.entries ?? HANNA_PEGS).slice(0, 5).map(row => row.label);
      const pairs = digits.match(/.{2}/g).map(code => ({code, label: numberWords(settings).get(code) || code}));
      const targets = section === "list" ? list.map(row => row.label)
        : section === "face" ? [`${face.label} → ${face.keyword}`, face.fact]
        : section === "number" ? pairs.map(row => `${row.code} → ${row.label}`)
        : [concept.keyword, concept.meaning];
      const firstVisual = section === "face" ? clone(face.visual)
        : section === "number" ? visual("number", pairs[0].code, {label:pairs[0].label})
        : section === "concept" ? clone(concept.visual)
        : visual("scene", "boss-list-chain", {action:"collides-and-shatters", parts:list.slice(0,2).map((row,index)=>({role:index?"target":"actor",key:row.id,label:row.label}))});
      const chainExampleText = section === "list" ? associationTeachingScenes(list[0],list[1]).interaction
        : section === "face" ? `A név hangzáskulcsa: ${face.label} → ${face.keyword}. Kapcsold ehhez a semleges arcvonáshoz: ${face.trait}. A jelenetben jelenjen meg az is, hogy ${face.fact}.`
        : section === "number" ? `Bontsd párokra: ${targets.join("; ")}. Fűzd a négy képet egyetlen mozgó történetté; a számokat majd a képekből fejted vissza.`
        : `Képötlet: ${concept.keyword}. Kapcsold ehhez a jelentést: ${concept.meaning} A saját jeleneted mutassa meg a kapcsolatot, ne csak a fogalom nevét.`;
      return [
        {id:"chain",label:section==="face"?"Névkulcs és történet":section==="number"?"Számképek lánca":section==="concept"?"Kép és jelentés":"Láncsztori",description:section==="list"?"Szomszédos képkapcsolatok.":"A most tanult részhez illő képes történet.",anchors:targets,example:chainExampleText,visual:firstVisual},
        {id:"loci",label:"Memóriapalota",description:"A tényleges helyekre kötött jelenetek.",anchors:places.slice(0,targets.length),example:targets.map((target,index)=>`${places[index]}: ${target}`).join(" · ")+". Alkoss minden helyen kölcsönható jelenetet, majd járd be ebben a sorrendben.",visual:visual("location",palace?.data.locations?.[0]?.id ?? HANNA_ROUTE[0].id)},
        {id:"peg",label:"Peg rendszer",description:"A mostani rész számozott horgokon.",anchors:pegs.slice(0,targets.length),example:targets.map((target,index)=>`${index+1}. ${pegs[index]} → ${target}`).join(" · ")+". A horgot kösd össze a célképpel; felidézéskor indulj a számból.",visual:visual("number",String(targets.length))},
      ];
    },
    encodingSteps = [
      {
        id: "boss-list-encoding",
        kind: "boss-section",
        itemIds: content.slice(0, 5).map(({ id }) => id),
        title: "Vegyes lista",
        prompt: "Válassz módszert és rögzítsd a saját kapcsolatot.",
        strategyOptions: strategyOptions("list"),
      },
      {
        id: "boss-face-encoding",
        kind: "boss-section",
        itemIds: [content[5].id],
        title: "Arc és név",
        prompt: "Válassz módszert.",
        strategyOptions: strategyOptions("face"),
      },
      {
        id: "boss-number-encoding",
        kind: "boss-section",
        itemIds: ["boss-number"],
        title: "Számsor",
        prompt: "Válassz módszert.",
        strategyOptions: strategyOptions("number"),
      },
      {
        id: "boss-concept-encoding",
        kind: "boss-section",
        itemIds: [content[7].id],
        title: "Fogalom",
        prompt: "Válassz módszert.",
        strategyOptions: strategyOptions("concept"),
      },
    ],
    recallTrials = [
      makeTrial(
        "boss-list",
        0,
        "Írd le a vegyes listát sorrendben.",
        "free-list",
        content.slice(0, 5).map(({ id }) => id),
        list.map(({ label }) => label),
        { blockId: "boss-list", assessment: "ordered" },
      ),
      makeTrial(
        "boss-face",
        1,
        "Mi a portrén látható személy neve?",
        "free",
        [content[5].id],
        face.label,
        {
          blockId: "boss-face",
          questionType: "name",
          visual: clone(face.visual),
        },
      ),
      makeTrial(
        "boss-number",
        2,
        "Írd vissza a nyolc számjegyet.",
        "text",
        ["boss-number"],
        digits,
        { blockId: "boss-number", assessment: "digits", label: "digits" },
      ),
      makeTrial(
        "boss-concept",
        3,
        `Mit jelent: ${concept.label}?`,
        "text",
        [content[7].id],
        concept.meaning,
        {
          blockId: "boss-concept",
          assessment: "rubric",
          rubric: [{ id: "boss-concept-meaning", label: "A fogalom lényege" }],
        },
      ),
    ],
    flow = [
      flowBlock(
        "boss-instruction",
        "instruction",
        "Módszerválasztás részenként",
      ),
      flowBlock("boss-encoding", "encoding", "Négy stratégiai döntés", {
        stepIds: encodingSteps.map(({ id }) => id),
      }),
      flowBlock("boss-delay", "distractor", "Megtartási szünet", {
        durationMs: settings.delayMs,
        gateId: "boss-delay-gate",
      }),
      ...recallTrials.map((trial) =>
        flowBlock(`${trial.id}-block`, "recall", trial.prompt, {
          trialIds: [trial.id],
        }),
      ),
      flowBlock("boss-feedback", "feedback", "Részenkénti eredmény", {
        feedbackFor: recallTrials.map(({ id }) => id),
      }),
    ];
  return basePlan(settings, seed, content, encodingSteps, recallTrials, flow);
}

export function generateHannaSession(rawSettings, seed, resources) {
  void resources;
  const settings = normalizeHannaSettings(rawSettings);
  if (
    settings.resourceIds.some(
      (id) => !settings.resourceSnapshot.some((resource) => resource.id === id),
    )
  )
    invalid(
      "minden resourceId-hoz szerverről feloldott resourceSnapshot szükséges",
    );
  if (
    settings.reviewIds.some(
      (id) => !settings.reviewSnapshot.some((review) => review.id === id),
    )
  )
    invalid(
      "minden reviewId-hoz szerverről feloldott reviewSnapshot szükséges",
    );
  if (
    settings.activity === "palace" &&
    !settings.resourceSnapshot.some(({ kind }) => kind === "palace")
  )
    invalid("a saját palotához szerverről feloldott palace resource szükséges");
  const palace = settings.resourceSnapshot.find(
    ({ kind }) => kind === "palace",
  );
  if (["loci", "palace"].includes(settings.activity) && palace && !palace.ready)
    invalid("a saját palota csak 90%-os útvonalteszt után használható");
  const rng = seededRandom(seed),
    builders = {
      baseline: baselinePlan,
      chain: chainPlan,
      association: associationPlan,
      loci: lociPlan,
      palace: palacePlan,
      peg: pegPlan,
      faces: facesPlan,
      keyword: keywordPlan,
      major: majorPlan,
      numbers: numbersPlan,
      random: randomPlan,
      text: textPlan,
      concept: conceptPlan,
      review: reviewPlan,
      boss: bossPlan,
    };
  return builders[settings.activity](settings, seed, rng);
}

function maskedRecallAssociation(association, trial) {
  let masked = association;
  const terms = [trial.expected, ...(trial.accepted ?? [])]
    .flat()
    .filter((value) => typeof value === "string" && value.length > 1)
    .sort((left, right) => right.length - left.length);
  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    masked = masked.replace(new RegExp(escaped, "giu"), "[…]");
  }
  return masked;
}

export function bindHannaRecallSupport(plan, answerEncoding = []) {
  if (!isObject(plan) || plan.version !== 2)
    invalid("bindHannaRecallSupport V2 tervet vár");
  if (!Array.isArray(answerEncoding) || answerEncoding.length > 500)
    invalid("answerEncoding legfeljebb 500 elemű lista legyen");
  const result = clone(plan),
    stepMap = new Map(result.encodingSteps.map((step) => [step.id, step])),
    bindingKeys = new Set(),
    bindings = [];
  const rows = answerEncoding.map((entry, index) => {
    if (!isObject(entry)) invalid(`answerEncoding[${index}] objektum legyen`);
    const stepId = textValue(entry.stepId, `answerEncoding[${index}].stepId`, {
        max: 160,
      }),
      step = stepMap.get(stepId);
    if (!step) invalid("answerEncoding idegen stepId-t tartalmaz");
    const strategy =
        entry.strategy === undefined
          ? undefined
          : textValue(entry.strategy, "answerEncoding.strategy", { max: 100 }),
      option = strategy
        ? step.strategyOptions?.find(({ id }) => id === strategy)
        : undefined;
    if (strategy && !option) invalid("answerEncoding stratégia nem támogatott");
    const roundId =
        entry.roundId === undefined
          ? undefined
          : textValue(entry.roundId, "answerEncoding.roundId", { max: 160 }),
      round = roundId
        ? step.rounds?.find(({ id }) => id === roundId)
        : undefined;
    if (roundId && !round) invalid("answerEncoding idegen roundId-t tartalmaz");
    const choiceId =
        entry.choiceId === undefined
          ? undefined
          : textValue(entry.choiceId, "answerEncoding.choiceId", { max: 160 }),
      choice = choiceId
        ? round?.choices.find(({ id }) => id === choiceId)
        : undefined;
    if (choiceId && !choice)
      invalid("answerEncoding idegen choiceId-t tartalmaz");
    const key = `${stepId}|${roundId ?? ""}`;
    if (bindingKeys.has(key))
      invalid("answerEncoding ugyanazt a körhivatkozást ismétli");
    bindingKeys.add(key);
    return {
      step,
      stepId,
      strategy,
      option,
      roundId,
      choiceId,
      choice,
      association:
        entry.association === undefined
          ? ""
          : textValue(entry.association, "answerEncoding.association", {
              min: 0,
              max: 2000,
            }),
    };
  });
  result.recallTrials = result.recallTrials.map((trial) => {
    const row = rows.find(({ step, stepId, roundId }) => {
      if (trial.activationRoundId)
        return roundId === trial.activationRoundId;
      if (trial.cue?.associationStepId === stepId) return true;
      if (plan.activity === "boss") return stepId === `${trial.id}-encoding`;
      return step.itemIds.some((itemId) => trial.itemIds.includes(itemId));
    });
    if (!row) return trial;
    const anchor = row.option?.anchors?.[0],
      visualHint = row.option?.description,
      associationHint = row.association || row.choice?.explanation || "",
      next = {
        ...trial,
        hints: [
          anchor ? `${row.option.label}: ${anchor}` : trial.hints[0],
          (associationHint
            ? maskedRecallAssociation(associationHint, trial)
            : "") || trial.hints[1],
          visualHint || trial.hints[2],
        ],
        cue: {
          ...(trial.cue ?? {}),
          associationStepId: row.stepId,
          ...(row.strategy ? { strategy: row.strategy } : {}),
          ...(anchor ? { anchor } : {}),
          ...(row.option?.visual ? { visual: clone(row.option.visual), visualHintOnly: true } : {}),
        },
      };
    bindings.push({
      trialId: trial.id,
      associationStepId: row.stepId,
      roundId: row.roundId ?? null,
      choiceId: row.choiceId ?? null,
      strategy: row.strategy ?? null,
      anchor: anchor ?? null,
      associationRecorded: row.association.length > 0,
    });
    return next;
  });
  result.supportBindings = bindings;
  return deepFreeze(result);
}

function validateAnswer(plan, answer, context) {
  if (!isObject(answer)) invalid("answer objektum legyen");
  let bytes;
  try {
    bytes = new TextEncoder().encode(JSON.stringify(answer)).length;
  } catch {
    invalid("answer nem szerializálható");
  }
  if (bytes > MAX_PAYLOAD_BYTES)
    invalid("answer payload legfeljebb 1 MB lehet");
  allowedObject(
    answer,
    [
      "version",
      "startedAt",
      "completedAt",
      "events",
      "encoding",
      "training",
      "responses",
      "encodingDurationMs",
      "delayDurationMs",
      "strategy",
    ],
    "answer",
  );
  integer(answer.version, "answer.version", 2, 2);
  const started = Date.parse(isoValue(answer.startedAt, "startedAt")),
    completed = Date.parse(isoValue(answer.completedAt, "completedAt"));
  if (completed < started)
    invalid("completedAt nem előzheti meg startedAt értékét");
  const serverDuration =
      context.serverDurationMs === undefined
        ? MAX_DURATION_MS
        : integer(
            context.serverDurationMs,
            "serverDurationMs",
            0,
            MAX_DURATION_MS,
          ),
    encodingDurationMs = integer(
      answer.encodingDurationMs ?? 0,
      "encodingDurationMs",
      0,
      serverDuration,
    ),
    delayDurationMs = integer(
      answer.delayDurationMs ?? 0,
      "delayDurationMs",
      0,
      serverDuration,
    );
  if (!Array.isArray(answer.events) || answer.events.length > 4096)
    invalid("events legfeljebb 4096 elemű lista legyen");
  const eventIds = new Set(),
    gateIds = new Set(plan.flow.map(({ gateId }) => gateId).filter(Boolean)),
    eventStepMap = new Map(plan.encodingSteps.map((step) => [step.id, step])),
    allTrialIds = new Set([
      ...plan.recallTrials.map(({ id }) => id),
      ...(plan.training?.trials ?? []).map(({ id }) => id),
    ]),
    events = answer.events.map((entry, index) => {
      allowedObject(
        entry,
        [
          "eventId",
          "type",
          "atMs",
          "stepId",
          "roundId",
          "trialId",
          "value",
          "gateId",
        ],
        "event",
      );
      const eventId = textValue(entry.eventId, `events[${index}].eventId`, {
        max: 120,
      });
      if (eventIds.has(eventId)) invalid("eventId nem ismétlődhet");
      eventIds.add(eventId);
      const type = enumValue(entry.type, EVENT_TYPES, "event.type");
      const trialId =
          entry.trialId === undefined
            ? undefined
            : textValue(entry.trialId, "event.trialId", { max: 180 }),
        stepId =
          entry.stepId === undefined
            ? undefined
            : textValue(entry.stepId, "event.stepId", { max: 160 }),
        step = stepId ? eventStepMap.get(stepId) : undefined,
        roundId =
          entry.roundId === undefined
            ? undefined
            : textValue(entry.roundId, "event.roundId", { max: 160 }),
        gateId =
        entry.gateId === undefined
          ? undefined
          : textValue(entry.gateId, "event.gateId", { max: 160 });
      if (trialId && !allTrialIds.has(trialId))
        invalid("event idegen trialId-t tartalmaz");
      if (stepId && !step) invalid("event idegen stepId-t tartalmaz");
      if (roundId && !stepId)
        invalid("event roundId csak stepId mellett használható");
      if (roundId && !step?.rounds?.some(({ id }) => id === roundId))
        invalid("event idegen roundId-t tartalmaz");
      if (gateId && !gateIds.has(gateId))
        invalid("event idegen gateId-t tartalmaz");
      if (["gate-prepare", "gate-ready"].includes(type) && !gateId)
        invalid(type + " eseményhez gateId szükséges");
      if (type === "encoding-commit" && !stepId)
        invalid("encoding-commit eseményhez stepId szükséges");
      if (type === "association-choice" && (!stepId || !roundId))
        invalid("association-choice eseményhez stepId és roundId szükséges");
      if (type === "association-time" && !stepId)
        invalid("association-time eseményhez stepId szükséges");
      if (type === "association-choice" && step?.kind !== "association-sprint")
        invalid("association-choice csak képkapcsoló lépéshez tartozhat");
      if (type === "recall-response" && !trialId)
        invalid("recall-response eseményhez trialId szükséges");
      if (["hint", "show-answer"].includes(type) && !trialId)
        invalid(type + " eseményhez trialId szükséges");
      if (type === "location-select" && !stepId)
        invalid("location-select eseményhez stepId szükséges");
      return {
        ...clone(entry),
        eventId,
        type,
        ...(stepId ? { stepId } : {}),
        ...(roundId ? { roundId } : {}),
        ...(trialId ? { trialId } : {}),
        ...(gateId ? { gateId } : {}),
        atMs: numberValue(entry.atMs, "event.atMs", 0, serverDuration),
      };
    });
  if (!Array.isArray(answer.encoding) || answer.encoding.length > 500)
    invalid("encoding legfeljebb 500 elemű lista legyen");
  const stepMap = new Map(plan.encodingSteps.map((step) => [step.id, step])),
    encodingKeys = new Set(),
    encoding = answer.encoding.map((entry, index) => {
      allowedObject(
        entry,
        [
          "stepId",
          "itemId",
          "association",
          "checks",
          "hintLevel",
          "strategy",
          "choiceId",
          "roundId",
          "rtMs",
        ],
        "encoding entry",
      );
      const stepId = textValue(entry.stepId, `encoding[${index}].stepId`, {
          max: 160,
        }),
        step = stepMap.get(stepId);
      if (!step) invalid("encoding idegen stepId-t tartalmaz");
      const itemId =
        entry.itemId === undefined
          ? undefined
          : textValue(entry.itemId, "encoding.itemId", { max: 160 });
      if (itemId && !step.itemIds.includes(itemId))
        invalid("encoding itemId nem tartozik a lépéshez");
      const roundId =
          entry.roundId === undefined
            ? undefined
            : textValue(entry.roundId, "encoding.roundId", { max: 160 }),
        round = roundId
          ? step.rounds?.find(({ id }) => id === roundId)
          : undefined;
      if (roundId && !round) invalid("encoding idegen roundId-t tartalmaz");
      const choiceId =
        entry.choiceId === undefined
          ? undefined
          : textValue(entry.choiceId, "encoding.choiceId", { max: 160 });
      if (choiceId && !round?.choices.some(({ id }) => id === choiceId))
        invalid("encoding idegen choiceId-t tartalmaz");
      const key = `${stepId}|${roundId ?? ""}|${itemId ?? ""}`;
      if (encodingKeys.has(key))
        invalid("ugyanaz az encoding egység nem ismétlődhet");
      encodingKeys.add(key);
      const strategy =
        entry.strategy === undefined
          ? undefined
          : textValue(entry.strategy, "encoding.strategy", { max: 100 });
      if (
        strategy &&
        step.strategyOptions &&
        !step.strategyOptions.some(({ id }) => id === strategy)
      )
        invalid("encoding stratégia nem támogatott");
      const association =
        entry.association === undefined
          ? ""
          : textValue(entry.association, "encoding.association", {
              min: 0,
              max: 2000,
            });
      if (step.kind === "association-sprint" && !roundId)
        invalid("a feldolgozott képpárhoz roundId szükséges");
      if (step.kind === "association-sprint" && !choiceId && !association)
        invalid("a feldolgozott képpárhoz választás vagy saját ötlet szükséges");
      return {
        stepId,
        ...(itemId ? { itemId } : {}),
        association,
        checks: Array.isArray(entry.checks)
          ? entry.checks.map((value) =>
              textValue(value, "encoding.check", { max: 100 }),
            )
          : [],
        hintLevel: integer(entry.hintLevel ?? 0, "encoding.hintLevel", 0, 4),
        ...(strategy ? { strategy } : {}),
        ...(choiceId ? { choiceId } : {}),
        ...(roundId ? { roundId } : {}),
        ...(entry.rtMs !== undefined
          ? {
              rtMs: numberValue(entry.rtMs, "encoding.rtMs", 0, serverDuration),
            }
          : {}),
      };
    });
  if (!Array.isArray(answer.training ?? [])) invalid("training lista legyen");
  const trainingMap = new Map(
      (plan.training?.trials ?? []).map((trial) => [trial.id, trial]),
    ),
    trainingSeen = new Set(),
    training = (answer.training ?? []).map((entry, index) => {
      allowedObject(entry, ["trialId", "value", "rtMs"], "training entry");
      const trialId = textValue(entry.trialId, `training[${index}].trialId`, {
        max: 160,
      });
      if (trainingSeen.has(trialId))
        invalid("training trialId nem ismétlődhet");
      trainingSeen.add(trialId);
      const trial = trainingMap.get(trialId);
      if (!trial) invalid("training idegen trialId-t tartalmaz");
      const value = textValue(entry.value, "training.value", {
        min: 0,
        max: 500,
      });
      if (value && !trial.choices.some((choice) => choice.value === value))
        invalid("training idegen választ tartalmaz");
      return {
        trialId,
        value,
        rtMs: numberValue(entry.rtMs, "training.rtMs", 0, serverDuration),
      };
    });
  if (
    !Array.isArray(answer.responses) ||
    answer.responses.length > plan.recallTrials.length
  )
    invalid("responses legfeljebb a trialok száma lehet");
  const trialMap = new Map(plan.recallTrials.map((trial) => [trial.id, trial])),
    activatedRoundIds = new Set(
      encoding
        .filter(({ stepId, roundId }) =>
          roundId && stepMap.get(stepId)?.kind === "association-sprint",
        )
        .map(({ roundId }) => roundId),
    ),
    responseSeen = new Set(),
    responses = answer.responses.map((entry, index) => {
      allowedObject(
        entry,
        [
          "trialId",
          "value",
          "rtMs",
          "hintLevel",
          "selfAssessment",
          "needsReview",
        ],
        "response",
      );
      const trialId = textValue(entry.trialId, `responses[${index}].trialId`, {
        max: 180,
      });
      if (responseSeen.has(trialId))
        invalid("egy trialId pontosan egyszer válaszolható");
      responseSeen.add(trialId);
      const trial = trialMap.get(trialId);
      if (!trial) invalid("responses idegen trialId-t tartalmaz");
      if (
        trial.activationRoundId &&
        !activatedRoundIds.has(trial.activationRoundId)
      )
        invalid("aktiválatlan képpár recall trialja nem válaszolható");
      let value = entry.value;
      if (typeof value === "string") {
        if (value.length > MAX_TEXT) invalid("response.value túl hosszú");
      } else if (Array.isArray(value)) {
        if (
          value.length > 100 ||
          value.some((item) => typeof item !== "string" || item.length > 500)
        )
          invalid("response.value érvénytelen lista");
        value = [...value];
      } else invalid("response.value szöveg vagy szöveglista legyen");
      if (
        trial.kind === "choice" &&
        value !== "" &&
        !trial.choices.some((choice) => choice.value === value)
      )
        invalid("idegen választás");
      if (trial.kind === "multi" && !Array.isArray(value))
        invalid("többes válasz listát vár");
      if (
        trial.kind === "multi" &&
        trial.accessMode === "choice" &&
        value.some(
          (selected) =>
            !trial.choices.some((choice) => choice.value === selected),
        )
      )
        invalid("idegen többes választás");
      if (
        ["free-list"].includes(trial.kind) &&
        !(Array.isArray(value) || typeof value === "string")
      )
        invalid("free-list szöveget vagy listát vár");
      if (
        trial.assessment === "digits" &&
        (typeof value !== "string" ||
          !/^\d*$/.test(value) ||
          value.length > String(trial.expected).length)
      )
        invalid(`legfeljebb ${String(trial.expected).length} számjegy adható`);
      let selfAssessment = [];
      if (entry.selfAssessment !== undefined) {
        if (
          !Array.isArray(entry.selfAssessment) ||
          entry.selfAssessment.length > 100
        )
          invalid("selfAssessment érvénytelen");
        const ids = new Set();
        selfAssessment = entry.selfAssessment.map((row) => {
          allowedObject(row, ["rubricId", "present"], "selfAssessment row");
          const rubricId = textValue(row.rubricId, "selfAssessment.rubricId", {
            max: 100,
          });
          if (ids.has(rubricId))
            invalid("selfAssessment rubricId nem ismétlődhet");
          ids.add(rubricId);
          if (typeof row.present !== "boolean")
            invalid("selfAssessment.present logikai legyen");
          return { rubricId, present: row.present };
        });
      }
      return {
        trialId,
        value: clone(value),
        rtMs: numberValue(entry.rtMs, "response.rtMs", 0, serverDuration),
        hintLevel: integer(entry.hintLevel ?? 0, "response.hintLevel", 0, 4),
        selfAssessment,
        needsReview: booleanValue(
          entry.needsReview,
          false,
          "response.needsReview",
        ),
      };
    });
  const strategy =
    answer.strategy === undefined
      ? null
      : typeof answer.strategy === "string"
        ? textValue(answer.strategy, "strategy", { max: 100 })
        : clone(answer.strategy);
  return {
    events,
    encoding,
    training,
    responses,
    encodingDurationMs,
    delayDurationMs,
    strategy,
  };
}

function listValue(value) {
  if (Array.isArray(value))
    return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value ?? "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}
function sequenceAlignment(expected, actual) {
  const left = expected.map(normalizedText),
    right = actual.map(normalizedText),
    rows = left.length + 1,
    cols = right.length + 1,
    dp = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 1; i < rows; i += 1)
    for (let j = 1; j < cols; j += 1)
      dp[i][j] =
        left[i - 1] === right[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
  let i = left.length,
    j = right.length,
    aligned = [];
  while (i || j) {
    if (i && j && left[i - 1] === right[j - 1]) {
      aligned.push({
        expected: expected[i - 1],
        actual: actual[j - 1],
        correct: true,
      });
      i--;
      j--;
    } else if (j && (!i || dp[i][j - 1] >= dp[i - 1][j])) {
      aligned.push({
        expected: "—",
        actual: actual[j - 1],
        correct: false,
        kind: "extra",
      });
      j--;
    } else {
      aligned.push({
        expected: expected[i - 1],
        actual: "—",
        correct: false,
        kind: "missing",
      });
      i--;
    }
  }
  return aligned.reverse();
}
function wordAlignment(expected, actual) {
  return sequenceAlignment(
    normalizedText(expected).split(" ").filter(Boolean),
    normalizedText(actual).split(" ").filter(Boolean),
  );
}
function phraseMatch(actual, phrase) {
  const a = normalizedText(actual),
    p = normalizedText(phrase);
  if (!a || !p) return false;
  if (a.includes(p)) return true;
  const wanted = tokens(p),
    found = new Set(tokens(a));
  return (
    wanted.length >= 2 &&
    wanted.filter((token) => found.has(token)).length / wanted.length >= 0.75
  );
}
function uncertain(value) {
  return /\b(talan|nem biztos|bizonytalan|lehet hogy|szerintem talan|ketlem|ketelked(?:em|ik|nek)?|allitolag|hamis|teves)\b/.test(
    normalizedText(value),
  );
}

function rubricClauses(sentence) {
  return String(sentence)
    .split(
      /\s*,\s*(?:(?:hanem|majd|de|azonban|viszont)\s+)?|\s+(?:és|majd|de|azonban|viszont|hanem)\s+/iu,
    )
    .map((part) => part.trim())
    .filter(Boolean);
}

function rubricSpans(value) {
  const raw = String(value)
      .split(/[.!?;\n]+/)
      .map((part) => part.trim())
      .filter(Boolean),
    spans = [];
  for (let index = 0; index < raw.length; index += 1) {
    let sentence = raw[index];
    const next = raw[index + 1] ?? "";
    if (
      /^(ez|ezt|azt)\b/.test(normalizedText(next)) &&
      uncertain(next)
    ) {
      sentence = `${sentence}. ${next}`;
      index += 1;
    }
    spans.push(sentence);
    const clauses = rubricClauses(sentence);
    spans.push(...clauses);
    spans.push(
      ...clauses
        .slice(0, -1)
        .map((clause, clauseIndex) => `${clause} ${clauses[clauseIndex + 1]}`),
    );
  }
  return [...new Set(spans.length ? spans : [String(value)])];
}

function contributingClauseEvidence(actual, phrase) {
  const wanted = [
      ...new Set(
        tokens(phrase).filter((token) => !NEGATION_WORDS.has(token)),
      ),
    ],
    wantedSet = new Set(wanted);
  if (!wanted.length) return [];
  const contribution = (clause) => {
      const clauseTokens = tokens(clause),
        found = new Set(),
        matchedPositions = [];
      clauseTokens.forEach((token, index) => {
        if (!wantedSet.has(token)) return;
        found.add(token);
        matchedPositions.push(index);
      });
      if (!matchedPositions.length) return { found, negated: false };
      let start = Math.min(...matchedPositions);
      const end = Math.max(...matchedPositions);
      while (start > 0 && NEGATION_WORDS.has(clauseTokens[start - 1]))
        start -= 1;
      return {
        found,
        negated: clauseTokens
          .slice(start, end + 1)
          .some((token) => NEGATION_WORDS.has(token)),
      };
    },
    combine = (parts, polarityParts = parts) => {
      const found = new Set();
      for (const part of parts)
        for (const token of part.found) found.add(token);
      return {
        found,
        negated: polarityParts.some(({ negated }) => negated),
      };
    },
    evidence = [];
  for (const sentence of String(actual)
    .split(/[.!?;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)) {
    const clauses = rubricClauses(sentence),
      parts = clauses.map(contribution),
      candidates = [
        ...parts,
        ...parts
          .slice(0, -1)
          .map((part, index) => combine([part, parts[index + 1]])),
        combine(parts),
      ],
      contrast = sentence.split(/\bhanem\b/iu);
    if (contrast.length > 1) {
      const before = rubricClauses(contrast.shift()).map(contribution),
        after = rubricClauses(contrast.join(" hanem ")).map(contribution),
        beforeCombined = combine(before),
        afterCombined = combine(after),
        postAddsWantedToken = [...afterCombined.found].some(
          (token) => !beforeCombined.found.has(token),
        );
      if (postAddsWantedToken)
        candidates.push({
          ...combine([...before, ...after], after),
          contrastive: true,
        });
    }
    evidence.push(
      ...candidates.map(({ found, negated, contrastive }) => ({
        overlap: wanted.filter((token) => found.has(token)).length / wanted.length,
        polarity: negated ? 1 : 0,
        contrastive: contrastive === true,
      })),
    );
  }
  return evidence;
}

function scopedUncertainty(actual, acceptedPhrases) {
  return rubricSpans(actual).some((span) => {
    if (!uncertain(span)) return false;
    const found = new Set(tokens(span));
    return acceptedPhrases.some((phrase) => {
      const wanted = tokens(phrase);
      return (
        wanted.length > 0 &&
        wanted.filter((token) => found.has(token)).length / wanted.length >=
          0.75
      );
    });
  });
}

const NEGATION_WORDS = new Set(["nem", "nincs", "nincsen", "sem", "se"]);

function negationPolarity(value) {
  return tokens(value).filter((token) => NEGATION_WORDS.has(token)).length % 2;
}

function negationConflict(actual, acceptedPhrases) {
  return acceptedPhrases.some((phrase) => {
    const expectedTokens = tokens(phrase).filter(
      (token) => !NEGATION_WORDS.has(token),
    );
    if (expectedTokens.length < 2) return false;
    const qualifying = contributingClauseEvidence(actual, phrase).filter(
        ({ overlap }) => overlap >= 0.75,
      ),
      expectedPolarity = negationPolarity(phrase);
    return (
      !qualifying.some(({ polarity }) => polarity === expectedPolarity) &&
      qualifying.some(({ polarity }) => polarity !== expectedPolarity)
    );
  });
}

function explicitContradiction(actual, phrase) {
  return contributingClauseEvidence(actual, phrase).some(
    ({ overlap, polarity, contrastive }) =>
      !contrastive &&
      overlap === 1 &&
      polarity === negationPolarity(phrase),
  );
}

function rubricOutcome(actual, row, selfAssessment, explicitNeedsReview) {
  const acceptedPhrases = row.accepted ?? [],
    authoredContradiction = (row.contradictions ?? []).some((phrase) =>
      explicitContradiction(actual, phrase),
    ),
    acceptedNegated = negationConflict(actual, acceptedPhrases),
    contradiction = authoredContradiction || acceptedNegated,
    accepted = acceptedPhrases.some((phrase) => phraseMatch(actual, phrase));
  const self = selfAssessment.find(({ rubricId }) => rubricId === row.id);
  const needsReview =
    explicitNeedsReview ||
    acceptedPhrases.length === 0 ||
    scopedUncertainty(actual, acceptedPhrases) ||
    (self?.present === true && !accepted);
  return {
    correct: accepted && !contradiction && !needsReview,
    contradiction,
    contradictionKind: authoredContradiction
      ? "authored"
      : acceptedNegated
        ? "accepted-negated"
        : null,
    needsReview,
  };
}
function privateRubric(plan, trial, context) {
  if (plan.activity === "text") {
    const built = HANNA_TEXTS.find(({ id }) => id === plan.sourceTextId);
    if (built) return built.rubric;
    const resources = context.privateSettings?.hannaResourceSnapshot ?? [];
    return (
      resources.find(({ kind }) => kind === "material")?.data?.rubric ??
      trial.rubric ??
      []
    );
  }
  if (plan.activity === "concept") {
    const item = plan.content.find(({ id }) => trial.itemIds.includes(id));
    return [
      {
        id: trial.rubric?.[0]?.id ?? `meaning-${item?.id}`,
        label: "A definíció lényege",
        accepted: [item?.meaning].filter(Boolean),
        contradictions: [],
      },
    ];
  }
  if (plan.activity === "boss" && trial.id === "boss-concept") {
    const item = plan.content.find(({ id }) => trial.itemIds.includes(id));
    return [
      {
        id: "boss-concept-meaning",
        label: "A fogalom lényege",
        accepted: [item?.meaning].filter(Boolean),
        contradictions: [],
      },
    ];
  }
  if (plan.activity === "review") {
    const id = trial.id.replace(/^review-/, "");
    const snapshots =
      context.privateSettings?.hannaReviewSnapshot ??
      plan.settings.reviewSnapshot ??
      [];
    const row = snapshots.find((entry) => entry.id === id);
    return (
      (row?.rubric
        ? row.rubric.map((criterion) => ({
            ...criterion,
            accepted:
              criterion.accepted?.length > 0
                ? criterion.accepted
                : [row.expected, ...(row.accepted ?? [])].flat(),
            contradictions:
              criterion.contradictions ?? row.contradictions ?? [],
          }))
        : null) ??
      (row
        ? [
            {
              id: `review-${id}`,
              label: "Elfogadott válasz",
              accepted: [row.expected, ...(row.accepted ?? [])].flat(),
              contradictions: row.contradictions ?? [],
            },
          ]
        : [])
    );
  }
  return trial.rubric ?? [];
}
function eventHintLevel(events, trialId) {
  let level = 0;
  for (const event of events) {
    if (
      !["hint", "show-answer"].includes(event.type) ||
      (event.trialId !== undefined && event.trialId !== trialId)
    )
      continue;
    if (event.type === "show-answer") level = 4;
    else
      level = Math.max(
        level,
        Number(event.value?.hintLevel ?? event.value ?? 1) || 1,
      );
  }
  return Math.min(4, level);
}

export function evaluateHannaTrainingGate(training, answers) {
  if (!isObject(training) || !Array.isArray(training.trials))
    invalid("training terv szükséges");
  if (!Array.isArray(answers)) invalid("training answers lista legyen");
  const trialMap = new Map(training.trials.map((trial) => [trial.id, trial])),
    seen = new Set(),
    responseById = new Map();
  for (const [index, row] of answers.entries()) {
    allowedObject(row, ["trialId", "value", "rtMs"], "training[" + index + "]");
    const trialId = textValue(row.trialId, "training trialId", { max: 160 });
    if (seen.has(trialId)) invalid("training trialId nem ismétlődhet");
    if (!trialMap.has(trialId))
      invalid("training idegen trialId-t tartalmaz");
    seen.add(trialId);
    responseById.set(trialId, {
      trialId,
      value: textValue(row.value, "training value", { min: 0, max: 500 }),
      rtMs: numberValue(row.rtMs, "training rtMs", 0, MAX_DURATION_MS),
    });
  }

  const evidence = [];
  let rawCorrect = 0,
    correct = 0;
  const rts = [];
  for (const trial of training.trials) {
    const response = responseById.get(trial.id),
      answerCorrect =
        Boolean(response) &&
        normalizedText(response.value) === normalizedText(trial.expected),
      timingEligible = Boolean(response) && response.rtMs >= 100,
      evidenceCorrect = answerCorrect && timingEligible;
    rawCorrect += answerCorrect ? 1 : 0;
    correct += evidenceCorrect ? 1 : 0;
    if (evidenceCorrect) rts.push(response.rtMs);
    evidence.push({
      itemId: trial.itemId,
      direction: trial.direction,
      correct: evidenceCorrect,
      answerCorrect,
      timingEligible,
      rtMs: response?.rtMs ?? null,
    });
  }
  const accuracy = training.trials.length
      ? correct / training.trials.length
      : null,
    medianRtMs = median(rts),
    passed =
      accuracy !== null &&
      accuracy >= training.threshold.accuracy &&
      (training.threshold.medianRtMs === undefined ||
        (medianRtMs !== null &&
          medianRtMs < training.threshold.medianRtMs));
  return deepFreeze({
    kind: training.kind,
    scopeKey: training.scopeKey,
    correct,
    rawCorrect,
    total: training.trials.length,
    accuracy,
    medianRtMs,
    threshold: clone(training.threshold),
    passed,
    coverage: clone(training.coverage),
    evidence,
    timingEvidence: {
      source: "browser-monotonic-clock",
      serverVerified: false,
    },
  });
}

function scoreAttempt(plan, attempt, context) {
  const responseMap = new Map(
      attempt.responses.map((row) => [row.trialId, row]),
    ),
    activatedRoundIds = new Set(
      attempt.encoding.map(({ roundId }) => roundId).filter(Boolean),
    ),
    details = [],
    correctRts = [],
    trialResults = [],
    blockMap = new Map(),
    subscales = {},
    qualityFlags = [];
  let correct = 0,
    total = 0,
    independentCorrect = 0,
    independentEligibleTotal = 0,
    independentHelpUsed = false,
    assistedCorrect = 0,
    orderCorrect = 0,
    orderTotal = 0,
    digitCorrect = 0,
    digitTotal = 0;
  for (const trial of plan.recallTrials) {
    if (
      trial.activationRoundId &&
      !activatedRoundIds.has(trial.activationRoundId)
    )
      continue;
    const response = responseMap.get(trial.id),
      actual = response?.value ?? "",
      hintLevel = Math.max(
        response?.hintLevel ?? 0,
        eventHintLevel(attempt.events, trial.id),
      );
    if (trial.accessMode !== "choice" && hintLevel > 0)
      independentHelpUsed = true;
    let trialCorrect = 0,
      trialTotal = 1,
      trialNeedsReview = false,
      trialContradiction = false;
    if (trial.assessment === "digits") {
      const expected = String(trial.expected),
        provided = String(actual);
      trialTotal = expected.length;
      for (let index = 0; index < expected.length; index += 1) {
        const hit = provided[index] === expected[index];
        trialCorrect += hit ? 1 : 0;
        details.push({
          label: `${index + 1}. számjegy`,
          actual: provided[index] ?? "—",
          expected: expected[index],
          correct: hit,
        });
      }
      digitCorrect += trialCorrect;
      digitTotal += trialTotal;
    } else if (trial.assessment === "verbatim") {
      const alignment = wordAlignment(trial.expected, String(actual));
      trialTotal = Math.max(
        1,
        normalizedText(trial.expected).split(" ").filter(Boolean).length,
      );
      trialCorrect = alignment.filter(({ correct: hit }) => hit).length;
      details.push(
        ...alignment.map((row, index) => ({
          label: `${index + 1}. szó`,
          actual: row.actual,
          expected: row.expected,
          correct: row.correct,
          feedback:
            row.kind === "missing"
              ? "Kimaradt szó."
              : row.kind === "extra"
                ? "Többletszó."
                : undefined,
        })),
      );
    } else if (trial.assessment === "rubric") {
      const rubric = privateRubric(plan, trial, context);
      trialTotal = Math.max(1, rubric.length);
      for (const row of rubric) {
        const outcome = rubricOutcome(
          String(actual),
          row,
          response?.selfAssessment ?? [],
          response?.needsReview ?? false,
        );
        trialCorrect += outcome.correct ? 1 : 0;
        trialNeedsReview ||= outcome.needsReview;
        trialContradiction ||= outcome.contradiction;
        details.push({
          label: row.label,
          actual: response ? String(actual) : "—",
          expected: row.label,
          correct: outcome.correct,
          needsReview: outcome.needsReview,
          feedback: outcome.contradictionKind === "authored"
            ? "A válaszban szerepel a szerkesztett ellentmondó állítás."
            : outcome.contradictionKind === "accepted-negated"
              ? "A válasz tagadja az elfogadott kulcsgondolatot."
            : outcome.needsReview
              ? "Bizonytalan vagy csak önértékelt válasz: ellenőrzést kér."
              : outcome.correct
                ? "A szerkesztett elfogadott megfogalmazás lényege szerepel."
                : "A kulcsgondolat nem azonosítható a szerkesztett alakokból.",
        });
      }
    } else if (Array.isArray(trial.expected)) {
      const provided = listValue(actual);
      if (trial.assessment === "set") {
        const capacity = new Map();
        for (const item of trial.expected) {
          const key = normalizedText(item);
          capacity.set(key, (capacity.get(key) ?? 0) + 1);
        }
        trialTotal = trial.expected.length;
        for (const value of provided) {
          const key = normalizedText(value),
            remaining = capacity.get(key) ?? 0;
          if (remaining) {
            trialCorrect++;
            capacity.set(key, remaining - 1);
          }
        }
        for (const expected of trial.expected)
          details.push({
            label: trial.prompt,
            actual: provided.join(", ") || "—",
            expected,
            correct: provided.some(
              (value) => normalizedText(value) === normalizedText(expected),
            ),
          });
      } else {
        const alignment = sequenceAlignment(trial.expected, provided);
        trialTotal = trial.expected.length;
        trialCorrect = alignment.filter(({ correct: hit }) => hit).length;
        orderCorrect += trialCorrect;
        orderTotal += trialTotal;
        details.push(
          ...alignment.map((row, index) => ({
            label: `${trial.prompt} · ${index + 1}`,
            actual: row.actual,
            expected: row.expected,
            correct: row.correct,
          })),
        );
      }
    } else {
      const accepted = [trial.expected];
      if (plan.activity === "review") {
        const row = (context.privateSettings?.hannaReviewSnapshot ?? []).find(
          ({ id }) => `review-${id}` === trial.id,
        );
        if (row) accepted.push(...(row.accepted ?? []));
      }
      const hit =
        !!response &&
        accepted.some(
          (value) => normalizedText(value) === normalizedText(actual),
        );
      trialCorrect = hit ? 1 : 0;
      details.push({
        label: trial.prompt,
        actual: response ? String(actual) || "—" : "—",
        expected: trial.expected,
        correct: hit,
        feedback: response
          ? hintLevel === 4
            ? "Megoldásmutatás után segített felidézés."
            : undefined
          : "Kihagyott válasz.",
      });
    }
    correct += trialCorrect;
    total += trialTotal;
    if (trial.accessMode !== "choice")
      independentEligibleTotal += trialTotal;
    trialResults.push({
      trialId: trial.id,
      correct: trialCorrect,
      total: trialTotal,
      accuracy: trialTotal ? trialCorrect / trialTotal : null,
      needsReview: trialNeedsReview,
      contradiction: trialContradiction,
      hintLevel,
      rtMs: response?.rtMs ?? null,
      repeatExposure: trial.repeatExposure === true,
    });
    if (trialCorrect && response) {
      if (response.rtMs >= MIN_PLAUSIBLE_RT_MS)
        correctRts.push(response.rtMs);
      if (hintLevel === 0 && trial.accessMode !== "choice")
        independentCorrect += trialCorrect;
      else assistedCorrect += trialCorrect;
    }
    const block = blockMap.get(trial.blockId) ?? {
      id: trial.blockId,
      ...(trial.blockId === "peg-forward"
        ? { label: "Tárgyak előre" }
        : trial.blockId === "peg-reverse"
          ? { label: "Tárgyak visszafelé" }
          : trial.blockId === "peg-random"
            ? { label: "Tárgyak horogszám alapján" }
            : {}),
      correct: 0,
      total: 0,
      needsReview: 0,
      contradictions: 0,
      repeatExposureTrials: 0,
    };
    block.correct += trialCorrect;
    block.total += trialTotal;
    block.needsReview += trialNeedsReview ? 1 : 0;
    block.contradictions += trialContradiction ? 1 : 0;
    block.repeatExposureTrials += trial.repeatExposure === true ? 1 : 0;
    blockMap.set(trial.blockId, block);
  }
  for (const block of blockMap.values()) {
    block.accuracy = block.total ? block.correct / block.total : null;
  }
  if (plan.activity === "baseline") {
    for (const block of blockMap.values())
      subscales[block.id] = {
        correct: block.correct,
        total: block.total,
        accuracy: block.accuracy,
      };
  }
  if (plan.activity === "text") {
    subscales.textImmediate = clone(blockMap.get("text-immediate") ?? null);
    subscales.textDelayed = clone(blockMap.get("text-delayed") ?? null);
  }
  if (plan.activity === "association") {
    const activatedTrials = plan.recallTrials.filter(({ activationRoundId }) =>
      activatedRoundIds.has(activationRoundId),
    );
    subscales.association = {
      processedPairs: activatedRoundIds.size,
      uniqueConnections: new Set(
        activatedTrials.map(({ connectionId, id }) => connectionId ?? id),
      ).size,
      repeatedExposures: activatedTrials.filter(({ repeatExposure }) =>
        Boolean(repeatExposure),
      ).length,
      recalledPairs: trialResults.filter(({ rtMs }) => rtMs !== null).length,
      correct,
      total,
    };
  }
  if (plan.activity === "chain") {
    const orderedTrial = plan.recallTrials.find(
        ({ id }) => id === "chain-ordered",
      ),
      orderedResponse = responseMap.get("chain-ordered"),
      expected = orderedTrial?.expected ?? [],
      actual = listValue(orderedResponse?.value ?? []),
      brokenPairs = [];
    let correctPairs = 0;
    for (let index = 0; index < Math.max(0, expected.length - 1); index += 1) {
      const hit =
        normalizedText(actual[index]) === normalizedText(expected[index]) &&
        normalizedText(actual[index + 1]) ===
          normalizedText(expected[index + 1]);
      if (hit) correctPairs += 1;
      else
        brokenPairs.push({
          leftPosition: index + 1,
          rightPosition: index + 2,
        });
    }
    subscales.chainNeighbors = {
      correctPairs,
      totalPairs: Math.max(0, expected.length - 1),
      brokenPairs,
    };
  }
  if (plan.activity === "boss") {
    for (const id of ["boss-list", "boss-face", "boss-number", "boss-concept"])
      subscales[id] = clone(blockMap.get(id) ?? null);
    subscales.bossStrategy = ["list", "face", "number", "concept"].map(
      (section) => {
        const stepId = `boss-${section}-encoding`,
          encoding = attempt.encoding.find((entry) => entry.stepId === stepId);
        return {
          section,
          strategy: encoding?.strategy ?? null,
          associationRecorded: Boolean(encoding?.association),
        };
      },
    );
  }
  if (digitTotal)
    subscales.number = {
      digitsCorrect: digitCorrect,
      digitsTotal: digitTotal,
      digitsPerMinute: plausibleEncodingDuration(
        attempt.encodingDurationMs,
        digitTotal,
      )
        ? Number(
            (digitCorrect / (attempt.encodingDurationMs / 60_000)).toFixed(2),
          )
        : null,
    };
  let trainingMetric = null;
  if (plan.training) {
    trainingMetric = evaluateHannaTrainingGate(
      plan.training,
      attempt.training,
    );
    subscales.training = trainingMetric;
    if (!trainingMetric.passed)
      qualityFlags.push(`${plan.training.kind}-training-gate-not-met`);
  }
  if (
    attempt.events.some(({ type }) => type === "show-answer") ||
    attempt.responses.some(({ hintLevel }) => hintLevel === 4)
  )
    qualityFlags.push("solution-viewed");
  if (
    attempt.events.some(({ type }) => ["hint", "show-answer"].includes(type)) ||
    attempt.responses.some(({ hintLevel }) => hintLevel > 0)
  )
    qualityFlags.push("help-used");
  if (attempt.events.some(({ type }) => type === "restart"))
    qualityFlags.push("restarted");
  const repeatExposureTrialIds = plan.recallTrials
    .filter(({ repeatExposure }) => repeatExposure === true)
    .map(({ id }) => id);
  if (repeatExposureTrialIds.length) {
    qualityFlags.push("within-session-repeat-exposure");
    subscales.repeatExposure = {
      trialIds: repeatExposureTrialIds,
      answered: trialResults.filter(
        ({ trialId, rtMs }) =>
          rtMs !== null && repeatExposureTrialIds.includes(trialId),
      ).length,
    };
  }
  const clientRts = [
    ...attempt.encoding.map(({ rtMs }) => rtMs).filter(Number.isFinite),
    ...attempt.training.map(({ rtMs }) => rtMs),
    ...attempt.responses.map(({ rtMs }) => rtMs),
  ];
  if (clientRts.length) qualityFlags.push("client-timing");
  if (clientRts.some((rtMs) => rtMs < MIN_PLAUSIBLE_RT_MS))
    qualityFlags.push("implausibly-fast");
  const encodedUnitCount =
    plan.activity === "association"
      ? activatedRoundIds.size
      : plan.content.length;
  if (
    attempt.encodingDurationMs > 0 &&
    !plausibleEncodingDuration(
      attempt.encodingDurationMs,
      encodedUnitCount,
    )
  )
    qualityFlags.push("implausible-encoding-duration");
  return {
    correct,
    total,
    details,
    independentCorrect,
    independentEligibleTotal,
    independentHelpUsed,
    assistedCorrect,
    orderAccuracy: orderTotal ? orderCorrect / orderTotal : null,
    medianCorrectRtMs: median(correctRts),
    blockResults: [...blockMap.values()],
    trialResults,
    subscales,
    trainingMetric,
    qualityFlags,
  };
}

function nextStep(steps, current, direction) {
  const index = Math.max(0, steps.indexOf(current));
  return steps[Math.max(0, Math.min(steps.length - 1, index + direction))];
}
function adaptation(settings, scored) {
  const accuracy = scored.total ? scored.correct / scored.total : 0,
    independence = scored.independentEligibleTotal
      ? scored.independentCorrect / scored.independentEligibleTotal
      : null,
    speed = scored.medianCorrectRtMs,
    next = {
      itemCount: settings.itemCount,
      delayMs: settings.delayMs,
      similarity: settings.similarity,
      interferenceLevel: settings.interferenceLevel,
      contentLevel: settings.contentLevel,
      recallMode: settings.recallMode,
    };
  const reasons = [];
  if (!settings.adaptive)
    return {
      nextItemCount: settings.itemCount,
      nextSettings: next,
      reason: "Az adaptív mód ki van kapcsolva.",
    };
  if (!scored.total)
    return {
      nextItemCount: settings.itemCount,
      nextSettings: next,
      reason: "Nincs feldolgozott és felidézhető egység; a beállítás változatlan.",
    };
  const steps = COUNT_RULES[settings.activity].steps,
    fixedToResourceSize =
      (settings.activity === "peg" &&
        settings.resourceSnapshot.some(({ kind }) => kind === "peg")) ||
      (settings.activity === "major" &&
        settings.resourceSnapshot.some(({ kind }) => kind === "major")) ||
      (["loci", "palace"].includes(settings.activity) &&
        settings.resourceSnapshot.some(({ kind }) => kind === "palace")) ||
      settings.activity === "random" ||
      settings.activity === "review",
    delayRelevant = !["random", "review"].includes(settings.activity),
    similarityRelevant = ["chain", "association"].includes(settings.activity),
    interferenceRelevant = !["random", "review"].includes(settings.activity);
  if (accuracy >= 0.9 && (independence === null || independence >= 0.8)) {
    if (!fixedToResourceSize)
      next.itemCount = nextStep(steps, settings.itemCount, 1);
    if (
      delayRelevant &&
      next.itemCount === settings.itemCount &&
      settings.delayMs < 300_000
    )
      next.delayMs = Math.min(
        300_000,
        Math.max(settings.delayMs + 10_000, settings.delayMs * 2),
      );
    if (similarityRelevant && settings.similarity === "varied")
      next.similarity = "similar";
    else if (interferenceRelevant)
      next.interferenceLevel = Math.min(2, settings.interferenceLevel + 1);
    reasons.push(
      independence === null
        ? "pontos választásos felismerés"
        : "pontos és nagyrészt önálló felidézés",
    );
  } else if (accuracy < 0.6) {
    if (!fixedToResourceSize)
      next.itemCount = nextStep(steps, settings.itemCount, -1);
    if (similarityRelevant) next.similarity = "varied";
    if (interferenceRelevant)
      next.interferenceLevel = Math.max(0, settings.interferenceLevel - 1);
    if (delayRelevant)
      next.delayMs = Math.max(10_000, Math.floor(settings.delayMs / 2));
    reasons.push("sok hibás vagy kihagyott egység");
  } else if (independence !== null && independence < 0.65) {
    if (interferenceRelevant)
      next.interferenceLevel = Math.max(0, settings.interferenceLevel - 1);
    reasons.push("a segítség nélkül helyes arány még ingadozó");
  } else if (speed !== null && speed > 5000) {
    if (!fixedToResourceSize)
      next.itemCount = nextStep(steps, settings.itemCount, -1);
    reasons.push("a helyes hozzáférés lassú volt");
  } else reasons.push("a jelenlegi paramétercsomag megfelelő");
  if (
    ["chain", "association"].includes(settings.activity) &&
    accuracy >= 0.9 &&
    settings.contentLevel === "concrete"
  )
    next.contentLevel = "mixed";
  return {
    nextItemCount: next.itemCount,
    nextSettings: next,
    reason: `Következő beállítás: ${reasons.join("; ")}.`,
  };
}
function dimensions(plan, scored, attempt, retentionMs, measurementReady) {
  if (!measurementReady)
    return {
      encodingSpeed: null,
      immediateRecall: null,
      delayedRecall: null,
      sequenceMemory: null,
      randomAccess: null,
      nameMemory: null,
      numberMemory: null,
      associativeMemory: null,
      longTermRetention: null,
      strategyIndependence: null,
    };
  const accuracy = scored.total ? scored.correct / scored.total : null,
    independence = scored.independentEligibleTotal
      ? scored.independentCorrect / scored.independentEligibleTotal
      : null,
    blocks = new Map(scored.blockResults.map((block) => [block.id, block])),
    practice = (value, evidence = "practice") => ({
      value,
      unit: "ratio",
      evidence,
    }),
    randomBlocks = [...blocks.values()].filter(({ id }) =>
      id.includes("random"),
    ),
    randomTrials = plan.recallTrials.filter(({ blockId }) =>
      String(blockId).includes("random"),
    ),
    randomResponses = attempt.responses.filter(({ trialId }) =>
      randomTrials.some(({ id }) => id === trialId),
    ),
    randomAccuracy = average(randomBlocks.map(({ accuracy }) => accuracy)),
    encodedItemCount =
      plan.activity === "association"
        ? scored.subscales.association?.processedPairs ?? 0
        : plan.content.length;
  return {
    encodingSpeed: {
      value:
        plausibleEncodingDuration(
          attempt.encodingDurationMs,
          encodedItemCount,
        )
          ? Number(
              (
                encodedItemCount /
                (attempt.encodingDurationMs / 60_000)
              ).toFixed(2),
            )
          : null,
      unit: "items/min",
      evidence: "practice",
    },
    immediateRecall:
      plan.activity === "baseline"
        ? practice(
            average(
              [...blocks.values()]
                .filter(({ id }) => id.includes("immediate"))
                .map(({ accuracy }) => accuracy),
            ),
            "practice",
          )
        : plan.activity === "text"
          ? practice(blocks.get("text-immediate")?.accuracy ?? null, "practice")
          : null,
    delayedRecall:
      plan.activity === "baseline"
        ? practice(
            average(
              [...blocks.values()]
                .filter(({ id }) => id.includes("delayed"))
                .map(({ accuracy }) => accuracy),
            ),
            "practice",
          )
        : plan.activity === "text"
          ? practice(blocks.get("text-delayed")?.accuracy ?? null, "practice")
          : plan.activity === "review"
            ? retentionMs !== null &&
              retentionMs > 0 &&
              retentionMs < 86_400_000
              ? practice(accuracy, "practice")
              : null
            : retentionMs !== null && retentionMs >= 0
              ? practice(accuracy, "practice")
              : null,
    sequenceMemory:
      scored.orderAccuracy === null
        ? null
        : practice(scored.orderAccuracy, "practice"),
    randomAccess: randomBlocks.length
      ? {
          value: median(
            randomResponses
              .map(({ rtMs }) => rtMs)
              .filter((rtMs) => rtMs >= MIN_PLAUSIBLE_RT_MS),
          ),
          unit: "ms",
          accuracy: randomAccuracy,
        }
      : null,
    nameMemory:
      plan.activity === "faces" || blocks.has("boss-face")
        ? practice(
            average(
              [...blocks.values()]
                .filter(({ id }) => id.includes("name") || id === "boss-face")
                .map(({ accuracy }) => accuracy),
            ),
            "practice",
          )
        : null,
    numberMemory: scored.subscales.number
      ? practice(
          scored.subscales.number.digitsCorrect /
            scored.subscales.number.digitsTotal,
          "practice",
        )
      : null,
    associativeMemory: ["association", "keyword"].includes(plan.activity)
      ? practice(accuracy, "practice")
      : null,
    longTermRetention:
      plan.activity === "review" &&
      retentionMs !== null &&
      retentionMs >= 86_400_000
        ? { value: accuracy, unit: "ratio", retentionMs }
        : null,
    strategyIndependence:
      scored.independentEligibleTotal === 0
        ? null
        : practice(
            independence,
            scored.independentHelpUsed ? "assisted" : "independent",
          ),
  };
}
function average(values) {
  const filtered = values.filter((value) => typeof value === "number");
  return filtered.length
    ? filtered.reduce((sum, value) => sum + value, 0) / filtered.length
    : null;
}
export function scoreHannaAttempt(rawSettings, seed, answer, context = {}) {
  let settings = normalizeHannaSettings(rawSettings);
  const privateSettings = context.privateSettings ?? {};
  if (
    privateSettings.hannaResourceSnapshot ||
    privateSettings.hannaReviewSnapshot ||
    privateSettings.hannaLearnedSnapshot ||
    privateSettings.hannaTrainingMastery
  )
    settings = normalizeHannaSettings({
      ...settings,
      ...(privateSettings.hannaResourceSnapshot
        ? { resourceSnapshot: privateSettings.hannaResourceSnapshot }
        : {}),
      ...(privateSettings.hannaReviewSnapshot
        ? { reviewSnapshot: privateSettings.hannaReviewSnapshot }
        : {}),
      ...(privateSettings.hannaLearnedSnapshot
        ? { learnedSnapshot: privateSettings.hannaLearnedSnapshot }
        : {}),
      ...(privateSettings.hannaTrainingMastery
        ? { trainingMastery: privateSettings.hannaTrainingMastery }
        : {}),
    });
  const generated = generateHannaSession(settings, seed),
    plan = context.hannaPlanSnapshot ?? context.planSnapshot ?? generated;
  if (
    plan.version !== 2 ||
    plan.activity !== settings.activity ||
    plan.seed !== seed
  )
    invalid("a scorer context tervpillanatképe nem ehhez a körhöz tartozik");
  const attempt = validateAnswer(plan, answer, context),
    scored = scoreAttempt(plan, attempt, context),
    accuracy = scored.total ? scored.correct / scored.total : null,
    rawPercent = Math.round((accuracy ?? 0) * 100),
    trainingRequired = Boolean(plan.training?.trials.length),
    trainingPassed =
      !trainingRequired || scored.trainingMetric?.passed === true,
    encodingRequired = plan.activity === "association",
    encodingPassed = !encodingRequired || scored.total > 0,
    completion = {
      status: !encodingPassed
        ? "encoding-incomplete"
        : trainingPassed
          ? "complete"
          : "training-incomplete",
      trainingRequired,
      trainingAnswered: attempt.training.length,
      trainingPassed,
      ...(encodingRequired ? { encodingRequired, encodingPassed } : {}),
    },
    percent = trainingPassed && encodingPassed ? rawPercent : null,
    retentionMs =
      context.serverRetentionMs === undefined
        ? null
        : integer(
            context.serverRetentionMs,
            "serverRetentionMs",
            -Number.MAX_SAFE_INTEGER,
            Number.MAX_SAFE_INTEGER,
          ),
    qualityFlags = [...scored.qualityFlags];
  if (retentionMs === null) qualityFlags.push("retention-unverified");
  if (retentionMs !== null && retentionMs < 0)
    qualityFlags.push("retention-clock-invalid");
  if (plan.activity === "association")
    qualityFlags.push("association-creativity-not-objectively-scored");
  const reviewOutcomes =
    plan.activity === "review"
      ? plan.recallTrials.map((trial) => {
          const trialResult = scored.trialResults.find(
              ({ trialId }) => trialId === trial.id,
            ),
            response = attempt.responses.find(
              ({ trialId }) => trialId === trial.id,
            );
          return {
            itemId: trial.id.replace(/^review-/, ""),
            correct: (trialResult?.accuracy ?? 0) === 1,
            rtMs:
              (response?.rtMs ?? 0) >= MIN_PLAUSIBLE_RT_MS
                ? response.rtMs
                : null,
            hintLevel: trialResult?.hintLevel ?? response?.hintLevel ?? 0,
            nextIntervalMs: nextHannaReview({
              correct: (trialResult?.accuracy ?? 0) === 1,
              rtMs:
                (response?.rtMs ?? 0) >= MIN_PLAUSIBLE_RT_MS
                  ? response.rtMs
                  : null,
              hintLevel: trialResult?.hintLevel ?? response?.hintLevel ?? 0,
              previousIntervalMs:
                settings.reviewSnapshot.find(
                  ({ id }) => `review-${id}` === trial.id,
                )?.intervalMs ?? INTERVALS[0],
            }),
          };
        })
      : [];
  const metrics = {
    schemaVersion: 2,
    familyId: "hanna-method",
    activity: settings.activity,
    technique: ACTIVITY_BY_ID[settings.activity].technique,
    accuracy,
    orderAccuracy: scored.orderAccuracy,
    independentCorrect: scored.independentCorrect,
    independentEligibleTotal: scored.independentEligibleTotal,
    assistedCorrect: scored.assistedCorrect,
    medianCorrectRtMs: scored.medianCorrectRtMs,
    encodingDurationMs: attempt.encodingDurationMs,
    timingEvidence: {
      source: "browser-monotonic-clock",
      serverVerified: false,
    },
    retentionMs,
    retentionActualMs: retentionMs,
    comparabilityKey: [
      "hanna-method:v2",
      settings.activity,
      settings.itemCount,
      settings.recallMode,
      settings.contentLevel,
      settings.delayMs,
      settings.similarity,
      `i${settings.interferenceLevel}`,
    ].join(":"),
    blockResults: scored.blockResults,
    trialResults: scored.trialResults,
    subscales: scored.subscales,
    dimensions: dimensions(
      plan,
      scored,
      attempt,
      retentionMs,
      completion.status === "complete",
    ),
    adaptation: adaptation(settings, scored),
    qualityFlags,
    reviewOutcomes,
    completion,
  };
  return {
    correct: scored.correct,
    total: scored.total,
    percent,
    summary: completion.status === "complete"
      ? `${scored.correct}/${scored.total} felidézési egység helyes. Ez készségfejlesztő gyakorlási eredmény; a kreativitást és feltételezett mentális okokat nem pontozzuk.`
      : completion.status === "encoding-incomplete"
        ? "A képkapcsoló sprintben még nem készült el egyetlen pár sem; nincs végleges felidézési százalék."
        : `A betanítási kapu még nem teljesült; a ${scored.correct}/${scored.total} nyers felidézési egység nem kap végleges százalékot.`,
    details: scored.details,
    metrics,
    stars: null,
    starBasis: "hanna-method-no-stars",
  };
}

export function createHannaLearnedSnapshot(plan, answer, context = {}) {
  if (
    !isObject(plan) ||
    plan.version !== 2 ||
    !["chain", "loci", "palace", "peg"].includes(plan.activity)
  )
    invalid(
      "csak befejezett chain/loci/palace/peg V2 tervből készülhet learnedSnapshot",
    );
  const attempt = validateAnswer(plan, answer, {
    serverDurationMs: MAX_DURATION_MS,
  });
  if (context.completed === false)
    invalid("befejezetlen körből nem készülhet learnedSnapshot");
  if (!attempt.encoding.length)
    invalid("learnedSnapshothoz legalább egy érvényes encoding rekord kell");
  if (
    !attempt.responses.some(({ value }) =>
      Array.isArray(value)
        ? value.some((item) => item.trim().length > 0)
        : value.trim().length > 0,
    )
  )
    invalid("learnedSnapshothoz legalább egy nem üres felidézés kell");
  const anchors =
    plan.activity === "chain"
      ? plan.content.map((item, index) => ({
          id: `chain-position-${index + 1}`,
          label: `${index + 1}. hely`,
          position: index + 1,
          kind: "position",
          visual: visual("number", String(index + 1), { number: index + 1 }),
        }))
      : plan.activity === "peg"
        ? (plan.training?.items ?? []).map((item) => ({
            id: item.anchorId,
            label: item.label,
            position: item.number,
            kind: "peg",
            visual: clone(item.visual),
          }))
        : plan.content.map((item) => ({
            id: item.anchorId,
            label: item.location,
            position: item.position,
            kind: "location",
            visual:
              clone(
                plan.training?.items.find(
                  ({ anchorId }) => anchorId === item.anchorId,
                )?.visual,
              ) ??
              visual("location", item.locationId, {
                label: item.location,
              }),
          }));
  return deepFreeze({
    version: 2,
    sourceActivity: plan.activity,
    content: clone(plan.content),
    encoding: clone(attempt.encoding),
    anchors,
    sourceLabel: plan.instructions.title,
    learnedAt: answer.completedAt,
  });
}

export function createPalaceReadinessTrials(resource) {
  const wrapper =
      resource?.kind === "palace" && resource.data ? resource : null,
    data = normalizeHannaResource("palace", wrapper ? resource.data : resource),
    prefix = wrapper
      ? `resource:${textValue(wrapper.id, "palace resource id", { max: 120 })}:r${integer(wrapper.revision ?? 1, "palace revision", 1, 1_000_000)}:location`
      : "resource:preview:r1:location",
    items = data.locations.map((location, index) => ({
      id: `${prefix}:${location.id}`,
      label: location.name,
      position: index + 1,
      visual: visual("location", location.id, {
        label: location.name,
        position: index + 1,
      }),
    })),
    trials = [];
  for (let index = 0; index < items.length; index += 1) {
    trials.push({
      id: `readiness-position-${index + 1}`,
      relation: "position",
      position: index + 1,
      anchorId: items[index].id,
      prompt: `Mi a(z) ${index + 1}. hely?`,
      expected: items[index].label,
    });
    if (index > 0)
      trials.push({
        id: `readiness-before-${index + 1}`,
        relation: "before",
        position: index + 1,
        anchorId: items[index].id,
        prompt: `Mi van ${items[index].label} előtt?`,
        expected: items[index - 1].label,
      });
    if (index < items.length - 1)
      trials.push({
        id: `readiness-after-${index + 1}`,
        relation: "after",
        position: index + 1,
        anchorId: items[index].id,
        prompt: `Mi van ${items[index].label} után?`,
        expected: items[index + 1].label,
      });
  }
  return deepFreeze({
    version: 2,
    resourceId: wrapper?.id ?? null,
    revision: wrapper?.revision ?? 1,
    items,
    trials,
    threshold: 0.9,
  });
}
export function evaluatePalaceReadiness(resource, answer) {
  const plan = createPalaceReadinessTrials(resource);
  allowedObject(
    answer,
    ["version", "revision", "answers"],
    "palace readiness answer",
  );
  integer(answer.version, "answer.version", 2, 2);
  if (
    integer(answer.revision, "answer.revision", 1, 1_000_000) !== plan.revision
  )
    invalid("a palota verziója időközben megváltozott");
  if (
    !Array.isArray(answer.answers) ||
    answer.answers.length > plan.trials.length
  )
    invalid("readiness answers túl sok elemet tartalmaz");
  const seen = new Set(),
    byId = new Map(plan.trials.map((trial) => [trial.id, trial])),
    responses = new Map();
  for (const [index, row] of answer.answers.entries()) {
    allowedObject(row, ["trialId", "value"], `answers[${index}]`);
    const trialId = textValue(row.trialId, "readiness trialId", { max: 160 });
    if (seen.has(trialId)) invalid("readiness trialId nem ismétlődhet");
    seen.add(trialId);
    if (!byId.has(trialId)) invalid("readiness idegen trialId-t tartalmaz");
    responses.set(
      trialId,
      textValue(row.value, "readiness value", { min: 0, max: 200 }),
    );
  }
  const details = plan.trials.map((trial) => {
      const actual = responses.get(trial.id) ?? "",
        returnValue = {
          trialId: trial.id,
          relation: trial.relation,
          actual: actual || "—",
          expected: trial.expected,
          correct: normalizedText(actual) === normalizedText(trial.expected),
        };
      return returnValue;
    }),
    correct = details.filter(({ correct: hit }) => hit).length,
    total = details.length,
    percent = Math.round((correct / total) * 100);
  return {
    version: 2,
    correct,
    total,
    percent,
    ready: correct / total >= plan.threshold,
    threshold: plan.threshold,
    details,
  };
}
export function nextHannaReview({
  correct,
  rtMs,
  hintLevel,
  previousIntervalMs = INTERVALS[0],
}) {
  if (typeof correct !== "boolean") invalid("correct logikai érték legyen");
  integer(hintLevel, "hintLevel", 0, 4);
  integer(
    previousIntervalMs,
    "previousIntervalMs",
    INTERVALS[0],
    31_536_000_000,
  );
  if (rtMs !== null) numberValue(rtMs, "rtMs", 0, MAX_DURATION_MS);
  if (!correct || hintLevel === 4) return INTERVALS[0];
  let index = 0;
  for (let cursor = 0; cursor < INTERVALS.length; cursor += 1)
    if (previousIntervalMs >= INTERVALS[cursor]) index = cursor;
  const advance =
    rtMs === null || hintLevel > 0 || rtMs >= 5000
      ? 1
      : rtMs < 2000
        ? 2
        : 1;
  return INTERVALS[Math.min(INTERVALS.length - 1, index + advance)];
}
