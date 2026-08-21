/* ============================================================ */
/* ZOORIGEN - Service Worker                                    */
/* Alcance: / (dominio propio www.zoorigen.com, deploy en raiz) */
/*                                                              */
/* COMO SE INVALIDA LA CACHE                                     */
/*                                                              */
/* Mecanismo principal: el sufijo ?v=AAAAMMDD de cada asset.     */
/*   Al desplegar un cambio en club.css, club-mobile.css,        */
/*   club-theme.css o club.js se sube ese sufijo en los HTML     */
/*   Y en el array SHELL de abajo. Como la URL cambia, deja de   */
/*   haber coincidencia con la entrada vieja y el navegador      */
/*   pide la nueva. Las dos listas deben moverse juntas: si se   */
/*   actualizan los HTML y no el SHELL, el asset sale de         */
/*   precache y se sirve por red en la primera visita.           */
/*                                                              */
/* Respaldo: subir la version de CACHE (v1 -> v2). Purga todo    */
/*   de golpe (el activate borra las caches con otro nombre).    */
/*   Reservado para cambios estructurales de este archivo o      */
/*   para recuperarse de una cache corrupta, no para el ciclo    */
/*   normal de despliegue.                                       */
/* ============================================================ */

const CACHE = 'zoorigen-v1';

const OFFLINE_URL = '/offline.html';

/* App shell: SOLO lo que se precachea. Nada de assets muertos
   (admin.js, club-extra.js, especies-data.js, stripe-config.js,
   club-extra.css) ni de endpoints externos. */
const SHELL = [
  OFFLINE_URL,
  '/assets/css/club.css?v=20260820',
  '/assets/css/club-mobile.css?v=20260820',
  '/assets/css/club-theme.css?v=20260820',
  '/assets/js/club.js?v=20260820',
  '/assets/img/icon-192.png',
  '/assets/img/icon-512.png',
  '/assets/img/icon-maskable-192.png',
  '/assets/img/icon-maskable-512.png',
  '/assets/img/icon-apple-touch.png'
];

/* Hosts / rutas que NUNCA se cachean ni se interceptan.
   Todas son de otro origen, asi que la guarda de same-origin ya las
   excluye; la lista queda explicita como segunda barrera por si
   alguna llegara a servirse desde el propio dominio. */
const BYPASS = [
  'firebase',
  'firestore',
  'googleapis',
  'identitytoolkit',
  'gstatic',
  'firebaseio',
  'firebaseapp',
  'stripe',
  'railway.app'
];

function debeIgnorarse(url) {
  const u = url.hostname + url.pathname;
  return BYPASS.some(function (frag) { return u.indexOf(frag) !== -1; });
}

/* ═══════════════ INSTALL ═══════════════ */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) {
        // addAll es atomico: si un archivo falla, no se instala nada.
        // Los pedimos de red explicitamente para no heredar la cache HTTP.
        return cache.addAll(SHELL.map(function (u) {
          return new Request(u, { cache: 'reload' });
        }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

/* ═══════════════ ACTIVATE ═══════════════ */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (nombres) {
        return Promise.all(nombres.map(function (n) {
          return n === CACHE ? null : caches.delete(n);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

/* ═══════════════ FETCH ═══════════════ */
self.addEventListener('fetch', function (event) {
  const req = event.request;

  // Solo GET. POST/PUT (checkout de Stripe, Firestore) van directo a red.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Cualquier otro origen (Firebase, Firestore, Stripe, Railway,
  // Google Fonts, gstatic) va directo a red y jamas se cachea.
  if (url.origin !== self.location.origin) return;
  if (debeIgnorarse(url)) return;

  // ── Navegacion (documentos HTML): network-first ──
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match(OFFLINE_URL);
        });
      })
    );
    return;
  }

  // ── CSS / JS / fuentes propias, e iconos de la PWA: cache-first ──
  // Las imagenes solo entran aqui si son iconos (/assets/img/icon-*),
  // lo que incluye icon-apple-touch.png. El resto del catalogo grafico
  // (cursos, galeria, testimonios) NO se precachea ni se acumula.
  const dest = req.destination;
  const esIcono = url.pathname.indexOf('/assets/img/icon-') === 0;
  const cacheFirst =
    dest === 'style' || dest === 'script' || dest === 'font' ||
    (dest === 'image' && esIcono);

  if (cacheFirst) {
    event.respondWith(
      caches.match(req).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (res) {
          if (res && res.ok && res.type === 'basic') {
            const copia = res.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copia); });
          }
          return res;
        });
      })
    );
    return;
  }

  // ── Resto del mismo origen: red con respaldo en cache ──
  // Aqui caen las imagenes de contenido del catalogo (cursos, galeria,
  // testimonios) y los documentos que no son navegacion. Van siempre a
  // red; si la red falla se intenta servir de cache.
  event.respondWith(
    fetch(req).catch(function () { return caches.match(req); })
  );
});
