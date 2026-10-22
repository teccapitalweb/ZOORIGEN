'use strict';

// Créditos en el Club: tarjeta de felicitación (cola de ventanas, prioridad más baja, una vez por regalo), saldo y botón de canje en
// «PDFs y materiales». Ejecutar: node --test tests/club-creditos.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const C = require(path.join(RAIZ, 'assets', 'js', 'club-creditos.js'));
const COLA = require(path.join(RAIZ, 'assets', 'js', 'club-cola.js'));

test('textos: felicitación con los créditos ganados, Entendido y Canjear; nada de emojis', () => {
  const h = C.tarjetaHTML({ ok: true, avisoPendiente: 100 });
  assert.match(h, /Felicidades, has ganado 100 créditos/);
  assert.match(h, /Alcanzan para canjear 1 material\./);
  assert.match(h, /data-zcr-entendido[^>]*>Entendido</);
  assert.match(h, /data-zcr-canjear/);
  assert.match(h, /\+100/);
  assert.match(C.tarjetaHTML({ avisoPendiente: 200 }), /has ganado 200 créditos/, 'si hubo dos regalos sin ver, se suman');
  assert.match(C.tarjetaHTML({ avisoPendiente: 200 }), /Alcanzan para canjear 2 materiales\./);
  assert.ok(!/[\p{Extended_Pictographic}\u{FE0F}]/u.test(h));
});

test('hayAviso: solo si el servidor dice que hay una felicitación pendiente', () => {
  assert.equal(C.hayAviso({ ok: true, avisoPendiente: 100 }), true);
  for (const x of [null, {}, { ok: true, avisoPendiente: 0 }, { ok: false, avisoPendiente: 100 }, { ok: true, avisoPendiente: -5 }, { ok: true, avisoPendiente: 'x' }]) assert.equal(C.hayAviso(x), false);
});

test('la cola: los créditos tienen la prioridad MÁS BAJA, después de todas las demás ventanas', () => {
  assert.equal(C.PRIORIDAD, 90);
  assert.equal(COLA.PRIORIDADES.creditos, 90);
  assert.ok(Object.entries(COLA.PRIORIDADES).filter(([k]) => k !== 'creditos').every(([, v]) => v < 90));
  const c = COLA.crear({ pausaMs: 0, setTimeout: fn => setImmediate(fn), clearTimeout: () => {} });
  const orden = [];
  const poner = (id, tipo, prioridad) => c.encolar({ id, tipo, prioridad, mostrar: () => { orden.push(id); return Promise.resolve(); } });
  return Promise.all([poner('creditos-regalo', 'creditos', C.PRIORIDAD), poner('aviso', 'avisos'), poner('premio', 'premio'), poner('bienvenida', 'bienvenida'), poner('paywall', 'paywall')])
    .then(() => assert.deepEqual(orden, ['bienvenida', 'premio', 'aviso', 'paywall', 'creditos-regalo']));
});

test('esperarTurno: no sale mientras la cola trabaja, tiene pendientes o retenciones, ni mientras haya una ventana abierta', async () => {
  let t = 0; const pendientes = [];
  const setT = (fn, ms) => { pendientes.push([t + ms, fn]); };
  const avanzar = () => { if (!pendientes.length) return; pendientes.sort((a, b) => a[0] - b[0]); const [cuando, fn] = pendientes.shift(); t = cuando; fn(); };
  let estadoCola = { corriendo: 'bienvenida-vip', pendientes: ['avisos'], retenciones: [] };
  let ventana = false;
  const cola = { estado: () => estadoCola };
  let salio = null;
  C.esperarTurno({ cola, hayVentana: () => ventana, intervaloMs: 100, quietoVeces: 3, minimoMs: 0, maximoMs: 100000, setTimeout: setT, ahora: () => t }).then(v => { salio = v; });
  for (let i = 0; i < 10; i++) { avanzar(); await Promise.resolve(); }
  assert.equal(salio, null, 'la cola sigue ocupada');
  estadoCola = { corriendo: null, pendientes: [], retenciones: ['onboarding'] };
  for (let i = 0; i < 10; i++) { avanzar(); await Promise.resolve(); }
  assert.equal(salio, null, 'una retención (otra ventana todavía decide qué mostrar) también espera');
  estadoCola = { corriendo: null, pendientes: [], retenciones: [] };
  ventana = true;
  for (let i = 0; i < 10; i++) { avanzar(); await Promise.resolve(); }
  assert.equal(salio, null, 'una ventana abierta (recorrido, bienvenida...) espera');
  ventana = false;
  for (let i = 0; i < 2; i++) { avanzar(); await Promise.resolve(); }
  assert.equal(salio, null, 'hacen falta varias revisiones tranquilas seguidas');
  for (let i = 0; i < 3; i++) { avanzar(); await Promise.resolve(); }
  assert.equal(salio, true);
});

test('esperarTurno: si la pantalla nunca queda libre, se rinde en vez de colgarse', async () => {
  let t = 0; const pendientes = [];
  const setT = (fn, ms) => { pendientes.push([t + ms, fn]); };
  let salio = null;
  C.esperarTurno({ cola: { estado: () => ({ corriendo: 'x', pendientes: [], retenciones: [] }) }, intervaloMs: 1000, maximoMs: 5000, setTimeout: setT, ahora: () => t }).then(v => { salio = v; });
  for (let i = 0; i < 20 && salio === null; i++) { pendientes.sort((a, b) => a[0] - b[0]); const [c, fn] = pendientes.shift(); t = c; fn(); await Promise.resolve(); }
  assert.equal(salio, false);
});

test('estadoCanje: Canjear con saldo suficiente, «Te faltan créditos» sin él y Desbloqueado si ya es suyo', () => {
  assert.deepEqual(C.estadoCanje({ clave: 'pdf:a' }, 100, 100), { visible: true, desbloqueado: false, puede: true, rotulo: 'Canjear', falta: 0 });
  const sin = C.estadoCanje({ clave: 'pdf:a' }, 40, 100);
  assert.equal(sin.puede, false); assert.equal(sin.rotulo, 'Te faltan créditos'); assert.equal(sin.falta, 60);
  assert.equal(C.estadoCanje({ clave: 'pdf:a', desbloqueado: true }, 0, 100).rotulo, 'Desbloqueado');
  assert.equal(C.estadoCanje(null, 100, 100).visible, false);
});

test('canjeHTML: insignia «Canjeable por 100 créditos» y botón; sin saldo explica lo que falta; desbloqueado sin botón', () => {
  const item = { clave: 'libro:ley-fauna-mx', costo: 100 };
  const con = C.canjeHTML(item, 100, 100);
  assert.match(con, /Canjeable por 100 créditos/);
  assert.match(con, /data-canjear="libro:ley-fauna-mx"[^>]*>Canjear</);
  assert.doesNotMatch(con, /aria-disabled/);
  const sin = C.canjeHTML(item, 0, 100);
  assert.match(sin, />Te faltan créditos</);
  assert.match(sin, /aria-disabled="true"/);
  const ok = C.canjeHTML({ clave: 'pdf:a', desbloqueado: true }, 0, 100);
  assert.match(ok, /Desbloqueado/);
  assert.doesNotMatch(ok, /data-canjear|Canjeable por/);
  assert.equal(C.canjeHTML(null, 100, 100), '');
  assert.match(C.canjeHTML({ clave: 'pdf:"><img src=x>', costo: 100 }, 100, 100), /&quot;&gt;&lt;img src=x&gt;/, 'la clave va escapada');
});

test('felicitación con cualquier cantidad: «has ganado 300 créditos. Alcanzan para canjear 3 materiales.», singular y plural, y el sobrante', () => {
  const t = n => C.tarjetaHTML({ ok: true, avisoPendiente: n });
  assert.match(t(300), /Felicidades, has ganado 300 créditos/);
  assert.match(t(300), /Alcanzan para canjear 3 materiales\./);
  assert.match(t(300), /\+300<\/span><span class="zcp__xp-u">créditos</);
  assert.match(t(400), /Alcanzan para canjear 4 materiales\./);
  assert.match(t(250), /Alcanzan para canjear 2 materiales y te sobran 50 créditos de saldo\./);
  assert.match(t(101), /Alcanzan para canjear 1 material y te sobra 1 crédito de saldo\./);
  assert.match(t(50), /Felicidades, has ganado 50 créditos/);
  assert.match(t(50), /Todavía no alcanzan para un material/);
  assert.match(t(1), /has ganado 1 crédito</);
  assert.match(t(1), /zcp__xp-u">crédito</);
  assert.match(t(1000), /has ganado 1,000 créditos/);
  assert.match(t(1000), /Alcanzan para canjear 10 materiales\./);
  assert.equal(C.fraseAlcance(100), 'Alcanzan para canjear 1 material.');
  assert.ok(!/[\p{Extended_Pictographic}\u{FE0F}]/u.test(t(300)));
});

test('pastilla «Tus créditos: N»: siempre visible, también con 0, con su ayuda; con 100 o más ofrece «Ver materiales canjeables»', () => {
  const p0 = C.pastillaHTML(0);
  assert.match(p0, /Tus créditos: <strong>0<\/strong>/);
  assert.match(p0, /data-zcr-ayuda aria-expanded="false" aria-controls="zcrAyuda"/);
  assert.match(p0, /100 créditos = 1 material\. Canjea materiales marcados «Canjeable por 100 créditos»\./);
  assert.match(p0, /id="zcrAyuda" role="note" hidden/);
  assert.doesNotMatch(p0, /Ver materiales canjeables/, 'con menos de 100 no hay botón');
  assert.doesNotMatch(C.pastillaHTML(99), /Ver materiales canjeables/);
  assert.match(C.pastillaHTML(100), /Tus créditos: <strong>100<\/strong>/);
  assert.match(C.pastillaHTML(100), /data-zcr-ver-canjeables>Ver materiales canjeables</);
  assert.match(C.pastillaHTML(200), /Tus créditos: <strong>200<\/strong>/);
  assert.match(C.pastillaHTML(1234), /Tus créditos: <strong>1,234<\/strong>/);
  assert.match(C.pastillaHTML(250, { ayudaAbierta: true }), /aria-expanded="true"/);
  assert.doesNotMatch(C.pastillaHTML(250, { ayudaAbierta: true }), /id="zcrAyuda" role="note" hidden/);
  const solo = C.pastillaHTML(200, { soloCanjeables: true });
  assert.match(solo, /Ver todos los materiales/);
  assert.doesNotMatch(solo, /Ver materiales canjeables/);
  for (const raro of [undefined, null, -5, NaN, 'x', 1.9]) assert.match(C.pastillaHTML(raro), /Tus créditos: <strong>[01]<\/strong>/, String(raro));
  assert.ok(!/[\p{Extended_Pictographic}\u{FE0F}]/u.test(C.pastillaHTML(300)));
});

test('pastilla: mientras carga solo reserva su espacio (sin texto ni botones) y es el mismo contenedor que luego se llena', () => {
  const r = C.pastillaHTML(0, { reserva: true });
  assert.match(r, /id="zcrPastilla"/);
  assert.match(r, /zcr-pastilla--reserva/);
  assert.match(r, /aria-hidden="true"/);
  assert.doesNotMatch(r, /Tus créditos|button/);
  assert.match(C.pastillaHTML(0), /id="zcrPastilla"/);
});

test('iniciarAviso: sin aviso pendiente no muestra nada; al administrador nunca; con aviso espera a la cola y avisa al servidor al cerrar', async () => {
  const llamadas = [];
  const club = estado => ({ apiFetch: async (ruta, op) => { llamadas.push([ruta, op && op.method || 'GET']); return ruta.includes('estado') ? estado : { ok: true }; } });
  assert.deepEqual(await C.iniciarAviso({ session: { role: 'admin' }, club: club({ ok: true, avisoPendiente: 100 }) }), { mostrado: false });
  assert.equal(llamadas.length, 0, 'el administrador ni siquiera consulta');
  assert.deepEqual(await C.iniciarAviso({ session: {}, club: club({ ok: true, avisoPendiente: 0 }) }), { mostrado: false });
  assert.deepEqual(llamadas, [['/api/creditos/estado', 'GET']]);
  // un servidor que falla no rompe nada
  assert.deepEqual(await C.iniciarAviso({ session: {}, club: { apiFetch: async () => { throw new Error('sin red'); } } }), { mostrado: false });
  assert.deepEqual(await C.iniciarAviso({}), { mostrado: false });
});

test('dashboard: carga el módulo y lo arranca con la cola; la felicitación no usa localStorage (vive en el servidor)', () => {
  const d = leer('pages/club-dashboard.html');
  assert.match(d, /club-creditos\.css\?v=/);
  assert.match(d, /club-creditos\.js\?v=/);
  assert.ok(d.indexOf('club-cola.js') < d.indexOf('club-creditos.js'));
  assert.match(d, /ZOO_CREDITOS\.iniciarAviso\(\{ session, club: ZOORIGEN_CLUB, cola: window\.ZOO_COLA \|\| null \}\)/);
  const js = leer('assets/js/club-creditos.js');
  assert.doesNotMatch(js, /localStorage|sessionStorage/);
  assert.match(js, /\/api\/creditos\/aviso-visto/);
  assert.match(js, /prioridad: PRIORIDAD/);
  assert.match(js, /tipo: 'creditos'/);
});

test('la tarjeta es accesible: diálogo modal con título y descripción, foco atrapado, Escape = Entendido y respeta reducir movimiento; el fondo no la cierra', () => {
  const js = leer('assets/js/club-creditos.js');
  assert.match(js, /role="dialog" aria-modal="true" aria-labelledby="zcr-titulo" aria-describedby="zcr-desc"/);
  assert.match(js, /ev\.key === 'Escape'[^\n]*cerrar\('entendido'\)/);
  assert.match(js, /ev\.key !== 'Tab'/);
  assert.match(js, /prefers-reduced-motion/);
  assert.doesNotMatch(js, /ev\.target === el\) cerrar|target === el\) \{ cerrar/);
  const css = leer('assets/css/club-creditos.css');
  assert.match(css, /prefers-reduced-motion/);
});

test('PDFs y materiales: carga créditos y club-creditos, ?canjeables=1 muestra solo lo canjeable, el botón confirma y llama al servidor', () => {
  const p = leer('pages/club-pdfs.html');
  assert.ok(p.indexOf('club-creditos.js') < p.indexOf('club-materiales.js'));
  assert.match(p, /club-creditos\.css/);
  const m = leer('assets/js/club-materiales.js');
  assert.match(m, /\/api\/creditos\/estado/);
  assert.match(m, /\/api\/creditos\/canjear/);
  assert.match(m, /canjeables=1/);
  assert.match(m, /confirmarCanje\(item\.titulo, c\.costo\)/);
  assert.match(m, /Te faltan créditos: este material cuesta/);
  assert.match(m, /\[data-canjear\]/);
  assert.match(C.TEXTOS.confirmarTexto(100), /Se descontarán 100 créditos y el material quedará desbloqueado para ti\./);
  // lo que no es canjeable sigue igual: las tarjetas solo suman el bloque si el servidor lo ofrece
  assert.match(m, /canjeDe = function/);
  assert.match(m, /Por ahora no hay materiales para canjear/);
});

test('versiones ?v=: club-creditos.js, su hoja y club-cola.js cambian juntos en las páginas', () => {
  const v = {};
  for (const f of fs.readdirSync(path.join(RAIZ, 'pages')).filter(x => x.endsWith('.html'))) {
    for (const m of leer('pages/' + f).matchAll(/assets\/(?:js|css)\/(club-creditos\.js|club-creditos\.css|club-cola\.js)\?v=([\w.-]+)/g)) (v[m[1]] = v[m[1]] || new Set()).add(m[2]);
  }
  for (const [a, s] of Object.entries(v)) assert.equal(s.size, 1, a + ': ' + [...s].join(', '));
  assert.equal(Object.keys(v).length, 3);
});

test('sin degradados ni emojis en lo nuevo, y letra mínima de 12 px', () => {
  const css = leer('assets/css/club-creditos.css');
  assert.doesNotMatch(css, /gradient/i);
  for (const m of css.matchAll(/font(?:-size)?:\s*(?:[0-9]{3}\s+)?([0-9.]+)(rem|px)/g)) {
    const px = m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]);
    assert.ok(px >= 12, 'letra de ' + px + 'px: ' + m[0]);
  }
  for (const f of ['assets/js/club-creditos.js', 'assets/css/club-creditos.css']) assert.ok(!/[\p{Extended_Pictographic}\u{FE0F}]/u.test(leer(f)), f);
});
