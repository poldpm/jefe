/**
 * JEFE — comprovació abans de pujar
 *
 *   npm run comprova
 *
 * Detecta errors que a Apps Script només es veuen quan ja has desplegat i
 * has obert l'app al mòbil. Cadascuna d'aquestes comprovacions hi és perquè
 * un error real hi va passar pel mig.
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const DIR = 'apps-script';
const PLANTILLES = ['ui_index.html'];   // els únics fitxers que doGet passa per createTemplateFromFile

let errors = [];
let avisos = [];

function error(f, m) { errors.push(f + ': ' + m); }
function avis(f, m) { avisos.push(f + ': ' + m); }

const fitxers = fs.readdirSync(DIR);

for (const f of fitxers) {
  const p = path.join(DIR, f);
  const src = fs.readFileSync(p, 'utf8');

  // ---- 1. Sintaxi de JavaScript -------------------------------------------
  let blocs = [];
  if (f.endsWith('.gs')) blocs = [src];
  else if (f.endsWith('.html')) {
    const re = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi;
    let m; while ((m = re.exec(src))) blocs.push(m[1]);
  }
  blocs.forEach((bloc, i) => {
    const net = bloc.replace(/<\?[!=]?[\s\S]*?\?>/g, 'null');
    try { new vm.Script(net, { filename: f + '#' + i }); }
    catch (e) { error(f, 'sintaxi al bloc ' + (i + 1) + ' — ' + e.message); }
  });

  if (!f.endsWith('.html')) continue;

  // ---- 2. Sintaxi de plantilla en fitxers que no són plantilla -------------
  // Un `<?` en un fitxer inclòs amb include() no s'executa: s'imprimeix tal qual.
  const teScriptlet = /<\?/.test(src);
  if (teScriptlet && PLANTILLES.indexOf(f) === -1) {
    error(f, 'conté sintaxi de plantilla `<?` però no és una plantilla. ' +
             'include() no la processa: sortirà impresa a la pàgina.');
  }

  // ---- 3. Scriptlets sense tancar -----------------------------------------
  if (PLANTILLES.indexOf(f) !== -1) {
    const oberts = (src.match(/<\?/g) || []).length;
    const tancats = (src.match(/\?>/g) || []).length;
    if (oberts !== tancats) {
      error(f, 'hi ha ' + oberts + ' `<?` i ' + tancats + ' `?>`. Cada scriptlet s\'ha de tancar.');
    }

    // ---- 4. Scriptlet dins d'un comentari ---------------------------------
    // Apps Script NO respecta els comentaris: veu el `<?` i intenta executar-lo.
    // Això va provocar un «Unexpected token '?'» en producció.
    src.split('\n').forEach((linia, n) => {
      const comentari = linia.match(/(^\s*(\/\/|\*|<!--)|\/\/).*/);
      if (comentari && /<\?/.test(comentari[0])) {
        error(f, 'línia ' + (n + 1) + ': hi ha sintaxi de plantilla dins d\'un comentari. ' +
                 'Apps Script la intentarà executar igualment.');
      }
    });
  }

  // ---- 5. Els include() apunten a fitxers que existeixen -------------------
  const reInc = /include\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m2;
  while ((m2 = reInc.exec(src))) {
    if (fitxers.indexOf(m2[1] + '.html') === -1) {
      error(f, 'include(\'' + m2[1] + '\') però no existeix ' + m2[1] + '.html');
    }
  }
}

// ---- 6. Cada mòdul segueix el contracte -----------------------------------
for (const f of fitxers.filter(x => /^40_Mod_.*\.gs$/.test(x))) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  if (!/function\s+MODUL_[A-Z0-9_]+\s*\(/.test(src)) {
    error(f, 'cap funció `MODUL_MAJUSCULES()`. El nucli no el trobarà. Vegeu MODULS.md.');
  }
}

// ---- Informe ---------------------------------------------------------------
if (avisos.length) {
  console.log('\nAvisos:');
  avisos.forEach(a => console.log('  · ' + a));
}
if (errors.length) {
  console.log('\n' + errors.length + ' error(s):');
  errors.forEach(e => console.log('  ✗ ' + e));
  console.log('\nNo pugis això.\n');
  process.exit(1);
}
console.log('\nTot correcte. Es pot pujar.\n');
