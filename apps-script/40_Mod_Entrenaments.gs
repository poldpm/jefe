/**
 * 40_Mod_Entrenaments.gs — MÒDUL · Entrenaments
 *
 * EL FORAT QUE TAPA, dit amb les seves paraules: «canvia molt un entreno de 2 km
 * amb 0 de desnivell a un de 6 km amb 1000 de desnivell». El control setmanal
 * comptava sortides —tres, quatre— i tres sortides poden ser una setmana fluixa
 * o la setmana més dura de l'any. Amb un número que no distingeix això no s'hi
 * pot fer cap estudi: ni veure si el pes baixa quan la càrrega puja, ni saber si
 * una setmana d'energia baixa venia d'haver fet el doble de desnivell.
 *
 * PER QUÈ PER CAPTURA I NO PER API. Strava en té, d'API, i seria el camí bo:
 * cada sortida entraria sola. Però des del juny del 2026 demana subscripció de
 * pagament per poder crear-hi una aplicació («A Strava subscription is a
 * prerequisite for creating an app»), i aquí no es paga res. La captura de
 * pantalla no és el pla B d'un mandrós: és l'únic camí gratuït que existeix, i
 * resulta que encaixa amb el ritme que ja hi ha —una captura el divendres,
 * quan ja fas el control— millor que no pas anar apuntant cada sortida.
 *
 * EL QUE LLEGEIX LA CAPTURA NO S'ESCRIU MAI SOL. Torna una PROPOSTA que has de
 * confirmar. Una lectura d'imatge s'equivoca, i una xifra inventada dins d'una
 * sèrie és pitjor que un forat: el forat es veu.
 */

function MODUL_ENTRENAMENTS() {
  return {
    id: 'entrenaments',
    nom: 'Entrenaments',
    icona: 'entrenaments',
    ordre: 26,                 // just després del seguiment: és el que el mou
    versioEsquema: 1,

    fulls: [
      {
        /* UNA FILA PER SESSIÓ. Els quilòmetres d'esforç NO hi són: es calculen
           dels quilòmetres i el desnivell, i una dada derivada desada és una
           dada que un dia dirà una cosa diferent de la fórmula. */
        nom: 'Entrenaments',
        columnes: [
          { nom: 'id',              tipus: 'text' },
          { nom: 'data',            tipus: 'data' },
          { nom: 'mena',            tipus: 'text', valors: ['trail', 'forca', 'altre'] },
          { nom: 'titol',           tipus: 'text' },
          { nom: 'km',              tipus: 'num'  },
          { nom: 'desnivell',       tipus: 'num'  },
          { nom: 'minuts',          tipus: 'num'  },
          { nom: 'kcal',            tipus: 'num'  },
          { nom: 'pulsacions',      tipus: 'num'  },
          { nom: 'font',            tipus: 'text', valors: ['captura', 'ma', 'veu'] },
          { nom: 'notes',           tipus: 'text' },
          { nom: 'creat_el',        tipus: 'iso'  },
          { nom: 'actualitzat_el',  tipus: 'iso'  }
        ]
      },
      {
        /* ELS PASSOS VAN A PART I PER SETMANES, perquè així és com li arriben:
           l'app del rellotge en fa un informe setmanal. Guardar-los com si
           fossin diaris voldria dir repartir un total entre set dies, que és
           inventar-se sis xifres per tenir-ne una. */
        nom: 'EntrenamentsPassos',
        columnes: [
          { nom: 'id',              tipus: 'text' },
          { nom: 'dilluns',         tipus: 'data' },
          { nom: 'total',           tipus: 'num'  },
          { nom: 'mitjana',         tipus: 'num'  },
          { nom: 'font',            tipus: 'text', valors: ['captura', 'ma'] },
          { nom: 'creat_el',        tipus: 'iso'  },
          { nom: 'actualitzat_el',  tipus: 'iso'  }
        ]
      }
    ],

    accions: {
      pantalla:      function (p) { return Entrenaments.pantalla(p && p.desde); },
      desa:          function (p) { return Entrenaments.desaSessio(p); },
      esborra:       function (p) { return Entrenaments.esborraSessio(p.id); },
      desaPassos:    function (p) { return Entrenaments.desaPassos(p); },

      /* LLEGIR NO ÉS ESCRIURE. Torna el que ha entès i prou; qui escriu és
         `confirmaCaptura`, i entremig hi ha ell mirant-s'ho. */
      llegeixCaptura:  function (p) { return Entrenaments.llegeixCaptura(p); },
      confirmaCaptura: function (p) { return Entrenaments.confirmaCaptura(p); }
    },

    resumInici: function () {
      var s = Entrenaments.setmana(Utils.dillunsDe(Utils.avui()));
      if (!s.sessions) {
        return { etiqueta: 'Entrenaments', valor: 'cap aquesta setmana',
                 urgent: false, accio: 'entrenaments' };
      }
      return { etiqueta: 'Entrenaments', valor: Entrenaments.coma(s.kmEsforc, 0) + ' km-e',
               urgent: false, accio: 'entrenaments' };
    },

    resumPeriode:  function (desde, fins) { return Entrenaments.resumPeriode(desde, fins); },
    seriesDiaries: function (desde, fins) { return Entrenaments.seriesDiaries(desde, fins); },
    contextIA:     function () { return Entrenaments.contextIA(); },

    einesIA: [{
      nom: 'consulta_entrenaments',
      descripcio: 'Retorna els entrenaments fets, amb quilòmetres, desnivell, minuts i ' +
                  'quilòmetres d\'esforç (km + desnivell/100), del més recent al més antic. ' +
                  'Fes-la servir per a qualsevol pregunta sobre què ha entrenat: quant ha ' +
                  'corregut, quant desnivell porta, quina va ser la sortida més dura.',
      esquema: {
        type: 'object',
        properties: {
          quants: { type: 'integer', description: 'Quantes sessions, de la més recent. Per defecte 20.' }
        }
      },
      executa: function (args) { return Entrenaments.perALaIA(args && args.quants); }
    }, {
      /* PER SI UN DIA LA CAPTURA NO HI ÉS. No substitueix la captura —dir-ho
         tot de paraula cada sortida és el que no farà—, però una sortida solta
         que no ha quedat registrada enlloc es diu en cinc segons. */
      nom: 'apunta_entrenament',
      descripcio: 'Apunta un entrenament: «he fet 6 quilòmetres i mil de desnivell en una ' +
                  'hora i vint», «avui he fet força, quaranta minuts». La mena és `trail` si ' +
                  'hi ha quilòmetres o desnivell, `forca` si parla de pesos o de gimnàs.\n' +
                  'NO s\'executa directament: genera una proposta que en Pol ha de confirmar.',
      escriu: true,
      esquema: {
        type: 'object',
        properties: {
          mena:       { type: 'string', description: 'trail, forca o altre' },
          titol:      { type: 'string', description: 'Com en diu ell, si en diu res' },
          km:         { type: 'number', description: 'Quilòmetres, amb decimals' },
          desnivell:  { type: 'number', description: 'Metres de desnivell positiu' },
          minuts:     { type: 'number', description: 'Durada en minuts' },
          pulsacions: { type: 'number', description: 'Pulsacions mitjanes, si les diu' },
          data:       { type: 'string', description: 'Dia AAAA-MM-DD. Si s\'omet, avui.' }
        }
      },
      etiqueta: function (a) {
        return 'Entrenament ' + (a.data ? 'del ' + a.data : 'd\'avui') + ': ' +
               Entrenaments.enUnaLinia({
                 mena: a.mena || 'trail', titol: a.titol || '',
                 km: a.km, desnivell: a.desnivell, minuts: a.minuts
               });
      },
      executa: function (a) { return Entrenaments.apuntaPerNom(a); }
    }],

    vista: 'vista_entrenaments'
  };
}


var Entrenaments = (function () {

  /* ══════════════════════════════════════════════════════════════════════
     ELS QUILÒMETRES D'ESFORÇ
     ══════════════════════════════════════════════════════════════════════

     km-esforç = km + desnivell / 100

     Cent metres de pujada costen aproximadament el mateix que un quilòmetre en
     pla. No me l'he inventat: és el conveni que fa servir tothom al trail per
     poder comparar curses que no s'assemblen, i és el que converteix la queixa
     d'en Pol en una xifra. Els seus dos exemples:

       2 km amb 0 de desnivell   →   2 + 0     =  2 km-esforç
       6 km amb 1000 de desnivell →  6 + 10    = 16 km-esforç

     Vuit vegades més. Amb «sortides: 2» les dues setmanes eren iguals.

     PER QUÈ AQUESTA I NO UNA DE MILLOR. N'hi ha de més fines —les que fan
     servir les pulsacions, o el ritme ajustat pel pendent—, però totes demanen
     dades que una captura de pantalla no sempre porta. Aquesta només necessita
     dues xifres que hi són sempre, i s'entén sense explicar-la. Una mesura que
     tens tots els dies val més que una de perfecta que tens la meitat dels
     dies. */
  var LLINDAR = {
    llarga: 12,          // km-esforç: a partir d'aquí és «de les que buiden»
    setmanaDura: 60      // km-esforç en set dies: a partir d'aquí la setmana pesa
  };

  function num_(v, sino) {
    if (v === null || v === undefined || v === '') return sino === undefined ? null : sino;
    var n = parseFloat(String(v).replace(',', '.'));
    return isFinite(n) ? n : (sino === undefined ? null : sino);
  }

  function coma(n, dec) {
    if (n === null || n === undefined) return '—';
    var v = Number(n);
    return (dec === undefined ? String(v) : v.toFixed(dec)).replace('.', ',');
  }

  /** km-esforç d'una sessió. Sense quilòmetres ni desnivell, no n'hi ha. */
  function kmEsforc(s) {
    var km = num_(s.km, 0), des = num_(s.desnivell, 0);
    if (!km && !des) return null;
    return Math.round((km + des / 100) * 10) / 10;
  }

  function sessions() {
    /* TREURE UNA SESSIÓ ÉS DEIXAR-LA SENSE DIA, no esborrar-ne la fila: aquí
       no s'esborra res mai. Però una fila sense dia no és de cap setmana, i
       deixar-la passar feia petar les sèries —`dillunsDe('')` no és cap
       dilluns—. S'ha de filtrar aquí i no a cada lloc que en faci servir. */
    var files = Dades.llegeix('Entrenaments').filter(function (f) {
      return /^\d{4}-\d{2}-\d{2}$/.test(String(f.data));
    });
    files.sort(function (a, b) {
      var da = String(a.data), db = String(b.data);
      return da === db ? 0 : (da < db ? -1 : 1);
    });
    return files.map(function (f) {
      var s = {
        id: f.id,
        data: String(f.data),
        mena: String(f.mena || 'altre'),
        titol: String(f.titol || ''),
        km: num_(f.km),
        desnivell: num_(f.desnivell),
        minuts: num_(f.minuts),
        kcal: num_(f.kcal),
        pulsacions: num_(f.pulsacions),
        font: String(f.font || 'ma'),
        notes: String(f.notes || '')
      };
      s.kmEsforc = kmEsforc(s);
      s.llarga = s.kmEsforc !== null && s.kmEsforc >= LLINDAR.llarga;
      return s;
    });
  }

  function passos() {
    var m = {};
    Dades.llegeix('EntrenamentsPassos').forEach(function (f) {
      var d = String(f.dilluns);
      if (!d) return;
      m[d] = { dilluns: d, total: num_(f.total), mitjana: num_(f.mitjana),
               font: String(f.font || 'ma'), id: f.id };
    });
    return m;
  }

  // ------------------------------------------------------------- LA SETMANA
  /**
   * El que ha fet en set dies, resumit.
   *
   * ÉS LA UNITAT DE TOT AIXÒ i no és casualitat: el control del cos és
   * setmanal, la fase demana sessions per setmana i l'informe del rellotge ve
   * per setmanes. Una sessió sola no es compara amb res; set dies sí.
   */
  function setmana(dilluns, totes) {
    var h = totes || sessions();
    var fins = Utils.sumaDies(dilluns, 6);
    var dins = h.filter(function (s) { return s.data >= dilluns && s.data <= fins; });

    var r = {
      dilluns: dilluns, fins: fins,
      sessions: dins.length, trail: 0, forca: 0, altres: 0,
      km: 0, desnivell: 0, minuts: 0, kmEsforc: 0,
      llargues: 0, mesLlarga: null, llista: dins
    };

    dins.forEach(function (s) {
      if (s.mena === 'trail') r.trail++;
      else if (s.mena === 'forca') r.forca++;
      else r.altres++;
      r.km += num_(s.km, 0);
      r.desnivell += num_(s.desnivell, 0);
      r.minuts += num_(s.minuts, 0);
      if (s.kmEsforc !== null) r.kmEsforc += s.kmEsforc;
      if (s.llarga) r.llargues++;
      if (s.kmEsforc !== null && (!r.mesLlarga || s.kmEsforc > r.mesLlarga.kmEsforc)) {
        r.mesLlarga = s;
      }
    });

    r.km = Math.round(r.km * 10) / 10;
    r.kmEsforc = Math.round(r.kmEsforc * 10) / 10;
    r.dura = r.kmEsforc >= LLINDAR.setmanaDura;
    return r;
  }

  /** Les setmanes que tenen alguna sessió, de la més recent a la més antiga. */
  function setmanes(quantes) {
    var h = sessions();
    var vistes = {};
    h.forEach(function (s) { vistes[Utils.dillunsDe(s.data)] = true; });
    var claus = Object.keys(vistes).sort().reverse();
    if (quantes) claus = claus.slice(0, quantes);
    var p = passos();
    return claus.map(function (dl) {
      var r = setmana(dl, h);
      r.passos = p[dl] || null;
      return r;
    });
  }

  // ------------------------------------------------------------- LA PANTALLA
  function pantalla(desde) {
    var dl = Utils.esDataValida(desde) ? Utils.dillunsDe(desde)
                                       : Utils.dillunsDe(Utils.avui());
    var h = sessions();
    var p = passos();

    /* Dotze setmanes de gràfica: tres mesos és on es comença a veure si la
       càrrega puja o si fa un any que vas igual. */
    var corba = [];
    var cur = dl;
    for (var i = 0; i < 12; i++) {
      var s = setmana(cur, h);
      corba.unshift({ dilluns: cur, kmEsforc: s.kmEsforc, sessions: s.sessions,
                      desnivell: s.desnivell, passos: p[cur] ? p[cur].total : null });
      cur = Utils.sumaDies(cur, -7);
    }

    var ara = setmana(dl, h);
    ara.passos = p[dl] || null;

    return {
      avui: Utils.avui(),
      dilluns: dl,
      setmana: ara,
      corba: corba,
      total: h.length,
      llindars: LLINDAR
    };
  }

  // -------------------------------------------------------------- ESCRIPTURA
  function validaSessio_(p) {
    if (!p || !p.data) throw new Error('Cal el dia de l\'entrenament.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.data)) throw new Error('La data ha de ser AAAA-MM-DD.');

    var km = num_(p.km), des = num_(p.desnivell), min = num_(p.minuts);
    if (km !== null && (km < 0 || km > 300)) throw new Error('Uns ' + p.km + ' km no poden ser.');
    if (des !== null && (des < 0 || des > 12000)) throw new Error('Uns ' + p.desnivell + ' m de desnivell no poden ser.');
    if (min !== null && (min < 0 || min > 1440)) throw new Error('Uns ' + p.minuts + ' minuts no poden ser.');

    var mena = String(p.mena || '').toLowerCase();
    if (['trail', 'forca', 'altre'].indexOf(mena) === -1) mena = km || des ? 'trail' : 'altre';

    return {
      data: p.data, mena: mena, titol: String(p.titol || '').trim(),
      km: km, desnivell: des, minuts: min,
      kcal: num_(p.kcal), pulsacions: num_(p.pulsacions),
      font: ['captura', 'ma', 'veu'].indexOf(p.font) === -1 ? 'ma' : p.font,
      notes: String(p.notes || '').trim()
    };
  }

  function desaSessio(p) {
    var fila = validaSessio_(p);
    var r;
    if (p.id) {
      Dades.actualitza('Entrenaments', p.id, fila);
      r = { id: p.id };
    } else {
      /* PER DIA I TÍTOL. Tornar a llegir la mateixa captura és el cas normal
         —te'n vas a mirar si ho ha entès bé i la tornes a passar— i ha de
         corregir el que hi havia, no fer-ne una parella. Dues sessions el
         mateix dia amb títols diferents són dues sessions i es queden dues. */
      r = Dades.desa('Entrenaments', fila, ['data', 'titol'], 'ent');
    }
    Log.info('entrenaments.desa', 'Sessió desada', { data: fila.data, mena: fila.mena });
    return { desat: true, id: r && r.id ? r.id : p.id, data: fila.data };
  }

  function esborraSessio(id) {
    if (!id) throw new Error('Cal saber quina sessió.');
    var f = Dades.perId('Entrenaments', id);
    if (!f) throw new Error('Aquesta sessió ja no hi és.');
    Dades.actualitza('Entrenaments', id, { data: '', titol: '(esborrada) ' + String(f.titol || '') });
    Log.info('entrenaments.esborra', 'Sessió treta', { id: id });
    return { tret: true };
  }

  function desaPassos(p) {
    if (!p || !p.dilluns) throw new Error('Cal saber de quina setmana.');
    var dl = Utils.dillunsDe(p.dilluns);
    var total = num_(p.total), mitjana = num_(p.mitjana);
    if (total === null && mitjana === null) throw new Error('No m\'has dit cap xifra de passos.');

    /* Amb una de les dues n'hi ha prou: l'altra surt sola. L'informe del
       rellotge de vegades dona el total i de vegades la mitjana, i demanar-li
       les dues seria demanar-li que fes una divisió. */
    if (total === null) total = Math.round(mitjana * 7);
    if (mitjana === null) mitjana = Math.round(total / 7);
    if (total < 0 || total > 700000) throw new Error('Uns ' + p.total + ' passos no poden ser.');

    var r = Dades.desa('EntrenamentsPassos',
      { dilluns: dl, total: total, mitjana: mitjana,
        font: p.font === 'captura' ? 'captura' : 'ma' }, ['dilluns'], 'pas');
    Log.info('entrenaments.passos', 'Passos desats', { dilluns: dl, total: total });
    return { desat: true, dilluns: dl, total: total, mitjana: mitjana, id: r && r.id ? r.id : null };
  }

  function apuntaPerNom(a) {
    a = a || {};
    var data = Utils.esDataValida(a.data) ? a.data : Utils.avui();
    var r = desaSessio({
      data: data, mena: a.mena, titol: a.titol,
      km: a.km, desnivell: a.desnivell, minuts: a.minuts,
      pulsacions: a.pulsacions, font: 'veu'
    });
    var s = setmana(Utils.dillunsDe(data));
    return { desat: true, data: data, id: r.id,
             setmana: { sessions: s.sessions, kmEsforc: s.kmEsforc } };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LA CAPTURA
  // ═══════════════════════════════════════════════════════════════════════
  /**
   * Llegir una captura de pantalla i dir QUÈ HI HA VIST. No escriu res.
   *
   * PER QUÈ NO ESCRIU. Perquè una lectura d'imatge s'equivoca, i s'equivoca en
   * silenci: no et diu que ha llegit 100 on posava 1000, t'ho posa i ja està.
   * Una xifra inventada dins d'una sèrie és pitjor que un forat —el forat es
   * veu, i la xifra falsa se la creuen les regles i les gràfiques—. Per això
   * torna una llista i qui la desa és ell, mirant-se-la.
   *
   * QUÈ SE LI DIU I PER QUÈ. La data és el problema de debò d'aquestes
   * pantalles: hi posa «dv.» o «Ahir», mai l'any. Se li dona el dia d'avui i el
   * dilluns de la setmana que s'està important perquè les pugui resoldre, i se
   * li demana explícitament que deixi la data en blanc si no la sap en comptes
   * d'endevinar-la —una sessió al dia que no toca embruta dues setmanes.
   */
  /**
   * «HE MIRAT LA IMATGE I NO HI HA RES» NO ÉS UNA AVARIA.
   *
   * És l'únic final d'aquesta funció que vol dir que tot el camí ha anat bé
   * —la clau, el model, la imatge, el JSON— i que senzillament la captura no
   * portava el que buscàvem. Qui ho reculli ho ha de poder distingir d'un
   * error de debò, i distingir-ho pel TEXT del missatge no serveix: la
   * comprovació d'instal·lació buscava «no he sabut veure» i el missatge diu
   * «no HI he sabut veure», o sigui que donava per fallat el cas bo. Amb una
   * marca a l'error, canviar la redacció no trenca res.
   */
  function buida_(text) {
    var e = new Error(text);
    e.buida = true;
    return e;
  }

  function llegeixCaptura(p) {
    if (!p || !p.contingut) throw new Error('No hi ha cap imatge.');
    if (!IA.disponible()) throw new Error(IA.motiu() || 'La capa d\'IA no està disponible.');

    var mena = ['trail', 'forca', 'passos'].indexOf(p.mena) === -1 ? 'trail' : p.mena;
    var dl = Utils.esDataValida(p.dilluns) ? Utils.dillunsDe(p.dilluns)
                                           : Utils.dillunsDe(Utils.avui());

    var trossos = String(p.contingut).split(',');
    var dades = trossos.length > 1 ? trossos[1] : trossos[0];
    var tipus = (String(p.contingut).match(/^data:([^;]+);/) || [])[1] || 'image/jpeg';

    var context =
      'Avui és ' + Utils.avui() + '. La setmana que s\'està important va del ' +
      dl + ' (dilluns) al ' + Utils.sumaDies(dl, 6) + ' (diumenge).\n';

    var demana = mena === 'passos'
      ? context +
        'Aquesta captura és l\'informe setmanal de passos del rellotge. Torna NOMÉS JSON:\n' +
        '{"passos": {"total": <passos de tota la setmana o null>, ' +
        '"mitjana": <mitjana diària o null>}, "avis": "<què no has pogut llegir, o cadena buida>"}\n' +
        'Si a la pantalla només hi ha una de les dues xifres, posa l\'altra a null: no la ' +
        'calculis tu. Els punts i els espais de milers no compten: 71.482 són 71482.'
      : context +
        'Aquesta captura és una llista d\'entrenaments (Strava o una app de força). Torna ' +
        'NOMÉS JSON amb TOTES les sessions que hi vegis:\n' +
        '{"sessions": [{"data": "AAAA-MM-DD o null", "mena": "trail|forca|altre", ' +
        '"titol": "<com es diu la sessió>", "km": <número o null>, ' +
        '"desnivell": <metres de desnivell positiu o null>, "minuts": <durada en minuts o null>, ' +
        '"pulsacions": <mitjana o null>}], "avis": "<què no has pogut llegir, o cadena buida>"}\n' +
        'REGLES:\n' +
        '- La data: si hi surt el dia del mes, fes-la servir. Si només hi ha el dia de la ' +
        'setmana («dv.», «dissabte») o «Ahir»/«Avui», resol-la DINS de la setmana que ' +
        's\'importa. Si no la pots saber, posa null. No l\'endevinis.\n' +
        '- La durada sempre en minuts: «1 h 22 min» són 82.\n' +
        '- Els quilòmetres amb decimals i coma o punt indistintament: «6,24 km» és 6.24.\n' +
        '- El desnivell és el POSITIU (guany d\'elevació), no el negatiu ni l\'altitud.\n' +
        '- `mena`: `trail` si hi ha quilòmetres o desnivell (córrer, caminar, muntanya), ' +
        '`forca` si són pesos, gimnàs o musculació, `altre` per a la resta.\n' +
        '- Un camp que no surt a la pantalla va a null. NO ET DEIXIS CAP SESSIÓ i no ' +
        'n\'afegeixis cap que no hi sigui.';

    var r = IA.genera({
      sistema: 'Ets un lector de captures de pantalla. Transcrius el que hi ha escrit i res ' +
               'més: no interpretes, no completes i no estimes. Un número que no es llegeix ' +
               'bé va a null i es diu a `avis`. Respons només amb JSON vàlid.',
      missatges: [{ role: 'user', parts: [
        { text: demana },
        { inlineData: { mimeType: tipus, data: dades } }
      ] }],
      model: 'bo',
      maxTokens: 1600,
      temperatura: 0,
      json: true
    });

    var llegit = Utils.desJson(String(r && r.text || ''), null);
    if (!llegit) throw new Error('No he pogut entendre el que ha tornat de la captura. Torna-ho a provar.');

    if (mena === 'passos') {
      var pas = llegit.passos || {};
      if (num_(pas.total) === null && num_(pas.mitjana) === null) {
        throw buida_('No hi he sabut veure cap xifra de passos. Prova amb una captura on ' +
                     'surti el total de la setmana o la mitjana diària.');
      }
      return { mena: 'passos', dilluns: dl,
               passos: { total: num_(pas.total), mitjana: num_(pas.mitjana) },
               avis: String(llegit.avis || '') };
    }

    var brutes = llegit.sessions || [];
    if (!brutes.length) throw buida_('No hi he sabut veure cap entrenament.');

    /* Es netegen aquí i no al navegador: si un dia hi ha una altra pantalla que
       importi captures, la neteja ha de ser la mateixa. */
    var propostes = brutes.map(function (s) {
      var data = Utils.esDataValida(s.data) ? s.data : null;
      /* Una data fora de la setmana que s'importa és gairebé sempre un any mal
         llegit. No es llença: es marca, i ell decideix. */
      var forada = data && (data < dl || data > Utils.sumaDies(dl, 6));
      var neta = {
        data: data, mena: ['trail', 'forca', 'altre'].indexOf(s.mena) === -1 ? 'altre' : s.mena,
        titol: Utils.talla(String(s.titol || '').trim(), 80),
        km: num_(s.km), desnivell: num_(s.desnivell),
        minuts: num_(s.minuts), pulsacions: num_(s.pulsacions),
        font: 'captura'
      };
      neta.kmEsforc = kmEsforc(neta);
      neta.dubtosa = !data || forada;
      return neta;
    });

    Log.info('entrenaments.captura', 'Captura llegida',
             { mena: mena, sessions: propostes.length });
    return { mena: mena, dilluns: dl, sessions: propostes,
             avis: String(llegit.avis || '') };
  }

  /** El que ell ha confirmat de la proposta, i només això. */
  function confirmaCaptura(p) {
    var llista = (p && p.sessions) || [];
    if (!llista.length) throw new Error('No hi ha res per desar.');
    var fets = [];
    llista.forEach(function (s) {
      if (!s || !s.data) return;                       // sense dia no entra
      fets.push(desaSessio({
        data: s.data, mena: s.mena, titol: s.titol,
        km: s.km, desnivell: s.desnivell, minuts: s.minuts,
        pulsacions: s.pulsacions, font: 'captura'
      }).id);
    });
    if (!fets.length) throw new Error('Cap de les sessions tenia dia.');
    return { desats: fets.length };
  }

  // ------------------------------------------------------ CONTEXT I RESUMS
  function enUnaLinia(s) {
    var t = [];
    if (s.titol) t.push(s.titol);
    if (num_(s.km)) t.push(coma(num_(s.km), 1) + ' km');
    if (num_(s.desnivell)) t.push(Math.round(num_(s.desnivell)) + ' m D+');
    if (num_(s.minuts)) t.push(Math.round(num_(s.minuts)) + ' min');
    if (num_(s.pulsacions)) t.push(Math.round(num_(s.pulsacions)) + ' ppm');
    var e = kmEsforc(s);
    if (e !== null) t.push(coma(e, 1) + ' km-e');
    if (!t.length) t.push(s.mena === 'forca' ? 'sessió de força' : 'sense dades');
    return t.join(' · ');
  }

  function liniaSetmana(s) {
    if (!s.sessions) return 'cap entrenament';
    var t = [s.sessions + (s.sessions === 1 ? ' sessió' : ' sessions')];
    if (s.trail) t.push(s.trail + ' de trail');
    if (s.forca) t.push(s.forca + ' de força');
    if (s.km) t.push(coma(s.km, 1) + ' km');
    if (s.desnivell) t.push(Math.round(s.desnivell) + ' m D+');
    if (s.kmEsforc) t.push(coma(s.kmEsforc, 1) + ' km-esforç');
    if (s.llargues) t.push(s.llargues + (s.llargues === 1 ? ' de llarga' : ' de llargues'));
    return t.join(' · ');
  }

  function contextIA() {
    var h = sessions();
    if (!h.length) return 'Entrenaments: encara no n\'hi ha cap apuntat.';

    var dl = Utils.dillunsDe(Utils.avui());
    var ara = setmana(dl, h);
    var abans = setmana(Utils.sumaDies(dl, -7), h);
    var p = passos();

    var t = ['Entrenaments (km-esforç = km + desnivell/100):'];
    t.push('- Aquesta setmana: ' + liniaSetmana(ara));
    t.push('- La passada: ' + liniaSetmana(abans));
    if (ara.mesLlarga) t.push('- La més dura d\'aquesta setmana: ' + enUnaLinia(ara.mesLlarga));
    var pAra = p[dl] || p[Utils.sumaDies(dl, -7)];
    if (pAra) t.push('- Passos: ' + Math.round(pAra.mitjana) + ' de mitjana al dia (setmana del ' +
                     pAra.dilluns + ').');
    return t.join('\n');
  }

  function resumPeriode(desde, fins) {
    var h = sessions().filter(function (s) { return s.data >= desde && s.data <= fins; });
    if (!h.length) return null;
    var s = setmana(Utils.dillunsDe(desde), sessions());
    var linies = [liniaSetmana(s)];
    if (s.mesLlarga) linies.push('La més dura: ' + enUnaLinia(s.mesLlarga));
    var p = passos()[Utils.dillunsDe(desde)];
    if (p) linies.push(Math.round(p.mitjana) + ' passos de mitjana al dia');
    return { titol: 'Entrenaments', linies: linies };
  }

  /**
   * El que d'aquí es pot creuar amb la resta.
   *
   * ELS DIES SENSE SESSIÓ SÓN ZEROS, PERÒ NOMÉS DINS D'UNA SETMANA IMPORTADA.
   * Un dimarts sense sortida d'una setmana que hi és sencera és un dia de
   * descans de debò, i val zero. Un dimarts d'una setmana que no has importat
   * mai no és un zero: és que no se sap. Barrejar les dues coses faria baixar
   * totes les mitjanes cada vegada que et saltessis una captura.
   */
  function seriesDiaries(desde, fins) {
    var h = sessions();
    if (!h.length) return [];

    var ambDades = {};
    h.forEach(function (s) { ambDades[Utils.dillunsDe(s.data)] = true; });

    var esforc = {}, des = {}, km = {}, min = {};
    Utils.rangDates(desde, fins).forEach(function (d) {
      if (!ambDades[Utils.dillunsDe(d)]) return;      // setmana no importada: no és zero
      esforc[d] = 0; des[d] = 0; km[d] = 0; min[d] = 0;
    });
    h.forEach(function (s) {
      if (esforc[s.data] === undefined) return;
      esforc[s.data] += s.kmEsforc || 0;
      des[s.data] += num_(s.desnivell, 0);
      km[s.data] += num_(s.km, 0);
      min[s.data] += num_(s.minuts, 0);
    });

    var pas = {};
    var p = passos();
    Object.keys(p).forEach(function (dl) {
      if (dl < desde || dl > fins) return;
      if (p[dl].mitjana !== null) pas[dl] = Math.round(p[dl].mitjana);
    });

    var fes = function (id, nom, unitat, dies, familia, minim) {
      if (Object.keys(dies).length < (minim || 14)) return null;
      return { id: id, nom: nom, unitat: unitat, agrega: 'suma',
               familia: familia, minimDies: 3, millorAmunt: null, dies: dies };
    };

    var l = [
      fes('esforc', 'càrrega', 'km-esforç', esforc, 'entrenament'),
      fes('desnivell', 'desnivell', 'm al dia', des, 'entrenament'),
      fes('km', 'quilòmetres', 'km al dia', km, 'entrenament'),
      fes('minuts', 'minuts entrenats', 'min al dia', min, 'entrenament')
    ];

    /* Els passos van per setmanes, i per això minimDies 1 i mitjana: la xifra
       d'una setmana ÉS la d'aquella setmana, com el pes del control. */
    if (Object.keys(pas).length >= 8) {
      l.push({ id: 'passos', nom: 'passos', unitat: 'al dia', agrega: 'mitjana',
               familia: 'passos', minimDies: 1, millorAmunt: true, dies: pas });
    }
    return l.filter(Boolean);
  }

  function perALaIA(quants) {
    var h = sessions();
    var n = Math.max(1, Math.min(100, Number(quants) || 20));
    return {
      total: h.length,
      formula: 'km-esforç = km + desnivell/100',
      sessions: h.slice(Math.max(0, h.length - n)).reverse().map(function (s) {
        return { data: s.data, mena: s.mena, titol: s.titol, km: s.km,
                 desnivell: s.desnivell, minuts: s.minuts, kmEsforc: s.kmEsforc,
                 llarga: s.llarga };
      })
    };
  }

  return {
    pantalla: pantalla,
    sessions: sessions,
    setmana: setmana,
    setmanes: setmanes,
    passos: passos,
    desaSessio: desaSessio,
    esborraSessio: esborraSessio,
    desaPassos: desaPassos,
    apuntaPerNom: apuntaPerNom,
    llegeixCaptura: llegeixCaptura,
    confirmaCaptura: confirmaCaptura,
    contextIA: contextIA,
    resumPeriode: resumPeriode,
    seriesDiaries: seriesDiaries,
    perALaIA: perALaIA,
    enUnaLinia: enUnaLinia,
    liniaSetmana: liniaSetmana,
    kmEsforc: kmEsforc,
    coma: coma,
    LLINDAR: LLINDAR
  };
})();
