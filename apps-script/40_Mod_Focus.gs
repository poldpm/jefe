/**
 * JEFE — MÒDUL · Focus
 *
 * Cap línia del nucli s'ha tocat per afegir aquest fitxer.
 *
 * QUÈ ÉS: blocs de temps seguits, amb el rellotge corrent i res més a la
 * pantalla. Es pot arrencar sol —«posa'm vint-i-cinc minuts»— o des d'una
 * tasca, i llavors el temps queda apuntat a aquella tasca.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TRES DECISIONS QUE EL SEPAREN D'UN POMODORO QUALSEVOL
 * ─────────────────────────────────────────────────────────────────────────
 *
 *   1. EL BLOC CURT VA PRIMER, i és el de deu minuts. Vint-i-cinc minuts
 *      són una decisió: has de creure't que els tens. Deu no ho són, i el
 *      que costa és començar —no seguir—. Si en acabar continues, ja n'has
 *      fet vint-i-cinc igualment; si no, has fet deu que no hauries fet.
 *
 *   2. NO ES COMPTEN ELS FRACASSOS NI LES RATXES. Ni «portes 3 pomodoros
 *      avui» ni «has trencat la ratxa». Un bloc deixat a mitges s'apunta amb
 *      els minuts que hagi durat i s'acaba aquí: el que has fet, fet està, i
 *      el que no, no és cap deute. Vegeu la nota de procrastinació a
 *      `40_Mod_Tasques.gs`: fer sentir malament és el que alimenta el cicle.
 *
 *   3. EL REGISTRE NO ÉS PER A TU, ÉS PER CREUAR-LO. Els minuts de cada dia
 *      surten com a sèrie i es creuen sols amb la resta: si les setmanes que
 *      fas blocs dorms millor o arrossegues menys tasques, ho dirà Relacions
 *      sense que ningú ho hagi programat.
 *
 * ON CORRE EL RELLOTGE: al navegador. Apps Script no pot comptar segons
 * —no hi ha res corrent entre petició i petició— i tampoc caldria: el
 * rellotge del telèfon ja hi és. Aquí només s'apunta el bloc quan s'acaba.
 */
function MODUL_FOCUS() {
  return {
    id: 'focus',
    nom: 'Focus',
    icona: 'focus',
    ordre: 18,                 // entre tasques (15) i nutrició (20): és feina
    versioEsquema: 1,

    fulls: [
      {
        /* UNA FILA PER BLOC, acabat o no. Els que es deixen a mitges també
           s'apunten: vint minuts de feina són vint minuts de feina encara
           que el rellotge en digués vint-i-cinc. */
        nom: 'Focus',
        columnes: [
          { nom: 'id',              tipus: 'text' },
          { nom: 'data',            tipus: 'data' },
          { nom: 'inici',           tipus: 'iso'  },
          { nom: 'minuts',          tipus: 'num'  },
          { nom: 'previst',         tipus: 'num'  },
          { nom: 'complet',         tipus: 'text', valors: ['SI', 'NO'] },
          /* La tasca, si n'hi havia. L'identificador és de Google Tasks i el
             text es copia a posta: si algun dia esborres la tasca, el bloc
             ha de seguir dient en què el vas fer. */
          { nom: 'tasca',           tipus: 'text' },
          { nom: 'tasca_llista',    tipus: 'text' },
          { nom: 'tasca_text',      tipus: 'text' },
          { nom: 'creat_el',        tipus: 'iso'  },
          { nom: 'actualitzat_el',  tipus: 'iso'  }
        ]
      }
    ],

    accions: {
      pantalla: function (p) { return Focus.pantalla(p); },
      apunta:   function (p) { return Focus.apunta(p); }
    },

    /* A l'inici, els minuts d'avui i prou. Sense objectiu: un objectiu de
       minuts convertiria això en una altra cosa que es pot fallar. */
    resumInici: function () {
      var m = Focus.minutsDe(Utils.avui());
      return {
        etiqueta: 'Focus avui',
        valor: m ? (m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60 ? (m % 60) + ' m' : '') : m + ' min')
                 : '—',
        urgent: false,
        accio: 'focus'
      };
    },

    elDia: function (data) {
      var l = Focus.delDia(data);
      if (!l.length) return null;
      return {
        titol: 'Focus', accio: 'focus',
        coses: l.map(function (b) {
          return {
            text: b.tasca_text || 'Bloc de ' + b.minuts + ' min',
            menut: b.minuts + ' min' + (String(b.inici).slice(11, 16)
                     ? ' · ' + String(b.inici).slice(11, 16) : ''),
            fet: true
          };
        })
      };
    },

    resumPeriode: function (desde, fins) {
      var l = Focus.entre(desde, fins);
      if (!l.length) return null;
      var minuts = l.reduce(function (s, b) { return s + (Number(b.minuts) || 0); }, 0);
      var dies = {};
      l.forEach(function (b) { dies[b.data] = true; });
      return {
        titol: 'Focus',
        linies: [l.length + (l.length === 1 ? ' bloc' : ' blocs') +
                 ' en ' + Object.keys(dies).length + ' dies',
                 Math.round(minuts / 6) / 10 + ' h de feina seguida']
      };
    },

    /* Els minuts de cada dia. Un dia sense cap bloc SÍ que és un zero: no
       és una dada que t'hagis pogut oblidar d'apuntar, perquè l'apunta el
       rellotge sol. */
    seriesDiaries: function (desde, fins) { return Focus.seriesDiaries(desde, fins); },

    contextIA: function () {
      var m = Focus.minutsDe(Utils.avui());
      return 'Focus: ' + (m ? m + ' minuts de feina seguida avui.' : 'cap bloc avui.');
    },

    einesIA: [{
      nom: 'comenca_un_bloc',
      descripcio: 'Obre el rellotge de focus i el posa en marxa. Fes-la servir quan et ' +
                  'digui que es vol posar a treballar: «posa\'m vint-i-cinc minuts», ' +
                  '«comencem», «ajuda\'m a posar-m\'hi amb l\'informe».\n' +
                  'Si esmenta una tasca, passa-li el text: el temps quedarà apuntat a ' +
                  'aquella tasca. Si no en diu cap, arrenca igualment.\n' +
                  'Si no diu quants minuts, NO n\'hi posis: deixa el que hi hagi. El que ' +
                  'costa és començar, i preguntar-li quants minuts vol ja és una decisió ' +
                  'més abans de començar.',
      obre: 'focus',
      esquema: {
        type: 'object',
        properties: {
          minuts: { type: 'integer', description: 'Durada, si ell l\'ha dita. 10, 25 o 50.' },
          tasca:  { type: 'string', description: 'Part del text de la tasca, si n\'ha dit una' }
        }
      },
      executa: function (a) { return Focus.comencaPerNom(a); }
    }],

    vista: 'vista_focus'
  };
}


var Focus = (function () {

  /* Les tres durades, i l'ordre importa: la primera és la que surt triada.
     Vegeu la nota de dalt sobre per què deu i no vint-i-cinc. */
  var DURADES = [10, 25, 50];

  function files_() {
    try { return Dades.llegeix('Focus'); } catch (e) { return []; }
  }

  function delDia(data) {
    return files_().filter(function (f) { return String(f.data) === data; })
      .sort(function (a, b) { return String(a.inici) < String(b.inici) ? -1 : 1; });
  }

  function entre(desde, fins) {
    return files_().filter(function (f) {
      return String(f.data) >= desde && String(f.data) <= fins;
    });
  }

  function minutsDe(data) {
    return delDia(data).reduce(function (s, b) { return s + (Number(b.minuts) || 0); }, 0);
  }

  function seriesDiaries(desde, fins) {
    var per = {};
    entre(desde, fins).forEach(function (b) {
      per[String(b.data)] = (per[String(b.data)] || 0) + (Number(b.minuts) || 0);
    });
    var dies = {}, quants = 0;
    Utils.rangDates(desde, fins).forEach(function (d) {
      dies[d] = per[d] || 0;                 // cap bloc és zero, no és «no ho sé»
      if (per[d]) quants++;
    });
    if (quants < 8) return [];               // encara no hi ha prou dies amb res
    return [{
      id: 'minuts', nom: 'minuts de focus', unitat: 'min al dia',
      agrega: 'suma', familia: 'focus', minimDies: 5, millorAmunt: true, dies: dies
    }];
  }

  function pantalla(p) {
    p = p || {};
    var avui = Utils.avui();
    var out = {
      avui: avui,
      durades: DURADES,
      minutsAvui: minutsDe(avui),
      blocs: delDia(avui).map(function (b) {
        return {
          hora: String(b.inici).slice(11, 16),
          minuts: Number(b.minuts) || 0,
          complet: String(b.complet).toUpperCase() === 'SI',
          tasca: b.tasca_text || ''
        };
      })
    };

    /* Les tasques, per poder-ne triar una sense sortir d'aquí. Si Google
       Tasks no hi és, la pantalla funciona igual: un bloc sense tasca és un
       bloc igualment. */
    out.tasques = [];
    try {
      var t = Tasques.pantalla({});
      if (t.hiHaServei) {
        out.tasques = t.tasques.slice(0, 40).map(function (x) {
          return { id: x.id, llista: x.llista, text: x.text,
                   pas: x.primerPas || '', vencuda: !!x.vencuda };
        });
      }
    } catch (e) { /* sense tasques, el rellotge va igual */ }

    return out;
  }

  /**
   * Apuntar un bloc. El client diu quan ha començat i quants minuts ha
   * durat de debò, que no sempre és el que deia el rellotge.
   */
  function apunta(p) {
    p = p || {};
    var minuts = Math.max(1, Math.min(240, Math.round(Number(p.minuts) || 0)));
    if (!minuts) throw new Error('Un bloc de zero minuts no s\'apunta.');

    var inici = Utils.esDataValida(String(p.inici || '').slice(0, 10))
      ? p.inici : Utils.ara();

    var fila = Dades.insereix('Focus', {
      data: String(inici).slice(0, 10),
      inici: inici,
      minuts: minuts,
      previst: Math.round(Number(p.previst) || minuts),
      complet: p.complet ? 'SI' : 'NO',
      tasca: p.tasca || '',
      tasca_llista: p.tasca_llista || '',
      tasca_text: p.tasca_text || ''
    }, 'foc');

    /* Si el bloc anava per una tasca, aquella tasca queda marcada com a
       «hi estic»: has estat treballant-hi, i això és exactament el que
       aquella marca vol dir. */
    if (p.tasca && p.tasca_llista) {
      try { Tasques.edita({ id: p.tasca, llista: p.tasca_llista, fent: true }); }
      catch (e) { Log.avis('focus', 'no he pogut marcar la tasca', e.message); }
    }

    Memoria.oblida('focus');
    return { id: fila.id, minutsAvui: minutsDe(String(inici).slice(0, 10)) };
  }

  /** Ve de la conversa: «posa'm vint-i-cinc minuts amb l'informe». */
  function comencaPerNom(a) {
    a = a || {};
    var params = {};
    if (a.minuts) params.minuts = Math.max(1, Math.min(240, Math.round(a.minuts)));

    if (a.tasca) {
      try {
        var busca = Utils.aixafa(String(a.tasca));
        var t = Tasques.pantalla({});
        var trobada = (t.tasques || []).filter(function (x) {
          return Utils.aixafa(x.text).indexOf(busca) !== -1;
        })[0];
        if (trobada) {
          params.tasca = trobada.id;
          params.tasca_llista = trobada.llista;
          params.tasca_text = trobada.text;
        }
      } catch (e) { /* sense tasques, el bloc va sol */ }
    }

    return {
      _params: params,
      pantalla: 'oberta',
      minuts: params.minuts || DURADES[0],
      tasca: params.tasca_text || null
    };
  }

  return {
    pantalla: pantalla, apunta: apunta, comencaPerNom: comencaPerNom,
    delDia: delDia, entre: entre, minutsDe: minutsDe, seriesDiaries: seriesDiaries,
    DURADES: DURADES
  };
})();
