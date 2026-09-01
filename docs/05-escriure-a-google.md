# Escriure al Calendar i a Tasks de Google

> Document per passar a una altra app perquè implementi la part d'ESCRIPTURA
> contra Google. Es pot enganxar sencer com a instruccions.
>
> Verificat contra la documentació de Google el 2 de setembre del 2026:
> Calendar API v3 (`events.insert`) i Tasks API v1 (recurs `Task`).

---

## Què has de fer

Ara l'app **llegeix** esdeveniments del Calendar i tasques de Tasks. Ha de poder
**escriure-hi**: quan l'usuari crea una tasca o un esdeveniment des de l'app,
ha d'aparèixer al seu Google, i quan l'edita o l'esborra des de l'app, ha de
canviar allà mateix i no duplicar-se.

No és «afegir una crida POST». El que converteix això en una integració que
aguanta són cinc regles que no es veuen fins que ja tens el calendari brut.

---

## Les cinc regles

### 1. Guarda l'identificador que et torna Google. Sempre.

Quan crees un esdeveniment o una tasca, la resposta porta un `id`. **Desa'l a
la teva base de dades, a la fila d'aquell element.**

Sense l'id no pots editar ni esborrar res: l'única cosa que et queda és tornar
a crear-ho, i llavors cada vegada que l'usuari corregeixi una hora tindrà dos
esdeveniments. És l'error més car d'aquesta integració perquè no peta: es va
acumulant i te n'adones quan ja tens el calendari ple de bessons.

Guarda també de quin calendari o de quina llista és (`calendarId`,
`tasklist`): un id sol no diu on viu.

### 2. Crear ha de ser repetible sense fer mal

Una petició pot fallar després que Google l'hagi feta —es talla la connexió, es
mor el procés— i si reintentes, en tens dos.

Al **Calendar** això té solució de debò: pots enviar tu l'`id` en crear-lo. Si
ja existeix, Google contesta `409` i tu ja saps que la primera vegada va
funcionar. L'id té regles estrictes:

- només minúscules de la **a** a la **v** i xifres del **0** al **9**
  (codificació base32hex; res de guions, ni majúscules, ni lletres a partir de la w)
- entre **5 i 1024** caràcters
- únic dins d'aquell calendari

La manera pràctica: genera un UUID v4, treu-ne els guions i tradueix cada
caràcter fora de l'abecedari permès. Desa'l abans d'enviar la petició, no
després.

A **Tasks** no existeix aquest mecanisme. Allà l'has de resoldre tu: abans de
reintentar, mira si ja tens l'id desat; si el tens, no ho tornis a crear.

### 3. Un esdeveniment té hora de fi, i no és «una hora després»

`start` i `end` són els dos únics camps obligatoris de `events.insert`. Posar
per defecte «inici + 1 hora» quan la font en diu una altra és un error viscut:
una reunió de 9 a 11 entra de 9 a 10, i el mal no és l'hora que falta —és que
al calendari les 10 queden lliures i l'usuari hi encavalca una altra cosa a
sobre d'una reunió on hi és.

Una hora és el que dura un esdeveniment **quan no se sap res**. Si l'app té la
dada, ha de guanyar sempre.

I si l'hora de fi és anterior a la d'inici («de 23.00 a 00.30»), vol dir
l'endemà, no una durada negativa.

### 4. Digues la zona horària. No la dedueixis.

Per a un esdeveniment amb hora:

```json
{
  "summary": "Reunió de cicle",
  "start": { "dateTime": "2026-09-02T09:00:00", "timeZone": "Europe/Madrid" },
  "end":   { "dateTime": "2026-09-02T11:00:00", "timeZone": "Europe/Madrid" }
}
```

Amb `dateTime` cal **o bé** el desplaçament dins de la cadena
(`2026-09-02T09:00:00+02:00`) **o bé** el camp `timeZone`. Si no en poses cap,
Google ho interpreta amb la zona del calendari i tard o d'hora el sopar de
Nadal cau a les 23:00 del dia abans.

Per a un esdeveniment de tot el dia s'usa `date` en comptes de `dateTime`, i
**`end` és exclusiu**:

```json
{
  "summary": "Excursió",
  "start": { "date": "2026-09-02" },
  "end":   { "date": "2026-09-03" }
}
```

Un sol dia = l'endemà a `end`. Posar-hi el mateix dia és un esdeveniment buit.

### 5. UNA TASCA DE GOOGLE NO TÉ HORA

Aquesta és la que fa perdre més temps, perquè la documentació la diu de passada
i l'API no es queixa. Al recurs `Task`, del camp `due`:

> *Only date information is recorded; the time portion of the timestamp is
> discarded when setting this field. It isn't possible to read or write the time
> that a task is scheduled for using the API.*

O sigui: envies `2026-09-02T15:00:00.000Z`, Google t'ho accepta sense error, i
la tasca queda al dia 2 **sense hora**. Si la teva interfície deixa posar-hi
una hora i després no hi és, l'usuari pensarà que s'ha perdut.

Tampoc pots posar **recordatoris** ni **repeticions** per l'API.

Tria una de les tres i digues-la clarament a la interfície:

- **No demanis hora a les tasques.** La més honesta si l'app és per a Tasks.
- **Si l'usuari hi posa hora, crea un esdeveniment al Calendar** en comptes
  d'una tasca. És on una hora vol dir alguna cosa.
- **Guarda l'hora només a la teva base de dades** i escriu-la també a `notes`
  («A les 15:00»), perquè almenys es vegi dins de Google.

El que no pots fer és acceptar l'hora, enviar-la i callar.

---

## El contracte, en concret

### Permisos (OAuth)

| Per a què | Scope |
|---|---|
| Llegir i escriure esdeveniments | `https://www.googleapis.com/auth/calendar.events` |
| Calendari sencer (si també toques calendaris) | `https://www.googleapis.com/auth/calendar` |
| Llegir i escriure tasques | `https://www.googleapis.com/auth/tasks` |

Si l'app ja té permís de lectura, **caldrà tornar a demanar consentiment**: els
scopes d'escriptura són uns altres. Preveu-ho a la interfície en comptes de
deixar que l'usuari es trobi un 403 sense explicació.

### Calendar

| Acció | Petició |
|---|---|
| Crear | `POST /calendar/v3/calendars/{calendarId}/events` |
| Modificar | `PATCH /calendar/v3/calendars/{calendarId}/events/{eventId}` |
| Esborrar | `DELETE /calendar/v3/calendars/{calendarId}/events/{eventId}` |

`{calendarId}` pot ser `primary`. Camps útils: `summary`, `description`,
`location`, `reminders` (`useDefault`, o `overrides[]` amb `method` `popup` o
`email` i `minutes`), i el paràmetre `sendUpdates` (`all` / `externalOnly` /
`none`) quan hi ha convidats.

Fes servir **PATCH i no PUT** per modificar: PUT substitueix l'esdeveniment
sencer i s'endú per davant els camps que no enviïs.

### Tasks

| Acció | Petició |
|---|---|
| Crear | `POST /tasks/v1/lists/{tasklist}/tasks` |
| Modificar | `PATCH /tasks/v1/lists/{tasklist}/tasks/{task}` |
| Completar | `PATCH` amb `{"status":"completed"}` |
| Esborrar | `DELETE /tasks/v1/lists/{tasklist}/tasks/{task}` |

`{tasklist}` pot ser `@default`. Camps: `title` (fins a 1024 caràcters),
`notes` (fins a 8192), `due` (**només data**), `status`
(`needsAction` / `completed`), i `parent` i `previous` per a subtasques i ordre.

---

## Errors: què vol dir cadascun

| Codi | Què ha passat | Què has de fer |
|---|---|---|
| `401` | La sessió ha caducat | Refresca el token i reintenta un cop |
| `403` | Falta el permís, o has passat de quota | Si és permís, torna a demanar consentiment. Si és quota, espera |
| `404` | Aquell esdeveniment o tasca ja no hi és | L'usuari l'ha esborrat des de Google. Treu-lo del teu costat també |
| `409` | Ja existeix un esdeveniment amb aquell id | **No és un error**: la creació anterior va funcionar |
| `410` | El token de sincronització ja no val | Torna a fer una sincronització completa |
| `429` i `5xx` | Google va carregat | Reintenta amb espera creixent (1s, 4s, 16s) i un límit d'intents |

Reintentar només té sentit a les tres últimes files. Reintentar un `403` de
permís és gastar peticions per acabar igual.

---

## Què ha de veure l'usuari

- **Confirmació amb les dues hores.** Si li dius «Reunió de cicle · 9:00», una
  que hagi entrat malament es veu igual de bé que una de correcta. Digues-li
  «9:00–11:00» i s'adonarà sol.
- **Si no s'ha pogut escriure, que ho sàpiga.** Una tasca que es queda a l'app i
  no arriba a Google és pitjor que un error, perquè l'usuari compta que hi és.
- **Sense connexió: encua-ho i envia-ho després**, però ensenya que hi ha coses
  pendents d'enviar.
- **Si es toca des de Google, guanya Google.** L'usuari ha vist aquell canvi amb
  els seus ulls; el teu és una còpia.

---

## Llista de comprovació abans de dir que està fet

- [ ] Es desa l'`id` de Google de cada element creat, amb el seu calendari o llista
- [ ] Editar des de l'app modifica el mateix element i no en crea un de nou
- [ ] Esborrar des de l'app l'esborra de Google
- [ ] Un esdeveniment amb hora porta `timeZone` o desplaçament
- [ ] Un esdeveniment de tot el dia té `end` al dia SEGÜENT
- [ ] L'hora de fi surt de la dada, i «+1 hora» només s'usa quan no n'hi ha
- [ ] Les tasques no prometen una hora que Google llençarà
- [ ] Un reintent després d'un tall de connexió no crea duplicats
- [ ] Un `404` en editar es tracta com «esborrat des de Google», no com una avaria
- [ ] La interfície diu què ha quedat pendent d'enviar
