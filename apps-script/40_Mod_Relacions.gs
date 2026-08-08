/**
 * JEFE — MÒDUL · Relacions
 *
 * Cap línia del nucli s'ha tocat per afegir aquest fitxer.
 *
 * QUÈ ÉS
 *   La pantalla d'un sol full: què va junt amb què, de tot el que apuntes.
 *   Els números i les regles són a `70_Creuaments.gs`; aquí només hi ha com
 *   s'ensenya, quan es refà i què se't diu.
 *
 * SÍ QUE ÉS UN APARTAT, encara que no hi vagis a treballar
 *   Va estar a punt de no tenir-ne, com la pàgina del dia: aquí no s'hi fa
 *   res, només es llegeix. Però una pantalla a la qual només s'hi arriba per
 *   un senyal és una pantalla que no trobes quan te'n recordes, i el senyal
 *   pot no haver sortit mai perquè encara no hi ha res a dir —i llavors mai
 *   sabries que això existeix. El botó no obliga a res: només fa que existir
 *   sigui trobable.
 *
 * QUAN ES REFÀ
 *   Un cop la setmana i en segon pla, aprofitant el pas dels senyals. No hi
 *   ha cap automatisme nou: llegir mig any de fulls costa uns quants segons
 *   i la quota d'automatismes d'aquest compte és de noranta minuts al dia.
 *   La pantalla no calcula mai res; llegeix el que hi ha desat.
 */
function MODUL_RELACIONS() {
  return {
    id: 'relacions',
    nom: 'Relacions',
    icona: 'relacions',
    /* Igual que la memòria: el que ha vist creuant les seves dades és una
       eina de l'app, no un apartat on treballa. */
    secundari: true,
    ordre: 45,
    versioEsquema: 1,

    /* No en té cap de propi: el que desa va a `_Relacions`, que és del nucli
       —el crea `70_Creuaments.gs`— perquè el que hi ha a dins surt de tots
       els mòduls alhora i no és de cap. */
    fulls: [],

    accions: {
      pantalla: function () { return Relacions.pantalla(); },
      /* Refer-ho a mà, quan no vulguis esperar. Triga: la pantalla avisa. */
      recalcula: function () { Creuaments.calcula({}); return Relacions.pantalla(); }
    },

    /**
     * NO TÉ TARGETA A L'INICI, i és a posta. Una xifra com «3 relacions» no
     * vol dir res: o n'hi ha una que t'interessa —i llavors és un senyal— o
     * el número és decoració.
     */

    /**
     * Un senyal per relació nova, i mai dues seguides.
     *
     * `Senyals` ja no en deixa passar més de dos al dia ni repeteix el mateix
     * abans de tres dies, i l'identificador porta les dues sèries: una relació
     * que ja t'he dit no te la torno a dir encara que segueixi sent certa.
     *
     * De passada, si fa set dies del darrer càlcul, el refà. És l'única feina
     * pesada del mòdul i es fa aquí perquè els senyals ja passen sols cada
     * tres hores: un automatisme més seria quota per res.
     */
    senyals: function () {
      var d;
      try { d = Creuaments.potserRecalcula(); } catch (e) { return []; }
      if (!d || !d.trobades || !d.trobades.length) return [];

      return d.trobades.slice(0, 3).map(function (t) {
        return {
          id: 'relacio:' + t.idA + '|' + t.idB,
          titol: 'Va junt',
          text: t.frase + ' Vist en ' + t.n + ' setmanes. No vol dir que una ' +
                'cosa causi l\'altra: mira-t\'ho tu.',
          urgencia: 1,
          accio: 'relacions'
        };
      });
    },

    contextIA: function () {
      var d = Creuaments.desat();
      if (!d || !d.trobades || !d.trobades.length) {
        return 'Relacions entre dades: cap de prou clara, de moment.';
      }
      return 'Relacions vistes entre les seves dades (van juntes, NO vol dir ' +
             'que una causi l\'altra):\n' +
             d.trobades.slice(0, 6).map(function (t) {
               return '- ' + t.frase + ' (' + t.n + ' setmanes, rho ' + t.rho + ')';
             }).join('\n');
    },

    einesIA: [{
      nom: 'consulta_relacions',
      descripcio: 'Què va junt amb què, de tot el que en Pol apunta: hàbits, pes, ' +
                  'calories, ànim, hores ocupades. Fes-la servir quan pregunti si una ' +
                  'cosa té a veure amb una altra, o què has notat. ' +
                  'MAI diguis que una cosa causa l\'altra: aquí només se sap que van ' +
                  'juntes. Digues sempre amb quantes setmanes s\'ha vist.',
      obre: 'relacions',
      esquema: { type: 'object', properties: {} },
      executa: function () { return Relacions.perALaIA(); }
    }],

    vista: 'vista_relacions'
  };
}


var Relacions = (function () {

  function pantalla() {
    var d = Creuaments.desat();
    if (!d) {
      return {
        calculat: false,
        minim: CREU_MINIM,
        trobades: [], curtes: [], series: 0, provades: 0
      };
    }
    return {
      calculat: true,
      calculatEl: d.calculatEl,
      desde: d.desde, fins: d.fins,
      series: d.series, provades: d.provades, parelles: d.parelles,
      minim: CREU_MINIM,
      trobades: d.trobades || [],
      curtes: d.curtes || []
    };
  }

  function perALaIA() {
    var d = Creuaments.desat();
    if (!d) return { pantalla: 'oberta', trobades: 0, nota: 'Encara no s\'ha calculat mai.' };
    return {
      pantalla: 'oberta',
      trobades: (d.trobades || []).length,
      provades: d.provades,
      setmanesMirades: d.desde + ' → ' + d.fins,
      relacions: (d.trobades || []).map(function (t) {
        return t.frase + ' [' + t.n + ' setmanes, rho ' + t.rho + ']';
      })
    };
  }

  return { pantalla: pantalla, perALaIA: perALaIA };
})();
