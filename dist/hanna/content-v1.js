export const HANNA_ACTIVITIES = Object.freeze([
  {id:'baseline',title:'Startteszt',technique:'Kiinduló emlékezeti kép',description:'Rövid szó-, kép- és számlisták azonnali és késleltetett felidézése.',instruction:'Jegyezd meg a listákat a saját módszereddel. Előbb rögtön, majd a köztes feladat után idézd fel őket.',icon:'🧭',recallModes:['ordered'],defaultRecallMode:'ordered'},
  {id:'chain',title:'Láncsztori',technique:'Történetlánc',description:'A tárgyakat mozgalmas, túlzó történet kapcsolja össze.',instruction:'Minden szomszédos párból készíts egy élő jelenetet: történjen mozgás, túlzás és valódi kölcsönhatás.',icon:'⛓️',recallModes:['ordered','free','random','reverse'],defaultRecallMode:'ordered'},
  {id:'association',title:'Képkapcsoló',technique:'Páros asszociáció',description:'Két különböző képet egyetlen emlékezetes jelenetté kapcsol.',instruction:'Ne csak tedd egymás mellé a két dolgot: az egyik változtassa meg a másikat. A választásos kör előbb a kapcsolat felismerését gyakoroltatja; a szabad mód önálló felidézést kér.',icon:'🔗',recallModes:['choice','free'],defaultRecallMode:'choice'},
  {id:'loci',title:'Memóriaútvonal',technique:'Loci módszer',description:'Stabil útvonal helyeihez köt új elemeket.',instruction:'Előbb járd be hibátlanul az útvonalat, utána helyezd el rajta a képeket.',icon:'🗺️',recallModes:['ordered','random','reverse'],defaultRecallMode:'ordered'},
  {id:'palace',title:'Saját palota',technique:'Személyes memória-palota',description:'Saját, tartós helysort tanít be és ellenőriz.',instruction:'Nevezd meg sorban a saját helyeidet. A palota 90%-os útvonalismeret után lesz kész.',icon:'🏠',recallModes:['ordered','random','reverse'],defaultRecallMode:'ordered'},
  {id:'peg',title:'Peg Master',technique:'Szám–kép horgok',description:'Fix horgokat tanít két irányban, majd új tárgyakat kapcsol hozzájuk.',instruction:'A szám és a horgonykép legyen azonnali kapcsolat. A mintavételes betanítás termékszabálya legalább 90% pontosság; a 2 másodperc alatti medián válaszidő gyakorlási cél.',icon:'🪝',recallModes:['random','choice'],defaultRecallMode:'random'},
  {id:'faces',title:'Ki kicsoda?',technique:'Arc–név kapcsolat',description:'A nevet hangzáskulccsal, semleges arcrészlettel és történettel rögzíti.',instruction:'Keress a névhez képi hangzáskulcsot, majd kapcsold egy semleges, látható részlethez.',icon:'🙂',recallModes:['choice','free'],defaultRecallMode:'choice'},
  {id:'keyword',title:'Kulcsszóhíd',technique:'Kulcsszó módszer',description:'Az idegen hangalakot képi kulcsszóval köti a jelentéshez.',instruction:'Hallj ki egy magyar képet a szóból, majd a kép cselekedjen a jelentéssel.',icon:'🌉',recallModes:['choice','free','random'],defaultRecallMode:'choice'},
  {id:'major',title:'Számkód',technique:'Magyar Major-hangkód',description:'A számjegyekhez magyar beszédhangokat rendel, majd kétjegyű képeket épít.',instruction:'A kód hangokra épül. A magánhangzók csak kitöltik a szót, nem kapnak számértéket.',icon:'🔢',recallModes:['choice','random'],defaultRecallMode:'choice'},
  {id:'numbers',title:'Számszörny',technique:'Kétjegyű képlánc',description:'Hosszú, generált számsort kétjegyű képekre bont.',instruction:'Bontsd a számsort párokra, alakítsd minden párt képpé, majd fűzd őket történetté.',icon:'🐉',recallModes:['free','verbatim'],defaultRecallMode:'verbatim'},
  {id:'random',title:'Random Recall',technique:'Rugalmas hozzáférés',description:'Sorszámot, szomszédot és kategóriát kérdez biztonságos határokkal.',instruction:'Ne csak elejétől mondd fel a listát: ugorj közvetlenül a kért helyre vagy kapcsolatra.',icon:'🎲',recallModes:['random'],defaultRecallMode:'random'},
  {id:'text',title:'Szövegépítő',technique:'Aktív szövegfelidézés',description:'Kulcsgondolatokat vagy szó szerinti szöveget idéztet fel átlátható rubrikával.',instruction:'Olvasás után csukd be a szöveget, és saját szavaiddal építsd újra a gondolatmenetet.',icon:'📝',recallModes:['meaning','verbatim'],defaultRecallMode:'meaning'},
  {id:'concept',title:'Fogalomból kép',technique:'Vizuális fogalomkód',description:'Absztrakt fogalmat saját szimbólummal és definícióval kapcsol össze.',instruction:'Válassz olyan képet, amely a fogalom lényegi kapcsolatát mutatja, nem csak díszíti a szót.',icon:'💡',recallModes:['free','choice','ordered'],defaultRecallMode:'free'},
  {id:'review',title:'Későbbi visszahívás',technique:'Időzített aktív felidézés',description:'Csak valóban esedékes, korábban eltárolt pillanatképeket kérdez vissza.',instruction:'Idézd fel a választ segítség nélkül. A következő időpont a pontosságtól, időtől és segítségtől függ.',icon:'🕰️',recallModes:['free'],defaultRecallMode:'free'},
  {id:'boss',title:'Boss Fight',technique:'Tudatos stratégiaválasztás',description:'Neveket, listát, számot és fogalmat vegyít; minden részhez te választasz technikát.',instruction:'Minden rész előtt nevezd meg a választott technikát, majd használd következetesen.',icon:'🏆',recallModes:['random'],defaultRecallMode:'random'},
]);

export const HANNA_OBJECTS = Object.freeze([
  ['alma','alma','🍎','étel'],['auto','autó','🚗','jármű'],['csillag','csillag','⭐','égbolt'],['cica','cica','🐱','állat'],
  ['virag','virág','🌸','növény'],['lufi','lufi','🎈','játék'],['kulcs','kulcs','🔑','tárgy'],['lohere','lóhere','🍀','növény'],
  ['pillango','pillangó','🦋','állat'],['hold','hold','🌙','égbolt'],['kalap','kalap','🎩','ruha'],['teknos','teknős','🐢','állat'],
  ['eper','eper','🍓','étel'],['labda','labda','⚽','játék'],['raketa','rakéta','🚀','jármű'],['napraforgo','napraforgó','🌻','növény'],
  ['banan','banán','🍌','étel'],['bicikli','bicikli','🚲','jármű'],['ceruza','ceruza','✏️','tárgy'],['dob','dob','🥁','hangszer'],
  ['ecset','ecset','🖌️','tárgy'],['fenyo','fenyő','🌲','növény'],['gomba','gomba','🍄','növény'],['hajo','hajó','⛵','jármű'],
  ['inga','inga','🕰️','tárgy'],['kancso','kancsó','🏺','tárgy'],['maci','maci','🧸','játék'],['ora','óra','⌚','tárgy'],
  ['pohar','pohár','🥛','tárgy'],['robot','robot','🤖','játék'],['sajt','sajt','🧀','étel'],['tojas','tojás','🥚','étel'],
  ['paradicsom','paradicsom','🍅','étel'],['repa','sárgarépa','🥕','étel'],['szolo','szőlő','🍇','étel'],['citrom','citrom','🍋','étel'],
  ['hal','hal','🐟','állat'],['meh','méh','🐝','állat'],['bagoly','bagoly','🦉','állat'],['kutya','kutya','🐕','állat'],
  ['vonat','vonat','🚂','jármű'],['repulo','repülő','✈️','jármű'],['busz','busz','🚌','jármű'],['roller','roller','🛴','jármű'],
  ['kamera','kamera','📷','tárgy'],['telefon','telefon','📱','tárgy'],['konyv','könyv','📘','tárgy'],['ernyo','ernyő','☂️','tárgy'],
  ['korona','korona','👑','tárgy'],['harang','harang','🔔','tárgy'],['gyertya','gyertya','🕯️','tárgy'],['zongora','zongora','🎹','hangszer'],
  ['ananasz','ananász','🍍','étel'],['avokado','avokádó','🥑','étel'],['barack','barack','🍑','étel'],['cseresznye','cseresznye','🍒','étel'],
  ['dinnye','dinnye','🍉','étel'],['fank','fánk','🍩','étel'],['hamburger','hamburger','🍔','étel'],['kenyer','kenyér','🍞','étel'],
  ['korte','körte','🍐','étel'],['kukorica','kukorica','🌽','étel'],['narancs','narancs','🍊','étel'],['pizza','pizza','🍕','étel'],
  ['suti','süti','🍪','étel'],['torta','torta','🎂','étel'],['fagyi','fagyi','🍦','étel'],['beka','béka','🐸','állat'],
  ['delfin','delfin','🐬','állat'],['elefant','elefánt','🐘','állat'],['kacsa','kacsa','🦆','állat'],['krokodil','krokodil','🐊','állat'],
  ['lo','ló','🐎','állat'],['majom','majom','🐒','állat'],['nyul','nyúl','🐇','állat'],['oroszlan','oroszlán','🦁','állat'],
  ['pingvin','pingvin','🐧','állat'],['roka','róka','🦊','állat'],['sun','sün','🦔','állat'],['tigris','tigris','🐅','állat'],
  ['zebra','zebra','🦓','állat'],['zsiraf','zsiráf','🦒','állat'],['mento','mentőautó','🚑','jármű'],['helikopter','helikopter','🚁','jármű'],
  ['motor','motor','🏍️','jármű'],['taxi','taxi','🚕','jármű'],['traktor','traktor','🚜','jármű'],['teherauto','teherautó','🚚','jármű'],
  ['villamos','villamos','🚋','jármű'],['gitar','gitár','🎸','hangszer'],['hegedu','hegedű','🎻','hangszer'],['trombita','trombita','🎺','hangszer'],
  ['szaxofon','szaxofon','🎷','hangszer'],['ollo','olló','✂️','tárgy'],['szemuveg','szemüveg','👓','tárgy'],['taska','táska','🎒','tárgy'],
  ['terkep','térkép','🗺️','tárgy'],['iranytu','iránytű','🧭','tárgy'],['nagyito','nagyító','🔍','tárgy'],['lampa','lámpa','🔦','tárgy'],
  ['sepru','seprű','🧹','tárgy'],['vodor','vödör','🪣','tárgy'],['kalapacs','kalapács','🔨','tárgy'],['csavarhuzo','csavarhúzó','🪛','tárgy'],
  ['fogkefe','fogkefe','🪥','tárgy'],['szappan','szappan','🧼','tárgy'],['dobokocka','dobókocka','🎲','játék'],['kirako','kirakó','🧩','játék'],
  ['papirsarkany','papírsárkány','🪁','játék'],['jojo','jojó','🪀','játék'],['fa','fa','🌳','növény'],['kaktusz','kaktusz','🌵','növény'],
  ['level','levél','🍃','növény'],['tulipan','tulipán','🌷','növény'],['rozsa','rózsa','🌹','növény'],['cipo','cipő','👟','ruha'],
  ['zokni','zokni','🧦','ruha'],['kesztyu','kesztyű','🧤','ruha'],['sal','sál','🧣','ruha'],['kabat','kabát','🧥','ruha'],
].map(([id,label,image,category])=>Object.freeze({id,label,image,category})));

export const HANNA_ROUTE = Object.freeze([
  ['ajto','bejárati ajtó','Itt lépsz be.'],['fogas','előszobai fogas','Bal kéz felől áll.'],['tukor','nagy tükör','A fogassal szemben van.'],
  ['kanape','kanapé','A nappali közepén áll.'],['ablak','ablakpárkány','A kanapé mögött fut.'],['asztal','étkezőasztal','Az ablak mellett áll.'],
  ['hutogep','hűtőszekrény','A konyha bal sarkában van.'],['mosogato','mosogató','A hűtő mellett találod.'],['konyvespolc','könyvespolc','A folyosó végén áll.'],['agy','ágy','A hálószoba közepén van.'],
  ['ejjeliszekreny','éjjeliszekrény','Az ágy jobb oldalán áll.'],['gardrob','gardrób','A háló ajtajával szemben van.'],['furdoszobaajto','fürdőszoba ajtaja','A gardrób után következik.'],['mosdo','mosdókagyló','Belépéskor balra van.'],
  ['zuhany','zuhanyfülke','A mosdó mellett áll.'],['lepcso','lépcsőforduló','A folyosóról felfelé vezet.'],['korlat','lépcsőkorlát','A forduló külső oldalán fut.'],['emeletablak','emeleti ablak','A lépcső tetején világít.'],
  ['dolgozoasztal','dolgozóasztal','Az emeleti szoba közepén áll.'],['forgoszek','forgószék','Az asztal előtt van.'],['monitor','monitor','Az asztal hátulján áll.'],['nyomtato','nyomtató','Az asztal jobb szélén van.'],
  ['erkelyajto','erkélyajtó','A dolgozószoba végében nyílik.'],['erkelykorlat','erkélykorlát','Az ajtón túl húzódik.'],['viraglada','virágláda','A korlát belső oldalán áll.'],['kerti_lepcso','kerti lépcső','Az erkély mellől lefelé vezet.'],
  ['pad','kerti pad','A lépcső alján balra áll.'],['almafa','almafa','A pad mögött nő.'],['kerti_to','kerti tó','Az almafa mellett csillog.'],['kapu','kerti kapu','A tó után zárja az útvonalat.'],
].map(([id,label,description])=>Object.freeze({id,label,description})));

const HANNA_PEG_CORE = Object.freeze([
  ['gyertya','🕯️'],['hattyú','🦢'],['háromágú villa','🔱'],['szék','🪑'],['kéz','✋'],['elefántormány','🐘'],['kasza','🌾'],['hóember','☃️'],['lufi zsinórral','🎈'],['tízujjas kéz','🙌'],
  ['kapufa','🥅'],['két hattyú','🦢'],['zászlórúd','🚩'],['vitorlás','⛵'],['kampó','🪝'],['csiga','🐌'],['lámpaoszlop','💡'],['szemüveg','👓'],['golfütő','🏌️'],['céltábla','🎯'],
].map(([label,image],index)=>Object.freeze({number:index+1,label,image})));
const HANNA_PEG_CORE_LABELS = new Set(HANNA_PEG_CORE.map((entry)=>entry.label));
export const HANNA_PEGS = Object.freeze([
  ...HANNA_PEG_CORE,
  ...HANNA_OBJECTS.filter((entry)=>!HANNA_PEG_CORE_LABELS.has(entry.label)).slice(0,80).map((entry,index)=>Object.freeze({number:index+21,label:entry.label,image:entry.image})),
]);

// Magyar hangalapú Major-változat. A többjegyű betűk egyetlen beszédhangot jelölnek.
// 0=sz/z, 1=t/d, 2=n/ny, 3=m, 4=r, 5=l, 6=s/zs/cs/dzs, 7=k/g, 8=f/v, 9=p/b.
// A magánhangzók, valamint a h és j hang nem kapnak számértéket; kötőhangként használhatók.
export const HU_MAJOR_DIGITS = Object.freeze([
  {digit:'0',sounds:['sz','z'],example:'zoo',explanation:'sz vagy z hang'},
  {digit:'1',sounds:['t','d'],example:'tea',explanation:'t vagy d hang'},
  {digit:'2',sounds:['n','ny'],example:'nő',explanation:'n vagy ny hang'},
  {digit:'3',sounds:['m'],example:'méh',explanation:'m hang'},
  {digit:'4',sounds:['r'],example:'őr',explanation:'r hang'},
  {digit:'5',sounds:['l'],example:'ló',explanation:'l hang'},
  {digit:'6',sounds:['s','zs','cs','dzs'],example:'só',explanation:'s, zs, cs vagy dzs hang'},
  {digit:'7',sounds:['k','g'],example:'kő',explanation:'k vagy g hang'},
  {digit:'8',sounds:['f','v'],example:'fa',explanation:'f vagy v hang'},
  {digit:'9',sounds:['p','b'],example:'pó',explanation:'p vagy b hang'},
]);

export const HU_MAJOR_WORDS = Object.freeze([
  ['00','szósz'],['01','szita'],['02','zóna'],['03','szem'],['04','szár'],['05','szél'],['06','szusi'],['07','szék'],['08','szív'],['09','szép'],
  ['10','tűz'],['11','tető'],['12','dinnye'],['13','dóm'],['14','daru'],['15','tál'],['16','dús'],['17','tok'],['18','teve'],['19','dob'],
  ['20','nász'],['21','nád'],['22','néni'],['23','néma'],['24','Néró'],['25','nyíl'],['26','Ancsa'],['27','nyak'],['28','naiv'],['29','nap'],
  ['30','máz'],['31','Máté'],['32','menü'],['33','mama'],['34','mérő'],['35','málé'],['36','mise'],['37','mák'],['38','maffia'],['39','mop'],
  ['40','rész'],['41','rúd'],['42','róna'],['43','róma'],['44','Róri'],['45','roló'],['46','rács'],['47','róka'],['48','rév'],['49','rab'],
  ['50','Liza'],['51','láda'],['52','lény'],['53','láma'],['54','lóri'],['55','Lili'],['56','lecsó'],['57','lék'],['58','láva'],['59','liba'],
  ['60','csésze'],['61','sütő'],['62','sín'],['63','séma'],['64','sör'],['65','sál'],['66','sás'],['67','sakk'],['68','séf'],['69','síp'],
  ['70','gáz'],['71','kád'],['72','gúnya'],['73','gumi'],['74','kör'],['75','gála'],['76','kés'],['77','kakaó'],['78','kávé'],['79','gép'],
  ['80','váz'],['81','fedő'],['82','fény'],['83','fém'],['84','vár'],['85','fólia'],['86','vas'],['87','vak'],['88','vívó'],['89','vébé'],
  ['90','busz'],['91','bot'],['92','bánya'],['93','puma'],['94','pár'],['95','póló'],['96','pasa'],['97','béka'],['98','páva'],['99','baba'],
].map(([code,label])=>Object.freeze({code,label})));

export const HANNA_FACES = Object.freeze([
  ['Anna','ananász','egyenes fekete haj','Az ananász koronája Anna egyenes fekete haját fésüli.'],['Bence','bögre','göndör haj és szakáll','Bence bögréjéből a gőz göndör szakállt rajzol.'],
  ['Éva','ébresztőóra','turkiz szemüveg','Éva ébresztőórája megcsörren a turkiz szemüveg mögött.'],['Dávid','dárda','rövid fekete haj','Dávid dárdája fésűként rendezi a rövid fekete hajat.'],
  ['Ferenc','fagyi','ősz bajusz','Ferenc ősz bajuszára óriási fagyi olvad.'],['Kata','katica','fonott haj és arany fülbevaló','A katica Kata arany fülbevalóján hintázik a fonat mellett.'],
  ['László','lámpa','fekete kocka szemüveg','A lámpa négyszögű fényt vet László fekete szemüvegére.'],['Hanna','harang','vörös göndör haj és szeplők','A harang szeplőket pattogtat Hanna vörös fürtjei közé.'],
  ['Ilona','inga','ősz göndör haj és fülbevaló','Az inga Ilona fülbevalóján leng az ősz fürtök mellett.'],['Gábor','gally','szőke haj és körszakáll','A gally körberajzolja Gábor szőke körszakállát.'],
  ['Judit','juh','rövid fekete haj és kerek szemüveg','A juh két kerek gyapjúkarikát tesz Judit szemüvegére.'],['Miklós','mikrofon','ősz haj és kardigán','A mikrofon Miklós kardigánjának zsebéből nő ki.'],
].map(([label,keyword,fact,story],portraitIndex)=>Object.freeze({id:`face-${portraitIndex}`,label,keyword,fact,story,portraitIndex,image:'./assets/portraits.png'})));

export const HANNA_KEYWORDS = Object.freeze([
  {id:'bridge',label:'bridge',meaning:'híd',keyword:'bricska',story:'Egy bricska átszáguld a hídon.'},
  {id:'cloud',label:'cloud',meaning:'felhő',keyword:'Klaudia',story:'Klaudia felhőt fúj a tenyeréből.'},
  {id:'forest',label:'forest',meaning:'erdő',keyword:'forró üst',story:'Egy forró üst gőze beteríti az erdőt.'},
  {id:'window',label:'window',meaning:'ablak',keyword:'vén dió',story:'Egy vén dió betöri az ablakot.'},
  {id:'garden',label:'garden',meaning:'kert',keyword:'gárda',story:'Egy gárda virágot ültet a kertben.'},
  {id:'river',label:'river',meaning:'folyó',keyword:'révész',story:'A révész végigevez a folyón.'},
  {id:'chair',label:'chair',meaning:'szék',keyword:'cser',story:'Egy cserfa ráül a székre.'},
  {id:'stone',label:'stone',meaning:'kő',keyword:'sztaniol',story:'Sztaniolpapír csillog a kövön.'},
]);

export const HANNA_CONCEPTS = Object.freeze([
  {id:'egyuttmukodes',label:'együttműködés',meaning:'Közös cselekvés egy megosztott célért.',image:'🤝',keyword:'két kéz együtt emel egy nehéz követ'},
  {id:'egyensuly',label:'egyensúly',meaning:'Ellentétes hatások stabil állapota.',image:'⚖️',keyword:'mérleg két azonos súllyal'},
  {id:'kovetkezmeny',label:'következmény',meaning:'Egy korábbi eseményből eredő hatás.',image:'🎯',keyword:'eldőlő dominósor vége'},
  {id:'alkalmazkodas',label:'alkalmazkodás',meaning:'Viselkedés vagy működés igazítása a körülményekhez.',image:'🦎',keyword:'kaméleon színt vált'},
  {id:'rendszer',label:'rendszer',meaning:'Egymással kapcsolatban működő részek együttese.',image:'⚙️',keyword:'egymást forgató fogaskerekek'},
  {id:'felelosseg',label:'felelősség',meaning:'Saját döntésünk és annak hatásai vállalása.',image:'🧭',keyword:'iránytűt tartó kéz'},
  {id:'kolcsonhatas',label:'kölcsönhatás',meaning:'Két dolog egymás állapotát is megváltoztató kapcsolata.',image:'↔️',keyword:'két egymást meglökő golyó'},
  {id:'kovetkezetesseg',label:'következetesség',meaning:'Egy elv vagy szabály tartós, kiszámítható alkalmazása.',image:'🛤️',keyword:'azonos nyomot követő lépések'},
  {id:'osszefugges',label:'összefüggés',meaning:'Két vagy több jelenség értelmezhető kapcsolata.',image:'🕸️',keyword:'csomópontokat összekötő háló'},
  {id:'prioritas',label:'fontossági sorrend',meaning:'Feladatok rendezése jelentőségük vagy sürgősségük alapján.',image:'🥇',keyword:'dobogóra rendezett feladatok'},
  {id:'valtozas',label:'változás',meaning:'Átmenet egy korábbi állapotból egy másikba.',image:'🦋',keyword:'bábból kibújó pillangó'},
  {id:'bizonyitek',label:'bizonyíték',meaning:'Olyan megfigyelés vagy adat, amely alátámaszt egy állítást.',image:'🔎',keyword:'nagyító alatt látható lábnyom'},
]);

export const HANNA_TEXTS = Object.freeze([
  {id:'vizkorforgas',title:'A víz körforgása',text:'A Nap felmelegíti a felszíni vizet. A víz párolog, majd a magasban lehűl és felhővé sűrűsödik. A csapadék visszajut a talajra és a folyókba. Innen a körforgás újraindul.',rubric:[
    {id:'heat',label:'A Nap szerepe',accepted:['a nap felmelegíti a vizet','a nap hője indítja a párolgást','nap melegíti a felszíni vizet']},
    {id:'cloud',label:'Felhőképződés',accepted:['a pára lehűl és felhővé sűrűsödik','lehűlés után felhő lesz','a vízpára felhővé sűrűsödik']},
    {id:'return',label:'Visszajutás',accepted:['a csapadék visszajut a talajra és folyókba','esővel visszakerül a víz','a csapadék visszahullik']},
  ]},
  {id:'mehek-tanca',title:'A méhek tánca',text:'A felderítő méh a kaptárban tánccal jelzi a táplálék helyét. A tánc iránya a virágok irányát mutatja a Naphoz képest. A mozgás hossza a távolságról ad információt. A többi méh így együtt találhatja meg a nektárforrást.',rubric:[
    {id:'direction',label:'Az irány jelzése',accepted:['a tánc iránya mutatja a virágok irányát','a naphoz képest jelzi az irányt','a mozgás irányt mutat']},
    {id:'distance',label:'A távolság jelzése',accepted:['a tánc hossza jelzi a távolságot','a mozgás hosszából tudják a távolságot','a hossz a távolságról ad információt']},
    {id:'sharing',label:'Az információ megosztása',accepted:['a felderítő méh megmutatja a többieknek a táplálék helyét','a méhek a táncból találják meg a nektárt','a tánc táplálékhoz vezeti a méheket']},
  ]},
  {id:'csirazas',title:'A mag csírázása',text:'A mag vizet vesz fel, ezért a belsejében megindulnak az életfolyamatok. Először a gyökér bújik elő, és lefelé növekedve vizet vesz fel. Ezután a hajtás a fény felé indul. A fiatal növény később a leveleivel készít tápanyagot.',rubric:[
    {id:'water',label:'A víz szerepe',accepted:['a mag vizet vesz fel és megindul a csírázás','a víz indítja el az életfolyamatokat','víz hatására kezd csírázni a mag']},
    {id:'root',label:'A gyökér indulása',accepted:['először a gyökér bújik elő','a gyökér lefelé nő és vizet vesz fel','elsőként a gyökér jelenik meg']},
    {id:'shoot',label:'A hajtás és a levelek',accepted:['a hajtás a fény felé nő','a levelek később tápanyagot készítenek','a hajtás után a levelek táplálják a növényt']},
  ]},
  {id:'arnyek',title:'Hogyan keletkezik az árnyék?',text:'A fény egyenes vonalban terjed a fényforrástól. Ha egy nem átlátszó tárgy kerül az útjába, mögötte kevesebb fény jut a felületre. Ezt a sötétebb területet árnyéknak nevezzük. Az árnyék mérete a fényforrás, a tárgy és a felület távolságától is függ.',rubric:[
    {id:'travel',label:'A fény terjedése',accepted:['a fény egyenes vonalban terjed','a fény a forrástól egyenesen halad','egyenes úton terjed a fény']},
    {id:'blocking',label:'A tárgy szerepe',accepted:['a nem átlátszó tárgy elzárja a fényt','a tárgy mögé kevesebb fény jut','a tárgy útját állja a fénynek']},
    {id:'size',label:'Az árnyék mérete',accepted:['az árnyék mérete a távolságoktól függ','a fényforrás tárgy és felület távolsága változtatja a méretet','a távolság határozza meg az árnyék méretét']},
  ]},
]);
