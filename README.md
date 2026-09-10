# Memória Műhely

Tíz végigjátszható, magyar nyelvű memóriagyakorlat a `dist/` mappában.

- Számlánc, Fényrács, Fényösvény, Mi hiányzik?
- Megállóról megállóra, Arcok és nevek, Árcédulák, Bevásárlólista
- Képrészletek, Titkos kód

Állítható nehézség, elemszám és megjegyzési idő; szüneteltetés;
megoldásértékelés; megosztható beállítások; az adott böngészőben tárolt előzmények.
Telefonon, táblagépen és asztali böngészőben használható.

## Helyi indítás

`npm run dev` → http://127.0.0.1:4186/

A statikus ES-modulok miatt HTTP-kiszolgáló szükséges; a fájlokat ne `file://` címről nyisd meg.
Nincs telepítendő csomag. Az indításhoz Python 3, az ellenőrzésekhez Node.js szükséges.

## Ellenőrzések

`npm test` — húsz teszt a generátorokra, pontozásra, időzítőre és mentésre.

`npm run check` — modulok, szintaxis és a kiadható állományok ellenőrzése.

## Adatok és üzemeltetés

A teljes alkalmazás a böngészőben fut. Nem használ bejelentkezést, központi adatbázist,
fizetést vagy futás közbeni AI-hívást. Legfeljebb 200 kör eredménye marad helyben;
ezek a felületen törölhetők. A megosztott hivatkozás csak beállításokat tartalmaz.
A betűtípusok a Google Fonts szolgáltatásból töltődnek, helyi helyettesítőkkel.
A portrék saját generált illusztrációk; a játékok saját megvalósítások.

A Sites a `.openai/hosting.json` alapján kizárólag a `dist/` mappát szolgálja ki.
A kutatási jegyzetek és a korábbi koncepciók nem részei a kiadott alkalmazásnak.

## Korábbi Hanna-koncepciók

Két önálló, statikus HTML oldal Németh Hanna *„I love matek & montessori"* brandjéhez.
**Koncepció / mockup** – nem hivatalos termék, bemutató célú.

- **`index.html`** – bemutató weboldal (Montessori matek, a brand és módszer bemutatása)
- **`app-mockup.html`** – interaktív „Agytorna" app-prototípus: 11 fejlesztő játék, életkor-onboarding, napi kihívás, szintek, jelvények, „Mit fejleszt?" idegtudományi kártyák

## Élő verzió (GitHub Pages)

- **Weboldal:** https://belavarga1117.github.io/hanna-matek/
- **App mockup:** https://belavarga1117.github.io/hanna-matek/app-mockup.html

## Technikai

Minden 100%-ban kliensoldali, beépített eszközökkel (emoji, inline SVG, CSS, Web Audio) –
nincs külső függőség, build vagy szerver. Bármelyik fájl önállóan megnyitható böngészőben.
