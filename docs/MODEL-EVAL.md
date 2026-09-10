# Modell- és ellenőrzési napló

2026-09-10 – Memória Műhely tanulói/tanári kiadás.

| Sáv | Modell és effort | Megfigyelt eredmény |
|---|---|---|
| Backend | Sol high | Elkülönített PostgreSQL API-sáv; saját root integráció igazolta a valódi motort. Root talált hiányzó sessionnél403/401 UX-eltérést, javítva regressziós teszttel. |
| Játékok | Sol high | Tíz mount és14 referencia-szint; root megfigyelés alapján count/ATM3korrekció, scene-label és atlaszfinomítás. 49 saját sávteszt; integráltan54 teszt. |
| Felület | Sol high | Tanári/tanulói flow és accountváltás. Root UAT számláló- és beállítási mezőhibákat talált, javítva. |
| Teljes független review | Grok4.6 medium, statikus, shell nélkül | Első kérés CLI promptlevágás miatt nem adott verdictet. Egyedi új kérés `--verbatim` módban teljes verdictet adott a384a15c állapotra. |
| Review findings | Grok4.6 medium |1 valós: jelszómin8 aUIban vs10 szerveren. Reprodukálva, javítva.1 feltételes üzemeltetési észrevétel: APP_ORIGIN hiánya. A Railway tényleges Variables olvasása igazolta, hogy a helyes HTTPS-origin már be van állítva; nem kódhiba. Nem állított adatkeveredési vagy klienspont-elfogadási hibát. |

Root saját későbbi UAT: mobil gyakorlófejléc fix magassága átfedett; függő válasz game-URL frissítés után csak főoldalról volt visszahozható. Mindkettő javítva; a képsorrend kiválasztása látható sorszámjelölést kapott. Ezeket a fix-szűk független ellenőrzés is megkapja.

## Záró ellenőrzések és később talált hibák

- Grok4.6 medium, statikus UI-javításellenőrzés: `3cd723f`, PASS.
- A korábbi statikus review és az eredeti54 teszt nem találta meg a valódi node-postgres tömbkódolási eltérését. Root éles HTTP-próbája PostgreSQL18 mellett eredménymentéskor503-at kapott, majd SQL-casttal és a tesztadapter pg-paraméterkódolásával függetlenül reprodukálta. Backend Sol high célzott javítása minden JSONB értéket explicit JSON-szövegként köt; root integrálta,55/55 teszt PASS. Grok4.6 medium fixreview: `4a3cb93`, PASS. Ezután éles HTTP-n mind18 mód,36 párhuzamos beküldésből pontosan18 eredmény, szerepkör és újrabelépés PASS.
- Root éles kezdőoldal-ellenőrzése külön csomagolási hibát talált: az általános `index.html` feltöltési kizárás a `dist/index.html` fájlt is kihagyta. Az API healthcheck ezt nem jelezte. A kizárás eltávolítva, a konténer buildje ellenőrzi a tényleges kezdőoldal és fontos képek meglétét. Grok4.6 medium fixreview: `debe0d3`, PASS.
- A statikus review, a helyi böngészőpróba, az éles API és a tényleges feltöltött fájlok ellenőrzése külön bizonyíték. Egyik önmagában nem kiadási igazolás. A végső éles állapotot a RELEASE-VERIFICATION.md rögzíti.
