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

      return cos;
    },

    crida: function (p, model) {
      var resposta = UrlFetchApp.fetch(Gemini.url(model), {
        method: 'post',
        contentType: 'application/json',
        // La clau va a la capçalera, MAI a l'URL: els URLs acaben als registres.
        headers: { 'x-goog-api-key': clau_() },
        payload: JSON.stringify(Gemini.cos(p)),
        muteHttpExceptions: true
      });

      var codi = resposta.getResponseCode();
      var text = resposta.getContentText();

      if (codi === 429) {
        var e429 = new Error('Has arribat al límit gratuït de peticions. Torna-ho a provar d\'aquí una estona.');
        e429.quota = true;
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
        // Reintenta només el que té sentit reintentar, i poques vegades.
        var recuperable = err.quota || /no respon ara mateix/.test(err.message || '');
        if (!recuperable || intents >= 3) {
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

  return {
    disponible: disponible,
    motiu: motiu,
    estat: estat,
    genera: genera,
    missatgeEines: missatgeEines
  };
})();
