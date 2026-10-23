'use strict';

// Cupones de créditos del lado de la persona: la tarjeta «Hay un cupón para ti» (sin clave), «Lo sentimos», el campo «¿Tienes un código?»
// y la regla de una sola tarjeta por visita. Ejecutar: node --test tests/club-cupones.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const C = require(path.join(RAIZ, 'assets', 'js', 'club-cupones.js'));

const DIA = 86400000;
const memoria = () => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, _m: m }; };
const datos = extra => Object.assign({ ok: true, hay: true, cantidad: 1, creditos: 100, limitado: true, ids: ['abc123'] }, extra);

test('la tarjeta del cupón: título, 100 créditos, los dos pasos y los tres botones; nunca trae una clave', () => {
  const h = C.tarjetaCuponHTML(datos());
  for (const t of ['Hay un cupón para ti', 'Créditos gratis', 'cupón de 100 créditos', 'Únete a nuestro canal de WhatsApp', '«¿Tienes un código?»', 'Disponible por tiempo limitado.', 'Ahora no', 'Ya tengo la clave', 'Unirme al canal']) assert.ok(h.includes(t), t);
  assert.match(h, /data-zcc-ahora/); assert.match(h, /data-zcc-clave/); assert.match(h, /data-zcc-canal/);
  assert.ok(!C.tarjetaCuponHTML(datos({ limitado: false })).includes('Disponible por tiempo limitado'));
  assert.doesNotMatch(h, /CANAL100|ZOO[A-Z0-9]{6}/);
});

test('varios cupones: dice cuántos hay y hasta cuántos créditos dan', () => {
  assert.match(C.textoCupon(datos({ cantidad: 3, creditos: 300 })), /3 cupones<\/strong> disponibles, de hasta 300 créditos/);
  assert.match(C.textoCupon(datos({ cantidad: 1, creditos: 1000 })), /cupón de 1,000 créditos/);
});

test('cuándo se le enseña: hay cupón sin canjear, no más de 3 veces por cupón y a lo más una vez al día', () => {
  const alm = memoria(); const t0 = 1700000000000;
  assert.equal(C.debeAvisar(datos(), alm, 'u1', t0), true);
  assert.equal(C.debeAvisar(datos({ hay: false }), alm, 'u1', t0), false);
  assert.equal(C.debeAvisar(datos({ ids: [] }), alm, 'u1', t0), false);
  assert.equal(C.debeAvisar(null, alm, 'u1', t0), false);
  C.anotarAviso(alm, 'u1', ['abc123'], t0);
  assert.equal(C.debeAvisar(datos(), alm, 'u1', t0 + 3600000), false, 'ya se le enseñó hoy');
  assert.equal(C.debeAvisar(datos(), alm, 'u1', t0 + DIA + 1), true, 'al día siguiente otra vez');
  C.anotarAviso(alm, 'u1', ['abc123'], t0 + DIA + 1); C.anotarAviso(alm, 'u1', ['abc123'], t0 + 2 * DIA + 2);
  assert.equal(C.leerAviso(alm, 'u1', 'abc123').n, 3);
  assert.equal(C.debeAvisar(datos(), alm, 'u1', t0 + 9 * DIA), false, 'a la tercera ya no se insiste');
  assert.equal(C.debeAvisar(datos({ ids: ['abc123', 'nuevo99'] }), alm, 'u1', t0 + 9 * DIA), true, 'un cupón nuevo sí se avisa');
  assert.equal(C.debeAvisar(datos(), alm, 'u2', t0), true, 'otra persona en el mismo navegador empieza de cero');
});

test('un almacenamiento roto no rompe nada', () => {
  const roto = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
  assert.deepEqual(C.leerAviso(roto, 'u', 'a'), { n: 0, t: 0 });
  assert.doesNotThrow(() => C.anotarAviso(roto, 'u', ['a'], 1));
  assert.equal(C.debeAvisar(datos(), roto, 'u', 1e12), true);
});

test('«Lo sentimos»: el texto de las capturas, con el límite de personas, y «No te desanimes… estate atento al canal»', () => {
  const h = C.tarjetaSentimosHTML({ razon: 'agotado', limite: 50 });
  for (const t of ['Lo sentimos', 'Llegaste un poquito tarde', 'Este cupón ya alcanzó su límite de 50 personas y tú llegaste después de que se acabaron.', 'No te desanimes.', 'Estate atento a nuestro canal de WhatsApp', 'más cupones y ofertas', 'Entendido', 'Ir al canal']) assert.ok(h.includes(t), t);
  assert.match(C.textoSentimos({ razon: 'agotado', limite: 1500 }), /límite de 1,500 personas/);
  assert.match(C.textoSentimos({ razon: 'agotado', limite: 1 }), /límite de 1 persona y/);
  assert.match(C.textoSentimos({ razon: 'vencido' }), /ya venció/);
  assert.match(C.textoSentimos({ razon: 'agotado', limite: 0 }), /límite de personas/);
});

test('lo que responde el servidor decide la tarjeta: agotado y vencido → «Lo sentimos»; lo demás → mensaje junto al campo', () => {
  assert.deepEqual(C.interpretarError({ data: { codigo: 'cupon-agotado', limite: 50 }, message: 'x' }), { tipo: 'sentimos', razon: 'agotado', limite: 50 });
  assert.deepEqual(C.interpretarError({ data: { codigo: 'cupon-vencido' } }), { tipo: 'sentimos', razon: 'vencido', limite: 0 });
  const e = C.interpretarError({ data: { codigo: 'no-valido' }, message: 'Esa clave no es válida o ya no está disponible.' });
  assert.deepEqual([e.tipo, e.mensaje, e.codigo], ['error', 'Esa clave no es válida o ya no está disponible.', 'no-valido']);
  assert.equal(C.interpretarError(new Error('sin red')).tipo, 'error');
  assert.equal(C.interpretarError(null).mensaje, C.TEXTOS.errorGenerico);
});

test('el campo «¿Tienes un código?»: título, caja, botón Canjear, mensaje y el texto escrito se conserva', () => {
  const h = C.campoHTML({ texto: 'canal100', mensaje: '¡Listo!', tipo: 'ok' });
  for (const t of ['¿Tienes un código?', 'Escribe tu código', 'Canjear', 'id="zccClave"', 'id="zccForm"', 'value="canal100"', 'zcc-campo__msg--ok', '¡Listo!']) assert.ok(h.includes(t), t);
  assert.match(C.campoHTML(), /id="zccMsg"[^>]*hidden/, 'sin mensaje, oculto');
  assert.match(C.campoHTML({ ocupado: true }), /disabled/);
  assert.ok(C.campoHTML({ ocupado: true }).includes('Canjeando…'));
  assert.ok(!C.campoHTML({ texto: '"><script>' }).includes('<script>'), 'el texto escrito se escapa');
});

test('mensaje de éxito: cuántos créditos recibió y cuántos tiene ahora', () => {
  assert.equal(C.textoExito({ creditos: 100, saldo: 250 }), '¡Listo! Recibiste 100 créditos. Ahora tienes 250.');
  assert.equal(C.textoExito({ creditos: 1, saldo: 1 }), '¡Listo! Recibiste 1 crédito. Ahora tienes 1.');
});

test('canjear: clave vacía no llama al servidor; éxito, «Lo sentimos» y error vienen ya interpretados; nunca rechaza', async () => {
  let llamadas = 0; let cuerpo = null;
  const ok = { apiFetch: async (ruta, op) => { llamadas++; cuerpo = op.body; assert.equal(ruta, '/api/creditos/cupon/canjear'); assert.equal(op.method, 'POST'); return { ok: true, creditos: 100, saldo: 100 }; } };
  assert.equal((await C.canjear(ok, '   ')).codigo, 'vacio'); assert.equal(llamadas, 0);
  assert.deepEqual(await C.canjear(ok, ' canal100 '), { ok: true, creditos: 100, saldo: 100 });
  assert.deepEqual(cuerpo, { clave: 'canal100' });
  const agotado = { apiFetch: async () => { throw Object.assign(new Error('x'), { data: { codigo: 'cupon-agotado', limite: 50 } }); } };
  assert.deepEqual(await C.canjear(agotado, 'X1234'), { ok: false, tipo: 'sentimos', razon: 'agotado', limite: 50 });
  const mal = { apiFetch: async () => { throw Object.assign(new Error('Esa clave no es válida'), { data: { codigo: 'no-valido' } }); } };
  const r = await C.canjear(mal, 'X1234');
  assert.deepEqual([r.ok, r.tipo, r.mensaje], [false, 'error', 'Esa clave no es válida']);
});

test('iniciar: no hace nada para la administración, sin sesión o sin cliente, ni siquiera pide datos', async () => {
  let n = 0; const club = { apiFetch: async () => { n++; return datos(); } };
  assert.deepEqual(await C.iniciar({ club, session: { uid: 'u', role: 'admin' } }), { mostrado: false });
  assert.deepEqual(await C.iniciar({ club, session: {} }), { mostrado: false });
  assert.deepEqual(await C.iniciar({ session: { uid: 'u' } }), { mostrado: false });
  assert.deepEqual(await C.iniciar(), { mostrado: false });
  assert.equal(n, 0);
});

test('iniciar: si el servidor falla o no hay cupón, la página sigue igual (nunca rechaza)', async () => {
  const falla = { apiFetch: async () => { throw new Error('sin conexión'); } };
  assert.deepEqual(await C.iniciar({ club: falla, session: { uid: 'u' }, almacen: memoria() }), { mostrado: false });
  const nada = { apiFetch: async () => datos({ hay: false }) };
  assert.deepEqual(await C.iniciar({ club: nada, session: { uid: 'u' }, almacen: memoria() }), { mostrado: false });
});

test('una sola tarjeta por visita: créditos regalados (90) → cupón (91) → reseña (92), y las demás esperan a la siguiente visita', () => {
  const R = require(path.join(RAIZ, 'assets', 'js', 'club-resenas.js'));
  const CR = require(path.join(RAIZ, 'assets', 'js', 'club-creditos.js'));
  assert.ok(CR.PRIORIDAD < C.PRIORIDAD && C.PRIORIDAD < R.PRIORIDAD, [CR.PRIORIDAD, C.PRIORIDAD, R.PRIORIDAD].join(' < '));
  for (const [modulo, marca] of [['club-creditos.js', "'creditos'"], ['club-cupones.js', "'cupon'"], ['club-resenas.js', "'resena'"]]) {
    assert.ok(leer('assets/js/' + modulo).includes('window.__zooTarjetaCarga = ' + marca), modulo + ' marca la visita al mostrarse');
  }
  for (const modulo of ['club-cupones.js', 'club-resenas.js']) assert.ok(leer('assets/js/' + modulo).includes('!window.__zooTarjetaCarga'), modulo + ' no sale si ya salió otra');
});

test('cableado: Inicio avisa del cupón; PDFs y materiales trae el campo y lleva al campo con ?codigo=1; la clave solo la guarda el servidor', () => {
  const inicio = leer('pages/club-dashboard.html');
  assert.ok(inicio.includes('ZOO_CUPONES.iniciar({ session, club: ZOORIGEN_CLUB, cola: window.ZOO_COLA || null })'));
  assert.ok(inicio.indexOf('club-cupones.js') > inicio.indexOf('admin-iconos.js'));
  assert.ok(inicio.indexOf('ZOO_CUPONES.iniciar') > inicio.indexOf('ZOO_CREDITOS.iniciarAviso'), 'después del aviso de créditos regalados');
  const pdfs = leer('pages/club-pdfs.html');
  assert.match(pdfs, /club-cupones\.css\?v=/); assert.match(pdfs, /club-cupones\.js\?v=/);
  assert.ok(pdfs.indexOf('club-cupones.js') < pdfs.indexOf('club-materiales.js'), 'antes de las piezas de materiales');
  const mat = leer('assets/js/club-materiales.js');
  assert.ok(mat.includes("CU().campoHTML(estado.cupon)") && mat.includes("sesion.role !== 'admin'"));
  assert.ok(mat.includes('codigo=1'));
  const js = leer('assets/js/club-cupones.js');
  assert.ok(js.includes("'/api/creditos/cupon-disponible'") && js.includes("'/api/creditos/cupon/canjear'"));
  assert.doesNotMatch(js, /firestore|firebase\.|\.collection\(/i);
  assert.ok(C.RUTA_CAMPO === 'club-pdfs.html?codigo=1');
  assert.match(C.CANAL_URL, /^https:\/\/whatsapp\.com\/channel\//);
});

test('hoja de estilos: colores sólidos (sin degradados), letra mínima de 12 px, foco visible y respeta reducir movimiento', () => {
  const css = leer('assets/css/club-cupones.css');
  assert.doesNotMatch(css, /gradient/i);
  for (const m of css.matchAll(/font(?:-size)?:\s*(?:[0-9]+\s+)?([\d.]+)(px|rem)/g)) assert.ok((m[2] === 'px' ? Number(m[1]) : Number(m[1]) * 16) >= 12, 'letra de ' + m[0]);
  assert.match(css, /:focus-visible/); assert.match(css, /prefers-reduced-motion/);
});

test('si el cupón se pausa, vence o se agota mientras la tarjeta espera su turno, ya no sale (se vuelve a preguntar justo antes de mostrarla)', async () => {
  let consultas = 0;
  const club = { apiFetch: async () => { consultas++; return consultas === 1 ? datos() : datos({ hay: false, cantidad: 0, ids: [] }); } };
  let abierta = 0;
  const cola = { estado: () => ({}), encolar: item => Promise.resolve(item.mostrar()).then(r => ({ estado: 'mostrado', resultado: r })) };
  const r = await C.iniciar({ club, session: { uid: 'u1' }, almacen: memoria(), cola, esperar: async () => true });
  assert.deepEqual(r, { mostrado: false, como: 'descartado' });
  assert.equal(consultas, 2, 'preguntó al empezar y otra vez antes de mostrarla');
  assert.equal(abierta, 0);
});

test('al volver a preguntar, la tarjeta usa lo más reciente (cuántos cupones y cuántos créditos quedan)', () => {
  const js = leer('assets/js/club-cupones.js');
  assert.ok(js.includes("club.apiFetch('/api/creditos/cupon-disponible')") && js.includes('tarjetaCuponHTML(frescos)') && js.includes('anotarAviso(almacen, sesion.uid, frescos.ids, ahora())'));
  assert.ok(js.indexOf("if (!frescos || frescos.hay !== true) return { como: 'descartado' }") < js.indexOf("window.__zooTarjetaCarga = 'cupon'"), 'la marca de la visita solo se pone si de verdad sale');
});

test('toda página que puede abrir las tarjetas del cupón carga el diseño de las tarjetas (sin él «Lo sentimos» saldría sin formato, fuera de la vista)', () => {
  for (const pagina of ['pages/club-dashboard.html', 'pages/club-pdfs.html']) {
    const h = leer(pagina);
    assert.match(h, /club-cupones\.js\?v=/, pagina);
    assert.match(h, /club-curso-premio\.css\?v=/, 'diseño de las tarjetas en ' + pagina);
    assert.ok(h.indexOf('club-curso-premio.css') < h.indexOf('club-cupones.css'), 'antes del estilo del cupón en ' + pagina);
  }
});
