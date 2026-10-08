# Encàrrec: l'app de Finances

> Això és el primer missatge d'una conversa nova de Claude Code.
> Enganxa-ho sencer.

---

Hola. Farem una app a partir d'un mòdul d'una app més gran que es diu JEFE.
Jo soc en **Pol del Pozo**, mestre de 2n de primària a l'Escola Vedruna
Escorial de Vic. JEFE l'he deixat de fer servir i en vull treure tres apps independents.
Aquesta és **l'última i la més delicada**: és la més gran, té un
banc connectat i guarda les dades que més costaria recuperar.

**Llegeix primer `C:\Claude\Popu\docs\separar\00-el-pla.md`.** Hi ha
l'arquitectura, com es copien les dades i les normes que valen per a totes
tres. Aquest document només hi afegeix el que és d'aquesta app.
**La de Nutrició ja està feta** i viu a `poldpm-apps.github.io/nutri`. Si
dubtes de com es resol alguna cosa —l'estructura del repositori, què es va
retallar de `prova.mjs`, com va quedar el `.clasp.json`—, mira-te-la: és el
mateix procediment i ja ha passat per aquí.


## QUÈ HA DE SER

Una app que faci **exactament el que fa ara l'apartat de Finances de JEFE**.
Són 29 accions de servidor i 1.564 ratlles de pantalla: és la més gran de les
tres. Res de funcions noves. Si alguna cosa no la pots fer igual, atura't i
digues-m'ho abans de canviar-la.

Què fa, ara mateix:
- Moviments del mes: ingressos, despeses, traspassos, balanç.
- **Connexió amb el banc** per Enable Banking (PSD2). Quatre mirades al dia, i
  el meu banc només dona **90 dies** d'històric.
- **Categories** pròpies, amb emoji i pressupost mensual.
- **Classificar el que entra**: la pantalla de «Revisar», per comerç i per
  moviment, amb memòria del que ja he classificat abans.
- **Rebuts fixos**: proposa els que es repeteixen de debò i jo els accepto o
  els descarto. El criteri és meu i és aquest: **Bonpreu NO** —hi compro cada
  mes però mai la mateixa quantitat— i **l'assegurança del cotxe SÍ** —mateix
  import, mateixa empresa.
- El **vigilant**: avisa del que NO ha passat i del que ha passat diferent.
- **Patrimoni**: actius, valors i històric.
- Importar i exportar.

## D'ON SURT

Origen: `C:\Claude\Popu` (el repositori de JEFE). **Només es llegeix.**

Fitxers propis d'aquesta app, **quatre**:
- `apps-script/40_Mod_Finances.gs`
- `apps-script/41_Finances_Import.gs`
- `apps-script/42_Finances_Banc.gs`
- `apps-script/43_Finances_Regles.gs`
- `apps-script/vista_finances.html`

Més el nucli i el frontal de la llista del pla, copiats sense tocar.

Del `90_Instalacio.gs` calen: `configuraJefe()` (canvia-li el nom a
`configura()`), `generaClauAcces()`, `instalaTriggers()` i `treuTriggers()`,
`triggerManteniment()`, `triggerBanc()`, `triggerPatrimoni()`,
`sincronitzaBancAra()`, `arreglaClauBanc()`, `provaBanc()`, `provaClauBanc()`,
`provaQuiCobra()`, `omplequiCobra()` i `mirarPatrimoni()`. La resta fora.

`triggerSenyals()` **no cal portar-lo**: viu a `65_Senyals.gs`, que és del
nucli i ja ve. El que sí que has de fer és deixar-lo a la llista `TRIGGERS` i
a `instalaTriggers()`, retallant-ne els dels mòduls que ja no hi són. La regla
que hi ha escrita al fitxer —tot `newTrigger` ha de constar a `TRIGGERS`— val
igual a l'app nova: és el que impedeix que un automatisme quedi orfe.

## LES DADES — AQUÍ CAL ANAR A POC A POC

Fulls que se'n porta, **set**: `Moviments`, `Categories`, `Recurrents`,
`FinancesMemoria`, `Pressupostos`, `Patrimoni`, `PatrimoniHistoric`.

Es **copien**, no es mouen. L'original es queda intacte.

**`Moviments` és el full més gran i el que més em costaria refer**: el banc
només em dona 90 dies enrere, o sigui que tot el que sigui més vell que això
**no es pot tornar a baixar**. Si es perd, es perd.

Compta les files del full original i del nou i comprova que quadren abans de
seguir. No donis per fet que una còpia ha anat bé.

## EL BANC: NO EL CONNECTIS FINS AL FINAL

Les propietats `EB_APP_ID`, `EB_PRIVATE_KEY`, `BANC_NOM` i `FINANCES_BANC`
són les del banc. **Posa-les l'últim de tot**, quan la resta de l'app ja
funcioni amb les dades copiades.

Dues coses que ja han passat i que no vull repetir:
- **Un `WRONG_TRANSACTIONS_PERIOD` (422)** si demanes més dies dels que el banc
  dona. El codi ja porta una escala que baixa fins que troba la finestra bona i
  se la desa. No la treguis.
- **La clau privada tal com la deixa el quadre de propietats d'Apps Script**
  porta sorpreses de format. Hi ha `arreglaClauBanc()` per això i hi ha proves
  que ho cobreixen.

## UNA COSA QUE NO POT TORNAR A PASSAR

Els **rebuts fixos no han d'escriure res**. En un moment donat creaven
moviments inventats i em van sortir despeses duplicades; pitjor encara, un
moviment inventat **silenciava l'avís de «no ha arribat»**. Ara
`generaRecurrents` torna llista buida quan el banc està connectat, perquè la
font és el banc i prou. **Això s'ha de quedar com està.**

## L'ADREÇA

**`poldpm-apps.github.io/finances`**, al repositori `poldpm-apps/finances`. Decidit: res
de domini propi, que s'ha de comprar i jo no pago res.

Compte amb el subcamí: l'app no viu a l'arrel sinó a `/finances/`. Al pla hi ha
la secció «El parany del subcamí» amb l'única cosa que s'ha de canviar a mà
—el camp `"id"` del `manifest.webmanifest`, que a JEFE és absolut— i amb els
dos llocs on ja hi ha un comentari explicant un error que es va cometre per
això mateix. **Llegeix-lo.**

## L'ICONA

**Dissenya-la tu.** Un SVG, com les de JEFE: traç, sense farciment, que es
llegeixi a 24 px i també com a icona d'app instal·lada.

El llenguatge visual de JEFE és un **full de mapa topogràfic**: corbes de
nivell, quadrícula UTM, cantonades rectes —els mapes no en tenen de rodones—,
i una rampa de color de vall a cim. L'icona d'aquesta app ha de sortir d'aquí
i del que és de debò: **el relleu d'un mes**, el que entra i el que surt.
Pensa-hi des del contingut, no des del catàleg d'icones de diners: una moneda,
un porquet o un bitllet serien la resposta de qualsevol.

Em dones **tres propostes diferents de debò** —no la mateixa amb variacions—,
cadascuna amb una frase de per què, i les miro abans que n'implementis cap.
Calen tres mides: la del dins de l'app (`ui_icones.html`), la `icona.svg` i la
`icona-maskable.svg`.

## COM SABREM QUE FUNCIONA

- `npm run comprova` passa.
- La pantalla es pinta al navegador amb el mirall a 375 px i a escriptori,
  sense cap error de consola.
- **El nombre de moviments del mes quadra amb el de JEFE.** Això primer.
- Les categories i els pressupostos hi són tots.
- La pantalla de Revisar classifica i ho recorda.
- El patrimoni surt amb el seu històric.
- Només al final: el banc sincronitza i no demana més dies dels que dona.

Les eines que has de copiar i què s'ha de retallar de cada una són a la secció
«LES EINES I ELS FITXERS D'ARREL» del pla. Llegeix-la: no hi era quan es va fer
la de Nutrició i es va haver de deduir.

De les proves de JEFE, a `eines/prova.mjs` hi ha moltes seccions d'aquesta app
—el banc (918), els comptes duplicats (1019, 1188, 1243), la clau (1694, 1739),
els rebuts fixos (2502), qui cobra (2688, 2793), el vigilant (3022) i la
pantalla de rebuts (3140). **Porta-te-les totes**: són el que impedeix que
tornin els errors que ja hem passat.

---

Comença llegint el pla i fes-me les preguntes que calgui **abans** de copiar
res. Amb aquesta app vull anar a poc a poc: és on hi ha les dades que no es
poden tornar a baixar.
