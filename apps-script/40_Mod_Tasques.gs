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
          /* EL PRIMER PAS I QUAN. Vegeu la nota sobre procrastinació més
             avall: el que desencalla una tasca no és tornar-la a llegir, és
             tenir escrit què faràs exactament i en quin moment. Va aquí i no
             a les notes de Google perquè les notes són seves i sobreescriure
             una cosa que ha escrit ell seria prendre-li-la. */
          { nom: 'primer_pas',      tipus: 'text' },
          { nom: 'pas_quan',        tipus: 'text' },
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

    /**
     * QUÈ PASSA AMB LES TASQUES QUE VALGUI LA PENA INTERROMPRE'L.
     *
     * La recerca sobre procrastinació és clara i no va de disciplina: es deixa
     * per després el que fa sentir malament, i el que costa és COMENÇAR. Amb
     * una tasca vaga que arrossegues fa dues setmanes, recordar-te-la un cop
     * més no fa res —ja saps que hi és—. El que sí que fa alguna cosa és
     * partir-la: demanar-te el primer pas de deu minuts.
     *
     * Per això aquests senyals no renyen mai ni compten quants dies fa per
     * fer-te sentir malament: diuen què hi ha i ofereixen el pas següent.
     */
    senyals: function () { return Tasques.senyals(); },

    resumPeriode: function (desde, fins) { return Tasques.resumPeriode(desde, fins); },

    laSetmana: function (desde, fins) { return Tasques.laSetmana(desde, fins); },

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
          nomes_vencudes: { type: 'boolean', description: 'Només les que ja han passat de data' },
          ensenya: { type: 'boolean',
                     description: 'true si t\'ha demanat VEURE o ENSENYAR les tasques. ' +
                                  'S\'obren en un plafó i tu no les has de recitar.' }
        }
      },
      executa: function (a) { return Tasques.consultaIA(a); }
    }, {
      nom: 'apunta_tasca',
      descripcio: 'Apunta una cosa per fer a Google Tasks. NO s\'executa directament: ' +
                  'genera una proposta que en Pol ha de confirmar, amb el botó o dient-ho.',
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
    }, {
      nom: 'apunta_el_primer_pas',
      descripcio: 'Desa el pla per desencallar una tasca: QUÈ farà exactament els ' +
                  'primers deu minuts i EN QUIN MOMENT. Fes-la servir quan et digui ' +
                  'que una cosa se li fa muntanya, que no sap per on començar o que ' +
                  'fa dies que l\'arrossega.\n' +
                  'ABANS DE CRIDAR-LA, proposa-li tu dos o tres primers passos i deixa ' +
                  'que en triï un. Han de ser ABSURDAMENT PETITS —«obrir el document i ' +
                  'escriure el títol», «buscar el telèfon i apuntar-lo»—: el que costa ' +
                  'és començar, no fer. Un pas que sigui la tasca sencera no serveix.\n' +
                  'El «quan» ha de ser un moment reconeixible del seu dia («demà després ' +
                  'de dinar», «dilluns en arribar a l\'escola»), no una hora exacta.\n' +
                  'NO el renyis mai per haver-ho ajornat, i no comptis quants dies fa.',
      escriu: true,
      esquema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Part del text de la tasca' },
          pas:  { type: 'string', description: 'Què farà exactament els primers deu minuts' },
          quan: { type: 'string', description: 'En quin moment. Un moment del dia, no una hora.' }
        },
        required: ['text', 'pas']
      },
      etiqueta: function (a) {
        return 'Primer pas de «' + (a.text || '?') + '»: ' + (a.pas || '') +
               (a.quan ? ' (' + a.quan + ')' : '');
      },
      executa: function (a) { return Tasques.primerPasPerNom(a); }
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
    var n = Utils.senseAccents(nom);
    if (!n) return null;
    var totes = llistes();
    var exacte = totes.filter(function (l) { return Utils.senseAccents(l.nom) === n; })[0];
    return exacte || totes.filter(function (l) { return Utils.senseAccents(l.nom).indexOf(n) !== -1; })[0] || null;
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
    var nova = { tasca: tascaId, llista: llistaId, prioritat: '', fent: '',
                 primer_pas: '', pas_quan: '' };
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
      primerPas: (marca && marca.primer_pas) || '',
      passQuan: (marca && marca.pas_quan) || '',
      /* L'última vegada que algú la va tocar. Google no diu quan es va crear,
         però sí quan es va modificar per últim cop, i per saber si una cosa
         s'ha encallat això és fins i tot millor: no és «quan la vaig apuntar»,
         és «quant fa que no li faig res». */
      tocadaEl: t.updated ? String(t.updated).slice(0, 10) : '',
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

    if (p.prioritat !== undefined || p.fent !== undefined ||
        p.primer_pas !== undefined || p.pas_quan !== undefined) {
      var canvis = {};
      if (p.prioritat !== undefined) canvis.prioritat = p.prioritat ? 'alta' : '';
      if (p.fent !== undefined) canvis.fent = p.fent ? 'SI' : '';
      if (p.primer_pas !== undefined) canvis.primer_pas = String(p.primer_pas || '').trim();
      if (p.pas_quan !== undefined) canvis.pas_quan = String(p.pas_quan || '').trim();
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

  // --------------------------------------------------------------- senyals

  /**
   * ELS DIES QUE HAN DE PASSAR abans de dir-ne res.
   *
   * Deu no és una xifra rodona per gust: una tasca de quinze dies ja no és una
   * tasca ajornada, és una que no faràs mai tal com està escrita. I una de
   * tres dies no és res: la vida va així.
   */
  var ENCALLADA = 10;

  /* Quantes coses de la pila caben abans que la pila deixi de servir. Vint és
     el que es llegeix d'una passada; a partir d'aquí, ensenyar-ho tot no és
     ser complet, és tornar a l'apartat de tasques amb més passos. */
  var PILA_MAX = 20;

  /**
   * LA SETMANA. Les tasques hi surten de dues maneres, i la diferència importa:
   *
   *   les que TENEN DIA van al seu dia, al costat de les hores que ja hi ha.
   *     Serveixen per veure si dijous cap el que hi has posat.
   *
   *   les que NO EN TENEN van a la pila, i cadascuna porta com posar-s'hi.
   *     Aquesta és la feina de diumenge: mirar què t'espera, mirar on hi ha
   *     lloc, i donar-los dia. La pantalla no decideix res per tu.
   *
   * Les vençudes van a la pila encara que tinguin data: la data que porten és
   * d'abans i el que cal fer amb elles és exactament el mateix, tornar-los-en
   * a posar una. Surten primer, i dient de quan són.
   */
  function laSetmana(desde, fins) {
    if (!serveiHiEs()) return null;
    var d;
    try { d = pantalla({}); } catch (e) { return null; }
    if (!d.hiHaServei) return null;

    var avui = Utils.avui();
    var coses = [];

    var mouA = function (t) {
      return { accio: 'edita', camp: 'venc_el', params: { id: t.id, llista: t.llista } };
    };

    // 1. Les que cauen dins de la setmana, cadascuna al seu dia.
    d.tasques.forEach(function (t) {
      if (!t.vencEl || t.vencEl < desde || t.vencEl > fins) return;
      if (t.vencEl < avui) return;               // vençuda: va a la pila
      coses.push({
        data: t.vencEl, text: t.text, menut: t.llistaNom,
        urgent: t.prioritat === 'alta', mou: mouA(t)
      });
    });

    // 2. La pila: primer les vençudes, després les encallades sense data.
    var pila = [];
    d.tasques.forEach(function (t) {
      if (!t.vencuda) return;
      pila.push({
        data: null, text: t.text,
        menut: Utils.faQuant(t.vencEl) + ' que vencia',
        urgent: true, ordre: 0, quan: t.vencEl, mou: mouA(t)
      });
    });
    d.tasques.forEach(function (t) {
      if (t.vencEl || !t.tocadaEl) return;
      if (Utils.diesEntre(t.tocadaEl, avui) < ENCALLADA) return;
      pila.push({
        data: null, text: t.text,
        /* SI HI HA PLA, EL PLA. Els dies que fa que l'arrossegues no et diuen
           res que no sàpigues i sí que hi posen culpa, que és justament el que
           fa que costi més mirar-la. El primer pas, en canvi, és el que pots
           fer ara. */
        menut: t.primerPas
          ? t.primerPas + (t.passQuan ? ' · ' + t.passQuan : '')
          : Utils.diesEntre(t.tocadaEl, avui) + ' dies sense moure\'s · ' + t.llistaNom,
        ordre: 1, quan: t.tocadaEl, mou: mouA(t)
      });
    });
    pila.sort(function (a, b) {
      if (a.ordre !== b.ordre) return a.ordre - b.ordre;
      return a.quan < b.quan ? -1 : 1;           // la més antiga, primer
    });
    coses = coses.concat(pila.slice(0, PILA_MAX));

    if (!coses.length) return null;
    return { titol: 'Tasques', accio: 'tasques', coses: coses };
  }

  function senyals() {
    if (!serveiHiEs()) return [];
    var d;
    try { d = pantalla({}); } catch (e) { return []; }
    if (!d.hiHaServei) return [];

    var out = [];
    var avui = Utils.avui();

    /* 1. LA MÉS VENÇUDA. Una de sola: dir-te que en tens set de vençudes és
       donar-te set motius per no obrir res. */
    var vencudes = d.tasques.filter(function (t) { return t.vencuda; })
      .sort(function (a, b) { return a.vencEl < b.vencEl ? -1 : 1; });
    if (vencudes.length) {
      var v = vencudes[0];
      out.push({
        id: 'tasca_vencuda:' + v.id,
        titol: 'Vençuda',
        text: '«' + v.text + '» ' + Utils.faQuant(v.vencEl) + ' que vencia' +
              (vencudes.length > 1 ? ' (i ' + (vencudes.length - 1) + ' més)' : '') +
              '. Si ja no toca, treu-li la data.',
        urgencia: 3,
        accio: 'tasques'
      });
    }

    /* 2. LA QUE S'HA ENCALLAT. Sense data i sense moure's: la que et menja el
       cap sense sortir mai a cap llista d'urgents. */
    var vella = null;
    d.tasques.forEach(function (t) {
      if (t.vencEl) return;                       // aquesta ja té la seva data
      if (!t.tocadaEl) return;
      if (Utils.diesEntre(t.tocadaEl, avui) < ENCALLADA) return;
      if (!vella || t.tocadaEl < vella.tocadaEl) vella = t;
    });
    if (vella) out.push(senyalEncallada_(vella, Utils.diesEntre(vella.tocadaEl, avui)));

    return out;
  }

  /**
   * ══════════════════════════════════════════════════════════════════════
   * QUÈ ES DIU D'UNA TASCA ENCALLADA, I PER QUÈ AIXÒ IMPORTA TANT
   * ══════════════════════════════════════════════════════════════════════
   *
   * Una tasca que fa vint dies que és allà no hi és perquè no tinguis temps
   * ni perquè no la vegis. Hi és perquè mirar-la fa una cosa desagradable
   * —avorriment, angúnia, por de fer-la malament— i ajornar-la la treu de
   * sobre a l'instant. La recerca ho diu així: procrastinar no és un
   * problema d'organitzar-se, és una manera de regular l'estat d'ànim a
   * curt termini (Sirois i Pychyl).
   *
   * D'AQUÍ EN SURTEN TRES REGLES, i les tres van contra el que fan la
   * majoria d'apps:
   *
   *   1. NO ES COMPTEN ELS FRACASSOS. Res de «l'has ajornada 5 cops». Fer
   *      sentir malament per haver ajornat és el combustible del cicle:
   *      com pitjor et sents amb la tasca, més la vols treure del davant.
   *
   *   2. QUAN FA MOLT, ES PERDONA. No és amabilitat: perdonar-se a un mateix
   *      haver procrastinat REDUEIX la procrastinació següent, i ho fa
   *      justament perquè baixa l'emoció negativa (Wohl, Pychyl i Bennett,
   *      2010). Per això, passat un mes, el senyal deixa de dir quants dies
   *      fa i diu que això passa.
   *
   *   3. NO ES DEMANA QUE LA FACIS: ES DEMANA EL PRIMER PAS I QUAN. Un pla
   *      del tipus «quan passi X, faré Y» multiplica les possibilitats que
   *      allò es faci —la metaanàlisi de Gollwitzer i Sheeran dona un efecte
   *      de d=0,65, i és més gran quan el pla té forma de «si… llavors» i
   *      quan es reescriu—. Per això aquí es demanen dues coses i no una:
   *      QUÈ faràs exactament, i EN QUIN MOMENT.
   *
   * I una de sola frase: el primer pas ha de ser tan petit que faci riure.
   * L'aversió és a COMENÇAR, no a fer; un cop obert el document, la cosa
   * canvia. «Obrir el document i escriure el títol» és una feina de deu
   * minuts que no fa por, i «l'informe de la batuda» no.
   */
  function senyalEncallada_(t, dies) {
    /* JA TÉ PLA: no se li'n demana un altre. El que fa falta és recordar-lo,
       que és exactament el que la recerca diu que reforça l'efecte. */
    if (t.primerPas) {
      return {
        id: 'tasca_pla:' + t.id,
        titol: 'Ja tens el pas escrit',
        text: '«' + t.text + '»: ' + t.primerPas +
              (t.passQuan ? ' — ' + t.passQuan : '') + '.',
        urgencia: 2,
        accio: 'tasques'
      };
    }

    /* PASSAT UN MES, ES CANVIA DE TO. Dir «fa 47 dies» a algú que ja ho sap
       només serveix per afegir-hi culpa, i la culpa és el que fa que la
       tasca sigui encara més difícil de mirar. */
    if (dies >= 30) {
      return {
        id: 'tasca_encallada:' + t.id,
        titol: 'Fa temps',
        text: '«' + t.text + '» fa setmanes que hi és, i no passa res: ' +
              'les que costen són sempre les mateixes. Si no la faràs, treu-la. ' +
              'I si la faràs, escriu només què faries els primers deu minuts.',
        urgencia: 2,
        accio: 'tasques'
      };
    }

    return {
      id: 'tasca_encallada:' + t.id,
      titol: 'Encallada',
      text: '«' + t.text + '» fa ' + dies + ' dies que hi és i no s\'ha mogut. ' +
            'No cal que la facis: escriu què faries els primers deu minuts, i quan.',
      urgencia: 2,
      accio: 'tasques'
    };
  }

  // ------------------------------------------------------------- per a la IA

  /** La que més s'assembla al que ha dit, d'entre les pendents. */
  function troba_(text) {
    var q = Utils.senseAccents(text);
    if (!q) return null;
    var totes = pantalla({}).tasques;
    var exacta = totes.filter(function (t) { return Utils.senseAccents(t.text) === q; })[0];
    if (exacta) return exacta;
    var conte = totes.filter(function (t) { return Utils.senseAccents(t.text).indexOf(q) !== -1; });
    if (conte.length === 1) return conte[0];
    if (conte.length > 1) return conte.sort(ordena_)[0];
    /* I si ha dit més del que hi ha apuntat —«acaba d'una vegada l'informe»
       quan la tasca diu «informe»—, també val. */
    var alReves = totes.filter(function (t) { return q.indexOf(Utils.senseAccents(t.text)) !== -1; });
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

    var out = {
      quantes: l.length,
      tasques: l.slice(0, 30).map(function (t) {
        return { text: t.text, llista: t.llistaNom, venc_el: t.vencEl,
                 vencuda: t.vencuda, prioritat: t.prioritat };
      })
    };

    /* I si volia VEURE-LES: la data fa de marca, i si en té un pla escrit
       s'ensenya EL PAS i no el títol —el títol d'una tasca encallada és
       justament el que et fa apartar la vista—. */
    if (a.ensenya) {
      out._visor = {
        titol: a.nomes_vencudes ? 'Vençudes' : (a.llista || 'Tasques'),
        mena: 'llista',
        buit: a.nomes_vencudes ? 'No en tens cap de vençuda.' : 'Cap tasca pendent.',
        dades: l.map(function (t) {
          return {
            marca: t.vencEl ? String(t.vencEl).slice(8) + '/' + String(t.vencEl).slice(5, 7) : '·',
            text: t.primerPas || t.text,
            menut: t.primerPas
              ? (t.passQuan || t.text)
              : (t.llistaNom + (t.prioritat === 'alta' ? ' · prioritària' : '')),
            urgent: t.vencuda
          };
        }),
        peu: [l.length + (l.length === 1 ? ' tasca' : ' tasques'),
              d.vencudes ? d.vencudes + ' vençudes' : '']
      };
    }
    return out;
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

  /** El pla d'una tasca, dit parlant. Vegeu `senyalEncallada_` per al perquè. */
  function primerPasPerNom(a) {
    a = a || {};
    var t = troba_(a.text);
    if (!t) throw new Error('No trobo cap tasca que digui «' + (a.text || '') + '».');
    var pas = String(a.pas || '').trim();
    if (!pas) throw new Error('Falta dir quin és el primer pas.');
    edita({ id: t.id, llista: t.llista, primer_pas: pas, pas_quan: String(a.quan || '').trim() });
    return { fet: true, text: t.text, pas: pas, quan: a.quan || '' };
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
    senyals: senyals,
    laSetmana: laSetmana,
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
    primerPasPerNom: primerPasPerNom,
    treuPerNom: treuPerNom,
    buidaCau: buidaCau
  };
})();
