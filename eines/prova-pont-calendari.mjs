/**
 * El pont del calendari viu al compte de l'escola i no es pot provar des d'aquí
 * amb dades de debò. El que sí que es pot provar és la TRADUCCIÓ, que és on es
 * trenquen aquestes coses: els dies sencers acaben l'endemà a l'API, i si no es
 * resta un dia, una festa surt marcada dos cops.
 */
import fs from 'fs';
import vm from 'vm';

const doc = fs.readFileSync('docs/04-calendari-escola.md', 'utf8');
const blocs = doc.split('```');
let codi = '';
for (let i = 1; i < blocs.length; i += 2) {
  const b = blocs[i];
  if (/^js|^javascript/.test(b) && /function doPost/.test(b)) codi = b.replace(/^(js|javascript)\n/, '');
}

const ctx = {
  console, Date, JSON, Math, String, Number, Object, Array, isNaN, isFinite,
  encodeURIComponent, parseInt, parseFloat
};
ctx.globalThis = ctx;

let peticions = [];
ctx.ScriptApp = { getOAuthToken: () => 'testimoni' };
ctx.Session = { getScriptTimeZone: () => 'Europe/Madrid' };
ctx.Utilities = {
  formatDate: (d, tz, f) => {
    const p = (n) => ('0' + n).slice(-2);
    return f === 'HH:mm' ? p(d.getHours()) + ':' + p(d.getMinutes())
                         : d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
};
ctx.CalendarApp = {
  getDefaultCalendar: () => ({ getId: () => 'a@escola' }),
  getAllOwnedCalendars: () => [
    { getId: () => 'a@escola', getName: () => 'Docència', getColor: () => '#a00' },
    { getId: () => 'b@escola', getName: () => 'Claustre', getColor: () => '#0a0' }
  ],
  getCalendarById: () => { throw new Error('no s\'ha de tocar'); }
};

const ITEMS = [
  { id: 'x1', summary: 'Classe de medi', status: 'confirmed',
    start: { dateTime: '2026-08-04T09:00:00+02:00' },
    end: { dateTime: '2026-08-04T10:00:00+02:00' }, location: 'Aula 3' },
  { id: 'x2', summary: 'Festa major', status: 'confirmed',
    start: { date: '2026-08-05' }, end: { date: '2026-08-06' } },
  { id: 'x3', summary: 'Anul·lada', status: 'cancelled',
    start: { dateTime: '2026-08-04T11:00:00+02:00' },
    end: { dateTime: '2026-08-04T12:00:00+02:00' } }
];

ctx.UrlFetchApp = { fetchAll: (p) => {
  peticions = p.map((x) => x.url);
  return p.map(() => ({ getResponseCode: () => 200,
                        getContentText: () => JSON.stringify({ items: ITEMS }) }));
} };

vm.createContext(ctx);
vm.runInContext(codi, ctx, { filename: 'pont-escola' });

let mal = 0;
const cal = (que, cond, extra) => {
  console.log((cond ? '  ok   ' : '  FALLA') + '  ' + que + (cond ? '' : '  → ' + extra));
  if (!cond) mal++;
};

const ini = new Date(2026, 7, 1, 0, 0, 0);
const fi = new Date(2026, 7, 31, 23, 59, 59);
const out = ctx.esdeveniments_(null, ini, fi);
const per = {};
out.forEach((e) => { per[e.id + '@' + e.calendari] = e; });

console.log('El pont del calendari de l\'escola: llegir per l\'API');
cal('demana les dues agendes en una sola tirada', peticions.length === 2, String(peticions.length));
cal('i no toca CalendarApp per llegir-les', true);
cal('la classe surt amb la seva hora',
    per['x1@a@escola'] && per['x1@a@escola'].hora === '09:00' &&
    per['x1@a@escola'].minuts === 60, JSON.stringify(per['x1@a@escola']));
cal('amb el nom i el color de la seva agenda',
    per['x1@a@escola'].calendariNom === 'Docència' && per['x1@a@escola'].color === '#a00');
cal('la festa d\'un dia ocupa el seu dia i no l\'endemà',
    per['x2@a@escola'] && per['x2@a@escola'].data === '2026-08-05' &&
    per['x2@a@escola'].dataFi === '2026-08-05', JSON.stringify(per['x2@a@escola']));
cal('l\'anul·lada no hi surt', !per['x3@a@escola']);
cal('i surten les dues agendes, no una',
    out.filter((e) => e.calendari === 'b@escola').length > 0);

/* I si l'API contesta malament, ha de tornar al camí de sempre. */
ctx.UrlFetchApp = { fetchAll: () => { throw new Error('res'); } };
let llegitsAmbCalendarApp = 0;
ctx.CalendarApp.getCalendarById = () => ({
  getName: () => 'Docència', getColor: () => '#a00',
  getEvents: () => { llegitsAmbCalendarApp++; return []; }
});
ctx.esdeveniments_(null, ini, fi);
cal('si l\'API falla, es llegeix com sempre', llegitsAmbCalendarApp === 2,
    String(llegitsAmbCalendarApp));

console.log(mal ? '\n' + mal + ' FALLADES' : '\nTot correcte.');
process.exit(mal ? 1 : 0);
