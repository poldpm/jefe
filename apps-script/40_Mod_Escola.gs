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

    /**
     * L'ESCOLA A LA PÀGINA DEL DIA.
     *
     * La feina de l'escola és part del dia d'en Pol i ha de sortir on mira el
     * dia, no només a la seva pantalla. Hi surten dues coses, i en aquest
     * ordre:
     *
     *   1. El RESUM d'aquell matí, obert. L'automatisme l'envia cada dia a les
     *      set i ja porta els events, les tasques i els correus per llegir.
     *      O sigui que JEFE ja té el seu dia d'escola: és al full, i no cal
     *      demanar res a ningú ni fer cap viatge de més per ensenyar-lo.
     *   2. El que hagi arribat després i encara no hagi llegit.
     *
     * Els esdeveniments no s'hi repeteixen: els calendaris de l'escola ja
     * passen pel pont i surten a «Al calendari», que és on toca.
     *
     * Si aquell dia no hi ha ni resum ni res pendent, no hi surt. Un mòdul que
     * apareix cada dia dient «res» és soroll, i la pàgina del dia ja té prou
     * coses a dir.
     */
    elDia: function (data) { return Escola.elDia(data); },

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

  /* Com es diu cada mena al títol de la notificació. Curtes a posta: el títol
     són dues paraules i la segona ja és aquesta. */
  var MENA_CURTA = {
    acta: 'acta', tasca: 'tasca', event: 'cita', drive: 'Drive',
    resum: 'resum', resposta: 'resposta', avis: ''
  };

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
        /* «Escola · acta», «Escola · resum». El títol diu d'on ve i de quina
           de les set feines de l'automatisme; el contingut sencer va al cos,
           títol inclòs, que si no el perdries. */
        var mena = MENA_CURTA[p.mena] || '';
        var r = Notifica.envia('Escola' + (mena ? ' · ' + mena : ''),
          Utils.talla(Notifica.junta(titol, cos), 220), {
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
    var avui = Utils.avui();
    var f = tots();
    var resum = resumDe_(avui);
    var dia = desglossa_(resum);

    /* Els avisos de mena «tasca» també són pendents: venen d'un correu que
       demanava una cosa i no d'un resum. Van a la mateixa llista, que és on
       els busques. */
    f.forEach(function (m) {
      if (m.mena === 'tasca' && !m.llegit_el) dia.pendents.push({ que: m.titol, id: m.id });
    });

    return {
      avui: avui,
      dia: dia,
      teResum: !!resum,
      /* La resta: tot el que no és ni una hora ni un pendent. Va plegat al peu
         i per això es marca, no s'amaga: el que no es veu no es perd. */
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

  // ------------------------------------------------- QUÈ HI HA EXTRET D'AVUI
  /**
   * EL RESUM DEL MATÍ, OBERT EN PECES.
   *
   * Aquesta pantalla ensenya el que l'automatització n'ha tret, no una segona
   * vista del calendari. I resulta que ja ho té tot: el missatge de les set
   * porta les hores del dia i el que queda pendent, i és al full des de llavors.
   * O sigui que la columna d'hores no costa cap viatge a ningú.
   *
   * El desxifrat és deliberadament curt de gambals. Aquell format és de
   * l'script de l'escola i pot canviar demà; si canvia, el pitjor que ha de
   * passar és que una línia caigui a «la resta» en comptes de tenir hora, no
   * que la pantalla es quedi buida ni que peti.
   */
  function desglossa_(resum) {
    var buit = { hores: [], pendents: [], altres: [] };
    if (!resum) return buit;

    var seccio = '';
    var out = { hores: [], pendents: [], altres: [] };

    String(resum.cos || '').split('\n').forEach(function (l) {
      var t = l.replace(/\*/g, '').trim();
      if (!t) return;

      var esCosa = /^[·•\-]/.test(t);
      if (!esCosa && t.slice(-1) === ':') {
        seccio = aixafa_(t);
        return;
      }
      var text = t.replace(/^[·•\-]\s*/, '').trim();
      if (!text) return;

      /* Una hora al davant vol dir que és una cosa del dia amb hora: «09:00
         Claustre de mestres». La resta de la línia és què és. */
      var m = text.match(/^(\d{1,2}[:.]\d{2})\s*[·\-–]?\s*(.+)$/);
      if (m) {
        out.hores.push({ hora: m[1].replace('.', ':'), que: m[2].trim() });
        return;
      }
      /* NOMÉS EL QUE VA AMB PIC PERTANY A LA SECCIÓ.
         Una línia solta com «Correus no llegits: 3» és una altra capçalera
         —no acaba en dos punts i per això no s'havia detectat— i s'estava
         quedant amb la secció d'abans: acabava a pendents com si fos una
         cosa a fer. Una línia sense pic tanca la secció i va a la resta. */
      if (esCosa && (seccio.indexOf('pendent') !== -1 || seccio.indexOf('tasca') !== -1)) {
        out.pendents.push({ que: text });
        return;
      }
      if (!esCosa) seccio = '';
      out.altres.push({ que: text, seccio: seccio });
    });

    out.hores.sort(function (a, b) { return a.hora < b.hora ? -1 : 1; });
    return out;
  }

  function aixafa_(text) {
    var s = String(text || '').toLowerCase();
    var amb = 'àáâäèéêëìíîïòóôöùúûüñç', sense = 'aaaaeeeeiiiioooouuuunc';
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var n = amb.indexOf(s.charAt(i));
      out += n === -1 ? s.charAt(i) : sense.charAt(n);
    }
    return out;
  }

  /** El resum d'un dia, si n'hi ha. */
  function resumDe_(data) {
    var f = tots();
    for (var i = 0; i < f.length; i++) {
      if (f[i].mena === 'resum' && String(f[i].rebut_el).slice(0, 10) === data) return f[i];
    }
    return null;
  }

  // ---------------------------------------------------------- LA PÀGINA DEL DIA
  function elDia(data) {
    var avui = Utils.avui();
    if (data !== avui) return null;

    var f = tots();
    var coses = [];

    /* EL RESUM DEL MATÍ, OBERT PER LÍNIES. És l'únic missatge que val la pena
       ensenyar sencer: no és un avís d'una cosa, és el dia. Cada línia seva
       passa a ser una cosa de la pàgina, que és com es llegeix una llista.
       Les capçaleres del missatge —les que van entre asteriscs— es queden com
       a text de la línia i prou. */
    var resum = null;
    for (var i = 0; i < f.length && !resum; i++) {
      if (f[i].mena === 'resum' && String(f[i].rebut_el).slice(0, 10) === avui) resum = f[i];
    }
    if (resum) {
      /* El missatge del matí porta seccions —«Avui:», «Pendents:», «Correus no
         llegits: 3»— i sota cadascuna les coses amb un pic. Les seccions no es
         pinten com a línies: passen a ser l'etiqueta de les que vénen a sota,
         que és com es llegeix una llista i no com es llegeix un correu.

         Es fa a la babalà a posta: el format d'aquell missatge és seu i pot
         canviar. Si canvia, el pitjor que passa és que una línia surti sense
         etiqueta, no que això peti ni que et deixi de sortir el dia. */
      var seccio = '';
      String(resum.cos || '').split('\n').forEach(function (l) {
        var t = l.replace(/\*/g, '').trim();
        if (!t) return;

        var esCosa = /^[·•\-]/.test(t);
        if (!esCosa && t.slice(-1) === ':') {
          seccio = t.slice(0, -1).replace(/^[^\wÀ-ÿ]+/, '').trim().toLowerCase();
          return;                                   // el títol no és cap cosa
        }
        coses.push({
          text: t.replace(/^[·•\-]\s*/, ''),
          menut: esCosa ? seccio : 'de l\'escola'
        });
      });
      if (!coses.length && resum.titol) coses.push({ text: resum.titol, menut: 'resum del matí' });
    }

    // I el que hagi arribat després i encara no hagi llegit
    var nous = f.filter(function (m) {
      return !m.llegit_el && (!resum || m.id !== resum.id);
    }).slice(0, 5);
    nous.forEach(function (m) {
      coses.push({ text: m.titol, menut: Utils.faQuant(m.rebut_el), urgent: true });
    });

    if (!coses.length) return null;
    return {
      titol: 'De l\'escola',
      urgent: nous.length > 0,
      accio: 'escola',
      coses: coses.slice(0, 12)
    };
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
    rebre: rebre, elDia: elDia, desglossa: desglossa_, pantalla: pantalla, marcaLlegit: marcaLlegit, llegeixTot: llegeixTot,
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
