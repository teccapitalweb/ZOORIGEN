'use strict';

// Sección «Reseñas» del panel: cifras, gráfica de cursos por grupo, estrellas recibidas y comentarios con filtros.
// Ejecutar: node --test tests/admin-resenas.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const P = require(path.join(RAIZ, 'assets', 'js', 'admin-panel.js'));
const A = require(path.join(RAIZ, 'assets', 'js', 'admin-resenas.js'));

let n = 0;
const r = (cursoId, estrellas, extra) => Object.assign({ uid: 'u' + (++n), nombre: 'Persona ' + n, email: 'p' + n + '@x.test', cursoId, curso: 'Curso ' + cursoId, estrellas, comentario: '', creadaMs: 1760000000000 + n, actualizadaMs: 1760000000000 + n }, extra);
const muchas = (id, notas) => notas.map(e => r(id, e));

test('la sección existe en el menú (Contenido), con ícono, y se dibuja desde renderSection', () => {
  const s = P.seccion('resenas');
  assert.ok(s); assert.equal(s.grupo, 'Contenido'); assert.equal(s.titulo, 'Reseñas');
  const html = leer('pages/admin-club.html');
  assert.match(html, /data-sec="resenas"><svg class="zi"/);
  assert.match(html, /sec === 'resenas'\) window\.ZOO_ADMIN_RESENAS\.resenas\(\)/);
  assert.ok(html.indexOf('admin-resenas.js') > html.indexOf('admin-vistas.js'), 'después de las vistas (usa sus ayudas)');
  assert.ok(html.indexOf('data-sec="resenas"') > html.indexOf('data-sec="certificados"') && html.indexOf('data-sec="resenas"') < html.indexOf('<div class="asb-section">Comunidad'), 'dentro de Contenido');
  assert.match(html, /admin-resenas\.css\?v=/);
});

test('límites de los grupos: 4.5 o más Excelentes, de 3.5 a 4.4 Mejor calificados, menos de 3.5 Por mejorar, y con menos de 3 reseñas «Pocas reseñas»', () => {
  assert.equal(A.MIN_RESENAS, 3);
  assert.equal(A.grupoDe(5, 3), 'excelentes');
  assert.equal(A.grupoDe(4.5, 10), 'excelentes');
  assert.equal(A.grupoDe(4.46, 10), 'excelentes', 'se clasifica con el promedio que se lee (4.5), no con el decimal oculto');
  assert.equal(A.grupoDe(4.4, 10), 'buenos');
  assert.equal(A.grupoDe(3.5, 3), 'buenos');
  assert.equal(A.grupoDe(3.4, 3), 'mejorar');
  assert.equal(A.grupoDe(1, 50), 'mejorar');
  assert.equal(A.grupoDe(5, 2), 'pocas', 'una o dos reseñas no bastan para clasificar');
  assert.equal(A.grupoDe(1, 1), 'pocas', 'una sola mala calificación no marca al curso');
});

test('resumen por curso: promedio, cantidad y grupo; del mejor al peor, y a igual promedio el de más reseñas primero', () => {
  const todas = [].concat(muchas('a', [5, 5, 5, 4]), muchas('b', [4, 4, 4]), muchas('c', [2, 3, 3]), muchas('d', [5, 5]), muchas('e', [4, 4, 4, 4]));
  const c = A.resumirCursos(todas);
  assert.deepEqual(c.map(x => x.id), ['d', 'a', 'e', 'b', 'c']);
  const por = Object.fromEntries(c.map(x => [x.id, x]));
  assert.deepEqual([por.a.n, por.a.prom, por.a.grupo], [4, 4.75, 'excelentes']);
  assert.equal(por.b.grupo, 'buenos'); assert.equal(por.c.grupo, 'mejorar'); assert.equal(por.d.grupo, 'pocas');
  assert.equal(por.a.titulo, 'Curso a');
});

test('cifras: promedio, reseñas, con comentario y cursos calificados; sin datos, nada inventado', () => {
  const todas = [r('a', 5, { comentario: 'Excelente' }), r('a', 4), r('b', 3, { comentario: '   ' })];
  const c = A.cifras(todas);
  assert.deepEqual(c.map(x => x.rotulo), ['calificación promedio', 'reseñas recibidas', 'con comentario', 'cursos calificados']);
  assert.deepEqual(c.map(x => x.valor), ['4.0', '3', '1', '2'], 'un comentario solo de espacios no cuenta');
  assert.deepEqual(A.cifras([]).map(x => x.valor), ['—', '0', '0', '0']);
  assert.deepEqual(A.cifras(null).map(x => x.valor), ['—', '0', '0', '0']);
  assert.equal(A.cifras([r('a', 5)])[1].rotulo, 'reseña recibida');
});

test('gráfica: una fila por curso con su promedio, número de reseñas y color del grupo (verde, azul, rojo, gris), con la leyenda', () => {
  const cursos = A.resumirCursos([].concat(muchas('a', [5, 5, 5]), muchas('b', [4, 4, 3]), muchas('c', [1, 2, 2]), muchas('d', [5])));
  const h = A.graficaHTML(cursos);
  assert.match(h, /rs-g--ok[^>]*>.*Curso a/s);
  assert.match(h, /rs-g--info[^>]*>.*Curso b/s);
  assert.match(h, /rs-g--bad[^>]*>.*Curso c/s);
  assert.match(h, /rs-g--idle[^>]*>.*Curso d/s);
  assert.match(h, /<strong>5\.0<\/strong><span>3 reseñas<\/span>/);
  assert.match(h, /<span>1 reseña<\/span>/);
  assert.match(h, /style="width:100%"/, 'la barra mide el promedio sobre 5');
  for (const t of ['Excelentes · 4.5 estrellas o más', 'Mejor calificados · de 3.5 a 4.4 estrellas', 'Por mejorar · menos de 3.5 estrellas', 'Pocas reseñas todavía · menos de 3 reseñas']) assert.ok(h.includes(t), t);
  assert.match(A.graficaHTML([]), /Todavía no hay reseñas/);
});

test('los tres grupos listan sus cursos con promedio y los de pocas reseñas van aparte', () => {
  const cursos = A.resumirCursos([].concat(muchas('a', [5, 5, 5]), muchas('c', [1, 2, 2]), muchas('d', [5])));
  const h = A.gruposHTML(cursos);
  assert.match(h, /Excelentes \(1\)/); assert.match(h, /Mejor calificados \(0\)/); assert.match(h, /Por mejorar \(1\)/);
  assert.match(h, /Ningún curso por ahora/);
  assert.match(h, /<li><span>Curso a<\/span><strong>5\.0 · 3<\/strong><\/li>/);
  assert.match(h, /Pocas reseñas todavía \(1\):<\/strong> Curso d \(5\.0, 1 reseña\)/);
  assert.equal(A.gruposHTML([]), '');
});

test('«Cómo leerlo»: nombra el mejor curso, avisa los que hay por mejorar y explica por qué no clasifica con pocas reseñas', () => {
  const frase = A.fraseGrafica(A.resumirCursos([].concat(muchas('a', [5, 5, 5]), muchas('c', [1, 2, 2]))));
  assert.match(frase, /mejor calificado es «Curso a» con 5\.0 estrellas \(3 reseñas\)/);
  assert.match(frase, /Hay 1 curso por mejorar/);
  assert.match(A.fraseGrafica(A.resumirCursos(muchas('a', [5, 5]))), /ningún curso llega a 3 reseñas/);
  assert.equal(A.fraseGrafica([]), '');
});

test('estrellas recibidas: cuántas de 1 a 5 y su porcentaje', () => {
  const h = A.distribucionHTML([].concat(muchas('a', [5, 5, 5, 4]), muchas('b', [1])));
  assert.match(h, /<b>5 estrellas<\/b>.*width:60%.*3 · 60 %/s);
  assert.match(h, /<b>1 estrella<\/b>.*1 · 20 %/s);
  assert.match(h, /<b>2 estrellas<\/b>.*0 · 0 %/s);
  assert.match(A.distribucionHTML([]), /Todavía no hay reseñas/);
});

test('comentarios: nombre, correo, curso, estrellas y fecha; todo escapado, y sin comentario dice que solo calificó', () => {
  const con = A.filaHTML(r('a', 4, { nombre: '<b>Ana</b>', email: 'ana@x.test', comentario: '<img src=x onerror=alert(1)>\nSegunda línea' }));
  assert.ok(!con.includes('<img') && !con.includes('<b>Ana'), 'sin HTML sin escapar');
  assert.ok(con.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.match(con, /aria-label="4 de 5 estrellas"/);
  assert.match(con, /Curso a · <span class="ap-correo">ana@x\.test<\/span>/);
  assert.match(con, /rs-fila__fecha">[^<]+\d{4}/);
  assert.match(A.filaHTML(r('a', 5)), /Solo calificó, sin comentario\./);
  assert.match(A.filaHTML(r('a', 5, { nombre: '', email: 'sofia@x.test' })), /<strong>sofia<\/strong>/, 'sin nombre usa la parte del correo');
});

test('filtros: por curso, por estrellas y «Solo con comentario» (se pueden combinar)', () => {
  const todas = [r('a', 5, { comentario: 'Muy bien' }), r('a', 3), r('b', 5, { comentario: 'Bien' }), r('b', 1, { comentario: '  ' })];
  assert.equal(A.filtrar(todas, {}).length, 4);
  assert.equal(A.filtrar(todas, { curso: 'a' }).length, 2);
  assert.equal(A.filtrar(todas, { estrellas: '5' }).length, 2);
  assert.equal(A.filtrar(todas, { soloComentario: true }).length, 2);
  assert.equal(A.filtrar(todas, { curso: 'b', estrellas: 5, soloComentario: true }).length, 1);
  assert.match(A.listaHTML(todas, { curso: 'zzz' }, 30), /Ninguna reseña coincide con los filtros/);
  assert.match(A.listaHTML([], {}, 30), /Todavía no hay reseñas/);
  const m = A.controlesHTML(todas, { curso: 'a' });
  assert.match(m, /<option value="a" selected>Curso a \(2\)<\/option>/);
  assert.match(m, /Solo con comentario/);
});

test('lista: de 30 en 30 con «Mostrar más»', () => {
  const todas = Array.from({ length: 45 }, (_, i) => r('a', 5, { comentario: 'c' + i }));
  const h = A.listaHTML(todas, {}, 30);
  assert.equal((h.match(/class="rs-fila"/g) || []).length, 30);
  assert.match(h, /Mostrando 30 de 45/);
  assert.match(h, /data-accion="mas-resenas">Mostrar 15 más/);
  assert.doesNotMatch(A.listaHTML(todas, {}, 60), /mas-resenas/);
});

test('pantalla completa: título «Reseñas», las cuatro cifras, la gráfica, las estrellas recibidas y los comentarios; solo lee del servidor', () => {
  const h = A.vistaHTML([].concat(muchas('a', [5, 4, 5]), muchas('b', [3])));
  assert.match(h, /zs-seccion/);
  assert.match(h, /<h1 class="zs-seccion__titulo">Reseñas <span class="zs-acento">de los cursos\.<\/span><\/h1>/);
  for (const t of ['calificación promedio', 'reseñas recibidas', 'con comentario', 'cursos calificados', '¿Cómo califican tus cursos?', 'Estrellas recibidas', 'Comentarios y calificaciones (4)', 'Cómo leerlo', 'no se publican en ningún lado']) assert.ok(h.includes(t), t);
  const js = leer('assets/js/admin-resenas.js');
  assert.ok(js.includes("'/api/admin/resenas?limite=2000'"));
  assert.doesNotMatch(js, /firebase|firestore|localStorage|fetch\(/i, 'todo pasa por el servidor, sin guardar nada en el navegador');
});

test('hoja de estilos: colores sólidos de las variables del panel (sin degradados) y letra mínima de 12 px', () => {
  const css = leer('assets/css/admin-resenas.css');
  assert.doesNotMatch(css, /gradient/i);
  for (const m of css.matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) {
    const px = m[2] === 'px' ? Number(m[1]) : Number(m[1]) * 16;
    assert.ok(px >= 12, 'letra de ' + m[0]);
  }
  assert.match(css, /--c-kpi-ok/); assert.match(css, /--c-kpi-info/); assert.match(css, /--c-kpi-bad/);
});
