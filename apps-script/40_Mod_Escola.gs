/**
 * 40_Mod_Escola.gs — MÒDUL · L'automatització de l'escola, dins de JEFE
 *
 * QUÈ ÉS I QUÈ NO ÉS.
 * En Pol té un segon script d'Apps Script al compte de l'escola que li llegeix
 * el correu, li processa les actes en PDF, li etiqueta el Gmail i li vigila una
 * carpeta de Drive. Aquell script funciona i AQUÍ NO ES TOCA: ni el cervell, ni
 * la seva clau de Gemini, ni la seva lògica. No pot moure's, i no és una
 * limitació d'aquí —un script d'Apps Script llegeix el correu del compte que
 * l'executa i cap altre—. És la mateixa paret que va obligar a fer el pont del
 * calendari, i està explicada a `44_Calendari_Pont.gs`.
 *
 * El que fa aquest mòdul és substituir-ne el MISSATGER. Fins ara allò parlava
 * per Telegram; ara parla amb JEFE. Res més.
 *
 * PRIMER ES DESA, DESPRÉS S'AVISA, i aquest ordre és tota la gràcia. Amb
 * Telegram, un avís que no arriba s'ha perdut. Aquí el missatge ja és al full
 * abans d'intentar cap notificació: si el mòbil està apagat, si Firebase falla
 * o si no hi ha cobertura, l'obres l'endemà i hi és igual.
 *
 * LES DUES DIRECCIONS, i totes dues ja existien:
 *   escola → JEFE   pel `doPost` del nucli, amb la clau d'accés de sempre.
 *   JEFE → escola   pel mateix patró que el pont del calendari.
 */

function MODUL_ESCOLA() {
  return {
    id: 'escola',
    nom: 'Escola',
    icona: 'escola',
    ordre: 12,                 // entre hàbits (10) i tasques (15): és feina
    versioEsquema: 1,

    fulls: [{
      nom: 'Escola',
      columnes: [
        { nom: 'id',        tipus: 'text' },
        { nom: 'rebut_el',  tipus: 'iso'  },
        /* De quina de les set feines de l'automatisme ve. Serveix per pintar-ho
           i per poder filtrar-ho; el que decideix la mena és l'script de
           l'escola, que és qui ho sap. */
        { nom: 'mena',      tipus: 'text',
          valors: ['avis', 'tasca', 'event', 'acta', 'drive', 'resum', 'resposta'] },
        { nom: 'titol',     tipus: 'text' },
        { nom: 'cos',       tipus: 'text' },
        { nom: 'llegit_el', tipus: 'iso'  }
      ]
    }],

    accions: {
      /* EL QUE CRIDA L'SCRIPT DE L'ESCOLA.
         Va pel `doPost` del nucli, que ja comprova la clau d'accés: aquí dins
         la petició ja és de confiança. */
      rebre: function (p) { return Escola.rebre(p); },

      pantalla:    function (p) { return Escola.pantalla(p); },
      marcaLlegit: function (p) { return Escola.marcaLlegit(p.id); },
      llegeixTot:  function ()  { return Escola.llegeixTot(); },

      /* EL QUE JEFE DEMANA A L'ESCOLA. Aquestes sí que fan un viatge a l'altre
         compte i poden trigar; per això van a part i no dins de `pantalla`. */
      comanda: function (p) { return EscolaPont.comanda(p.quina); },
      digues:  function (p) { return EscolaPont.digues(p.text); },
      prova:   function ()  { return EscolaPont.prova(); }
    },

    resumInici: function () {
      var n = Escola.pendents();
      return {
        etiqueta: n === 0 ? 'Escola al dia' : 'Escola',
        valor: n === 0 ? '✓' : n,
        urgent: n > 0,
        accio: 'escola'
      };
    },

    /* NOMÉS QUAN HI HA ALGUNA COSA SENSE LLEGIR. Un mòdul que surt cada dia a
       la pàgina del dia dient «res» és soroll. */
    elDia: function (data) {
      if (data !== Utils.avui()) return null;
      var c = Escola.senseLlegir(4);
      if (!c.length) return null;
      return {
        titol: 'De l\'escola', urgent: true, accio: 'escola',
        coses: c.map(function (m) {
          return { text: m.titol, menut: Utils.faQuant(m.rebut_el) };
        })
      };
    },

    contextIA: function () { return Escola.contextIA(); },

    einesIA: [{
      nom: 'consulta_escola',
      descripcio: 'Retorna els avisos que ha enviat l\'automatització de l\'escola ' +
                  '(correus detectats, actes de primària, canvis a Drive, resums), ' +
                  'del més recent al més antic.',
      esquema: {
        type: 'object',
        properties: {
          quants: { type: 'integer', description: 'Quants avisos. Per defecte 15.' },
          senseLlegir: { type: 'boolean', description: 'Només els que encara no ha llegit.' }
        }
      },
      executa: function (a) { return Escola.perALaIA(a || {}); }
    }],

    vista: 'vista_escola'
  };
}


var Escola = (function () {

  var MAX_COS = 4000;          // el que cap a una cel·la sense fer-la impossible

  function num_(v, sino) {
    var n = parseInt(v, 10);
    return isFinite(n) ? n : sino;
  }

  // ------------------------------------------------------------------ REBRE
  /**
   * L'entrada de tot. La crida l'script de l'escola en comptes de Telegram.
   *
   * L'ORDRE NO ÉS CASUAL: primer es desa i després s'avisa. Si la notificació
   * peta —Firebase caigut, cap dispositiu registrat, el mòbil sense xarxa—,
   * l'avís ja és al full i el veurà obrint l'app. Amb Telegram, el que no
   * arriba s'ha perdut.
   *
   * I si el desat peta, es propaga: val més que l'escola vegi un error al seu
   * registre i t'ho torni a enviar que no pas que ho doni per fet.
   */
  function rebre(p) {
    p = p || {};
    var titol = String(p.titol || '').trim();
    var cos = String(p.cos || '').trim();

    if (!titol && !cos) throw new Error('Un avís sense títol ni cos no és res.');
    if (!titol) {
      /* Amb només cos, el títol surt de la primera línia: la notificació s'ha
         de poder llegir des de la pantalla blocada sense obrir res. */
      titol = Utils.talla(cos.split('\n')[0], 60);
    }

    var fila = Dades.insereix('Escola', {
      rebut_el: Utils.ara(),
      mena: p.mena || 'avis',
      titol: titol,
      cos: Utils.talla(cos, MAX_COS),
      llegit_el: ''
    }, 'esc');

    var avisat = false, motiu = '';
    try {
      if (p.notifica === false) { motiu = 'no demanada'; }
      else {
        var r = Notifica.envia(titol, Utils.talla(cos, 220), {
          url: 'escola', etiqueta: 'escola-' + (p.mena || 'avis')
        });
        avisat = !!(r && r.enviades);
        if (!avisat) motiu = (r && r.motiu) || 'cap dispositiu';
      }
    } catch (err) {
      motiu = err.message;
      Log.avis('escola.notifica', 'Desat però sense notificar: ' + err.message);
    }

    Log.info('escola.rebre', 'Avís de l\'escola', { mena: p.mena, titol: titol, avisat: avisat });
    return { desat: true, id: fila && fila.id ? fila.id : null, notificat: avisat, motiu: motiu };
  }

  // ------------------------------------------------------------------ LLEGIR
  function tots() {
    var f = Dades.llegeix('Escola');
    f.sort(function (a, b) { return String(a.rebut_el) < String(b.rebut_el) ? 1 : -1; });
    return f;
  }

  function senseLlegir(quants) {
    var f = tots().filter(function (m) { return !m.llegit_el; });
    return quants ? f.slice(0, quants) : f;
  }

  function pendents() { return senseLlegir().length; }

  function pantalla(p) {
    p = p || {};
    var quants = Math.max(1, Math.min(200, num_(p.quants, 60)));
    var f = tots();
    return {
      avui: Utils.avui(),
      missatges: f.slice(0, quants),
      total: f.length,
      pendents: f.filter(function (m) { return !m.llegit_el; }).length,
      pont: EscolaPont.hiEs()
    };
  }

  function marcaLlegit(id) {
    if (!id) throw new Error('Cal l\'identificador del missatge.');
    Dades.actualitza('Escola', id, { llegit_el: Utils.ara() });
    return { fet: true };
  }

  function llegeixTot() {
    var f = senseLlegir();
    var ara = Utils.ara();
    f.forEach(function (m) { Dades.actualitza('Escola', m.id, { llegit_el: ara }); });
    return { fets: f.length };
  }

  // ------------------------------------------------------------- CONTEXT IA
  /* Curt, com mana el contracte: què hi ha pendent i de què va. El detall el
     demana amb l'eina si li cal. */
  function contextIA() {
    var f = senseLlegir(5);
    if (!f.length) return 'Escola: res pendent de l\'automatització.';
    return 'Escola — ' + pendents() + ' avisos sense llegir de l\'automatització:\n' +
      f.map(function (m) {
        return '- ' + m.titol + ' (' + Utils.faQuant(m.rebut_el) + ')';
      }).join('\n');
  }

  function perALaIA(a) {
    var n = Math.max(1, Math.min(60, num_(a.quants, 15)));
    var f = a.senseLlegir ? senseLlegir() : tots();
    return {
      files: f.length,
      senseLlegir: pendents(),
      avisos: f.slice(0, n).map(function (m) {
        return {
          data: m.rebut_el, mena: m.mena, titol: m.titol,
          cos: Utils.talla(String(m.cos || ''), 400),
          llegit: !!m.llegit_el
        };
      })
    };
  }

  return {
    rebre: rebre, pantalla: pantalla, marcaLlegit: marcaLlegit, llegeixTot: llegeixTot,
    pendents: pendents, senseLlegir: senseLlegir, contextIA: contextIA, perALaIA: perALaIA
  };
})();


/**
 * EL PONT CAP A L'SCRIPT DE L'ESCOLA — la direcció contrària.
 *
 * És el mateix patró que `CalendariPont`, i a posta: allò ja fa mesos que
 * funciona contra el mateix compte i la mateixa mena de desplegament. Aquí
 * només canvien les accions que es demanen.
 *
 * Si el pont no està configurat, el mòdul segueix servint: continues rebent
 * tot el que l'escola t'enviï. L'únic que no podràs fer és preguntar-li coses.
 */
var EscolaPont = (function () {

  var PROP_URL  = 'ESCOLA_PONT_URL';
  var PROP_CLAU = 'ESCOLA_PONT_CLAU';

  var COMANDES = ['agenda', 'pendents', 'correus', 'setmana'];

  function config_() {
    var p = PropertiesService.getScriptProperties();
    var url = p.getProperty(PROP_URL);
    var clau = p.getProperty(PROP_CLAU);
    return (url && clau) ? { url: url, clau: clau } : null;
  }

  function hiEs() { return !!config_(); }

  function demana_(accio, dades) {
    var c = config_();
    if (!c) {
      throw new Error('Encara no hi ha pont amb l\'escola. Executa ' +
                      'configuraPontEscola() des de l\'editor.');
    }

    var cos = { clau: c.clau, accio: accio };
    for (var k in dades) cos[k] = dades[k];

    var r;
    try {
      r = UrlFetchApp.fetch(c.url, {
        method: 'post',
        /* `text/plain` a posta: amb JSON, Apps Script hi afegeix una petició de
           comprovació prèvia que l'altra banda no sap respondre. El cos segueix
           sent JSON; només canvia l'etiqueta. Igual que al pont del calendari. */
        contentType: 'text/plain;charset=utf-8',
        payload: JSON.stringify(cos),
        muteHttpExceptions: true,
        followRedirects: true
      });
    } catch (err) {
      throw new Error('No arribo a l\'script de l\'escola: ' + err.message);
    }

    var codi = r.getResponseCode();
    var text = r.getContentText();

    if (codi !== 200) {
      throw new Error('L\'escola ha respost ' + codi + '. ' +
        (codi === 401 || codi === 403
          ? 'Segurament el desplegament no és d\'accés «Qualsevol».'
          : Utils.talla(text, 200)));
    }

    var resposta;
    try { resposta = JSON.parse(text); }
    catch (err) {
      throw new Error('L\'escola no ha contestat amb dades. Això passa quan el ' +
        'desplegament no és d\'accés «Qualsevol»: Google demana iniciar sessió ' +
        'i JEFE no pot.');
    }
    if (!resposta.ok) throw new Error(resposta.error || 'L\'escola ha dit que no.');
    return resposta.dades;
  }

  return {
    hiEs: hiEs,
    comandes: function () { return COMANDES.slice(); },

    comanda: function (quina) {
      if (COMANDES.indexOf(String(quina)) === -1) {
        throw new Error('Comanda desconeguda: «' + quina + '».');
      }
      return demana_('comanda', { quina: String(quina) });
    },

    /* El text natural. JEFE ja transcriu la veu; el que viatja és text, no
       àudio: així l'escola fa servir exactament el mateix camí que ja té provat
       per als missatges escrits, i no hi ha cap format nou pel mig. */
    digues: function (text) {
      var t = String(text || '').trim();
      if (!t) throw new Error('No has dit res.');
      return demana_('digues', { text: t });
    },

    prova: function () { return demana_('prova', {}); }
  };
})();
