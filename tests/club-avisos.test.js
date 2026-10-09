'use strict';
// Campana de avisos: mezcla, leído/borrado en el navegador, destinos seguros
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../assets/js/club-avisos.js');

const aviso = (id, extra) => Object.assign({ id, tipo: 'dato', titulo: 'T ' + id, texto: 'x', fecha: '2026-10-09T10:00:00Z' }, extra || {});

test('mezclar: sin repetidos, de lo más nuevo a lo más viejo, y se descartan los vacíos', () => {
  const l = A.mezclar(
    [aviso('a', { fecha: '2026-10-01T00:00:00Z' }), aviso('b', { fecha: '2026-10-05T00:00:00Z' })],
    [aviso('a'), { id: '', titulo: 'x' }, { id: 'z' }]
  );
  assert.equal(l.length, 2);
  assert.deepEqual(l.map(x => x.id), ['b', 'a']);    // gana la primera copia de 'a' (1 de octubre) y se ordena por fecha
  assert.deepEqual(A.mezclar(null, undefined), []);
});

test('mezclar: máximo 40', () => {
  const muchos = Array.from({ length: 70 }, (_, i) => aviso('x' + i, { fecha: new Date(2026, 0, 1 + (i % 28)).toISOString() }));
  assert.equal(A.mezclar(muchos).length, A.MAX_LISTA);
});

test('normalizar: tipo desconocido cae en "general"; color inválido usa el del tipo; se quita el emoji inicial', () => {
  const n = A.normalizar({ id: '1', tipo: 'loquesea', titulo: '💡 Dato curioso', color: 'rojo' });
  assert.equal(n.tipo, 'general');
  assert.equal(n.color, A.PRESET.general.color);
  assert.equal(n.titulo, 'Dato curioso');
  assert.equal(A.normalizar({ id: '2', tipo: 'logro', color: '#112233' }).color, '#112233');
  assert.equal(A.normalizar({ id: '3', tipo: 'dato', titulo: '🎁' }).titulo, '🎁');
});

test('leído y borrado: las no leídas bajan al leer y los borrados dejan de verse', () => {
  const lista = A.mezclar([aviso('a'), aviso('b'), aviso('c')]);
  let e = A.estadoVacio();
  assert.equal(A.noLeidas(lista, e).length, 3);
  e = A.conLeidos(e, ['a', 'b']);
  assert.equal(A.noLeidas(lista, e).length, 1);
  e = A.conBorrados(e, ['c']);
  assert.equal(A.visibles(lista, e).length, 2);
  assert.equal(A.noLeidas(lista, e).length, 0);
  // un aviso que ya venía leído (de la campana anterior) no cuenta como nuevo
  assert.equal(A.noLeidas(A.mezclar([aviso('l', { leidoAntes: true })]), A.estadoVacio()).length, 0);
});

test('la memoria no crece sin límite ni guarda repetidos', () => {
  let e = A.estadoVacio();
  e = A.conLeidos(e, Array.from({ length: 500 }, (_, i) => 'id' + i));
  assert.equal(e.leidos.length, 300);
  assert.equal(A.conLeidos(e, ['id499', 'id499']).leidos.length, 300);
});

test('guardar y leer el estado por cuenta; un almacenamiento roto no tumba nada', () => {
  const mem = {};
  const alm = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = v; } };
  assert.equal(A.guardarEstado(alm, 'u1', { leidos: ['a'], borrados: ['b'] }), true);
  assert.deepEqual(A.leerEstado(alm, 'u1'), { leidos: ['a'], borrados: ['b'] });
  assert.deepEqual(A.leerEstado(alm, 'u2'), A.estadoVacio());
  mem[A.claveLocal('u3', 'leidos')] = '{no es json';
  assert.deepEqual(A.leerEstado(alm, 'u3'), A.estadoVacio());
  mem[A.claveLocal('u4', 'leidos')] = JSON.stringify([1, 'ok', null]);
  assert.deepEqual(A.leerEstado(alm, 'u4').leidos, ['ok']);
  const roto = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); } };
  assert.deepEqual(A.leerEstado(roto, 'u1'), A.estadoVacio());
  assert.equal(A.guardarEstado(roto, 'u1', A.estadoVacio()), false);
});

test('destino: solo páginas del propio sitio', () => {
  const secciones = [{ id: 'logros', href: 'club-logros.html' }, { id: 'pdfs', href: 'club-pdfs.html' }];
  assert.equal(A.destino('logros', secciones), 'club-logros.html');
  assert.equal(A.destino('club-pdfs.html', secciones), 'club-pdfs.html');
  assert.equal(A.destino('noticias', secciones), 'club-dashboard.html#noticias', 'las noticias llevan al Inicio');
  assert.equal(A.destino('club-noticias.html', secciones), 'club-dashboard.html#noticias');
  for (const mal of ['https://malo.com', 'javascript:alert(1)', '//malo.com', '../../x', 'desconocida', '', null, 'a/b.html']) assert.equal(A.destino(mal, secciones), '', String(mal));
});

test('encabezado, hace… y avisos del navegador', () => {
  assert.equal(A.resumenEncabezado(0), 'Al día');
  assert.equal(A.resumenEncabezado(1), '1 nueva');
  assert.equal(A.resumenEncabezado(3), '3 nuevas');
  const ahora = new Date('2026-10-09T12:00:00');
  assert.equal(A.hace(new Date('2026-10-09T11:59:50'), ahora), 'ahora');
  assert.equal(A.hace(new Date('2026-10-09T09:00:00'), ahora), 'hace 3 h');
  assert.equal(A.hace(new Date('2026-10-08T09:00:00'), ahora), 'ayer');
  const l = A.deLegado({ id: 'webinar_1', type: 'webinar', title: '¡Mañana en vivo!', message: 'Tema', time: new Date('2026-10-09T08:00:00'), href: 'club-sesiones.html', read: true });
  assert.equal(l.tipo, 'clase');
  assert.equal(l.leidoAntes, true);
  assert.equal(l.id, 'local_webinar_1');
});
