'use strict';

// Lógica de los juegos de clase (sin pantalla). Ejecutar: node --test tests/club-juegos.test.js

const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const J = require(path.join(__dirname, '..', 'assets', 'js', 'club-juegos.js'));

// Azar repetible para que las pruebas sean deterministas.
function semilla(s) {
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ───────── utilidades ───────── */

test('esc() escapa HTML y tolera null/undefined', () => {
  assert.equal(J.esc('<b>&"\''), '&lt;b&gt;&amp;&quot;&#39;');
  assert.equal(J.esc(null), '');
  assert.equal(J.esc(undefined), '');
  assert.equal(J.esc(7), '7');
});

test('limpiarLetras(): sin acentos, mayúsculas y conserva la Ñ', () => {
  assert.equal(J.limpiarLetras('Murciélago'), 'MURCIELAGO');
  assert.equal(J.limpiarLetras('niño'), 'NIÑO');
  assert.equal(J.limpiarLetras('  águila real! '), 'AGUILAREAL');
  assert.equal(J.limpiarLetras('abeja-2'), 'ABEJA');
  assert.equal(J.limpiarLetras(null), '');
});

test('urlImagenSegura(): acepta http(s), rutas del sitio e imágenes incrustadas; rechaza lo peligroso', () => {
  assert.equal(J.urlImagenSegura('https://example.com/a.jpg'), 'https://example.com/a.jpg');
  assert.equal(J.urlImagenSegura('../assets/img/cursos/x.jpg'), '../assets/img/cursos/x.jpg');
  assert.equal(J.urlImagenSegura('assets/img/banner/banner.png'), 'assets/img/banner/banner.png');
  assert.ok(J.urlImagenSegura('data:image/png;base64,iVBORw0KGgo='));
  for (const malo of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html;base64,PHNjcmlwdD4=', 'ftp://x/y.jpg',
    'https://x.com/a b.jpg', 'https://x.com/"onload="x', '../assets/../../etc/passwd', '', null, undefined, 'x'.repeat(2500)]) {
    assert.equal(J.urlImagenSegura(malo), null, `debía rechazar: ${String(malo).slice(0, 40)}`);
  }
});

test('barajar() conserva los elementos y no modifica la lista original', () => {
  const base = [1, 2, 3, 4, 5, 6, 7, 8];
  const copia = base.slice();
  const m = J.barajar(base, semilla(3));
  assert.deepEqual(base, copia);
  assert.deepEqual(m.slice().sort(), copia);
});

test('barajar() produce todos los órdenes posibles (no está sesgada)', () => {
  const vistos = new Set();
  const r = semilla(11);
  for (let i = 0; i < 400; i++) vistos.add(J.barajar([1, 2, 3], r).join(''));
  assert.equal(vistos.size, 6);
});

/* ───────── validación: limpiarJuego ───────── */

test('limpiarJuego(): rechaza basura y tipos desconocidos', () => {
  for (const malo of [null, undefined, 5, 'x', [], {}, { tipo: 'otro' }, { tipo: '__proto__' }, { tipo: 'constructor', datos: {} }, { tipo: ['sopa_letras'] }]) {
    assert.equal(J.limpiarJuego(malo), null);
  }
});

test('sopa: normaliza palabras, quita repetidas y exige mínimo 3 válidas', () => {
  const ok = J.limpiarJuego({ tipo: 'sopa_letras', datos: { palabras: ['Abeja', 'abeja', 'Águila', 'Niño', '', '  '] } });
  assert.deepEqual(ok.datos.palabras, ['ABEJA', 'AGUILA', 'NIÑO']);
  assert.equal(J.limpiarJuego({ tipo: 'sopa_letras', datos: { palabras: ['uno', 'dos'] } }), null);
  assert.equal(J.limpiarJuego({ tipo: 'sopa_letras', datos: {} }), null);
  assert.equal(J.limpiarJuego({ tipo: 'sopa_letras' }), null);
});

test('sopa: descarta palabras de 1 letra o de más de 14 letras', () => {
  const j = J.limpiarJuego({ tipo: 'sopa_letras', datos: { palabras: ['a', 'abejas', 'tortuga', 'cocodrilo', 'palabrademasiadolarga'] } });
  assert.deepEqual(j.datos.palabras, ['ABEJAS', 'TORTUGA', 'COCODRILO']);
});

test('sopa: palabras que no son texto no rompen nada', () => {
  assert.equal(J.limpiarJuego({ tipo: 'sopa_letras', datos: { palabras: [null, {}, 5, ['x'], undefined] } }), null);
  assert.equal(J.limpiarJuego({ tipo: 'sopa_letras', datos: { palabras: 'abeja tortuga zorro' } }), null);
});

test('memorama: exige término y definición, recorta largos y mínimo 3 pares', () => {
  const ok = J.limpiarJuego({ tipo: 'memorama', datos: { pares: [
    { termino: ' Polen ', definicion: 'Grano   fértil' }, { termino: 'Néctar', definicion: 'Azúcar floral' },
    { termino: 'Colmena', definicion: 'Hogar' }, { termino: 'Solo término', definicion: '' }, { termino: '', definicion: 'solo def' }] } });
  assert.equal(ok.datos.pares.length, 3);
  assert.deepEqual(ok.datos.pares[0], { termino: 'Polen', definicion: 'Grano fértil' });
  assert.equal(J.limpiarJuego({ tipo: 'memorama', datos: { pares: [{ termino: 'a', definicion: 'b' }, { termino: 'c', definicion: 'd' }] } }), null);
  const largo = J.limpiarJuego({ tipo: 'memorama', datos: { pares: [1, 2, 3].map(i => ({ termino: 'T'.repeat(500), definicion: 'D'.repeat(900) + i })) } });
  assert.equal(largo.datos.pares[0].termino.length, 80);
  assert.equal(largo.datos.pares[0].definicion.length, 200);
});

test('rompecabezas: dificultad válida (3, 4 o 5) y URL de imagen segura', () => {
  assert.deepEqual(J.limpiarJuego({ tipo: 'rompecabezas', datos: { dificultad: '4', imagenUrl: 'https://x.com/a.jpg' } }).datos, { dificultad: '4', imagenUrl: 'https://x.com/a.jpg' });
  assert.equal(J.limpiarJuego({ tipo: 'rompecabezas', datos: { dificultad: 9 } }).datos.dificultad, '3');
  assert.equal(J.limpiarJuego({ tipo: 'rompecabezas', datos: {} }).datos.dificultad, '3');
  assert.equal(J.limpiarJuego({ tipo: 'rompecabezas', datos: { dificultad: 5 } }).datos.dificultad, '5');
  assert.equal(J.limpiarJuego({ tipo: 'rompecabezas', datos: { imagenUrl: 'javascript:alert(1)' } }).datos.imagenUrl, null);
  assert.equal(J.limpiarJuego({ tipo: 'rompecabezas' }).datos.imagenUrl, null);
});

test('ahorcado: palabras solo con letras, sin acentos, de 3 a 16 letras, con pista recortada', () => {
  const j = J.limpiarJuego({ tipo: 'ahorcado', datos: { palabras: [
    { palabra: 'Murciélago', pista: 'Mamífero volador' }, { palabra: 'oso', pista: '' }, { palabra: 'ab', pista: 'corta' },
    { palabra: 'águila real', pista: 'x'.repeat(400) }, { palabra: '1234', pista: 'solo números' }] } });
  assert.deepEqual(j.datos.palabras.map(p => p.palabra), ['MURCIELAGO', 'OSO', 'AGUILAREAL']);
  assert.equal(j.datos.palabras[2].pista.length, 140);
  assert.equal(J.limpiarJuego({ tipo: 'ahorcado', datos: { palabras: [{ palabra: 'ab' }] } }), null);
  assert.equal(J.limpiarJuego({ tipo: 'ahorcado', datos: { palabras: [] } }), null);
});

test('limpiarJuego() no modifica el objeto original', () => {
  const entrada = { tipo: 'sopa_letras', datos: { palabras: ['abeja', 'tortuga', 'zorro'] } };
  const copia = JSON.stringify(entrada);
  J.limpiarJuego(entrada);
  assert.equal(JSON.stringify(entrada), copia);
});

test('limpiarJuego() es idempotente: limpiar dos veces da lo mismo', () => {
  for (const crudo of [
    { tipo: 'sopa_letras', datos: { palabras: ['Águila', 'niño', 'abeja'] } },
    { tipo: 'memorama', datos: { pares: [1, 2, 3].map(i => ({ termino: 'T' + i, definicion: 'D' + i })) } },
    { tipo: 'rompecabezas', datos: { dificultad: 4 } },
    { tipo: 'ahorcado', datos: { palabras: [{ palabra: 'zorro', pista: 'p' }] } }]) {
    const una = J.limpiarJuego(crudo);
    assert.deepEqual(J.limpiarJuego(una), una);
  }
});

test('limpiarJuego(): un tope evita listas gigantes', () => {
  const muchas = Array.from({ length: 200 }, (_, i) => 'palabra' + 'abcdefghijklmnopqrstuvwxyz'[i % 26] + 'x'.repeat(i % 5));
  assert.ok(J.limpiarJuego({ tipo: 'sopa_letras', datos: { palabras: muchas } }).datos.palabras.length <= 30);
});

/* ───────── sopa de letras ───────── */

test('generarSopa(): cada palabra colocada se puede leer en el tablero siguiendo su dirección', () => {
  for (let s = 1; s <= 40; s++) {
    const { grid, placed } = J.generarSopa(['abeja', 'tortuga', 'jaguar', 'colibri', 'zorro', 'águila'], semilla(s));
    assert.ok(placed.length >= 4, `semilla ${s}: se colocaron muy pocas`);
    for (const p of placed) {
      let texto = '';
      for (let i = 0; i < p.word.length; i++) texto += grid[p.row0 + p.dir[0] * i][p.col0 + p.dir[1] * i];
      assert.equal(texto, p.word, `semilla ${s}: ${p.word} no coincide con el tablero`);
    }
  }
});

test('generarSopa(): el tablero es cuadrado, sin celdas vacías y con tamaño razonable', () => {
  const { grid, size } = J.generarSopa(['abeja', 'tortuga', 'colibri'], semilla(5));
  assert.ok(size >= 10 && size <= 15);
  assert.equal(grid.length, size);
  for (const fila of grid) { assert.equal(fila.length, size); for (const c of fila) assert.match(c, /^[A-ZÑ]$/); }
});

test('generarSopa(): un tablero grande para palabras largas y nunca desborda', () => {
  const { size, placed } = J.generarSopa(['cocodrilooooo', 'abeja', 'zorro'], semilla(2));
  assert.ok(size >= 13 && size <= 15);
  for (const p of placed) {
    const fr = p.row0 + p.dir[0] * (p.word.length - 1), fc = p.col0 + p.dir[1] * (p.word.length - 1);
    assert.ok(fr >= 0 && fr < size && fc >= 0 && fc < size);
  }
});

test('generarSopa(): ignora palabras inválidas y no revienta con listas vacías', () => {
  assert.equal(J.generarSopa([], semilla(1)).placed.length, 0);
  assert.equal(J.generarSopa(['a', '', null, 'x'.repeat(30)], semilla(1)).placed.length, 0);
  assert.equal(J.generarSopa(undefined, semilla(1)).placed.length, 0);
});

test('lineaEntre(): horizontal, vertical, diagonal y celdas fuera del tablero', () => {
  assert.deepEqual(J.lineaEntre({ r: 2, c: 1 }, { r: 2, c: 4 }, 10).map(x => [x.r, x.c]), [[2, 1], [2, 2], [2, 3], [2, 4]]);
  assert.deepEqual(J.lineaEntre({ r: 0, c: 3 }, { r: 2, c: 3 }, 10).map(x => [x.r, x.c]), [[0, 3], [1, 3], [2, 3]]);
  assert.deepEqual(J.lineaEntre({ r: 1, c: 1 }, { r: 3, c: 3 }, 10).map(x => [x.r, x.c]), [[1, 1], [2, 2], [3, 3]]);
  assert.deepEqual(J.lineaEntre({ r: 3, c: 1 }, { r: 1, c: 3 }, 10).map(x => [x.r, x.c]), [[3, 1], [2, 2], [1, 3]]);
  assert.deepEqual(J.lineaEntre({ r: 4, c: 4 }, { r: 4, c: 4 }, 10), [{ r: 4, c: 4 }]);
  // trayecto torcido: se ajusta a la dirección dominante
  assert.deepEqual(J.lineaEntre({ r: 0, c: 0 }, { r: 1, c: 4 }, 10).map(x => [x.r, x.c]), [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]]);
  // no se sale del tablero
  assert.ok(J.lineaEntre({ r: 0, c: 0 }, { r: 0, c: 20 }, 10).length <= 10);
});

test('buscarCoincidencia(): encuentra la palabra en ambos sentidos y no repite las ya halladas', () => {
  const { grid, placed } = J.generarSopa(['abeja', 'tortuga', 'zorro'], semilla(8));
  const p = placed[0];
  const ini = { r: p.row0, c: p.col0 };
  const fin = { r: p.row0 + p.dir[0] * (p.word.length - 1), c: p.col0 + p.dir[1] * (p.word.length - 1) };
  const hallados = new Set();
  assert.equal(J.buscarCoincidencia(grid, J.lineaEntre(ini, fin, grid.length), placed, hallados).word, p.word);
  assert.equal(J.buscarCoincidencia(grid, J.lineaEntre(fin, ini, grid.length), placed, hallados).word, p.word, 'al revés también');
  hallados.add(p.word);
  assert.equal(J.buscarCoincidencia(grid, J.lineaEntre(ini, fin, grid.length), placed, hallados), null, 'ya encontrada');
  assert.equal(J.buscarCoincidencia(grid, [{ r: 0, c: 0 }], placed, new Set()), null, 'una sola celda no cuenta');
  assert.equal(J.buscarCoincidencia(grid, null, placed, new Set()), null);
});

/* ───────── memorama ───────── */

const PARES = [{ termino: 'Polen', definicion: 'Grano fértil' }, { termino: 'Néctar', definicion: 'Azúcar floral' }, { termino: 'Colmena', definicion: 'Hogar' }];

test('crearCartas(): dos cartas por par, una de cada tipo, mezcladas', () => {
  const cartas = J.crearCartas(PARES, semilla(4));
  assert.equal(cartas.length, 6);
  for (let i = 0; i < PARES.length; i++) {
    const delPar = cartas.filter(c => c.parId === i);
    assert.equal(delPar.length, 2);
    assert.deepEqual(delPar.map(c => c.tipo).sort(), ['definicion', 'termino']);
  }
  const ordenes = new Set();
  for (let s = 1; s <= 30; s++) ordenes.add(J.crearCartas(PARES, semilla(s)).map(c => c.texto).join('|'));
  assert.ok(ordenes.size > 5, 'las cartas deben cambiar de lugar');
});

test('sonPar(): solo término + definición del mismo par', () => {
  const cartas = J.crearCartas(PARES, semilla(1));
  const t0 = cartas.find(c => c.parId === 0 && c.tipo === 'termino'), d0 = cartas.find(c => c.parId === 0 && c.tipo === 'definicion');
  const t1 = cartas.find(c => c.parId === 1 && c.tipo === 'termino'), d1 = cartas.find(c => c.parId === 1 && c.tipo === 'definicion');
  assert.equal(J.sonPar(t0, d0), true);
  assert.equal(J.sonPar(d0, t0), true);
  assert.equal(J.sonPar(t0, d1), false);
  assert.equal(J.sonPar(t0, t1), false);
  assert.equal(J.sonPar(t0, t0), false, 'una carta consigo misma no es par');
  assert.equal(J.sonPar(null, d0), false);
});

/* ───────── rompecabezas ───────── */

test('barajarSlots(): es una permutación completa y nunca llega armado', () => {
  for (const total of [4, 9, 16, 25]) {
    for (let s = 1; s <= 60; s++) {
      const slots = J.barajarSlots(total, semilla(s));
      assert.deepEqual(slots.slice().sort((a, b) => a - b), Array.from({ length: total }, (_, i) => i));
      assert.equal(slots.every((v, i) => v === i), false, `semilla ${s}, total ${total}: llegó armado`);
    }
  }
});

test('barajarSlots(): incluso con un azar que siempre da el mismo resultado no queda armado', () => {
  assert.equal(J.barajarSlots(9, () => 0.9999).every((v, i) => v === i), false);
  assert.equal(J.barajarSlots(9, () => 0).every((v, i) => v === i), false);
});

test('puzzleResuelto(): solo cuando cada pieza está en su lugar', () => {
  assert.equal(J.puzzleResuelto([{ slot: '0', pieza: '0' }, { slot: 1, pieza: 1 }, { slot: '2', pieza: 2 }]), true);
  assert.equal(J.puzzleResuelto([{ slot: 0, pieza: 1 }, { slot: 1, pieza: 0 }]), false);
  assert.equal(J.puzzleResuelto([]), false);
});

/* ───────── ahorcado ───────── */

const LISTA = [{ palabra: 'ABEJA', pista: 'Poliniza' }, { palabra: 'TORTUGA', pista: 'Con caparazón' }, { palabra: 'ZORRO', pista: '' }];

test('nuevaPartidaAhorcado(): revela 1-2 letras de apoyo que sí están en la palabra y nunca la palabra completa', () => {
  for (let s = 1; s <= 80; s++) {
    const est = J.nuevaPartidaAhorcado(LISTA, semilla(s), null);
    assert.ok(est.apoyo.length >= 1 && est.apoyo.length <= 2, `semilla ${s}`);
    for (const l of est.apoyo) assert.ok(est.palabra.includes(l));
    assert.equal(J.ganoAhorcado(est), false);
    assert.equal(est.errores, 0);
  }
});

test('nuevaPartidaAhorcado(): palabras de una sola letra repetida no se regalan', () => {
  const est = J.nuevaPartidaAhorcado([{ palabra: 'AAA', pista: '' }], semilla(1), null);
  assert.equal(est.apoyo.length, 0);
  assert.equal(J.ganoAhorcado(est), false);
});

test('nuevaPartidaAhorcado(): al reintentar cambia de palabra si hay más de una', () => {
  const primera = J.nuevaPartidaAhorcado(LISTA, semilla(3), null);
  for (let s = 1; s <= 30; s++) assert.notEqual(J.nuevaPartidaAhorcado(LISTA, semilla(s), primera.elegido).elegido, primera.elegido);
  const unica = [{ palabra: 'ABEJA', pista: '' }];
  assert.equal(J.nuevaPartidaAhorcado(unica, semilla(1), unica[0]).elegido, unica[0]);
});

test('jugarLetra(): acierto suma, error resta intento y repetir una letra no hace nada', () => {
  const est = J.nuevaPartidaAhorcado([{ palabra: 'ZORRO', pista: '' }], semilla(1), null);
  const sinUsar = 'ZORRO'.split('').find(l => !est.usadas.has(l));
  const errAntes = est.errores;
  J.jugarLetra(est, sinUsar);
  assert.ok(est.adivinadas.has(sinUsar));
  assert.equal(est.errores, errAntes);
  J.jugarLetra(est, 'Q');
  assert.equal(est.errores, errAntes + 1);
  J.jugarLetra(est, 'Q');
  assert.equal(est.errores, errAntes + 1, 'repetir no debe castigar dos veces');
});

test('ahorcado: se gana adivinando todas las letras', () => {
  const est = J.nuevaPartidaAhorcado([{ palabra: 'ABEJA', pista: '' }], semilla(2), null);
  'ABEJA'.split('').forEach(l => J.jugarLetra(est, l));
  assert.equal(J.ganoAhorcado(est), true);
  assert.equal(J.perdioAhorcado(est), false);
});

test('ahorcado: se pierde a los 6 errores y después ya no se puede jugar', () => {
  const est = J.nuevaPartidaAhorcado([{ palabra: 'ABEJA', pista: '' }], semilla(2), null);
  'QWXYZKM'.split('').forEach(l => J.jugarLetra(est, l));
  assert.equal(est.errores, 6);
  assert.equal(J.perdioAhorcado(est), true);
  J.jugarLetra(est, 'B');
  assert.equal(est.adivinadas.has('B'), false, 'tras perder no se acepta otra letra');
});

test('ahorcado: palabras con Ñ se pueden adivinar con el teclado del juego', () => {
  const j = J.limpiarJuego({ tipo: 'ahorcado', datos: { palabras: [{ palabra: 'Niño', pista: '' }] } });
  assert.equal(j.datos.palabras[0].palabra, 'NIÑO');
  const est = J.nuevaPartidaAhorcado(j.datos.palabras, semilla(1), null);
  'NIÑO'.split('').forEach(l => J.jugarLetra(est, l));
  assert.equal(J.ganoAhorcado(est), true);
});

/* ───────── abrir() sin navegador ───────── */

test('abrir(): con un juego inválido avisa que terminó para no bloquear la clase', () => {
  let terminado = 0;
  const r = J.abrir({ tipo: 'sopa_letras', datos: { palabras: ['uno'] } }, { alTerminar: () => { terminado++; } });
  assert.equal(r, null);
  assert.equal(terminado, 1);
  assert.equal(J.abrir(null, { alTerminar: () => { terminado++; } }), null);
  assert.equal(terminado, 2);
});

test('abrir(): sin navegador (Node) no revienta y deja continuar', () => {
  let terminado = 0;
  const r = J.abrir({ tipo: 'memorama', datos: { pares: [1, 2, 3].map(i => ({ termino: 'T' + i, definicion: 'D' + i })) } }, { alTerminar: () => { terminado++; } });
  assert.equal(r, null);
  assert.equal(terminado, 1);
});

test('el catálogo de tipos expone exactamente los cuatro juegos', () => {
  assert.deepEqual(Object.keys(J.TIPOS).sort(), ['ahorcado', 'memorama', 'rompecabezas', 'sopa_letras']);
});
