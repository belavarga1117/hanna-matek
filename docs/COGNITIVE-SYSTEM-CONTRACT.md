# Memóriapróbák – közös interfészszerződés

Szerződésverzió: **1**. Rögzítve: 2026-09-11. Ez a dokumentum a motor, a szerver, a tanári/tanulói felület és a kutatási referencianézet közös kapuja. A benne szereplő rövid, érintőképernyős magyar eljárások saját, **kísérleti** protokollok, amíg külön megbízhatósági és validitási vizsgálat nem igazolja őket.

## Azonosítók és módok

| `gameId` | család | `protocolId` | rögzített próba |
|---|---|---|---|
| `spatial-span` | térbeli sorrend | `hanna-spatial-span-v1` | előre és vissza, két sorozat/hossz, két hiba után leállás |
| `digit-span` | hallott számsor | `hanna-digit-span-v1` | külön előre és vissza blokk, két sorozat/hossz, két hiba után leállás |
| `picture-place` | kép–hely társítás | `hanna-picture-place-v1` | két tanulási kör, azonnali és legalább 60 másodperces késleltetett felidézés |
| `complex-span` | közbeiktatott feladat melletti emlékezés | `hanna-complex-span-v1` | helyek megőrzése, közben szimmetriadöntés; mindkét rész kötelező |
| `recognition` | képfelismerés | `hanna-recognition-v1` | rögzített régi/új arány; találat és téves felismerés külön |
| `attention-nogo` | jelzés és visszatartás | `hanna-attention-nogo-v1` | rögzített ingerarány; figyelmi kontextus, nem diagnózis |
| `nback` | sorozatkövetés | meglévő N-back protokollazonosító | a megbízható meglévő motor, külön gyakorlás/próba belépési ponttal |
| `active-recall` | tanári aktív felidézés | `hanna-active-recall-v1` | tanári kérdés–elfogadott válasz, későbbi újrakérdezés szerver által őrzött időponttal |

Minden új kognitív beállítás tartalmazza: `contractVersion: 1`, `protocolId`, `protocolVersion: 1`, `mode: "practice" | "assessment"`, `inputModality: "touch" | "mouse" | "keyboard" | "mixed"`, valamint a családspecifikus mezőket. A `practice` mód adhat azonnali visszajelzést és szabad újrakezdést. Az `assessment` mód rögzített beállítású, a pontozott szakaszban nincs helyességjelzés, és a megszakítás minőségi jelzés marad. A szerver normalizálja és engedélylistával ellenőrzi a beállításokat; ismeretlen mezőt nem tekint mérési adatnak.

## Determinisztikus terv és események

A szerver hozza létre az attemptet, a seedet és a normalizált nyilvános beállítást. `generateAssessment(gameId, settings, seed)` ugyanabból a hármasból byte-szinten azonos ingertervet ad. A terv minden elemének stabil `trialId`, nulláról induló `trialIndex`, `phase`, `kind`, `onsetMs` és nyilvános ingerleírása van. A helyes válasz a generált tervből vagy a szerver számára megőrzött privát tanári tartalomból származik, nem a kliens által beküldött pontszámból.

A kliens egyetlen nyers választ küld:

```json
{
  "version": 1,
  "startedAt": "ISO-8601",
  "completedAt": "ISO-8601",
  "events": [
    {"eventId":"UUID","type":"response","trialIndex":0,"atMs":1234,"value":"..."},
    {"eventId":"UUID","type":"visibility","atMs":2400,"value":"hidden"},
    {"eventId":"UUID","type":"pause","atMs":2410,"value":"background"},
    {"eventId":"UUID","type":"resume","atMs":5500,"value":"background"},
    {"eventId":"UUID","type":"audio","trialIndex":1,"atMs":6100,"value":"played"}
  ],
  "device": {"pointer":"coarse","viewportBucket":"small"}
}
```

Az `eventId` egy beküldésen belül egyedi. A motor elutasítja a túl sok eseményt, az ismeretlen eseménytípust, a terven kívüli indexet, a negatív vagy nem véges időt, az adott próbához nem illő választ és az egymásnak ellentmondó duplikációt. Ahol egy válasz megengedett, az első érvényes válasz számít; a későbbi kattintás nem termel új pontot. Üres válasz hibás vagy kihagyott. „Mindenre kattintás” a téves jelzéseken keresztül rontja a felismerési és no-go eredményt.

Az oldal láthatatlanná válása automatikus szünet. Folytatáskor nincs összetorlódó inger vagy visszamenőleges válaszablak. `assessment` esetén bármely láthatatlanság, kézi szünet, audiohiba, újratöltés utáni helyreállítás vagy 1000 ms-nál nagyobb időzítési eltérés bekerül a `qualityFlags` listába; az eredmény megmarad, de nem keverhető zavartalan trendbe. A szerver a késleltetést a saját `attempt.created_at`/eredmény-időpontjai alapján is ellenőrzi, ezért pusztán kliensoldali `atMs` nem rövidítheti le a késleltetett felidézést.

## Pontozás és metrikák

`scoreAttempt` a nyers eseményből adja vissza a meglévő eredménymezőkkel kompatibilis `{correct,total,percent,summary,details,stars:null,starBasis:"cognitive-no-stars",metrics}` objektumot. A `metrics` közös burka:

```json
{
  "schemaVersion": 1,
  "familyId": "spatial-span",
  "protocolId": "hanna-spatial-span-v1",
  "protocolVersion": 1,
  "mode": "assessment",
  "primaryMetric": {"name":"spanScore","value":5.5,"unit":"items"},
  "subscales": {},
  "counts": {},
  "timing": {"medianCorrectRtMs":null,"serverDurationMs":null},
  "qualityFlags": [],
  "comparable": true,
  "comparabilityKey": "..."
}
```

- Térbeli és számterjedelem: előre/vissza külön `maxSpan`, `spanScore` (a hibátlan sorozatok összesített részpontja) és hosszankénti találat. Az előre és vissza soha nem egy közös képességpont.
- Kép–hely: tanulási körönként helyes darabszám, azonnali és késleltetett helyes darabszám, téves helyek, valamint a szerver által mért tényleges késleltetés.
- Komplex terjedelem: felidézési pontosság és feldolgozási pontosság külön. Ha a köztes döntések kevesebb mint 75%-a megválaszolt, `invalidProcessingCompliance` jelzés és `comparable:false`; a kihagyás nem javíthatja a memóriaeredményt.
- Felismerés: találat, kihagyás, téves felismerés, helyes elutasítás, kiegyensúlyozott pontosság. Ha nincs mindkét ingerfajtából értékelhető válasz, az elsődleges mutató nem összehasonlítható.
- No-go: go találat/kihagyás, no-go téves válasz/helyes visszatartás és reakcióidő. Kizárólag a konkrét feladat figyelmi kontextusa.
- Aktív felidézés: kérdésenként első válasz, elfogadás és felülvizsgálati alkalom; a későbbi kör külön eredmény, tényleges `scheduledAt`, `availableAt`, `answeredAt` idővel.
- N-back: a jelenlegi `metrics.version === 1` és trusted motor változatlan; a profil csak azonos mód/N/tempó/scoring/modality és assessment/practice identitás mellett csoportosítja.

A százalék feladaton belüli eredmény, nem memória-, IQ-, agyéletkor- vagy egészségpontszám. Kognitív családoknál nincs csillag vagy rangpont.

## Összehasonlíthatóság

A `comparabilityKey` a szerver által, rendezett kanonikus JSON SHA-256 lenyomataként készül ezekből: `familyId`, `protocolId`, `protocolVersion`, `mode`, a nehézséget és időzítést meghatározó normalizált beállítások, `inputModality`, `audioSetVersion`, `stimulusSetVersion`, `language`. Nem része a seed, attempt ID vagy dátum. Megszakított, helyreállított, audiohibás vagy más inputmodális eredmény külön sorozatba kerül. A profil csak azonos kulcsú eredményeket köt vonallal; más eredményt külön pontként, rövid okkal mutathat.

## Privát tanári tartalom és időzített újrakérdezés

Az `active-recall` kiosztás nyilvános beállítása csak a kérdést, tanulási magyarázatot és ütemezést adja át. Az elfogadott válaszok normalizált változatai külön, szerveroldali `private_settings` JSONB-ben maradnak az assignment stepen és az attempten; a tanulói API, napló és klienscsomag nem kapja meg őket. Ehhez őrzött migráció ad nullable `private_settings` oszlopot, valamint nullable `available_at` időt az attempthez. A tanári létrehozó útvonal bontja nyilvános/privát részre a tartalmat.

Az első felidézés után a következő ismétlés `reviewDelayMinutes` alapján válik elérhetővé. A szerver a korábbi, azonos assignment stephez tartozó eredményből számolja az `availableAt` időt, és korai indításkor géppel olvasható `REVIEW_NOT_DUE` választ ad. Gyakorló előnézet nem ír tanulói eredményt. Éles UAT kizárólag saját QA-fiókkal történhet.

## Korosztály és kutatási referencia

Az opcionális koradat egész életév (`ageYears`, 4–120), nem születési dátum. A statikus, verziózott forrásrekord alakja:

```json
{
  "sourceId":"doi-or-dataset-id",
  "citation":"...",
  "url":"https://...",
  "sourceType":"primary-paper|official-dataset|official-manual",
  "license":{"code":"...","reuse":"display-summary|data-reuse|link-only","evidenceUrl":"https://..."},
  "task":{"name":"...","version":"...","direction":"forward","modality":"physical-board","language":"...","stoppingRule":"...","scoring":"..."},
  "sample":{"country":"...","n":123,"ageMin":7,"ageMax":8,"inclusion":"..."},
  "table":{"locator":"Table 2, p. 6","values":[{"ageLabel":"7–8","n":42,"metric":"span","mean":4.2,"sd":0.8,"percentiles":null}]},
  "applicability":{"personalPercentile":false,"reason":"Az eszköz és protokoll nem egyezik."}
}
```

Szám csak ellenőrzött táblából vagy géppel olvasható elsődleges adatból kerülhet be, pontos oldal-/tábla-/fájlazonosítóval. Grafikonpont a `sourceId` és `table.locator` adatait közvetlenül megmutatja. A kutatási csoporteredmény külön „Kutatási referencia” nézet; nem válik személyes percentilissé. Személyes összevetés csak akkor engedélyezhető, ha a feladatverzió, megállítás, pontozás, modalitás, nyelv/utasítás, életkori minta és felhasználási jog ténylegesen megfelel; ezt az első verzió alapértelmezetten minden külső forrásnál `false` értéken tartja.

## Kompatibilitás és tárolás

A meglévő `attempts`/`results` útvonal, szerveres seed, nyersválasz-pontozás, idempotens beküldés és JSONB `metrics` marad a közös gerinc. A folyamatos feladatok saját fázisállapotot használnak, nem kényszerülnek a régi megjegyzés/válasz DOM-életciklusba. A `game-engine.js` a kanonikus normalizáló/generáló/pontozó router; a szerver és kliens ugyanazt importálja. A katalógus és tanári kiosztás minden családot ugyanazzal az azonosítóval továbbít. A régi játékok és a Modernizált/Klasszikus N-back felfedező változatlanul elérhető.
