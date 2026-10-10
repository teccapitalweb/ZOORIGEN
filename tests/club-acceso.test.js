'use strict';
// Reglas de acceso a cursos. Lo más importante: SIN las marcas nuevas, todo se comporta como antes.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../assets/js/club-acceso.js');

const GRATIS = 'befd1641-850a-4099-88a8-047a1badc703';

// ── Fórmulas ANTERIORES (copiadas tal cual de la biblioteca antes del cambio) ──
const legacyGratis = lesson => String((lesson && lesson.videoId) || '') === GRATIS;
const legacyMax = dias => Math.floor(dias / 8);
const legacyDesbloqueado = (i, dias) => i <= legacyMax(dias);
const legacyDiasPara = (i, dias) => Math.max(0, (i * 8) - dias);

const cursos = n => Array.from({ length: n }, (_, i) => ({ id: 'c' + i, title: 'Curso ' + i, lecciones: [{ videoId: 'v' + i }] }));

test('sin marcas nuevas: el desbloqueo por tiempo es IDÉNTICO al anterior (todas las antigüedades y posiciones)', () => {
  const lista = cursos(15);
  for (let dias = -3; dias <= 200; dias++) {
    for (let i = 0; i < lista.length; i++) {
      assert.equal(A.desbloqueadoPorTiempo(lista, i, dias), legacyDesbloqueado(i, dias), `dias=${dias} i=${i}`);
      assert.equal(A.diasParaDesbloquear(lista, i, dias), legacyDiasPara(i, dias), `dias=${dias} i=${i}`);
    }
    assert.equal(A.maxDesbloqueado(dias), legacyMax(dias));
  }
  assert.equal(A.cursosEnFila(lista), 15);
});

test('sin marcas nuevas: solo la clase gratis de siempre es gratis (igual que antes)', () => {
  const curso = { id: 'x', lecciones: [] };
  for (const l of [{ videoId: GRATIS }, { videoId: 'otro' }, { driveId: 'abc' }, {}, null, undefined]) {
    assert.equal(A.esClaseGratis(l, curso), legacyGratis(l));
    assert.equal(A.esClaseGratis(l, null), legacyGratis(l));
  }
  assert.equal(A.cursoTieneClaseGratis({ lecciones: [{ videoId: GRATIS }, { videoId: 'z' }] }), true);
  assert.equal(A.cursoTieneClaseGratis({ lecciones: [{ videoId: 'z' }] }), false);
  assert.equal(A.cursoTieneClaseGratis({}), false);
});

test('una clase marcada "gratis" solo cuenta si el curso está marcado como curso de muestra', () => {
  const clase = { videoId: 'nuevo', gratis: true };
  assert.equal(A.esClaseGratis(clase, { cursoMuestraGratis: true }), true);
  assert.equal(A.esClaseGratis(clase, { cursoMuestraGratis: false }), false);
  assert.equal(A.esClaseGratis(clase, {}), false);
  assert.equal(A.esClaseGratis(clase, null), false);
  assert.equal(A.esClaseGratis({ videoId: 'nuevo' }, { cursoMuestraGratis: true }), false, 'sin la marca de la clase no es gratis');
  assert.equal(A.esClaseGratis({ videoId: 'nuevo', gratis: 'true' }, { cursoMuestraGratis: true }), false, 'solo vale el booleano true');
  assert.equal(A.esClaseGratis({ videoId: 'nuevo', gratis: true }, { cursoMuestraGratis: 'true' }), false);
});

test('un curso "disponible siempre" se ve de inmediato y NO gasta turno de los demás', () => {
  const lista = cursos(5);
  lista[1].disponibleSiempre = true;
  assert.equal(A.desbloqueadoPorTiempo(lista, 1, 0), true);
  assert.equal(A.posicionDesbloqueo(lista, 1), -1);
  assert.equal(A.diasParaDesbloquear(lista, 1, 0), 0);
  // c0 → posición 0, c2 → 1 (no 2), c3 → 2, c4 → 3
  assert.deepEqual([0, 2, 3, 4].map(i => A.posicionDesbloqueo(lista, i)), [0, 1, 2, 3]);
  assert.equal(A.desbloqueadoPorTiempo(lista, 2, 8), true, 'el segundo curso de la fila se abre al día 8');
  assert.equal(A.desbloqueadoPorTiempo(lista, 2, 7), false);
  assert.equal(A.diasParaDesbloquear(lista, 3, 5), 11);
  assert.equal(A.cursosEnFila(lista), 4);
});

test('solo el booleano true cuenta como "disponible siempre"', () => {
  for (const v of ['true', 1, 'si', undefined, null, false]) assert.equal(A.siempreDisponible({ disponibleSiempre: v }), false);
  assert.equal(A.siempreDisponible({ disponibleSiempre: true }), true);
  assert.equal(A.siempreDisponible(null), false);
});

test('posicionDesbloqueo ignora índices inválidos', () => {
  const l = cursos(3);
  for (const i of [-1, 3, 1.5, NaN, undefined]) assert.equal(A.posicionDesbloqueo(l, i), -1);
  assert.equal(A.posicionDesbloqueo(null, 0), -1);
});

test('msParaDesbloquear: hora exacta con la misma regla de 8 días; el primero ya abierto da 0', () => {
  const A = require('../assets/js/club-acceso.js');
  const lista = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const ahora = Date.UTC(2026, 9, 9, 12);
  const desde = ahora - 5 * 86400000;
  assert.equal(A.msParaDesbloquear(lista, 0, desde, ahora), 0);
  assert.equal(A.msParaDesbloquear(lista, 1, desde, ahora), 3 * 86400000);
  assert.equal(A.msParaDesbloquear(lista, 2, desde, ahora), 11 * 86400000);
  assert.equal(A.msParaDesbloquear(lista, 1, null, ahora), null);
  assert.equal(A.msParaDesbloquear([{ id: 'x', disponibleSiempre: true }], 0, desde, ahora), null);
  assert.equal(A.desdeMiembroMs({ createdAt: '2026-10-01T00:00:00Z' }), Date.UTC(2026, 9, 1));
  assert.equal(A.desdeMiembroMs({ planActivadoEn: '2026-10-02T00:00:00Z', createdAt: '2026-10-01T00:00:00Z' }), Date.UTC(2026, 9, 2));
  assert.equal(A.desdeMiembroMs({}), null);
});
