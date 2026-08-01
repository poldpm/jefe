/**
 * JEFE — treballador de servei de les notificacions
 *
 * AIXÒ ÉS UNA PLANTILLA. El fitxer que es fa servir és
 * `firebase-messaging-sw.js`, a l'arrel, i el genera `npm run construeix`
 * amb la configuració de `firebase.config.json` posada a dins. No l'editis
 * allà: es reescriu a cada construcció.
 *
 * PER QUÈ VA A DINS I NO ES DEMANA
 * Quan arriba una notificació amb l'app tancada, el navegador arrenca aquest
 * fitxer de zero i dispara l'esdeveniment tot seguit. Tot el que es registri
 * després —dins d'un `then`, esperant una petició— arriba tard i no el sent
 * ningú: el missatge es perd en silenci, sense error enlloc. Per tant la
 * configuració ha d'estar aquí dins, i tot ha de passar de dalt a baix.
 *
 * És un treballador separat del `sw.js` de l'app, amb abast propi (`./fcm/`),
 * perquè un abast només pot tenir un treballador.
 */

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

var CONFIG = /*__CONFIG__*/ null /*__FI__*/;

if (CONFIG && CONFIG.apiKey) {
  firebase.initializeApp(CONFIG);

  firebase.messaging().onBackgroundMessage(function (missatge) {
    var d = (missatge && missatge.data) || {};
    return self.registration.showNotification(d.titol || 'JEFE', {
      body: d.cos || '',
      // Sense `icon` a posta: Android no dibuixa icones SVG a les
      // notificacions, i la nostra ho és. Com que l'app està instal·lada,
      // el sistema hi posa la seva. Si la volem pròpia, caldrà un PNG.
      // Mateixa etiqueta = es reemplaça en comptes d'acumular-se. Sense
      // això, set recordatoris deixarien set línies a la barra.
      tag: d.etiqueta || 'jefe',
      renotify: true,
      data: { url: d.url || './' },
      vibrate: [60, 40, 60]
    });
  });
} else {
  console.warn('JEFE: firebase.config.json encara té els valors d\'exemple.');
}

/** En tocar la notificació: si JEFE ja és obert, s'hi va; si no, s'obre. */
self.addEventListener('notificationclick', function (ev) {
  ev.notification.close();
  var desti = (ev.notification.data && ev.notification.data.url) || './';
  var arrel = self.registration.scope.replace(/fcm\/$/, '');

  ev.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (finestres) {
      for (var i = 0; i < finestres.length; i++) {
        if (finestres[i].url.indexOf(arrel) === 0) return finestres[i].focus();
      }
      return self.clients.openWindow(desti);
    })
  );
});

// Que una versió nova entri de seguida. Si no, es queda esperant que l'antiga
// quedi ociosa i pots passar-te el dia provant la d'abans sense saber-ho.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (ev) { ev.waitUntil(self.clients.claim()); });
