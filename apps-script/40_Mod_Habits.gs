/**
 * Popu — MÒDUL · Hàbits
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
          { nom: 'tipus',             tipus: 'text', valors: ['si_no', 'quantitat'] },
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
      marca: function (p) { return Habits.marca(p.id, p.data, p.valor); },
      llista: function () { return Habits.definicions(); },
      historic: function (p) { return Habits.historic(p.id, p.dies || 30); },
      resum: function () { return Habits.resumTots(); },
      crea: function (p) { return Habits.crea(p); },
      edita: function (p) { return Habits.edita(p.id, p); },
      arxiva: function (p) { return Habits.arxiva(p.id); },
      reactiva: function (p) { return Habits.reactiva(p.id); }
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

    contextIA: function () {
      var d = Habits.dia(Utils.avui());
      if (!d.habits.length) return 'Hàbits: cap definit.';
      var linies = d.habits.map(function (h) {
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

  function objectiu_(h) {
    var o = Number(h.objectiu);
    return o > 0 ? o : 1;
  }

  /** Aquest dia toca fer aquest hàbit? */
  function exigit_(h, data) {
    if (h.frequencia === 'x_per_setmana') return true;   // s'avalua per setmanes
    if (h.frequencia === 'dies_setmana') {
      var dies = String(h.dies_setmana || '').split(',').map(function (s) { return s.trim(); });
      return dies.indexOf(String(Utils.diaSetmana(data))) !== -1;
    }
    return true;   // diaria
  }

  function complert_(h, valor) {
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

  function estadistiques_(h, regs, avui) {
    regs = regs || {};
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
        objectiuSetmanal: est.objectiuSetmanal
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
        var eraComplert = actual && complert_(h, actual.valor);
        nou = eraComplert ? 0 : objectiu_(h);
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
    if (['si_no', 'quantitat'].indexOf(tipus) === -1) throw new Error('Tipus desconegut: ' + tipus);

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
    marca: marca,
    historic: historic,
    resumTots: resumTots,
    crea: crea,
    edita: edita,
    arxiva: arxiva,
    reactiva: reactiva,
    consultaIA: consultaIA
  };
})();
