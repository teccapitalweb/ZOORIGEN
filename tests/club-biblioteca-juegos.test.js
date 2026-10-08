'use strict';
// La biblioteca del miembro debe cargar los juegos y abrirlos al terminar cada clase.
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

test('al completar una clase se guarda el avance ANTES de abrir el juego', () => {
  const cuerpo = pagina.slice(pagina.indexOf('async function marcarYSiguiente'));
  const guardar = cuerpo.indexOf('saveCourseProgress');
  const juego = cuerpo.indexOf('abrirJuegoDeClase(lessonIdx, continuar)');
  assert.ok(guardar > 0 && juego > guardar, 'primero se guarda el progreso y después se abre el juego');
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
