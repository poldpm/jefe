/**
 * JEFE — proves del pont amb l'altre compte
 *
 *   npm run prova    (hi entra sol)
 *
 * Prova el pont SENCER: el client d'aquí parlant amb el codi que viu al compte
 * de l'escola. I aquell codi es llegeix de `docs/04-calendari-escola.md`, que
 * és d'on el copia i l'enganxa ell: un codi que viu dins d'un document és
 * exactament el que es podreix sense que ningú se n'assabenti.
 *
 * No toca cap calendari de debò: tot són dobles.
 */
import fs from 'fs';
import vm from 'vm';

let falles = 0;
const cal = (nom, cond, extra) => {
  console.log((cond ? '  ok   ' : '  FALLA') + '  ' + nom + (cond ? '' : '  → ' + extra));
  if (!cond) falles++;
};

// ---- El servidor: el codi del document, tal com l'enganxarà ----
const doc = fs.readFileSync('docs/04-calendari-escola.md', 'utf8');
const blocs = (doc.match(/```javascript\n([\s\S]*?)\n```/g) || [])
  .map(b => b.replace(/^```javascript\n/, '').replace(/\n```$/, ''));
const codiPont = blocs.filter(b => b.indexOf('function doPost') !== -1)[0];
if (!codiPont) { console.log('No trobo el codi del pont al document.'); process.exit(1); }

const events = [];
let seq = 0;
const fesCalendari = (id, nom) => ({
  getId: () => id, getName: () => nom, getColor: () => '#a8703f',
  getEvents: (i, f) => events.filter(e => e.cal === id).map(e => ({
    getId: () => e.id, getTitle: () => e.t, getLocation: () => '', getDescription: () => '',
    getColor: () => '', isAllDayEvent: () => !!e.totDia,
    getStartTime: () => e.i || new Date('2026-09-01T09:00:00'),
    getEndTime: () => e.f || new Date('2026-09-01T10:00:00')
  })),
  createAllDayEvent: (t, d) => { const e = { id: 'e' + (++seq), t, cal: id, totDia: true };
    events.push(e); return { getId: () => e.id, getTitle: () => e.t }; },
  createEvent: (t, i, f) => { const e = { id: 'e' + (++seq), t, cal: id, i, f };
    events.push(e); return { getId: () => e.id, getTitle: () => e.t }; },
  getEventById: (id2) => { const e = events.filter(x => x.id === id2 && x.cal === id)[0];
    return e ? { getTitle: () => e.t, setTitle: (v) => { e.t = v; },
                 setLocation: () => {}, setDescription: () => {},
                 setTime: (a, b) => { e.i = a; e.f = b; }, setAllDayDate: () => {},
                 getStartTime: () => e.i || new Date(), getEndTime: () => e.f || new Date(),
                 deleteEvent: () => { events.splice(events.indexOf(e), 1); } } : null; }
});
const CAL_A = fesCalendari('claustre@escola', 'Claustre');
const CAL_B = fesCalendari('principal@escola', 'Principal de l\'escola');

const servidor = {
  Date, Math, JSON, String, Number, Object, Array,
  CalendarApp: {
    getDefaultCalendar: () => CAL_B,
    getAllOwnedCalendars: () => [CAL_B, CAL_A],
    getCalendarById: (id) => (id === 'claustre@escola' ? CAL_A : (id === 'principal@escola' ? CAL_B : null))
  },
  Session: { getEffectiveUser: () => ({ getEmail: () => 'pol@escola.cat' }),
             getScriptTimeZone: () => 'Europe/Madrid' },
  Utilities: { formatDate: (d, tz, patro) => patro === 'yyyy-MM-dd'
    ? [d.getFullYear(), ('0' + (d.getMonth() + 1)).slice(-2), ('0' + d.getDate()).slice(-2)].join('-')
    : ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) },
  ContentService: { createTextOutput: (t) => ({ setMimeType: () => t }), MimeType: { JSON: 'json' } }
};
vm.createContext(servidor);
vm.runInContext(codiPont, servidor);
servidor.CLAU = 'la-clau-de-prova';

const truca = (cos) => JSON.parse(servidor.doPost({ postData: { contents: JSON.stringify(cos) } }));

console.log('\nEl pont: el codi que va al compte de l\'escola');
cal('sense clau, no mira ni què li demanes',
    truca({ accio: 'prova' }).error === 'Clau incorrecta.',
    JSON.stringify(truca({ accio: 'prova' })));
cal('amb clau dolenta, tampoc',
    truca({ clau: 'una-altra', accio: 'prova' }).ok === false, 'ha passat');

const r0 = truca({ clau: 'la-clau-de-prova', accio: 'prova' });
cal('amb la clau bona, diu qui és', r0.dades.compte === 'pol@escola.cat', JSON.stringify(r0));
cal('i quins calendaris pot tocar', r0.dades.calendaris.length === 2,
    JSON.stringify(r0.dades.calendaris));

const r1 = truca({ clau: 'la-clau-de-prova', accio: 'crea', calendari: 'claustre@escola',
                   titol: 'Claustre de setembre', data: '2026-09-01', hora: '17:00', durada: 90 });
cal('crea al calendari que li diuen', r1.ok && r1.dades.calendari === 'Claustre', JSON.stringify(r1));
cal('i l\'esdeveniment hi és', events.length === 1 && events[0].cal === 'claustre@escola',
    JSON.stringify(events));

const r2 = truca({ clau: 'la-clau-de-prova', accio: 'edita', id: r1.dades.id,
                   calendari: 'claustre@escola', titol: 'Claustre extraordinari' });
cal('edita', r2.ok && events[0].t === 'Claustre extraordinari', JSON.stringify(r2));

const r3 = truca({ clau: 'la-clau-de-prova', accio: 'treu', id: r1.dades.id,
                   calendari: 'claustre@escola' });
cal('treu', r3.ok && events.length === 0, JSON.stringify(r3));

// Llegir: sense això, aquests calendaris no es veurien de cap manera
truca({ clau: 'la-clau-de-prova', accio: 'crea', calendari: 'claustre@escola',
        titol: 'Tutoria de 3r', data: '2026-09-15', hora: '11:00', durada: 60 });
const rl = truca({ clau: 'la-clau-de-prova', accio: 'esdeveniments',
                   desde: '2026-09-01', fins: '2026-09-30',
                   calendaris: ['claustre@escola'] });
cal("llegeix els esdeveniments de l'altre compte",
    rl.ok && rl.dades.length === 1 && rl.dades[0].titol === 'Tutoria de 3r', JSON.stringify(rl));
cal('i venen amb tot el que la pantalla necessita',
    rl.ok && rl.dades[0].calendariNom === 'Claustre' &&
    rl.dades[0].hora === '11:00' && rl.dades[0].horaFi === '12:00' &&
    rl.dades[0].minuts === 60 && rl.dades[0].data === '2026-09-15' &&
    typeof rl.dades[0].totElDia === 'boolean' && typeof rl.dades[0].passat === 'boolean',
    JSON.stringify(rl.dades[0]));
events.length = 0;

cal('una acció que no coneix, la rebutja sense petar',
    truca({ clau: 'la-clau-de-prova', accio: 'formata-el-disc' }).ok === false, 'ha passat');

// ---- El client: JEFE fent el pas pel pont quan la seva escriptura falla ----
console.log('\nJEFE: quan no hi arriba ell, hi passa pel pont');
{
  const props = { CAL_PONT_URL: 'https://script.google.com/macros/s/x/exec',
                  CAL_PONT_CLAU: 'la-clau-de-prova' };
  let peticions = 0;
  const ctx = {
    Date, Math, JSON, String, Number, Object, Array,
    Utils: { talla: (t, n) => String(t).slice(0, n) },
    Logger: { log: () => {} },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (k) => props[k] || null,
      setProperties: (o) => { Object.keys(o).forEach(k => { props[k] = o[k]; }); } }) },
    UrlFetchApp: { fetch: (url, o) => {
      peticions++;
      const resposta = servidor.doPost({ postData: { contents: o.payload } });
      return { getResponseCode: () => 200, getContentText: () => resposta };
    } }
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('apps-script/44_Calendari_Pont.gs', 'utf8'), ctx);

  cal('sap que hi ha pont', ctx.CalendariPont.hiEs() === true, 'diu que no');
  const r = ctx.CalendariPont.crea({ calendari: 'claustre@escola', titol: 'Reunió',
                                     data: '2026-09-10', hora: '09:00', durada: 60 });
  cal('crea a través del pont', r.calendari === 'Claustre', JSON.stringify(r));
  cal('i ha sortit una sola petició', peticions === 1, String(peticions));

  // Sense configuració, ha de dir-ho i no petar
  delete props.CAL_PONT_URL;
  cal('sense pont, diu que no n\'hi ha', ctx.CalendariPont.hiEs() === false, 'diu que sí');

  // L'adreça mal posada s'atura abans de desar
  props.CAL_PONT_URL = 'https://script.google.com/macros/s/x/exec';
  const dolenta = ctx.connectaPontEscola('https://script.google.com/macros/s/x/dev', 'k');
  cal('rebutja una adreça acabada en /dev', /dev/.test(dolenta) && /no té la pinta bona/.test(dolenta),
      dolenta.slice(0, 60));
}

console.log(falles ? '\n' + falles + ' falla(des).\n' : '\nTot correcte.\n');
process.exit(falles ? 1 : 0);
