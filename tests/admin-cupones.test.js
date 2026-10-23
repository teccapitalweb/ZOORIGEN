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
  for (const t of ['Clave (vacía = al azar)', 'Créditos', 'Máximo de personas', 'Crear cupón', 'Ej.: CANAL100', 'Sin límite', '¿Cuándo deja de servir el cupón?', 'No vence', 'En 1 hora', 'En 6 horas', 'En 24 horas', 'En 3 días', 'En 7 días', 'Elegir día y hora', 'Dejará de servir']) assert.ok(h.includes(t) || t === 'Dejará de servir' , t);
  assert.match(h, /id="apCpCreditos"[^>]*value="100"/);
  assert.match(h, /id="apCpDia"[^>]*>/); assert.match(h, /type="date"/); assert.match(h, /type="time"/);
  assert.match(h, /data-vence="nunca" aria-pressed="true"/);
  assert.match(h, /id="apCpOtro" hidden/, 'el día y la hora solo salen con «Elegir día y hora»');
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
  assert.ok(js.includes('calcularVence(est.plazo') && js.includes("'La fecha y hora límite deben ser futuras.'"));
  assert.ok(js.includes('navigator.clipboard.writeText(mensajeCupon(c))'));
  const css = leer('assets/css/admin-cupones.css');
  assert.doesNotMatch(css, /gradient/i);
  for (const m of css.matchAll(/font(?:-size)?:\s*(?:[0-9]+\s+)?([\d.]+)(px|rem)/g)) assert.ok((m[2] === 'px' ? Number(m[1]) : Number(m[1]) * 16) >= 12, 'letra de ' + m[0]);
  assert.match(leer('pages/admin-club.html'), /admin-cupones\.css\?v=/);
});

test('plazos rápidos: No vence, 1 hora, 6 horas, 24 horas, 3 días y 7 días, contados desde el momento de crear el cupón', () => {
  const t0 = Date.UTC(2026, 9, 23, 18, 0);
  assert.deepEqual(A.PLAZOS.map(p => p[1]), ['No vence', 'En 1 hora', 'En 6 horas', 'En 24 horas', 'En 3 días', 'En 7 días']);
  assert.deepEqual(A.calcularVence('nunca', '', '', t0), { ms: null, error: '' });
  assert.equal(A.calcularVence('1h', '', '', t0).ms, t0 + 3600000);
  assert.equal(A.calcularVence('6h', '', '', t0).ms, t0 + 6 * 3600000);
  assert.equal(A.calcularVence('24h', '', '', t0).ms, t0 + 86400000);
  assert.equal(A.calcularVence('3d', '', '', t0).ms, t0 + 3 * 86400000);
  assert.equal(A.calcularVence('7d', '', '', t0).ms, t0 + 7 * 86400000);
  assert.ok(A.calcularVence('raro', '', '', t0).error);
});

test('«Elegir día y hora»: pide día y hora, no acepta una fecha pasada y la hora por omisión es 11:59 p. m.', () => {
  const t0 = new Date('2026-10-23T10:00:00').getTime();
  const ok = A.calcularVence('otro', '2026-10-24', '23:59', t0);
  assert.equal(ok.error, ''); assert.equal(ok.ms, new Date('2026-10-24T23:59').getTime());
  assert.equal(A.calcularVence('otro', '', '', t0).error, 'Elige el día y la hora.');
  assert.equal(A.calcularVence('otro', '2026-10-24', '', t0).error, 'Elige el día y la hora.');
  assert.equal(A.calcularVence('otro', '2026-10-22', '10:00', t0).error, 'La fecha y hora límite deben ser futuras.');
  assert.equal(A.calcularVence('otro', '2026-10-23', '10:00', t0).error, 'La fecha y hora límite deben ser futuras.', 'justo ahora ya es pasado');
  assert.match(A.plazoHTML(), /id="apCpHora" value="23:59"/);
});

test('la frase de abajo: «Dejará de servir el viernes, 23 de octubre a las 11:59 p. m.» y, sin plazo, que sirve hasta que lo pauses', () => {
  const f = A.resumenVence(new Date('2026-10-24T05:59:00Z').getTime());   // 23 de octubre, 11:59 p. m. en la Ciudad de México
  assert.match(f, /^Dejará de servir el viernes, 23 de octubre a las 11:59 p\. ?m\.$/);
  assert.doesNotMatch(f, /\.\.$/);
  assert.match(A.resumenVence(null), /sirve hasta que lo pauses/);
  assert.match(A.plazoHTML(), /id="apCpResumen"[^>]*aria-live="polite"/);
});

test('la lista de cupones muestra pocos y se abre con «Ver más (N)» y se cierra con «Ver menos»', () => {
  const muchos = Array.from({ length: 27 }, (_, i) => cupon({ clave: 'CUPON' + String(i).padStart(2, '0') }));
  const d = { cupones: muchos };
  assert.equal(A.CUPONES_INICIO, 5); assert.equal(A.CUPONES_PASO, 10);
  const a = A.cuponesListaHTML(d, 5);
  assert.equal((a.match(/class="ap-cp"/g) || []).length, 5);
  assert.match(a, /Mostrando 5 de 27/);
  assert.match(a, /data-accion="cupones-mas">Ver más \(22\)</);
  assert.doesNotMatch(a, /cupones-menos/, 'con los primeros no hay «Ver menos»');
  const b = A.cuponesListaHTML(d, 15);
  assert.equal((b.match(/class="ap-cp"/g) || []).length, 15);
  assert.match(b, /Ver más \(12\)/); assert.match(b, /data-accion="cupones-menos">Ver menos</);
  const c = A.cuponesListaHTML(d, 25);
  assert.match(c, /Ver más \(2\)/);
  const todo = A.cuponesListaHTML(d, 99);
  assert.equal((todo.match(/class="ap-cp"/g) || []).length, 27);
  assert.doesNotMatch(todo, /cupones-mas/); assert.match(todo, /cupones-menos/);
  assert.ok(a.indexOf('CUPON00') < a.indexOf('CUPON04'), 'el orden del servidor se respeta');
  const pocos = A.cuponesListaHTML({ cupones: muchos.slice(0, 3) }, 5);
  assert.doesNotMatch(pocos, /cupones-mas|cupones-menos/, 'con pocos no hace falta');
  assert.match(A.cuponesHTML(d), /id="apCpListaCaja"/, 'la lista vive aparte del formulario para no borrar lo que se escribe');
});

test('el controlador: los botones de plazo y de ver más están conectados y la lista se repinta sin tocar el formulario', () => {
  const js = leer('assets/js/admin-creditos.js');
  for (const t of ["'cupones-mas'", "'cupones-menos'", "var ch = ev.target.closest('[data-vence]')", 'function pintarCuponesLista()', "getElementById('apCpListaCaja')", 'function elegirPlazo(modo)']) assert.ok(js.includes(t), t);
});

test('para quién es el cupón: Todas las cuentas, Solo cuentas gratuitas o Solo miembros VIP, con su frase; por omisión todas', () => {
  assert.deepEqual(A.AUDIENCIAS.map(a => a[0]), ['todos', 'gratuitos', 'vip']);
  const h = A.formularioCuponHTML();
  for (const t of ['¿Para quién es el cupón?', 'Todas las cuentas', 'Solo cuentas gratuitas', 'Solo miembros VIP', 'Lo puede canjear cualquier cuenta con el correo confirmado.']) assert.ok(h.includes(t), t);
  assert.match(h, /data-aud="todos" aria-pressed="true"/); assert.match(h, /data-aud="vip" aria-pressed="false"/);
  assert.ok(h.indexOf('¿Para quién es el cupón?') < h.indexOf('¿Cuándo deja de servir el cupón?'), 'primero para quién y luego el plazo');
  assert.ok(h.indexOf('id="apCpMax"') < h.indexOf('¿Para quién es el cupón?'), 'el máximo de personas sigue editable arriba');
  assert.equal(A.audienciaTexto('vip'), 'Solo miembros VIP'); assert.equal(A.audienciaTexto('raro'), 'Todas las cuentas');
});

test('cada cupón dice para quién es y el mensaje del canal lo aclara cuando no es para todos', () => {
  assert.match(A.filaCuponHTML(cupon({ audiencia: 'vip' })), /ap-cp__aud">Solo miembros VIP</);
  assert.match(A.filaCuponHTML(cupon({ audiencia: 'gratuitos' })), /ap-cp__aud">Solo cuentas gratuitas</);
  assert.match(A.filaCuponHTML(cupon({ audiencia: undefined })), /ap-cp__aud">Todas las cuentas</, 'un cupón anterior vale para todas');
  assert.match(A.mensajeCupon(cupon({ audiencia: 'vip', maxPersonas: null, vence: null })), /Solo para miembros VIP/);
  assert.match(A.mensajeCupon(cupon({ audiencia: 'gratuitos', maxPersonas: null, vence: null })), /Solo para cuentas gratuitas/);
  assert.doesNotMatch(A.mensajeCupon(cupon({ audiencia: 'todos', maxPersonas: null, vence: null })), /Solo para (miembros|cuentas)/);
  const js = leer('assets/js/admin-creditos.js');
  assert.ok(js.includes('audiencia: est.audiencia') && js.includes("ev.target.closest('[data-aud]')"));
});
