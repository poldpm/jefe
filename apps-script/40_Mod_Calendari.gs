/**
 * JEFE — MÒDUL · Calendari
 *
 * Cap línia del nucli s'ha tocat per afegir aquest fitxer.
 *
 * L'EXCEPCIÓ A «EL FULL DE CÀLCUL ÉS L'ÚNICA FONT DE VERITAT»
 *
 *   Els esdeveniments NO es copien al full. Es llegeixen de Google Calendar
 *   cada cop que fan falta, i les altes i els canvis van directament allà.
 *
 *   És deliberat, i és l'única manera que no menteixi: el calendari el toques
 *   des del mòbil, des de l'ordinador, i te l'omplen els altres amb
 *   invitacions. Una còpia al full estaria desactualitzada la primera tarda,
 *   i llavors tindries dues veritats que no coincideixen —que és pitjor que
 *   no tenir-ne cap—. El full guarda el que és NOSTRE (què vols mirar i com);
 *   els esdeveniments són de Google i allà es queden.
 *
 * QUÈ HI HA AL FULL, DONCS
 *   Només la llista dels teus calendaris i quins vols veure. Res més.
 *
 * PERMISOS
 *   Aquest mòdul fa que l'app demani accés al calendari. Cal tornar a
 *   autoritzar-la una vegada. Vegeu `preparaCalendari()` a 90_Instalacio.gs.
 *
 * ELS CALENDARIS D'UN ALTRE COMPTE
 *   Els de l'escola són d'un Workspace que no deixa compartir-los cap enfora
 *   amb permís d'escriptura. Aquest compte no els pot ni llegir ni tocar, i
 *   per això hi ha un pont —vegeu `44_Calendari_Pont.gs`—: un script que viu
 *   allà i que fa la feina per nosaltres. Aquí es distingeixen per la columna
 *   `pont` del full, i tot el que hi passa —llegir i escriure— hi va per
 *   aquell camí. Els del compte personal no el toquen mai.
 */
function MODUL_CALENDARI() {
  return {
    id: 'calendari',
    nom: 'Calendari',
    icona: 'calendari',
    ordre: 5,                 // el primer: la pregunta del matí és «què tinc avui»
    versioEsquema: 1,

    /* NO DESIS RES DEL QUE DIGUI. El que ensenya aquest mòdul no surt del seu
       full: surt de Google Calendar, i pot canviar des del mòbil sense que
       aquí s'escrigui ni una fila. Té la seva pròpia finestra de tres minuts
       —vegeu `rang`— i qualsevol desada per sobre d'aquella mentiria. */
    volatil: true,

    fulls: [
      {
        nom: 'Calendaris',
        columnes: [
          { nom: 'id',              tipus: 'text' },   // l'id de Google
          { nom: 'nom',             tipus: 'text' },
          { nom: 'color',           tipus: 'text' },
          { nom: 'mostra',          tipus: 'text', valors: ['SI', 'NO'] },
          { nom: 'principal',       tipus: 'text', valors: ['SI', 'NO'] },
          { nom: 'meu',             tipus: 'text', valors: ['SI', 'NO'] },
          { nom: 'pont',            tipus: 'text', valors: ['SI', 'NO'] },
          { nom: 'ordre',           tipus: 'num'  },
          { nom: 'creat_el',        tipus: 'iso'  },
          { nom: 'actualitzat_el',  tipus: 'iso'  }
        ]
      }
    ],

    accions: {
      pantalla:   function (p) { return Calendari.pantalla(p); },
      dia:        function (p) { return Calendari.dia(p.data); },
      calendaris: function ()  { return Calendari.calendaris(); },
      sincronitza:function ()  { return Calendari.sincronitzaCalendaris(); },
      elsMeus:    function ()  { return Calendari.mostraElsMeus(); },
      mostra:     function (p) { return Calendari.mostra(p.id, p.mostra); },
      crea:       function (p) { return Calendari.crea(p); },
      edita:      function (p) { return Calendari.edita(p); },
      treu:       function (p) { return Calendari.treu(p.id, p.calendari); }
    },

    /* LA TARGETA D'INICI NO POT COSTAR SIS SEGONS I MIG.
       És una línia —«el següent: 12:30»— i era el que feia que obrir l'app
       trigués entre 8 i 16 segons: si la finestra no estava desada, la muntava
       allà mateix, i muntar-la vol dir tres mesos de totes les agendes més una
       volta a l'script de l'escola.
       Ara no construeix mai res: agafa el que hi ha desat i, si no hi ha res,
       torna l'última targeta que es va poder fer. Qui la refà és el trigger
       d'escalfar, cada quart d'hora i sense que tu esperis. */
    resumInici: function () { return Calendari.targeta(); },

    /** El que es fa en segon pla perquè les teves peticions no ho paguin. */
    escalfa: function () { return Calendari.escalfa(); },

    elDia: function (data) {
      var d = Calendari.dia(data);
      if (!d.esdeveniments.length) return null;
      return {
        titol: 'Al calendari', accio: 'calendari',
        coses: d.esdeveniments.map(function (e) {
          return {
            text: e.titol,
            menut: (e.totElDia ? 'tot el dia' : e.hora + (e.horaFi ? '–' + e.horaFi : '')) +
                   (e.lloc ? ' · ' + e.lloc : ''),
            fet: e.passat
          };
        })
      };
    },

    contextIA: function () {
      var avui = Utils.avui();
      var l = [];

      var d = Calendari.dia(avui);
      l.push(d.esdeveniments.length
        ? 'Calendari d\'avui:\n' + d.esdeveniments.map(function (e) {
            return '- ' + (e.totElDia ? 'tot el dia' : e.hora + (e.horaFi ? '–' + e.horaFi : '')) +
                   ' ' + e.titol + (e.lloc ? ' (' + e.lloc + ')' : '') +
                   (e.passat ? ' [ja ha passat]' : '');
          }).join('\n')
        : 'Calendari: avui no hi ha res.');

      var dema = Calendari.dia(Utils.sumaDies(avui, 1));
      if (dema.esdeveniments.length) {
        l.push('Demà: ' + dema.esdeveniments.map(function (e) {
          return (e.totElDia ? '' : e.hora + ' ') + e.titol;
        }).join('; '));
      }
      return l.join('\n');
    },

    resumPeriode: function (desde, fins) {
      var r = Calendari.compta(desde, fins);
      if (!r.quants) return null;
      var linies = [r.quants + (r.quants === 1 ? ' cita' : ' cites')];
      if (r.hores) linies.push(Math.round(r.hores * 10) / 10 + ' h ocupades');
      if (r.diaPle) linies.push('El dia més ple: ' + r.diaPle.data + ', ' + r.diaPle.quants);
      return { titol: 'Calendari', linies: linies };
    },

    einesIA: [{
      nom: 'consulta_calendari',
      descripcio: 'Què té en Pol al calendari en un dia o en un rang de dates. ' +
                  'Serveix per respondre «què tinc demà», «quan tinc lliure aquesta setmana» ' +
                  'o «a quina hora era allò del veterinari».',
      esquema: {
        type: 'object',
        properties: {
          data:  { type: 'string', description: 'Un dia concret AAAA-MM-DD' },
          desde: { type: 'string', description: 'Data inicial AAAA-MM-DD' },
          fins:  { type: 'string', description: 'Data final AAAA-MM-DD' },
          conte: { type: 'string', description: 'Només els que continguin aquest text al títol' }
        }
      },
      executa: function (a) { return Calendari.consultaIA(a); }
    }, {
      nom: 'apunta_al_calendari',
      descripcio: 'Crea un esdeveniment al calendari. Cal el títol i el dia. Si no es diu ' +
                  'cap hora, es fa de tot el dia. NO s\'executa directament: genera una ' +
                  'proposta que en Pol ha de confirmar amb un botó.',
      escriu: true,
      esquema: {
        type: 'object',
        properties: {
          titol:   { type: 'string', description: 'Què és' },
          data:    { type: 'string', description: 'Dia AAAA-MM-DD' },
          hora:    { type: 'string', description: 'Hora d\'inici HH:MM. Si s\'omet, tot el dia.' },
          durada:  { type: 'number', description: 'Minuts que dura. Si s\'omet, 60.' },
          lloc:    { type: 'string', description: 'On és, si es diu' },
          nota:    { type: 'string', description: 'Detalls, si n\'hi ha' }
        },
        required: ['titol', 'data']
      },
      etiqueta: function (a) {
        return 'Apuntar al calendari «' + (a.titol || '?') + '» el ' + (a.data || '?') +
               (a.hora ? ' a les ' + a.hora : ' (tot el dia)');
      },
      executa: function (a) { return Calendari.creaPerNom(a); }
    }, {
      nom: 'mou_del_calendari',
      descripcio: 'Canvia el dia o l\'hora d\'un esdeveniment que ja existeix, o el treu. ' +
                  'S\'identifica pel títol. NO s\'executa directament: genera una proposta.',
      escriu: true,
      esquema: {
        type: 'object',
        properties: {
          titol:  { type: 'string', description: 'Part del títol de l\'esdeveniment' },
          data:   { type: 'string', description: 'On és ara, AAAA-MM-DD, si se sap' },
          nova_data: { type: 'string', description: 'Dia nou AAAA-MM-DD' },
          nova_hora: { type: 'string', description: 'Hora nova HH:MM' },
          treu:   { type: 'boolean', description: 'true per treure\'l del calendari' }
        },
        required: ['titol']
      },
      etiqueta: function (a) {
        if (a.treu) return 'TREURE del calendari «' + (a.titol || '?') + '»';
        return 'Moure «' + (a.titol || '?') + '» a ' +
               (a.nova_data || 'el mateix dia') + (a.nova_hora ? ' a les ' + a.nova_hora : '');
      },
      executa: function (a) { return Calendari.mouPerNom(a); }
    }],

    vista: 'vista_calendari'
  };
}


var Calendari = (function () {

  var CAU = 'cal_';           // prefix de la memòria cau dels mesos

  /* QUANT DURA LA FINESTRA DESADA, i per què ja no són tres minuts.
     Llegir-la costa 6,5 segons —mesurat: tres mesos per totes les agendes més
     una volta sencera a l'script de l'escola—. Amb tres minuts, cada obertura
     de l'app en pagava una de nova, i per això obrir JEFE trigava entre 8 i 16
     segons. Ara dura un quart d'hora i qui la refà és un trigger cada deu
     minuts, en segon pla: quan tu obres, ja hi és.
     No menteix més que abans: el que escrius des d'aquí la tomba tota sola
     —vegeu `buidaCau`—, i el que canviïs des del mòbil hi entra a la següent
     passada, com passava abans amb tres minuts. */
  var VIDA_CAU = 2400;        // 40 minuts; el trigger la refà cada 30
  var VIDA_TARGETA = 21600;   // la targeta d'inici, 6 h: val més vella que cap

  // ------------------------------------------------------- els teus calendaris

  /**
   * Els calendaris que Google diu que tens, apuntats al full.
   *
   * S'ha de cridar a mà (hi ha un botó): demanar-los a Google cada cop que
   * s'obre la pantalla serien dos segons regalats per una llista que canvia
   * un cop l'any.
   */
  function sincronitzaCalendaris() {
    var tots = CalendarApp.getAllCalendars();
    var principal = null;
    try { principal = CalendarApp.getDefaultCalendar().getId(); } catch (e) {}

    /* ELS TEUS S'ENCENEN; ELS QUE ET COMPARTEIXEN, NO.
       Abans només s'encenia el principal, i això deixava fora els calendaris
       que t'has fet tu —el de l'escola, el de l'agent rural— que són
       exactament els que vols veure. Els compartits, en canvi, són festius i
       calendaris d'equips: n'hi pot haver deu i no els vols tots el primer
       dia. La ratlla que separa les dues coses és qui n'és l'amo, no quin és
       el principal. */
    var meus = {};
    try {
      CalendarApp.getAllOwnedCalendars().forEach(function (c) { meus[c.getId()] = true; });
    } catch (e) {
      if (principal) meus[principal] = true;
    }

    var nous = 0, actualitzats = 0;

    tots.forEach(function (c, i) {
      var id = c.getId();
      var existent = Dades.un('Calendaris', { id: id });

      if (existent) {
        // El `mostra` NO es toca: si l'has canviat tu, mana el teu.
        Dades.actualitza('Calendaris', id, {
          nom: c.getName(), color: c.getColor(),
          principal: id === principal ? 'SI' : 'NO',
          meu: meus[id] ? 'SI' : 'NO'
        });
        actualitzats++;
      } else {
        Dades.insereix('Calendaris', {
          id: id, nom: c.getName(), color: c.getColor(),
          mostra: meus[id] ? 'SI' : 'NO',
          principal: id === principal ? 'SI' : 'NO',
          meu: meus[id] ? 'SI' : 'NO',
          ordre: i + 1
        });
        nous++;
      }
    });

    /* I ELS DE L'ALTRE COMPTE.
       Aquests el compte personal no els veu de cap manera —no estan
       compartits, i encara que ho estiguessin serien de només lectura—, o
       sigui que sense demanar-los al pont no existeixen aquí: ni es podrien
       triar per apuntar-hi, ni se'n veuria cap esdeveniment. Entren encesos:
       si t'has pres la feina de muntar el pont, és perquè els vols. */
    var delPont = 0;
    if (CalendariPont.hiEs()) {
      try {
        CalendariPont.calendaris().forEach(function (c, n) {
          var ja = Dades.un('Calendaris', { id: c.id });
          if (ja) {
            Dades.actualitza('Calendaris', c.id, {
              nom: c.nom, color: c.color || '', pont: 'SI', meu: 'SI'
            });
          } else {
            Dades.insereix('Calendaris', {
              id: c.id, nom: c.nom, color: c.color || '',
              mostra: 'SI', principal: 'NO', meu: 'SI', pont: 'SI',
              ordre: 100 + n
            });
            delPont++;
          }
        });
      } catch (err) {
        Log.avis('calendari.sincronitza', 'El pont no ha contestat: ' + err.message);
      }
    }

    buidaCau();
    Log.info('calendari.sincronitza', 'Calendaris llegits',
             { nous: nous, actualitzats: actualitzats, delPont: delPont });
    return { nous: nous + delPont, actualitzats: actualitzats,
             total: tots.length + delPont, delPont: delPont };
  }

  /**
   * Encén tots els calendaris dels quals ets l'amo.
   *
   * Per als que ja estaven apuntats abans que això funcionés bé: la
   * sincronització no toca mai el `mostra` d'un calendari que ja hi era —el
   * que hagis triat tu mana—, i per tant una regla nova no s'aplica sola als
   * vells. Això ho fa a mà i d'una vegada.
   */
  function mostraElsMeus() {
    var meus = {};
    try {
      CalendarApp.getAllOwnedCalendars().forEach(function (c) { meus[c.getId()] = true; });
    } catch (e) {
      throw new Error('No puc llegir els teus calendaris: ' + e.message);
    }

    var encesos = [];
    Dades.llegeix('Calendaris').forEach(function (c) {
      if (meus[c.id] && String(c.mostra).toUpperCase() !== 'SI') {
        Dades.actualitza('Calendaris', c.id, { mostra: 'SI' });
        encesos.push(c.nom);
      }
    });

    buidaCau();
    return { encesos: encesos };
  }

  function calendaris() {
    var f = Dades.llegeix('Calendaris');
    f.sort(function (a, b) {
      var d = (String(b.principal).toUpperCase() === 'SI' ? 1 : 0) -
              (String(a.principal).toUpperCase() === 'SI' ? 1 : 0);
      return d !== 0 ? d : (Number(a.ordre) || 0) - (Number(b.ordre) || 0);
    });
    return f.map(function (x) {
      return { id: x.id, nom: x.nom, color: x.color || '',
               mostra: String(x.mostra).toUpperCase() === 'SI',
               principal: String(x.principal).toUpperCase() === 'SI',
               meu: String(x.meu).toUpperCase() === 'SI',
               pont: String(x.pont).toUpperCase() === 'SI' };
    });
  }

  function mostra(id, valor) {
    var r = Dades.actualitza('Calendaris', id, { mostra: valor ? 'SI' : 'NO' });
    if (!r) throw new Error('Aquest calendari no existeix.');
    buidaCau();
    return { id: id, mostra: !!valor };
  }

  /** Els que toca mirar. Si encara no s'han sincronitzat, el principal. */
  function actius_() {
    var l = calendaris().filter(function (c) { return c.mostra; });
    if (l.length) return l;

    try {
      var p = CalendarApp.getDefaultCalendar();
      return [{ id: p.getId(), nom: p.getName(), color: p.getColor(),
                mostra: true, principal: true }];
    } catch (e) {
      return [];
    }
  }

  // --------------------------------------------------------------- llegir

  /* CacheService no sap llistar què hi ha desat, o sigui que no es poden
     esborrar les claus dels mesos una per una. Es canvia el número de versió
     que forma part de la clau: les velles queden orfes i moren soles quan se
     'ls acabi el temps. */
  function buidaCau() {
    try { CacheService.getScriptCache().put(CAU + 'versio', String(Date.now()), 21600); } catch (e) {}
  }

  function versioCau_() {
    try {
      var c = CacheService.getScriptCache();
      var v = c.get(CAU + 'versio');
      if (!v) { v = String(Date.now()); c.put(CAU + 'versio', v, 21600); }
      return v;
    } catch (e) { return '0'; }
  }

  function hhmm_(data, tz) {
    return Utilities.formatDate(data, tz, 'HH:mm');
  }

  /**
   * Els esdeveniments d'un rang, de tots els calendaris que mires, ordenats.
   *
   * Cada calendari és una petició a Google, i per això el resultat es desa a
   * la memòria cau tres minuts: navegar entre mesos endavant i enrere no ha
   * de tornar a preguntar-ho tot cada cop.
   */
  function rang(desde, fins) {
    /* UNA SOLA FINESTRA DESADA, I AMPLA.
       Cada resposta a una pregunta demanava el seu tros exacte —avui, demà,
       aquest mes— i com que la clau era el tros, cap d'elles servia per a la
       següent: tres preguntes seguides sobre el mateix dia eren tres voltes
       senceres per tots els calendaris i pel pont de l'escola.
       Ara es llegeix sempre amb un mes de marge a banda i banda i es desa la
       finestra sencera. Qualsevol tros que hi càpiga a dins ja no torna a
       preguntar res, i el que costa de més és transport, no viatges. */
    var volDesde = desde, volFins = fins;      // el que ha demanat qui crida
    var talla = function (l) {
      return l.filter(function (e) { return e.dataFi >= volDesde && e.data <= volFins; });
    };

    var f = finestraDesada_();
    if (f && f.desde <= volDesde && f.fins >= volFins) return talla(f.events);

    // El que es demana surt de la finestra: se n'agafa una de nova, amb marge.
    desde = mesAmunt_(desde, -1);
    fins = mesAmunt_(fins, 1);

    var out = llegeix_(desde, fins);
    desaFinestra_(desde, fins, out);
    return talla(out);
  }

  /**
   * LLEGIR DE GOOGLE, sense mirar ni tocar el que hi ha desat.
   *
   * Va a part perquè hi ha dos qui la criden i volen coses diferents: `rang`
   * només hi ve quan el que li demanen no és a la finestra, i `escalfa` hi ve
   * SEMPRE —si mirés el que hi ha desat, no refaria mai res i la finestra
   * caducaria a les mans de qui obrís l'app.
   */
  function llegeix_(desde, fins) {
    var tz = Config.zonaHoraria();
    var inici = Utils.aData(desde);
    var final = Utils.aData(fins);
    if (!inici || !final) throw new Error('Rang de dates no vàlid.');
    inici.setHours(0, 0, 0, 0);
    final.setHours(23, 59, 59, 999);

    var ara = new Date();
    var out = [];
    var mirats = actius_();

    /* ELS DE L'ALTRE COMPTE ELS DEMANEM AL PONT.
       Aquest compte no els pot llegir de cap manera, o sigui que sense això
       la pantalla no en veuria ni un. Van tots en UNA sola petició, no una
       per calendari. I si el pont no contesta, la resta surt igual i queda
       constància al registre: val més un mes sense les cites de l'escola que
       un mes sense res. */
    var delPont = mirats.filter(function (c) { return c.pont; });
    if (delPont.length && CalendariPont.hiEs()) {
      try {
        var seus = CalendariPont.esdeveniments(desde, fins,
          delPont.map(function (c) { return c.id; }));
        (seus || []).forEach(function (e) { out.push(e); });
      } catch (err) {
        Log.avis('calendari.pont',
                 'No he pogut llegir el calendari de l\'altre compte: ' + err.message,
                 { desde: desde, fins: fins });
      }
    }

    mirats.filter(function (c) { return !c.pont; }).forEach(function (c) {
      var events = perLApi_(c, inici, final);
      if (events === null) events = perCalendarApp_(c, inici, final);
      events.forEach(function (e) { out.push(e); });
    });

    out.sort(function (a, b) {
      if (a.data !== b.data) return a.data.localeCompare(b.data);
      if (a.totElDia !== b.totElDia) return a.totElDia ? -1 : 1;   // el de tot el dia, a dalt
      return String(a.hora).localeCompare(String(b.hora));
    });

    return out;
  }

  /**
   * ELS ESDEVENIMENTS D'UNA AGENDA, PER L'API DE CALENDAR.
   *
   * PER QUÈ NO `CalendarApp`. Perquè `CalendarApp.getEvents` no és una crida a
   * l'API: és una capa que va a buscar cada peça quan la demanes, i llegir cinc
   * mesos de vuit agendes hi costava QUARANTA SEGONS —mesurat el 4 d'agost del
   * 2026 amb `triggerEscalfaFora`—. Amb l'API és una sola petició per agenda
   * amb tot el que hi ha a dins.
   *
   * `singleEvents` desplega les repeticions —el que et fa falta és «cada dimarts
   * a les nou hi ha classe», no la regla de repetició— i `pageToken` recull la
   * resta quan n'hi ha més de dues mil cinc-centes.
   *
   * Torna `null` si el servei no hi és o si peta, i llavors qui crida se'n va a
   * `CalendarApp` com sempre: el dia que això s'estreni, val més anar lent que
   * quedar-se sense agenda.
   */
  function perLApi_(c, inici, final) {
    if (typeof Calendar === 'undefined' || !Calendar || !Calendar.Events) return null;

    var tz = Config.zonaHoraria();
    var ara = new Date();
    var out = [];
    var pagina = null;

    try {
      do {
        var r = Calendar.Events.list(c.id, {
          timeMin: inici.toISOString(),
          timeMax: final.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          showDeleted: false,
          maxResults: 2500,
          pageToken: pagina || undefined,
          /* Només el que es pinta. Demanar-ho tot és transportar descripcions
             senceres, convidats i adjunts de cinc mesos per no ensenyar-los. */
          fields: 'nextPageToken,items(id,summary,location,description,status,' +
                  'start(date,dateTime),end(date,dateTime),colorId)'
        });
        (r.items || []).forEach(function (e) {
          var pintat = deLApi_(e, c, tz, ara);
          if (pintat) out.push(pintat);
        });
        pagina = r.nextPageToken;
      } while (pagina);
    } catch (err) {
      Log.avis('calendari.api', 'L\'API no ha pogut llegir «' + c.nom + '»: ' + err.message);
      return null;
    }
    return out;
  }

  /* Una peça de l'API, amb la forma que pinta la pantalla. */
  function deLApi_(e, c, tz, ara) {
    if (!e || e.status === 'cancelled') return null;

    var totElDia = !!(e.start && e.start.date);
    var ini, fi;
    if (totElDia) {
      /* Els de tot el dia venen en dies, no en hores, i el final és EXCLUSIU:
         un dia de festa acaba «l'endemà a les 00:00». Es fa a migdia perquè cap
         canvi d'hora no el mogui de dia. */
      ini = novaData_(e.start.date);
      fi = novaData_((e.end && e.end.date) || e.start.date);
      fi.setDate(fi.getDate() - 1);
    } else {
      ini = new Date(e.start.dateTime);
      fi = new Date((e.end && e.end.dateTime) || e.start.dateTime);
    }
    if (isNaN(ini) || isNaN(fi)) return null;

    return {
      id: e.id,
      calendari: c.id,
      calendariNom: c.nom,
      color: c.color || '',
      titol: e.summary || '(sense títol)',
      lloc: e.location || '',
      nota: Utils.talla(e.description || '', 300),
      data: Utilities.formatDate(ini, tz, 'yyyy-MM-dd'),
      dataFi: Utilities.formatDate(fi, tz, 'yyyy-MM-dd'),
      totElDia: totElDia,
      hora: totElDia ? '' : hhmm_(ini, tz),
      horaFi: totElDia ? '' : hhmm_(fi, tz),
      passat: totElDia ? (Utilities.formatDate(fi, tz, 'yyyy-MM-dd') < Utils.avui())
                       : fi < ara,
      minuts: totElDia ? 0 : Math.round((fi - ini) / 60000)
    };
  }

  function novaData_(text) {
    var p = String(text).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12, 0, 0);
  }

  /* El camí de sempre. Es queda com a xarxa de seguretat mentre el servei
     avançat no estigui engegat, i per si algun dia falla. */
  function perCalendarApp_(c, inici, final) {
    var tz = Config.zonaHoraria();
    var ara = new Date();
    var cal;
    try { cal = CalendarApp.getCalendarById(c.id); } catch (e) { return []; }
    if (!cal) return [];

    var events;
    try { events = cal.getEvents(inici, final); } catch (e) { return []; }

    return events.map(function (e) {
      var ini = e.getStartTime(), fi = e.getEndTime();
      var totElDia = e.isAllDayEvent();
      /* Un esdeveniment de tot el dia acaba a les 00:00 de l'endemà. Restar un
         minut el deixa al dia que li toca; sense això, un dia de festa surt
         marcat també al dia següent. */
      var dataFi = Utilities.formatDate(new Date(fi.getTime() - (totElDia ? 60000 : 0)),
                                        tz, 'yyyy-MM-dd');
      return {
        id: e.getId(),
        calendari: c.id,
        calendariNom: c.nom,
        color: e.getColor() || c.color || '',
        titol: e.getTitle() || '(sense títol)',
        lloc: e.getLocation() || '',
        nota: Utils.talla(e.getDescription() || '', 300),
        data: Utilities.formatDate(ini, tz, 'yyyy-MM-dd'),
        dataFi: dataFi,
        totElDia: totElDia,
        hora: totElDia ? '' : hhmm_(ini, tz),
        horaFi: totElDia ? '' : hhmm_(fi, tz),
        passat: fi < ara,
        minuts: totElDia ? 0 : Math.round((fi - ini) / 60000)
      };
    });
  }

  /* La memòria cau d'Apps Script no admet més de 100 kB per clau. Si la
     finestra no hi cap, es deixa de desar i prou: val més tornar a llegir que
     petar. Es mira abans d'escriure perquè `put` no avisa de res. */
  function desaFinestra_(desde, fins, events) {
    try {
      var paquet = JSON.stringify({ desde: desde, fins: fins, events: events });
      if (paquet.length < 95000) {
        CacheService.getScriptCache().put(CAU + versioCau_() + '_finestra', paquet, VIDA_CAU);
      }
    } catch (e) {}
  }

  /** El mateix dia, n mesos amunt o avall. */
  function mesAmunt_(data, n) {
    var d = Utils.aData(data);
    if (!d) return data;
    d.setMonth(d.getMonth() + n);
    return Utils.aText(d);
  }

  /** Un esdeveniment ocupa tots els dies que va de `data` a `dataFi`. */
  function perDies_(events) {
    var idx = {};
    events.forEach(function (e) {
      var d = e.data, guarda = 0;
      while (d <= e.dataFi && guarda++ < 60) {
        if (!idx[d]) idx[d] = [];
        idx[d].push(e);
        d = Utils.sumaDies(d, 1);
      }
    });
    return idx;
  }

  function dia(data) {
    data = Utils.esDataValida(data) ? data : Utils.avui();
    var idx = perDies_(rang(data, data));
    return { data: data, esAvui: data === Utils.avui(), esdeveniments: idx[data] || [] };
  }

  // ------------------------------------------ la targeta d'inici i l'escalfor

  /* La finestra desada, o res. NO en munta cap: aquesta és tota la gràcia.
     Qui la munta és `escalfa()`, en segon pla. */
  function finestraDesada_() {
    try {
      var cau = CacheService.getScriptCache();
      var desat = cau.get(CAU + versioCau_() + '_finestra');
      if (!desat) return null;
      return JSON.parse(desat);
    } catch (e) { return null; }
  }

  function fesLaTargeta_(events, avui) {
    var idx = perDies_(events);
    var dAvui = idx[avui] || [];
    var queden = dAvui.filter(function (e) { return !e.passat; });
    return {
      etiqueta: queden.length ? 'El següent' : 'Res al calendari',
      valor: queden.length ? (queden[0].totElDia ? queden[0].titol : queden[0].hora) : '—',
      urgent: false,
      accio: 'calendari'
    };
  }

  /**
   * La targeta d'inici SENSE CONSTRUIR RES.
   *
   * Ordre: el que hi ha a la finestra desada; si no n'hi ha, l'última targeta
   * que es va poder fer; si tampoc, una que no diu res. El que no farà mai és
   * posar-se a llegir tres mesos d'agendes mentre tu mires la pantalla en
   * blanc, que és el que feia.
   */
  function targeta() {
    var avui = Utils.avui();
    var cau = null;
    try { cau = CacheService.getScriptCache(); } catch (e) {}

    var f = finestraDesada_();
    if (f && f.desde <= avui && f.fins >= avui) {
      var t = fesLaTargeta_(f.events.filter(function (e) {
        return e.dataFi >= avui && e.data <= avui;
      }), avui);
      if (cau) { try { cau.put(CAU + 'targeta', JSON.stringify(t), VIDA_TARGETA); } catch (e) {} }
      return t;
    }

    if (cau) {
      try {
        var vella = cau.get(CAU + 'targeta');
        if (vella) return JSON.parse(vella);
      } catch (e) {}
    }
    return { etiqueta: 'Calendari', valor: '—', urgent: false, accio: 'calendari' };
  }

  /**
   * Muntar la finestra i deixar-la desada. Va des d'un trigger, no des d'una
   * petició teva: aquí és on van els segons que abans pagaves tu.
   *
   * PREPARA EXACTAMENT EL QUE DEMANA LA PANTALLA, ni més ni menys, i això és
   * tota la gràcia. Escalfar-ne tres mesos quan la pantalla en demana cinc no
   * servia de res: no li encaixava, tornava a llegir-ho tot amb marge i obrir
   * el calendari passava a costar 23 segons —mesurat—. Menys tampoc serviria,
   * i més seria pagar cada quart d'hora per mesos que no mires.
   */
  function escalfa() {
    var t0 = Date.now();
    var f = finestraDeLaPantalla_();
    var events = llegeix_(f.desde, f.fins);
    desaFinestra_(f.desde, f.fins, events);
    var t = targeta();
    return { ms: Date.now() - t0, events: events.length, targeta: t.valor };
  }

  /**
   * El mes sencer, en graella de setmanes de dilluns a diumenge.
   *
   * La graella arrenca el dilluns d'abans del dia 1 i acaba el diumenge de
   * després de l'últim: així totes les files tenen set caselles i el mes no
   * balla d'amplada segons en quin dia comenci.
   */
  /** Els dos extrems de la graella d'un mes: dilluns d'abans, diumenge de després. */
  function marcDelMes_(quin) {
    var primer = quin + '-01';
    var ultim = Utils.aData(primer);
    ultim.setMonth(ultim.getMonth() + 1);
    ultim.setDate(0);
    return {
      inici: Utils.dillunsDe(primer),
      fi: Utils.sumaDies(Utils.dillunsDe(Utils.aText(ultim)), 6)
    };
  }

  function mouMes_(quin, n) {
    var d = new Date(Number(quin.slice(0, 4)), Number(quin.slice(5, 7)) - 1 + n, 1);
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
  }

  function mes(quin, diaTriat, events) {
    quin = /^\d{4}-\d{2}$/.test(String(quin || '')) ? quin : Utils.avui().slice(0, 7);
    var avui = Utils.avui();

    var marc = marcDelMes_(quin);
    var inici = marc.inici, fi = marc.fi;

    /* Els esdeveniments poden venir de fora: quan es demana un tram de mesos de
       cop es llegeixen UNA vegada i cada mes els filtra. Llegir-los un per
       un voldria dir un viatge a Google per mes i calendari. */
    if (!events) events = rang(inici, fi);
    else events = events.filter(function (e) { return e.dataFi >= inici && e.data <= fi; });

    var idx = perDies_(events);

    var caselles = Utils.rangDates(inici, fi).map(function (d) {
      var seus = idx[d] || [];
      return {
        data: d,
        dia: Number(d.slice(8, 10)),
        delMes: d.slice(0, 7) === quin,
        esAvui: d === avui,
        quants: seus.length,
        /* Tres com a molt: a partir d'aquí la casella deixa de llegir-se.
           Hi va el títol i l'hora a més del color perquè a l'escriptori la
           casella és prou gran per ensenyar-los, i allà un punt no aprofita
           l'espai que hi ha. Al mòbil, el mateix, i el CSS tria què s'ensenya. */
        mostra: seus.slice(0, 3).map(function (e) {
          return { color: e.color, totElDia: e.totElDia,
                   titol: e.titol, hora: e.hora };
        })
      };
    });

    var triat = Utils.esDataValida(diaTriat) ? diaTriat
              : (quin === avui.slice(0, 7) ? avui : quin + '-01');

    return {
      mes: quin, avui: avui, desde: inici, fins: fi,
      caselles: caselles,
      quants: events.filter(function (e) { return e.data.slice(0, 7) === quin; }).length,
      diaTriat: triat,
      esdeveniments: idx[triat] || [],
      /* TOTS els del mes viatgen amb la pantalla. Ja els tenim llegits, i
         enviar-los val bytes però no cap viatge; així, canviar de dia dins
         del mes és instantani en comptes de segon i mig. */
      tots: events
    };
  }

  /**
   * CINC MESOS D'UNA TIRADA.
   *
   * Aquest és l'arreglo que fa que canviar de mes deixi de costar set segons.
   *
   * Cada calendari és un viatge a Google, i els de l'escola un viatge a
   * l'altre compte que allà en fa quatre més. Amb set calendaris, muntar UN
   * mes costava el que costava, i el següent tornava a costar exactament el
   * mateix, i el següent també.
   *
   * El truc és que demanar-li a Google un rang de cinc mesos costa els
   * MATEIXOS viatges que demanar-li'n un: el que es paga és el viatge, no el
   * que hi cap a dins. Així que es llegeix el tram sencer d'un cop i es
   * tornen els cinc mesos muntats; el client ja els té i anar endavant i
   * enrere no torna a demanar res fins que en surts.
   *
   * Per què cinc i no vint: cada mes viatja amb els seus esdeveniments, i
   * això sí que són bytes. Cinc cobreix de sobres el que es passeja d'un cop.
   */
  var VOLTANT = 2;

  /* El tram exacte que demana `pantalla` per al mes d'avui. El fa servir
     `escalfa` per preparar-lo, i per això ha de ser LA MATEIXA COMPTA que hi
     ha a sota: si les dues fórmules es separen, la finestra deixa d'encaixar i
     obrir el calendari torna a costar vint segons sense que ningú ho vegi. */
  function finestraDeLaPantalla_() {
    var quin = Utils.avui().slice(0, 7);
    return {
      desde: marcDelMes_(mouMes_(quin, -VOLTANT)).inici,
      fins: marcDelMes_(mouMes_(quin, VOLTANT)).fi
    };
  }

  function pantalla(p) {
    p = p || {};
    var quin = /^\d{4}-\d{2}$/.test(String(p.mes || '')) ? p.mes : Utils.avui().slice(0, 7);

    var quins = [];
    for (var n = -VOLTANT; n <= VOLTANT; n++) quins.push(mouMes_(quin, n));

    var events = rang(marcDelMes_(quins[0]).inici,
                      marcDelMes_(quins[quins.length - 1]).fi);

    var mesos = {};
    quins.forEach(function (m) {
      mesos[m] = mes(m, m === quin ? p.data : null, events);
    });

    return {
      dades: mesos[quin],
      mesos: mesos,
      calendaris: calendaris()
    };
  }

  function compta(desde, fins) {
    var events = rang(desde, fins);
    var hores = 0, perDia = {};
    events.forEach(function (e) {
      hores += (e.minuts || 0) / 60;
      perDia[e.data] = (perDia[e.data] || 0) + 1;
    });
    var ple = null;
    Object.keys(perDia).forEach(function (d) {
      if (!ple || perDia[d] > ple.quants) ple = { data: d, quants: perDia[d] };
    });
    return { quants: events.length, hores: hores, diaPle: ple };
  }

  // ------------------------------------------------------------- escriure

  function calendariPerEscriure_(id) {
    if (id) {
      var c = CalendarApp.getCalendarById(id);
      if (c) return c;
    }
    var actius = actius_();
    for (var i = 0; i < actius.length; i++) {
      if (actius[i].principal) {
        var p = CalendarApp.getCalendarById(actius[i].id);
        if (p) return p;
      }
    }
    return CalendarApp.getDefaultCalendar();
  }

  function quan_(data, hora) {
    var d = Utils.aData(data);
    if (!d) throw new Error('La data no és vàlida: «' + data + '».');
    var p = String(hora || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!p) throw new Error('L\'hora ha de ser HH:MM.');
    d.setHours(Number(p[1]), Number(p[2]), 0, 0);
    return d;
  }

  function esDelPont_(id) {
    if (!id) return false;
    var c = Dades.un('Calendaris', { id: id });
    return !!c && String(c.pont).toUpperCase() === 'SI';
  }

  function crea(p) {
    var titol = String(p.titol || '').trim();
    if (!titol) throw new Error('L\'esdeveniment necessita un títol.');
    if (!Utils.esDataValida(p.data)) throw new Error('Falta el dia.');

    /* Si ja sabem que és de l'altre compte, hi va directe. Provar-ho abans amb
       el compte personal seria esperar-se a un error que ja sabem que arribarà. */
    if (esDelPont_(p.calendari) && CalendariPont.hiEs()) {
      var r = CalendariPont.crea({
        calendari: p.calendari, titol: titol, data: p.data, hora: p.hora || '',
        durada: Number(p.durada) > 0 ? Number(p.durada) : 60,
        lloc: p.lloc || '', nota: p.nota || ''
      });
      buidaCau();
      Log.info('calendari.crea', 'Creat al compte de l\'escola',
               { titol: titol, data: p.data, calendari: r.calendari });
      return { id: r.id, titol: titol, data: p.data, hora: p.hora || '',
               calendari: r.calendari, perElPont: true };
    }

    var cal = calendariPerEscriure_(p.calendari);
    var opcions = {};
    if (p.lloc) opcions.location = String(p.lloc);
    if (p.nota) opcions.description = String(p.nota);

    var e;
    try {
      if (!p.hora) {
        e = cal.createAllDayEvent(titol, Utils.aData(p.data), opcions);
      } else {
        var ini = quan_(p.data, p.hora);
        var minuts = Number(p.durada) > 0 ? Number(p.durada) : 60;
        var fi = new Date(ini.getTime() + minuts * 60000);
        e = cal.createEvent(titol, ini, fi, opcions);
      }
    } catch (err) {
      /* PROVAR-HO PER L'ALTRE COMPTE ABANS DE DONAR-HO PER PERDUT.
         Aquest error, quan surt, gairebé sempre és el mateix: un calendari
         d'un Workspace que t'han deixat MIRAR però no tocar, i que no et
         deixaran tocar mai perquè ho té bloquejat l'administrador. Si hi ha
         un pont amb aquell compte, l'escriptura hi passa i ja està. */
      var perPont = provaPelPont_('crea', err, cal, p, titol);
      if (perPont) return perPont;
      throw errorDEscriptura_(cal, err);
    }

    buidaCau();
    Log.info('calendari.crea', 'Esdeveniment creat', { titol: titol, data: p.data,
                                                       calendari: cal.getName() });
    return { id: e.getId(), titol: titol, data: p.data,
             hora: p.hora || '', calendari: cal.getName() };
  }

  function errorDEscriptura_(cal, err) {
    var nom = cal ? cal.getName() : 'aquest calendari';
    if (CalendariPont.hiEs()) {
      return new Error('Ni jo ni el compte de l\'escola hem pogut escriure a «' + nom +
        '». Comprova amb provaPontEscola() que el pont segueix dret. (' + err.message + ')');
    }
    return new Error('No he pogut escriure a «' + nom + '». ' +
      'Si és d\'un altre compte de Google, el teu no hi podrà escriure mai: cal ' +
      'un pont amb aquell compte. Vegeu docs/04-calendari-escola.md. (' + err.message + ')');
  }

  function provaPelPont_(accio, err, cal, p, titol) {
    if (!CalendariPont.hiEs()) return null;
    var id = cal ? cal.getId() : (p.calendari || '');

    try {
      var r;
      if (accio === 'crea') {
        r = CalendariPont.crea({
          calendari: id, titol: titol, data: p.data, hora: p.hora || '',
          durada: Number(p.durada) > 0 ? Number(p.durada) : 60,
          lloc: p.lloc || '', nota: p.nota || ''
        });
      } else if (accio === 'edita') {
        r = CalendariPont.edita(p);
      } else {
        r = CalendariPont.treu(p);
      }

      buidaCau();
      Log.info('calendari.pont', 'Fet pel compte de l\'escola', { accio: accio, calendari: id });
      r = r || {};
      r.perElPont = true;
      return r;
    } catch (errPont) {
      Log.avis('calendari.pont', 'El pont tampoc ha pogut: ' + errPont.message,
               { accio: accio, calendari: id, original: err.message });
      return null;
    }
  }

  function troba_(id, idCalendari) {
    var cal = idCalendari ? CalendarApp.getCalendarById(idCalendari) : null;
    var e = null;
    if (cal) { try { e = cal.getEventById(id); } catch (err) {} }
    if (!e) {
      var llista = actius_();
      for (var i = 0; i < llista.length && !e; i++) {
        try { e = CalendarApp.getCalendarById(llista[i].id).getEventById(id); } catch (err) {}
      }
    }
    if (!e) throw new Error('Aquest esdeveniment ja no hi és.');
    return e;
  }

  function edita(p) {
    var e, titolFinal;
    try {
      e = troba_(p.id, p.calendari);

      if (p.titol !== undefined) e.setTitle(String(p.titol).trim() || e.getTitle());
      if (p.lloc !== undefined) e.setLocation(String(p.lloc));
      if (p.nota !== undefined) e.setDescription(String(p.nota));

      if (p.data) {
        if (p.hora) {
          var ini = quan_(p.data, p.hora);
          var minuts = Number(p.durada) > 0 ? Number(p.durada)
                     : Math.max(15, Math.round((e.getEndTime() - e.getStartTime()) / 60000));
          e.setTime(ini, new Date(ini.getTime() + minuts * 60000));
        } else {
          e.setAllDayDate(Utils.aData(p.data));
        }
      }
      titolFinal = e.getTitle();
    } catch (err) {
      // Igual que en crear: si no hi arribo jo, potser hi arriba l'altre compte.
      var perPont = provaPelPont_('edita', err, null, p, p.titol);
      if (perPont) return perPont;
      throw errorDEscriptura_(null, err);
    }

    buidaCau();
    Log.info('calendari.edita', 'Esdeveniment canviat', { id: p.id });
    return { id: p.id, titol: titolFinal };
  }

  /**
   * Treure'l del calendari. AQUÍ SÍ QUE S'ESBORRA DE DEBÒ, i és l'única cosa
   * de tot JEFE que ho fa: Google Calendar no té «arxivat». Per això només hi
   * arriba des d'un botó que ho diu, o des d'una proposta confirmada.
   */
  function treu(id, idCalendari) {
    var titol;
    try {
      var e = troba_(id, idCalendari);
      titol = e.getTitle();
      e.deleteEvent();
    } catch (err) {
      var perPont = provaPelPont_('treu', err, null, { id: id, calendari: idCalendari });
      if (perPont) return perPont;
      throw errorDEscriptura_(null, err);
    }
    buidaCau();
    Log.avis('calendari.treu', 'Esdeveniment esborrat del calendari', { titol: titol });
    return { tret: true, titol: titol };
  }

  // -------------------------------------------------------------------- IA

  function consultaIA(a) {
    a = a || {};
    var desde, fins;
    if (Utils.esDataValida(a.data)) { desde = fins = a.data; }
    else {
      fins = Utils.esDataValida(a.fins) ? a.fins : Utils.sumaDies(Utils.avui(), 13);
      desde = Utils.esDataValida(a.desde) ? a.desde : Utils.avui();
    }
    if (Utils.diesEntre(desde, fins) > 120) fins = Utils.sumaDies(desde, 120);

    var events = rang(desde, fins);
    var conte = String(a.conte || '').toLowerCase().trim();
    if (conte) {
      events = events.filter(function (e) { return e.titol.toLowerCase().indexOf(conte) !== -1; });
    }

    return {
      files: events.length,                // el zero explícit: que no se n'inventi cap
      rang: desde + '/' + fins,
      esdeveniments: events.slice(0, 40).map(function (e) {
        return {
          data: e.data,
          quan: e.totElDia ? 'tot el dia' : e.hora + (e.horaFi ? '–' + e.horaFi : ''),
          titol: e.titol,
          lloc: e.lloc || undefined,
          calendari: e.calendariNom
        };
      })
    };
  }

  /** Ve d'una proposta confirmada. */
  function creaPerNom(a) {
    var r = crea({
      titol: a.titol, data: a.data, hora: a.hora,
      durada: a.durada, lloc: a.lloc, nota: a.nota
    });
    return {
      apuntat: true, titol: r.titol, data: r.data,
      quan: r.hora ? 'a les ' + r.hora : 'tot el dia',
      calendari: r.calendari
    };
  }

  /**
   * Trobar un esdeveniment pel títol. Si n'hi ha més d'un que hi encaixa, NO
   * se'n tria cap: moure o esborrar el que no toca del calendari és de les
   * poques coses d'aquí que no es poden desfer.
   */
  function mouPerNom(a) {
    var q = String(a.titol || '').trim().toLowerCase();
    if (!q) throw new Error('No has dit quin esdeveniment.');

    var desde = Utils.esDataValida(a.data) ? a.data : Utils.sumaDies(Utils.avui(), -7);
    var fins = Utils.esDataValida(a.data) ? a.data : Utils.sumaDies(Utils.avui(), 60);

    var trobats = rang(desde, fins).filter(function (e) {
      return e.titol.toLowerCase().indexOf(q) !== -1;
    });

    if (!trobats.length) {
      throw new Error('No trobo res al calendari que digui «' + a.titol + '»' +
                      (a.data ? ' el ' + a.data : ' entre el ' + desde + ' i el ' + fins) + '.');
    }
    if (trobats.length > 1) {
      throw new Error('N\'hi ha ' + trobats.length + ' que hi encaixen: ' +
        trobats.slice(0, 5).map(function (e) {
          return '«' + e.titol + '» el ' + e.data + (e.hora ? ' a les ' + e.hora : '');
        }).join('; ') + '. Digues-me el dia.');
    }

    var e = trobats[0];
    if (a.treu) {
      treu(e.id, e.calendari);
      return { tret: true, titol: e.titol, data: e.data };
    }

    if (!a.nova_data && !a.nova_hora) throw new Error('No has dit on el vols moure.');
    edita({
      id: e.id, calendari: e.calendari,
      data: a.nova_data || e.data,
      hora: a.nova_hora || (e.totElDia ? '' : e.hora)
    });
    return { mogut: true, titol: e.titol,
             abans: e.data + (e.hora ? ' ' + e.hora : ''),
             ara: (a.nova_data || e.data) + (a.nova_hora ? ' ' + a.nova_hora : '') };
  }

  return {
    pantalla: pantalla,
    mes: mes,
    dia: dia,
    rang: rang,
    targeta: targeta,
    escalfa: escalfa,
    compta: compta,
    calendaris: calendaris,
    sincronitzaCalendaris: sincronitzaCalendaris,
    mostraElsMeus: mostraElsMeus,
    mostra: mostra,
    crea: crea,
    edita: edita,
    treu: treu,
    consultaIA: consultaIA,
    creaPerNom: creaPerNom,
    mouPerNom: mouPerNom
  };
})();
