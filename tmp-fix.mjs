import fs from 'fs';
const p = 'eines/prova.mjs';
let s = fs.readFileSync(p, 'utf8');

const vell = `  const obre = (url, jaOberta) => {
    let obertes = [], navegat = null, missatges = [];
    const finestra = { url: arrel, focus: () => finestra,
                       navigate: (u) => { navegat = u; return Promise.resolve(finestra); },
                       postMessage: (m) => missatges.push(m) };
    const c = { String, Promise,
      self: { registration: { scope: arrel },
              clients: { matchAll: () => Promise.resolve(jaOberta ? [finestra] : []),
                         openWindow: (u) => { obertes.push(u); return Promise.resolve(); } },
              addEventListener: (n, f) => { c.__f = f; } } };
    c.self.self = c.self;
    vm.createContext(c);
    vm.runInContext(bloc, c);
    c.__f({ notification: { close: () => {}, data: { url } }, waitUntil: (p) => p });
    return { obertes, navegat, missatges };
  };

  cal('el treballador obre l\'adreça sencera, no la relativa',
      obre('escola', false).obertes[0] === arrel + '#escola', obre('escola', false).obertes[0]);
  cal('i amb l\'app ja oberta hi navega en comptes de deixar-te on eres',
      obre('escola', true).navegat === arrel + '#escola');
  cal('i a més li ho diu per missatge, que és instantani',
      (obre('escola', true).missatges[0] || {}).vista === 'escola');`;

/* El treballador contesta amb una promesa —`matchAll` ho és— i la primera
   versió d'aquesta prova llegia el resultat abans que hi fos. Fallava la
   prova, no el codi. */
const nou = `  const obre = async (url, jaOberta) => {
    let obertes = [], navegat = null, missatges = [], guardat = null;
    const finestra = { url: arrel, focus: () => finestra,
                       navigate: (u) => { navegat = u; return Promise.resolve(finestra); },
                       postMessage: (m) => missatges.push(m) };
    const c = { String, Promise,
      self: { registration: { scope: arrel },
              clients: { matchAll: () => Promise.resolve(jaOberta ? [finestra] : []),
                         openWindow: (u) => { obertes.push(u); return Promise.resolve(); } },
              addEventListener: (n, f) => { c.__f = f; } } };
    c.self.self = c.self;
    vm.createContext(c);
    vm.runInContext(bloc, c);
    /* \`waitUntil\` és per on el treballador diu «encara no he acabat»: aquí
       s'agafa la promesa i s'espera, que és el que fa el navegador de debò. */
    c.__f({ notification: { close: () => {}, data: { url } },
            waitUntil: (pr) => { guardat = pr; } });
    await guardat;
    return { obertes, navegat, missatges };
  };

  const tancada = await obre('escola', false);
  cal('el treballador obre l\'adreça sencera, no la relativa',
      tancada.obertes[0] === arrel + '#escola', tancada.obertes[0]);

  const oberta = await obre('escola', true);
  cal('i amb l\'app ja oberta hi navega en comptes de deixar-te on eres',
      oberta.navegat === arrel + '#escola', oberta.navegat);
  cal('i a més li ho diu per missatge, que és instantani',
      (oberta.missatges[0] || {}).vista === 'escola', JSON.stringify(oberta.missatges));`;

if (!s.includes(vell)) { console.log('no trobo el bloc'); process.exit(1); }
s = s.replace(vell, nou);
fs.writeFileSync(p, s);
console.log('prova arreglada');
