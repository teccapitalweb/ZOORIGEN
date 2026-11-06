'use strict';

// CONTRATO DE CSS de «Métricas» (pestañas Visitas y Negocio): filas de tarjetas por contenedor, alturas parejas y sin huecos.
// Pruebas con Chrome de verdad: ZOORIGEN-LOCAL/verificacion/encimado-admin.js y huecos-metricas.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const css = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');

test('Métricas: las filas de tarjetas se acomodan por contenedor (2 y 3 por fila), con alturas parejas y sin hueco a un lado', () => {
  const s = css('assets/css/admin-visitas.css');
  assert.match(s, /#vzCuerpo \{ container: vz \/ inline-size; \}/);
  assert.match(s, /#vzCuerpo \.ap-columnas:not\(\.ap-columnas--interna\) \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); align-items: stretch; \}/);
  assert.match(s, /#vzCuerpo \.ap-columnas\.vz-cols3 \{ grid-template-columns: repeat\(3, minmax\(0, 1fr\)\); \}/);
  assert.match(s, /@container vz \(max-width: 939px\) \{[^}]*vz-cols3 \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}\s*#vzCuerpo \.ap-columnas\.vz-cols3 > \.ap-card:last-child:nth-child\(odd\) \{ grid-column: 1 \/ -1; \}/);
  assert.match(s, /@container vz \(max-width: 759px\)/);
  assert.match(s, /> \.ap-card \{ display: flex; flex-direction: column;/);
  assert.match(s, /justify-content: center; \}/, 'las gráficas se reparten al centro del alto de su tarjeta');
  assert.doesNotMatch(s, /\.vz-trio/, 'el trío con auto-fit (que dejaba huecos) ya no existe');
  assert.doesNotMatch(s, /gradient/i);
});

test('Métricas: Visitas junta barras con barras (Países y Páginas) y donas con donas (Dispositivos y Cómo llegan); Negocio no deja tarjetas solas a media fila', () => {
  const v = fs.readFileSync(path.join(RAIZ, 'assets/js/admin-visitas.js'), 'utf8');
  assert.match(v, /vz-cols2">' \+ card\('Países', paises, subPaises\) \+ paginasHTML\(m\)/);
  assert.match(v, /vz-cols2">' \+ card\('Dispositivos', disp[\s\S]{0,160}card\('Cómo llegan al sitio'/);
  assert.match(v, /function conOtros\(partes, max\)/);
  assert.match(v, /conOtros\(m\.fuentes\.map/);
  assert.doesNotMatch(v, /<div class="ap-columnas">' \+ paginasHTML\(m\) \+ quienesHTML\(m\)/, 'Páginas ya no va emparejada con la lista larga de personas');
  const n = fs.readFileSync(path.join(RAIZ, 'assets/js/admin-marketing.js'), 'utf8');
  assert.match(n, /ap-columnas vz-cols3">' \+\s*card\('Ingresos estimados'/);
  // cada fila junta tarjetas de forma y alto parecidos; las parejas desparejas (Cuentas hoy con dos donas) solo van lado a lado con ancho de sobra
  assert.match(n, /vz-cols2">' \+ embudoCard \+ cPrueba \+ '<\/div>'/);
  assert.match(n, /cCuentas \+\s*'<div class="ap-columnas vz-cols2">' \+ cCuando \+ cDia \+ '<\/div>'/, 'Cuentas hoy (dos donas) va sola, a todo el ancho');
  assert.match(n, /vz-cols2">' \+ cConversion \+ cCohortes \+ '<\/div>'/);
  assert.match(n, /vz-cols3">' \+ cElegidos \+ cCompletados \+ cEmpezados \+ '<\/div>' \+\s*cRetos;/);
  assert.match(n, /vz-dobles-zona/);
  const s = css('assets/css/admin-visitas.css');
  assert.match(s, /\.vz-dobles-zona \{ container: vzd \/ inline-size; \}/);
  assert.match(s, /@container vzd \(min-width: 640px\) \{ \.vz-dobles \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \} \}/);
});
