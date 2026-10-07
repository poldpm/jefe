# Encàrrec: l'app del Seguiment FitFat

> Això és el primer missatge d'una conversa nova de Claude Code.
> Enganxa-ho sencer.

---

Hola. Farem una app a partir d'un mòdul d'una app més gran que es diu JEFE.
Jo soc en **Pol del Pozo**, mestre de 2n de primària a l'Escola Vedruna
Escorial de Vic. JEFE l'he deixat de fer servir i en vull treure quatre apps
independents. Aquesta és **la tercera**.

**Llegeix primer `C:\Claude\Popu\docs\separar\00-el-pla.md`.** Hi ha
l'arquitectura, com es copien les dades i les normes que valen per a totes
quatre. Aquest document només hi afegeix el que és d'aquesta app.

## ABANS DE RES: UNA DECISIÓ MEVA QUE T'HE DE DONAR

Aquesta app **llegeix els entrenaments**. Al control setmanal hi surt la
càrrega de la setmana —km-esforç, sessions, desnivell, trail— i això ve del
mòdul d'Entrenaments, que serà una altra app.

Està explicat a la secció «LA DECISIÓ QUE NO PUC PRENDRE JO» del pla, amb tres
sortides. **Pregunta-m'ho abans de començar** i no comencis fins que t'hagi
contestat: segons la resposta, aquesta app comparteix full de càlcul amb
Entrenaments, llegeix el full directament, o les dues coses van juntes en una
sola app.

## QUÈ HA DE SER

Una app que faci **exactament el que fa ara l'apartat de Seguiment FitFat de
JEFE**. Res de funcions noves.

Què fa, ara mateix:
- El **control setmanal, els diumenges a les 6:00**. El dia viu en un sol lloc
  (`diaDelControl()`, que llegeix el full) i no s'ha de repetir enlloc més.
- Apuntar pes, cintura, força, trail, energia, son, gana i dieta.
- **Fotos de cos**: frontal, perfil i esquena. Van al Drive.
- **L'anàlisi de les fotos amb IA**: compara la més antiga amb l'actual de cada
  angle i les comenta. No és una galeria: la gràcia és que les miri algú que
  en sàpiga, perquè jo ja em veig cada dia al mirall.
- Les fotos **van amagades per defecte**. No les vull veure cada vegada que
  entro.
- El comentari setmanal de l'entrenador, amb els vuit últims controls, els
  objectius de la fase i el resum del pla.
- Al resum de la setmana hi ha de sortir **pes, cintura, força i trail**, i el
  trail com a dada de primera, no a sota com a secundària.

## D'ON SURT

Origen: `C:\Claude\Popu` (el repositori de JEFE). **Només es llegeix.**

Fitxers propis d'aquesta app:
- `apps-script/40_Mod_Seguiment.gs`
- `apps-script/vista_seguiment.html`

Més el nucli i el frontal de la llista del pla, copiats sense tocar.

Del `90_Instalacio.gs` calen: `configuraJefe()` (canvia-li el nom a
`configura()`), `generaClauAcces()`, `instalaTriggers()` i `treuTriggers()`,
`triggerManteniment()`, `triggerAvisos()`, `provaAvisos()` i `provaFotos()`.
La resta fora.

A `instalaTriggers()` hi ha la llista `TRIGGERS` i la regla que tot
`newTrigger` hi ha de constar: retalla-la als que queden i deixa la regla.

## LES DADES

Fulls que se'n porta: **`Seguiment`** i **`SeguimentPla`**.

I, segons la decisió de dalt, potser també `Entrenaments` i
`EntrenamentsPassos`.

Es **copien**, no es mouen. L'original es queda intacte.

**Les fotos són a una carpeta del Drive**, no al full. Comprova que l'app nova
hi arriba abans de donar res per fet: si no, em quedo sense l'històric de
fotos, que és el que més costaria de refer.

## DUES COSES QUE S'HAN DE RESPECTAR

**L'avís del control setmanal.** És l'únic avís programat de tot JEFE
(`avisos`, amb el `dia` com a funció que llegeix el full). S'ha de tornar a
crear al projecte nou i **comprovar que dispararia**: un avís programat falla
en silenci.

**La resposta de la IA es pot tallar.** El nucli ja ho detecta
(`motiuFi === 'MAX_TOKENS'`): reintenta amb el triple de sostre i, si encara
es talla, ho marca. **No treguis això.** Em va passar: vaig rebre mitja lectura
de les fotos com si fos sencera.

## L'ICONA

**Dissenya-la tu.** Un SVG, com les de JEFE: traç, sense farciment, que es
llegeixi a 24 px i també com a icona d'app instal·lada.

El llenguatge visual de JEFE és un **full de mapa topogràfic**: corbes de
nivell, quadrícula UTM, cantonades rectes —els mapes no en tenen de rodones—,
i una rampa de color de vall a cim. L'icona d'aquesta app ha de sortir d'aquí
i del que és: **un cos que canvia a poc a poc, mesurat cada setmana**. Pensa-hi
des del contingut, no des del catàleg d'icones de gimnàs: una bàscula o un
bíceps serien la resposta de qualsevol.

Em dones **tres propostes diferents de debò** —no la mateixa amb variacions—,
cadascuna amb una frase de per què, i les miro abans que n'implementis cap.
Calen tres mides: la del dins de l'app (`ui_icones.html`), la `icona.svg` i la
`icona-maskable.svg`.

## COM SABREM QUE FUNCIONA

- `npm run comprova` passa.
- La pantalla es pinta al navegador amb el mirall a 375 px i a escriptori,
  sense cap error de consola.
- Un control setmanal es desa i surt a l'històric.
- **Les fotos velles es veuen.** Això és el que vull veure primer.
- Les fotos segueixen amagades fins que les demano.
- L'avís del diumenge existeix i `provaAvisos()` diu que dispararia.

De les proves de JEFE, les seccions «les dues còpies de les regles del
seguiment» (cap a la ratlla 2137), «les fotos serveixen per a algú» (2334) i
«la pantalla del seguiment, per parts» (3421) de `eines/prova.mjs` són
d'aquesta app: porta-te-les.

---

Comença preguntant-me la decisió dels entrenaments. Després llegeix el pla i
fes-me les preguntes que calgui **abans** de copiar res. Si alguna cosa del pla
no quadra amb el codi, el codi mana i m'ho dius.
