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

test('como en alintecfood: la clase SOLO se manda al servidor cuando se terminan sus preguntas y su juego', () => {
  const cuerpo = entre('async function marcarYSiguiente', 'function cantidadPreguntas');
  const actividades = cuerpo.indexOf('abrirActividadesDeClase(lessonIdx, async () => {');
  const registrar = cuerpo.indexOf('await registrar();', actividades);
  assert.ok(actividades > 0 && registrar > actividades, 'el avance se registra DENTRO del callback de las actividades, después de terminarlas');
  assert.match(cuerpo, /\{ obligatorio: true \}/);
  assert.match(cuerpo, /r = await guardarClaseVista\(courseId, lessonIdx\)/);
  assert.equal(/saveCourseProgress/.test(pagina), false, 'la página ya no guarda el avance en Firestore');
});

test('las actividades obligatorias no se pueden cerrar (juego y preguntas) y se pasan al abrirlas', () => {
  const juego = entre('function abrirJuegoDeClase', 'function closePlayer');
  assert.match(juego, /obligatorio:\s*!!\(opciones && opciones\.obligatorio\)/);
  assert.match(juego, /alTerminar:\s*seguir/);
  assert.match(juego, /if \(seguido\) return/, 'continuar debe ejecutarse una sola vez');
  const acts = entre('function abrirActividadesDeClase', 'function nombreJuegoDeClase');
  assert.match(acts, /obligatorio,\s*\n\s*alTerminar:\s*aJuego/);
  assert.match(acts, /abrirJuegoDeClase\(lessonIdx, despues, \{ obligatorio \}\)/);
  assert.match(acts, /if \(pasado\) return/, 'el juego se abre una sola vez');
  assert.match(acts, /if \(!cantidadPreguntas\(lesson\)\) \{ aJuego\(\); return; \}/, 'sin preguntas va directo al juego');
});

test('el reproductor NO ofrece botones que revelen o dejen repetir las preguntas y el juego (son sorpresa)', () => {
  assert.equal(/practicarJuegoClase|practicarPreguntasClase/.test(pagina), false);
  assert.equal(/Juego de la clase|Preguntas de la clase/.test(pagina), false);
});

test('una clase sin juego, o sin el módulo cargado, continúa igual que antes', () => {
  const bloque = entre('function abrirJuegoDeClase', 'function closePlayer');
  assert.match(bloque, /!window\.ZOO_JUEGOS \|\| !lesson \|\| !lesson\.juego\) \{ despues\(\); return; \}/);
});

test('ninguna vía se salta las actividades: la marca automática de 30 s solo corre en clases sin actividad y nunca en la última', () => {
  assert.match(pagina, /!leccionTieneActividad\(lesson\) && lessonIdx < totalClases - 1\) \{[^\n]*\n\s*window\.__autoCompleteTimer = setTimeout/, 'la marca automática solo corre en clases sin actividad y que no son la última');
  assert.equal(/toggleLessonComplete/.test(pagina), false, 'ya no se puede des-marcar una clase vista');
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
  assert.match(pagina, /ZOO_ACCESO\.desbloqueoCurso\(\{ lista: cursos, i, dias, prueba: window\.__zooPrueba, progreso: window\.__zooCourseProgress, adelantados: window\.__zooAdelantados(?:, inicioMs: [^}]+)? \}\)/);
  assert.match(pagina, /ZOO_ACCESO\.esClaseGratis\(lesson, curso, prueba, idx\)/);
});

test('el nombre del certificado lo pone el servidor: la página ya no arma ni escribe certificados', () => {
  assert.equal(/nombreCertificado|memberName|certData/.test(pagina), false, 'la página no arma datos de certificado');
  assert.equal(/collection\('certificados'\)/.test(pagina), false, 'la página no toca la colección de certificados');
  assert.equal(/generarCertificado/.test(pagina), false);
});

test('el paywall del reproductor usa la regla de clases gratis con el curso actual', () => {
  assert.match(pagina, /!esClaseGratis\(lesson, window\.__currentCourse, lessonIdx\)/);
});

test('ningún curso está impuesto como prueba: la biblioteca no trata de forma especial al "curso por defecto"', () => {
  assert.equal(pagina.includes('Se abre después de tu prueba'), false);
  assert.equal(/const esDefecto/.test(pagina), false);
  assert.match(pagina, /elegible: esElegible, motivoNo: 'No disponible como prueba'/);
});
