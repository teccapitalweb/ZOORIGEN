'use strict';

// «Suscripciones y pagos» del panel: cifras, planes por vencer y vencidos, gráficas y la lista de pagos.
// Ejecutar: node --test tests/admin-suscripciones.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const P = require(path.join(RAIZ, 'assets', 'js', 'admin-panel.js'));
const A = require(path.join(RAIZ, 'assets', 'js', 'admin-suscripciones.js'));

const AHORA = Date.UTC(2026, 9, 23, 18, 0);
const dias = n => new Date(AHORA + n * 86400000).toISOString();
const pago = (id, hace, extra) => Object.assign({ id, fecha: dias(-hace), uid: '', nombre: 'Persona ' + id, correo: id + '@x.test', plan: 'mensual', tipo: 'primer', estado: 'pagado', monto: 199, moneda: 'MXN' }, extra);
const miembro = (uid, extra) => Object.assign({ uid, nombre: 'Miembro ' + uid, correo: uid + '@x.test', esAdmin: false, estado: 'activo', conAcceso: true, origen: 'stripe', stripeActiva: true, esRegalo: false, planTipo: 'mensual', vence: dias(5) }, extra);

test('la sección sigue en el menú con su nombre y se dibuja con el módulo nuevo; la vista anterior ya no existe', () => {
  assert.equal(P.seccion('suscripciones').titulo, 'Suscripciones y pagos');
  const html = leer('pages/admin-club.html');
  assert.match(html, /sec === 'suscripciones'\) window\.ZOO_ADMIN_SUSCRIPCIONES\.suscripciones\(\)/);
  assert.ok(html.indexOf('admin-suscripciones.js') > html.indexOf('admin-vistas.js') && html.indexOf('admin-suscripciones.js') > html.indexOf('admin-graficas.js'));
  assert.match(html, /admin-suscripciones\.css\?v=/);
  assert.doesNotMatch(leer('assets/js/admin-vistas.js'), /suscripciones: suscripciones|async function suscripciones/);
});

test('las cifras de los pagos: dinero cobrado, personas, renovaciones, monto más elegido y rechazados (los rechazados no suman dinero)', () => {
  const pagos = [pago('a', 3), pago('b', 5, { monto: 99 }), pago('c', 16), pago('d', 40, { monto: 10 }), pago('d', 12, { tipo: 'renov', id: 'd2' }), pago('e', 2, { estado: 'fallido' })];
  const s = A.resumenPagos(pagos);
  assert.equal(s.dineroCobrado, 199 + 99 + 199 + 10 + 199);
  assert.equal(s.nPagos, 5); assert.equal(s.personas, 4, 'Persona d pagó dos veces y cuenta una');
  assert.equal(s.renovaciones, 1); assert.equal(s.fallidos, 1);
  assert.equal(s.modaMonto, 199); assert.equal(s.modaCuantos, 2); assert.equal(s.modaDe, 4); assert.equal(s.modaEsPrimer, true);
  const v = A.resumenPagos([]);
  assert.deepEqual([v.dineroCobrado, v.nPagos, v.modaMonto, v.fallidos], [0, 0, null, 0]);
});

test('¿cuánto prefieren pagar?: por monto, del más elegido al menos; «primer pago» o «todos los pagos»', () => {
  const pagos = [pago('a', 3), pago('b', 5, { monto: 99 }), pago('c', 16), pago('d', 20, { tipo: 'renov', monto: 99 }), pago('e', 9, { tipo: 'renov', monto: 99 })];
  assert.deepEqual(A.montosElegidos(pagos, 'primer'), [{ monto: 199, personas: 2 }, { monto: 99, personas: 1 }]);
  assert.deepEqual(A.montosElegidos(pagos, 'todos'), [{ monto: 99, personas: 3 }, { monto: 199, personas: 2 }]);
  const h = A.graficaMontoHTML(pagos, 'primer');
  assert.match(h, /data-sb-graf="primer" aria-pressed="true"/); assert.match(h, /data-sb-graf="todos" aria-pressed="false"/);
  assert.ok(h.includes('$199') && h.includes('$99'));
  assert.match(A.graficaMontoHTML([], 'primer'), /Aún no hay pagos/);
});

test('dinero cobrado por mes: los últimos 6 meses (hora de México), solo pagos hechos', () => {
  const pagos = [pago('a', 3), pago('b', 5, { monto: 99 }), pago('c', 100), pago('d', 3, { estado: 'fallido' }), pago('e', 400)];
  const m = A.dineroPorMes(pagos, AHORA, 6);
  assert.equal(m.length, 6);
  assert.deepEqual(m.map(x => x.mes), ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
  assert.deepEqual([m[5].total, m[5].pagos], [298, 2]);
  assert.equal(m[2].total, 199, 'el de hace 100 días cae en julio');
  assert.equal(m.reduce((t, x) => t + x.total, 0), 298 + 199, 'el de hace 400 días queda fuera y el rechazado no suma');
});

test('por vencer y vencidos: quién vence (el más cercano primero) y quién ya perdió el acceso (el más reciente primero); la administración no cuenta', () => {
  const miembros = [
    miembro('lejos', { vence: dias(40) }), miembro('pronto', { vence: dias(3) }), miembro('manana', { vence: dias(1) }),
    miembro('viejo', { estado: 'vencido', conAcceso: false, vence: dias(-20) }), miembro('reciente', { estado: 'vencido', conAcceso: false, vence: dias(-2) }),
    miembro('rechazo', { estado: 'pago-pendiente', conAcceso: false, vence: dias(-1) }), miembro('sinplan', { estado: 'sin-plan', conAcceso: false, vence: null }),
    miembro('admin', { esAdmin: true, vence: dias(2) })
  ];
  const c = A.clasificarVencimientos(miembros, AHORA);
  assert.deepEqual(c.porVencer.map(m => m.uid), ['manana', 'pronto', 'lejos']);
  assert.deepEqual(c.vencidos.map(m => m.uid), ['rechazo', 'reciente', 'viejo']);
});

test('cuándo: «en menos de 24 horas», «mañana», «en 5 días», «hoy», «hace 3 días», «hace 2 meses»', () => {
  assert.equal(A.cuando(AHORA + 3600000, AHORA), 'en menos de 24 horas');
  assert.equal(A.cuando(AHORA + 30 * 3600000, AHORA), 'mañana');
  assert.equal(A.cuando(AHORA + 5 * 86400000, AHORA), 'en 5 días');
  assert.equal(A.cuando(AHORA - 3600000, AHORA), 'hoy');
  assert.equal(A.cuando(AHORA - 3 * 86400000, AHORA), 'hace 3 días');
  assert.equal(A.cuando(AHORA - 86400000 - 1000, AHORA), 'hace 1 día');
  assert.equal(A.cuando(AHORA - 70 * 86400000, AHORA), 'hace 2 meses');
});

test('cada renglón de «por vencer»: fecha y hora, quién, «Se renueva solo» / «No se renovará» / «Termina sin cobro», plan y último pago', () => {
  const ultimo = pago('x', 20, { correo: 'm@x.test', monto: 199 });
  const se = A.filaVencimiento(miembro('m', { correo: 'm@x.test' }), true, ultimo, AHORA);
  assert.match(se, /Vence el [^<]*2026/); assert.match(se, /Se renueva solo/); assert.match(se, /Mensual/); assert.match(se, /\$199<small>Pagó el /);
  assert.match(A.filaVencimiento(miembro('m', { estado: 'cancelado-vigente' }), true, null, AHORA), /No se renovará/);
  assert.match(A.filaVencimiento(miembro('m', { origen: 'manual', stripeActiva: false }), true, null, AHORA), /Termina sin cobro/);
  assert.match(A.filaVencimiento(miembro('m', { esRegalo: true, origen: 'regalo' }), true, null, AHORA), /Regalo/);
  assert.match(A.filaVencimiento(miembro('m', { estado: 'vencido', conAcceso: false, vence: dias(-3) }), false, null, AHORA), /Venció el [^<]*2026[\s\S]*hace 3 días[\s\S]*No renovó/);
  assert.match(A.filaVencimiento(miembro('m', { estado: 'pago-pendiente', conAcceso: false, vence: dias(-1) }), false, null, AHORA), /Pago rechazado/);
  assert.ok(!A.filaVencimiento(miembro('m', { nombre: '<b>x</b>' }), true, null, AHORA).includes('<b>x'), 'escapado');
});

test('el bloque «Planes por vencer y vencidos»: pestañas con su cuenta, 7/15/30 días, «Solo los que no se renovarán» y Ver más / Ver menos', () => {
  const miembros = [miembro('a', { vence: dias(3) }), miembro('b', { vence: dias(10), estado: 'cancelado-vigente' }), miembro('c', { vence: dias(25) }),
    miembro('v', { estado: 'vencido', conAcceso: false, vence: dias(-4) })];
  const h7 = A.vencimientosHTML(miembros, [], { tab: 'xvencer', horizonte: 7 }, AHORA);
  assert.match(h7, /Por vencer \(1\)/); assert.match(h7, /Vencidos \(1\)/);
  assert.match(h7, /data-sb-h="7" aria-pressed="true"/);
  assert.match(A.vencimientosHTML(miembros, [], { tab: 'xvencer', horizonte: 15 }, AHORA), /Por vencer \(2\)/);
  assert.match(A.vencimientosHTML(miembros, [], { tab: 'xvencer', horizonte: 30 }, AHORA), /Por vencer \(3\)/);
  const solo = A.vencimientosHTML(miembros, [], { tab: 'xvencer', horizonte: 30, solo: true }, AHORA);
  assert.match(solo, /Por vencer \(1\)/); assert.match(solo, /Solo los que no se renovarán/);
  const v = A.vencimientosHTML(miembros, [], { tab: 'vencidos' }, AHORA);
  assert.match(v, /Personas que tuvieron un plan y ya no tienen acceso/);
  assert.ok(!v.includes('data-sb-h='), 'el plazo solo va en «por vencer»');
  assert.match(A.vencimientosHTML([], [], { tab: 'xvencer', horizonte: 7 }, AHORA), /Nadie vence en los próximos 7 días/);
  assert.match(A.vencimientosHTML([], [], { tab: 'vencidos' }, AHORA), /Todavía nadie ha perdido su plan/);
  const muchos = Array.from({ length: 25 }, (_, i) => miembro('m' + i, { vence: dias(1 + i / 10) }));
  const a = A.vencimientosHTML(muchos, [], { tab: 'xvencer', horizonte: 30, visibles: 8 }, AHORA);
  assert.equal((a.match(/class="ap-sb"/g) || []).length, 8);
  assert.match(a, /Mostrando 8 de 25/); assert.match(a, /Ver más \(17\)/); assert.doesNotMatch(a, /venc-menos/);
  const b = A.vencimientosHTML(muchos, [], { tab: 'xvencer', horizonte: 30, visibles: 18 }, AHORA);
  assert.match(b, /Ver más \(7\)/); assert.match(b, /data-accion="venc-menos">Ver menos</);
});

test('las seis cifras de arriba, con su nota; sin pagos guardados no inventa nada', () => {
  const pagos = [pago('a', 3), pago('b', 5, { monto: 99 }), pago('c', 16)];
  const miembros = [miembro('a', { vence: dias(3), estado: 'cancelado-vigente' }), miembro('b', { vence: dias(20) }), miembro('v', { estado: 'vencido', conAcceso: false, vence: dias(-2) })];
  const h = A.cifrasHTML(pagos, miembros, AHORA);
  for (const t of ['Dinero cobrado', '$497', '3 pagos con monto registrado', 'Personas que han pagado', '0 renovaciones registradas', 'Monto más elegido', '$199', '2 de 3 en su primer pago', 'Cobros rechazados', 'Ningún cobro rechazado',
    'Planes por vencer', '1 no se renovará · próximos 7 días', 'Planes vencidos', 'El más reciente:']) assert.ok(h.includes(t), t);
  const v = A.cifrasHTML([], [], AHORA);
  assert.ok(v.includes('Aún no hay pagos guardados') && v.includes('Nadie vence en los próximos 7 días') && v.includes('Nadie ha perdido su plan todavía'));
});

test('lista «Pagos de suscripción»: fecha y hora, quién, tipo y plan, monto; filtros con su cuenta y búsqueda sin acentos; el nombre sale de Miembros si el pago no lo trae', () => {
  const pagos = [pago('a', 2, { nombre: 'David García', correo: 'david@x.test' }), pago('b', 4, { tipo: 'renov' }), pago('c', 6, { estado: 'fallido', correo: 'sin@x.test', nombre: '' }), pago('d', 8, { plan: 'anual', monto: 1899 })];
  const porCorreo = { 'sin@x.test': 'Nombre de Miembros' };
  assert.deepEqual(A.conteos(pagos), { todos: 4, primer: 2, renov: 1, fallido: 1 });
  assert.equal(A.filtrarPagos(pagos, 'primer', '', porCorreo).length, 2);
  assert.equal(A.filtrarPagos(pagos, 'renov', '', porCorreo).length, 1);
  assert.equal(A.filtrarPagos(pagos, 'fallido', '', porCorreo).length, 1);
  assert.equal(A.filtrarPagos(pagos, 'todos', 'garcia', porCorreo).length, 1, 'sin acentos');
  assert.equal(A.filtrarPagos(pagos, 'todos', 'miembros', porCorreo).length, 1, 'por el nombre de Miembros');
  const fila = A.filaPago(pagos[3], porCorreo);
  assert.ok(fila.includes('Primer pago') && fila.includes('Anual') && fila.includes('$1,899'));
  assert.match(A.filaPago(pagos[2], porCorreo), /Rechazado[\s\S]*ap-sb__monto--fallido[^>]*>\$199/);
  assert.match(A.filaPago(pagos[2], porCorreo), /Nombre de Miembros/);
  assert.match(A.filaPago(pago('z', 1, { monto: null }), {}), /Monto no registrado/);
  const card = A.pagosCardHTML(pagos, { filtro: 'primer' }, porCorreo);
  assert.match(card, /data-sb-filtro="primer" aria-pressed="true">Primer pago \(2\)/);
  assert.match(card, /Rechazados \(1\)/); assert.match(card, /id="apSbBuscar"/);
  assert.match(A.pagosListaHTML([], {}, {}), /Todavía no hay pagos registrados/);
  assert.match(A.pagosListaHTML(pagos, { filtro: 'todos', texto: 'zzzz' }, {}), /No hay pagos con ese filtro/);
});

test('la lista de pagos muestra 20 y abre con «Ver más (N)» y se cierra con «Ver menos»', () => {
  const muchos = Array.from({ length: 47 }, (_, i) => pago('p' + i, i + 1));
  const a = A.pagosListaHTML(muchos, { visiblesPagos: 20 }, {});
  assert.equal((a.match(/class="ap-sb"/g) || []).length, 20);
  assert.match(a, /Mostrando 20 de 47/); assert.match(a, /Ver más \(27\)/); assert.doesNotMatch(a, /pagos-menos/);
  const b = A.pagosListaHTML(muchos, { visiblesPagos: 40 }, {});
  assert.match(b, /Ver más \(7\)/); assert.match(b, /data-accion="pagos-menos">Ver menos</);
});

test('la pantalla completa: título, botón «Traer pagos desde Stripe», cifras, bloque de vencimientos, las dos gráficas y la lista; sin servidor nuevo avisa sin romper', () => {
  const h = A.vistaHTML({ pagos: [pago('a', 3)], miembros: [miembro('a')] }, {}, AHORA);
  for (const t of ['Suscripciones', 'y pagos.', 'Traer pagos desde Stripe', 'data-accion="sincronizar"', 'Planes por vencer y vencidos', '¿Cuánto prefieren pagar?', 'Dinero cobrado por mes', 'Pagos de suscripción', 'Las horas son de la Ciudad de México']) assert.ok(h.includes(t), t);
  const sin = A.vistaHTML({ pagos: null, miembros: [miembro('a')] }, {}, AHORA);
  assert.match(sin, /todavía no ofrece el registro de pagos/);
  assert.doesNotThrow(() => A.vistaHTML(undefined));
  assert.doesNotThrow(() => A.vistaHTML({ pagos: [], miembros: [] }, {}, AHORA));
});

test('el módulo solo habla con los endpoints del servidor, no guarda nada en el navegador y su hoja cumple el diseño', () => {
  const js = leer('assets/js/admin-suscripciones.js');
  for (const r of ["'/api/admin/pagos'", "'/api/admin/pagos/sincronizar'", "'/api/admin/miembros'"]) assert.ok(js.includes(r), r);
  assert.doesNotMatch(js, /firestore|firebase\.|localStorage/i);
  const css = leer('assets/css/admin-suscripciones.css');
  assert.doesNotMatch(css, /gradient/i);
  for (const m of css.matchAll(/font(?:-size)?:\s*(?:[0-9]+\s+)?([\d.]+)(px|rem)/g)) assert.ok((m[2] === 'px' ? Number(m[1]) : Number(m[1]) * 16) >= 12, 'letra de ' + m[0]);
});

/* ───────────── Usuarios activos ───────────── */

const activos = () => [
  miembro('a', { nombre: 'Ana Pérez', planTipo: 'mensual', vence: dias(3), inicioPlan: dias(-27) }),
  miembro('b', { nombre: 'Beto Díaz', planTipo: 'anual', vence: dias(300), inicioPlan: dias(-65), origen: 'manual', stripeActiva: false }),
  miembro('c', { nombre: 'Cata Ruiz', planTipo: 'mensual', vence: dias(6), estado: 'cancelado-vigente', inicioPlan: dias(-50) }),
  miembro('d', { nombre: 'Dani Gil', planTipo: 'mensual', esRegalo: true, origen: 'regalo', stripeActiva: false, vence: dias(25), inicioPlan: dias(-5) }),
  miembro('e', { nombre: 'Eli Admin', esAdmin: true }),
  miembro('v', { nombre: 'Vera Vieja', estado: 'vencido', conAcceso: false, vence: dias(-2) }),
  miembro('s', { nombre: 'Sin Plan', estado: 'sin-plan', conAcceso: false, vence: null, origen: 'ninguno', planTipo: null })
];

test('usuarios activos: solo cuentan quienes tienen acceso vigente (sin administración, vencidos ni sin membresía)', () => {
  assert.deepEqual(A.filtrarActivos(activos(), {}).map(m => m.uid).sort(), ['a', 'b', 'c', 'd']);
  assert.equal(A.esActivo(miembro('x', { esAdmin: true })), false);
  assert.equal(A.esActivo(miembro('x', { conAcceso: false })), false);
});

test('usuarios activos: resumen con activos hoy, por plan (mensual, anual, regalo) y por vencer en 7 días con cuántos no se renovarán', () => {
  const r = A.resumenActivos(activos(), AHORA);
  assert.equal(r.total, 4);
  assert.equal(r.mensual, 2);
  assert.equal(r.anual, 1);
  assert.equal(r.regalo, 1);
  assert.equal(r.stripe, 2);
  assert.equal(r.manual, 1);
  assert.equal(r.porVencer7, 2, 'Ana vence en 3 días y Cata en 6');
  assert.equal(r.noRenuevan7, 1, 'Cata canceló: no se renueva');
  const h = A.resumenActivosHTML(activos(), AHORA);
  for (const t of ['Activos hoy', 'Plan mensual', 'Plan anual', 'Regalo', 'Por vencer en 7 días', '1 no se renovará']) assert.ok(h.includes(t), t);
});

test('usuarios activos: filtros por plan, origen y estado, y búsqueda por nombre o correo sin acentos', () => {
  const u = ui => A.filtrarActivos(activos(), ui).map(m => m.uid).sort();
  assert.deepEqual(u({ plan: 'anual' }), ['b']);
  assert.deepEqual(u({ plan: 'regalo' }), ['d']);
  assert.deepEqual(u({ origen: 'stripe' }), ['a', 'c']);
  assert.deepEqual(u({ origen: 'manual' }), ['b']);
  assert.deepEqual(u({ origen: 'regalo' }), ['d']);
  assert.deepEqual(u({ estado: 'cancela' }), ['c']);
  assert.deepEqual(u({ estado: 'corriente' }), ['a', 'b', 'd']);
  assert.deepEqual(u({ texto: 'PEREZ' }), ['a'], 'sin acentos ni mayúsculas');
  assert.deepEqual(u({ texto: 'd@x.test' }), ['d']);
  assert.deepEqual(u({ plan: 'mensual', estado: 'cancela' }), ['c']);
  assert.deepEqual(u({ texto: 'nadie' }), []);
});

test('usuarios activos: orden por vencimiento (el más cercano primero), por más recientes y por nombre', () => {
  const o = orden => A.ordenarActivos(A.filtrarActivos(activos(), {}), orden).map(m => m.uid);
  assert.deepEqual(o('vence'), ['a', 'c', 'd', 'b']);
  assert.deepEqual(o('reciente'), ['d', 'a', 'c', 'b'], 'por desde cuándo empezó el plan');
  assert.deepEqual(o('nombre'), ['a', 'b', 'c', 'd']);
  const sinFecha = [miembro('z', { vence: null }), miembro('y', { vence: dias(2) })];
  assert.deepEqual(A.ordenarActivos(sinFecha, 'vence').map(m => m.uid), ['y', 'z'], 'sin fecha al final');
});

test('usuarios activos: cada renglón trae nombre, correo, plan, origen, desde cuándo, próximo cobro o vencimiento con días restantes y estado', () => {
  const [a, b, c, d] = ['a', 'b', 'c', 'd'].map(id => activos().find(m => m.uid === id));
  const fa = A.filaActivo(a, AHORA);
  for (const t of ['Ana Pérez', 'a@x.test', 'Mensual', 'Stripe (cobro automático)', 'Desde', 'Próximo cobro', 'Quedan 3 días', 'Al corriente']) assert.ok(fa.includes(t), t);
  assert.match(fa, /ap-ua__vence--aviso/, 'vence en 7 días o menos: aviso');
  assert.match(fa, /data-accion="acciones" data-uid="a"/, 'el nombre abre Acciones del miembro');
  const fb = A.filaActivo(b, AHORA);
  assert.ok(fb.includes('Anual') && fb.includes('Activación manual') && fb.includes('Vence') && !fb.includes('Próximo cobro'));
  assert.doesNotMatch(fb, /ap-ua__vence--aviso/);
  const fc = A.filaActivo(c, AHORA);
  assert.ok(fc.includes('Termina') && fc.includes('Cancelará al final del periodo'));
  const fd = A.filaActivo(d, AHORA);
  assert.ok(fd.includes('Regalo') && fd.includes('Regalo del administrador'));
  assert.equal(A.diasRestantes(a, AHORA), 3);
  assert.equal(A.diasRestantes(miembro('q', { vence: null }), AHORA), null);
  assert.match(A.filaActivo(miembro('h', { vence: dias(0.2) }), AHORA), /Quedan 1 día|Queda 1 día/);
  assert.match(A.filaActivo(miembro('h2', { vence: dias(-0.2) }), AHORA), /Vence hoy/);
});

test('usuarios activos: la tarjeta va arriba de los pagos con su contador, buscador, filtros y orden; vacío claro; Ver más; los pagos siguen intactos', () => {
  const h = A.vistaHTML({ miembros: activos(), pagos: [pago('a', 3)] }, {}, AHORA);
  assert.match(h, /Usuarios activos \(4\)/);
  assert.ok(h.indexOf('apUaCard') < h.indexOf('apSbVencCard') && h.indexOf('apUaCard') < h.indexOf('apSbPagosCard'));
  assert.match(h, /id="apUaBuscar"/);
  assert.match(h, /id="apUaOrden"/);
  for (const k of ['data-ua-plan="mensual"', 'data-ua-plan="anual"', 'data-ua-plan="regalo"', 'data-ua-origen="stripe"', 'data-ua-origen="manual"', 'data-ua-origen="regalo"', 'data-ua-estado="cancela"', 'data-ua-estado="corriente"']) assert.ok(h.includes(k), k);
  for (const t of ['Traer pagos desde Stripe', 'Planes por vencer y vencidos', 'Pagos de suscripción', 'Por qué se rechazan los cobros']) assert.ok(h.includes(t), t + ' sigue');
  assert.match(A.listaActivosHTML([], {}, AHORA), /Todavía no hay usuarios activos/);
  assert.match(A.listaActivosHTML(activos(), { texto: 'zzz' }, AHORA), /Nadie coincide con esos filtros/);
  const muchos = Array.from({ length: 25 }, (_, i) => miembro('m' + i, { vence: dias(10 + i) }));
  const l1 = A.listaActivosHTML(muchos, {}, AHORA);
  assert.equal((l1.match(/<li class="ap-ua"/g) || []).length, A.INI_ACTIVOS);
  assert.match(l1, /Ver más \(15\)/);
  assert.match(l1, /Mostrando 10 de 25 usuarios activos/);
  assert.equal((A.listaActivosHTML(muchos, { visibles: 25 }, AHORA).match(/<li class="ap-ua"/g) || []).length, 25);
});

test('usuarios activos: tocar la fila abre «Acciones del miembro» y, al cambiar algo, la lista se vuelve a cargar; sin Firestore directo ni degradados', () => {
  const js = leer('assets/js/admin-suscripciones.js');
  assert.match(js, /V\.abrirAcciones\(/);
  assert.match(js, /closest\('li\.ap-ua'\)/);
  assert.match(leer('assets/js/admin-vistas.js'), /apUaLista[\s\S]{0,160}ZOO_ADMIN_SUSCRIPCIONES\.suscripciones\(true\)/);
  assert.doesNotMatch(js, /firebase|firestore/i);
  const css = leer('assets/css/admin-suscripciones.css');
  assert.doesNotMatch(css, /gradient/i);
  assert.doesNotMatch(css.slice(css.indexOf('/* Usuarios activos */'), css.indexOf('.ap-sb-lista {')), /overflow-wrap: anywhere/);
  assert.ok(!/[\p{Extended_Pictographic}\u{FE0F}]/u.test(js.replace(/[▲▼]/g, '')));
});
