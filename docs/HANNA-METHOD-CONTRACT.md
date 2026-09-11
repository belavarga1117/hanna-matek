# Hanna Módszer – megvalósítási szerződés

Verzió: 1. Indítás: 2026-09-11 13:10:24 UTC. Jóváhagyás: a tulajdonos a teljes bemásolt Hanna-koncepcióra „mehet” választ adott; autonóm megvalósítást, agentekkel végzett munkát és végigjátszható kiadást kért. Az ötmodulos MVP nem helyettesíti a teljes kért listát. A kisebb termék- és technikai döntések az orchestratorra vannak bízva.

## Termékhatár

Önálló, magyar **Hanna Módszer** navigációs fül minden érintett tanári/tanulói oldalon. Kezdőoldala technikát választani segít, rövid kipróbálható magyarázattal, napi tréninggel, esedékes ismétlésekkel, saját eszközökkel és saját fejlődéssel. Az AMAkids-alapú játékok, N-back és Memóriapróbák külön megmaradnak. A meglévő infrastruktúrát használjuk, de a régi eredmények vagy játékszabályok nem íródnak át.

Az új tanulási játékok feladaton belüli készségeredményt adnak; nem klinikai tesztek. Az asszociáció ötletét segítjük, eredményességét tényleges későbbi felidézéssel követjük. A saját történet/szimbólum kreativitása nem kap kitalált objektív pontot. Visszajelzés: megfigyelt hiba és javítási javaslat, nem bizonyított mentális ok. Sebesség, pontosság, segítség és késleltetés külön megmarad.

## Közös formátum és belépési pontok

- Katalógusazonosító: `hanna-method`, modul `hanna`, elkülönített kategória. A 15 tevékenység `settings.activity` értékben választódik. Hub: `#/hanna-modszer`; eszközök és profil ezen útvonal alatt vagy hozzá kapcsolódó saját útvonalakon.
- Tiszta motor `dist/hanna/engine.js`: `normalizeHannaSettings(raw)`, `generateHannaSession(settings, seed, resources?)`, `scoreHannaAttempt(settings, seed, answer, context?)`. Kanonikus `dist/game-engine.js` illeszti a meglévő körindítás/pontozás infrastruktúrához. A tartalom legyen DOM nélkül importálható.
- `settings`: `{hannaVersion:1, activity, difficulty, itemCount, encodingMs, delayMs, recallMode, reverse, adaptive, contentLevel, resourceIds?, customContent?}`. `encodingMs:0` jelentse a korlátlan tanulási időt. Explicit engedélylista és tevékenységenkénti normalizálás; ne lehessen értelmetlen kombinációt választani.
- `activity` azonosítók: `baseline`, `chain`, `association`, `loci`, `palace`, `peg`, `faces`, `keyword`, `major`, `numbers`, `random`, `text`, `concept`, `review`, `boss`.
- `recallMode`: `choice|ordered|free|random|reverse|verbatim|meaning`, csak az adott módhoz támogatott értékekkel. Az üres/dupla/idegen válaszokat, határon kívüli indexet, túl nagy payloadot a szerver ellenőrzi.
- Session-terv: `{version:1,activity,seed,settings,content:[{id,kind,label,image?,meaning?,...}],encodingSteps:[...],recallTrials:[{id,index,prompt,kind,...}],resourceSnapshot?,protocolId}`. A szerver tárolja vagy újragenerálja a helyes választ; privát tanári válaszkulcs nem kerül a visszakérdezés nyilvános payloadjába.
- Nyers válasz: `{version:1,startedAt,completedAt,events:[{eventId,type,atMs,trialId?,value?}],encoding:[{itemId,association?,checks?,hintLevel?}],responses:[{trialId,value,rtMs,hintLevel}],strategy?}`. Valós segítséghasználat és megoldásmutatás külön esemény; pontozáskor ne váljon a megoldás megtekintése helyes önálló felidézéssé.
- Eredmény: a meglévő `{correct,total,percent,summary,details,metrics,stars:null,starBasis:'hanna-method-no-stars'}` alak. `metrics` tartalmazzon verziót, tevékenységet, választott technikát, pontosságot, sorrendpontosságot ahol értelmes, önálló/segített helyes számokat, helyes válaszok medián idejét, tényleges kódolási és megtartási időt, következő kihívás ajánlását és összehasonlíthatósági kulcsot. Metrika hiánya null, nem kitalált nulla. Különböző nehézségű/mértékegységű adatok nem egyenértékű radarértékek.
- Saját eszközök (palota, peg-lista, 00–99 szótár, tananyag) verziózott, fiókhoz kötött szerveres erőforrások. A tanulási kör erőforráspillanatképet használ: későbbi szerkesztés nem módosíthatja régi kör vagy esedékes ismétlés helyes válaszát. Tanári kiosztáskor megosztott tartalom megfelelő másolata/pillanatképe szükséges; más tanuló privát eszköze nem olvasható.

## Teljes játéklista

| Tevékenység | Kötelező működés |
|---|---|
| Startteszt | Rövid szó-, kép-, számlisták; azonnali és késleltetett saját kiinduló eredmény, külön feladatonként. |
| Láncsztori | 5/8/10–15/20/30+ elem; szomszédos párok, saját történet és előre elkészített segítség; mozgás/túlzás/interakció szempontok; sorrend, szabad és random visszakérdezés; konkrét tárgyaktól fogalmakig/tanári tananyagig. |
| Képkapcsoló | Két elem összekötése; saját ötlet és kidolgozott összehasonlító példák; 30–60 másodperces bemelegítés; a választási feladatnak előre rögzített oktatási indoka legyen. |
| Memóriaútvonal | Vizuális szoba 5–30 stabil hellyel; vezetett bejárás és útvonalteszt kódolás előtt; tárgyak elhelyezése asszociációval; előre, vissza és random bejárás. |
| Saját palota | Név, rendezhető helyek, leírás, opcionális saját fotó; tartós mentés; legalább 90% útvonalteszt után kész állapot; későbbi tanulásban ténylegesen használható. |
| Peg Master | 1–10, 1–20 és saját nagyobb készlet; fix szám–kép horgok kétirányú betanítása; célként 2 mp alatti elérés; új tárgy hozzákapcsolása; véletlen számozott felidézés és sebesség. |
| Ki kicsoda? | Arc–név–jellemző; névből képi kulcs, semleges vizuális támpont, saját kapcsoló történet; növekvő darabszám és késleltetett visszakérdezés. |
| Kulcsszóhíd | Idegen szó/fogalom → hangzáskulcs → jelentés → asszociáció; kétirányú felidézés, saját tananyag. |
| Számkód | Magyar hangkód pontos, egységes dokumentálása; szám↔hang betanítás; 95% és 1,5 mp alatti medián küszöb; kétjegyű kódolás; valóban menthető és szerkeszthető 00–99 szótár. A bemásolt angol `sh/ch/j` betűsort nem alkalmazzuk magyarázat nélkül magyarra. |
| Számszörny | Kétjegyű darabolás a saját szótárral, képlánc, késleltetett számsorfelidézés; 16/20/30 számjegy, megjegyzett számjegy/perc. Valódi személyes PIN/adat bekérése nem szükséges, generált számsorok. |
| Random Recall | Sorszám, előtte/utána, több hely, kategória ahol létezik; világos határkezelés; helyes válasz sebessége és pontosság. |
| Szövegépítő | 3–5 mondat, ismételt aktív felidézés, hiányzó kulcsgondolatok előre megadott rubrika/elfogadott alakok alapján; külön szó szerinti mód szószintű eltérésekkel. Ne nevezzük az egyszerű kulcsszóellenőrzést teljes jelentésmegértésnek. |
| Fogalomból kép | Fogalom, saját vizuális szimbólum és definíció összekötése; jelentés visszakérdezése; haladó fogalomlánc. |
| Későbbi visszahívás | Szerveres esedékesség és tényleges késleltetés; 10 perc/órák/nap/3 nap/hét jellegű adaptív intervallum; hibás, lassú helyes és gyors helyes eltérően hat; ismétlés nem helyettesíthető friss véletlen tartalommal. |
| Boss Fight | Vegyes nevek/lista/szám/fogalom; játékos választ technikát; részenként értékelés és stratégiaválasztás rögzítése. |

## Közös játékmenet és személyre szabás

Instrukció → kódolás → 10–60 mp köztes feladat → felidézés → célzott visszajelzés. A speciális betanító és gyors bemelegítő feladatok eltérő fázisait világosan dokumentálni kell. Kezdő értékekkel is végigjátszható, kipróbálható tanítás. Nehézség külön paraméterekkel; a tanár állíthat és ismétlést oszthat ki. A 3 fokú segítség előbb támpontot ad, végül külön művelet a válasz megmutatása.

Napi 10–15 perces terv: bemelegítés, fő technika, random recall, esedékes korábbi anyag, vegyes kihívás. Ha nincs esedékes anyag, ezt valós üres állapot jelzi; nem fabrikál tegnapi emléket. Saját teljesítési mérföldkövek valódi eredmények alapján, egyszeri jóváírással. Hosszú távú mutató és 24 órás/7 napos mérföldkő kizárólag a megfelelő tényleges idő elteltével.

Képernyőn belül átlátható, stabil pozíciójú feladatok, nagy érintőgombok. Húzás mellett koppintás/billentyűzetes alternatíva. A 30 elemes lista áttekintése legyen tudatosan tervezett; ne hatalmas kártyák véletlen túlcsordulása. Bevezető és gyakorlás ne írjon hamis pontozott teljesítést. Nincs játék közbeni hálózati hanggenerálás.

## Ellenőrzés és kiadás

Ismert sorozatok, üres/hibás/helyes válaszok, sorrendhatárok, segített válasz, erőforrás-szerkesztés, esedékesség, gyors/hibás adaptáció, párhuzamos beküldés és napváltás. Elkülönített tesztadatbázis, külön saját QA-tanár és -tanuló. Mind a 15 tevékenységből valódi böngészős rövid kör; szerkesztő mentés és újrabelépés; tanári kiosztás → tanulói játék → mentés → tanári részlet; ismétlés, megszakítás/újrakezdés/dupla mentés; mobilképernyő; régi játékok regressziója. A hét elteltét idővezérelt integrációs teszt igazolhatja, de ezt nem állítjuk valódi hétnapos emberi próbának.

Stabil integrált fa után független Grok 4.6 medium statikus review, egyedi kérésfájl, shell/tools/web/subagents tiltva. Reprodukált blokkolók javítása és fixreview. Meglévő Railway kiadás, migráció előtt ellenőrzött mentés/visszaállítás, kiadott fájlok és éles olvasás/mentés ellenőrzése saját QA-fiókkal. Valós felhasználói adatok nem tesztadatok. Rövid átadási táblázat minden követelményről, konkrét bizonyíték, eltérés/korlát és tényleges eltelt idő; játszható verzió megnyitása.

A controller a további konkrét mezőket és adattábla/API szerződést a fenti invariánsok megtartásával kiegészítheti, még a függő implementációs sávok indítása előtt.

## Konkrét V1 implementációs illesztés – 2026-09-11

A felhasználó legfrissebb utasítása felülírja a fenti Grok-routingot: a független review a saját Claude Code előfizetésén kért Opus 5 medium; a hiteles modellroutingot a root ellenőrzi. Grok nem indul.

### Motor ↔ felület

`dist/hanna/content.js` exportálja a `HANNA_ACTIVITIES` 15 elemű tömböt: `{id,title,technique,description,instruction,icon,recallModes,defaultRecallMode}`. Az engine exportjai a fenti hármas mellett: `describeHannaSettings(settings)`, `normalizeHannaResource(kind,data)`, `evaluatePalaceReadiness(resource,answer)`, `nextHannaReview({correct,rtMs,hintLevel,previousIntervalMs})` (ms intervallum). Minden magyar statikus pedagógiai tartalom az engine/content sávé. `resources` az egész sessiongenerálásban `settings.resourceSnapshot || []`; `resourceIds` listából kizárólag a szerver teszi be a megfelelő snapshotot. A motor DOM-független, a UI közvetlenül importálhatja. A belépő settings a normalizeHannaSettings kimenete; a mezők URL-be JSON nélkül egyszerű skalárként/CSV-ként kerülhetnek. A saját szerkesztett tartalom szerveres erőforrásazonosítóval kapcsolódik.

A terv kötelező alakja pontosítva:

- `content`: `{id,kind:'word'|'picture'|'digit'|'face'|'concept'|'keyword'|'text',label,image?,meaning?,keyword?,fact?,category?,peg?,location?,code?}`. `image` emoji vagy meglévő asset relatív URL. Arc esetén `portraitIndex` használható a meglévő 12 arcos atlaszhoz; ismétlődő arc külön körön belül nem nevezhető külön embernek.
- `encodingSteps`: `{id,kind:'pair'|'item'|'route'|'peg'|'major'|'text',itemIds:string[],title,prompt,example?,checks?:string[],location?,peg?}`. Tartalmazzon a kiválasztott tevékenységhez valódi tanítást; az UI a szomszédos pair lépéseken külön végigvezeti a játékost. Loci/palace betanítást külön `training` jelöl: `{kind:'route'|'peg'|'major',items:[{id,label,number?,description?,image?}],trials:[{id,prompt,expected,choices:[{value,label}]}],threshold:{accuracy,medianRtMs?}}`.
- `recallTrials`: `{id,index,prompt,kind:'choice'|'ordered'|'free'|'multi'|'text',itemIds:string[],choices?:[{value:string,label:string,image?,portraitIndex?}],expected:string|string[],accepted?:string[],hints:[string,string,string],phase:'immediate'|'delayed'|'recall',rubric?:[{id,label,accepted:string[]}],label?,image?,portraitIndex?}`. `expected` a generált, tanulandó tartalom része (nem csalásbiztos vizsgamód). Külön privát tanári elfogadott alakok csak scoring contextből; publikus képernyőn recallkor nincs automatikus helyesválasz.
- `instructions`: rövid magyar cím/szöveg. `activity`, `settings`, `protocolId` kötelező. `plan.sourceActivity` reviewnál az eredeti technika. `plan.reviewItems` a későbbi reviewhoz létrehozandó `{id,prompt,expected,accepted?,hints,content}` egységek listája. A többnapos ismétlés ezek pillanatképeit tárolja.
- `answer`: `{version:1,startedAt,completedAt,events:[],encoding:[],responses:[{trialId,value:string|string[],rtMs:number,hintLevel:0..4}],strategy?:string,training?:[{trialId,value,rtMs}],encodingDurationMs:number,delayDurationMs:number}`. A `hintLevel:4` a megoldásmutatás, nem önálló helyes. Eseménytípusok `pause|resume|visibility|restart|hint|show-answer|phase`; eseményid egyedi. Egy trial pontosan egyszer válaszolható; minden hiányzó trial kihagyottként értékelődik. Az engine a tanuló által küldött tetszőleges `score` mezőből semmit nem használ.
- `metrics`: `schemaVersion:1,familyId:'hanna-method',activity,technique,accuracy,orderAccuracy,independentCorrect,assistedCorrect,medianCorrectRtMs,encodingDurationMs,retentionMs,comparabilityKey,adaptation:{nextItemCount,reason},qualityFlags:[],reviewOutcomes:[{itemId,correct,rtMs,hintLevel}],subscales:{...}`. Result `details` hagyományos `{label,actual,expected,correct,feedback?}`. Hints csökkentik az önálló mutatót, nem rejtett bónuszszorzók. A szerver által ellenőrzött retentiont `context.serverRetentionMs`, a nyersválasz maximum idejét `context.serverDurationMs` adja.

### Saját erőforrások és ismétlés API

Fiókhoz kötött, tanár/tanuló egyaránt szerkeszthet **saját** eszközöket; tanár saját tanulói eredményeket olvashat, privát palotát/szótárt nem.

- `GET /api/hanna/resources` → `{resources:[{id,kind,title,revision,data,ready,createdAt,updatedAt}]}`.
- `POST /api/hanna/resources` `{kind,title,data}` → `{resource}`; `PATCH /api/hanna/resources/:id` `{title,data,revision}` → `{resource}`, optimista verzióellenőrzéssel; `DELETE .../:id` archivál, a régi körök és review snapshotok megmaradnak.
- `kind:'palace'`, data `{locations:[{id,name,description,photo?}]}` (5–30 hely); photo opcionális kizárólag kis JPG/PNG/WebP data URL, max200KB/kép, max1MB teljes kérés, nincs távoli hálózati betöltés.
- `kind:'peg'`, data `{entries:[{number:1..100,label}]}` (10/20/100 elemű készlet vagy saját 5–100 egymást követő lista).
- `kind:'major'`, data `{entries:[{code:'00'..'99',label}]}` (részleges szótár engedélyezett; Számszörny csak rendelkezésre álló kódokból generál, hiányt világosan jelzi).
- `kind:'material'`, data `{items:[{id,label,meaning?,keyword?,category?}],text?,rubric?:[{id,label,accepted:[]}]}`. Maximum100 tétel, 10K szöveg.
- `POST /api/hanna/resources/:id/readiness` `{revision,answers:[{index,value}]}` a palota aktuális helyeinek index/name felidézése, szerverértékelés; 90% után ready, bármely szerkesztés törli. UI előbb elrejti az útvonalat. Ez egy tanulói betanítás ellenőrzése, nem hitelesített képességvizsga.
- `GET /api/hanna/dashboard[?studentId=...]` → `{resources, due:[{id,sourceActivity,label,dueAt,lastReviewedAt,intervalMs}], dueCount, nextDueAt, results, milestones:[{id,label,at}], dailyPlan:[{activity,label,minutes}], serverNow}`. Tanári studentId csak saját tanulóra; ekkor resources üres. Tanári saját dashboardon nincs tanulói eredményként mentett próbakör.
- A `review` indítása a közös `/api/attempts` útvonalon `{gameId:'hanna-method',settings:{activity:'review',reviewIds?:[...]}}`; a szerver választ a **saját, már esedékes** kártyákból és `settings.reviewSnapshot:[{id,sourceActivity,prompt,expected,accepted?,hints,content,learnedAt,lastReviewedAt,intervalMs}]` mezőt tesz a körhöz. Nincs esedékes anyagnál409 `NO_REVIEWS_DUE`; a UI nem gyárt új helyettesítő listát. A review plan ebből készül, nem a seedből új tartalommal. A szerver beküldéskor tranzakciósan, idempotensen frissíti a kártyákat. A kezdőkörből tanulónál a plan.reviewItems hozza létre az első 10 perces esedékes kártyákat, egy forráskör–elem kulcs UNIQUE.
- A kör tanári kiosztása a már meglévő assignment API-val. Saját erőforrás IDs feloldása és snapshot készítése kiosztáskor; a tanuló a tanár által megosztott tananyag másolatát használja, nem a privát erőforrás API-t. Más fiók resourceId-ja404. Egy korábbi feladat beállításának mentett snapshotját későbbi erőforrásszerkesztés nem változtatja.

### Felületi exportok – UI sáv

`dist/hanna/ui.js`: `hannaGames={'hanna-method':{mount(ctx)}}`; a mount a meglévő `ctx.root,h,settings,seed,phase,done` felületet használja, saját fázisvezérléssel; cleanup függvényt ad vissza. `ctx.done(null,answer)` csak egyszer. A controller a Hanna játékot folyamatos/sajátvezérlésű hostként kezeli; régi memorize/timer nem fut mellette. A tanulói kör belépéskor szerveres snapshotsettingset kap. Tanári előnézet a hub által betöltött saját resourceSnapshotot kapja, nem ment eredményt. Kódolás → distractor alatt szükség esetén új `ctx.prepareHannaRecall(answer)` visszaadja a szerver `availableAt` idejét (10–60mp delay őrzése), utána recall.

`createHannaHub({h,school,onStart})` → `{element,dispose()}`; subtabok: Felfedezés, Napi tréning, Saját eszközeim, Fejlődésem (tanárnál Tanulói fejlődés); saját szerkesztő és profil lehet `dist/hanna/workspace.js` export. A hub az itt leírt API-kat használja `school.api(path,{method,body})` módon, saját user `school.user`. `onStart(settings)` a controller közös körindítását hívja.

`createHannaSettings({h,value={},onChange,school?,compact=false})` → `{element,getValue(),setValue(raw)}`; használható hubból és tanári feladatsorhoz. Elérhető tevékenységek, paraméterek, saját erőforrások; minden szükséges írásos magyar instrukció. `renderHannaResult(h,result)` és `describeHannaSettings` a tanári/tanulói eredményrészlethez; új fejlődési nézet a dashboardból.

Kötelező render guard: disposal/generáció minden aszinkron betöltésnél; szerep/fiókváltáskor késői válasz ne jelenjen meg. Köztes feladat tartson ki a teljes késleltetésig; pause/háttérbe kerülés állítja a lokális időzítőt, visszatéréskor explicit folytatás. Újrakezdés eldobja régi válaszokat/timereket, egy mentésre váró kör két befejezésgombbal se küldődjön kétszer.
