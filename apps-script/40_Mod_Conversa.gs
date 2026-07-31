/**
 * JEFE — MÒDUL · Conversa
 *
 * La pantalla on parles amb les teves pròpies dades.
 * Ordre 5: va davant de tot, perquè és el que has d'obrir primer.
 *
 * L'historial viu al full `Converses`, no al navegador: comences una conversa
 * al mòbil i la continues a l'ordinador.
 */
function MODUL_CONVERSA() {
  return {
    id: 'conversa',
    nom: 'JEFE',
    icona: 'conversa',
    ordre: 5,
    versioEsquema: 1,

    fulls: [{
      nom: 'Converses',
      columnes: [
        { nom: 'id_conversa',     tipus: 'text' },
        { nom: 'seq',             tipus: 'num'  },
        { nom: 'marca_temps',     tipus: 'iso'  },
        { nom: 'rol',             tipus: 'text', valors: ['usuari', 'assistent'] },
        { nom: 'text',            tipus: 'text' },
        { nom: 'eines',           tipus: 'json' },
        { nom: 'tokens_entrada',  tipus: 'num'  },
        { nom: 'tokens_sortida',  tipus: 'num'  },
        { nom: 'model',           tipus: 'text' }
      ]
    }],

    accions: {
      estat:     function ()  { return Conversa.estat(); },
      historial: function (p) { return Conversa.historial(p.id_conversa); },
      envia:     function (p) { return Conversa.envia(p.text, p.id_conversa); },
      nova:      function ()  { return Conversa.nova(); },
      confirma:  function (p) { return Conversa.confirma(p.eina, p.args); }
    },

    vista: 'vista_conversa'
  };
}


var Conversa = (function () {

  var MAX_CONTEXT = 12;    // torns que s'envien al model: més no millora i costa

  function estat() {
    return {
      disponible: IA.disponible(),
      motiu: IA.motiu(),
      suggeriments: suggeriments_()
    };
  }

  /** Suggeriments construïts amb el que hi ha de debò, no una llista fixa. */
  function suggeriments_() {
    var s = [];
    try {
      var habits = Habits.definicions();
      if (habits.length) {
        s.push('Com he anat aquest mes?');
        s.push('Quin hàbit em costa més?');
        s.push('Quants dies porto de ratxa amb ' + habits[0].nom.toLowerCase() + '?');
      }
    } catch (e) { /* el mòdul d'hàbits pot no existir */ }
    if (!s.length) s.push('Què pots fer?');
    return s;
  }

  function idActual_() {
    var files = Dades.llegeix('Converses');
    if (!files.length) return null;
    return String(files[files.length - 1].id_conversa);
  }

  function nova() {
    var id = Utils.nouId('cnv');
    Log.info('conversa.nova', 'Conversa nova', { id: id });
    return { id_conversa: id, missatges: [] };
  }

  function historial(idConversa) {
    var id = idConversa || idActual_();
    if (!id) return { id_conversa: Utils.nouId('cnv'), missatges: [] };

    var files = Dades.llegeix('Converses', { id_conversa: id });
    files.sort(function (a, b) { return (Number(a.seq) || 0) - (Number(b.seq) || 0); });

    return {
      id_conversa: id,
      missatges: files.map(function (f) {
        return {
          rol: f.rol,
          text: String(f.text),
          marca_temps: f.marca_temps,
          eines: Utils.desJson(f.eines, [])
        };
      })
    };
  }

  function desa_(id, seq, rol, text, extra) {
    var fila = {
      id_conversa: id, seq: seq, marca_temps: Utils.ara(),
      rol: rol, text: String(text)
    };
    if (extra) {
      fila.eines = extra.eines ? Utils.json(extra.eines) : '';
      fila.tokens_entrada = extra.tokens ? extra.tokens.entrada : '';
      fila.tokens_sortida = extra.tokens ? extra.tokens.sortida : '';
      fila.model = extra.model || '';
    }
    Dades.insereix('Converses', fila);
  }

  /**
   * Envia un missatge. El teu text es desa SEMPRE, encara que la IA falli
   * després: perdre el que has escrit perquè el servei no respon és inacceptable.
   */
  function envia(text, idConversa) {
    text = String(text || '').trim();
    if (!text) throw new Error('No has escrit res.');
    if (text.length > 4000) throw new Error('Massa llarg. Parteix-ho en dos missatges.');

    var h = historial(idConversa);
    var id = h.id_conversa;
    var seq = h.missatges.length;

    desa_(id, seq, 'usuari', text);

    var context = h.missatges.slice(-MAX_CONTEXT).map(function (m) {
      return { rol: m.rol, text: m.text };
    });
    context.push({ rol: 'usuari', text: text });

    var r;
    try {
      r = Assistent.pregunta(context);
    } catch (err) {
      Log.error('conversa.envia', err);
      return {
        id_conversa: id,
        pregunta: text,
        error: err.message,
        iaApagada: !!err.iaApagada
      };
    }

    desa_(id, seq + 1, 'assistent', r.text, {
      eines: r.einesUsades, tokens: r.tokens, model: r.model
    });

    return {
      id_conversa: id,
      pregunta: text,
      resposta: r.text,
      propostes: r.propostes,
      eines: r.einesUsades,
      tokens: r.tokens
    };
  }

  /**
   * Executa una proposta que has confirmat tu.
   * Aquest és l'únic camí pel qual la IA arriba a escriure a les teves dades,
   * i el dispares tu amb un botó.
   */
  function confirma(nomEina, args) {
    var totes = Assistent.eines();
    var eina = null;
    for (var i = 0; i < totes.length; i++) if (totes[i].nom === nomEina) eina = totes[i];

    if (!eina) throw new Error('Aquesta acció ja no existeix.');
    if (!eina.escriu) throw new Error('Aquesta acció no escriu res, no cal confirmar-la.');

    var resultat = eina.executa(args || {});
    Log.info('conversa.confirma', 'Proposta confirmada: ' + nomEina, args);
    return { fet: true, eina: nomEina, resultat: resultat };
  }

  return {
    estat: estat, historial: historial, envia: envia,
    nova: nova, confirma: confirma
  };
})();
