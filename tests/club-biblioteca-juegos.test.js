'use strict';
// La biblioteca del miembro debe cargar los juegos/preguntas y abrirlos al terminar cada clase.
// (El comportamiento completo se probó en un navegador real con datos inventados; aquí se vigilan las conexiones.)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const pagina = fs.readFileSync(path.join(RAIZ, 'pages', 'club-biblioteca.html'), 'utf8');
const entre = (desde, hasta) => pagina.slice(pagina.indexOf(desde), pagina.indexOf(hasta, pagina.indexOf(desde)));

test('la biblioteca carga los estilos y el módulo de juegos, y el módulo va después de club.js', () => {
  assert.match(pagina, /href="\.\.\/assets\/css\/club-juegos\.css\?v=\d+"/);
  assert.match(pagina, /src="\.\.\/assets\/js\/club-juegos\.js\?v=\d+"/);
  assert.ok(pagina.indexOf('club-juegos.js') > pagina.indexOf('club.js?v='), 'club-juegos.js debe cargarse después de club.js');
  assert.ok(fs.existsSync(path.join(RAIZ, 'assets', 'css', 'club-juegos.css')));
  assert.ok(fs.existsSync(path.join(RAIZ, 'assets', 'js', 'club-juegos.js')));
});

test('como en alintecfood: la clase SOLO cuenta como vista cuando se terminan sus preguntas y su juego', () => {
  const cuerpo = entre('async function marcarYSiguiente', 'function cantidadPreguntas');
  const actividades = cuerpo.indexOf('abrirActividadesDeClase(lessonIdx, async () => {');
  const guardar = cuerpo.indexOf('await guardarClaseVista(courseId, lessonIdx)');
  assert.ok(actividades > 0 && guardar > actividades, 'el avance se guarda DENTRO del callback de las actividades, después de terminarlas');
  assert.match(cuerpo, /\{ obligatorio: true \}/);
  assert.equal(/saveCourseProgress/.test(cuerpo), false, 'marcarYSiguiente no guarda el avance por su cuenta antes de las actividades');
});

test('las actividades obligatorias no se pueden cerrar (juego y preguntas) y se pasan al abrirlas', () => {
  const juego = entre('function abrirJuegoDeClase', 'window.practicarJuegoClase');
  assert.match(juego, /obligatorio:\s*!!\(opciones && opciones\.obligatorio\)/);
  assert.match(juego, /alTerminar:\s*seguir/);
  assert.match(juego, /if \(seguido\) return/, 'continuar debe ejecutarse una sola vez');
  const acts = entre('function abrirActividadesDeClase', 'window.practicarPreguntasClase');
  assert.match(acts, /obligatorio,\s*\n\s*alTerminar:\s*aJuego/);
  assert.match(acts, /abrirJuegoDeClase\(lessonIdx, despues, \{ obligatorio \}\)/);
  assert.match(acts, /if \(pasado\) return/, 'el juego se abre una sola vez');
  assert.match(acts, /if \(!cantidadPreguntas\(lesson\)\) \{ aJuego\(\); return; \}/, 'sin preguntas va directo al juego');
});

test('los botones de "practicar" sí se pueden cerrar (no obligatorios)', () => {
  assert.match(pagina, /window\.practicarJuegoClase = \(lessonIdx\) => abrirJuegoDeClase\(lessonIdx, \(\) => \{\}\);/);
  const preg = entre('window.practicarPreguntasClase', 'function nombreJuegoDeClase');
  assert.equal(/obligatorio/.test(preg), false);
});

test('una clase sin juego, o sin el módulo cargado, continúa igual que antes', () => {
  const bloque = entre('function abrirJuegoDeClase', 'window.practicarJuegoClase');
  assert.match(bloque, /!window\.ZOO_JUEGOS \|\| !lesson \|\| !lesson\.juego\) \{ despues\(\); return; \}/);
});

test('ninguna vía se salta las actividades: ni la marca automática de 30 s ni el botón "Completada" de la lista', () => {
  assert.match(pagina, /!leccionTieneActividad\(lesson\)\) \{[^\n]*\n\s*window\.__autoCompleteTimer = setTimeout/, 'la marca automática solo corre en clases sin actividad');
  const toggle = entre('async function toggleLessonComplete', 'window.toggleLessonComplete');
  assert.match(toggle, /leccionTieneActividad\(leccion\)/);
  assert.match(toggle, /abrirActividadesDeClase\(lessonIdx, async \(\) => \{ await guardarClaseVista\(courseId, lessonIdx\); renderCourseModal\(\); \}, \{ obligatorio: true \}\)/);
});

test('el módulo de preguntas acepta la opción obligatorio (sin X ni Esc)', () => {
  const quiz = fs.readFileSync(path.join(RAIZ, 'assets', 'js', 'club-quiz.js'), 'utf8');
  assert.match(quiz, /crearVentana\('Antes de seguir', o\.subtitulo \|\| '', o\.obligatorio === true, o\.alCerrar\)/);
});

test('la biblioteca carga las preguntas y las reglas de acceso, y las usa', () => {
  assert.match(pagina, /src="\.\.\/assets\/js\/club-quiz\.js\?v=\d+"/);
  assert.match(pagina, /src="\.\.\/assets\/js\/club-acceso\.js\?v=\d+"/);
  assert.ok(pagina.indexOf('club-quiz.js') > pagina.indexOf('club-juegos.js'), 'el quiz usa la ventana del módulo de juegos');
  assert.ok(fs.existsSync(path.join(RAIZ, 'assets', 'js', 'club-quiz.js')));
  assert.ok(fs.existsSync(path.join(RAIZ, 'assets', 'js', 'club-acceso.js')));
  assert.match(pagina, /ZOO_ACCESO\.desbloqueoCurso\(\{ lista: cursos, i, dias, prueba: window\.__zooPrueba, progreso: window\.__zooCourseProgress \}\)/);
  assert.match(pagina, /ZOO_ACCESO\.esClaseGratis\(lesson, curso, prueba, idx\)/);
});

test('el paywall del reproductor usa la regla de clases gratis con el curso actual', () => {
  assert.match(pagina, /!esClaseGratis\(lesson, window\.__currentCourse, lessonIdx\)/);
});
