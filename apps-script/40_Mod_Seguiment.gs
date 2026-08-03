/**
 * 40_Mod_Seguiment.gs — MÒDUL · Seguiment físic setmanal
 *
 * EL FORAT QUE TAPA, i és l'única raó per la qual això existeix: un xat no pot
 * obrir conversa sol. El control setmanal depenia de recordar-se'n. Aquí no:
 * divendres al matí el sistema pica, i el control es queda pendent —al dia i a
 * l'inici— fins que el despatxes.
 *
 * QUÈ HI HA AQUÍ I QUÈ NO.
 * Aquest fitxer va a un repositori PÚBLIC. Per tant aquí hi ha només el que és
 * genèric: les regles d'interpretació i els seus llindars, que són fisiologia i
 * no dades de ningú. Tot el que és d'en Pol —perfil, objectius, targets, fases,
 * pla d'àpats i suplements— viu al full `SeguimentPla`, que no surt d'aquí.
 * Si algun dia has d'escriure una xifra seva en aquest fitxer, t'has equivocat
 * de lloc.
 *
 * ON ES CALCULA. Les regles són aritmètica sobre unes desenes de files: es
 * calculen AL NAVEGADOR, no aquí. El servidor només serveix l'històric i el
 * pla; el veredicte apareix sense cap viatge. Aquest fitxer en porta una còpia
 * només per a `elDia`, `resumInici` i el context de la IA, que sí que passen
 * pel servidor. La còpia i l'original comparteixen llindars i han de dir el
 * mateix: hi ha una prova que ho comprova.
 */

function MODUL_SEGUIMENT() {
  return {
    id: 'seguiment',
    nom: 'Seguiment',
    icona: 'seguiment',
    ordre: 25,                 // entre nutrició (20) i finances (30): és el cos
    versioEsquema: 1,

    fulls: [
      {
        /* UNA FILA PER CONTROL SETMANAL.
           Les fotos hi són com a identificadors de Drive, mai com a fitxer:
           el que viatja per l'API és una cadena de trenta caràcters, no una
           imatge de tres megues. */
        nom: 'Seguiment',
        columnes: [
          { nom: 'id',              tipus: 'text' },
          { nom: 'data',            tipus: 'data' },
          { nom: 'pes',             tipus: 'num'  },
          { nom: 'cintura',         tipus: 'num'  },
          { nom: 'cintura_valida',  tipus: 'text', valors: ['SI', 'NO'] },
          { nom: 'forca',           tipus: 'num'  },
          { nom: 'trail',           tipus: 'num'  },
          { nom: 'trail_gros',      tipus: 'num'  },
          { nom: 'energia',         tipus: 'text', valors: ['baixa', 'normal', 'alta'] },
          { nom: 'son',             tipus: 'text', valors: ['malament', 'normal', 'bé'] },
          { nom: 'gana',            tipus: 'text', valors: ['poca', 'normal', 'molta'] },
          { nom: 'dieta',           tipus: 'text', valors: ['malament', 'a mitges', 'bé'] },
          { nom: 'foto_frontal',    tipus: 'text' },
          { nom: 'foto_perfil',     tipus: 'text' },
          { nom: 'foto_esquena',    tipus: 'text' },
          { nom: 'notes',           tipus: 'text' },
          { nom: 'creat_el',        tipus: 'iso'  },
          { nom: 'actualitzat_el',  tipus: 'iso'  }
        ]
      },
      {
        /* EL PLA, EN CLAU I VALOR.
           Aquí hi va tot el que és personal, i per això és un full i no codi.
           També és el que fa que l'1 de setembre no s'hagi de tocar res: la
           fase nova és una fila, no un `if`. */
        nom: 'SeguimentPla',
        columnes: [
          { nom: 'clau',           tipus: 'text' },
          { nom: 'valor',          tipus: 'text' },
          { nom: 'actualitzat_el', tipus: 'iso'  }
        ]
      }
    ],

    accions: {
      /* UN SOL VIATGE PER OBRIR LA PANTALLA.
         Hi va tot: l'històric sencer, el pla i la fase d'avui. Cinquanta-dues
         files l'any; cinc-centes en deu anys. No hi ha cap raó per partir-ho. */
      pantalla: function () {
        return Memoria.recorda('seguiment', 'pantalla', function () {
          return Seguiment.pantalla();
        });
      },

      desa:        function (p) { return Seguiment.desaControl(p); },
      esborraFoto: function (p) { return Seguiment.esborraFoto(p.data, p.angle); },

      /* La foto puja en una crida a part i sola: és l'única cosa d'aquest
         mòdul que pesa, i barrejar-la amb el control faria lenta una cosa que
         no ho ha de ser. */
      pujaFoto:    function (p) { return Seguiment.pujaFoto(p); },

      /* LA LECTURA DE LA IA, NOMÉS QUAN LA DEMANES.
         El veredicte no passa mai per aquí: surt de les regles i és
         instantani. Això és un extra que gastes tu quan el vols. */
      comenta:     function (p) { return Seguiment.comenta(p.data); }
    },

    resumInici: function () {
      var e = Seguiment.estat();
      if (!e.toca && !e.pendent) {
        return { etiqueta: 'Control setmanal', valor: e.fa === null ? '—' : 'fa ' + e.fa + ' d',
                 urgent: false, accio: 'seguiment' };
      }
      return { etiqueta: 'Control setmanal', valor: 'pendent', urgent: true, accio: 'seguiment' };
    },

    /* AL DIA HI SURT NOMÉS QUAN TOCA.
       Un mòdul que hi surt cada dia dient «res a fer» és soroll: la pàgina del
       dia ja té prou coses. Divendres —o qualsevol dia mentre quedi pendent—
       hi surt reclamant; la resta de dies, calla. */
    elDia: function (data) {
      var e = Seguiment.estat(data);
      if (!e.pendent) return null;
      return {
        titol: 'Control setmanal', urgent: true, accio: 'seguiment',
        coses: [{ text: 'Pesa\'t i mesura\'t', menut: 'matí, en dejú, abans d\'esmorzar' }]
      };
    },

    /* EL PIC DE DIVENDRES AL MATÍ, que és per això que existeix tot això.
       L'hora és la que és a posta: a les set del matí el que has de fer és
       pesar-te i mesurar-te EN DEJÚ, abans de cafè i abans de moure't. Omplir
       sis camps ja ho faràs quan puguis —el control es queda pendent al dia i
       a l'inici fins que el despatxis—, però la mesura, si te la saltes, ja no
       la pots recuperar fins divendres que ve.

       Si ja l'has fet, no pica: un avís que arriba tant si toca com si no
       deixa de voler dir res al cap de tres setmanes. */
    avisos: [{
      id: 'control',
      hora: 7,
      dia: 5,
      mira: function () {
        var e = Seguiment.estat();
        if (e.fetAquestaSetmana) return null;
        return {
          titol: 'Control setmanal: pesa\'t i mesura\'t',
          cos: 'Ara, en dejú i abans d\'esmorzar. Cintura al melic, dret i relaxat, ' +
               'sense estrènyer. Els números els pots apuntar després.',
          url: 'seguiment'
        };
      }
    }],

    resumPeriode: function (desde, fins) { return Seguiment.resumPeriode(desde, fins); },
    contextIA:    function () { return Seguiment.contextIA(); },

    einesIA: [{
      nom: 'consulta_seguiment',
      descripcio: 'Retorna els controls setmanals de seguiment físic (pes, cintura, ' +
                  'entrenaments i sensacions), del més recent al més antic.',
      esquema: {
        type: 'object',
        properties: {
          quants: { type: 'integer', description: 'Quants controls, del més recent. Per defecte 12.' }
        }
      },
      executa: function (args) { return Seguiment.perALaIA(args && args.quants); }
    }],

    vista: 'vista_seguiment'
  };
}


var Seguiment = (function () {

  // ------------------------------------------------------------- els llindars
  /* CENTRALITZATS I EN UN SOL LLOC, com demanava el motor de referència.
     Són genèrics: cap d'aquests números diu res de ningú. Els personals
     —calories, proteïna, sessions objectiu— viuen al full del pla. */
  var LLINDAR = {
    perdSana: [0.4, 0.7],   // kg/setmana: la franja bona
    perdRapida: 0.8,        // kg/setmana: per sobre, s'hi perd múscul
    saltImpossible: 3.0,    // kg/setmana amunt o avall: error de tecla o de bàscula
    cinturaIncoherent: 2.5, // cm de baixada amb el pes quiet
    pesEstable: 0.3,        // kg: per sota d'això, el pes «no s'ha mogut»
    forcaMinima: 2,         // sessions/setmana
    diesTolerats: [5, 10]   // un control «setmanal» que caigui fora, es normalitza
  };

  var CARPETA_FOTOS = 'JEFE · Seguiment físic';

  /* Els estàndards de mesura. Són protocol, no dades d'ningú, i han de sortir
     AL COSTAT del camp: una mesura feta d'una altra manera no és comparable amb
     la d'abans, i llavors tota la sèrie deixa de voler dir res. */
  var COM_ES_MESURA = {
    pes: 'Matí, en dejú, després del lavabo. Si pots, mitjana de 2-3 dies.',
    cintura: 'Matí, en dejú, dret i relaxat. Expiració normal —ni buidar pulmons ' +
             'ni contreure—. Cinta al melic, sense estrènyer.',
    fotos: 'Mateix lloc, mateixa llum, mateixa hora, mateixa roba. Càmera a ' +
           'l\'alçada del melic. Postura relaxada.'
  };

  // ------------------------------------------------------------------ el pla
  function pla() {
    var files = Dades.llegeix('SeguimentPla');
    var m = {};
    files.forEach(function (f) { if (f.clau) m[String(f.clau)] = String(f.valor); });
    return m;
  }

  function num_(v, sino) {
    var n = parseFloat(String(v === undefined || v === null ? '' : v).replace(',', '.'));
    return isFinite(n) ? n : (sino === undefined ? null : sino);
  }

  /* LA FASE D'AVUI.
     Al full hi ha files `fase.1.desde`, `fase.1.nom`, `fase.1.kcal`… La que mana
     és l'última que ja ha començat. Afegir-ne una és afegir files, no tocar
     codi: era el requisit explícit de cara a l'1 de setembre. */
  function faseDe(plaM, data) {
    var fases = [];
    for (var k in plaM) {
      var m = k.match(/^fase\.(\d+)\.desde$/);
      if (!m) continue;
      var n = m[1];
      fases.push({
        desde: plaM[k],
        nom: plaM['fase.' + n + '.nom'] || 'Fase ' + n,
        objectiu: plaM['fase.' + n + '.objectiu'] || '',
        kcal: num_(plaM['fase.' + n + '.kcal']),
        proteina: num_(plaM['fase.' + n + '.proteina']),
        forca: num_(plaM['fase.' + n + '.forca']),
        trail: num_(plaM['fase.' + n + '.trail'])
      });
    }
    fases.sort(function (a, b) { return a.desde < b.desde ? -1 : 1; });
    var ara = null;
    fases.forEach(function (f) { if (f.desde <= data) ara = f; });
    return ara;
  }

  // -------------------------------------------------------------- l'històric
  function controls() {
    var files = Dades.llegeix('Seguiment');
    files.sort(function (a, b) { return String(a.data) < String(b.data) ? -1 : 1; });
    return files.map(function (f) {
      return {
        id: f.id,
        data: String(f.data),
        pes: num_(f.pes),
        cintura: num_(f.cintura),
        cinturaValida: String(f.cintura_valida).toUpperCase() !== 'NO',
        forca: num_(f.forca),
        trail: num_(f.trail),
        trailGros: num_(f.trail_gros),
        energia: f.energia || '',
        son: f.son || '',
        gana: f.gana || '',
        dieta: f.dieta || '',
        fotos: {
          frontal: f.foto_frontal || '',
          perfil: f.foto_perfil || '',
          esquena: f.foto_esquena || ''
        },
        notes: f.notes || ''
      };
    });
  }

  // ------------------------------------------------------- ESTAT DEL CONTROL
  /* Quin dia toca i si està fet. El dia el diu el pla (`control.dia`), perquè
     canviar-lo no ha de voler dir tocar codi. */
  function estat(data) {
    var avui = data || Utils.avui();
    var plaM = pla();
    var diaSetmana = Number(plaM['control.dia'] || 5);   // 1 = dilluns … 7 = diumenge
    var h = controls();
    var ultim = h.length ? h[h.length - 1] : null;
    var fa = ultim ? diesEntre(ultim.data, avui) : null;

    /* PENDENT vol dir: ja ha arribat el dia de la setmana i encara no hi ha cap
       control d'aquesta setmana. Es queda pendent fins que el facis o fins que
       passi la setmana; no desapareix a mitjanit del divendres. */
    var dilluns = dillunsDe(avui);
    var fetAquestaSetmana = h.some(function (c) { return c.data >= dilluns; });
    var toca = diaDeLaSetmana(avui) >= diaSetmana;

    return {
      avui: avui,
      dia: diaSetmana,
      toca: toca,
      pendent: toca && !fetAquestaSetmana,
      fetAquestaSetmana: fetAquestaSetmana,
      fa: fa,
      ultim: ultim ? ultim.data : null
    };
  }

  function diaDeLaSetmana(iso) {
    var d = new Date(iso + 'T12:00:00');
    return d.getDay() === 0 ? 7 : d.getDay();          // 1 = dilluns … 7 = diumenge
  }
  function dillunsDe(iso) {
    var d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() - (diaDeLaSetmana(iso) - 1));
    return d.toISOString().slice(0, 10);
  }
  function diesEntre(a, b) {
    return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
  }

  // ------------------------------------------------------------- LES REGLES
  /* La còpia servidor de la lògica que corre al navegador. Vegeu la capçalera
     del fitxer: les dues han de dir el mateix i hi ha una prova que ho lliga.

     El que s'ha arreglat respecte del motor de referència, i per què:

     1. ES COMPTEN ELS DIES. El motor comparava sempre amb l'entrada anterior
        sense mirar quant de temps havia passat, i l'històric ja porta una
        entrada de 10 dies avaluada amb llindars setmanals. Ara tot es
        normalitza a kg/setmana i, si l'interval se surt de mare, s'avisa en
        comptes de fer veure que és una setmana.
     2. `cintura_valida` ES RESPECTA A TOT ARREU. Al motor només la mirava la
        regla d'incoherència; la de recomposició no, o sigui que una mesura que
        tu havies marcat com a dolenta podia generar igualment un «va bé».
     3. LA CINTURA NO SALTA SETMANES EN SILENCI. Si la referència vàlida és de
        fa més d'una setmana, es diu.
     4. HI HA LA REGLA DELS DIES DE TRAIL GROS. Era a l'especificació i no
        estava implementada enlloc, tot i que el camp existia.
     5. ENERGIA I GANA SERVEIXEN PER A ALGUNA COSA. Es demanaven cada setmana i
        cap regla no les mirava.
     6. NO ES PARLA DE «RECOMPOSICIÓ». L'objectiu es va redefinir a posta cap a
        «més magre i en forma»; els missatges deien una cosa que ja no era. */
  function analitza(h, i) {
    var avisos = [];
    var cur = h[i], prev = i > 0 ? h[i - 1] : null;

    if (cur.forca !== null && cur.forca < LLINDAR.forcaMinima) {
      avisos.push({ id: 'poca_forca', nivell: 'info',
        text: (cur.forca === 0 ? 'Cap sessió de força' : 'Només ' + cur.forca + ' sessió de força') +
              '. Sense estímul, part del que perdis serà múscul, i menys múscul és pitjor ' +
              'per a la cursa. El mínim són dues sessions curtes de tren superior.' });
    }

    if (cur.trailGros > 0) {
      avisos.push({ id: 'trail_gros', nivell: 'info',
        text: cur.trailGros + (cur.trailGros === 1 ? ' sortida grossa' : ' sortides grosses') +
              ' aquesta setmana. Aquests dies toca menjar més: sense l\'extra, el dèficit ' +
              'se\'t dispara i el següent pesatge et sortirà massa avall.' });
    }

    if (cur.energia === 'baixa' && prev && prev.energia === 'baixa') {
      avisos.push({ id: 'energia_baixa', nivell: 'avis',
        text: 'Segona setmana seguida amb l\'energia baixa. Amb dèficit i trail, això ' +
              'sol voler dir que menges poc els dies que et mous, no que entrenis massa.' });
    }

    if (!prev || cur.pes === null || prev.pes === null) return avisos;

    var dies = diesEntre(prev.data, cur.data);
    var delta = Math.round((cur.pes - prev.pes) * 100) / 100;

    if (Math.abs(delta) > LLINDAR.saltImpossible) {
      avisos.push({ id: 'salt_impossible', nivell: 'avis',
        text: 'Del control anterior a aquest hi ha ' + (delta > 0 ? '+' : '') + coma(delta) +
              ' kg. Això no ho fa un cos en una setmana: o la bàscula o la tecla. Reconfirma-ho.' });
      return avisos;                       // amb una dada falsa no s'analitza res més
    }

    /* NORMALITZAT A SETMANA. Si l'interval és raonable es fa la regla de tres;
       si és massa curt o massa llarg, el ritme no vol dir res i es diu. */
    var perdut = Math.round((-delta) * 100) / 100;
    var perSetmana = dies > 0 ? Math.round((perdut * 7 / dies) * 100) / 100 : null;
    var intervalRar = dies < LLINDAR.diesTolerats[0] || dies > LLINDAR.diesTolerats[1];

    // Coherència de la cintura amb el pes
    var ref = cinturaAnterior(h, i);
    if (cur.cinturaValida && cur.cintura !== null && ref) {
      var baixa = Math.round((ref.cintura - cur.cintura) * 10) / 10;
      if (baixa >= LLINDAR.cinturaIncoherent && Math.abs(delta) <= LLINDAR.pesEstable) {
        avisos.push({ id: 'cintura_incoherent', nivell: 'avis',
          text: 'Cintura −' + coma(baixa) + ' cm amb el pes pràcticament igual (' +
                (delta > 0 ? '+' : '') + coma(delta) + ' kg). Això no és greix perdut: ' +
                'un centímetre de greix pesa. Torna-la a mesurar com toca abans de donar-la per bona.' });
      }
      if (ref.dies > 10) {
        avisos.push({ id: 'cintura_vella', nivell: 'info',
          text: 'L\'última cintura bona és de fa ' + ref.dies + ' dies: la comparació ' +
                'no és de setmana a setmana.' });
      }
      // El senyal bo: el pes no baixa i la cintura tampoc puja
      var canvi = Math.round((cur.cintura - ref.cintura) * 10) / 10;
      if (delta >= -LLINDAR.pesEstable && canvi <= 0) {
        avisos.push({ id: 'senyal_bo', nivell: 'be',
          text: 'Pes ' + (delta > 0 ? '+' : '') + coma(delta) + ' kg i cintura ' +
                (canvi > 0 ? '+' : '') + coma(canvi) + ' cm. Això és exactament el que vols: ' +
                'la bàscula quieta i la cintura no. Progrés, no estancament.' });
      }
    }

    // El ritme
    if (intervalRar) {
      avisos.push({ id: 'interval_rar', nivell: 'info',
        text: 'Han passat ' + dies + ' dies des de l\'últim control: el ritme per setmana ' +
              'és una estimació, no una mesura.' });
    }
    if (perSetmana !== null && perSetmana > LLINDAR.perdRapida) {
      avisos.push({ id: 'massa_rapid', nivell: 'avis',
        text: '−' + coma(perSetmana) + ' kg per setmana: massa. La franja bona és 0,4-0,7. ' +
              'A aquest ritme part del que se\'n va és múscul. Menja més els dies de trail gros.' });
    } else if (perSetmana !== null &&
               perSetmana >= LLINDAR.perdSana[0] && perSetmana <= LLINDAR.perdSana[1]) {
      avisos.push({ id: 'ritme_bo', nivell: 'be',
        text: '−' + coma(perSetmana) + ' kg per setmana: just a la franja bona.' });
    }

    return avisos;
  }

  /* L'última cintura BONA anterior, i de quan és. Que digui de quan és no és
     un detall: comparar amb una mesura de fa tres setmanes mentre el pes es
     compara amb la d'ara és el que feia el motor de referència sense dir-ho. */
  function cinturaAnterior(h, i) {
    for (var k = i - 1; k >= 0; k--) {
      if (h[k].cinturaValida && h[k].cintura !== null) {
        return { cintura: h[k].cintura, data: h[k].data, dies: diesEntre(h[k].data, h[i].data) };
      }
    }
    return null;
  }

  function coma(n) { return String(Math.abs(n)).replace('.', ','); }

  function veredicte(avisos) {
    if (avisos.some(function (a) { return a.nivell === 'avis'; })) return 'Hi ha coses a corregir';
    if (avisos.some(function (a) { return a.id === 'senyal_bo'; })) return 'Bona setmana';
    return 'Setmana correcta';
  }

  // ------------------------------------------------------------- LA PANTALLA
  function pantalla() {
    var h = controls();
    var plaM = pla();
    var avui = Utils.avui();
    return {
      avui: avui,
      historic: h,
      pla: plaM,
      fase: faseDe(plaM, avui),
      estat: estat(avui),
      llindars: LLINDAR,
      comEsMesura: COM_ES_MESURA
    };
  }

  // -------------------------------------------------------------- ESCRIPTURA
  function desaControl(p) {
    if (!p || !p.data) throw new Error('Cal la data del control.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.data)) throw new Error('La data ha de ser AAAA-MM-DD.');

    var pes = num_(p.pes);
    if (pes !== null && (pes < 30 || pes > 250)) {
      throw new Error('Un pes de ' + p.pes + ' kg no pot ser: revisa-ho.');
    }
    var cintura = num_(p.cintura);
    if (cintura !== null && (cintura < 40 || cintura > 200)) {
      throw new Error('Una cintura de ' + p.cintura + ' cm no pot ser: revisa-ho.');
    }

    var fila = {
      data: p.data,
      pes: pes,
      cintura: cintura,
      cintura_valida: p.cinturaValida === false ? 'NO' : 'SI',
      forca: num_(p.forca, 0),
      trail: num_(p.trail, 0),
      trail_gros: num_(p.trailGros, 0),
      energia: p.energia || '',
      son: p.son || '',
      gana: p.gana || '',
      dieta: p.dieta || '',
      notes: p.notes || ''
    };

    /* PER DATA, no per identificador: si tornes a desar el control del mateix
       divendres —perquè t'has equivocat teclejant— corregeix el que hi havia
       en comptes de crear-ne un de bessó. */
    var r = Dades.desa('Seguiment', fila, ['data'], 'seg');
    Log.info('seguiment.desa', 'Control desat', { data: p.data });
    return { desat: true, data: p.data, id: r && r.id ? r.id : null };
  }

  // ------------------------------------------------------------------ FOTOS
  /* A DRIVE, I NOMÉS L'IDENTIFICADOR AL FULL.
     Les fotos són el que fa visible el que la bàscula no diu, però també són
     el més personal que hi ha aquí. Van a una carpeta del teu Drive, privada,
     i el full només en guarda l'identificador. Ni el repositori ni cap resposta
     de l'API porten mai la imatge. */
  function carpeta_() {
    var it = DriveApp.getFoldersByName(CARPETA_FOTOS);
    if (it.hasNext()) return it.next();
    var c = DriveApp.createFolder(CARPETA_FOTOS);
    c.setDescription('Fotos del seguiment físic de JEFE. Privada: no la comparteixis.');
    return c;
  }

  function pujaFoto(p) {
    if (!p || !p.data || !p.angle) throw new Error('Cal la data i l\'angle de la foto.');
    if (['frontal', 'perfil', 'esquena'].indexOf(p.angle) === -1) {
      throw new Error('L\'angle ha de ser frontal, perfil o esquena.');
    }
    if (!p.contingut) throw new Error('No hi ha cap imatge.');

    var trossos = String(p.contingut).split(',');
    var dades = trossos.length > 1 ? trossos[1] : trossos[0];
    var mena = (String(p.contingut).match(/^data:([^;]+);/) || [])[1] || 'image/jpeg';
    var nom = p.data + ' · ' + p.angle + (mena === 'image/png' ? '.png' : '.jpg');

    var blob = Utilities.newBlob(Utilities.base64Decode(dades), mena, nom);
    var fitxer = carpeta_().createFile(blob);

    var canvis = {};
    canvis['foto_' + p.angle] = fitxer.getId();
    Dades.desa('Seguiment', mescla_({ data: p.data }, canvis), ['data'], 'seg');

    Log.info('seguiment.foto', 'Foto desada', { data: p.data, angle: p.angle });
    return { id: fitxer.getId(), angle: p.angle, data: p.data };
  }

  /* TREURE UNA FOTO: DESENGANXAR-LA I LLENÇAR-LA A LA PAPERERA.
     Les dues coses juntes, i és a posta. Fer-ne només una deixa les dades
     mentint: desenganxar-la i prou et deixa el fitxer al Drive per sempre
     sense saber de què és, i esborrar-la del Drive i prou et deixa el full
     guardant la referència d'una cosa que ja no hi és —i a l'app hi veuries
     una imatge trencada.

     A LA PAPERERA, NO ESBORRADA. Una foto del cos feta un dia concret no es
     pot tornar a fer, i aquí no s'esborra res de manera definitiva. Al Drive
     hi queda trenta dies i la pots recuperar; passat aquest temps, ho decideix
     Google, no nosaltres.

     Si el fitxer ja no hi és —perquè l'has tret tu del Drive—, no és cap
     error: la referència es neteja igual, que és justament el que calia. */
  function esborraFoto(data, angle) {
    if (['frontal', 'perfil', 'esquena'].indexOf(angle) === -1) {
      throw new Error('L\'angle ha de ser frontal, perfil o esquena.');
    }

    var files = Dades.llegeix('Seguiment', { data: data });
    var id = files.length ? String(files[0]['foto_' + angle] || '') : '';

    var paperera = false;
    if (id) {
      try {
        DriveApp.getFileById(id).setTrashed(true);
        paperera = true;
      } catch (err) {
        Log.avis('seguiment.foto', 'No he pogut llençar el fitxer: ' + err.message);
      }
    }

    var canvis = {};
    canvis['foto_' + angle] = '';
    Dades.desa('Seguiment', mescla_({ data: data }, canvis), ['data'], 'seg');

    Log.info('seguiment.foto', 'Foto treta', { data: data, angle: angle, paperera: paperera });
    return { tret: true, paperera: paperera };
  }

  function mescla_(a, b) {
    var r = {};
    for (var k in a) r[k] = a[k];
    for (var j in b) r[j] = b[j];
    return r;
  }

  // ------------------------------------------------------- LA VEU DEL COACH
  /* NOMÉS QUAN LA DEMANES.
     El veredicte i els avisos surten de les regles i són instantanis. Això és
     un extra: una lectura més fina, que costa una petició i uns segons. Si el
     límit del proveïdor està cremat, la pantalla segueix sencera i només falta
     aquest paràgraf. */
  function comenta(data) {
    var h = controls();
    var i = -1;
    for (var k = 0; k < h.length; k++) if (h[k].data === data) i = k;
    if (i < 0) throw new Error('No hi ha cap control d\'aquell dia.');

    var plaM = pla();
    var f = faseDe(plaM, h[i].data);
    var avisos = analitza(h, i);

    if (!IA.disponible()) throw new Error(IA.motiu() || 'La capa d\'IA no està disponible.');

    var dades =
      (f ? 'Fase: ' + f.nom + (f.objectiu ? ' — ' + f.objectiu : '') + '\n' : '') +
      'Control del ' + h[i].data + ':\n' + linia_(h[i]) + '\n' +
      (i > 0 ? 'Anterior (' + h[i - 1].data + '): ' + linia_(h[i - 1]) + '\n' : '') +
      '\nEl que han detectat les regles:\n' +
      (avisos.length ? avisos.map(function (a) { return '- ' + a.text; }).join('\n')
                     : '- res destacable') +
      '\n\nNo repeteixis aquests avisos tal qual: lliga\'ls i digues què vol dir de conjunt.';

    var r = IA.genera({
      sistema: 'Ets el preparador d\'en Pol i li parles directe, sense floritures i sense ' +
               'sermons. Reconeix clarament el que ha fet bé. Quan una dada no quadra, ' +
               'digues-ho sense embuts però explica el perquè fisiològic. No repeteixis ' +
               'coses que ja se sap. Ell prioritza el trail conscientment: respecta-ho, ' +
               'digues el preu una vegada i segueix. Màxim 90 paraules, en català, sense ' +
               'llistes ni titolets.',
      missatges: [{ role: 'user', parts: [{ text: dades }] }],
      model: 'barat',
      maxTokens: 300,
      temperatura: 0.4
    });
    return { comentari: String(r && r.text || '').trim(), data: data };
  }

  function linia_(c) {
    var t = [];
    if (c.pes !== null) t.push(coma(c.pes) + ' kg');
    if (c.cintura !== null) t.push('cintura ' + coma(c.cintura) + ' cm' + (c.cinturaValida ? '' : ' (invàlida)'));
    if (c.forca !== null) t.push(c.forca + ' força');
    if (c.trail !== null) t.push(c.trail + ' trail' + (c.trailGros ? ' (' + c.trailGros + ' grossa)' : ''));
    if (c.energia) t.push('energia ' + c.energia);
    if (c.son) t.push('son ' + c.son);
    if (c.gana) t.push('gana ' + c.gana);
    if (c.dieta) t.push('dieta ' + c.dieta);
    return t.join(' · ');
  }

  // ------------------------------------------------------ CONTEXT I RESUMS
  /* CURT, com mana el contracte. El pla sencer no hi cap ni hi ha de cabre:
     el que ha de saber sempre és on ets i què toca. La resta la demana amb
     l'eina si li fa falta. */
  function contextIA() {
    var h = controls();
    var plaM = pla();
    var e = estat();
    var f = faseDe(plaM, Utils.avui());

    if (!h.length) {
      return 'Seguiment físic: encara no hi ha cap control' +
             (e.pendent ? '. Avui en toca un.' : '.');
    }
    var u = h[h.length - 1];
    var t = ['Seguiment físic' + (f ? ' · fase: ' + f.nom + (f.objectiu ? ' (' + f.objectiu + ')' : '') : '') + ':'];
    t.push('- Últim control (' + u.data + ', fa ' + e.fa + ' dies): ' + linia_(u));
    if (h.length > 1) {
      var v = analitza(h, h.length - 1);
      t.push('- Veredicte: ' + veredicte(v).toLowerCase() + '.');
      if (v.length) t.push('- ' + v.map(function (a) { return a.text.split('.')[0] + '.'; }).join(' '));
    }
    if (e.pendent) t.push('- HI HA UN CONTROL PENDENT avui.');
    if (plaM['pla.resum']) t.push('- Pla: ' + plaM['pla.resum']);
    return t.join('\n');
  }

  function resumPeriode(desde, fins) {
    var h = controls().filter(function (c) { return c.data >= desde && c.data <= fins; });
    if (!h.length) return null;
    var tots = controls();
    var linies = h.map(function (c) {
      var i = tots.map(function (x) { return x.data; }).indexOf(c.data);
      return c.data + ': ' + linia_(c) + ' — ' + veredicte(analitza(tots, i)).toLowerCase();
    });
    return { titol: 'Seguiment físic', linies: linies };
  }

  function perALaIA(quants) {
    var h = controls();
    var n = Math.max(1, Math.min(52, Number(quants) || 12));
    var tall = h.slice(Math.max(0, h.length - n));
    return {
      files: h.length,
      controls: tall.slice().reverse().map(function (c, k) {
        var i = h.length - 1 - k;
        return {
          data: c.data, pes: c.pes, cintura: c.cintura, cinturaValida: c.cinturaValida,
          forca: c.forca, trail: c.trail, trailGros: c.trailGros,
          energia: c.energia, son: c.son, gana: c.gana, dieta: c.dieta,
          veredicte: veredicte(analitza(h, i))
        };
      })
    };
  }

  return {
    pantalla: pantalla,
    estat: estat,
    desaControl: desaControl,
    carpetaFotos: carpeta_,
    pujaFoto: pujaFoto,
    esborraFoto: esborraFoto,
    comenta: comenta,
    contextIA: contextIA,
    resumPeriode: resumPeriode,
    perALaIA: perALaIA,
    analitza: analitza,
    veredicte: veredicte,
    LLINDAR: LLINDAR
  };
})();
