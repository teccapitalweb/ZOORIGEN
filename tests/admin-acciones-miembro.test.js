'use strict';

// Panel de administración · Miembros: ventana «Acciones del miembro» (se abre al tocar a una persona) con Ver progreso, Ver ficha completa,
// Editar datos, Regalar 30 días, Activar o ampliar, Quitar acceso y Eliminar miembro. Se conserva todo lo que ya existía.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const P = require(path.join(RAIZ, 'assets', 'js', 'admin-panel.js'));
const I = require(path.join(RAIZ, 'assets', 'js', 'admin-iconos.js'));
const F = require(path.join(RAIZ, 'assets', 'js', 'admin-filas.js'));
const vistasJs = leer('assets/js/admin-vistas.js');
const css = leer('assets/css/admin-club.css');

function cargar() {
  const sandbox = { console, setTimeout, clearTimeout };
  sandbox.self = sandbox;
  sandbox.ZOO_ADMIN_PANEL = P; sandbox.ZOO_ICONOS = I; sandbox.ZOO_ADMIN_FILAS = F;
  sandbox.document = { createElement: () => ({}), body: {}, querySelector: () => null, addEventListener() {}, removeEventListener() {} };
  vm.createContext(sandbox);
  vm.runInContext(vistasJs, sandbox);
  return sandbox.ZOO_ADMIN_VISTAS;
}
const V = cargar();
const miembro = (extra = {}) => ({ uid: 'ana', nombre: 'Wendy <b>Hernández</b>', correo: 'wh@example.com', estado: 'activo', planTipo: 'mensual', conAcceso: true, esAdmin: false, stripeActiva: false, ...extra });

test('la ventana trae nombre, correo y estado «MIEMBRO ACTIVO · MENSUAL», y las opciones de la referencia en tarjetas', () => {
  const h = V.miembroUI.accionesHTML(miembro());
  assert.match(h, /Wendy &lt;b&gt;Hernández&lt;\/b&gt;/);
  assert.doesNotMatch(h, /<b>Hernández<\/b>/);
  assert.match(h, /wh@example\.com/);
  assert.match(h, /MIEMBRO ACTIVO · MENSUAL/);
  for (const [id, titulo, sub] of [
    ['progreso', 'Ver progreso', 'Avance por curso'], ['editar', 'Editar datos', 'Nombre, teléfono y especialidad'], ['regalar30', 'Regalar 30 días', 'Suma 30 días al acceso actual'],
    ['quitar', 'Quitar acceso', 'Pasa la cuenta a sin membresía'], ['eliminar', 'Eliminar miembro', 'Va a la papelera: se puede restaurar. Su avance se conserva']
  ]) assert.match(h, new RegExp(`data-modal="${id}"[\\s\\S]*?<strong>${titulo}</strong><small>${sub}</small>`), titulo);
  assert.match(h, /Las activaciones manuales no registran un cobro: sirven para accesos de cortesía o ajustes\. Los pagos reales los registra Stripe solo\./);
  assert.equal(/alintec|fisioteck/i.test(h), false);
});

test('se conserva lo que ya existía: ficha completa (pagos, motivos de rechazo, retos, cambios de orden) y activar o ampliar membresía', () => {
  const h = V.miembroUI.accionesHTML(miembro());
  assert.match(h, /data-modal="ficha"[\s\S]*?Ver ficha completa<\/strong><small>Plan, pagos, certificados, retos y cambios de orden/);
  assert.match(h, /data-modal="activar"[\s\S]*?Ampliar membresía/);
  assert.match(V.miembroUI.accionesHTML(miembro({ conAcceso: false, estado: 'sin-plan' })), /Activar membresía/);
  // el menú «…» de cada fila sigue con sus cinco acciones y la ficha completa sigue enlazada
  assert.match(vistasJs, /\{ t: 'Ver ficha', i: 'eye', a: 'ficha' \}/);
  assert.match(vistasJs, /Regalar 1 mes o 1 año/);
  assert.match(vistasJs, /\{ t: 'Cancelar membresía', i: 'ban', a: 'cancelar' \}/);
  assert.match(vistasJs, /\{ t: 'Eliminar miembro', i: 'trash-2', a: 'eliminar', p: true, sep: true \}/);
  assert.match(vistasJs, /abrirFicha\(b\.dataset\.uid\)/);
});

test('sin membresía no sale «Quitar acceso»; la cuenta de administración solo tiene progreso y ficha; el estado se escribe claro', () => {
  const sin = V.miembroUI.accionesHTML(miembro({ conAcceso: false, estado: 'sin-plan', planTipo: null }));
  assert.doesNotMatch(sin, /data-modal="quitar"/);
  assert.match(sin, /SIN MEMBRESÍA/);
  assert.match(sin, /data-modal="editar"/);
  const admin = V.miembroUI.accionesHTML(miembro({ esAdmin: true, estado: 'admin' }));
  assert.match(admin, /data-modal="progreso"/);
  assert.match(admin, /data-modal="ficha"/);
  for (const id of ['editar', 'regalar30', 'quitar', 'eliminar', 'activar']) assert.doesNotMatch(admin, new RegExp(`data-modal="${id}"`), id);
  assert.equal(V.miembroUI.estadoLinea(miembro({ estado: 'pago-pendiente' })), 'PAGO PENDIENTE · MENSUAL');
  assert.equal(V.miembroUI.estadoLinea(miembro({ planTipo: 'anual' })), 'MIEMBRO ACTIVO · ANUAL');
});

test('Ver progreso: lista de todos los cursos con N/M clases y barra, el total de clases completadas y los certificados; solo lectura', () => {
  const avance = [
    { cursoId: 'c2', curso: 'Rehabilitación <i>pulmonar</i>', clasesVistas: 3, clasesTotal: 5, completado: false },
    { cursoId: 'c4', curso: 'Manejo del dolor', clasesVistas: 3, clasesTotal: 3, completado: true },
    { cursoId: 'c1', curso: 'Vendaje neuromuscular', clasesVistas: 0, clasesTotal: 4, completado: false },
    { cursoId: 'c3', curso: 'Curso sin clases', clasesVistas: 0, clasesTotal: 0, completado: false }
  ];
  const h = V.miembroUI.avanceHTML(avance, [{ folio: 'ZOO-77' }]);
  assert.match(h, /<strong>6<\/strong> clases completadas de 12 · 1 certificado/);
  assert.match(h, /<b>3\/5<\/b>/);
  assert.match(h, /<b>3\/3 <svg/, 'el curso terminado lleva su palomita');
  assert.match(h, /<b>0\/4<\/b>/);
  assert.match(h, /role="progressbar"[^>]*aria-valuenow="3"[\s\S]*?style="width:60%"/);
  assert.match(h, /style="width:100%"/);
  assert.match(h, /Rehabilitación &lt;i&gt;pulmonar&lt;\/i&gt;/);
  assert.doesNotMatch(h, /<input|<button|<textarea/, 'sin edición: solo lectura');
  assert.match(V.miembroUI.avanceHTML([], []), /Todavía no hay cursos publicados/);
});

test('tocar el nombre de una persona abre la ventana; los demás lugares (retos, foro, ficha) siguen abriendo la ficha completa', () => {
  assert.match(vistasJs, /class="ap-mi__nombre" data-accion="acciones"/);
  assert.match(vistasJs, /acciones: function \(b\) \{ abrirAcciones\(b\.dataset\.uid\); \}/);
  assert.equal((vistasJs.match(/ficha: function \(b\) \{ abrirFicha\(b\.dataset\.uid\); \}/g) || []).length >= 3, true);
  assert.equal(typeof V.abrirAcciones, 'function');
});

test('cada acción llama a su ruta del servidor y las que tocan acceso o datos piden confirmación clara; ninguna toca Stripe', () => {
  assert.match(vistasJs, /\/datos', \{ method: 'POST'/);
  assert.match(vistasJs, /\/quitar-acceso', \{ method: 'POST', body: \{ confirmar: true \}/);
  assert.match(vistasJs, /\/regalar', \{ method: 'POST', body: \{ dias: 30/);
  // regalar 30: explica a dónde llega y avisa si sigue cobrándose en Stripe
  assert.match(vistasJs, /Le regalarás <strong>30 días<\/strong>/);
  assert.match(vistasJs, /Sigue cobrándose en Stripe/);
  // quitar acceso: casilla de confirmación obligatoria y bloqueo claro con Stripe activa
  assert.match(vistasJs, /Entiendo que pierde el acceso al instante\./);
  assert.match(vistasJs, /Primero cancélala en Stripe y después quita el acceso desde aquí/);
  assert.match(vistasJs, /id="apQuitarOk"' \+ \(m\.stripeActiva \? ' disabled' : ''\)/);
  // eliminar sigue pidiendo el correo y habla de la papelera de 30 días
  assert.match(vistasJs, /Durante 30 días puedes restaurarla desde «Eliminados»/);
  assert.equal(/stripe\.com|api\.stripe|sk_live|sk_test/i.test(vistasJs), false);
});

test('estilos: tarjetas de colores sólidos, sin emojis ni degradados, y la ventana cabe en celular', () => {
  const bloque = css.slice(css.indexOf('Acciones del miembro (ventana al tocar a una persona)'));
  assert.ok(bloque.length > 300);
  assert.doesNotMatch(bloque, /gradient/i);
  assert.ok(!/[\p{Extended_Pictographic}\u{FE0F}]/u.test(bloque));
  assert.match(bloque, /\.ap-modal--acciones \{ max-width: 520px; \}/);
  for (const m of bloque.matchAll(/font(?:-size)?:\s*(?:[0-9]{3}\s+)?([0-9.]+)(rem|px)/g)) assert.ok((m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1])) >= 12, m[0]);
  for (const n of ['chart-column', 'eye', 'pencil', 'gift', 'calendar-plus', 'ban', 'trash-2']) assert.ok(I.existe(n), n);
  const codigo = vistasJs.slice(vistasJs.indexOf('ACCIONES DEL MIEMBRO'), vistasJs.indexOf('async function abrirActivar'));
  assert.ok(!/[\p{Extended_Pictographic}\u{FE0F}]/u.test(codigo));
});
