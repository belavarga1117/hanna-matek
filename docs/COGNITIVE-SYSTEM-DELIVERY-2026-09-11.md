# Memóriapróbák – megvalósítási és kiadási bizonyíték

Készült: **2026. szeptember 11.** Alap: `095d3a454829027e8df3ccf49b2909861ce85978`. Az első teljes review-jelölt `55cf87a5017194df778fc623860aeedf5e241c44`, a minden findinget lezáró exact kódjelölt `791ed24f2214e5ed22057f79a27f6c468a11354a`, a kiadott dokumentált jelölt `d852e80702675e643c8077c2446f3c173acfe8a0`. A közös protokoll- és adatszerződés: [COGNITIVE-SYSTEM-CONTRACT.md](COGNITIVE-SYSTEM-CONTRACT.md). A számszerű forráskutatás: [COGNITIVE-NORMS-RESEARCH-2026-09-11.md](COGNITIVE-NORMS-RESEARCH-2026-09-11.md).

## Követelményenkénti állapot

| Követelmény | Állapot | Konkrét bizonyíték |
|---|---|---|
| Külön Memóriapróbák, gyakorlás és rögzített próba | **Kész** | Külön hub, beállító- és eredménynézet; szerveres `mode`; a profil két külön szakaszban mutatja az adatokat. |
| Térbeli terjedelem előre/vissza | **Kész, saját kísérleti protokoll** | Determinisztikus 3×3 terv, két sorozat/hossz és irányonkénti két-hibás leállítás; külön előre/vissza terjedelempont. |
| Rögzített magyar hallási számsor előre/vissza | **Kész, saját kísérleti protokoll** | Tíz verziózott, előre betöltött `hu-HU` PCM WAV, macOS Tünde hang, 145 szó/perc; nincs menet közbeni hálózati beszédszintézis. Hangpróba és külön irányskálák. |
| Kép–hely tanulás, azonnali és késleltetett felidézés | **Kész** | Két tanulási kör, azonnali felidézés, majd a szerveren indított és ellenőrzött legalább 60 másodperces checkpoint. A szerver túl korai beküldést elutasít. |
| Komplex terjedelem | **Kész, saját kísérleti protokoll** | Téri megőrzés és szimmetriadöntés; felidézés és feldolgozási pontosság külön; 75% alatti válaszmegfelelés minőségi jelzés. |
| Felismerés és figyelmi no-go | **Kész, saját kísérleti protokoll** | Találat/kihagyás/téves felismerés/helyes elutasítás és kiegyensúlyozott pontosság; go/no-go számlálás és helyes reakcióidő. Mindenre kattintás nem ad teljes pontot. |
| Meglévő N-back mint hetedik paradigma | **Kész, meglévő motor megőrizve** | A rendszertan a Modernizált/Klasszikus N-back felfedező rögzített és gyakorló útvonalaira mutat; az N-back motor nem lett újraírva. |
| Tanári aktív felidézés és későbbi újrakérdezés | **Kész** | 1–20 saját tétel, tanulási magyarázat, több elfogadott válasz, 1 óra–1 hét szerveres zár, első és későbbi kör külön eredménye. A válaszkulcs csak `private_settings` mezőben marad a szerveren. |
| Kiosztás, nyersválasz-pontozás, mentés, idempotencia, progress | **Kész** | A szerver ad seedet és normalizált beállítást, a nyers eseményeket maga pontozza, tartós eredményt és `metrics` JSONB-t ír. Az ismételt beküldés ugyanazt az eredményt adja; a tanári progress az első/második kör után 1/2, majd 2/2. |
| Személyes profil tényleges adatokból | **Kész** | Csak azonos `comparabilityKey` kapcsolódik össze; gyakorlás/mérés, mód, hang-/ingerverzió és bevitel része az identitásnak. Az egyetlen pont és üres állapot kész nézet; a minőségjelzők szövegesek. |
| Tudományos rendszertan, hálózati illusztráció, forrásfiók | **Kész** | A kiválasztott feladat vezérli a sematikus hálózatot, nem a pontszám. A felület kimondja, hogy nem személyes agyi aktivitás vagy egészségmérés. A forráskártyán a minta, kor, n, táblahely, jog és megfelelési korlát egymás mellett látszik. |
| Mobil és csökkentett mozgás | **Kész** | 390×844 böngészős nézetben a hub és beállító teljes szélessége 390 px, nincs vízszintes kilógás. A CSS `prefers-reduced-motion` alatt leállítja az animációkat. |

## Pontozási és adatvédelmi kapuk

- Az ingerterv ugyanabból a `gameId + settings + uint32 seed` hármasból bájtszinten azonos. Ismeretlen beállítás, eseménytípus, próbán kívüli index, nem véges idő, túl sok esemény vagy ellentmondó ismételt válasz elutasított.
- A kliens nem küld elfogadott pontszámot. A szerver a kanonikus motort és aktív felidézésnél a külön őrzött tanári válaszkulcsot használja. A tanulói attempt- és assignment-API nem adja vissza a kulcsot.
- Üres válasz és duplikált kattintás nem termel pontot. Felismerésnél a „minden régi” kézi negatív kontroll 50%-ot és 0% újkép-pontosságot adott. A no-go kattintási negatív kontroll 42%-ot és 0% visszatartást adott.
- A meglévő nullable `results.metrics` tárolást használjuk. A `005_cognitive_assessments.sql` az opcionális egész életkort, a privát assignment/attempt beállítást és a szerveres elérhetőségi időt adja hozzá; a `006_delay_checkpoint.sql` a szerveren ellenőrzött kép–hely checkpoint idejét és hashét őrzi.
- Nincs személyes percentilis, közös „memóriaindex”, IQ, agyéletkor, hippocampus-százalék vagy diagnosztikus állítás.

## Kvantitatív kutatási eredmény

A gépi forrásfájl **9 elsődleges rekordot és 129 ellenőrzött számpontot** őriz. Minden pont tartalmaz `sourceId` és pontos táblázat-/oldal-locatort; a felület csak `data-reuse` státusznál másolja be a számszerű táblát. A legfontosabb ténylegesen elérhető minták:

- eCorsi: `n=107`, 18–30 és 50 év feletti csoport, előre/vissza átlag és SD;
- auditív digit span: Woods `n=763`, 18–65 év; koreai WAIS-R `n=784`, 60–90 év, nem/iskolázottság szerinti M, SD, medián és P5; PEBL `n=148`, 18–22 év;
- Operation Span: `n=153`, 18–95 év, három korcsoport M/SD;
- CPAL páros asszociáció: `n=125`, 5–10 év, terhelés és kor szerint M/SD/tartomány;
- gyermek N-back: `n=3722`, 7–13 év, nem és N szerint átlag/SD, valamint közölt percentilisek;
- MemTrax: `n=18 265`, 21–100 év, regressziós kor/nem referenciaértékek;
- CANTAB PAL és Cogstate N-back: 12–13 éves csoportadatok, jogvédett/transzformált skálaként, csak hivatkozva.

Ezek valódi kutatási csoporteredmények, de egyik protokoll sem egyezik eléggé a rövid magyar Hanna-feladattal ahhoz, hogy személyes percentilist számoljunk. A különbség minden rekordnál konkrétan rögzített: eszköz, nyelv, inger, stopping, scoring, minta vagy licenc. A Kessels-, Pagulayan- és Orsini-vezetéseket külön ellenőriztük; nem olvastunk le számot ábrából, és nem vettünk át nem ellenőrizhető vagy újraközlésre nem jogosult normatáblát.

## Automatikus ellenőrzés

- `npm test`: **153/153 PASS** a `791ed24` jelölten.
- `npm run check`: **PASS**, 18 játszható modul, 73 publikus fájl, szintaxis és helyi assetek.
- A célzott tesztek ismert helyes/hibás/üres/ismételt sorozatokat, határidőket, késleltetést, szerveres privát pontozást, idempotenciát, profilcsoportosítást, forráspontokat és mind a tíz dekódolt WAV-fájlt ellenőrzik.

## Valódi helyi böngészős UAT

Saját izolált PGlite QA-iskolával, saját teszttanár- és tesztdiák-fiókkal történt; valódi tanulói adatot nem érintett.

| Útvonal | Eredmény |
|---|---|
| Memóriapróbák hub és forrásfiók | Mind a hét paradigma, aktív felidézés, kutatási számpontok, magyar módszertani korlátok és a hálózati disclaimer látható. |
| Térbeli gyakorlás és rögzített próba | Előre/vissza leállási szabály, üres válasz, mentés; szünet/újrakezdés után mindkét minőségjelzés megjelent. |
| Hallási számsor | A hangpróba és négy helyi, felvett sorozat hallható volt; hálózati TTS nem futott. |
| Kép–hely | Két tanulási kör, tanulási és azonnali válaszok, a teljes 60 másodperces szerveres közjáték, majd késleltetett válaszok és sikeres mentés. |
| Komplex span | Felidézés és köztes döntés külön metrikával mentődött. |
| Felismerés | A mindenre „régi” negatív kontroll nem kapott teljes pontot. |
| Jelőr | A kattintási negatív kontroll nem kapott teljes pontot; go és visszatartás külön látszott. |
| Aktív felidézés | Tanári készítő → saját tesztdiák 1/1 → „Később nyílik” → későbbi 1/1 → tanári 2/2 progress és tényleges válaszrészlet. Az egyórás falióra-várást az izolált QA-adatbázis eredményidejének kétórás visszaállításával gyorsítottuk; a szerveres zárt állapotot előtte külön láttuk. |
| Profil | A rögzített térösvény külön mérési kártya, a gyakorlások külön szakasz, azonos protokollú pontok együtt, minőségjelzéses kör szöveges magyarázattal. |
| Mobil | 390×844 méreten hub és setup látható, setup `scrollWidth === innerWidth === 390`. |
| Függő mentés helyreállítása | Egy korábban elutasított képes beküldés újratöltés után „mentésre vár” állapotban megmaradt és újrapróbálható volt. |

A review-javítás után a checkpointot külön is újraellenőriztük: teljes tanulási+azonnali szakasz után `60 mp` jelent meg; a közjáték alatti újrakezdés és egy második teljes azonnali szakasz után ismét friss `60 mp` indult. A tiszta és a szünet+helyreállítás jelzéses térbeli gyakorlás két külön singleton profilkártyán jelent meg, így köztük nem rajzolódik trendvonal.

A CUA tabváltása nem állította a dokumentumot `hidden` állapotba, ezért a háttérszünetet nem jelöljük kézzel átmentnek. A láthatóságkezelés kódolt, és az N-back meglévő tesztje igazolja a blur-szünetet; az új kognitív útvonal valós háttér-UAT-ja **ellenőrizetlen korlát** marad.

## Független review és kiadás

- Grok 4.6 medium első, teljes diff review (`55cf87a`): **BLOCKED**. Öt elérhető hibát talált: minőségjelzős profilpontok összekötése, modulo-időből képzett reakcióidő, azonnali felidézéshez nem kötött késleltetési kapu, kézi szünet láthatósági feloldása, valamint kognitív beállítás átadása a kezdőlapi legacy folytatásnak.
- Javítás `791ed24`: a jelzős pontok egyedi sorozata; valódi monotón reakcióidő; teljes azonnali nyers választ, rögzített bemutatási időt, checkpoint-időt és -hash-t ellenőrző szerverkapu; újrakezdéskor új 60 másodperc; kézi szünet megőrzése; utolsó legacy eredmény szerinti folytatás. Célzott 30/30 és teljes 153/153 PASS.
- Grok 4.6 medium fix-scoped exact-snapshot review (`791ed24`): **PASS**, mind az öt finding lezárva, új blokkoló nélkül.
- Friss production Postgres dump: **PASS**. SHA-256 `ddbf746dcbca6c2b41af5bd57a72d6119a77a87e2d478162ef46646869714b24`, 34 285 bájt; eldobható adatbázisba visszaállt, az eredeti 4 felhasználó, 5 eredmény, 1 feladatsor, 7 attempt és 4 migráció olvasható volt; az ideiglenes adatbázis törölve.
- Railway production deployment: **SUCCESS**, azonosító `c9514bdf-4147-4429-9693-1630b860fb4f`, image digest `sha256:a3e36147d46930729e7674f1b9b0b9bbab8400adcc8f6d75e497ec936d5d0852`. A futó konténer 90/90 gitkövetett fájlja és a nyilvánosan kiszolgált 73/73 fájl bájtszinten egyezik a `d852e80` jelölttel; `/api/health` OK.

## Élő production ellenőrzés

A friss nyilvános oldalt a [production Memóriapróbák nézetben](https://memoria-web-production-a86b.up.railway.app/?release=d852e80#/memoriaprobak) újratöltöttük. A hét paradigma, a gyakorlás/rögzített próba kettéválasztása, az oktatási agyhálózati disclaimer, az aktív felidézés és a forrásfiók látható. A fiók 9 elsődleges rekordot mutat; a számszerű eCorsi, CPAL, gyermek N-back, MemTrax és PEBL adatok mellett közvetlen forrás és protokollkorlát áll.

Két új, elkülönített saját QA-fiókkal az élő szerveren végigment:

- rögzített térbeli próba 100%-os szerveres nyersválasz-pontozással, csillag nélkül és összehasonlíthatósági kulccsal;
- tanári aktív felidézés → első 2/2 válasz → korai újranyitás szerveres tiltása → csak a saját QA-sor időigazítása → friss újrabelépés → későbbi 2/2 válasz → tanári 2/2 progress és nyers válaszrészlet;
- azonos válasz ismételt beküldése ugyanazt az eredményt adta;
- kép–hely próba: korai checkpoint tiltása, teljes azonnali válasz elfogadása, változatlan checkpoint idempotenciája, korai késleltetett beküldés tiltása, majd szerveres késleltetett pontozás;
- a tanulói progress 4 kognitív, 0 legacy kört és 0 csillagot adott.

A próba után mindkét saját fiók inaktív lett, négy saját munkamenet törlődött, a hitelesítő fájl megsemmisült. A négy eredeti felhasználói rekord hashlenyomata változatlan; a négy saját QA-eredmény auditbizonyítékként megmaradt. A futó adatbázis mind a hat migrációt alkalmazta.

## Tényleges végrehajtási idő

A controller végrehajtása 2026. szeptember 11-én **09:55–11:45 CEST**, összesen **1 óra 50 perc** volt az interfészszerződéstől a production saját-fiókos ellenőrzés és takarítás lezárásáig. A kutatási, motor- és felületi sáv párhuzamosan futott; ez az idő nem becslés, hanem a verziózott végrehajtási dokumentum és a záró élő bizonyíték időbélyege közötti idő.

## Megmaradó módszertani korlátok

Az alkalmazás erős, forrásolt kísérleti protokollt és megbízható saját idősor-kezelést ad; nem állít klinikai vagy normatív validáltságot. A következő tudományos lépés külön, előre rögzített magyar pilot, majd teszt–reteszt, életkori minta és külső validálás. Jelentős instrukció-, hang-, ütem- vagy UI-változás új protokoll-/összehasonlíthatósági verziót igényel.
