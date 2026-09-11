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

## Utólag jelzett kódkártya-átfedés

A Titkos kód szerkesztőjének 207 px széles kártyáiba korábban egyetlen vízszintes sorba próbált beférni a szám, az ikon és a 180 px széles választó. A szélső elemek kilógtak a szomszédos kártyákra. A `0a95389` elrendezés felül a számot és a jelet, alul a teljes szélességű választót mutatja; a rács a rendelkezésre álló szélességhez alkalmazkodik.

Valódi Chrome-próba: mindkét jelhalmaz, a „fényképezőgép” és „borostyán háromszög” hosszú címke, párosításcsere tíz egyedi jellel. Desktopon és 390 CSS-pixeles mobil-emulációban mind a 30 gyermekelem a tíz kártyán belül maradt; a dokumentum nem szélesebb a viewportnál. A megjegyzési szakasz és a visszafejtési képernyőre lépés működik. Az érintett 11 teszt és a syntax/asset ellenőrzés PASS; Grok 4.6 medium statikus review PASS. Játékszabály, időzítés és pontozás nem változott. Bizonyítékok: `.local/code-layout/`.

A kódkártya-javítás kiadása: `febc6c4b-e83f-437f-854c-98e9e266e34b`, Railway SUCCESS, runtime `0a95389`. 94/94 publikus fájl és 111/111 futó forrásfájl pontos lenyomategyezés, health OK. Az éles vendégnavigáció ellenőrizve; az éles játékhoz belépés kell. Az interaktív játékteszt saját helyi QA-fiókon futott, azonos kiadott fájlokkal. A friss éles Memóriapróbák oldal megnyitva.


## Bevásárlólista egy képernyőn

A termékes megjegyzési rácsból hiányzott az oszlopkiosztás, miközben a kártyák az általános négyzetes méretezést örökölték. Chrome-ban a kilenc termék 3950 px magas oszlopot alkotott. A Bevásárlólista most mindkét változatban 3×3-as rácsot kap, a második szinten a számok a kártyán belül jelzik az eredeti polcsorrendet. A megjegyzési kártyák magassága a képernyőhöz igazodik; az Árcédulák azonos hibáját ugyanebben a két fájlban javítottuk. A szabály, generálás, pontozás és időzítés változatlan.

Helyi valódi Chrome UAT saját tesztfiókokkal: Bevásárlólista L1 tanulói teljes kör 9/9 és mentés; L2 nehéz tanári előnézet 9/9; Árcédulák L2 öt termék 10/10. Tanári fejléc mellett minden megjegyzendő kártya és a Készen állok gomb teljesen látszik 1365×768, 390×667, 375×667 és 390×844 CSS-pixeles képernyőn; vízszintes túlcsordulás nincs. Mobil eszközméret-emuláció történt, fizikai telefonpróbát ez nem állít. 19/19 érintett association teszt, valamint szintaxis/94 nyilvános fájl ellenőrzése PASS. Bizonyítékok: `.local/shopping-layout/browser-evidence.json`.

Kiadás: `c8b9267`, Railway deployment `2075c4a3-1509-45d2-8434-feea56195d55` SUCCESS. 94/94 nyilvános fájl és 111/111 futó forrásfájl egyezett a kiadás manifestjével; health OK. Az élő oldalon a Bevásárlólista L1 tanári előnézetében mind a kilenc termék és a kész gomb látszott 1365×768, 375×667 és 390×844 tényleges CSS-pixeles viewportban. A helyi és az élő origin böngészőnagyítása eltér; a beállított override helyett minden esetben a mért `innerWidth/innerHeight` az igazolás alapja. A hibásan 250×445-re és 910×512-re állított első éles méretpróba túlcsordult; ezek nem sikeres ellenőrzések. A dokumentált 375×667 vagy nagyobb próbák sikeresek. Az override a végén visszaállt. Az élő tanári előnézet tanulói eredményt nem ír; éles tanulói mentést ez a megjelenítési javítás nem tesztelt újra.

Grok 4.6 medium statikus review: PASS, a végleges két runtime fájl diffjét vizsgálta, külön körben, tool/web/subagent nélkül. A valódi böngészős próbát a root végezte.


## Tanári Memóriaprofil jogosultsági hiba

A `#/memoriaprofil` minden bejelentkezett szerepkörnél a tanulói `/api/results` végpontot használta, ezért tanárként 403-as hibát mutatott. A tanári nézet most a meglévő, saját tanulókra korlátozott `/api/teacher/students` és a kiválasztott tanulóra szűrt `/api/teacher/results?studentId=…` végpontot használja. Kiválasztás előtt nincs eredménykérés; több tanuló eredménye soha nem kerül közös profilba. Tanulóként továbbra is a saját `/api/results` töltődik. A tanári előnézetek nem válnak mentett tanulói eredménnyé. A hub és a körvégi gomb tanárként Tanulói profilok feliratot kap.

Külön kezeli az üres tanulólistát, a betöltési hibát és újrapróbát, a gyors tanulóváltást és az oldal elhagyását. Az utolsó kéréshez tartozó válasz jelenhet csak meg. Négy célzott regressziós teszt készült ezekre és a szerepkör szerinti API-kiválasztásra. 14/14 releváns UI/kognitív integráció/iskolai folyamat teszt, továbbá a 94 nyilvános fájl szintaxis/asset ellenőrzése PASS.

Valódi helyi Chrome, saját tesztfiókok: tanári tanulóválasztás után a meglévő Hallott számsor gyakorlási adat és egy adatpont megjelent; kijelentkezés és tanulói belépés után ugyanaz a saját adat betöltődött, tanulóválasztó nélkül. Visszalépés a hubra a Tanulói profilok hivatkozást adta. 375×667 CSS-pixeles mobil-emulációban nincs vízszintes túlcsordulás. Grok4.6 medium statikus záró review PASS, tool/web/subagent nélkül. Bizonyíték: `.local/teacher-profile/`.

Kiadás: `7479d22`, Railway deployment `cc518d35-3920-457f-ac99-3f18ad4035d8` SUCCESS. 94/94 nyilvános fájl és 111/111 futó forrásfájl egyezett a manifesttel; health OK. Az élő Chrome-ban Hanna tanárként a `test` tanuló kiválasztása után a „test memóriaprofilja” betöltődött, jogosultsági hiba nélkül. A tanulónak ekkor nincs a profilba tartozó mentett próbája vagy gyakorlása; mindkét üres állapot megjelent. Ez olvasási ellenőrzés volt, új eredmény vagy felhasználói adat nem keletkezett. A mentett adat grafikonos megjelenítését a fent leírt saját helyi tanuló igazolta. A javított élő profil megnyitva maradt.
