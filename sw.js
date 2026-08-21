/* ============================================================ */
/* ZOORIGEN - Service Worker                                    */
/* Alcance: / (dominio propio www.zoorigen.com, deploy en raiz) */
/*                                                              */
/* IMPORTANTE: al desplegar cambios en cualquier archivo del     */
/* SHELL hay que subir la version de CACHE (v1 -> v2). El        */
/* activate borra automaticamente las caches anteriores.         */
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
  '/assets/js/club.js',
  '/assets/img/icon-192.png',
  '/assets/img/icon-512.png',
  '/assets/img/icon-maskable-192.png',
  '/assets/img/icon-maskable-512.png',
  '/assets/img/apple-touch-icon.png'
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

  // ── CSS / JS / iconos: cache-first ──
  const dest = req.destination;
  if (dest === 'style' || dest === 'script' || dest === 'image' || dest === 'font') {
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
  event.respondWith(
    fetch(req).catch(function () { return caches.match(req); })
  );
});
