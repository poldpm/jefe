# Popu — Posada en marxa (bloc 1: el nucli)

Fes-ho en aquest ordre, tot amb el compte **poldelpozomurgou@gmail.com**.
Triga uns 10 minuts. Al final tindràs el full de càlcul creat i el nucli funcionant.

---

## 1. Activa l'API d'Apps Script (un sol cop, per sempre)

1. Ves a <https://script.google.com/home/usersettings>
2. Comprova que estàs amb el compte **@gmail.com**, no amb el de l'escola
3. Activa **API de Google Apps Script**

Sense això, clasp no pot pujar res.

---

## 2. Inicia sessió amb clasp

Des de `C:\Claude\Popu`:

```bash
npx clasp login
```

S'obre el navegador. Tria el compte **@gmail.com** i accepta.

> Això crea `C:\Users\polca\.clasprc.json`, que **conté la teva sessió de Google**.
> No és dins del projecte i el `.gitignore` també el bloqueja. No l'enviïs mai a ningú.

---

## 3. Crea el projecte d'Apps Script

```bash
npx clasp create --type standalone --title "Popu" --rootDir apps-script
```

Això crea `.clasp.json` a l'arrel (ignorat pel git, conté l'identificador del projecte).

> **Si `.clasp.json` acaba dins de `apps-script/`**, mou-lo a l'arrel del projecte
> i comprova que hi digui `"rootDir": "apps-script"`. clasp a vegades el col·loca
> segons des d'on l'executes.

---

## 4. Puja el codi

```bash
npx clasp push
```

Ha de pujar 10 fitxers. Si et pregunta si vol sobreescriure el manifest, digues que sí.

---

## 5. Crea l'estructura de dades

```bash
npx clasp open
```

S'obre l'editor a script.google.com. Allà:

1. Al desplegable de funcions de la barra superior, tria **`configuraPopu`**
2. Prem **Executa**
3. La primera vegada demana permisos:
   - *Aquesta aplicació no està verificada* → **Configuració avançada** → **Ves a Popu (no segur)**
   - És teva i teu és el codi: aquest avís surt perquè Google no l'ha revisada, no perquè hi hagi cap problema
   - Accepta els permisos de fulls de càlcul i de connexió externa
4. Al **Registre d'execució** (a sota) hi ha de sortir l'URL del full de càlcul acabat de crear

---

## 6. Comprova que hi és

Obre l'URL que ha sortit al registre. Has de veure un full de càlcul anomenat
**Popu — Assistent** amb tres pestanyes:

| Pestanya | Què hi ha |
|---|---|
| `_Config` | 11 files de configuració: `ia_activa` = NO, `model_barat`, `zona_horaria`... |
| `_Registre` | Una entrada `INFO` dient que la configuració s'ha completat |
| `_Moduls` | Buida de moment |

**`_Moduls` buida és el resultat correcte en aquest bloc.** Els mòduls d'hàbits,
captura, tasques i diari arriben als blocs següents, i cadascun es crearà els
seus fulls tot sol quan tornis a executar `configuraPopu()`.

---

## 7. Desplega la web app

A l'editor d'Apps Script:

1. **Desplega** (a dalt a la dreta) → **Desplegament nou**
2. Engranatge ⚙️ al costat de *Tipus* → **Aplicació web**
3. Omple-ho així:

   | Camp | Valor |
   |---|---|
   | Descripció | `Popu v1` |
   | Executa com | **Jo** (`poldelpozomurgou@gmail.com`) |
   | Qui hi té accés | **Només jo** |

4. **Desplega** i **copia l'URL**. És l'adreça de la teva app.

> **«Només jo» és el que fa que ningú més hi pugui entrar.** Encara que algú
> tingués l'URL, Google li demanaria iniciar sessió amb el teu compte.

Obre l'URL: has de veure una pantalla fosca amb l'estat del sistema.

---

## 8. Instal·la-la al mòbil

**Android (Chrome):**
1. Obre l'URL de l'app
2. Menú ⋮ → **Afegeix a la pantalla d'inici**

**iPhone (Safari):**
1. Obre l'URL de l'app
2. Botó de compartir → **Afegeix a la pantalla d'inici**

A partir d'aquí s'obre com una app, sense barra d'adreces.

---

## Actualitzacions futures

Quan hi hagi codi nou:

```bash
npx clasp push
```

Si el canvi afecta els fulls (mòduls nous, columnes noves), executa també
`configuraPopu()` un cop des de l'editor. És sempre segur: no esborra res.

Si el canvi afecta la interfície, cal **Desplega → Gestiona desplegaments →
edita el desplegament → versió: Nova**, o l'app seguirà servint la versió antiga.

---

## Encara no cal

- **La clau de Gemini.** Arriba al bloc 6. La capa d'IA està apagada i el sistema
  funciona igualment.
- **Els triggers.** S'instal·len al bloc 6 amb `instalaTriggers()`.

---

## Si alguna cosa falla

| Símptoma | Causa i solució |
|---|---|
| `User has not enabled the Apps Script API` | Pas 1 no fet, o fet amb l'altre compte |
| `clasp push` no puja res | `.clasp.json` no té `"rootDir": "apps-script"` |
| `Popu no està configurat` a la web app | Falta executar `configuraPopu()` (pas 5) |
| La web app mostra la versió antiga | Cal desplegar **una versió nova**, no només `clasp push` |
| Un error i no saps què ha passat | Obre el full `_Registre`: hi és, amb data i origen |
