# Encàrrec: l'app del cos — Seguiment FitFat i Entrenaments

> Això és el primer missatge d'una conversa nova de Claude Code.
> Enganxa-ho sencer.

---

Hola. Farem una app a partir de dos mòduls d'una app més gran que es diu JEFE.
Jo soc en **Pol del Pozo**, mestre de 2n de primària a l'Escola Vedruna
Escorial de Vic. JEFE l'he deixat de fer servir i en vull treure apps
independents. Aquesta és **la segona de tres**; abans s'ha fet la de Nutrició,
que feia de prova del procediment.

**Llegeix primer `C:\Claude\Popu\docs\separar\00-el-pla.md`.** Hi ha
l'arquitectura, com es copien les dades i les normes que valen per a totes.
Aquest document només hi afegeix el que és d'aquesta app.

## DUES PANTALLES, UNA SOLA APP

Això no són dos mòduls que casualment van junts: **són la mateixa cosa**. El
cos i el que hi faig. El control setmanal mesura el cos; els entrenaments són
el que l'explica.

I hi ha un motiu tècnic que és el que ho va decidir: el Seguiment **llegeix**
els entrenaments. Al control setmanal hi surt la càrrega de la setmana
—km-esforç, sessions, desnivell, trail— i surt del mòdul d'Entrenaments
(`40_Mod_Seguiment.gs:588`, funció `carregues_`).

**Posant-los al mateix projecte no s'ha de tocar ni una línia.** `carregues_`
fa `typeof Entrenaments === 'undefined'` i amb els dos mòduls junts allò passa
sol. Si et veus temptat de reescriure aquella funció, atura't: és senyal que
alguna cosa s'ha copiat malament.

## QUÈ HA DE SER

Una app que faci **exactament el que fan ara els apartats de Seguiment FitFat
i d'Entrenaments de JEFE**. Res de funcions noves. Si alguna cosa no la pots
fer igual, atura't i digues-m'ho abans de canviar-la.

### La pantalla del Seguiment

- El **control setmanal, els diumenges a les 6:00**. El dia viu en un sol lloc
  (`diaDelControl()`, que llegeix el full) i no s'ha de repetir enlloc més.
- Apuntar pes, cintura, força, trail, energia, son, gana i dieta.
- **Fotos de cos**: frontal, perfil i esquena. Van al Drive.
- **L'anàlisi de les fotos amb IA**: compara la més antiga amb l'actual de cada
  angle i les comenta. No és una galeria: la gràcia és que les miri algú que en
  sàpiga, perquè jo ja em veig cada dia al mirall.
- Les fotos **van amagades per defecte**. No les vull veure cada vegada que
  entro.
- El comentari setmanal de l'entrenador, amb els vuit últims controls, els
  objectius de la fase i el resum del pla.
- Al resum de la setmana hi ha de sortir **pes, cintura, força i trail**, i el
  trail com a dada de primera, no a sota com a secundària.

### La pantalla d'Entrenaments

- Apuntar sessions: mena, títol, km, desnivell, minuts, kcal, pulsacions, notes.
- El **km-esforç**: km + desnivell/100. És la xifra que ho resumeix tot.
- Una gràfica de les dotze últimes setmanes.
- Els passos setmanals.
- **Importar una captura de pantalla de Strava**: li passes la foto, Gemini la
  llegeix i et torna una **proposta** que has de confirmar. Mai escriu res
  sense que jo ho accepti, i les files dubtoses van marcades.

## D'ON SURT

Origen: `C:\Claude\Popu` (el repositori de JEFE). **Només es llegeix.**
No modifiquis res d'allà dins.

Fitxers propis d'aquesta app, **quatre**:
- `apps-script/40_Mod_Seguiment.gs`
- `apps-script/vista_seguiment.html`
- `apps-script/40_Mod_Entrenaments.gs`
- `apps-script/vista_entrenaments.html`

Més el nucli i el frontal de la llista del pla, copiats sense tocar.

Del `90_Instalacio.gs` calen: `configuraJefe()` (canvia-li el nom a
`configura()`), `generaClauAcces()`, `instalaTriggers()` i `treuTriggers()`,
`triggerManteniment()`, `triggerAvisos()`, `provaAvisos()`, `provaFotos()` i
`provaEntrenaments()`. La resta fora.

A `instalaTriggers()` hi ha la llista `TRIGGERS` i la regla que tot
`newTrigger` hi ha de constar: retalla-la als que queden i deixa la regla, que
és el que impedeix que un automatisme quedi orfe.

## LES DADES

Fulls que se'n porta, **quatre**: `Seguiment`, `SeguimentPla`, `Entrenaments`
i `EntrenamentsPassos`.

Es **copien** del full «JEFE — Assistent», no es mouen. L'original es queda
intacte. Al pla hi ha com es fa sense risc.

**Les fotos són a una carpeta del Drive**, no al full. Comprova que l'app nova
hi arriba abans de donar res per fet: si no, em quedo sense l'històric de
fotos, que és el que més costaria de refer.

## TRES COSES QUE S'HAN DE RESPECTAR

**L'avís del control setmanal.** És l'únic avís programat de tot JEFE
(`avisos`, amb el `dia` com a funció que llegeix el full). S'ha de tornar a
crear al projecte nou i **comprovar que dispararia** amb `provaAvisos()`: un
avís programat falla en silenci, i te n'assabentes per no rebre res, que és la
pitjor manera d'assabentar-se'n.

**La resposta de la IA es pot tallar.** El nucli ja ho detecta
(`motiuFi === 'MAX_TOKENS'`): reintenta amb el triple de sostre i, si encara
es talla, ho marca. **No treguis això.** Em va passar: vaig rebre mitja lectura
de les fotos com si fos sencera i em va semblar una resposta acabada.

**La importació de Strava no s'ha provat mai amb una captura de debò.** Està
feta i té proves amb imatges inventades, però la lectura de la data i del
desnivell contra una pantalla real de Strava és verda. No la donis per bona:
quan l'app funcioni, demana-me'n una de real i proveu-la junts.

## L'ADREÇA

**`poldpm.github.io/cos`**, al repositori `poldpm/cos`. Res de domini
propi: s'ha de comprar i jo no pago res.

Compte amb el subcamí: l'app no viu a l'arrel sinó a `/cos/`. Al pla hi ha
la secció «El parany del subcamí» amb l'única cosa que s'ha de canviar a mà: el
camp `"id"` del `manifest.webmanifest`, que a JEFE és absolut i diu `/jefe/`.
La resta de camins ja són relatius i viatgen sols.

## L'ICONA

**Dissenya-la tu.** Un SVG, com les de JEFE: traç, sense farciment, que es
llegeixi a 24 px i també com a icona d'app instal·lada.

El llenguatge visual de JEFE és un **full de mapa topogràfic**: corbes de
nivell, quadrícula UTM, cantonades rectes —els mapes no en tenen de rodones—,
i una rampa de color de vall a cim. L'icona ha de sortir d'aquí i del que és
l'app: **un cos que canvia a poc a poc i el desnivell que se l'ha fet**. Les
dues coses alhora, que per això van juntes. Pensa-hi des del contingut, no des
del catàleg d'icones d'esport: una bàscula, un bíceps o una sabatilla serien la
resposta de qualsevol.

Em dones **tres propostes diferents de debò** —no la mateixa amb variacions—,
cadascuna amb una frase de per què, i les miro abans que n'implementis cap.
Calen tres mides: la del dins de l'app (`ui_icones.html`), la `icona.svg` i la
`icona-maskable.svg`.

**I dues icones més petites**, una per pantalla, per al menú d'inici: la del
Seguiment i la dels Entrenaments. A JEFE ja n'hi ha; mira si et serveixen o si
val més refer-les perquè es distingeixin bé entre elles.

## COM SABREM QUE FUNCIONA

- `npm run comprova` passa.
- Les **dues** pantalles es pinten al navegador amb el mirall
  (`npm run mirall`) a 375 px i a escriptori, sense cap error de consola.
- **Les fotos velles es veuen.** Això és el que vull veure primer.
- Les fotos segueixen amagades fins que les demano.
- Un control setmanal es desa i surt a l'històric.
- **Al control setmanal hi surt la càrrega de la setmana.** Aquesta és la prova
  que els dos mòduls es parlen: si surt buida, alguna cosa s'ha copiat malament.
- Apuntar una sessió la desa i la gràfica de dotze setmanes la recull.
- La captura de Strava torna una proposta i **no escriu fins que la confirmo**.
- L'avís del diumenge existeix i `provaAvisos()` diu que dispararia.

De les proves de JEFE, a `eines/prova.mjs` són d'aquesta app les seccions «les
dues còpies de les regles del seguiment» (ratlla 2137), «les fotos serveixen
per a algú» (2334), «els entrenaments: la càrrega» (3168), «la imatge de prova
de provaEntrenaments() és una imatge» (3389) i «la pantalla del seguiment, per
parts» (3421). **Porta-te-les totes.**

---

Comença llegint el pla i fes-me les preguntes que calgui **abans** de copiar
res. Si alguna cosa del pla no quadra amb el que et trobis al codi, el codi
mana i m'ho dius.
