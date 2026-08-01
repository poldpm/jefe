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

var TRIGGERS = ['triggerResumDiari', 'triggerRevisioSetmanal', 'triggerManteniment',
                'triggerTancamentNutricio', 'triggerBanc', 'triggerPatrimoni'];

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

  // Recordatori de tancament del dia. Apps Script no garanteix el minut exacte:
  // dispara dins d'una finestra d'un quart d'hora. Per això demanem les 23:45
  // i no les 23:55 —així la finestra queda dins del dia— i el gestor torna a
  // mirar l'hora real per no equivocar-se de jornada si li passa la mitjanit.
  ScriptApp.newTrigger('triggerTancamentNutricio')
    .timeBased().atHour(23).nearMinute(45).everyDays(1).create();

  // El banc, de matinada: els moviments d'ahir ja hi són i tu encara dorms.
  ScriptApp.newTrigger('triggerBanc')
    .timeBased().atHour(6).everyDays(1).create();

  // El patrimoni, el 28 al vespre: a temps de mirar-t'ho abans que acabi el mes.
  ScriptApp.newTrigger('triggerPatrimoni')
    .timeBased().onMonthDay(28).atHour(21).create();

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
 * El tancament del dia, cap a les deu del vespre. El fa el mòdul del diari.
 *
 * La comprovació de si `Resums` existeix es queda: si algun dia el mòdul del
 * diari no hi és, el trigger ho ha de dir al registre i no petar. És la
 * mateixa regla que amb qualsevol mòdul —el nucli no en dona cap per fet.
 */
function triggerResumDiari() {
  try {
    if (typeof Resums === 'undefined' || typeof Resums.generaDiari !== 'function') {
      Log.avis('trigger.resum', 'No hi ha cap mòdul que sàpiga fer el resum del dia.');
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
      Log.avis('trigger.revisio', 'No hi ha cap mòdul que sàpiga fer la revisió setmanal.');
      return;
    }
    ambBloqueig_(function () { return Resums.generaSetmanal(Utils.avui()); });
  } catch (err) {
    Log.error('trigger.revisio', err);
  }
}

/**
 * RECORDATORI DE TANCAMENT — cada nit, cap a les 23:45.
 *
 * Sense les calories cremades no hi ha balanç, i un dia sense tancar no es
 * recupera l'endemà: ja no te'n recordes. Per això l'avís va abans de
 * mitjanit i no al matí següent.
 *
 * L'hora no és exacta a posta: Apps Script dispara dins d'una finestra d'un
 * quart d'hora, així que aquí es torna a mirar el rellotge. Si ja ha passat
 * la mitjanit, el dia que cal tancar és el d'ahir, no el d'avui.
 */
function triggerTancamentNutricio() {
  try {
    if (typeof Nutricio === 'undefined') return;

    var ara = new Date();
    var tz = Config.zonaHoraria();
    var hora = Number(Utilities.formatDate(ara, tz, 'H'));
    var dia = Utilities.formatDate(ara, tz, 'yyyy-MM-dd');
    if (hora < 12) dia = Utils.sumaDies(dia, -1);   // se n'ha anat de mitjanit

    var d = Nutricio.dia(dia);
    if (d.teCremades) {
      Log.info('trigger.tancament', 'Dia ja tancat, cap avís', { data: dia });
      return;
    }

    // Un dia en què no has apuntat absolutament res no és un dia oblidat:
    // és un dia que no comptes. Avisar-ne seria soroll.
    if (!d.totals.ingerides) {
      Log.info('trigger.tancament', 'Dia sense cap registre, cap avís', { data: dia });
      return;
    }

    var r = Notifica.envia(
      'Falten les calories cremades',
      'Portes ' + Math.round(d.totals.ingerides) + ' kcal i ' +
        Nutricio.r1(d.totals.proteina) + ' g de proteïna. Entra el que has cremat ' +
        'i el dia queda tancat.',
      { etiqueta: 'nutricio-tancament', url: './#nutricio', urgent: true }
    );

    Log.info('trigger.tancament', 'Recordatori enviat', { data: dia, enviades: r.enviades });
  } catch (err) {
    Log.error('trigger.tancament', err);
  }
}

/**
 * SINCRONITZACIÓ DEL BANC — cada matinada a les 6:00.
 *
 * Només avisa si hi ha alguna cosa a mirar. Un avís que diu «0 moviments
 * nous» cada matí és soroll, i el soroll fa que deixis de mirar els avisos
 * que sí que importen.
 */
function triggerBanc() {
  try {
    /* Els recurrents van AQUÍ i no en llegir una pantalla: obrir finances no
       t'ha d'escriure res al full. I van abans del banc perquè si el rebut
       que has apuntat com a recurrent també arriba del banc, el vegis com un
       possible duplicat i no com dos moviments que no tenen res a veure. */
    if (typeof Finances !== 'undefined') {
      var nous = ambBloqueig_(function () { return Finances.generaRecurrents(); });
      if (nous.length) Log.info('trigger.recurrents', nous.length + ' recurrents creats');
    }

    if (typeof FinancesBanc === 'undefined' || !FinancesBanc.disponible()) return;

    var r = ambBloqueig_(function () { return FinancesBanc.sincronitza(); });
    if (!r.nous) return;

    // Si tot ha entrat ja classificat, no hi ha res a decidir: no molestem.
    if (!r.perRevisar) {
      Log.info('trigger.banc', r.nous + ' moviments nous, tots ja classificats');
      return;
    }

    Notifica.envia(
      r.perRevisar + (r.perRevisar === 1 ? ' moviment per classificar' : ' moviments per classificar'),
      'Han entrat ' + r.nous + ' moviments del banc' +
        (r.jaSabuts ? ' i ' + r.jaSabuts + ' ja sabia què eren' : '') + '.',
      { etiqueta: 'finances-banc', url: './#finances' }
    );
  } catch (err) {
    Log.error('trigger.banc', err);
  }
}

/**
 * RECORDATORI DEL PATRIMONI — el dia 28 a les 21:00.
 *
 * Els comptes del banc s'actualitzen sols; el que no es pot llegir de cap
 * lloc —Trade Republic, accions, criptos— només el saps tu. Aquest avís
 * existeix perquè un valor de fa tres mesos no és el teu capital: és el que
 * era. A l'app antiga arribava per correu; ara és una notificació, que és on
 * mires.
 */
function triggerPatrimoni() {
  try {
    if (typeof Finances === 'undefined') return;
    var p = Finances.patrimoni();
    var manuals = p.actius.filter(function (a) { return !a.automatic; });
    if (!manuals.length) return;

    /* Els que fa menys d'una setmana que has tocat no compten: si acabes
       d'actualitzar-ho tot, no t'ha d'avisar ningú. */
    var vells = manuals.filter(function (a) { return a.dies === null || a.dies >= 7; });
    if (!vells.length) {
      Log.info('trigger.patrimoni', 'Tot actualitzat de fa poc, cap avís');
      return;
    }

    vells.sort(function (a, b) { return (b.dies === null ? 9999 : b.dies) - (a.dies === null ? 9999 : a.dies); });

    var detall = vells.slice(0, 3).map(function (a) {
      return a.dies === null ? a.nom + ' (mai)' : a.nom + ' (fa ' + a.dies + ' dies)';
    }).join(', ');

    Notifica.envia(
      vells.length === 1 ? 'Actualitza ' + vells[0].nom
                         : vells.length + ' valors del patrimoni per actualitzar',
      detall + '. Ara mateix tens anotat ' + Finances.eur(p.total) + '.',
      { etiqueta: 'patrimoni', url: './#finances' }
    );
    Log.info('trigger.patrimoni', 'Recordatori enviat', { vells: vells.length });
  } catch (err) {
    Log.error('trigger.patrimoni', err);
  }
}

/** Manteniment nocturn. Aquest sí que funciona des del primer dia. */
function triggerManteniment() {
  try {
    var informe = { rotades: 0, esquema: [] };

    informe.rotades = Log.rota();

    informe.esquema = Esquema.comprova();
    if (informe.esquema.length) {
      Esquema.sincronitza();
      informe.esquema = Esquema.comprova();
    }

    /* Aquí hi havia previst un reintent dels resums que haguessin fallat, i
       s'ha tret perquè seria mentida: el resum del dia es munta amb el que
       diuen els mòduls ARA, i a les tres de la matinada «ara» ja és l'endemà.
       Tornar-lo a generar li posaria a la nit de dimarts les xifres de
       dimecres. Si un vespre falla, hi ha el botó de demanar-lo a mà, i al
       registre en queda constància. */

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
 * REPARA LES DATES CONVERTIDES EN OBJECTE.
 *
 * `Dades.insereix` feia servir `appendRow`, que escriu com si haguessis
 * teclejat a la cel·la i es salta el format de text de la columna. Resultat:
 * '2026-08-01' es desava com un objecte Data amb zona horària, i després no
 * coincidia amb res quan es buscava per text. Afecta TOTES les files desades
 * d'una en una des del principi, a qualsevol full.
 *
 * Això les torna a text. NO canvia cap dia ni cap hora: només el tipus.
 * Amb `simulacio` a cert no escriu res i et diu què trobaria.
 */
function reparaDates(simulacio) {
  var l = ['=== REPARACIÓ DE DATES ==='];
  function a(t) { l.push(t); Logger.log(t); }
  if (simulacio) a('ASSAIG: no s\'escriurà res.');

  var ss = Config.full();
  var tz = Config.zonaHoraria();
  var totals = 0;

  Esquema.declarat().forEach(function (def) {
    var full = ss.getSheetByName(def.nom);
    if (!full || full.getLastRow() < 2) return;

    // Només les columnes que han de contenir text de data o marca de temps.
    var interessants = [];
    def.columnes.forEach(function (c, i) {
      if (c.tipus === 'data' || c.tipus === 'iso') interessants.push({ col: i + 1, tipus: c.tipus });
    });
    if (!interessants.length) return;

    var files = full.getLastRow() - 1;
    var arreglades = 0;

    interessants.forEach(function (c) {
      var rang = full.getRange(2, c.col, files, 1);
      var vals = rang.getValues();
      var canvi = false;

      for (var i = 0; i < vals.length; i++) {
        var v = vals[i][0];
        if (v instanceof Date) {
          vals[i][0] = c.tipus === 'data'
            ? Utilities.formatDate(v, tz, 'yyyy-MM-dd')
            : Utilities.formatDate(v, tz, "yyyy-MM-dd'T'HH:mm:ssXXX");
          canvi = true;
          arreglades++;
        }
      }

      if (canvi && !simulacio) {
        rang.setNumberFormat('@');     // que no torni a passar en aquesta columna
        rang.setValues(vals);
      }
    });

    if (arreglades) {
      totals += arreglades;
      a('  ' + def.nom + ': ' + arreglades + ' cel·les');
    }
  });

  a('');
  a(totals === 0
    ? 'Cap data mal desada. Tot correcte.'
    : (simulacio ? 'Es repararien ' + totals + ' cel·les. Executa reparaDates() sense arguments per fer-ho.'
                 : totals + ' cel·les reparades.'));

  if (!simulacio && totals) Dades.invalida();
  return l.join('\n');
}


/* =========================================================================
   CONNEXIÓ DEL BANC — executa-les en aquest ordre, un sol cop.
   ========================================================================= */

/** PAS 1 — comprova que les tres propietats de l'script estan ben posades. */
function provaBanc() {
  var l = ['=== CONNEXIÓ AMB ENABLE BANKING ==='];
  function a(t) { l.push(t); Logger.log(t); }

  var r;
  try { r = FinancesBanc.comprova(); }
  catch (err) { a('FALLA: ' + err.message); return l.join('\n'); }

  a('Aplicació ..... ' + r.aplicacio);
  a('Entorn ........ ' + r.entorn + (r.produccio ? '  correcte' : '  ÉS SANDBOX: veuràs dades inventades'));
  a('Activa ........ ' + (r.activa ? 'sí' : 'NO — falta activar-la al panell d\'Enable Banking'));
  a('Adreça de tornada:');
  a('  EB_REDIRECT diu ....... ' + r.redirect);
  a('  registrada a EB ....... ' + (r.redirectRegistrada ? 'sí' : 'NO'));
  a('  qui hi contesta ....... ' + (r.quiContesta || 'no ho he pogut comprovar'));

  if (r.apuntaAJefe === false) {
    a('');
    a('ATURA\'T. Aquella adreça no és JEFE, i el banc hi redirigirà. Si és');
    a('l\'app antiga de finances, dirà que s\'ha connectat i desarà la sessió al');
    a('SEU full: JEFE es quedarà sense connexió i no t\'ho dirà ningú.');
    a('');
    a('Ha contestat: ' + r.resposta);
    a('');
    a('Posa a EB_REDIRECT l\'adreça del desplegament de JEFE (la que acaba en');
    a('/exec, la de «Implementar → Gestionar implementacions»).');
    return l.join('\n');
  }

  if (!r.redirectRegistrada) {
    a('');
    a('Aquesta adreça no està registrada a enablebanking.com. Afegeix-la a les');
    a('redirect URLs de la teva aplicació.');
    a('Registrades ara mateix: ' + JSON.stringify(r.registrades));
    return l.join('\n');
  }

  a('');
  a(r.produccio && r.activa ? 'Tot correcte. Ara: bancsDisponibles().'
                            : 'Arregla el que surt marcat abans de continuar.');
  return l.join('\n');
}

/** PAS 2 — el teu banc. Copia el nom exacte a la propietat BANC_NOM. */
function bancsDisponibles(pais) {
  var l = FinancesBanc.bancs(pais || 'ES');
  var posat = PropertiesService.getScriptProperties().getProperty('BANC_NOM');

  Logger.log('Copia el nom del teu banc, exactament com surt aquí:\n');
  l.forEach(function (b) { Logger.log('  ' + b + (b === posat ? '   ← el que tens posat' : '')); });
  Logger.log('\n' + l.length + ' entitats a ' + (pais || 'ES') + '.');
  Logger.log('');

  if (posat && l.indexOf(posat) !== -1) {
    Logger.log('BANC_NOM ja és «' + posat + '» i coincideix. Executa connectaBanc().');
  } else if (posat) {
    Logger.log('ATENCIÓ: BANC_NOM diu «' + posat + '», que no és cap dels de sobre.');
    Logger.log('Corregeix-lo a Configuració del projecte → Propietats de l\'script.');
  } else {
    Logger.log('Ara ves a Configuració del projecte → Propietats de l\'script i crea:');
    Logger.log('    BANC_NOM = el nom exacte del teu banc');
    Logger.log('Després executa connectaBanc().');
  }
  return l.length;
}

/** PAS 3 — obre l'enllaç que et doni i identifica't al teu banc. */
function connectaBanc() {
  var url = FinancesBanc.connecta();
  Logger.log('OBRE AQUEST ENLLAÇ I IDENTIFICA\'T AL TEU BANC:\n' + url);
  Logger.log('\nQuan tornis, la connexió ja quedarà feta sola.');
  return url;
}

/** Com està la connexió, i què va passar l'última sincronització. */
function estatBanc() {
  var e = FinancesBanc.estat();
  var l = ['=== BANC ==='];
  function a(t) { l.push(t); Logger.log(t); }
  a('Banc ........ ' + (e.institution || '—'));
  a('Connectat ... ' + (e.connected ? 'sí' : 'NO'));
  a('Comptes ..... ' + ((e.accounts || []).length));
  a('Caduca ...... ' + (e.caduca || '—'));
  if (!e.authId) a('\n→ Encara no has executat connectaBanc().');
  else if (!e.sessionId) a('\n→ Has demanat el permís però la tornada del banc no s\'ha desat.');
  if (e.caduca && e.caduca < Utils.avui()) a('\n→ El permís ha caducat. Torna a executar connectaBanc().');
  return l.join('\n');
}

/** Baixa els moviments ara mateix, sense esperar la matinada. */
function sincronitzaBancAra() {
  var r = FinancesBanc.sincronitza();
  Logger.log('Moviments nous ......... ' + r.nous);
  Logger.log('Ja sabia què eren ...... ' + (r.jaSabuts || 0));
  Logger.log('Per classificar ........ ' + (r.perRevisar || 0));
  Logger.log('Saldos actualitzats .... ' + (r.saldos || 0));
  (r.errors || []).forEach(function (e) { Logger.log('  ERROR: ' + e); });
  if (r.motiu) Logger.log(r.motiu);
  return r.nous;
}

/**
 * Repara la clau privada si en enganxar-la s'han perdut els salts de línia.
 * El camp de Propietats de l'script és d'una sola línia, i sense els salts el
 * PEM deixa de ser vàlid. No mostra MAI el contingut: només comptadors.
 */
function arreglaClauBanc() {
  var p = PropertiesService.getScriptProperties();
  var k = (p.getProperty('EB_PRIVATE_KEY') || '').trim();
  if (!k) throw new Error('No hi ha cap propietat EB_PRIVATE_KEY.');

  Logger.log('Com estava: ' + k.length + ' caràcters, ' + k.split('\n').length + ' línies');

  var m = k.match(/-----BEGIN ([A-Z ]+?)-----([\s\S]*?)-----END/);
  if (!m) throw new Error('No hi trobo les marques BEGIN/END. Torna a enganxar el .pem sencer.');

  var tipus = m[1].trim();
  if (tipus === 'RSA PRIVATE KEY') {
    throw new Error('La clau és PKCS#1 i Apps Script només accepta PKCS#8. Cal convertir-la amb OpenSSL.');
  }
  if (tipus !== 'PRIVATE KEY') throw new Error('Tipus de clau inesperat: ' + tipus);

  var cos = m[2].replace(/[^A-Za-z0-9+\/=]/g, '');
  if (cos.length < 100) throw new Error('El cos de la clau és massa curt: s\'ha copiat a mitges.');

  var pem = '-----BEGIN PRIVATE KEY-----\n' + cos.match(/.{1,64}/g).join('\n') +
            '\n-----END PRIVATE KEY-----\n';
  p.setProperty('EB_PRIVATE_KEY', pem);

  Utilities.computeRsaSha256Signature('prova', pem);   // prova de foc
  Logger.log('La clau ja signa correctament. Torna a executar provaBanc().');
  return 'clau reparada';
}


/**
 * Aplica el que ja saps als moviments que van quedar pendents.
 * No toca res del que hagis decidit tu: només els que estan a «Altres» o els
 * que esperen una confirmació que la memòria ja pot donar.
 */
function reclassificaFinances() {
  var r = Finances.reclassifica();
  Logger.log('Reclassificats ............ ' + r.reclassificats);
  Logger.log('Confirmats sense canvi .... ' + r.confirmats);
  Logger.log('Comerços per decidir ...... ' + r.comercosPerDecidir);
  if (r.pendents.length) {
    Logger.log('\nEls que et queden, de més a menys moviments:');
    r.pendents.forEach(function (p) {
      Logger.log('  ' + p.comerc + '   (' + p.moviments + ')');
    });
  }
  if (r.generiques && r.generiques.length) {
    Logger.log('\nAquests NO s\'aprendran mai, i és a posta: no són comerços,');
    Logger.log('són l\'etiqueta que posa el banc quan no en sap el nom. Cada un');
    Logger.log('és una compra diferent i s\'han de mirar d\'un en un:');
    r.generiques.forEach(function (p) {
      Logger.log('  ' + p.comerc + '   (' + p.moviments + ')');
    });
  }
  return r.reclassificats + r.confirmats;
}


/**
 * ON SE'N VA EL TEMPS.
 *
 * Mesura cada peça per separat: obrir el full, llegir cada pestanya, i el que
 * costa muntar cada pantalla. Executa-la de tant en tant a mesura que creixin
 * les dades; el dia que una xifra es dispari, sabrem quina és sense endevinar.
 *
 * El cost de la CRIDA (anar i tornar a Apps Script) no surt aquí perquè no es
 * pot mesurar des de dins: són 1,2–1,6 s i és de la plataforma.
 */
/**
 * PER QUÈ NO M'HAS AVISAT DE LES CALORIES CREMADES?
 *
 * Un avís que no arriba té quatre motius possibles i des de fora es veuen
 * tots igual: silenci. Aquesta funció els separa en ordre, i el primer que
 * falli és el que ho explica.
 *
 *   1. El trigger no està instal·lat  → executa instalaTriggers()
 *   2. El trigger encara no ha saltat → són les 23:20, espera
 *   3. Ha saltat i ha decidit callar  → el dia ja estava tancat, o buit
 *   4. Ha volgut avisar i no ha pogut → Firebase o el dispositiu
 *
 * No envia res. Per provar l'avís de debò hi ha `provaTancament()`.
 */
function perQueNoMHasAvisat() {
  var l = ['=== L\'AVÍS DE LES CALORIES CREMADES ==='];
  function a(t) { l.push(t); Logger.log(t); }

  var tz = Config.zonaHoraria();
  var ara = new Date();
  a('Ara mateix ................. ' + Utilities.formatDate(ara, tz, 'yyyy-MM-dd HH:mm') + ' (' + tz + ')');
  a('');

  // ---- 1. Hi és, el trigger?
  var trobat = null;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'triggerTancamentNutricio') trobat = t;
  });
  if (!trobat) {
    a('1. El trigger .............. NO HI ÉS');
    a('');
    a('→ Aquest és el motiu. Executa instalaTriggers() i ja està.');
    a('   Els triggers no es posen sols quan es puja codi nou: s\'han de');
    a('   tornar a instal·lar cada cop que se n\'afegeix un.');
    return l.join('\n');
  }
  a('1. El trigger .............. instal·lat, per a les 23:45');

  // ---- 2. Ha tingut temps de saltar?
  var hora = Number(Utilities.formatDate(ara, tz, 'H'));
  var minut = Number(Utilities.formatDate(ara, tz, 'm'));
  var passat = (hora > 23) || (hora === 23 && minut >= 45) || (hora < 12);
  a('2. Ja hauria d\'haver saltat? ' + (passat ? 'sí' : 'NO — encara no són les 23:45'));

  // ---- 3. Què n'hi ha, al registre?
  var avui = Utilities.formatDate(ara, tz, 'yyyy-MM-dd');
  var rastre = Log.ultimes(300).filter(function (f) {
    return String(f.origen).indexOf('trigger.tancament') === 0;
  });
  a('3. Vegades que ha saltat ... ' + rastre.length + ' (de les últimes 300 línies del registre)');
  rastre.slice(0, 4).forEach(function (f) {
    a('     ' + String(f.marca_temps).slice(0, 16).replace('T', ' ') + '  ' + f.nivell + '  ' + f.missatge);
  });
  if (!rastre.length) {
    a('     Cap. O no ha saltat mai, o el registre ja ha rotat.');
  }

  // ---- 4. Avui, avisaria?
  a('');
  var d = Nutricio.dia(avui);
  a('4. Com està el dia d\'avui:');
  a('     Ingerides ............. ' + Math.round(d.totals.ingerides) + ' kcal');
  a('     Cremades .............. ' + (d.teCremades ? Math.round(d.cremades) : 'sense introduir'));

  var motiu = d.teCremades ? 'el dia ja està tancat: no toca avisar'
            : !d.totals.ingerides ? 'no has apuntat res avui, i d\'un dia buit no s\'avisa'
            : null;
  a('     Avisaria? ............. ' + (motiu ? 'NO — ' + motiu : 'SÍ'));

  // ---- 5. I podria arribar-te?
  a('');
  if (!Notifica.disponible()) {
    a('5. Firebase ................ NO — ' + Notifica.motiu());
  } else {
    var quants = 0;
    try { quants = Notifica.dispositius().length; } catch (e) {}
    a('5. Firebase ................ correcte');
    a('   Aparells registrats ..... ' + quants +
      (quants ? '' : '  ← sense cap aparell no hi ha on enviar-ho'));
  }

  a('');
  a('COM ES LLEGEIX');
  a('El primer que surti malament és el motiu; la resta ja no importa.');
  a('Si tot surt bé i l\'avís no arriba, executa provaTancament(): fa exactament');
  a('el que fa el trigger, ara mateix, i el registre en dirà el resultat.');
  return l.join('\n');
}

/**
 * Fa ara mateix el que fa el trigger de les 23:45, amb les regles i tot.
 * Serveix per no haver d'esperar-se a la nit per saber si funciona.
 */
function provaTancament() {
  triggerTancamentNutricio();
  var ultima = Log.ultimes(20).filter(function (f) {
    return String(f.origen).indexOf('trigger.tancament') === 0;
  })[0];
  var t = ultima
    ? 'Ha fet: ' + ultima.nivell + ' · ' + ultima.missatge + ' ' + (ultima.dades || '')
    : 'No ha deixat res al registre. Mira el registre d\'execució d\'Apps Script.';
  Logger.log(t);
  return t;
}


function diagnosticVelocitat() {
  var l = ['=== ON SE\'N VA EL TEMPS ==='];
  function a(t) { l.push(t); Logger.log(t); }
  function crono(nom, fn) {
    var t = Date.now();
    var r;
    try { r = fn(); } catch (err) { a('  ' + nom + ': FALLA — ' + err.message); return null; }
    a('  ' + nom + ': ' + (Date.now() - t) + ' ms');
    return r;
  }

  a('');
  a('Obrir el full de càlcul');
  crono('SpreadsheetApp.openById', function () { return Config.full().getName(); });

  a('');
  a('Llegir cada pestanya (primera lectura, sense memòria)');
  var fulls = ['Moviments', 'Categories', 'FinancesMemoria', 'Ingestes',
               'Habits', 'HabitsRegistre', '_Registre'];
  var total = 0;
  fulls.forEach(function (nom) {
    Dades.invalida(nom);
    var t = Date.now();
    var files;
    try { files = Dades.llegeix(nom).length; }
    catch (err) { a('  ' + nom + ': no hi és'); return; }
    var ms = Date.now() - t;
    total += ms;
    a('  ' + nom + ': ' + ms + ' ms   (' + files + ' files)');
  });
  a('  ---- suma de lectures: ' + total + ' ms');

  a('');
  a('Muntar cada pantalla (amb les pestanyes ja llegides)');
  Dades.invalida();
  crono('Finances.pantalla(mes)', function () {
    return Finances.pantalla({ periode: 'mes' });
  });
  Dades.invalida();
  crono('Finances.pantalla(estad)', function () {
    return Finances.pantalla({ periode: 'estad' });
  });
  Dades.invalida();
  crono('Finances.pantalla(revisar)', function () {
    return Finances.pantalla({ periode: 'revisar' });
  });
  Dades.invalida();
  crono('Nutricio.pantalla(dia)', function () {
    return Nutricio.pantalla({ periode: 'dia', data: Utils.avui() });
  });
  Dades.invalida();
  crono('Moduls.contextIA (el que llegeix la IA)', function () {
    Moduls.invalidaContext();
    return Moduls.contextIA({ compacte: true });
  });

  a('');
  a('COM ES LLEGEIX AIXÒ');
  a('Cada pestanya té un cost fix d\'uns 270 ms encara que estigui buida: és el');
  a('viatge a Google Sheets. Les files a sobre costen poc —319 moviments només');
  a('hi afegeixen 60 ms—, o sigui que el que encareix una pantalla és QUANTES');
  a('pestanyes toca, no quantes files tenen.');
  a('');
  a('Preocupa\'t quan una pestanya sola passi del segon: llavors sí que seran');
  a('les files, i tocarà partir-la per anys.');
  return l.join('\n');
}


/**
 * DIAGNÒSTIC DE LA MEMÒRIA DE COMERÇOS.
 *
 * Per quan entren moviments del banc i cap no es reconeix. Diu si la memòria
 * és plena o buida, i per als últims moviments del banc ensenya la clau que
 * en surt i si la memòria la té. Amb això es distingeix «són comerços nous»
 * de «la consulta no lliga», que des de fora es veuen igual.
 */
function diagnosticMemoria() {
  var l = ['=== MEMÒRIA DE COMERÇOS ==='];
  function a(t) { l.push(t); Logger.log(t); }

  var mem;
  try { mem = Dades.llegeix('FinancesMemoria'); }
  catch (err) { a('FALLA: ' + err.message); a('Executa configuraJefe().'); return l.join('\n'); }

  a('Comerços recordats ..... ' + mem.length);
  if (!mem.length) {
    a('');
    a('La memòria és BUIDA. Si ja has importat, vol dir que el full encara no');
    a('existia quan ho vas fer. Torna a passar la importació: no duplicarà res');
    a('i aquesta vegada omplirà la memòria.');
    return l.join('\n');
  }

  var index = {};
  mem.forEach(function (m) { index[String(m.clau)] = m; });

  a('');
  a('Tres exemples del que recorda:');
  mem.slice(0, 3).forEach(function (m) {
    a('  «' + m.clau + '»  →  ' + m.categoria + '   (vist ' + m.cops + ' cops)');
  });

  var banc = Dades.llegeix('Moviments', function (f) {
    return f.origen === 'banc' && !f.esborrat_el;
  });
  banc.sort(function (x, y) { return String(y.creat_el).localeCompare(String(x.creat_el)); });

  a('');
  a('Els sis moviments del banc més recents:');
  banc.slice(0, 6).forEach(function (f) {
    var clau = Finances.clauMemoria(f.descripcio, f.tipus);
    var t = index[clau];
    a('  ' + f.data + '  «' + Utils.talla(f.descripcio, 30) + '»');
    a('     clau ....... ' + clau);
    a('     a memòria .. ' + (t ? 'SÍ → ' + t.categoria : 'no'));
    a('     ha quedat .. ' + f.categoria + (String(f.revisat).toUpperCase() === 'SI'
                                            ? '  (ja revisat)' : '  (per revisar)'));
  });

  var desconeguts = banc.slice(0, 6).filter(function (f) {
    return !index[Finances.clauMemoria(f.descripcio, f.tipus)];
  }).length;

  a('');
  a(desconeguts === 6
    ? 'Cap dels sis és a la memòria. Si algun d\'aquests comerços ja el tenies\n' +
      'classificat abans, la clau no lliga i és un error meu: passa\'m aquest text.'
    : 'La memòria reconeix part dels moviments: la consulta funciona.');
  return l.join('\n');
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
