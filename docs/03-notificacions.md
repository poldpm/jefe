# JEFE — notificacions al mòbil

Quan això estigui fet, JEFE et podrà escriure **encara que tinguis l'app tancada
i el navegador tancat**. És el que el separa d'una eina que només parla quan
l'obres.

## Què cal, i per què és Firebase

L'estàndard de notificacions web exigeix signar amb ECDSA P-256 i xifrar el
contingut amb ECDH. Apps Script no té cap de les dues primitives. El que sí que
té és `computeRsaSha256Signature`, que és exactament el que cal per autenticar-se
com a compte de servei de Google. Per això Firebase: no és una preferència, és
l'única porta oberta des d'Apps Script.

## Dues claus, i no s'han de confondre

| | On va | Es pot publicar? |
|---|---|---|
| **Configuració web** (apiKey, appId, vapid) | `firebase.config.json`, al repositori | **Sí.** Firebase l'espera al codi del client i no dona accés a res |
| **Compte de servei** (JSON amb clau privada) | Script Properties → `FIREBASE_COMPTE` | **MAI.** Amb això s'hi pot enviar el que sigui en nom teu |

---

## 1. Crea el projecte de Firebase

[console.firebase.google.com](https://console.firebase.google.com) → **Crear un
proyecto**. Digue-li `jefe`. Quan et pregunti per Google Analytics, **desactiva'l**:
no en necessites res i només afegeix passos.

Fes-ho amb el mateix compte de Gmail que fas servir per a la resta.

## 2. Registra l'aplicació web

Dins del projecte: **⚙️ Configuración del proyecto → General**, baixa fins a
*Tus aplicaciones* i clica la icona **`</>`** (web).

- Sobrenom: `JEFE`
- **No** marquis Firebase Hosting
- **Registrar app**

Et sortirà un bloc de codi amb un objecte `firebaseConfig`. **Apunta'n quatre
valors:** `apiKey`, `projectId`, `messagingSenderId`, `appId`.

## 3. Genera la clau VAPID

> **Aquesta no surt al bloc `firebaseConfig` del pas anterior.** Es genera a
> part i viu en una altra pestanya. Si l'hi busques, no la trobaràs.

**⚙️ Configuración del proyecto → pestanya Cloud Messaging** (a dalt, al costat
de *General*), baixa fins a *Configuración web* → **Certificados push web** →
**Generar par de claves**.

Surt una clau llarga que comença per `B` i fa uns 87 caràcters. **Copia-la amb
la icona de copiar**, no seleccionant-la a mà: es mostra retallada, i si te'n
deixes un caràcter el registre del dispositiu fallarà sense dir-te per què.

Si la secció *Certificados push web* no hi és, l'API està desactivada: a la
mateixa pestanya, mira si *Firebase Cloud Messaging API (V1)* diu **Inhabilitada**,
activa-la i recarrega.

## 4. Genera el compte de servei

**⚙️ Configuración del proyecto → Cuentas de servicio** → **Generar nueva clave
privada** → **Generar clave**. Es descarrega un fitxer `.json`.

> Aquest fitxer és la clau de casa. No el deixis a Descàrregues, no l'enviïs per
> cap xat i no el posis al repositori.

Obre'l amb el bloc de notes i **copia'n tot el contingut**.

A l'editor d'Apps Script: **⚙️ Configuració del projecte → Propietats de
l'script → Afegeix propietat**

| Camp | Valor |
|---|---|
| Propietat | `FIREBASE_COMPTE` |
| Valor | Tot el contingut del `.json`, enganxat sencer |

Un cop enganxat, **esborra el fitxer descarregat**.

## 5. Omple la configuració pública

Obre `firebase.config.json` (a l'arrel del projecte) i posa-hi els cinc valors
dels passos 2 i 3:

```json
{
  "apiKey": "AIza…",
  "projectId": "jefe-xxxxx",
  "messagingSenderId": "123456789012",
  "appId": "1:123456789012:web:abc123",
  "vapidKey": "BN…"
}
```

Després:

```bash
npm.cmd run puja
```

```bash
git add -A; git commit -m "notificacions"; git push
```

## 6. Crea el full dels dispositius

A l'editor d'Apps Script, executa **`configuraJefe()`**.

Crea el full `_Dispositius`, on es desa quin telèfon ha de rebre què. No toca
res del que ja tens: només afegeix el que falta.

## 7. Activa-les al mòbil

Obre JEFE al telèfon, toca la **icona de quadrícula** de la capçalera, i prem
**«Activa les notificacions»**. Accepta el permís quan Android te'l demani.

> El permís s'ha de demanar des d'un toc teu. Si es demanés sol en carregar,
> Chrome el denegaria sense preguntar-te i no hi hauria manera de tornar-hi
> sense anar a la configuració del navegador.

## 8. Comprova-ho

A l'editor d'Apps Script, obre `90_Instalacio.gs` i executa **`provaNotificacio`**.

Si tot va bé, **et sonarà el telèfon**. Si no, el registre d'execució et dirà en
quin dels tres passos s'ha trencat.

> `provaNotificacio` **no comprova la configuració web**, i és a posta: si un
> dispositiu s'ha arribat a registrar, aquella configuració ja ha funcionat.
> Comprovar el resultat val més que repetir la declaració en dos llocs.

---

## Com funciona per dins

```
Trigger nocturn d'Apps Script
   ↓  signa un JWT amb la clau del compte de servei
Google OAuth  →  testimoni d'accés (dura 1 h, es desa 55 min a la memòria cau)
   ↓
FCM  →  el reparteix al telèfon
   ↓
firebase-messaging-sw.js  →  pinta la notificació encara que JEFE estigui tancat
```

Els dispositius es desen al full **`_Dispositius`**. Si un deixa de servir
—perquè has desinstal·lat l'app o el navegador ha renovat la fitxa— es marca
com a inactiu automàticament. **No s'esborra mai res**: queda l'històric amb
l'error que va donar.

Les notificacions porten **etiqueta**: dues amb la mateixa s'aixafen en comptes
d'acumular-se. Sense això, set recordatoris d'hàbits deixarien set línies a la
barra de notificacions.

## Si alguna cosa falla

| Símptoma | Causa |
|---|---|
| «Falta el compte de servei» | Script Properties → `FIREBASE_COMPTE` buit o mal enganxat |
| «No s'ha pogut autenticar amb Firebase» | El JSON del compte de servei no és del projecte correcte, o està retallat |
| «Firebase encara no està configurat» | `firebase.config.json` segueix amb els valors d'exemple, o no has fet `git push` |
| «Has denegat les notificacions» | Cadenat de la barra d'adreces → Notificacions → Permet |
| El botó diu «Aquest navegador no en pot rebre» | Safari a iOS només les admet amb l'app instal·lada a la pantalla d'inici |
| S'envien però no arriben | Mira `_Dispositius`: si `actiu` és `NO`, la fitxa ha caducat. Torna a activar-les des del mòbil |
