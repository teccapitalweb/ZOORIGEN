'use strict';
// Editor de cursos: video de Bunny/Drive, clases gratis, preguntas, instructor y disponibilidad.
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../assets/js/admin-cursos.js');

const UUID = '5d1c2a3e-8b7f-4a6c-9e10-0123456789ab';

/* ── Fuente del video ── */
test('normalizarFuente: ID de Bunny, enlace de Bunny, enlace e ID de Drive', () => {
  assert.deepEqual(C.normalizarFuente(UUID), { videoId: UUID });
  assert.deepEqual(C.normalizarFuente('  ' + UUID.toUpperCase() + ' '), { videoId: UUID }, 'se normaliza a minúsculas');
  assert.deepEqual(C.normalizarFuente(`https://iframe.mediadelivery.net/embed/731751/${UUID}?autoplay=false`), { videoId: UUID });
  assert.deepEqual(C.normalizarFuente(`https://iframe.mediadelivery.net/play/731751/${UUID}`), { videoId: UUID });
  assert.deepEqual(C.normalizarFuente('https://drive.google.com/file/d/1AbC_dEf-123456789/view?usp=sharing'), { driveId: '1AbC_dEf-123456789' });
  assert.deepEqual(C.normalizarFuente('https://drive.google.com/open?id=1AbC_dEf-123456789'), { driveId: '1AbC_dEf-123456789' });
  assert.deepEqual(C.normalizarFuente('1AbC_dEf-123456789'), { driveId: '1AbC_dEf-123456789' });
  assert.equal(C.normalizarFuente('   ').vacio, true);
  assert.equal(C.normalizarFuente(null).vacio, true);
});

test('normalizarFuente rechaza lo que no sirve: otra biblioteca, otros sitios, texto suelto', () => {
  assert.match(C.normalizarFuente(`https://iframe.mediadelivery.net/embed/999999/${UUID}`).error, /otra biblioteca/);
  assert.match(C.normalizarFuente('https://www.youtube.com/watch?v=abc').error, /Google Drive o de Bunny/);
  assert.match(C.normalizarFuente('https://evil.example/drive.google.com/file/d/abcdef12345').error, /Google Drive o de Bunny/);
  assert.match(C.normalizarFuente('hola mundo').error, /ID del video/);
  assert.match(C.normalizarFuente('ab').error, /ID del video/);
  assert.match(C.normalizarFuente('javascript:alert(1)').error, /ID del video/);
});

test('limpiarLecciones convierte el campo de video: ID de Bunny → videoId + provider; enlace de Drive → ID', () => {
  const r = C.limpiarLecciones([
    { titulo: ' Clase A ', driveId: UUID },
    { titulo: 'Clase B', driveId: 'https://drive.google.com/file/d/1AbC_dEf-123456789/view' },
    { titulo: 'Clase C', videoId: 'existente-de-bunny', provider: 'bunny' },
    { titulo: 'vacía', driveId: '   ' }
  ]);
  assert.deepEqual(r.errores, []);
  assert.equal(r.lecciones.length, 3, 'la clase sin video se descarta');
  assert.deepEqual([r.lecciones[0].videoId, r.lecciones[0].provider, r.lecciones[0].driveId], [UUID, 'bunny', undefined]);
  assert.equal(r.lecciones[0].titulo, 'Clase A');
  assert.equal(r.lecciones[1].driveId, '1AbC_dEf-123456789');
  assert.equal(r.lecciones[2].videoId, 'existente-de-bunny', 'un video ya vinculado no se toca');
});

test('limpiarLecciones avisa qué clase trae un video inválido', () => {
  const r = C.limpiarLecciones([{ titulo: 'ok', driveId: UUID }, { titulo: 'mal', driveId: 'https://www.youtube.com/watch?v=x' }]);
  assert.equal(r.errores.length, 1);
  assert.match(r.errores[0].mensaje, /^Clase 2: solo se aceptan/);
  assert.equal(r.errores[0].clase, 2);
});

/* ── Clase gratis ── */
test('la marca "gratis" solo se guarda cuando es true y no se inventa en las demás clases', () => {
  const r = C.limpiarLecciones([
    { titulo: 'a', driveId: UUID, gratis: true },
    { titulo: 'b', driveId: UUID, gratis: false },
    { titulo: 'c', driveId: UUID, gratis: 'true' },
    { titulo: 'd', driveId: UUID }
  ]);
  assert.deepEqual(r.lecciones.map(l => l.gratis), [true, undefined, undefined, undefined]);
  assert.equal('gratis' in r.lecciones[1], false);
});

/* ── Preguntas ── */
test('agregar/quitar preguntas, cambiar tipo y manejar opciones', () => {
  const l = { titulo: 'x' };
  assert.equal(C.agregarPregunta(l), true);
  assert.deepEqual(l.preguntas[0], { pregunta: '', tipo: 'vof', opciones: [], correcta: 0 });
  const p = l.preguntas[0];
  assert.equal(C.agregarOpcion(p), false, 'verdadero/falso no tiene opciones');
  C.cambiarTipoPregunta(p, 'multiple');
  assert.deepEqual([p.tipo, p.opciones, p.correcta], ['multiple', ['', ''], 0]);
  assert.equal(C.quitarOpcion(p, 0), false, 'mínimo 2 opciones');
  for (let i = 0; i < 4; i++) assert.equal(C.agregarOpcion(p), true);
  assert.equal(p.opciones.length, 6);
  assert.equal(C.agregarOpcion(p), false, 'máximo 6 opciones');
  p.correcta = 3;
  assert.equal(C.quitarOpcion(p, 1), true);
  assert.equal(p.correcta, 2, 'si se quita una opción anterior, la correcta sigue siendo la misma');
  assert.equal(C.quitarOpcion(p, 2), true);
  assert.equal(p.correcta, 0, 'si se quita la correcta, vuelve a la primera');
  C.cambiarTipoPregunta(p, 'vof');
  assert.deepEqual([p.tipo, p.opciones, p.correcta], ['vof', [], 0]);
  assert.equal(C.quitarPregunta(l, 5), false);
  assert.equal(C.quitarPregunta(l, 0), true);
  assert.equal(l.preguntas.length, 0);
});

test('tope de preguntas por clase', () => {
  const l = {};
  for (let i = 0; i < 15; i++) assert.equal(C.agregarPregunta(l), true);
  assert.equal(C.agregarPregunta(l), false);
});

test('asignarRuta escribe preguntas por lista blanca y guarda la correcta como número', () => {
  const l = { preguntas: [{ pregunta: '', tipo: 'multiple', opciones: ['', ''], correcta: 0 }] };
  assert.equal(C.asignarRuta(l, 'preguntas.0.pregunta', '¿Qué?'), true);
  assert.equal(C.asignarRuta(l, 'preguntas.0.opciones.1', 'Esta'), true);
  assert.equal(C.asignarRuta(l, 'preguntas.0.correcta', '1'), true);
  assert.deepEqual([l.preguntas[0].pregunta, l.preguntas[0].opciones[1], l.preguntas[0].correcta], ['¿Qué?', 'Esta', 1]);
  assert.equal(C.asignarRuta(l, 'preguntas.0.correcta', 'abc'), true);
  assert.equal(l.preguntas[0].correcta, 0);
  assert.equal(C.asignarRuta(l, 'preguntas.0.opciones.5', 'x'), false, 'fuera de rango');
  assert.equal(C.asignarRuta(l, 'preguntas.3.pregunta', 'x'), false, 'pregunta inexistente');
  assert.equal(C.asignarRuta(l, 'preguntas.0.tipo', 'multiple'), false, 'el tipo solo cambia con cambiarTipoPregunta');
  assert.equal(C.asignarRuta(l, 'preguntas.__proto__.pregunta', 'x'), false);
});

test('limpiarLecciones guarda preguntas limpias y bloquea las incompletas nombrando la clase', () => {
  const ok = C.limpiarLecciones([{ titulo: 'a', driveId: UUID, preguntas: [
    { pregunta: ' ¿Reina? ', tipo: 'vof', opciones: [], correcta: 1 },
    { pregunta: '¿Cuál?', tipo: 'multiple', opciones: ['A', '', 'C'], correcta: 2 },
    { pregunta: '', tipo: 'vof', opciones: [], correcta: 0 }
  ] }]);
  assert.deepEqual(ok.errores, []);
  assert.deepEqual(ok.lecciones[0].preguntas, [
    { pregunta: '¿Reina?', tipo: 'vof', correcta: 1 },
    { pregunta: '¿Cuál?', tipo: 'multiple', opciones: ['A', 'C'], correcta: 1 }
  ]);
  const mal = C.limpiarLecciones([{ titulo: 'a', driveId: UUID }, { titulo: 'b', driveId: UUID, preguntas: [{ pregunta: 'x', tipo: 'multiple', opciones: ['a', ''], correcta: 0 }] }]);
  assert.equal(mal.errores.length, 1);
  assert.match(mal.errores[0].mensaje, /^Clase 2: pregunta 1: necesita al menos 2 opciones/);
  const sin = C.limpiarLecciones([{ titulo: 'a', driveId: UUID, preguntas: [] }]);
  assert.equal('preguntas' in sin.lecciones[0], false, 'sin preguntas no queda el campo');
});

test('limpiarLecciones conserva intactos los campos que el editor no conoce', () => {
  const r = C.limpiarLecciones([{ titulo: 'a', videoId: 'v1', provider: 'bunny', descripcion: 'texto', driveIdAnterior: 'old', duration: ' 25 min ' }]);
  assert.deepEqual(r.lecciones[0], { titulo: 'a', videoId: 'v1', provider: 'bunny', descripcion: 'texto', driveIdAnterior: 'old', duration: '25 min' });
});

/* ── HTML del editor ── */
test('el editor dibuja gratis, preguntas, instructor y disponibilidad (y escapa el texto)', () => {
  const l = { titulo: 'a', videoId: 'v', gratis: true, preguntas: [
    { pregunta: '<img src=x onerror=alert(1)>', tipo: 'multiple', opciones: ['"><b>', 'ok'], correcta: 1 },
    { pregunta: 'vof', tipo: 'vof', opciones: [], correcta: 1 }
  ] };
  const html = C.leccionHTML(l, 0, 1);
  assert.match(html, /data-accion="gratis" checked/);
  assert.match(html, /data-accion="pregunta-agregar"/);
  assert.equal((html.match(/class="ce-preg"/g) || []).length, 2);
  assert.ok(!html.includes('<img src=x'), 'el texto de la pregunta va escapado');
  assert.ok(!html.includes('"><b>'), 'las opciones van escapadas');
  assert.match(html, /name="corr-0"[^>]*value="1" checked/, 'la opción correcta viene marcada');
  assert.match(html, /name="corr-1"[^>]*value="1" checked/, 'Falso marcado en la segunda');
  const modal = C.modalCursoHTML({ id: 'c1', title: 'T', instructor: 'Dra. <b>Ana</b>', cursoMuestraGratis: true, disponibleSiempre: true }, null, null);
  assert.match(modal, /id="f_instructor"/);
  assert.ok(!modal.includes('<b>Ana</b>'));
  assert.match(modal, /name="f_disp" value="siempre" checked/);
  assert.match(modal, /id="f_muestra" checked/);
  const nuevo = C.modalCursoHTML({}, null, null);
  assert.match(nuevo, /name="f_disp" value="progresivo" checked/, 'por defecto: desbloqueo progresivo');
  assert.ok(!/id="f_muestra" checked/.test(nuevo));
});

test('las tarjetas muestran preguntas, muestra gratis, siempre disponible e instructor', () => {
  const c = { id: 'c1', title: 'T', area: 'Apicultura', cursoMuestraGratis: true, disponibleSiempre: true, instructor: 'Ana',
    lecciones: [{ videoId: 'v', preguntas: [{ pregunta: 'q', tipo: 'vof', correcta: 0 }, { pregunta: 'w', tipo: 'vof', correcta: 1 }] }] };
  assert.equal(C.contarPreguntas(c), 2);
  const html = C.tarjetaGridHTML(c);
  assert.match(html, /2 preguntas/);
  assert.match(html, /Muestra gratis/);
  assert.match(html, /Siempre disponible/);
  assert.match(html, /Ana/);
  assert.ok(!/Muestra gratis|Siempre disponible|pregunta/.test(C.tarjetaGridHTML({ id: 'c2', title: 'X', lecciones: [{ videoId: 'v' }] })), 'un curso sin marcas se ve igual que antes');
});

test('sincronizar con Bunny conserva las preguntas, la marca de clase gratis y el juego de cada clase', () => {
  const previas = [{ titulo: 'Intro', driveId: 'abc123456', gratis: true, preguntas: [{ pregunta: 'q', tipo: 'vof', correcta: 0 }], juego: { tipo: 'ahorcado', datos: {} } }];
  const r = C.migrarLecciones(previas, [{ titulo: 'Clase 1', videoId: UUID }]);
  assert.equal(r[0].videoId, UUID);
  assert.equal(r[0].provider, 'bunny');
  assert.equal(r[0].gratis, true);
  assert.equal(r[0].preguntas.length, 1);
  assert.equal(r[0].juego.tipo, 'ahorcado');
  assert.equal(r[0].driveId, undefined);
  assert.equal(r[0].driveIdAnterior, 'abc123456');
});
