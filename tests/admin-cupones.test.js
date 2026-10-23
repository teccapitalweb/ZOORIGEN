'use strict';

// Cupones de créditos en el panel: formulario, lista con estados, mensaje para el canal, «Ver quién» y el historial de regalos con su origen.
// Ejecutar: node --test tests/admin-cupones.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const A = require(path.join(RAIZ, 'assets', 'js', 'admin-creditos.js'));

const cupon = extra => Object.assign({ clave: 'CANAL100', creditos: 100, estado: 'activo', estadoGuardado: 'activo', canjes: 12, maxPersonas: 50, creditosEntregados: 1200, vence: '2026-10-25T17:44:00Z', creado: '2026-10-22T10:00:00Z' }, extra);

test('el formulario: clave (vacía = al azar), créditos, vence (opcional), máximo de personas y «Crear cupón»', () => {
  const h = A.formularioCuponHTML();
  for (const t of ['Clave (vacía = al azar)', 'Créditos', 'Vence el (opcional)', 'Máximo de personas', 'Crear cupón', 'Ej.: CANAL100', 'Sin límite']) assert.ok(h.includes(t), t);
  assert.match(h, /id="apCpCreditos"[^>]*value="100"/);
  assert.match(h, /type="datetime-local"/);
  assert.match(h, /maxlength="24"/);
  assert.match(h, /no distingue mayúsculas de minúsculas/);
  assert.match(h, /<form class="ap-cp-form"/);
});

test('cada cupón: clave, créditos, estado, «12 de 50 canjes», créditos entregados, vencimiento y las tres acciones', () => {
  const h = A.filaCuponHTML(cupon());
  assert.match(h, /<code>CANAL100<\/code><span>100 créditos<\/span>/);
  assert.match(h, /ap-badge--ok"><span>Activo</);
  assert.match(h, /<strong>12 de 50<\/strong><span>canjes · 1,200 créditos entregados<\/span>/);
  assert.match(h, /<strong>Vence<\/strong><span>[^<]*2026/);
  for (const a of ['cupon-copiar', 'cupon-quien', 'cupon-estado']) assert.ok(h.includes('data-accion="' + a + '"'), a);
  assert.match(h, /data-a="pausado">Pausar</);
});

test('los cuatro estados tienen su etiqueta y color: Activo, Pausado, Vencido y Agotado', () => {
  assert.match(A.filaCuponHTML(cupon({ estado: 'pausado', estadoGuardado: 'pausado' })), /ap-badge--neutro"><span>Pausado</);
  assert.match(A.filaCuponHTML(cupon({ estado: 'pausado', estadoGuardado: 'pausado' })), /data-a="activo">Reactivar</);
  assert.match(A.filaCuponHTML(cupon({ estado: 'vencido' })), /ap-badge--aviso"><span>Vencido</);
  assert.match(A.filaCuponHTML(cupon({ estado: 'vencido' })), /<strong>Venció<\/strong>/);
  assert.match(A.filaCuponHTML(cupon({ estado: 'agotado', canjes: 50 })), /ap-badge--info"><span>Agotado</);
});

test('sin fecha ni máximo: «Sin fecha límite · Hasta que lo pauses» y los canjes sin «de N»', () => {
  const h = A.filaCuponHTML(cupon({ vence: null, maxPersonas: null, canjes: 3, creditosEntregados: 300 }));
  assert.match(h, /<strong>Sin fecha límite<\/strong><span>Hasta que lo pauses<\/span>/);
  assert.match(h, /<strong>3<\/strong><span>canjes · 300 créditos entregados<\/span>/);
  assert.match(A.filaCuponHTML(cupon({ vence: null, maxPersonas: null, canjes: 1 })), /<span>canje · /);
});

test('la clave y lo demás se escapan (una clave rara no rompe la pantalla)', () => {
  const h = A.filaCuponHTML(cupon({ clave: '<img src=x>' }));
  assert.ok(!h.includes('<img'));
  assert.ok(h.includes('&lt;img src=x&gt;'));
});

test('lista: del más reciente al más antiguo tal como la manda el servidor; vacía, invita a crear el primero; si el servidor no responde, avisa sin romper', () => {
  const h = A.cuponesHTML({ cupones: [cupon(), cupon({ clave: 'BIENVENIDA', estado: 'pausado', estadoGuardado: 'pausado' })] });
  assert.ok(h.indexOf('CANAL100') < h.indexOf('BIENVENIDA'));
  assert.match(h, /<ul class="ap-cp-lista"/);
  assert.match(A.cuponesHTML({ cupones: [] }), /Todavía no has creado cupones/);
  assert.match(A.cuponesHTML({ cupones: [] }), /apCpForm/, 'el formulario siempre está');
  assert.match(A.cuponesHTML(null), /No se pudieron cargar los cupones/);
  assert.doesNotThrow(() => A.vistaHTML({ miembros: { miembros: [] }, historial: null, metricas: null, cupones: undefined }));
});

test('la tarjeta «Cupones» va arriba de las cuentas en la pantalla de Créditos', () => {
  const h = A.vistaHTML({ miembros: { miembros: [] }, historial: null, metricas: null, cupones: { cupones: [cupon()] } });
  assert.ok(h.indexOf('<h2>Cupones</h2>') > 0 && h.indexOf('<h2>Cupones</h2>') < h.indexOf('<h2>Cuentas</h2>'));
  assert.match(h, /id="apCrCupones"/);
});

test('el mensaje para el canal: clave, créditos, cómo canjearla, el enlace, el límite de personas y la fecha', () => {
  const m = A.mensajeCupon(cupon());
  for (const t of ['Cupón de créditos Zoorigen', 'Clave: CANAL100', 'Te da 100 créditos', '100 créditos = 1 material', '«¿Tienes un código?»', 'https://www.zoorigen.com/pages/club-pdfs.html', 'Solo para las primeras 50 personas', 'Vence el ']) assert.ok(m.includes(t), t);
  const sin = A.mensajeCupon(cupon({ maxPersonas: null, vence: null }));
  assert.ok(!sin.includes('primeras') && !sin.includes('Vence el'));
  assert.ok(sin.split('\n').length > 4, 'varios renglones');
  assert.match(A.mensajeCupon(cupon({ creditos: 1 })), /Te da 1 crédito para/);
});

test('«Ver quién»: nombre, correo, fecha y créditos de cada canje; sin canjes lo dice', () => {
  const h = A.quienHTML([{ nombre: 'Ana <b>', correo: 'ana@x.test', creditos: 100, en: '2026-10-23T15:00:00Z' }]);
  assert.match(h, /<strong>Ana &lt;b&gt;<\/strong>/);
  assert.ok(h.includes('ana@x.test') && h.includes('100 créditos'));
  assert.match(A.quienHTML([]), /Todavía nadie ha canjeado este cupón/);
});

test('el historial de regalos dice «Cupón CLAVE» cuando el regalo vino de un cupón', () => {
  const base = { id: 'r1', uid: 'a', nombre: 'Ana', correo: 'a@x.test', cantidad: 100, en: '2026-10-23T16:00:00Z', estado: 'pendiente', materialesTotal: 1, materialesCanjeados: 0, canjes: [] };
  assert.match(A.filaRegalo(Object.assign({}, base, { origen: 'cupon', cupon: 'CANAL100' })), /ap-hr__admin">Cupón CANAL100</);
  assert.match(A.filaRegalo(Object.assign({}, base, { origen: 'admin', regaladoPor: 'admin@x.test' })), /ap-hr__admin">Por admin@x\.test</);
});

test('el módulo usa solo los endpoints de cupones del servidor, valida lo que escribes y la hoja de estilos cumple el diseño', () => {
  const js = leer('assets/js/admin-creditos.js');
  for (const r of ["'/api/admin/creditos/cupones'", "'/api/admin/creditos/cupones/estado'", "'/api/admin/creditos/cupones/canjes?clave='"]) assert.ok(js.includes(r), r);
  assert.doesNotMatch(js, /firestore|firebase\./i);
  assert.ok(js.includes('Date.parse(vence) <= Date.now()') && js.includes("'La fecha y hora límite deben ser futuras.'"));
  assert.ok(js.includes('navigator.clipboard.writeText(mensajeCupon(c))'));
  const css = leer('assets/css/admin-cupones.css');
  assert.doesNotMatch(css, /gradient/i);
  for (const m of css.matchAll(/font(?:-size)?:\s*(?:[0-9]+\s+)?([\d.]+)(px|rem)/g)) assert.ok((m[2] === 'px' ? Number(m[1]) : Number(m[1]) * 16) >= 12, 'letra de ' + m[0]);
  assert.match(leer('pages/admin-club.html'), /admin-cupones\.css\?v=/);
});
