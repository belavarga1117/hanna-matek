# Brain Workshop 5.0 n-back referenciaspecifikáció

Ez a dokumentum a Brain Workshop 5.0 pinelt forrásának statikus vizsgálatát foglalja össze. Nem futtattuk és nem másoltuk át az idegen kódot. A saját motor tiszta JavaScript megvalósítás.

## Források és elsőbbség

- Pinelt kód: `brainworkshop.py`, commit `3476f724eb623b6e39605bd7a7e3df245787e73a`, `VERSION = '5.0'` (28. sor).
- Publikus útmutató: <https://brainworkshop.sourceforge.net/tutorial.html>.
- Publikus részletek: <https://brainworkshop.sourceforge.net/details.html>.

A tényleges 5.0 viselkedéshez a pinelt kód az elsődleges. A weboldal eltéréseit külön jelöljük.

## Alapmódok és válaszcsatornák

A módlista és a modalitáslista a `brainworkshop.py` 1149–1236. soraiban található.

| Mód | Ingerek | Önálló válaszcsatornák |
| --- | --- | --- |
| Position | pozíció | aktuális pozíció = n-back pozíció |
| Audio | hang | aktuális hang = n-back hang |
| Dual | pozíció, hang | pozíció; hang |
| Triple / Position, Color, Sound | pozíció, szín, hang | pozíció; szín; hang |
| Dual Combination | vizuális jel, hang | vizuális→n-vizuális; vizuális→n-hang; hang→n-vizuális; hang→n-hang |
| Triple Combination | pozíció, vizuális jel, hang | a négy kombinációs csatorna és pozíció |
| Quad Combination | pozíció, szín, vizuális jel, hang | a négy kombinációs csatorna, pozíció és szín |
| Tri Combination Color | szín, vizuális jel, hang | a négy kombinációs csatorna és szín |
| Arithmetic | szám, művelet | egzakt aritmetikai válasz |
| Dual Arithmetic | pozíció, szám, művelet | pozíció és aritmetika |
| Triple Arithmetic | pozíció, szín, szám, művelet | pozíció, szín és aritmetika |

A kombinációs irányok nem cserélhetők fel. A forrásban a `visaudio` az aktuális vizuális jel és a korábbi hang összevetése, az `audiovis` az aktuális hang és a korábbi vizuális jel összevetése (`brainworkshop.py` 3327–3341., 3414–3420. sor).

További forrásmódok: Position+Color, Position+Image, Color+Audio, Image+Audio, Color+Image, Position+Color+Image, Position+Image+Audio, Color+Image+Audio, Quad (Position+Color+Image+Audio), két külön hangcsatorna, valamint ezek P/C/I kombinációi egészen a Pentuple módig (`brainworkshop.py` 1160–1236. sor).

## Módmódosítók és megengedett kombinációk

- Crab minden alapmódhoz létrejön, ugyanazokkal a modalitásokkal (`brainworkshop.py` 1241–1249. sor).
- Multi-stim 2–4 csak akkor jön létre, ha van pozíciócsatorna, nincs együtt Color és Image, továbbá nincs Combination vagy Arithmetic csatorna (`brainworkshop.py` 1251–1271. sor). A Crab+Multi módok is létrejönnek.
- A Multi-stimre jogosult alapmódok: Dual; Position+Color+Audio; Position; Position+Color; Position+Image; Position+Image+Audio; Position+Audio+Audio2; Position+Color+Audio+Audio2; Position+Image+Audio+Audio2. Ugyanezek Crab változatai is jogosultak.
- Self-paced minden addig létrehozott módra ráépül (`brainworkshop.py` 1273–1279. sor).
- Variable és az interference valószínűség a módazonosítótól független globális kapcsoló a módválasztóban (`brainworkshop.py` 2226–2324. sor).
- Jaeggi mód a Dual módot kényszeríti, Variable-t kikapcsolja, és a többi mód választását letiltja (`brainworkshop.py` 839–854., 4500–4504. sor).

A forrás felületileg engedi a Variable+Crab párost, de a match-ellenőrzés mellett explicit FIXME jelzi, hogy a szemantika nincs megértve (`brainworkshop.py` 3311–3322. sor). A saját motor ezt a kombinációt konkrétan tiltja; hallgatólagos negatív tömbindexelést nem vesz át.

## Indexelés

A saját motor 0-alapú `trialIndex` értéket használ.

A Brain Workshop normál alapbeállítása `20 + n²` összes próbát készít, majd az első `n` próbát kihagyja a pontozásból (`brainworkshop.py` 454–463., 1143–1147., 3396–3398. sor). Emiatt a forrásban a pontozott próbák száma `20 + n² − n`. A saját szerződésben a `trialCount` közvetlenül a pontozott próbák száma, és a session teljes hossza mindig `n + trialCount`. Ez dokumentált termék- és adatkontraktus-eltérés.

Normál N-back esetén a célindex `trialIndex - n`. Az első `n` próba warmup, nem pontozható.

Variable N-back esetén a forrás `numTrials - n` darab, 1…n közötti értéket generál béta-eloszlásból. Az első pontozható próbán a `variableBacks[0]` használatos; általánosan `shownBack = variableBacks[trialIndex - n]`, célindex `trialIndex - shownBack` (`brainworkshop.py` 4089–4094., 4384–4387., 3397–3405. sor).

Crab esetén a tényleges távolság `1 + 2 * (trialIndex mod n)`. A pontozás továbbra is csak `trialIndex >= n` esetén indul. Így 3-back esetén az első pontozható blokkrész távolságai 1, 3, 5, majd ismétlődnek (`brainworkshop.py` 3314–3322., 3397–3404., 4254–4260. sor). Ez felel meg a blokkonként fordított összevetésnek.

## Multi-stim tárgyazonosság

Egy próbán belül a 2–4 pozíció különböző. A válaszcsatornák stabil tárgyazonossághoz tartoznak, ezért azonos pozícióhalmaz eltérő tárgycserével nem jelent tárgyankénti pozíció-match-et (`brainworkshop.py` 4203–4209., 4301–4317. sor).

Ha a forrásmódban Color vagy Image szerepel, a Multi-stim a tárgyankénti pozíciócsatornák mellé tárgyankénti vizuális tulajdonságcsatornákat hoz létre (`brainworkshop.py` 1263–1271. sor). Az azonosító lehet szín vagy kép; a másik vizuális tulajdonság változó inger (`brainworkshop.py` 4398–4416. sor).

A külön Multi-interference egy korábbi próba pozícióit vagy vizuális tulajdonságait ciklikusan más tárgyakhoz rendeli (`brainworkshop.py` 4319–4328. sor).

## Szekvenciagenerálás

Az alapértékek nyolcelemű tartományból jönnek. Multi-stimnél a pozíciók visszatevés nélkül választottak (`brainworkshop.py` 4203–4214. sor).

Minden aktív, nem aritmetikai modalitás külön véletlen döntést kap:

1. `CHANCE_OF_GUARANTEED_MATCH` alapján kényszerített valódi match, alapértéke 0,125 (`brainworkshop.py` 503–512., 4279–4286. sor).
2. Ennek hiányában interference próbálható N−1, N+1 vagy 2N távolságról, ha az érték eltér a valódi céltól (`brainworkshop.py` 513–522., 4287–4299. sor).
3. Máskülönben a véletlen alapérték marad; ezért természetes match továbbra is előfordulhat.

A generator előbb a kényszerített match-et vizsgálja, ezért a két ág nem függetlenül összeadódó esemény.

Jaeggi esetén előre generált Dual szekvencia írja felül a normál pozíciót és hangot (`brainworkshop.py` 4160–4198., 4347–4350. sor). A weboldal 4 csak-vizuális + 4 csak-auditív + 2 együttes match-et ír. A pinelt kód ezt csatornánként számolja: 6 vizuális és 6 auditív match, ezek metszete pontosan 2. A két leírás tehát ugyanazt a 4+4+2 eloszlást jelenti.

## Aritmetika

Az eredmény mindig a korábbi szám és az aktuális szám művelete: `nBackNumber operation currentNumber` (`brainworkshop.py` 3335–3353. sor).

- Műveletek: összeadás, kivonás, szorzás, osztás; külön kapcsolhatók (`brainworkshop.py` 530–535., 4218–4223. sor).
- A számok alapból 0…12 közöttiek, negatív módnál −12…12 közöttiek (`brainworkshop.py` 530–536., 4225–4229. sor).
- Osztó soha nem nulla. A generator egész eredményt vagy a konfigurált egzakt tizedes-listában szereplő tört részt enged (`brainworkshop.py` 4231–4248. sor).
- A forrás `Decimal` értékeket hasonlít, ezért a saját motorban is egzakt racionális/tizedes összevetés kell (`brainworkshop.py` 3343–3353., 3422–3426. sor).
- A forrás üres bevitelt 0-ként értelmez (`brainworkshop.py` 3203–3211. sor), ami 0 eredménynél válasz nélküli helyes pontot okozhat. A saját raw válaszkontraktusban a `null`/hiány külön állapot.

A saját generator `allowFractions=false` esetén csak egész eredményű osztót választ. `allowFractions=true` esetén az egész eredmény mellett csak a forrás `ARITHMETIC_ACCEPTABLE_DECIMALS` listájának egzakt törtrészeit választja. A pontozó a felhasználó tizedes vagy tört alakú szövegét racionális számmá egyszerűsíti, így például `0.5` és `1/2` azonos, lebegőpontos kerekítés nélkül.

## Pontozás

Az értékelés az első `n` warmup próba után indul (`brainworkshop.py` 3396–3405. sor).

Normál Brain Workshop pontozás:

- hit / true positive: target van és a csatornát megnyomták;
- false alarm / false positive: target nincs, de megnyomták;
- miss / false negative: target van, de nem nyomták;
- correct rejection / true negative: target nincs és nem nyomták; a normál százalékban nem szerepel;
- százalék: `floor(100 * hits / (hits + falseAlarms + misses))`, minden modalitás összegezve (`brainworkshop.py` 3407–3460. sor).

Jaeggi pontozásban a correct rejection is helyesnek számít, minden modalitás külön százalékot kap, a teljes eredmény a legalacsonyabb modalitásszázalék (`brainworkshop.py` 3411–3420., 3450–3459. sor).

A motor a négy eseményszámot akkor is külön visszaadja, ha az adott scoring profil valamelyiket kihagyja.

## Adaptáció

Normál automatikus mód (`brainworkshop.py` 467–478., 3971–4002. sor):

- 80% vagy több: N nő, a low strike számláló nullázódik;
- 50–79%: N marad, a korábbi low strike-ok megmaradnak;
- 50% alatt: N>1 esetén strike nő; a harmadik, nem feltétlen egymást követő low score után N csökken és a számláló nullázódik;
- N nem csökken 1 alá;
- manual módban nincs adaptáció.

A korábbi sessionökből visszaállított strike-állapot ugyanazon N-szinten megmarad, és mód-/N-váltásnál nullázódik (`brainworkshop.py` 3833–3858. sor).

Jaeggi scoring profilnál a küszöb 90/75, és egy 75% alatti eredmény azonnal csökkent (`brainworkshop.py` 839–873., 3983–3987. sor).

## Nyers válaszok és időzítés

A referencia egy próbán belül a csatorna gombját többször is ugyanarra a boolean értékre állítja; az utolsó reakcióidő felülírja a korábbit (`brainworkshop.py` 4709–4715. sor). A saját motor a match-duplikátumokat ugyanehhez a boolean jelentéshez vonja össze, ezért többletpontot nem adnak. A reakcióidőt a próba érvényes időablakához köti, de nem állít reakcióidő-metrika paritást a referenciával.

A saját szerződés pontosítása: az ismételt pozitív match esemény összevonódik és nem ad többletpontot; az aritmetikai csatornán az utolsó érvényes érték számít. Fix tempónál `0 <= atMs <= intervalMs`, Self-paced módban védett felső korlát van. Az aritmetikai szöveg legfeljebb 32 karakter, így a validáció még a `BigInt` feldolgozás előtt korlátozza a költséget.

## Saját motor helper-aláírások

- `resolveTargetIndex(trialIndex, config, variableBack = null): number | null` — warmupnál `null`; Variable módban a próba tényleges `shownBack` értéke kötelező.
- `evaluateArithmetic(left, operation, right): {numerator, denominator, text}` — egyszerűsített egzakt racionális eredmény; nullával osztás hibát ad.
- `adaptLevel({n, percent, adaptive, scoreProfile, lowScoreCount}): {fromN, nextN, lowScoreCount, action}` — tiszta, állapotmentes adaptáció.
- `createSeededRandom(seed): () => number` — böngészőben és Node-ban azonos uint32 LCG.
- `isChannelMatch(session, trialIndex, channel): boolean` — kézi fixture-ekhez és független auditokhoz származtatott bináris target.

## Szándékos saját korlátok és eltérések

- N 1–20, `trialCount` 4–200, `intervalMs` 400–10000. Ezek a böngészős termék védett határai; a referencia konfigurációja nem ugyanezt a teljes tartományt rögzíti.
- A termék könnyű alapbeállítása N=1, 20 pontozott próba és 3000 ms. A Brain Workshop Dual alapja N=2, és normál képletből számolja a teljes próbát.
- A saját `trialCount` pontozott próbát jelent, sessionhossz `n + trialCount`; a referencia normál képlete `20+n²` összes és `20+n²−n` pontozott próba.
- Jaeggi profilban pontosan 20 pontozott próba fut. Ezen belül 4 csak-vizuális, 4 csak-auditív és 2 közös match van, így csatornánként 6 match és 14 non-match adja a válasz nélküli 70%-ot.
- Variable+Crab tiltott a pinelt forrás explicit FIXME-je és hibás közös indexelése miatt.
- A Division generator az aktuális tényleges `targetIndex` számából indul, nem a referencia Variable/Crab mellett is fix N-indexéből. Nullával nem oszt, és a forrás engedélyezett törtrészeit egzakt racionális alakban szűri.
- Az üres aritmetikai bevitel válaszhiány, ezért egy nulla eredmény sem lesz automatikusan helyes.
- A match-duplikátumok egyetlen pozitív választ jelentenek. Az aritmetikai események közül a tömbsorrendben utolsó érvényes érték számít. A motor az `atMs` időablakát ellenőrzi, de nem exportál reakcióidő-metrikát.
- A nyers aritmetikai érték 32 karakterre korlátozott a költséges tetszőleges hosszú egészfeldolgozás előtt.
