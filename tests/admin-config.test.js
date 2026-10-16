'use strict';

// Configuración del panel: semáforo de servicios, calendario del servidor (solo lectura), versiones, enlaces, respaldo y CSV de miembros.
// Ejecutar: node --test tests/admin-config.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');
const C = require(path.join(RAIZ, 'assets', 'js', 'admin-config.js'));

const estado = (cambios = {}) => ({
  ok: true,
  servidor: { version: '2.0.0', node: 'v24.18.0', segundosActivo: 7200, iniciado: '2026-10-16T10:00:00Z', commit: 'abc1234', entorno: 'production' },
  servicios: {
    baseDeDatos: { ok: true, ms: 40 }, stripe: { configurado: true, modo: 'real' }, videos: { configurado: true, catalogoApi: true },
    correo: { configurado: true }, certificados: { configurado: true }, tareaNoticias: { activa: true }, ...(cambios.servicios || {})
  },
  variables: cambios.variables || [{ nombre: 'STRIPE_SECRET_KEY', para: 'Cobros', critica: true, definida: true }, { nombre: 'RESEND_API_KEY', para: 'Correos', critica: false, definida: false }]
});

test('servicios: todo configurado da semáforo en verde y cuenta los servicios en orden', () => {
  const l = C.servicios(estado(), { ok: true, modo: 'estricto' });
  assert.equal(C.nivelGeneral(l), 'ok');
  assert.ok(l.length >= 8);
  assert.ok(l.every(x => x.nivel === 'ok'));
  assert.ok(l.some(x => x.clave === 'calendario' && x.nivel === 'ok'));
});

test('servicios: Stripe de prueba y calendario en transición avisan; una variable crítica faltante marca error', () => {
  const l = C.servicios(estado({ servicios: { stripe: { configurado: true, modo: 'prueba' } }, variables: [{ nombre: 'FIREBASE_SERVICE_ACCOUNT', para: 'x', critica: true, definida: false }] }), { ok: true, modo: 'transicion' });
  assert.equal(l.find(x => x.clave === 'stripe').nivel, 'aviso');
  assert.match(l.find(x => x.clave === 'stripe').detalle, /no cobra de verdad/);
  assert.equal(l.find(x => x.clave === 'calendario').nivel, 'aviso');
  assert.equal(l.find(x => x.clave === 'variables').nivel, 'error');
  assert.match(l.find(x => x.clave === 'variables').detalle, /FIREBASE_SERVICE_ACCOUNT/);
  assert.equal(C.nivelGeneral(l), 'error');
});

test('servicios: sin Stripe, videos o certificados es error; sin correo o noticias, solo aviso', () => {
  const l = C.servicios(estado({ servicios: { stripe: { configurado: false }, videos: { configurado: false }, certificados: { configurado: false }, correo: { configurado: false }, tareaNoticias: { activa: false } } }), null);
  for (const k of ['stripe', 'videos', 'certificados']) assert.equal(l.find(x => x.clave === k).nivel, 'error', k);
  for (const k of ['correo', 'noticias']) assert.equal(l.find(x => x.clave === k).nivel, 'aviso', k);
  assert.ok(!l.some(x => x.clave === 'calendario'), 'sin dato del calendario no se inventa');
});

test('servicios: sin respuesta del estado no inventa nada', () => {
  assert.deepEqual(C.servicios(null, null), []);
  assert.match(C.semaforoHTML([]), /No se pudo leer el estado/);
});

test('semáforo: nombres, detalle y etiqueta de cada servicio; texto escapado; sin degradados ni emojis', () => {
  const l = C.servicios(estado({ servicios: { baseDeDatos: { ok: false, ms: 0, error: '<b>caída</b>' } } }), null);
  const h = C.semaforoHTML(l);
  assert.match(h, /ap-semaforos__fila/);
  assert.match(h, /ap-tono-error/);
  assert.match(h, /Falta algo/);
  assert.match(h, /&lt;b&gt;caída/);
  assert.doesNotMatch(h, /<b>caída|gradient|[\p{Extended_Pictographic}]/u);
  assert.match(h, /en orden/);
});

test('reporte para pegar en un mensaje: estados, versión y nada de claves', () => {
  const txt = C.reporteTexto(C.servicios(estado(), null), estado(), '2026-10-16T18:00:00Z');
  assert.match(txt, /^Estado de servicios · Zoorigen · 16 oct 2026/);
  assert.match(txt, /\[EN ORDEN\] Servidor/);
  assert.match(txt, /Servidor 2\.0\.0 · publicación abc1234 · entorno production/);
  assert.doesNotMatch(txt, /sk_|whsec_|Bearer/);
});

test('calendario del servidor: explica el modo, la fecha de activación y que solo se cambia en Railway', () => {
  const t = C.calendarioHTML({ ok: true, modo: 'transicion', nuevoDesde: '2026-10-14T20:00:00Z', rechazosSimulados: 3, rechazos: 0, ultimoSimulado: '2026-10-15T10:00:00Z' });
  assert.match(t, /Modo transición/);
  assert.match(t, /solo anota/);
  assert.match(t, /14 oct 2026/);
  assert.match(t, /Habría rechazado desde el arranque<\/dt><dd>3/);
  assert.match(t, /CALENDARIO_MODO/);
  assert.match(t, /CALENDARIO_NUEVO_DESDE/);
  const e = C.calendarioHTML({ ok: true, modo: 'estricto', nuevoDesde: null, rechazos: 2, rechazosSimulados: 0, ultimoSimulado: null });
  assert.match(e, /Modo estricto/);
  assert.match(e, /Rechazos desde el arranque<\/dt><dd>2/);
  assert.match(e, /Todavía no se fija/);
  assert.match(C.calendarioHTML(null), /No se pudo leer el calendario/);
  assert.doesNotMatch(t + e, /<button|data-accion/, 'es solo lectura: ningún botón para cambiarlo');
});

test('versiones: servidor, publicación, entorno, Node y versión del panel', () => {
  const h = C.versionesHTML(estado(), '20261201-graficas');
  for (const t of ['2.0.0', 'abc1234', 'production', 'v24.18.0', '20261201-graficas']) assert.match(h, new RegExp(t));
  assert.match(C.versionesHTML(null, null), /Sin dato/);
});

test('enlaces útiles: los externos abren en otra pestaña sin pasar el origen y ninguno lleva claves', () => {
  const h = C.enlacesHTML();
  assert.equal((h.match(/target="_blank" rel="noopener noreferrer"/g) || []).length, C.ENLACES.filter(e => !e.interno).length);
  assert.match(h, /dashboard\.stripe\.com/);
  assert.match(h, /console\.firebase\.google\.com/);
  assert.doesNotMatch(h, /key=|token=|secret|sk_live|pk_live/i);
  for (const e of C.ENLACES) assert.match(e.href, /^(https:\/\/|\.\.\/|verificar\.html)/);
});

test('respaldo recomendado: cuatro pasos, sin prometer copias automáticas que no existen', () => {
  const h = C.respaldoHTML();
  assert.equal(C.RESPALDOS.length, 4);
  assert.match(h, /Firebase/);
  assert.match(h, /Bunny/);
  assert.match(h, /GitHub/);
  assert.match(h, /gestor de contraseñas/);
});

test('CSV de miembros: columnas seguras, fechas cortas y protección contra fórmulas', () => {
  const csv = C.csvMiembros([
    { nombre: '=cmd()', correo: 'a@x.test', estado: 'activo', planTipo: 'mensual', origen: 'stripe', registro: '2026-09-01T12:00:00Z', vence: '2026-11-01T12:00:00Z', ultimoPago: '2026-10-01T12:00:00Z' },
    { nombre: 'Beto, Jr.', correo: 'b@x.test', estado: 'sin-plan', planTipo: null, origen: 'ninguno', registro: null, vence: null, ultimoPago: null }
  ]);
  const filas = csv.split('\r\n');
  assert.equal(filas[0], 'nombre,correo,estado,plan,origen_del_acceso,registro,vence,ultimo_pago');
  assert.equal(filas[1], "'=cmd(),a@x.test,Activo,mensual,Stripe,2026-09-01,2026-11-01,2026-10-01");
  assert.match(filas[2], /^"Beto, Jr\.",b@x\.test,Sin membresía,/);
  assert.doesNotMatch(csv, /telefono|stripe_|cus_|sub_/i);
});

test('exportaciones: botón de miembros y atajos a Métricas y Certificados', () => {
  const h = C.exportacionesHTML(65);
  assert.match(h, /data-accion="csv-miembros"/);
  assert.match(h, /65 cuentas/);
  assert.match(h, /href="#\/metricas"/);
  assert.match(h, /href="#\/certificados"/);
});

test('Configuración usa los endpoints que ya existen y no cambia el calendario, los precios ni las claves', () => {
  const v = leer('assets/js/admin-vistas.js');
  const sec = v.slice(v.indexOf('async function configuracion()'), v.indexOf('/* ───────── ESTADO DEL SISTEMA'));
  assert.match(sec, /\/api\/admin\/estado/);
  assert.match(sec, /\/api\/admin\/calendario/);
  assert.doesNotMatch(sec, /method: 'POST', body: \{ (calendario|modo|precio)/i);
  assert.match(sec, /Qué no se cambia desde aquí/);
  assert.match(sec, /copiar-reporte/);
  const html = leer('pages/admin-club.html');
  assert.ok(html.indexOf('admin-config.js') > 0 && html.indexOf('admin-config.js') < html.indexOf('admin-vistas.js'));
});

test('los estilos de Configuración no usan degradados', () => {
  const css = leer('assets/css/admin-club.css');
  const b = css.slice(css.indexOf('Configuración: semáforo'));
  assert.ok(b.length > 200);
  assert.doesNotMatch(b, /gradient/i);
});
