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

console.log(falles ? '\n' + falles + ' falla(des).\n' : '\nTot correcte.\n');
process.exit(falles ? 1 : 0);
