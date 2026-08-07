/**
 * PROVES DE L'AJUDANT DE L'ORDINADOR
 *
 *   node ordinador/jefe-ordinador.mjs      (en una finestra, i deixar-la)
 *   node ordinador/prova-ordinador.mjs     (en una altra)
 *
 * Això obre un servidor a la teva màquina, o sigui que el que s'ha de
 * comprovar no és només que faci la seva feina: és que NO en faci cap altra.
 * Per això la meitat d'aquestes proves són coses que ha de saber dir que no.
 *
 * NO OBRE RES A LA PANTALLA a posta. Els dos verbs que obren coses es proven
 * pels camins que han de rebutjar; el d'obrir de debò el proves tu, que és
 * la teva pantalla.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 8787;
const ORIGEN = 'https://poldpm.github.io';
const CLAU = fs.readFileSync(path.join(os.homedir(), '.jefe', 'clau-ordinador.txt'), 'utf8').trim();

let falles = 0;
function cal(nom, cond, extra) {
  console.log((cond ? '  ok   ' : '  FALLA') + '  ' + nom + (cond ? '' : '  → ' + extra));
  if (!cond) falles++;
}

/* SI L'AJUDANT NO HI ÉS, DIR-HO. Sense això, `fetch` peta amb una traça de
   Node de vint línies i el que sembla és que les proves estiguin trencades,
   quan el que passa és que t'has descuidat d'obrir el programa. */
try {
  const viu = new AbortController();
  setTimeout(() => viu.abort(), 2000);
  await fetch('http://127.0.0.1:' + PORT + '/', { method: 'OPTIONS', signal: viu.signal });
} catch (e) {
  console.error('\n  L\'ajudant no està obert.');
  console.error('  Engega\'l en una altra finestra i torna-ho a provar:\n');
  console.error('      node ordinador/jefe-ordinador.mjs\n');
  process.exit(1);
}

async function truca(cos, opcions) {
  opcions = opcions || {};
  const capceleres = { 'Content-Type': 'application/json' };
  if (opcions.origen !== null) capceleres.Origin = opcions.origen || ORIGEN;
  if (opcions.clau !== null) capceleres['X-Jefe-Clau'] = opcions.clau || CLAU;

  const r = await fetch('http://127.0.0.1:' + PORT + '/', {
    method: opcions.metode || 'POST',
    headers: capceleres,
    body: opcions.metode === 'GET' ? undefined : JSON.stringify(cos)
  });
  let dades = null;
  try { dades = await r.json(); } catch (e) {}
  return { codi: r.status, dades };
}

console.log('\nEls tres panys');
{
  const bo = await truca({ verb: 'hola' });
  cal('amb l\'origen i la clau bons, contesta', bo.codi === 200 && bo.dades.jefe === 'ordinador',
      JSON.stringify(bo));

  const altre = await truca({ verb: 'hola' }, { origen: 'https://qualsevol-web.example' });
  cal('una altra web no hi arriba', altre.codi === 403, JSON.stringify(altre));

  const senseClau = await truca({ verb: 'hola' }, { clau: null });
  cal('sense clau, no', senseClau.codi === 401, JSON.stringify(senseClau));

  const clauDolenta = await truca({ verb: 'hola' }, { clau: 'x'.repeat(CLAU.length) });
  cal('amb una clau equivocada, tampoc', clauDolenta.codi === 401, JSON.stringify(clauDolenta));

  const curta = await truca({ verb: 'hola' }, { clau: 'x' });
  cal('i una de curta no peta la comparació', curta.codi === 401, JSON.stringify(curta));

  const perGet = await truca(null, { metode: 'GET' });
  cal('per GET no es fa res', perGet.codi === 405, JSON.stringify(perGet));
}

console.log('\nEls verbs: el que no hi és, no es pot demanar');
{
  const inventat = await truca({ verb: 'esborra_tot' });
  cal('un verb que no existeix es rebutja', inventat.codi === 400, JSON.stringify(inventat));

  const ordre = await truca({ verb: 'executa', args: { ordre: 'dir' } });
  cal('i no hi ha cap verb per executar ordres del sistema', ordre.codi === 400,
      JSON.stringify(ordre));

  const buit = await truca({});
  cal('sense verb, tampoc', buit.codi === 400, JSON.stringify(buit));
}

console.log('\nOn pot mirar: el disc sencer');
{
  const hola = await truca({ verb: 'hola' });
  cal('l\'arrel és el disc, no quatre carpetes',
      (hola.dades.arrels || []).some((a) => /^C:\\?$/i.test(a)), JSON.stringify(hola.dades.arrels));

  const win = await truca({ verb: 'llista', args: { cami: 'C:\\Windows' } });
  cal('i per tant sí que pot llistar C:\\Windows si li dius', win.dades.fet === true,
      JSON.stringify(win.dades).slice(0, 120));

  /* La comprovació dels camins es queda encara que ara l'arrel sigui el disc:
     és la que fa que canviar les arrels torni a ser segur el dia que es
     canviïn. Amb `C:\` hi entra tot, o sigui que el que ha de rebutjar és el
     que NO és de cap disc de la llista. */
  const altreDisc = await truca({ verb: 'llegeix', args: { cami: 'Z:\\res.txt' } });
  cal('un disc que no és a la llista segueix fora',
      altreDisc.dades.fet === false && /fora d'on puc mirar/.test(altreDisc.dades.error),
      JSON.stringify(altreDisc.dades));

  const xarxa = await truca({ verb: 'llegeix', args: { cami: '\\\\servidor\\compartit\\x.txt' } });
  cal('i una carpeta de xarxa també',
      xarxa.dades.fet === false && /fora d'on puc mirar/.test(xarxa.dades.error),
      JSON.stringify(xarxa.dades));
}

console.log('\nDues coses que segueixen tancades');
{
  /* Obrir un document és ensenyar-te'l; obrir un .exe és executar un programa,
     que és el que en Pol va descartar quan va triar verbs concrets. Amb el
     disc sencer, sense això, «obre'm allò» amb una transcripció dolenta
     podria arrencar qualsevol instal·lador de la carpeta de baixades. */
  const programes = ['C:\\Windows\\System32\\cmd.exe', 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'];
  const oberts = [];
  for (const p of programes) {
    if (!fs.existsSync(p)) continue;
    const r = await truca({ verb: 'obre_fitxer', args: { cami: p } });
    if (r.dades.fet !== false) oberts.push(p);
  }
  cal('no obre res que s\'executi', oberts.length === 0, oberts.join(' · '));

  const inventats = ['C:\\x\\a.bat', 'C:\\x\\a.ps1', 'C:\\x\\a.msi', 'C:\\x\\a.vbs',
                     'C:\\x\\a.reg', 'C:\\x\\a.lnk', 'C:\\x\\a.jar'];
  const passen = [];
  for (const p of inventats) {
    const r = await truca({ verb: 'obre_fitxer', args: { cami: p } });
    /* Cap no existeix, o sigui que el que importa és QUIN no: si diu «aquí no
       hi ha res» vol dir que hauria arribat a obrir-lo si hi fos. */
    if (!/programa/.test(r.dades.error || '')) passen.push(p + ' → ' + r.dades.error);
  }
  cal('i ho mira per l\'extensió, abans de saber si existeix', passen.length === 0,
      passen.join(' · '));

  /* Llegir no és mirar: el text acaba dins d'una petició a Gemini. */
  const secrets = [path.join(os.homedir(), '.jefe', 'clau-ordinador.txt'),
                   'C:\\x\\.env', 'C:\\x\\id_rsa', 'C:\\x\\credentials.json',
                   'C:\\x\\service-account.json', 'C:\\x\\clau.pem',
                   path.join(os.homedir(), '.ssh', 'config')];
  const llegits = [];
  for (const s of secrets) {
    const r = await truca({ verb: 'llegeix', args: { cami: s } });
    if (!/clau o un fitxer de credencials/.test(r.dades.error || '')) llegits.push(s + ' → ' + (r.dades.error || 'LLEGIT'));
  }
  cal('no llegeix claus ni credencials, ni les seves pròpies', llegits.length === 0,
      llegits.join(' · '));

  /* Però obrir-les sí: és la teva màquina i el teu editor. El que no es pot
     és fer-ne sortir el contingut. */
  const obreClau = await truca({ verb: 'obre_fitxer', args: { cami: 'C:\\x\\.env' } });
  cal('però obrir-les no està prohibit: només no surten d\'aquí',
      /no hi ha res/.test(obreClau.dades.error || ''), JSON.stringify(obreClau.dades));
}

console.log('\nAdreces: què és una web i què no');
{
  const js = await truca({ verb: 'obre_web', args: { url: 'javascript:alert(1)' } });
  cal('«javascript:» no és una adreça', js.dades.fet === false, JSON.stringify(js.dades));

  const fitxer = await truca({ verb: 'obre_web', args: { url: 'file:///C:/Windows/win.ini' } });
  cal('«file:» tampoc: seria obrir fitxers per la porta del darrere',
      fitxer.dades.fet === false, JSON.stringify(fitxer.dades));

  /* AQUESTA VA FALLAR I VA OBRIR UNA PESTANYA. Posava «https://» al davant de
     tot el que no comencés per http, i «file:///C:/Windows/win.ini» es
     convertia en «https://file///C:/Windows/win.ini»: no obria el fitxer,
     però obria una finestra amb una adreça inventada. Ara un esquema que no
     sigui http o https es rebutja abans de tocar res. */
  const esquemes = ['file:///C:/Windows/win.ini', 'javascript:alert(1)', 'data:text/html,<h1>x',
                    'vbscript:msgbox', 'ms-settings:', 'steam://run/1'];
  const passats = [];
  for (const e of esquemes) {
    const r = await truca({ verb: 'obre_web', args: { url: e } });
    if (r.dades.fet !== false) passats.push(e);
  }
  cal('cap esquema que no sigui http o https obre res', passats.length === 0, passats.join(' · '));

  const res = await truca({ verb: 'obre_web', args: { url: '' } });
  cal('i una adreça buida es rebutja', res.dades.fet === false, JSON.stringify(res.dades));
}

console.log('\nLlegir i buscar de debò');
{
  /* Un fitxer de prova dins d'una arrel permesa. Es fa i es desfà aquí: no
     deixa res teu tocat. */
  const provaCami = path.join(os.homedir(), 'Documents', 'jefe-prova-esborrable.txt');
  fs.writeFileSync(provaCami, 'Això és una prova de JEFE.\nSegona línia.\n', 'utf8');
  try {
    const l = await truca({ verb: 'llegeix', args: { cami: provaCami } });
    cal('llegeix un fitxer de dins de les arrels',
        l.dades.fet === true && /Segona línia/.test(l.dades.text), JSON.stringify(l.dades).slice(0, 200));
    cal('i diu quants caràcters té', typeof l.dades.caracters === 'number' && !l.dades.retallat,
        JSON.stringify({ c: l.dades.caracters, r: l.dades.retallat }));

    const b = await truca({ verb: 'busca', args: { text: 'jefe-prova-esborrable' } });
    cal('el troba pel nom', b.dades.fet === true && b.dades.quants >= 1,
        JSON.stringify(b.dades).slice(0, 200));
    cal('i en torna el camí sencer',
        (b.dades.trobats[0] || {}).cami === provaCami, JSON.stringify(b.dades.trobats[0]));

    const curt = await truca({ verb: 'busca', args: { text: 'a' } });
    cal('amb una lletra sola no busca: tornaria mitja màquina', curt.dades.fet === false,
        JSON.stringify(curt.dades));

    /* AMB EL DISC SENCER, LA CERCA HA DE TENIR RELLOTGE. Buscar una cosa que
       no hi és no pot deixar la conversa penjada mirant `C:\Windows`. */
    const t0 = Date.now();
    const enlloc = await truca({ verb: 'busca', args: { text: 'zzqx-no-existeix-enlloc' } });
    const trigat = Date.now() - t0;
    cal('buscar una cosa que no hi és no triga més del compte',
        trigat < 9000, trigat + ' ms');
    cal('i diu si ha pogut mirar-ho tot o s\'ha quedat a mitges',
        typeof enlloc.dades.incomplet === 'boolean',
        JSON.stringify({ q: enlloc.dades.quants, i: enlloc.dades.incomplet, c: enlloc.dades.carpetesMirades }));

    /* I s'ha de saltar el soroll: si entrés a Windows i als Program Files, el
       rellotge se n'aniria allà i els teus documents no sortirien mai. */
    const soroll = await truca({ verb: 'busca', args: { text: 'system32' } });
    const dinsDeWindows = (soroll.dades.trobats || []).filter((t) => /\\windows\\/i.test(t.cami));
    cal('en buscar se salta Windows i companyia', dinsDeWindows.length === 0,
        JSON.stringify(dinsDeWindows.slice(0, 3)));

    const pdf = await truca({ verb: 'llegeix', args: { cami: provaCami.replace('.txt', '.pdf') } });
    cal('un fitxer que no hi és, ho diu', pdf.dades.fet === false, JSON.stringify(pdf.dades));
  } finally {
    fs.unlinkSync(provaCami);
  }

  const carpeta = await truca({ verb: 'llista', args: { cami: path.join(os.homedir(), 'Documents') } });
  cal('llista una carpeta permesa', carpeta.dades.fet === true && Array.isArray(carpeta.dades.coses),
      JSON.stringify(carpeta.dades).slice(0, 150));

  const dir = await truca({ verb: 'llegeix', args: { cami: path.join(os.homedir(), 'Documents') } });
  cal('i una carpeta no es llegeix com si fos un document',
      dir.dades.fet === false && /carpeta/.test(dir.dades.error), JSON.stringify(dir.dades));
}

console.log(falles ? '\n' + falles + ' falla(des).\n' : '\nTot correcte.\n');
process.exit(falles ? 1 : 0);
