'use strict';
// Un curso nuevo se acomoda al FINAL de la fila de desbloqueo y no mueve a los cursos que ya existían.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../assets/js/club-acceso.js');
const C = require('../assets/js/admin-cursos.js');

const GRATIS = A.VIDEO_GRATIS_FIJO;
// Cursos como los entrega Firestore: el más nuevo primero. El del medio trae la clase gratis de siempre.
const viejos = Array.from({ length: 15 }, (_, i) => ({ id: 'v' + i, title: 'Viejo ' + i, lecciones: [{ videoId: i === 6 ? GRATIS : 'x' + i }] }));

// Lo que hace la biblioteca: ordena y luego pone primero el curso con la clase gratis (orden estable).
function ordenBiblioteca(lista, conOrdenVip) {
  const l = conOrdenVip ? A.ordenarCursos(lista) : lista.slice();
  return l.slice().sort((a, b) => (b.lecciones.some(x => A.esClaseGratis(x, b)) ? 1 : 0) - (a.lecciones.some(x => A.esClaseGratis(x, a)) ? 1 : 0));
}
const abiertos = (lista, dias) => lista.map((c, i) => [c.id, A.desbloqueadoPorTiempo(lista, i, dias)]).filter(([, a]) => a).map(([id]) => id);

test('sin ningún curso nuevo el orden es EXACTAMENTE el de siempre', () => {
  assert.deepEqual(A.ordenarCursos(viejos).map(c => c.id), viejos.map(c => c.id));
  assert.equal(A.ordenarCursos(viejos).length, 15);
  assert.deepEqual(ordenBiblioteca(viejos, true).map(c => c.id), ordenBiblioteca(viejos, false).map(c => c.id));
});

test('un curso nuevo (con ordenVip) va al final aunque Firestore lo entregue primero', () => {
  const nuevo = { id: 'n1', title: 'Nuevo', ordenVip: 0, lecciones: [{ videoId: 'n' }] };
  const lista = A.ordenarCursos([nuevo, ...viejos]);   // el más nuevo llega primero, como en Firestore
  assert.equal(lista[lista.length - 1].id, 'n1');
  assert.deepEqual(lista.slice(0, 15).map(c => c.id), viejos.map(c => c.id), 'los de siempre conservan su orden');
});

test('varios cursos nuevos se acomodan por orden de llegada (ordenVip), no por fecha', () => {
  const n2 = { id: 'n2', ordenVip: 1 }, n1 = { id: 'n1', ordenVip: 0 }, n3 = { id: 'n3', ordenVip: 2 };
  assert.deepEqual(A.ordenarCursos([n3, viejos[0], n2, n1, viejos[1]]).map(c => c.id), ['v0', 'v1', 'n1', 'n2', 'n3']);
  // empate: se respeta el orden en que llegan
  assert.deepEqual(A.ordenarCursos([{ id: 'a', ordenVip: 5 }, { id: 'b', ordenVip: 5 }]).map(c => c.id), ['a', 'b']);
});

test('ningún miembro pierde acceso a un curso que ya tenía abierto cuando se agrega un curso nuevo (todas las antigüedades)', () => {
  const nuevo = { id: 'n1', title: 'Nuevo', ordenVip: 0, lecciones: [{ videoId: 'n' }] };
  for (let dias = 0; dias <= 140; dias++) {
    const antes = abiertos(ordenBiblioteca(viejos, true), dias);
    const despues = abiertos(ordenBiblioteca([nuevo, ...viejos], true), dias);
    for (const id of antes) assert.ok(despues.includes(id), `dias=${dias}: el curso ${id} se cerró`);
  }
});

test('comparación: SIN ordenVip (como era antes) el curso nuevo sí empujaba a los demás', () => {
  const nuevo = { id: 'n1', title: 'Nuevo', lecciones: [{ videoId: 'n' }] };
  let hubo = false;
  for (let dias = 0; dias <= 140 && !hubo; dias++) {
    const antes = abiertos(ordenBiblioteca(viejos, true), dias);
    const despues = abiertos(ordenBiblioteca([nuevo, ...viejos], true), dias);
    if (antes.some(id => !despues.includes(id))) hubo = true;
  }
  assert.equal(hubo, true, 'este es el problema que se evita con ordenVip');
});

test('un curso con la clase gratis de siempre sigue yendo primero', () => {
  const nuevo = { id: 'n1', ordenVip: 0, lecciones: [{ videoId: 'n' }] };
  assert.equal(ordenBiblioteca([nuevo, ...viejos], true)[0].id, 'v6');
});

test('ordenVip inválido (texto, NaN) se trata como curso de siempre', () => {
  const raros = [{ id: 'a', ordenVip: '3' }, { id: 'b', ordenVip: NaN }, { id: 'c', ordenVip: null }, { id: 'd', ordenVip: 0 }];
  assert.deepEqual(A.ordenarCursos(raros).map(c => c.id), ['a', 'b', 'c', 'd']);
  assert.deepEqual(A.ordenarCursos(null), []);
});

/* ── Panel: a quién se le asigna el orden ── */
test('siguienteOrdenVip: 0 si nadie lo tiene; después del más alto si ya hay', () => {
  assert.equal(C.siguienteOrdenVip(viejos), 0);
  assert.equal(C.siguienteOrdenVip([{ ordenVip: 0 }, { ordenVip: 4 }, { id: 'x' }]), 5);
  assert.equal(C.siguienteOrdenVip(null), 0);
  assert.equal(C.siguienteOrdenVip([{ ordenVip: '9' }]), 0, 'solo cuentan números');
});

test('curso NUEVO progresivo recibe orden; los de siempre que se editan NO', () => {
  assert.equal(C.calcularOrdenVip(viejos, null, {}), 0);
  assert.equal(C.calcularOrdenVip([...viejos, { ordenVip: 2 }], null, {}), 3);
  assert.equal(C.calcularOrdenVip(viejos, viejos[3], {}), undefined, 'editar un curso de siempre no lo mueve');
  assert.equal(C.calcularOrdenVip(viejos, { id: 'n', ordenVip: 1 }, {}), undefined, 'un curso nuevo ya ordenado conserva su lugar');
});

test('cursos "disponible siempre" o con clases gratis de muestra no hacen fila', () => {
  assert.equal(C.calcularOrdenVip(viejos, null, { disponibleSiempre: true }), undefined);
  assert.equal(C.calcularOrdenVip(viejos, null, { cursoMuestraGratis: true }), undefined);
});

test('un curso que estaba fuera de la fila y pasa a progresivo sí entra al final de la fila', () => {
  assert.equal(C.calcularOrdenVip([{ ordenVip: 0 }], { id: 's', disponibleSiempre: true }, { disponibleSiempre: false }), 1);
  assert.equal(C.calcularOrdenVip([], { id: 'm', cursoMuestraGratis: true }, {}), 0);
});

test('la biblioteca y el panel usan estas reglas', () => {
  const fs = require('node:fs'), path = require('node:path');
  const RAIZ = path.resolve(__dirname, '..');
  const bib = fs.readFileSync(path.join(RAIZ, 'pages', 'club-biblioteca.html'), 'utf8');
  const adm = fs.readFileSync(path.join(RAIZ, 'pages', 'admin-club.html'), 'utf8');
  // El orden de la fila (cursos nuevos al final y la clase gratis de siempre primero) vive en ZOO_ACCESO.ordenParaDesbloqueo,
  // que la biblioteca y los premios comparten (su equivalencia con el orden anterior se prueba en tests/club-premios-acceso.test.js).
  assert.match(bib, /ZOO_ACCESO\.ordenParaDesbloqueo\(cursosDeFirestore\)/);
  assert.match(adm, /CURSOS\.calcularOrdenVip\(cursosEstado\.items, actual, \{ disponibleSiempre, cursoMuestraGratis \}\)/);
  assert.match(adm, /if \(ordenVip !== undefined\) data\.ordenVip = ordenVip;/);
  assert.match(adm, /CURSOS\.siguienteOrdenVip\(existentes\.concat\(creadosEnEstaCorrida\)\)/);
});
