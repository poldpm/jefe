# Partir JEFE en tres apps

Escrit el 7 d'octubre del 2026, llegint el codi.
En Pol no fa servir JEFE sencer i en vol treure apps independents.

En volia quatre; en seran **tres**, perquè el **Seguiment FitFat** i els
**Entrenaments** van junts en una sola app amb dues pantalles. Ho explica la
secció «EL SEGUIMENT I ELS ENTRENAMENTS VAN JUNTS», més avall: decidit el 7
d'octubre del 2026.

Les tres: **Nutrició**, **FitFat + Entrenaments** i **Finances**.

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
| Nutrició | `40_Mod_Nutricio.gs` `vista_nutricio.html` | 1.925 |
| FitFat + Entrenaments | `40_Mod_Seguiment.gs` `vista_seguiment.html` `40_Mod_Entrenaments.gs` `vista_entrenaments.html` | 3.395 |
| Finances | `40_Mod_Finances.gs` `41_Finances_Import.gs` `42_Finances_Banc.gs` `43_Finances_Regles.gs` `vista_finances.html` | 5.223 |

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
seguretat, fins que les tres apps portin unes setmanes funcionant. Si una
còpia surt malament, l'original hi és.

| App | Fulls que se'n porta |
|---|---|
| Nutrició | `Aliments` `Ingestes` `NutricioDies` |
| FitFat + Entrenaments | `Seguiment` `SeguimentPla` `Entrenaments` `EntrenamentsPassos` |
| Finances | `Moviments` `Categories` `Recurrents` `FinancesMemoria` `Pressupostos` `Patrimoni` `PatrimoniHistoric` |

A més, cada app necessita els fulls del nucli: `_Config`, `_Moduls`,
`_Dispositius`, `Registre`, `Memories`. Aquests **no es copien**: els crea
buits la mateixa app amb `configura()`.

Com es copia un full sense risc: obre el full de JEFE, clica amb el botó dret
la pestanya, **«Copia a» → «Full de càlcul existent»**, i tria el nou. Així
l'original no es mou de lloc.

---

## EL SEGUIMENT I ELS ENTRENAMENTS VAN JUNTS

Era l'única cosa que no podia decidir jo, i en Pol la va decidir el 7 d'octubre
del 2026: **una sola app amb dues pantalles**.

El motiu és que el Seguiment **llegeix** els entrenaments. Al control setmanal
hi surt la càrrega de la setmana —km-esforç, sessions, desnivell, trail— i això
ve del mòdul d'Entrenaments (`40_Mod_Seguiment.gs:588`, funció `carregues_`).
Separant-los, aquella càrrega desapareixia del control.

I junts hi ha una cosa que val més que l'estalvi: **no s'ha de tocar ni una
línia**. `carregues_` fa `typeof Entrenaments === 'undefined'`, i amb els dos
mòduls al mateix projecte aquella comprovació passa sola. Cap fitxer duplicat,
cap funció reescrita, cap full compartit entre projectes.

De les tres sortides que hi havia, aquesta és l'única que no costa res ni perd
res. Les altres dues eren duplicar un fitxer de mòdul en dos projectes —el
cost de manteniment que ja coneixem de l'automatització de l'escola— o
reescriure el càlcul de la setmana a mà.

**Com queda l'app:** dues pantalles al menú d'inici, `seguiment` i
`entrenaments`, exactament com ara a JEFE. Un sol full de càlcul amb els quatre
fulls. Un sol repositori. Un sol projecte d'Apps Script.

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

1. **Nutrició** primer. Ara és la més petita (1.925 ratlles pròpies) i no toca
   res de fora: ni banc, ni fotos al Drive, ni dependències entre mòduls. Fa de
   prova del procediment sencer. Si aquesta surt bé, les altres són el mateix.
2. **FitFat + Entrenaments**. Dues pantalles, fotos al Drive i una lectura
   d'un mòdul a l'altre que ja funciona sola.
3. **Finances** l'última. És la més gran, la que té el banc connectat i la que
   guarda les dades que més costaria recuperar.

**NO ESBORRIS JEFE FINS QUE LES TRES FUNCIONIN.** És d'on surt el codi i on
són les dades bones. Esborrar-lo abans d'hora no té marxa enrere.

---

## LA CADENA DE DESPLEGAMENT, IGUAL PER A LES TRES

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
| `CLAU_ACCES` | les tres — la genera `generaClauAcces()` |
| `ID_FULL` | les tres — l'identificador del seu full de càlcul |
| `CLAU_IA` | les que facin servir Gemini (FitFat i Finances) |
| `FIREBASE_COMPTE` | les que vulguin notificacions |
| `EB_APP_ID` `EB_PRIVATE_KEY` `BANC_NOM` `FINANCES_BANC` | només Finances |

---

## LES NORMES D'EN POL, QUE VALEN PER A LES TRES

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
