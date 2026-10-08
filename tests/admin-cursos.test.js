'use strict';

// Módulo de Cursos del panel admin. Ejecutar: node --test tests/admin-cursos.test.js

const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const RAIZ = path.join(__dirname, '..');
const C = require(path.join(RAIZ, 'assets', 'js', 'admin-cursos.js'));
const J = require(path.join(RAIZ, 'assets', 'js', 'club-juegos.js'));

const juegoSopa = () => ({ tipo: 'sopa_letras', datos: { palabras: ['abeja', 'polen', 'colmena'] } });
const curso = (extra = {}) => ({ id: 'c1', title: 'Manejo de colmenas', area: 'Apicultura', level: 'Intermedio', duration: '6 h', createdAt: '2026-05-01T00:00:00.000Z',
  lecciones: [{ titulo: 'Clase 1', videoId: 'v1', duration: '20 min' }, { titulo: 'Clase 2', videoId: 'v2', duration: '30 min', juego: juegoSopa() }], ...extra });

/* ───────── horas ───────── */

test('parseHoras(): horas, minutos, mezclas y número solo', () => {
  assert.equal(C.parseHoras('6 h'), 6);
  assert.equal(C.parseHoras('6h'), 6);
  assert.equal(C.parseHoras('4 horas'), 4);
  assert.equal(C.parseHoras('2.5 horas'), 2.5);
  assert.equal(C.parseHoras('2,5 h'), 2.5);
  assert.equal(C.parseHoras('90 min'), 1.5);
  assert.equal(C.parseHoras('25 minutos'), 0.42);
  assert.equal(C.parseHoras('1 h 30 min'), 1.5);
  assert.equal(C.parseHoras('6'), 6);
});

test('parseHoras(): lo que no es una duración devuelve null', () => {
  for (const x of ['', '   ', null, undefined, 'mucho', 'varias horas libres', '-3 h', '99999 h', '{}']) assert.equal(C.parseHoras(x), null, String(x));
});

/* ───────── resumen, filtros y orden ───────── */

test('resumenCursos(): totales, horas y cursos con juego', () => {
  const r = C.resumenCursos([curso(), curso({ id: 'c2', duration: '90 min', lecciones: [{ videoId: 'x' }] }), curso({ id: 'c3', duration: '', lecciones: [] , totalClases: 4 })]);
  assert.equal(r.total, 3);
  assert.equal(r.clases, 2 + 1 + 4);
  assert.equal(r.horas, 7.5);
  assert.equal(r.conJuego, 1);
  assert.equal(r.juegos, 1);
  assert.equal(r.promedioClases, 2.3);
});

test('resumenCursos(): no cuenta juegos inválidos y tolera catálogos vacíos', () => {
  const r = C.resumenCursos([curso({ lecciones: [{ videoId: 'a', juego: { tipo: 'sopa_letras', datos: { palabras: ['uno'] } } }] })]);
  assert.equal(r.juegos, 0);
  assert.deepEqual(C.resumenCursos([]), { total: 0, clases: 0, horas: 0, conJuego: 0, juegos: 0, promedioClases: 0 });
});

test('contarClases() usa las clases reales y, si no hay, totalClases o la clase antigua de Drive', () => {
  assert.equal(C.contarClases(curso()), 2);
  assert.equal(C.contarClases({ lecciones: [], totalClases: 5 }), 5);
  assert.equal(C.contarClases({ driveId: 'abc', title: 'Viejo' }), 1);
  assert.equal(C.contarClases({}), 0);
});

test('filtrarCursos(): por texto sin acentos ni mayúsculas, por área y combinados', () => {
  const lista = [curso({ id: 'a', title: 'Biología de tiburones', area: 'Fauna silvestre' }), curso({ id: 'b', title: 'Apicultura básica', area: 'Apicultura', description: 'Abejas y polinización' }), curso({ id: 'c', title: 'Etología canina', area: 'Etología', tag: 'Nuevo' })];
  assert.deepEqual(C.filtrarCursos(lista, { texto: 'BIOLOGIA' }).map(c => c.id), ['a']);
  assert.deepEqual(C.filtrarCursos(lista, { texto: 'polinizacion' }).map(c => c.id), ['b']);
  assert.deepEqual(C.filtrarCursos(lista, { texto: 'nuevo' }).map(c => c.id), ['c']);
  assert.deepEqual(C.filtrarCursos(lista, { area: 'Apicultura' }).map(c => c.id), ['b']);
  assert.deepEqual(C.filtrarCursos(lista, { texto: 'etologia', area: 'Apicultura' }), []);
  assert.equal(C.filtrarCursos(lista, {}).length, 3);
});

test('ordenarCursos(): A–Z, recientes y más clases; no modifica la lista original', () => {
  const lista = [curso({ id: 'a', title: 'Zorros', createdAt: '2026-01-01T00:00:00Z', lecciones: [{ videoId: 1 }] }), curso({ id: 'b', title: 'Águilas', createdAt: '2026-03-01T00:00:00Z', lecciones: [{ videoId: 1 }, { videoId: 2 }, { videoId: 3 }] }), curso({ id: 'c', title: 'Búhos', createdAt: '2026-02-01T00:00:00Z', lecciones: [{ videoId: 1 }, { videoId: 2 }] })];
  const copia = JSON.stringify(lista);
  assert.deepEqual(C.ordenarCursos(lista, 'az').map(c => c.id), ['b', 'c', 'a']);
  assert.deepEqual(C.ordenarCursos(lista, 'recientes').map(c => c.id), ['b', 'c', 'a']);
  assert.deepEqual(C.ordenarCursos(lista, 'clases').map(c => c.id), ['b', 'c', 'a']);
  assert.equal(JSON.stringify(lista), copia);
});

test('ordenarCursos(): tolera fechas ausentes o inválidas', () => {
  const r = C.ordenarCursos([curso({ id: 'a', createdAt: undefined, title: 'B' }), curso({ id: 'b', createdAt: 'no-es-fecha', title: 'A' }), curso({ id: 'c', title: 'C' })], 'recientes');
  assert.equal(r[0].id, 'c');
});

test('areasConConteo(): cuenta por área y ordena de más a menos', () => {
  const r = C.areasConConteo([curso({ area: 'Etología' }), curso({ area: 'Apicultura' }), curso({ area: 'Apicultura' }), curso({ area: undefined })]);
  assert.deepEqual(r.map(x => [x.area, x.cuenta]), [['Apicultura', 2], ['Etología', 1], ['Sin área', 1]]);
});

test('colorArea(): color propio por área y uno de respaldo (sin tocar el prototipo)', () => {
  assert.notEqual(C.colorArea('Apicultura'), C.colorArea('Etología'));
  assert.equal(C.colorArea('Área inventada'), C.colorArea(undefined));
  assert.equal(C.colorArea('__proto__'), C.colorArea('constructor'));
});

test('urlPortada(): acepta enlaces e imágenes del sitio y rechaza lo que podría inyectar código', () => {
  assert.equal(C.urlPortada('https://example.com/a.jpg'), 'https://example.com/a.jpg');
  assert.equal(C.urlPortada('../assets/img/cursos/x.jpg'), '../assets/img/cursos/x.jpg');
  assert.equal(C.urlPortada('assets/img/x.webp'), 'assets/img/x.webp');
  for (const malo of ["x');alert(1);//", 'javascript:alert(1)', 'https://x.com/a b.jpg', 'https://x.com/a.jpg")', '"><script>', '', null, 'data:text/html;base64,AAAA']) assert.equal(C.urlPortada(malo), null, String(malo));
});

/* ───────── HTML: seguridad ───────── */

test('las tarjetas escapan título, área, etiqueta, descripción y duración', () => {
  const malo = curso({ title: '<img src=x onerror=alert(1)>', area: '"><script>alert(2)</script>', tag: '<b>x</b>', description: '<svg onload=alert(3)>', duration: '</span><script>' });
  for (const html of [C.tarjetaGridHTML(malo), C.tarjetaListaHTML(malo)]) {
    assert.ok(!/<img src=x|<script|<svg onload|<b>x<\/b>/.test(html), 'quedó HTML vivo');
    assert.ok(html.includes('&lt;'));
  }
});

test('la portada con comillas no puede salirse del atributo style', () => {
  const html = C.tarjetaGridHTML(curso({ image: "https://x.com/a.jpg');background:url('javascript:alert(1)" }));
  assert.ok(!html.includes("background-image:url('https://x.com/a.jpg')"), 'no debe aceptar una URL con comillas');
  assert.ok(!html.includes('javascript:'));
});

test('tarjeta: botones con data-id escapado y nombre accesible', () => {
  const html = C.tarjetaGridHTML(curso({ id: "a'b\"c", title: 'Curso "X"' }));
  assert.ok(html.includes('data-id="a&#39;b&quot;c"'));
  assert.ok(html.includes('aria-label="Editar Curso &quot;X&quot;"'));
  assert.ok(html.includes('data-accion="editar"') && html.includes('data-accion="eliminar"'));
});

test('tarjeta: muestra clases, duración y juegos solo cuando existen', () => {
  const con = C.tarjetaGridHTML(curso());
  assert.ok(con.includes('2 clases') && con.includes('6 h') && con.includes('1 juego'));
  const sin = C.tarjetaGridHTML(curso({ duration: '', lecciones: [{ videoId: 'a' }] }));
  assert.ok(sin.includes('1 clase') && !sin.includes('juego'));
});

test('lista vacía muestra un mensaje; la vista lista y la cuadrícula usan estructuras distintas', () => {
  assert.ok(C.listaHTML([], 'grid').includes('No hay cursos'));
  assert.ok(C.listaHTML([curso()], 'grid').includes('cc-grid'));
  assert.ok(C.listaHTML([curso()], 'lista').includes('cc-lista'));
});

test('kpisHTML() y chips muestran los números reales', () => {
  const r = C.resumenCursos([curso(), curso({ id: 'c2' })]);
  const k = C.kpisHTML(r);
  assert.ok(k.includes('>2<') && k.includes('2 juegos en total'));
  const chips = C.chipsAreasHTML(C.areasConConteo([curso(), curso({ id: 'x', area: 'Etología' })]), 2, 'Apicultura');
  assert.ok(chips.includes('Todas las áreas') && /cc-chip is-active" data-area="Apicultura"/.test(chips));
  assert.ok(C.ordenHTML('az').includes('data-orden="az" aria-pressed="true"'));
  assert.ok(C.vistaHTML('lista').includes('data-vista="lista"'));
});

/* ───────── limpiarLecciones (guardado) ───────── */

test('limpiarLecciones(): descarta clases sin video y conserva el resto de campos', () => {
  const r = C.limpiarLecciones([
    { titulo: ' Clase 1 ', videoId: 'v1', duration: ' 20 min ', provider: 'bunny', driveIdAnterior: 'viejo' },
    { titulo: 'vacía', driveId: '  ', duration: '' },
    { titulo: 'Drive', driveId: 'abc123' }, null, 5]);
  assert.equal(r.lecciones.length, 2);
  assert.deepEqual(r.lecciones[0], { titulo: 'Clase 1', videoId: 'v1', duration: '20 min', provider: 'bunny', driveIdAnterior: 'viejo' });
  assert.equal(r.lecciones[1].driveId, 'abc123');
  assert.deepEqual(r.errores, []);
});

test('limpiarLecciones(): guarda el juego limpio y normalizado', () => {
  const r = C.limpiarLecciones([{ titulo: 'A', videoId: 'v', juego: { tipo: 'sopa_letras', datos: { palabras: ['Águila', 'abeja', 'niño', ''] } } }]);
  assert.deepEqual(r.lecciones[0].juego, { tipo: 'sopa_letras', datos: { palabras: ['AGUILA', 'ABEJA', 'NIÑO'] } });
});

test('limpiarLecciones(): un juego incompleto genera un error con el número de clase y no se guarda', () => {
  const r = C.limpiarLecciones([
    { titulo: 'A', videoId: 'v1' },
    { titulo: 'B', videoId: 'v2', juego: { tipo: 'memorama', datos: { pares: [{ termino: 'a', definicion: 'b' }] } } }]);
  assert.equal(r.errores.length, 1);
  assert.equal(r.errores[0].clase, 2);
  assert.match(r.errores[0].mensaje, /Clase 2/);
  assert.equal(r.lecciones[1].juego, undefined);
});

test('limpiarLecciones(): un juego sin tipo elegido se ignora sin error; "sin juego" borra uno anterior', () => {
  const r = C.limpiarLecciones([{ titulo: 'A', videoId: 'v1', juego: { tipo: '', datos: {} } }, { titulo: 'B', videoId: 'v2', juego: null }]);
  assert.deepEqual(r.errores, []);
  assert.equal(r.lecciones[0].juego, undefined);
  assert.equal(r.lecciones[1].juego, undefined);
});

test('limpiarLecciones(): el número de clase del error es el de la pantalla aunque haya clases vacías antes', () => {
  const r = C.limpiarLecciones([{ titulo: 'vacía' }, { titulo: 'B', videoId: 'v', juego: { tipo: 'ahorcado', datos: { palabras: [{ palabra: 'ab' }] } } }]);
  assert.equal(r.errores[0].clase, 2);
});

test('limpiarLecciones(): no modifica los datos de entrada y tolera entradas raras', () => {
  const entrada = [{ titulo: ' A ', videoId: 'v', juego: { tipo: 'sopa_letras', datos: { palabras: ['abeja', 'polen', 'zorro'] } } }];
  const copia = JSON.stringify(entrada);
  C.limpiarLecciones(entrada);
  assert.equal(JSON.stringify(entrada), copia);
  assert.deepEqual(C.limpiarLecciones(null), { lecciones: [], errores: [] });
  assert.deepEqual(C.limpiarLecciones('x'), { lecciones: [], errores: [] });
});

/* ───────── sincronización con Bunny: los juegos sobreviven ───────── */

test('migrarLecciones(): al sincronizar con Bunny se conservan los juegos y los títulos de cada clase', () => {
  const anteriores = [
    { titulo: 'Intro', driveId: 'drive1', duration: '10 min', juego: juegoSopa() },
    { titulo: 'Manejo', videoId: 'viejo', juego: { tipo: 'rompecabezas', datos: { dificultad: '4', imagenUrl: null } } }];
  const r = C.migrarLecciones(anteriores, [{ videoId: 'bunny-1', titulo: 'T1' }, { videoId: 'bunny-2', titulo: 'T2' }, { videoId: 'bunny-3', titulo: 'T3' }]);
  assert.equal(r.length, 3);
  assert.deepEqual(r[0].juego, juegoSopa());
  assert.equal(r[0].titulo, 'Intro');
  assert.equal(r[0].videoId, 'bunny-1');
  assert.equal(r[0].driveId, undefined);
  assert.equal(r[0].driveIdAnterior, 'drive1');
  assert.equal(r[1].juego.tipo, 'rompecabezas');
  assert.equal(r[2].titulo, 'T3');
  assert.equal(r[2].juego, undefined);
  assert.ok(r.every(l => l.provider === 'bunny'));
});

test('migrarLecciones(): sin clases anteriores usa los títulos del catálogo o "Clase N"', () => {
  const r = C.migrarLecciones(undefined, [{ videoId: 'a', titulo: 'Uno' }, { videoId: 'b' }]);
  assert.deepEqual(r.map(l => l.titulo), ['Uno', 'Clase 2']);
});

test('migrarLecciones(): no modifica las clases anteriores', () => {
  const anteriores = [{ titulo: 'Intro', driveId: 'd' }];
  const copia = JSON.stringify(anteriores);
  C.migrarLecciones(anteriores, [{ videoId: 'a' }]);
  assert.equal(JSON.stringify(anteriores), copia);
});

/* ───────── editor: estado ───────── */

test('nuevoJuego(): cada tipo arranca con filas vacías y NO es válido hasta que se llena', () => {
  for (const tipo of Object.keys(J.TIPOS)) {
    const j = C.nuevoJuego(tipo);
    assert.equal(j.tipo, tipo);
    if (tipo !== 'rompecabezas') assert.equal(J.limpiarJuego(j), null, `${tipo} vacío no debe ser válido`);
  }
  assert.deepEqual(C.nuevoJuego('inventado'), { tipo: '', datos: {} });
  assert.equal(J.limpiarJuego(C.nuevoJuego('rompecabezas')).datos.dificultad, '3');
});

test('agregarFila()/quitarFila(): respetan mínimos y máximos de cada tipo', () => {
  const sopa = C.nuevoJuego('sopa_letras');
  assert.equal(C.quitarFila(sopa, 0), false, 'no baja de 3');
  assert.equal(C.agregarFila(sopa), true);
  assert.equal(sopa.datos.palabras.length, 4);
  assert.equal(C.quitarFila(sopa, 3), true);
  const ahorcado = C.nuevoJuego('ahorcado');
  assert.equal(C.quitarFila(ahorcado, 0), false, 'mínimo 1');
  C.agregarFila(ahorcado);
  assert.deepEqual(ahorcado.datos.palabras[1], { palabra: '', pista: '' });
  const mem = C.nuevoJuego('memorama');
  C.agregarFila(mem);
  assert.deepEqual(mem.datos.pares[3], { termino: '', definicion: '' });
  while (C.agregarFila(mem)) { /* hasta el tope */ }
  assert.equal(mem.datos.pares.length, 20);
  assert.equal(C.agregarFila(C.nuevoJuego('rompecabezas')), false);
  assert.equal(C.quitarFila(sopa, 'x'), false);
  assert.equal(C.quitarFila(sopa, -1), false);
  assert.equal(C.quitarFila(null, 0), false);
});

test('asignarRuta(): escribe solo en rutas permitidas', () => {
  const l = { titulo: '', driveId: '', duration: '', juego: C.nuevoJuego('memorama') };
  assert.equal(C.asignarRuta(l, 'titulo', 'Hola'), true);
  assert.equal(l.titulo, 'Hola');
  assert.equal(C.asignarRuta(l, 'juego.datos.pares.1.termino', 'Polen'), true);
  assert.equal(l.juego.datos.pares[1].termino, 'Polen');
  const s = { juego: C.nuevoJuego('sopa_letras') };
  assert.equal(C.asignarRuta(s, 'juego.datos.palabras.2', 'abeja'), true);
  assert.equal(s.juego.datos.palabras[2], 'abeja');
  const a = { juego: C.nuevoJuego('ahorcado') };
  assert.equal(C.asignarRuta(a, 'juego.datos.palabras.0.pista', 'Vuela'), true);
  const r = { juego: C.nuevoJuego('rompecabezas') };
  assert.equal(C.asignarRuta(r, 'juego.datos.dificultad', '5'), true);
  assert.equal(r.juego.datos.dificultad, '5');
});

test('asignarRuta(): rechaza rutas peligrosas, inexistentes o fuera de rango y no contamina el prototipo', () => {
  const l = { titulo: '', juego: C.nuevoJuego('sopa_letras') };
  for (const ruta of ['__proto__.polluted', 'constructor.prototype.x', 'juego.tipo', 'juego.datos.palabras.99', 'juego.datos.palabras.1.x', 'videoId', 'juego', '', null, undefined, 'titulo.length', 'juego.datos.__proto__.x']) {
    assert.equal(C.asignarRuta(l, ruta, 'x'), false, String(ruta));
  }
  assert.equal({}.polluted, undefined);
  assert.equal(l.juego.tipo, 'sopa_letras');
  assert.equal(C.asignarRuta(null, 'titulo', 'x'), false);
});

test('asignarRuta(): recorta valores enormes', () => {
  const l = { titulo: '' };
  C.asignarRuta(l, 'titulo', 'x'.repeat(10000));
  assert.equal(l.titulo.length, 2000);
});

test('moverLeccion(): sube, baja y no se sale de los límites', () => {
  const a = ['A', 'B', 'C'];
  assert.equal(C.moverLeccion(a, 0, -1), false);
  assert.equal(C.moverLeccion(a, 2, 1), false);
  assert.equal(C.moverLeccion(a, 1, -1), true);
  assert.deepEqual(a, ['B', 'A', 'C']);
  assert.equal(C.moverLeccion(a, 1, 1), true);
  assert.deepEqual(a, ['B', 'C', 'A']);
  assert.equal(C.moverLeccion(a, 'x', 1), false);
});

/* ───────── editor: HTML ───────── */

test('leccionHTML(): botones de mover deshabilitados en los extremos y no se puede quitar la única clase', () => {
  const unica = C.leccionHTML({ titulo: 'A', videoId: 'v' }, 0, 1);
  assert.equal((unica.match(/disabled/g) || []).length, 3);
  const media = C.leccionHTML({ titulo: 'B', driveId: 'x' }, 1, 3);
  assert.equal((media.match(/disabled/g) || []).length, 0);
  assert.ok(media.includes('Clase 2'));
});

test('leccionHTML(): Bunny muestra el video vinculado y Drive muestra un campo editable', () => {
  assert.ok(C.leccionHTML({ videoId: 'abc-123' }, 0, 2).includes('Video Bunny vinculado'));
  assert.ok(!C.leccionHTML({ videoId: 'abc-123' }, 0, 2).includes('data-ruta="driveId"'));
  assert.ok(C.leccionHTML({ driveId: '' }, 0, 2).includes('data-ruta="driveId"'));
});

test('el editor escapa título, video, palabras, pares y pistas', () => {
  const l = { titulo: '"><script>alert(1)</script>', videoId: '<b>id</b>', juego: { tipo: 'memorama', datos: { pares: [{ termino: '<img onerror=x>', definicion: '"x"' }, { termino: '', definicion: '' }, { termino: '', definicion: '' }] } } };
  const html = C.leccionHTML(l, 0, 1);
  assert.ok(!/<script|<img onerror|<b>id/.test(html));
  const a = C.camposJuegoHTML({ tipo: 'ahorcado', datos: { palabras: [{ palabra: '<x>', pista: '"><svg onload=y>' }] } });
  assert.ok(!/<x>|<svg onload/.test(a));
  const s = C.camposJuegoHTML({ tipo: 'sopa_letras', datos: { palabras: ['<i>', '', ''] } });
  assert.ok(!s.includes('<i>'));
});

test('zonaJuegoHTML(): sin juego ofrece agregarlo; con juego ofrece quitarlo y elegir el tipo', () => {
  assert.ok(C.zonaJuegoHTML(null).includes('data-accion="juego-agregar"'));
  const con = C.zonaJuegoHTML(C.nuevoJuego('memorama'));
  assert.ok(con.includes('data-accion="juego-quitar"') && con.includes('data-accion="juego-tipo"'));
  for (const t of Object.keys(J.TIPOS)) assert.ok(con.includes(`value="${t}"`));
  assert.ok(/<option value="memorama" selected>/.test(con));
});

test('camposJuegoHTML(): cada tipo dibuja sus campos y las filas mínimas no se pueden quitar', () => {
  const sopa = C.camposJuegoHTML(C.nuevoJuego('sopa_letras'));
  assert.equal((sopa.match(/data-ruta="juego\.datos\.palabras\.\d"/g) || []).length, 3);
  assert.equal((sopa.match(/data-accion="fila-quitar"[^>]*disabled/g) || []).length, 3);
  const mem = C.camposJuegoHTML(C.nuevoJuego('memorama'));
  assert.equal((mem.match(/\.termino"/g) || []).length, 3);
  assert.ok(C.camposJuegoHTML(C.nuevoJuego('rompecabezas')).includes('3 × 3'));
  assert.ok(C.camposJuegoHTML(C.nuevoJuego('ahorcado')).includes('Pista'));
  assert.ok(C.camposJuegoHTML({ tipo: '', datos: {} }).includes('Elige el tipo'));
  const masSopa = C.nuevoJuego('sopa_letras'); C.agregarFila(masSopa);
  assert.equal((C.camposJuegoHTML(masSopa).match(/data-accion="fila-quitar"[^>]*disabled/g) || []).length, 0);
});

test('modalCursoHTML(): conserva los ids que usa el guardado y cambia el texto al editar', () => {
  const nuevo = C.modalCursoHTML({});
  for (const id of ['f_title', 'f_desc', 'f_area', 'f_level', 'f_duration', 'f_tag', 'f_image', 'leccionesContainer']) assert.ok(nuevo.includes(`id="${id}"`), id);
  assert.ok(nuevo.includes('Nuevo curso') && nuevo.includes('saveCurso(\'\')'));
  const edit = C.modalCursoHTML({ id: 'abc', title: 'Mi curso', area: 'Etología', level: 'Avanzado' });
  assert.ok(edit.includes('Editar curso') && edit.includes('saveCurso(\'abc\')'));
  assert.ok(/<option selected>Etología<\/option>/.test(edit));
  assert.ok(/<option value="Avanzado" selected>/.test(edit));
});

test('modalCursoHTML(): escapa los valores del curso', () => {
  const html = C.modalCursoHTML({ id: "a'b", title: '"><script>x</script>', description: '</textarea><script>y</script>', tag: '"onfocus="z', image: '"><img src=x>' });
  assert.ok(!/<script|<img src=x|"onfocus="z/.test(html));
  assert.ok(html.includes("saveCurso('a&#39;b')"));
});

test('modalCursoHTML(): un área o nivel que no está en la lista se conserva como opción', () => {
  const html = C.modalCursoHTML({ id: 'x', title: 'Curso viejo', area: 'Área histórica', level: 'Experto' });
  assert.ok(/<option selected>Área histórica<\/option>/.test(html));
  assert.ok(/<option value="Experto" selected>/.test(html));
  const normal = C.modalCursoHTML({ id: 'y', area: 'Apicultura' });
  assert.equal((normal.match(/<option selected>/g) || []).length, 1);
  assert.equal(C.AREAS.length, 7, 'la lista base no se modifica al agregar la opción');
});
