/**
 * JEFE — NUCLI · Creuaments
 *
 * QUÈ ÉS
 *   En Pol apunta el pes, la cintura, la força, el trail, els cigarros, les
 *   calories, la proteïna, l'ànim, com dorm i què té al calendari. Cada cosa
 *   viu al seu apartat i ningú les ha mirat mai juntes. Coses com «les
 *   setmanes que dorms bé fumes menys» només les pot veure qui té les dues
 *   sèries, i les té.
 *
 * PER QUÈ ÉS UN FITXER DEL NUCLI
 *   Perquè cap mòdul pot saber què hi ha als altres sense conèixer-los, i el
 *   dia que un mòdul conegui un altre s'ha acabat poder-ne afegir un de nou
 *   escrivint un fitxer. Els mòduls declaren els seus números i prou; qui els
 *   creua és aquí.
 *
 * ────────────────────────────────────────────────────────────────────────
 * LA PART DIFÍCIL NO ÉS TROBAR RELACIONS. ÉS NO TROBAR-NE DE FALSES.
 * ────────────────────────────────────────────────────────────────────────
 *
 *   Amb vint sèries hi ha cent noranta parelles. Provant-les totes amb quinze
 *   setmanes de dades, unes quantes sortiran relacionades PER ATZAR: no és una
 *   possibilitat remota, és aritmètica. Una app que digui «he vist que les
 *   setmanes que llegeixes peses menys» quan això és soroll no és una app que
 *   s'equivoca de tant en tant: és una app en la qual no es pot creure res.
 *
 *   Per això aquí hi ha cinc regles, i totes són per callar:
 *
 *   1. VUIT SETMANES COM A MÍNIM amb les dues dades. Per sota, qualsevol
 *      dibuix es pot fer amb quatre punts i no vol dir res.
 *   2. SPEARMAN, no Pearson. Compara ordres i no valors: una setmana de
 *      vacances amb el triple de tot no s'endú la conclusió.
 *   3. CONTROL DE FALSOS DESCOBRIMENTS (Benjamini–Hochberg). No es mira cada
 *      parella pel seu compte: es mira el conjunt i es demana que, de tot el
 *      que es digui, com a molt un de cada deu sigui casualitat. És l'única
 *      regla que fa que provar-ne cent noranta no sigui fer trampa.
 *   4. RES DE LA MATEIXA FAMÍLIA. Que el pes i la cintura vagin junts no és
 *      cap descobriment.
 *   5. MAI ES DIU «PERQUÈ». Es diu «les setmanes que…, també…», es diu amb
 *      quantes setmanes s'ha vist, i s'acaba aquí. Dues coses que van juntes
 *      no diuen quina mou l'altra, ni si les mou una tercera.
 *
 *   I una de forma: el que NO ha passat el filtre també s'ensenya, amb les
 *   setmanes que li falten. És el que fa creïble el que sí que ha passat.
 *
 * QUAN ES CALCULA
 *   Un cop la setmana, i no quan obres la pantalla: llegir mig any de fulls
 *   són uns quants segons i això no els pot pagar ningú que estigui mirant.
 *   Ho demana el mòdul de Relacions quan veu que fa set dies del darrer, i el
 *   resultat es desa al full. La pantalla només llegeix.
 */

var CREU_SETMANES = 26;        // quant enrere es mira
var CREU_MINIM    = 8;         // setmanes amb totes dues dades per considerar-la
var CREU_Q        = 0.10;      // un de cada deu, com a molt, pot ser casualitat
var CREU_RHO      = 0.5;       // per sota d'això, encara que surti, no val la pena dir-ho

var Creuaments = (function () {

  var FULL = '_Relacions';

  // ------------------------------------------------------------- estadística

  /**
   * Els rangs d'una llista, amb les repeticions repartides.
   *
   * Sense repartir-les, tres setmanes de zero cigarros rebrien els rangs 1, 2
   * i 3 i s'inventaria un ordre que no existeix. Amb la mitjana, totes tres
   * reben 2 i el zero no diu res que no sàpiga.
   */
  function rangs_(v) {
    var idx = v.map(function (x, i) { return { x: x, i: i }; });
    idx.sort(function (a, b) { return a.x - b.x; });
    var r = new Array(v.length);
    var i = 0;
    while (i < idx.length) {
      var j = i;
      while (j + 1 < idx.length && idx[j + 1].x === idx[i].x) j++;
      var mitja = (i + j) / 2 + 1;
      for (var k = i; k <= j; k++) r[idx[k].i] = mitja;
      i = j + 1;
    }
    return r;
  }

  /** Spearman: el Pearson dels rangs. */
  function spearman_(a, b) {
    var ra = rangs_(a), rb = rangs_(b), n = a.length;
    var ma = 0, mb = 0, i;
    for (i = 0; i < n; i++) { ma += ra[i]; mb += rb[i]; }
    ma /= n; mb /= n;
    var num = 0, da = 0, db = 0;
    for (i = 0; i < n; i++) {
      var x = ra[i] - ma, y = rb[i] - mb;
      num += x * y; da += x * x; db += y * y;
    }
    if (!da || !db) return 0;                 // una de les dues és plana
    return num / Math.sqrt(da * db);
  }

  /* La beta incompleta, que és el que fa falta per posar-li un valor p a una
     t de Student. Apps Script no porta cap llibreria d'estadística i la
     resposta ha de ser un número, no una intuïció. És la fracció contínua de
     tota la vida; el que hi ha de meu són les proves. */
  function gammaln_(x) {
    var c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
             -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    var y = x, t = x + 5.5;
    t -= (x + 0.5) * Math.log(t);
    var s = 1.000000000190015;
    for (var j = 0; j < 6; j++) s += c[j] / ++y;
    return -t + Math.log(2.5066282746310005 * s / x);
  }

  function betacf_(a, b, x) {
    var MAX = 200, EPS = 3e-12, FPMIN = 1e-300;
    var qab = a + b, qap = a + 1, qam = a - 1;
    var c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    var h = d;
    for (var m = 1; m <= MAX; m++) {
      var m2 = 2 * m;
      var aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      var del = d * c; h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }

  function betai_(a, b, x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var bt = Math.exp(gammaln_(a + b) - gammaln_(a) - gammaln_(b) +
                      a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1) / (a + b + 2)) return bt * betacf_(a, b, x) / a;
    return 1 - bt * betacf_(b, a, 1 - x) / b;
  }

  /** Quina probabilitat hi ha de veure una relació així de forta per atzar. */
  function valorP_(rho, n) {
    if (n < 4) return 1;
    var r = Math.max(-0.999999, Math.min(0.999999, rho));
    var df = n - 2;
    var t = r * Math.sqrt(df / (1 - r * r));
    return betai_(df / 2, 0.5, df / (df + t * t));       // dues cues
  }

  /**
   * Benjamini–Hochberg. Ordena els valors p i troba fins on es pot arribar
   * mantenint que, del que es digui, com a molt una fracció `q` sigui
   * casualitat.
   *
   * L'alternativa era Bonferroni, que amb cent noranta parelles no deixaria
   * passar mai res i faria la pantalla inútil per sempre. Aquest deixa passar
   * el que val la pena assumint que un de cada deu pot fallar —i com que
   * cadascun surt amb les seves setmanes al costat, es pot jutjar.
   */
  function passenBH_(candidats, q) {
    var l = candidats.slice().sort(function (a, b) { return a.p - b.p; });
    var m = l.length, tall = -1;
    for (var i = 0; i < m; i++) if (l[i].p <= ((i + 1) / m) * q) tall = i;
    for (var j = 0; j < m; j++) l[j].passa = j <= tall;
    return l;
  }

  // ----------------------------------------------------- de dies a setmanes

  /** El dilluns de la setmana d'una data, que és com es diu una setmana aquí. */
  function setmanaDe_(data) { return Utils.dillunsDe(data); }

  /**
   * Passa una sèrie de dies a una de setmanes.
   *
   * UNA SETMANA AMB DOS DIES APUNTATS NO ÉS UNA SETMANA. Si els cigarros de
   * dilluns i dimarts fessin de setmana sencera, una setmana mal apuntada
   * semblaria una setmana bona i la relació sortiria del no-res.
   *
   * Quants dies calen depèn del que sigui la sèrie, i per això ho pot dir el
   * mòdul amb `minimDies`. Per defecte: cinc per a les que se sumen, un per a
   * les que es fan mitjana —una pesada a la setmana ÉS la dada d'aquella
   * setmana i demanar-ne cinc voldria dir no mirar mai el pes.
   */
  function perSetmanes_(serie) {
    var acum = {};
    for (var d in serie.dies) {
      if (!Object.prototype.hasOwnProperty.call(serie.dies, d)) continue;
      var v = Number(serie.dies[d]);
      if (!isFinite(v)) continue;
      var s = setmanaDe_(d);
      if (!s) continue;
      if (!acum[s]) acum[s] = { suma: 0, quants: 0 };
      acum[s].suma += v; acum[s].quants++;
    }
    var minim = serie.minimDies || (serie.agrega === 'suma' ? 5 : 1);
    var out = {};
    for (var k in acum) {
      if (!Object.prototype.hasOwnProperty.call(acum, k)) continue;
      if (acum[k].quants < minim) continue;
      out[k] = serie.agrega === 'suma' ? acum[k].suma : acum[k].suma / acum[k].quants;
    }
    return out;
  }

  // -------------------------------------------------------------- el càlcul

  function calcula(opcions) {
    opcions = opcions || {};
    var fins = opcions.fins || Utils.avui();
    /* Fins al diumenge passat: la setmana en curs està a mitges i entraria a
       la comparació com una setmana fluixa que no ho és. */
    var ultimDilluns = Utils.dillunsDe(fins);
    var finsSetmana = Utils.sumaDies(ultimDilluns, -1);
    var desde = Utils.sumaDies(ultimDilluns, -7 * (opcions.setmanes || CREU_SETMANES));

    var series = Moduls.seriesDiaries(desde, finsSetmana).map(function (s) {
      s.setmanes = perSetmanes_(s);
      return s;
    }).filter(function (s) { return Object.keys(s.setmanes).length >= CREU_MINIM; });

    var mirades = 0, provades = [], curtes = [];

    for (var i = 0; i < series.length; i++) {
      for (var j = i + 1; j < series.length; j++) {
        var a = series[i], b = series[j];
        if (a.familia === b.familia) continue;           // regla 4

        var claus = [], k;
        for (k in a.setmanes) {
          if (Object.prototype.hasOwnProperty.call(a.setmanes, k) &&
              Object.prototype.hasOwnProperty.call(b.setmanes, k)) claus.push(k);
        }
        mirades++;
        if (claus.length < CREU_MINIM) {                  // regla 1
          curtes.push({ a: a.nom, b: b.nom, setmanes: claus.length });
          continue;
        }
        var va = claus.map(function (x) { return a.setmanes[x]; });
        var vb = claus.map(function (x) { return b.setmanes[x]; });
        var rho = spearman_(va, vb);                      // regla 2
        provades.push({
          idA: a.id, idB: b.id, a: a.nom, b: b.nom,
          modulA: a.modul, modulB: b.modul,
          n: claus.length, rho: rho, p: valorP_(rho, claus.length)
        });
      }
    }

    var jutjats = passenBH_(provades, CREU_Q);            // regla 3
    var bones = jutjats.filter(function (x) {
      return x.passa && Math.abs(x.rho) >= CREU_RHO;
    });

    bones.forEach(function (x) { x.frase = frase_(x); });

    var r = {
      calculatEl: Utils.ara(),
      desde: desde, fins: finsSetmana,
      series: series.length,
      parelles: mirades,
      provades: provades.length,
      /* Les que no s'han pogut ni provar, per ensenyar què està esperant
         dades. Les que van primer són les que menys en necessiten. */
      curtes: curtes.sort(function (x, y) { return y.setmanes - x.setmanes; }).slice(0, 8),
      trobades: bones.map(function (x) {
        return { a: x.a, b: x.b, idA: x.idA, idB: x.idB,
                 modulA: x.modulA, modulB: x.modulB,
                 n: x.n, rho: Math.round(x.rho * 100) / 100,
                 p: x.p, frase: x.frase };
      }).sort(function (x, y) { return Math.abs(y.rho) - Math.abs(x.rho); })
    };

    desa_(r);
    return r;
  }

  /**
   * Dir-ho en català i sense fer-ho passar per una causa.
   *
   * «Les setmanes que dorms més, fumes menys» no diu que dormir faci fumar
   * menys, i no ho ha de dir: pot ser al revés, o pot ser que les dues coses
   * passin quan tens una setmana tranquil·la. Qui ho sap ets tu; el que fa
   * l'app és ensenyar-t'ho.
   */
  function frase_(x) {
    var mateix = x.rho > 0;
    return 'Les setmanes de més ' + minuscula_(x.a) + ', ' +
           (mateix ? 'també de més ' : 'menys ') + minuscula_(x.b) + '.';
  }

  function minuscula_(t) {
    var s = String(t || '');
    /* Els noms propis d'hàbit els ha escrit ell —«Diari de camp»— i no s'han
       de tocar; el que es baixa és la majúscula de començament de frase que
       posa la interfície. Si la segona lletra ja és majúscula, no s'hi toca. */
    if (s.length > 1 && s[1] === s[1].toUpperCase() && s[1] !== s[1].toLowerCase()) return s;
    return s.charAt(0).toLowerCase() + s.slice(1);
  }

  // ------------------------------------------------------------ desar/llegir

  function desa_(r) {
    try {
      var vell = Dades.un(FULL, { id: 'ultim' });
      var fila = {
        calculat_el: r.calculatEl, desde: r.desde, fins: r.fins,
        series: r.series, parelles: r.parelles, provades: r.provades,
        resultat: Utils.json(r)
      };
      if (vell) Dades.actualitza(FULL, vell.id, fila);
      else Dades.insereix(FULL, Object.assign({ id: 'ultim' }, fila));
    } catch (err) {
      Log.error('creuaments', 'no he pogut desar: ' + err.message);
    }
  }

  function desat() {
    try {
      var f = Dades.un(FULL, { id: 'ultim' });
      if (!f || !f.resultat) return null;
      return Utils.desJson(f.resultat);
    } catch (e) { return null; }
  }

  /**
   * Refà els números si fa set dies o més del darrer cop. El torna a mirar cada
   * cop que passen els senyals, però només treballa un cop la setmana.
   */
  function potserRecalcula() {
    var d = desat();
    if (d && d.calculatEl) {
      var dies = Utils.diesEntre(String(d.calculatEl).slice(0, 10), Utils.avui());
      if (dies < 7) return d;
    }
    return calcula({});
  }

  return {
    calcula: calcula, desat: desat, potserRecalcula: potserRecalcula,
    // A la vista des de fora perquè es puguin provar amb números coneguts.
    spearman: spearman_, valorP: valorP_, passenBH: passenBH_,
    rangs: rangs_, perSetmanes: perSetmanes_, frase: frase_
  };
})();

/** Per executar-la a mà des de l'editor quan no vulguis esperar el diumenge. */
function calculaRelacions() {
  var r = Creuaments.calcula({});
  Logger.log(r.series + ' sèries · ' + r.provades + ' parelles provades · ' +
             r.trobades.length + ' relacions');
  r.trobades.forEach(function (t) {
    Logger.log('  ' + t.frase + '  (rho ' + t.rho + ', ' + t.n + ' setmanes)');
  });
  return r;
}
