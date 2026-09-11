# Memóriapróbák és tudományos felfedező – önálló megvalósítás

Indítás: 2026-09-11. Tulajdonosi felhatalmazás: önálló, párhuzamos agentes fejlesztés; a korábban javasolt memóriafeladatok, eredménykövetés és látványos, kutatási hivatkozásokkal ellátott magyarázó felület elkészítése és a meglévő kiadási folyamat szerinti átadás. A technikai és kisebb termékdöntéseket az orchestrátor meghozza.

Állapotdelta, 2026-09-11: a controller átvette a teljes sort. Az első kötelező interfészkapu a [Memóriapróbák közös szerződésében](COGNITIVE-SYSTEM-CONTRACT.md) rögzült (`contractVersion: 1`): családok, gyakorlás/próba módok, determinisztikus ingerterv, nyers események, szerveres metrikák, összehasonlíthatóság, minőségi jelzések, privát tanári válaszok, tényleges késleltetés és forrásolt korosztályos referenciaadat. Ez a verzió a párhuzamos motor-, kutatási- és felületi sáv közös alapja.

Kanonikus projekt: `/Users/vargabela/Projects/hanna matek`, `codex/memory-workshop`, induló commit `095d3a454829027e8df3ccf49b2909861ce85978`. A korábbi AMAkids-kutatási dokumentumok és a `docs/FEATURE-MATRIX.md` jelenlegi módosítása nem ennek a munkának a része.

## Leszállítandó működés

1. Külön, vizuálisan igényes **Memóriapróbák** felület, elkülönített Gyakorlás és rögzített próba profillal; a meglévő AMAkids és N-back játékok megőrzése.
2. Három elsődleges mérési feladat: térbeli sorrend előre/vissza; hallott számsor előre/vissza; kép–hely társítás tanulási szakaszokkal és ténylegesen késleltetett felidézéssel.
3. A jelentés további implementálható paradigmái: közbeiktatott feladat melletti emlékezés, képfelismerés, figyelmi jelzés/visszatartás. Az utóbbi figyelmi kontextus, nem memória- vagy ADHD-diagnózis. A meglévő N-back kapjon egyértelmű standard próba/gyakorlás kapcsolatot; a hét paradigma legyen elérhető a rendszertanban.
4. Tanári anyag aktív felidézésének és későbbi újrakérdezésének használható változata, saját tanári tartalommal és tényleges időpont/adat nyilvántartással; ne ígérjen egyetlen körből általános memóriafejlesztést.
5. Mód/protokoll/beállítás szerinti tanári kiosztás, tanulói teljesítés, szerveres kiértékelés a nyers válaszból, tartós mentés, újrabelépés és újraküldés kezelése. A próba eredménye ne keveredjen játékcsillagokkal vagy N-back pontszámokkal.
6. Érthető személyes teljesítményprofil és tényleges adatokból készült grafikonok. Csak összehasonlítható protokollok kerüljenek közös trendbe; eltérő eszköz, megszakítás és gyakorlási/mérési alkalom legyen megkülönböztethető. Üres/kevés adat esetén is kész, hasznos nézet.
7. Tudományos rendszertan: feladat → vizsgált teljesítmény → kutatási háttér → korlátok. Animált agyhálózati szemléltetés, forráskártyák, érthető magyarázat, mobil és csökkentett mozgás támogatása. A hálózati animáció oktatási illusztráció; nem személyes aktivitásmérés, és nem pontszámfüggő agyállapot.
8. **Publikált korosztályos adatok külön újrakutatása.** Konkrét normatáblák/nyílt adatok és kutatók által használt Corsi, digit span, komplex terjedelem, paired-associate, felismerési, N-back rendszerek vizsgálata. Tesztverzió, kor, létszám, nyelv, eszköz, felvételi mód, mért változó és felhasználhatóság rögzítése. Nem elég újra azt mondani, hogy a saját játék nem normált: ahol vannak megfelelő publikált adatok, mutassuk be őket számszerű, hivatkozott kutatási referencianézetben. Személyes percentilist csak a ténylegesen egyező és használható eljárás alapján számoljunk. Ha nincs ilyen megfelelés, a kutatási csoportadat akkor is látható lehet, saját percentilis nélkül.

## Közös interfész első kapuja

A controller a végrehajtók indítása előtt verziózott szerződésben rögzíti: játék/mód/protokoll és beállítások; determinisztikus sorozat/seed; inger és válaszesemény; megszakítás/időzítés; szerver által számított eredmény és metrikák; összehasonlíthatósági kulcs; kutatási forrásrekord és korosztályos referencia-adat. Az életkor megadásához elég a szükséges életkori adat; ne kérjünk fölöslegesen pontos születési dátumot.

## Ellenőrzés és kiadás

- Ismert sorozatos helyes/hibás/üres/dupla válasz, indexhatár, visszafelé sorrend, társítás és késleltetés; negatív kontrollok.
- Valós böngészős teljes kör minden új paradigmából; mobilnézet, hang, szünet, újrakezdés, háttérbe helyezés és mentési újraküldés.
- Saját teszttanár → kiosztás → saját teszttanuló → mentés → újrabelépés → tanári részletek/profil. Valódi tanulónak tesztleckét nem készítünk.
- A normagrafikon minden adatpontja forrásig visszavezethető; kézi számítási minták. Nincs kitalált referenciaátlag vagy személyes eredmény.
- A meglévő teljes tesztkészlet és asset/szintaxis-ellenőrzés; független statikus Grok 4.6 medium review a stabil összerakott jelöltről, a valós hibák javításával.
- Friss mentés, meglévő Railway-kiadás, futó forrás/asset azonosság és élő ellenőrzés; nyilvános GitHub-push nélkül. Kész felület megnyitása.
- Átadás: követelményenként kész/korlátozott/ellenőrizetlen állapot és konkrét bizonyíték; tényleges idő; források, saját termék/protokoll-döntések, megmaradt korlátok. A munka nem zárul le pusztán az agentek kiküldésével.

## Felelősség és párhuzamosság

Egy látható controller kapja az egész fenti sor megvalósítási, integrációs és kiadási felelősségét. A root beszélgetési felület marad, és nem ír párhuzamosan a controller fájljaiba. Négy egyidejű agenthely áll rendelkezésre; a controller a kutatási és fejlesztési feladatokat ehhez igazítja, ütköző írókat külön munkafákban tartja. A végrehajtók nem commitolnak; git és kiadás a controller tulajdona.
