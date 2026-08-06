/**
 * JEFE — NUCLI · Instal·lació i manteniment
 *
 * Funcions per executar A MÀ des de l'editor d'Apps Script:
 *
 *   configuraJefe()     → crea el full de càlcul i tota l'estructura. Idempotent.
 *   instalaTriggers()   → instal·la els automatismes nocturns. Idempotent.
 *   treuTriggers()      → els desinstal·la.
 *   provaAvisos()       → arribaran els avisos programats dels mòduls?
 *   provaFotos()        → hi ha permís per escriure les fotos del seguiment a Drive?
 *   provaAvisosEscola() → arribaran els avisos de l'automatització de l'escola?
 *   informesALesOnze()  → posa els dos informes a les 23:00 i reinstal·la.
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

/**
 * ELS AUTOMATISMES QUE SÓN NOSTRES.
 *
 * Aquesta llista NO és decoració: és la que fa servir `treuTriggers` per
 * netejar abans de tornar-los a crear. Un automatisme que no hi surti no
 * s'esborra mai, i cada `instalaTriggers()` en deixa un de vell i en crea un
 * de nou. Va passar amb `triggerEscalfaFora` el 4 d'agost del 2026: en van
 * quedar dos, i com que aquell costa quaranta segons per passada, entre tots
 * dos es menjaven més quota diària de la que té el compte sencer. Quan la
 * quota s'acaba, Google atura TOTS els automatismes sense dir res.
 *
 * REGLA: si afegeixes un `newTrigger` aquí sota, el seu nom va aquí dalt. La
 * prova `eines/prova.mjs` ho comprova i peta si te'n descuides.
 */
var TRIGGERS = ['triggerResumDiari', 'triggerRevisioSetmanal', 'triggerManteniment',
                'triggerTancamentNutricio', 'triggerBanc', 'triggerPatrimoni',
                'triggerAgendaDelDia', 'triggerEscalfa', 'triggerEscalfaFora',
                'triggerAvisos', 'triggerDema', 'triggerSenyals'];

/** Instal·la els automatismes. Esborra només els seus abans, mai els d'altri. */
function instalaTriggers() {
  treuTriggers();

  var horaResum = Config.getNum('hora_resum', 23);
  var diaRevisio = Config.getNum('dia_revisio', 7);
  var horaRevisio = Config.getNum('hora_revisio', 23);

  ScriptApp.newTrigger('triggerResumDiari')
    .timeBased().atHour(horaResum).everyDays(1).create();

  var dies = [ScriptApp.WeekDay.MONDAY, ScriptApp.WeekDay.TUESDAY, ScriptApp.WeekDay.WEDNESDAY,
              ScriptApp.WeekDay.THURSDAY, ScriptApp.WeekDay.FRIDAY, ScriptApp.WeekDay.SATURDAY,
              ScriptApp.WeekDay.SUNDAY];
  ScriptApp.newTrigger('triggerRevisioSetmanal')
    .timeBased().onWeekDay(dies[Math.min(6, Math.max(0, diaRevisio - 1))])
    .atHour(horaRevisio).create();

  ScriptApp.newTrigger('triggerManteniment')
    .timeBased().atHour(3).everyDays(1).create();

  // Recordatori de tancament del dia. Apps Script no garanteix el minut exacte:
  // dispara dins d'una finestra d'un quart d'hora. Per això demanem les 23:45
  // i no les 23:55 —així la finestra queda dins del dia— i el gestor torna a
  // mirar l'hora real per no equivocar-se de jornada si li passa la mitjanit.
  ScriptApp.newTrigger('triggerTancamentNutricio')
    .timeBased().atHour(23).nearMinute(45).everyDays(1).create();

  /* CADA CINC MINUTS, ESCALFAR LES PANTALLES.
     Desar-les fa que la SEGONA vegada sigui ràpida; això fa que la primera
     també ho sigui.

     PER QUÈ CINC I NO TRENTA SEGONS. Perquè no es pot: Apps Script només
     accepta 1, 5, 10, 15 o 30 minuts, i el mínim és un minut.

     PER QUÈ CINC I NO UN. Perquè més sovint no fa res més ràpid. El que hi ha
     desat dura mitja hora, o sigui que amb cinc minuts no caduca mai igualment.
     L'ÚNICA cosa que millora anant més sovint és l'estona que una pantalla es
     queda freda després que n'escriguis una altra, i baixar-la de cinc minuts
     a un costa multiplicar per cinc les execucions.

     I ALLÀ HI HA UN LÍMIT QUE NO ÉS NOSTRE: aquest compte té noranta minuts al
     dia d'automatismes, i es reparteixen entre TOTS. Cada minut serien mil
     quatre-centes execucions diàries; passar-se vol dir que s'aturi tot —el
     banc, l'agenda de les sis, els avisos— sense dir res. Cinc minuts són unes
     tres-centes execucions i deixen el pot pràcticament sencer per a la resta.
     Val més una pantalla freda de tant en tant que quedar-se sense avisos. */
  ScriptApp.newTrigger('triggerEscalfa').timeBased().everyMinutes(5).create();

  /* I el que es llegeix de FORA —calendari, tasques, pendents de l'escola—,
     cada quart d'hora.

     AQUEST NÚMERO VA CANVIAR DUES VEGADES EN UNA NIT, i val la pena saber per
     què. Amb `CalendarApp`, una passada costava 40 segons i cada quart d'hora
     eren 48 minuts diaris dels 90 que té el compte: es va haver de baixar a
     mitja hora per no quedar-nos sense avisos. Llegint per l'API i demanant
     totes les agendes de cop, la passada costa 7 segons i el quart d'hora en
     surt per 9 minuts diaris. O sigui que no és que ara ens hi arrisquem més:
     és que ara costa cinc vegades menys. Vegeu `triggerEscalfaFora`. */
  ScriptApp.newTrigger('triggerEscalfaFora').timeBased().everyMinutes(15).create();

  /* ELS SENYALS, cada tres hores. Prou per assabentar-te el mateix dia, poc
     perquè no sigui un degoteig. Qui decideix si en surt cap és el pressupost
     de dos al dia —vegeu 65_Senyals.gs—, no aquesta xifra. */
  ScriptApp.newTrigger('triggerSenyals').timeBased().everyHours(3).create();

  /* L'agenda del dia, a les sis del matí. Abans d'aixecar-te: el que has de
     saber d'avui, per saber-ho abans de començar-lo i no a mig matí. */
  ScriptApp.newTrigger('triggerAgendaDelDia')
    .timeBased().atHour(6).nearMinute(0).everyDays(1).create();

  /* EL BANC, TRES VEGADES AL DIA I CAP MÉS.
     La llei que regula això —la PSD2— limita quantes vegades al dia es pot
     anar a mirar un compte sense que en Pol hi sigui al davant, i normalment
     són quatre. Aquestes tres són TOTES les que hi ha: obrir l'app no en
     gasta cap, a posta, perquè entrar-hi vuit vegades un matí se les menjaria
     totes i a les deu ja no en quedaria ni una.

     Sis: el d'ahir ja està tancat i tu encara dorms.
     Tres: el que s'hagi mogut al matí.
     Vuit: el dia sencer, a temps que t'ho miris abans de sopar. */
  [6, 15, 20].forEach(function (h) {
    ScriptApp.newTrigger('triggerBanc').timeBased().atHour(h).everyDays(1).create();
  });

  // El patrimoni, el 28 al vespre: a temps de mirar-t'ho abans que acabi el mes.
  ScriptApp.newTrigger('triggerPatrimoni')
    .timeBased().onMonthDay(28).atHour(21).create();

  /* EL REPÀS DE DEMÀ, abans d'anar a dormir.
     A la mitja hora i no en punt: a les 23:00 hi ha el resum del dia, que
     tanca el que ha passat. Aquest mira endavant, i són dues coses diferents
     que no s'han de trepitjar. */
  ScriptApp.newTrigger('triggerDema')
    .timeBased().atHour(23).nearMinute(30).everyDays(1).create();

  /* ELS AVISOS QUE DEMANIN ELS MÒDULS.
     Una hora de trigger per cada hora que demani algú, i ni una més: si cap
     mòdul en demana cap, aquí no es crea res. Tots criden la mateixa funció
     —un automatisme d'Apps Script no pot rebre paràmetres— i és ella qui mira
     quina hora és i a qui li toca.

     Això existeix perquè fins ara un mòdul nou no podia demanar que se
     l'avisés sense que algú vingués a editar aquest fitxer, i el contracte
     diu el contrari: un mòdul és un fitxer i prou. */
  var hores = {};
  Moduls.avisos().forEach(function (a) { hores[a.hora] = true; });
  Object.keys(hores).forEach(function (h) {
    ScriptApp.newTrigger('triggerAvisos').timeBased().atHour(Number(h)).everyDays(1).create();
  });

  Log.info('instalacio', 'Triggers instal·lats', {
    horaResum: horaResum, diaRevisio: diaRevisio, horaRevisio: horaRevisio,
    horesDAvisos: Object.keys(hores)
  });
  return 'Triggers instal·lats: ' + TRIGGERS.join(', ') +
         (Object.keys(hores).length ? '\nAvisos de mòduls a les: ' + Object.keys(hores).join(', ') : '');
}

/**
 * Posa els dos informes —el del dia i el de la setmana— a les onze de la nit.
 *
 * Les hores viuen al full `_Config`, i el que hi ha desat mana sobre el valor
 * per defecte del codi: canviar el codi no toca el que ja tens. Això sí que ho
 * toca, i després torna a instal·lar els automatismes perquè els triggers
 * s'assabentin de l'hora nova —crear-los és l'únic moment en què la miren.
 *
 * Es pot executar amb el botó de l'editor: no demana cap paràmetre.
 * Si algun dia les vols a una altra hora, canvia `hora_resum` o `hora_revisio`
 * al full `_Config` i executa `instalaTriggers`.
 */
function informesALesOnze() {
  var abansDia = Config.getNum('hora_resum', 23);
  var abansSetmana = Config.getNum('hora_revisio', 20);  // abans anava clavada a les 20
  Config.set('hora_resum', 23);     // `set` ja buida la memòria de la configuració
  Config.set('hora_revisio', 23);
  var r = instalaTriggers();
  var diu = 'Resum del dia: abans a les ' + abansDia + ':00, ara a les 23:00.\n' +
            'Revisió de la setmana: abans a les ' + abansSetmana + ':00, ara a les 23:00.\n' + r;
  console.log(diu);
  return diu;
}

/**
 * Esborra els automatismes NOSTRES —els de — i deixa estar els
 * d'altri. Si en trobés dos amb el mateix nom, els treu tots dos: duplicats
 * vol dir doble consum de quota, i la quota és de tot el compte.
 */
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


/**
 * EL PONT AMB L'AUTOMATITZACIÓ DE L'ESCOLA.
 *
 * No és el mateix que el del calendari, i per això té les seves propietats:
 * són dos scripts diferents al mateix compte —un que escriu als calendaris i
 * un que llegeix el correu—, amb dues adreces i dues claus. Barrejar-los
 * voldria dir que tocar-ne un pot trencar l'altre.
 *
 * Aquest pont NOMÉS serveix per PREGUNTAR coses a l'escola. El que t'envia
 * l'escola arriba pel doPost del nucli amb la clau d'accés de sempre, i
 * funciona encara que aquí no hi hagi res configurat.
 */
function connectaAvisosEscola(url, clau) {
  if (!url || !clau) {
    return 'Aquesta funció necessita dos valors, i des del botó d\'executar no\n' +
           'se li poden donar. Fes-ho així:\n\n' +
           '  Configuració del projecte (l\'engranatge de l\'esquerra)\n' +
           '  → Propietats de l\'script → Afegeix una propietat, dues vegades:\n\n' +
           '     ESCOLA_PONT_URL   →  l\'adreça del detector, acabada en /exec\n' +
           '     ESCOLA_PONT_CLAU  →  la clau que hi has posat al CONFIG\n\n' +
           '  I després executa provaAvisosEscola().';
  }

  var u = String(url).trim();
  if (u.indexOf('https://script.google.com/') !== 0 || u.slice(-5) !== '/exec') {
    return 'Aquesta adreça no té la pinta bona. Ha de començar per\n' +
           'https://script.google.com/macros/s/ i acabar en /exec\n' +
           '(no en /dev, que és la de proves i només funciona per a tu).';
  }

  PropertiesService.getScriptProperties().setProperties({
    ESCOLA_PONT_URL: u,
    ESCOLA_PONT_CLAU: String(clau).trim()
  });
  return 'Desat. Ara executa provaAvisosEscola().';
}


/**
 * ARRIBARÀ EL QUE M'ENVIÏ L'ESCOLA, I PODRÉ PREGUNTAR-LI RES?
 *
 * Comprova les dues direccions per separat, perquè són independents i poden
 * fallar per motius diferents:
 *
 *   escola → JEFE   necessita el full, la clau d'accés i un dispositiu
 *                   registrat. Es prova de debò: escriu un avís i el treu.
 *   JEFE → escola   necessita el pont. Es prova trucant-hi.
 *
 * Si la segona falla, la primera segueix servint: continuaries rebent tot el
 * que t'enviï l'escola i només no li podries preguntar res.
 */
function provaAvisosEscola() {
  var l = ['=== ELS AVISOS DE L\'ESCOLA ==='];
  function a(t) { l.push(t); Logger.log(t); }

  // ---- direcció 1: el que t'envien
  a('');
  a('ESCOLA → JEFE   (el que t\'arriba sol)');

  var idProva = null;
  try {
    var r = Escola.rebre({
      mena: 'avis',
      titol: 'Prova del pont amb l\'escola',
      cos: 'Si veus això a l\'apartat Escola, el camí funciona. Ara el trec.',
      notifica: false
    });
    idProva = r.id;
    a('  Desar un avís ......... correcte');
  } catch (err) {
    a('  Desar un avís ......... FALLA: ' + err.message);
    a('  Executa configuraJefe() per crear el full «Escola».');
    return l.join('\n');
  }

  try {
    var d = Notifica.dispositius();
    a('  Notificar-te .......... ' + (Notifica.disponible()
        ? (d.length ? d.length + ' dispositius' : 'FALLA: cap dispositiu registrat')
        : 'FALLA: ' + Notifica.motiu()));
  } catch (err) {
    a('  Notificar-te .......... FALLA: ' + err.message);
  }

  /* LES DUES COSES QUE HAS D'ENGANXAR AL SCRIPT DE L'ESCOLA, i ensenyades,
     no només comptades: dir «posada» i no dir quina no serveix de res —era
     exactament el que feia abans—. Van al registre d'execució, que només veus
     tu; però són secrets, així que no les enganxis on no toqui. */
  var clau = PropertiesService.getScriptProperties().getProperty(PROP_CLAU_ACCES);
  a('');
  a('  Al CONFIG de l\'script de l\'escola hi ha d\'anar això:');
  a('');
  if (typeof URL_APP === 'string' && URL_APP) {
    a('    JEFE_URL:  ' + JSON.stringify(URL_APP) + ',');
  } else {
    a('    JEFE_URL:  <l\'adreça del desplegament, acabada en /exec>');
    a('               Desplega → Gestiona desplegaments → la del quadre blau.');
  }
  a('    JEFE_CLAU: ' + (clau ? JSON.stringify(clau) + ',' : '<FALTA — executa generaClauAcces()>'));

  /* L'avís de prova es marca com a llegit i es queda. En aquest sistema res no
     s'esborra —no hi ha ni funció per fer-ho, i és a posta— i no serà una
     prova la que estreni l'excepció. Marcat com a llegit ja no et reclama ni
     compta com a pendent, que és tot el que calia. */
  try {
    if (idProva) { Escola.marcaLlegit(idProva); a(''); a('  (l\'avís de prova queda com a llegit)'); }
  } catch (err) {
    a('');
    a('  L\'avís de prova s\'ha quedat sense llegir; el pots marcar tu.');
  }

  // ---- direcció 2: el que li preguntes
  a('');
  a('JEFE → ESCOLA   (les preguntes: agenda, pendents, correus, setmana)');
  if (!EscolaPont.hiEs()) {
    a('  Pont .................. no configurat');
    a('');
    a('  Sense això seguiràs rebent-ho tot, però no li podràs preguntar res.');
    a('  Posa ESCOLA_PONT_URL i ESCOLA_PONT_CLAU a Propietats de l\'script.');
    return l.join('\n');
  }
  try {
    var q = EscolaPont.prova();
    a('  Contesta .............. sí' + (q && q.qui ? '  (' + q.qui + ')' : ''));
  } catch (err) {
    a('  Contesta .............. FALLA: ' + err.message);
  }

  a('');
  a('=== FI ===');
  return l.join('\n');
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
 * L'AGENDA DEL DIA — cada matí, cap a les sis.
 *
 * Només el calendari: les tasques i els hàbits ja tenen els seus avisos i el
 * seu lloc, i un avís que ho digui tot no el llegeixes, el descartes. Aquí hi
 * ha el que no pots moure de lloc i el que et condiciona el dia.
 *
 * Si no hi ha res, NO S'ENVIA RES. Un avís cada matí per dir-te que no tens
 * res és la manera més ràpida de fer que deixis de mirar-los.
 */
function triggerAgendaDelDia() {
  try {
    if (typeof Calendari === 'undefined') return;

    var avui = Utils.avui();
    var d = Calendari.dia(avui);
    if (!d.esdeveniments.length) {
      Log.info('trigger.agenda', 'Res al calendari, cap avís', { data: avui });
      return;
    }

    var e = d.esdeveniments;
    var ambHora = e.filter(function (x) { return !x.totElDia; });

    /* El títol ha de servir sol des de la pantalla blocada: la primera cosa
       de debò i a quina hora, que és el que et fa aixecar o no córrer. */
    /* El títol era la primera cita i el cos la llista de cites: amb una de
       sola, la notificació es deia dues vegades el mateix. Ara el títol diu
       d'on ve i quantes n'hi ha, i el cos les diu. */
    var titol = 'Calendari' + (e.length > 1 ? ' · ' + e.length + ' cites' : '');

    var cos = e.map(function (x) {
      return (x.totElDia ? 'tot el dia' : x.hora) + ' · ' + x.titol +
             (x.lloc ? ' (' + x.lloc + ')' : '');
    }).join('\n');

    var r = Notifica.envia(titol, cos, { etiqueta: 'agenda-dia', url: './#calendari' });

    if (r.enviades > 0) {
      Log.info('trigger.agenda', 'Agenda enviada', { data: avui, cites: e.length });
    } else {
      Log.avis('trigger.agenda', 'NO s\'ha pogut enviar: ' + (r.motiu || 'cap aparell l\'ha rebut'),
               { data: avui });
    }
  } catch (err) {
    Log.error('trigger.agenda', err);
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
      'Nutrició',
      'Falten les calories cremades. Portes ' + Math.round(d.totals.ingerides) +
        ' kcal i ' + Nutricio.r1(d.totals.proteina) + ' g de proteïna: entra el que ' +
        'has cremat i el dia queda tancat.',
      { etiqueta: 'nutricio-tancament', url: './#nutricio', urgent: true }
    );

    /* «Enviat» NOMÉS si ha sortit d'aquí. Abans ho deia sempre, encara que
       `enviades` fos zero perquè no hi havia cap aparell registrat: el
       registre afirmava que l'avís havia sortit mentre en Pol el buscava al
       telèfon. Un registre que menteix és pitjor que no tenir-ne. */
    if (r.enviades > 0) {
      Log.info('trigger.tancament', 'Recordatori enviat', { data: dia, enviades: r.enviades });
    } else {
      Log.avis('trigger.tancament', 'NO s\'ha pogut enviar: ' + (r.motiu || 'cap aparell l\'ha rebut'),
               { data: dia, errors: r.errors || [] });
    }
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

    /* Amb un límit de quatre mirades al dia, dues seguides són una de perduda.
       Apps Script pot repetir un trigger si el primer intent no acaba net, i
       una hora de marge separa de sobres les tres que volem de les que no. */
    var r = ambBloqueig_(function () { return FinancesBanc.sincronitzaSiCal(60); });
    if (!r.nous) return;

    // Si tot ha entrat ja classificat, no hi ha res a decidir: no molestem.
    if (!r.perRevisar) {
      Log.info('trigger.banc', r.nous + ' moviments nous, tots ja classificats');
      return;
    }

    Notifica.envia(
      'Banc',
      r.perRevisar + (r.perRevisar === 1 ? ' moviment per classificar' : ' moviments per classificar') +
        '. Han entrat ' + r.nous + ' moviments' +
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
      'Patrimoni',
      (vells.length === 1 ? 'Toca actualitzar ' + vells[0].nom
                          : vells.length + ' valors per actualitzar') + ': ' +
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
    'Prova',
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
 * ELS AVISOS DELS MÒDULS: ARRIBARAN O NO?
 *
 * Un avís programat falla EN SILENCI. Si divendres a les set no et pica, el
 * que passa és que no passa res, i te n'assabentes per no rebre res —que és la
 * pitjor manera d'assabentar-se'n, perquè és igual que si aquell dia no hi
 * hagués res a dir. Això ho pregunta avui.
 *
 * Comprova les quatre coses que poden estar trencades i les diu totes, no
 * només la primera: quins avisos declaren els mòduls, si l'automatisme de
 * l'hora existeix de debò, què contestaria el mòdul ara mateix, i si la
 * cadena de notificacions està dempeus.
 */
function provaAvisos() {
  var linies = ['=== AVISOS PROGRAMATS DELS MÒDULS ==='];
  function afegeix(t) { linies.push(t); Logger.log(t); }

  var DIES = ['', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte', 'diumenge'];

  var avisos = Moduls.avisos();
  if (!avisos.length) {
    afegeix('Cap mòdul demana cap avís. Aquí no hi ha res a comprovar.');
    return linies.join('\n');
  }

  /* Quants n'hi ha instal·lats de debò. Apps Script no deixa preguntar a quina
     hora està programat un automatisme —`getHandlerFunction` és tot el que en
     dona—, o sigui que el que es pot comprovar és que n'hi hagi tants com
     hores demanen els mòduls. Si el número no quadra, falta un
     `instalaTriggers()`. */
  var quants = ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === 'triggerAvisos';
  }).length;
  var calen = {};
  avisos.forEach(function (a) { calen[a.hora] = true; });
  var nCalen = Object.keys(calen).length;

  afegeix('Automatismes «triggerAvisos»: ' + quants + ' instal·lats, ' +
          nCalen + ' que en calen (' + Object.keys(calen).join(', ') + 'h)');
  if (quants < nCalen) {
    afegeix('  FALLA: en falta algun. Executa instalaTriggers().');
  }
  afegeix('');

  var potEnviar = Notifica.disponible();
  afegeix('Cadena de notificacions: ' + (potEnviar ? 'dempeus' : 'TRENCADA — ' + Notifica.motiu()));
  if (potEnviar) {
    var d = [];
    try { d = Notifica.dispositius(); } catch (e) { d = []; }
    afegeix('Dispositius registrats: ' + d.length +
            (d.length ? '' : '  ← FALLA: sense cap dispositiu no arribarà enlloc'));
  }
  afegeix('');

  avisos.forEach(function (a) {
    afegeix('· ' + a.modul + '.' + a.id + ' — ' +
            (a.dia === null ? 'cada dia' : 'cada ' + (DIES[a.dia] || '?')) +
            ' a la franja de les ' + a.hora + ':00');
    var r;
    try {
      r = a.mira();
    } catch (err) {
      afegeix('  FALLA en preguntar-li: ' + err.message);
      return;
    }
    if (!r || !r.titol) {
      afegeix('  Ara mateix no diria res. No és cap error: vol dir que ara');
      afegeix('  no hi ha res a avisar. Torna-ho a provar quan sí que n\'hi hagi.');
      return;
    }
    afegeix('  Enviaria: «' + r.titol + '»');
    afegeix('            ' + (r.cos || '').slice(0, 90) + ((r.cos || '').length > 90 ? '…' : ''));
    afegeix('  Obriria:  ' + (r.url || a.modul));
  });

  afegeix('');
  afegeix('=== FI ===');
  afegeix('Si vols veure\'n una al mòbil ara, executa provaNotificacio().');
  return linies.join('\n');
}


/**
 * LES FOTOS DEL SEGUIMENT: HI HA PERMÍS PER ESCRIURE A DRIVE?
 *
 * El mòdul de seguiment és el primer de tot JEFE que toca Drive, i això vol
 * dir un permís que abans no calia. El problema és ON es demana: un permís que
 * falta el navegador te'l pregunta, però una app web ja desplegada no pregunta
 * res —peta i prou—. O sigui que provant-ho des del telèfon el que veuries és
 * un error, i no sabries que només et falta dir que sí.
 *
 * Aquí sí que es pot preguntar: executant això des de l'editor, Google et
 * demana el permís, tu l'acceptes, i a partir d'aquell moment el telèfon ja
 * el té. Per això existeix aquesta funció i per això s'executa des d'aquí.
 *
 * Crea la carpeta si no hi és, hi escriu un fitxer de no res i el llença a la
 * paperera. No toca res del que hi hagi.
 */
function provaFotos() {
  var linies = ['=== FOTOS DEL SEGUIMENT ==='];
  function afegeix(t) { linies.push(t); Logger.log(t); }

  var carpeta;
  try {
    carpeta = Seguiment.carpetaFotos();
  } catch (err) {
    afegeix('FALLA en obrir la carpeta: ' + err.message);
    afegeix('');
    afegeix('Si parla de permisos o d\'autorització, torna a executar aquesta');
    afegeix('mateixa funció i accepta el que et demani Google.');
    return linies.join('\n');
  }
  afegeix('1. Carpeta .............. ' + carpeta.getName());
  afegeix('   ' + carpeta.getUrl());

  var f;
  try {
    var blob = Utilities.newBlob('prova', 'text/plain', 'prova-jefe.txt');
    f = carpeta.createFile(blob);
  } catch (err) {
    afegeix('2. Escriure-hi .......... FALLA: ' + err.message);
    return linies.join('\n');
  }
  afegeix('2. Escriure-hi .......... correcte (' + f.getId() + ')');

  try {
    f.setTrashed(true);
    afegeix('3. Netejar .............. el fitxer de prova és a la paperera');
  } catch (err) {
    afegeix('3. Netejar .............. no s\'ha pogut treure: ' + err.message);
    afegeix('   Es diu «prova-jefe.txt» i el pots esborrar tu.');
  }

  afegeix('');
  afegeix('=== FI · ja pots pujar fotos des del mòbil ===');
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
 * No envia res. Per provar l'avís de debò hi ha `provaAvisCremades()`.
 */
/**
 * DONAR-LI ACCÉS AL CALENDARI.
 *
 * El mòdul del calendari fa que l'app necessiti un permís que abans no tenia.
 * Google no el demana sol: cal executar una funció que el toqui, i llavors
 * surt la pantalla d'autorització. Aquesta funció és exactament això, i de
 * passada deixa la llista dels teus calendaris apuntada al full.
 *
 * S'ha d'executar UNA vegada, des de l'editor. Després, a l'app, els que
 * vols veure es trien des del botó d'ajustos del calendari.
 */
function preparaCalendari() {
  var l = ['=== CALENDARI ==='];
  function a(t) { l.push(t); Logger.log(t); }

  var meus;
  try {
    meus = CalendarApp.getAllCalendars();
  } catch (err) {
    a('FALLA en accedir al calendari: ' + err.message);
    a('');
    a('Si no ha sortit la pantalla de permisos, torna a executar-ho.');
    return l.join('\n');
  }

  a('Permís .................... concedit');
  a('Calendaris que tens ....... ' + meus.length);

  var r = Calendari.sincronitzaCalendaris();
  a('Apuntats al full .......... ' + r.nous + ' de nous, ' + r.actualitzats + ' ja hi eren');
  a('');
  Calendari.calendaris().forEach(function (c) {
    a('  ' + (c.mostra ? '[x]' : '[ ]') + ' ' + c.nom + (c.principal ? '   ← el teu' : ''));
  });
  a('');
  a('Els marcats amb [x] són els que veuràs. Els altres hi són apagats: els');
  a('que et comparteixen són molts i no els vols tots a sobre el primer dia.');
  a('Es canvien des de l\'app, al botó d\'ajustos de la pantalla del calendari.');
  a('');
  a('ELS ESDEVENIMENTS NO ES COPIEN AL FULL. Es llegeixen de Google cada cop.');
  a('Al full només hi ha aquesta llista i quins mires.');
  return l.join('\n');
}


/**
 * ¿EL PONT DE L'ESCOLA JA SAP APUNTAR TASQUES?
 *
 * Ho pregunta sense apuntar res: demana les llistes de Google Tasks d'aquell
 * compte, que és una acció nova del pont. Si contesta, és que el codi nou hi és
 * i està desplegat; si diu «Acció desconeguda», és que falta una de les dues
 * coses —enganxar-lo o tornar a desplegar-lo.
 */
function provaTasquesEscola() {
  var l = ['=== APUNTAR TASQUES A L\'ESCOLA ==='];
  function a(t) { l.push(t); Logger.log(t); }

  if (!EscolaPont.hiEs()) {
    a('FALLA: no hi ha pont configurat. Executa configuraPontEscola().');
    return l.join('\n');
  }

  var r;
  try {
    r = EscolaPont.llistes();
  } catch (err) {
    a('FALLA: ' + err.message);
    a('');
    if (/desconeguda/i.test(err.message)) {
      a('Això vol dir que l\'script de l\'escola encara té el codi vell. Repassa:');
      a('  1. Has enganxat el doPost nou (el que té «llistes» i «creaTasca»)?');
      a('  2. L\'has DESAT?');
      a('  3. L\'has tornat a desplegar amb VERSIÓ NOVA? Sense això, la que');
      a('     serveix segueix sent la d\'abans encara que el codi sigui nou.');
    }
    return l.join('\n');
  }

  var llistes = (r && r.llistes) || [];
  a('El pont contesta ............ sí');
  a('Llistes que té l\'escola ..... ' + llistes.length);
  a('');
  llistes.forEach(function (x) { a('  · ' + x.nom); });
  a('');
  a('A l\'app, el «+» de cada caixa apunta a la llista que porta el nom. Aquí no');
  a('s\'ha creat res: això només ho ha preguntat.');
  return l.join('\n');
}


/**
 * DONAR-LI ACCÉS A GOOGLE TASKS.
 *
 * Igual que amb el calendari: el mòdul de tasques necessita un permís que
 * l'app no tenia, i Google no el demana sol. Executar això el demana, i de
 * passada deixa les teves llistes apuntades al full.
 *
 * S'ha d'executar UNA vegada, des de l'editor. Si diu que no coneix `Tasks`,
 * és que falta activar el servei avançat: a l'editor, Serveis + → Tasks API.
 */
function preparaTasques() {
  var l = ['=== TASQUES ==='];
  function a(t) { l.push(t); Logger.log(t); }

  /* Els dos fulls nous els crea `configuraJefe()`, que és qui llegeix el que
     declara cada mòdul. Sense ells, això petaria amb un missatge que no diu
     què has de fer. */
  if (!Dades.existeixFull('LlistesTasques') || !Dades.existeixFull('TasquesMarques')) {
    a('FALTEN ELS FULLS NOUS.');
    a('');
    a('Executa primer configuraJefe() —crea el que falta i no toca res del que');
    a('ja hi ha— i després torna aquí.');
    return l.join('\n');
  }

  if (!Tasques.serveiHiEs()) {
    a('FALLA: el servei de Tasks no hi és.');
    a('');
    a('A l\'editor d\'Apps Script, al costat de «Serveis», toca el +, tria');
    a('«Tasks API» i afegeix-lo. Després torna a executar això.');
    return l.join('\n');
  }

  var r;
  try {
    r = Tasques.sincronitzaLlistes();
  } catch (err) {
    a('FALLA en llegir Google Tasks: ' + err.message);
    a('');
    a('Si no ha sortit la pantalla de permisos, torna a executar-ho.');
    return l.join('\n');
  }

  a('Permís .................... concedit');
  a('Llistes que tens .......... ' + r.total);
  a('Apuntades al full ......... ' + r.nous + ' de noves, ' + r.actualitzats + ' ja hi eren');
  a('');
  Tasques.llistes().forEach(function (x) {
    a('  ' + (x.mostra ? '[x]' : '[ ]') + ' ' + x.nom + (x.principal ? '   ← la principal' : ''));
  });
  a('');
  a('Els marcats amb [x] són els que veuràs. Es canvien des de l\'app, al botó');
  a('d\'ajustos de la pantalla de tasques.');
  a('');
  a('LES TASQUES NO ES COPIEN AL FULL. Es llegeixen de Google cada cop. Al full');
  a('només hi ha aquesta llista, quines mires, i la prioritat i el «hi estic»,');
  a('que són dues coses que Google Tasks no sap desar.');

  var n = 0;
  try { n = Tasques.pantalla({}).tasques.length; } catch (e) {}
  a('');
  a('Pendents ara mateix ....... ' + n);
  return l.join('\n');
}


/**
 * ON SE'N VA EL TEMPS. Cronòmetre de tot el que fa una petició.
 *
 * No escriu cap dada teva: només llegeix i compta. Executa-la i enganxa'm el
 * registre sencer.
 *
 * El que ja sé sense executar res: una petició a l'app, encara que el servidor
 * la rebutgi abans de fer res, triga entre 2 i 4 segons. Això és el transport
 * d'Apps Script i no es pot arreglar amb codi nostre; el que sí que es pot és
 * no fer-te'l esperar i no fer-ne dues on n'hi ha prou amb una. Això d'aquí
 * mesura l'altra meitat: què hi afegim nosaltres.
 */
function mesuraLaLentitud() {
  var l = [];
  function a(t) { l.push(t); Logger.log(t); }
  function crono(nom, fn) {
    var t0 = Date.now();
    var r = null, err = null;
    try { r = fn(); } catch (e) { err = e.message; }
    var ms = Date.now() - t0;
    a('  ' + (String(ms) + ' ms').padStart(9) + '   ' + nom + (err ? '   ✗ ' + err : ''));
    return { ms: ms, r: r };
  }

  a('=== ON SE\'N VA EL TEMPS ===');
  a('');
  a('OBRIR EL FULL');
  var full = crono('SpreadsheetApp.openById', function () { return Config.full(); }).r;

  a('');
  a('LLEGIR CADA PESTANYA (files × columnes)');
  if (full) {
    full.getSheets().forEach(function (f) {
      var nom = f.getName();
      crono(nom + '  (' + f.getLastRow() + '×' + f.getLastColumn() + ')', function () {
        return f.getDataRange().getValues().length;
      });
    });
  }

  a('');
  a('CADA MÒDUL, LA SEVA TARGETA D\'INICI (amb la memòria cau tal com està)');
  var mods = Moduls.actius();
  mods.forEach(function (m) {
    if (typeof m.resumInici !== 'function') return;
    crono(m.id, function () { return m.resumInici(); });
  });

  a('');
  a('CADA MÒDUL, EL SEU TROS DE LA PÀGINA DEL DIA');
  var avui = Utils.avui();
  mods.forEach(function (m) {
    if (typeof m.elDia !== 'function') return;
    crono(m.id, function () { return m.elDia(avui); });
  });

  a('');
  a('CADA MÒDUL, LA SEVA PANTALLA SENCERA');
  mods.forEach(function (m) {
    if (!m.accions || typeof m.accions.pantalla !== 'function') return;
    crono(m.id, function () { return m.accions.pantalla({}); });
  });

  a('');
  a('LES DUES PANTALLES QUE SUMEN TOTS ELS MÒDULS');
  crono('inici  (totes les targetes)', function () { return Moduls.resumInici(); });
  crono('el dia (tots els blocs)', function () { return Moduls.elDia(avui); });

  a('');
  a('EL QUE SURT D\'AQUEST COMPTE (cada un és una altra volta sencera)');
  crono('calendari · el mes que mires', function () {
    return Calendari.pantalla({ periode: 'mes' });
  });
  if (typeof EscolaPont !== 'undefined' && EscolaPont.hiEs()) {
    crono('escola · pont: pendents en directe', function () { return Escola.pendentsDelPont(); });
  }
  if (typeof Tasques !== 'undefined' && Tasques.serveiHiEs()) {
    crono('tasques · Google Tasks', function () { return Tasques.pantalla({}); });
  }

  a('');
  a('LA MATEIXA PANTALLA UNA SEGONA VEGADA (això diu si la memòria cau serveix)');
  mods.forEach(function (m) {
    if (!m.accions || typeof m.accions.pantalla !== 'function') return;
    crono(m.id + '  (2a vegada)', function () { return m.accions.pantalla({}); });
  });

  a('');
  a('ELS AUTOMATISMES QUE HI HA DONATS D\'ALTA');
  try {
    var tr = ScriptApp.getProjectTriggers();
    if (!tr.length) a('  CAP. Executa instalaTriggers().');
    tr.forEach(function (t) { a('  · ' + t.getHandlerFunction()); });
    var noms = tr.map(function (t) { return t.getHandlerFunction(); });
    ['triggerEscalfa', 'triggerEscalfaFora'].forEach(function (n) {
      if (noms.indexOf(n) === -1) a('  FALTA ' + n + ' → executa instalaTriggers()');
    });
  } catch (e) { a('  no els he pogut llegir: ' + e.message); }

  a('');
  a('PARLAR AMB JEFE (sense comptar el model, que és una altra història)');
  crono('la fitxa que li llegeix, tal com està', function () {
    return Moduls.contextIA({ compacte: true }).length + ' caràcters';
  });
  crono('la mateixa fitxa, feta de zero', function () {
    Moduls.invalidaContext();
    return Moduls.contextIA({ compacte: true }).length + ' caràcters';
  });
  crono('la pantalla de la conversa', function () { return Conversa.estat({}); });

  a('');
  a('EL QUE JA S\'HAVIA QUEIXAT ELL SOL (peticions de més de 8 segons)');
  try {
    var lents = Dades.llegeix('_Registre', function (f) {
      return String(f.origen || '').indexOf('api.lent') !== -1;
    }).slice(-15);
    if (!lents.length) a('  cap');
    lents.forEach(function (x) {
      a('  ' + String(x.marca_temps).slice(0, 16) + '  ' + x.missatge);
    });
  } catch (e) { a('  no he pogut llegir el registre: ' + e.message); }

  return l.join('\n');
}


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
  var quants = 0;
  var senseFirebase = !Notifica.disponible();
  if (senseFirebase) {
    a('5. Firebase ................ NO — ' + Notifica.motiu());
  } else {
    try { quants = Notifica.dispositius().length; } catch (e) {}
    a('5. Firebase ................ correcte');
    a('   Aparells registrats ..... ' + quants);
  }

  // ---- I què n'ha dit el sistema d'avisos, últimament?
  var avisos = Log.ultimes(300).filter(function (f) {
    return String(f.origen).indexOf('notifica.') === 0 && f.nivell !== 'INFO';
  });
  if (avisos.length) {
    a('');
    a('6. Queixes del sistema d\'avisos:');
    avisos.slice(0, 4).forEach(function (f) {
      a('     ' + String(f.marca_temps).slice(0, 16).replace('T', ' ') + '  ' + f.nivell + '  ' + f.missatge);
    });
  }

  /* EL VEREDICTE, EN UNA LÍNIA. Sense això, un diagnòstic de vint línies on
     totes semblen bé menys la cinquena obliga a llegir-les totes i endevinar
     quina mana. La primera cosa que falla és la que ho explica. */
  a('');
  a('=========================================================');
  if (senseFirebase) {
    a('MOTIU: Firebase no està configurat. ' + Notifica.motiu());
  } else if (!quants) {
    a('MOTIU: NO HI HA CAP APARELL REGISTRAT.');
    a('');
    a('L\'avís s\'ha generat i no tenia on anar. La fitxa del teu telèfon no');
    a('és al full: o no l\'has activat mai en aquest aparell, o la fitxa s\'ha');
    a('renovat —passa en netejar les dades del lloc o en reinstal·lar l\'app—');
    a('i la que hi havia ha deixat de servir.');
    a('');
    a('→ Obre JEFE al telèfon, engegades les notificacions des dels ajustos,');
    a('  i torna a executar això. Ha de dir 1 aparell.');
  } else if (motiu) {
    a('MOTIU: avui no toca avisar — ' + motiu + '.');
    a('Això no és cap error: és la regla. Per veure l\'avís igualment,');
    a('executa provaAvisCremades() amb el dia sense tancar.');
  } else if (!passat) {
    a('MOTIU: encara no són les 23:45. Res per arreglar.');
  } else {
    a('Tot està a punt i avui tocaria avisar. Executa provaAvisCremades()');
    a('per fer-ho saltar ara i veure què diu el registre.');
  }
  return l.join('\n');
}

/**
 * Fa ara mateix el que fa el trigger de les 23:45, amb les regles i tot.
 * Serveix per no haver d'esperar-se a la nit per saber si funciona.
 */
function provaAvisCremades() {
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


/* ==========================================================================
   EL MATEIX COMPTE DUES VEGADES

   Quan la connexió amb el banc caduca i la refàs, el proveïdor et dona un
   identificador nou per al mateix compte. Fins ara l'actiu es deia com aquell
   identificador, i per això en naixia un de nou al costat del vell: el vell es
   quedava congelat amb el saldo de l'últim dia que va funcionar.

   Això ja no tornarà a passar —ara mana el número de compte, que no canvia—,
   però el que ja ha passat s'ha d'arreglar a mà, i aquí hi ha les dues eines.
   Cap de les dues esborra res: la primera només mira, i la segona COPIA
   l'històric del vell al bo i després ARXIVA el vell, que és recuperable
   traient-li la data de la columna `esborrat_el`.
   ========================================================================== */

/** Què tens al patrimoni, amb els identificadors, per saber què és què. */
function mirarPatrimoni() {
  var l = [];
  function a(t) { l.push(t); Logger.log(t); }

  var actius = Dades.llegeix('Patrimoni');
  var hist = {};
  Dades.llegeix('PatrimoniHistoric').forEach(function (v) {
    var k = String(v.id_actiu);
    if (!hist[k]) hist[k] = [];
    hist[k].push({ data: String(v.data), valor: Number(v.valor) || 0 });
  });

  a('PATRIMONI — ' + actius.length + ' actius');
  a('');

  actius.forEach(function (x) {
    var h = (hist[x.id] || []).sort(function (p, q) { return p.data.localeCompare(q.data); });
    var ultim = h.length ? h[h.length - 1] : null;
    a((x.esborrat_el ? '[ARXIVAT] ' : '') + x.nom);
    a('    id ................ ' + x.id);
    a('    automàtic ......... ' + (String(x.automatic).toUpperCase() === 'SI' ? 'sí' : 'no'));
    if (x.iban) a('    número de compte .. ···' + x.iban);
    a('    últim valor ....... ' + (ultim ? ultim.valor + ' € del ' + ultim.data : 'cap'));
    a('    històric .......... ' + h.length + (h.length ? ' valors, des del ' + h[0].data : ''));
    a('');
  });

  a('Per ajuntar-ne dos:  fusionaPatrimoni("id del vell", "id del bo")');
  a('Digues-ho al revés i et quedaràs el saldo vell: mira bé quin és quin.');
  return l.join('\n');
}

/**
 * Ajunta dos actius: l'històric del vell passa al bo i el vell queda arxivat.
 *
 * No s'esborra res. Els valors del vell es COPIEN al bo, i només els dies que
 * el bo encara no tingui: si tots dos tenen un valor del mateix dia, mana el
 * del bo, que és el que està viu. Les files velles es queden on són.
 */
function fusionaPatrimoni(idVell, idBo) {
  var l = [];
  function a(t) { l.push(t); Logger.log(t); }

  if (!idVell || !idBo) return 'Falten identificadors. Fes primer mirarPatrimoni().';
  if (idVell === idBo) return 'Són el mateix. No hi ha res a ajuntar.';

  var vell = Dades.perId('Patrimoni', idVell);
  var bo = Dades.perId('Patrimoni', idBo);
  if (!vell) return 'No trobo cap actiu amb l\'id ' + idVell;
  if (!bo) return 'No trobo cap actiu amb l\'id ' + idBo;

  var tots = Dades.llegeix('PatrimoniHistoric');
  var delVell = tots.filter(function (v) { return String(v.id_actiu) === idVell; });
  var jaTe = {};
  tots.forEach(function (v) { if (String(v.id_actiu) === idBo) jaTe[String(v.data)] = true; });

  a('AJUNTANT');
  a('  vell: ' + vell.nom + '  (' + idVell + ')  · ' + delVell.length + ' valors');
  a('  bo:   ' + bo.nom + '  (' + idBo + ')' + (bo.esborrat_el ? '  [estava arxivat]' : ''));
  a('');

  /* El que es queda no pot quedar-se arxivat. Si ho estava —perquè una fusió
     anterior es va equivocar de compte— aquesta el torna a treure. */
  if (bo.esborrat_el) Dades.actualitza('Patrimoni', idBo, { esborrat_el: '' });

  var copiats = 0, saltats = 0;
  delVell.forEach(function (v) {
    var data = String(v.data);
    if (jaTe[data]) { saltats++; return; }
    Dades.desa('PatrimoniHistoric', {
      id: 'val_' + idBo + '_' + data,
      id_actiu: idBo, data: data, valor: Number(v.valor) || 0
    }, ['id'], 'val');
    jaTe[data] = true;
    copiats++;
  });

  Dades.actualitza('Patrimoni', idVell, { esborrat_el: Utils.ara() });

  // Es deixa constància de qui s'ha arxivat, per poder-ho desfer si m'he
  // equivocat de compte. Vegeu `desfesLaFusio()`.
  PropertiesService.getScriptProperties().setProperty(PROP_FUSIO_FETA,
    JSON.stringify({ vell: idVell, bo: idBo, copiats: copiats, quan: Utils.ara() }));

  a('  ' + copiats + ' valors copiats al bo');
  a('  ' + saltats + ' saltats perquè el bo ja tenia aquell dia');
  a('  «' + vell.nom + '» arxivat (no esborrat: treu-li la data d\'`esborrat_el` per recuperar-lo)');
  a('');
  a('Obre finances → patrimoni i mira que la línia sigui la que esperaves.');
  return l.join('\n');
}


/* --------------------------------------------------------------------------
   SENSE HAVER D'ESCRIURE CAP IDENTIFICADOR

   El botó d'executar de l'editor només crida funcions sense paràmetres, o
   sigui que `fusionaPatrimoni("a", "b")` des d'allà no es pot fer. Aquestes
   dues sí: la primera busca els duplicats i ensenya què faria, i la segona ho
   fa. Dos passos i no un, perquè res que toqui dades no ha de passar de cop
   pel primer botó que premis.
   -------------------------------------------------------------------------- */

var PROP_FUSIO = 'FUSIO_PATRIMONI_PREVISTA';
var PROP_FUSIO_FETA = 'FUSIO_PATRIMONI_FETA';

/** Busca comptes duplicats i diu què faria. NO toca res. */
function preparaFusio() {
  var l = [];
  function a(t) { l.push(t); Logger.log(t); }

  /* Els arxivats també entren. Una fusió mal feta deixa el compte BO arxivat,
     i si aquí no es miren, la manera d'arreglar-ho seria escriure identificadors
     a mà, que és justament el que no ha de caldre. */
  var actius = Dades.llegeix('Patrimoni');
  var hist = {};
  Dades.llegeix('PatrimoniHistoric').forEach(function (v) {
    var k = String(v.id_actiu);
    if (!hist[k]) hist[k] = [];
    hist[k].push({ data: String(v.data), valor: Number(v.valor) || 0 });
  });

  function ultim(id) {
    var h = (hist[id] || []).sort(function (p, q) { return p.data.localeCompare(q.data); });
    return h.length ? h[h.length - 1] : null;
  }

  /* Dos comptes són el mateix si ho diu el número de compte; i si encara no
     el tenen apuntat, si es diuen igual —el nom el fa el banc a partir del
     número, o sigui que dos comptes iguals es diuen igual. */
  var grups = {};
  actius.forEach(function (x) {
    if (String(x.automatic).toUpperCase() !== 'SI') return;
    var clau = x.iban ? 'n:' + x.iban : 'x:' + String(x.nom).trim().toLowerCase();
    if (!grups[clau]) grups[clau] = [];
    grups[clau].push(x);
  });

  /* QUI ÉS EL COMPTE VIU HO DIU LA CONNEXIÓ, NO JO.
     El primer intent el triava pel valor més recent, i això falla just el dia
     que es refà la connexió: aquell dia els DOS tenen valor, el vell del matí
     i el nou de la tarda, i llavors el desempat era l'ordre de la llista. Va
     arxivar el bo. La sessió del banc porta els comptes que està llegint ara
     mateix: el que hi surt és el viu i no hi ha res a endevinar. */
  var vius = {};
  try {
    var e = FinancesBanc.estat();
    (e.accounts || []).forEach(function (c) {
      vius['auto_' + String(c.uid).slice(0, 12)] = true;
      var num = String(c.iban || '').replace(/\s/g, '').slice(-10);
      if (num) vius['auto_ib' + num] = true;
    });
  } catch (err) { /* sense banc connectat: es decidirà com es pugui */ }

  var parelles = [], dubtes = [];
  Object.keys(grups).forEach(function (k) {
    var g = grups[k];
    if (g.length < 2) return;

    /* Un grup ja arreglat —un de sol sense arxivar i la resta apartats— no té
       res a proposar. Sense això, cada vegada tornaria a oferir la mateixa
       fusió que ja es va fer. */
    var sencers = g.filter(function (x) { return !x.esborrat_el; });
    if (sencers.length === 1 && vius[sencers[0].id]) return;
    if (sencers.length === 1 && !Object.keys(vius).length) return;

    var elsVius = g.filter(function (x) { return vius[x.id]; });

    if (elsVius.length === 1) {
      var bo = elsVius[0];
      g.forEach(function (x) { if (x.id !== bo.id) parelles.push({ vell: x.id, bo: bo.id, per: 'la connexió' }); });
      return;
    }

    /* Si la connexió no en reconeix cap —o en reconeix més d'un—, es mira el
       valor més recent. I si empaten, NO s'endevina: es pregunta. Equivocar-se
       de compte vol dir arxivar el bo, i això ja ha passat un cop. */
    g.sort(function (p, q) {
      var up = ultim(p.id), uq = ultim(q.id);
      return String(uq ? uq.data : '').localeCompare(String(up ? up.data : ''));
    });
    var d0 = ultim(g[0].id), d1 = ultim(g[1].id);
    if (elsVius.length > 1 || (d0 && d1 && d0.data === d1.data)) {
      dubtes.push(g);
      return;
    }
    for (var i = 1; i < g.length; i++) parelles.push({ vell: g[i].id, bo: g[0].id, per: 'la data' });
  });

  if (dubtes.length) {
    a('NO ME N\'ACABO DE FIAR, i per això no proposo res.');
    a('');
    dubtes.forEach(function (g) {
      g.forEach(function (x) {
        var u = ultim(x.id);
        a('  ' + x.nom + '  (' + x.id + ')');
        a('      ' + (u ? u.valor + ' € del ' + u.data : 'sense valors') +
          ' · ' + (hist[x.id] || []).length + ' valors');
      });
      a('');
    });
    a('Tots dos tenen valor del mateix dia i la connexió del banc no em diu quin');
    a('està llegint ara. Digue\'m tu quin és el bo —el del saldo que tens de debò—');
    a('i executa:  fusionaPatrimoni("id del vell", "id del bo")');
    a('...o digue-m\'ho a mi i t\'ho deixo preparat en un botó.');
    PropertiesService.getScriptProperties().deleteProperty(PROP_FUSIO);
    return l.join('\n');
  }

  if (!parelles.length) {
    a('No trobo cap compte duplicat.');
    a('');
    a('Si en veus un que jo no veig, fes mirarPatrimoni() i digue-m\'ho:');
    a('vol dir que els dos comptes no s\'assemblen en res que jo pugui comparar.');
    PropertiesService.getScriptProperties().deleteProperty(PROP_FUSIO);
    return l.join('\n');
  }

  a('HE TROBAT ' + parelles.length + (parelles.length === 1 ? ' duplicat' : ' duplicats'));
  a('');
  parelles.forEach(function (p) {
    var vell = Dades.perId('Patrimoni', p.vell);
    var bo = Dades.perId('Patrimoni', p.bo);
    var uv = ultim(p.vell), ub = ultim(p.bo);
    a('  Es queda:  ' + bo.nom + '  (' + p.bo + ')');
    a('             ' + (ub ? ub.valor + ' € del ' + ub.data : 'sense valors') +
      ' · ' + (hist[p.bo] || []).length + ' valors');
    a('             el trio per ' + p.per);
    a('  S\'hi ajunta: ' + vell.nom + '  (' + p.vell + ')');
    a('             ' + (uv ? uv.valor + ' € del ' + uv.data : 'sense valors') +
      ' · ' + (hist[p.vell] || []).length + ' valors, que passen al que es queda');
    a('');
  });

  PropertiesService.getScriptProperties()
    .setProperty(PROP_FUSIO, JSON.stringify(parelles));

  a('Si això és el que vols, executa ara:  fusionaAra');
  a('Si no ho és, no executis res i digue\'m què hauria de sortir.');
  return l.join('\n');
}

/** Fa el que ha dit `preparaFusio()`. Cal haver-la executat abans. */
function fusionaAra() {
  var brut = PropertiesService.getScriptProperties().getProperty(PROP_FUSIO);
  var parelles = Utils.desJson(brut, null);
  if (!parelles || !parelles.length) {
    return 'Primer executa preparaFusio() i mira que el que digui sigui el que vols.';
  }

  var l = [];
  parelles.forEach(function (p) {
    l.push(fusionaPatrimoni(p.vell, p.bo));
    l.push('');
  });

  PropertiesService.getScriptProperties().deleteProperty(PROP_FUSIO);
  l.push('Fet. Obre finances → patrimoni i mira que la línia sigui la que esperaves.');
  var text = l.join('\n');
  Logger.log(text);
  return text;
}


/**
 * DESFÀ L'ÚLTIMA FUSIÓ.
 *
 * Treu l'arxivat al compte que es va apartar. Els valors que s'haguessin
 * copiat es queden on són —aquí no s'esborra res mai— però com que el que
 * mana és l'últim valor de cada compte, tornar a fer la fusió al dret els
 * torna a deixar bé.
 */
function desfesLaFusio() {
  var l = [];
  function a(t) { l.push(t); Logger.log(t); }

  var props = PropertiesService.getScriptProperties();
  var feta = Utils.desJson(props.getProperty(PROP_FUSIO_FETA), null);

  if (!feta || !feta.vell) {
    a('No tinc constància de cap fusió feta per mi.');
    a('');
    a('Si n\'hi ha una per desfer, fes mirarPatrimoni() i digue-m\'ho: al full');
    a('es recupera treient la data de la columna `esborrat_el` de la fila.');
    return l.join('\n');
  }

  var vell = Dades.perId('Patrimoni', feta.vell);
  if (!vell) { a('L\'actiu ' + feta.vell + ' ja no hi és.'); return l.join('\n'); }

  Dades.actualitza('Patrimoni', feta.vell, { esborrat_el: '' });
  props.deleteProperty(PROP_FUSIO_FETA);
  props.deleteProperty(PROP_FUSIO);

  a('«' + vell.nom + '» (' + feta.vell + ') ja no està arxivat.');
  if (feta.copiats) {
    a('');
    a(feta.copiats + ' valors s\'havien copiat a l\'altre compte i s\'hi queden.');
    a('No molesten: el que mana és l\'últim valor de cada compte.');
  }
  a('');
  a('Ara torna a fer preparaFusio() i mira bé quin es queda.');
  return l.join('\n');
}


/**
 * PER QUÈ NO M'HAS ENTRAT ELS MOVIMENTS?
 *
 * Quan al matí has gastat i a la tarda no hi ha res a l'app, hi ha cinc coses
 * que poden haver passat i des de fora totes es veuen igual. Aquesta funció
 * les mira una per una i acaba ANANT AL BANC de debò, ara mateix, per si el
 * que falla és l'automatisme i no la connexió.
 *
 * No escriu res que la sincronització normal no escrigués igualment.
 */
function queSapElBanc() {
  var l = [];
  function a(t) { l.push(t); Logger.log(t); }

  a('EL BANC, PAS PER PAS');
  a('');


  /* 0. LA CLAU. Va primer perque si no serveix, tota la resta es soroll: no
     s'arriba ni a demanar res al banc, i des de fora sembla que el banc no
     doni res. */
  var potSignar = true;
  try {
    // Amb la clau TAL COM ES FARÀ SERVIR, plegada. Provar-la en cru deia que
    // no serveix quan sí que serveix, que és mentir a l'inrevés.
    Utilities.computeRsaSha256Signature('prova', FinancesBanc.clauPem());
  } catch (errClau) { potSignar = false; }

  a('0. LA CLAU PER SIGNAR');
  a('   serveix ........... ' + (potSignar ? 'si' : 'NO'));
  if (!potSignar) {
    a('');
    a("AQUI S'ATURA TOT. Sense poder signar no s'arriba ni a demanar res al");
    a("banc, i el que es veu des de fora es que el banc no dona res.");
    a("Executa provaClauBanc(): et dira que li passa i com arreglar-ho.");
    return l.join('\n');
  }
  // 1. Hi ha connexió?
  if (typeof FinancesBanc === 'undefined') { a('El mòdul del banc no existeix.'); return l.join('\n'); }
  var e = FinancesBanc.estat();
  a('1. CONNEXIÓ');
  a('   connectat ......... ' + (FinancesBanc.disponible() ? 'sí' : 'NO'));
  a('   comptes ........... ' + ((e.accounts || []).length));
  (e.accounts || []).forEach(function (c) {
    a('       · ' + (c.iban ? '···' + String(c.iban).slice(-4) : String(c.uid).slice(0, 12)));
  });
  if (e.valid_until) {
    var dies = Utils.diesEntre(Utils.avui(), String(e.valid_until).slice(0, 10));
    a('   el permís caduca .. ' + String(e.valid_until).slice(0, 10) +
      (dies !== null ? '  (' + (dies < 0 ? 'JA HA CADUCAT' : 'd\'aquí ' + dies + ' dies') + ')' : ''));
  }
  if (!FinancesBanc.disponible()) {
    a('');
    a('Sense connexió no hi ha res a fer: torna a executar connectaBanc().');
    return l.join('\n');
  }

  // 2. Els automatismes hi són?
  a('');
  a('2. AUTOMATISMES');
  var hores = [];
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'triggerBanc') hores.push(t.getUniqueId().slice(0, 6));
  });
  a('   triggers de banc .. ' + hores.length + (hores.length ? '' : '  ← CAP: executa instalaTriggers()'));
  a('   n\'hi hauria d\'haver 3 (6:00, 15:00 i 20:00)');
  if (hores.length && hores.length !== 3) {
    a('   ← el nombre no quadra: executa instalaTriggers() i torna-hi');
  }

  // 3. Quan es va mirar per última vegada?
  a('');
  a('3. ÚLTIMA MIRADA');
  var com = FinancesBanc.comEstem();
  a('   quan .............. ' + (com.quan ? com.quan + '  (' + com.fa + ')' : 'mai'));
  if (com.error) a('   últim error ....... ' + com.error);

  // 4. Què hi ha entrat últimament?
  a('');
  a('4. ELS ÚLTIMS MOVIMENTS QUE VAN ENTRAR DEL BANC');
  var delBanc = Dades.llegeix('Moviments', function (m) {
    return !m.esborrat_el && m.origen === 'banc';
  });
  delBanc.sort(function (x, y) { return String(y.data).localeCompare(String(x.data)); });
  if (!delBanc.length) a('   cap. No n\'ha entrat mai cap del banc.');
  delBanc.slice(0, 6).forEach(function (m) {
    a('   ' + m.data + '  ' + (m.tipus === 'i' ? '+' : '−') + m['import'] + '  ' +
      Utils.talla(m.descripcio, 40));
  });

  // 5. I ara s'hi va, ara mateix.
  a('');
  a('5. HI VAIG ARA');
  var r;
  try {
    r = ambBloqueig_(function () { return FinancesBanc.sincronitza(); });
  } catch (err) {
    a('   ha petat: ' + err.message);
    a('');
    a('Si diu res de quota o de 429, és el banc que no deixa mirar-hi més');
    a('vegades avui. Si diu una altra cosa, passa-m\'ho.');
    return l.join('\n');
  }

  a('   moviments nous .... ' + r.nous);
  a('   ja sabuts ......... ' + r.jaSabuts);
  a('   saldos desats ..... ' + r.saldos);
  if (r.errors && r.errors.length) r.errors.forEach(function (x) { a('   error: ' + x); });

  a('');
  if (r.errors && r.errors.length) {
    /* AMB ERRORS NO ES POT DIR QUE EL BANC NO EN TINGUI: no els hi hem
       arribat a demanar. La primera versió d'això ho deia igualment, amb
       l'error imprès dues línies més amunt, i va enviar en Pol a esperar el
       banc quan el que fallava era la clau. */
    a('NO ES POT DIR QUE EL BANC NO EN TINGUI: la petició ha fallat, o sigui');
    a('que ni els hi hem demanat. Mira l\'error de sobre.');
    a('Si parla de «key» o de signar, executa provaClauBanc().');
  } else if (r.nous) {
    a('N\'han entrat ' + r.nous + ' ara mateix.');
    /* I NO S'ACUSA L'AUTOMATISME SI JA SE SAP QUÈ FALLAVA.
       La primera versió deia sempre «el que fallava era l'automatisme», i el
       dia que va entrar bé el que havia fallat era la clau —amb el motiu
       imprès quatre línies més amunt, al punt 3—. Si hi ha un error apuntat,
       el que fallava és allò i ja està arreglat. */
    if (com.error) {
      a('Abans fallava per això que diu el punt 3, i ara ja no: aquell problema');
      a('està resolt. Els automatismes tornaran a anar sols a les 6, les 15 i');
      a('les 20 sense que hagis de fer res.');
    } else {
      a('La connexió va bé i no hi havia cap error apuntat: si a l\'hora que');
      a('tocava no van entrar, mira els automatismes del punt 2.');
    }
  } else {
    a('La petició ha anat bé i el banc no en dona cap de nou. Si tu saps que');
    a('n\'hi ha d\'aquest matí, vol dir que EL BANC encara no els ha publicat:');
    a('les targetes solen trigar hores i de vegades fins l\'endemà.');
    a('Compara les dates del punt 4 amb el que et surt a l\'app del banc.');
  }
  return l.join('\n');
}


/**
 * LA CLAU PRIVADA DEL BANC, MIRADA DE PROP.
 *
 * Apps Script, quan una clau RSA no li serveix, diu «Invalid argument: key» i
 * res més. Ni per què, ni quina. Aquí es mira la forma de la clau abans de
 * fer-la servir —que és on es veuen els problemes de debò— i després es prova
 * de signar-hi.
 *
 * NO ENSENYA LA CLAU. Només com és: si comença i acaba com ha de començar i
 * acabar, si té salts de línia de veritat, i quant fa.
 */
function provaClauBanc() {
  var l = [];
  function a(t) { l.push(t); Logger.log(t); }

  var props = PropertiesService.getScriptProperties();
  var clau = props.getProperty('EB_PRIVATE_KEY');
  var app = props.getProperty('EB_APP_ID');

  a('LA CLAU PRIVADA DEL BANC');
  a('');

  if (!app) a('EB_APP_ID .......... NO HI ÉS');
  else a('EB_APP_ID .......... ' + app.slice(0, 8) + '…  (' + app.length + ' caràcters)');

  if (!clau) {
    a('EB_PRIVATE_KEY ..... NO HI ÉS');
    a('');
    a('Ves a Apps Script → Configuració del projecte → Propietats de l\'script');
    a('i torna-hi a posar la clau privada que et va donar Enable Banking.');
    return l.join('\n');
  }

  a('EB_PRIVATE_KEY ..... ' + clau.length + ' caràcters');
  a('');

  var comenca = /^-----BEGIN (RSA )?PRIVATE KEY-----/.test(clau.trim());
  var acaba = /-----END (RSA )?PRIVATE KEY-----\s*$/.test(clau.trim());
  var saltsDeVeritat = clau.indexOf('\n') !== -1;
  var saltsEscrits = clau.indexOf('\n') !== -1;

  a('   comença per -----BEGIN ...... ' + (comenca ? 'sí' : 'NO'));
  a('   acaba per -----END ......... ' + (acaba ? 'sí' : 'NO'));
  a('   té salts de línia de debò ... ' + (saltsDeVeritat ? 'sí' : 'NO'));
  if (saltsEscrits) a('   ← porta \n ESCRITS com a dues lletres, i això no val');
  a('');

  var problemes = [];
  if (!comenca) problemes.push('no comença per -----BEGIN PRIVATE KEY-----');
  if (!acaba) problemes.push('no acaba per -----END PRIVATE KEY-----');
  if (saltsEscrits) problemes.push('porta \n escrits en comptes de salts');

  /* I ara la prova de debò, amb la clau TAL COM ES FARÀ SERVIR.
     El quadre de Propietats de l'script és d'una sola línia i es menja els
     salts en enganxar-hi un .pem: la clau se'n va plana. Abans de signar es
     torna a plegar. Provar-la aquí sense plegar-la diria que no serveix quan
     sí que servirà, i faria perseguir un problema que ja no hi és. */
  var plana = !saltsDeVeritat;
  var signa = true, motiu = '';
  try {
    Utilities.computeRsaSha256Signature('prova', FinancesBanc.clauPem());
  } catch (err) {
    signa = false; motiu = err.message;
  }

  if (plana) {
    a('   ← el quadre de Propietats no deixa desar salts de línia. La clau');
    a('     es torna a plegar sola abans de signar-hi: no has de fer res.');
    a('');
  }
  a('   SIGNA? ..................... ' + (signa ? 'SÍ' : 'NO — ' + motiu));
  a('');

  if (signa) {
    a('La clau serveix' + (plana ? ', un cop plegada' : '') + '. Si el banc segueix sense');
    a('donar res, el problema és un altre: executa queSapElBanc() i passa-m\'ho.');
    return l.join('\n');
  }

  a('AIXÒ ÉS EL QUE FA QUE NO ENTRIN ELS MOVIMENTS.');
  a('');
  if (problemes.length) {
    a('El que li veig de mal:');
    problemes.forEach(function (p) { a('   · ' + p); });
    a('');
  }
  a('Com arreglar-ho:');
  a('   1. Apps Script → Configuració del projecte → Propietats de l\'script');
  a('   2. Esborra el valor de EB_PRIVATE_KEY i torna-hi a enganxar el fitxer');
  a('      .pem sencer que et va donar Enable Banking, TAL QUAL: amb la línia');
  a('      del BEGIN, la del END i els salts de línia de cada ratlla.');
  a('   3. Torna a executar provaClauBanc() i mira que digui SIGNA? SÍ.');
  a('');
  a('Si l\'has perduda, se\'n genera una de nova a enablebanking.com i s\'ha de');
  a('registrar allà mateix: la vella deixa de servir.');
  return l.join('\n');
}


/**
 * ESCALFAR LES PANTALLES — cada quart d'hora.
 *
 * Desar les pantalles fa que la segona vegada que les obres sigui ràpida.
 * Això fa que la primera també ho sigui: quan hi arribes, ja estan muntades.
 *
 * NO ÉS CAR. `Memoria.recorda` només munta quan no ho té: si res no ha
 * canviat des de fa un quart d'hora, això són quatre lectures de memòria i
 * prou. La feina només es fa quan alguna cosa s'ha escrit, que és exactament
 * quan cal fer-la.
 *
 * NO FALLA MAI CAP A FORA. Escalfar és un luxe: si una pantalla peta mentre
 * es munta, es deixa estar i el registre ho diu. El que no pot passar és que
 * un automatisme d'aquests trenqui res.
 */
/**
 * EL REPARTIDOR DELS AVISOS DELS MÒDULS.
 *
 * Un automatisme d'Apps Script no pot rebre paràmetres, o sigui que totes les
 * hores instal·lades criden aquí i és aquesta funció la que mira quina hora és
 * i a qui li toca. Un mòdul que peti no s'emporta els altres: es registra i se
 * segueix, que és la mateixa regla que a tot arreu.
 */
function triggerAvisos() {
  var ara = new Date();
  var hora = ara.getHours();
  var dia = ara.getDay() === 0 ? 7 : ara.getDay();     // 1 = dilluns … 7 = diumenge
  var enviats = 0, mirats = 0;

  Moduls.avisos().forEach(function (a) {
    if (a.hora !== hora) return;
    if (a.dia !== null && a.dia !== dia) return;
    if (typeof a.mira !== 'function') return;
    mirats++;
    try {
      var r = ambBloqueig_(function () { return a.mira(); });
      /* Retornar null vol dir «avui no hi ha res a dir», i no és cap error:
         un avís que pica cada setmana tant si passa alguna cosa com si no
         deixa de voler dir res al cap de tres setmanes. */
      if (!r || !r.titol) return;
      /* EL TÍTOL ÉS EL NOM DEL MÒDUL, no el que digui l'avís.
         El mòdul escriu què passa; d'on ve ho sap el nucli, que és qui té el
         registre. Així cap mòdul no s'ha de recordar de la regla, i el que
         escrigui al `titol` no es perd: encapçala el cos. */
      var m = Moduls.perId(a.modul);
      Notifica.envia(
        (m && m.nom) || a.modul,
        Notifica.junta(r.titol, r.cos),
        { url: r.url || a.modul, etiqueta: 'avis-' + a.modul + '-' + a.id }
      );
      enviats++;
    } catch (err) {
      Log.error('trigger.avisos', 'Avís ' + a.modul + '.' + a.id + ': ' + err.message);
    }
  });

  if (mirats) Log.info('trigger.avisos', 'Avisos mirats', { hora: hora, mirats: mirats, enviats: enviats });
}

/**
 * QUÈ TENS DEMÀ, a les onze i mitja de la nit.
 *
 * No inventa res: pregunta als mòduls el mateix que la pàgina del dia, però
 * amb la data de demà. Moduls.elDia(data) ja acceptava una data qualsevol
 * des del primer dia; l'únic que faltava era algú que la hi demanés.
 *
 * Vol dir que un mòdul nou hi surt sol, sense tocar això. I que els que no
 * tenen res a dir d'un dia que no ha arribat —els hàbits, el diari— ja callen
 * ells mateixos.
 *
 * SI DEMÀ NO HI HA RES, NO PICA. Un avís que arriba cada nit tant si tens
 * coses com si no deixa de voler dir res al cap de tres dies, i el que
 * volies era justament no deixar-te res.
 */
function triggerDema() {
  try {
    var dema = Utils.sumaDies(Utils.avui(), 1);
    var blocs = Moduls.elDia(dema);
    if (!blocs || !blocs.length) {
      Log.info('trigger.dema', 'Demà no hi ha res, cap avís', { data: dema });
      return;
    }

    /* Un bloc per línia, amb les seves coses seguides. A la notificació no hi
       cap una llista amb sagnats: el que ha de fer és que sàpigues si has de
       preparar res, i obrir-la si vols el detall. */
    var cos = blocs.map(function (b) {
      var quines = b.coses.slice(0, 4).map(function (c) { return c.text; });
      if (b.coses.length > 4) quines.push('i ' + (b.coses.length - 4) + ' més');
      return b.titol + ': ' + quines.join(' · ');
    }).join('\n');

    var quantes = blocs.reduce(function (n, b) { return n + b.coses.length; }, 0);
    var r = Notifica.envia(
      'Demà',
      cos,
      { etiqueta: 'dema', url: './#dia:' + dema }
    );
    Log.info('trigger.dema', 'Repàs de demà enviat',
             { data: dema, blocs: blocs.length, coses: quantes, enviades: r.enviades });
  } catch (err) {
    Log.error('trigger.dema', err);
  }
}

function triggerEscalfa() {
  var t0 = Date.now();
  var fets = [], fallats = [];

  function escalfa(nom, fn) {
    try { fn(); fets.push(nom); }
    catch (err) { fallats.push(nom + ': ' + err.message); }
  }

  var m = Moduls.actius();
  for (var i = 0; i < m.length; i++) {
    var id = m[i].id;
    var accions = m[i].accions || {};

    /* El que no surt d'un full no s'escalfa AQUÍ, que és cada cinc minuts:
       el calendari, les tasques i l'escola es llegeixen de fora i costen
       segons, no mil·lisegons. Van a `triggerEscalfaFora`, cada quart d'hora.
       Aquesta ratlla, però, era la que feia que obrir l'app trigués entre 8 i
       16 segons: se'ls saltava i no els escalfava ningú. */
    if (m[i].volatil) continue;

    // Les targetes de la pantalla d'inici també, que és la primera que veus.
    if (typeof m[i].resumInici === 'function') {
      escalfa(id + ':targeta', (function (mod) {
        return function () {
          Memoria.recorda(mod.id, 'resumInici', function () { return mod.resumInici(); });
        };
      })(m[i]));
    }

    /* Cada mòdul s'escalfa per la porta per on hi entres tu, i amb els
       paràmetres de sèrie: el mes en curs, el dia d'avui. La resta —un mes
       de fa mig any, l'històric d'un hàbit— es munta quan hi vas, que és de
       tant en tant i no val la pena tenir-ho calent sempre. */
    if (typeof accions.pantalla === 'function') {
      escalfa(id, (function (a) { return function () { a({}); }; })(accions.pantalla));
    } else if (typeof accions.dia === 'function') {
      escalfa(id, (function (a) { return function () { a({}); }; })(accions.dia));
    }
  }

  /* LA FITXA QUE LLEGEIX LA IA, TAMBÉ.
     Cada cosa que li dius a JEFE —escrita o de veu— es prepara amb el que
     tenen a dir tots els mòduls. Es desa mitja hora, però no l'escalfava
     ningú: la primera pregunta de cada estona la pagava ell, i just abans de
     posar-se a esperar el model, que ja triga per si sol. Aquí no costa gairebé
     res perquè el que la fitxa mira ja acaba de quedar calent tres línies més
     amunt. */
  escalfa('fitxa de la IA', function () { Moduls.contextIA({ compacte: true }); });

  /* Es deixa dit quant ha trigat. Aquest automatisme s'executa unes tres-centes
     vegades al dia i el pot d'automatismes és de noranta minuts: si un dia
     s'allargués, aquí es veuria abans que no pas quedant-nos sense avisos. */
  var ms = Date.now() - t0;
  if (fallats.length) {
    Log.avis('escalfa', 'Alguna pantalla no s\'ha pogut escalfar', { fallats: fallats, ms: ms });
  } else {
    Log.info('escalfa', 'Pantalles a punt', { quantes: fets.length, ms: ms });
  }
  /* Al registre de l'editor també: quan l'executes a mà des d'allà, el que
     retorna una funció no es veu enlloc, i sense això sembla que no hagi fet
     res. Va passar. */
  var resum = fets.join(', ') + '  ·  ' + ms + ' ms';
  Logger.log(resum);
  return resum;
}


/**
 * EL QUE ES LLEGEIX DE FORA, ESCALFAT A PART.
 *
 * El calendari, les tasques i els pendents de l'escola no surten del full: van
 * a Google Calendar, a Google Tasks i a l'altre script d'Apps Script. Mesurat
 * el 4 d'agost del 2026: 6,5 s el calendari, 2 s les tasques, 3,6 s l'escola.
 * Sumats, són els 8 a 16 segons que trigava obrir l'app, perquè la targeta
 * d'inici de cadascun els construïa allà mateix mentre tu miraves.
 *
 * Ara les targetes no construeixen res: agafen el que hi ha desat. Qui ho desa
 * és això, i va a part de `triggerEscalfa` per una raó de comptes:
 *
 *   - `triggerEscalfa` va cada 5 min i costa uns pocs segons: són fulls.
 *   - això va cada 15 i costa uns dotze segons: són viatges a fora.
 *
 * A cinc minuts, això sol serien 57 minuts diaris del pot de 90 que té aquest
 * compte per a TOTS els automatismes. A quinze, i dormint de nit, en són uns
 * catorze. La diferència per a tu és zero: el que es desa dura 25 minuts.
 */
function triggerEscalfaFora() {
  /* De matinada no s'escalfa res. Ningú obre JEFE a les tres i mitja, i cada
     passada que no es fa és pot que queda per als avisos. */
  var hora = Number(Utilities.formatDate(new Date(), Config.zonaHoraria(), 'H'));
  if (hora < 6) return 'de nit no escalfo res';

  var t0 = Date.now();
  var fets = [], fallats = [];

  var m = Moduls.actius();
  for (var i = 0; i < m.length; i++) {
    if (typeof m[i].escalfa !== 'function') continue;
    try {
      var r = m[i].escalfa();
      fets.push(m[i].id + (r && r.ms ? ' ' + r.ms + 'ms' : '') +
                (r && r.detall ? ' [' + r.detall + ']' : ''));
    } catch (err) {
      fallats.push(m[i].id + ': ' + err.message);
    }
  }

  var ms = Date.now() - t0;
  if (fallats.length) {
    Log.avis('escalfa.fora', 'Alguna cosa de fora no s\'ha pogut escalfar',
             { fallats: fallats, ms: ms });
  } else {
    Log.info('escalfa.fora', 'El de fora, a punt', { quantes: fets.length, ms: ms });
  }
  /* Al registre de l'editor també: quan l'executes a mà des d'allà, el que
     retorna una funció no es veu enlloc, i sense això sembla que no hagi fet
     res. Va passar. */
  var resum = fets.join(', ') + '  ·  ' + ms + ' ms';
  Logger.log(resum);
  return resum;
}


/**
 * MIRAR SI JEFE ARRIBA A INTERVALS.ICU, i què hi troba.
 *
 * Es fa abans d'escriure cap mòdul a posta: el que porta una activitat de
 * força pujada per Gravl no ho sé, i prometre què sortirà al control de
 * divendres sense haver-ho vist seria inventar-m'ho.
 *
 * NO ESCRIU RES ENLLOC. Llegeix i informa.
 */
function provaIntervals() {
  var l = [];
  function a(t) { l.push(t); Logger.log(t); }

  var clau = PropertiesService.getScriptProperties().getProperty(PROP_CLAU_INTERVALS);
  if (!clau) {
    a('No hi ha cap clau.');
    a('');
    a('Editor → Configuració del projecte → Propietats de l\'script →');
    a('afegeix ' + PROP_CLAU_INTERVALS + ' amb la clau de intervals.icu');
    a('(Settings → Developer Settings).');
    return l.join('\n');
  }
  a('Clau trobada (' + clau.length + ' caràcters). No la imprimeixo.');

  var cap = { Authorization: 'Basic ' + Utilities.base64Encode('API_KEY:' + clau) };
  var atleta = Config.get('intervals_atleta') || 'i666802';

  /* L'identificador el va escriure una persona i pot venir amb la i o sense.
     Es proven les dues formes abans de dir que alguna cosa falla: fer-lo
     perseguir un error de format seria fer-li perdre la tarda. */
  var formes = [atleta, String(atleta).replace(/^i/, ''), 'i' + String(atleta).replace(/^i/, '')];
  var vistes = {}, prova = [];
  formes.forEach(function (f) { if (!vistes[f]) { vistes[f] = true; prova.push(f); } });

  var bo = null, ultimError = '';
  for (var i = 0; i < prova.length && !bo; i++) {
    var r = UrlFetchApp.fetch('https://intervals.icu/api/v1/athlete/' + prova[i] + '/profile', {
      headers: cap, muteHttpExceptions: true
    });
    if (r.getResponseCode() === 200) { bo = prova[i]; break; }
    ultimError = prova[i] + ' → ' + r.getResponseCode() + ' ' +
                 Utils.talla(r.getContentText(), 120);
  }

  if (!bo) {
    a('No hi entro. Última resposta: ' + ultimError);
    a('');
    a('Si diu 401 o 403, la clau no és bona o s\'ha regenerat.');
    a('Si diu 404, l\'identificador d\'atleta no és aquest.');
    return l.join('\n');
  }
  a('Hi entro. Identificador bo: ' + bo);
  if (bo !== atleta) a('(l\'he hagut d\'ajustar; el codi ja se n\'apunta la forma bona)');

  // Les activitats dels últims noranta dies
  var fins = Utils.avui();
  var desde = Utils.sumaDies(fins, -90);
  var res = UrlFetchApp.fetch('https://intervals.icu/api/v1/athlete/' + bo +
      '/activities?oldest=' + desde + '&newest=' + fins,
      { headers: cap, muteHttpExceptions: true });

  if (res.getResponseCode() !== 200) {
    a('El perfil sí, però les activitats no: ' + res.getResponseCode() + ' ' +
      Utils.talla(res.getContentText(), 200));
    return l.join('\n');
  }

  var acts = JSON.parse(res.getContentText());
  a('');
  a(acts.length + ' activitats entre ' + desde + ' i ' + fins + '.');
  if (!acts.length) {
    a('Cap. Si acabes de connectar Strava, dona-li una estona: la importació');
    a('de l\'històric no és immediata.');
    return l.join('\n');
  }

  /* PRIMER, COM ES DIUEN ELS CAMPS. La versió anterior d'això donava per fet
     que serien `type` i `moving_time` —els noms de Strava— i van sortir 23
     activitats «sense tipus» i de zero minuts. No eren buides: era jo, que
     preguntava per uns noms que aquí no existeixen. Ara es demana la llista
     abans de llegir-ne res. */
  a('');
  a('Els camps que porta una activitat, tal com es diuen:');
  a('  ' + Object.keys(acts[0]).sort().join(', '));

  var ple = function (x, titol) {
    a('');
    a(titol);
    Object.keys(x).sort().forEach(function (c) {
      var v = x[c];
      if (v === null || v === undefined || v === '' || v === 0 || v === false) return;
      if (typeof v === 'object') v = Utils.talla(JSON.stringify(v), 100);
      a('  ' + c + ': ' + Utils.talla(String(v), 110));
    });
  };

  ple(acts[0], 'L\'última activitat, amb tot el que porta ple:');

  /* I LA MATEIXA, DEMANADA SENCERA. La llista pot venir retallada —moltes
     API donen un resum al llistat i el detall a part—, i abans de dir que
     una dada no hi és cal haver-la demanat pel seu camí. */
  var id = acts[0].id || acts[0].activity_id;
  if (id) {
    var una = UrlFetchApp.fetch('https://intervals.icu/api/v1/activity/' + id,
                                { headers: cap, muteHttpExceptions: true });
    if (una.getResponseCode() === 200) {
      var det = JSON.parse(una.getContentText());
      var nous = Object.keys(det).filter(function (c) {
        return acts[0][c] === undefined;
      });
      a('');
      a('Demanada sencera, hi surten ' + nous.length + ' camps més.');
      if (nous.length) ple(det, 'La mateixa, sencera:');
    } else {
      a('');
      a('El detall d\'una activitat no s\'ha pogut demanar: ' + una.getResponseCode());
    }
  }

  return l.join('\n');
}


/**
 * OBRIR EL ZIP DE HEALTH CONNECT I DIR QUÈ HI HA A DINS.
 *
 * Health Connect deixa programar una exportació diària cap a Drive. Si el que
 * hi ha a dins es pot llegir, els entrenaments entren a JEFE sense cap app
 * pont, sense pagar i sense instal·lar res enlloc.
 *
 * No ho dono per fet: hi ha qui diu que va xifrat, i encara que no ho estigui
 * podria ser una base de dades SQLite, que Apps Script no sap obrir. Això ho
 * mira i ho diu.
 *
 * NO ESCRIU RES ENLLOC, i del contingut només n'ensenya l'estructura i un
 * tastet: el que es busca és de quina forma són les dades, no quines són.
 */
function provaExportSalut() {
  var l = [];
  function a(t) { l.push(t); Logger.log(t); }

  // El fitxer, es digui com es digui i sigui a la carpeta que sigui
  var trobats = [];
  var vist = {};
  var afegeix = function (it) {
    while (it.hasNext()) {
      var f = it.next();
      if (vist[f.getId()]) continue;
      vist[f.getId()] = true;
      trobats.push(f);
    }
  };
  try { afegeix(DriveApp.getFilesByName('Health Connect.zip')); } catch (e) {}
  try { afegeix(DriveApp.searchFiles('title contains "Health Connect"')); } catch (e) {}

  if (!trobats.length) {
    a('No trobo cap fitxer que es digui «Health Connect» al Drive.');
    a('');
    a('Si acabes de programar l\'exportació, encara no l\'ha feta: la diària');
    a('salta un cop al dia, no en programar-la. Torna-hi demà.');
    a('');
    a('I comprova a Ajustos → Health Connect → Gestionar dades → Còpia de');
    a('seguretat que digui que la darrera exportació ha anat bé.');
    return l.join('\n');
  }

  trobats.sort(function (x, y) { return y.getLastUpdated() - x.getLastUpdated(); });
  a(trobats.length + (trobats.length === 1 ? ' fitxer trobat:' : ' fitxers trobats:'));
  trobats.slice(0, 5).forEach(function (f) {
    a('  ' + f.getName() + '  ·  ' + Math.round(f.getSize() / 1024) + ' kB  ·  ' +
      Utilities.formatDate(f.getLastUpdated(), Config.zonaHoraria(), 'yyyy-MM-dd HH:mm'));
  });

  var fitxer = trobats[0];
  a('');
  a('Obrint el més recent: ' + fitxer.getName());

  var peces;
  try {
    peces = Utilities.unzip(fitxer.getBlob().setContentType('application/zip'));
  } catch (err) {
    a('');
    a('NO S\'OBRE: ' + err.message);
    a('');
    a('Si diu que no és un zip vàlid o demana contrasenya, va xifrat i');
    a('aquest camí no serveix. Ho mirem per un altre costat.');
    return l.join('\n');
  }

  a('S\'obre. Hi ha ' + peces.length + (peces.length === 1 ? ' peça:' : ' peces:'));
  a('');

  peces.forEach(function (p) {
    var bytes = p.getBytes();
    var mida = bytes.length;
    a('  ' + p.getName() + '  ·  ' + Math.round(mida / 1024) + ' kB');

    /* De quina mena és, mirat pels primers bytes i no pel nom: una extensió
       la posa qui vol i els bytes no menteixen. */
    var cap = '';
    for (var i = 0; i < Math.min(16, mida); i++) {
      var c = bytes[i] & 0xFF;
      cap += (c >= 32 && c < 127) ? String.fromCharCode(c) : '.';
    }
    a('      comença per: ' + cap);

    if (cap.indexOf('SQLite format') === 0) {
      a('      → és una base de dades SQLite. Apps Script no la sap obrir.');
      return;
    }

    /* Si sembla text, un tastet de les primeres línies: amb això ja es veu si
       són JSON, CSV o una altra cosa, i quins camps porta. */
    var textual = true;
    for (var k = 0; k < Math.min(200, mida); k++) {
      var b = bytes[k] & 0xFF;
      if (b === 0 || (b < 9 && b !== 0) || (b > 13 && b < 32)) { textual = false; break; }
    }
    if (!textual) { a('      → no és text.'); return; }

    var text;
    try { text = p.getDataAsString(); } catch (e) { a('      → no s\'ha pogut llegir com a text.'); return; }
    var linies = text.split('\n');
    a('      → text, ' + linies.length + ' línies. Les tres primeres:');
    linies.slice(0, 3).forEach(function (x) { a('        ' + Utils.talla(x, 160)); });
  });

  a('');
  a('Enganxa\'m tot això i et dic si els entrenaments hi són i com agafar-los.');
  return l.join('\n');
}
