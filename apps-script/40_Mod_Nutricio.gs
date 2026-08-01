/**
 * JEFE — MÒDUL · Nutrició
 *
 * Ve de FitFat, que vivia sola amb les dades a `localStorage` d'un sol mòbil.
 * Cap línia del nucli s'ha tocat per afegir aquest fitxer.
 *
 * QUÈ CANVIA I QUÈ NO
 *   Els càlculs són EXACTAMENT els de FitFat. Si el número que surt aquí no
 *   coincideix amb el de l'app d'abans, és un error, no una millora.
 *   El que canvia és on viuen les dades: al full de càlcul, no al telèfon.
 *
 * DECISIONS DE CÀLCUL (les de FitFat, escrites perquè no es perdin)
 *
 *   1. Les cremades són EL QUE ESCRIU EN POL, i prou. FitFat hi sumava un
 *      metabolisme basal calculat amb Mifflin–St Jeor, però ell ja entra el
 *      total del dia que li dona el rellotge. Sumar-hi un basal el comptaria
 *      dues vegades. El càlcul s'ha tret, no amagat.
 *
 *   2. El dia no es tanca fins que hi ha cremades introduïdes. Sense
 *      cremades no hi ha balanç: un dia en blanc no és un dia de dèficit zero.
 *
 *   3. Balanç = cremades − ingerides. POSITIU vol dir dèficit.
 *
 *   4. Cada ingesta desa les kcal i proteïnes per 100 g del moment. Si demà
 *      corregeixes la fitxa d'un aliment, l'històric no es mou. Ha de ser així:
 *      el que vas menjar dimarts no canvia perquè avui rectifiquis una etiqueta.
 *
 *   5. RES S'ESBORRA. Treure un aliment del dia li posa data a `esborrat_el`
 *      i deixa de comptar. La fila es queda.
 */
function MODUL_NUTRICIO() {
  return {
    id: 'nutricio',
    nom: 'Nutrició',
    icona: 'nutricio',
    ordre: 20,
    versioEsquema: 1,

    fulls: [
      {
        nom: 'Aliments',
        columnes: [
          { nom: 'id',              tipus: 'text' },
          { nom: 'nom',             tipus: 'text' },
          { nom: 'kcal100',         tipus: 'num'  },
          { nom: 'prot100',         tipus: 'num'  },
          { nom: 'esborrat_el',     tipus: 'iso'  },
          { nom: 'creat_el',        tipus: 'iso'  },
          { nom: 'actualitzat_el',  tipus: 'iso'  }
        ]
      },
      {
        nom: 'Ingestes',
        columnes: [
          { nom: 'id',              tipus: 'text' },
          { nom: 'data',            tipus: 'data' },
          { nom: 'apat',            tipus: 'text', valors: ['dinar', 'berenar', 'sopar'] },
          { nom: 'nom',             tipus: 'text' },
          { nom: 'grams',           tipus: 'num'  },
          { nom: 'kcal100',         tipus: 'num'  },
          { nom: 'prot100',         tipus: 'num'  },
          { nom: 'origen',          tipus: 'text', valors: ['app', 'fitfat', 'conversa'] },
          { nom: 'esborrat_el',     tipus: 'iso'  },
          { nom: 'creat_el',        tipus: 'iso'  },
          { nom: 'actualitzat_el',  tipus: 'iso'  }
        ]
      },
      {
        nom: 'NutricioDies',
        columnes: [
          { nom: 'id',              tipus: 'text' },
          { nom: 'data',            tipus: 'data' },
          { nom: 'activitat',       tipus: 'num'  },
          { nom: 'origen',          tipus: 'text', valors: ['app', 'fitfat', 'conversa'] },
          { nom: 'creat_el',        tipus: 'iso'  },
          { nom: 'actualitzat_el',  tipus: 'iso'  }
        ]
      }
    ],

    accions: {
      dia:            function (p) { return Nutricio.dia(p.data || Utils.avui()); },
      setmana:        function (p) { return Nutricio.periode(p.data || Utils.avui(), 'setmana'); },
      mes:            function (p) { return Nutricio.periode(p.data || Utils.avui(), 'mes'); },
      afegeix:        function (p) { return Nutricio.afegeix(p); },
      treu:           function (p) { return Nutricio.treu(p.id); },
      activitat:      function (p) { return Nutricio.desaActivitat(p.data, p.kcal); },
      aliments:       function ()  { return Nutricio.aliments(); },
      desaAliment:    function (p) { return Nutricio.desaAliment(p); },
      treuAliment:    function (p) { return Nutricio.treuAliment(p.id); },
      ajustos:        function ()  { return Nutricio.ajustos(); },
      desaAjustos:    function (p) { return Nutricio.desaAjustos(p); },
      importaFitFat:  function (p) { return Nutricio.importaFitFat(p.dades, p.simulacio); }
    },

    resumInici: function () {
      var d = Nutricio.dia(Utils.avui());
      var falta = d.objectius.proteina > 0 ? Math.max(0, d.objectius.proteina - d.totals.proteina) : 0;
      return {
        etiqueta: falta > 0 ? 'Proteïna pendent' : 'Proteïna al dia',
        valor: falta > 0 ? Math.round(falta) + ' g' : Math.round(d.totals.proteina) + ' g',
        urgent: falta > 0,
        accio: 'nutricio'
      };
    },

    contextIA: function () {
      var d = Nutricio.dia(Utils.avui());
      if (!d.totals.ingerides && !d.teCremades) return 'Nutrició: avui encara no hi ha res apuntat.';

      var l = ['Nutrició d\'avui (' + d.data + '):'];
      l.push('- Ingerides: ' + Math.round(d.totals.ingerides) + ' kcal');
      l.push('- Proteïna: ' + Nutricio.r1(d.totals.proteina) + ' g' +
             (d.objectius.proteina > 0 ? ' (objectiu ' + d.objectius.proteina + ' g)' : ''));
      if (d.teCremades) {
        l.push('- Cremades: ' + Math.round(d.cremades) + ' kcal');
        l.push('- Balanç: ' + d.verdicte.text);
      } else {
        l.push('- Encara no has introduït l\'activitat del rellotge, o sigui que el dia no es pot tancar.');
      }
      return l.join('\n');
    },

    einesIA: [{
      nom: 'consulta_nutricio',
      descripcio: 'Calories i proteïnes de l\'usuari en un dia concret o en un rang de dates. ' +
                  'Retorna ingerides, cremades, balanç i proteïna, amb el detall dels àpats ' +
                  'si es demana un sol dia.',
      esquema: {
        type: 'object',
        properties: {
          data:  { type: 'string', description: 'Dia concret AAAA-MM-DD. Si s\'omet i no hi ha rang, avui.' },
          desde: { type: 'string', description: 'Data inicial AAAA-MM-DD' },
          fins:  { type: 'string', description: 'Data final AAAA-MM-DD' }
        }
      },
      executa: function (a) { return Nutricio.consultaIA(a); }
    }, {
      nom: 'registra_ingesta',
      descripcio: 'Apunta un aliment a un àpat. Si l\'aliment és a la llista guardada de l\'usuari, ' +
                  'no cal donar kcal ni proteïnes: es fan servir les seves. ' +
                  'NO s\'executa directament: genera una proposta que en Pol ha de confirmar.',
      escriu: true,
      esquema: {
        type: 'object',
        properties: {
          aliment: { type: 'string', description: 'Nom de l\'aliment' },
          grams:   { type: 'number', description: 'Quantitat en grams' },
          apat:    { type: 'string', description: 'dinar, berenar o sopar' },
          data:    { type: 'string', description: 'Data AAAA-MM-DD. Si s\'omet, avui.' },
          kcal100: { type: 'number', description: 'kcal per 100 g. Només si l\'aliment no és a la llista.' },
          prot100: { type: 'number', description: 'Proteïnes per 100 g. Només si l\'aliment no és a la llista.' }
        },
        required: ['aliment', 'grams']
      },
      etiqueta: function (a) {
        return 'Apuntar ' + (a.grams || '?') + ' g de «' + (a.aliment || '?') + '»' +
               (a.apat ? ' al ' + a.apat : '') + (a.data ? ' del ' + a.data : ' d\'avui');
      },
      executa: function (a) { return Nutricio.registraPerNom(a); }
    }],

    vista: 'vista_nutricio'
  };
}

var Nutricio = (function () {

  var APATS = [
    { clau: 'dinar',   nom: 'Dinar'   },
    { clau: 'berenar', nom: 'Berenar' },
    { clau: 'sopar',   nom: 'Sopar'   }
  ];

  // ---------------------------------------------------------------- intern

  function num_(v) {
    var n = parseFloat(String(v === undefined || v === null ? '' : v).replace(',', '.'));
    return isFinite(n) ? n : 0;
  }

  /** Les vives: les que no s'han tret. */
  function ingestes_(filtre) {
    return Dades.llegeix('Ingestes', function (f) {
      if (f.esborrat_el) return false;
      return !filtre || filtre(f);
    });
  }

  function totalsDe_(files) {
    var kcal = 0, prot = 0;
    for (var i = 0; i < files.length; i++) {
      var g = num_(files[i].grams);
      kcal += g * num_(files[i].kcal100) / 100;
      prot += g * num_(files[i].prot100) / 100;
    }
    return { ingerides: kcal, proteina: prot };
  }

  // ---------------------------------------------------------------- ajustos

  /**
   * Només els dos objectius. Van a `_Config` amb prefix `nutri_`, que és un
   * magatzem clau-valor del nucli pensat justament per això: no cal cap full
   * nou ni tocar cap fitxer del nucli.
   */
  function ajustos() {
    return {
      objectiuDeficit:  Config.getNum('nutri_objectiu_deficit', 0),
      objectiuProteina: Config.getNum('nutri_objectiu_proteina', 0)
    };
  }

  function desaAjustos(p) {
    var mapa = {
      objectiuDeficit:  'nutri_objectiu_deficit',
      objectiuProteina: 'nutri_objectiu_proteina'
    };
    for (var k in mapa) {
      if (p[k] !== undefined && p[k] !== null) Config.set(mapa[k], p[k]);
    }
    return ajustos();
  }

  // -------------------------------------------------------------------- dia

  function dia(data) {
    data = data || Utils.avui();
    var a = ajustos();

    var files = ingestes_(function (f) { return String(f.data) === String(data); });

    var apats = APATS.map(function (m) {
      var items = files.filter(function (f) { return String(f.apat) === m.clau; })
        .map(function (f) {
          var g = num_(f.grams);
          return {
            id: f.id, nom: f.nom, grams: g,
            kcal100: num_(f.kcal100), prot100: num_(f.prot100),
            kcal: g * num_(f.kcal100) / 100,
            prot: g * num_(f.prot100) / 100
          };
        });
      var t = totalsDe_(files.filter(function (f) { return String(f.apat) === m.clau; }));
      return { clau: m.clau, nom: m.nom, items: items, kcal: t.ingerides, proteina: t.proteina };
    });

    var totals = totalsDe_(files);

    var fd = Dades.un('NutricioDies', { data: data });
    var teActivitat = !!(fd && String(fd.activitat).trim() !== '');
    var cremades = fd ? num_(fd.activitat) : 0;
    var teCremades = teActivitat && cremades > 0;

    var net = cremades - totals.ingerides;   // positiu = dèficit

    return {
      data: data,
      apats: apats,
      totals: totals,
      activitat: cremades,
      teActivitat: teActivitat,
      cremades: cremades,
      teCremades: teCremades,
      net: teCremades ? net : null,
      objectius: { deficit: a.objectiuDeficit, proteina: a.objectiuProteina },
      verdicte: verdicte_(teCremades, net, a.objectiuDeficit)
    };
  }

  /** El mateix criteri, i el mateix redactat, que FitFat. */
  function verdicte_(teCremades, net, objectiu) {
    if (!teCremades) {
      return { estat: 'sense_dades', text: 'Introdueix les calories cremades per tancar el dia.' };
    }
    if (net > 0 && objectiu > 0 && net >= objectiu) {
      return { estat: 'deficit_assolit', text: 'Dèficit de ' + Math.round(net) + ' kcal — objectiu assolit' };
    }
    if (net > 0) {
      return {
        estat: 'deficit',
        text: objectiu > 0
          ? 'En dèficit de ' + Math.round(net) + ' kcal · falten ' + Math.round(objectiu - net) + ' per l\'objectiu'
          : 'En dèficit de ' + Math.round(net) + ' kcal'
      };
    }
    if (net === 0) {
      return { estat: 'equilibri', text: 'En equilibri: has cremat el mateix que has ingerit.' };
    }
    return {
      estat: 'superavit',
      text: 'En superàvit de ' + Math.round(-net) + ' kcal · avui has menjat més del que has cremat'
    };
  }

  // ------------------------------------------------------------- escriptura

  function afegeix(p) {
    var nom = String(p.nom || '').trim();
    if (!nom) throw new Error('Falta el nom de l\'aliment.');
    var grams = num_(p.grams);
    if (grams <= 0) throw new Error('Els grams han de ser més grans que zero.');

    var apat = String(p.apat || 'dinar');
    if (['dinar', 'berenar', 'sopar'].indexOf(apat) === -1) apat = 'dinar';

    return Dades.insereix('Ingestes', {
      data: p.data || Utils.avui(),
      apat: apat,
      nom: nom,
      grams: grams,
      kcal100: num_(p.kcal100),
      prot100: num_(p.prot100),
      origen: p.origen || 'app'
    }, 'ing');
  }

  /** No esborra la fila: la marca. L'històric és intocable. */
  function treu(id) {
    if (!id) throw new Error('Falta l\'identificador.');
    var r = Dades.actualitza('Ingestes', id, { esborrat_el: Utils.ara() });
    if (!r) throw new Error('Aquesta ingesta no existeix.');
    return { tret: true };
  }

  function desaActivitat(data, kcal) {
    data = data || Utils.avui();
    return Dades.desa('NutricioDies', {
      data: data,
      activitat: num_(kcal),
      origen: 'app'
    }, ['data'], 'nud');
  }

  // --------------------------------------------------------------- aliments

  function aliments() {
    var f = Dades.llegeix('Aliments', function (x) { return !x.esborrat_el; });
    f.sort(function (a, b) { return String(a.nom).localeCompare(String(b.nom), 'ca'); });
    return f.map(function (x) {
      return { id: x.id, nom: x.nom, kcal100: num_(x.kcal100), prot100: num_(x.prot100) };
    });
  }

  /** Un aliment per nom, sense distingir majúscules. Com feia FitFat. */
  function alimentPerNom_(nom) {
    var clau = String(nom || '').trim().toLowerCase();
    if (!clau) return null;
    var tots = Dades.llegeix('Aliments', function (x) { return !x.esborrat_el; });
    for (var i = 0; i < tots.length; i++) {
      if (String(tots[i].nom).trim().toLowerCase() === clau) return tots[i];
    }
    return null;
  }

  function desaAliment(p) {
    var nom = String(p.nom || '').trim();
    if (!nom) throw new Error('Falta el nom de l\'aliment.');

    var ex = alimentPerNom_(nom);
    if (ex) {
      return Dades.actualitza('Aliments', ex.id, {
        kcal100: num_(p.kcal100), prot100: num_(p.prot100)
      });
    }
    return Dades.insereix('Aliments', {
      nom: nom, kcal100: num_(p.kcal100), prot100: num_(p.prot100)
    }, 'ali');
  }

  function treuAliment(id) {
    if (!id) throw new Error('Falta l\'identificador.');
    var r = Dades.actualitza('Aliments', id, { esborrat_el: Utils.ara() });
    if (!r) throw new Error('Aquest aliment no existeix.');
    return { tret: true };
  }

  // -------------------------------------------------------------- períodes

  function diesDe_(data, tipus) {
    if (tipus === 'setmana') {
      var dl = Utils.dillunsDe(data);
      return Utils.rangDates(dl, Utils.sumaDies(dl, 6));
    }
    var t = String(data);
    var ultim = new Date(Number(t.slice(0, 4)), Number(t.slice(5, 7)), 0).getDate();
    return Utils.rangDates(t.slice(0, 8) + '01',
                           t.slice(0, 8) + (ultim < 10 ? '0' + ultim : String(ultim)));
  }

  /**
   * Resum d'un període. Fa UNA lectura de cada full i reparteix, en comptes de
   * cridar dia() trenta vegades: amb un mes sencer, la diferència és entre
   * respondre i esgotar el temps d'execució.
   */
  function periode(data, tipus) {
    var a = ajustos();
    var dies = diesDe_(data, tipus);
    var dins = {};
    for (var i = 0; i < dies.length; i++) dins[dies[i]] = true;

    var perDia = {};
    ingestes_(function (f) { return dins[String(f.data)]; }).forEach(function (f) {
      var k = String(f.data);
      if (!perDia[k]) perDia[k] = { ingerides: 0, proteina: 0 };
      var g = num_(f.grams);
      perDia[k].ingerides += g * num_(f.kcal100) / 100;
      perDia[k].proteina  += g * num_(f.prot100) / 100;
    });

    var activitats = {};
    Dades.llegeix('NutricioDies', function (f) { return dins[String(f.data)]; }).forEach(function (f) {
      if (String(f.activitat).trim() !== '') activitats[String(f.data)] = num_(f.activitat);
    });

    var files = dies.map(function (d) {
      var t = perDia[d] || { ingerides: 0, proteina: 0 };
      var teAct = activitats[d] !== undefined;
      var cremades = teAct ? activitats[d] : 0;
      var teCremades = teAct && cremades > 0;
      return {
        data: d,
        ingerides: t.ingerides,
        proteina: t.proteina,
        cremades: teCremades ? cremades : null,
        net: teCremades ? cremades - t.ingerides : null,
        apuntat: t.ingerides > 0 || teCremades
      };
    });

    var ambNet = files.filter(function (f) { return f.net !== null; });
    var apuntats = files.filter(function (f) { return f.apuntat; });
    var suma = function (arr, camp) {
      return arr.reduce(function (s, f) { return s + (f[camp] || 0); }, 0);
    };

    return {
      tipus: tipus,
      data: data,
      desde: dies[0],
      fins: dies[dies.length - 1],
      dies: files,
      diesApuntats: apuntats.length,
      diesAmbBalanc: ambNet.length,
      mitjanaIngerides: apuntats.length ? suma(apuntats, 'ingerides') / apuntats.length : 0,
      mitjanaProteina:  apuntats.length ? suma(apuntats, 'proteina')  / apuntats.length : 0,
      mitjanaNet:       ambNet.length   ? suma(ambNet, 'net')         / ambNet.length   : 0,
      netAcumulat:      suma(ambNet, 'net'),
      objectius: { deficit: a.objectiuDeficit, proteina: a.objectiuProteina }
    };
  }

  // -------------------------------------------------------------------- IA

  function consultaIA(a) {
    a = a || {};
    if (a.desde || a.fins) {
      var desde = a.desde || a.fins;
      var fins = a.fins || a.desde;
      var files = ingestes_(function (f) {
        return String(f.data) >= String(desde) && String(f.data) <= String(fins);
      });
      var t = totalsDe_(files);
      var dies = {};
      files.forEach(function (f) { dies[String(f.data)] = true; });
      var n = Object.keys(dies).length;
      return {
        desde: desde, fins: fins,
        diesAmbRegistre: n,
        ingeridesTotal: Math.round(t.ingerides),
        proteinaTotal: Nutricio.r1(t.proteina),
        ingeridesMitjana: n ? Math.round(t.ingerides / n) : 0,
        proteinaMitjana: n ? Nutricio.r1(t.proteina / n) : 0
      };
    }

    var d = dia(a.data || Utils.avui());
    return {
      data: d.data,
      ingerides: Math.round(d.totals.ingerides),
      proteina: Nutricio.r1(d.totals.proteina),
      objectiuProteina: d.objectius.proteina,
      cremades: d.teCremades ? Math.round(d.cremades) : null,
      balanc: d.net === null ? null : Math.round(d.net),
      verdicte: d.verdicte.text,
      apats: d.apats.map(function (m) {
        return {
          apat: m.nom,
          kcal: Math.round(m.kcal),
          items: m.items.map(function (i) { return i.nom + ' ' + Math.round(i.grams) + ' g'; })
        };
      })
    };
  }

  /** Ve d'una proposta confirmada. Si l'aliment és a la llista, n'agafa les dades. */
  function registraPerNom(a) {
    var nom = String(a.aliment || '').trim();
    if (!nom) throw new Error('No has dit quin aliment.');

    var kcal100 = num_(a.kcal100), prot100 = num_(a.prot100);
    if (!kcal100) {
      var guardat = alimentPerNom_(nom);
      if (guardat) {
        kcal100 = num_(guardat.kcal100);
        prot100 = num_(guardat.prot100);
      } else {
        throw new Error('No tinc «' + nom + '» a la llista d\'aliments i no m\'has dit les kcal per 100 g.');
      }
    }

    var r = afegeix({
      data: a.data || Utils.avui(),
      apat: a.apat,
      nom: nom,
      grams: a.grams,
      kcal100: kcal100,
      prot100: prot100,
      origen: 'conversa'
    });

    return {
      apuntat: true,
      aliment: nom,
      grams: num_(a.grams),
      kcal: Math.round(num_(a.grams) * kcal100 / 100),
      proteina: Nutricio.r1(num_(a.grams) * prot100 / 100),
      data: r.data
    };
  }

  // -------------------------------------------------------- migració FitFat

  /**
   * Porta les dades de FitFat cap aquí.
   *
   * TRES GARANTIES, i són el motiu pel qual està escrita així:
   *   1. No esborra ni sobreescriu res. Només afegeix el que falta.
   *   2. Es pot repetir. Els identificadors es deriven dels de FitFat, o sigui
   *      que una fila ja importada es reconeix i s'ignora. Importar dos cops
   *      dona el mateix resultat que importar-ne un.
   *   3. Amb `simulacio` a cert no escriu res i et diu què faria.
   *
   * Espera el JSON tal com el treu «⚙ → Còpia de seguretat → Exporta»:
   * un objecte amb `data`, i dins les claus `fitfat:day:AAAA-MM-DD`,
   * `fitfat:foods` i `fitfat:settings` amb el valor com a TEXT JSON.
   */
  function importaFitFat(dades, simulacio) {
    if (typeof dades === 'string') dades = Utils.desJson(dades, null);
    if (!dades) throw new Error('El fitxer no és JSON vàlid.');

    var magatzem = dades.data || dades;
    var claus = Object.keys(magatzem).filter(function (k) { return k.indexOf('fitfat:') === 0; });
    if (!claus.length) throw new Error('Aquest fitxer no sembla una còpia de FitFat: no hi ha cap clau «fitfat:».');

    function valor_(clau) {
      var v = magatzem[clau];
      if (v === undefined) return null;
      return typeof v === 'string' ? Utils.desJson(v, null) : v;
    }

    var informe = { dies: 0, ingestes: 0, aliments: 0, activitats: 0, ajustos: false,
                    jaHiEren: 0, avisos: [], simulacio: !!simulacio };

    // Els ids que ja hi ha, llegits UN cop. Amb centenars de files, comprovar-ho
    // fila a fila multiplicaria les lectures i esgotaria el temps d'execució.
    var idsIngesta = {}, idsAliment = {}, datesDia = {};
    Dades.llegeix('Ingestes').forEach(function (f) { idsIngesta[String(f.id)] = true; });
    Dades.llegeix('Aliments').forEach(function (f) { idsAliment[String(f.id)] = true; });
    Dades.llegeix('NutricioDies').forEach(function (f) { datesDia[String(f.data)] = f; });

    // ---- aliments guardats
    var novaAliments = [];
    (valor_('fitfat:foods') || []).forEach(function (f) {
      var id = 'ali_ff_' + String(f.id);
      if (idsAliment[id]) { informe.jaHiEren++; return; }
      idsAliment[id] = true;
      novaAliments.push({
        id: id, nom: String(f.name || '').trim(),
        kcal100: num_(f.kcal100), prot100: num_(f.prot100)
      });
    });

    // ---- dies
    var novaIngestes = [], novaDies = [], actualitzaDies = [];
    claus.filter(function (k) { return k.indexOf('fitfat:day:') === 0; }).sort().forEach(function (clau) {
      var data = clau.slice('fitfat:day:'.length);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) { informe.avisos.push('Data estranya, saltada: ' + clau); return; }

      var d = valor_(clau);
      if (!d) { informe.avisos.push('No he pogut llegir ' + clau); return; }
      informe.dies++;

      var apats = d.meals || {};
      ['dinar', 'berenar', 'sopar'].forEach(function (apat) {
        (apats[apat] || []).forEach(function (i) {
          var id = 'ing_ff_' + data + '_' + String(i.id);
          if (idsIngesta[id]) { informe.jaHiEren++; return; }
          idsIngesta[id] = true;
          novaIngestes.push({
            id: id, data: data, apat: apat,
            nom: String(i.name || '').trim(),
            grams: num_(i.grams), kcal100: num_(i.kcal100), prot100: num_(i.prot100),
            origen: 'fitfat'
          });
        });
      });

      // L'activitat del rellotge. Cadena buida vol dir "no introduïda",
      // que no és el mateix que zero: sense això, tots els dies en blanc
      // passarien a tenir balanç i el mes quedaria fals.
      if (d.burned !== undefined && String(d.burned).trim() !== '') {
        if (datesDia[data]) {
          informe.jaHiEren++;
        } else {
          datesDia[data] = true;
          novaDies.push({ id: 'nud_ff_' + data, data: data, activitat: num_(d.burned), origen: 'fitfat' });
        }
      }
    });

    informe.aliments = novaAliments.length;
    informe.ingestes = novaIngestes.length;
    informe.activitats = novaDies.length;

    // ---- objectius i cos
    var s = valor_('fitfat:settings');
    var canvis = null;
    if (s) {
      canvis = {};
      if (String(s.targetDeficit || '').trim() !== '')  canvis.objectiuDeficit  = num_(s.targetDeficit);
      if (String(s.targetProtein || '').trim() !== '')  canvis.objectiuProteina = num_(s.targetProtein);
      // El sexe, l'edat, l'alçada i el pes de FitFat no s'importen: només
      // servien per calcular el basal, i el basal s'ha tret.
      informe.ajustos = Object.keys(canvis).length > 0;
    }

    if (simulacio) return informe;

    if (novaAliments.length) Dades.insereixMoltes('Aliments', novaAliments, 'ali');
    if (novaIngestes.length) Dades.insereixMoltes('Ingestes', novaIngestes, 'ing');
    if (novaDies.length)     Dades.insereixMoltes('NutricioDies', novaDies, 'nud');
    if (canvis && informe.ajustos) desaAjustos(canvis);

    Log.info('nutricio.importa', 'Importació de FitFat', informe);
    return informe;
  }

  /** Un decimal, com feia FitFat. */
  function r1(n) { return Math.round(Number(n || 0) * 10) / 10; }

  return {
    r1: r1,
    dia: dia,
    periode: periode,
    afegeix: afegeix,
    treu: treu,
    desaActivitat: desaActivitat,
    aliments: aliments,
    desaAliment: desaAliment,
    treuAliment: treuAliment,
    ajustos: ajustos,
    desaAjustos: desaAjustos,
    consultaIA: consultaIA,
    registraPerNom: registraPerNom,
    importaFitFat: importaFitFat
  };
})();
