'use strict';
// Prueba gratuita a elegir: clases gratis y calendario. Lo más importante: SIN prueba, todo igual que antes.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../assets/js/club-acceso.js');

const GRATIS = 'befd1641-850a-4099-88a8-047a1badc703';
const DIA = 86400000;
const curso = (id, n, extra) => Object.assign({ id, title: id, lecciones: Array.from({ length: n }, (_, k) => ({ videoId: `${id}-v${k + 1}` })) }, extra || {});

test('estadoPrueba: sin respuesta del servidor la prueba NO aplica (todo como antes)', () => {
  for (const r of [null, undefined, 'x', 5, {}, { elegible: false }]) {
    const e = A.estadoPrueba(r);
    assert.equal(e.aplica, false);
    assert.equal(e.elegida, null);
    assert.equal(e.elegible, false);
  }
});

test('estadoPrueba: elegible, ya eligió (objeto o texto) y datos extra', () => {
  const a = A.estadoPrueba({ elegible: true, elegida: null, cursosElegibles: ['c1', 2], cursoPorDefectoId: 'cd' });
  assert.deepEqual([a.elegible, a.aplica, a.elegida, a.cursosElegibles, a.cursoPorDefectoId], [true, true, null, ['c1', '2'], 'cd']);
  const b = A.estadoPrueba({ elegible: false, elegida: { cursoId: 'c3' } });
  assert.deepEqual([b.elegible, b.aplica, b.elegida], [false, true, 'c3']);
  assert.equal(A.estadoPrueba({ elegible: true, elegida: 'c9' }).elegible, false, 'si ya eligió, ya no puede elegir');
  assert.equal(A.estadoPrueba({ elegida: '   ' }).elegida, null);
});

test('sin prueba, esClaseGratis es idéntico al de siempre (clase gratis fija y clases marcadas)', () => {
  const c = curso('x', 3);
  for (const p of [undefined, null, A.estadoPrueba(null), A.estadoPrueba({ elegible: false })]) {
    assert.equal(A.esClaseGratis({ videoId: GRATIS }, c, p), true);
    assert.equal(A.esClaseGratis({ videoId: 'otro' }, c, p), false);
    assert.equal(A.esClaseGratis({ videoId: 'n', gratis: true }, { cursoMuestraGratis: true }, p), true);
  }
});

test('en prueba: todas las clases del curso elegido menos la ÚLTIMA son gratis (con 3, 4 o 5 clases)', () => {
  for (const n of [2, 3, 4, 5, 8]) {
    const c = curso('elegido', n);
    const p = A.estadoPrueba({ elegible: false, elegida: 'elegido' });
    const gratis = c.lecciones.map((l, i) => A.esClaseGratis(l, c, p, i));
    assert.deepEqual(gratis, c.lecciones.map((_, i) => i < n - 1), `n=${n}`);
    // sin pasar el índice también funciona (lo busca por video)
    assert.deepEqual(c.lecciones.map(l => A.esClaseGratis(l, c, p)), gratis);
  }
});

test('en prueba: otro curso NO es gratis, ni siquiera la clase gratis fija de siempre', () => {
  const p = A.estadoPrueba({ elegible: false, elegida: 'elegido' });
  const otro = curso('otro', 3);
  assert.equal(A.esClaseGratis(otro.lecciones[0], otro, p), false);
  const porDefecto = curso('defecto', 3); porDefecto.lecciones[0].videoId = GRATIS;
  assert.equal(A.esClaseGratis(porDefecto.lecciones[0], porDefecto, p), false, 'el curso por defecto deja de ser gratis');
});

test('elegible que aún no elige: nada es gratis (primero debe elegir), salvo clases que el panel marcó', () => {
  const p = A.estadoPrueba({ elegible: true });
  const c = curso('x', 3); c.lecciones[0].videoId = GRATIS;
  assert.equal(A.esClaseGratis(c.lecciones[0], c, p), false);
  const marcado = { id: 'm', cursoMuestraGratis: true, lecciones: [{ videoId: 'a', gratis: true }, { videoId: 'b' }] };
  assert.equal(A.esClaseGratis(marcado.lecciones[0], marcado, p), true);
  assert.equal(A.esClaseGratis(marcado.lecciones[1], marcado, p), false);
});

test('esUltimaClase', () => {
  const c = curso('c', 4);
  assert.deepEqual([0, 1, 2, 3].map(i => A.esUltimaClase(c, i)), [false, false, false, true]);
  assert.equal(A.esUltimaClase(null, 0), false);
});

/* ── Calendario ── */
const lista = () => [curso('defecto', 3), curso('a', 3), curso('elegido', 4), curso('b', 3), curso('s', 2, { disponibleSiempre: true }), curso('c', 3)];
const idx = (l, id) => l.findIndex(c => c.id === id);

test('SIN prueba elegida: desbloqueoCurso es idéntico a la regla de siempre para todas las antigüedades y posiciones', () => {
  const l = lista();
  for (let dias = -2; dias <= 120; dias++) {
    for (let i = 0; i < l.length; i++) {
      const r = A.desbloqueoCurso({ lista: l, i, dias, prueba: A.estadoPrueba(null) });
      assert.equal(r.desbloqueado, A.desbloqueadoPorTiempo(l, i, dias));
      assert.equal(r.diasFalta, A.diasParaDesbloquear(l, i, dias));
      assert.equal(r.motivo, null);
    }
  }
});

test('con prueba elegida pero sin terminarla: los demás cursos esperan ("termina primero tu curso de prueba"), sin cuenta de días', () => {
  const l = lista(), p = A.estadoPrueba({ elegible: false, elegida: 'elegido' });
  const prog = { elegido: { completedLessons: [0, 1], isCompleted: false } };
  assert.deepEqual(A.desbloqueoCurso({ lista: l, i: idx(l, 'elegido'), prueba: p, progreso: prog }), { desbloqueado: true, diasFalta: 0, motivo: null });
  assert.deepEqual(A.desbloqueoCurso({ lista: l, i: idx(l, 's'), prueba: p, progreso: prog }), { desbloqueado: true, diasFalta: 0, motivo: null }, 'siempre disponible no espera');
  for (const id of ['defecto', 'a', 'b', 'c']) {
    const r = A.desbloqueoCurso({ lista: l, i: idx(l, id), prueba: p, progreso: prog });
    assert.deepEqual([r.desbloqueado, r.diasFalta, r.motivo], [false, null, 'termina-prueba'], id);
  }
});

test('al terminar el curso de prueba: el primero de la fila (curso por defecto) se abre 8 días DESPUÉS, el siguiente a los 16, etc.', () => {
  const l = lista(), p = A.estadoPrueba({ elegible: false, elegida: 'elegido' });
  const fin = Date.UTC(2026, 9, 1);
  const prog = { elegido: { isCompleted: true, completedAt: new Date(fin).toISOString() } };
  const estado = (id, dias) => A.desbloqueoCurso({ lista: l, i: idx(l, id), prueba: p, progreso: prog, ahora: fin + dias * DIA });
  assert.deepEqual([estado('defecto', 0).desbloqueado, estado('defecto', 0).diasFalta, estado('defecto', 0).motivo], [false, 8, 'tiempo']);
  assert.equal(estado('defecto', 7.5).diasFalta, 1);
  assert.equal(estado('defecto', 8).desbloqueado, true);
  assert.equal(estado('a', 8).desbloqueado, false);
  assert.equal(estado('a', 8).diasFalta, 8);
  assert.equal(estado('a', 16).desbloqueado, true);
  assert.equal(estado('b', 16).desbloqueado, false);
  assert.equal(estado('b', 24).desbloqueado, true);
  assert.equal(estado('c', 31).desbloqueado, false, 'el curso siempre disponible no gasta turno: c es el cuarto de la fila');
  assert.equal(estado('c', 32).desbloqueado, true);
});

test('terminó el curso de prueba pero sin fecha guardada: cuenta desde hoy (no regala cursos)', () => {
  const l = lista(), p = A.estadoPrueba({ elegible: false, elegida: 'elegido' });
  const r = A.desbloqueoCurso({ lista: l, i: idx(l, 'defecto'), prueba: p, progreso: { elegido: { isCompleted: true } }, ahora: Date.UTC(2026, 9, 5) });
  assert.deepEqual([r.desbloqueado, r.diasFalta], [false, 8]);
});

test('si el curso de prueba ya no existe en la lista, se vuelve a la regla de siempre', () => {
  const l = lista().filter(c => c.id !== 'elegido');
  const p = A.estadoPrueba({ elegible: false, elegida: 'elegido' });
  for (let dias = 0; dias < 40; dias += 3) {
    const r = A.desbloqueoCurso({ lista: l, i: 1, dias, prueba: p, progreso: {} });
    assert.equal(r.desbloqueado, A.desbloqueadoPorTiempo(l, 1, dias));
  }
});

test('terminoPruebaEn', () => {
  assert.equal(A.terminoPruebaEn(null), null);
  assert.equal(A.terminoPruebaEn({ isCompleted: false }), null);
  assert.equal(A.terminoPruebaEn({ isCompleted: true, completedAt: '2026-10-01T00:00:00.000Z' }), Date.UTC(2026, 9, 1));
  assert.equal(A.terminoPruebaEn({ isCompleted: true }), 0);
});
