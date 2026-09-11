# Hanna Módszer – átadási ellenőrzés

Aktuális állapot: **V2 kiadva, az alább felsorolt ellenőrzési és módszertani korlátokkal**. A V1 történeti kiadást a teljes eredeti scope audit után újranyitottuk. A lent dokumentált konkrét tesztek és kiadás megtörténtek, de a „nem maradt kötelező funkcióhiány” minősítés túl erős volt. Az eredeti koncepcióhoz hiányzó mély tanítási mechanikák és vizuális rendszer elfogadási mátrixa: `HANNA-METHOD-ORIGINAL-SCOPE-ACCEPTANCE.md`. V1 indítás:2026-09-11 13:10:24UTC, kiadási lezárás:15:19:51UTC, eltelt2óra9perc27másodperc. Új hullám indulása:15:40:36UTC.


## V2 – az eredeti koncepció mély megvalósítása

Állapot: **éles kiadás és saját SQL-ellenőrzés lezárva**. A V2 a tizenöt tevékenységet közös, többfázisú tanítási és felidézési motorral, hat rendezett szobával, saját módszertárral és tízdimenziós készségtérképpel valósítja meg. A tételes eredeti követelmény → megvalósítás → saját bizonyíték mátrix a [HANNA-METHOD-ORIGINAL-SCOPE-ACCEPTANCE.md](HANNA-METHOD-ORIGINAL-SCOPE-ACCEPTANCE.md) dokumentum; a régi V1 táblázatok alább történeti állapotot írnak le.

Fontos helyesbítés: a 90%-os sajátpalota-kapu és a Major95%/1,5mp, illetve peg2mp cél **Hanna eredeti kéréséből** származik. Az alábbi V1 szöveg tévesen mindet saját találmánynak nevezte. Az adaptáció konkrét lépcsői, intervallumlétra és peg-pontossági küszöb továbbra saját termékdöntés, nem kutatási norma.

| Kért rész | Hol érhető el | Konkrét V2 bizonyíték |
|---|---|---|
| 15 vezetett játék | Hanna Módszer → Játékok | Mindegyikből tényleges böngészős kör;40 elemű lánc93/93,30 hely68/68,20 arc+tény40/40,30 számjegy szándékos hibával29/30. Részletek az elfogadási mátrixban. |
| Saját palota, horgok,00–99 szótár, tananyag | Saját eszközök | Szerkesztés, sorrend, revízió, readiness, saját fotó feltöltés és visszaolvasás; saját Major3elemű teljes6/6 kör. |
| Azonos anyag többféle felidézése | Lánc/palota/peg → Random Recall | Sorrend → szóbank nélküli lista → konkrét/szomszéd/több pozíció/kategória; korábbi mentett palotából10/10. |
| Aktív és későbbi felidézés | Mai útvonal, Későbbi visszahívás | Ténylegesen kivárt10 perces későbbi kör; napos/hetes intervallumok idővezérelt adatbázispróbán. |
| Készségtérkép | Fejlődésem, tanárnál tanulói profil | Valódi saját eredmények, külön mértékegységek, azonos beállítású idősor; hiányzó tartós adat nem0. |
| Tanári/tanulói teljes folyamat | Tanári feladatsorok és eredmények | Saját böngészős kiosztás →17/17 tanulói mentés →új tanári belépés →helyes tanulói részlet/profil. Éles kétismétléses saját QA-folyamat és tényleges SQL-visszaolvasás alább rögzítve. |
| Mobil és nyugodt tér | Minden játék saját vezérlése |390×844 CSSpx,100% nagyítás: végső rendező720px keret/566px tartalom túlcsordulás nélkül; teljes tárgyképek, nagy válaszgombok, valódi sortöréses szabad lista és30/30 mentés. |
| Független ellenőrzés | MODEL-EVAL.md | Saját Claude Code előfizetés, tényleges Opus5 medium / firstParty. MotorR9/R10, UIR6 és külön vizuálisR2 PASS; előző hibák reprodukcióval javítva. |

A V2 hangigénye **0 új kötelező klip**. Meglévő ElevenLabs bankok változatlanok; nincs új gépi TTS. Az illusztrációk előre elkészültek; a saját asszociáció írása és a tanuló képzeleti képe nem futásidejű AI-generálás.

A böngészős QA saját tesztfiókokkal, agent által kezelt felületen történt: funkciót és mentést igazol, nem emberi emlékezeti teljesítményt. A mobil méret szimulált, nem fizikai iOS/Android. A háttér/blur logikát célzott UItesztek fedik; az automatizált böngészőben az OS-háttérváltás nem adott külön hiteles bizonyítékot. A szünet és újrakezdés tényleges UIpróbája sikeres.

A szerkesztett szövegrubrika elfogadott megfogalmazásokat, kulcsgondolatokat és konkrét ellentmondásokat kezel; **nem teljes nyelvi jelentéselemző**. Ismeretlen vagy összetett parafrázist tanári/önellenőrzéssel kell megerősíteni. Nincs IQ, agyéletkor, populációs percentilis vagy személyes agyi aktivitásmérés. Többnapos emberi hatásvizsgálat nem történt. A runtime AI-segítő és diktálás későbbi bővítés, nem aktív funkció.

### V2 kiadási bizonyíték

- Játszható: [Hanna Módszer](https://memoria-web-production-a86b.up.railway.app/?release=b75b02b#/hanna-modszer), Chrome-ban megnyitva. Éles kezdőképernyő: `.local/hanna-v2/screenshots/live-hub-desktop.png`; friss console error nincs.
- Futó forrás: `b75b02bdb9b74c9173ab6cd8e3cd1d0fd3ddeaa1`; Railway deployment `ce8b4717-760d-4c93-bb8a-4a586c3c16bb`, **SUCCESS**. Publikus **282/282**, futó konténer **303/303** fájl SHA256 szerint azonos a jelölttel. Az ezt követő dokumentációs commit nem változtatja a kiadott programot.
- Friss teljes regresszió: **389/389 PASS**, forrás- és assetellenőrzés PASS. Független valódi `claude-opus-5`, `medium`, `firstParty`: motorR9/R10, UIR6, vizuálisR2 **PASS**. A puszta tesztszám helyett a követelményenkénti böngészős bizonyíték az elfogadási mátrixban szerepel.
- Éles PostgreSQL: saját tanár öt saját tananyagelemmel kétismétléses láncot osztott ki; mindkét külön seedű kör három felidézési fázisa **20/20**. A szerver a valós tíz másodperc letelte előtti mentést elutasította. Párhuzamos újraküldés egyetlen eredményre futott; új tanulói belépés után2/2 teljesítés, tanári részletes visszaolvasás sikeres. Két teljes tanultlánc-pillanatkép került a későbbi ismétlésbe, nem háromszoros másolat a három felidézési fázisból.
- Feladatsor: `87e436b5-45b1-4da0-b4c3-28c0e95fdeb9`. Éles eredmények: `2e79dff0-9e3d-43a1-bf02-f4600052f1db`, `59bb8b33-e096-4771-aa06-bbc32614fee2`. Bizonyíték: `.local/hanna-v2/live-flow-proof.json`, `live-db-closeout.json`. Ez az éles rész API/SQL-integrációs próba ismert válaszokkal; a teljes családos kézi böngészővezérlés külön, saját helyi adatbázison történt.
- Saját privát szótár létrehozás/szerkesztés/revízió/visszaolvasás/archiválás és idegen tanári hozzáférés elutasítása sikeres. A korábbi **8 fiók és11 eredmény teljes sor-ujjlenyomata változatlan**. Csak a két új saját QA-fiókot inaktiváltuk, saját bizonyítékeredményeiket megőriztük. A böngészőben nyitott Hanna-fiókkal csak a katalógust olvastuk, nem írtunk teszteredményt és nem léptettük ki.
- Mentés és tényleges külön SQL-visszaállítás: **2026-09-11 19:33:26 UTC PASS**,53 233 bájt; SHA256 `7132d724ee30712d85bab5a028590cd29346a6784c0a0bee8d2d2c39104e29cf`. A visszaállítás izolált, eldobott adatbázisra történt. Új migráció: `008_hanna_v2_flow.sql`, additív; a régi V1 körök értékelése fagyasztott.
- Az első éles QA-script túl korán már tíz másodperc eltelt késleltetést állított a checkpointban; a szerver helyesen400-zal elutasította. A kizárólag helyi tesztscriptet javítottuk a checkpointkor tényleges0ms-re, majd a teljes valódi időzített próbát újrafuttattuk. A kiadott programot ez nem módosította; az első félbemaradt saját QA-kör az inaktív tesztfióknál megmaradt.
- V2 hullám: **2026-09-11 15:40:36 UTC → 2026-09-11 20:31:08 UTC; 4 óra 50 perc 32 másodperc**. A V1 korábbi2óra9perc27másodperces szakasza ettől külön történeti adat.

### V2 fennmaradó pontos korlátok

- Fizikai iOS/Android és önálló OS-háttérváltási UAT nem történt. A390×844 mobilpróba szimulált; pause/restart valódi felületi, blur/visibility célzott automatikus teszt.
- Napos/hetes esedékesség idővezérelt tesztből igazolt, nem kivárt többnapos emberi hatásvizsgálat. A ténylegesen kivárt tízperces visszahívás külön mentett kör.
- A rubrika szerkesztett gondolategyezést kezel; szokatlan, összetett megfogalmazás tanári/önellenőrzést kérhet. Nem általános jelentésmegértés vagy klinikai mérés.
- A runtime AI-asszociáció és diktálás nem aktív. Nincs új kötelező ElevenLabs-klip. A saját képek, történetek, eszközök és kézi tananyaggal tanulás működő részek.
- Nem blokkoló vizuális/hozzáférhetőségi megjegyzés: mobil katalógusban a felirat a dekoratív szobakép aljára kerül; forgatáskor a rendező fókusza a választóhoz térhet; ritka, fókuszvesztés nélküli elveszett billentyűfelengedésnél egy újabb gombnyomás szükséges lehet. Ezek nem rejtett készültségi állítások.

---

# V1 történeti jelentés – az alábbi állításokat a fenti V2 helyesbítés felülírja


## Hol található

Külön **Hanna Módszer** menüpont. Négy belső nézet: Felfedezés, Napi tréning, Saját eszközeim, Fejlődésem; tanárnál Tanulói fejlődés. A korábbi AMAkids, N-back és Memóriapróbák külön maradnak.

## Játékok és saját böngészős bizonyíték

A fájlok a helyi `.local/hanna-method/` bizonyítékmappában találhatók. Az eredmények saját böngészős UI-kezeléssel születtek (natív kattintás, gépelés és húzás); a válaszidőket nem emberi képességként értelmezzük. A tanári előnézet nem készít tanulói rekordot.

| Tevékenység | Működés | Böngészős ellenőrzés |
|---|---|---|
| Startteszt | Szó/kép/szám, azonnali és késleltetett begépelt felidézés | Saját tanári kiosztás → diák 18/18 →100%,1/1 kör; külön üres és téves válaszokkal 6/18 mentve (`uat-baseline-partial-r3fix.png`); `uat-assigned-baseline-result.png` |
| Láncsztori | Szomszédos képpárok, saját történet, sorrend/szabad/random |8 elem helyes sorrend; `uat-chain-result.png`; végleges húzás+koppintás 8/8: `uat-drag-and-tap-chain-result.png` |
| Képkapcsoló |30 másodperc saját asszociációs bemelegítés, páros felidézés |Saját begépelt kapcsolat és 3/3 pár; `uat-association-result.png` |
| Memóriaútvonal |Stabil vizuális szoba, betanítás, új tárgyak helyekhez kötése |Útvonalteszt után 5/5; `uat-loci-result.png` |
| Saját palota |Rendezhető helyek, leírás/fotó, mentés,90% készültségi kapu |Saját 5 helyes palota létrehozás/ready/reload/játék 5/5; `uat-palace-result.png` |
| Peg Master |Kétirányú szám–kép alapozás, új elemek, random hozzáférés |5 horog,10 alapozó válasz,5/5 felidézés; `uat-peg-result.png`; saját 10 horog mobilos mentése |
| Ki kicsoda? |Arc–név–jellemző, névkulcs és asszociáció |3 külön portré/név 3/3; `uat-faces-result.png` |
| Kulcsszóhíd |Idegen szó→hangzáskulcs→jelentés, két irány |3 szó 6/6 válasz; `uat-keyword-result.png` |
| Számkód |Magyar 0–9 hangkód, kétirányú automatizálás, kétjegyű képszótár |20 alapozó válasz után 10/10 kód; `uat-major-result.png`; saját részleges szótár mentése |
| Számszörny |16/20/30 számjegy, kétjegyű képlánc, számjegyszintű részpont |390 CSSpxnézetben 14/16 begépelt számjegy 88%,mentve; `uat-numbers-short-mobile-result.png` |
| Random Recall |Sorszám, előtte/utána, több elem és kategória |8 kérdés,12/12 egység, többkiválasztás; `uat-random-result.png` |
| Szövegépítő |Első aktív felidézés, eredeti szöveg visszanézése, új felidézés; kulcsgondolat/szó szerinti |Saját forrásszöveg+rubrika; hiányos első és teljesebb második válasz 3/4,75%; `uat-text-own-result.png`, végleges külön 50%/100% mutatók: `uat-text-final-subscales.png` |
| Fogalomból kép |Fogalom, vizuális ötlet, definíció, saját kapcsolat |5 begépelt definíció 5/5; `uat-concept-result.png` |
| Későbbi visszahívás |Ugyanazok a korábban mentett elemek, szerveres esedékesség |Valódi 13 perc után 10/10 korábbi elem, mentve; `uat-real-due-review-result.png` |
| Boss Fight |Lista+név+szám+fogalom, részenként választott stratégia |Négy választott technika és 16/16 egység; `uat-boss-result.png` |

## Közös rendszer

| Követelmény | Ellenőrzés |
|---|---|
|Tanári kiosztás és tanulói mentés|Saját teszttanár létrehozott egy Starttesztet; diák teljesítette; új tanári belépés után részletek és profil megnyílt. `uat-assignment-created.png`, `uat-teacher-assigned-detail.png`, `uat-teacher-progress.png` |
|Privát saját tartalom|Erőforrás tulajdonosi ellenőrzés; tanárnak szabad gyakorlásnál összesített eredmény, privát történet/anyag nélkül. Célzott API regresszió idegen tanulóval és privát palotanévvel. |
|Tartós saját eszközök|Palota, peg-lista,00–99 szótár, saját szöveg/rubrika CRUD; verzió és archiválás, régi snapshot megőrzése. |
|Ismétlés és dupla mentés|Esedékesség, foglalás, tranzakció, párhuzamos azonos beküldés: egy eredmény és egy frissítés. Valódi 13 perces UI-kör;8 napos határ idővezérelt adatbázisteszt. |
|Szünet, háttér, restart|Aktív késleltetés megáll, explicit folytatás; szünetben mögöttes gombok tiltva; restart nyom, régi válasz/timer eldobása; tesztelt későn visszaérő szerverválasz. |
|Mobil|390×844 CSSpx szimulált böngészőnézet; saját eszköz szerkesztés, számválasz és mentés. Nincs horizontális oldaltúlcsordulás; nagy gombok és számbevitel. Nem fizikai érintőképernyős eszközpróba. |
|Fejlődés|Azonos beállítású körök saját idősora, külön pontosság/sorrend/idő/segítség/megtartás. Adaptív köröknél elemszám és aktivitásszintű összegzés. Tanári saját tanulóválasztás. |
|Hang|0 új kötelező klip. Nincs gépi TTS vagy játék közbeni hálózati generálás. Meglévő ElevenLabs hangos feladatok megmaradnak; részletek `HANNA-METHOD-AUDIO-LIST.md`. |

## Módszertan és tudatos termékdöntések

A források elveihez saját böngészős tanító játékokat készítettünk; a publikációk nem ezt az alkalmazást validálták. A kutatási hivatkozások és alkalmazási határok a felület „Mi támasztja alá a módszereket?” részében és `HANNA-METHOD-RESEARCH.md` dokumentumban olvashatók.

- Nincs IQ, agyéletkor, normatív percentilis vagy egyetlen összesített memóriapont. A mértékegységek nem kerülnek mesterséges, közös radarértékbe.
- A saját történet kreativitását nem pontozzuk gépileg. Az asszociáció használata és a későbbi felidézés megfigyelhető; a hiba mentális okát nem állítjuk bizonyítottnak.
- Saját szabály a palota 90%-os készültségi kapuja, a peg 90%/2 mp és Major 95%/1,5 mp alapozása; nagy pegnél legfeljebb 20 véletlen horog két irányban. Az elemszám adaptációja és az ismétlési intervallumlétra is saját termékszabály.
- Pontosság, sorrend, helyesválasz-medián, segítség és megtartás külön mutató. A segítséggel vagy megoldásmutatás után adott válasz nem önálló teljesítmény. Nincsenek rejtett bónuszszorzók vagy Hanna-csillagok.
- A begépelt Startteszt felkínált szóbank nélkül kérdez. A rendezési mód felkínált elemekből sorrendfelismerést gyakorol; szabad felidézéssel nem egyenértékű.
- A szövegjelentés ellenőrzése előre megadott elfogadott megfogalmazásokon alapul; nem teljes gépi jelentésmegértés. A szó szerinti mód szavanként értékel.
- Az asszociációs példák előre elkészített magyar tanító ötletek, nem élő AI-generálás. A saját anyag kézzel szerkeszthető; fotó opcionális, max 200 KB/kép és 650 KBösszesített szerkesztői fotóbudget.
- A napi 10–15 perc becsült terv, saját tempóban hosszabb lehet. Az elvégzett részeket a mentett eredmények és a budapesti napváltás alapján jelöljük.
- 24 órás/7 napos jelvény csak megfelelő szerveres időeltérés és önálló helyes eredmény után jár. A mostani munkamenet nem bizonyít hosszútávú emberi memóriaváltozást.

## Kiadási zárás

- Játszható cím: [Hanna Módszer](https://memoria-web-production-a86b.up.railway.app/?release=a353d0b#/hanna-modszer).
- Kiadott forrás: `a353d0b9cbe458d9e2eb1eea647462895e5a9102`; Railway deployment: `c24fb090-2be2-418a-8598-a22847c01ece`, SUCCESS.
- Friss mentés és külön adatbázisos visszaállítás: 2026-09-11 15:12:42 UTC, PASS. A meglévő adatokra nem futott visszaállítás.
- Publikus fájlegyezés: **101/101**; futó konténer forrás/migráció/csomag egyezés: **120/120**; API health PASS. `.local/hanna-method/public-assets-proof.json`, `runtime-source-proof.json`.
- Valódi Railway PostgreSQL: saját tanár tananyaggal két ismétléses feladatsort adott ki; két külön seed, mindkettő 5/5. A valós 10 másodperces késleltetés előtti mentést a szerver elutasította; párhuzamos újraküldés ugyanazt az eredményazonosítót adta. Új tanulói belépés után 2/2 teljesítés, a tanár részletből visszaolvasta. **10 valódi, későbbre esedékes ismétlőkártya** létrejött. Bizonyíték: `live-flow-proof.json`, `live-db-closeout.json`.
- Éles eredményazonosítók: `f6f3362a-24ad-4f26-becb-d24f8485a014`, `cdedb476-c26e-4020-8e22-8e2802e95cf7`. Feladatsor: `67c203fb-8c0f-4b07-b7d8-0185210cb6e6`.
- Az éles próba előtti **6 fiók és 9 eredmény tartalmi ujjlenyomata változatlan**. Csak külön saját QA-fiókok kaptak új adatot; a próba végén inaktiváltuk őket, eredményeiket megőriztük. A régebbi N-back QA-fiókok már inaktívak voltak; nem állítottuk vissza őket és nem módosítottuk jelszavukat.
- Publikus böngészőben a teljes menü és 15 tevékenység betöltött, console error nincs; `uat-public-hub.png`. A teljes játékcsaládos UAT és célzott negatív tesztek a jelölt lokális, saját adatbázisos példányán futottak; az éles fájlegyezés és adatfolyam külön igazolt.
- Végleges regresszió: **245/245 PASS**; forrás/assetellenőrzés PASS. Független Claude Opus 5 medium R4, R5, R6: **PASS**, tényleges first-party modellroutinggal. A korábbi CHANGES_REQUIRED körök hibái javítva; részletek `MODEL-EVAL.md`.

### Fennmaradó korlátok

Nincs ismert, reprodukált blokkoló a megvalósítási szerződésben. A mobilpróba szimulált böngészőméret volt, nem fizikai iOS/Android érintőeszköz. A 24 órás/7 napos határt idővezérelt adatbázisteszt ellenőrizte; valódi 13 perces ismétlés készült, emberi többhetes hatásvizsgálat nem. A saját szöveg értékelése megadott elfogadott alakokon alapul, a kreatív asszociáció nem kap objektív gépi minősítést. Az AI-generálás és hangos diktálás nem aktív funkció; a feladatok magyar írott tanítással és saját szerkeszthető tartalommal teljesek. Új ElevenLabs-fájl jelenleg nem szükséges.


## Független scope-audit

Sol high külön munkafán ellenőrizte a 15 modul és a közös szerződés megfelelését. A névleges nehézség, a hatás nélküli tartalmi szint és a saját kulcsszó/fogalom hiányos anyagának problémáját feltárta; a javítások után nem maradt ismert kötelező funkcióhiány. Beépített tartalom: 120 egyedi tárgy, 100 peg, 12 arc, 8 kulcsszóhíd, 100 magyar Major-kód, 12 fogalom, 4 seedelt szöveg. Ez a tartalomszám önmagában nem bizonyít funkcióparitást.
