'use strict';

// Apartado "Certificados emitidos" del admin. Ejecutar: node --test tests/admin-certificados.test.js

const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const K = require(path.join(__dirname, '..', 'assets', 'js', 'admin-certificados.js'));

const AHORA = Date.UTC(2026, 9, 8, 12);
const dia = n => new Date(AHORA - n * 86400000).toISOString();
const doc = (extra = {}) => ({ folio: 'ZOO-2026-11111', courseId: '7', courseTitle: 'Manejo de colmenas', courseArea: 'Apicultura', courseDuration: '6 h',
  memberUid: 'u1', memberName: 'Ana López', memberEmail: 'ana@example.com', issuedAt: dia(3), totalClases: 5, ...extra });
const cert = extra => K.normalizar(doc(extra));

/* ───────── normalizar ───────── */

test('normalizar(): lleva los campos de Firestore a una forma estable', () => {
  const c = cert();
  assert.equal(c.folio, 'ZOO-2026-11111');
  assert.equal(c.alumno, 'Ana López');
  assert.equal(c.correo, 'ana@example.com');
  assert.equal(c.curso, 'Manejo de colmenas');
  assert.equal(c.clases, 5);
  assert.ok(c.fecha instanceof Date);
  assert.equal(c.prueba, false);
});

test('normalizar(): tolera campos ausentes, nulos y fechas inválidas', () => {
  const c = K.normalizar({ id: 'ZOO-1' });
  assert.equal(c.folio, 'ZOO-1');
  assert.equal(c.alumno, '');
  assert.equal(c.fecha, null);
  assert.equal(c.clases, 0);
  assert.equal(K.normalizar(null).folio, '');
  assert.equal(K.normalizar(undefined).alumno, '');
  assert.equal(K.normalizar({ issuedAt: 'no es fecha' }).fecha, null);
});

test('normalizar(): acepta fechas tipo Timestamp de Firestore y detecta certificados de prueba', () => {
  const d = new Date(AHORA);
  assert.equal(K.normalizar({ folio: 'A', issuedAt: { toDate: () => d } }).fecha.getTime(), AHORA);
  assert.equal(K.normalizar({ folio: 'A', _test: true }).prueba, true);
  assert.equal(K.normalizar({ folio: 'A', courseId: 'test' }).prueba, true);
});

/* ───────── resumen y filtros ───────── */

const LISTA = () => [
  cert({ folio: 'A', memberUid: 'u1', courseId: '7', courseTitle: 'Colmenas', issuedAt: dia(2) }),
  cert({ folio: 'B', memberUid: 'u1', courseId: '8', courseTitle: 'Tiburones', issuedAt: dia(40) }),
  cert({ folio: 'C', memberUid: 'u2', memberName: 'Beto', memberEmail: 'beto@example.com', courseId: '7', courseTitle: 'Colmenas', issuedAt: dia(10) }),
  cert({ folio: 'D', memberUid: 'u3', memberName: '', memberEmail: '', courseId: '9', courseTitle: 'Etología', issuedAt: dia(400) })
];

test('resumen(): total, alumnos distintos, cursos distintos y últimos 30 días', () => {
  assert.deepEqual(K.resumen(LISTA(), AHORA), { total: 4, alumnos: 3, cursos: 3, ultimos30: 2 });
  assert.deepEqual(K.resumen([], AHORA), { total: 0, alumnos: 0, cursos: 0, ultimos30: 0 });
});

test('resumen(): una fecha futura o ausente no cuenta como reciente', () => {
  const r = K.resumen([cert({ folio: 'X', issuedAt: new Date(AHORA + 40 * 86400000).toISOString() }), cert({ folio: 'Y', issuedAt: undefined })], AHORA);
  assert.equal(r.ultimos30, 0);
});

test('cursosConConteo(): cuenta por curso y ordena de más a menos', () => {
  const r = K.cursosConConteo(LISTA());
  assert.equal(r[0].nombre, 'Colmenas');
  assert.equal(r[0].cuenta, 2);
  assert.equal(r.length, 3);
});

test('filtrar(): busca por folio, alumno, correo, curso y área sin importar acentos ni mayúsculas', () => {
  assert.deepEqual(K.filtrar(LISTA(), { texto: 'beto' }).map(c => c.folio), ['C']);
  assert.deepEqual(K.filtrar(LISTA(), { texto: 'LOPEZ' }).map(c => c.folio).sort(), ['A', 'B']);
  assert.deepEqual(K.filtrar(LISTA(), { texto: 'etologia' }).map(c => c.folio), ['D']);
  const conFolio = [cert({ folio: 'ZOO-2026-77777', memberName: 'Carla' }), cert({ folio: 'ZOO-2025-12345', memberName: 'Diego' })];
  assert.deepEqual(K.filtrar(conFolio, { texto: 'zoo-2026' }).map(c => c.alumno), ['Carla']);
  assert.deepEqual(K.filtrar(conFolio, { texto: '12345' }).map(c => c.alumno), ['Diego']);
  assert.deepEqual(K.filtrar(conFolio, { texto: 'ZOO' }).length, 2);
  assert.deepEqual(K.filtrar(LISTA(), { texto: 'apicultura' }).length, 4);
  assert.deepEqual(K.filtrar(LISTA(), { texto: 'nada que coincida' }), []);
});

test('filtrar(): por curso y combinado con la búsqueda', () => {
  assert.deepEqual(K.filtrar(LISTA(), { curso: '7' }).map(c => c.folio).sort(), ['A', 'C']);
  assert.deepEqual(K.filtrar(LISTA(), { curso: '7', texto: 'beto' }).map(c => c.folio), ['C']);
  assert.deepEqual(K.filtrar(LISTA(), { curso: '99' }), []);
});

test('filtrar(): orden recientes, antiguos y por alumno (los sin nombre al final)', () => {
  assert.deepEqual(K.filtrar(LISTA(), { orden: 'recientes' }).map(c => c.folio), ['A', 'C', 'B', 'D']);
  assert.deepEqual(K.filtrar(LISTA(), { orden: 'antiguos' }).map(c => c.folio), ['D', 'B', 'C', 'A']);
  const porAlumno = K.filtrar(LISTA(), { orden: 'alumno' }).map(c => c.folio);
  assert.equal(porAlumno[porAlumno.length - 1], 'D');
  assert.equal(porAlumno[0], 'A');
});

test('filtrar() no modifica la lista original', () => {
  const l = LISTA();
  const antes = l.map(c => c.folio).join();
  K.filtrar(l, { orden: 'antiguos' });
  assert.equal(l.map(c => c.folio).join(), antes);
});

/* ───────── fechas ───────── */

test('formatoFecha() y relativo()', () => {
  assert.equal(K.formatoFecha(new Date(2026, 9, 8)), '8 oct 2026');
  assert.equal(K.formatoFecha(null), '—');
  assert.equal(K.relativo(new Date(AHORA), AHORA), 'hoy');
  assert.equal(K.relativo(new Date(AHORA - 86400000), AHORA), 'ayer');
  assert.equal(K.relativo(new Date(AHORA - 12 * 86400000), AHORA), 'hace 12 días');
  assert.equal(K.relativo(new Date(AHORA - 130 * 86400000), AHORA), 'hace 4 meses');
  assert.equal(K.relativo(new Date(AHORA - 800 * 86400000), AHORA), 'hace 2 años');
  assert.equal(K.relativo(null, AHORA), '');
});

/* ───────── HTML ───────── */

test('filaHTML(): muestra alumno, correo, curso, fecha, folio y acciones', () => {
  const h = K.filaHTML(cert(), AHORA);
  for (const t of ['Ana López', 'ana@example.com', 'Manejo de colmenas', 'Apicultura', '5 clases', '6 h', 'ZOO-2026-11111', 'hace 3 días']) assert.ok(h.includes(t), t);
  assert.ok(h.includes('href="ver-certificado.html?folio=ZOO-2026-11111"'));
  assert.ok(h.includes('data-accion="copiar" data-folio="ZOO-2026-11111"'));
  assert.ok(h.includes('https://www.zoorigen.com/pages/verificar.html?folio=ZOO-2026-11111'));
  assert.ok(h.includes('rel="noopener"'));
});

test('filaHTML(): valores ausentes se muestran con textos de respaldo', () => {
  const h = K.filaHTML(K.normalizar({ folio: 'ZOO-9' }), AHORA);
  assert.ok(h.includes('Sin nombre') && h.includes('Sin correo') && h.includes('Curso sin nombre'));
});

test('filaHTML(): marca los certificados de prueba', () => {
  assert.ok(K.filaHTML(cert({ courseId: 'test' }), AHORA).includes('Prueba'));
  assert.ok(!K.filaHTML(cert(), AHORA).includes('cf-prueba'));
});

test('filaHTML(): escapa nombre, correo, curso, área y folio (no se ejecuta nada)', () => {
  const malo = cert({ memberName: '<img src=x onerror=alert(1)>', memberEmail: '"><script>alert(2)</script>', courseTitle: '<svg onload=alert(3)>', courseArea: '</div><script>', folio: '"><script>alert(4)</script>' });
  const h = K.filaHTML(malo, AHORA);
  assert.ok(!/<img src=x|<script|<svg onload/.test(h), 'quedó HTML vivo');
  assert.ok(h.includes('&lt;'));
});

test('los enlaces codifican el folio (no se puede salir de la dirección)', () => {
  assert.equal(K.urlVer('A B&c=1/../x'), 'ver-certificado.html?folio=A%20B%26c%3D1%2F..%2Fx');
  assert.ok(K.urlVerificar('x"y').endsWith('?folio=x%22y'));
  const h = K.filaHTML(cert({ folio: 'x" onmouseover="alert(1)' }), AHORA);
  assert.ok(!h.includes('onmouseover="alert'));
});

test('iniciales(): dos letras, tolera vacío y espacios', () => {
  assert.equal(K.iniciales('Ana López Ruiz'), 'AL');
  assert.equal(K.iniciales('  beto '), 'B');
  assert.equal(K.iniciales(''), '?');
  assert.equal(K.iniciales(null), '?');
});

test('listaHTML(): mensaje cuando no hay resultados y lista cuando sí', () => {
  assert.ok(K.listaHTML([], AHORA).includes('No hay certificados'));
  assert.ok(K.listaHTML(LISTA(), AHORA).includes('cf-lista'));
  assert.equal((K.listaHTML(LISTA(), AHORA).match(/<article/g) || []).length, 4);
});

test('kpisHTML(), opcionesCursoHTML() y ordenHTML() muestran los números y marcan la selección', () => {
  const k = K.kpisHTML(K.resumen(LISTA(), AHORA));
  assert.ok(k.includes('Certificados emitidos') && k.includes('>4<') && k.includes('Últimos 30 días'));
  const o = K.opcionesCursoHTML(K.cursosConConteo(LISTA()), '7', 4);
  assert.ok(o.includes('Todos los cursos (4)') && /value="7" selected/.test(o));
  assert.ok(K.ordenHTML('antiguos').includes('data-orden="antiguos" aria-pressed="true"'));
});

test('opcionesCursoHTML() escapa el nombre del curso', () => {
  const o = K.opcionesCursoHTML([{ clave: '"><b>', nombre: '<script>x</script>', cuenta: 1 }], 'todos', 1);
  assert.ok(!/<script|<b>/.test(o));
});

/* ───────── CSV ───────── */

test('csv(): encabezado, una fila por certificado y fechas en formato ISO', () => {
  const t = K.csv(LISTA());
  const filas = t.split('\r\n');
  assert.equal(filas.length, 5);
  assert.equal(filas[0], 'Folio,Alumno,Correo,Curso,Área,Clases,Fecha de emisión');
  assert.ok(filas[1].startsWith('A,Ana López,ana@example.com,Colmenas,Apicultura,5,2026-10-06'));
});

test('csv(): escapa comas, comillas y saltos de línea', () => {
  const t = K.csv([cert({ folio: 'Z', memberName: 'Pérez, Juan "El Rápido"', courseTitle: 'Línea 1\nLínea 2' })]);
  assert.ok(t.includes('"Pérez, Juan ""El Rápido"""'));
  assert.ok(t.includes('Línea 1 Línea 2'));
  assert.equal(t.split('\r\n').length, 2, 'un salto de línea dentro de un dato no debe partir la fila');
});

test('csv(): neutraliza fórmulas (=, +, -, @) para que Excel no las ejecute', () => {
  for (const peligro of ['=HYPERLINK("http://malo")', '+1+1', '-2+3', '@SUM(A1)', '\t=1']) {
    const celda = K.celdaCSV(peligro);
    assert.ok(celda.replace(/^"/, '').startsWith("'"), `no neutralizó: ${peligro}`);
  }
  assert.equal(K.celdaCSV('Ana'), 'Ana');
  assert.equal(K.celdaCSV(null), '');
  assert.equal(K.celdaCSV(5), '5');
});

test('csv(): lista vacía produce solo el encabezado', () => {
  assert.equal(K.csv([]).split('\r\n').length, 1);
});

/* ───────── emisión manual por la API del servidor ───────── */

test('cuerpoEmision(): arma { uid, cursoId } y solo agrega nombre, horas y clases si se escribieron', () => {
  assert.deepEqual(K.cuerpoEmision({ uid: 'u1', cursoId: 'c7' }), { ok: true, cuerpo: { uid: 'u1', cursoId: 'c7' } });
  const r = K.cuerpoEmision({ uid: ' u1 ', cursoId: 'c7', nombre: '  Ana   López ', horas: '7,5', sesiones: '5' });
  assert.deepEqual(r, { ok: true, cuerpo: { uid: 'u1', cursoId: 'c7', nombre: 'Ana López', horas: 7.5, sesiones: 5 } });
});

test('cuerpoEmision(): pide alumno y curso y rechaza horas o clases inválidas con un texto claro', () => {
  assert.equal(K.cuerpoEmision({}).ok, false);
  assert.match(K.cuerpoEmision({ cursoId: 'c' }).error, /alumno/i);
  assert.match(K.cuerpoEmision({ uid: 'u' }).error, /curso/i);
  assert.match(K.cuerpoEmision({ uid: 'u', cursoId: 'c', horas: 'mucho' }).error, /horas/i);
  assert.match(K.cuerpoEmision({ uid: 'u', cursoId: 'c', horas: '0' }).error, /horas/i);
  assert.match(K.cuerpoEmision({ uid: 'u', cursoId: 'c', sesiones: '2.5' }).error, /clases/i);
  assert.match(K.cuerpoEmision({ uid: 'u', cursoId: 'c', nombre: 'x'.repeat(61) }).error, /60/);
  assert.equal(K.cuerpoEmision(null).ok, false);
});

test('mensajeErrorEmision(): un texto en español por cada código del servidor', () => {
  assert.match(K.mensajeErrorEmision({ status: 0 }), /conexión/);
  assert.match(K.mensajeErrorEmision({ status: 403 }), /administrador/);
  assert.match(K.mensajeErrorEmision({ status: 404 }), /alumno o el curso/);
  assert.equal(K.mensajeErrorEmision({ status: 409, message: 'Ya tiene certificado' }), 'Ya tiene certificado');
  assert.match(K.mensajeErrorEmision({ status: 503 }), /configurados/);
  assert.match(K.mensajeErrorEmision({}), /No se pudo emitir/);
});

test('modalEmitirHTML(): lista alumnos y cursos ordenados y escapa nombres, correos y títulos', () => {
  const h = K.modalEmitirHTML(
    [{ id: 'u2', name: 'Beto', email: 'b@x.com' }, { id: 'u1', name: '<img src=x onerror=1>', email: '"><script>1</script>' }, { id: 'u3', name: '', email: 'sin@nombre.com' }],
    [{ id: 'c2', title: 'Zorros' }, { id: 'c1', title: '<b>Abejas</b>' }]
  );
  assert.ok(h.includes('Emitir certificado'));
  assert.ok(h.indexOf('Beto') < h.indexOf('sin@nombre.com'), 'ordenados por nombre');
  assert.ok(h.indexOf('Abejas') < h.indexOf('Zorros'));
  assert.ok(!/<img src=x|<script|<b>Abejas/.test(h), 'quedó HTML vivo');
  assert.ok(h.includes('id="certEmEnviar"'));
});

test('filaHTML(): marca "En validación" los certificados anteriores a la validación del servidor', () => {
  assert.equal(cert().verificado, false);
  assert.ok(K.filaHTML(cert(), AHORA).includes('En validación'));
  assert.ok(!K.filaHTML(cert({ verificado: true }), AHORA).includes('En validación'));
  assert.ok(!K.filaHTML(cert({ courseId: 'test' }), AHORA).includes('En validación'), 'los de prueba solo dicen Prueba');
});

test('normalizar(): acepta los campos nuevos del servidor (horas y sesiones)', () => {
  const c = K.normalizar({ folio: 'ZOO-2026-1A2B3C4D', horas: 6, sesiones: 4, verificado: true });
  assert.equal(c.duracion, '6 h');
  assert.equal(c.clases, 4);
  assert.equal(c.verificado, true);
});
