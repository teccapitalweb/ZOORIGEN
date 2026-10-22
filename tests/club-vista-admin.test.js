'use strict';
// El administrador NO ve lo mismo que un miembro:
//  - una cuenta administradora que abre una página del Club de miembro va al panel de administración (decisión temprana en el
//    <head> con lo guardado en este navegador y confirmación con GET /api/admin/yo);
//  - "Ver como usuario" (?como=user) se recuerda solo en sessionStorage de la pestaña y muestra el Club con la membresía REAL;
//  - un miembro normal nunca ve nada de administración ni es redirigido.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const PAGINAS = fs.readdirSync(path.join(RAIZ, 'pages')).filter(f => /^(club-.*|admin-club|verificar-correo)\.html$/.test(f) && !['club.html', 'club-noticias.html'].includes(f));
const PANEL = PAGINAS.filter(f => f !== 'club-canal.html' && /<aside class="club-sidebar" id="sidebar"/.test(leer('pages/' + f)));
const SIN_PANEL = PAGINAS.filter(f => !PANEL.includes(f));

function almacen(inicial) {
  const d = Object.assign({}, inicial || {});
  return { d, getItem: k => (Object.prototype.hasOwnProperty.call(d, k) ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: k => { delete d[k]; } };
}

/* ───── script de decisión temprana del <head> ───── */
function correrCabecera(html, { local = {}, sesion = {}, busqueda = '', bloqueado = false } = {}) {
  const codigo = /<script>\/\*zs-admin\*\/([\s\S]*?)<\/script>/.exec(html)[1];
  const attrs = {};
  const estilo = {};
  const reemplazos = [];
  const l = almacen(local), s = almacen(sesion);
  const ctx = {
    document: { documentElement: { setAttribute: (k, v) => { attrs[k] = v; }, style: estilo } },
    localStorage: bloqueado ? { getItem() { throw new Error('bloqueado'); } } : l,
    window: { sessionStorage: bloqueado ? { getItem() { throw new Error('bloqueado'); } } : s },
    location: { search: busqueda, replace: u => reemplazos.push(u) },
    setTimeout: () => 0
  };
  vm.runInNewContext(codigo, ctx);
  return { attrs, estilo, reemplazos, local: l.d, sesion: s.d };
}

test('todas las páginas del Club de miembro llevan la decisión temprana; el acceso, el panel y el registro no', () => {
  assert.ok(PANEL.length >= 17);
  for (const f of PANEL) {
    const h = leer('pages/' + f);
    assert.equal((h.match(/\/\*zs-admin\*\//g) || []).length, 1, f);
    assert.ok(h.indexOf('/*zs-admin*/') < h.indexOf('<link rel="stylesheet"'), f + ': antes de cualquier CSS (sin parpadeo)');
  }
  for (const f of SIN_PANEL) assert.doesNotMatch(leer('pages/' + f), /\/\*zs-admin\*\//, f + ': no redirige (login, registro, gracias, verificar y el propio panel)');
});

test('cabecera: la cuenta administradora conocida va al panel antes de pintar; sin marca no pasa nada', () => {
  const h = leer('pages/club-dashboard.html');
  const admin = correrCabecera(h, { local: { zoo_admin: '1' } });
  assert.deepEqual(admin.reemplazos, ['admin-club.html']);
  assert.equal(admin.estilo.visibility, 'hidden', 'no se pinta el Club un instante');
  const miembro = correrCabecera(h, { local: { zoo_plan: 'active' } });
  assert.deepEqual(miembro.reemplazos, [], 'un miembro normal no se redirige');
  assert.equal(miembro.attrs['data-como'], undefined);
  assert.equal(correrCabecera(h, { local: {} }).reemplazos.length, 0);
  assert.equal(correrCabecera(h, { bloqueado: true }).reemplazos.length, 0, 'sin almacenamiento no hace nada ni lanza');
});

test('cabecera: ?como=user se recuerda solo en la pestaña y deja ver el Club; ?como=admin lo quita y vuelve al panel', () => {
  const h = leer('pages/club-retos.html');
  const ver = correrCabecera(h, { local: { zoo_admin: '1' }, busqueda: '?como=user' });
  assert.deepEqual(ver.reemplazos, []);
  assert.equal(ver.attrs['data-como'], 'user');
  assert.equal(ver.sesion.zoo_como_usuario, '1');
  assert.equal(ver.local.zoo_como_usuario, undefined, 'no se guarda en localStorage (no pasa a otras pestañas)');
  // ya recordado en la pestaña: las demás páginas del Club siguen en la vista de usuario
  const sigue = correrCabecera(h, { local: { zoo_admin: '1' }, sesion: { zoo_como_usuario: '1' } });
  assert.deepEqual(sigue.reemplazos, []);
  assert.equal(sigue.attrs['data-como'], 'user');
  // volver al panel
  const quita = correrCabecera(h, { local: { zoo_admin: '1' }, sesion: { zoo_como_usuario: '1' }, busqueda: '?como=admin' });
  assert.deepEqual(quita.reemplazos, ['admin-club.html']);
  assert.equal(quita.sesion.zoo_como_usuario, undefined);
  // una cuenta que NO es administradora no cambia por escribir ?como=user (la franja solo sale a administradores)
  const intruso = correrCabecera(h, { busqueda: '?como=user' });
  assert.equal(intruso.attrs['data-como'], undefined);
  assert.deepEqual(intruso.reemplazos, []);
});

/* ───── club.js: decisión confirmada con el servidor ───── */
function cargarClub({ local = {}, sesion = {}, busqueda = '', respuestaAdmin = 'ok' } = {}) {
  const fuente = leer('assets/js/club.js').replace('const ZOORIGEN_CLUB =', 'result =');
  const l = almacen(local), s = almacen(sesion);
  const reemplazos = [];
  const llamadas = [];
  const ctx = {
    result: null,
    window: { location: { search: busqueda, pathname: '/pages/club-dashboard.html', href: '', replace: u => reemplazos.push(u) }, sessionStorage: s },
    localStorage: l, sessionStorage: s,
    document: { documentElement: { setAttribute() {}, getAttribute: () => 'light' }, querySelectorAll: () => [], getElementById: () => null },
    console, setTimeout, setInterval, clearTimeout, clearInterval, Date, URLSearchParams, Promise
  };
  vm.runInNewContext(fuente, ctx, { filename: 'club.js' });
  const club = ctx.result;
  club.apiFetch = async (ruta) => {
    llamadas.push(ruta);
    if (respuestaAdmin === 'ok') return { ok: true, admin: true };
    if (respuestaAdmin === 'no-admin') return { ok: true, admin: false };
    const e = new Error('x'); e.status = respuestaAdmin === 'prohibido' ? 403 : 0; throw e;
  };
  return { club, local: l.d, sesion: s.d, reemplazos, llamadas };
}

test('club.js: una cuenta con marca de administrador confirmada por el servidor va al panel y queda recordada', async () => {
  const E = cargarClub({});
  const sesion = { role: 'admin', planStatus: 'pending_payment' };
  assert.equal(await E.club._decidirAdmin({ uid: 'u1' }, sesion), true);
  assert.deepEqual(E.llamadas, ['/api/admin/yo?suave=1'], 'variante suave: sin errores 403 en la consola de los miembros');
  assert.equal(E.local.zoo_admin, '1');
});

test('club.js: si el servidor ya no la reconoce (el correo salió de ADMIN_EMAILS) se queda como miembro y se limpia la marca', async () => {
  const E = cargarClub({ local: { zoo_admin: '1' }, respuestaAdmin: 'prohibido' });
  const sesion = { role: 'admin', planStatus: 'active' };
  assert.equal(await E.club._decidirAdmin({ uid: 'u1' }, sesion), false);
  assert.equal(sesion.role, 'member');
  assert.equal(E.local.zoo_admin, undefined);
});

test('club.js: "Ver como usuario" no abre nada por ser administrador y no pregunta al servidor', async () => {
  const E = cargarClub({ sesion: { zoo_como_usuario: '1' } });
  const sesion = { role: 'admin', planStatus: 'pending_payment' };
  assert.equal(await E.club._decidirAdmin({ uid: 'u1' }, sesion), false);
  assert.equal(sesion.rolReal, 'admin');
  assert.equal(sesion.role, 'member', 'sin rol de administrador: las funciones de miembro dependen de la membresía real');
  assert.equal(E.club.hasActiveMembership(sesion), false);
  assert.deepEqual(E.llamadas, []);
});

test('club.js: un miembro normal no es redirigido y la consulta de fondo se hace una sola vez cada 12 horas', async () => {
  const E = cargarClub({ respuestaAdmin: 'no-admin' });
  const sesion = { role: 'member', planStatus: 'active' };
  assert.equal(await E.club._decidirAdmin({ uid: 'u2' }, sesion), false);
  await new Promise(r => setTimeout(r, 10));
  assert.equal(E.llamadas.length, 1);
  assert.deepEqual(E.reemplazos, []);
  assert.equal(await E.club._decidirAdmin({ uid: 'u2' }, sesion), false);
  await new Promise(r => setTimeout(r, 10));
  assert.equal(E.llamadas.length, 1, 'la segunda carga de página no vuelve a preguntar');
});

test('club.js: una cuenta administradora que aún no tenía la marca en Firestore va al panel gracias a la consulta de fondo', async () => {
  const E = cargarClub({ respuestaAdmin: 'ok' });
  assert.equal(await E.club._decidirAdmin({ uid: 'u3' }, { role: 'member', planStatus: 'pending_payment' }), false);
  await new Promise(r => setTimeout(r, 10));
  assert.deepEqual(E.reemplazos, ['admin-club.html']);
  assert.equal(E.local.zoo_admin, '1');
});

test('club.js: sin red no se decide nada (ni se marca ni se bloquea al miembro) y se reintenta en la siguiente página', async () => {
  const E = cargarClub({ respuestaAdmin: 'sinred' });
  assert.equal(await E.club._decidirAdmin({ uid: 'u4' }, { role: 'member' }), false);
  await new Promise(r => setTimeout(r, 10));
  assert.equal(E.local.zoo_admin, undefined);
  assert.equal(E.local.zoo_admin_chk, undefined, 'no se anota la comprobación para poder repetirla');
});

test('requireAuth: redirige al panel desde el Club, no desde el propio panel, y muestra la franja al ver como usuario', () => {
  const club = leer('assets/js/club.js');
  assert.match(club, /if \(!this\._enPanelAdmin\(\)\) \{\s*const alPanel = await this\._decidirAdmin\(user, sesion\);\s*if \(alPanel\) \{ window\.location\.replace\('admin-club\.html'\); return; \}\s*if \(sesion\.rolReal === 'admin'\) this\._mostrarFranjaComoUsuario\(\);/);
  assert.match(club, /Estás viendo el Club como usuario/);
  assert.match(club, /<a href="admin-club\.html">Volver al panel<\/a>/);
  // la marca local se borra al cerrar sesión (otra persona en el mismo navegador no hereda la decisión)
  assert.match(club, /localStorage\.removeItem\('zoo_admin'\); localStorage\.removeItem\('zoo_admin_chk'\); sessionStorage\.removeItem\('zoo_como_usuario'\)/);
  // el estado guardado de la membresía es el real: el administrador ya no cuenta como miembro por serlo
  assert.doesNotMatch(club, /El administrador ve el Club completo/);
});

test('el panel de administración recuerda la confirmación del servidor, termina "Ver como usuario" y ya no ofrece "Ir al Club" de miembro', () => {
  const h = leer('pages/admin-club.html');
  assert.match(h, /ZOORIGEN_CLUB\._marcarAdmin\(true\);/);
  assert.match(h, /sessionStorage\.removeItem\('zoo_como_usuario'\)/);
  assert.match(h, /ZOORIGEN_CLUB\._marcarAdmin\(false\);/);
  assert.doesNotMatch(h, /club-dashboard\.html\?como=admin/, 'el pie del panel no lleva un enlace que solo rebotaría');
  assert.match(h, /club-dashboard\.html\?como=user/, 'sí ofrece "Ver como usuario"');
});

test('la franja "Ver como usuario" es discreta, de color sólido y reserva su altura desde el primer pintado', () => {
  const css = leer('assets/css/club-shell.css');
  const i = css.indexOf('VER COMO USUARIO');
  assert.ok(i > 0, 'bloque de estilos de la franja');
  const b = css.slice(i);
  assert.match(b, /html\[data-como="user"\] body::before/);
  assert.match(b, /\.zs-como \{/);
  assert.doesNotMatch(b.split('/* ═══')[0], /gradient\(/);
});
