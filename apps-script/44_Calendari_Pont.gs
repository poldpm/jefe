/**
 * JEFE — CALENDARI · el pont amb un altre compte de Google
 *
 * EL PROBLEMA QUE RESOL
 *   JEFE corre amb el compte personal d'en Pol. Els calendaris de l'escola
 *   són d'un Workspace on l'administrador té bloquejat compartir-los amb
 *   permís d'escriptura cap a fora. Per molt permís que es doni des de
 *   l'escola, el compte personal NOMÉS els podrà mirar. No és una limitació
 *   d'aquí: és una política del domini, i no hi ha manera de saltar-se-la
 *   —ni s'ha d'intentar.
 *
 * LA SOLUCIÓ, I PER QUÈ ÉS L'ÚNICA
 *   Si el compte personal no pot escriure, ha d'escriure algú que sí que
 *   pugui: un script petit que viu DINS del compte de l'escola i que només
 *   sap fer una cosa —apuntar, canviar i treure esdeveniments dels
 *   calendaris d'aquell compte—. JEFE li ho demana per una adreça, amb una
 *   clau compartida.
 *
 *   No és cap drecera ni cap truc: és el mateix que fa qualsevol integració
 *   entre dos comptes. Cadascú fa servir els seus permisos.
 *
 * QUÈ HI PASSA I QUÈ NO
 *   Els calendaris de l'altre compte no els veu el personal de cap manera:
 *   ni per llegir. Per tant hi passen les dues coses —llegir i escriure—,
 *   però la lectura d'un mes sencer va en UNA sola petició, no una per
 *   calendari.
 *
 *   Els calendaris DEL COMPTE PERSONAL no toquen el pont per res: es
 *   llegeixen i s'escriuen com sempre. El pont no els afegeix ni un
 *   mil·lisegon.
 *
 * SI EL PONT NO HI ÉS
 *   Tot funciona igual: es veuen els calendaris de l'escola i s'hi escriu
 *   als propis. L'únic que canvia és el missatge d'error quan intentes
 *   apuntar en un d'ells.
 *
 * COM ES POSA EN MARXA
 *   Vegeu `docs/04-calendari-escola.md`. Són cinc minuts i es fa una vegada.
 */

var PROP_PONT_URL  = 'CAL_PONT_URL';
var PROP_PONT_CLAU = 'CAL_PONT_CLAU';

var CalendariPont = (function () {

  function config_() {
    var p = PropertiesService.getScriptProperties();
    var url = p.getProperty(PROP_PONT_URL);
    var clau = p.getProperty(PROP_PONT_CLAU);
    return (url && clau) ? { url: url, clau: clau } : null;
  }

  function hiEs() { return !!config_(); }

  /**
   * Parla amb l'altre compte.
   *
   * `text/plain` a posta, igual que a `doPost` d'aquí: amb JSON el navegador
   * —i Apps Script— hi afegirien una petició de comprovació prèvia que l'altra
   * banda no sap respondre. El cos segueix sent JSON; només canvia l'etiqueta.
   */
  /**
   * LA PETICIÓ, MUNTADA PERÒ NO ENVIADA.
   *
   * Existeix perquè el calendari pugui posar-la a la MATEIXA tirada que les
   * agendes pròpies —vegeu `totesDeCop_` a 40_Mod_Calendari.gs—: preguntar-ho
   * tot alhora fa que el pont deixi de costar tres segons a sobre de la resta i
   * passi a costar el que trigui la petició més lenta de totes.
   *
   * El que no fa és decidir res: qui l'envia és qui la demana, i llegir-ne la
   * resposta segueix sent feina d'aquí —vegeu `llegeix`—, que és on hi ha totes
   * les maneres en què això pot anar malament.
   */
  function peticio(accio, dades) {
    var c = config_();
    if (!c) return null;

    var cos = { clau: c.clau, accio: accio };
    for (var k in dades) cos[k] = dades[k];

    return {
      url: c.url,
      method: 'post',
      contentType: 'text/plain;charset=utf-8',
      payload: JSON.stringify(cos),
      muteHttpExceptions: true,
      followRedirects: true
    };
  }

  function demana_(accio, dades) {
    var p = peticio(accio, dades);
    if (!p) throw new Error('No hi ha cap pont configurat amb l\'altre compte.');

    var r;
    try {
      r = UrlFetchApp.fetch(p.url, p);
    } catch (err) {
      throw new Error('No arribo al compte de l\'escola: ' + err.message);
    }
    return llegeix(r);
  }

  /** Què vol dir el que ha contestat. Totes les maneres de sortir malament. */
  function llegeix(r) {
    var codi = r.getResponseCode();
    var text = r.getContentText();

    if (codi !== 200) {
      throw new Error('El compte de l\'escola ha respost ' + codi + '. ' +
        (codi === 401 || codi === 403
          ? 'Segurament el desplegament no és d\'accés «Qualsevol», o el domini ' +
            'de l\'escola no deixa publicar aplicacions web cap a fora.'
          : Utils.talla(text, 200)));
    }

    var resposta;
    try { resposta = JSON.parse(text); }
    catch (err) {
      /* Google contesta amb una pàgina d'inici de sessió quan el desplegament
         demana identificar-se. Passa sempre amb «Només jo» o amb «Qualsevol
         del domini»: JEFE hi truca sense identificar-se i no la pot passar. */
      throw new Error('El compte de l\'escola no ha contestat amb dades. ' +
        'Això passa quan el desplegament no és d\'accés «Qualsevol»: ' +
        'Google demana iniciar sessió i JEFE no pot.');
    }

    if (!resposta.ok) throw new Error(resposta.error || 'L\'altre compte ha dit que no.');
    return resposta.dades;
  }

  return {
    hiEs: hiEs,
    config: config_,
    peticio: peticio,
    llegeix: llegeix,
    calendaris: function () { return demana_('calendaris', {}); },
    esdeveniments: function (desde, fins, ids) {
      return demana_('esdeveniments', { desde: desde, fins: fins, calendaris: ids || [] });
    },
    /* El mateix, però només muntada: la fa servir el calendari per preguntar-ho
       tot de cop. Si no hi ha pont, torna `null` i qui la demana ja se'n surt. */
    peticioEsdeveniments: function (desde, fins, ids) {
      return peticio('esdeveniments', { desde: desde, fins: fins, calendaris: ids || [] });
    },
    crea: function (p) { return demana_('crea', p); },
    edita: function (p) { return demana_('edita', p); },
    treu: function (p) { return demana_('treu', p); },
    prova: function () { return demana_('prova', {}); }
  };
})();


/**
 * CONNECTAR EL PONT, si pots passar-li els valors.
 *
 * L'editor d'Apps Script NO deixa passar arguments a una funció des del botó
 * d'executar: només la crida buida. Per això el camí documentat és posar els
 * dos valors a mà a Propietats de l'script i executar `provaPontEscola()`,
 * que ja ho comprova tot. Aquesta funció hi és per si els pots enganxar.
 */
function connectaPontEscola(url, clau) {
  if (!url || !clau) {
    return 'Aquesta funció necessita dos valors, i des del botó d\'executar no\n' +
           'se li poden donar. Fes-ho així:\n\n' +
           '  Configuració del projecte (l\'engranatge de l\'esquerra)\n' +
           '  → Propietats de l\'script → Afegeix una propietat, dues vegades:\n\n' +
           '     ' + PROP_PONT_URL + '   →  l\'adreça acabada en /exec\n' +
           '     ' + PROP_PONT_CLAU + '  →  la clau\n\n' +
           '  I després executa provaPontEscola().';
  }

  var u = String(url).trim();
  if (u.indexOf('https://script.google.com/') !== 0 || u.slice(-5) !== '/exec') {
    return 'Aquesta adreça no té la pinta bona. Ha de començar per\n' +
           'https://script.google.com/macros/s/ i acabar en /exec\n' +
           '(no en /dev, que és la de proves i només funciona per a tu).';
  }

  PropertiesService.getScriptProperties().setProperties({
    CAL_PONT_URL: u,
    CAL_PONT_CLAU: String(clau).trim()
  });

  return 'Desat. Ara executa provaPontEscola() per veure si contesta.';
}


/**
 * Comprova el pont i diu què s'hi pot fer. No escriu res enlloc.
 * És l'única funció que has d'executar: comprova també que els valors que
 * has posat a mà tinguin la pinta bona.
 */
function provaPontEscola() {
  var l = ['=== EL PONT AMB EL COMPTE DE L\'ESCOLA ==='];
  function a(t) { l.push(t); Logger.log(t); }

  var c = CalendariPont.config();
  if (!c) {
    var p = PropertiesService.getScriptProperties();
    var teUrl = !!p.getProperty(PROP_PONT_URL);
    var teClau = !!p.getProperty(PROP_PONT_CLAU);

    a('Encara no hi ha pont.');
    a('');
    a('  ' + PROP_PONT_URL + '   ' + (teUrl ? 'posada' : 'FALTA'));
    a('  ' + PROP_PONT_CLAU + '  ' + (teClau ? 'posada' : 'FALTA'));
    a('');
    a('Es posen a: engranatge de l\'esquerra (Configuració del projecte)');
    a('→ baixa fins a «Propietats de l\'script» → «Afegeix una propietat».');
    a('');
    a('Tot el pas a pas és a docs/04-calendari-escola.md');
    return l.join('\n');
  }

  if (c.url.slice(-5) !== '/exec') {
    a('L\'adreça no acaba en /exec i per tant no funcionarà.');
    a('  Ara hi diu: ' + c.url);
    a('');
    a('La bona és la que et dona el quadre blau en desplegar, i acaba en /exec.');
    a('La que acaba en /dev és la de proves i només funciona per a tu.');
    return l.join('\n');
  }

  a('Adreça .................... ' + c.url.slice(0, 60) + '…');
  a('');

  var r;
  try {
    r = CalendariPont.prova();
  } catch (err) {
    a('FALLA: ' + err.message);
    a('');
    a('Les dues causes de sempre, per ordre:');
    a('  1. El desplegament de l\'altra banda no és d\'accés «Qualsevol».');
    a('  2. La clau no coincideix amb la que hi ha allà.');
    return l.join('\n');
  }

  a('Contesta ................... sí, com a ' + (r.compte || '(no ho diu)'));
  a('');
  a('Calendaris on pot escriure:');
  (r.calendaris || []).forEach(function (x) {
    a('  · ' + x.nom + (x.principal ? '   ← el principal d\'aquell compte' : ''));
  });
  a('');
  a('A partir d\'ara, quan apuntis en un d\'aquests des de JEFE i el teu compte');
  a('personal no hi pugui escriure, passarà per aquí sol. No has de fer res més.');
  return l.join('\n');
}
