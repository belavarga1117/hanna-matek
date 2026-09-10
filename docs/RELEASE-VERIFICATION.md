# Memória Műhely – kiadási igazolás

2026-09-10. Alkalmazás: [Memória Műhely](https://memoria-web-production-a86b.up.railway.app).

## Tartalom

Tíz játék, összesen 18 választható szabályváltozat; ebből 14 a hat bejárható Memorica-játék megfigyelt szintjeihez igazodik, 4 saját alapjáték. A szint módosíthatja a feladatot és a válaszadás szabályát: útleírások sorrendje, név/foglalkozás/szoba, ár/kedvezmény, halmaz vagy polcsorrend, jelenetfelismerés vagy képsorrend. Részletes bizonyossági és eltérési mátrix: [FEATURE-MATRIX.md](FEATURE-MATRIX.md).

Tanári tulajdonosi fiók, tanulói aktiválás, csoportok, több lépésből és ismétlésekből álló kiosztás, tanulói folytatás és haladás, tanári szűrhető eredmények és válaszrészletek. A szerver a mentett körből és a nyers válaszból pontoz, ismételt beküldés nem ad új eredményt. A tanári szabad gyakorlás helyi próbakör. A képek sajátok; a jelenetatlasz a beépített képgenerálással készült, külön fizetős API-fallback nélkül.

## Végrehajtott ellenőrzés

- Helyi integrált tesztek 55/55; szintaxis és mind a 16 nyilvános állomány/hivatkozott kép ellenőrzése sikeres.
- Közvetlen Chrome-próba mind a 10 játék felületén. Külön magasabb módok: útleírás 5/5; arc/név/foglalkozás/szoba 9/9; ár/kedvezmény 5/6; kódlabor 3. szint 15/15; képsorrend 12/12. Hibás sorrend a Fényösvényben 0/3; vásárlásnál visszavonás és javítás 3/3. Nem állítunk mind a 18 módra külön kézi böngészőpróbát.
- Saját tanár → csoport → 3 lépéses kiosztás → tanuló → mentés → újrabelépés → tanári részletes eredmény végigpróbálva. Injektált kapcsolathibánál nincs végleges kliens-pontszám; oldalfrissítés után a függő válasz visszajön és egyszer mentődik.
- Mobil 390×844: javított fejléc, eredmények és négy képkártya; a képsorrend kiválasztási sorszámai látszanak.
- Éles Railway/PostgreSQL 18 HTTP: 18 külön játék/szint, 36 párhuzamos beküldésből 18 eredmény. Minden kiosztott mód 100%; beállításhamisítás figyelmen kívül marad, idegen tanuló 403, belépés nélkül 401, kontrolltanuló 0 eredmény. Ismételt kiosztott kör 409, újrabelépés után 18/18 teljesített. HTTPS session cookie Secure/HttpOnly/SameSite=Lax.

- Végső éles csomag: a kezdőoldal HTTP200, mind a 16 nyilvános fájl bájtról bájtra azonos a felülvizsgált forrással. Railway deployment `b2879e54-521a-48d7-8503-3363628c4b74`, SUCCESS.
- Éles Chrome: tanulói belépés után 18/18 teljesített mód; új szabad Számlánc 551→551, 3/3 mentve. Tanári fiókváltás után 19 eredmény; a legújabb kör mindhárom válasza helyesen visszanézhető. A korábbi böngészős betöltési hiba a csomagolás javítása után megszűnt.
- A három saját próbafiókot és kizárólag hozzájuk tartozó adatokat ellenőrzött azonosítókkal, tranzakcióban eltávolítottuk. Utána users/results/assignments/attempts mind 0; setupRequired=true. A kezdőoldal ténylegesen az első tanári aktiválást mutatja.
- PostgreSQL egyedi formátumú mentés készült; külön ideiglenes adatbázisba visszaállítva, 0 felhasználó / 0 eredmény / 1 migráció igazolva. A visszaállítási próba adatbázisa és ideiglenes távoli fájlja eltávolítva. A helyi privát mentés 27 476 bájt, SHA-256: `d259bc765cf65538b0ff2199e7a38acd8e47db8a3e146f3f7d51f7ab38ba49d0`.

## Független review és tényleges hibák

Grok4.6 medium, statikus, shell nélkül. Teljes review 384a15c; jelszóhossz javítása és további UI-fixek 3cd723f PASS; éles PostgreSQL JSONB-kódolási hiba 4a3cb93 PASS; kezdőoldal-csomagolás debe0d3 PASS. A root az utóbbi két hibát tényleges éles ellenőrzéssel találta meg, a korábbi statikus PASS nem helyettesítette ezt. Részletes modellnapló: [MODEL-EVAL.md](MODEL-EVAL.md).

## Átadás és üzemeltetés

A forrás futó változata `debe0d3682982fcb9a7db8d24b97bc26537c1629`; a későbbi dokumentációs commit nem változtat futó kódot. Egy Railway alkalmazáspéldány és egy PostgreSQL, szolgáltatásonként 500 MB / 1 vCPU.

Az első tanári fiókot a tulajdonos aktiválja: Railway → hanna-memoria → memoria-web → Variables → BOOTSTRAP_TOKEN; a kód az alkalmazás első fiók űrlapjába kerül. Jelszót/aktiváló kódot nem tartalmaz ez az átadás. Részletes használat és helyreállítás: [OPERATIONS.md](OPERATIONS.md).

Automatikus napi Railway-mentést a jelenlegi jogosultság elutasított, ezért nincs beállítva. A tulajdonosnak a Backups jogosultságát/csomaglehetőségét kell rendeznie; addig frissítés előtt kézi PostgreSQL-mentés szükséges.

A régi Sites-demó nyilvános hozzáférése és tartalma változatlan. A tanulói adatokat a Railway-alkalmazás belépés mögött tárolja. A nyilvános GitHub távoli tárolóba nem történt feltöltés; a személyes kutatási jegyzetek nincsenek a kiadásban. Nincs emailküldés, teljes AMAkids-platformparitás, vizsgafelügyelet vagy automatikus adattörlés ebben a kiadásban.
