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
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
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
      /Es queda:  Compte ···4471  →  4052 € del 2026-08-01/.test(previsio), previsio);
  cal("i hi ajunta el congelat", /S'hi ajunta: Compte ···4471  →  4353 € del 2026-06-01/.test(previsio), previsio);
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

console.log(falles ? '\n' + falles + ' falla(des).\n' : '\nTot correcte.\n');
process.exit(falles ? 1 : 0);
