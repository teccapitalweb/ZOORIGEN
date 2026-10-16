'use strict';

// Ventanas del Club: (A) ningún encabezado escribe marcado de ícono como texto y (B) cada ventana respeta su ancho máximo
// (antes la regla responsiva las estiraba a casi todo el ancho de la pantalla en escritorio).
// Ejecutar: node --test tests/club-ventanas-anchos.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const listar = (dir, ext) => fs.readdirSync(path.join(RAIZ, dir)).filter(f => f.endsWith(ext)).map(f => dir + '/' + f);

/* ───────── A) marcado crudo ───────── */

test('ningún CSS (hojas, <style> de páginas o CSS inyectado por scripts) usa content: con marcado HTML o entidades', () => {
  const archivos = [...listar('assets/css', '.css'), ...listar('pages', '.html'), ...listar('assets/js', '.js'), 'index.html', 'styles.css'];
  const malos = [];
  for (const rel of archivos) {
    const t = leer(rel);
    // content: '<svg ...>'  /  content: "&lt;..."  /  content:'\u003c'
    for (const m of t.matchAll(/content\s*:\s*(['"])((?:(?!\1).)*)\1/g)) {
      if (/<\/?[a-z]|&lt;|&#60;|&#x3c;/i.test(m[2])) malos.push(`${rel}: content: ${m[1]}${m[2].slice(0, 60)}${m[1]}`);
    }
  }
  assert.deepEqual(malos, [], 'el CSS no interpreta HTML: un ícono se pone con un <svg> en el marcado o como imagen de fondo');
});

test('el título de la ventana "Detalle del curso" y del reproductor lleva el ícono como imagen de fondo, no como texto', () => {
  const html = leer('pages/club-biblioteca.html');
  assert.doesNotMatch(html, /\.player-box__header h3::before/, 'ya no hay pseudo-elemento que escriba el ícono');
  const regla = html.match(/\.player-box__header h3 \{\s*padding-left:[^}]*\}/);
  assert.ok(regla, 'regla del ícono del título');
  assert.match(regla[0], /background:\s*url\("data:image\/svg\+xml/);
  assert.match(regla[0], /polygon points='6 3 20 12 6 21 6 3'/, 'es el "play" de Lucide');
  assert.doesNotMatch(regla[0], /linear-gradient|radial-gradient/);
});

test('ZOO_CURSOS_UI.ventana escapa el título: texto con marcado se ve como texto, nunca se ejecuta', () => {
  const UI = require(path.join(RAIZ, 'assets/js/club-cursos-ui.js'));
  assert.equal(UI.esc('<svg class="zi"><use href="#zi-play"/></svg>'), '&lt;svg class=&quot;zi&quot;&gt;&lt;use href=&quot;#zi-play&quot;/&gt;&lt;/svg&gt;');
});

/* ───────── B) anchos máximos ───────── */

const css = leer('assets/css/club-responsivo.css');
const bloqueVentanas = css.slice(css.indexOf('5. VENTANAS (MODALES)'), css.indexOf('6. COMPONENTES'));

test('la regla común de ventanas NO fija max-width (era lo que las estiraba a pantalla completa)', () => {
  const comun = bloqueVentanas.match(/:is\(\.zoo-welcome-box[^{]*\{[^}]*\}/);
  assert.ok(comun, 'regla común con :is(...)');
  assert.doesNotMatch(comun[0], /max-width/);
  assert.match(comun[0], /max-height:\s*calc\(var\(--zoo-vh\)/, 'sigue cabiendo en la altura visible');
  assert.match(comun[0], /overflow-y:\s*auto/, 'sigue desplazándose por dentro');
});

test('el tope de pantalla (100vw menos márgenes) tiene especificidad cero para no pisar el ancho propio de cada ventana', () => {
  assert.match(bloqueVentanas, /:where\(\.zoo-welcome-box[^{]*\{\s*max-width:\s*calc\(100vw - 2 \* var\(--zoo-gutter\)\);\s*\}/);
});

test('anchos por tamaño: aviso y confirmación 560, bienvenida y perfil 640, detalle del curso 960, recorrido 440', () => {
  assert.match(bloqueVentanas, /\.zc-modal \{ max-width: min\(560px, 100%\); \}/);
  assert.match(bloqueVentanas, /\.zoo-welcome-box \{ max-width: min\(640px, 100%\); \}/);
  assert.match(bloqueVentanas, /\.zd-modal__caja \{ max-width: min\(640px, 100%\); \}/);
  assert.match(bloqueVentanas, /\.player-box \{ max-width: min\(960px, 100%\); \}/);
  assert.match(leer('assets/css/club-onboarding.css'), /\.zob-tour__dialogo \{\s*position: fixed; width: min\(440px, calc\(100vw - 24px\)\)/);
  assert.match(leer('assets/css/club-onboarding.css'), /\.zob-perfil \.zpf-caja \{\s*max-width: 640px/);
  assert.match(leer('pages/club-biblioteca.html'), /\.player-box \{\s*width: 100%;\s*max-width: 960px;/);
});

test('en celular siguen los ajustes responsivos: ancho = pantalla menos márgenes, scroll interno y zona segura', () => {
  assert.match(css, /--zoo-gutter/);
  assert.match(bloqueVentanas, /env\(safe-area|var\(--zoo-safe-t\)/);
  assert.match(leer('pages/club-biblioteca.html'), /@media \(max-width: 640px\) \{\s*\.player-overlay \{ padding: 0;[^}]*\}\s*\.player-box \{\s*max-width: 100%;/);
});

test('club-responsivo.css sigue cargándose al final del <head> de las páginas que muestran ventanas', () => {
  for (const f of ['club-biblioteca', 'club-dashboard', 'club-directorio', 'club-inventario']) {
    const h = leer(`pages/${f}.html`);
    assert.ok(h.indexOf('club-responsivo.css') > h.lastIndexOf('<style', h.indexOf('</head>')), f);
  }
});
