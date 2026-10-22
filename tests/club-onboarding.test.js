'use strict';

// Lógica de la secuencia de bienvenida (sin pantalla). Ejecutar: node --test tests/club-onboarding.test.js

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const O = require(path.join(__dirname, '..', 'assets', 'js', 'club-onboarding.js'));

const RAIZ = path.join(__dirname, '..');
const AHORA = new Date('2026-10-15T12:00:00.000Z');
const diasAtras = n => new Date(AHORA.getTime() - n * 86400000).toISOString();
const SIN_PLAN = { uid: 'u1', email: 'ana@example.com', name: 'Ana', role: 'member', planActivo: false, planStatus: 'pending_payment', createdAt: diasAtras(0.01) };
const ELEGIBLE = { elegible: true, elegida: null, motivo: 'nunca-ha-pagado', cursosElegibles: [{ id: 'c1' }] };

const miembro = (extra) => Object.assign({}, SIN_PLAN, extra);
const plan = (session, extra) => O.planificar(Object.assign({ session, marcas: {}, estado: ELEGIBLE, welcome: false, ahora: AHORA }, extra));

/* ───────────── nombre del certificado ───────────── */

test('nombre: acepta nombre con apellido y limpia espacios', () => {
  const r = O.validarNombre('  Mariana   Torres  Ramírez ');
  assert.equal(r.ok, true);
  assert.equal(r.valor, 'Mariana Torres Ramírez');
});

test('nombre: mínimo 3 caracteres y al menos un apellido', () => {
  for (const malo of ['', '  ', 'Al', 'Ana', 'Ana ', 'A B', 'Juan de', 'María de la']) {
    const r = O.validarNombre(malo);
    assert.equal(r.ok, false, JSON.stringify(malo));
    assert.match(r.error, /apellido/);
  }
  assert.equal(O.validarNombre('Li Wu').ok, true);
  assert.equal(O.validarNombre('María de la Cruz').ok, true);
  assert.equal(O.validarNombre('José Luis').ok, true);
});

test('nombre: máximo 38 caracteres (exacto)', () => {
  const justo = 'Maximiliano Fernandez Hernandez Lopez'; // 37
  assert.equal(justo.length, 37);
  assert.equal(O.validarNombre(justo).ok, true);
  const t38 = 'Maximiliano Fernandez Hernandez Lopezz';
  assert.equal(t38.length, 38);
  assert.equal(O.validarNombre(t38).ok, true);
  const t39 = t38 + 'a';
  const r = O.validarNombre(t39);
  assert.equal(r.ok, false);
  assert.equal(r.codigo, 'largo');
});

test('nombre: rechaza números, símbolos y etiquetas', () => {
  for (const malo of ['Ana 2 Pérez', 'Ana <b>Pérez</b>', 'Ana Pérez!', 'Ana@Pérez', '123 456', '$$ Ana']) {
    const r = O.validarNombre(malo);
    assert.equal(r.ok, false, malo);
  }
  assert.equal(O.validarNombre("Ana D'Angelo").ok, true);
  assert.equal(O.validarNombre('Ana-Lucía Pérez').ok, true);
  assert.equal(O.validarNombre('Zoë Núñez').ok, true);
});

test('nombre: todo en minúsculas o MAYÚSCULAS se acomoda; lo demás se respeta tal cual', () => {
  assert.equal(O.validarNombre('mariana torres').valor, 'Mariana Torres');
  assert.equal(O.validarNombre('JOSÉ LUIS DE LA CRUZ').valor, 'José Luis de la Cruz');
  assert.equal(O.validarNombre('María del Carmen López').valor, 'María del Carmen López');
  assert.equal(O.validarNombre('Ana McGregor').valor, 'Ana McGregor');
  assert.equal(O.validarNombre('ana-lucía pérez').valor, 'Ana-Lucía Pérez');
});

test('nombre: aviso en vivo al acercarse al límite', () => {
  assert.equal(O.avisoLongitud('Ana Pérez'), '');
  assert.match(O.avisoLongitud('a'.repeat(33)), /no sea más largo/);
  assert.match(O.avisoLongitud('a'.repeat(35)), /máximo/);
});

test('nombre: solo propone un nombre que ya parece completo y real', () => {
  assert.equal(O.sugerirNombre({ name: 'Ana Pérez López', email: 'x@y.com' }), 'Ana Pérez López');
  assert.equal(O.sugerirNombre({ name: 'ana', email: 'ana@y.com' }), '');
  assert.equal(O.sugerirNombre({ name: 'ana.perez', email: 'ana.perez@y.com' }), '');
  assert.equal(O.sugerirNombre({ name: 'Ana 77', email: 'x@y.com' }), '');
  assert.equal(O.sugerirNombre({ nombreCertificado: 'Luis Gómez', name: 'Otro Nombre', email: 'x@y.com' }), 'Luis Gómez');
  assert.equal(O.sugerirNombre(null), '');
  assert.equal(O.primerNombre({ name: 'mariana torres' }), 'Mariana');
  assert.equal(O.primerNombre({ email: 'zoe@x.com' }), 'Zoe');
});

test('guardar nombre: escribe solo nombreCertificado (merge lo pone quien llama) y valida antes', async () => {
  const escritos = [];
  const ok = await O.guardarNombreCertificado({ nombre: 'luis gómez', escribirRemoto: async obj => { escritos.push(obj); } });
  assert.deepEqual(ok, { ok: true, valor: 'Luis Gómez' });
  assert.deepEqual(escritos, [{ nombreCertificado: 'Luis Gómez' }]);

  const invalido = await O.guardarNombreCertificado({ nombre: 'Luis', escribirRemoto: async obj => { escritos.push(obj); } });
  assert.equal(invalido.ok, false);
  assert.equal(escritos.length, 1, 'un nombre inválido no se escribe');

  const falla = await O.guardarNombreCertificado({ nombre: 'Luis Gómez', escribirRemoto: async () => { throw new Error('sin red'); } });
  assert.equal(falla.ok, false);
  assert.match(falla.error, /No pudimos guardar/);
  const sinDestino = await O.guardarNombreCertificado({ nombre: 'Luis Gómez' });
  assert.equal(sinDestino.ok, false);
});

/* ───────────── cuenta nueva ───────────── */

test('cuenta nueva: menos de 3 días', () => {
  assert.equal(O.esCuentaNueva(diasAtras(0), AHORA), true);
  assert.equal(O.esCuentaNueva(diasAtras(2.9), AHORA), true);
  assert.equal(O.esCuentaNueva(diasAtras(3.1), AHORA), false);
  assert.equal(O.esCuentaNueva(null, AHORA), false);
  assert.equal(O.esCuentaNueva('basura', AHORA), false);
  assert.equal(O.esCuentaNueva({ seconds: Math.floor(AHORA.getTime() / 1000) - 3600 }, AHORA), true, 'Timestamp de Firestore');
  assert.equal(O.esCuentaNueva({ toDate: () => new Date(AHORA.getTime() - 86400000) }, AHORA), true);
});

/* ───────────── quién ve qué ───────────── */

test('admin: nunca ve nada, aunque sea cuenta nueva y elegible', () => {
  const admin = miembro({ role: 'admin' });
  const r = plan(admin, { welcome: true });
  assert.equal(r.tipo, 'admin');
  assert.deepEqual(r.pasos, []);
  assert.deepEqual(plan(miembro({ role: 'admin', createdAt: diasAtras(400) })).pasos, []);
});

test('sin sesión: no hay nada', () => {
  assert.deepEqual(O.planificar({ session: null, marcas: {}, ahora: AHORA }).pasos, []);
});

test('miembro nuevo sin plan y elegible: bienvenida, nombre, premio +100 XP, recorrido, prueba (en ese orden)', () => {
  const r = plan(miembro());
  assert.equal(r.tipo, 'nuevo');
  assert.deepEqual(r.pasos, ['bienvenida', 'nombre', 'premio', 'tour', 'prueba']);
});

test('miembro nuevo: llega con ?welcome=1 aunque falte el dato de fecha', () => {
  const r = plan(miembro({ createdAt: null }), { welcome: true });
  assert.equal(r.tipo, 'nuevo');
  assert.deepEqual(r.pasos, ['bienvenida', 'nombre', 'premio', 'tour', 'prueba']);
  assert.equal(plan(miembro({ createdAt: null })).tipo, 'retorno', 'sin welcome y sin fecha se trata como cuenta antigua');
});

test('?welcome=1 en una cuenta vieja (más de 30 días) no la vuelve "nueva"', () => {
  const r = plan(miembro({ createdAt: diasAtras(90) }), { welcome: true });
  assert.notEqual(r.tipo, 'nuevo');
  assert.equal(plan(miembro({ createdAt: diasAtras(10) }), { welcome: true }).tipo, 'nuevo');
});

test('miembro nuevo con el servidor caído (estado null): ve bienvenida, nombre y recorrido, pero NO la prueba', () => {
  const r = plan(miembro(), { estado: null });
  assert.deepEqual(r.pasos, ['bienvenida', 'nombre', 'premio', 'tour']);
});

test('miembro nuevo con estado aún desconocido: la prueba queda como posible (se decide al llegar)', () => {
  assert.deepEqual(plan(miembro(), { estado: undefined }).pasos, ['bienvenida', 'nombre', 'premio', 'tour', 'prueba']);
});

test('miembro nuevo que ya eligió curso o no es elegible: sin tarjeta de prueba', () => {
  assert.deepEqual(plan(miembro(), { estado: { elegible: false, elegida: null } }).pasos, ['bienvenida', 'nombre', 'premio', 'tour']);
  assert.deepEqual(plan(miembro(), { estado: { elegible: true, elegida: { cursoId: 'c1' } } }).pasos, ['bienvenida', 'nombre', 'premio', 'tour']);
  assert.deepEqual(plan(miembro(), { estado: { elegible: 'true' } }).pasos, ['bienvenida', 'nombre', 'premio', 'tour'], 'solo elegible === true cuenta');
});

test('miembro nuevo con plan activo: no se duplica la bienvenida VIP ni se ofrece prueba', () => {
  const vence = new Date(Date.now() + 20 * 86400000).toISOString();
  const pagado = miembro({ planActivo: true, planStatus: 'active', planVence: vence, planTipo: 'mensual' });
  assert.deepEqual(plan(pagado).pasos, ['nombre', 'premio', 'tour'], 'el premio de bienvenida también es para quien ya paga');
});

test('se reanuda donde se quedó: solo lo que falta', () => {
  const m = { bienvenidaVista: '2026-10-15T10:00:00.000Z' };
  assert.deepEqual(plan(miembro(), { marcas: m }).pasos, ['nombre', 'premio', 'tour', 'prueba']);
  m.nombreVisto = '2026-10-15T10:01:00.000Z';
  assert.deepEqual(plan(miembro(), { marcas: m }).pasos, ['premio', 'tour', 'prueba']);
  m.premioVisto = '2026-10-15T10:01:30.000Z';
  assert.deepEqual(plan(miembro(), { marcas: m }).pasos, ['tour', 'prueba']);
  m.tourVisto = '2026-10-15T10:02:00.000Z';
  assert.deepEqual(plan(miembro(), { marcas: m }).pasos, ['prueba']);
  m.pruebaIntroVista = '2026-10-15T10:03:00.000Z';
  assert.deepEqual(plan(miembro(), { marcas: m }).pasos, []);
});

test('si ya tiene nombre de certificado válido, no se lo vuelve a pedir', () => {
  assert.deepEqual(plan(miembro({ nombreCertificado: 'Ana Pérez' })).pasos, ['bienvenida', 'premio', 'tour', 'prueba']);
  assert.deepEqual(plan(miembro({ nombreCertificado: 'x' })).pasos, ['bienvenida', 'nombre', 'premio', 'tour', 'prueba'], 'uno inválido no cuenta');
});

test('miembro antiguo que nunca ha pagado y es elegible: UNA sola tarjeta de regreso', () => {
  const vieja = miembro({ createdAt: diasAtras(120) });
  const r = plan(vieja);
  assert.equal(r.tipo, 'retorno');
  assert.deepEqual(r.pasos, ['retorno']);
});

test('miembro antiguo: sin tarjeta si el servidor cayó, no es elegible, ya eligió, ya la vio o ya había visto la intro', () => {
  const vieja = miembro({ createdAt: diasAtras(120) });
  assert.deepEqual(plan(vieja, { estado: null }).pasos, []);
  assert.deepEqual(plan(vieja, { estado: undefined }).pasos, []);
  assert.deepEqual(plan(vieja, { estado: { elegible: false } }).pasos, []);
  assert.deepEqual(plan(vieja, { estado: { elegible: true, elegida: { cursoId: 'c2' } } }).pasos, []);
  assert.deepEqual(plan(vieja, { marcas: { retornoVisto: '2026-10-01T00:00:00.000Z' } }).pasos, []);
  assert.deepEqual(plan(vieja, { marcas: { pruebaIntroVista: '2026-10-01T00:00:00.000Z' } }).pasos, []);
});

test('miembro antiguo con plan activo o que ya pagó alguna vez: nunca la tarjeta de prueba', () => {
  const vence = new Date(Date.now() + 20 * 86400000).toISOString();
  assert.deepEqual(plan(miembro({ createdAt: diasAtras(120), planActivo: true, planStatus: 'active', planVence: vence })).pasos, []);
  assert.deepEqual(plan(miembro({ createdAt: diasAtras(120), planStatus: 'expired', planVence: diasAtras(10), planInicio: diasAtras(40) })).pasos, []);
  assert.deepEqual(plan(miembro({ createdAt: diasAtras(120), ultimoPago: diasAtras(60) })).pasos, []);
  assert.deepEqual(plan(miembro({ createdAt: diasAtras(120), stripeSubscriptionId: 'sub_1' })).pasos, []);
  // aunque el servidor dijera que sí, el seguro del navegador no la muestra a quien ya pagó
  assert.equal(O.puedeVerPrueba(ELEGIBLE, miembro({ ultimoPago: diasAtras(60) })), false);
});

test('puedeVerPrueba: solo con elegible === true, sin curso elegido y sin plan', () => {
  assert.equal(O.puedeVerPrueba(ELEGIBLE, SIN_PLAN), true);
  assert.equal(O.puedeVerPrueba(null, SIN_PLAN), false);
  assert.equal(O.puedeVerPrueba(undefined, SIN_PLAN), false);
  assert.equal(O.puedeVerPrueba({ elegible: false }, SIN_PLAN), false);
  assert.equal(O.puedeVerPrueba({ elegible: true, elegida: { cursoId: 'c1' } }, SIN_PLAN), false);
  assert.equal(O.puedeVerPrueba(ELEGIBLE, miembro({ role: 'admin' })), false);
  assert.equal(O.puedeVerPrueba(ELEGIBLE, null), false);
});

/* ───────────── marcas de "ya visto" ───────────── */

function lsFalso(inicial) {
  const datos = Object.assign({}, inicial);
  return { datos, getItem: k => (k in datos ? datos[k] : null), setItem: (k, v) => { datos[k] = String(v); } };
}

test('marcas: se guardan en localStorage y en el documento, y no se repiten', async () => {
  const ls = lsFalso();
  const escritos = [];
  const a = O.crearAlmacen({ uid: 'u1', ls, ahora: () => AHORA, leerRemoto: async () => ({}), escribirRemoto: async o => { escritos.push(o); } });
  await a.cargar();
  assert.equal(await a.marcar('bienvenidaVista'), true);
  assert.equal(a.vista('bienvenidaVista'), true);
  assert.deepEqual(escritos, [{ onboardingZoo: { bienvenidaVista: AHORA.toISOString() } }]);
  assert.equal(JSON.parse(ls.datos['zoo_onb_v1_u1']).bienvenidaVista, AHORA.toISOString());
  await a.marcar('bienvenidaVista');
  assert.equal(escritos.length, 1, 'una marca ya puesta no se vuelve a escribir');
  assert.equal(await a.marcar('inventada'), false);
  assert.equal(a.vista('inventada'), false);
});

test('marcas: reanudar tras cerrar la pestaña (otra instancia con el mismo almacenamiento)', async () => {
  const ls = lsFalso();
  const a = O.crearAlmacen({ uid: 'u1', ls, ahora: () => AHORA, leerRemoto: async () => ({}), escribirRemoto: async () => {} });
  await a.cargar();
  await a.marcar('bienvenidaVista');
  await a.marcar('nombreVisto');
  const b = O.crearAlmacen({ uid: 'u1', ls, ahora: () => AHORA });
  assert.deepEqual(Object.keys(b.marcas()).sort(), ['bienvenidaVista', 'nombreVisto']);
  const r = plan(miembro(), { marcas: b.marcas() });
  assert.deepEqual(r.pasos, ['premio', 'tour', 'prueba']);
  const otra = O.crearAlmacen({ uid: 'otro', ls });
  assert.deepEqual(otra.marcas(), {}, 'cada cuenta tiene sus marcas');
});

test('marcas: las del servidor (otro dispositivo) se suman a las locales', async () => {
  const ls = lsFalso();
  const a = O.crearAlmacen({
    uid: 'u1', ls,
    leerRemoto: async () => ({ onboardingZoo: { tourVisto: { seconds: 1760000000 }, nombreVisto: true, basura: 'x' } })
  });
  const c = await a.cargar();
  assert.equal(c.remotoOk, true);
  assert.equal(a.vista('tourVisto'), true);
  assert.equal(a.vista('nombreVisto'), true);
  assert.equal(a.vista('basura'), false);
  assert.match(a.marcas().tourVisto, /^20\d\d-/);
});

test('marcas: si el documento no se puede leer o escribir, no truena y queda el respaldo local', async () => {
  const ls = lsFalso();
  const a = O.crearAlmacen({ uid: 'u1', ls, ahora: () => AHORA, leerRemoto: async () => { throw new Error('permiso'); }, escribirRemoto: async () => { throw new Error('permiso'); } });
  const c = await a.cargar();
  assert.equal(c.remotoOk, false);
  assert.equal(await a.marcar('tourVisto'), false, 'reporta que no se pudo guardar en el servidor');
  assert.equal(a.vista('tourVisto'), true);
  assert.ok(ls.datos['zoo_onb_v1_u1'], 'pero queda en localStorage');
});

test('marcas: sin localStorage tampoco truena', async () => {
  const a = O.crearAlmacen({ uid: 'u1', ls: null, ahora: () => AHORA, escribirRemoto: async () => {} });
  assert.equal(await a.marcar('tourVisto'), true);
  const roto = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); } };
  const b = O.crearAlmacen({ uid: 'u1', ls: roto });
  await b.marcar('tourVisto');
  assert.equal(b.vista('tourVisto'), true);
});

test('hayMarcas / normalizarMarcas / fusionarMarcas', () => {
  assert.equal(O.hayMarcas({}), false);
  assert.equal(O.hayMarcas(null), false);
  assert.equal(O.hayMarcas({ tourVisto: '2026-01-01' }), true);
  assert.equal(O.hayMarcas({ otra: 'x' }), false);
  assert.deepEqual(O.fusionarMarcas({ tourVisto: '2026-01-01T00:00:00.000Z' }, { tourVisto: '2027-01-01', nombreVisto: true }),
    { tourVisto: '2026-01-01T00:00:00.000Z', nombreVisto: '1' });
});

/* ───────────── estado de la prueba (servidor) ───────────── */

const respuesta = (cuerpo, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => cuerpo });

test('pedirEstadoPrueba: manda el ID token como Bearer y normaliza la respuesta', async () => {
  let visto = null;
  const est = await O.pedirEstadoPrueba({
    url: 'https://x.test/api/prueba-gratuita',
    getToken: async () => 'TOKEN123',
    fetchFn: async (url, op) => { visto = { url, op }; return respuesta({ elegible: true, elegida: null, motivo: 'ok', cursosElegibles: [{ id: 'c1' }] }); }
  });
  assert.equal(visto.url, 'https://x.test/api/prueba-gratuita');
  assert.equal(visto.op.method, 'GET');
  assert.equal(visto.op.headers.Authorization, 'Bearer TOKEN123');
  assert.deepEqual(est, { elegible: true, elegida: null, motivo: 'ok', cursosElegibles: [{ id: 'c1' }] });
});

test('pedirEstadoPrueba: cualquier falla devuelve null (nada de tarjetas de prueba)', async () => {
  const base = { url: 'https://x.test/p', getToken: async () => 't', timeoutMs: 40 };
  assert.equal(await O.pedirEstadoPrueba(Object.assign({}, base, { fetchFn: async () => respuesta({}, false) })), null, 'HTTP 500');
  assert.equal(await O.pedirEstadoPrueba(Object.assign({}, base, { fetchFn: async () => { throw new Error('sin red'); } })), null, 'sin red');
  assert.equal(await O.pedirEstadoPrueba(Object.assign({}, base, { fetchFn: () => new Promise(() => {}) })), null, 'nunca responde (tiempo agotado)');
  assert.equal(await O.pedirEstadoPrueba(Object.assign({}, base, { fetchFn: async () => ({ ok: true, json: () => new Promise(() => {}) }) })), null, 'cuerpo que no llega');
  assert.equal(await O.pedirEstadoPrueba(Object.assign({}, base, { fetchFn: async () => ({ ok: true, json: async () => { throw new Error('no es json'); } }) })), null, 'JSON roto');
  assert.equal(await O.pedirEstadoPrueba(Object.assign({}, base, { fetchFn: async () => respuesta('texto') })), null, 'cuerpo que no es objeto');
  assert.equal(await O.pedirEstadoPrueba(Object.assign({}, base, { getToken: async () => { throw new Error('sin sesión'); }, fetchFn: async () => respuesta(ELEGIBLE) })), null, 'sin token');
  assert.equal(await O.pedirEstadoPrueba(Object.assign({}, base, { getToken: async () => null, fetchFn: async () => respuesta(ELEGIBLE) })), null, 'token vacío');
  assert.equal(await O.pedirEstadoPrueba({ url: 'https://x.test/p', getToken: async () => 't', fetchFn: null }), null);
});

test('pedirEstadoPrueba: el timeout es corto de verdad', async () => {
  const t0 = Date.now();
  await O.pedirEstadoPrueba({ url: 'https://x.test/p', getToken: async () => 't', timeoutMs: 60, fetchFn: () => new Promise(() => {}) });
  assert.ok(Date.now() - t0 < 600);
});

test('normalizarEstadoPrueba: solo elegible === true cuenta; elegida en texto se vuelve objeto', () => {
  assert.equal(O.normalizarEstadoPrueba({ elegible: 'si' }).elegible, false);
  assert.equal(O.normalizarEstadoPrueba({ elegible: 1 }).elegible, false);
  assert.deepEqual(O.normalizarEstadoPrueba({ elegible: false, elegida: 'c7' }).elegida, { cursoId: 'c7' });
  assert.equal(O.normalizarEstadoPrueba(null), null);
  assert.equal(O.normalizarEstadoPrueba([]).elegible, false);
  assert.deepEqual(O.normalizarEstadoPrueba({ elegible: true, cursosElegibles: 'x' }).cursosElegibles, []);
});

/* ───────────── ejecución en cola ───────────── */

test('secuencia: corre una pantalla a la vez, en orden, esperando que no haya otro modal', async () => {
  const bitacora = [];
  const mostrar = {};
  ['a', 'b', 'c'].forEach(id => { mostrar[id] = async () => { bitacora.push('inicia ' + id); await new Promise(r => setTimeout(r, 5)); bitacora.push('fin ' + id); return { como: 'ok' }; }; });
  const res = await O.ejecutarSecuencia(['a', 'b', 'c'], mostrar, { esperarLibre: async () => { bitacora.push('libre?'); return true; } });
  assert.deepEqual(bitacora, ['libre?', 'inicia a', 'fin a', 'libre?', 'inicia b', 'fin b', 'libre?', 'inicia c', 'fin c']);
  assert.deepEqual(res.map(r => r.estado), ['hecho', 'hecho', 'hecho']);
});

test('secuencia: una pantalla que falla no traba a las demás', async () => {
  const vistos = [];
  const res = await O.ejecutarSecuencia(['a', 'b', 'c'], {
    a: async () => { vistos.push('a'); },
    b: async () => { throw new Error('se rompió'); },
    c: async () => { vistos.push('c'); }
  });
  assert.deepEqual(vistos, ['a', 'c']);
  assert.equal(res[1].estado, 'error');
  assert.match(res[1].error, /se rompió/);
});

test('secuencia: si la pantalla pide detener (se fue a elegir curso) ya no se muestran las demás', async () => {
  const vistos = [];
  await O.ejecutarSecuencia(['a', 'b'], { a: async () => { vistos.push('a'); return { detener: true }; }, b: async () => { vistos.push('b'); } });
  assert.deepEqual(vistos, ['a']);
});

test('secuencia: si nunca queda libre (otro modal abierto mucho tiempo) se corta sin mostrar nada', async () => {
  const vistos = [];
  const res = await O.ejecutarSecuencia(['a', 'b'], { a: async () => { vistos.push('a'); }, b: async () => { vistos.push('b'); } }, { esperarLibre: async () => false });
  assert.deepEqual(vistos, []);
  assert.equal(res[0].estado, 'cancelado');
});

test('secuencia: pasos desconocidos se omiten y se puede cancelar', async () => {
  let cancelar = false;
  const vistos = [];
  const res = await O.ejecutarSecuencia(['x', 'a', 'b'], { a: async () => { vistos.push('a'); cancelar = true; }, b: async () => { vistos.push('b'); } }, { cancelado: () => cancelar });
  assert.deepEqual(vistos, ['a']);
  assert.equal(res[0].estado, 'omitido');
});

/* ───────────── contenido ───────────── */

const EMOJI = /\p{Extended_Pictographic}|[☀-➿]|️/u;
function textosPlanos(obj, acc = []) {
  if (typeof obj === 'string') acc.push(obj);
  else if (Array.isArray(obj)) obj.forEach(x => textosPlanos(x, acc));
  else if (obj && typeof obj === 'object') Object.values(obj).forEach(x => textosPlanos(x, acc));
  return acc;
}

test('contenido: ningún texto de las pantallas lleva emojis', () => {
  const todo = [].concat(textosPlanos(O.TEXTOS), textosPlanos(O.diapositivas({ nombre: 'Ana', incluirPrueba: true })), textosPlanos(O.diapositivas({})), textosPlanos(O.pasosTour({})), textosPlanos(O.pasosTour({ planActivo: true })));
  assert.ok(todo.length > 30);
  for (const t of todo) assert.equal(EMOJI.test(t), false, 'emoji en: ' + t);
});

test('contenido: el código de las pantallas tampoco trae emojis', () => {
  for (const f of ['assets/js/club-onboarding.js', 'assets/css/club-onboarding.css']) {
    const t = fs.readFileSync(path.join(RAIZ, f), 'utf8');
    assert.equal(EMOJI.test(t), false, f);
  }
});

test('contenido: la bienvenida tiene portada y 4 diapositivas de beneficios; con o sin prueba', () => {
  const con = O.diapositivas({ nombre: 'Ana', incluirPrueba: true });
  assert.equal(con.length, 5);
  assert.equal(con[0].tipo, 'portada');
  assert.equal(con[0].confeti, true);
  assert.ok(con[0].texto.startsWith('Ana, ya eres parte'));
  assert.deepEqual(con.slice(1).map(s => s.tipo), ['beneficio', 'beneficio', 'beneficio', 'beneficio']);
  assert.equal(con[1].titulo, 'Tu prueba gratuita');
  const sin = O.diapositivas({ incluirPrueba: false });
  assert.equal(sin.length, 5);
  assert.ok(sin.every(s => !/prueba gratuita/i.test(s.titulo)), 'sin prueba no se promete');
  assert.ok(sin[0].texto.startsWith('Ya eres parte'));
  for (const s of con) if (s.icono) assert.ok(require('../assets/js/admin-iconos.js').existe(s.icono), 'icono Lucide existente: ' + s.icono);
});

test('contenido: la tarjeta de regreso invita a elegir y NO menciona la regla de la última clase', () => {
  const r = O.TEXTOS.retorno;
  assert.equal(r.titulo, '¡Bienvenido de nuevo!');
  assert.match(r.texto, /prueba gratuita/);
  assert.equal(r.pasos.length, 3);
  assert.doesNotMatch(JSON.stringify(O.TEXTOS), /menos la última|desbloquea al suscribirte/);
  assert.equal(r.elegir, 'Elegir mi curso');
  assert.equal(r.luego, 'Más tarde');
  assert.equal(O.URL_ELEGIR_CURSO, 'club-biblioteca.html?elegir=1');
});

test('recorrido: cada paso apunta a una opción REAL del menú lateral de club.js', () => {
  const club = fs.readFileSync(path.join(RAIZ, 'assets/js/club.js'), 'utf8');
  const hrefs = new Set([...club.matchAll(/href:\s*'(club-[a-z]+\.html)'/g)].map(m => m[1]));
  const pasos = O.pasosTour({});
  const ids = new Set();
  for (const p of pasos) {
    assert.ok(!ids.has(p.id), 'id repetido ' + p.id); ids.add(p.id);
    assert.ok(p.titulo && p.texto && p.selectores.length);
    if (p.menu) {
      const m = p.selectores[0].match(/href="([^"]+)"/);
      assert.ok(m && hrefs.has(m[1]), 'el menú de club.js no tiene ' + p.selectores[0]);
    }
  }
  assert.ok(pasos.length >= 6 && pasos.length <= 10);
  assert.equal(pasos[pasos.length - 1].id, 'repetir');
  assert.notEqual(O.pasosTour({ planActivo: true }).find(p => p.id === 'suscripcion').texto, O.pasosTour({}).find(p => p.id === 'suscripcion').texto);
});

test('recorrido: la tarjeta se coloca dentro de la pantalla (escritorio y móvil)', () => {
  const dialogo = { width: 380, height: 220 };
  // escritorio: ítem del menú lateral a la izquierda -> la tarjeta va a su derecha
  let l = O.calcularLayoutTour({ rect: { left: 16, top: 200, right: 224, bottom: 244 }, vw: 1280, vh: 800, dialogo, movil: false });
  assert.ok(l.dialogo.left > 224);
  assert.ok(l.dialogo.top >= 12 && l.dialogo.top + dialogo.height <= 800 - 12);
  assert.ok(l.hueco.left < 16 && l.hueco.top < 200, 'el hueco deja margen alrededor');
  // las cuatro sombras rodean el hueco sin traslaparse
  const s = l.sombras;
  assert.equal(s.arriba.height, l.hueco.top);
  assert.equal(s.izquierda.width, l.hueco.left);
  assert.equal(s.derecha.left, l.hueco.left + l.hueco.width);
  assert.equal(s.abajo.top, l.hueco.top + l.hueco.height);
  // botón arriba a la derecha del encabezado: no cabe a la derecha -> a la izquierda
  l = O.calcularLayoutTour({ rect: { left: 1200, top: 20, right: 1242, bottom: 62 }, vw: 1280, vh: 800, dialogo, movil: false });
  assert.ok(l.dialogo.left + dialogo.width <= 1200);
  // móvil: ancho completo, arriba si el elemento está abajo y abajo si el elemento está arriba
  l = O.calcularLayoutTour({ rect: { left: 10, top: 600, right: 300, bottom: 644 }, vw: 375, vh: 800, dialogo: { width: 351, height: 230 }, movil: true });
  assert.equal(l.dialogo.left, 12); assert.equal(l.dialogo.top, 12);
  l = O.calcularLayoutTour({ rect: { left: 10, top: 100, right: 300, bottom: 144 }, vw: 375, vh: 800, dialogo: { width: 351, height: 230 }, movil: true });
  assert.equal(l.dialogo.top, 800 - 230 - 12);
});

/* ───────────── enganche en el panel ───────────── */

test('enganche: el panel carga los archivos y llama al orquestador', () => {
  const html = fs.readFileSync(path.join(RAIZ, 'pages/club-dashboard.html'), 'utf8');
  assert.match(html, /assets\/css\/club-onboarding\.css\?v=/);
  assert.match(html, /assets\/js\/admin-iconos\.js\?v=/);
  assert.match(html, /assets\/js\/club-onboarding\.js\?v=/);
  assert.match(html, /ZOO_ONBOARDING\.iniciar\(\{ session \}\)/);
  assert.ok(html.indexOf('club.js?v=') < html.indexOf('club-onboarding.js?v='), 'club.js va primero');
  assert.match(html, /!window\.ZOO_ONBOARDING\) \{/, 'el mensaje de bienvenida anterior cede su lugar');
  for (const f of ['assets/js/club-onboarding.js', 'assets/css/club-onboarding.css', 'assets/js/admin-iconos.js']) assert.ok(fs.existsSync(path.join(RAIZ, f)), f);
});

test('enganche: el panel carga el módulo de la tarjeta de premio (JS y CSS) antes de la secuencia', () => {
  const html = fs.readFileSync(path.join(RAIZ, 'pages/club-dashboard.html'), 'utf8');
  assert.match(html, /assets\/css\/club-curso-premio\.css\?v=/);
  assert.match(html, /assets\/js\/club-premios\.js\?v=/);
  assert.match(html, /assets\/js\/club-curso-premio\.js\?v=/);
  const i = s => html.indexOf(s);
  assert.ok(i('admin-iconos.js?v=') < i('club-premios.js?v=') && i('club-premios.js?v=') < i('club-curso-premio.js?v=') && i('club-curso-premio.js?v=') < i('club-onboarding.js?v='));
});

/* ───────────── premio de bienvenida +100 XP ───────────── */

const respSrv = (status, datos) => ({ ok: status >= 200 && status < 300, status, datos });
const NIVEL1 = { id: 1, nombre: 'Aprendiz', xp: 100, desde: 0, hasta: 300, faltan: 200 };

test('premio de bienvenida: el orden es splash, nombre, premio, tour, prueba y el premio marca "premioVisto"', () => {
  assert.ok(O.MARCAS.includes('premioVisto'));
  const pasos = plan(miembro()).pasos;
  assert.deepEqual(pasos, ['bienvenida', 'nombre', 'premio', 'tour', 'prueba']);
  assert.equal(pasos.indexOf('premio') - pasos.indexOf('nombre'), 1);
  assert.equal(pasos.indexOf('tour') - pasos.indexOf('premio'), 1);
  assert.deepEqual(plan(miembro(), { marcas: { premioVisto: '2026-10-15T10:00:00.000Z' } }).pasos, ['bienvenida', 'nombre', 'tour', 'prueba']);
  assert.deepEqual(plan(miembro({ role: 'admin' })).pasos, [], 'a un admin nunca se le muestra nada');
  assert.deepEqual(plan(miembro({ createdAt: diasAtras(120) })).pasos, ['retorno'], 'el premio es solo de la secuencia del miembro nuevo');
});

test('reclamarPremioBienvenida: nuevo, ya reclamado, no aplica (400/403) y error', async () => {
  const llamadas = [];
  const con = (r) => async (ruta, metodo) => { llamadas.push([ruta, metodo]); if (r instanceof Error) throw r; return r; };
  assert.equal((await O.reclamarPremioBienvenida({ pedir: con(respSrv(200, { ok: true, xp: 100, yaReclamado: false, xpTotal: 100, nivel: NIVEL1 })) })).estado, 'nuevo');
  assert.deepEqual(llamadas[0], ['/api/premios/bienvenida', 'POST']);
  assert.equal((await O.reclamarPremioBienvenida({ pedir: con(respSrv(200, { ok: true, xp: 100, yaReclamado: true })) })).estado, 'ya');
  assert.equal((await O.reclamarPremioBienvenida({ pedir: con(respSrv(403, { error: 'Tu cuenta ya no es nueva.' })) })).estado, 'no-aplica');
  assert.equal((await O.reclamarPremioBienvenida({ pedir: con(respSrv(400, { error: 'x' })) })).estado, 'no-aplica');
  for (const mala of [respSrv(500, { error: 'x' }), respSrv(200, null), respSrv(200, { ok: false }), respSrv(401, {}), null, new Error('sin red')]) {
    assert.equal((await O.reclamarPremioBienvenida({ pedir: con(mala) })).estado, 'error', String(mala && mala.status));
  }
  assert.equal((await O.reclamarPremioBienvenida({})).estado, 'error', 'sin función para pedir no truena');
});

test('reclamarPremioBienvenida: un servidor que no contesta no atora la secuencia', async () => {
  const t0 = Date.now();
  const r = await O.reclamarPremioBienvenida({ pedir: () => new Promise(() => {}), timeoutMs: 30 });
  assert.equal(r.estado, 'error');
  assert.ok(Date.now() - t0 < 1500);
});

function modulosFalsos(resp) {
  const bitacora = { pedidos: [], tarjetas: [] };
  const tarjetas = {
    calcularBienvenida: d => (d && d.ok ? { tipo: 'bienvenida', xp: d.xp } : null),
    mostrarBienvenida: async (info, opc) => { bitacora.tarjetas.push({ info, opc }); return { como: 'accion' }; }
  };
  const pedirPremios = async (ruta, metodo) => { bitacora.pedidos.push([ruta, metodo]); if (resp instanceof Error) throw resp; return resp; };
  return { bitacora, tarjetas, pedirPremios };
}

test('paso "premio": si es nuevo, pide el premio, muestra la tarjeta y se marca como visto', async () => {
  const m = modulosFalsos(respSrv(200, { ok: true, xp: 100, yaReclamado: false, xpTotal: 100, nivel: NIVEL1 }));
  const r = await O.mostrarPremioBienvenida({ session: miembro(), tarjetas: m.tarjetas, pedirPremios: m.pedirPremios });
  assert.equal(r.como, 'visto');
  assert.ok(!r.sinMarcar);
  assert.equal(m.bitacora.tarjetas.length, 1);
  assert.deepEqual(m.bitacora.tarjetas[0].opc, { sinMembresia: true }, 'sin plan se avisa que el XP queda guardado');
  const vence = new Date(Date.now() + 20 * 86400000).toISOString();
  const con = await O.mostrarPremioBienvenida({ session: miembro({ planActivo: true, planStatus: 'active', planVence: vence }), tarjetas: m.tarjetas, pedirPremios: m.pedirPremios });
  assert.equal(con.como, 'visto');
  assert.deepEqual(m.bitacora.tarjetas[1].opc, { sinMembresia: false });
});

test('paso "premio": ya reclamado o 403 -> NO sale la tarjeta, se marca visto y la secuencia sigue', async () => {
  for (const resp of [respSrv(200, { ok: true, xp: 100, yaReclamado: true }), respSrv(403, { error: 'No aplica' })]) {
    const m = modulosFalsos(resp);
    const r = await O.mostrarPremioBienvenida({ session: miembro(), tarjetas: m.tarjetas, pedirPremios: m.pedirPremios });
    assert.equal(m.bitacora.tarjetas.length, 0);
    assert.ok(!r.sinMarcar, 'se marca como visto para no volver a intentarlo');
  }
});

test('paso "premio": si el servidor falla o falta un módulo, no sale la tarjeta, NO se marca y no truena', async () => {
  const falla = modulosFalsos(respSrv(500, { error: 'x' }));
  const r1 = await O.mostrarPremioBienvenida({ session: miembro(), tarjetas: falla.tarjetas, pedirPremios: falla.pedirPremios });
  assert.equal(r1.sinMarcar, true);
  assert.equal(falla.bitacora.tarjetas.length, 0);
  const red = modulosFalsos(new Error('sin red'));
  assert.equal((await O.mostrarPremioBienvenida({ session: miembro(), tarjetas: red.tarjetas, pedirPremios: red.pedirPremios })).sinMarcar, true);
  const sinModulo = await O.mostrarPremioBienvenida({ session: miembro(), tarjetas: null, pedirPremios: falla.pedirPremios });
  assert.equal(sinModulo.sinMarcar, true);
  assert.equal(falla.bitacora.pedidos.length, 1, 'sin el módulo de la tarjeta ni siquiera se pide el premio');
});

test('la secuencia completa corre en el orden nuevo y un premio que falla no traba el recorrido ni la prueba', async () => {
  const vistos = [];
  const falla = modulosFalsos(respSrv(500, {}));
  await O.ejecutarSecuencia(['bienvenida', 'nombre', 'premio', 'tour', 'prueba'], {
    bienvenida: async () => { vistos.push('bienvenida'); },
    nombre: async () => { vistos.push('nombre'); },
    premio: async () => { const r = await O.mostrarPremioBienvenida({ session: miembro(), tarjetas: falla.tarjetas, pedirPremios: falla.pedirPremios }); vistos.push('premio:' + r.como); },
    tour: async () => { vistos.push('tour'); },
    prueba: async () => { vistos.push('prueba'); }
  });
  assert.deepEqual(vistos, ['bienvenida', 'nombre', 'premio:error', 'tour', 'prueba']);
});

test('el orquestador tiene el paso "premio" en la tabla de pantallas y no marca premioVisto cuando falla', () => {
  const fuente = fs.readFileSync(path.join(RAIZ, 'assets/js/club-onboarding.js'), 'utf8');
  assert.match(fuente, /premio: function \(\) \{[\s\S]*mostrarPremioBienvenida\(ctx\)[\s\S]*almacen\.marcar\('premioVisto'\)/);
  assert.match(fuente, /r && r\.sinMarcar/);
});

test('el módulo de onboarding sigue sin emojis (pantallas nuevas con SVG)', () => {
  const t = fs.readFileSync(path.join(RAIZ, 'assets/js/club-onboarding.js'), 'utf8');
  assert.equal(/\p{Extended_Pictographic}/u.test(t), false);
});
