# Memória Műhely

Tíz magyar memóriagyakorlat, szintenként eltérő játékszabályokkal, tanulói fiókokkal és tanári felülettel. A tanár tanulókat és csoportokat kezel, több játékból álló feladatsort oszt ki, és válaszonként megnézheti az eredményeket. A tanuló a saját feladatait, mentett köreit és fejlődését látja.

A játékok: Számlánc, Fényrács, Fényösvény, Mi hiányzik?, Megállóról megállóra, Arcok és nevek, Árcédulák, Bevásárlólista, Képrészletek és Titkos kód. A hat többszintű játék összesen14, a négy alapjáték további4 változatot ad. A szint például név helyett több személyadatot, ár mellé kedvezményt, felismerés helyett képsorrendet jelent.

A referencia és a saját szabályok külön szerepelnek a [funkciómátrixban](docs/FEATURE-MATRIX.md). Teljes AMAkids-platformparitást nem állítunk. Nincs átvett referencia-kód, kép vagy tanulóadat.

## Indítás

Node.js22 vagy újabb és PostgreSQL szükséges. `npm ci`, majd a `.env.example` alapján beállított környezettel `npm start`. A szerver induláskor tranzakcióban futtatja a migrációkat. A `.env` fájlt önmagában nem tölti be; fejlesztéshez használható `node --env-file=.env server/index.js`.

A statikus, helyi böngészőben mentő bemutató külön futtatható: `npm run dev` → http://127.0.0.1:4186/. A Railway-változat same-origin szervert és központi PostgreSQL-adatbázist használ.

## Ellenőrzés

- `npm test`: generátorok, összes játékszint nyers válaszainak pontozása, auth/jogosultság, kiosztás és mentés.
- `npm run check`: modulok, szintaxis, helyi hivatkozások.
- `tests/school-workflow.test.mjs`: önálló teljes HTTP-folyamat a valódi játékmotorral, két tanulóval, fiókváltással és párhuzamos beküldéssel. Alapból elkülönített PGlite. Kifejezetten tesztelésre megadott `SCHOOL_TEST_DATABASE_URL` esetén véletlen nevű ideiglenes PostgreSQL-sémát hoz létre és töröl.

## Fiókok és adatok

A tulajdonos egy egyszer használható induló kóddal állítja be a tanári felhasználónevét és jelszavát. A tanár felhasználóneves tanulókat hoz létre, és az aktiváló linket kézzel adja át. Nincs emailküldés, fizetés vagy futás közbeni AI-hívás.

A jelszavak sózott scrypt kivonatként, a munkamenet- és aktiváló tokenek kivonatként tárolódnak. A munkamenet HttpOnly/SameSite cookie-t használ; élesben Secure. Az írásokat Origin- és CSRF-ellenőrzés védi. A szerver generálja a kör seedjét, rögzíti a kiosztás paramétereit, és a nyers választ maga pontozza. Ugyanaz a beküldés csak egyszer számít.

A tanári próbakörök nem rögzítenek tanulói eredményt. A tanulói körök központilag megmaradnak. A mentésre váró válasz az adott fiókhoz és böngészőfülhöz kötve várhat újraküldésre; nem jelenik meg végleges pontszámként sikeres szerveres mentés előtt.

Üzemeltetés és első belépés: [üzemeltetési útmutató](docs/OPERATIONS.md). Saját képek: [eredet és generálási leírás](docs/ASSETS.md).

## Korábbi bemutatók

Az eredeti `index.html` és `app-mockup.html` Montessori-koncepciók megmaradnak; nem részei a Railway alkalmazásnak. A korábbi Sites-változat kizárólag a `dist/` statikus állományait szolgálja ki. A mostani munka nem módosítja annak hozzáférési beállítását. Kutatási és tárgyalási jegyzetek nem kerülnek a kiadásba.

Kiadási ellenőrzések és aktuális átadás: [docs/RELEASE-VERIFICATION.md](docs/RELEASE-VERIFICATION.md).
