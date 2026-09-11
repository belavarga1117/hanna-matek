# N-back – modell- és ellenőrzési napló, 2026-09-11

Feladat: Brain Workshop család saját böngészős implementációja és Hanna-fiókintegráció. Végrehajtók: gpt-5.6-sol high elkülönített motor/UI/integrációs munkaterületeken; root integráció és valódi böngészős ellenőrzés. A lane-jelentések nem helyettesítették a saját tesztet vagy kiadási bizonyítékot.

| Forduló | Modell / effort | Valós kimenet | Értékelés |
|---|---|---|---|
| 1 – teljes 421k karakter | Grok 4.6 medium, statikus | 600 s timeout, nincs verdict | Nem számít sikeres ellenőrzésnek |
| 2 – 188k karakter | Grok 4.6 medium, statikus | BLOCKED: pause időablak/cue újraindulás, Enter nélkül elvesző arithmetic, régi audio cache | Három konkrét javítandó probléma; reprodukált és javított |
| 3 – 95k karakter | Grok 4.6 medium, statikus | BLOCKED: mobil ±/tört gomb nem frissítette a piszkozatot | Valós, root által függetlenül is észlelt probléma; közös captureDraft, külön regressziós teszt |
| 4 – 70k karakter | Grok 4.6 medium, statikus | PASS: korábbi javítások és v4 audio áttekintve | Konkrét vezérlési ágakra hivatkozó verdict; nem browser/deploy tanúsítvány |

A 2. kör azon megjegyzése, hogy a tesztek nem vezetik a játékfelületet, pontatlan: a MiniDOM-tesztek ténylegesen mountolják a UI-t és vezérlik a frame-órát. Ez nem teszi érvénytelenné a reprodukált hibákat, és nem változtatja a valódi Chrome-próba szükségességét.

A felhasználó által később észlelt UI-hiba: az új lépés első frame-je előtt üres visszaszámláló sor alacsonyabb volt. Saját javítás: kezdő szöveg azonnal + rögzített line-height/min-height a visszaszámláláson és visszajelzésen. Öt eltérő típusnál mért geometriai eltérés javítás után 0 px; külön végső statikus ellenőrzés indul.

A hang perceptuális minőségének hiányát a kódtesztek és a statikus reviewer nem tárta fel; a felhasználói próba hozta felszínre. Mind a 12 beszédet a felhasználó ElevenLabs-felvételeire cseréltük; a teljes sor ASR-je egyezett. Nem állítjuk, hogy az ASR önmagában helyettesít emberi halláspróbát.

A privát, egyedi nevű promptok/verdict-ek és futási bizonyítékok a `.local/nback-execution` alatt maradnak, nem kerülnek nyilvános repóba.

5. forduló – Grok 4.6 medium, 42k karakter, df65aa0: **PASS** a kezdő frame és a fix sormagasság javítására. A 0 px mérések öt módban tényleges böngészős adatok. Nagyon keskeny nézetben hosszú visszajelzés több sorba törhet; a játéktér feletti rövid állapotszöveg a vizsgált 375 px nézetben egy sorban elfér.
