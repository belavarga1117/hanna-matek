# Memóriaprofil és fejlődéskövetés – kutatási és termékjavaslat

Készült: **2026. szeptember 11.** Hanna Memória Műhelyéhez. Cél: tudományosan védhető, érthető visszajelzés és megvalósítható következő feladatcsaládok. Ez döntés-előkészítés; ebben a munkában nem került új állapotmutató, norma vagy teszt a kiadott alkalmazásba.

**Van megfelelő tudományos és technikai alap egy sokkal jobb rendszerhez. A jelenlegi játékpontokból azonban még nem lehet megmondani, hogy „mennyire jó valakinek a memóriája”, vagy hogy a korosztályának hány százalékánál jobb.** A jó következő lépés két, világosan különálló felület: a mindennapi **Gyakorlás**, valamint a ritkább, azonos feltételekkel végzett **Memóriapróba**. A feladatokhoz kapcsolódó agyi hálózat bemutatható ismeretterjesztésként; az egyén agyának állapotát a játék nem méri.

## 1. Mi van már a rendszerben?

Friss, csak olvasásos kódvizsgálat történt a projekt `2af6f8d` HEAD-je mellett, 2026-09-11-én. Ellenőrzött fájlok: `dist/nback/engine.js`, `dist/core.js`, `dist/school.js`, `docs/NBACK-DELIVERY-2026-09-11.md`; célzott kiegészítő keresés a `server/` és `dist/nback/` könyvtárban, valamint a `dist/catalog.js` katalógus olvasása. Ez a kutatás nem új böngészős elfogadási próba.

| Jelenlegi képesség | Bizonyíték a kódban | Mit jelent az értelmezésnél? |
|---|---|---|
| Csatornánként találat, téves jelzés, kihagyott egyezés, helyesen elutasított nem egyezés | `engine.js`: `emptyCounts`, `classifyMatch`, `scoreSession` | Jó alap a konkrét válaszadási mintázat bemutatásához. |
| Két forráshű játékpontozás és adaptív N | `channelPercent`, `adaptLevel`; Workshop és Jaeggi profil | A százalék **játékon belüli pontszám**, nem normatív percentilis. A két profil százalékai sem felcserélhetők. |
| N, mód, tempó, módosítók, körhossz és eredményelőzmény | `core.js` normalizálás; `school.js` eredmény- és haladási nézet | Azonos beállítású körökből leíró trend építhető. |
| Kliensoldali, ingerhez viszonyított `atMs` a nyers válaszban | `engine.js`: `normalizeAnswer` | Válaszablak-ellenőrzésre már szolgál; nincs belőle hitelesített reakcióidő-összesítés vagy eszközkalibráció. |
| Körszám, átlagos százalék/N, legmagasabb N, módonként legjobb eredmény | `school.js`: `renderStudentProgress` | Gyakorlási napló. A vegyes nehézségű összesített átlag nem egységes képességskála. |
| N-back csillag és rangpont nélkül | `stars: null`; külön N-back haladási adatok | Helyes elválasztás a többi játék jutalmaitól. |
| Életkori referencia, magyar norma, bizonytalansági sáv, ismétlési hatás korrekciója, validált összpontszám | Az ellenőrzött mérési útvonalakon nincs ilyen | Ezek új mérési fejlesztést és adatgyűjtést igényelnek. |

Fontos konkrétum: Workshop esetén a pontszám `találat / (találat + téves jelzés + kihagyás)`; a helyes nem jelzés nem növeli. Jaeggi esetén a csatornánkénti helyes válaszarányból a gyengébb csatorna határozza meg az összpontot. Egy 80%-os kör tehát **nem** „80%-os memória”, és nem „80. percentilis”. A számtani csatorna hibás eredménye sem ugyanaz a pszichológiai esemény, mint egy egyezéscsatorna téves riasztása.

**Több ajánlott paradigmának már van közeli játékrokona a katalógusban:** Számlánc (`digits`, számsor előre/vissza), Fényösvény (`path`, villanó helyek sorrendje előre/vissza), Arcok és nevek / Árcédulák (társítás), Bevásárlólista / Képrészletek (felidézés/felismerés). Ez jó újrahasznosítási alap. A katalógusleírás nem igazolja a mérési protokoll azonosságát: például a hallott számsor, a rögzített leállítási szabály, a késleltetett újrakérdezés és a normáláshoz szükséges pontozás külön munka. Nem hét teljesen új játék megírása a javaslat, hanem a meglévők ellenőrzése, megfelelő mérési változatok és néhány új mechanizmus.

## 2. Mit támaszt alá a kutatás?

| Kérdés | Bizonyíték és erősség | Következmény Hanna számára |
|---|---|---|
| Jobb lesz-e valaki N-backben, és átmegy-e ez más feladatokra? | Soveri és munkatársai 33 randomizált kontrollált vizsgálat metaanalízisében közepes átvitelt találtak más N-back feladatokra; más munkamemória-, intelligencia- és kontrollfeladatokra az átvitel nagyon kicsi volt. Egészséges felnőttekre vonatkozó összegző bizonyíték. [Soveri, 2017](https://pubmed.ncbi.nlm.nih.gov/28116702/) | „Ügyesebben követed a sorozatot ebben a feladatban” indokolható; az általános memória vagy intelligencia javulása nem következik automatikusan. |
| Javul-e ettől a gyerekek iskolai teljesítménye? | Sala és Gobet 41 tanulmány, 2375 gyermek adatát elemezte. A közeli átvitel a feladatok hasonlóságával nőtt; az aktív kontrollos vizsgálatok távoli átviteli hatása gyakorlatilag nulla volt. [Sala–Gobet, 2020](https://pubmed.ncbi.nlm.nih.gov/31939109/) | Ne ígérjünk jobb matekjegyet, olvasást vagy IQ-t az N-back pontszám alapján. Ez nem zár ki minden célzott tanulási beavatkozást. |
| Elég-e többféle memóriajátékot összerakni? | Egy 2026-os, 197 ausztrál, 7–11 éves gyermeket bevonó RCT-ben 2, 4 vagy 6 munkamemória-tevékenység sem múlta felül az aktív kontrollt a mért kimeneteken, közvetlenül vagy három hónappal később. [Hrysanidis és mtsai., 2026](https://pubmed.ncbi.nlm.nih.gov/41518110/) | A változatosság jó termékélmény és szélesebb feladatprofil; önmagában nem bizonyított általános kognitív fejlesztés. |
| A magasabb második pontszám valódi változás? | Közel 1600 hatásméret metaanalízise szerint az ismételt felvétel önmagában javíthat pontszámot; a párhuzamos tesztváltozat, életkor és időköz is számít. [Calamia és mtsai., 2012](https://pubmed.ncbi.nlm.nih.gov/22540222/) | A véletlen új sorozat csökkenti a konkrét válaszok megtanulását, de a szabály, stratégia és kezelőszervek begyakorlását nem szünteti meg. |
| Egy ismert kísérlet jó egyéni állapotmérő is? | Hét klasszikus figyelmi/kontrollfeladat vizsgálata erősen változó teszt–újrateszt megbízhatóságot mutatott. Stabil csoportszintű kísérleti hatásból nem következik stabil egyéni rangsor. [Hedge és mtsai., 2018](https://pubmed.ncbi.nlm.nih.gov/28726177/) | Különösen a rövid Stroop/Flanker különbségpontszámból ne készítsünk „figyelemindexet” saját megbízhatósági adatok nélkül. |
| Van valóban hasznos tanulási mechanizmus a kínálat bővítésére? | Roediger és Karpicke két kísérletében az előhívás gyakorlása jobb késleltetett megtartást adott, mint az ismételt tanulás; a hatás a tanult anyagra vonatkozott. [Roediger–Karpicke, 2006](https://pubmed.ncbi.nlm.nih.gov/16507066/) | A tanári szókincs, név–fogalom vagy más tananyag aktív felidézése és későbbi újrakérdezése közvetlenebbül kapcsolható használható tanulási célhoz. Nem általános memóriakapacitás-növelést ígérünk. |

Ezek célzottan kiválasztott elsődleges kutatások és összegző vizsgálatok, nem teljes szisztematikus áttekintés. A 2026-os friss keresés sem indokolja, hogy minden életkorra, klinikai csoportra és tréningre ugyanazt a következtetést terjesszük ki.

## 3. Két külön út: gyakorlás és mérési alkalom

**Gyakorlás:** választható játék, adaptív nehézség, saját tempó, visszajelzés, szabad ismétlés. Kimenet: gyakorolt idő, befejezett körök, elért kihívás és ugyanazon beállítás mellett elért teljesítmény. A feladat jobb ismerete ennek természetes része.

**Memóriapróba:** rögzített, verziózott protokoll; előtte külön betanítás és megértésellenőrzés; majd azonos szabály, tempó, ingerarány és pontozás. A mérési részben nincs segítség és azonnali helyesség-visszajelzés. Kiegyensúlyozott új sorozatot/párhuzamos formát kap a résztvevő. A gyakorló- és mérési tételkészlet legyen elkülönítve, az előzetes gyakorlás mennyisége pedig látható adat.

**Saját induló termékjavaslat, nem validált előírás:** egy betanító alkalom, majd két alapmérés külön napokon; utána például 2–4 hetente mérési alkalom, változatlan protokollal. A megfelelő időközt, próbaszámot és leállítási szabályt a pilotnak kell meghatároznia. A heti személyes összefoglaló ettől függetlenül készülhet a gyakorlási naplóból. Egy négyingeres kör a játék kipróbálására jó, egyéni képességbecsléshez rendszerint túl kevés információt ad.

A mérési alkalom alatt jelentkező megszakítás külön minőségi jelzés legyen. A folytatás lehetővé tétele felhasználóbarát, de a megszakított próbát ne keverjük automatikusan a zavartalan referenciaadatokhoz. Hanghiba, felületváltás, elmaradó ingerek és más beviteli mód esetén is őrizzük meg a kontextust.

## 4. Javasolt feladatkészlet: hét paradigma

Az alábbi szabályok **saját böngészős tervezési vázlatok klasszikus paradigmák alapján**, nem kereskedelmi tesztek klónjai vagy normáik átvételei. A PEBL kutatási közleménye a nyílt feladatbattéria és a klasszikus paradigmák kiinduló szakirodalma; önmagában nem validálja az alábbi új magyar változatokat. [Mueller–Piper, 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC3897935/)

| Feladat és rövid szabály | Milyen teljesítményt mutathat? | Monitorozás és fejlesztési bizonyíték | Magyar nyelv, mobil és korosztály; saját megvalósítás |
|---|---|---|---|
| **1. Sorozatkövetés – standard N-back próba.** Egyszerű pozíció vagy hang, rögzített N és tempó; a jelenlegi inger összevetése az N-nel korábbival. | Folyamatos frissítés és egyezésfelismerés adott terhelés mellett. | Találati arány és tévesjelzés-arány külön; a pontosságot és sebességet együtt értelmezzük. Erős feladatspecifikus gyakorlási hatás, korlátozott távoli átvitel. | Meglévő motor új, lezárt mérési profilja lehet. Kezdetben egyszerű egycsatornás mód; a 28 mód ne legyen 28 külön „agyi képesség”. Saját tempó külön profil. |
| **2. Fényösvény – Corsi-jellegű térbeli sorrend.** Szabálytalanul elhelyezett mezők villannak; ugyanabban, majd külön blokkban fordított sorrendben érintjük őket. | Térbeli sorrend megőrzése; a fordított változat további rendezési követelményt ad. | Több sorozat minden hosszhoz, sorozatonkénti és elemenkénti pontozás; a maximális hossz önmagában zajos. Gyakorlási javulás nem bizonyít általános térbeli képességnövekedést. | Kevés nyelv, nagy fix érintési célok. Óvodás adaptáció csak külön pilot után. Saját mezők/sorozatok; fizikai táblás vagy más képernyős norma nem vihető át. |
| **3. Számvisszhang – számsor előre/vissza.** Előre felvett számokat hall, majd sorrendben vagy visszafelé megadja őket. | Hallott verbális sorozatok rövid megőrzése és átrendezése; hallás és instrukcióértés is befolyásolja. | Külön előre/vissza eredmény, hosszanként több sorozat; ne csak egyetlen rekord. Általános iskolai transzferre nincs itt bemutatott bizonyíték. | Magyar, azonos ritmusú hangkészlet szükséges. Nagy számgombok; a képernyős bevitel saját változat az élőszavas válaszhoz képest. Kezdetben a számjegyeket ismerő korosztály. |
| **4. Közben is emlékezz – komplex terjedelem.** Egyszerű szimmetria-döntések közé helyek megjegyzése ékelődik; végül sorrendi felidézés. | Megőrzés egy közbeiktatott feldolgozó feladat mellett. | A memória és a köztes döntések pontossága együtt szükséges: nem jutalmazható a köztes feladat kihagyása. A rövidített változat megbízhatóságát külön kell mérni. | A vizuális változat kevésbé függ olvasástól/matektudástól, mint az olvasási vagy műveleti terjedelem. Nagy kétválasztásos gombok; kezdetben idősebb iskolások/felnőttek pilotja. |
| **5. Mi hol volt? – kép–hely társítás.** Saját tárgyképek helyét tanulja meg; egy képhez üres helyek közül választ; új tanulási kör után ismét felidéz. Később ugyanazokat a társításokat újra kérdezzük. | Új társítások elsajátítása, tanulási görbe és késleltetett felidézés. | Első felidézés, ismétlések alatti javulás és késleltetett eredmény külön. Az elért felidézési teljesítményből hippocampus-állapot nem állapítható meg. | Saját, kulturálisan jól felismerhető képek; nem elég új sorrend, a párosítások is változzanak. Olvasás nélkül, érintésre jó. Védett tesztábrát, szólistát és normatáblát nem veszünk át. |
| **6. Láttad már? – felismerés / késleltetett mintaegyezés.** Megjegyzett saját képek közé új, hasonló képek kerülnek; „láttam / új” válasz, vagy egy célkép kiválasztása. A két válaszformát külön protokollként kezeljük. | Képi felismerés, a hasonló új ingerek elkülönítése és a válaszadási hajlam. | Találat és téves felismerés együtt, eltérő késleltetéseknél külön. A találgatás és mindenre „láttam” ne adjon jó eredményt. Tételtanulás erős lehet. | Kevés nyelv; képi látás és hasonlóság kontrollja kell. A kép- és válaszkiosztás ne változtassa véletlenül a nehézséget. |
| **7. Jelőr – tartós figyelmi kontroll, opcionális.** Egyszerű ingersorban a célnál válaszol, egy rögzített kivételnél visszatartja a választ. | Éberség, kimaradások és válaszvisszatartás a konkrét feladatban; segít értelmezni egy memóriaeredményt. | Időbeli ingadozás, kihagyás, téves válasz; ne nevezzük memóriafejlesztésnek. Egyéni figyelemindexhez külön reliabilitás kell a Hedge-féle probléma miatt. | Egy nagy érintési cél; rögzített ingerarány. A mozgás, eszköz és fáradtság befolyásolja. Nem ADHD-szűrés, nem kereskedelmi CPT másolata. |

A „mit mér” oszlop feladathoz kapcsolódó konstrukciót jelöl, **nem validált egyéni diagnosztikus következtetést**. A Corsi, számsor és komplex terjedelem rövidítésének, érintéses válaszának és magyar instrukciójának minden változata saját mérőeszköz-verzió.

**Első fejlesztési csomag:** 2., 3. és 5. feladat mérési változata, a meglévő N-back mellett; a Fényösvény és Számlánc újrahasznosíthatóságát először megvizsgálva. Egy lehetséges, körülbelül 10–14 perces próba: kép–hely tanulás → térbeli sorrend → számsor → kép–hely késleltetett felidézés. Az időtartam tervezési becslés, nem validált teszthossz; a tényleges késleltetést minden résztvevőnél mérni kell. Az N-back standard próba külön blokk vagy külön alkalom lehet. A komplex és figyelmi teszt későbbi, ne terhelje az első felhasználói találkozást.

**Külön tanulási termékirány:** tanári tananyaggal „Emlékszel még?” felidézés, visszajelzés, majd napokkal későbbi újrakérdezés. Itt azt monitorozzuk, mit tud a tanuló később is előhívni. A saját ütemezés hatását pilotban kell mérni; a fenti előhíváskutatás a mechanizmust támogatja, nem bármely saját algoritmus hatásosságát.

## 5. Hogyan lehet hiteles összehasonlítás másokkal?

Valódi normatív rendszer létezik: az NIH Toolbox V3 új normáit 3904 amerikai, angol nyelvű résztvevőn dolgozták ki, demográfiai súlyozással és életkorhoz, illetve életkorhoz–iskolázottsághoz igazított folyamatos modellekkel. Ez mutatja a szükséges módszertani szintet; **nem kölcsönvehető norma a Hanna-játékokhoz**. [Ho és mtsai., 2025](https://pubmed.ncbi.nlm.nih.gov/41239878/)

| Összehasonlítás | Mikor vállalható? | Helyes felirat |
|---|---|---|
| Saját korábbi körök | Azonos mód, N, tempó, körhossz, pontozás, módosítók, inger-/hangkészlet és bevitel mellett; elegendő megfigyeléssel | „Azonos beállítás mellett, a korábbi alkalmaidhoz képest.” |
| Az alkalmazás más résztvevői | Megadott időszak, életkor, nyelv, eszköz és gyakorlási tapasztalat szerint kiválasztott, megfelelő létszámú csoport; egy ember ne számítson százszor a sok játék miatt | „A Műhely ezen összehasonlításba bevont résztvevői között.” Nem „a korosztályodhoz képest”. |
| Lakossági/korosztályos percentilis | Célpopulációt lefedő saját normálás vagy megfelelően licencelt és változtatás nélkül felvett validált teszt megfelelő normája | A norma megnevezése, éve, ország/nyelv, életkor, tesztverzió és bizonytalanság is elérhető. |
| Megbízható személyes változás | Azonos protokoll, ismételt mérési megbízhatóság, párhuzamos formák és várható ismétlési hatás becslése | „A különbség meghaladja az ebben a vizsgálatban becsült mérési ingadozást.” Csak ha ténylegesen igazolt. |

**A szükséges saját adatok és út:**

1. **Hatókör és protokoll:** elsőként egy meghatározott magyar korosztály és felhasználási cél. Gyermek és felnőtt ne kerüljön közös nyers rangsorba. Fejlődéspszichológus/pszichometrikus partnerrel előre rögzített mérési terv, fő kimenet és döntési szabályok.
2. **Adatmodell:** álneves résztvevőazonosító; méréskori életkor megfelelő pontossággal, instrukció nyelve, iskolai évfolyam/iskolázottság a célhoz igazítva; teszt- és tételkészlet-verzió; forma, seed, beállítások; tényleges inger- és válaszidők; képernyő/beviteli mód; megszakítás, hangellenőrzés, technikai hibák; korábbi gyakorlások; időköz. A szükséges adatminimalizálást és kutatási hozzájárulást a vizsgálati tervben rendezni kell.
3. **Megértési és technikai pilot:** külön életkori csoportok, érintés/egér/billentyűzet, saját magyar hang és instrukció. Nem számít sikernek a feladat elkészülte, ha a fiatalabbak félreértik, vagy a telefon motoros ügyességet mér.
4. **Ismételt mérési vizsgálat:** párhuzamos A/B formák, ellenkiegyensúlyozott sorrend, a tervezett újramérési időköz. Megbízhatóság, mérési hiba, padló/plafon, tételnehézség és gyakorlási hatás becslése; a túl rövid vagy instabil mutatók elhagyása. Az új változatot külön, megfelelően felvett referenciafeladatokhoz is viszonyítsuk.
5. **Normálás:** több intézményből, a célcsoport lefedésével; ne csak a fizető és legtöbbet gyakorló felhasználókból. Az életkor–nyelv–eszköz eltérések kezelését adatokkal kell indokolni; ahol nincs összehasonlíthatóság, külön modell vagy korlátozott értelmezés kell. A gyerekeknél életkori fejlődés és iskolai háttér is számít.
6. **Mintanagyság:** nincs „100 ember után tudományos” küszöb. A pontossági cél és a csoportok száma határozza meg. Illusztráció: egy rögzített pontszám alatti arány egyszerű véletlen mintában, 50% körül, n=100-nál durván ±10, n=400-nál ±5 százalékpontnyi 95%-os mintavételi bizonytalanságot ad. Ez saját binomiális közelítő számítás; nem tartalmazza a mérési hibát, korrekciós modell vagy szelekciós torzítás hatását, és nem mintanagyság-ajánlás.
7. **Független ellenőrzés és verziózás:** új résztvevői mintán ellenőrzött becslés; előre rögzített kizárások; norma- és protokollverzió a jelentésen. Jelentős UI/ritmus/hangkészlet-változás után ellenőrizni kell, összevonhatók-e az adatok.
8. **Fejlesztési hatás állítása:** tréningcsoport és hasonló figyelmet/élményt kapó aktív kontroll, előmérés–utómérés–követés, külön nem gyakorolt kimenetek. Az egyén emelkedő pontszáma nem helyettesíti ezt a vizsgálatot.

A kalibrált változásindex egyik lehetséges későbbi alakja: `(utómérés − alapmérés − kontrollcsoport átlagos ismétlési változása) / változás becsült szórása`. Ez csak szemléltető modell; a nevezőt, regressziót az átlaghoz, életkort és formahatást a saját vizsgálat alapján kell kezelni. Nem helyettesíthető egy tetszőleges „+10% = fejlődés” szabállyal.

## 6. Agyterületek: szép és érthető, de mit jelenthet?

N-back vizsgálatokban többek között homlok- és fali lebenyi régiók együttműködése jelenik meg. Owen és munkatársai 24 képalkotó vizsgálat eredményeit összegezve elosztott frontoparietális mintázatot találtak, nem egyetlen „memóriaközpontot”. [Owen és mtsai., 2005](https://pmc.ncbi.nlm.nih.gov/articles/PMC6871745/)

Új tények, események és társítások megőrzésében a hippocampust és környező mediális temporális struktúrákat is magában foglaló rendszer fontos; a működés más agyi területekkel együtt értelmezendő. [Squire és mtsai., 2004](https://doi.org/10.1146/annurev.neuro.27.070203.144130)

**Javasolt megjelenítés:** „Mi történik a háttérben?” információs lap, egy sematikus, minden felhasználónál azonos agyi hálózatrajzzal és két-három rövid magyarázattal. A megvilágítás kizárólag a választott feladatról szóló ismeretterjesztés legyen, ne változzon a pontszámmal. Az ábra mellett: „Kutatásokban ezek a hálózatok is részt vesznek a feladat végzésében. Ez nem a te agyi aktivitásod mérése.”

Használható példaszöveg: **„Itt a friss információkat tartod észben, miközben eldöntöd, mire kell figyelned. Ebben több, egymással együttműködő agyi terület vesz részt.”**

Nem megalapozott: „hippocampusod 72%-on működik”, „prefrontális kérged 18%-ot fejlődött”, „bal agyféltekéd gyengébb”, „agyéletkorod 12 év”, „ez a pontszám ADHD-t vagy memóriabetegséget jelez”. Még a képalkotó aktivitásból történő visszakövetkeztetés is feltételekhez kötött; a puszta játékpontból személyes anatómiai állapotra következtetni ennél is kevésbé indokolható. [Poldrack, 2006](https://pubmed.ncbi.nlm.nih.gov/16406760/)

## 7. Konkrét, érthető fejlődési felület

Ez későbbi termékjavaslat. A mostani modern katalógusba nem kerül új, kutatásból származtatott állapotmutató.

| Felületi elem | Tartalom | Példaszöveg, szemléltető adatokkal |
|---|---|---|
| **Gyakorlásom** | Körszám, rendszeresség, választott nehézség. Teljesítménytrend csak összehasonlítható beállításokból. | „Ezen a héten 4 alkalommal gyakoroltál. A pozíciófeladatban N=2 mellett kevesebb egyezés maradt ki.” |
| **Egy eredmény magyarázata** | Találat/célhelyzet és téves jelzés/nem célhelyzet együtt, tényleges darabszámmal. | „10 egyezésből 8-at észrevettél. A 20 eltérő helyzetből 2-nél jeleztél egyezést.” |
| **Memóriapróbáim** | Idősoros pontok, saját alapmérés, adatminőség és később becsült bizonytalansági sáv. Külön sor a térbeli sorrend, hallott sorrend és társításfelidézés számára. | „Ezen a próbán több képet idéztél fel. Még kevés az összehasonlítható mérés ahhoz, hogy biztos változást jelezzünk.” |
| **Összehasonlíthatóság** | Nem elrejtett technikai jelzés, hanem rövid ok. | „Most telefonon játszottál, korábban billentyűzettel. A válaszidőt ezért külön mutatjuk.” |
| **Késleltetett emlékezés** | Tanulás végi és későbbi felidézés külön, késleltetési idővel. | „Tanulás után 8 képből 7-et, 6 perccel később 5-öt idéztél fel.” |
| **Másokhoz képest**, csak a megfelelő adatbázis után | Szűkített csoport leírása, egyedi személyek száma, norma forrása, bizonytalanság. | „Az alkalmazás azonos feltételekkel mért résztvevői között.” A lakossági percentilis külön néven és forrással jelenjen meg. |
| **Miért ezt javasoljuk?** | Tanári cél vagy előre rögzített gyakorlási szabály; ne áldiagnózis. | „Legutóbb a hangcsatornán több egyezés maradt ki. Ha ezt szeretnéd gyakorolni, próbáld most külön a hangfeladatot.” |

A „legmagasabb elért N” legyen kihívásrekord, ne memóriakapacitás-mérték. A saját tempóban elért 90% ne kerüljön egy görbére a gyors, időzített 70%-kal. A piros–zöld „gyenge/egészséges” jelölés helyett pontos feladatnév, tényadat és bizonytalanság szerepeljen. Egy látványos radar vagy összesített 0–100 „agyindex” a saját skálák validálása előtt félrevezető lenne.

## 8. Használható rendszerek és felhasználási feltételek

| Rendszer | Mire jó itt? | Ellenőrzött feltétel és korlát | Javaslat |
|---|---|---|---|
| **jsPsych** | Böngészős kísérletek felépítésének technikai eszköze; saját idővonal, inger, válasz és adatrögzítés. | MIT: kereskedelmi használat és módosítás megengedett a szerzői jogi/licencszöveg megőrzésével. A külső pluginok és assetek feltételeit külön kell nézni. Nem ad automatikusan normát vagy validált tesztet. [Hivatalos licenc](https://www.jspsych.org/latest/about/license/) | A későbbi külön mérési modulhoz jó jelölt; a működő játékot nem kell emiatt átírni. |
| **PEBL és tesztbattéria** | Klasszikus feladatok, nyílt eljárások és kutatási források vizsgálata. A rendszer kutatási háttere dokumentált. | A megnyitott `COPYING` a GPL 2. verzióját és „vagy későbbi” projektkikötést tartalmazza. Módosított/átvett kód terjesztésének forrás- és licencfeltételei vannak; tesztek, ingerek és hivatkozások ellenőrzése külön szükséges. [PEBL COPYING](https://raw.githubusercontent.com/stmueller/pebl/master/COPYING) | Elsősorban paradigma- és összehasonlítási referencia; saját UI és saját assetek. Nem „bármely PEBL-feladat klinikailag validált”. |
| **PsyToolkit** | Oktatási/kutatási demonstráció és feladatleírások. | A 2026-02-09-én frissített feltételek nem kereskedelmi kutatást/oktatást engednek meg megjelöléssel; kereskedelmi használathoz formális engedély kell. Más szerzők feladatainál külön jogok is vannak. [Hivatalos copyright](https://us.psytoolkit.org/copyright.html) | Hanna kereskedelmi termékébe ne emeljük át a kódot/ábrát engedély nélkül. |
| **NIH Toolbox** | Valódi standardizált többterületes értékelés és normálási módszertan; külső validálási referencia lehet. | A megnyitott 2024-es adminisztrátori kézikönyv hozzáférési feltételeket és engedély nélküli másolási/fordítási korlátozásokat tartalmaz. Ez korábbi protokoll-dokumentum, nem a V3 friss normatáblája; a V3 normálást a 2025-ös cikk alapján értékeltük. [Kézikönyv](https://resources.nihtoolbox.org/wp-content/uploads/2024/09/NIH-Toolbox-App-Administrators-Manual-v1.23-08.09.2024.pdf) | Aktuális beszerzés, megfelelő tesztfelvevő és magyar használhatóság tisztázásával lehet partneres validálás része. Saját fordítás nem örökli a normákat. |

Az ellenőrzött források nem igazoltak Hanna saját magyar, önálló mobilfelületére alkalmazható kész normát. A keretrendszer nyíltsága, a tesztparadigma ismertsége, az asset jogállása és a mérés validitása négy külön kérdés. A forráskód elérhetőségéből egyik másik sem következik automatikusan.

## 9. Megvalósítási sorrend és kilépési feltételek

| Lépés | Leszállítható eredmény | Mi kell a következő állítási szinthez? |
|---|---|---|
| **A. Meglévő napló értelmezhetővé tétele** | Összehasonlítható N-back körök szűrése; csatornaadatok közérthető magyarázata; kihívásrekord külön a teljesítménytrendtől | Még kizárólag feladatspecifikus, leíró visszajelzés. |
| **B. Saját mérési prototípus** | Corsi-jellegű, számsor és kép–hely próba; lezárt mérési profilok; tanári kiosztás és nyers eredményexport | Megértési/technikai pilot, verziózott mérési szabályok. „Kísérleti memóriapróba”, nem validált állapotértékelés. |
| **C. Megbízhatóság és érvényesség** | Ismételt mérések, forma- és eszközösszehasonlítás; szakemberrel kiválasztott referenciafeladatok | Csak a megfelelően teljesítő mutatók kerüljenek személyes profilba. |
| **D. Saját magyar normák** | Reprezentativitásra tervezett adatgyűjtés, életkori modell, külön ellenőrző minta | Forrásolt, bizonytalanságot is mutató percentilis; célpopuláción kívül nincs érvényes norma. |
| **E. Fejlesztési hatás vizsgálata** | Aktív kontrollos, előre rögzített vizsgálat nem gyakorolt feladatokkal és későbbi követéssel | Csak az igazolt kimenetekre és csoportokra tehető hatásállítás. |

## 10. Válogatott forrásjegyzék

Az alábbi 15 forrás 2026-09-11-én került ellenőrzésre. A tanulmányoknál a hozzáférhető absztrakt, illetve elérhető teljes szöveg alapján készültek az állítások; védett teszttételek nem kerültek átvételre. A régi alapművek dátumai szándékosan szerepelnek, a friss keresés 2026-os RCT-t és 2025-ös normaépítést is tartalmazott.

1. **Soveri et al. (2017):** Working memory training revisited: A multi-level meta-analysis of n-back training studies. [PubMed, DOI 10.3758/s13423-016-1217-0](https://pubmed.ncbi.nlm.nih.gov/28116702/).
2. **Sala & Gobet (2020):** Working memory training in typically developing children: A multilevel meta-analysis. [PubMed, DOI 10.3758/s13423-019-01681-y](https://pubmed.ncbi.nlm.nih.gov/31939109/).
3. **Hrysanidis et al. (2026):** Outcomes of Varied Activities in Working Memory Training for Children: A Randomized Controlled Trial. [PubMed](https://pubmed.ncbi.nlm.nih.gov/41518110/).
4. **Calamia et al. (2012):** Scoring higher the second time around: meta-analyses of practice effects in neuropsychological assessment. [PubMed, DOI 10.1080/13854046.2012.680913](https://pubmed.ncbi.nlm.nih.gov/22540222/).
5. **Hedge et al. (2018):** The reliability paradox: Why robust cognitive tasks do not produce reliable individual differences. [PubMed, DOI 10.3758/s13428-017-0935-1](https://pubmed.ncbi.nlm.nih.gov/28726177/).
6. **Ho et al. (2025, online november 15.):** Norming of the NIH Toolbox Cognition Battery Version 3. [PubMed, DOI 10.1177/10731911251386277](https://pubmed.ncbi.nlm.nih.gov/41239878/).
7. **Owen et al. (2005):** N-back working memory paradigm: A meta-analysis of normative functional neuroimaging studies. [PMC, DOI 10.1002/hbm.20131](https://pmc.ncbi.nlm.nih.gov/articles/PMC6871745/).
8. **Poldrack (2006):** Can cognitive processes be inferred from neuroimaging data? [PubMed, DOI 10.1016/j.tics.2005.12.004](https://pubmed.ncbi.nlm.nih.gov/16406760/).
9. **Squire et al. (2004):** The Medial Temporal Lobe. [DOI 10.1146/annurev.neuro.27.070203.144130](https://doi.org/10.1146/annurev.neuro.27.070203.144130).
10. **Roediger & Karpicke (2006):** Test-enhanced learning: taking memory tests improves long-term retention. [PubMed, DOI 10.1111/j.1467-9280.2006.01693.x](https://pubmed.ncbi.nlm.nih.gov/16507066/).
11. **Mueller & Piper (2014; online 2013):** The Psychology Experiment Building Language (PEBL) and PEBL Test Battery. [PMC, DOI 10.1016/j.jneumeth.2013.10.024](https://pmc.ncbi.nlm.nih.gov/articles/PMC3897935/).
12. **PEBL:** [Hivatalos repó COPYING fájl](https://raw.githubusercontent.com/stmueller/pebl/master/COPYING), GPL v2 és a projekt „vagy későbbi” kikötése; 2026-09-11-i olvasat.
13. **jsPsych:** [Hivatalos licencoldal](https://www.jspsych.org/latest/about/license/), MIT; 2026-09-11-i olvasat.
14. **PsyToolkit:** [Copyright](https://us.psytoolkit.org/copyright.html), utolsó jelzett frissítés 2026-02-09.
15. **NIH Toolbox:** [App Administrator’s Manual v1.23, 2024-08-09](https://resources.nihtoolbox.org/wp-content/uploads/2024/09/NIH-Toolbox-App-Administrators-Manual-v1.23-08.09.2024.pdf), korábbi protokollok, hozzáférés és felhasználási feltételek; nem V3-normaforrás.

## Ajánlás a fejlesztés tulajdonosának

Most a modern katalógus tegye érthetővé a feladatot, a megfigyelt jeleket és a választás célját; új tudományos állapotindexet még ne mutasson. A következő önálló fejlesztés egy külön „Memóriapróba” legyen három feladattal: térbeli sorrend, hallott számsor és kép–hely társítás késleltetett felidézéssel. A napi gyakorlást és a lezárt mérési alkalmakat külön adatsorban tartsuk. Elsőként a saját, azonos feltételek melletti teljesítményt magyarázzuk el tényleges darabszámokkal. Pszichometrikus partnerrel vizsgáljuk az új magyar változatok megbízhatóságát, párhuzamos formáit és eszközfüggését. Kortársi percentilist csak megfelelően megtervezett saját normálás vagy megfelelő licencelt teszt alapján adjunk. Agyhálózati ábra lehet szép ismeretterjesztés, de soha ne legyen pontszámhoz színezett személyes „agyállapot”. A közvetlen tanulási haszonhoz a tanári anyag aktív felidézése és késleltetett újrakérdezése ígéretesebb, konkrétabban vizsgálható irány, mint egy általános memóriajavítási ígéret.
