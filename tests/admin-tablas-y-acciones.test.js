'use strict';

// Tablas del panel (nunca parten palabras letra por letra), acciones de miembros (regalar, eliminar, restaurar),
// Configuración y sección Encuesta ampliada. Ejecutar: node --test tests/admin-tablas-y-acciones.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const css = leer('assets/css/admin-club.css');
const vistas = leer('assets/js/admin-vistas.js');
const html = leer('pages/admin-club.html');
const A = require(path.join(RAIZ, 'assets', 'js', 'admin-encuesta.js'));
const sinComentarios = t => t.replace(/\/\*[\s\S]*?\*\//g, '');

/* ───────── tablas ───────── */

test('los nombres nunca se parten letra por letra: sin overflow-wrap: anywhere en nombres, solo en correos', () => {
  const c = sinComentarios(css);
  const nombre = c.match(/\.ap-persona__txt strong \{[^}]*\}/)[0];
  assert.match(nombre, /overflow-wrap: normal/);
  assert.match(nombre, /word-break: normal/);
  assert.match(nombre, /-webkit-line-clamp: 2/);
  assert.doesNotMatch(nombre, /anywhere|break-all|break-word/);
  assert.match(c, /\.ap-persona__txt \.ap-correo \{ overflow-wrap: anywhere;/);
  // la columna del miembro tiene ancho mínimo (así la tabla no la estrecha)
  assert.match(c, /\.ap-tabla \.ap-celda-miembro \{ min-width: 250px; \}/);
  assert.match(c, /\.ap-celda-acciones \{[^}]*min-width: 290px/);
  assert.match(c, /\.ap-acciones \{ display: flex; flex-wrap: wrap;/);
  assert.match(c, /\.ap-acciones \.ap-btn \{ white-space: nowrap; \}/);
});

test('el paso a tarjetas lo decide el contenedor de la tabla, no la ventana', () => {
  assert.match(css, /\.ap-tabla-zona \{ container: tabla \/ inline-size;/);
  assert.match(css, /@container tabla \(max-width: 1000px\)/);
  // dentro de @media no queda ninguna regla de tarjetas de tabla
  const medias = [...css.matchAll(/@media[^{]*\{([\s\S]*?)\n\}/g)].map(m => m[1]).join('\n');
  assert.doesNotMatch(medias, /\.ap-tabla (td|thead|tr)/);
});

test('toda tabla del panel va dentro de .ap-tabla-zona y las celdas llevan data-label', () => {
  for (const [nombre, texto] of [['admin-vistas.js', vistas], ['admin-marketing.js', leer('assets/js/admin-marketing.js')], ['admin-encuesta.js', leer('assets/js/admin-encuesta.js')]]) {
    const tablas = (texto.match(/<table class="ap-tabla/g) || []).length;
    const zonas = (texto.match(/ap-tabla-zona/g) || []).length;
    assert.ok(zonas >= 1 || tablas === 0, nombre + ' sin zona');
    assert.doesNotMatch(texto, /'<div class="ap-tabla-envoltura"><table/, nombre + ': tabla sin .ap-tabla-zona');
  }
  // las filas de miembros llevan etiqueta en cada celda de datos
  assert.match(vistas, /data-label="Estado"/);
  assert.match(vistas, /data-label="Vence"/);
  assert.match(vistas, /data-label="Registro"/);
});

test('las filas de miembros ponen el correo en .ap-correo y envuelven los botones en .ap-acciones', () => {
  assert.match(vistas, /<span class="ap-correo">' \+ esc\(m\.correo/);
  assert.match(vistas, /<div class="ap-acciones">' \+ botonesMiembro\(m\)/);
});

/* ───────── acciones de miembros ───────── */

test('Miembros: Ver ficha, Ampliar/Activar, Regalar, Cancelar y Eliminar; las cuentas de administración solo tienen Ver ficha', () => {
  const trozo = vistas.slice(vistas.indexOf('function botonesMiembro'), vistas.indexOf('function filaMiembro'));
  for (const a of ['ficha', 'activar', 'regalar', 'cancelar', 'eliminar']) assert.match(trozo, new RegExp(`btn\\('${a}'`));
  assert.match(trozo, /if \(m\.esAdmin\) return html;/);
  assert.match(vistas, /eliminados: function \(\) \{ abrirEliminados\(\); \}/);
});

test('Regalar: 1 mes (30) o 1 año (365), nota opcional, aviso de Stripe y POST /regalar', () => {
  const t = vistas.slice(vistas.indexOf('async function abrirRegalar'), vistas.indexOf('async function abrirEliminar'));
  assert.match(t, /data-opcion="30"/);
  assert.match(t, /data-opcion="365"/);
  assert.match(t, /id="apRegaloNota"/);
  assert.match(t, /m\.stripeActiva \?/);
  assert.match(t, /Sigue cobrándose en Stripe/);
  assert.match(t, /'\/regalar', \{ method: 'POST', body: \{ dias: dias, nota:/);
});

test('Eliminar: advertencia clara, correo escrito obligatorio, casilla si hay Stripe y DELETE con confirmarCorreo', () => {
  const t = vistas.slice(vistas.indexOf('async function abrirEliminar'), vistas.indexOf('function filaEliminado'));
  assert.match(t, /Esto quita su cuenta del Club/);
  assert.match(t, /Se conservan sus certificados y el avance de sus cursos/);
  assert.match(t, /Durante 30 días puedes restaurarla/);
  assert.match(t, /boton\.disabled = true;/);
  assert.match(t, /campo\.value\.trim\(\)\.toLowerCase\(\) === objetivo && \(!casilla \|\| casilla\.checked\)/);
  assert.match(t, /method: 'DELETE', body: \{ confirmarCorreo:.*confirmarStripe:/);
  assert.match(t, /Eliminar la cuenta NO detiene los cobros/);
  // peligro: botón con el tono de peligro, no el primario
  assert.match(t, /tipo: 'peligro'/);
});

test('Eliminados recientemente: lista y restaura (POST /restaurar) con confirmación', () => {
  assert.match(vistas, /ctx\.api\('\/api\/admin\/eliminados'\)/);
  assert.match(vistas, /'\/api\/admin\/eliminados\/' \+ encodeURIComponent\(uid\) \+ '\/restaurar'/);
  assert.match(vistas, /Olvidé mi contraseña/);
  assert.match(vistas, /aceptar: 'Sí, restaurar'/);
});

test('la ficha del miembro ofrece Regalar tiempo y Eliminar (salvo cuentas de administración)', () => {
  assert.match(vistas, /if \(!m\.esAdmin\) \{\s*botones\.push\(\{ id: 'eliminar'/);
  assert.match(vistas, /id: 'regalar', texto: 'Regalar tiempo'/);
});

/* ───────── secciones y Configuración ───────── */

test('Herramientas (Próximamente) ya no existe y tampoco los bloques «Próximamente» sin servidor detrás', () => {
  assert.doesNotMatch(vistas, /function herramientas|bloqueProntoHTML|Próximamente<\/span>/);
  assert.doesNotMatch(html, /data-sec="herramientas"/);
  for (const t of ['metricas', 'pruebas', 'encuesta']) assert.match(html, new RegExp(`data-sec="${t}"`));
});

test('Configuración: interruptores en el servidor, aviso global, administradores y servicios; nada de secretos', () => {
  const t = vistas.slice(vistas.indexOf('async function configuracion'), vistas.indexOf('/* ───────── ESTADO DEL SISTEMA'));
  assert.match(t, /ctx\.api\('\/api\/admin\/config'\)/);
  assert.match(t, /'\/api\/admin\/config', \{ method: 'POST', body: cuerpo \}/);
  assert.match(t, /contadorVisitas: true/);
  assert.match(t, /PARRAFO_PRIVACIDAD/);
  assert.match(vistas, /no usa cookies, no guarda tu dirección IP/);
  assert.match(t, /El Club aún no lo muestra/);
  assert.doesNotMatch(t, /sk_live|sk_test|whsec_|apiKey/);
  // encender el contador pide confirmar que ya se agregó el párrafo al aviso de privacidad
  assert.match(t, /Ya lo agregué, encender/);
});

/* ───────── Encuesta ampliada ───────── */

const sesion = (id, extra) => Object.assign({ id, sessionId: 's-' + id, respuestas: { p1: 'Estudiante', p2: 'Trabajar en campo', urgencia: 'Lo antes posible' }, completada: true, creado: new Date(Date.UTC(2026, 9, 10)).toISOString() }, extra);

test('encuesta: ramas por perfil, filas, filtros y CSV con WhatsApp enmascarado', () => {
  const r = A.calcular([
    sesion('a1', { tieneContacto: true, contactoMascara: '••• ••• 0100', avisoAceptado: true }),
    sesion('a2', { completada: false, respuestas: { p1: 'Estudiante', meta: 'x' } }),
    sesion('b1', { respuestas: { p1: 'Consultor ambiental', p2: 'Monitoreo' } }),
    sesion('c1', { atendida: true, tieneContacto: true, contactoMascara: '••• ••• 0112' })
  ]);
  const est = r.ramas.find(x => x.perfil === 'Estudiante');
  assert.equal(est.total, 3);
  assert.equal(est.completas, 2);
  assert.equal(est.conWhatsapp, 2);
  assert.equal(est.reto.valor, 'Trabajar en campo');
  assert.equal(r.ramas[0].perfil, 'Estudiante');
  assert.equal(r.filas.length, 4);
  assert.equal(A.filtrarRespuestas(r.filas, 'por-atender').length, 1);
  assert.equal(A.filtrarRespuestas(r.filas, 'atendidas').length, 1);
  assert.equal(A.filtrarRespuestas(r.filas, 'incompletas').length, 1);
  assert.equal(r.porAtender, 1);
  const csv = A.csvRespuestas(r.filas);
  assert.match(csv, /WhatsApp \(enmascarado\)/);
  assert.match(csv, /••• ••• 0100/);
  assert.doesNotMatch(csv, /\d{10}/);
  assert.equal(csv.split('\r\n').length, 5);
  assert.equal(A.enmascarar('5215512345678'), '••• ••• 5678');
  assert.equal(A.enmascarar('123'), '');
});

test('encuesta: el número completo no aparece en pantalla cuando el servidor entrega el detalle', () => {
  const estado = { encuesta: { ok: true, detalle: true, docs: [sesion('a1', { tieneContacto: true, contactoMascara: '••• ••• 0100', avisoAceptado: true })] }, preguntas: { ok: true, detalle: true, preguntas: [{ texto: 'axolote', veces: 2, tipo: 'animal', clave: 'axolote', atendida: false }] } };
  const h = A.vistaHTML(estado);
  assert.match(h, /••• ••• 0100/);
  assert.match(h, /data-enc="wa" data-id="a1"/);
  assert.doesNotMatch(h, /wa\.me/);
  assert.match(h, /data-enc="atender"/);
  assert.match(h, /data-enc="borrar"/);
  assert.match(h, /data-enc="pregunta-atender" data-id="axolote"/);
  assert.match(h, /Resumen por rama del flujo/);
  assert.match(h, /Descargar lista \(CSV\)/);
});

test('encuesta con el servidor anterior (sin detalle): sin acciones, y el teléfono sigue oculto en pantalla', () => {
  const estado = { encuesta: { ok: true, docs: [{ sessionId: 'x', respuestas: { p1: 'Estudiante', urgencia: 'Lo antes posible' }, completada: true, creado: '2026-10-10T00:00:00Z', contacto: '5215512345678', avisoAceptado: true }] }, preguntas: { ok: false, error: 'x' } };
  const h = A.vistaHTML(estado);
  assert.doesNotMatch(h, /data-enc="atender"|data-enc="borrar"/);
  assert.match(h, /••• ••• 5678/);
  assert.doesNotMatch(h, />\+?5215512345678</);
  assert.match(h, /hace falta publicar el servidor nuevo/);
});

test('encuesta.cargar con detalle:true pide primero las rutas nuevas y cae a las anteriores con 404', async () => {
  const llamadas = [];
  const api = async ruta => {
    llamadas.push(ruta);
    if (/detalle/.test(ruta)) throw Object.assign(new Error('no existe'), { status: 404 });
    return /sin-respuesta/.test(ruta) ? { preguntas: [] } : { docs: [] };
  };
  const r = await A.cargar(api, { detalle: true });
  assert.equal(r.encuesta.detalle, false);
  assert.equal(llamadas.length, 4);
  assert.match(llamadas[0], /^\/api\/admin\/encuesta\/detalle\?limite=1000/);
  const ok = await A.cargar(async ruta => (/sin-respuesta/.test(ruta) ? { preguntas: [] } : { docs: [] }), { detalle: true });
  assert.equal(ok.encuesta.detalle, true);
});

test('la sección Encuesta usa las rutas del servidor y monta las acciones', () => {
  assert.match(html, /A\.cargar\(api, \{ detalle: true \}\)/);
  assert.match(html, /A\.montar\(v, estado, \{ api, toast, modal: V\.modal, confirmar: V\.confirmar, recargar: loadEncuesta \}\)/);
  const js = leer('assets/js/admin-encuesta.js');
  for (const r of ['/api/admin/encuesta/atender', '/api/admin/encuesta/borrar', '/api/admin/chatbot/sin-respuesta/atender', '/api/admin/chatbot/sin-respuesta/borrar', '/contacto']) {
    assert.ok(js.includes(r), r);
  }
});
