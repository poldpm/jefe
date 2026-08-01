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

**Llegir no passa per aquí.** Els calendaris de l'escola compartits «només
veure» ja els llegeix el teu compte personal, i llegir és gairebé tot el que fa
la pantalla. Això només entra en joc quan apuntes alguna cosa.

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

Torna a l'editor de JEFE (el del teu compte personal) i executa:

```javascript
connectaPontEscola('https://script.google.com/macros/s/AKfy...../exec', 'la-teva-clau')
```

I després:

```javascript
provaPontEscola()
```

Ha de contestar dient amb quin compte parla i quins calendaris hi pot escriure.

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


function meus_() {
  var principal = '';
  try { principal = CalendarApp.getDefaultCalendar().getId(); } catch (e) {}
  return CalendarApp.getAllOwnedCalendars().map(function (c) {
    return { id: c.getId(), nom: c.getName(), principal: c.getId() === principal };
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
