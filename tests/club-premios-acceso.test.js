'use strict';
// Cursos adelantados con un premio dentro de las reglas de acceso.
// Lo más importante: SIN adelantados el resultado es idéntico al de siempre, y un adelanto NO mueve el turno de los demás.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const A = require('../assets/js/club-acceso.js');

const GRATIS = 'befd1641-850a-4099-88a8-047a1badc703';
const DIA = 86400000;
const curso = (id, n, extra) => Object.assign({ id, title: id, lecciones: Array.from({ length: n || 2 }, (_, k) => ({ videoId: `${id}-v${k + 1}` })) }, extra || {});
const lista = (n, extras) => Array.from({ length: n }, (_, i) => curso('c' + i, 2, (extras && extras[i]) || {}));
const SIN = [undefined, null, [], 'c1', 5, {}, [null, '', 5, {}, '  ']];   // todo lo que NO debe contar como adelantados

test('sin adelantados (de cualquier forma) el desbloqueo es IDÉNTICO: sin prueba, todas las antigüedades y posiciones', () => {
  const l = lista(15, { 3: { disponibleSiempre: true }, 9: { disponibleSiempre: true } });
  for (let dias = -2; dias <= 150; dias += 1) {
    for (let i = 0; i < l.length; i++) {
      const base = A.desbloqueoCurso({ lista: l, i, dias });
      assert.deepEqual(Object.keys(base).sort(), ['desbloqueado', 'diasFalta', 'motivo'], 'la forma del resultado no cambia');
      for (const adel of SIN) assert.deepEqual(A.desbloqueoCurso({ lista: l, i, dias, adelantados: adel }), base, `dias=${dias} i=${i}`);
    }
  }
});

test('sin adelantados el desbloqueo es IDÉNTICO también con prueba elegida (antes y después de terminarla)', () => {
  const l = lista(8, { 2: { disponibleSiempre: true } });
  const ahora = Date.UTC(2026, 9, 1);
  const p = A.estadoPrueba({ elegible: false, elegida: { cursoId: 'c1' } });
  const progresos = [{}, { c1: { isCompleted: false } }, { c1: { isCompleted: true, completedAt: new Date(ahora - 20 * DIA).toISOString() } }, { c1: { isCompleted: true } }];
  for (const progreso of progresos) for (let i = 0; i < l.length; i++) {
    const base = A.desbloqueoCurso({ lista: l, i, dias: 40, prueba: p, progreso, ahora });
    for (const adel of SIN) assert.deepEqual(A.desbloqueoCurso({ lista: l, i, dias: 40, prueba: p, progreso, ahora, adelantados: adel }), base);
  }
});

test('un curso adelantado queda ABIERTO (con la marca porPremio) sin importar los días', () => {
  const l = lista(6);
  const r = A.desbloqueoCurso({ lista: l, i: 5, dias: 0, adelantados: ['c5'] });
  assert.deepEqual(r, { desbloqueado: true, diasFalta: 0, motivo: null, porPremio: true });
  // sin el adelanto seguía bloqueado
  assert.equal(A.desbloqueoCurso({ lista: l, i: 5, dias: 0 }).desbloqueado, false);
});

test('el adelanto NO mueve el turno de los demás cursos (ni por tiempo ni con prueba)', () => {
  const l = lista(10, { 4: { disponibleSiempre: true } });
  for (const adel of [['c7'], ['c1', 'c9'], ['c0'], ['c4']]) {
    for (let dias = 0; dias <= 90; dias += 3) {
      for (let i = 0; i < l.length; i++) {
        if (adel.includes(l[i].id)) continue;
        assert.deepEqual(A.desbloqueoCurso({ lista: l, i, dias, adelantados: adel }), A.desbloqueoCurso({ lista: l, i, dias }), `adel=${adel} dias=${dias} i=${i}`);
      }
    }
  }
  const ahora = Date.UTC(2026, 9, 1);
  const p = A.estadoPrueba({ elegible: false, elegida: 'c0' });
  const progreso = { c0: { isCompleted: true, completedAt: new Date(ahora - 10 * DIA).toISOString() } };
  for (let i = 1; i < l.length; i++) {
    if (i === 6) continue;
    assert.deepEqual(A.desbloqueoCurso({ lista: l, i, dias: 50, prueba: p, progreso, ahora, adelantados: ['c6'] }), A.desbloqueoCurso({ lista: l, i, dias: 50, prueba: p, progreso, ahora }));
  }
  assert.equal(A.desbloqueoCurso({ lista: l, i: 6, dias: 50, prueba: p, progreso, ahora, adelantados: ['c6'] }).desbloqueado, true);
});

test('adelantar un curso que aún espera la prueba también lo abre', () => {
  const l = lista(4);
  const p = A.estadoPrueba({ elegible: false, elegida: 'c0' });
  assert.equal(A.desbloqueoCurso({ lista: l, i: 2, dias: 3, prueba: p, progreso: {} }).motivo, 'termina-prueba');
  const r = A.desbloqueoCurso({ lista: l, i: 2, dias: 3, prueba: p, progreso: {}, adelantados: ['c2'] });
  assert.deepEqual([r.desbloqueado, r.porPremio], [true, true]);
});

test('ids de adelantados que no existen en la lista no abren nada ni rompen nada', () => {
  const l = lista(5);
  for (let i = 0; i < 5; i++) assert.deepEqual(A.desbloqueoCurso({ lista: l, i, dias: 0, adelantados: ['otro', 'zzz'] }), A.desbloqueoCurso({ lista: l, i, dias: 0 }));
  assert.equal(A.desbloqueoCurso({ lista: l, i: 99, dias: 0, adelantados: ['c1'] }).desbloqueado, A.desbloqueoCurso({ lista: l, i: 99, dias: 0 }).desbloqueado);
  assert.equal(A.desbloqueoCurso({ lista: [], i: 0, adelantados: ['c1'] }).desbloqueado, false);
  assert.equal(A.desbloqueoCurso().desbloqueado, false);
});

test('normalizarAdelantados / esAdelantado / adelantadosDeRespuesta', () => {
  assert.deepEqual(A.normalizarAdelantados([' a ', 'b', 'a', '', null, 5, {}]), ['a', 'b']);
  assert.deepEqual(A.normalizarAdelantados('a'), []);
  assert.equal(A.esAdelantado(['a'], 'a'), true);
  assert.equal(A.esAdelantado(['a'], 'b'), false);
  assert.equal(A.esAdelantado(null, 'a'), false);
  assert.equal(A.esAdelantado(['a'], undefined), false);
  assert.equal(A.esAdelantado(['a'], ''), false);
  const resp = { ok: true, premios: [
    { clave: 'profesional', usado: { cursoId: 'c3', fecha: 'x' } },
    { clave: 'maestro', usado: null },
    { clave: 'referidos-1', usado: { cursoId: 'c3' } },
    { clave: 'referidos-2' }
  ] };
  assert.deepEqual(A.adelantadosDeRespuesta(resp), ['c3']);
  for (const mala of [null, undefined, 'x', 5, {}, { premios: 'x' }, { premios: [null, 5, { usado: 'c1' }] }]) assert.deepEqual(A.adelantadosDeRespuesta(mala), []);
});

test('diasComoMiembro: misma cuenta que usaba la biblioteca', () => {
  const ahora = Date.UTC(2026, 9, 20, 12);
  const legacy = (s, t) => { const desde = s.planActivadoEn || s.createdAt || new Date(t).toISOString(); return Math.floor((t - new Date(desde).getTime()) / (1000 * 60 * 60 * 24)); };
  for (const s of [{ createdAt: new Date(ahora - 40 * DIA).toISOString() }, { planActivadoEn: new Date(ahora - 3 * DIA - 5000).toISOString(), createdAt: '2020-01-01' }, {}, { createdAt: 'no es fecha' }, { createdAt: null }]) {
    assert.deepEqual(A.diasComoMiembro(s, ahora), legacy(s, ahora));
  }
  assert.equal(A.diasComoMiembro(null, ahora), 0);
  assert.equal(typeof A.diasComoMiembro({ createdAt: new Date().toISOString() }), 'number');
});

test('ordenParaDesbloqueo: igual que ordenarCursos + la clase gratis de siempre primero (y no modifica la lista original)', () => {
  const legacy = cursosDeFirestore => {
    const cursos = A.ordenarCursos(cursosDeFirestore);
    cursos.sort((a, b) => {
      const g = c => (c.lecciones || []).some(l => A.esClaseGratis(l, c));
      return (g(b) ? 1 : 0) - (g(a) ? 1 : 0);
    });
    return cursos;
  };
  const base = [
    curso('n0', 2, { ordenVip: 1 }), curso('a', 2), curso('b', 2, { lecciones: [{ videoId: 'x' }, { videoId: GRATIS }] }), curso('n1', 2, { ordenVip: 0 }),
    curso('c', 2), curso('m', 2, { cursoMuestraGratis: true, lecciones: [{ videoId: 'm1', gratis: true }] }), curso('d', 0)
  ];
  const copia = base.map(c => c.id);
  assert.deepEqual(A.ordenParaDesbloqueo(base).map(c => c.id), legacy(base).map(c => c.id));
  assert.deepEqual(base.map(c => c.id), copia, 'no modifica la lista que recibe');
  assert.deepEqual(A.ordenParaDesbloqueo([]).map(c => c.id), []);
  assert.deepEqual(A.ordenParaDesbloqueo(null), []);
  // la clase gratis de siempre queda primero
  assert.equal(A.ordenParaDesbloqueo(base)[0].id, 'b');
});

test('resumenDesbloqueo SIN adelantados da lo mismo que la cuenta que hacía la biblioteca', () => {
  const l = lista(12, { 5: { disponibleSiempre: true }, 11: { disponibleSiempre: true } });
  for (let dias = 0; dias <= 120; dias++) {
    const maxIdx = A.maxDesbloqueado(dias), enFila = A.cursosEnFila(l);
    const antiguo = { disponibles: Math.min(enFila, maxIdx + 1) + (l.length - enFila), hayBloqueados: enFila > maxIdx + 1, faltan: Math.max(0, ((maxIdx + 1) * 8) - dias) };
    const r = A.resumenDesbloqueo({ lista: l, dias });
    assert.equal(r.disponibles, antiguo.disponibles, `dias=${dias}`);
    assert.equal(r.bloqueados > 0, antiguo.hayBloqueados, `dias=${dias}`);
    if (antiguo.hayBloqueados) assert.equal(r.faltan, antiguo.faltan, `dias=${dias}`);
    assert.deepEqual(A.resumenDesbloqueo({ lista: l, dias, adelantados: [] }), r);
  }
});

test('resumenDesbloqueo CON adelantados cuenta el curso abierto y el próximo en abrirse es el siguiente real', () => {
  const l = lista(6);
  // 10 días: abiertos c0 y c1 (posiciones 0 y 1); c2 abre en 6 días
  const base = A.resumenDesbloqueo({ lista: l, dias: 10 });
  assert.deepEqual([base.disponibles, base.bloqueados, base.faltan], [2, 4, 6]);
  const conPremio = A.resumenDesbloqueo({ lista: l, dias: 10, adelantados: ['c5'] });
  assert.deepEqual([conPremio.disponibles, conPremio.bloqueados, conPremio.faltan], [3, 3, 6]);
  // si se adelanta justo el que abriría primero, el próximo en abrirse es el siguiente de la fila
  const adelantaElProximo = A.resumenDesbloqueo({ lista: l, dias: 10, adelantados: ['c2'] });
  assert.deepEqual([adelantaElProximo.disponibles, adelantaElProximo.faltan], [3, 14]);
  // si ya no queda nada bloqueado
  const todos = A.resumenDesbloqueo({ lista: lista(2), dias: 0, adelantados: ['c1'] });
  assert.deepEqual([todos.disponibles, todos.bloqueados], [2, 0]);
});

test('la biblioteca pide los premios solo con membresía, con tiempo corto, y pasa los adelantados a TODOS los cálculos', () => {
  const bib = fs.readFileSync(path.join(__dirname, '..', 'pages', 'club-biblioteca.html'), 'utf8');
  assert.match(bib, /club-premios\.js\?v=\d+/);
  assert.match(bib, /async function cargarAdelantados\(session\)/);
  assert.match(bib, /hasActiveMembership\(session\)\) return \[\]/);
  assert.match(bib, /ZOO_PREMIOS\.consultar\(4000\)/);
  assert.match(bib, /window\.__zooAdelantados = adelantados/);
  // un solo punto calcula el desbloqueo y recibe los adelantados; tarjetas, detalle, clases y banner pasan por ahí
  assert.equal((bib.match(/ZOO_ACCESO\.desbloqueoCurso\(/g) || []).length, 1);
  assert.match(bib, /adelantados: window\.__zooAdelantados/);
  // el resumen de la ruta (banner) sale del servidor o, sin él, de ese mismo cálculo por curso
  assert.match(bib, /window\.__zooResumenRuta = \(\) =>/);
  assert.ok((bib.match(/window\.__zooDesbloqueo\(/g) || []).length >= 4, 'tarjetas, detalle, clase y apertura de clase usan el mismo cálculo');
});

test('la tarjeta del curso muestra "Abierto por premio" solo para quien tiene membresía y lo abrió con premio', () => {
  const UI = require('../assets/js/club-cursos-ui.js');
  const c = { id: 'c1', title: 'Curso', lecciones: [{ videoId: 'v' }] };
  const con = UI.tarjetaHTML(c, { modo: 'miembro', desbloqueo: { desbloqueado: true, diasFalta: 0, motivo: null, porPremio: true } });
  assert.ok(con.includes('Abierto por premio') && con.includes('zc-badge--premio'));
  assert.ok(!UI.tarjetaHTML(c, { modo: 'miembro', desbloqueo: { desbloqueado: true, diasFalta: 0, motivo: null } }).includes('Abierto por premio'));
  assert.ok(!UI.tarjetaHTML(c, { modo: 'miembro', desbloqueo: { desbloqueado: false, diasFalta: 4, motivo: 'tiempo' } }).includes('Abierto por premio'));
  assert.ok(!UI.tarjetaHTML(c, { modo: 'prueba', desbloqueo: null }).includes('Abierto por premio'));
});
