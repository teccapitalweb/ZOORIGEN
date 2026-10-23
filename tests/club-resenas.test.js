'use strict';

// Tarjeta «¿Qué te pareció el curso?» para quien termina un curso: decisión de a qué curso preguntar, texto y reglas de la tarjeta.
// Ejecutar: node --test tests/club-resenas.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const R = require(path.join(RAIZ, 'assets', 'js', 'club-resenas.js'));

const DESPUES = Date.parse('2026-10-24T12:00:00-06:00');
const ANTES = Date.parse('2026-10-22T12:00:00-06:00');
const t = (cursoId, emitidoMs, curso) => ({ cursoId, curso: curso || 'Curso ' + cursoId, emitidoMs });

test('solo se pregunta por cursos terminados desde que existe la función (a quienes ya los habían terminado no)', () => {
  assert.equal(R.DESDE_MS, Date.parse('2026-10-23T00:00:00-06:00'));
  assert.equal(R.elegirPendiente([t('a', ANTES)], [], () => 0), null);
  assert.equal(R.elegirPendiente([t('a', R.DESDE_MS - 1)], [], () => 0), null);
  assert.equal(R.elegirPendiente([t('a', R.DESDE_MS)], [], () => 0).cursoId, 'a');
  assert.equal(R.elegirPendiente([t('a', DESPUES)], [], () => 0).cursoId, 'a');
});

test('no se pregunta por un curso que ya calificó, ni sin cursos terminados, ni con datos raros', () => {
  assert.equal(R.elegirPendiente([t('a', DESPUES)], [{ cursoId: 'a', estrellas: 5 }], () => 0), null);
  assert.equal(R.elegirPendiente([], [], () => 0), null);
  assert.equal(R.elegirPendiente(null, null, null), null);
  assert.equal(R.elegirPendiente([null, {}, { cursoId: 'x' }], [], () => 0), null, 'sin fecha de certificado no hay a qué preguntar');
});

test('«Ahora no»: se le vuelve a preguntar hasta 3 veces en total por curso y después no se insiste', () => {
  assert.equal(R.OMISIONES_MAX, 3);
  const lista = [t('a', DESPUES)];
  assert.equal(R.elegirPendiente(lista, [], () => 0).cursoId, 'a');
  assert.equal(R.elegirPendiente(lista, [], () => 2).cursoId, 'a');
  assert.equal(R.elegirPendiente(lista, [], () => 3), null);
  assert.equal(R.elegirPendiente(lista, [], c => (c === 'a' ? 3 : 0)), null);
});

test('si hay varios pendientes, se pregunta por el curso terminado más recientemente (uno a la vez)', () => {
  const lista = [t('a', DESPUES), t('b', DESPUES + 86400000), t('c', DESPUES - 3600000)];
  assert.equal(R.elegirPendiente(lista, [], () => 0).cursoId, 'b');
  assert.equal(R.elegirPendiente(lista, [{ cursoId: 'b' }], () => 0).cursoId, 'a');
  assert.equal(R.elegirPendiente(lista, [{ cursoId: 'b' }], c => (c === 'a' ? 3 : 0)).cursoId, 'c', 'uno agotado no tapa a los demás');
});

test('las omisiones se cuentan por persona y por curso en el navegador, y un almacenamiento roto no rompe nada', () => {
  const mem = {}; const almacen = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = v; } };
  assert.equal(R.leerOmisiones(almacen, 'u1', 'a'), 0);
  R.sumarOmision(almacen, 'u1', 'a'); R.sumarOmision(almacen, 'u1', 'a');
  assert.equal(R.leerOmisiones(almacen, 'u1', 'a'), 2);
  assert.equal(R.leerOmisiones(almacen, 'u2', 'a'), 0, 'otra persona en el mismo navegador empieza de cero');
  assert.equal(R.leerOmisiones(almacen, 'u1', 'b'), 0);
  const roto = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); } };
  assert.equal(R.leerOmisiones(roto, 'u1', 'a'), 0);
  assert.doesNotThrow(() => R.sumarOmision(roto, 'u1', 'a'));
});

test('frases de cada calificación y comentario de hasta 500 letras', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(R.frase), ['No me gustó', 'Podría mejorar', 'Está bien', 'Me gustó', '¡Excelente!']);
  assert.equal(R.frase(0), ''); assert.equal(R.frase(9), '¡Excelente!'); assert.equal(R.frase('x'), '');
  assert.equal(R.MAX_COMENTARIO, 500);
});

test('la tarjeta: título, 5 estrellas, comentario opcional con contador, Enviar desactivado y Ahora no; el título del curso va escapado', () => {
  const h = R.tarjetaHTML({ cursoId: 'a', curso: '<script>alert(1)</script> Felinos' });
  assert.ok(h.includes('¿Qué te pareció el curso?') && h.includes('Tu opinión nos ayuda a mejorar'));
  assert.equal((h.match(/class="zrs__est"/g) || []).length, 5);
  assert.match(h, /data-e="1"[^>]*aria-label="1 estrella"/);
  assert.match(h, /data-e="5"[^>]*aria-label="5 estrellas"/);
  assert.match(h, /role="radiogroup"/);
  assert.ok(h.includes('Cuéntanos más (opcional)') && h.includes('maxlength="500"') && h.includes('<span id="zrs-n">0</span>/500'));
  assert.match(h, /data-zrs-enviar disabled>Enviar</, 'Enviar no se activa hasta elegir estrellas');
  assert.match(h, /data-zrs-ahora>Ahora no</);
  assert.ok(!h.includes('<script>'), 'sin HTML sin escapar');
  assert.ok(h.includes('&lt;script&gt;alert(1)&lt;/script&gt; Felinos'));
  assert.match(R.graciasHTML(), /¡Gracias por tu opinión!/);
});

test('espera su turno: no sale mientras la cola trabaja o hay una ventana abierta, y se rinde si pasa mucho tiempo', async () => {
  let ahora = 0; const pendientes = [];
  const setTimeoutFalso = (fn, ms) => { pendientes.push([ahora + ms, fn]); };
  const avanzar = ms => { ahora += ms; const listos = pendientes.filter(p => p[0] <= ahora); listos.forEach(p => pendientes.splice(pendientes.indexOf(p), 1)); listos.forEach(p => p[1]()); };
  let estado = { corriendo: { id: 'x' }, pendientes: [], retenciones: [] };
  let ventana = false;
  let salida = null;
  R.esperarTurno({ cola: { estado: () => estado }, hayVentana: () => ventana, setTimeout: setTimeoutFalso, ahora: () => ahora, intervaloMs: 100, quietoVeces: 3, minimoMs: 0, maximoMs: 5000 }).then(v => { salida = v; });
  for (let i = 0; i < 20; i++) { avanzar(100); await Promise.resolve(); }
  assert.equal(salida, null, 'la cola está ocupada');
  estado = { corriendo: null, pendientes: [], retenciones: [] }; ventana = true;
  for (let i = 0; i < 20; i++) { avanzar(100); await Promise.resolve(); }
  assert.equal(salida, null, 'hay una ventana abierta');
  ventana = false;
  for (let i = 0; i < 10; i++) { avanzar(100); await Promise.resolve(); }
  assert.equal(salida, true);
  let rendida = null;
  R.esperarTurno({ cola: { estado: () => ({ corriendo: { id: 'x' } }) }, setTimeout: setTimeoutFalso, ahora: () => ahora, intervaloMs: 100, maximoMs: 1000 }).then(v => { rendida = v; });
  for (let i = 0; i < 20; i++) { avanzar(100); await Promise.resolve(); }
  assert.equal(rendida, false);
});

test('iniciar: no hace nada para el administrador, sin sesión o sin cliente; ni siquiera pide datos', async () => {
  let llamadas = 0;
  const club = { apiFetch: async () => { llamadas++; return { terminados: [t('a', DESPUES)], resenas: [] }; } };
  assert.deepEqual(await R.iniciar({ club, session: { uid: 'u', role: 'admin' } }), { mostrado: false });
  assert.deepEqual(await R.iniciar({ club, session: {} }), { mostrado: false });
  assert.deepEqual(await R.iniciar({ session: { uid: 'u' } }), { mostrado: false });
  assert.deepEqual(await R.iniciar(), { mostrado: false });
  assert.equal(llamadas, 0);
});

test('iniciar: si el servidor falla o no hay pendientes, la página sigue igual (nunca rechaza)', async () => {
  const falla = { apiFetch: async () => { throw new Error('sin conexión'); } };
  assert.deepEqual(await R.iniciar({ club: falla, session: { uid: 'u' }, almacen: null }), { mostrado: false });
  const nada = { apiFetch: async () => ({ ok: true, terminados: [t('a', DESPUES)], resenas: [{ cursoId: 'a' }] }) };
  assert.deepEqual(await R.iniciar({ club: nada, session: { uid: 'u' }, almacen: null }), { mostrado: false });
});

test('cableado: la guarda el servidor (no el navegador), va en la cola con su prioridad y se carga en el Inicio y en Cursos', () => {
  const js = leer('assets/js/club-resenas.js');
  assert.ok(js.includes("'/api/resenas'") && js.includes("'/api/resenas/mias'"));
  assert.doesNotMatch(js, /firestore|firebase\.|updateDoc|setDoc|\.collection\(/i, 'no escribe en Firestore desde el navegador');
  assert.ok(js.includes("tipo: 'resena', prioridad: PRIORIDAD"));
  assert.ok(R.PRIORIDAD > 91, 'al final: después de los créditos regalados (90) y del cupón (91)');
  for (const pagina of ['pages/club-dashboard.html', 'pages/club-biblioteca.html']) {
    const h = leer(pagina);
    assert.match(h, /club-resenas\.css\?v=/, pagina);
    assert.match(h, /club-resenas\.js\?v=/, pagina);
    assert.ok(h.indexOf('club-resenas.js') > h.indexOf('admin-iconos.js'), 'después de los íconos: ' + pagina);
    assert.ok(h.includes('ZOO_RESENAS.iniciar({ session, club: ZOORIGEN_CLUB, cola: window.ZOO_COLA || null })'), pagina);
  }
});

test('hoja de estilos: colores sólidos (sin degradados), letra mínima de 12 px, foco visible y respeta reducir movimiento', () => {
  const css = leer('assets/css/club-resenas.css');
  assert.doesNotMatch(css, /gradient/i);
  for (const m of css.matchAll(/font(?:-size)?:\s*(?:[0-9]+\s+)?([\d.]+)(px|rem)/g)) {
    const px = m[2] === 'px' ? Number(m[1]) : Number(m[1]) * 16;
    if (px < 12 && /zrs__cont/.test(css.slice(Math.max(0, css.indexOf(m[0]) - 120), css.indexOf(m[0])))) continue;   // el contador 0/500 mide 12.5 px
    assert.ok(px >= 12, 'letra de ' + m[0]);
  }
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});
