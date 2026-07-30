/**
 * Popu — NUCLI · Accés a dades
 *
 * Única porta d'entrada al full de càlcul. Cap mòdul obre fulls pel seu compte.
 *
 * Principis:
 *   - Cada fila és un objecte {columna: valor}. Ningú treballa amb índexs de fila.
 *   - Tot té `id` propi. Ordenar o inserir files no trenca cap referència.
 *   - Cap operació esborra files. `desa` fa upsert; els mòduls arxiven, no eliminen.
 *   - Memòria d'execució: cada full es llegeix un sol cop per execució.
 */

var Dades = (function () {

  var memo = {};   // nom del full -> {fulla, capcalera, files}

  // ---------- intern ----------

  function fulla_(nom) {
    var f = Config.full().getSheetByName(nom);
    if (!f) {
      throw new Error('No existeix el full «' + nom + '». Executa configuraPopu() per crear-lo.');
    }
    return f;
  }

  function carrega_(nom) {
    if (memo[nom]) return memo[nom];
    var f = fulla_(nom);
    var valors = f.getLastRow() > 0
      ? f.getRange(1, 1, f.getLastRow(), Math.max(1, f.getLastColumn())).getValues()
      : [[]];
    var capcalera = (valors[0] || []).map(function (c) { return String(c).trim(); });
    memo[nom] = { fulla: f, capcalera: capcalera, files: valors.slice(1) };
    return memo[nom];
  }

  function invalida(nom) {
    if (nom) delete memo[nom]; else memo = {};
  }

  function esBuida_(fila) {
    for (var i = 0; i < fila.length; i++) {
      if (fila[i] !== '' && fila[i] !== null) return false;
    }
    return true;
  }

  function aObjecte_(capcalera, fila) {
    var o = {};
    for (var i = 0; i < capcalera.length; i++) {
      if (capcalera[i]) o[capcalera[i]] = fila[i] === undefined ? '' : fila[i];
    }
    return o;
  }

  function aFila_(capcalera, obj) {
    var fila = [];
    for (var i = 0; i < capcalera.length; i++) {
      var v = obj[capcalera[i]];
      fila.push(v === undefined || v === null ? '' : v);
    }
    return fila;
  }

  /**
   * Filtre: pot ser
   *   - undefined            → tot
   *   - funció(objecte)      → predicat lliure
   *   - objecte {col: valor} → igualtat; si el valor és array, "és un d'aquests"
   */
  function compleix_(obj, filtre) {
    if (!filtre) return true;
    if (typeof filtre === 'function') return !!filtre(obj);
    for (var clau in filtre) {
      var esperat = filtre[clau];
      var real = obj[clau];
      if (Array.isArray(esperat)) {
        var trobat = false;
        for (var i = 0; i < esperat.length; i++) {
          if (String(real) === String(esperat[i])) { trobat = true; break; }
        }
        if (!trobat) return false;
      } else if (String(real) !== String(esperat)) {
        return false;
      }
    }
    return true;
  }

  // ---------- API pública ----------

  /** Llegeix files com a objectes. Cada objecte porta `_fila` (número de fila real). */
  function llegeix(nom, filtre) {
    var d = carrega_(nom);
    var out = [];
    for (var i = 0; i < d.files.length; i++) {
      if (esBuida_(d.files[i])) continue;
      var o = aObjecte_(d.capcalera, d.files[i]);
      o._fila = i + 2;
      if (compleix_(o, filtre)) out.push(o);
    }
    return out;
  }

  /** Primera coincidència, o null. */
  function un(nom, filtre) {
    var r = llegeix(nom, filtre);
    return r.length ? r[0] : null;
  }

  function perId(nom, id) {
    if (!id) return null;
    return un(nom, { id: id });
  }

  function compta(nom, filtre) {
    return llegeix(nom, filtre).length;
  }

  /**
   * Insereix una fila nova. Si l'objecte no porta `id` i el full té columna `id`,
   * se'n genera un amb el prefix indicat.
   */
  function insereix(nom, obj, prefixId) {
    var d = carrega_(nom);
    var nou = {};
    for (var k in obj) nou[k] = obj[k];

    if (d.capcalera.indexOf('id') !== -1 && !nou.id) {
      nou.id = Utils.nouId(prefixId || nom.toLowerCase().slice(0, 3));
    }
    if (d.capcalera.indexOf('creat_el') !== -1 && !nou.creat_el) {
      nou.creat_el = Utils.ara();
    }

    d.fulla.appendRow(aFila_(d.capcalera, nou));
    invalida(nom);
    return nou;
  }

  /** Actualitza per id. Retorna l'objecte resultant, o null si no existeix. */
  function actualitza(nom, id, canvis) {
    var d = carrega_(nom);
    var actual = perId(nom, id);
    if (!actual) return null;

    var fusionat = {};
    for (var k in actual) if (k !== '_fila') fusionat[k] = actual[k];
    for (var c in canvis) fusionat[c] = canvis[c];
    if (d.capcalera.indexOf('actualitzat_el') !== -1) fusionat.actualitzat_el = Utils.ara();

    d.fulla.getRange(actual._fila, 1, 1, d.capcalera.length)
           .setValues([aFila_(d.capcalera, fusionat)]);
    invalida(nom);
    return fusionat;
  }

  /**
   * Upsert per columnes clau. Si troba una fila que coincideix en TOTES
   * les columnes clau, l'actualitza; si no, insereix.
   * Exemple: Dades.desa('HabitsRegistre', reg, ['id_habit', 'data'])
   */
  function desa(nom, obj, claus, prefixId) {
    var d = carrega_(nom);
    if (!claus || !claus.length) return insereix(nom, obj, prefixId);

    var filtre = {};
    for (var i = 0; i < claus.length; i++) filtre[claus[i]] = obj[claus[i]];
    var existent = un(nom, filtre);

    if (!existent) return insereix(nom, obj, prefixId);

    var fusionat = {};
    for (var k in existent) if (k !== '_fila') fusionat[k] = existent[k];
    for (var c in obj) fusionat[c] = obj[c];
    if (d.capcalera.indexOf('actualitzat_el') !== -1) fusionat.actualitzat_el = Utils.ara();

    d.fulla.getRange(existent._fila, 1, 1, d.capcalera.length)
           .setValues([aFila_(d.capcalera, fusionat)]);
    invalida(nom);
    return fusionat;
  }

  /** Insereix moltes files de cop. Molt més ràpid que insereix() en bucle. */
  function insereixMoltes(nom, objectes, prefixId) {
    if (!objectes || !objectes.length) return [];
    var d = carrega_(nom);
    var files = [];
    var creats = [];

    for (var i = 0; i < objectes.length; i++) {
      var nou = {};
      for (var k in objectes[i]) nou[k] = objectes[i][k];
      if (d.capcalera.indexOf('id') !== -1 && !nou.id) {
        nou.id = Utils.nouId(prefixId || nom.toLowerCase().slice(0, 3));
      }
      if (d.capcalera.indexOf('creat_el') !== -1 && !nou.creat_el) nou.creat_el = Utils.ara();
      creats.push(nou);
      files.push(aFila_(d.capcalera, nou));
    }

    d.fulla.getRange(d.fulla.getLastRow() + 1, 1, files.length, d.capcalera.length)
           .setValues(files);
    invalida(nom);
    return creats;
  }

  function existeixFull(nom) {
    try { return !!Config.full().getSheetByName(nom); } catch (e) { return false; }
  }

  function capcalera(nom) {
    return carrega_(nom).capcalera.slice();
  }

  return {
    llegeix: llegeix,
    un: un,
    perId: perId,
    compta: compta,
    insereix: insereix,
    insereixMoltes: insereixMoltes,
    actualitza: actualitza,
    desa: desa,
    existeixFull: existeixFull,
    capcalera: capcalera,
    invalida: invalida
  };
})();

/**
 * Executa una funció amb bloqueig exclusiu. Evita que dues pestanyes obertes
 * o un trigger i tu alhora escriviu la mateixa fila.
 */
function ambBloqueig_(fn, segons) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock((segons || 30) * 1000)) {
    throw new Error('El sistema està ocupat processant una altra operació. Torna-ho a provar.');
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}
