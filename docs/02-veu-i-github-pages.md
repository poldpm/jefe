# JEFE — la veu, i com treure la interfície d'Apps Script

## Per què cal fer això

Apps Script serveix les seves pàgines **dins d'un iframe** que no delega permís
de micròfon. El navegador el bloqueja sense preguntar-te res: per això no et
sortia cap finestreta de permisos. No hi ha cap opció ni cap truc de codi que
ho canviï.

La sortida és servir la pantalla des d'un altre lloc — GitHub Pages — i deixar
Apps Script fent només de servidor de dades.

## El que canvia, i el preu

| | Abans | Ara |
|---|---|---|
| Qui hi pot entrar | Només el teu compte de Google | Qui tingui l'URL **i** la clau |
| Micròfon | Bloquejat sempre | Funciona |
| On viuen les dades | El teu full de càlcul | Igual: el teu full de càlcul |
| La clau | — | Al teu navegador. Mai al repositori |

**Llegeix això dues vegades:** el desplegament passa a ser d'accés «Qualsevol».
La porta la tanca una clau de 48 caràcters. Qui tingui la clau i l'URL pot
llegir les teves dades. No la posis mai en un fitxer, ni en un missatge, ni
en cap repositori.

Si algun dia sospites que se t'ha escapat: executa `generaClauAcces()` altre
cop. La clau vella deixa de servir a l'instant.

---

## 1. Genera la clau

A l'editor d'Apps Script, obre `90_Instalacio.gs` → funció **`generaClauAcces`**
→ **Executa**. Copia la clau del registre.

## 2. Torna a desplegar amb accés obert

**Desplega → Gestiona desplegaments** → ✏️ editar:

| Camp | Valor |
|---|---|
| Versió | **Nova versió** |
| Executa com | **Jo** |
| Qui hi té accés | **Qualsevol** ← això és el que canvia |

Copia l'**URL del desplegament**. Acaba en `/exec`.

> «Qualsevol» vol dir que qualsevol pot cridar l'adreça, no que pugui llegir
> res: sense la clau correcta el servidor ni tan sols mira què li demanes.

## 3. Crea el repositori

A [github.com/new](https://github.com/new): nom **`jefe`**, i aquí **sí que ha
de ser públic** — GitHub Pages no serveix repositoris privats al pla gratuït.

> Que el repositori sigui públic **no exposa cap dada teva**: només hi ha el
> codi de la interfície. Ni la clau, ni l'URL del desplegament, ni res del
> full de càlcul. El `.gitignore` ja ho bloqueja.

Després, des de `C:\Claude\Popu`:

```bash
git remote set-url origin https://github.com/poldpm/jefe.git
```

```bash
git push -u origin main
```

## 4. Engega GitHub Pages

Al repositori: **Settings → Pages**

| Camp | Valor |
|---|---|
| Source | Deploy from a branch |
| Branch | `main` |
| Folder | **`/ (root)`** |

Desa i espera un o dos minuts. L'adreça serà:

```
https://poldpm.github.io/jefe/
```

## 5. Connecta

Obre aquella adreça. Et demanarà dues coses:

1. **URL del desplegament** — la del pas 2, la que acaba en `/exec`
2. **Clau d'accés** — la del pas 1

Es desen només en aquest navegador. Un cop connectat, ja no t'ho torna a
demanar.

## 6. Afegeix-lo a la pantalla d'inici

Al mòbil, amb la pàgina oberta: menú ⋮ → **Afegeix a la pantalla d'inici**.
La primera vegada que premis el micròfon et demanarà permís. **Digues que sí i
tria «Mentre s'utilitza l'aplicació».**

---

## Com es fa servir la veu

Toca el micròfon un cop: es queda **escoltant**. No cal tornar-lo a prémer.

Digues **«JEFE»** i tot seguit la pregunta:

> «JEFE, com he anat aquest mes?»

Sense la paraula clau t'ignora, perquè si no saltaria amb qualsevol conversa
de casa. Mentre JEFE parla, deixa d'escoltar: si no, se sentiria a ell mateix.

Per aturar-lo, torna a tocar el micròfon.

---

## Manteniment

Quan hi hagi codi nou, una sola comanda fa les tres coses:

```bash
npm.cmd run puja
```

Comprova el codi, el puja a Apps Script i regenera `index.html`.
Després, per publicar la interfície:

```bash
git add -A; git commit -m "canvis"; git push
```

> `index.html` (a l'arrel) **es genera**, no s'edita. La font són els fitxers de
> `apps-script/`. Si l'edites a mà, el següent `npm.cmd run construeix` te'l
> sobreescriurà.

## Si alguna cosa falla

| Símptoma | Causa |
|---|---|
| «Clau d'accés incorrecta» | La clau no coincideix. Torna a executar `generaClauAcces` i enganxa-la de nou |
| «El servidor ha respost 401/403» | El desplegament no és d'accés «Qualsevol», o no has fet **versió nova** |
| «Failed to fetch» | L'URL no acaba en `/exec`, o has posat la de `/dev` (aquella exigeix sessió de Google i no serveix des de fora) |
| Es veu el README en comptes de l'app | La carpeta ha de ser **`/ (root)`**. GitHub Pages només deixa triar entre l'arrel i `/docs`: cap altra carpeta hi surt |
| El micròfon segueix sense demanar permís | Comprova que estàs a `poldpm.github.io` i no a `script.google.com` |
