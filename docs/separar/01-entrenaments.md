# Encàrrec: l'app d'Entrenaments

> Això és el primer missatge d'una conversa nova de Claude Code.
> Enganxa-ho sencer.

---

Hola. Farem una app a partir d'un mòdul d'una app més gran que es diu JEFE.
Jo soc en **Pol del Pozo**, mestre de 2n de primària a l'Escola Vedruna
Escorial de Vic. JEFE l'he deixat de fer servir i en vull treure quatre apps
independents; aquesta és **la primera de les quatre i fa de prova del
procediment**, perquè és la més petita.

**Llegeix primer `C:\Claude\Popu\docs\separar\00-el-pla.md`.** Hi ha
l'arquitectura, per què es pot partir net, com es copien les dades i les normes
que valen per a totes quatre. Aquest document només hi afegeix el que és
d'aquesta app.

## QUÈ HA DE SER

Una app que faci **exactament el que fa ara l'apartat d'Entrenaments de JEFE**,
ni més ni menys. Res de funcions noves. Si alguna cosa no la pots fer igual,
atura't i digues-m'ho abans de canviar-la.

Què fa, ara mateix:
- Apuntar sessions d'entrenament: mena, títol, km, desnivell, minuts, kcal,
  pulsacions, notes.
- El **km-esforç**: km + desnivell/100. És la xifra que ho resumeix tot.
- Una gràfica de les dotze últimes setmanes.
- Els passos setmanals.
- **Importar una captura de pantalla de Strava**: li passes la foto, Gemini la
  llegeix i et torna una **proposta** que has de confirmar. Mai escriu res
  sense que tu ho acceptis, i les files dubtoses van marcades.

## D'ON SURT

Origen: `C:\Claude\Popu` (el repositori de JEFE). **Només es llegeix.**
No modifiquis res d'allà dins.

Fitxers propis d'aquesta app:
- `apps-script/40_Mod_Entrenaments.gs`
- `apps-script/vista_entrenaments.html`

Més el nucli i el frontal de la llista del pla, copiats sense tocar.

Del `90_Instalacio.gs` només calen: `configuraJefe()` (canvia-li el nom a
`configura()`), `generaClauAcces()`, `instalaTriggers()` i `treuTriggers()`,
`triggerManteniment()` i `provaEntrenaments()`. La resta fora.

A `instalaTriggers()` hi ha la llista `TRIGGERS` i la regla que tot
`newTrigger` hi ha de constar: retalla-la als que queden i deixa la regla, que
és el que impedeix que un automatisme quedi orfe.

## LES DADES

Fulls que se'n porta: **`Entrenaments`** i **`EntrenamentsPassos`**.

Es **copien** del full «JEFE — Assistent», no es mouen. L'original es queda
intacte. Al pla hi ha com es fa sense risc.

⚠️ **Aquests dos fulls potser els necessita també l'app del Seguiment FitFat.**
Abans de copiar-los, mira la secció «LA DECISIÓ QUE NO PUC PRENDRE JO» del pla
i pregunta-m'ho. Segons què decideixi, aquesta app i FitFat compartiran full de
càlcul o no.

## UNA COSA QUE NO S'HA PROVAT MAI

La importació de captures de Strava **no s'ha provat mai amb una captura de
debò**. Està feta i té proves amb imatges inventades, però la lectura de la
data i del desnivell contra una pantalla real de Strava és verda.

No la donis per bona. Quan l'app funcioni, demana-me'n una de real i proveu-la
junts abans de dir que va.

## L'ICONA

**Dissenya-la tu.** Un SVG, com les de JEFE: traç, sense farciment, que es
llegeixi a 24 px i també com a icona d'app instal·lada.

El llenguatge visual de JEFE és un **full de mapa topogràfic**: corbes de
nivell, quadrícula UTM, cantonades rectes —els mapes no en tenen de rodones—,
i una rampa de color de vall a cim. L'icona d'aquesta app ha de sortir d'aquí
i del que és: **el desnivell**. Pensa-hi des del contingut, no des del catàleg
d'icones d'esport: una sabatilla o una peseta serien la resposta de qualsevol.

Em dones **tres propostes diferents de debò** —no la mateixa amb variacions—,
cadascuna amb una frase de per què, i les miro abans que n'implementis cap.
Calen tres mides: la del dins de l'app (`ui_icones.html`), la `icona.svg` i la
`icona-maskable.svg`.

## COM SABREM QUE FUNCIONA

- `npm run comprova` passa.
- La pantalla es pinta al navegador amb el mirall (`npm run mirall`) a 375 px
  i a escriptori, sense cap error de consola.
- Apuntar una sessió la desa i es veu després de recarregar.
- La gràfica de dotze setmanes surt amb les dades de debò copiades.
- La captura de Strava torna una proposta i **no escriu fins que la confirmo**.

De les proves de JEFE, la secció «els entrenaments: la càrrega» de
`eines/prova.mjs` (cap a la ratlla 3168) és d'aquesta app: porta-te-la.

---

Comença llegint el pla i fes-me les preguntes que calgui **abans** de copiar
res. Si alguna cosa del pla no quadra amb el que et trobis al codi, el codi
mana i m'ho dius.
