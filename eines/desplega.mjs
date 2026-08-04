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

/* SI NO HI HA VERSIÓ NOVA, NO S'HA DESPLEGAT RES.
   `clasp deploy` pot fallar i acabar amb codi 0 —passa quan el projecte arriba
   al límit de 200 versions: escriu l'error i se'n va tan tranquil—. Això feia
   que `npm run puja` digués que tot havia anat bé i que jo li digués a en Pol
   que ja ho tenia a l'app, quan el que servia Google seguia sent el d'abans.
   La prova que ha anat bé és que Google hagi creat una versió. No n'hi ha
   d'altra, i per això és aquesta la que mana. */
for (const d of produccio) {
  let sortida = '';
  try {
    sortida = clasp(['deploy', '-i', d.id, '-d', missatge]);
  } catch (err) {
    sortida = String(err.stdout || '') + '\n' + String(err.stderr || err.message || '');
  }

  const versio = (sortida.match(/Created version (\d+)/) || [])[1];
  if (!versio) {
    console.error('\n  ✗ NO S\'HA DESPLEGAT ' + d.id.slice(0, 14) + '…');
    console.error('    El que serveix l\'app segueix sent el d\'abans.');
    console.error('');
    String(sortida).trim().split('\n').filter(Boolean).slice(-4)
      .forEach((l) => console.error('    ' + l.trim()));
    if (/limit of 200 versions/i.test(sortida)) {
      console.error('');
      console.error('    Apps Script no en deixa fer més de 200. S\'esborren des de');
      console.error('    l\'editor: Historial del projecte → Suprimeix versions en bloc.');
      console.error('    Les que faci servir un desplegament actiu no hi surten.');
    }
    process.exit(1);
  }

  console.log('\n  Aplicació web actualitzada a la versió ' + versio +
              '  (' + d.id.slice(0, 14) + '…)');
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
