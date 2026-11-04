'use strict';

// «Suscripciones y pagos»: el MOTIVO de cada cobro rechazado (ya traducido por el servidor), «Qué significa» y «Qué hacer», la gráfica
// «Por qué se rechazan los cobros», el aviso cuando el motivo aún no se conoce, el resumen de «Traer pagos desde Stripe» y la ficha del miembro.
// Ejecutar: node --test tests/admin-suscripciones-motivos.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const A = require(path.join(RAIZ, 'assets', 'js', 'admin-suscripciones.js'));

const AHORA = Date.UTC(2026, 10, 3, 18, 0);
const f = n => new Date(AHORA + n * 86400000).toISOString();
const FONDOS = { texto: 'Fondos insuficientes', significa: 'La tarjeta no tenía saldo o crédito disponible para este cobro.', queHacer: 'Escríbele para que revise su saldo o use otra tarjeta.', categoria: 'fondos', codigo: 'insufficient_funds' };
const VENCIDA = { texto: 'Tarjeta vencida', significa: 'La fecha de vencimiento de la tarjeta ya pasó.', queHacer: 'Pídele que actualice su tarjeta.', categoria: 'tarjeta', codigo: 'expired_card' };
const BANCO = { texto: 'El banco rechazó el cobro sin dar detalle', significa: 'El banco dijo que no.', queHacer: 'Pídele que contacte a su banco.', categoria: 'banco', codigo: 'card_declined' };
const pago = (id, hace, extra) => Object.assign({ id, fecha: f(-hace), uid: 'u_' + id, nombre: 'Persona ' + id, correo: id + '@x.test', plan: 'mensual', tipo: 'renov', estado: 'pagado', monto: 199, moneda: 'MXN', motivo: null, intentos: 0, ultimoIntento: null, proximoIntento: null }, extra);
const rechazo = (id, hace, motivo, extra) => pago(id, hace, Object.assign({ estado: 'fallido', motivo, intentos: 2, ultimoIntento: f(-hace + 0.2) }, extra));

test('fila rechazada: debajo de las insignias, «Motivo: Fondos insuficientes» con ícono y el botón «Ver detalle»', () => {
  const h = A.filaPago(rechazo('a', 3, FONDOS), {});
  assert.match(h, /class="ap-sb ap-sb--fallido" data-pago="a"/);
  assert.match(h, /Rechazado/);
  assert.match(h, /Motivo: <strong>Fondos insuficientes<\/strong>/);
  assert.match(h, /<svg[^>]*class="zi"[\s\S]*Motivo:/, 'ícono Lucide antes del texto');
  assert.ok(h.indexOf('ap-sb__chips') < h.indexOf('ap-sb__motivo'), 'el motivo va después de las insignias');
  assert.match(h, /data-sb-detalle="a" aria-expanded="false" aria-controls="apSbDet-a">Ver detalle</);
  assert.doesNotMatch(h, /ap-sb__detalle/, 'cerrado: sin el bloque');
  assert.match(h, /ap-sb__monto--fallido/);
});

test('fila rechazada ABIERTA: «Qué significa», «Qué hacer», intentos, último intento y próximo intento de Stripe', () => {
  const p = rechazo('a', 3, FONDOS, { intentos: 3, ultimoIntento: f(-2.9), proximoIntento: f(1) });
  const h = A.filaPago(p, {}, true);
  assert.match(h, /ap-sb--fallido is-abierto/);
  assert.match(h, /aria-expanded="true"[^>]*>Ocultar detalle</);
  assert.match(h, /<dt>Qué significa<\/dt><dd>La tarjeta no tenía saldo/);
  assert.match(h, /<dt>Qué hacer<\/dt><dd>Escríbele para que revise su saldo/);
  assert.match(h, /<dt>Intentos de cobro<\/dt><dd>3 intentos<\/dd>/);
  assert.match(h, /<dt>Último intento<\/dt><dd>[^<]*2026[^<]*·/);
  assert.match(h, /<dt>Próximo intento de Stripe<\/dt>/);
  assert.match(h, /Referencia para el equipo técnico: insufficient_funds/);
  assert.match(h, /id="apSbDet-a"/);
  assert.match(A.detalleRechazoHTML(rechazo('b', 1, VENCIDA, { intentos: 1 })), /1 intento</);
  assert.doesNotMatch(A.detalleRechazoHTML(rechazo('b', 1, VENCIDA, { intentos: 1 })), /Próximo intento/, 'sin próximo intento no se inventa');
  assert.equal(A.detalleRechazoHTML(rechazo('c', 1, null)), '');
});

test('motivo aún desconocido: «Motivo no disponible todavía. Pulsa Traer pagos desde Stripe para completarlo.» y sin botón de detalle', () => {
  const h = A.filaPago(rechazo('a', 3, null), {});
  assert.ok(h.includes('Motivo no disponible todavía. Pulsa «Traer pagos desde Stripe» para completarlo.'));
  assert.doesNotMatch(h, /data-sb-detalle/);
  assert.match(h, /ap-sb__motivo-t--sin/);
  assert.equal(A.SIN_MOTIVO, 'Motivo no disponible todavía. Pulsa «Traer pagos desde Stripe» para completarlo.');
});

test('los cobros pagados no llevan motivo, y todo lo que viene del servidor se escapa', () => {
  const ok = A.filaPago(pago('p', 2), {});
  assert.doesNotMatch(ok, /Motivo|ap-sb__motivo|data-pago/);
  const sucio = rechazo('x', 1, { texto: '<img src=x onerror=1>', significa: '<script>1</script>', queHacer: '"><b>', categoria: 'otro', codigo: '<i>' }, { id: 'a"><script>' });
  const h = A.filaPago(sucio, {}, true);
  assert.ok(!/<img src=x|<script|<b>|<i>/.test(h));
});

test('agruparRechazos: por categoría y motivo, con porcentaje sobre los que tienen motivo; los sin motivo aparte', () => {
  const l = [rechazo('a', 1, FONDOS), rechazo('b', 2, FONDOS), rechazo('c', 3, VENCIDA), rechazo('d', 4, BANCO), rechazo('e', 5, null), pago('p', 6)];
  const r = A.agruparRechazos(l);
  assert.deepEqual([r.total, r.conMotivo, r.sinMotivo], [5, 4, 1]);
  assert.deepEqual(r.categorias.map(c => [c.clave, c.nombre, c.n, c.pct]), [['fondos', 'Fondos insuficientes', 2, 50], ['tarjeta', 'Problema con la tarjeta', 1, 25], ['banco', 'Decisión del banco', 1, 25]]);
  assert.deepEqual(r.categorias[0].motivos, [{ texto: 'Fondos insuficientes', n: 2 }]);
  assert.deepEqual(A.agruparRechazos(null), { total: 0, conMotivo: 0, sinMotivo: 0, categorias: [] });
  assert.equal(A.agruparRechazos([rechazo('z', 1, { texto: 'x', categoria: 'inventada' })]).categorias[0].clave, 'otro');
});

test('«Por qué se rechazan los cobros»: barras horizontales con conteo y porcentaje, frase «Cómo leerlo» con los datos y la pista para completar los que faltan', () => {
  const l = [rechazo('a', 1, FONDOS), rechazo('b', 2, FONDOS), rechazo('c', 3, FONDOS), rechazo('d', 4, VENCIDA), rechazo('e', 5, null)];
  const h = A.graficaRechazosHTML(l);
  assert.match(h, /zg-bh/);
  assert.match(h, /Fondos insuficientes/); assert.match(h, /75 %/);
  assert.match(h, /<strong>Cómo leerlo:<\/strong> La causa más común es «Fondos insuficientes»: 3 de 4 cobros rechazados con motivo conocido \(75 %\)/);
  assert.match(h, /1 rechazo todavía no tiene motivo: pulsa «Traer pagos desde Stripe» para completarlos\./);
  const empate = A.graficaRechazosHTML([rechazo('a', 1, FONDOS), rechazo('b', 2, VENCIDA)]);
  assert.match(empate, /Hay empate arriba: «Fondos insuficientes» y «Problema con la tarjeta»/);
  assert.match(A.fraseRechazos(A.agruparRechazos([rechazo('a', 1, FONDOS)])), /casi siempre por «Fondos insuficientes»/);
});

test('«Por qué se rechazan los cobros»: estados vacíos amables (sin rechazos, o con rechazos todavía sin motivo)', () => {
  const sin = A.graficaRechazosHTML([pago('a', 1)]);
  assert.match(sin, /Todavía no hay cobros rechazados/);
  assert.doesNotMatch(sin, /Cómo leerlo/);
  const solo = A.graficaRechazosHTML([rechazo('a', 1, null), rechazo('b', 2, null)]);
  assert.match(solo, /Aún no conocemos los motivos/);
  assert.match(solo, /Hay 2 cobros rechazados sin motivo guardado\. Pulsa «Traer pagos desde Stripe»/);
  assert.doesNotMatch(solo, /Cómo leerlo/);
  assert.match(A.graficaRechazosHTML(undefined), /Todavía no hay cobros rechazados/);
});

test('la pantalla: la gráfica va arriba, antes de «Planes por vencer», solo si hay pagos; el chip «Rechazados (N)» sigue', () => {
  const pagos = [rechazo('a', 1, FONDOS), rechazo('b', 2, VENCIDA), pago('c', 3, { tipo: 'primer' })];
  const h = A.vistaHTML({ pagos, miembros: [] }, {}, AHORA);
  assert.ok(h.includes('Por qué se rechazan los cobros'));
  assert.ok(h.indexOf('Por qué se rechazan los cobros') < h.indexOf('Planes por vencer y vencidos'), 'arriba');
  assert.ok(h.indexOf('id="apSbRechazosCard"') > h.indexOf('class="ap-kpis"'), 'después de las cifras');
  assert.match(h, /data-sb-filtro="fallido" aria-pressed="false">Rechazados \(2\)/);
  assert.doesNotMatch(A.vistaHTML({ pagos: [], miembros: [] }, {}, AHORA), /Por qué se rechazan los cobros/);
  assert.doesNotThrow(() => A.vistaHTML({ pagos: null, miembros: [] }, {}, AHORA));
});

test('la cifra «Cobros rechazados» dice la causa más común (o invita a traer los motivos, o dice que no hay)', () => {
  const con = A.cifrasHTML([rechazo('a', 1, FONDOS), rechazo('b', 2, FONDOS), rechazo('c', 3, VENCIDA)], [], AHORA);
  assert.match(con, /Causa más común: Fondos insuficientes \(2 de 3\)/);
  assert.match(A.cifrasHTML([rechazo('a', 1, null)], [], AHORA), /Pulsa «Traer pagos desde Stripe» para ver el motivo/);
  assert.match(A.cifrasHTML([pago('a', 1)], [], AHORA), /Ningún cobro rechazado/);
  assert.equal(A.rechazosTop([]), '');
});

test('«Traer pagos desde Stripe»: el aviso final dice pagos nuevos, rechazos nuevos, motivos completados y los que quedan', () => {
  assert.equal(A.resumenSincronizacion({ nuevos: 2, fallidosNuevos: 1, motivosCompletados: 3, motivosPendientes: 0, errores: 0 }), 'Se guardaron 2 pagos nuevos · 1 rechazo nuevo · motivos completados: 3.');
  assert.equal(A.resumenSincronizacion({ nuevos: 0, fallidosNuevos: 0, motivosCompletados: 0 }), 'Todo estaba al día.');
  assert.equal(A.resumenSincronizacion({ nuevos: 1, motivosCompletados: 3 }), 'Se guardó 1 pago nuevo · motivos completados: 3.');
  assert.match(A.resumenSincronizacion({ motivosCompletados: 2, motivosPendientes: 1 }), /Quedan 1 rechazo sin motivo/);
  assert.match(A.resumenSincronizacion({ errores: 2 }), /2 consultas a Stripe no se pudieron hacer/);
  assert.equal(A.resumenSincronizacion(null), 'Todo estaba al día.');
});

test('la ficha del miembro con pago pendiente muestra el último motivo y qué hacer; si no se conoce, lo dice', () => {
  const m = { uid: 'u_a', correo: 'a@x.test', estado: 'pago-pendiente' };
  const pagos = [rechazo('viejo', 20, VENCIDA, { uid: 'u_a', correo: 'a@x.test' }), rechazo('nuevo', 2, FONDOS, { uid: 'u_a', correo: 'a@x.test', intentos: 3 }), rechazo('otro', 1, BANCO, { uid: 'u_z', correo: 'z@x.test' }), pago('ok', 1, { uid: 'u_a' })];
  assert.equal(A.ultimoRechazoDe(pagos, m).id, 'nuevo');
  assert.equal(A.ultimoRechazoDe(pagos, { uid: '', correo: 'A@X.test' }).id, 'nuevo', 'también por correo, sin importar mayúsculas');
  assert.equal(A.ultimoRechazoDe(pagos, { uid: 'nadie', correo: 'nadie@x.test' }), null);
  assert.equal(A.ultimoRechazoDe(null, m), null);
  const h = A.fichaMotivoHTML(A.ultimoRechazoDe(pagos, m));
  assert.match(h, /Último cobro rechazado/); assert.match(h, /Motivo: <strong>Fondos insuficientes<\/strong>/);
  assert.match(h, /3 intentos/); assert.match(h, /Qué hacer:<\/b> Escríbele para que revise su saldo/);
  assert.ok(A.fichaMotivoHTML(rechazo('s', 1, null)).includes('Motivo no disponible todavía.'));
  assert.equal(A.fichaMotivoHTML(null), '');
  const v = leer('assets/js/admin-vistas.js');
  assert.match(v, /if \(m\.estado === 'pago-pendiente' && SUSC && SUSC\.ultimoRechazoDe\)/, 'solo con pago pendiente');
  assert.match(v, /try \{ var pg = await ctx\.api\('\/api\/admin\/pagos'\)[\s\S]{0,200}catch \(e\) \{ motivoPago = ''; \}/, 'si falla la lectura, la ficha sale igual');
  assert.match(v, /'<\/dl>' \+ motivoPago \+/);
});

test('el controlador abre y cierra el detalle con el botón o al pulsar la fila (sin atrapar enlaces ni botones), y recuerda las filas abiertas', () => {
  const js = leer('assets/js/admin-suscripciones.js');
  assert.match(js, /abiertos: \{\}/);
  assert.match(js, /ev\.target\.closest\('\[data-sb-detalle\]'\) \|\| \(!ev\.target\.closest\('a, button, input, select, label'\) \? ev\.target\.closest\('\.ap-sb--fallido\[data-pago\]'\) : null\)/);
  assert.match(js, /est\.abiertos\[idp\] = !est\.abiertos\[idp\]; pintarPagos\(\)/);
  assert.match(js, /visiblesPagos: est\.visP, abiertos: est\.abiertos/);
  assert.match(js, /ctx\.toast\(resumenSincronizacion\(r\)\)/);
});

test('estilos: nombre y correo sin partirse letra por letra, el celular apila nombre/correo a todo el ancho, motivo con color sólido, letra de 12 px o más y sin degradados', () => {
  const css = leer('assets/css/admin-suscripciones.css');
  assert.doesNotMatch(css, /gradient/i);
  assert.doesNotMatch(css, /overflow-wrap:\s*anywhere/, 'anywhere es lo que partía el nombre y el correo en columnas angostas');
  assert.match(css, /\.ap-sb__quien \{ min-width: 0; \}/);
  assert.match(css, /\.ap-sb__quien \.ap-correo \{ display: block; \}/);
  assert.match(css, /grid-template-areas: "quien quien" "fecha monto" "chips chips" "motivo motivo"/);
  assert.match(css, /\.ap-sb__motivo \{[^}]*background: var\(--c-bad-bg\)[^}]*border: 1px solid var\(--c-bad-line\)/);
  assert.match(css, /\.ap-sb__ver \{[^}]*min-height: 36px/);
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*\.ap-sb__ver \{ width: 100%; min-height: 44px; \}/);
  for (const m of css.matchAll(/font(?:-size)?:\s*(?:[0-9]{3}\s+)?([0-9.]+)(rem|px)/g)) assert.ok((m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1])) >= 12, m[0]);
  assert.ok(!/[\p{Extended_Pictographic}\u{FE0F}]/u.test(css + leer('assets/js/admin-suscripciones.js')), 'sin emojis');
});
