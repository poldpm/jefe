/**
 * JEFE — NUCLI · Encaminament
 *
 * Una sola porta d'entrada des del client:
 *     google.script.run.api('habits', 'marca', {id: '...', data: '...'})
 *
 * El nucli busca el mòdul, comprova que l'acció existeixi i la crida.
 * Un mòdul nou no ha de tocar res d'aquí: registrar l'acció al seu descriptor
 * ja el fa accessible.
 */

/** Punt d'entrada de la web app. */
function doGet(e) {
  try {
    /* TORNADES DE FORA.
       Alguns serveis externs —un banc obert per PSD2, per exemple— tornen a
       aquesta mateixa adreça amb paràmetres a la URL en comptes de cridar
       l'API. El nucli no sap res de cap servei concret: només pregunta si
       algun mòdul reclama aquesta tornada i li dona el control. Sense això,
       qualsevol integració amb una autorització externa obligaria a tocar
       aquest fitxer, que és exactament el que no ha de passar mai. */
    var tornada = Moduls.gestionaTornada(e && e.parameter);
    if (tornada) return tornada;

    var plantilla = HtmlService.createTemplateFromFile('ui_index');
    plantilla.estat = estatSistema();
    return plantilla.evaluate()
      .setTitle('JEFE')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    Log.error('doGet', err);
    return HtmlService.createHtmlOutput(
      '<h1>JEFE no s\'ha pogut obrir</h1><pre>' + err.message + '</pre>' +
      '<p>Executa <code>configuraJefe()</code> des de l\'editor d\'Apps Script.</p>'
    );
  }
}

/** Permet incloure fitxers HTML dins d'altres (CSS, JS, vistes de mòduls). */
function include(fitxer) {
  return HtmlService.createHtmlOutputFromFile(fitxer).getContent();
}

/**
 * PORTA D'ENTRADA DES DE FORA D'APPS SCRIPT
 *
 * Existeix per un sol motiu: Apps Script serveix les seves pàgines dins d'un
 * iframe que no delega permís de micròfon, i per tant l'escolta contínua no hi
 * pot funcionar mai. Amb la interfície servida des de fora, sí.
 *
 * SEGURETAT — llegeix-ho abans de desplegar:
 *   Perquè una pàgina d'un altre domini pugui cridar-lo, el desplegament ha de
 *   ser d'accés «Qualsevol». La porta la tanca una clau llarga que viu a
 *   Script Properties (CLAU_ACCES) i al teu navegador. Mai al repositori.
 *   Sense clau correcta, aquesta funció no mira ni què li demanes.
 *
 * Es fa servir `text/plain` a posta: així el navegador no envia cap petició
 * de comprovació prèvia, que Apps Script no sap respondre.
 */
function doPost(e) {
  var resposta = function (obj) {
    return ContentService.createTextOutput(JSON.stringify(obj))
                         .setMimeType(ContentService.MimeType.JSON);
  };

  var peticio;
  try {
    peticio = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return resposta({ ok: false, error: 'La petició no és JSON vàlid.' });
  }

  var esperada = PropertiesService.getScriptProperties().getProperty(PROP_CLAU_ACCES);
  if (!esperada) {
    return resposta({ ok: false, error: 'El servidor no té clau d\'accés configurada. ' +
                                        'Executa generaClauAcces() des de l\'editor.' });
  }
  if (!clausIguals_(String(peticio.clau || ''), esperada)) {
    /* Deixar-ne constància SENSE obrir el full a cada intent.
       Abans s'hi escrivia una línia sempre, i això vol dir que qualsevol que
       trobi aquesta adreça pot fer treballar el full de càlcul tant com
       vulgui, a mig segon per petició. Ara se n'apunta una cada deu minuts:
       el senyal es conserva —si algú hi truca, ho sabràs— i el cost no.
       La resta queda al registre d'execució d'Apps Script igualment. */
    try {
      var cau = CacheService.getScriptCache();
      if (!cau.get('rebutjat')) {
        cau.put('rebutjat', '1', 600);
        Log.avis('api.rebutjat', 'Petició amb clau incorrecta', { modul: peticio.modul });
      }
    } catch (err) { /* sense cau: val més callar que costar mig segon */ }
    return resposta({ ok: false, error: 'Clau d\'accés incorrecta.' });
  }

  return resposta(api(peticio.modul, peticio.accio, peticio.params || {}));
}

/**
 * Comparació de claus en temps constant.
 * Amb `===` el temps de resposta varia segons quants caràcters coincideixen,
 * i això és suficient per endevinar una clau a base d'intents cronometrats.
 */
function clausIguals_(a, b) {
  if (a.length !== b.length) return false;
  var diferencia = 0;
  for (var i = 0; i < a.length; i++) diferencia |= (a.charCodeAt(i) ^ b.charCodeAt(i));
  return diferencia === 0;
}

/**
 * Encaminador únic. Retorna SEMPRE {ok: bool, dades|error}.
 * El client no ha de gestionar excepcions, només mirar `ok`.
 */
function api(idModul, accio, params) {
  var inici = Date.now();
  try {
    if (!idModul || !accio) throw new Error('Falta el mòdul o l\'acció.');

    // Accions del nucli, no d'un mòdul
    if (idModul === 'nucli') return { ok: true, dades: apiNucli_(accio, params || {}) };

    var modul = Moduls.perId(idModul);
    if (!modul) throw new Error('No existeix el mòdul «' + idModul + '».');

    var fn = modul.accions && modul.accions[accio];
    if (typeof fn !== 'function') {
      throw new Error('El mòdul «' + idModul + '» no té l\'acció «' + accio + '».');
    }

    var resultat = fn(params || {});
    return { ok: true, dades: resultat === undefined ? null : resultat };

  } catch (err) {
    Log.error('api.' + idModul + '.' + accio, err, { params: params });
    return {
      ok: false,
      error: err.message || String(err),
      modul: idModul,
      accio: accio
    };
  } finally {
    var ms = Date.now() - inici;
    if (ms > 8000) Log.avis('api.lent', idModul + '.' + accio + ' ha trigat ' + ms + ' ms');
  }
}

function apiNucli_(accio, params) {
  switch (accio) {
    case 'inici':
      return {
        avui: Utils.avui(),
        moduls: Moduls.perAlClient(),
        targetes: Moduls.resumInici(),
        ia: IA.estat()
      };

    case 'estat':
      return estatSistema();

    case 'config':
      return Config.tot();

    case 'registre':
      return Log.ultimes(params.n || 30, params.nivell);

    case 'ping':
      return { ara: Utils.ara(), versio: VERSIO_JEFE };

    /* Només l'estat. La configuració web de Firebase viu a
       firebase.config.json, que comparteixen la pàgina i el treballador de
       servei: és pública per disseny. El compte de servei —que sí que té
       clau privada— no surt mai d'Script Properties. */
    case 'notificacions':
      return {
        disponible: Notifica.disponible(),
        motiu: Notifica.disponible() ? null : Notifica.motiu(),
        dispositius: Notifica.dispositius().length
      };

    case 'registraDispositiu':
      return Notifica.registra(params.fitxa, params.nom);

    default:
      throw new Error('Acció de nucli desconeguda: «' + accio + '».');
  }
}

/** Diagnòstic complet. El fa servir la pantalla d'estat i el manteniment nocturn. */
function estatSistema() {
  var estat = {
    versio: VERSIO_JEFE,
    ara: Utils.ara(),
    configurat: !!Config.idFull(),
    idFull: null,
    urlFull: null,
    moduls: [],
    problemesEsquema: [],
    ia: null,
    triggers: [],
    error: null
  };

  try {
    if (!estat.configurat) return estat;

    var ss = Config.full();
    estat.idFull = ss.getId();
    estat.urlFull = ss.getUrl();
    estat.moduls = Moduls.perAlClient();
    estat.problemesEsquema = Esquema.comprova();
    estat.ia = IA.estat();

    var t = ScriptApp.getProjectTriggers();
    for (var i = 0; i < t.length; i++) estat.triggers.push(t[i].getHandlerFunction());

  } catch (err) {
    estat.error = err.message;
  }
  return estat;
}
