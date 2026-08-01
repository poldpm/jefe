/**
 * JEFE — construeix la interfície estàtica per a GitHub Pages
 *
 *   npm run construeix
 *
 * Munta `pages/index.html` a partir dels MATEIXOS fitxers que Apps Script
 * serveix. No hi ha dues còpies del codi: hi ha una font i dues destinacions.
 *
 *   apps-script/  →  Apps Script el serveix dins d'un iframe (sense micròfon)
 *   pages/        →  GitHub Pages el serveix directe (amb micròfon)
 *
 * La diferència la resol `crida()` en temps d'execució: si troba
 * google.script.run parla amb Apps Script directament; si no, per fetch amb
 * la clau d'accés.
 */
import fs from 'fs';
import path from 'path';

const ORIGEN = 'apps-script';

/**
 * Va a l'ARREL del repositori, no a una subcarpeta.
 * GitHub Pages, quan publica des d'una branca, només deixa triar entre
 * l'arrel i `/docs`. Qualsevol altra carpeta no surt ni a la llista.
 * A l'arrel, `index.html` té preferència sobre `README.md`.
 */
const DESTI = '.';

function llegeix(nom) {
  const f = path.join(ORIGEN, nom + '.html');
  if (!fs.existsSync(f)) {
    console.error('  ✗ falta ' + f + ', referenciat per un include()');
    process.exit(1);
  }
  return fs.readFileSync(f, 'utf8');
}

let html = fs.readFileSync(path.join(ORIGEN, 'ui_index.html'), 'utf8');

// 1. Resol els include() de la plantilla d'Apps Script
const inclosos = [];
html = html.replace(/<\?!=\s*include\(\s*'([^']+)'\s*\);?\s*\?>/g, (_, nom) => {
  inclosos.push(nom);
  return llegeix(nom);
});

// 2. L'estat inicial que Apps Script injecta al servidor aquí no existeix:
//    la pàgina el demanarà per xarxa un cop connectada.
html = html.replace(/<\?!=\s*JSON\.stringify\(estat\)\s*\?>/g, 'null');

// 3. Peces d'instal·lació. Només tenen sentit servint des de GitHub Pages:
//    dins d'Apps Script el manifest no es pot registrar i el treballador de
//    servei tampoc, perquè la pàgina va dins d'un iframe d'un altre domini.
const INSTALLACIO = `
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="apple-touch-icon" href="icona.svg">
  <meta name="apple-mobile-web-app-title" content="JEFE">
  <script>
    /* Sense treballador de servei registrat, Chrome ofereix «afegir drecera».
       Amb ell, ofereix INSTAL·LAR l'aplicació de debò. */
    if ('serviceWorker' in navigator) {
      addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function (e) {
          console.warn('JEFE: no s\\'ha pogut registrar el treballador de servei', e);
        });
      });
    }
  <\/script>`;

html = html.replace('<!--INSTALLACIO-->', INSTALLACIO);

// 4. Cap scriptlet pot sobreviure: seria text imprès a la pàgina
const restants = html.match(/<\?[\s\S]{0,60}/g);
if (restants) {
  console.error('  ✗ han quedat scriptlets sense resoldre:');
  restants.forEach(r => console.error('      ' + r.replace(/\n/g, ' ').slice(0, 60)));
  process.exit(1);
}

// 4. Nota per a qui obri el fitxer generat
html = html.replace('<body>',
  '<body>\n<!-- GENERAT PER eines/construeix.mjs — NO EDITIS AQUEST FITXER.\n' +
  '     La font són els fitxers de apps-script/. Torna a executar npm run construeix. -->');

fs.mkdirSync(DESTI, { recursive: true });
fs.writeFileSync(path.join(DESTI, 'index.html'), html);

// GitHub Pages passa els fitxers per Jekyll si no li dius que no.
fs.writeFileSync(path.join(DESTI, '.nojekyll'), '');

const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
console.log('\nindex.html (arrel)  ·  ' + kb + ' kB  ·  ' + inclosos.length + ' fitxers inclosos');
inclosos.forEach(n => console.log('   · ' + n));
console.log('\nUna sola petició per obrir l\'app. L\'únic recurs extern és el SDK de');
console.log('Firebase, i només es baixa si actives les notificacions.\n');
