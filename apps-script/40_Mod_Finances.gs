/**
 * JEFE — MÒDUL · Finances
 *
 * Ve de l'app «finances», que tenia el seu propi Apps Script i el seu propi
 * full de càlcul. Cap línia del nucli s'ha tocat per afegir aquest fitxer.
 *
 * EL CANVI DE FONS: DE BLOC JSON A FILES
 *   Allà tot l'estat es desava com un text JSON partit en trossos dins d'una
 *   pestanya amagada. És ràpid i compacte, però fa el full il·legible per a
 *   una persona i invisible per a la IA. Aquí cada moviment és una fila.
 *   Així «quant he gastat en restaurants aquest mes» passa a ser una pregunta
 *   que JEFE pot respondre, i el full segueix sent la font de la veritat que
 *   es pot obrir i entendre.
 *
 * DECISIONS DE CÀLCUL (les de l'app original, escrites perquè no es perdin)
 *
 *   1. L'IMPORT SEMPRE ÉS POSITIU. El signe el dona `tipus`: 'd' despesa,
 *      'i' ingrés. Si mai n'entra un de negatiu, se'n pren el valor absolut.
 *
 *   2. Els traspassos entre comptes propis NO són despesa ni ingrés: només
 *      canvien els diners de lloc. Compten a part i no embruten el balanç.
 *
 *   3. Un moviment del banc neix SENSE REVISAR. Els que apuntes tu neixen
 *      revisats. La safata de revisió existeix perquè el banc s'equivoca de
 *      categoria i tu no.
 *
 *   4. RES S'ESBORRA. Treure un moviment li posa data a `esborrat_el` i deixa
 *      de comptar. La fila es queda.
 */
function MODUL_FINANCES() {
  return {
    id: 'finances',
    nom: 'Finances',
    icona: 'finances',
    ordre: 30,
    versioEsquema: 1,

    fulls: [
      {
        nom: 'Moviments',
        columnes: [
          { nom: 'id',              tipus: 'text' },
          { nom: 'data',            tipus: 'data' },
          { nom: 'tipus',           tipus: 'text', valors: ['d', 'i'] },
          { nom: 'import',          tipus: 'num'  },
          { nom: 'categoria',       tipus: 'text' },
          { nom: 'descripcio',      tipus: 'text' },
          { nom: 'metode',          tipus: 'text', valors: ['targeta', 'efectiu', 'online', 'transf', 'domic'] },
          { nom: 'origen',          tipus: 'text', valors: ['manual', 'banc', 'conversa', 'recurrent'] },
          { nom: 'id_banc',         tipus: 'text' },
          { nom: 'pendent',         tipus: 'text', valors: ['SI', 'NO'] },
          { nom: 'nota',            tipus: 'text' },
          { nom: 'revisat',         tipus: 'text', valors: ['SI', 'NO'] },
          { nom: 'esborrat_el',     tipus: 'iso'  },
          { nom: 'creat_el',        tipus: 'iso'  },
          { nom: 'actualitzat_el',  tipus: 'iso'  }
        ]
      },
      {
        nom: 'Categories',
        columnes: [
          { nom: 'id',              tipus: 'text' },
          { nom: 'nom',             tipus: 'text' },
          { nom: 'emoji',           tipus: 'text' },
          { nom: 'mena',            tipus: 'text', valors: ['d', 'i'] },
          { nom: 'color',           tipus: 'text' },
          // Fora dels comptes: un traspàs entre comptes teus no és ni despesa
          // ni ingrés. Va a la categoria i no al codi, perquè demà pots voler
          // treure'n una altra sense que ningú hagi de tocar res.
          { nom: 'exclou',          tipus: 'text', valors: ['SI', 'NO'] },
          { nom: 'ordre',           tipus: 'num'  },
          { nom: 'esborrat_el',     tipus: 'iso'  },
          { nom: 'creat_el',        tipus: 'iso'  },
          { nom: 'actualitzat_el',  tipus: 'iso'  }
        ]
      },
      {
        nom: 'Recurrents',
        columnes: [
          { nom: 'id',              tipus: 'text' },
          { nom: 'tipus',           tipus: 'text', valors: ['d', 'i'] },
          { nom: 'import',          tipus: 'num'  },
          { nom: 'categoria',       tipus: 'text' },
          { nom: 'descripcio',      tipus: 'text' },
          { nom: 'metode',          tipus: 'text' },
          { nom: 'dia',             tipus: 'num'  },
          { nom: 'actiu',           tipus: 'text', valors: ['SI', 'NO'] },
          { nom: 'ultim_mes',       tipus: 'text' },
          { nom: 'esborrat_el',     tipus: 'iso'  },
          { nom: 'creat_el',        tipus: 'iso'  },
          { nom: 'actualitzat_el',  tipus: 'iso'  }
        ]
      },
      {
        /* LA MEMÒRIA DE COMERÇOS.
           «SPAR RIPOLL» és Alimentació la primera vegada i totes les
           següents. Sense això, l'app pregunta un cop per moviment: amb les
           dades reals d'en Pol serien 316 preguntes per a 133 comerços,
           i el 58 % de les vegades ja sabíem la resposta. La conseqüència
           real no és que sigui pesat: és que deixes de revisar. */
        nom: 'FinancesMemoria',
        columnes: [
          { nom: 'id',              tipus: 'text' },
          { nom: 'clau',            tipus: 'text' },   // descripció normalitzada
          { nom: 'mostra',          tipus: 'text' },   // com s'escriu de debò
          { nom: 'categoria',       tipus: 'text' },
          { nom: 'metode',          tipus: 'text' },
          { nom: 'cops',            tipus: 'num'  },
          { nom: 'creat_el',        tipus: 'iso'  },
          { nom: 'actualitzat_el',  tipus: 'iso'  }
        ]
      },
      {
        nom: 'Pressupostos',
        columnes: [
          { nom: 'id',              tipus: 'text' },
          { nom: 'id_categoria',    tipus: 'text' },
          { nom: 'limit_mensual',   tipus: 'num'  },
          { nom: 'creat_el',        tipus: 'iso'  },
          { nom: 'actualitzat_el',  tipus: 'iso'  }
        ]
      },
      {
        nom: 'Patrimoni',
        columnes: [
          { nom: 'id',              tipus: 'text' },
          { nom: 'nom',             tipus: 'text' },
          { nom: 'tipus',           tipus: 'text' },
          { nom: 'automatic',       tipus: 'text', valors: ['SI', 'NO'] },
          { nom: 'esborrat_el',     tipus: 'iso'  },
          { nom: 'creat_el',        tipus: 'iso'  },
          { nom: 'actualitzat_el',  tipus: 'iso'  }
        ]
      },
      {
        nom: 'PatrimoniHistoric',
        columnes: [
          { nom: 'id',              tipus: 'text' },
          { nom: 'id_actiu',        tipus: 'text' },
          { nom: 'data',            tipus: 'data' },
          { nom: 'valor',           tipus: 'num'  },
          { nom: 'creat_el',        tipus: 'iso'  }
        ]
      }
    ],

    accions: {
      mes:            function (p) { return Finances.mes(p.mes); },
      mesos:          function (p) { return Finances.mesos(p.quants || 12); },
      estadistiques:  function (p) { return Finances.estadistiques(p.mes); },
      afegeix:        function (p) { return Finances.afegeix(p); },
      edita:          function (p) { return Finances.edita(p.id, p); },
      treu:           function (p) { return Finances.treu(p.id); },
      categories:     function ()  { return Finances.categories(); },
      suggeriments:   function (p) { return Finances.suggeriments(p.text); },
      reclassifica:   function ()  { return Finances.reclassifica(); },
      importa:        function (p) { return Finances.importa(p.dades, p.simulacio); }
    },

    resumInici: function () {
      var m = Finances.mes(Finances.mesActual());
      return {
        etiqueta: m.balanc >= 0 ? 'Balanç del mes' : 'Vas en negatiu',
        valor: Finances.eur(m.balanc),
        urgent: m.balanc < 0,
        accio: 'finances'
      };
    },

    contextIA: function () {
      var m = Finances.mes(Finances.mesActual());
      if (!m.moviments.length) return 'Finances: aquest mes encara no hi ha cap moviment apuntat.';

      var l = ['Finances del mes en curs (' + m.mes + '):'];
      l.push('- Ingressos: ' + Finances.eur(m.ingressos));
      l.push('- Despeses: ' + Finances.eur(m.despeses));
      l.push('- Balanç: ' + Finances.eur(m.balanc));
      l.push('- Moviments apuntats: ' + m.moviments.length);
      if (m.perCategoria.length) {
        var tres = m.perCategoria.slice(0, 3).map(function (c) {
          return c.nom + ' ' + Finances.eur(c.total);
        });
        l.push('- On va més: ' + tres.join(', '));
      }
      if (m.perRevisar) l.push('- Tens ' + m.perRevisar + ' moviments del banc per revisar.');
      return l.join('\n');
    },

    einesIA: [{
      nom: 'consulta_finances',
      descripcio: 'Despeses i ingressos de l\'usuari. Pot filtrar per mes, per categoria o per ' +
                  'text de la descripció. Sense filtres, retorna el resum del mes en curs.',
      esquema: {
        type: 'object',
        properties: {
          mes:       { type: 'string', description: 'Mes en format AAAA-MM. Si s\'omet, el mes en curs.' },
          desde:     { type: 'string', description: 'Data inicial AAAA-MM-DD' },
          fins:      { type: 'string', description: 'Data final AAAA-MM-DD' },
          categoria: { type: 'string', description: 'Nom de la categoria, tal com la veu l\'usuari' },
          text:      { type: 'string', description: 'Text a buscar dins la descripció del moviment' }
        }
      },
      executa: function (a) { return Finances.consultaIA(a); }
    }, {
      nom: 'apunta_moviment',
      descripcio: 'Apunta una despesa o un ingrés. NO s\'executa directament: genera una ' +
                  'proposta que en Pol ha de confirmar amb un botó.',
      escriu: true,
      esquema: {
        type: 'object',
        properties: {
          import_:     { type: 'number', description: 'Quantitat en euros, sempre positiva' },
          tipus:       { type: 'string', description: '"d" per a despesa, "i" per a ingrés. Per defecte despesa.' },
          descripcio:  { type: 'string', description: 'Què era' },
          categoria:   { type: 'string', description: 'Nom de la categoria. Si no s\'encerta, va a Altres.' },
          data:        { type: 'string', description: 'Data AAAA-MM-DD. Si s\'omet, avui.' },
          metode:      { type: 'string', description: 'targeta, efectiu, online, transf o domic' }
        },
        required: ['import_', 'descripcio']
      },
      etiqueta: function (a) {
        return 'Apuntar ' + (a.tipus === 'i' ? 'ingrés' : 'despesa') + ' de ' +
               Finances.eur(a.import_ || 0) + ' — «' + (a.descripcio || '?') + '»' +
               (a.data ? ' del ' + a.data : ' d\'avui');
      },
      executa: function (a) { return Finances.apuntaPerNom(a); }
    }],

    vista: 'vista_finances'
  };
}


var Finances = (function () {

  var METODES = ['targeta', 'efectiu', 'online', 'transf', 'domic'];

  /* Les categories del primer dia, per si s'instal·la de zero. Si migres des
     de l'app antiga, manen les teves i aquestes no s'arriben a crear. */
  var CATEGORIES_DEFECTE = [
    { id: 'c_alim',  nom: 'Alimentació',      emoji: '🛒', mena: 'd' },
    { id: 'c_rest',  nom: 'Restaurants',      emoji: '🍽️', mena: 'd' },
    { id: 'c_tran',  nom: 'Transport',        emoji: '🚗', mena: 'd' },
    { id: 'c_hab',   nom: 'Habitatge',        emoji: '🏠', mena: 'd' },
    { id: 'c_subm',  nom: 'Subministraments', emoji: '💡', mena: 'd' },
    { id: 'c_salut', nom: 'Salut',            emoji: '💊', mena: 'd' },
    { id: 'c_cura',  nom: 'Cura personal',    emoji: '💇', mena: 'd' },
    { id: 'c_roba',  nom: 'Roba',             emoji: '👕', mena: 'd' },
    { id: 'c_comp',  nom: 'Compres',          emoji: '📦', mena: 'd' },
    { id: 'c_oci',   nom: 'Oci',              emoji: '🎬', mena: 'd' },
    { id: 'c_subs',  nom: 'Subscripcions',    emoji: '📱', mena: 'd' },
    { id: 'c_educ',  nom: 'Educació',         emoji: '📚', mena: 'd' },
    { id: 'c_viat',  nom: 'Viatges',          emoji: '✈️', mena: 'd' },
    { id: 'c_asseg', nom: 'Assegurances',     emoji: '🛡️', mena: 'd' },
    { id: 'c_banc',  nom: 'Comissions',       emoji: '🏦', mena: 'd' },
    { id: 'c_regal', nom: 'Regals',           emoji: '🎁', mena: 'd' },
    { id: 'c_efec',  nom: 'Efectiu',          emoji: '💶', mena: 'd' },
    { id: 'c_bizum', nom: 'Bizum enviat',     emoji: '📲', mena: 'd' },
    { id: 'c_trasp', nom: 'Traspàs',          emoji: '🔁', mena: 'd', exclou: true },
    { id: 'c_altd',  nom: 'Altres',           emoji: '❓', mena: 'd' },
    { id: 'i_nom',   nom: 'Nòmina',           emoji: '💼', mena: 'i' },
    { id: 'i_dev',   nom: 'Devolucions',      emoji: '↩️', mena: 'i' },
    { id: 'i_bizum', nom: 'Bizum rebut',      emoji: '📲', mena: 'i' },
    { id: 'i_trasp', nom: 'Traspàs',          emoji: '🔁', mena: 'i', exclou: true },
    { id: 'i_alti',  nom: 'Altres',           emoji: '❓', mena: 'i' }
  ];

  // ---------------------------------------------------------------- intern

  function num_(v) {
    var n = parseFloat(String(v === undefined || v === null ? '' : v).replace(',', '.'));
    return isFinite(n) ? Math.abs(n) : 0;
  }

  function eur(n) {
    var v = Math.round((Number(n) || 0) * 100) / 100;
    var s = Math.abs(v).toFixed(2).replace('.', ',');
    return (v < 0 ? '−' : '') + s + ' €';
  }

  function mesActual() {
    return Utils.avui().slice(0, 7);
  }

  function mesDe_(data) {
    return String(data).slice(0, 7);
  }

  /** Els moviments vius. Res del que s'ha tret compta enlloc. */
  function moviments_(filtre) {
    return Dades.llegeix('Moviments', function (f) {
      if (f.esborrat_el) return false;
      return !filtre || filtre(f);
    });
  }

  function categories() {
    var f = Dades.llegeix('Categories', function (x) { return !x.esborrat_el; });
    f.sort(function (a, b) {
      var d = (Number(a.ordre) || 0) - (Number(b.ordre) || 0);
      return d !== 0 ? d : String(a.nom).localeCompare(String(b.nom), 'ca');
    });
    return f.map(function (x) {
      return { id: x.id, nom: x.nom, emoji: x.emoji, mena: x.mena, color: x.color,
               exclou: String(x.exclou).toUpperCase() === 'SI' };
    });
  }

  function indexCategories_() {
    var idx = {};
    categories().forEach(function (c) { idx[c.id] = c; });
    return idx;
  }

  /** Quines categories queden fora dels comptes. Ho diuen les dades, no el codi. */
  function exclosos_() {
    var fora = {};
    categories().forEach(function (c) { if (c.exclou) fora[c.id] = true; });
    return fora;
  }

  function categoriaPerNom_(nom, mena) {
    var clau = String(nom || '').trim().toLowerCase();
    if (!clau) return null;
    var totes = categories();
    for (var i = 0; i < totes.length; i++) {
      if (String(totes[i].nom).trim().toLowerCase() === clau &&
          (!mena || totes[i].mena === mena)) return totes[i];
    }
    return null;
  }

  // --------------------------------------------------------------- el mes

  /**
   * Tot el que necessita la pantalla del mes en una sola lectura.
   * Els traspassos queden fora d'ingressos i despeses a posta.
   */
  function mes(quin) {
    quin = quin || mesActual();
    var cats = indexCategories_();
    var fora = exclosos_();

    var files = moviments_(function (f) { return mesDe_(f.data) === quin; });
    files.sort(function (a, b) {
      var d = String(b.data).localeCompare(String(a.data));
      return d !== 0 ? d : String(b.creat_el).localeCompare(String(a.creat_el));
    });

    var ingressos = 0, despeses = 0, traspassos = 0, perRevisar = 0;
    var perCat = {};

    files.forEach(function (f) {
      var imp = num_(f['import']);
      if (String(f.revisat).toUpperCase() === 'NO') perRevisar++;

      if (fora[f.categoria]) { traspassos += imp; return; }

      if (f.tipus === 'i') { ingressos += imp; return; }

      despeses += imp;
      if (!perCat[f.categoria]) perCat[f.categoria] = 0;
      perCat[f.categoria] += imp;
    });

    var llistaCat = Object.keys(perCat).map(function (id) {
      var c = cats[id] || {};
      return { id: id, nom: c.nom || id, emoji: c.emoji || '', total: perCat[id],
               pct: despeses ? perCat[id] / despeses * 100 : 0 };
    }).sort(function (a, b) { return b.total - a.total; });

    return {
      mes: quin,
      ingressos: ingressos,
      despeses: despeses,
      traspassos: traspassos,
      balanc: ingressos - despeses,
      perRevisar: perRevisar,
      perCategoria: llistaCat,
      ritme: ritme_(quin, despeses),
      moviments: files.map(function (f) {
        var c = cats[f.categoria] || {};
        return {
          id: f.id, data: f.data, tipus: f.tipus, import: num_(f['import']),
          categoria: f.categoria, categoriaNom: c.nom || f.categoria, emoji: c.emoji || '',
          descripcio: f.descripcio, metode: f.metode, origen: f.origen,
          pendent: String(f.pendent).toUpperCase() === 'SI',
          revisat: String(f.revisat).toUpperCase() !== 'NO',
          nota: f.nota
        };
      })
    };
  }

  /**
   * A quin ritme gastes i on acabaràs el mes.
   * Només té sentit al mes en curs: en un mes tancat, la projecció és el total.
   */
  function ritme_(quin, despeses) {
    var avui = Utils.avui();
    if (quin !== avui.slice(0, 7)) return null;

    var diaAvui = Number(avui.slice(8, 10));
    var diesMes = new Date(Number(quin.slice(0, 4)), Number(quin.slice(5, 7)), 0).getDate();
    if (!diaAvui) return null;

    return {
      dia: diaAvui,
      diesMes: diesMes,
      perDia: despeses / diaAvui,
      projeccio: despeses / diaAvui * diesMes
    };
  }

  /** Els últims N mesos, per veure'n l'evolució. Una sola lectura. */
  function mesos(quants) {
    quants = Math.max(1, Math.min(36, Number(quants) || 12));
    var fins = mesActual();
    var claus = [];
    var y = Number(fins.slice(0, 4)), m = Number(fins.slice(5, 7));
    for (var i = 0; i < quants; i++) {
      claus.unshift(y + '-' + ('0' + m).slice(-2));
      m--; if (m === 0) { m = 12; y--; }
    }

    var dins = {};
    claus.forEach(function (c) { dins[c] = { mes: c, ingressos: 0, despeses: 0 }; });
    var fora = exclosos_();

    moviments_(function (f) { return !!dins[mesDe_(f.data)]; }).forEach(function (f) {
      if (fora[f.categoria]) return;
      var d = dins[mesDe_(f.data)];
      if (f.tipus === 'i') d.ingressos += num_(f['import']);
      else d.despeses += num_(f['import']);
    });

    var llista = claus.map(function (c) {
      var d = dins[c];
      d.balanc = d.ingressos - d.despeses;
      return d;
    });

    var acumulat = llista.reduce(function (s, d) { return s + d.balanc; }, 0);
    return { mesos: llista, acumulat: acumulat };
  }

  /** Comparativa amb el mes anterior i desglossament per mètode de pagament. */
  function estadistiques(quin) {
    quin = quin || mesActual();
    var y = Number(quin.slice(0, 4)), m = Number(quin.slice(5, 7)) - 1;
    if (m === 0) { m = 12; y--; }
    var anterior = y + '-' + ('0' + m).slice(-2);

    var ara = mes(quin);
    var abans = mes(anterior);

    var perMetode = {};
    var fora = exclosos_();
    ara.moviments.forEach(function (f) {
      if (f.tipus !== "d" || fora[f.categoria]) return;
      perMetode[f.metode || 'targeta'] = (perMetode[f.metode || 'targeta'] || 0) + f.import;
    });

    var abansPerCat = {};
    abans.perCategoria.forEach(function (c) { abansPerCat[c.id] = c.total; });

    return {
      mes: quin,
      anterior: anterior,
      despeses: ara.despeses,
      despesesAnterior: abans.despeses,
      diferencia: ara.despeses - abans.despeses,
      perCategoria: ara.perCategoria.map(function (c) {
        var previ = abansPerCat[c.id] || 0;
        return { id: c.id, nom: c.nom, emoji: c.emoji, total: c.total, pct: c.pct,
                 anterior: previ, diferencia: c.total - previ };
      }),
      perMetode: Object.keys(perMetode).map(function (k) {
        return { metode: k, total: perMetode[k] };
      }).sort(function (a, b) { return b.total - a.total; }),
      majors: ara.moviments.filter(function (f) { return f.tipus === 'd'; })
        .sort(function (a, b) { return b.import - a.import; }).slice(0, 5)
    };
  }

  // --------------------------------------------------------- memòria de comerços

  /**
   * La clau amb què es recorda un comerç.
   *
   * El banc retalla els noms a uns 17 caràcters i hi afegeix números de
   * targeta i referències que canvien a cada compra. Es normalitza a
   * majúscules sense accents, sense números llargs i sense espais dobles,
   * perquè «MERCADONA 4412» i «MERCADONA  4419» siguin el mateix comerç.
   */
  function clauComerc_(descripcio) {
    return String(descripcio || '')
      .toUpperCase()
      .replace(/[ÀÁÂÄ]/g, 'A').replace(/[ÈÉÊË]/g, 'E').replace(/[ÌÍÎÏ]/g, 'I')
      .replace(/[ÒÓÔÖ]/g, 'O').replace(/[ÙÚÛÜ]/g, 'U').replace(/Ç/g, 'C')
      .replace(/\d{3,}/g, ' ')          // referències i números de targeta
      .replace(/[^A-Z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function memoria_() {
    var m = {};
    try {
      Dades.llegeix('FinancesMemoria').forEach(function (f) {
        if (f.clau) m[String(f.clau)] = f;
      });
    } catch (err) { /* encara no existeix el full */ }
    return m;
  }

  /**
   * La clau porta el tipus al davant.
   *
   * El mateix comerç pot sortir com a despesa i com a ingrés —una compra i la
   * seva devolució—, i llavors no són la mateixa cosa: heretar la categoria
   * de la compra faria que un retorn es comptés com si haguessis tornat a
   * gastar. Passa a les dades reals d'en Pol amb «RUTA DEL FERRO».
   */
  function clauMemoria_(descripcio, tipus) {
    var c = clauComerc_(descripcio);
    return c ? (tipus === 'i' ? 'i' : 'd') + '|' + c : '';
  }

  /** Què sé d'aquest comerç? Null si és el primer cop que el veig. */
  function recordat(descripcio, tipus) {
    var clau = clauMemoria_(descripcio, tipus);
    if (!clau) return null;
    var f = null;
    try { f = Dades.un('FinancesMemoria', { clau: clau }); } catch (err) { return null; }
    if (!f) return null;
    return { categoria: f.categoria, metode: f.metode, cops: Number(f.cops) || 0 };
  }

  /**
   * Apren-ho. Es crida quan en Pol apunta o corregeix un moviment: el que
   * decideix ell mana sempre sobre el que endevini cap regla.
   */
  function recorda(descripcio, categoria, metode, tipus) {
    var clau = clauMemoria_(descripcio, tipus);
    if (!clau || !categoria) return null;

    var existent = null;
    try { existent = Dades.un('FinancesMemoria', { clau: clau }); } catch (err) { return null; }

    return Dades.desa('FinancesMemoria', {
      clau: clau,
      mostra: String(descripcio || '').trim(),
      categoria: categoria,
      metode: metode || (existent ? existent.metode : ''),
      cops: (existent ? Number(existent.cops) || 0 : 0) + 1
    }, ['clau'], 'mem');
  }

  // ------------------------------------------------------------- escriptura

  function afegeix(p) {
    var imp = num_(p['import'] !== undefined ? p['import'] : p.import_);
    if (imp <= 0) throw new Error('L\'import ha de ser més gran que zero.');

    var desc = String(p.descripcio || '').trim();
    if (!desc) throw new Error('Falta dir què era.');

    var tipus = p.tipus === 'i' ? 'i' : 'd';
    var metode = METODES.indexOf(p.metode) !== -1 ? p.metode : 'targeta';
    var categoria = p.categoria || '';
    var revisat = p.origen === 'banc' ? 'NO' : 'SI';

    /* SI JA SÉ QUÈ ÉS AQUEST COMERÇ, NO HO PREGUNTO.
       Un moviment del banc que arriba sense categoria clara, o amb una que
       les regles no han sabut endevinar, agafa la que li vas donar tu l'últim
       cop i entra ja revisat. Preguntar cada mes pel mateix supermercat és el
       camí més curt cap a deixar de revisar res. */
    if (p.origen === 'banc') {
      var sabut = recordat(desc, tipus);
      if (sabut && sabut.categoria) {
        var incert = !categoria || categoria === 'c_altd' || categoria === 'i_alti';
        if (incert || sabut.cops >= 2) {
          categoria = sabut.categoria;
          if (sabut.metode) metode = sabut.metode;
          revisat = 'SI';
        }
      }
    }

    if (!categoria) categoria = tipus === 'i' ? 'i_alti' : 'c_altd';

    var fila = Dades.insereix('Moviments', {
      data: p.data || Utils.avui(),
      tipus: tipus,
      'import': imp,
      categoria: categoria,
      descripcio: desc,
      metode: metode,
      origen: p.origen || 'manual',
      id_banc: p.id_banc || '',
      pendent: p.pendent ? 'SI' : 'NO',
      nota: p.nota || '',
      // El que apuntes tu ja està revisat per definició: l'has escrit tu.
      revisat: revisat
    }, 'mov');

    // El que decideixes tu s'apren. El que endevina el banc, no: si no,
    // un error de les regles es tornaria permanent tot sol.
    if (p.origen !== 'banc' && categoria !== 'c_altd' && categoria !== 'i_alti') {
      recorda(desc, categoria, metode, tipus);
    }
    return fila;
  }

  function edita(id, p) {
    if (!id) throw new Error('Falta l\'identificador.');
    var canvis = {};
    if (p['import'] !== undefined) canvis['import'] = num_(p['import']);
    ['data', 'tipus', 'categoria', 'descripcio', 'metode', 'nota'].forEach(function (k) {
      if (p[k] !== undefined) canvis[k] = p[k];
    });
    if (p.revisat !== undefined) canvis.revisat = p.revisat ? 'SI' : 'NO';

    var r = Dades.actualitza('Moviments', id, canvis);
    if (!r) throw new Error('Aquest moviment no existeix.');

    /* Corregir una categoria és la manera més clara de dir «això va aquí».
       S'apren, i el mateix comerç ja no tornarà a preguntar mai més. */
    if (canvis.categoria && canvis.categoria !== 'c_altd' && canvis.categoria !== 'i_alti') {
      recorda(r.descripcio, canvis.categoria, r.metode, r.tipus);
    }
    return r;
  }

  /**
   * Aplica el que ja saps als moviments que van quedar a «Altres».
   * No toca res del que tu hagis posat a mà: només els que segueixen sense
   * classificar. Es pot executar tantes vegades com vulguis.
   */
  function reclassifica() {
    var mem = memoria_();
    var canviats = 0, sensesaber = {};

    moviments_(function (f) {
      return f.categoria === 'c_altd' || f.categoria === 'i_alti';
    }).forEach(function (f) {
      var clau = clauMemoria_(f.descripcio, f.tipus);
      var m = mem[clau];
      if (m && m.categoria) {
        Dades.actualitza('Moviments', f.id, { categoria: m.categoria, revisat: 'SI' });
        canviats++;
      } else if (clau) {
        sensesaber[clau] = (sensesaber[clau] || 0) + 1;
      }
    });

    var pendents = Object.keys(sensesaber).map(function (k) {
      return { comerc: k, moviments: sensesaber[k] };
    }).sort(function (a, b) { return b.moviments - a.moviments; });

    return { canviats: canviats, comerçosPerDecidir: pendents.length, pendents: pendents.slice(0, 40) };
  }

  /** No esborra la fila: la marca. L'històric és intocable. */
  function treu(id) {
    if (!id) throw new Error('Falta l\'identificador.');
    var r = Dades.actualitza('Moviments', id, { esborrat_el: Utils.ara() });
    if (!r) throw new Error('Aquest moviment no existeix.');
    return { tret: true };
  }

  /**
   * El que ja has apuntat abans, per omplir-ho d'un toc.
   * Apuntar una despesa ha de ser instantani: si has de teclejar «Mercadona»
   * i triar categoria cada dimarts, deixes de fer-ho al cap de dues setmanes.
   */
  function suggeriments(text) {
    var q = String(text || '').trim().toLowerCase();
    var vistos = {};

    moviments_(function (f) {
      if (!q) return true;
      return String(f.descripcio).toLowerCase().indexOf(q) !== -1;
    }).forEach(function (f) {
      var clau = String(f.descripcio).trim().toLowerCase();
      if (!clau) return;
      if (!vistos[clau]) {
        vistos[clau] = { descripcio: f.descripcio, categoria: f.categoria,
                         metode: f.metode, tipus: f.tipus, cops: 0, ultim: '' };
      }
      vistos[clau].cops++;
      if (String(f.data) > vistos[clau].ultim) {
        vistos[clau].ultim = String(f.data);
        vistos[clau].categoria = f.categoria;
        vistos[clau].metode = f.metode;
      }
    });

    return Object.keys(vistos).map(function (k) { return vistos[k]; })
      .sort(function (a, b) {
        // Primer el que fas més sovint; a igualtat, el més recent.
        return b.cops - a.cops || String(b.ultim).localeCompare(String(a.ultim));
      })
      .slice(0, 12);
  }

  // -------------------------------------------------------------------- IA

  function consultaIA(a) {
    a = a || {};
    var cats = indexCategories_();

    var idCat = null;
    if (a.categoria) {
      var c = categoriaPerNom_(a.categoria);
      if (!c) return { error: 'No tinc cap categoria que es digui «' + a.categoria + '».',
                       categories: categories().map(function (x) { return x.nom; }) };
      idCat = c.id;
    }

    var desde = a.desde || (a.mes ? a.mes + '-01' : null);
    var fins  = a.fins  || (a.mes ? a.mes + '-31' : null);
    if (!desde && !fins && !idCat && !a.text) return resumIA_(mes(mesActual()));

    var text = String(a.text || '').toLowerCase();
    var files = moviments_(function (f) {
      if (desde && String(f.data) < desde) return false;
      if (fins && String(f.data) > fins) return false;
      if (idCat && f.categoria !== idCat) return false;
      if (text && String(f.descripcio).toLowerCase().indexOf(text) === -1) return false;
      return true;
    });

    var ingressos = 0, despeses = 0;
    var fora = exclosos_();
    files.forEach(function (f) {
      if (fora[f.categoria]) return;
      if (f.tipus === 'i') ingressos += num_(f['import']); else despeses += num_(f['import']);
    });

    return {
      trobats: files.length,
      desde: desde, fins: fins,
      categoria: idCat ? (cats[idCat] || {}).nom : null,
      ingressos: Math.round(ingressos * 100) / 100,
      despeses: Math.round(despeses * 100) / 100,
      balanc: Math.round((ingressos - despeses) * 100) / 100,
      // Un tall: amb dos-cents moviments, enviar-los tots només gasta context.
      exemples: files.slice(0, 15).map(function (f) {
        return f.data + ' · ' + f.descripcio + ' · ' + eur(num_(f['import'])) +
               ' · ' + ((cats[f.categoria] || {}).nom || f.categoria);
      })
    };
  }

  function resumIA_(m) {
    return {
      mes: m.mes,
      ingressos: Math.round(m.ingressos * 100) / 100,
      despeses: Math.round(m.despeses * 100) / 100,
      balanc: Math.round(m.balanc * 100) / 100,
      moviments: m.moviments.length,
      perRevisar: m.perRevisar,
      perCategoria: m.perCategoria.slice(0, 8).map(function (c) {
        return { categoria: c.nom, total: Math.round(c.total * 100) / 100 };
      })
    };
  }

  /** Ve d'una proposta confirmada. */
  function apuntaPerNom(a) {
    var tipus = a.tipus === 'i' ? 'i' : 'd';
    var cat = a.categoria ? categoriaPerNom_(a.categoria, tipus) : null;

    var r = afegeix({
      'import': a.import_ !== undefined ? a.import_ : a['import'],
      tipus: tipus,
      descripcio: a.descripcio,
      categoria: cat ? cat.id : (tipus === 'i' ? 'i_alti' : 'c_altd'),
      data: a.data || Utils.avui(),
      metode: a.metode,
      origen: 'conversa'
    });

    return {
      apuntat: true,
      import: num_(r['import']),
      descripcio: r.descripcio,
      categoria: cat ? cat.nom : 'Altres',
      // Si no s'ha encertat la categoria s'ha de dir, no amagar-ho: així saps
      // que has d'anar a canviar-la en comptes de descobrir-ho a final de mes.
      avis: cat ? null : 'No he sabut quina categoria era i l\'he deixat a Altres.',
      data: r.data
    };
  }

  // ------------------------------------------------------------- categories

  /** Crea les categories del primer dia si el full és buit. */
  function sembraCategories() {
    if (Dades.compta('Categories') > 0) return { creades: 0 };
    var files = CATEGORIES_DEFECTE.map(function (c, i) {
      return { id: c.id, nom: c.nom, emoji: c.emoji, mena: c.mena, color: '', ordre: i + 1 };
    });
    Dades.insereixMoltes('Categories', files, 'cat');
    return { creades: files.length };
  }

  return {
    eur: eur,
    mesActual: mesActual,
    mes: mes,
    mesos: mesos,
    estadistiques: estadistiques,
    afegeix: afegeix,
    edita: edita,
    treu: treu,
    recordat: recordat,
    recorda: recorda,
    clauComerc: clauComerc_,
    clauMemoria: clauMemoria_,
    reclassifica: reclassifica,
    categories: categories,
    suggeriments: suggeriments,
    consultaIA: consultaIA,
    apuntaPerNom: apuntaPerNom,
    sembraCategories: sembraCategories,
    importa: function (dades, simulacio) { return FinancesImport.importa(dades, simulacio); }
  };
})();
