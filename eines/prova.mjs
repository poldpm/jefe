/**
 * JEFE — proves del nucli
 *
 *   npm run prova     (i també des de `npm run puja`)
 *
 * Executa el codi de debò dels fitxers del nucli fora d'Apps Script, amb
 * dobles a sota en lloc de Google Sheets. No toca cap dada teva.
 *
 * Aquí hi va el que es pot comprovar sense el full: decisions de codi amb
 * regles clares. El que depèn de dades reals es comprova a l'app.
 */
import fs from 'fs';
import vm from 'vm';

let falles = 0;
function cal(nom, cond, extra) {
  console.log((cond ? '  ok   ' : '  FALLA') + '  ' + nom + (cond ? '' : '  → ' + extra));
  if (!cond) falles++;
}


/**
 * Carrega TOT el servidor en un sol espai global, com fa Apps Script.
 *
 * Els blocs d aquest fitxer solen carregar un fitxer sol, i n hi ha prou. Per
 * a les coses que travessen el nucli i un modul —els avisos programats, per
 * exemple— no: alla el que es comprova es precisament que es trobin.
 */
function carregaTotElServidor() {
  const ctx = {
    console, Date, JSON, Math, RegExp, Number, String, Object, Array,
    isFinite, isNaN, parseFloat, parseInt, encodeURIComponent, decodeURIComponent,
    Utilities: {}, DriveApp: {}, SpreadsheetApp: {}, UrlFetchApp: {}, CacheService: {},
    LockService: {}, Session: {}, HtmlService: {}, CalendarApp: {}, MailApp: {},
    ContentService: {}, Logger: { log() {} }, ScriptApp: {},
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) }
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  fs.readdirSync('apps-script').filter((f) => f.endsWith('.gs')).sort()
    .forEach((f) => vm.runInContext(fs.readFileSync('apps-script/' + f, 'utf8'), ctx, { filename: f }));
  return ctx;
}

// ---------------------------------------------------------------- encaminador
console.log('\nEncaminador: escriure i tornar la pantalla en una sola crida');
{
  const ctx = {
    Date, Log: { error() {}, avis() {} },
    Utils: { avui: () => '2026-08-01', ara: () => 'ara' },
    Moduls: null, Config: null, IA: null, Esquema: null, ScriptApp: null,
    PropertiesService: null, ContentService: null, HtmlService: null,
    CacheService: null, VERSIO_JEFE: 'prova'
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('apps-script/30_Encaminador.gs', 'utf8'), ctx);

  let vistos = null;
  ctx.Moduls = {
    perId: () => ({
      accions: {
        captura: (p) => { vistos = JSON.parse(JSON.stringify(p)); return { id: 'tsk_1' }; },
        pantalla: (p) => ({ soc: 'la pantalla', params: p })
      }
    })
  };

  const r = ctx.api('tasques', 'captura', { text: 'comprar pa', _pantalla: {} });
  cal('respon ok', r.ok === true, JSON.stringify(r));
  cal('torna el resultat de l\'escriptura', r.dades._resultat.id === 'tsk_1', JSON.stringify(r.dades));
  cal('torna la pantalla refeta', r.dades._pantalla.soc === 'la pantalla', JSON.stringify(r.dades));
  cal('l\'acció NO veu `_pantalla`', vistos && vistos._pantalla === undefined, JSON.stringify(vistos));
  cal('l\'acció sí que veu els seus paràmetres', vistos.text === 'comprar pa', JSON.stringify(vistos));

  // Sense demanar-la, tot ha de quedar exactament com abans.
  const r2 = ctx.api('tasques', 'captura', { text: 'x' });
  cal('sense `_pantalla`, resposta de tota la vida', r2.dades.id === 'tsk_1', JSON.stringify(r2.dades));

  // `pantalla` demanant-se a si mateixa no s'ha de duplicar.
  const r3 = ctx.api('tasques', 'pantalla', { _pantalla: {} });
  cal('`pantalla` no es crida a si mateixa', r3.dades.soc === 'la pantalla', JSON.stringify(r3.dades));

  // Un mòdul sense `pantalla` no ha de petar.
  ctx.Moduls.perId = () => ({ accions: { fes: () => 'fet' } });
  const r4 = ctx.api('qualsevol', 'fes', { _pantalla: {} });
  cal('mòdul sense pantalla: no peta', r4.ok === true && r4.dades === 'fet', JSON.stringify(r4));
}

// ------------------------------------------------------------- actualitzaMoltes
console.log('\nDades.actualitzaMoltes: escriu per trams seguits');
{
  const escriptures = [];
  const capcalera = ['id', 'estat', 'esborrat_el'];
  const files = [];
  for (let i = 1; i <= 10; i++) files.push(['t' + i, 'feta', '']);

  const fulla = {
    getDataRange: () => ({ getValues: () => [capcalera].concat(files) }),
    getRange: (fila, c, n) => ({
      setValues: (v) => { escriptures.push({ fila, n, v }); }
    }),
    getMaxRows: () => 100
  };

  const ctx = {
    Utils: { nouId: () => 'x', ara: () => 'ARA' },
    Config: { full: () => ({ getSheetByName: () => fulla }) },
    LockService: null, Moduls: undefined
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('apps-script/10_Dades.gs', 'utf8'), ctx);

  // t2,t3,t4 seguits · t7 sol · t9,t10 seguits  →  3 escriptures, no 6
  const n = ctx.Dades.actualitzaMoltes('Tasques', ['t3', 't10', 't2', 't7', 't4', 't9'],
                                       { esborrat_el: 'ARA' });
  cal('diu quantes n\'ha tocat', n === 6, String(n));
  cal('agrupa en 3 escriptures i no 6', escriptures.length === 3,
      escriptures.map(e => e.fila + '×' + e.n).join(' '));
  cal('els trams són els que toca',
      escriptures.map(e => e.fila + '×' + e.n).sort().join(' ') === '10×2 3×3 8×1',
      escriptures.map(e => e.fila + '×' + e.n).sort().join(' '));
  cal('escriu el canvi', escriptures[0].v[0][2] === 'ARA', JSON.stringify(escriptures[0].v[0]));
  cal('no toca el que no li han dit',
      escriptures.every(e => e.v.every(f => ['t2','t3','t4','t7','t9','t10'].indexOf(f[0]) !== -1)),
      JSON.stringify(escriptures.map(e => e.v.map(f => f[0]))));

  // Un id que no hi és no ha de fer caure res.
  escriptures.length = 0;
  const n2 = ctx.Dades.actualitzaMoltes('Tasques', ['no_existeix'], { estat: 'x' });
  cal('id inexistent: no escriu res', n2 === 0 && escriptures.length === 0, String(n2));

  // Amb una funció, cada fila rep uns canvis diferents. És el que fa possible
  // reordenar una llista: el mateix camp amb un valor per fila.
  escriptures.length = 0;
  const capcalera2 = ['id', 'ordre'];
  const files2 = [['a', 9], ['b', 9], ['c', 9]];
  const fulla2 = {
    getDataRange: () => ({ getValues: () => [capcalera2].concat(files2) }),
    getRange: (fila, c, n) => ({ setValues: (v) => { escriptures.push({ fila, n, v }); } }),
    getMaxRows: () => 100
  };
  ctx.Config.full = () => ({ getSheetByName: () => fulla2 });
  ctx.Dades.invalida();

  const n3 = ctx.Dades.actualitzaMoltes('Habits', ['c', 'a', 'b'],
                                        (h, i) => ({ ordre: i + 1 }));
  const escrits = escriptures.flatMap(e => e.v).map(f => f[0] + ':' + f[1]).sort().join(' ');
  cal('amb funció, cada fila rep el seu valor', n3 === 3 && escrits === 'a:2 b:3 c:1', escrits);
}

// ------------------------------------------------------------------- comptadors
console.log('\nHàbits: un comptador es compta, no es jutja');
{
  const AVUI = '2026-08-01';

  // Els registres que se li posaran a sota, com si vinguessin del full.
  const registres = [];
  function apunta(idHabit, data, valor) {
    registres.push({ id: 'r' + registres.length, id_habit: idHabit, data, valor, _fila: registres.length + 2 });
  }

  const habits = [
    { id: 'h_cig', nom: 'Cigarros', tipus: 'comptador', objectiu: 0, unitat: 'cigarros',
      frequencia: 'diaria', actiu: 'SI', ordre: 1, creat_el: '2026-07-01T09:00:00+02:00', _fila: 2 },
    { id: 'h_dents', nom: 'Dents', tipus: 'quantitat', objectiu: 2, unitat: '',
      frequencia: 'diaria', actiu: 'SI', ordre: 2, creat_el: '2026-07-01T09:00:00+02:00', _fila: 3 }
  ];

  const ctx = {
    Date, Math, JSON, String, Number, Object, Array, isFinite, parseFloat,
    Log: { info() {}, avis() {}, error() {} },
    Utilities: {
      // Només els dos formats que fa servir Utils.
      formatDate: (d, tz, patro) => patro.indexOf('T') === -1
        ? [d.getFullYear(), ('0' + (d.getMonth() + 1)).slice(-2), ('0' + d.getDate()).slice(-2)].join('-')
        : d.toISOString()
    },
    Config: { zonaHoraria: () => 'Europe/Madrid' },
    Dades: {
      llegeix: (full, filtre) => {
        const files = full === 'Habits' ? habits : registres;
        if (typeof filtre === 'function') return files.filter(filtre);
        if (filtre) return files.filter(f => Object.keys(filtre).every(k => String(f[k]) === String(filtre[k])));
        return files.slice();
      },
      perId: (full, id) => (full === 'Habits' ? habits : registres).filter(f => f.id === id)[0] || null,
      un: (full, filtre) => ctx.Dades.llegeix(full, filtre)[0] || null,
      desa: () => null, insereix: () => null, actualitza: () => null
    },
    ambBloqueig_: (fn) => fn()
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('apps-script/01_Utils.gs', 'utf8'), ctx);
  vm.runInContext(fs.readFileSync('apps-script/40_Mod_Habits.gs', 'utf8'), ctx);
  ctx.Utils.avui = () => AVUI;                      // el rellotge, fixat

  // Set dies: 4, 6, 2, 0(sense registre), 8, 5, 3  →  del 2026-07-26 al 2026-08-01
  apunta('h_cig', '2026-07-26', 4);
  apunta('h_cig', '2026-07-27', 6);
  apunta('h_cig', '2026-07-28', 2);
  apunta('h_cig', '2026-07-30', 8);
  apunta('h_cig', '2026-07-31', 5);
  apunta('h_cig', '2026-08-01', 3);

  const d = ctx.Habits.dia(AVUI);
  const cig = d.habits.filter(h => h.id === 'h_cig')[0];
  const dents = d.habits.filter(h => h.id === 'h_dents')[0];

  cal('el comptador porta la xifra del dia', cig.valor === 3, String(cig.valor));
  cal('un comptador NO és mai exigit', cig.exigit === false, String(cig.exigit));
  cal('un comptador NO es completa mai', cig.complert === false, String(cig.complert));
  cal('un comptador no té percentatge', cig.pct30 === null, String(cig.pct30));
  cal('un comptador no té ratxa', cig.ratxa === 0, String(cig.ratxa));
  cal('mitjana de 7 dies comptant el dia sense registre com a zero',
      cig.mitjana7 === 4, String(cig.mitjana7));   // (4+6+2+0+8+5+3)/7 = 4

  // La setmana anterior (19–25 de juliol) no té res: 0 de mitjana → +4
  cal('diu si puja o baixa respecte la setmana abans', cig.canvi7 === 4, String(cig.canvi7));

  cal('els comptadors NO surten al full de compliment',
      ctx.Habits.mes(AVUI, 30).habits.every(h => h.id !== 'h_cig'),
      ctx.Habits.mes(AVUI, 30).habits.map(h => h.id).join(','));

  cal('un hàbit normal segueix exactament igual',
      dents.exigit === true && dents.objectiu === 2 && dents.pct30 !== null,
      JSON.stringify({ exigit: dents.exigit, objectiu: dents.objectiu, pct30: dents.pct30 }));

  // La mitjana es reparteix entre els dies que l'hàbit ja existia, no set fixos.
  habits[0].creat_el = '2026-07-30T09:00:00+02:00';
  const cig2 = ctx.Habits.dia(AVUI).habits.filter(h => h.id === 'h_cig')[0];
  // Reordenar: el que ell decideix mana sobre l'ordre de creació.
  const escritsOrdre = [];
  ctx.Dades.actualitzaMoltes = (full, ids, fn) => {
    ids.forEach((id, i) => escritsOrdre.push(id + ':' + fn({ id }, i).ordre));
    return ids.length;
  };
  ctx.Habits.ordena(['h_dents', 'h_cig']);
  cal('ordenar numera segons la llista rebuda',
      escritsOrdre.join(' ') === 'h_dents:1 h_cig:2', escritsOrdre.join(' '));

  let potaOrdre = false;
  try { ctx.Habits.ordena(['no_existeix']); } catch (err) { potaOrdre = true; }
  cal('ordenar amb identificadors que no hi són avisa', potaOrdre, 'ho ha deixat fer');

  cal('des que existeix i no set dies sempre',
      cig2.mitjana7 === 5.3, String(cig2.mitjana7));    // (8+5+3)/3 = 5,33
}

// ------------------------------------------------------------------------ diari
console.log('\nDiari: afegir no és substituir, i el resum no depèn de la IA');
{
  const AVUI = '2026-08-01';
  let files = [];
  let seq = 0;
  const notificacions = [];

  const ctx = {
    Date, Math, JSON, String, Number, Object, Array, isFinite, parseFloat,
    Log: { info() {}, avis() {}, error() {} },
    Utilities: {
      formatDate: (d, tz, patro) => patro.indexOf('T') === -1
        ? [d.getFullYear(), ('0' + (d.getMonth() + 1)).slice(-2), ('0' + d.getDate()).slice(-2)].join('-')
        : d.toISOString()
    },
    Config: { zonaHoraria: () => 'Europe/Madrid' },
    Dades: {
      llegeix: (full, filtre) => {
        const vives = files.slice();
        if (typeof filtre === 'function') return vives.filter(filtre);
        if (filtre) return vives.filter(f => Object.keys(filtre).every(k => String(f[k]) === String(filtre[k])));
        return vives;
      },
      insereix: (full, obj) => { const nou = Object.assign({ id: 'd' + (++seq) }, obj); files.push(nou); return nou; },
      actualitza: (full, id, canvis) => {
        const f = files.filter(x => x.id === id)[0];
        if (!f) return null;
        Object.keys(canvis).forEach(k => { f[k] = canvis[k]; });
        return f;
      }
    },
    // Cap mòdul de debò: el diari no n'ha de conèixer ni un.
    Moduls: {
      resumInici: () => [
        { modul: 'habits', etiqueta: 'Hàbits pendents', valor: 2, urgent: true },
        { modul: 'tasques', etiqueta: 'Tasques per fer', valor: 5, urgent: false }
      ],
      resumPeriode: () => [{ modul: 'habits', titol: 'Hàbits', linies: ['Córrer: 4 de 7 dies'] }]
    },
    IA: { disponible: () => false, genera: () => { throw new Error('no hauria de cridar-se'); } },
    Notifica: { envia: (titol, cos) => { notificacions.push({ titol, cos }); return { enviades: 1 }; } }
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('apps-script/01_Utils.gs', 'utf8'), ctx);
  vm.runInContext(fs.readFileSync('apps-script/40_Mod_Diari.gs', 'utf8'), ctx);
  ctx.Utils.avui = () => AVUI;

  ctx.Diari.escriu(AVUI, 'Al matí he anat a la Vall de Boí.', 4, 'app');
  cal('desa l\'entrada del dia', ctx.Diari.entrada(AVUI).text.indexOf('Boí') !== -1,
      JSON.stringify(ctx.Diari.entrada(AVUI)));
  cal('desa l\'ànim', ctx.Diari.entrada(AVUI).anim === 4, String(ctx.Diari.entrada(AVUI).anim));

  // LA REGLA QUE MÉS IMPORTA: des de la conversa s'afegeix, no es substitueix.
  ctx.Diari.afegeixPerNom({ text: 'I al vespre reunió de claustre.' });
  const e = ctx.Diari.entrada(AVUI);
  cal('afegir des de la conversa NO esborra el que hi havia',
      e.text.indexOf('Boí') !== -1 && e.text.indexOf('claustre') !== -1, e.text);
  cal('i no en crea una segona per al mateix dia',
      files.filter(f => f.data === AVUI && f.tipus === 'entrada' && !f.esborrat_el).length === 1,
      String(files.filter(f => f.data === AVUI && f.tipus === 'entrada').length));
  cal('afegir conserva l\'ànim que ja hi havia', e.anim === 4, String(e.anim));

  // Escriure una segona vegada des de l'app SÍ que substitueix: és el camp de text.
  ctx.Diari.escriu(AVUI, 'Text nou', 4, 'app');
  cal('des de l\'app, el camp mana', ctx.Diari.entrada(AVUI).text === 'Text nou',
      ctx.Diari.entrada(AVUI).text);

  // Buidar-ho tot treu l'entrada en comptes de desar una línia en blanc.
  ctx.Diari.escriu(AVUI, '   ', 0, 'app');
  cal('buidar-ho treu l\'entrada', ctx.Diari.entrada(AVUI) === null,
      JSON.stringify(ctx.Diari.entrada(AVUI)));

  // El resum de la nit, amb la IA APAGADA.
  const r = ctx.Diari.generaDiari(AVUI);
  cal('el resum es fa igual sense IA', r.text.indexOf('Hàbits pendents: 2') !== -1, r.text);
  cal('i ho diu, que no n\'hi ha hagut', r.ambIA === false, String(r.ambIA));
  cal('el títol de l\'avís diu de què va, no «JEFE»',
      notificacions.length === 1 && /hàbits pendents/i.test(notificacions[0].titol),
      JSON.stringify(notificacions[0]));

  // Repetir-lo no n'acumula un segon.
  ctx.Diari.generaDiari(AVUI);
  cal('generar-lo dues vegades el reescriu, no l\'acumula',
      files.filter(f => f.tipus === 'resum' && f.data === AVUI).length === 1,
      String(files.filter(f => f.tipus === 'resum').length));

  const rev = ctx.Diari.generaSetmanal(AVUI);
  cal('la revisió agafa la setmana sencera', rev.desde === '2026-07-26' && rev.fins === AVUI,
      rev.desde + '/' + rev.fins);
  cal('i la data la diu en català, no en format de màquina',
      rev.text.indexOf("Setmana del 26 de juliol a l'1 d'agost") === 0,
      rev.text.split('\n')[0]);
  cal('i porta les xifres dels mòduls', rev.text.indexOf('Córrer: 4 de 7 dies') !== -1, rev.text);

  // Escriure el diari d'un dia que encara no ha arribat no té sentit.
  let hoImpedeix = false;
  try { ctx.Diari.escriu('2026-09-01', 'del futur', 0, 'app'); } catch (err) { hoImpedeix = true; }
  cal('no deixa escriure un dia que no ha arribat', hoImpedeix, 'ho ha deixat fer');
}

// ------------------------------------------------------- l'agenda de les sis
console.log("\nL'avís de les sis: només si hi ha alguna cosa");
{
  let events = [];
  const enviats = [];
  const ctx = {
    Date, Math, JSON, String, Number, Object, Array,
    Logger: { log: () => {} },
    Log: { info() {}, avis() {}, error() {} },
    Utils: { avui: () => '2026-08-03', talla: (t, n) => String(t).slice(0, n) },
    Calendari: { dia: () => ({ esdeveniments: events }) },
    Notifica: { envia: (titol, cos, o) => { enviats.push({ titol, cos, o }); return { enviades: 1 }; } },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
    ScriptApp: { getProjectTriggers: () => [] },
    CalendarApp: {}, SpreadsheetApp: {}, CacheService: {}, Utilities: {},
    Session: {}, HtmlService: {}, UrlFetchApp: {}, LockService: {},
    Config: {}, Dades: {}, Esquema: {}, Moduls: {}, IA: {}
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('apps-script/90_Instalacio.gs', 'utf8'), ctx);

  ctx.triggerAgendaDelDia();
  cal("un dia buit no envia res", enviats.length === 0, String(enviats.length));

  events = [
    { titol: 'Claustre de mestres', hora: '09:00', horaFi: '10:30', totElDia: false, lloc: 'Escola' },
    { titol: 'Visita al veterinari', hora: '17:00', horaFi: '18:00', totElDia: false, lloc: '' },
    { titol: 'Aniversari de la mare', hora: '', horaFi: '', totElDia: true, lloc: '' }
  ];
  ctx.triggerAgendaDelDia();
  cal("amb cites, envia", enviats.length === 1, String(enviats.length));
  cal("el títol diu l'hora i què és, no «JEFE»",
      /^09:00 Claustre de mestres/.test(enviats[0].titol), enviats[0].titol);
  cal("i diu quantes més n'hi ha", /i 2 més/.test(enviats[0].titol), enviats[0].titol);
  cal("el cos les porta totes, amb el de tot el dia identificat",
      enviats[0].cos.split('\n').length === 3 && /tot el dia · Aniversari/.test(enviats[0].cos),
      JSON.stringify(enviats[0].cos));
  cal("i tocar-la porta al calendari", enviats[0].o.url === './#calendari', JSON.stringify(enviats[0].o));

  events = [{ titol: 'Festa major', hora: '', horaFi: '', totElDia: true, lloc: '' }];
  enviats.length = 0;
  ctx.triggerAgendaDelDia();
  cal("només de tot el dia: el títol és el títol", enviats[0].titol === 'Festa major', enviats[0].titol);

  cal("l'avís de les sis és a la llista de triggers",
      ctx.TRIGGERS.indexOf('triggerAgendaDelDia') !== -1, ctx.TRIGGERS.join(' '));
}

// ------------------------------------------- el calendari, i el preu de canviar de mes
console.log("");
console.log("Calendari: cinc mesos pel preu d'un");
{
  // Cada `getEvents` és un viatge a Google. Comptar-los és comptar els segons.
  let viatges = 0;
  const calendaris = [
    { id: 'meu@g', nom: 'Personal', color: '', mostra: 'SI', pont: '' },
    { id: 'casa@g', nom: 'Casa', color: '', mostra: 'SI', pont: '' },
    { id: 'esc@e', nom: 'Tutoria', color: '', mostra: 'SI', pont: 'SI' }
  ];
  const fals = (iso, titol) => ({
    getId: () => titol, getTitle: () => titol, getLocation: () => '',
    getDescription: () => '', getColor: () => '',
    getStartTime: () => new Date(iso + 'T10:00:00'),
    getEndTime: () => new Date(iso + 'T11:00:00'),
    isAllDayEvent: () => false
  });
  const agenda = {
    'meu@g': [fals('2026-07-15', 'De juliol'), fals('2026-08-20', "D'agost"), fals('2026-09-10', 'De setembre')],
    'casa@g': []
  };

  const ctx = {
    Date, Math, JSON, String, Number, Object, Array, RegExp, isNaN, parseInt, parseFloat,
    Log: { info() {}, avis() {}, error() {} },
    Config: { zonaHoraria: () => 'Europe/Madrid' },
    CacheService: { getScriptCache: () => null },
    Utilities: {
      formatDate: (d, tz, f) => {
        const p2 = n => ('0' + n).slice(-2);
        return f === 'HH:mm' ? p2(d.getHours()) + ':' + p2(d.getMinutes())
          : d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
      }
    },
    CalendarApp: {
      getCalendarById: (id) => agenda[id] ? {
        getEvents: (a, b) => { viatges++; return agenda[id].filter(e => e.getStartTime() >= a && e.getStartTime() <= b); }
      } : null,
      getAllCalendars: () => [], getAllOwnedCalendars: () => [], getDefaultCalendar: () => null
    },
    Dades: { llegeix: () => calendaris.slice(), un: () => null, insereix: () => {}, actualitza: () => {} },
    CalendariPont: { hiEs: () => true, esdeveniments: () => { viatges++; return []; } },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty: () => {} }) },
    SpreadsheetApp: {}, Session: {}, HtmlService: {}, UrlFetchApp: {}, LockService: {},
    Moduls: { registra: () => {} }, Esquema: {}, IA: {}, Notifica: {}
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('apps-script/01_Utils.gs', 'utf8'), ctx);
  ctx.Utils.avui = () => '2026-08-01';
  vm.runInContext(fs.readFileSync('apps-script/40_Mod_Calendari.gs', 'utf8'), ctx);

  const r = ctx.Calendari.pantalla({ mes: '2026-08' });

  cal('la pantalla porta cinc mesos', Object.keys(r.mesos).sort().join(' ') === '2026-06 2026-07 2026-08 2026-09 2026-10',
      Object.keys(r.mesos).join(' '));
  cal('i el mes demanat és el que es pinta', r.dades.mes === '2026-08', String(r.dades.mes));

  // Dos calendaris propis + una crida al pont = 3. Mes a mes en serien 15.
  cal('els cinc mesos es llegeixen en un sol escombrat', viatges === 3, viatges + ' viatges');

  const delMes = (m) => r.mesos[m].caselles.reduce((n, c) => n + (c.delMes ? c.quants : 0), 0);
  cal('cada mes es queda els seus i prou',
      delMes('2026-07') === 1 && delMes('2026-08') === 1 && delMes('2026-09') === 1,
      [delMes('2026-07'), delMes('2026-08'), delMes('2026-09')].join('/'));

  cal('el mes de davant ve sencer, llest per pintar sense demanar res',
      r.mesos['2026-09'].caselles.length % 7 === 0 && r.mesos['2026-09'].caselles.length >= 28,
      String(r.mesos['2026-09'].caselles.length));
}

// -------------------------------- el calendari no s'ha de rellegir a cada pregunta
console.log("");
console.log("Calendari: una finestra desada serveix per a tot el que hi cap");
{
  let viatges = 0;
  const memoria = {};
  const calendaris = [{ id: 'meu@g', nom: 'Personal', color: '', mostra: 'SI', pont: '' }];
  const fals = (iso, titol) => ({
    getId: () => titol, getTitle: () => titol, getLocation: () => '',
    getDescription: () => '', getColor: () => '',
    getStartTime: () => new Date(iso + 'T10:00:00'),
    getEndTime: () => new Date(iso + 'T11:00:00'),
    isAllDayEvent: () => false
  });
  const agenda = [fals('2026-08-01', "D'avui"), fals('2026-08-02', 'De dema'),
                  fals('2026-09-10', 'De setembre')];

  const ctx = {
    Date, Math, JSON, String, Number, Object, Array, RegExp, isNaN, parseInt, parseFloat,
    Log: { info() {}, avis() {}, error() {} },
    Config: { zonaHoraria: () => 'Europe/Madrid' },
    CacheService: { getScriptCache: () => ({
      get: (k) => (memoria[k] === undefined ? null : memoria[k]),
      put: (k, v) => { memoria[k] = v; },
      remove: (k) => { delete memoria[k]; }
    }) },
    Utilities: {
      formatDate: (d, tz, f) => {
        const p2 = n => ('0' + n).slice(-2);
        return f === 'HH:mm' ? p2(d.getHours()) + ':' + p2(d.getMinutes())
          : d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
      }
    },
    CalendarApp: {
      getCalendarById: () => ({
        getEvents: (a, b) => { viatges++; return agenda.filter(e => e.getStartTime() >= a && e.getStartTime() <= b); }
      }),
      getAllCalendars: () => [], getAllOwnedCalendars: () => [], getDefaultCalendar: () => null
    },
    Dades: { llegeix: () => calendaris.slice(), un: () => null, insereix: () => {}, actualitza: () => {} },
    CalendariPont: { hiEs: () => false, esdeveniments: () => [] },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty: () => {} }) },
    SpreadsheetApp: {}, Session: {}, HtmlService: {}, UrlFetchApp: {}, LockService: {},
    Moduls: { registra: () => {} }, Esquema: {}, IA: {}, Notifica: {}
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('apps-script/01_Utils.gs', 'utf8'), ctx);
  ctx.Utils.avui = () => '2026-08-01';
  vm.runInContext(fs.readFileSync('apps-script/40_Mod_Calendari.gs', 'utf8'), ctx);

  // Això és el que passa a CADA pregunta a en JEFE: avui, dema, i la pagina del dia.
  const avui = ctx.Calendari.dia('2026-08-01');
  const primerCop = viatges;
  const dema = ctx.Calendari.dia('2026-08-02');
  const pagina = ctx.Calendari.dia('2026-08-01');

  cal('el primer cop sí que va a Google', primerCop === 1, String(primerCop));
  cal('i els altres dos ja no', viatges === 1, viatges + ' viatges');
  cal("i cadascu es queda amb el SEU dia, no amb tota la finestra",
      avui.esdeveniments.length === 1 && dema.esdeveniments.length === 1 &&
      avui.esdeveniments[0].titol === "D'avui" && dema.esdeveniments[0].titol === 'De dema',
      JSON.stringify([avui.esdeveniments.map(e=>e.titol), dema.esdeveniments.map(e=>e.titol)]));
  cal('i la pagina del dia torna el mateix que la primera vegada',
      pagina.esdeveniments.length === 1, String(pagina.esdeveniments.length));

  // Comptar un rang no pot heretar el marge de la finestra.
  const c = ctx.Calendari.compta('2026-08-01', '2026-08-31');
  cal("comptar l'agost compta l'agost i prou", c.quants === 2, JSON.stringify(c.quants));

  // Sortir de la finestra sí que costa un viatge, i llavors ja hi torna a cabre tot.
  ctx.Calendari.dia('2027-03-15');
  const desprésDeSaltar = viatges;
  ctx.Calendari.dia('2027-03-16');
  cal('sortir de la finestra costa un viatge, i el de dins ja no',
      desprésDeSaltar === 2 && viatges === 2, desprésDeSaltar + '/' + viatges);
}

// ----------------------------------- ajuntar el compte duplicat sense perdre res
console.log("");
console.log("Patrimoni: ajuntar dos comptes no ha de perdre cap valor");
{
  const actius = [
    { id: 'auto_vell', nom: 'Compte ···4471', tipus: 'banc', automatic: 'SI', esborrat_el: '' },
    { id: 'auto_ib0004471', nom: 'Compte ···4471', tipus: 'banc', automatic: 'SI', esborrat_el: '' }
  ];
  const hist = [
    { id: 'v1', id_actiu: 'auto_vell', data: '2026-05-01', valor: 4100 },
    { id: 'v2', id_actiu: 'auto_vell', data: '2026-06-01', valor: 4353 },
    { id: 'v3', id_actiu: 'auto_vell', data: '2026-07-01', valor: 4353 },
    { id: 'v4', id_actiu: 'auto_ib0004471', data: '2026-07-01', valor: 4090 },
    { id: 'v5', id_actiu: 'auto_ib0004471', data: '2026-08-01', valor: 4052 }
  ];

  const ctx = {
    Date, Math, JSON, String, Number, Object, Array,
    Logger: { log: () => {} },
    Log: { info() {}, avis() {}, error() {} },
    Utils: { ara: () => '2026-08-02T10:00:00+02:00', avui: () => '2026-08-02' },
    Dades: {
      llegeix: (full) => (full === 'Patrimoni' ? actius : hist).slice(),
      perId: (full, id) => (full === 'Patrimoni' ? actius : hist).filter(x => x.id === id)[0] || null,
      desa: (full, fila) => {
        const j = hist.findIndex(x => x.id === fila.id);
        if (j === -1) hist.push(fila); else hist[j] = fila;
        return fila;
      },
      actualitza: (full, id, canvis) => {
        const x = actius.filter(y => y.id === id)[0];
        if (x) Object.keys(canvis).forEach(k => { x[k] = canvis[k]; });
        return x || null;
      }
    },
    Config: {}, Esquema: {}, Moduls: {}, IA: {}, Notifica: {}, Calendari: {},
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null,
      setProperty: () => {}, deleteProperty: () => {} }) },
    ScriptApp: { getProjectTriggers: () => [] },
    SpreadsheetApp: {}, CacheService: {}, Utilities: {}, Session: {},
    HtmlService: {}, UrlFetchApp: {}, LockService: {}, CalendarApp: {}
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('apps-script/90_Instalacio.gs', 'utf8'), ctx);

  // Al revés del que toca: ha de dir que no.
  cal('sense identificadors, no fa res',
      /Falten identificadors/.test(ctx.fusionaPatrimoni('', 'auto_vell')), 'ho ha fet');
  cal("un id que no existeix, tampoc",
      /No trobo/.test(ctx.fusionaPatrimoni('no_hi_es', 'auto_ib0004471')), 'ho ha fet');

  ctx.fusionaPatrimoni('auto_vell', 'auto_ib0004471');

  const delBo = hist.filter(x => x.id_actiu === 'auto_ib0004471')
                    .sort((a, b) => a.data.localeCompare(b.data));
  cal("el bo es queda tota la línia, del maig a l'agost",
      delBo.map(x => x.data).join(' ') === '2026-05-01 2026-06-01 2026-07-01 2026-08-01',
      delBo.map(x => x.data).join(' '));
  cal('el dia que tots dos tenien, mana el del compte viu',
      delBo.filter(x => x.data === '2026-07-01')[0].valor === 4090,
      String(delBo.filter(x => x.data === '2026-07-01')[0].valor));
  cal("l'últim valor segueix sent el bo",
      delBo[delBo.length - 1].valor === 4052, String(delBo[delBo.length - 1].valor));
  cal("el vell queda arxivat, no esborrat",
      !!actius.filter(x => x.id === 'auto_vell')[0].esborrat_el, "no l'ha arxivat");
  cal("i les seves files es queden on eren, per si de cas",
      hist.filter(x => x.id_actiu === 'auto_vell').length === 3,
      String(hist.filter(x => x.id_actiu === 'auto_vell').length));
}

// ------------------------------------ el que has gastat avui, a la pagina del dia
console.log("");
console.log("Finances: el dia son moviments, no mitjanes");
{
  const AVUI = '2026-08-02';
  const categories = [
    { id: 'c_menjar', nom: 'Menjar', ordre: 1, exclou: '', esborrat_el: '' },
    { id: 'c_feina', nom: 'Feina', ordre: 2, exclou: '', esborrat_el: '' },
    { id: 'c_traspas', nom: 'Traspassos', ordre: 9, exclou: 'SI', esborrat_el: '' }
  ];
  const moviments = [
    { id: 'm1', data: AVUI, tipus: 'd', 'import': 48.2, categoria: 'c_menjar',
      descripcio: 'Supermercat', revisat: 'SI', esborrat_el: '' },
    { id: 'm2', data: AVUI, tipus: 'i', 'import': 1842, categoria: 'c_feina',
      descripcio: 'Nomina', revisat: 'SI', esborrat_el: '' },
    { id: 'm3', data: AVUI, tipus: 'd', 'import': 4.35, categoria: '',
      descripcio: 'Cafe', revisat: 'NO', esborrat_el: '' },
    // Un traspas: canviar diners de butxaca no es ni gastar ni guanyar.
    { id: 'm4', data: AVUI, tipus: 'd', 'import': 500, categoria: 'c_traspas',
      descripcio: 'A l estalvi', revisat: 'SI', esborrat_el: '' },
    // I un d ahir, que no hi pinta res.
    { id: 'm5', data: '2026-08-01', tipus: 'd', 'import': 99, categoria: 'c_menjar',
      descripcio: 'D ahir', revisat: 'SI', esborrat_el: '' }
  ];

  const ctx = {
    Date, Math, JSON, String, Number, Object, Array, isFinite, parseFloat, parseInt, RegExp,
    Log: { info() {}, avis() {}, error() {} },
    Utilities: {
      formatDate: (d, tz, patro) => patro.indexOf('T') === -1
        ? [d.getFullYear(), ('0' + (d.getMonth() + 1)).slice(-2), ('0' + d.getDate()).slice(-2)].join('-')
        : d.toISOString()
    },
    Config: { zonaHoraria: () => 'Europe/Madrid', get: () => null },
    Dades: {
      llegeix: (full, filtre) => {
        const files = full === 'Categories' ? categories : full === 'Moviments' ? moviments : [];
        if (typeof filtre === 'function') return files.filter(filtre);
        return files.slice();
      },
      un: () => null, perId: () => null, insereix: () => null,
      actualitza: () => null, desa: () => null
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty: () => {} }) },
    SpreadsheetApp: {}, CacheService: { getScriptCache: () => null }, Session: {},
    HtmlService: {}, UrlFetchApp: {}, LockService: {}, CalendarApp: {}, ScriptApp: {},
    Moduls: { registra: () => {} }, Esquema: {}, IA: {}, Notifica: {},
    FinancesRegles: {}, FinancesImport: {}
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('apps-script/01_Utils.gs', 'utf8'), ctx);
  ctx.Utils.avui = () => AVUI;
  vm.runInContext(fs.readFileSync('apps-script/40_Mod_Finances.gs', 'utf8'), ctx);

  const b = ctx.Finances.elDia(AVUI);
  const linia = b.coses[0];

  cal("el bloc porta el nom i on va a parar", b.titol === 'Finances' && b.accio === 'finances',
      b.titol + '/' + b.accio);
  cal('la primera linia son els totals del dia',
      linia.text === 'Gastat 52,55 € · guanyat 1842,00 €', linia.text);
  cal('el traspas no compta ni com a despesa ni com a guany',
      linia.menut === '3 moviments', linia.menut);
  cal("el d'ahir no hi surt",
      b.coses.every(c => c.text.indexOf('ahir') === -1), JSON.stringify(b.coses.map(c => c.text)));
  cal('els grossos primer', b.coses[1].text === 'Nomina' && b.coses[2].text === 'Supermercat',
      b.coses[1].text + '/' + b.coses[2].text);
  cal('un ingres es marca amb el signe', b.coses[1].menut.indexOf('+1842,00 €') === 0,
      b.coses[1].menut);
  cal("el que encara no esta classificat, ho diu",
      b.coses[3].menut.indexOf('per classificar') !== -1, b.coses[3].menut);

  // Un dia sense res no ha de dir «Gastat 0,00 €».
  const buit = ctx.Finances.elDia('2026-07-15');
  cal('un dia sense res ho diu i prou',
      buit.coses.length === 1 && buit.coses[0].text === 'Res apuntat avui',
      JSON.stringify(buit.coses));
}

// ----------------------- el banc, sempre al dia pero sense passar-se de mirades
console.log("");
console.log("Banc: mirar-hi quan cal, i que una negativa no trenqui res");
{
  const props = {};
  let peticions = 0;
  let respon = () => { throw new Error('429 Too many requests'); };

  const ctx = {
    Date, Math, JSON, String, Number, Object, Array, isFinite, parseFloat, parseInt, RegExp,
    Log: { info() {}, avis() {}, error() {} },
    Utilities: {
      formatDate: (d, tz, patro) => patro.indexOf('T') === -1
        ? [d.getFullYear(), ('0' + (d.getMonth() + 1)).slice(-2), ('0' + d.getDate()).slice(-2)].join('-')
        : d.toISOString(),
      base64EncodeWebSafe: () => 'x', computeRsaSha256Signature: () => [1],
      newBlob: (t) => ({ getBytes: () => t })
    },
    Config: { zonaHoraria: () => 'Europe/Madrid', get: () => null },
    Dades: { llegeix: () => [], un: () => null, perId: () => null,
             insereix: () => null, actualitza: () => null, desa: () => null },
    Finances: { afegeix: (m) => m },
    FinancesRegles: { descripcio: () => 'x', categoria: () => '', metode: () => '' },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (k) => (props[k] === undefined ? null : props[k]),
      setProperty: (k, v) => { props[k] = v; }
    }) },
    UrlFetchApp: { fetch: () => { peticions++; return respon(); } },
    SpreadsheetApp: {}, Session: {},
    CacheService: { getScriptCache: () => ({ get: () => null, put: () => {}, remove: () => {} }) },
    HtmlService: {}, LockService: {}, CalendarApp: {}, ScriptApp: {},
    Moduls: { registra: () => {} }, Esquema: {}, IA: {}, Notifica: {}
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('apps-script/01_Utils.gs', 'utf8'), ctx);
  vm.runInContext(fs.readFileSync('apps-script/42_Finances_Banc.gs', 'utf8'), ctx);

  // Sense banc connectat, ni ho intenta.
  let r = ctx.FinancesBanc.sincronitzaSiCal();
  cal('sense banc connectat no va enlloc',
      r.mirat === false && peticions === 0, JSON.stringify(r));

  // Ara sí, connectat. El banc contesta que no: no pot petar.
  props.FINANCES_BANC = JSON.stringify({ connected: true, accounts: [{ uid: 'u1' }] });
  props.EB_APP_ID = 'a'; props.EB_PRIVATE_KEY = 'k'; props.EB_REDIRECT = 'r';

  let hoIntenta = true;
  try { r = ctx.FinancesBanc.sincronitzaSiCal(); } catch (e) { hoIntenta = false; }
  cal("una negativa del banc no llança: la pantalla no es pot quedar sense res",
      hoIntenta === true, 'ha llançat');
  cal('i ho apunta, per poder-ho dir', /429/.test(ctx.FinancesBanc.comEstem().error),
      JSON.stringify(ctx.FinancesBanc.comEstem()));

  // Ara el banc contesta bé.
  respon = () => ({ getResponseCode: () => 200, getContentText: () => '{"transactions":[],"balances":[]}' });
  ctx.FinancesBanc.sincronitzaSiCal();
  const quan = ctx.FinancesBanc.ultimaMirada();
  cal("desa de quan es l'ultima mirada", !!quan, String(quan));

  // I ara la part que protegeix el limit diari: no s'hi torna abans d'hora.
  const abans = peticions;
  r = ctx.FinancesBanc.sincronitzaSiCal();
  cal('mirat fa un moment, no s hi torna',
      r.mirat === false && peticions === abans, JSON.stringify(r) + ' · ' + peticions);

  // LES MIRADES DEL DIA SÓN COMPTADES.
  // Cap pantalla les pot gastar: només els tres automatismes i el botó de mà.
  const dolents = [];
  ['apps-script/vista_finances.html', 'apps-script/vista_dia.html',
   'apps-script/vista_conversa.html', 'apps-script/40_Mod_Finances.gs'].forEach(function (f) {
    const t = fs.readFileSync(f, 'utf8');
    if (/refrescaBanc|sincronitzaSiCal/.test(t)) dolents.push(f);
  });
  cal('cap pantalla mira el banc en obrir-se', dolents.length === 0, dolents.join(' '));

  const inst = fs.readFileSync('apps-script/90_Instalacio.gs', 'utf8');
  cal('els automatismes del banc són tres i a les 6, 15 i 20',
      inst.indexOf('[6, 15, 20].forEach') !== -1, 'no hi són');

  // Si li dius que amb zero minuts n'hi ha prou, sí que hi torna.
  r = ctx.FinancesBanc.sincronitzaSiCal(0);
  cal('i si se li demana expressament, hi torna',
      r.mirat === true && peticions > abans, JSON.stringify(r.mirat) + ' · ' + peticions);
}

// --------------------------- trobar el compte duplicat sol, sense escriure cap id
console.log("");
console.log("Patrimoni: trobar el duplicat sense haver de dir-li quin es");
{
  const props = {};
  const actius = [
    // El congelat: l'ultim valor es de fa mesos.
    { id: 'auto_vell', nom: 'Compte ···4471', automatic: 'SI', iban: '', esborrat_el: '' },
    // El viu.
    { id: 'auto_ib0004471', nom: 'Compte ···4471', automatic: 'SI', iban: '', esborrat_el: '' },
    // I un de manual, que no te res a veure amb aixo.
    { id: 'act_tr', nom: 'Trade Republic', automatic: 'NO', iban: '', esborrat_el: '' }
  ];
  const hist = [
    { id: 'v1', id_actiu: 'auto_vell', data: '2026-05-01', valor: 4100 },
    { id: 'v2', id_actiu: 'auto_vell', data: '2026-06-01', valor: 4353 },
    { id: 'v3', id_actiu: 'auto_ib0004471', data: '2026-08-01', valor: 4052 },
    { id: 'v4', id_actiu: 'act_tr', data: '2026-08-01', valor: 9000 }
  ];

  const ctx = {
    Date, Math, JSON, String, Number, Object, Array,
    Logger: { log: () => {} },
    Log: { info() {}, avis() {}, error() {} },
    Utils: { ara: () => '2026-08-02T10:00:00+02:00', avui: () => '2026-08-02',
             desJson: (t, d) => { try { return JSON.parse(t); } catch (e) { return d; } } },
    Dades: {
      llegeix: (full, filtre) => {
        const files = full === 'Patrimoni' ? actius : hist;
        return typeof filtre === 'function' ? files.filter(filtre) : files.slice();
      },
      perId: (full, id) => (full === 'Patrimoni' ? actius : hist).filter(x => x.id === id)[0] || null,
      desa: (full, fila) => {
        const j = hist.findIndex(x => x.id === fila.id);
        if (j === -1) hist.push(fila); else hist[j] = fila;
        return fila;
      },
      actualitza: (full, id, canvis) => {
        const x = actius.filter(y => y.id === id)[0];
        if (x) Object.keys(canvis).forEach(k => { x[k] = canvis[k]; });
        return x || null;
      }
    },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (k) => (props[k] === undefined ? null : props[k]),
      setProperty: (k, v) => { props[k] = v; },
      deleteProperty: (k) => { delete props[k]; }
    }) },
    ScriptApp: { getProjectTriggers: () => [] },
    Config: {}, Esquema: {}, Moduls: {}, IA: {}, Notifica: {}, Calendari: {},
    SpreadsheetApp: {}, CacheService: {}, Utilities: {}, Session: {},
    HtmlService: {}, UrlFetchApp: {}, LockService: {}, CalendarApp: {}
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('apps-script/90_Instalacio.gs', 'utf8'), ctx);

  // Sense haver preparat res, no ha de fer res.
  cal('sense preparar-ho abans, no toca res',
      /Primer executa preparaFusio/.test(ctx.fusionaAra()), 'ho ha fet');

  const previsio = ctx.preparaFusio();
  cal("troba el duplicat sol", /HE TROBAT 1 duplicat/.test(previsio), previsio.slice(0, 60));
  cal('es queda el que te el valor mes recent',
      previsio.indexOf('Es queda:  Compte ···4471  (auto_ib0004471)') !== -1 &&
      previsio.indexOf('4052 € del 2026-08-01') !== -1, previsio);
  cal("i hi ajunta el congelat", previsio.indexOf("S'hi ajunta: Compte ···4471  (auto_vell)") !== -1 &&
      previsio.indexOf('4353 € del 2026-06-01') !== -1, previsio);
  cal('el manual no hi te res a veure', previsio.indexOf('Trade Republic') === -1, previsio);
  cal('mirar-ho NO ha tocat res', !actius.filter(x => x.esborrat_el).length, 'ha tocat alguna cosa');

  ctx.fusionaAra();
  const delBo = hist.filter(x => x.id_actiu === 'auto_ib0004471')
                    .sort((a, b) => a.data.localeCompare(b.data));
  cal('despres de fer-ho, la linia del bo va del maig a l agost',
      delBo.map(x => x.data).join(' ') === '2026-05-01 2026-06-01 2026-08-01',
      delBo.map(x => x.data).join(' '));
  cal("i l'ultim valor segueix sent el viu", delBo[delBo.length - 1].valor === 4052,
      String(delBo[delBo.length - 1].valor));
  cal('el congelat queda arxivat', !!actius.filter(x => x.id === 'auto_vell')[0].esborrat_el,
      'no l ha arxivat');

  // I no s'ha de poder repetir sense tornar-ho a preparar.
  cal('fer-ho dues vegades no torna a passar',
      /Primer executa preparaFusio/.test(ctx.fusionaAra()), 'ho ha tornat a fer');

  // I ara ja no queda cap duplicat per trobar.
  cal('un cop fet, ja no en troba cap',
      /No trobo cap compte duplicat/.test(ctx.preparaFusio()), 'encara en troba');
}

// ------------------- el dia que es refa la connexio, tots dos tenen valor d avui
console.log("");
console.log("Patrimoni: qui es el compte viu ho diu la connexio, no la data");
{
  const props = {};
  // El cas de debo: el vell porta 12 valors i encara en va rebre un l'1 d'agost;
  // el nou va neixer aquell mateix dia. Per data empaten.
  const actius = [
    { id: 'auto_6d32636a-4c5', nom: 'Banc', automatic: 'SI', iban: '', esborrat_el: '' },
    { id: 'auto_02786e6a-89d', nom: 'Banc', automatic: 'SI', iban: '', esborrat_el: '' }
  ];
  const hist = [];
  ['2026-07-21','2026-07-25','2026-07-30','2026-08-01'].forEach((d, n) =>
    hist.push({ id: 'v' + n, id_actiu: 'auto_6d32636a-4c5', data: d, valor: 4353.91 }));
  hist.push({ id: 'vn', id_actiu: 'auto_02786e6a-89d', data: '2026-08-01', valor: 4052.89 });

  const ctx = {
    Date, Math, JSON, String, Number, Object, Array,
    Logger: { log: () => {} },
    Log: { info() {}, avis() {}, error() {} },
    Utils: { ara: () => '2026-08-02T12:00:00+02:00', avui: () => '2026-08-02',
             desJson: (t, d) => { try { return JSON.parse(t); } catch (e) { return d; } } },
    Dades: {
      llegeix: (full, filtre) => {
        const files = full === 'Patrimoni' ? actius : hist;
        return typeof filtre === 'function' ? files.filter(filtre) : files.slice();
      },
      perId: (full, id) => (full === 'Patrimoni' ? actius : hist).filter(x => x.id === id)[0] || null,
      desa: (full, fila) => {
        const j = hist.findIndex(x => x.id === fila.id);
        if (j === -1) hist.push(fila); else hist[j] = fila;
        return fila;
      },
      actualitza: (full, id, canvis) => {
        const x = actius.filter(y => y.id === id)[0];
        if (x) Object.keys(canvis).forEach(k => { x[k] = canvis[k]; });
        return x || null;
      }
    },
    // La connexio esta llegint el compte nou: aixo es el que mana.
    FinancesBanc: { estat: () => ({ accounts: [{ uid: '02786e6a-89d4-4c1a-9f3e-000000000000', iban: '' }] }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (k) => (props[k] === undefined ? null : props[k]),
      setProperty: (k, v) => { props[k] = v; },
      deleteProperty: (k) => { delete props[k]; }
    }) },
    ScriptApp: { getProjectTriggers: () => [] },
    Config: {}, Esquema: {}, Moduls: {}, IA: {}, Notifica: {}, Calendari: {},
    SpreadsheetApp: {}, CacheService: {}, Utilities: {}, Session: {},
    HtmlService: {}, UrlFetchApp: {}, LockService: {}, CalendarApp: {}
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('apps-script/90_Instalacio.gs', 'utf8'), ctx);

  const previsio = ctx.preparaFusio();
  cal('es queda el compte que la connexio esta llegint, no el de mes historic',
      previsio.indexOf('Es queda:  Banc  (auto_02786e6a-89d)') !== -1, previsio);
  cal('i ho diu, per que el tria', previsio.indexOf('el trio per la connexió') !== -1, previsio);

  ctx.fusionaAra();
  const viu = actius.filter(x => x.id === 'auto_02786e6a-89d')[0];
  const apartat = actius.filter(x => x.id === 'auto_6d32636a-4c5')[0];
  cal('el viu es queda sense arxivar', !viu.esborrat_el, 'l ha arxivat');
  cal("i el congelat s'aparta", !!apartat.esborrat_el, 'no l ha apartat');

  const seus = hist.filter(x => x.id_actiu === 'auto_02786e6a-89d')
                   .sort((a, b) => a.data.localeCompare(b.data));
  cal('el viu hereta la linia sencera', seus.length === 4, String(seus.length));
  cal("i el saldo d'avui segueix sent el bo",
      seus[seus.length - 1].valor === 4052.89, String(seus[seus.length - 1].valor));

  // I si m'equivoco, s'ha de poder desfer.
  ctx.desfesLaFusio();
  cal('desfer-ho torna a treure l arxivat',
      !actius.filter(x => x.id === 'auto_6d32636a-4c5')[0].esborrat_el, 'segueix arxivat');
  cal('i sense res a desfer, no fa res',
      /No tinc constància/.test(ctx.desfesLaFusio()), 'ha fet alguna cosa');
}

// ------------------------------------- i si no hi ha manera de saber quin es viu
console.log("");
console.log("Patrimoni: quan no se sap quin es el bo, es pregunta");
{
  const props = {};
  const actius = [
    { id: 'auto_a', nom: 'Banc', automatic: 'SI', iban: '', esborrat_el: '' },
    { id: 'auto_b', nom: 'Banc', automatic: 'SI', iban: '', esborrat_el: '' }
  ];
  const hist = [
    { id: 'x1', id_actiu: 'auto_a', data: '2026-08-01', valor: 4353.91 },
    { id: 'x2', id_actiu: 'auto_b', data: '2026-08-01', valor: 4052.89 }
  ];
  const ctx = {
    Date, Math, JSON, String, Number, Object, Array,
    Logger: { log: () => {} }, Log: { info() {}, avis() {}, error() {} },
    Utils: { ara: () => '2026-08-02T12:00:00+02:00', avui: () => '2026-08-02',
             desJson: (t, d) => { try { return JSON.parse(t); } catch (e) { return d; } } },
    Dades: {
      llegeix: (full, filtre) => {
        const files = full === 'Patrimoni' ? actius : hist;
        return typeof filtre === 'function' ? files.filter(filtre) : files.slice();
      },
      perId: (full, id) => (full === 'Patrimoni' ? actius : hist).filter(x => x.id === id)[0] || null,
      desa: () => null,
      actualitza: (full, id, canvis) => {
        const x = actius.filter(y => y.id === id)[0];
        if (x) Object.keys(canvis).forEach(k => { x[k] = canvis[k]; });
        return x || null;
      }
    },
    // Sense connexio que ho aclareixi.
    FinancesBanc: { estat: () => ({ accounts: [] }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (k) => (props[k] === undefined ? null : props[k]),
      setProperty: (k, v) => { props[k] = v; },
      deleteProperty: (k) => { delete props[k]; }
    }) },
    ScriptApp: { getProjectTriggers: () => [] },
    Config: {}, Esquema: {}, Moduls: {}, IA: {}, Notifica: {}, Calendari: {},
    SpreadsheetApp: {}, CacheService: {}, Utilities: {}, Session: {},
    HtmlService: {}, UrlFetchApp: {}, LockService: {}, CalendarApp: {}
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('apps-script/90_Instalacio.gs', 'utf8'), ctx);

  const r = ctx.preparaFusio();
  cal('amb un empat i sense connexio, no proposa res',
      /NO ME N'ACABO DE FIAR/.test(r), r.slice(0, 80));
  cal('i ensenya els dos amb el seu numero', r.indexOf('4353.91') !== -1 && r.indexOf('4052.89') !== -1, r);
  cal('i no deixa res preparat per executar',
      /Primer executa preparaFusio/.test(ctx.fusionaAra()), 'ha deixat alguna cosa preparada');
  cal('i sobretot NO ha tocat res', !actius.filter(x => x.esborrat_el).length, 'ha arxivat alguna cosa');
}

// ------------------------- arreglar una fusio que es va equivocar de compte
console.log("");
console.log("Patrimoni: el compte bo arxivat per error es recupera sol");
{
  const props = {};
  // L'estat en que va quedar el full: el bo (4052,89) ARXIVAT i el congelat viu.
  const actius = [
    { id: 'auto_6d32636a-4c5', nom: 'Banc', automatic: 'SI', iban: '', esborrat_el: '' },
    { id: 'auto_02786e6a-89d', nom: 'Banc', automatic: 'SI', iban: '',
      esborrat_el: '2026-08-02T12:44:00+02:00' }
  ];
  const hist = [];
  ['2026-07-21','2026-07-25','2026-07-30','2026-08-01'].forEach((d, n) =>
    hist.push({ id: 'v' + n, id_actiu: 'auto_6d32636a-4c5', data: d, valor: 4353.91 }));
  hist.push({ id: 'vn', id_actiu: 'auto_02786e6a-89d', data: '2026-08-01', valor: 4052.89 });

  const ctx = {
    Date, Math, JSON, String, Number, Object, Array,
    Logger: { log: () => {} }, Log: { info() {}, avis() {}, error() {} },
    Utils: { ara: () => '2026-08-02T13:00:00+02:00', avui: () => '2026-08-02',
             desJson: (t, d) => { try { return JSON.parse(t); } catch (e) { return d; } } },
    Dades: {
      llegeix: (full, filtre) => {
        const files = full === 'Patrimoni' ? actius : hist;
        return typeof filtre === 'function' ? files.filter(filtre) : files.slice();
      },
      perId: (full, id) => (full === 'Patrimoni' ? actius : hist).filter(x => x.id === id)[0] || null,
      desa: (full, fila) => {
        const j = hist.findIndex(x => x.id === fila.id);
        if (j === -1) hist.push(fila); else hist[j] = fila;
        return fila;
      },
      actualitza: (full, id, canvis) => {
        const x = actius.filter(y => y.id === id)[0];
        if (x) Object.keys(canvis).forEach(k => { x[k] = canvis[k]; });
        return x || null;
      }
    },
    FinancesBanc: { estat: () => ({ accounts: [{ uid: '02786e6a-89d4-4c1a-9f3e-000000000000', iban: '' }] }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (k) => (props[k] === undefined ? null : props[k]),
      setProperty: (k, v) => { props[k] = v; },
      deleteProperty: (k) => { delete props[k]; }
    }) },
    ScriptApp: { getProjectTriggers: () => [] },
    Config: {}, Esquema: {}, Moduls: {}, IA: {}, Notifica: {}, Calendari: {},
    SpreadsheetApp: {}, CacheService: {}, Utilities: {}, Session: {},
    HtmlService: {}, UrlFetchApp: {}, LockService: {}, CalendarApp: {}
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('apps-script/90_Instalacio.gs', 'utf8'), ctx);

  const previsio = ctx.preparaFusio();
  cal('veu el compte bo encara que estigui arxivat',
      previsio.indexOf('Es queda:  Banc  (auto_02786e6a-89d)') !== -1, previsio);

  ctx.fusionaAra();
  const bo = actius.filter(x => x.id === 'auto_02786e6a-89d')[0];
  const dolent = actius.filter(x => x.id === 'auto_6d32636a-4c5')[0];
  cal("el bo deixa d'estar arxivat", !bo.esborrat_el, 'segueix arxivat');
  cal('i el congelat passa a estar-ho', !!dolent.esborrat_el, 'no l ha apartat');

  const seus = hist.filter(x => x.id_actiu === 'auto_02786e6a-89d')
                   .sort((a, b) => a.data.localeCompare(b.data));
  cal('el bo es queda la linia sencera, del 21 de juliol a l 1 d agost',
      seus.map(x => x.data).join(' ') === '2026-07-21 2026-07-25 2026-07-30 2026-08-01',
      seus.map(x => x.data).join(' '));
  cal("i el saldo d'avui es el de debo, no el congelat",
      seus[seus.length - 1].valor === 4052.89, String(seus[seus.length - 1].valor));

  // I un cop arreglat, ja no ha de proposar res mes.
  cal('un cop arreglat, ja no en troba cap',
      /No trobo cap compte duplicat/.test(ctx.preparaFusio()), 'encara en troba');
}

// -------------------- parlar amb en JEFE no ha d'esborrar la fitxa que el fa rapid
console.log("");
console.log("La fitxa de la IA: nomes es llenca quan canvia alguna cosa que hi surt");
{
  const moduls = [
    { id: 'conversa', nom: 'JEFE',
      fulls: [{ nom: 'Converses' }] },                       // sense contextIA
    { id: 'habits', nom: 'Habits',
      fulls: [{ nom: 'Habits' }, { nom: 'Registres' }],
      contextIA: function () { return 'habits'; } },
    { id: 'calendari', nom: 'Calendari',
      fulls: [{ nom: 'Calendaris' }],
      contextIA: function () { return 'calendari'; } }
  ];

  let esborrades = 0;
  const ctx = {
    Date, Math, JSON, String, Number, Object, Array,
    Log: { info() {}, avis() {}, error() {} },
    CacheService: { getScriptCache: () => ({
      get: () => null, getAll: () => ({}), put: () => {}, putAll: () => {},
      remove: () => { esborrades++; },
      removeAll: (ks) => { if (ks.length) esborrades++; } }) },
    Config: { full: () => ({ getSheetByName: () => null }) },
    Dades: null, Esquema: {}, IA: {}, Utils: { ara: () => 'ara', avui: () => '2026-08-02' },
    SpreadsheetApp: {}, PropertiesService: {}, ScriptApp: {},
    HtmlService: {}, UrlFetchApp: {}, LockService: {}, Session: {}, Utilities: {}
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('apps-script/20_Moduls.gs', 'utf8'), ctx);
  // Els mòduls es descobreixen per `globalThis`: se n'hi posen tres de mentida.
  moduls.forEach(function (m) { ctx['MODUL_' + m.id.toUpperCase()] = function () { return m; }; });

  cal('el full de converses NO alimenta la fitxa',
      ctx.Moduls.alimentaContext('Converses') === false, 'diu que sí');
  cal('els registres d hàbits SÍ', ctx.Moduls.alimentaContext('Registres') === true, 'diu que no');
  cal('els calendaris SÍ', ctx.Moduls.alimentaContext('Calendaris') === true, 'diu que no');
  cal('els aparells de les notificacions NO',
      ctx.Moduls.alimentaContext('_Dispositius') === false, 'diu que sí');
  cal('el registre NO', ctx.Moduls.alimentaContext('_Registre') === false, 'diu que sí');
  cal('la configuració SÍ, que allà hi ha els objectius',
      ctx.Moduls.alimentaContext('_Config') === true, 'diu que no');
  cal('un full que no és de ningú, sí: davant del dubte, es torna a muntar',
      ctx.Moduls.alimentaContext('UnFullQueNoConec') === true, 'diu que no');

  // I ara el camí de debò: escriure passa per Dades.invalida.
  const dadesCtx = {
    Utils: { nouId: () => 'x', ara: () => 'ARA' },
    Config: { full: () => ({ getSheetByName: () => ({
      getDataRange: () => ({ getValues: () => [['id']] }),
      getRange: () => ({ setValues: () => {} }), getMaxRows: () => 10 }) }) },
    LockService: null, Moduls: ctx.Moduls
  };
  vm.createContext(dadesCtx);
  vm.runInContext(fs.readFileSync('apps-script/10_Dades.gs', 'utf8'), dadesCtx);

  esborrades = 0;
  dadesCtx.Dades.invalida('Converses');
  cal('escriure una conversa no llença la fitxa', esborrades === 0, String(esborrades));

  dadesCtx.Dades.invalida('_Dispositius');
  cal('obrir l app tampoc', esborrades === 0, String(esborrades));

  dadesCtx.Dades.invalida('Registres');
  cal('marcar un hàbit sí que la llença', esborrades === 1, String(esborrades));

  dadesCtx.Dades.invalida();
  cal('i sense dir quin full, també: no se sap què ha canviat', esborrades === 2, String(esborrades));
}

// --------------- la fitxa es munta per trossos: marcar un habit no toca finances
console.log("");
console.log("La fitxa de la IA: per trossos, no d'una peca");
{
  const muntats = [];
  const moduls = [
    { id: 'conversa', fulls: [{ nom: 'Converses' }] },
    { id: 'habits', fulls: [{ nom: 'Habits' }, { nom: 'Registres' }],
      contextIA: function () { muntats.push('habits'); return 'HABITS: en falten 3'; } },
    { id: 'finances', fulls: [{ nom: 'Moviments' }, { nom: 'Categories' }],
      contextIA: function () { muntats.push('finances'); return 'FINANCES: 400 EUR'; } },
    { id: 'calendari', fulls: [{ nom: 'Calendaris' }],
      contextIA: function () { muntats.push('calendari'); return 'CALENDARI: res'; } }
  ];

  const memoria = {};
  const ctx = {
    Date, Math, JSON, String, Number, Object, Array,
    Log: { info() {}, avis() {}, error() {} },
    CacheService: { getScriptCache: () => ({
      get: (k) => (memoria[k] === undefined ? null : memoria[k]),
      getAll: (ks) => { const o = {}; ks.forEach(k => { if (memoria[k] !== undefined) o[k] = memoria[k]; }); return o; },
      put: (k, v) => { memoria[k] = v; },
      putAll: (o) => { Object.keys(o).forEach(k => { memoria[k] = o[k]; }); },
      remove: (k) => { delete memoria[k]; },
      removeAll: (ks) => { ks.forEach(k => { delete memoria[k]; }); }
    }) },
    Config: { full: () => ({ getSheetByName: () => null }) },
    Dades: null, Esquema: {}, IA: {}, Utils: { ara: () => 'ara', avui: () => '2026-08-02' },
    SpreadsheetApp: {}, PropertiesService: {}, ScriptApp: {},
    HtmlService: {}, UrlFetchApp: {}, LockService: {}, Session: {}, Utilities: {}
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('apps-script/20_Moduls.gs', 'utf8'), ctx);
  moduls.forEach(function (m) { ctx['MODUL_' + m.id.toUpperCase()] = function () { return m; }; });

  const primera = ctx.Moduls.contextIA();
  cal('el primer cop els munta tots', muntats.sort().join(' ') === 'calendari finances habits',
      muntats.join(' '));
  cal('i la fitxa porta els tres', primera.indexOf('HABITS') !== -1 &&
      primera.indexOf('FINANCES') !== -1 && primera.indexOf('CALENDARI') !== -1, primera);

  muntats.length = 0;
  ctx.Moduls.contextIA();
  cal('el segon cop no en munta cap', muntats.length === 0, muntats.join(' '));

  // AIXO ES EL QUE IMPORTA: marcar un habit no ha de tornar a llegir finances.
  muntats.length = 0;
  ctx.Moduls.invalidaContext('Registres');
  const desprès = ctx.Moduls.contextIA();
  cal('marcar un habit nomes torna a muntar habits',
      muntats.join(' ') === 'habits', muntats.join(' ') || '(cap)');
  cal('i la fitxa segueix sencera', desprès.indexOf('FINANCES') !== -1 &&
      desprès.indexOf('CALENDARI') !== -1, desprès);

  // Una despesa nomes toca finances.
  muntats.length = 0;
  ctx.Moduls.invalidaContext('Moviments');
  ctx.Moduls.contextIA();
  cal('apuntar una despesa nomes torna a muntar finances',
      muntats.join(' ') === 'finances', muntats.join(' ') || '(cap)');

  // Un full de ningu no se sap que ha tocat: es tomben tots.
  muntats.length = 0;
  ctx.Moduls.invalidaContext('_Config');
  ctx.Moduls.contextIA();
  cal('un full que no es de cap modul els tomba tots',
      muntats.sort().join(' ') === 'calendari finances habits', muntats.join(' '));

  // I sense dir quin full, tambe.
  muntats.length = 0;
  ctx.Moduls.invalidaContext();
  ctx.Moduls.contextIA();
  cal('i sense dir res, tambe', muntats.length === 3, String(muntats.length));

  // El full de converses no ha de tombar res.
  muntats.length = 0;
  if (ctx.Moduls.alimentaContext('Converses')) ctx.Moduls.invalidaContext('Converses');
  ctx.Moduls.contextIA();
  cal('parlar segueix sense tombar res', muntats.length === 0, muntats.join(' '));
}

// ------------------- el que s'envia a Gemini: audio, eines i que no rumii per res
console.log("");
console.log("Transport a Gemini: la forma de la peticio");
{
  let enviat = null;
  const ctx = {
    Date, Math, JSON, String, Number, Object, Array, RegExp, encodeURIComponent,
    Log: { info() {}, avis() {}, error() {} },
    Config: {
      get: (k) => ({ model_bo: 'gemini-2.5-flash', model_barat: 'gemini-2.5-flash',
                     proveidor_ia: 'gemini', ia_activa: 'SI' })[k] || null,
      getNum: (k, d) => (k === 'pensa_tokens' ? 0 : d),
      esSi: () => true
    },
    Utils: { desJson: (t, d) => { try { return JSON.parse(t); } catch (e) { return d; } },
             talla: (t, n) => String(t).slice(0, n), ara: () => 'ara', avui: () => '2026-08-02' },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'clau-de-mentida' }) },
    UrlFetchApp: { fetch: (url, o) => {
      enviat = { url: url, cos: JSON.parse(o.payload), capcaleres: o.headers };
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'fet' }] } }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 2, thoughtsTokenCount: 314 } }) };
    } },
    CacheService: { getScriptCache: () => null },
    SpreadsheetApp: {}, Session: {}, HtmlService: {}, LockService: {},
    Utilities: {}, ScriptApp: {}, Dades: {}, Moduls: {}, Esquema: {}
  };
  vm.createContext(ctx);
  ctx.PROP_CLAU_IA = 'CLAU_IA';
  vm.runInContext(fs.readFileSync('apps-script/50_IA.gs', 'utf8'), ctx);

  const r0 = ctx.IA.genera({
    sistema: 'ets en JEFE',
    missatges: [
      { rol: 'usuari', text: 'hola' },
      { role: 'user', parts: [{ text: 'aixo t ha dit de veu:' },
                              { inline_data: { mime_type: 'audio/wav', data: 'UklGRg==' } }] }
    ],
    eines: [{ nom: 'mostra_el_dia', descripcio: 'obre el dia',
              esquema: { type: 'object', properties: { data: { type: 'string' } } } }],
    model: 'bo', maxTokens: 1200, temperatura: 0
  });

  cal('la clau va a la capcalera i mai a l url',
      !!ctx.IA && enviat.capcaleres['x-goog-api-key'] === 'clau-de-mentida' &&
      enviat.url.indexOf('clau-de-mentida') === -1, enviat.url);

  cal('diu quant ha rumiat, amb la xifra de Google i no una suposada',
      r0.tokensPensats === 314, JSON.stringify(r0.tokensPensats));

  const parts = enviat.cos.contents[1].parts;
  cal("l'audio arriba tal qual, sense passar per cap transcripcio",
      parts[1].inline_data.mime_type === 'audio/wav' && parts[1].inline_data.data === 'UklGRg==',
      JSON.stringify(parts));
  cal('i el torn de text d abans hi segueix sent',
      enviat.cos.contents[0].parts[0].text === 'hola', JSON.stringify(enviat.cos.contents[0]));

  cal("amb l'audio hi van les EINES: les ordres d'accio han de seguir anant",
      enviat.cos.tools[0].functionDeclarations[0].name === 'mostra_el_dia',
      JSON.stringify(enviat.cos.tools));

  // AIXO ES EL QUE COSTAVA DEU SEGONS.
  cal('no se li deixa rumiar abans de contestar',
      enviat.cos.generationConfig.thinkingConfig.thinkingBudget === 0,
      JSON.stringify(enviat.cos.generationConfig));

  // I amb un model que no ho enten, aquest camp fa petar l'API: no s hi ha de posar.
  enviat = null;
  ctx.Config.get = (k) => ({ model_bo: 'gemini-1.5-pro', proveidor_ia: 'gemini', ia_activa: 'SI' })[k] || null;
  ctx.IA.genera({ sistema: 'x', missatges: [{ rol: 'usuari', text: 'hola' }], model: 'bo' });
  // I si el model es queixa, s'hi torna sense i se'n recorda.
  var intents = 0;
  ctx.UrlFetchApp.fetch = (url, o) => {
    intents++;
    enviat = { url: url, cos: JSON.parse(o.payload) };
    if (enviat.cos.generationConfig.thinkingConfig) {
      return { getResponseCode: () => 400,
               getContentText: () => JSON.stringify({ error: { message: 'invalid argument' } }) };
    }
    return { getResponseCode: () => 200, getContentText: () => JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'fet' }] } }],
      usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 } }) };
  };
  ctx.Config.get = (k) => ({ model_bo: 'gemini-2.5-pro', proveidor_ia: 'gemini', ia_activa: 'SI' })[k] || null;
  var r2 = ctx.IA.genera({ sistema: 'x', missatges: [{ rol: 'usuari', text: 'hola' }], model: 'bo' });
  cal('si no accepta el zero, baixa al minim i respon igual',
      intents === 3 && r2.text === 'fet', intents + ' intents');
  cal('i si ni amb el minim, es deixa corrent',
      enviat.cos.generationConfig.thinkingConfig === undefined,
      JSON.stringify(enviat.cos.generationConfig));

  // EL CAS QUE IMPORTA: n'hi ha que accepten el minim encara que no el zero.
  // Abans queien directament a «rumia el que vulguis» i alla se n'anaven els
  // segons que preteniem estalviar.
  intents = 0;
  ctx.UrlFetchApp.fetch = (url, o) => {
    intents++;
    enviat = { url: url, cos: JSON.parse(o.payload) };
    var t = enviat.cos.generationConfig.thinkingConfig;
    if (t && t.thinkingBudget === 0) {
      return { getResponseCode: () => 400,
               getContentText: () => JSON.stringify({ error: { message: 'budget must be >= 128' } }) };
    }
    return { getResponseCode: () => 200, getContentText: () => JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'fet' }] } }],
      usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 } }) };
  };
  ctx.Config.get = (k) => ({ model_bo: 'un-altre-model', proveidor_ia: 'gemini', ia_activa: 'SI' })[k] || null;
  ctx.IA.genera({ sistema: 'x', missatges: [{ rol: 'usuari', text: 'hola' }], model: 'bo' });
  cal('amb un que vol un minim, s hi queda i no el deixa lliure',
      intents === 2 && enviat.cos.generationConfig.thinkingConfig.thinkingBudget === 128,
      intents + ' intents · ' + JSON.stringify(enviat.cos.generationConfig.thinkingConfig));

  intents = 0;
  ctx.IA.genera({ sistema: 'x', missatges: [{ rol: 'usuari', text: 'i ara' }], model: 'bo' });
  cal('i la seguent ja va directa al minim',
      intents === 1 && enviat.cos.generationConfig.thinkingConfig.thinkingBudget === 128,
      intents + ' intents');

  // I la seguent pregunta al mateix model ja no ho torna a provar.
  intents = 0;
  ctx.IA.genera({ sistema: 'x', missatges: [{ rol: 'usuari', text: 'i ara' }], model: 'bo' });
  cal('i no ho torna a provar cada vegada', intents === 1, intents + ' intents');
}

// ------------------- una ordre dita de veu no ha de passar pel model
console.log("");
console.log("Veu: les ordres es reconeixen despres de transcriure, sense preguntar");
{
  const moduls = [
    { id: 'conversa', fulls: [{ nom: 'Converses' }],
      dreceres: [{ vista: 'dia', frases: ['pagina del dia', 'pagina d avui', 'full del dia'] }] },
    { id: 'habits', fulls: [{ nom: 'Habits' }], contextIA: function () { return 'habits'; } }
  ];
  const ctx = {
    Date, Math, JSON, String, Number, Object, Array, RegExp,
    Log: { info() {}, avis() {}, error() {} },
    CacheService: { getScriptCache: () => null },
    Config: { full: () => ({ getSheetByName: () => null }), zonaHoraria: () => 'Europe/Madrid' },
    Utilities: { formatDate: () => '2026-08-02' },
    Dades: { llegeix: () => [] }, Esquema: {}, IA: {},
    SpreadsheetApp: {}, PropertiesService: {}, ScriptApp: {},
    HtmlService: {}, UrlFetchApp: {}, LockService: {}, Session: {}
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('apps-script/01_Utils.gs', 'utf8'), ctx);
  vm.runInContext(fs.readFileSync('apps-script/20_Moduls.gs', 'utf8'), ctx);
  moduls.forEach(function (m) { ctx['MODUL_' + m.id.toUpperCase()] = function () { return m; }; });

  const d = (t) => { const r = ctx.Moduls.drecera(t); return r ? r.vista : null; };

  cal("amb accents i apostrof, com ho diu una persona",
      d("Ensenya'm la pàgina del dia") === 'dia', String(d("Ensenya'm la pàgina del dia")));
  cal('sense accents, igual', d('obre la pagina del dia') === 'dia', String(d('obre la pagina del dia')));
  cal('en majuscules, igual', d("ENSENYA LA PÀGINA D'AVUI") === 'dia',
      String(d("ENSENYA LA PÀGINA D'AVUI")));
  cal('amb signes pel mig, igual', d("va, ensenya-m'ho: la pàgina del dia!") === 'dia',
      String(d("va, ensenya-m'ho: la pàgina del dia!")));

  cal('una pregunta de debo NO es una ordre', d('quants cigarros he fumat avui') === null,
      String(d('quants cigarros he fumat avui')));
  cal('ni aquesta', d('com ha anat el dia') === null, String(d('com ha anat el dia')));
  cal('ni res buit', d('') === null && d(null) === null, 'diu que si');

  // La bessona del client ha de fer exactament el mateix.
  cal("l'aixafat treu accents, signes i espais de mes",
      ctx.Utils.aixafa("  Ensenya'm  la PÀGINA del dia!! ") === 'ensenya m la pagina del dia',
      ctx.Utils.aixafa("  Ensenya'm  la PÀGINA del dia!! "));
}

// -------------- si el model de transcriure no hi es, no et quedes sense veu
console.log("");
console.log("Veu: el model de transcriure pot no existir, i no pot deixar-te tirat");
{
  const crides = [];
  const ctx = {
    Date, Math, JSON, String, Number, Object, Array, RegExp,
    Log: { info() {}, avis() {}, error() {} },
    Utils: { avui: () => '2026-08-02', ara: () => 'ara', nouId: () => 'cnv_1',
             desJson: (t, d) => d, json: (o) => JSON.stringify(o), talla: (t, n) => String(t).slice(0, n),
             aixafa: (t) => String(t).toLowerCase() },
    Config: { get: (k) => (k === 'model_veu' ? 'un-model-que-no-hi-es' : null) },
    Dades: { llegeix: () => [], insereix: () => null },
    Moduls: { drecera: () => null, dreceres: () => [] },
    Assistent: { pregunta: () => ({ text: 'resposta', propostes: [], einesUsades: [],
                                    tokens: {}, temps: { total: 1, ia: 1, context: 0, eines: 0, voltes: 1 } }) },
    IA: {
      genera: (p) => {
        crides.push(p.model);
        if (p.model === 'un-model-que-no-hi-es') throw new Error('404 model not found');
        return { text: 'quants cigarros he fumat avui' };
      },
      disponible: () => true, motiu: () => null,
      consum: () => ({ avui: 3, tocat: false, faSegons: null })
    },
    Habits: { definicions: () => [] },
    SpreadsheetApp: {}, PropertiesService: {}, ScriptApp: {}, CacheService: {},
    HtmlService: {}, UrlFetchApp: {}, LockService: {}, Session: {}, Utilities: {}
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('apps-script/40_Mod_Conversa.gs', 'utf8'), ctx);

  const r = ctx.Conversa.enviaVeu({ audio: 'AAAA', mime: 'audio/wav' });
  cal('ho prova amb el model de veu i despres amb el de sempre',
      crides.join(' ').indexOf('un-model-que-no-hi-es barat') === 0, crides.join(' '));
  cal('i contesta igual', r.resposta === 'resposta', JSON.stringify(r).slice(0, 120));

  // Pero si el problema es la quota, no s'hi ha d'insistir amb l'altre model.
  crides.length = 0;
  ctx.IA.genera = (p) => { crides.push(p.model); var e = new Error('limit'); e.quota = true; throw e; };
  const r2 = ctx.Conversa.enviaVeu({ audio: 'AAAA', mime: 'audio/wav' });
  cal('amb la quota esgotada no ho torna a provar i gasta mes',
      crides.length === 1, crides.join(' '));
  cal('i ho diu clar', /limit/.test(r2.error || ''), JSON.stringify(r2));

  // Sense audio, ni ho intenta.
  var ho = false;
  try { ctx.Conversa.enviaVeu({}); } catch (e) { ho = true; }
  cal('sense so, no crida ningu', ho, 'ho ha fet');
}

// ------------ una clau que no serveix no pot semblar que el banc no doni res
console.log("");
console.log("Banc: si no es pot signar, que ho digui i no acusi el banc");
{
  const ctx = {
    Date, Math, JSON, String, Number, Object, Array, RegExp, isNaN, parseInt, parseFloat,
    Log: { info() {}, avis() {}, error() {} },
    Utils: { avui: () => '2026-08-02', ara: () => 'ara', talla: (t, n) => String(t).slice(0, n),
             desJson: (t, d) => { try { return JSON.parse(t); } catch (e) { return d; } },
             diesEntre: () => 30 },
    Config: { zonaHoraria: () => 'Europe/Madrid', get: () => null, getNum: (k, d) => d },
    Utilities: {
      base64EncodeWebSafe: () => 'x',
      newBlob: (t) => ({ getBytes: () => t }),
      formatDate: (d) => d.getFullYear() + '-01-01',
      // Aixo es exactament el que fa Apps Script amb una clau que no li serveix.
      computeRsaSha256Signature: () => { throw new Error('Invalid argument: key'); }
    },
    CacheService: { getScriptCache: () => ({ get: () => null, put: () => {} }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (k) => ({ FINANCES_BANC: JSON.stringify({ connected: true, accounts: [{ uid: 'u1' }] }),
                             EB_APP_ID: 'app', EB_PRIVATE_KEY: 'una-clau-que-no-serveix',
                             EB_REDIRECT: 'r' })[k] || null,
      setProperty: () => {} }) },
    UrlFetchApp: { fetch: () => { throw new Error('no hi hauria d hagut d arribar'); } },
    Dades: { llegeix: () => [], perId: () => null, insereix: () => null,
             actualitza: () => null, desa: () => null },
    Finances: { afegeix: (m) => m },
    FinancesRegles: { descripcio: () => 'x', categoria: () => '', metode: () => '' },
    SpreadsheetApp: {}, Session: {}, HtmlService: {}, LockService: {}, ScriptApp: {},
    Moduls: { registra: () => {} }, Esquema: {}, IA: {}, Notifica: {}
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('apps-script/01_Utils.gs', 'utf8'), ctx);
  vm.runInContext(fs.readFileSync('apps-script/42_Finances_Banc.gs', 'utf8'), ctx);

  const r = ctx.FinancesBanc.sincronitza();
  const err = (r.errors || []).join(' ');

  cal("l'error diu que es la clau, no un misteri d'Apps Script",
      /clau privada/.test(err) && /EB_PRIVATE_KEY/.test(err), err);
  cal('i diu on mirar-ho', /provaClauBanc/.test(err), err);
  cal("i no s'ha arribat a demanar res al banc", r.nous === 0, String(r.nous));
}

// ------- la clau del banc, tal com la deixa el quadre de propietats d'Apps Script
console.log("");
console.log("Banc: una clau desada en una sola linia s'ha de tornar a plegar");
{
  const crypto = await import('crypto');
  // Una clau RSA de debo, generada aqui: no n'hi ha cap de cap altre lloc.
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).trim();
  // I la mateixa, tal com queda quan la desa el quadre de propietats.
  const plana = pem.split(String.fromCharCode(10)).join('');

  const signaAmb = (clau) => {
    const c = crypto.createSign('RSA-SHA256');
    c.update('prova');
    return c.sign(clau);
  };

  function ambClau(valor) {
    const ctx = {
      Date, Math, JSON, String, Number, Object, Array, RegExp,
      Log: { info() {}, avis() {}, error() {} },
      Utils: { avui: () => '2026-08-02', ara: () => 'ara', talla: (t, n) => String(t).slice(0, n),
               desJson: (t, d) => d },
      Config: { zonaHoraria: () => 'Europe/Madrid', get: () => null, getNum: (k, d) => d },
      Utilities: {
        base64EncodeWebSafe: () => 'x',
        newBlob: (t) => ({ getBytes: () => t }),
        formatDate: () => '2026-08-02',
        computeRsaSha256Signature: (text, clau) => {
          try { return signaAmb(clau); }
          catch (e) { throw new Error('Invalid argument: key'); }
        }
      },
      CacheService: { getScriptCache: () => ({ get: () => null, put: () => {} }) },
      PropertiesService: { getScriptProperties: () => ({
        getProperty: (k) => ({ EB_PRIVATE_KEY: valor, EB_APP_ID: 'app' })[k] || null,
        setProperty: () => {} }) },
      UrlFetchApp: {}, Dades: {}, Finances: {}, FinancesRegles: {},
      SpreadsheetApp: {}, Session: {}, HtmlService: {}, LockService: {}, ScriptApp: {},
      Moduls: { registra: () => {} }, Esquema: {}, IA: {}, Notifica: {}
    };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync('apps-script/01_Utils.gs', 'utf8'), ctx);
    ctx.Utils.avui = () => '2026-08-02';
    vm.runInContext(fs.readFileSync('apps-script/42_Finances_Banc.gs', 'utf8'), ctx);
    return ctx;
  }

  // Primer, que la premissa sigui certa i no una idea meva.
  let planaFalla = false;
  try { signaAmb(plana); } catch (e) { planaFalla = true; }
  cal('una clau en una sola linia NO serveix per signar', planaFalla, 'doncs si que serveix');

  const plegada = ambClau(plana).FinancesBanc.clauPem();

  // I la peca compartida directament, que la fa servir tambe el JWT de les
  // notificacions, on la clau ve d'un JSON amb els salts escrits.
  const ctxU = { RegExp, String, Array, Math, Date, Utilities: {}, Config: {} };
  vm.createContext(ctxU);
  vm.runInContext(fs.readFileSync('apps-script/01_Utils.gs', 'utf8'), ctxU);
  const ambBarres = pem.split(String.fromCharCode(10)).join(String.fromCharCode(92) + 'n');
  cal('una clau amb els salts ESCRITS tambe es desfa',
      ctxU.Utils.plegaPem(ambBarres) === pem, 'no coincideix');
  cal('i una que no es cap PEM es torna tal qual',
      ctxU.Utils.plegaPem('aixo no es una clau') === 'aixo no es una clau', 'l ha tocada');
  cal('i res, res', ctxU.Utils.plegaPem('') === '' && ctxU.Utils.plegaPem(null) === '', 'peta');
  cal('plegada, torna a tenir salts de linia', plegada.indexOf(String.fromCharCode(10)) !== -1, 'no en te');
  var ratlles = plegada.split(String.fromCharCode(10));
  cal('les ratlles del cos fan 64', ratlles[1].length === 64, String(ratlles[1].length));
  cal('i queda EXACTAMENT com el fitxer original', plegada === pem, 'no coincideix');

  let signa = false;
  try { signaAmb(plegada); signa = true; } catch (e) {}
  cal('i amb la plegada SI que es pot signar', signa, 'segueix sense poder');

  cal('una clau que ja ve amb salts es queda igual',
      ambClau(pem).FinancesBanc.clauPem() === pem, 'l ha tocada');
}

// --------- les pantalles desades: rapides, pero mai amb una dada vella
console.log("");
console.log("Memoria de pantalles: desar sense mentir");
{
  const memoria = {};
  const cau = {
    get: (k) => (memoria[k] === undefined ? null : memoria[k]),
    getAll: (ks) => { const o = {}; ks.forEach(k => { if (memoria[k] !== undefined) o[k] = memoria[k]; }); return o; },
    put: (k, v) => { memoria[k] = v; },
    putAll: (o) => { Object.keys(o).forEach(k => { memoria[k] = o[k]; }); },
    remove: (k) => { delete memoria[k]; },
    removeAll: (ks) => { ks.forEach(k => { delete memoria[k]; }); }
  };

  const moduls = [
    { id: 'tasques', fulls: [{ nom: 'Tasques' }] },
    { id: 'finances', fulls: [{ nom: 'Moviments' }, { nom: 'Categories' }] }
  ];

  const ctx = {
    Date, Math, JSON, String, Number, Object, Array, RegExp,
    Log: { info() {}, avis() {}, error() {} },
    CacheService: { getScriptCache: () => cau },
    Config: { full: () => ({ getSheetByName: () => null }) },
    Utils: { avui: () => '2026-08-02', ara: () => 'ara' },
    Dades: null, Esquema: {}, IA: {}, SpreadsheetApp: {}, PropertiesService: {},
    ScriptApp: {}, HtmlService: {}, UrlFetchApp: {}, LockService: {}, Session: {}, Utilities: {}
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('apps-script/20_Moduls.gs', 'utf8'), ctx);
  vm.runInContext(fs.readFileSync('apps-script/25_Memoria.gs', 'utf8'), ctx);
  moduls.forEach(function (m) { ctx['MODUL_' + m.id.toUpperCase()] = function () { return m; }; });

  let muntades = 0;
  const pantalla = (modul, nom, valor) =>
    ctx.Memoria.recorda(modul, nom, () => { muntades++; return { v: valor }; });

  // 1. La segona vegada no es torna a muntar.
  cal('la primera vegada la munta', pantalla('tasques', 'pantalla', 1).v === 1 && muntades === 1,
      String(muntades));
  muntades = 0;
  cal('la segona ja no', pantalla('tasques', 'pantalla', 1).v === 1 && muntades === 0,
      String(muntades));

  // 2. Dues pantalles diferents del mateix modul no es trepitgen.
  muntades = 0;
  const a = pantalla('finances', 'pantalla:mes:2026-08', 'agost');
  const b = pantalla('finances', 'pantalla:mes:2026-07', 'juliol');
  cal('cada pantalla te la seva clau', a.v === 'agost' && b.v === 'juliol' && muntades === 2,
      a.v + '/' + b.v + ' · ' + muntades);

  // 3. I ARA EL QUE IMPORTA: escriure ha de tombar el que sigui d'aquell modul.
  const dadesCtx = {
    Utils: { nouId: () => 'x', ara: () => 'ARA' },
    Config: { full: () => ({ getSheetByName: () => ({
      getDataRange: () => ({ getValues: () => [['id']] }),
      getRange: () => ({ setValues: () => {} }), getMaxRows: () => 10 }) }) },
    LockService: null, Moduls: ctx.Moduls, Memoria: ctx.Memoria
  };
  vm.createContext(dadesCtx);
  vm.runInContext(fs.readFileSync('apps-script/10_Dades.gs', 'utf8'), dadesCtx);

  muntades = 0;
  dadesCtx.Dades.invalida('Moviments');
  pantalla('finances', 'pantalla:mes:2026-08', 'agost NOU');
  cal('apuntar un moviment tomba la pantalla de finances', muntades === 1, String(muntades));
  cal('i la torna a muntar amb el que hi ha ara',
      pantalla('finances', 'pantalla:mes:2026-08', 'x').v === 'agost NOU', 'ensenya la vella');

  // 4. I no ha de tombar la del vei.
  muntades = 0;
  pantalla('tasques', 'pantalla', 'no importa');
  cal('i no toca la de tasques, que no ha canviat', muntades === 0, String(muntades));

  // 5. Un full de ningu no se sap que ha tocat: cauen totes.
  muntades = 0;
  dadesCtx.Dades.invalida('_Config');
  pantalla('tasques', 'pantalla', 'z');
  pantalla('finances', 'pantalla:mes:2026-08', 'z');
  cal('canviar la configuracio les tomba totes', muntades === 2, String(muntades));

  // 6. I sense dir quin full, tambe.
  muntades = 0;
  dadesCtx.Dades.invalida();
  pantalla('tasques', 'pantalla', 'w');
  cal('i sense dir res, tambe', muntades === 1, String(muntades));

  // 7. EL CALAIX COMU: el que suma tots els moduls cau amb qualsevol escriptura.
  muntades = 0;
  ctx.Memoria.recordaComu('inici', () => { muntades++; return { v: 1 }; });
  ctx.Memoria.recordaComu('inici', () => { muntades++; return { v: 1 }; });
  cal('el calaix comu tambe es desa', muntades === 1, String(muntades));

  muntades = 0;
  dadesCtx.Dades.invalida('Tasques');          // una escriptura d'un modul qualsevol
  ctx.Memoria.recordaComu('inici', () => { muntades++; return { v: 2 }; });
  cal("qualsevol escriptura tomba el comu, sigui d'on sigui", muntades === 1, String(muntades));

  // I no ha de durar mitja hora: hi ha el calendari a dins, que no surt de cap full.
  const abansPut = memoria['gen_nucli'];
  cal('el comu te el seu calaix a part', typeof abansPut === 'string', String(abansPut));

  // 8. Sense memoria cau, ha de seguir funcionant.
  ctx.CacheService.getScriptCache = () => { throw new Error('sense cau'); };
  muntades = 0;
  const r = pantalla('tasques', 'pantalla', 'sense cau');
  cal('sense memoria cau munta igual i no peta', r.v === 'sense cau' && muntades === 1,
      String(muntades));
}

// ----------- les targetes d'inici es desen, menys les del que no surt d'un full
console.log("");
console.log("Inici: cada targeta desada a casa seva, i el calendari mai");
{
  const memoria = {};
  const cau = {
    get: (k) => (memoria[k] === undefined ? null : memoria[k]),
    getAll: (ks) => { const o = {}; ks.forEach(k => { if (memoria[k] !== undefined) o[k] = memoria[k]; }); return o; },
    put: (k, v) => { memoria[k] = v; }, putAll: (o) => { Object.keys(o).forEach(k => { memoria[k] = o[k]; }); },
    remove: (k) => { delete memoria[k]; }, removeAll: (ks) => { ks.forEach(k => { delete memoria[k]; }); }
  };

  const comptador = { finances: 0, calendari: 0, tasques: 0 };
  const moduls = [
    { id: 'finances', nom: 'Finances', fulls: [{ nom: 'Moviments' }],
      resumInici: function () { comptador.finances++; return { etiqueta: 'Balanç', valor: '400 €' }; } },
    { id: 'tasques', nom: 'Tasques', fulls: [{ nom: 'Tasques' }],
      resumInici: function () { comptador.tasques++; return { etiqueta: 'Per fer', valor: 3 }; } },
    // El calendari NO surt del seu full: no s'ha de desar mai.
    { id: 'calendari', nom: 'Calendari', volatil: true, fulls: [{ nom: 'Calendaris' }],
      resumInici: function () { comptador.calendari++; return { etiqueta: 'El següent', valor: '17:00' }; } }
  ];

  const ctx = {
    Date, Math, JSON, String, Number, Object, Array, RegExp,
    Log: { info() {}, avis() {}, error() {} },
    CacheService: { getScriptCache: () => cau },
    Config: { full: () => ({ getSheetByName: () => null }) },
    Utils: { avui: () => '2026-08-02', ara: () => 'ara' },
    Dades: { llegeix: () => [] }, Esquema: {}, IA: {},
    SpreadsheetApp: {}, PropertiesService: {}, ScriptApp: {},
    HtmlService: {}, UrlFetchApp: {}, LockService: {}, Session: {}, Utilities: {}
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('apps-script/25_Memoria.gs', 'utf8'), ctx);
  vm.runInContext(fs.readFileSync('apps-script/20_Moduls.gs', 'utf8'), ctx);
  moduls.forEach(function (m) { ctx['MODUL_' + m.id.toUpperCase()] = function () { return m; }; });

  const t1 = ctx.Moduls.resumInici();
  cal('la primera vegada les munta totes',
      comptador.finances === 1 && comptador.tasques === 1 && comptador.calendari === 1,
      JSON.stringify(comptador));
  cal('i surten totes tres', t1.length === 3, String(t1.length));
  cal('amb el mòdul a dins', t1[0].modul === 'finances', JSON.stringify(t1[0]));

  ctx.Moduls.resumInici();
  cal('la segona no torna a muntar les que surten del full',
      comptador.finances === 1 && comptador.tasques === 1, JSON.stringify(comptador));
  cal('PERO EL CALENDARI SI: el que ensenya no surt del seu full',
      comptador.calendari === 2, String(comptador.calendari));

  // I escriure a finances no ha de tocar la targeta de tasques.
  ctx.Memoria.oblida('finances');
  ctx.Moduls.resumInici();
  cal('escriure a finances només torna a muntar la de finances',
      comptador.finances === 2 && comptador.tasques === 1, JSON.stringify(comptador));
}


// -------------------------------------------------- avisos programats dels mòduls
/* El pic de divendres al matí és l'única raó per la qual el mòdul de seguiment
   existeix: un xat no pot obrir conversa sol. Si això s'espatlla, el mòdul
   deixa de servir per al que serveix i no ho notaria ningú fins divendres. */
console.log('\nAvisos: un mòdul pot demanar hora sense que el nucli el conegui');
{
  const ctx = carregaTotElServidor();

  let triggers = [];
  const cadena = (nom) => {
    const c = {};
    ['timeBased', 'everyDays', 'everyMinutes', 'onWeekDay', 'onMonthDay', 'nearMinute']
      .forEach((m) => { c[m] = () => c; });
    c.atHour = (h) => { triggers.push({ fn: nom, hora: h }); return c; };
    c.create = () => {};
    return c;
  };
  ctx.ScriptApp = { newTrigger: (n) => cadena(n), getProjectTriggers: () => [],
                    WeekDay: { MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4,
                               FRIDAY: 5, SATURDAY: 6, SUNDAY: 7 } };
  ctx.Config = { getNum: (k, d) => ({ hora_resum: 23, dia_revisio: 7, hora_revisio: 23 }[k] ?? d),
                 get: () => null };
  ctx.Log = { info() {}, avis() {}, error() {} };
  ctx.treuTriggers = () => {};
  ctx.ambBloqueig_ = (f) => f();

  let enviades = [];
  ctx.Notifica = { envia: (t, c, o) => { enviades.push({ titol: t, url: o.url }); return {}; } };

  ctx.instalaTriggers();
  const seus = triggers.filter((t) => t.fn === 'triggerAvisos');
  cal('es crea una hora de trigger per cada hora que demana un mòdul',
      seus.length === 1 && seus[0].hora === 7, JSON.stringify(seus));

  /* Les quatre combinacions que importen. La que ha d'enviar és una de sola:
     divendres, a les set, i amb el control encara per fer. */
  const quan = (iso) => { ctx.Date = class extends Date { constructor() { super(iso); } }; };
  const prova = (iso, fet) => {
    enviades = [];
    ctx.Seguiment.estat = () => ({ fetAquestaSetmana: fet });
    quan(iso);
    ctx.triggerAvisos();
    return enviades.length;
  };

  cal('divendres a les 7 amb el control per fer: pica',
      prova('2026-08-07T07:15:00', false) === 1);
  cal('divendres a les 7 amb el control ja fet: calla',
      prova('2026-08-07T07:15:00', true) === 0);
  cal('dijous a les 7: no és el seu dia',
      prova('2026-08-06T07:15:00', false) === 0);
  cal('divendres a les 15: no és la seva hora',
      prova('2026-08-07T15:15:00', false) === 0);

  /* Un mòdul que peti no se n'ha d'emportar cap altre: és la mateixa regla que
     a `elDia` i a `resumInici`, i aquí encara importa més perquè ningú no ho
     està mirant quan passa. */
  enviades = [];
  ctx.Seguiment.estat = () => { throw new Error('el full no hi és'); };
  quan('2026-08-07T07:15:00');
  let ha_petat = false;
  try { ctx.triggerAvisos(); } catch (e) { ha_petat = true; }
  cal('un avís que peta es registra i no tomba el repartidor', !ha_petat);
}


// --------------------------------------- les dues còpies de les regles del seguiment
/* HI HA DUES IMPLEMENTACIONS DE LES MATEIXES REGLES, i és a posta: al navegador
   perquè el veredicte surti sense cap viatge, i al servidor perquè `elDia`,
   `resumInici` i el context de la IA no passen pel navegador.

   Dues còpies deriven. I derivarien EN SILENCI: la pantalla diria una cosa i la
   notificació una altra, i tu no ho sabries fins que et fixessis. Això les fa
   córrer totes dues sobre els mateixos casos i compara què en surt. */
console.log('\nSeguiment: la còpia del navegador i la del servidor diuen el mateix');
{
  const font = fs.readFileSync('apps-script/40_Mod_Seguiment.gs', 'utf8');
  const vista = fs.readFileSync('apps-script/vista_seguiment.html', 'utf8');

  // --- la del servidor
  const srvFont = font.slice(font.indexOf('var Seguiment = (function ()'),
                             font.lastIndexOf('})();') + 5);
  const srvCtx = {
    Utils: { avui: () => '2026-08-03' }, Dades: { llegeix: () => [] },
    Log: { info() {}, avis() {}, error() {} }, IA: { disponible: () => false },
    Memoria: {}, Date, Math, Number, String, JSON, parseFloat, isFinite, Object, Array
  };
  vm.createContext(srvCtx);
  vm.runInContext(srvFont.replace('var Seguiment =', 'var Seguiment ='), srvCtx);
  const servidor = srvCtx.Seguiment;

  // --- la del navegador
  const i0 = vista.indexOf('    function coma(n, dec) {');
  const i1 = vista.indexOf('    // ------------------------------------------------------------- gràfiques');
  cal('es troba la còpia del navegador dins de la vista', i0 > 0 && i1 > i0);
  const cliCtx = { Date, Math, Number, String, JSON, Object, Array };
  vm.createContext(cliCtx);
  vm.runInContext(vista.slice(i0, i1) + '\nvar __regles = Regles;', cliCtx);
  const client = cliCtx.__regles;

  /* Els casos que importen: cadascun dispara una regla diferent, i n'hi ha un
     per cada error que el motor de referència tenia. */
  const L = servidor.LLINDAR;
  const c = (data, pes, cintura, valida, forca, trail, gros, energia) =>
    ({ data, pes, cintura, cinturaValida: valida, forca, trail, trailGros: gros,
       energia: energia || '', son: '', gana: '', dieta: '' });

  const CASOS = [
    ['ritme bo', [c('2026-01-02', 70, 85, true, 2, 3, 0), c('2026-01-09', 69.4, 84.5, true, 2, 3, 0)]],
    ['massa ràpid', [c('2026-01-02', 70, 85, true, 2, 3, 0), c('2026-01-09', 68.5, 84, true, 2, 3, 0)]],
    ['salt impossible', [c('2026-01-02', 70, 85, true, 2, 3, 0), c('2026-01-09', 87, 84, true, 2, 3, 0)]],
    ['senyal bo', [c('2026-01-02', 70, 85, true, 2, 3, 0), c('2026-01-09', 70.2, 84.5, true, 2, 3, 0)]],
    ['cintura incoherent', [c('2026-01-02', 70, 85, true, 2, 3, 0), c('2026-01-09', 70.1, 82, true, 2, 3, 0)]],
    ['poca força', [c('2026-01-02', 70, 85, true, 2, 3, 0), c('2026-01-09', 69.5, 84.5, true, 0, 3, 0)]],
    ['trail gros', [c('2026-01-02', 70, 85, true, 2, 3, 0), c('2026-01-09', 69.5, 84.5, true, 2, 4, 2)]],
    ['energia baixa dues vegades', [c('2026-01-02', 70, 85, true, 2, 3, 0, 'baixa'),
                                    c('2026-01-09', 69.5, 84.5, true, 2, 3, 0, 'baixa')]],
    // Els tres que el motor de Python feia malament:
    ['interval de 10 dies', [c('2026-01-02', 70, 85, true, 2, 3, 0), c('2026-01-12', 69.3, 84.5, true, 2, 3, 0)]],
    ['cintura marcada com a dolenta', [c('2026-01-02', 70, 89, false, 2, 3, 0),
                                       c('2026-01-09', 70.1, 84, true, 2, 3, 0)]],
    ['cintura de referència vella', [c('2026-01-02', 70, 85, true, 2, 3, 0),
                                     c('2026-01-09', 69.6, null, true, 2, 3, 0),
                                     c('2026-01-16', 69.2, 84.6, true, 2, 3, 0)]]
  ];

  let iguals = 0, diferents = [];
  CASOS.forEach(([nom, h]) => {
    for (let i = 0; i < h.length; i++) {
      const s = servidor.analitza(h, i).map((a) => a.id + ':' + a.nivell).sort().join(' ');
      const n = client.analitza(h, i, L).map((a) => a.id + ':' + a.nivell).sort().join(' ');
      if (s === n) iguals++;
      else diferents.push(nom + ' [' + i + ']  servidor=«' + s + '»  navegador=«' + n + '»');
    }
    const vs = servidor.veredicte(servidor.analitza(h, h.length - 1));
    const vn = client.veredicte(client.analitza(h, h.length - 1, L));
    if (vs !== vn) diferents.push(nom + ' veredicte  servidor=«' + vs + '»  navegador=«' + vn + '»');
  });

  cal('les dues còpies donen les mateixes regles a tots els casos',
      diferents.length === 0, '\n      ' + diferents.join('\n      '));
  cal('i s\'han comparat prou casos', iguals >= 20, iguals + ' comparacions');

  /* Els tres arreglos respecte del motor de referència, comprovats un per un
     perquè si algú els desfés, la prova de dalt seguiria passant —les dues
     còpies estarien igual de malament—. */
  const regles = (h, i) => servidor.analitza(h, i).map((a) => a.id);

  /* EL CAS HA DE DISTINGIR. −1,0 kg en 10 dies son −0,70/setmana: franja bona.
     Sense normalitzar —que es el que feia el motor de referencia— serien
     −1,0/setmana i saltaria «massa rapid». I al reves: −0,5 kg en 4 dies son
     −0,875/setmana, massa; sense normalitzar semblarien una setmana bona.
     Amb aquests dos, desfer l arreglo trenca la prova. */
  const deuDies = [c('2026-01-02', 70, 85, true, 2, 3, 0), c('2026-01-12', 69, 84.5, true, 2, 3, 0)];
  cal('10 dies i −1,0 kg són −0,70/setmana, no −1,0: franja bona',
      regles(deuDies, 1).indexOf('ritme_bo') !== -1 &&
      regles(deuDies, 1).indexOf('massa_rapid') === -1,
      JSON.stringify(regles(deuDies, 1)));

  const quatreDies = [c('2026-01-02', 70, 85, true, 2, 3, 0), c('2026-01-06', 69.5, 84.5, true, 2, 3, 0)];
  cal('4 dies i −0,5 kg són −0,875/setmana: massa, i es diu que l interval és curt',
      regles(quatreDies, 1).indexOf('massa_rapid') !== -1 &&
      regles(quatreDies, 1).indexOf('interval_rar') !== -1,
      JSON.stringify(regles(quatreDies, 1)));

  const dolenta = [c('2026-01-02', 70, 89, false, 2, 3, 0), c('2026-01-09', 70.1, 84, true, 2, 3, 0)];
  cal('una cintura marcada com a dolenta no genera cap senyal',
      regles(dolenta, 1).indexOf('senyal_bo') === -1 &&
      regles(dolenta, 1).indexOf('cintura_incoherent') === -1,
      JSON.stringify(regles(dolenta, 1)));

  const gros = [c('2026-01-02', 70, 85, true, 2, 3, 0), c('2026-01-09', 69.5, 84.5, true, 2, 4, 2)];
  cal('els dies de trail gros avisen (la regla que no s\'havia implementat mai)',
      regles(gros, 1).indexOf('trail_gros') !== -1, JSON.stringify(regles(gros, 1)));
}


// ------------------------------------------ on va cada notificació en tocar-la
/* Quatre de les nou notificacions obrien una pàgina 404, i cap prova ho veia:
   totes passaven, perquè el destí era una cadena i ningú comprovava que fos
   una pantalla de debò. Això ho mira, i mira TOTES les que hi hagi al codi:
   una de nova que s'equivoqui igual, es trobarà aquesta prova al davant. */
console.log('\nNotificacions: totes han de portar a una pantalla que existeixi');
{
  const src = fs.readFileSync('apps-script/60_Notificacions.gs', 'utf8');
  const cos = src.slice(src.indexOf('function capOn_(url) {'), src.indexOf('function envia(titol'));
  const ctx = { String };
  vm.createContext(ctx);
  vm.runInContext(cos + '\nvar __c = capOn_;', ctx);
  const capOn = ctx.__c;

  cal('un nom de pantalla a seques es converteix en hash',
      capOn('escola') === './#escola', capOn('escola'));
  cal('el que ja estava bé no es toca',
      capOn('./#finances') === './#finances', capOn('./#finances'));
  cal('l\'arrel es queda com l\'arrel',
      capOn('./') === './' && capOn('') === './');

  /* I que `envia` la FACI SERVIR. Sense això, la prova de dalt passava amb la
     normalització desconnectada: comprovava una funció que no cridava ningú.
     Ho he vist perquè he tornat a trencar-ho a posta per veure si saltava. */
  cal('i que envia() la faci servir a la notificació i a l\'enllaç',
      /url:\s*capOn_\(/.test(src) && /link:\s*capOn_\(/.test(src));

  /* Les pantalles que existeixen de debò, llegides d'on es registren. */
  const vistes = new Set();
  fs.readdirSync('apps-script').filter((f) => f.startsWith('vista_')).forEach((f) => {
    const t = fs.readFileSync('apps-script/' + f, 'utf8');
    const m = t.match(/App\.registraVista\(\s*'([a-z0-9_]+)'/g) || [];
    m.forEach((x) => vistes.add(x.match(/'([a-z0-9_]+)'/)[1]));
  });
  cal('es troben les pantalles registrades', vistes.size >= 8, [...vistes].join(', '));

  /* Cada `url:` que surti al costat d'un `Notifica.envia`. */
  const destins = [];
  fs.readdirSync('apps-script').filter((f) => f.endsWith('.gs')).forEach((f) => {
    const t = fs.readFileSync('apps-script/' + f, 'utf8');
    let i = 0;
    while ((i = t.indexOf('Notifica.envia(', i)) !== -1) {
      const tros = t.slice(i, i + 500);
      const m = tros.match(/url:\s*'([^']*)'/);
      if (m) destins.push({ on: f, url: m[1] });
      i += 15;
    }
  });
  cal('es troben les notificacions del codi', destins.length >= 7, destins.length + ' trobades');

  const dolents = destins.filter((d) => {
    const v = capOn(d.url).replace('./#', '').replace('./', '');
    return v && !vistes.has(v);
  });
  cal('cap notificació porta a una pantalla que no existeix',
      dolents.length === 0, dolents.map((d) => d.on + ' → ' + d.url).join(' · '));

  /* I la còpia del treballador de servei ha de dir el mateix: és la que mana
     quan la notificació ja és al telèfon i l'app està tancada. */
  const sw = fs.readFileSync('firebase-messaging-sw.js', 'utf8');
  const bloc = sw.slice(sw.indexOf("self.addEventListener('notificationclick'"),
                        sw.indexOf('// Que una versió nova'));
  const arrel = 'https://exemple.test/jefe/';
  /* El treballador contesta amb una promesa —`matchAll` ho és— i la primera
     versió d'aquesta prova llegia el resultat abans que hi fos. Fallava la
     prova, no el codi. `waitUntil` és per on el treballador diu «encara no he
     acabat»: aquí s'agafa i s'espera, que és el que fa el navegador. */
  const obre = async (url, jaOberta) => {
    let obertes = [], navegat = null, missatges = [], guardat = null;
    const finestra = { url: arrel, focus: () => finestra,
                       navigate: (u) => { navegat = u; return Promise.resolve(finestra); },
                       postMessage: (m) => missatges.push(m) };
    const c = { String, Promise,
      self: { registration: { scope: arrel },
              clients: { matchAll: () => Promise.resolve(jaOberta ? [finestra] : []),
                         openWindow: (u) => { obertes.push(u); return Promise.resolve(); } },
              addEventListener: (n, f) => { c.__f = f; } } };
    c.self.self = c.self;
    vm.createContext(c);
    vm.runInContext(bloc, c);
    c.__f({ notification: { close: () => {}, data: { url } },
            waitUntil: (pr) => { guardat = pr; } });
    await guardat;
    return { obertes, navegat, missatges };
  };

  const tancada = await obre('escola', false);
  cal('el treballador obre l\'adreça sencera, no la relativa',
      tancada.obertes[0] === arrel + '#escola', tancada.obertes[0]);

  const oberta = await obre('escola', true);
  cal('i amb l\'app ja oberta hi navega en comptes de deixar-te on eres',
      oberta.navegat === arrel + '#escola', oberta.navegat);
  cal('i a més li ho diu per missatge, que és instantani',
      (oberta.missatges[0] || {}).vista === 'escola', JSON.stringify(oberta.missatges));
}

console.log(falles ? '\n' + falles + ' falla(des).\n' : '\nTot correcte.\n');
process.exit(falles ? 1 : 0);
