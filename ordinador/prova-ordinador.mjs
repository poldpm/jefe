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

console.log('\nOn pot mirar, i on no');
{
  const fora = await truca({ verb: 'llegeix', args: { cami: 'C:\\Windows\\win.ini' } });
  cal('un fitxer de fora de les arrels no es llegeix',
      fora.dades.fet === false && /fora d'on puc mirar/.test(fora.dades.error),
      JSON.stringify(fora.dades));

  const amunt = await truca({ verb: 'llegeix',
    args: { cami: path.join(os.homedir(), 'Documents', '..', '..', '..', 'Windows', 'win.ini') } });
  cal('i pujar amb «..» tampoc hi arriba',
      amunt.dades.fet === false && /fora d'on puc mirar/.test(amunt.dades.error),
      JSON.stringify(amunt.dades));

  const carpetaFora = await truca({ verb: 'llista', args: { cami: 'C:\\Windows' } });
  cal('ni llistar-ne una carpeta',
      carpetaFora.dades.fet === false && /fora d'on puc mirar/.test(carpetaFora.dades.error),
      JSON.stringify(carpetaFora.dades));

  const obrirFora = await truca({ verb: 'obre_fitxer', args: { cami: 'C:\\Windows\\System32\\cmd.exe' } });
  cal('ni obrir-hi res',
      obrirFora.dades.fet === false && /fora d'on puc mirar/.test(obrirFora.dades.error),
      JSON.stringify(obrirFora.dades));
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
