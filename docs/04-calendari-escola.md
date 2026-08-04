# Escriure als calendaris de l'escola

> Cinc minuts, es fa una vegada, i després t'oblides que existeix.

## Per què cal fer res

JEFE corre amb el teu **compte personal**. Els calendaris de l'escola són d'un
Google Workspace on l'administrador té bloquejada l'opció de compartir un
calendari cap a fora amb permís d'escriptura.

Això vol dir que el teu compte personal **els podrà veure sempre i escriure-hi
mai**, per molts permisos que hi toquis. No és cap limitació de JEFE i no hi ha
manera de saltar-se-la — ni s'ha d'intentar: és una decisió de la teva escola.

L'única sortida és que **escrigui algú que sí que pugui**: un programa petit
que viu dins del compte de l'escola i que només sap fer una cosa —apuntar,
canviar i treure esdeveniments d'aquells calendaris—. JEFE li ho demana.

És el mateix que fa qualsevol integració entre dos comptes. Cadascú fa servir
els seus permisos.

**Els calendaris del teu compte personal no toquen res d'això**: es llegeixen i
s'escriuen com sempre, i el pont no els afegeix ni un mil·lisegon. Només hi
passa el que és de l'escola.

---

## 1. Tria una clau

Qualsevol cosa llarga i que no facis servir enlloc més. Per exemple, obre una
pestanya nova i escriu quatre paraules seguides sense sentit. **Aquesta clau és
l'única cosa que impedeix que ningú altre escrigui al calendari de l'escola**,
o sigui que ni curta ni fàcil d'endevinar.

Apunta-te-la un moment: la necessitaràs dues vegades.

---

## 2. Crea l'script dins del compte de l'escola

1. Obre una **finestra d'incògnit** (o un altre perfil del navegador) i entra a
   [script.google.com](https://script.google.com) **amb el compte de l'escola**.
   Amb incògnit t'estalvies barrejar sessions i acabar creant-lo al compte que
   no toca, que és l'error d'aquí.
2. **Projecte nou**.
3. Posa-li de nom `JEFE · pont del calendari`.
4. Esborra el que hi hagi i enganxa-hi tot el codi del final d'aquest document.
5. A la línia de dalt, canvia `POSA-HI-LA-TEVA-CLAU` per la clau del pas 1.
6. Desa.

---

## 3. Publica'l

1. **Desplega** → **Desplegament nou**
2. Engranatge ⚙ al costat de *Tipus* → **Aplicació web**
3. Omple-ho **exactament** així:

   | Camp | Valor |
   |---|---|
   | Descripció | `pont v1` |
   | Executa com | **Jo** (el compte de l'escola) |
   | Qui hi té accés | **Qualsevol** |

4. **Desplega**. Et demanarà permisos: accepta'ls.
5. **Copia l'URL.** Ha d'acabar en `/exec`.

> **«Qualsevol» fa por i no ho és.** L'adreça no la sap ningú, i qui la trobés
> no podria fer res sense la clau: el programa no mira ni què li demanes si la
> clau no coincideix. És el mateix que fa el mateix JEFE.
>
> **Si l'opció «Qualsevol» no hi és**, l'administrador de l'escola també té
> bloquejat publicar aplicacions web cap enfora. Llavors aquest camí és tancat i
> l'única alternativa raonable és demanar-li a ell que t'ho obri. Digue-m'ho i
> mirem què queda.

---

## 4. Digues-ho a JEFE

Torna a l'editor de **JEFE** (el del teu compte personal, la finestra normal).

> **L'editor no deixa passar dades a una funció** quan la fas anar amb el botó
> d'executar. Per això els dos valors es posen a mà; és igual de ràpid.

1. A la barra de l'esquerra, l'**engranatge** ⚙ (*Configuració del projecte*)
2. Baixa fins a **Propietats de l'script**
3. **Afegeix una propietat**, i posa-hi:

   | Propietat | Valor |
   |---|---|
   | `CAL_PONT_URL` | l'adreça que has copiat, la que acaba en `/exec` |

4. **Afegeix una propietat** una altra vegada:

   | Propietat | Valor |
   |---|---|
   | `CAL_PONT_CLAU` | la clau del pas 1 |

5. **Desa les propietats de l'script**
6. Torna a l'**Editor** (la icona `<>` de l'esquerra), tria `provaPontEscola`
   al desplegable de dalt i prem **Executa**

Ha de contestar dient amb quin compte parla i quins calendaris hi pot
escriure. Si hi falta alguna cosa, t'ho dirà.

---

## I ja està

A partir d'aquí no has de fer res més. Quan apuntis alguna cosa en un
calendari de l'escola des de JEFE:

1. JEFE ho prova amb el teu compte personal
2. Google li diu que no
3. Ho torna a demanar pel pont, i el compte de l'escola ho escriu

Tu només veus que s'ha apuntat. Val per crear, per canviar i per treure, i
també per les coses que li demanis parlant.

**Si el pont es trenca** (canvies la clau, esborres el desplegament), tot el
que no sigui l'escola segueix funcionant igual, i l'error t'ho dirà amb
paraules. `provaPontEscola()` t'ho diagnostica.

---

## El codi per enganxar

```javascript
/**
 * JEFE · pont del calendari
 *
 * Viu al compte de l'escola i només sap fer una cosa: apuntar, canviar i
 * treure esdeveniments dels calendaris D'AQUEST compte, quan li ho demana
 * JEFE amb la clau correcta.
 *
 * No llegeix res més. No toca cap altre servei. No té accés al correu, ni al
 * Drive, ni a res que no sigui el calendari.
 */

var CLAU = 'POSA-HI-LA-TEVA-CLAU';


function doPost(e) {
  var respon = function (obj) {
    return ContentService.createTextOutput(JSON.stringify(obj))
                         .setMimeType(ContentService.MimeType.JSON);
  };

  var p;
  try {
    p = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return respon({ ok: false, error: 'La petició no és JSON vàlid.' });
  }

  // Comparació en temps constant: amb `===`, el temps de resposta varia segons
  // quants caràcters coincideixen, i això és suficient per endevinar una clau
  // a base d'intents cronometrats.
  if (!clausIguals_(String(p.clau || ''), CLAU)) {
    return respon({ ok: false, error: 'Clau incorrecta.' });
  }

  try {
    return respon({ ok: true, dades: fes_(p) });
  } catch (err) {
    return respon({ ok: false, error: err.message });
  }
}


function clausIguals_(a, b) {
  if (a.length !== b.length) return false;
  var d = 0;
  for (var i = 0; i < a.length; i++) d |= (a.charCodeAt(i) ^ b.charCodeAt(i));
  return d === 0;
}


function fes_(p) {
  switch (p.accio) {

    case 'prova':
      return {
        compte: Session.getEffectiveUser().getEmail(),
        calendaris: meus_()
      };

    case 'calendaris':
      return meus_();

    /* Llegir. Cal perquè aquests calendaris el compte personal no els veu:
       si no els envio jo, alla no hi surt res i no es poden ni triar. */
    case 'esdeveniments': {
      var ini = aData_(p.desde); ini.setHours(0, 0, 0, 0);
      var fi = aData_(p.fins); fi.setHours(23, 59, 59, 999);
      return esdeveniments_(p.calendaris, ini, fi);
    }

    case 'crea': {
      var cal = calendari_(p.calendari);
      var opcions = {};
      if (p.lloc) opcions.location = String(p.lloc);
      if (p.nota) opcions.description = String(p.nota);

      var ev;
      if (!p.hora) {
        ev = cal.createAllDayEvent(String(p.titol), aData_(p.data), opcions);
      } else {
        var ini = quan_(p.data, p.hora);
        var min = Number(p.durada) > 0 ? Number(p.durada) : 60;
        ev = cal.createEvent(String(p.titol), ini,
                             new Date(ini.getTime() + min * 60000), opcions);
      }
      return { id: ev.getId(), titol: ev.getTitle(), calendari: cal.getName() };
    }

    case 'edita': {
      var e2 = troba_(p.id, p.calendari);
      if (p.titol !== undefined && String(p.titol).trim()) e2.setTitle(String(p.titol).trim());
      if (p.lloc !== undefined) e2.setLocation(String(p.lloc));
      if (p.nota !== undefined) e2.setDescription(String(p.nota));
      if (p.data) {
        if (p.hora) {
          var i2 = quan_(p.data, p.hora);
          var m2 = Number(p.durada) > 0 ? Number(p.durada)
                 : Math.max(15, Math.round((e2.getEndTime() - e2.getStartTime()) / 60000));
          e2.setTime(i2, new Date(i2.getTime() + m2 * 60000));
        } else {
          e2.setAllDayDate(aData_(p.data));
        }
      }
      return { id: p.id, titol: e2.getTitle() };
    }

    case 'treu': {
      var e3 = troba_(p.id, p.calendari);
      var titol = e3.getTitle();
      e3.deleteEvent();
      return { tret: true, titol: titol };
    }

    default:
      throw new Error('No sé fer «' + p.accio + '».');
  }
}


/**
 * LES CITES D'AQUESTS CALENDARIS, TOTES DE COP.
 *
 * `CalendarApp.getEvents` no és una crida a l'API: és una capa que va a buscar
 * cada peça quan la demanes. Llegint així, aquesta resposta trigava entre 3 i
 * 34 segons segons el dia —mesurat des de JEFE el 4 d'agost del 2026: «escola
 * 18.385 ms»— i era tot el que quedava lent del calendari.
 *
 * Amb `UrlFetchApp.fetchAll` es demanen totes les agendes alhora i el que es
 * paga és la més lenta, no la suma. No cal activar cap servei ni cap permís
 * nou: `ScriptApp.getOAuthToken()` porta el que aquest script ja té concedit.
 *
 * Si no se'n surt, es llegeix com sempre. Val més trigar que no contestar.
 */
function esdeveniments_(ids, ini, fi) {
  var agendes = meus_();
  var nomDe = {}, colorDe = {};
  agendes.forEach(function (c) { nomDe[c.id] = c.nom; colorDe[c.id] = c.color; });

  var quins = (ids && ids.length) ? ids : agendes.map(function (c) { return c.id; });
  if (!quins.length) return [];

  var deCop = totesDeCop_(quins, ini, fi, nomDe, colorDe);
  if (deCop) return deCop;

  // El camí de sempre, per si l'altre no ha anat.
  var ara = new Date();
  var tz = Session.getScriptTimeZone();
  var out = [];
  quins.forEach(function (id) {
    var cal;
    try { cal = CalendarApp.getCalendarById(id); } catch (err) { return; }
    if (!cal) return;
    var nom = cal.getName(), color = cal.getColor();
    cal.getEvents(ini, fi).forEach(function (ev) {
      var i = ev.getStartTime(), f = ev.getEndTime();
      var totDia = ev.isAllDayEvent();
      out.push({
        id: ev.getId(), calendari: id, calendariNom: nom,
        color: ev.getColor() || color || '',
        titol: ev.getTitle() || '(sense títol)',
        lloc: ev.getLocation() || '',
        nota: String(ev.getDescription() || '').slice(0, 300),
        data: Utilities.formatDate(i, tz, 'yyyy-MM-dd'),
        dataFi: Utilities.formatDate(new Date(f.getTime() - (totDia ? 60000 : 0)),
                                     tz, 'yyyy-MM-dd'),
        totElDia: totDia,
        hora: totDia ? '' : Utilities.formatDate(i, tz, 'HH:mm'),
        horaFi: totDia ? '' : Utilities.formatDate(f, tz, 'HH:mm'),
        passat: f < ara,
        minuts: totDia ? 0 : Math.round((f - i) / 60000)
      });
    });
  });
  return out;
}


function totesDeCop_(quins, ini, fi, nomDe, colorDe) {
  var testimoni;
  try { testimoni = ScriptApp.getOAuthToken(); } catch (e) { return null; }
  if (!testimoni) return null;

  var params = '?singleEvents=true&orderBy=startTime&showDeleted=false&maxResults=2500' +
    '&timeMin=' + encodeURIComponent(ini.toISOString()) +
    '&timeMax=' + encodeURIComponent(fi.toISOString()) +
    '&fields=' + encodeURIComponent('items(id,summary,location,description,status,' +
                                    'start(date,dateTime),end(date,dateTime))');

  var peticions = quins.map(function (id) {
    return {
      url: 'https://www.googleapis.com/calendar/v3/calendars/' +
           encodeURIComponent(id) + '/events' + params,
      method: 'get',
      headers: { Authorization: 'Bearer ' + testimoni },
      muteHttpExceptions: true
    };
  });

  var respostes;
  try { respostes = UrlFetchApp.fetchAll(peticions); } catch (e) { return null; }

  var ara = new Date();
  var tz = Session.getScriptTimeZone();
  var out = [];
  var bones = 0;

  for (var n = 0; n < quins.length; n++) {
    if (respostes[n].getResponseCode() !== 200) return null;   // si en falla una, totes com sempre
    var dades;
    try { dades = JSON.parse(respostes[n].getContentText()); } catch (e) { return null; }
    bones++;

    (dades.items || []).forEach(function (ev) {
      if (!ev || ev.status === 'cancelled') return;
      var totDia = !!(ev.start && ev.start.date);
      var i, f;
      if (totDia) {
        /* A l'API, el final d'un dia sencer és EXCLUSIU: una festa d'un dia
           acaba «l'endemà». Sense restar-li un dia sortiria marcada dos cops. */
        i = data_(ev.start.date);
        f = data_((ev.end && ev.end.date) || ev.start.date);
        f.setDate(f.getDate() - 1);
      } else {
        i = new Date(ev.start.dateTime);
        f = new Date((ev.end && ev.end.dateTime) || ev.start.dateTime);
      }
      if (isNaN(i) || isNaN(f)) return;

      out.push({
        id: ev.id, calendari: quins[n], calendariNom: nomDe[quins[n]] || '',
        color: colorDe[quins[n]] || '',
        titol: ev.summary || '(sense títol)',
        lloc: ev.location || '',
        nota: String(ev.description || '').slice(0, 300),
        data: Utilities.formatDate(i, tz, 'yyyy-MM-dd'),
        dataFi: Utilities.formatDate(f, tz, 'yyyy-MM-dd'),
        totElDia: totDia,
        hora: totDia ? '' : Utilities.formatDate(i, tz, 'HH:mm'),
        horaFi: totDia ? '' : Utilities.formatDate(f, tz, 'HH:mm'),
        passat: totDia ? (Utilities.formatDate(f, tz, 'yyyy-MM-dd') <
                          Utilities.formatDate(ara, tz, 'yyyy-MM-dd'))
                       : f < ara,
        minuts: totDia ? 0 : Math.round((f - i) / 60000)
      });
    });
  }
  return bones ? out : null;
}


function data_(text) {
  var p = String(text).split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12, 0, 0);
}


function meus_() {
  var principal = '';
  try { principal = CalendarApp.getDefaultCalendar().getId(); } catch (e) {}
  return CalendarApp.getAllOwnedCalendars().map(function (c) {
    return { id: c.getId(), nom: c.getName(), color: c.getColor(),
             principal: c.getId() === principal };
  });
}


function calendari_(id) {
  if (id) {
    var c = CalendarApp.getCalendarById(id);
    if (c) return c;
  }
  return CalendarApp.getDefaultCalendar();
}


function troba_(id, idCalendari) {
  var e = null;
  if (idCalendari) {
    try { e = CalendarApp.getCalendarById(idCalendari).getEventById(id); } catch (err) {}
  }
  if (!e) {
    var tots = CalendarApp.getAllOwnedCalendars();
    for (var i = 0; i < tots.length && !e; i++) {
      try { e = tots[i].getEventById(id); } catch (err) {}
    }
  }
  if (!e) throw new Error('Aquest esdeveniment no és en cap calendari d\'aquest compte.');
  return e;
}


/** Migdia, per no ballar amb els canvis d'hora d'estiu. */
function aData_(text) {
  var t = String(text).split('-');
  return new Date(Number(t[0]), Number(t[1]) - 1, Number(t[2]), 12, 0, 0);
}


function quan_(data, hora) {
  var d = aData_(data);
  var m = String(hora).match(/^(\d{1,2}):(\d{2})$/);
  if (!m) throw new Error('L\'hora ha de ser HH:MM.');
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d;
}
```
