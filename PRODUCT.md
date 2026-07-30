# Popu — context de producte

> Escrit a partir del briefing de l'usuari, no d'una entrevista simulada.
> Tot el que hi ha aquí són paraules seves o decisions preses en conversa amb ell.

## Què és

L'assistent personal d'una sola persona. El seu cervell extern. Un sistema que
amb el temps ha de gestionar la seva vida sencera, des del seguiment d'hàbits
diaris fins al més complex que sigui possible.

No és un producte per vendre. No té usuaris. En té un.

## Mecanisme únic

Les dades viuen en un full de càlcul que ell controla, i una capa d'IA les llegeix
per convertir un registre de dades en un assistent que respon sobre la seva vida
real. La combinació és el producte: **propietat total de les dades + interpretació**.

## Qui l'usa

Una persona: mestre de primària i agent rural. Fa senderisme i curses de muntanya.
Català. Treballa sempre amb Google Sheets, Apps Script i GitHub.

Els tres contextos de la seva vida són explícitament aquests, i marquen el
vocabulari de tot el sistema: **docència, agent rural, personal**.

## L'escena real d'ús

Aquest és el punt que decideix el disseny:

- **Al mòbil**, sovint dret, amb una mà i amb pressa. A fora, amb sol directe.
  També de nit. Marcar un hàbit ha de ser el camí més curt de tota l'app: si
  triga més de 5 segons des de tocar la icona, el mòdul ha fracassat.
- **A l'ordinador**, assegut, amb pantalla ampla. Aquí no hi ha pressa: hi mira
  l'històric, hi escriu el diari, hi conversa amb les seves dades, hi revisa la
  setmana. **Requisit explícit: ha de poder fer servir totes dues indistintament
  i veure-hi el mateix.**

No són la mateixa app amb amplades diferents. Són dos moments diferents del mateix
dia, i el disseny ho ha de reconèixer.

## Què ha de provar la primera superfície

Que registrar la vida pròpia pot ser instantani i, alhora, valer la pena mirar-s'ho.

## Restriccions dures

- Google Apps Script serveix les pàgines. **Sense frameworks pesants.** HTML i CSS
  estàndard, i res que Apps Script no pugui servir amb fiabilitat.
- **L'arrencada en fred d'una web app d'Apps Script és d'1,5 a 3,5 segons.** Qualsevol
  cosa que afegeixi latència (fonts web pesades, imatges grans, biblioteques)
  ataca directament el requisit dels 5 segons.
- Contrast alt obligatori: ús a l'exterior amb sol i també de nit.
- Àrees de toc de 44px mínim; accions freqüents a l'abast del polze.
- Accés privat, un sol usuari.
- Dades a Google Sheets com a única font de veritat; localStorage només com a
  memòria cau.

## Compromisos de marca

Cap logotip, cap paleta corporativa, cap tipografia heretada. Món visual lliure.

Sí que hi ha una instrucció explícita de l'usuari sobre el to:
**«Res de "modern" ni "professional".»** I, després de veure la primera versió:
volia alguna cosa **espectacular, innovadora, diferent**. Una versió correcta i
prudent es considera un fracàs en aquest projecte.

## Abast de la V1

Quatre mòduls i res més: hàbits diaris, captura ràpida, tasques, diari i revisió.
Més una capa conversacional transversal sobre les dades pròpies.

Finances, salut, entrenaments, calendari, correu, projectes, objectius anuals i
mètriques avançades estan **previstos per l'arquitectura i no implementats**.

## Reclamacions que no es poden inventar

Cap. No hi ha preus, ni clients, ni referències, ni mètriques de negoci.
Les dades de mostra que aparegui a qualsevol demostració són sintètiques i
s'han d'etiquetar com a tals.
