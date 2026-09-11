# Kognitív referenciaadatok és kutatási rendszerek

Készült: **2026. szeptember 11.** Hatókör: Hanna Memória Műhely kognitív feladatcsaládjaihoz használható, számszerű kutatási referencia, forrás- és jogellenőrzéssel. Ez a dokumentum nem diagnosztikai útmutató és nem tesz egy külső csoportátlagból Hanna-féle személyes normát.

## Döntés

**Van több, táblázatból ellenőrizhető kvantitatív referencia a térbeli span, számsor, komplex span, páros asszociáció, képfelismerés és N-back családokra. Egyik sem jogosít Hanna személyes percentilisére.** Az eltérés oka minden esetben konkrét: más feladatverzió, modalitás, nyelv, megállítás, pontozás, célminta vagy felhasználási jog. Ezért a gépi rekordokban `personalPercentile: false` marad.

A [gépi referenciafájl](../dist/cognitive/reference-data.js) 9 elsődleges forrást és 129 táblázatpontot tartalmaz. Minden pont megismétli a `sourceId` és `locator` mezőt. A rekordok háromféle jogállása:

- `data-reuse`: a cikk/tábla nyílt licence engedi a számok újraközlését megfelelő hivatkozással;
- `link-only`: a forrás számai kutatási összefoglalóként, hivatkozással szerepelnek, de a termékbe átvett normatáblaként nem;
- a cikk licence **nem** jelenti automatikusan a tesztkód, márkanév, ingeranyag vagy normakonverzió átvételi jogát.

## 1. Térbeli terjedelem: eCorsi, érintőképernyő

Brunetti, Del Gatto és Delogu 107 fővel vizsgálta a 9 mezős, táblagépes eCorsi előre és vissza változatát. A fiatal csoport 18–30 éves volt; az idősebb csoport belépési feltétele `>50`, átlagéletkora 57,6 év. A mező 500 ms-ig világított, az ingerek kezdete közt 1000 ms telt el. Két sorozat jutott minden hosszra, 2 elemről indulva; legalább egy jó sorozat után nőtt a hossz, két hiba után leállt. A span az utolsó olyan hossz volt, ahol legfeljebb egy hiba történt. [Elsődleges cikk és Table 1](https://doi.org/10.3389/fpsyg.2014.00939)

| Korcsoport | n | előre span átlag (SD) | vissza span átlag (SD) |
|---|---:|---:|---:|
| 18–30 | 73 | 6,109 (0,803) | 5,287 (1,199) |
| >50 | 34 | 4,764 (1,189) | 4,352 (1,303) |

A cikk CC BY licencű, ezért a Table 1 számai `data-reuse` besorolásúak. A publikáció licence nem teszi a szerzők konkrét alkalmazását Hanna-validált tesztté. A Hanna-feladat ugyan szintén érintős és két próbát használ, de az életkori minta, az instrukció nyelve, a pontos geometria és a sorozatkészlet nem igazoltan azonos, ezért személyes percentilis nem adható.

## 2. Számterjedelem

### Woods-féle adaptív, auditív számterjedelem

Woods és munkatársai második kísérletében 763, 18–65 éves rotorua-i közösségi önkéntes hallotta a számjegyeket számítógépről, majd szóban válaszolt; a vizsgáló billentyűzettel rögzített. Az előre feladat 5, a vissza feladat 4 számjegynél indult. Tíz lista/direkció futott 1:2 adaptív lépcsővel: jó válasz után +1 hossz, ugyanazon hosszon két egymást követő hiba után −1. [Elsődleges kézirat, Table 6](https://pmc.ncbi.nlm.nih.gov/articles/PMC2978794/)

| 18–65 év, n=763 | előre átlag (SD) | vissza átlag (SD) |
|---|---:|---:|
| Mean span | 6,52 (1,00) | 4,91 (1,06) |
| Maximum list length | 6,77 (1,03) | 5,19 (1,09) |

A PMC-példány szerzői kéziratként csak szövegbányászati/fair-use engedélyt jelez, ezért `link-only`. A tanulmány nem közöl életkori cellánkénti táblát. Az adaptív szabály, az angol hang és a szóbeli, vizsgáló által rögzített válasz nem azonos a Hanna-féle két sorozat/hossz, érintős magyar protokollal.

### Koreai WAIS-R, 60–90 év

Choi és munkatársai 784 egészséges, közösségben élő koreai időst vizsgáltak. Egy képzett pszichológus másodpercenként egy számjegyet mondott; az előre sor 3, a vissza sor 2 elemről indult; hosszanként két próba után mindkettő hibája állította le a feladatot. A Table 4 **nyers alskálapontot** közöl, nem maximális sorhosszt. [Elsődleges cikk és Table 4](https://pmc.ncbi.nlm.nih.gov/articles/PMC3942550/)

| Kor | Nem | Iskolázottság | n | előre M (SD), medián, P5 | vissza M (SD), medián, P5 |
|---|---|---|---:|---:|---:|
| 60–74 | férfi | 0–3 év | 9 | 3,89 (2,15), 4, 1 | 3,56 (0,88), 4, 2 |
| 60–74 | férfi | 4–9 év | 60 | 5,52 (2,48), 5, 2 | 4,47 (1,56), 4, 2 |
| 60–74 | férfi | ≥10 év | 109 | 7,58 (2,49), 8, 3 | 5,42 (1,55), 6, 3 |
| 60–74 | nő | 0–3 év | 101 | 3,66 (1,73), 3, 2 | 2,86 (1,43), 3, 0 |
| 60–74 | nő | 4–9 év | 167 | 4,93 (2,02), 5, 2 | 4,12 (1,46), 4, 2 |
| 60–74 | nő | ≥10 év | 116 | 6,86 (2,02), 7, 4 | 5,05 (1,54), 5, 2,85 |
| 75–90 | férfi | 0–3 év | 8 | 4,13 (1,13), 4, 3 | 3,13 (1,46), 4, 0 |
| 75–90 | férfi | 4–9 év | 41 | 5,20 (2,10), 5, 2 | 4,27 (1,38), 4, 2,10 |
| 75–90 | férfi | ≥10 év | 39 | 6,28 (1,96), 6, 4 | 5,23 (1,75), 5, 3 |
| 75–90 | nő | 0–3 év | 53 | 3,04 (1,21), 3, 2 | 2,55 (1,15), 2, 0,70 |
| 75–90 | nő | 4–9 év | 53 | 4,58 (2,17), 4, 1,70 | 3,94 (1,46), 4, 1,70 |
| 75–90 | nő | ≥10 év | 28 | 6,25 (2,84), 6, 2 | 4,96 (1,88), 5, 2 |

A cikk CC BY-NC 3.0 licencű; a kereskedelmi alkalmazás számára ezért `link-only`. A WAIS-R tesztanyaga külön védett, a cikk licence nem enged tesztmásolatot. A minta koreai, időskorú és iskolázottság szerint erősen tagolt; Hanna gyermek/felnőtt magyar érintős feladata nem normálható vele.

### PEBL Digit Span Forward

Piper és munkatársai PEBL 0.6-hoz képest módosított, asztali gépes előre számsort használtak. A sorozat 3 számjegynél indult, hosszanként három próbával; hang és képernyős megjelenítés másodpercenként egy számjegy. A fő kimenet a helyes próbák száma volt. A 18–22 éves Study I részmintán `n=148`, átlag `13,5`, SEM `0,3`, tartomány `7–21`. **SD nem szerepel a táblában, ezért a gépi mező `null`; SEM-ből nem számoltunk vissza SD-t.** [Elsődleges PeerJ-cikk, Table 1](https://doi.org/10.7717/peerj.1460)

A Table 1 CC BY, tehát a szám `data-reuse`. A PEBL kód ettől külön GPL-licencű, és a vizsgálati változat módosításai miatt a jelenlegi PEBL `dspan` vagy `spanvariants` feladattal sem szabad automatikusan összevonni.

## 3. Komplex terjedelem: Operation Span

Emery, Hale és Myerson hagyományos Operation Span változatában képernyős művelet–szó párok után szóban kellett a szavakat felidézni. A vizsgáló ütemezett. 2–5 szavas sorhosszon 4–4, összesen 16 próba futott, korai leállítás nélkül. Csak a teljes sor helyes, fölös szó nélküli felidézése ért 1 pontot; maximum 16. [Elsődleges szerzői kézirat, Table 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC2556888/)

| Kor | n | teljesen helyes sorok átlaga (SD), max. 16 |
|---|---:|---:|
| 18–29 | 67 | 10,5 (2,8) |
| 60–79 | 67 | 7,6 (2,5) |
| 80–95 | 19 | 6,6 (2,2) |

A végső minta egészség- és teljesítményszűrés után 153 fő, magas átlagos IQ-val, ezért a szerzők is korlátozott általánosíthatóságot jeleznek. A PMC kézirat felhasználása fair-use keretű, így `link-only`. A Hanna térbeli megőrzés + szimmetriadöntés feladata, 75%-os feldolgozásmegfelelési szabálya és pontozása nem egyezik.

## 4. Páros asszociáció: érintős CPAL gyermekadat

Harel és munkatársai 125 ausztrál, 5–10 éves, angol anyanyelvű gyermeknél használták a Cogstate által biztosított Continuous Paired Associate Learning feladatot. A gyermek színes minták helyét tanulta 2, 4, 6, 8 és 10 kapcsolatnál. Egy expozíciót hat tanulási próba követett, helytelen érintés után azonnali jelzéssel, amíg meg nem találta a helyet; a feladat 20 percnél automatikusan leállt. [Elsődleges PLOS ONE-cikk, Table 2](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0101750)

| Terhelés | 5–6 év, n=30 M (SD), tartomány | 7–8 év, n=49 | 9–10 év, n=46 |
|---:|---:|---:|---:|
| 2 | 5,5 (6,8), 0–26 | 2,1 (2,9), 0–17 | 0,8 (1,1), 0–5 |
| 4 | 13,4 (12,0), 0–50 | 8,1 (7,5), 0–37 | 3,6 (4,5), 0–21 |
| 6 | 34,5 (19,9), 7–76 | 26,8 (18,8), 4–73 | 19,9 (16,6), 2–88 |
| 8 | 73,9 (38,0), 0–168 | 60,5 (29,1), 15–143 | 47,0 (21,9), 17–101 |
| 10 | 102,6 (63,7), 0–237 | 89,7 (52,8), 7–219 | 68,9 (46,2), 5–187 |

A táblázat **hat próba alatt összegzett összes hibát** mutat; alacsonyabb a jobb. A cikk CC BY, ezért `data-reuse`, de ez nem engedély a Cogstate-program vagy ingeranyag másolására. A Hanna két tanulási köre, azonnali/késleltetett felidézése és pontozása más protokoll.

## 5. N-back: 3722 gyermek teljes táblázata

Pelegrina és munkatársai 43 spanyolországi iskola 3722, 7–13 éves tanulójával végeztek E-Prime-ban programozott betű N-backet. Az inger 500 ms, utána 3000 ms üres képernyő; két billentyűvel igen/nem válasz. Szintenként 20 gyakorló próba, szükség esetén ismételt gyakorlat, majd két 20-próbás blokk futott. A célpontarány 30%, tehát 12 lehetséges találat/szint. 60% alatti célponttalálatnál a feladat leállt. [Elsődleges cikk, Materials and Procedure és Table 4](https://doi.org/10.3389/fpsyg.2015.01544)

Az alábbi cellák `M (SD)` értékek; a teljes 5., 25., 50., 75. és 95. percentilis-sor a gépi fájlban is szerepel. A `–` értéket `null` helyett kihagyott percentilisként tároljuk, nem nullpontként.

| N | Nem | 7 év | 8 év | 9 év | 10 év | 11 év | 12 év | 13 év |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | fiú | 8,05 (3,04) | 8,82 (3,09) | 9,14 (2,82) | 9,72 (2,96) | 10,01 (2,98) | 10,20 (2,96) | 10,28 (2,96) |
| 1 | lány | 8,21 (3,29) | 8,60 (3,09) | 9,54 (3,12) | 10,11 (2,86) | 10,41 (2,77) | 10,73 (2,55) | 11,29 (2,34) |
| 2 | fiú | 4,10 (3,64) | 5,02 (3,67) | 5,23 (3,81) | 6,29 (3,78) | 6,96 (4,08) | 7,26 (3,91) | 8,16 (3,99) |
| 2 | lány | 3,96 (3,59) | 4,53 (3,49) | 5,74 (3,76) | 6,52 (3,50) | 7,44 (3,68) | 7,93 (3,77) | 9,11 (3,75) |
| 3 | fiú | 2,30 (3,41) | 2,87 (3,81) | 3,26 (3,91) | 4,23 (4,15) | 4,97 (4,27) | 5,04 (4,12) | 6,37 (4,27) |
| 3 | lány | 2,07 (3,46) | 2,45 (3,46) | 3,41 (3,98) | 4,44 (4,24) | 5,38 (4,28) | 6,05 (4,36) | 6,80 (4,11) |

A Table 4 fejléce szerinti cella-n-ek, 7→13 év sorrendben: fiú `193, 285, 310, 297, 315, 253, 233`; lány `194, 307, 296, 321, 286, 223, 209`. A magasabb N-t nem minden gyermek kezdte vagy fejezte be; a cikk leállítási szabálya és normatív pontozása ezt kezeli. A cikk CC BY, tehát `data-reuse`. Az instrukció nyelvét a cikk nem nevezi meg, ezért a rekord nem feltételez spanyolt. A Hanna inger, tempó, mód, célpontarány, gombkiosztás és motorazonosító nem azonos, így a publikált percentilisek **nem személyes percentilisek**.

## 6. Vizuális folyamatos felismerés: MemTrax

Clifford és munkatársai 18 265 első alkalmas, önkéntes online használó (21–100 év) HAPPYneuron MemTrax adatait elemezték. A feladat 50 összetett képet mutatott: 25 új és 25 ismételt bemutatást, legfeljebb 3 másodpercig; ismétlésnél szóköz. A találat 50–2900 ms közötti válasz az ismételt képre, a helyes elutasítás válaszhiány egy új képre 3000 ms-ig. [Elsődleges cikk, Study design és Table 1B](https://doi.org/10.3389/fnhum.2024.1304221)

A Table 1B kor/nem szerinti **regressziós becsléseket**, nem nyers cellaátlagokat ad. Példák: férfi találatátlag 21–31 évnél 23,5/25, 81–90 évnél 22,8/25; nőknél 23,4 és 21,9. Helyes elutasítás férfiaknál 24,1-ről 23,4-re, nőknél 24,0-ről 23,2-re változik. A teljes 28 találat/helyes-elutasítás becslés a gépi fájlban van. Az egyes korcellák n-jét és nyers SD-jét a táblázat nem közli, ezért ezek `null`; a teljes kiválasztott minta n-je a `sample.n` mezőben marad.

A cikk CC BY, így a Table 1B összefoglalása `data-reuse`. A konkrét képkészlet és a MemTrax/HAPPYneuron megvalósítás átvételi joga ebből nem következik. A minta önkéntes, önbevallása ellenőrizetlen, klinikai jellemzése nincs; a Hanna rögzített régi/új aránya, saját képei és kiegyensúlyozott pontossága más mérés.

## 7. CANTAB/Cogstate mint modern, licencelt kutatási rendszer

Ball és munkatársai 2026-os ausztrál közleménye 12–13 évesek CANTAB PAL és Cogstate N-back csoportadatait közli. A CANTAB iPad 7. generáción, a Cogstate 24 hüvelykes asztali gépen futott; a Groton-feladat érintős, az 1-/2-back billentyűs volt. A hozzáférhető Table 2 szerint: [elsődleges cikk és Table 2](https://academic.oup.com/acn/article/41/3/acag010/8501228)

| Mutató | 12 év | 13 év |
|---|---:|---:|
| CANTAB PAL First Attempt Memory Score | n=38; 15,53 (2,90), medián 16, tartomány 10–20 | n=59; 15,15 (3,34), medián 15, 5–20 |
| CANTAB PAL Total Errors Adjusted | n=38; 6,26 (4,75), medián 6, 0–18 | n=59; 7,39 (7,39), medián 6, 0–43 |
| Cogstate One-Back Accuracy | n=82; 1,29 (0,12), medián 1,32, 1,01–1,57 | n=37; 1,36 (0,13), medián 1,39, 1,01–1,57 |
| Cogstate Two-Back Accuracy | n=79; 1,27 (0,15), medián 1,27, 0,91–1,57 | n=37; 1,23 (0,10), medián 1,23, 1,04–1,40 |

A cikk szerint ezek a gyártói rendszer által automatikusan transzformált értékek; a pontos egység/számítás az előfizetéses mellékletben van. Emiatt nem nevezzük a skálát nyers pontosságnak, és nem alakítjuk százalékká. A kiadói oldal előfizetéses, nem ad újraközlési licencet, ezért `link-only`. A CANTAB és Cogstate külön kereskedelmi, licencelt rendszerek; a táblázat megtekinthetősége nem enged tesztklónt vagy normabeépítést.

## 8. Kutatási rendszerek és felhasználási jog

| Rendszer | Ellenőrzött állapot 2026-09-11 | Mit ad? | Mit nem ad? |
|---|---|---|---|
| **jsPsych** | A hivatalos licenc MIT, kereskedelmi használatot és módosítást is enged a notice megőrzésével. [Licenc](https://www.jspsych.org/latest/about/license/) | Böngészős idővonal, pluginok, próbánkénti adatok; saját kísérleti feladat építésének technikai alapja. | Nem ad normát, validitást, tesztjogot vagy ingerlicencet. A külső plugin/asset joga külön ellenőrzendő. |
| **PEBL 2.4/2.4.2** | A hivatalos oldal GPL-ként írja le, több mint 100 feladattal és webes futással; a jelenlegi letöltési oldal 2.4.2-t ajánl. [PEBL](https://pebl.sourceforge.net/) [Letöltés](https://pebl.sourceforge.net/download.html) | Nyílt kutatási kód és sok klasszikus paradigma; a `dspan`, Corsi és N-back paraméterezhető referencia. | A GPL terjesztési kötelezettségeket okoz kódátvételnél. Egy PEBL-feladat nem lesz automatikusan klinikai teszt; 2015-ös PEBL 0.6-adat nem norma a 2026-os 2.4 változatra. |
| **NIH Toolbox V3** | Az aktuális hivatalos oldal szerint Cognition használatához C-level jóváhagyás kell, scoring/reporting előfizetéses; intézményi licenc jelenleg angol/spanyol V3-ra és USA-beli vásárlásra érhető el. [Hivatalos beszerzés](https://nihtoolbox.org/get-the-toolbox/) | Szabványosított, felügyelt battery és normált scoring az engedélyezett alkalmazásban. | A hivatalos jogpolitika szerint normát külső szoftverbe másolni írásos engedély nélkül tilos; módosítás és terjesztés is engedélyköteles. [Permissions policy](https://www.healthmeasures.net/images/PROMIS/Terms_of_Use_HM_approved_1-12-17_-_Updated_Copyright_Notices.pdf) |
| **CANTAB Connect Research** | A gyártó „proprietary platform”-ként írja le; licencaktiválás után ad hozzáférést, iPad/web móddal. A memóriafeladatok között DMS, Digit Span, PAL, PRM, Spatial Span, VRM és VPA szerepelnek. [Hivatalos platformleírás](https://cambridgecognition.com/technology-study-delivery/) | Validált kutatási rendszer, standardizált adminisztráció, kiválasztott feladatokhoz normák és support. | A gyártó külön figyelmeztet: a normatív adat nem helyettesít kontrollcsoportot. A licenc nem teszi szabadon másolhatóvá a kódot, feladatot, ingert vagy normát. |

Termékdöntés: jsPsych a legkönnyebben integrálható **technikai** keret saját protokollhoz. PEBL elsősorban nyílt módszertani és kódreferencia, GPL-hatással. NIH Toolbox vagy CANTAB megfelelő lehet külön, licencelt szakmai validációs vizsgálatban, de nem beágyazható normaforrásként engedély nélkül.

## 9. Ellenőrzött, de számszerűen kizárt források

- **Kessels és mtsai. (2000), standard Corsi:** a hozzáférhető absztrakt `n=70` felnőttet és módszertani eredményt közöl, de nem ad kinyerhető korcella-táblát; a teljes kiadói tábla nem volt nyíltan ellenőrizhető. Numerikus rekord nem készült. [PubMed](https://pubmed.ncbi.nlm.nih.gov/10674750/)
- **Pagulayan és mtsai. (2006), gyermek–serdülő–fiatal felnőtt spatial span:** a hozzáférhető absztrakt/összefoglaló csak néhány csoportátlagot mutat, cella-n és SD/percentilis nélkül; a teljes elsődleges táblázat nem volt ellenőrizhető. A grafikonból nem olvastunk le pontot. [DOI](https://doi.org/10.1080/13803390500350940)
- **Orsini és mtsai. (1987), 1355 felnőtt és 1112 gyermek verbális/térbeli span:** erős klasszikus jelölt, de a teljes normatáblát és újraközlési jogát nem sikerült elsődleges nyílt forrásból ellenőrizni, ezért nem került a gépi adatba. [DOI](https://doi.org/10.1007/BF02333660)
- **MemTrax Table 1B:** bekerült, de az egyes korcellák `n` és nyers `SD` mezője szándékosan `null`; a cikk csak modellből számolt kor/nem értékeket ad. Nincs visszaszámítás ábrából vagy küszöbértékből.
- **CANTAB/Cogstate 2026:** bekerült `link-only` státusszal; a gyártói transzformációt nem fejtettük vissza, mert a számítási melléklet nem volt nyíltan hozzáférhető.

## 10. Mit mutathat az alkalmazás?

Biztonságosan megjeleníthető kutatási referencia:

- „Ebben a vizsgálatban, ezzel a feladattal, ebben a csoportban ez volt az átlag.”
- forrás, ország, kor, n, pontos feladat, modalitás, pontozás és tábla-locator;
- egyértelmű felirat: „Nem a te percentilispontod; a feladatok nem azonosak.”

Nem megalapozott:

- külső táblából Hanna-pontszámhoz percentilist rendelni;
- CC BY cikkből kereskedelmi teszt ingeranyagát vagy márkázott feladatát átvenni;
- CC BY-NC, kiadói vagy NIH/CANTAB normát termékadatként újraközölni engedély nélkül;
- különböző kor, nyelv, modalitás, stopping és scoring adatát egy közös „memóriaindexbe” keverni.

## Források

1. Brunetti, Del Gatto & Delogu (2014), eCorsi. [DOI 10.3389/fpsyg.2014.00939](https://doi.org/10.3389/fpsyg.2014.00939).
2. Woods et al. (2011), computerized digit span. [PMC2978794](https://pmc.ncbi.nlm.nih.gov/articles/PMC2978794/).
3. Choi et al. (2014), Korean WAIS-R digit span. [PMC3942550](https://pmc.ncbi.nlm.nih.gov/articles/PMC3942550/).
4. Piper et al. (2015), PEBL psychometrics. [DOI 10.7717/peerj.1460](https://doi.org/10.7717/peerj.1460).
5. Emery, Hale & Myerson (2008/2009), Operation Span. [PMC2556888](https://pmc.ncbi.nlm.nih.gov/articles/PMC2556888/).
6. Harel et al. (2014), CPAL child development. [DOI 10.1371/journal.pone.0101750](https://doi.org/10.1371/journal.pone.0101750).
7. Pelegrina et al. (2015), child N-back norms. [DOI 10.3389/fpsyg.2015.01544](https://doi.org/10.3389/fpsyg.2015.01544).
8. Clifford et al. (2024), MemTrax continuous recognition. [DOI 10.3389/fnhum.2024.1304221](https://doi.org/10.3389/fnhum.2024.1304221).
9. Ball et al. (2026), CANTAB/Cogstate Australian age 12–13 data. [Oxford Academic](https://academic.oup.com/acn/article/41/3/acag010/8501228).
10. jsPsych. [Official MIT licence](https://www.jspsych.org/latest/about/license/).
11. PEBL. [Official project](https://pebl.sourceforge.net/) and [GPL repository](https://github.com/stmueller/pebl).
12. NIH Toolbox. [Official acquisition/access](https://nihtoolbox.org/get-the-toolbox/) and [permissions policy](https://www.healthmeasures.net/images/PROMIS/Terms_of_Use_HM_approved_1-12-17_-_Updated_Copyright_Notices.pdf).
13. Cambridge Cognition. [CANTAB Connect Research platform and licences](https://cambridgecognition.com/technology-study-delivery/).
