/**
 * JEFE — treballador de servei de les notificacions
 *
 * Aquest és el que rep les notificacions quan JEFE està TANCAT. És un
 * treballador separat del `sw.js` de l'app: només s'ocupa de missatges, i
 * es registra amb un abast propi (`./fcm/`) per no barallar-se amb l'altre,
 * perquè un abast només pot tenir un treballador.
 *
 * La configuració la llegeix de firebase.config.json, el mateix fitxer que
 * fa servir la pàgina. Una sola font per als dos.
 */

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

var llest = fetch('./firebase.config.json')
  .then(function (r) { return r.json(); })
  .then(function (cfg) {
    if (!cfg.apiKey || cfg.apiKey.indexOf('POSA-HI') === 0) {
      throw new Error('firebase.config.json encara té els valors d\'exemple');
    }
    firebase.initializeApp({
      apiKey: cfg.apiKey,
      projectId: cfg.projectId,
      messagingSenderId: cfg.messagingSenderId,
      appId: cfg.appId
    });

    firebase.messaging().onBackgroundMessage(function (missatge) {
      var d = (missatge && missatge.data) || {};
      return self.registration.showNotification(d.titol || 'JEFE', {
        body: d.cos || '',
        icon: './icona.svg',
        badge: './favicon.svg',
        // Mateixa etiqueta = es reemplaça en comptes d'acumular-se. Sense
        // això, set recordatoris deixarien set línies a la barra.
        tag: d.etiqueta || 'jefe',
        renotify: true,
        data: { url: d.url || './' },
        vibrate: [60, 40, 60]
      });
    });
  })
  .catch(function (e) {
    console.warn('JEFE: notificacions no configurades —', e.message);
  });

/** En tocar la notificació: si JEFE ja és obert, s'hi va; si no, s'obre. */
self.addEventListener('notificationclick', function (ev) {
  ev.notification.close();
  var desti = (ev.notification.data && ev.notification.data.url) || './';

  ev.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (finestres) {
      for (var i = 0; i < finestres.length; i++) {
        if (finestres[i].url.indexOf(self.registration.scope.replace(/fcm\/$/, '')) === 0) {
          return finestres[i].focus();
        }
      }
      return self.clients.openWindow(desti);
    })
  );
});
