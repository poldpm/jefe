/**
 * JEFE — publica el codi a l'aplicació web
 *
 *   npm run puja
 *
 * `clasp push` puja el codi al projecte, PERÒ l'aplicació web segueix
 * servint la versió que hi ha desplegada. Sense aquest pas, pots pujar
 * correccions tot el dia i seguir executant el codi de fa una setmana
 * sense adonar-te'n. Va passar, i va costar una tarda de mesurar temps
 * que no volien dir res.
 *
 * Això busca el desplegament de producció (el que NO és @HEAD), crea una
 * versió nova i l'hi apunta.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';

const CLASP = process.platform === 'win32'
  ? 'node_modules\\.bin\\clasp.cmd'
  : 'node_modules/.bin/clasp';

/**
 * A Windows, clasp és un `.cmd` i Node ja no el deixa executar sense
 * intèrpret (dona EINVAL). Amb `shell: true` sí, però llavors els
 * arguments amb espais s'han d'entrecometar a mà.
 */
function clasp(args) {
  const cita = a => (/[\s"]/.test(a) ? '"' + a.replace(/"/g, '\\"') + '"' : a);
  return execFileSync(CLASP, args.map(cita), {
    encoding: 'utf8', shell: true, stdio: ['ignore', 'pipe', 'pipe']
  });
}

let sortida;
try {
  sortida = clasp(['deployments']);
} catch (err) {
  console.error('\n  ✗ No s\'han pogut llistar els desplegaments.');
  console.error('    ' + String(err.stderr || err.message).trim().split('\n').pop());
  process.exit(1);
}

// Línies del tipus:  - AKfycb... @HEAD      /  - AKfycb... @4
const desplegaments = sortida.split('\n')
  .map(l => l.match(/-\s+(AKfyc[\w-]+)\s+@(\w+)/))
  .filter(Boolean)
  .map(m => ({ id: m[1], versio: m[2] }));

const produccio = desplegaments.filter(d => d.versio !== 'HEAD');

if (!produccio.length) {
  console.log('\n  Encara no hi ha cap desplegament de producció.');
  console.log('  Crea\'l un cop des de l\'editor: Desplega → Desplegament nou →');
  console.log('  Aplicació web · Executa com: Jo · Accés: Qualsevol.\n');
  process.exit(0);
}

if (produccio.length > 1) {
  console.log('\n  ⚠ Hi ha ' + produccio.length + ' desplegaments de producció.');
  console.log('    S\'actualitzen tots; si en sobra algun, esborra\'l des de l\'editor.');
}

const missatge = process.argv.slice(2).join(' ') || 'Actualització';

for (const d of produccio) {
  try {
    const r = clasp(['deploy', '-i', d.id, '-d', missatge]);
    const versio = (r.match(/Created version (\d+)/) || [])[1];
    console.log('\n  Aplicació web actualitzada' + (versio ? ' a la versió ' + versio : '') +
                '  (' + d.id.slice(0, 14) + '…)');
  } catch (err) {
    console.error('\n  ✗ No s\'ha pogut desplegar ' + d.id.slice(0, 14) + '…');
    console.error('    ' + String(err.stderr || err.message).trim().split('\n').pop());
    process.exit(1);
  }
}

/* L'ADREÇA /exec, APUNTADA.
   `ScriptApp.getService().getUrl()` retorna la de proves —acabada en /dev—
   quan s'executa des de l'editor, i aquella només funciona per a tu i
   identificat: donada a un altre compte, no va. La bona és la del
   desplegament, i qui la sap és aquest fitxer. Per això s'escriu aquí, com
   la marca de construcció, en comptes de demanar-la a Apps Script. */
const URL_EXEC = 'https://script.google.com/macros/s/' + produccio[0].id + '/exec';
fs.writeFileSync('apps-script/03_Adreca.gs', [
  '/**',
  ' * GENERAT PER eines/desplega.mjs — NO EDITIS AQUEST FITXER.',
  ' *',
  ' * L\'adreça del desplegament, la que acaba en /exec. Apps Script no la sap',
  ' * dir des de dins: `ScriptApp.getService().getUrl()` retorna la de proves',
  ' * quan la crides des de l\'editor. Aquesta ve del desplegament de debò.',
  ' */',
  'var URL_APP = ' + JSON.stringify(URL_EXEC) + ';',
  ''
].join('\n'));
console.log('  Adreça apuntada a 03_Adreca.gs');

console.log('  El que hi ha a l\'editor i el que serveix l\'app ja són el mateix.\n');
