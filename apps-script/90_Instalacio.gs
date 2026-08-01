/**
 * JEFE — NUCLI · Instal·lació i manteniment
 *
 * Funcions per executar A MÀ des de l'editor d'Apps Script:
 *
 *   configuraJefe()     → crea el full de càlcul i tota l'estructura. Idempotent.
 *   instalaTriggers()   → instal·la els automatismes nocturns. Idempotent.
 *   treuTriggers()      → els desinstal·la.
 *   diagnostic()        → escriu l'estat del sistema al registre d'execució.
 */

/**
 * Posada en marxa. Es pot executar tantes vegades com calgui:
 * si el full ja existeix, no en crea un altre; només posa al dia l'estructura.
 */
function configuraJefe() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(PROP_ID_FULL);
  var ss;
  var acabatDeCrear = false;

  if (id) {
    ss = SpreadsheetApp.openById(id);
  } else {
    ss = SpreadsheetApp.create(NOM_FULL_CALCUL);
    props.setProperty(PROP_ID_FULL, ss.getId());
    acabatDeCrear = true;
  }

  var informe = Esquema.sincronitza();
  var afegides = Config.inicialitza();
  var moduls = Moduls.sincronitzaFull();

  if (acabatDeCrear) netejaFullPerDefecte_(ss);

  Log.info('instalacio', 'configuraJefe() completada', {
    creat: acabatDeCrear,
    fullsCreats: informe.fullsCreats,
    columnesAfegides: informe.columnesAfegides,
    configAfegida: afegides,
    moduls: moduls
  });

  var resum =
    (acabatDeCrear ? 'Full de càlcul creat.\n' : 'Full de càlcul ja existent, estructura posada al dia.\n') +
    'Fulls creats: ' + (informe.fullsCreats.join(', ') || 'cap') + '\n' +
    'Columnes afegides: ' + (informe.columnesAfegides.join(', ') || 'cap') + '\n' +
    'Mòduls detectats: ' + moduls + '\n' +
    'URL: ' + ss.getUrl();

  console.log(resum);
  return resum;
}

/**
 * Esborra el full buit «Full 1» / «Sheet1» que Google crea automàticament,
 * però NOMÉS si està completament buit i ja hi ha altres fulls.
 * Mai toca un full amb dades.
 */
function netejaFullPerDefecte_(ss) {
  var fulls = ss.getSheets();
  if (fulls.length < 2) return;

  for (var i = 0; i < fulls.length; i++) {
    var f = fulls[i];
    var nom = f.getName();
    var esPerDefecte = /^(Sheet1|Full 1|Hoja 1|Feuille 1)$/i.test(nom);
    var esBuit = f.getLastRow() === 0 && f.getLastColumn() === 0;
    if (esPerDefecte && esBuit) {
      ss.deleteSheet(f);
      Log.info('instalacio', 'Esborrat el full buit per defecte «' + nom + '»');
      return;
    }
  }
}

// ------------------------------------------------------------------ triggers

var TRIGGERS = ['triggerResumDiari', 'triggerRevisioSetmanal', 'triggerManteniment'];

/** Instal·la els automatismes. Esborra només els seus abans, mai els d'altri. */
function instalaTriggers() {
  treuTriggers();

  var horaResum = Config.getNum('hora_resum', 22);
  var diaRevisio = Config.getNum('dia_revisio', 7);

  ScriptApp.newTrigger('triggerResumDiari')
    .timeBased().atHour(horaResum).everyDays(1).create();

  var dies = [ScriptApp.WeekDay.MONDAY, ScriptApp.WeekDay.TUESDAY, ScriptApp.WeekDay.WEDNESDAY,
              ScriptApp.WeekDay.THURSDAY, ScriptApp.WeekDay.FRIDAY, ScriptApp.WeekDay.SATURDAY,
              ScriptApp.WeekDay.SUNDAY];
  ScriptApp.newTrigger('triggerRevisioSetmanal')
    .timeBased().onWeekDay(dies[Math.min(6, Math.max(0, diaRevisio - 1))]).atHour(20).create();

  ScriptApp.newTrigger('triggerManteniment')
    .timeBased().atHour(3).everyDays(1).create();

  Log.info('instalacio', 'Triggers instal·lats', { horaResum: horaResum, diaRevisio: diaRevisio });
  return 'Triggers instal·lats: ' + TRIGGERS.join(', ');
}

function treuTriggers() {
  var tots = ScriptApp.getProjectTriggers();
  var tret = 0;
  for (var i = 0; i < tots.length; i++) {
    if (TRIGGERS.indexOf(tots[i].getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(tots[i]);
      tret++;
    }
  }
  return 'Triggers eliminats: ' + tret;
}

// ------------------------------------------------- punts d'entrada dels triggers

/**
 * Resum nocturn. La lògica arriba al bloc 6 (capa d'IA).
 * De moment surt de manera controlada i deixa constància: mai peta en silenci.
 */
function triggerResumDiari() {
  try {
    if (typeof Resums === 'undefined' || typeof Resums.generaDiari !== 'function') {
      Log.info('trigger.resum', 'Encara no implementat (arriba al bloc 6). Sense efecte.');
      return;
    }
    ambBloqueig_(function () { return Resums.generaDiari(Utils.avui()); });
  } catch (err) {
    Log.error('trigger.resum', err);
  }
}

function triggerRevisioSetmanal() {
  try {
    if (typeof Resums === 'undefined' || typeof Resums.generaSetmanal !== 'function') {
      Log.info('trigger.revisio', 'Encara no implementat (arriba al bloc 6). Sense efecte.');
      return;
    }
    ambBloqueig_(function () { return Resums.generaSetmanal(Utils.avui()); });
  } catch (err) {
    Log.error('trigger.revisio', err);
  }
}

/** Manteniment nocturn. Aquest sí que funciona des del primer dia. */
function triggerManteniment() {
  try {
    var informe = { rotades: 0, esquema: [], reintents: 0 };

    informe.rotades = Log.rota();

    informe.esquema = Esquema.comprova();
    if (informe.esquema.length) {
      Esquema.sincronitza();
      informe.esquema = Esquema.comprova();
    }

    // Reintent de resums fallits — actiu quan arribi el bloc 6
    if (typeof Resums !== 'undefined' && typeof Resums.reintentaFallits === 'function') {
      informe.reintents = Resums.reintentaFallits();
    }

    CacheService.getScriptCache().removeAll(['fitxa_ia']);

    Log.info('trigger.manteniment', 'Manteniment completat', informe);
  } catch (err) {
    Log.error('trigger.manteniment', err);
  }
}

// ------------------------------------------------------------------ diagnòstic

function diagnostic() {
  var e = estatSistema();
  console.log(JSON.stringify(e, null, 2));
  return e;
}


/**
 * Compatibilitat: el projecte es deia Popu abans de dir-se JEFE.
 * Si has apuntat el nom antic en algun lloc, encara funciona.
 */
function configuraPopu() {
  return configuraJefe();
}

/**
 * Reanomena el full de càlcul existent perquè es digui com toca.
 * Només canvia el NOM del fitxer: no toca ni una cel·la.
 */
function reanomenaFullDeCalcul() {
  var ss = Config.full();
  var abans = ss.getName();
  if (abans === NOM_FULL_CALCUL) return 'Ja es diu «' + NOM_FULL_CALCUL + '». No he tocat res.';
  ss.rename(NOM_FULL_CALCUL);
  Log.info('instalacio', 'Full reanomenat', { abans: abans, ara: NOM_FULL_CALCUL });
  return 'Reanomenat: «' + abans + '» → «' + NOM_FULL_CALCUL + '»';
}

/**
 * PROVA DE LA CAPA D'IA — executa-la des de l'editor i mira el registre.
 *
 * Fa crides de veritat contra l'API. Comprova, per aquest ordre:
 *   1. que hi ha clau i està activada
 *   2. que l'API respon
 *   3. que les eines dels mòduls hi arriben
 *   4. que davant d'una pregunta sense dades diu que no en té, en comptes
 *      d'inventar-se una xifra  ← això és el que de debò importa
 */
function provaIA() {
  var linies = ['=== PROVA DE LA CAPA D\'IA ===',
                '(fa 4 o 5 peticions: si tot seguit et surt el límit de quota, és per això)'];

  function afegeix(t) { linies.push(t); Logger.log(t); }

  // 1. Configuració
  if (!IA.disponible()) {
    afegeix('FALLA: ' + IA.motiu());
    return linies.join('\n');
  }
  afegeix('1. Configuració ......... correcta');
  afegeix('   model: ' + Config.get('model_bo'));

  // 2. Eines disponibles
  var eines = Assistent.eines();
  afegeix('2. Eines registrades .... ' + eines.length);
  eines.forEach(function (e) {
    afegeix('   · ' + e.nom + (e.escriu ? '  (escriptura → proposta)' : ''));
  });

  // 3. Resposta bàsica
  try {
    var r1 = IA.genera({
      sistema: 'Respon només amb la paraula OK, sense res més.',
      missatges: [{ rol: 'usuari', text: 'prova' }],
      model: 'barat', maxTokens: 20
    });
    afegeix('3. L\'API respon ........ sí  («' + Utils.talla(r1.text, 40) + '»)');
  } catch (err) {
    afegeix('3. L\'API respon ........ NO: ' + err.message);
    return linies.join('\n');
  }

  // 4. LA PROVA IMPORTANT: pregunta sense dades possibles
  try {
    var r2 = Assistent.pregunta([{
      rol: 'usuari',
      text: 'Quantes hores vaig dormir el 3 de març de 2019?'
    }]);
    var diuQueNo = /no (en )?tinc|no hi ha|no dispos|cap dada|no ho sé|no consta/i.test(r2.text);
    afegeix('4. No s\'inventa dades ... ' + (diuQueNo ? 'CORRECTE' : 'ATENCIÓ, REVISA-HO'));
    afegeix('   ha respost: «' + Utils.talla(r2.text, 200) + '»');
    afegeix('   eines consultades: ' + (r2.einesUsades.length
      ? r2.einesUsades.map(function (e) { return e.eina + '(' + e.files + ' files)'; }).join(', ')
      : 'cap'));
    afegeix('   tokens: ' + r2.tokens.entrada + ' entrada / ' + r2.tokens.sortida + ' sortida');
  } catch (err) {
    afegeix('4. Conversa ............. FALLA: ' + err.message);
  }

  // 5. Que una proposta d'escriptura NO escrigui
  try {
    var r3 = Assistent.pregunta([{ rol: 'usuari', text: 'apunta que avui he fet el primer hàbit' }]);
    afegeix('5. Escriptura bloquejada . ' + (r3.propostes.length ? 'CORRECTE (proposta creada, no executada)'
                                                                : 'sense proposta (potser no hi ha hàbits creats)'));
    r3.propostes.forEach(function (p) { afegeix('   proposta: ' + p.etiqueta); });
  } catch (err) {
    afegeix('5. Escriptura ........... FALLA: ' + err.message);
  }

  afegeix('=== FI ===');
  return linies.join('\n');
}


/**
 * TRIA ELS MODELS — executa-la si l'API et diu que un model ja no existeix.
 *
 * Els noms dels models de Google canvien i es retiren sovint. Aquesta funció
 * pregunta a l'API quins pots fer servir TU ara mateix, en tria un de ràpid i
 * un de bo, i els desa a `_Config`. Cap nom de model viu escrit al codi.
 *
 * Si la tria automàtica no t'agrada, tens la llista sencera al registre i
 * només has de canviar les cel·les `model_barat` i `model_bo` del full _Config.
 */
function triaModels() {
  var linies = [];
  function afegeix(t) { linies.push(t); Logger.log(t); }

  var llista;
  try {
    llista = IA.models();
  } catch (err) {
    afegeix('FALLA: ' + err.message);
    return linies.join('\n');
  }

  if (!llista.length) {
    afegeix('L\'API no ha retornat cap model que pugui generar contingut.');
    return linies.join('\n');
  }

  afegeix('=== MODELS DISPONIBLES AMB LA TEVA CLAU (' + llista.length + ') ===');
  llista.forEach(function (m) {
    afegeix('  ' + m.id + '   ·   ' + m.nom + '   ·   entrada ' + m.entrada + ' tokens');
  });

  // Descarta el que no serveix per conversar
  var utils = llista.filter(function (m) {
    return !/embedding|aqa|image|imagen|veo|tts|audio|native-audio|live/i.test(m.id);
  });

  function versio(id) {
    var m = id.match(/(\d+)\.(\d+)/);
    return m ? Number(m[1]) * 100 + Number(m[2]) : 0;
  }
  function puntua(m, volFlash) {
    var p = versio(m.id) * 10;
    if (volFlash && /flash/i.test(m.id)) p += 50;
    if (!volFlash && /pro/i.test(m.id)) p += 50;
    if (/lite/i.test(m.id)) p += volFlash ? 10 : -30;   // barat: millor lite; bo: pitjor
    if (/preview|exp/i.test(m.id)) p -= 15;             // preferim els estables
    if (/thinking/i.test(m.id)) p -= 10;                // pensa molt i costa quota
    return p;
  }

  var barat = utils.slice().sort(function (a, b) { return puntua(b, true) - puntua(a, true); })[0];
  var bo    = utils.slice().sort(function (a, b) { return puntua(b, false) - puntua(a, false); })[0];

  if (!barat || !bo) {
    afegeix('No he sabut triar. Posa un dels d\'aquí dalt a mà a _Config.');
    return linies.join('\n');
  }

  Config.set('model_barat', barat.id);
  Config.set('model_bo', bo.id);

  afegeix('');
  afegeix('=== TRIATS I DESATS A _Config ===');
  afegeix('  model_barat (classificar, resums) : ' + barat.id);
  afegeix('  model_bo    (conversa)            : ' + bo.id);
  afegeix('');
  afegeix('Si en vols uns altres, canvia aquestes dues cel·les al full _Config.');
  afegeix('Ara executa provaIA() per comprovar que responen.');

  Log.info('instalacio', 'Models triats', { barat: barat.id, bo: bo.id });
  return linies.join('\n');
}


/**
 * Genera la clau d'accés per a la interfície servida des de fora.
 *
 * Executa-la un cop. Escriu la clau al registre: copia-la, enganxa-la a la
 * pantalla de JEFE quan te la demani, i no la desis enlloc més.
 * Si algun dia sospites que se t'ha escapat, torna a executar-la: la vella
 * deixa de servir a l'instant.
 */
function generaClauAcces() {
  var alfabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  var clau = '';
  var bytes = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  for (var i = 0; i < 48; i++) {
    clau += alfabet.charAt((bytes.charCodeAt(i % bytes.length) * (i + 7)) % alfabet.length);
  }

  PropertiesService.getScriptProperties().setProperty(PROP_CLAU_ACCES, clau);
  Log.info('instalacio', 'Clau d\'accés generada');

  var text = [
    '',
    '=== CLAU D\'ACCÉS DE JEFE ===',
    '',
    clau,
    '',
    'Copia-la ara. Aquesta és l\'única vegada que te la mostro còmodament.',
    '(Sempre la pots recuperar a Configuració del projecte → Propietats de l\'script.)',
    '',
    'Qui tingui aquesta clau i l\'URL del desplegament pot llegir les teves dades.',
    'No la posis en cap fitxer del projecte ni la comparteixis.',
    '============================'
  ].join('\n');
  Logger.log(text);
  return text;
}


/**
 * PROVA DE NOTIFICACIONS — executa-la i mira't el mòbil.
 *
 * Comprova la cadena sencera: compte de servei, autenticació amb Google,
 * dispositius registrats i enviament real. Si arriba la notificació, tot
 * funciona; si no, el registre diu exactament on s'ha trencat.
 */
function provaNotificacio() {
  var linies = ['=== PROVA DE NOTIFICACIONS ==='];
  function afegeix(t) { linies.push(t); Logger.log(t); }

  if (!Notifica.disponible()) {
    afegeix('FALLA: ' + Notifica.motiu());
    return linies.join('\n');
  }
  afegeix('1. Compte de servei ..... correcte');

  // La configuració web (apiKey, vapid…) no es comprova des d'aquí: viu a
  // firebase.config.json, que és del client. Si algun dispositiu s'ha
  // registrat, és que aquella configuració ja funciona. Val més comprovar
  // el resultat que no pas repetir la declaració en dos llocs.
  var d;
  try {
    d = Notifica.dispositius();
  } catch (e) {
    afegeix('2. Dispositius .......... FALLA: falta el full _Dispositius');
    afegeix('');
    afegeix('Executa configuraJefe() per crear-lo i torna a provar-ho.');
    return linies.join('\n');
  }

  afegeix('2. Dispositius actius ... ' + d.length);
  d.forEach(function (x) { afegeix('   · ' + x.nom + '  (vist ' + x.vist_el + ')'); });

  if (!d.length) {
    afegeix('');
    afegeix('Cap dispositiu registrat encara. Al mòbil: obre JEFE, toca la icona');
    afegeix('de quadrícula i prem «Activa les notificacions». Si el botó et diu');
    afegeix('que Firebase no està configurat, és que firebase.config.json encara');
    afegeix('té els valors d\'exemple o que no has fet git push.');
    return linies.join('\n');
  }

  var r = Notifica.envia(
    'Prova de notificacions',
    'La cadena funciona de punta a punta: JEFE et pot escriure amb l\'app tancada.',
    { etiqueta: 'prova', url: './' }
  );
  afegeix('3. Enviades ............. ' + r.enviades + ' de ' + d.length);
  (r.errors || []).forEach(function (e) {
    afegeix('   ERROR a ' + e.nom + ': codi ' + e.codi + ' — ' + e.text);
  });

  afegeix('=== FI · mira\'t el mòbil ===');
  return linies.join('\n');
}


/**
 * DIAGNÒSTIC DE NUTRICIÓ — per quan una ingesta és al full però no surt a l'app.
 *
 * Ensenya la data que fa servir el servidor, les últimes files tal com estan
 * desades (amb el seu tipus real, que és on solen amagar-se aquestes coses)
 * i què respon exactament l'acció que crida la pantalla.
 */
function diagnosticNutricio() {
  var l = ['=== DIAGNÒSTIC DE NUTRICIÓ ==='];
  function a(t) { l.push(t); Logger.log(t); }

  var avui = Utils.avui();
  a('Avui, segons el servidor .... ' + avui + '   (zona ' + Session.getScriptTimeZone() + ')');

  var files;
  try {
    files = Dades.llegeix('Ingestes');
  } catch (err) {
    a('FALLA: ' + err.message);
    a('Executa configuraJefe() per crear els fulls que falten.');
    return l.join('\n');
  }

  a('Files a Ingestes ............ ' + files.length);
  a('');
  a('Últimes files desades:');
  files.slice(-6).forEach(function (f) {
    a('  data=«' + f.data + '» (' + (typeof f.data) + ')' +
      ' · apat=«' + f.apat + '»' +
      ' · nom=«' + f.nom + '»' +
      ' · grams=' + f.grams +
      ' · kcal100=' + f.kcal100 +
      (f.esborrat_el ? ' · TRET el ' + f.esborrat_el : ''));
    a('    coincideix amb avui? ' + (String(f.data) === String(avui) ? 'SÍ' : 'NO'));
  });

  a('');
  var d = Nutricio.dia(avui);
  a('Nutricio.dia(' + avui + ') respon:');
  d.apats.forEach(function (m) {
    a('  ' + m.nom + ': ' + m.items.length + ' aliments · ' + Math.round(m.kcal) + ' kcal');
  });
  a('  Totals: ' + Math.round(d.totals.ingerides) + ' kcal · ' +
    Nutricio.r1(d.totals.proteina) + ' g de proteïna');
  a('  Cremades: ' + (d.teCremades ? Math.round(d.cremades) : 'sense introduir'));

  a('');
  a(d.totals.ingerides > 0
    ? 'El servidor SÍ que retorna les dades: el problema és a la pantalla.'
    : 'El servidor NO troba res per avui: mira les dates de les files de sobre.');
  return l.join('\n');
}
