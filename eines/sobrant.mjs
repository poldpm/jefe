/**
 * JEFE — QUÈ SOBRA, amb proves i no per gust
 *
 *   node eines/sobrant.mjs
 *
 * Busca tres coses i no n'esborra cap:
 *
 *   1. Classes de CSS que no fa servir ningú.
 *   2. Funcions de servidor que no crida ningú.
 *   3. Icones declarades que no es pinten enlloc.
 *
 * NO ESBORRA RES A POSTA. Una llista de sospitosos no és una llista de
 * culpables: hi ha noms que es munten a trossos —`'esc-' + mena`— i des d'aquí
 * no es veuen. Qui decideix mira la llista i comprova cada cas.
 *
 * Per què existeix: perquè «netejar codi» sense mesurar acaba sent esborrar el
 * que un no entén, i el que un no entén sol ser justament el que aguanta un cas
 * rar que va costar de trobar.
 */
import fs from 'fs';
import path from 'path';

const DIR = 'apps-script';
const fitxers = fs.readdirSync(DIR).map((f) => path.join(DIR, f));
const llegeix = (f) => fs.readFileSync(f, 'utf8');

const html = fitxers.filter((f) => f.endsWith('.html'));
const gs = fitxers.filter((f) => f.endsWith('.gs'));

const totHtml = html.map(llegeix).join('\n');
const totGs = gs.map(llegeix).join('\n');
const tot = totHtml + '\n' + totGs;

/* El full d'estils, a part: allà les classes es DECLAREN, i el que compta és
   si es fan servir en algun altre lloc. */
const estil = llegeix(path.join(DIR, 'ui_estil.html'));
const foraEstil = html.filter((f) => !f.endsWith('ui_estil.html')).map(llegeix).join('\n') +
                  '\n' + totGs;

// ------------------------------------------------------------------- CSS
const classes = new Set();
(estil.match(/\.[a-z][a-z0-9-]{2,}/g) || []).forEach((c) => classes.add(c.slice(1)));

/* Un nom pot estar escrit a trossos: `class="esc-' + mena + '"`. Es mira si
   algun tros del nom apareix en un text del codi, i si és així no es diu res:
   val més callar que aconsellar esborrar una cosa que es fa servir. */
const potSerMuntada = (nom) => {
  const parts = nom.split('-');
  for (let i = 1; i < parts.length; i++) {
    const tros = parts.slice(0, i).join('-') + '-';
    if (foraEstil.indexOf("'" + tros) !== -1 || foraEstil.indexOf('"' + tros) !== -1) return true;
  }
  return false;
};

const cssSobrant = [...classes].filter((c) => {
  const re = new RegExp('(class="[^"]*\\b' + c + '\\b|\\bclassName|querySelector[^)]*\\.' + c +
                        '\\b|classList[^)]*[\'"]' + c + '[\'"]|[\'"]' + c + '[\'"])');
  if (re.test(foraEstil)) return false;
  return !potSerMuntada(c);
}).sort();

// ------------------------------------------------- funcions de servidor
const funcions = [];
gs.forEach((f) => {
  const s = llegeix(f);
  /* NOMÉS LES DE DINS. Una funció a la columna zero és global i la pot executar
     en Pol des de l'editor: que no la cridi ningú des del codi és el normal i
     no un descuit. Les de dins d'un mòdul van indentades, i aquelles sí que les
     ha de cridar algú. */
  (s.match(/^  function ([A-Za-z_][\w$]*)\s*\(/gm) || []).forEach((m) => {
    const nom = m.replace(/^  function\s+/, '').replace(/\s*\($/, '');
    funcions.push({ nom, fitxer: path.basename(f) });
  });
});

/* TRES MENES DE FUNCIÓ QUE NO CRIDA NINGÚ I ESTAN BÉ:
   1. Les que executa en Pol a mà des de l'editor. Totes viuen a
      `90_Instalacio.gs` i són globals: no cal endevinar-les pel nom.
   2. Els descriptors dels mòduls, `MODUL_XXX`, que el nucli busca pel nom
      —vegeu `20_Moduls.gs`— i per tant no surten escrits enlloc.
   3. `doGet` i `doPost`, que les crida Google. */
const deLEditor = (nom, fitxer) =>
  fitxer === '90_Instalacio.gs' || /^MODUL_[A-Z0-9_]+$/.test(nom) ||
  nom === 'doGet' || nom === 'doPost' || nom === 'include';

const gsSobrant = funcions.filter(({ nom, fitxer }) => {
  if (deLEditor(nom, fitxer)) return false;
  const usos = (tot.match(new RegExp('\\b' + nom.replace(/\$/g, '\\$') + '\\b', 'g')) || []).length;
  return usos <= 1;        // només la seva pròpia declaració
}).sort((a, b) => a.fitxer.localeCompare(b.fitxer) || a.nom.localeCompare(b.nom));

// ------------------------------------------------------------- icones
const icones = (llegeix(path.join(DIR, 'ui_icones.html')).match(/id="ic-([a-z0-9-]+)"/g) || [])
  .map((x) => x.replace(/id="ic-|"/g, ''));
const iconesSobrants = icones.filter((i) => {
  const re = new RegExp("ic\\(\\s*'" + i + "'|\"" + i + "\"|'" + i + "'");
  return !re.test(foraEstil);
}).sort();

// ------------------------------------------------------------------ dir-ho
const diu = (titol, llista, com) => {
  console.log('\n' + titol + '  (' + llista.length + ')');
  if (!llista.length) { console.log('  res'); return; }
  llista.forEach((x) => console.log('  · ' + com(x)));
};

console.log('=== QUÈ SEMBLA QUE SOBRA ===');
console.log('Cap d\'aquestes s\'esborra sola. Són sospitoses, no culpables.');

diu('CLASSES DE CSS que no he vist enlloc', cssSobrant, (x) => x);
diu('FUNCIONS DE SERVIDOR que no crida ningú', gsSobrant, (x) => x.fitxer + '  ' + x.nom);
diu('ICONES declarades i no pintades', iconesSobrants, (x) => 'ic-' + x);

console.log('\nRecorda: un nom es pot muntar a trossos i des d\'aquí no es veu.');
console.log('Abans d\'esborrar-ne cap, busca-la a mà.\n');
