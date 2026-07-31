/**
 * JEFE — NUCLI · Utilitats
 *
 * REGLA DE DATES (val per a tot el sistema):
 *   - Les dates de calendari es desen com a TEXT 'AAAA-MM-DD'.
 *     Si es desessin com a tipus data de Sheets, la zona horària del
 *     dispositiu les podria desplaçar un dia i trencaria les ratxes.
 *   - Les marques de temps es desen en ISO 8601 amb zona: '2026-07-30T21:14:02+02:00'.
 */

var Utils = (function () {

  function tz() {
    try { return Config.zonaHoraria(); } catch (e) { return 'Europe/Madrid'; }
  }

  /** Identificador únic i llegible: 'tsk_ln4k2x_a7f' */
  function nouId(prefix) {
    var temps = Date.now().toString(36);
    var atzar = Math.random().toString(36).slice(2, 5);
    return (prefix || 'id') + '_' + temps + '_' + atzar;
  }

  /** Marca de temps actual en ISO 8601 amb zona. */
  function ara() {
    return Utilities.formatDate(new Date(), tz(), "yyyy-MM-dd'T'HH:mm:ssXXX");
  }

  /** Data d'avui com a text 'AAAA-MM-DD' en la zona horària configurada. */
  function avui() {
    return Utilities.formatDate(new Date(), tz(), 'yyyy-MM-dd');
  }

  /** Converteix un objecte Date a text 'AAAA-MM-DD'. */
  function aText(data) {
    return Utilities.formatDate(data, tz(), 'yyyy-MM-dd');
  }

  /** Converteix un text 'AAAA-MM-DD' a Date local (migdia, per evitar salts d'horari d'estiu). */
  function aData(text) {
    var t = String(text).trim();
    var p = t.split('-');
    if (p.length !== 3) return null;
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }

  function esDataValida(text) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(text)) && aData(text) !== null;
  }

  /** Suma (o resta) dies a una data en text. Retorna text. */
  function sumaDies(text, dies) {
    var d = aData(text);
    if (!d) return null;
    d.setDate(d.getDate() + dies);
    return aText(d);
  }

  /** Diferència en dies entre dues dates en text (b - a). */
  function diesEntre(a, b) {
    var da = aData(a), db = aData(b);
    if (!da || !db) return null;
    return Math.round((db.getTime() - da.getTime()) / 86400000);
  }

  /** Dia de la setmana: 1 = dilluns ... 7 = diumenge. */
  function diaSetmana(text) {
    var d = aData(text);
    if (!d) return null;
    var js = d.getDay();          // 0 = diumenge
    return js === 0 ? 7 : js;
  }

  /** Llista de dates entre dues (incloses), com a text. */
  function rangDates(desde, fins) {
    var out = [];
    var d = desde;
    var guarda = 0;
    while (d && d <= fins && guarda++ < 1000) {
      out.push(d);
      d = sumaDies(d, 1);
    }
    return out;
  }

  /** Setmana ISO d'una data: '2026-W31'. */
  function setmanaISO(text) {
    var d = aData(text);
    if (!d) return null;
    var t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var dia = (t.getDay() + 6) % 7;             // 0 = dilluns
    t.setDate(t.getDate() - dia + 3);           // dijous d'aquesta setmana
    var any = t.getFullYear();
    var primer = new Date(any, 0, 4);
    var dia2 = (primer.getDay() + 6) % 7;
    primer.setDate(primer.getDate() - dia2 + 3);
    var setmana = 1 + Math.round((t.getTime() - primer.getTime()) / (7 * 86400000));
    return any + '-W' + (setmana < 10 ? '0' + setmana : String(setmana));
  }

  /** Dilluns de la setmana d'una data donada. */
  function dillunsDe(text) {
    var dia = diaSetmana(text);
    return dia ? sumaDies(text, -(dia - 1)) : null;
  }

  /** Talla un text a n caràcters sense partir paraules pel mig. */
  function talla(text, n) {
    var t = String(text || '');
    if (t.length <= n) return t;
    var tallat = t.slice(0, n);
    var esp = tallat.lastIndexOf(' ');
    return (esp > n * 0.6 ? tallat.slice(0, esp) : tallat) + '…';
  }

  /** JSON tolerant: mai llança. */
  function json(obj) {
    try { return JSON.stringify(obj); } catch (e) { return '' + obj; }
  }

  function desJson(text, perDefecte) {
    try { return JSON.parse(text); } catch (e) { return perDefecte === undefined ? null : perDefecte; }
  }

  return {
    nouId: nouId,
    ara: ara,
    avui: avui,
    aText: aText,
    aData: aData,
    esDataValida: esDataValida,
    sumaDies: sumaDies,
    diesEntre: diesEntre,
    diaSetmana: diaSetmana,
    rangDates: rangDates,
    setmanaISO: setmanaISO,
    dillunsDe: dillunsDe,
    talla: talla,
    json: json,
    desJson: desJson
  };
})();
