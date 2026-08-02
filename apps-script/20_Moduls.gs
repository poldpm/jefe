/**
 * JEFE — NUCLI · Registre de mòduls
 *
 * CONTRACTE (vegeu MODULS.md per a l'exemple complet):
 *
 *   Un mòdul nou = UN fitxer nou. Res més.
 *
 *   Crea `40_Mod_<Nom>.gs` amb una funció global que es digui `MODUL_<NOM>()`
 *   i que retorni el descriptor. El nucli la troba sola escombrant l'espai
 *   global. No cal registrar-la enlloc, ni tocar cap fitxer del nucli.
 *
 *   Perquè això funcioni el nom ha de complir exactament: MODUL_ + MAJÚSCULES.
 *   `MODUL_HABITS` sí. `modulHabits` o `MODUL_Habits` no.
 */

var _memoModuls = null;

function modulsRegistrats_() {
  if (_memoModuls) return _memoModuls;

  var trobats = [];
  var claus = Object.keys(globalThis);

  for (var i = 0; i < claus.length; i++) {
    var clau = claus[i];
    if (!/^MODUL_[A-Z0-9_]+$/.test(clau)) continue;

    var fabrica = globalThis[clau];
    if (typeof fabrica !== 'function') continue;

    try {
      var m = fabrica();
      if (!m || !m.id) {
        Log.avis('moduls', 'El descriptor de ' + clau + ' no té `id`. Ignorat.');
        continue;
      }
      if (m.actiu === false) continue;
      m.ordre = m.ordre === undefined ? 999 : m.ordre;
      trobats.push(m);
    } catch (err) {
      Log.error('moduls', 'El mòdul ' + clau + ' ha petat en carregar-se: ' + err.message);
    }
  }

  trobats.sort(function (a, b) { return a.ordre - b.ordre; });
  _memoModuls = trobats;
  return trobats;
}

var Moduls = (function () {

  function tots() { return modulsRegistrats_(); }

  function perId(id) {
    var m = modulsRegistrats_();
    for (var i = 0; i < m.length; i++) if (m[i].id === id) return m[i];
    return null;
  }

  /** Sincronitza el full `_Moduls` amb el que hi ha realment carregat. */
  function sincronitzaFull() {
    var m = modulsRegistrats_();
    for (var i = 0; i < m.length; i++) {
      var existent = Dades.un('_Moduls', { id_modul: m[i].id });
      Dades.desa('_Moduls', {
        id_modul: m[i].id,
        nom: m[i].nom || m[i].id,
        icona: m[i].icona || '',
        // Respecta el que jo hagi posat a mà; només posa SI la primera vegada.
        actiu: existent ? existent.actiu : 'SI',
        ordre: m[i].ordre,
        versio_esquema: m[i].versioEsquema || 1,
        actualitzat_el: Utils.ara()
      }, ['id_modul']);
    }
    return m.length;
  }

  /** Mòduls actius segons el full `_Moduls` (permet apagar-ne un sense tocar codi). */
  function actius() {
    var estat = {};
    try {
      var files = Dades.llegeix('_Moduls');
      for (var i = 0; i < files.length; i++) estat[files[i].id_modul] = files[i].actiu;
    } catch (e) { /* abans de la primera instal·lació */ }

    return modulsRegistrats_().filter(function (m) {
      return estat[m.id] === undefined || String(estat[m.id]).toUpperCase() === 'SI';
    });
  }

  /** Targetes de la pantalla d'inici. Un mòdul que peta no tomba la pantalla. */
  function resumInici() {
    var out = [];
    var m = actius();
    for (var i = 0; i < m.length; i++) {
      if (typeof m[i].resumInici !== 'function') continue;
      try {
        var r = m[i].resumInici();
        if (r) { r.modul = m[i].id; out.push(r); }
      } catch (err) {
        Log.error('moduls.resumInici', 'Mòdul ' + m[i].id + ': ' + err.message);
        out.push({ modul: m[i].id, error: true, etiqueta: m[i].nom, valor: '—' });
      }
    }
    return out;
  }

  /**
   * QUÈ HA PASSAT ENTRE DUES DATES, segons cada mòdul.
   *
   * Existeix per a la revisió setmanal, i és el que fa que la revisió pugui
   * dir xifres de veritat en comptes de prosa. El mòdul que la genera no sap
   * que existeixen ni els hàbits ni el banc: pregunta al nucli i el nucli
   * pregunta a qui sàpiga contestar.
   *
   * És OPCIONAL. Un mòdul que no l'implementi senzillament no surt a la
   * revisió, i no passa res. Un mòdul escrit d'aquí a un any que sí que la
   * implementi hi surt sol, sense tocar la revisió.
   *
   * Retorna [{ modul, titol, linies: ['...'] }].
   */
  function resumPeriode(desde, fins) {
    var out = [];
    var m = actius();
    for (var i = 0; i < m.length; i++) {
      if (typeof m[i].resumPeriode !== 'function') continue;
      try {
        var r = m[i].resumPeriode(desde, fins);
        if (r && r.linies && r.linies.length) {
          out.push({ modul: m[i].id, titol: r.titol || m[i].nom, linies: r.linies });
        }
      } catch (err) {
        Log.error('moduls.resumPeriode', 'Mòdul ' + m[i].id + ': ' + err.message);
      }
    }
    return out;
  }

  /**
   * QUÈ HI HA D'AQUEST DIA, segons cada mòdul, per ensenyar-ho.
   *
   * És germana de `resumPeriode` però per a un sol dia i pensada per pintar-la,
   * no per resumir-la: cada mòdul torna les seves coses una per una, amb el
   * text que hi ha d'anar. La fa servir la pàgina del dia.
   *
   * És OPCIONAL. Un mòdul que no la implementi no hi surt. Un que es faci
   * d'aquí a un any i sí que la implementi, hi sortirà sol.
   *
   * Retorna [{ modul, titol, urgent, accio, coses: [{ text, menut, fet }] }].
   */
  function elDia(data) {
    var out = [];
    var m = actius();
    for (var i = 0; i < m.length; i++) {
      if (typeof m[i].elDia !== 'function') continue;
      try {
        var r = m[i].elDia(data);
        if (r && r.coses && r.coses.length) {
          out.push({
            modul: m[i].id,
            titol: r.titol || m[i].nom,
            urgent: !!r.urgent,
            accio: r.accio || m[i].id,
            coses: r.coses
          });
        }
      } catch (err) {
        Log.error('moduls.elDia', 'Mòdul ' + m[i].id + ': ' + err.message);
      }
    }
    return out;
  }

  var CAU_CONTEXT = 'ia_context';

  /**
   * Fitxa compacta per a la IA: cada mòdul aporta el seu resum en text curt.
   *
   * ES DESA A LA MEMÒRIA CAU, i és el que fa que la segona pregunta d'una
   * conversa sigui molt més ràpida que la primera. Muntar-la vol dir obrir el
   * full de cada mòdul: amb hàbits i nutrició ja costava més que pensar la
   * resposta, i cada mòdul nou hi suma.
   *
   * NO POT QUEDAR MAI ENDARRERIDA: si es desa qualsevol dada, la fitxa
   * s'esborra tot seguit (ho fa `Dades.invalida`). Val més tornar-la a muntar
   * que respondre amb el que hi havia fa un minut, perquè aquí la regla que
   * mana és que JEFE no digui res que no sigui cert ara mateix.
   */
  function contextIA(opcions) {
    var cau = null;
    try { cau = CacheService.getScriptCache(); } catch (e) { /* sense cau: seguim */ }

    if (cau) {
      var desat = cau.get(CAU_CONTEXT);
      if (desat !== null) return desat;
    }

    var trossos = [];
    var m = actius();
    for (var i = 0; i < m.length; i++) {
      if (typeof m[i].contextIA !== 'function') continue;
      try {
        var t = m[i].contextIA(opcions || {});
        if (t) trossos.push(String(t));
      } catch (err) {
        Log.error('moduls.contextIA', 'Mòdul ' + m[i].id + ': ' + err.message);
      }
    }

    var text = trossos.join('\n\n');
    // Cinc minuts com a molt. Encara que no s'escrigui res, el dia canvia i
    // «avui» ha de deixar de ser ahir.
    if (cau) { try { cau.put(CAU_CONTEXT, text, 300); } catch (e) {} }
    return text;
  }

  /**
   * Dona el control al mòdul que reclami una tornada externa.
   *
   * Un mòdul que necessiti una autorització de fora declara `reclamaTornada`
   * i `gestionaTornada`. El nucli no sap de quin servei es tracta ni què fa:
   * només pregunta i s'aparta. Retorna la pàgina a ensenyar, o null si aquesta
   * visita no és cap tornada i s'ha d'obrir l'app normal.
   */
  function gestionaTornada(parametres) {
    var p = parametres || {};
    var m = actius();
    for (var i = 0; i < m.length; i++) {
      if (typeof m[i].reclamaTornada !== 'function') continue;
      try {
        if (!m[i].reclamaTornada(p)) continue;
        return m[i].gestionaTornada(p);
      } catch (err) {
        Log.error('moduls.tornada', 'Mòdul ' + m[i].id + ': ' + err.message);
        return HtmlService.createHtmlOutput(
          '<div style="font:16px/1.6 system-ui;padding:40px">' +
          '<h2>No ha anat bé</h2><pre style="white-space:pre-wrap">' +
          String(err.message) + '</pre></div>');
      }
    }
    return null;
  }

  /** L'esborra. La crida `Dades.invalida` a cada escriptura. */
  function invalidaContext() {
    try { CacheService.getScriptCache().remove(CAU_CONTEXT); } catch (e) {}
  }

  /**
   * Aquest full pot canviar la fitxa que llegeix la IA?
   *
   * Sí si el declara un mòdul que aporta `contextIA`. Un full que no és de
   * ningú —els del nucli, com la configuració— compta que sí: davant del
   * dubte val més tornar a muntar la fitxa que respondre amb el que hi havia.
   */
  /* Els fulls del nucli que no expliquen res d'en Pol. S'hi escriu sovint
     —a `_Dispositius` cada cop que obre l'app— i cap d'ells canvia una sola
     línia de la fitxa. `_Config` no hi és a posta: allà hi ha els objectius,
     i canviar-ne un sí que canvia el que la IA ha de saber. */
  var FULLS_MUTS = { _Registre: 1, _RegistreArxiu: 1, _Dispositius: 1, _Moduls: 1 };

  function alimentaContext(nom) {
    if (FULLS_MUTS[nom]) return false;

    var m = actius();
    var deNingu = true;
    for (var i = 0; i < m.length; i++) {
      var fulls = m[i].fulls || [];
      for (var j = 0; j < fulls.length; j++) {
        if (fulls[j].nom !== nom) continue;
        deNingu = false;
        if (typeof m[i].contextIA === 'function') return true;
      }
    }
    return deNingu;
  }

  /** Eines que la IA pot cridar, aportades pels mòduls. */
  function einesIA() {
    var out = [];
    var m = actius();
    for (var i = 0; i < m.length; i++) {
      var e = m[i].einesIA || [];
      for (var j = 0; j < e.length; j++) {
        var eina = e[j];
        eina._modul = m[i].id;
        out.push(eina);
      }
    }
    return out;
  }

  /**
   * DRECERES: ordres que NO han de passar per la IA.
   *
   * «Ensenya'm la pàgina del dia» no és una pregunta, és un botó dit amb la
   * boca. Fer-la passar pel model vol dir muntar la fitxa, esperar el model,
   * que decideixi que ja té la resposta a la fitxa i te la reciti en comptes
   * d'obrir res: vint-i-cinc segons per acabar no obrint la pantalla.
   *
   * Un mòdul declara quines frases obren quina vista i el client hi va tot
   * sol, sense tocar el servidor. El nucli no sap què vol dir cap frase: només
   * les reparteix.
   */
  function dreceres() {
    var out = [];
    var m = actius();
    for (var i = 0; i < m.length; i++) {
      var d = m[i].dreceres || [];
      for (var j = 0; j < d.length; j++) {
        if (!d[j] || !d[j].vista || !(d[j].frases || []).length) continue;
        out.push({ vista: d[j].vista, frases: d[j].frases, params: d[j].params || null });
      }
    }
    return out;
  }

  /** Metadades per a la interfície (sense funcions, serialitzable). */
  function perAlClient() {
    return actius().map(function (m) {
      return {
        id: m.id,
        nom: m.nom || m.id,
        icona: m.icona || '',
        ordre: m.ordre,
        teVista: !!m.vista
      };
    });
  }

  return {
    tots: tots,
    perId: perId,
    actius: actius,
    sincronitzaFull: sincronitzaFull,
    resumInici: resumInici,
    resumPeriode: resumPeriode,
    elDia: elDia,
    contextIA: contextIA,
    invalidaContext: invalidaContext,
    alimentaContext: alimentaContext,
    gestionaTornada: gestionaTornada,
    einesIA: einesIA,
    dreceres: dreceres,
    perAlClient: perAlClient
  };
})();
