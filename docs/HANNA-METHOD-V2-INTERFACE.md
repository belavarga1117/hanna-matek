# Hanna Módszer V2 — közös megvalósítási interfész

Indítás: **2026-09-11 15:40:36 UTC**. Alap:60774e8. A teljes eredeti Hanna-koncepció és a root tételes auditja a követelmény; ez a fájl csak az együtt dolgozó sávok adatinterfésze.

## Tulajdon és verziózás

- Controller: `engine.js` verziórouter, `ui.js` verziórouter, közös app/game-engine/school/server, migráció, profil/progress/workspace, integráció és bizonyítékok.
- Motor sáv: **engine-v2.js, content-v2.js, tests/hanna-v2-engine.test.mjs**. DOM-független. Régi fájlhoz nem ír.
- Design/UI sáv: **ui-v2.js, visuals.js, hanna-v2.css, assets/hanna-v2/** és **tests/hanna-v2-ui.test.mjs**. A saját eszköz/profil felületi tervéhez exportált vizuális komponenseket ad; controller integrálja workspace/progressbe. Régi fájlhoz nem ír.
- `engine-v1.js/content-v1.js/ui-v1.js` a60774e8 kiadott motor/felület fagyasztott másolata, relatív importok átvezetve. Minden explicit `hannaVersion:1` ezt használja; régi eredmény nem számolódik újra. Új beállítás alapértelmezett verzió2. A V1 URL/kiosztás/pending megmarad.

## Motor API

A V1-nevekkel exportált `normalizeHannaSettings`, `generateHannaSession`, `scoreHannaAttempt`, `describeHannaSettings`, `allowedHannaContentLevels`, `normalizeHannaResource`, `evaluatePalaceReadiness`, `nextHannaReview`. Új: `createHannaLearnedSnapshot(plan,answer)` és `buildHannaRandomTrials(snapshot,seed,{prefix,choice})`.

V2 settings a V1 skalármezők mellett: `hannaVersion:2`, `difficulty:'beginner'|'easy'|'normal'|'hard'|'expert'`, `contentLevel:'concrete'|'mixed'|'abstract'|'definition'|'material'|'noun'|'verb'|'adjective'`, `delayMs:10000..300000`, `associationMs:30000|60000`, `trainingSize:10|20|100`, `similarity:'varied'|'similar'`, `interferenceLevel:0|1|2`, `sourceResultId?`, `learnedSnapshot?`, `trainingMastery?`. Csak az adott tevékenységnél értelmes mezők aktívak; hatástalan választó tilos. V2 numbers8/16/20/30;faces3..24;chain5..40;keyword3..20;concept3..20. Default kezdő könnyű. `adaptive` a tényleges következő paramétercsomagra hat.

Saját erőforrás V1 CRUD mezői kompatibilisek. Material rubrika további opcionális `accepted` teljes/értelmes megfogalmazások, `contradictions` explicit tagadó ellenpéldák; nem valódi szemantikus AI. Pontosan bizonytalan válasz külön `needsReview`, önellenőrzés/tanári értékelés nem automatikus pont. A hely- és peg-lista verzió+lefedettség kötött betanítása nem állít teljes100-as elsajátítást20mintából.

## Session-terv V2

V1 közös mezői megmaradnak (`content`, `encodingSteps`, `recallTrials`, `training`, `reviewItems`, `instructions`, `protocolId`) új `version:2` és **`flow`** mellett. A felület a flow-t hajtja végre sorrendben; nem maga találja ki a mechanikát.

`flow:[{id,phase:'instruction'|'training'|'encoding'|'distractor'|'recall'|'feedback',title,description?,stepIds?:[],trialIds?:[],durationMs?,gateId?,feedbackFor?:[]}]`.

- encoding block az encodingSteps ID-kra; recall block a recallTrials ID-kra mutat. Ugyanaz a trialId pontosan egyszer szerepel. A lánc ordered → free-list → random blokkokat kap ugyanarra a contentre. Szövegnél első recall → restudy encoding → második recall. Conceptnél külön2s képzeleti encoding, utána saját gondolatbevitel.
- distractor blokknak egyedi `gateId` és durationMs; baseline azonnali válaszok után is lehet ilyen. A szerver minden gate előtti képzés/válasz/kódolás prefixének változatlan hashét őrzi. Későbbi restudy megengedett, korábbi prefix módosítása nem.
- `encodingSteps`: régi mezők mellett `locationId?`, `anchor?`, `visual?`, `durationMs?`, `strategyOptions?:[{id,label,description,anchors?,example,visual?}]`, `kind:'association-sprint'|'concept-imagine'|'face-intro'|'...'`, `rounds?`. Minden megjelenített aktív hely valódi hely-ID. `rounds` képkapcsolónál `{id,itemIds,choices:[{id,label,visual,explanation}],preferredChoiceId,example}`; legalább4 konkrét illusztrált alternatíva, több pár egy30/60s aktív körben. A kész pár azonnal továbblép, nincs egy statikus minimumvárás.
- `content` V1 mezők mellett `visual?:{type,key,...}`, `portraitId?`, `trait?`, `story?`, `anchorId?`. Képek publikus relatív `./assets/hanna-v2/...` URL vagy a visuals.js által rajzolt szemantikus ábra. A vizuál feladatban nem platformemoji.
- `training` V1 items/trials/threshold mellett `coverage:{requiredIds,masteredIds?,testedIds}`; trial `relation:'position'|'before'|'after'|'forward'|'reverse'`, `anchorId?`. Loci helygombok vezetett bejárást is szolgálnak.
- `recallTrials` V1 mellett `kind:'free-list'`, `entry:'typed'`, `blockId`, `questionType:'nth'|'before'|'after'|'positions'|'category'|'name'|'fact'`, `position?`, `anchorId?`, `visual?`, `cue?:{anchor?,associationStepId?,visual?}`, `rubric` elfogadott/ellentmondó alakok, `assessment:'rubric'|'verbatim'`. Free-list egy szabad, szóbank nélküli szövegmező (soronként/vesszővel), nem előre sorszámozott sok mező. Recallkép nem árulhatja el a keresett nevet/tárgyat.
- `learnedSnapshot:{version:2,sourceActivity,content,encoding,anchors,sourceLabel,learnedAt?}` a tanult teljes konkrét lista és saját kapcsolat. Random ebből, nem friss véletlenből épül. Auth esetén kizárólag szerver adja saját sourceResultId alapján. Tanári random-kiosztás a tanuló legutóbbi megfelelő saját anyagát választja; idegen ID nem olvasható. Vendég előnézet a saját előző preview snapshotját használhatja, mérést nem állít.

## Nyers válasz és pontozás

`answer:{version:2,startedAt,completedAt,events,encoding,training,responses,encodingDurationMs,delayDurationMs,strategy?}`.

- encoding: `{stepId,itemId?,association?,checks?,hintLevel?,strategy?,choiceId?,roundId?,rtMs?}`. Egy lépés több párral is rendelkezhet; roundId egyedi. Ötlet szabad szövege nem objektív kreativitáspont.
- responses: `{trialId,value:string|string[],rtMs,hintLevel:0..4,selfAssessment?:[{rubricId,present:boolean}]}`. Üres/hiányzó/téves válasz pontozható; idegen trial és duplázás elutasítandó. Önálló/segített és bizonytalan külön.
- training: `{trialId,value,rtMs}`. Teljesítési kapu a Hanna által kért Major95%/<1.5s, palota90%; peg2s sebességcél és teljes lefedettség külön. A szerver szükséges új betanítási bizonyítékot/coverage állapotot tárolhat.
- score `metrics.schemaVersion:2`, külön blockResults/subscales; `adaptation:{nextItemCount,nextSettings,reason}`. Dimenziók encodingSpeed,immediateRecall,delayedRecall,sequenceMemory,randomAccess,nameMemory,numberMemory,associativeMemory,longTermRetention,strategyIndependence, saját egység és evidencetípus. Nem kevert mértékegységű mesterséges radar. Válaszidejű helyes egység, pontosság, önállóság külön; hiány null. Szószintű illesztés valódi szekvencia-alignment, nem pozicionális kaszkádhiba.

## Felület és szervercsatlakozás

UI exportok V1-nevekkel: `hannaGames`, `createHannaHub`, `createHannaSettings`, `renderHannaResult`, `describeHannaSettings`, `shuffleHannaChoices`. `ui.js` router mountkor a settingsverzió szerint delegál, új hub/settings V2.

`ctx.prepareHannaRecall(answer,{gateId})` → ISO availableAt vagy null előnézetnél. Host POST `{answer,gateId}` ugyanarra a hanna-ready endpointre; controller implementálja. Csak a gate-ig gyűlt prefix küldendő. UI a szerveridő és aktív szünetkezelt helyi idő közül mindkettőt teljesíti. `ctx.done(null,answer)` egyszer. New learned snapshot előnézetben sessionStorage-peruserkey menthető; auth randomforrást dashboard ad.

Dashboard bővítés controller: `learnedSources:[{resultId,activity,title,itemCount,createdAt}]`, napi fő technika chain/loci/peg rotáció és sourceResultId a közvetlen recallhoz; `mastery` coverage. Profil és saját eszköz nem hosszú nyers mezőlista: UI/design sáv ad újrahasználható vizuális komponenseket a controllernek.

## Kiadási kapu

Knownsequence/ellenpélda/V1fagyasztás, finalintegrált npmtest+check, mély15családUAT, sajátteacherstudentSQLflow, desktop390mobile/designkritika, stableoriginalscopeOpus5mediumreview+fixloop, backuprestore→Railway→asset/sourceegyezés→sajátQAmentés/reread→oldrecordfingerprints. Egyik kapu sem helyettesíthető darabszámmal vagy saját szerződés átírásával.
