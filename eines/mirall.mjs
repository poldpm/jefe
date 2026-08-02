/**
 * JEFE — MIRALL: l'app de debò al navegador, amb un servidor fingit
 *
 *   npm run mirall [vista]        habits · nutricio · finances · tasques · diari · conversa · inici
 *
 * Agafa el `index.html` construït —el mateix codi que et serveix Apps Script—
 * i, just abans de l'arrencada, canvia `crida()` i `escriu()` per un servidor
 * de mentida amb dades inventades. Així es pot obrir qualsevol pantalla i
 * tocar-la sense clau, sense connexió i sense tocar ni una dada teva.
 *
 * PER QUÈ EXISTEIX
 *   `npm run comprova` i `npm run prova` no veuen res del que es VEU. Scroll
 *   horitzontal al mòbil, un text que no es llegeix sobre el seu fons, un
 *   botó que queda fora de pantalla: tot això passa totes les comprovacions i
 *   es veu en tres segons mirant-ho. Aquesta eina és per mirar-ho.
 *
 * LES DADES SÓN INVENTADES i la pàgina ho diu a baix amb una barra vermella.
 * No s'assemblen a les d'en Pol a posta. Viuen a `mirall-dades.mjs`.
 *
 * Genera també `amplades.html`, que ensenya la mateixa pantalla a l'amplada
 * d'un mòbil i a la d'un escriptori alhora: és on surten els desbordaments,
 * que a la finestra del navegador tal com està no es veuen mai.
 */
import fs from 'fs';
import path from 'path';
import { dades } from './mirall-dades.mjs';

const VISTA = process.argv[2] || 'habits';
const CARPETA = process.env.MIRALL_CARPETA || '.mirall';

const ARA = new Date();
/* La data LOCAL, no la de Greenwich. Amb `toISOString` a dos quarts d'una
   de la nit a Madrid encara surt el dia d'abans, i llavors el mirall et
   marca «ahir» al dia d'avui i et fa perseguir un error que no hi és. */
const iso = (d) => [d.getFullYear(), ('0' + (d.getMonth() + 1)).slice(-2),
                    ('0' + d.getDate()).slice(-2)].join('-');
const AVUI = iso(ARA);
const menys = (n) => { const d = new Date(ARA); d.setDate(d.getDate() - n); return iso(d); };

const D = dades(AVUI, menys);
const j = (v) => JSON.stringify(v);

const font = fs.readFileSync('index.html', 'utf8');

// -------------------------------------------------------------- el servidor fals

const MOCK = `
<script>
(function () {
  var AVUI = ${j(AVUI)};
  var HABITS_DIA  = ${j(D.habitsDia(AVUI))};
  var HABITS_MES  = ${j(D.habitsMes())};
  var HISTORICS   = ${j(Object.fromEntries(D.HABITS.map(h => [h.id, D.habitsHistoric(h.id)])))};
  var NUTRI       = { dia: ${j(D.nutriPantalla({ periode: 'dia' }))},
                      setmana: ${j(D.nutriPantalla({ periode: 'setmana' }))},
                      mes: ${j(D.nutriPantalla({ periode: 'mes' }))} };
  var FIN         = { mes: ${j(D.finPantalla({ periode: 'mes' }))},
                      mesos: ${j(D.finPantalla({ periode: 'mesos' }))},
                      estad: ${j(D.finPantalla({ periode: 'estad' }))},
                      revisar: ${j(D.finPantalla({ periode: 'revisar' }))},
                      recurrents: ${j(D.finPantalla({ periode: 'recurrents' }))},
                      patrimoni: ${j(D.finPantalla({ periode: 'patrimoni' }))} };
  var TASQUES     = ${j(D.tasquesPantalla())};
  var DIARI       = ${j(D.diariPantalla({}))};
  var CONV_ESTAT  = ${j(D.conversaEstat())};
  var CONV_HIST   = ${j(D.conversaHistorial())};
  var INICI       = ${j(D.nucliInici())};
  var DIA_BASE    = ${j(D.elDia({}))};
  var DIA_PAGINA  = function (p) {
    var d = copia(DIA_BASE);
    if (p && p.data && p.data !== AVUI) { d.data = p.data; d.esAvui = false; }
    return d;
  };
  var CAL         = { calendaris: ${j(D.CALENDARIS)} , fets: [], trets: [] };
  var CAL_MESOS   = ${j(Object.fromEntries(
       [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].map(n => {
         const d = new Date(Number(AVUI.slice(0,4)), Number(AVUI.slice(5,7)) - 1 + n, 1);
         const m = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
         return [m, D.calendariPantalla({ mes: m })];
       })))};

  var estatDia = JSON.parse(JSON.stringify(HABITS_DIA));
  var nSeq = 100;

  function recalculaNutri() {
    var d = NUTRI.dia.dades;
    d.apats.forEach(function (a) {
      a.kcal = a.items.reduce(function (s, i) { return s + i.kcal; }, 0);
      a.proteina = a.items.reduce(function (s, i) { return s + i.prot; }, 0);
    });
    d.totals = {
      ingerides: d.apats.reduce(function (s, a) { return s + a.kcal; }, 0),
      proteina: d.apats.reduce(function (s, a) { return s + a.proteina; }, 0)
    };
    d.net = d.teCremades ? d.cremades - d.totals.ingerides : null;
    d.verdicte = d.teCremades
      ? { estat: d.net >= d.objectius.deficit ? 'deficit_assolit' : (d.net > 0 ? 'deficit' : 'superavit'),
          text: (d.net >= 0 ? 'Dèficit de ' : 'Superàvit de ') + Math.round(Math.abs(d.net)) + ' kcal' +
                (d.net >= d.objectius.deficit ? ' — objectiu assolit' : '') }
      : { estat: 'sense_dades', text: 'Introdueix les calories cremades per tancar el dia.' };
  }
  var copia = function (o) { return JSON.parse(JSON.stringify(o)); };

  function habitPerId(id) {
    for (var i = 0; i < estatDia.habits.length; i++) {
      if (estatDia.habits[i].id === id) return estatDia.habits[i];
    }
    return null;
  }

  function respon(modul, accio, p) {
    p = p || {};

    if (modul === 'nucli') {
      if (accio === 'inici') return copia(INICI);
      if (accio === 'estat') return { versio: 'mirall', configurat: true, moduls: INICI.moduls,
                                      problemesEsquema: [], triggers: [], ia: { disponible: false } };
      if (accio === 'notificacions') return { disponible: false, motiu: 'mirall', dispositius: 0 };
      if (accio === 'ping') return { ara: AVUI, versio: 'mirall' };
    }

    if (modul === 'conversa') {
      if (accio === 'estat') {
        var ce = copia(CONV_ESTAT);
        if (p.ambHistorial) ce.historial = copia(CONV_HIST);
        return ce;
      }
      if (accio === 'historial') return copia(CONV_HIST);
      if (accio === 'nova') return { id_conversa: 'cnv_nou', missatges: [] };
      if (accio === 'elDia') return DIA_PAGINA(p);
      if (accio === 'envia') throw new Error('El mirall no pensa: aquí no hi ha capa d\\'IA.');
    }

    if (modul === 'habits') {
      if (accio === 'dia') {
        var d = copia(estatDia);
        if (p.data && p.data !== d.data) {          // un altre dia: buit, com a la vida
          d.data = p.data; d.esAvui = false;
          d.habits.forEach(function (h) { h.valor = null; h.registrat = false; h.complert = false; });
        }
        return d;
      }
      if (accio === 'mes') return HABITS_MES;
      if (accio === 'historic') return HISTORICS[p.id] || HISTORICS.h1;
      if (accio === 'marca') {
        var h = habitPerId(p.id);
        if (h) {
          h.valor = (p.valor === null || p.valor === undefined)
            ? (h.complert ? 0 : h.objectiu) : p.valor;
          h.registrat = true;
          h.complert = h.esComptador ? false : h.valor >= h.objectiu;
        }
        return copia(estatDia);
      }
      if (accio === 'ordena') {
        var nou = [];
        (p.ids || []).forEach(function (id) { var x = habitPerId(id); if (x) nou.push(x); });
        estatDia.habits.forEach(function (x) { if (nou.indexOf(x) === -1) nou.push(x); });
        estatDia.habits = nou;
        return copia(estatDia);
      }
      if (accio === 'crea' || accio === 'edita' || accio === 'arxiva' || accio === 'reactiva') {
        return { ok: true };
      }
    }

    if (modul === 'nutricio') {
      if (accio === 'pantalla') {
        var n = copia(NUTRI[p.periode || 'dia'] || NUTRI.dia);
        // Un altre dia és un dia en blanc, com a la vida.
        if ((p.periode || 'dia') === 'dia' && p.data && p.data !== AVUI) {
          n.dades.data = p.data;
          n.dades.apats.forEach(function (a) { a.items = []; a.kcal = 0; a.proteina = 0; });
          n.dades.totals = { ingerides: 0, proteina: 0 };
          n.dades.cremades = 0; n.dades.activitat = 0;
          n.dades.teCremades = false; n.dades.teActivitat = false; n.dades.net = null;
          n.dades.verdicte = { estat: 'sense_dades',
                               text: 'Introdueix les calories cremades per tancar el dia.' };
        }
        return n;
      }
      if (accio === 'aliments') return copia(NUTRI.dia.aliments);
      if (accio === 'ajustos') return copia(NUTRI.dia.ajustos);
      /* Escriure de veritat: si el mirall contesta sempre el mateix, un
         formulari que desa sembla que no faci res i no es pot provar el cicle. */
      if (accio === 'afegeix') {
        var d = NUTRI.dia.dades;
        var ap = d.apats.filter(function (a) { return a.clau === p.apat; })[0];
        if (ap) {
          var g = Number(p.grams) || 0;
          ap.items.push({ id: 'i' + (++nSeq), nom: p.nom, grams: g,
                          kcal100: Number(p.kcal100) || 0, prot100: Number(p.prot100) || 0,
                          kcal: g * (Number(p.kcal100) || 0) / 100,
                          prot: g * (Number(p.prot100) || 0) / 100 });
          recalculaNutri();
        }
        return { ok: true };
      }
      if (accio === 'treu') {
        NUTRI.dia.dades.apats.forEach(function (a) {
          a.items = a.items.filter(function (i) { return i.id !== p.id; });
        });
        recalculaNutri();
        return { ok: true };
      }
      if (accio === 'activitat') {
        NUTRI.dia.dades.cremades = NUTRI.dia.dades.activitat = Number(p.kcal) || 0;
        NUTRI.dia.dades.teCremades = (Number(p.kcal) || 0) > 0;
        recalculaNutri();
        return { ok: true };
      }
      if (accio === 'desaAliment' || accio === 'treuAliment' || accio === 'desaAjustos') {
        return { ok: true };
      }
      if (accio === 'importaFitFat') return { simulacio: true, dies: 0, ingestes: 0, avisos: [] };
    }

    if (modul === 'finances') {
      if (accio === 'pantalla') return copia(FIN[p.periode || 'mes'] || FIN.mes);
      if (accio === 'categories') return copia(FIN.mes.categories);
      if (accio === 'suggeriments') return copia(FIN.mes.suggeriments);
      if (accio === 'recurrents') return copia(FIN.recurrents.dades.llista);
      if (accio === 'patrimoni') return copia(FIN.patrimoni.dades);
      if (accio === 'perRevisar') return copia(FIN.revisar.dades);
      if (accio === 'estatBanc') return { connectat: false, motiu: 'mirall' };
      return { ok: true, tocats: 1 };
    }

    if (modul === 'tasques') {
      if (accio === 'pantalla') return copia(TASQUES);
      return copia(TASQUES);
    }

    if (modul === 'calendari') {
      if (accio === 'calendaris') return copia(CAL.calendaris);
      if (accio === 'sincronitza') return { nous: 0, actualitzats: CAL.calendaris.length,
                                            total: CAL.calendaris.length };
      if (accio === 'elsMeus') {
        var encesos = [];
        CAL.calendaris.forEach(function (c) {
          if (c.principal || /escola/i.test(c.nom)) {   // «els meus», al mirall
            if (!c.mostra) encesos.push(c.nom);
            c.mostra = true;
          }
        });
        return { encesos: encesos };
      }
      if (accio === 'mostra') {
        CAL.calendaris.forEach(function (c) { if (c.id === p.id) c.mostra = !!p.mostra; });
        return { id: p.id, mostra: !!p.mostra };
      }
      /* Apuntar, canviar i treure sí que toquen les dades del mirall. Si no,
         desar una cita ensenyava «Apuntat» i la pantalla quedava igual, i
         llavors no es pot saber si el camí d'anada i tornada funciona. */
      if (accio === 'crea') {
        var nou = {
          id: 'ev_mirall_' + (CAL.fets.length + 1),
          calendari: p.calendari || CAL.calendaris[0].id,
          calendariNom: (CAL.calendaris.filter(function (c) { return c.id === p.calendari; })[0] ||
                         CAL.calendaris[0]).nom,
          color: '', titol: p.titol || '(sense títol)', lloc: p.lloc || '', nota: p.nota || '',
          data: p.data, dataFi: p.data, totElDia: !!p.totdia,
          hora: p.totdia ? '' : (p.hora || '09:00'),
          horaFi: p.totdia ? '' : (p.hora || '09:00'),
          passat: false, minuts: p.totdia ? 0 : Number(p.durada || 60)
        };
        CAL.fets.push(nou);
        return { id: nou.id };
      }
      if (accio === 'edita') {
        CAL.fets.forEach(function (e) {
          if (e.id !== p.id) return;
          if (p.titol !== undefined) e.titol = p.titol;
          if (p.data !== undefined) { e.data = p.data; e.dataFi = p.data; }
          if (p.lloc !== undefined) e.lloc = p.lloc;
        });
        return { id: p.id };
      }
      if (accio === 'treu') {
        CAL.fets = CAL.fets.filter(function (e) { return e.id !== p.id; });
        CAL.trets.push(p.id);
        return { id: p.id };
      }

      if (accio === 'pantalla') {
        var quin = p.mes || AVUI.slice(0, 7);

        var amagats = {};
        CAL.calendaris.forEach(function (c) { if (!c.mostra) amagats[c.id] = true; });

        function munta(m) {
          var base = CAL_MESOS[m];
          var d;
          if (base) {
            d = copia(base).dades;
          } else {
            // Fora del que el mirall té preparat: mes buit, per veure com queda.
            d = copia(CAL_MESOS[AVUI.slice(0, 7)]).dades;
            d.mes = m; d.tots = []; d.diaTriat = m + '-01';
          }
          d.tots = d.tots
            .filter(function (e) { return !amagats[e.calendari] && CAL.trets.indexOf(e.id) === -1; })
            .concat(CAL.fets.filter(function (e) {
              return !amagats[e.calendari] && e.data.slice(0, 7) === m;
            }));
          if (m === quin && p.data) d.diaTriat = p.data;

          var perDia = {};
          d.tots.forEach(function (e) { (perDia[e.data] = perDia[e.data] || []).push(e); });
          d.esdeveniments = perDia[d.diaTriat] || [];
          d.quants = d.tots.filter(function (e) { return e.data.slice(0, 7) === m; }).length;
          d.caselles.forEach(function (c) {
            var seus = perDia[c.data] || [];
            c.quants = seus.length;
            c.mostra = seus.slice(0, 3).map(function (e) {
              return { color: e.color, totElDia: e.totElDia, titol: e.titol, hora: e.hora };
            });
          });
          return d;
        }

        var mesos = {};
        [-2, -1, 0, 1, 2].forEach(function (n) {
          var x = new Date(Number(quin.slice(0, 4)), Number(quin.slice(5, 7)) - 1 + n, 1);
          var k = x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2);
          mesos[k] = munta(k);
        });

        return { dades: mesos[quin], mesos: mesos, calendaris: copia(CAL.calendaris) };
      }
      return { ok: true };
    }

    if (modul === 'diari') {
      if (accio === 'pantalla') {
        var dd = copia(DIARI);
        if (p.data && p.data !== AVUI) { dd.data = p.data; dd.entrada = null; }
        return dd;
      }
      return copia(DIARI);
    }

    throw new Error('El mirall no sap respondre ' + modul + '.' + accio);
  }

  /* Mig segon de retard, que és el que costa de debò. Sense això la pantalla
     es veuria instantània i no es notaria cap dels problemes que hi ha
     justament mentre s'espera. */
  window.crida = function (modul, accio, params) {
    return new Promise(function (ok, mal) {
      setTimeout(function () {
        try { ok(respon(modul, accio, params)); } catch (e) { mal(e); }
      }, 500);
    });
  };
  window.escriu = function (modul, accio, params, pantalla) {
    return window.crida(modul, accio, params).then(function () {
      return respon(modul, 'pantalla', pantalla || {});
    });
  };

  try {
    localStorage.setItem('jefe.servidor', JSON.stringify({ url: 'mirall', clau: 'mirall' }));
    localStorage.removeItem('jefe.cua');
  } catch (e) {}
  window.__MIRALL_VISTA = ${j(VISTA)};
})();
</script>
<div style="position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#c8332b;color:#fff;
            font:600 11px/1.6 system-ui;letter-spacing:.08em;text-align:center;padding:3px">
  MIRALL · DADES INVENTADES · NO SÓN LES TEVES
</div>
`;

/* Va DESPRÉS de l'arrencada: el hash no serveix perquè l'arrencada se'l menja. */
const DESPRES = `
<script>
  setTimeout(function () {
    var v = new URLSearchParams(location.search).get('vista') || window.__MIRALL_VISTA;
    if (v && App.vistes[v]) App.ves(v);
  }, 60);
</script>`;

const marca = '<script>\n  (function () {';
if (font.indexOf(marca) === -1) {
  console.error('No trobo el bloc d\'arrencada a index.html. Executa `npm run construeix`.');
  process.exit(1);
}

if (!fs.existsSync(CARPETA)) fs.mkdirSync(CARPETA, { recursive: true });
fs.writeFileSync(path.join(CARPETA, 'index.html'),
  font.replace(marca, MOCK + marca).replace('</body>', DESPRES + '</body>'));

/* Les dues amplades alhora. Els desbordaments no es veuen mai a la finestra
   tal com la tens: es veuen quan poses la pantalla a 375 de debò. */
const VISTES = ['conversa', 'inici', 'habits', 'tasques', 'nutricio', 'finances', 'diari'];
fs.writeFileSync(path.join(CARPETA, 'amplades.html'), `<!doctype html>
<meta charset="utf-8"><title>JEFE · amplades</title>
<style>
  html,body{margin:0;background:#2b2f31;font:13px system-ui;color:#cfd6d8}
  .barra{padding:8px 10px;display:flex;gap:10px;flex-wrap:wrap;align-items:center}
  .barra a{color:#8fd0ea;text-decoration:none;padding:3px 8px;border:1px solid #56666d}
  .barra a.ara{background:#4e9bc0;color:#08131a;border-color:#4e9bc0}
  .fila{display:flex;gap:14px;padding:0 10px 14px;align-items:flex-start}
  figure{margin:0} figcaption{padding:4px 0;color:#93a2a8}
  iframe{border:1px solid #56666d;background:#0e1214;display:block}
</style>
<div class="barra"><b>MIRALL</b> · dades inventades ·
  ${VISTES.map(v => `<a href="amplades.html?v=${v}"${v === VISTA ? ' class="ara"' : ''}>${v}</a>`).join('')}
</div>
<div class="fila">
  <figure><figcaption>375 — mòbil</figcaption>
    <iframe id="m" width="375" height="720"></iframe></figure>
  <figure><figcaption>1180 — escriptori</figcaption>
    <iframe id="d" width="1180" height="720"></iframe></figure>
</div>
<script>
  var v = new URLSearchParams(location.search).get('v') || ${j(VISTA)};
  document.getElementById('m').src = 'index.html?vista=' + v;
  document.getElementById('d').src = 'index.html?vista=' + v;
</script>`);

console.log('\nMirall a `' + CARPETA + '`  ·  vista d\'arrencada: ' + VISTA);
console.log('  index.html      una sola pantalla');
console.log('  amplades.html   mòbil i escriptori alhora, amb totes les vistes a dalt\n');
