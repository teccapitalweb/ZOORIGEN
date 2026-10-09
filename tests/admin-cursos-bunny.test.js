'use strict';
// Botón "Sincronizar con Bunny" dentro del formulario del curso.
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../assets/js/admin-cursos.js');

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const catalogo = [
  { titulo: 'Manejo integral de colmenas', collectionId: 'a', sesiones: [{ numero: 2, titulo: 'Clase 2.mp4', videoId: id(2) }, { numero: 1, titulo: 'Clase 1.mp4', videoId: id(1) }, { numero: 3, titulo: 'Clase 3', videoId: id(3) }] },
  { titulo: 'Biología de tiburones y rayas', collectionId: 'b', sesiones: [{ numero: 1, titulo: 'Clase 1', videoId: id(11) }] },
  { titulo: 'Colección vacía', collectionId: 'c', sesiones: [] }
];

test('mejorColeccion encuentra la colección parecida aunque el título no sea idéntico', () => {
  assert.equal(C.mejorColeccion('Manejo integral de colmenas', catalogo).coleccion.collectionId, 'a');
  assert.equal(C.mejorColeccion('manejo INTEGRAL de colmenas', catalogo).puntaje, 1, 'sin importar mayúsculas');
  assert.equal(C.mejorColeccion('Biología, ecología y conservación de tiburones y rayas', catalogo).coleccion.collectionId, 'b');
  assert.equal(C.mejorColeccion('Biologia de tiburones', catalogo).coleccion.collectionId, 'b', 'sin acentos');
});

test('mejorColeccion no inventa: si nada se parece devuelve null; ignora colecciones sin videos', () => {
  assert.equal(C.mejorColeccion('Cocina molecular avanzada', catalogo), null);
  assert.equal(C.mejorColeccion('', catalogo), null);
  assert.equal(C.mejorColeccion('Colección vacía', catalogo), null);
  assert.equal(C.mejorColeccion('x', null), null);
});

test('puntajeTitulo: igual = 1, contenido = 0.9, nada en común = 0', () => {
  assert.equal(C.puntajeTitulo('Hola Mundo', 'hola mundo'), 1);
  assert.equal(C.puntajeTitulo('Curso de abejas', 'Curso de abejas avanzado'), 0.9);
  assert.equal(C.puntajeTitulo('abejas', 'tiburones'), 0);
});

test('catalogoDesdeArchivo adapta el catálogo guardado en el sitio a la forma de Bunny en vivo', () => {
  const r = C.catalogoDesdeArchivo([{ title: 'T', lecciones: [{ num: 1, titulo: 'Clase 1', videoId: id(1) }, { titulo: 'Clase 2', videoId: id(2) }] }]);
  assert.deepEqual(r, [{ titulo: 'T', collectionId: null, sesiones: [{ numero: 1, titulo: 'Clase 1', videoId: id(1) }, { numero: 2, titulo: 'Clase 2', videoId: id(2) }] }]);
  assert.deepEqual(C.catalogoDesdeArchivo(null), []);
});

test('aplicarColeccion en un curso NUEVO crea las clases en orden con título limpio (sin .mp4)', () => {
  const r = C.aplicarColeccion([{ titulo: '', driveId: '', duration: '' }], catalogo[0]);
  assert.equal(r.lecciones.length, 3);
  assert.deepEqual(r.lecciones.map(l => l.videoId), [id(1), id(2), id(3)], 'ordenadas por número aunque Bunny las devuelva desordenadas');
  assert.deepEqual(r.lecciones.map(l => l.titulo), ['Clase 1', 'Clase 2', 'Clase 3']);
  assert.ok(r.lecciones.every(l => l.provider === 'bunny' && l.driveId === undefined));
  assert.equal(r.nuevas, 3);
});

test('aplicarColeccion en un curso EXISTENTE conserva títulos, preguntas, juegos, gratis y duración', () => {
  const previas = [
    { titulo: 'Mi título propio', driveId: 'driveviejo123', duration: '25 min', gratis: true, preguntas: [{ pregunta: 'q', tipo: 'vof', correcta: 0 }], juego: { tipo: 'ahorcado', datos: { palabras: [{ palabra: 'ABEJA' }] } } },
    { titulo: 'Segunda', videoId: id(99), provider: 'bunny', duration: '10 min' }
  ];
  const r = C.aplicarColeccion(previas, catalogo[0]);
  assert.equal(r.lecciones.length, 3);
  assert.equal(r.lecciones[0].titulo, 'Mi título propio');
  assert.equal(r.lecciones[0].videoId, id(1));
  assert.equal(r.lecciones[0].gratis, true);
  assert.equal(r.lecciones[0].preguntas.length, 1);
  assert.equal(r.lecciones[0].juego.tipo, 'ahorcado');
  assert.equal(r.lecciones[0].duration, '25 min');
  assert.equal(r.lecciones[0].driveId, undefined);
  assert.equal(r.lecciones[0].driveIdAnterior, 'driveviejo123', 'queda guardado el enlace viejo por si hace falta volver');
  assert.equal(r.lecciones[1].videoId, id(2), 'el video anterior se reemplaza por el de la colección');
  assert.equal(r.lecciones[2].titulo, 'Clase 3');
  assert.deepEqual([r.actualizadas, r.nuevas], [2, 1]);
  assert.equal(previas[0].driveId, 'driveviejo123', 'no modifica la lista original (si se cancela, no pasa nada)');
});

test('aplicarColeccion NO borra las clases extra que Bunny no trae, y las cuenta como sobrantes', () => {
  const previas = [1, 2, 3, 4].map(n => ({ titulo: 'C' + n, driveId: 'drive' + n + '12345' }));
  const r = C.aplicarColeccion(previas, catalogo[1]);   // Bunny trae solo 1 video
  assert.equal(r.lecciones.length, 4);
  assert.equal(r.lecciones[0].videoId, id(11));
  assert.equal(r.lecciones[3].driveId, 'drive412345');
  assert.equal(r.sobrantes, 3);
});

test('aplicarColeccion ignora videos con ID inválido y colecciones vacías', () => {
  const r = C.aplicarColeccion([{ titulo: 'x', driveId: 'abc123456' }], { sesiones: [{ numero: 1, titulo: 'mal', videoId: 'no-es-uuid' }] });
  assert.deepEqual(r.lecciones, [{ titulo: 'x', driveId: 'abc123456' }]);
  assert.deepEqual(C.aplicarColeccion(null, null).lecciones, []);
});

test('el resultado de sincronizar pasa sin problemas por limpiarLecciones (listo para guardar)', () => {
  const r = C.aplicarColeccion([{ titulo: '', driveId: '', duration: '' }], catalogo[0]);
  const limpio = C.limpiarLecciones(r.lecciones);
  assert.deepEqual(limpio.errores, []);
  assert.equal(limpio.lecciones.length, 3);
});

test('videosUsadosPorOtros avisa si los videos ya están en otro curso (y no cuenta al propio)', () => {
  const cursos = [
    { id: 'c1', title: 'Colmenas', lecciones: [{ videoId: id(1) }] },
    { id: 'c2', title: 'Otro', lecciones: [{ videoId: id(50) }] },
    { id: 'c3', title: 'Propio', lecciones: [{ videoId: id(2) }] }
  ];
  assert.deepEqual(C.videosUsadosPorOtros(cursos, 'c3', catalogo[0]), ['Colmenas']);
  assert.deepEqual(C.videosUsadosPorOtros(cursos, 'c1', catalogo[0]), ['Propio']);
  assert.deepEqual(C.videosUsadosPorOtros(cursos, '', catalogo[1]), []);
  assert.deepEqual(C.videosUsadosPorOtros(null, '', catalogo[0]), []);
});

test('el formulario del curso trae el botón y su explicación', () => {
  const html = C.modalCursoHTML({}, null, null);
  assert.match(html, /id="cf-sync-bunny"[^>]*onclick="sincronizarCursoBunny\(\)"/);
  assert.match(html, /Sincronizar con Bunny/);
  assert.match(html, /No cambia títulos que ya escribiste, preguntas, juegos ni clases gratis/);
});
