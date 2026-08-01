/**
 * JEFE — MÒDUL · Diari i revisió
 *
 * Cap línia del nucli s'ha tocat per afegir aquest fitxer, tret d'una cosa que
 * el nucli havia de saber fer igualment: preguntar a cada mòdul què ha passat
 * entre dues dates (`Moduls.resumPeriode`). Aquest mòdul no sap que existeixen
 * ni els hàbits, ni el banc, ni la nutrició. Pregunta al nucli.
 *
 * QUÈ HI HA AQUÍ, I PER QUÈ SÓN LA MATEIXA COSA
 *
 *   El que ESCRIUS tu (l'entrada del dia) i el que t'ESCRIU ell (el resum de
 *   la nit i la revisió del diumenge) viuen a la mateixa pestanya i a la
 *   mateixa línia de temps. D'aquí a dos anys, quan vulguis saber com va anar
 *   aquell octubre, voldràs llegir les dues coses seguides i no anar saltant
 *   entre dues pantalles.
 *
 * DECISIONS QUE MANEN
 *
 *   1. UNA ENTRADA PER DIA, i sempre es pot reescriure. Un diari amb sis
 *      entrades soltes per dia no es rellegeix mai.
 *
 *   2. DES DE LA CONVERSA S'AFEGEIX, NO ES SUBSTITUEIX. Si li dius «apunta al
 *      diari que...» i avui ja hi havies escrit, va a continuació. Que una
 *      frase dita de passada t'esborri el que havies escrit al matí és
 *      exactament la mena de pèrdua que fa abandonar una eina.
 *
 *   3. EL RESUM DE LA NIT NO DEPÈN DE LA IA. Els fets es calculen aquí i
 *      sempre hi són. La IA, si hi és i respon, hi afegeix un comentari curt.
 *      Si està apagada o falla, el resum es fa igual. Un resum que algunes
 *      nits no arriba no és un resum: és una loteria.
 *
 *   4. NO S'INVENTA RES. El comentari es genera només amb les xifres que se li
 *      passen, i se li diu explícitament que no en pot afegir cap.
 *
 *   5. L'ÀNIM ÉS OPCIONAL I D'UN SOL TOC. Ni obligatori, ni de deu nivells.
 *      Serveix per rellegir, no per omplir un gràfic.
 */
function MODUL_DIARI() {
  return {
    id: 'diari',
    nom: 'Diari',
    icona: 'diari',
    ordre: 40,
    versioEsquema: 1,

    fulls: [
      {
        nom: 'Diari',
        columnes: [
          { nom: 'id',              tipus: 'text' },
          { nom: 'data',            tipus: 'data' },
          { nom: 'tipus',           tipus: 'text', valors: ['entrada', 'resum', 'revisio'] },
          { nom: 'text',            tipus: 'text' },
          { nom: 'anim',            tipus: 'num'  },
          { nom: 'origen',          tipus: 'text', valors: ['app', 'veu', 'conversa', 'auto'] },
          { nom: 'esborrat_el',     tipus: 'iso'  },
          { nom: 'creat_el',        tipus: 'iso'  },
          { nom: 'actualitzat_el',  tipus: 'iso'  }
        ]
      }
    ],

    accions: {
      pantalla:  function (p) { return Diari.pantalla(p); },
      escriu:    function (p) { return Diari.escriu(p.data, p.text, p.anim, p.origen); },
      treu:      function (p) { return Diari.treu(p.id); },
      // Per si vol el resum ara i no esperar a les deu del vespre.
      generaAra: function (p) {
        return p.setmanal ? Diari.generaSetmanal(p.data) : Diari.generaDiari(p.data);
      }
    },

    resumInici: function () {
      var e = Diari.entrada(Utils.avui());
      return {
        etiqueta: e ? 'Diari escrit' : 'Diari d\'avui',
        valor: e ? '✓' : '—',
        urgent: false,          // no escriure el diari no és cap urgència
        accio: 'diari'
      };
    },

    contextIA: function () {
      var avui = Utils.avui();
      var e = Diari.entrada(avui);
      var l = [];
      if (e) {
        l.push('Diari d\'avui (escrit per ell mateix): ' + Utils.talla(e.text, 400));
      } else {
        l.push('Diari: avui encara no ha escrit res.');
      }
      var ultima = Diari.ultimaRevisio();
      if (ultima) l.push('Última revisió setmanal, del ' + ultima.data + '.');
      return l.join('\n');
    },

    /* La revisió pregunta a tots els mòduls què ha passat aquesta setmana, i
       el diari s'hi inclou a si mateix com un més. */
    resumPeriode: function (desde, fins) {
      var dies = Diari.entrades(desde, fins);
      if (!dies.length) return null;

      var amb = dies.filter(function (d) { return d.anim; });
      var mitjana = amb.length
        ? Math.round((amb.reduce(function (s, d) { return s + Number(d.anim); }, 0) / amb.length) * 10) / 10
        : null;

      var linies = [dies.length + (dies.length === 1 ? ' dia escrit' : ' dies escrits')];
      if (mitjana !== null) linies.push('Ànim mitjà ' + mitjana + ' sobre 5');
      return { titol: 'Diari', linies: linies };
    },

    einesIA: [{
      nom: 'consulta_diari',
      descripcio: 'El que en Pol ha escrit al seu diari, i els resums i revisions que ' +
                  'JEFE li ha deixat. Serveix per respondre «què vaig fer el dia tal» o ' +
                  '«de què em queixava el mes passat».',
      esquema: {
        type: 'object',
        properties: {
          desde: { type: 'string', description: 'Data inicial AAAA-MM-DD' },
          fins:  { type: 'string', description: 'Data final AAAA-MM-DD' },
          conte: { type: 'string', description: 'Només les que continguin aquest text' }
        }
      },
      executa: function (a) { return Diari.consultaIA(a); }
    }, {
      nom: 'escriu_diari',
      descripcio: 'Afegeix text al diari d\'un dia. NO substitueix el que ja hi hagi ' +
                  'escrit: hi va a continuació. NO s\'executa directament: genera una ' +
                  'proposta que en Pol ha de confirmar amb un botó.',
      escriu: true,
      esquema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'El que s\'hi ha d\'apuntar, amb les seves paraules' },
          data: { type: 'string', description: 'Data AAAA-MM-DD. Si s\'omet, avui.' },
          anim: { type: 'number', description: 'Com ha anat el dia, d\'1 a 5. Només si ell ho diu.' }
        },
        required: ['text']
      },
      etiqueta: function (a) {
        return 'Apuntar al diari' + (a.data ? ' del ' + a.data : ' d\'avui') +
               ': «' + Utils.talla(String(a.text || '?'), 60) + '»';
      },
      executa: function (a) { return Diari.afegeixPerNom(a); }
    }],

    vista: 'vista_diari'
  };
}


var Diari = (function () {

  var TIPUS = ['entrada', 'resum', 'revisio'];

  function vives_(filtre) {
    return Dades.llegeix('Diari', function (f) {
      if (f.esborrat_el) return false;
      return !filtre || filtre(f);
    });
  }

  function ambDades_(f) {
    return {
      id: f.id,
      data: String(f.data),
      tipus: f.tipus || 'entrada',
      text: String(f.text || ''),
      anim: f.anim === '' || f.anim === null || f.anim === undefined ? null : Number(f.anim),
      origen: f.origen || 'app'
    };
  }

  // -------------------------------------------------------------- lectura

  /** L'entrada escrita per ell d'un dia, o null. */
  function entrada(data) {
    var f = vives_(function (x) {
      return String(x.data) === String(data) && (x.tipus || 'entrada') === 'entrada';
    })[0];
    return f ? ambDades_(f) : null;
  }

  function entrades(desde, fins) {
    return vives_(function (x) {
      var d = String(x.data);
      return (x.tipus || 'entrada') === 'entrada' && d >= desde && d <= fins;
    }).map(ambDades_).sort(function (a, b) { return a.data.localeCompare(b.data); });
  }

  function ultimaRevisio() {
    var r = vives_({ tipus: 'revisio' }).map(ambDades_)
      .sort(function (a, b) { return b.data.localeCompare(a.data); });
    return r.length ? r[0] : null;
  }

  /**
   * La pantalla: el dia que mires i la línia de temps cap enrere.
   *
   * Tot barrejat i per data, l'escrit per ell i el que li ha escrit JEFE. És
   * com es rellegeix un diari; separar-ho en dues llistes seria ordenar-ho per
   * a qui l'ha escrit, que és el que menys importa d'aquí a dos anys.
   */
  function pantalla(p) {
    p = p || {};
    var avui = Utils.avui();
    var data = Utils.esDataValida(p.data) ? p.data : avui;
    var quants = Math.max(5, Math.min(120, Number(p.quants) || 30));

    var totes = vives_().map(ambDades_)
      .sort(function (a, b) {
        if (a.data !== b.data) return b.data.localeCompare(a.data);
        // Dins d'un mateix dia: primer el que va escriure ell.
        return TIPUS.indexOf(a.tipus) - TIPUS.indexOf(b.tipus);
      });

    var seguit = ratxaEscrivint_(totes, avui);

    return {
      avui: avui,
      data: data,
      entrada: entrada(data),
      linia: totes.slice(0, quants),
      quantes: totes.filter(function (x) { return x.tipus === 'entrada'; }).length,
      ratxa: seguit,
      iaActiva: IA.disponible()
    };
  }

  /**
   * Dies seguits escrivint.
   * Avui no trenca la ratxa si encara no has escrit —és la mateixa regla que
   * als hàbits, i pel mateix motiu: si cada matí et sortís un zero deixaries
   * d'obrir-ho.
   */
  function ratxaEscrivint_(totes, avui) {
    var dies = {};
    totes.forEach(function (x) { if (x.tipus === 'entrada') dies[x.data] = true; });

    var d = avui;
    if (!dies[d]) d = Utils.sumaDies(d, -1);
    var n = 0, guarda = 0;
    while (dies[d] && guarda++ < 3650) { n++; d = Utils.sumaDies(d, -1); }
    return n;
  }

  // ------------------------------------------------------------ escriptura

  /** Una entrada per dia: si ja n'hi ha, es reescriu. */
  function escriu(data, text, anim, origen) {
    data = Utils.esDataValida(data) ? data : Utils.avui();
    if (data > Utils.avui()) throw new Error('No es pot escriure el diari d\'un dia que no ha arribat.');

    var t = String(text === undefined || text === null ? '' : text).trim();
    var a = Number(anim);
    var valorAnim = (a >= 1 && a <= 5) ? Math.round(a) : '';

    var existent = vives_(function (x) {
      return String(x.data) === data && (x.tipus || 'entrada') === 'entrada';
    })[0];

    /* Buidar-ho del tot és treure l'entrada, no desar una línia en blanc: una
       fila buida al mig de la línia de temps no diu res i fa nosa. */
    if (!t && !valorAnim) {
      if (existent) Dades.actualitza('Diari', existent.id, { esborrat_el: Utils.ara() });
      return { data: data, tret: true };
    }

    if (existent) {
      Dades.actualitza('Diari', existent.id, { text: t, anim: valorAnim });
    } else {
      Dades.insereix('Diari', {
        data: data, tipus: 'entrada', text: t, anim: valorAnim,
        origen: origen || 'app'
      }, 'dia');
    }
    return { data: data, desat: true, caracters: t.length };
  }

  function treu(id) {
    if (!id) throw new Error('Falta l\'identificador.');
    var r = Dades.actualitza('Diari', id, { esborrat_el: Utils.ara() });
    if (!r) throw new Error('Això no existeix.');
    return { tret: true };
  }

  /** Desa el que ha escrit JEFE. Un resum per dia i una revisió per setmana. */
  function desaGenerat_(data, tipus, text) {
    var existent = vives_(function (x) {
      return String(x.data) === String(data) && x.tipus === tipus;
    })[0];

    if (existent) return Dades.actualitza('Diari', existent.id, { text: text });
    return Dades.insereix('Diari', {
      data: data, tipus: tipus, text: text, anim: '', origen: 'auto'
    }, 'dia');
  }

  // ------------------------------------------------------- el resum de la nit

  /**
   * EL RESUM DE LES DEU DEL VESPRE.
   *
   * Els fets els posa el nucli preguntant a cada mòdul. La IA només hi afegeix
   * una frase, i si no hi és o falla, el resum surt igual amb els fets sols.
   * Aquesta és tota la diferència entre un resum i una loteria.
   */
  function generaDiari(data) {
    data = Utils.esDataValida(data) ? data : Utils.avui();

    var targetes = Moduls.resumInici().filter(function (t) { return t.modul !== 'diari'; });
    var fets = targetes.map(function (t) {
      return '· ' + t.etiqueta + ': ' + t.valor;
    });

    var pendents = targetes.filter(function (t) { return t.urgent; });
    var meva = entrada(data);

    var text = fets.join('\n');
    var comentari = comentari_(
      'Aquest és el tancament del dia ' + data + '.\n\n' +
      'XIFRES D\'AVUI:\n' + fets.join('\n') +
      (meva && meva.text ? '\n\nEL QUE HA ESCRIT ELL AVUI AL DIARI:\n' + Utils.talla(meva.text, 600) : ''),
      'Escriu-li DUES frases com a molt tancant-li el dia. Directe, sense floritures i ' +
      'sense felicitar-lo per res. Si hi ha alguna cosa pendent, digues-li quina i prou. ' +
      'NO t\'inventis cap xifra: només pots fer servir les que hi ha aquí.');

    if (comentari) text += '\n\n' + comentari;

    desaGenerat_(data, 'resum', text);

    // La notificació: el títol ja ha de servir sol des de la pantalla blocada.
    var titol = pendents.length
      ? pendents.map(function (t) { return t.etiqueta.toLowerCase() + ': ' + t.valor; }).join(' · ')
      : 'Dia tancat, res pendent';
    if (titol.length > 60) titol = pendents.length + ' coses pendents abans d\'anar a dormir';

    try {
      Notifica.envia(
        titol.charAt(0).toUpperCase() + titol.slice(1),
        comentari || fets.join(' · '),
        { url: 'diari', etiqueta: 'resum-diari' });
    } catch (err) {
      Log.error('diari.notifica', err);
    }

    Log.info('diari.resum', 'Resum del dia generat', { data: data, ambIA: !!comentari });
    return { data: data, text: text, ambIA: !!comentari };
  }

  // -------------------------------------------------- la revisió del diumenge

  /**
   * LA REVISIÓ DE LA SETMANA.
   *
   * Aquí sí que hi ha xifres de debò: cada mòdul diu què ha passat entre dues
   * dates. Aquest fitxer no sap quins mòduls hi ha ni què compten. El dia que
   * n'hi hagi un de nou, hi sortirà sol.
   */
  function generaSetmanal(fins) {
    fins = Utils.esDataValida(fins) ? fins : Utils.avui();
    var desde = Utils.sumaDies(fins, -6);

    var blocs = Moduls.resumPeriode(desde, fins);
    var meves = entrades(desde, fins);

    var parts = [];
    blocs.forEach(function (b) {
      parts.push(b.titol.toUpperCase() + '\n' + b.linies.map(function (l) { return '· ' + l; }).join('\n'));
    });

    var text = 'Setmana del ' + desde + ' al ' + fins + '\n\n' + parts.join('\n\n');

    var comentari = comentari_(
      'Revisió de la setmana del ' + desde + ' al ' + fins + '.\n\n' +
      parts.join('\n\n') +
      (meves.length
        ? '\n\nEL QUE HA ESCRIT ELL AQUESTS DIES:\n' +
          meves.map(function (m) { return m.data + ': ' + Utils.talla(m.text, 200); }).join('\n')
        : ''),
      'Escriu-li una revisió de QUATRE frases com a molt. Una del que ha anat bé, una del ' +
      'que ha anat malament, i una cosa concreta per a la setmana que ve. Parla-li de tu a ' +
      'tu, sense fer de coach ni felicitar-lo. NO t\'inventis cap xifra ni cap fet: només ' +
      'pots fer servir el que hi ha aquí escrit.');

    if (comentari) text += '\n\n' + comentari;

    desaGenerat_(fins, 'revisio', text);
    try {
      Notifica.envia('Revisió de la setmana',
        comentari || (blocs.length + ' apartats amb novetats. Obre-la per veure-la.'),
        { url: 'diari', etiqueta: 'revisio-setmanal' });
    } catch (err) {
      Log.error('diari.notifica', err);
    }

    Log.info('diari.revisio', 'Revisió setmanal generada', { desde: desde, fins: fins });
    return { desde: desde, fins: fins, text: text, ambIA: !!comentari };
  }

  /**
   * El comentari de la IA. Si no hi ha IA, o falla, torna null i qui el crida
   * segueix endavant sense ell. No es reintenta: és un afegit, no el contingut.
   */
  function comentari_(dades, instruccio) {
    if (!IA.disponible()) return null;
    try {
      var r = IA.genera({
        sistema: 'Ets JEFE, l\'assistent d\'en Pol. Parles català, en la seva varietat. ' +
                 'Ets breu i concret. ' + instruccio,
        missatges: [{ role: 'user', parts: [{ text: dades }] }],
        model: 'barat',
        maxTokens: 300,
        temperatura: 0.3
      });
      var t = String(r && r.text || '').trim();
      return t || null;
    } catch (err) {
      Log.avis('diari.ia', 'Sense comentari: ' + err.message);
      return null;
    }
  }

  // -------------------------------------------------------------------- IA

  function consultaIA(a) {
    a = a || {};
    var fins = Utils.esDataValida(a.fins) ? a.fins : Utils.avui();
    var desde = Utils.esDataValida(a.desde) ? a.desde : Utils.sumaDies(fins, -29);
    var conte = String(a.conte || '').toLowerCase().trim();

    var files = vives_(function (x) {
      var d = String(x.data);
      if (d < desde || d > fins) return false;
      if (conte && String(x.text).toLowerCase().indexOf(conte) === -1) return false;
      return true;
    }).map(ambDades_).sort(function (x, y) { return y.data.localeCompare(x.data); });

    return {
      files: files.length,                 // el zero explícit, perquè no se n'inventi cap
      rang: desde + '/' + fins,
      entrades: files.slice(0, 20).map(function (f) {
        return {
          data: f.data,
          qui: f.tipus === 'entrada' ? 'ell' : 'JEFE (' + f.tipus + ')',
          anim: f.anim,
          text: Utils.talla(f.text, 500)
        };
      })
    };
  }

  /** Ve d'una proposta confirmada. AFEGEIX; mai no substitueix. */
  function afegeixPerNom(a) {
    var data = Utils.esDataValida(a.data) ? a.data : Utils.avui();
    var nou = String(a.text || '').trim();
    if (!nou) throw new Error('No has dit què vols apuntar.');

    var actual = entrada(data);
    var text = actual && actual.text ? actual.text + '\n\n' + nou : nou;
    var anim = (a.anim >= 1 && a.anim <= 5) ? a.anim : (actual ? actual.anim : null);

    escriu(data, text, anim, 'conversa');
    return {
      apuntat: true, data: data,
      // Que digui si hi havia alguna cosa: així sap que no ha esborrat res.
      afegitA: actual && actual.text ? 'el que ja hi havia escrit' : 'una entrada nova'
    };
  }

  return {
    pantalla: pantalla,
    entrada: entrada,
    entrades: entrades,
    ultimaRevisio: ultimaRevisio,
    escriu: escriu,
    treu: treu,
    generaDiari: generaDiari,
    generaSetmanal: generaSetmanal,
    consultaIA: consultaIA,
    afegeixPerNom: afegeixPerNom
  };
})();


/**
 * Els triggers del nucli busquen `Resums`. Es deixa aquí el pont, i no al
 * nucli, perquè el dia que aquest mòdul no hi sigui el nucli ja se n'adona
 * sol —comprova si existeix abans de cridar-lo— i no peta.
 */
var Resums = {
  generaDiari: function (data) { return Diari.generaDiari(data); },
  generaSetmanal: function (data) { return Diari.generaSetmanal(data); }
};
