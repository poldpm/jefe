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
    versioEsquema: 2,     // 2: `iban` a Patrimoni, per no duplicar comptes

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
          /* El final del número de compte, dels que porta el banc. És l'única
             cosa d'un compte que no canvia quan refàs la connexió. */
          { nom: 'iban',            tipus: 'text' },
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
      /* TOT EL QUE NECESSITA UNA PANTALLA, EN UNA SOLA CRIDA.
         Cada petició a Apps Script costa 1,2 s abans de fer res, i mig segon
         més per obrir el full. Tres crides per obrir finances volien dir
         obrir el full tres vegades i esperar la més lenta de les tres. */
      /* DESADA SENCERA.
         Muntar-la vol dir llegir el full de moviments sencer, i aquell full
         només creix: eren quatre o cinc segons cada cop que obries finances.
         Qualsevol escriptura —un moviment, una categoria, un pressupost— la
         tomba tota sola, perquè la invalidació penja de `Dades`.

         Abans en quedava una cosa fora: el «Banc mirat fa…», que canviava
         sol i desar-lo hauria volgut dir dir-te «fa 2 minuts» durant mitja
         hora. Ara que aquella línia no hi és, no queda res que canviï sense
         que algú escrigui, i la pantalla es desa tota. */
      pantalla:       function (p) {
        p = p || {};
        return Memoria.recorda('finances',
          'pantalla:' + (p.periode || 'mes') + ':' + (p.mes || '') + ':' + (p.quants || ''),
          function () { return Finances.pantalla(p); });
      },
      pressupost:     function (p) { return Finances.desaPressupost(p.categoria, p.limit); },
      recurrents:     function ()  { return Finances.recurrents(); },
      patrimoni:      function ()  { return Finances.patrimoni(); },
      desaActiu:      function (p) { return Finances.desaActiu(p); },
      arxivaActiu:    function (p) { return Finances.arxivaActiu(p.id); },
      anotaValor:     function (p) { return Finances.anotaValor(p.id, p.valor, p.data); },
      desaRecurrent:  function (p) { return Finances.desaRecurrent(p); },
      arxivaRecurrent:function (p) { return Finances.arxivaRecurrent(p.id); },
      categories:     function ()  { return Finances.categories(); },
      creaCategoria:  function (p) { return Finances.creaCategoria(p); },
      editaCategoria: function (p) { return Finances.editaCategoria(p.id, p); },
      arxivaCategoria:function (p) { return Finances.arxivaCategoria(p.id); },
      suggeriments:   function (p) { return Finances.suggeriments(p.text); },
      reclassifica:   function ()  { return Finances.reclassifica(); },
      perRevisar:     function ()  { return Finances.perRevisar(); },
      decideix:       function (p) { return Finances.decideixComerc(p.clau, p.categoria); },
      decideixUn:     function (p) { return Finances.decideixMoviment(p.id, p.categoria); },
      importa:        function (p) { return Finances.importa(p.dades, p.simulacio); },
      estatBanc:      function ()  { return FinancesBanc.estat(); },
      /* Mirar el banc a mà. NO es crida sola en obrir cap pantalla: les
         mirades del dia són comptades i les gasten els tres automatismes. */
      sincronitzaBanc: function () { return FinancesBanc.sincronitza(); }
    },

    /* La tornada del banc després que en Pol s'hi hagi identificat. El nucli
       no sap res d'Enable Banking: només pregunta si algú reclama aquesta
       visita. Així una integració amb autorització externa no obliga a tocar
       cap fitxer del nucli. */
    reclamaTornada: function (p) {
      return !!(p && (p.code || p.error) && FinancesBanc.estat().authId);
    },

    gestionaTornada: function (p) {
      if (p.error) {
        var cancellat = p.error === 'access_denied';
        return HtmlService.createHtmlOutput(pagina_(
          cancellat ? 'El permís no s\'ha donat' : 'El banc ha retornat un error',
          esc_(p.error_description || p.error) +
          (cancellat ? '<p>Sovint és perquè falta confirmar-ho a l\'app del banc, o perquè ' +
                       's\'ha exhaurit el temps. Torna a executar <code>connectaBanc()</code>.</p>' : '')
        ));
      }
      var r = FinancesBanc.creaSessio(p.code);
      return HtmlService.createHtmlOutput(pagina_(
        'Banc connectat',
        '<p>' + r.comptes + ' compte(s). Ja pots tancar aquesta pestanya i tornar a JEFE.</p>'));
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

    resumPeriode: function (desde, fins) { return Finances.resumPeriode(desde, fins); },

    elDia: function (data) { return Finances.elDia(data); },

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
          text:      { type: 'string', description: 'Text a buscar dins la descripció del moviment' },
          ensenya:   { type: 'boolean',
                       description: 'true si t\'ha demanat VEURE o ENSENYAR les finances ' +
                                    '(«ensenya\'m les meves finances», «on se me\'n va?»). ' +
                                    'S\'obre un plafó amb la despesa per categories i tu no ' +
                                    'has de recitar-la: digues-li com a molt una frase.' }
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
    }, {
      nom: 'classifica_moviment',
      descripcio: 'Canvia la categoria d\'un moviment que ja hi és, o de TOTS els d\'un mateix ' +
                  'comerç alhora. Serveix per buidar la safata del que ha entrat del banc. ' +
                  'NO s\'executa directament: genera una proposta a confirmar.',
      escriu: true,
      esquema: {
        type: 'object',
        properties: {
          descripcio: { type: 'string', description: 'Part de la descripció del moviment o del comerç' },
          categoria:  { type: 'string', description: 'Nom de la categoria on ha d\'anar' },
          tots:       { type: 'boolean', description: 'true per aplicar-ho a tots els d\'aquell comerç i recordar-ho' }
        },
        required: ['descripcio', 'categoria']
      },
      etiqueta: function (a) {
        return (a.tots ? 'Posar TOTS els de «' : 'Posar «') + (a.descripcio || '?') +
               '» a ' + (a.categoria || '?');
      },
      executa: function (a) { return Finances.classificaPerNom(a); }
    }, {
      nom: 'posa_pressupost',
      descripcio: 'Posa o treu el límit mensual de despesa d\'una categoria. ' +
                  'NO s\'executa directament: genera una proposta a confirmar.',
      escriu: true,
      esquema: {
        type: 'object',
        properties: {
          categoria: { type: 'string', description: 'Nom de la categoria' },
          limit:     { type: 'number', description: 'Límit en euros. Zero el treu.' }
        },
        required: ['categoria', 'limit']
      },
      etiqueta: function (a) {
        return Number(a.limit) > 0
          ? 'Límit de ' + Finances.eur(a.limit) + ' al mes per a ' + (a.categoria || '?')
          : 'Treure el límit de ' + (a.categoria || '?');
      },
      executa: function (a) { return Finances.pressupostPerNom(a); }
    }, {
      nom: 'anota_patrimoni',
      descripcio: 'Anota quant val avui un actiu del patrimoni (Trade Republic, borsa, criptos…). ' +
                  'NO s\'executa directament: genera una proposta a confirmar.',
      escriu: true,
      esquema: {
        type: 'object',
        properties: {
          actiu: { type: 'string', description: 'Nom de l\'actiu' },
          valor: { type: 'number', description: 'Quant val ara, en euros' }
        },
        required: ['actiu', 'valor']
      },
      etiqueta: function (a) {
        return 'Anotar ' + Finances.eur(a.valor || 0) + ' a «' + (a.actiu || '?') + '»';
      },
      executa: function (a) { return Finances.patrimoniPerNom(a); }
    }, {
      nom: 'treu_moviment',
      descripcio: 'Treu un moviment dels comptes. NO s\'executa directament: genera una ' +
                  'proposta a confirmar.',
      escriu: true,
      esquema: {
        type: 'object',
        properties: {
          descripcio: { type: 'string', description: 'Part de la descripció del moviment' },
          data:       { type: 'string', description: 'Data AAAA-MM-DD, per si n\'hi ha més d\'un' }
        },
        required: ['descripcio']
      },
      etiqueta: function (a) {
        return 'TREURE el moviment «' + (a.descripcio || '?') + '»' +
               (a.data ? ' del ' + a.data : '');
      },
      executa: function (a) { return Finances.treuPerNom(a); }
    }],

    vista: 'vista_finances'
  };
}


/** Pàgina mínima per a les tornades del banc. Es veu tres segons a la vida. */
function pagina_(titol, cos) {
  return '<div style="font:16px/1.6 system-ui,sans-serif;padding:40px;max-width:34em;margin:0 auto">' +
         '<h2 style="margin:0 0 .5em">' + titol + '</h2>' + cos + '</div>';
}

function esc_(t) {
  return String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

  /**
   * Què ha passat entre dues dates. Per a la revisió setmanal.
   *
   * Els traspassos queden fora, igual que a la pantalla del mes: moure diners
   * d'un compte teu a un altre no és ni gastar ni ingressar, i comptar-ho
   * inflaria la setmana amb una xifra que no vol dir res.
   */
  function resumPeriode(desde, fins) {
    var fora = exclosos_();
    var idx = indexCategories_();

    var files = moviments_(function (f) {
      var d = String(f.data);
      return d >= desde && d <= fins;
    });
    if (!files.length) return null;

    var despeses = 0, ingressos = 0, perCat = {}, gran = null, perRevisar = 0;

    files.forEach(function (f) {
      if (String(f.revisat).toUpperCase() !== 'SI') perRevisar++;
      if (fora[f.categoria]) return;
      var imp = Math.abs(num_(f['import']));
      if (f.tipus === 'i') { ingressos += imp; return; }
      despeses += imp;
      perCat[f.categoria] = (perCat[f.categoria] || 0) + imp;
      if (!gran || imp > Math.abs(num_(gran['import']))) gran = f;
    });

    var linies = [];
    linies.push('Gastat ' + eur(despeses) + ' en ' + files.length +
                (files.length === 1 ? ' moviment' : ' moviments'));
    if (ingressos) linies.push('Ingressat ' + eur(ingressos));

    var caps = Object.keys(perCat).sort(function (a, b) { return perCat[b] - perCat[a]; });
    if (caps.length) {
      linies.push('On més: ' + caps.slice(0, 3).map(function (c) {
        return (idx[c] ? idx[c].nom : 'sense categoria') + ' ' + eur(perCat[c]);
      }).join(', '));
    }
    if (gran) {
      linies.push('El més gros: ' + gran.descripcio + ' ' + eur(Math.abs(num_(gran['import']))));
    }
    if (perRevisar) {
      linies.push(perRevisar + (perRevisar === 1 ? ' moviment per classificar' : ' moviments per classificar'));
    }

    return { titol: 'Finances', linies: linies };
  }

  /**
   * QUÈ HA ENTRAT I QUÈ HA SORTIT AVUI, per a la pàgina del dia.
   *
   * Un dia no és un mes petit. Aquí no hi van percentatges ni mitjanes: van
   * els moviments, un per un, perquè la pregunta que es fa mirant el dia és
   * «què he gastat» i la resposta és una llista curta que es llegeix d'un cop.
   *
   * Els traspassos entre comptes teus queden fora, com a tot arreu: canviar
   * diners de butxaca no és ni gastar ni guanyar.
   *
   * El que ve del banc pot arribar amb hores de retard —és el banc qui mana,
   * no nosaltres—, i per això es diu de quan és l'última mirada. Val més un
   * número amb la seva hora que un número que sembla d'ara i no ho és.
   */
  function elDia(data) {
    data = Utils.esDataValida(data) ? data : Utils.avui();

    var fora = exclosos_();
    var cats = indexCategories_();
    var files = moviments_(function (f) { return String(f.data) === data; });

    var despeses = 0, ingressos = 0;
    var compten = [];
    files.forEach(function (f) {
      if (fora[f.categoria]) return;                 // traspassos i similars
      var imp = Math.abs(num_(f['import']));
      if (f.tipus === 'i') ingressos += imp; else despeses += imp;
      compten.push(f);
    });

    /* AQUI hi havia una fila «Banc mirat fa 3 minuts» al final del bloc.
       S'ha tret: amb tres sincronitzacions al dia sempre deia el mateix, i
       en un bloc de sis moviments com a maxim, una fila que no es un
       moviment es una fila menys de les que hi has vingut a veure. */

    if (!compten.length) {
      return {
        titol: 'Finances', accio: 'finances',
        coses: [{ text: 'Res apuntat avui', menut: 'ni despeses ni ingressos' }]
      };
    }

    /* Els grossos a dalt: si només en mires tres, que siguin els que mouen
       l'agulla. Ordenats per import i no per hora, que d'hora no en tenim. */
    compten.sort(function (a, b) {
      return Math.abs(num_(b['import'])) - Math.abs(num_(a['import']));
    });

    var coses = [{
      text: (despeses ? 'Gastat ' + eur(despeses) : 'Res gastat') +
            (ingressos ? ' · guanyat ' + eur(ingressos) : ''),
      menut: compten.length + (compten.length === 1 ? ' moviment' : ' moviments'),
      urgent: false
    }];

    compten.slice(0, 6).forEach(function (f) {
      var imp = Math.abs(num_(f['import']));
      coses.push({
        text: f.descripcio || '(sense descripció)',
        menut: (f.tipus === 'i' ? '+' : '−') + eur(imp) +
               ' · ' + (cats[f.categoria] ? cats[f.categoria].nom : 'sense classificar') +
               (String(f.revisat).toUpperCase() === 'SI' ? '' : ' · per classificar')
      });
    });
    if (compten.length > 6) {
      coses.push({ text: 'i ' + (compten.length - 6) + ' més', menut: '' });
    }

    return { titol: 'Finances', accio: 'finances', coses: coses };
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

    /* El que queda per classificar és de TOTS els mesos, no d'aquest.
       La safata és global, i lligar-ne l'entrada al mes que miraves volia dir
       que amb els pendents al maig i tu a l'agost, el botó no apareixia mai.
       I el comptador d'abans només mirava els «sense revisar»: els 91
       moviments a «Altres» venien de l'app antiga marcats com a revisats, o
       sigui que no en comptava ni un. El botó no ha sortit mai. */
    var perClassificar = moviments_(function (f) {
      return f.categoria === 'c_altd' || f.categoria === 'i_alti' ||
             String(f.revisat).toUpperCase() === 'NO';
    }).length;

    return {
      mes: quin,
      ingressos: ingressos,
      despeses: despeses,
      traspassos: traspassos,
      balanc: ingressos - despeses,
      perRevisar: perRevisar,
      perClassificar: perClassificar,
      pressupostos: pressupostos().map(function (b) {
        var gastat = perCat[b.categoria] || 0;
        var c = cats[b.categoria] || {};
        return { categoria: b.categoria, nom: c.nom || b.categoria, emoji: c.emoji || '',
                 limit: b.limit, gastat: gastat, pct: b.limit ? gastat / b.limit * 100 : 0 };
      }).sort(function (a, b) { return b.pct - a.pct; }),
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

  /* ETIQUETES QUE NO IDENTIFIQUEN NINGÚ.
     Quan el banc no envia el nom del comerç, hi posa una fórmula genèrica.
     A les dades d'en Pol, «COMPRA AMB TARGETA» surt 11 vegades i són onze
     compres diferents que no tenen res a veure. Aprendre'n una categoria
     arxivaria totes les futures a la mateixa carpeta sense dir res a ningú:
     no seria ignorar-ho, seria equivocar-se en silenci, que és pitjor.
     Aquestes no s'aprenen mai i sempre passen per revisió. */
  var GENERIQUES = [
    /^COMPRA (AMB|CON) ?(TARGETA|TARJETA)/,
    /^(PAGO|PAGAMENT) (CON|AMB) ?(TARJETA|TARGETA)/,
    /^COMPRA (TARJ|TARG)/,
    /^(TRANSFERENCIA|TRANSFERENCIA|TRANSFERÈNCIA|TRASPAS|TRASPÀS)$/,
    /^(BIZUM|REBUT|RECIBO|ABONO|CARREC|CARGO|MOVIMENT|MOVIMIENTO)$/,
    /^(COMPRA|PAGAMENT|PAGO|TARGETA|TARJETA)$/,
    /^\d+$/                                    // el que queda quan tot era un número
  ];

  function esGenerica_(clau) {
    var c = String(clau || '').replace(/^[di]\|/, '');
    if (c.length < 3) return true;
    for (var i = 0; i < GENERIQUES.length; i++) if (GENERIQUES[i].test(c)) return true;
    return false;
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
    if (!clau || esGenerica_(clau)) return null;
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
    if (!clau || !categoria || esGenerica_(clau)) return null;

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
        /* Si la memòria sap què és aquest comerç, s'acabà la discussió. El
           que va decidir en Pol mana sobre el que endevini qualsevol regla,
           i per tant no hi ha res a revisar.

           Abans hi havia una condició que només se'n refiava si el comerç hi
           constava vist dues vegades o més. Semblava prudent i era un error:
           tres compres d'Amazon van anar a la safata amb la categoria JA
           correcta, decidida per ell mateix. Demanar que confirmi una cosa
           que ell mateix va decidir no és prudència, és la molèstia que
           volíem treure. */
        categoria = sabut.categoria;
        if (sabut.metode) metode = sabut.metode;
        revisat = 'SI';
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
    var reclassificats = 0, confirmats = 0, sensesaber = {}, generiques = {};

    /* Dos casos, i tots dos són «ja ho sabíem»:
         · el moviment va quedar a Altres i la memòria sap què és
         · el moviment ja té la categoria bona però encara consta per revisar
       El segon existeix perquè una versió d'abans no es refiava de la memòria
       si el comerç només hi constava un cop, i va deixar moviments correctes
       esperant una confirmació que no calia. */
    moviments_(function (f) {
      var altres = f.categoria === 'c_altd' || f.categoria === 'i_alti';
      return altres || String(f.revisat).toUpperCase() === 'NO';
    }).forEach(function (f) {
      var clau = clauMemoria_(f.descripcio, f.tipus);
      var m = mem[clau];
      var altres = f.categoria === 'c_altd' || f.categoria === 'i_alti';

      if (m && m.categoria) {
        if (altres || m.categoria !== f.categoria) {
          Dades.actualitza('Moviments', f.id, { categoria: m.categoria, revisat: 'SI' });
          reclassificats++;
        } else {
          Dades.actualitza('Moviments', f.id, { revisat: 'SI' });
          confirmats++;
        }
      } else if (clau && altres) {
        if (esGenerica_(clau)) generiques[clau] = (generiques[clau] || 0) + 1;
        else sensesaber[clau] = (sensesaber[clau] || 0) + 1;
      }
    });

    var pendents = Object.keys(sensesaber).map(function (k) {
      return { comerc: k, moviments: sensesaber[k] };
    }).sort(function (a, b) { return b.moviments - a.moviments; });

    var gen = Object.keys(generiques).map(function (k) {
      return { comerc: k, moviments: generiques[k] };
    }).sort(function (a, b) { return b.moviments - a.moviments; });

    return { reclassificats: reclassificats, confirmats: confirmats,
             comercosPerDecidir: pendents.length, pendents: pendents.slice(0, 40),
             generiques: gen };
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

  // ----------------------------------------------------------- pressupostos

  /**
   * Un límit mensual per categoria.
   *
   * Límit 0 vol dir «sense pressupost»: la fila es queda però deixa de
   * comptar. Aquí no s'esborra res, com a tota la resta.
   */
  function pressupostos() {
    var out = [];
    try {
      Dades.llegeix('Pressupostos').forEach(function (f) {
        var l = num_(f.limit_mensual);
        if (l > 0) out.push({ id: f.id, categoria: f.id_categoria, limit: l });
      });
    } catch (err) { /* encara no hi ha el full */ }
    return out;
  }

  function desaPressupost(idCategoria, limit) {
    if (!idCategoria) throw new Error('Falta la categoria.');
    return Dades.desa('Pressupostos', {
      id: 'pres_' + idCategoria,
      id_categoria: idCategoria,
      limit_mensual: num_(limit)
    }, ['id_categoria'], 'pres');
  }

  // ------------------------------------------------------------- recurrents

  function recurrents() {
    var cats = indexCategories_();
    var f = [];
    try {
      f = Dades.llegeix('Recurrents', function (x) { return !x.esborrat_el; });
    } catch (err) { return []; }

    f.sort(function (a, b) { return (Number(a.dia) || 0) - (Number(b.dia) || 0); });
    return f.map(function (x) {
      var c = cats[x.categoria] || {};
      return {
        id: x.id, tipus: x.tipus, import: num_(x['import']),
        categoria: x.categoria, categoriaNom: c.nom || x.categoria, emoji: c.emoji || '',
        descripcio: x.descripcio, metode: x.metode, dia: Number(x.dia) || 1,
        actiu: String(x.actiu).toUpperCase() !== 'NO',
        ultimMes: x.ultim_mes
      };
    });
  }

  function desaRecurrent(p) {
    var desc = String(p.descripcio || '').trim();
    if (!desc) throw new Error('Falta dir què és.');
    var imp = num_(p['import']);
    if (imp <= 0) throw new Error('L\'import ha de ser més gran que zero.');

    /* El dia va acotat a 28 a posta: així cau tots els mesos, també el
       febrer. Un rebut del 31 no existiria mig any. */
    var dia = Math.min(28, Math.max(1, Math.round(num_(p.dia)) || 1));
    var tipus = p.tipus === 'i' ? 'i' : 'd';

    var fila = {
      tipus: tipus,
      'import': imp,
      categoria: p.categoria || (tipus === 'i' ? 'i_alti' : 'c_altd'),
      descripcio: desc,
      metode: METODES.indexOf(p.metode) !== -1 ? p.metode : 'domic',
      dia: dia,
      actiu: p.actiu === false ? 'NO' : 'SI'
    };

    if (p.id) {
      var r = Dades.actualitza('Recurrents', p.id, fila);
      if (!r) throw new Error('Aquest recurrent no existeix.');
      return r;
    }
    return Dades.insereix('Recurrents', fila, 'rec');
  }

  function arxivaRecurrent(id) {
    if (!id) throw new Error('Falta l\'identificador.');
    var r = Dades.actualitza('Recurrents', id, { esborrat_el: Utils.ara() });
    if (!r) throw new Error('Aquest recurrent no existeix.');
    return { tret: true };
  }

  /**
   * Crea els moviments dels recurrents que ja toquen aquest mes.
   *
   * `ultim_mes` és el que impedeix que se'n creï un de doble: es marca en
   * crear-lo i no es torna a mirar fins al mes que ve. Per això es pot
   * executar cada nit sense por, i per això NO es fa en llegir una pantalla:
   * obrir finances no ha d'escriure't res al full.
   */
  function generaRecurrents(avui) {
    avui = avui || Utils.avui();
    var mesAra = avui.slice(0, 7);
    var diaAvui = Number(avui.slice(8, 10));
    var fets = [];

    recurrents().forEach(function (r) {
      if (!r.actiu) return;
      if (String(r.ultimMes) === mesAra) return;      // ja creat aquest mes
      if (r.dia > diaAvui) return;                    // encara no toca

      afegeix({
        data: mesAra + '-' + ('0' + r.dia).slice(-2),
        tipus: r.tipus,
        'import': r.import,
        categoria: r.categoria,
        descripcio: r.descripcio,
        metode: r.metode,
        origen: 'recurrent'
      });
      Dades.actualitza('Recurrents', r.id, { ultim_mes: mesAra });
      fets.push({ descripcio: r.descripcio, import: r.import, tipus: r.tipus });
    });

    if (fets.length) Log.info('finances.recurrents', fets.length + ' recurrents creats', fets);
    return fets;
  }

  // -------------------------------------------------------------- patrimoni

  /**
   * Què tens, i de quan.
   *
   * «De quan» és tan important com «quant»: un valor de Trade Republic de fa
   * dos mesos no és el teu capital, és el que era. Per això cada actiu porta
   * quants dies fa del seu últim valor, i el total diu clarament que és la
   * suma dels últims coneguts.
   */
  function patrimoni() {
    var actius = [];
    try {
      actius = Dades.llegeix('Patrimoni', function (x) { return !x.esborrat_el; });
    } catch (err) { return { actius: [], total: 0 }; }

    var hist = {};
    try {
      Dades.llegeix('PatrimoniHistoric').forEach(function (v) {
        var k = String(v.id_actiu);
        if (!hist[k]) hist[k] = [];
        hist[k].push({ data: String(v.data), valor: Number(v.valor) || 0 });
      });
    } catch (err) { /* encara no n'hi ha */ }

    var avui = Utils.avui();
    var total = 0, mesVell = null;

    var llista = actius.map(function (a) {
      var h = (hist[a.id] || []).sort(function (x, y) { return x.data.localeCompare(y.data); });
      var ultim = h.length ? h[h.length - 1] : null;
      if (ultim) total += ultim.valor;

      var dies = ultim ? Utils.diesEntre(ultim.data, avui) : null;
      if (dies !== null && String(a.automatic).toUpperCase() !== 'SI') {
        if (mesVell === null || dies > mesVell) mesVell = dies;
      }

      return {
        id: a.id, nom: a.nom, tipus: a.tipus,
        automatic: String(a.automatic).toUpperCase() === 'SI',
        valor: ultim ? ultim.valor : null,
        data: ultim ? ultim.data : null,
        dies: dies,
        // Només els últims dotze: l'històric sencer no cap ni es mira.
        historic: h.slice(-12)
      };
    }).sort(function (a, b) { return (b.valor || 0) - (a.valor || 0); });

    return { actius: llista, total: total, diesMesVell: mesVell };
  }

  function desaActiu(p) {
    var nom = String(p.nom || '').trim();
    if (!nom) throw new Error('Falta el nom.');

    var fila = { nom: nom, tipus: String(p.tipus || '').trim(), automatic: 'NO' };

    if (p.id) {
      /* Un actiu automàtic el porta el banc: canviar-li el nom és teu, però
         no pot deixar de ser automàtic o el banc en crearia un de nou al
         costat i tindries el mateix compte dues vegades. */
      var actual = Dades.perId('Patrimoni', p.id);
      if (!actual) throw new Error('Aquest actiu no existeix.');
      if (String(actual.automatic).toUpperCase() === 'SI') fila.automatic = 'SI';
      return Dades.actualitza('Patrimoni', p.id, fila);
    }
    return Dades.insereix('Patrimoni', fila, 'act');
  }

  function arxivaActiu(id) {
    if (!id) throw new Error('Falta l\'identificador.');
    var r = Dades.actualitza('Patrimoni', id, { esborrat_el: Utils.ara() });
    if (!r) throw new Error('Aquest actiu no existeix.');
    return { tret: true };
  }

  /**
   * Anota quant val avui.
   * Un valor per dia: si t'equivoques i el tornes a posar, el corregeix en
   * comptes d'inflar l'històric amb dues xifres del mateix dia.
   */
  function anotaValor(idActiu, valor, data) {
    if (!idActiu) throw new Error('Falta l\'actiu.');
    data = data || Utils.avui();
    var v = parseFloat(String(valor === undefined ? '' : valor).replace(',', '.'));
    if (!isFinite(v)) throw new Error('Aquest valor no és un número.');

    return Dades.desa('PatrimoniHistoric', {
      id: 'val_' + idActiu + '_' + data,
      id_actiu: idActiu, data: data, valor: v
    }, ['id'], 'val');
  }

  // ------------------------------------------------------------- pantalles

  /**
   * Tot el que una pantalla necessita, d'una tirada.
   *
   * Aprofita que dins d'UNA execució cada full es llegeix un sol cop: demanar
   * el mes, les categories i els suggeriments per separat volia dir tres
   * execucions, tres obertures del full i tres lectures dels mateixos
   * moviments. Aquí és una obertura i una lectura.
   */
  function pantalla(p) {
    p = p || {};
    var quin = p.periode || 'mes';

    var dades = quin === 'mesos' ? mesos(p.quants || 12)
              : quin === 'estad' ? estadistiques(p.mes)
              : quin === 'revisar' ? perRevisar()
              : quin === 'recurrents' ? { llista: recurrents() }
              : quin === 'patrimoni' ? patrimoni()
              : mes(p.mes);

    return {
      periode: quin,
      dades: dades,
      categories: categories(),
      // Els suggeriments només fan falta on hi ha el formulari d'apuntar.
      suggeriments: (quin === 'mes') ? suggeriments('') : []
      /* De quan és el que ve del banc s'enganxa a fora, a l'acció: és
         l'única cosa d'aquesta pantalla que canvia sense que s'escrigui
         res, i desada et diria «fa 2 minuts» durant mitja hora. */
    };
  }

  function estatDelBanc_() {
    try {
      if (typeof FinancesBanc === 'undefined') return null;
      return FinancesBanc.comEstem();
    } catch (e) { return null; }
  }

  // ------------------------------------------------------ safata de revisió

  /**
   * El que queda per decidir, AGRUPAT PER COMERÇ.
   *
   * Aquesta agrupació és tota la safata. Amb els moviments un a un, dotze
   * compres a l'estanc són dotze preguntes idèntiques; agrupades, és una.
   * El que fa costa amunt revisar no és el nombre de moviments, és el nombre
   * de decisions.
   *
   * Les etiquetes genèriques van a part i sense agrupar: allà cada moviment
   * SÍ que és una decisió diferent, per molt que el text es repeteixi.
   */
  function perRevisar() {
    var cats = indexCategories_();
    var grups = {}, solts = [];

    moviments_(function (f) {
      var altres = f.categoria === 'c_altd' || f.categoria === 'i_alti';
      return altres || String(f.revisat).toUpperCase() === 'NO';
    }).forEach(function (f) {
      var clau = clauMemoria_(f.descripcio, f.tipus);
      var imp = num_(f['import']);

      if (!clau || esGenerica_(clau)) {
        solts.push({
          id: f.id, data: f.data, tipus: f.tipus, import: imp,
          descripcio: f.descripcio, categoria: f.categoria,
          categoriaNom: (cats[f.categoria] || {}).nom || f.categoria
        });
        return;
      }

      if (!grups[clau]) {
        grups[clau] = { clau: clau, mostra: f.descripcio, tipus: f.tipus,
                        moviments: 0, total: 0, primera: f.data, ultima: f.data };
      }
      var g = grups[clau];
      g.moviments++;
      g.total += imp;
      if (String(f.data) < String(g.primera)) g.primera = f.data;
      if (String(f.data) > String(g.ultima)) { g.ultima = f.data; g.mostra = f.descripcio; }
    });

    var llista = Object.keys(grups).map(function (k) { return grups[k]; })
      .sort(function (a, b) { return b.moviments - a.moviments || b.total - a.total; });

    solts.sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); });

    return {
      comercos: llista,
      solts: solts,
      totalMoviments: llista.reduce(function (s, g) { return s + g.moviments; }, 0) + solts.length,
      categories: categories()
    };
  }

  /**
   * Una decisió, tots els moviments d'aquell comerç.
   * I s'apren: és l'última vegada que se'n pregunta.
   */
  function decideixComerc(clau, categoria) {
    if (!clau || !categoria) throw new Error('Falta el comerç o la categoria.');

    var tocats = 0, mostra = '', metode = '', tipus = clau.indexOf('i|') === 0 ? 'i' : 'd';

    moviments_(function (f) {
      var altres = f.categoria === 'c_altd' || f.categoria === 'i_alti';
      if (!altres && String(f.revisat).toUpperCase() === 'SI') return false;
      return clauMemoria_(f.descripcio, f.tipus) === clau;
    }).forEach(function (f) {
      Dades.actualitza('Moviments', f.id, { categoria: categoria, revisat: 'SI' });
      if (!mostra) { mostra = f.descripcio; metode = f.metode; }
      tocats++;
    });

    if (mostra) recorda(mostra, categoria, metode, tipus);
    return { tocats: tocats, apres: !!mostra };
  }

  /** Un moviment sol, dels que no es poden aprendre. No toca la memòria. */
  function decideixMoviment(id, categoria) {
    if (!id || !categoria) throw new Error('Falta el moviment o la categoria.');
    var r = Dades.actualitza('Moviments', id, { categoria: categoria, revisat: 'SI' });
    if (!r) throw new Error('Aquest moviment no existeix.');
    return { fet: true };
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

    var out = {
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

    /* I si volia VEURE-HO: la despesa per categories, de més a menys.
       No la llista de moviments —dos-cents apunts no es miren, es
       consulten— sinó la pregunta que de debò fa qui diu «ensenya'm les
       finances»: on se me'n va. Si ha filtrat per una sola categoria, això
       ja no té sentit i el que s'ensenya són els moviments. */
    if (a.ensenya) {
      if (idCat || text) {
        out._visor = {
          titol: (idCat ? ((cats[idCat] || {}).nom || 'Categoria') : 'Moviments'),
          mena: 'llista',
          buit: 'Cap moviment amb aquests filtres.',
          dades: files.slice().sort(function (x, y) {
            return String(y.data) < String(x.data) ? -1 : 1;
          }).map(function (f) {
            return {
              marca: String(f.data).slice(8) + '/' + String(f.data).slice(5, 7),
              text: f.descripcio,
              menut: (cats[f.categoria] || {}).nom || '',
              urgent: f.tipus !== 'i',
              fet: f.tipus === 'i'
            };
          }),
          peu: [files.length + ' moviments', eur(despeses) + ' de despesa']
        };
      } else {
        var perCat = {};
        files.forEach(function (f) {
          if (fora[f.categoria] || f.tipus === 'i') return;
          var nom = (cats[f.categoria] || {}).nom || 'Sense categoria';
          perCat[nom] = (perCat[nom] || 0) + num_(f['import']);
        });
        var barres = Object.keys(perCat).map(function (nom) {
          return { etiqueta: nom, v: Math.round(perCat[nom] * 100) / 100 };
        }).sort(function (x, y) { return y.v - x.v; });

        out._visor = {
          titol: 'On se n\'ha anat' + (desde ? ' · ' + String(desde).slice(0, 7) : ''),
          mena: 'barres', unitat: '€',
          buit: 'Cap despesa en aquest període.',
          dades: barres,
          peu: [eur(despeses) + ' gastats', eur(ingressos) + ' entrats']
        };
      }
    }
    return out;
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

  // ------------------------------------------------- eines de la conversa

  /**
   * Trobar el que en Pol anomena pel nom, no per l'identificador.
   * Si n'hi ha més d'un i no ha dit la data, NO se'n tria cap: es retornen
   * els candidats. Treure el moviment equivocat perquè el text s'assemblava
   * és un error que no veuria fins d'aquí setmanes.
   */
  function trobaMoviment_(descripcio, data) {
    var q = String(descripcio || '').trim().toLowerCase();
    if (!q) throw new Error('No has dit quin moviment.');

    var files = moviments_(function (f) {
      if (data && String(f.data) !== String(data)) return false;
      return String(f.descripcio).toLowerCase().indexOf(q) !== -1;
    });

    if (!files.length) {
      throw new Error('No trobo cap moviment que digui «' + descripcio + '»' +
                      (data ? ' del ' + data : '') + '.');
    }
    if (files.length > 1) {
      throw new Error('N\'hi ha ' + files.length + ' que hi encaixen: ' +
        files.slice(0, 5).map(function (f) {
          return f.data + ' ' + f.descripcio + ' ' + eur(num_(f['import']));
        }).join('; ') + '. Digues-me la data.');
    }
    return files[0];
  }

  function classificaPerNom(a) {
    var cat = categoriaPerNom_(a.categoria);
    if (!cat) {
      throw new Error('No tinc cap categoria que es digui «' + a.categoria + '». Són: ' +
        categories().map(function (c) { return c.nom; }).join(', ') + '.');
    }

    /* Tots els d'un comerç alhora: és el cas normal quan buides la safata, i
       de passada s'apren perquè no ho hagis de tornar a dir mai. */
    if (a.tots) {
      var q = String(a.descripcio || '').trim().toLowerCase();
      if (!q) throw new Error('No has dit quin comerç.');
      var files = moviments_(function (f) {
        return String(f.descripcio).toLowerCase().indexOf(q) !== -1 && f.tipus === cat.mena;
      });
      if (!files.length) throw new Error('No trobo cap moviment de «' + a.descripcio + '».');

      files.forEach(function (f) {
        Dades.actualitza('Moviments', f.id, { categoria: cat.id, revisat: 'SI' });
      });
      recorda(files[0].descripcio, cat.id, files[0].metode, cat.mena);
      return { canviats: files.length, categoria: cat.nom, apres: true };
    }

    var m = trobaMoviment_(a.descripcio, a.data);
    if (m.tipus !== cat.mena) {
      throw new Error('«' + cat.nom + '» és una categoria de ' +
        (cat.mena === 'i' ? 'ingressos' : 'despeses') + ' i això és ' +
        (m.tipus === 'i' ? 'un ingrés' : 'una despesa') + '.');
    }
    edita(m.id, { categoria: cat.id, revisat: true });
    return { canviats: 1, moviment: m.descripcio, categoria: cat.nom, apres: true };
  }

  function pressupostPerNom(a) {
    var cat = categoriaPerNom_(a.categoria, 'd');
    if (!cat) {
      throw new Error('No tinc cap categoria de despeses que es digui «' + a.categoria + '».');
    }
    var l = num_(a.limit);
    desaPressupost(cat.id, l);

    // Es diu quant hi porta gastat aquest mes: un límit sense saber on ets no
    // és una decisió informada.
    var m = mes(mesActual());
    var gastat = 0;
    m.perCategoria.forEach(function (c) { if (c.id === cat.id) gastat = c.total; });
    return { categoria: cat.nom, limit: l, gastatAquestMes: Math.round(gastat * 100) / 100,
              tret: l <= 0 };
  }

  function patrimoniPerNom(a) {
    var q = String(a.actiu || '').trim().toLowerCase();
    if (!q) throw new Error('No has dit quin actiu.');

    var p = patrimoni();
    var exactes = p.actius.filter(function (x) { return x.nom.toLowerCase() === q; });
    var cand = exactes.length ? exactes
      : p.actius.filter(function (x) { return x.nom.toLowerCase().indexOf(q) !== -1; });

    if (!cand.length) {
      throw new Error('No tinc cap actiu que es digui «' + a.actiu + '». Tens: ' +
        p.actius.map(function (x) { return x.nom; }).join(', ') + '.');
    }
    if (cand.length > 1) {
      throw new Error('N\'hi ha ' + cand.length + ': ' +
        cand.map(function (x) { return x.nom; }).join(', ') + '. Digues quin.');
    }
    if (cand[0].automatic) {
      throw new Error('«' + cand[0].nom + '» el porta el banc i s\'actualitza sol. ' +
                      'No cal anotar-hi res.');
    }

    var v = parseFloat(String(a.valor).replace(',', '.'));
    if (!isFinite(v)) throw new Error('Aquest valor no és un número.');
    anotaValor(cand[0].id, v);

    var abans = cand[0].valor;
    return {
      anotat: true, actiu: cand[0].nom, valor: v,
      anterior: abans, diferencia: abans === null ? null : Math.round((v - abans) * 100) / 100
    };
  }

  function treuPerNom(a) {
    var m = trobaMoviment_(a.descripcio, a.data);
    treu(m.id);
    return { tret: true, moviment: m.descripcio, import: num_(m['import']), data: m.data };
  }

  // ------------------------------------------------------------- categories

  /**
   * L'identificador surt del nom, no d'un número.
   *
   * Els moviments hi apunten, i el dia que obris el full vols poder llegir
   * «i_bizum» i saber què és, no «cat_ln4k2x_a7f». Porta al davant si és de
   * despeses o d'ingressos, com les que ja tenies.
   */
  function idCategoria_(nom, mena) {
    var base = String(nom).toLowerCase()
      .replace(/[àáâä]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i')
      .replace(/[òóôö]/g, 'o').replace(/[ùúûü]/g, 'u').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]/g, '').slice(0, 10);
    if (!base) base = 'cat';

    var prefix = (mena === 'i' ? 'i_' : 'c_');
    var ocupats = {};
    Dades.llegeix('Categories').forEach(function (c) { ocupats[String(c.id)] = true; });

    var id = prefix + base, n = 2;
    while (ocupats[id]) { id = prefix + base + n; n++; }
    return id;
  }

  function creaCategoria(p) {
    var nom = String(p.nom || '').trim();
    if (!nom) throw new Error('Falta el nom de la categoria.');

    var mena = p.mena === 'i' ? 'i' : 'd';
    if (categoriaPerNom_(nom, mena)) {
      throw new Error('Ja tens una categoria «' + nom + '» a ' +
                      (mena === 'i' ? 'ingressos' : 'despeses') + '.');
    }

    var seguent = 0;
    Dades.llegeix('Categories').forEach(function (c) {
      seguent = Math.max(seguent, Number(c.ordre) || 0);
    });

    return Dades.insereix('Categories', {
      id: idCategoria_(nom, mena),
      nom: nom,
      emoji: String(p.emoji || '').slice(0, 4),
      mena: mena,
      color: '',
      exclou: p.exclou ? 'SI' : 'NO',
      ordre: seguent + 1
    }, 'cat');
  }

  function editaCategoria(id, p) {
    if (!id) throw new Error('Falta la categoria.');
    var canvis = {};
    if (p.nom !== undefined) {
      var nom = String(p.nom).trim();
      if (!nom) throw new Error('El nom no pot quedar buit.');
      canvis.nom = nom;
    }
    if (p.emoji !== undefined) canvis.emoji = String(p.emoji).slice(0, 4);
    if (p.exclou !== undefined) canvis.exclou = p.exclou ? 'SI' : 'NO';

    var r = Dades.actualitza('Categories', id, canvis);
    if (!r) throw new Error('Aquesta categoria no existeix.');
    return r;
  }

  /**
   * Arxivar-la NO és esborrar-la, i tot i així es comprova primer.
   * Si hi ha moviments que hi apunten, treure-la de la llista els deixaria
   * assenyalant una cosa que no es veu: els números seguirien quadrant i el
   * desglossament diria una categoria sense nom. Val més dir quants n'hi ha.
   */
  function arxivaCategoria(id) {
    if (!id) throw new Error('Falta la categoria.');
    var quants = moviments_(function (f) { return f.categoria === id; }).length;
    if (quants) {
      throw new Error('No la puc treure: hi ha ' + quants +
        (quants === 1 ? ' moviment que hi apunta' : ' moviments que hi apunten') +
        '. Canvia\'ls de categoria primer.');
    }
    var r = Dades.actualitza('Categories', id, { esborrat_el: Utils.ara() });
    if (!r) throw new Error('Aquesta categoria no existeix.');
    return { tret: true };
  }

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
    resumPeriode: resumPeriode,
    elDia: elDia,
    mes: mes,
    mesos: mesos,
    pantalla: pantalla,
    pressupostos: pressupostos,
    desaPressupost: desaPressupost,
    recurrents: recurrents,
    patrimoni: patrimoni,
    estatDelBanc: estatDelBanc_,
    desaActiu: desaActiu,
    arxivaActiu: arxivaActiu,
    anotaValor: anotaValor,
    desaRecurrent: desaRecurrent,
    arxivaRecurrent: arxivaRecurrent,
    generaRecurrents: generaRecurrents,
    estadistiques: estadistiques,
    afegeix: afegeix,
    edita: edita,
    treu: treu,
    recordat: recordat,
    recorda: recorda,
    clauComerc: clauComerc_,
    clauMemoria: clauMemoria_,
    reclassifica: reclassifica,
    perRevisar: perRevisar,
    decideixComerc: decideixComerc,
    decideixMoviment: decideixMoviment,
    categories: categories,
    creaCategoria: creaCategoria,
    editaCategoria: editaCategoria,
    arxivaCategoria: arxivaCategoria,
    suggeriments: suggeriments,
    consultaIA: consultaIA,
    apuntaPerNom: apuntaPerNom,
    classificaPerNom: classificaPerNom,
    pressupostPerNom: pressupostPerNom,
    patrimoniPerNom: patrimoniPerNom,
    treuPerNom: treuPerNom,
    sembraCategories: sembraCategories,
    importa: function (dades, simulacio) { return FinancesImport.importa(dades, simulacio); }
  };
})();
