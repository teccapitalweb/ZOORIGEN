'use strict';

// Textos partidos o apretados en el panel admin: nombres que se rompían letra por letra dentro de tablas, la etiqueta «Libro» aplastada
// y las gráficas de Encuesta sin activar (rótulos del eje pisados). Pruebas con Chrome de verdad: ZOORIGEN-LOCAL/verificacion/partido-admin.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');
const css = leer('assets/css/admin-club.css');
const reglas = sel => css.split('\n').filter(l => l.startsWith(sel + ' {'));

test('el botón-enlace de las tablas (nombre de la persona) no se parte letra por letra: break-word, no anywhere', () => {
  const r = reglas('.ap-enlace').filter(l => /overflow-wrap/.test(l));
  assert.equal(r.length, 1);
  assert.match(r[0], /overflow-wrap: break-word/);
  assert.doesNotMatch(r[0], /anywhere/, 'anywhere encoge la columna de la tabla hasta una letra');
});

test('la etiqueta «Libro» del historial de créditos no se encoge ni se parte', () => {
  const r = reglas('.ap-hr__libro');
  assert.equal(r.length, 1);
  assert.match(r[0], /flex: none/);
  assert.match(r[0], /white-space: nowrap/);
});

test('Encuesta activa sus gráficas al pintar (rótulos del eje sin pisarse y ayudas al pasar el cursor)', () => {
  const js = leer('assets/js/admin-encuesta.js');
  assert.match(js, /G\.activar\(contenedor\)/);
  assert.ok(js.indexOf('contenedor.innerHTML = vistaHTML(estado);') < js.indexOf('G.activar(contenedor)'), 'se activan después de pintar');
});

test('las versiones ?v= de admin-club.css y admin-encuesta.js están subidas en la página del panel', () => {
  const html = leer('pages/admin-club.html');
  assert.match(html, /admin-club\.css\?v=20261212-resumen/);
  assert.match(html, /admin-encuesta\.js\?v=20261212-resumen/);
});

test('Créditos: la fila de cada cuenta se apila según el ancho de SU lista (container query), no el de la ventana', () => {
  const lista = reglas('.ap-cr-lista');
  assert.equal(lista.length, 1);
  assert.match(lista[0], /container: crl \/ inline-size/);
  assert.match(css, /@container crl \(max-width: 779px\) \{\n  \.ap-cr \{ grid-template-columns: 40px minmax\(0, 1fr\); row-gap: 10px; align-items: start; \}/);
  assert.doesNotMatch(css, /@media \(max-width: 820px\) \{\n  \.ap-cr \{/, 'ya no depende del ancho de la ventana');
});
