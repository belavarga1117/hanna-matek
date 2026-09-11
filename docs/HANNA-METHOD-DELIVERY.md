# Hanna Módszer – átadási ellenőrzés

Állapot: **kiadva és ellenőrizve**. Indítás: 2026-09-11 13:10:24 UTC. Lezárás: 2026-09-11 15:19:51 UTC. Tényleges eltelt idő: **2 óra 9 perc 27 másodperc**.

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

- Játszható cím: [Hanna Módszer](https://memoria-web-production-a 86 b.up.railway.app/?release=a353d0b#/hanna-modszer).
- Kiadott forrás: `a353d0b9cbe458d9e2eb1eea647462895e5a9102`; Railway deployment: `c24fb090-2be2-418a-8598-a22847c01ece`, SUCCESS.
- Friss mentés és külön adatbázisos visszaállítás: 2026-09-11 15:12:42 UTC, PASS. A meglévő adatokra nem futott visszaállítás.
- Publikus fájlegyezés: **101/101**; futó konténer forrás/migráció/csomag egyezés: **120/120**; API health PASS. `.local/hanna-method/public-assets-proof.json`, `runtime-source-proof.json`.
- Valódi Railway PostgreSQL: saját tanár tananyaggal két ismétléses feladatsort adott ki; két külön seed, mindkettő 5/5. A valós 10 másodperces késleltetés előtti mentést a szerver elutasította; párhuzamos újraküldés ugyanazt az eredményazonosítót adta. Új tanulói belépés után 2/2 teljesítés, a tanár részletből visszaolvasta. **10 valódi, későbbre esedékes ismétlőkártya** létrejött. Bizonyíték: `live-flow-proof.json`, `live-db-closeout.json`.
- Éles eredményazonosítók: `f6f3362a-24ad-4f26-becb-d24f8485a014`, `cdedb476-c26e-4020-8e22-8e2802e95cf7`. Feladatsor: `67c203fb-8c0f-4b07-b7d8-0185210cb6e6`.
- Az éles próba előtti **6 fiók és 9 eredmény tartalmi ujjlenyomata változatlan**. Csak külön saját QA-fiókok kaptak új adatot; a próba végén inaktiváltuk őket, eredményeiket megőriztük. A régebbi N-back QA-fiókok már inaktívak voltak; nem állítottuk vissza őket és nem módosítottuk jelszavukat.
- Publikus böngészőben a teljes menü és 15 tevékenység betöltött, console error nincs; `uat-public-hub.png`. A teljes játékcsaládos UAT és célzott negatív tesztek a jelölt lokális, saját adatbázisos példányán futottak; az éles fájlegyezés és adatfolyam külön igazolt.
- Végleges regresszió: **245/245 PASS**; forrás/assetellenőrzés PASS. Független Claude Opus 5 medium R 4, R 5, R 6: **PASS**, tényleges first-party modellroutinggal. A korábbi CHANGES_REQUIRED körök hibái javítva; részletek `MODEL-EVAL.md`.

### Fennmaradó korlátok

Nincs ismert, reprodukált blokkoló a megvalósítási szerződésben. A mobilpróba szimulált böngészőméret volt, nem fizikai iOS/Android érintőeszköz. A 24 órás/7 napos határt idővezérelt adatbázisteszt ellenőrizte; valódi 13 perces ismétlés készült, emberi többhetes hatásvizsgálat nem. A saját szöveg értékelése megadott elfogadott alakokon alapul, a kreatív asszociáció nem kap objektív gépi minősítést. Az AI-generálás és hangos diktálás nem aktív funkció; a feladatok magyar írott tanítással és saját szerkeszthető tartalommal teljesek. Új ElevenLabs-fájl jelenleg nem szükséges.


## Független scope-audit

Sol high külön munkafán ellenőrizte a 15 modul és a közös szerződés megfelelését. A névleges nehézség, a hatás nélküli tartalmi szint és a saját kulcsszó/fogalom hiányos anyagának problémáját feltárta; a javítások után nem maradt ismert kötelező funkcióhiány. Beépített tartalom: 120 egyedi tárgy, 100 peg, 12 arc, 8 kulcsszóhíd, 100 magyar Major-kód, 12 fogalom, 4 seedelt szöveg. Ez a tartalomszám önmagában nem bizonyít funkcióparitást.
