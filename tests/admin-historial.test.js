'use strict';

// Panel de administración · Configuración · «Historial de movimientos» (assets/js/admin-historial.js):
// filas legibles, filtros, estados (cargando, vacío, error), «Ver más» / «Ver menos» con cursor y los avisos de lo que el panel guarda directo.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const H = require(path.join(RAIZ, 'assets', 'js', 'admin-historial.js'));

const AHORA = Date.UTC(2026, 10, 6, 18, 0, 0);
const item = (n, extra = {}) => Object.assign({
  id: 'm' + String(n).padStart(3, '0'), accion: 'curso-crear', tipo: 'cursos', tipoTexto: 'Cursos y materiales',
  por: { uid: 'u1', nombre: 'Erick Admin', correo: 'erick@example.com' }, resumen: 'Creó el curso «Fototrampeo»', destino: { id: 'c1', nombre: 'Fototrampeo' },
  en: new Date(AHORA - n * 3600000).toISOString()
}, extra);

/* ───────────── Filas ───────────── */

test('fila: avatar con iniciales, quién, la frase, correo, tipo con ícono y fecha en hora de México con «hace N»', () => {
  const h = H.filaHTML(item(3, { en: '2026-11-06T15:05:00.000Z' }), AHORA);
  for (const t of ['Erick Admin', 'Creó el curso «Fototrampeo»', 'erick@example.com', 'Cursos y materiales', 'EA', 'hace 2 h']) assert.ok(h.includes(t), t);
  assert.match(h, /9:05 a\. m\./, 'las 15:05 UTC son las 9:05 de la mañana en México');
  assert.match(h, /<time datetime="2026-11-06T15:05:00\.000Z">/);
  assert.match(h, /<svg/, 'el tipo lleva ícono Lucide');
  assert.doesNotMatch(h, /Sobre:/, 'el nombre ya está en la frase: no se repite');
  assert.match(H.filaHTML(item(1, { resumen: 'Regaló 1 mes', destino: { id: 'u9', nombre: 'Ana Prueba' } }), AHORA), /Sobre: Ana Prueba/);
});

test('fila: el texto que viene del servidor se escapa y no se rompe sin nombre ni fecha', () => {
  const h = H.filaHTML(item(1, { resumen: 'Creó <img src=x onerror=1>', por: { uid: 'u', nombre: '', correo: 'sin.nombre@x.com' }, en: null }), AHORA);
  assert.doesNotMatch(h, /<img/);
  assert.match(h, /&lt;img/);
  assert.match(h, /sin\.nombre/);
  assert.doesNotMatch(H.filaHTML({ id: 'x', por: {}, resumen: '' }, AHORA), /undefined|null/);
});

test('hace: un momento, minutos, horas y después días (ayer, hace 5 días, meses)', () => {
  const t = ms => new Date(AHORA - ms).toISOString();
  assert.equal(H.hace(t(20000), AHORA), 'hace un momento');
  assert.equal(H.hace(t(12 * 60000), AHORA), 'hace 12 min');
  assert.equal(H.hace(t(5 * 3600000), AHORA), 'hace 5 h');
  assert.equal(H.hace(t(26 * 3600000), AHORA), 'ayer');
  assert.equal(H.hace(t(5 * 86400000), AHORA), 'hace 5 días');
  assert.equal(H.hace(t(100 * 86400000), AHORA), 'hace 3 meses');
  assert.equal(H.hace('no es fecha', AHORA), '');
});

/* ───────────── Estados ───────────── */

test('estados: cargando con indicador, error amistoso con «Intentar de nuevo», vacío claro (con y sin filtros)', () => {
  assert.match(H.cuerpoHTML({ items: [], cargando: true }), /Cargando el historial/);
  const e = H.cuerpoHTML({ items: [], error: 'No hay conexión con el servidor.' });
  assert.match(e, /No pudimos cargar el historial/);
  assert.match(e, /data-hm-accion="reintentar"/);
  assert.match(e, /role="alert"/);
  assert.match(H.cuerpoHTML({ items: [] }), /Todavía no hay movimientos/);
  assert.match(H.cuerpoHTML({ items: [], tipo: 'cursos' }), /No hay movimientos con ese filtro/);
});

test('pie: «Ver más» solo si hay siguiente; «Ver menos» solo si hay más de 10; el contador dice cuántos se ven', () => {
  const diez = Array.from({ length: 10 }, (_, i) => item(i));
  const a = H.cuerpoHTML({ items: diez, siguiente: 'c1' }, AHORA);
  assert.match(a, /data-hm-accion="mas"/);
  assert.doesNotMatch(a, /data-hm-accion="menos"/);
  assert.match(a, /Mostrando 10 movimientos/);
  const treinta = Array.from({ length: 30 }, (_, i) => item(i));
  const b = H.cuerpoHTML({ items: treinta, siguiente: 'c2' }, AHORA);
  assert.match(b, /data-hm-accion="mas"/);
  assert.match(b, /data-hm-accion="menos"/);
  const c = H.cuerpoHTML({ items: treinta.slice(0, 12), siguiente: null }, AHORA);
  assert.doesNotMatch(c, /data-hm-accion="mas"/);
  assert.match(c, /es todo lo que hay/);
  assert.match(H.cuerpoHTML({ items: [item(1)], siguiente: null }, AHORA), /Mostrando 1 movimiento\b/);
  assert.match(H.cuerpoHTML({ items: diez, siguiente: 'c1', cargandoMas: true }, AHORA), /Cargando…[\s\S]*disabled|disabled[\s\S]*Cargando…/);
});

test('tarjeta: título con la misma estructura que las demás de Configuración, filtros por administrador y tipo, botón Actualizar', () => {
  const h = H.tarjetaHTML({ items: [], cargando: true, administradores: [{ correo: 'a@x.com', nombre: 'Ana Admin' }], tipos: [{ id: 'cursos', texto: 'Cursos y materiales' }, { id: 'pagos', texto: 'Pagos y recordatorios' }], administrador: 'a@x.com' }, AHORA);
  assert.match(h, /<section class="ap-card ap-cfg ap-hm-card" id="apCfgMovimientos">/);
  assert.match(h, /<h2>Historial de movimientos<\/h2>/);
  assert.match(h, /id="apHmAdmin"[\s\S]*Todos los administradores[\s\S]*<option value="a@x\.com" selected>Ana Admin/);
  assert.match(h, /id="apHmTipo"[\s\S]*Todos los tipos[\s\S]*Cursos y materiales/);
  assert.match(h, /data-hm-accion="actualizar"/);
  assert.doesNotMatch(h, /[\p{Extended_Pictographic}]/u);
});

/* ───────────── Controlador: Ver más / Ver menos con cursor ───────────── */

function falsaTarjeta() {
  const nodos = { '#apHmCuerpo': { innerHTML: '' }, '#apHmFiltros': { innerHTML: '' } };
  const oyentes = {};
  return {
    nodos, oyentes,
    querySelector: s => nodos[s] || null, contains: () => true, addEventListener: (t, f) => { oyentes[t] = f; },
    clic: accion => oyentes.click({ target: { closest: () => ({ getAttribute: () => accion }) } }),
    cambiar: (filtro, valor) => oyentes.change({ target: { closest: () => ({ getAttribute: () => filtro, value: valor }) } })
  };
}
// Un servidor de mentiras con 35 movimientos que respeta limite, cursor y filtros
function servidorFalso(total = 35) {
  const todos = Array.from({ length: total }, (_, i) => item(i, { id: 'm' + String(1000 - i), tipo: i % 2 ? 'miembros' : 'cursos', por: { uid: 'u' + (i % 2), nombre: i % 2 ? 'Marcela' : 'Erick', correo: (i % 2 ? 'marcela' : 'erick') + '@x.com' }, resumen: 'Movimiento ' + i }));
  const rutas = [];
  const api = async ruta => {
    rutas.push(ruta);
    const q = new URLSearchParams(ruta.split('?')[1]);
    let lista = todos.filter(x => (!q.get('tipo') || x.tipo === q.get('tipo')) && (!q.get('administrador') || x.por.correo === q.get('administrador')));
    const limite = Number(q.get('limite'));
    let desde = 0;
    if (q.get('cursor')) desde = lista.findIndex(x => x.id === q.get('cursor')) + 1;
    const pagina = lista.slice(desde, desde + limite);
    const hayMas = desde + limite < lista.length;
    return { ok: true, items: pagina, siguiente: hayMas ? pagina[pagina.length - 1].id : null, administradores: [{ correo: 'erick@x.com', nombre: 'Erick' }, { correo: 'marcela@x.com', nombre: 'Marcela' }], tipos: [{ id: 'cursos', texto: 'Cursos y materiales' }, { id: 'miembros', texto: 'Miembros y membresías' }], retencionMeses: 12 };
  };
  return { api, rutas };
}
const filas = t => (t.nodos['#apHmCuerpo'].innerHTML.match(/<li class="ap-hm"/g) || []).length;
const esperar = () => new Promise(r => setImmediate(r));

test('montar: abre con 10 (sin cursor), «Ver más» trae 20 con el cursor, «Ver menos» regresa a los primeros 10', async () => {
  const t = falsaTarjeta(); const s = servidorFalso(35);
  H.montar(t, s.api); await esperar(); await esperar();
  assert.deepEqual(s.rutas, ['/api/admin/historial?limite=10']);
  assert.equal(filas(t), 10);
  assert.match(t.nodos['#apHmCuerpo'].innerHTML, /data-hm-accion="mas"/);
  assert.doesNotMatch(t.nodos['#apHmCuerpo'].innerHTML, /data-hm-accion="menos"/);
  t.clic('mas'); await esperar(); await esperar();
  assert.equal(s.rutas[1], '/api/admin/historial?limite=20&cursor=m991', 'el cursor es el del último movimiento visto');
  assert.equal(filas(t), 30);
  assert.match(t.nodos['#apHmCuerpo'].innerHTML, /data-hm-accion="menos"/);
  t.clic('mas'); await esperar(); await esperar();
  assert.equal(filas(t), 35);
  assert.doesNotMatch(t.nodos['#apHmCuerpo'].innerHTML, /data-hm-accion="mas"/, 'ya no hay más');
  t.clic('menos');
  assert.equal(filas(t), 10);
  assert.match(t.nodos['#apHmCuerpo'].innerHTML, /data-hm-accion="mas"/);
  assert.doesNotMatch(t.nodos['#apHmCuerpo'].innerHTML, /data-hm-accion="menos"/);
  t.clic('mas'); await esperar(); await esperar();
  assert.equal(s.rutas[s.rutas.length - 1], '/api/admin/historial?limite=20&cursor=m991', 'tras «Ver menos», «Ver más» vuelve a pedir desde el décimo');
  assert.equal(filas(t), 30);
});

test('montar: cambiar el administrador o el tipo vuelve a pedir desde el principio con el filtro; las opciones no desaparecen', async () => {
  const t = falsaTarjeta(); const s = servidorFalso(35);
  H.montar(t, s.api); await esperar(); await esperar();
  t.cambiar('administrador', 'marcela@x.com'); await esperar(); await esperar();
  assert.equal(s.rutas[1], '/api/admin/historial?limite=10&administrador=marcela%40x.com');
  assert.ok(t.nodos['#apHmCuerpo'].innerHTML.includes('Marcela') && !t.nodos['#apHmCuerpo'].innerHTML.includes('Erick Admin'));
  t.cambiar('tipo', 'miembros'); await esperar(); await esperar();
  assert.equal(s.rutas[2], '/api/admin/historial?limite=10&administrador=marcela%40x.com&tipo=miembros');
  assert.match(t.nodos['#apHmFiltros'].innerHTML, /<option value="erick@x\.com">Erick/);
  assert.match(t.nodos['#apHmFiltros'].innerHTML, /<option value="miembros" selected>/);
  t.cambiar('administrador', ''); t.cambiar('tipo', 'nada-aqui'); await esperar(); await esperar();
  assert.equal(filas(t), 0);
  assert.match(t.nodos['#apHmCuerpo'].innerHTML, /No hay movimientos con ese filtro/);
});

test('montar: si falla la carga muestra un error amistoso y «Intentar de nuevo» lo vuelve a pedir; Actualizar recarga', async () => {
  const t = falsaTarjeta();
  let falla = true; const rutas = [];
  const api = async ruta => { rutas.push(ruta); if (falla) { const e = new Error('x'); e.status = 0; throw e; } return servidorFalso(3).api(ruta); };
  H.montar(t, api); await esperar(); await esperar();
  assert.match(t.nodos['#apHmCuerpo'].innerHTML, /No hay conexión con el servidor/);
  falla = false; t.clic('reintentar'); await esperar(); await esperar();
  assert.equal(filas(t), 3);
  t.clic('actualizar'); await esperar(); await esperar();
  assert.equal(rutas.length, 3);
  const prohibido = falsaTarjeta();
  H.montar(prohibido, async () => { const e = new Error('no'); e.status = 403; throw e; }); await esperar(); await esperar();
  assert.match(prohibido.nodos['#apHmCuerpo'].innerHTML, /no tiene permiso/);
});

test('montar: una respuesta tardía de una carga vieja no pisa a la nueva (cambio rápido de filtro)', async () => {
  const t = falsaTarjeta();
  const pendientes = [];
  const api = ruta => new Promise(res => pendientes.push({ ruta, res }));
  H.montar(t, api);
  t.cambiar('tipo', 'cursos');
  assert.equal(pendientes.length, 2);
  pendientes[1].res({ items: [item(1, { resumen: 'Nueva' })], siguiente: null, administradores: [], tipos: [] }); await esperar();
  pendientes[0].res({ items: [item(2, { resumen: 'Vieja' })], siguiente: null, administradores: [], tipos: [] }); await esperar();
  assert.ok(t.nodos['#apHmCuerpo'].innerHTML.includes('Nueva') && !t.nodos['#apHmCuerpo'].innerHTML.includes('Vieja'));
});

/* ───────────── Integración en el panel ───────────── */

test('Configuración trae la tarjeta, la página la carga con la misma versión ?v= y solo habla con el servidor; sin degradados ni emojis', () => {
  const vistas = leer('assets/js/admin-vistas.js');
  assert.match(vistas, /ZOO_ADMIN_HISTORIAL\.tarjetaHTML\(/);
  assert.match(vistas, /ZOO_ADMIN_HISTORIAL\.montar\(tm, function \(ruta\) \{ return ctx\.api\(ruta\); \}\)/);
  const html = leer('pages/admin-club.html');
  const v = html.match(/admin-club\.css\?v=([\w-]+)/)[1];
  assert.equal(html.match(/admin-historial\.css\?v=([\w-]+)/)[1], v);
  assert.equal(html.match(/admin-historial\.js\?v=([\w-]+)/)[1], v);
  assert.equal(html.match(/admin-vistas\.js\?v=([\w-]+)/)[1], v, 'vistas cambió: sube junto con todo');
  assert.ok(html.indexOf('admin-historial.js') > html.indexOf('admin-panel.js') && html.indexOf('admin-historial.js') > html.indexOf('admin-iconos.js'));
  const js = leer('assets/js/admin-historial.js'); const css = leer('assets/css/admin-historial.css');
  assert.doesNotMatch(js, /firebase|firestore|collection\(/i);
  assert.doesNotMatch(css, /gradient/i);
  assert.ok(!/[\p{Extended_Pictographic}\u{FE0F}]/u.test(js + css));
  for (const m of css.matchAll(/font(?:-size)?:[^;]*?(\d*\.?\d+)rem/g)) assert.ok(parseFloat(m[1]) >= 0.75, 'letra de 12 px o más: ' + m[0]);
  assert.doesNotMatch(css, /overflow-wrap: anywhere/);
  // móvil: filas apiladas
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*\.ap-hm \{ grid-template-columns: 40px minmax\(0, 1fr\); \}/);
});

test('lo que el panel guarda directo en Firestore avisa al servidor: curso (crear, editar, eliminar), video, PDF y clase en vivo (el botón global de Bunny ya no existe)', () => {
  const html = leer('pages/admin-club.html');
  assert.match(html, /\/api\/admin\/historial\/registrar/);
  for (const a of ["id ? 'curso-editar' : 'curso-crear'", "id ? 'video-editar' : 'video-crear'", "id ? 'pdf-editar' : 'pdf-crear'", "id ? 'sesion-editar' : 'sesion-crear'"]) {
    assert.ok(html.includes('historialAviso(' + a), a);
  }
  assert.match(html, /curso-eliminar[\s\S]{0,80}video-eliminar[\s\S]{0,80}pdf-eliminar[\s\S]{0,80}sesion-eliminar/);
  // el aviso va DESPUÉS de guardar y no puede romper el guardado
  assert.ok(html.indexOf("historialAviso(id ? 'curso-editar' : 'curso-crear'") > html.indexOf('await batch.commit()'));
  assert.match(html, /const historialAviso = [\s\S]{0,400}\.catch\(\(\) => \{\}\)[\s\S]{0,120}catch \(e\)/);
  // el nombre del administrador NUNCA lo manda el navegador
  assert.doesNotMatch(html.slice(html.indexOf('const historialAviso'), html.indexOf('const historialAviso') + 600), /porCorreo|por:|correo:/);
});

test('el historial vive solo en el panel de administración: ningún archivo del panel del miembro lo menciona', () => {
  for (const rel of fs.readdirSync(path.join(RAIZ, 'pages')).filter(f => /^club-.*\.html$/.test(f)).map(f => 'pages/' + f)) assert.doesNotMatch(leer(rel), /admin-historial|api\/admin\/historial/, rel);
  for (const rel of fs.readdirSync(path.join(RAIZ, 'assets', 'js')).filter(f => /^club.*\.js$/.test(f)).map(f => 'assets/js/' + f)) assert.doesNotMatch(leer(rel), /ZOO_ADMIN_HISTORIAL|api\/admin\/historial/, rel);
});
