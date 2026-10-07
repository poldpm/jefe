# Partir JEFE en quatre apps

Escrit el 7 d'octubre del 2026, llegint el codi.
En Pol no fa servir JEFE sencer i en vol treure quatre apps independents:
**Finances**, **Seguiment FitFat**, **Nutrició** i **Entrenaments**.

---

## LA BONA NOTÍCIA: es pot partir net

He comprovat una cosa abans de res, perquè si no es complia tot això no tenia
sentit: **el nucli de JEFE no coneix cap mòdul**. Ni una línia de codi. Les
úniques vegades que al nucli hi surt la paraula «Finances» o «Nutrició» són
**vuit mencions, totes dins de comentaris**.

Això vol dir que cada app es munta així:

```
   nucli de JEFE, copiat SENSE TOCAR          13 fitxers · 3.672 ratlles
 + el frontal compartit, copiat sense tocar   10 fitxers · 5.632 ratlles
 + els fitxers del seu mòdul                  entre 2 i 5 fitxers
 + un 90_Instalacio.gs retallat               només les seves funcions
 = una app que funciona igual que ara
```

No s'ha de reescriure res. És copiar, treure el que sobra i desplegar.

| App | Fitxers propis | Ratlles pròpies |
|---|---|---|
| Finances | `40_Mod_Finances.gs` `41_Finances_Import.gs` `42_Finances_Banc.gs` `43_Finances_Regles.gs` `vista_finances.html` | 5.223 |
| Seguiment FitFat | `40_Mod_Seguiment.gs` `vista_seguiment.html` | 2.159 |
| Nutrició | `40_Mod_Nutricio.gs` `vista_nutricio.html` | 1.925 |
| Entrenaments | `40_Mod_Entrenaments.gs` `vista_entrenaments.html` | 1.236 |

### El nucli, exactament aquests tretze

`00_Config.gs` `01_Utils.gs` `03_Adreca.gs` `05_Registre.gs` `10_Dades.gs`
`15_Esquema.gs` `20_Moduls.gs` `25_Memoria.gs` `30_Encaminador.gs` `50_IA.gs`
`55_Assistent.gs` `60_Notificacions.gs` `65_Senyals.gs`

**No s'hi toca res.** Si una app necessita canviar el nucli, és que s'ha
entès malament alguna cosa: pregunta abans de tocar-lo.

### El frontal, exactament aquests deu

`ui_index.html` `ui_app.html` `ui_estil.html` `ui_icones.html` `ui_marca.html`
`ui_relleu.html` `ui_visor.html` `ui_notifica.html` `ui_xat.html`
`vista_inici.html`

Del `ui_estil.html` se'n pot treure el que és d'altres pantalles, però **només
al final i amb l'eina que ho comprova** (`eines/sobrant.mjs`). No a ull.

### Els que NO es copien

`40_Mod_*` dels altres mòduls, les seves vistes, `44_Calendari_Pont.gs` i
`70_Creuaments.gs` (creua dades de mòduls que ja no hi seran).

---

## LES DADES: es COPIEN, no es mouen

Cada app tindrà **el seu propi full de càlcul**, amb els seus fulls copiats del
full «JEFE — Assistent».

**El full de JEFE no es toca ni s'esborra.** Es queda tal com està, de còpia de
seguretat, fins que les quatre apps portin unes setmanes funcionant. Si una
còpia surt malament, l'original hi és.

| App | Fulls que se'n porta |
|---|---|
| Finances | `Moviments` `Categories` `Recurrents` `FinancesMemoria` `Pressupostos` `Patrimoni` `PatrimoniHistoric` |
| Seguiment FitFat | `Seguiment` `SeguimentPla` |
| Nutrició | `Aliments` `Ingestes` `NutricioDies` |
| Entrenaments | `Entrenaments` `EntrenamentsPassos` |

A més, cada app necessita els fulls del nucli: `_Config`, `_Moduls`,
`_Dispositius`, `Registre`, `Memories`. Aquests **no es copien**: els crea
buits la mateixa app amb `configura()`.

Com es copia un full sense risc: obre el full de JEFE, clica amb el botó dret
la pestanya, **«Copia a» → «Full de càlcul existent»**, i tria el nou. Així
l'original no es mou de lloc.

---

## LA DECISIÓ QUE NO PUC PRENDRE JO

**El Seguiment FitFat llegeix els entrenaments.** Al control setmanal hi surt
la càrrega de la setmana —km-esforç, sessions, desnivell, trail— i això surt
del mòdul d'Entrenaments (`40_Mod_Seguiment.gs:588`, funció `carregues_`).

Si són dues apps amb dos fulls de càlcul separats, **FitFat deixa de veure
aquella càrrega**. No peta —el codi ja ho té previst i torna buit—, però
aquella informació desapareix del control setmanal.

Tres sortides:

1. **Les dues apps comparteixen un sol full de càlcul.** Segueixen sent dues
   apps, dos repositoris i dos projectes d'Apps Script; només les dades són al
   mateix lloc. FitFat necessita llavors una còpia de `40_Mod_Entrenaments.gs`
   per poder llegir-lo, i dues còpies del mateix fitxer són un cost de
   manteniment que ja coneixem.
2. **FitFat llegeix el full `Entrenaments` directament** amb `Dades.llegeix()`,
   sense el mòdul. Cal reescriure `carregues_` i refer el càlcul de la setmana.
   Unes 40 ratlles. Sense fitxers duplicats.
3. **Entrenaments i FitFat són la mateixa app**, amb dues pantalles. És el que
   faria jo: són el mateix tema —el cos i el que hi fas— i és l'única sortida
   que no costa res ni perd res.

**Recomanació: la 3.** Si vols mantenir les quatre apps, la 2 és la bona.
Digues quina abans de començar FitFat.

---

## EL DOMINI PROPI DE FINANCES: COSTA DINERS

Un domini propi (`finances.elquesigui.com`) s'ha de **comprar**: uns 10–15 €
l'any, i es renova. GitHub Pages el serveix de franc, però el domini no ho és.

Com que no vols pagar res, l'alternativa de franc és
**`poldpm.github.io/finances`**, que és el que fan servir les altres tres.
Funciona exactament igual: s'instal·la al mòbil, les notificacions van, tot.

Si el vols igualment, digues-ho i t'explico els passos; però no el compro jo
ni et faré gastar res sense dir-t'ho.

---

## L'ORDRE, I PER QUÈ

1. **Entrenaments** primer. És la més petita (1.236 ratlles) i fa de prova del
   procediment sencer. Si aquesta surt bé, les altres són el mateix.
2. **Nutrició**. Mida mitjana, sense integracions externes.
3. **Seguiment FitFat**. Depèn de la decisió de sobre i toca fotos al Drive.
4. **Finances** l'última. És la més gran, la que té el banc connectat i la que
   guarda les dades que més costaria recuperar.

**NO ESBORRIS JEFE FINS QUE LES QUATRE FUNCIONIN.** És d'on surt el codi i on
són les dades bones. Esborrar-lo abans d'hora no té marxa enrere.

---

## LA CADENA DE DESPLEGAMENT, IGUAL PER A LES QUATRE

Tres baules, i oblidar-ne una és el malentès clàssic d'aquest projecte:

```
npm run puja     comprova + prova + construeix + clasp push + desplega
git push         publica la PANTALLA a GitHub Pages
```

`npm run puja` deixa el codi a l'editor d'Apps Script i fa una versió nova de
l'aplicació web. **La pantalla la serveix GitHub Pages, no Apps Script**: sense
`git push` segueixes veient la d'abans.

## LES PROPIETATS DE L'SCRIPT

Cada projecte necessita les seves. **Mai al codi, mai al repositori.**

| Propietat | Qui la necessita |
|---|---|
| `CLAU_ACCES` | totes — la genera `generaClauAcces()` |
| `ID_FULL` | totes — l'identificador del seu full de càlcul |
| `CLAU_IA` | les que facin servir Gemini (FitFat, Entrenaments, Finances) |
| `FIREBASE_COMPTE` | les que vulguin notificacions |
| `EB_APP_ID` `EB_PRIVATE_KEY` `BANC_NOM` `FINANCES_BANC` | només Finances |

---

## LES NORMES D'EN POL, QUE VALEN PER A LES QUATRE

- Les claus van a **Propietats de l'script**, mai al codi ni a cap fitxer que
  vagi al repositori. Comprova el `.gitignore`.
- **Res de `push --force` ni de reescriure la història.**
- **No esborris ni sobreescriguis cap full, fitxer ni dada** sense que ell
  ho autoritzi expressament.
- **Cap dada d'exemple que es pugui confondre amb la seva.**
- **No li diguis que una cosa funciona si no l'has comprovada.**
- **No li presentis una cosa a mitges com si estigués acabada.**
- No decideixis tu quan s'acaba la feina.
- Ell no paga res: ni subscripcions ni pagaments únics.
- `git pull` en començar, `commit` i `git push` en acabar cada canvi fet i
  comprovat.
