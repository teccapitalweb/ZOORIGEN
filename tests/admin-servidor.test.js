'use strict';

// Configuración del panel: las cuatro tarjetas (precios, contacto, estado de servicios e historial del servidor), el texto en español de
// los errores del servidor y la lista de miembros en CSV. Ejecutar: node --test tests/admin-servidor.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');
const S = require(path.join(RAIZ, 'assets', 'js', 'admin-servidor.js'));

const AHORA = new Date().toISOString();
const hace = h => new Date(Date.now() - h * 3600000).toISOString();
const SUB_COMPLETO = 'sub_1TXyzAbCdEfGhIjKlMn4242';

const precios = (cambios = {}) => ({
  ok: true, soloLectura: true, modo: 'real',
  planes: [
    { plan: 'mensual', monto: 199, moneda: 'mxn', cobro: 'cada mes', origen: 'stripe', activo: true, idCorto: '…RmDF' },
    { plan: 'anual', monto: 1899, moneda: 'mxn', cobro: 'cada año', origen: 'lista', activo: null, idCorto: '…KmFq' }
  ], ...cambios
});
const servicios = (cambios = {}) => ({
  ok: true, generado: AHORA, nivel: 'aviso', resumen: 'Hay avisos por revisar',
  comprobaciones: [
    { clave: 'servidor', nombre: 'Servidor', nivel: 'ok', detalle: 'Encendido desde hace 3 h' },
    { clave: 'base', nombre: 'Base de datos', nivel: 'ok', detalle: 'Responde en 41 ms' },
    { clave: 'stripe', nombre: 'Cobros con Stripe', nivel: 'ok', detalle: 'Conectado en modo real' },
    { clave: 'avisos', nombre: 'Avisos de pago de Stripe', nivel: 'ok', detalle: 'Último aviso de Zoorigen: hace 2 h' },
    { clave: 'pagos', nombre: 'Pagos contra membresías activas', nivel: 'aviso', detalle: '1 de 12 no coinciden', casos: [{ uid: 'u1', nombre: 'Ana Pérez', motivo: 'Stripe la da por activa y no tiene acceso' }] },
    { clave: 'correo', nombre: 'Correos (Resend)', nivel: 'ok', detalle: 'Envío configurado' },
    { clave: 'videos', nombre: 'Videos (Bunny)', nivel: 'ok', detalle: 'Reproducción y catálogo' },
    { clave: 'certificados', nombre: 'Firma de certificados', nivel: 'ok', detalle: 'Lista: se pueden emitir y verificar certificados' }
  ], ...cambios
});
const historial = (cambios = {}) => ({
  ok: true, disponible: true, dias: 30, arranque: hace(5), segundosActivo: 5 * 3600,
  resumen: { reinicios: 4, reiniciosInesperados: 1, caidas: 1, erroresInternos: 3, erroresDistintos: 2, porRevisar: 2, stripeIgnorados: 14 },
  eventos: [
    { id: 'e1', tipo: 'arranque', en: hace(5), normal: true, motivo: 'publicacion', version: '2.0.0', caida: false, duracionSeg: null },
    { id: 'e2', tipo: 'arranque', en: hace(30), normal: false, motivo: 'inesperado', version: '2.0.0', caida: true, duracionSeg: 1500 },
    { id: 'e3', tipo: 'arranque', en: hace(90), normal: true, motivo: 'primer-arranque', version: '1.9.0', caida: false, duracionSeg: null }
  ],
  errores: [
    { clave: 'a', nivel: 'revisar', cuenta: 6, ejemplo: 'Aviso de Stripe por revisar: No se encontró miembro para la suscripción sub_…4242', primeraVez: hace(80), ultimaVez: hace(2) },
    { clave: 'b', nivel: 'alta', cuenta: 2, ejemplo: '[ALTA PRIORIDAD] Error procesando evento de Zoorigen: Error: No se encontró miembro para cancelar sub_…9876', primeraVez: hace(40), ultimaVez: hace(20) },
    { clave: 'c', nivel: 'error', cuenta: 1, ejemplo: 'TypeError: algo raro con cus_…1111', primeraVez: hace(10), ultimaVez: hace(10) }
  ],
  stripeIgnorados: [{ dia: '2026-10-20', cuenta: 9, tipos: { 'invoice.payment_failed': 5, 'customer.subscription.updated': 4 } }],
  stripe: { ultimoEn: hace(1), ultimoTipo: 'invoice.paid', ultimoZoorigenEn: hace(2), ultimoZoorigenTipo: 'invoice.paid' }, ...cambios
});

/* ───────────────────────── Errores en español ───────────────────────── */

test('acortarIds: nunca queda un id de Stripe completo, solo los últimos 4 caracteres', () => {
  const t = S.acortarIds(`No se encontró miembro para la suscripción ${SUB_COMPLETO} y el cliente cus_Qwerty123456 (price_1TRcJnA7If2CqXs9dMBGRmDF)`);
  assert.ok(!t.includes(SUB_COMPLETO) && !t.includes('Qwerty123456') && !t.includes('1TRcJnA7If2CqXs9'));
  assert.match(t, /sub_…4242/);
  assert.match(t, /cus_…3456/);
  assert.match(t, /price_…dMBGRmDF|price_…RmDF/);
  assert.equal(S.acortarIds('sub_…4242'), 'sub_…4242', 'lo ya acortado queda igual');
});

test('traducirError: cada aviso conocido del webhook trae «qué significa» y «qué hacer», distintos si es de Zoorigen o por revisar', () => {
  const casos = [
    ['No se encontró miembro para la suscripción ' + SUB_COMPLETO, 'suscripción que no está ligada'],
    ['No se encontró miembro para el pago fallido ' + SUB_COMPLETO, 'pago fallido'],
    ['No se encontró miembro para cancelar ' + SUB_COMPLETO, 'cancelación'],
    ['Checkout sin firebaseUID o subscriptionId', 'compra terminó en Stripe']
  ];
  for (const [mensaje, titulo] of casos) {
    const alta = S.traducirError({ nivel: 'alta', ejemplo: '[ALTA PRIORIDAD] Error procesando evento de Zoorigen: Error: ' + mensaje, cuenta: 2, ultimaVez: hace(1) });
    const rev = S.traducirError({ nivel: 'revisar', ejemplo: 'Aviso de Stripe por revisar: ' + mensaje, cuenta: 5, ultimaVez: hace(1) });
    assert.ok(alta.desdeStripe && rev.desdeStripe);
    assert.match(alta.titulo, new RegExp(titulo));
    assert.equal(alta.nivelTexto, 'Alta prioridad');
    assert.equal(rev.nivelTexto, 'Por revisar');
    assert.notEqual(alta.significa, rev.significa);
    assert.ok(alta.hacer.length > 30 && rev.hacer.length > 30);
    for (const x of [alta, rev]) {
      assert.ok(!x.mensaje.includes(SUB_COMPLETO), 'el mensaje técnico no trae el id completo');
      assert.ok(!/ALTA PRIORIDAD|por revisar:/i.test(x.mensaje), 'sin los prefijos internos');
    }
  }
  const sub = S.traducirError({ nivel: 'alta', ejemplo: 'No se encontró miembro para la suscripción ' + SUB_COMPLETO });
  assert.equal(sub.referencia, 'sub_…4242');
});

test('traducirError: un error desconocido se explica con calma y no se pierde el mensaje', () => {
  const x = S.traducirError({ nivel: 'error', ejemplo: 'TypeError: algo raro con cus_Qwerty123456', cuenta: 1 });
  assert.equal(x.desdeStripe, false);
  assert.equal(x.titulo, 'Error interno del servidor');
  assert.match(x.hacer, /Copiar reporte/);
  assert.match(x.mensaje, /cus_…3456/);
});

test('ordenarErrores: alta prioridad primero, luego errores y al final lo por revisar; dentro de cada uno, lo más reciente', () => {
  const l = S.ordenarErrores(historial().errores);
  assert.deepEqual(l.map(x => x.nivel), ['alta', 'error', 'revisar']);
  const dos = S.ordenarErrores([{ nivel: 'error', ejemplo: 'a', ultimaVez: hace(5) }, { nivel: 'error', ejemplo: 'b', ultimaVez: hace(1) }]);
  assert.deepEqual(dos.map(x => x.mensaje), ['b', 'a']);
  assert.deepEqual(S.ordenarErrores(null), []);
});

/* ───────────────────────── Tarjeta 1 · Precios ───────────────────────── */

test('precios: muestra los dos planes vigentes, solo lectura, con su porqué y sin ids ni claves de Stripe', () => {
  const h = S.preciosHTML(precios());
  assert.match(h, /Plan mensual/);
  assert.match(h, /\$199 MXN/);
  assert.match(h, /\$1,899 MXN/);
  assert.match(h, /Leído de Stripe/);
  assert.match(h, /Precio de lista/);
  assert.match(h, /Solo lectura/);
  assert.match(h, /Por qué no se editan desde aquí/);
  assert.match(h, /suscripciones nuevas/);
  assert.doesNotMatch(h, /price_[A-Za-z0-9]{8,}|pk_(live|test)|sk_(live|test)|<input|data-accion="guardar-precio/i);
  assert.match(S.preciosHTML(precios({ modo: 'prueba' })), /modo de prueba/);
  assert.match(S.preciosHTML(null), /No se pudieron leer los precios/);
});

/* ───────────────────────── Tarjeta 2 · Contacto ───────────────────────── */

test('contacto: formulario con WhatsApp, Instagram y correo, guardar y volver a los datos de siempre; todo escapado', () => {
  const h = S.contactoHTML({ contacto: { whatsapp: '+52 1 236 111 3237', instagram: 'https://www.instagram.com/zoorigen.mexico1/', correo: 'zooorigen@gmail.com', personalizado: false, actualizado: null }, porDefecto: { whatsapp: '+52 1 236 111 3237' } });
  for (const id of ['apCtWhatsapp', 'apCtInstagram', 'apCtCorreo']) assert.ok(h.includes('id="' + id + '"'), id);
  assert.match(h, /data-accion="guardar-contacto"/);
  assert.match(h, /data-accion="restablecer-contacto"/);
  assert.match(h, /Se usan los datos de siempre/);
  assert.match(h, /La portada no cambia/);
  const malo = S.contactoHTML({ contacto: { whatsapp: '"><img src=x onerror=alert(1)>', instagram: '', correo: '', personalizado: true }, porDefecto: {} });
  assert.ok(!malo.includes('<img src=x'), 'HTML sin escapar');
  assert.match(malo, /Datos guardados desde el panel/);
});

/* ───────────────────────── Tarjeta 3 · Estado de servicios ───────────────────────── */

test('servicios: semáforo con cuántos están en orden, los casos por revisar y un estado vacío si no se pudo revisar', () => {
  const h = S.serviciosHTML(servicios());
  assert.match(h, /Hay avisos por revisar/);
  assert.match(h, /7 de 8 en orden/);
  assert.match(h, /Pagos contra membresías activas/);
  assert.match(h, /Ana Pérez/);
  assert.equal((h.match(/class="ap-semaforo ap-tono-/g) || []).length, 8);
  assert.match(S.serviciosHTML(null), /No se pudo revisar el estado/);
  assert.equal(S.nivelGeneral([{ nivel: 'ok' }, { nivel: 'error' }, { nivel: 'aviso' }]), 'error');
});

test('reporte de servicios: texto plano para pegar, sin claves ni ids completos de Stripe', () => {
  const s = servicios();
  s.comprobaciones[3].detalle = 'Último aviso de la suscripción ' + SUB_COMPLETO;
  const t = S.reporteServicios(s, AHORA);
  assert.match(t, /^Estado de servicios · Zoorigen/);
  assert.match(t, /\[EN ORDEN\] Servidor: /);
  assert.match(t, /\[REVISAR\] Pagos contra membresías activas/);
  assert.ok(!t.includes(SUB_COMPLETO));
  assert.doesNotMatch(t, /sk_(live|test)|whsec_|pk_live|@/);
});

/* ───────────────────────── Tarjeta 4 · Historial ───────────────────────── */

test('historial: cuatro cifras, «Solo problemas» por defecto y «Marcarlos como publicaciones normales» solo si hay inesperados', () => {
  const h = S.historialHTML(historial());
  for (const t of ['Encendido ininterrumpido', 'Caídas en 30 días', 'Reinicios inesperados', 'Errores internos']) assert.ok(h.includes(t), t);
  assert.match(h, /data-historial-modo="problemas" aria-pressed="true"/);
  assert.match(h, /data-historial-modo="todo" aria-pressed="false"/);
  assert.match(h, /Marcarlos como publicaciones normales/);
  assert.match(h, /Caída del servidor/);
  assert.match(h, /Estuvo sin servicio unos 25 min/);
  assert.ok(!h.includes('Publicación o mantenimiento (normal)'), 'las publicaciones normales no salen en «Solo problemas»');
  assert.ok(!h.includes('Avisos de Stripe de otras marcas (ignorados)'));
  assert.match(S.historialHTML(historial({ resumen: { reinicios: 3, reiniciosInesperados: 0, caidas: 0, erroresInternos: 0, erroresDistintos: 0, porRevisar: 0, stripeIgnorados: 0 }, errores: [], eventos: [] })), /Sin reinicios inesperados/);
  assert.doesNotMatch(S.historialHTML(historial({ resumen: { reinicios: 3, reiniciosInesperados: 0, caidas: 0, erroresInternos: 0, erroresDistintos: 0, porRevisar: 0, stripeIgnorados: 0 }, errores: [], eventos: [] })), /Marcarlos como publicaciones normales/);
});

test('historial: «Todo» suma las publicaciones normales y los avisos de otras marcas ignorados', () => {
  const h = S.historialHTML(historial(), { modo: 'todo' });
  assert.match(h, /data-historial-modo="todo" aria-pressed="true"/);
  assert.match(h, /Publicación o mantenimiento \(normal\)/);
  assert.match(h, /Primer arranque registrado/);
  assert.match(h, /Avisos de Stripe de otras marcas \(ignorados\)/);
  assert.match(h, /invoice\.payment_failed \(5\)/);
});

test('historial: errores agrupados con cuántas veces y la última vez, «Qué significa» y «Qué hacer», sin ids completos', () => {
  const h = S.historialHTML(historial());
  assert.equal((h.match(/class="ap-incidente /g) || []).length, 3);
  assert.equal((h.match(/Qué significa/g) || []).length, 3);
  assert.equal((h.match(/Qué hacer/g) || []).length, 3);
  assert.match(h, /6 veces/);
  assert.match(h, /1 vez/);
  assert.match(h, /Alta prioridad/);
  assert.match(h, /Por revisar/);
  assert.doesNotMatch(h, /sub_[A-Za-z0-9]{8,}|cus_[A-Za-z0-9]{8,}/);
});

test('historial: explica que la cuenta de Stripe es compartida y que los avisos de otras marcas se ignoran', () => {
  const h = S.historialHTML(historial());
  assert.match(h, /Por qué aparecen avisos de Stripe/);
  assert.match(h, /AgroClub, GlobalVet/);
  assert.match(h, /se comparte con otras marcas/);
  assert.match(h, /se ignoraron 14 avisos de otras marcas/);
});

test('historial: sin bitácora (servidor viejo) o sin problemas, un estado claro y amable', () => {
  assert.match(S.historialHTML({ ok: true, disponible: false }), /El historial no está disponible/);
  assert.match(S.historialHTML(null), /El historial no está disponible/);
  const limpio = S.historialHTML(historial({ errores: [], eventos: [], resumen: { reinicios: 1, reiniciosInesperados: 0, caidas: 0, erroresInternos: 0, erroresDistintos: 0, porRevisar: 0, stripeIgnorados: 0 } }));
  assert.match(limpio, /Sin errores en el servidor/);
});

test('reporte del historial: texto plano con cifras y errores agrupados, sin ids de Stripe completos', () => {
  const h = historial();
  h.errores[0].ejemplo = 'No se encontró miembro para la suscripción ' + SUB_COMPLETO;
  const t = S.reporteHistorial(h, AHORA);
  assert.match(t, /^Historial del servidor · Zoorigen/);
  assert.match(t, /Caídas: 1 · Reinicios inesperados: 1 de 4 arranques/);
  assert.match(t, /\[Alta prioridad\]/);
  assert.ok(!t.includes(SUB_COMPLETO));
  assert.equal(S.reporteHistorial(null, AHORA), 'Historial del servidor · no disponible');
});

/* ───────────────────────── La sección completa ───────────────────────── */

test('tarjetasHTML: exactamente cuatro tarjetas, en el orden de Alintec', () => {
  const h = S.tarjetasHTML({ precios: precios(), contacto: { contacto: { whatsapp: '1', instagram: '', correo: '' }, porDefecto: {} }, servicios: servicios(), historial: historial() }, { modo: 'problemas' });
  assert.equal((h.match(/<section class="ap-card ap-cfg"/g) || []).length, 4);
  const orden = ['apCfgPrecios', 'apCfgContacto', 'apCfgServicios', 'apCfgHistorial'].map(id => h.indexOf('id="' + id + '"'));
  assert.ok(orden.every(i => i > 0) && orden.join() === [...orden].sort((a, b) => a - b).join(), 'orden: ' + orden);
  assert.deepEqual([...h.matchAll(/<h2>([^<]+)<\/h2>/g)].map(m => m[1]), ['Precios de la membresía VIP', 'Contacto', 'Estado de servicios', 'Historial del servidor']);
  for (const b of ['Revisar ahora', 'Copiar reporte', 'Actualizar', 'Solo problemas', 'Todo', 'Marcarlos como publicaciones normales']) assert.ok(h.includes(b), b);
});

test('tarjetasHTML: si una lectura falla, esa tarjeta lo dice y las demás siguen; nada se rompe sin datos', () => {
  const h = S.tarjetasHTML({ precios: null, contacto: null, servicios: servicios(), historial: null }, {});
  assert.equal((h.match(/<section class="ap-card ap-cfg"/g) || []).length, 4);
  assert.match(h, /No se pudieron leer los precios/);
  assert.match(h, /No se pudo leer el contacto/);
  assert.match(h, /No se pudo leer el historial del servidor/);
  assert.match(h, /Hay avisos por revisar/);
  assert.doesNotThrow(() => S.tarjetasHTML(undefined, undefined));
});

test('Configuración ya no tiene lo que confundía: administradores, variables, interruptores, aviso global ni enlaces', () => {
  const t = S.tarjetasHTML({ precios: precios(), contacto: null, servicios: servicios(), historial: historial() }, {}) + leer('assets/js/admin-servidor.js');
  assert.doesNotMatch(t, /ADMIN_EMAILS|Quién administra|Variables del servidor|Clases en vivo|clasesEnVivoPronto|Aviso para todo el Club|Respaldo recomendado/);
  assert.doesNotMatch(leer('assets/js/admin-vistas.js'), /Estado del sistema|estadoSistema/);
});

test('sin degradados ni emojis en el módulo ni en los estilos nuevos de Configuración', () => {
  const js = leer('assets/js/admin-servidor.js');
  assert.doesNotMatch(js, /gradient\(/i);
  assert.ok(!/[\p{Extended_Pictographic}\u{FE0F}]/u.test(js));
  const css = leer('assets/css/admin-club.css');
  const b = css.slice(css.indexOf('Configuración: cuatro tarjetas'));
  assert.ok(b.length > 500);
  assert.doesNotMatch(b, /gradient/i);
});

/* ───────────────────────── Miembros: lista en CSV ───────────────────────── */

test('CSV de miembros: columnas seguras, fechas cortas y protección contra fórmulas', () => {
  const csv = S.csvMiembros([
    { nombre: '=cmd()', correo: 'a@x.test', estado: 'activo', planTipo: 'mensual', origen: 'stripe', registro: '2026-09-01T12:00:00Z', vence: '2026-11-01T12:00:00Z', ultimoPago: '2026-10-01T12:00:00Z' },
    { nombre: 'Beto, Jr.', correo: 'b@x.test', estado: 'sin-plan', planTipo: null, origen: 'ninguno', registro: null, vence: null, ultimoPago: null }
  ]);
  const filas = csv.split('\r\n');
  assert.equal(filas[0], 'nombre,correo,estado,plan,origen_del_acceso,registro,vence,ultimo_pago');
  assert.equal(filas[1], "'=cmd(),a@x.test,Activo,mensual,Stripe,2026-09-01,2026-11-01,2026-10-01");
  assert.match(filas[2], /^"Beto, Jr\.",b@x\.test,Sin membresía,/);
  assert.doesNotMatch(csv, /telefono|stripe_|cus_|sub_/i);
});

test('admin-club.html carga admin-servidor.js antes de las vistas y ya no carga el módulo viejo', () => {
  const html = leer('pages/admin-club.html');
  assert.ok(html.indexOf('admin-servidor.js') > html.indexOf('admin-panel.js') && html.indexOf('admin-servidor.js') < html.indexOf('admin-vistas.js'));
  assert.ok(!html.includes('admin-config.js'));
  assert.ok(!html.includes('data-sec="estado"'));
});
