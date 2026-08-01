/**
 * JEFE — NUCLI · Configuració
 *
 * Aquest fitxer no s'ha de tocar mai per afegir un mòdul.
 *
 * Res secret viu aquí. La clau de l'API i l'identificador del full de càlcul
 * viuen a Script Properties (Configuració del projecte → Propietats de l'script),
 * que no es comparteix ni es versiona.
 */

var VERSIO_JEFE = '1.0.0';
var NOM_FULL_CALCUL = 'JEFE — Assistent';

/** Claus de Script Properties. Mai al codi, mai a cap fitxer versionat. */
var PROP_ID_FULL = 'ID_FULL';
var PROP_CLAU_IA = 'CLAU_IA';
var PROP_CLAU_ACCES = 'CLAU_ACCES';
var PROP_FIREBASE   = 'FIREBASE_COMPTE';  // compte de servei: conte clau privada   // porta d'entrada des de fora d'Apps Script

/**
 * Valors per defecte del full `_Config`.
 * Es creen si no hi són; mai sobreescriuen el que ja hi hagi escrit.
 */
var CONFIG_DEFECTE = {
  versio_esquema: '1',
  zona_horaria: 'Europe/Madrid',

  // Capa d'IA — apagada fins que hi hagi clau a Script Properties
  ia_activa: 'NO',
  proveidor_ia: 'gemini',
  model_barat: 'gemini-2.5-flash',
  model_bo: 'gemini-2.5-flash',

  // Si es posa a NO, la capa d'IA deixa d'enviar text del diari.
  // Els resums perden profunditat però tot continua funcionant.
  ia_inclou_diari: 'SI',

  // Triggers
  hora_resum: '22',    // franja horària del resum nocturn (0-23)
  dia_revisio: '7',    // 1 = dilluns ... 7 = diumenge

  // Notificacions. Aquests dos SÓN públics: la configuració web de Firebase
  // està pensada per anar al codi del client. El compte de servei no.
  firebase_web: '',
  firebase_vapid: '',

  // Manteniment
  max_files_registre: '5000'
};

var Config = (function () {
  var memo = null;

  function props_() {
    return PropertiesService.getScriptProperties();
  }

  /** Identificador del full de càlcul. Null si encara no s'ha configurat. */
  function idFull() {
    return props_().getProperty(PROP_ID_FULL) || null;
  }

  function desaIdFull(id) {
    props_().setProperty(PROP_ID_FULL, id);
  }

  /** El full de càlcul. Llança error clar si encara no existeix. */
  function full() {
    var id = idFull();
    if (!id) {
      throw new Error(
        'JEFE no està configurat. Executa la funció configuraJefe() des de l\'editor d\'Apps Script.'
      );
    }
    return SpreadsheetApp.openById(id);
  }

  /** Llegeix tot el full `_Config` com a objecte clau→valor. Memoritzat per execució. */
  function tot() {
    if (memo) return memo;
    memo = {};
    try {
      var files = Dades.llegeix('_Config');
      for (var i = 0; i < files.length; i++) {
        if (files[i].clau) memo[String(files[i].clau)] = String(files[i].valor);
      }
    } catch (err) {
      // Durant la instal·lació el full encara pot no existir.
      memo = {};
    }
    return memo;
  }

  function get(clau, perDefecte) {
    var v = tot()[clau];
    if (v === undefined || v === '') {
      if (perDefecte !== undefined) return perDefecte;
      return CONFIG_DEFECTE[clau] !== undefined ? CONFIG_DEFECTE[clau] : null;
    }
    return v;
  }

  function getNum(clau, perDefecte) {
    var n = Number(get(clau, perDefecte));
    return isNaN(n) ? perDefecte : n;
  }

  function esSi(clau) {
    return String(get(clau)).toUpperCase() === 'SI';
  }

  function set(clau, valor) {
    Dades.desa('_Config', {
      clau: clau,
      valor: String(valor),
      actualitzat_el: Utils.ara()
    }, ['clau']);
    memo = null;
  }

  /** Escriu els valors per defecte que faltin. No toca mai els que ja hi són. */
  function inicialitza() {
    var actual = {};
    var files = Dades.llegeix('_Config');
    for (var i = 0; i < files.length; i++) actual[String(files[i].clau)] = true;

    var afegides = 0;
    for (var clau in CONFIG_DEFECTE) {
      if (!actual[clau]) {
        Dades.insereix('_Config', {
          clau: clau,
          valor: CONFIG_DEFECTE[clau],
          actualitzat_el: Utils.ara()
        });
        afegides++;
      }
    }
    memo = null;
    return afegides;
  }

  function zonaHoraria() {
    return get('zona_horaria', 'Europe/Madrid');
  }

  return {
    idFull: idFull,
    desaIdFull: desaIdFull,
    full: full,
    tot: tot,
    get: get,
    getNum: getNum,
    esSi: esSi,
    set: set,
    inicialitza: inicialitza,
    zonaHoraria: zonaHoraria
  };
})();
