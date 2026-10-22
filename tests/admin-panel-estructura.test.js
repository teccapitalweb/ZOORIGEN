'use strict';

// Panel de administración (pages/admin-club.html): acceso por servidor, sin clave en el navegador, estructura de
// secciones, ayudas puras (filtros, formatos, gráficas SVG) y reglas del sistema de diseño del Club.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const P = require(path.join(RAIZ, 'assets', 'js', 'admin-panel.js'));
const I = require(path.join(RAIZ, 'assets', 'js', 'admin-iconos.js'));

const html = leer('pages/admin-club.html');
const vistas = leer('assets/js/admin-vistas.js');
const panelJs = leer('assets/js/admin-panel.js');
const css = leer('assets/css/admin-club.css');
const quitarComentarios = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/<!--[\s\S]*?-->/g, '');

/* ───────── acceso: sin clave en el navegador, lo decide el servidor ───────── */

test('la página ya no lleva ninguna contraseña ni acceso por clave en el navegador', () => {
  for (const [nombre, texto] of [['admin-club.html', html], ['admin-vistas.js', vistas], ['admin-panel.js', panelJs]]) {
    assert.doesNotMatch(texto, /ADMIN_PWD|PWD_KEY|accessPwd|loginBtn|zoorigen_admin_pwd_ok|Zoorigen2026/, nombre);
    assert.doesNotMatch(texto, /type="password"/, nombre + ': sin campo de contraseña');
  }
  assert.doesNotMatch(html, /Contraseña de acceso|Contraseña admin/);
});

test('el acceso se verifica con la sesión de Firebase y GET /api/admin/yo; un no administrador vuelve al Club', () => {
  assert.match(html, /ZOORIGEN_CLUB\.apiFetch\('\/api\/admin\/yo'\)/);
  assert.match(html, /err\.status === 401 \|\| err\.status === 403/);
  assert.match(html, /window\.location\.replace\('club-dashboard\.html'\)/);
  assert.match(html, /window\.location\.replace\('club-login\.html'\)/, 'sin sesión va al inicio de sesión');
  // el panel no decide el permiso leyendo el rol en Firestore desde el navegador
  assert.doesNotMatch(html, /data\.role !== 'admin'|\.role === 'admin'/);
  // el panel arranca oculto: nada de datos hasta que el servidor responde 200
  assert.match(html, /<div class="admin-shell" id="adminApp" hidden>/);
  assert.match(html, /function showAdmin\(yo\)[\s\S]{0,260}initAdmin\(yo\)/);
});

test('nada de datos personales en la URL: el hash solo lleva el id de la sección', () => {
  assert.doesNotMatch(html, /mailto:|[?&]email=|location\.search/);
  assert.match(html, /const destino = '#\/' \+ btn\.dataset\.sec;[\s\S]{0,220}window\.location\.hash = destino/);
  assert.equal(P.seccionDeHash('#/miembros'), 'miembros');
  assert.equal(P.seccionDeHash('#/ana@example.com'), 'resumen', 'un hash raro cae en el resumen');
  assert.equal(P.seccionDeHash(''), 'resumen');
  assert.equal(P.seccionDeHash('#/__proto__'), 'resumen');
});

test('las vistas nuevas leen todo por el servidor: nada de Firestore directo ni de escritura desde el navegador', () => {
  const js = quitarComentarios(vistas);
  assert.doesNotMatch(js, /db\.collection|firebase\.firestore|getDocs|\.set\(|\.update\(/);
  // activar y cancelar pasan por endpoints que verifican administrador en el servidor
  assert.match(js, /\/api\/admin\/miembros\/' \+ encodeURIComponent\(uid\) \+ '\/activar'/);
  assert.match(js, /\/api\/admin\/miembros\/' \+ encodeURIComponent\(uid\) \+ '\/cancelar'/);
  // el panel de la página ya no escribe la membresía en Firestore
  assert.doesNotMatch(quitarComentarios(html), /collection\('miembros'\)\.(doc\([^)]*\)\.)?(set|update)\(/);
  assert.doesNotMatch(html, /function adminActivarConfirm|window\.adminCancelar/);
});

test('los endpoints que usa el panel son los del servidor (inventario)', () => {
  const rutas = new Set([...vistas.matchAll(/'(\/api\/admin\/[a-z0-9/-]+)/g)].map(m => m[1].replace(/\/$/, '')));
  for (const r of ['/api/admin/resumen', '/api/admin/miembros', '/api/admin/retos', '/api/admin/comunidad', '/api/admin/referidos', '/api/admin/precios', '/api/admin/contacto', '/api/admin/servicios', '/api/admin/servidor/historial', '/api/admin/progreso-legado', '/api/admin/eliminados']) {
    assert.ok(rutas.has(r), 'falta ' + r);
  }
});

/* ───────── estructura ───────── */

test('cada sección del panel tiene botón en la barra lateral con ícono y se dibuja desde renderSection', () => {
  assert.equal(P.SECCIONES.length, 19);
  // «Estado del sistema» ya no existe: vive dentro de Configuración (los enlaces viejos llevan allá)
  assert.equal(P.seccion('estado'), null);
  assert.equal(P.seccionDeHash('#/estado'), 'configuracion');
  assert.doesNotMatch(html, /data-sec="estado"|V\.estado/);
  for (const s of P.SECCIONES) {
    assert.match(html, new RegExp(`data-sec="${s.id}"><svg class="zi"`), 'botón de ' + s.id);
    assert.match(html, new RegExp(`sec === '${s.id}'`), 'renderSection de ' + s.id);
    assert.ok(I.existe(s.icono), 'ícono de ' + s.id);
    assert.match(s.zoo, /^[a-z]+$/);
    assert.match(leer('assets/css/club-seccion.css'), new RegExp(`body\\[data-zoo="${s.zoo}"\\]`), 'paleta del apartado ' + s.zoo);
  }
  assert.deepEqual([...new Set(P.SECCIONES.map(s => s.grupo))], ['Panel', 'Contenido', 'Comunidad', 'Marketing', 'Sistema']);
  // «Herramientas (Próximamente)» se quitó: no tenía servidor detrás y el Club ya tiene la página
  assert.equal(P.seccion('herramientas'), null);
  assert.doesNotMatch(html, /data-sec="herramientas"|V\.herramientas/);
  assert.equal(P.seccionDeHash('#/herramientas'), 'resumen');
  for (const id of ['metricas', 'pruebas']) assert.ok(P.seccion(id), id);
});

test('barra lateral: marca real, "Ver como usuario", ir al Club y cerrar sesión; menú móvil accesible', () => {
  assert.match(html, /class="asb-logo" src="..\/assets\/img\/logo\/zoorigen-logo-remaster-v1\.png"/);
  assert.match(html, /href="club-dashboard\.html\?como=user"/);
  assert.match(html, /onclick="adminLogout\(\);return false;"/);
  assert.match(html, /id="apMenuBtn"[^>]*aria-expanded="false"[^>]*aria-controls="asb"/);
  assert.match(html, /<a class="ap-saltar" href="#secView">/);
  assert.match(html, /<nav class="asb-nav" aria-label="Secciones del panel">/);
});

test('el panel usa el sistema de diseño del Club: fuentes propias, tokens, tarjeta de título y hoja propia al final', () => {
  assert.match(html, /fuentes\.css\?v=/);
  assert.match(html, /club-seccion\.css\?v=/);
  assert.ok(html.indexOf('club-seccion.css') < html.indexOf('admin-club.css'));
  assert.ok(html.indexOf('admin-club.css') > html.indexOf('admin-encuesta.css') && html.indexOf('admin-club.css') < html.indexOf('club-responsivo.css'), 'la hoja propia va después de los módulos y antes de la responsiva');
  assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic/);
  const tarjeta = P.tarjetaTitulo({ titulo: 'Todo el Club,', acento: 'de un vistazo.', sub: 'x', cifras: [{ valor: '5', rotulo: 'miembros' }] });
  assert.match(tarjeta, /class="zs-seccion ap-titulo"/);
  assert.match(tarjeta, /<span class="zs-acento">de un vistazo\.<\/span>/);
  assert.match(tarjeta, /zs-cifra__v/);
  assert.match(css, /var\(--zoo-font-display\)/);
  assert.match(css, /data-modo="oscuro"/);
  assert.match(css, /data-modo="claro"/);
  // el modo de la paleta anterior sigue al modo día/noche del Club
  assert.match(html, /ap-modo[\s\S]{0,200}data-modo/);
});

test('sin degradados y sin emojis en el panel nuevo', () => {
  for (const [n, t] of [['admin-club.css', css], ['admin-club.html', html], ['admin-vistas.js', vistas], ['admin-panel.js', panelJs], ['admin-marketing.js', leer('assets/js/admin-marketing.js')], ['admin-encuesta.js', leer('assets/js/admin-encuesta.js')], ['admin-encuesta.css', leer('assets/css/admin-encuesta.css')]]) {
    assert.doesNotMatch(t, /gradient\(/i, n + ': degradado');
    assert.doesNotMatch(t, /[\p{Extended_Pictographic}\u{FE0F}]/u, n + ': emoji');
  }
});

test('letra mínima de 12 px y objetivos táctiles de 40 px o más en la hoja del panel', () => {
  const sinComentarios = quitarComentarios(css);
  for (const m of sinComentarios.matchAll(/font(?:-size)?:\s*(?:[0-9]{3}\s+)?([0-9.]+)(rem|px)/g)) {
    const px = m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]);
    assert.ok(px >= 11.99, `letra de ${px}px: ${m[0]}`);
  }
  for (const m of sinComentarios.matchAll(/font:\s*(?:[0-9]{3}\s+)?([0-9.]+)(rem|px)\//g)) {
    const px = m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]);
    assert.ok(px >= 11.99, `letra de ${px}px: ${m[0]}`);
  }
  assert.match(css, /\.ap-btn \{[^}]*min-height: 44px/);
  assert.match(css, /\.ap-btn--chico \{[^}]*min-height: 40px/);
  assert.match(css, /\.ap-icono \{[^}]*width: 44px; height: 44px/);
  assert.match(css, /\.asb-item \{[^}]*min-height: 40px/);
});

test('respeta prefers-reduced-motion y las tablas son compactas: el CONTENEDOR (no la ventana) esconde columnas', () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.ap-tabla-zona \{ container: tabla \/ inline-size;/);
  assert.match(css, /@container tabla \(max-width: 899px\)/);
  assert.doesNotMatch(css, /content: attr\(data-label\)/, 'sin tarjetas grandes');
  assert.doesNotMatch(css, /@media[^{]*\{[^@]*\.ap-tabla td::before/);
});

/* ───────── ayudas puras ───────── */

test('formatos: fechas en hora de México, relativos, dinero y duración', () => {
  assert.equal(P.fmtFecha('2026-10-15T03:00:00Z'), '14 oct 2026');
  assert.equal(P.fmtFecha(null), '—');
  assert.equal(P.fmtMes('2026-03'), 'mar 2026');
  assert.equal(P.fmtMxn(2248), '$2,248 MXN');
  assert.equal(P.fmtNum('x'), '—');
  assert.equal(P.relativo(new Date(Date.now() + 3 * 86400000 + 3600000).toISOString()), 'en 3 días');
  assert.equal(P.relativo(new Date(Date.now() - 86400000).toISOString()), 'ayer');
  assert.equal(P.duracion(45), '45 s');
  assert.equal(P.duracion(3 * 3600 + 120), '3 h 2 min');
  assert.equal(P.iniciales('Ana María Rivera'), 'AR');
  assert.equal(P.iniciales(''), '?');
});

test('insignias de estado: color, ícono y texto (nunca solo color) y escapado', () => {
  for (const e of ['activo', 'cancelado-vigente', 'pago-pendiente', 'vencido', 'sin-plan']) {
    const b = P.insignia(e);
    assert.match(b, /ap-badge ap-badge--/);
    assert.match(b, /<svg class="zi"/);
    assert.match(b, new RegExp('<span>' + P.etiquetaEstado(e) + '</span>'));
  }
  assert.match(P.insignia('inventado'), /Sin membresía/);
  assert.equal(P.esc('<img src=x onerror=1>'), '&lt;img src=x onerror=1&gt;');
});

test('filtrado, búsqueda sin acentos y orden de miembros', () => {
  const lista = [
    { uid: 'a', nombre: 'Ángela Pérez', correo: 'angela@x.com', estado: 'activo', conAcceso: true, vence: '2026-11-01T00:00:00Z', registro: '2026-01-01T00:00:00Z' },
    { uid: 'b', nombre: 'Beto', correo: 'beto@x.com', estado: 'vencido', conAcceso: false, vence: '2026-08-01T00:00:00Z', registro: '2026-06-01T00:00:00Z' },
    { uid: 'c', nombre: 'Carla', correo: 'carla@x.com', estado: 'activo', conAcceso: true, vence: '2026-10-20T00:00:00Z', registro: '2026-03-01T00:00:00Z' },
    { uid: 'd', nombre: 'Dani', correo: 'dani@x.com', estado: 'sin-plan', conAcceso: false, vence: null, registro: null }
  ];
  assert.deepEqual(P.filtrarMiembros(lista, { filtro: 'activo' }).map(m => m.uid), ['a', 'c']);
  assert.deepEqual(P.filtrarMiembros(lista, { texto: 'angela' }).map(m => m.uid), ['a']);
  assert.deepEqual(P.filtrarMiembros(lista, { texto: 'ÁNGELA PEREZ' }).map(m => m.uid), ['a']);
  assert.deepEqual(P.filtrarMiembros(lista, { filtro: 'vencido', texto: 'carla' }), []);
  assert.deepEqual(P.ordenarMiembros(lista, 'vence').map(m => m.uid), ['c', 'a', 'b', 'd']);
  assert.deepEqual(P.ordenarMiembros(lista, 'registro').map(m => m.uid), ['b', 'c', 'a', 'd']);
  assert.deepEqual(P.ordenarMiembros(lista, 'nombre').map(m => m.uid), ['a', 'b', 'c', 'd']);
  const c = P.contarPorFiltro(lista);
  assert.equal(c.todos, 4); assert.equal(c.activo, 2); assert.equal(c['sin-plan'], 1);
});

test('bloque "Próximamente" muestra lo que falta en el servidor sin inventar funciones', () => {
  const b = P.bloqueProntoHTML({ titulo: 'Historial de cobros', texto: 'Texto', faltan: ['GET /api/admin/pagos'] });
  assert.match(b, /zs-pronto__chip">Próximamente/);
  assert.match(b, /<code>GET \/api\/admin\/pagos<\/code>/);
});

/* ───────── inicio de sesión y "Ver como usuario" ───────── */

test('inicio de sesión: la administradora entra al panel y el resto al Club (decide el servidor)', () => {
  const login = leer('pages/club-login.html');
  assert.equal((login.match(/ZOORIGEN_CLUB\.irTrasEntrar\(\)/g) || []).length, 1, 'un solo punto de salida (entrar()), usado por correo, Google y sesión abierta');
  assert.equal((login.match(/\bentrar\(\);/g) || []).length >= 3, true);
  assert.doesNotMatch(login, /window\.location\.href = 'club-dashboard\.html'/);
  const club = leer('assets/js/club.js');
  assert.match(club, /async _consultarAdmin\(\) \{[\s\S]{0,160}\/api\/admin\/yo/);
  assert.match(club, /async esAdministrador\(\) \{ return \(await this\._consultarAdmin\(\)\) === true; \}/);
  assert.match(club, /destino = 'admin-club\.html'/);
  assert.match(club, /this\._espera\(this\._consultarAdmin\(\), 3500, null\)/);
});

test('"Ver como usuario" es solo cosmético: cambia lo que se pinta, no pide nada al servidor', () => {
  const club = leer('assets/js/club.js');
  const trozo = club.slice(club.indexOf('_comoUsuario() {'), club.indexOf('_enPanelAdmin() {'));
  assert.ok(trozo.length > 100);
  assert.doesNotMatch(trozo, /apiFetch|fetch\(|db\.collection/);
  assert.match(club, /sesion\.rolReal = 'admin'; sesion\.role = 'member';/);
  // solo se ofrece el bloque (regreso al panel) a quien ve el Club como usuario
  assert.match(club, /_bloqueAdmin\(session\) \{\s*if \(!session \|\| session\.rolReal !== 'admin'\) return '';/);
});
