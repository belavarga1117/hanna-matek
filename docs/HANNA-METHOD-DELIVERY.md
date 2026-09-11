# Hanna Módszer – átadási ellenőrzés

Állapot: integrált jelölt, végső javító review és kiadás folyamatban. Indítás: 2026-09-11 13:10:24 UTC. E dokumentum addig nem jelent kiadási készültséget, amíg a kiadás és az éles mentés alább nincs igazolva.

## Hol található

Külön **Hanna Módszer** menüpont. Négy belső nézet: Felfedezés, Napi tréning, Saját eszközeim, Fejlődésem; tanárnál Tanulói fejlődés. A korábbi AMAkids, N-back és Memóriapróbák külön maradnak.

## Játékok és saját böngészős bizonyíték

A fájlok a helyi `.local/hanna-method/` bizonyítékmappában találhatók. Az eredmények saját böngészős UI-kezeléssel születtek (natív kattintás, gépelés és húzás); a válaszidőket nem emberi képességként értelmezzük. A tanári előnézet nem készít tanulói rekordot.

| Tevékenység | Működés | Böngészős ellenőrzés |
|---|---|---|
| Startteszt | Szó/kép/szám, azonnali és késleltetett begépelt felidézés | Saját tanári kiosztás → diák18/18 →100%,1/1kör; külön üres és téves válaszokkal6/18mentve (`uat-baseline-partial-r3fix.png`); `uat-assigned-baseline-result.png` |
| Láncsztori | Szomszédos képpárok, saját történet, sorrend/szabad/random |8elem helyes sorrend; `uat-chain-result.png`; végleges húzás+koppintás8/8: `uat-drag-and-tap-chain-result.png` |
| Képkapcsoló |30másodperc saját asszociációs bemelegítés, páros felidézés |Saját begépelt kapcsolat és3/3pár; `uat-association-result.png` |
| Memóriaútvonal |Stabil vizuális szoba, betanítás, új tárgyak helyekhez kötése |Útvonalteszt után5/5; `uat-loci-result.png` |
| Saját palota |Rendezhető helyek, leírás/fotó, mentés,90%readykapu |Saját5helyes palota létrehozás/ready/reload/játék5/5; `uat-palace-result.png` |
| Peg Master |Kétirányú szám–kép alapozás, új elemek, random hozzáférés |5horog,10alapozó válasz,5/5felidézés; `uat-peg-result.png`; saját10horog mobilos mentése |
| Ki kicsoda? |Arc–név–jellemző, névkulcs és asszociáció |3külön portré/név3/3; `uat-faces-result.png` |
| Kulcsszóhíd |Idegen szó→hangzáskulcs→jelentés, két irány |3szó6/6válasz; `uat-keyword-result.png` |
| Számkód |Magyar0–9hangkód, kétirányú automatizálás, kétjegyű képszótár |20alapozó válasz után10/10kód; `uat-major-result.png`; saját részleges szótár mentése |
| Számszörny |16/20/30számjegy, kétjegyű képlánc, számjegyszintű részpont |390CSSpxnézetben14/16begépelt számjegy88%,mentve; `uat-numbers-short-mobile-result.png` |
| Random Recall |Sorszám, előtte/utána, több elem és kategória |8kérdés,12/12egység, többkiválasztás; `uat-random-result.png` |
| Szövegépítő |Első aktív felidézés, eredeti szöveg visszanézése, új felidézés; kulcsgondolat/szó szerinti |Saját forrásszöveg+rubrika; hiányos első és teljesebb második válasz3/4,75%; `uat-text-own-result.png`, végleges külön50%/100%mutatók: `uat-text-final-subscales.png` |
| Fogalomból kép |Fogalom, vizuális ötlet, definíció, saját kapcsolat |5begépelt definíció5/5; `uat-concept-result.png` |
| Későbbi visszahívás |Ugyanazok a korábban mentett elemek, szerveres esedékesség |Valódi13perc után10/10korábbi elem, mentve; `uat-real-due-review-result.png` |
| Boss Fight |Lista+név+szám+fogalom, részenként választott stratégia |Négy választott technika és16/16egység; `uat-boss-result.png` |

## Közös rendszer

| Követelmény | Ellenőrzés |
|---|---|
|Tanári kiosztás és tanulói mentés|Saját teszttanár létrehozott egy Starttesztet; diák teljesítette; új tanári belépés után részletek és profil megnyílt. `uat-assignment-created.png`, `uat-teacher-assigned-detail.png`, `uat-teacher-progress.png` |
|Privát saját tartalom|Erőforrás tulajdonosi ellenőrzés; tanárnak szabad gyakorlásnál összesített eredmény, privát történet/anyag nélkül. Célzott API regresszió idegen tanulóval és privát palotanévvel. |
|Tartós saját eszközök|Palota, peg-lista,00–99szótár, saját szöveg/rubrika CRUD; verzió és archiválás, régi snapshot megőrzése. |
|Ismétlés és dupla mentés|Esedékesség, foglalás, tranzakció, párhuzamos azonos beküldés: egy eredmény és egy frissítés. Valódi13perces UI-kör;8napos határ idővezérelt adatbázisteszt. |
|Szünet, háttér, restart|Aktív késleltetés megáll, explicit folytatás; szünetben mögöttes gombok tiltva; restart nyom, régi válasz/timer eldobása; tesztelt későn visszaérő szerverválasz. |
|Mobil|390×844CSSpx szimulált böngészőnézet; saját eszköz szerkesztés, számválasz és mentés. Nincs horizontális oldaltúlcsordulás; nagy gombok és számbevitel. Nem fizikai érintőképernyős eszközpróba. |
|Fejlődés|Azonos beállítású körök saját idősora, külön pontosság/sorrend/idő/segítség/megtartás. Adaptív köröknél elemszám és aktivitásszintű összegzés. Tanári saját tanulóválasztás. |
|Hang|0új kötelező klip. Nincs gépi TTS vagy játék közbeni hálózati generálás. Meglévő ElevenLabs hangos feladatok megmaradnak; részletek `HANNA-METHOD-AUDIO-LIST.md`. |

## Módszertan és tudatos termékdöntések

A források elveihez saját böngészős tanító játékokat készítettünk; a publikációk nem ezt az alkalmazást validálták. A kutatási hivatkozások és alkalmazási határok a felület „Mi támasztja alá a módszereket?” részében és `HANNA-METHOD-RESEARCH.md` dokumentumban olvashatók.

- Nincs IQ, agyéletkor, normatív percentilis vagy egyetlen összesített memóriapont. A mértékegységek nem kerülnek mesterséges, közös radarértékbe.
- A saját történet kreativitását nem pontozzuk gépileg. Az asszociáció használata és a későbbi felidézés megfigyelhető; a hiba mentális okát nem állítjuk bizonyítottnak.
- Saját szabály a palota90%-os készültségi kapuja, a peg90%/2mp és Major95%/1,5mp alapozása; nagy pegnél legfeljebb20véletlen horog két irányban. Az elemszám adaptációja és az ismétlési intervallumlétra is saját termékszabály.
- Pontosság, sorrend, helyesválasz-medián, segítség és megtartás külön mutató. A segítséggel vagy megoldásmutatás után adott válasz nem önálló teljesítmény. Nincsenek rejtett bónuszszorzók vagy Hanna-csillagok.
- A begépelt Startteszt felkínált szóbank nélkül kérdez. A rendezési mód felkínált elemekből sorrendfelismerést gyakorol; szabad felidézéssel nem egyenértékű.
- A szövegjelentés ellenőrzése előre megadott elfogadott megfogalmazásokon alapul; nem teljes gépi jelentésmegértés. A szó szerinti mód szavanként értékel.
- Az asszociációs példák előre elkészített magyar tanító ötletek, nem élő AI-generálás. A saját anyag kézzel szerkeszthető; fotó opcionális, max200KB/kép és650KBösszesített szerkesztői fotóbudget.
- A napi10–15perc becsült terv, saját tempóban hosszabb lehet. Az elvégzett részeket a mentett eredmények és a budapesti napváltás alapján jelöljük.
- 24órás/7napos jelvény csak megfelelő szerveres időeltérés és önálló helyes eredmény után jár. A mostani munkamenet nem bizonyít hosszútávú emberi memóriaváltozást.

## Kiadási zárás

Folyamatban: végső javító review, regresszió és Railway kiadás utáni fájlegyezés / valós PostgreSQL mentés-visszaolvasás. A kész kiadás azonosítója, ellenőrzése és tényleges eltelt idő itt lesz rögzítve.

## Független scope-audit

Sol high külön munkafán ellenőrizte a 15 modul és a közös szerződés megfelelését. A névleges nehézség, a hatás nélküli tartalmi szint és a saját kulcsszó/fogalom hiányos anyagának problémáját feltárta; a javítások után nem maradt ismert kötelező funkcióhiány. Beépített tartalom: 120 egyedi tárgy, 100 peg, 12 arc, 8 kulcsszóhíd, 100 magyar Major-kód, 12 fogalom, 4 seedelt szöveg. Ez a tartalomszám önmagában nem bizonyít funkcióparitást.
