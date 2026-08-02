# Contracte d'extensió de mòduls

> **L'objectiu d'aquest document és que d'aquí a un any puguis afegir un mòdul nou
> creant un sol fitxer, sense tocar el nucli ni cap altre mòdul.**
> Si algun dia per afegir una funcionalitat has hagut de modificar un fitxer del
> nucli, això és un error del nucli, no teu.

---

## 1. La regla d'or

**Un mòdul = un fitxer.**

Crees `40_Mod_<Nom>.gs` amb una funció global anomenada `MODUL_<NOM>()` que retorna
un descriptor. El nucli l'escombra sola de l'espai global en arrencar
(`modulsRegistrats_()` a `20_Moduls.gs`) i a partir d'aquí:

- li crea els fulls que declari,
- li encamina les accions des de la interfície,
- el pinta a la pantalla d'inici,
- li demana context quan parles amb la IA.

No hi ha cap llista de mòduls per mantenir. No hi ha cap `import`. No hi ha cap
registre manual.

**El nom ha de complir exactament el patró `MODUL_` + majúscules, xifres o `_`.**

| Nom | Detectat |
|---|---|
| `MODUL_HABITS` | ✅ |
| `MODUL_REGISTRE_AIGUA` | ✅ |
| `MODUL_Habits` | ❌ (minúscules) |
| `modulHabits` | ❌ (prefix incorrecte) |

---

## 2. Fitxers del nucli — què és intocable

| Fitxer | Què fa | El toques? |
|---|---|---|
| `00_Config.gs` | Configuració i accés al full de càlcul | **Mai** |
| `01_Utils.gs` | Dates, identificadors, text | **Mai** |
| `05_Registre.gs` | Registre d'esdeveniments | **Mai** |
| `10_Dades.gs` | Lectura i escriptura al full | **Mai** |
| `15_Esquema.gs` | Creació i migració de fulls | **Mai** |
| `20_Moduls.gs` | Descobriment de mòduls | **Mai** |
| `30_Encaminador.gs` | `doGet` i `api()` | **Mai** |
| `50_IA.gs` | Adaptador del proveïdor d'IA | Només per canviar de proveïdor |
| `90_Instalacio.gs` | Instal·lació i triggers | **Mai** |
| `40_Mod_*.gs` | Els mòduls | **Aquí és on treballes** |

Els números del nom de fitxer només serveixen perquè l'editor els mostri en ordre.
Apps Script carrega tots els fitxers abans d'executar res, així que l'ordre real
no importa.

---

## 3. El descriptor, camp a camp

Tot és opcional excepte `id`, `nom` i `ordre`.

| Camp | Tipus | Què fa |
|---|---|---|
| `id` | text | Identificador intern. Minúscules, sense espais. **Obligatori.** |
| `nom` | text | Com surt a la interfície. **Obligatori.** |
| `icona` | text | Emoji o caràcter. Surt a la barra de navegació. |
| `ordre` | número | Posició. Nucli: 10, 20, 30... Deixa forats per encabir-hi coses. **Obligatori.** |
| `versioEsquema` | número | Puja'l quan canviïs les columnes. Serveix per rastrejar migracions. |
| `actiu` | booleà | Si és `false`, el nucli l'ignora del tot. Útil per desenvolupar. |
| `fulls` | array | Els fulls que necessita. El nucli els crea i els migra. |
| `accions` | objecte | Funcions cridables des de la interfície. |
| `resumInici` | funció | Una línia per a la pantalla d'inici. Ha de ser barata. |
| `resumPeriode` | funció | `(desde, fins)` → `{titol, linies: []}`. Què ha passat entre dues dates. Ho fa servir la revisió setmanal. Retorna `null` si no hi ha res a dir. |
| `elDia` | funció | `(data)` → `{titol, urgent, accio, coses: [{text, menut, fet, urgent}]}`. Què hi ha d'aquell dia, per ensenyar-ho. Ho fa servir la pàgina del dia. Retorna `null` si no hi ha res. |
| `contextIA` | funció | Fitxa curta per a la conversa. **Mai el full sencer.** |
| `einesIA` | array | Consultes que la IA pot fer per demanar-ne més dades. |
| `vista` | text | Nom del fitxer HTML de la seva pantalla. |

---

## 4. Exemple complet i comentat

Aquest mòdul **no forma part de la V1**. És l'exemple de referència: copia'l,
canvia-hi els noms i tens un mòdul nou funcionant.

```javascript
/**
 * 40_Mod_Lectures.gs — MÒDUL D'EXEMPLE
 * Ni una sola línia del nucli s'ha tocat per afegir això.
 */
function MODUL_LECTURES() {
  return {

    // ---------- identitat ----------
    id: 'lectures',
    nom: 'Lectures',
    icona: '📖',
    ordre: 50,
    versioEsquema: 1,

    // ---------- 1. Els fulls que necessita ----------
    // El nucli els crea si no hi són i hi afegeix les columnes que faltin.
    // Mai esborra ni reordena res: si canvies un nom de columna, la vella
    // es queda amb les dades i t'avisa al registre.
    //
    // tipus: 'text' | 'data' (AAAA-MM-DD) | 'iso' | 'num' | 'json'
    // `valors` és documentació: el nucli no valida, valida el mòdul.
    fulls: [{
      nom: 'Lectures',
      columnes: [
        { nom: 'id',             tipus: 'text' },
        { nom: 'creat_el',       tipus: 'iso'  },
        { nom: 'titol',          tipus: 'text' },
        { nom: 'autor',          tipus: 'text' },
        { nom: 'estat',          tipus: 'text', valors: ['llegint', 'acabat', 'abandonat'] },
        { nom: 'pagines',        tipus: 'num'  },
        { nom: 'acabat_el',      tipus: 'data' },
        { nom: 'actualitzat_el', tipus: 'iso'  }
      ]
    }],

    // ---------- 2. Què pot fer la interfície ----------
    // Es criden des del client amb:
    //     crida('lectures', 'afegeix', {titol: '...'})
    // El nucli captura les excepcions i les converteix en {ok: false, error}.
    // El mòdul no ha de gestionar errors de transport.
    accions: {

      llista: function (p) {
        var filtre = {};
        if (p.estat) filtre.estat = p.estat;
        return Dades.llegeix('Lectures', filtre);
      },

      afegeix: function (p) {
        if (!p.titol) throw new Error('Cal un títol.');
        return Dades.insereix('Lectures', {
          titol: String(p.titol).trim(),
          autor: p.autor || '',
          estat: 'llegint',
          pagines: 0
        }, 'lec');                       // 'lec' és el prefix dels identificadors
      },

      acaba: function (p) {
        return Dades.actualitza('Lectures', p.id, {
          estat: 'acabat',
          acabat_el: Utils.avui()
        });
      }
    },

    // ---------- 3. La pantalla d'inici ----------
    // S'executa a cada càrrega de l'app. Ha de ser barat: comptar files, no
    // recórrer un any de dades. Si peta, el nucli ho registra i la resta de
    // la pantalla continua funcionant.
    resumInici: function () {
      var enCurs = Dades.compta('Lectures', { estat: 'llegint' });
      return {
        etiqueta: 'Llegint',
        valor: enCurs,
        urgent: false,               // true → es pinta destacat
        accio: 'lectures'            // a quin mòdul porta el toc
      };
    },

    // ---------- 4. Context per a la conversa amb la IA ----------
    // Text CURT que s'envia sempre. Poques desenes de paraules.
    // Si aquí hi aboques tot el full, cada pregunta que facis serà lenta,
    // cara i pitjor: el model es perdrà entre dades irrellevants.
    contextIA: function () {
      var enCurs = Dades.llegeix('Lectures', { estat: 'llegint' });
      if (!enCurs.length) return 'Lectures: cap llibre començat.';
      return 'Lectures en curs (' + enCurs.length + '): ' +
             enCurs.map(function (l) { return l.titol; }).join(', ') + '.';
    },

    // ---------- 5. Eines que la IA pot cridar ----------
    // Quan la fitxa curta no basta, el model demana dades concretes.
    // Regles dures:
    //   - retorna com a màxim uns centenars de files,
    //   - si el rang és gran, retorna dades agregades,
    //   - inclou-hi SEMPRE quantes files has trobat, encara que siguin zero:
    //     un zero explícit és el que evita que el model s'inventi la resposta.
    einesIA: [{
      nom: 'consulta_lectures',
      descripcio: 'Retorna els llibres de l\'usuari, opcionalment filtrats per estat.',
      esquema: {
        type: 'object',
        properties: {
          estat: { type: 'string', enum: ['llegint', 'acabat', 'abandonat'] }
        }
      },
      executa: function (args) {
        var files = Dades.llegeix('Lectures', args.estat ? { estat: args.estat } : null);
        return {
          files: files.length,
          lectures: files.slice(0, 100).map(function (l) {
            return { titol: l.titol, autor: l.autor, estat: l.estat };
          })
        };
      }
    }],

    // ---------- 6. La seva pantalla ----------
    // Nom d'un fitxer HTML del projecte (sense extensió).
    // Si l'omets, el mòdul no té pestanya pròpia: només aporta dades.
    vista: 'vista_lectures'
  };
}
```

### El fitxer de la vista

`vista_lectures.html` — el mòdul no porta CSS propi: fa servir els components del nucli.

```html
<script>
App.registraVista('lectures', {

  // Es crida en entrar a la pestanya. `el` és el contenidor buit.
  render: function (el) {
    el.innerHTML = Comp.carregant();

    crida('lectures', 'llista', {}, function (r) {
      if (!r.ok) return el.innerHTML = Comp.error(r.error);
      if (!r.dades.length) return el.innerHTML = Comp.buit('Cap lectura encara');

      el.innerHTML = r.dades.map(function (l) {
        return Comp.targeta({ titol: l.titol, subtitol: l.autor });
      }).join('');
    });
  }
});
</script>
```

---

## 5. Llista de comprovació d'un mòdul nou

- [ ] El fitxer es diu `40_Mod_<Nom>.gs`
- [ ] La funció es diu `MODUL_<NOM>()`, en majúscules
- [ ] Té `id`, `nom` i `ordre`
- [ ] Cap columna es diu igual que una altra dins del mateix full
- [ ] Les dates es desen com a text `AAAA-MM-DD`, no com a data de Sheets
- [ ] `resumInici()` no recorre més de dues o tres desenes de files
- [ ] `contextIA()` cap en un parell de línies
- [ ] Les eines de la IA retornen el recompte de files, encara que sigui zero
- [ ] Cap acció esborra res: s'arxiva
- [ ] Si té números que valgui la pena mirar cada setmana, implementa `resumPeriode()` i sortirà sol a la revisió del diumenge
- [ ] Si té coses que has de tenir en compte un dia concret, implementa `elDia()` i sortirà sol a la pàgina del dia
- [ ] Si alguna eina seva ha d'obrir una pantalla en comptes de només contestar, posa-li `obre: 'nomDeLaVista'`
- [ ] Has executat `configuraJefe()` perquè el nucli li creï els fulls
- [ ] Si té pantalla, l'has afegida a `ui_index.html` amb `include()`

---

## 6. Mòduls futurs previstos

**No estan implementats i no ho estaran fins que els demanis.** Són aquí perquè
l'arquitectura els contempla, no perquè existeixin. Un sistema amb quinze mòduls
buits és un sistema mort.

| Mòdul | Fulls que necessitaria | Per què encara no hi és |
|---|---|---|
| **Finances** | `Moviments`, `Categories`, `Pressupostos` | Cal decidir abans si les dades s'importen del banc o s'entren a mà. Sense això, el mòdul neix mal plantejat. |
| **Salut** | `Registres`, `Mesures` | Se solapa amb hàbits. Primer cal veure què acabes registrant realment com a hàbit. |
| **Entrenaments** | `Sessions`, `Rutes`, `Marques` | Té sentit el dia que s'integri amb el rellotge o amb Strava. Entrar-ho a mà és feina que no faràs. |
| **Correu** | Cap: llegiria de Gmail | El mateix, amb més risc: llegir correu és molta superfície. |
| **Projectes** | `Projectes` + columna nova a `Tasques` | La V1 diu explícitament tasques planes. Afegir-ho abans de saber si les fas servir seria endevinar. |
| **Objectius anuals** | `Objectius`, `Fites` | Necessita mesos de dades d'hàbits i tasques per dir res útil. |
| **Mètriques avançades** | Cap full nou: llegiria dels existents | Correlacions entre hàbits, diari i tasques. Amb tres setmanes de dades no diria res de veritat. |

**El criteri per afegir-ne un:** que hagis trobat a faltar la funcionalitat
almenys tres vegades fent servir el sistema de veritat. No abans.
