/**
 * ══════════════════════════════════════════════════════════════════════════
 * JEFE · L'AJUDANT DE L'ORDINADOR
 * ══════════════════════════════════════════════════════════════════════════
 *
 *   node ordinador/jefe-ordinador.mjs
 *
 * QUÈ ÉS
 *   JEFE és una pàgina web, i una pàgina web viu dins d'una caixa: no pot
 *   obrir programes, ni llegir carpetes, ni ensenyar-te un document. No és un
 *   defecte —és el que impedeix que qualsevol web que obris et remeni
 *   l'ordinador—, però vol dir que perquè JEFE toqui el PC hi ha d'haver algú
 *   AL PC que ho faci. Això és aquest algú.
 *
 * PER QUÈ NO PASSA PEL NÚVOL
 *   Quan parles amb JEFE des de l'ordinador, la pàgina ja és en aquest mateix
 *   ordinador. No cal que l'ordre faci la volta per Google i torni: la pàgina
 *   truca aquí directament, per `127.0.0.1`, que vol dir «aquesta màquina i
 *   cap altra». És instantani, no gasta quota d'Apps Script i funciona encara
 *   que no hi hagi internet.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * PER QUÈ HI HA UNA CLAU, I PER QUÈ NO N'HI HA PROU AMB EL NAVEGADOR
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Això obre un servidor a la teva màquina, i QUALSEVOL pàgina que tinguis
 * oberta al navegador li pot enviar coses. El navegador no ho impedeix: sí
 * que amaga la RESPOSTA a qui no toca —això és el CORS—, però la petició
 * arriba igual, i una ordre d'obrir un fitxer ja ha fet la seva feina abans
 * que ningú llegeixi cap resposta.
 *
 * Per això hi ha tres panys, i els tres han de cedir:
 *
 *   1. NOMÉS ESCOLTA A `127.0.0.1`. Des d'una altra màquina de casa —o del
 *      bar— no s'hi arriba. No és un servidor de xarxa.
 *   2. NOMÉS ACCEPTA L'ORIGEN DE JEFE. Una pestanya de qualsevol altra web
 *      que provi de trucar aquí rep un no.
 *   3. CADA ORDRE PORTA UNA CLAU que es genera aquí la primera vegada. Sense
 *      ella no es fa res. L'origen es pot falsejar des d'un programa; la clau
 *      no, perquè no surt d'aquesta màquina.
 *
 * I UNA COSA MÉS, QUE ÉS LA QUE DE VERITAT PROTEGEIX: aquí dins no hi ha cap
 * manera d'executar una ordre del sistema. No és que estigui desactivada: és
 * que no existeix. El que hi ha és una llista de verbs, cadascun amb el seu
 * format, i tot el que no hi sigui es rebutja. Qui decideix què es fa és un
 * model de llenguatge que rep frases transcrites d'un micròfon, i un model
 * que s'equivoca ha de poder equivocar-se sense conseqüències.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ON POT MIRAR
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Només dins de les carpetes de `ARRELS`. Un camí que se'n surti —o que hi
 * arribi amb `..`— es rebutja encara que existeixi. Sense això, «llegeix-me
 * aquell document» podria acabar sent qualsevol fitxer de la màquina.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

// ─────────────────────────────────────────────────────────────── configuració

const PORT = 8787;

/* L'ORIGEN DE JEFE. Si algun dia canvia l'adreça de l'app, canvia aquí.
   `null` i `file://` hi són per poder provar-ho amb el mirall, que s'obre
   com a fitxer i per tant no té origen. */
const ORIGENS = [
  'https://poldpm.github.io',
  'null'
];

/**
 * ON POT MIRAR.
 *
 * NO ES DEDUEIX DE `USERPROFILE` I PROU, i aquesta màquina n'és l'exemple:
 * l'escriptori d'en Pol no és `C:\Users\polca\Desktop` —aquesta carpeta no
 * existeix—, sinó `C:\Users\polca\OneDrive\Pol\Escritorio`, perquè OneDrive
 * se'ls emporta. Buscar només als noms de sempre hauria donat una llista
 * mig buida i «no trobo aquell document» quan el document hi era.
 *
 * Per això es proven candidats i es queden els que existeixen de debò: les
 * carpetes del perfil en els tres noms que poden tenir (anglès, castellà i
 * català), les arrels d'OneDrive que el sistema declari, i la unitat de
 * Drive. Els repetits cauen.
 *
 * AFEGIR-NE UNA ÉS AFEGIR-LA AQUÍ. No hi ha cap manera de fer-ho des de la
 * conversa a posta: qui decideix on pot mirar ets tu, davant del teclat, i
 * no una frase dita en veu alta.
 */
const ARRELS = (function () {
  const casa = os.homedir();
  const noms = ['Desktop', 'Escritorio', 'Escriptori',
                'Documents', 'Documentos',
                'Downloads', 'Descargas', 'Baixades'];

  const candidats = noms.map((n) => path.join(casa, n));

  // Les arrels d'OneDrive, que és on Windows sol amagar l'escriptori de debò.
  [process.env.OneDrive, process.env.OneDriveConsumer, process.env.OneDriveCommercial]
    .filter(Boolean).forEach((d) => candidats.push(d));

  // I la unitat de Drive, si està muntada.
  ['G:\\La meva unitat', 'G:\\My Drive', 'G:\\Mi unidad'].forEach((d) => candidats.push(d));

  /* Els repetits fora, i sense mirar majúscules: a Windows «C:\Users» i
     «c:\users» són la mateixa carpeta, i `OneDrive` i `OneDriveConsumer`
     resulten ser el mateix camí en aquesta màquina. */
  const vistes = {};
  const vives = candidats
    .filter((d) => { try { return fs.existsSync(d); } catch (e) { return false; } })
    .map((d) => path.resolve(d))
    .filter((d) => { var k = d.toLowerCase(); if (vistes[k]) return false; vistes[k] = 1; return true; });

  /* I les que ja són dins d'una altra també: amb OneDrive i
     OneDrive\Escritorio a la llista, buscar recorreria l'escriptori dues
     vegades i tot sortiria duplicat. */
  return vives.filter((d, i) => !vives.some((altra, j) =>
    j !== i && d.toLowerCase().startsWith(altra.toLowerCase() + path.sep)));
})();

/* La clau viu fora del repositori: aquest projecte és públic. */
const CASA = path.join(os.homedir(), '.jefe');
const FITXER_CLAU = path.join(CASA, 'clau-ordinador.txt');

/* Què se sap llegir. La resta s'obre, però no es pot explicar: val més dir-ho
   que tornar un text ple de símbols i que la IA se l'inventi a partir d'allà. */
const LLEGIBLES = ['.txt', '.md', '.markdown', '.csv', '.tsv', '.json', '.log',
                   '.xml', '.html', '.htm', '.js', '.mjs', '.ts', '.css', '.gs',
                   '.py', '.java', '.c', '.h', '.sql', '.yml', '.yaml', '.ini'];

const MAX_TEXT = 40000;      // el que cap a una pregunta sense ofegar el model
const MAX_TROBATS = 40;

// ────────────────────────────────────────────────────────────────────── clau

function clau() {
  try {
    if (fs.existsSync(FITXER_CLAU)) {
      const c = fs.readFileSync(FITXER_CLAU, 'utf8').trim();
      if (c.length >= 20) return c;
    }
  } catch (e) { /* si no es pot llegir, se'n fa una de nova */ }

  const nova = crypto.randomBytes(24).toString('base64url');
  fs.mkdirSync(CASA, { recursive: true });
  fs.writeFileSync(FITXER_CLAU, nova + '\n', 'utf8');
  return nova;
}

const CLAU = clau();

// ─────────────────────────────────────────────────────────────────── camins

/** El camí real, resolt, o `null` si se surt d'on pot mirar. */
function dins(cami) {
  if (!cami) return null;
  let abs;
  try { abs = path.resolve(String(cami)); } catch (e) { return null; }
  /* `resolve` ja s'ha menjat els `..`, o sigui que aquí es compara el destí
     final i no el que s'ha escrit. Comparar el text tal com ve deixaria
     passar «Documents/../../Windows/System32». */
  const seu = ARRELS.some((arrel) => {
    const a = path.resolve(arrel);
    return abs === a || abs.toLowerCase().startsWith(a.toLowerCase() + path.sep);
  });
  return seu ? abs : null;
}

/** Obrir una cosa amb el programa que li toqui, sense passar per cap consola. */
function obreAmbElSistema(qualsevol) {
  /* `spawn` amb els arguments a part i sense `shell`: així el que s'obre és
     literalment aquest text i no una ordre. Amb `shell: true`, un nom de
     fitxer amb un `&` pel mig seria dues ordres. */
  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', qualsevol], { detached: true, stdio: 'ignore', windowsVerbatimArguments: false }).unref();
  } else if (process.platform === 'darwin') {
    spawn('open', [qualsevol], { detached: true, stdio: 'ignore' }).unref();
  } else {
    spawn('xdg-open', [qualsevol], { detached: true, stdio: 'ignore' }).unref();
  }
}

// ──────────────────────────────────────────────────────────────────── verbs

/**
 * CADA VERB ÉS UNA FUNCIÓ AMB EL SEU FORMAT, i no n'hi ha cap de genèric.
 * Afegir-ne un és afegir-lo aquí; el que no hi sigui, no es pot demanar.
 */
const VERBS = {

  /* Obrir una web. Només http i https: `file:` obriria fitxers per la porta
     del darrere i `javascript:` no és una adreça, és codi. */
  obre_web(a) {
    const u = String(a.url || '').trim();
    if (!u) throw new Error('No m\'has dit cap adreça.');

    /* «google.com» ha de funcionar, o sigui que si no porta esquema se li
       posa https. PERÒ NOMÉS SI NO EN PORTA CAP: posar-l'hi al davant sempre
       convertia «file:///C:/Windows/win.ini» en
       «https://file///C:/Windows/win.ini», que no obria el fitxer però sí una
       pestanya amb una adreça inventada. Un esquema que no sigui http o https
       no és una web: es rebutja i s'acaba. */
    const teEsquema = /^[a-z][a-z0-9+.-]*:/i.test(u);
    if (teEsquema && !/^https?:\/\//i.test(u)) {
      throw new Error('Només obro adreces http i https, i això és «' +
                      u.slice(0, u.indexOf(':')) + ':».');
    }

    let adreca;
    try { adreca = new URL(teEsquema ? u : 'https://' + u); }
    catch (e) { throw new Error('Això no és una adreça: ' + u); }
    if (adreca.protocol !== 'http:' && adreca.protocol !== 'https:') {
      throw new Error('Només obro adreces http i https.');
    }
    obreAmbElSistema(adreca.href);
    return { obert: adreca.href };
  },

  /* Obrir un fitxer o una carpeta que ja saps on és. */
  obre_fitxer(a) {
    const cami = dins(a.cami);
    if (!cami) throw new Error('Aquest camí queda fora d\'on puc mirar.');
    if (!fs.existsSync(cami)) throw new Error('Aquí no hi ha res: ' + cami);
    obreAmbElSistema(cami);
    return { obert: cami, mena: fs.statSync(cami).isDirectory() ? 'carpeta' : 'fitxer' };
  },

  /* Buscar pel nom. No mira a dins dels fitxers: mira com es diuen, que és
     el que fas tu quan busques «aquell document del menjador». */
  busca(a) {
    const que = String(a.text || '').toLowerCase().trim();
    if (que.length < 2) throw new Error('Digues almenys dues lletres.');

    const trobats = [];
    const mira = (carpeta, fondaria) => {
      if (trobats.length >= MAX_TROBATS || fondaria > 4) return;
      let files;
      try { files = fs.readdirSync(carpeta, { withFileTypes: true }); } catch (e) { return; }
      for (const f of files) {
        if (trobats.length >= MAX_TROBATS) return;
        if (f.name.startsWith('.') || f.name.startsWith('~$')) continue;
        const complet = path.join(carpeta, f.name);
        if (f.name.toLowerCase().includes(que)) {
          let quan = null, mida = null;
          try { const s = fs.statSync(complet); quan = s.mtime.toISOString().slice(0, 16).replace('T', ' '); mida = s.size; }
          catch (e) { /* un fitxer que desapareix mentre busques no és un error */ }
          trobats.push({ nom: f.name, cami: complet, carpeta: f.isDirectory(), quan, mida });
        }
        if (f.isDirectory()) mira(complet, fondaria + 1);
      }
    };
    ARRELS.forEach((arrel) => mira(arrel, 0));

    /* Els més recents primer: quan busques un document, gairebé sempre vols
       el que has tocat últimament i no el de fa tres anys. */
    trobats.sort((x, y) => String(y.quan || '').localeCompare(String(x.quan || '')));
    return { quants: trobats.length, trobats };
  },

  /* Tornar el text d'un document perquè JEFE te'l pugui explicar. */
  llegeix(a) {
    const cami = dins(a.cami);
    if (!cami) throw new Error('Aquest camí queda fora d\'on puc mirar.');
    if (!fs.existsSync(cami)) throw new Error('Aquí no hi ha res: ' + cami);
    if (fs.statSync(cami).isDirectory()) throw new Error('Això és una carpeta, no un document.');

    const ext = path.extname(cami).toLowerCase();
    if (LLEGIBLES.indexOf(ext) === -1) {
      /* DIR-HO EN COMPTES DE TORNAR BROSSA. Un PDF llegit com a text són
         quatre paraules soltes entre símbols, i la IA hi construiria un
         resum a partir del no-res. Val més que t'ho obri i te'l miris. */
      throw new Error('Encara no sé llegir els «' + (ext || 'sense extensió') +
                      '». Te\'l puc obrir i te\'l mires tu.');
    }

    let text = fs.readFileSync(cami, 'utf8');
    const sencer = text.length;
    if (text.length > MAX_TEXT) text = text.slice(0, MAX_TEXT);
    return {
      cami, nom: path.basename(cami), text,
      caracters: sencer,
      retallat: sencer > MAX_TEXT
    };
  },

  /* Què hi ha en aquesta carpeta. Serveix per «què tinc a l'escriptori». */
  llista(a) {
    const cami = dins(a.cami || ARRELS[0]);
    if (!cami) throw new Error('Aquest camí queda fora d\'on puc mirar.');
    if (!fs.existsSync(cami)) throw new Error('Aquí no hi ha res: ' + cami);

    const files = fs.readdirSync(cami, { withFileTypes: true })
      .filter((f) => !f.name.startsWith('.') && !f.name.startsWith('~$'))
      .slice(0, 200)
      .map((f) => {
        let quan = null;
        try { quan = fs.statSync(path.join(cami, f.name)).mtime.toISOString().slice(0, 16).replace('T', ' '); }
        catch (e) {}
        return { nom: f.name, carpeta: f.isDirectory(), cami: path.join(cami, f.name), quan };
      });
    files.sort((x, y) => String(y.quan || '').localeCompare(String(x.quan || '')));
    return { cami, quants: files.length, coses: files };
  },

  /* Qui ets i on pots mirar. La pàgina ho demana en arrencar per saber si hi
     ets: si no contestes, els verbs de l'ordinador ni tan sols s'ofereixen. */
  hola() {
    return {
      jefe: 'ordinador',
      maquina: os.hostname(),
      sistema: process.platform,
      arrels: ARRELS,
      verbs: Object.keys(VERBS)
    };
  }
};

// ─────────────────────────────────────────────────────────────────── servidor

function respon(res, codi, cos, origen) {
  const text = JSON.stringify(cos);
  res.writeHead(codi, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': origen || 'null',
    'Access-Control-Allow-Headers': 'Content-Type, X-Jefe-Clau',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '600',
    'Cache-Control': 'no-store'
  });
  res.end(text);
}

const servidor = http.createServer((req, res) => {
  const origen = req.headers.origin || 'null';
  const permes = ORIGENS.indexOf(origen) !== -1;

  if (req.method === 'OPTIONS') return respon(res, permes ? 204 : 403, {}, permes ? origen : null);
  if (!permes) return respon(res, 403, { error: 'Origen no permès: ' + origen }, null);
  if (req.method !== 'POST') return respon(res, 405, { error: 'Només POST.' }, origen);

  let cru = '';
  req.on('data', (t) => {
    cru += t;
    if (cru.length > 200000) { req.destroy(); }      // ningú no envia una ordre de 200 kB
  });
  req.on('end', () => {
    let p;
    try { p = JSON.parse(cru || '{}'); } catch (e) { return respon(res, 400, { error: 'Això no és JSON.' }, origen); }

    /* LA CLAU, I EN TEMPS CONSTANT. Comparar-la amb `===` deixa endevinar-la
       lletra a lletra mesurant quant triga a dir que no. Aquí no hi ha ningú
       fent-ho, però la comparació correcta val una línia. */
    const seva = String(req.headers['x-jefe-clau'] || p.clau || '');
    const a = Buffer.from(seva.padEnd(CLAU.length, '\0').slice(0, CLAU.length));
    const b = Buffer.from(CLAU);
    if (seva.length !== CLAU.length || !crypto.timingSafeEqual(a, b)) {
      return respon(res, 401, { error: 'Clau equivocada.' }, origen);
    }

    const verb = VERBS[String(p.verb || '')];
    if (!verb) return respon(res, 400, { error: 'No sé fer «' + p.verb + '».' }, origen);

    try {
      const r = verb(p.args || {});
      console.log(hora() + '  ' + p.verb + '  ' + resum(p.args) + '  ✓');
      respon(res, 200, Object.assign({ fet: true, verb: p.verb }, r), origen);
    } catch (err) {
      console.log(hora() + '  ' + p.verb + '  ' + resum(p.args) + '  ✗ ' + err.message);
      respon(res, 200, { fet: false, verb: p.verb, error: err.message }, origen);
    }
  });
});

function hora() { return new Date().toTimeString().slice(0, 8); }
function resum(a) {
  const s = JSON.stringify(a || {});
  return s.length > 70 ? s.slice(0, 70) + '…' : s;
}

servidor.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('\n  El port ' + PORT + ' ja està ocupat.');
    console.error('  Probablement ja tens l\'ajudant obert en una altra finestra.\n');
    process.exit(1);
  }
  throw err;
});

/* NOMÉS `127.0.0.1`, I ÉS EL PANY MÉS IMPORTANT DELS TRES. Sense el segon
   argument, Node escolta a TOTES les adreces de la màquina i qualsevol
   aparell de la xarxa hi pot arribar. */
servidor.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════════════╗');
  console.log('  ║  JEFE · ajudant de l\'ordinador                           ║');
  console.log('  ╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('  Escoltant a  http://127.0.0.1:' + PORT + '   (només aquesta màquina)');
  console.log('');
  console.log('  LA CLAU, que has d\'enganxar una vegada a JEFE:');
  console.log('');
  console.log('      ' + CLAU);
  console.log('');
  console.log('  (també és a ' + FITXER_CLAU + ')');
  console.log('');
  console.log('  Pot mirar dins de:');
  ARRELS.forEach((a) => console.log('      ' + a));
  console.log('');
  console.log('  Verbs: ' + Object.keys(VERBS).join(' · '));
  console.log('');
  console.log('  Deixa aquesta finestra oberta. Per parar-ho, Ctrl+C.');
  console.log('');
});
