/**
 * JEFE — MÒDUL · Finances · connexió bancària (PSD2 · Enable Banking)
 *
 * Ve del backend de l'app antiga. La classificació està PORTADA TAL QUAL:
 * les regles i la taula de codis de comerç s'han rodat contra quatre mesos de
 * moviments reals d'en Pol, i tocar-les «de passada» seria canviar una cosa
 * que funciona sense cap dada que ho justifiqui.
 *
 * QUÈ CANVIA RESPECTE DE L'APP ANTIGA
 *   · Els moviments es desen com a files, no dins d'un bloc JSON.
 *   · Abans d'aplicar cap regla es mira la MEMÒRIA DE COMERÇOS. El que va
 *     decidir en Pol mana sobre el que endevini qualsevol regla, i per això
 *     un comerç conegut ja no torna a passar per la safata de revisió.
 *   · Quan arriben moviments nous, JEFE avisa al mòbil.
 *
 * ALTA (un sol cop, i és cosa d'en Pol):
 *   1. A enablebanking.com, afegir la URL d'aquest Web App a les redirect URLs
 *      de l'aplicació. La de l'app antiga ja no serveix.
 *   2. A Propietats de l'script:  EB_APP_ID · EB_PRIVATE_KEY · EB_REDIRECT
 *   3. bancsDisponibles('ES') → omplir MEU_BANC → connectaBanc()
 *   4. instalaTriggers() ja programa la sincronització diària.
 *
 * Cap credencial del banc passa per aquí: en Pol s'identifica a la web del seu
 * banc i el permís que dona és de NOMÉS LECTURA.
 */

var EB_BASE = 'https://api.enablebanking.com';
var PROP_BANC = 'FINANCES_BANC';        // estat de la connexió (conté la sessió)
var DIES_ACCES = 90;                    // quant dura el permís del banc

/* AQUÍ NO HI HA CAP VARIABLE PER OMPLIR, i és a posta.
   Hi havia un `MEU_BANC` per escriure-hi el nom del banc, com a l'app antiga.
   Però aquest fitxer es publica des del repositori amb `clasp push -f`: el que
   s'escrigui a l'editor desapareix a la següent pujada, sense avisar i sense
   deixar rastre. El nom del banc va com a argument de connectaBanc(). */


var FinancesBanc = (function () {

  // --------------------------------------------------------- estat i secrets

  function prop_(k) {
    var v = PropertiesService.getScriptProperties().getProperty(k);
    if (!v) throw new Error('Falta la propietat de l\'script: ' + k);
    return v;
  }

  /* L'estat de la connexió porta l'identificador de sessió, que és una
     credencial. Va a Script Properties i no al full de càlcul. */
  function estat() {
    var brut = PropertiesService.getScriptProperties().getProperty(PROP_BANC);
    return Utils.desJson(brut, {}) || {};
  }

  function desaEstat(e) {
    PropertiesService.getScriptProperties().setProperty(PROP_BANC, JSON.stringify(e));
  }

  function disponible() {
    var e = estat();
    return !!(e.connected && e.accounts && e.accounts.length);
  }

  // ------------------------------------------------------------ autenticació

  function b64url_(dades) {
    return Utilities.base64EncodeWebSafe(dades).replace(/=+$/, '');
  }

  function jwt_() {
    var cache = CacheService.getScriptCache();
    var t = cache.get('eb_jwt');
    if (t) return t;

    var iat = Math.floor(Date.now() / 1000);
    var capcalera = { typ: 'JWT', alg: 'RS256', kid: prop_('EB_APP_ID') };
    var cos = { iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat: iat, exp: iat + 3600 };

    var sense = b64url_(Utilities.newBlob(JSON.stringify(capcalera)).getBytes()) + '.' +
                b64url_(Utilities.newBlob(JSON.stringify(cos)).getBytes());
    var signatura = Utilities.computeRsaSha256Signature(sense, prop_('EB_PRIVATE_KEY'));
    var token = sense + '.' + b64url_(signatura);

    cache.put('eb_jwt', token, 3300);
    return token;
  }

  function eb_(cami, opcions) {
    opcions = opcions || {};
    opcions.muteHttpExceptions = true;
    opcions.headers = { Authorization: 'Bearer ' + jwt_() };
    if (opcions.payload) opcions.contentType = 'application/json';

    var r = UrlFetchApp.fetch(EB_BASE + cami, opcions);
    var text = r.getContentText();
    if (r.getResponseCode() >= 300) {
      throw new Error(cami + ' → ' + r.getResponseCode() + ' ' + Utils.talla(text, 300));
    }
    return Utils.desJson(text, {});
  }

  // ------------------------------------------------------------------- alta

  function comprova() {
    var r = eb_('/application', { method: 'get' });
    var redirect = prop_('EB_REDIRECT');
    var urls = r.redirect_urls || [];

    /* QUE ESTIGUI REGISTRADA NO VOL DIR QUE SIGUI LA NOSTRA.
       L'app antiga de finances també tenia la seva adreça registrada aquí, i
       en copiar les propietats és la que ve. Si es deixa passar, el banc
       redirigeix cap allà, l'app antiga diu «Banc connectat» i desa la sessió
       al seu full: JEFE es queda sense connectar i ningú avisa de res.

       Es comprova ANANT-HI i mirant qui contesta, no comparant
       identificadors. El primer intent comparava EB_REDIRECT amb
       `ScriptApp.getService().getUrl()`, que des de l'editor retorna la URL
       /dev: dos desplegaments del mateix projecte, dos identificadors
       diferents, i una alarma falsa sobre una configuració correcta.
       Qui contesta no admet interpretacions. */
    var quiContesta = null, respostaCurta = '';
    try {
      var resp = UrlFetchApp.fetch(redirect, { muteHttpExceptions: true, followRedirects: true });
      var cos = resp.getContentText();
      respostaCurta = Utils.talla(cos.replace(/\s+/g, ' '), 120);
      if (/<title>\s*JEFE\s*<\/title>/i.test(cos)) quiContesta = 'jefe';
      else if (/Finances backend actiu/i.test(cos)) quiContesta = 'app antiga de finances';
      else quiContesta = 'algú altre';
    } catch (e) {
      quiContesta = null;                 // sense xarxa: no acusem ningú
      respostaCurta = e.message;
    }

    return {
      aplicacio: r.name,
      entorn: r.environment,
      produccio: r.environment === 'PRODUCTION',
      activa: !!r.active,
      redirect: redirect,
      redirectRegistrada: urls.indexOf(redirect) >= 0,
      quiContesta: quiContesta,
      apuntaAJefe: quiContesta === null ? null : (quiContesta === 'jefe'),
      resposta: respostaCurta,
      registrades: urls
    };
  }

  function bancs(pais) {
    var r = eb_('/aspsps?country=' + (pais || 'ES'), { method: 'get' });
    // La crida sencera, a punt de copiar. El nom del banc pot dur espais,
    // punts i comes, i endevinar què va dins de les cometes no és feina seva.
    return (r.aspsps || []).map(function (b) {
      return 'connectaBanc("' + String(b.name).replace(/"/g, '\\"') + '")';
    });
  }

  function connecta(nom) {
    nom = String(nom || '').trim();
    if (!nom) {
      throw new Error('Digues quin banc, exactament com surti a bancsDisponibles(): ' +
                      'connectaBanc("CaixaBank")');
    }

    /* El nom ha de ser EXACTE. Si no ho és, l'API contesta amb un error que no
       diu què li passa, i et quedes mirant-lo. Val més comprovar-ho abans i
       dir-li quins s'hi assemblen. */
    var disponibles = (eb_('/aspsps?country=ES', { method: 'get' }).aspsps || [])
      .map(function (b) { return b.name; });
    if (disponibles.indexOf(nom) === -1) {
      var busca = nom.toUpperCase();
      var semblants = disponibles.filter(function (n) {
        return n.toUpperCase().indexOf(busca) !== -1 || busca.indexOf(n.toUpperCase()) !== -1;
      });
      throw new Error('«' + nom + '» no és cap nom exacte d\'entitat.' +
        (semblants.length
          ? ' Volies dir algun d\'aquests?\n  ' +
            semblants.map(function (n) { return 'connectaBanc("' + n + '")'; }).join('\n  ')
          : ' Executa bancsDisponibles() i copia la línia sencera.'));
    }

    var fins = new Date(Date.now() + DIES_ACCES * 864e5).toISOString().replace(/\.\d+Z$/, 'Z');
    var r = eb_('/auth', {
      method: 'post',
      payload: JSON.stringify({
        access: { valid_until: fins },
        aspsp: { name: nom, country: 'ES' },
        state: Utilities.getUuid(),
        redirect_url: prop_('EB_REDIRECT'),
        psu_type: 'personal'
      })
    });

    var e = estat();
    e.proveidor = 'enablebanking';
    e.institution = nom;
    e.connected = false;
    e.authId = r.authorization_id;
    e.since = Utils.ara();
    desaEstat(e);

    return r.url;
  }

  /** La crida el nucli quan el banc torna amb ?code=… No s'executa a mà. */
  function creaSessio(codi) {
    var r = eb_('/sessions', { method: 'post', payload: JSON.stringify({ code: codi }) });

    // El uid és el que fa servir /accounts/{uid}/transactions
    var comptes = (r.accounts || []).map(function (a, i) {
      var d = (r.accounts_data || [])[i] || {};
      return { uid: d.uid || a.uid || a,
               iban: (a.account_id && a.account_id.iban) || d.iban || '' };
    }).filter(function (a) { return a.uid && typeof a.uid === 'string'; });

    if (!comptes.length) throw new Error('El banc no ha retornat cap compte.');

    var e = estat();
    e.proveidor = 'enablebanking';
    e.sessionId = r.session_id;
    e.accounts = comptes;
    e.connected = true;
    e.caduca = Utils.aText(new Date(Date.now() + DIES_ACCES * 864e5));
    desaEstat(e);

    Log.info('banc.sessio', 'Banc connectat', { comptes: comptes.length });
    return { comptes: comptes.length };
  }

  // --------------------------------------------------------- sincronització

  /**
   * Baixa els moviments nous i els desa.
   *
   * La deduplicació és per `id_banc`: el mateix moviment mai no entra dues
   * vegades encara que la sincronització es repeteixi o es solapi.
   */
  function sincronitza() {
    var e = estat();
    if (!disponible()) return { nous: 0, motiu: 'El banc encara no està connectat.' };

    var vistos = {};
    var primera = true;
    Dades.llegeix('Moviments').forEach(function (f) {
      if (f.id_banc) vistos[String(f.id_banc)] = true;
      if (f.origen === 'banc') primera = false;
    });

    // La primera vegada, 90 dies enrere; després només els últims 10.
    var desde = Utils.aText(new Date(Date.now() - (primera ? 90 : 10) * 864e5));

    var nous = 0, errors = [];
    var perDesar = [];

    e.accounts.forEach(function (compte) {
      var continuacio = null, voltes = 0;
      do {
        var q = '?date_from=' + desde +
                (continuacio ? '&continuation_key=' + encodeURIComponent(continuacio) : '');
        var dades;
        try {
          dades = eb_('/accounts/' + compte.uid + '/transactions' + q, { method: 'get' });
        } catch (err) {
          errors.push('Compte ' + Utils.talla(compte.uid, 8) + ': ' + err.message);
          return;
        }

        (dades.transactions || []).forEach(function (b) {
          var imp = parseFloat((b.transaction_amount && b.transaction_amount.amount) || '0');
          if (!imp) return;

          var esIngres = b.credit_debit_indicator === 'CRDT';
          var quan = String(b.booking_date || b.value_date || b.transaction_date ||
                            Utils.avui()).slice(0, 10);
          var desc = FinancesRegles.descripcio(b);

          var idBanc = b.entry_reference || b.transaction_id ||
                       (compte.uid + '|' + quan + '|' + imp + '|' + desc.slice(0, 24));
          if (vistos[idBanc]) return;
          vistos[idBanc] = true;

          perDesar.push({
            data: quan,
            tipus: esIngres ? 'i' : 'd',
            'import': Math.abs(imp),
            categoria: FinancesRegles.categoria(b, esIngres),
            descripcio: desc,
            metode: FinancesRegles.metode(b, esIngres),
            origen: 'banc',
            id_banc: idBanc,
            pendent: b.status !== 'BOOK'
          });
          nous++;
        });

        continuacio = dades.continuation_key;
      } while (continuacio && ++voltes < 20);
    });

    /* Un a un i per `Finances.afegeix`, no en bloc: és aquesta funció la que
       consulta la memòria de comerços i decideix si el moviment ja entra
       classificat i revisat. Saltar-se-la per anar més de pressa tornaria a
       omplir la safata de coses que ja sabem. */
    var jaSabuts = 0;
    perDesar.forEach(function (m) {
      var fila = Finances.afegeix(m);
      if (String(fila.revisat).toUpperCase() === 'SI') jaSabuts++;
    });

    var saldos = actualitzaSaldos_(e);

    Log.info('banc.sincronitza', 'Sincronització', {
      nous: nous, jaSabuts: jaSabuts, saldos: saldos, errors: errors.length
    });

    return { nous: nous, jaSabuts: jaSabuts, perRevisar: nous - jaSabuts,
             saldos: saldos, errors: errors };
  }

  /**
   * El saldo de cada compte, desat com a valor de patrimoni.
   * Un valor per dia: si es sincronitza dues vegades, la segona corregeix la
   * primera en comptes d'inflar l'històric.
   */
  function actualitzaSaldos_(e) {
    var avui = Utils.avui();
    var fets = 0;

    (e.accounts || []).forEach(function (compte) {
      var saldo = null;
      try {
        var r = eb_('/accounts/' + compte.uid + '/balances', { method: 'get' });
        var b = (r.balances || [])[0];
        (r.balances || []).forEach(function (x) {
          var t = String(x.balance_type || '').toUpperCase();
          if (t.indexOf('AVAILABLE') >= 0 || t === 'CLBD' || t === 'XPCD') b = x;
        });
        if (b && b.balance_amount) saldo = parseFloat(b.balance_amount.amount);
      } catch (err) {
        Log.avis('banc.saldo', 'No he pogut llegir un saldo', { error: err.message });
        return;
      }
      if (saldo === null || isNaN(saldo)) return;

      var id = 'auto_' + String(compte.uid).slice(0, 12);
      if (!Dades.perId('Patrimoni', id)) {
        Dades.insereix('Patrimoni', {
          id: id,
          nom: 'Compte' + (compte.iban ? ' ···' + String(compte.iban).slice(-4) : ''),
          tipus: 'banc',
          automatic: 'SI'
        }, 'act');
      }

      Dades.desa('PatrimoniHistoric', {
        id: 'val_' + id + '_' + avui,
        id_actiu: id, data: avui, valor: saldo
      }, ['id'], 'val');
      fets++;
    });

    return fets;
  }

  return {
    estat: estat,
    disponible: disponible,
    comprova: comprova,
    bancs: bancs,
    connecta: connecta,
    creaSessio: creaSessio,
    sincronitza: sincronitza
  };
})();
