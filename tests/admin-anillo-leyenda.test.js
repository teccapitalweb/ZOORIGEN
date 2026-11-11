'use strict';

// CONTRATO DE CSS del anillo (dona) con su leyenda: se adapta al ancho de SU tarjeta (container query), no al de la ventana.
// Angosta: anillo arriba (acotado y centrado) y leyenda debajo en una columna, con la etiqueta a la izquierda y número y porcentaje a la derecha.
// Con espacio: anillo a la izquierda y leyenda a la derecha con anchos mínimos reales. Nunca una etiqueta partida letra por letra.
// Pruebas con Chrome de verdad: ZOORIGEN-LOCAL/verificacion/partido-admin.js (demo con ZOO_DEMO_CUENTAS=produccion).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(RAIZ, 'assets/css/admin-club.css'), 'utf8').replace(/\r\n/g, '\n');
const regla = sel => {
  const i = css.indexOf('\n' + sel + ' {');
  assert.ok(i >= 0, 'falta la regla ' + sel);
  return css.slice(i + 1, css.indexOf('}', i) + 1);
};

test('el anillo es un contenedor por ancho: la tarjeta decide el diseño, no la ventana', () => {
  assert.match(css, /\n\.zg-anillo \{ container: zgan \/ inline-size; \}/);
  assert.doesNotMatch(css, /@media[^{]*\{\s*\.zg-anillo__fila/, 'ninguna media query de ventana manda sobre la fila del anillo');
});

test('angosta (por omisión): una sola columna, anillo centrado y acotado, leyenda debajo a todo el ancho', () => {
  const fila = regla('.zg-anillo__fila');
  assert.match(fila, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(fila, /justify-items: center/);
  assert.match(css, /\.zg-anillo__fila > \.zg-anillo__leyenda \{ width: 100%; \}/);
  const graf = regla('.zg-anillo__graf');
  assert.match(graf, /max-width: 176px/);
  assert.match(graf, /margin: 0 auto/);
});

test('con espacio (contenedor de 460 px o más): anillo a la izquierda y leyenda a la derecha con mínimos reales', () => {
  assert.match(css, /@container zgan \(min-width: 460px\) \{ \.zg-anillo__fila \{ grid-template-columns: minmax\(150px, 190px\) minmax\(260px, 1fr\); justify-items: stretch; \} \}/);
  // 150 + 24 de espacio + 260 de leyenda = 434 < 460: nunca queda menos de 260 px para la leyenda
  assert.match(css, /@container zgan \(min-width: 460px\) \{ \.zg-anillo__graf \{ max-width: 190px; \} \}/);
});

test('leyenda: etiqueta a la izquierda sin cortar palabras, número y porcentaje a la derecha sin partirse', () => {
  const li = regla('.zg-anillo__leyenda li');
  assert.match(li, /grid-template-columns: 14px minmax\(7ch, 1fr\) auto auto/);
  const txt = regla('.zg-anillo__txt');
  assert.match(txt, /min-width: 0/);
  assert.match(txt, /overflow-wrap: break-word/);
  assert.match(txt, /word-break: normal/);
  assert.doesNotMatch(txt, /anywhere|break-all/, 'ya no se parte letra por letra');
  assert.match(txt, /text-align: left/);
  const num = regla('.zg-anillo__leyenda strong');
  assert.match(num, /text-align: right/);
  assert.match(num, /white-space: nowrap/);
  const pct = regla('.zg-anillo__pct');
  assert.match(pct, /text-align: right/);
  assert.match(pct, /white-space: nowrap/);
  assert.match(pct, /min-width: 44px/);
});

test('el marcado del anillo sigue siendo figure.zg-anillo (el contenedor) con la fila dentro, y Métricas conserva su leyenda debajo', () => {
  const G = require(path.join(RAIZ, 'assets', 'js', 'admin-graficas.js'));
  const h = G.anillo({
    titulo: 'Estado de las cuentas', centro: { valor: '461', rotulo: 'cuentas' },
    partes: [{ etiqueta: 'Activos', valor: 13, color: 1 }, { etiqueta: 'Cancelados con acceso', valor: 1, color: 3 }, { etiqueta: 'Sin membresía', valor: 411, color: 2 }]
  });
  assert.match(h, /^<figure class="zg zg-anillo"/);
  assert.match(h, /<div class="zg-anillo__fila"><div class="zg-anillo__graf"/);
  assert.match(h, /<ul class="zg-anillo__leyenda">/);
  assert.match(h, /<span class="zg-anillo__txt">Cancelados con acceso<\/span><strong>1<\/strong>/);
  const v = fs.readFileSync(path.join(RAIZ, 'assets/css/admin-visitas.css'), 'utf8');
  assert.match(v, /\.vz-card \.zg-anillo__fila \{ grid-template-columns: minmax\(0, 1fr\); justify-items: center; \}/);
});

test('sin degradados y con la versión ?v= de admin-club.css puesta en la página del panel', () => {
  assert.doesNotMatch(css.slice(css.indexOf('/* Anillo */'), css.indexOf('/* Barras horizontales */')), /gradient/i);
  const html = fs.readFileSync(path.join(RAIZ, 'pages/admin-club.html'), 'utf8');
  assert.match(html, /admin-club\.css\?v=20261212-resumen/);
});
