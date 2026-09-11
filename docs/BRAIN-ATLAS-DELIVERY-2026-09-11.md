# Agymodell javítása · átadás · 2026-09-11

Éles felület: https://memoria-web-production-a86b.up.railway.app/?release=27fb085#/memoriaprobak

Kiadott forrás: `27fb08586fea2fed56bdfdd32a163ca1a3ac490a`. Railway deployment: `bffd95d3-67d4-421c-9fd5-a9996b413a66`, SUCCESS. A záró dokumentáció ettől külön, futó kódot nem változtató commit.

## Mi változott és hol ellenőriztük?

| Követelmény | Megvalósítás | Saját ellenőrzés |
|---|---|---|
| Részletes, forrásból származó anatómia | FreeSurfer fsaverage5, 20 484 csúcspont, 40 960 háromszög; eredeti Destrieux címkék | Bináris hash/határok/parcelméretek/oldaliság teszt; valódi Chrome és éles beépített böngészőben renderelt felszín |
| Forgatható, jól kezelhető látvány | Egér, billentyűzet, nagyítás, lassú forgás; nézetváltás gömbi kamerapályán | Húzás, nyilak, zoom, reset; külső/belső/felső/alsó és külön félteke nézetek |
| Hét feladathoz érthető területek és források | Magyar régiókártyák, feladatválasztó, tudományos forráslenyíló | Mind a hét feladat kiválasztása; hallott számsor, kép–hely, komplex feladat, gátlás régiógombjai; éles kép–hely jobb belső felszín és N-back |
| Egyértelmű feladatkijelölés | Modellválasztó és katalóguskártyák kétirányú összehangolása | Valódi böngészőpróba mindkét irányban + regressziós teszt; éles N-back kártyakijelölés |
| Mobilnézet | Egyhasábos panel, 44px vezérlők, görgethető oldal | Chrome 390×844 emuláció: a dokumentum szélessége 390, nincs vízszintes túlcsordulás; az éles beépített böngésző keskeny panelén is működik |
| Biztonságos nézetéletciklus | Lusta modellbetöltés, hub-dispose, animáció és erőforrások felszabadítása | Oldal elhagyása után 0 canvas; visszatéréskor 1 canvas / 1 zoom-csoport, konzolhiba nélkül; stop/dispose statikus review |
| Reprodukálható kiadás | Verziórögzített forrás és helyben kiszolgált modellek/könyvtár | Mind a 100 futó forrásfájl és mind a 83 nyilvános fájl SHA-256 szerint egyezik a jelölttel; health OK |

157 teszt PASS, a szintaxis/nyilvános asset kapu PASS. Grok 4.6 medium két statikus review-kör: a kiválasztási eltérés javítása után PASS. Az anatómiai megfeleltetést külön readonly agent ellenőrizte. Az éles adatbázisról kiadás előtt mentés és külön ideiglenes adatbázisba visszaállítási próba készült. Ez a változás nem módosít adatmodellt, pontozást vagy játékmechanikát.

## Pontos határok

Ez agykéregfelszín, nem teljes agyi térfogati atlasz. Hippocampus, kisagy és agytörzs nem szerepel. A szín anatómiai oktatási kiemelés, nem mért aktivitás, idegpálya, személyes agyi egészség vagy fejlődési mutató. A kutatási aktivációs klaszterek helyett megnevezett, esetenként tágabb atlaszparcelek látszanak; a különbség a feladatok forrásszövegében szerepel.

Natív Safari/iOS ellenőrzés és WebGL-kontextusvesztés hibainjektálás nem történt. A csökkentett mozgás kezelését kódellenőrzés védi, operációsrendszer-preferencia-váltással nem próbáltuk. A vendorizált Three.js shader-szövegében örökölt whitespace figyelmeztetések vannak; a saját diff whitespace-ellenőrzése tiszta, a teljes JavaScript-szintaxis és a valódi shader-renderelés sikeres.

Részletes forrás és jogi attribúció: [BRAIN-ATLAS-SOURCES.md](BRAIN-ATLAS-SOURCES.md); az alkalmazásban „Miből készült a modell?” → „Adatforrások, módosítások és licencek”. Privát, nem publikált bizonyítékok: `.local/brain-atlas/` (tesztlogok, review-kérések és válaszok, desktop/mobile/live képernyőképek, böngésző-UAT, backup, kiadási és hash-jegyzékek).
