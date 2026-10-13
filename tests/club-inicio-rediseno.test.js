'use strict';
// Rediseño del Inicio del Club: tarjeta de saludo con Jaguarito, sin tarjeta de nivel, invitación en su lugar y noticias tipo periódico.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const dash = leer('pages/club-dashboard.html');
const cuerpo = dash.slice(dash.indexOf('<body>'), dash.indexOf('<script src="https://www.gstatic.com'));

test('el Inicio ya no trae la tarjeta de nivel (los datos siguen en Mis logros)', () => {
  assert.doesNotMatch(dash, /id="levelCard"/);
  assert.doesNotMatch(dash, /renderLevelCard|nivelCont|cargarNivel|data-nivel-reintentar/);
  assert.doesNotMatch(cuerpo, /Nivel \d de 5|días seguidos<\/div>/);
  // la lógica y los datos conservados
  assert.match(leer('assets/js/club.js'), /renderLevelCard/);
  assert.match(leer('pages/club-logros.html'), /club-logros-ui\.js/);
});

test('la tarjeta de invitación va después del héroe de curso y antes de las noticias', () => {
  const heroe = cuerpo.indexOf('id="resumeCard"');
  const invita = cuerpo.indexOf('id="invitaCard"');
  const noticias = cuerpo.indexOf('id="noticias"');
  assert.ok(heroe > 0 && invita > heroe && noticias > invita, 'orden: resumeCard < invitaCard < noticias');
  assert.equal((cuerpo.match(/id="invitaCard"/g) || []).length, 1);
  assert.match(cuerpo, /id="invitaCard"[^>]*data-vip-required/, 'sigue el bloqueo de vista previa para quien no es miembro');
  assert.doesNotMatch(dash, /dash-refer-/, 'sin el diseño anterior de la tarjeta');
  assert.doesNotMatch(dash, /shareReferLink|copyReferCode/);
  assert.match(dash, /montarInvita/);
  assert.match(dash, /\/api\/referidos\/estado/);
});

test('el saludo usa el personaje y su módulo, con animaciones que respetan "reducir movimiento"', () => {
  assert.match(dash, /assets\/js\/guia-personaje\.js\?v=[\w.-]+/);
  assert.ok(dash.indexOf('guia-personaje.js') < dash.indexOf('club-inicio.js'), 'el personaje se carga antes que el Inicio');
  assert.match(dash, /ZOO_INICIO\.pintarSaludo/);
  const css = leer('assets/css/club-inicio.css');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.zs-inicio \*[\s\S]*animation: none !important/);
  assert.match(css, /\.zs-inicio\.is-pausa \*[\s\S]*animation-play-state: paused/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.inv__pulso \{ animation: none/);
  for (const k of ['zsiEntra', 'zsiFlota', 'zsiRespira', 'zsiBurbuja', 'invPulso']) assert.match(css, new RegExp('@keyframes ' + k), k);
  // el JS apaga el conteo y el saludo con reducir movimiento y con la pestaña oculta
  const js = leer('assets/js/club-inicio.js');
  assert.match(js, /prefers-reduced-motion: reduce/);
  assert.match(js, /visibilitychange/);
  assert.match(js, /IntersectionObserver/);
});

test('colores sólidos y modo noche: verde de marca de día, #16301F con borde #24472F de noche (tokens)', () => {
  const css = leer('assets/css/club-inicio.css');
  const bloque = css.slice(css.indexOf('TARJETA DE SALUDO'));
  assert.doesNotMatch(bloque, /gradient\(/, 'sin degradados en el saludo ni en la invitación');
  assert.doesNotMatch(bloque, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  const base = leer('assets/css/club.css');
  assert.match(base, /--zoo-hero:\s*#16301F/i);
  assert.match(base, /--zoo-hero-borde:\s*#24472F/i);
  assert.match(base, /--zoo-hero:\s*#1F5F3A/i);
  assert.match(bloque, /#25D366/i, 'botón de WhatsApp en su verde');
});

test('el Inicio carga la tipografía del periódico en el mismo enlace de Google Fonts', () => {
  const enlaces = dash.match(/https:\/\/fonts\.googleapis\.com\/css2\?[^"']+/g) || [];
  assert.equal(enlaces.length, 1);
  assert.match(enlaces[0], /family=Playfair\+Display:wght@700;900/);
  assert.match(enlaces[0], /display=swap/);
});

test('las versiones de lo que cambió suben en las páginas que lo cargan', () => {
  for (const [pag, patron] of [
    ['pages/club-dashboard.html', /assets\/css\/club-inicio\.css\?v=20261105-inicio/],
    ['pages/club-dashboard.html', /assets\/css\/club-noticias\.css\?v=20261105-periodico/],
    ['pages/club-dashboard.html', /assets\/js\/club-inicio\.js\?v=20261105-inicio/],
    ['pages/club-dashboard.html', /assets\/js\/club-noticias-ui\.js\?v=20261105-periodico/],
    ['pages/admin-club.html', /assets\/css\/club-noticias\.css\?v=20261105-periodico/],
    ['pages/admin-club.html', /assets\/js\/club-noticias-ui\.js\?v=20261105-periodico/]
  ]) assert.match(leer(pag), patron, pag + ' ' + patron);
});

test('las noticias del Inicio se pintan como primera plana y el error también lleva la cabecera', () => {
  assert.match(dash, /ZOO_NOTICIAS\.pintar\(nl, Array\.isArray/);
  assert.match(dash, /tituloVacio: 'No se pudieron cargar las noticias'/);
  assert.doesNotMatch(dash, /ih-noticias__cab/);
  assert.match(leer('assets/js/club-noticias-ui.js'), /periodicoHTML\(datos, opciones\)/);
});
