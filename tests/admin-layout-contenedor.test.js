'use strict';

// CONTRATO DE CSS contra regresiones de diseño en el panel admin (el panel tiene barra lateral: el ancho útil es menor que el de la ventana):
//  · «Usuarios activos» (Suscripciones y pagos): grid con minmax(0, …), tres formas de fila por ancho de CONTENEDOR y texto que se parte sin encimarse.
//  · «Métricas»: filas de tarjetas por contenedor (2 y 3 por fila), alturas parejas, sin huecos a un lado, sin nada de ancho fijo que desborde.
// Las comprobaciones con Chrome de verdad (anchos 390 a 1440, sin textos encimados ni scroll horizontal) están en ZOORIGEN-LOCAL/verificacion/encimado-admin.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const css = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');
const regla = (txt, selector) => { const i = txt.indexOf(selector + ' {'); if (i < 0) return ''; return txt.slice(i, txt.indexOf('}', i) + 1); };

test('Usuarios activos: la lista es un contenedor y la fila es un grid con minmax(0, …) en todas sus columnas de texto (nada ancho fijo que se encime)', () => {
  const s = css('assets/css/admin-suscripciones.css');
  assert.match(s, /#apUaCuerpo \{ container: apua \/ inline-size; \}/);
  const fila = regla(s, '.ap-ua');
  assert.match(fila, /display: grid;/);
  assert.match(fila, /grid-template-columns: 44px minmax\(0, 1\.4fr\) minmax\(0, 1\.1fr\) 112px 158px minmax\(150px, auto\)/);
  assert.match(fila, /min-width: 0;/);
  assert.match(s, /\.ap-ua > \* \{ min-width: 0; \}/);
  assert.match(s, /\.ap-ua__nombre, \.ap-ua__quien \.ap-correo, \.ap-ua__origen \{ overflow-wrap: break-word; word-break: normal; min-width: 0; max-width: 100%; \}/);
  assert.match(s, /\.ap-ua__plan \{ display: flex; flex-wrap: wrap;/);
  assert.match(s, /\.ap-ua__estado \.ap-badge \{ white-space: normal;/);
});

test('Usuarios activos: tres formas de fila por ancho del CONTENEDOR (ancha, media y angosta), con áreas que no dejan nada encimado; ya no depende de la ventana', () => {
  const s = css('assets/css/admin-suscripciones.css');
  const bloque = s.slice(s.indexOf('/* El ancho que importa es el del CONTENEDOR'), s.indexOf('.ap-sb-lista {'));
  assert.match(bloque, /@container apua \(max-width: 939px\)/);
  assert.match(bloque, /grid-template-areas: "av quien quien estado" "\. plan desde vence"/);
  assert.match(bloque, /@container apua \(max-width: 559px\)/);
  assert.match(bloque, /grid-template-areas: "av quien quien" "\. estado estado" "\. plan plan" "\. desde vence"/);
  assert.doesNotMatch(bloque, /@media/, 'la fila no depende del ancho de la ventana');
  // el resumen de arriba tampoco
  assert.match(bloque, /@container apua \(max-width: 1100px\) \{ \.ap-ua-resumen/);
  assert.doesNotMatch(bloque, /overflow-wrap: anywhere/);
});
