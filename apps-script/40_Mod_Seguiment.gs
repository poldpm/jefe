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
    /* «Seguiment» a seques era massa global i es confonia amb qualsevol altra
       cosa. D'aquí surten el menú, el tauler d'apartats i el títol de les
       notificacions: el nucli agafa el nom del registre, i canviant-lo aquí
       canvia a tot arreu alhora.

       EL FULL SEGUEIX DIENT-SE «Seguiment» i no s'ha de tocar mai: allà hi ha
       l'històric, i canviar-li el nom el deixaria orfe. Igual amb la carpeta
       de fotos del Drive. El que canvia és com se'n diu, no on és. */
    nom: 'Seguiment FitFat',
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

      /* MIRAR-SE LES FOTOS DE DEBÒ.
         Les fotos no són una galeria: la galeria ja la té al telèfon. Són la
         part del seguiment que la bàscula no diu, i qui les ha de llegir és
         qui pot posar la primera i l'última una sobre l'altra. Costa una
         petició i uns segons, i per això no passa mai sola. */
      analitzaFotos: function (p) { return Seguiment.analitzaFotos(p && p.data); },

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
       L'hora és la que és a posta: el que has de fer és pesar-te i mesurar-te
       EN DEJÚ, abans de cafè i abans de moure't. Omplir sis camps ja ho faràs
       quan puguis —el control es queda pendent al dia i a l'inici fins que el
       despatxis—, però la mesura, si te la saltes, ja no la pots recuperar
       fins divendres que ve.

       PER QUÈ LES SIS I NO LES SET. Perquè a les set ja no hi ets. Amb l'avís
       a les set arribava amb el dia començat —un divendres va picar a les
       7:37, camí de l'escola— i llavors ja no serveix de res: la mesura s'ha
       de fer abans de llevar-se del tot, no quan surts per la porta. A les sis
       el pic arriba abans que et moguis, que és l'únic moment en què encara la
       pots fer.

       Si ja l'has fet, no pica: un avís que arriba tant si toca com si no
       deixa de voler dir res al cap de tres setmanes. */
    avisos: [{
      id: 'control',
      hora: 6,
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

    /* El control setmanal ja ve per setmanes, i porta l'única cosa que no
       surt de cap altre lloc: com dorms, quina energia tens, quina gana. */
    seriesDiaries: function (desde, fins) { return Seguiment.seriesDiaries(desde, fins); },
    /**
     * El control setmanal que toca i encara no has fet. És una setmana que es
     * perd de la sèrie, i la sèrie és tot el que té valor aquí.
     */
    senyals:      function () { return Seguiment.senyals(); },

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
    }, {
      nom: 'ensenya_la_mesura',
      descripcio: 'ENSENYA la gràfica d\'una mesura del seguiment físic —pes, cintura, ' +
                  'força o trail— en un plafó a sobre de la conversa. Fes-la servir ' +
                  'sempre que et demani VEURE o ENSENYAR un gràfic o una evolució: ' +
                  '«ensenya\'m el gràfic del pes», «com va la cintura?», «vull veure ' +
                  'com he anat de pes». Un cop cridada ell ja té el dibuix al davant: ' +
                  'no l\'hi descriguis punt per punt, digues-li com a molt una frase ' +
                  'sobre la forma de la línia.',
      mostra: 'seguiment.mesura',
      esquema: {
        type: 'object',
        properties: {
          quina: { type: 'string',
                   description: 'pes, cintura, forca o trail. Si s\'omet, el pes.' }
        }
      },
      executa: function (args) { return Seguiment.mesuraPerAEnsenyar(args); }
    }, {
      /* AQUESTA ÉS LA RAÓ DE SER DEL MÒDUL, DITA AMB LA BOCA.
         El pic de divendres arriba a les sis del matí, en dejú, amb el telèfon
         a la tauleta: escriure sis camps allà és exactament el moment en què no
         ho faràs. Dient «peso 78,4 i cintura 86» ja està. */
      nom: 'apunta_el_control',
      descripcio: 'Apunta el control setmanal de seguiment físic: pes, cintura, sessions ' +
                  'de força, sortides de trail i com es troba. Fes-la servir quan et digui ' +
                  'qualsevol d\'aquestes coses: «peso 78 i mig», «cintura 86», «aquesta ' +
                  'setmana he fet tres de força i dues sortides», «una era llarga», ' +
                  '«vaig baix d\'energia».\n' +
                  'NO CAL QUE HO DIGUI TOT DE COP: el que no diu, no es toca. Si el ' +
                  'control d\'aquell dia ja existeix, s\'hi afegeix el que digui ara i la ' +
                  'resta es queda com estava.\n' +
                  'El pes va en quilos amb decimals («setanta-vuit i mig» és 78.5) i la ' +
                  'cintura en centímetres. NO s\'executa directament: genera una proposta ' +
                  'que en Pol ha de confirmar, amb el botó o dient-ho.',
      escriu: true,
      esquema: {
        type: 'object',
        properties: {
          pes:      { type: 'number', description: 'Quilos, amb decimals' },
          cintura:  { type: 'number', description: 'Centímetres' },
          forca:    { type: 'integer', description: 'Sessions de força de la setmana' },
          trail:    { type: 'integer', description: 'Sortides de trail de la setmana' },
          trailGros: { type: 'integer', description: 'De les sortides de trail, quantes eren ' +
                                                     'llargues o dures (les que deixen buit)' },
          energia:  { type: 'string', description: 'baixa, normal o alta' },
          son:      { type: 'string', description: 'malament, normal o bé' },
          gana:     { type: 'string', description: 'poca, normal o molta' },
          notes:    { type: 'string', description: 'El que digui i no càpiga enlloc més' },
          data:     { type: 'string', description: 'Dia del control AAAA-MM-DD. Si s\'omet, avui.' }
        }
      },
      etiqueta: function (a) {
        var q = [];
        if (a.pes !== undefined && a.pes !== null) q.push(a.pes + ' kg');
        if (a.cintura !== undefined && a.cintura !== null) q.push('cintura ' + a.cintura + ' cm');
        if (a.forca !== undefined && a.forca !== null) q.push(a.forca + ' de força');
        if (a.trail !== undefined && a.trail !== null) q.push(a.trail + ' de trail');
        if (a.energia) q.push('energia ' + a.energia);
        if (a.son) q.push('son ' + a.son);
        if (a.gana) q.push('gana ' + a.gana);
        if (a.notes) q.push('«' + Utils.talla(String(a.notes), 40) + '»');
        return 'Control ' + (a.data ? 'del ' + a.data : 'd\'avui') +
               (q.length ? ': ' + q.join(' · ') : ' (sense cap dada)');
      },
      executa: function (a) { return Seguiment.apuntaPerNom(a); }
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
        text: cur.trailGros + (cur.trailGros === 1 ? ' sortida llarga' : ' sortides llargues') +
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
              'A aquest ritme part del que se\'n va és múscul. Menja més els dies de sortida llarga.' });
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

  /**
   * ══════════════════════════════════════════════════════════════════════
   * EL CONTROL, DIT A TROSSOS
   * ══════════════════════════════════════════════════════════════════════
   *
   * Ve de la conversa: «peso 78,4», i d'aquí a una estona «i he fet tres de
   * força». Són dues frases i un sol control.
   *
   * PER QUÈ NO CRIDA `desaControl` DIRECTAMENT. Perquè `desaControl` escriu
   * la fila SENCERA: és el que ha de fer, perquè ve del formulari de la
   * pantalla, on hi són tots els camps a la vegada i el que has deixat en
   * blanc l'has deixat en blanc a posta. Dit de paraula és al revés: el que
   * no dius no és un zero, és una cosa de la qual no has parlat. Cridar-lo
   * amb el pes tot sol posaria la cintura a buit i la força a zero, i el
   * control de divendres quedaria mig esborrat per haver dit el pes.
   *
   * Per això aquí es llegeix primer el que ja hi ha d'aquell dia i s'hi
   * escriu a sobre només el que porta. La resta hi torna igual.
   */
  function apuntaPerNom(a) {
    a = a || {};
    var data = Utils.esDataValida(a.data) ? a.data : Utils.avui();

    var jaHiEra = controls().filter(function (c) { return c.data === data; })[0] || null;
    var fila = {
      data: data,
      pes: jaHiEra ? jaHiEra.pes : null,
      cintura: jaHiEra ? jaHiEra.cintura : null,
      cinturaValida: jaHiEra ? jaHiEra.cinturaValida : true,
      forca: jaHiEra ? jaHiEra.forca : 0,
      trail: jaHiEra ? jaHiEra.trail : 0,
      trailGros: jaHiEra ? jaHiEra.trailGros : 0,
      energia: jaHiEra ? jaHiEra.energia : '',
      son: jaHiEra ? jaHiEra.son : '',
      gana: jaHiEra ? jaHiEra.gana : '',
      dieta: jaHiEra ? jaHiEra.dieta : '',
      notes: jaHiEra ? jaHiEra.notes : ''
    };

    var posats = [];
    [['pes', 'pes'], ['cintura', 'cintura'], ['forca', 'força'],
     ['trail', 'trail'], ['trailGros', 'sortides llargues']].forEach(function (par) {
      var v = num_(a[par[0]]);
      if (v === null) return;
      fila[par[0]] = v;
      posats.push(par[1]);
    });
    ['energia', 'son', 'gana', 'dieta'].forEach(function (k) {
      if (!a[k]) return;
      fila[k] = String(a[k]).toLowerCase();
      posats.push(k);
    });

    /* Les notes S'ACUMULEN. Són l'únic camp on el que vas dir dilluns i el que
       dius divendres són dues coses i totes dues valen; substituir-les faria
       que la segona frase esborrés la primera sense avisar. */
    if (a.notes) {
      var nou = String(a.notes).trim();
      fila.notes = fila.notes && fila.notes.indexOf(nou) === -1
        ? fila.notes + '. ' + nou : (fila.notes || nou);
      posats.push('notes');
    }

    if (!posats.length) throw new Error('No m\'has dit cap dada del control.');

    var r = desaControl(fila);
    return {
      desat: true, data: data, posats: posats,
      nou: !jaHiEra,
      control: { pes: fila.pes, cintura: fila.cintura, forca: fila.forca,
                 trail: fila.trail, energia: fila.energia },
      id: r.id
    };
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
    if (c.trail !== null) t.push(c.trail + ' trail' +
      (c.trailGros ? ' (' + c.trailGros + (c.trailGros === 1 ? ' llarga' : ' llargues') + ')' : ''));
    if (c.energia) t.push('energia ' + c.energia);
    if (c.son) t.push('son ' + c.son);
    if (c.gana) t.push('gana ' + c.gana);
    if (c.dieta) t.push('dieta ' + c.dieta);
    return t.join(' · ');
  }

  /**
   * ══════════════════════════════════════════════════════════════════════
   * QUÈ ES VEU A LES FOTOS
   * ══════════════════════════════════════════════════════════════════════
   *
   * PER QUÈ EXISTEIX AIXÒ. Les fotos portaven un any servint per mirar-se-les,
   * i mirar-se-les no serveix de res: ell ja es veu cada dia al mirall, i dues
   * fotos separades per un mes se li assemblen. Fer-les tenia sentit perquè
   * algú les comparés de debò; qui les pot comparar és qui pot posar la
   * primera i l'última una al costat de l'altra i dir on ha canviat el
   * contorn. Fins ara aquí només hi havia una galeria, o sigui que la feina
   * de fer-les no la cobrava ningú.
   *
   * COM ES TRIEN. Per angle, la MÉS VELLA i la del control que estàs mirant.
   * La comparació que val és la del mateix angle separada pel màxim de temps
   * possible: dues de seguides no diuen res perquè encara no hi ha res per
   * veure-hi. Si un angle no té foto en aquest control, s'agafa l'última que
   * en tingui —val més comparar amb la de fa quinze dies que no comparar.
   *
   * HI VAN LES XIFRES AL COSTAT. Sense elles la lectura és una impressió; amb
   * elles pot dir la cosa que de debò val: que el pes hagi baixat i el contorn
   * no, o al revés.
   *
   * NO ES DESA ENLLOC. És una lectura, no una dada: el que compta i es guarda
   * són els números. El navegador se'n recorda perquè tornar a obrir la
   * pantalla no et costi una altra petició.
   */
  var ANGLES = [['frontal', 'de front'], ['perfil', 'de perfil'], ['esquena', 'd\'esquena']];

  function fotoPart_(id) {
    var blob = DriveApp.getFileById(id).getBlob();
    var mena = String(blob.getContentType() || '');
    if (mena.indexOf('image/') !== 0) mena = 'image/jpeg';
    return { inlineData: { mimeType: mena, data: Utilities.base64Encode(blob.getBytes()) } };
  }

  function analitzaFotos(data) {
    var h = controls();
    if (!h.length) throw new Error('Encara no hi ha cap control.');

    var i = h.length - 1;
    for (var k = 0; k < h.length; k++) if (h[k].data === data) i = k;
    var cur = h[i];

    if (!IA.disponible()) throw new Error(IA.motiu() || 'La capa d\'IA no està disponible.');

    var jocs = [];
    ANGLES.forEach(function (a) {
      var ara = null;
      for (var k2 = i; k2 >= 0; k2--) if (h[k2].fotos[a[0]]) { ara = h[k2]; break; }
      if (!ara) return;
      var abans = null;
      for (var j = 0; j < h.length; j++) if (h[j].fotos[a[0]]) { abans = h[j]; break; }
      if (abans && abans.data === ara.data) abans = null;
      jocs.push({ angle: a, ara: ara, abans: abans });
    });

    if (!jocs.length) throw new Error('Encara no hi ha cap foto per mirar.');

    var f = faseDe(pla(), cur.data);
    var parts = [{ text:
      'Fotos de seguiment físic, sempre la mateixa persona i sempre el mateix protocol ' +
      '(mateix lloc, mateixa llum, càmera a l\'alçada del melic).' +
      (f ? ' Fase actual: ' + f.nom + (f.objectiu ? ' — ' + f.objectiu : '') + '.' : '') +
      ' Van per angle. Quan d\'un angle n\'hi ha dues, la primera és la més antiga i la ' +
      'segona la d\'ara; al costat de cadascuna hi ha les xifres d\'aquell dia.' }];

    var quantes = 0, desde = null;
    jocs.forEach(function (jc) {
      if (jc.abans) {
        try {
          var p1 = fotoPart_(jc.abans.fotos[jc.angle[0]]);
          parts.push({ text: 'Vista ' + jc.angle[1] + ' — ABANS, ' + jc.abans.data +
                             ' (' + linia_(jc.abans) + '):' });
          parts.push(p1);
          quantes++;
          if (!desde || jc.abans.data < desde) desde = jc.abans.data;
        } catch (err) {
          Log.avis('seguiment.fotos', 'No he pogut llegir una foto: ' + err.message);
        }
      }
      try {
        var p2 = fotoPart_(jc.ara.fotos[jc.angle[0]]);
        parts.push({ text: 'Vista ' + jc.angle[1] + ' — ARA, ' + jc.ara.data +
                           ' (' + linia_(jc.ara) + '):' });
        parts.push(p2);
        quantes++;
      } catch (err2) {
        Log.avis('seguiment.fotos', 'No he pogut llegir una foto: ' + err2.message);
      }
    });

    if (!quantes) throw new Error('Les fotos són al full però no s\'han pogut llegir del Drive.');

    var r = IA.genera({
      /* LA INSTRUCCIÓ ÉS LA MEITAT DE LA FEINA. Sense demanar-li ON mira,
         contesta el que contesten tots: que es veu progrés i que segueixi
         així. El que ell no es pot dir sol és on s'acumula, què s'ha mogut i
         què no, i si la postura o la llum li estan enganyant la comparació. */
      sistema: 'Ets el preparador d\'en Pol i li llegeixes les fotos de seguiment: ' +
               'la lectura que ell no es pot fer sol, perquè es veu cada dia al mirall i ' +
               'no sap comparar-se amb si mateix.\n' +
               'Mira les imatges abans de dir res i digues QUÈ HI VEUS I ON: on s\'acumula ' +
               'el greix, com estan el contorn de la cintura i el maluc, quina massa es veu a ' +
               'espatlles, esquena, braços i cames, i si la postura, la llum o l\'enquadrament ' +
               'poden estar enganyant la comparació.\n' +
               'Quan d\'un angle hi hagi dues fotos, digues què ha canviat i on, amb concreció. ' +
               'Si no es veu cap canvi, digues-ho clar: inventar-ne un és el pitjor que pots fer ' +
               'aquí, perquè llavors les fotos deixen de servir.\n' +
               'Lliga-ho amb les xifres: si el pes ha baixat i el contorn no s\'ha mogut, o al ' +
               'revés, això és el que li interessa saber.\n' +
               'Ni afalagar ni sermonejar. Català, entre 120 i 200 paraules, dos o tres ' +
               'paràgrafs curts, sense llistes ni titolets. Acaba amb una sola cosa concreta a fer.',
      missatges: [{ role: 'user', parts: parts }],
      model: 'bo',
      maxTokens: 900,
      temperatura: 0.3
    });

    Log.info('seguiment.fotos', 'Fotos llegides', { data: cur.data, fotos: quantes });
    return {
      comentari: String(r && r.text || '').trim(),
      data: cur.data, fotos: quantes, desde: desde
    };
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
      return 'Seguiment FitFat: encara no hi ha cap control' +
             (e.pendent ? '. Avui en toca un.' : '.');
    }
    var u = h[h.length - 1];
    var t = ['Seguiment FitFat' + (f ? ' · fase: ' + f.nom + (f.objectiu ? ' (' + f.objectiu + ')' : '') : '') + ':'];
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

  /**
   * El control setmanal, com a números per creuar.
   *
   * AQUÍ JA VE PER SETMANES: una fila cada diumenge. Per això `minimDies` és
   * 1 —una pesada ÉS la dada d'aquella setmana— i l'agregació és la mitjana,
   * que amb un sol valor és aquell valor.
   *
   * LES SENSACIONS TAMBÉ SÓN NÚMEROS. «Malament / normal / bé» és un ordre,
   * i Spearman treballa amb ordres: convertir-ho a 1-2-3 no s'inventa cap
   * distància perquè les distàncies no les mira. Sense això, la meitat
   * interessant del control —com dorms, quina gana tens— no es podria creuar
   * amb res, i és justament la que no surt de cap altre lloc.
   *
   * LES FAMÍLIES separen el que seria trivial: pes i cintura van junts per
   * definició, i les quatre sensacions es responen el mateix dia i de la
   * mateixa tirada.
   */
  function seriesDiaries(desde, fins) {
    var h = controls().filter(function (c) { return c.data >= desde && c.data <= fins; });
    if (h.length < 8) return [];

    var ESCALA = {
      energia: { baixa: 1, normal: 2, alta: 3 },
      son:     { malament: 1, normal: 2, 'bé': 3, be: 3 },
      gana:    { poca: 1, normal: 2, molta: 3 },
      dieta:   { malament: 1, 'a mitges': 2, 'bé': 3, be: 3 }
    };

    var treu = function (camp, mapa) {
      var dies = {};
      h.forEach(function (c) {
        var v = mapa ? mapa[String(c[camp]).toLowerCase()] : c[camp];
        if (v === null || v === undefined || v === '' || !isFinite(Number(v))) return;
        if (!mapa && Number(v) === 0) return;      // 0 al full vol dir «no ho vaig posar»
        dies[c.data] = Number(v);
      });
      return dies;
    };

    var fes = function (id, nom, unitat, dies, familia, amunt) {
      if (Object.keys(dies).length < 8) return null;
      return { id: id, nom: nom, unitat: unitat, agrega: 'mitjana',
               familia: familia, minimDies: 1, millorAmunt: amunt, dies: dies };
    };

    return [
      fes('pes', 'pes', 'kg', treu('pes'), 'cos', false),
      fes('cintura', 'cintura', 'cm', treu('cintura'), 'cos', false),
      fes('forca', 'força', '', treu('forca'), 'esforc', true),
      fes('trail', 'trail', '', treu('trail'), 'esforc', true),
      fes('energia', 'energia', '', treu('energia', ESCALA.energia), 'sensacions', true),
      fes('son', 'son', '', treu('son', ESCALA.son), 'sensacions', true),
      fes('gana', 'gana', '', treu('gana', ESCALA.gana), 'sensacions', null),
      fes('dieta', 'dieta seguida', '', treu('dieta', ESCALA.dieta), 'sensacions', true)
    ].filter(Boolean);
  }

  function resumPeriode(desde, fins) {
    var h = controls().filter(function (c) { return c.data >= desde && c.data <= fins; });
    if (!h.length) return null;
    var tots = controls();
    var linies = h.map(function (c) {
      var i = tots.map(function (x) { return x.data; }).indexOf(c.data);
      return c.data + ': ' + linia_(c) + ' — ' + veredicte(analitza(tots, i)).toLowerCase();
    });
    return { titol: 'Seguiment FitFat', linies: linies };
  }

  /**
   * Quina mesura s'ha d'ensenyar al visor.
   *
   * Torna `_params` perquè el client sàpiga quina obrir, i les xifres de
   * les puntes perquè JEFE en pugui dir una frase sense demanar res més. El
   * dibuix no es fa aquí: el fa la pantalla, que és qui el sap fer.
   */
  function mesuraPerAEnsenyar(a) {
    var MESURES = {
      pes:     { nom: 'pes',     camp: 'pes',     unitat: 'kg' },
      cintura: { nom: 'cintura', camp: 'cintura', unitat: 'cm' },
      forca:   { nom: 'força',   camp: 'forca',   unitat: '' },
      trail:   { nom: 'trail',   camp: 'trail',   unitat: '' }
    };
    var demanat = Utils.aixafa(String((a && a.quina) || 'pes'));
    var clau = 'pes';
    for (var k in MESURES) {
      if (Utils.aixafa(MESURES[k].nom) === demanat || k === demanat) { clau = k; break; }
    }
    var m = MESURES[clau];

    var punts = controls().filter(function (c) {
      if (c[m.camp] === null || c[m.camp] === undefined || c[m.camp] === '') return false;
      if (clau === 'cintura' && !c.cinturaValida) return false;
      return true;
    });

    return {
      _params: { quina: clau },
      pantalla: 'oberta',
      mesura: m.nom,
      files: punts.length,
      primer: punts.length ? punts[0][m.camp] : null,
      ultim: punts.length ? punts[punts.length - 1][m.camp] : null,
      unitat: m.unitat
    };
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

  /**
   * EL CONTROL DE LA SETMANA, QUE JA TOCAVA.
   *
   * Una setmana sense control és una setmana que desapareix de la sèrie, i
   * aquí el valor és justament la sèrie: una xifra sola no diu res.
   */
  function senyals() {
    var e = estat();
    if (!e.pendent) return [];
    if (e.fa !== null && e.fa < 8) return [];
    return [{
      id: 'seg_control:' + e.avui,
      titol: 'Seguiment FitFat',
      text: (e.fa === null ? 'Encara no hi ha cap control.'
                           : 'Fa ' + e.fa + ' dies de l\'últim control.') +
            ' Són dues xifres i trenta segons; sense elles, la setmana no compta.',
      urgencia: 1,
      accio: 'seguiment'
    }];
  }

  return {
    senyals: senyals,
    pantalla: pantalla,
    estat: estat,
    desaControl: desaControl,
    apuntaPerNom: apuntaPerNom,
    carpetaFotos: carpeta_,
    pujaFoto: pujaFoto,
    esborraFoto: esborraFoto,
    comenta: comenta,
    analitzaFotos: analitzaFotos,
    contextIA: contextIA,
    resumPeriode: resumPeriode,
    seriesDiaries: seriesDiaries,
    perALaIA: perALaIA,
    mesuraPerAEnsenyar: mesuraPerAEnsenyar,
    analitza: analitza,
    veredicte: veredicte,
    LLINDAR: LLINDAR
  };
})();
