/**
 * JEFE — NUCLI · Capa d'IA (adaptador de proveïdor)
 *
 * AQUEST ÉS L'ÚNIC FITXER QUE SAP AMB QUI PARLEM.
 * La resta del sistema crida IA.genera(...) i no sap ni li importa el proveïdor.
 * Canviar de Gemini a Anthropic el dia de demà és tocar aquest fitxer i la
 * cel·la `proveidor_ia` del full `_Config`. Res més.
 *
 * INTERRUPTOR: la capa està apagada mentre no hi hagi clau a Script Properties
 * I `ia_activa` valgui SI al full `_Config`. Amb la capa apagada, el sistema
 * sencer continua funcionant: el que es perd és la classificació automàtica,
 * l'observació dels resums i la conversa.
 *
 * LA CLAU NO POT ANAR MAI EN AQUEST FITXER. Va a:
 *   Configuració del projecte → Propietats de l'script → CLAU_IA
 */

var IA = (function () {

  function clau_() {
    return PropertiesService.getScriptProperties().getProperty(PROP_CLAU_IA) || null;
  }

  function proveidor_() {
    return String(Config.get('proveidor_ia', 'gemini')).toLowerCase();
  }

  function disponible() {
    return !!clau_() && Config.esSi('ia_activa');
  }

  /** Per què no està disponible, en llenguatge que es pugui ensenyar a la pantalla. */
  function motiu() {
    if (!clau_()) return 'Falta la clau de l\'API a les propietats de l\'script (CLAU_IA).';
    if (!Config.esSi('ia_activa')) return 'La capa d\'IA està desactivada (`ia_activa` = NO a _Config).';
    return null;
  }

  function estat() {
    return {
      disponible: disponible(),
      motiu: motiu(),
      proveidor: proveidor_(),
      modelBarat: Config.get('model_barat'),
      modelBo: Config.get('model_bo'),
      incloDiari: Config.esSi('ia_inclou_diari')
    };
  }

  // ---------------------------------------------------------------- Gemini

  /* Models als quals ja sabem que NO se'ls pot dir que no rumiïn, après a
     base de provar-ho. Viu mentre viu l'execució: no cal desar-ho enlloc. */
  var SENSE_RUMIAR = {};

  var Gemini = {
    url: function (model) {
      return 'https://generativelanguage.googleapis.com/v1beta/models/' +
             encodeURIComponent(model) + ':generateContent';
    },

    cos: function (p) {
      var cos = { contents: [] };

      if (p.sistema) cos.systemInstruction = { parts: [{ text: p.sistema }] };

      for (var i = 0; i < p.missatges.length; i++) {
        var m = p.missatges[i];
        if (m.parts) { cos.contents.push(m); continue; }   // missatge ja format (eines)
        cos.contents.push({
          role: m.rol === 'assistent' ? 'model' : 'user',
          parts: [{ text: String(m.text) }]
        });
      }

      if (p.eines && p.eines.length) {
        cos.tools = [{
          functionDeclarations: p.eines.map(function (e) {
            var d = { name: e.nom, description: e.descripcio };
            // Un esquema amb `properties` buit fa que l'API retorni 400.
            // Una eina sense arguments simplement no declara paràmetres.
            if (e.esquema && e.esquema.properties && Object.keys(e.esquema.properties).length) {
              d.parameters = e.esquema;
            }
            return d;
          })
        }];
      }

      cos.generationConfig = {
        temperature: p.temperatura === undefined ? 0 : p.temperatura,
        maxOutputTokens: p.maxTokens || 1024
      };
      if (p.json) cos.generationConfig.responseMimeType = 'application/json';

      /* PENSAR ABANS DE RESPONDRE COSTA SEGONS, I AQUÍ GAIREBÉ MAI CAL.
         Els models nous es prenen una estona per pensar si no els dius el
         contrari. Però la feina d'aquí és mirar una fitxa que ja ve resolta
         i, com a molt, triar una eina: no hi ha res a rumiar. Amb l'àudio es
         notava el doble, i una pregunta de dos segons de veu en costava deu
         de resposta.

         Va per configuració i no clavat al codi: si algun dia hi ha una
         pregunta que sí que ho necessiti, es puja `pensa_tokens` al full.

         I NO S'ENDEVINA QUIN MODEL HO ACCEPTA. El primer intent ho endevinava
         pel nom i li va costar un error a la cara a en Pol: n'hi ha que volen
         un mínim i no zero. Ara es prova, i si el model es queixa, `crida`
         ho torna a demanar sense i se'n recorda per a la resta de l'execució. */
      var model = String(p._model || '');
      if (model && SENSE_RUMIAR[model] !== false) {
        cos.generationConfig.thinkingConfig = {
          thinkingBudget: Config.getNum('pensa_tokens', 0)
        };
      }

      return cos;
    },

    crida: function (p, model) {
      p._model = model;

      function envia(cos) {
        return UrlFetchApp.fetch(Gemini.url(model), {
          method: 'post',
          contentType: 'application/json',
          // La clau va a la capçalera, MAI a l'URL: els URLs acaben als registres.
          headers: { 'x-goog-api-key': clau_() },
          payload: JSON.stringify(cos),
          muteHttpExceptions: true
        });
      }

      var cos = Gemini.cos(p);
      var resposta = envia(cos);

      /* SI ES QUEIXA DE COM LI HO DEMANEM, S'HI TORNA SENSE LA PART OPCIONAL.
         L'única cosa opcional que hi posem és dir-li que no rumiï, i no tots
         els models l'accepten igual: n'hi ha que volen un mínim i no zero.
         Val més una resposta que triga tres segons de més que un error a la
         cara, i el registre ho diu perquè es pugui arreglar de debò. */
      if (resposta.getResponseCode() === 400 && cos.generationConfig.thinkingConfig) {
        Log.avis('ia.rumiar', 'El model ' + model + ' no accepta que li diguin de no rumiar. ' +
                              'Ho torno a demanar sense.',
                 { resposta: Utils.talla(resposta.getContentText(), 200) });
        delete cos.generationConfig.thinkingConfig;
        SENSE_RUMIAR[model] = false;      // en tota aquesta execució, ja no s'hi torna
        resposta = envia(cos);
      }

      var codi = resposta.getResponseCode();
      var text = resposta.getContentText();

      if (codi === 429) {
        // Google diu quant s'ha d'esperar i quina quota s'ha exhaurit.
        // Val la pena llegir-ho en comptes de reintentar a cegues.
        var d = Utils.desJson(text, {});
        var detalls = (d.error && d.error.details) || [];
        var espera = null, quota = null;
        for (var k = 0; k < detalls.length; k++) {
          if (detalls[k].retryDelay) espera = String(detalls[k].retryDelay);
          if (detalls[k].violations && detalls[k].violations[0]) {
            quota = detalls[k].violations[0].quotaId || detalls[k].violations[0].quotaMetric;
          }
        }
        Log.avis('ia.quota', 'Límit de quota assolit', { quota: quota, espera: espera });

        var segons = espera ? parseInt(espera, 10) : null;
        var e429 = new Error(
          'Has arribat al límit gratuït de Gemini' +
          (segons ? '. Torna-ho a provar d\'aquí ' + segons + ' segons.'
                  : '. Espera un minut i torna-hi.') +
          (quota ? ' (límit: ' + quota + ')' : '')
        );
        e429.quota = true;
        e429.esperaSegons = segons;
        throw e429;
      }
      if (codi >= 500) throw new Error('El servei d\'IA no respon ara mateix (codi ' + codi + ').');
      if (codi !== 200) {
        var detall = Utils.desJson(text, {});
        var msg = (detall.error && detall.error.message) ? detall.error.message : Utils.talla(text, 300);
        throw new Error('Error de l\'API (codi ' + codi + '): ' + msg);
      }

      return Gemini.interpreta(Utils.desJson(text, {}));
    },

    interpreta: function (dades) {
      var cand = (dades.candidates && dades.candidates[0]) || null;
      var parts = (cand && cand.content && cand.content.parts) || [];

      var textos = [];
      var crides = [];
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].text) textos.push(parts[i].text);
        if (parts[i].functionCall) {
          crides.push({ nom: parts[i].functionCall.name, args: parts[i].functionCall.args || {} });
        }
      }

      var us = dades.usageMetadata || {};
      return {
        text: textos.join('\n').trim(),
        crides: crides,
        motiuFi: cand ? cand.finishReason : null,
        contingutBrut: cand ? cand.content : null,
        tokensEntrada: us.promptTokenCount || 0,
        tokensSortida: us.candidatesTokenCount || 0
      };
    },

    /** Missatge a afegir a la conversa amb els resultats de les eines. */
    respostaEines: function (resultats) {
      return {
        role: 'user',
        parts: resultats.map(function (r) {
          return { functionResponse: { name: r.nom, response: r.resultat } };
        })
      };
    }
  };

  /**
   * Quins models pot fer servir AQUESTA clau, ara mateix.
   * Els noms dels models canvien i es retiren sense avisar; per això no n'hi ha
   * cap escrit a foc al codi: es demanen i es desen a `_Config`.
   */
  Gemini.models = function () {
    var resposta = UrlFetchApp.fetch(
      'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200',
      { method: 'get', headers: { 'x-goog-api-key': clau_() }, muteHttpExceptions: true });

    var codi = resposta.getResponseCode();
    if (codi !== 200) {
      throw new Error('No s\'ha pogut llegir la llista de models (codi ' + codi + '): ' +
                      Utils.talla(resposta.getContentText(), 200));
    }

    var dades = Utils.desJson(resposta.getContentText(), {});
    return (dades.models || [])
      .filter(function (m) {
        return (m.supportedGenerationMethods || []).indexOf('generateContent') !== -1;
      })
      .map(function (m) {
        return {
          id: String(m.name || '').replace(/^models\//, ''),
          nom: m.displayName || '',
          entrada: m.inputTokenLimit || 0,
          sortida: m.outputTokenLimit || 0
        };
      });
  };

  var PROVEIDORS = { gemini: Gemini };

  // ---------------------------------------------------------------- públic

  /**
   * Crida genèrica al model.
   *
   * p = {
   *   sistema:     text d'instruccions,
   *   missatges:   [{rol: 'usuari'|'assistent', text}] o missatges ja formats,
   *   eines:       [{nom, descripcio, esquema}] (opcional),
   *   model:       'barat' | 'bo' | id concret,
   *   maxTokens, temperatura, json
   * }
   *
   * Retorna {text, crides, tokensEntrada, tokensSortida} o llança un error
   * amb missatge llegible per a una persona.
   */
  function genera(p) {
    if (!disponible()) {
      var e = new Error(motiu() || 'La capa d\'IA no està disponible.');
      e.iaApagada = true;
      throw e;
    }

    var prov = PROVEIDORS[proveidor_()];
    if (!prov) {
      throw new Error('Proveïdor d\'IA desconegut: «' + proveidor_() + '». Revisa `proveidor_ia` a _Config.');
    }

    var model = p.model === 'bo' ? Config.get('model_bo')
              : p.model === 'barat' || !p.model ? Config.get('model_barat')
              : p.model;

    var intents = 0;
    var espera = 1000;
    while (true) {
      try {
        var r = prov.crida(p, model);
        r.model = model;
        return r;
      } catch (err) {
        intents++;
        /* La quota NO es reintenta. Un límit per minut no es recupera en
           quatre segons: reintentar-ho només afegeix espera abans de fallar
           igualment, i encara consumeix més quota. Es falla de seguida i
           es diu quant s'ha d'esperar. */
        var recuperable = !err.quota && /no respon ara mateix/.test(err.message || '');
        if (!recuperable || intents >= 2) {
          Log.error('ia.genera', err, { model: model, intents: intents });
          throw err;
        }
        Utilities.sleep(espera);
        espera *= 4;
      }
    }
  }

  /** Adapta els resultats de les eines al format del proveïdor actiu. */
  function missatgeEines(resultats) {
    var prov = PROVEIDORS[proveidor_()];
    return prov.respostaEines(resultats);
  }

  /** Models disponibles per al proveïdor actiu. */
  function models() {
    var prov = PROVEIDORS[proveidor_()];
    if (!prov || !prov.models) throw new Error('Aquest proveïdor no sap llistar models.');
    if (!clau_()) throw new Error('Falta la clau de l\'API a Script Properties (CLAU_IA).');
    return prov.models();
  }

  return {
    disponible: disponible,
    motiu: motiu,
    estat: estat,
    genera: genera,
    missatgeEines: missatgeEines,
    models: models
  };
})();
