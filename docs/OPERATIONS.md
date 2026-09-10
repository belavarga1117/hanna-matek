# Üzemeltetés és első használat

## Szolgáltatás

A meglévő `hanna-memoria` Railway-projektben `memoria-web` és `Postgres` szolgáltatás működik. Az alkalmazás címe: https://memoria-web-production-a86b.up.railway.app . A kiszolgáló és az API közös eredetű, a tanulói adatok belépést igényelnek. A HTML és a saját játékprogram nyilvános, személyes adatot nem tartalmaz.

A konténer Node22, egy példány,500MB memóriakeret és1vCPU. PostgreSQL külön500MB/1vCPU, saját tartós kötettel. A healthcheck `/api/health`. A `DATABASE_URL` a `Postgres.DATABASE_URL` Railway-hivatkozás; nincs beégetett adatbázis-jelszó. A Docker csak a függőségeket, a `server`, `migrations` és `dist` állományokat csomagolja.

## Tulajdonosi aktiválás

1. Railway → hanna-memoria → memoria-web → Variables → `BOOTSTRAP_TOKEN`. Csak a projekt jogosult tulajdonosa olvassa ki.
2. Nyisd meg az alkalmazást, az első tanári fiók űrlapján add meg az induló kódot, a saját felhasználónevedet, megjelenő nevedet és legalább10 karakteres egyedi jelszavadat.
3. Sikeres aktiválás után a második tulajdonos létrehozását az adatbázis is tiltja. A `BOOTSTRAP_TOKEN` eltávolítható a Railway Variables közül, majd a szolgáltatás újraindítható.
4. Tanulók → új tanuló → az aktiváló linket kézzel add át az adott tanulónak. A link72 óráig érvényes és egyszer használható. Új aktiváló link kérése visszavonja a korábbi munkameneteket; inaktiválás szintén megszünteti a hozzáférést.

A kódot, jelszót és tanulói aktiváló linket ne tedd nyilvános dokumentumba vagy képernyőképbe. A rendszer nem küld levelet, és nem feltételez ismert tanári emailcímet.

## Mentés, frissítés, helyreállítás

A migrációk induláskor advisory lock alatt, tranzakcióban futnak, sorszámuk a `schema_migrations` táblában marad. A meglévő migrációt kiadás után ne írd át: új fájlt adj hozzá.

Adatot érintő frissítés előtt készíts Railway-kötetmentést a Postgres Backups felületén. A napi kötetmentés beállítását a jelenlegi Railway jogosultság elutasította (Not Authorized); automatizált mentést ezért ez a kiadás nem állít be. A tulajdonos a Backup felületen ellenőrizheti a csomag/jogosultság lehetőségét. Addig frissítés előtt kézi PostgreSQL-mentés szükséges. A visszaállítás előbb külön tesztkörnyezetben ellenőrizendő; éles visszaállítás valódi adatot cserélhet le, ezért külön tulajdonosi művelet.

Alkalmazás-visszaállás: Railway → memoria-web → Deployments → előző sikeres build → Redeploy. Ez a PostgreSQL-adatokat nem tekeri vissza. A migrációval összeegyeztethetetlen régi programra ne állj vissza adatbázis-helyreállítási terv nélkül.

Nincs automatikus tanulói eredménytörlés és önkiszolgáló fióktörlés ebben a kiadásban. Az inaktiválás megőrzi az oktatási előzményeket; adattörléshez a tulajdonos célzott üzemeltetői művelete szükséges. A felület legutóbbi200 saját, illetve1000 tanári eredményt listáz; a fejlődés az összes tárolt körből számol.

## Határok

A jelen verzió tanulói gyakorlásra szolgál, nem vizsgafelügyeleti rendszer. A futó játék feladata szükségszerűen a böngészőbe kerül. A szerveres pontozás megakadályozza az önkényes pontszám-beküldést, de nem állít csalásbiztos vizsgamódot.

A jelszó-helyreállítás tanulónál tanári új aktiváló linken történik. Elfelejtett tulajdonosi jelszóhoz egyedi üzemeltetői helyreállítás kell; a setupkód önmagában már nem nyit új tulajdonosi fiókot.

A 2026-09-10-i tiszta induló adatbázis kézi mentését külön ideiglenes PostgreSQL-adatbázisba sikeresen visszaállítottuk. A privát mentés helye a projekt `.local/backups/` könyvtára; a részletes kiadási bizonyíték a `RELEASE-VERIFICATION.md`. Ez a sikeres próba nem jelent automatikus napi mentést.


## V2 szabályverzió-frissítés – 2026-09-10

Az új kliens és szerver a körrel együtt tárolt szabályverziót használja. A korábbi kiosztás, függő kör és eredmény v1 marad; az új feladatsorok v2 szabályúak. A régi böngésző szabad gyakorlása továbbra is v1, újv2 kiosztáskor frissítést kér. A mentett pontok és csillagok nem értelmeződnek újra. A002 és003 migráció hozzáadó;003 a kiadáskor még futó régi szerver mentéseinek eredeti csillagát is megőrzi.

V2 eredmények létrejötte után ne állj vissza egyszerűen v1 programra: az a csillagösszesítést újra a korábbi százalékképlettel számolná. Elsődleges helyreállítás a javított v2 program kiadása. Adatbázis-visszaállítás csak külön egyeztetett adatmegőrzési tervvel történhet, mert a mentés óta létrejött valódi munkát elveszítheti. A mentés visszaállíthatóságát ideiglenes, külön adatbázisban kell próbálni.

A korábbi üresrendszeres QA-törlő, reset- és seed-szkriptek nem futtathatók a jelenlegi éles adatokon. A paritásjavítás helyi próbái izolált, tartós PGlite-adatbázist használnak; éles próbához külön, azonosítható saját QA-profil szükséges. A privát jegyzetek, referencia-képernyőképek és `.local` állományok nem kerülnek sem a konténerbe, sem a nyilvános GitHub-tárolóba.
