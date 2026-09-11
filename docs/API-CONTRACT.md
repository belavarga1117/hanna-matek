# Implementációs szerződés – 2026-09-10

## 2026-09-11 N-back kiegészítés

Az `nback` játék a közös szabályverzió 2 alatt, saját `nbackVersion:1` beállítással fut; v1 kliensből nem indítható. A teljes konfigurációt az `NBACK-CONTRACT.md` rögzíti. A kliens nyers eseményeket küld, a szerver a tárolt uint32 seedből és konfigurációból újragenerálja a sessiont, majd a n-back motorral pontoz. A mentett `percent` a motor autoritatív, egész százaléka: Workshop profilnál `floor(TP/(TP+FP+FN)*100)`, Jaegginél a leggyengébb csatorna százaléka. A generikus `Math.round(correct/total*100)` nem írhatja felül.

Az eredmény `metrics` mezője null vagy az engine v1 csatorna-, összesített és adaptációs metrikája. A 004 migráció ezt nullable JSONB oszlopként, kizárólag additívan vezeti be. N-backnél `stars:null`, `starBasis:'brainworkshop-no-stars'`; ez nem „még nem értékelt” eredmény, a forrás nem használ csillagot. A tanulói és tanári eredményrészlet ugyanazt a csatornánkénti n-back nézetet használja. A haladás játékcsoportja N-t jelenít meg, nem a régi `level=1` alapértéket. Az N-back autoritatív százalékai külön fejlődési átlagba kerülnek, mert a Workshop és a Jaeggi nevezője nem összevethető a régi játékok `correct/total` arányával.

Adaptív fókuszú játéknál a kliens `lowScoreCount` értékét a szerver mindig nullára írja, majd a legutóbbi, azonos normalizált kihíváscsaládhoz tartozó szervereredmény `metrics.adaptation` mezőjéből oldja fel az N-t és az előző gyenge pontszámok számát. A kihívásazonosság kizárja az N-t, a pontozott hosszt (`trialCount`), a fix tempó hosszát (`intervalMs`) és `lowScoreCount`-ot; minden más normalizált beállítást, köztük a `selfPaced` módot megtart. A Self-paced forrásviselkedés eltér a fix időzítéstől, ezért a két futás nem osztozik adaptációs állapoton. A visszaállításhoz csak olyan szervereredmény használható, amelynek módja, N-je, profilja, hossza és teljes adaptációja konzisztens a mentett beállítással és százalékkal. A kiosztott lépés külön adaptív folyamat: az első kör a tanár által kijelölt N-ről indul, a további ismétlések ugyanazon lépés eredményeit követik. Manuális játéknál a kiosztott N, illetve szabad gyakorlásnál a beérkező N marad, `lowScoreCount:0` mellett.

Az adaptációs döntést az engine adja: Workshop profilban 80%-tól szintemelés, három nem feltétlenül egymást követő 50% alatti kör után szintcsökkentés (az 50–79% kör nem nullázza a számlálót); Jaegginél 90%-tól azonnali emelés, 75% alatt azonnali csökkentés. A függő azonos n-back kör ugyanazzal a tárolt konfigurációval tér vissza. A létrehozás és beküldés kihívás-/lépésszintű tranzakciós zárat használ, így egy retry nem dupláz eredményt, ismétlést vagy adaptációs állapotot.

## 2026-09-10 v2 paritásjavítás — elsőbbséget élvező kiegészítés

Az alábbi történeti v1 szerződés tovább él a régi kiosztások és körök számára. Az új kliens a körindításhoz és feladatsor létrehozásához `clientRulesVersion:2` mezőt küld. Hiánya v1-kompatibilitást jelent; kiosztott feladat szabályverzióját mindig a szerver tárolt lépése határozza meg. A kliens nem írhatja felül azzal, hogy `rulesVersion` mezőt küld. V2 kiosztást régi kliensből indítani409 `CLIENT_UPDATE_REQUIRED`.

A lépések, körök és eredmények `rulesVersion` mezőt adnak. A results új `stars` mezője0..3 vagy null; null = nem mért csillagszabály, nem nulla csillag. `starBasis`: legacy-v1, hanna-own, reference-observed-2026-09-10 vagy reference-unmeasured. A progress a tárolt csillagokat összegzi, `ungradedStars` a még értékeletlen körök száma. A régi pont és csillag nem számítódik újra.

V2 nyers válasz: faces `{attempts:[{answers:[{faceId,name,job?,room?}]}]}`; shopping `{attempts:[{itemIds:string[]} ]}`; pictureL2 `{rounds:[{attempts:[{itemIds:string[]}]}]}`; code `{mapping:[{digit,symbolId}],answers:[{attempts:string[]} ]}`. Ár, állomás, pictureL1 és a négy saját alapjáték alakja változatlan. A válaszpróbák sorrendje megmarad, siker után nincs további próba; megoldásbemutatás nem kerül a nyers válaszba. A szerver újragenerálja a feladatot, és egész kódokat/egész képsorokat pontoz az új változatban.

V2 faces rögzített5személy; shopping rögzített9cél,L1választék14,L2D1választék9/L2D2választék14; shoppingL1nehézség inaktív. Price nincs ársávnehézség, L1százaléklátható támpont. PictureL1D1négy/D2hatvalódi jelenet, L2nehézség inaktív. ATM L1/L2 legfeljebb2, L3 legfeljebb3 próbálkozás egy teljes kódra; siker után nincs újabb próbálkozás. Mind a hat kombináció külön referencia-végponttal szerepel a végrehajtási jegyzőkönyvben. A megfigyelt csillagcellák más megjegyzési időre történő alkalmazása saját, korlátozott átviteli szabály; nem bizonyít egyetemes referenciaazonosságot.

A tanári eredményrészlet `studentDisplayName` és `assignmentTitle` mezőt is ad, a tanárhoz tartozó tanuló ellenőrzésével. A válasz, pont, csillag és próbálkozástörténet nem változik a megjelenítési javítástól. A v2 portrécímke az adott körben látható1–5. pozíció, a v1 címke történeti marad.

A002 migráció új verzió- és csillagmezőket ad; a külön003 migráció a frissítés közben még régi programból érkező v1 mentések eredeti csillagát INSERT előtt rögzíti. Csak v1 és mégNULL csillagú sorhoz nyúl, a v2 ismeretlen csillagállapotát nem változtatja meg. Meglévő migráció nem íródott át.

## Történeti v1 szerződés és eredeti munkamegosztás

Egy Node.js ESM alkalmazás + PostgreSQL, same-origin dist/ frontend a Railway hanna-memoria projektben. Nincs AMAkids-kapcsolat futáskor. Nincs emailküldés. A korábbi privát Sites-demo hozzáférése marad. Saját tesztadatok engedélyezettek.

## Közös játékprotokoll

`dist/core.js`: normalizeSettings megőrzi az eddigieket, hozzáad level (1..3), rounds (1..5), theme (stations/streets), symbolSet (objects/abstract). Alapértelmezés level1, rounds3. Játékfüggő határ/érvényesítés a következő közös modulban.

`dist/game-engine.js` exportjai (games sáv készíti):
- `seededRandom(seed)` uint32 seedből reprodukálható RNG.
- `normalizeGameSettings(gameId, raw)` ismert játékot/szintet/témát ellenőriz, biztonságos számtartományokra normalizál, nem igazítja csendben a nem létező játékazonosítót.
- `scoreAttempt(gameId, settings, seed, answer)` a tárolt seedből újragenerált feladat és NYERS válasz alapján `{correct,total,percent,summary,details}` eredményt ad. Hibás válaszformátum kivétel; túl sok/ismételt/idegen válasz ne eredményezzen teljes pontot. Semmilyen kliens pontszámot nem olvas.
- `validateAnswer` opcionális; scorer tartalmazza a szükséges ellenőrzést.

A mount(ctx) közös kontextusban `ctx.rand=seededRandom(attempt.seed)`; minden játék első generálása azonos RNG-hívássorrendet használjon a szerver scorerrel. A `ctx.done(localResult, rawAnswer)` második paramétere kötelező minden játékban. Az első paraméter csak a régi offline demóban használható. A root integrálja az app.js szerveres indítást/beküldést. A játékos látta a megjegyzendő információt; ez tanulási rendszer, nem csalásbiztos vizsgarendszer.

`dist/catalog.js` megőrzi 10 játék ID-ját; minden játék kap `levels:[{value:1,label,description,steps?}, ...]`. level2/3 valódi szabályváltozat a mátrix szerint. Egyszerű 4 játék csak level1. `maxCount` és `noCount` megmaradhat; az új formok a level mezőt használják, nem a difficulty-t szint helyett.

## API közös szabály

JSON; GET listák objektumba csomagolva. Hiba `{error:{code,message}}`, megfelelő 400/401/403/404/409/429/503 kód. Cookie `HttpOnly`, `SameSite=Lax`, élesben Secure; nincs CORS wildcard. Minden írás Origin-ellenőrzés; bejelentkezett íráshoz X-CSRF-Token. GET /api/session adja a CSRF tokent; hiányzó session esetén user:null.

User: `{id,username,displayName,role:'teacher'|'student',active}`. username nem email (Hanna címe nem ismert).
Settings a közös normalizálón át. ISO időpontok, string UUID azonosítók.

## Auth

- GET `/api/session` → `{user,csrfToken,setupRequired}`; csrfToken null kijelentkezve.
- POST `/api/auth/setup` `{token,username,displayName,password}` → `{user,csrfToken}`; csak ha még nincs tulajdonosi tanár; token kizárólag runtime BOOTSTRAP_TOKEN. Egyszeri versenyhelyzetbiztos felhasználás.
- POST `/api/auth/login` `{username,password}` → `{user,csrfToken}`.
- POST `/api/auth/logout` `{}` → `{ok:true}`; session visszavonás.
- POST `/api/auth/activate` `{token,password}` → `{user,csrfToken}`; lejáró, egyszer használatos tanulói/tanári aktiválás.
- GET `/api/auth/activation?token=...` → `{displayName,username,expiresAt}` (nem jelszó/secret visszaadás); az UI a link hash-részében tartott tokent olvassa. Nincs külső analytics.

## Tanári műveletek

Minden objektum tanárhoz tartozik; más tanár objektuma 404/403. Tanuló minden teacher útvonalon 403.
- GET `/api/teacher/students` → `{students}`; groupIds a tanulón.
- POST `/api/teacher/students` `{username,displayName,groupIds?:[]}` → `{student,activationToken,expiresAt}`. Aktiválási linket az UI mutatja, nem küldi el.
- PATCH `/api/teacher/students/:id` `{displayName?,active?,groupIds?}` → `{student}`. Inaktiválás revokálja a sessionöket.
- POST `/api/teacher/students/:id/reset` `{}` → `{activationToken,expiresAt}`. Korábbi aktiváló tokenek/sessionök érvénytelenek.
- GET `/api/teacher/groups` → `{groups:[{id,name,studentIds}]}`.
- POST `/api/teacher/groups` `{name,studentIds?:[]}` → `{group}`.
- PATCH `/api/teacher/groups/:id` `{name?,studentIds?}` → `{group}`.
- GET `/api/teacher/assignments` → `{assignments}`.
- POST `/api/teacher/assignments` `{title,instructions?,dueAt?,studentIds?:[],groupIds?:[],steps:[{gameId,settings,repetitions}]}` → `{assignment}`. Tagság snapshot a kiosztáskor; 1..20 lépés, lépésenként 1..10 ismétlés, cím legfeljebb120 karakter. Idempotency-Key fejléc a dupla létrehozás elkerülésére (azonos kérés ugyanazt adja).
- GET `/api/teacher/assignments/:id` → `{assignment,students:[{id,displayName,completed,total,results:[]}],results}`.
- GET `/api/teacher/results?studentId=&assignmentId=` → `{results}`; mindkét szűrő opcionális, tanárhatár kötelező.
- GET `/api/teacher/results/:id` → `{result}` nyers válasz és a szerver által képzett details visszanézhető.

## Tanuló és közös játék

- GET `/api/student/assignments` → `{assignments}`; minden assignment `{id,title,instructions,dueAt,steps:[{id,gameId,settings,repetitions,completed}],completed,total}`.
- GET `/api/results` → `{results}` csak saját, max200 legújabb; az eredmény `{id,gameId,settings,at,correct,total,percent,summary,details,duration,assignmentId,assignmentStepId}`.
- GET `/api/progress` → `{rounds,legacyRounds,correct,total,percent,stars,rank,nbackRounds,nbackAveragePercent,nbackAverageN,nbackHighestN,games:[{gameId,level,bestPercent,rounds}]}`. A `correct`, `total` és `percent` csak a hagyományos játékokat összesíti a korábbi `sum(correct)/sum(total)` képlettel. Az N-back külön, körönként egyenlő súlyú átlagos autoritatív százalékot, átlagos N-t és legmagasabb N-t kap; a Workshop/Jaeggi nevezőt nem keverjük a többi játékkal. S: 100%=3 csillag, >=60%=2, >0%=1, 0%=0; rang 0:Kezdő, 10:Felfedező, 30:Gyakorló, 60:Emlékmester összcsillag. N-back kör csillagot és rangpontot nem ad.
- POST `/api/attempts` `{gameId,settings,assignmentStepId?}` → `{attempt:{id,seed,gameId,settings,assignmentStepId,expiresAt}}`. Szerver generálja a seedet; kiosztáskor annak beállításai kötelezőek, nem a kliensé. Ismétlésszám beteltével új kiosztott kör tiltott, szabad gyakorlás elérhető. Függő kör újratöltéskor újra kérhető; max1 aktív kör/diák/lépés, ezt újra visszaadja. 24h lejárat. Régi, 1-es szabályverziójú N-back lépést vagy függő kört a szerver indítás és beküldés előtt kontrollált `CLIENT_UPDATE_REQUIRED` hibával elutasít; hibás N-back mód `INVALID_GAME_SETTINGS`.
- POST `/api/attempts/:id/submit` `{answer}` → `{result,duplicate:boolean}`. Az attempt tulajdonosa küldheti be; bejelentkezés, CSRF, jogosultság, lejárat ellenőrzés. UNIQUE(attempt_id) és tranzakciós ismétléshatár; ismételt azonos payload azonos eredmény, eltérő payload 409. A seed és settings a DB-ből származik. A kliens pontját ignorálja/elutasítja. Hálózati retry nem dupláz.
- GET `/api/health` → `{ok:true}` DB kapcsolat ellenőrzéssel; ne adjon ki belső adatot.

## Frontend sáv határa

Csak új `dist/school.js`, `dist/school.css`, `dist/api-client.js` és saját teszt ha indokolt; app.js/index.html/core/catalog/games fájlokat root/games sáv módosítja.
Export `createSchool({h,games,onPlay,onAuthChange,renderPractice})` → `{init(),renderRoute():boolean,user getter,csrf getter,api,renderNav(),renderFooter(),refresh()}`. Egyszerűbb alternatív interfészt egyeztesd roottal mielőtt sok kód épül rá. `onPlay(gameId,settings,{assignmentStepId,assignmentId})` root indítja a játékot. school render saját #app shellt használ. Hash útvonalak `/fiok`, `/tanar`, `/tanar/tanulok`, `/tanar/csoportok`, `/tanar/feladatsorok`, `/tanar/eredmenyek`, `/feladataim`, `/haladas`, `/aktivalas?token=...`; a játékoldalak eredeti hash útvonalon maradnak.

Az API kliens fetch same-origin, CSRF a bejelentkezett írásokhoz, 401 után jól érthető belépés; hibák láthatók, küldés közben dupla kattintás tiltva. Nincs tesztfiók vagy titok hardcode. Offline statikus régi demó: GET session 404 esetén tanári felületet ne imitálja.

## Sávok

- backend: server/**, tests/server*.mjs, migrations/**, .env.example (titok nélkül). `pg` szükséges függőség, root írja a package.json-t. Migráció automatikus és tranzakciós indításkor. Integrációs tesztek külön adatbázis/séma, soha létező szolgáltatáson.
- games: dist/games/**, dist/core.js, dist/catalog.js, dist/game-engine.js, tests/games-engine*.mjs és létező játék tesztek. Root ad saját jelenet atlaszt ha szükséges; addig jelzett helyi saját assets felhasználhatók, ne vegyél át AMAkids tartalmat.
- frontend: fentiek. Root: app.js integráció, index.html, saját assets, csomag/deploy, matrix, független gate, E2E.

Nincs executor git write/push, deploy, Sites-eszköz vagy AMAkids böngészés. Minden sáv saját izolált munkafában dolgozik; átadás diff + teszt + .local/reports/<lane>.md. A root integrálja az engedélyezett fájlokat.
