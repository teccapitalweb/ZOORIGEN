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
const F = require(path.join(RAIZ, 'assets', 'js', 'admin-filas.js'));
// todas las acciones de todos los menús «…» de un trozo de HTML
const accionesDe = h => [...h.matchAll(/<button type="button" class="ap-fc__menu"[^>]*>/g)].flatMap(m => F.accionesDeHTML(m[0]));
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
  // el título de las filas compactas tampoco parte palabras
  const titulo = c.match(/\.ap-fc__titulo \{[^}]*\}/)[0];
  assert.match(titulo, /overflow-wrap: normal/);
  assert.match(titulo, /word-break: normal/);
  assert.doesNotMatch(titulo, /anywhere|break-all|break-word/);
  assert.match(c, /\.ap-tabla \.ap-celda-miembro \{ min-width: 220px; \}/);
});

test('las tablas y listas NO pasan a tarjetas grandes: el contenedor esconde columnas secundarias y la fila sigue compacta', () => {
  assert.match(css, /\.ap-tabla-zona \{ container: tabla \/ inline-size;/);
  assert.match(css, /\.ap-fc-zona \{ container: fc \/ inline-size;/);
  assert.match(css, /@container tabla \(max-width: 899px\) \{\s*\.ap-tabla \.ap-col-2 \{ display: none; \}/);
  assert.match(css, /@container tabla \(max-width: 639px\) \{\s*\.ap-tabla \.ap-col-3 \{ display: none; \}/);
  assert.match(css, /@container fc \(max-width: 579px\)/);
  // ya no existe el paso a tarjetas con etiqueta por celda
  assert.doesNotMatch(css, /content: attr\(data-label\)/);
  assert.doesNotMatch(css, /@container tabla \(max-width: 1000px\)/);
  const medias = [...css.matchAll(/@media[^{]*\{([\s\S]*?)\n\}/g)].map(m => m[1]).join('\n');
  assert.doesNotMatch(medias, /\.ap-tabla (td|thead|tr)/);
  // altura de fila baja
  assert.match(css, /\.ap-fc \{ position: relative; min-height: 58px; \}/);
  assert.match(css, /\.ap-tabla td \{ padding: 8px 12px;/);
});

test('toda tabla del panel va dentro de .ap-tabla-zona y las columnas secundarias llevan ap-col-2 / ap-col-3', () => {
  for (const [nombre, texto] of [['admin-vistas.js', vistas], ['admin-marketing.js', leer('assets/js/admin-marketing.js')], ['admin-encuesta.js', leer('assets/js/admin-encuesta.js')]]) {
    const tablas = (texto.match(/<table class="ap-tabla/g) || []).length;
    const zonas = (texto.match(/ap-tabla-zona/g) || []).length;
    assert.ok(zonas >= 1 || tablas === 0, nombre + ' sin zona');
    assert.doesNotMatch(texto, /'<div class="ap-tabla-envoltura"><table/, nombre + ': tabla sin .ap-tabla-zona');
  }
  assert.match(vistas, /class="ap-col-2" data-label="Plan"/);
  assert.match(vistas, /class="ap-col-3 ap-col-num" data-label="Clases importadas"/);
  assert.match(leer('assets/js/admin-encuesta.js'), /class="ap-col-3" data-label="WhatsApp"/);
});

test('la fila de un miembro es compacta: nombre en el título, correo en la línea pequeña, vence en su columna y UN menú «…»', () => {
  assert.match(vistas, /<span class="ap-fc__correo">' \+ ico\('mail', \{ size: 12 \}\) \+ '<span class="ap-correo">' \+ esc\(m\.correo/);
  assert.match(vistas, /acciones: accionesMiembro\(m\)/);
  assert.match(vistas, /F\.lista\(mostrar\.map\(filaMiembro\)/);
  // ya no hay cinco botones por fila
  assert.doesNotMatch(vistas, /function botonesMiembro|<div class="ap-acciones">' \+ botonesMiembro/);
});

/* ───────── acciones de miembros ───────── */

test('Miembros: Ver ficha, Ampliar/Activar, Regalar, Cancelar y Eliminar en el menú «…»; las cuentas de administración solo tienen Ver ficha', () => {
  const trozo = vistas.slice(vistas.indexOf('function accionesMiembro'), vistas.indexOf('function filaMiembro'));
  for (const a of ['ficha', 'activar', 'regalar', 'cancelar', 'eliminar']) assert.match(trozo, new RegExp("a: '" + a + "'"));
  assert.match(trozo, /if \(m\.esAdmin\) return a;/);
  assert.match(trozo, /a: 'eliminar', p: true, sep: true/, 'Eliminar va al final, separado y en rojo');
  assert.match(vistas, /eliminados: function \(\) \{ abrirEliminados\(\); \}/);
  // los mismos nombres de acción que escucha la vista de Miembros
  for (const a of ['ficha', 'activar', 'cancelar', 'regalar', 'eliminar']) assert.match(vistas, new RegExp('\\b' + a + ': function \\(b\\) \\{ abrir'));
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

test('encuesta: el número completo no aparece en pantalla cuando el servidor entrega el detalle (acciones en el menú «…»)', () => {
  const estado = { encuesta: { ok: true, detalle: true, docs: [sesion('a1', { tieneContacto: true, contactoMascara: '••• ••• 0100', avisoAceptado: true })] }, preguntas: { ok: true, detalle: true, preguntas: [{ texto: 'axolote', veces: 2, tipo: 'animal', clave: 'axolote', atendida: false }] } };
  const h = A.vistaHTML(estado);
  assert.match(h, /••• ••• 0100/);
  assert.match(h, /data-enc="wa" data-id="a1"/);
  assert.doesNotMatch(h, /wa\.me/);
  const acc = accionesDe(h).map(a => a.d && a.d.enc).filter(Boolean);
  for (const a of ['atender', 'borrar', 'detalle', 'wa', 'pregunta-atender', 'pregunta-borrar', 'pregunta-detalle']) assert.ok(acc.includes(a), 'falta en el menú: ' + a);
  assert.match(h, /data-enc="pregunta-detalle" data-id="axolote"/);
  assert.doesNotMatch(h, /<button[^>]*class="ap-btn[^>]*data-enc="(atender|borrar|pregunta-atender|pregunta-borrar)"/, 'sin botones sueltos en la fila');
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
