# Encàrrec: l'app de Nutrició

> Això és el primer missatge d'una conversa nova de Claude Code.
> Enganxa-ho sencer.

---

Hola. Farem una app a partir d'un mòdul d'una app més gran que es diu JEFE.
Jo soc en **Pol del Pozo**, mestre de 2n de primària a l'Escola Vedruna
Escorial de Vic. JEFE l'he deixat de fer servir i en vull treure tres apps independents.
Aquesta és **la primera de les tres, i fa de prova del procediment**: és la
més petita i no toca res de fora —ni banc, ni fotos al Drive, ni dependències
entre mòduls—. Si aquesta surt bé, les altres dues són el mateix.

**Llegeix primer `C:\Claude\Popu\docs\separar\00-el-pla.md`.** Hi ha
l'arquitectura, per què es pot partir net, com es copien les dades i les normes
que valen per a totes tres. Aquest document només hi afegeix el que és
d'aquesta app.

## QUÈ HA DE SER

Una app que faci **exactament el que fa ara l'apartat de Nutrició de JEFE**.
Res de funcions noves. Si alguna cosa no la pots fer igual, atura't i
digues-m'ho abans de canviar-la.

Què fa, ara mateix:
- Apuntar què menjo, per àpats: esmorzar, dinar, berenar, sopar.
- Un **rebost d'aliments guardats** amb kcal i proteïna per 100 g: els
  habituals s'apunten d'un toc.
- L'**activitat del dia** en kcal, que entra al balanç.
- El **balanç**, que és el centre de tot: no és una barra que s'omple, és un
  perfil amb l'equilibri al mig —dèficit cap a un costat, superàvit cap a
  l'altre— i una fita a l'objectiu. No és «omplir» res: és passar d'un punt.
- L'objectiu de proteïna, en anell.
- La setmana i el mes, amb la gràfica de balanç.
- L'importador de FitFat.

## D'ON SURT

Origen: `C:\Claude\Popu` (el repositori de JEFE). **Només es llegeix.**

Fitxers propis d'aquesta app:
- `apps-script/40_Mod_Nutricio.gs`
- `apps-script/vista_nutricio.html`

Més el nucli i el frontal de la llista del pla, copiats sense tocar.

Del `90_Instalacio.gs` calen: `configuraJefe()` (canvia-li el nom a
`configura()`), `generaClauAcces()`, `instalaTriggers()` i `treuTriggers()`,
`triggerManteniment()` i `triggerTancamentNutricio()`, que és el tancament del
dia cap a les deu del vespre. La resta fora.

A `instalaTriggers()` hi ha la llista `TRIGGERS` i la regla que tot
`newTrigger` hi ha de constar: retalla-la als que queden i deixa la regla.

## LES DADES

Fulls que se'n porta: **`Aliments`**, **`Ingestes`** i **`NutricioDies`**.

Es **copien** del full «JEFE — Assistent», no es mouen. L'original es queda
intacte. Al pla hi ha com es fa sense risc.

Aquesta app **no comparteix fulls amb cap altra**: és la més neta de les tres
pel que fa a dades, i per això va primera.

## UNA COSA QUE S'HA DE RESPECTAR

El tancament del dia (`triggerTancamentNutricio`) és un automatisme que
s'ha de tornar a crear al projecte nou. **Comprova que hi és** abans de dir
que l'app està acabada: un avís programat falla en silenci, i te n'assabentes
per no rebre res, que és la pitjor manera d'assabentar-se'n.

## L'ADREÇA

**`poldpm.github.io/nutricio`**, al repositori `poldpm/nutricio`. Res de domini
propi: s'ha de comprar i jo no pago res.

Compte amb el subcamí: l'app no viu a l'arrel sinó a `/nutricio/`. Al pla hi ha
la secció «El parany del subcamí» amb l'única cosa que s'ha de canviar a mà: el
camp `"id"` del `manifest.webmanifest`, que a JEFE és absolut i diu `/jefe/`.
La resta de camins ja són relatius i viatgen sols.

## L'ICONA

**Dissenya-la tu.** Un SVG, com les de JEFE: traç, sense farciment, que es
llegeixi a 24 px i també com a icona d'app instal·lada.

El llenguatge visual de JEFE és un **full de mapa topogràfic**: corbes de
nivell, quadrícula UTM, cantonades rectes —els mapes no en tenen de rodones—,
i una rampa de color de vall a cim. L'icona d'aquesta app ha de sortir d'aquí
i del que és de debò aquesta pantalla: **el balanç**, l'equilibri al mig i les
dues bandes. Pensa-hi des del contingut, no des del catàleg d'icones de
menjar: uns coberts o una poma serien la resposta de qualsevol.

Em dones **tres propostes diferents de debò** —no la mateixa amb variacions—,
cadascuna amb una frase de per què, i les miro abans que n'implementis cap.
Calen tres mides: la del dins de l'app (`ui_icones.html`), la `icona.svg` i la
`icona-maskable.svg`.

## COM SABREM QUE FUNCIONA

- `npm run comprova` passa.
- La pantalla es pinta al navegador amb el mirall (`npm run mirall`) a 375 px
  i a escriptori, sense cap error de consola.
- Apuntar un aliment el desa i surt després de recarregar.
- El rebost recorda els aliments que hi deso.
- El balanç del dia quadra amb el que hi ha apuntat.
- El tancament del vespre existeix com a automatisme.

De les proves de JEFE, busca a `eines/prova.mjs` les seccions de nutrició i
porta-te-les.

---

Comença llegint el pla i fes-me les preguntes que calgui **abans** de copiar
res. Si alguna cosa del pla no quadra amb el que et trobis al codi, el codi
mana i m'ho dius.
