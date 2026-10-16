'use strict';
// Premios: lectura segura de GET /api/premios, cursos que se pueden adelantar y flujo de canje (con servidor y ventanas falsos).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const P = require('../assets/js/club-premios.js');
const A = require('../assets/js/club-acceso.js');

const DIA = 86400000;
const AHORA = Date.UTC(2026, 9, 20, 12);
const curso = (id, title, extra) => Object.assign({ id, title, lecciones: [{ videoId: id + '-1' }, { videoId: id + '-2' }] }, extra || {});
const CURSOS = Array.from({ length: 8 }, (_, i) => curso('c' + i, 'Curso ' + i));
const sesion = dias => ({ uid: 'u1', createdAt: new Date(AHORA - dias * DIA).toISOString() });

/* ───────────── normalizar ───────────── */

const respuestaCompleta = () => ({
  ok: true, membresia: true,
  nivel: { id: 3, nombre: 'Profesional', xp: 1350, desde: 1200, hasta: 2500, faltan: 1150 },
  xp: { total: 1350, logros: 800, retos: 450, referidos: 100 }, racha: 4, diasActivos: 12,
  logros: [
    { id: 'l1', nombre: 'Primer paso', descripcion: 'Entra al club', categoria: 'Inicio', xp: 20, ganado: true },
    { id: 'l2', nombre: 'Constante', descripcion: '7 días', categoria: 'Constancia', xp: 60, ganado: false }
  ],
  premios: [
    { clave: 'profesional', titulo: 'Profesional', descripcion: 'd', requisito: 'r', ganado: true, usado: null, disponible: true },
    { clave: 'maestro', ganado: false, usado: null, disponible: false },
    { clave: 'referidos-1', ganado: true, usado: { cursoId: 'c2', fecha: '2026-10-01' }, disponible: false }
  ],
  disponibles: 1
});

test('normalizar: respuesta completa', () => {
  const d = P.normalizar(respuestaCompleta());
  assert.equal(d.membresia, true);
  assert.deepEqual(d.nivel, { id: 3, nombre: 'Profesional', xp: 1350, desde: 1200, hasta: 2500, faltan: 1150 });
  assert.deepEqual(d.xp, { total: 1350, logros: 800, retos: 450, referidos: 100, cursos: 0, bienvenida: 0 });
  assert.deepEqual(d.cursos, { terminados: 0, lista: [] });
  assert.deepEqual(d.bienvenida, { disponible: false, xp: 100, reclamado: false });
  assert.equal(d.racha, 4);
  assert.equal(d.diasActivos, 12);
  assert.equal(d.logros.length, 2);
  assert.equal(d.logros[0].ganado, true);
  assert.equal(d.logros[1].ganado, false);
  assert.equal(d.disponibles, 1);
  assert.deepEqual(d.premios[2].usado, { cursoId: 'c2', fecha: '2026-10-01' });
  assert.equal(d.premios[2].disponible, false);
});

test('normalizar: respuestas inválidas devuelven null (la pantalla muestra "Reintentar", sin inventar datos)', () => {
  for (const r of [null, undefined, 'x', 5, [], { ok: false, error: 'x' }]) assert.equal(P.normalizar(r), null);
});

test('normalizar: sin membresía nada queda como ganado y no se inventa XP', () => {
  const d = P.normalizar({ ok: true, membresia: false, nivel: { id: 1, nombre: 'Aprendiz', xp: 0, desde: 0, hasta: 300, faltan: 300 }, xp: { total: 0 },
    logros: [{ id: 'l1', nombre: 'Primer paso', categoria: 'Inicio', ganado: true, xp: 50 }], premios: [], disponibles: 3 });
  assert.equal(d.membresia, false);
  assert.equal(d.logros[0].ganado, false, 'aunque llegue ganado:true, sin membresía no se muestra como ganado');
  assert.equal(d.nivel.id, 1);
  assert.equal(d.xp.total, 0);
});

test('normalizar: datos faltantes o raros no rompen (números, textos, nivel por XP)', () => {
  const d = P.normalizar({ ok: true, membresia: true, xp: { total: 1300 }, logros: [null, 5, { nombre: 'sin id' }, { id: 7, nombre: 'num', categoria: '' }], premios: [null, { clave: 'x', usado: { cursoId: '' } }], racha: 'abc', diasActivos: -3, disponibles: 'mucho' });
  assert.equal(d.nivel.id, 3, 'sin nivel del servidor se deduce del XP');
  assert.equal(d.nivel.nombre, 'Profesional');
  assert.equal(d.racha, 0);
  assert.equal(d.diasActivos, 0);
  assert.equal(d.logros.length, 1);
  assert.equal(d.logros[0].categoria, 'Otros');
  assert.equal(d.premios[0].usado, null);
  assert.equal(d.disponibles, 0);
  const max = P.normalizar({ ok: true, membresia: true, nivel: { id: 5, xp: 9000 } });
  assert.deepEqual([max.nivel.id, max.nivel.nombre, max.nivel.faltan], [5, 'Maestro', 0]);
  assert.equal(P.normalizar({ ok: true, membresia: true, nivel: { id: 99 } }).nivel.id, 5);
  assert.equal(P.normalizar({ ok: true, membresia: true, nivel: { id: -4 } }).nivel.id, 1);
});

test('normalizar: un premio usado no cuenta como disponible', () => {
  const d = P.normalizar({ ok: true, membresia: true, premios: [{ clave: 'a', disponible: true, usado: { cursoId: 'c1' } }, { clave: 'b', disponible: true }] });
  assert.deepEqual(d.premios.map(p => p.disponible), [false, true]);
  assert.equal(d.disponibles, 1);
});

test('hay tres premios (un solo premio de referidos, con 4 invitados) y los niveles de respaldo del contrato', () => {
  assert.deepEqual(P.PREMIOS_INFO.map(p => p.clave), ['profesional', 'maestro', 'referidos-1']);
  assert.deepEqual(P.PREMIOS_INFO.map(p => p.titulo), ['Profesional', 'Maestro', 'Invita a 4 amigos']);
  assert.deepEqual(P.PREMIOS_INFO.map(p => p.umbral).slice(2), [4]);
  assert.match(P.PREMIOS_INFO[2].requisito, /^4 invitados/);
  assert.deepEqual(P.NIVELES.map(n => [n.nombre, n.desde]), [['Aprendiz', 0], ['Técnico', 300], ['Profesional', 1200], ['Líder', 2500], ['Maestro', 4500]]);
  assert.equal(P.nivelPorXp(299).id, 1);
  assert.equal(P.nivelPorXp(300).id, 2);
  assert.equal(P.nivelPorXp(4499).id, 4);
  assert.equal(P.nivelPorXp(99999).id, 5);
});

/* ───────────── cursosCanjeables ───────────── */

test('cursosCanjeables: solo los cursos que SIGUEN bloqueados, con los días que faltan (1 curso cada 8 días)', () => {
  // 20 días: abiertos posiciones 0..2 (floor(20/8)=2). Bloqueados: c3..c7
  const r = P.cursosCanjeables({ cursos: CURSOS, session: sesion(20), ahora: AHORA });
  assert.deepEqual(r.map(c => c.id), ['c3', 'c4', 'c5', 'c6', 'c7']);
  assert.deepEqual(r.map(c => c.diasFalta), [4, 12, 20, 28, 36]);
  assert.ok(r.every(c => c.motivo === null));
  assert.equal(r[0].titulo, 'Curso 3');
});

test('cursosCanjeables: respeta el orden de la fila de la biblioteca (no el de llegada de Firestore)', () => {
  const lista = [curso('n', 'Nuevo', { ordenVip: 0 }), curso('a', 'A'), curso('b', 'B'), curso('g', 'Gratis de siempre', { lecciones: [{ videoId: A.VIDEO_GRATIS_FIJO }] })];
  // orden esperado de la fila: g (gratis de siempre), a, b, n (los nuevos al final)
  const r = P.cursosCanjeables({ cursos: lista, session: sesion(0), ahora: AHORA });
  assert.deepEqual(r.map(c => c.id), ['a', 'b', 'n']);
  assert.deepEqual(r.map(c => c.diasFalta), [8, 16, 24]);
});

test('cursosCanjeables: un curso ya adelantado, uno siempre disponible y uno sin clases no se ofrecen', () => {
  const lista = [curso('a', 'A'), curso('b', 'B'), curso('s', 'Siempre', { disponibleSiempre: true }), curso('v', 'Vacío', { lecciones: [] }), curso('d', 'D')];
  const r = P.cursosCanjeables({ cursos: lista, session: sesion(0), adelantados: ['b'], ahora: AHORA });
  assert.deepEqual(r.map(c => c.id), ['d']);
});

test('cursosCanjeables: sin cursos bloqueados devuelve lista vacía', () => {
  assert.deepEqual(P.cursosCanjeables({ cursos: CURSOS, session: sesion(400), ahora: AHORA }), []);
  assert.deepEqual(P.cursosCanjeables({ cursos: [], session: sesion(0) }), []);
  assert.deepEqual(P.cursosCanjeables({}), []);
});

test('cursosCanjeables: con curso de prueba sin terminar, el motivo es "termina-prueba"', () => {
  const prueba = A.estadoPrueba({ elegible: false, elegida: { cursoId: 'c0' } });
  const r = P.cursosCanjeables({ cursos: CURSOS, session: sesion(50), prueba, progreso: {}, ahora: AHORA });
  assert.deepEqual(r.map(c => c.id), ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7']);
  assert.ok(r.every(c => c.motivo === 'termina-prueba' && c.diasFalta === null));
  assert.equal(P.textoEspera(r[0]), 'Se abriría solo cuando termines tu curso de prueba');
});

test('textos de espera, premios disponibles y confirmación', () => {
  assert.equal(P.textoEspera({ diasFalta: 1, motivo: 'tiempo' }), 'Se abriría solo en 1 día');
  assert.equal(P.textoEspera({ diasFalta: 12, motivo: 'tiempo' }), 'Se abriría solo en 12 días');
  assert.equal(P.textoEspera({ diasFalta: null, motivo: null }), 'Se abriría solo más adelante');
  assert.equal(P.textoDisponibles(1), 'Tienes 1 premio disponible.');
  assert.equal(P.textoDisponibles(2), 'Tienes 2 premios disponibles.');
  assert.equal(P.textoConfirmar('Abejas'), '¿Usar tu premio para abrir «Abejas» ahora? Cada premio abre un solo curso y no se puede cambiar después.');
});

test('elegirHTML: lista con botón "Abrir ahora", escapa los nombres y muestra el mensaje cuando no hay cursos', () => {
  const html = P.elegirHTML([{ id: 'c"1', titulo: '<img src=x onerror=alert(1)>', diasFalta: 5, motivo: 'tiempo' }], 1);
  assert.ok(html.includes('Elige el curso que quieres abrir <strong>ahora</strong>. Tienes 1 premio disponible.'));
  assert.ok(html.includes('Se abriría solo en 5 días'));
  assert.ok(html.includes('Abrir ahora'));
  assert.ok(!html.includes('<img') && html.includes('&lt;img'));
  assert.ok(!html.includes('data-premio-curso="c"1"') && html.includes('data-premio-curso="c&quot;1"'));
  const vacio = P.elegirHTML([], 2);
  assert.ok(vacio.includes('Ahora mismo no hay cursos bloqueados que puedas adelantar. Cuando se acerque la fecha de otro curso, podrás usar aquí tu premio.'));
  assert.ok(!vacio.includes('Abrir ahora'));
});

test('mensajeError: usa el mensaje del servidor y, si no hay, uno claro por código', () => {
  assert.equal(P.mensajeError(409, { error: 'Ese curso ya fue adelantado.' }), 'Ese curso ya fue adelantado.');
  assert.match(P.mensajeError(403, {}), /premio disponible|membresía/);
  assert.match(P.mensajeError(404, null), /ya no existe/);
  assert.match(P.mensajeError(409, undefined), /ya fue abierto/);
  assert.match(P.mensajeError(500, {}), /No se pudo usar el premio/);
});

/* ───────────── canjear (flujo completo con dependencias falsas) ───────────── */

// Servidor y ventanas falsos. `servidor(ruta, metodo, cuerpo)` devuelve { ok, status, datos } o lanza (sin red).
function montar(servidor, extra) {
  const ventanas = [], toasts = [], llamadas = [], irA = [];
  const e = extra || {};
  const deps = {
    pedir: async (ruta, metodo, cuerpo) => { llamadas.push({ ruta, metodo, cuerpo }); return servidor(ruta, metodo, cuerpo); },
    leerCursos: e.leerCursos || (async () => CURSOS),
    obtenerSesion: async () => ({ uid: 'u1', createdAt: new Date(Date.now() - 20 * DIA - 3600000).toISOString() }),   // 20 días como miembro
    leerProgreso: async () => ({}),
    ventana: o => {
      const v = { o, cerrada: false, el: { classList: { add() {} }, oyentes: [], addEventListener(t, f) { this.oyentes.push(f); } }, cerrar() { if (v.cerrada) return; v.cerrada = true; if (o.alCerrar) o.alCerrar(); } };
      // pulsar un botón del pie por su texto, como lo hace la ventana real
      v.pulsar = async texto => {
        const b = o.botones.find(x => x.texto === texto);
        assert.ok(b, 'no hay botón ' + texto);
        const boton = { disabled: false, textContent: texto };
        if (b.alPulsar) { const r = await b.alPulsar({ cerrar: v.cerrar, boton }); if (r === false) return false; }
        v.cerrar();
      };
      // pulsar "Abrir ahora" de un curso (clic delegado dentro de la ventana)
      v.abrirCurso = (cursoId, titulo) => v.el.oyentes.forEach(f => f({ target: { closest: () => ({ getAttribute: n => (n === 'data-premio-curso' ? cursoId : titulo) }) } }));
      ventanas.push(v);
      return v;
    },
    toast: (t, err) => toasts.push({ t, err: !!err }),
    irA: u => irA.push(u),
    iconos: require('../assets/js/admin-iconos.js')
  };
  return { P: P.crear(deps), ventanas, toasts, llamadas, irA };
}
const premiosOk = (extra) => ({ ok: true, status: 200, datos: Object.assign(respuestaCompleta(), extra || {}) });
const esperar = () => new Promise(r => setImmediate(r));

test('canjear: servidor caído → aviso claro y false, sin ventanas ni datos inventados', async () => {
  const m = montar(async () => { throw new Error('Failed to fetch'); });
  assert.equal(await m.P.canjear(), false);
  assert.equal(m.ventanas.length, 0);
  assert.equal(m.toasts.length, 1);
  assert.equal(m.toasts[0].err, true);
  assert.match(m.toasts[0].t, /No pudimos conectar con el servidor/);
});

test('canjear: el servidor responde con error → muestra su mensaje', async () => {
  const m = montar(async () => ({ ok: false, status: 401, datos: { error: 'Sesión inválida.' } }));
  assert.equal(await m.P.canjear(), false);
  assert.equal(m.toasts[0].t, 'Sesión inválida.');
});

test('canjear: sin membresía → ventana que invita a suscribirse, devuelve false', async () => {
  const m = montar(async () => ({ ok: true, status: 200, datos: { ok: true, membresia: false, nivel: { id: 1 }, logros: [] } }));
  assert.equal(await m.P.canjear(), false);
  assert.equal(m.ventanas.length, 1);
  assert.match(m.ventanas[0].o.cuerpoHTML, /suscripción activa/);
  await m.ventanas[0].pulsar('Ver suscripción');
  assert.deepEqual(m.irA, ['club-suscripcion.html']);
});

test('canjear: sin premios disponibles → aviso, false', async () => {
  const m = montar(async () => premiosOk({ disponibles: 0, premios: [] }));
  assert.equal(await m.P.canjear(), false);
  assert.equal(m.ventanas.length, 1);
  assert.match(m.ventanas[0].o.cuerpoHTML, /Todavía no tienes un premio disponible/);
});

test('canjear: premio disponible pero sin cursos bloqueados → mensaje, y al cerrar devuelve false', async () => {
  const m = montar(async ruta => (ruta === '/api/premios' ? premiosOk() : { ok: true, status: 200, datos: {} }), { leerCursos: async () => [curso('c0', 'Único')] });
  const p = m.P.canjear();
  await esperar(); await esperar();
  assert.equal(m.ventanas.length, 1);
  const v = m.ventanas[0];
  assert.equal(v.o.titulo, 'Elige tu curso');
  assert.equal(v.o.subtitulo, 'Premio por tu nivel');
  assert.ok(v.o.cuerpoHTML.includes('Ahora mismo no hay cursos bloqueados que puedas adelantar'));
  v.cerrar();
  assert.equal(await p, false);
  assert.ok(!m.llamadas.some(l => l.metodo === 'POST'), 'no se usa ningún premio');
});

test('canjear: elige curso, confirma y se usa el premio → POST /api/premios/usar, aviso y true', async () => {
  const m = montar(async (ruta, metodo, cuerpo) => {
    if (ruta === '/api/premios') return premiosOk({ disponibles: 2 });
    if (ruta === '/api/prueba-gratuita') return { ok: true, status: 200, datos: { elegible: false, elegida: null } };
    if (ruta === '/api/premios/usar') return { ok: true, status: 200, datos: { ok: true, cursoId: cuerpo.cursoId, clave: 'profesional' } };
    throw new Error('ruta inesperada ' + ruta);
  });
  const p = m.P.canjear();
  await esperar(); await esperar(); await esperar();
  const lista = m.ventanas[0];
  assert.ok(lista.o.cuerpoHTML.includes('Tienes 2 premios disponibles.'));
  assert.ok(lista.o.cuerpoHTML.includes('Curso 3') && lista.o.cuerpoHTML.includes('Se abriría solo en 4 días'));
  assert.ok(!lista.o.cuerpoHTML.includes('Curso 0') && !lista.o.cuerpoHTML.includes('Curso 2'), 'los cursos ya abiertos no se ofrecen');
  lista.abrirCurso('c3', 'Curso 3');
  const conf = m.ventanas[1];
  assert.ok(conf.o.cuerpoHTML.includes('¿Usar tu premio para abrir «Curso 3» ahora? Cada premio abre un solo curso y no se puede cambiar después.'));
  await conf.pulsar('Sí, abrir ahora');
  assert.deepEqual(m.llamadas.filter(l => l.metodo === 'POST').map(l => [l.ruta, l.cuerpo]), [['/api/premios/usar', { cursoId: 'c3' }]]);
  assert.deepEqual(m.toasts, [{ t: 'Curso desbloqueado — Curso 3 ya está abierto para ti', err: false }]);
  assert.equal(lista.cerrada, true);
  assert.equal(await p, true);
});

test('canjear: "No, volver" en la confirmación no usa el premio', async () => {
  const m = montar(async ruta => (ruta === '/api/premios' ? premiosOk() : { ok: true, status: 200, datos: { elegible: false } }));
  const p = m.P.canjear();
  await esperar(); await esperar(); await esperar();
  m.ventanas[0].abrirCurso('c4', 'Curso 4');
  await m.ventanas[1].pulsar('No, volver');
  assert.equal(m.llamadas.filter(l => l.metodo === 'POST').length, 0);
  assert.equal(m.ventanas[0].cerrada, false, 'la lista sigue abierta');
  m.ventanas[0].cerrar();
  assert.equal(await p, false);
});

test('canjear: el servidor rechaza (409 curso ya adelantado) → mensaje, cierra y devuelve false', async () => {
  const m = montar(async (ruta, metodo) => {
    if (ruta === '/api/premios') return premiosOk();
    if (ruta === '/api/premios/usar') return { ok: false, status: 409, datos: { error: 'Ese curso ya fue adelantado.' } };
    return { ok: true, status: 200, datos: { elegible: false } };
  });
  const p = m.P.canjear();
  await esperar(); await esperar(); await esperar();
  m.ventanas[0].abrirCurso('c5', 'Curso 5');
  await m.ventanas[1].pulsar('Sí, abrir ahora');
  assert.deepEqual(m.toasts, [{ t: 'Ese curso ya fue adelantado.', err: true }]);
  assert.equal(await p, false);
});

test('canjear: falla de red al usar el premio → la lista sigue abierta para reintentar', async () => {
  let intento = 0;
  const m = montar(async (ruta) => {
    if (ruta === '/api/premios') return premiosOk();
    if (ruta === '/api/premios/usar') { intento++; if (intento === 1) throw new Error('red'); return { ok: true, status: 200, datos: { ok: true } }; }
    return { ok: true, status: 200, datos: { elegible: false } };
  });
  const p = m.P.canjear();
  await esperar(); await esperar(); await esperar();
  m.ventanas[0].abrirCurso('c6', 'Curso 6');
  const r = await m.ventanas[1].pulsar('Sí, abrir ahora');
  assert.equal(r, false, 'la confirmación se queda abierta');
  assert.equal(m.toasts[0].err, true);
  assert.equal(m.ventanas[0].cerrada, false);
  await m.ventanas[1].pulsar('Sí, abrir ahora');
  assert.equal(await p, true);
});

test('canjear: tiene en cuenta los cursos que ya abrió con un premio (no los vuelve a ofrecer)', async () => {
  const m = montar(async ruta => {
    if (ruta === '/api/premios') return premiosOk({ disponibles: 1, premios: [{ clave: 'profesional', ganado: true, usado: { cursoId: 'c3' }, disponible: false }, { clave: 'maestro', ganado: true, usado: null, disponible: true }] });
    return { ok: true, status: 200, datos: { elegible: false } };
  });
  const p = m.P.canjear();
  await esperar(); await esperar(); await esperar();
  const html = m.ventanas[0].o.cuerpoHTML;
  assert.ok(!html.includes('Curso 3') && html.includes('Curso 4'));
  m.ventanas[0].cerrar();
  await p;
});

test('canjear: si no se pueden leer los cursos → aviso y false', async () => {
  const m = montar(async ruta => (ruta === '/api/premios' ? premiosOk() : { ok: true, status: 200, datos: {} }), { leerCursos: async () => { throw new Error('permiso'); } });
  assert.equal(await m.P.canjear(), false);
  assert.equal(m.toasts[0].err, true);
  assert.match(m.toasts[0].t, /No pudimos cargar los cursos/);
});

test('consultar nunca rechaza: devuelve ok:false con un mensaje', async () => {
  const caido = montar(async () => { throw new Error('x'); });
  const r = await caido.P.consultar();
  assert.equal(r.ok, false);
  assert.ok(r.error);
  const raro = montar(async () => ({ ok: true, status: 200, datos: 'no es json' }));
  assert.equal((await raro.P.consultar()).ok, false);
  const bien = montar(async () => premiosOk());
  const b = await bien.P.consultar();
  assert.equal(b.ok, true);
  assert.equal(b.datos.nivel.nombre, 'Profesional');
  assert.ok(b.crudo && Array.isArray(b.crudo.premios), 'conserva la respuesta tal cual para calcular los adelantados');
});

/* ───────────── Archivo ───────────── */

test('canjear() no recibe parámetros y el módulo no usa emojis', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'club-premios.js'), 'utf8');
  assert.match(src, /api\.canjear = function canjear\(\) \{/);
  assert.ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(src), 'sin emojis');
});

test('en el navegador (ventana simulada) consultar() y canjear() existen y llaman al servidor con la sesión del miembro', async () => {
  const vm = require('node:vm');
  const llamadas = [];
  const win = {
    firebase: { auth: () => ({ currentUser: { getIdToken: async () => 'tok' } }) },
    fetch: async (url, o) => { llamadas.push({ url, auth: o.headers.Authorization, metodo: o.method }); return { ok: true, status: 200, json: async () => respuestaCompleta() }; },
    ZOO_ACCESO: A, ZOO_ICONOS: require('../assets/js/admin-iconos.js'),
    AbortController, setTimeout, clearTimeout, console
  };
  win.self = win; win.window = win;
  const ctx = vm.createContext(Object.assign(win, { document: { getElementById: () => null, head: { appendChild() {} }, createElement: () => ({}), body: { appendChild() {} } } }));
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'club-premios.js'), 'utf8'), ctx);
  const Z = win.ZOO_PREMIOS;
  assert.equal(typeof Z.canjear, 'function');
  assert.equal(Z.canjear.length, 0, 'canjear no recibe parámetros');
  const r = await Z.consultar(3000);
  assert.equal(r.ok, true);
  assert.equal(r.datos.nivel.id, 3);
  assert.deepEqual(llamadas, [{ url: 'https://zoorigen-webhook-production.up.railway.app/api/premios', auth: 'Bearer tok', metodo: 'GET' }]);
});

/* ───────────── Adenda 2: niveles del servidor, XP por cursos y bienvenida ───────────── */

const NIVELES_SERVIDOR = [
  { id: 1, nombre: 'Aprendiz', desde: 0, hasta: 400 }, { id: 2, nombre: 'Técnico', desde: 400, hasta: 1500 },
  { id: 3, nombre: 'Profesional', desde: 1500, hasta: 3200 }, { id: 4, nombre: 'Líder', desde: 3200, hasta: 5600 },
  { id: 5, nombre: 'Maestro', desde: 5600, hasta: 99999 }
];
const respuestaAdenda = () => Object.assign(respuestaCompleta(), {
  niveles: NIVELES_SERVIDOR,
  nivel: { id: 2, nombre: 'Técnico', xp: 640, desde: 400, hasta: 1500, faltan: 860 },
  xp: { total: 640, logros: 300, retos: 120, referidos: 40, cursos: 130, bienvenida: 50 },
  cursos: { terminados: 2, lista: [{ courseId: 'c1', n: 1, xp: 20, fecha: '2026-10-01' }, { courseId: 'c2', n: 2, xp: 30, fecha: '2026-10-05' }, { courseId: '', n: 3, xp: 1 }, null] },
  bienvenida: { disponible: false, xp: 100, reclamado: true }
});

test('normalizar: toma los niveles y umbrales del servidor (no los copia) y los usa para el nivel', () => {
  const d = P.normalizar(respuestaAdenda());
  assert.deepEqual(d.niveles, NIVELES_SERVIDOR);
  assert.equal(d.niveles[1].desde, 400, 'umbral distinto al de respaldo (300): el que manda es el del servidor');
  assert.deepEqual(d.xp, { total: 640, logros: 300, retos: 120, referidos: 40, cursos: 130, bienvenida: 50 });
  // sin nivel del servidor, el nivel se deduce con la tabla DEL SERVIDOR
  const sinNivel = P.normalizar({ ok: true, membresia: true, niveles: NIVELES_SERVIDOR, xp: { total: 1400 } });
  assert.equal(sinNivel.nivel.id, 2);
  assert.equal(sinNivel.nivel.hasta, 1500);
  assert.equal(sinNivel.nivel.faltan, 100);
});

test('normalizar: niveles faltantes o mal formados -> se usa la tabla de respaldo', () => {
  for (const mal of [undefined, null, 'x', [], [{ id: 1 }], [{ id: 1, nombre: 'A', desde: 0, hasta: 10 }], [{ id: 1, nombre: 'A', desde: 0, hasta: 10 }, { id: 3, nombre: 'C', desde: 10, hasta: 20 }], [{ id: 1, nombre: '', desde: 0, hasta: 10 }, { id: 2, nombre: 'B', desde: 'x', hasta: 20 }]]) {
    const d = P.normalizar({ ok: true, membresia: true, niveles: mal, xp: { total: 10 } });
    assert.deepEqual(d.niveles.map(n => n.nombre), ['Aprendiz', 'Técnico', 'Profesional', 'Líder', 'Maestro'], JSON.stringify(mal));
  }
  // la lista llega desordenada: se ordena por id
  const desordenados = P.normalizar({ ok: true, membresia: true, niveles: NIVELES_SERVIDOR.slice().reverse() });
  assert.deepEqual(desordenados.niveles.map(n => n.id), [1, 2, 3, 4, 5]);
});

test('normalizar: cursos terminados con su XP en orden y sin filas inválidas', () => {
  const d = P.normalizar(respuestaAdenda());
  assert.equal(d.cursos.terminados, 2);
  assert.deepEqual(d.cursos.lista.map(c => [c.courseId, c.n, c.xp]), [['c1', 1, 20], ['c2', 2, 30]]);
  const sinLista = P.normalizar({ ok: true, membresia: true, cursos: { lista: [{ courseId: 'a', n: 1, xp: 20 }] } });
  assert.equal(sinLista.cursos.terminados, 1, 'si no dice cuántos, cuenta la lista');
  assert.deepEqual(P.normalizar({ ok: true, membresia: true, cursos: 'x' }).cursos, { terminados: 0, lista: [] });
  assert.equal(P.normalizar({ ok: true, membresia: true, cursos: { terminados: -4 } }).cursos.terminados, 0);
});

test('normalizar: bienvenida (disponible / reclamado); sin membresía el XP que manda el servidor se ve tal cual (solo lectura)', () => {
  const nueva = P.normalizar({ ok: true, membresia: false, bienvenida: { disponible: true, xp: 100 }, xp: { total: 199, cursos: 99, bienvenida: 100 }, cursos: { terminados: 5, lista: [] } });
  assert.deepEqual(nueva.bienvenida, { disponible: true, xp: 100, reclamado: false });
  assert.deepEqual([nueva.xp.total, nueva.xp.cursos, nueva.xp.bienvenida, nueva.cursos.terminados], [199, 99, 100, 5], 'el mismo XP que muestran Retos y el panel');
  assert.equal(P.normalizar({ ok: true, membresia: true, bienvenida: { disponible: true, reclamado: true } }).bienvenida.disponible, false, 'reclamado manda sobre disponible');
  assert.deepEqual(P.normalizar({ ok: true, membresia: true }).bienvenida, { disponible: false, xp: 100, reclamado: false });
});

test('el código nunca copia niveles propios: club-premios.js solo los usa como respaldo', () => {
  const fuente = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'club-premios.js'), 'utf8');
  assert.match(fuente, /normalizarNiveles\(resp\.niveles\)/);
  assert.doesNotMatch(fuente, /referidos-2/);
});
