# Interaktív agykéreg · forrás és megvalósítás

2026-09-11. A korábbi sematikus kontúr helyett valódi, kétoldali FreeSurfer fsaverage5 pial kérgi felszín jelenik meg, az illesztett Destrieux-atlasz eredeti vertexcímkéivel. A megvalósítás saját böngészős oktatási nézet, nem agyi aktivitásmérés.

## Rögzített referencia

- Felszín és sulcalis mélység: Nilearn-adatcsomag, `e5faab66dc2fe72d2cb50a8aaf2f44813aba4a51` commit, `nilearn/datasets/data/fsaverage5/`.
- Annotáció: a Nilearn `fetch_atlas_surf_destrieux` által használt NITRC fsaverage5 `.annot` fájlok, bal: letöltés 9343, jobb: 9342.
- [Felszíndokumentáció](https://nilearn.github.io/stable/modules/generated/nilearn.datasets.fetch_surf_fsaverage.html), [atlaszillesztés](https://nilearn.github.io/stable/modules/generated/nilearn.datasets.fetch_atlas_surf_destrieux.html), [Destrieux et al. 2010](https://doi.org/10.1016/j.neuroimage.2010.06.010).
- Mindkét félteke 10 242 csúcspont, 20 480 háromszög. A 76 annotációs címke ismeretlen/medial-wall címkéket is tartalmaz; nem 76 funkcionális rendszer.
- Teljes bemeneti URL-ek és SHA-256 ellenőrzőösszegek: `dist/assets/brain/provenance.json`. Kimeneti hash, eredeti RAS határok és parcelméretek: `dist/assets/brain/atlas.json`.

## Geometria, megjelenítés és jogok

A `scripts/build-brain-atlas.py` GIFTI és FreeSurfer v2 annotációból készít kis böngészős bináris fájlokat. Az eredeti float32 koordináták és sulcalis mélységek változatlanok; az eredeti háromszögindexek veszteségmentesen uint16 formátumúak. A címkék az eredeti annotáció színtáblájából származnak. Nincs simítás, alakgenerálás, parcelbecslés vagy kézzel rajzolt tekervény. Megjelenítéskor a RAS `(x,y,z)` koordinátából `(x,z−14,−y−18)` lesz; ez merev elfordítás és eltolás.

A Three.js 0.186.0 szükséges moduljai és OrbitControls helyben vendorizált, esbuild 0.25.12 által csomagolt ES-modulban szerepelnek. Futás közben a modell és a könyvtár ugyanarról a szerverről töltődik, külső CDN-függőség nélkül. A kamera gömbi pályán vált nézetet, nem megy keresztül az agyon.

A [FreeSurfer Software License Agreement](https://surfer.nmr.mgh.harvard.edu/fswiki/FreeSurferSoftwareLicense) Part B teljes szövege, a kötelező előtag, a Nilearn BSD-3-Clause és a Three.js MIT licence az alkalmazásból elérhető `dist/assets/brain/attribution.html` oldalon szerepel. A módosított változat jelölve van. A Nilearn csomaglicencét nem tekintjük az eredeti anatómiai adatok licencét helyettesítő engedélynek.

## Tudományos megfeleltetés

| Feladat | Szemléltetett kérgi régió | Forrás / határ |
|---|---|---|
| Térbeli sorrend | Homloki és fali kéreg | [Toepper et al. 2010](https://pubmed.ncbi.nlm.nih.gov/20678490/), módosított Corsi-feladat; a hippocampus nincs a modellen. |
| Hallott számsor | Bal supramarginalis és felső temporalis kéreg | [Pisoni et al. 2019](https://pubmed.ncbi.nlm.nih.gov/31177297/), 103 beteg léziótérképezése; a teljes atlaszparcel tágabb a vizsgált hátsó régiónál. |
| Kép–hely társítás | Parahippocampalis kéreg | [Sommer et al. 2005](https://pubmed.ncbi.nlm.nih.gov/15897257/); a cikk hátsó régiót vizsgál, a nézet teljes parcelt jelöl. Nem hippocampus. |
| Közbeiktatott feladat | Homloki, fali és elülső cinguláris kéreg | [Chein et al. 2011](https://pubmed.ncbi.nlm.nih.gov/20691275/); a kiválasztott cinguláris címke kizárólag `G_and_S_cingul-Ant` (6). |
| Képfelismerés | Fusiformis, nyakszirti–halántéki kérgi régió | [Danckert et al. 2007](https://pubmed.ncbi.nlm.nih.gov/17696171/); szemléltető anatómiai környezet, nem a cikk aktivitásklasztere. Ismétléskor csökkent válasz is lehet. |
| Jelzés és visszatartás | Jobb alsó homloki, elülső insularis és alsó fali kérgi régió | [Garavan et al. 1999](https://pmc.ncbi.nlm.nih.gov/articles/PMC22229/); az insula részben fedett a pial felszínen. |
| N-back | Homloki és fali kéreg | [Owen et al. 2005](https://pmc.ncbi.nlm.nih.gov/articles/PMC6871745/), 24 képalkotó vizsgálat metaelemzése. |

A kiemelések anatómiai határokat követő oktatási szelekciók, nem egyéni aktivációs térképek vagy mért idegpályák. Nem vezetünk le játékpontszámból agyi egészséget, aktivitáserősséget vagy régiófejlődést. A modell csak agykéreg: hippocampus, kisagy és agytörzs nélkül. Egy atlaszparcel többféle funkcióban részt vehet. A kutatók és intézmények nem hitelesítik a terméket.

## Ellenőrzés

- Külön forrásellenőrző agent az aktuális címkeindexeket és tanulmányi állításokat összevetette. Találata: az anterior midcingulate címke túl tág volt az anterior cingulate névhez; javítva a 6-os címkére.
- Bináris tesztek: rögzített hash, mindkét felszín mérete, véges koordináták, valid háromszögindexek, minden parcel darabszáma, RAS oldaliság; sérült/verzióhibás/eltérő felbontású modell elutasítása.
- Meglévő UI/regressziós ellenőrzések, valamint valódi Chrome interakciós és vizuális próbák külön bizonyítékként. A végső kiadási eredmény a kapcsolódó átadási jegyzékben szerepel.
