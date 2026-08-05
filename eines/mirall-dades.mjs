/**
 * JEFE — les dades inventades del mirall
 *
 * Viuen a part perquè `mirall.mjs` no acabi sent un fitxer de mil línies on
 * el que importa —com s'enganxa el servidor fals— quedi enterrat.
 *
 * NO S'ASSEMBLEN A LES D'EN POL A POSTA. Noms, xifres i comerços són
 * inventats, i la pàgina ho diu amb una barra vermella a sota. El que sí que
 * s'assembla és la FORMA: quantitats realistes, noms llargs i curts, i prou
 * files per fer aparèixer els problemes que només surten quan n'hi ha moltes.
 */

export function dades(AVUI, menys) {

  // ------------------------------------------------------------------ hàbits

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

  const habitsDia = (data) => ({
    data, esAvui: data === AVUI, esFutur: false, diaSetmana: 3,
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
  });

  const habitsMes = () => {
    const calendari = [];
    for (let i = 29; i >= 0; i--) calendari.push(menys(i));
    /* Els comptadors, per dibuixar-ne la corba. Inventats i irregulars a
       posta: amb una sèrie plana, un gràfic sempre queda bé. */
    const comptadors = HABITS.filter((h) => h.esComptador).map((h) => {
      const dies = [];
      for (let i = 89; i >= 0; i--) {
        const base = 9 - Math.floor((89 - i) / 30) * 1.5;
        const v = Math.max(0, Math.round(base + 3 * Math.sin(i / 2.3) + ((i * 7) % 5) - 2));
        dies.push({ data: menys(i), valor: i === 0 ? h.valor : v });
      }
      const perMes = {};
      dies.forEach((d) => { const m = d.data.slice(0, 7); perMes[m] = (perMes[m] || 0) + d.valor; });
      return { id: h.id, nom: h.nom, unitat: h.unitat || '', dies,
               mesos: Object.keys(perMes).sort().map((m) => ({ mes: m, total: perMes[m] })) };
    });

    return {
      desde: calendari[0], fins: calendari[29], avui: AVUI, calendari, comptadors,
      habits: HABITS.filter(h => !h.esComptador).map((h, n) => ({
        id: h.id, nom: h.nom, pct30: h.pct30, ratxa: h.ratxa || 0, unitatRatxa: 'dies',
        celles: calendari.map((d, i) => {
          const fet = ((i * 7 + n * 3) % 10) < (h.pct30 / 10);
          return { data: d, estat: fet ? 'fet' : 'nofet', altitud: fet ? 1 : 0 };
        })
      }))
    };
  };

  const habitsHistoric = (id) => {
    const h = HABITS.filter(x => x.id === id)[0] || HABITS[0];
    const calendari = [];
    for (let i = 34; i >= 0; i--) {
      const v = h.esComptador ? Math.max(0, Math.round(5 + 4 * Math.sin(i / 3)))
                              : (((i * 5) % 7) < 4 ? (h.objectiu || 1) : 0);
      calendari.push({ data: menys(i), valor: v, registrat: true,
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
        : { unitatRatxa: 'dies', pct30: h.pct30, pct7: h.pct30,
            ratxa: h.ratxa || 0, ratxaMax: (h.ratxa || 0) + 4 },
      calendari
    };
  };

  // --------------------------------------------------------------- nutrició

  const ALIMENTS = [
    { id: 'a1', nom: 'Tonyina al natural', kcal100: 116, prot100: 25.5 },
    { id: 'a2', nom: 'Arròs bullit', kcal100: 130, prot100: 2.7 },
    { id: 'a3', nom: 'Iogurt natural sense sucre', kcal100: 61, prot100: 3.5 },
    { id: 'a4', nom: 'Pit de pollastre a la planxa', kcal100: 165, prot100: 31 },
    { id: 'a5', nom: 'Pa integral', kcal100: 247, prot100: 8.5 },
    { id: 'a6', nom: 'Oli d\'oliva', kcal100: 884, prot100: 0 }
  ];

  const item = (id, nom, grams, kcal100, prot100) => ({
    id, nom, grams, kcal100, prot100,
    kcal: grams * kcal100 / 100, prot: grams * prot100 / 100
  });

  const nutriDia = (data) => {
    const apats = [
      { clau: 'dinar', nom: 'Dinar', items: [
        item('i1', 'Arròs bullit', 180, 130, 2.7),
        item('i2', 'Pit de pollastre a la planxa', 150, 165, 31),
        item('i3', 'Oli d\'oliva', 10, 884, 0)
      ] },
      { clau: 'berenar', nom: 'Berenar', items: [
        item('i4', 'Iogurt natural sense sucre', 250, 61, 3.5)
      ] },
      { clau: 'sopar', nom: 'Sopar', items: [
        item('i5', 'Tonyina al natural', 120, 116, 25.5),
        item('i6', 'Pa integral', 60, 247, 8.5)
      ] }
    ].map(a => ({
      ...a,
      kcal: a.items.reduce((s, i) => s + i.kcal, 0),
      proteina: a.items.reduce((s, i) => s + i.prot, 0)
    }));

    const totals = {
      ingerides: apats.reduce((s, a) => s + a.kcal, 0),
      proteina: apats.reduce((s, a) => s + a.proteina, 0)
    };
    const cremades = 2680;
    const net = cremades - totals.ingerides;
    return {
      data, apats, totals,
      activitat: cremades, teActivitat: true, cremades, teCremades: true, net,
      objectius: { deficit: 500, proteina: 140 },
      verdicte: { estat: net >= 500 ? 'deficit_assolit' : 'deficit',
                  text: 'Dèficit de ' + Math.round(net) + ' kcal' +
                        (net >= 500 ? ' — objectiu assolit' : '') }
    };
  };

  const nutriPeriode = (tipus) => {
    const n = tipus === 'setmana' ? 7 : 30;
    const dies = [];
    for (let i = n - 1; i >= 0; i--) {
      const apuntat = i % 5 !== 0;
      const ingerides = apuntat ? 1900 + ((i * 137) % 500) : 0;
      const teCremades = apuntat && i % 7 !== 3;
      const cremades = teCremades ? 2500 + ((i * 91) % 400) : null;
      dies.push({ data: menys(i), ingerides, proteina: apuntat ? 110 + ((i * 13) % 60) : 0,
                  cremades, net: teCremades ? cremades - ingerides : null, apuntat });
    }
    const amb = dies.filter(d => d.net !== null);
    const ap = dies.filter(d => d.apuntat);
    const suma = (a, c) => a.reduce((s, f) => s + (f[c] || 0), 0);
    return {
      tipus, data: AVUI, desde: dies[0].data, fins: dies[dies.length - 1].data, dies,
      diesApuntats: ap.length, diesAmbBalanc: amb.length,
      mitjanaIngerides: ap.length ? suma(ap, 'ingerides') / ap.length : 0,
      mitjanaProteina: ap.length ? suma(ap, 'proteina') / ap.length : 0,
      mitjanaNet: amb.length ? suma(amb, 'net') / amb.length : 0,
      netAcumulat: suma(amb, 'net'),
      objectius: { deficit: 500, proteina: 140 }
    };
  };

  const nutriPantalla = (p) => ({
    periode: p.periode || 'dia',
    dades: (p.periode || 'dia') === 'dia' ? nutriDia(p.data || AVUI) : nutriPeriode(p.periode),
    aliments: (p.periode || 'dia') === 'dia' ? ALIMENTS : [],
    ajustos: { objectiuDeficit: 500, objectiuProteina: 140 }
  });

  // --------------------------------------------------------------- finances

  const CATEGORIES = [
    { id: 'c_alim', nom: 'Alimentació', emoji: '', mena: 'd', color: '', exclou: false },
    { id: 'c_casa', nom: 'Casa', emoji: '', mena: 'd', color: '', exclou: false },
    { id: 'c_cotx', nom: 'Cotxe i benzina', emoji: '', mena: 'd', color: '', exclou: false },
    { id: 'c_oci',  nom: 'Oci', emoji: '', mena: 'd', color: '', exclou: false },
    { id: 'c_altd', nom: 'Altres despeses', emoji: '', mena: 'd', color: '', exclou: false },
    { id: 'c_tras', nom: 'Traspassos', emoji: '', mena: 'd', color: '', exclou: true },
    { id: 'i_nom',  nom: 'Nòmina', emoji: '', mena: 'i', color: '', exclou: false },
    { id: 'i_alti', nom: 'Altres ingressos', emoji: '', mena: 'i', color: '', exclou: false }
  ];

  const MOVS = [
    { id: 'm1', data: menys(0), tipus: 'd', import: 43.28, categoria: 'c_alim', descripcio: 'SUPERMERCAT DEL POBLE', metode: 'targeta', revisat: true },
    { id: 'm2', data: menys(0), tipus: 'd', import: 12.5, categoria: 'c_oci', descripcio: 'BAR LA PLAÇA', metode: 'targeta', revisat: true },
    { id: 'm3', data: menys(1), tipus: 'd', import: 71.9, categoria: 'c_cotx', descripcio: 'BENZINERA CARRETERA N-260 QUILÒMETRE 42', metode: 'targeta', revisat: true },
    { id: 'm4', data: menys(2), tipus: 'd', import: 8.4, categoria: 'c_altd', descripcio: 'COMPRA AMB TARGETA', metode: 'targeta', revisat: false },
    { id: 'm5', data: menys(3), tipus: 'i', import: 2140.55, categoria: 'i_nom', descripcio: 'TRANSFERÈNCIA NÒMINA', metode: 'compte', revisat: true },
    { id: 'm6', data: menys(4), tipus: 'd', import: 620, categoria: 'c_casa', descripcio: 'REBUT LLOGUER', metode: 'rebut', revisat: true },
    { id: 'm7', data: menys(5), tipus: 'd', import: 300, categoria: 'c_tras', descripcio: 'TRASPÀS A ESTALVIS', metode: 'compte', revisat: true },
    { id: 'm8', data: menys(6), tipus: 'd', import: 26.15, categoria: 'c_alim', descripcio: 'FRUITERIA', metode: 'efectiu', revisat: true },
    { id: 'm9', data: menys(8), tipus: 'd', import: 4.9, categoria: 'c_altd', descripcio: 'BIZUM REBUT', metode: 'compte', revisat: false },
    { id: 'm10', data: menys(9), tipus: 'd', import: 149.99, categoria: 'c_casa', descripcio: 'BOTIGA D\'ELECTRODOMÈSTICS', metode: 'targeta', revisat: true }
  ].map(m => {
    const c = CATEGORIES.filter(x => x.id === m.categoria)[0] || {};
    return { ...m, categoriaNom: c.nom || m.categoria, emoji: '', origen: 'banc', pendent: false, nota: '' };
  });

  const finMes = (quin) => {
    const mes = quin || AVUI.slice(0, 7);
    const dins = MOVS.filter(m => m.data.slice(0, 7) === mes);
    const fora = { c_tras: true };
    let ingressos = 0, despeses = 0, traspassos = 0;
    const perCat = {};
    dins.forEach(m => {
      if (fora[m.categoria]) { traspassos += m.import; return; }
      if (m.tipus === 'i') { ingressos += m.import; return; }
      despeses += m.import;
      perCat[m.categoria] = (perCat[m.categoria] || 0) + m.import;
    });
    const llistaCat = Object.keys(perCat).map(id => {
      const c = CATEGORIES.filter(x => x.id === id)[0] || {};
      return { id, nom: c.nom || id, emoji: '', total: perCat[id],
               pct: despeses ? perCat[id] / despeses * 100 : 0 };
    }).sort((a, b) => b.total - a.total);

    return {
      mes, ingressos, despeses, traspassos, balanc: ingressos - despeses,
      perRevisar: 2, perClassificar: 2,
      pressupostos: [
        { categoria: 'c_alim', nom: 'Alimentació', emoji: '', limit: 400, gastat: perCat.c_alim || 0,
          pct: (perCat.c_alim || 0) / 400 * 100 },
        { categoria: 'c_oci', nom: 'Oci', emoji: '', limit: 100, gastat: 120, pct: 120 }
      ],
      perCategoria: llistaCat,
      ritme: { perDia: despeses / 10, projeccio: despeses * 3 },
      moviments: dins
    };
  };

  const finPantalla = (p) => {
    const quin = p.periode || 'mes';
    let dades;
    if (quin === 'mesos') {
      const llista = [5, 4, 3, 2, 1, 0].map(i => ({
        mes: AVUI.slice(0, 4) + '-' + ('0' + (Number(AVUI.slice(5, 7)) - i)).slice(-2),
        ingressos: 2140.55, despeses: 1200 + i * 80, balanc: 940.55 - i * 80 }));
      dades = { mesos: llista, acumulat: llista.reduce((s, m) => s + m.balanc, 0) };
    } else if (quin === 'estad') {
      const ara = finMes(p.mes);
      dades = {
        mes: ara.mes, anterior: AVUI.slice(0, 4) + '-07',
        despeses: ara.despeses, despesesAnterior: 1480.3,
        diferencia: ara.despeses - 1480.3,
        perCategoria: ara.perCategoria.map(c => ({ ...c, anterior: c.total * 0.8,
                                                   diferencia: c.total * 0.2 })),
        perMetode: [{ metode: 'targeta', total: 340.2 }, { metode: 'rebut', total: 620 },
                    { metode: 'efectiu', total: 26.15 }],
        majors: MOVS.filter(m => m.tipus === 'd').sort((a, b) => b.import - a.import).slice(0, 5)
      };
    } else if (quin === 'revisar') {
      dades = {
        comercos: [
          { clau: 'd|estanc', mostra: 'ESTANC NÚMERO 3', tipus: 'd',
            moviments: 12, total: 74.4, primera: menys(40), ultima: menys(2) },
          { clau: 'd|fruiteria', mostra: 'FRUITERIA CAN JOAN', tipus: 'd',
            moviments: 4, total: 61.15, primera: menys(25), ultima: menys(6) },
          { clau: 'i|bizum', mostra: 'BIZUM DE LA MARE', tipus: 'i',
            moviments: 3, total: 120, primera: menys(30), ultima: menys(9) }
        ],
        solts: [
          { id: 'm4', data: menys(2), tipus: 'd', import: 8.4,
            descripcio: 'COMPRA AMB TARGETA', categoria: 'c_altd', categoriaNom: 'Altres despeses' },
          { id: 'm9', data: menys(8), tipus: 'd', import: 4.9,
            descripcio: 'BIZUM REBUT', categoria: 'c_altd', categoriaNom: 'Altres despeses' }
        ],
        totalMoviments: 21,
        categories: CATEGORIES
      };
    } else if (quin === 'recurrents') {
      dades = { llista: [
        { id: 'r1', descripcio: 'Lloguer', import: 620, tipus: 'd', categoria: 'c_casa',
          categoriaNom: 'Casa', metode: 'rebut', dia: 1, actiu: true, ultim_mes: '' },
        { id: 'r2', descripcio: 'Assegurança del cotxe', import: 38.9, tipus: 'd',
          categoria: 'c_cotx', categoriaNom: 'Cotxe i benzina', metode: 'rebut', dia: 15,
          actiu: true, ultim_mes: '' }
      ] };
    } else if (quin === 'patrimoni') {
      dades = {
        total: 18450.2,
        actius: [
          { id: 'p1', nom: 'Compte corrent', tipus: 'compte', valor: 3450.2,
            data: menys(0), automatic: true, historic: [] },
          { id: 'p2', nom: 'Fons indexat', tipus: 'inversio', valor: 15000,
            data: menys(4), automatic: false, historic: [] }
        ]
      };
    } else {
      dades = finMes(p.mes);
    }
    return { periode: quin, dades, categories: CATEGORIES,
             banc: { connectat: true, quan: AVUI, fa: 'fa 2 hores', error: '' },
             suggeriments: quin === 'mes'
               ? [{ descripcio: 'SUPERMERCAT DEL POBLE', categoria: 'c_alim', metode: 'targeta', tipus: 'd' }]
               : [] };
  };

  // ---------------------------------------------------------------- tasques

  /* Les tasques ara són de Google Tasks: el mirall les inventa amb la mateixa
     forma que torna el mòdul —llistes i una caixa per llista—, i els noms de
     les llistes són els tres compartiments que tenia abans com a contextos.
     Inventat, com tot el mirall: cap tasca de debò. */
  const LLISTES_T = [
    { id: 'lst_1', nom: 'Meves tasques', mostra: true,  principal: true,  ordre: 1 },
    { id: 'lst_2', nom: 'Docència',      mostra: true,  principal: false, ordre: 2 },
    { id: 'lst_3', nom: 'Agent rural',   mostra: true,  principal: false, ordre: 3 },
    { id: 'lst_4', nom: 'Casa',          mostra: false, principal: false, ordre: 4 }
  ];

  const T = (id, llista, llistaNom, text, extra) => Object.assign({
    id, llista, llistaNom, text, nota: '', vencEl: '', vencuda: false,
    venAvui: false, prioritat: '', fent: false, feta: false, fetEl: ''
  }, extra || {});

  const tasquesPantalla = () => {
    const blocs = [
      { id: 'lst_1', nom: 'Meves tasques', tasques: [
        T('t1', 'lst_1', 'Meves tasques', 'Mirar el pressupost de la sortida de tercer'),
        T('t2', 'lst_1', 'Meves tasques', 'Trucar al taller')
      ] },
      { id: 'lst_2', nom: 'Docència', tasques: [
        T('t4', 'lst_2', 'Docència', 'Corregir els controls',
          { vencEl: AVUI, venAvui: true }),
        T('t8', 'lst_2', 'Docència', 'Preparar la reunió de pares', { fent: true })
      ] },
      { id: 'lst_3', nom: 'Agent rural', tasques: [
        T('t3', 'lst_3', 'Agent rural', 'Informe de la batuda de senglar del vessant nord',
          { vencEl: menys(4), vencuda: true, prioritat: 'alta', nota: 'Amb les fotos del GPS.' }),
        T('t5', 'lst_3', 'Agent rural', 'Canviar les rodes del tot terreny')
      ] }
    ];
    const totes = blocs.reduce((l, b) => l.concat(b.tasques), []);
    return {
      avui: AVUI,
      hiHaServei: true,
      hiHaLlistes: true,
      llistes: LLISTES_T.map((l) => Object.assign({}, l)),
      blocs,
      tasques: totes,
      vencudes: totes.filter((t) => t.vencuda).length
    };
  };

  const tasquesFetes = () => ({ fetes: [
    T('t6', 'lst_2', 'Docència', 'Enviar les notes', { feta: true, fetEl: menys(1) }),
    T('t7', 'lst_1', 'Meves tasques', 'Comprar pinso', { feta: true, fetEl: menys(2) })
  ] });

  // ------------------------------------------------------------------ diari

  const diariPantalla = (p) => {
    const data = (p && p.data) || AVUI;
    const linia = [
      { id: 'd1', data: AVUI, tipus: 'entrada', text: 'Matí a la zona del refugi. Molta gent per ser dimarts.\n\nA la tarda, claustre llarg.', anim: 4, origen: 'app' },
      { id: 'd2', data: menys(1), tipus: 'resum', text: '· Hàbits pendents: 2\n· Tasques per fer: 3\n\nEt queden dos hàbits i tres tasques. La de l\'informe ja fa quatre dies que venç.', anim: null, origen: 'auto' },
      { id: 'd3', data: menys(1), tipus: 'entrada', text: 'Dia fluix. No he tingut temps de res.', anim: 2, origen: 'app' },
      { id: 'd4', data: menys(3), tipus: 'revisio', text: 'Setmana del ' + menys(9) + ' al ' + menys(3) + '\n\nHÀBITS\n· Estirar-se: 5 de 7 dies\n· Llegir: 7 de 7 dies\n\nTASQUES\n· 4 fetes i 6 de noves', anim: null, origen: 'auto' }
    ];
    return {
      avui: AVUI, data,
      entrada: data === AVUI ? linia[0] : null,
      linia, quantes: 2, ratxa: 2, iaActiva: false
    };
  };

  // --------------------------------------------------------------- conversa

  const conversaEstat = () => ({
    disponible: false,
    motiu: 'El mirall no té capa d\'IA: aquí no es parla amb ningú.',
    model: 'mirall',
    suggeriments: ['Com he anat aquest mes?', 'Quant porto gastat?', 'Què em queda per fer avui?'],
    consum: { avui: 47, tocat: true, faSegons: 35, esperaSegons: 60, quota: 'GenerateRequestsPerMinutePerProjectPerModel' },
    dreceres: [{ vista: 'dia', frases: ['pagina del dia', 'pagina d avui', 'full del dia', 'dashboard del dia', 'la pagina de avui', 'el dia d avui'] }]
  });

  const conversaHistorial = () => ({
    id_conversa: 'cnv_mirall',
    missatges: [
      { rol: 'user', text: 'Què em queda per fer avui?', creat_el: menys(0) },
      { rol: 'assistant', text: 'Et queden dos hàbits i tres tasques. La de l\'informe de la batuda ja fa quatre dies que venç.', creat_el: menys(0) }
    ]
  });

  // -------------------------------------------------------------- calendari

  const CALENDARIS = [
    { id: 'principal@exemple', nom: 'El meu calendari', color: '#2c6e8f',
      mostra: true, principal: true, meu: true },
    { id: 'escola@exemple', nom: 'Feina · escola', color: '#a8703f',
      mostra: true, principal: false, meu: true },
    // Un d'un altre compte, compartit: es veu, i escriure-hi depèn del permís.
    { id: 'claustre@altrecompte', nom: "Claustre (compte de l'escola)", color: '#8a5124',
      mostra: true, principal: false, meu: false },
    { id: 'festius@exemple', nom: 'Festius de Catalunya', color: '#7fa15c',
      mostra: false, principal: false, meu: false }
  ];

  /* Cites repartides pel mes en curs, amb noms i durades de tot tipus: una de
     tot el dia, una que se solapa, una de molt llarga i uns quants dies buits.
     Els dies plens i els buits alhora són el que fa veure si la graella es
     llegeix. */
  const cites = (mesDemanat) => {
    const m = mesDemanat || AVUI.slice(0, 7);
    const d = (n) => m + '-' + ('0' + n).slice(-2);
    const cru = [
      [d(3), '09:00', '10:30', 'Claustre de mestres', 'Escola', 'escola@exemple'],
      [d(3), '17:00', '18:00', 'Visita al veterinari', 'Sant Joan', 'principal@exemple'],
      [d(7), null, null, 'Sortida de tercer a la Vall de Boí', '', 'escola@exemple'],
      [d(11), '08:00', '14:00', 'Batuda de senglar al vessant nord', 'Coll de Fumanya', 'principal@exemple'],
      [d(11), '19:30', '21:00', 'Sopar amb els de sempre', '', 'principal@exemple'],
      [d(12), '10:00', '10:45', 'Reunió amb la direcció', 'Escola', 'escola@exemple'],
      [d(18), '16:00', '17:00', 'Revisió del cotxe', 'Taller Puig', 'principal@exemple'],
      [d(21), null, null, 'Aniversari de la mare', '', 'principal@exemple'],
      [d(21), '20:00', '23:00', 'Dinar de família', 'Cal Manel', 'principal@exemple'],
      [d(25), '11:00', '12:00', 'Formació d\'agents rurals', 'Solsona', 'principal@exemple'],
      [Number(AVUI.slice(8)) > 1 ? AVUI : d(15), '12:30', '13:15', 'Cita d\'avui, per veure com es marca', '', 'principal@exemple']
    ];
    return cru.map((c, i) => {
      const cal = CALENDARIS.filter(x => x.id === c[5])[0] || CALENDARIS[0];
      const totElDia = !c[1];
      const minuts = totElDia ? 0
        : (Number(c[2].slice(0, 2)) * 60 + Number(c[2].slice(3))) -
          (Number(c[1].slice(0, 2)) * 60 + Number(c[1].slice(3)));
      return { id: 'ev' + i, calendari: cal.id, calendariNom: cal.nom, color: cal.color,
               titol: c[3], lloc: c[4], nota: '', data: c[0], dataFi: c[0],
               totElDia, hora: c[1] || '', horaFi: c[2] || '',
               passat: c[0] < AVUI, minuts };
    });
  };

  /* Data LOCAL. Amb toISOString, a la nit surt el dia d'abans i el mirall
     et fa perseguir un error que no hi és. */
  const localIso = (d) => [d.getFullYear(), ('0' + (d.getMonth() + 1)).slice(-2), ('0' + d.getDate()).slice(-2)].join('-');
  const dillunsDe = (iso) => {
    const d = new Date(iso + 'T12:00:00');
    const n = (d.getDay() + 6) % 7;          // 0 = dilluns
    d.setDate(d.getDate() - n);
    return localIso(d);
  };
  const suma = (iso, n) => {
    const d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return localIso(d);
  };

  const calendariPantalla = (p) => {
    const m = (p && p.mes) || AVUI.slice(0, 7);
    const events = cites(m);
    const perDia = {};
    events.forEach(e => { (perDia[e.data] = perDia[e.data] || []).push(e); });

    const ultim = new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0);
    const inici = dillunsDe(m + '-01');
    const fi = suma(dillunsDe(m + '-' + ('0' + ultim.getDate()).slice(-2)), 6);

    const caselles = [];
    for (let x = inici; x <= fi; x = suma(x, 1)) {
      const seus = perDia[x] || [];
      caselles.push({ data: x, dia: Number(x.slice(8, 10)), delMes: x.slice(0, 7) === m,
                      esAvui: x === AVUI, quants: seus.length,
                      mostra: seus.slice(0, 3).map(e => ({ color: e.color, totElDia: e.totElDia,
                                                          titol: e.titol, hora: e.hora })) });
    }
    const triat = (p && p.data) || (m === AVUI.slice(0, 7) ? AVUI : m + '-01');
    return {
      dades: { mes: m, avui: AVUI, desde: inici, fins: fi, caselles,
               quants: events.length, diaTriat: triat,
               esdeveniments: perDia[triat] || [], tots: events },
      calendaris: CALENDARIS
    };
  };

  // ------------------------------------------------------------ pàgina del dia

  const elDia = (p) => {
    const data = (p && p.data) || AVUI;
    const cites = calendariPantalla({}).dades.tots.filter(e => e.data === data);

    const blocs = [];
    if (cites.length) {
      blocs.push({ modul: 'calendari', titol: 'Al calendari', urgent: false, accio: 'calendari',
        coses: cites.map(e => ({
          text: e.titol,
          menut: (e.totElDia ? 'tot el dia' : e.hora + (e.horaFi ? '–' + e.horaFi : '')) +
                 (e.lloc ? ' · ' + e.lloc : ''),
          fet: e.passat })) });
    }
    blocs.push({ modul: 'tasques', titol: 'Tasques', urgent: true, accio: 'tasques', coses: [
      { text: 'Informe de la batuda de senglar del vessant nord',
        menut: 'fa 4 dies que vencia', urgent: true },
      { text: 'Corregir els controls', menut: 'per avui · Docència' }
    ] });
    blocs.push({ modul: 'habits', titol: 'Hàbits que et falten', urgent: false, accio: 'habits',
      coses: [ { text: 'Rentar-se les dents', menut: '1 de 2' },
               { text: 'Sortir a caminar una estona llarga', menut: '' },
               { text: 'Idiomes', menut: '' } ] });
    blocs.push({ modul: 'nutricio', titol: 'Nutrició', urgent: true, accio: 'nutricio', coses: [
      { text: '1.010 kcal · 95,8 g de proteïna', menut: 'objectiu 140 g' },
      { text: 'Falten les calories cremades', menut: 'sense elles no hi ha balanç', urgent: true }
    ] });
    blocs.push({ modul: 'finances', titol: 'Finances', urgent: false, accio: 'finances', coses: [
      { text: 'Gastat 71,45 € · guanyat 1842,00 €', menut: '4 moviments' },
      { text: 'Nòmina', menut: '+1842,00 € · Feina' },
      { text: 'Supermercat del carrer gran', menut: '−48,20 € · Menjar' },
      { text: 'Benzinera de la carretera', menut: '−18,90 € · Cotxe · per classificar' },
      { text: 'Cafè', menut: '−4,35 € · Sortides' }
    ] });
    blocs.push({ modul: 'escola', titol: 'De l\'escola', urgent: true, accio: 'escola', coses: [
      { text: '09:00 Claustre de mestres', menut: 'avui' },
      { text: '17:00 Reunió de cicle', menut: 'avui' },
      /* Amb la llista del Google Tasks al text petit, que és on va des que
         hem tret el claudàtor del davant. */
      { text: 'Corregir els controls de llengua', menut: 'Tutoria' },
      { text: 'Preparar les fitxes de mates', menut: 'Programació' },
      { text: 'Substitució Medi 2nB', menut: 'fa 20 min', urgent: true }
    ] });
    blocs.push({ modul: 'diari', titol: 'Diari', urgent: false, accio: 'diari',
      coses: [ { text: 'Escrit', menut: 'Matí a la zona del refugi. Molta gent per ser dimarts.',
                 fet: true } ] });

    return { data, esAvui: data === AVUI, blocs,
             quantes: blocs.reduce((s, b) => s + b.coses.length, 0) };
  };



  // ---------------------------------------------------------------- escola
  /* Inventat, com tot el mirall: cap nom de companya ni d'alumne de debò. */
  const escPantalla = () => ({
    avui: AVUI,
    pont: true,
    total: 5,
    pendents: 3,
    teResum: true,
    dia: {
      hores: [
        { hora: '09:00', que: 'Claustre de mestres' },
        { hora: '11:00', que: 'Substitució Medi 2nB' },
        { hora: '17:00', que: 'Reunió de cicle' }
      ],
      /* Amb llista, que és com arriben: el resum del matí les porta com a
         «[Tutoria] Corregir els controls». Se n'hi posen unes quantes i de
         llistes desiguals perquè és el cas real —un mestre no té tres
         tasques— i perquè així es veu si les caixes aguanten.
         «Automatització» és la llista on l'automatització desa el que troba
         als correus: ve pel mateix camí que les altres, perquè és una llista
         del Google Tasks com qualsevol. */
      pendents: [
        { llista: 'Tutoria', que: 'Corregir els controls de llengua' },
        { llista: 'Tutoria', que: 'Trucar a una família' },
        { llista: 'Tutoria', que: 'Preparar la reunió de pares' },
        { llista: 'Programació', que: 'Preparar les fitxes de mates' },
        { llista: 'Programació', que: 'Revisar la unitat 3 de medi' },
        { llista: 'Coordinació', que: 'Enviar les actes del cicle' },
        { llista: 'Meves tasques', que: 'Comprar cartolines' },
        { llista: 'Automatització', que: 'Firmar les autoritzacions de la sortida' }
      ],
      altres: [{ que: 'Correus no llegits: 3' }]
    },
    missatges: [
      { id: 'esc_5', rebut_el: AVUI + 'T08:12:00', mena: 'acta', llegit_el: '',
        titol: 'Substitució Medi 2nB (per la tutora de 2nB)',
        cos: 'Dimarts 9, de 11:00 a 12:00. Surt de la taula de substitucions de l\'acta de primària.' },
      { id: 'esc_4', rebut_el: AVUI + 'T07:40:00', mena: 'tasca', llegit_el: '',
        titol: 'Firmar les autoritzacions de la sortida', cos: 'Abans de divendres.' },
      { id: 'esc_3', rebut_el: AVUI + 'T07:02:00', mena: 'resum', llegit_el: '',
        titol: 'Avui: 2 events, 3 tasques, 4 correus sense llegir',
        cos: '09:00 Claustre de mestres\n17:00 Reunió de cicle\n\nPendents:\n' +
             '· Corregir els controls\n· Preparar les fitxes de mates\n· Trucar a una família' },
      { id: 'esc_2', rebut_el: menys(1) + 'T16:30:00', mena: 'drive', llegit_el: menys(1) + 'T18:00:00',
        titol: 'S\'han modificat 2 fitxers a la carpeta de 2n',
        cos: 'Programació.xlsx\nSortides.docx' },
      { id: 'esc_1', rebut_el: menys(2) + 'T09:15:00', mena: 'event', llegit_el: menys(2) + 'T09:20:00',
        titol: 'Excursió de cicle inicial', cos: 'Dijous 18, tot el dia.' }
    ]
  });
  // ------------------------------------------------------------- seguiment
  /* Inventat, com tot el mirall. Les xifres de debò no surten mai d aqui:
     aquest fitxer si que va al repositori public. */
  const segPantalla = () => ({
    avui: AVUI,
    historic: [
      { id: 'seg_1', data: '2026-06-05', pes: 71.4, cintura: 88, cinturaValida: false,
        forca: 1, trail: 2, trailGros: 0, energia: 'normal', son: 'normal', gana: 'normal',
        dieta: 'a mitges', fotos: { frontal: '', perfil: '', esquena: '' }, notes: 'Punt de partida.' },
      { id: 'seg_2', data: '2026-06-12', pes: 70.8, cintura: 84.5, cinturaValida: true,
        forca: 2, trail: 3, trailGros: 1, energia: 'normal', son: 'bé', gana: 'normal',
        dieta: 'bé', fotos: { frontal: 'fals_1f', perfil: 'fals_1p', esquena: '' }, notes: '' },
      { id: 'seg_3', data: '2026-06-19', pes: 69.3, cintura: 83, cinturaValida: true,
        forca: 0, trail: 4, trailGros: 2, energia: 'baixa', son: 'normal', gana: 'molta',
        dieta: 'a mitges', fotos: { frontal: '', perfil: '', esquena: '' }, notes: 'Setmana de molt desnivell.' },
      { id: 'seg_4', data: '2026-06-26', pes: 69.5, cintura: 82.5, cinturaValida: true,
        forca: 2, trail: 3, trailGros: 0, energia: 'normal', son: 'bé', gana: 'normal',
        dieta: 'bé', fotos: { frontal: 'fals_4f', perfil: '', esquena: 'fals_4e' }, notes: '' }
    ],
    pla: {
      'control.dia': '5',
      'pla.resum': 'Dèficit moderat, proteïna alta, trail com a prioritat.',
      'fase.1.desde': '2026-06-01', 'fase.1.nom': 'Base',
      'fase.1.objectiu': 'més magre i en forma aeròbica'
    },
    fase: { desde: '2026-06-01', nom: 'Base', objectiu: 'més magre i en forma aeròbica',
            kcal: 2000, proteina: 150, forca: 2, trail: 3 },
    estat: { avui: AVUI, dia: 5, toca: true, pendent: true, fetAquestaSetmana: false,
             fa: 38, ultim: '2026-06-26' },
    llindars: { perdSana: [0.4, 0.7], perdRapida: 0.8, saltImpossible: 3.0,
                cinturaIncoherent: 2.5, pesEstable: 0.3, forcaMinima: 2, diesTolerats: [5, 10] },
    comEsMesura: {
      pes: 'Matí, en dejú, després del lavabo. Si pots, mitjana de 2-3 dies.',
      cintura: 'Matí, en dejú, dret i relaxat. Expiració normal. Cinta al melic, sense estrènyer.',
      fotos: 'Mateix lloc, mateixa llum, mateixa hora, mateixa roba.'
    }
  });
  // ------------------------------------------------------------------ inici

  const nucliInici = () => ({
    avui: AVUI,
    moduls: [
      { id: 'habits', nom: 'Hàbits', icona: 'habits', ordre: 10, teVista: true },
      { id: 'tasques', nom: 'Tasques', icona: 'tasques', ordre: 15, teVista: true },
      { id: 'nutricio', nom: 'Nutrició', icona: 'nutricio', ordre: 20, teVista: true },
      { id: 'finances', nom: 'Finances', icona: 'finances', ordre: 30, teVista: true },
      { id: 'calendari', nom: 'Calendari', icona: 'calendari', ordre: 5, teVista: true },
      { id: 'seguiment', nom: 'Seguiment FitFat', icona: 'seguiment', ordre: 25, teVista: true },
      { id: 'diari', nom: 'Diari', icona: 'diari', ordre: 40, teVista: true }
    ],
    targetes: [
      { modul: 'habits', icona: 'habits', etiqueta: 'Hàbits pendents', valor: 4, urgent: true, accio: 'habits' },
      { modul: 'tasques', icona: 'tasques', etiqueta: 'Tasques vençudes', valor: 1, urgent: true, accio: 'tasques' },
      { modul: 'nutricio', icona: 'nutricio', etiqueta: 'Proteïna pendent', valor: '32 g', urgent: true, accio: 'nutricio' },
      { modul: 'finances', icona: 'finances', etiqueta: 'Balanç del mes', valor: '+486,20 €', urgent: false, accio: 'finances' },
      { modul: 'seguiment', icona: 'seguiment', etiqueta: 'Control setmanal', valor: 'fa 3 d', urgent: false, accio: 'seguiment' },
      { modul: 'diari', icona: 'diari', etiqueta: 'Diari escrit', valor: '✓', urgent: false, accio: 'diari' }
    ],
    ia: { disponible: false }
  });

  return { HABITS, habitsDia, habitsMes, habitsHistoric, ALIMENTS, nutriPantalla,
           CALENDARIS, calendariPantalla, elDia,
           CATEGORIES, finPantalla, tasquesPantalla, tasquesFetes, diariPantalla,
           conversaEstat, conversaHistorial, nucliInici, segPantalla, escPantalla };
}
