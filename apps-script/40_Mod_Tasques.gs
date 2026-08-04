/**
 * JEFE — MÒDUL · Tasques (Google Tasks)
 *
 * Cap línia del nucli s'ha tocat per fer aquest canvi.
 *
 * L'EXCEPCIÓ A «EL FULL ÉS L'ÚNICA FONT DE VERITAT», IGUAL QUE AL CALENDARI
 *
 *   Les tasques NO es copien al full. Es llegeixen de Google Tasks cada cop
 *   que fan falta, i les altes i els canvis van directament allà.
 *
 *   És l'única manera que no menteixi: les tasques les toques des del mòbil,
 *   des de l'ordinador i des del rellotge, i n'hi ha que te les crea sol
 *   l'automatisme de l'escola. Una còpia al full estaria desactualitzada la
 *   primera tarda i llavors tindries dues veritats que no coincideixen —que
 *   és pitjor que no tenir-ne cap.
 *
 * QUÈ HI HA AL FULL, DONCS
 *
 *   1. `LlistesTasques` — les teves llistes de Google Tasks i quines mires.
 *      El nom i l'ordre són de Google; el `mostra` és teu.
 *
 *   2. `TasquesMarques` — el que Google Tasks no sap desar i tu vols: la
 *      prioritat i «hi estic». Va per l'id de la tasca de Google, i no en
 *      copia ni el text ni la data: si algun dia treus aquest full, no perds
 *      cap tasca, perds dues anotacions.
 *
 * ELS CONTEXTOS ARA SÓN LES TEVES LLISTES
 *   Abans eren tres fixos —docència, agent rural, personal— escrits al codi.
 *   Ara manen les llistes que tinguis: si te'n fas una de nova al mòbil,
 *   surt aquí sense tocar res. La d'Automatització de l'escola no hi és:
 *   aquella viu al compte de l'escola i té la seva pantalla.
 *
 * PERMISOS
 *   Aquest mòdul fa que l'app demani accés a Google Tasks. Cal tornar a
 *   autoritzar-la una vegada. Vegeu `preparaTasques()` a 90_Instalacio.gs.
 *
 * SI EL SERVEI NO HI ÉS
 *   Si l'API de Tasks encara no està activada, la pantalla ho diu i no peta:
 *   ni la pàgina del dia ni la fitxa de la IA es queden penjades per això.
 */
function MODUL_TASQUES() {
  return {
    id: 'tasques',
    nom: 'Tasques',
    icona: 'tasques',
    ordre: 15,
    versioEsquema: 2,

    /* NO DESIS RES DEL QUE DIGUI. El que ensenya no surt del seu full: surt de
       Google Tasks i pot canviar des del mòbil sense que aquí s'escrigui ni
       una fila. Té la seva pròpia finestra curta —vegeu `deLaLlista_`. */
    volatil: true,

    fulls: [
      {
        nom: 'LlistesTasques',
        columnes: [
          { nom: 'id',              tipus: 'text' },   // l'id de Google
          { nom: 'nom',             tipus: 'text' },
          { nom: 'mostra',          tipus: 'text', valors: ['SI', 'NO'] },
          { nom: 'principal',       tipus: 'text', valors: ['SI', 'NO'] },
          { nom: 'ordre',           tipus: 'num'  },
          { nom: 'creat_el',        tipus: 'iso'  },
          { nom: 'actualitzat_el',  tipus: 'iso'  }
        ]
      },
      {
        nom: 'TasquesMarques',
        columnes: [
          { nom: 'id',              tipus: 'text' },
          { nom: 'tasca',           tipus: 'text' },   // l'id de Google
          { nom: 'llista',          tipus: 'text' },
          { nom: 'prioritat',       tipus: 'text', valors: ['', 'alta'] },
          { nom: 'fent',            tipus: 'text', valors: ['', 'SI'] },
          { nom: 'creat_el',        tipus: 'iso'  },
          { nom: 'actualitzat_el',  tipus: 'iso'  }
        ]
      }
    ],

    accions: {
      pantalla:    function (p) { return Tasques.pantalla(p); },
      fetes:       function (p) { return Tasques.fetes(p); },
      captura:     function (p) { return Tasques.captura(p.text, p.origen, p.llista); },
      edita:       function (p) { return Tasques.edita(p); },
      completa:    function (p) { return Tasques.completa(p.id, p.llista, p.desfes); },
      treu:        function (p) { return Tasques.treu(p.id, p.llista); },
      llistes:     function ()  { return Tasques.llistes(); },
      sincronitza: function ()  { return Tasques.sincronitzaLlistes(); },
      mostra:      function (p) { return Tasques.mostra(p.id, p.mostra); }
    },

    /* Igual que el calendari: la targeta no va a preguntar-ho a Google. Cada
       llista és una volta a l'API de Tasks i eren 2 segons de la teva
       obertura per dir-te un número. Ara agafa el que hi ha desat i qui ho
       desa és el trigger d'escalfar, cada quart d'hora. */
    resumInici: function () { return Tasques.targeta(); },

    escalfa: function () { return Tasques.escalfa(); },

    resumPeriode: function (desde, fins) { return Tasques.resumPeriode(desde, fins); },

    elDia: function (data) {
      /* Del futur no en diu res: «et falten quatre tasques» d'aquí a tres
         dies és evident i no és cap informació. */
      if (data > Utils.avui()) return null;
      var d = Tasques.pantalla({});
      if (!d.hiHaServei) return null;

      var coses = [];
      d.tasques.filter(function (t) { return t.vencuda; }).forEach(function (t) {
        /* QUANT FA, no quin dia era: «vencia el 2026-07-29» t'obliga a comptar
           mentalment, «fa quatre dies» és el que en volies treure. */
        coses.push({ text: t.text, menut: Utils.faQuant(t.vencEl) + ' que vencia', urgent: true });
      });
      d.tasques.filter(function (t) { return t.venAvui; }).forEach(function (t) {
        coses.push({ text: t.text, menut: 'per avui · ' + t.llistaNom });
      });

      if (!coses.length) return null;
      return { titol: 'Tasques', accio: 'tasques', coses: coses.slice(0, 12) };
    },

    contextIA: function () {
      var d = Tasques.pantalla({});
      if (!d.hiHaServei) return '';
      var l = [];
      var vencudes = d.tasques.filter(function (t) { return t.vencuda; });
      if (vencudes.length) {
        l.push('- VENCUDES (' + vencudes.length + '): ' +
               vencudes.slice(0, 5).map(function (t) { return t.text; }).join('; '));
      }
      var avui = d.tasques.filter(function (t) { return t.venAvui; });
      if (avui.length) {
        l.push('- Per avui: ' + avui.map(function (t) { return t.text; }).join('; '));
      }
      l.push('- Pendents en total: ' + d.tasques.length +
             (d.blocs.length ? ' (' + d.blocs.map(function (b) {
               return b.nom + ' ' + b.tasques.length;
             }).join(', ') + ')' : ''));
      return l.join('\n');
    },

    einesIA: [{
      nom: 'consulta_tasques',
      descripcio: 'Les tasques pendents de l\'usuari a Google Tasks. Pot filtrar per ' +
                  'llista (el nom de la llista, per exemple «Docència») o demanar ' +
                  'només les vençudes.',
      esquema: {
        type: 'object',
        properties: {
          llista: { type: 'string', description: 'Nom de la llista, si en vol una de sola' },
          nomes_vencudes: { type: 'boolean', description: 'Només les que ja han passat de data' }
        }
      },
      executa: function (a) { return Tasques.consultaIA(a); }
    }, {
      nom: 'apunta_tasca',
      descripcio: 'Apunta una cosa per fer a Google Tasks. NO s\'executa directament: ' +
                  'genera una proposta que en Pol ha de confirmar amb un botó.',
      escriu: true,
      esquema: {
        type: 'object',
        properties: {
          text:    { type: 'string', description: 'Què s\'ha de fer' },
          llista:  { type: 'string', description: 'Nom de la llista. Si no se sap, s\'omet.' },
          venc_el: { type: 'string', description: 'Data límit AAAA-MM-DD, si n\'hi ha' }
        },
        required: ['text']
      },
      etiqueta: function (a) {
        return 'Apuntar «' + (a.text || '?') + '»' +
               (a.llista ? ' a ' + a.llista : '') +
               (a.venc_el ? ' per al ' + a.venc_el : '');
      },
      executa: function (a) { return Tasques.apuntaPerNom(a); }
    }, {
      nom: 'completa_tasca',
      descripcio: 'Marca una tasca com a feta a Google Tasks. S\'identifica pel text, ' +
                  'encara que no sigui exacte. NO s\'executa directament: genera una ' +
                  'proposta a confirmar.',
      escriu: true,
      esquema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Part del text de la tasca' },
          desfes: { type: 'boolean', description: 'true per tornar-la a pendent' }
        },
        required: ['text']
      },
      etiqueta: function (a) {
        return (a.desfes ? 'Tornar a pendent' : 'Marcar com a feta') + ' «' + (a.text || '?') + '»';
      },
      executa: function (a) { return Tasques.completaPerNom(a); }
    }, {
      nom: 'classifica_tasca',
      descripcio: 'Posa data límit, prioritat o canvia de llista una tasca que ja ' +
                  'existeix. NO s\'executa directament.',
      escriu: true,
      esquema: {
        type: 'object',
        properties: {
          text:      { type: 'string', description: 'Part del text de la tasca' },
          llista:    { type: 'string', description: 'Nom de la llista on ha d\'anar' },
          venc_el:   { type: 'string', description: 'Data límit AAAA-MM-DD' },
          prioritat: { type: 'boolean', description: 'true per marcar-la prioritària' }
        },
        required: ['text']
      },
      etiqueta: function (a) {
        var q = [];
        if (a.llista) q.push('a ' + a.llista);
        if (a.venc_el) q.push('per al ' + a.venc_el);
        if (a.prioritat) q.push('prioritària');
        return 'Posar «' + (a.text || '?') + '» ' + (q.join(', ') || 'per fer');
      },
      executa: function (a) { return Tasques.classificaPerNom(a); }
    }, {
      nom: 'treu_tasca',
      descripcio: 'ESBORRA una tasca de Google Tasks. No es pot desfer. NO s\'executa ' +
                  'directament: genera una proposta a confirmar.',
      escriu: true,
      esquema: {
        type: 'object',
        properties: { text: { type: 'string', description: 'Part del text de la tasca' } },
        required: ['text']
      },
      etiqueta: function (a) { return 'ESBORRAR de Google Tasks «' + (a.text || '?') + '»'; },
      executa: function (a) { return Tasques.treuPerNom(a); }
    }],

    vista: 'vista_tasques'
  };
}


var Tasques = (function () {

  var CAU = 'tasq_';

  /* Quant dura la còpia de les llistes llegides. Eren 90 segons i cada
     obertura de l'app en pagava una de nova —dos segons, una volta a l'API per
     llista—. Ara dura un quart d'hora i qui la refà és el trigger d'escalfar
     cada deu minuts. El que marquis des d'aquí la tomba igualment. */
  var QUANT = 1500;

  // ------------------------------------------------------------ el servei

  /* L'API de Tasks és un servei avançat: si encara no s'ha activat, la
     variable global no hi és. No es dóna per feta enlloc. */
  function serveiHiEs() {
    try { return typeof Tasks !== 'undefined' && !!Tasks && !!Tasks.Tasklists; }
    catch (e) { return false; }
  }

  function calServei_() {
    if (!serveiHiEs()) {
      throw new Error('Google Tasks encara no està engegat. Executa preparaTasques() una vegada.');
    }
  }

  // -------------------------------------------------------------- la còpia

  /* Mateixa manera que al calendari: no es poden llistar les claus desades, o
     sigui que per buidar-ho tot es canvia el número de versió que forma part
     de la clau. Les velles queden orfes i moren soles. */
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

  // ------------------------------------------------------------- llistes

  /**
   * Les teves llistes de Google Tasks, apuntades al full.
   *
   * El `mostra` NO es toca mai si la llista ja hi era: si l'has apagada tu,
   * mana el teu. Les noves s'encenen —te l'acabes de fer, la vols veure.
   */
  function sincronitzaLlistes() {
    calServei_();

    var items = [];
    var pagina = null;
    do {
      var r = Tasks.Tasklists.list(pagina ? { maxResults: 100, pageToken: pagina } : { maxResults: 100 });
      items = items.concat(r.items || []);
      pagina = r.nextPageToken;
    } while (pagina);

    var principal = '';
    try { principal = (Tasks.Tasklists.get('@default') || {}).id || ''; } catch (e) {}

    var nous = 0, actualitzats = 0;
    items.forEach(function (l, i) {
      var existent = Dades.un('LlistesTasques', { id: l.id });
      if (existent) {
        // El `mostra` NO es toca: si l'has apagada tu, mana el teu.
        Dades.actualitza('LlistesTasques', l.id, {
          nom: l.title, principal: l.id === principal ? 'SI' : 'NO', ordre: i + 1
        });
        actualitzats++;
      } else {
        Dades.insereix('LlistesTasques', {
          id: l.id, nom: l.title, mostra: 'SI',
          principal: l.id === principal ? 'SI' : 'NO', ordre: i + 1
        });
        nous++;
      }
    });

    buidaCau();
    return { nous: nous, actualitzats: actualitzats, total: items.length };
  }

  function llistes() {
    return Dades.llegeix('LlistesTasques').map(function (f) {
      return {
        id: f.id, nom: f.nom,
        mostra: String(f.mostra).toUpperCase() === 'SI',
        principal: String(f.principal).toUpperCase() === 'SI',
        ordre: Number(f.ordre || 99)
      };
    }).sort(function (a, b) { return a.ordre - b.ordre; });
  }

  function queMires_() {
    return llistes().filter(function (l) { return l.mostra; });
  }

  function mostra(id, valor) {
    var r = Dades.actualitza('LlistesTasques', id, { mostra: valor ? 'SI' : 'NO' });
    if (!r) throw new Error('Aquesta llista no existeix.');
    buidaCau();
    return { id: id, mostra: !!valor };
  }

  /** La llista on cau el que captures: la principal de Google, si no en dius cap. */
  function llistaPerDefecte_() {
    var l = llistes();
    var p = l.filter(function (x) { return x.principal; })[0] || l.filter(function (x) { return x.mostra; })[0] || l[0];
    if (!p) {
      /* Encara no s'ha sincronitzat mai: es fa ara i prou, en comptes de
         demanar-li que executi res. */
      sincronitzaLlistes();
      l = llistes();
      p = l.filter(function (x) { return x.principal; })[0] || l[0];
    }
    if (!p) throw new Error('No tens cap llista a Google Tasks.');
    return p;
  }

  function llistaPerNom_(nom) {
    var n = aixafa_(nom);
    if (!n) return null;
    var totes = llistes();
    var exacte = totes.filter(function (l) { return aixafa_(l.nom) === n; })[0];
    return exacte || totes.filter(function (l) { return aixafa_(l.nom).indexOf(n) !== -1; })[0] || null;
  }

  // -------------------------------------------------------------- marques

  /* El que Google Tasks no sap desar i tu vols. Per l'id de la tasca. */
  function marques_() {
    var per = {};
    Dades.llegeix('TasquesMarques').forEach(function (f) {
      if (f.tasca) per[f.tasca] = f;
    });
    return per;
  }

  function posaMarca_(tascaId, llistaId, canvis) {
    var m = Dades.un('TasquesMarques', { tasca: tascaId });
    if (m) return Dades.actualitza('TasquesMarques', m.id, canvis);
    var nova = { tasca: tascaId, llista: llistaId, prioritat: '', fent: '' };
    for (var k in canvis) nova[k] = canvis[k];
    return Dades.insereix('TasquesMarques', nova, 'tmk');
  }

  // ---------------------------------------------------------------- dates

  /* Google desa el venciment a mitjanit UTC: els deu primers caràcters ja són
     el dia que volies. Per escriure s'hi posa el migdia, que és el que fa
     l'automatisme de l'escola i el que evita que un canvi d'hora et mogui una
     tasca de dia. */
  function dataDeGoogle_(due) {
    return due ? String(due).slice(0, 10) : '';
  }

  function dataCapAGoogle_(data) {
    var p = String(data || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!p) return null;
    return new Date(Number(p[1]), Number(p[2]) - 1, Number(p[3]), 12, 0, 0).toISOString();
  }

  // --------------------------------------------------------------- llegir

  function deLaLlista_(llistaId, ambFetes) {
    var clau = CAU + versioCau_() + '_' + (ambFetes ? 'f_' : 'p_') + llistaId;
    var cau = null;
    try { cau = CacheService.getScriptCache(); } catch (e) {}
    if (cau && !ambFetes) {
      var desat = cau.get(clau);
      if (desat) { try { return JSON.parse(desat); } catch (e) {} }
    }

    var params = { maxResults: 100, showCompleted: !!ambFetes };
    if (ambFetes) { params.showHidden = true; params.completedMin = fa_(21); }

    var items = (Tasks.Tasks.list(llistaId, params) || {}).items || [];

    /* Les subtasques no s'ensenyen com si fossin tasques soltes: el pare ja hi
       és i posar-les al mateix nivell fa una llista que no vol dir res. */
    items = items.filter(function (t) { return !t.parent && !t.deleted; });

    if (cau && !ambFetes) {
      try { cau.put(clau, JSON.stringify(items), QUANT); } catch (e) {}
    }
    return items;
  }

  function fa_(dies) {
    var d = new Date();
    d.setDate(d.getDate() - dies);
    return d.toISOString();
  }

  function ambDades_(t, llista, avui, marca) {
    var venc = dataDeGoogle_(t.due);
    return {
      id: t.id,
      llista: llista.id,
      llistaNom: llista.nom,
      text: String(t.title || '').trim() || '(sense text)',
      nota: t.notes || '',
      vencEl: venc,
      vencuda: !!venc && venc < avui,
      venAvui: venc === avui,
      prioritat: marca && marca.prioritat === 'alta' ? 'alta' : '',
      fent: !!(marca && String(marca.fent).toUpperCase() === 'SI'),
      feta: t.status === 'completed',
      fetEl: t.completed ? String(t.completed).slice(0, 10) : ''
    };
  }

  /* Primer el que ja ha vençut, després el que venç, i al final el que no té
     data. Una llista ordenada per quan la vas escriure no ajuda ningú. */
  function ordena_(a, b) {
    var ad = a.vencEl || '9999-99-99', bd = b.vencEl || '9999-99-99';
    if (ad !== bd) return ad < bd ? -1 : 1;
    if (a.prioritat !== b.prioritat) return a.prioritat === 'alta' ? -1 : 1;
    return String(a.text).localeCompare(String(b.text));
  }

  /**
   * La pantalla: una caixa per llista, com les llistes que són.
   *
   * Les vençudes NO es treuen en un bloc a part. Sortirien dues vegades —al
   * bloc i a la seva llista— i ja hem vist a l'escola què passa llavors: la
   * mateixa cosa dos cops fa dubtar de si són dues coses. Es marquen allà on
   * són, i el compte de vençudes va a la capçalera.
   */
  function pantalla(p) {
    p = p || {};
    var avui = Utils.avui();

    if (!serveiHiEs()) {
      return { avui: avui, hiHaServei: false, hiHaLlistes: false,
               llistes: [], blocs: [], tasques: [], vencudes: 0 };
    }

    var mires = queMires_();
    if (!llistes().length) {
      try { sincronitzaLlistes(); mires = queMires_(); } catch (e) {}
    }

    var marca = marques_();
    var blocs = [], totes = [];

    /* SI GOOGLE DIU QUE NO, AIXÒ NO POT TOMBAR RES MÉS. El permís es demana un
       cop i pot no estar-hi encara; la pàgina del dia, els avisos i la fitxa de
       la IA pregunten per aquí i no han de caure per això. Es diu que no hi ha
       servei i cadascú se n'aparta sol. */
    try {
      mires.forEach(function (l) {
        var t = deLaLlista_(l.id, false).map(function (x) {
          return ambDades_(x, l, avui, marca[x.id]);
        }).sort(ordena_);
        totes = totes.concat(t);
        blocs.push({ id: l.id, nom: l.nom, tasques: t });
      });
    } catch (err) {
      if (typeof Log !== 'undefined') Log.avis('tasques', 'no puc llegir Google Tasks', err.message);
      return { avui: avui, hiHaServei: false, hiHaLlistes: llistes().length > 0,
               llistes: llistes(), blocs: [], tasques: [], vencudes: 0,
               motiu: err.message };
    }

    return {
      avui: avui,
      hiHaServei: true,
      hiHaLlistes: llistes().length > 0,
      llistes: llistes(),
      blocs: blocs,
      tasques: totes.slice().sort(ordena_),
      vencudes: totes.filter(function (t) { return t.vencuda; }).length
    };
  }

  /** Les fetes es demanen a part: no les mires cada cop que obres. */
  function fetes(p) {
    p = p || {};
    if (!serveiHiEs()) return { fetes: [] };
    var avui = Utils.avui();
    var marca = marques_();
    var out = [];
    try {
      queMires_().forEach(function (l) {
        deLaLlista_(l.id, true).forEach(function (x) {
          if (x.status !== 'completed') return;
          out.push(ambDades_(x, l, avui, marca[x.id]));
        });
      });
    } catch (err) {
      if (typeof Log !== 'undefined') Log.avis('tasques', 'no puc llegir les fetes', err.message);
      return { fetes: [], motiu: err.message };
    }
    out.sort(function (a, b) { return String(b.fetEl).localeCompare(String(a.fetEl)); });
    return { fetes: out.slice(0, 30) };
  }

  function compte() {
    var d = pantalla({});
    return {
      perFer: d.tasques.length,
      vencudes: d.vencudes,
      hiHaServei: d.hiHaServei
    };
  }

  // ------------------------------------------ la targeta d'inici i l'escalfor

  var CAU_TARGETA = CAU + 'targeta';
  var VIDA_TARGETA = 21600;   // 6 h: val més una xifra d'abans que cap xifra

  function fesLaTargeta_(r) {
    return {
      etiqueta: r.vencudes ? 'Tasques vençudes' : 'Tasques per fer',
      valor: r.vencudes || r.perFer,
      urgent: r.vencudes > 0,
      accio: 'tasques'
    };
  }

  /**
   * La targeta d'inici sense trucar a Google.
   *
   * Cada llista de tasques és una volta a l'API, i eren dos segons de la teva
   * obertura per dir-te un número. Si les llistes ja estan desades —les desa
   * `escalfa()` cada deu minuts—, es fa la xifra amb elles i no costa res; si
   * no, es torna l'última que es va poder fer.
   */
  function targeta() {
    var cau = null;
    try { cau = CacheService.getScriptCache(); } catch (e) {}

    if (serveiHiEs() && totDesat_()) {
      var t = fesLaTargeta_(compte());
      if (cau) { try { cau.put(CAU_TARGETA, JSON.stringify(t), VIDA_TARGETA); } catch (e) {} }
      return t;
    }
    if (cau) {
      try {
        var vella = cau.get(CAU_TARGETA);
        if (vella) return JSON.parse(vella);
      } catch (e) {}
    }
    return { etiqueta: 'Tasques', valor: '—', urgent: false, accio: 'tasques' };
  }

  /* ¿Hi ha totes les llistes que mires desades? Si en falta una, muntar la
     xifra vol dir trucar a Google, i això no ho fa una petició teva. */
  function totDesat_() {
    var cau = null;
    try { cau = CacheService.getScriptCache(); } catch (e) { return false; }
    if (!cau) return false;
    var v = versioCau_();
    var mires = queMires_();
    if (!mires.length) return false;
    for (var i = 0; i < mires.length; i++) {
      if (!cau.get(CAU + v + '_p_' + mires[i].id)) return false;
    }
    return true;
  }

  function escalfa() {
    if (!serveiHiEs()) return { ms: 0, saltat: 'sense servei' };
    var t0 = Date.now();
    var d = pantalla({});
    var t = fesLaTargeta_({ perFer: d.tasques.length, vencudes: d.vencudes });
    try { CacheService.getScriptCache().put(CAU_TARGETA, JSON.stringify(t), VIDA_TARGETA); } catch (e) {}
    return { ms: Date.now() - t0, pendents: d.tasques.length };
  }

  /**
   * Què ha passat entre dues dates. Per a la revisió setmanal.
   *
   * Diu les fetes i, sobretot, LA MÉS VELLA que segueix pendent: una tasca que
   * arrossegues des de fa tres setmanes o la fas o la treus, però tenir-la
   * allà no és tenir-la controlada.
   */
  function resumPeriode(desde, fins) {
    if (!serveiHiEs()) return null;
    var d = pantalla({});
    var f = fetes({}).fetes.filter(function (t) {
      return t.fetEl && t.fetEl >= desde && t.fetEl <= fins;
    });

    if (!f.length && !d.tasques.length) return null;

    var linies = [];
    linies.push(f.length + (f.length === 1 ? ' feta' : ' fetes'));
    if (d.tasques.length) {
      linies.push(d.tasques.length + ' pendents' +
        (d.vencudes ? ', ' + d.vencudes + ' de vençudes' : ''));
    }
    var vencudes = d.tasques.filter(function (t) { return t.vencuda; });
    if (vencudes.length) {
      var vella = vencudes.slice().sort(function (a, b) {
        return String(a.vencEl).localeCompare(String(b.vencEl));
      })[0];
      linies.push('La que fa més que arrossegues: «' + vella.text + '», vencia el ' + vella.vencEl);
    }
    return { titol: 'Tasques', linies: linies };
  }

  // ---------------------------------------------------------- escriptura

  /**
   * Capturar NO demana res més que el text.
   *
   * Ni llista, ni data, ni prioritat: cada camp obligatori al moment de
   * capturar és una excusa per no capturar, i el que no s'apunta es perd. Cau
   * a la llista principal de Google Tasks i ja ho mouràs.
   */
  function captura(text, origen, llistaId) {
    calServei_();
    var t = String(text || '').trim();
    if (!t) throw new Error('No has dit què vols apuntar.');

    var llista = llistaId || llistaPerDefecte_().id;
    var creada = Tasks.Tasks.insert({ title: t }, llista);
    buidaCau();
    return { id: creada.id, llista: llista, text: t };
  }

  /**
   * Canviar una tasca.
   *
   * El text, la nota i la data van a Google. La prioritat i «hi estic» van al
   * nostre full. I si canvia de llista, Google no la mou: se'n fa una de nova
   * i s'esborra la vella —o sigui que canvia d'id, i les nostres marques han
   * de seguir-la.
   */
  function edita(p) {
    calServei_();
    if (!p || !p.id || !p.llista) throw new Error('Falta saber quina tasca.');

    var t = Tasks.Tasks.get(p.llista, p.id);
    if (!t) throw new Error('Aquesta tasca ja no hi és.');

    var toca = false;
    if (p.text !== undefined) {
      var text = String(p.text).trim();
      if (!text) throw new Error('El text no pot quedar buit.');
      t.title = text; toca = true;
    }
    if (p.nota !== undefined) { t.notes = String(p.nota || ''); toca = true; }
    if (p.venc_el !== undefined) {
      var due = dataCapAGoogle_(p.venc_el);
      /* Treure la data vol dir `update` sense el camp: amb `patch` i null,
         Google se la queda. */
      if (due) t.due = due; else delete t.due;
      toca = true;
    }

    var id = p.id, llista = p.llista;
    if (toca) { Tasks.Tasks.update(t, llista, id); }

    if (p.llistaNova && p.llistaNova !== llista) {
      var copia = { title: t.title, notes: t.notes || '' };
      if (t.due) copia.due = t.due;
      var nova = Tasks.Tasks.insert(copia, p.llistaNova);
      Tasks.Tasks.remove(llista, id);
      var vella = Dades.un('TasquesMarques', { tasca: id });
      if (vella) Dades.actualitza('TasquesMarques', vella.id, { tasca: nova.id, llista: p.llistaNova });
      id = nova.id; llista = p.llistaNova;
    }

    if (p.prioritat !== undefined || p.fent !== undefined) {
      var canvis = {};
      if (p.prioritat !== undefined) canvis.prioritat = p.prioritat ? 'alta' : '';
      if (p.fent !== undefined) canvis.fent = p.fent ? 'SI' : '';
      posaMarca_(id, llista, canvis);
    }

    buidaCau();
    return { id: id, llista: llista };
  }

  /** Completar no esborra: Google la deixa marcada i es pot desfer. */
  function completa(id, llista, desfes) {
    calServei_();
    if (!id || !llista) throw new Error('Falta saber quina tasca.');
    var t = Tasks.Tasks.get(llista, id);
    if (!t) throw new Error('Aquesta tasca ja no hi és.');

    if (desfes) { t.status = 'needsAction'; delete t.completed; }
    else { t.status = 'completed'; }

    Tasks.Tasks.update(t, llista, id);
    if (!desfes) posaMarca_(id, llista, { fent: '' });
    buidaCau();
    return { id: id, feta: !desfes };
  }

  /**
   * Treure una tasca L'ESBORRA de Google Tasks, i això no es pot desfer.
   *
   * Al full antic «treure» era posar-hi una data i la fila hi continuava. Aquí
   * la tasca no és nostra: és de Google, i esborrar-la vol dir esborrar-la. Per
   * això la pantalla ho pregunta abans i el nom del botó ho diu.
   */
  function treu(id, llista) {
    calServei_();
    if (!id || !llista) throw new Error('Falta saber quina tasca.');
    Tasks.Tasks.remove(llista, id);
    var m = Dades.un('TasquesMarques', { tasca: id });
    if (m) Dades.actualitza('TasquesMarques', m.id, { prioritat: '', fent: '' });
    buidaCau();
    return { tret: true };
  }

  // ------------------------------------------------------------- per a la IA

  function aixafa_(text) {
    var s = String(text || '').toLowerCase().trim();
    var amb = 'àáâäèéêëìíîïòóôöùúûüñç', sense = 'aaaaeeeeiiiioooouuuunc';
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var n = amb.indexOf(s.charAt(i));
      out += n === -1 ? s.charAt(i) : sense.charAt(n);
    }
    return out;
  }

  /** La que més s'assembla al que ha dit, d'entre les pendents. */
  function troba_(text) {
    var q = aixafa_(text);
    if (!q) return null;
    var totes = pantalla({}).tasques;
    var exacta = totes.filter(function (t) { return aixafa_(t.text) === q; })[0];
    if (exacta) return exacta;
    var conte = totes.filter(function (t) { return aixafa_(t.text).indexOf(q) !== -1; });
    if (conte.length === 1) return conte[0];
    if (conte.length > 1) return conte.sort(ordena_)[0];
    /* I si ha dit més del que hi ha apuntat —«acaba d'una vegada l'informe»
       quan la tasca diu «informe»—, també val. */
    var alReves = totes.filter(function (t) { return q.indexOf(aixafa_(t.text)) !== -1; });
    return alReves[0] || null;
  }

  function consultaIA(a) {
    a = a || {};
    var d = pantalla({});
    if (!d.hiHaServei) return { tasques: [], nota: 'Google Tasks no està engegat.' };

    var l = d.tasques;
    if (a.llista) {
      var quina = llistaPerNom_(a.llista);
      if (quina) l = l.filter(function (t) { return t.llista === quina.id; });
    }
    if (a.nomes_vencudes) l = l.filter(function (t) { return t.vencuda; });

    return {
      quantes: l.length,
      tasques: l.slice(0, 30).map(function (t) {
        return { text: t.text, llista: t.llistaNom, venc_el: t.vencEl,
                 vencuda: t.vencuda, prioritat: t.prioritat };
      })
    };
  }

  function apuntaPerNom(a) {
    a = a || {};
    var quina = a.llista ? llistaPerNom_(a.llista) : null;
    var r = captura(a.text, 'conversa', quina ? quina.id : null);
    if (a.venc_el) edita({ id: r.id, llista: r.llista, venc_el: a.venc_el });
    return { fet: true, text: r.text, llista: (quina || llistaPerDefecte_()).nom };
  }

  function completaPerNom(a) {
    a = a || {};
    var t = troba_(a.text);
    if (!t) throw new Error('No trobo cap tasca que digui «' + (a.text || '') + '».');
    completa(t.id, t.llista, !!a.desfes);
    return { fet: true, text: t.text };
  }

  function classificaPerNom(a) {
    a = a || {};
    var t = troba_(a.text);
    if (!t) throw new Error('No trobo cap tasca que digui «' + (a.text || '') + '».');
    var canvis = { id: t.id, llista: t.llista };
    if (a.venc_el) canvis.venc_el = a.venc_el;
    if (a.prioritat !== undefined) canvis.prioritat = !!a.prioritat;
    if (a.llista) {
      var quina = llistaPerNom_(a.llista);
      if (quina && quina.id !== t.llista) canvis.llistaNova = quina.id;
    }
    edita(canvis);
    return { fet: true, text: t.text };
  }

  function treuPerNom(a) {
    a = a || {};
    var t = troba_(a.text);
    if (!t) throw new Error('No trobo cap tasca que digui «' + (a.text || '') + '».');
    treu(t.id, t.llista);
    return { fet: true, text: t.text };
  }

  return {
    serveiHiEs: serveiHiEs,
    targeta: targeta,
    escalfa: escalfa,
    sincronitzaLlistes: sincronitzaLlistes,
    llistes: llistes,
    mostra: mostra,
    pantalla: pantalla,
    fetes: fetes,
    compte: compte,
    resumPeriode: resumPeriode,
    captura: captura,
    edita: edita,
    completa: completa,
    treu: treu,
    consultaIA: consultaIA,
    apuntaPerNom: apuntaPerNom,
    completaPerNom: completaPerNom,
    classificaPerNom: classificaPerNom,
    treuPerNom: treuPerNom,
    buidaCau: buidaCau
  };
})();
