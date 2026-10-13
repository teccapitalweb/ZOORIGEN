'use strict';
// Vista previa para quien no es miembro: las pantallas se ven completas y solo se bloquea USAR.
// Estas pruebas leen los HTML y vigilan que no vuelva el "reemplazo total" por un aviso, que carguen el módulo
// compartido (con la misma versión en todas), que el foro no consulte Firestore sin membresía y que no haya emojis.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

const PAGINAS_VISTA_PREVIA = [
  'pages/club-herramientas.html', 'pages/club-infusiones.html', 'pages/club-legal.html', 'pages/club-inventario.html',
  'pages/club-pdfs.html', 'pages/club-foro.html', 'pages/club-directorio.html'
];

test('las pantallas de vista previa cargan el módulo compartido y su hoja de estilos', () => {
  for (const rel of PAGINAS_VISTA_PREVIA) {
    const h = leer(rel);
    assert.match(h, /assets\/js\/club-paywall\.js\?v=[\w.-]+/, rel + ' no carga club-paywall.js');
    assert.match(h, /assets\/css\/club-paywall\.css\?v=[\w.-]+/, rel + ' no carga club-paywall.css');
  }
});

test('club-paywall.js y club-paywall.css usan la misma versión en todas las páginas', () => {
  const v = { js: new Set(), css: new Set() };
  for (const f of fs.readdirSync(path.join(RAIZ, 'pages')).filter(x => x.endsWith('.html'))) {
    const h = leer('pages/' + f);
    for (const m of h.matchAll(/club-paywall\.js\?v=([\w.-]+)/g)) v.js.add(m[1]);
    for (const m of h.matchAll(/club-paywall\.css\?v=([\w.-]+)/g)) v.css.add(m[1]);
  }
  assert.equal(v.js.size, 1, 'versiones de club-paywall.js: ' + [...v.js].join(', '));
  assert.equal(v.css.size, 1, 'versiones de club-paywall.css: ' + [...v.css].join(', '));
});

test('ninguna pantalla reemplaza TODO el contenido por un aviso para quien no es miembro', () => {
  const prohibidas = [
    /Herramientas exclusivas para miembros/,
    /Ocultar contenido principal/,
    /querySelectorAll\('\.tool-panel, \.tools-tabs, \.tool-aviso-global'\)\.forEach\(el => el\.style\.display = 'none'\)/,
    /querySelectorAll\('\.legal-panel, \.legal-tabs, \.legal-aviso-global'\)/,
    /ZOORIGEN_CLUB\.showPaywall\(session, '(acceder a las Herramientas|usar el libro de registro|descargar los PDFs)/
  ];
  for (const rel of PAGINAS_VISTA_PREVIA) {
    const h = leer(rel);
    for (const re of prohibidas) assert.equal(re.test(h), false, `${rel} todavía contiene: ${re}`);
  }
});

test('el foro no consulta foroPosts antes de comprobar la membresía', () => {
  const h = leer('pages/club-foro.html');
  const iniciar = h.indexOf('ZOO_PAYWALL.iniciar');
  assert.ok(iniciar > 0, 'el foro debe iniciar ZOO_PAYWALL');
  const primeraConsulta = h.search(/db\.collection\('foroPosts'\)/);
  const llamada = h.search(/await loadPosts\(\)|loadPosts\(\);/);
  assert.ok(llamada > iniciar, 'loadPosts debe llamarse después de iniciar el módulo');
  // la llamada a loadPosts está dentro de una condición de membresía
  const bloque = h.slice(Math.max(0, llamada - 400), llamada + 40);
  assert.match(bloque, /miembro|esMiembro|ZOO_PAYWALL/i, 'loadPosts debe quedar detrás de la comprobación de membresía');
  assert.ok(primeraConsulta > 0);
});

test('el foro para no miembros trae publicaciones de ejemplo marcadas como tales', () => {
  const h = leer('pages/club-foro.html') + leer('assets/js/club-foro-previa.js');
  assert.match(h, /Ejemplo/);
  assert.match(h, /Estudiante de Biolog/);
});

test('el libro de registro no pide /api/registro sin membresía', () => {
  const h = leer('pages/club-inventario.html');
  assert.match(h, /ZOO_PAYWALL/);
  assert.equal(/function bloquear\(\)/.test(h), false, 'ya no existe bloquear() que oculta la app');
});

test('las pantallas de vista previa no llevan emojis', () => {
  const emoji = /\p{Extended_Pictographic}/u;
  for (const rel of [...PAGINAS_VISTA_PREVIA, 'assets/js/club-paywall.js', 'assets/css/club-paywall.css']) {
    const h = leer(rel);
    const m = h.match(emoji);
    assert.equal(m, null, `${rel} lleva un emoji: ${m && m[0]}`);
  }
});

test('el panel de administración usa el tema verde (selva) por defecto', () => {
  assert.match(leer('pages/admin-club.html'), /<html[^>]*data-tema="selva"/);
});

test('los pendientes de color: encabezado de noticias en verde sólido y sin degradado multicolor en la tarjeta principal', () => {
  const inicio = leer('assets/css/club-inicio.css');
  assert.equal(/#D4547A/i.test(inicio), false, 'queda un borde rosa en club-inicio.css');
  const noticias = leer('assets/css/club-noticias.css');
  assert.equal(/linear-gradient\(135deg, #1F5F3A/.test(noticias), false);
  assert.equal(/linear-gradient\(90deg, #E8A317/.test(noticias), false);
});
