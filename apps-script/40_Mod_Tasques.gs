/**
 * JEFE — MÒDUL · Tasques i captura ràpida
 *
 * Cap línia del nucli s'ha tocat per afegir aquest fitxer.
 *
 * PER QUÈ CAPTURA I TASQUES SÓN EL MATEIX MÒDUL
 *   Al briefing eren dos. Són el mateix objecte en dos moments: el que
 *   captures ARA sense pensar-hi, i el que decideixes DESPRÉS que era. Si
 *   fossin dos mòduls, en capturar hauries de triar a quin dels dos va —i
 *   estalviar-te justament aquesta decisió és per al que serveix una captura
 *   ràpida. Aquí tot cau a la safata i es classifica quan tens temps.
 *
 * DECISIONS DE DISSENY
 *
 *   1. CAPTURAR NO DEMANA RES MÉS QUE EL TEXT. Ni context, ni prioritat, ni
 *      data. Qualsevol camp obligatori al moment de capturar és una excusa
 *      per no capturar, i el que no s'apunta es perd.
 *
 *   2. Els contextos són els seus tres i no una llista genèrica: docència,
 *      agent rural i personal. Surten del briefing, no d'una plantilla.
 *
 *   3. La safata és un estat, no una pantalla a part. Una tasca sense
 *      classificar és una tasca amb feina pendent, no una altra cosa.
 *
 *   4. RES S'ESBORRA. Completar no esborra: posa data a `fet_el` i la treu de
 *      la llista. L'històric del que has fet és la meitat del valor.
 */
function MODUL_TASQUES() {
  return {
    id: 'tasques',
    nom: 'Tasques',
    icona: 'tasques',
    ordre: 15,
    versioEsquema: 1,

    fulls: [
      {
        nom: 'Tasques',
        columnes: [
          { nom: 'id',              tipus: 'text' },
          { nom: 'text',            tipus: 'text' },
          { nom: 'estat',           tipus: 'text', valors: ['safata', 'per_fer', 'fent', 'feta'] },
          { nom: 'context',         tipus: 'text', valors: ['docencia', 'rural', 'personal'] },
          { nom: 'prioritat',       tipus: 'text', valors: ['', 'alta'] },
          { nom: 'venc_el',         tipus: 'data' },
          { nom: 'fet_el',          tipus: 'data' },
          { nom: 'nota',            tipus: 'text' },
          { nom: 'origen',          tipus: 'text', valors: ['app', 'veu', 'conversa'] },
          { nom: 'esborrat_el',     tipus: 'iso'  },
          { nom: 'creat_el',        tipus: 'iso'  },
          { nom: 'actualitzat_el',  tipus: 'iso'  }
        ]
      }
    ],

    accions: {
      pantalla: function (p) { return Tasques.pantalla(p); },
      captura:  function (p) { return Tasques.captura(p.text, p.origen); },
      edita:    function (p) { return Tasques.edita(p.id, p); },
      completa: function (p) { return Tasques.completa(p.id, p.desfes); },
      treu:     function (p) { return Tasques.treu(p.id); },
      neteja:   function ()  { return Tasques.netejaFetes(); }
    },

    resumInici: function () {
      var r = Tasques.compte();
      return {
        etiqueta: r.safata ? 'A la safata' : (r.vencudes ? 'Tasques vençudes' : 'Tasques per fer'),
        valor: r.safata || r.vencudes || r.perFer,
        urgent: r.safata > 0 || r.vencudes > 0,
        accio: 'tasques'
      };
    },

    contextIA: function () {
      var d = Tasques.pantalla({});
      if (!d.tasques.length && !d.safata.length) return 'Tasques: no en té cap de pendent.';

      var l = ['Tasques d\'en Pol:'];
      if (d.safata.length) l.push('- ' + d.safata.length + ' coses a la safata, sense classificar.');

      var vencudes = d.tasques.filter(function (t) { return t.vencuda; });
      if (vencudes.length) {
        l.push('- VENCUDES (' + vencudes.length + '): ' +
               vencudes.slice(0, 5).map(function (t) { return t.text; }).join('; '));
      }
      var avui = d.tasques.filter(function (t) { return t.venAvui; });
      if (avui.length) {
        l.push('- Per avui: ' + avui.map(function (t) { return t.text; }).join('; '));
      }
      l.push('- Pendents en total: ' + d.tasques.length);
      return l.join('\n');
    },

    einesIA: [{
      nom: 'consulta_tasques',
      descripcio: 'Les tasques pendents de l\'usuari. Pot filtrar per context ' +
                  '(docencia, rural, personal) o demanar només les vençudes.',
      esquema: {
        type: 'object',
        properties: {
          context: { type: 'string', description: 'docencia, rural o personal' },
          nomes_vencudes: { type: 'boolean', description: 'Només les que ja han passat de data' },
          incloure_fetes: { type: 'boolean', description: 'Incloure-hi les ja completades' }
        }
      },
      executa: function (a) { return Tasques.consultaIA(a); }
    }, {
      nom: 'apunta_tasca',
      descripcio: 'Apunta una cosa per fer. NO s\'executa directament: genera una ' +
                  'proposta que en Pol ha de confirmar amb un botó.',
      escriu: true,
      esquema: {
        type: 'object',
        properties: {
          text:    { type: 'string', description: 'Què s\'ha de fer' },
          context: { type: 'string', description: 'docencia, rural o personal. Si no se sap, s\'omet.' },
          venc_el: { type: 'string', description: 'Data límit AAAA-MM-DD, si n\'hi ha' }
        },
        required: ['text']
      },
      etiqueta: function (a) {
        return 'Apuntar «' + (a.text || '?') + '»' + (a.venc_el ? ' per al ' + a.venc_el : '');
      },
      executa: function (a) { return Tasques.apuntaPerNom(a); }
    }, {
      nom: 'completa_tasca',
      descripcio: 'Marca una tasca com a feta. S\'identifica pel text, encara que no sigui ' +
                  'exacte. NO s\'executa directament: genera una proposta a confirmar.',
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
      descripcio: 'Posa context, data límit o prioritat a una tasca que ja existeix. ' +
                  'Serveix per treure coses de la safata. NO s\'executa directament.',
      escriu: true,
      esquema: {
        type: 'object',
        properties: {
          text:      { type: 'string', description: 'Part del text de la tasca' },
          context:   { type: 'string', description: 'docencia, rural o personal' },
          venc_el:   { type: 'string', description: 'Data límit AAAA-MM-DD' },
          prioritat: { type: 'boolean', description: 'true per marcar-la prioritària' }
        },
        required: ['text']
      },
      etiqueta: function (a) {
        var q = [];
        if (a.context) q.push('context ' + a.context);
        if (a.venc_el) q.push('per al ' + a.venc_el);
        if (a.prioritat) q.push('prioritària');
        return 'Posar «' + (a.text || '?') + '» com a ' + (q.join(', ') || 'per fer');
      },
      executa: function (a) { return Tasques.classificaPerNom(a); }
    }, {
      nom: 'treu_tasca',
      descripcio: 'Treu una tasca de la llista. NO s\'executa directament: genera una ' +
                  'proposta a confirmar.',
      escriu: true,
      esquema: {
        type: 'object',
        properties: { text: { type: 'string', description: 'Part del text de la tasca' } },
        required: ['text']
      },
      etiqueta: function (a) { return 'TREURE la tasca «' + (a.text || '?') + '»'; },
      executa: function (a) { return Tasques.treuPerNom(a); }
    }],

    vista: 'vista_tasques'
  };
}


var Tasques = (function () {

  /* Els seus tres contextos. Surten del briefing i no d'una llista genèrica:
     la seva vida té aquests tres compartiments i no cap altre. */
  var CONTEXTOS = [
    { clau: 'docencia', nom: 'Docència' },
    { clau: 'rural',    nom: 'Agent rural' },
    { clau: 'personal', nom: 'Personal' }
  ];

  var ESTATS = ['safata', 'per_fer', 'fent', 'feta'];

  function vives_(filtre) {
    return Dades.llegeix('Tasques', function (f) {
      if (f.esborrat_el) return false;
      return !filtre || filtre(f);
    });
  }

  function ambDades_(f, avui) {
    var venc = String(f.venc_el || '');
    return {
      id: f.id,
      text: f.text,
      estat: f.estat || 'safata',
      context: f.context || '',
      contextNom: (CONTEXTOS.filter(function (c) { return c.clau === f.context; })[0] || {}).nom || '',
      prioritat: f.prioritat || '',
      vencEl: venc,
      vencuda: !!venc && venc < avui,
      venAvui: venc === avui,
      fetEl: f.fet_el || '',
      nota: f.nota || '',
      origen: f.origen || 'app'
    };
  }

  // -------------------------------------------------------------- pantalla

  /**
   * La safata i les pendents, separades.
   *
   * L'ordre de les pendents no és per data de creació sinó pel que et convé
   * mirar: primer el que ja ha vençut, després el que venç, i al final el que
   * no té data. Una llista ordenada per quan la vas escriure no ajuda ningú.
   */
  function pantalla(p) {
    p = p || {};
    var avui = Utils.avui();
    var totes = vives_().map(function (f) { return ambDades_(f, avui); });

    var safata = totes.filter(function (t) { return t.estat === 'safata'; })
      .sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });

    var pendents = totes.filter(function (t) {
      return t.estat === 'per_fer' || t.estat === 'fent';
    }).sort(function (a, b) {
      // Sense data va al final: no és més urgent per ser més antiga.
      var ad = a.vencEl || '9999-99-99', bd = b.vencEl || '9999-99-99';
      if (ad !== bd) return ad.localeCompare(bd);
      if (a.prioritat !== b.prioritat) return a.prioritat === 'alta' ? -1 : 1;
      return String(a.id).localeCompare(String(b.id));
    });

    var fetes = totes.filter(function (t) { return t.estat === 'feta'; })
      .sort(function (a, b) { return String(b.fetEl).localeCompare(String(a.fetEl)); })
      .slice(0, 20);      // les últimes vint: l'històric sencer no es mira

    return {
      avui: avui,
      safata: safata,
      tasques: pendents,
      fetes: fetes,
      contextos: CONTEXTOS,
      vencudes: pendents.filter(function (t) { return t.vencuda; }).length
    };
  }

  function compte() {
    var avui = Utils.avui();
    var totes = vives_().map(function (f) { return ambDades_(f, avui); });
    var pendents = totes.filter(function (t) { return t.estat === 'per_fer' || t.estat === 'fent'; });
    return {
      safata: totes.filter(function (t) { return t.estat === 'safata'; }).length,
      perFer: pendents.length,
      vencudes: pendents.filter(function (t) { return t.vencuda; }).length
    };
  }

  // ------------------------------------------------------------ escriptura

  /**
   * Capturar NO demana res més que el text.
   *
   * Ni context, ni prioritat, ni data. Cada camp obligatori al moment de
   * capturar és una excusa per no capturar, i el que no s'apunta es perd.
   * Va a la safata, i ja decidiràs què era.
   */
  function captura(text, origen) {
    var t = String(text || '').trim();
    if (!t) throw new Error('No has dit què vols apuntar.');

    return Dades.insereix('Tasques', {
      text: t,
      estat: 'safata',
      context: '',
      prioritat: '',
      venc_el: '',
      fet_el: '',
      nota: '',
      origen: origen || 'app'
    }, 'tsk');
  }

  function edita(id, p) {
    if (!id) throw new Error('Falta l\'identificador.');
    var canvis = {};

    if (p.text !== undefined) {
      var t = String(p.text).trim();
      if (!t) throw new Error('El text no pot quedar buit.');
      canvis.text = t;
    }
    if (p.estat !== undefined && ESTATS.indexOf(p.estat) !== -1) canvis.estat = p.estat;
    if (p.context !== undefined) canvis.context = p.context;
    if (p.prioritat !== undefined) canvis.prioritat = p.prioritat === 'alta' ? 'alta' : '';
    if (p.venc_el !== undefined) canvis.venc_el = p.venc_el || '';
    if (p.nota !== undefined) canvis.nota = p.nota;

    /* Classificar una cosa de la safata la treu d'allà sola. Obligar-te a
       triar «per fer» a part de dir-ne el context serien dos tocs per a una
       sola decisió. */
    if (canvis.context && !p.estat) {
      var actual = Dades.perId('Tasques', id);
      if (actual && actual.estat === 'safata') canvis.estat = 'per_fer';
    }

    var r = Dades.actualitza('Tasques', id, canvis);
    if (!r) throw new Error('Aquesta tasca no existeix.');
    return r;
  }

  /** Completar no esborra: marca. Es pot desfer. */
  function completa(id, desfes) {
    if (!id) throw new Error('Falta l\'identificador.');
    var r = Dades.actualitza('Tasques', id, desfes
      ? { estat: 'per_fer', fet_el: '' }
      : { estat: 'feta', fet_el: Utils.avui() });
    if (!r) throw new Error('Aquesta tasca no existeix.');
    return r;
  }

  function treu(id) {
    if (!id) throw new Error('Falta l\'identificador.');
    var r = Dades.actualitza('Tasques', id, { esborrat_el: Utils.ara() });
    if (!r) throw new Error('Aquesta tasca no existeix.');
    return { tret: true };
  }

  /**
   * Buidar la llista de fetes.
   *
   * «Res s'esborra» segueix sent cert al full: es marquen amb data
   * d'esborrat, igual que treure'n una de sola, i la fila hi continua. El que
   * desapareix és de la pantalla. Una llista de fetes que no es pot buidar
   * acaba sent soroll permanent a sota de la que sí que has de mirar.
   */
  function netejaFetes() {
    var fetes = vives_(function (f) { return f.estat === 'feta'; });
    if (!fetes.length) return { tretes: 0 };
    var n = Dades.actualitzaMoltes('Tasques',
      fetes.map(function (f) { return f.id; }), { esborrat_el: Utils.ara() });
    return { tretes: n };
  }

  // -------------------------------------------------------------------- IA

  function consultaIA(a) {
    a = a || {};
    var d = pantalla({});
    var llista = d.tasques;

    if (a.context) {
      var c = String(a.context).toLowerCase();
      llista = llista.filter(function (t) { return t.context === c; });
    }
    if (a.nomes_vencudes) llista = llista.filter(function (t) { return t.vencuda; });

    var out = {
      safata: d.safata.length,
      pendents: llista.length,
      vencudes: llista.filter(function (t) { return t.vencuda; }).length,
      llista: llista.slice(0, 25).map(function (t) {
        return t.text + (t.vencEl ? ' (per al ' + t.vencEl + (t.vencuda ? ', VENÇUDA' : '') + ')' : '') +
               (t.contextNom ? ' [' + t.contextNom + ']' : '');
      })
    };
    if (a.incloure_fetes) {
      out.fetes = d.fetes.slice(0, 15).map(function (t) { return t.text + ' (fet el ' + t.fetEl + ')'; });
    }
    return out;
  }

  /** Ve d'una proposta confirmada. Si porta context o data, ja no va a la safata. */
  function apuntaPerNom(a) {
    var r = captura(a.text, 'conversa');

    var canvis = {};
    var ctx = String(a.context || '').toLowerCase();
    if (CONTEXTOS.filter(function (c) { return c.clau === ctx; }).length) canvis.context = ctx;
    if (a.venc_el && /^\d{4}-\d{2}-\d{2}$/.test(String(a.venc_el))) canvis.venc_el = a.venc_el;
    if (Object.keys(canvis).length) {
      canvis.estat = 'per_fer';
      r = Dades.actualitza('Tasques', r.id, canvis);
    }

    return {
      apuntat: true,
      text: r.text,
      // Si ha anat a la safata s'ha de dir: si no, semblaria classificada.
      on: r.estat === 'safata' ? 'a la safata, per classificar' : 'a les pendents',
      vencEl: r.venc_el || null
    };
  }

  /**
   * TROBAR UNA TASCA PEL QUE EN DIUS, NO PEL SEU IDENTIFICADOR.
   *
   * En Pol diu «la de l'informe», no «tsk_ln4k2x_a7f». Però una coincidència
   * a mitges és pitjor que cap: si dues tasques encaixen, NO se'n tria una a
   * l'atzar. Es retornen totes dues i que ho pregunti. Completar la tasca
   * equivocada perquè el nom s'assemblava és exactament la mena d'error que
   * et fa deixar de confiar en l'assistent.
   */
  function troba_(text, inclouFetes) {
    var q = String(text || '').trim().toLowerCase();
    if (!q) throw new Error('No has dit quina tasca.');

    var avui = Utils.avui();
    var totes = vives_(function (f) {
      return inclouFetes || f.estat !== 'feta';
    }).map(function (f) { return ambDades_(f, avui); });

    var exactes = totes.filter(function (t) { return t.text.toLowerCase() === q; });
    var candidats = exactes.length ? exactes
      : totes.filter(function (t) { return t.text.toLowerCase().indexOf(q) !== -1; });

    if (!candidats.length) {
      throw new Error('No trobo cap tasca que digui «' + text + '».');
    }
    if (candidats.length > 1) {
      throw new Error('N\'hi ha ' + candidats.length + ' que hi encaixen: ' +
        candidats.slice(0, 5).map(function (t) { return '«' + t.text + '»'; }).join(', ') +
        '. Digues quina exactament.');
    }
    return candidats[0];
  }

  function completaPerNom(a) {
    var t = troba_(a.text, !!a.desfes);
    completa(t.id, !!a.desfes);
    return { fet: !a.desfes, tasca: t.text };
  }

  function classificaPerNom(a) {
    var t = troba_(a.text, false);
    var canvis = {};

    var ctx = String(a.context || '').toLowerCase();
    if (ctx) {
      if (!CONTEXTOS.filter(function (c) { return c.clau === ctx; }).length) {
        throw new Error('«' + a.context + '» no és cap context. Són: docencia, rural o personal.');
      }
      canvis.context = ctx;
    }
    if (a.venc_el) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(a.venc_el))) {
        throw new Error('La data ha de ser AAAA-MM-DD.');
      }
      canvis.venc_el = a.venc_el;
    }
    if (a.prioritat !== undefined) canvis.prioritat = a.prioritat ? 'alta' : '';
    if (!Object.keys(canvis).length) throw new Error('No has dit què li vols posar.');

    var r = edita(t.id, canvis);
    return { tasca: r.text, context: r.context || null, vencEl: r.venc_el || null,
             prioritaria: r.prioritat === 'alta' };
  }

  function treuPerNom(a) {
    var t = troba_(a.text, true);
    treu(t.id);
    return { tret: true, tasca: t.text };
  }

  return {
    CONTEXTOS: CONTEXTOS,
    completaPerNom: completaPerNom,
    classificaPerNom: classificaPerNom,
    treuPerNom: treuPerNom,
    pantalla: pantalla,
    compte: compte,
    captura: captura,
    edita: edita,
    completa: completa,
    treu: treu,
    netejaFetes: netejaFetes,
    consultaIA: consultaIA,
    apuntaPerNom: apuntaPerNom
  };
})();
