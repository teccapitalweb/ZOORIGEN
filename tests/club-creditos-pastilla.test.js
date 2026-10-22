'use strict';

// «Tus créditos: N» siempre visible en PDFs y materiales (cualquier cuenta con sesión, también con 0): dónde se dibuja, cuándo se oculta,
// cómo se actualiza al canjear y que no mueve la página. Ejecutar: node --test tests/club-creditos-pastilla.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const js = leer('assets/js/club-materiales.js');
const css = leer('assets/css/club-creditos.css');

test('pages/club-pdfs.html carga el módulo de créditos antes que la pantalla y su hoja de estilo', () => {
  const h = leer('pages/club-pdfs.html');
  assert.ok(h.indexOf('club-creditos.js') > 0 && h.indexOf('club-creditos.js') < h.indexOf('club-materiales.js'));
  assert.match(h, /club-creditos\.css\?v=/);
});

test('la pastilla se dibuja con la sesión (con o sin membresía, con saldo 0 o más) y nunca al administrador', () => {
  assert.match(js, /var verPastilla = !!CR\(\) && sesion\.role !== 'admin' && \(estado\.cargando \|\| !!estado\.creditos\);/);
  assert.match(js, /if \(verPastilla\) html \+= CR\(\)\.pastillaHTML\(estado\.creditos \? estado\.creditos\.saldo : 0, \{ soloCanjeables: soloCj, ayudaAbierta: estado\.ayuda, reserva: !estado\.creditos \}\);/);
  // Ya no depende de tener saldo, estar en ?canjeables=1 o haber canjeado algo
  assert.doesNotMatch(js, /estado\.creditos\.saldo > 0 \|\| soloCj/);
  assert.doesNotMatch(js, /saldoHTML/);
});

test('si el servidor no responde (créditos = null) y ya terminó de cargar, no se muestra ni la reserva; mientras carga solo se reserva el espacio', () => {
  // estado.cargando => verdadero (reserva); estado.creditos nulo y ya cargado => falso (se oculta)
  const verPastilla = (cargando, creditos) => !!(true && 'alumno' !== 'admin' && (cargando || !!creditos));
  assert.equal(verPastilla(true, null), true, 'cargando: reserva');
  assert.equal(verPastilla(false, null), false, 'el servidor no respondió: se oculta, sin errores');
  assert.equal(verPastilla(false, { saldo: 0 }), true, 'con saldo 0 también se ve');
  assert.match(js, /var creditos = Promise\.resolve\(\)\.then\(function \(\) \{ return club\.apiFetch\('\/api\/creditos\/estado'\); \}\)[\s\S]{0,1400}\.catch\(function \(\) \{ return null; \}\);/);
});

test('al canjear, el saldo de la pastilla baja al instante con lo que responde el servidor (sin recargar la lista)', () => {
  const i = js.indexOf("club.apiFetch('/api/creditos/canjear'");
  assert.ok(i > 0);
  const bloque = js.slice(i, i + 1500);
  assert.match(bloque, /estado\.creditos\.saldo = r\.saldo;/);
  assert.match(bloque, /pintar\(\);/);
  assert.ok(bloque.indexOf('estado.creditos.saldo = r.saldo') < bloque.indexOf('return cargar()'), 'primero se actualiza el saldo y luego se recarga');
});

test('«Ver materiales canjeables» activa el filtro de canjeables sin recargar y «Ver todos» lo quita; la ayuda se abre y cierra con Escape o al tocar fuera', () => {
  assert.match(js, /\[data-zcr-ver-canjeables\][^\n]*estado\.soloCanjeables = true/);
  assert.match(js, /\[data-zcr-ver-todos\]|data-zcr-ver-todos/);
  assert.match(js, /estado\.soloCanjeables = false/);
  assert.match(js, /function ponerParametroCanjeables\(si\)/);
  assert.match(js, /history\.replaceState/);
  assert.match(js, /e\.key === 'Escape' && estado\.ayuda/);
  assert.match(js, /estado\.ayuda && !\(t\.closest && t\.closest\('#zcrPastilla'\)\)/);
  assert.match(js, /\[data-zcr-ayuda\]'\)\) \{ estado\.ayuda = !estado\.ayuda;/);
});

test('estilos: reserva su alto (sin saltos), ayuda flotante, botones de al menos 44 px, letra de 12 px o más, colores sólidos y sin degradados', () => {
  const b = css.slice(css.indexOf('Pastilla «Tus créditos»'), css.indexOf('Insignia y botón de canje en cada material'));
  assert.ok(b.length > 600);
  assert.match(b, /\.zcr-pastilla \{[^}]*min-height: 52px/);
  assert.match(b, /\.zcr-pastilla--reserva \{ min-height: 52px; \}/);
  assert.match(b, /\.zcr-pastilla__ayuda \{ position: absolute;/, 'la ayuda no empuja el contenido');
  assert.match(b, /\.zcr-pastilla__btn \{[^}]*min-height: 48px/);
  assert.match(b, /\.zcr-pastilla__ver \{[^}]*min-height: 44px/);
  assert.doesNotMatch(b, /gradient/i);
  for (const m of b.matchAll(/font(?:-size)?:\s*(?:[0-9]{3}\s+)?([0-9.]+)(rem|px)/g)) assert.ok((m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1])) >= 12, m[0]);
  assert.match(b, /@media \(max-width: 480px\)[\s\S]*zcr-pastilla__ver \{ flex: 1 1 100%/, 'en el celular el botón ocupa todo el ancho');
  assert.doesNotMatch(css, /\.zcr-saldo/, 'la tarjeta de saldo anterior ya no existe');
});

test('la pastilla no llega al panel de administración (el módulo de la pantalla es solo del Club)', () => {
  for (const f of ['pages/admin-club.html', 'assets/js/admin-creditos.js', 'assets/js/admin-vistas.js']) {
    assert.doesNotMatch(leer(f), /pastillaHTML|zcrPastilla|Tus créditos:/, f);
  }
});
