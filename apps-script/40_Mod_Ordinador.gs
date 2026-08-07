/**
 * JEFE — MÒDUL · L'ordinador
 *
 * ══════════════════════════════════════════════════════════════════════════
 * AQUEST MÒDUL NO FA RES. I ÉS A POSTA.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Tots els altres mòduls llegeixen i escriuen al full. Aquest no toca cap
 * dada: el que fa és dir a la PANTALLA que demani una cosa a l'ordinador.
 *
 * Per què no ho fa ell: Apps Script corre als servidors de Google, i des
 * d'allà `127.0.0.1` és el mateix servidor de Google, no el PC d'en Pol. No
 * hi ha cap manera que el servidor arribi a la seva màquina, i tampoc no
 * n'hi ha d'haver: obrir un forat de fora cap a dins seria una altra cosa
 * molt diferent d'això.
 *
 * Qui hi arriba és el navegador, perquè ja hi és. Quan en Pol parla amb JEFE
 * des de l'ordinador, la pàgina i l'ajudant són a la mateixa màquina i es
 * poden trucar directament. Per això les eines d'aquí tornen `_ordinador`, i
 * el nucli el passa al client igual que ja passa `obre` i `mostra`: instruccions
 * per a la pantalla, no coses fetes.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * QUÈ POT FER, I QUÈ NO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * L'ajudant —`ordinador/jefe-ordinador.mjs`— té sis verbs i cap manera
 * d'executar una ordre del sistema. No és que estigui desactivada: no
 * existeix. Pot mirar tot el disc `C:`, però no obre programes i no llegeix
 * claus ni certificats. Les raons són allà.
 *
 * NO CAL CONFIRMAR RES, i és l'única part de JEFE que escapa a la regla.
 * Obrir una web o un document no toca cap dada teva i es desfà tancant la
 * finestra; demanar-te que confirmis cada «obre'm això» el faria més lent que
 * fer-ho amb la mà, que és justament el contrari del que serveix.
 *
 * SI L'AJUDANT NO HI ÉS, ES DIU. Ni s'amaguen les eines ni es fa veure que
 * s'ha fet res: la pantalla no hi arriba i t'ho diu. Des del mòbil passarà
 * sempre, i és la resposta correcta.
 */
function MODUL_ORDINADOR() {
  return {
    id: 'ordinador',
    nom: 'L\'ordinador',
    icona: 'ajust',
    ordre: 95,
    versioEsquema: 1,

    /* CAP FULL. No hi ha res a desar: obrir un document avui no diu res de
       tu demà, i un registre de cada fitxer que has obert seria una llista
       de vigilància del teu propi ordinador que no serveix per a res. */
    fulls: [],

    /* CAP ACCIÓ DE SERVIDOR tampoc. Tot el que fa aquest mòdul passa al
       navegador; el servidor només reparteix les instruccions. */
    accions: {},

    /* NI SURT A L'INICI NI AL DIA. L'ordinador no és una cosa que hagis de
       repassar: és una eina que fas servir quan la necessites. */

    einesIA: [{
      nom: 'obre_al_ordinador',
      descripcio: 'Obre una cosa a l\'ordinador d\'en Pol: una pàgina web, un fitxer o ' +
                  'una carpeta. Fes-la servir quan et digui «obre\'m…», «posa\'m…», ' +
                  '«ensenya\'m la web de…», «obre la carpeta de…».\n' +
                  'SI ÉS UNA WEB, passa-li `url`. Pots posar-hi l\'adreça sencera o el ' +
                  'domini («elpuntavui.cat»); si el que vol és buscar alguna cosa a ' +
                  'internet, munta-li l\'adreça de la cerca tu.\n' +
                  'SI ÉS UNA COSA SEVA, tens dues maneres: `cami` si ja saps on és ' +
                  '—perquè ho acabes de buscar—, o `busca` amb un tros del nom si no. ' +
                  'Amb `busca` s\'obre el que encaixi millor, que és el més recent.\n' +
                  'NOMÉS FUNCIONA A L\'ORDINADOR, i només si hi té l\'ajudant obert. Si ' +
                  'no hi arriba t\'ho dirà la pantalla: no diguis que ho has obert fins ' +
                  'que no ho sàpigues.\n' +
                  'NO OBRE PROGRAMES. Un .exe o un .bat no s\'obren: obrir-los seria ' +
                  'executar-los. Si t\'ho demana, digues-li que aquell l\'ha d\'obrir ell.',
      esquema: {
        type: 'object',
        properties: {
          url:   { type: 'string', description: 'Adreça web. http o https.' },
          cami:  { type: 'string', description: 'Camí sencer del fitxer o la carpeta' },
          busca: { type: 'string', description: 'Part del nom, si no saps el camí' }
        }
      },
      executa: function (a) { return Ordinador.obre(a); }
    }, {
      nom: 'busca_a_lordinador',
      descripcio: 'Busca fitxers i carpetes pel NOM a l\'ordinador d\'en Pol. Fes-la ' +
                  'servir quan et pregunti on té una cosa: «on tinc l\'informe de la ' +
                  'batuda?», «quins documents tinc del menjador?».\n' +
                  'Busca com es diuen, no què hi ha a dins. Torna els més recents ' +
                  'primer, que és gairebé sempre el que vol.\n' +
                  'Un cop tinguis la llista, DIGUES-LA CURTA: tres o quatre, amb la ' +
                  'data, i pregunta-li quin. No li recitis quaranta camins sencers.',
      esquema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Part del nom. Almenys dues lletres.' }
        },
        required: ['text']
      },
      executa: function (a) { return Ordinador.busca(a); }
    }, {
      nom: 'explica_un_document',
      descripcio: 'Llegeix un document de l\'ordinador d\'en Pol i te\'l porta perquè ' +
                  'l\'hi puguis explicar, resumir o respondre\'n preguntes: «de què va ' +
                  'aquest document?», «resumeix-me l\'acta», «què deia el correu del ' +
                  'menjador?».\n' +
                  'Passa-li `cami` si el saps, o `busca` amb un tros del nom.\n' +
                  'DE MOMENT NOMÉS TEXT: .txt, .md, .csv, .json, codi i companyia. Els ' +
                  'PDF i els .docx encara no els sap llegir, i t\'ho dirà; llavors ' +
                  'ofereix-li obrir-lo en comptes d\'inventar-te què hi diu.\n' +
                  'Quan el text t\'arribi, contesta el que et demanava i prou. Si és ' +
                  'llarg, digues-li de què va en tres línies abans de res.',
      esquema: {
        type: 'object',
        properties: {
          cami:  { type: 'string', description: 'Camí sencer del document' },
          busca: { type: 'string', description: 'Part del nom, si no saps el camí' }
        }
      },
      executa: function (a) { return Ordinador.explica(a); }
    }, {
      nom: 'que_hi_ha_a_la_carpeta',
      descripcio: 'Diu què hi ha dins d\'una carpeta de l\'ordinador d\'en Pol: «què ' +
                  'tinc a l\'escriptori?», «què hi ha a la carpeta de baixades?».\n' +
                  'Si no li dius cap camí, mira la seva carpeta personal. Torna el més ' +
                  'recent primer.',
      esquema: {
        type: 'object',
        properties: {
          cami: { type: 'string', description: 'Camí de la carpeta. Si s\'omet, la seva.' }
        }
      },
      executa: function (a) { return Ordinador.llista(a); }
    }],

    /* CAP VISTA. Aquest mòdul no té pantalla: el que fa es veu a l'ordinador,
       que ja és la pantalla més gran que hi ha. */
    vista: null
  };
}


var Ordinador = (function () {

  /**
   * TOTES LES EINES FAN EL MATEIX: preparen un sobre per al navegador.
   *
   * `_ordinador` és el contracte —el germà d'`obre`, de `mostra` i de
   * `_visor`—: el nucli el porta fins al client sense mirar-hi dins, i el
   * client el fa arribar a l'ajudant. Cap d'aquestes funcions toca res.
   *
   * `tornaAmb` és el que fa que la resposta pugui parlar del que hi hagi al
   * PC: vol dir «quan tinguis el resultat, torna a preguntar-m'ho amb això a
   * la mà». Sense això, JEFE podria demanar el text d'un document però no
   * arribaria a llegir-lo mai.
   */
  function sobre_(verb, args, opcions) {
    opcions = opcions || {};
    return {
      _ordinador: {
        verb: verb,
        args: args || {},
        /* Què ha de fer el client amb el que torni l'ajudant:
             null      — res, ja està fet
             'llista'  — tornar-ho a preguntar per poder-ho dir
             'text'    — tornar-ho a preguntar per poder-lo explicar */
        tornaAmb: opcions.tornaAmb || null,
        /* Què li diu a en Pol mentre s'hi treballa. L'ajudant pot trigar sis
           segons buscant per tot el disc i una pantalla quieta sis segons
           sembla una pantalla penjada. */
        mentrestant: opcions.mentrestant || null
      },
      /* Perquè el model no digui que ja està fet abans d'hora: el que torna
         d'aquí no és el resultat, és l'encàrrec. */
      encara_no_fet: true,
      missatge: opcions.missatge ||
        'ENCARA NO ESTÀ FET. Això és un encàrrec per a la pantalla, i qui el ' +
        'farà és ella. NO diguis que ho has obert ni que ja ho té: no ho saps. ' +
        'Contesta amb una paraula o calla; el resultat l\'escriurà la pantalla.'
    };
  }

  /** «Obre'm la web de…», «obre'm aquell document», «obre la carpeta de…». */
  function obre(a) {
    a = a || {};
    if (a.url) {
      return sobre_('obre_web', { url: a.url },
                    { mentrestant: 'obrint la pàgina…' });
    }
    if (a.cami) {
      return sobre_('obre_fitxer', { cami: a.cami },
                    { mentrestant: 'obrint…' });
    }
    if (a.busca) {
      /* Buscar i obrir en un sol pas. Podria ser buscar, dir-li la llista i
         esperar que triï, però quan dius «obre'm l'informe de la batuda» el
         que vols és que s'obri, no una llista. Si s'equivoca, tanques la
         finestra i li dius quin. */
      return sobre_('obre_trobat', { text: a.busca },
                    { mentrestant: 'buscant-ho…' });
    }
    throw new Error('No m\'has dit què he d\'obrir.');
  }

  /** «On tinc aquell document?» */
  function busca(a) {
    a = a || {};
    var text = String(a.text || '').trim();
    if (text.length < 2) throw new Error('Cal almenys dues lletres per buscar.');
    return sobre_('busca', { text: text }, {
      tornaAmb: 'llista',
      mentrestant: 'buscant «' + Utils.talla(text, 30) + '» per l\'ordinador…',
      missatge: 'Buscant-ho a l\'ordinador. ENCARA NO HO TENS: el resultat ' +
                't\'arribarà en una segona pregunta. No t\'inventis cap llista.'
    });
  }

  /** «Explica'm aquest document.» */
  function explica(a) {
    a = a || {};
    if (!a.cami && !a.busca) throw new Error('No m\'has dit quin document.');
    return sobre_(a.cami ? 'llegeix' : 'llegeix_trobat',
                  a.cami ? { cami: a.cami } : { text: a.busca }, {
      tornaAmb: 'text',
      mentrestant: 'llegint el document…',
      missatge: 'Llegint-lo de l\'ordinador. ENCARA NO L\'HAS LLEGIT: el text ' +
                't\'arribarà en una segona pregunta. No diguis de què va fins llavors.'
    });
  }

  /** «Què tinc a l'escriptori?» */
  function llista(a) {
    a = a || {};
    return sobre_('llista', a.cami ? { cami: a.cami } : {}, {
      tornaAmb: 'llista',
      mentrestant: 'mirant la carpeta…',
      missatge: 'Mirant la carpeta a l\'ordinador. ENCARA NO SAPS QUÈ HI HA: ' +
                't\'arribarà en una segona pregunta.'
    });
  }

  return { obre: obre, busca: busca, explica: explica, llista: llista };
})();
