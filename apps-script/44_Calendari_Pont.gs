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
 * QUÈ NO PASSA PER AQUÍ
 *   LLEGIR. Els calendaris de l'escola compartits «només veure» ja els
 *   llegeix el compte personal sense cap pont, i llegir és el 95% del que
 *   fa la pantalla. El pont només s'utilitza quan una escriptura falla, que
 *   és exactament quan cal.
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
  function demana_(accio, dades) {
    var c = config_();
    if (!c) throw new Error('No hi ha cap pont configurat amb l\'altre compte.');

    var cos = { clau: c.clau, accio: accio };
    for (var k in dades) cos[k] = dades[k];

    var r;
    try {
      r = UrlFetchApp.fetch(c.url, {
        method: 'post',
        contentType: 'text/plain;charset=utf-8',
        payload: JSON.stringify(cos),
        muteHttpExceptions: true,
        followRedirects: true
      });
    } catch (err) {
      throw new Error('No arribo al compte de l\'escola: ' + err.message);
    }

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
    calendaris: function () { return demana_('calendaris', {}); },
    crea: function (p) { return demana_('crea', p); },
    edita: function (p) { return demana_('edita', p); },
    treu: function (p) { return demana_('treu', p); },
    prova: function () { return demana_('prova', {}); }
  };
})();


/**
 * CONNECTAR EL PONT. S'executa una vegada, des de l'editor.
 *
 * Els dos valors van a Script Properties i no al full de càlcul: la clau és
 * el que impedeix que ningú altre escrigui al calendari de l'escola, i al
 * full hi entra qualsevol amb qui el comparteixis.
 */
function connectaPontEscola(url, clau) {
  if (!url || !clau) {
    return 'Falten dades.\n\n' +
           'Executa-ho així, amb els valors que et doni l\'script de l\'escola:\n' +
           '  connectaPontEscola(\'https://script.google.com/macros/s/AKfy.../exec\', \'la-clau\')\n\n' +
           'Si no pots passar-hi arguments des de l\'editor, posa\'ls a mà a\n' +
           'Configuració del projecte → Propietats de l\'script:\n' +
           '  ' + PROP_PONT_URL + '  →  l\'adreça acabada en /exec\n' +
           '  ' + PROP_PONT_CLAU + ' →  la clau';
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


/** Comprova el pont i diu què s'hi pot fer. No escriu res enlloc. */
function provaPontEscola() {
  var l = ['=== EL PONT AMB EL COMPTE DE L\'ESCOLA ==='];
  function a(t) { l.push(t); Logger.log(t); }

  var c = CalendariPont.config();
  if (!c) {
    a('No hi ha cap pont configurat.');
    a('');
    a('Vegeu docs/04-calendari-escola.md, i després:');
    a('  connectaPontEscola(\'https://.../exec\', \'la-clau\')');
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
