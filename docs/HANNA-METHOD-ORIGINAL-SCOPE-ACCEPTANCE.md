# Hanna eredeti kérése — teljesítési és elfogadási mátrix

Újranyitás: **2026-09-11 15:40:36 UTC**. Eredeti forrás: Hanna felhasználó által teljes egészében bemásolt 15 játékos koncepciója; kiegészítő konkrét ellenőrzési orákulum a root2026-09-11auditja. Az alábbi valamennyi sor kötelező. A V1 delivery történeti tesztállításai nem bizonyítják e mély folyamatokat. A korábbi „nem maradt kötelező funkcióhiány” állítás **helyesbítendő**: a V1 számottevő alapot adott, az eredeti koncepcióhoz képest részleges.

Állapotok: nyitott → implementált (még nem kész) → saját ellenőrzéssel igazolt → kiadáson igazolt. Minden tényleges bizonyíték konkrét fájl/teszt/UIeredmény, nem agent önminősítés.

| ID | Eredeti követelmény és hiányt lezáró viselkedés | Kötelező konkrét bizonyíték | Aktuális |
|---|---|---|---|
|H01|Startteszt: szó/kép/szám, azonnali és késleltetett, saját típusazonos bázis; szóbank nélküli válasz|Üres/idegen/helyes részpont; mind6blokkUI; szervermentés|V1alap megőrzése, újraellenőrzendő|
|H02|Láncsztori5–30+: páronként saját sztori, konkrét példák mozgás/túlzás/abszurditás/érzékszerv/interakció; ugyanaz a lánc rendezés→szabadfelidézés→haladó randomelőtte/utána; konkrét/kevésbékapcsolható/absztrakt/fogalom+definíció/sajátanyag|Egykör3recallblokk ugyanazonID-k; előtte/utána határ; hibásszomszédpár megfigyelés;5és30+UI|Nyitott|
|H03|Képkapcsoló30–60s többpáros gyors kör; saját ötlet és/vagy4szemantikailag helyes ILLUSZTRÁLT alternatíva, interakció/fúzió vs szomszédosság magyarázata; kreativitás nem kamu pont|Valós többpár időn belül,4képesalternatíva, oktatóiválasztás vs későbbi emlékezés külön|Nyitott|
|H04|Memóriaútvonal felismerhető prémiumvirtuálisszoba/terek5–30fixhellyel; vezetett bejárás és sorszám/előtte/utána betanítás→stabiltudás→tárgyhozzákötés→állomásonként előre/hátra/randomfelidézés; működő helygomb és hely-ID|Szobakép és aktívhelygeometry, ténylegeskattintás;3járás;30helyszakaszolva|Nyitott|
|H05|Sajátpalota CRUD/sorrend/leírás/opciósfotó/revision;90%készültség az EREDETI Hanna-küszöb;hely+előtte/utána; ugyanabban a vezetett játékban használható|Mentés/relogin/revisioninvalidálás/photo;readinessellenpélda; saját5helyesjáték|Részleges|
|H06|Peg1–10/20/100sajátlista;number↔pegautomatizálás,2secsebességcél;lefödött és elsajátított horgok külön;randomprompt csak szám,pegcsakhint;hozzákapcsolás;accesslatency|100egyedikészlet teljeslefedettség nyilvántartás;20minta nem100mastery;szám-onlyrecallUI;2irány|Nyitott|
|H07|Legalább20elkülöníthető saját/engedettmesterségesportré; rövidarcnév→hangzáskulcs→semlegesarcvonás→sajátsztori;haladó személyesfact és név/factfelidézés; újseedújkötés|20portréassetellenőrzés; 20név+factterv; mindkétrecallUI; ismétléssnapshotazonos|Nyitott|
|H08|Kulcsszóhíd idegenszó→magyarkulcs→jelentés→interakció;mindkétirány;noun/verb/adjective/abstract+ sajátanyag;nemtökéletesfonetikaiígéret|Szintenként eltérőtartalom,2irány UI, szerkesztettanyag|Részleges|
|H09|Major következetesmagyarhangkód; kisbelépő;szám↔hang→kétszámjegy→szó→kép;95%/<1.5sec Hannaeredetiküszöb;saját00–99|Ismertszámkód/hibás/hiányzó; teljeskapu;szótármentés+képioktatás;önállórecall|Részleges|
|H10|Számszörny8kezdő,16/20/30haladó;sajátszámképek és történettámogatás;késleltetettvisszaírás;digitpartial/digitsperminute|8és30UI;egyjegyhiba/rövid/üres;szótársnapshot|Nyitott|
|H11|RandomRecall közösréteg a lánc/palota/peg éppen megtanult anyagán;n-edik,előtte/utána,3.és7.,kategória,határindex;önálló vsMC;accesslatency|Forrásresultazonosság+sajátencoding; határteszt; előzőkörbőlUI; másuserIDtiltva|Nyitott|
|H12|Szövegépítő3–5mondat→felidézés→hiányzógondolatfeedback→újrafelidézés;küszöbösrubrika/elfogadottparafrázis/ellentmondás;bizonytalanönellenőrzés nemautomataigaz;verbatimwordszekvenciaalignment|Helyesparafrázis/tagadóellenpélda/egy kihagyottszó nemkaszkád;2recallkülönmetrika;UI|Nyitott|
|H13|Fogalombólkép valódi2secmentáliskép (nem2secgépelés)→sajátkép→definíció→haladófogalomlánc; korrektjelentésértékelés|2secfázis majd korlátlanbevitel; jelentésparafrázis/bizonytalanság;conceptchain|Nyitott|
|H14|Spaced mindenújcsaládvalódikorábbianyaga+sajátasszociáció;10min/óra/nap/3nap/hét gyorshelyes/lassúhelyes/hibásadaptáció;tulajdonos/esedékes/idempotens|Szervertimefixture és valósidejűrövidismétlés különjelölve;duplasave;oldownsnapshot|Részleges|
|H15|Boss vegyeslista/arcnév/szám/fogalom;részenként módszerválasztás TÉNYLEG megváltoztatja az alkalmazható támogatást sajátpalotával/peggel;technikaiönállóság|Kétkülönstratégia különencodingUI; valódierőforrás;részenkéntscore|Nyitott|
|C01|Ötlépéses közösmotor,nyersserverértékelés,multiphase,immutablecontent+encoding+anchor;oldV1pending/resultsmegőrzése|FagyasztottV1plan/resultfixture;V2gate/response/prefix/idempotencetests|Nyitott|
|C02|3hint:sajáthely/horog→sajátkapcsolat→vizuáliskapaszkodó→különshowanswer;assisted/time/omissionkülön|Mindháromláthatóhatás,showanswernemindependent;serverrawscore|Nyitott|
|C03|Többparaméteresnehézség:count/encoding/delay/similarity/abstractness/recall/order/random/interference/retention;expert5mindelay;adaptációtöbbmintcount|Mindenállíthatóténylegeshatású;beginner/expertterv;adaptellenpéldák|Nyitott|
|C04|Napi10–15min:association→választott/rotálóchain/loci/peg→AZONOSANYAGrandom→valósdueold→boss|Napirotáció/napváltás/mentettteljesítés;üresdueőszinte;sourceIDazonos|Nyitott|
|C05|Prémiumátláthatósajátprofil10dimenzió:encoding/immediate/delayed/order/random/name/number/association/longterm/independence;egység/bázis/hiányegyértelmű;valósachievement|Sajátmentetteredménybőlábra;nullnem0;egységkeverésnincs;24h/7djelvényszerveridő|Nyitott|
|C06|SzépmodernpedagógiaiUI:lila/lime/krém,vizuáliskártya,ajánlottindulás,minőségiszoba/portré/jelenet,bigtartalomkompaktchrome,eszköz/profilkülönértékesnézet|Aktuálisdesktop390képernyőképek önállódesignkritikával;olvasmányos/azonosítható;nempiciemoji/nagyüreslap|Nyitott|
|C07|Scrollnélkül egyidejűanyag;hosszúlista szándékosszakaszolás;stabilfázis;mobilkontroll;nav/hang/régijátékőrzés|Geometry mindenújképernyő;pause/background/restart;régi regresszió;audioassetazonosság|Nyitott|
|C08|Tanárkiosztás→tanuló→nyersserverpont→mentés→relogin→tanárprofil;duplamentésnincs;privátadat|SajátQA böngésző és élesSQL;őrzött régiadatfingerprint;sourceassetazonosság|Nyitott|
|C09|FüggetlenOpus5medium originalscope+diffreview,fixreview;kiadásbackuprestoreés15családmélyUAT|TénylegesmodelUsagefirstParty,findingsreprodukció; véglegesnpmtest/check;Railwayreleaseproof|Nyitott|

## Pontos attribúció és határ

Hanna eredeti90%palotareadiness és95%/<1.5secMajorautomatizálás küszöbei nem saját tudományos normák. Peg2sec cél is Hanna kérése; a90%pegküszöb, konkrét adaptáció/ismétléslétra saját termékszabály. Nem igazoljuk az agyi aktivitást vagy általános memóriafejlődést a feladatpontokból. A vizuális tudományos magyarázat nem személyes agymérés. A jó oktatói példa nem nevezhető futásidejű AI-generálásnak. Későbbi AI-asszociáció/diktálás külön opcionális, a fenti alapmechanikák nem tolhatók „későbbre”.
