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

test('la barra inferior del celular: miembro (Inicio, Cursos, PDFs, Vivo, Pro y Más) y cuenta gratuita (Inicio, Cursos, PDFs, Retos, Logros y Más)', () => {
  const juego = v => S.BARRA.filter(t => !t.solo || t.solo === v).map(t => t.label);
  assert.deepEqual(juego('vip'), ['Inicio', 'Cursos', 'PDFs', 'Vivo', 'Pro', 'Más']);
  assert.deepEqual(juego('libre'), ['Inicio', 'Cursos', 'PDFs', 'Retos', 'Logros', 'Más']);
  assert.equal(S.BARRA[S.BARRA.length - 1].id, 'mas');
});

test('Invitar amigos vive en el grupo Principal del menú', () => {
  const principal = S.GRUPOS.find(g => g.id === 'principal');
  assert.ok(principal.items.some(i => i.id === 'referidos'));
  assert.ok(!S.GRUPOS.find(g => g.id === 'cuenta').items.some(i => i.id === 'referidos'));
});

test('qué pestaña queda marcada según la página', () => {
  assert.equal(S.pestanaActiva('inicio'), 'inicio');
  assert.equal(S.pestanaActiva('biblioteca'), 'biblioteca');
  assert.equal(S.pestanaActiva('pdfs'), 'pdfs');
  assert.equal(S.pestanaActiva('sesiones'), 'sesiones');
  assert.equal(S.pestanaActiva('herramientas'), 'herramientas');
  assert.equal(S.pestanaActiva('legal'), 'herramientas');
  for (const otra of ['retos', 'logros', 'perfil', 'foro', 'noticias', '']) assert.equal(S.pestanaActiva(otra), 'mas', otra);
  // cuenta gratuita: Retos y Logros tienen su pestaña; las herramientas caen en "Más"
  assert.equal(S.pestanaActiva('retos', 'libre'), 'retos');
  assert.equal(S.pestanaActiva('logros', 'libre'), 'logros');
  assert.equal(S.pestanaActiva('herramientas', 'libre'), 'mas');
  assert.equal(S.pestanaActiva('sesiones', 'libre'), 'mas');
});

test('el buscador encuentra secciones sin importar acentos ni mayúsculas', () => {
  assert.equal(S.buscarSecciones('CERTIFICADOS')[0].id, 'certificados');
  assert.equal(S.buscarSecciones('clinica')[0].id, 'herramientas');
  assert.equal(S.buscarSecciones('REFERENCIA')[0].id, 'herramientas');
  assert.deepEqual(S.buscarSecciones('dosis'), [], 'ya no hay dosis en el menú ni en el buscador');
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
