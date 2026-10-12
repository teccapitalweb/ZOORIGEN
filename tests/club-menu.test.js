'use strict';

// Menú del club, páginas de comunidad (referidos, directorio, canal) y versión única de club.js.
// Ejecutar: node --test tests/club-menu.test.js

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

function cargarClub() {
  const contexto = {
    result: null, window: {},
    localStorage: { getItem: () => 'dark', setItem() {}, removeItem() {} },
    document: { documentElement: { setAttribute() {}, getAttribute: () => 'dark' }, querySelectorAll: () => [] },
    console, setTimeout, setInterval, clearTimeout, clearInterval, Date, Math, Promise
  };
  vm.runInNewContext(leer('assets/js/club.js').replace('const ZOORIGEN_CLUB =', 'result ='), contexto, { filename: 'club.js' });
  return contexto.result;
}
const SESION = { uid: 'u1', name: 'Ana', email: 'a@x.com', planStatus: 'active', planActivo: true, planVence: new Date(Date.now() + 86400000).toISOString() };

test('el menú tiene Retos, Directorio VIP y Canal de WhatsApp, cada uno con su ícono y su página', () => {
  const club = cargarClub();
  // 'suscripcion' evita que se programe el paywall automático de la página.
  const html = club.renderSidebar('suscripcion', SESION);
  for (const [href, texto] of [['club-retos.html', 'Retos'], ['club-directorio.html', 'Directorio VIP'], ['club-canal.html', 'Canal de WhatsApp']]) {
    const m = new RegExp('<a href="' + href.replace('.', '\\.') + '"[^>]*>\\s*<span class="icon"><svg[^>]*>[^]*?</svg></span>' + texto).exec(html);
    assert.ok(m, 'falta ' + texto + ' (' + href + ') con su ícono');
  }
  for (const viejo of ['club-dashboard.html', 'club-biblioteca.html', 'club-foro.html', 'club-referidos.html', 'club-logros.html', 'club-suscripcion.html']) {
    assert.ok(html.includes('href="' + viejo + '"'), 'se perdió ' + viejo);
  }
});

test('cada ítem del menú se marca como activo con su id y solo uno a la vez', () => {
  const club = cargarClub();
  for (const [id, href] of [['retos', 'club-retos.html'], ['directorio', 'club-directorio.html'], ['canal', 'club-canal.html']]) {
    const html = club.renderSidebar(id, SESION);
    assert.match(html, new RegExp('<a href="' + href.replace('.', '\\.') + '" class="is-active">'));
    assert.equal((html.match(/class="is-active"/g) || []).length, 1);
  }
});

test('el menú mantiene el botón de cerrar (móvil) y los íconos nuevos existen', () => {
  const club = cargarClub();
  const html = club.renderSidebar('suscripcion', SESION);
  assert.match(html, /id="sidebarCloseBtn"/);
  for (const icono of ['target', 'users', 'brandwhatsapp']) assert.ok(club.icon(icono, 17).includes('<path') || club.icon(icono, 17).includes('<circle'), icono);
});

test('todas las páginas con menú cargan la MISMA versión de club.js (y sw.js la conoce)', () => {
  const paginas = fs.readdirSync(path.join(RAIZ, 'pages')).filter(f => f.endsWith('.html'));
  const versiones = new Set();
  for (const f of paginas) for (const m of leer('pages/' + f).matchAll(/assets\/js\/club\.js\?v=([\w.-]+)/g)) versiones.add(m[1]);
  assert.equal(versiones.size, 1, 'versiones distintas: ' + [...versiones].join(', '));
  assert.ok(leer('sw.js').includes('/assets/js/club.js?v=' + [...versiones][0]));
  for (const nueva of ['club-referidos.html', 'club-directorio.html', 'club-canal.html']) {
    assert.ok(paginas.includes(nueva), nueva + ' no existe');
    assert.match(leer('pages/' + nueva), /assets\/js\/club\.js\?v=/, nueva + ' no carga club.js con versión');
  }
});

test('las páginas nuevas y la de referidos usan ?v= en cada archivo propio', () => {
  for (const [rel, archivos] of [
    ['pages/club-referidos.html', ['club-comunidad.css', 'club-iconos-comunidad.js', 'club-referidos.js', 'club-premios.js']],
    ['pages/club-directorio.html', ['club-comunidad.css', 'club-iconos-comunidad.js', 'club-directorio.js']],
    ['pages/club-canal.html', ['club-comunidad.css', 'club-iconos-comunidad.js', 'club-referidos.js']],
    ['pages/club-dashboard.html', ['club-comunidad.css', 'club-iconos-comunidad.js']]
  ]) {
    const html = leer(rel);
    for (const a of archivos) assert.match(html, new RegExp(a.replace('.', '\\.') + '\\?v=\\w+'), rel + ' debe cargar ' + a + ' con ?v=');
  }
});

test('referidos: el canje usa ZOO_PREMIOS.canjear() sin parámetros y protegido con window.ZOO_PREMIOS', () => {
  const html = leer('pages/club-referidos.html');
  assert.match(html, /if \(!window\.ZOO_PREMIOS \|\| typeof window\.ZOO_PREMIOS\.canjear !== 'function'\)/);
  assert.match(html, /window\.ZOO_PREMIOS\.canjear\(\)/);
  assert.match(html, /X-Device-Id/);
  assert.match(html, /\/api\/referidos\/estado/);
});

test('canal: la dirección está en la constante ZOO_CANAL_URL y el panel lleva a la página del canal', () => {
  const canal = leer('pages/club-canal.html');
  assert.match(canal, /const ZOO_CANAL_URL = 'https:\/\/wa\.me\/5212361113237\?text=Hola%20quiero%20entrar%20al%20canal%20VIP%20de%20Zoorigen';/);
  assert.equal((canal.match(/wa\.me\/5212361113237/g) || []).length, 1, 'la dirección solo se escribe una vez');
  assert.match(canal, /Abrir canal/);
  assert.match(canal, /Compartir invitación/);
  assert.match(canal, /Suscribirme/);
  for (const regla of ['Respeto', 'Sin spam', 'Temas de fauna', 'Sin venta de animales ni tráfico']) assert.ok(canal.includes(regla), regla);
  const tablero = leer('pages/club-dashboard.html');
  assert.ok(tablero.includes('comunidadHTML'), 'el panel muestra la tarjeta de la comunidad');
  assert.ok(leer('assets/js/club-inicio.js').includes('href="club-canal.html"'), 'la tarjeta lleva a la página del canal');
  assert.doesNotMatch(tablero, /canal%20VIP%20de%20Zoorigen/);
});

test('registro: sin referredBy, con código saneado, deviceId y aviso de correo de confirmación', () => {
  const reg = leer('pages/club-registro.html');
  assert.doesNotMatch(reg, /referredBy\s*:|\.referredBy\b|\['referredBy'\]/);
  assert.match(reg, /getDeviceId\(\)/);
  assert.match(reg, /replace\(\/\[\^A-Za-z0-9-\]\/g, ''\)/);
  assert.match(reg, /correo para confirmar tu dirección/);
  assert.doesNotMatch(reg, /\$\{refCode\}/, 'el código ya no se mete en innerHTML');
});

test('panel: aviso "Confirma tu correo" descartable con Reenviar correo, y la tarjeta de nivel lee el servidor', () => {
  const tablero = leer('pages/club-dashboard.html');
  assert.match(tablero, /id="avisoCorreo"/);
  assert.match(tablero, /Confirma tu correo/);
  assert.match(tablero, /Reenviar correo/);
  assert.match(tablero, /enviarCorreoVerificacion\(u\)/);
  assert.match(tablero, /necesitaConfirmarCorreo\(u\)/);
  assert.match(tablero, /fetchPremios\(/);
  assert.match(tablero, /reintentarReferidoPendiente/);
  assert.doesNotMatch(tablero, /getProgress\(/);
  assert.doesNotMatch(tablero, /where\('referredBy'/);
});

test('el modo claro es el predeterminado; quien eligió oscuro lo conserva', () => {
  const club = fs.readFileSync(path.resolve(__dirname, '../assets/js/club.js'), 'utf8');
  assert.ok(!club.includes("localStorage.getItem('zoo_theme') || 'dark'"));
  assert.equal(club.split("localStorage.getItem('zoo_theme') || 'light'").length - 1, 2);
  const shell = fs.readFileSync(path.resolve(__dirname, '../assets/js/club-shell.js'), 'utf8');
  assert.ok(shell.includes("=== 'dark' ? 'dark' : 'light'"));
});
