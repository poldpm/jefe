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
 * ══════════════════════════════════════════════════════════════════════════
 * ON POT MIRAR: EL DISC SENCER
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Va començar sent quatre carpetes —Documents, Baixades, OneDrive, Drive— i
 * en Pol ho va obrir a tot `C:`. És la seva màquina i la seva decisió; això
 * és el que hi ha, i les tres coses de sota són el que fa que segueixi sent
 * utilitzable i no un forat.
 *
 * DE PASSADA, LA RAÓ PER LA QUAL LES QUATRE CARPETES NO ANAVEN BÉ: en aquesta
 * màquina l'escriptori no és `C:\Users\polca\Desktop` —aquesta carpeta no
 * existeix—, sinó `C:\Users\polca\OneDrive\Pol\Escritorio`, perquè OneDrive
 * se'l va emportar. Deduir les carpetes dels noms de sempre donava «no trobo
 * aquell document» amb el document allà. Amb el disc sencer, això s'acaba.
 *
 * AFEGIR O TREURE UNA ARREL ÉS TOCAR AQUESTA LLISTA. No hi ha cap manera de
 * fer-ho des de la conversa a posta: qui decideix on pot mirar ets tu,
 * davant del teclat, i no una frase dita en veu alta.
 */
const ARRELS = ['C:\\', 'G:\\']
  .filter((d) => { try { return fs.existsSync(d); } catch (e) { return false; } })
  .map((d) => path.resolve(d));

/**
 * EL SOROLL, QUE NO ÉS EL MATEIX QUE UN PANY.
 *
 * Amb el disc sencer, buscar «informe» voldria dir recórrer Windows, els
 * Program Files i mig `AppData`: minuts d'espera per tornar-te DLLs i fitxers
 * de cau que no busques mai. Aquestes carpetes se salten EN BUSCAR.
 *
 * NO ÉS UN PERMÍS: si li dius el camí exacte d'un fitxer de dins, l'obre i el
 * llegeix igual. És una llista de llocs on no hi ha res teu, i està aquí per
 * fer la cerca útil, no per protegir res. El que protegeix és el de sota.
 */
const SOROLL = ['windows', 'program files', 'program files (x86)', 'programdata',
                '$recycle.bin', 'system volume information', 'recovery',
                'appdata', 'node_modules', '.git', '.cache', 'temp', 'tmp',
                '$windows.~bt', '$windows.~ws', 'perflogs', 'msocache',
                'onedrivetemp', '.venv', 'venv', '__pycache__'];

/**
 * ══════════════════════════════════════════════════════════════════════════
 * DUES COSES QUE SEGUEIXEN TANCADES, I PER QUÈ
 * ══════════════════════════════════════════════════════════════════════════
 *
 * 1. NO S'OBRE RES QUE S'EXECUTI.
 *    Obrir un document és ensenyar-te'l; obrir un `.exe` o un `.bat` és
 *    EXECUTAR UN PROGRAMA, que és exactament el que en Pol va descartar quan
 *    va triar verbs concrets en comptes d'ordres lliures. Amb el disc sencer,
 *    sense això, «obre'm allò» amb una transcripció dolenta podria arrencar
 *    qualsevol instal·lador de la carpeta de baixades.
 *
 * 2. NO ES LLEGEIXEN CLAUS NI CERTIFICATS.
 *    Llegir un fitxer no és mirar-se'l: és enviar-ne el contingut a Gemini
 *    perquè te l'expliqui. Un `.env`, una clau privada o el JSON d'un compte
 *    de servei acabarien dins d'una petició a un model, i la regla d'aquesta
 *    casa és que això no passa mai. Obrir-los sí que es pot —és la teva
 *    màquina i el teu editor—; el que no es pot és fer-los sortir d'aquí.
 */
const NO_EXECUTABLES = ['.exe', '.bat', '.cmd', '.com', '.scr', '.msi', '.msp',
                        '.ps1', '.psm1', '.vbs', '.vbe', '.wsf', '.wsh', '.js',
                        '.jse', '.jar', '.reg', '.lnk', '.pif', '.cpl', '.hta',
                        '.msc', '.gadget', '.appref-ms'];

const NO_LLEGIBLES = [/\.pem$/i, /\.key$/i, /\.p12$/i, /\.pfx$/i, /\.crt$/i, /\.cer$/i,
                      /\.ppk$/i, /\.kdbx$/i, /(^|[\\/])\.env/i, /(^|[\\/])id_[rd]sa/i,
                      /credentials?\.json$/i, /service[-_]?account.*\.json$/i,
                      /(^|[\\/])\.(ssh|jefe|claude|aws|gnupg|docker|kube|azure)([\\/]|$)/i,
                      /(^|[\\/])(clasprc|clasp)\.json$/i];

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
const TEMPS_CERCA = 6000;    // ms; amb el disc sencer, el que mana és el rellotge

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
     passar «Documents/../../Windows/System32», que amb quatre carpetes era el
     forat gros. Amb el disc sencer el que atura això és el de sota, però la
     comprovació es queda: és la que fa que canviar les arrels sigui segur. */
  const seu = ARRELS.some((arrel) => {
    /* L'ARREL D'UN DISC JA ACABA EN BARRA. `path.resolve('C:\\')` torna
       «C:\», i enganxar-hi el separador donava «C:\\»: cap camí comença per
       això i TOT `C:` quedava fora. Va passar el minut que l'arrel va deixar
       de ser una carpeta i va passar a ser el disc. */
    const a = path.resolve(arrel).replace(/[\\/]+$/, '');
    return abs.toLowerCase() === a.toLowerCase() ||
           abs.toLowerCase().startsWith(a.toLowerCase() + path.sep);
  });
  return seu ? abs : null;
}

/** Una carpeta on no hi ha res seu i que la cerca es salta. */
function esSoroll(nom) {
  return SOROLL.indexOf(String(nom).toLowerCase()) !== -1;
}

/** Els que obrir-los vol dir executar-los. */
function sExecuta(cami) {
  return NO_EXECUTABLES.indexOf(path.extname(cami).toLowerCase()) !== -1;
}

/** Els que llegir-los voldria dir enviar-ne el contingut a un model. */
function esSecret(cami) {
  return NO_LLEGIBLES.some((r) => r.test(cami));
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
    /* QUÈ ÉS, ABANS DE SI HI ÉS. Obrir un document és ensenyar-te'l; obrir un
       `.exe` és executar un programa, i això no és el que fa aquesta eina.
       Va abans de mirar si existeix a posta: si no, un `.bat` que encara no
       hi és respon «aquí no hi ha res», que sona a «si hi fos, te l'obriria».
       La resposta ha de dir el mateix tant si el fitxer hi és com si no. */
    if (sExecuta(cami)) {
      throw new Error('«' + path.basename(cami) + '» és un programa, i obrir-lo ' +
                      'voldria dir executar-lo. Això no ho faig: obre\'l tu.');
    }
    if (!fs.existsSync(cami)) throw new Error('Aquí no hi ha res: ' + cami);
    obreAmbElSistema(cami);
    return { obert: cami, mena: fs.statSync(cami).isDirectory() ? 'carpeta' : 'fitxer' };
  },

  /* Buscar pel nom. No mira a dins dels fitxers: mira com es diuen, que és
     el que fas tu quan busques «aquell document del menjador». */
  busca(a) {
    const que = String(a.text || '').toLowerCase().trim();
    if (que.length < 2) throw new Error('Digues almenys dues lletres.');

    /* AMB EL DISC SENCER CAL UN RELLOTGE, no una fondària.
       Amb quatre carpetes n'hi havia prou amb parar als quatre nivells. Ara
       l'arrel és `C:\` i un document teu pot ser a vuit carpetes de fons
       mentre que `Windows` en té vint que no vols. La fondària sola o et deixa
       fora els teus documents o et fa esperar minuts; el que no pot passar és
       que preguntis una cosa i la conversa es quedi penjada. Per això es
       busca fins que s'acaba el temps i es diu si s'ha acabat abans d'hora. */
    const fins = Date.now() + TEMPS_CERCA;
    let mirades = 0, tallat = false;

    const trobats = [];
    const mira = (carpeta, fondaria) => {
      if (trobats.length >= MAX_TROBATS || fondaria > 10) return;
      if (Date.now() > fins) { tallat = true; return; }
      let files;
      try { files = fs.readdirSync(carpeta, { withFileTypes: true }); } catch (e) { return; }
      mirades++;
      for (const f of files) {
        if (trobats.length >= MAX_TROBATS) return;
        if (Date.now() > fins) { tallat = true; return; }
        if (f.name.startsWith('.') || f.name.startsWith('~$')) continue;
        const complet = path.join(carpeta, f.name);
        if (f.name.toLowerCase().includes(que)) {
          let quan = null, mida = null;
          try { const s = fs.statSync(complet); quan = s.mtime.toISOString().slice(0, 16).replace('T', ' '); mida = s.size; }
          catch (e) { /* un fitxer que desapareix mentre busques no és un error */ }
          trobats.push({ nom: f.name, cami: complet, carpeta: f.isDirectory(), quan, mida });
        }
        if (f.isDirectory() && !esSoroll(f.name)) mira(complet, fondaria + 1);
      }
    };

    /* PRIMER A CASA. Els teus documents són gairebé sempre sota el teu perfil,
       i començar per l'arrel del disc voldria dir gastar el rellotge a
       `C:\Users\Public` i a mig sistema abans d'arribar-hi. */
    const casa = os.homedir();
    [casa].concat(ARRELS.filter((r) => r.toLowerCase() !== path.resolve(casa).toLowerCase()))
      .forEach((arrel) => { if (fs.existsSync(arrel)) mira(arrel, 0); });

    /* Els més recents primer: quan busques un document, gairebé sempre vols
       el que has tocat últimament i no el de fa tres anys. */
    trobats.sort((x, y) => String(y.quan || '').localeCompare(String(x.quan || '')));
    return {
      quants: trobats.length, trobats,
      carpetesMirades: mirades,
      /* Que ho digui quan no ha arribat a mirar-ho tot: «no ho he trobat» i
         «no he tingut temps d'acabar» són dues respostes molt diferents. */
      incomplet: tallat || trobats.length >= MAX_TROBATS
    };
  },

  /* Tornar el text d'un document perquè JEFE te'l pugui explicar. */
  llegeix(a) {
    const cami = dins(a.cami);
    if (!cami) throw new Error('Aquest camí queda fora d\'on puc mirar.');

    /* QUÈ ÉS, ABANS DE SI HI ÉS —igual que a `obre_fitxer` i per la mateixa
       raó—. Llegir no és mirar: el text acaba dins d'una petició a Gemini. Les
       claus i els certificats no hi van. Obrir-los, sí. */
    if (esSecret(cami)) {
      throw new Error('«' + path.basename(cami) + '» sembla una clau o un fitxer de ' +
                      'credencials. No el llegeixo: llegir-lo voldria dir enviar-ne el ' +
                      'contingut a la IA. Te\'l puc obrir.');
    }

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
      casa: os.homedir(),
      arrels: ARRELS,
      verbs: Object.keys(VERBS),
      /* Que ho digui ell i no ho hagi de saber ningú altre: la conversa pot
         explicar per què una cosa no s'ha fet sense tenir cap llista pròpia. */
      noObre: NO_EXECUTABLES,
      noLlegeix: 'claus, certificats i fitxers de credencials'
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

/**
 * EL PORT OCUPAT: PER QUI?
 *
 * Deia «probablement ja tens l'ajudant obert en una altra finestra» i
 * probablement no ho era. Un «probablement» en un missatge d'error és una
 * endevinalla que has de resoldre tu, i aquí no cal endevinar res: n'hi ha
 * prou amb trucar al port i veure qui contesta.
 *
 * Tres respostes ben diferents, i cadascuna vol que facis una cosa diferent:
 * si el que hi ha és un ajudant que funciona, el que has de fer és NO obrir-ne
 * cap altre; si és un altre programa, saber quin; i si no contesta, saber com
 * trobar-lo.
 */
async function quiOcupaElPort_() {
  try {
    const aturador = new AbortController();
    const temps = setTimeout(() => aturador.abort(), 1500);
    const r = await fetch('http://127.0.0.1:' + PORT + '/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': ORIGENS[0], 'X-Jefe-Clau': CLAU },
      body: JSON.stringify({ verb: 'hola' }),
      signal: aturador.signal
    });
    clearTimeout(temps);
    const d = await r.json();
    if (d && d.jefe === 'ordinador') return { jefe: true, maquina: d.maquina };
    return { jefe: false, contesta: true };
  } catch (e) {
    return { jefe: false, contesta: false };
  }
}

servidor.on('error', async (err) => {
  if (err.code === 'EADDRINUSE') {
    const qui = await quiOcupaElPort_();
    console.error('');
    if (qui.jefe) {
      console.error('  JA TENS L\'AJUDANT OBERT, i funciona.');
      console.error('  No cal que n\'obris cap altre: aquesta finestra es pot tancar.');
    } else {
      console.error('  El port ' + PORT + ' ja està ocupat per un altre programa.');
      console.error('  (Hi ha alguna cosa escoltant, però no és l\'ajudant de JEFE.)');
      console.error('');
      console.error('  Per veure qui és:');
      console.error('      netstat -ano | findstr :' + PORT);
      console.error('  i amb el número de l\'última columna:');
      console.error('      tasklist /fi "pid eq AQUELL_NUMERO"');
    }
    console.error('');
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
  console.log('  No obre programes (.exe, .bat, .ps1…) ni llegeix claus ni certificats.');
  console.log('  En buscar se salta Windows, Program Files, AppData i companyia.');
  console.log('');
  console.log('  Verbs: ' + Object.keys(VERBS).join(' · '));
  console.log('');
  console.log('  Deixa aquesta finestra oberta. Per parar-ho, Ctrl+C.');
  console.log('');
});
