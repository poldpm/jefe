/**
 * JEFE — proves del nucli
 *
 *   npm run prova     (i tambe des de )
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
  cal('des que existeix i no set dies sempre',
      cig2.mitjana7 === 5.3, String(cig2.mitjana7));    // (8+5+3)/3 = 5,33
}

console.log(falles ? '\n' + falles + ' falla(des).\n' : '\nTot correcte.\n');
process.exit(falles ? 1 : 0);
