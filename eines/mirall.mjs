/**
 * JEFE — MIRALL: l'app de debò al navegador, amb un servidor fingit
 *
 *   node eines/mirall.mjs [vista]
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
 * LES DADES SÓN INVENTADES i la pàgina ho diu a dalt amb una barra vermella.
 * No s'assemblen a les d'en Pol a posta.
 */
import fs from 'fs';
import path from 'path';

const VISTA = process.argv[2] || 'habits';
const SORTIDA = process.env.MIRALL_SORTIDA ||
  path.join(process.env.TEMP || '.', 'jefe-mirall.html');

const font = fs.readFileSync('index.html', 'utf8');

// --------------------------------------------------------------- dades falses

const AVUI = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const menys = (n) => { const d = new Date(AVUI); d.setDate(d.getDate() - n); return iso(d); };

/* Nou hàbits: prou per reproduir el problema del qual es queixa —haver de fer
   scroll per arribar a l'últim— i amb noms de llargades diferents, que és on
   es trenquen les graelles. */
const HABITS = [
  { id: 'h1', nom: 'Estirar-se', tipus: 'si_no', objectiu: 1, valor: 1, ratxa: 12, pct30: 82 },
  { id: 'h2', nom: 'Rentar-se les dents', tipus: 'quantitat', objectiu: 2, valor: 1, ratxa: 3, pct30: 61 },
  { id: 'h3', nom: 'Sortir a caminar una estona llarga', tipus: 'si_no', objectiu: 1, valor: 0, ratxa: 0, pct30: 24 },
  { id: 'h4', nom: 'Llegir', tipus: 'si_no', objectiu: 1, valor: 1, ratxa: 41, pct30: 95 },
  { id: 'h5', nom: 'Aigua', tipus: 'quantitat', objectiu: 8, valor: 5, ratxa: 2, pct30: 47, unitat: 'gots' },
  { id: 'h6', nom: 'Cigarros', tipus: 'comptador', objectiu: 0, valor: 7, unitat: 'cigarros',
    esComptador: true, mitjana7: 5.3, canvi7: -1.2, total30: 148 },
  { id: 'h7', nom: 'Idiomes', tipus: 'si_no', objectiu: 1, valor: 0, ratxa: 0, pct30: 8 },
  { id: 'h8', nom: 'Diari de camp', tipus: 'si_no', objectiu: 1, valor: 1, ratxa: 7, pct30: 71 },
  { id: 'h9', nom: 'No mirar el mòbil al llit', tipus: 'si_no', objectiu: 1, valor: 0, ratxa: 0, pct30: 33 }
];

function dia(data) {
  return {
    data: data,
    esAvui: data === iso(AVUI),
    esFutur: false,
    diaSetmana: 3,
    habits: HABITS.map(h => ({
      id: h.id, nom: h.nom, tipus: h.tipus, objectiu: h.objectiu || 1,
      unitat: h.unitat || '', frequencia: 'diaria',
      valor: h.valor, registrat: h.valor !== null && h.valor !== undefined,
      complert: h.esComptador ? false : (h.valor || 0) >= (h.objectiu || 1),
      exigit: !h.esComptador, existiaEncara: true,
      ratxa: h.ratxa || 0, ratxaMax: (h.ratxa || 0) + 4, unitatRatxa: 'dies',
      pct30: h.esComptador ? null : h.pct30, pct7: h.esComptador ? null : h.pct30,
      esComptador: h.esComptador, mitjana7: h.mitjana7, canvi7: h.canvi7, total30: h.total30
    }))
  };
}

function mes() {
  const calendari = [];
  for (let i = 29; i >= 0; i--) calendari.push(menys(i));
  return {
    desde: calendari[0], fins: calendari[29], avui: iso(AVUI), calendari: calendari,
    habits: HABITS.filter(h => !h.esComptador).map((h, n) => ({
      id: h.id, nom: h.nom, pct30: h.pct30, ratxa: h.ratxa || 0, unitatRatxa: 'dies',
      celles: calendari.map((d, i) => {
        const fet = ((i * 7 + n * 3) % 10) < (h.pct30 / 10);
        return { data: d, estat: fet ? 'fet' : 'nofet', altitud: fet ? 1 : 0 };
      })
    }))
  };
}

function historic(id) {
  const h = HABITS.filter(x => x.id === id)[0] || HABITS[0];
  const calendari = [];
  for (let i = 34; i >= 0; i--) {
    const d = menys(i);
    const v = h.esComptador ? Math.max(0, Math.round(5 + 4 * Math.sin(i / 3)))
                            : (((i * 5) % 7) < 4 ? (h.objectiu || 1) : 0);
    calendari.push({ data: d, valor: v, registrat: true,
                     complert: h.esComptador ? false : v >= (h.objectiu || 1),
                     exigit: !h.esComptador, existia: true });
  }
  return {
    habit: { id: h.id, nom: h.nom, tipus: h.tipus, objectiu: h.objectiu || 1,
             unitat: h.unitat || '', frequencia: 'diaria', dies_setmana: '',
             objectiu_setmanal: '', creat_el: menys(120) },
    estadistiques: h.esComptador
      ? { esComptador: true, unitatRatxa: 'dies', ratxa: 0, ratxaMax: 0, pct30: null, pct7: null,
          avui: h.valor, mitjana7: h.mitjana7, mitjana7Previa: 6.5, canvi7: h.canvi7,
          total7: 37, total30: h.total30, maxim30: 11, diesRegistrats: 30 }
      : { unitatRatxa: 'dies', pct30: h.pct30, pct7: h.pct30, ratxa: h.ratxa || 0, ratxaMax: (h.ratxa || 0) + 4 },
    calendari: calendari
  };
}

// -------------------------------------------------------------- el servidor fals

const MOCK = `
<script>
(function () {
  var HABITS_INICI = ${JSON.stringify(dia(iso(AVUI)))};
  var MES = ${JSON.stringify(mes())};
  var HISTORICS = ${JSON.stringify(Object.fromEntries(HABITS.map(h => [h.id, historic(h.id)])))};
  var estatDia = JSON.parse(JSON.stringify(HABITS_INICI));

  function objectiuDe(id) {
    for (var i = 0; i < estatDia.habits.length; i++) {
      if (estatDia.habits[i].id === id) return estatDia.habits[i];
    }
    return null;
  }

  function respon(modul, accio, p) {
    p = p || {};
    if (modul === 'nucli' && accio === 'inici') {
      return { avui: '${iso(AVUI)}', moduls: [
        { id: 'habits', nom: 'Hàbits', icona: 'habits', ordre: 10, teVista: true },
        { id: 'tasques', nom: 'Tasques', icona: 'tasques', ordre: 15, teVista: true },
        { id: 'nutricio', nom: 'Nutrició', icona: 'nutricio', ordre: 20, teVista: true },
        { id: 'finances', nom: 'Finances', icona: 'finances', ordre: 30, teVista: true },
        { id: 'diari', nom: 'Diari', icona: 'diari', ordre: 40, teVista: true }
      ], targetes: [], ia: { disponible: false } };
    }
    if (modul === 'conversa') {
      if (accio === 'estat') return { ia: { disponible: false, motiu: 'mirall' }, veu: false, escolta: false,
                                      torns: 0, tokens: 0, id_conversa: 'c1' };
      if (accio === 'historial') return { missatges: [] };
      if (accio === 'nova') return { id_conversa: 'c2', missatges: [] };
    }
    if (modul === 'habits') {
      if (accio === 'dia') {
        var d = JSON.parse(JSON.stringify(estatDia));
        if (p.data && p.data !== d.data) {   // un altre dia: buit, com a la vida
          d.data = p.data; d.esAvui = false;
          d.habits.forEach(function (h) { h.valor = null; h.registrat = false; h.complert = false; });
        }
        return d;
      }
      if (accio === 'mes') return MES;
      if (accio === 'historic') return HISTORICS[p.id] || HISTORICS.h1;
      if (accio === 'marca') {
        var h = objectiuDe(p.id);
        if (h) {
          h.valor = p.valor === null || p.valor === undefined
            ? (h.complert ? 0 : h.objectiu) : p.valor;
          h.registrat = true;
          h.complert = h.esComptador ? false : h.valor >= h.objectiu;
        }
        return JSON.parse(JSON.stringify(estatDia));
      }
      if (accio === 'ordena') {
        var nou = [];
        (p.ids || []).forEach(function (id) {
          var h = objectiuDe(id);
          if (h) nou.push(h);
        });
        estatDia.habits.forEach(function (h) { if (nou.indexOf(h) === -1) nou.push(h); });
        estatDia.habits = nou;
        return JSON.parse(JSON.stringify(estatDia));
      }
      if (accio === 'crea' || accio === 'edita' || accio === 'arxiva') return { ok: true };
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
      return respon(modul, 'pantalla', pantalla);
    });
  };

  try {
    localStorage.setItem('jefe.servidor', JSON.stringify({ url: 'mirall', clau: 'mirall' }));
  } catch (e) {}
  window.__MIRALL_VISTA = '${VISTA}';
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
    if (window.__MIRALL_VISTA && App.vistes[window.__MIRALL_VISTA]) App.ves(window.__MIRALL_VISTA);
  }, 60);
</script>`;

const marca = '<script>\n  (function () {';
if (font.indexOf(marca) === -1) {
  console.error('No trobo el bloc d\'arrencada a index.html. Executa `npm run construeix`.');
  process.exit(1);
}
fs.writeFileSync(SORTIDA, font.replace(marca, MOCK + marca).replace('</body>', DESPRES + '</body>'));

console.log('\nMirall escrit a:\n  ' + SORTIDA + '\n\nVista: ' + VISTA + '\n');
