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
