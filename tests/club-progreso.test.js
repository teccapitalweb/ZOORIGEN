'use strict';
// El avance de los cursos lo guarda y lo valida el SERVIDOR. Aquí se prueba la lógica pura de club-progreso.js
// (traducción servidor -> forma que usa la biblioteca, errores en español, cliente con servidor simulado)
// y que club.js / la biblioteca ya no escriben el avance en Firestore.
// Ejecutar: node --test tests/club-progreso.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const P = require('../assets/js/club-progreso.js');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');

/* ───────── traducción servidor -> página ───────── */

test('traducirProgreso(): lleva la respuesta del servidor a la forma que consume la biblioteca', () => {
  const r = P.traducirProgreso({
    cursos: {
      c1: { sesionesVistas: [2, 0, 1], quizzesAprobados: [0], completado: true, certificadoFolio: 'ZOO-2026-1A2B3C4D' },
      c2: { sesionesVistas: [0], quizzesAprobados: [], completado: false, certificadoFolio: null }
    },
    legadoImportado: true
  });
  assert.deepEqual(r.c1.completedLessons, [0, 1, 2], 'ordenadas');
  assert.equal(r.c1.isCompleted, true);
  assert.equal(r.c1.certificateFolio, 'ZOO-2026-1A2B3C4D');
  assert.deepEqual(r.c2.completedLessons, [0]);
  assert.equal(r.c2.isCompleted, false);
  assert.equal(r.c2.certificateFolio, null);
});

test('traducirProgreso(): tolera respuestas rotas, índices raros y repetidos', () => {
  assert.deepEqual(P.traducirProgreso(null), {});
  assert.deepEqual(P.traducirProgreso({}), {});
  assert.deepEqual(P.traducirProgreso({ cursos: [] }), {});
  const r = P.traducirProgreso({ cursos: { a: { sesionesVistas: [1, 1, -1, 2.5, 'x', null, 3, 99999], completado: 'si', certificadoFolio: 5 }, b: null, c: 'x' } });
  assert.deepEqual(Object.keys(r), ['a']);
  assert.deepEqual(r.a.completedLessons, [1, 3]);
  assert.equal(r.a.isCompleted, false, 'solo true estricto cuenta como completado');
  assert.equal(r.a.certificateFolio, null);
});

test('traducirProgreso(): conserva la fecha de término que ya se conocía y usa la del servidor si la manda', () => {
  const previo = { c1: { isCompleted: true, completedAt: '2026-09-01T10:00:00.000Z' } };
  const a = P.traducirProgreso({ cursos: { c1: { sesionesVistas: [0], completado: true, certificadoFolio: 'ZOO-2026-11111' } } }, previo);
  assert.equal(a.c1.completedAt, '2026-09-01T10:00:00.000Z');
  const b = P.traducirProgreso({ cursos: { c1: { sesionesVistas: [0], completado: true, certificadoFolio: 'ZOO-2026-11111', completadoEn: '2026-10-05T12:00:00Z' } } }, previo);
  assert.equal(b.c1.completedAt, '2026-10-05T12:00:00.000Z');
  // un curso no completado no arrastra fecha
  const c = P.traducirProgreso({ cursos: { c1: { sesionesVistas: [0], completado: false } } }, previo);
  assert.equal('completedAt' in c.c1, false);
});

test('la forma traducida es la que entiende ZOO_ACCESO (término de la prueba) y ZOO_INICIO (avance)', () => {
  const ACC = require('../assets/js/club-acceso.js');
  const progreso = P.traducirProgreso({ cursos: { c1: { sesionesVistas: [0, 1], completado: true, certificadoFolio: 'ZOO-2026-1A2B3C4D', completadoEn: '2026-10-05T12:00:00Z' } } });
  assert.equal(ACC.terminoPruebaEn(progreso.c1), Date.parse('2026-10-05T12:00:00Z'));
  const INI = require('../assets/js/club-inicio.js');
  assert.deepEqual(INI.avanceDe(progreso, 'c1'), { hechas: 2, terminado: true });
});

test('entradaTrasClase(): usa lo que responde POST /progreso (clases vistas, completado y folio del certificado)', () => {
  const previa = { completedLessons: [0], isCompleted: false, certificateFolio: null, quizzesPassed: [0] };
  const parcial = P.entradaTrasClase(previa, { ok: true, sesionesVistas: [0, 1], completado: false, certificado: null });
  assert.deepEqual(parcial.completedLessons, [0, 1]);
  assert.equal(parcial.isCompleted, false);
  assert.equal(parcial.certificateFolio, null);
  const fin = P.entradaTrasClase(parcial, {
    ok: true, sesionesVistas: [0, 1, 2], completado: true,
    certificado: { folio: 'zoo-2026-1a2b3c4d', nombre: 'Ana', curso: 'Colmenas', area: 'Apicultura', horas: 6, sesiones: 3, instructor: 'X', emitido: '2026-10-12T15:00:00Z' }
  });
  assert.equal(fin.isCompleted, true);
  assert.equal(fin.certificateFolio, 'ZOO-2026-1A2B3C4D');
  assert.equal(fin.completedAt, '2026-10-12T15:00:00.000Z');
  assert.deepEqual(fin.completedLessons, [0, 1, 2]);
});

test('resultadoQuiz(): normaliza la respuesta del quiz y rechaza la mal armada', () => {
  const r = P.resultadoQuiz({ aprobado: true, correctas: 1, total: 2, detalle: [{ correcta: 1, acertada: true }, { correcta: 0, acertada: false }] });
  assert.deepEqual(r, { aprobado: true, correctas: 1, total: 2, detalle: [{ correcta: 1, acertada: true }, { correcta: 0, acertada: false }] });
  assert.equal(P.resultadoQuiz({ aprobado: true }), null);
  assert.equal(P.resultadoQuiz(null), null);
  assert.equal(P.resultadoQuiz([]), null);
});

/* ───────── mensajes de error ───────── */

test('mensajeError(): un mensaje claro en español por cada código del servidor', () => {
  const m = (status, message, ctx) => P.mensajeError({ status, message }, ctx);
  assert.match(m(0), /conexión con el servidor/);
  assert.match(m(401), /sesión expiró/);
  assert.match(m(403, 'Clase bloqueada', { esMiembro: true }), /bloqueada para tu cuenta/);
  assert.match(m(403, 'Clase bloqueada', { esMiembro: false }), /prueba gratuita.*membresía/);
  assert.match(m(409, 'Aprueba el quiz de esta clase antes de completarla'), /Contesta primero las preguntas/);
  assert.match(m(409, 'Completa primero la clase anterior'), /clase anterior/);
  assert.match(m(429), /demasiadas acciones/);
  assert.match(m(503, 'Los certificados aun no estan configurados'), /certificados todavía no está listo/);
  assert.match(m(500), /problema/);
  assert.match(P.mensajeError({ status: 418 }, { accion: 'quiz' }), /respuestas/);
  for (const s of [0, 401, 403, 429, 503, 500]) assert.ok(m(s, 'x').length > 20);
  assert.equal(m(409, 'Otro motivo del servidor'), 'Otro motivo del servidor', 'un 409 desconocido muestra el texto del servidor');
});

/* ───────── cliente con servidor simulado ───────── */

function entorno(opciones) {
  const o = opciones || {};
  const llamadas = [];
  const almacen = {};
  const apiFetch = async (ruta, op) => {
    llamadas.push({ ruta, metodo: (op && op.method) || 'GET', cuerpo: op && op.body });
    if (o.responder) return o.responder(ruta, op);
    throw Object.assign(new Error('sin respuesta'), { status: 0 });
  };
  const cliente = P.crear({
    apiFetch, esperaMs: o.esperaMs || 200,
    uid: () => 'u1',
    leerCache: uid => almacen[uid] || null,
    guardarCache: (uid, obj) => { almacen[uid] = JSON.parse(JSON.stringify(obj)); },
    fechasCertificados: o.fechas
  });
  return { cliente, llamadas, almacen };
}

test('cargar(): pide GET /api/cursos/progreso, traduce y guarda la copia para mostrar', async () => {
  const { cliente, llamadas, almacen } = entorno({
    responder: async () => ({ cursos: { c1: { sesionesVistas: [0], quizzesAprobados: [], completado: false, certificadoFolio: null } }, legadoImportado: true })
  });
  const r = await cliente.cargar('u1');
  assert.deepEqual(llamadas.map(l => l.metodo + ' ' + l.ruta), ['GET /api/cursos/progreso']);
  assert.deepEqual(r.c1.completedLessons, [0]);
  assert.equal(r.__desdeCache, false);
  assert.deepEqual(Object.keys(r), ['c1'], 'la marca no es enumerable');
  assert.deepEqual(almacen.u1.c1.completedLessons, [0]);
});

test('cargar(): el cliente NO manda nada de progreso viejo (la importación del legado la hace el servidor)', async () => {
  const { cliente, llamadas } = entorno({ responder: async () => ({ cursos: {}, legadoImportado: false }) });
  await cliente.cargar('u1');
  assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0].cuerpo, undefined);
});

test('cargar(): si el servidor falla, devuelve lo último conocido SOLO para mostrar (marcado como copia)', async () => {
  const { cliente, almacen } = entorno({ responder: async () => { throw Object.assign(new Error('x'), { status: 0 }); } });
  almacen.u1 = { c1: { completedLessons: [0, 1], isCompleted: false, certificateFolio: null } };
  const r = await cliente.cargar('u1');
  assert.deepEqual(r.c1.completedLessons, [0, 1]);
  assert.equal(r.__desdeCache, true);
});

test('cargar(): si el servidor no responde a tiempo, cae a la copia y no se queda colgado', async () => {
  const { cliente } = entorno({ esperaMs: 30, responder: () => new Promise(() => {}) });
  const r = await cliente.cargar('u1');
  assert.deepEqual({ ...r }, {});
  assert.equal(r.__desdeCache, true);
});

test('cargar(): los cursos terminados sin fecha toman la fecha de su certificado', async () => {
  const { cliente } = entorno({
    responder: async () => ({ cursos: { c1: { sesionesVistas: [0], completado: true, certificadoFolio: 'ZOO-2026-11111' } } }),
    fechas: async uid => { assert.equal(uid, 'u1'); return { c1: '2026-08-01T00:00:00Z' }; }
  });
  const r = await cliente.cargar('u1');
  assert.equal(r.c1.completedAt, '2026-08-01T00:00:00.000Z');
});

test('registrarClaseVista(): POST con { sessionIndex } y devuelve el certificado cuando se completa el curso', async () => {
  const { cliente, llamadas } = entorno({
    responder: async (ruta, op) => {
      if (ruta === '/api/cursos/progreso') return { cursos: { c1: { sesionesVistas: [0], completado: false } } };
      assert.equal(ruta, '/api/cursos/c1/progreso');
      assert.deepEqual(op.body, { sessionIndex: 1 });
      return { ok: true, sesionesVistas: [0, 1], completado: true, certificado: { folio: 'ZOO-2026-1A2B3C4D', nombre: 'Ana', curso: 'C', area: 'A', horas: 2, sesiones: 2, instructor: 'I', emitido: '2026-10-12T15:00:00Z' }, bono: { xp: 20, ordinal: 1 } };
    }
  });
  await cliente.cargar('u1');
  const r = await cliente.registrarClaseVista('c1', 1);
  assert.equal(r.completado, true);
  assert.equal(r.nuevoCompletado, true);
  assert.equal(r.entrada.certificateFolio, 'ZOO-2026-1A2B3C4D');
  assert.deepEqual(r.bono, { xp: 20, ordinal: 1 });
  assert.equal(llamadas[1].metodo, 'POST');
  // una segunda respuesta de curso ya completado ya no es "nuevo"
  const otra = await cliente.registrarClaseVista('c1', 1);
  assert.equal(otra.nuevoCompletado, false);
});

test('registrarClaseVista(): una clase intermedia no completa el curso ni trae certificado', async () => {
  const { cliente } = entorno({ responder: async () => ({ ok: true, sesionesVistas: [0], completado: false, certificado: null }) });
  const r = await cliente.registrarClaseVista('c1', 0);
  assert.equal(r.nuevoCompletado, false);
  assert.equal(r.certificado, null);
  assert.deepEqual(r.sesionesVistas, [0]);
});

test('registrarClaseVista(): los errores del servidor llegan con .status y un texto en español', async () => {
  for (const [status, mensaje, esperado] of [
    [403, 'Clase bloqueada', /bloqueada|prueba gratuita/],
    [409, 'Aprueba el quiz de esta clase antes de completarla', /Contesta primero las preguntas/],
    [409, 'Completa primero la clase anterior', /clase anterior/],
    [503, 'Los certificados aun no estan configurados', /todavía no está listo/]
  ]) {
    const { cliente } = entorno({ responder: async () => { throw Object.assign(new Error(mensaje), { status }); } });
    await assert.rejects(() => cliente.registrarClaseVista('c1', 0, { esMiembro: true }), e => {
      assert.equal(e.status, status);
      assert.match(e.mensajeUsuario, esperado);
      return true;
    });
  }
});

test('registrarClaseVista(): dos toques seguidos a la misma clase mandan UNA sola petición', async () => {
  let n = 0;
  const { cliente } = entorno({ responder: async () => { n++; await new Promise(r => setTimeout(r, 20)); return { ok: true, sesionesVistas: [0], completado: false }; } });
  const [a, b] = await Promise.all([cliente.registrarClaseVista('c1', 0), cliente.registrarClaseVista('c1', 0)]);
  assert.equal(n, 1);
  assert.equal(a, b);
});

test('registrarClaseVista(): rechaza datos de clase inválidos sin llamar al servidor', async () => {
  const { cliente, llamadas } = entorno({ responder: async () => ({ ok: true }) });
  await assert.rejects(() => cliente.registrarClaseVista('', 0));
  await assert.rejects(() => cliente.registrarClaseVista('c1', -1));
  await assert.rejects(() => cliente.registrarClaseVista('c1', 1.5));
  assert.equal(llamadas.length, 0);
});

test('validarQuiz(): POST con { sessionIndex, respuestas } y devuelve el detalle del servidor', async () => {
  const { cliente, llamadas } = entorno({
    responder: async (ruta, op) => {
      assert.equal(ruta, '/api/cursos/c%201/quiz');
      assert.deepEqual(op.body, { sessionIndex: 2, respuestas: [1, 0, 3] });
      return { aprobado: true, correctas: 2, total: 3, detalle: [{ correcta: 1, acertada: true }, { correcta: 0, acertada: true }, { correcta: 2, acertada: false }] };
    }
  });
  const r = await cliente.validarQuiz('c 1', 2, [1, 0, 3]);
  assert.equal(r.correctas, 2);
  assert.equal(r.detalle[2].acertada, false);
  assert.equal(llamadas.length, 1);
});

test('validarQuiz(): no manda respuestas vacías o con huecos, y traduce los errores', async () => {
  const { cliente, llamadas } = entorno({ responder: async () => { throw Object.assign(new Error('x'), { status: 429 }); } });
  await assert.rejects(() => cliente.validarQuiz('c1', 0, []));
  await assert.rejects(() => cliente.validarQuiz('c1', 0, [0, null]));
  assert.equal(llamadas.length, 0);
  await assert.rejects(() => cliente.validarQuiz('c1', 0, [0, 1]), e => /demasiadas acciones/.test(e.mensajeUsuario));
});

/* ───────── integración en el sitio ───────── */

test('club.js: el avance viene del servidor y ya no se escribe courseProgress en Firestore', () => {
  const js = leer('assets/js/club.js');
  assert.match(js, /async getCourseProgress\(uid\)/);
  assert.match(js, /cliente\.cargar\(uid\)/);
  assert.equal(/saveCourseProgress/.test(js), false, 'saveCourseProgress ya no existe');
  assert.equal(/set\(\{ courseProgress/.test(js), false);
  assert.match(js, /registrarClaseVista\(cursoId, indice, ctx\)/);
  assert.match(js, /validarQuizClase\(cursoId, indice, respuestas, ctx\)/);
});

test('ningún archivo del sitio escribe el avance de cursos (courseProgress) en Firestore', () => {
  const archivos = [];
  for (const dir of ['pages', 'assets/js']) {
    for (const f of fs.readdirSync(path.join(RAIZ, dir))) {
      if (/\.(html|js)$/.test(f) && !/^(admin|club-extra|especies-data|stripe-config)\.js$/.test(f)) archivos.push(dir + '/' + f);
    }
  }
  for (const rel of archivos) {
    const t = leer(rel);
    assert.equal(/saveCourseProgress/.test(t), false, rel + ' usa saveCourseProgress');
    assert.equal(/courseProgress\s*:/.test(t.replace(/\/\/.*$/gm, '')), false, rel + ' escribe courseProgress');
  }
});

test('la biblioteca llama al servidor para guardar clases y para el quiz', () => {
  const html = leer('pages/club-biblioteca.html');
  assert.match(html, /ZOORIGEN_CLUB\.registrarClaseVista\(String\(courseId\), lessonIdx/);
  assert.match(html, /ZOORIGEN_CLUB\.validarQuizClase\(String\(curso\.id\), lessonIdx, respuestas/);
  assert.match(html, /validar: async \(respuestas\) =>/);
  // sin alert() feos para los errores del avance
  const bloque = html.slice(html.indexOf('AVANCE Y CERTIFICADO'), html.indexOf('function openLessonByIndex'));
  assert.equal(/\balert\(/.test(bloque), false);
  assert.match(bloque, /ZOO_CURSOS_UI\.ventana/);
});

test('las páginas que leen el avance cargan club-progreso.js con la misma versión y después de club.js', () => {
  const versiones = new Set();
  for (const f of ['club-biblioteca', 'club-dashboard', 'club-logros', 'club-referidos', 'diagnostico']) {
    const html = leer('pages/' + f + '.html');
    const m = html.match(/assets\/js\/club-progreso\.js\?v=([\w.-]+)/);
    assert.ok(m, f + ' no carga club-progreso.js');
    versiones.add(m[1]);
    assert.ok(html.indexOf('club-progreso.js') > html.indexOf('assets/js/club.js?v='), f + ': club-progreso.js va después de club.js');
  }
  assert.equal(versiones.size, 1);
});

test('club-progreso.js es UMD puro: no necesita navegador, Firebase ni localStorage', () => {
  const src = leer('assets/js/club-progreso.js');
  assert.equal(/\bdocument\b|\bwindow\b|localStorage|firebase|collection\(/.test(src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), false);
});
