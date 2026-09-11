# N-back Műhely – modern feladatválasztó

2026. szeptember 11. A klasszikus beállításlap mellé külön **Modernizált** nézet készült. Ez feladatválasztó és szabálymagyarázó felület; ugyanazt a 28 játékmódot, közös beállításokat, játékmotort, hangokat és mentési útvonalat használja.

## Elérhető funkciók

| Követelmény | Hol érhető el? | Elvégzett ellenőrzés |
|---|---|---|
| Klasszikus / Modernizált fül | Az N-back beállításlap tetején | Oda-vissza váltás; az N=2, 8 lépés, saját tempó és kiválasztott mód megmarad. Új böngészőben alapértelmezés a Klasszikus; a választást helyileg megjegyzi. |
| Átlátható feladatok | Illusztrált kártyák, rövid magyar nevek, megfigyelési csatornák | Mind a 28 kártya és részletezőlap valódi Chrome-felületen megnyitva; mind a 28 kompatibilis alapbeállítással indítható. Az eredeti referencia-nevek is láthatók. |
| Segítség az első választáshoz | „Ezzel kezdem”, „Kezdéshez” csoport | Az ajánlás saját termékdöntés: Pozíció, 1-back, 8 értékelt lépés, saját tempó, kézi nehézség. Innen teljes, saját teszttanulóhoz mentett kör: 100%, TP=1, FP=0, FN=0, TN=7. |
| Keresés és feladatcsoportok | Kereső; hely/kép/hang, számolás, keresztegyezés, kétféle hang | Mind a 28 lista; „zongora” keresés: 8 találat. |
| Érthető szabálypéldák | A kártya részleteinél „Előző lépés / Most”, „Másik példa” | Egyező és eltérő példa; keresztegyezés irányai és számolási operandusok külön kódellenőrzése. A példa mindig jelölt 1-back alaphelyzet, haladó módosítók nélkül. A hangot a példa szöveggel jelöli; ez nem hangos gyakorlókör. Indítás után az eredeti kipróbálható bevezető következik. |
| Egyszerű és teljes beállítások | N, körhossz, tempó, adaptáció; „Minden beállítás” | Közös kanonikus beállítóelem; N=21 letiltja az indítást, N=2 helyreállítja. A Multi-stim + csak hang kombináció nem indul. Jaeggi esetén a körhossz/tempó zárolt, másik nem támogatott mód nem indítható. |
| Mobilhasználat | Egymás alatti kártyák, görgethető részletek, rögzített indítógomb | Chrome 390×844 emuláció, vízszintes túlcsordulás nélkül; részletezőlap belső/szélességi adata egyaránt 350 px. Natív iOS/Android próba nem történt. |
| Eredménymentés és korábbi működés | Változatlan `startGame` és szerveres értékelés | Egy teljes modernből indított kör mentve a saját helyi tesztfiókba. A meglévő 123 teszt és az alkalmazás szintaxis-/asset-ellenőrzése sikeres. Ebben a körben nem játszottuk újra mind a 28 módot, és nem ismételtük meg a teljes élő tanári kiosztási folyamatot. |

## Hatókör és bizonyíték

A három futó kódfájl: `dist/app.js`, `dist/nback/explorer.js`, `dist/nback/explorer.css`. A tanári beállító, játékmotor, hangkészlet, pontozás, szerver és adatbázisséma nem változott. Független, csak olvasásos agentellenőrzés: **PASS**; a 28 módazonosító azonossága, konfiguráció-átadás, tiltott kombinációk, példák és indítás/mentés útvonal ellenőrizve. Ez statikus felülvizsgálat, a fenti böngészős bizonyítékot a root külön szerezte meg.

A saját döntések az elnevezések, illusztrációk, feladatcsoportok, kezdőajánlás és gyorsbeállítások. Új játék-, pontozási vagy szintlépési szabály nem készült. Az eredeti N-back átadás nyitott készülék-/háttérbehelyezési korlátait ez a felületváltozás nem zárja le: [korábbi N-back átadás](NBACK-DELIVERY-2026-09-11.md).

Privát ellenőrzési anyagok: `.local/nback-modern/card-catalog.json`, `detail-checks.json`, `config-checks.json`, `played-position-round.json`, `position-result.txt`, valamint az asztali és mobil képernyőképek. A 100%-os pozíciókörben a jelölés az előző és az aktuális **látható** mező összehasonlításából történt; rejtett megoldást nem használtunk.

## Külön kutatási eredmény

Elkészült a [Memóriaprofil és fejlődéskövetés kutatási jelentése](COGNITIVE-ASSESSMENT-RESEARCH-2026-09-11.md), 15 hivatkozott forrással. A jelentés az aktuális kód mérési adatait és korlátait is vizsgálja. Következő javaslat: a gyakorlástól elkülönített, saját validálást igénylő térbeli sorrend-, hallott számsor- és kép–hely társítási mérési változatok. Új norma, percentilis, agyterületi állapotmutató vagy mérési protokoll ebben a kiadásban nem került az alkalmazásba.

## Kiadás

**Kiadva:** [N-back Műhely](https://memoria-web-production-a86b.up.railway.app/#/jatek/nback), felül a **Modernizált** fülön. Az éles választót Chrome-ban megnyitottuk, a modern fület kiválasztottuk.

- Megvalósítás: `224302e2a908485a2c1e9153b23ab5d2cf61d234`.
- Railway deployment: `7ed1314b-005b-4723-8345-434a5fba3860`, **SUCCESS**, létrehozva 2026-09-11 09:47:05 CEST. A meglévő Railway-kiadási folyamatot használtuk; nyilvános GitHub-push nem történt.
- Friss PostgreSQL-mentés és külön ideiglenes adatbázisba sikeres visszaállítás: 09:45:36 CEST, 34 285 bájt; SHA256 `00c880d502e605a0a26f38bddea524e8b41ea60b2e51aa008af4a5faed4de8fc`. Az eredeti adatbázist a visszaállítási próba nem módosította.
- A futó konténer **71/71** vizsgált forrásfájlja és a HTTP-n visszakért **56/56** nyilvános fájl megegyezett a kiadott jelölttel; `/api/health`: HTTP 200, `ok: true`.
- Éles, csak olvasásos böngészőpróba: alapértelmezett Klasszikus nézet → Modernizált → Mind a 28 → Hely és hang részletező, indítógomb engedélyezve. A felületi kiadás ellenőrzése nem indított új éles tanulói kört. A teljes modern kör és mentés fent dokumentált bizonyítéka a saját helyi tesztfiókból származik.
- Kiadási bizonyítékok: `.local/nback-modern/deployment.json`, `release-manifest.json`, `runtime-source-proof.json`, `public-assets-proof.json`, `backup.json`, `live-catalog.txt`, `live-detail.txt`, `live.png`.

Ez a kiadás a választófelület működését és a korábbi játékhoz kapcsolódását igazolja; nem új tudományos tesztvalidálás vagy teljes referencia-paritási állítás.
