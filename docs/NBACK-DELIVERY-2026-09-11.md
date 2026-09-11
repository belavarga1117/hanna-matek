# Hanna N-back Műhely – átadási és ellenőrzési jelentés

Állapot: végső kiadási ellenőrzés folyamatban. Ez a dokumentum a külön N-back kategóriáról szól, nem állít AMAkids/Memorica teljes funkcióparitást.

## Referencia és a saját megvalósítás határa

Elsődleges referencia: [Brain Workshop 5.0, 3476f724](https://github.com/brain-workshop/brainworkshop/blob/3476f724eb623b6e39605bd7a7e3df245787e73a/brainworkshop.py). A [webes útmutató](https://brainworkshop.sourceforge.net/tutorial.html) és a [részletes leírás](https://brainworkshop.sourceforge.net/details.html) mellett a pinelt kód dönt. A szabályok pontos forrássorai és az eltérések: [NBACK-REFERENCE.md](NBACK-REFERENCE.md). A referenciaprogramot nem futtattuk: a bizonyíték dokumentáció- és kódvizsgálat, majd saját ismert sorozatos és böngészős ellenőrzés. Teljes asztali alkalmazásazonosságot nem állítunk.

A tanári kiosztás, tanulói fiók, szerveres mentés és fejlődési nézet Hanna saját infrastruktúrája. Ezeknek nincs Brain Workshop tanári referenciafolyamata.

## Játékmódok

Mindegyik a kezdőlap külön **N-back Műhely** kategóriájából, a beállítások **Játékmód** választójában érhető el. A referencia mód- és csatornalistája: a pinelt fájl 1149–1236. sora. Az alábbi módokból valódi Chrome-felületen legalább egy teljes rövid kör végigment. Ez a körönkénti működést igazolja; nem jelenti az összes N/tem­pó/módosító kombináció kézi végigjátszását.

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
| Hang | 12 saját ElevenLabs-beszéd + 8 eredeti zongorahang; teljes helyi előtöltés, v4 cache | Új magyar hanganyag; nem a referencia hangfájljai |
| Hangidőzítés | Leghosszabb 1042 ms; fix hangos minimum 1200 ms; saját tempó kivárja a hang végét | A tiszta beszéd érdekében saját minimumtempó |
| Szünet / háttér / megszakítás | Szünet kizárva az órából; cue nem jelenik újra a szünetközben; maradék hang offsetről; leállítás/dispose tesztek | Nincs reakcióidő-metrika azonossági állítás |
| Számolás | Korábbi szám művelet mostani szám; pontos racionális válasz, előjel és tört mobilgomb; automatikus válaszrögzítés | Üres bevitel nem 0; Variable/Crab osztás a tényleges célindexet használja a forrás hibája helyett |
| Tanári kiosztás | Játék, teljes mód/beállítás és ismétlésszám; saját tanár–tanuló két ismétléses folyamat | Hanna saját tanári működése |
| Szerveres pontszám/mentés | Szerver saját seed/config alapján újragenerál, nyers válaszokból értékel; ügyfélpontszám elutasítva | A seed tanulási célból nem titkos; nem csalásbiztos versenyrendszer |
| Újraküldés | Egyidejű dupla beküldés és eltérő raw konfliktus tesztje; böngészőben hálózathiba→reload→retry | Azonos kör nem ad kétszer eredményt/pontot |
| Újrabelépés / tanári eredmény | Saját tanuló kilépés–belépés után 2/2; tanár látja TP/FP/FN/TN részleteket | Privát tesztfiókok, valódi tanulónak nem osztottunk ki leckét |
| Fejlődés | N-back körök, átlagos pontszám/N és legmagasabb N; mód/profil/módosítók külön csoportban | A régi játékok csillag- és összpontszáma nem keveredik ide |
| Régi játékok | Meglévő regressziós tesztek a teljes tesztfutásban; additív, nullable metrics migráció | Élő kiadás után külön adatmegőrzési ellenőrzés szükséges |

## Saját szabályok, eltérések

A bővítés a pinelt forrás játékszabályait követi, dokumentált eltérésekkel. Saját döntés a könnyű alapbeállítás, a böngészős védett tartományok, a hangos 1200 ms minimum, a pontozott körhossz közvetlen beállítása, a magyar hangok és saját alakzatok, a mobilbevitel és a tanári folyamat. Az üres számolási választ nem értelmezzük nullaként. A forrás hibás Variable/Crab osztási célindexét javítjuk. A forrásban bizonytalan Variable+Crab együtt nem választható. A művelet vizuálisan is látható. Nincs saját csillagképlet, jutalompont vagy rejtett szintfeloldás.

A forrás által korlátlanabb konfiguráció, eredeti asztali gyorsbillentyűk, reakcióidő-export és pontos véletlenszám-sorozat nem célzott azonosság. Az N=1-től N=20-ig minden lehetséges mód/nehézség-kombináció teljes kézi ellenőrzése nem történt meg; az index- és konfigurációs határokat automatizált ismert sorozatok és generálási tesztek fedik.

## Ellenőrzési hibák és javítások

A felhasználói hangpróba feltárta a rossz „kis A” kiejtést, kapkodó beszédet és zavaró műveletneveket; mind a 12 régi beszédfájlt a felhasználó felvételeire cseréltük. A felhasználói UI-próba alapján valódi mobilgombok és „Kimondott betű / Zongorahang” címkék kerültek be, a rácsra csúszó felirat megszűnt.

A független Grok 4.6 medium felülvizsgálat valódi hibákat talált: szünetkor újrainduló lépésidő; külön Enter nélkül elvesző számolási válasz; régi hang cache-ben maradása. Ezeket reprodukáltuk, javítottuk és külön időzítési/nyersválasz-teszttel ellenőriztük. A következő kör a mobil előjelgomb piszkozatfrissítését találta meg; ezt a root is egymástól függetlenül észlelte és javította, külön regressziós teszttel. A végső verdict és élő kiadás bizonyítéka lent kerül rögzítésre.
