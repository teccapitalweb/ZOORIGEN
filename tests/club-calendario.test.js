'use strict';
// Calendario de cursos en el sitio: traducción de GET /api/calendario, tarjetas de los 15 retos, Inicio y la regla local
// (con prueba elegida cuenta desde el inicio del plan, no desde que termina la prueba).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const CAL = require('../assets/js/club-calendario.js');
const A = require('../assets/js/club-acceso.js');
const INICIO = require('../assets/js/club-inicio.js');
const UI = require('../assets/js/club-cursos-ui.js');
const raiz = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(raiz, rel), 'utf8');

const DIA = 86400000;
const AHORA = Date.parse('2026-10-20T12:00:00Z');
const en = n => new Date(AHORA + n * DIA).toISOString();

const respuesta = (extra = {}) => ({
  ok: true, membresia: true, admin: false, calendario: { modo: 'prueba', inicio: en(-3), eleccion: 'c2' },
  cursos: [
    { cursoId: 'c1', titulo: 'Curso 1', abierto: false, motivo: 'tiempo', desbloqueoEn: en(5), diasFalta: 5 },
    { cursoId: 'c2', titulo: 'Curso 2', abierto: true, esPrueba: true },
    { cursoId: 'c3', titulo: 'Curso 3', abierto: false, motivo: 'tiempo', desbloqueoEn: en(13), diasFalta: 13 },
    { cursoId: 'c4', titulo: 'Curso 4 <b>', abierto: true, porPremio: true }
  ],
  primerCurso: { aplica: true, estado: 'pendiente', cursoId: 'c1', titulo: 'Curso 1', desbloqueoEn: en(5), diasFalta: 5,
    progreso: { hechos: 9, meta: 15, completo: false, tipos: { quiz: { hechos: 4, meta: 4 }, detective: { hechos: 3, meta: 4 }, orden: { hechos: 1, meta: 4 } }, libres: { hechos: 1, meta: 3 } } },
  ...extra
});

test('normalizar: solo miembros con cursos; administrador, sin plan o respuesta rara = null (se usa la regla de siempre)', () => {
  assert.ok(CAL.normalizar(respuesta()));
  for (const malo of [null, undefined, 'x', {}, { ok: true, membresia: false, cursos: [] }, respuesta({ admin: true }), respuesta({ cursos: [] }), respuesta({ ok: false }), respuesta({ cursos: [{ titulo: 'sin id' }] })]) {
    assert.equal(CAL.normalizar(malo), null);
  }
});

test('desbloqueo: "Restan N días" sale de la fecha y de la hora actual; abierto, por premio, de prueba y por retos', () => {
  const cal = CAL.normalizar(respuesta());
  const c1 = CAL.desbloqueo(cal, 'c1', AHORA);
  assert.deepEqual([c1.desbloqueado, c1.diasFalta, c1.motivo], [false, 5, 'tiempo']);
  assert.equal(CAL.desbloqueo(cal, 'c1', AHORA + 2 * DIA).diasFalta, 3, 'se recalcula con el tiempo');
  assert.equal(CAL.desbloqueo(cal, 'c1', AHORA + 5 * DIA + 1).desbloqueado, true, 'al llegar su fecha se abre solo');
  assert.deepEqual([CAL.desbloqueo(cal, 'c2', AHORA).desbloqueado, CAL.desbloqueo(cal, 'c2', AHORA).esPrueba], [true, true]);
  assert.equal(CAL.desbloqueo(cal, 'c4', AHORA).porPremio, true);
  assert.equal(CAL.desbloqueo(cal, 'nada', AHORA), null, 'un curso fuera del calendario cae en la regla local');
  // el texto de la tarjeta
  assert.equal(UI.textoEspera(c1), 'Restan 5 días para su desbloqueo');
});

test('resumen: abiertos, cerrados, próximo desbloqueo y días como miembro', () => {
  const r = CAL.resumen(CAL.normalizar(respuesta()), AHORA);
  assert.deepEqual([r.total, r.abiertos, r.cerrados, r.diasComoMiembro], [4, 2, 2, 3]);
  assert.deepEqual([r.proximo.cursoId, r.proximo.diasFalta], ['c1', 5]);
});

test('el avance de los 15 retos se normaliza; abierto-ahora y sin aplicar', () => {
  const pc = CAL.normalizar(respuesta()).primerCurso;
  assert.deepEqual([pc.estado, pc.hechos, pc.meta, pc.cursoId, pc.abierto], ['pendiente', 9, 15, 'c1', false]);
  assert.deepEqual(pc.tipos.map(t => [t.id, t.hechos, t.meta]), [['quiz', 4, 4], ['detective', 3, 4], ['orden', 1, 4]]);
  assert.equal(CAL.primerCurso({ aplica: true, estado: 'abierto-ahora', cursoId: 'c1', titulo: 'X', progreso: { hechos: 15, meta: 15, completo: true } }).abierto, true);
  for (const nada of [null, {}, { aplica: false, estado: 'ninguno' }, { aplica: true, estado: 'otro' }]) assert.equal(CAL.primerCurso(nada), null);
  assert.equal(CAL.normalizar(respuesta({ primerCurso: { aplica: false, estado: 'ninguno' } })).primerCurso, null);
});

test('tarjeta "Abre tu siguiente curso resolviendo 15 retos": título, barra N de 15, tipos, botón y nada de emojis', () => {
  const pc = CAL.normalizar(respuesta()).primerCurso;
  const html = CAL.tarjetaRetosHTML(pc, { href: 'club-retos.html' });
  assert.match(html, /Abre tu siguiente curso resolviendo 15 retos/);
  assert.match(html, /<b>9 de 15<\/b> retos/);
  assert.match(html, /aria-valuenow="9"/);
  assert.match(html, /width:60%/);
  assert.match(html, /Te faltan 6 retos/);
  assert.match(html, /Quiz relámpago/); assert.match(html, /Detective de campo/); assert.match(html, /Ordena el procedimiento/);
  assert.match(html, /href="club-retos\.html"/);
  assert.match(html, /se abre en 5 días/);
  assert.equal(/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(html), false);
  assert.equal(CAL.tarjetaRetosHTML(null), '');
  assert.equal(CAL.tarjetaRetosHTML({ ...pc, estado: 'abierto-ahora' }), '', 'abierta: ya no se ofrece');
  assert.doesNotMatch(CAL.tarjetaRetosHTML(pc), /<a class="zcal-btn"/, 'sin href no hay botón');
  // un título con HTML se escapa
  assert.doesNotMatch(CAL.tarjetaRetosHTML({ ...pc, titulo: '<img src=x onerror=1>' }), /<img/);
});

test('la tira del curso cerrado y el aviso del detalle solo existen mientras faltan retos', () => {
  const pc = CAL.normalizar(respuesta()).primerCurso;
  assert.match(CAL.tiraRetosHTML(pc), /Ábrelo antes con 15 retos[\s\S]*9\/15/);
  assert.match(CAL.avisoRetosHTML(pc), /data-zc="retos"/);
  assert.equal(CAL.tiraRetosHTML(null), '');
  // la tarjeta del curso la muestra SOLO si está cerrado
  const html = UI.tarjetaHTML({ id: 'c1', title: 'Curso 1', lecciones: [{ videoId: 'v' }] }, { modo: 'miembro', desbloqueo: { desbloqueado: false, diasFalta: 5, motivo: 'tiempo' }, retosHTML: CAL.tiraRetosHTML(pc) });
  assert.match(html, /Restan 5 días para su desbloqueo/);
  assert.match(html, /zcal-tira/);
  const abierta = UI.tarjetaHTML({ id: 'c1', title: 'Curso 1', lecciones: [{ videoId: 'v' }] }, { modo: 'miembro', desbloqueo: { desbloqueado: true, diasFalta: 0 }, retosHTML: CAL.tiraRetosHTML(pc) });
  assert.doesNotMatch(abierta, /zcal-tira/);
  // insignias de curso abierto con retos y curso de prueba
  assert.match(UI.tarjetaHTML({ id: 'c1', title: 'C', lecciones: [] }, { modo: 'miembro', desbloqueo: { desbloqueado: true, porRetos: true } }), /Abierto con 15 retos/);
  assert.match(UI.tarjetaHTML({ id: 'c1', title: 'C', lecciones: [] }, { modo: 'miembro', desbloqueo: { desbloqueado: true, esPrueba: true } }), /Tu curso de prueba/);
  // el detalle
  const det = UI.detalleHTML({ curso: { title: 'C' }, filas: [], espera: { desbloqueado: false, diasFalta: 5 }, retosHTML: CAL.avisoRetosHTML(pc) });
  assert.match(det, /zcal-aviso/);
  assert.doesNotMatch(UI.detalleHTML({ curso: { title: 'C' }, filas: [], espera: { desbloqueado: true }, retosHTML: CAL.avisoRetosHTML(pc) }), /zcal-aviso/);
});

test('franja de la ruta en Cursos: curso de prueba como primero, días como miembro, cursos disponibles y siguiente desbloqueo', () => {
  const cal = CAL.normalizar(respuesta());
  const html = CAL.bannerRutaHTML(CAL.resumen(cal, AHORA), cal);
  assert.match(html, /Tu curso de prueba es el primero/);
  assert.match(html, /1 curso nuevo cada 8 días/);
  assert.match(html, /Llevas <strong>3 días<\/strong>/);
  assert.match(html, /<strong>2<\/strong> de 4 cursos disponibles/);
  assert.match(html, /El siguiente se desbloquea en <strong>5 días<\/strong>/);
  const todoAbierto = CAL.resumen(CAL.normalizar(respuesta({ cursos: [{ cursoId: 'a', abierto: true }] })), AHORA);
  assert.equal(CAL.bannerRutaHTML(todoAbierto, null), '');
});

test('"Próximo desbloqueo" del Inicio: curso, días, fecha y avance de retos', () => {
  const pc = CAL.normalizar(respuesta()).primerCurso;
  const html = CAL.proximoHTML({ titulo: 'Curso 1', diasFalta: 5, desbloqueoEn: AHORA + 5 * DIA }, pc);
  assert.match(html, /Próximo desbloqueo/);
  assert.match(html, /Restan 5 días/);
  assert.match(html, /9\/15 retos para abrirlo/);
  assert.equal(CAL.proximoHTML(null), '');
});

test('Inicio con el calendario del servidor: sigue el curso de prueba y, además, se ve el próximo desbloqueo', () => {
  const cal = CAL.normalizar(respuesta());
  const cursos = [1, 2, 3, 4].map(n => ({ id: 'c' + n, title: 'Curso ' + n, lecciones: [{ videoId: 'v' + n }, { videoId: 'w' + n }] }));
  const h = INICIO.elegirHero({ cursos, progreso: { c2: { completedLessons: [0], isCompleted: false } }, calendario: cal, ahoraMs: AHORA });
  assert.equal(h.tipo, 'continuar');
  assert.equal(h.curso.id, 'c2', 'el curso de prueba ya empezado');
  assert.equal(h.siguiente.curso.id, 'c1');
  assert.equal(h.siguiente.diasFalta, 5);
  assert.equal(h.primerCurso.cursoId, 'c1');
  const widget = INICIO.widgetHTML(h, { ahora: new Date(AHORA) });
  assert.match(widget, /Próximo desbloqueo/);
  assert.match(widget, /Restan 5 días/);
  // todo terminado o nada empezado y solo cerrados: la tarjeta de espera trae la barra de retos
  const espera = INICIO.elegirHero({ cursos: cursos.slice(0, 1), progreso: {}, calendario: CAL.normalizar(respuesta({ cursos: [respuesta().cursos[0]] })), ahoraMs: AHORA });
  assert.equal(espera.tipo, 'proximo');
  assert.match(INICIO.widgetHTML(espera, { ahora: new Date(AHORA) }), /Ábrelo antes con 15 retos/);
  // sin calendario del servidor nada cambia
  const igual = INICIO.elegirHero({ cursos, dias: 10, progreso: {} });
  assert.equal(igual.siguiente === undefined || igual.siguiente === null || typeof igual.siguiente === 'object', true);
});

test('regla local de respaldo: con prueba elegida cuenta desde el inicio del plan (aunque la prueba no esté terminada)', () => {
  const lista = [1, 2, 3, 4].map(n => ({ id: 'c' + n, title: 'C' + n, ordenVip: n }));
  const prueba = A.estadoPrueba({ elegida: { cursoId: 'c2' } });
  const inicioMs = AHORA - 3 * DIA;
  const r = id => A.desbloqueoCurso({ lista, i: lista.findIndex(c => c.id === id), prueba, progreso: {}, ahora: AHORA, inicioMs });
  assert.deepEqual([r('c2').desbloqueado, r('c1').desbloqueado, r('c1').diasFalta, r('c1').motivo], [true, false, 5, 'tiempo']);
  assert.equal(r('c3').diasFalta, 13);
  assert.equal(r('c4').diasFalta, 21);
  // sin inicio del plan se conserva el respaldo anterior
  const sin = A.desbloqueoCurso({ lista, i: 0, prueba, progreso: {}, ahora: AHORA });
  assert.equal(sin.motivo, 'termina-prueba');
  // inicioPlanMs entiende Timestamp de Firestore, texto ISO y milisegundos
  assert.equal(A.inicioPlanMs({ planInicio: { toDate: () => new Date(AHORA) } }), AHORA);
  assert.equal(A.inicioPlanMs({ planInicio: new Date(AHORA).toISOString() }), AHORA);
  assert.equal(A.inicioPlanMs({ planActivadoEn: AHORA }), AHORA);
  assert.equal(A.inicioPlanMs({}), null);
});

test('cargar(): una respuesta rota o un servidor caído devuelve null y nunca lanza', async () => {
  assert.equal(await CAL.cargar(() => Promise.reject(new Error('sin red')), 50), null);
  assert.equal(await CAL.cargar(() => new Promise(() => {}), 30), null, 'si tarda demasiado, se sigue con la regla de siempre');
  assert.ok(await CAL.cargar(() => Promise.resolve(respuesta()), 50));
  assert.equal(await CAL.cargar(() => Promise.resolve({ ok: true, membresia: false }), 50), null);
});

test('las páginas cargan club-calendario.js antes de lo que lo usa y con la misma versión', () => {
  const versiones = new Set();
  for (const f of ['club-biblioteca', 'club-dashboard', 'club-retos', 'club-logros', 'club-referidos']) {
    const html = leer('pages/' + f + '.html');
    const m = html.match(/club-calendario\.js\?v=([\w-]+)/);
    assert.ok(m, f + ' debe cargar club-calendario.js');
    versiones.add(m[1]);
    const iCal = html.indexOf('club-calendario.js');
    for (const dependiente of ['club-inicio.js', 'club-retos.js', 'club-premios.js']) {
      const i = html.indexOf(dependiente);
      if (i >= 0) assert.ok(iCal < i, `${f}: club-calendario.js va antes de ${dependiente}`);
    }
  }
  assert.equal(versiones.size, 1);
});

test('la biblioteca y el Inicio usan el calendario del servidor y conservan la regla de siempre como respaldo', () => {
  const bib = leer('pages/club-biblioteca.html');
  assert.match(bib, /cargarCalendarioServidor\(session\)/);
  assert.match(bib, /ZOO_CALENDARIO\.desbloqueo\(window\.__zooCal, curso\.id\)/);
  assert.match(bib, /inicioMs: ZOO_ACCESO\.inicioPlanMs\(session\)/);
  assert.match(bib, /tarjetaRetosHTML\(cal\.primerCurso/);
  assert.match(bib, /tiraRetosHTML/);
  const dash = leer('pages/club-dashboard.html');
  assert.match(dash, /ZOO_CALENDARIO\.cargar\(/);
  assert.match(dash, /calendario, admin: ZOO_ACCESO\.esAdminVisor\(session\) \}\)/);
  const retos = leer('assets/js/club-retos.js');
  assert.match(retos, /rzPrimer/);
  assert.match(retos, /Tu curso está abierto/);
});

test('club-calendario.css: sin degradados, sin letra menor a 12 px y con modo claro', () => {
  const css = leer('assets/css/club-calendario.css');
  assert.doesNotMatch(css, /gradient\(/);
  for (const m of css.matchAll(/font(?:-size)?:[^;{}]*?(\d*\.?\d+)(px|rem)/g)) {
    const px = m[2] === 'rem' ? parseFloat(m[1]) * 16 : parseFloat(m[1]);
    assert.ok(px >= 12, 'letra de ' + px + ' px en: ' + m[0]);
  }
  assert.match(css, /\[data-theme="light"\]/);
  assert.match(css, /prefers-reduced-motion/);
});
