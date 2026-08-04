/**
 * JEFE — MÒDUL · La memòria
 *
 * Cap línia del nucli s'ha tocat per afegir aquest fitxer.
 *
 * QUÈ ÉS I PER QUÈ FALTAVA
 *
 *   JEFE sap què tens avui, quantes tasques et queden i com vas de pes. El que
 *   no sabia és RES DE TU: qui és qui a l'escola, què vas decidir el mes
 *   passat, per què vas deixar una cosa a mitges, com t'agrada que et parli.
 *
 *   La fitxa que llegeix la IA es refà cada dia a partir dels fulls. Serveix
 *   per saber com estàs, no per saber qui ets. Això és l'altra meitat: el que
 *   li expliques i ha de recordar sense que li ho tornis a dir.
 *
 * PER QUÈ NO ÉS UNA CONVERSA MÉS LLARGA
 *   Perquè una conversa s'acaba. El que li dius dimarts s'ha de poder fer
 *   servir al setembre, i el que li vas dir fa dos mesos no pot dependre de si
 *   aquell fil encara existeix. Un fet recordat és una fila, no un missatge.
 *
 * LES REGLES
 *
 *   1. UNA COSA PER FILA. «La Marta és la tutora de 2nB» i «els dimarts tinc
 *      claustre» són dos records. Barrejats, no se'n pot esborrar un.
 *   2. RECORDAR NO ÉS ESPIAR. Aquí no hi va res que no li hagis dit tu o que
 *      no hagis escrit tu. No en dedueix cap ni n'inventa.
 *   3. S'ESBORREN SEMPRE. Un record que no es pot treure és una cosa que t'has
 *      de repensar dues vegades abans de dir, i llavors no ho diràs.
 *   4. NO ES BORREN SOLS. Oblidar posa data a `oblidat_el` i la fila es queda:
 *      si un dia et penedeixes, hi és.
 *
 * COM HI ENTRA UNA COSA
 *   Parlant («recorda que el dimarts tinc claustre») o escrivint-la a la seva
 *   pantalla. La IA ho desa DIRECTAMENT i t'ho diu, sense botó de confirmar:
 *   demanar permís per recordar una frase que acabes de dir és fer-ho pesat
 *   per no guanyar res —i s'esborra amb un toc.
 */
function MODUL_MEMORIA() {
  return {
    id: 'memoria',
    nom: 'Memòria',
    icona: 'llegenda',
    ordre: 45,
    versioEsquema: 1,

    fulls: [
      {
        nom: 'Memories',
        columnes: [
          { nom: 'id',              tipus: 'text' },
          { nom: 'fet',             tipus: 'text' },
          /* De quina mena és. No serveix per filtrar de cara enfora: serveix
             perquè la fitxa de la IA els pugui agrupar i perquè tu els puguis
             mirar per blocs. */
          { nom: 'mena',            tipus: 'text',
            valors: ['persona', 'preferencia', 'decisio', 'rutina', 'fet'] },
          { nom: 'clau',            tipus: 'text' },   // per no desar dues vegades el mateix
          { nom: 'font',            tipus: 'text', valors: ['conversa', 'app'] },
          { nom: 'oblidat_el',      tipus: 'iso'  },
          { nom: 'creat_el',        tipus: 'iso'  },
          { nom: 'actualitzat_el',  tipus: 'iso'  }
        ]
      }
    ],

    accions: {
      pantalla: function (p) { return Records.pantalla(p); },
      recorda:  function (p) { return Records.recorda(p.fet, p.mena, 'app'); },
      edita:    function (p) { return Records.edita(p.id, p); },
      oblida:   function (p) { return Records.oblida(p.id); },
      recupera: function (p) { return Records.recupera(p.id); }
    },

    /* No té targeta a l'inici ni surt a la pàgina del dia: no és una cosa que
       hagis de fer, és una cosa que JEFE ha de saber. Sortir-hi cada dia amb
       «tens 34 records» seria soroll sense cap decisió al darrere. */

    /**
     * EL QUE SAP DE TU, dins de la fitxa que llegeix la IA.
     *
     * Va primer i agrupat per menes. Amb quaranta records i una mica de sort
     * són dos mil caràcters: molt menys del que costa una resposta i molt més
     * útil que qualsevol altra cosa que hi hagi a la fitxa.
     */
    contextIA: function () { return Records.contextIA(); },

    einesIA: [{
      nom: 'recorda_aixo',
      descripcio: 'Desa una cosa que en Pol vol que recordis per sempre: una persona i qui és, ' +
                  'una preferència seva, una decisió que ha pres i per què, una rutina fixa, o ' +
                  'un fet qualsevol. Fes-la servir quan digui «recorda que…», «apunta\'t que…» ' +
                  'o quan expliqui una cosa seva que et servirà més endavant. UNA COSA PER ' +
                  'CRIDA: si t\'explica tres coses, crida-la tres vegades.',
      esquema: {
        type: 'object',
        properties: {
          fet:  { type: 'string', description: 'El record, escrit en una frase sencera i clara ' +
                                               'que s\'entengui sense la conversa.' },
          mena: { type: 'string', description: 'persona, preferencia, decisio, rutina o fet' }
        },
        required: ['fet']
      },
      executa: function (a) { return Records.recorda(a.fet, a.mena, 'conversa'); }
    }, {
      nom: 'consulta_memoria',
      descripcio: 'El que saps d\'en Pol. Sense cap paraula, torna tot el que recordes. ' +
                  'Amb `conte`, només el que hi tingui a veure.',
      esquema: {
        type: 'object',
        properties: {
          conte: { type: 'string', description: 'Paraula o tros de frase a buscar' }
        }
      },
      executa: function (a) { return Records.consultaIA(a || {}); }
    }, {
      nom: 'oblida_aixo',
      descripcio: 'Treu un record que ja no val. S\'identifica pel text, encara que no sigui ' +
                  'exacte. NO s\'executa directament: genera una proposta a confirmar.',
      escriu: true,
      esquema: {
        type: 'object',
        properties: { text: { type: 'string', description: 'Part del record' } },
        required: ['text']
      },
      etiqueta: function (a) { return 'Oblidar «' + (a.text || '?') + '»'; },
      executa: function (a) { return Records.oblidaPerNom(a.text); }
    }],

    vista: 'vista_memoria'
  };
}


/* Es diu `Records` i no `Memoria` perquè el nucli ja té una `Memoria`: la de
   les pantalles desades. Dues coses amb el mateix nom en el mateix espai és
   una que se'n menja l'altra i una tarda per trobar-ho. */
var Records = (function () {

  var FULL = 'Memories';
  var MENES = ['persona', 'preferencia', 'decisio', 'rutina', 'fet'];
  var MAX_FITXA = 40;

  function vius() {
    return Dades.llegeix(FULL, function (f) { return !f.oblidat_el; });
  }

  function mena_(m) {
    var x = String(m || '').toLowerCase().trim();
    return MENES.indexOf(x) !== -1 ? x : 'fet';
  }

  /* La clau serveix per no desar dues vegades la mateixa cosa dita d'una
     manera una mica diferent. No és perfecta ni ho ha de ser: si se n'escapa
     una, tens un record repetit i l'esborres. */
  function clau_(fet) {
    return Utils.aixafa(fet).split(' ').filter(function (p) {
      return p.length > 3;                 // fora articles i preposicions
    }).slice(0, 6).sort().join('-');
  }

  /**
   * Desar un record.
   *
   * Si ja n'hi ha un que diu pràcticament el mateix, s'ACTUALITZA en comptes
   * d'afegir-ne un de nou: el que li vas dir al març i el que li dius avui
   * sobre la mateixa cosa són el mateix record, i tenir-ne dos vol dir que un
   * dels dos és vell i no se sap quin.
   */
  function recorda(fet, mena, font) {
    var t = String(fet || '').trim();
    if (!t) throw new Error('No has dit què he de recordar.');
    if (t.length > 500) t = Utils.talla(t, 500);

    var clau = clau_(t);
    var ja = clau ? Dades.un(FULL, { clau: clau }) : null;

    if (ja && !ja.oblidat_el) {
      Dades.actualitza(FULL, ja.id, { fet: t, mena: mena_(mena) });
      return { id: ja.id, fet: t, actualitzat: true };
    }
    if (ja && ja.oblidat_el) {
      /* El vas oblidar i ara el tornes a dir: mana el que dius ara. */
      Dades.actualitza(FULL, ja.id, { fet: t, mena: mena_(mena), oblidat_el: '' });
      return { id: ja.id, fet: t, recuperat: true };
    }

    var r = Dades.insereix(FULL, {
      fet: t, mena: mena_(mena), clau: clau,
      font: font === 'conversa' ? 'conversa' : 'app', oblidat_el: ''
    }, 'mem');
    return { id: r.id, fet: t, nou: true };
  }

  function edita(id, p) {
    if (!id) throw new Error('Falta saber quin record.');
    var canvis = {};
    if (p.fet !== undefined) {
      var t = String(p.fet).trim();
      if (!t) throw new Error('Un record sense text no és res.');
      canvis.fet = t;
      canvis.clau = clau_(t);
    }
    if (p.mena !== undefined) canvis.mena = mena_(p.mena);
    var r = Dades.actualitza(FULL, id, canvis);
    if (!r) throw new Error('Aquest record no existeix.');
    return { id: id };
  }

  /** Oblidar no esborra la fila: hi posa data. Si te'n penedeixes, hi és. */
  function oblida(id) {
    if (!id) throw new Error('Falta saber quin record.');
    var r = Dades.actualitza(FULL, id, { oblidat_el: Utils.ara() });
    if (!r) throw new Error('Aquest record no existeix.');
    return { id: id, oblidat: true };
  }

  function recupera(id) {
    var r = Dades.actualitza(FULL, id, { oblidat_el: '' });
    if (!r) throw new Error('Aquest record no existeix.');
    return { id: id, recuperat: true };
  }

  function oblidaPerNom(text) {
    var q = Utils.aixafa(text || '');
    if (!q) throw new Error('No has dit quin.');
    var tots = vius();
    var trobat = tots.filter(function (r) { return Utils.aixafa(r.fet).indexOf(q) !== -1; })[0];
    if (!trobat) throw new Error('No recordo res que digui «' + text + '».');
    oblida(trobat.id);
    return { fet: trobat.fet, oblidat: true };
  }

  function pantalla(p) {
    p = p || {};
    var q = Utils.aixafa(p.conte || '');
    var tots = Dades.llegeix(FULL);

    var mapa = function (f) {
      return { id: f.id, fet: f.fet, mena: f.mena || 'fet', font: f.font || 'app',
               creatEl: String(f.creat_el || '').slice(0, 10),
               oblidat: !!f.oblidat_el };
    };

    var actius = tots.filter(function (f) { return !f.oblidat_el; }).map(mapa);
    if (q) actius = actius.filter(function (r) { return Utils.aixafa(r.fet).indexOf(q) !== -1; });

    /* Per menes i, dins de cada mena, l'últim primer: el que has dit fa poc és
       el que probablement busques. */
    var blocs = MENES.map(function (m) {
      return { mena: m, records: actius.filter(function (r) { return r.mena === m; }).reverse() };
    }).filter(function (b) { return b.records.length; });

    return {
      blocs: blocs,
      quants: actius.length,
      oblidats: tots.filter(function (f) { return !!f.oblidat_el; }).map(mapa).reverse().slice(0, 30)
    };
  }

  function consultaIA(a) {
    var q = Utils.aixafa(a.conte || '');
    var l = vius().map(function (f) { return { fet: f.fet, mena: f.mena }; });
    if (q) l = l.filter(function (r) { return Utils.aixafa(r.fet).indexOf(q) !== -1; });
    return { quants: l.length, records: l.slice(0, 60) };
  }

  /**
   * El que sap d'en Pol, per posar-ho a la fitxa.
   *
   * Els últims quaranta: si algun dia n'hi ha tres-cents, els vells són els que
   * menys es fan servir i els nous els que acaba de dir. Millor quaranta de
   * bons que tres-cents que no caben.
   */
  function contextIA() {
    var l = vius();
    if (!l.length) return '';

    var darrers = l.slice(-MAX_FITXA);
    var per = {};
    darrers.forEach(function (f) {
      var m = f.mena || 'fet';
      (per[m] = per[m] || []).push(f.fet);
    });

    var NOM = { persona: 'Persones', preferencia: 'Com li agraden les coses',
                decisio: 'Decisions que ha pres', rutina: 'Rutines fixes', fet: 'Altres coses' };

    var trossos = [];
    MENES.forEach(function (m) {
      if (!per[m]) return;
      trossos.push(NOM[m] + ':\n' + per[m].map(function (x) { return '- ' + x; }).join('\n'));
    });
    return 'EL QUE SAPS D\'EN POL (te\'n recordes perquè t\'ho ha dit ell):\n' +
           trossos.join('\n');
  }

  return {
    recorda: recorda, edita: edita, oblida: oblida, recupera: recupera,
    oblidaPerNom: oblidaPerNom, pantalla: pantalla,
    consultaIA: consultaIA, contextIA: contextIA, MENES: MENES
  };
})();
