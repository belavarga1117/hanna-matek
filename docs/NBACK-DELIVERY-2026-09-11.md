# Hanna N-back Műhely – átadási és ellenőrzési jelentés

Állapot: **kiadva, az alább felsorolt működési próbákkal igazolva; a valós háttérbe helyezés automatikus szüneteltetésének elfogadási próbája nyitott**. Játszható változat: [N-back Műhely](https://memoria-web-production-a86b.up.railway.app/#/jatek/nback). Ez a dokumentum a külön N-back kategóriáról szól, nem állít AMAkids/Memorica teljes funkcióparitást.

## Referencia és a saját megvalósítás határa

Elsődleges referencia: [Brain Workshop 5.0, 3476f724](https://github.com/brain-workshop/brainworkshop/blob/3476f724eb623b6e39605bd7a7e3df245787e73a/brainworkshop.py). A [webes útmutató](https://brainworkshop.sourceforge.net/tutorial.html) és a [részletes leírás](https://brainworkshop.sourceforge.net/details.html) mellett a pinelt kód dönt. A szabályok pontos forrássorai és az eltérések: [NBACK-REFERENCE.md](NBACK-REFERENCE.md). A referenciaprogramot nem futtattuk: a bizonyíték dokumentáció- és kódvizsgálat, majd saját ismert sorozatos és böngészős ellenőrzés. Teljes asztali alkalmazásazonosságot nem állítunk.

A tanári kiosztás, tanulói fiók, szerveres mentés és fejlődési nézet Hanna saját infrastruktúrája. Ezeknek nincs Brain Workshop tanári referenciafolyamata.

## Játékmódok

Mindegyik a kezdőlap külön **N-back Műhely** kategóriájából, a beállítások **Feladattípus** választójában érhető el. A referencia mód- és csatornalistája: a pinelt fájl 1149–1236. sora. Az alábbi módokból valódi Chrome-felületen legalább egy teljes rövid kör végigment. Ez a körönkénti működést igazolja; nem jelenti az összes N/tempó/módosító kombináció kézi végigjátszását. A teljes 28 módos helyi böngészőpróba és a lent részletezett élő Railway-próba külön bizonyíték.

| Módazonosító | Játékmód | Böngészős ellenőrzés |
|---|---|---|
| 10 | Pozíció | mobil; mentés; hálózati hiba utáni visszaállítás |
| 11 | Hang | teljes rövid kör és fiókmentés |
| 2 | Duál | három tárgy mobilon; végleges ElevenLabs-készlet; Jaeggi külön |
| 3 | Tripla | teljes rövid kör és fiókmentés |
| 28 | Négyes: hely, szín, kép, hang | teljes rövid kör és fiókmentés |
| 4 | Duál Combination | négy ön-/keresztirányú válaszgomb; mentés |
| 5 | Tripla Combination | teljes rövid kör és fiókmentés |
| 6 | Quad Combination | teljes rövid kör és fiókmentés |
| 12 | Színes Combination | teljes rövid kör és fiókmentés |
| 7 | Arithmetic | egész/tört; külön megerősítés nélküli helyes bevitel 4/4 |
| 8 | Dual Arithmetic | negatív kivonás; számolás 4/4; mentés |
| 9 | Triple Arithmetic | tanári kiosztás két ismétléssel, tanulói teljesítés, tanári részletek |
| 20 | Hely és szín | mobil; Crab + négy tárgy; mentés |
| 21 | Hely és kép | mobil; teljes rövid kör |
| 22 | Szín és hang | teljes rövid kör és fiókmentés |
| 23 | Kép és hang | teljes rövid kör és fiókmentés |
| 24 | Szín és kép | mobil; teljes rövid kör |
| 25 | Hely, szín és kép | mobil; teljes rövid kör |
| 26 | Hely, kép és hang | teljes rövid kör és fiókmentés |
| 27 | Szín, kép és hang | teljes rövid kör és fiókmentés |
| 100 | Két hang | kimondott betű + zongorahang, végleges hangkészlettel is |
| 101 | Hely és két hang | teljes rövid kör és fiókmentés |
| 102 | Szín és két hang | teljes rövid kör és fiókmentés |
| 103 | Kép és két hang | teljes rövid kör és fiókmentés |
| 104 | Hely, szín és két hang | négy tárgy, tíz válaszgomb, 375×667 mobilnézet |
| 105 | Hely, kép és két hang | teljes rövid kör és fiókmentés |
| 106 | Szín, kép és két hang | teljes rövid kör és fiókmentés |
| 107 | Ötös: hely, szín, kép, két hang | teljes rövid kör és fiókmentés |

Privát futási bizonyíték: `.local/nback-execution/browser-rounds.json`, körönkénti látható képernyőszövegekkel és eredményekkel. A bináris gombokat több füstpróbában szándékosan minden lépésben megnyomtuk: ezek működési/mentési próbák, nem tökéletes játékállítások. A helyesség független, előre ismert sorozatai a motor- és elfogadási tesztekben vannak.

## Közös követelmények és bizonyíték

| Követelmény | Hol / bizonyíték | Eltérés vagy korlát |
|---|---|---|
| Variable N | Beállítás; N=3 + két tárgy + teljes interference böngészőben; indexhatár-fixture | Variable+Crab tiltott, a referencia FIXME-jét nem vettük át |
| Crab | N=3, fordított blokk célindexe `[2,1,0,5,4,3]`; négy tárgyas mobilkör | Az értelmes blokkfordítás szerint; webes képlet és kód eltérése dokumentálva |
| Multi-stim | 2, 3 és 4 tárgy kipróbálva; tárgycsere-fixture; tíz gombos mobilkör | Csak a pinelt forrásban támogatott módok; stabil tárgyazonosság |
| Interference | 0/1 és generált közeli ismétlések tesztje; Variable/Crab böngészős kör | A valószínűség a megtévesztés megkísérlésére vonatkozik, nem a kész sor garantált százalékára |
| N, tempó, körhossz | Közös beállítás, könnyű és referencia-hossz előbeállítás | N 1–20; 4–200 pontozott lépés; plusz N bemelegítés |
| Kézi/adaptív nehézség | Ismert küszöbök, három nem egymást követő alacsony eredmény; szerveres korábbi állapot tesztje | N-back nem ad csillagot és nem old fel AMAkids-szinteket |
| Pontozás | Workshop pooled `floor(100TP/(TP+FP+FN))`; Jaeggi a gyengébb csatorna; ismert fixture-ek | Válasz nélküli Workshop 0%; Jaeggi forráshűen 70%, külön profilként |
| Mindenre kattintás / kihagyás | Független FP/FN/TN fixture-ek; tényleges böngészős spamkörök | Duplikált jelölés nem ad többletpontot |
| Bemelegítés | Első N lépés láthatóan „még nincs pontozás”; raw/score-határteszt | Következetesen kihagyjuk a pontozásból |
| Magyar bevezető / próba | Játékindítás előtti rövid szabályok, külön nem mentett vezetett kör | Saját szöveg és modern felület |
| Mobil és billentyűzet | Valós megnevezésű gombok; mobilon nincs A/L billentyűcímke; 375×667 és 390×844 Chrome-nézet | Mobilnézet-emuláció, nem natív iPhone/Android készülékteszt |
| Hang | A felhasználó 12 ElevenLabs-beszédfájlja + 8 saját zongorahang; teljes helyi előtöltés, v4 cache | Új magyar hanganyag; nem a referencia hangfájljai |
| Hangidőzítés | Leghosszabb 1042 ms; fix hangos minimum 1200 ms; saját tempó kivárja a hang végét; élő, nyugodt ütemű Triple Arithmetic-próba | A felhasználó a hang–kép ütemezését elfogadta; a „késett” választ kifejezetten félrekattintásként javította. Ez az adott körre szól, nem minden készülék késleltetésmérése |
| Szünet / megszakítás | Kézi szünet/folytatás böngészőben; szünet kizárva az órából; maradék hang offsetről; leállítás/dispose és óratesztek | Nincs reakcióidő-metrika azonossági állítás |
| Háttérbe helyezés automatikus szünete | A blur/visibility események kezelése és a befagyasztott idő automatizált tesztje sikeres | **Böngészős elfogadás nyitott:** a vezérelt Chrome másik lap kiválasztásakor is `visible` állapotot jelentett; ebből sem valódi működést, sem alkalmazáshibát nem lehetett igazolni |
| Stabil pályapozíció váltáskor | Öt eltérő elrendezés, módok: 10, 27, 4, 7, 104; az ingerterület mért elmozdulása minden esetben 0 px; bemelegítésből pontozott lépésbe váltás is ellenőrizve | Az üres/feliratos állapotsor eltérő magasságát javítottuk; nem minden készülék és betűméret teljes kombinációja |
| Számolás | Korábbi szám művelet mostani szám; pontos racionális válasz, előjel és tört mobilgomb; automatikus válaszrögzítés | Üres bevitel nem 0; Variable/Crab osztás a tényleges célindexet használja a forrás hibája helyett |
| Tanári kiosztás | Játék, teljes mód/beállítás és ismétlésszám; saját tanár–tanuló két ismétléses folyamat | Hanna saját tanári működése |
| Szerveres pontszám/mentés | Szerver saját seed/config alapján újragenerál, nyers válaszokból értékel; ügyfélpontszám elutasítva | A seed tanulási célból nem titkos; nem csalásbiztos versenyrendszer |
| Újraküldés | Egyidejű dupla beküldés és eltérő raw konfliktus helyi tesztje; böngészőben hálózathiba→reload→retry; élő Railway-en két párhuzamos azonos újraküldés | Mindkét élő válasz HTTP 200, `duplicate: true`, ugyanaz az eredményazonosító; a kiosztás eredményszáma 2 maradt |
| Újrabelépés / tanári eredmény | Saját tanuló kilépés–belépés után 2/2; tanár látja TP/FP/FN/TN részleteket | Privát tesztfiókok, valódi tanulónak nem osztottunk ki leckét |
| Fejlődés | N-back körök, átlagos pontszám/N és legmagasabb N; mód/profil/módosítók külön csoportban | A régi játékok csillag- és összpontszáma nem keveredik ide |
| Régi játékok | Meglévő regressziós tesztek; Számlánc kézi böngészős kör: 3/3, három csillag, mentve; additív, nullable metrics migráció | A két eredeti élő felhasználó és két eredeti eredmény ujjlenyomata kiadás után változatlan; minden korábbi játék teljes kézi újratesztelése nem történt meg |

## Saját szabályok, eltérések

A bővítés a pinelt forrás játékszabályait követi, dokumentált eltérésekkel. Saját döntés a könnyű alapbeállítás, a böngészős védett tartományok, a hangos 1200 ms minimum, a pontozott körhossz közvetlen beállítása, a magyar hangok és saját alakzatok, a mobilbevitel és a tanári folyamat. Az üres számolási választ nem értelmezzük nullaként. A forrás hibás Variable/Crab osztási célindexét javítjuk. A forrásban bizonytalan Variable+Crab együtt nem választható. A művelet vizuálisan is látható. Nincs saját csillagképlet, jutalompont vagy rejtett szintfeloldás.

A forrás által korlátlanabb konfiguráció, eredeti asztali gyorsbillentyűk, reakcióidő-export és pontos véletlenszám-sorozat nem célzott azonosság. Az N=1-től N=20-ig minden lehetséges mód/nehézség-kombináció teljes kézi ellenőrzése nem történt meg; az index- és konfigurációs határokat automatizált ismert sorozatok és generálási tesztek fedik.

## Ellenőrzési hibák és javítások

A felhasználói hangpróba feltárta a rossz „kis A” kiejtést, kapkodó beszédet és zavaró műveletneveket; mind a 12 régi beszédfájlt a felhasználó felvételeire cseréltük. A felhasználói UI-próba alapján valódi mobilgombok és „Kimondott betű / Zongorahang” címkék kerültek be, a rácsra csúszó felirat megszűnt.

A független Grok 4.6 medium felülvizsgálat valódi hibákat talált: szünetkor újrainduló lépésidő; külön Enter nélkül elvesző számolási válasz; régi hang cache-ben maradása. Ezeket reprodukáltuk, javítottuk és külön időzítési/nyersválasz-teszttel ellenőriztük. A következő kör a mobil előjelgomb piszkozatfrissítését találta meg; ezt a root is egymástól függetlenül észlelte és javította, külön regressziós teszttel. A javított kód végső felülvizsgálata **PASS**, a későbbi pályapozíció-javítás külön felülvizsgálata szintén **PASS**. A korábbi időtúllépés nem számít sikeres review-nak. Részletek: [NBACK-MODEL-EVAL.md](NBACK-MODEL-EVAL.md).

## Tényleges kiadás és élő ellenőrzés

- Kódsnapshot: `022b86e5ee1c2f13341e20d3158af4be9fa9bb58`; a megvalósítás commitja `df65aa0`. A jelentés későbbi dokumentációs lezárása nem módosítja a futó kódot.
- Railway deployment: `3d3eaed3-1644-4339-a30b-1389d4967fd5`, **SUCCESS**, indítva 2026-09-11 08:50:02 CEST. Kizárólag a meglévő Railway-folyamatot használtuk, nyilvános GitHub-push nem történt.
- A futó konténer 69/69 vizsgált forrásfájljának hash-e és 30/30 HTTP-n visszakért nyilvános fájl hash-e megegyezett a jelölttel; az egészségellenőrzés sikeres. Ez az élő kód azonosságának bizonyítéka, nem a funkcióparitás helyettesítője.
- Kiadás előtti friss PostgreSQL-mentés: 08:45:26 CEST; 31 290 bájt; SHA256 `50f61d049f7d7487a80297fbc856b71610ff2a2ff999748ca2aa4570e37ea300`. Külön ideiglenes adatbázisba történő visszaállítás sikeres. Az eredeti adatbázist a visszaállítási próba nem módosította.
- Saját tanári–tanulói kiosztás: `38c83c34-8375-4cdd-adf7-b8d8a437394b`, Triple Arithmetic, N=1, négy értékelt lépés, saját tempó, két ismétlés. A két mentett eredmény: `a236c9f2-a3ed-4467-8ba1-5b6a1a28ecca` és `5c80616f-05c1-4ad2-9673-eb936445e001`.
- Mindkét kiosztott kör 58%; a számolás mindkettőben 4/4. A bináris csatornákat szándékosan túl sokszor jelöltük, ezért a hibás jelzések ténylegesen rontották az eredményt. Újrabelépés után 2/2 teljesítés, tanárként két eredmény és csatornánkénti találat/hibás jelzés/kihagyás/helyes elutasítás látszott.
- Az ezt követő külön, nyugodt ütemű élő próbakör 100%-kal mentődött; a hang megvárása után érkeztek a válaszok. A felhasználó az ütemezést elfogadta: „bocsi, mis click. jó volt”.
- Független élő API-ellenőrzés: azonos nyers válasz két párhuzamos újraküldése nem hozott létre új eredményt. A régi adatok ujjlenyomata változatlan; a 001–004 migráció jelen van.
- A teljes helyi tesztfutás **123/123 PASS**, a szintaktikai/asset-ellenőrzés sikeres. Ezek a konkrét böngészős és élő adatfolyam-bizonyítékok mellett szerepelnek, nem önálló paritási igazolásként.

A privát bizonyítékok a projekt `.local/nback-execution/` mappájában vannak: `browser-rounds.json`, `layout-stability.json`, `tests-final.log`, `check-final.log`, `deployment.json`, `runtime-source-proof.json`, `public-assets-proof.json`, `backup-latest.json`, `live-data-proof-api.json`, `live-data-proof-db.json`, valamint a `live-*.txt` böngészős feljegyzések. A saját tesztfiókok eredményei megmaradtak; kizárólag a két saját új QA-fiókot inaktiváltuk és azok öt munkamenetét töröltük. Más felhasználó változatlan maradt. A takarítás bizonyítéka `live-qa-cleanup.json`.

Munkaindítás: **2026-09-11 07:09:28 CEST**. Az utolsó élő ellenőrzés és a bizonyítékösszesítő lezárása: **09:12:37 CEST**; eltelt idő **2 óra 3 perc 10 másodperc** (7390 másodperc, kerekítve). Az összesítő `final-evidence.json`; 43 rögzített böngészős kört tartalmazó naplóra hivatkozik. Ezt követően csak a jelentés dokumentációs lezárása történt. A játszható éles N-back beállításlapot külön Chrome-lapon megnyitottuk.

## Még nyitott ellenőrzés és az azonosság korlátai

1. **Valódi, nem vezérelt böngészős lapváltás és háttérbe helyezés:** ellenőrizni kell, hogy megáll az idő és a hang, majd folytatáskor nincs összetorlódás vagy dupla mentés. A tesztkörnyezet láthatósági viselkedése miatt ezt a pontot nem tekintjük elfogadottnak; igazolt alkalmazáshiba jelenleg nincs.
2. Natív iPhone/Safari és Android készüléken nem történt próba; a mobilbizonyíték Chrome-emuláció. A felhasználói hangpróba az adott asztali körre vonatkozik.
3. Minden szabálycsaládhoz van ismert sorozat és rövid böngészős kör, de az összes N/nehézség/tempó/módosító kombináció kézi átvizsgálása nem történt meg. A pinelt asztali Brain Workshop közvetlen, azonos ingerű összehasonlító futtatása sincs igazolva.

A dokumentált saját döntések megtartásával ez egy forrás alapján készített böngészős változat. Teljes referencia-alkalmazásazonossághoz a nyitott életciklus-próbán túl közvetlen referenciafuttatás, eltérésenkénti elfogadás vagy módosítás, valamint szélesebb készülékteszt szükséges.
