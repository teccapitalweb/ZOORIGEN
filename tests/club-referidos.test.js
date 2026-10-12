'use strict';

// Referidos: la pantalla (assets/js/club-referidos.js) y la parte de club.js que registra al invitado
// (dispositivo, huella, POST al servidor). Ejecutar: node --test tests/club-referidos.test.js

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const RAIZ = path.join(__dirname, '..');
const R = require(path.join(RAIZ, 'assets', 'js', 'club-referidos.js'));

/* ───────────── club.js dentro de un "navegador" falso ───────────── */

function crearClub(extra) {
  const almacen = new Map();
  const llamadas = [];
  const contexto = Object.assign({
    result: null,
    window: {},
    localStorage: {
      getItem: k => (almacen.has(k) ? almacen.get(k) : null),
      setItem: (k, v) => { almacen.set(k, String(v)); },
      removeItem: k => { almacen.delete(k); }
    },
    document: { documentElement: { setAttribute() {}, getAttribute: () => 'dark' }, querySelectorAll: () => [] },
    navigator: { userAgent: 'Mozilla/5.0 (Prueba) Chrome/120', language: 'es-MX' },
    screen: { width: 1366, height: 768, colorDepth: 24 },
    console, setTimeout, setInterval, clearTimeout, clearInterval, Date, Intl, Math, Promise,
    fetch: async (url, op) => { llamadas.push({ url, op }); return { ok: true, status: 200, json: async () => ({ ok: true, estado: 'pendiente-correo' }) }; }
  }, extra || {});
  const fuente = fs.readFileSync(path.join(RAIZ, 'assets', 'js', 'club.js'), 'utf8').replace('const ZOORIGEN_CLUB =', 'result =');
  vm.runInNewContext(fuente, contexto, { filename: 'club.js' });
  return { club: contexto.result, almacen, llamadas, contexto };
}
const usuario = (extra) => Object.assign({ uid: 'abc123xyz', getIdToken: async () => 'TOKEN' }, extra);

/* ───────────── enlace, código y compartir ───────────── */

test('el código es ZOO- + 6 primeras letras del UID en mayúsculas y el enlace usa ?ref=', () => {
  assert.equal(R.codigoLocal('abcdef123456'), 'ZOO-ABCDEF');
  assert.equal(R.enlaceLocal('ZOO-ABCDEF'), 'https://www.zoorigen.com/pages/club-registro.html?ref=ZOO-ABCDEF');
});

test('los botones de compartir llevan el enlace codificado (WhatsApp, Facebook, X y correo)', () => {
  const enlace = 'https://www.zoorigen.com/pages/club-registro.html?ref=ZOO-ABCDEF';
  const e = R.enlacesCompartir(enlace);
  assert.match(e.whatsapp, /^https:\/\/wa\.me\/\?text=/);
  assert.ok(decodeURIComponent(e.whatsapp).includes(enlace));
  assert.ok(e.facebook.startsWith('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(enlace)));
  assert.match(e.x, /^https:\/\/twitter\.com\/intent\/tweet\?text=/);
  assert.match(e.correo, /^mailto:\?subject=.+&body=.+/);
  for (const url of Object.values(e)) assert.equal(/\p{Extended_Pictographic}/u.test(decodeURIComponent(url)), false, 'sin emojis en el texto nuevo');
});

/* ───────────── normalizar la respuesta ───────────── */

const RESP = {
  ok: true, codigo: 'ZOO-ABCDEF', enlace: 'https://www.zoorigen.com/pages/club-registro.html?ref=ZOO-ABCDEF',
  validos: 4, pendientes: 1, rechazados: 1, puntosTotales: 160,
  invitados: [
    { alias: 'María G.', fecha: '2026-10-03T12:00:00.000Z', estado: 'valido', puntos: 160, hitos: [
      { clave: 'pago', texto: 'Tu invitado pagó una suscripción', puntos: 120, logrado: true },
      { clave: 'retos5', texto: 'Completó 5 retos', puntos: 40, logrado: true },
      { clave: 'retos15', texto: 'Completó 15 retos', puntos: 80, logrado: false }] },
    { alias: 'Carlos M.', fecha: '2026-10-07T12:00:00.000Z', estado: 'pendiente-correo' },
    { alias: 'Sofía T.', fecha: '2026-10-08T12:00:00.000Z', estado: 'rechazado', motivo: 'Se registró desde el mismo dispositivo que tú.' }
  ],
  premios: [
    { clave: 'referidos-1', requisito: '4 invitados válidos', faltan: 0, ganado: true, usado: null }
  ]
};

test('normalizarEstado conserva lo importante y calcula premios', () => {
  const e = R.normalizarEstado(RESP, 'abcdef123456');
  assert.equal(e.codigo, 'ZOO-ABCDEF');
  assert.equal(e.validos, 4);
  assert.equal(e.invitados.length, 3);
  assert.equal(e.premios.length, 1, 'un solo premio de referidos');
  assert.deepEqual(e.premios.map(p => [p.clave, p.meta, p.disponible]), [['referidos-1', 4, true]]);
  assert.equal(R.hayPremioDisponible(e), true);
  assert.equal(e.premios[0].faltan, 0);
});

test('normalizarEstado resiste respuestas vacías o rarísimas sin lanzar errores', () => {
  for (const mala of [null, undefined, 42, 'x', [], { invitados: 'no' }, { invitados: [null, 3, { estado: 'inventado' }], premios: [null, 7] }]) {
    const e = R.normalizarEstado(mala, 'zzz999');
    assert.equal(e.codigo, 'ZOO-ZZZ999');
    assert.equal(e.premios.length, 1, 'siempre se muestra el premio de 4 amigos');
    assert.equal(e.premios[0].meta, 4);
    assert.equal(R.hayPremioDisponible(e), false);
    assert.ok(Array.isArray(e.invitados));
  }
  const raro = R.normalizarEstado({ invitados: [{ estado: 'inventado' }] }, 'a');
  assert.equal(raro.invitados[0].estado, 'pendiente-correo', 'un estado desconocido nunca cuenta como válido');
  assert.equal(raro.invitados[0].alias, 'Invitado');
});

test('un enlace que no es https del servidor se ignora y se usa el calculado', () => {
  const e = R.normalizarEstado({ enlace: 'javascript:alert(1)', codigo: 'ZOO-AAAAAA' }, 'x');
  assert.equal(e.enlace, 'https://www.zoorigen.com/pages/club-registro.html?ref=ZOO-AAAAAA');
});

test('un premio ganado y ya usado no vuelve a estar disponible', () => {
  const resp = JSON.parse(JSON.stringify(RESP));
  resp.premios[0].usado = { cursoId: 'c1', fecha: '2026-10-08T18:00:00.000Z' };
  const e = R.normalizarEstado(resp, 'u');
  assert.equal(e.premios[0].disponible, false);
  assert.equal(R.hayPremioDisponible(e), false);
  assert.match(R.renderPremio(e.premios[0], true), /Ya lo usaste el 8 oct 2026/);
});

test('la barra de progreso va de 0 a 4 con una sola marca de premio al final', () => {
  const p = R.progreso(R.normalizarEstado(RESP, 'u'));
  assert.deepEqual([p.validos, p.total, p.pct, p.marcas], [4, 4, 100, [100]]);
  assert.deepEqual(R.progreso(R.normalizarEstado({ validos: 1 }, 'u')).pct, 25);
  assert.deepEqual(R.progreso(R.normalizarEstado({ validos: 3 }, 'u')).pct, 75);
  assert.equal(R.progreso(R.normalizarEstado({ validos: 99 }, 'u')).pct, 100);
  assert.equal(R.progreso(R.normalizarEstado({}, 'u')).pct, 0);
});

/* ───────────── dibujo ───────────── */

test('estados del invitado: Confirmado, Falta confirmar su correo y No válido (con motivo)', () => {
  const e = R.normalizarEstado(RESP, 'u');
  const html = R.renderInvitados(e);
  assert.match(html, /Confirmado/);
  assert.match(html, /Falta confirmar su correo/);
  assert.match(html, /No válido/);
  assert.match(html, /Se registró desde el mismo dispositivo que tú\./);
  assert.match(html, /Aceptó tu invitación el 3 oct 2026|Aceptó tu invitación el 2 oct 2026/);
});

test('los hitos muestran el texto con sus puntos y el total del invitado', () => {
  const html = R.renderInvitados(R.normalizarEstado(RESP, 'u'));
  assert.match(html, /Tu invitado pagó una suscripción: \+120 puntos/);
  assert.match(html, /Completó 5 retos: \+40 puntos/);
  assert.match(html, /Completó 15 retos: \+80 puntos[^<]*<em>\(pendiente\)<\/em>/);
  assert.match(html, /Puntos de este invitado: <strong>160<\/strong>/);
  assert.equal(R.textoHito({ texto: 'Tu invitado pagó: +120 puntos', puntos: 120 }), 'Tu invitado pagó: +120 puntos', 'no duplica los puntos si el servidor ya los puso');
});

test('el total de puntos y los conteos salen en el resumen', () => {
  const html = R.renderResumen(R.normalizarEstado(RESP, 'u'));
  assert.match(html, />4<\/div><div class="zc-dato__l">Confirmados/);
  assert.match(html, />1<\/div><div class="zc-dato__l">Por confirmar/);
  assert.match(html, />160<\/div><div class="zc-dato__l">Puntos ganados/);
});

test('lista vacía amable y error con botón Reintentar', () => {
  assert.match(R.renderInvitados(R.normalizarEstado({}, 'u')), /Todavía nadie ha usado tu enlace/);
  const err = R.renderError('Sin conexión');
  assert.match(err, /data-reintentar/);
  assert.match(err, /Reintentar/);
  assert.match(R.renderError(), /No pudimos cargar tus invitados/);
});

test('con premio y membresía sale "Elegir mi curso"; sin membresía, mensaje claro y Suscribirme', () => {
  const e = R.normalizarEstado(RESP, 'u');
  const con = R.renderPremios(e, true);
  assert.match(con, /data-canjear/);
  assert.match(con, /Elegir mi curso/);
  const sin = R.renderPremios(e, false);
  assert.doesNotMatch(sin, /data-canjear/);
  assert.match(sin, /El premio se canjea con membresía activa/);
  assert.match(sin, /href="club-suscripcion\.html"/);
  assert.match(R.renderPremios(R.normalizarEstado({ validos: 1 }, 'u'), true), /Te faltan 3 amigos válidos/);
  assert.match(R.renderPremios(R.normalizarEstado({ validos: 3 }, 'u'), true), /Te falta 1 amigo válido/);
});

test('todo lo que viene del servidor se escapa (alias y motivo con HTML no se ejecutan)', () => {
  const malo = { validos: 1, invitados: [
    { alias: '<img src=x onerror=alert(1)>', estado: 'valido', hitos: [{ clave: 'x', texto: '<script>alert(2)</script>', puntos: 5, logrado: true }] },
    { alias: '"><svg onload=alert(3)>', estado: 'rechazado', motivo: '<b onmouseover=alert(4)>mal</b>' }
  ] };
  const html = R.renderInvitados(R.normalizarEstado(malo, 'u'));
  assert.doesNotMatch(html, /<img|<script|<svg onload|<b /);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /&lt;b onmouseover=alert\(4\)&gt;mal&lt;\/b&gt;/);
});

test('el texto de "cómo cuenta un invitado" es honesto: correo confirmado, dispositivo distinto y que no es infalible', () => {
  const html = R.renderComoCuenta();
  assert.match(html, /Confirma su correo/);
  assert.match(html, /dispositivo distinto/);
  assert.match(html, /no es infalible/);
});

test('la pantalla nueva no usa emojis', () => {
  for (const rel of ['assets/js/club-referidos.js', 'pages/club-referidos.html', 'pages/club-directorio.html', 'pages/club-canal.html', 'assets/js/club-directorio.js']) {
    const t = fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/☰/g, '');
    assert.equal(/\p{Extended_Pictographic}/u.test(t), false, rel + ' tiene emojis');
  }
});

/* ───────────── dispositivo y registro del invitado (club.js) ───────────── */

test('getDeviceId crea un UUID, lo guarda en zoo_device_id y lo reutiliza', () => {
  const { club, almacen } = crearClub();
  const id = club.getDeviceId();
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  assert.equal(almacen.get('zoo_device_id'), id);
  assert.equal(club.getDeviceId(), id);
  almacen.set('zoo_device_id', 'basura');
  const otro = club.getDeviceId();
  assert.notEqual(otro, 'basura');
  assert.equal(almacen.get('zoo_device_id'), otro, 'un valor inválido se reemplaza');
});

test('getDeviceId sigue funcionando si el navegador no deja guardar', () => {
  const { club } = crearClub({ localStorage: { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); }, removeItem() { throw new Error('bloqueado'); } } });
  assert.match(club.getDeviceId(), /^[0-9a-f-]{36}$/);
});

test('getHuella es estable para el mismo navegador y cambia si cambia pantalla, idioma o zona', () => {
  const a = crearClub().club.getHuella();
  assert.match(a, /^[0-9a-f]{14}$/);
  assert.equal(crearClub().club.getHuella(), a);
  assert.notEqual(crearClub({ screen: { width: 390, height: 844, colorDepth: 24 } }).club.getHuella(), a);
  assert.notEqual(crearClub({ navigator: { userAgent: 'Mozilla/5.0 (Prueba) Chrome/120', language: 'en-US' } }).club.getHuella(), a);
  assert.notEqual(crearClub({ navigator: { userAgent: 'Otro navegador', language: 'es-MX' } }).club.getHuella(), a);
});

test('registrarReferido sin código guardado no llama al servidor', async () => {
  const { club, llamadas } = crearClub();
  const r = await club.registrarReferido(usuario());
  assert.equal(r.ok, false);
  assert.equal(llamadas.length, 0);
});

test('registrarReferido manda código, deviceId y huella con el ID token, y limpia el código al lograrlo', async () => {
  const { club, almacen, llamadas } = crearClub();
  almacen.set('zoo_refCode', 'zoo-abcdef');
  const r = await club.registrarReferido(usuario());
  assert.equal(r.ok, true);
  assert.equal(r.estado, 'pendiente-correo');
  assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0].url, 'https://zoorigen-webhook-production.up.railway.app/api/referidos/registrar');
  assert.equal(llamadas[0].op.method, 'POST');
  assert.equal(llamadas[0].op.headers.Authorization, 'Bearer TOKEN');
  const cuerpo = JSON.parse(llamadas[0].op.body);
  assert.equal(cuerpo.codigo, 'ZOO-ABCDEF');
  assert.equal(cuerpo.deviceId, almacen.get('zoo_device_id'));
  assert.match(cuerpo.huella, /^[0-9a-f]{14}$/);
  assert.equal(almacen.has('zoo_refCode'), false);
  assert.equal(almacen.has('zoo_ref_pendiente'), false);
});

test('si el servidor falla, registrarReferido NO lanza error y deja el registro pendiente', async () => {
  for (const fetchMalo of [async () => { throw new Error('sin red'); }, async () => ({ ok: false, status: 500, json: async () => ({ error: 'Falla' }) })]) {
    const { club, almacen } = crearClub({ fetch: fetchMalo });
    almacen.set('zoo_refCode', 'ZOO-ABCDEF');
    const r = await club.registrarReferido(usuario());
    assert.equal(r.ok, false);
    assert.equal(almacen.get('zoo_ref_pendiente'), '1');
    assert.equal(almacen.get('zoo_refCode'), 'ZOO-ABCDEF', 'el código se conserva para el reintento');
  }
});

test('el panel reintenta UNA sola vez el registro pendiente', async () => {
  const { club, almacen, llamadas } = crearClub({ fetch: async () => { throw new Error('sin red'); } });
  almacen.set('zoo_refCode', 'ZOO-ABCDEF');
  await club.registrarReferido(usuario());              // falla en el registro
  const intentosAntes = 1;
  const r1 = await club.reintentarReferidoPendiente(usuario());   // reintento (vuelve a fallar)
  assert.equal(r1.ok, false);
  const r2 = await club.reintentarReferidoPendiente(usuario());   // ya no reintenta
  assert.equal(r2.motivo, 'nada-pendiente');
  assert.equal(almacen.has('zoo_refCode'), false, 'tras el único reintento se descarta el código');
  void llamadas; void intentosAntes;
});

test('un reintento que sí llega limpia todo', async () => {
  const { club, almacen } = crearClub();
  almacen.set('zoo_refCode', 'ZOO-ABCDEF');
  almacen.set('zoo_ref_pendiente', '1');
  const r = await club.reintentarReferidoPendiente(usuario());
  assert.equal(r.ok, true);
  assert.equal(almacen.has('zoo_ref_pendiente'), false);
  assert.equal(almacen.has('zoo_refCode'), false);
});

test('club.js ya no escribe referredBy desde el navegador', () => {
  const fuente = fs.readFileSync(path.join(RAIZ, 'assets', 'js', 'club.js'), 'utf8');
  assert.doesNotMatch(fuente, /docData\.referredBy\s*=/);
  assert.doesNotMatch(fuente, /referredBy:/);
  for (const rel of ['pages/club-registro.html', 'pages/club-referidos.html', 'pages/club-dashboard.html']) {
    assert.doesNotMatch(fs.readFileSync(path.join(RAIZ, rel), 'utf8'), /referredBy\s*:/, rel);
  }
});

test('el registro con correo envía el correo de confirmación (servidor, con respaldo de Firebase)', () => {
  const fuente = fs.readFileSync(path.join(RAIZ, 'assets', 'js', 'club.js'), 'utf8');
  assert.match(fuente, /this\.enviarCorreoVerificacion\(cred\.user\)/);
  assert.match(fuente, /u\.sendEmailVerification\(\)/, 'respaldo de Firebase');
  assert.match(fuente, /registrarReferido\(cred\.user\)/);
  assert.match(fuente, /nuevo \? await this\._conTiempo\(this\.registrarReferido\(user\)/, 'Google: solo cuentas nuevas se registran como invitadas');
});

test('necesitaConfirmarCorreo: solo cuentas de correo sin confirmar (Google no)', () => {
  const { club } = crearClub();
  assert.equal(club.necesitaConfirmarCorreo({ emailVerified: false, providerData: [{ providerId: 'password' }] }), true);
  assert.equal(club.necesitaConfirmarCorreo({ emailVerified: false }), true);
  assert.equal(club.necesitaConfirmarCorreo({ emailVerified: true, providerData: [{ providerId: 'password' }] }), false);
  assert.equal(club.necesitaConfirmarCorreo({ emailVerified: false, providerData: [{ providerId: 'google.com' }] }), false);
  assert.equal(club.necesitaConfirmarCorreo(null), false);
});

/* ───────────── nivel y XP: ya no son locales ───────────── */

test('las funciones de XP locales quedaron como no-op seguro (misma firma, sin guardar nada)', () => {
  const { club, almacen } = crearClub();
  assert.equal(club.awardAchievement('u1', 'first_course'), false);
  assert.equal(club.showAchievementToast({ name: 'x' }), undefined);
  assert.equal(club.showLevelUpModal({ level: 2 }), undefined);
  const p = club.getProgress({ uid: 'u1', planTipo: 'anual' });
  assert.equal(p.xp, 0, 'sin XP inventado (antes daba +20 y +300 al instante)');
  assert.equal(p.unlockedAchievements.length, 0);
  assert.equal([...almacen.keys()].some(k => k.startsWith('zoo_progress_')), false, 'ya no se escribe zoo_progress_<uid>');
  assert.equal(club.ACHIEVEMENTS.length, 0);
});

test('la tarjeta de nivel se dibuja con los datos del servidor y tiene respaldo si falla', () => {
  const { club } = crearClub();
  const datos = { ok: true, nivel: { id: 2, nombre: 'Técnico', xp: 640, desde: 300, hasta: 1200, faltan: 560 }, xp: { total: 640 }, racha: 4, diasActivos: 9, logros: [{ ganado: true }, { ganado: false }], disponibles: 1 };
  const html = club.renderLevelCard(datos);
  assert.match(html, /NIVEL 2 DE 5/);
  assert.match(html, /Técnico/);
  assert.match(html, /640 XP/);
  assert.match(html, /560 XP para Profesional/);
  assert.match(html, /width: 38%/);
  assert.match(club.renderMyStats(datos), /Premios listos/);
  const caida = club.renderLevelCard(null);
  assert.match(caida, /No pudimos cargar tu nivel/);
  assert.match(caida, /data-nivel-reintentar/);
  assert.match(club.renderLevelCard({ nivel: { id: 5, nombre: 'Maestro', xp: 5000, desde: 4500, hasta: 99999, faltan: 0 }, xp: { total: 5000 } }), /Nivel máximo/);
  assert.doesNotMatch(club.renderLevelCard({ nivel: { id: 3, nombre: '<b>x</b>', xp: 1300 }, xp: { total: 1300 } }), /<b>x/);
});

test('fetchPremios y apiFetch usan el ID token y devuelven errores claros', async () => {
  const pedidos = [];
  const user = { getIdToken: async () => 'T1' };
  const { club } = crearClub({
    auth: { currentUser: user },
    fetch: async (url, op) => { pedidos.push({ url, op }); return { ok: true, status: 200, json: async () => ({ ok: true, nivel: { id: 1 } }) }; }
  });
  const d = await club.fetchPremios(true);
  assert.equal(d.ok, true);
  assert.equal(pedidos[0].url, 'https://zoorigen-webhook-production.up.railway.app/api/premios');
  assert.equal(pedidos[0].op.headers.Authorization, 'Bearer T1');
  assert.equal(pedidos[0].op.cache, 'no-store');

  const { club: c2 } = crearClub({ auth: { currentUser: user }, fetch: async () => ({ ok: false, status: 403, json: async () => ({ error: 'Necesitas membresía.' }) }) });
  await assert.rejects(() => c2.apiFetch('/api/x'), e => e.status === 403 && e.message === 'Necesitas membresía.');
  const { club: c3 } = crearClub({ auth: { currentUser: user }, fetch: async () => { throw new Error('boom'); } });
  await assert.rejects(() => c3.apiFetch('/api/x'), e => e.status === 0 && /conexión/.test(e.message));
  const { club: c4 } = crearClub({ auth: { currentUser: null } });
  await assert.rejects(() => c4.apiFetch('/api/x'), e => e.status === 401);
});

/* ───────────── Adenda 2: un solo premio con 4 invitados ───────────── */

test('un premio "referidos-2" viejo que mande el servidor ya no se muestra: solo el de 4 amigos', () => {
  const e = R.normalizarEstado({ validos: 5, premios: [{ clave: 'referidos-2', requisito: '6 invitados válidos', faltan: 1 }, { clave: 'referidos-1', requisito: '4 invitados válidos', ganado: true }] }, 'u');
  assert.deepEqual(e.premios.map(p => p.clave), ['referidos-1']);
  assert.equal(e.premios[0].meta, 4);
  assert.deepEqual(Object.keys(R.META_PREMIOS), ['referidos-1']);
  assert.equal(R.META_PREMIOS['referidos-1'], 4);
});

test('la tarjeta de premio y la barra hablan de 4 amigos (nada de 3 ni 6)', () => {
  const e = R.normalizarEstado({ validos: 2 }, 'u');
  const premio = R.renderPremios(e, true);
  assert.match(premio, /Premio por invitar a 4 amigos/);
  assert.match(premio, /4 invitados válidos/);
  assert.match(premio, /Te faltan 2 amigos válidos/);
  assert.equal((premio.match(/class="zc-premio[ "]/g) || []).length, 1, 'una sola tarjeta de premio');
  const barra = R.renderBarra(e);
  assert.match(barra, /2 de 4 invitados válidos/);
  assert.match(barra, /aria-valuemax="4"/);
  assert.equal((barra.match(/zc-barra__marca/g) || []).length, 1);
  assert.doesNotMatch(barra + premio, /Premio 2|a los 6|6 invitados|3 invitados/);
  assert.match(R.renderBarra(R.normalizarEstado({ validos: 9 }, 'u')), /4 de 4 invitados válidos/, 'la barra no pasa de 4');
});

test('las páginas ya no mencionan 3 ni 6 amigos ni "dos premios"', () => {
  for (const rel of ['pages/club-referidos.html', 'pages/club-dashboard.html', 'assets/js/club-referidos.js', 'assets/js/club-premios.js', 'pages/club-logros.html']) {
    const t = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
    assert.doesNotMatch(t, /Invita a (3|6) amigos|\b(3|6) amigos\b|\b(3|6) invitados\b|referidos-2|dos premios|segundo premio|Premio 2/i, rel);
  }
  const ref = fs.readFileSync(path.join(RAIZ, 'pages/club-referidos.html'), 'utf8');
  assert.match(ref, /Con 4 amigos válidos ganas tu premio/);
  const dash = fs.readFileSync(path.join(RAIZ, 'pages/club-dashboard.html'), 'utf8');
  assert.match(dash, /Invita a 4 amigos y adelanta un curso/);
  assert.match(dash, /META_REFERIDOS = 4/);
});
