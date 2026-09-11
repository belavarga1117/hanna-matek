# Menü, kontraszt és számhangok – 2026-09-11

A tanulói és tanári oldal közös fejlécet használ. A Feladataim/Haladásom lapokról is elérhető a Gyakorlatok és a Memóriapróbák; a Fiókom az avatarból nyílik. Mobilon a menüpontok látható sorokba tördelődnek.

A kognitív játék színváltozói korábban csak a beállítás/hub/profil elemekben léteztek; a runtime nem örökölte őket. Az általános disabled-gomb stílus további 45%-os halványítást okozott. A javított aktív mező sötétkék, arany belső kerettel, 100%-os fedettséggel; a válaszjelölés sötét türkiz és fehér sorszám. A felvillanás háttérszínén nincs átmenet. Az időzítés és a feladatszabály változatlan.

A tulajdonos 2026-09-11 13:25:48–13:27:50 között letöltött tíz ElevenLabs David MP3-fájlja került be, a tulajdonos végső megerősítése szerint 0–9 sorrendben. A WAV-fájlok 44,1 kHz-es, mono, 16 bites PCM felvételek. Csak külső csendet távolítottunk el 60 ms kezdő és 200 ms záró védősávval; nincs sebesség-, hangmagasság- vagy hangerőmódosítás. A forrás és a kiadott hangok lenyomata a `dist/cognitive/audio/elevenlabs-v2/manifest.json` fájlban szerepel.

Az új körök `hu-digits-v2` hangkészletet használnak. A régi `hu-digits-v1` kiosztások/körök megőrzik eredeti hangjukat és értékelhetőségüket. A fejlődési csoportosítás a hangváltozatot is figyelembe veszi; a csere nem kerül automatikusan ugyanabba a mérési sorozatba. Az A–H és plusz/mínusz/szor/oszt korábbi ElevenLabs-felvételei változatlanok.

A tényleges böngészős újrakezdési próba korábbi hibát talált: a megszakított hangkör válaszfelülete felülírta az új kör lejátszógombját. A javítás leállítja a hangot és ellenőrzi a kör azonosságát minden aszinkron visszatéréskor. Szünet/háttérbe kerülés leállítja a számsort; visszatérés után a teljes sor újraindítható a lejátszógombbal. Az ilyen megszakítás minőségi jelzést kap.

| Ellenőrzés | Tényleges bizonyíték |
|---|---|
| Tanulói menü | Saját localhost QA-fiók: Feladataim → Haladásom → Gyakorlatok → Memóriapróbák → Feladataim → Fiókom, minden oldalon ugyanaz a négy link. |
| Tanári és mobilmenü | Saját tanári QA: hét menüpont. Chrome emuláció tényleges 390 CSS-pixel szélességen: dokumentumszélesség 390, minden link látható, nincs vízszintes túlcsordulás. |
| Felvillanás | Valódi Chrome: Térbeli sorrend és Közbeiktatott feladat aktív mezője rgb(23,36,61), opacity 1. Kijelölt válasz rgb(34,105,101), fehér sorszám. |
| Hangbank | Mindkét verzió mind a tíz WAV-fájlja dekódolható és egyezik a manifest SHA-256 értékével. Az új klipek 601–960 ms hosszúak. |
| Hangos böngészőfolyamat | Hangpróba; tényleges lejátszás utáni válaszfelület; újrakezdés közbeni megszakítás; szünet, folytatás és újbóli lejátszás. Tanári előnézeti kör lezárva. Külön saját localhost tanulói kör lezárva, fiókba mentve és a profilból visszaolvasva; négy szándékosan kihagyott sorozat, 0 pont. |
| Automatikus regresszió | 162/162 teszt, 94 nyilvános fájl és 18 modul szintaxis/asset ellenőrzése PASS. Külön teszt: aktív hang leállítása, szünet alatti leállítás, számok közti szünetben leállítás, újrakezdés utáni késői callback, régi hangbank és eltérő összehasonlítási kulcs. |

Bizonyítékok: `.local/ui-contrast-nav/`. Natív iOS/Android eszközpróba és a hang érthetőségének emberi értékelése nincs ezzel az automatizálással igazolva. A források számjegyhez rendelése a tulajdonos megerősítését követi.

Kiadás: a `4e8d0e2` runtime a `04b5a98a-e564-4988-8bac-1ada4beb77dc` Railway deploymentben SUCCESS állapotú. 94/94 nyilvános fájl és 111/111 futó forrásfájl SHA-256 értéke egyezik; health OK. A kiadás előtt készült PostgreSQL-mentés külön ideiglenes adatbázisba sikeresen visszaállt. A helyi tanulói mentési próba nem helyettesít éles, autentikált tanári–tanulói teljes folyamatot.
