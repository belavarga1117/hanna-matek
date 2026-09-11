import {
  HANNA_OBJECTS as V1_OBJECTS,
  HANNA_PEGS as V1_PEGS,
  HU_MAJOR_DIGITS as V1_MAJOR_DIGITS,
  HU_MAJOR_WORDS as V1_MAJOR_WORDS,
} from "./content-v1.js";

const freezeRows = (rows) =>
  Object.freeze(rows.map((row) => Object.freeze(row)));
const visual = (type, key, extra = {}) =>
  Object.freeze({ type, key, ...extra });

const MAJOR_EXAMPLES = Object.freeze({
  0: "őz",
  1: "tea",
  2: "nő",
  3: "méh",
  4: "őr",
  5: "ló",
  6: "só",
  7: "kő",
  8: "fa",
  9: "bója",
});

export const HU_MAJOR_DIGITS = freezeRows(
  V1_MAJOR_DIGITS.map((item) => ({
    ...item,
    sounds: Object.freeze([...item.sounds]),
    example: MAJOR_EXAMPLES[item.digit],
  })),
);

const MAJOR_WORD_OVERRIDES = Object.freeze({
  "09": "zab",
  28: "név",
  40: "réz",
  63: "som",
  87: "fóka",
});
export const HU_MAJOR_WORDS = freezeRows(
  V1_MAJOR_WORDS.map((item) => ({
    ...item,
    label: MAJOR_WORD_OVERRIDES[item.code] ?? item.label,
  })),
);

export const HANNA_ACTIVITIES = freezeRows([
  {
    id: "baseline",
    title: "Startteszt",
    technique: "Saját kiindulópont",
    description: "Szó, kép és szám azonnali, majd késleltetett felidézése.",
    instruction:
      "Tanuld meg az egyes listákat, majd szóbank nélkül idézd fel őket.",
    icon: "baseline",
    recallModes: ["free"],
    defaultRecallMode: "free",
  },
  {
    id: "chain",
    title: "Láncsztori",
    technique: "Szomszédos képkapcsolás",
    description:
      "Egyetlen történetlánc rendezett, szabad és véletlen hozzáféréssel.",
    instruction:
      "Minden szomszédos pár között alkoss mozgó, túlzó, érzékszervi és kölcsönható jelenetet.",
    icon: "chain",
    recallModes: ["ordered"],
    defaultRecallMode: "ordered",
  },
  {
    id: "association",
    title: "Képkapcsoló",
    technique: "Gyors képfúzió",
    description: "Több pár 30 vagy 60 másodperces aktív körben.",
    instruction:
      "Alkoss saját jelenetet, vagy válassz négy illusztrált példa közül; a későbbi felidézés külön számít.",
    icon: "association",
    recallModes: ["free", "choice"],
    defaultRecallMode: "free",
  },
  {
    id: "loci",
    title: "Memóriaútvonal",
    technique: "Stabil helyek",
    description:
      "Vezetett útvonal, tárgyelhelyezés, előre, hátra és véletlen felidézés.",
    instruction:
      "Tanuld meg a helyeket és szomszédaikat, majd minden tárgyat egy konkrét helyhez kapcsolj.",
    icon: "loci",
    recallModes: ["ordered"],
    defaultRecallMode: "ordered",
  },
  {
    id: "palace",
    title: "Saját palota",
    technique: "Személyes útvonal",
    description: "A saját, 90%-ra megtanult helyeidből épülő gyakorlat.",
    instruction:
      "Járd be a mentett útvonalat, és minden tárgyat egy stabil saját helyhez köss.",
    icon: "palace",
    recallModes: ["random"],
    defaultRecallMode: "random",
  },
  {
    id: "peg",
    title: "Peg Master",
    technique: "Szám–horog rendszer",
    description:
      "Teljes 10, 20 vagy 100 horgos lefedettség és kétirányú automatizálás.",
    instruction:
      "Előbb a szám és horog két irányát gyakorold, majd kapcsold hozzá az új tárgyakat.",
    icon: "peg",
    recallModes: ["random"],
    defaultRecallMode: "random",
  },
  {
    id: "faces",
    title: "Ki kicsoda?",
    technique: "Névkulcs és arcvonás",
    description: "Legalább húsz külön portré nevekkel és személyes tényekkel.",
    instruction:
      "Névhangzás → semleges arcvonás → saját történet; haladó módban a tényt is idézd fel.",
    icon: "faces",
    recallModes: ["free", "choice"],
    defaultRecallMode: "free",
  },
  {
    id: "keyword",
    title: "Kulcsszóhíd",
    technique: "Hangzásból jelentés",
    description: "Főnév, ige, melléknév és elvont szó kétirányú felidézése.",
    instruction:
      "Idegen szó → magyar hangzáskulcs → jelentés → közvetlen kölcsönhatás.",
    icon: "keyword",
    recallModes: ["free", "reverse"],
    defaultRecallMode: "free",
  },
  {
    id: "major",
    title: "Számkód",
    technique: "Magyar Major-rendszer",
    description: "Szám↔hang, kétszámjegyű szó és kép következetes gyakorlása.",
    instruction:
      "Tanuld meg a magyar hangkódot; a teljes kapu 95% és 1,5 mp alatti medián.",
    icon: "major",
    recallModes: ["random", "reverse"],
    defaultRecallMode: "random",
  },
  {
    id: "numbers",
    title: "Számszörny",
    technique: "Kétjegyű képlánc",
    description: "8, 16, 20 vagy 30 számjegy késleltetett visszaírása.",
    instruction:
      "Darabold kétjegyű kódokra, jelenítsd meg a szavakat, és fűzd őket történetté.",
    icon: "numbers",
    recallModes: ["verbatim"],
    defaultRecallMode: "verbatim",
  },
  {
    id: "random",
    title: "Random Recall",
    technique: "Rugalmas hozzáférés",
    description: "A ténylegesen megtanult lánc, palota vagy peg pillanatképe.",
    instruction:
      "Válaszolj n-edik, előtte, utána, pozíció vagy kategória kérdésekre a forráslista alapján.",
    icon: "random",
    recallModes: ["random", "choice"],
    defaultRecallMode: "random",
  },
  {
    id: "text",
    title: "Szövegépítő",
    technique: "Kulcsgondolat és újrafelidézés",
    description: "Első felidézés, célzott újratanulás, majd második felidézés.",
    instruction:
      "Fogalmazd vissza a 3–5 mondat gondolatait; bizonytalanságot külön jelöld.",
    icon: "text",
    recallModes: ["meaning", "verbatim"],
    defaultRecallMode: "meaning",
  },
  {
    id: "concept",
    title: "Fogalomból kép",
    technique: "Mentális szimbólum",
    description: "Két másodperces képzeleti fázis után saját kép és definíció.",
    instruction:
      "Két másodpercig csak képzeld el, utána korlátlanul írd le a saját szimbólumot.",
    icon: "concept",
    recallModes: ["meaning"],
    defaultRecallMode: "meaning",
  },
  {
    id: "review",
    title: "Későbbi visszahívás",
    technique: "Időzített aktív felidézés",
    description: "Csak valóban esedékes, korábbi pillanatképek.",
    instruction:
      "Idézd fel a régi választ; gyors, lassú és hibás eredmény külön intervallumot kap.",
    icon: "review",
    recallModes: ["free"],
    defaultRecallMode: "free",
  },
  {
    id: "boss",
    title: "Boss Fight",
    technique: "Tudatos stratégiaválasztás",
    description: "Lista, arc, szám és fogalom módszerfüggő támogatással.",
    instruction:
      "Részenként válassz stratégiát; a kapott kapaszkodók ténylegesen ehhez igazodnak.",
    icon: "boss",
    recallModes: ["random"],
    defaultRecallMode: "random",
  },
]);

export const HANNA_OBJECTS = freezeRows(
  V1_OBJECTS.map((entry) => ({
    ...entry,
    image: undefined,
    visual: visual("object", entry.id, { label: entry.label }),
  })),
);

const ROUTE_ROOMS = [
  {
    id: "entry",
    label: "Előszoba",
    locations: [
      ["entrance-door", "bejárati ajtó"],
      ["coat-rack", "előszobai fogas"],
      ["shoe-rack", "cipőtartó"],
      ["entry-mirror", "előszobai tükör"],
      ["key-bowl", "kulcstál"],
    ],
  },
  {
    id: "living-room",
    label: "Nappali",
    locations: [
      ["sofa", "kanapé"],
      ["coffee-table", "dohányzóasztal"],
      ["floor-lamp", "állólámpa"],
      ["living-window", "nappali ablak"],
      ["bookcase", "könyvespolc"],
    ],
  },
  {
    id: "kitchen",
    label: "Konyha",
    locations: [
      ["fridge", "hűtőszekrény"],
      ["sink", "mosogató"],
      ["countertop", "konyhapult"],
      ["oven", "sütő"],
      ["dining-table", "étkezőasztal"],
    ],
  },
  {
    id: "bedroom",
    label: "Hálószoba",
    locations: [
      ["bed", "ágy"],
      ["nightstand", "éjjeliszekrény"],
      ["wardrobe", "gardrób"],
      ["dresser", "komód"],
      ["bedroom-window", "hálószoba ablaka"],
    ],
  },
  {
    id: "bathroom",
    label: "Fürdőszoba",
    locations: [
      ["bathroom-door", "fürdőszoba ajtaja"],
      ["washbasin", "mosdókagyló"],
      ["mirror-cabinet", "tükrös szekrény"],
      ["shower", "zuhanyfülke"],
      ["towel-rack", "törölközőtartó"],
    ],
  },
  {
    id: "study",
    label: "Dolgozószoba",
    locations: [
      ["study-door", "dolgozószoba ajtaja"],
      ["desk", "íróasztal"],
      ["monitor", "monitor"],
      ["printer", "nyomtató"],
      ["swivel-chair", "forgószék"],
    ],
  },
];

export const HANNA_ROUTE = freezeRows(
  ROUTE_ROOMS.flatMap((room, roomIndex) =>
    room.locations.map(([id, label], locationIndex) => {
      const routePosition = roomIndex * 5 + locationIndex + 1,
        roomPosition = locationIndex + 1;
      return {
        id,
        label,
        anchorId: `builtin-room:${id}`,
        roomId: room.id,
        roomLabel: room.label,
        roomPosition,
        routePosition,
        transition: locationIndex === 0 && roomIndex > 0 ? "entry-hub" : "next",
        visual: visual("location", id, {
          label,
          roomId: room.id,
          roomPosition,
          routePosition,
        }),
      };
    }),
  ),
);

export const HANNA_PEGS = freezeRows(
  V1_PEGS.map((entry) => ({
    ...entry,
    image: undefined,
    anchorId: `builtin-peg:${entry.number}`,
    visual: visual("object", `peg-${String(entry.number).padStart(3, "0")}`, {
      label: entry.label,
      number: entry.number,
    }),
  })),
);

const FACE_ROWS = [
  ["Anna", "ananász", "egyenes fekete haj", "kedvenc tantárgya a biológia"],
  [
    "Bence",
    "kemence",
    "göndör haj és rövid szakáll",
    "vasárnaponként kenyeret süt",
  ],
  ["Éva", "évgyűrű", "turkiz szemüveg", "hajnali futást kedvel"],
  ["Dávid", "dárda", "rövid fekete haj", "régi térképeket gyűjt"],
  ["Ferenc", "ferde lencse", "ősz bajusz", "brácsán játszik"],
  ["Kata", "katica", "fonott haj", "méhbarát kertet gondoz"],
  ["László", "zászló", "fekete szögletes szemüveg", "csillagokat fényképez"],
  [
    "Hanna",
    "hangfal",
    "vörös göndör haj és szeplők",
    "Montessori eszközöket tervez",
  ],
  ["Ilona", "inga", "ősz göndör haj", "kerámiát készít"],
  ["Gábor", "gally", "szőke haj és körszakáll", "erdei túrákat vezet"],
  [
    "Judit",
    "juh",
    "rövid fekete haj és kerek szemüveg",
    "gyapjúból szőnyeget sző",
  ],
  ["Miklós", "mikrofon", "ősz haj", "helytörténeti podcastot készít"],
  ["Nóra", "nóta", "hosszú hullámos barna haj", "japánul tanul"],
  ["Olivér", "olíva", "rövid vörös haj", "olajfákat nevel"],
  ["Péter", "pék", "kopasz fej és kék szem", "kovászos pékséget vezet"],
  ["Réka", "répa", "rövid szőke frufru", "vízilabdázik"],
  ["Sára", "sárkány", "hosszú fekete haj", "papírsárkányokat épít"],
  ["Tamás", "tam-tam dob", "barna bajusz", "gombákat fotóz"],
  ["Vera", "veréb", "rövid ősz haj", "madárhangokat jegyez fel"],
  ["Zoltán", "zongora", "hullámos szőke haj", "zoknibábokat készít"],
  ["Ágnes", "ág", "vállig érő ősz haj", "gyógynövénykertet tart"],
  [
    "Csaba",
    "csavar",
    "fekete szakáll és borotvált fej",
    "evezős túrákat szervez",
  ],
  ["Dóra", "dór oszlop", "hosszú barna haj és lila szemüveg", "diófából farag"],
  ["Imre", "iránytű", "ősz körszakáll", "régi iránytűket javít"],
];
const FACE_TRAITS = [
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
];
const faceStory = (keyword, trait) =>
  `A ${keyword} rugóként a portréhoz pattan, fényes vonallal körberajzolja ezt a jegyet: ${trait}, majd hangosan háromszor megkocogtatja.`;
export const HANNA_FACES = freezeRows(
  FACE_ROWS.map(([label, keyword, _oldTrait, fact], index) => ({
    id: `face-${String(index + 1).padStart(2, "0")}`,
    portraitId: `portrait-${String(index + 1).padStart(2, "0")}`,
    label,
    keyword,
    trait: FACE_TRAITS[index],
    fact,
    story: faceStory(keyword, FACE_TRAITS[index]),
    visual: visual(
      "portrait",
      `portrait-${String(index + 1).padStart(2, "0")}`,
    ),
  })),
);

const KEYWORD_ROWS = [
  ["bridge", "bridge", "híd", "bricska", "noun"],
  ["cloud", "cloud", "felhő", "Klaudia", "noun"],
  ["forest", "forest", "erdő", "forró üst", "noun"],
  ["window", "window", "ablak", "vén dió", "noun"],
  ["garden", "garden", "kert", "gárda", "noun"],
  ["river", "river", "folyó", "révész", "noun"],
  ["chair", "chair", "szék", "cserfa", "noun"],
  ["stone", "stone", "kő", "sztaniol", "noun"],
  ["book", "book", "könyv", "bukócső", "noun"],
  ["mountain", "mountain", "hegy", "Monti", "noun"],
  ["lake", "lake", "tó", "lék", "noun"],
  ["door", "door", "ajtó", "dúr hang", "noun"],
  ["bread", "bread", "kenyér", "Brad", "noun"],
  ["flower", "flower", "virág", "Flóra", "noun"],
  ["moon", "moon", "hold", "múmia", "noun"],
  ["road", "road", "út", "Ródi", "noun"],
  ["school", "school", "iskola", "síkoló", "noun"],
  ["clock", "clock", "óra", "klakk", "noun"],
  ["key", "key", "kulcs", "kivi", "noun"],
  ["bird", "bird", "madár", "Berti", "noun"],
  ["whisper", "whisper", "suttog", "Vízper", "verb"],
  ["gather", "gather", "összegyűjt", "Gábor", "verb"],
  ["borrow", "borrow", "kölcsönkér", "boróka", "verb"],
  ["notice", "notice", "észrevesz", "nóta", "verb"],
  ["jump", "jump", "ugrik", "dzsem", "verb"],
  ["write", "write", "ír", "rajz", "verb"],
  ["listen", "listen", "hallgat", "Liszt", "verb"],
  ["build", "build", "épít", "Bill", "verb"],
  ["carry", "carry", "visz", "Keri", "verb"],
  ["choose", "choose", "választ", "csúzli", "verb"],
  ["remember", "remember", "emlékszik", "remény", "verb"],
  ["turn", "turn", "fordul", "turbán", "verb"],
  ["open", "open", "kinyit", "Opel", "verb"],
  ["close", "close", "bezár", "klónoz", "verb"],
  ["learn", "learn", "tanul", "Lőrinc", "verb"],
  ["teach", "teach", "tanít", "tincs", "verb"],
  ["search", "search", "keres", "szörcsög", "verb"],
  ["grow", "grow", "növekszik", "gróf", "verb"],
  ["connect", "connect", "összeköt", "konnektor", "verb"],
  ["decide", "decide", "dönt", "dísz", "verb"],
  ["bright", "bright", "ragyogó", "brikett", "adjective"],
  ["gentle", "gentle", "gyengéd", "Genci", "adjective"],
  ["narrow", "narrow", "keskeny", "Néró", "adjective"],
  ["steady", "steady", "állandó", "stég", "adjective"],
  ["quiet", "quiet", "csendes", "kút", "adjective"],
  ["rapid", "rapid", "gyors", "repedt", "adjective"],
  ["heavy", "heavy", "nehéz", "heverő", "adjective"],
  ["light", "light", "könnyű", "light kóla", "adjective"],
  ["smooth", "smooth", "sima", "szmoking", "adjective"],
  ["rough", "rough", "durva", "röfögő malac", "adjective"],
  ["deep", "deep", "mély", "díjpénz", "adjective"],
  ["shallow", "shallow", "sekély", "sál", "adjective"],
  ["warm", "warm", "meleg", "varjú", "adjective"],
  ["cold", "cold", "hideg", "koldus", "adjective"],
  ["ancient", "ancient", "ősi", "ancsa", "adjective"],
  ["modern", "modern", "korszerű", "modell", "adjective"],
  ["careful", "careful", "óvatos", "kávés", "adjective"],
  ["curious", "curious", "kíváncsi", "kúria", "adjective"],
  ["flexible", "flexible", "rugalmas", "flex", "adjective"],
  ["precise", "precise", "pontos", "prizma", "adjective"],
  ["justice", "justice", "igazságosság", "dzsúsz", "abstract"],
  ["freedom", "freedom", "szabadság", "fridzsider", "abstract"],
  ["purpose", "purpose", "cél", "pörkölt", "abstract"],
  ["change", "change", "változás", "csengő", "abstract"],
  ["memory", "memory", "emlékezet", "mamut", "abstract"],
  ["attention", "attention", "figyelem", "Attila", "abstract"],
  ["trust", "trust", "bizalom", "tarisznya", "abstract"],
  ["effort", "effort", "erőfeszítés", "Ernő", "abstract"],
  ["progress", "progress", "haladás", "profi gríz", "abstract"],
  ["choice", "choice", "választás", "cső", "abstract"],
  ["respect", "respect", "tisztelet", "reszelt sajt", "abstract"],
  ["patience", "patience", "türelem", "Peti", "abstract"],
  ["courage", "courage", "bátorság", "kórus", "abstract"],
  ["order", "order", "rend", "ordító", "abstract"],
  ["time", "time", "idő", "táj", "abstract"],
  ["cause", "cause", "ok", "kókusz", "abstract"],
  ["effect", "effect", "hatás", "effektlámpa", "abstract"],
  ["pattern", "pattern", "minta", "pánt", "abstract"],
  ["relation", "relation", "kapcsolat", "relé", "abstract"],
  ["identity", "identity", "azonosság", "indiai tea", "abstract"],
];
const keywordStory = (keyword, meaning, index) =>
  [
    `A „${keyword}” hangzáskulcs óriásira nő, körbetekeri a „${meaning}” jelentését mutató képet, és háromszor megpörgeti.`,
    `A „${keyword}” hangzáskulcsból rugós ököl ugrik elő, rácsap a „${meaning}” képére, amelyből színes csillagok pattannak ki.`,
    `A „${keyword}” hangzáskulcs görkorcsolyán nekiszáguld a „${meaning}” képének; mindketten csilingelve körbefordulnak.`,
    `A „${keyword}” hangzáskulcs forró karamellként ráfolyik a „${meaning}” képére, és fahéjillatú páncéllá dermed rajta.`,
    `A „${keyword}” hangzáskulcs rugóként átfúrja a „${meaning}” képét; a nyílásból hangos konfettiszökőkút tör elő.`,
    `A „${keyword}” hangzáskulcs óriási mágnessé válik, magához rántja a „${meaning}” képét, majd együtt pattognak a padlón.`,
    `A „${keyword}” hangzáskulcs vízágyúval meglöki a „${meaning}” képét; a kép hullámzó zászlóként csapkodni kezd.`,
    `A „${keyword}” hangzáskulcs két kézzel összegyúrja a „${meaning}” képét, majd csillogó lufiként felfújja.`,
  ][index % 8];
export const HANNA_KEYWORDS = freezeRows(
  KEYWORD_ROWS.map(([id, label, meaning, keyword, level], index) => ({
    id,
    label,
    meaning,
    keyword,
    level,
    story: keywordStory(keyword, meaning, index),
    visual: visual("scene", `keyword-${id}`, {
      parts: [
        { role: "key", key: id },
        { role: "meaning", key: meaning },
      ],
      action: "interact",
    }),
  })),
);

const CONCEPT_ROWS = [
  [
    "egyuttmukodes",
    "együttműködés",
    "Közös cselekvés egy megosztott célért.",
    "két kéz együtt emel egy követ",
  ],
  [
    "egyensuly",
    "egyensúly",
    "Ellentétes hatások stabil állapota.",
    "két azonos súlyú serpenyő",
  ],
  [
    "kovetkezmeny",
    "következmény",
    "Egy korábbi eseményből eredő hatás.",
    "eldőlő dominósor vége",
  ],
  [
    "alkalmazkodas",
    "alkalmazkodás",
    "Viselkedés vagy működés igazítása a körülményekhez.",
    "színt váltó kaméleon",
  ],
  [
    "rendszer",
    "rendszer",
    "Egymással kapcsolatban működő részek együttese.",
    "egymást forgató fogaskerekek",
  ],
  [
    "felelosseg",
    "felelősség",
    "Saját döntésünk és hatásainak vállalása.",
    "iránytűt tartó kéz",
  ],
  [
    "kolcsonhatas",
    "kölcsönhatás",
    "Két dolog egymást is megváltoztató kapcsolata.",
    "egymást meglökő golyók",
  ],
  [
    "kovetkezetesseg",
    "következetesség",
    "Egy elv tartós és kiszámítható alkalmazása.",
    "azonos nyomot követő lépések",
  ],
  [
    "osszefugges",
    "összefüggés",
    "Jelenségek értelmezhető kapcsolata.",
    "csomópontokat összekötő háló",
  ],
  [
    "prioritas",
    "fontossági sorrend",
    "Feladatok rendezése jelentőség vagy sürgősség szerint.",
    "dobogóra rendezett lapok",
  ],
  [
    "valtozas",
    "változás",
    "Átmenet egy korábbi állapotból egy másikba.",
    "bábból kibújó pillangó",
  ],
  [
    "bizonyitek",
    "bizonyíték",
    "Megfigyelés vagy adat, amely alátámaszt egy állítást.",
    "nagyító alatti lábnyom",
  ],
  [
    "okozat",
    "oksági kapcsolat",
    "Egy tényező hozzájárul egy másik bekövetkezéséhez.",
    "első dominó meglöki a másodikat",
  ],
  [
    "hatar",
    "határ",
    "Egy tartomány vagy szabály érvényességének széle.",
    "krétavonal két mező között",
  ],
  [
    "modell",
    "modell",
    "Egy rendszer egyszerűsített ábrázolása.",
    "kis híd egy nagy híd tervrajzán",
  ],
  [
    "hipotezis",
    "hipotézis",
    "Ellenőrizhető előzetes magyarázat.",
    "kérdőjeles feltevéskártya",
  ],
  [
    "meres",
    "mérés",
    "Tulajdonság összevetése meghatározott egységgel.",
    "vonalzó egy levél mellett",
  ],
  [
    "bizonytalansag",
    "bizonytalanság",
    "A rendelkezésre álló tudás korlátjának jelzése.",
    "ködben halvány útjelző",
  ],
  [
    "absztrakcio",
    "elvonatkoztatás",
    "Közös lényeg kiemelése konkrét példákból.",
    "három tárgy közös körvonala",
  ],
  [
    "strategia",
    "stratégia",
    "Lépések tudatos terve egy cél eléréséhez.",
    "útvonal több elágazással",
  ],
  [
    "visszacsatolas",
    "visszacsatolás",
    "Egy folyamat eredményének visszavezetése a következő működésbe.",
    "körbeforduló nyíl egy fogaskeréken",
  ],
  [
    "korlat",
    "korlát",
    "Feltétel, amely behatárolja a lehetséges megoldásokat.",
    "keskeny kapu egy széles úton",
  ],
  [
    "dontes",
    "döntés",
    "Választás több lehetséges cselekvés közül.",
    "kéz két eltérő nyíl között",
  ],
  [
    "nezopont",
    "nézőpont",
    "Az a helyzet vagy szemlélet, amelyből valamit értelmezünk.",
    "ugyanaz a kocka két irányból nézve",
  ],
];
export const HANNA_CONCEPTS = freezeRows(
  CONCEPT_ROWS.map(([id, label, meaning, keyword]) => ({
    id,
    label,
    meaning,
    keyword,
    visual: visual("concept", id, { label, symbol: keyword }),
  })),
);

export const HANNA_TEXTS = freezeRows([
  {
    id: "vizkorforgas",
    title: "A víz körforgása",
    text: "A Nap felmelegíti a felszíni vizet. A víz párolog, majd a magasban lehűl és felhővé sűrűsödik. A csapadék visszajut a talajra és a folyókba. Innen a körforgás újraindul.",
    rubric: [
      {
        id: "heat",
        label: "A Nap szerepe",
        accepted: [
          "a nap felmelegíti a vizet",
          "a nap hője indítja a párolgást",
          "nap melegíti a felszíni vizet",
        ],
        contradictions: ["a nap lehűti a vizet", "a nap nem melegíti a vizet"],
      },
      {
        id: "cloud",
        label: "Felhőképződés",
        accepted: [
          "a pára lehűl és felhővé sűrűsödik",
          "lehűlés után felhő lesz",
          "a vízpára felhővé sűrűsödik",
        ],
        contradictions: ["a pára melegedéstől felhő lesz", "a pára nem hűl le"],
      },
      {
        id: "return",
        label: "Visszajutás",
        accepted: [
          "a csapadék visszajut a talajra és folyókba",
          "esővel visszakerül a víz",
          "a csapadék visszahullik",
        ],
        contradictions: ["a csapadék nem jut vissza", "a víz végleg eltűnik"],
      },
    ],
  },
  {
    id: "mehek-tanca",
    title: "A méhek tánca",
    text:
      "A felderítő méh a kaptárban tánccal jelzi a táplálék helyét. " +
      "A tánc iránya a virágok irányát mutatja a Naphoz képest. " +
      "A mozgás hossza a távolságról ad információt. " +
      "A többi méh így együtt találhatja meg a nektárforrást.",
    rubric: [
      {
        id: "direction",
        label: "Az irány jelzése",
        accepted: [
          "a tánc iránya mutatja a virágok irányát",
          "a naphoz képest jelzi az irányt",
        ],
        contradictions: ["a tánc iránya nem jelez semmit"],
      },
      {
        id: "distance",
        label: "A távolság jelzése",
        accepted: [
          "a tánc hossza jelzi a távolságot",
          "a hossz a távolságról ad információt",
        ],
        contradictions: ["a tánc hossza nem jelzi a távolságot"],
      },
      {
        id: "sharing",
        label: "Az információ megosztása",
        accepted: [
          "a méhek a táncból találják meg a nektárt",
          "a tánc táplálékhoz vezeti a méheket",
          "a többi méh így együtt találhatja meg a nektárforrást",
          "a többi méh a tánc alapján találhatja meg a nektárforrást",
        ],
        contradictions: ["a többi méh nem kap információt"],
      },
    ],
  },
  {
    id: "csirazas",
    title: "A mag csírázása",
    text:
      "A mag vizet vesz fel, ezért megindulnak az életfolyamatai. " +
      "Először a gyökér bújik elő és lefelé nő. " +
      "Ezután a hajtás a fény felé indul. " +
      "A levelek később tápanyagot készítenek.",
    rubric: [
      {
        id: "water",
        label: "A víz szerepe",
        accepted: [
          "a mag vizet vesz fel és megindul a csírázás",
          "a víz indítja el az életfolyamatokat",
          "a mag vizet vesz fel ezért megindulnak az életfolyamatai",
        ],
        contradictions: ["a víz megállítja a csírázást"],
      },
      {
        id: "root",
        label: "A gyökér indulása",
        accepted: ["először a gyökér bújik elő", "a gyökér lefelé nő"],
        contradictions: ["először a virág bújik elő"],
      },
      {
        id: "shoot",
        label: "A hajtás és levelek",
        accepted: [
          "a hajtás a fény felé nő",
          "a levelek tápanyagot készítenek",
        ],
        contradictions: ["a hajtás a fénytől elfelé nő"],
      },
    ],
  },
]);

export const HANNA_ASSOCIATION_SCENES = freezeRows([
  {
    id: "interaction",
    label: "Ütközés és törés",
    action: "collides-and-shatters",
    strength: "strong",
    explanation:
      "Az egyik kép nekicsapódik a másiknak; a célpont kibillen és azonosítható darabokra válik.",
  },
  {
    id: "adjacency",
    label: "Egymás mellett",
    action: "stands-beside",
    strength: "weak",
    explanation:
      "A két elem csak egymás mellett áll; egyik sem csinál semmit a másikkal.",
  },
  {
    id: "isolated",
    label: "Külön képek",
    action: "isolated-apart",
    strength: "weak",
    explanation:
      "A két elem külön jelenik meg, ezért nincs közöttük felidézést segítő kapcsolat.",
  },
  {
    id: "other-context",
    label: "Más-más helyzet",
    action: "separate-contexts",
    strength: "weak",
    explanation:
      "Mindkét elem kap egy jelenetet, de a két jelenet nem kapcsolódik össze.",
  },
]);
