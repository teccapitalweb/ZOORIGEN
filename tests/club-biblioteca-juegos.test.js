'use strict';
// La biblioteca del miembro debe cargar los juegos/preguntas y abrirlos al terminar cada clase.
// (El comportamiento completo se probó en un navegador real con datos inventados; aquí se vigilan las conexiones.)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const pagina = fs.readFileSync(path.join(RAIZ, 'pages', 'club-biblioteca.html'), 'utf8');

test('la biblioteca carga los estilos y el módulo de juegos, y el módulo va después de club.js', () => {
  assert.match(pagina, /href="\.\.\/assets\/css\/club-juegos\.css\?v=\d+"/);
  assert.match(pagina, /src="\.\.\/assets\/js\/club-juegos\.js\?v=\d+"/);
  assert.ok(pagina.indexOf('club-juegos.js') > pagina.indexOf('club.js?v='), 'club-juegos.js debe cargarse después de club.js');
  assert.ok(fs.existsSync(path.join(RAIZ, 'assets', 'css', 'club-juegos.css')));
  assert.ok(fs.existsSync(path.join(RAIZ, 'assets', 'js', 'club-juegos.js')));
});

test('al completar una clase se guarda el avance ANTES de abrir las actividades', () => {
  const cuerpo = pagina.slice(pagina.indexOf('async function marcarYSiguiente'));
  const guardar = cuerpo.indexOf('saveCourseProgress');
  const actividades = cuerpo.indexOf('abrirActividadesDeClase(lessonIdx, continuar)');
  assert.ok(guardar > 0 && actividades > guardar, 'primero se guarda el progreso y después se abren preguntas/juego');
});

test('el juego no es obligatorio: siempre se puede cerrar y continuar (no traba al miembro)', () => {
  const bloque = pagina.slice(pagina.indexOf('function abrirJuegoDeClase'), pagina.indexOf('window.practicarJuegoClase'));
  assert.match(bloque, /obligatorio:\s*false/);
  assert.match(bloque, /alTerminar:\s*seguir/);
  assert.match(bloque, /alCerrar:\s*seguir/);
  assert.match(bloque, /if \(seguido\) return/, 'continuar debe ejecutarse una sola vez');
});

test('una clase sin juego, o sin el módulo cargado, continúa igual que antes', () => {
  const bloque = pagina.slice(pagina.indexOf('function abrirJuegoDeClase'), pagina.indexOf('window.practicarJuegoClase'));
  assert.match(bloque, /!window\.ZOO_JUEGOS \|\| !lesson \|\| !lesson\.juego\) \{ despues\(\); return; \}/);
});

test('la biblioteca carga las preguntas y las reglas de acceso, y las usa', () => {
  assert.match(pagina, /src="\.\.\/assets\/js\/club-quiz\.js\?v=\d+"/);
  assert.match(pagina, /src="\.\.\/assets\/js\/club-acceso\.js\?v=\d+"/);
  assert.ok(pagina.indexOf('club-quiz.js') > pagina.indexOf('club-juegos.js'), 'el quiz usa la ventana del módulo de juegos');
  assert.ok(fs.existsSync(path.join(RAIZ, 'assets', 'js', 'club-quiz.js')));
  assert.ok(fs.existsSync(path.join(RAIZ, 'assets', 'js', 'club-acceso.js')));
  assert.match(pagina, /ZOO_ACCESO\.desbloqueadoPorTiempo\(list, courseIdx, daysAsMember\)/);
  assert.match(pagina, /ZOO_ACCESO\.esClaseGratis\(lesson, curso\)/);
});

test('las preguntas se responden antes del juego y cualquiera de las dos ventanas deja continuar', () => {
  const bloque = pagina.slice(pagina.indexOf('function abrirActividadesDeClase'), pagina.indexOf('window.practicarPreguntasClase'));
  assert.ok(bloque.indexOf('ZOO_QUIZ.abrir') > 0 && bloque.indexOf('abrirJuegoDeClase') > 0);
  assert.match(bloque, /alTerminar:\s*aJuego/);
  assert.match(bloque, /alCerrar:\s*aJuego/);
  assert.match(bloque, /if \(pasado\) return/, 'el juego se abre una sola vez');
  assert.match(bloque, /if \(!cantidadPreguntas\(lesson\)\) \{ aJuego\(\); return; \}/, 'sin preguntas va directo al juego');
});

test('el paywall del reproductor usa la regla de clases gratis con el curso actual', () => {
  assert.match(pagina, /!esClaseGratis\(lesson, window\.__currentCourse\)/);
});
