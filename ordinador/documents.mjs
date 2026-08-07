/**
 * ══════════════════════════════════════════════════════════════════════════
 * JEFE · TREURE EL TEXT D'UN DOCUMENT
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Els .txt i els .md ja es llegien: són text i prou. Els que en Pol té de
 * debò —actes, circulars, comunicats de l'escola— són PDF i Word, i fins ara
 * la resposta era «obre-te'l tu».
 *
 * SENSE CAP LLIBRERIA, i val la pena dir per què. Hi ha paquets que ho fan
 * millor que això, però afegir-los vol dir un `node_modules` de desenes de
 * megues a la seva màquina per a un programa que ha de ser petit i llegible
 * de dalt a baix —és el que li dona permís per mirar tot el disc—. El que hi
 * ha aquí són dues coses que Node ja sap fer: descomprimir (`zlib`) i buscar
 * dins d'un buffer.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LA REGLA QUE MANA: MÉS VAL DIR QUE NO QUE TORNAR BROSSA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Un PDF escanejat no té text: té una foto d'un text. Un PDF amb una font
 * incrustada i codificació pròpia torna lletres que no són les que veus. En
 * tots dos casos el que en surt són símbols solts, i si això arriba a Gemini,
 * Gemini n'escriurà un resum —d'un text que no ha llegit ningú—. Un resum
 * inventat d'un document real és el pitjor error possible d'aquesta app.
 *
 * Per això hi ha `sembla_text_de_debo_`: si el que s'ha tret no s'assembla a
 * llengua escrita, no es torna. Es diu que no s'ha pogut i s'ofereix obrir-lo.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/* Els que s'obren amb aquest fitxer. Els de text pla els llegeix directament
   qui ens crida: aquí hi ha només els que calen desempaquetar. */
export const AMB_FORMAT = ['.pdf', '.docx', '.pptx', '.odt'];

// ═══════════════════════════════════════════════════════════════ zip a mà
/*
 * Un .docx és un ZIP. També ho són els .pptx i els .odt: per dins són una
 * carpeta comprimida amb XML. O sigui que amb saber treure UN fitxer d'un ZIP
 * ja n'hi ha prou per als tres.
 *
 * COM ESTÀ FET UN ZIP, en curt: al final hi ha un índex —el «directori
 * central»— que diu quins fitxers hi ha i on comença cadascun. Cada fitxer
 * comença amb una capçalera pròpia de mida variable, i per això no es pot
 * saltar directament a les dades: cal llegir la capçalera per saber quant
 * ocupa. És l'error clàssic de qui llegeix zips a mà —fer servir la mida que
 * diu l'índex— i dona dades desplaçades uns quants bytes.
 */

const FI_DIRECTORI = 0x06054b50;
const CAPCALERA_LOCAL = 0x04034b50;

function trobaFiDirectori_(buf) {
  /* El comentari final del zip pot fer fins a 65535 bytes, o sigui que la
     marca de final no és sempre als últims 22. Es busca cap enrere. */
  const desDe = Math.max(0, buf.length - 65557);
  for (let i = buf.length - 22; i >= desDe; i--) {
    if (buf.readUInt32LE(i) === FI_DIRECTORI) return i;
  }
  return -1;
}

/** Els noms i les posicions de tot el que hi ha al zip. */
export function entradesZip(buf) {
  const fi = trobaFiDirectori_(buf);
  if (fi === -1) throw new Error('Això no sembla un fitxer comprimit.');

  const quantes = buf.readUInt16LE(fi + 10);
  let on = buf.readUInt32LE(fi + 16);
  const out = [];

  for (let i = 0; i < quantes && on + 46 <= buf.length; i++) {
    const metode = buf.readUInt16LE(on + 10);
    const midaComprimida = buf.readUInt32LE(on + 20);
    const nomLlarg = buf.readUInt16LE(on + 28);
    const extraLlarg = buf.readUInt16LE(on + 30);
    const comentariLlarg = buf.readUInt16LE(on + 32);
    const local = buf.readUInt32LE(on + 42);
    const nom = buf.toString('utf8', on + 46, on + 46 + nomLlarg);
    out.push({ nom, metode, midaComprimida, local });
    on += 46 + nomLlarg + extraLlarg + comentariLlarg;
  }
  return out;
}

/** El contingut d'una entrada, descomprimit. */
export function treuDelZip(buf, entrada) {
  if (entrada.local + 30 > buf.length) throw new Error('El fitxer està tallat.');
  if (buf.readUInt32LE(entrada.local) !== CAPCALERA_LOCAL) {
    throw new Error('El fitxer comprimit no quadra.');
  }
  /* AQUÍ ÉS ON ES FALLA SI ES VA DE PRESSA: la capçalera local té el seu propi
     nom i els seus propis extres, i no tenen per què fer els mateixos bytes
     que els del directori central. Les dades comencen després d'aquests. */
  const nomLlarg = buf.readUInt16LE(entrada.local + 26);
  const extraLlarg = buf.readUInt16LE(entrada.local + 28);
  const inici = entrada.local + 30 + nomLlarg + extraLlarg;
  const dades = buf.subarray(inici, inici + entrada.midaComprimida);

  if (entrada.metode === 0) return dades;                 // desat tal qual
  if (entrada.metode === 8) return zlib.inflateRawSync(dades);
  throw new Error('Aquest fitxer fa servir una compressió que no conec.');
}

// ═══════════════════════════════════════════════════════════════════ xml
/* Prou per a documents ofimàtics: el que hi ha entre etiquetes, amb els salts
   de paràgraf respectats. No és un analitzador d'XML i no ho ha de ser. */

function desEntitats_(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
          .replace(/&apos;/g, '\'')
          .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(Number(n)))
          .replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCharCode(parseInt(n, 16)))
          .replace(/&amp;/g, '&');       // l'últim, o desfaria els d'abans
}

function xmlATex_(xml, finalsDeParagraf) {
  let t = xml;
  finalsDeParagraf.forEach((etiqueta) => {
    t = t.replace(new RegExp('</' + etiqueta + '>', 'g'), '\n');
  });
  t = t.replace(/<[a-zA-Z0-9:]+[^>]*\/>/g, (m) =>
    /(:br|:tab)\b/.test(m) ? (/:tab/.test(m) ? '\t' : '\n') : '');
  t = t.replace(/<[^>]+>/g, '');
  return desEntitats_(t);
}

// ═══════════════════════════════════════════════════════════════════ word

export function textDeDocx(buf) {
  const entrades = entradesZip(buf);
  const doc = entrades.filter((e) => e.nom === 'word/document.xml')[0];
  if (!doc) throw new Error('Aquest .docx no porta cap document a dins.');
  return netejaLinies_(xmlATex_(treuDelZip(buf, doc).toString('utf8'), ['w:p']));
}

export function textDePptx(buf) {
  const entrades = entradesZip(buf)
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.nom))
    /* Per ordre de diapositiva, no per ordre de zip: «slide10» va després de
       «slide9» i ordenar per text el posaria entre l'1 i el 2. */
    .sort((a, b) => Number(a.nom.match(/(\d+)/)[1]) - Number(b.nom.match(/(\d+)/)[1]));
  if (!entrades.length) throw new Error('Aquest .pptx no porta cap diapositiva.');
  return netejaLinies_(entrades.map((e, i) =>
    '— Diapositiva ' + (i + 1) + ' —\n' +
    xmlATex_(treuDelZip(buf, e).toString('utf8'), ['a:p'])).join('\n\n'));
}

export function textDOdt(buf) {
  const entrades = entradesZip(buf);
  const doc = entrades.filter((e) => e.nom === 'content.xml')[0];
  if (!doc) throw new Error('Aquest .odt no porta cap contingut a dins.');
  return netejaLinies_(xmlATex_(treuDelZip(buf, doc).toString('utf8'), ['text:p', 'text:h']));
}

// ═══════════════════════════════════════════════════════════════════ pdf
/*
 * UN PDF NO ÉS UN DOCUMENT: és un programa de dibuix.
 *
 * No hi ha cap lloc on posi el text seguit. El que hi ha són instruccions per
 * pintar —«posa el llapis aquí, escriu aquestes lletres amb aquesta font»— i
 * gairebé sempre comprimides. Treure'n el text vol dir descomprimir-les i
 * llegir les instruccions que escriuen: `Tj` i `TJ`.
 *
 * I HI HA UNA TRAMPA, la que fa que això no sigui fiable del tot: els codis
 * que van dins de `Tj` no són lletres, són números que la FONT tradueix. Si
 * la font és una de les normals, el número i la lletra coincideixen i tot
 * surt bé. Si el PDF porta una font incrustada amb la seva pròpia numeració
 * —cosa habitual quan el fa un programa de maquetació—, els números no volen
 * dir res sense la seva taula de traducció, i el que en surt són símbols.
 *
 * Aquí es fan les dues coses que cobreixen la major part del que rep en Pol
 * —PDF fets amb Word, Docs o una impressora virtual— i, quan no s'aconsegueix,
 * ES DIU. No es torna mai un text que no s'assembli a llengua escrita.
 */

/**
 * ══════════════════════════════════════════════════════════════════════════
 * LA TAULA DE TRADUCCIÓ (/ToUnicode)
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Aquí és on el PDF deixa de ser inservible.
 *
 * Els codis que van dins de `Tj` no són lletres: són números que la font
 * tradueix. Un PDF de Google Docs escriu «7KH LGHD LV» on hi diu «The idea
 * is» —cada lletra desplaçada— perquè la font que porta a dins fa servir la
 * seva pròpia numeració. Sense la taula, això és un codi.
 *
 * I la taula hi és. Els PDF que fan Word, Google Docs i companyia hi posen
 * un `/ToUnicode` per font: un mapa de «codi → lletra de veritat», escrit en
 * un llenguatge propi de dues instruccions:
 *
 *     beginbfchar  <0057> <0054>  endbfchar          un codi, una lletra
 *     beginbfrange <0003> <0008> <0020>  endbfrange  un tram seguit
 *
 * ES BARREGEN TOTES EN UNA. El correcte seria saber quina font està activa a
 * cada moment —seguir els `Tf` i resoldre les referències del document—, i
 * això vol dir llegir el graf d'objectes del PDF, amb els objectes que
 * vénen dins d'altres objectes comprimits. Barrejar-les funciona perquè les
 * fonts d'un mateix document solen ser la mateixa família en rodona, negreta
 * i cursiva, i comparteixen la numeració. Quan dues no coincideixen es queda
 * la primera i es compta: si n'hi ha massa, es desconfia del resultat i el
 * jutge del final ja el tomba.
 */
function mapaDeCodis_(fluxos) {
  const mapa = {};
  let xocs = 0, bytes = 1;

  const posa = (codi, lletra) => {
    if (mapa[codi] !== undefined) { if (mapa[codi] !== lletra) xocs++; return; }
    mapa[codi] = lletra;
  };
  const aText = (hex) => {
    let s = '';
    for (let i = 0; i + 3 < hex.length + 1; i += 4) s += String.fromCharCode(parseInt(hex.substr(i, 4), 16));
    return s;
  };

  fluxos.forEach((f) => {
    let m;
    const reChar = /beginbfchar([\s\S]*?)endbfchar/g;
    while ((m = reChar.exec(f))) {
      const parells = m[1].match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g) || [];
      parells.forEach((p) => {
        const t = p.match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/);
        if (t[1].length >= 4) bytes = 2;
        posa(parseInt(t[1], 16), aText(t[2]));
      });
    }
    const reRange = /beginbfrange([\s\S]*?)endbfrange/g;
    while ((m = reRange.exec(f))) {
      const cos = m[1];
      /* Dues formes: un destí que va avançant, o una llista de destins. */
      let r;
      const reSeguit = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
      while ((r = reSeguit.exec(cos))) {
        const lo = parseInt(r[1], 16), hi = parseInt(r[2], 16), dst = parseInt(r[3], 16);
        if (r[1].length >= 4) bytes = 2;
        /* Un tram esbojarrat vol dir que s'ha llegit malament: no s'hi entra. */
        if (hi < lo || hi - lo > 65535) continue;
        for (let c = lo; c <= hi; c++) posa(c, String.fromCharCode(dst + (c - lo)));
      }
      const reLlista = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*\[([\s\S]*?)\]/g;
      while ((r = reLlista.exec(cos))) {
        const lo = parseInt(r[1], 16);
        if (r[1].length >= 4) bytes = 2;
        const destins = r[3].match(/<([0-9a-fA-F]+)>/g) || [];
        destins.forEach((d, i) => posa(lo + i, aText(d.replace(/[<>]/g, ''))));
      }
    }
  });

  const quants = Object.keys(mapa).length;
  return { mapa, bytes, xocs, quants };
}

/** Els fluxos comprimits d'un PDF, descomprimits i separats per feina. */
function fluxosDePdf_(buf) {
  const out = { contingut: [], cmaps: [] };
  let on = 0;
  while (true) {
    const inici = buf.indexOf('stream', on);
    if (inici === -1) break;
    /* El diccionari que hi ha just abans diu com està comprimit. Es mira un
       tros enrere i prou: buscar-lo bé demanaria analitzar el PDF sencer. */
    const dicc = buf.toString('latin1', Math.max(0, inici - 400), inici);
    let dades = inici + 6;
    if (buf[dades] === 0x0d) dades++;
    if (buf[dades] === 0x0a) dades++;

    const fi = buf.indexOf('endstream', dades);
    if (fi === -1) break;
    on = fi + 9;

    if (dicc.indexOf('/FlateDecode') === -1) continue;
    /* Els que porten un segon filtre —imatges, sobretot— no són text i
       descomprimir-los només gastaria temps. */
    if (/\/(DCTDecode|JPXDecode|CCITTFaxDecode|JBIG2Decode)/.test(dicc)) continue;

    let cru;
    try {
      cru = zlib.inflateSync(buf.subarray(dades, fi)).toString('latin1');
    } catch (e) {
      /* Un flux que no es descomprimeix no atura la resta: un PDF en té
         desenes i que en falli un no vol dir que no se'n pugui treure res. */
      continue;
    }

    /* ══════════════════════════════════════════════════════════════════════
       NOMÉS ELS FLUXOS QUE DIBUIXEN TEXT.
       Un PDF comprimeix moltes més coses que les instruccions de pintar:
       imatges, perfils de color, fonts incrustades, metadades. Agafar-los
       tots donava un megabyte de «gTRC´(bTRC´(cprtÜ<mlucen» —el perfil de
       color d'un PDF fet amb Google Docs— que després es colava com si fos
       el document. Es va veure a la primera prova amb fitxers de debò.

       Un flux de contingut es reconeix sol: porta `BT`…`ET` —«comença text»,
       «acaba text»— i almenys una instrucció d'escriure. Cap perfil de color
       en porta. */
    /* Les taules de traducció també vénen comprimides, i les volem. */
    if (cru.indexOf('beginbfchar') !== -1 || cru.indexOf('beginbfrange') !== -1) {
      out.cmaps.push(cru);
      continue;
    }
    if (cru.indexOf('BT') === -1) continue;
    if (!/\bT[jJ]\b/.test(cru)) continue;
    out.contingut.push(cru);
  }
  return out;
}

/**
 * Els CODIS que escriuen les instruccions d'un flux, no les lletres.
 *
 * Torna números perquè encara no se sap què volen dir: qui ho sap és la taula
 * de traducció, i s'aplica després. El −1 és un salt de línia.
 */
function codisDunFlux_(flux, bytes) {
  const out = [];
  let i = 0;

  const salt = () => { if (out.length && out[out.length - 1] !== -1) out.push(-1); };

  /* Els bytes que van sortint d'una cadena s'ajunten de dos en dos quan la
     font és de dos bytes. Fer-ho aquí i no abans és el que fa que funcionin
     igual les cadenes entre parèntesis i les hexadecimals. */
  const posa = (bytesLlegits) => {
    if (bytes === 1) { bytesLlegits.forEach((b) => out.push(b)); return; }
    for (let k = 0; k + 1 < bytesLlegits.length; k += 2) {
      out.push((bytesLlegits[k] << 8) | bytesLlegits[k + 1]);
    }
  };

  const cadena = () => {
    /* Els parèntesis poden anar niats i escapats. Comptar-los malament menja
       mitja frase o s'emporta el final del document. */
    let nivell = 1;
    const bytes_ = [];
    while (i < flux.length) {
      const c = flux[i++];
      if (c === '\\') {
        const seg = flux[i++];
        if (seg === 'n') bytes_.push(10);
        else if (seg === 'r') { /* res */ }
        else if (seg === 't') bytes_.push(9);
        else if (seg >= '0' && seg <= '7') {
          let oct = seg;
          while (oct.length < 3 && flux[i] >= '0' && flux[i] <= '7') oct += flux[i++];
          bytes_.push(parseInt(oct, 8));
        } else bytes_.push(seg.charCodeAt(0));
        continue;
      }
      if (c === '(') { nivell++; bytes_.push(40); continue; }
      if (c === ')') { nivell--; if (!nivell) return bytes_; bytes_.push(41); continue; }
      bytes_.push(c.charCodeAt(0));
    }
    return bytes_;
  };

  /* ══════════════════════════════════════════════════════════════════════
     QUAN ES CANVIA DE LÍNIA, I PER QUÈ NO N'HI HA PROU AMB VEURE UN `Td`.

     `Td` vol dir «mou el llapis», i mou-lo en dues direccions: de costat i
     amunt o avall. Els PDF de Google Docs col·loquen CADA LLETRA amb el seu
     `Td` de costat:

         0 -13.27 Td <0025> Tj
         9.77 0 Td <0048> Tj
         8.15 0 Td <004C> Tj

     Trencant línia a cada `Td`, un document sencer sortia amb una lletra per
     línia. Llavors no hi havia cap paraula enlloc, el jutge del final deia
     que allò no era text, i el document quedava «il·legible» tenint el text
     ben clar a dins. Set dels dotze PDF d'aquesta màquina fallaven per això,
     i semblava culpa dels PDF.

     El que canvia de línia és la SEGONA xifra: només quan el llapis puja o
     baixa. Per això aquí es llegeixen els números que van davant de cada
     operador en comptes de mirar només l'operador. */
  const nums = [];
  /* L'alçada de l'última matriu, per saber si la següent canvia de línia.
     Va DINS de la funció: penjada de la funció es quedaria d'un fitxer per
     al següent i el primer paràgraf del segon document sortiria enganxat. */
  let ultimaY = null;
  const posaSalt = (ty) => { if (Math.abs(ty) > 0.5) salt(); };

  while (i < flux.length) {
    const c = flux[i];

    if (c === '(') { i++; posa(cadena()); nums.length = 0; continue; }

    if (c === '<' && flux[i + 1] !== '<') {
      const tanca = flux.indexOf('>', i);
      if (tanca === -1) break;
      const hex = flux.slice(i + 1, tanca).replace(/[^0-9a-fA-F]/g, '');
      const bytes_ = [];
      for (let k = 0; k + 1 < hex.length; k += 2) bytes_.push(parseInt(hex.substr(k, 2), 16));
      posa(bytes_);
      nums.length = 0;
      i = tanca + 1;
      continue;
    }

    if ((c >= '0' && c <= '9') || c === '-' || c === '+' || c === '.') {
      let j = i;
      while (j < flux.length && /[0-9.+\-eE]/.test(flux[j])) j++;
      const n = parseFloat(flux.slice(i, j));
      if (isFinite(n)) { nums.push(n); if (nums.length > 6) nums.shift(); }
      i = j;
      continue;
    }

    if (flux.startsWith('T*', i)) { salt(); nums.length = 0; i += 2; continue; }
    if (flux.startsWith('Td', i) || flux.startsWith('TD', i)) {
      posaSalt(nums.length >= 2 ? nums[nums.length - 1] : 1);
      nums.length = 0; i += 2; continue;
    }
    if (flux.startsWith('Tm', i)) {
      /* `Tm` posa la matriu sencera: la sisena xifra és l'alçada. Un canvi de
         matriu quasi sempre vol dir línia nova o bloc nou. */
      if (nums.length >= 6) {
        const y = nums[nums.length - 1];
        if (ultimaY === null || Math.abs(y - ultimaY) > 0.5) salt();
        ultimaY = y;
      } else salt();
      nums.length = 0; i += 2; continue;
    }
    if (flux.startsWith('ET', i)) { salt(); nums.length = 0; i += 2; continue; }

    /* Qualsevol altra lletra tanca la llista de números: són els arguments
       del que vingui, no del següent. */
    if (/[A-Za-z]/.test(c)) {
      let j = i;
      while (j < flux.length && /[A-Za-z*'"]/.test(flux[j])) j++;
      nums.length = 0;
      i = j;
      continue;
    }
    i++;
  }
  return out;
}

/** Els codis, passats per la taula. Sense taula, cada codi és el seu byte. */
function codisAText_(codis, mapa) {
  let s = '', sensePassar = 0, lletres = 0;
  codis.forEach((c) => {
    if (c === -1) { s += '\n'; return; }
    lletres++;
    if (mapa && mapa[c] !== undefined) { s += mapa[c]; return; }
    if (mapa) sensePassar++;
    s += String.fromCharCode(c);
  });
  return { text: s, cobertura: lletres ? 1 - (sensePassar / lletres) : 0 };
}

export function textDePdf(buf) {
  const fluxos = fluxosDePdf_(buf);
  if (!fluxos.contingut.length) {
    throw new Error('Aquest PDF no porta text: o és escanejat —una foto d\'un ' +
                    'text— o està fet d\'una manera que no sé llegir.');
  }

  const taula = mapaDeCodis_(fluxos.cmaps);
  const amb = taula.quants ? taula.mapa : null;

  const trossos = fluxos.contingut.map((f) => codisDunFlux_(f, taula.bytes));
  const junts = [];
  trossos.forEach((t) => { junts.push(...t, -1); });

  const r = codisAText_(junts, amb);
  const cru = netejaLinies_(r.text);

  /* SI LA TAULA NO ARRIBA, VAL MÉS SENSE. Hi ha PDF amb fonts barrejades on
     el mapa només cobreix una part dels codis; llavors la meitat del text
     surt bé i l'altra meitat surt canviada, que és pitjor que tot igual.
     Es prova també sense i es queda el que s'assembli més a una llengua. */
  if (amb && r.cobertura < 0.6) {
    const pelat = netejaLinies_(codisAText_(junts, null).text);
    if (sembla_text_de_debo_(pelat) && !sembla_text_de_debo_(cru)) return pelat;
  }

  if (!sembla_text_de_debo_(cru)) {
    throw new Error('D\'aquest PDF només en surten símbols. Sol passar amb els ' +
                    'escanejats i amb els que porten la seva pròpia font sense la ' +
                    'taula per traduir-la: el text que veus és un dibuix, no ' +
                    'lletres. Te\'l puc obrir.');
  }
  return cru;
}

// ═══════════════════════════════════════════════════════ i el jutge de tot
/**
 * ¿AIXÒ S'ASSEMBLA A UN TEXT?
 *
 * És l'única cosa que separa «t'explico el document» de «m'invento un resum
 * d'un document que no he pogut llegir». Es mira que la majoria del que hi ha
 * siguin lletres, xifres, espais i puntuació normal, i que hi hagi paraules
 * de debò —seqüències de lletres separades per espais—.
 *
 * Els llindars no són fins: no cal que ho siguin. Un text de veritat passa del
 * 90% de caràcters normals; una tirallonga de símbols no arriba al 50.
 */
export function sembla_text_de_debo_(t) {
  const net = String(t || '').trim();
  if (net.length < 40) return false;

  const mostra = net.slice(0, 6000);
  const normals = (mostra.match(/[\p{L}\p{N}\s.,;:!?¿¡'"()\[\]«»\-–—/%€$@#+*=&º ª]/gu) || []).length;
  if (normals / mostra.length < 0.85) return false;

  /* VUIT PARAULES, no vint. Amb vint, un document curt de debò —«NECESSITO
     QUE EM DESCARREGUIS LES CANÇONS», que és un fitxer seu— quedava fora per
     ser curt, no per ser il·legible. Vuit segueix deixant fora un títol solt,
     que és el que es volia. */
  const paraules = mostra.match(/\p{L}{3,}/gu) || [];
  if (paraules.length < 8) return false;

  /* ══════════════════════════════════════════════════════════════════════
     LA COMPROVACIÓ QUE DE VERITAT SEPARA UN TEXT D'UNA CODIFICACIÓ PRÒPIA.
     Comptar caràcters «normals» no n'hi ha prou, i això va passar amb un PDF
     de debò: «!]GkYI h jgkEjkg I <[G jQZQ[O» són gairebé totes lletres i
     passava la comprovació de dalt sense voler dir absolutament res. Són les
     lletres de veritat del document, però cadascuna substituïda per una
     altra —la font porta la seva pròpia numeració i sense la seva taula de
     traducció el text és un codi.

     El que no sobreviu a una substitució així és una cosa que tenen totes
     les llengües que escriu en Pol: gairebé cada paraula porta una vocal.
     Amb les lletres barrejades, la meitat en queden sense. */
  const ambVocal = paraules.filter((p) => /[aeiouàèéíòóúüáïöâêîôûAEIOUÀÈÉÍÒÓÚÜÁÏÖ]/.test(p));
  return (ambVocal.length / paraules.length) >= 0.75;
}

function netejaLinies_(t) {
  return String(t || '')
    .replace(/\r\n?/g, '\n')
    /* ELS INVISIBLES FORA: amples zero, marques d'ordre de lectura i guions
       tous. Els PDF de Google Docs en posen un a cada pic de llista, i com
       que no es veuen enlloc, el que arribava a la IA era un text amb forats
       que no sabia d'on sortien. */
    .replace(/[​-‏‪-‮﻿­]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ═════════════════════════════════════════════════════════════════ la porta

/** El text d'un document amb format, o una excepció que diu per què no. */
export function textDe(cami) {
  const ext = path.extname(cami).toLowerCase();
  const buf = fs.readFileSync(cami);

  if (ext === '.pdf') return textDePdf(buf);
  if (ext === '.docx') return textDeDocx(buf);
  if (ext === '.pptx') return textDePptx(buf);
  if (ext === '.odt') return textDOdt(buf);

  /* EL .DOC VELL NO ÉS UN .DOCX. És un format binari d'abans del 2007 i no té
     res a veure: no és un zip i no porta XML. Dir-ho és millor que provar-ho
     i tornar símbols. */
  if (ext === '.doc') {
    throw new Error('Els .doc antics (d\'abans del 2007) no els sé llegir. Si el ' +
                    'guardes com a .docx, sí. Te\'l puc obrir.');
  }
  throw new Error('No sé treure text dels «' + ext + '».');
}
