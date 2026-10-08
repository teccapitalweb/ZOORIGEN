'use strict';

// Pruebas del panel de miembros del admin. Usan el club.js REAL (calculateStatus, toDate)
// cargado en un sandbox, para probar la regla verdadera de acceso y no una copia.
// Ejecutar: node --test tests/admin-miembros.test.js

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const RAIZ = path.join(__dirname, '..');
const A = require(path.join(RAIZ, 'assets', 'js', 'admin-miembros.js'));

function cargarClub() {
  const elemento = () => ({ style: {}, classList: { add() {}, remove() {} }, setAttribute() {}, appendChild() {} });
  const documento = {
    addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null,
    createElement: elemento, body: elemento(), documentElement: { style: {} }
  };
  const almacen = { getItem: () => null, setItem() {}, removeItem() {} };
  const sandbox = {
    console, Date, JSON, Math, setTimeout, clearTimeout, setInterval, clearInterval, Promise, URL,
    window: { addEventListener() {}, location: { href: '', pathname: '/', search: '' }, matchMedia: () => ({ matches: false, addEventListener() {} }), document: documento, localStorage: almacen },
    document: documento, localStorage: almacen, sessionStorage: almacen, navigator: { userAgent: 'node' },
    location: { href: '', pathname: '/' }, fetch: () => Promise.reject(new Error('sin red'))
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'assets', 'js', 'club.js'), 'utf8') + ';globalThis.__CLUB = ZOORIGEN_CLUB;', sandbox);
  return sandbox.__CLUB;
}
const club = cargarClub();

const DIA = 86400000;
const ts = dias => ({ toDate: () => new Date(Date.now() + dias * DIA) });          // Timestamp de Firestore
const iso = dias => new Date(Date.now() + dias * DIA).toISOString();                // fecha como texto (Shopify)
const base = (id, extra = {}) => ({ id, name: `Miembro ${id}`, email: `${id}@example.com`, createdAt: iso(-60), ...extra });
const analizar = m => A.analizar(m, club);

// ── Clasificación ─────────────────────────────────────────
test('miembro con Stripe vigente: acceso, origen Stripe y sin avisos', () => {
  const a = analizar(base('s1', { planActivo: true, planStatus: 'active', planVence: ts(10), stripeSubscriptionId: 'sub_1' }));
  assert.equal(a.conAcceso, true);
  assert.equal(a.origen, 'stripe');
  assert.deepEqual(a.avisos, []);
});

test('activación manual se identifica como Manual', () => {
  const a = analizar(base('m1', { planActivo: true, planStatus: 'active', planVence: ts(10), activadoManualmente: true }));
  assert.equal(a.origen, 'manual');
  assert.equal(a.conAcceso, true);
});

test('heredado de Shopify con fecha en texto: tiene acceso y avisa que no podrá usar el foro', () => {
  const a = analizar(base('h1', { planActivo: true, planVence: iso(10), shopifyOrderId: 99 }));
  assert.equal(a.origen, 'heredado');
  assert.equal(a.conAcceso, true);
  assert.ok(a.avisos.some(x => x.id === 'fecha-texto'));
});

test('cancelado con periodo vigente conserva acceso', () => {
  const a = analizar(base('c1', { planActivo: true, planCancelado: true, planStatus: 'cancelled_active', planVence: ts(5), stripeSubscriptionId: 'sub_2' }));
  assert.equal(a.estado, 'cancelled_active');
  assert.equal(a.conAcceso, true);
});

test('marcado como activo pero vencido: sin acceso y con aviso (caso real de tu base)', () => {
  const a = analizar(base('v1', { planActivo: true, planStatus: 'active', planVence: ts(-130) }));
  assert.equal(a.conAcceso, false);
  assert.equal(a.estado, 'expired');
  assert.ok(a.avisos.some(x => x.id === 'activo-vencido'));
});

test('con suscripción en Stripe pero sin acceso: avisa que se confirme en Stripe', () => {
  const a = analizar(base('v2', { planActivo: true, planVence: ts(-30), stripeSubscriptionId: 'sub_3' }));
  assert.ok(a.avisos.some(x => x.id === 'revisar-stripe'));
});

test('activo sin fecha de vencimiento se marca como inconsistente', () => {
  const a = analizar(base('v3', { planActivo: true }));
  assert.ok(a.avisos.some(x => x.id === 'activo-sin-fecha'));
});

test('quien nunca pagó queda "sin pago" y sin avisos', () => {
  const a = analizar(base('p1', { planActivo: false, planVence: null }));
  assert.equal(a.estado, 'pending_payment');
  assert.equal(a.conAcceso, false);
  assert.deepEqual(a.avisos, []);
});

test('sin createdAt se avisa (antes el panel lo ocultaba)', () => {
  const a = analizar({ id: 'x1', name: 'Sin registro', email: 'x1@example.com', planActivo: false });
  assert.ok(a.avisos.some(x => x.id === 'sin-registro'));
});

test('analizar no modifica el documento original', () => {
  const m = base('z1', { planActivo: true, planVence: ts(3) });
  const copia = JSON.stringify(m);
  analizar(m);
  assert.equal(JSON.stringify(m), copia);
});

// ── Resumen: los números deben ser todos reales ───────────
const poblacion = () => [
  base('s1', { planActivo: true, planStatus: 'active', planVence: ts(10), stripeSubscriptionId: 'sub_1' }),
  base('s2', { planActivo: true, planStatus: 'active', planVence: ts(40), stripeSubscriptionId: 'sub_2' }),
  base('m1', { planActivo: true, planStatus: 'active', planVence: ts(20), activadoManualmente: true }),
  base('h1', { planActivo: true, planVence: iso(5), shopifyOrderId: 1 }),
  base('c1', { planActivo: true, planCancelado: true, planStatus: 'cancelled_active', planVence: ts(8), stripeSubscriptionId: 'sub_3' }),
  base('d1', { planActivo: true, planStatus: 'past_due', planVence: ts(2), stripeSubscriptionId: 'sub_4' }),
  base('v1', { planActivo: true, planStatus: 'active', planVence: ts(-130) }),
  base('v2', { planActivo: false, planVence: ts(-20), stripeSubscriptionId: 'sub_5' }),
  base('p1', { planActivo: false }), base('p2', { planActivo: false }), base('p3', { planActivo: false }),
  { id: 'x1', name: 'Sin registro', email: 'x1@example.com', planActivo: false }
];

test('el resumen cuenta a TODOS, incluidos los que no tienen createdAt', () => {
  const lista = poblacion().map(analizar);
  const r = A.resumen(lista);
  assert.equal(r.total, 12);
  assert.equal(r.sinFechaRegistro, 1);
});

test('el resumen separa acceso por origen', () => {
  const r = A.resumen(poblacion().map(analizar));
  assert.equal(r.conAcceso, 5);
  assert.deepEqual(r.porOrigen, { stripe: 3, manual: 1, heredado: 1, otro: 0 });
  assert.equal(r.vigentesCancelados, 1);
});

test('el resumen separa vencidos, pago pendiente y sin pago', () => {
  const r = A.resumen(poblacion().map(analizar));
  assert.equal(r.pagoPendiente, 1);
  assert.equal(r.vencidos, 2);
  assert.equal(r.sinPago, 4);
});

test('acceso + pago pendiente + vencidos + sin pago = total (no se pierde nadie)', () => {
  const r = A.resumen(poblacion().map(analizar));
  assert.equal(r.conAcceso + r.pagoPendiente + r.vencidos + r.sinPago, r.total);
});

test('el resumen para compartir NO contiene datos personales', () => {
  const lista = poblacion().map(analizar);
  const texto = A.resumenTexto(A.resumen(lista), new Date('2026-10-08T12:00:00Z'));
  assert.ok(texto.includes('2026-10-08'));
  assert.ok(texto.includes('Total real: 12'));
  assert.ok(!texto.includes('@'), 'no debe incluir correos');
  assert.ok(!texto.includes('Miembro'), 'no debe incluir nombres');
});

// ── Orden y filtros ───────────────────────────────────────
test('el orden pone primero a quien tiene acceso (el que vence antes, arriba)', () => {
  const ids = A.ordenar(poblacion().map(analizar)).map(a => a.id);
  assert.deepEqual(ids.slice(0, 5), ['h1', 'c1', 's1', 'm1', 's2']);
  assert.equal(ids[5], 'd1');                       // pago pendiente
  assert.deepEqual(ids.slice(6, 8), ['v2', 'v1']);  // vencidos, el más reciente primero
});

test('filtros: acceso, sin pago, vencidos y a revisar', () => {
  const lista = poblacion().map(analizar);
  const ids = f => A.filtrar(lista, { filtro: f }).map(a => a.id).sort();
  assert.deepEqual(ids('activos'), ['c1', 'h1', 'm1', 's1', 's2']);
  assert.deepEqual(ids('sin-pago'), ['p1', 'p2', 'p3', 'x1']);
  assert.deepEqual(ids('vencidos'), ['d1', 'v1', 'v2']);
  assert.ok(ids('revisar').includes('x1') && ids('revisar').includes('v1') && ids('revisar').includes('h1'));
  assert.equal(ids('todos').length, 12);
});

test('la búsqueda encuentra por nombre, correo o teléfono y se combina con el filtro', () => {
  const lista = [
    analizar(base('a1', { name: 'Ana López', email: 'ana@example.com', phone: '9511234567', planActivo: false })),
    analizar(base('b1', { name: 'Beto', email: 'beto@correo.com', planActivo: true, planVence: ts(5) }))
  ];
  assert.deepEqual(A.filtrar(lista, { texto: 'LÓPEZ' }).map(a => a.id), ['a1']);
  assert.deepEqual(A.filtrar(lista, { texto: 'correo.com' }).map(a => a.id), ['b1']);
  assert.deepEqual(A.filtrar(lista, { texto: '951123' }).map(a => a.id), ['a1']);
  assert.deepEqual(A.filtrar(lista, { texto: 'ana', filtro: 'activos' }), []);
});

// ── Seguridad: nada de lo que escribe un miembro se ejecuta ──
test('un nombre con código NO se inyecta en la página', () => {
  const malo = base('evil', { name: '<img src=x onerror=alert(1)>', email: '"><script>alert(2)</script>@x.com', planActivo: false });
  const html = A.filaHTML(analizar(malo), club);
  assert.ok(!html.includes('<img'), 'no debe haber una etiqueta img viva');
  assert.ok(!html.includes('<script'), 'no debe haber una etiqueta script viva');
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
});

test('comillas en el nombre no rompen los atributos de los botones', () => {
  const malo = base("it's", { name: `" onmouseover="alert(1)`, planActivo: false });
  const html = A.filaHTML(analizar(malo), club);
  assert.ok(!html.includes('onmouseover="alert'), 'no debe poder abrir un atributo nuevo');
  assert.ok(html.includes('data-uid="it&#39;s"'));
});

test('los avisos y etiquetas también salen escapados', () => {
  assert.equal(A.esc('<b>&"\''), '&lt;b&gt;&amp;&quot;&#39;');
  assert.equal(A.esc(null), '');
  assert.equal(A.esc(undefined), '');
});

// ── Botones y presentación ────────────────────────────────
test('quien tiene acceso ve Extender y Cancelar; quien no, solo Activar', () => {
  const activo = A.filaHTML(analizar(base('a', { planActivo: true, planVence: ts(5) })), club);
  assert.ok(activo.includes('Extender') && activo.includes('Cancelar'));
  const inactivo = A.filaHTML(analizar(base('b', { planActivo: false })), club);
  assert.ok(inactivo.includes('Activar') && !inactivo.includes('Cancelar'));
});

test('el botón Cancelar de un miembro Stripe avisa que no cancela en Stripe', () => {
  const stripe = A.filaHTML(analizar(base('s', { planActivo: true, planVence: ts(5), stripeSubscriptionId: 'sub_9' })), club);
  assert.ok(stripe.includes('Solo marca cancelado aquí'));
  const manual = A.filaHTML(analizar(base('m', { planActivo: true, planVence: ts(5), activadoManualmente: true })), club);
  assert.ok(!manual.includes('Solo marca cancelado aquí'));
});

test('las tarjetas y los chips muestran los números reales', () => {
  const r = A.resumen(poblacion().map(analizar));
  const tarjetas = A.tarjetasHTML(r);
  assert.ok(tarjetas.includes('Total real') && tarjetas.includes('Stripe 3 · Manual 1 · Heredado 1'));
  assert.ok(tarjetas.includes('1 sin fecha de registro'));
  const chips = A.chipsHTML('activos', r);
  assert.ok(chips.includes('Con acceso · 5') && chips.includes('Sin pago · 4') && chips.includes('Todos · 12'));
});

test('sin resultados muestra un mensaje y no una tabla vacía', () => {
  assert.ok(A.filasHTML([], club).includes('Sin resultados'));
});
