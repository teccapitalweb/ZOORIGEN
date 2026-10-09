'use strict';
// PDFs y materiales: partes puras de club-materiales.js (metas de retos, filtros, seguridad al pintar, guardados, paginación)
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../assets/js/club-materiales.js');

const libro = (id, req, extra) => Object.assign({ id, titulo: 'Libro ' + id, subtitulo: 'Sub', autor: 'Equipo Zoorigen', categoria: 'Normatividad', color: '#1F5F3A', icono: 'scale', resumen: 'Resumen', paginasTotal: 10, requiereRetos: req, desbloqueado: false, faltan: req }, extra || {});

test('siguienteMeta: el libro de menor umbral que aún falta, con su porcentaje', () => {
  const libros = [libro('c', 30), libro('a', 5), libro('b', 15)];
  const m = M.siguienteMeta(libros, 3);
  assert.equal(m.libro.id, 'a');
  assert.equal(m.faltan, 2);
  assert.equal(m.porcentaje, 60);
  assert.equal(M.siguienteMeta(libros, 5).libro.id, 'b');       // justo en el umbral: ese ya se abrió
  assert.equal(M.siguienteMeta(libros, 14).faltan, 1);
  assert.equal(M.siguienteMeta(libros, 30).todosAbiertos, true);
  assert.equal(M.siguienteMeta([], 4), null);
  assert.equal(M.siguienteMeta(null, 4), null);
  assert.equal(M.siguienteMeta(libros, -3).libro.id, 'a');
  assert.equal(M.siguienteMeta(libros, 'abc').superados, 0);
});

test('textos de bloqueo', () => {
  assert.equal(M.textoBloqueo({ desbloqueado: true }), '');
  assert.equal(M.textoBloqueo({ desbloqueado: false, soloMiembros: true }), 'Solo para miembros');
  assert.equal(M.textoBloqueo({ desbloqueado: false, faltan: 1 }), 'Supera 1 reto más');
  assert.equal(M.textoBloqueo({ desbloqueado: false, faltan: 8 }), 'Supera 8 retos más');
  assert.equal(M.textoBloqueo({ desbloqueado: false, faltan: 0, requiereRetos: 5 }), 'Supera 5 retos más');
  assert.match(M.mensajeBloqueo({ titulo: 'X', faltan: 3 }), /«X» se desbloquea al superar 3 retos más\./);
  assert.match(M.mensajeBloqueo({ titulo: 'X', soloMiembros: true }), /solo para miembros/);
});

test('filtros: pestaña, texto sin acentos y guardados', () => {
  const docs = [
    { id: 'a', titulo: 'Checklist de bioseguridad', tipo: 'checklist', area: 'Bioseguridad', descripcion: 'x' },
    { id: 'b', titulo: 'Introducción a la NOM-059', tipo: 'presentacion', area: 'Normatividad', descripcion: 'x' },
    { id: 'c', titulo: 'Glosario', tipo: 'glosario', area: 'Normatividad', descripcion: 'términos' }
  ];
  assert.deepEqual(M.filtrarMateriales(docs, { pestana: 'presentaciones' }).map(d => d.id), ['b']);
  assert.deepEqual(M.filtrarMateriales(docs, { pestana: 'guias' }).map(d => d.id), ['a', 'c']);
  assert.deepEqual(M.filtrarMateriales(docs, { texto: 'INTRODUCCION' }).map(d => d.id), ['b']);
  assert.deepEqual(M.filtrarMateriales(docs, { texto: 'terminos' }).map(d => d.id), ['c']);
  assert.deepEqual(M.filtrarMateriales(docs, { pestana: 'guardados', guardados: ['doc:c'] }).map(d => d.id), ['c']);
  assert.deepEqual(M.filtrarMateriales(null, {}), []);
  const libros = [libro('a', 5), libro('b', 15, { titulo: 'Bienestar animal' })];
  assert.deepEqual(M.filtrarLibros(libros, { texto: 'bienestar' }).map(l => l.id), ['b']);
  assert.deepEqual(M.filtrarLibros(libros, { pestana: 'guardados', guardados: ['libro:a'] }).map(l => l.id), ['a']);
});

test('todo lo que viene del servidor se escapa al pintar', () => {
  const sucio = libro('x', 5, { titulo: '<img src=x onerror=alert(1)>', subtitulo: '"><script>1</script>', color: 'red;background:url(x)', autor: '<b>a</b>' });
  for (const html of [M.libroCardHTML(sucio, {}), M.libroDestacadoHTML(sucio)]) {
    assert.ok(!/<img src=x/.test(html));
    assert.ok(!/<script/.test(html));
    assert.ok(!/red;background/.test(html), 'color inválido se reemplaza');
  }
  const doc = M.materialCardHTML({ id: 'd', titulo: '<svg onload=1>', tipo: 'inventado', area: '"><b>', descripcion: '<i>', desbloqueado: false, faltan: 2 }, {});
  assert.ok(!/<svg onload/.test(doc));
  assert.match(doc, /Supera 2 retos más/);
  const drive = M.driveHTML([{ title: '<x>', driveId: 'abc"><script>', url: 'javascript:alert(1)' }, { title: 'Otro', url: 'https://ok.com/a.pdf' }]);
  assert.ok(!/<script/.test(drive) && !/javascript:/.test(drive));
  assert.match(drive, /https:\/\/ok\.com\/a\.pdf/);
  const pag = M.paginaHTML({ titulo: '<b>T</b>', parrafos: ['<img src=x onerror=1>'], lista: ['<script>'] }, 0, 3);
  assert.ok(!/<img src=x/.test(pag) && !/<script/.test(pag));
});

test('el libro bloqueado muestra candado y avance gris; el abierto, su página', () => {
  assert.match(M.libroCardHTML(libro('a', 5), {}), /mt-libro__lock/);
  assert.match(M.libroCardHTML(libro('a', 5), {}), /is-bloq/);
  const abierto = M.libroCardHTML(libro('a', 5, { desbloqueado: true, faltan: 0 }), { pagina: 3 });
  assert.ok(!/mt-libro__lock/.test(abierto));
  assert.match(abierto, /Página 4 de 10/);
  assert.match(M.libroCardHTML(libro('a', 5, { desbloqueado: true }), { guardado: true }), /is-on/);
});

test('banner de retos', () => {
  assert.equal(M.bannerRetosHTML(null), '');
  const b = M.bannerRetosHTML(M.siguienteMeta([libro('a', 5)], 2));
  assert.match(b, /llevas 2 de 5 retos/);
  assert.match(b, /Supera 3 retos más/);
  assert.match(M.bannerRetosHTML(M.siguienteMeta([libro('a', 5)], 9)), /Desbloqueaste todos los libros/);
});

test('guardados y avance de lectura por cuenta, con almacenamiento roto sin fallar', () => {
  const mem = {};
  const alm = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = v; } };
  assert.deepEqual(M.alternarGuardado(alm, 'u1', 'libro:a'), ['libro:a']);
  assert.deepEqual(M.alternarGuardado(alm, 'u1', 'doc:b'), ['libro:a', 'doc:b']);
  assert.deepEqual(M.alternarGuardado(alm, 'u1', 'libro:a'), ['doc:b']);
  assert.deepEqual(M.leerGuardados(alm, 'u2'), []);
  mem[M.claveGuardados('u3')] = JSON.stringify(['libro:ok', 'cosa:mala', 5, 'doc:<x>']);
  assert.deepEqual(M.leerGuardados(alm, 'u3'), ['libro:ok']);
  M.guardarPagina(alm, 'u1', 'ley', 4);
  assert.equal(M.leerPagina(alm, 'u1', 'ley', 17), 4);
  assert.equal(M.leerPagina(alm, 'u1', 'ley', 3), 0, 'fuera de rango → inicio');
  assert.equal(M.leerPagina(alm, 'u9', 'ley', 17), 0);
  const roto = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
  assert.deepEqual(M.leerGuardados(roto, 'u1'), []);
  assert.deepEqual(M.alternarGuardado(roto, 'u1', 'libro:a'), ['libro:a']);
  assert.equal(M.leerPagina(roto, 'u1', 'ley', 5), 0);
});

test('vistaPaginas: dos páginas en pantalla ancha, una en celular, sin salirse del libro', () => {
  const ancha = M.vistaPaginas(17, 0, 1280);
  assert.deepEqual(ancha.paginas, [0, 1]);
  assert.equal(ancha.siguiente, 2);
  assert.equal(ancha.anterior, null);
  assert.equal(M.vistaPaginas(17, 3, 1280).indice, 2, 'siempre empieza en página par');
  assert.deepEqual(M.vistaPaginas(17, 16, 1280).paginas, [16]);
  assert.equal(M.vistaPaginas(17, 16, 1280).siguiente, null);
  const cel = M.vistaPaginas(17, 5, 390);
  assert.deepEqual(cel.paginas, [5]);
  assert.equal(cel.anterior, 4);
  assert.equal(cel.siguiente, 6);
  assert.equal(M.vistaPaginas(17, 99, 390).indice, 16);
  assert.equal(M.vistaPaginas(1, 0, 1280).doble, false);
});

test('documentos oficiales: solo https y sin repetidos', () => {
  const ids = new Set();
  for (const o of M.OFICIALES) {
    assert.match(o.url, /^https:\/\//);
    assert.ok(!ids.has(o.id));
    ids.add(o.id);
  }
  assert.ok(M.OFICIALES.some(o => /LGVS/.test(o.url)) && M.OFICIALES.some(o => /dof\.gob\.mx/.test(o.url)));
  assert.match(M.oficialesHTML(), /rel="noopener noreferrer"/);
});

test('la página de PDFs carga el módulo y la hoja de estilos', () => {
  const fs = require('node:fs'), path = require('node:path');
  const h = fs.readFileSync(path.resolve(__dirname, '../pages/club-pdfs.html'), 'utf8');
  assert.ok(h.includes('club-materiales.js') && h.includes('club-materiales.css') && h.includes('ZOO_MATERIALES.montar'));
});

test('el lector: modo una página forzado, en pantalla angosta siempre una, y la foto de cada material', () => {
  assert.equal(M.vistaPaginas(17, 4, 1280, 'una').doble, false);
  assert.equal(M.vistaPaginas(17, 4, 1280, 'dos').doble, true);
  assert.equal(M.vistaPaginas(17, 4, 1280, '').doble, true);
  assert.equal(M.vistaPaginas(17, 4, 390, 'dos').doble, false, 'en celular nunca dos páginas');
  assert.equal(M.vistaPaginas(17, 5, 1280, 'una').anterior, 4);
  assert.match(M.fotoDeMaterial({ area: 'Apicultura', titulo: 'x' }), /apicultura-polinizacion/);
  assert.match(M.fotoDeMaterial({ area: 'Bienestar', titulo: 'x' }), /etologia/);
  assert.match(M.fotoDeMaterial({ area: 'Normatividad', titulo: 'Glosario' }), /fauna-silvestre-conservacion/);
  const html = M.materialCardHTML({ id: 'a', titulo: 'T', tipo: 'guia', area: 'Manejo', paginas: 2, desbloqueado: true }, {});
  assert.match(html, /mt-doc__foto/);
  assert.match(html, /Material de apoyo/);
  const pag = M.paginaHTML({ titulo: 'T', parrafos: ['x'] }, 4, 17, 'Mi libro');
  assert.match(pag, /MI LIBRO/);
  assert.ok(pag.includes('<span>5</span>'));
});

test('las fotos que usan las portadas existen en el sitio', () => {
  const fs = require('node:fs'), path = require('node:path');
  const lista = [];
  const src = fs.readFileSync(path.resolve(__dirname, '../assets/js/club-materiales.js'), 'utf8');
  for (const m of src.matchAll(/'\.\.\/(assets\/img\/areas\/[a-z0-9.-]+)'/g)) lista.push(m[1]);
  assert.ok(lista.length >= 5);
  for (const rel of lista) assert.ok(fs.existsSync(path.resolve(__dirname, '..', rel)), rel + ' no existe');
});
