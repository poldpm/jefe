/**
 * JEFE — MÒDUL · Hàbits
 *
 * Cap línia del nucli s'ha tocat per afegir aquest fitxer.
 * Vegeu MODULS.md per al contracte.
 *
 * DECISIONS DE CÀLCUL (importants, i discutibles: si no hi estàs d'acord, es canvien aquí)
 *
 *   1. Absència ≠ zero. Una fila que no existeix vol dir "no registrat".
 *      `valor = 0` vol dir "registrat i no fet". Són coses diferents.
 *
 *   2. AVUI NO TRENCA MAI LA RATXA. Si no ho has marcat encara, avui no compta
 *      ni a favor ni en contra. Sense això, cada matí veuries la ratxa a zero
 *      i deixaries d'obrir l'app en dues setmanes.
 *
 *   3. Un dia no exigit no trenca res. Si un hàbit és dilluns-dimecres-divendres,
 *      el dimarts no existeix als efectes de la ratxa.
 *
 *   4. Res compta abans de la data de creació de l'hàbit.
 *
 *   5. Els hàbits `x_per_setmana` es compten per setmanes, no per dies:
 *      la ratxa són setmanes seguides, i la setmana en curs no trenca mai.
 *
 *   6. ELS COMPTADORS NO ES JUTGEN. Un comptador —els cigarros del dia— no té
 *      objectiu, ni ratxa, ni percentatge de compliment, i no surt mai com a
 *      «pendent». Només compta i ensenya cap on va. Posar-li un 40% de
 *      compliment als cigarros seria una xifra sense cap significat, i pintar
 *      de verd el dia que en fumes molts, directament una mentida.
 */
function MODUL_HABITS() {
  return {
    id: 'habits',
    nom: 'Hàbits',
    icona: 'habits',
    ordre: 10,
    versioEsquema: 1,

    fulls: [
      {
        nom: 'Habits',
        columnes: [
          { nom: 'id',                tipus: 'text' },
          { nom: 'nom',               tipus: 'text' },
          { nom: 'tipus',             tipus: 'text', valors: ['si_no', 'quantitat', 'comptador'] },
          { nom: 'objectiu',          tipus: 'num'  },
          { nom: 'unitat',            tipus: 'text' },
          { nom: 'frequencia',        tipus: 'text', valors: ['diaria', 'dies_setmana', 'x_per_setmana'] },
          { nom: 'dies_setmana',      tipus: 'text' },
          { nom: 'objectiu_setmanal', tipus: 'num'  },
          { nom: 'actiu',             tipus: 'text', valors: ['SI', 'NO'] },
          { nom: 'ordre',             tipus: 'num'  },
          { nom: 'creat_el',          tipus: 'iso'  },
          { nom: 'arxivat_el',        tipus: 'iso'  }
        ]
      },
      {
        nom: 'HabitsRegistre',
        columnes: [
          { nom: 'id',              tipus: 'text' },
          { nom: 'id_habit',        tipus: 'text' },
          { nom: 'data',            tipus: 'data' },
          { nom: 'valor',           tipus: 'num'  },
          { nom: 'origen',          tipus: 'text', valors: ['app', 'retroactiu', 'captura'] },
          { nom: 'creat_el',        tipus: 'iso'  },
          { nom: 'actualitzat_el',  tipus: 'iso'  }
        ]
      }
    ],

    accions: {
      dia: function (p) { return Habits.dia(p.data || Utils.avui()); },
      mes: function (p) { return Habits.mes(p.fins || Utils.avui(), p.dies || 30); },
      marca: function (p) { return Habits.marca(p.id, p.data, p.valor); },
      llista: function () { return Habits.definicions(); },
      historic: function (p) { return Habits.historic(p.id, p.dies || 30); },
      resum: function () { return Habits.resumTots(); },
      crea: function (p) { return Habits.crea(p); },
      edita: function (p) { return Habits.edita(p.id, p); },
      arxiva: function (p) { return Habits.arxiva(p.id); },
      reactiva: function (p) { return Habits.reactiva(p.id); },
      ordena:   function (p) { Habits.ordena(p.ids); return Habits.dia(p.data || Utils.avui()); }
    },

    resumInici: function () {
      var d = Habits.dia(Utils.avui());
      var pendents = d.habits.filter(function (h) { return h.exigit && !h.complert; }).length;
      return {
        etiqueta: pendents === 0 ? 'Hàbits al dia' : 'Hàbits pendents',
        valor: pendents,
        urgent: pendents > 0,
        accio: 'habits'
      };
    },

    elDia: function (data) {
      var d = Habits.dia(data);
      var falten = d.habits.filter(function (h) { return h.exigit && !h.complert; });
      if (!falten.length) return null;
      return {
        titol: 'Hàbits que et falten', accio: 'habits',
        coses: falten.map(function (h) {
          return { text: h.nom,
                   menut: h.tipus === 'quantitat' ? (h.valor || 0) + ' de ' + h.objectiu
                        : (h.ratxa > 0 ? h.ratxa + ' dies de ratxa' : '') };
        })
      };
    },

    /* Per a la revisió setmanal. El mòdul del diari no sap què és un hàbit:
       demana al nucli què ha passat i el nucli ens ho pregunta a nosaltres. */
    resumPeriode: function (desde, fins) { return Habits.resumPeriode(desde, fins); },

    contextIA: function () {
      var d = Habits.dia(Utils.avui());
      if (!d.habits.length) return 'Hàbits: cap definit.';
      var linies = d.habits.map(function (h) {
        if (h.esComptador) {
          return '- ' + h.nom + ' (comptador, no es completa): ' + (h.valor || 0) + ' avui' +
                 (h.mitjana7 === null ? '' : ' · mitjana ' + h.mitjana7 + ' al dia els últims 7') +
                 (h.canvi7 === null || h.canvi7 === undefined ? ''
                   : ' · ' + (h.canvi7 > 0 ? '+' : '') + h.canvi7 + ' respecte la setmana anterior');
        }
        return '- ' + h.nom + ': ' + (h.complert ? 'fet' : (h.exigit ? 'pendent' : 'no toca avui')) +
               ' · ratxa ' + h.ratxa + ' ' + h.unitatRatxa +
               ' · compliment 30 dies ' + h.pct30 + '%';
      });
      return 'Hàbits d\'avui (' + d.data + '):\n' + linies.join('\n');
    },

    einesIA: [{
      nom: 'consulta_habits',
      descripcio: 'Retorna el registre d\'un hàbit de l\'usuari en un rang de dates, o les estadístiques ' +
                  'de tots els hàbits. Si el rang supera 60 dies retorna dades agregades per setmana.',
      esquema: {
        type: 'object',
        properties: {
          nom_habit: { type: 'string', description: 'Nom de l\'hàbit. Si s\'omet, retorna el resum de tots.' },
          desde: { type: 'string', description: 'Data inicial AAAA-MM-DD' },
          fins: { type: 'string', description: 'Data final AAAA-MM-DD' }
        }
      },
      executa: function (args) { return Habits.consultaIA(args); }
    }, {
      nom: 'registra_habit',
      descripcio: 'Marca un hàbit com a fet o no fet un dia concret. Si l\'hàbit és un ' +
                  'COMPTADOR (els cigarros, per exemple), `quantitat` és el total del dia; ' +
                  'si no se\'n diu cap, se n\'hi suma un. NO s\'executa directament: ' +
                  'genera una proposta que en Pol ha de confirmar amb un botó.',
      escriu: true,
      esquema: {
        type: 'object',
        properties: {
          nom_habit: { type: 'string', description: 'Nom de l\'hàbit' },
          data: { type: 'string', description: 'Data AAAA-MM-DD. Si s\'omet, avui.' },
          fet: { type: 'boolean', description: 'true per marcar-lo fet, false per marcar-lo no fet' },
          quantitat: { type: 'number', description: 'Total del dia. Només per a comptadors i ' +
                       'hàbits de quantitat. «N\'he fumat 5» és quantitat 5, no cinc crides.' }
        },
        required: ['nom_habit']
      },
      etiqueta: function (a) {
        if (a.quantitat !== undefined && a.quantitat !== null) {
          return 'Posar «' + (a.nom_habit || '?') + '» a ' + a.quantitat +
                 (a.data ? ' el ' + a.data : ' avui');
        }
        return 'Marcar «' + (a.nom_habit || '?') + '» com a ' +
               (a.fet === false ? 'NO fet' : 'fet') +
               (a.data ? ' el ' + a.data : ' avui');
      },
      executa: function (a) { return Habits.registraPerNom(a); }
    }, {
      nom: 'crea_habit',
      descripcio: 'Crea un hàbit nou. `tipus` pot ser si_no (fet o no fet), quantitat (amb un ' +
                  'objectiu diari, com «2 vegades rentar-se les dents») o comptador (només ' +
                  'compta, sense objectiu ni ratxa, com els cigarros del dia). ' +
                  'NO s\'executa directament: genera una proposta a confirmar.',
      escriu: true,
      esquema: {
        type: 'object',
        properties: {
          nom:      { type: 'string', description: 'Com es diu' },
          tipus:    { type: 'string', description: 'si_no, quantitat o comptador' },
          objectiu: { type: 'number', description: 'Quants cops al dia. Només per a `quantitat`.' },
          unitat:   { type: 'string', description: 'Què compta: cigarros, gots, minuts…' }
        },
        required: ['nom']
      },
      etiqueta: function (a) {
        var t = a.tipus === 'comptador' ? 'comptador'
              : a.tipus === 'quantitat' ? (a.objectiu || 1) + ' cops al dia'
              : 'fet o no fet';
        return 'Crear l\'hàbit «' + (a.nom || '?') + '» (' + t + ')';
      },
      executa: function (a) { return Habits.creaPerNom(a); }
    }],

    vista: 'vista_habits'
  };
}


var Habits = (function () {

  // ---------------------------------------------------------------- intern

  function definicions(inclouArxivats) {
    var files = Dades.llegeix('Habits', inclouArxivats ? null : { actiu: 'SI' });
    files.sort(function (a, b) { return (Number(a.ordre) || 0) - (Number(b.ordre) || 0); });
    return files;
  }

  /** Tots els registres indexats: {id_habit: {data: valor}} */
  function indexRegistres_() {
    var idx = {};
    var files = Dades.llegeix('HabitsRegistre');
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (!idx[f.id_habit]) idx[f.id_habit] = {};
      idx[f.id_habit][String(f.data)] = Number(f.valor) || 0;
    }
    return idx;
  }

  function esComptador_(h) { return h.tipus === 'comptador'; }

  function objectiu_(h) {
    if (esComptador_(h)) return 0;      // no en té: només compta
    var o = Number(h.objectiu);
    return o > 0 ? o : 1;
  }

  /** Aquest dia toca fer aquest hàbit? */
  function exigit_(h, data) {
    /* Un comptador no s'exigeix mai. No hi ha res a complir, i si fos exigible
       sortiria cada dia com a pendent i et diria que et falta fumar. */
    if (esComptador_(h)) return false;
    if (h.frequencia === 'x_per_setmana') return true;   // s'avalua per setmanes
    if (h.frequencia === 'dies_setmana') {
      var dies = String(h.dies_setmana || '').split(',').map(function (s) { return s.trim(); });
      return dies.indexOf(String(Utils.diaSetmana(data))) !== -1;
    }
    return true;   // diaria
  }

  function complert_(h, valor) {
    if (esComptador_(h)) return false;   // no es completa: es compta
    return Number(valor || 0) >= objectiu_(h);
  }

  function dataCreacio_(h) {
    return String(h.creat_el || '').slice(0, 10) || '1970-01-01';
  }

  // ------------------------------------------------------- ratxes i percentatges

  /** Ratxa per dies (frequencia `diaria` i `dies_setmana`). */
  function ratxaDies_(h, regs, avui) {
    var inici = dataCreacio_(h);
    var ratxa = 0;
    var data = avui;
    var guarda = 0;

    // Avui: si toca i no està fet, no trenca — simplement no compta.
    if (exigit_(h, data) && !complert_(h, regs[data])) data = Utils.sumaDies(data, -1);

    while (data >= inici && guarda++ < 3650) {
      if (exigit_(h, data)) {
        if (complert_(h, regs[data])) ratxa++;
        else break;
      }
      data = Utils.sumaDies(data, -1);
    }
    return ratxa;
  }

  function ratxaMaximaDies_(h, regs, avui) {
    var data = dataCreacio_(h);
    var max = 0, actual = 0, guarda = 0;
    while (data <= avui && guarda++ < 3650) {
      if (exigit_(h, data)) {
        if (complert_(h, regs[data])) { actual++; if (actual > max) max = actual; }
        else if (data !== avui) actual = 0;      // avui mai no trenca
      }
      data = Utils.sumaDies(data, 1);
    }
    return max;
  }

  /** Setmanes: {'2026-W31': quantitat de dies complerts} */
  function perSetmana_(h, regs, inici, avui) {
    var setmanes = {};
    var data = inici, guarda = 0;
    while (data <= avui && guarda++ < 3650) {
      var s = Utils.setmanaISO(data);
      if (setmanes[s] === undefined) setmanes[s] = 0;
      if (complert_(h, regs[data])) setmanes[s]++;
      data = Utils.sumaDies(data, 1);
    }
    return setmanes;
  }

  function ratxaSetmanes_(h, regs, avui) {
    var objectiuS = Number(h.objectiu_setmanal) || 1;
    var setmanes = perSetmana_(h, regs, dataCreacio_(h), avui);
    var claus = Object.keys(setmanes).sort();
    var actual = Utils.setmanaISO(avui);

    var ratxa = 0, max = 0, correguda = 0;
    for (var i = 0; i < claus.length; i++) {
      if (setmanes[claus[i]] >= objectiuS) { correguda++; if (correguda > max) max = correguda; }
      else if (claus[i] !== actual) correguda = 0;
    }

    // Ratxa actual, cap enrere; la setmana en curs no trenca mai
    for (var j = claus.length - 1; j >= 0; j--) {
      if (setmanes[claus[j]] >= objectiuS) ratxa++;
      else if (claus[j] === actual) continue;
      else break;
    }
    return { ratxa: ratxa, max: max, setmanes: setmanes };
  }

  /**
   * Percentatge de compliment en una finestra de N dies.
   * Denominador = dies exigits dins la finestra, des de la creació, EXCLOENT avui
   * si encara no s'ha registrat (no es pot suspendre un dia que no s'ha acabat).
   */
  function percentatge_(h, regs, avui, dies) {
    var inici = Utils.sumaDies(avui, -(dies - 1));
    var creacio = dataCreacio_(h);
    if (inici < creacio) inici = creacio;

    var exigits = 0, fets = 0;
    var data = inici, guarda = 0;

    while (data <= avui && guarda++ < 400) {
      var esAvui = (data === avui);
      var registrat = regs[data] !== undefined;
      if (exigit_(h, data) && !(esAvui && !registrat)) {
        exigits++;
        if (complert_(h, regs[data])) fets++;
      }
      data = Utils.sumaDies(data, 1);
    }
    if (!exigits) return null;                 // res exigible encara: no és 0%, és "sense dades"
    return Math.round((fets / exigits) * 100);
  }

  /**
   * Suma i mitjana d'una finestra de dies.
   *
   * El divisor són els dies que l'hàbit ja existia, no els de la finestra:
   * si el vas crear dijous, la mitjana de la setmana no s'ha de repartir
   * entre set dies i sortir-te la meitat del que fumes de debò.
   *
   * Un dia sense registre compta com a zero. En un comptador això és el que
   * toca: si no vas prémer el botó, no en vas fer cap.
   */
  function finestra_(h, regs, fins, dies) {
    var inici = Utils.sumaDies(fins, -(dies - 1));
    var creacio = dataCreacio_(h);
    if (inici < creacio) inici = creacio;
    if (inici > fins) return { suma: 0, dies: 0, mitjana: null, maxim: 0 };

    var suma = 0, compte = 0, maxim = 0, d = inici, guarda = 0;
    while (d <= fins && guarda++ < 400) {
      var v = Number(regs[d]) || 0;
      suma += v; compte++;
      if (v > maxim) maxim = v;
      d = Utils.sumaDies(d, 1);
    }
    return { suma: suma, dies: compte, mitjana: compte ? suma / compte : null, maxim: maxim };
  }

  /**
   * El que sí que vol dir alguna cosa en un comptador: quant en portes avui,
   * per on et mous, i si això puja o baixa. Res de ratxes ni percentatges.
   */
  function estadistiquesComptador_(h, regs, avui) {
    var ara = finestra_(h, regs, avui, 7);
    var abans = finestra_(h, regs, Utils.sumaDies(avui, -7), 7);
    var mes = finestra_(h, regs, avui, 30);

    var canvi = null;
    if (ara.mitjana !== null && abans.mitjana !== null && abans.dies >= 3) {
      canvi = Math.round((ara.mitjana - abans.mitjana) * 10) / 10;
    }

    return {
      esComptador: true,
      unitatRatxa: 'dies',
      ratxa: 0, ratxaMax: 0, pct30: null, pct7: null,
      avui: Number(regs[avui]) || 0,
      mitjana7: ara.mitjana === null ? null : Math.round(ara.mitjana * 10) / 10,
      mitjana7Previa: abans.mitjana === null ? null : Math.round(abans.mitjana * 10) / 10,
      canvi7: canvi,                       // positiu = n'has fet més que la setmana passada
      total7: ara.suma,
      total30: mes.suma,
      maxim30: mes.maxim,
      diesRegistrats: mes.dies
    };
  }

  function estadistiques_(h, regs, avui) {
    regs = regs || {};
    if (esComptador_(h)) return estadistiquesComptador_(h, regs, avui);
    var perSetmanes = (h.frequencia === 'x_per_setmana');
    var e = {
      unitatRatxa: perSetmanes ? 'setmanes' : 'dies',
      pct30: percentatge_(h, regs, avui, 30),
      pct7: percentatge_(h, regs, avui, 7)
    };
    if (perSetmanes) {
      var r = ratxaSetmanes_(h, regs, avui);
      e.ratxa = r.ratxa;
      e.ratxaMax = r.max;
      e.aquestaSetmana = r.setmanes[Utils.setmanaISO(avui)] || 0;
      e.objectiuSetmanal = Number(h.objectiu_setmanal) || 1;
    } else {
      e.ratxa = ratxaDies_(h, regs, avui);
      e.ratxaMax = ratxaMaximaDies_(h, regs, avui);
    }
    return e;
  }

  // ---------------------------------------------------------------- públic

  /** Estat d'un dia concret. És la pantalla principal de l'app. */
  function dia(data) {
    if (!Utils.esDataValida(data)) throw new Error('Data no vàlida: «' + data + '».');
    var avui = Utils.avui();
    var habits = definicions();
    var idx = indexRegistres_();

    var out = habits.map(function (h) {
      var regs = idx[h.id] || {};
      var valor = regs[data];
      var est = estadistiques_(h, regs, avui);

      return {
        id: h.id,
        nom: h.nom,
        tipus: h.tipus,
        objectiu: objectiu_(h),
        unitat: h.unitat || '',
        frequencia: h.frequencia,
        valor: valor === undefined ? null : Number(valor),
        registrat: valor !== undefined,
        complert: complert_(h, valor),
        exigit: exigit_(h, data) && data >= dataCreacio_(h),
        existiaEncara: data >= dataCreacio_(h),
        ratxa: est.ratxa,
        ratxaMax: est.ratxaMax,
        unitatRatxa: est.unitatRatxa,
        pct30: est.pct30,
        pct7: est.pct7,
        aquestaSetmana: est.aquestaSetmana,
        objectiuSetmanal: est.objectiuSetmanal,
        // Només els comptadors: la resta són `undefined` i no viatgen.
        esComptador: est.esComptador,
        mitjana7: est.mitjana7,
        canvi7: est.canvi7,
        total30: est.total30
      };
    });

    return {
      data: data,
      esAvui: data === avui,
      esFutur: data > avui,
      diaSetmana: Utils.diaSetmana(data),
      habits: out
    };
  }

  /**
   * Marca (o desmarca) un hàbit un dia.
   * `valor` null = alterna entre fet i no fet.
   * Retorna l'estat sencer del dia perquè el client no hagi de tornar a demanar-lo.
   */
  function marca(idHabit, data, valor) {
    data = data || Utils.avui();
    if (!Utils.esDataValida(data)) throw new Error('Data no vàlida: «' + data + '».');
    if (data > Utils.avui()) throw new Error('No es pot registrar un dia que encara no ha arribat.');

    var h = Dades.perId('Habits', idHabit);
    if (!h) throw new Error('Aquest hàbit no existeix.');

    return ambBloqueig_(function () {
      var actual = Dades.un('HabitsRegistre', { id_habit: idHabit, data: data });
      var nou;

      if (valor === null || valor === undefined) {
        if (esComptador_(h)) {
          nou = (Number(actual && actual.valor) || 0) + 1;   // no alterna: suma
        } else {
          var eraComplert = actual && complert_(h, actual.valor);
          nou = eraComplert ? 0 : objectiu_(h);
        }
      } else {
        nou = Math.max(0, Number(valor) || 0);
      }

      Dades.desa('HabitsRegistre', {
        id_habit: idHabit,
        data: data,
        valor: nou,
        origen: data === Utils.avui() ? 'app' : 'retroactiu'
      }, ['id_habit', 'data'], 'hrg');

      return dia(data);
    });
  }

  /**
   * El full de mes: tots els hàbits per tots els dies d'un rang.
   * És el que alimenta el relleu del mapa, i per això cada cel·la porta
   * un valor numèric (l'altitud) a més de l'estat.
   */
  function mes(fins, dies) {
    if (!Utils.esDataValida(fins)) fins = Utils.avui();
    dies = Math.max(7, Math.min(90, Number(dies) || 30));

    var avui = Utils.avui();
    var desde = Utils.sumaDies(fins, -(dies - 1));
    var calendari = Utils.rangDates(desde, fins);
    var idx = indexRegistres_();

    /* Els comptadors no hi surten. Aquesta graella és de compliment —fet o no
       fet— i un comptador no es compleix. Pintar-hi els cigarros de verd els
       dies que en fumes molts seria llegir-ho just al revés. L'evolució d'un
       comptador va a la seva fitxa, que és on té sentit. */
    var files = definicions().filter(function (h) {
      return h.tipus !== 'comptador';
    }).map(function (h) {
      var regs = idx[h.id] || {};
      var creacio = dataCreacio_(h);
      var celles = calendari.map(function (d) {
        if (d > avui) return { data: d, estat: 'futur', altitud: 0.5 };
        if (d < creacio) return { data: d, estat: 'futur', altitud: 0.5 };
        if (!exigit_(h, d)) return { data: d, estat: 'notoca', altitud: 0.5 };
        if (complert_(h, regs[d])) return { data: d, estat: 'fet', altitud: 1 };
        return { data: d, estat: regs[d] !== undefined ? 'nofet' : 'pendent', altitud: 0 };
      });
      var est = estadistiques_(h, regs, avui);
      return {
        id: h.id, nom: h.nom,
        pct30: est.pct30, ratxa: est.ratxa, unitatRatxa: est.unitatRatxa,
        celles: celles
      };
    });

    return { desde: desde, fins: fins, avui: avui, calendari: calendari, habits: files };
  }

  /** Històric d'un hàbit: els últims N dies més les estadístiques. */
  function historic(idHabit, dies) {
    var h = Dades.perId('Habits', idHabit);
    if (!h) throw new Error('Aquest hàbit no existeix.');

    var avui = Utils.avui();
    var regs = indexRegistres_()[idHabit] || {};
    var inici = Utils.sumaDies(avui, -(dies - 1));
    var creacio = dataCreacio_(h);

    var calendari = Utils.rangDates(inici, avui).map(function (d) {
      var valor = regs[d];
      return {
        data: d,
        valor: valor === undefined ? null : Number(valor),
        registrat: valor !== undefined,
        complert: complert_(h, valor),
        exigit: exigit_(h, d) && d >= creacio,
        existia: d >= creacio
      };
    });

    var est = estadistiques_(h, regs, avui);
    return {
      habit: {
        id: h.id, nom: h.nom, tipus: h.tipus, objectiu: objectiu_(h),
        unitat: h.unitat || '', frequencia: h.frequencia,
        dies_setmana: h.dies_setmana || '', objectiu_setmanal: h.objectiu_setmanal || '',
        creat_el: creacio
      },
      estadistiques: est,
      calendari: calendari
    };
  }

  /**
   * Què ha passat entre dues dates. Per a la revisió setmanal.
   *
   * Els dies que NO tocaven no es compten al denominador: dir «3 de 7» d'un
   * hàbit de dilluns, dimecres i divendres seria acusar-lo de no fer-lo els
   * dies que no havia de fer-lo.
   */
  function resumPeriode(desde, fins) {
    var idx = indexRegistres_();
    var calendari = Utils.rangDates(desde, fins);
    var linies = [];

    definicions().forEach(function (h) {
      var regs = idx[h.id] || {};
      var creacio = dataCreacio_(h);

      if (esComptador_(h)) {
        var f = finestra_(h, regs, fins, calendari.length);
        if (!f.dies) return;
        linies.push(h.nom + ': ' + f.suma + (h.unitat ? ' ' + h.unitat : '') +
                    ' en ' + f.dies + (f.dies === 1 ? ' dia' : ' dies') +
                    ' · ' + (Math.round(f.mitjana * 10) / 10) + ' al dia');
        return;
      }

      var toquen = 0, fets = 0;
      calendari.forEach(function (d) {
        if (d < creacio || !exigit_(h, d)) return;
        toquen++;
        if (complert_(h, regs[d])) fets++;
      });
      if (!toquen) return;
      linies.push(h.nom + ': ' + fets + ' de ' + toquen + (toquen === 1 ? ' dia' : ' dies'));
    });

    return linies.length ? { titol: 'Hàbits', linies: linies } : null;
  }

  function resumTots() {
    var avui = Utils.avui();
    var idx = indexRegistres_();
    return definicions().map(function (h) {
      var est = estadistiques_(h, idx[h.id] || {}, avui);
      return { id: h.id, nom: h.nom, ratxa: est.ratxa, unitatRatxa: est.unitatRatxa,
               ratxaMax: est.ratxaMax, pct30: est.pct30, pct7: est.pct7 };
    });
  }

  // ---------------------------------------------------------------- edició

  function valida_(p, esNou) {
    var nom = String(p.nom || '').trim();
    if (esNou && !nom) throw new Error('L\'hàbit necessita un nom.');

    var tipus = p.tipus || 'si_no';
    if (['si_no', 'quantitat', 'comptador'].indexOf(tipus) === -1) {
      throw new Error('Tipus desconegut: ' + tipus);
    }

    /* Un comptador no té ni objectiu ni dies: es compta cada dia i prou.
       S'imposa aquí i no al formulari perquè també hi arriba des de la
       conversa i des d'una importació. */
    if (tipus === 'comptador') {
      p.tipus = 'comptador';
      p.nom = nom;
      p.frequencia = 'diaria';
      p.dies_setmana = '';
      p.objectiu_setmanal = '';
      p.objectiu = 0;
      p.unitat = String(p.unitat || '').trim();
      return p;
    }

    var freq = p.frequencia || 'diaria';
    if (['diaria', 'dies_setmana', 'x_per_setmana'].indexOf(freq) === -1) {
      throw new Error('Freqüència desconeguda: ' + freq);
    }

    if (freq === 'dies_setmana') {
      var dies = String(p.dies_setmana || '').split(',')
        .map(function (s) { return s.trim(); })
        .filter(function (s) { return /^[1-7]$/.test(s); });
      if (!dies.length) throw new Error('Tria almenys un dia de la setmana.');
      p.dies_setmana = dies.join(',');
    } else {
      p.dies_setmana = '';
    }

    if (freq === 'x_per_setmana') {
      var n = Number(p.objectiu_setmanal);
      if (!(n >= 1 && n <= 7)) throw new Error('Els cops per setmana han de ser entre 1 i 7.');
      p.objectiu_setmanal = n;
    } else {
      p.objectiu_setmanal = '';
    }

    p.nom = nom;
    p.tipus = tipus;
    p.frequencia = freq;
    p.objectiu = tipus === 'quantitat' ? Math.max(1, Number(p.objectiu) || 1) : 1;
    p.unitat = tipus === 'quantitat' ? String(p.unitat || '').trim() : '';
    return p;
  }

  function crea(p) {
    p = valida_(p, true);
    var ordre = definicions(true).length + 1;
    var nou = Dades.insereix('Habits', {
      nom: p.nom,
      tipus: p.tipus,
      objectiu: p.objectiu,
      unitat: p.unitat,
      frequencia: p.frequencia,
      dies_setmana: p.dies_setmana,
      objectiu_setmanal: p.objectiu_setmanal,
      actiu: 'SI',
      ordre: (p.ordre === undefined ? ordre : Number(p.ordre))
    }, 'hab');
    Log.info('habits.crea', 'Hàbit creat: ' + p.nom, { id: nou.id });
    return nou;
  }

  function edita(id, p) {
    var h = Dades.perId('Habits', id);
    if (!h) throw new Error('Aquest hàbit no existeix.');
    p = valida_(p, false);

    var canvis = {
      tipus: p.tipus, objectiu: p.objectiu, unitat: p.unitat,
      frequencia: p.frequencia, dies_setmana: p.dies_setmana,
      objectiu_setmanal: p.objectiu_setmanal
    };
    if (p.nom) canvis.nom = p.nom;
    if (p.ordre !== undefined) canvis.ordre = Number(p.ordre);

    Log.info('habits.edita', 'Hàbit modificat: ' + (p.nom || h.nom), { id: id });
    return Dades.actualitza('Habits', id, canvis);
  }

  /** Arxivar NO esborra res. L'històric es conserva sencer. */
  function arxiva(id) {
    var h = Dades.perId('Habits', id);
    if (!h) throw new Error('Aquest hàbit no existeix.');
    Log.info('habits.arxiva', 'Hàbit arxivat: ' + h.nom, { id: id });
    return Dades.actualitza('Habits', id, { actiu: 'NO', arxivat_el: Utils.ara() });
  }

  function reactiva(id) {
    return Dades.actualitza('Habits', id, { actiu: 'SI', arxivat_el: '' });
  }

  /**
   * L'ordre que decideix ell, no el de creació.
   *
   * Rep la llista sencera d'identificadors en l'ordre nou. Els que no hi
   * siguin —perquè s'ha arxivat un mentre ho movia— queden al final amb
   * l'ordre que tenien: no es perd cap hàbit per haver mogut els altres.
   */
  function ordena(ids) {
    if (!ids || !ids.length) throw new Error('No m\'has dit cap ordre.');

    var existents = {};
    definicions(true).forEach(function (h) { existents[h.id] = true; });
    var nets = ids.filter(function (id) { return existents[id]; });
    if (!nets.length) throw new Error('Cap d\'aquests hàbits existeix.');

    Dades.actualitzaMoltes('Habits', nets, function (h, i) { return { ordre: i + 1 }; });
    Log.info('habits.ordena', 'Ordre canviat', { quants: nets.length });
    return { ordenats: nets.length };
  }

  /**
   * Registra un hàbit buscant-lo pel nom. És el que executa una proposta
   * confirmada de la conversa; la IA no arriba mai aquí pel seu compte.
   */
  function registraPerNom(a) {
    var busca = String(a.nom_habit || '').toLowerCase().trim();
    if (!busca) throw new Error('No has dit quin hàbit.');

    var candidats = definicions().filter(function (h) {
      return String(h.nom).toLowerCase().indexOf(busca) !== -1;
    });
    if (!candidats.length) {
      throw new Error('No hi ha cap hàbit que es digui «' + a.nom_habit + '». Hàbits actius: ' +
        definicions().map(function (h) { return h.nom; }).join(', '));
    }
    if (candidats.length > 1) {
      throw new Error('«' + a.nom_habit + '» encaixa amb més d\'un hàbit: ' +
        candidats.map(function (h) { return h.nom; }).join(', ') + '. Sigues més concret.');
    }

    var h = candidats[0];
    var data = Utils.esDataValida(a.data) ? a.data : Utils.avui();

    var valor;
    if (a.quantitat !== undefined && a.quantitat !== null && isFinite(Number(a.quantitat))) {
      valor = Math.max(0, Number(a.quantitat));
    } else if (esComptador_(h)) {
      valor = null;                       // sense xifra, un comptador suma un
    } else {
      valor = (a.fet === false) ? 0 : objectiu_(h);
    }

    var d = marca(h.id, data, valor);
    var resultat = d.habits.filter(function (x) { return x.id === h.id; })[0] || {};

    if (esComptador_(h)) {
      return { habit: h.nom, data: data, ara: resultat.valor,
               mitjana7: resultat.mitjana7, unitat: h.unitat || '' };
    }
    return { fet: true, habit: h.nom, data: data, valor: resultat.valor, ratxa: resultat.ratxa };
  }

  /** Ve d'una proposta confirmada. Crear un hàbit parlant. */
  function creaPerNom(a) {
    var nou = crea({
      nom: a.nom,
      tipus: a.tipus || 'si_no',
      objectiu: a.objectiu,
      unitat: a.unitat,
      frequencia: 'diaria'
    });
    return {
      creat: true, nom: nou.nom, tipus: nou.tipus,
      com: nou.tipus === 'comptador' ? 'cada toc en suma un, sense objectiu ni ratxa'
         : nou.tipus === 'quantitat' ? 'cada toc en suma un fins a ' + nou.objectiu
         : 'un toc el marca fet'
    };
  }

  // ---------------------------------------------------------------- eina d'IA

  /**
   * Retorna SEMPRE el recompte de files, encara que sigui zero.
   * Un zero explícit és el que impedeix que el model s'inventi la resposta.
   */
  function consultaIA(args) {
    var avui = Utils.avui();
    var fins = Utils.esDataValida(args.fins) ? args.fins : avui;
    var desde = Utils.esDataValida(args.desde) ? args.desde : Utils.sumaDies(fins, -29);
    var idx = indexRegistres_();

    if (!args.nom_habit) {
      var resum = resumTots();
      return { files: resum.length, rang: desde + '/' + fins, habits: resum };
    }

    var busca = String(args.nom_habit).toLowerCase();
    var habits = definicions(true).filter(function (h) {
      return String(h.nom).toLowerCase().indexOf(busca) !== -1;
    });

    if (!habits.length) {
      return {
        files: 0,
        rang: desde + '/' + fins,
        missatge: 'No hi ha cap hàbit que es digui així. Hàbits existents: ' +
                  definicions(true).map(function (h) { return h.nom; }).join(', ')
      };
    }

    var h = habits[0];
    var regs = idx[h.id] || {};
    var dies = Utils.diesEntre(desde, fins) + 1;

    // Rang llarg: agregat per setmanes, mai centenars de files
    if (dies > 60) {
      var setmanes = perSetmana_(h, regs, desde, fins);
      var llista = Object.keys(setmanes).sort().map(function (s) {
        return { setmana: s, dies_complerts: setmanes[s] };
      });
      return {
        files: llista.length, agregat: 'per setmanes', habit: h.nom,
        rang: desde + '/' + fins,
        estadistiques: estadistiques_(h, regs, avui),
        setmanes: llista
      };
    }

    var registres = Utils.rangDates(desde, fins)
      .filter(function (d) { return regs[d] !== undefined; })
      .map(function (d) { return { data: d, valor: regs[d], complert: complert_(h, regs[d]) }; });

    return {
      files: registres.length,
      habit: h.nom,
      rang: desde + '/' + fins,
      objectiu: objectiu_(h) + (h.unitat ? ' ' + h.unitat : ''),
      estadistiques: estadistiques_(h, regs, avui),
      registres: registres
    };
  }

  return {
    definicions: definicions,
    dia: dia,
    mes: mes,
    marca: marca,
    historic: historic,
    resumTots: resumTots,
    resumPeriode: resumPeriode,
    crea: crea,
    edita: edita,
    registraPerNom: registraPerNom,
    creaPerNom: creaPerNom,
    arxiva: arxiva,
    reactiva: reactiva,
    ordena: ordena,
    consultaIA: consultaIA
  };
})();
