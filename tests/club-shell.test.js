'use strict';
// Estructura del panel (menú por grupos, buscador, barra inferior): parte pura de club-shell.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const S = require('../assets/js/club-shell.js');

const RAIZ = path.resolve(__dirname, '..');
const paginas = fs.readdirSync(path.join(RAIZ, 'pages')).filter(f => /^club-.*\.html$/.test(f));

test('el menú tiene los grupos esperados y cada sección apunta a una página que existe', () => {
  assert.deepEqual(S.GRUPOS.map(g => g.titulo), ['Principal', 'Material', 'Herramientas pro', 'Comunidad', 'Mi cuenta']);
  const ids = new Set();
  for (const i of S.planos()) {
    assert.ok(!ids.has(i.id), 'id repetido: ' + i.id);
    ids.add(i.id);
    assert.ok(fs.existsSync(path.join(RAIZ, 'pages', i.href)), i.href + ' no existe');
  }
  assert.ok(ids.has('pdfs') && ids.has('retos'));
  assert.ok(!ids.has('noticias'), 'las noticias viven en el Inicio, no tienen sección aparte');
});

test('la barra inferior del celular: Inicio, Cursos, PDFs, Vivo, Pro y Más', () => {
  assert.deepEqual(S.BARRA.map(t => t.label), ['Inicio', 'Cursos', 'PDFs', 'Vivo', 'Pro', 'Más']);
  assert.equal(S.BARRA[S.BARRA.length - 1].id, 'mas');
});

test('qué pestaña queda marcada según la página', () => {
  assert.equal(S.pestanaActiva('inicio'), 'inicio');
  assert.equal(S.pestanaActiva('biblioteca'), 'biblioteca');
  assert.equal(S.pestanaActiva('pdfs'), 'pdfs');
  assert.equal(S.pestanaActiva('sesiones'), 'sesiones');
  assert.equal(S.pestanaActiva('herramientas'), 'herramientas');
  assert.equal(S.pestanaActiva('legal'), 'herramientas');
  for (const otra of ['retos', 'logros', 'perfil', 'foro', 'noticias', '']) assert.equal(S.pestanaActiva(otra), 'mas', otra);
});

test('el buscador encuentra secciones sin importar acentos ni mayúsculas', () => {
  assert.equal(S.buscarSecciones('CERTIFICADOS')[0].id, 'certificados');
  assert.equal(S.buscarSecciones('clinicas')[0].id, 'herramientas');
  assert.deepEqual(S.buscarSecciones('noticias'), []);
  assert.ok(S.buscarSecciones('comunidad').length >= 3, 'busca también por grupo');
  assert.deepEqual(S.buscarSecciones('   '), []);
  assert.deepEqual(S.buscarSecciones('zzzz'), []);
  assert.ok(S.buscarSecciones('a', 3).length <= 3);
});

test('el buscador de cursos mira título, área e instructor y tolera datos raros', () => {
  const cursos = [
    { id: 'a', title: 'Manejo integral de colmenas', area: 'Apicultura', instructor: 'Dra. Pérez' },
    { id: 'b', title: 'Rescate de fauna', area: 'Fauna silvestre' },
    null, { id: 'c' }
  ];
  assert.deepEqual(S.buscarCursos('colmena', cursos).map(c => c.id), ['a']);
  assert.deepEqual(S.buscarCursos('FAUNA', cursos).map(c => c.id), ['b']);
  assert.deepEqual(S.buscarCursos('perez', cursos).map(c => c.id), ['a']);
  assert.deepEqual(S.buscarCursos('x', null), []);
  assert.deepEqual(S.buscarCursos('', cursos), []);
});

test('nombre, iniciales y enlace de soporte', () => {
  assert.equal(S.primerNombre('Ana María López'), 'Ana');
  assert.equal(S.primerNombre('', 'jorge@example.com'), 'jorge');
  assert.equal(S.primerNombre(null, null), 'Miembro');
  assert.equal(S.iniciales('ana lópez'), 'AL');
  assert.equal(S.iniciales('Ana'), 'A');
  assert.equal(S.iniciales('', 'zoo@example.com'), 'Z');
  assert.match(S.enlaceSoporte('Hola, necesito ayuda'), /^https:\/\/wa\.me\/\d+\?text=Hola%2C%20necesito%20ayuda$/);
});

test('todas las páginas del panel cargan la estructura nueva, y la versión de los archivos coincide', () => {
  const versiones = new Set();
  for (const f of paginas) {
    const h = fs.readFileSync(path.join(RAIZ, 'pages', f), 'utf8');
    if (!h.includes('club-layout')) continue;
    assert.ok(h.includes('assets/js/club-shell.js'), f + ' no carga club-shell.js');
    assert.ok(h.includes('assets/css/club-shell.css'), f + ' no carga club-shell.css');
    assert.ok(h.includes('assets/css/club-theme.css'), f + ' no carga el modo día/noche');
    for (const m of h.matchAll(/club-shell\.(?:js|css)\?v=([\w.-]+)/g)) versiones.add(m[1]);
  }
  assert.equal(versiones.size, 1, 'versiones distintas: ' + [...versiones].join(', '));
  const sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  const v = [...versiones][0];
  assert.ok(sw.includes('club-shell.js?v=' + v) && sw.includes('club-shell.css?v=' + v), 'sw.js debe conocer la misma versión');
});
