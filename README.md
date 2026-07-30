# Popu

Assistent personal sobre Google Sheets, Apps Script i una capa d'IA.
Ús privat, un sol usuari, prioritat mòbil.

## Com està muntat

| Peça | Paper |
|---|---|
| **Google Sheets** | Única font de veritat. Totes les dades hi viuen. |
| **Apps Script (web app)** | Interfície i lògica. Accés restringit al propietari. |
| **API de Gemini** | Capa conversacional i d'anàlisi. Opcional: el sistema funciona amb la capa apagada. |
| **Triggers** | Resum diari, revisió setmanal, manteniment nocturn. |
| **GitHub** | Versionat del codi. |

## Estructura

```
apps-script/
  00_Config.gs        Configuració i accés al full de càlcul
  01_Utils.gs         Dates, identificadors, text
  05_Registre.gs      Registre d'esdeveniments
  10_Dades.gs         Lectura i escriptura (única porta al full)
  15_Esquema.gs       Creació i migració de fulls, no destructiva
  20_Moduls.gs        Descobriment automàtic de mòduls
  30_Encaminador.gs   doGet i api()
  50_IA.gs            Adaptador del proveïdor d'IA
  90_Instalacio.gs    Instal·lació, triggers, manteniment
  40_Mod_*.gs         Els mòduls
  ui_*.html           Interfície
docs/                 Instruccions de posada en marxa
MODULS.md             Contracte per afegir mòduls nous
```

## Posada en marxa

Vegeu [`docs/01-posada-en-marxa.md`](docs/01-posada-en-marxa.md).

## Res secret al repositori

La clau de l'API i l'identificador del full de càlcul viuen a **Script Properties**
del projecte d'Apps Script, mai al codi. El `.gitignore` bloqueja `.clasprc.json`
(sessió de Google), `.clasp.json`, `.env` i qualsevol fitxer de credencials.
