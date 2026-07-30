/**
 * Popu — NUCLI · Registre de mòduls
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

  /** Fitxa compacta per a la IA: cada mòdul aporta el seu resum en text curt. */
  function contextIA(opcions) {
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
    return trossos.join('\n\n');
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
    contextIA: contextIA,
    einesIA: einesIA,
    perAlClient: perAlClient
  };
})();
